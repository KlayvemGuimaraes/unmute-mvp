import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents';
import type { AgentInviteContext, AgentResponse, ClientStartRequest } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import {
  buildInterviewGreeting,
  buildInterviewPrompt,
} from '@/lib/interview-prompt';
import { createNaranjoLlmTool } from '@/lib/naranjo';

const AVATARS = {
  miguel: {
    name: 'Miguel',
    voiceId: 'Portuguese_CalmLeader',
  },
  clara: {
    name: 'Clara',
    voiceId: 'Portuguese_SereneWoman',
  },
} as const;

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);
const MAX_AGORA_UID = 4_294_967_295;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function safeErrorDetails(error: unknown) {
  const name = error instanceof Error ? error.name : 'UnknownError';
  let message = error instanceof Error ? error.message : String(error);

  for (const keyName of [
    'NEXT_AGORA_APP_CERTIFICATE',
    'NEXT_OPENAI_API_KEY',
  ]) {
    const secret = process.env[keyName];
    if (secret) message = message.replaceAll(secret, '[redacted]');
  }

  message = message.replace(/\bsk_live_[A-Za-z0-9_-]+\b/g, '[redacted]');

  return { name, message: message.slice(0, 500) };
}

function createVoiceAgent(
  client: ConstructorParameters<typeof Agent>[0]['client'],
  instructions: string,
  greeting: string,
  voiceId: string,
  naranjoToolUrl: string,
  naranjoToolToken: string,
) {
  const openAiApiKey = process.env.NEXT_OPENAI_API_KEY?.trim();
  const llmOptions = {
    model: 'gpt-4o-mini' as const,
    greetingMessage: greeting,
    failureMessage: 'Aguarde um momento, por favor.',
    maxHistory: 15,
    tools: [createNaranjoLlmTool(naranjoToolUrl, naranjoToolToken)],
    params: {
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
    },
  };
  const llm = openAiApiKey
    ? new OpenAI({
        ...llmOptions,
        apiKey: openAiApiKey,
        url: 'https://api.openai.com/v1/chat/completions',
      })
    : new OpenAI(llmOptions);

  const baseAgent = new Agent({
    client,
    instructions,
    greeting,
    failureMessage: 'Aguarde um momento, por favor.',
    maxHistory: 50,
    // VAD controls how the agent detects the start and end of a user's turn.
    turnDetection: {
      config: {
        speech_threshold: 0.5,
        start_of_speech: {
          mode: 'vad',
          vad_config: {
            interrupt_duration_ms: 160,
            prefix_padding_ms: 300,
          },
        },
        end_of_speech: {
          mode: 'vad',
          vad_config: {
            silence_duration_ms: 480,
          },
        },
      },
    },
    advancedFeatures: { enable_rtm: true, enable_tools: true },
    parameters: {
      audio_scenario: 'chorus',
      data_channel: 'rtm',
      enable_error_message: true,
      enable_metrics: true,
    },
  })
    .withStt(
      new DeepgramSTT({
        model: 'nova-3',
        language: 'pt-BR',
      }),
    )
    .withLlm(llm)
    .withTts(
      new MiniMaxTTS({
        model: 'speech_2_6_turbo',
        voiceId,
      }),
    );

  return baseAgent;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, context } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }
    const requesterUid = Number(requester_id);
    if (
      typeof requester_id !== 'string' ||
      !/^\d+$/.test(requester_id) ||
      !Number.isSafeInteger(requesterUid) ||
      requesterUid <= 0 ||
      requesterUid > MAX_AGORA_UID ||
      requesterUid === DEFAULT_AGENT_UID
    ) {
      return NextResponse.json(
        { error: 'requester_id must be a valid user Agora UID' },
        { status: 400 },
      );
    }

    if (
      !context ||
      typeof context !== 'object' ||
      !['follow-up', 'report-reaction'].includes(context.flow) ||
      !['miguel', 'clara'].includes(context.avatar)
    ) {
      return NextResponse.json(
        { error: 'A valid flow and avatar are required' },
        { status: 400 },
      );
    }

    if (
      context.followUpMedication !== undefined &&
      (typeof context.followUpMedication !== 'string' ||
        context.followUpMedication.length > 120)
    ) {
      return NextResponse.json(
        { error: 'followUpMedication must be a medication label of at most 120 characters' },
        { status: 400 },
      );
    }

    const normalizedMedication = context.followUpMedication
      ?.normalize('NFKC')
      .replace(/[\r\n\t<>]/g, ' ')
      .replace(/[^\p{L}\p{N} .,/()+%\-µ]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    const promptContext: AgentInviteContext = {
      flow: context.flow,
      avatar: context.avatar,
      ...(context.flow === 'follow-up' && normalizedMedication
        ? { followUpMedication: normalizedMedication }
        : {}),
    };

    const voice = AVATARS[context.avatar];
    const greeting = buildInterviewGreeting(promptContext, voice.name);
    const instructions = buildInterviewPrompt(promptContext, voice.name);
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (process.env.NODE_ENV === 'production' && !configuredAppUrl) {
      throw new Error(
        'NEXT_PUBLIC_APP_URL must be configured so Agora can reach the Naranjo scoring endpoint.',
      );
    }
    const appBaseUrl = configuredAppUrl || request.nextUrl.origin;
    const naranjoToolUrl = new URL('/api/naranjo-score', appBaseUrl).toString();
    const naranjoToolToken = createHmac('sha256', appCertificate)
      .update('ouvira:naranjo-score-tool')
      .digest('hex');

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline: Agora-managed Deepgram STT → OpenAI LLM → MiniMax TTS. The
    // configured MiniMax voice remains specific to Clara or Miguel.
    const startSession = () => {
      const agent = createVoiceAgent(
        client,
        instructions,
        greeting,
        voice.voiceId,
        naranjoToolUrl,
        naranjoToolToken,
      );
      return agent
        .createSession({
          channel: channel_name,
          agentUid,
          remoteUids: [requester_id],
          idleTimeout: 180,
          expiresIn: ExpiresIn.hours(1),
          debug: false,
        })
        .start();
    };

    const agentId = await startSession();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', safeErrorDetails(error));
    return NextResponse.json(
      {
        error:
          'Não foi possível iniciar a sessão. Verifique a conexão Agora e tente novamente.',
      },
      { status: 500 },
    );
  }
}
