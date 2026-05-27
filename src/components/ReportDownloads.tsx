import React, { useState } from "react";
import { VibeMindClient } from "../api/vibemindClient";
import { FileText, Download, AlertCircle, Loader2, Sparkles, HelpCircle } from "lucide-react";

interface ReportDownloadsProps {
  sessionId?: string;
  transcriptMarkdown?: string;
  summaryMarkdown?: string;
  pdfSupported?: boolean;
  client: VibeMindClient | null;
}

export const ReportDownloads: React.FC<ReportDownloadsProps> = ({
  sessionId,
  transcriptMarkdown = "",
  summaryMarkdown = "",
  pdfSupported = true,
  client,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadMarkdown = (type: "summary" | "transcript") => {
    const text = type === "summary" ? summaryMarkdown : transcriptMarkdown;
    const filename = type === "summary" ? `vibemind_summary_${sessionId || "local"}.md` : `vibemind_transcript_${sessionId || "local"}.md`;
    
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!client || !sessionId) return;
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const blob = await client.fetchSummaryPdf(sessionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vibemind_summary_${sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      if (err.message === "PDF_NOT_SUPPORTED") {
        setPdfError("PDF-Ausgabe wird vom Backend noch nicht unterstützt (501/404).");
      } else {
        setPdfError(`PDF-Download fehlgeschlagen: ${err.message || "Unbekannter Fehler"}`);
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Helper function to render markdown text nicely in JSX
  const renderMarkdownText = (rawText: string) => {
    if (!rawText || rawText.trim().length === 0) {
      return <p className="text-slate-500 italic text-xs">Keine Inhalte vorhanden.</p>;
    }

    const lines = rawText.split("\n");
    return (
      <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-300 leading-relaxed md:max-h-[500px] md:overflow-y-auto pr-2 custom-scrollbar">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Heading 1
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-lg sm:text-xl font-bold text-slate-100 border-b border-white/5 pb-2 pt-4">
                {trimmed.replace("# ", "")}
              </h1>
            );
          }
          // Heading 2
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-base sm:text-lg font-semibold text-slate-200 pt-3">
                {trimmed.replace("## ", "")}
              </h2>
            );
          }
          // Heading 3
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-sm sm:text-base font-medium text-slate-300 pt-2">
                {trimmed.replace("### ", "")}
              </h3>
            );
          }
          // List item
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const cleanContent = trimmed.substring(2);
            return (
              <div key={idx} className="flex gap-2.5 items-start pl-3 py-0.5">
                <span className="text-indigo-400 select-none mt-1.5">•</span>
                <span className="flex-1">{renderInlineStyles(cleanContent)}</span>
              </div>
            );
          }
          // Empty line
          if (trimmed === "") {
            return <div key={idx} className="h-2" />;
          }

          // Normal paragraph
          return <p key={idx}>{renderInlineStyles(trimmed)}</p>;
        })}
      </div>
    );
  };

  // Very simple bold and italic processing
  const renderInlineStyles = (text: string) => {
    // Escape **bold**
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    if (parts.length > 1) {
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-white font-semibold">{part}</strong>;
        }
        return part;
      });
    }
    return text;
  };

  const isConfigured = !!client;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
        {/* Tab Selection */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "summary"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Executive Summary
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "transcript"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sitzungstranskript
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {isConfigured && (
            <button
              onClick={() => handleDownloadMarkdown(activeTab)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{activeTab === "summary" ? "Summary.md" : "Transkript.md"}</span>
            </button>
          )}

          {isConfigured && activeTab === "summary" && (
            <button
              disabled={downloadingPdf || !pdfSupported}
              onClick={handleDownloadPdf}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md transition-colors ${
                !pdfSupported
                  ? "bg-slate-800/40 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
              }`}
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Ergebnisse.pdf</span>
            </button>
          )}
        </div>
      </div>

      {/* Render Markdown View or Disclaimer */}
      <div className="p-4 bg-slate-950/70 border border-white/5 rounded-xl">
        {renderMarkdownText(activeTab === "summary" ? summaryMarkdown : transcriptMarkdown)}
      </div>

      {/* Warnings & Notices */}
      <div className="space-y-2">
        {pdfError && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              {pdfError}
            </p>
          </div>
        )}

        {!isConfigured && (
          <div className="flex items-start gap-2 p-3 bg-[#0A0A0C]/40 border border-white/5 rounded-lg text-slate-400">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Downloads und automatische Markdown/PDF-Reports sind deaktiviert, da kein externes VibeMind-API-Backend konfiguriert ist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
