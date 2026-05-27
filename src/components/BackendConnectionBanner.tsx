import React, { useState } from "react";
import { 
  Database, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  ShieldCheck, 
  Terminal,
  Info
} from "lucide-react";

interface BackendConnectionBannerProps {
  apiBaseUrl?: string;
}

export const BackendConnectionBanner: React.FC<BackendConnectionBannerProps> = ({
  apiBaseUrl,
}) => {
  const isConfigured = !!apiBaseUrl;
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="w-full transition-all duration-300">
      {isConfigured ? (
        /* Connected Slate Card */
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-emerald-950/15 border border-emerald-500/20 rounded-2xl shadow-sm">
          <div className="flex gap-3 items-center">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">VibeMind Cloud-Anbindung</span>
                <span className="px-2 py-0.5 text-[9px] rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold uppercase tracking-wider border border-emerald-500/20">
                  Aktiviert
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-light">
                Erfolgreich gekoppelt an API Gateway: <span className="font-mono text-emerald-300 font-medium selection:bg-emerald-500/30">{apiBaseUrl}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-4 text-[10px] text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400/70" />
            <span>AI-Analysis Ready</span>
          </div>
        </div>
      ) : (
        /* Unconfigured Banner with expandable instructions */
        <div className="bg-[#0F0F12] border border-amber-500/15 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <Database className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase">Lokal-Modus aktiv (Zwiegespräch)</h4>
                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/10 text-amber-400 font-mono font-semibold uppercase tracking-wider border border-amber-500/20">
                    Keine API-Verbindung
                  </span>
                </div>
                <p className="text-xs text-slate-350 leading-relaxed font-light">
                  Die App läuft derzeit im <strong className="text-amber-400 font-semibold">Offline-Modus</strong>. Es wird kein VibeMind Backend-Server erreicht. Deine Unterhaltungen verbleiben vollständig privat im Browser.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-xs font-semibold transition border border-amber-500/20 flex items-center gap-1.5 cursor-pointer self-start md:self-auto shrink-0"
              type="button"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Anleitung zur Konfiguration</span>
              {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick specs list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 border-t border-white/5">
            <div className="bg-[#0A0A0C]/50 rounded-xl p-3 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Was lokal funktioniert:</span>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1 leading-relaxed list-disc list-inside font-light">
                <li>100% privates Zwiegespräch mit lokalem Session-Timer</li>
                <li>Echtzeit-Mitschrift über die integrierte Browser-Sprecherkennung</li>
                <li>Sitzungsverlauf-Metadaten im lokalen Speicher deines Browsers</li>
              </ul>
            </div>

            <div className="bg-[#0A0A0C]/50 rounded-xl p-3 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-amber-400/80 font-semibold text-[11px]">
                <Cpu className="w-3.5 h-3.5" />
                <span>Was ohne API inaktiv bleibt:</span>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1 leading-relaxed list-disc list-inside font-light">
                <li>Fortgeschrittene psychologische Gemini AI-Analyse &amp; Berichte</li>
                <li>Garantierter Erhalt des Transkripts über Sitzungsende hinaus</li>
                <li>PDF- &amp; Word-Export der Gespräche</li>
              </ul>
            </div>
          </div>

          {/* Expandable step-by-step guidance */}
          {showInstructions && (
            <div className="pt-3 border-t border-white/5 space-y-3 animation-fade-in">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-[11px]">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Schritt-für-Schritt Einrichtung für Entwickler</span>
              </div>
              
              <div className="text-[11px] text-slate-400 space-y-3 font-light leading-relaxed">
                <p>
                  Um das professionelle VibeMind-Servicebackend zur hochpräzisen Transkription und psychologischen Analyse anzuwenden, folge diesen Installationsschritten:
                </p>
                
                <ol className="list-decimal list-inside space-y-2.5 pl-1.5">
                  <li>
                    Öffne die Datei <code className="px-1.5 py-0.5 rounded bg-[#0A0A0C] border border-white/5 text-purple-400 font-mono text-[10px]">.env</code> im Hauptverzeichnis deines Projektes (bzw. kopiere sie aus <code className="text-slate-300 font-mono text-[10px]">.env.example</code>).
                  </li>
                  <li>
                    Definiere deine Backend-Endpunkt-URL mit dem Präfix <code className="px-1.5 py-0.5 rounded bg-[#0A0A0C] border border-white/5 text-purple-400 font-mono text-[10px]">VITE_VIBEMIND_API_URL</code>:
                    <div className="mt-1.5 p-2 bg-[#050507] rounded-lg border border-white/5 font-mono text-[10px] text-slate-300 select-all whitespace-pre">
                      VITE_VIBEMIND_API_URL=https://deine-cloud-instanz.run.app
                    </div>
                  </li>
                  <li>
                    Starte deinen Entwicklungs- oder App-Server neu, damit Vite die neu konfigurierte Umgebungsvariable einliest.
                  </li>
                </ol>

                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-light">
                    <strong className="text-slate-300 font-semibold">Tipp:</strong> Solltest du noch kein dediziertes Backend besitzen, startet der in diesem Repository gebündelte integrierte Express-Server (<code className="font-mono text-[10.5px]">server.ts</code>) automatisch einen simulierten Gemini-Übersetzungs- und Speicherendpunkt für dich.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
