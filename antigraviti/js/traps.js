/**
 * GUERRA EN EL BOSQUE - SISTEMA DE TRAMPAS DEL ENTORNO
 * Minas terrestres con detección de proximidad, picos de bambú en el suelo
 * y barriles de combustible explosivos.
 */

class Landmine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 12;
    this.radius = 16;
    this.triggered = false;
    this.timer = 0.55; // retardo justo para permitir saltar tras pisar
    this.beepTimer = 0;
    this.exploded = false;
    this.blinkTimer = 0;
    this.blinkState = false;
    this.hp = 10; // se puede detonar disparándole
  }

  update(dt, player, tank, enemies) {
    if (this.exploded) return false;

    // Parpadeo de advertencia en modo reposo
    this.blinkTimer += dt;
    if (this.blinkTimer > 0.6) {
      this.blinkTimer = 0;
      this.blinkState = !this.blinkState;
    }

    // Detección de proximidad si no está activada
    if (!this.triggered) {
      // Chequear jugador a pie
      if (player && !player.dead && !player.inVehicle) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < 42) {
          this.trigger();
        }
      }
      // Chequear si el tanque la pisa
      if (tank && tank.active) {
        const dist = Math.hypot(tank.x - this.x, tank.y - this.y);
        if (dist < 60) {
          this.explode(player, tank, enemies);
          return false;
        }
      }
    } else {
      // Cuenta regresiva de detonación
      this.timer -= dt;
      this.beepTimer += dt;
      if (this.beepTimer > 0.12) {
        this.beepTimer = 0;
        audio.playMineBeep();
        this.blinkState = !this.blinkState;
      }

      if (this.timer <= 0) {
        this.explode(player, tank, enemies);
        return false;
      }
    }

    return true;
  }

  trigger() {
    if (this.triggered) return;
    this.triggered = true;
    audio.playMineBeep();
  }

  takeDamage(amount, player, tank, enemies) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.exploded) {
      this.explode(player, tank, enemies);
    }
  }

  explode(player, tank, enemies) {
    if (this.exploded) return;
    this.exploded = true;
    audio.playExplosion(1.2);
    particleSystem.createExplosion(this.x, this.y - 6, 75, 45);

    // Daño equilibrado al jugador si está en el radio
    if (player && !player.dead && !player.inVehicle) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < 80) {
        player.takeDamage(45, 'mina');
      }
    }

    // Daño al tanque
    if (tank && tank.active) {
      const dist = Math.hypot(tank.x - this.x, tank.y - this.y);
      if (dist < 90) {
        tank.takeDamage(35);
      }
    }

    // Daño a enemigos cercanos
    if (enemies) {
      enemies.forEach(e => {
        if (!e.dead) {
          const dist = Math.hypot(e.x - this.x, e.y - this.y);
          if (dist < 85) {
            e.takeDamage(120);
          }
        }
      });
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Cuerpo metálico de la mina
    ctx.fillStyle = '#2d3328';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b2019';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tapa central
    ctx.fillStyle = '#4f5945';
    ctx.beginPath();
    ctx.arc(rx, ry - 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // LED de alerta rojo
    ctx.fillStyle = this.blinkState ? '#ff1122' : '#550000';
    ctx.shadowColor = this.blinkState ? '#ff1122' : 'transparent';
    ctx.shadowBlur = this.blinkState ? 10 : 0;
    ctx.beginPath();
    ctx.arc(rx, ry - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Spikes {
  constructor(x, y, width = 64) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 18;
    this.damageCooldown = 0;
  }

  update(dt, player, tank, enemies) {
    if (this.damageCooldown > 0) {
      this.damageCooldown -= dt;
    }

    // Colisión con jugador
    if (player && !player.dead && !player.inVehicle && this.damageCooldown <= 0) {
      if (
        player.x + 12 > this.x &&
        player.x - 12 < this.x + this.width &&
        player.y + 20 >= this.y - 12 &&
        player.y <= this.y + this.height
      ) {
        player.takeDamage(28, 'picos');
        player.vy = -7.5; // Rebote impulsado hacia arriba para permitir salir del foso
        this.damageCooldown = 1.0;
        particleSystem.createBloodSpurt(player.x, this.y - 6);
      }
    }

    // Colisión con enemigos que caigan en la trampa
    if (enemies) {
      enemies.forEach(e => {
        if (!e.dead && e.x > this.x && e.x < this.x + this.width && Math.abs(e.y - this.y) < 20) {
          e.takeDamage(60);
          particleSystem.createBloodSpurt(e.x, this.y - 6);
        }
      });
    }

    return true;
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Base de foso de tierra
    ctx.fillStyle = '#1c1611';
    ctx.fillRect(rx, ry, this.width, this.height);

    // Picos afilados de bambú / acero
    const spikeCount = Math.floor(this.width / 12);
    const spikeW = this.width / spikeCount;

    for (let i = 0; i < spikeCount; i++) {
      const sx = rx + i * spikeW;
      ctx.fillStyle = '#a8894d'; // Bambú afilado
      ctx.beginPath();
      ctx.moveTo(sx, ry + this.height);
      ctx.lineTo(sx + spikeW / 2, ry - 10);
      ctx.lineTo(sx + spikeW, ry + this.height);
      ctx.closePath();
      ctx.fill();

      // Punta ensangrentada / afilada
      ctx.fillStyle = '#6b1818';
      ctx.beginPath();
      ctx.moveTo(sx + spikeW * 0.3, ry - 4);
      ctx.lineTo(sx + spikeW / 2, ry - 10);
      ctx.lineTo(sx + spikeW * 0.7, ry - 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

class ExplosiveBarrel {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 36;
    this.hp = 15;
    this.dead = false;
  }

  update(dt) {
    return !this.dead;
  }

  takeDamage(amount, player, tank, enemies) {
    if (this.dead) return;
    this.hp -= amount;
    particleSystem.createSparks(this.x, this.y, 0, -1, 4, '#ff9800');
    if (this.hp <= 0) {
      this.explode(player, tank, enemies);
    }
  }

  explode(player, tank, enemies) {
    if (this.dead) return;
    this.dead = true;
    audio.playExplosion(1.4);
    particleSystem.createExplosion(this.x, this.y - 12, 90, 50);

    // Daño masivo a todo a su alrededor
    if (player && !player.dead && !player.inVehicle) {
      if (Math.hypot(player.x - this.x, player.y - this.y) < 100) {
        player.takeDamage(40, 'barril');
      }
    }

    if (tank && tank.active) {
      if (Math.hypot(tank.x - this.x, tank.y - this.y) < 110) {
        tank.takeDamage(40);
      }
    }

    if (enemies) {
      enemies.forEach(e => {
        if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 115) {
          e.takeDamage(150);
        }
      });
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y;

    ctx.save();
    // Barril de metal rojo militar
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(rx - 12, ry - 32, 24, 32);

    // Aros metálicos
    ctx.fillStyle = '#424242';
    ctx.fillRect(rx - 13, ry - 28, 26, 3);
    ctx.fillRect(rx - 13, ry - 14, 26, 3);
    ctx.fillRect(rx - 13, ry - 3, 26, 3);

    // Símbolo de inflamable
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥', rx, ry - 17);

    ctx.restore();
  }
}
