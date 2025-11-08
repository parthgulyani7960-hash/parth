// Base64 decoding
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Base64 encoding
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode raw PCM audio data into an AudioBuffer
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
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

// Convert raw PCM audio data to a WAV file Blob
export function pcmToWav(pcmData: Uint8Array, numChannels: number, sampleRate: number): Blob {
    const dataView = new DataView(new ArrayBuffer(44 + pcmData.length));
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            dataView.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    writeString(0, 'RIFF');
    dataView.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    dataView.setUint32(16, 16, true); // Sub-chunk size
    dataView.setUint16(20, 1, true); // Audio format 1 = PCM
    dataView.setUint16(22, numChannels, true);
    dataView.setUint32(24, sampleRate, true);
    dataView.setUint32(28, byteRate, true);
    dataView.setUint16(32, blockAlign, true);
    dataView.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    dataView.setUint32(40, pcmData.length, true);

    new Uint8Array(dataView.buffer, 44).set(pcmData);

    return new Blob([dataView], { type: 'audio/wav' });
}