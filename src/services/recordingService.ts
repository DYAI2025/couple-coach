export interface RecordingHandle {
  startedAt: number;
  mimeType: string;
  stop(): Promise<Blob>;
  abort(): void;
}

export async function startRecording(): Promise<RecordingHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Browser does not support microphone access.");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Browser does not support MediaRecorder.");
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Determine MIME type
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    let selectedMimeType = ""; // Default browser
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    const mediaRecorder = optionsForRecorder(stream, selectedMimeType);
    
    // Safety: ensure tracks are cleaned up on error
    stream.getTracks().forEach(track => {
      track.onended = () => {
         // handle
      };
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.start();

    return {
      startedAt: Date.now(),
      mimeType: selectedMimeType || "browser-default",
      stop: () => {
        return new Promise<Blob>((resolve, reject) => {
          if (mediaRecorder.state === "inactive") {
            reject(new Error("Recorder is inactive."));
            return;
          }
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: selectedMimeType });
            stream.getTracks().forEach((track) => track.stop());
            resolve(blob);
          };
          mediaRecorder.stop();
        });
      },
      abort: () => {
        if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        stream.getTracks().forEach((track) => track.stop());
      },
    };
  } catch (error: any) {
    console.error("Recording error:", error);
    if (error.name === 'NotAllowedError') {
        throw new Error("Microphone permission denied.");
    }
    throw new Error(`Could not start recording: ${error.message}`);
  }
}

function optionsForRecorder(stream: MediaStream, mimeType: string) {
    return mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
}
