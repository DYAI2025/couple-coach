import { 
  SessionCreateRequest, 
  SessionCreateResponse, 
  PhaseMarker 
} from "../types/vibemind";

export class VibeMindClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async fetchOrThrow(path: string, options?: RequestInit): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, options);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const error = new Error(`API error ${response.status}: ${response.statusText} - ${errorText}`);
      (error as any).status = response.status;
      throw error;
    }
    return response;
  }

  async createSession(input: SessionCreateRequest): Promise<SessionCreateResponse> {
    const response = await this.fetchOrThrow("sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return response.json();
  }

  async uploadRecording(
    sessionId: string,
    audio: Blob,
    phases: PhaseMarker[]
  ): Promise<{ session_id: string; status: "uploaded" }> {
    const formData = new FormData();
    formData.append("audio", audio, `session_${sessionId}.webm`);
    formData.append("phases", JSON.stringify(phases));
    
    const response = await this.fetchOrThrow(`sessions/${sessionId}/recording`, {
      method: "POST",
      body: formData,
    });
    return response.json();
  }

  async triggerTranscription(
    sessionId: string
  ): Promise<{ session_id: string; status: "transcribing" | "done"; message?: string }> {
    const response = await this.fetchOrThrow(`sessions/${sessionId}/transcribe`, { method: "POST" });
    return response.json();
  }

  async getSession(sessionId: string) {
    const response = await this.fetchOrThrow(`sessions/${sessionId}`);
    return response.json();
  }

  async fetchTranscriptMarkdown(sessionId: string): Promise<string> {
    const response = await this.fetchOrThrow(`sessions/${sessionId}/transcript.md`);
    return response.text();
  }

  async fetchSummaryMarkdown(sessionId: string): Promise<string> {
    const response = await this.fetchOrThrow(`sessions/${sessionId}/summary.md`);
    return response.text();
  }

  async fetchSummaryPdf(sessionId: string): Promise<Blob> {
    try {
      const response = await this.fetchOrThrow(`sessions/${sessionId}/summary.pdf`);
      return response.blob();
    } catch (err: any) {
      if (err.status === 404 || err.status === 501) {
        throw new Error("PDF_NOT_SUPPORTED");
      }
      throw err;
    }
  }
}
