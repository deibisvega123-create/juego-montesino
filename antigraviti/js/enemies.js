/**
 * GUERRA EN EL BOSQUE - SISTEMA DE ENEMIGOS Y JEFE DE BASE
 * Soldados de infantería, francotiradores en torres, artilleros RPG, drones
 * y la Gran Fortaleza de la Selva (Búnker con torretas y núcleo central).
 */

class EnemySoldier {
  constructor(x, y, isSpecial = false) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 42;
    this.vx = 0;
    this.vy = 0;
    this.speed = isSpecial ? 2.2 : 1.6;
    this.isSpecial = isSpecial; // enemigo élite con armadura y más cadencia
    this.hp = isSpecial ? 65 : 30;
    this.maxHp = this.hp;
    this.facing = -1;
    this.fireTimer = Math.random() * 1.6 + 1.2; // tiempos de disparo escalonados
    this.fireRate = isSpecial ? 2.2 : 3.0;
    this.patrolStartX = x - 120;
    this.patrolEndX = x + 120;
    this.patrolDir = -1;
    this.dead = false;
    this.walkCycle = 0;
    this.isAiming = false; // estado de aviso/telegraph antes de disparar
  }

  update(dt, player, world, cam) {
    if (this.dead) return false;

    this.fireTimer -= dt;
    this.walkCycle += dt * 8;

    const targetX = player.inVehicle && player.tank ? player.tank.x : player.x;
    const targetY = player.inVehicle && player.tank ? player.tank.y : player.y;
    const distToPlayer = Math.hypot(targetX - this.x, targetY - this.y);

    // Solo actuar si está dentro o en el borde de la pantalla de la cámara
    const inScreen = cam ? (this.x >= cam.x - 40 && this.x <= cam.x + cam.width + 40) : true;

    // Si ve al jugador dentro de su rango de visión y está en pantalla
    if (distToPlayer < 480 && inScreen) {
      this.facing = targetX < this.x ? -1 : 1;

      // Fase de apuntado / telegraph (últimos 0.45s antes de disparar)
      if (this.fireTimer <= 0.45) {
        this.isAiming = true;
        this.vx = 0; // se detiene para apuntar (ventana clara para contraatacar o cubrirse)
      } else {
        this.isAiming = false;
        // Persecución táctica controlada
        if (distToPlayer > 200) {
          this.vx = this.facing * this.speed;
        } else if (distToPlayer < 110) {
          this.vx = -this.facing * this.speed;
        } else {
          this.vx = 0;
        }
      }

      // Disparar
      if (this.fireTimer <= 0) {
        this.shoot(targetX, targetY);
      }
    } else {
      this.isAiming = false;
      // Patrulla básica si no está en combate
      this.vx = this.patrolDir * (this.speed * 0.6);
      this.facing = this.patrolDir;
      if (this.x < this.patrolStartX) this.patrolDir = 1;
      if (this.x > this.patrolEndX) this.patrolDir = -1;
    }

    // Gravedad y suelo
    this.vy += 22 * dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    const groundY = world.getGroundHeight(this.x);
    if (this.y + this.height / 2 >= groundY) {
      this.y = groundY - this.height / 2;
      this.vy = 0;
    }

    return true;
  }

  shoot(targetX, targetY) {
    const cfg = (window.getDifficultyConfig && window.getDifficultyConfig()) || { enemyBulletSpeed: 6.0, enemyFireRateMultiplier: 1.0 };
    this.fireRate = (this.isSpecial ? 2.2 : 3.0) * cfg.enemyFireRateMultiplier;
    this.fireTimer = this.fireRate + Math.random() * 0.4;
    this.isAiming = false;
    audio.playShootRifle();

    const angle = Math.atan2(targetY - (this.y - 4), targetX - this.x);
    const spd = cfg.enemyBulletSpeed || 6.0;
    const sx = this.x + Math.cos(angle) * 16;
    const sy = this.y - 4 + Math.sin(angle) * 16;

    projectiles.push(new Projectile(
      sx, sy,
      Math.cos(angle) * spd, Math.sin(angle) * spd,
      WEAPON_TYPES.RIFLE,
      'enemy',
      this.isSpecial ? 24 : 18
    ));
    particleSystem.createMuzzleFlash(sx, sy, angle);
  }

  takeDamage(amount) {
    this.hp -= amount;
    particleSystem.createBloodSpurt(this.x, this.y);
    if (this.hp <= 0 && !this.dead) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    audio.playExplosion(0.6);
    particleSystem.createExplosion(this.x, this.y, 25, 20);

    // Dropear monedas y puntos
    const coinVal = this.isSpecial ? 250 : 100;
    coins.push(new Coin(this.x, this.y - 10, coinVal));
    if (this.isSpecial) {
      coins.push(new Coin(this.x + 10, this.y - 12, coinVal));
      if (Math.random() < 0.6) {
        crates.push(new WeaponCrate(this.x, this.y - 20));
      }
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();

    // Aviso visual de alerta / telegraph sobre el enemigo si está apuntando
    if (this.isAiming && !this.dead) {
      ctx.fillStyle = '#ff1744';
      ctx.font = '900 16px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 8;
      ctx.fillText('!', rx, ry - 30);

      // Línea sutil de advertencia de mira
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(rx + this.facing * 12, ry - 5);
      ctx.lineTo(rx + this.facing * 90, ry - 5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(rx, ry);
    ctx.scale(this.facing, 1);

    // Piernas animadas
    const legSwing = Math.sin(this.walkCycle) * (Math.abs(this.vx) > 0.1 ? 6 : 0);
    ctx.fillStyle = '#263238'; // Pantalón militar oscuro
    ctx.fillRect(-6 + legSwing, 6, 5, 15);
    ctx.fillRect(2 - legSwing, 6, 5, 15);

    // Torso con chaleco
    ctx.fillStyle = this.isSpecial ? '#7f0000' : '#37474f';
    ctx.fillRect(-8, -12, 16, 18);

    // Cinturón táctico
    ctx.fillStyle = '#ff9800';
    ctx.fillRect(-8, 3, 16, 3);

    // Cabeza y boina/casco
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -18, 6, 0, Math.PI * 2);
    ctx.fill();

    // Boina roja o casco enemigo
    ctx.fillStyle = this.isSpecial ? '#d50000' : '#212121';
    ctx.beginPath();
    ctx.arc(0, -21, 7, Math.PI, 0);
    ctx.fill();

    // Rifle enemigo
    ctx.fillStyle = '#111';
    ctx.fillRect(0, -7, 18, 5);

    // Barra de vida si está dañado
    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#ff3344';
      ctx.fillRect(-12, -30, (this.hp / this.maxHp) * 24, 3);
    }

    ctx.restore();
  }
}

class EnemySniper {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 42;
    this.hp = 35;
    this.maxHp = this.hp;
    this.fireTimer = 2.8;
    this.fireRate = 3.4;
    this.laserAimTimer = 0;
    this.isAiming = false;
    this.facing = -1;
    this.dead = false;
  }

  update(dt, player, world, cam) {
    if (this.dead) return false;

    this.fireTimer -= dt;
    const targetX = player.inVehicle && player.tank ? player.tank.x : player.x;
    const targetY = player.inVehicle && player.tank ? player.tank.y : player.y;

    const inScreen = cam ? (this.x >= cam.x - 60 && this.x <= cam.x + cam.width + 60) : true;
    const dist = Math.hypot(targetX - this.x, targetY - this.y);

    if (dist < 650 && inScreen) {
      this.facing = targetX < this.x ? -1 : 1;

      // Fase de apuntado con mira láser progresiva (1.5s antes del disparo)
      if (this.fireTimer <= 1.5) {
        this.isAiming = true;
        this.aimX = targetX;
        this.aimY = targetY;
      }

      if (this.fireTimer <= 0) {
        this.shoot(targetX, targetY);
      }
    } else {
      this.isAiming = false;
    }

    return true;
  }

  shoot(targetX, targetY) {
    const cfg = (window.getDifficultyConfig && window.getDifficultyConfig()) || { enemyBulletSpeed: 6.0, enemyFireRateMultiplier: 1.0 };
    this.fireRate = 3.4 * cfg.enemyFireRateMultiplier;
    this.fireTimer = this.fireRate + Math.random() * 0.4;
    this.isAiming = false;
    audio.playShootRifle();

    const angle = Math.atan2(targetY - (this.y - 6), targetX - this.x);
    const spd = 12.0; // Calibrado: veloz pero predecible para permitir esquivarlo
    projectiles.push(new Projectile(
      this.x, this.y - 6,
      Math.cos(angle) * spd, Math.sin(angle) * spd,
      WEAPON_TYPES.RIFLE,
      'enemy',
      35
    ));
    particleSystem.createMuzzleFlash(this.x, this.y - 6, angle);
  }

  takeDamage(amount) {
    this.hp -= amount;
    particleSystem.createBloodSpurt(this.x, this.y);
    if (this.hp <= 0 && !this.dead) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    audio.playExplosion(0.7);
    particleSystem.createExplosion(this.x, this.y, 25, 20);
    coins.push(new Coin(this.x, this.y, 300));
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();

    // Línea de mira láser con advertencia progresiva de dos etapas
    if (this.isAiming && !this.dead) {
      const isImminent = this.fireTimer <= 0.55;

      if (isImminent) {
        // Disparo inminente: láser rojo brillante y aviso ⚠️ para que el jugador se agache
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(rx, ry - 6);
        ctx.lineTo(this.aimX - camera.x, this.aimY - camera.y);
        ctx.stroke();

        ctx.fillStyle = '#ff1744';
        ctx.font = '900 14px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️', rx, ry - 30);
      } else {
        // Fase de adquisición de objetivo: línea tenue discontinua
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(rx, ry - 6);
        ctx.lineTo(this.aimX - camera.x, this.aimY - camera.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.translate(rx, ry);
    ctx.scale(this.facing, 1);

    // Soldado camuflado con mira
    ctx.fillStyle = '#26382b';
    ctx.fillRect(-7, -10, 14, 26);

    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -16, 6, 0, Math.PI * 2);
    ctx.fill();

    // Rifle de francotirador largo
    ctx.fillStyle = '#111';
    ctx.fillRect(0, -8, 26, 4);
    // Mira telescópica
    ctx.fillRect(6, -12, 10, 3);

    ctx.restore();
  }
}

class CombatDrone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.width = 34;
    this.height = 20;
    this.speed = 2.0;
    this.hp = 45;
    this.maxHp = this.hp;
    this.bombTimer = 3.0;
    this.hoverTimer = Math.random() * Math.PI;
    this.dead = false;
  }

  update(dt, player, world, cam) {
    if (this.dead) return false;

    this.hoverTimer += dt * 4;
    this.bombTimer -= dt;

    const targetX = player.inVehicle && player.tank ? player.tank.x : player.x;
    const distToPlayer = Math.abs(targetX - this.x);
    const inScreen = cam ? (this.x >= cam.x - 50 && this.x <= cam.x + cam.width + 50) : true;

    // Movimiento aéreo flotante suave
    this.y = this.baseY + Math.sin(this.hoverTimer) * 16;

    if (distToPlayer < 500 && inScreen) {
      if (this.x < targetX - 50) this.x += this.speed * dt * 60;
      else if (this.x > targetX + 50) this.x -= this.speed * dt * 60;

      // Soltar bomba si está posicionado sobre el jugador y expiró el tiempo
      if (distToPlayer < 70 && this.bombTimer <= 0) {
        this.dropBomb();
      }
    }

    // Partículas de propulsor
    if (Math.random() < 0.3) {
      particleSystem.createSmoke(this.x, this.y + 10, 1, 1);
    }

    return true;
  }

  dropBomb() {
    this.bombTimer = 3.2;
    audio.playMineBeep();
    const bomb = new Projectile(this.x, this.y + 10, 0, 3.8, WEAPON_TYPES.ROCKET, 'enemy', 30);
    bomb.isBomb = true; // Permite al jugador destruirla en el aire disparándole
    projectiles.push(bomb);
  }

  takeDamage(amount) {
    this.hp -= amount;
    particleSystem.createSparks(this.x, this.y, 0, 1, 6, '#00ffff');
    if (this.hp <= 0 && !this.dead) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    audio.playExplosion(1.0);
    particleSystem.createExplosion(this.x, this.y, 40, 30);
    coins.push(new Coin(this.x, this.y, 250));
    if (Math.random() < 0.5) {
      crates.push(new WeaponCrate(this.x, this.y, null, false));
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Cuerpo metálico del dron
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotores gemelos
    ctx.fillStyle = '#78909c';
    ctx.fillRect(rx - 22, ry - 6, 44, 2);

    // Ojo sensor con parpadeo de alerta si está por soltar bomba
    const isDroppingSoon = this.bombTimer <= 0.8;
    ctx.fillStyle = isDroppingSoon ? '#ffea00' : '#ff1744';
    ctx.shadowColor = isDroppingSoon ? '#ffea00' : '#ff1744';
    ctx.shadowBlur = isDroppingSoon ? 14 : 8;
    ctx.beginPath();
    ctx.arc(rx, ry + 2, isDroppingSoon ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * JEFE FINAL: LA GRAN FORTALEZA DEL BOSQUE (BASE ENEMIGA)
 * El objetivo culminante de la misión: llegar a la base enemiga y destruirla.
 * Diseñado con patrones rítmicos arcade justos y ventanas de vulnerabilidad claras.
 */
class EnemyBaseFortress {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 320;
    this.height = 240;
    this.hp = 1200; // Vida total del búnker principal
    this.maxHp = 1200;
    this.coreShield = true; // El núcleo tiene escudos hasta que abran las compuertas
    this.turret1Hp = 250;
    this.turret2Hp = 250;
    this.missileSiloHp = 300;

    // Ráfagas rítmicas de las torretas (3 tiros por ráfaga, 2.6s de descanso)
    this.turret1Burst = 0;
    this.turret1Timer = 1.0;
    this.turret1ShotCooldown = 0;

    this.turret2Burst = 0;
    this.turret2Timer = 2.4;
    this.turret2ShotCooldown = 0;

    this.missileTimer = 3.6;
    this.cycleTimer = 0;
    this.destroyed = false;
    this.alarmTimer = 0;
  }

  update(dt, player) {
    if (this.destroyed) return false;

    this.cycleTimer += dt;
    this.alarmTimer += dt;
    if (this.alarmTimer > 3.0) {
      this.alarmTimer = 0;
      audio.playSiren();
    }

    // El núcleo abre su ventilación con ventana amplia de 4.5s
    this.coreShield = Math.sin(this.cycleTimer * 0.5) > 0.15;

    const targetX = player.inVehicle && player.tank ? player.tank.x : player.x;
    const targetY = player.inVehicle && player.tank ? player.tank.y : player.y;

    // 1. Torreta Vulcan 1 (Arriba): ráfaga de 3 disparos espaciados, luego 2.6s de pausa
    if (this.turret1Hp > 0) {
      if (this.turret1Burst > 0) {
        this.turret1ShotCooldown -= dt;
        if (this.turret1ShotCooldown <= 0) {
          this.turret1ShotCooldown = 0.35;
          this.turret1Burst--;
          this.fireTurret(this.x + 60, this.y + 60, targetX, targetY);
        }
      } else {
        this.turret1Timer -= dt;
        if (this.turret1Timer <= 0) {
          this.turret1Timer = 2.6;
          this.turret1Burst = 3;
          this.turret1ShotCooldown = 0;
        }
      }
    }

    // 2. Torreta Vulcan 2 (Abajo): ráfaga alternada para no saturar al jugador
    if (this.turret2Hp > 0) {
      if (this.turret2Burst > 0) {
        this.turret2ShotCooldown -= dt;
        if (this.turret2ShotCooldown <= 0) {
          this.turret2ShotCooldown = 0.35;
          this.turret2Burst--;
          this.fireTurret(this.x + 60, this.y + 140, targetX, targetY);
        }
      } else {
        this.turret2Timer -= dt;
        if (this.turret2Timer <= 0) {
          this.turret2Timer = 2.6;
          this.turret2Burst = 3;
          this.turret2ShotCooldown = 0;
        }
      }
    }

    // 3. Silo de misiles guiados con aviso de humo y cadencia de 4.2s
    if (this.missileSiloHp > 0) {
      this.missileTimer -= dt;
      if (this.missileTimer <= 1.0 && this.missileTimer > 0) {
        if (Math.random() < 0.35) {
          particleSystem.createSmoke(this.x + 180, this.y - 15, 2, -1.5);
        }
      }
      if (this.missileTimer <= 0) {
        this.missileTimer = 4.2;
        this.fireMissile(targetX, targetY);
      }
    }

    return true;
  }

  fireTurret(tx, ty, targetX, targetY) {
    audio.playShootMinigun();
    const angle = Math.atan2(targetY - ty, targetX - tx);
    const spd = 6.2; // Calibrado: velocidad justa y legible
    projectiles.push(new Projectile(tx, ty, Math.cos(angle) * spd, Math.sin(angle) * spd, WEAPON_TYPES.RIFLE, 'enemy', 18));
    particleSystem.createMuzzleFlash(tx, ty, angle);
  }

  fireMissile(targetX, targetY) {
    audio.playShootRocket();
    const sx = this.x + 180;
    const sy = this.y + 30;
    const angle = Math.atan2(targetY - sy, targetX - sx);
    const spd = 5.2; // Calibrado: permite esquivarlo o derribarlo disparándole
    const missile = new Projectile(sx, sy, Math.cos(angle) * spd, Math.sin(angle) * spd, WEAPON_TYPES.ROCKET, 'enemy', 35);
    missile.isBomb = true; // Permite al jugador interceptarlo
    projectiles.push(missile);
  }

  takeDamage(amount, hitX, hitY) {
    // Verificar si impactó en las torretas o en el núcleo
    if (hitY < this.y + 100 && this.turret1Hp > 0) {
      this.turret1Hp -= amount;
      if (this.turret1Hp <= 0) {
        audio.playExplosion(1.0);
        particleSystem.createExplosion(this.x + 60, this.y + 60, 50, 30);
      }
    } else if (hitY > this.y + 110 && hitY < this.y + 180 && this.turret2Hp > 0) {
      this.turret2Hp -= amount;
      if (this.turret2Hp <= 0) {
        audio.playExplosion(1.0);
        particleSystem.createExplosion(this.x + 60, this.y + 140, 50, 30);
      }
    }

    // Daño directo a la base/núcleo
    if (!this.coreShield || (this.turret1Hp <= 0 && this.turret2Hp <= 0)) {
      this.hp -= amount;
      particleSystem.createSparks(hitX || this.x + 140, hitY || this.y + 100, -1, 0, 12, '#ff3344');
    } else {
      // Rebote en escudo
      particleSystem.createSparks(hitX || this.x + 140, hitY || this.y + 100, -1, 0, 6, '#00ffff');
    }

    if (this.hp <= 0 && !this.destroyed) {
      this.destroyBase();
    }
  }

  destroyBase() {
    this.destroyed = true;
    this.hp = 0;
    this.turret1Hp = 0;
    this.turret2Hp = 0;
    this.missileSiloHp = 0;
    audio.playExplosion(2.4);

    // Cadena masiva de 24 explosiones sobre toda la fortaleza
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const rx = this.x + Math.random() * this.width;
        const ry = this.y + Math.random() * this.height;
        audio.playExplosion(1.4);
        particleSystem.createExplosion(rx, ry, 75, 45);
        particleSystem.createSmoke(rx, ry, 5, -2.5);
      }, i * 140);
    }

    // Notificar al controlador principal del juego que la base ha sido destruida
    if (typeof window.onBaseDestroyed === 'function') {
      window.onBaseDestroyed();
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // 1. Estructura de búnker de hormigón militar fortificado (calcinado si está destruido)
    ctx.fillStyle = this.destroyed ? '#151816' : '#2b302c';
    ctx.fillRect(rx, ry, this.width, this.height);

    // Placas de acero blindado y remaches
    ctx.strokeStyle = this.destroyed ? '#222924' : '#404a42';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, this.width, this.height);

    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(rx + 20, ry + i * 55 + 10, this.width - 40, 45);
    }

    if (this.destroyed) {
      // Marcas de quemaduras negras y grietas tras la aniquilación
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(rx + 160, ry + 120, 110, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Puerta de asalto blindada
    ctx.fillStyle = this.destroyed ? '#0c0f0d' : '#1c221e';
    ctx.fillRect(rx + 20, ry + 120, 80, 120);

    // 3. Torreta Vulcan 1 (arriba)
    if (this.turret1Hp > 0 && !this.destroyed) {
      ctx.fillStyle = '#4f5e52';
      ctx.fillRect(rx + 45, ry + 45, 35, 30);
      ctx.fillStyle = '#111';
      ctx.fillRect(rx + 15, ry + 56, 30, 8);
    } else {
      ctx.fillStyle = '#111';
      ctx.fillRect(rx + 45, ry + 45, 35, 30); // Torreta destruida humeante
    }

    // 4. Torreta Vulcan 2 (abajo)
    if (this.turret2Hp > 0 && !this.destroyed) {
      ctx.fillStyle = '#4f5e52';
      ctx.fillRect(rx + 45, ry + 125, 35, 30);
      ctx.fillStyle = '#111';
      ctx.fillRect(rx + 15, ry + 136, 30, 8);
    } else {
      ctx.fillStyle = '#111';
      ctx.fillRect(rx + 45, ry + 125, 35, 30);
    }

    // 5. Silo de misiles en el techo
    ctx.fillStyle = this.destroyed ? '#1a1e20' : '#37474f';
    ctx.fillRect(rx + 160, ry - 20, 60, 20);

    // 6. Núcleo central del búnker (Reactor)
    const coreX = rx + 160;
    const coreY = ry + 90;
    if (this.destroyed) {
      // Núcleo colapsado
      ctx.fillStyle = '#080808';
      ctx.fillRect(coreX, coreY, 60, 60);
      ctx.strokeStyle = '#331111';
      ctx.strokeRect(coreX, coreY, 60, 60);
      // Rescoldos y fuego residual
      ctx.fillStyle = '#ff3300';
      ctx.beginPath();
      ctx.arc(coreX + 30, coreY + 30, 14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.coreShield ? '#152530' : '#d50000';
      ctx.fillRect(coreX, coreY, 60, 60);

      if (this.coreShield) {
        // Escudo protector hexagonal
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(coreX - 2, coreY - 2, 64, 64);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.fillRect(coreX, coreY, 60, 60);
      } else {
        // Núcleo expuesto pulsante
        ctx.fillStyle = '#ff1744';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(coreX + 30, coreY + 30, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Insignia enemiga
    if (this.destroyed) {
      ctx.fillStyle = '#ff9800';
      ctx.font = '900 18px "Orbitron", sans-serif';
      ctx.fillText('❌ BASE ANIQUILADA', rx + 70, ry + 30);
    } else {
      ctx.fillStyle = '#ff3344';
      ctx.font = '900 20px "Orbitron", sans-serif';
      ctx.fillText('⚠️ SECTOR 01', rx + 120, ry + 30);
    }

    ctx.restore();
  }
}

// ============================================================================
// JEFE NIVEL 2: REFINERÍA QUÍMICA Y GENERADOR TÓXICO (PANTANO TÓXICO)
// ============================================================================
class ToxicRefineryBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 320;
    this.height = 240;
    this.hp = 1350;
    this.maxHp = 1350;
    this.name = 'REFINERÍA QUÍMICA: GENERADOR TÓXICO';
    this.destroyed = false;

    this.cannonTimer = 1.6;
    this.mortarTimer = 3.2;
    this.smokeTimer = 0;
  }

  update(dt, player) {
    if (this.destroyed) return;

    this.smokeTimer += dt;
    if (this.smokeTimer > 0.25) {
      this.smokeTimer = 0;
      particleSystem.createSmoke(this.x + 80, this.y - 15, 3, -2);
      particleSystem.createSmoke(this.x + 220, this.y - 15, -3, -2);
    }

    const tx = player.inVehicle && player.tank ? player.tank.x : player.x;
    const ty = player.inVehicle && player.tank ? player.tank.y : player.y;

    // Cañón químico gemelo (dispara ráfagas corrosivas verdes)
    this.cannonTimer -= dt;
    if (this.cannonTimer <= 0) {
      this.cannonTimer = 2.2;
      const angle = Math.atan2(ty - (this.y + 110), tx - (this.x + 40));
      const spd = 6.8;
      projectiles.push(new Projectile(this.x + 40, this.y + 100, Math.cos(angle) * spd, Math.sin(angle) * spd, WEAPON_TYPES.RIFLE, 'enemy', 18));
      projectiles.push(new Projectile(this.x + 40, this.y + 130, Math.cos(angle + 0.1) * spd, Math.sin(angle + 0.1) * spd, WEAPON_TYPES.RIFLE, 'enemy', 18));
      audio.playShootRifle();
    }

    // Mortero de ácido balístico
    this.mortarTimer -= dt;
    if (this.mortarTimer <= 0) {
      this.mortarTimer = 4.0;
      const vx = -4.5 - Math.random() * 2.5;
      const vy = -7.5;
      const bomb = new Projectile(this.x + 140, this.y, vx, vy, WEAPON_TYPES.ROCKET, 'enemy', 24);
      bomb.isBomb = true;
      projectiles.push(bomb);
      audio.playExplosion(0.8);
    }
  }

  takeDamage(amount, hitX, hitY) {
    if (this.destroyed) return;
    this.hp -= amount;
    particleSystem.createSparks(hitX || this.x + 120, hitY || this.y + 100, -1, 0, 8, '#76ff03');
    if (this.hp <= 0) this.destroyBase();
  }

  destroyBase() {
    this.destroyed = true;
    this.hp = 0;
    audio.playExplosion(2.5);
    for (let i = 0; i < 22; i++) {
      setTimeout(() => {
        const rx = this.x + Math.random() * this.width;
        const ry = this.y + Math.random() * this.height;
        audio.playExplosion(1.3);
        particleSystem.createExplosion(rx, ry, 75, 45);
        particleSystem.createSparks(rx, ry, (Math.random() - 0.5) * 5, -Math.random() * 6, 12, '#69f0ae');
      }, i * 140);
    }
    if (typeof window.onBaseDestroyed === 'function') window.onBaseDestroyed();
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Silo químico y tuberías
    ctx.fillStyle = this.destroyed ? '#121713' : '#1f2e22';
    ctx.fillRect(rx, ry, this.width, this.height);
    ctx.strokeStyle = this.destroyed ? '#1b261e' : '#435e49';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, this.width, this.height);

    // Chimeneas de escape
    ctx.fillStyle = this.destroyed ? '#0f1410' : '#2f4534';
    ctx.fillRect(rx + 60, ry - 30, 40, 30);
    ctx.fillRect(rx + 200, ry - 30, 40, 30);

    // Contenedor central de ácido fluorescente
    ctx.fillStyle = this.destroyed ? '#0a100c' : '#76ff03';
    ctx.fillRect(rx + 110, ry + 60, 100, 100);
    ctx.strokeStyle = '#00e676';
    ctx.strokeRect(rx + 110, ry + 60, 100, 100);

    // Cañones frontales
    ctx.fillStyle = '#111';
    ctx.fillRect(rx + 20, ry + 95, 30, 12);
    ctx.fillRect(rx + 20, ry + 125, 30, 12);

    ctx.fillStyle = this.destroyed ? '#ff9800' : '#76ff03';
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.fillText(this.destroyed ? '❌ REFINERÍA PURGADA' : '☣️ REFINERÍA TÓXICA', rx + 65, ry + 30);
    ctx.restore();
  }
}

// ============================================================================
// JEFE NIVEL 3: FORTALEZA GEOTÉRMICA Y CAÑÓN DE MAGMA (SELVA VOLCÁNICA)
// ============================================================================
class MagmaFortressBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 340;
    this.height = 250;
    this.hp = 1500;
    this.maxHp = 1500;
    this.name = 'FORTALEZA GEOTÉRMICA: CAÑÓN DE MAGMA';
    this.destroyed = false;

    this.flameTimer = 1.8;
    this.magmaTimer = 3.5;
  }

  update(dt, player) {
    if (this.destroyed) return;

    const tx = player.inVehicle && player.tank ? player.tank.x : player.x;
    const ty = player.inVehicle && player.tank ? player.tank.y : player.y;

    // Disparo de ráfaga de fuego
    this.flameTimer -= dt;
    if (this.flameTimer <= 0) {
      this.flameTimer = 2.0;
      const angle = Math.atan2(ty - (this.y + 120), tx - (this.x + 30));
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const spd = 7.2;
          const a = angle + (Math.random() - 0.5) * 0.15;
          projectiles.push(new Projectile(this.x + 30, this.y + 120, Math.cos(a) * spd, Math.sin(a) * spd, WEAPON_TYPES.FLAMETHROWER, 'enemy', 16));
        }, i * 90);
      }
      audio.playShootMinigun();
    }

    // Proyectil colosal de magma incandescente
    this.magmaTimer -= dt;
    if (this.magmaTimer <= 0) {
      this.magmaTimer = 3.8;
      const bomb = new Projectile(this.x + 160, this.y - 10, -5.2, -8.2, WEAPON_TYPES.ROCKET, 'enemy', 28);
      bomb.isBomb = true;
      projectiles.push(bomb);
      audio.playExplosion(1.1);
      camera.shake = 8;
    }
  }

  takeDamage(amount, hitX, hitY) {
    if (this.destroyed) return;
    this.hp -= amount;
    particleSystem.createSparks(hitX || this.x + 140, hitY || this.y + 110, -1, 0, 10, '#ff3d00');
    if (this.hp <= 0) this.destroyBase();
  }

  destroyBase() {
    this.destroyed = true;
    this.hp = 0;
    audio.playExplosion(2.6);
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const rx = this.x + Math.random() * this.width;
        const ry = this.y + Math.random() * this.height;
        audio.playExplosion(1.4);
        particleSystem.createExplosion(rx, ry, 80, 50);
        particleSystem.createSparks(rx, ry, (Math.random() - 0.5) * 6, -Math.random() * 8, 14, '#ff9100');
      }, i * 135);
    }
    if (typeof window.onBaseDestroyed === 'function') window.onBaseDestroyed();
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Bloque de roca volcánica y basalto
    ctx.fillStyle = this.destroyed ? '#140c0c' : '#2b1414';
    ctx.fillRect(rx, ry, this.width, this.height);
    ctx.strokeStyle = this.destroyed ? '#1c1111' : '#ff3d00';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(rx, ry, this.width, this.height);

    // Núcleo de magma incandescente
    ctx.fillStyle = this.destroyed ? '#0a0505' : '#ff3d00';
    ctx.fillRect(rx + 120, ry + 70, 100, 100);
    ctx.fillStyle = this.destroyed ? '#111' : '#ffea00';
    ctx.beginPath();
    ctx.arc(rx + 170, ry + 120, 25, 0, Math.PI * 2);
    ctx.fill();

    // Cañón principal superior
    ctx.fillStyle = '#111';
    ctx.fillRect(rx + 145, ry - 30, 50, 30);

    ctx.fillStyle = this.destroyed ? '#ff9800' : '#ff3d00';
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.fillText(this.destroyed ? '❌ CAÑÓN COLAPSADO' : '🔥 CAÑÓN DE MAGMA', rx + 75, ry + 35);
    ctx.restore();
  }
}

// ============================================================================
// JEFE NIVEL 4: COMPLEJO DE RADAR Y GUÍA DE MISILES (TORMENTA NOCTURNA)
// ============================================================================
class RadarComplexBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 330;
    this.height = 240;
    this.hp = 1650;
    this.maxHp = 1650;
    this.name = 'COMPLEJO DE RADAR Y GUÍA DE MISILES';
    this.destroyed = false;

    this.laserTimer = 1.4;
    this.missileTimer = 3.4;
    this.dishAngle = 0;
  }

  update(dt, player) {
    if (this.destroyed) return;
    this.dishAngle += dt * 1.5;

    const tx = player.inVehicle && player.tank ? player.tank.x : player.x;
    const ty = player.inVehicle && player.tank ? player.tank.y : player.y;

    // Disparo de rayos láser tácticos azules
    this.laserTimer -= dt;
    if (this.laserTimer <= 0) {
      this.laserTimer = 2.1;
      const angle = Math.atan2(ty - (this.y + 100), tx - (this.x + 30));
      const spd = 9.0;
      projectiles.push(new Projectile(this.x + 30, this.y + 100, Math.cos(angle) * spd, Math.sin(angle) * spd, WEAPON_TYPES.LASER, 'enemy', 20));
      audio.playShootLaser();
    }

    // Andanada de misiles teledirigidos
    this.missileTimer -= dt;
    if (this.missileTimer <= 0) {
      this.missileTimer = 3.6;
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          projectiles.push(new EnemyMissile(this.x + 120 + i * 80, this.y - 10, tx, ty));
          audio.playShootRocket();
        }, i * 220);
      }
    }
  }

  takeDamage(amount, hitX, hitY) {
    if (this.destroyed) return;
    this.hp -= amount;
    particleSystem.createSparks(hitX || this.x + 130, hitY || this.y + 100, -1, 0, 9, '#00e5ff');
    if (this.hp <= 0) this.destroyBase();
  }

  destroyBase() {
    this.destroyed = true;
    this.hp = 0;
    audio.playExplosion(2.7);
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const rx = this.x + Math.random() * this.width;
        const ry = this.y + Math.random() * this.height;
        audio.playExplosion(1.4);
        particleSystem.createExplosion(rx, ry, 75, 45);
        particleSystem.createSparks(rx, ry, (Math.random() - 0.5) * 6, -Math.random() * 6, 12, '#00e5ff');
      }, i * 130);
    }
    if (typeof window.onBaseDestroyed === 'function') window.onBaseDestroyed();
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Búnker naval de acero azul oscuro
    ctx.fillStyle = this.destroyed ? '#0a1017' : '#142233';
    ctx.fillRect(rx, ry, this.width, this.height);
    ctx.strokeStyle = this.destroyed ? '#111e2b' : '#00b0ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, this.width, this.height);

    // Cúpula / Antena de radar parabólica rotatoria
    ctx.save();
    ctx.translate(rx + 165, ry - 15);
    ctx.rotate(Math.sin(this.dishAngle) * 0.4);
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(0, 0, 45, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Foco emisor
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(-4, -18, 8, 18);
    ctx.restore();

    // Cañón láser frontal
    ctx.fillStyle = '#111';
    ctx.fillRect(rx + 15, ry + 95, 35, 12);

    ctx.fillStyle = this.destroyed ? '#ff9800' : '#00e5ff';
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.fillText(this.destroyed ? '❌ RADAR INHABILITADO' : '📡 RADAR TÁCTICO', rx + 75, ry + 35);
    ctx.restore();
  }
}

// ============================================================================
// JEFE FINAL NIVEL 5: CORONEL VULCAN (EL SUPER SOLDADO SUPREMO)
// ============================================================================
class SuperSoldierBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 62;
    this.height = 88;
    this.hp = 1800;
    this.maxHp = 1800;
    this.name = 'CORONEL VULCAN: EL SUPER SOLDADO SUPREMO';
    this.dead = false;
    this.destroyed = false;

    // Física y movimiento
    this.vx = 0;
    this.vy = 0;
    this.facing = -1; // -1 mirando a la izquierda
    this.isGrounded = true;
    this.baseGroundY = y;

    // Fases y Máquina de Estados
    this.phase = 1; // 1: >70%, 2: 70-35%, 3: <35% (Modo Sobrecarga Berserker)
    this.state = 'IDLE'; // 'IDLE', 'MINIGUN', 'ROCKETS', 'SHIELD', 'CYBER_DASH', 'GROUND_SLAM'
    this.stateTimer = 1.2;

    // Ráfaga Minigun
    this.minigunShotsLeft = 0;
    this.minigunShotCooldown = 0;

    // Escudo de plasma
    this.shieldActive = false;
    this.shieldTimer = 0;

    // Cyber-Dash
    this.dashTimer = 0;
    this.dashAfterimages = [];

    // Burbuja de diálogo táctico
    this.dialogText = '¡AL FIN LLEGAS, COMANDO! ¡ESTA SELVA SERÁ TU TUMBA!';
    this.dialogTimer = 4.0;
    this.capeTimer = 0;
  }

  update(dt, player) {
    if (this.dead) return;

    this.capeTimer += dt;
    if (this.dialogTimer > 0) this.dialogTimer -= dt;

    // Determinar fase según porcentaje de vida
    const hpPct = this.hp / this.maxHp;
    if (hpPct > 0.7) {
      this.phase = 1;
    } else if (hpPct > 0.35) {
      if (this.phase === 1) {
        this.dialogText = '¡ACTIVANDO ESCUDO TÁCTICO Y MISILES EN JAMBA!';
        this.dialogTimer = 3.5;
      }
      this.phase = 2;
    } else {
      if (this.phase === 2) {
        this.dialogText = '¡SOBRECARGA AL 100%! ¡CONTEMPLA LA PERFECCIÓN CIBERNÉTICA!';
        this.dialogTimer = 4.0;
      }
      this.phase = 3;
    }

    const tx = player.inVehicle && player.tank ? player.tank.x : player.x;
    const ty = player.inVehicle && player.tank ? player.tank.y : player.y;
    this.facing = tx < this.x ? -1 : 1;

    // Actualizar estela de afterimages del dash
    for (let i = this.dashAfterimages.length - 1; i >= 0; i--) {
      this.dashAfterimages[i].alpha -= dt * 2.8;
      if (this.dashAfterimages[i].alpha <= 0) this.dashAfterimages.splice(i, 1);
    }

    // Escudo de plasma activo
    if (this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }

    // Máquina de estados de combate
    this.stateTimer -= dt;

    if (this.state === 'IDLE') {
      // Movimiento táctico
      const targetDist = 280;
      const curDist = Math.abs(tx - this.x);

      if (curDist > targetDist + 50) {
        this.vx = this.facing * (this.phase === 3 ? 240 : 180);
      } else if (curDist < targetDist - 50) {
        this.vx = -this.facing * (this.phase === 3 ? 190 : 140);
      } else {
        this.vx = 0;
      }

      if (this.stateTimer <= 0) {
        this.chooseNextAttack(curDist);
      }
    } else if (this.state === 'MINIGUN') {
      this.vx = 0;
      this.minigunShotCooldown -= dt;
      if (this.minigunShotCooldown <= 0 && this.minigunShotsLeft > 0) {
        this.minigunShotCooldown = this.phase === 3 ? 0.08 : 0.12;
        this.minigunShotsLeft--;

        const angle = Math.atan2(ty - (this.y + 35), tx - (this.x + this.facing * 30));
        const spread = (Math.random() - 0.5) * 0.12;
        const spd = 8.5;
        projectiles.push(new Projectile(
          this.x + (this.facing === 1 ? 40 : -10),
          this.y + 38,
          Math.cos(angle + spread) * spd,
          Math.sin(angle + spread) * spd,
          WEAPON_TYPES.RIFLE,
          'enemy',
          16
        ));
        audio.playShootMinigun();
      }

      if (this.minigunShotsLeft <= 0 && this.stateTimer <= 0) {
        this.state = 'IDLE';
        this.stateTimer = this.phase === 3 ? 0.6 : 1.2;
      }
    } else if (this.state === 'CYBER_DASH') {
      // Desplazamiento supersónico
      this.dashTimer -= dt;
      if (Math.random() < 0.6) {
        this.dashAfterimages.push({ x: this.x, y: this.y, alpha: 0.8, color: '#c084fc' });
      }

      // Daño por contacto si embiste al jugador
      if (Math.hypot(player.x - this.x, player.y - this.y) < 45) {
        player.takeDamage(35, 'corte de energía');
      }

      if (this.dashTimer <= 0) {
        this.vx = 0;
        this.state = 'IDLE';
        this.stateTimer = 0.8;
      }
    } else if (this.state === 'GROUND_SLAM') {
      // Salto propulsado hacia arriba y caída en picada
      this.vy += 1200 * dt;
      this.y += this.vy * dt;

      if (this.y >= this.baseGroundY) {
        this.y = this.baseGroundY;
        this.vy = 0;
        this.isGrounded = true;

        // Impacto sísmico devastador
        camera.shake = 16;
        audio.playGroundSlam();
        particleSystem.createExplosion(this.x + 30, this.y + 70, 70, 40);

        // Ondas de choque que avanzan por el suelo en ambas direcciones
        projectiles.push(new Projectile(this.x + 20, this.y + 70, -7.0, 0, WEAPON_TYPES.ROCKET, 'enemy', 24));
        projectiles.push(new Projectile(this.x + 40, this.y + 70, 7.0, 0, WEAPON_TYPES.ROCKET, 'enemy', 24));

        this.dialogText = '¡SIENTE EL PODER DEL TERREMOTO!';
        this.dialogTimer = 2.5;

        this.state = 'IDLE';
        this.stateTimer = 1.0;
      }
    }

    // Aplicar física horizontal si no está en ground slam
    if (this.state !== 'GROUND_SLAM') {
      this.x += this.vx * dt;
      this.x = Math.max(3400, Math.min(4400, this.x)); // Confinado a la arena del templo
    }
  }

  chooseNextAttack(distToPlayer) {
    const roll = Math.random();

    if (this.phase === 1) {
      if (roll < 0.65) {
        this.startMinigun(8);
      } else {
        this.startRockets(2);
      }
    } else if (this.phase === 2) {
      if (roll < 0.4) {
        this.startShield();
      } else if (roll < 0.7) {
        this.startRockets(3);
      } else {
        this.startMinigun(12);
      }
    } else {
      // Fase 3: Berserker con Cyber-Dash y Terremoto
      if (roll < 0.35) {
        this.startCyberDash();
      } else if (roll < 0.65) {
        this.startGroundSlam();
      } else if (roll < 0.85) {
        this.startMinigun(14);
      } else {
        this.startRockets(4);
      }
    }
  }

  startMinigun(shots) {
    this.state = 'MINIGUN';
    this.minigunShotsLeft = shots;
    this.minigunShotCooldown = 0;
    this.stateTimer = 1.8;
  }

  startShield() {
    this.state = 'SHIELD';
    this.shieldActive = true;
    this.shieldTimer = 3.0;
    this.dialogText = '¡ESCUDO DE PLASMA IMPENETRABLE!';
    this.dialogTimer = 2.5;
    this.stateTimer = 3.2;
    audio.playShieldDeflect();
  }

  startRockets(count) {
    this.state = 'ROCKETS';
    this.stateTimer = 1.5;
    this.dialogText = '¡MISILES EN JAMBA DIRECTOS A TU POSICIÓN!';
    this.dialogTimer = 2.5;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!this.dead) {
          projectiles.push(new EnemyMissile(this.x + 20, this.y, player.x, player.y));
          audio.playMissileLaunch();
        }
      }, i * 220);
    }

    setTimeout(() => {
      if (!this.dead) {
        this.state = 'IDLE';
        this.stateTimer = 0.8;
      }
    }, count * 220 + 300);
  }

  startCyberDash() {
    this.state = 'CYBER_DASH';
    this.dashTimer = 0.55;
    this.vx = this.facing * 700;
    this.dialogText = '¡CYBER-DASH TÁCTICO!';
    this.dialogTimer = 2.0;
    audio.playCyberDash();
  }

  startGroundSlam() {
    this.state = 'GROUND_SLAM';
    this.vy = -620; // Propulsión vertical
    this.isGrounded = false;
    audio.playCyberDash();
  }

  takeDamage(amount, hitX, hitY) {
    if (this.dead) return;

    // Si el escudo está activo y el disparo viene de frente, rebotar
    if (this.shieldActive) {
      const isFrontHit = (this.facing === -1 && (hitX < this.x + 40)) || (this.facing === 1 && (hitX > this.x + 20));
      if (isFrontHit) {
        audio.playShieldDeflect();
        particleSystem.createSparks(hitX, hitY, -this.facing * 4, 0, 8, '#00ffff');
        return; // Sin daño si impacta en el escudo
      }
    }

    this.hp -= amount;
    particleSystem.createSparks(hitX || this.x + 30, hitY || this.y + 40, -this.facing * 2, -1, 6, '#ffd700');

    if (this.hp <= 0 && !this.dead) {
      this.destroyBase();
    }
  }

  destroyBase() {
    this.dead = true;
    this.destroyed = true;
    this.hp = 0;
    this.dialogText = '¡IMPOSIBLE... MI ARMADURA... HA SIDO SUPERADA...! ¡ARGHHH!';
    this.dialogTimer = 5.0;

    // Cadena masiva de sobrecargas y explosiones sobre el exoesqueleto
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const rx = this.x + (Math.random() - 0.5) * 60;
        const ry = this.y + Math.random() * this.height;
        audio.playExplosion(1.4);
        particleSystem.createExplosion(rx, ry, 70, 45);
        particleSystem.createSparks(rx, ry, (Math.random() - 0.5) * 6, -Math.random() * 6, 12, '#c084fc');
      }, i * 140);
    }

    if (typeof window.onBaseDestroyed === 'function') {
      window.onBaseDestroyed();
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();

    // 1. Dibujar afterimages del cyber-dash
    for (const img of this.dashAfterimages) {
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.5;
      ctx.fillStyle = img.color;
      ctx.fillRect(img.x - camera.x, img.y - camera.y, this.width, this.height);
      ctx.restore();
    }

    // 2. Capa militar rasgada
    const capeWave = Math.sin(this.capeTimer * 6) * 12;
    ctx.fillStyle = this.phase === 3 ? '#b91c1c' : '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(rx + (this.facing === 1 ? 15 : 45), ry + 22);
    ctx.lineTo(rx + (this.facing === 1 ? -25 : 85) + capeWave, ry + 75);
    ctx.lineTo(rx + (this.facing === 1 ? 5 : 55), ry + 80);
    ctx.closePath();
    ctx.fill();

    // 3. Exoesqueleto blindado de titanio (Cuerpo y armadura)
    ctx.fillStyle = this.phase === 3 ? '#1c1917' : '#262626';
    ctx.fillRect(rx + 14, ry + 18, 34, 48); // Torso

    // Placas de blindaje pectoral
    ctx.fillStyle = this.phase === 3 ? '#991b1b' : '#3f3f46';
    ctx.fillRect(rx + 16, ry + 22, 30, 22);
    ctx.strokeStyle = this.phase === 3 ? '#f87171' : '#71717a';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 16, ry + 22, 30, 22);

    // Núcleo del reactor en el pecho
    ctx.fillStyle = this.phase === 3 ? '#ef4444' : (this.phase === 2 ? '#f59e0b' : '#06b6d4');
    ctx.beginPath();
    ctx.arc(rx + 31, ry + 33, 7, 0, Math.PI * 2);
    ctx.fill();

    // Piernas blindadas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rx + 16, ry + 66, 12, 22);
    ctx.fillRect(rx + 34, ry + 66, 12, 22);

    // Casco cibernético con visor luminoso
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(rx + 18, ry, 26, 20);
    ctx.fillStyle = this.phase === 3 ? '#ff0033' : '#00ffff';
    ctx.fillRect(rx + (this.facing === 1 ? 26 : 18), ry + 6, 18, 5); // Visor

    // Hombrera con lanzamisiles
    ctx.fillStyle = '#475569';
    ctx.fillRect(rx + (this.facing === 1 ? 8 : 42), ry + 16, 14, 14);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(rx + (this.facing === 1 ? 10 : 44), ry + 18, 4, 4);

    // Brazo con Vulcan Minigun rotatoria
    ctx.fillStyle = '#0f172a';
    const gunX = rx + (this.facing === 1 ? 42 : -8);
    ctx.fillRect(gunX, ry + 32, 28, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(gunX + (this.facing === 1 ? 28 : -14), ry + 34, 14, 8); // Cañones

    // 4. Escudo de plasma hexagonal si está activo
    if (this.shieldActive) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3.5;
      ctx.fillStyle = 'rgba(0, 255, 255, 0.25)';
      const shieldX = rx + (this.facing === 1 ? 52 : -15);
      ctx.beginPath();
      ctx.arc(shieldX, ry + 44, 42, -Math.PI * 0.45, Math.PI * 0.45, this.facing === -1);
      ctx.stroke();
      ctx.fill();
    }

    // 5. Burbuja de diálogo táctica encima de su cabeza
    if (this.dialogTimer > 0 && this.dialogText) {
      ctx.font = '700 13px "Rajdhani", sans-serif';
      const textWidth = ctx.measureText(this.dialogText).width;
      const bubbleW = textWidth + 24;
      const bubbleH = 28;
      const bubbleX = rx + 31 - bubbleW / 2;
      const bubbleY = ry - 42;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = this.phase === 3 ? '#ef4444' : '#c084fc';
      ctx.lineWidth = 2;
      ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
      ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.dialogText, bubbleX + 12, bubbleY + 18);
    }

    ctx.restore();
  }
}

