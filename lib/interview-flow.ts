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

export function getProfileValidationError(profile: IntakeProfile): string | null {
  const name = profile.subjectType === 'self' ? profile.reporterName : profile.patientName;
  const age = profile.subjectType === 'self' ? profile.reporterAge : profile.patientAge;
  if (!name.trim() || !isValidAge(age)) {
    return 'Confira o nome e informe uma idade válida antes de continuar.';
  }
  return null;
}

export function getIntakeValidationError(
  profile: IntakeProfile,
  hasConsent: boolean,
  hasConfirmedProfile: boolean,
): string | null {
  const profileError = getProfileValidationError(profile);
  if (profileError) return profileError;
  if (!hasConfirmedProfile) return 'Confirme os dados do perfil para continuar.';
  if (!hasConsent) return 'Leia e aceite o aviso de áudio antes de iniciar.';
  return null;
}
