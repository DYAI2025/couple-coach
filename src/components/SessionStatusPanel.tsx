import React from "react";
import { 
  FrontendSessionStatus, 
  BackendSessionStatus 
} from "../types/vibemind";
import { Loader2, CheckCircle2, XCircle, Play, Upload, Mic, FileText, Sparkles } from "lucide-react";

interface SessionStatusPanelProps {
  status: FrontendSessionStatus;
  backendStatus?: BackendSessionStatus;
  error?: string;
  sessionId?: string;
}

export const SessionStatusPanel: React.FC<SessionStatusPanelProps> = ({
  status,
  backendStatus,
  error,
  sessionId,
}) => {
  // Define pipeline steps
  const steps = [
    { key: "creating", label: "Sitzung instanziieren" },
    { key: "recording", label: "Sitzungsaufnahme aktiv" },
    { key: "uploading", label: "Audio-Pakete hochladen" },
    { key: "transcribing", label: "KI-Transkription & Partner-Analyse" },
    { key: "done", label: "Auswertungen bereit" },
  ];

  const getStepState = (stepKey: string) => {
    if (status === "error") {
      // If error, find where we stopped
      if (stepKey === "creating" && status === "creating") return "error";
      if (stepKey === "recording" && status === "recording") return "error";
      if (stepKey === "uploading" && status === "uploading") return "error";
      if (stepKey === "transcribing" && status === "transcribing") return "error";
    }

    if (stepKey === "creating") {
      if (status === "creating") return "active";
      if (["recording", "uploading", "transcribing", "done"].includes(status)) return "completed";
      return "pending";
    }

    if (stepKey === "recording") {
      if (status === "recording") return "active";
      if (["uploading", "transcribing", "done"].includes(status)) return "completed";
      return "pending";
    }

    if (stepKey === "uploading") {
      if (status === "uploading") return "active";
      if (["transcribing", "done"].includes(status)) return "completed";
      return "pending";
    }

    if (stepKey === "transcribing") {
      if (status === "transcribing") return "active";
      if (status === "done") return "completed";
      return "pending";
    }

    if (stepKey === "done") {
      if (status === "done") return "completed";
      return "pending";
    }

    return "pending";
  };

  const getStepIcon = (key: string, state: string) => {
    if (state === "completed") {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (state === "active") {
      return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />;
    }
    if (state === "error") {
      return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
    }

    switch (key) {
      case "creating":
        return <Play className="w-5 h-5 text-slate-600 shrink-0" />;
      case "recording":
        return <Mic className="w-5 h-5 text-slate-600 shrink-0" />;
      case "uploading":
        return <Upload className="w-5 h-5 text-slate-600 shrink-0" />;
      case "transcribing":
        return <Sparkles className="w-5 h-5 text-slate-600 shrink-0" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto space-y-5">
      <div className="space-y-1 text-center">
        <h3 className="text-base font-semibold text-slate-200">
          Zweigespraech-Verarbeitung
        </h3>
        {sessionId && (
          <p className="text-[10px] text-slate-500 font-mono">
            Session ID: {sessionId}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const stepState = getStepState(step.key);
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${
                stepState === "completed"
                  ? "bg-emerald-500/5 border-emerald-500/10 text-slate-300"
                  : stepState === "active"
                  ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-300"
                  : stepState === "error"
                  ? "bg-rose-500/5 border-rose-500/10 text-rose-300"
                  : "bg-[#0A0A0C]/40 border-slate-900 text-slate-500"
              }`}
            >
              {getStepIcon(step.key, stepState)}
              <div className="flex-1">
                <span className="text-xs font-medium">{step.label}</span>
                {step.key === "transcribing" && status === "transcribing" && backendStatus && (
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">
                    Backend Status: {backendStatus}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2.5 items-start">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-semibold text-rose-400 block">
              Fehler aufgetreten
            </span>
            <p className="text-xs text-rose-300/80 leading-relaxed break-words font-mono">
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
