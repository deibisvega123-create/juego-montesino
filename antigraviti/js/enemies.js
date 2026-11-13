/* ===== enemies.js ===== */
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
      if (currentLevel !== 4 && Math.random() < 0.6) {
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
    this.snapToSurface();
  }

  // Coloca al francotirador con los pies sobre la plataforma más cercana (o el suelo)
  // para que nunca quede flotando en el aire.
  snapToSurface() {
    if (typeof world === 'undefined' || !world) return;
    const feet = this.y + 16; // los pies se dibujan 16 px por debajo del centro
    let best = null;
    let bestD = Infinity;
    for (const p of (world.platforms || [])) {
      if (this.x >= p.x - 60 && this.x <= p.x + p.w + 60) {
        const d = Math.abs(p.y - feet);
        if (d < bestD) { bestD = d; best = p; }
      }
    }
    const groundY = world.getGroundHeight(this.x);
    if (best && bestD <= Math.abs(groundY - feet) + 60) {
      this.x = Math.max(best.x + 18, Math.min(best.x + best.w - 18, this.x));
      this.y = best.y - 16;
    } else {
      this.y = groundY - 16;
    }
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
    // En el nivel 4 (combate aéreo) los drones no sueltan cajas de armas
    if (currentLevel !== 4 && Math.random() < 0.5) {
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
// ============================================================================
// ENEMIGOS AÉREOS NIVEL 4: HELICÓPTEROS ENEMIGOS Y SUMINISTROS
// ============================================================================
class EnemyHelicopter {
  constructor(x, y, type = 'scout') {
    this.x = x;
    this.y = y;
    this.type = type; // 'scout' o 'gunship'
    this.width = type === 'gunship' ? 95 : 72;
    this.height = type === 'gunship' ? 48 : 36;
    this.hp = type === 'gunship' ? 95 : 45;
    this.maxHp = this.hp;
    this.speed = type === 'gunship' ? 1.6 : 2.4;
    this.rotorAngle = 0;
    this.dead = false;
    this.fireTimer = 1.2 + Math.random() * 1.5;
    this.facing = -1;
    this.hoverTimer = Math.random() * Math.PI * 2;
    this.baseY = y;
  }

  update(dt, player, world, cam) {
    if (this.dead) return false;

    this.rotorAngle += dt * 38;
    this.hoverTimer += dt * 2.5;
    this.fireTimer -= dt;

    const targetX = player.inVehicle && player.tank ? player.tank.x : player.x;
    const targetY = player.inVehicle && player.tank ? player.tank.y : player.y;

    // Movimiento oscilatorio de vuelo
    this.y = this.baseY + Math.sin(this.hoverTimer) * 35;
    this.facing = targetX < this.x ? -1 : 1;

    // Acercarse suavemente al rango de ataque
    const dist = Math.hypot(targetX - this.x, targetY - this.y);
    if (dist > 320) {
      this.x += this.facing * this.speed * dt * 60;
    } else if (dist < 180) {
      this.x -= this.facing * this.speed * dt * 60;
    }

    // Disparar ráfagas de ametralladora o cohetes
    if (this.fireTimer <= 0 && dist < 650) {
      this.shoot(targetX, targetY);
      this.fireTimer = this.type === 'gunship' ? 2.2 : 1.6;
    }

    return true;
  }

  shoot(targetX, targetY) {
    audio.playShootRifle();
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const spd = 7.0;

    projectiles.push(new Projectile(
      this.x + this.facing * 25, this.y + 10,
      Math.cos(angle) * spd, Math.sin(angle) * spd,
      WEAPON_TYPES.RIFLE,
      'enemy',
      16
    ));
    particleSystem.createMuzzleFlash(this.x + this.facing * 25, this.y + 10, angle);

    // Los gunships disparan además un misil ocasional
    if (this.type === 'gunship' && Math.random() < 0.45) {
      setTimeout(() => {
        if (!this.dead) {
          projectiles.push(new EnemyMissile(this.x, this.y + 15, targetX, targetY));
          audio.playShootRocket();
        }
      }, 250);
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    particleSystem.createSparks(this.x, this.y, -this.facing * 2, -1, 6, '#ffaa00');
    if (this.hp <= 0 && !this.dead) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    audio.playExplosion(1.2);
    particleSystem.createExplosion(this.x, this.y, 50, 30);
    coins.push(new Coin(this.x, this.y, this.type === 'gunship' ? 300 : 150));

    // Las naves enemigas NO sueltan cajas: los suministros solo caen del cielo en puntos fijos del nivel
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.scale(this.facing, 1);

    // Fuselaje
    ctx.fillStyle = this.type === 'gunship' ? '#37474f' : '#263238';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cola
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-this.width * 0.4, -4);
    ctx.lineTo(-this.width * 0.85, -10);
    ctx.lineTo(-this.width * 0.85, 2);
    ctx.lineTo(-this.width * 0.4, 6);
    ctx.closePath();
    ctx.fill();

    // Rotor de cola
    ctx.fillStyle = '#111';
    ctx.fillRect(-this.width * 0.87, -18, 4, 16);

    // Cabina roja enemiga
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.ellipse(this.width * 0.25, -2, this.width * 0.16, this.height * 0.22, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Cañón frontal
    ctx.fillStyle = '#111';
    ctx.fillRect(this.width * 0.35, 6, 16, 5);

    // Mástil y aspas del rotor
    ctx.fillStyle = '#111';
    ctx.fillRect(-3, -this.height * 0.6, 6, 8);
    const span = Math.cos(this.rotorAngle) * (this.width * 0.7);
    ctx.fillRect(-span, -this.height * 0.62, span * 2, 3);

    // Barra de vida si está dañado
    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#ff3344';
      ctx.fillRect(-this.width / 2, -this.height * 0.75, (this.hp / this.maxHp) * this.width, 3);
    }

    ctx.restore();
  }
}

// ============================================================================
// CAJA DE RECARGA DE COHETES EN PARACAÍDAS (NIVEL 4)
// ============================================================================
class HeliRocketCrate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 32;
    this.vy = 40; // Descenso suave
    this.dead = false;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt, world, player) {
    if (this.dead) return false;

    this.wobble += dt * 3;
    this.y += this.vy * dt;
    this.x += Math.sin(this.wobble) * 20 * dt;

    if (this.y > 660) {
      this.dead = true;
      return false;
    }

    // Colisión con el jugador / helicóptero (solo se recoge si faltan cohetes: máximo 5)
    const pX = player.inVehicle && player.tank ? player.tank.x : player.x;
    const pY = player.inVehicle && player.tank ? player.tank.y : player.y;
    if ((player.helicopterRockets || 0) < 5 && Math.hypot(pX - this.x, pY - this.y) < 55) {
      this.collect(player);
      return false;
    }

    return true;
  }

  takeDamage(amount, player) {
    // Con los 5 cohetes llenos la caja no se gasta
    if (player && (player.helicopterRockets || 0) >= 5) return;
    this.collect(player);
  }

  collect(player) {
    this.dead = true;
    if (player.helicopterRockets !== undefined) {
      player.helicopterRockets = Math.min(5, player.helicopterRockets + 5); // tope: 5 cohetes
      if (typeof updateHeliHud === 'function') updateHeliHud();
    }
    if (audio.playPowerup) audio.playPowerup();
    particleSystem.createSparks(this.x, this.y, 0, -2, 12, '#38bdf8');
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    ctx.translate(rx, ry);

    // Paracaídas blanco/naranja
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(0, -22, 20, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cuerdas
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -22); ctx.lineTo(-6, -6);
    ctx.moveTo(18, -22); ctx.lineTo(6, -6);
    ctx.stroke();

    // Caja de munición con cohete pintado
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-12, -6, 24, 20);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -6, 24, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀', 0, 9);

    ctx.restore();
  }
}

// ============================================================================
// JEFE NIVEL 4: HELICÓPTERO DE COMBATE GIGANTE (TITÁN AÉREO)
// Metralleta con ráfagas y cohetes guiados. Al ser derrotado cae envuelto en llamas.
// ============================================================================
class GiantBossHelicopter {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 240;
    this.height = 125;
    this.hp = 1350; // Dificultad media equilibrada y desafiante
    this.maxHp = 1350;
    this.name = 'HELICÓPTERO GIGANTE DE COMBATE: TITÁN-X';
    this.destroyed = false;
    this.dead = false;

    // Fases de vuelo y oscilación
    this.baseY = y;
    this.flightTimer = 0;
    this.rotorAngle = 0;
    this.facing = -1;

    // Temporizadores de ataque
    this.machinegunTimer = 1.0;
    this.rocketTimer = 3.2;
    this.burstLeft = 0;
    this.burstCooldown = 0;

    // Estado de caída en llamas
    this.falling = false;
    this.fallVy = 0;
    this.fallVx = 0;
    this.fallRotation = 0;
    this.smokeTimer = 0;
  }

  update(dt, player) {
    this.rotorAngle += dt * 42;

    // Si ya fue derrotado: Plummets hacia el suelo envuelto en llamas
    if (this.falling) {
      this.fallVy += 160 * dt;
      this.fallVx += 40 * dt;
      this.y += this.fallVy * dt;
      this.x += this.fallVx * dt;
      this.fallRotation += dt * 0.8;

      this.smokeTimer += dt;
      if (this.smokeTimer > 0.04) {
        this.smokeTimer = 0;
        particleSystem.createFire(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 40, 3);
        particleSystem.createSmoke(this.x - 30, this.y, 4, -2);
      }
      return;
    }

    if (this.destroyed) return;

    this.flightTimer += dt * 1.8;
    // Movimiento oscilatorio suave en altura
    this.y = this.baseY + Math.sin(this.flightTimer) * 55;

    const tx = player.inVehicle && player.tank ? player.tank.x : player.x;
    const ty = player.inVehicle && player.tank ? player.tank.y : player.y;

    // Mantenerse a distancia táctica del jugador
    if (this.x - tx > 480) {
      this.x -= 80 * dt;
    } else if (this.x - tx < 320) {
      this.x += 60 * dt;
    }

    // 1. Ráfagas de ametralladora gemela
    this.machinegunTimer -= dt;
    this.burstCooldown -= dt;

    if (this.machinegunTimer <= 0) {
      this.burstLeft = 6; // 6 disparos por andanada
      this.machinegunTimer = 3.0;
    }

    if (this.burstLeft > 0 && this.burstCooldown <= 0) {
      this.burstCooldown = 0.12;
      this.burstLeft--;

      const angle = Math.atan2(ty - (this.y + 20), tx - (this.x - 70));
      const spd = 7.8;
      projectiles.push(new Projectile(
        this.x - 70, this.y + 20,
        Math.cos(angle) * spd, Math.sin(angle) * spd,
        WEAPON_TYPES.RIFLE,
        'enemy',
        18
      ));
      audio.playShootMinigun();
      particleSystem.createMuzzleFlash(this.x - 70, this.y + 20, angle);
    }

    // 2. Cohetes pesados guiados desde los lanzadores alares
    this.rocketTimer -= dt;
    if (this.rocketTimer <= 0) {
      this.rocketTimer = 4.2;
      audio.playShootRocket();

      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          if (!this.destroyed) {
            projectiles.push(new EnemyMissile(this.x - 40, this.y - 15 + i * 35, tx, ty));
          }
        }, i * 260);
      }
    }
  }

  takeDamage(amount, hitX, hitY) {
    if (this.destroyed || this.falling) return;
    this.hp -= amount;
    particleSystem.createSparks(hitX || this.x - 40, hitY || this.y, 2, -1, 8, '#ff9800');

    if (this.hp <= 0) {
      this.destroyBase();
    }
  }

  destroyBase() {
    this.destroyed = true;
    this.falling = true;
    this.hp = 0;
    this.fallVy = 50;
    this.fallVx = 40;

    // Hacer que el jugador avance hacia adelante
    if (typeof window.onHelicopterBossDefeated === 'function') {
      window.onHelicopterBossDefeated();
    }

    audio.playExplosion(2.5);
    particleSystem.createExplosion(this.x, this.y, 120, 60);

    // Explosiones continuas de desintegración
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const rx = this.x + (Math.random() - 0.5) * this.width;
        const ry = this.y + (Math.random() - 0.5) * this.height;
        audio.playExplosion(1.2);
        particleSystem.createExplosion(rx, ry, 60, 35);
        particleSystem.createFire(rx, ry, 3);
      }, i * 150);
    }

    // Notificar victoria tras caída en llamas (3.5 segundos)
    // Cuando termina de caer en llamas: cinemática y luego banner de misión cumplida
    setTimeout(() => {
      if (typeof window.onHelicopterBossFell === 'function') {
        window.onHelicopterBossFell();
      } else if (typeof window.onBaseDestroyed === 'function') {
        window.onBaseDestroyed();
      }
    }, 3500);
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    ctx.translate(rx, ry);
    if (this.falling) {
      ctx.rotate(this.fallRotation);
    }

    // Fuselaje del helicóptero gigante militar
    ctx.fillStyle = '#1c2820';
    ctx.beginPath();
    ctx.ellipse(0, 0, 110, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Blindaje y paneles de camuflaje
    ctx.fillStyle = '#26382b';
    ctx.fillRect(-60, -20, 100, 40);
    ctx.strokeStyle = '#435e4a';
    ctx.strokeRect(-60, -20, 100, 40);

    // Cola extendida con doble alerón
    ctx.fillStyle = '#152018';
    ctx.beginPath();
    ctx.moveTo(80, -12);
    ctx.lineTo(170, -28);
    ctx.lineTo(170, -6);
    ctx.lineTo(80, 18);
    ctx.closePath();
    ctx.fill();

    // Rotores gemelos de cola
    ctx.fillStyle = '#111';
    ctx.fillRect(170, -45, 6, 35);

    // Cabina blindada frontal carmesí
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(-75, -6, 32, 22, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Lanzadores de cohetes montados en las alas laterales
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-25, 28, 60, 18);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, 32, 8, 8);
    ctx.fillRect(-10, 32, 8, 8);
    ctx.fillRect(2, 32, 8, 8);

    // Torreta de metralletas gemelas delantera
    ctx.fillStyle = '#111';
    ctx.fillRect(-105, 12, 36, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-115, 14, 12, 6);

    // Mástil y rotor colosal
    ctx.fillStyle = '#111';
    ctx.fillRect(-8, -64, 16, 20);
    const bladeSpan = Math.cos(this.rotorAngle) * 160;
    ctx.fillRect(-bladeSpan, -68, bladeSpan * 2, 7);

    // Llamas activas si está dañado severamente
    if (this.hp < this.maxHp * 0.4 || this.falling) {
      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(30, -15, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ============================================================================
// JEFE FINAL NIVEL 5: COMANDANTE MALVADO (OJOS ROJOS Y MOVILIDAD ÁGIL)
// Sin armadura mecánica. Se mueve, salta entre plataformas y esquiva disparos.
// ============================================================================
class EvilCommanderBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 38;
    this.height = 58;
    this.hp = 1250; // Dificultad equilibrada y desafiante
    this.maxHp = 1250;
    this.name = 'COMANDANTE MALVADO';
    this.dead = false;
    this.destroyed = false;

    // Física y saltos
    this.vx = 0;
    this.vy = 0;
    this.speed = 3.6;
    this.jumpForce = -10.5;
    this.gravity = 24;
    this.isGrounded = true;
    this.facing = -1;
    this.baseGroundY = y;

    // Animación y esquivas
    this.dodgeCooldown = 0;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.walkCycle = 0;
    this.jumpTimer = 2.4;

    // Ataques
    this.attackTimer = 1.0;
    this.burstShots = 0;
    this.burstCooldown = 0;

    // Diálogos
    this.dialogText = '¡COMANDO! ¡NO SALDRÁS VIVO DE ESTE TEMPLO!';
    this.dialogTimer = 3.5;
  }

  update(dt, player) {
    if (this.dead) return;

    this.walkCycle += dt * 8;
    if (this.dialogTimer > 0) this.dialogTimer -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

    const tx = player.inVehicle && player.tank ? player.tank.x : player.x;
    const ty = player.inVehicle && player.tank ? player.tank.y : player.y;
    this.facing = tx < this.x ? -1 : 1;

    // 1. Detección y esquiva ágil de proyectiles del jugador
    if (this.dodgeCooldown <= 0 && !this.isDodging) {
      for (const p of projectiles) {
        if (p.owner === 'player' && Math.hypot(p.x - this.x, p.y - this.y) < 140) {
          // El villano intenta esquivar saltando o rodando
          this.dodgeCooldown = 1.4;
          if (this.isGrounded && Math.random() < 0.65) {
            // Salto evasivo hacia arriba / plataforma
            this.vy = this.jumpForce;
            this.isGrounded = false;
            audio.playJump();
          } else {
            // Rodada / dash táctico evasivo
            this.isDodging = true;
            this.dodgeTimer = 0.25;
            this.vx = -this.facing * 340;
          }
          break;
        }
      }
    }

    // Gestionar estado de rodada/esquiva
    if (this.isDodging) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.vx = 0;
      }
    } else {
      // Movimiento táctico continuo (no se queda quieto)
      const dist = Math.abs(tx - this.x);
      if (dist > 300) {
        this.vx = this.facing * this.speed * 60;
      } else if (dist < 140) {
        this.vx = -this.facing * (this.speed * 1.1) * 60;
      } else {
        // Oscilación lateral
        this.vx = Math.sin(this.walkCycle) * 70;
      }
    }

    // 2. Saltos tácticos periódicos entre plataformas
    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0 && this.isGrounded) {
      this.jumpTimer = 2.0 + Math.random() * 2.0;
      this.vy = this.jumpForce;
      this.isGrounded = false;
      audio.playJump();
    }

    // 3. Física de gravedad y suelo/plataformas
    this.vy += this.gravity * dt * 60;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Límites de la arena final del templo
    this.x = Math.max(7150, Math.min(8050, this.x));

    const groundY = (typeof world !== 'undefined' && world.getGroundHeight) ? world.getGroundHeight(this.x) : 580;
    let landed = false;

    // Colisión con plataformas elevadas
    if (typeof world !== 'undefined' && world.getPlatformAt) {
      const plat = world.getPlatformAt(this.x, this.y + this.height / 2, this.vy);
      if (plat) {
        this.y = plat.y - this.height / 2;
        this.vy = 0;
        this.isGrounded = true;
        landed = true;
      }
    }

    if (!landed) {
      if (this.y + this.height / 2 >= groundY) {
        this.y = groundY - this.height / 2;
        this.vy = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }

    // 4. Ataques del comandante malvado
    this.attackTimer -= dt;
    this.burstCooldown -= dt;

    if (this.attackTimer <= 0) {
      this.attackTimer = 2.4;
      this.burstShots = 3; // Ráfaga de 3 disparos precisos
      if (Math.random() < 0.4) {
        this.dialogText = '¡NO TIENES ESCAPATORIA!';
        this.dialogTimer = 2.0;
      }
    }

    if (this.burstShots > 0 && this.burstCooldown <= 0) {
      this.burstCooldown = 0.14;
      this.burstShots--;

      const angle = Math.atan2(ty - (this.y - 4), tx - this.x);
      const spd = 8.0;
      projectiles.push(new Projectile(
        this.x + this.facing * 18, this.y - 4,
        Math.cos(angle) * spd, Math.sin(angle) * spd,
        WEAPON_TYPES.RIFLE,
        'enemy',
        20
      ));
      audio.playShootRifle();
      particleSystem.createMuzzleFlash(this.x + this.facing * 18, this.y - 4, angle);
    }
  }

  takeDamage(amount, hitX, hitY) {
    if (this.dead) return;
    this.hp -= amount;
    particleSystem.createBloodSpurt(this.x, this.y);

    if (this.hp <= 0 && !this.dead) {
      this.destroyBase();
    }
  }

  destroyBase() {
    this.dead = true;
    this.destroyed = true;
    this.hp = 0;
    this.vx = 0;
    this.vy = 0;

    audio.playExplosion(1.5);
    particleSystem.createExplosion(this.x, this.y, 60, 40);

    // Disparar la cinemática final requerida:
    // El soldado parado mirando el cadáver del comandante y 4 helicópteros llegando
    if (typeof window.onEvilCommanderDefeated === 'function') {
      window.onEvilCommanderDefeated();
    } else if (typeof window.onBaseDestroyed === 'function') {
      window.onBaseDestroyed();
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.scale(this.facing, 1);

    // Si está muerto, dibujarlo derrotado en el suelo
    if (this.dead) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-25, 12, 50, 10);
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.arc(-30, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 1. Capa oscura de comandante ondeando
    const capeSwing = Math.sin(this.walkCycle) * 8;
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(-10, -15);
    ctx.lineTo(-24 + capeSwing, 22);
    ctx.lineTo(-6, 20);
    ctx.closePath();
    ctx.fill();

    // 2. Piernas y botas de oficial
    const legSwing = Math.sin(this.walkCycle) * (Math.abs(this.vx) > 0.1 ? 7 : 0);
    ctx.fillStyle = '#0f172a'; // Pantalón oscuro
    ctx.fillRect(-7 + legSwing, 6, 6, 18);
    ctx.fillRect(2 - legSwing, 6, 6, 18);

    // 3. Torso: Capote / Guerrera militar de oficial
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, -18, 20, 24);

    // Hombreras doradas de comandante
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-12, -18, 6, 4);
    ctx.fillRect(6, -18, 6, 4);

    // Cinturón y botones dorados
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-1, -12, 3, 3);
    ctx.fillRect(-1, -6, 3, 3);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-10, 2, 20, 3);

    // 4. Cabeza del comandante
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.arc(0, -25, 7, 0, Math.PI * 2);
    ctx.fill();

    // OJOS ROJOS BRILLANTES (REQUERIMIENTO EXPLÍCITO)
    ctx.fillStyle = '#ff0033';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(3, -26, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gorra militar de oficial de alto rango con visera
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, -33, 18, 6);
    ctx.fillStyle = '#ffd700'; // Escudo / insignia águila dorada en la gorra
    ctx.fillRect(-3, -32, 6, 3);
    ctx.fillStyle = '#0f172a'; // Visera negra
    ctx.fillRect(0, -28, 12, 3);

    // 5. Rifle / Arma de oficial en mano
    ctx.fillStyle = '#111';
    ctx.fillRect(4, -8, 22, 6);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(2, -6, 4, 3);

    // 6. Barra de vida encima del comandante
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-18, -44, (this.hp / this.maxHp) * 36, 4);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-18, -44, 36, 4);

    // Burbuja de diálogo si está hablando
    if (this.dialogTimer > 0 && this.dialogText) {
      ctx.save();
      ctx.font = 'bold 9px "Orbitron", sans-serif';
      const tw = ctx.measureText(this.dialogText).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-tw / 2 - 5, -62, tw + 10, 14);
      ctx.strokeStyle = '#ff0033';
      ctx.lineWidth = 1;
      ctx.strokeRect(-tw / 2 - 5, -62, tw + 10, 14);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(this.dialogText, 0, -52);
      ctx.restore();
    }

    ctx.restore();
  }
}

// Compatibilidad
window.EnemyHelicopter = EnemyHelicopter;
window.HeliRocketCrate = HeliRocketCrate;
window.GiantBossHelicopter = GiantBossHelicopter;
window.EvilCommanderBoss = EvilCommanderBoss;
window.SuperSoldierBoss = EvilCommanderBoss;
window.RadarComplexBoss = GiantBossHelicopter;
