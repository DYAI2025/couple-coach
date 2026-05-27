import { useState, useRef, useCallback } from "react";
import { VibeMindClient } from "../api/vibemindClient";
import { startRecording, RecordingHandle } from "../services/recordingService";
import { 
  TimerProfileV2, 
  PhaseMarker, 
  PhaseConfigV2, 
  SessionStatus, 
  SessionDetailResponse 
} from "../types/vibemind";

export interface VibeMindSessionState {
  sessionId?: string;
  status: SessionStatus;
  backendStatus?: SessionDetailResponse['status'];
  error?: string;
  transcriptMarkdown?: string;
  summaryMarkdown?: string;
  canDownloadPdf: boolean;
}

export function useVibeMindSession(client: VibeMindClient | null) {
  const [state, setState] = useState<VibeMindSessionState>({
    status: "idle",
    canDownloadPdf: false,
  });

  const recorderRef = useRef<RecordingHandle | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const markersRef = useRef<PhaseMarker[]>([]);
  const currentPhaseStartRef = useRef<number>(0);
  const currentPhaseRef = useRef<PhaseConfigV2 | null>(null);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(async (profile: TimerProfileV2) => {
    if (!client) return;
    setState((s) => ({ ...s, status: "creating" }));
    try {
      const { session_id } = await client.createSession({
        participant_name_a: profile.participants.partnerA.name,
        participant_name_b: profile.participants.partnerB.name,
        mode_name: profile.name,
        mode_id: profile.id,
      });

      const recorder = await startRecording();
      recorderRef.current = recorder;
      sessionStartTimeRef.current = performance.now();
      
      setState((s) => ({ ...s, sessionId: session_id, status: "recording" }));
    } catch (err: any) {
      setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  }, [client]);

  const markPhaseStart = useCallback((phase: PhaseConfigV2, elapsedSeconds: number) => {
    currentPhaseRef.current = phase;
    currentPhaseStartRef.current = elapsedSeconds;
  }, []);

  const markPhaseEnd = useCallback((elapsedSeconds: number) => {
    if (currentPhaseRef.current) {
      markersRef.current.push({
        phase_id: currentPhaseRef.current.id,
        phase_type: currentPhaseRef.current.id,
        phase_title: currentPhaseRef.current.title,
        speaker: currentPhaseRef.current.speaker,
        start_seconds: currentPhaseStartRef.current,
        end_seconds: elapsedSeconds,
      });
    }
  }, []);

  const finish = useCallback(async (finalElapsedSeconds: number) => {
    if (!client || !state.sessionId || !recorderRef.current) return;
    
    // Close last marker if needed
    markPhaseEnd(finalElapsedSeconds);

    setState((s) => ({ ...s, status: "uploading" }));
    try {
      const audio = await recorderRef.current.stop();
      await client.uploadRecording(state.sessionId, audio, markersRef.current);
      await client.triggerTranscription(state.sessionId);
      
      setState((s) => ({ ...s, status: "transcribing" }));
      
      // Start polling
      pollerRef.current = setInterval(async () => {
        if (!client || !state.sessionId) return;
        const detail = await client.getSession(state.sessionId);
        if (detail.status === "done") {
          clearInterval(pollerRef.current!);
          const [transcriptMarkdown, summaryMarkdown] = await Promise.all([
            client.fetchTranscriptMarkdown(state.sessionId),
            client.fetchSummaryMarkdown(state.sessionId)
          ]);
          setState((s) => ({ ...s, status: "done", transcriptMarkdown, summaryMarkdown }));
        } else if (detail.status === "error") {
          clearInterval(pollerRef.current!);
          setState((s) => ({ ...s, status: "error", error: detail.error }));
        }
      }, 5000);

    } catch (err: any) {
      setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  }, [client, state.sessionId, markPhaseEnd]);

  const abort = useCallback(() => {
    recorderRef.current?.abort();
    setState((s) => ({ ...s, status: "idle" }));
  }, []);

  return { state, start, markPhaseStart, markPhaseEnd, finish, abort };
}
