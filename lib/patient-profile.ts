import type { IntakeProfile } from '@/types/conversation';

export function createEmptyIntakeProfile(): IntakeProfile {
  return {
    reporterName: '',
    reporterAge: '',
    subjectType: 'self',
    patientName: '',
    patientAge: '',
    patientCpf: '',
    patientRg: '',
    patientSex: 'Não informado',
    patientHealthPlan: '',
    patientWeight: '',
    patientMedications: '',
    relationship: '',
  };
}

export function createDefaultIntakeProfile(): IntakeProfile {
  return {
    reporterName: 'Rayssa Biarque',
    reporterAge: '25',
    subjectType: 'self',
    patientName: 'Rayssa Biarque',
    patientAge: '25',
    patientCpf: '570534098**',
    patientRg: '28.***.***-X',
    patientSex: 'Não informado',
    patientHealthPlan: '',
    patientWeight: '',
    patientMedications: 'Losartana 50 mg',
    relationship: '',
  };
}
