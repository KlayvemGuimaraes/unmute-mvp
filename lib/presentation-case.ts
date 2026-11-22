import type { CaseDraft } from '@/types/conversation';
import { createDefaultIntakeProfile } from '@/lib/patient-profile';

/** A fully populated presentation preview, separate from real interview drafts. */
export function createPresentationCaseDraft(): CaseDraft {
  const profile = createDefaultIntakeProfile();
  profile.patientSex = 'Não informado';
  profile.patientHealthPlan = 'Não informado';
  profile.patientWeight = 'Não informado';

  return {
    flow: 'follow-up',
    avatar: 'clara',
    profile,
    createdAt: new Date().toISOString(),
    transcript: [
      {
        speaker: 'agent',
        text: 'Olá, Pedro, tudo certo? Sou Clara, agente do Ouvira. Quero acompanhar como foi o uso da Losartana 50 mg nos últimos dias. Você percebeu alguma reação, sintoma ou sensação diferente?',
      },
      {
        speaker: 'patient',
        text: 'Ontem senti uma tontura leve, algumas horas depois de tomar o medicamento.',
      },
      {
        speaker: 'agent',
        text: 'A tontura continua ou passou? Você buscou atendimento ou fez algum exame?',
      },
      {
        speaker: 'patient',
        text: 'Passou no mesmo dia. Não busquei atendimento nem fiz exame.',
      },
      {
        speaker: 'agent',
        text: 'Você teve alguma dificuldade para usar o medicamento nos últimos dias?',
      },
      {
        speaker: 'patient',
        text: 'Não. Não esqueci, não repeti a dose e usei conforme a prescrição.',
      },
      {
        speaker: 'agent',
        text: 'Você sabe se já havia relatos confiáveis de tontura com este medicamento?',
      },
      { speaker: 'patient', text: 'Não sei.' },
      {
        speaker: 'agent',
        text: 'Os sintomas começaram depois que você usou o medicamento?',
      },
      { speaker: 'patient', text: 'Sim, algumas horas depois.' },
      {
        speaker: 'agent',
        text: 'O uso foi interrompido ou a dose foi reduzida antes de os sintomas melhorarem?',
      },
      { speaker: 'patient', text: 'Não, não interrompi nem reduzi.' },
      {
        speaker: 'agent',
        text: 'Os sintomas voltaram depois de uma nova exposição ao medicamento?',
      },
      { speaker: 'patient', text: 'Não sei dizer; isso não foi observado.' },
      {
        speaker: 'agent',
        text: 'Você identifica outra possível explicação, como uma condição de saúde ou outro medicamento?',
      },
      { speaker: 'patient', text: 'Não sei.' },
      {
        speaker: 'agent',
        text: 'Você usou placebo em alguma situação relacionada a esses sintomas?',
      },
      { speaker: 'patient', text: 'Não se aplica; não usei placebo.' },
      {
        speaker: 'agent',
        text: 'Foi feito algum exame que indique o nível do medicamento no organismo?',
      },
      { speaker: 'patient', text: 'Não foi feito.' },
      {
        speaker: 'agent',
        text: 'Houve alguma mudança de dose e os sintomas mudaram junto?',
      },
      { speaker: 'patient', text: 'Não houve mudança de dose.' },
      {
        speaker: 'agent',
        text: 'Você já tinha sentido algo parecido com este ou outro medicamento semelhante?',
      },
      { speaker: 'patient', text: 'Não, que eu me lembre.' },
      {
        speaker: 'agent',
        text: 'Algum exame, laudo ou profissional de saúde avaliou esses sintomas?',
      },
      { speaker: 'patient', text: 'Não houve avaliação nem exame.' },
      {
        speaker: 'agent',
        text: 'Obrigado por compartilhar essas informações. O relato será organizado para revisão de um profissional farmacêutico. Esta conversa não substitui uma avaliação médica. Até logo, se cuide!',
      },
    ],
    details: {
      medicationName: 'Losartana',
      medicationDose: '50 mg',
      medicationBrandOrGeneric: 'Não informado',
      medicationSchedule: 'Não informado no perfil; confirmar conforme prescrição.',
      medicationStartedAt: 'Não informado',
      reactionDescription: 'Tontura leve relatada algumas horas após o uso.',
      reactionStartedAt: 'No dia anterior à conversa; horário exato não informado.',
      reactionOutcome: 'Passou no mesmo dia. Não houve atendimento nem exame relatado.',
      administrationDifficulties:
        'Não relatou doses esquecidas ou repetidas, nem outra dificuldade de administração.',
      naranjoAnswers: {
        previousReports: 'Não sabe.',
        eventAfterMedicine: 'Sim; relatou início algumas horas após o uso.',
        improvedAfterStopping: 'Não se aplica; não interrompeu nem reduziu o uso.',
        recurredAfterReexposure: 'Não sabe; não foi observado.',
        alternativeCauses: 'Não sabe.',
        placeboRecurrence: 'Não se aplica; não usou placebo.',
        toxicDrugLevel: 'Não informado; não foi feito exame.',
        doseResponse: 'Não se aplica; não houve mudança de dose relatada.',
        similarPastReaction: 'Não, que se lembre.',
        objectiveEvidence: 'Não informado; não houve avaliação ou exame relatado.',
      },
    },
  };
}
