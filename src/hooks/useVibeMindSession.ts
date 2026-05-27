import { useState, useRef, useCallback } from "react";
import { VibeMindClient } from "../api/vibemindClient";
import { startRecording, RecordingHandle } from "../services/recordingService";
import { 
  TimerProfileV2, 
  PhaseMarker, 
  PhaseConfigV2, 
  FrontendSessionStatus, 
  BackendSessionStatus,
  SessionDetailResponse 
} from "../types/vibemind";

export interface VibeMindSessionState {
  sessionId?: string;
  status: FrontendSessionStatus;
  backendStatus?: BackendSessionStatus;
  error?: string;
  transcriptMarkdown?: string;
  summaryMarkdown?: string;
  pdfSupported?: boolean;
}

export function useVibeMindSession(client: VibeMindClient | null) {
  const [state, setState] = useState<VibeMindSessionState>({
    status: "idle",
  });

  const recorderRef = useRef<RecordingHandle | null>(null);
  const markersRef = useRef<PhaseMarker[]>([]);
  const currentPhaseStartRef = useRef<number>(0);
  const currentPhaseIndexRef = useRef<number>(-1);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(async (profile: TimerProfileV2) => {
    setState((s) => ({ ...s, status: client ? "creating" : "recording" }));
    markersRef.current = [];
    currentPhaseIndexRef.current = -1;

    try {
      if (client) {
        const { session_id } = await client.createSession({
          participant_name_a: profile.participants.partnerA.name,
          participant_name_b: profile.participants.partnerB.name,
          mode_name: profile.name,
          mode_id: profile.id,
        });
        setState((s) => ({ ...s, sessionId: session_id, status: "recording" }));
      }
      
      const recorder = await startRecording();
      recorderRef.current = recorder;
    } catch (err: any) {
       setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  }, [client]);

  const markPhaseStart = useCallback((phase: PhaseConfigV2, elapsedSeconds: number) => {
    currentPhaseIndexRef.current = markersRef.current.length;
    currentPhaseStartRef.current = elapsedSeconds;
  }, []);

  const addPhase = useCallback((phase: PhaseConfigV2, startSeconds: number, endSeconds: number) => {
    const existing = markersRef.current.find(m => m.phase_id === phase.id && m.end_seconds === 0);
    if (existing) {
        existing.end_seconds = endSeconds;
    } else {
        markersRef.current.push({
            phase_id: phase.id,
            phase_type: phase.id,
            phase_title: phase.title,
            speaker: (phase.speaker === "partnerA" || phase.speaker === "partnerB" || phase.speaker === "both") ? phase.speaker : "unknown",
            start_seconds: startSeconds,
            end_seconds: endSeconds,
            color: phase.color
        });
    }
  }, []);

  const finish = useCallback(async (finalElapsedSeconds: number) => {
    if (!recorderRef.current) return;
    
    // Stop recording
    const audio = await recorderRef.current.stop();
    recorderRef.current = null;

    if (!client || !state.sessionId) {
        setState((s) => ({ ...s, status: "done" }));
        return;
    }
    
    setState((s) => ({ ...s, status: "uploading" }));
    try {
      await client.uploadRecording(state.sessionId, audio, markersRef.current);
      await client.triggerTranscription(state.sessionId);
      
      setState((s) => ({ ...s, status: "transcribing" }));
      
      let attempts = 0;
      pollerRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 60 || !state.sessionId) {
            clearInterval(pollerRef.current!);
            setState((s) => ({ ...s, status: "error", error: "Polling timed out" }));
            return;
        }

        const detail = await client.getSession(state.sessionId);
        setState(s => ({ ...s, backendStatus: detail.status }));

        if (detail.status === "done") {
          clearInterval(pollerRef.current!);
          try {
            const [transcriptMarkdown, summaryMarkdown] = await Promise.all([
                client.fetchTranscriptMarkdown(state.sessionId),
                client.fetchSummaryMarkdown(state.sessionId)
            ]);
            setState((s) => ({ ...s, status: "done", transcriptMarkdown, summaryMarkdown, pdfSupported: true }));
          } catch (e) {
            setState((s) => ({ ...s, status: "done", pdfSupported: false }));
          }
        } else if (detail.status === "error") {
          clearInterval(pollerRef.current!);
          setState((s) => ({ ...s, status: "error", error: detail.error || "Unknown backend error" }));
        }
      }, 5000);

    } catch (err: any) {
      if (err.message === "PDF_NOT_SUPPORTED") {
         setState((s) => ({ ...s, status: "done", pdfSupported: false }));
      } else {
         setState((s) => ({ ...s, status: "error", error: err.message }));
      }
    }
  }, [client, state.sessionId]);

  const abort = useCallback(() => {
    recorderRef.current?.abort();
    recorderRef.current = null;
    if (pollerRef.current) clearInterval(pollerRef.current);
    setState((s) => ({ ...s, status: "idle" }));
  }, []);

  return { state, start, addPhase, finish, abort };
}
