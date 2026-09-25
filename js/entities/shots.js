/**
 * entities/shots.js - Projéteis do jogador e dos inimigos.
 * Implementa pooling de objetos, trajetórias, animações de 4 quadros e anulação mútua de tiros.
 * Namespace global: window.SI.Shots
 */

window.SI = window.SI || {};

window.SI.Shots = (function() {
  const P_CFG = SI.CONFIG.PLAYER_SHOT;
  const E_CFG = SI.CONFIG.ENEMY_SHOTS;

  class ShotsManager {
    constructor() {
      this.playerShots = [];
      this.enemyShots = [];

      // Pool para tiros do jogador
      this.playerShotPool = new SI.Util.ObjectPool(
        () => ({
          x: 0, y: 0, vx: 0, vy: -P_CFG.SPEED, width: P_CFG.WIDTH, height: P_CFG.HEIGHT,
          isPierce: false, isTripleChild: false, hitIds: new Set(), active: false
        }),
        (s) => {
          s.active = false;
          s.hitIds.clear();
        },
        12
      );

      // Pool para tiros inimigos
      this.enemyShotPool = new SI.Util.ObjectPool(
        () => ({
          x: 0, y: 0, vy: E_CFG.SPEED, width: E_CFG.WIDTH, height: E_CFG.HEIGHT,
          type: 'rolling', animFrame: 0, animTimer: 0, active: false
        }),
        (s) => { s.active = false; },
        12
      );

      // Temporizador de recarga dos inimigos
      this.enemyReloadTimer = 0;
      this.plungerColumnIndex = 0;
      this.squigglyColumnIndex = 0;

      // Tabelas cíclicas de colunas para os tiros plunger e squiggly (arcade ref.)
      this.PLUNGER_COLS = [0, 6, 1, 7, 2, 8, 3, 9, 4, 10, 5];
      this.SQUIGGLY_COLS = [10, 4, 9, 3, 8, 2, 7, 1, 6, 0, 5];
    }

    reset() {
      for (const s of this.playerShots) this.playerShotPool.release(s);
      for (const s of this.enemyShots) this.enemyShotPool.release(s);
      this.playerShots.length = 0;
      this.enemyShots.length = 0;
      this.enemyReloadTimer = 0;
    }

    // --- Disparo do Jogador ---
    spawnPlayerShot(playerX, playerY, isPierce = false, isTriple = false) {
      if (isTriple) {
        // Disparo triplo: central + 2 a +/- 12 graus (ref.)
        const angleRad = SI.Util.degToRad(SI.CONFIG.POWERUPS.TRIPLE_ANGLE_DEG);
        const spd = P_CFG.SPEED;

        // Tiro Central
        const s1 = this.playerShotPool.obtain();
        s1.x = playerX + 6;
        s1.y = playerY - 4;
        s1.vx = 0;
        s1.vy = -spd;
        s1.width = P_CFG.WIDTH;
        s1.height = P_CFG.HEIGHT;
        s1.isPierce = isPierce;
        s1.isTripleChild = true;
        s1.hitIds.clear();
        s1.active = true;
        this.playerShots.push(s1);

        // Tiro Esquerdo (-12 graus)
        const s2 = this.playerShotPool.obtain();
        s2.x = playerX + 3;
        s2.y = playerY - 4;
        s2.vx = -Math.sin(angleRad) * spd;
        s2.vy = -Math.cos(angleRad) * spd;
        s2.width = P_CFG.WIDTH;
        s2.height = P_CFG.HEIGHT;
        s2.isPierce = isPierce;
        s2.isTripleChild = true;
        s2.hitIds.clear();
        s2.active = true;
        this.playerShots.push(s2);

        // Tiro Direito (+12 graus)
        const s3 = this.playerShotPool.obtain();
        s3.x = playerX + 9;
        s3.y = playerY - 4;
        s3.vx = Math.sin(angleRad) * spd;
        s3.vy = -Math.cos(angleRad) * spd;
        s3.width = P_CFG.WIDTH;
        s3.height = P_CFG.HEIGHT;
        s3.isPierce = isPierce;
        s3.isTripleChild = true;
        s3.hitIds.clear();
        s3.active = true;
        this.playerShots.push(s3);
      } else {
        // Tiro Simples Comum
        const s = this.playerShotPool.obtain();
        s.x = playerX + 6;
        s.y = playerY - 4;
        s.vx = 0;
        s.vy = -P_CFG.SPEED;
        s.width = P_CFG.WIDTH;
        s.height = P_CFG.HEIGHT;
        s.isPierce = isPierce;
        s.isTripleChild = false;
        s.hitIds.clear();
        s.active = true;
        this.playerShots.push(s);
      }

      SI.Audio.playPlayerShot();
    }

    // Retorna a contagem lógica de disparos para respeitar o limite (disparo triplo conta como 1)
    getEffectivePlayerShotCount() {
      let count = 0;
      let hasTriple = false;
      for (const s of this.playerShots) {
        if (s.isTripleChild) {
          hasTriple = true;
        } else {
          count++;
        }
      }
      return count + (hasTriple ? 1 : 0);
    }

    // --- Disparos Inimigos ---
    updateEnemyFiring(score, formation, playerX) {
      if (this.enemyReloadTimer > 0) {
        this.enemyReloadTimer--;
        return;
      }

      // No máximo 3 tiros simultâneos (1 por tipo: rolling, plunger, squiggly) (ref.)
      if (this.enemyShots.length >= E_CFG.MAX_CONCURRENT) return;

      const activeTypes = new Set(this.enemyShots.map(s => s.type));

      // 1. Rolling Shot: mira na coluna do jogador
      if (!activeTypes.has('rolling')) {
        const invader = formation.findLowestInvaderNearX(playerX);
        if (invader) {
          this.spawnEnemyShot('rolling', invader.x + invader.width / 2, invader.y + invader.height);
          this.resetEnemyReload(score);
          return;
        }
      }

      // 2. Plunger Shot: coluna por sequência pseudoaleatória/cíclica
      if (!activeTypes.has('plunger')) {
        const col = this.PLUNGER_COLS[this.plungerColumnIndex % this.PLUNGER_COLS.length];
        this.plungerColumnIndex++;
        const invader = formation.findLowestInvaderInCol(col);
        if (invader) {
          this.spawnEnemyShot('plunger', invader.x + invader.width / 2, invader.y + invader.height);
          this.resetEnemyReload(score);
          return;
        }
      }

      // 3. Squiggly Shot: coluna por sequência cíclica
      if (!activeTypes.has('squiggly')) {
        const col = this.SQUIGGLY_COLS[this.squigglyColumnIndex % this.SQUIGGLY_COLS.length];
        this.squigglyColumnIndex++;
        const invader = formation.findLowestInvaderInCol(col);
        if (invader) {
          this.spawnEnemyShot('squiggly', invader.x + invader.width / 2, invader.y + invader.height);
          this.resetEnemyReload(score);
          return;
        }
      }
    }

    resetEnemyReload(score) {
      // Cadência aumenta conforme as faixas de pontuação (ref.)
      let interval = 48;
      for (const tier of E_CFG.RELOAD_TIERS) {
        if (score < tier.scoreMax) {
          interval = tier.interval;
          break;
        }
      }
      this.enemyReloadTimer = interval;
    }

    spawnEnemyShot(type, x, y, vy = E_CFG.SPEED) {
      const s = this.enemyShotPool.obtain();
      s.x = x - 1;
      s.y = y;
      s.vy = vy;
      s.width = E_CFG.WIDTH;
      s.height = E_CFG.HEIGHT;
      s.type = type;
      s.animFrame = 0;
      s.animTimer = 0;
      s.active = true;
      this.enemyShots.push(s);
    }

    update(particleSystem) {
      // 1. Atualiza tiros do jogador
      for (let i = this.playerShots.length - 1; i >= 0; i--) {
        const s = this.playerShots[i];
        s.x += s.vx;
        s.y += s.vy;

        // Chegada ao topo da tela (explosãozinha no teto)
        if (s.y <= P_CFG.BURST_Y_TOP) {
          if (particleSystem) {
            particleSystem.emit(s.x, s.y, 4, '#ffffff', 1.0, 10, 1);
          }
          this.playerShots.splice(i, 1);
          this.playerShotPool.release(s);
        }
      }

      // 2. Atualiza tiros inimigos
      for (let i = this.enemyShots.length - 1; i >= 0; i--) {
        const s = this.enemyShots[i];
        s.y += s.vy;

        // Animação de 4 quadros (ref.)
        s.animTimer++;
        if (s.animTimer >= 6) {
          s.animTimer = 0;
          s.animFrame = (s.animFrame + 1) % E_CFG.ANIM_FRAMES;
        }

        // Fundo da tela
        if (s.y >= SI.CONFIG.PLAYER.GROUND_Y) {
          this.enemyShots.splice(i, 1);
          this.enemyShotPool.release(s);
        }
      }

      // 3. Colisão e anulação mútua entre tiros do jogador e tiros inimigos (arcade ref.)
      for (let i = this.playerShots.length - 1; i >= 0; i--) {
        const pShot = this.playerShots[i];
        for (let j = this.enemyShots.length - 1; j >= 0; j--) {
          const eShot = this.enemyShots[j];
          if (SI.Util.checkAABB(pShot, eShot)) {
            if (particleSystem) {
              particleSystem.emit(pShot.x, pShot.y, 6, '#ffffff', 1.2, 12, 1);
            }
            // Anula o tiro inimigo
            this.enemyShots.splice(j, 1);
            this.enemyShotPool.release(eShot);

            // Se o tiro do jogador NÃO for perfurante, é anulado também
            if (!pShot.isPierce) {
              this.playerShots.splice(i, 1);
              this.playerShotPool.release(pShot);
              break;
            }
          }
        }
      }
    }

    render(ctx) {
      // Desenha tiros do jogador
      for (let i = 0; i < this.playerShots.length; i++) {
        const s = this.playerShots[i];
        if (s.isPierce) {
          // Visual elétrico/laranja para tiro perfurante
          ctx.fillStyle = '#ff9900';
          ctx.fillRect(Math.round(s.x), Math.round(s.y), s.width, s.height);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(s.x), Math.round(s.y + 1), s.width, s.height - 2);
        } else {
          SI.Assets.draw(ctx, 'shot_player', s.x, s.y, 0, s.width, s.height);
        }
      }

      // Desenha tiros inimigos
      for (let i = 0; i < this.enemyShots.length; i++) {
        const s = this.enemyShots[i];
        const key = 'shot_' + s.type;
        SI.Assets.draw(ctx, key, s.x, s.y, s.animFrame, s.width, s.height);
      }
    }
  }

  return ShotsManager;
})();
