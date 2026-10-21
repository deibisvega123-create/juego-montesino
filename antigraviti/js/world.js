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
    this.width = 4600;
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
    // Plataformas sólidas adaptadas al bioma
    this.platforms = [
      { x: 420, y: 520, w: 180, h: 22 },
      { x: 740, y: 460, w: 160, h: 22 },
      { x: 980, y: 390, w: 200, h: 22 },
      { x: 1250, y: 480, w: 180, h: 22 },
      { x: 1750, y: 450, w: 220, h: 22 },
      { x: 2100, y: 380, w: 190, h: 22 },
      { x: 2500, y: 470, w: 240, h: 22 },
      { x: 2900, y: 410, w: 180, h: 22 },
      { x: 3300, y: 490, w: 210, h: 22 },
      { x: 3550, y: 420, w: 220, h: 22 },
      // Plataformas adicionales elevadas en la zona de combate final
      { x: 3820, y: 360, w: 170, h: 22 },
      { x: 4050, y: 440, w: 190, h: 22 }
    ];

    // Torres o pilares según bioma
    this.watchtowers = [
      { x: 760, y: 460, w: 100, h: 180 },
      { x: 2120, y: 380, w: 110, h: 260 },
      { x: 3320, y: 490, w: 120, h: 150 }
    ];
  }

  initFeatures() {
    // Nubes animadas
    this.clouds = [
      { x: 100, y: 80, speed: 12, size: 70 },
      { x: 500, y: 130, speed: 8, size: 90 },
      { x: 1100, y: 90, speed: 15, size: 110 },
      { x: 1800, y: 120, speed: 10, size: 85 },
      { x: 2600, y: 70, speed: 14, size: 120 },
      { x: 3400, y: 110, speed: 9, size: 95 }
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
    const baseGround = 640;

    // Foso 1 en x = 590..710
    if (x > 590 && x < 710) {
      return baseGround + 60;
    }

    // Colina suave en x = 1100..1600 (estación del tanque)
    if (x >= 1100 && x <= 1600) {
      const rel = (x - 1100) / 500;
      return baseGround - Math.sin(rel * Math.PI) * 25;
    }

    // Foso 2 en x = 2350..2480
    if (x > 2350 && x < 2480) {
      return baseGround + 60;
    }

    // Zona pavimentada / terraza del jefe final en x = 3700..4500
    if (x >= 3700) {
      return baseGround - 10;
    }

    // Ondulaciones naturales del terreno
    return baseGround + Math.sin(x * 0.005) * 6;
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

    // 1. Estructuras de apoyo / Torres / Pilares
    for (const tw of this.watchtowers) {
      const rx = tw.x - camera.x;
      if (rx > -150 && rx < 1280 + 150) {
        if (this.biome === 'temple') {
          // Pilares de piedra ancestral tallada
          ctx.fillStyle = '#4c3f58';
          ctx.fillRect(rx + 10, tw.y, tw.w - 20, tw.h);
          ctx.strokeStyle = '#6d5a80';
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 10, tw.y, tw.w - 20, tw.h);
          // Glifos arcanos brillantes
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(rx + 25, tw.y + 40, tw.w - 50, 8);
          ctx.fillRect(rx + 25, tw.y + 80, tw.w - 50, 8);
        } else {
          // Pilares de madera o metal militar
          ctx.strokeStyle = cols.treeTrunk;
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

          ctx.fillStyle = cols.treeLeaf;
          ctx.beginPath();
          ctx.moveTo(rx, tw.y - 10);
          ctx.lineTo(rx + tw.w / 2, tw.y - 35);
          ctx.lineTo(rx + tw.w, tw.y - 10);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 2. Plataformas
    for (const p of this.platforms) {
      const rx = p.x - camera.x;
      if (rx > -p.w && rx < 1280 + p.w) {
        if (this.biome === 'temple') {
          // Laja de piedra rúnica
          ctx.fillStyle = '#3a2d48';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#7c3aed';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(rx, p.y - 3, p.w, 4);
        } else if (this.biome === 'volcanic') {
          // Roca de basalto oscuro con vetas ardientes
          ctx.fillStyle = '#211818';
          ctx.fillRect(rx, p.y, p.w, p.h);
          ctx.strokeStyle = '#ff3d00';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, p.y, p.w, p.h);
          ctx.fillStyle = '#ff6d00';
          ctx.fillRect(rx, p.y - 3, p.w, 4);
        } else {
          // Tablones de madera selváticos
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

    // Puentes sobre fosos
    const b1x = 590 - camera.x;
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

    // Zona pavimentada / explanada del jefe (a partir de x = 3700)
    const baseConcreteX = 3700 - camera.x;
    if (baseConcreteX < 1280) {
      const w = 4600 - 3700;
      ctx.fillStyle = cols.baseFloor;
      ctx.fillRect(baseConcreteX, 630, w, 90);

      // Franjas de balizamiento táctico o runas del templo
      ctx.fillStyle = cols.baseTrim;
      for (let rx = baseConcreteX; rx < baseConcreteX + w; rx += 50) {
        ctx.fillRect(rx, 630, 16, 6);
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
