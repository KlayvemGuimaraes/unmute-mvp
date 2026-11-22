'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OuviraAgentPortrait, OuviraWordmark } from '@/components/OuviraIdentity';
import {
  getIntakeValidationError,
  getProfileValidationError,
} from '@/lib/interview-flow';
import { createEmptyIntakeProfile } from '@/lib/patient-profile';
import { cn } from '@/lib/utils';
import type {
  AgentContext,
  IntakeProfile,
  InterviewAvatar,
  InterviewFlow,
} from '@/types/conversation';

type PatientIntakeFormProps = {
  initialFlow: InterviewFlow | null;
  initialAvatar?: InterviewAvatar | null;
  initialProfile?: IntakeProfile | null;
  isProfileLoading: boolean;
  profileLoadError: string | null;
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
  description: string;
}[] = [
  {
    value: 'clara',
    name: 'Clara',
    description: 'Atenta, delicada e acolhedora.',
  },
  {
    value: 'miguel',
    name: 'Miguel',
    description: 'Tranquilo, claro e respeitoso.',
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

function maskedDocument(value: string, kind: 'cpf' | 'rg') {
  if (!value.trim()) return 'Não informado';
  const digits = value.replace(/\D/g, '');
  const alreadyMasked = /[*•x]/i.test(value);
  if (alreadyMasked) {
    const cpfParts = kind === 'cpf'
      ? value.match(/^(\d{3})(\d{3})(\d{3})([*•x]{2})$/i)
      : null;
    return cpfParts
      ? `${cpfParts[1]}.${cpfParts[2]}.${cpfParts[3]}-${cpfParts[4]}`
      : value;
  }
  if (digits.length < 3) {
    return kind === 'cpf' ? '•••.•••.•••-••' : '••••••••-••';
  }
  const suffix = digits.slice(-2);
  return kind === 'cpf' ? `•••.•••.•••-${suffix}` : `••••••••-${suffix}`;
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-white px-3.5 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value || 'Não informado'}
      </p>
    </div>
  );
}

export function PatientIntakeForm({
  initialFlow,
  initialAvatar,
  initialProfile,
  isProfileLoading,
  profileLoadError,
  isLoading,
  error,
  onStartConversation,
}: PatientIntakeFormProps) {
  const hasCompletePrefill = Boolean(
    initialProfile?.patientName.trim() && initialProfile.patientAge.trim(),
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [flow, setFlow] = useState<InterviewFlow>(initialFlow ?? 'follow-up');
  const [avatar, setAvatar] = useState<InterviewAvatar>(initialAvatar ?? 'clara');
  const [profile, setProfile] = useState<IntakeProfile>(
    () => initialProfile ?? createEmptyIntakeProfile(),
  );
  const [isEditingProfile, setIsEditingProfile] = useState(!hasCompletePrefill);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [manualProfileEntryStarted, setManualProfileEntryStarted] = useState(false);

  useEffect(() => {
    setFlow(initialFlow ?? 'follow-up');
  }, [initialFlow]);

  useEffect(() => {
    setAvatar(initialAvatar ?? 'clara');
  }, [initialAvatar]);

  useEffect(() => {
    if (!initialProfile) return;
    setProfile(initialProfile);
    setIsEditingProfile(false);
    setProfileConfirmed(false);
    setConsent(false);
    setFormError(null);
    setManualProfileEntryStarted(false);
  }, [initialProfile]);

  const selectedAvatar = AVATAR_OPTIONS.find((option) => option.value === avatar);
  const firstName = profile.patientName.trim().split(/\s+/)[0];

  const updateProfile = (updates: Partial<IntakeProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...updates, subjectType: 'self' as const };
      if (updates.patientName !== undefined) {
        next.reporterName = updates.patientName;
      }
      if (updates.patientAge !== undefined) {
        next.reporterAge = updates.patientAge;
      }
      return next;
    });
    setProfileConfirmed(false);
    setConsent(false);
    setFormError(null);
    setManualProfileEntryStarted(true);
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

  const confirmProfile = () => {
    const validationError = getProfileValidationError(profile);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setProfile((current) => ({
      ...current,
      reporterName: current.patientName.trim(),
      reporterAge: current.patientAge.trim(),
      subjectType: 'self',
    }));
    setIsEditingProfile(false);
    setProfileConfirmed(true);
    setFormError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const validationError = getIntakeValidationError(
      profile,
      consent,
      profileConfirmed,
    );
    if (validationError) {
      setFormError(validationError);
      return;
    }

    onStartConversation({
      flow,
      avatar,
      profile: {
        ...profile,
        reporterName: profile.patientName.trim(),
        reporterAge: profile.patientAge.trim(),
        patientName: profile.patientName.trim(),
        patientAge: profile.patientAge.trim(),
        patientMedications: profile.patientMedications.trim(),
        relationship: '',
      },
    });
  };

  return (
    <main className="ouvira-page min-h-full w-full">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-5 flex items-center gap-4 sm:mb-7">
          <OuviraWordmark />
        </header>

        <section className="ouvira-panel overflow-hidden rounded-[1.75rem] border border-border/80 sm:rounded-[2rem]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-9 sm:py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Entrevista farmacovigilante
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
                    Vamos conversar?
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Organize informações sobre como você passou e possíveis
                    reações a medicamentos para revisão farmacêutica.
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
                          <OuviraAgentPortrait
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
                            <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                          <span className="sr-only">
                            {selected ? 'Selecionado' : 'Selecionar'} {option.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-3xl">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar à escolha do agente
                </button>

                <div className="mt-5 text-center sm:text-left">
                  <p className="text-sm font-semibold text-primary">Antes de começar</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Confira seu perfil
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Confira as informações e corrija o que precisar.
                  </p>
                </div>

                <div className="mt-6 space-y-4" aria-label="Conversa de confirmação">
                  <div className="flex items-end gap-3">
                    <OuviraAgentPortrait
                      avatar={avatar}
                      className="h-11 w-11 shrink-0"
                    />
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 shadow-sm sm:max-w-[80%]">
                      <p className="text-sm font-semibold text-foreground">
                        {firstName ? `Opa, ${firstName}, tudo certo?` : 'Opa, tudo certo?'}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Sou {selectedAvatar?.name ?? 'Clara'}, agente do Ouvira, e estou aqui para ajudar. Vamos acompanhar como você passou após o uso do medicamento e organizar as informações para revisão farmacêutica. Podemos conferir se seus dados estão corretos?
                      </p>
                    </div>
                  </div>

                  <div className="ml-0 rounded-2xl rounded-br-sm border border-primary/15 bg-primary/5 p-4 shadow-sm sm:ml-14 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Seus dados</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          CPF e RG aparecem mascarados até você pedir uma correção.
                        </p>
                      </div>
                      {!isEditingProfile && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditingProfile(true);
                            setProfileConfirmed(false);
                            setConsent(false);
                          }}
                          className="h-9 rounded-full px-3 text-xs"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Corrigir informações
                        </Button>
                      )}
                    </div>

                    {profileLoadError && !manualProfileEntryStarted && (
                      <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" aria-live="assertive">
                        {profileLoadError} Você também pode preencher os campos abaixo.
                      </p>
                    )}

                    {isProfileLoading ? (
                      <p className="mt-4 rounded-xl border border-border bg-white px-4 py-5 text-sm text-muted-foreground" role="status" aria-live="polite">
                        Carregando os dados do seu convite…
                      </p>
                    ) : isEditingProfile ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <FieldLabel label="Nome completo">
                          <input
                            className={inputClassName}
                            autoComplete="name"
                            maxLength={100}
                            value={profile.patientName}
                            onChange={(event) => updateProfile({ patientName: event.target.value })}
                            required
                          />
                        </FieldLabel>
                        <FieldLabel label="Idade">
                          <input
                            className={inputClassName}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={120}
                            value={profile.patientAge}
                            onChange={(event) => updateProfile({ patientAge: event.target.value })}
                            required
                          />
                        </FieldLabel>
                        <FieldLabel label="CPF">
                          <input
                            className={inputClassName}
                            autoComplete="off"
                            inputMode="numeric"
                            maxLength={14}
                            placeholder="000.000.000-00"
                            value={profile.patientCpf}
                            onChange={(event) => updateProfile({ patientCpf: event.target.value })}
                          />
                        </FieldLabel>
                        <FieldLabel label="RG">
                          <input
                            className={inputClassName}
                            autoComplete="off"
                            maxLength={20}
                            placeholder="Informe o RG"
                            value={profile.patientRg}
                            onChange={(event) => updateProfile({ patientRg: event.target.value })}
                          />
                        </FieldLabel>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <ProfileValue label="Nome completo" value={profile.patientName} />
                        <ProfileValue
                          label="Idade"
                          value={profile.patientAge ? `${profile.patientAge} anos` : ''}
                        />
                        <ProfileValue label="CPF" value={maskedDocument(profile.patientCpf, 'cpf')} />
                        <ProfileValue label="RG" value={maskedDocument(profile.patientRg, 'rg')} />
                      </div>
                    )}

                    {profile.patientMedications.trim() && isEditingProfile ? (
                      <FieldLabel label="Medicamentos informados" className="mt-4">
                        <textarea
                          className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                          maxLength={2000}
                          value={profile.patientMedications}
                          onChange={(event) => updateProfile({ patientMedications: event.target.value })}
                        />
                      </FieldLabel>
                    ) : profile.patientMedications.trim() ? (
                      <div className="mt-3">
                        <ProfileValue label="Medicamentos informados" value={profile.patientMedications} />
                      </div>
                    ) : null}

                    {!isEditingProfile && !profileConfirmed && !isProfileLoading && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          onClick={confirmProfile}
                          className="h-11 rounded-full px-5 text-sm font-semibold"
                        >
                          Sim, meus dados estão corretos
                          <Check className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {isEditingProfile && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          onClick={confirmProfile}
                          disabled={isProfileLoading}
                          className="h-11 rounded-full px-5 text-sm font-semibold"
                        >
                          Confirmar meus dados
                          <Check className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {profileConfirmed && (
                    <div className="flex items-end justify-end gap-3">
                      <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-white shadow-sm">
                        <p className="text-sm font-semibold">Meus dados estão corretos</p>
                      </div>
                    </div>
                  )}
                </div>

                {profileConfirmed && (
                  <form className="mt-5 space-y-5" onSubmit={submit} noValidate>
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-sm leading-6 text-foreground">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <p>
                        {flow === 'follow-up' && profile.patientMedications.trim()
                          ? `O medicamento ${profile.patientMedications.trim()} confirmado no perfil, o áudio e a transcrição são processados pela Agora para viabilizar a conversa.`
                          : 'O áudio e a transcrição são processados pela Agora para viabilizar a conversa.'}{' '}
                        CPF e RG não são enviados ao agente. O rascunho fica nesta
                        sessão para revisão farmacêutica e não é enviado ao
                        VigiMed ou VigiFlow.
                      </p>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-white p-4 text-sm leading-6">
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
                        Entendi o aviso sobre o processamento do áudio e da
                        transcrição e aceito iniciar a conversa.
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
                      <p className="text-sm text-muted-foreground" role="status">
                        Aceite o aviso para iniciar a conversa.
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
                        disabled={isLoading || !consent || !profileConfirmed}
                        className="h-12 rounded-full px-7 text-sm font-semibold shadow-md shadow-primary/15"
                      >
                        {isLoading
                          ? 'Conectando…'
                          : 'Iniciar conversa com ' + (selectedAvatar?.name ?? 'agente')}
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                )}

                {formError && !profileConfirmed && (
                  <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" aria-live="assertive">
                    {formError}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 px-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>Informações organizadas para revisão farmacêutica.</p>
          <span className="font-semibold uppercase tracking-[0.14em]">
            Tecnologia de voz Agora
          </span>
        </footer>
      </div>
    </main>
  );
}
