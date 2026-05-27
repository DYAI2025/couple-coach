import React from "react";
import { ShieldCheck, Info } from "lucide-react";

interface PrivacyConsentCardProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  isBackendActive: boolean;
}

export const PrivacyConsentCard: React.FC<PrivacyConsentCardProps> = ({
  accepted,
  onChange,
  isBackendActive,
}) => {
  return (
    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3">
      <div className="flex gap-2.5 items-start">
        <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-slate-200">
            Datenschutz & Einwilligung für diese Sitzung
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ihre Privatsphäre ist uns wichtig. Bevor Sie die Sitzung starten, beachten Sie bitte folgende Punkte:
          </p>
        </div>
      </div>

      <ul className="text-xs text-slate-400 pl-7 list-disc space-y-1.5 leading-relaxed">
        <li>
          Beim Starten des Timers wird Ihr <span className="text-slate-200 font-medium">Mikrofon</span> zur lokalen Audioaufzeichnung aktiviert.
        </li>
        {isBackendActive ? (
          <li>
            Nach Beendigung wird die Audiodatei zur professionellen Transkription und Analyse an das konfigurierte{" "}
            <span className="text-indigo-400 font-medium">VibeMind-Backend</span> gesendet.
          </li>
        ) : (
          <li>
            Da kein Backend verbunden ist, verbleibt die Sitzung vollständig lokal.{" "}
            <span className="text-amber-400 font-medium">Keine Audio-Daten werden übertragen</span>, Downloads und tiefe KIs sind unzugänglich.
          </li>
        )}
        <li>
          Die optionale Live-Spracherkennung im Timer dient nur als sofortige Visualisierung und entspricht nicht der finalen KI-Analyse.
        </li>
        <li>
          Es werden standardmäßig keine vollständigen Audioaufnahmen oder Transkripte in Ihrem lokalen Browser-Verlauf gespeichert.
        </li>
      </ul>

      <div className="pt-2 pl-7 flex items-center gap-2">
        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer select-none transition-colors">
          <input
            id="privacy-consent-checkbox"
            type="checkbox"
            checked={accepted}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
          />
          <span className="text-xs text-slate-300 font-medium">
            Ich bin mit Aufnahme und Verarbeitung einverstanden.
          </span>
        </label>
      </div>
    </div>
  );
};
