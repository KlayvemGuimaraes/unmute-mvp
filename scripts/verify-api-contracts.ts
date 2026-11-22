import { createHmac } from 'node:crypto';
import { AgoraClient, Agent, OpenAI } from 'agora-agents';
import { RtcTokenBuilder } from 'agora-token';
import { NextRequest } from 'next/server';
import { resolveAgoraAvatar } from '../lib/avatar-config';
import {
  getInitialInterviewFlow,
  getIntakeValidationError,
} from '../lib/interview-flow';
import {
  buildInterviewGreeting,
  buildInterviewPrompt,
} from '../lib/interview-prompt';
import {
  calculateNaranjoScore,
  createNaranjoLlmTool,
  extractNaranjoResult,
  NARANJO_QUESTION_KEYS,
  type NaranjoAnswers,
} from '../lib/naranjo';
import { createDefaultIntakeProfile } from '../lib/patient-profile';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

process.env.NEXT_PUBLIC_AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
process.env.NEXT_AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';

const AVATAR_ENV_KEYS = [
  'NEXT_AGORA_AVATAR_PROVIDER',
  'NEXT_AGORA_AVATAR_API_KEY',
  'NEXT_AGORA_AVATAR_BASE_URL',
  'NEXT_AGORA_CLARA_AVATAR_ID',
  'NEXT_AGORA_MIGUEL_AVATAR_ID',
  'NEXT_AGORA_CLARA_UID',
  'NEXT_AGORA_MIGUEL_UID',
] as const;

function replaceAvatarEnvironment(values: Partial<Record<(typeof AVATAR_ENV_KEYS)[number], string>>) {
  const original = Object.fromEntries(
    AVATAR_ENV_KEYS.map((name) => [name, process.env[name]]),
  ) as Record<(typeof AVATAR_ENV_KEYS)[number], string | undefined>;
  for (const name of AVATAR_ENV_KEYS) {
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  return () => {
    for (const name of AVATAR_ENV_KEYS) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

async function verifyGenerateAgoraTokenRoute() {
  const { GET: generateAgoraToken } =
    await import('../app/api/generate-agora-token/route');
  const originalBuildTokenWithRtm = RtcTokenBuilder.buildTokenWithRtm;
  let tokenBuilderArgs: unknown[] | null = null;

  RtcTokenBuilder.buildTokenWithRtm = ((...args: unknown[]) => {
    tokenBuilderArgs = args;
    return 'mock-rtc-rtm-token';
  }) as typeof RtcTokenBuilder.buildTokenWithRtm;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/generate-agora-token?uid=4321&channel=test-channel',
    );
    const response = await generateAgoraToken(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'GET /api/generate-agora-token should return 200',
    );
    assert(
      body.token === 'mock-rtc-rtm-token',
      'GET /api/generate-agora-token should return the built token',
    );
    assert(
      body.uid === '4321',
      'GET /api/generate-agora-token should preserve the requested uid',
    );
    assert(
      body.channel === 'test-channel',
      'GET /api/generate-agora-token should preserve the requested channel',
    );

    assert(
      Array.isArray(tokenBuilderArgs),
      'GET /api/generate-agora-token should call buildTokenWithRtm',
    );
    assert(
      tokenBuilderArgs?.[2] === 'test-channel',
      'buildTokenWithRtm should use the requested channel',
    );
    assert(
      tokenBuilderArgs?.[3] === '4321',
      'buildTokenWithRtm should receive the requested uid as account string',
    );
  } finally {
    RtcTokenBuilder.buildTokenWithRtm = originalBuildTokenWithRtm;
  }
}

async function verifyGenerateAgoraTokenReplacesZeroUid() {
  const { GET: generateAgoraToken } =
    await import('../app/api/generate-agora-token/route');
  const originalBuildTokenWithRtm = RtcTokenBuilder.buildTokenWithRtm;
  let tokenBuilderArgs: unknown[] | null = null;

  RtcTokenBuilder.buildTokenWithRtm = ((...args: unknown[]) => {
    tokenBuilderArgs = args;
    return 'mock-rtc-rtm-token';
  }) as typeof RtcTokenBuilder.buildTokenWithRtm;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/generate-agora-token?uid=0&channel=test-channel',
    );
    const response = await generateAgoraToken(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'GET /api/generate-agora-token?uid=0 should return 200',
    );
    assert(
      typeof body.uid === 'string' && body.uid !== '0',
      'GET /api/generate-agora-token?uid=0 should generate an RTM-safe uid',
    );
    assert(
      Array.isArray(tokenBuilderArgs) && tokenBuilderArgs[3] === body.uid,
      'buildTokenWithRtm should mint the token for the generated uid',
    );
  } finally {
    RtcTokenBuilder.buildTokenWithRtm = originalBuildTokenWithRtm;
  }
}

async function verifyChatCompletionsMissingEnv() {
  const { createChatCompletionsHandler } =
    await import('../lib/chat-completions');
  const originalApiKey = process.env.NEXT_LLM_API_KEY;
  const originalUrl = process.env.NEXT_LLM_URL;

  delete process.env.NEXT_LLM_API_KEY;
  delete process.env.NEXT_LLM_URL;

  const handler = createChatCompletionsHandler({
    createOpenAIClient: (() => {
      throw new Error('createOpenAI should not be called when env is missing');
    }) as never,
    streamTextImpl: (() => {
      throw new Error('streamText should not be called when env is missing');
    }) as never,
  });

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/chat/completions',
      {
        body: JSON.stringify({ messages: [] }),
        method: 'POST',
      },
    );
    const response = await handler(request);
    const body = await getJson(response);

    assert(
      response.status === 500,
      'POST /api/chat/completions should reject missing LLM env',
    );
    assert(
      body.error === 'NEXT_LLM_API_KEY and NEXT_LLM_URL must be set',
      'POST /api/chat/completions should explain missing LLM env',
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.NEXT_LLM_API_KEY;
    } else {
      process.env.NEXT_LLM_API_KEY = originalApiKey;
    }
    if (originalUrl === undefined) {
      delete process.env.NEXT_LLM_URL;
    } else {
      process.env.NEXT_LLM_URL = originalUrl;
    }
  }
}

async function verifyChatCompletionsInvalidJson() {
  const { createChatCompletionsHandler } =
    await import('../lib/chat-completions');
  const originalApiKey = process.env.NEXT_LLM_API_KEY;
  const originalUrl = process.env.NEXT_LLM_URL;
  process.env.NEXT_LLM_API_KEY = 'test-key';
  process.env.NEXT_LLM_URL = 'https://example.test/v1/chat/completions';

  const handler = createChatCompletionsHandler({
    createOpenAIClient: (() => {
      throw new Error('createOpenAI should not be called for invalid JSON');
    }) as never,
    streamTextImpl: (() => {
      throw new Error('streamText should not be called for invalid JSON');
    }) as never,
  });

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/chat/completions',
      {
        body: '{not json',
        method: 'POST',
      },
    );
    const response = await handler(request);
    const body = await getJson(response);

    assert(
      response.status === 400,
      'POST /api/chat/completions should reject invalid JSON',
    );
    assert(
      body.error === 'Invalid JSON body',
      'POST /api/chat/completions should explain invalid JSON',
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.NEXT_LLM_API_KEY;
    } else {
      process.env.NEXT_LLM_API_KEY = originalApiKey;
    }
    if (originalUrl === undefined) {
      delete process.env.NEXT_LLM_URL;
    } else {
      process.env.NEXT_LLM_URL = originalUrl;
    }
  }
}

async function verifyChatCompletionsSseDone() {
  const { createChatCompletionsHandler } =
    await import('../lib/chat-completions');
  const originalApiKey = process.env.NEXT_LLM_API_KEY;
  const originalUrl = process.env.NEXT_LLM_URL;
  process.env.NEXT_LLM_API_KEY = 'test-key';
  process.env.NEXT_LLM_URL = 'https://example.test/v1/chat/completions';

  let capturedBaseUrl: string | undefined;
  let capturedModelId: string | undefined;
  let capturedMessages: unknown;

  const handler = createChatCompletionsHandler({
    createOpenAIClient: ((options: { baseURL?: string }) => {
      capturedBaseUrl = options.baseURL;
      return (modelId: string) => {
        capturedModelId = modelId;
        return { modelId };
      };
    }) as never,
    streamTextImpl: ((options: { messages?: unknown }) => {
      capturedMessages = options.messages;
      return {
        textStream: (async function* () {
          yield 'hello';
          yield ' world';
        })(),
      };
    }) as never,
  });

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/chat/completions',
      {
        body: JSON.stringify({
          model: 'caller-model-ignored-for-routing',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        method: 'POST',
      },
    );
    const response = await handler(request);
    const text = await response.text();

    assert(
      response.status === 200,
      'POST /api/chat/completions should return 200 for a valid request',
    );
    assert(
      response.headers.get('content-type') === 'text/event-stream',
      'POST /api/chat/completions should return SSE content type',
    );
    assert(
      capturedBaseUrl === 'https://example.test/v1',
      'POST /api/chat/completions should pass base URL without /chat/completions',
    );
    assert(
      capturedModelId === 'gpt-4o',
      'POST /api/chat/completions should route to the pinned server model',
    );
    assert(
      JSON.stringify(capturedMessages) ===
        JSON.stringify([{ role: 'user', content: 'Hi' }]),
      'POST /api/chat/completions should pass request messages to streamText',
    );
    assert(
      text.includes('data: [DONE]'),
      'POST /api/chat/completions should terminate with [DONE]',
    );
    assert(
      text.includes('"content":"hello"') && text.includes('"content":" world"'),
      'POST /api/chat/completions should stream text chunks as OpenAI-compatible deltas',
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.NEXT_LLM_API_KEY;
    } else {
      process.env.NEXT_LLM_API_KEY = originalApiKey;
    }
    if (originalUrl === undefined) {
      delete process.env.NEXT_LLM_URL;
    } else {
      process.env.NEXT_LLM_URL = originalUrl;
    }
  }
}

async function verifyInviteAgentValidation() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const request = new NextRequest('http://localhost:3000/api/invite-agent', {
    body: JSON.stringify({ channel_name: 'missing-requester' }),
    method: 'POST',
  });
  const response = await inviteAgent(request);
  const body = await getJson(response);

  assert(
    response.status === 400,
    'POST /api/invite-agent should reject missing fields',
  );
  assert(
    body.error === 'channel_name and requester_id are required',
    'POST /api/invite-agent should explain validation failure',
  );

  const invalidContextResponse = await inviteAgent(
    new NextRequest('http://localhost:3000/api/invite-agent', {
      body: JSON.stringify({
        requester_id: '4321',
        channel_name: 'test-channel',
        context: { flow: 'unknown', avatar: 'miguel' },
      }),
      method: 'POST',
    }),
  );
  assert(
    invalidContextResponse.status === 400,
    'POST /api/invite-agent should reject an invalid interview context',
  );

  const invalidRequesterResponse = await inviteAgent(
    new NextRequest('http://localhost:3000/api/invite-agent', {
      body: JSON.stringify({
        requester_id: 'user-4321',
        channel_name: 'test-channel',
        context: { flow: 'follow-up', avatar: 'miguel' },
      }),
      method: 'POST',
    }),
  );
  assert(
    invalidRequesterResponse.status === 400,
    'POST /api/invite-agent should reject a non-numeric RTC requester UID',
  );
}

async function verifyInviteAgentSuccess() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const originalCreateSession = Agent.prototype.createSession;
  const restoreAvatarEnvironment = replaceAvatarEnvironment({});
  let capturedSessionConfig: {
    channel?: string;
    agentUid?: string;
    remoteUids?: string[];
  } | null = null;

  Agent.prototype.createSession = ((sessionConfig: unknown) => {
    capturedSessionConfig = sessionConfig as {
      channel?: string;
      agentUid?: string;
      remoteUids?: string[];
    };
    return {
      start: async () => 'mock-agent-id',
    };
  }) as unknown as typeof Agent.prototype.createSession;

  try {
    const request = new NextRequest('http://localhost:3000/api/invite-agent', {
      body: JSON.stringify({
        requester_id: '4321',
        channel_name: 'test-channel',
        context: {
          flow: 'follow-up',
          avatar: 'miguel',
        },
      }),
      method: 'POST',
    });
    const response = await inviteAgent(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'POST /api/invite-agent should return 200 on success',
    );
    assert(
      body.agent_id === 'mock-agent-id',
      'POST /api/invite-agent should return the started agent id',
    );
    assert(
      body.state === 'RUNNING',
      'POST /api/invite-agent should return RUNNING state',
    );
    assert(
      body.avatar_uid === null && body.avatar_enabled === false,
      'POST /api/invite-agent should clearly report audio-only fallback when provider is absent',
    );
    assert(
      body.avatar_status === 'unavailable' &&
        typeof body.avatar_message === 'string',
      'POST /api/invite-agent should explain that video is unavailable',
    );
    assert(
      capturedSessionConfig !== null,
      'POST /api/invite-agent should call createSession',
    );
    const sessionConfig = capturedSessionConfig as {
      channel?: string;
      agentUid?: string;
      remoteUids?: string[];
    };

    assert(
      sessionConfig.channel === 'test-channel',
      'POST /api/invite-agent should pass the requested channel to createSession',
    );
    assert(
      sessionConfig.agentUid === '123456',
      'POST /api/invite-agent should use the shared default agent UID',
    );
    assert(
      JSON.stringify(sessionConfig.remoteUids) ===
        JSON.stringify(['4321']),
      'POST /api/invite-agent should scope the session to the requesting user',
    );
  } finally {
    Agent.prototype.createSession = originalCreateSession;
    restoreAvatarEnvironment();
  }
}

async function verifyAvatarConfigurationContracts() {
  const restoreAvatarEnvironment = replaceAvatarEnvironment({});
  try {
    const absentProvider = resolveAgoraAvatar('clara', '4321');
    assert(
      !absentProvider.enabled &&
        absentProvider.code === 'provider-not-configured',
      'Avatar configuration should report an absent provider explicitly',
    );

    const configuredEnvironment = {
      NEXT_AGORA_AVATAR_PROVIDER: 'generic',
      NEXT_AGORA_AVATAR_API_KEY: 'test-avatar-key',
      NEXT_AGORA_AVATAR_BASE_URL: 'https://avatar.example.test/session',
      NEXT_AGORA_CLARA_AVATAR_ID: 'clara-avatar-id',
      NEXT_AGORA_MIGUEL_AVATAR_ID: 'miguel-avatar-id',
      NEXT_AGORA_CLARA_UID: '56001',
      NEXT_AGORA_MIGUEL_UID: '56002',
    };
    replaceAvatarEnvironment(configuredEnvironment);

    const clara = resolveAgoraAvatar('clara', '4321');
    const miguel = resolveAgoraAvatar('miguel', '4321');
    assert(
      clara.enabled &&
        clara.configuration.avatarId === 'clara-avatar-id' &&
        clara.configuration.avatarUid === '56001',
      'Clara should resolve to her own provider ID and Agora UID',
    );
    assert(
      miguel.enabled &&
        miguel.configuration.avatarId === 'miguel-avatar-id' &&
        miguel.configuration.avatarUid === '56002',
      'Miguel should resolve to his own provider ID and Agora UID',
    );

    replaceAvatarEnvironment({
      ...configuredEnvironment,
      NEXT_AGORA_CLARA_AVATAR_ID: undefined,
    });
    const missingAvatarId = resolveAgoraAvatar('clara', '4321');
    assert(
      !missingAvatarId.enabled &&
        missingAvatarId.code === 'configuration-incomplete' &&
        missingAvatarId.missing?.includes('NEXT_AGORA_CLARA_AVATAR_ID'),
      'Avatar configuration should explain a missing selected avatar ID',
    );

    replaceAvatarEnvironment({
      ...configuredEnvironment,
      NEXT_AGORA_MIGUEL_UID: '56001',
    });
    const duplicateUid = resolveAgoraAvatar('clara', '4321');
    assert(
      !duplicateUid.enabled && duplicateUid.code === 'uid-conflict',
      'Clara and Miguel cannot share an Agora UID',
    );

    replaceAvatarEnvironment(configuredEnvironment);
    const requesterCollision = resolveAgoraAvatar('clara', '56001');
    assert(
      !requesterCollision.enabled && requesterCollision.code === 'uid-conflict',
      'An avatar UID cannot equal the requesting user UID',
    );
  } finally {
    restoreAvatarEnvironment();
  }
}

async function verifyConfiguredAvatarAgentInvites() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const originalCreateSession = Agent.prototype.createSession;
  const originalWithAvatar = Agent.prototype.withAvatar;
  const restoreAvatarEnvironment = replaceAvatarEnvironment({
    NEXT_AGORA_AVATAR_PROVIDER: 'generic',
    NEXT_AGORA_AVATAR_API_KEY: 'private-test-key',
    NEXT_AGORA_AVATAR_BASE_URL: 'https://avatar.example.test/session',
    NEXT_AGORA_CLARA_AVATAR_ID: 'clara-avatar-id',
    NEXT_AGORA_MIGUEL_AVATAR_ID: 'miguel-avatar-id',
    NEXT_AGORA_CLARA_UID: '56001',
    NEXT_AGORA_MIGUEL_UID: '56002',
  });
  let capturedAvatar: { vendor?: string; params?: Record<string, unknown> } | null = null;

  Agent.prototype.withAvatar = function (vendor) {
    capturedAvatar = vendor.toConfig() as {
      vendor?: string;
      params?: Record<string, unknown>;
    };
    return originalWithAvatar.call(this, vendor as never);
  } as typeof Agent.prototype.withAvatar;
  Agent.prototype.createSession = (() => ({
    start: async () => 'mock-avatar-agent-id',
  })) as unknown as typeof Agent.prototype.createSession;

  try {
    const request = new NextRequest('http://localhost:3000/api/invite-agent', {
      body: JSON.stringify({
        requester_id: '4321',
        channel_name: 'test-avatar-channel',
        context: { flow: 'follow-up', avatar: 'clara' },
      }),
      method: 'POST',
    });
    const response = await inviteAgent(request);
    const body = await getJson(response);
    const avatarConfig = capturedAvatar as {
      vendor?: string;
      params?: Record<string, unknown>;
    } | null;

    assert(response.status === 200, 'Configured avatar invite should start');
    assert(
      body.avatar_uid === '56001' && body.avatar_enabled === true,
      'Configured Clara invite should return her distinct avatar UID',
    );
    assert(
      body.agent_id === 'mock-avatar-agent-id' && body.state === 'RUNNING',
      'Configured avatar invite should return agent ID and session state',
    );
    assert(
      avatarConfig?.vendor === 'generic' &&
        avatarConfig.params?.avatar_id === 'clara-avatar-id' &&
        avatarConfig.params?.agora_uid === '56001',
      'AgentKit should receive Clara provider config with her own UID',
    );
    assert(
      !JSON.stringify(body).includes('private-test-key'),
      'Avatar API key must never appear in the invite response',
    );

    capturedAvatar = null;
    const miguelResponse = await inviteAgent(
      new NextRequest('http://localhost:3000/api/invite-agent', {
        body: JSON.stringify({
          requester_id: '4321',
          channel_name: 'test-avatar-channel',
          context: { flow: 'follow-up', avatar: 'miguel' },
        }),
        method: 'POST',
      }),
    );
    const miguelBody = await getJson(miguelResponse);
    const miguelAvatarConfig = capturedAvatar as {
      vendor?: string;
      params?: Record<string, unknown>;
    } | null;
    assert(
      miguelResponse.status === 200 &&
        miguelBody.avatar_uid === '56002' &&
        miguelBody.avatar_enabled === true,
      'Configured Miguel invite should return his distinct avatar UID',
    );
    assert(
      miguelAvatarConfig?.params?.avatar_id === 'miguel-avatar-id' &&
        miguelAvatarConfig.params?.agora_uid === '56002',
      'AgentKit should receive Miguel provider config with his own UID',
    );
  } finally {
    Agent.prototype.createSession = originalCreateSession;
    Agent.prototype.withAvatar = originalWithAvatar;
    restoreAvatarEnvironment();
  }
}

async function verifyAvatarStartupFailureFallback() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const originalCreateSession = Agent.prototype.createSession;
  const restoreAvatarEnvironment = replaceAvatarEnvironment({
    NEXT_AGORA_AVATAR_PROVIDER: 'generic',
    NEXT_AGORA_AVATAR_API_KEY: 'private-test-key',
    NEXT_AGORA_AVATAR_BASE_URL: 'https://avatar.example.test/session',
    NEXT_AGORA_CLARA_AVATAR_ID: 'clara-avatar-id',
    NEXT_AGORA_CLARA_UID: '56001',
  });
  let startAttempts = 0;
  Agent.prototype.createSession = (() => ({
    start: async () => {
      startAttempts += 1;
      if (startAttempts === 1) throw new Error('provider startup failed');
      return 'mock-audio-only-agent-id';
    },
  })) as unknown as typeof Agent.prototype.createSession;

  try {
    const response = await inviteAgent(
      new NextRequest('http://localhost:3000/api/invite-agent', {
        body: JSON.stringify({
          requester_id: '4321',
          channel_name: 'test-fallback-channel',
          context: { flow: 'follow-up', avatar: 'clara' },
        }),
        method: 'POST',
      }),
    );
    const body = await getJson(response);
    assert(
      response.status === 200 && body.agent_id === 'mock-audio-only-agent-id',
      'Avatar startup failure should retry voice-only session',
    );
    assert(
      startAttempts === 2 &&
        body.avatar_enabled === false &&
        body.avatar_uid === null &&
        body.avatar_status === 'unavailable' &&
        typeof body.avatar_message === 'string',
      'Failed avatar stream should return an explicit audio-only fallback',
    );
  } finally {
    Agent.prototype.createSession = originalCreateSession;
    restoreAvatarEnvironment();
  }
}

async function verifyAgentInviteFailureIsExplicit() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const originalCreateSession = Agent.prototype.createSession;
  const restoreAvatarEnvironment = replaceAvatarEnvironment({});
  Agent.prototype.createSession = (() => ({
    start: async () => {
      throw new Error('private upstream provider detail');
    },
  })) as unknown as typeof Agent.prototype.createSession;

  try {
    const response = await inviteAgent(
      new NextRequest('http://localhost:3000/api/invite-agent', {
        body: JSON.stringify({
          requester_id: '4321',
          channel_name: 'test-error-channel',
          context: { flow: 'follow-up', avatar: 'miguel' },
        }),
        method: 'POST',
      }),
    );
    const body = await getJson(response);
    assert(
      response.status === 500 &&
        typeof body.error === 'string' &&
        !JSON.stringify(body).includes('private upstream provider detail'),
      'Agent invite errors should be explicit without exposing upstream details',
    );
  } finally {
    Agent.prototype.createSession = originalCreateSession;
    restoreAvatarEnvironment();
  }
}

async function verifyIntakeFlowAndConsentContracts() {
  assert(
    getInitialInterviewFlow(null) === 'follow-up' &&
      getInitialInterviewFlow('unknown') === 'follow-up',
    'The default interview flow should be follow-up',
  );
  assert(
    getInitialInterviewFlow('report-reaction') === 'report-reaction',
    'A direct report-reaction link should remain supported',
  );

  const profile = {
    reporterName: 'Maria Silva',
    reporterAge: '42',
    subjectType: 'self' as const,
    patientName: 'Maria Silva',
    patientAge: '42',
    patientCpf: '',
    patientRg: '',
    patientSex: '',
    patientHealthPlan: '',
    patientWeight: '',
    patientMedications: '',
    relationship: '',
  };
  const noConsentError = getIntakeValidationError(profile, false, true);
  assert(
    noConsentError === 'Leia e aceite o aviso de áudio antes de iniciar.',
    'The intake submit guard must block starting before audio consent',
  );
  assert(
    getIntakeValidationError(profile, true, true) === null,
    'A valid profile with confirmation and consent should pass intake validation',
  );
  assert(
    getIntakeValidationError(profile, true, false) ===
      'Confirme os dados do perfil para continuar.',
    'The intake submit guard must require explicit profile confirmation',
  );
}

function verifyPrefilledProfileAndInterviewScripts() {
  const profile = createDefaultIntakeProfile();
  assert(
    profile.patientName === 'Pedro Henrique Almeida' &&
      profile.patientAge === '42' &&
      profile.patientCpf === '570534098**' &&
      profile.patientRg === '28.***.***-X' &&
      profile.patientMedications === 'Losartana 50 mg',
    'The default profile should contain the prefilled identity and medicine',
  );

  const followUpContext = {
    flow: 'follow-up' as const,
    avatar: 'clara' as const,
    followUpMedication: profile.patientMedications,
  };
  const followUpGreeting = buildInterviewGreeting(followUpContext, 'Clara');
  const followUpPrompt = buildInterviewPrompt(followUpContext, 'Clara');
  assert(
    followUpGreeting.includes('Losartana 50 mg') &&
      followUpGreeting.includes('agente do Ouvira') &&
      followUpPrompt.includes('Você percebeu alguma reação, sintoma ou sensação diferente'),
    'Follow-up greeting and script should reference the confirmed medicine and reaction check',
  );
  assert(
    followUpPrompt.includes('Não sugira que houve uma reação') &&
      followUpPrompt.includes('não investigue sintomas nem faça perguntas de Naranjo') &&
      followUpPrompt.includes('termine apenas a pergunta necessária sobre dificuldades de administração e encerre com agradecimento') &&
      followUpPrompt.includes('No relato espontâneo, encerre sem Naranjo') &&
      followUpPrompt.includes('Você teve alguma dificuldade para usar o medicamento nos últimos dias?') &&
      followUpPrompt.includes('dose esquecida ou repetida') &&
      !followUpPrompt.includes('pergunte os dados da prescrição'),
    'Follow-up should ask neutrally about reactions, then administration difficulties',
  );

  const reportContext = {
    flow: 'report-reaction' as const,
    avatar: 'miguel' as const,
  };
  const reportPrompt = buildInterviewPrompt(reportContext, 'Miguel');
  const prescriptionQuestionsAt = reportPrompt.indexOf('Comece coletando as informações da prescrição');
  const administrationDifficultiesAt = reportPrompt.indexOf('Depois pergunte abertamente sobre dificuldades');
  const reactionInvestigationAt = reportPrompt.indexOf('Em seguida, investigue a reação');
  assert(
    reportPrompt.includes('dose, marca ou genérico') &&
      reportPrompt.includes('interrupção ou troca de apresentação/fabricante') &&
      reportPrompt.includes('quanto tempo depois do uso') &&
      reportPrompt.includes('se ainda estão presentes') &&
      reportPrompt.includes('Nunca conclua causalidade') &&
      !reportPrompt.includes('outra pessoa') &&
      prescriptionQuestionsAt >= 0 &&
      prescriptionQuestionsAt < administrationDifficultiesAt &&
      administrationDifficultiesAt < reactionInvestigationAt,
    'Spontaneous report script should collect prescription details before reactions and Naranjo',
  );
  assert(
    reportPrompt.includes('Procure um serviço de emergência agora ou ligue para o número de emergência da sua região.') &&
      reportPrompt.includes('Esta conversa não substitui uma avaliação médica.') &&
      reportPrompt.includes('calculate_naranjo_score') &&
      reportPrompt.includes('Pontuação Naranjo: [pontuação] pontos. Classificação: [faixa em português].') &&
      reportPrompt.includes('Até logo, se cuide!') &&
      reportPrompt.includes('não confirma uma reação nem causalidade'),
    'Interview scripts should include the Naranjo tool, urgent-care wording and safe closing',
  );
}

async function verifyNaranjoScoreContract() {
  const { POST: scoreNaranjo } = await import('../app/api/naranjo-score/route');
  const naranjoAuthorization = `Bearer ${createHmac(
    'sha256',
    process.env.NEXT_AGORA_APP_CERTIFICATE!,
  )
    .update('ouvira:naranjo-score-tool')
    .digest('hex')}`;
  const answers = Object.fromEntries(
    NARANJO_QUESTION_KEYS.map((key) => [key, 'yes']),
  ) as NaranjoAnswers;
  answers.alternativeCauses = 'no';
  answers.placeboRecurrence = 'no';

  const result = calculateNaranjoScore(answers);
  assert(
    result.score === 13 && result.category === 'definite',
    'The Naranjo calculator should apply all ten weighted answers',
  );
  const unknownAnswers = Object.fromEntries(
    NARANJO_QUESTION_KEYS.map((key) => [key, 'unknown']),
  ) as NaranjoAnswers;
  const possibleAnswers = { ...unknownAnswers, previousReports: 'yes' as const };
  const probableAnswers = {
    ...unknownAnswers,
    previousReports: 'yes' as const,
    eventAfterMedicine: 'yes' as const,
    improvedAfterStopping: 'yes' as const,
    recurredAfterReexposure: 'yes' as const,
  };
  assert(
    calculateNaranjoScore(unknownAnswers).category === 'unlikely' &&
      calculateNaranjoScore(possibleAnswers).score === 1 &&
      calculateNaranjoScore(possibleAnswers).category === 'possible' &&
      calculateNaranjoScore(probableAnswers).category === 'probable',
    'Naranjo score categories should respect the 0, 1, and 5 point boundaries',
  );

  const routeResponse = await scoreNaranjo(
    new NextRequest('https://ouvira.example/api/naranjo-score', {
      body: JSON.stringify(answers),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: naranjoAuthorization,
      },
    }),
  );
  const routeBody = await getJson(routeResponse);
  assert(
    routeResponse.status === 200 && routeBody.score === 13 &&
      routeBody.category === 'definite' && routeBody.requiresProfessionalReview === true,
    'POST /api/naranjo-score should return a deterministic result without storing data',
  );

  const invalidResponse = await scoreNaranjo(
    new NextRequest('https://ouvira.example/api/naranjo-score', {
      body: JSON.stringify({ ...answers, objectiveEvidence: 'maybe' }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: naranjoAuthorization,
      },
    }),
  );
  assert(
    invalidResponse.status === 400,
    'POST /api/naranjo-score should reject values outside yes/no/unknown',
  );

  const extraFieldResponse = await scoreNaranjo(
    new NextRequest('https://ouvira.example/api/naranjo-score', {
      body: JSON.stringify({ ...answers, patientCpf: '12345678900' }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: naranjoAuthorization,
      },
    }),
  );
  assert(
    extraFieldResponse.status === 400,
    'POST /api/naranjo-score should reject fields that could carry patient identifiers',
  );

  const unauthorizedResponse = await scoreNaranjo(
    new NextRequest('https://ouvira.example/api/naranjo-score', {
      body: JSON.stringify(answers),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  assert(
    unauthorizedResponse.status === 401,
    'POST /api/naranjo-score should require the server-side tool authorization token',
  );

  const tool = createNaranjoLlmTool(
    'https://ouvira.example/api/naranjo-score',
    'server-only-tool-token',
  );
  assert(
    tool.server.url === 'https://ouvira.example/api/naranjo-score' &&
      tool.function.name === 'calculate_naranjo_score' &&
      tool.server.headers.Authorization === 'Bearer server-only-tool-token' &&
      tool.function.parameters.required.length === 10,
    'The agent tool should call the local deterministic calculator with all ten answers',
  );
  const llmConfig = new OpenAI({
    model: 'gpt-4o-mini',
    tools: [tool],
  }).toConfig();
  assert(
    Array.isArray(llmConfig.tools) && llmConfig.tools.length === 1,
    'The installed Agora AgentKit OpenAI config should serialize the score tool',
  );

  const parsed = extractNaranjoResult([
    {
      speaker: 'agent',
      text: 'Pontuação Naranjo: 5 pontos. Classificação: provável.',
    },
  ]);
  assert(
    parsed?.score === 5 && parsed.category === 'probable',
    'The pharmacist draft should retain the score stated in the conversation',
  );
}

async function verifyWhatsAppIntakeProfileContract() {
  const { POST: resolveIntakeProfile } =
    await import('../app/api/intake-profile/route');
  const originalEndpoint = process.env.NEXT_WHATSAPP_PROFILE_API_URL;
  const originalApiKey = process.env.NEXT_WHATSAPP_PROFILE_API_KEY;
  const originalFetch = globalThis.fetch;

  delete process.env.NEXT_WHATSAPP_PROFILE_API_URL;
  delete process.env.NEXT_WHATSAPP_PROFILE_API_KEY;
  const missingConfig = await resolveIntakeProfile(
    new NextRequest('http://localhost:3000/api/intake-profile', {
      body: JSON.stringify({ token: 'opaque-token' }),
      method: 'POST',
    }),
  );
  assert(
    missingConfig.status === 503,
    'Profile lookup should report unavailable when server settings are missing',
  );

  process.env.NEXT_WHATSAPP_PROFILE_API_URL = 'https://profiles.example.test/resolve';
  process.env.NEXT_WHATSAPP_PROFILE_API_KEY = 'server-only-profile-key';
  const upstreamRequests: {
    headers: Headers;
    body: Record<string, unknown>;
  }[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    upstreamRequests.push({
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return Response.json({
      profile: {
        patientName: 'Maria Silva',
        patientAge: 42,
        patientCpf: '12345678909',
        patientRg: '1234567',
      },
    });
  }) as typeof globalThis.fetch;

  try {
    const response = await resolveIntakeProfile(
      new NextRequest('http://localhost:3000/api/intake-profile', {
        body: JSON.stringify({ token: 'opaque-token' }),
        method: 'POST',
      }),
    );
    const body = await getJson(response);
    const profile = body.profile as Record<string, unknown> | undefined;
    const upstreamRequest = upstreamRequests[0];
    assert(response.status === 200, 'Profile lookup should return 200 for a valid profile');
    assert(
      upstreamRequest?.headers.get('authorization') === 'Bearer server-only-profile-key',
      'Profile lookup should authenticate upstream requests with a server-side key',
    );
    assert(
      upstreamRequest?.body.token === 'opaque-token',
      'Profile lookup should exchange the opaque link token with the configured endpoint',
    );
    assert(
      profile?.patientName === 'Maria Silva' &&
        profile.patientCpf === '12345678909' &&
        profile.subjectType === 'self',
      'Profile lookup should return the mapped patient profile',
    );
    assert(
      !JSON.stringify(body).includes('server-only-profile-key') &&
        response.headers.get('cache-control')?.includes('no-store'),
      'Profile lookup must not expose its API key and must disable response caching',
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.NEXT_WHATSAPP_PROFILE_API_URL;
    else process.env.NEXT_WHATSAPP_PROFILE_API_URL = originalEndpoint;
    if (originalApiKey === undefined) delete process.env.NEXT_WHATSAPP_PROFILE_API_KEY;
    else process.env.NEXT_WHATSAPP_PROFILE_API_KEY = originalApiKey;
  }
}

async function verifyStopConversationValidation() {
  const { POST: stopConversation } =
    await import('../app/api/stop-conversation/route');
  const request = new NextRequest(
    'http://localhost:3000/api/stop-conversation',
    {
      body: JSON.stringify({}),
      method: 'POST',
    },
  );
  const response = await stopConversation(request);
  const body = await getJson(response);

  assert(
    response.status === 400,
    'POST /api/stop-conversation should reject missing agent_id',
  );
  assert(
    body.error === 'agent_id is required',
    'POST /api/stop-conversation should explain validation failure',
  );
}

async function verifyStopConversationSuccess() {
  const { POST: stopConversation } =
    await import('../app/api/stop-conversation/route');
  const originalStopAgent = AgoraClient.prototype.stopAgent;
  let stoppedAgentId: string | null = null;

  AgoraClient.prototype.stopAgent = async function (
    this: AgoraClient,
    agentId: string,
  ) {
    stoppedAgentId = agentId;
  } as typeof AgoraClient.prototype.stopAgent;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/stop-conversation',
      {
        body: JSON.stringify({ agent_id: 'mock-agent-id' }),
        method: 'POST',
      },
    );
    const response = await stopConversation(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'POST /api/stop-conversation should return 200 on success',
    );
    assert(
      body.success === true,
      'POST /api/stop-conversation should return success',
    );
    assert(
      stoppedAgentId === 'mock-agent-id',
      'POST /api/stop-conversation should call stopAgent with the requested agent id',
    );
  } finally {
    AgoraClient.prototype.stopAgent = originalStopAgent;
  }
}

async function main() {
  await verifyGenerateAgoraTokenRoute();
  await verifyGenerateAgoraTokenReplacesZeroUid();
  await verifyChatCompletionsMissingEnv();
  await verifyChatCompletionsInvalidJson();
  await verifyChatCompletionsSseDone();
  await verifyInviteAgentValidation();
  await verifyInviteAgentSuccess();
  await verifyAvatarConfigurationContracts();
  await verifyConfiguredAvatarAgentInvites();
  await verifyAvatarStartupFailureFallback();
  await verifyAgentInviteFailureIsExplicit();
  await verifyIntakeFlowAndConsentContracts();
  await verifyNaranjoScoreContract();
  verifyPrefilledProfileAndInterviewScripts();
  await verifyWhatsAppIntakeProfileContract();
  await verifyStopConversationValidation();
  await verifyStopConversationSuccess();

  console.log('API contract checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
