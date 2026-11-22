'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useConnectionState,
  useRTCClient,
  useRemoteUsers,
  useRemoteVideoTracks,
} from 'agora-rtc-react';

type VideoStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unavailable';

type AgoraAvatarVideoProps = {
  avatarUid: string | null | undefined;
  avatarName: string;
  avatarEnabled: boolean;
  avatarMessage?: string;
  sessionState: string;
};

const VIDEO_CONNECT_TIMEOUT_MS = 20_000;

export function AgoraAvatarVideo({
  avatarUid,
  avatarName,
  avatarEnabled,
  avatarMessage,
  sessionState,
}: AgoraAvatarVideoProps) {
  const client = useRTCClient();
  const connectionState = useConnectionState(client);
  const remoteUsers = useRemoteUsers(client);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('connecting');

  const avatarUser = useMemo(
    () => remoteUsers.find((user) => String(user.uid) === avatarUid),
    [avatarUid, remoteUsers],
  );
  const avatarUsers = useMemo(
    () => (avatarUser?.hasVideo ? [avatarUser] : []),
    [avatarUser],
  );
  const {
    videoTracks,
    isLoading: isSubscribing,
    error: videoError,
  } = useRemoteVideoTracks(avatarUsers, client);
  const videoTrack = videoTracks[0];

  useEffect(() => {
    const activeSession = sessionState === 'RUNNING';
    if (!avatarEnabled || !avatarUid || !activeSession) {
      setVideoStatus('unavailable');
      return;
    }

    if (connectionState === 'RECONNECTING') {
      setVideoStatus('reconnecting');
      return;
    }

    if (connectionState !== 'CONNECTED') {
      setVideoStatus('connecting');
      return;
    }

    if (videoError) {
      setVideoStatus('unavailable');
      return;
    }

    setVideoStatus('connecting');
    const timeout = window.setTimeout(
      () => setVideoStatus('unavailable'),
      VIDEO_CONNECT_TIMEOUT_MS,
    );

    if (!videoTrack || !containerRef.current) {
      return () => window.clearTimeout(timeout);
    }

    const onFirstFrame = () => setVideoStatus('connected');
    videoTrack.on('first-frame-decoded', onFirstFrame);

    try {
      videoTrack.play(containerRef.current);
    } catch {
      setVideoStatus('unavailable');
    }

    return () => {
      window.clearTimeout(timeout);
      videoTrack.off('first-frame-decoded', onFirstFrame);
      videoTrack.stop();
    };
  }, [
    avatarEnabled,
    avatarUid,
    connectionState,
    sessionState,
    videoError,
    videoTrack,
  ]);

  const statusText = (() => {
    if (!avatarEnabled || !avatarUid || sessionState !== 'RUNNING') {
      return (
        avatarMessage ||
        'Vídeo do avatar indisponível. A conversa por voz continua ativa.'
      );
    }
    if (videoStatus === 'connected') return `Vídeo de ${avatarName} conectado`;
    if (videoStatus === 'reconnecting') return 'Reconectando vídeo do avatar…';
    if (videoStatus === 'unavailable') {
      return (
        avatarMessage ||
        'Vídeo do avatar indisponível. A conversa por voz continua ativa.'
      );
    }
    return isSubscribing || avatarUser?.hasVideo
      ? `Conectando vídeo de ${avatarName}…`
      : `Aguardando vídeo de ${avatarName}…`;
  })();

  return (
    <section
      className="relative isolate flex min-h-[22rem] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#E8F3FB,#F7FBFE_58%,#E7F5F3)] sm:min-h-[28rem]"
      aria-label={`Área de vídeo de ${avatarName}`}
    >
      <div
        ref={containerRef}
        className={`absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover ${
          videoStatus === 'connected' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {videoStatus !== 'connected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-white text-primary shadow-sm">
            <span className="text-2xl font-semibold" aria-hidden="true">
              {avatarName.slice(0, 1)}
            </span>
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            {avatarName}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {statusText}
          </p>
        </div>
      )}

      <p
        className="absolute bottom-4 left-4 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
        role="status"
        aria-live="polite"
      >
        {statusText}
      </p>
    </section>
  );
}
