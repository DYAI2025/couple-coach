import { 
  SessionCreateRequest, 
  SessionCreateResponse, 
  PhaseMarker, 
  SessionDetailResponse 
} from "../types/vibemind";

export class VibeMindClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async createSession(input: SessionCreateRequest): Promise<SessionCreateResponse> {
    return this.fetchJson<SessionCreateResponse>("sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async uploadRecording(
    sessionId: string,
    audio: Blob,
    phases: PhaseMarker[]
  ): Promise<{ session_id: string; status: "uploaded" }> {
    const formData = new FormData();
    formData.append("audio", audio);
    formData.append("phases", JSON.stringify(phases));
    
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/recording`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error("Failed to upload recording");
    }
    return response.json();
  }

  async triggerTranscription(
    sessionId: string
  ): Promise<{ session_id: string; status: "transcribing" | "done"; message?: string }> {
    return this.fetchJson<{ session_id: string; status: "transcribing" | "done"; message?: string }>(
      `sessions/${sessionId}/transcribe`,
      { method: "POST" }
    );
  }

  async getSession(sessionId: string): Promise<SessionDetailResponse> {
    return this.fetchJson<SessionDetailResponse>(`sessions/${sessionId}`);
  }

  async fetchTranscriptMarkdown(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/transcript.md`);
    if (!response.ok) throw new Error("Failed to fetch transcript");
    return response.text();
  }

  async fetchSummaryMarkdown(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/summary.md`);
    if (!response.ok) throw new Error("Failed to fetch summary");
    return response.text();
  }

  async fetchSummaryPdf(sessionId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/summary.pdf`);
    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        throw new Error("PDF not supported");
      }
      throw new Error("Failed to fetch PDF");
    }
    return response.blob();
  }
}
