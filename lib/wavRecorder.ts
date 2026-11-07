/**
 * Native PCM WAV Audio Recorder
 * Captures microphone input via Web Audio API and encodes into standard 16-bit PCM WAV (16kHz mono).
 * Fully compatible with Gnani AI Prisma STT requirements.
 */

export class WavRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private pcmChunks: Float32Array[] = [];
  private totalSamples = 0;
  private recording = false;

  public async start(): Promise<void> {
    if (this.recording) return;

    this.pcmChunks = [];
    this.totalSamples = 0;

    // Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    // Initialize AudioContext
    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
    // Buffer size 4096 gives smooth recording with zero audio glitching
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.recording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(inputData.length);
      copy.set(inputData);
      this.pcmChunks.push(copy);
      this.totalSamples += copy.length;
    };

    this.sourceNode.connect(this.processor);
    // Connect through a zero-gain node to destination to prevent speaker feedback loop
    // while ensuring the browser keeps the ScriptProcessorNode active and firing.
    const muteGain = this.audioCtx.createGain();
    muteGain.gain.value = 0;
    this.processor.connect(muteGain);
    muteGain.connect(this.audioCtx.destination);
    this.recording = true;
  }

  public async stop(): Promise<Blob> {
    this.recording = false;

    // Disconnect audio nodes
    if (this.processor && this.sourceNode) {
      try {
        this.sourceNode.disconnect();
        this.processor.disconnect();
      } catch (e) {
        console.warn('Audio disconnect error:', e);
      }
    }

    // Stop mic stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    const inputSampleRate = this.audioCtx?.sampleRate || 44100;
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.totalSamples === 0 || this.pcmChunks.length === 0) {
      throw new Error('No audio data recorded. Please speak clearly into your microphone.');
    }

    // Flatten all captured float samples
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample and convert to 16-bit PCM @ 16,000 Hz
    const targetSampleRate = 16000;
    const pcm16 = this.downsampleTo16k(merged, inputSampleRate, targetSampleRate);

    // Encode standard 44-byte RIFF WAV
    const wavBuffer = this.encodeWavHeader(pcm16, targetSampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  public isCurrentlyRecording(): boolean {
    return this.recording;
  }

  /**
   * Resamples raw audio to 16,000 Hz mono and converts float32 to int16 PCM
   */
  private downsampleTo16k(
    input: Float32Array,
    inputRate: number,
    targetRate: number
  ): Int16Array {
    if (inputRate === targetRate) {
      const output = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const ratio = inputRate / targetRate;
    const newLength = Math.round(input.length / ratio);
    const output = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.min(Math.floor(i * ratio), input.length - 1);
      const s = Math.max(-1, Math.min(1, input[srcIndex]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return output;
  }

  /**
   * Constructs the 44-byte RIFF/WAVE header for linear PCM audio
   */
  private encodeWavHeader(samples: Int16Array, sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + dataSize, true); // file size - 8
    view.setUint32(8, 0x57415645, false); // 'WAVE'

    // fmt subchunk
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true); // NumChannels (1 = mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data subchunk
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Write 16-bit PCM samples
    let byteOffset = 44;
    for (let i = 0; i < samples.length; i++, byteOffset += 2) {
      view.setInt16(byteOffset, samples[i], true);
    }

    return buffer;
  }
}
