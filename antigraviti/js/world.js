/* ===== world.js ===== */
      this.platforms = [
        { x: 600, y: 260, w: 220, h: 18, type: 'air_radar' },
        { x: 1350, y: 340, w: 260, h: 18, type: 'air_radar' },
        { x: 2150, y: 240, w: 240, h: 18, type: 'air_radar' },
        { x: 2950, y: 320, w: 280, h: 18, type: 'air_radar' },
        { x: 3750, y: 270, w: 240, h: 18, type: 'air_radar' },
        { x: 4500, y: 350, w: 260, h: 18, type: 'air_radar' },
        { x: 5250, y: 250, w: 240, h: 18, type: 'air_radar' },
        { x: 6050, y: 330, w: 280, h: 18, type: 'air_radar' },
        { x: 6850, y: 260, w: 240, h: 18, type: 'air_radar' },
        { x: 7650, y: 340, w: 260, h: 18, type: 'air_radar' },
        { x: 8400, y: 250, w: 240, h: 18, type: 'air_radar' },
        { x: 9500, y: 300, w: 400, h: 20, type: 'air_carrier' }
      ];

      this.watchtowers = [
        { x: 1400, y: 340, w: 60, h: 360, type: 'antenna_tower' },
        { x: 3000, y: 320, w: 70, h: 380, type: 'antenna_tower' },
        { x: 4560, y: 350, w: 60, h: 340, type: 'antenna_tower' },
        { x: 6100, y: 330, w: 70, h: 360, type: 'antenna_tower' },
        { x: 7700, y: 340, w: 60, h: 350, type: 'antenna_tower' }
      ];
/**
 * GUERRA EN EL BOSQUE - SISTEMA DE MUNDO Y ESCENARIOS SELVÁTICOS (5 BIOMAS)
 * Biomas:
 * 1. 'emerald'  - Selva Esmeralda (Tropical clásica diurna con vegetación exuberante)
 * 2. 'swamp'    - Pantano Tóxico (Esporas flotantes, aguas cenagosas y vegetación musgosa)
 * 3. 'volcanic' - Selva Volcánica (Cenizas incandescentes, roca de basalto y fallas de magma)
 * 4. 'storm'    - Tormenta Nocturna (Lluvia torrencial continua, relámpagos que iluminan la selva)
 * 5. 'temple'   - Templo Ancestral (Ruinas megalíticas, pilares de piedra con runas y pebeteros místicos)
 */

class JungleWorld {
  constructor(biome = 'emerald') {
    this.biome = biome;
    // El nivel 4 (combate aéreo) es mucho más largo que el resto
    this.width = biome === 'storm' ? 10400 : (biome === 'temple' ? 8200 : 4600);
    this.height = 720;
    this.tileSize = 32;

    // Efectos climáticos y atmosféricos
    this.weatherTimer = 0;
    this.lightningAlpha = 0;
    this.lightningCooldown = 2.5 + Math.random() * 3.0;
    this.weatherParticles = [];

    this.initWeather();
    this.initPlatforms();
    this.initFeatures();
  }

  initWeather() {
    this.weatherParticles = [];
    if (this.biome === 'storm') {
      // 140 gotas de lluvia rápida en ángulo
      for (let i = 0; i < 140; i++) {
        this.weatherParticles.push({
          x: Math.random() * 1280,
          y: Math.random() * 720,
          speed: 850 + Math.random() * 350,
          length: 18 + Math.random() * 14
        });
      }
    } else if (this.biome === 'volcanic') {
      // Brasas, cenizas y chispas de lava flotando en el viento
      for (let i = 0; i < 65; i++) {
        this.weatherParticles.push({
          x: Math.random() * 1280,
          y: Math.random() * 720,
          vx: -35 - Math.random() * 55,
          vy: -25 - Math.random() * 45,
          size: 2 + Math.random() * 3.5,
          color: Math.random() > 0.4 ? '#ff5722' : '#ffeb3b',
          alpha: 0.5 + Math.random() * 0.5
        });
      }
    } else if (this.biome === 'swamp') {
      // Esporas bioluminiscentes flotantes de pantano
      for (let i = 0; i < 55; i++) {
        this.weatherParticles.push({
          x: Math.random() * 1280,
          y: 200 + Math.random() * 500,
          vx: (Math.random() - 0.5) * 20,
          vy: -15 - Math.random() * 20,
          size: 3 + Math.random() * 4,
          alpha: 0.3 + Math.random() * 0.5,
          color: '#69f0ae'
        });
      }
    } else if (this.biome === 'temple') {
      // Polvo arcano dorado y luciérnagas míticas
      for (let i = 0; i < 40; i++) {
        this.weatherParticles.push({
          x: Math.random() * 1280,
          y: 100 + Math.random() * 600,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          size: 2.5 + Math.random() * 3,
          color: Math.random() > 0.5 ? '#e0aaff' : '#fde047',
          alpha: 0.4 + Math.random() * 0.6
        });
      }
    }
  }

  initPlatforms() {
    this.platforms = [];
    this.watchtowers = [];

    if (this.biome === 'emerald') {
      // NIVEL 1: SELVA ESMERALDA - Pasarelas de madera en árboles y torres de vigía rústicas
      this.platforms = [
        { x: 380, y: 530, w: 180, h: 20, type: 'wood' },
        { x: 680, y: 460, w: 170, h: 20, type: 'wood' },
        { x: 950, y: 390, w: 220, h: 20, type: 'wood' },
        { x: 1280, y: 480, w: 190, h: 20, type: 'wood' },
        { x: 1720, y: 440, w: 230, h: 20, type: 'wood' },
        { x: 2050, y: 370, w: 180, h: 20, type: 'wood' },
        { x: 2480, y: 470, w: 240, h: 20, type: 'wood' },
        { x: 2880, y: 400, w: 200, h: 20, type: 'wood' },
        { x: 3250, y: 480, w: 210, h: 20, type: 'wood' },
        { x: 3580, y: 410, w: 220, h: 20, type: 'wood' }
      ];

      this.watchtowers = [
        { x: 720, y: 460, w: 90, h: 180, type: 'wood_tower' },
        { x: 2080, y: 370, w: 100, h: 270, type: 'wood_tower' },
        { x: 3280, y: 480, w: 110, h: 160, type: 'wood_tower' }
      ];
    } else if (this.biome === 'swamp') {
      // NIVEL 2: PANTANO TÓXICO - Tuberías industriales de refinería, pontones flotantes y pasarelas de rejilla
      this.platforms = [
        { x: 320, y: 520, w: 220, h: 24, type: 'pipe' },
        { x: 620, y: 450, w: 250, h: 20, type: 'metal_grate' },
        { x: 920, y: 380, w: 190, h: 24, type: 'pipe' },
        { x: 1180, y: 470, w: 240, h: 20, type: 'pontoon' },
        { x: 1540, y: 420, w: 280, h: 24, type: 'pipe' },
        { x: 1950, y: 360, w: 200, h: 20, type: 'metal_grate' },
        { x: 2300, y: 460, w: 260, h: 20, type: 'pontoon' },
        { x: 2750, y: 390, w: 230, h: 24, type: 'pipe' },
        { x: 3150, y: 470, w: 250, h: 20, type: 'metal_grate' },
        { x: 3520, y: 400, w: 220, h: 24, type: 'pipe' }
      ];

      this.watchtowers = [
        { x: 650, y: 450, w: 90, h: 200, type: 'refinery_stack' },
        { x: 1980, y: 360, w: 100, h: 280, type: 'refinery_stack' },
        { x: 3180, y: 470, w: 110, h: 180, type: 'refinery_stack' }
      ];
    } else if (this.biome === 'volcanic') {
      // NIVEL 3: SELVA VOLCÁNICA - Columnas de basalto escalonadas, costras de magma y andamios térmicos
      this.platforms = [
        { x: 340, y: 540, w: 170, h: 26, type: 'basalt' },
        { x: 580, y: 470, w: 210, h: 26, type: 'basalt' },
        { x: 860, y: 400, w: 240, h: 20, type: 'steel_heat' },
        { x: 1220, y: 460, w: 200, h: 26, type: 'basalt' },
        { x: 1560, y: 380, w: 220, h: 20, type: 'steel_heat' },
        { x: 1920, y: 450, w: 240, h: 26, type: 'basalt' },
        { x: 2280, y: 370, w: 200, h: 20, type: 'steel_heat' },
        { x: 2650, y: 440, w: 230, h: 26, type: 'basalt' },
        { x: 3050, y: 380, w: 250, h: 20, type: 'steel_heat' },
        { x: 3480, y: 430, w: 210, h: 26, type: 'basalt' }
      ];

      this.watchtowers = [
        { x: 890, y: 400, w: 85, h: 240, type: 'geothermal_vent' },
        { x: 1950, y: 450, w: 95, h: 210, type: 'geothermal_vent' },
        { x: 3080, y: 380, w: 105, h: 260, type: 'geothermal_vent' }
      ];
    } else if (this.biome === 'storm') {
      // NIVEL 4: COMBATE AÉREO EN HELICÓPTERO - Espacio aéreo abierto, plataformas de radar y boyas flotantes
      this.platforms = [
        { x: 600, y: 260, w: 220, h: 18, type: 'air_radar' },
        { x: 1350, y: 340, w: 260, h: 18, type: 'air_radar' },
        { x: 2150, y: 240, w: 240, h: 18, type: 'air_radar' },
        { x: 2950, y: 320, w: 280, h: 18, type: 'air_radar' },
        { x: 3650, y: 280, w: 300, h: 20, type: 'air_carrier' }
      ];

      this.watchtowers = [
        { x: 1400, y: 340, w: 60, h: 360, type: 'antenna_tower' },
        { x: 3000, y: 320, w: 70, h: 380, type: 'antenna_tower' }
      ];
    } else if (this.biome === 'temple') {
      // NIVEL 5: TEMPLO ANCESTRAL - Terrazas megalíticas escalonadas, losas rúnicas gigantes y pebeteros místicos
      this.platforms = [
        { x: 360, y: 510, w: 200, h: 28, type: 'rune_slab' },
        { x: 680, y: 430, w: 220, h: 28, type: 'rune_slab' },
        { x: 990, y: 350, w: 260, h: 30, type: 'temple_altar' },
        { x: 1380, y: 440, w: 210, h: 28, type: 'rune_slab' },
        { x: 1750, y: 360, w: 250, h: 30, type: 'temple_altar' },
        { x: 2120, y: 460, w: 220, h: 28, type: 'rune_slab' },
        { x: 2500, y: 380, w: 270, h: 30, type: 'temple_altar' },
        { x: 2920, y: 450, w: 230, h: 28, type: 'rune_slab' },
        { x: 3320, y: 370, w: 240, h: 30, type: 'rune_slab' },
        // Sección extendida del templo
        { x: 3700, y: 450, w: 220, h: 28, type: 'rune_slab' },
        { x: 4050, y: 380, w: 250, h: 30, type: 'temple_altar' },
        { x: 4450, y: 460, w: 220, h: 28, type: 'rune_slab' },
        { x: 4850, y: 390, w: 260, h: 30, type: 'temple_altar' },
        { x: 5250, y: 470, w: 220, h: 28, type: 'rune_slab' },
        { x: 5650, y: 380, w: 270, h: 30, type: 'temple_altar' },
        { x: 6050, y: 460, w: 230, h: 28, type: 'rune_slab' },
        { x: 6450, y: 390, w: 250, h: 30, type: 'temple_altar' },
        { x: 6850, y: 470, w: 220, h: 28, type: 'rune_slab' },
        // Plataformas de acrobacia en la arena del jefe final
        { x: 7250, y: 460, w: 210, h: 26, type: 'rune_slab' },
        { x: 7550, y: 370, w: 240, h: 28, type: 'temple_altar' },
        { x: 7850, y: 450, w: 210, h: 26, type: 'rune_slab' }
      ];

      this.watchtowers = [
        { x: 1020, y: 350, w: 110, h: 290, type: 'monolith_column' },
        { x: 2540, y: 380, w: 120, h: 260, type: 'monolith_column' },
        { x: 4080, y: 380, w: 120, h: 260, type: 'monolith_column' },
        { x: 5680, y: 380, w: 120, h: 260, type: 'monolith_column' },
        { x: 7600, y: 370, w: 130, h: 270, type: 'monolith_column' }
      ];
    }
  }

  initFeatures() {
    // Nubes animadas
    this.clouds = [
      { x: 100, y: 80, speed: 12, size: 70 },
      { x: 500, y: 130, speed: 8, size: 90 },
      { x: 1100, y: 90, speed: 15, size: 110 },
      { x: 1800, y: 120, speed: 10, size: 85 },
      { x: 2600, y: 70, speed: 14, size: 120 },
      { x: 3400, y: 110, speed: 9, size: 95 },
      { x: 4300, y: 90, speed: 11, size: 100 },
      { x: 5200, y: 125, speed: 13, size: 105 },
      { x: 6100, y: 75, speed: 9, size: 115 },
      { x: 7000, y: 115, speed: 12, size: 90 },
      { x: 7900, y: 85, speed: 10, size: 110 },
      { x: 8800, y: 120, speed: 14, size: 100 },
      { x: 9700, y: 80, speed: 8, size: 120 }
    ];

    // Árboles gigantes de fondo
    this.trees = [];
    for (let x = 80; x < this.width; x += 180 + Math.random() * 120) {
      this.trees.push({
        x: x,
        height: 280 + Math.random() * 140,
        radius: 65 + Math.random() * 45,
        type: Math.floor(Math.random() * 3)
      });
    }
  }

  update(dt) {
    // 1. Desplazamiento lento de nubes
    for (let c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > this.width + 200) {
        c.x = -200;
      }
    }

    // 2. Efecto de relámpagos en la tormenta nocturna
    if (this.biome === 'storm') {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0) {
        this.lightningAlpha = 0.85;
        this.lightningCooldown = 3.5 + Math.random() * 4.5;
        if (typeof audio !== 'undefined' && audio.playThunder) {
          audio.playThunder();
        }
      }
      if (this.lightningAlpha > 0) {
        this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 3.2);
      }

      // Caída de lluvia rápida en ángulo
      for (let p of this.weatherParticles) {
        p.y += p.speed * dt;
        p.x -= p.speed * 0.28 * dt;
        if (p.y > 720) {
          p.y = -20;
          p.x = Math.random() * 1280 + 200;
        }
      }
    }

    // 3. Partículas volcánicas (ceniza y ascuas flotantes)
    else if (this.biome === 'volcanic') {
      for (let p of this.weatherParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -10 || p.x < -10) {
          p.y = 730;
          p.x = Math.random() * 1280 + 100;
        }
      }
    }

    // 4. Esporas del pantano tóxico
    else if (this.biome === 'swamp') {
      for (let p of this.weatherParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 200 || p.x < 0 || p.x > 1280) {
          p.y = 680;
          p.x = Math.random() * 1280;
        }
      }
    }

    // 5. Partículas arcanas del templo ancestral
    else if (this.biome === 'temple') {
      for (let p of this.weatherParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 50 || p.y > 700 || p.x < 0 || p.x > 1280) {
          p.y = 300 + Math.random() * 350;
          p.x = Math.random() * 1280;
        }
      }
    }
  }

  // Altura del suelo dinámico según bioma
  getGroundHeight(x) {
    if (this.biome === 'emerald') {
      const baseGround = 640;
      // Foso de río en x = 600..720
      if (x > 600 && x < 720) return baseGround + 60;
      // Colina suave en x = 1100..1600 (estación del tanque)
      if (x >= 1100 && x <= 1600) {
        const rel = (x - 1100) / 500;
        return baseGround - Math.sin(rel * Math.PI) * 28;
      }
      // Quebrada en x = 2350..2480
      if (x > 2350 && x < 2480) return baseGround + 60;
      // Búnker en x >= 3700
      if (x >= 3700) return baseGround - 10;
      return baseGround + Math.sin(x * 0.005) * 6;
    } else if (this.biome === 'swamp') {
      const baseGround = 645;
      // Pozas de ciénaga ácida profunda
      if ((x > 750 && x < 1000) || (x > 2150 && x < 2420)) {
        return baseGround + 65;
      }
      // Dique elevado de refinería industrial
      if (x >= 1350 && x <= 1800) {
        const rel = (x - 1350) / 450;
        return baseGround - Math.sin(rel * Math.PI) * 35;
      }
      if (x >= 3700) return baseGround - 12;
      return baseGround + Math.sin(x * 0.008) * 8;
    } else if (this.biome === 'volcanic') {
      const baseGround = 640;
      // Sismas de lava fundida hirviente
      if ((x > 540 && x < 780) || (x > 1550 && x < 1850) || (x > 2600 && x < 2900)) {
        return baseGround + 70;
      }
      // Colina de basalto y roca volcánica
      if (x >= 950 && x <= 1450) {
        const rel = (x - 950) / 500;
        return baseGround - Math.sin(rel * Math.PI) * 40;
      }
      if (x >= 3700) return baseGround - 15;
      return baseGround + Math.sin(x * 0.006) * 10;
    } else if (this.biome === 'storm') {
      // Nivel 4: Combate aéreo en helicóptero, suelo bajo para espacio de vuelo
      return 685;
    } else if (this.biome === 'temple') {
      // Terrazas megalíticas escalonadas del templo ancestral
      if (x < 1150) return 640;
      if (x < 2150) return 605; // Primer nivel ceremonial
      if (x < 3150) return 575; // Segundo nivel del templo
      if (x < 4700) return 545; // Salas profundas
      if (x < 5700) return 575; // Descenso a la cripta
      return 545; // Santuario interior y arena del combate final
    }
    return 640;
  }

  // Comprobar colisión sólida para proyectiles y caídas
  isSolid(x, y) {
    const groundY = this.getGroundHeight(x);
    if (y >= groundY) return true;

    for (const p of this.platforms) {
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        return true;
      }
    }
    return false;
  }

  // Comprobar si un punto está encima de una plataforma al caer (one-way platforms)
  getPlatformAt(x, y, vy) {
    if (vy < 0) return null;
    for (const p of this.platforms) {
      if (x >= p.x - 10 && x <= p.x + p.w + 10) {
        if (y >= p.y - 6 && y <= p.y + p.h + 8) {
          return p;
        }
      }
    }
    return null;
  }

  // Paleta de colores atmosférica según el bioma
  getBiomeColors() {
    switch (this.biome) {
      case 'swamp':
        return {
          skyTop: '#08140c',
          skyMid: '#162817',
          skyBottom: '#28381b',
          cloudFill: 'rgba(50, 75, 45, 0.3)',
          mountains: '#0c1a10',
          canopy: '#142918',
          treeTrunk: '#202419',
          treeLeaf: '#2d4224',
          groundDirt: '#1a2215',
          groundTop: '#4e7037',
          bridge: '#3a3d28',
          baseFloor: '#283226',
          baseTrim: '#76ff03'
        };
      case 'volcanic':
        return {
          skyTop: '#170404',
          skyMid: '#3d0c07',
          skyBottom: '#661b0c',
          cloudFill: 'rgba(90, 30, 20, 0.35)',
          mountains: '#240808',
          canopy: '#38120c',
          treeTrunk: '#181212',
          treeLeaf: '#421a15',
          groundDirt: '#1a1111',
          groundTop: '#bf360c',
          bridge: '#3d2522',
          baseFloor: '#261b1b',
          baseTrim: '#ff5722'
        };
      case 'storm':
        return {
          skyTop: '#03060c',
          skyMid: '#0a1424',
          skyBottom: '#14253d',
          cloudFill: 'rgba(25, 45, 75, 0.4)',
          mountains: '#07101c',
          canopy: '#0e1c2e',
          treeTrunk: '#121822',
          treeLeaf: '#182b3d',
          groundDirt: '#101720',
          groundTop: '#2e4960',
          bridge: '#283442',
          baseFloor: '#1b2633',
          baseTrim: '#00e5ff'
        };
      case 'temple':
        return {
          skyTop: '#0e0517',
          skyMid: '#240c36',
          skyBottom: '#42185c',
          cloudFill: 'rgba(65, 30, 85, 0.3)',
          mountains: '#170824',
          canopy: '#2c123d',
          treeTrunk: '#22162b',
          treeLeaf: '#45215c',
          groundDirt: '#1c1224',
          groundTop: '#9333ea',
          bridge: '#4a3b5c',
          baseFloor: '#2d1e3d',
          baseTrim: '#e879f9'
        };
      case 'emerald':
      default:
        return {
          skyTop: '#0c1b12',
          skyMid: '#1b3826',
          skyBottom: '#2d5a3d',
          cloudFill: 'rgba(70, 95, 80, 0.25)',
          mountains: '#102418',
          canopy: '#173623',
          treeTrunk: '#1d2a1f',
          treeLeaf: '#224a2f',
          groundDirt: '#2b2118',
          groundTop: '#3e804f',
          bridge: '#5c4530',
          baseFloor: '#3a423e',
          baseTrim: '#ffd600'
        };
    }
  }

  // Renderizado del fondo con efecto de paralaje multicapa
  drawBackground(ctx, camera) {
    const cols = this.getBiomeColors();

    // 1. Cielo atmosférico con degradado del bioma
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 720);
    skyGrad.addColorStop(0, cols.skyTop);
    skyGrad.addColorStop(0.45, cols.skyMid);
    skyGrad.addColorStop(0.85, cols.skyBottom);
    skyGrad.addColorStop(1, cols.skyMid);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Destello de relámpago en la tormenta nocturna
    if (this.biome === 'storm' && this.lightningAlpha > 0) {
      ctx.fillStyle = `rgba(215, 235, 255, ${this.lightningAlpha * 0.75})`;
      ctx.fillRect(0, 0, 1280, 720);
    }

    // 2. Nubes distantes de tormenta/humo
    ctx.save();
    for (let c of this.clouds) {
      const cx = (c.x - camera.x * 0.15) % (this.width + 400);
      ctx.fillStyle = cols.cloudFill;
      ctx.beginPath();
      ctx.arc(cx, c.y, c.size, 0, Math.PI * 2);
      ctx.arc(cx + c.size * 0.7, c.y - 10, c.size * 0.8, 0, Math.PI * 2);
      ctx.arc(cx - c.size * 0.7, c.y + 5, c.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Cordillera montañosa lejana (Paralaje 0.1)
    ctx.save();
    ctx.fillStyle = cols.mountains;
    ctx.beginPath();
    ctx.moveTo(0, 720);
    for (let x = 0; x <= 1280; x += 40) {
      const worldX = x + camera.x * 0.1;
      const my = 380 + Math.sin(worldX * 0.003) * 60 + Math.sin(worldX * 0.008) * 30;
      ctx.lineTo(x, my);
    }
    ctx.lineTo(1280, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Copas de selva profunda (Paralaje 0.3)
    ctx.save();
    ctx.fillStyle = cols.canopy;
    ctx.beginPath();
    ctx.moveTo(0, 720);
    for (let x = 0; x <= 1280; x += 30) {
      const worldX = x + camera.x * 0.3;
      const cy = 460 + Math.sin(worldX * 0.006) * 35;
      ctx.lineTo(x, cy);
    }
    ctx.lineTo(1280, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Árboles gigantes de fondo (Paralaje 0.6)
    ctx.save();
    for (const tree of this.trees) {
      const tx = tree.x - camera.x * 0.6;
      if (tx > -150 && tx < 1280 + 150) {
        ctx.fillStyle = cols.treeTrunk;
        ctx.fillRect(tx - 14, 640 - tree.height, 28, tree.height);

        ctx.fillStyle = cols.treeLeaf;
        ctx.beginPath();
        ctx.arc(tx, 640 - tree.height, tree.radius, 0, Math.PI * 2);
        ctx.fill();

        // Lianas o raíces colgantes
        ctx.strokeStyle = cols.treeTrunk;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - 25, 640 - tree.height + 20);
        ctx.quadraticCurveTo(tx - 35, 520, tx - 15, 590);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Renderizado del terreno interactivo, suelo, plataformas y clima
  drawForeground(ctx, camera) {
    const cols = this.getBiomeColors();
    ctx.save();

    // 1. Estructuras de apoyo / Torres / Pilares según tipo
    for (const tw of this.watchtowers) {
      const rx = tw.x - camera.x;
      if (rx > -150 && rx < 1280 + 150) {
        if (tw.type === 'monolith_column') {
          // Pilares y obeliscos de piedra ancestral tallada
          ctx.fillStyle = '#3f324c';
          ctx.fillRect(rx + 10, tw.y, tw.w - 20, tw.h);
          ctx.strokeStyle = '#6d5a80';
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 10, tw.y, tw.w - 20, tw.h);
          // Glifos arcanos brillantes
          ctx.fillStyle = '#d8b4fe';
          ctx.fillRect(rx + 25, tw.y + 40, tw.w - 50, 6);
          ctx.fillRect(rx + 25, tw.y + 90, tw.w - 50, 6);
          ctx.fillRect(rx + 25, tw.y + 140, tw.w - 50, 6);
          // Pequeño pebetero místico en la cima
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(rx + tw.w / 2, tw.y - 8, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (tw.type === 'refinery_stack') {
          // Torres de destilación y chimeneas de la refinería química
          ctx.fillStyle = '#263238';
          ctx.fillRect(rx + 15, tw.y, tw.w - 30, tw.h);
          ctx.strokeStyle = '#ffd600';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx + 15, tw.y, tw.w - 30, tw.h);
          // Rayas de advertencia industrial amarillo/negro
          ctx.fillStyle = '#ffd600';
          for (let sy = tw.y + 20; sy < tw.y + tw.h; sy += 35) {
            ctx.fillRect(rx + 15, sy, tw.w - 30, 8);
          }
          // Luz de baliza roja intermitente en la cima
          ctx.fillStyle = '#ff1744';
          ctx.beginPath();
          ctx.arc(rx + tw.w / 2, tw.y - 6, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (tw.type === 'geothermal_vent') {
          // Chimenea geotérmica volcánica
          ctx.fillStyle = '#211818';
          ctx.fillRect(rx + 15, tw.y, tw.w - 30, tw.h);
          ctx.strokeStyle = '#ff5722';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(rx + 15, tw.y, tw.w - 30, tw.h);
          // Vetas de calor incandescente
          ctx.fillStyle = '#ff3d00';
          ctx.fillRect(rx + 22, tw.y + 30, tw.w - 44, 4);
          ctx.fillRect(rx + 22, tw.y + 80, tw.w - 44, 4);
        } else if (tw.type === 'antenna_tower') {
          // Torre de antena de radar
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(rx + tw.w / 2, tw.y);
          ctx.lineTo(rx + 10, tw.y + tw.h);
          ctx.moveTo(rx + tw.w / 2, tw.y);
          ctx.lineTo(rx + tw.w - 10, tw.y + tw.h);
          ctx.stroke();
          // Luz de radar
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(rx + tw.w / 2, tw.y, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Torre de vigía rústica de madera en la selva
          ctx.strokeStyle = '#3e2723';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(rx + 15, tw.y + tw.h);
          ctx.lineTo(rx + 25, tw.y);
          ctx.moveTo(rx + tw.w - 15, tw.y + tw.h);
          ctx.lineTo(rx + tw.w - 25, tw.y);
          ctx.moveTo(rx + 20, tw.y + 40);
          ctx.lineTo(rx + tw.w - 20, tw.y + 120);
          ctx.moveTo(rx + tw.w - 20, tw.y + 40);
          ctx.lineTo(rx + 20, tw.y + 120);
          ctx.stroke();

          // Techo de hojas de camuflaje
          ctx.fillStyle = cols.treeLeaf;
          ctx.beginPath();
          ctx.moveTo(rx, tw.y - 8);
          ctx.lineTo(rx + tw.w / 2, tw.y - 32);
          ctx.lineTo(rx + tw.w, tw.y - 8);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 2. Plataformas únicas por bioma
    for (const p of this.platforms) {
      const rx = p.x - camera.x;
      if (rx > -p.w && rx < 1280 + p.w) {
        if (p.type === 'rune_slab' || p.type === 'temple_altar') {
          // Laja de piedra rúnica del templo ancestral
          ctx.fillStyle = p.type === 'temple_altar' ? '#4a3359' : '#33233f';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          // Glifos grabados en oro y violeta
          ctx.fillStyle = p.type === 'temple_altar' ? '#ffd700' : '#c084fc';
          ctx.fillRect(rx + 10, p.y + 6, p.w - 20, 3);
          ctx.fillRect(rx, p.y - 3, p.w, 4);
        } else if (p.type === 'pipe') {
          // Tubería química gigante con válvulas y remaches
          ctx.fillStyle = '#263238';
          ctx.beginPath();
          ctx.roundRect(rx, p.y, p.w, p.h, 10);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Franja tóxica amarilla/verde
          ctx.fillStyle = '#a3e635';
          ctx.fillRect(rx + 15, p.y + 4, p.w - 30, 4);
        } else if (p.type === 'metal_grate' || p.type === 'pontoon') {
          // Rejilla metálica de refinería o pontón flotante
          ctx.fillStyle = p.type === 'pontoon' ? '#3e3529' : '#1e293b';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          // Superficie antideslizante
          ctx.fillStyle = '#65a30d';
          ctx.fillRect(rx, p.y - 2, p.w, 3);
        } else if (p.type === 'basalt') {
          // Roca basáltica oscura con grietas de magma
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          // Veta ardiente
          ctx.fillStyle = '#f97316';
          ctx.fillRect(rx, p.y - 3, p.w, 4);
        } else if (p.type === 'steel_heat') {
          // Acero termorresistente de fundición
          ctx.fillStyle = '#292524';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          ctx.fillStyle = '#ffedd5';
          ctx.fillRect(rx + 8, p.y + p.h / 2 - 2, p.w - 16, 4);
        } else if (p.type === 'air_radar' || p.type === 'air_carrier') {
          // Boyas y plataformas aeronavales en el cielo
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          // Baliza azul
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(rx, p.y - 3, p.w, 4);
        } else {
          // Tablones de madera selváticos clásicos
          ctx.fillStyle = cols.bridge;
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#221a14';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          ctx.fillStyle = cols.groundTop;
          ctx.fillRect(rx, p.y - 3, p.w, 4);
        }
      }
    }

    // 3. Terreno interactivo (Suelo)
    const step = 20;
    const startX = Math.floor(camera.x / step) * step - step;
    const endX = startX + 1280 + step * 2;

    ctx.fillStyle = cols.groundDirt;
    ctx.beginPath();
    ctx.moveTo(startX - camera.x, 720);

    for (let x = startX; x <= endX; x += step) {
      const gy = this.getGroundHeight(x);
      ctx.lineTo(x - camera.x, gy);
    }

    ctx.lineTo(endX - camera.x, 720);
    ctx.closePath();
    ctx.fill();

    // Borde superior de superficie del terreno
    ctx.strokeStyle = cols.groundTop;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const gy = this.getGroundHeight(x);
      if (x === startX) ctx.moveTo(x - camera.x, gy - 2);
      else ctx.lineTo(x - camera.x, gy - 2);
    }
    ctx.stroke();

    // Zonas de peligro especiales según el bioma:
    // Pantano Tóxico: Ácido verde burbujeante en las simas
    if (this.biome === 'swamp') {
      const p1x = 750 - camera.x;
      if (p1x > -260 && p1x < 1280) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
        ctx.fillRect(p1x, 690, 250, 30);
      }
      const p2x = 2150 - camera.x;
      if (p2x > -280 && p2x < 1280) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
        ctx.fillRect(p2x, 690, 270, 30);
      }
    }

    // Selva Volcánica: Magma ardiente resplandeciente en las fallas
    if (this.biome === 'volcanic') {
      const v1x = 540 - camera.x;
      if (v1x > -250 && v1x < 1280) {
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(v1x, 695, 240, 25);
      }
      const v2x = 1550 - camera.x;
      if (v2x > -310 && v2x < 1280) {
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(v2x, 695, 300, 25);
      }
      const v3x = 2600 - camera.x;
      if (v3x > -310 && v3x < 1280) {
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(v3x, 695, 300, 25);
      }
    }

    // Puentes sobre fosos para Nivel 1 (Selva Esmeralda)
    if (this.biome === 'emerald') {
      const b1x = 600 - camera.x;
      if (b1x > -150 && b1x < 1280) {
        ctx.fillStyle = cols.bridge;
        ctx.fillRect(b1x, 638, 120, 10);
        ctx.strokeStyle = '#1a140e';
        ctx.strokeRect(b1x, 638, 120, 10);
      }

      const b2x = 2350 - camera.x;
      if (b2x > -150 && b2x < 1280) {
        ctx.fillStyle = cols.bridge;
        ctx.fillRect(b2x, 638, 130, 10);
        ctx.strokeStyle = '#1a140e';
        ctx.strokeRect(b2x, 638, 130, 10);
      }
    }

    // Zona de combate / explanada del jefe (a partir de x = 3700)
    const arenaStartX = this.biome === 'storm' ? this.width - 900 : (this.biome === 'temple' ? 7300 : 3700);
    const baseConcreteX = arenaStartX - camera.x;
    if (baseConcreteX < 1280) {
      const w = this.width - arenaStartX;
      ctx.fillStyle = cols.baseFloor;
      ctx.fillRect(baseConcreteX, 620, w, 100);

      // Franjas de balizamiento táctico o runas del templo
      ctx.fillStyle = cols.baseTrim;
      for (let rx = baseConcreteX; rx < baseConcreteX + w; rx += 50) {
        ctx.fillRect(rx, 620, 16, 6);
      }
    }

    // 4. Renderizado de efectos climáticos encima del mundo
    if (this.biome === 'storm') {
      // Rayas de lluvia torrencial
      ctx.strokeStyle = 'rgba(160, 210, 255, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let p of this.weatherParticles) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.length * 0.35, p.y + p.length);
      }
      ctx.stroke();
    } else if (this.biome === 'volcanic') {
      // Brasas y chispas flotantes
      for (let p of this.weatherParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
    } else if (this.biome === 'swamp') {
      // Esporas bioluminiscentes verdes
      for (let p of this.weatherParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    } else if (this.biome === 'temple') {
      // Polvo arcano flotante
      for (let p of this.weatherParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }
}
