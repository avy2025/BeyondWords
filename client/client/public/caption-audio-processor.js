// AudioWorklet processor for Caption Host transcription.
// Converts the existing microphone track to 16 kHz mono signed 16-bit LE PCM.

class CaptionAudioProcessor extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();
    const config = options.processorOptions || {};
    this.sourceRate = Number(config.sourceRate) > 0 ? Number(config.sourceRate) : sampleRate;
    this.targetRate = 16000;
    this.step = this.sourceRate / this.targetRate;
    this.chunkSamples = 1600; // 100 ms at 16 kHz
    this.window = [];
    this.inputIndex = 0;
    this.outputIndex = 0;
    this.pcm = [];
  }

  valueAt(index) {
    for (let i = 0; i < this.window.length; i += 1) {
      const entry = this.window[i];
      if (entry[0] === index) return entry[1];
      if (entry[0] > index) break;
    }
    return null;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelCount = input.length;
    const frameCount = input[0].length;

    for (let i = 0; i < frameCount; i += 1) {
      let mono = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        mono += input[channel][i] || 0;
      }
      mono /= channelCount;

      this.window.push([this.inputIndex, mono]);
      this.inputIndex += 1;

      let needed = this.outputIndex * this.step;
      while (needed <= this.inputIndex - 1) {
        const baseIndex = Math.floor(needed);
        const fraction = needed - baseIndex;
        const first = this.valueAt(baseIndex);
        const second = this.valueAt(baseIndex + 1);
        const s0 = first === null ? 0 : first;
        const s1 = second === null ? s0 : second;
        const resampled = s0 + (s1 - s0) * fraction;
        const clamped = Math.max(-1, Math.min(1, resampled));
        const pcm16 = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
        this.pcm.push(pcm16);
        this.outputIndex += 1;
        needed = this.outputIndex * this.step;
      }

      const minIndex = Math.max(0, Math.floor(this.outputIndex * this.step) - 2);
      while (this.window.length && this.window[0][0] < minIndex) {
        this.window.shift();
      }
    }

    while (this.pcm.length >= this.chunkSamples) {
      const chunk = this.pcm.splice(0, this.chunkSamples);
      const buffer = new ArrayBuffer(chunk.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < chunk.length; i += 1) {
        view.setInt16(i * 2, chunk[i], true);
      }
      this.port.postMessage(buffer, [buffer]);
    }

    return true;
  }
}

registerProcessor('caption-audio-processor', CaptionAudioProcessor);
