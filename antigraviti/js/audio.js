/**
 * GUERRA EN EL BOSQUE - MOTOR DE AUDIO SINTETIZADO (Web Audio API)
 * Genera efectos de sonido y banda sonora arcade retro proceduralmente
 * sin depender de archivos de audio externos (100% offline y confiable).
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.volume = 0.7;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.tempo = 132; // BPM estilo arcade
    this.victoryPlaying = false;
    this.victoryTimer = null;
    this.victoryTimeout = null;
    this.victoryStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Ruido blanco para explosiones y disparos
  createNoiseBuffer(duration = 1.0) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // SFX: Disparo de Rifle Estándar
  playShootRifle() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // SFX: Disparo Spread (Escopeta dispersa estilo Contra)
  playShootSpread() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'square' : 'sawtooth';
      const baseFreq = 300 + i * 80;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.19);
    }
  }

  // SFX: Disparo Láser (Rayo penetrante)
  playShootLaser() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.22);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  // SFX: Ametralladora Pesada / Minigun
  playShootMinigun() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // SFX: Cohete / Lanzamisiles
  playShootRocket() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(350, t + 0.25);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // SFX: Cañón de Tanque Devastador
  playTankCannon() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Golpe sub-grave masivo
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.5);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.52);

    // Ruido de deflagración
    const buffer = this.createNoiseBuffer(0.6);
    if (buffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.8, t);
      nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.62);
    }
  }

  // SFX: Explosión (Granadas, Minas, Vehículos destruidos)
  playExplosion(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const buffer = this.createNoiseBuffer(0.7 * intensity);
    if (buffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 * intensity, t);
      filter.frequency.exponentialRampToValueAtTime(50, t + 0.7 * intensity);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8 * intensity, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7 * intensity);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + 0.75 * intensity);
    }

    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    oGain.gain.setValueAtTime(0.7, t);
    oGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  // SFX: Recoger Moneda de Oro (Sonido brillante)
  playCoin() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.29);
  }

  // SFX: Recoger Power-up / Caja de Arma
  playPowerup() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const freqs = [330, 440, 554, 659];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);

      gain.gain.setValueAtTime(0.3, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, t + (idx + 1) * 0.06 + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + (idx + 1) * 0.06 + 0.12);
    });
  }

  // SFX: Salto del Soldado
  playJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // SFX: Jugador Recibe Daño
  playPlayerHurt() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // SFX: Alerta de Mina Terrestre (Bip agudo rápido)
  playMineBeep() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // SFX: Entrar o Salir del Tanque
  playVehicleEnter() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // SFX: Alarma de Sirena en Cinemática / Base
  playSiren() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.25);
    osc.frequency.linearRampToValueAtTime(600, t + 0.5);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.56);
  }

  // =========================================================================
  // BANDA SONORA PROCEDURAL ARCADE (SINTETIZADA DINÁMICA)
  // =========================================================================
  startMusic() {
    if (this.musicPlaying) return;
    this.ensureContext();
    this.musicPlaying = true;
    this.musicStep = 0;
    this.scheduleNextMusicNote();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleNextMusicNote() {
    if (!this.musicPlaying) return;
    const secondsPerBeat = 60.0 / this.tempo;
    const stepDuration = secondsPerBeat / 4; // semicorcheas (16th notes)

    this.playMusicStep(this.musicStep);
    this.musicStep = (this.musicStep + 1) % 64;

    this.musicTimer = setTimeout(() => {
      this.scheduleNextMusicNote();
    }, stepDuration * 1000);
  }

  playMusicStep(step) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Bombo / Kick Drum en tiempos 0, 4, 8, 12, etc.
    if (step % 4 === 0) {
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(140, t);
      kick.frequency.exponentialRampToValueAtTime(35, t + 0.12);
      kickGain.gain.setValueAtTime(0.6, t);
      kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      kick.connect(kickGain);
      kickGain.connect(this.musicGain);
      kick.start(t);
      kick.stop(t + 0.13);
    }

    // 2. Caja / Snare Drum en tiempos 4, 12 de cada compás
    if (step % 8 === 4) {
      const buffer = this.createNoiseBuffer(0.1);
      if (buffer) {
        const snare = this.ctx.createBufferSource();
        snare.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, t);
        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.35, t);
        sGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        snare.connect(filter);
        filter.connect(sGain);
        sGain.connect(this.musicGain);
        snare.start(t);
        snare.stop(t + 0.11);
      }
    }

    // 3. Hi-Hat en semicorcheas impares
    if (step % 2 === 1) {
      const buffer = this.createNoiseBuffer(0.04);
      if (buffer) {
        const hat = this.ctx.createBufferSource();
        hat.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4500, t);
        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.15, t);
        hGain.gain.exponentialRampToValueAtTime(0.005, t + 0.04);
        hat.connect(filter);
        filter.connect(hGain);
        hGain.connect(this.musicGain);
        hat.start(t);
        hat.stop(t + 0.05);
      }
    }

    // 4. Bajo Sintetizado Arcade (Línea de bajo enérgica estilo Contra)
    const bassScale = [55, 55, 65.41, 73.42, 55, 82.41, 73.42, 65.41]; // A1, C2, D2, E2...
    const bassNote = bassScale[(Math.floor(step / 2)) % bassScale.length];
    if (step % 2 === 0) {
      const bass = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassNote, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);

      bGain.gain.setValueAtTime(0.3, t);
      bGain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

      bass.connect(filter);
      filter.connect(bGain);
      bGain.connect(this.musicGain);
      bass.start(t);
      bass.stop(t + 0.12);
    }

    // 5. Arpegio / Melodía Militar Retro (en compases superiores)
    const melodyPattern = [
      220, 261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63,
      220, 220, 329.63, 440, 392, 329.63, 293.66, 329.63
    ];
    if (step % 4 === 2) {
      const melodyNote = melodyPattern[Math.floor(step / 4) % melodyPattern.length];
      const lead = this.ctx.createOscillator();
      const lGain = this.ctx.createGain();
      lead.type = 'square';
      lead.frequency.setValueAtTime(melodyNote, t);

      lGain.gain.setValueAtTime(0.18, t);
      lGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      lead.connect(lGain);
      lGain.connect(this.musicGain);
      lead.start(t);
      lead.stop(t + 0.16);
    }
  }

  // =========================================================================
  // EFECTOS DE SONIDO CLIMÁTICOS Y HABILIDADES DEL SUPER SOLDADO
  // =========================================================================

  // Trueno lejano / cercano en la tormenta nocturna
  playThunder() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const buffer = this.createNoiseBuffer(2.0);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.linearRampToValueAtTime(70, t + 1.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 1.9);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
    source.stop(t + 2.0);
  }

  // Desplazamiento supersónico con propulsores (Cyber Dash)
  playCyberDash() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.28);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Rebote y deflexión del escudo de plasma
  playShieldDeflect() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const freqs = [1600, 2400];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.15);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  // Impacto sísmico del Super Soldado contra el suelo (Ground Slam)
  playGroundSlam() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Sub-bajo devastador
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.45);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.48);

    // Explosión de polvo y roca
    this.playExplosion(1.2);
  }

  // Lanzamiento de andanada de micro-misiles
  playMissileLaunch() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.18);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  // =========================================================================
  // BANDA SONORA DE VICTORIA: FANFARRIA MILITAR Y MARCHA TRIUNFAL (WEB AUDIO)
  // =========================================================================
  
  // Impacto sonoro inicial de ¡Misión Cumplida!
  playMissionCompleteSound() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Golpe de impacto grave (Sub-bass boom)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.42);

    // 2. Chime metálico resplandeciente ascendente
    const chimeFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chimeFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.28, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.36);
    });
  }

  // Generador de notas de metal/trompetas para fanfarria (estilo arcade retro)
  playBrassNote(freq, startTime, duration, volume = 0.28, type = 'sawtooth') {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, startTime);
    filter.frequency.linearRampToValueAtTime(2800, startTime + 0.04);
    filter.frequency.exponentialRampToValueAtTime(1400, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.025);
    gain.gain.setValueAtTime(volume * 0.85, startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  playSnareHit(startTime, volume = 0.25, duration = 0.09) {
    if (!this.ctx || this.isMuted) return;
    const buffer = this.createNoiseBuffer(duration);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }

  playCrashCymbal(startTime, volume = 0.28, duration = 1.1) {
    if (!this.ctx || this.isMuted) return;
    const buffer = this.createNoiseBuffer(duration);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(5500, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.005, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }

  // Fanfarria orquestal triunfal completa
  playVictoryFanfare() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Golpes 1 y 2: Toque rítmico marcial "Da - Da - Daaa"
    this.playBrassNote(261.63, t + 0.00, 0.15, 0.28); // C4
    this.playBrassNote(392.00, t + 0.00, 0.15, 0.24); // G4
    this.playSnareHit(t + 0.00, 0.25);

    this.playBrassNote(261.63, t + 0.20, 0.15, 0.28); // C4
    this.playBrassNote(392.00, t + 0.20, 0.15, 0.24); // G4
    this.playSnareHit(t + 0.20, 0.25);

    this.playBrassNote(261.63, t + 0.40, 0.28, 0.30); // C4
    this.playBrassNote(329.63, t + 0.40, 0.28, 0.26); // E4
    this.playBrassNote(523.25, t + 0.40, 0.28, 0.28); // C5
    this.playSnareHit(t + 0.40, 0.3);

    // Golpe 3: Ascenso heroico triunfal
    this.playBrassNote(329.63, t + 0.75, 0.38, 0.30); // E4
    this.playBrassNote(392.00, t + 0.75, 0.38, 0.28); // G4
    this.playBrassNote(659.25, t + 0.75, 0.38, 0.32); // E5

    // Golpe 4: Cadencia dominante
    this.playBrassNote(392.00, t + 1.20, 0.35, 0.30); // G4
    this.playBrassNote(587.33, t + 1.20, 0.35, 0.32); // D5
    this.playBrassNote(783.99, t + 1.20, 0.35, 0.32); // G5

    // Redoble de tambor militar previo al gran acorde final
    for (let i = 0; i < 6; i++) {
      this.playSnareHit(t + 1.40 + i * 0.045, 0.18 + i * 0.03, 0.05);
    }

    // Gran Acorde Majestuoso Final (C Mayor con platillo y bombo triunfal)
    const chordTime = t + 1.70;
    this.playBrassNote(130.81, chordTime, 1.2, 0.35); // C3 (Bajo profundo)
    this.playBrassNote(261.63, chordTime, 1.2, 0.32); // C4
    this.playBrassNote(329.63, chordTime, 1.2, 0.30); // E4
    this.playBrassNote(392.00, chordTime, 1.2, 0.30); // G4
    this.playBrassNote(523.25, chordTime, 1.2, 0.35); // C5
    this.playBrassNote(1046.50, chordTime, 1.1, 0.28, 'triangle'); // C6 armónico resplandeciente
    this.playCrashCymbal(chordTime, 0.32, 1.4);

    // Bombo de cierre potente
    const kick = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(140, chordTime);
    kick.frequency.exponentialRampToValueAtTime(32, chordTime + 0.3);
    kickGain.gain.setValueAtTime(0.7, chordTime);
    kickGain.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.3);
    kick.connect(kickGain);
    kickGain.connect(this.musicGain);
    kick.start(chordTime);
    kick.stop(chordTime + 0.32);
  }

  // Reproducción de la banda sonora de Victoria completa
  playVictoryMusic() {
    this.stopMusic();
    this.stopVictoryMusic();
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    this.victoryPlaying = true;
    this.victoryStep = 0;

    // 1. Efecto de sonido del letrero y fanfarria inicial
    this.playMissionCompleteSound();
    this.playVictoryFanfare();

    // 2. Transición fluida a la marcha militar de victoria (después de 2.6s)
    this.victoryTimeout = setTimeout(() => {
      if (this.victoryPlaying) {
        this.victoryStep = 0;
        this.scheduleNextVictoryStep();
      }
    }, 2600);
  }

  stopVictoryMusic() {
    this.victoryPlaying = false;
    if (this.victoryTimeout) {
      clearTimeout(this.victoryTimeout);
      this.victoryTimeout = null;
    }
    if (this.victoryTimer) {
      clearTimeout(this.victoryTimer);
      this.victoryTimer = null;
    }
  }

  scheduleNextVictoryStep() {
    if (!this.victoryPlaying) return;
    const tempoVictory = 136; // BPM alegre y dinámico
    const stepDuration = (60.0 / tempoVictory) / 4; // semicorcheas

    this.playVictoryStep(this.victoryStep);
    this.victoryStep = (this.victoryStep + 1) % 32;

    this.victoryTimer = setTimeout(() => {
      this.scheduleNextVictoryStep();
    }, stepDuration * 1000);
  }

  // Bucle de celebración militar rítmica (bombo, caja marcial, bajo alegre y acordes de metales)
  playVictoryStep(step) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Bombo en cada tiempo principal (0, 4, 8, 12, 16, 20, 24, 28)
    if (step % 4 === 0) {
      const kick = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(130, t);
      kick.frequency.exponentialRampToValueAtTime(38, t + 0.1);
      kGain.gain.setValueAtTime(0.55, t);
      kGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      kick.connect(kGain);
      kGain.connect(this.musicGain);
      kick.start(t);
      kick.stop(t + 0.11);
    }

    // 2. Caja en tiempos 4 y 12 de cada 16
    if (step % 8 === 4) {
      this.playSnareHit(t, 0.32, 0.1);
    }

    // 3. Platillo Hi-Hat alegre
    if (step % 2 === 1) {
      const buffer = this.createNoiseBuffer(0.04);
      if (buffer) {
        const hat = this.ctx.createBufferSource();
        hat.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, t);
        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.14, t);
        hGain.gain.exponentialRampToValueAtTime(0.005, t + 0.04);
        hat.connect(filter);
        filter.connect(hGain);
        hGain.connect(this.musicGain);
        hat.start(t);
        hat.stop(t + 0.05);
      }
    }

    // 4. Línea de bajo militar heroico (C - E - F - G - A - G)
    const victoryBass = [
      65.41, 65.41, 82.41, 98.00,  87.31, 87.31, 98.00, 110.00, // C2.. E2.. F2.. G2.. A2
      98.00, 82.41, 65.41, 82.41,  98.00, 98.00, 130.81, 98.00  // G2.. E2.. C2.. C3
    ];
    if (step % 2 === 0) {
      const bNote = victoryBass[(Math.floor(step / 2)) % victoryBass.length];
      const bass = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(bNote, t);

      bGain.gain.setValueAtTime(0.38, t);
      bGain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

      bass.connect(bGain);
      bGain.connect(this.musicGain);
      bass.start(t);
      bass.stop(t + 0.14);
    }

    // 5. Arpegio y estocadas de trompetas de celebración
    const celebrationMelody = [
      523.25, 0, 659.25, 0, 783.99, 0, 1046.50, 0,
      880.00, 0, 783.99, 0, 659.25, 783.99, 1046.50, 0
    ];
    const mNote = celebrationMelody[Math.floor(step / 2) % celebrationMelody.length];
    if (mNote > 0 && step % 2 === 0) {
      this.playBrassNote(mNote, t, 0.16, 0.18, 'sawtooth');
    }
  }
}

// Instancia global del motor de sonido
const audio = new SoundEngine();
