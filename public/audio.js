class BaseAudio {}
BaseAudio.context = undefined;
BaseAudio.createContext = () => {
  BaseAudio.context = new AudioContext();
  BaseAudio.analyser = BaseAudio.context.createAnalyser();
  BaseAudio.analyser.connect(BaseAudio.context.destination);
};

class Note extends BaseAudio {
  constructor(freq) {
    super();
    if (!this.constructor.context) {
      this.constructor.createContext();
    }

    const o = this.constructor.context.createOscillator(); //?
    o.connect(this.constructor.analyser);
    this.constructor.analyser.connect(this.constructor.context.destination);
    o.frequency.value = freq;
    o.type = ["sine", "sawtooth", "triangle", "square"][2];
    o.start();
    o.stop(this.constructor.context.currentTime + 0.25);
  }
}
