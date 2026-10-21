/**
 * GUERRA EN EL BOSQUE - SISTEMA DE PARTÍCULAS
 * Efectos visuales de explosiones, humo, fuego, casquillos, hojas de la selva y chispas.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, decay, gravity = 0, drag = 1, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life;
    this.maxLife = life;
    this.decay = decay;
    this.gravity = gravity;
    this.drag = drag;
    this.shape = shape; // circle, square, spark, shell, leaf
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.alpha = 1;
  }

  update(dt) {
    this.life -= this.decay * dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.rotation += this.rotSpeed * dt * 60;

    return this.life > 0;
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, this.alpha));
    ctx.translate(rx, ry);
    ctx.rotate(this.rotation);

    if (this.shape === 'circle') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * this.alpha, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      ctx.fillStyle = this.color;
      const s = this.size * this.alpha;
      ctx.fillRect(-s / 2, -s / 2, s, s);
    } else if (this.shape === 'spark') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.size * 0.5);
      ctx.beginPath();
      ctx.moveTo(-this.size, 0);
      ctx.lineTo(this.size, 0);
      ctx.stroke();
    } else if (this.shape === 'shell') {
      // Casquillo de bala dorado
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(-4, -1.5, 8, 3);
      ctx.fillStyle = '#b38f00';
      ctx.fillRect(-4, -1.5, 2, 3);
    } else if (this.shape === 'leaf') {
      // Hoja de la jungla que se desprende
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class Shockwave {
  constructor(x, y, maxRadius = 80, speed = 180, color = 'rgba(255, 255, 255, 0.8)') {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = maxRadius;
    this.speed = speed;
    this.color = color;
    this.alpha = 1;
  }

  update(dt) {
    this.radius += this.speed * dt;
    this.alpha = Math.max(0, 1 - (this.radius / this.maxRadius));
    return this.radius < this.maxRadius;
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, 4 * this.alpha);
    ctx.beginPath();
    ctx.arc(rx, ry, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      if (!this.shockwaves[i].update(dt)) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx, camera) {
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].draw(ctx, camera);
    }
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx, camera);
    }
  }

  clear() {
    this.particles = [];
    this.shockwaves = [];
  }

  createExplosion(x, y, radius = 40, count = 35) {
    this.shockwaves.push(new Shockwave(x, y, radius * 2.2, 220, '#ffaa33'));

    const colors = ['#ffffff', '#ffeb3b', '#ff9800', '#ff5722', '#d32f2f', '#424242', '#212121'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 6 + 2) * (radius / 30);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 1.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      const life = Math.random() * 0.6 + 0.4;
      const decay = 1;
      const gravity = 2.5;
      const drag = 0.94;
      const shape = Math.random() > 0.4 ? 'circle' : 'square';

      this.particles.push(new Particle(x, y, vx, vy, color, size, life, decay, gravity, drag, shape));
    }

    // Humo denso residual
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 0.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2;
      const color = Math.random() > 0.5 ? '#333333' : '#555555';
      this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 12 + 6, 1.2, 0.8, -0.5, 0.97, 'circle'));
    }
  }

  createSparks(x, y, dirX = 0, dirY = -1, count = 10, color = '#ffeb3b') {
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 5 + 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 4 + 2, 0.3, 1.5, 3, 0.92, 'spark'));
    }
  }

  createFire(x, y, count = 5) {
    const fireColors = ['#ffeb3b', '#ff9800', '#ff3d00', '#d50000'];
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 1.5;
      const vy = -(Math.random() * 3 + 1.5);
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 6 + 3, 0.5, 1.2, -1, 0.96, 'circle'));
    }
  }

  createSmoke(x, y, count = 3, velY = -1.5) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 1.2;
      const vy = velY + (Math.random() - 0.5) * 0.8;
      const grey = Math.floor(Math.random() * 60 + 50);
      const color = `rgb(${grey},${grey},${grey})`;
      this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 10 + 5, 0.9, 0.7, -0.3, 0.98, 'circle'));
    }
  }

  createMuzzleFlash(x, y, angle) {
    // Destello de boca de fuego
    this.particles.push(new Particle(
      x + Math.cos(angle) * 8,
      y + Math.sin(angle) * 8,
      0, 0, '#ffffff', 14, 0.05, 1, 0, 1, 'circle'
    ));
    this.particles.push(new Particle(
      x + Math.cos(angle) * 12,
      y + Math.sin(angle) * 12,
      0, 0, '#ffaa00', 10, 0.08, 1, 0, 1, 'circle'
    ));
  }

  createShellCasing(x, y, facing = 1) {
    const vx = -facing * (Math.random() * 2.5 + 1.5);
    const vy = -(Math.random() * 3 + 2);
    this.particles.push(new Particle(x, y, vx, vy, '#ffcc00', 4, 0.8, 1, 8, 0.98, 'shell'));
  }

  createLeafDebris(x, y, count = 6) {
    const greens = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#1b4332'];
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 4;
      const vy = -(Math.random() * 3 + 1);
      const color = greens[Math.floor(Math.random() * greens.length)];
      this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 4 + 2, 1.2, 0.6, 2, 0.95, 'leaf'));
    }
  }

  createCoinSparkle(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const vx = Math.cos(angle) * 2;
      const vy = Math.sin(angle) * 2;
      this.particles.push(new Particle(x, y, vx, vy, '#ffee55', 3, 0.4, 1.5, 0, 0.9, 'spark'));
    }
  }

  createBloodSpurt(x, y, dirX = 0, dirY = -1) {
    for (let i = 0; i < 7; i++) {
      const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 1.2;
      const speed = Math.random() * 4 + 1.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.particles.push(new Particle(x, y, vx, vy, '#b71c1c', Math.random() * 4 + 2, 0.4, 1.5, 4, 0.95, 'circle'));
    }
  }
}

const particleSystem = new ParticleSystem();
