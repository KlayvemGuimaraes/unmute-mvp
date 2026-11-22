import type { IntakeProfile, InterviewFlow } from '@/types/conversation';

export interface PatientProfileProvider {
  getDemoProfile(): IntakeProfile;
  getDemoMedicationReminder(flow: InterviewFlow): string;
}

/**
 * In-memory fixture used until the project chooses a patient-record system.
 * Nothing in this adapter writes to a database, browser storage, or Agora.
 */
export const localDemoProfileProvider: PatientProfileProvider = {
  getDemoProfile() {
    return {
      reporterName: 'João Pedro Santos',
      reporterAge: '42',
      subjectType: 'self',
      patientName: 'João Pedro Santos',
      patientAge: '42',
      patientSex: 'Não informado',
      patientHealthPlan: 'Não informado',
      patientWeight: '',
      patientMedications: 'Medicamento fictício de demonstração',
      relationship: '',
    };
  },
  getDemoMedicationReminder(flow) {
    return flow === 'follow-up'
      ? 'medicamento fictício de demonstração, um comprimido por dia'
      : '';
  },
};
