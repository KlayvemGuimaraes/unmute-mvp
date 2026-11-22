import type { InterviewAvatar } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

// Server-only module. Import it only from route handlers; provider credentials
// and IDs must never be passed to a client component.
if (typeof window !== 'undefined') {
  throw new Error('Avatar provider configuration is server-only.');
}

export type AgoraAvatarProvider = 'tavus' | 'liveavatar' | 'generic';

export type AgoraAvatarConfiguration = {
  provider: AgoraAvatarProvider;
  apiKey: string;
  avatarId: string;
  avatarUid: string;
  apiBaseUrl?: string;
};

export type AvatarResolution =
  | { enabled: true; configuration: AgoraAvatarConfiguration }
  | {
      enabled: false;
      code:
        | 'provider-not-configured'
        | 'invalid-provider'
        | 'configuration-incomplete'
        | 'uid-conflict'
        | 'sample-rate-not-supported';
      message: string;
      missing?: string[];
    };

const MAX_AGORA_UID = 4_294_967_295;
const TAVUS_AGORA_ENDPOINT = 'https://tavusapi.com/v2/conversations/agora';
const PROVIDER_PRIORITY: AgoraAvatarProvider[] = [
  'tavus',
  'liveavatar',
  'generic',
];

function parseUid(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const uid = Number(value);
  return Number.isSafeInteger(uid) && uid > 0 && uid <= MAX_AGORA_UID
    ? uid
    : null;
}

function avatarEnvironment(avatar: InterviewAvatar) {
  const upperName = avatar.toUpperCase();
  return {
    avatarIdName: `NEXT_AGORA_${upperName}_AVATAR_ID`,
    avatarId: process.env[`NEXT_AGORA_${upperName}_AVATAR_ID`]?.trim(),
    avatarUidName: `NEXT_AGORA_${upperName}_UID`,
    avatarUidRaw: process.env[`NEXT_AGORA_${upperName}_UID`]?.trim(),
  };
}

export function getReservedAvatarUids(): number[] {
  return (['clara', 'miguel'] as const)
    .map((avatar) => parseUid(avatarEnvironment(avatar).avatarUidRaw))
    .filter((uid): uid is number => uid !== null);
}

function getUidConfigurationError(): AvatarResolution | null {
  const claraUid = parseUid(avatarEnvironment('clara').avatarUidRaw);
  const miguelUid = parseUid(avatarEnvironment('miguel').avatarUidRaw);
  const configuredUids = [claraUid, miguelUid].filter(
    (uid): uid is number => uid !== null,
  );

  if (configuredUids.includes(DEFAULT_AGENT_UID)) {
    return {
      enabled: false,
      code: 'uid-conflict',
      message:
        'O UID configurado para vídeo não pode ser igual ao UID do agente de voz.',
    };
  }
  if (claraUid !== null && claraUid === miguelUid) {
    return {
      enabled: false,
      code: 'uid-conflict',
      message: 'Clara e Miguel precisam usar UIDs Agora diferentes.',
    };
  }
  return null;
}

function resolveProvider(
  provider: AgoraAvatarProvider,
  avatar: InterviewAvatar,
  requesterId: string,
): AvatarResolution {
  const { avatarIdName, avatarId, avatarUidName, avatarUidRaw } =
    avatarEnvironment(avatar);
  const apiKey = process.env.NEXT_AGORA_AVATAR_API_KEY?.trim();
  const apiBaseUrl = process.env.NEXT_AGORA_AVATAR_BASE_URL?.trim();
  const avatarUid = parseUid(avatarUidRaw);
  const missing: string[] = [];

  if (!apiKey) missing.push('NEXT_AGORA_AVATAR_API_KEY');
  if (!avatarId) missing.push(avatarIdName);
  if (!avatarUid) missing.push(avatarUidName);
  if (provider === 'generic' && !apiBaseUrl) {
    missing.push('NEXT_AGORA_AVATAR_BASE_URL');
  }

  if (missing.length > 0) {
    return {
      enabled: false,
      code: 'configuration-incomplete',
      message: 'A configuração do vídeo está incompleta.',
      missing,
    };
  }

  const requesterUid = parseUid(requesterId);
  if (
    avatarUid === DEFAULT_AGENT_UID ||
    avatarUid === requesterUid ||
    getReservedAvatarUids().some(
      (uid) => uid === DEFAULT_AGENT_UID || uid === requesterUid,
    )
  ) {
    return {
      enabled: false,
      code: 'uid-conflict',
      message:
        'O UID do avatar precisa ser diferente do usuário e do agente de voz.',
    };
  }

  // The installed MiniMax TTS preset does not expose a sample-rate option.
  // LiveAvatar requires 24 kHz, so keep it disabled until the voice pipeline
  // can guarantee that output rate instead of starting a misleading video call.
  if (provider === 'liveavatar') {
    return {
      enabled: false,
      code: 'sample-rate-not-supported',
      message:
        'O provider LiveAvatar exige áudio TTS em 24 kHz, indisponível na configuração de voz atual.',
    };
  }

  if (avatarUid === null || !apiKey || !avatarId) {
    return {
      enabled: false,
      code: 'configuration-incomplete',
      message: 'A configuração do vídeo está incompleta.',
      missing,
    };
  }

  if (provider === 'tavus') {
    return {
      enabled: true,
      configuration: {
        provider,
        apiKey,
        avatarId,
        avatarUid: String(avatarUid),
        apiBaseUrl: TAVUS_AGORA_ENDPOINT,
      },
    };
  }

  if (!apiBaseUrl) {
    return {
      enabled: false,
      code: 'configuration-incomplete',
      message: 'A configuração do vídeo está incompleta.',
      missing: ['NEXT_AGORA_AVATAR_BASE_URL'],
    };
  }

  return {
    enabled: true,
    configuration: {
      provider: 'generic',
      apiKey,
      apiBaseUrl,
      avatarId,
      avatarUid: String(avatarUid),
    },
  };
}

export function resolveAgoraAvatar(
  avatar: InterviewAvatar,
  requesterId: string,
): AvatarResolution {
  const uidError = getUidConfigurationError();
  if (uidError) return uidError;

  const rawProvider = process.env.NEXT_AGORA_AVATAR_PROVIDER?.trim().toLowerCase();
  if (!rawProvider) {
    return {
      enabled: false,
      code: 'provider-not-configured',
      message: 'Vídeo do avatar indisponível nesta sessão.',
    };
  }

  if (rawProvider === 'auto') {
    let lastIncomplete: AvatarResolution | null = null;
    for (const provider of PROVIDER_PRIORITY) {
      const result = resolveProvider(provider, avatar, requesterId);
      if (result.enabled) return result;
      if (result.code === 'uid-conflict') return result;
      if (result.code === 'sample-rate-not-supported') lastIncomplete = result;
      if (result.code === 'configuration-incomplete') lastIncomplete = result;
    }
    return (
      lastIncomplete ?? {
        enabled: false,
        code: 'configuration-incomplete',
        message: 'A configuração do vídeo está incompleta.',
      }
    );
  }

  if (!PROVIDER_PRIORITY.includes(rawProvider as AgoraAvatarProvider)) {
    return {
      enabled: false,
      code: 'invalid-provider',
      message: 'O provider de vídeo configurado não é compatível.',
    };
  }

  return resolveProvider(rawProvider as AgoraAvatarProvider, avatar, requesterId);
}
