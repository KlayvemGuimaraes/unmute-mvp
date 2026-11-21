'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, UserRound, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { localDemoProfileProvider } from '@/lib/patient-profile';
import type {
  IntakeProfile,
  InterviewAvatar,
  InterviewFlow,
  AgentContext,
} from '@/types/conversation';

type PatientIntakeFormProps = {
  initialFlow: InterviewFlow | null;
  isLoading: boolean;
  error: string | null;
  onStartConversation: (context: AgentContext) => void;
};

const FLOW_OPTIONS: {
  value: InterviewFlow;
  title: string;
  description: string;
}[] = [
  {
    value: 'follow-up',
    title: 'Acompanhamento',
    description: 'Conte como você passou após usar o medicamento.',
  },
  {
    value: 'report-reaction',
    title: 'Relatar uma reação',
    description: 'Conte sobre uma reação inesperada que você suspeita.',
  },
];

const AVATAR_OPTIONS: {
  value: InterviewAvatar;
  name: string;
  voice: string;
  initials: string;
}[] = [
  {
    value: 'miguel',
    name: 'Miguel',
    voice: 'Voz masculina',
    initials: 'M',
  },
  {
    value: 'clara',
    name: 'Clara',
    voice: 'Voz feminina',
    initials: 'C',
  },
];

function isValidAge(value: string) {
  return /^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 120;
}

function inputClassName() {
  return 'mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
}

export function PatientIntakeForm({
  initialFlow,
  isLoading,
  error,
  onStartConversation,
}: PatientIntakeFormProps) {
  const [flow, setFlow] = useState<InterviewFlow | null>(initialFlow);
  const [avatar, setAvatar] = useState<InterviewAvatar>('miguel');
  const [profile, setProfile] = useState<IntakeProfile>(() =>
    localDemoProfileProvider.getDemoProfile(),
  );
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFlow(initialFlow);
  }, [initialFlow]);

  const updateProfile = (updates: Partial<IntakeProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...updates };
      if (next.subjectType === 'self') {
        next.patientName = next.reporterName;
        next.patientAge = next.reporterAge;
        next.relationship = '';
      }
      return next;
    });
    setFormError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!flow) {
      setFormError('Escolha um cenário para continuar.');
      return;
    }
    if (!profile.reporterName.trim() || !isValidAge(profile.reporterAge)) {
      setFormError('Informe o nome e uma idade válida para quem responde.');
      return;
    }
    if (
      profile.subjectType === 'third-party' &&
      (!profile.patientName.trim() ||
        !isValidAge(profile.patientAge) ||
        !profile.relationship.trim())
    ) {
      setFormError('Complete os dados da pessoa e o vínculo com ela.');
      return;
    }
    if (!consent) {
      setFormError('Leia e aceite o aviso antes de iniciar a conversa.');
      return;
    }

    onStartConversation({
      flow,
      avatar,
      profile: {
        ...profile,
        reporterName: profile.reporterName.trim(),
        patientName:
          profile.subjectType === 'self'
            ? profile.reporterName.trim()
            : profile.patientName.trim(),
        relationship: profile.relationship.trim(),
      },
    });
  };

  return (
    <section className="mx-auto my-8 w-full max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Entrevista demonstrativa
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Acolhimento de farmacovigilância
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Um assistente virtual vai conversar com você para organizar um
            relato de possível reação a medicamento.
          </p>
        </div>

        {!flow ? (
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold text-foreground">
              Como podemos ajudar hoje?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {FLOW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFlow(option.value)}
                  className="rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="block font-semibold text-foreground">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="mt-8 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Cenário selecionado
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {FLOW_OPTIONS.find((option) => option.value === flow)?.title}
            </p>
          </div>
        )}

        {flow && (
          <form className="mt-7 space-y-7" onSubmit={submit}>
            <fieldset>
              <legend className="text-sm font-semibold text-foreground">
                Escolha quem vai conversar com você
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {AVATAR_OPTIONS.map((option) => {
                  const selected = avatar === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAvatar(option.value)}
                      aria-pressed={selected}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border bg-background hover:border-primary/60'
                      }`}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-indigo-200 text-xl font-semibold text-slate-800">
                        {option.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-foreground">
                          {option.name}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {option.voice}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Ilustração demonstrativa
                        </span>
                      </span>
                      {selected && (
                        <UserRoundCheck
                          className="h-5 w-5 shrink-0 text-primary"
                          aria-label="Selecionado"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                A imagem é apenas um marcador visual. Não há vídeo de avatar ao
                vivo configurado neste MVP.
              </p>
            </fieldset>

            <fieldset className="rounded-2xl border border-border bg-background p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold text-foreground">
                Confirme os dados fictícios do perfil
              </legend>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">
                Use somente dados inventados para esta demonstração. Não
                informe CPF, data de nascimento completa ou dados reais de
                pacientes.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-foreground">
                  Seu nome
                  <input
                    className={inputClassName()}
                    autoComplete="off"
                    maxLength={80}
                    value={profile.reporterName}
                    onChange={(event) =>
                      updateProfile({ reporterName: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Sua idade
                  <input
                    className={inputClassName()}
                    type="number"
                    min={0}
                    max={120}
                    value={profile.reporterAge}
                    onChange={(event) =>
                      updateProfile({ reporterAge: event.target.value })
                    }
                    required
                  />
                </label>
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium text-foreground">
                  O relato é sobre:
                </legend>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <input
                      type="radio"
                      name="subjectType"
                      checked={profile.subjectType === 'self'}
                      onChange={() => updateProfile({ subjectType: 'self' })}
                    />
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    Mim
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <input
                      type="radio"
                      name="subjectType"
                      checked={profile.subjectType === 'third-party'}
                      onChange={() =>
                        updateProfile({ subjectType: 'third-party' })
                      }
                    />
                    Outra pessoa
                  </label>
                </div>
              </fieldset>

              {profile.subjectType === 'third-party' && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Nome da pessoa
                    <input
                      className={inputClassName()}
                      autoComplete="off"
                      maxLength={80}
                      value={profile.patientName}
                      onChange={(event) =>
                        updateProfile({ patientName: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Idade da pessoa
                    <input
                      className={inputClassName()}
                      type="number"
                      min={0}
                      max={120}
                      value={profile.patientAge}
                      onChange={(event) =>
                        updateProfile({ patientAge: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground sm:col-span-2">
                    Seu vínculo com a pessoa
                    <input
                      className={inputClassName()}
                      autoComplete="off"
                      maxLength={80}
                      placeholder="Ex.: familiar, cuidador"
                      value={profile.relationship}
                      onChange={(event) =>
                        updateProfile({ relationship: event.target.value })
                      }
                      required
                    />
                  </label>
                </div>
              )}
            </fieldset>

            {flow === 'follow-up' && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Medicamento fictício do acompanhamento
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {localDemoProfileProvider.getDemoMedicationReminder(flow)}.
                  Este dado existe apenas para demonstrar a conversa e não é
                  uma prescrição.
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm leading-5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  setFormError(null);
                }}
              />
              <span>
                Entendi que os dados pessoais deste formulário ficam apenas
                nesta página. O aplicativo envia o cenário, o avatar e os
                identificadores técnicos para iniciar a sessão; o áudio e a
                transcrição passam pela infraestrutura da Agora. Este MVP não
                salva dados em banco nem envia relatos ao VigiMed/VigiFlow.
                Estou usando apenas informações fictícias.
              </span>
            </label>

            {(formError || error) && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {formError || error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading || !consent}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                `Iniciar conversa com ${avatar === 'miguel' ? 'Miguel' : 'Clara'}`
              )}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
