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
    this.soldier.hasJumped = false;
    this.soldier.parachuteOpen = false;
    this.soldier.landed = false;
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

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    const statusEl = document.getElementById('cinematic-status');
    const subEl = document.getElementById('cinematic-subtitles');

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

      // Física del soldado cayendo
      this.soldier.vy += 220 * dt;
      this.soldier.x += this.soldier.vx * dt;
      this.soldier.y += this.soldier.vy * dt;

      // Abre paracaídas táctico a mitad de caída
      if (this.soldier.y > 360 && !this.soldier.parachuteOpen) {
        this.soldier.parachuteOpen = true;
        this.soldier.vy = 95; // frena la caída
      }

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

      // Soldado llega al suelo
      if (!this.soldier.landed) {
        this.soldier.y += 90 * dt;
        if (this.soldier.y >= 590) {
          this.soldier.y = 590;
          this.soldier.landed = true;
          this.soldier.parachuteOpen = false;
          audio.playPowerup();
        }
      }

      if (statusEl) statusEl.textContent = '💥 HELICÓPTERO DESTRUIDO - INFILTRACIÓN CONFIRMADA 💥';
      if (subEl) subEl.textContent = '"¡TOCANDO TIERRA! RIFLE ASEGURADO. OBJETIVO: BASE ENEMIGA."';
    }

    // 4. Fase 4: Título y despliegue final
    else if (this.timer >= 7.8) {
      if (statusEl) statusEl.textContent = '⚔️ ¡GUERRA EN EL BOSQUE! ⚔️';
      if (subEl) subEl.textContent = '¡MISIÓN 1: PENETRA EN LA SELVA Y ARRASEN CON LAS DEFENSAS!';
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
