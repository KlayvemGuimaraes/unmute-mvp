'use client';

import { useState, type ReactNode } from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EngelWordmark } from '@/components/EngelIdentity';
import type { CaseDraft, CaseDraftDetails, NaranjoQuestionKey } from '@/types/conversation';

type CaseDraftReviewProps = {
  draft: CaseDraft;
  onNewInterview: () => void;
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

export function CaseDraftReview({ draft: initialDraft, onNewInterview }: CaseDraftReviewProps) {
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

  return (
    <main className="mx-auto my-8 flex w-full max-w-5xl flex-col gap-5 px-4 pb-20">
      <header className="medical-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <EngelWordmark compact />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Rascunho local para revisão farmacêutica
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

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-foreground">
        <strong>Perfil de demonstração.</strong> Este rascunho só existe na
        memória desta página. O aplicativo não o envia a VigiMed/VigiFlow e não
        calcula a pontuação de Naranjo. Revise cada resposta com o transcript.
      </div>

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
          Respostas registradas para revisão manual. Este rascunho não calcula
          pontuação nem avalia causalidade.
        </p>
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
          Fonte para revisão manual. Os campos acima não são preenchidos
          automaticamente a partir da transcrição.
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
