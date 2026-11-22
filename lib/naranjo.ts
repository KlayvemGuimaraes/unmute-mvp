import type {
  NaranjoCategory,
  NaranjoQuestionKey,
  NaranjoResult,
  TranscriptTurn,
} from '@/types/conversation';

export type NaranjoAnswer = 'yes' | 'no' | 'unknown';

export const NARANJO_QUESTION_KEYS: NaranjoQuestionKey[] = [
  'previousReports',
  'eventAfterMedicine',
  'improvedAfterStopping',
  'recurredAfterReexposure',
  'alternativeCauses',
  'placeboRecurrence',
  'toxicDrugLevel',
  'doseResponse',
  'similarPastReaction',
  'objectiveEvidence',
];

const ANSWER_POINTS: Record<
  NaranjoQuestionKey,
  Record<NaranjoAnswer, number>
> = {
  previousReports: { yes: 1, no: 0, unknown: 0 },
  eventAfterMedicine: { yes: 2, no: -1, unknown: 0 },
  improvedAfterStopping: { yes: 1, no: 0, unknown: 0 },
  recurredAfterReexposure: { yes: 2, no: -1, unknown: 0 },
  alternativeCauses: { yes: -1, no: 2, unknown: 0 },
  placeboRecurrence: { yes: -1, no: 1, unknown: 0 },
  toxicDrugLevel: { yes: 1, no: 0, unknown: 0 },
  doseResponse: { yes: 1, no: 0, unknown: 0 },
  similarPastReaction: { yes: 1, no: 0, unknown: 0 },
  objectiveEvidence: { yes: 1, no: 0, unknown: 0 },
};

export type NaranjoAnswers = Record<NaranjoQuestionKey, NaranjoAnswer>;

export function isNaranjoAnswer(value: unknown): value is NaranjoAnswer {
  return value === 'yes' || value === 'no' || value === 'unknown';
}

export function calculateNaranjoScore(answers: NaranjoAnswers) {
  const score = NARANJO_QUESTION_KEYS.reduce(
    (total, key) => total + ANSWER_POINTS[key][answers[key]],
    0,
  );
  const category: NaranjoCategory =
    score >= 9
      ? 'definite'
      : score >= 5
        ? 'probable'
        : score >= 1
          ? 'possible'
          : 'unlikely';

  return {
    score,
    category,
    categoryPt:
      category === 'definite'
        ? 'definida'
        : category === 'probable'
          ? 'provável'
          : category === 'possible'
            ? 'possível'
            : 'improvável',
    requiresProfessionalReview: score >= 1,
  } as const;
}

export function extractNaranjoResult(
  transcript: TranscriptTurn[],
): NaranjoResult | undefined {
  const agentText = transcript
    .filter((turn) => turn.speaker === 'agent')
    .map((turn) => turn.text)
    .join(' ');
  const match = agentText.match(
    /pontuação\s+naranjo\s*[:\-]\s*(-?\d{1,2})\s*pontos?\s*[.;,\s]+classificação\s*[:\-]\s*(definida|provável|possível|improvável)/i,
  );
  if (!match) return undefined;

  const category: NaranjoCategory =
    match[2].toLowerCase() === 'definida'
      ? 'definite'
      : match[2].toLowerCase() === 'provável'
        ? 'probable'
        : match[2].toLowerCase() === 'possível'
          ? 'possible'
          : 'unlikely';
  return { score: Number(match[1]), category };
}

export function createNaranjoLlmTool(url: string, authorizationToken: string) {
  const answerProperties = Object.fromEntries(
    NARANJO_QUESTION_KEYS.map((key) => [
      key,
      { type: 'string', enum: ['yes', 'no', 'unknown'] },
    ]),
  );
  const answersBody = Object.fromEntries(
    NARANJO_QUESTION_KEYS.map((key) => [key, `{{args.${key}}}`]),
  );

  return {
    type: 'function' as const,
    function: {
      name: 'calculate_naranjo_score',
      description:
        'Calcula mecanicamente a pontuação do algoritmo de Naranjo depois que todas as dez respostas aplicáveis foram perguntadas. Use apenas yes, no ou unknown; não infira respostas. A pontuação estima probabilidade e não confirma nem descarta causalidade.',
      parameters: {
        type: 'object' as const,
        properties: answerProperties,
        required: NARANJO_QUESTION_KEYS,
        additionalProperties: false,
      },
    },
    server: {
      method: 'POST' as const,
      url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorizationToken}`,
      },
      body: answersBody,
      timeout_ms: 5000,
    },
  };
}
