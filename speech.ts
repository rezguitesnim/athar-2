
import { GeminiService } from "./services/geminiService";

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioCtx;
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function readTranslation(
  text: string, 
  lang: 'ar' | 'en' | 'fr',
  onStart?: () => void,
  onEnd?: () => void
) {
  try {
    stopSpeech();
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const service = new GeminiService();
    const base64Audio = await service.generateSpeech(text, lang);
    
    if (!base64Audio) {
      if (onEnd) onEnd();
      return;
    }

    if (onStart) onStart();

    const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    currentSource = source;
    
    source.onended = () => {
      if (onEnd) onEnd();
      if (currentSource === source) currentSource = null;
    };

    source.start(0);
  } catch (error) {
    console.error("Playback Error:", error);
    if (onEnd) onEnd();
  }
}

export function stopSpeech() {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {}
    currentSource = null;
  }
}
