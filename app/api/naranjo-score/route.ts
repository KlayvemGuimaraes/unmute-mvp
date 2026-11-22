import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  calculateNaranjoScore,
  isNaranjoAnswer,
  NARANJO_QUESTION_KEYS,
  type NaranjoAnswers,
} from '@/lib/naranjo';

export async function POST(request: NextRequest) {
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appCertificate) {
    return NextResponse.json(
      { error: 'Scoring tool is unavailable' },
      { status: 503 },
    );
  }
  const expectedToken = createHmac('sha256', appCertificate)
    .update('ouvira:naranjo-score-tool')
    .digest('hex');
  const authorization = request.headers.get('authorization') ?? '';
  const receivedToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const expectedBuffer = Buffer.from(expectedToken);
  const receivedBuffer = Buffer.from(receivedToken);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
  }

  const bodyKeys = Object.keys(body);
  if (
    bodyKeys.some(
      (key) => !NARANJO_QUESTION_KEYS.includes(key as (typeof NARANJO_QUESTION_KEYS)[number]),
    )
  ) {
    return NextResponse.json(
      { error: 'Only the ten Naranjo answers are accepted' },
      { status: 400 },
    );
  }

  const answers: Partial<NaranjoAnswers> = {};
  for (const key of NARANJO_QUESTION_KEYS) {
    const answer = (body as Record<string, unknown>)[key];
    if (!isNaranjoAnswer(answer)) {
      return NextResponse.json(
        { error: `Answer "${key}" must be yes, no or unknown` },
        { status: 400 },
      );
    }
    answers[key] = answer;
  }

  const result = calculateNaranjoScore(answers as NaranjoAnswers);
  return NextResponse.json(
    {
      ...result,
      interpretation:
        result.score >= 1
          ? 'A pontuação indica associação possível ou mais alta e deve ser revisada por um profissional. Ela não confirma diagnóstico nem causalidade.'
          : 'A pontuação ficou na faixa improvável com as informações registradas. Isso não descarta uma reação e deve ser considerado na revisão farmacêutica.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
