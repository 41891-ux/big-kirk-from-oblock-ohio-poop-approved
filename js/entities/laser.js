/**
 * entities/laser.js - Super Laser Convergente (Inspirado no especial Converge de Cuphead).
 * Fases: 0.35s de convergência -> 2.0s de feixe contínuo (~3x largura do canhão).
 * Dano a cada 6 frames, apaga tiros inimigos, atravessa abrigos e causa ~2 de dano por tick no chefe.
 * Namespace global: window.SI.Laser
 */

window.SI = window.SI || {};

window.SI.Laser = (function() {
  const CFG = SI.CONFIG.POWERUPS.LASER;

  class ConvergentLaser {
    constructor() {
      this.active = false;
      this.phase = 'idle'; // 'idle', 'converge', 'beam'
      this.timer = 0;
      this.tickTimer = 0;
      this.screenShake = 0;
      this.beamWidth = CFG.BEAM_WIDTH; // 39 px (~3x canhão)
      this.audioLoop = null;
    }

    reset() {
      this.stop();
    }

    trigger() {
      this.active = true;
      this.phase = 'converge';
      this.timer = CFG.CONVERGE_FRAMES; // 21 frames (0.35s)
      this.tickTimer = 0;
      this.screenShake = 0;
      SI.Audio.playLaserCharge();
    }

    stop() {
      this.active = false;
      this.phase = 'idle';
      this.timer = 0;
      this.tickTimer = 0;
      this.screenShake = 0;
      if (this.audioLoop && this.audioLoop.osc) {
        try {
          this.audioLoop.osc.stop();
          this.audioLoop.osc.disconnect();
        } catch (e) {}
        this.audioLoop = null;
      }
    }

    isFiring() {
      return this.active;
    }

    update(playerX, playerY, formation, ufo, shotsManager, boss, particleSystem) {
      if (!this.active) return;

      if (this.phase === 'converge') {
        this.timer--;
        if (this.timer <= 0) {
          // Passa para a fase de feixe contínuo
          this.phase = 'beam';
          this.timer = CFG.BEAM_FRAMES; // 120 frames (2.0s)
          this.audioLoop = SI.Audio.playLaserBeamLoop();
        }
      } else if (this.phase === 'beam') {
        this.timer--;
        this.screenShake = Math.sin(this.timer * 0.8) * 1.5;

        // Partículas na base do canhão
        if (particleSystem && Math.random() < 0.6) {
          particleSystem.emit(playerX + 6, playerY, 3, '#00ffff', 1.5, 8, 1);
        }

        // Aplicação de dano a cada 6 frames (ref.)
        this.tickTimer++;
        if (this.tickTimer >= CFG.TICK_DAMAGE_INTERVAL) {
          this.tickTimer = 0;
          this.applyDamage(playerX, formation, ufo, shotsManager, boss, particleSystem);
        }

        if (this.timer <= 0) {
          this.stop();
        }
      }
    }

    applyDamage(playerX, formation, ufo, shotsManager, boss, particleSystem) {
      const laserBox = {
        x: playerX + 6 - this.beamWidth / 2,
        y: 0,
        width: this.beamWidth,
        height: SI.CONFIG.PLAYER.CANNON_Y
      };

      // 1. Apaga projéteis inimigos na área do feixe
      if (shotsManager) {
        for (let i = shotsManager.enemyShots.length - 1; i >= 0; i--) {
          const eShot = shotsManager.enemyShots[i];
          if (SI.Util.checkAABB(laserBox, eShot)) {
            if (particleSystem) {
              particleSystem.emit(eShot.x, eShot.y, 4, '#00ffff', 1.0, 8, 1);
            }
            shotsManager.enemyShots.splice(i, 1);
            shotsManager.enemyShotPool.release(eShot);
          }
        }
      }

      // 2. Destrói invasores instantaneamente na área do feixe
      if (formation) {
        for (let i = formation.livingInvaders.length - 1; i >= 0; i--) {
          const inv = formation.livingInvaders[i];
          if (SI.Util.checkAABB(laserBox, inv)) {
            formation.killInvader(inv);
            if (particleSystem) {
              particleSystem.emit(inv.x + inv.width / 2, inv.y + inv.height / 2, 8, '#00ffff', 2.0, 15, 1);
            }
          }
        }
      }

      // 3. Destrói UFO instantaneamente
      if (ufo && ufo.active) {
        if (SI.Util.checkAABB(laserBox, ufo)) {
          ufo.hit(23); // Concede pontuação
          if (particleSystem) {
            particleSystem.emit(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, 12, '#ff0055', 2.5, 20, 1);
          }
        }
      }

      // 4. Causa ~2 de dano por tick ao chefe (ref.)
      if (boss && boss.active && boss.hp > 0 && !boss.isInvulnerable) {
        if (SI.Util.checkAABB(laserBox, boss)) {
          boss.takeDamage(CFG.TICK_DAMAGE_BOSS, particleSystem);
        }
      }
    }

    render(ctx, playerX, playerY) {
      if (!this.active) return;

      const cannonCenterX = playerX + 6.5;
      const topY = 0;

      ctx.save();

      if (this.phase === 'converge') {
        // 0.35s de convergência: 3 feixes finos em leque convergem para o centro (ref.)
        const progress = 1 - (this.timer / CFG.CONVERGE_FRAMES); // 0 a 1
        const spread = (1 - progress) * 24;

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;

        // Feixe Central
        ctx.beginPath();
        ctx.moveTo(cannonCenterX, playerY);
        ctx.lineTo(cannonCenterX, topY);
        ctx.stroke();

        // Feixe Esquerdo convergindo
        ctx.beginPath();
        ctx.moveTo(cannonCenterX, playerY);
        ctx.lineTo(cannonCenterX - spread, topY);
        ctx.stroke();

        // Feixe Direito convergindo
        ctx.beginPath();
        ctx.moveTo(cannonCenterX, playerY);
        ctx.lineTo(cannonCenterX + spread, topY);
        ctx.stroke();
      } else if (this.phase === 'beam') {
        // Feixe largo contínuo procedural com gradiente e núcleo brilhante
        const x = cannonCenterX - this.beamWidth / 2;
        const w = this.beamWidth;
        const h = playerY;

        // Efeito de oscilação e gradiente horizontal
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.2)');
        grad.addColorStop(0.3, 'rgba(0, 255, 255, 0.8)');
        grad.addColorStop(0.5, '#ffffff'); // Núcleo branco incandescente
        grad.addColorStop(0.7, 'rgba(0, 255, 255, 0.8)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0.2)');

        ctx.fillStyle = grad;
        ctx.fillRect(Math.round(x), topY, w, h);

        // Brilho pulsante nos limites
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(x + 2), topY, w - 4, h);
      }

      ctx.restore();
    }
  }

  return ConvergentLaser;
})();
