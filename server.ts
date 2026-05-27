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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zwiegespräch Server running on port ${PORT}`);
  });
}

setupServer().catch(err => {
  console.error("Server initialization failed:", err);
});
