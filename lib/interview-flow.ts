import type { IntakeProfile, InterviewFlow } from '@/types/conversation';

export function getInitialInterviewFlow(value: string | null): InterviewFlow {
  return value === 'report-reaction' ? 'report-reaction' : 'follow-up';
}

function isValidAge(value: string) {
  const digitsOnly =
    value.length > 0 &&
    [...value].every((character) => character >= '0' && character <= '9');
  return digitsOnly && Number(value) >= 0 && Number(value) <= 120;
}

export function getIntakeValidationError(
  profile: IntakeProfile,
  hasConsent: boolean,
): string | null {
  if (!profile.reporterName.trim() || !isValidAge(profile.reporterAge)) {
    return 'Informe o nome e uma idade válida para quem responde.';
  }
  if (
    profile.subjectType === 'third-party' &&
    (!profile.patientName.trim() ||
      !isValidAge(profile.patientAge) ||
      !profile.relationship.trim())
  ) {
    return 'Complete os dados da pessoa e o vínculo com ela.';
  }
  if (!hasConsent) return 'Leia e aceite o aviso de áudio antes de iniciar.';
  return null;
}
