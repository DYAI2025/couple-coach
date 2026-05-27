export type SpeakerRole = "partnerA" | "partnerB" | "both" | "none";

export interface PhaseConfigV2 {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  speaker: SpeakerRole;
  color?: string;
  guidanceText?: string;
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
}

export interface PhaseMarker {
  phase_id: string;
  phase_type: string;
  phase_title: string;
  speaker: SpeakerRole;
  speaker_name?: string;
  start_seconds: number;
  end_seconds: number;
  color?: string;
  guidance_text?: string;
}

export type SessionStatus = "idle" | "creating" | "recording" | "uploading" | "transcribing" | "done" | "error";

export interface TranscriptTurn {
  speaker: SpeakerRole;
  text: string;
  start_seconds: number;
  phase_type: string;
}

export interface SessionDetailResponse {
  session_id: string;
  created_at: number;
  status: "idle" | "uploading" | "transcribing" | "done" | "error";
  error?: string;
  transcript?: {
    turns: TranscriptTurn[];
  };
}
