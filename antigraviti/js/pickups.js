/**
 * GUERRA EN EL BOSQUE - SISTEMA DE OBJETOS RECOGIBLES Y CAJAS DE SUMINISTROS
 * Cajas de armas especiales (S, M, L, R, F), monedas arrojadas por enemigos
 * y botiquines médicos militares.
 */

class WeaponCrate {
  constructor(x, y, weaponTypeKey = null, isFloating = false) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 32;
    this.isFloating = isFloating;
    this.floatTimer = Math.random() * Math.PI;
    this.vy = isFloating ? 0 : 0;
    this.hp = 1; // se abre al contacto o con 1 disparo
    this.dead = false;

    // Asignar tipo de arma
    const availableKeys = ['SPREAD', 'MACHINEGUN', 'LASER', 'ROCKET', 'FLAMETHROWER'];
    this.weaponKey = weaponTypeKey || availableKeys[Math.floor(Math.random() * availableKeys.length)];
    this.weaponData = WEAPON_TYPES[this.weaponKey];
    this.shineTimer = 0;
  }

  update(dt, world, player) {
    if (this.dead) return false;

    this.shineTimer += dt;

    if (this.isFloating) {
      this.floatTimer += dt * 3;
      this.y += Math.sin(this.floatTimer) * 0.4;
    } else {
      // Gravedad si está en el suelo
      this.vy += 25 * dt;
      this.y += this.vy * dt * 60;
      if (world && world.isSolid(this.x, this.y + 16)) {
        this.y = Math.floor((this.y + 16) / world.tileSize) * world.tileSize - 16;
        this.vy = 0;
      }
    }

    // Colisión con el jugador
    if (player && !player.dead) {
      if (
        Math.abs(player.x - this.x) < 28 &&
        Math.abs(player.y - this.y) < 32
      ) {
        this.collect(player);
        return false;
      }
    }

    return true;
  }

  takeDamage(amount, player) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0 && player) {
      this.collect(player);
    }
  }

  collect(player) {
    if (this.dead) return;
    this.dead = true;
    audio.playPowerup();
    particleSystem.createExplosion(this.x, this.y, 25, 20);
    particleSystem.createSparks(this.x, this.y, 0, -1, 15, this.weaponData.color);

    if (player) {
      player.equipWeapon(this.weaponData);
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Halo pulsante
    const glow = Math.sin(this.shineTimer * 6) * 0.3 + 0.7;
    ctx.shadowColor = this.weaponData.color;
    ctx.shadowBlur = 12 * glow;

    // Caja metálica militar
    ctx.fillStyle = '#263238';
    ctx.fillRect(rx - 16, ry - 16, 32, 32);

    ctx.strokeStyle = this.weaponData.color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rx - 16, ry - 16, 32, 32);

    // Esquinas reforzadas
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(rx - 16, ry - 16, 6, 6);
    ctx.fillRect(rx + 10, ry - 16, 6, 6);
    ctx.fillRect(rx - 16, ry + 10, 6, 6);
    ctx.fillRect(rx + 10, ry + 10, 6, 6);

    // Letra de arma retro (S, M, L, R, F)
    ctx.fillStyle = this.weaponData.color;
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.weaponData.letter, rx, ry + 1);

    // Si es flotante, dibujar paracaídas o cápsula
    if (this.isFloating) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx - 14, ry - 16);
      ctx.lineTo(rx - 18, ry - 32);
      ctx.moveTo(rx + 14, ry - 16);
      ctx.lineTo(rx + 18, ry - 32);
      ctx.stroke();

      // Paracaídas militar
      ctx.fillStyle = '#455a64';
      ctx.beginPath();
      ctx.arc(rx, ry - 32, 20, Math.PI, 0);
      ctx.fill();
    }

    ctx.restore();
  }
}

class Coin {
  constructor(x, y, value = 100) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = -(Math.random() * 6 + 4);
    this.value = value;
    this.radius = 8;
    this.spin = Math.random() * Math.PI;
    this.life = 12.0; // segundos antes de desaparecer
    this.bounces = 0;
    this.dead = false;
  }

  update(dt, world, player) {
    if (this.dead) return false;

    this.life -= dt;
    if (this.life <= 0) return false;

    this.spin += dt * 8;
    this.vy += 22 * dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.98;

    // Rebote con suelo
    if (world && world.isSolid(this.x, this.y + this.radius)) {
      this.y = Math.floor((this.y + this.radius) / world.tileSize) * world.tileSize - this.radius;
      this.vy = -this.vy * 0.55;
      this.vx *= 0.8;
      this.bounces++;
      if (Math.abs(this.vy) < 0.5) this.vy = 0;
    }

    // Magnetismo suave hacia el jugador si está cerca
    if (player && !player.dead) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < 80) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * 7;
        this.y += Math.sin(angle) * 7;
      }
      if (dist < 28) {
        this.collect(player);
        return false;
      }
    }

    return true;
  }

  collect(player) {
    if (this.dead) return;
    this.dead = true;
    audio.playCoin();
    particleSystem.createCoinSparkle(this.x, this.y);
    if (player && player.addScoreAndCoins) {
      player.addScoreAndCoins(this.value, 1);
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    const scaleX = Math.abs(Math.cos(this.spin));
    ctx.translate(rx, ry);
    ctx.scale(scaleX, 1);

    // Parpadeo cuando está a punto de expirar
    if (this.life < 3 && Math.floor(this.life * 8) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0.5);

    ctx.restore();
  }
}

class Medkit {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 20;
    this.floatTimer = 0;
    this.dead = false;
  }

  update(dt, player) {
    if (this.dead) return false;
    this.floatTimer += dt * 4;

    if (player && !player.dead) {
      if (Math.hypot(player.x - this.x, player.y - this.y) < 28) {
        const canHealPlayer = player.hp < player.maxHp || player.lives < 3;
        const canHealTank = player.inVehicle && player.tank && player.tank.armor < player.tank.maxArmor;
        if (canHealPlayer || canHealTank) {
          this.collect(player);
          return false;
        }
      }
    }
    return true;
  }

  collect(player) {
    this.dead = true;
    audio.playPowerup();
    particleSystem.createSparks(this.x, this.y, 0, -1, 15, '#00ff88');
    if (player.inVehicle && player.tank) {
      player.tank.armor = Math.min(player.tank.maxArmor, player.tank.armor + 50);
    } else {
      player.heal(50);
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y + Math.sin(this.floatTimer) * 4;

    ctx.save();
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;

    // Maletín médico
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rx - 12, ry - 10, 24, 20);

    // Cruz roja
    ctx.fillStyle = '#e53935';
    ctx.fillRect(rx - 3, ry - 8, 6, 16);
    ctx.fillRect(rx - 8, ry - 3, 16, 6);

    ctx.restore();
  }
}
