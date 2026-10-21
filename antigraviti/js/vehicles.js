/**
 * GUERRA EN EL BOSQUE - SISTEMA DE VEHÍCULOS Y TANQUES
 * Tanque aliado maniobrable por el jugador y vehículos enemigos acorazados.
 */

class AlliedTank {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 110;
    this.height = 54;
    this.vx = 0;
    this.speed = 3.6; // velocidad equilibrada ni muy rápida ni muy lenta
    this.armor = 100;
    this.maxArmor = 100;
    this.active = true; // sigue existiendo en el mundo
    this.isOccupied = false;
    this.facing = 1;
    this.trackOffset = 0;
    this.turretAngle = 0;
    this.recoil = 0;
    this.fireTimer = 0;
    this.fireRate = 0.65;
    this.smokeTimer = 0;
  }

  update(dt, input, world, camera) {
    this.fireTimer -= dt;
    this.recoil = Math.max(0, this.recoil - dt * 25);

    if (this.isOccupied) {
      // Manejo por parte del jugador
      let moveDir = 0;
      if (input.keys['ArrowLeft'] || input.keys['KeyA'] || input.keys['a']) moveDir -= 1;
      if (input.keys['ArrowRight'] || input.keys['KeyD'] || input.keys['d']) moveDir += 1;

      this.vx = moveDir * this.speed;
      if (moveDir !== 0) {
        this.facing = moveDir;
        this.trackOffset += moveDir * 4 * dt * 60;
        // Humo del tubo de escape
        this.smokeTimer += dt;
        if (this.smokeTimer > 0.08) {
          this.smokeTimer = 0;
          particleSystem.createSmoke(this.x - this.facing * 45, this.y + 10, 2, -1);
        }
      }

      // Orientación de la torreta hacia el puntero del ratón en coordenadas del mundo
      const worldMouseX = input.mouseX + camera.x;
      const worldMouseY = input.mouseY + camera.y;
      this.turretAngle = Math.atan2(worldMouseY - (this.y - 12), worldMouseX - this.x);

      // Disparo del cañón con clic izquierdo
      if (input.mouseDown && this.fireTimer <= 0) {
        this.shoot();
      }
    } else {
      this.vx *= 0.85;
    }

    // Movimiento y física en el terreno
    this.x += this.vx * dt * 60;
    this.y = world.getGroundHeight(this.x) - this.height / 2;

    // Si la armadura está baja, generar humo y llamas
    if (this.armor < 40) {
      if (Math.random() < 0.3) {
        particleSystem.createSmoke(this.x + (Math.random() - 0.5) * 30, this.y - 10, 1, -2);
      }
      if (this.armor < 20 && Math.random() < 0.2) {
        particleSystem.createFire(this.x + (Math.random() - 0.5) * 20, this.y - 15, 1);
      }
    }

    return this.active;
  }

  shoot() {
    this.fireTimer = this.fireRate;
    this.recoil = 8;
    audio.playTankCannon();

    // Posición del cañón
    const barrelLength = 48;
    const spawnX = this.x + Math.cos(this.turretAngle) * barrelLength;
    const spawnY = (this.y - 12) + Math.sin(this.turretAngle) * barrelLength;

    const speed = WEAPON_TYPES.TANK_CANNON.speed;
    const vx = Math.cos(this.turretAngle) * speed;
    const vy = Math.sin(this.turretAngle) * speed;

    projectiles.push(new Projectile(spawnX, spawnY, vx, vy, WEAPON_TYPES.TANK_CANNON, 'player'));

    // Partículas de disparo pesado
    particleSystem.createExplosion(spawnX, spawnY, 20, 15);
    particleSystem.createSmoke(spawnX, spawnY, 4, -1);
  }

  takeDamage(amount) {
    this.armor -= amount;
    particleSystem.createSparks(this.x, this.y, 0, -1, 10, '#ffee55');
    if (this.armor <= 0) {
      this.explode();
    }
  }

  explode() {
    this.active = false;
    audio.playExplosion(1.8);
    particleSystem.createExplosion(this.x, this.y, 110, 60);
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // 1. Orugas del tanque
    ctx.fillStyle = '#1c221e';
    ctx.fillRect(rx - 50, ry + 12, 100, 16);
    ctx.strokeStyle = '#364038';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx - 50, ry + 12, 100, 16);

    // Ruedas interiores de las orugas
    const wheelCount = 5;
    for (let i = 0; i < wheelCount; i++) {
      const wx = rx - 38 + i * 19;
      ctx.fillStyle = '#2f3b33';
      ctx.beginPath();
      ctx.arc(wx, ry + 20, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#55665a';
      ctx.beginPath();
      ctx.arc(wx, ry + 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Marcas de rodamiento en las orugas
    ctx.strokeStyle = '#55665a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const tx = rx - 48 + ((i * 12 + this.trackOffset) % 96);
      ctx.beginPath();
      ctx.moveTo(tx, ry + 12);
      ctx.lineTo(tx, ry + 28);
      ctx.stroke();
    }

    // 2. Chasis blindado verde camuflaje militar
    ctx.fillStyle = '#394d38';
    ctx.beginPath();
    ctx.moveTo(rx - 52, ry + 12);
    ctx.lineTo(rx - 44, ry - 6);
    ctx.lineTo(rx + 44, ry - 6);
    ctx.lineTo(rx + 52, ry + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#223022';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Detalles y marcas de camuflaje en el chasis
    ctx.fillStyle = '#293828';
    ctx.fillRect(rx - 30, ry - 2, 25, 10);
    ctx.fillRect(rx + 10, ry, 20, 8);

    // Estrella aliada o insignia
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', rx - 10, ry + 7);

    // 3. Torreta giratoria y cañón
    const recoilX = -Math.cos(this.turretAngle) * this.recoil;
    const recoilY = -Math.sin(this.turretAngle) * this.recoil;

    ctx.save();
    ctx.translate(rx + recoilX, ry - 10 + recoilY);
    ctx.rotate(this.turretAngle);

    // Cañón largo de 120mm
    ctx.fillStyle = '#2b392b';
    ctx.fillRect(0, -5, 48, 10);
    ctx.strokeStyle = '#182418';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, -5, 48, 10);

    // Freno de boca
    ctx.fillStyle = '#1f281f';
    ctx.fillRect(44, -7, 7, 14);

    ctx.restore();

    // Cúpula de la torreta
    ctx.fillStyle = '#445c43';
    ctx.beginPath();
    ctx.arc(rx, ry - 10, 18, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#223022';
    ctx.stroke();

    // Escotilla del comandante
    ctx.fillStyle = '#1d271c';
    ctx.fillRect(rx - 8, ry - 22, 16, 4);

    // Si el jugador está dentro, dibujar su cabeza con boina/casco asomada
    if (this.isOccupied) {
      ctx.fillStyle = '#d49b6a'; // rostro
      ctx.beginPath();
      ctx.arc(rx, ry - 22, 5, 0, Math.PI * 2);
      ctx.fill();
      // Casco militar verde
      ctx.fillStyle = '#2c5e3b';
      ctx.beginPath();
      ctx.arc(rx, ry - 24, 6, Math.PI, 0);
      ctx.fill();
    }

    ctx.restore();
  }
}

class EnemyVehicle {
  constructor(x, y, type = 'jeep') {
    this.x = x;
    this.y = y;
    this.type = type; // 'jeep' o 'tank'
    this.width = type === 'tank' ? 120 : 80;
    this.height = type === 'tank' ? 58 : 42;
    this.speed = type === 'tank' ? 1.5 : 2.5;
    this.vx = -this.speed;
    this.facing = -1;
    this.hp = type === 'tank' ? 240 : 110;
    this.maxHp = this.hp;
    this.fireTimer = 1.8;
    this.fireRate = type === 'tank' ? 2.8 : 2.2;
    this.dead = false;
    this.turretAngle = Math.PI;
    this.recoil = 0;
  }

  update(dt, targetX, targetY, world) {
    if (this.dead) return false;

    this.fireTimer -= dt;
    this.recoil = Math.max(0, this.recoil - dt * 20);

    // Ángulo hacia el objetivo (jugador o tanque aliado)
    const dist = Math.hypot(targetX - this.x, targetY - this.y);
    if (dist < 700) {
      this.turretAngle = Math.atan2(targetY - (this.y - 10), targetX - this.x);
      this.facing = targetX < this.x ? -1 : 1;

      // Mantener distancia táctica de combate
      if (dist > 350) {
        this.vx = this.facing * this.speed;
      } else if (dist < 200) {
        this.vx = -this.facing * this.speed;
      } else {
        this.vx *= 0.9;
      }

      // Disparar
      if (this.fireTimer <= 0) {
        this.shoot();
      }
    } else {
      this.vx = 0;
    }

    this.x += this.vx * dt * 60;
    this.y = world.getGroundHeight(this.x) - this.height / 2;

    return true;
  }

  shoot() {
    this.fireTimer = this.fireRate;
    this.recoil = 6;

    if (this.type === 'tank') {
      audio.playExplosion(0.8);
      const barrelLength = 45;
      const sx = this.x + Math.cos(this.turretAngle) * barrelLength;
      const sy = (this.y - 10) + Math.sin(this.turretAngle) * barrelLength;
      const spd = 6.2; // Calibrado: misil visible y esquivable
      const rocket = new Projectile(sx, sy, Math.cos(this.turretAngle) * spd, Math.sin(this.turretAngle) * spd, WEAPON_TYPES.ROCKET, 'enemy', 35);
      rocket.isBomb = true; // Permite derribarlo disparándole
      projectiles.push(rocket);
      particleSystem.createSmoke(sx, sy, 3, -1);
    } else {
      // Jeep ametralladora con cadencia controlada
      audio.playShootRifle();
      const sx = this.x + this.facing * 20;
      const sy = this.y - 18;
      const spd = 6.0; // Calibrado
      projectiles.push(new Projectile(sx, sy, Math.cos(this.turretAngle) * spd, Math.sin(this.turretAngle) * spd, WEAPON_TYPES.RIFLE, 'enemy', 16));
      particleSystem.createMuzzleFlash(sx, sy, this.turretAngle);
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    particleSystem.createSparks(this.x, this.y, 0, -1, 8, '#ff9800');
    if (this.hp <= 0 && !this.dead) {
      this.explode();
    }
  }

  explode() {
    this.dead = true;
    audio.playExplosion(1.5);
    particleSystem.createExplosion(this.x, this.y, 85, 45);

    // Dropear múltiples monedas y caja militar
    for (let i = 0; i < (this.type === 'tank' ? 8 : 4); i++) {
      coins.push(new Coin(this.x + (Math.random() - 0.5) * 40, this.y - 10, 200));
    }
    if (Math.random() < 0.8) {
      crates.push(new WeaponCrate(this.x, this.y - 20));
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    if (this.type === 'tank') {
      // Tanque enemigo rojo/negro camuflado
      ctx.fillStyle = '#212121';
      ctx.fillRect(rx - 55, ry + 12, 110, 16);

      // Chasis
      ctx.fillStyle = '#5c2222';
      ctx.beginPath();
      ctx.moveTo(rx - 58, ry + 12);
      ctx.lineTo(rx - 48, ry - 6);
      ctx.lineTo(rx + 48, ry - 6);
      ctx.lineTo(rx + 58, ry + 12);
      ctx.closePath();
      ctx.fill();

      // Cañón
      ctx.save();
      ctx.translate(rx, ry - 10);
      ctx.rotate(this.turretAngle);
      ctx.fillStyle = '#331111';
      ctx.fillRect(0, -5, 45, 10);
      ctx.restore();

      // Cúpula
      ctx.fillStyle = '#782828';
      ctx.beginPath();
      ctx.arc(rx, ry - 10, 20, Math.PI, 0);
      ctx.fill();

      // Barra de vida enemiga
      ctx.fillStyle = '#ff1122';
      const hpWidth = (this.hp / this.maxHp) * 60;
      ctx.fillRect(rx - 30, ry - 35, hpWidth, 5);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(rx - 30, ry - 35, 60, 5);
    } else {
      // Jeep militar enemigo
      ctx.fillStyle = '#303833';
      ctx.fillRect(rx - 35, ry - 5, 70, 20);

      // Ruedas
      ctx.fillStyle = '#151515';
      ctx.beginPath();
      ctx.arc(rx - 22, ry + 16, 10, 0, Math.PI * 2);
      ctx.arc(rx + 22, ry + 16, 10, 0, Math.PI * 2);
      ctx.fill();

      // Ametralladora montada
      ctx.fillStyle = '#8b2500';
      ctx.fillRect(rx - 8, ry - 18, 16, 12);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 15);
      ctx.lineTo(rx + Math.cos(this.turretAngle) * 22, ry - 15 + Math.sin(this.turretAngle) * 22);
      ctx.stroke();

      // Barra de vida
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(rx - 25, ry - 28, (this.hp / this.maxHp) * 50, 4);
    }
    ctx.restore();
  }
}
