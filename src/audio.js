(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  class RetroAudio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.lastShotAt = 0;
    }

    unlock() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    tone(type, freqStart, freqEnd, duration, gainVal = 0.08) {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), now + duration);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    }

    playShot(kind) {
      if (this.muted || !this.ctx) return;
      const now = performance.now();
      if (now - this.lastShotAt < 28) return;
      this.lastShotAt = now;

      if (kind === 'pistol') this.tone('square', 520, 140, 0.07, 0.06);
      else if (kind === 'shotgun') this.tone('sawtooth', 220, 55, 0.14, 0.1);
      else if (kind === 'minigun') this.tone('square', 680, 260, 0.04, 0.04);
      else if (kind === 'railgun') this.tone('sawtooth', 1200, 180, 0.18, 0.09);
      else if (kind === 'revolver') this.tone('triangle', 760, 210, 0.09, 0.08);
      else if (kind === 'launcher') this.tone('sine', 280, 85, 0.14, 0.09);
      else if (kind === 'venom') this.tone('triangle', 620, 320, 0.08, 0.06);
      else if (kind === 'sonic') this.tone('sine', 420, 110, 0.16, 0.09);
      else if (kind === 'cryo') this.tone('sine', 980, 540, 0.09, 0.05);
      else if (kind === 'missile') this.tone('sawtooth', 360, 160, 0.11, 0.07);
      else if (kind === 'saw') this.tone('square', 460, 590, 0.1, 0.06);
      else if (kind === 'zap') this.tone('sawtooth', 1400, 380, 0.09, 0.07);
    }

    playReload() {
      this.tone('triangle', 340, 620, 0.09, 0.05);
    }

    playExplosion() {
      this.tone('sawtooth', 140, 36, 0.22, 0.11);
    }

    playGem() {
      this.tone('sine', 880, 1280, 0.05, 0.035);
    }

    playHurt() {
      this.tone('sawtooth', 180, 60, 0.16, 0.1);
    }

    playLevelUp() {
      this.tone('square', 440, 880, 0.18, 0.07);
    }
  }

  PGS.RetroAudio = RetroAudio;
})(window);
