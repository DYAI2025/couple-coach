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
  const currentPhaseRef = useRef<PhaseConfigV2 | null>(null);
  const currentPhaseStartRef = useRef<number>(0);
  const partnerANameRef = useRef<string>("Partner A");
  const partnerBNameRef = useRef<string>("Partner B");
  const sessionIdRef = useRef<string | undefined>(undefined);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(async (profile: TimerProfileV2) => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    setState({
      status: client ? "creating" : "recording",
      sessionId: undefined,
      backendStatus: undefined,
      error: undefined,
      transcriptMarkdown: undefined,
      summaryMarkdown: undefined,
      pdfSupported: undefined,
    });
    markersRef.current = [];
    currentPhaseRef.current = null;
    currentPhaseStartRef.current = 0;
    partnerANameRef.current = profile.participants.partnerA.name;
    partnerBNameRef.current = profile.participants.partnerB.name;
    sessionIdRef.current = undefined;

    try {
      let runSessionId: string | undefined = undefined;
      if (client) {
        const { session_id } = await client.createSession({
          participant_name_a: profile.participants.partnerA.name,
          participant_name_b: profile.participants.partnerB.name,
          mode_name: profile.name,
          mode_id: profile.id,
        });
        runSessionId = session_id;
        sessionIdRef.current = session_id;
        setState((s) => ({ ...s, sessionId: session_id, status: "recording" }));
      }
      
      const recorder = await startRecording();
      recorderRef.current = recorder;
      
      if (!client) {
        setState((s) => ({ ...s, status: "recording" }));
      }
    } catch (err: any) {
       setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  }, [client]);

  const markPhaseStart = useCallback((phase: PhaseConfigV2, elapsedSeconds: number) => {
    currentPhaseRef.current = phase;
    currentPhaseStartRef.current = elapsedSeconds;
  }, []);

  const markPhaseEnd = useCallback((elapsedSeconds: number) => {
    if (!currentPhaseRef.current) return;
    const phase = currentPhaseRef.current;
    const startSeconds = currentPhaseStartRef.current;

    // Check for duplicates
    const exists = markersRef.current.some(m => m.phase_id === phase.id && m.start_seconds === startSeconds);
    if (!exists) {
      let speakerValue: "partnerA" | "partnerB" | "both" | "unknown" = "unknown";
      let speakerName: string | undefined = undefined;

      if (phase.speaker === "partnerA") {
        speakerValue = "partnerA";
        speakerName = partnerANameRef.current;
      } else if (phase.speaker === "partnerB") {
        speakerValue = "partnerB";
        speakerName = partnerBNameRef.current;
      } else if (phase.speaker === "both") {
        speakerValue = "both";
      }

      markersRef.current.push({
        phase_id: phase.id,
        phase_type: phase.id,
        phase_title: phase.title,
        speaker: speakerValue,
        speaker_name: speakerName,
        start_seconds: startSeconds,
        end_seconds: elapsedSeconds,
        color: phase.color,
        guidance_text: phase.guidanceText
      });
    }
    
    currentPhaseRef.current = null;
  }, []);

  const addPhase = useCallback((phase: PhaseConfigV2, startSeconds: number, endSeconds: number) => {
    const existing = markersRef.current.find(m => m.phase_id === phase.id && m.end_seconds === 0);
    if (existing) {
        existing.end_seconds = endSeconds;
    } else {
        let speakerValue: "partnerA" | "partnerB" | "both" | "unknown" = "unknown";
        let speakerName: string | undefined = undefined;

        if (phase.speaker === "partnerA") {
          speakerValue = "partnerA";
          speakerName = partnerANameRef.current;
        } else if (phase.speaker === "partnerB") {
          speakerValue = "partnerB";
          speakerName = partnerBNameRef.current;
        } else if (phase.speaker === "both") {
          speakerValue = "both";
        }

        markersRef.current.push({
            phase_id: phase.id,
            phase_type: phase.id,
            phase_title: phase.title,
            speaker: speakerValue,
            speaker_name: speakerName,
            start_seconds: startSeconds,
            end_seconds: endSeconds,
            color: phase.color,
            guidance_text: phase.guidanceText
        });
    }
  }, []);

  const finish = useCallback(async (finalElapsedSeconds: number) => {
    // End the last phase
    if (currentPhaseRef.current) {
      markPhaseEnd(finalElapsedSeconds);
    }

    if (!recorderRef.current) {
      if (!client || !sessionIdRef.current) {
        setState((s) => ({ ...s, status: "done" }));
      }
      return;
    }
    
    let audio: Blob;
    try {
      audio = await recorderRef.current.stop();
    } catch (e: any) {
      console.error("Recording error in finish:", e);
      setState((s) => ({ ...s, status: "error", error: e.message || "Failed to stop recording" }));
      return;
    }
    recorderRef.current = null;

    const currentSessionId = sessionIdRef.current;
    if (!client || !currentSessionId) {
        setState((s) => ({ ...s, status: "done" }));
        return;
    }
    
    setState((s) => ({ ...s, status: "uploading" }));
    try {
      await client.uploadRecording(currentSessionId, audio, markersRef.current);
      await client.triggerTranscription(currentSessionId);
      
      setState((s) => ({ ...s, status: "transcribing" }));
      
      let attempts = 0;
      pollerRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 60 || !currentSessionId) {
            if (pollerRef.current) clearInterval(pollerRef.current);
            setState((s) => ({ ...s, status: "error", error: "Polling timed out" }));
            return;
        }

        try {
          const detail = await client.getSession(currentSessionId);
          setState(s => ({ ...s, backendStatus: detail.status }));

          if (detail.status === "done") {
            if (pollerRef.current) clearInterval(pollerRef.current);
            try {
              const [transcriptMarkdown, summaryMarkdown] = await Promise.all([
                  client.fetchTranscriptMarkdown(currentSessionId).catch((err) => {
                    console.warn("Could not retrieve transcript markdown:", err);
                    return "## Transkript konnte nicht geladen werden.\nDetails: " + (err.message || err);
                  }),
                  client.fetchSummaryMarkdown(currentSessionId).catch((err) => {
                    console.warn("Could not retrieve summary markdown:", err);
                    return "## Zusammenfassung konnte nicht geladen werden.\nDetails: " + (err.message || err);
                  })
              ]);
              setState((s) => ({ ...s, status: "done", transcriptMarkdown, summaryMarkdown, pdfSupported: true }));
            } catch (e) {
              setState((s) => ({ ...s, status: "done", pdfSupported: false }));
            }
          } else if (detail.status === "error") {
            if (pollerRef.current) clearInterval(pollerRef.current);
            setState((s) => ({ ...s, status: "error", error: detail.error || "Unknown backend error" }));
          }
        } catch (pollErr: any) {
          console.error("Polling error:", pollErr);
          // Don't stop polling on single transient errors unless too many failed
        }
      }, 5000);

    } catch (err: any) {
      if (err.message === "PDF_NOT_SUPPORTED") {
         setState((s) => ({ ...s, status: "done", pdfSupported: false }));
      } else {
         setState((s) => ({ ...s, status: "error", error: err.message }));
      }
    }
  }, [client, markPhaseEnd]);

  const abort = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.abort();
      recorderRef.current = null;
    }
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    setState((s) => ({ ...s, status: "idle" }));
  }, []);

  return { state, start, markPhaseStart, markPhaseEnd, addPhase, finish, abort };
}
