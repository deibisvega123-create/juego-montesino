/**
 * GUERRA EN EL BOSQUE - SISTEMA DE ARMAS Y PROYECTILES
 * Maneja el arsenal táctico: Rifle estándar, Disparo Disperso (S),
 * Ametralladora (M), Rayo Láser (L), Lanzacohetes (R) y Lanzallamas (F).
 */

const WEAPON_TYPES = {
  RIFLE: {
    id: 'RIFLE',
    name: 'RIFLE DE ASALTO',
    letter: 'R',
    fireRate: 0.16, // segundos entre disparos
    damage: 22,
    speed: 16,
    spread: 0.04,
    pellets: 1,
    ammo: Infinity,
    color: '#ffee66',
    icon: '🔫'
  },
  SPREAD: {
    id: 'SPREAD',
    name: 'DISPARO DISPERSO (S)',
    letter: 'S',
    fireRate: 0.28,
    damage: 18,
    speed: 14,
    spread: 0.35, // abanico de 5 proyectiles
    pellets: 5,
    ammo: 50,
    color: '#ff4444',
    icon: '💥'
  },
  MACHINEGUN: {
    id: 'MACHINEGUN',
    name: 'AMETRALLADORA PESADA (M)',
    letter: 'M',
    fireRate: 0.08, // fuego rápido continuo
    damage: 16,
    speed: 18,
    spread: 0.08,
    pellets: 1,
    ammo: 150,
    color: '#ffaa00',
    icon: '⚡'
  },
  LASER: {
    id: 'LASER',
    name: 'RAYO LÁSER PENETRANTE (L)',
    letter: 'L',
    fireRate: 0.22,
    damage: 42,
    speed: 24,
    spread: 0.01,
    pellets: 1,
    piercing: true,
    ammo: 40,
    color: '#00ffff',
    icon: '💠'
  },
  ROCKET: {
    id: 'ROCKET',
    name: 'LANZACOHETES RPG (R)',
    letter: 'R',
    fireRate: 0.45,
    damage: 90,
    speed: 11,
    spread: 0.02,
    pellets: 1,
    explosive: true,
    explosionRadius: 65,
    ammo: 25,
    color: '#ff5722',
    icon: '🚀'
  },
  FLAMETHROWER: {
    id: 'FLAMETHROWER',
    name: 'LANZALLAMAS DE SELVA (F)',
    letter: 'F',
    fireRate: 0.06,
    damage: 10,
    speed: 9,
    spread: 0.25,
    pellets: 2,
    isFlame: true,
    range: 220,
    ammo: 120,
    color: '#ff7700',
    icon: '🔥'
  },
  TANK_CANNON: {
    id: 'TANK_CANNON',
    name: 'CAÑÓN DE TANQUE 120MM',
    fireRate: 0.75,
    damage: 180,
    speed: 22,
    spread: 0.01,
    pellets: 1,
    explosive: true,
    explosionRadius: 90,
    ammo: Infinity,
    color: '#ffe066',
    icon: '🛡️'
  }
};

class Projectile {
  constructor(x, y, vx, vy, type, owner = 'player', customDamage = null) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.owner = owner; // 'player', 'enemy', 'tank'
    this.damage = customDamage || type.damage || 20;
    this.radius = type.explosive ? 6 : (type.isFlame ? 8 : (owner === 'enemy' ? 5 : 4));
    this.distanceTraveled = 0;
    this.maxDistance = type.range || 1400;
    this.dead = false;
    this.pierceCount = type.piercing ? 3 : 1;
    this.smokeTimer = 0;
    this.pulseTimer = Math.random() * Math.PI * 2;
    this.isBomb = false;
  }

  update(dt, world) {
    if (this.dead) return false;

    this.pulseTimer += dt * 10;
    const stepX = this.vx * dt * 60;
    const stepY = this.vy * dt * 60;
    this.x += stepX;
    this.y += stepY;
    this.distanceTraveled += Math.hypot(stepX, stepY);

    // Efectos por tipo
    if (this.type.explosive) {
      this.smokeTimer += dt;
      if (this.smokeTimer > 0.03) {
        this.smokeTimer = 0;
        particleSystem.createSmoke(this.x - this.vx * 0.4, this.y - this.vy * 0.4, 2, 0);
        particleSystem.createFire(this.x - this.vx * 0.4, this.y - this.vy * 0.4, 1);
      }
    } else if (this.type.isFlame) {
      this.radius += dt * 35; // Se expande conforme viaja
      particleSystem.createFire(this.x, this.y, 2);
    }

    // Comprobación de distancia máxima
    if (this.distanceTraveled > this.maxDistance) {
      this.dead = true;
      return false;
    }

    // Colisión con terreno sólido
    if (world && world.isSolid(this.x, this.y)) {
      this.onImpact(world);
      return false;
    }

    return true;
  }

  onImpact(world) {
    this.dead = true;
    if (this.type.explosive) {
      audio.playExplosion(this.type.id === 'TANK_CANNON' ? 1.4 : 1.0);
      particleSystem.createExplosion(this.x, this.y, this.type.explosionRadius || 60, 40);
      if (world && world.onExplosion) {
        world.onExplosion(this.x, this.y, this.type.explosionRadius || 60, this.damage);
      }
    } else if (this.type.isFlame) {
      particleSystem.createFire(this.x, this.y, 8);
    } else {
      particleSystem.createSparks(this.x, this.y, -this.vx, -this.vy, 6, this.owner === 'enemy' ? '#ff3344' : this.type.color);
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();

    // PROYECTILES ENEMIGOS: ULTRA-LEGIBLES, BRILLANTES Y DIFERENCIADOS
    if (this.owner === 'enemy') {
      if (this.type.explosive || this.isBomb) {
        // Misil o Bomba enemiga: forma de ojiva con alerta luminosa intermitente
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(rx, ry);
        ctx.rotate(angle);

        // Ojiva y cuerpo de misil
        ctx.fillStyle = '#263238';
        ctx.fillRect(-12, -4, 20, 8);
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.moveTo(8, -5);
        ctx.lineTo(16, 0);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();

        // Banda amarilla de peligro militar
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(-4, -4, 4, 8);

        // Luz propulsora / estela de advertencia
        ctx.fillStyle = '#ff5722';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-13, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Balas de infantería/torretas enemigas: Orbe de plasma carmesí/naranja brillante
        const pulse = Math.sin(this.pulseTimer) * 1.2;
        const rad = Math.max(3.5, this.radius + pulse);

        // 1. Estela de peligro roja visible
        ctx.strokeStyle = 'rgba(255, 23, 68, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - this.vx * 1.5, ry - this.vy * 1.5);
        ctx.stroke();

        // 2. Halo exterior brillante de peligro
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(rx, ry, rad, 0, Math.PI * 2);
        ctx.fill();

        // 3. Núcleo central amarillo-blanco (contraste instantáneo contra fondo verde)
        ctx.fillStyle = '#ffff55';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffff55';
        ctx.beginPath();
        ctx.arc(rx, ry, rad * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    // PROYECTILES DEL JUGADOR
    if (this.type.id === 'LASER') {
      // Rayo láser brillante
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(rx - this.vx * 1.5, ry - this.vy * 1.5);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    } else if (this.type.explosive) {
      // Cohete o proyectil de cañón
      const angle = Math.atan2(this.vy, this.vx);
      ctx.translate(rx, ry);
      ctx.rotate(angle);
      ctx.fillStyle = '#444';
      ctx.fillRect(-12, -4, 20, 8);
      ctx.fillStyle = this.type.id === 'TANK_CANNON' ? '#ffe066' : '#ff4444';
      ctx.beginPath();
      ctx.moveTo(8, -4);
      ctx.lineTo(16, 0);
      ctx.lineTo(8, 4);
      ctx.fill();
    } else if (this.type.isFlame) {
      // Bola de fuego translúcida
      ctx.globalAlpha = 0.7;
      const gradient = ctx.createRadialGradient(rx, ry, 2, rx, ry, this.radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#ffcc00');
      gradient.addColorStop(0.7, '#ff3300');
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(rx, ry, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Bala estándar o dispersa del jugador
      ctx.fillStyle = this.type.color || '#ffee55';
      ctx.shadowColor = this.type.color || '#ffee55';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(rx, ry, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Estela
      ctx.strokeStyle = this.type.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - this.vx * 0.8, ry - this.vy * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }
}
