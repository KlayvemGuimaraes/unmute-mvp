import type { RTMClient } from 'agora-rtm';

export interface AgoraTokenData {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
  sessionState: string;
}

export type InterviewFlow = 'follow-up' | 'report-reaction';
export type InterviewAvatar = 'miguel' | 'clara';
export type SubjectType = 'self' | 'third-party';

export interface IntakeProfile {
  reporterName: string;
  reporterAge: string;
  subjectType: SubjectType;
  patientName: string;
  patientAge: string;
  patientCpf: string;
  patientRg: string;
  patientSex: string;
  patientHealthPlan: string;
  patientWeight: string;
  patientMedications: string;
  relationship: string;
}

export interface InterviewConfig {
  flow: InterviewFlow;
  avatar: InterviewAvatar;
}

export interface AgentInviteContext extends InterviewConfig {
  followUpMedication?: string;
}

export interface AgentContext extends InterviewConfig {
  profile: IntakeProfile;
}

export interface TranscriptTurn {
  speaker: 'agent' | 'patient';
  text: string;
  createdAt?: number;
}

export type NaranjoQuestionKey =
  | 'previousReports'
  | 'eventAfterMedicine'
  | 'improvedAfterStopping'
  | 'recurredAfterReexposure'
  | 'alternativeCauses'
  | 'placeboRecurrence'
  | 'toxicDrugLevel'
  | 'doseResponse'
  | 'similarPastReaction'
  | 'objectiveEvidence';

export type NaranjoCategory = 'definite' | 'probable' | 'possible' | 'unlikely';

export interface NaranjoResult {
  score: number;
  category: NaranjoCategory;
}

export interface CaseDraftDetails {
  medicationName: string;
  medicationDose: string;
  medicationBrandOrGeneric: string;
  medicationSchedule: string;
  reactionDescription: string;
  reactionStartedAt: string;
  medicationStartedAt: string;
  reactionOutcome: string;
  administrationDifficulties: string;
  naranjoAnswers: Record<NaranjoQuestionKey, string>;
  naranjoResult?: NaranjoResult;
}

export interface CaseDraft extends AgentContext {
  createdAt: string;
  transcript: TranscriptTurn[];
  details: CaseDraftDetails;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
  context: AgentInviteContext;
}

export interface StopConversationRequest {
  agent_id: string;
}

export interface AgentResponse {
  agent_id: string;
  create_ts: number;
  state: string;
}

export interface AgoraRenewalTokens {
  rtcToken: string;
  rtmToken: string;
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData;
  rtmClient: RTMClient;
  context: AgentContext;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  onAgentStarted: (response: AgentResponse) => void;
  onAgentStartFailed: (message: string, context: AgentContext) => void;
  onEndConversation: (draft: CaseDraft) => void;
  onOpenReportPreview: () => void;
}
