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
      reporterName: 'Marina Demonstração',
      reporterAge: '35',
      subjectType: 'self',
      patientName: 'Marina Demonstração',
      patientAge: '35',
      relationship: '',
    };
  },
  getDemoMedicationReminder(flow) {
    return flow === 'follow-up'
      ? 'medicamento fictício de demonstração, um comprimido por dia'
      : '';
  },
};
