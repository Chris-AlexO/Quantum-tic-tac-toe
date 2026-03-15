export class SoundManager {
  constructor() {
    this.sounds = {
      move: new Audio(new URL("../sounds/move.ogg", import.meta.url)),
      failmove: new Audio(new URL("../sounds/failmove.ogg", import.meta.url)),
    };

    Object.values(this.sounds).forEach(sound => {
      sound.preload = "auto";
    });
  }

  play(name) {
    const sound = this.sounds[name];
    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}