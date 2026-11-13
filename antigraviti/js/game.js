/* ===== game.js ===== */
/**
 * GUERRA EN EL BOSQUE - MOTOR PRINCIPAL DE JUEGO
 * Run & Gun Arcade estilo Contra / Metal Slug
 */

// ============================================================================
// VARIABLES GLOBALES Y ESTADO DEL JUEGO
// ============================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let projectiles = window.projectiles;
let coins = window.coins;
let crates = window.crates;
let traps = window.traps;
let enemies = window.enemies;
let vehicles = window.vehicles;
let medkits = window.medkits;

// Estado general
const GAME_STATE = {
  MENU: 'MENU',
  CINEMATIC: 'CINEMATIC',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY'
};

let currentState = GAME_STATE.MENU;
let difficulty = 'normal'; // 'easy', 'normal', 'hard'
let isLevelEnding = false;

// ============================================================================
// CONFIGURACIÓN DE LOS 5 NIVELES DE CAMPAÑA SELVÁTICA
// ============================================================================
const LEVEL_DATA = {
  1: {
    number: 1,
    name: 'SELVA ESMERALDA',
    subtitle: 'INFILTRACIÓN EN BASE ALFA',
    biome: 'emerald',
    bossName: 'FORTALEZA DEL BOSQUE: NÚCLEO CENTRAL',
    bossType: 'bunker'
  },
  2: {
    number: 2,
    name: 'PANTANO TÓXICO',
    subtitle: 'OPERACIÓN REFINERÍA QUÍMICA',
    biome: 'swamp',
    bossName: 'REFINERÍA QUÍMICA: GENERADOR TÓXICO',
    bossType: 'toxic'
  },
  3: {
    number: 3,
    name: 'SELVA VOLCÁNICA',
    subtitle: 'QUEBRADA DE FUEGO Y BASALTO',
    biome: 'volcanic',
    bossName: 'FORTALEZA GEOTÉRMICA: CAÑÓN DE MAGMA',
    bossType: 'volcanic'
  },
  4: {
    number: 4,
    name: 'COMBATE AÉREO 🚁',
    subtitle: 'OPERACIÓN ASALTO EN HELICÓPTERO',
    biome: 'storm',
    bossName: 'HELICÓPTERO GIGANTE DE COMBATE: TITÁN-X',
    bossType: 'giant_heli'
  },
  5: {
    number: 5,
    name: 'TEMPLO ANCESTRAL ⭐',
    subtitle: 'DUELO CONTRA EL COMANDANTE MALVADO',
    biome: 'temple',
    bossName: 'COMANDANTE MALVADO (OJOS ROJOS)',
    bossType: 'evil_commander'
  }
};

let currentLevel = 1;

// Ajustes por dificultad equilibrados
const DIFFICULTY_CONFIG = {
  easy: {
    enemyFireRateMultiplier: 1.4, // disparan más espaciado
    enemyBulletSpeed: 5.0,
    playerDamageMultiplier: 0.6,
    tankMaxArmor: 150,
    crateDropRate: 0.9,
    label: 'FÁCIL'
  },
  normal: {
    enemyFireRateMultiplier: 1.0,
    enemyBulletSpeed: 6.0,
    playerDamageMultiplier: 1.0,
    tankMaxArmor: 120,
    crateDropRate: 0.7,
    label: 'NORMAL'
  },
  hard: {
    enemyFireRateMultiplier: 0.8,
    enemyBulletSpeed: 7.6,
    playerDamageMultiplier: 1.25,
    tankMaxArmor: 85,
    crateDropRate: 0.5,
    label: 'DIFÍCIL'
  }
};
window.getDifficultyConfig = () => DIFFICULTY_CONFIG[difficulty];

// Objeto de entrada (Teclado y Ratón)
const input = {
  keys: {},
  mouseX: 640,
  mouseY: 360,
  mouseDown: false,
  rightMouseDown: false
};

// Cámara que sigue al jugador en la selva con suavizado
const camera = {
  x: 0,
  y: 0,
  width: 1280,
  height: 720,
  shake: 0,
  update(targetX, targetY, mapWidth) {
    // Seguir suavemente
    const desiredX = targetX - this.width * 0.4;
    this.x += (desiredX - this.x) * 0.08;
    this.x = Math.max(0, Math.min(mapWidth - this.width, this.x));

    // Reducir temblor de pantalla si hay explosiones
    if (this.shake > 0) {
      this.shake = Math.min(4.5, this.shake);
      this.x += (Math.random() - 0.5) * this.shake;
      this.y = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - 0.35);
    } else {
      this.y = 0;
    }
  }
};

// ============================================================================
// CLASE DEL JUGADOR (COMANDO)
// ============================================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 46;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3.8; // Velocidad ni tan rápida ni tan lenta (calibrada)
    this.jumpForce = -9.8;
    this.gravity = 22;
    this.isGrounded = false;
    this.isCrouching = false;
    this.facing = 1;

    // Requerimiento 1: Doble Salto con barra espaciadora
    this.jumpCount = 0;
    this.jumpKeyPrev = false;

    // Requerimiento 2: Cuchillo táctico cuerpo a cuerpo con tecla [F]
    this.knifeTimer = 0;
    this.isKnifing = false;
    this.knifeAnim = 0;

    // Requerimiento 4: Modo Combate Aéreo en Helicóptero (Nivel 4)
    this.isHelicopterMode = false;
    this.helicopterHeat = 0;
    this.helicopterOverheated = false;
    this.helicopterRockets = 5; // Empieza con 5 cohetes
    this.helicopterRotorAngle = 0;
    this.helicopterTilt = 0;
    this.rocketCooldown = 0;

    // Salud (una sola barra: si llega a 0 se acaba el juego)
    this.hp = 100; // Salud / Blindaje táctico por vida
    this.maxHp = 100;
    this.invulnerableTimer = 0;
    this.dead = false;

    // Arsenal estándar
    this.weapon = WEAPON_TYPES.RIFLE;
    this.ammo = Infinity;
    this.fireTimer = 0;

    // Puntos y economía
    this.score = 0;
    this.coins = 0;
    this.kills = 0;

    // Vehículo
    this.inVehicle = false;
    this.tank = null;

    // Animación
    this.walkCycle = 0;
    this.aimAngle = 0;
  }

  update(dt, world, cam) {
    if (this.dead) return;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }

    // ========================================================================
    // REQUERIMIENTO 4: MODO DE COMBATE AÉREO EN HELICÓPTERO (NIVEL 4)
    // ========================================================================
    if (this.isHelicopterMode) {
      this.helicopterRotorAngle += dt * 48;
      if (this.rocketCooldown > 0) this.rocketCooldown -= dt;

      // Si el jefe fue derrotado y el nivel está terminando, el helicóptero avanza hacia adelante
      if (isLevelEnding) {
        this.vx = 280;
        this.vy = -12;
        this.helicopterTilt = 0.12;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        updateHelicopterHud(this);
        return;
      }

      // Vuelo libre bidireccional (W / A / S / D o Flechas)
      let hx = 0;
      let hy = 0;
      if (input.keys['ArrowLeft'] || input.keys['KeyA'] || input.keys['a']) hx -= 1;
      if (input.keys['ArrowRight'] || input.keys['KeyD'] || input.keys['d']) hx += 1;
      if (input.keys['ArrowUp'] || input.keys['KeyW'] || input.keys['w']) hy -= 1;
      if (input.keys['ArrowDown'] || input.keys['KeyS'] || input.keys['s']) hy += 1;

      this.vx = hx * 5.4;
      this.vy = hy * 4.6;

      // Inclinación aerodinámica suave
      this.helicopterTilt += ((this.vx * 0.04) - this.helicopterTilt) * 0.16;

      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;

      // Límites de vuelo seguro en el cielo
      this.y = Math.max(65, Math.min(620, this.y));
      this.x = Math.max(40, Math.min(world.width - 40, this.x));

      // Humo del motor de turbina
      if (Math.random() < 0.25) {
        particleSystem.createSmoke(this.x - 42, this.y + 4, 1, -1);
      }

      // Apuntado en 360 grados hacia la mira del ratón
      const worldMouseX = input.mouseX + cam.x;
      const worldMouseY = input.mouseY + cam.y;
      this.aimAngle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);
      this.facing = worldMouseX < this.x ? -1 : 1;

      // 1. METRALLETA DEL HELICÓPTERO CON BARRA DE SOBRECALENTAMIENTO
      if (input.mouseDown) {
        if (!this.helicopterOverheated) {
          // Aumenta la barra de calor progresivamente al disparar
          this.helicopterHeat = Math.min(100, this.helicopterHeat + 34 * dt);
          if (this.helicopterHeat >= 100) {
            this.helicopterHeat = 100;
            this.helicopterOverheated = true;
            if (audio.playOverheatAlert) audio.playOverheatAlert();
          }

          // Disparo continuo de metralleta pesada
          if (this.fireTimer <= 0) {
            this.fireTimer = 0.085;
            const noseX = this.x + Math.cos(this.aimAngle) * 36;
            const noseY = this.y + 6 + Math.sin(this.aimAngle) * 36;
            const spd = 18;
            projectiles.push(new Projectile(
              noseX, noseY,
              Math.cos(this.aimAngle) * spd, Math.sin(this.aimAngle) * spd,
              WEAPON_TYPES.RIFLE,
              'player',
              25
            ));
            audio.playShootMinigun();
            particleSystem.createMuzzleFlash(noseX, noseY, this.aimAngle);
          }
        }
      } else {
        // Enfriamiento de la barra de calor cuando el jugador deja de disparar
        if (this.helicopterHeat > 0) {
          this.helicopterHeat = Math.max(0, this.helicopterHeat - 26 * dt);
          // Si llega a 0% completamente, se reactiva el arma
          if (this.helicopterHeat <= 0 && this.helicopterOverheated) {
            this.helicopterOverheated = false;
            if (audio.playOverheatCooldown) audio.playOverheatCooldown();
          }
        }
      }

      // 2. COHETES LIMITADOS DEL HELICÓPTERO (5 iniciales, recargables con cajas)
      const rocketPressed = input.keys['Space'] || input.keys['KeyQ'] || input.keys['q'] || input.rightMouseDown;
      if (rocketPressed && this.helicopterRockets > 0 && this.rocketCooldown <= 0) {
        this.helicopterRockets--;
        this.rocketCooldown = 0.55;
        const noseX = this.x + Math.cos(this.aimAngle) * 36;
        const noseY = this.y + 12 + Math.sin(this.aimAngle) * 36;
        const spd = 14;
        projectiles.push(new Projectile(
          noseX, noseY,
          Math.cos(this.aimAngle) * spd, Math.sin(this.aimAngle) * spd,
          WEAPON_TYPES.ROCKET,
          'player',
          160
        ));
        audio.playShootRocket();
        particleSystem.createExplosion(noseX, noseY, 20, 10);
      }

      updateHelicopterHud(this);
      return;
    }

    // ========================================================================
    // MODO COMBATE TERRESTRE / A PIE / TANQUE (NIVELES 1, 2, 3, 5)
    // ========================================================================
    // Si está conduciendo el tanque
    if (this.inVehicle && this.tank) {
      this.x = this.tank.x;
      this.y = this.tank.y;

      // Salir del tanque con E
      if (input.keys['KeyE'] || input.keys['e']) {
        input.keys['KeyE'] = false;
        input.keys['e'] = false;
        this.exitVehicle();
      }
      return;
    }

    // Requerimiento 2: Cuchillo táctico cuerpo a cuerpo con tecla F
    if (this.knifeTimer > 0) this.knifeTimer -= dt;
    if (this.knifeAnim > 0) {
      this.knifeAnim -= dt;
      if (this.knifeAnim <= 0) this.isKnifing = false;
    }

    const knifePressed = input.keys['KeyF'] || input.keys['f'];
    if (knifePressed && this.knifeTimer <= 0) {
      this.slashKnife();
    }

    // Movimiento horizontal a pie
    let moveDir = 0;
    if (input.keys['ArrowLeft'] || input.keys['KeyA'] || input.keys['a']) moveDir -= 1;
    if (input.keys['ArrowRight'] || input.keys['KeyD'] || input.keys['d']) moveDir += 1;

    // Agacharse con S o Abajo
    this.isCrouching = (input.keys['ArrowDown'] || input.keys['KeyS'] || input.keys['s']) && this.isGrounded;

    if (!this.isCrouching) {
      this.vx = moveDir * this.speed;
      if (moveDir !== 0) {
        this.walkCycle += dt * 10;
      }
    } else {
      this.vx = 0;
    }

    // Requerimiento 1: Salto y DOBLE SALTO con la barra espaciadora
    const jumpPressed = !!(input.keys['ArrowUp'] || input.keys['KeyW'] || input.keys['w'] || input.keys['Space'] || input.keys[' ']);
    const jumpJustPressed = jumpPressed && !this.jumpKeyPrev;
    this.jumpKeyPrev = jumpPressed;

    if (jumpJustPressed) {
      if (this.isGrounded && !this.isCrouching) {
        // Primer salto desde el suelo
        this.vy = this.jumpForce;
        this.isGrounded = false;
        this.jumpCount = 1;
        audio.playJump();
      } else if (!this.isGrounded && this.jumpCount === 1) {
        // Segundo salto en el aire (DOBLE SALTO)
        this.vy = this.jumpForce * 0.95;
        this.jumpCount = 2;
        if (audio.playDoubleJump) audio.playDoubleJump(); else audio.playJump();
        particleSystem.createSparks(this.x, this.y + this.height / 2, 0, 2, 8, '#ffffff');
      }
    }

    // Aplicar gravedad
    this.vy += this.gravity * dt;

    // Mover y comprobar colisiones
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Suelo
    const groundY = world.getGroundHeight(this.x);
    if (this.y + this.height / 2 >= groundY) {
      this.y = groundY - this.height / 2;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0; // Se resetea el doble salto
    } else {
      // Plataformas
      const plat = world.getPlatformAt(this.x, this.y + this.height / 2, this.vy);
      if (plat && !this.isCrouching) {
        this.y = plat.y - this.height / 2;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0; // Se resetea el doble salto
      } else {
        this.isGrounded = false;
      }
    }

    // Límite del mapa
    this.x = Math.max(16, Math.min(world.width - 20, this.x));

    // Apuntado en 360 grados con el ratón
    const worldMouseX = input.mouseX + cam.x;
    const worldMouseY = input.mouseY + cam.y;
    this.aimAngle = Math.atan2(worldMouseY - (this.y - 6), worldMouseX - this.x);
    this.facing = worldMouseX < this.x ? -1 : 1;

    // Disparo con clic izquierdo
    if (input.mouseDown && this.fireTimer <= 0) {
      this.shoot();
    }

    // Interacción con tanque cercano (E)
    const alliedTank = vehicles.find(v => v instanceof AlliedTank && v.active);
    if (alliedTank && Math.hypot(alliedTank.x - this.x, alliedTank.y - this.y) < 70) {
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl) promptEl.classList.remove('hidden');

      if (input.keys['KeyE'] || input.keys['e']) {
        input.keys['KeyE'] = false;
        input.keys['e'] = false;
        this.enterVehicle(alliedTank);
      }
    } else {
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl) promptEl.classList.add('hidden');
    }
  }

  // Requerimiento 2: Ataque cuerpo a cuerpo letal con cuchillo militar
  slashKnife() {
    this.knifeTimer = 0.35;
    this.isKnifing = true;
    this.knifeAnim = 0.22;
    if (audio.playKnifeSlash) audio.playKnifeSlash();

    const meleeRange = 75;
    let hitCount = 0;

    // Eliminar enemigos de infantería o drones cercanos
    for (const e of enemies) {
      if (!e.dead) {
        const dist = Math.hypot(e.x - this.x, e.y - this.y);
        const inFront = (this.facing === 1 && e.x >= this.x - 25) || (this.facing === -1 && e.x <= this.x + 25);
        if (dist <= meleeRange && inFront) {
          e.takeDamage(260); // Daño letal instantáneo
          particleSystem.createBloodSpurt(e.x, e.y);
          particleSystem.createSparks(e.x, e.y, this.facing * 3, -1, 8, '#ffffff');
          hitCount++;
        }
      }
    }

    // Dañar barriles y minas adyacentes
    for (const t of traps) {
      if (t instanceof ExplosiveBarrel || t instanceof Landmine) {
        if (Math.hypot(t.x - this.x, t.y - this.y) < 60) {
          t.takeDamage(200, this, this.tank, enemies);
          hitCount++;
        }
      }
    }

    // Romper cajas de armas cercanas
    for (const c of crates) {
      if (!c.dead && Math.hypot(c.x - this.x, c.y - this.y) < 60) {
        c.takeDamage(200, this);
        hitCount++;
      }
    }

    // Dañar al jefe si está cuerpo a cuerpo
    if (bossFortress && !bossFortress.destroyed) {
      const bx = bossFortress.x + (bossFortress.width ? bossFortress.width / 2 : 0);
      const by = bossFortress.y + (bossFortress.height ? bossFortress.height / 2 : 0);
      if (Math.hypot(bx - this.x, by - this.y) < 110) {
        bossFortress.takeDamage(90, this.x + this.facing * 30, this.y);
        hitCount++;
      }
    }

    if (hitCount > 0 && audio.playKnifeHit) {
      audio.playKnifeHit();
    }
  }

  shoot() {
    this.fireTimer = this.weapon.fireRate;
    const sx = this.x + Math.cos(this.aimAngle) * 20;
    const sy = this.y - 4 + Math.sin(this.aimAngle) * 20;

    // Reproducir audio según el arma
    if (this.weapon.id === 'SPREAD') audio.playShootSpread();
    else if (this.weapon.id === 'MACHINEGUN') audio.playShootMinigun();
    else if (this.weapon.id === 'LASER') audio.playShootLaser();
    else if (this.weapon.id === 'ROCKET') audio.playShootRocket();
    else audio.playShootRifle();

    // Casquillo expulsado
    particleSystem.createShellCasing(this.x, this.y - 4, this.facing);
    particleSystem.createMuzzleFlash(sx, sy, this.aimAngle);

    // Crear proyectiles
    if (this.weapon.pellets > 1 && this.weapon.spread) {
      // Disparo en abanico (Spread Shot)
      const startAngle = this.aimAngle - this.weapon.spread / 2;
      const step = this.weapon.spread / (this.weapon.pellets - 1);
      for (let i = 0; i < this.weapon.pellets; i++) {
        const a = startAngle + i * step;
        const vx = Math.cos(a) * this.weapon.speed;
        const vy = Math.sin(a) * this.weapon.speed;
        projectiles.push(new Projectile(sx, sy, vx, vy, this.weapon, 'player'));
      }
    } else {
      // Disparo individual
      const a = this.aimAngle + (Math.random() - 0.5) * (this.weapon.spread || 0);
      const vx = Math.cos(a) * this.weapon.speed;
      const vy = Math.sin(a) * this.weapon.speed;
      projectiles.push(new Projectile(sx, sy, vx, vy, this.weapon, 'player'));
    }

    // Gestionar munición si no es infinita
    if (this.ammo !== Infinity) {
      this.ammo--;
      if (this.ammo <= 0) {
        // Regresa al rifle estándar
        this.weapon = WEAPON_TYPES.RIFLE;
        this.ammo = Infinity;
        updateHudWeapon(this.weapon, this.ammo);
      } else {
        updateHudWeapon(this.weapon, this.ammo);
      }
    }
  }

  takeDamage(amount = 20, source = 'impacto') {
    if (this.dead || this.invulnerableTimer > 0) return;

    // Si está en el tanque, el tanque absorbe el golpe
    if (this.inVehicle && this.tank) {
      this.tank.takeDamage(25);
      return;
    }

    const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
    const actualDmg = Math.round(amount * (cfg.playerDamageMultiplier || 1.0));

    this.hp -= actualDmg;
    this.invulnerableTimer = 1.6; // período de inmunidad tras golpe
    audio.playPlayerHurt();
    if (this.isHelicopterMode) {
      particleSystem.createSparks(this.x, this.y, 0, -1, 10, '#ffee55');
      particleSystem.createSmoke(this.x, this.y, 2, -1);
    } else {
      particleSystem.createBloodSpurt(this.x, this.y);
    }
    camera.shake = 3.5; // vibración suave sin desorientar

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }

    updateHudHp(this.hp, this.maxHp);
  }

  heal(amount = 50) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    updateHudHp(this.hp, this.maxHp);
  }

  die() {
    this.dead = true;
    audio.playExplosion(1.2);
    particleSystem.createExplosion(this.x, this.y, 45, 35);
    setTimeout(() => {
      triggerGameOver();
    }, 1200);
  }

  equipWeapon(weaponData) {
    this.weapon = weaponData;
    this.ammo = weaponData.ammo || 50;
    updateHudWeapon(this.weapon, this.ammo);
  }

  enterVehicle(tank) {
    this.inVehicle = true;
    this.tank = tank;
    tank.isOccupied = true;
    audio.playVehicleEnter();

    const vehicleHud = document.getElementById('vehicle-hud');
    if (vehicleHud) vehicleHud.classList.remove('hidden');
    const promptEl = document.getElementById('interaction-prompt');
    if (promptEl) promptEl.classList.add('hidden');
  }

  exitVehicle() {
    if (!this.inVehicle || !this.tank) return;
    this.inVehicle = false;
    this.tank.isOccupied = false;
    this.x = this.tank.x - 40;
    this.y = this.tank.y - 20;
    this.vy = -6; // pequeño salto al salir
    this.tank = null;
    audio.playVehicleEnter();

    const vehicleHud = document.getElementById('vehicle-hud');
    if (vehicleHud) vehicleHud.classList.add('hidden');
  }

  addScoreAndCoins(pts, coinsCount = 1) {
    this.score += pts;
    this.coins += coinsCount;
    this.kills += 1;
    updateHudScore(this.score, this.coins);
  }

  drawHelicopterPlayer(ctx, rx, ry) {
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(this.helicopterTilt);

    // Efecto de parpadeo durante invulnerabilidad
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 12) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Fuselaje del helicóptero de combate del jugador
    ctx.fillStyle = '#2d5a36'; // Verde camuflaje comando
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4e804f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cola y timón trasero
    ctx.fillStyle = '#1e3823';
    ctx.beginPath();
    ctx.moveTo(-36, -4);
    ctx.lineTo(-85, -12);
    ctx.lineTo(-85, -2);
    ctx.lineTo(-36, 8);
    ctx.closePath();
    ctx.fill();

    // Rotor de cola girando
    ctx.fillStyle = '#111';
    ctx.fillRect(-87, -24, 4, 22);

    // Cabina acristalada con tinte azul cielo
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.ellipse(24, -4, 18, 12, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // El soldado comando piloteando adentro con su bandana roja
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(22, -8, 8, 4); // Bandana roja visible tras el parabrisas

    // Minigun delantera apuntando hacia el ángulo de la mira (aimAngle)
    ctx.save();
    ctx.translate(34, 8);
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -3, 20, 6);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(16, -2, 6, 4);
    ctx.restore();

    // Lanzacohetes montados en los alerones
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, 14, 26, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(14, 16, 4, 4);

    // Mástil de rotor principal
    ctx.fillStyle = '#111';
    ctx.fillRect(-4, -30, 8, 10);

    // Aspas giratorias del rotor principal
    const bladeSpan = Math.cos(this.helicopterRotorAngle) * 80;
    ctx.fillStyle = '#090d0b';
    ctx.fillRect(-bladeSpan, -32, bladeSpan * 2, 4);

    // Patines de aterrizaje
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-28, 28);
    ctx.lineTo(36, 28);
    ctx.moveTo(-16, 16);
    ctx.lineTo(-16, 28);
    ctx.moveTo(22, 16);
    ctx.lineTo(22, 28);
    ctx.stroke();

    ctx.restore();
  }

  draw(ctx, cam) {
    if (this.dead || this.inVehicle) return;

    const rx = this.x - cam.x;
    const ry = this.y - cam.y;

    // Modo Helicóptero de Combate Aéreo
    if (this.isHelicopterMode) {
      this.drawHelicopterPlayer(ctx, rx, ry);
      return;
    }

    ctx.save();

    // Efecto de parpadeo durante invulnerabilidad
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 12) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    ctx.translate(rx, ry);

    // Requerimiento 2: Animación y corte del cuchillo táctico cuerpo a cuerpo
    if (this.isKnifing) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const slashAngle = this.facing > 0 ? 0 : Math.PI;
      ctx.arc(this.facing * 20, -6, 28, slashAngle - 0.7, slashAngle + 0.7);
      ctx.stroke();

      // Cuchillo de combate en mano
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(this.facing > 0 ? 10 : -26, -9, 20, 6);
      ctx.fillStyle = '#334155'; // Mango
      ctx.fillRect(this.facing > 0 ? 4 : -10, -8, 8, 4);
      ctx.restore();
    }

    // Si está agachado
    if (this.isCrouching) {
      // Piernas y torso agachado
      ctx.fillStyle = '#26382b';
      ctx.fillRect(-10, 4, 20, 14);

      // Cabeza
      ctx.fillStyle = '#e0a96d';
      ctx.beginPath();
      ctx.arc(0, -2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Bandana roja
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-7, -6, 14, 4);

      // Arma apuntando
      ctx.fillStyle = '#111';
      ctx.fillRect(this.facing > 0 ? 0 : -20, 0, 20, 5);
      ctx.restore();
      return;
    }

    // Piernas animadas al correr
    const legSwing = Math.sin(this.walkCycle) * (Math.abs(this.vx) > 0.1 ? 8 : 0);
    ctx.fillStyle = '#1e3823'; // Pantalón de camuflaje selva
    ctx.fillRect(-7 + legSwing, 8, 6, 16);
    ctx.fillRect(1 - legSwing, 8, 6, 16);

    // Botas militares negras
    ctx.fillStyle = '#111';
    ctx.fillRect(-7 + legSwing, 20, 7, 4);
    ctx.fillRect(1 - legSwing, 20, 7, 4);

    // Torso con chaleco verde
    ctx.fillStyle = '#395e3f';
    ctx.fillRect(-9, -12, 18, 20);

    // Cinturón de municiones
    ctx.fillStyle = '#bfa145';
    ctx.fillRect(-9, 4, 18, 3);

    // Cabeza del héroe estilo Contra / Rambo
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(0, -18, 7, 0, Math.PI * 2);
    ctx.fill();

    // Famosa bandana roja de comando
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-8, -22, 16, 4);
    // Cola de la bandana ondeando hacia atrás
    ctx.beginPath();
    ctx.moveTo(-this.facing * 8, -20);
    ctx.lineTo(-this.facing * 18, -18 + Math.sin(this.walkCycle * 2) * 3);
    ctx.lineTo(-this.facing * 18, -23 + Math.sin(this.walkCycle * 2) * 3);
    ctx.closePath();
    ctx.fill();

    // Brazo y arma rotando hacia el ángulo de la mira (mouse)
    ctx.save();
    ctx.translate(0, -4);
    ctx.rotate(this.aimAngle);

    // Arma en manos
    ctx.fillStyle = '#222';
    ctx.fillRect(0, -3, 24, 6);
    // Culata / detalle del rifle
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(-4, -2, 6, 4);

    ctx.restore();

    ctx.restore();
  }
}

// Instancia del jugador y del mundo
let player;
let world;
let introCinematic;
let bossFortress;

// ============================================================================
// NIVEL 4: ESCUADRAS ENEMIGAS, PUERTAS DE AVANCE Y SUMINISTROS
// El mapa mide 10400 px. En cada "puerta" (lockX) hay que destruir la escuadra
// antes de seguir; después se llega al Helicóptero Gigante Titán-X.
// Los enemigos están dormidos hasta que el jugador se acerca (1300 px).
// ============================================================================
const LEVEL4_ZONES = [
  { lockX: 2400, spawns: [['scout', 250, 230], ['gunship', 450, 300], ['drone', 200, 180], ['scout', 520, 260]] },
  { lockX: 4700, spawns: [['gunship', 300, 280], ['gunship', 520, 320], ['scout', 200, 230], ['scout', 450, 200], ['drone', 250, 190]] },
  { lockX: 6900, spawns: [['gunship', 250, 300], ['gunship', 450, 260], ['gunship', 600, 320], ['drone', 200, 180], ['drone', 400, 200], ['scout', 350, 230]] },
  { lockX: 8300, spawns: [['gunship', 300, 290], ['gunship', 500, 320], ['scout', 250, 220], ['scout', 450, 240], ['drone', 200, 190], ['drone', 380, 210]] }
];
// Enemigos sueltos entre puertas (sin bloqueo)
const LEVEL4_FREE_ENEMIES = [
  ['scout', 900, 220], ['drone', 1250, 180], ['gunship', 1750, 290],
  ['scout', 3200, 260], ['drone', 3450, 190], ['gunship', 3800, 300],
  ['scout', 5400, 240], ['drone', 5650, 200], ['gunship', 5950, 280],
  ['scout', 7500, 230], ['drone', 7750, 190]
];
// Cajas de cohetes en paracaídas: caen al acercarse el jugador
const LEVEL4_CRATE_X = [1000, 2000, 3000, 4200, 5500, 6400, 7600, 8700, 9150];
// Botiquines aéreos fijos [x, y]
const LEVEL4_MEDKITS = [[1800, 260], [3500, 300], [5100, 280], [6700, 300], [8100, 260], [9000, 320]];

let level4ZoneIndex = 0;
let level4LockTimer = 0;
let level4SupplyQueue = [];
let level4Lock = { active: false, remaining: 0 };
let level4Msg = { text: '', timer: 0 };
let level4VictoryStarted = false;

// ============================================================================
// INICIALIZACIÓN Y CONFIGURACIÓN DEL NIVEL (1 A 5)
// ============================================================================
function initLevel(levelNum = 1) {
  currentLevel = Math.max(1, Math.min(5, levelNum));
  isLevelEnding = false;

  const banner = document.getElementById('mission-accomplished-banner');
  if (banner) {
    banner.classList.add('hidden');
    banner.classList.remove('animate-slam');
  }
  audio.stopVictoryMusic();

  const lvlConfig = LEVEL_DATA[currentLevel];
  world = new JungleWorld(lvlConfig.biome);
  player = new Player(120, 580);
  window.projectiles = projectiles = [];
  window.coins = coins = [];
  window.crates = crates = [];
  window.traps = traps = [];
  window.enemies = enemies = [];
  window.vehicles = vehicles = [];
  window.medkits = medkits = [];

  const cfg = DIFFICULTY_CONFIG[difficulty];

  // ==========================================================================
  // CONFIGURACIÓN ÚNICA Y DIFERENCIADA POR NIVEL (REQUERIMIENTO 3, 4 Y 5)
  // ==========================================================================
  if (currentLevel === 1) {
    // ------------------------------------------------------------------------
    // NIVEL 1: SELVA ESMERALDA (Infiltración en Base Alfa)
    // ------------------------------------------------------------------------
    player.isHelicopterMode = false;
    player.x = 120;
    player.y = 580;

    // Tanque aliado para la selva clásica
    const alliedTank = new AlliedTank(1250, world.getGroundHeight(1250));
    alliedTank.armor = cfg.tankMaxArmor;
    alliedTank.maxArmor = cfg.tankMaxArmor;
    vehicles.push(alliedTank);

    // Trampas de la selva
    traps.push(new Landmine(520, world.getGroundHeight(520)));
    traps.push(new Spikes(600, world.getGroundHeight(600) - 18, 120));
    traps.push(new ExplosiveBarrel(850, world.getGroundHeight(850)));
    traps.push(new Landmine(1020, world.getGroundHeight(1020)));
    traps.push(new Spikes(2350, world.getGroundHeight(2350) - 18, 130));
    traps.push(new Landmine(2650, world.getGroundHeight(2650)));

    // Cajas de armas y suministros
    crates.push(new WeaponCrate(450, 500, 'SPREAD', false));
    crates.push(new WeaponCrate(950, 360, 'MACHINEGUN', true));
    crates.push(new WeaponCrate(1750, 410, 'LASER', false));
    crates.push(new WeaponCrate(2700, 370, 'ROCKET', true));

    medkits.push(new Medkit(1150, 580));
    medkits.push(new Medkit(2550, 440));

    // Enemigos de infantería y francotiradores en torres
    enemies.push(new EnemySoldier(400, world.getGroundHeight(400)));
    enemies.push(new EnemySoldier(550, world.getGroundHeight(550)));
    enemies.push(new EnemySniper(720, 420));
    enemies.push(new EnemySoldier(1050, world.getGroundHeight(1050)));
    enemies.push(new CombatDrone(1350, 320));
    enemies.push(new EnemySoldier(1550, world.getGroundHeight(1550), true));

    const enemyJeep = new EnemyVehicle(2000, world.getGroundHeight(2000), 'jeep');
    vehicles.push(enemyJeep);
    enemies.push(new EnemySniper(2100, 330));
    enemies.push(new CombatDrone(2250, 300));
    enemies.push(new EnemySoldier(2600, world.getGroundHeight(2600), true));
    enemies.push(new EnemySoldier(3350, world.getGroundHeight(3350), true));

    // Jefe: Búnker de Fortaleza Central
    bossFortress = new EnemyBaseFortress(3900, 400);

  } else if (currentLevel === 2) {
    // ------------------------------------------------------------------------
    // NIVEL 2: PANTANO TÓXICO (Refinería Química Enemiga)
    // ------------------------------------------------------------------------
    player.isHelicopterMode = false;
    player.x = 100;
    player.y = 590;

    // Tanque aliado ubicado en la colina de la refinería
    const alliedTank = new AlliedTank(1500, world.getGroundHeight(1500));
    alliedTank.armor = cfg.tankMaxArmor;
    alliedTank.maxArmor = cfg.tankMaxArmor;
    vehicles.push(alliedTank);

    // Barriles tóxicos y trampas químicas
    traps.push(new ExplosiveBarrel(500, world.getGroundHeight(500)));
    traps.push(new ExplosiveBarrel(700, world.getGroundHeight(700)));
    traps.push(new Landmine(1100, world.getGroundHeight(1100)));
    traps.push(new ExplosiveBarrel(1850, world.getGroundHeight(1850)));
    traps.push(new ExplosiveBarrel(2100, world.getGroundHeight(2100)));
    traps.push(new Landmine(2800, world.getGroundHeight(2800)));

    crates.push(new WeaponCrate(360, 490, 'MACHINEGUN', false));
    crates.push(new WeaponCrate(920, 350, 'LASER', true));
    crates.push(new WeaponCrate(1950, 330, 'SPREAD', false));
    crates.push(new WeaponCrate(2750, 360, 'ROCKET', true));

    medkits.push(new Medkit(850, 580));
    medkits.push(new Medkit(2400, 580));

    // Tropas tóxicas y drones químicos
    enemies.push(new EnemySoldier(420, world.getGroundHeight(420), true));
    enemies.push(new EnemySniper(650, 410));
    enemies.push(new CombatDrone(950, 300));
    enemies.push(new EnemySoldier(1200, world.getGroundHeight(1200), true));
    enemies.push(new EnemySniper(1980, 320));
    enemies.push(new CombatDrone(2200, 280));
    enemies.push(new EnemySoldier(2650, world.getGroundHeight(2650), true));
    enemies.push(new EnemySniper(3180, 430));

    // Jefe: Generador Químico Tóxico
    bossFortress = new ToxicRefineryBoss(3900, 400);

  } else if (currentLevel === 3) {
    // ------------------------------------------------------------------------
    // NIVEL 3: SELVA VOLCÁNICA (Quebrada de Basalto y Magma)
    // ------------------------------------------------------------------------
    player.isHelicopterMode = false;
    player.x = 100;
    player.y = 590;

    // Tanque aliado para atravesar la zona volcánica
    const alliedTank = new AlliedTank(1200, world.getGroundHeight(1200));
    alliedTank.armor = cfg.tankMaxArmor;
    alliedTank.maxArmor = cfg.tankMaxArmor;
    vehicles.push(alliedTank);

    traps.push(new ExplosiveBarrel(450, world.getGroundHeight(450)));
    traps.push(new Landmine(900, world.getGroundHeight(900)));
    traps.push(new ExplosiveBarrel(1400, world.getGroundHeight(1400)));
    traps.push(new ExplosiveBarrel(2000, world.getGroundHeight(2000)));
    traps.push(new Landmine(2450, world.getGroundHeight(2450)));
    traps.push(new ExplosiveBarrel(3100, world.getGroundHeight(3100)));

    crates.push(new WeaponCrate(600, 440, 'LASER', false));
    crates.push(new WeaponCrate(1560, 350, 'ROCKET', true));
    crates.push(new WeaponCrate(2280, 340, 'FLAMETHROWER', false));
    crates.push(new WeaponCrate(3050, 350, 'SPREAD', true));

    medkits.push(new Medkit(1100, 580));
    medkits.push(new Medkit(2500, 580));

    // Tanque pesado enemigo patrullando el sector de lava
    const enemyTank = new EnemyVehicle(2850, world.getGroundHeight(2850), 'tank');
    vehicles.push(enemyTank);

    enemies.push(new EnemySoldier(400, world.getGroundHeight(400), true));
    enemies.push(new EnemySniper(890, 360));
    enemies.push(new CombatDrone(1350, 290));
    enemies.push(new EnemySoldier(1750, world.getGroundHeight(1750), true));
    enemies.push(new EnemySniper(1950, 410));
    enemies.push(new CombatDrone(2350, 280));
    enemies.push(new EnemySoldier(3300, world.getGroundHeight(3300), true));

    // Jefe: Cañón de Magma Geotérmico
    bossFortress = new MagmaFortressBoss(3880, 390);

  } else if (currentLevel === 4) {
    // ------------------------------------------------------------------------
    // NIVEL 4: COMBATE AÉREO EN HELICÓPTERO (REDISEÑO TOTAL REQUERIMIENTO 4)
    // ------------------------------------------------------------------------
    player.isHelicopterMode = true;
    player.x = 180;
    player.y = 280;
    player.helicopterHeat = 0;
    player.helicopterOverheated = false;
    player.helicopterRockets = 5; // Exactamente 5 cohetes para el jugador

    // Estado de las puertas de avance y suministros
    level4ZoneIndex = 0;
    level4LockTimer = 0;
    level4Lock = { active: false, remaining: 0 };
    level4Msg = { text: '', timer: 0 };
    level4VictoryStarted = false;
    level4SupplyQueue = LEVEL4_CRATE_X.map(x => ({ x, spawned: false }));

    const spawnAir = (kind, x, y, zone) => {
      const e = kind === 'drone' ? new CombatDrone(x, y) : new EnemyHelicopter(x, y, kind);
      if (zone !== undefined) e.zone = zone;
      enemies.push(e);
    };

    // Enemigos sueltos a lo largo del recorrido
    LEVEL4_FREE_ENEMIES.forEach(([kind, x, y]) => spawnAir(kind, x, y));

    // Escuadras que bloquean el avance hasta ser destruidas
    LEVEL4_ZONES.forEach((zone, idx) => {
      zone.spawns.forEach(([kind, dx, y]) => spawnAir(kind, zone.lockX + dx, y, idx));
    });

    // Botiquines aéreos de emergencia
    LEVEL4_MEDKITS.forEach(([x, y]) => medkits.push(new Medkit(x, y)));

    // JEFE NIVEL 4: HELICÓPTERO GIGANTE DE COMBATE (TITÁN-X)
    bossFortress = new GiantBossHelicopter(9700, 260);

  } else if (currentLevel === 5) {
    // ------------------------------------------------------------------------
    // NIVEL 5: TEMPLO ANCESTRAL (REQUERIMIENTO 5: COMANDANTE MALVADO)
    // ------------------------------------------------------------------------
    player.isHelicopterMode = false;
    player.x = 120;
    player.y = 570;

    // Tanque aliado para el asalto exterior del templo
    const alliedTank = new AlliedTank(1900, world.getGroundHeight(1900));
    alliedTank.armor = cfg.tankMaxArmor;
    alliedTank.maxArmor = cfg.tankMaxArmor;
    vehicles.push(alliedTank);

    // Trampas antiguas
    traps.push(new Spikes(700, world.getGroundHeight(700) - 18, 120));
    traps.push(new ExplosiveBarrel(1100, world.getGroundHeight(1100)));
    traps.push(new Spikes(1600, world.getGroundHeight(1600) - 18, 110));
    traps.push(new Landmine(2400, world.getGroundHeight(2400)));
    traps.push(new ExplosiveBarrel(3000, world.getGroundHeight(3000)));

    crates.push(new WeaponCrate(400, 480, 'SPREAD', false));
    crates.push(new WeaponCrate(1020, 320, 'LASER', true));
    crates.push(new WeaponCrate(1750, 330, 'MACHINEGUN', false));
    crates.push(new WeaponCrate(2500, 350, 'ROCKET', true));

    medkits.push(new Medkit(1300, 580));
    medkits.push(new Medkit(2800, 560));
    medkits.push(new Medkit(3450, 520));

    // Tropas élite del templo
    enemies.push(new EnemySoldier(450, world.getGroundHeight(450), true));
    enemies.push(new EnemySniper(1020, 310));
    enemies.push(new CombatDrone(1450, 270));
    enemies.push(new EnemySoldier(1800, world.getGroundHeight(1800), true));
    enemies.push(new EnemySniper(2540, 340));
    enemies.push(new CombatDrone(2850, 260));
    enemies.push(new EnemySoldier(3300, world.getGroundHeight(3300), true));

    // ---- SECCIÓN EXTENDIDA: salas profundas del templo (x 3600 - 7000) ----
    // Segundo tanque aliado para el tramo largo
    const alliedTank2 = new AlliedTank(5300, world.getGroundHeight(5300));
    alliedTank2.armor = cfg.tankMaxArmor;
    alliedTank2.maxArmor = cfg.tankMaxArmor;
    vehicles.push(alliedTank2);

    traps.push(new Landmine(3800, world.getGroundHeight(3800)));
    traps.push(new Spikes(4150, world.getGroundHeight(4150) - 18, 120));
    traps.push(new ExplosiveBarrel(4500, world.getGroundHeight(4500)));
    traps.push(new Landmine(4900, world.getGroundHeight(4900)));
    traps.push(new Spikes(5700, world.getGroundHeight(5700) - 18, 110));
    traps.push(new ExplosiveBarrel(6000, world.getGroundHeight(6000)));
    traps.push(new Landmine(6350, world.getGroundHeight(6350)));
    traps.push(new Spikes(6700, world.getGroundHeight(6700) - 18, 120));

    crates.push(new WeaponCrate(3900, 400, 'FLAMETHROWER', false));
    crates.push(new WeaponCrate(4800, 330, 'MACHINEGUN', true));
    crates.push(new WeaponCrate(5800, 340, 'LASER', false));
    crates.push(new WeaponCrate(6500, 330, 'ROCKET', true));

    medkits.push(new Medkit(4100, 520));
    medkits.push(new Medkit(5000, 540));
    medkits.push(new Medkit(5900, 520));
    medkits.push(new Medkit(6800, 520));

    enemies.push(new EnemySoldier(3750, world.getGroundHeight(3750), true));
    enemies.push(new CombatDrone(4000, 270));
    enemies.push(new EnemySniper(4200, 330));
    enemies.push(new EnemySoldier(4500, world.getGroundHeight(4500), true));
    enemies.push(new EnemySoldier(4800, world.getGroundHeight(4800), true));
    enemies.push(new CombatDrone(5000, 260));
    enemies.push(new EnemySniper(5300, 340));
    enemies.push(new EnemySoldier(5600, world.getGroundHeight(5600), true));
    enemies.push(new CombatDrone(5850, 270));
    enemies.push(new EnemySoldier(6100, world.getGroundHeight(6100), true));
    enemies.push(new EnemySniper(6350, 330));
    enemies.push(new EnemySoldier(6600, world.getGroundHeight(6600), true));
    enemies.push(new CombatDrone(6850, 260));

    // JEFE FINAL NIVEL 5: COMANDANTE MALVADO (OJOS ROJOS Y MOVILIDAD ÁGIL)
    bossFortress = new EvilCommanderBoss(7550, 490);
  }

  // 6. Actualizar HUD inicial
  updateHudHp(player.hp, player.maxHp);
  updateHudWeapon(player.weapon, player.ammo);
  updateHudScore(player.score, player.coins);
  const diffTag = document.getElementById('hud-difficulty-tag');
  if (diffTag) diffTag.textContent = cfg.label;

  const levelTag = document.getElementById('hud-level-badge');
  if (levelTag) levelTag.textContent = `NIVEL ${currentLevel}/5: ${lvlConfig.name}`;

  const missionTag = document.getElementById('hud-mission-tag');
  if (missionTag) missionTag.textContent = `MISIÓN: ${lvlConfig.subtitle}`;

  const bossTitle = document.getElementById('boss-title');
  if (bossTitle) bossTitle.textContent = `⚠️ ${lvlConfig.bossName} ⚠️`;

  const bossBarContainer = document.getElementById('boss-hp-container');
  if (bossBarContainer) bossBarContainer.classList.add('hidden');

  // Mostrar u ocultar HUD de helicóptero
  updateHelicopterHud(player);

  // La barra del tanque empieza oculta en cada nivel
  const vehicleHudInit = document.getElementById('vehicle-hud');
  if (vehicleHudInit) vehicleHudInit.classList.add('hidden');
}

// ============================================================================
// FUNCIONES DE ACTUALIZACIÓN DEL HUD
// ============================================================================
function updateHelicopterHud(p) {
  const heliHud = document.getElementById('helicopter-hud');
  if (!heliHud) return;

  if (!p || !p.isHelicopterMode) {
    heliHud.classList.add('hidden');
    return;
  }

  heliHud.classList.remove('hidden');

  const heatFill = document.getElementById('heli-heat-fill');
  const heatLabel = document.getElementById('heli-heat-label');
  const rocketCount = document.getElementById('heli-rocket-count');

  const pct = Math.max(0, Math.min(100, Math.round(p.helicopterHeat)));
  if (heatFill) {
    heatFill.style.width = `${pct}%`;
    if (p.helicopterOverheated) {
      heatFill.classList.add('overheated');
    } else {
      heatFill.classList.remove('overheated');
    }
  }

  if (heatLabel) {
    if (p.helicopterOverheated) {
      heatLabel.textContent = '⚠️ ¡METRALLETA SOBRECALENTADA! ENFRIANDO...';
      heatLabel.style.color = '#ef4444';
    } else {
      heatLabel.textContent = `CALOR METRALLETA: ${pct}%`;
      heatLabel.style.color = pct > 75 ? '#f59e0b' : '#94a3b8';
    }
  }

  if (rocketCount) {
    rocketCount.textContent = `${p.helicopterRockets} / 5`;
  }
}
function updateHudHp(hp, maxHp) {
  const bar = document.getElementById('player-hp-bar');
  const txt = document.getElementById('player-hp-text');
  const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.classList.remove('warning', 'danger');
    if (pct <= 30) {
      bar.classList.add('danger');
    } else if (pct <= 60) {
      bar.classList.add('warning');
    }
  }
  if (txt) {
    txt.textContent = `SALUD: ${pct}%`;
  }
}

function updateHudWeapon(weapon, ammo) {
  const nameEl = document.getElementById('weapon-name');
  const iconEl = document.getElementById('weapon-icon');
  const ammoEl = document.getElementById('weapon-ammo');
  if (nameEl) nameEl.textContent = weapon.name;
  if (iconEl) iconEl.textContent = weapon.icon || '🔫';
  if (ammoEl) ammoEl.textContent = ammo === Infinity ? 'MUNICIÓN: INF' : `MUNICIÓN: ${ammo}`;
}

function updateHudScore(score, coins) {
  const scoreEl = document.getElementById('hud-score');
  const coinsEl = document.getElementById('hud-coins');
  if (scoreEl) scoreEl.textContent = String(score).padStart(6, '0');
  if (coinsEl) coinsEl.textContent = `🪙 ${coins}`;
}

function updateProgressBar() {
  if (!player || !world) return;
  const currentX = player.inVehicle && player.tank ? player.tank.x : player.x;
  const progress = Math.min(100, Math.max(0, (currentX / (world.width - 600)) * 100));

  const barEl = document.getElementById('mission-progress-bar');
  const radarEl = document.getElementById('player-radar-icon');
  if (barEl) barEl.style.width = `${progress}%`;
  if (radarEl) radarEl.style.left = `${progress}%`;

  // Mostrar barra de vida del jefe si estamos cerca de la base
  const bossBarContainer = document.getElementById('boss-hp-container');
  const bossFill = document.getElementById('boss-hp-bar');
  const showBossBar = currentLevel === 4
    ? (bossFortress && (bossFortress.awake || bossFortress.falling))
    : (bossFortress && currentX > (currentLevel === 5 ? 6900 : 3300));
  if (showBossBar) {
    if (bossBarContainer) bossBarContainer.classList.remove('hidden');
    if (bossFill) {
      const bossHpPct = Math.max(0, (bossFortress.hp / bossFortress.maxHp) * 100);
      bossFill.style.width = `${bossHpPct}%`;
    }
  }

  // La barra del tanque solo se ve mientras el jugador está dentro de un tanque activo
  const vehicleHudEl = document.getElementById('vehicle-hud');
  if (vehicleHudEl) {
    const inTank = !!(player.inVehicle && player.tank && player.tank.active);
    vehicleHudEl.classList.toggle('hidden', !inTank);
  }

  // Actualizar blindaje del tanque en HUD si está en el tanque
  if (player.inVehicle && player.tank) {
    const armorFill = document.getElementById('vehicle-armor-fill');
    if (armorFill) {
      const pct = Math.max(0, (player.tank.armor / player.tank.maxArmor) * 100);
      armorFill.style.width = `${pct}%`;
    }
  }
}

// ============================================================================
// BUCLE PRINCIPAL DE JUEGO (GAME LOOP)
// ============================================================================
let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.06, (now - lastTime) / 1000);
  lastTime = now;

  try {
    if (currentState === GAME_STATE.CINEMATIC) {
      introCinematic.update(dt);
      particleSystem.update(dt);

      // Dibujar fondo estático y cinemática
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      world.drawBackground(ctx, { x: 0, y: 0 });
      world.drawForeground(ctx, { x: 0, y: 0 });
      particleSystem.draw(ctx, { x: 0, y: 0 });
      introCinematic.draw(ctx);
    } else if (currentState === GAME_STATE.PLAYING) {
      updateGame(dt);
      renderGame();
    }
  } catch (err) {
    // Un error ya no congela el juego: se registra y se muestra en pantalla para poder depurarlo
    console.error('Error en el bucle de juego:', err);
    ctx.save();
    ctx.fillStyle = 'rgba(120, 0, 0, 0.85)';
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ERROR: ' + (err && err.message ? err.message : err), 12, canvas.height - 44);
    const where = err && err.stack ? String(err.stack).split('\n')[1] || '' : '';
    ctx.fillText(where.trim().slice(0, 150), 12, canvas.height - 22);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  world.update(dt);
  particleSystem.update(dt);

  // Actualizar jugador
  player.update(dt, world, camera);

  // Nivel 4: puertas de avance, suministros y mensajes
  if (currentLevel === 4) updateLevel4Locks(dt);

  // Actualizar cámara
  const targetX = player.inVehicle && player.tank ? player.tank.x : player.x;
  const targetY = player.inVehicle && player.tank ? player.tank.y : player.y;
  camera.update(targetX, targetY, world.width);

  // Actualizar Vehículos
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v instanceof AlliedTank) {
      v.update(dt, input, world, camera);
      // Aplastar enemigos de a pie con las orugas del tanque aliado
      if (v.isOccupied) {
        for (let e of enemies) {
          if (!e.dead && Math.abs(e.x - v.x) < 55 && Math.abs(e.y - v.y) < 35) {
            e.takeDamage(150);
            particleSystem.createBloodSpurt(e.x, e.y);
            audio.playExplosion(0.5);
          }
        }
      }
      if (!v.active) {
        if (player.inVehicle) player.exitVehicle();
        vehicles.splice(i, 1);
      }
    } else if (v instanceof EnemyVehicle) {
      v.update(dt, targetX, targetY, world);
      if (v.dead) {
        player.score += v.type === 'tank' ? 1200 : 600;
        player.kills++;
        vehicles.splice(i, 1);
      }
    }
  }

  // Actualizar Trampas
  for (let i = traps.length - 1; i >= 0; i--) {
    const t = traps[i];
    const alliedTank = vehicles.find(v => v instanceof AlliedTank && v.active);
    if (!t.update(dt, player, alliedTank, enemies)) {
      traps.splice(i, 1);
    }
  }

  // Actualizar Cajas y Suministros
  for (let i = crates.length - 1; i >= 0; i--) {
    if (!crates[i].update(dt, world, player)) {
      crates.splice(i, 1);
    }
  }

  // Actualizar Monedas
  for (let i = coins.length - 1; i >= 0; i--) {
    if (!coins[i].update(dt, world, player)) {
      coins.splice(i, 1);
    }
  }

  // Actualizar Botiquines
  for (let i = medkits.length - 1; i >= 0; i--) {
    if (!medkits[i].update(dt, player)) {
      medkits.splice(i, 1);
    }
  }

  // Actualizar Enemigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    // Nivel 4: los enemigos permanecen dormidos hasta que el jugador se acerca
    if (currentLevel === 4 && !e.awake) {
      if (Math.abs(e.x - player.x) > 1300) continue;
      e.awake = true;
    }
    e.update(dt, player, world, camera);
    if (e.dead) {
      player.kills++;
      enemies.splice(i, 1);
    }
  }

  // Actualizar Jefe Fortaleza de la Base
  // (el Titán-X también se actualiza mientras cae en llamas)
  if (bossFortress && (!bossFortress.destroyed || bossFortress.falling)) {
    if (currentLevel === 4 && !bossFortress.awake && !bossFortress.falling &&
        bossFortress.x - player.x < 1100) {
      bossFortress.awake = true;
    }
    if (currentLevel !== 4 || bossFortress.awake || bossFortress.falling) {
      bossFortress.update(dt, player);
    }
  }

  // Actualizar Proyectiles y sus Colisiones
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.update(dt, world)) {
      projectiles.splice(i, 1);
      continue;
    }

    // Colisión de proyectiles del jugador contra enemigos
    if (p.owner === 'player') {
      let hit = false;

      // Colisión contra enemigos de infantería / drones
      for (let e of enemies) {
        if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < (e.width / 2 + p.radius + 6)) {
          e.takeDamage(p.damage);
          p.onImpact(world);
          hit = true;
          break;
        }
      }

      // Colisión contra vehículos enemigos
      if (!hit) {
        for (let ev of vehicles) {
          if (ev instanceof EnemyVehicle && !ev.dead) {
            if (Math.hypot(ev.x - p.x, ev.y - p.y) < ev.width / 2) {
              ev.takeDamage(p.damage);
              p.onImpact(world);
              hit = true;
              break;
            }
          }
        }
      }

      // Colisión contra la base enemiga
      if (!hit && bossFortress && !bossFortress.destroyed) {
        const bossHit = (bossFortress instanceof GiantBossHelicopter)
          ? (Math.abs(p.x - (bossFortress.x + 3)) < 118 && Math.abs(p.y - bossFortress.y) < 55)
          : (p.x >= bossFortress.x && p.x <= bossFortress.x + bossFortress.width &&
             p.y >= bossFortress.y && p.y <= bossFortress.y + bossFortress.height);
        if (bossHit) {
          bossFortress.takeDamage(p.damage, p.x, p.y);
          p.onImpact(world);
          hit = true;
        }
      }

      // Colisión contra barriles y minas
      if (!hit) {
        for (let t of traps) {
          if (t instanceof ExplosiveBarrel || t instanceof Landmine) {
            if (Math.hypot(t.x - p.x, t.y - p.y) < 22) {
              t.takeDamage(p.damage, player, player.tank, enemies);
              p.onImpact(world);
              hit = true;
              break;
            }
          }
        }
      }

      // Colisión contra cajas de armas
      if (!hit) {
        for (let c of crates) {
          if (!c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 20) {
            c.takeDamage(p.damage, player);
            p.onImpact(world);
            hit = true;
            break;
          }
        }
      }

      // Interceptar proyectiles explosivos o bombas enemigas en el aire con disparos
      if (!hit) {
        for (let ep of projectiles) {
          if (ep.owner === 'enemy' && (ep.type.explosive || ep.isBomb) && !ep.dead) {
            if (Math.hypot(ep.x - p.x, ep.y - p.y) < (ep.radius + p.radius + 6)) {
              ep.onImpact(world);
              p.onImpact(world);
              hit = true;
              player.score += 50;
              break;
            }
          }
        }
      }

      if (hit && !p.type.piercing) {
        projectiles.splice(i, 1);
      }
    }

    // Colisión de proyectiles enemigos contra el jugador o su tanque
    else if (p.owner === 'enemy') {
      if (player.inVehicle && player.tank && player.tank.active) {
        if (Math.hypot(player.tank.x - p.x, player.tank.y - p.y) < player.tank.width / 2) {
          player.tank.takeDamage(p.damage * 0.4);
          p.onImpact(world);
          projectiles.splice(i, 1);
        }
      } else if (!player.dead) {
        const hitRadius = player.isHelicopterMode ? 36 : (player.width / 2 + p.radius + 4);
        if (Math.hypot(player.x - p.x, player.y - p.y) < hitRadius) {
          player.takeDamage(p.damage || 20, 'disparo');
          p.onImpact(world);
          projectiles.splice(i, 1);
        }
      }
    }
  }

  // Actualizar Barra de Progreso del HUD
  updateProgressBar();
}

function renderGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Fondos de paralaje de la selva
  world.drawBackground(ctx, camera);

  // 2. Terreno interactivo y plataformas
  world.drawForeground(ctx, camera);

  // 3. Trampas
  for (let t of traps) t.draw(ctx, camera);

  // 4. Objetos y Cajas
  for (let c of crates) c.draw(ctx, camera);
  for (let cn of coins) cn.draw(ctx, camera);
  for (let m of medkits) m.draw(ctx, camera);

  // 5. Vehículos
  for (let v of vehicles) v.draw(ctx, camera);

  // 6. Base Enemiga / Jefe
  if (bossFortress) bossFortress.draw(ctx, camera);

  // 7. Enemigos
  for (let e of enemies) e.draw(ctx, camera);

  // 8. Jugador Comando
  player.draw(ctx, camera);

  // 9. Proyectiles
  for (let p of projectiles) p.draw(ctx, camera);

  // 10. Partículas y Efectos
  particleSystem.draw(ctx, camera);

  // 11. Avisos del nivel 4 (puertas de avance)
  if (currentLevel === 4 && !isLevelEnding) drawLevel4Prompts(ctx);
}

// ============================================================================
// NIVEL 4: LÓGICA DE PUERTAS DE AVANCE Y AVISOS
// ============================================================================
function updateLevel4Locks(dt) {
  // Cajas de cohetes que caen en paracaídas cuando el jugador se acerca
  for (const s of level4SupplyQueue) {
    if (!s.spawned && player.x > s.x - 800) {
      s.spawned = true;
      crates.push(new HeliRocketCrate(s.x, 70));
    }
  }

  if (level4Msg.timer > 0) level4Msg.timer -= dt;
  level4Lock.active = false;
  if (isLevelEnding || !player || player.dead) return;

  const zone = LEVEL4_ZONES[level4ZoneIndex];
  if (!zone) return;

  const remaining = enemies.filter(e => e.zone === level4ZoneIndex && !e.dead).length;

  if (player.x >= zone.lockX - 40) level4LockTimer += dt;

  // Escuadra destruida (o 60 s de seguridad) -> se abre el camino
  if (remaining === 0 || level4LockTimer >= 60) {
    level4ZoneIndex++;
    level4LockTimer = 0;
    level4Msg = { text: level4ZoneIndex >= LEVEL4_ZONES.length ? '¡CAMINO LIBRE! TITÁN-X TE ESPERA ▶▶' : '¡CAMINO LIBRE! ▶▶', timer: 2.8 };
    return;
  }

  // Muro invisible hasta destruir la escuadra
  if (player.x > zone.lockX) {
    player.x = zone.lockX;
    if (player.vx > 0) player.vx = 0;
  }
  if (player.x > zone.lockX - 650) {
    level4Lock.active = true;
    level4Lock.remaining = remaining;
  }
}

function drawLevel4Prompts(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 14px "Orbitron", sans-serif';
  const cx = canvas.width / 2;
  if (level4Lock.active) {
    if (Math.floor(performance.now() / 350) % 2 === 0) {
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff5566';
      ctx.fillText(`⚠ DESTRUYE A LA ESCUADRA ENEMIGA (${level4Lock.remaining}) ⚠`, cx, 100);
    }
  } else if (level4Msg.timer > 0) {
    ctx.globalAlpha = Math.min(1, level4Msg.timer);
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(level4Msg.text, cx, 100);
  }
  ctx.restore();
}

// ============================================================================
// GESTIÓN DE PANTALLAS Y ESTADOS
// ============================================================================
function showScreen(screenId) {
  const screens = ['screen-menu', 'screen-instructions', 'screen-pause', 'screen-gameover', 'screen-victory', 'screen-level-select'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (screenId) {
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
  }
}

function startGame(levelNum = 1) {
  showScreen(null);
  initLevel(levelNum);

  if (levelNum === 1) {
    // Cinemática Nivel 1: Evacuación de helicóptero en llamas
    currentState = GAME_STATE.CINEMATIC;
    introCinematic = new IntroCinematic(() => {
      currentState = GAME_STATE.PLAYING;
      const hud = document.getElementById('hud-overlay');
      if (hud) hud.classList.remove('hidden');
      audio.startMusic();
    });
    introCinematic.start();
  } else if (levelNum === 4) {
    // Requerimiento 4: Cinemática Nivel 4 (Dos enemigos cuidando helicóptero -> comando los elimina -> se sube)
    currentState = GAME_STATE.CINEMATIC;
    introCinematic = new Level4IntroCinematic(() => {
      currentState = GAME_STATE.PLAYING;
      const hud = document.getElementById('hud-overlay');
      if (hud) hud.classList.remove('hidden');
      audio.startMusic();
    });
    introCinematic.start();
  } else if (levelNum === 5) {
    // Requerimiento 4: Cinemática Nivel 5 (Llegada en helicóptero -> soldado se baja -> dice frase)
    currentState = GAME_STATE.CINEMATIC;
    introCinematic = new Level5IntroCinematic(() => {
      currentState = GAME_STATE.PLAYING;
      const hud = document.getElementById('hud-overlay');
      if (hud) hud.classList.remove('hidden');
      audio.startMusic();
    });
    introCinematic.start();
  } else {
    // Iniciar combate directamente para niveles 2 y 3
    currentState = GAME_STATE.PLAYING;
    const hud = document.getElementById('hud-overlay');
    if (hud) hud.classList.remove('hidden');
    audio.startMusic();
  }
}

function pauseGame() {
  if (currentState !== GAME_STATE.PLAYING) return;
  currentState = GAME_STATE.PAUSED;
  showScreen('screen-pause');
}

function resumeGame() {
  if (currentState !== GAME_STATE.PAUSED) return;
  showScreen(null);
  currentState = GAME_STATE.PLAYING;
}

function triggerGameOver() {
  currentState = GAME_STATE.GAMEOVER;
  audio.stopMusic();
  const hud = document.getElementById('hud-overlay');
  if (hud) hud.classList.add('hidden');

  document.getElementById('final-score').textContent = player.score;
  document.getElementById('final-coins').textContent = player.coins;
  document.getElementById('final-kills').textContent = player.kills;

  showScreen('screen-gameover');
}

// ============================================================================
// MANEJADORES DE EVENTO: DESTRUCCIÓN DE BASE Y DERROTA DEL COMANDANTE MALVADO
// ============================================================================
// Requerimiento 4: Cuando el helicóptero gigante es derrotado, cae en llamas y el jugador avanza hacia adelante
window.onHelicopterBossDefeated = function() {
  isLevelEnding = true;
  if (player) {
    player.invulnerable = true;
    player.invulnerableTimer = 999;
  }
};

// Nivel 4: el Titán-X terminó de caer en llamas -> banner MISIÓN CUMPLIDA (sin cinemática;
// la cinemática del Templo Ancestral pertenece únicamente al inicio del nivel 5)
window.onHelicopterBossFell = function() {
  if (level4VictoryStarted) return;
  level4VictoryStarted = true;
  isLevelEnding = true;

  // Neutralizar proyectiles enemigos y ocultar el HUD de combate
  projectiles = projectiles.filter(p => p.owner === 'player');
  window.projectiles = projectiles;
  const hud = document.getElementById('hud-overlay');
  if (hud) hud.classList.add('hidden');
  audio.stopMusic();

  if (player) {
    player.invulnerable = true;
    player.invulnerableTimer = 999;
  }

  showMissionAccomplishedBanner();
};

// Banner retro "¡MISIÓN CUMPLIDA!" al derribar al jefe del nivel 4
function showMissionAccomplishedBanner() {
  audio.playVictoryMusic();

  const banner = document.getElementById('mission-accomplished-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.classList.remove('animate-slam');
    void banner.offsetWidth; // reiniciar animación
    banner.classList.add('animate-slam');
  }

  // Chispas doradas de celebración (posición relativa a la cámara actual)
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      if (currentState !== GAME_STATE.PLAYING || currentLevel !== 4) return;
      particleSystem.createSparks(
        camera.x + 200 + Math.random() * 880, camera.y + 120 + Math.random() * 240,
        (Math.random() - 0.5) * 6, -Math.random() * 8, 8, '#ffd700'
      );
    }, i * 110);
  }

  // Tras el banner pasa a la pantalla de resultados
  setTimeout(() => {
    if (currentLevel === 4 && level4VictoryStarted &&
        (currentState === GAME_STATE.PLAYING || currentState === GAME_STATE.PAUSED)) {
      triggerVictory();
    }
  }, 4500);
}

// Requerimiento 5: Cinemática final cuando el Comandante Malvado es derrotado
window.onEvilCommanderDefeated = function() {
  if (isLevelEnding) return;
  isLevelEnding = true;

  if (player) {
    player.invulnerable = true;
    player.invulnerableTimer = 999;
  }
  projectiles = projectiles.filter(p => p.owner === 'player');
  window.projectiles = projectiles;

  const hud = document.getElementById('hud-overlay');
  if (hud) hud.classList.add('hidden');

  // Cinemática: soldado mirando el cadáver del comandante y 4 helicópteros llegando
  currentState = GAME_STATE.CINEMATIC;
  introCinematic = new Level5VictoryCinematic(() => {
    triggerVictory();
  });
  introCinematic.start();
};

window.onBaseDestroyed = function() {
  if (isLevelEnding) return;
  isLevelEnding = true;

  // 1. Invulnerabilidad para el soldado durante la celebración de victoria
  if (player) {
    player.invulnerable = true;
    player.invulnerableTimer = 999;
  }

  // 2. Neutralizar proyectiles enemigos restantes en el aire
  projectiles = projectiles.filter(p => p.owner === 'player');
  window.projectiles = projectiles;

  // 3. Detener música de fondo de batalla y arrancar la fanfarria y música de victoria
  audio.playVictoryMusic();

  // 4. Mostrar el letrero retro arcade ¡MISIÓN CUMPLIDA!
  const banner = document.getElementById('mission-accomplished-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.classList.remove('animate-slam');
    void banner.offsetWidth; // Forzar reflow para reiniciar animación
    banner.classList.add('animate-slam');
  }

  // 5. Temblor de cámara por el impacto colosal
  camera.shake = 14;

  // 6. Efectos continuos de chispas doradas y fuegos artificiales de celebración
  if (particleSystem && bossFortress) {
    for (let i = 0; i < 35; i++) {
      setTimeout(() => {
        if (bossFortress) {
          const fx = bossFortress.x + Math.random() * (bossFortress.width || 120);
          const fy = bossFortress.y + Math.random() * ((bossFortress.height || 80) * 0.7);
          particleSystem.createSparks(fx, fy, (Math.random() - 0.5) * 6, -Math.random() * 8, 8, '#ffd700');
        }
      }, i * 85);
    }
  }

  // 7. Tras la explosión y el letrero de Misión Cumplida (3.5s), se acaba el nivel
  setTimeout(() => {
    triggerVictory();
  }, 3500);
};

function triggerVictory() {
  currentState = GAME_STATE.VICTORY;

  // Ocultar banner flotante para dar paso a la pantalla de reporte final
  const banner = document.getElementById('mission-accomplished-banner');
  if (banner) banner.classList.add('hidden');

  const hud = document.getElementById('hud-overlay');
  if (hud) hud.classList.add('hidden');

  // Bonificación por aniquilación del jefe (+10,000 pts)
  const totalScore = player.score + 10000;
  player.score = totalScore;

  document.getElementById('victory-score').textContent = totalScore;
  document.getElementById('victory-coins').textContent = player.coins;
  document.getElementById('victory-kills').textContent = player.kills;

  const titleEl = document.querySelector('.victory-title');
  const subEl = document.querySelector('.victory-subtitle');
  const btnNext = document.getElementById('btn-next-level');

  if (currentLevel < 5) {
    if (titleEl) titleEl.textContent = '¡MISIÓN CUMPLIDA!';
    if (currentLevel === 4) {
      if (subEl) subEl.textContent = '¡Has derribado al Helicóptero Gigante en llamas y asegurado la ruta hacia el Templo Ancestral!';
    } else {
      if (subEl) subEl.textContent = `¡Has aniquilado las defensas enemigas en el ${LEVEL_DATA[currentLevel].name}!`;
    }
    if (btnNext) {
      btnNext.classList.remove('hidden');
      btnNext.textContent = `AVANZAR AL NIVEL ${currentLevel + 1} ⏩`;
    }
  } else {
    // Victoria culminante del Nivel 5: Comandante Malvado derrotado
    if (titleEl) titleEl.textContent = '¡CAMPAÑA CONCLUIDA! ¡VICTORIA TOTAL!';
    if (subEl) subEl.textContent = '¡El Comandante Malvado ha sido derrotado! ¡Tus compañeros llegaron en 4 helicópteros para la extracción triunfal!';
    if (btnNext) btnNext.classList.add('hidden');
  }

  showScreen('screen-victory');
}

function setDifficulty(diff) {
  difficulty = diff;
  document.querySelectorAll('.btn-diff, .btn-diff-pause').forEach(btn => {
    if (btn.dataset.diff === diff) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  const descEl = document.getElementById('diff-description');
  if (descEl) {
    if (diff === 'easy') descEl.textContent = 'Enemigos menos agresivos, recibes medio daño y más cajas de suministros.';
    else if (diff === 'normal') descEl.textContent = 'Equilibrio clásico arcade: daño estándar y suministros tácticos.';
    else descEl.textContent = 'Modo veterano: enemigos letales con cadencia rápida y blindaje incrementado.';
  }

  const tag = document.getElementById('hud-difficulty-tag');
  if (tag) tag.textContent = DIFFICULTY_CONFIG[diff].label;
}

// ============================================================================
// CONTROLADORES DE EVENTOS DE ENTRADA
// ============================================================================
window.addEventListener('keydown', (e) => {
  audio.ensureContext();
  input.keys[e.code] = true;
  input.keys[e.key] = true;

  // Saltar cinemática con barra espaciadora
  if (e.code === 'Space' && currentState === GAME_STATE.CINEMATIC) {
    if (introCinematic) introCinematic.skip();
  }

  // Tecla de pausa ESC o P
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (currentState === GAME_STATE.PLAYING) pauseGame();
    else if (currentState === GAME_STATE.PAUSED) resumeGame();
  }
});

window.addEventListener('keyup', (e) => {
  input.keys[e.code] = false;
  input.keys[e.key] = false;
});

// Coordenadas del ratón adaptadas a la escala del canvas
function updateMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  input.mouseX = (e.clientX - rect.left) * scaleX;
  input.mouseY = (e.clientY - rect.top) * scaleY;

  // Actualizar retícula táctica animada
  const crosshair = document.getElementById('custom-crosshair');
  if (crosshair) {
    crosshair.style.left = `${e.clientX}px`;
    crosshair.style.top = `${e.clientY}px`;
  }
}

window.addEventListener('mousemove', updateMousePos);

window.addEventListener('mousedown', (e) => {
  audio.ensureContext();
  if (e.button === 0) { // Clic izquierdo: disparar arma / metralleta
    input.mouseDown = true;
  } else if (e.button === 2) { // Clic derecho: disparar cohete en helicóptero
    input.rightMouseDown = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    input.mouseDown = false;
  } else if (e.button === 2) {
    input.rightMouseDown = false;
  }
});

// Prevenir menú contextual del clic derecho para usarlo como control táctico
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// ============================================================================
// CONEXIÓN DE BOTONES DE INTERFAZ
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Botones de Menú Principal
  document.getElementById('btn-start-game').addEventListener('click', () => {
    audio.ensureContext();
    startGame();
  });

  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    showScreen('screen-instructions');
  });

  document.getElementById('btn-close-instructions').addEventListener('click', () => {
    showScreen('screen-menu');
  });

  // Selector de dificultad en menú
  document.querySelectorAll('.btn-diff').forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });

  // Selector de dificultad en pausa
  document.querySelectorAll('.btn-diff-pause').forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });

  // Controles del HUD
  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-mute').addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
  });

  // Botones de Pausa
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', () => {
    audio.stopVictoryMusic();
    showScreen(null);
    startGame(currentLevel); // reinicia el nivel actual, no el primero
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    currentState = GAME_STATE.MENU;
    audio.stopMusic();
    audio.stopVictoryMusic();
    const banner = document.getElementById('mission-accomplished-banner');
    if (banner) banner.classList.add('hidden');
    const hud = document.getElementById('hud-overlay');
    if (hud) hud.classList.add('hidden');
    showScreen('screen-menu');
  });

  // Slider de volumen
  const volSlider = document.getElementById('volume-slider');
  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      audio.setVolume(parseFloat(e.target.value));
    });
  }

  // Saltar cinemática
  document.getElementById('btn-skip-cinematic').addEventListener('click', () => {
    if (introCinematic) introCinematic.skip();
  });

  // Game Over
  document.getElementById('btn-retry').addEventListener('click', () => {
    audio.stopVictoryMusic();
    startGame(currentLevel);
  });
  document.getElementById('btn-gameover-menu').addEventListener('click', () => {
    currentState = GAME_STATE.MENU;
    audio.stopVictoryMusic();
    showScreen('screen-menu');
  });

  // Victoria
  document.getElementById('btn-play-again').addEventListener('click', () => {
    audio.stopVictoryMusic();
    startGame(currentLevel);
  });

  const btnNextLevel = document.getElementById('btn-next-level');
  if (btnNextLevel) {
    btnNextLevel.addEventListener('click', () => {
      audio.stopVictoryMusic();
      if (currentLevel < 5) {
        startGame(currentLevel + 1);
      } else {
        startGame(1);
      }
    });
  }

  document.getElementById('btn-victory-menu').addEventListener('click', () => {
    currentState = GAME_STATE.MENU;
    audio.stopVictoryMusic();
    const banner = document.getElementById('mission-accomplished-banner');
    if (banner) banner.classList.add('hidden');
    showScreen('screen-menu');
  });

  // Selector de niveles (Modal)
  const btnSelectLevel = document.getElementById('btn-select-level');
  if (btnSelectLevel) {
    btnSelectLevel.addEventListener('click', () => {
      audio.ensureContext();
      showScreen('screen-level-select');
    });
  }

  const btnCloseLevelSelect = document.getElementById('btn-close-level-select');
  if (btnCloseLevelSelect) {
    btnCloseLevelSelect.addEventListener('click', () => {
      showScreen('screen-menu');
    });
  }

  document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
      const lvl = parseInt(card.dataset.level) || 1;
      audio.ensureContext();
      startGame(lvl);
    });
  });

  // Iniciar bucle de juego
  requestAnimationFrame(gameLoop);
});
