export type SpeakerRole = "partnerA" | "partnerB" | "both" | "none";
export type MarkerSpeaker = "partnerA" | "partnerB" | "both" | "unknown";

export interface PhaseConfigV2 {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  speaker: SpeakerRole;
  color: string;
  guidanceText?: string;
  promptContext?: string;
}

export interface TimerProfileV2 {
  version: 2;
  id: string;
  name: string;
  description: string;
  participants: {
    partnerA: { name: string; color: string };
    partnerB: { name: string; color: string };
  };
  phases: PhaseConfigV2[];
  summaryPromptTemplateId?: string;
  summaryPromptMarkdown?: string;
  updatedAt: string;
}

export interface SessionCreateRequest {
  participant_name_a: string;
  participant_name_b: string;
  mode_name: string;
  mode_id: string;
}

export interface SessionCreateResponse {
  session_id: string;
  created_at: string;
}

export interface PhaseMarker {
  phase_id: string;
  phase_type: string;
  phase_title: string;
  speaker: MarkerSpeaker;
  speaker_name?: string;
  start_seconds: number;
  end_seconds: number;
  color?: string;
  guidance_text?: string;
}

export type BackendSessionStatus = "pending" | "uploaded" | "transcribing" | "done" | "error";
export type FrontendSessionStatus = "idle" | "creating" | "recording" | "uploading" | "transcribing" | "done" | "error";

export interface TranscriptTurn {
  phase_type: string;
  speaker: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface SessionDetailResponse {
  session_id: string;
  status: BackendSessionStatus;
  created_at: string;
  mode_name: string;
  participant_name_a: string;
  participant_name_b: string;
  transcript?: {
    session_id: string;
    turns: TranscriptTurn[];
    generated_at: string;
  } | null;
  transcript_available: boolean;
  summary_available: boolean;
  error?: string | null;
}
