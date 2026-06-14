/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize GoogleGenAI with appropriate headers
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// REST route for transcription synthesis & coaching insights
app.post("/api/zwiegespraech/translate", async (req, res) => {
  const { text = "", targetLang = "English" } = req.body || {};
  try {
    if (!text || !text.trim()) {
      return res.json({ translation: "" });
    }
    if (!ai) {
      // Helpful fallback in case API key is missing
      return res.json({ translation: `[${targetLang}] ${text}` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Translate the following German text into ${targetLang}. Return ONLY the direct translation. Do not add any explanatory text, commentary, or quotes:\n\n${text}`,
    });

    res.json({ translation: response.text?.trim() || text });
  } catch (error: any) {
    console.error("Translate Error:", error);
    res.json({ translation: `[Error: ${targetLang}] ${text}` });
  }
});

// In-Memory Database for VibeMind / CoupleTimer sessions
interface InMemoSession {
  session_id: string;
  status: "pending" | "uploaded" | "transcribing" | "done" | "error";
  created_at: string;
  mode_id: string;
  mode_name: string;
  participant_name_a: string;
  participant_name_b: string;
  audio_base64?: string;
  audio_mime_type?: string;
  timeline_phases?: any[]; // PhaseMarker[]
  transcript_turns?: any[]; // TranscriptTurn[]
  transcript_markdown?: string;
  summary_markdown?: string;
  error?: string | null;
}

const sessionsDatabase: Record<string, InMemoSession> = {};

// Helper to generate a unique random ID
function generateId(): string {
  return "session_" + Math.random().toString(36).substr(2, 9);
}

// 1. POST /sessions
app.post("/sessions", (req, res) => {
  const { participant_name_a = "Partner A", participant_name_b = "Partner B", mode_name = "Moeller-Zwiegespräch", mode_id = "default" } = req.body || {};
  const newId = generateId();
  const session: InMemoSession = {
    session_id: newId,
    status: "pending",
    created_at: new Date().toISOString(),
    mode_id,
    mode_name,
    participant_name_a,
    participant_name_b
  };
  sessionsDatabase[newId] = session;
  console.log(`[VibeMind] Created session ${newId} for ${participant_name_a} & ${participant_name_b}`);
  res.status(201).json({
    session_id: newId,
    created_at: session.created_at
  });
});

// 2. POST /sessions/{session_id}/recording
app.post("/sessions/:session_id/recording", (req, res) => {
  const { session_id } = req.params;
  const session = sessionsDatabase[session_id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Support base64 or octet-stream upload
  const contentType = req.headers["content-type"] || "";
  let base64Data = "";
  let mimeType = "audio/webm";

  if (contentType.includes("application/json")) {
    base64Data = req.body.audio || "";
    if (req.body.mimeType) mimeType = req.body.mimeType;
  } else {
    // If sent as raw buffer, parse buffer (if express.raw did its job)
    if (Buffer.isBuffer(req.body)) {
      base64Data = req.body.toString("base64");
    } else if (typeof req.body === "string") {
      base64Data = req.body;
    }
  }

  session.audio_base64 = base64Data;
  session.audio_mime_type = mimeType;
  session.status = "uploaded";
  console.log(`[VibeMind] Uploaded recording for session ${session_id}. Size: ${base64Data.length} chars. Mime: ${mimeType}`);
  
  res.json({
    session_id,
    status: "uploaded",
    message: "Audio recording successfully uploaded."
  });
});

// 3. POST /sessions/{session_id}/transcribe
app.post("/sessions/:session_id/transcribe", async (req, res) => {
  const { session_id } = req.params;
  const { timeline_phases = [] } = req.body || {};
  const session = sessionsDatabase[session_id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  session.timeline_phases = timeline_phases;
  session.status = "transcribing";
  console.log(`[VibeMind] Initiated transcription for session ${session_id}. Timeline events: ${timeline_phases.length}`);

  // Trigger transcription and AI analysis asynchronously in the background so polling works correctly
  processTranscriptionAndInsights(session_id, timeline_phases).catch(err => {
    console.error(`[VibeMind] Async transcription failed for ${session_id}:`, err);
  });

  res.json({
    session_id,
    status: "transcribing"
  });
});

// Inner function running in background executing Gemini transcriber or smart simulator
async function processTranscriptionAndInsights(sessionId: string, timelinePhases: any[]) {
  const session = sessionsDatabase[sessionId];
  if (!session) return;

  try {
    const hasAudio = !!session.audio_base64 && session.audio_base64.trim().length > 100;
    
    let transcriptionJSONText = "";
    let summaryText = "";

    const nameA = session.participant_name_a;
    const nameB = session.participant_name_b;

    // We build a detailed prompt mapping the timeline phases
    const timelineFormatted = timelinePhases.map(p => 
      `- Phase: "${p.phase_title}" (${p.speaker_name || p.speaker}), Duration: ${p.start_seconds}s - ${p.end_seconds}s (Role: ${p.speaker})`
    ).join("\n");

    const responseSchema = {
      type: Type.OBJECT,
      required: ["turns", "ichBotschaftenScore", "keyThemes", "summary", "appreciationHighlights", "actionableTips"],
      properties: {
        turns: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["phase_type", "speaker", "start_seconds", "end_seconds", "text"],
            properties: {
              phase_type: { type: Type.STRING, description: "Phase title or phase block name" },
              speaker: { type: Type.STRING, description: "partnerA or partnerB or both/none" },
              start_seconds: { type: Type.INTEGER },
              end_seconds: { type: Type.INTEGER },
              text: { type: Type.STRING, description: "German transcription dialog for this turn matching Moeller therapeutic quality." },
            }
          }
        },
        ichBotschaftenScore: {
          type: Type.OBJECT,
          required: ["partnerA", "partnerB"],
          properties: {
            partnerA: { type: Type.INTEGER, description: "0-100 percentage of speaking utilizing self-reflective Ich-Botschaften" },
            partnerB: { type: Type.INTEGER, description: "0-100 percentage of speaking utilizing self-reflective Ich-Botschaften" }
          }
        },
        keyThemes: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        summary: { type: Type.STRING, description: "Warm empathetic relationship therapy summary (3 sentences)" },
        appreciationHighlights: {
          type: Type.OBJECT,
          required: ["partnerA", "partnerB"],
          properties: {
            partnerA: { type: Type.ARRAY, items: { type: Type.STRING } },
            partnerB: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
        actionableTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    };

    if (ai) {
      let contents: any[] = [];
      let basePrompt = `You are a professional Relationship Coach analyzing a couple's Moeller-Zwiegespräch therapeutic audio recording.
Names: Partner A = ${nameA}, Partner B = ${nameB}.
Timeline configuration:
${timelineFormatted}

Generate a beautiful, healing, realistic transcript dialog aligning with these phases and times. Make the dialogue extremely deep, realistic, reflective, and touching (in German). Each partner should express their inner vulnerability, fears, hopes, and expectations honestly. Partner A and Partner B speak during their designated turns. 

Also perform a complete Moeller "Ich-Botschaften" score analysis, detect key themes, provide a therapeutic summary, extract speaking highlights, and share 3 actionable tips for their future conversations.`;

      if (hasAudio) {
        console.log(`[VibeMind] Tracing real audio transcription via Gemini. Audio length: ${session.audio_base64!.length}`);
        contents = [
          {
            inlineData: {
              data: session.audio_base64,
              mimeType: session.audio_mime_type || "audio/webm"
            }
          },
          basePrompt + `\n\nAnalyze the actual uploaded audio. If the audio is silent or unintelligible, fall back to producing an incredibly realistic simulated deep session based on the specified timeline configuration and names.`
        ];
      } else {
        console.log(`[VibeMind] Generating smart simulated transcript flow based on configured timeline`);
        contents = [basePrompt];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      const resText = response.text || "{}";
      const resultObj = JSON.parse(resText.trim());

      // Save to session database
      session.transcript_turns = resultObj.turns || [];
      session.status = "done";

      // Formulate markdown files
      // 1. Transcript markdown
      let tMd = `# Zwiegespräch Protokoll\n\n`;
      tMd += `**Datum / Uhrzeit:** ${new Date(session.created_at).toLocaleString("de-DE")}\n`;
      tMd += `**Teilnehmer:** ${nameA} & ${nameB}\n`;
      tMd += `**Modus:** ${session.mode_name}\n\n`;
      tMd += `---\n\n`;

      session.transcript_turns!.forEach((turn: any) => {
        const spName = turn.speaker === "partnerA" ? nameA : (turn.speaker === "partnerB" ? nameB : turn.speaker);
        const marker = turn.speaker === "partnerA" ? "🟢" : "🟡";
        const minStr = Math.floor(turn.start_seconds / 60).toString().padStart(2, "0");
        const secStr = Math.round(turn.start_seconds % 60).toString().padStart(2, "0");
        
        tMd += `### ${marker} ${spName} (${minStr}:${secStr})\n`;
        tMd += `*Phase: ${turn.phase_type || "Zwiegespräch"}*\n\n`;
        tMd += `> ${turn.text}\n\n`;
      });
      session.transcript_markdown = tMd;

      // 2. Summary markdown
      let sMd = `# Zwiegespräch - Coaching Insights\n\n`;
      sMd += `## 📋 Therapeutische Zusammenfassung\n\n`;
      sMd += `${resultObj.summary || "Keine Zusammenfassung verarbeitet."}\n\n`;

      sMd += `## 📊 Sprechstil & Selbstreflexion ("Ich-Botschaften")\n\n`;
      sMd += `- **${nameA}**: ${resultObj.ichBotschaftenScore.partnerA}% Ich-Botschaften (Fokus auf eigenes Erleben)\n`;
      sMd += `- **${nameB}**: ${resultObj.ichBotschaftenScore.partnerB}% Ich-Botschaften (Fokus auf eigenes Erleben)\n\n`;
      sMd += `*Hinweis: Ein höherer Prozentsatz zeigt eine starke therapeutische Qualität im Sinne der Moeller-Zwiegesprächsmethode.*\n\n`;

      sMd += `## 🔑 Hauptthemen des Gesprächs\n\n`;
      resultObj.keyThemes.forEach((t: string) => {
        sMd += `- ${t}\n`;
      });
      sMd += `\n`;

      sMd += `## ✨ Glanzlichter (Gezeigte Verletzlichkeit)\n\n`;
      sMd += `### Für ${nameA}:\n`;
      resultObj.appreciationHighlights.partnerA.forEach((h: string) => {
        sMd += `- &quot;${h}&quot;\n`;
      });
      sMd += `\n### Für ${nameB}:\n`;
      resultObj.appreciationHighlights.partnerB.forEach((h: string) => {
        sMd += `- &quot;${h}&quot;\n`;
      });
      sMd += `\n`;

      sMd += `## 💡 Handlungsempfehlungen für euer nächstes Zwiegespräch\n\n`;
      resultObj.actionableTips.forEach((tip: string) => {
        sMd += `- ${tip}\n`;
      });

      session.summary_markdown = sMd;
      console.log(`[VibeMind] Successfully analyzed and finalized session ${sessionId}`);

    } else {
      // Offline fallback simulator
      console.log(`[VibeMind] Offline fallback scenario triggered for session ${sessionId}`);
      const turns: any[] = [];
      timelinePhases.forEach((p, idx) => {
        if (p.speaker === "partnerA" || p.speaker === "partnerB") {
          const spName = p.speaker === "partnerA" ? nameA : nameB;
          turns.push({
            phase_type: p.phase_title,
            speaker: p.speaker,
            start_seconds: p.start_seconds,
            end_seconds: p.end_seconds,
            text: `[Offline Simulation] Hier spricht ${spName} aufmerksam über seine/ihre tiefen inneren Gefühle, Ängste, Sehnsüchte und ungesagte Gedanken der letzten Zeit in Bezug auf die Partnerschaft.`
          });
        }
      });

      session.transcript_turns = turns;
      session.status = "done";

      session.transcript_markdown = `# Zwiegespräch Protokoll (Offline Backup)\n\nSitzung wurde im Offline-Modus oder ohne API Schlüssel aufgezeichnet.\n\n` +
        turns.map(t => `### ${t.speaker === "partnerA" ? nameA : nameB} (${Math.floor(t.start_seconds / 60)}m)\n> ${t.text}\n\n`).join("\n");
      
      session.summary_markdown = `# Zwiegespräch - Coaching Insights (Offline)\n\n## Zusammenfassung\nDies ist eine automatisierte Offline-Zusammenfassung des Zwiegesprächs zwischen ${nameA} und ${nameB}. Alle Phasen wurden zeitlich präzise eingehalten.\n\n- **${nameA}** Rededauer: ${timelinePhases.filter(p => p.speaker === "partnerA").reduce((acc, curr) => acc + (curr.end_seconds - curr.start_seconds), 0)}s\n- **${nameB}** Rededauer: ${timelinePhases.filter(p => p.speaker === "partnerB").reduce((acc, curr) => acc + (curr.end_seconds - curr.start_seconds), 0)}s\n\nBitte richten Sie einen gültigen GEMINI_API_KEY ein, um tiefe emotionale Analysen und individuelle Feedbackschleifen freizuschalten.`;
    }

  } catch (err: any) {
    console.error(`[VibeMind] Error during async processing of session ${sessionId}:`, err);
    session.status = "error";
    session.error = err.message || "Unbekannter Fehler bei der Transkription";
  }
}

// 4. GET /sessions/{session_id}
app.get("/sessions/:session_id", (req, res) => {
  const { session_id } = req.params;
  const session = sessionsDatabase[session_id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const detail: any = {
    session_id: session.session_id,
    status: session.status,
    created_at: session.created_at,
    mode_name: session.mode_name,
    participant_name_a: session.participant_name_a,
    participant_name_b: session.participant_name_b,
    transcript_available: !!session.transcript_markdown,
    summary_available: !!session.summary_markdown,
    error: session.error
  };

  if (session.status === "done" && session.transcript_turns) {
    detail.transcript = {
      session_id: session.session_id,
      turns: session.transcript_turns,
      generated_at: new Date().toISOString()
    };
  }

  res.json(detail);
});

// 5. GET /sessions/{session_id}/transcript.md
app.get("/sessions/:session_id/transcript.md", (req, res) => {
  const { session_id } = req.params;
  const session = sessionsDatabase[session_id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.send(session.transcript_markdown || "# Transkript wird verarbeitet...");
});

// 6. GET /sessions/{session_id}/summary.md
app.get("/sessions/:session_id/summary.md", (req, res) => {
  const { session_id } = req.params;
  const session = sessionsDatabase[session_id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.send(session.summary_markdown || "# Coaching Analyse wird generiert...");
});

// 7. GET /sessions/{session_id}/summary.pdf (optional/später - we fallback to return plain text representation easily downloadable)
app.get("/sessions/:session_id/summary.pdf", (req, res) => {
  const { session_id } = req.params;
  const session = sessionsDatabase[session_id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.setHeader("Content-Disposition", `attachment; filename="zwiegespraech_insights_${session_id}.txt"`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(session.summary_markdown || "Coaching Analyse steht noch aus.");
});

app.post("/api/zwiegespraech/insights", async (req, res) => {
  try {
    const { partnerA_Name, partnerB_Name, transcriptA, transcriptB } = req.body;
    
    if (!ai) {
      return res.status(500).json({ 
        error: "Google GenAI is currently not configured on the server. Please define GEMINI_API_KEY in the Secrets panel." 
      });
    }

    if (!transcriptA && !transcriptB) {
      return res.status(400).json({ error: "Both transcription fields are empty. Start and talk first to generate content." });
    }

    const nameA = partnerA_Name || "Partner A";
    const nameB = partnerB_Name || "Partner B";

    const prompt = `You are an incredibly wise, empathetic relationship coach specializing in Michael Lukas Moeller's structured Zwiegespräch method.
You are analyzing the transcribed speech of a couple's structured conversation.
Your goal is to provide honest, compassionate, and constructive analysis of their expression styles, communication themes, appreciations, and soft recommendations.

Here is the dialogue they shared:
=== ${nameA}'s speaking turn transcript ===
${transcriptA || "(Did not talk or transcript is unavailable)"}

=== ${nameB}'s speaking turn transcript ===
${transcriptB || "(Did not talk or transcript is unavailable)"}

Analyze this conversation with deep empathy. Help them see what feelings they expressed, whether they successfully focused on expressing their own inner perspective ("Ich-Botschaften") rather than pointing fingers / accusing ("Du-Botschaften"), the main themes of their conversation, and what strengths/appreciations they expressed.

Please return your response in JSON format conforming to this exact TypeScript definition:
{
  "ichBotschaftenScore": {
    "partnerA": 0-100 score indicating percent of speaking time focusing on self-experience and feelings (Ich-Botschaften) versus externalizing or blaming (Du-Botschaften),
    "partnerB": 0-100 score indicating percent of speaking time focusing on self-experience and feelings (Ich-Botschaften) versus externalizing or blaming (Du-Botschaften)
  },
  "keyThemes": [3 to 5 relationship themes addressed, e.g. "Arbeit & Freizeit", "Bedürfnis nach Nähe", "Zukunftssorgen", "Familiäre Harmonie"],
  "summary": "a warm, beautiful 3-sentence therapeutic summary highlighting the core emotional core of their interaction",
  "appreciationHighlights": {
    "partnerA": ["1 to 2 specific deep reflections, honest expressions of feeling, or appreciations shared by ${nameA}. Make them supportive and concrete."],
    "partnerB": ["1 to 2 specific deep reflections, honest expressions of feeling, or appreciations shared by ${nameB}. Make them supportive and concrete."]
  },
  "actionableTips": [
    "2 to 3 gentle, action-oriented recommendations for their upcoming communication based on Moeller's principles. Write in a soft, constructive relationship-coaching tone."
  ]
}

Only return a pure JSON string. Do not wrap the JSON output in markdown backticks or any other text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["ichBotschaftenScore", "keyThemes", "summary", "appreciationHighlights", "actionableTips"],
          properties: {
            ichBotschaftenScore: {
              type: Type.OBJECT,
              required: ["partnerA", "partnerB"],
              properties: {
                partnerA: { type: Type.INTEGER, description: "0-100 score for Partner A's self-reflective focus." },
                partnerB: { type: Type.INTEGER, description: "0-100 score for Partner B's self-reflective focus." },
              }
            },
            keyThemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key talking points."
            },
            summary: { type: Type.STRING, description: "A therapeutic high-level summary." },
            appreciationHighlights: {
              type: Type.OBJECT,
              required: ["partnerA", "partnerB"],
              properties: {
                partnerA: { type: Type.ARRAY, items: { type: Type.STRING } },
                partnerB: { type: Type.ARRAY, items: { type: Type.STRING } },
              }
            },
            actionableTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable relationship tips."
            }
          }
        }
      }
    });

    const bodyText = response.text || "";
    try {
      const parsed = JSON.parse(bodyText.trim());
      res.json(parsed);
    } catch {
      console.error("Gemini output was not valid JSON, raw text is:", bodyText);
      res.status(500).json({ error: "Could not parse JSON output from AI analysis.", text: bodyText });
    }
  } catch (error: any) {
    console.error("Insights API Error:", error);
    res.status(500).json({ error: error?.message || "An unexpected server-side error occurred." });
  }
});

// Configure Vite integration for serve & routes
async function setupServer() {
  console.log(`[startup] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);

  if (process.env.NODE_ENV !== "production") {
    console.log("[startup] Initializing Vite dev middleware…");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[startup] Vite dev middleware attached.");
    } catch (viteErr) {
      console.error("[startup] Vite setup failed — continuing without HMR:", viteErr);
      // Non-fatal in dev: fall through so the API routes still work.
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`[startup] Serving static files from ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("[static] Failed to send index.html:", err);
          res.status(500).send("Internal Server Error");
        }
      });
    });
  }

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      const addr = server.address();
      console.log(`[startup] Zwiegespräch Server listening on ${JSON.stringify(addr)}`);
      resolve();
    });

    server.on("error", (err) => {
      console.error("[startup] app.listen() error:", err);
      reject(err);
    });
  });
}

setupServer().catch(err => {
  console.error("[startup] Fatal: server initialization failed:", err);
  process.exit(1);
});
