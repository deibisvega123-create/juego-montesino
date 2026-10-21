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
    subtitle: 'OPERACIÓN NIEBLA NEGRA',
    biome: 'swamp',
    bossName: 'REFINERÍA QUÍMICA: GENERADOR TÓXICO',
    bossType: 'toxic'
  },
  3: {
    number: 3,
    name: 'SELVA VOLCÁNICA',
    subtitle: 'QUEBRADA DE CENIZAS',
    biome: 'volcanic',
    bossName: 'FORTALEZA GEOTÉRMICA: CAÑÓN DE MAGMA',
    bossType: 'volcanic'
  },
  4: {
    number: 4,
    name: 'TORMENTA NOCTURNA',
    subtitle: 'SIGILO BAJO EL AGUACERO',
    biome: 'storm',
    bossName: 'COMPLEJO DE RADAR Y GUÍA DE MISILES',
    bossType: 'radar'
  },
  5: {
    number: 5,
    name: 'TEMPLO ANCESTRAL',
    subtitle: 'DUELO CONTRA EL SUPER SOLDADO',
    biome: 'temple',
    bossName: 'CORONEL VULCAN: EL SUPER SOLDADO SUPREMO',
    bossType: 'supersoldier'
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
  mouseDown: false
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

    // Vidas y salud
    this.lives = 3; // Requerimiento 4: exactamente tres vidas
    this.hp = 100; // Salud / Blindaje táctico por vida
    this.maxHp = 100;
    this.invulnerableTimer = 0;
    this.dead = false;

    // Arsenal
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

    // Salto con W, Arriba o Espacio
    const jumpPressed = input.keys['ArrowUp'] || input.keys['KeyW'] || input.keys['w'] || input.keys['Space'] || input.keys[' '];
    if (jumpPressed && this.isGrounded && !this.isCrouching) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      audio.playJump();
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
    } else {
      // Plataformas
      const plat = world.getPlatformAt(this.x, this.y + this.height / 2, this.vy);
      if (plat && !this.isCrouching) {
        this.y = plat.y - this.height / 2;
        this.vy = 0;
        this.isGrounded = true;
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
    particleSystem.createBloodSpurt(this.x, this.y);
    camera.shake = 3.5; // vibración suave sin desorientar

    if (this.hp <= 0) {
      this.lives -= 1;
      if (this.lives > 0) {
        // Pierde una vida pero regenera la salud para la siguiente vida
        this.hp = this.maxHp;
        this.invulnerableTimer = 2.4; // inmunidad generosa al perder vida
        particleSystem.createExplosion(this.x, this.y, 40, 20);
        audio.playPowerup();
      } else {
        this.hp = 0;
        this.die();
      }
    }

    updateHudHp(this.hp, this.maxHp);
    updateHudLives(this.lives);
  }

  heal(amount = 50) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (this.hp === this.maxHp && this.lives < 3) {
      this.lives = Math.min(3, this.lives + 1);
    }
    updateHudHp(this.hp, this.maxHp);
    updateHudLives(this.lives);
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

  draw(ctx, cam) {
    if (this.dead || this.inVehicle) return;

    const rx = this.x - cam.x;
    const ry = this.y - cam.y;

    ctx.save();

    // Efecto de parpadeo durante invulnerabilidad
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 12) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    ctx.translate(rx, ry);

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

  // 1. Tanque Aliado en la selva (ubicado tácticamente para apoyar al jugador)
  const tankX = currentLevel === 5 ? 2600 : 1250;
  const alliedTank = new AlliedTank(tankX, world.getGroundHeight(tankX));
  alliedTank.armor = cfg.tankMaxArmor;
  alliedTank.maxArmor = cfg.tankMaxArmor;
  vehicles.push(alliedTank);

  // 2. Trampas y obstáculos dinámicos
  traps.push(new Landmine(520, world.getGroundHeight(520)));
  traps.push(new Spikes(600, world.getGroundHeight(600) - 18, 100));
  traps.push(new ExplosiveBarrel(850, world.getGroundHeight(850)));
  traps.push(new Landmine(1020, world.getGroundHeight(1020)));
  traps.push(new ExplosiveBarrel(1650, world.getGroundHeight(1650)));
  traps.push(new Spikes(2360, world.getGroundHeight(2360) - 18, 110));
  traps.push(new Landmine(2650, world.getGroundHeight(2650)));
  traps.push(new Landmine(2950, world.getGroundHeight(2950)));
  traps.push(new ExplosiveBarrel(3200, world.getGroundHeight(3200)));
  traps.push(new Landmine(3500, world.getGroundHeight(3500)));

  // 3. Cajas especiales de armas y botiquines
  crates.push(new WeaponCrate(450, 500, 'SPREAD', false));
  crates.push(new WeaponCrate(920, 360, 'MACHINEGUN', true));
  crates.push(new WeaponCrate(1780, 420, 'LASER', false));
  crates.push(new WeaponCrate(2700, 340, 'ROCKET', true));
  crates.push(new WeaponCrate(3400, 460, 'FLAMETHROWER', false));

  medkits.push(new Medkit(1150, 580));
  medkits.push(new Medkit(2550, 440));
  if (currentLevel === 5) {
    medkits.push(new Medkit(3350, 450));
  }

  // 4. Enemigos progresivos del sector
  enemies.push(new EnemySoldier(400, world.getGroundHeight(400)));
  enemies.push(new EnemySoldier(550, world.getGroundHeight(550)));
  enemies.push(new EnemySniper(780, 440));

  enemies.push(new EnemySoldier(1050, world.getGroundHeight(1050)));
  enemies.push(new CombatDrone(1350, 320));
  enemies.push(new EnemySoldier(1500, world.getGroundHeight(1500), true));

  const enemyJeep = new EnemyVehicle(2000, world.getGroundHeight(2000), 'jeep');
  vehicles.push(enemyJeep);
  enemies.push(new EnemySniper(2140, 360));
  enemies.push(new CombatDrone(2250, 300));
  enemies.push(new EnemySoldier(2600, world.getGroundHeight(2600), true));

  const enemyTank = new EnemyVehicle(3050, world.getGroundHeight(3050), 'tank');
  vehicles.push(enemyTank);
  enemies.push(new CombatDrone(3200, 310));
  enemies.push(new EnemySoldier(3350, world.getGroundHeight(3350), true));
  enemies.push(new EnemySniper(3360, 470));

  // 5. Instanciar el Jefe correspondiente del Nivel
  if (currentLevel === 1) {
    bossFortress = new EnemyBaseFortress(3900, 400);
  } else if (currentLevel === 2) {
    bossFortress = new ToxicRefineryBoss(3900, 400);
  } else if (currentLevel === 3) {
    bossFortress = new MagmaFortressBoss(3880, 390);
  } else if (currentLevel === 4) {
    bossFortress = new RadarComplexBoss(3900, 400);
  } else if (currentLevel === 5) {
    // JEFE FINAL: CORONEL VULCAN (EL SUPER SOLDADO)
    bossFortress = new SuperSoldierBoss(3850, 540);
  }

  // 6. Actualizar HUD inicial
  updateHudLives(player.lives);
  updateHudHp(player.hp, player.maxHp);
  updateHudWeapon(player.weapon, player.ammo);
  updateHudScore(player.score, player.coins);
  document.getElementById('hud-difficulty-tag').textContent = cfg.label;

  const levelTag = document.getElementById('hud-level-badge');
  if (levelTag) levelTag.textContent = `NIVEL ${currentLevel}/5: ${lvlConfig.name}`;

  const missionTag = document.getElementById('hud-mission-tag');
  if (missionTag) missionTag.textContent = `MISIÓN: ${lvlConfig.subtitle}`;

  const bossTitle = document.getElementById('boss-title');
  if (bossTitle) bossTitle.textContent = `⚠️ ${lvlConfig.bossName} ⚠️`;

  const bossBarContainer = document.getElementById('boss-hp-container');
  if (bossBarContainer) bossBarContainer.classList.add('hidden');
}

// ============================================================================
// FUNCIONES DE ACTUALIZACIÓN DEL HUD
// ============================================================================
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

function updateHudLives(lives) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`life-${i}`);
    if (el) {
      if (i <= lives) el.classList.remove('lost');
      else el.classList.add('lost');
    }
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
  if (bossFortress && currentX > 3300) {
    if (bossBarContainer) bossBarContainer.classList.remove('hidden');
    if (bossFill) {
      const bossHpPct = Math.max(0, (bossFortress.hp / bossFortress.maxHp) * 100);
      bossFill.style.width = `${bossHpPct}%`;
    }
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

  requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  world.update(dt);
  particleSystem.update(dt);

  // Actualizar jugador
  player.update(dt, world, camera);

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
    e.update(dt, player, world, camera);
    if (e.dead) {
      player.kills++;
      enemies.splice(i, 1);
    }
  }

  // Actualizar Jefe Fortaleza de la Base
  if (bossFortress && !bossFortress.destroyed) {
    bossFortress.update(dt, player);
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
        if (p.x >= bossFortress.x && p.x <= bossFortress.x + bossFortress.width &&
            p.y >= bossFortress.y && p.y <= bossFortress.y + bossFortress.height) {
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
        if (Math.hypot(player.x - p.x, player.y - p.y) < (player.width / 2 + p.radius + 4)) {
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
    currentState = GAME_STATE.CINEMATIC;
    introCinematic = new IntroCinematic(() => {
      currentState = GAME_STATE.PLAYING;
      const hud = document.getElementById('hud-overlay');
      if (hud) hud.classList.remove('hidden');
      audio.startMusic();
    });
    introCinematic.start();
  } else {
    // Iniciar combate directamente al avanzar de nivel
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
// MANEJADOR DE EVENTO: DESTRUCCIÓN DE LA BASE ENEMIGA (MISIÓN CUMPLIDA)
// ============================================================================
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
          const fx = bossFortress.x + Math.random() * bossFortress.width;
          const fy = bossFortress.y + Math.random() * (bossFortress.height * 0.7);
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
  document.getElementById('victory-difficulty').textContent = DIFFICULTY_CONFIG[difficulty].label;

  const titleEl = document.querySelector('.victory-title');
  const subEl = document.querySelector('.victory-subtitle');
  const btnNext = document.getElementById('btn-next-level');

  if (currentLevel < 5) {
    if (titleEl) titleEl.textContent = '¡MISIÓN CUMPLIDA!';
    if (subEl) subEl.textContent = `¡Has aniquilado las defensas enemigas en el ${LEVEL_DATA[currentLevel].name}!`;
    if (btnNext) {
      btnNext.classList.remove('hidden');
      btnNext.textContent = `AVANZAR AL NIVEL ${currentLevel + 1} ⏩`;
    }
  } else {
    // Victoria culminante del Nivel 5: Super Soldado derrotado
    if (titleEl) titleEl.textContent = '¡CAMPAÑA CONCLUIDA! ¡VICTORIA TOTAL!';
    if (subEl) subEl.textContent = '¡El Coronel Vulcan ha sido derrotado! ¡Has liberado las 5 selvas y salvado al mundo!';
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
  if (e.button === 0) { // Clic izquierdo
    input.mouseDown = true;
    audio.ensureContext();
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    input.mouseDown = false;
  }
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
    startGame();
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
