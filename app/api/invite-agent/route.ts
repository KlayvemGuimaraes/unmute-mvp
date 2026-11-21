import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents';
import {
  ClientStartRequest,
  AgentResponse,
  InterviewConfig,
} from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { localDemoProfileProvider } from '@/lib/patient-profile';

const AVATARS = {
  miguel: {
    name: 'Miguel',
    voiceId: 'Portuguese_CalmLeader',
  },
  clara: {
    name: 'Clara',
    voiceId: 'Portuguese_SereneWoman',
  },
} as const;

const NARANJO_FACT_QUESTIONS = `
Quando houver uma suspeita de reação, investigue os fatos abaixo com linguagem cotidiana, uma pergunta por vez. Aceite “não sei” e “não se aplica”; não pressione a pessoa. Não apresente pontuação nem conclusão de causalidade: o farmacêutico fará essa avaliação.
1. Se a pessoa sabe, já havia relatos confiáveis dessa reação com esse medicamento?
2. A reação começou depois que o medicamento foi usado?
3. A reação melhorou quando o medicamento foi interrompido ou reduzido por orientação/decisão que já aconteceu? Nunca recomende interromper, reduzir ou alterar o medicamento.
4. A reação voltou depois de a pessoa usar novamente o medicamento por conta própria ou por orientação já recebida? Nunca sugira uma nova exposição.
5. Havia outra doença, medicamento ou circunstância que também poderia explicar a reação?
6. A reação voltou após uso de placebo? Pergunte apenas se isso aconteceu em estudo ou situação anterior; nunca sugira placebo.
7. A pessoa tem resultado de exame que mostre nível tóxico do medicamento no sangue ou no organismo?
8. A reação piorou quando a dose aumentou ou melhorou quando diminuiu, sem que você recomende qualquer mudança?
9. A pessoa já teve reação parecida com esse medicamento ou com outro semelhante?
10. Existe evidência objetiva, como exame, laudo ou avaliação profissional, que confirme a reação?
Se alguma pergunta não fizer sentido ou a pessoa não souber, registre isso e siga sem induzir uma resposta.`;

function buildInterviewPrompt(context: InterviewConfig) {
  const avatar = AVATARS[context.avatar];
  const flowDescription =
    context.flow === 'follow-up'
      ? `Este é um acompanhamento iniciado pela equipe. Depois de confirmar se a reação é da própria pessoa ou de terceiro, lembre com cuidado que este perfil de demonstração registra: “${localDemoProfileProvider.getDemoMedicationReminder('follow-up')}”. Deixe claro que o medicamento e a rotina são fictícios e peça que a pessoa confirme apenas os dados do caso de demonstração. Depois pergunte se houve alguma reação ruim nos últimos dias. Em seguida, pergunte abertamente se houve dificuldade para administrar o medicamento, incluindo dose esquecida, repetida ou tomada em horário diferente. Se não houve reação, registre isso e não sugira uma.`
      : `A pessoa iniciou o contato para relatar uma reação inesperada. Depois de confirmar se a reação é da própria pessoa ou de terceiro, comece perguntando os dados da prescrição dos medicamentos suspeitos: nome, dose, marca ou genérico, como foi prescrito e quando começou. Em seguida, pergunte abertamente se houve dificuldade para administrar o medicamento, como dose esquecida, repetida ou tomada em horário diferente. Depois investigue a reação e sua cronologia.`;

  return `Você é ${avatar.name}, assistente virtual de coleta de informações para farmacovigilância. Você NÃO é profissional de saúde, não diagnostica e não recomenda começar, interromper, repetir, reduzir, aumentar ou trocar medicamentos.

Fale sempre em português brasileiro, de forma acolhedora, simples, calma e breve. Faça somente uma pergunta por vez. Apresente-se pelo nome como assistente virtual, explique que vai registrar o relato e que a pessoa pode dizer “não sei”, pedir para parar ou corrigir uma resposta.

Confirme verbalmente se a pessoa está falando de uma reação própria ou de outra pessoa, ainda que a tela já tenha uma opção marcada. Se for terceiro, pergunte quem é a pessoa afetada e qual é o vínculo de quem responde com ela. Colete apenas as informações necessárias ao relato; não peça CPF nem data de nascimento completa.

Fluxo selecionado: ${context.flow}. ${flowDescription}

Se houver suspeita de reação, depois dos passos do cenário, pergunte pela descrição dos sintomas, quando começaram, quando cada medicamento foi iniciado, evolução e desfecho, e se houve atendimento. Não invente respostas nem complete campos por inferência. Registre as respostas nas palavras da pessoa. Depois investigue os dez fatos abaixo, um por vez: ${NARANJO_FACT_QUESTIONS}

SEGURANÇA: se a pessoa mencionar possível risco imediato — por exemplo, dificuldade para respirar, desmaio, convulsão, inchaço de rosto/língua ou dor intensa no peito — interrompa o questionário rotineiro e diga para buscar atendimento de urgência agora ou ligar para o serviço de emergência local. Não tente diagnosticar, tranquilizar, nem dê instruções sobre alterar a medicação. Depois da orientação, não continue as perguntas de rotina.

Ao finalizar, diga que as informações serão organizadas para revisão de um farmacêutico; não diga que a reação foi causada pelo medicamento e não prometa envio a um órgão oficial. Mantenha-se no roteiro e não responda como se fosse Miguel/Clara, médico ou farmacêutico.`;
}

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, context } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    if (
      !context ||
      !['follow-up', 'report-reaction'].includes(context.flow) ||
      !['miguel', 'clara'].includes(context.avatar)
    ) {
      return NextResponse.json(
        { error: 'A valid flow and avatar are required' },
        { status: 400 },
      );
    }

    const avatar = AVATARS[context.avatar];
    const greeting = `Olá! Eu sou ${avatar.name}, assistente virtual de coleta para farmacovigilância. Vou fazer uma pergunta por vez e você pode dizer “não sei” ou pedir para parar. A reação que você quer relatar aconteceu com você ou com outra pessoa?`;
    const instructions = buildInterviewPrompt(context);

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline: Deepgram (reseller) STT → OpenAI (reseller) LLM → MiniMax (reseller) TTS.
    // Omit vendor API keys for supported models — AgentKit infers reseller presets on start (see Agora Console / billing).
    const agent = new Agent({
      client,
      instructions,
      greeting,
      failureMessage: 'Aguarde um momento, por favor.',
      maxHistory: 50,
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480, // ms of silence before turn ends
            },
          },
        },
      },
      // RTM is required for transcript events in the browser client.
      // enable_tools is required for MCP tool invocation.
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'pt-BR',
        }),
        // BYOK: uncomment the following block and set NEXT_DEEPGRAM_API_KEY
        // new DeepgramSTT({
        //   apiKey: requireEnv('NEXT_DEEPGRAM_API_KEY'),
        //   model: 'nova-3',
        //   language: 'pt-BR',
        // }),
      )
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: greeting,
          failureMessage: 'Aguarde um momento, por favor.',
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
        // BYOK: uncomment the following block and set NEXT_LLM_API_KEY and NEXT_LLM_URL
        // new OpenAI({
        //   apiKey: requireEnv('NEXT_LLM_API_KEY'),
        //   url: requireEnv('NEXT_LLM_URL'),
        //   model: 'gpt-4o-mini',
        //   greetingMessage: GREETING,
        //   failureMessage: 'Aguarde um momento, por favor.',
        //   maxHistory: 15,
        //   maxTokens: 1024,
        //   temperature: 0.7,
        //   topP: 0.95,
        // }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: avatar.voiceId,
        }),
        // BYOK — ElevenLabs (set NEXT_ELEVENLABS_API_KEY; optional NEXT_ELEVENLABS_VOICE_ID)
        // new (await import('agora-agents')).ElevenLabsTTS({
        //   key: requireEnv('NEXT_ELEVENLABS_API_KEY'),
        //   modelId: 'eleven_flash_v2_5',
        //   voiceId: process.env.NEXT_ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB',
        //   sampleRate: 24000,
        // }),
      );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
