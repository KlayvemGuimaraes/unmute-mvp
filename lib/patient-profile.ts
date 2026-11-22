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
    reporterName: 'Pedro Henrique Almeida',
    reporterAge: '42',
    subjectType: 'self',
    patientName: 'Pedro Henrique Almeida',
    patientAge: '42',
    patientCpf: '570534098**',
    patientRg: '28.***.***-X',
    patientSex: 'Não informado',
    patientHealthPlan: '',
    patientWeight: '',
    patientMedications: 'Losartana 50 mg',
    relationship: '',
  };
}
