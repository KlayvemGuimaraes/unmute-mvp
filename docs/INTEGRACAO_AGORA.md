# Integração da Agora no MVP

## Visão geral

O projeto parte do quickstart oficial Next.js da Agora. O navegador cuida da chamada de áudio em tempo real por RTC; o servidor Next.js emite credenciais temporárias e inicia/encerra o agente Conversational AI. RTM transporta transcrições, estado do agente, métricas e erros para a interface.

```mermaid
sequenceDiagram
    actor Pessoa
    participant Web as Navegador (Next.js)
    participant API as Rotas Next.js
    participant Engine as Agora Conversational AI
    participant RTC as Agora RTC
    participant RTM as Agora RTM
    Pessoa->>Web: Inicia conversa
    Web->>API: GET /api/generate-agora-token
    API-->>Web: token RTC+RTM, UID e canal
    Web->>API: POST /api/invite-agent
    API->>Engine: Inicia agente no canal
    Web->>RTC: Entra no canal e publica microfone
    Web->>RTM: Login e inscrição no canal
    Engine-->>RTC: Áudio do agente
    Engine-->>RTM: Transcrição, estado, métricas e erros
    Web->>API: POST /api/stop-conversation
    API->>Engine: Encerra agente
```

## Como funciona no código

1. **Token e canal — `app/api/generate-agora-token/route.ts`.** A rota cria um nome de canal e um UID para a pessoa e gera um token combinado RTC+RTM com validade de uma hora. A chave do App Certificate é usada somente no servidor.
2. **Agente — `app/api/invite-agent/route.ts`.** O servidor usa `AgoraClient` e `Agent` do pacote `agora-agents` na região US. O agente compartilha o canal da pessoa, usa o UID definido em `lib/agora.ts` e recebe o UID da pessoa em `remoteUids`.
3. **Áudio e eventos — `components/LandingPage.tsx` e `components/ConversationComponent.tsx`.** A interface inicia a rota do agente e a conexão RTM. O cliente RTC entra no canal e publica o microfone. O Agent Toolkit lê eventos RTM para mostrar transcrição, estado, métricas e erros.
4. **Encerramento — `app/api/stop-conversation/route.ts`.** A interface envia o identificador do agente e o servidor solicita seu encerramento.

## Pipeline configurado

O quickstart usa os presets disponibilizados pela Agora: Deepgram Nova-3 em inglês para ASR, OpenAI `gpt-4o-mini` para LLM e MiniMax `speech_2_6_turbo` com voz em inglês para TTS. A configuração habilita RTM, métricas, erros e detecção de turnos por VAD. A integração FEITA/DeepSeek ainda não está ativa.

## Configuração e segurança

- `NEXT_PUBLIC_AGORA_APP_ID`: App ID; usado pelo servidor e pelo cliente.
- `NEXT_AGORA_APP_CERTIFICATE`: App Certificate; somente no servidor.
- Os valores ficam em `.env.local`, ignorado pelo Git. Não coloque chaves ou valores secretos nesta documentação.
- `.agora/project.json` guarda metadados de vínculo do quickstart; o Agora CLI foi usado para vincular o projeto e gerar o arquivo de ambiente.
- `.agents/skills/agora/SKILL.md` ensina o assistente de código a consultar o quickstart e as referências locais. A skill não faz parte do runtime do produto.

## Estado verificado

O diagnóstico do CLI indicou RTC, RTM e Conversational AI habilitados. No localhost, a página respondeu HTTP 200 e as rotas de token e início do agente responderam HTTP 200. Isso confirma o arranque local e a aceitação das chamadas de API; ainda não confirma que o agente entrou no canal nem que áudio bidirecional foi ouvido. A validação final exige iniciar uma conversa no navegador e permitir o uso do microfone.

## Referências do repositório

- [Quickstart e arquitetura](../README.md)
- [Código de criação do agente](../app/api/invite-agent/route.ts)
- [Skill local da Agora](../.agents/skills/agora/SKILL.md)
- [Quickstart oficial](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs)
