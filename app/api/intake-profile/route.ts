import { NextRequest, NextResponse } from 'next/server';
import type { IntakeProfile } from '@/types/conversation';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function parseProfile(payload: unknown): IntakeProfile | null {
  if (!isRecord(payload)) return null;
  const source = isRecord(payload.profile) ? payload.profile : payload;
  const patientName = optionalText(source.patientName);
  const patientAge = optionalText(source.patientAge);
  if (
    !patientName ||
    patientName.length > 100 ||
    !/^\d{1,3}$/.test(patientAge) ||
    Number(patientAge) > 120
  ) {
    return null;
  }

  const patientCpf = optionalText(source.patientCpf);
  const patientRg = optionalText(source.patientRg);
  const patientMedications = optionalText(source.patientMedications);
  if (patientCpf.length > 32 || patientRg.length > 32 || patientMedications.length > 2000) {
    return null;
  }

  return {
    reporterName: patientName,
    reporterAge: patientAge,
    subjectType: 'self',
    patientName,
    patientAge,
    patientCpf,
    patientRg,
    patientSex: optionalText(source.patientSex) || 'Não informado',
    patientHealthPlan: optionalText(source.patientHealthPlan),
    patientWeight: optionalText(source.patientWeight),
    patientMedications,
    relationship: '',
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da solicitação inválido.' }, { status: 400 });
  }

  const token = isRecord(body) && typeof body.token === 'string'
    ? body.token.trim()
    : '';
  if (!token || token.length > 2048) {
    return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 400 });
  }

  const endpoint = process.env.NEXT_WHATSAPP_PROFILE_API_URL;
  const apiKey = process.env.NEXT_WHATSAPP_PROFILE_API_KEY;
  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { error: 'A consulta de perfil pelo convite ainda não está configurada.' },
      { status: 503 },
    );
  }

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return NextResponse.json({ error: 'A consulta de perfil está configurada incorretamente.' }, { status: 500 });
  }
  if (
    endpointUrl.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && endpointUrl.hostname === 'localhost')
  ) {
    return NextResponse.json({ error: 'A consulta de perfil exige uma conexão segura.' }, { status: 500 });
  }

  try {
    const upstreamResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: 'Não foi possível localizar os dados deste convite. Abra novamente o link recebido.' },
        { status: 502 },
      );
    }

    const profile = parseProfile(await upstreamResponse.json());
    if (!profile) {
      return NextResponse.json(
        { error: 'O convite não contém um perfil válido. Confira o link recebido.' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { profile },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível carregar o perfil do convite. Tente novamente pelo link recebido.' },
      { status: 502 },
    );
  }
}
