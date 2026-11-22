'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EngelAgentPortrait, EngelWordmark } from '@/components/EngelIdentity';
import { getIntakeValidationError } from '@/lib/interview-flow';
import { localDemoProfileProvider } from '@/lib/patient-profile';
import { cn } from '@/lib/utils';
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

const FLOW_LABELS: Record<InterviewFlow, string> = {
  'follow-up': 'Acompanhamento',
  'report-reaction': 'Relato espontâneo',
};

const AVATAR_OPTIONS: {
  value: InterviewAvatar;
  name: string;
  voice: string;
  description: string;
}[] = [
  {
    value: 'clara',
    name: 'Clara',
    voice: 'Voz feminina · português brasileiro',
    description: 'Uma conversa calma, atenta e acolhedora.',
  },
  {
    value: 'miguel',
    name: 'Miguel',
    voice: 'Voz masculina · português brasileiro',
    description: 'Uma conversa tranquila, clara e respeitosa.',
  },
];

const inputClassName =
  'mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10';

function StepProgress({ step }: { step: 1 | 2 }) {
  return (
    <div
      className="flex items-center gap-3"
      aria-label={'Etapa ' + step + ' de 2'}
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className={cn('h-1.5 w-10 rounded-full', step >= 1 ? 'bg-primary' : 'bg-border')} />
        <span className={cn('h-1.5 w-10 rounded-full', step >= 2 ? 'bg-primary' : 'bg-border')} />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">
        {step === 1 ? 'Escolha do agente' : 'Confirmação dos dados'}{' '}
        <span className="font-normal tabular-nums">· 0{step} / 02</span>
      </span>
    </div>
  );
}

function FieldLabel({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block text-sm font-medium text-foreground', className)}>
      {label}
      {children}
    </label>
  );
}

export function PatientIntakeForm({
  initialFlow,
  isLoading,
  error,
  onStartConversation,
}: PatientIntakeFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [flow, setFlow] = useState<InterviewFlow>(initialFlow ?? 'follow-up');
  const [avatar, setAvatar] = useState<InterviewAvatar>('clara');
  const [profile, setProfile] = useState<IntakeProfile>(() =>
    localDemoProfileProvider.getDemoProfile(),
  );
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFlow(initialFlow ?? 'follow-up');
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

  const continueToProfile = () => {
    setFormError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setFormError(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const validationError = getIntakeValidationError(profile, consent);
    if (validationError) {
      setFormError(validationError);
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
        patientSex: profile.patientSex.trim(),
        patientHealthPlan: profile.patientHealthPlan.trim(),
        patientWeight: profile.patientWeight.trim(),
        patientMedications:
          flow === 'follow-up'
            ? demoMedication + ' (fictício)'
            : 'A confirmar durante a entrevista',
        relationship: profile.relationship.trim(),
      },
    });
  };

  const selectedAvatar = AVATAR_OPTIONS.find((option) => option.value === avatar);
  const demoMedication = localDemoProfileProvider.getDemoMedicationReminder(flow);

  return (
    <main className="engel-page min-h-full w-full">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
          <EngelWordmark />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-foreground">
                Olá, {profile.reporterName.split(' ')[0]} :)
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Perfil de demonstração
              </p>
            </div>
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card text-primary shadow-sm"
              aria-label="Perfil fictício"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </header>

        <section className="engel-panel overflow-hidden rounded-[1.75rem] border border-border/80 sm:rounded-[2rem]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-9 sm:py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Entrevista de farmacovigilância
            </p>
            <StepProgress step={step} />
          </div>

          <div className="px-5 py-7 sm:px-9 sm:py-10 lg:px-14 lg:py-12">
            {step === 1 ? (
              <>
                <div className="mx-auto max-w-2xl text-center">
                  <p className="text-sm font-semibold text-primary">
                    Uma conversa no seu ritmo
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Conheça Engel
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {flow === 'report-reaction'
                      ? 'Vamos registrar informações sobre uma possível reação a medicamento para revisão de um farmacêutico.'
                      : 'Vamos conversar sobre como você passou e registrar possíveis reações ou dificuldades com medicamentos para revisão de um farmacêutico.'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Escolha quem vai conduzir a conversa.
                  </p>
                </div>

                <div className="mx-auto mt-7 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-muted-foreground">Seu atendimento:</span>
                  <span className="font-semibold">{FLOW_LABELS[flow]}</span>
                </div>

                <fieldset className="mx-auto mt-8 max-w-4xl sm:mt-10">
                  <legend className="sr-only">Escolha Miguel ou Clara</legend>
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                    {AVATAR_OPTIONS.map((option) => {
                      const selected = avatar === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAvatar(option.value)}
                          aria-pressed={selected}
                          className={cn(
                            'group relative flex min-h-40 items-center gap-4 rounded-3xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:min-h-48 sm:gap-5 sm:p-5',
                            selected
                              ? 'border-primary/70 bg-primary/5 shadow-md shadow-primary/10'
                              : 'border-border bg-background hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md',
                          )}
                        >
                          <EngelAgentPortrait
                            avatar={option.value}
                            className="h-28 w-28 shrink-0 sm:h-36 sm:w-36"
                          />
                          <span className="min-w-0 flex-1 py-2">
                            <span className="flex items-center gap-2">
                              <span className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                {option.name}
                              </span>
                              {selected && (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </span>
                            <span className="mt-2 block text-xs font-semibold leading-5 text-primary sm:text-sm">
                              {option.voice}
                            </span>
                            <span className="mt-1.5 block text-xs leading-5 text-muted-foreground sm:text-sm">
                              {option.description}
                            </span>
                            <span className="mt-3 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Ilustração demonstrativa
                            </span>
                          </span>
                          <span className="sr-only">
                            {selected ? 'Selecionado' : 'Selecionar'} {option.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                    As imagens são ilustrações da voz. Durante a conversa, o
                    vídeo real vem de um provider Agora compatível quando
                    configurado; caso contrário, a conversa continua por voz.
                  </p>
                </fieldset>

                {formError && (
                  <p className="mx-auto mt-5 max-w-3xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" aria-live="assertive">
                    {formError}
                  </p>
                )}

                <div className="mx-auto mt-7 flex max-w-4xl justify-center sm:mt-9">
                  <Button
                    type="button"
                    onClick={continueToProfile}
                    className="h-12 w-full rounded-full px-7 text-sm font-semibold shadow-md shadow-primary/15 sm:w-auto sm:min-w-64"
                  >
                    Continuar para meu perfil
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto max-w-3xl">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar à escolha do agente
                  </button>
                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        Quase pronto para começar
                      </p>
                      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Confira seu perfil
                      </h1>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                        Revise apenas os dados fictícios desta demonstração.
                      </p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                        {avatar === 'clara' ? 'C' : 'M'}
                      </span>
                    {selectedAvatar?.name} · português brasileiro
                    </div>
                  </div>

                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-foreground">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                    <p>
                      <strong>Protótipo com dados fictícios.</strong> Não informe
                      dados reais de pacientes, CPF ou data de nascimento
                      completa. O perfil fica nesta página e não é enviado ao
                      agente.
                    </p>
                  </div>

                  <form className="mt-5 space-y-5" onSubmit={submit} noValidate>
                    <fieldset className="rounded-3xl border border-border bg-background/80 p-4 sm:p-6">
                      <legend className="px-2 text-sm font-semibold text-foreground">
                        Quem está contando o relato?
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                            profile.subjectType === 'self'
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:border-primary/40',
                          )}
                        >
                          <input
                            type="radio"
                            name="subjectType"
                            className="accent-primary"
                            checked={profile.subjectType === 'self'}
                            onChange={() => updateProfile({ subjectType: 'self' })}
                          />
                          <UserRound className="h-4 w-4 text-primary" />
                          Sobre mim
                        </label>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                            profile.subjectType === 'third-party'
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:border-primary/40',
                          )}
                        >
                          <input
                            type="radio"
                            name="subjectType"
                            className="accent-primary"
                            checked={profile.subjectType === 'third-party'}
                            onChange={() =>
                              updateProfile({ subjectType: 'third-party' })
                            }
                          />
                          <UserRoundCheck className="h-4 w-4 text-primary" />
                          Sobre outra pessoa
                        </label>
                      </div>

                      {profile.subjectType === 'third-party' && (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <FieldLabel label="Seu nome">
                            <input
                              className={inputClassName}
                              autoComplete="off"
                              maxLength={80}
                              value={profile.reporterName}
                              onChange={(event) =>
                                updateProfile({ reporterName: event.target.value })
                              }
                              required
                            />
                          </FieldLabel>
                          <FieldLabel label="Sua idade">
                            <input
                              className={inputClassName}
                              type="number"
                              min={0}
                              max={120}
                              value={profile.reporterAge}
                              onChange={(event) =>
                                updateProfile({ reporterAge: event.target.value })
                              }
                              required
                            />
                          </FieldLabel>
                          <FieldLabel label="Seu vínculo com a pessoa" className="sm:col-span-2">
                            <input
                              className={inputClassName}
                              autoComplete="off"
                              maxLength={80}
                              placeholder="Ex.: familiar, cuidador"
                              value={profile.relationship}
                              onChange={(event) =>
                                updateProfile({ relationship: event.target.value })
                              }
                              required
                            />
                          </FieldLabel>
                        </div>
                      )}
                    </fieldset>

                    <fieldset className="rounded-3xl border border-border bg-background/80 p-4 sm:p-6">
                      <legend className="px-2 text-sm font-semibold text-foreground">
                        Dados da pessoa atendida
                      </legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldLabel label="Nome">
                          <input
                            className={inputClassName}
                            autoComplete="off"
                            maxLength={80}
                            value={profile.patientName}
                            onChange={(event) =>
                              updateProfile({
                                patientName: event.target.value,
                                ...(profile.subjectType === 'self'
                                  ? { reporterName: event.target.value }
                                  : {}),
                              })
                            }
                            required
                          />
                        </FieldLabel>
                        <FieldLabel label="Idade">
                          <input
                            className={inputClassName}
                            type="number"
                            min={0}
                            max={120}
                            value={profile.patientAge}
                            onChange={(event) =>
                              updateProfile({
                                patientAge: event.target.value,
                                ...(profile.subjectType === 'self'
                                  ? { reporterAge: event.target.value }
                                  : {}),
                              })
                            }
                            required
                          />
                        </FieldLabel>
                        <FieldLabel label="Sexo (opcional)">
                          <select
                            className={inputClassName}
                            value={profile.patientSex}
                            onChange={(event) =>
                              updateProfile({ patientSex: event.target.value })
                            }
                          >
                            <option>Não informado</option>
                            <option>Feminino</option>
                            <option>Masculino</option>
                            <option>Outro</option>
                            <option>Prefiro não informar</option>
                          </select>
                        </FieldLabel>
                        <div className="flex flex-col justify-end">
                          <span className="text-sm font-medium text-foreground">
                            Data de nascimento
                          </span>
                          <span className="mt-1.5 flex h-12 items-center rounded-xl border border-dashed border-border px-3.5 text-sm text-muted-foreground">
                            Não solicitada neste protótipo
                          </span>
                        </div>
                        <FieldLabel label="Plano de saúde (opcional)">
                          <input
                            className={inputClassName}
                            autoComplete="off"
                            maxLength={80}
                            placeholder="Não informado"
                            value={profile.patientHealthPlan}
                            onChange={(event) =>
                              updateProfile({ patientHealthPlan: event.target.value })
                            }
                          />
                        </FieldLabel>
                        <FieldLabel label="Peso em kg (opcional)">
                          <input
                            className={inputClassName}
                            type="number"
                            min={0}
                            max={500}
                            step="0.1"
                            placeholder="Não informado"
                            value={profile.patientWeight}
                            onChange={(event) =>
                              updateProfile({ patientWeight: event.target.value })
                            }
                          />
                        </FieldLabel>
                      </div>

                      <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                          Medicamentos
                        </p>
                        <p className="mt-1 text-sm leading-6 text-foreground">
                          {flow === 'follow-up'
                            ? `${demoMedication} (fictício, apenas para demonstração)`
                            : 'A confirmar durante a entrevista'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {flow === 'follow-up'
                            ? 'Este medicamento não representa um tratamento real.'
                            : 'Esta tela não envia medicamento nem perfil ao agente.'}
                        </p>
                      </div>
                    </fieldset>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-6">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                        checked={consent}
                        onChange={(event) => {
                          setConsent(event.target.checked);
                          setFormError(null);
                        }}
                      />
                      <span>
                        Li e entendi: o perfil sintético fica nesta página. Ao
                        iniciar, o app envia apenas o fluxo e o agente
                        selecionado, além de identificadores técnicos. O áudio e
                        a transcrição passam pela infraestrutura da Agora. O
                        rascunho não é salvo em banco nem enviado ao
                        VigiMed/VigiFlow.
                      </span>
                    </label>

                    {(formError || error) && (
                      <p
                        className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                        role="alert"
                        aria-live="assertive"
                      >
                        {formError || error}
                      </p>
                    )}

                    {!consent && (
                      <p className="text-sm text-muted-foreground">
                        Para iniciar, aceite o aviso de áudio acima.
                      </p>
                    )}
                    <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="h-12 rounded-full px-6"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading || !consent}
                        className="h-12 rounded-full px-7 text-sm font-semibold shadow-md shadow-primary/15"
                      >
                        {isLoading
                          ? 'Conectando…'
                          : 'Iniciar conversa com ' + (selectedAvatar?.name ?? 'agente')}
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 px-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>Uma demonstração de acolhimento e escuta farmacovigilante.</p>
          <span className="font-semibold uppercase tracking-[0.14em]">
            Tecnologia de voz Agora
          </span>
        </footer>
      </div>
    </main>
  );
}
