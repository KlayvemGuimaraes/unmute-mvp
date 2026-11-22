'use client';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
  AgentContext,
  IntakeProfile,
  CaseDraft,
  InterviewFlow,
} from '../types/conversation';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { PatientIntakeForm } from './PatientIntakeForm';
import { CaseDraftReview } from './CaseDraftReview';
import { getInitialInterviewFlow } from '@/lib/interview-flow';
import { createDefaultIntakeProfile } from '@/lib/patient-profile';

// Dynamically import the ConversationComponent with ssr disabled
const ConversationComponent = dynamic(() => import('./ConversationComponent'), {
  ssr: false,
});

// Dynamically import AgoraRTCProvider (browser-only).
// The AgoraVoiceAI toolkit is initialized inside ConversationComponent after
// the RTC join succeeds, so this wrapper only needs to provide the RTC client.
const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        // useRef persists across StrictMode's simulated unmount/remount, so only
        // one RTC client is ever created per session (useMemo creates two in StrictMode).
        const clientRef = useRef<ReturnType<
          typeof AgoraRTC.createClient
        > | null>(null);
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

export default function LandingPage() {
  const [showConversation, setShowConversation] = useState(false);
  const [initialFlow, setInitialFlow] = useState<InterviewFlow | null>(null);
  const [intakeProfile, setIntakeProfile] = useState<IntakeProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [agentContext, setAgentContext] = useState<AgentContext | null>(null);
  const [caseDraft, setCaseDraft] = useState<CaseDraft | null>(null);

  useEffect(() => {
    const pageUrl = new URL(window.location.href);
    const requestedFlow = pageUrl.searchParams.get('flow');
    const intakeToken = pageUrl.searchParams.get('intake_token');
    setInitialFlow(getInitialInterviewFlow(requestedFlow));

    if (!intakeToken) {
      setIntakeProfile(createDefaultIntakeProfile());
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const lookupTimer = window.setTimeout(() => {
      if (cancelled) return;
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('intake_token');
      window.history.replaceState(
        window.history.state,
        '',
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      );

      setIsProfileLoading(true);
      setProfileLoadError(null);
      void fetch('/api/intake-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: intakeToken }),
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            profile?: IntakeProfile;
            error?: string;
          };
          if (!response.ok || !payload.profile) {
            throw new Error(payload.error || 'Não foi possível carregar os dados do convite.');
          }
          setIntakeProfile(payload.profile);
        })
        .catch((loadError) => {
          if (controller.signal.aborted) return;
          setProfileLoadError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível carregar os dados do convite.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsProfileLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(lookupTimer);
      controller.abort();
    };
  }, []);

  // Preload heavy modules on mount so they're already cached when the user
  // clicks "Try it Now" — eliminates the ~1.8s dynamic-import delay.
  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);

  const handleStartConversation = async (context: AgentContext) => {
    setIsLoading(true);
    setError(null);
    setCaseDraft(null);

    try {
      // 1. Fetch RTC token + channel
      // console.log('Fetching Agora token...');
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();
      // console.log('Agora token response: uid =', responseData.uid, 'channel =', responseData.channel);

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      // The interview can only open after the server confirms that the voice
      // agent exists. Avatar configuration failures are reported separately
      // by the invite route and intentionally fall back to audio-only.
      let pendingRtmClient: RTMClient | null = null;
      const agentPromise = fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
            context: {
              flow: context.flow,
              avatar: context.avatar,
              ...(context.flow === 'follow-up' && context.profile.patientMedications.trim()
                ? { followUpMedication: context.profile.patientMedications.trim() }
                : {}),
            },
          } as ClientStartRequest),
        })
          .then(async (res) => {
            const payload = (await res.json()) as AgentResponse & {
              error?: string;
            };
            if (!res.ok) {
              throw new Error(payload.error || 'Não foi possível iniciar o agente de voz.');
            }
            return payload;
          });

      const rtmPromise = (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          pendingRtmClient = rtm;
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          // console.log('RTM ready, channel:', responseData.channel);
          return rtm;
        })();

      const [agentResult, rtmResult] = await Promise.allSettled([
        agentPromise,
        rtmPromise,
      ]);

      if (agentResult.status === 'rejected' || rtmResult.status === 'rejected') {
        if (agentResult.status === 'fulfilled') {
          await fetch('/api/stop-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: agentResult.value.agent_id }),
          }).catch((stopError) => {
            console.error('Could not stop partially started agent:', stopError);
          });
        }
        const rtmToClose =
          rtmResult.status === 'fulfilled' ? rtmResult.value : pendingRtmClient;
        await rtmToClose?.logout().catch((logoutError) => {
          console.error('Could not close partially started RTM client:', logoutError);
        });
        const failure =
          agentResult.status === 'rejected'
            ? agentResult.reason
            : rtmResult.status === 'rejected'
              ? rtmResult.reason
              : new Error('Não foi possível preparar a sessão.');
        throw failure instanceof Error
          ? failure
          : new Error('Não foi possível preparar a sessão.');
      }

      const agentData = agentResult.value;
      const rtm = rtmResult.value;

      // 3. All dependencies ready — store state and show conversation
      setRtmClient(rtm);
      setAgoraData({
        ...responseData,
        agentId: agentData.agent_id,
        avatarUid: agentData.avatar_uid,
        avatarEnabled: agentData.avatar_enabled,
        avatarStatus: agentData.avatar_status,
        avatarMessage: agentData.avatar_message,
        sessionState: agentData.state,
      });
      setAgentContext(context);
      setShowConversation(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Confira a conexão e tente novamente.`
          : 'Não foi possível iniciar a conversa. Confira a conexão e tente novamente.',
      );
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel;
        if (!channel) {
          throw new Error('Missing channel for token renewal');
        }

        // RTC and RTM tokens are renewed independently:
        //   - RTC uses the browser client's assigned UID (passed in from ConversationComponent).
        //   - RTM uses the same UID that was used during RTM login (agoraData.uid).
        // Both are fetched in parallel to stay within the token-expiry grace-period window.
        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  const handleEndConversation = async (draft: CaseDraft) => {
    // Stop the AI agent
    if (agoraData?.agentId) {
      try {
        // console.log('Stopping agent:', agoraData.agentId);
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        if (!response.ok) {
          console.error('Failed to stop agent:', await response.text());
        }
        // else console.log('Agent stopped successfully');
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    // Tear down RTM — owned here since we created it here
    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err));
    setRtmClient(null);
    setCaseDraft(draft);
    setShowConversation(false);
  };

  const handleNewInterview = () => {
    setCaseDraft(null);
    setAgentContext(null);
  };

  return (
    <div
      className={[
        'ouvira-theme relative flex min-h-dvh w-full flex-col bg-background text-foreground',
        'ouvira-page',
      ].join(' ')}
    >
      {/* Hero shell: either shows the pre-call CTA or swaps in the live conversation experience. */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          showConversation
            ? 'items-stretch justify-start'
            : 'items-stretch justify-start'
        }`}
      >
        <div
          className={`z-10 flex min-h-0 flex-1 flex-col ${
            showConversation
              ? 'h-full w-full max-w-none items-stretch gap-0 px-0 text-left'
              : 'w-full max-w-none items-stretch justify-start px-0 text-left'
          }`}
        >
          {!showConversation ? (
            caseDraft ? (
              <CaseDraftReview
                draft={caseDraft}
                onNewInterview={handleNewInterview}
              />
            ) : (
              <PatientIntakeForm
                initialFlow={initialFlow}
                initialProfile={intakeProfile}
                isProfileLoading={isProfileLoading}
                profileLoadError={profileLoadError}
                isLoading={isLoading}
                error={error}
                onStartConversation={handleStartConversation}
              />
            )
          ) : agoraData && rtmClient ? (
            <>
              {/* Browser-only conversation mount: RTC provider, error boundary, and lazy-loaded call UI. */}
              <Suspense fallback={<LoadingSkeleton />}>
                <ErrorBoundary>
                  <AgoraProvider>
                    <ConversationComponent
                      agoraData={agoraData}
                      rtmClient={rtmClient}
                      context={agentContext!}
                      onTokenWillExpire={handleTokenWillExpire}
                      onEndConversation={handleEndConversation}
                    />
                  </AgoraProvider>
                </ErrorBoundary>
              </Suspense>
            </>
          ) : (
            /* Fallback if session bootstrap partially succeeded but required state is missing. */
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados da conversa.
            </p>
          )}
        </div>
      </div>

      {showConversation && (
        <footer className="mt-auto flex justify-end px-4 py-3 sm:px-6">
          <div className="flex items-center justify-end gap-2 text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wide">
              Powered by
            </span>
            <a
              href="https://agora.io/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-primary"
              aria-label="Visit Agora's website"
            >
              <Image
                src="/agora-logo-rgb-blue.svg"
                alt="Agora"
                width={86}
                height={24}
                priority
                className="h-6 w-auto translate-y-1 transition-opacity hover:opacity-80"
              />
              <span className="sr-only">Agora</span>
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
