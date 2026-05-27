export interface RecordingHandle {
  startedAt: number;
  mimeType: string;
  stop(): Promise<Blob>;
  abort(): void;
}

export async function startRecording(): Promise<RecordingHandle> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Determine MIME type
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    let selectedMimeType = "audio/webm";
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.start();

    return {
      startedAt: Date.now(),
      mimeType: selectedMimeType,
      stop: () => {
        return new Promise<Blob>((resolve) => {
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: selectedMimeType });
            stream.getTracks().forEach((track) => track.stop());
            resolve(blob);
          };
          mediaRecorder.stop();
        });
      },
      abort: () => {
        mediaRecorder.stop();
        stream.getTracks().forEach((track) => track.stop());
      },
    };
  } catch (error) {
    console.error("Recording error:", error);
    throw new Error("Could not start recording. Please check microphone permissions.");
  }
}
