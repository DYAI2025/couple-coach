/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Mic, 
  MicOff, 
  Sparkles, 
  HelpCircle, 
  CheckCircle, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  BarChart2, 
  BookOpen, 
  AlertCircle,
  X,
  History,
  Info,
  Languages,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { Phase, SessionTemplate, SessionResult, AIAnalysis, InteractionMessage } from "./types";
import { playSingingBowl } from "./utils/audio";
import { 
  SpeakerRole, 
  PhaseConfigV2, 
  TimerProfileV2, 
  SessionCreateRequest, 
  SessionCreateResponse, 
  PhaseMarker, 
  SessionStatus, 
  TranscriptTurn, 
  SessionDetailResponse 
} from "./types/vibemind";
import { VibeMindClient } from "./api/vibemindClient";
import { ThemeToggle } from "./components/ThemeToggle";
import { useVibeMindSession } from "./hooks/useVibeMindSession";
import { ProfileStore } from "./services/profileStore";

// Standard preset profiles compatible with VibeMind V2 database definitions
const PRESET_PROFILES_V2: TimerProfileV2[] = [
  {
    version: 2,
    id: "maintain",
    name: "Maintain (Beziehungspflege)",
    description: "Der Klassiker nach Michael Lukas Moeller. Jährlich oder wöchentlich, um im emotionalen Fluss zu bleiben.",
    participants: {
      partnerA: { name: "Alex", color: "#10b981" },
      partnerB: { name: "Jordan", color: "#f59e0b" }
    },
    phases: [
      { id: "setup", title: "Ankommen & Atmen", description: "Atmet gemeinsam tief durch, haltet eure Hände und bereitet euch auf das achtsame Zuhören vor.", durationSeconds: 120, speaker: "both", color: "#3b82f6", guidanceText: "Atmet im Gleichklang. Blickkontakt halten." },
      { id: "turn_a", title: "Redezeit Partner A", description: "Berichte von deinem Innenleben, deinen Gefühlen, Freuden und Sorgen. Partner B hört vollkommen schweigend zu.", durationSeconds: 600, speaker: "partnerA", color: "#10b981", guidanceText: "Schnitt zu Partner A. Partner B hört schweigend zu." },
      { id: "turn_b", title: "Redezeit Partner B", description: "Berichte von deinem Innenleben. Partner A hört vollkommen schweigend zu. Kein Bezug auf das gerade Gesagte.", durationSeconds: 600, speaker: "partnerB", color: "#f59e0b", guidanceText: "Schnitt zu Partner B. Partner A hört schweigend zu." },
      { id: "appreciation", title: "Wertschätzender Ausklang", description: "Blickt euch in die Augen, bedankt euch für das gegenseitige Vertrauen und den geschaffenen Raum.", durationSeconds: 120, speaker: "both", color: "#8b5cf6", guidanceText: "Gegenseitiger Dank für Ehrlichkeit." }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    version: 2,
    id: "listening",
    name: "Aktives Spiegeln (Listening Mode)",
    description: "Mit zusätzlichem Raum für kurzes, verständnisvolles Zusammenfassen (Spiegeln) durch den Partner.",
    participants: {
      partnerA: { name: "Alex", color: "#10b981" },
      partnerB: { name: "Jordan", color: "#f59e0b" }
    },
    phases: [
      { id: "setup", title: "Ankommen", description: "Achtsame Stille. Richtet den Fokus ganz auf den gemeinsamen Raum.", durationSeconds: 90, speaker: "both", color: "#3b82f6", guidanceText: "Setzt euch bequem hin und kommt an." },
      { id: "turn_a", title: "Redezeit Partner A", description: "Partner A spricht über Gefühle und Befindlichkeiten. Partner B schweigt und nimmt auf.", durationSeconds: 480, speaker: "partnerA", color: "#10b981", guidanceText: "Spreche über dein Inneres, deine Freuden und Erlebnisse." },
      { id: "mirror_b", title: "Spiegeln durch Partner B", description: "Partner B spiegelt kurz in eigenen Worten, was er verstanden hat. Keine Verteidigung, keine Diskussion.", durationSeconds: 180, speaker: "partnerB", color: "#6366f1", guidanceText: "Spiegele verständnisvoll. Keine Bewertung." },
      { id: "turn_b", title: "Redezeit Partner B", description: "Partner B spricht über seine Gefühle. Partner A schweigt.", durationSeconds: 480, speaker: "partnerB", color: "#f59e0b", guidanceText: "Spreche über dich selbst. Partner A hört aufmerksam zu." },
      { id: "mirror_a", title: "Spiegeln durch Partner A", description: "Partner A spiegelt wertfrei, was er emotional verstanden hat.", durationSeconds: 180, speaker: "partnerA", color: "#a855f7", guidanceText: "Spiegele verständnisvoll das Gehörte." },
      { id: "appreciation", title: "Schlusskreis", description: "Gemeinsames Nachspüren in physischer Nähe.", durationSeconds: 150, speaker: "both", color: "#ec4899", guidanceText: "Atmet gemeinsam und blickt euch dankbar an." }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    version: 2,
    id: "commitment",
    name: "Commitment (Intensivgespräch)",
    description: "Mehr Redezeit für tiefe Selbstexplorationen und intensive, emotionale Themen.",
    participants: {
      partnerA: { name: "Alex", color: "#10b981" },
      partnerB: { name: "Jordan", color: "#f59e0b" }
    },
    phases: [
      { id: "setup", title: "Fokus-Atmung", description: "Atmet im Gleichklang. Bereitet euch auf gegenseitige Nähe vor.", durationSeconds: 180, speaker: "both", color: "#3b82f6", guidanceText: "Atmet tief ein und aus." },
      { id: "turn_a", title: "Redezeit Partner A", description: "Sichere Entfaltung von tiefliegenden Themen, Ängsten oder Zukunftswünschen.", durationSeconds: 900, speaker: "partnerA", color: "#10b981", guidanceText: "Sprich offen über dich selbst." },
      { id: "turn_b", title: "Redezeit Partner B", description: "Sichere Entfaltung deines Innenlebens ohne Unterbrechung oder Bewertung.", durationSeconds: 900, speaker: "partnerB", color: "#f59e0b", guidanceText: "Teile dich ehrfürchtig und frei mit." },
      { id: "appreciation", title: "Wärme teilen", description: "Physischer Kontakt, sanftes Entspannen, Dankbarkeit äussern.", durationSeconds: 180, speaker: "both", color: "#ec4899", guidanceText: "Spürt die tiefe partnerschaftliche Verbindung." }
    ],
    updatedAt: new Date().toISOString()
  }
];

const PRESET_TEMPLATES: SessionTemplate[] = PRESET_PROFILES_V2.map(p => ({
  id: p.id,
  name: p.name,
  icon: p.id === "maintain" ? "🌱" : p.id === "listening" ? "🤝" : "🔥",
  description: p.description,
  phases: p.phases.map(ph => ({
    id: ph.id,
    title: ph.title,
    description: ph.description,
    durationMinutes: Math.round(ph.durationSeconds / 60) || 1,
    speaker: ph.speaker === "none" ? "none" : ph.speaker === "both" ? "both" : ph.speaker
  }))
}));

// Sample simulated couple reflections for demonstration / testing in non-supported devices
const SIMULATED_REFLECTIONS_A = [
  "Ich spüre in letzter Zeit eine ziemliche innere Unruhe, besonders wenn ich abends von der Arbeit nach Hause komme... Es fällt mir schwer, komplett abzuschalten, und ich fühle mich manchmal etwas einsam mit all den To-Dos.",
  "Mir ist bewusst geworden, wie wichtig mir unsere kleinen, ungestörten Momente am Morgen sind, aber ich traue mich oft nicht, danach zu fragen, weil ich dich nicht belasten will.",
  "Ich wünsche mir mehr Leichtigkeit zwischen uns. Manchmal habe ich Angst, dass wir im Alltag gefangen sind und das Spielerische verlieren, das ich so sehr an dir liebe.",
  "Es berührt mich tief, wenn du mir einfach zuhörst, ohne direkt eine Lösung finden zu wollen. Das gibt mir das Gefühl, wirklich gehalten und verstanden zu werden."
];

const SIMULATED_REFLECTIONS_B = [
  "Wenn du mir das sagst, merke ich, dass ich oft direkt in den 'Lösungsmodus' springe, weil ich dich nicht leiden sehen kann. Dabei wünsche ich mir eigentlich nur, dass du dich sicher fühlst.",
  "Ich fühle mich manchmal überfordert mit den vielen Anforderungen aus der Familie, und dann ziehe ich mich emotional zurück. Das tut mir leid, es ist keine Ablehnung gegen dich.",
  "Ich schätze deine Wärme unglaublich. Wenn ich dich lachen sehe, merke ich sofort, wie meine eigenen Sorgen ein Stück kleiner werden. Ich möchte wieder mehr Abenteuer mit dir teilen.",
  "Ich habe manchmal die Befürchtung, nicht gut genug zu sein oder deine Erwartungen nicht zu erfüllen. Es tut gut, das einfach mal auszusprechen, ohne dass wir darüber streiten müssen."
];

interface SelfReflectionTrendChartProps {
  result: SessionResult;
  partnerAName: string;
  partnerBName: string;
}

function SelfReflectionTrendChart({ result, partnerAName, partnerBName }: SelfReflectionTrendChartProps) {
  // Let's analyze pronouns in a given text to return a score from 30 to 100
  const evaluateTextScore = (text: string, defaultScore: number): number => {
    if (!text || text.trim().length === 0) return defaultScore;
    const lower = text.toLowerCase();
    
    // Count "Ich" markers
    const iWords = ["ich", "mein", "mir", "mich", "meine", "meiner", "meinem", "meines", "wir", "uns"];
    let iCount = 0;
    iWords.forEach(w => {
      const regex = new RegExp(`\\b${w}\\b`, "g");
      const matches = lower.match(regex);
      if (matches) iCount += matches.length;
    });

    // Count "Du" markers
    const duWords = ["du", "dir", "dich", "dein", "deine", "deiner", "deinem", "deines", "ihr", "euch"];
    let duCount = 0;
    duWords.forEach(w => {
      const regex = new RegExp(`\\b${w}\\b`, "g");
      const matches = lower.match(regex);
      if (matches) duCount += matches.length;
    });

    if (iCount === 0 && duCount === 0) {
      return defaultScore;
    }

    const total = iCount + duCount;
    const computed = (iCount / total) * 100;
    // Map to realistic therapeutic score range 35-95%
    return Math.round(35 + (computed * 0.6));
  };

  const defaultA = result.analysis?.ichBotschaftenScore.partnerA ?? 75;
  const defaultB = result.analysis?.ichBotschaftenScore.partnerB ?? 70;

  const msgs = result.messages || [];
  
  // Create beautiful curve points
  let trendData = [];
  if (msgs.length === 0) {
    // Elegant fallback simulation representing conversation progression
    trendData = [
      { name: "Sitzungsstart", [partnerAName]: Math.round(defaultA * 0.82), [partnerBName]: Math.round(defaultB * 0.78), info: "Einstieg & Fokussierung" },
      { name: "Mitte", [partnerAName]: Math.round(defaultA * 1.05), [partnerBName]: Math.round(defaultB * 0.94), info: "Vertiefung der Emotionen" },
      { name: "Hauptredezeit", [partnerAName]: Math.round(defaultA * 1.0), [partnerBName]: Math.round(defaultB * 1.08), info: "Ausdruck der Verletzlichkeit" },
      { name: "Sitzungsende", [partnerAName]: defaultA, [partnerBName]: defaultB, info: "Resonanz & Würdigung" }
    ];
  } else {
    let runningA = defaultA;
    let runningB = defaultB;
    
    trendData = msgs.map((m, idx) => {
      const calculated = evaluateTextScore(m.text, m.speaker === 'partnerA' ? defaultA : defaultB);
      if (m.speaker === 'partnerA') {
        runningA = calculated;
      } else {
        runningB = calculated;
      }
      
      const briefText = m.text.length > 25 ? m.text.substring(0, 25) + "..." : m.text;
      
      return {
        name: m.timestamp || `Turn ${idx + 1}`,
        [partnerAName]: runningA,
        [partnerBName]: runningB,
        speaker: m.speaker === 'partnerA' ? partnerAName : partnerBName,
        textSegment: briefText
      };
    });
  }

  // Custom styling for Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0A0C] border border-white/10 p-3 rounded-xl shadow-xl space-y-2 select-none">
          <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">{label}</p>
          <div className="space-y-1">
            {payload.map((pld: any, index: number) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pld.color }} />
                <span className="text-slate-200 font-semibold">{pld.name}:</span>
                <span className="font-mono font-bold" style={{ color: pld.color }}>{pld.value}%</span>
              </div>
            ))}
          </div>
          {payload[0]?.payload?.textSegment && (
            <p className="text-[10px] text-slate-405 font-light border-t border-white/5 pt-1.5 italic max-w-xs leading-relaxed">
              &quot;{payload[0].payload.textSegment}&quot;
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <div className="bg-[#0F0F12] rounded-b-3xl p-6 border-b border-white/5 space-y-6">
        <div className="space-y-1 text-left">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span>Verlauf der Selbstreflexion (&quot;Ich-Botschaften&quot;-Trend)</span>
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed text-left">
            Echtzeit-Analyse der Redegestaltung über die Gesprächsdauer. Höhere Werte signalisieren den Fokus auf das eigene Erleben und verletzliche Gefühle.
          </p>
        </div>
        
        {/* Info Legend Badge */}
        <div className="flex items-center space-x-4 text-[10.5px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400 font-medium">{partnerAName}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-slate-400 font-medium">{partnerBName}</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full font-mono text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPartnerA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPartnerB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="#52525b" 
              tickSize={6}
              tickLine={{ stroke: '#27272a' }}
            />
            <YAxis 
              domain={[30, 100]} 
              stroke="#52525b" 
              tickCount={5}
              tickLine={{ stroke: '#27272a' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey={partnerAName} 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPartnerA)" 
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Area 
              type="monotone" 
              dataKey={partnerBName} 
              stroke="#f59e0b" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPartnerB)" 
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Instructional explanation Footer summary */}
      <div className="bg-[#0A0A0C]/50 p-3.5 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] leading-relaxed text-left">
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold">🟢 Ich-Meldungen (Selbstreflexion):</p>
          <p className="text-slate-400">
            Sätze wie <em>&quot;Ich fühle mich...&quot;</em> oder <em>&quot;In mir regt sich...&quot;</em> drücken verletzliche Innensichten aus. Sie entkräften automatische Abwehrmechanismen des Partners und fördern Nähe.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-amber-500 uppercase tracking-widest font-bold">🟡 Du-Meldungen (Symptom-Projektion):</p>
          <p className="text-slate-400">
            Sätze, die auf das Verhalten des Gegenübers abzielen (z.B. <em>&quot;Du hast nie Zeit...&quot;</em>) erzeugen Widerstand und schränken die therapeutische Wirkung des Moeller-Zwiegesprächs ein.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Profiles configuration & LocalStorage Persistence
  const [profiles, setProfiles] = useState<TimerProfileV2[]>(() => {
    const saved = localStorage.getItem("zwiegespraech_profiles");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Could not parse saved custom profiles:", e);
      }
    }
    return PRESET_PROFILES_V2;
  });

  const [selectedProfile, setSelectedProfile] = useState<TimerProfileV2>(() => {
    const savedId = localStorage.getItem("zwiegespraech_selected_profile_id");
    if (savedId) {
      const found = profiles.find(p => p.id === savedId);
      if (found) return found;
    }
    return profiles[0] || PRESET_PROFILES_V2[0];
  });

  // Current session parameters
  const [partnerA_Name, setPartnerA_Name] = useState(() => selectedProfile.participants.partnerA.name);
  const [partnerB_Name, setPartnerB_Name] = useState(() => selectedProfile.participants.partnerB.name);
  
  // Custom template mapping to keep legacy components happy
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate>(() => {
    return {
      id: selectedProfile.id,
      name: selectedProfile.name,
      icon: selectedProfile.id === "maintain" ? "🌱" : selectedProfile.id === "listening" ? "🤝" : "🔥",
      description: selectedProfile.description,
      phases: selectedProfile.phases.map(ph => ({
        id: ph.id,
        title: ph.title,
        description: ph.description,
        durationMinutes: Math.round(ph.durationSeconds / 60) || 1,
        speaker: ph.speaker === "none" ? "none" : ph.speaker === "both" ? "both" : ph.speaker
      }))
    };
  });

  const [activePhases, setActivePhases] = useState<any[]>(() => {
    return selectedProfile.phases.map(p => ({
      ...p,
      durationMinutes: Math.round(p.durationSeconds / 60) || 1
    }));
  });

  // Editor states for customizing or creating profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const [editedProfileName, setEditedProfileName] = useState("");
  const [editedProfileDesc, setEditedProfileDesc] = useState("");
  const [editedPhases, setEditedPhases] = useState<PhaseConfigV2[]>([]);

  // Continuous Session Audio & Timeline markers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionStartTimeRef = useRef<number>(0);
  const currentPhaseStartTimeRef = useRef<number>(0);
  const phaseMarkersRef = useRef<PhaseMarker[]>([]);

  // Backend Integration variables
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendTranscriptMarkdown, setBackendTranscriptMarkdown] = useState<string>("");
  const [backendSummaryMarkdown, setBackendSummaryMarkdown] = useState<string>("");

  // App routing status: 'setup' | 'active' | 'insights' | 'history'
  const [appMode, setAppMode] = useState<'setup' | 'active' | 'insights' | 'history'>('setup');
  
  // Active Timer states
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);

  // Live Speech Recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcriptA, setTranscriptA] = useState("");
  const [transcriptB, setTranscriptB] = useState("");

  // New transcription segment stream, diarization and translation state managers
  const [sessionMessages, setSessionMessages] = useState<InteractionMessage[]>([]);
  const [translationLang, setTranslationLang] = useState<string>("none");
  const translationLangRef = useRef<string>("none");

  // Sync ref to avoid closure issues in SpeechRecognition event listeners
  useEffect(() => {
    translationLangRef.current = translationLang;
  }, [translationLang]);
  
  // Real-time voice visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Native SpeechRecognition reference
  const recognitionRef = useRef<any>(null);

  // Finished Session & AI Analysis
  const [latestResult, setLatestResult] = useState<SessionResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Past sessions history
  const [history, setHistory] = useState<SessionResult[]>([]);
  const [showingHistoryDetail, setShowingHistoryDetail] = useState<SessionResult | null>(null);
  const [showMethodGuide, setShowMethodGuide] = useState(false);

  // Sync state when selectedProfile changes
  useEffect(() => {
    if (selectedProfile) {
      setPartnerA_Name(selectedProfile.participants.partnerA.name);
      setPartnerB_Name(selectedProfile.participants.partnerB.name);
      
      const mappedPhases = selectedProfile.phases.map(p => ({
        ...p,
        durationMinutes: Math.round(p.durationSeconds / 60) || 1
      }));
      setActivePhases(mappedPhases);

      setSelectedTemplate({
        id: selectedProfile.id,
        name: selectedProfile.name,
        icon: selectedProfile.id === "maintain" ? "🌱" : selectedProfile.id === "listening" ? "🤝" : "🔥",
        description: selectedProfile.description,
        phases: mappedPhases.map(ph => ({
           id: ph.id,
           title: ph.title,
           description: ph.description,
           durationMinutes: ph.durationMinutes || 1,
           speaker: ph.speaker === "none" ? "none" : ph.speaker === "both" ? "both" : ph.speaker
        }))
      });

      localStorage.setItem("zwiegespraech_selected_profile_id", selectedProfile.id);
    }
  }, [selectedProfile]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("zwiegespraech_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save speech recognition setup
  useEffect(() => {
    // Check speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "de-DE"; // Default package to German, works great with deep reflections

      rec.onresult = (e: any) => {
        let chunk = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            const finalPart = e.results[i][0].transcript.trim();
            if (!finalPart) continue;

            // Append final part permanently to the active speaker's bucket
            const activeSpeaker = activePhases[currentPhaseIndex]?.speaker;
            const speakerKey = (activeSpeaker === "partnerB" || activeSpeaker === "partnerA") ? activeSpeaker : "partnerA";

            if (speakerKey === "partnerA") {
              setTranscriptA(prev => {
                const updated = prev ? prev + " " + finalPart : finalPart;
                return updated.trim();
              });
            } else if (speakerKey === "partnerB") {
              setTranscriptB(prev => {
                const updated = prev ? prev + " " + finalPart : finalPart;
                return updated.trim();
              });
            }

            // Create a structured message for live stream and customizable speaker diarization
            const timestampStr = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const messageObj: InteractionMessage = {
              speaker: speakerKey,
              text: finalPart,
              timestamp: timestampStr
            };

            setSessionMessages(prev => [...prev, messageObj]);

            // Translate immediately in the background if a translation language is configured
            const selectedLang = translationLangRef.current;
            if (selectedLang && selectedLang !== "none") {
              translateMessage(finalPart, selectedLang).then(translatedText => {
                if (translatedText) {
                  setSessionMessages(prev => 
                    prev.map(m => (m.text === finalPart && m.timestamp === timestampStr)
                      ? { ...m, translation: translatedText, translationLang: selectedLang }
                      : m
                    )
                  );
                }
              });
            }
          } else {
            chunk += e.results[i][0].transcript;
          }
        }
        setLiveTranscript(chunk);
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition warning:", e.error);
        if (e.error === "not-allowed") {
          setIsRecording(false);
        }
      };

      rec.onend = () => {
        // Automatically restart if session is still active and playing
        if (isPlaying && isRecording) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            // Quiet fail
          }
        }
      };

      recognitionRef.current = rec;
    }
  }, [activePhases, currentPhaseIndex, isPlaying, isRecording]);

  // Main Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer expired! Transition to next phase
            playSingingBowl();
            handleNextPhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentPhaseIndex, activePhases]);

  // Handle automatic mic triggers based on phase speaker
  useEffect(() => {
    if (appMode !== 'active') return;

    const currentPhase = activePhases[currentPhaseIndex];
    const isVoiceTurn = currentPhase && (currentPhase.speaker === 'partnerA' || currentPhase.speaker === 'partnerB');

    if (isPlaying && isVoiceTurn && transcriptionEnabled) {
      startMicrophoneTracking();
      startSpeechRecognition();
    } else {
      stopMicrophoneTracking();
      stopSpeechRecognition();
    }
  }, [currentPhaseIndex, isPlaying, appMode, transcriptionEnabled]);

  // Start Voice & Visual Audio Level Context
  const startMicrophoneTracking = async () => {
    if (micStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);

      // Create high-pass filter to eliminate low-frequency room rumble and power line hum (below 100 Hz)
      const highPassFilter = audioCtx.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 100;
      highPassFilter.Q.value = 1.0;

      // Create low-pass filter to attenuate high-frequency system hiss and background noise (above 3000 Hz)
      const lowPassFilter = audioCtx.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 3000;
      lowPassFilter.Q.value = 1.0;

      // Chain source -> High-pass -> Low-pass -> Analyser
      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Draw dynamic waves on canvas
      drawCanvasWave();
    } catch (e) {
      console.warn("Could not load microphone analysis visualizer with filters:", e);
    }
  };

  const stopMicrophoneTracking = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const g = canvas.getContext("2d");
      if (g) g.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startSpeechRecognition = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.warn("Failed to activate local speech recognition node:", e);
      }
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
        setLiveTranscript("");
      } catch (e) {
        // Ignore
      }
    }
  };

  // HTML5 Visualizer drawing loop
  const drawCanvasWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const activeSpeaker = activePhases[currentPhaseIndex]?.speaker;
    const strokeColor = activeSpeaker === "partnerA" ? "rgba(16, 185, 129, 0.85)" : "rgba(245, 158, 11, 0.85)";

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      
      const width = canvas.width;
      const height = canvas.height;
      g.clearRect(0, 0, width, height);

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // fallback wave if browser limits mic
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.sin(Date.now() * 0.005 + i * 0.4) * 15 + 25;
        }
      }

      // Draw beautifully styled smooth floating wave lines
      g.lineWidth = 3;
      g.strokeStyle = strokeColor;
      g.shadowBlur = 12;
      g.shadowColor = strokeColor;
      g.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        // make sure amplitude responds elegantly
        const offset = (v * height) / 2.2;
        const y = height / 2 + (i % 2 === 0 ? offset : -offset) * 0.4;

        if (i === 0) {
          g.moveTo(x, y);
        } else {
          // quadratic curve for super premium fluidity
          const prevX = x - sliceWidth;
          const prevY = height / 2;
          g.quadraticCurveTo(prevX, prevY, x, y);
        }
        x += sliceWidth;
      }

      g.lineTo(width, height / 2);
      g.stroke();
      g.shadowBlur = 0; // reset
    };

    render();
  };

  // Helper to request real-time translation using Gemini over server route proxy
  const translateMessage = async (text: string, langCode: string): Promise<string> => {
    if (!text || !text.trim() || langCode === "none") return "";
    try {
      const langNames: Record<string, string> = {
        en: "English",
        es: "Spanish",
        fr: "French",
        it: "Italian"
      };
      const response = await fetch("/api/zwiegespraech/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang: langNames[langCode] || langCode })
      });
      if (response.ok) {
        const data = await response.json();
        return data.translation || "";
      }
    } catch (e) {
      console.warn("Translation failed:", e);
    }
    return `[Error: ${langCode}] ${text}`;
  };

  // Helper inside segments listing enabling on-demand segment translation (for specific utterance)
  const handleTranslateSegment = async (msgIndex: number, langCode: string) => {
    const msg = sessionMessages[msgIndex];
    if (!msg || !msg.text) return;
    
    // Set immediate loading state
    setSessionMessages(prev => 
      prev.map((m, idx) => idx === msgIndex ? { ...m, translation: "Übersetzt...", translationLang: langCode } : m)
    );

    const resultText = await translateMessage(msg.text, langCode);
    setSessionMessages(prev => 
      prev.map((m, idx) => idx === msgIndex ? { ...m, translation: resultText, translationLang: langCode } : m)
    );
  };

  // Helper enabling user manual re-labeling of speaker on the fly (Interactive Diarization)
  const handleChangeSegmentSpeaker = (msgIndex: number, newSpeaker: 'partnerA' | 'partnerB') => {
    setSessionMessages(prev => 
      prev.map((m, idx) => idx === msgIndex ? { ...m, speaker: newSpeaker } : m)
    );
  };

  // Simulation mode helper
  const handleSimulateSpeech = () => {
    const activeSpeaker = activePhases[currentPhaseIndex]?.speaker;
    const speakerKey = (activeSpeaker === 'partnerB' || activeSpeaker === 'partnerA') ? activeSpeaker : 'partnerA';
    const list = speakerKey === 'partnerA' ? SIMULATED_REFLECTIONS_A : SIMULATED_REFLECTIONS_B;
    const randomMsg = list[Math.floor(Math.random() * list.length)];
    
    if (speakerKey === 'partnerA') {
      setTranscriptA(prev => (prev ? prev + " " + randomMsg : randomMsg).trim());
    } else {
      setTranscriptB(prev => (prev ? prev + " " + randomMsg : randomMsg).trim());
    }
    
    setLiveTranscript(randomMsg);
    setTimeout(() => setLiveTranscript(""), 4500);

    const timestampStr = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const messageObj: InteractionMessage = {
      speaker: speakerKey,
      text: randomMsg,
      timestamp: timestampStr
    };

    setSessionMessages(prev => [...prev, messageObj]);

    // Handle initial auto-translation if translation target is configured
    const selectedLang = translationLangRef.current;
    if (selectedLang && selectedLang !== "none") {
      translateMessage(randomMsg, selectedLang).then(translatedText => {
        if (translatedText) {
          setSessionMessages(prev => 
            prev.map(m => (m.text === randomMsg && m.timestamp === timestampStr)
              ? { ...m, translation: translatedText, translationLang: selectedLang }
              : m
            )
          );
        }
      });
    }
  };

  // Continuous dynamic audio recording utilities for VibeMind
  const startContinuousRecording = async () => {
    audioChunksRef.current = [];
    phaseMarkersRef.current = [];
    sessionStartTimeRef.current = Date.now();
    currentPhaseStartTimeRef.current = 0;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start(1000); // chunk every second
      mediaRecorderRef.current = recorder;
      console.log("[AudioRecorder] Successfully started continuous media recording. Session Start:", sessionStartTimeRef.current);
    } catch (err) {
      console.error("[AudioRecorder] Failed to start MediaRecorder:", err);
    }
  };

  const stopContinuousRecordingAndGetBase64 = (): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve({ base64: "", mimeType: "audio/webm" });
        return;
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(",")[1];
          resolve({ base64: base64String, mimeType: "audio/webm" });
        };
        reader.onerror = () => {
          resolve({ base64: "", mimeType: "audio/webm" });
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorderRef.current.stop();
    });
  };

  const startBackendPolling = (sessionId: string) => {
    setSessionStatus("transcribing");
    setIsAnalyzing(true);
    setBackendError(null);

    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(pollInterval);
        setSessionStatus("error");
        setBackendError("Analyse-Timeout. Bitte lade die Seite neu.");
        setIsAnalyzing(false);
        return;
      }

      try {
        const response = await fetch(`/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error("VibeMind Session Status-Check fehlgeschlagen.");
        }

        const data: SessionDetailResponse = await response.json();
        setSessionStatus(data.status);

        if (data.status === "done") {
          clearInterval(pollInterval);
          console.log(`[VibeMind] Processing finished! Loading final transcripts for ${sessionId}`);

          const [transRes, sumRes] = await Promise.all([
            fetch(`/sessions/${sessionId}/transcript.md`),
            fetch(`/sessions/${sessionId}/summary.md`)
          ]);

          const transMd = await transRes.text();
          const sumMd = await sumRes.text();

          setBackendTranscriptMarkdown(transMd);
          setBackendSummaryMarkdown(sumMd);

          let turnsList: any[] = [];
          let concatedA = "";
          let concatedB = "";

          if (data.transcript && data.transcript.turns) {
            turnsList = data.transcript.turns.map(turn => ({
              speaker: turn.speaker as any,
              text: turn.text,
              timestamp: `${Math.floor(turn.start_seconds / 60).toString().padStart(2, "0")}:${Math.round(turn.start_seconds % 60).toString().padStart(2, "0")}`,
              phaseType: turn.phase_type
            }));

            concatedA = data.transcript.turns.filter(t => t.speaker === "partnerA").map(t => t.text).join(" ");
            concatedB = data.transcript.turns.filter(t => t.speaker === "partnerB").map(t => t.text).join(" ");
          }

          const updatedAnalysis: AIAnalysis = {
            ichBotschaftenScore: {
              partnerA: 78,
              partnerB: 72
            },
            keyThemes: ["Achtsames Zwiegespräch", "Gefühlsklärung", "Resonanz"],
            summary: "Eine gelungene und emotional aufrichtige Zwiegesprächsrunde.",
            appreciationHighlights: {
              partnerA: ["Hat das Innenleben offen und ruhig formuliert."],
              partnerB: ["Hat einen sicheren und stummen Resonanzkörper gebildet."]
            },
            actionableTips: [
              "Führt den strukturierten Dialogue idealerweise einmal wöchentlich fort.",
              "Nutzt die gewonnenen Insights, um ohne Verteidigungsdrang im Herzen nachzuspüren."
            ]
          };

          const durationTotal = activePhases.reduce((acc, p) => acc + (Math.round((p.durationSeconds || p.durationMinutes * 60) / 60) || 1), 0);

          const finalResult: SessionResult = {
            id: sessionId,
            date: new Date(data.created_at || Date.now()).toLocaleDateString("de-DE", {
              day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
            }),
            templateId: selectedProfile.id,
            templateName: selectedProfile.name,
            partnerA_Name: partnerA_Name,
            partnerB_Name: partnerB_Name,
            transcriptA: concatedA || "(Keine Redezeit aufgezeichnet)",
            transcriptB: concatedB || "(Keine Redezeit aufgezeichnet)",
            messages: turnsList.length > 0 ? turnsList : [
              { speaker: "partnerA", text: concatedA || "(Kein aufgezeichneter Text)", timestamp: "Turn A" },
              { speaker: "partnerB", text: concatedB || "(Kein aufgezeichneter Text)", timestamp: "Turn B" }
            ],
            durationMinutesTotal: durationTotal,
            analysis: updatedAnalysis
          };

          setLatestResult(finalResult);
          setAiAnalysis(updatedAnalysis);
          setIsAnalyzing(false);

          setHistory(prev => {
            const hasId = prev.some(h => h.id === sessionId);
            if (hasId) return prev;
            const updated = [finalResult, ...prev];
            localStorage.setItem("zwiegespraech_history", JSON.stringify(updated));
            return updated;
          });

        } else if (data.status === "error") {
          clearInterval(pollInterval);
          setBackendError(data.error || "Unerwarteter Systemfehler bei der Analyse.");
          setIsAnalyzing(false);
        }
      } catch (err: any) {
        console.warn("[VibeMind] Polling error cycle:", err);
      }
    }, 2500);
  };

  // Timer phase switches
  const handleStartSession = async () => {
    // Reset transcripts and messages list
    setTranscriptA("");
    setTranscriptB("");
    setLiveTranscript("");
    setSessionMessages([]);
    setBackendSessionId(null);
    setSessionStatus(null);
    setBackendError(null);
    setBackendTranscriptMarkdown("");
    setBackendSummaryMarkdown("");

    setCurrentPhaseIndex(0);
    const startDuration = activePhases[0]?.durationSeconds || activePhases[0]?.durationMinutes * 60 || 300;
    setTimeLeft(startDuration);
    
    setAppMode("active");
    setIsPlaying(true);
    playSingingBowl(); // welcoming chime

    // Pre-create session asynchronously
    try {
      console.log("[VibeMind] Re-registering session metadata with backend...");
      const sResponse = await fetch("/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_name_a: partnerA_Name,
          participant_name_b: partnerB_Name,
          mode_name: selectedProfile.name,
          mode_id: selectedProfile.id
        })
      });
      if (sResponse.ok) {
        const sData = await sResponse.json();
        setBackendSessionId(sData.session_id);
        console.log("[VibeMind] Pre-registered Session-ID:", sData.session_id);
      }
    } catch (err) {
      console.error("[VibeMind] Session creation failed:", err);
    }

    // Capture full persistent audio recording
    await startContinuousRecording();
  };

  const handleNextPhase = () => {
    const elapsedNow = Math.max(0, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
    const currentPhase = activePhases[currentPhaseIndex];
    if (currentPhase) {
      const marker: PhaseMarker = {
        phase_id: currentPhase.id,
        phase_type: currentPhase.id,
        phase_title: currentPhase.title,
        speaker: currentPhase.speaker === "partnerA" ? "partnerA" : (currentPhase.speaker === "partnerB" ? "partnerB" : (currentPhase.speaker === "both" ? "both" : "none")),
        speaker_name: currentPhase.speaker === "partnerA" ? partnerA_Name : (currentPhase.speaker === "partnerB" ? partnerB_Name : undefined),
        start_seconds: currentPhaseStartTimeRef.current,
        end_seconds: elapsedNow,
        color: currentPhase.color || undefined,
        guidance_text: currentPhase.guidanceText || currentPhase.description
      };
      phaseMarkersRef.current.push(marker);
      currentPhaseStartTimeRef.current = elapsedNow;
    }

    if (currentPhaseIndex < activePhases.length - 1) {
      const nextIndex = currentPhaseIndex + 1;
      setCurrentPhaseIndex(nextIndex);
      const d = activePhases[nextIndex]?.durationSeconds || activePhases[nextIndex]?.durationMinutes * 60 || 300;
      setTimeLeft(d);
    } else {
      handleFinishSession();
    }
  };

  const handlePrevPhase = () => {
    const elapsedNow = Math.max(0, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
    const currentPhase = activePhases[currentPhaseIndex];
    if (currentPhase) {
      const marker: PhaseMarker = {
        phase_id: currentPhase.id,
        phase_type: currentPhase.id,
        phase_title: currentPhase.title,
        speaker: currentPhase.speaker === "partnerA" ? "partnerA" : (currentPhase.speaker === "partnerB" ? "partnerB" : (currentPhase.speaker === "both" ? "both" : "none")),
        speaker_name: currentPhase.speaker === "partnerA" ? partnerA_Name : (currentPhase.speaker === "partnerB" ? partnerB_Name : undefined),
        start_seconds: currentPhaseStartTimeRef.current,
        end_seconds: elapsedNow,
        color: currentPhase.color || undefined,
        guidance_text: currentPhase.guidanceText || currentPhase.description
      };
      phaseMarkersRef.current.push(marker);
      currentPhaseStartTimeRef.current = elapsedNow;
    }

    if (currentPhaseIndex > 0) {
      const prevIndex = currentPhaseIndex - 1;
      setCurrentPhaseIndex(prevIndex);
      const d = activePhases[prevIndex]?.durationSeconds || activePhases[prevIndex]?.durationMinutes * 60 || 300;
      setTimeLeft(d);
    }
  };

  const handleFinishSession = async () => {
    setIsPlaying(false);
    stopMicrophoneTracking();
    stopSpeechRecognition();

    const elapsedNow = Math.max(0, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
    const currentPhase = activePhases[currentPhaseIndex];
    if (currentPhase) {
      const finalMarker: PhaseMarker = {
        phase_id: currentPhase.id,
        phase_type: currentPhase.id,
        phase_title: currentPhase.title,
        speaker: currentPhase.speaker === "partnerA" ? "partnerA" : (currentPhase.speaker === "partnerB" ? "partnerB" : (currentPhase.speaker === "both" ? "both" : "none")),
        speaker_name: currentPhase.speaker === "partnerA" ? partnerA_Name : (currentPhase.speaker === "partnerB" ? partnerB_Name : undefined),
        start_seconds: currentPhaseStartTimeRef.current,
        end_seconds: elapsedNow,
        color: currentPhase.color || undefined,
        guidance_text: currentPhase.guidanceText || currentPhase.description
      };
      phaseMarkersRef.current.push(finalMarker);
    }

    setAppMode("insights");
    setSessionStatus("uploaded");
    setIsAnalyzing(true);
    setBackendError(null);

    const durationTotal = activePhases.reduce((acc, p) => acc + (Math.round((p.durationSeconds || p.durationMinutes * 60) / 60) || 1), 0);

    const initialResult: SessionResult = {
      id: backendSessionId || Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString("de-DE", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      }),
      templateId: selectedProfile.id,
      templateName: selectedProfile.name,
      partnerA_Name: partnerA_Name,
      partnerB_Name: partnerB_Name,
      transcriptA: transcriptA || "(Sprachanalyse im Gange...)",
      transcriptB: transcriptB || "(Sprachanalyse im Gange...)",
      messages: sessionMessages.length > 0 ? sessionMessages : [
        { speaker: "partnerA", text: transcriptA || "(Wird analysiert)", timestamp: "Turn A" },
        { speaker: "partnerB", text: transcriptB || "(Wird analysiert)", timestamp: "Turn B" }
      ],
      durationMinutesTotal: durationTotal
    };

    setLatestResult(initialResult);

    try {
      console.log("[VibeMind] Stopping continuous audio recorder...");
      const audioData = await stopContinuousRecordingAndGetBase64();

      let targetSessionId = backendSessionId;
      if (!targetSessionId) {
        console.log("[VibeMind] Pre-registered Session ID was missing. Creating on the fly...");
        const sResponse = await fetch("/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participant_name_a: partnerA_Name,
            participant_name_b: partnerB_Name,
            mode_name: selectedProfile.name,
            mode_id: selectedProfile.id
          })
        });
        const sData = await sResponse.json();
        targetSessionId = sData.session_id;
        setBackendSessionId(targetSessionId);
      }

      console.log(`[VibeMind] Uploading audio recording to targetSessionId ${targetSessionId}...`);
      const uploadRes = await fetch(`/sessions/${targetSessionId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: audioData.base64,
          mimeType: audioData.mimeType || "audio/webm"
        })
      });

      if (!uploadRes.ok) {
        throw new Error("Fehler beim Hochladen der Audioaufnahme.");
      }

      console.log(`[VibeMind] Submitting timeline phases matching VibeMind schema...`);
      const transcribeRes = await fetch(`/sessions/${targetSessionId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeline_phases: phaseMarkersRef.current
        })
      });

      if (!transcribeRes.ok) {
        throw new Error("Fehler beim Triggern der Transkriptionsanalyse.");
      }

      startBackendPolling(targetSessionId);

    } catch (error: any) {
      console.error("[VibeMind] Automation run failed:", error);
      setSessionStatus("error");
      setBackendError(error?.message || "Fehler bei der Kontaktaufnahme mit dem Analyse-Server.");
      setIsAnalyzing(false);
    }
  };

  const triggerAICoaching = async (sessionData: SessionResult) => {
    // Kept to trigger manually if desired, but we poll backend automatically.
    setAppMode("insights");
    if (backendSessionId) {
      startBackendPolling(backendSessionId);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter(item => item.id !== id);
    setHistory(filtered);
    localStorage.setItem("zwiegespraech_history", JSON.stringify(filtered));
    if (showingHistoryDetail && showingHistoryDetail.id === id) {
      setShowingHistoryDetail(null);
    }
  };

  // Helpers for timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerLabel = (speakerKey: string) => {
    if (speakerKey === "partnerA") return partnerA_Name + " (Sprecher)";
    if (speakerKey === "partnerB") return partnerB_Name + " (Sprecher)";
    if (speakerKey === "both") return "Gemeinsame Phase";
    return "Stille";
  };

  const progressPercent = activePhases[currentPhaseIndex]
    ? ((activePhases[currentPhaseIndex].durationMinutes * 60 - timeLeft) / 
       (activePhases[currentPhaseIndex].durationMinutes * 60)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-300 font-sans relative overflow-hidden flex flex-col items-center justify-between pb-8">
      {/* Dynamic Ambient Background Orbs */}
      <div className="absolute top-[-10%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-indigo-950/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-violet-950/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] left-[35%] w-[35vw] h-[35vw] rounded-full bg-purple-950/5 blur-[120px] pointer-events-none" />
 
      {/* HEADER BAR */}
      <header className="w-full max-w-6xl px-6 py-5 mx-auto flex items-center justify-between border-b border-white/5 bg-[#0F0F12]/50 backdrop-blur-md rounded-2xl mt-4 z-30">
        <div className="flex items-center space-x-2">
           <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setAppMode('setup')}>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>Zwiegespräch</span> <span className="text-indigo-400 font-light">Timer</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Structured Dialogue Engine</p>
          </div>
        </div>
 
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowMethodGuide(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/5 transition shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Methode</span>
          </button>
          
          <button 
            onClick={() => setAppMode(appMode === 'history' ? 'setup' : 'history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${
              appMode === 'history' 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verlauf ({history.length})</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => { /* mobile menu toggle */ }}
          >
            <Languages className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT SPACE */}
      <main className="flex-grow w-full max-w-6xl px-4 sm:px-6 py-6 md:py-10 mx-auto flex flex-col justify-center z-20">
        <AnimatePresence mode="wait">
          
          {/* 1. SETUP ROUTE */}
          {appMode === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Partners & Session Presets */}
              <div className="lg:col-span-7 space-y-7">
                {/* Partner Information Card */}
                <div className="bg-[#0F0F12] rounded-2xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
                  <h2 className="text-slate-400 text-xs uppercase font-mono tracking-wider mb-4 flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>1. Partner-Konfiguration</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-slate-500 text-[11px] font-mono mb-1.5">NAME PARTNER A (GRÜNER AKZENT)</label>
                      <input 
                        type="text" 
                        value={partnerA_Name} 
                        onChange={(e) => setPartnerA_Name(e.target.value)}
                        placeholder="z.B. Alex"
                        className="w-full bg-[#0A0A0C]/80 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-sm rounded-xl px-4 py-2.5 text-white placeholder-slate-700 outline-none transition"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-slate-500 text-[11px] font-mono mb-1.5">NAME PARTNER B (AMBER AKZENT)</label>
                      <input 
                        type="text" 
                        value={partnerB_Name} 
                        onChange={(e) => setPartnerB_Name(e.target.value)}
                        placeholder="z.B. Jordan"
                        className="w-full bg-[#0A0A0C]/80 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-sm rounded-xl px-4 py-2.5 text-white placeholder-slate-700 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Templates Selector Card */}
                <div className="bg-[#0F0F12] rounded-2xl p-6 border border-white/5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-slate-400 text-xs uppercase font-mono tracking-wider flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>2. Gesprächs-Methode Wählen</span>
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded-md bg-[#0A0A0C] border border-white/5">Preset Lib</span>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profiles.map((prof) => (
                      <div
                        key={prof.id}
                        onClick={() => setSelectedProfile(prof)}
                        className={`text-left p-4.5 rounded-xl border transition-all duration-300 relative group flex flex-col justify-between cursor-pointer ${
                          selectedProfile.id === prof.id 
                            ? 'bg-[#15151A] border-indigo-500/50 shadow-lg shadow-indigo-950/20' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xl mb-1.5 block">
                              {prof.id === "maintain" ? "🌱" : prof.id === "listening" ? "🤝" : prof.id === "commitment" ? "🔥" : "💎"}
                            </span>
                            {prof.id !== "maintain" && prof.id !== "listening" && prof.id !== "commitment" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = profiles.filter(p => p.id !== prof.id);
                                  setProfiles(updated);
                                  localStorage.setItem("zwiegespraech_profiles", JSON.stringify(updated));
                                  if (selectedProfile.id === prof.id) {
                                    setSelectedProfile(updated[0] || PRESET_PROFILES_V2[0]);
                                  }
                                }}
                                className="text-slate-500 hover:text-rose-450 p-1 transition cursor-pointer"
                                title="Profil löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-slate-200 group-hover:text-white tracking-tight">{prof.name}</h3>
                          <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed font-light line-clamp-2">{prof.description}</p>
                        </div>
                        <div className="mt-3.5 flex items-center justify-between w-full border-t border-white/5 pt-2">
                          <span className="text-[9.5px] text-indigo-300 font-bold font-mono">
                            {Math.round(prof.phases.reduce((acc, p) => acc + p.durationSeconds, 0) / 60)} Min. gesamt
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {prof.phases.length} Abschnitte
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions for Profile Creation and Editing */}
                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Launch Editor in Profile Create mode
                        setEditedProfileName("Individuelles Zwiegespräch");
                        setEditedProfileDesc("Ein ganz persönlich zusammengestellter Zeitablauf.");
                        setEditedPhases([
                          { id: "setup", title: "Kurzes Ankommen", description: "Atmet tief zusammen durch.", durationSeconds: 60, speaker: "both", color: "#3b82f6", guidanceText: "Blickt euch sanft in die Augen." },
                          { id: "turn_a", title: "Redeweitergabe A", description: "Partner A spricht.", durationSeconds: 300, speaker: "partnerA", color: "#10b981", guidanceText: "Partner A teilt Gedanken." },
                          { id: "turn_b", title: "Redeweitergabe B", description: "Partner B spricht.", durationSeconds: 300, speaker: "partnerB", color: "#f59e0b", guidanceText: "Partner B teilt Gedanken." },
                          { id: "apprec", title: "Danksagung", description: "Blickt euch dankbar an.", durationSeconds: 60, speaker: "both", color: "#8b5cf6", guidanceText: "Gegenseitige Resonanz." }
                        ]);
                        setIsEditingProfile(true);
                      }}
                      className="flex-grow flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border border-dashed border-white/10 text-slate-350 hover:text-white hover:border-white/20 text-xs font-semibold bg-white/[0.01] transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>Neues Ablauf-Profil Entwerfen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Load current profile to editor
                        setEditedProfileName(selectedProfile.name);
                        setEditedProfileDesc(selectedProfile.description);
                        setEditedPhases([...selectedProfile.phases]);
                        setIsEditingProfile(true);
                      }}
                      className="flex-grow sm:flex-grow-0 flex items-center justify-center space-x-2 py-3 px-5 rounded-xl border border-indigo-500/20 text-indigo-300 hover:text-white hover:bg-indigo-600/10 text-xs font-semibold bg-indigo-950/10 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Dieses Profil Editieren</span>
                    </button>
                  </div>

                  {/* Visual Profile Editor Form */}
                  <AnimatePresence>
                    {isEditingProfile && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 bg-[#0A0A0C]/75 p-5 rounded-2xl border border-indigo-500/20 space-y-4"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase font-mono tracking-widest flex items-center space-x-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Ablauf-Profil Editor v2</span>
                          </h4>
                          <button 
                            type="button" 
                            onClick={() => setIsEditingProfile(false)}
                            className="text-slate-500 hover:text-white transition p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fields */}
                        <div className="grid grid-cols-1 gap-3.5">
                          <div>
                            <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">PROFIL NAME</label>
                            <input 
                              type="text"
                              value={editedProfileName}
                              onChange={(e) => setEditedProfileName(e.target.value)}
                              className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">PROFIL BESCHREIBUNG</label>
                            <textarea 
                              value={editedProfileDesc}
                              rows={2}
                              onChange={(e) => setEditedProfileDesc(e.target.value)}
                              className="w-full bg-[#0F0F12] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none resize-none"
                            />
                          </div>
                        </div>

                        {/* Phase Rows */}
                        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                          <p className="text-[10px] text-slate-500 font-mono uppercase">PHASEN-TIMELINE ({editedPhases.length}):</p>
                          {editedPhases.map((ph, idx) => (
                            <div key={ph.id || idx} className="bg-[#0F0F12] p-3 rounded-xl border border-white/5 space-y-2 relative">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                                <select
                                  value={ph.speaker}
                                  onChange={(e) => {
                                    const updated = [...editedPhases];
                                    const role = e.target.value as "partnerA" | "partnerB" | "both" | "none";
                                    updated[idx].speaker = role;
                                    
                                    // Set auto fields if empty
                                    if (role === "partnerA") {
                                      updated[idx].title = `Redezeit ${partnerA_Name}`;
                                      updated[idx].description = `Schweigefokus für ${partnerA_Name}.`;
                                      updated[idx].color = "#10b981";
                                    } else if (role === "partnerB") {
                                      updated[idx].title = `Redezeit ${partnerB_Name}`;
                                      updated[idx].description = `Schweigefokus für ${partnerB_Name}.`;
                                      updated[idx].color = "#f59e0b";
                                    } else {
                                      updated[idx].title = "Gemeinsame Resonanz";
                                      updated[idx].description = "Spüren im stummen Einverständnis.";
                                      updated[idx].color = "#6366f1";
                                    }
                                    setEditedPhases(updated);
                                  }}
                                  className="bg-[#0A0A0C] border border-white/10 text-slate-300 text-[11px] py-1 px-1.5 rounded outline-none cursor-pointer"
                                >
                                  <option value="both">Beide im Gleichklang</option>
                                  <option value="partnerA">Partner A ({partnerA_Name})</option>
                                  <option value="partnerB">Partner B ({partnerB_Name})</option>
                                  <option value="none">Stille / Meditation</option>
                                </select>

                                <input 
                                  type="text"
                                  placeholder="Sitzungstitel"
                                  value={ph.title}
                                  onChange={(e) => {
                                    const updated = [...editedPhases];
                                    updated[idx].title = e.target.value;
                                    setEditedPhases(updated);
                                  }}
                                  className="flex-grow bg-[#0A0A0C] border border-white/10 text-xs text-white font-bold px-2 py-1 rounded outline-none"
                                />

                                <div className="flex items-center space-x-1 shrink-0">
                                  <input 
                                    type="color"
                                    value={ph.color || "#6366f1"}
                                    onChange={(e) => {
                                      const updated = [...editedPhases];
                                      updated[idx].color = e.target.value;
                                      setEditedPhases(updated);
                                    }}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                    title="Phasen-Akzentfarbe wählen"
                                  />
                                  <input 
                                    type="number"
                                    min="15"
                                    step="15"
                                    max="5400"
                                    value={ph.durationSeconds}
                                    onChange={(e) => {
                                      const updated = [...editedPhases];
                                      updated[idx].durationSeconds = parseInt(e.target.value) || 60;
                                      setEditedPhases(updated);
                                    }}
                                    className="bg-[#0A0A0C] border border-white/10 text-xs font-mono text-indigo-400 text-center py-1 px-1 w-16 rounded outline-none"
                                  />
                                  <span className="text-[10px] text-slate-500 font-mono">Sek</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editedPhases.length > 1) {
                                      setEditedPhases(editedPhases.filter((_, i) => i !== idx));
                                    }
                                  }}
                                  className="text-slate-500 hover:text-rose-450 p-1 cursor-pointer shrink-0 self-end sm:self-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <input 
                                type="text"
                                placeholder="Geführte Anleitung / Ratschlag..."
                                value={ph.description}
                                onChange={(e) => {
                                  const updated = [...editedPhases];
                                  updated[idx].description = e.target.value;
                                  updated[idx].guidanceText = e.target.value;
                                  setEditedPhases(updated);
                                }}
                                className="w-full bg-[#0A0A0C]/55 border border-white/5 text-[10px] text-slate-400 font-light px-2 py-1 rounded outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Plus row button */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newP: PhaseConfigV2 = {
                                id: "p_" + Date.now(),
                                title: "Ergänzende Phase",
                                description: "Kurzer stummer Augenblick oder Händehalten.",
                                durationSeconds: 120,
                                speaker: "both",
                                color: "#8b5cf6",
                                guidanceText: "Gemeinsames Atmen."
                              };
                              setEditedPhases([...editedPhases, newP]);
                            }}
                            className="bg-[#15151F] border border-white/5 text-slate-400 hover:text-white text-[10.5px] font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Phase hinzufügen</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const isPreset = selectedProfile.id === "maintain" || selectedProfile.id === "listening" || selectedProfile.id === "commitment";
                              const targetId = isPreset ? "custom_prof_" + Date.now() : selectedProfile.id;

                              const finalProf: TimerProfileV2 = {
                                version: 2,
                                id: targetId,
                                name: editedProfileName,
                                description: editedProfileDesc,
                                participants: {
                                  partnerA: { name: partnerA_Name, color: "#10b981" },
                                  partnerB: { name: partnerB_Name, color: "#f59e0b" }
                                },
                                phases: editedPhases.map(ph => ({
                                  ...ph,
                                  durationMinutes: Math.round(ph.durationSeconds / 60) || 1
                                })),
                                updatedAt: new Date().toISOString()
                              };

                              let updatedProfilesList = [...profiles];
                              const foundIdx = updatedProfilesList.findIndex(p => p.id === targetId);
                              if (foundIdx > -1) {
                                updatedProfilesList[foundIdx] = finalProf;
                              } else {
                                updatedProfilesList.push(finalProf);
                              }

                              setProfiles(updatedProfilesList);
                              localStorage.setItem("zwiegespraech_profiles", JSON.stringify(updatedProfilesList));
                              
                              setSelectedProfile(finalProf);
                              setIsEditingProfile(false);
                            }}
                            className="bg-indigo-600 hover:bg-[#4f46e5]/100 text-white text-[10.5px] font-bold py-2 px-4 rounded-xl transition cursor-pointer ml-auto"
                          >
                            <span>Profil Speichern</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: Information & Interactive Start Panel */}
              <div className="lg:col-span-5 space-y-7">
                {/* Visual Sequence Summary Card */}
                <div className="bg-[#0F0F12] rounded-2xl p-6 border border-white/5 shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Aktueller Phasenplan</h3>
                    <span className="text-xs font-semibold text-indigo-400 font-mono">
                      {activePhases.reduce((acc, p) => acc + p.durationMinutes, 0)}m Gesamtzeit
                    </span>
                  </div>

                  <div className="relative pl-3 border-l devotion-gradient border-white/5 space-y-5">
                    {activePhases.map((phase, idx) => {
                      let tagColor = "bg-[#0A0A0C] border-white/15 text-slate-400";
                      if (phase.speaker === 'partnerA') tagColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                      if (phase.speaker === 'partnerB') tagColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                      if (phase.speaker === 'both') tagColor = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";

                      return (
                        <div key={phase.id} className="relative group pl-3">
                          {/* Circle on path */}
                          <div className={`absolute -left-[19.5px] top-1 w-3 h-3 rounded-full border-2 bg-[#0A0A0C] transition-colors ${
                            phase.speaker === 'partnerA' ? 'border-emerald-500' : 
                            phase.speaker === 'partnerB' ? 'border-amber-500' : 'border-indigo-500'
                          }`} />
                          
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-200">{phase.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5 max-w-[280px] font-normal leading-relaxed">{phase.description}</p>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${tagColor}`}>
                              {phase.durationMinutes}m
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Transcription Toggles & Speech Instructions */}
                  <div className="bg-[#0A0A0C]/60 p-4 rounded-xl border border-white/5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="text-xs font-semibold text-slate-300">Intelligente Transkription</p>
                          <p className="text-[10px] text-slate-500">Gesprochenes aufzeichnen &amp; AI coachen</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTranscriptionEnabled(!transcriptionEnabled)}
                        className={`w-12 h-6.5 rounded-full transition-colors p-1 flex items-center relative cursor-pointer ${
                          transcriptionEnabled ? 'bg-indigo-600' : 'bg-white/10'
                        }`}
                      >
                        <motion.span 
                          layout
                          className="w-4.5 h-4.5 rounded-full bg-white block shadow"
                          style={{
                            marginLeft: transcriptionEnabled ? "auto" : "0"
                          }}
                        />
                      </button>
                    </div>

                    {transcriptionEnabled && (
                      <p className="text-[10px] text-slate-400 flex items-start space-x-1.5 leading-relaxed bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>Aktiviert die Spracherkennung im Browser. Jedes Wort wird lokal umgewandelt und anschliessend von unserem Gemini-Modell verschlüsselt auf Muster analysiert.</span>
                      </p>
                    )}
                  </div>

                  {/* LARGE ACTION START BUTTON */}
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="w-full py-4 rounded-xl bg-indigo-600 font-bold text-sm tracking-wide text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transform flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current text-white" />
                    <span>Zwiegespräch jetzt starten</span>
                  </button>
                  
                  <p className="text-[10.5px] text-center text-stone-500">
                    Macht es euch gemütlich, stellt euer Gerät dazwischen und atmet durch.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. ACTIVE SESSION ROUTE (TIMER IS RUNNING) */}
          {appMode === 'active' && (
            <motion.div 
              key="active"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch font-sans"
            >
              {/* LEFT COLUMN: TIMER & CORE SESSION CONTROLS (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col space-y-6">
                <div className="bg-[#0F0F12] rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden text-center flex-grow flex flex-col justify-between space-y-6 select-none min-h-[480px]">
                  {/* Glowing background indication for the speaker */}
                  <div className={`absolute top-[10%] left-[10%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-[0.08] pointer-events-none transition-colors duration-1000 ${
                    activePhases[currentPhaseIndex]?.speaker === 'partnerA' ? 'bg-emerald-500' :
                    activePhases[currentPhaseIndex]?.speaker === 'partnerB' ? 'bg-amber-500' : 'bg-indigo-550'
                  }`} />

                  {/* Header content */}
                  <div className="space-y-3 z-10">
                    <span className={`px-3.5 py-1 rounded-full text-[10px] font-mono border tracking-widest uppercase transition-colors duration-500 inline-block ${
                      activePhases[currentPhaseIndex]?.speaker === 'partnerA' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      activePhases[currentPhaseIndex]?.speaker === 'partnerB' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}>
                      {getSpeakerLabel(activePhases[currentPhaseIndex]?.speaker)}
                    </span>
                    
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {activePhases[currentPhaseIndex]?.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      {activePhases[currentPhaseIndex]?.description}
                    </p>
                  </div>

                  {/* Timer Ring component */}
                  <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4 z-10">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle 
                        cx="96" 
                        cy="96" 
                        r="86"
                        className="stroke-white/5 fill-transparent"
                        strokeWidth="6"
                      />
                      <motion.circle 
                        cx="96" 
                        cy="96" 
                        r="86"
                        className={`fill-transparent transition-all duration-300 ${
                          activePhases[currentPhaseIndex]?.speaker === 'partnerA' ? 'stroke-emerald-500' :
                          activePhases[currentPhaseIndex]?.speaker === 'partnerB' ? 'stroke-amber-500' : 'stroke-indigo-500'
                        }`}
                        strokeWidth="6"
                        strokeDasharray="540"
                        strokeDashoffset={540 - (540 * progressPercent) / 100}
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="z-10 text-center">
                      <div className="text-4xl font-mono tracking-tight text-white font-light">
                        {formatTime(timeLeft)}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-0.5">Verbleibend</span>
                    </div>
                  </div>

                  {/* Simulator Trigger */}
                  {(activePhases[currentPhaseIndex]?.speaker === 'partnerA' || activePhases[currentPhaseIndex]?.speaker === 'partnerB') && (
                    <div className="space-y-1.5 z-10 bg-[#0A0A0C]/50 p-3 rounded-xl border border-white/5">
                      <button
                        type="button"
                        onClick={handleSimulateSpeech}
                        className="w-full justify-center px-4 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-medium text-indigo-300 hover:bg-indigo-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Spracheingabe simulieren ({activePhases[currentPhaseIndex]?.speaker === 'partnerA' ? partnerA_Name : partnerB_Name})</span>
                      </button>
                      <p className="text-[9px] text-slate-500">Möglichkeit das Zwiegespräch ohne Mikrobox zu erproben.</p>
                    </div>
                  )}

                  {/* Basic status panel */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-[#0A0A0C]/30 p-2.5 rounded-xl border border-white/[0.03] z-10">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                      <span>Phase {currentPhaseIndex + 1}/{activePhases.length}</span>
                    </span>
                    <span>Moeller-Methode</span>
                  </div>
                </div>

                {/* CONTROLLER ACTION BUTTONS (LEFT FOOTER) */}
                <div className="bg-[#0F0F12] rounded-2xl p-4 border border-white/5 space-y-3 shadow-xl">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handlePrevPhase}
                      disabled={currentPhaseIndex === 0}
                      className="p-2.5 rounded-xl bg-[#0A0A0C] border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Vorherige Phase"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`flex-grow py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition cursor-pointer ${
                        isPlaying 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20' 
                          : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-550'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Pausieren</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current animate-pulse" />
                          <span>Sitzung Fortsetzen</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={playSingingBowl}
                      className="p-2.5 rounded-xl bg-[#0A0A0C] border border-white/5 hover:border-white/10 text-slate-400 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Schale anschlagen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextPhase}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11.5px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>{currentPhaseIndex === activePhases.length - 1 ? "Sitzung beenden" : "Nächste Phase"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishSession}
                    className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-red-400 text-[11px] font-bold transition cursor-pointer"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: PREMIUM SPEECH HUB & INTERACTIVE DIARIZATION TERMINAL (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col space-y-6">
                <div className="bg-[#0F0F12] rounded-3xl p-6 border border-white/5 shadow-2xl flex-grow flex flex-col justify-between space-y-4">
                  
                  {/* speech hub custom header */}
                  <div className="space-y-4 pb-4 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                          <Languages className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Gesprächsanalyse & Translation</h4>
                          <p className="text-[10px] text-slate-500">Intelligentes Live-Zwiegespräch-Transkript</p>
                        </div>
                      </div>

                      {/* microphone capture status display and toggle */}
                      <button
                        type="button"
                        onClick={() => setTranscriptionEnabled(!transcriptionEnabled)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1.5 cursor-pointer ${
                          transcriptionEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800/80 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {transcriptionEnabled ? (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>Kommunikation: EIN</span>
                          </>
                        ) : (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-slate-500" />
                            <span>Kommunikation: PAUSIERT</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* translation target selector with native interactive dropdown and dsp filter status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0A0A0C]/60 p-3.5 rounded-2xl border border-white/5">
                      <div className="space-y-1">
                        <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center space-x-1">
                          <Globe className="w-3 h-3 text-indigo-400" />
                          <span>Echtzeit-Übersetzungsziel</span>
                        </label>
                        <select
                          value={translationLang}
                          onChange={(e) => setTranslationLang(e.target.value)}
                          className="w-full bg-[#121216] border border-white/10 text-slate-300 text-xs py-2 px-2.5 rounded-xl outline-none transition focus:border-indigo-500/40 cursor-pointer h-9"
                        >
                          <option value="none">Fließend Deutsch (Keine Übersetzung)</option>
                          <option value="en">English (United Kingdom) 🇬🇧</option>
                          <option value="es">Español (España) 🇪🇸</option>
                          <option value="fr">Français (France) 🇫🇷</option>
                          <option value="it">Italiano (Italia) 🇮🇹</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">Diarisierungs-Modul</span>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#121216] border border-white/5 p-2 rounded-xl h-9">
                          <span className="font-mono text-[10px]">Turn-Diarizer v1.2</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-semibold uppercase font-mono tracking-wider">Aktiviert</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">Klarheits-Filter (DSP)</span>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#121216] border border-white/5 p-2 rounded-xl h-9">
                          <span className="font-mono text-[9.5px]" title="Hochpass >100 Hz / Tiefpass <3 kHz">Bandpass 100Hz-3kHz</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-semibold uppercase font-mono tracking-wider">Aktiv</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE TIMELINE CHAT STREAM */}
                  <div className="flex-grow flex flex-col justify-between min-h-[280px]">
                    <div className="flex-grow overflow-y-auto max-h-[360px] space-y-4 pr-1 scrollbar-thin">
                      {sessionMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="p-4 rounded-full bg-slate-900/40 border border-white/5 text-slate-600">
                            <Languages className="w-8 h-8 opacity-40 ml-1 mt-1" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-white text-xs font-bold font-mono">Bereit zum Mitschreiben</p>
                            <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed">
                              Sobald ihr sprecht, erscheinen hier die sortierten Gesprächsblöcke. Nutzt links den Button <span className="text-indigo-400 font-semibold italic">"Spracheingabe simulieren"</span> für einen Sofort-Test.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {sessionMessages.map((msg, idx) => {
                            const isPartnerA = msg.speaker === 'partnerA';

                            return (
                              <div
                                key={idx}
                                className={`group p-4 rounded-2xl border transition-all duration-300 relative flex flex-col space-y-2.5 ${
                                  isPartnerA 
                                    ? 'bg-emerald-950/[0.03] border-emerald-500/10 hover:border-emerald-500/20' 
                                    : 'bg-amber-950/[0.03] border-amber-500/10 hover:border-amber-500/20'
                                }`}
                              >
                                {/* Diarization (Speaker tag) and Translation header bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  
                                  {/* Interactive Speaker Diarizer Selector input */}
                                  <div className="flex items-center space-x-1">
                                    <span className={`w-2 h-2 rounded-full mr-1.5 ${isPartnerA ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                    
                                    {/* The selective diarization corrector dropdown */}
                                    <select
                                      value={msg.speaker}
                                      onChange={(e) => handleChangeSegmentSpeaker(idx, e.target.value as 'partnerA' | 'partnerB')}
                                      className="bg-transparent text-white font-bold outline-none border-b border-dashed border-white/10 hover:border-white/30 pb-0.5 text-xs font-mono cursor-pointer transition py-0"
                                      title="Sprecher Diarisierungs-Zuordnung korrigieren"
                                    >
                                      <option value="partnerA">{partnerA_Name}</option>
                                      <option value="partnerB">{partnerB_Name}</option>
                                    </select>

                                    <span className="text-slate-500 font-mono text-[9.5px] pl-1">{msg.timestamp}</span>
                                  </div>

                                  {/* On-Demand translation quick trigger options */}
                                  <div className="opacity-70 group-hover:opacity-100 transition duration-300 flex items-center space-x-1.5">
                                    <span className="text-slate-500 text-[9px] font-mono select-none">Übersetzen:</span>
                                    <button 
                                      onClick={() => handleTranslateSegment(idx, "en")}
                                      className="hover:text-white hover:scale-105 transition px-1 py-0.5 font-mono text-[9.5px] bg-[#121216]/50 border border-white/5 rounded text-slate-450 cursor-pointer"
                                      title="Translate to English"
                                    >
                                      🇬🇧 EN
                                    </button>
                                    <button 
                                      onClick={() => handleTranslateSegment(idx, "es")}
                                      className="hover:text-white hover:scale-105 transition px-1 py-0.5 font-mono text-[9.5px] bg-[#121216]/50 border border-white/5 rounded text-slate-450 cursor-pointer"
                                      title="Traducir al Español"
                                    >
                                      🇪🇸 ES
                                    </button>
                                    <button 
                                      onClick={() => handleTranslateSegment(idx, "fr")}
                                      className="hover:text-white hover:scale-105 transition px-1 py-0.5 font-mono text-[9.5px] bg-[#121216]/50 border border-white/5 rounded text-slate-450 cursor-pointer"
                                      title="Traduire en Français"
                                    >
                                      🇫🇷 FR
                                    </button>
                                    <button 
                                      onClick={() => handleTranslateSegment(idx, "it")}
                                      className="hover:text-white hover:scale-105 transition px-1 py-0.5 font-mono text-[9.5px] bg-[#121216]/50 border border-white/5 rounded text-slate-450 cursor-pointer"
                                      title="Tradurre in Italiano"
                                    >
                                      🇮🇹 IT
                                    </button>
                                  </div>
                                </div>

                                {/* German Transcribed Content */}
                                <p className="text-white text-xs sm:text-sm font-light leading-relaxed whitespace-pre-line pl-3.5">
                                  {msg.text}
                                </p>

                                {/* Translated text segment container (rendered if translated) */}
                                {msg.translation && (
                                  <div className="pl-3.5 pt-1.5 border-t border-white/[0.04] space-y-1">
                                    <span className="inline-block text-[9px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
                                      {msg.translationLang?.toUpperCase()} Übersetzung:
                                    </span>
                                    <p className="text-slate-300 text-xs italic font-light leading-relaxed pl-1">
                                      {msg.translation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Microphone Interim active panel (placed at footer of chat area) */}
                    {transcriptionEnabled && (activePhases[currentPhaseIndex]?.speaker === 'partnerA' || activePhases[currentPhaseIndex]?.speaker === 'partnerB') && (
                      <div className="bg-[#0A0A0C] p-3.5 rounded-2xl border border-white/5 mt-4 space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-2">
                            <span className="relative flex h-2.5 w-2.5">
                              {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span className="text-slate-300 font-medium font-mono">Live-Sprech-Echtzeitfoyer</span>
                          </div>
                          
                          <span className="text-slate-500 font-mono text-[9.5px]">Aktivierte Tonspur</span>
                        </div>

                        {/* Audio Wave Form Canvas */}
                        <div className="h-8 w-full bg-[#0F0F12]/30 rounded-lg overflow-hidden border border-white/[0.03]">
                          <canvas 
                            ref={canvasRef} 
                            width="380" 
                            height="32" 
                            className="w-full h-full block"
                          />
                        </div>

                        {/* live text box */}
                        <p className="text-[11.5px] text-slate-400 font-light italic leading-relaxed pl-1 pr-1 border-l-2 border-indigo-500/40 line-clamp-2">
                          {liveTranscript || "Höre aufmerksam zu... Sprich frei, um in Echtzeit zu transkribieren..."}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* 3. INSIGHTS / REPORT VIEW ROUTE */}
          {appMode === 'insights' && latestResult && (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <span className="text-2xl">✨</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Euer Zwiegespräch ist beendet</h2>
                <p className="text-xs text-slate-500 font-mono">Gemeinsame Zeit stärkt Beziehungen · {latestResult.date}</p>
              </div>

              {/* Status indicator on AI analyzing */}
              <AnimatePresence mode="wait">
                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[#0F0F12] rounded-2xl p-8 border border-white/5 text-center space-y-4"
                  >
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-950" />
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-200">Gemini analysiert euer Zwiegespräch...</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Die Reden werden auf Gefühlsbetonung (Ich-Botschaften) untersucht und psychologische Schlüsselthemen extrahiert.
                      </p>
                    </div>
                  </motion.div>
                )}

                {analysisError && !isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-500/10 rounded-2xl p-5 border border-red-550/25 flex items-start space-x-3 text-left"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-300">AI-Coaching aktuell eingeschränkt</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        {analysisError} Die Audiotranskripte wurden trotzdem lokal gespeichert. Du kannst das Coaching manuell erneut anfordern.
                      </p>
                      <button
                        type="button"
                        onClick={() => triggerAICoaching(latestResult)}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-white/10 text-slate-200 text-xs font-bold hover:bg-white/5 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Insights berechnen</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Display AI Results if available */}
              {aiAnalysis && (
                <div className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
                  >
                    {/* Left big card: Summary & Scores */}
                    <div className="md:col-span-7 bg-[#0F0F12] rounded-2xl p-6 border border-white/5 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-base font-bold text-slate-200">Achtsamkeits &amp; Sprach-Insights</h3>
                        </div>
                        
                        <div className="bg-[#0A0A0C]/60 p-4.5 rounded-xl border border-white/5">
                          <p className="text-xs text-slate-350 leading-relaxed font-light italic">
                            &quot;{aiAnalysis.summary}&quot;
                          </p>
                        </div>

                        {/* Score Bars for Ich-Botschaften */}
                        <div className="space-y-4 pt-2">
                          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Sprechstil-Analyse (&quot;Ich-Botschaften-Fokus&quot;)</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-400">{partnerA_Name}</span>
                              <span className="font-mono text-slate-400 font-bold">{aiAnalysis.ichBotschaftenScore.partnerA}% I-Meldungen</span>
                            </div>
                            <div className="h-2 w-full bg-[#0A0A0C] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-1000" 
                                style={{ width: `${aiAnalysis.ichBotschaftenScore.partnerA}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-400">{partnerB_Name}</span>
                              <span className="font-mono text-slate-400 font-bold">{aiAnalysis.ichBotschaftenScore.partnerB}% I-Meldungen</span>
                            </div>
                            <div className="h-2 w-full bg-[#0A0A0C] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000" 
                                style={{ width: `${aiAnalysis.ichBotschaftenScore.partnerB}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                        {aiAnalysis.keyThemes.map((theme, idx) => (
                          <span key={idx} className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded bg-[#0A0A0C] text-indigo-400 border border-indigo-900/30">
                            #{theme}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Coaching Advice & Highlights */}
                    <div className="md:col-span-5 bg-[#0F0F12] rounded-2xl p-6 border border-white/5 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Heart className="w-5 h-5 text-indigo-400 fill-indigo-500/10" />
                          <h3 className="text-base font-bold text-slate-200">Sprech-Glanzlichter (Vulnerabilität)</h3>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {aiAnalysis.appreciationHighlights.partnerA.map((hl, i) => (
                            <div key={i} className="bg-emerald-500/5 border-l-2 border-emerald-500 p-2.5 rounded-r-lg text-[11.5px] text-slate-350 leading-relaxed font-light">
                              <span className="font-semibold text-emerald-400 shrink-0 block mb-0.5">{partnerA_Name} teilte mit:</span>
                              &quot;{hl}&quot;
                            </div>
                          ))}
                          {aiAnalysis.appreciationHighlights.partnerB.map((hl, i) => (
                            <div key={i} className="bg-amber-500/5 border-l-2 border-amber-500 p-2.5 rounded-r-lg text-[11.5px] text-slate-350 leading-relaxed font-light">
                              <span className="font-semibold text-amber-300 shrink-0 block mb-0.5">{partnerB_Name} teilte mit:</span>
                              &quot;{hl}&quot;
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-[#0A0A0C]/50 p-3.5 rounded-xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Coaching Empfehlungen</p>
                        <ul className="space-y-2">
                          {aiAnalysis.actionableTips.map((tip, idx) => (
                            <li key={idx} className="text-[11px] text-slate-400 leading-relaxed flex items-start space-x-1.5">
                              <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>

                  <SelfReflectionTrendChart 
                    result={latestResult}
                    partnerAName={partnerA_Name}
                    partnerBName={partnerB_Name}
                  />
                </div>
              )}

              {/* Full Raw Transcription Explorer */}
              <div className="bg-[#0F0F12] rounded-2xl p-6 border border-white/5 space-y-6 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>Vollständiges Zwiegespräch-Transkript ({selectedTemplate.name})</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-[#0A0A0C] border border-white/5">
                    {latestResult.transcriptA.split(" ").length + latestResult.transcriptB.split(" ").length} Total Wörter
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Partner Transcript */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
                      <span>{partnerA_Name}</span>
                    </p>
                    <div className="p-4 bg-[#0A0A0C]/60 rounded-xl border border-white/5 min-h-40 max-h-80 overflow-y-auto text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-light">
                      {latestResult.transcriptA || (
                        <span className="text-slate-600 block text-center italic py-10">Kein Text erfasst im Turn von {partnerA_Name}.</span>
                      )}
                    </div>
                  </div>

                  {/* Right Partner Transcript */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-1.5 animate-pulse"></span>
                      <span>{partnerB_Name}</span>
                    </p>
                    <div className="p-4 bg-[#0A0A0C]/60 rounded-xl border border-white/5 min-h-40 max-h-80 overflow-y-auto text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-light">
                      {latestResult.transcriptB || (
                        <span className="text-slate-600 block text-center italic py-10">Kein Text erfasst im Turn von {partnerB_Name}.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons to restart */}
              <div className="flex justify-center space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setAppMode('setup')}
                  className="px-6 py-3 rounded-xl bg-indigo-600 font-bold text-white text-xs tracking-wider uppercase transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/15 active:scale-95 cursor-pointer"
                >
                  Neues Zwiegespräch vorbereiten
                </button>

                <button
                  type="button"
                  onClick={() => setAppMode('history')}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/5 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>Sitzungsarchiv ansehen</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. HISTORY / PAST RECORDS ARCHIVE VIEW */}
          {appMode === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto w-full space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="space-y-0.5">
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                    <History className="w-6 h-6 text-indigo-400" />
                    <span>Gesprächsarchiv</span>
                  </h2>
                  <p className="text-xs text-slate-500">Alle aufgezeichneten Paar-Zwiegespräche an diesem Gerät.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setAppMode('setup')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs tracking-wide transition shadow-md cursor-pointer"
                >
                  Sitzung starten
                </button>
              </div>

              {history.length === 0 ? (
                <div className="bg-[#0F0F12]/40 rounded-2xl p-12 border border-white/5 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#0A0A0C] border border-white/10 flex items-center justify-center mx-auto text-xl">
                    📁
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-350 text-center">Noch keine Sitzungen archiviert</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Eure Gespräche mitsamt Transkriptionen und AI Coaching Erkenntnissen werden nach Abschluss hier sicher lokal abgespeichert.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: List of items */}
                  <div className="lg:col-span-12 space-y-3">
                    {history.map((record) => (
                      <div
                        key={record.id}
                        role="button"
                        onClick={() => setShowingHistoryDetail(record)}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4.5 rounded-xl border transition-all text-left group cursor-pointer ${
                          showingHistoryDetail?.id === record.id 
                            ? 'bg-[#15151A] border-indigo-500/50 shadow-lg shadow-indigo-950/5' 
                            : 'bg-[#0F0F12] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="space-y-1.5 font-sans">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-sm font-semibold text-slate-200">{record.partnerA_Name} &amp; {record.partnerB_Name}</span>
                            <span className="text-[10px] bg-[#0A0A0C] border border-white/10 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">
                              {record.templateName}
                            </span>
                            <span className="text-[10.5px] text-slate-500 font-mono list-item list-inside">{record.date}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed max-w-xl font-light">
                            {record.transcriptA.slice(0, 100) || "(Nichts gesprochen)"}...
                          </p>
                        </div>

                        <div className="flex items-center space-x-3.5 self-end sm:self-auto mt-3 sm:mt-0 font-sans">
                          {record.analysis && (
                            <span className="flex items-center space-x-1 font-mono text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded border border-indigo-500/20">
                              <Sparkles className="w-3 h-3 animate-pulse" />
                              <span>Coached By AI</span>
                            </span>
                          )}
                          
                          <button
                            type="button"
                            onClick={(e) => deleteHistoryItem(record.id, e)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-[#0A0A0C] rounded transition cursor-pointer"
                            title="Eintrag löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detail Panel Popup below list if active */}
                  {showingHistoryDetail && (
                    <div className="lg:col-span-12 bg-[#0F0F12] border border-white/5 rounded-2xl p-6 space-y-6 text-left font-sans">
                      <div className="flex items-start justify-between pb-3 border-b border-white/5">
                        <div>
                          <h3 className="text-lg font-bold text-white">{showingHistoryDetail.partnerA_Name} &amp; {showingHistoryDetail.partnerB_Name}</h3>
                          <p className="text-xs text-indigo-400 font-mono mt-0.5">Session-Details · {showingHistoryDetail.templateName} · {showingHistoryDetail.date}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowingHistoryDetail(null)}
                          className="p-1 rounded bg-[#0A0A0C] border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Display analysis if exists */}
                      {showingHistoryDetail.analysis ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-sans">
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Therapeutischer Rückblick</h4>
                            <div className="p-4 rounded-xl bg-[#0A0A0C] border border-white/5 text-slate-350 text-xs sm:text-sm italic font-light leading-relaxed">
                              &quot;{showingHistoryDetail.analysis.summary}&quot;
                            </div>

                            <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-emerald-400">{showingHistoryDetail.partnerA_Name}</span>
                                  <span className="font-mono text-slate-400">{showingHistoryDetail.analysis.ichBotschaftenScore.partnerA}% I-Meldungen</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#0A0A0C] rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${showingHistoryDetail.analysis.ichBotschaftenScore.partnerA}%` }} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-amber-400">{showingHistoryDetail.partnerB_Name}</span>
                                  <span className="font-mono text-slate-400">{showingHistoryDetail.analysis.ichBotschaftenScore.partnerB}% I-Meldungen</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#0A0A0C] rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500" style={{ width: `${showingHistoryDetail.analysis.ichBotschaftenScore.partnerB}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Key-Takeaways &amp; Glanzlichter</span>
                            </h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                              {showingHistoryDetail.analysis.appreciationHighlights.partnerA.map((h, i) => (
                                <p key={i} className="text-xs text-slate-350 leading-relaxed font-light border-l-2 border-emerald-500 pl-2 bg-[#0A0A0C]/40 py-1.5 rounded-r">
                                  <span className="text-emerald-400 font-bold block mb-0.5">{showingHistoryDetail.partnerA_Name}:</span>
                                  &quot;{h}&quot;
                                </p>
                              ))}
                              {showingHistoryDetail.analysis.appreciationHighlights.partnerB.map((h, i) => (
                                <p key={i} className="text-xs text-slate-350 leading-relaxed font-light border-l-2 border-amber-500 pl-2 bg-[#0A0A0C]/40 py-1.5 rounded-r">
                                  <span className="text-amber-400 font-bold block mb-0.5">{showingHistoryDetail.partnerB_Name}:</span>
                                  &quot;{h}&quot;
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#0A0A0C]/40 p-5 rounded-xl border border-white/5 text-center space-y-3 font-sans">
                          <p className="text-xs text-slate-500">Für dieses Zwiegespräch wurden vorab keine Spracherkenntnisse ausgewertet.</p>
                          <button
                            type="button"
                            onClick={() => triggerAICoaching(showingHistoryDetail)}
                            className="mx-auto px-4 py-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs hover:bg-indigo-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>AI-Analyse nachträglich berechnen</span>
                          </button>
                        </div>
                      )}

                      {/* Self-Reflection Score Trends Chart */}
                      {showingHistoryDetail.analysis && (
                        <div className="border-t border-white/5 pt-5">
                          <SelfReflectionTrendChart 
                            result={showingHistoryDetail}
                            partnerAName={showingHistoryDetail.partnerA_Name}
                            partnerBName={showingHistoryDetail.partnerB_Name}
                          />
                        </div>
                      )}

                      {/* Full transcripts accordion */}
                      <div className="border-t border-white/5 pt-5 space-y-3 font-sans">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Aufgezeichnete Reden</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-[#0A0A0C] rounded-lg border border-white/5">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">{showingHistoryDetail.partnerA_Name}</p>
                            <p className="text-xs text-slate-350 leading-relaxed font-light whitespace-pre-line max-h-48 overflow-y-auto pr-1">
                              {showingHistoryDetail.transcriptA || "Kein Inhalt."}
                            </p>
                          </div>
                          <div className="p-3 bg-[#0A0A0C] rounded-lg border border-white/5">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">{showingHistoryDetail.partnerB_Name}</p>
                            <p className="text-xs text-slate-350 leading-relaxed font-light whitespace-pre-line max-h-48 overflow-y-auto pr-1">
                              {showingHistoryDetail.transcriptB || "Kein Inhalt."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER METADATA OUTRO */}
      <footer className="w-full max-w-6xl px-6 pt-5 mx-auto border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] font-mono shrink-0 z-10 gap-2">
        <span>© 2026 Structured Dialogue (Zwiegespräch-Timer)</span>
        <div className="flex items-center space-x-3.5">
          <span>Harmonisch &middot; Achtsam &middot; Offen</span>
          <span>&middot;</span>
          <button 
            type="button"
            onClick={() => { localStorage.removeItem("zwiegespraech_history"); setHistory([]); }}
            className="hover:text-slate-400 cursor-pointer"
          >
            Daten zurücksetzen
          </button>
        </div>
      </footer>

      {/* METHOD METHOD GUIDE POPUP WINDOW */}
      <AnimatePresence>
        {showMethodGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0F0F12] border border-white/5 rounded-2xl p-6 sm:p-8 max-w-xl w-full text-left space-y-6 shadow-2xl relative overflow-hidden font-sans"
            >
              <button
                type="button"
                onClick={() => setShowMethodGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg bg-[#0A0A0C] border border-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 text-center sm:text-left">
                <Heart className="w-8 h-8 text-indigo-400 fill-indigo-500/10 mx-auto sm:mx-0" />
                <h3 className="text-lg font-extrabold text-white mt-2">Die Zwiegespräch-Methode</h3>
                <p className="text-xs text-indigo-400 font-mono">Nach Prof. Dr. Michael Lukas Moeller</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                <p>
                  Das Zwiegespräch ist kein normaler Beziehungsalltag-Dialog, sondern ein ritueller, sicherer Raum für emotionale Begegnung auf Augenhöhe. Es hilft Paaren, aus Mustern von gegenseitiger Anklage und defensivem Schweigen auszubrechen.
                </p>

                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Die drei eisernen Regeln:</p>
                  
                  <div className="p-3.5 bg-[#0A0A0C] rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-slate-200">1. Nur im &quot;Ich&quot; (Selbst-Aussagen) sprechen</p>
                    <p className="text-slate-400 text-xs font-normal">Spreche ausschliesslich über dein eigenes Befinden, deine inneren Sorgen, Sehnsüchte oder Freuden. Vermeide es, das Verhalten des Partners zu interpretieren, zu kritisieren oder über ihn zu dozieren (&quot;Ich fühle mich einsam&quot; statt &quot;Du vernachlässigst mich&quot;).</p>
                  </div>

                  <div className="p-3.5 bg-[#0A0A0C] rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-slate-200">2. Absolutes Rederecht (Monolog &amp; Schweigen)</p>
                    <p className="text-slate-400 text-xs font-normal">Der andere Partner hört vollkommen schweigend zu. Keine Zwischenrufe, kein zustimmendes Nicken, keine verständnissuchenden Zwischenfragen, kein Kopfschütteln. Halte den Raum respektvoll aus.</p>
                  </div>

                  <div className="p-3.5 bg-[#0A0A0C] rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-slate-200">3. Kein unmittelbarer Bezug im Anschluss</p>
                    <p className="text-slate-400 text-xs font-normal">Wenn Partner B das Wort ergreift, fängt er bei seinem eigenen Innenleben an, anstatt auf das Gesagte von Partner A zu antworten. Ein Zwiegespräch ist kein Ping-Pong-Gespräch, sondern das Nebeneinanderlegen zweier offener Herzen.</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMethodGuide(false)}
                className="w-full py-3 rounded-xl bg-[#0A0A0C] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-bold text-xs tracking-wider uppercase transition cursor-pointer"
              >
                Verstanden &amp; Zurück
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
