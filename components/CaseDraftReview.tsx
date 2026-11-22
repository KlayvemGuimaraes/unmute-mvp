'use client';

import { useState, type ReactNode } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Pill,
  Printer,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OuviraWordmark } from '@/components/OuviraIdentity';
import type { CaseDraft, CaseDraftDetails, NaranjoQuestionKey } from '@/types/conversation';

type CaseDraftReviewProps = {
  draft: CaseDraft;
  onNewInterview: () => void;
  previewOnly?: boolean;
};

const NARANJO_QUESTIONS: {
  key: NaranjoQuestionKey;
  prompt: string;
}[] = [
  {
    key: 'previousReports',
    prompt: 'Já havia relatos confiáveis dessa reação com este medicamento?',
  },
  {
    key: 'eventAfterMedicine',
    prompt: 'A reação começou depois que o medicamento foi usado?',
  },
  {
    key: 'improvedAfterStopping',
    prompt: 'A reação melhorou após interrupção ou redução que já aconteceu?',
  },
  {
    key: 'recurredAfterReexposure',
    prompt: 'A reação voltou após uma nova exposição que já aconteceu?',
  },
  {
    key: 'alternativeCauses',
    prompt: 'Havia outras causas possíveis, como doença ou outro medicamento?',
  },
  {
    key: 'placeboRecurrence',
    prompt: 'A reação voltou após uso de placebo em estudo ou situação anterior?',
  },
  {
    key: 'toxicDrugLevel',
    prompt: 'Há exame que indique nível tóxico do medicamento no organismo?',
  },
  {
    key: 'doseResponse',
    prompt: 'A reação mudou quando a dose mudou, sem orientação nesta conversa?',
  },
  {
    key: 'similarPastReaction',
    prompt: 'Já houve reação parecida com este ou outro medicamento semelhante?',
  },
  {
    key: 'objectiveEvidence',
    prompt: 'Há exame, laudo ou avaliação profissional que confirme a reação?',
  },
];

const EMPTY_DETAILS: CaseDraftDetails = {
  medicationName: '',
  medicationDose: '',
  medicationBrandOrGeneric: '',
  medicationSchedule: '',
  reactionDescription: '',
  reactionStartedAt: '',
  medicationStartedAt: '',
  reactionOutcome: '',
  administrationDifficulties: '',
  naranjoAnswers: {
    previousReports: '',
    eventAfterMedicine: '',
    improvedAfterStopping: '',
    recurredAfterReexposure: '',
    alternativeCauses: '',
    placeboRecurrence: '',
    toxicDrugLevel: '',
    doseResponse: '',
    similarPastReaction: '',
    objectiveEvidence: '',
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function DraftField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const isUnknown = !value.trim();
  const className = `mt-1 w-full rounded-lg border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
    isUnknown
      ? 'border-amber-500/40 bg-amber-500/5'
      : 'border-border bg-background'
  }`;

  return (
    <label className="block text-sm font-medium text-foreground">
      <span className="flex items-center justify-between gap-2">
        {label}
        {isUnknown && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Pendente
          </span>
        )}
      </span>
      {multiline ? (
        <textarea
          className={`${className} min-h-20 resize-y`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={`${className} h-10`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function DraftSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function PreviewInfoCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-primary">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.13em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-lg font-semibold leading-snug text-foreground sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function PresentationReportView({
  draft,
  onNewInterview,
}: {
  draft: CaseDraft;
  onNewInterview: () => void;
}) {
  const reporter = draft.profile.reporterName || 'Não informado';
  const reporterAge = draft.profile.reporterAge
    ? `${draft.profile.reporterAge} anos`
    : 'Idade não informada';

  return (
    <main className="mx-auto my-6 flex w-full max-w-6xl flex-col gap-5 px-4 pb-16 sm:my-8 sm:gap-6 sm:px-6">
      <header className="medical-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <OuviraWordmark compact />
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              Prévia de apresentação
            </span>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Acompanhamento farmacoterapêutico
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Relato de possível reação
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Preparado por Clara · {formatDate(draft.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Salvar PDF
          </Button>
          <Button onClick={onNewInterview}>
            <RotateCcw className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Resumo do relato">
        <PreviewInfoCard
          icon={UserRound}
          label="Pessoa"
          value={`${reporter}, ${reporterAge}`}
          detail="A própria pessoa respondeu · dados confirmados no perfil"
        />
        <PreviewInfoCard
          icon={Pill}
          label="Medicamento acompanhado"
          value={`${draft.details.medicationName} ${draft.details.medicationDose}`}
          detail="Marca, posologia e início: não informados"
        />
        <PreviewInfoCard
          icon={Activity}
          label="Evento relatado"
          value="Tontura leve"
          detail="Passou no mesmo dia · sem atendimento relatado"
        />
      </section>

      <section className="medical-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Resumo do caso</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Informações organizadas para revisão farmacêutica
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
            Sintoma cessou
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-5 sm:p-7">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Cronologia relatada
            </h3>
            <ol className="mt-5 space-y-0">
              <li className="relative flex gap-4 pb-6 before:absolute before:bottom-0 before:left-[13px] before:top-7 before:w-px before:bg-border">
                <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Uso do medicamento</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Losartana 50 mg · posologia e data de início não informadas.
                  </p>
                </div>
              </li>
              <li className="relative flex gap-4 pb-6 before:absolute before:bottom-0 before:left-[13px] before:top-7 before:w-px before:bg-border">
                <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Tontura leve percebida</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    No dia anterior à conversa, algumas horas após o uso; horário exato não informado.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">3</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Evolução</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Passou no mesmo dia. Não houve atendimento ou exame relatado.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="border-t border-border bg-primary/[0.025] p-5 sm:p-7 lg:border-l lg:border-t-0">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Dados registrados
            </h3>
            <dl className="mt-4 divide-y divide-border/80">
              <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
                <dt className="text-sm text-muted-foreground">Dose</dt>
                <dd className="text-right text-sm font-medium text-foreground">50 mg</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">Marca / genérico</dt>
                <dd className="text-right text-sm font-medium text-foreground">Não informado</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">Administração</dt>
                <dd className="max-w-[60%] text-right text-sm font-medium text-foreground">Sem dificuldade relatada</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 last:pb-0">
                <dt className="text-sm text-muted-foreground">Dados complementares</dt>
                <dd className="max-w-[60%] text-right text-sm font-medium text-foreground">
                  Sexo, peso e plano: não informados
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <details className="group rounded-2xl border border-border bg-white shadow-sm print:break-inside-avoid">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-6">
          <span>
            <span className="block text-sm font-semibold text-foreground">Respostas para revisão farmacêutica</span>
            <span className="mt-1 block text-xs text-muted-foreground">10 itens registrados · sem pontuação</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
          {NARANJO_QUESTIONS.map((question, index) => (
            <article key={question.key} className="flex gap-3 rounded-xl bg-background p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary shadow-sm">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs leading-5 text-muted-foreground">{question.prompt}</p>
                <p className="mt-1 text-sm font-medium leading-5 text-foreground">
                  {draft.details.naranjoAnswers[question.key] || 'Não informado'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </details>

      <details className="group rounded-2xl border border-border bg-white shadow-sm print:break-inside-avoid">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-6">
          <span>
            <span className="block text-sm font-semibold text-foreground">Transcrição da conversa</span>
            <span className="mt-1 block text-xs text-muted-foreground">Registro original para consulta</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="max-h-[30rem] space-y-3 overflow-y-auto border-t border-border p-4 sm:p-5">
          {draft.transcript.map((turn, index) => (
            <article
              key={`${turn.speaker}-${index}`}
              className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] ${
                turn.speaker === 'agent'
                  ? 'bg-primary/5 text-foreground'
                  : 'ml-auto bg-primary text-white'
              }`}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                {turn.speaker === 'agent' ? 'Clara' : draft.profile.patientName || 'Pessoa entrevistada'}
              </p>
              <p className="whitespace-pre-wrap">{turn.text}</p>
            </article>
          ))}
        </div>
      </details>

      <footer className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
        Rascunho para revisão farmacêutica. As informações não determinam se o medicamento causou o evento.
      </footer>
    </main>
  );
}

export function CaseDraftReview({ draft: initialDraft, onNewInterview, previewOnly = false }: CaseDraftReviewProps) {
  const [draft, setDraft] = useState<CaseDraft>({
    ...initialDraft,
    details: { ...EMPTY_DETAILS, ...initialDraft.details },
  });
  const avatarName = draft.avatar === 'miguel' ? 'Miguel' : 'Clara';
  const flowName =
    draft.flow === 'follow-up' ? 'Acompanhamento' : 'Relato espontâneo';
  const patientSubject =
    draft.profile.subjectType === 'self'
      ? 'A própria pessoa'
      : `Terceiro — vínculo: ${draft.profile.relationship || 'pendente'}`;
  const pendingFields = [
    ['Medicamento suspeito', draft.details.medicationName],
    ['Dose', draft.details.medicationDose],
    ['Marca ou genérico', draft.details.medicationBrandOrGeneric],
    ['Posologia', draft.details.medicationSchedule],
    ['Início do medicamento', draft.details.medicationStartedAt],
    ['Descrição da reação', draft.details.reactionDescription],
    ['Início da reação', draft.details.reactionStartedAt],
    ['Evolução ou desfecho', draft.details.reactionOutcome],
    ['Dificuldades de administração', draft.details.administrationDifficulties],
    ...NARANJO_QUESTIONS.map((question) => [
      question.prompt,
      draft.details.naranjoAnswers[question.key],
    ] as [string, string]),
    ...(draft.profile.subjectType === 'third-party'
      ? [['Vínculo com a pessoa', draft.profile.relationship] as [string, string]]
      : []),
  ].filter(([, value]) => !value.trim()).map(([label]) => label);

  const updateDetail = (key: keyof Omit<CaseDraftDetails, 'naranjoAnswers'>, value: string) => {
    setDraft((current) => ({
      ...current,
      details: { ...current.details, [key]: value },
    }));
  };

  const updateNaranjo = (key: NaranjoQuestionKey, value: string) => {
    setDraft((current) => ({
      ...current,
      details: {
        ...current.details,
        naranjoAnswers: { ...current.details.naranjoAnswers, [key]: value },
      },
    }));
  };

  if (previewOnly) {
    return <PresentationReportView draft={draft} onNewInterview={onNewInterview} />;
  }

  return (
    <main className="mx-auto my-8 flex w-full max-w-5xl flex-col gap-5 px-4 pb-20">
      <header className="medical-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <OuviraWordmark compact />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {previewOnly
              ? 'Prévia de apresentação · dados ilustrativos'
              : 'Rascunho local para revisão farmacêutica'}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Relato de possível reação
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {flowName} · entrevista com {avatarName} · {formatDate(draft.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir / salvar PDF
          </Button>
          <Button onClick={onNewInterview}>
            <RotateCcw className="h-4 w-4" />
            Nova entrevista
          </Button>
        </div>
      </header>

      {!previewOnly && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground">
          Este rascunho fica na memória desta página para revisão farmacêutica. O
          aplicativo não o envia a VigiMed/VigiFlow e não calcula a pontuação de
          Naranjo. Revise cada resposta com a transcrição.
        </div>
      )}

      <DraftSection title="Pessoa que relata">
        <DraftField
          label="Nome de quem respondeu"
          value={draft.profile.reporterName}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, reporterName: value },
            }))
          }
        />
        <DraftField
          label="Idade de quem respondeu"
          value={draft.profile.reporterAge}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, reporterAge: value },
            }))
          }
        />
        <p className="text-sm font-medium text-foreground">
          Quem teve a reação
          <span className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal">
            {patientSubject}
          </span>
        </p>
        {draft.profile.subjectType === 'third-party' && (
          <DraftField
            label="Vínculo com a pessoa"
            value={draft.profile.relationship}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                profile: { ...current.profile, relationship: value },
              }))
            }
          />
        )}
      </DraftSection>

      <DraftSection title="Paciente">
        <DraftField
          label="Nome da pessoa que teve a reação"
          value={draft.profile.patientName}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, patientName: value },
            }))
          }
        />
        <DraftField
          label="Idade da pessoa que teve a reação"
          value={draft.profile.patientAge}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, patientAge: value },
            }))
          }
        />
        <DraftField
          label="Sexo informado"
          value={draft.profile.patientSex}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, patientSex: value },
            }))
          }
        />
        <DraftField
          label="Plano de saúde"
          value={draft.profile.patientHealthPlan}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, patientHealthPlan: value },
            }))
          }
        />
        <DraftField
          label="Peso (kg)"
          value={draft.profile.patientWeight}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, patientWeight: value },
            }))
          }
        />
      </DraftSection>

      <DraftSection title="Medicamentos">
        <DraftField
          label="Medicamentos informados no perfil"
          value={draft.profile.patientMedications}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              profile: { ...current.profile, patientMedications: value },
            }))
          }
          multiline
        />
        <DraftField label="Nome" value={draft.details.medicationName} onChange={(value) => updateDetail('medicationName', value)} />
        <DraftField label="Dose" value={draft.details.medicationDose} onChange={(value) => updateDetail('medicationDose', value)} />
        <DraftField label="Marca ou genérico" value={draft.details.medicationBrandOrGeneric} onChange={(value) => updateDetail('medicationBrandOrGeneric', value)} />
        <DraftField label="Posologia conforme prescrição" value={draft.details.medicationSchedule} onChange={(value) => updateDetail('medicationSchedule', value)} />
        <DraftField label="Quando começou a usar" value={draft.details.medicationStartedAt} onChange={(value) => updateDetail('medicationStartedAt', value)} />
      </DraftSection>

      <DraftSection title="Reação e cronologia">
        <DraftField label="Descrição da reação" value={draft.details.reactionDescription} onChange={(value) => updateDetail('reactionDescription', value)} multiline />
        <DraftField label="Quando começou a reação" value={draft.details.reactionStartedAt} onChange={(value) => updateDetail('reactionStartedAt', value)} />
        <DraftField label="Evolução / desfecho" value={draft.details.reactionOutcome} onChange={(value) => updateDetail('reactionOutcome', value)} multiline />
      </DraftSection>

      <DraftSection title="Administração">
        <DraftField
          label="Dificuldades para administrar o medicamento"
          value={draft.details.administrationDifficulties}
          onChange={(value) => updateDetail('administrationDifficulties', value)}
          multiline
        />
      </DraftSection>

      <DraftSection title="Fatos para avaliação farmacêutica (Naranjo)">
        <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">
          As respostas registradas ficam disponíveis para revisão farmacêutica.
          A escala estima probabilidade e não confirma nem descarta causalidade.
        </p>
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground sm:col-span-2">
          {draft.details.naranjoResult ? (
            <>
              Pontuação Naranjo informada na conversa:{' '}
              <strong>{draft.details.naranjoResult.score} pontos</strong>, faixa{' '}
              <strong>
                {draft.details.naranjoResult.category === 'definite'
                  ? 'definida'
                  : draft.details.naranjoResult.category === 'probable'
                    ? 'provável'
                    : draft.details.naranjoResult.category === 'possible'
                      ? 'possível'
                      : 'improvável'}
              </strong>
              .
            </>
          ) : (
            previewOnly
              ? 'Pontuação não calculada nesta prévia.'
              : 'Pontuação não identificada na transcrição; permanece pendente para revisão farmacêutica.'
          )}
        </div>
        {NARANJO_QUESTIONS.map((question, index) => (
          <DraftField
            key={question.key}
            label={`${index + 1}. ${question.prompt}`}
            value={draft.details.naranjoAnswers[question.key]}
            onChange={(value) => updateNaranjo(question.key, value)}
            multiline
          />
        ))}
      </DraftSection>

      <details className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline-none">
          Campos pendentes ({pendingFields.length})
        </summary>
        {pendingFields.length > 0 ? (
          <ul className="mt-4 grid list-inside list-disc gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {pendingFields.map((field) => <li key={field}>{field}</li>)}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Não há campos em branco neste rascunho.
          </p>
        )}
      </details>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Transcrição original</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {previewOnly
            ? 'Transcrição preparada para demonstrar como as respostas aparecem no rascunho.'
            : 'Fonte para revisão manual. Os campos acima não são preenchidos automaticamente a partir da transcrição.'}
        </p>
        <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto rounded-xl bg-background p-4">
          {draft.transcript.length === 0 ? (
            <p className="text-sm text-amber-900">
              A transcrição não foi recebida nesta sessão. Confira a conexão e
              complete o rascunho manualmente.
            </p>
          ) : (
            draft.transcript.map((turn, index) => (
              <article key={`${turn.speaker}-${index}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {turn.speaker === 'agent' ? avatarName : 'Pessoa entrevistada'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {turn.text || '…'}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
