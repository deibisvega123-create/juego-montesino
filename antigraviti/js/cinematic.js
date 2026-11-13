/* ===== cinematic.js ===== */
/**
 * GUERRA EN EL BOSQUE - CINEMÁTICA INICIAL
 * Requerimiento 11: "Que al inicio que muestre una cinematica del soldado
 * saliendo de un helicoptero en llamas."
 */

class IntroCinematic {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.timer = 0;
    this.duration = 9.0; // segundos totales
    this.active = false;

    // Estado del helicóptero en llamas
    this.heli = {
      x: -120,
      y: 160,
      vx: 180,
      vy: 20,
      rotorAngle: 0,
      smokeTimer: 0
    };

    // Estado del soldado saltando
    this.soldier = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hasJumped: false,
      parachuteOpen: false,
      landed: false,
      rollTimer: 0
    };

    this.crashExplosion = false;
    this.sirenPlayed = false;
  }

  start() {
    this.active = true;
    this.timer = 0;
    this.heli.x = -150;
    this.heli.y = 150;
    this.soldier = { x: 0, y: 0, vx: 0, vy: 0, hasJumped: false, parachuteOpen: false, landed: false, rollTimer: 0 };
    this.crashExplosion = false;

    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.remove('hidden');

    audio.ensureContext();
    audio.playSiren();
  }

  skip() {
    if (!this.active) return;
    this.finish();
  }

  finish() {
    this.active = false;
    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (this.onComplete) {
      this.onComplete();
    }
  }

  // Altura real del suelo en una posición X (la misma que usa el terreno dibujado)
  groundAt(x) {
    try {
      if (typeof world !== 'undefined' && world && typeof world.getGroundHeight === 'function') {
        return world.getGroundHeight(x);
      }
    } catch (e) { /* valor por defecto */ }
    return 640;
  }

  // Caída libre -> paracaídas -> aterrizaje exacto sobre el suelo
  updateSoldier(dt) {
    const s = this.soldier;
    if (!s.hasJumped || s.landed) return;

    if (!s.parachuteOpen) {
      s.vy += 420 * dt; // caída libre
      if (s.y > 360) {
        s.parachuteOpen = true; // abre el paracaídas a mitad de caída
      }
    } else {
      // El paracaídas frena la caída hasta una velocidad de descenso constante
      s.vy += (110 - s.vy) * Math.min(1, dt * 5);
      s.vx += (15 - s.vx) * Math.min(1, dt * 3);
    }

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    // Los pies del soldado están 23 px por debajo de su origen
    const groundY = this.groundAt(s.x);
    if (s.y + 23 >= groundY) {
      s.y = groundY - 23;
      s.vx = 0;
      s.vy = 0;
      s.landed = true;
      s.parachuteOpen = false;
      audio.playPowerup();
      if (typeof particleSystem !== 'undefined') particleSystem.createSmoke(s.x, groundY - 4, 2, -1);
    }
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    const statusEl = document.getElementById('cinematic-status');
    const subEl = document.getElementById('cinematic-subtitles');

    this.updateSoldier(dt);

    // 1. Fase 1: Helicóptero en llamas cruzando el cielo
    if (this.timer < 3.2) {
      this.heli.x += this.heli.vx * dt;
      this.heli.y += this.heli.vy * dt;
      this.heli.rotorAngle += dt * 35;

      // Generar fuego y humo constante de los motores dañados
      this.heli.smokeTimer += dt;
      if (this.heli.smokeTimer > 0.04) {
        this.heli.smokeTimer = 0;
        particleSystem.createSmoke(this.heli.x - 30, this.heli.y - 10, 3, -1);
        particleSystem.createFire(this.heli.x - 25, this.heli.y - 8, 2);
      }

      if (subEl) subEl.textContent = '"¡MAYDAY, MAYDAY! ¡IMPACTO CRÍTICO EN MOTOR TRASERO! ¡EVACÚEN AHORA!"';
    }

    // 2. Fase 2: Soldado salta del helicóptero
    else if (this.timer >= 3.2 && this.timer < 5.8) {
      if (!this.soldier.hasJumped) {
        this.soldier.hasJumped = true;
        this.soldier.x = this.heli.x + 10;
        this.soldier.y = this.heli.y + 25;
        this.soldier.vx = 45;
        this.soldier.vy = 80;
        audio.playJump();
      }

      // Helicóptero continúa cayendo en picada
      this.heli.x += (this.heli.vx * 1.2) * dt;
      this.heli.y += (this.heli.vy + 70) * dt;
      this.heli.rotorAngle += dt * 30;
      particleSystem.createSmoke(this.heli.x - 30, this.heli.y, 4, -2);
      particleSystem.createFire(this.heli.x - 20, this.heli.y, 3);

      if (statusEl) statusEl.textContent = '⚡ EVACUACIÓN DE EMERGENCIA INICIADA ⚡';
      if (subEl) subEl.textContent = 'COMANDO: "¡SALTANDO A LA SELVA! ¡COMPLETARÉ LA MISIÓN A PIE!"';
    }

    // 3. Fase 3: Helicóptero se estrella al fondo y soldado aterriza
    else if (this.timer >= 5.8 && this.timer < 7.8) {
      if (!this.crashExplosion) {
        this.crashExplosion = true;
        audio.playExplosion(2.2);
        particleSystem.createExplosion(this.heli.x + 80, 520, 130, 80);
      }

      if (statusEl) statusEl.textContent = '💥 HELICÓPTERO DESTRUIDO - INFILTRACIÓN CONFIRMADA 💥';
      if (subEl) subEl.textContent = '"¡TOCANDO TIERRA! RIFLE ASEGURADO. OBJETIVO: BASE ENEMIGA."';
    }

    // 4. Fase 4: Título y despliegue final
    else if (this.timer >= 7.8) {
      if (statusEl) statusEl.textContent = '⚔️ ¡GUERRA EN EL BOSQUE! ⚔️';
      if (subEl) subEl.textContent = '¡MISIÓN 1: PENETRA EN LA SELVA Y ARRASA CON LAS DEFENSAS!';
      if (this.timer >= this.duration) {
        this.finish();
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // 1. Dibujar helicóptero militar si sigue en pantalla
    if (this.timer < 6.2) {
      this.drawHelicopter(ctx, this.heli.x, this.heli.y, this.heli.rotorAngle);
    }

    // 2. Dibujar soldado durante su salto / descenso
    if (this.soldier.hasJumped) {
      this.drawJumpingSoldier(ctx, this.soldier.x, this.soldier.y, this.soldier.parachuteOpen);
    }

    // 3. Letrero cinemático de misión al final
    if (this.timer >= 6.5) {
      ctx.save();
      const alpha = Math.min(1, (this.timer - 6.5) / 0.8);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px "Black Ops One", cursive';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 20;
      ctx.fillText('GUERRA EN EL BOSQUE', 640, 260);

      ctx.fillStyle = '#ff9800';
      ctx.font = '700 20px "Orbitron", sans-serif';
      ctx.shadowColor = '#ff9800';
      ctx.shadowBlur = 10;
      ctx.fillText('MISIÓN 1: OPERACIÓN SELVA PROFUNDA', 640, 305);
      ctx.restore();
    }
  }

  drawHelicopter(ctx, x, y, rotorAngle) {
    ctx.save();
    ctx.translate(x, y);

    // Fuselaje del helicóptero militar verde oscuro
    ctx.fillStyle = '#1c2820';
    ctx.beginPath();
    ctx.ellipse(0, 0, 55, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2d4233';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cola del helicóptero inclinada hacia atrás
    ctx.fillStyle = '#16221a';
    ctx.beginPath();
    ctx.moveTo(-45, -6);
    ctx.lineTo(-105, -16);
    ctx.lineTo(-105, -2);
    ctx.lineTo(-45, 10);
    ctx.closePath();
    ctx.fill();

    // Rotor de cola
    ctx.fillStyle = '#333';
    ctx.fillRect(-108, -26, 4, 20);

    // Cabina acristalada con reflejo
    ctx.fillStyle = '#456b5a';
    ctx.beginPath();
    ctx.ellipse(32, -4, 16, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Puerta lateral abierta (de donde salta el soldado)
    ctx.fillStyle = '#0a100c';
    ctx.fillRect(-10, -8, 24, 26);

    // Mástil del rotor superior
    ctx.fillStyle = '#222';
    ctx.fillRect(-4, -32, 8, 12);

    // Aspas giratorias del rotor principal
    ctx.fillStyle = '#111';
    const bladeSpan = Math.cos(rotorAngle) * 90;
    ctx.fillRect(-bladeSpan, -34, bladeSpan * 2, 4);

    // Patines de aterrizaje
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-35, 34);
    ctx.lineTo(40, 34);
    ctx.moveTo(-20, 20);
    ctx.lineTo(-20, 34);
    ctx.moveTo(25, 20);
    ctx.lineTo(25, 34);
    ctx.stroke();

    // Efecto de llamas ardientes devorando el motor
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(-25, -12, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawJumpingSoldier(ctx, x, y, parachuteOpen) {
    ctx.save();
    ctx.translate(x, y);

    // Si tiene paracaídas abierto
    if (parachuteOpen) {
      // Cúpula del paracaídas militar
      ctx.fillStyle = '#405646';
      ctx.beginPath();
      ctx.arc(0, -55, 35, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#27382c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cuerdas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-32, -55);
      ctx.lineTo(0, -18);
      ctx.moveTo(32, -55);
      ctx.lineTo(0, -18);
      ctx.moveTo(-10, -55);
      ctx.lineTo(0, -18);
      ctx.moveTo(10, -55);
      ctx.lineTo(0, -18);
      ctx.stroke();
    }

    // Soldado comando
    // Cabeza con bandana roja
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -16, 7, 0, Math.PI * 2);
    ctx.fill();

    // Bandana roja ondeando
    ctx.fillStyle = '#e60000';
    ctx.fillRect(-7, -20, 14, 4);
    ctx.fillRect(-12, -20, 6, 3); // lazo ondeando al viento

    // Torso con chaleco de combate
    ctx.fillStyle = '#2d5a36';
    ctx.fillRect(-7, -9, 14, 18);

    // Pantalones
    ctx.fillStyle = '#1e3823';
    ctx.fillRect(-6, 9, 5, 14);
    ctx.fillRect(1, 9, 5, 14);

    // Rifle en las manos listo para el combate
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -4, 18, 5);

    ctx.restore();
  }
}

// ============================================================================
// CINEMÁTICA NIVEL 4: INFILTRACIÓN Y CAPTURA DEL HELICÓPTERO MILITAR
// Dos guardias cuidan un helicóptero -> El soldado llega y los elimina
// -> Dice "Esto me ayudará a llegar a su líder." -> Se sube y despega
// ============================================================================
class Level4IntroCinematic {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.timer = 0;
    this.duration = 8.5;
    this.active = false;

    this.soldier = { x: -80, y: 550, vx: 220, state: 'run' };
    this.guard1 = { x: 580, y: 550, dead: false, fallAngle: 0 };
    this.guard2 = { x: 670, y: 550, dead: false, fallAngle: 0 };
    this.heli = { x: 820, y: 490, rotorAngle: 0, rotorSpeed: 0, vy: 0, vx: 0, boarded: false };
    this.killedGuards = false;
    this.saidLine = false;
  }

  start() {
    this.active = true;
    this.timer = 0;
    this.soldier = { x: -80, y: 550, vx: 220, state: 'run' };
    this.guard1 = { x: 580, y: 550, dead: false, fallAngle: 0 };
    this.guard2 = { x: 670, y: 550, dead: false, fallAngle: 0 };
    this.heli = { x: 820, y: 490, rotorAngle: 0, rotorSpeed: 0, vy: 0, vx: 0, boarded: false };
    this.killedGuards = false;
    this.saidLine = false;

    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.remove('hidden');

    audio.ensureContext();
  }

  skip() {
    if (!this.active) return;
    this.finish();
  }

  finish() {
    this.active = false;
    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (this.onComplete) this.onComplete();
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    const statusEl = document.getElementById('cinematic-status');
    const subEl = document.getElementById('cinematic-subtitles');

    // Fase 1 (0.0s - 2.5s): Guardias patrullan frente al helicóptero y el soldado corre hacia ellos
    if (this.timer < 2.5) {
      if (statusEl) statusEl.textContent = '🎯 OBJETIVO: BASE AÉREA ENEMIGA';
      if (subEl) subEl.textContent = 'GUARDIAS: "El helicóptero táctico de asalto está abastecido y listo para el despegue."';

      this.soldier.x += this.soldier.vx * dt;
      if (this.soldier.x >= 500) {
        this.soldier.x = 500;
        this.soldier.state = 'attack';
      }
    }
    // Fase 2 (2.5s - 4.2s): El protagonista elimina a los dos guardias
    else if (this.timer >= 2.5 && this.timer < 4.2) {
      if (!this.killedGuards) {
        this.killedGuards = true;
        this.guard1.dead = true;
        this.guard2.dead = true;
        if (audio.playKnifeSlash) audio.playKnifeSlash();
        audio.playShootRifle();
        particleSystem.createBloodSpurt(this.guard1.x, this.guard1.y);
        particleSystem.createBloodSpurt(this.guard2.x, this.guard2.y);
        particleSystem.createMuzzleFlash(this.soldier.x + 20, this.soldier.y, 0);
      }

      // Caída de los guardias
      this.guard1.fallAngle = Math.min(Math.PI / 2, this.guard1.fallAngle + dt * 6);
      this.guard2.fallAngle = Math.min(Math.PI / 2, this.guard2.fallAngle + dt * 5.5);

      if (statusEl) statusEl.textContent = '⚡ GUARDIAS NEUTRALIZADOS EN SILENCIO ⚡';
      if (subEl) subEl.textContent = 'COMANDO: "Área despejada. Helicóptero enemigo asegurado."';

      // El soldado avanza hacia el helicóptero
      if (this.soldier.x < 770) {
        this.soldier.x += 160 * dt;
      }
    }
    // Fase 3 (4.2s - 6.5s): El protagonista mira el helicóptero y dice la frase requerida
    else if (this.timer >= 4.2 && this.timer < 6.5) {
      this.soldier.x = 770;
      this.soldier.state = 'idle';

      if (statusEl) statusEl.textContent = '🚁 HELICÓPTERO DE ASALTO CAPTURADO 🚁';
      if (subEl) subEl.textContent = 'COMANDO: "Esto me ayudará a llegar a su líder."';
    }
    // Fase 4 (6.5s - 8.5s): Se sube y despega hacia el cielo
    else if (this.timer >= 6.5) {
      this.heli.boarded = true;
      this.heli.rotorSpeed = Math.min(45, this.heli.rotorSpeed + dt * 25);
      this.heli.rotorAngle += this.heli.rotorSpeed * dt;

      if (this.timer >= 7.0) {
        this.heli.vy -= 180 * dt;
        this.heli.vx += 260 * dt;
        this.heli.y += this.heli.vy * dt;
        this.heli.x += this.heli.vx * dt;
        particleSystem.createSmoke(this.heli.x - 30, this.heli.y + 10, 2, -1);
      }

      if (statusEl) statusEl.textContent = '⚔️ ¡COMBATE AÉREO EN CURSO! ⚔️';
      if (subEl) subEl.textContent = 'COMANDO: "¡Rumbo a la fortaleza del líder supremo! ¡Todos los sistemas armados!"';

      if (this.timer >= this.duration) {
        this.finish();
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // Helipuerto / Plataforma de aterrizaje
    ctx.fillStyle = '#263238';
    ctx.fillRect(450, 570, 500, 24);
    ctx.strokeStyle = '#ffd600';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(460, 572, 480, 20);
    ctx.setLineDash([]);

    // Círculo 'H' del helipuerto
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(820, 582, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('H', 820, 592);

    // Dibujar guardias
    this.drawGuard(ctx, this.guard1.x, this.guard1.y, this.guard1.fallAngle);
    this.drawGuard(ctx, this.guard2.x, this.guard2.y, this.guard2.fallAngle);

    // Dibujar soldado si aún no se sube
    if (!this.heli.boarded) {
      this.drawSoldier(ctx, this.soldier.x, this.soldier.y);
    }

    // Dibujar helicóptero
    this.drawHelicopter(ctx, this.heli.x, this.heli.y, this.heli.rotorAngle);
  }

  drawGuard(ctx, x, y, fallAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(fallAngle);

    // Torso enemigo
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-8, -25, 16, 25);
    // Casco
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(0, -32, 7, 0, Math.PI * 2);
    ctx.fill();
    // Rifle en el suelo o mano
    ctx.fillStyle = '#111';
    ctx.fillRect(4, -18, 16, 4);

    ctx.restore();
  }

  drawSoldier(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Torso con chaleco verde
    ctx.fillStyle = '#395e3f';
    ctx.fillRect(-9, -24, 18, 24);

    // Cabeza y bandana roja
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -32, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-8, -36, 16, 4);
    ctx.fillRect(-14, -36, 6, 3); // lazo de la bandana

    // Rifle o cuchillo
    ctx.fillStyle = '#111';
    ctx.fillRect(4, -18, 20, 5);

    ctx.restore();
  }

  drawHelicopter(ctx, x, y, rotorAngle) {
    ctx.save();
    ctx.translate(x, y);

    // Fuselaje camuflaje militar
    ctx.fillStyle = '#1e3324';
    ctx.beginPath();
    ctx.ellipse(0, 0, 75, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#386343';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cola y timón
    ctx.fillStyle = '#16281c';
    ctx.beginPath();
    ctx.moveTo(-60, -8);
    ctx.lineTo(-145, -20);
    ctx.lineTo(-145, -5);
    ctx.lineTo(-60, 14);
    ctx.closePath();
    ctx.fill();

    // Rotor de cola
    ctx.fillStyle = '#222';
    ctx.fillRect(-148, -34, 5, 28);

    // Cabina acristalada con tinte cian
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(40, -6, 24, 16, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Piloto adentro si está abordado
    if (this.heli.boarded) {
      ctx.fillStyle = '#ff1744'; // bandana roja visible tras el cristal
      ctx.fillRect(42, -10, 8, 4);
    }

    // Minigun delantera
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(58, 12, 26, 6);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(84, 13, 8, 4);

    // Lanzacohetes montados en los alerones
    ctx.fillStyle = '#334155';
    ctx.fillRect(-10, 20, 36, 10);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(26, 22, 6, 6);

    // Mástil de rotor principal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6, -42, 12, 14);

    // Aspas giratorias del rotor
    const span = Math.cos(rotorAngle) * 120;
    ctx.fillStyle = '#090d0b';
    ctx.fillRect(-span, -45, span * 2, 5);

    // Patines de aterrizaje
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-50, 44);
    ctx.lineTo(60, 44);
    ctx.moveTo(-25, 26);
    ctx.lineTo(-25, 44);
    ctx.moveTo(35, 26);
    ctx.lineTo(35, 44);
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================================
// CINEMÁTICA NIVEL 5: LLEGADA AL TEMPLO ANCESTRAL
// El soldado pilota el helicóptero, aterriza en el suelo, se baja -> Dice "Por fin he llegado hasta tu ubicación, malvado."
// ============================================================================
class Level5IntroCinematic {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.duration = 9.5;
    this.active = false;
    this.reset();
  }

  reset() {
    this.timer = 0;
    // El soldado pilota el helicóptero: llega volando, desciende y aterriza
    this.heli = { x: -120, y: 380, startY: 380, rotorAngle: 0, rotorSpeed: 38, landed: false };
    // El soldado empieza dentro de la cabina y luego baja caminando al suelo
    this.soldier = { x: 0, exited: false, targetX: 0 };
    this.dustTimer = 0;
  }

  // Altura real del suelo (misma que usa el terreno dibujado)
  groundAt(x) {
    try {
      if (typeof world !== 'undefined' && world && typeof world.getGroundHeight === 'function') {
        return world.getGroundHeight(x);
      }
    } catch (e) { /* valor por defecto */ }
    return 640;
  }

  // Y del centro del helicóptero cuando los patines tocan el suelo
  landedHeliY() {
    return this.groundAt(320) - 46;
  }

  start() {
    this.active = true;
    this.reset();

    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.remove('hidden');

    audio.ensureContext();
  }

  skip() {
    if (!this.active) return;
    this.finish();
  }

  finish() {
    this.active = false;
    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (this.onComplete) this.onComplete();
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    this.heli.rotorAngle += dt * this.heli.rotorSpeed;
    const statusEl = document.getElementById('cinematic-status');
    const subEl = document.getElementById('cinematic-subtitles');
    const landY = this.landedHeliY();

    // Fase 1 (0.0s - 3.0s): El soldado pilota el helicóptero hacia las ruinas del templo
    if (this.timer < 3.0) {
      const t = this.timer / 3.0;
      const ease = 1 - Math.pow(1 - t, 2);
      this.heli.x = -120 + (320 + 120) * ease;
      if (statusEl) statusEl.textContent = '🏛️ OPERACIÓN FINAL: TEMPLO ANCESTRAL';
      if (subEl) subEl.textContent = 'PILOTO COMANDO: "Aterrizaje en el santuario exterior. El líder enemigo está adentro."';
    }
    // Fase 2 (3.0s - 5.2s): El helicóptero desciende y aterriza en el suelo
    else if (this.timer < 5.2) {
      const t = (this.timer - 3.0) / 2.2;
      const ease = t * t * (3 - 2 * t); // descenso suave
      this.heli.x = 320;
      this.heli.y = this.heli.startY + (landY - this.heli.startY) * ease;

      // Polvo levantado por el rotor al acercarse al suelo
      this.dustTimer -= dt;
      if (t > 0.6 && this.dustTimer <= 0 && typeof particleSystem !== 'undefined') {
        this.dustTimer = 0.12;
        particleSystem.createSmoke(this.heli.x - 40 + Math.random() * 80, this.groundAt(320) - 4, 2, -1);
      }

      if (statusEl) statusEl.textContent = '🚁 DESCENSO CONTROLADO 🚁';
      if (subEl) subEl.textContent = 'COMANDO: "Descendiendo... contacto con el suelo en tres, dos, uno."';
    }
    // Fase 3 (5.2s - 6.6s): Aterrizó; el soldado se baja y camina hacia adelante
    else if (this.timer < 6.6) {
      this.heli.x = 320;
      this.heli.y = landY;
      this.heli.landed = true;
      this.heli.rotorSpeed = Math.max(8, this.heli.rotorSpeed - dt * 18); // el rotor va frenando

      if (!this.soldier.exited) {
        this.soldier.exited = true;
        this.soldier.x = this.heli.x + 30;
        this.soldier.targetX = this.heli.x + 150;
        audio.playJump();
      }
      if (this.soldier.x < this.soldier.targetX) {
        this.soldier.x = Math.min(this.soldier.targetX, this.soldier.x + 110 * dt);
      }

      if (statusEl) statusEl.textContent = '⚡ DESPLIEGUE TÁCTICO INICIADO ⚡';
      if (subEl) subEl.textContent = 'COMANDO: "¡Aterrizaje completado! Sigo a pie desde aquí."';
    }
    // Fase 4 (6.6s - 9.5s): Se detiene, mira al frente y dice la frase
    else {
      this.heli.y = landY;
      this.heli.rotorSpeed = Math.max(8, this.heli.rotorSpeed - dt * 18);
      if (this.soldier.x < this.soldier.targetX) {
        this.soldier.x = Math.min(this.soldier.targetX, this.soldier.x + 110 * dt);
      }

      if (statusEl) statusEl.textContent = '👁️ ENFRENTAMIENTO CON EL COMANDANTE MALVADO 👁️';
      if (subEl) subEl.textContent = 'COMANDO: "Por fin he llegado hasta tu ubicación, malvado."';

      if (this.timer >= this.duration) {
        this.finish();
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // Helicóptero (con el soldado dentro hasta que se baja)
    this.drawHelicopter(ctx, this.heli.x, this.heli.y, this.heli.rotorAngle, !this.soldier.exited);

    // Soldado fuera del helicóptero, con los pies sobre el suelo
    if (this.soldier.exited) {
      this.drawSoldier(ctx, this.soldier.x, this.groundAt(this.soldier.x));
    }
  }

  drawSoldier(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y); // y = línea del suelo (pies)

    // Sombra bajo los pies
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piernas
    ctx.fillStyle = '#1e3823';
    ctx.fillRect(-6, -14, 5, 14);
    ctx.fillRect(1, -14, 5, 14);

    // Torso con chaleco
    ctx.fillStyle = '#395e3f';
    ctx.fillRect(-9, -34, 18, 22);

    // Cabeza y bandana roja
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -42, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-8, -46, 16, 4);
    ctx.fillRect(-15, -46, 7, 3);

    // Rifle de asalto
    ctx.fillStyle = '#111';
    ctx.fillRect(4, -28, 22, 5);

    ctx.restore();
  }

  drawHelicopter(ctx, x, y, rotorAngle, pilotInside) {
    ctx.save();
    ctx.translate(x, y);

    // Cola
    ctx.fillStyle = '#16281c';
    ctx.beginPath();
    ctx.moveTo(-55, -8);
    ctx.lineTo(-125, -18);
    ctx.lineTo(-125, -4);
    ctx.lineTo(-55, 12);
    ctx.closePath();
    ctx.fill();

    // Fuselaje
    ctx.fillStyle = '#1e3324';
    ctx.beginPath();
    ctx.ellipse(0, 0, 70, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabina
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(36, -6, 22, 14, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Piloto (el soldado) visible tras el cristal mientras no se ha bajado
    if (pilotInside) {
      ctx.fillStyle = '#e0a96d';
      ctx.beginPath();
      ctx.arc(38, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(32, -12, 12, 3);
    }

    // Mástil y aspas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6, -36, 12, 8);
    const span = Math.cos(rotorAngle) * 110;
    ctx.fillStyle = '#090d0b';
    ctx.fillRect(-span, -40, span * 2, 4);

    // Patines de aterrizaje (la parte inferior queda en y = +46)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-50, 44);
    ctx.lineTo(60, 44);
    ctx.moveTo(-25, 26);
    ctx.lineTo(-25, 44);
    ctx.moveTo(35, 26);
    ctx.lineTo(35, 44);
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================================
// CINEMÁTICA FINAL NIVEL 5: VICTORIA DEFINITIVA
// Soldado mirando el cadáver del comandante malvado en el suelo
// Llegan cuatro helicópteros aliados para extracción y fin del juego
// ============================================================================
class Level5VictoryCinematic {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.timer = 0;
    this.duration = 9.5;
    this.active = false;

    // Cuatro helicópteros aliados que llegan del cielo
    this.helis = [
      { x: -150, y: 120, targetX: 240, targetY: 150, speed: 190, rotorAngle: 0 },
      { x: -280, y: 220, targetX: 490, targetY: 190, speed: 210, rotorAngle: 0 },
      { x: 1420, y: 140, targetX: 820, targetY: 160, speed: -190, rotorAngle: 0 },
      { x: 1550, y: 240, targetX: 1060, targetY: 200, speed: -210, rotorAngle: 0 }
    ];

    // Las posiciones X son fijas; la Y (pies) se calcula siempre desde el suelo real del mundo
    this.soldierX = 640;
    this.bossX = 730;
  }

  // Altura real del suelo en una posición X (la misma que usa el terreno dibujado)
  groundAt(x) {
    try {
      if (typeof world !== 'undefined' && world && typeof world.getGroundHeight === 'function') {
        return world.getGroundHeight(x);
      }
    } catch (e) { /* si falla, usa el valor por defecto */ }
    return 640;
  }

  start() {
    this.active = true;
    this.timer = 0;
    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.remove('hidden');

    audio.ensureContext();
    audio.playVictoryMusic();
  }

  skip() {
    if (!this.active) return;
    this.finish();
  }

  finish() {
    this.active = false;
    const overlay = document.getElementById('cinematic-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (this.onComplete) this.onComplete();
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    const statusEl = document.getElementById('cinematic-status');
    const subEl = document.getElementById('cinematic-subtitles');

    // Movimiento y rotores de los 4 helicópteros aliados
    for (const h of this.helis) {
      h.rotorAngle += dt * 38;
      if (Math.abs(h.x - h.targetX) > 10) {
        h.x += h.speed * dt;
      }
    }

    // Fase 1 (0.0s - 4.0s): El soldado parado mirando el cuerpo inerte del comandante
    if (this.timer < 4.0) {
      if (statusEl) statusEl.textContent = '⚔️ COMANDANTE MALVADO ANIQUILADO ⚔️';
      if (subEl) subEl.textContent = 'COMANDO: "Se acabó... La tiranía ha caído para siempre. El bosque y el mundo están a salvo."';
    }
    // Fase 2 (4.0s - 9.5s): Llegan sus compañeros en los 4 helicópteros para rescatarlo
    else {
      if (statusEl) statusEl.textContent = '🚁 ESCUADRÓN ALIADO: EXTRACCIÓN Y VICTORIA TOTAL 🚁';
      if (subEl) subEl.textContent = 'ESCUADRÓN ÁGUILA: "¡Aquí Base Comando! ¡Misión cumplida, soldado! ¡Sube a bordo, volvemos a casa!"';

      if (this.timer >= this.duration) {
        this.finish();
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    const soldierGround = this.groundAt(this.soldierX);
    const bossGround = this.groundAt(this.bossX);

    // 1. Dibujar el cadáver del comandante malvado en el suelo
    this.drawDefeatedCommander(ctx, this.bossX, bossGround);

    // 2. Dibujar el soldado comando parado mirando hacia el comandante
    this.drawStandingSoldier(ctx, this.soldierX, soldierGround);

    // 3. Dibujar los cuatro helicópteros aliados volando y haciendo foco
    for (const h of this.helis) {
      this.drawAlliedHelicopter(ctx, h.x, h.y, h.rotorAngle);
    }

    // 4. Luces de búsqueda de los helicópteros proyectadas al suelo
    if (this.timer > 3.5) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      const lightY = soldierGround - 6;
      const grad = ctx.createRadialGradient(this.soldierX + 45, lightY, 10, this.soldierX + 45, lightY, 160);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(this.soldierX - 120, soldierGround - 140, 340, 160);
      ctx.restore();
    }
  }

  drawDefeatedCommander(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y); // y = línea del suelo

    // Sombra / charco bajo el cuerpo (apoyado justo sobre el suelo)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 54, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo inerte del comandante tendido horizontalmente en el suelo
    ctx.fillStyle = '#1e293b'; // Capote militar oscuro
    ctx.fillRect(-35, -12, 65, 12);

    // Botas militares
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(30, -10, 14, 10);

    // Cabeza del comandante en el suelo con ojos apagados
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.arc(-42, -8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Gorra de oficial militar caída a un lado
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(-56, -6, 14, 6);
    ctx.fillStyle = '#ffd700'; // insignia dorada
    ctx.fillRect(-51, -5, 4, 3);

    ctx.restore();
  }

  drawStandingSoldier(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y); // y = línea del suelo (pies)

    // Sombra bajo los pies
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piernas
    ctx.fillStyle = '#1e3823';
    ctx.fillRect(-6, -18, 5, 18);
    ctx.fillRect(1, -18, 5, 18);

    // Torso con chaleco
    ctx.fillStyle = '#395e3f';
    ctx.fillRect(-8, -38, 16, 22);

    // Cabeza y bandana roja
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -46, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-7, -50, 14, 4);
    ctx.fillRect(-12, -50, 5, 3);

    // Rifle descansando hacia abajo en señal de misión terminada
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -32, 6, 24);

    ctx.restore();
  }

  drawAlliedHelicopter(ctx, x, y, rotorAngle) {
    ctx.save();
    ctx.translate(x, y);

    // Fuselaje militar verde oliva
    ctx.fillStyle = '#2d4734';
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#436d4f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cola
    ctx.fillStyle = '#223829';
    ctx.beginPath();
    ctx.moveTo(-45, -6);
    ctx.lineTo(-100, -14);
    ctx.lineTo(-100, -2);
    ctx.lineTo(-45, 10);
    ctx.closePath();
    ctx.fill();

    // Rotor de cola
    ctx.fillStyle = '#111';
    ctx.fillRect(-102, -22, 4, 18);

    // Cabina acristalada
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.ellipse(30, -4, 16, 11, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Estrella aliada blanca en el lateral
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', -5, 5);

    // Aspas giratorias del rotor principal
    const bladeSpan = Math.cos(rotorAngle) * 95;
    ctx.fillStyle = '#111';
    ctx.fillRect(-bladeSpan, -32, bladeSpan * 2, 4);

    ctx.restore();
  }
}
