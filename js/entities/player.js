/**
 * entities/player.js - Canhão do jogador, movimentação horizontal, vidas,
 * controle de disparo e estados de invulnerabilidade e morte.
 * Namespace global: window.SI.Player
 */

window.SI = window.SI || {};

window.SI.Player = (function() {
  const CONFIG = SI.CONFIG.PLAYER;

  class Player {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = CONFIG.START_X;
      this.y = CONFIG.START_Y;
      this.width = CONFIG.WIDTH;
      this.height = CONFIG.HEIGHT;
      this.speed = CONFIG.SPEED;
      this.lives = CONFIG.INITIAL_LIVES;
      this.alive = true;
      this.deathTimer = 0;
      this.invulnerableTimer = 0;
      this.shotCooldown = 0;

      // Estado dos Power-ups
      this.powerups = {
        pierceTimer: 0,
        rapidTimer: 0,
        tripleTimer: 0,
        laserCharge: 0 // 0 ou 1
      };
    }

    update(isLaserFiring = false) {
      if (!this.alive) {
        if (this.deathTimer > 0) {
          this.deathTimer--;
        }
        return;
      }

      // Atualiza temporizadores de power-ups
      if (this.powerups.pierceTimer > 0) this.powerups.pierceTimer--;
      if (this.powerups.rapidTimer > 0) this.powerups.rapidTimer--;
      if (this.powerups.tripleTimer > 0) this.powerups.tripleTimer--;
      if (this.invulnerableTimer > 0) this.invulnerableTimer--;
      if (this.shotCooldown > 0) this.shotCooldown--;

      // Velocidade do jogador (reduzida para 50% se o Super Laser estiver ativo)
      let currentSpeed = this.speed;
      if (isLaserFiring) {
        currentSpeed *= SI.CONFIG.POWERUPS.LASER.PLAYER_SPEED_FACTOR;
      }

      // Movimento horizontal constante (~1 px/frame ref.)
      if (SI.Input.isDown('left')) {
        this.x -= currentSpeed;
      }
      if (SI.Input.isDown('right')) {
        this.x += currentSpeed;
      }

      // Delimitação na tela
      this.x = SI.Util.clamp(this.x, CONFIG.MIN_X, CONFIG.MAX_X);
    }

    canShoot(activePlayerShotsCount) {
      if (!this.alive) return false;

      const hasRapid = this.powerups.rapidTimer > 0;
      if (hasRapid) {
        // Com cadência rápida: até 4 tiros e cooldown de 12 frames
        return (
          activePlayerShotsCount < SI.CONFIG.POWERUPS.RAPID_MAX_SHOTS &&
          this.shotCooldown <= 0
        );
      } else {
        // Regra clássica do arcade: apenas UM tiro na tela por vez (ref.)
        return activePlayerShotsCount < SI.CONFIG.PLAYER_SHOT.MAX_NORMAL;
      }
    }

    registerShotFired() {
      if (this.powerups.rapidTimer > 0) {
        this.shotCooldown = SI.CONFIG.POWERUPS.RAPID_COOLDOWN_FRAMES;
      }
    }

    hasLaserCharge() {
      return this.powerups.laserCharge > 0;
    }

    consumeLaserCharge() {
      if (this.powerups.laserCharge > 0) {
        this.powerups.laserCharge = 0;
        return true;
      }
      return false;
    }

    addPowerup(type) {
      const PW = SI.CONFIG.POWERUPS.TYPES;
      const duration = SI.CONFIG.POWERUPS.DURATION_FRAMES;

      if (type === PW.PIERCE) {
        this.powerups.pierceTimer = duration;
      } else if (type === PW.RAPID) {
        this.powerups.rapidTimer = duration;
      } else if (type === PW.TRIPLE) {
        this.powerups.tripleTimer = duration;
      } else if (type === PW.LASER) {
        this.powerups.laserCharge = 1; // Máx. 1 carga
      }
      SI.Audio.playPowerupCollect();
    }

    hit() {
      if (!this.alive || this.invulnerableTimer > 0) return false;

      this.alive = false;
      this.lives--;
      this.deathTimer = CONFIG.RESPAWN_DELAY_FRAMES;

      // Sons e partículas da destruição do canhão
      SI.Audio.playPlayerExplosion();
      return true;
    }

    respawn(isBossFight = false) {
      this.x = CONFIG.START_X;
      this.y = CONFIG.START_Y;
      this.alive = true;
      this.deathTimer = 0;
      this.shotCooldown = 0;

      // Na luta do chefe, ganha 2s de invulnerabilidade ao renascer (ref.)
      if (isBossFight) {
        this.invulnerableTimer = SI.CONFIG.BOSS.PLAYER_RESPAWN_INVULN_FRAMES;
      } else {
        this.invulnerableTimer = 0;
      }
    }

    render(ctx) {
      if (!this.alive) {
        // Animação de explosão do canhão alternando quadros
        const frame = Math.floor(this.deathTimer / 8) % 2;
        SI.Assets.draw(ctx, 'player_death', this.x - 1, this.y, frame, 15, 8);
        return;
      }

      // Efeito de piscar durante invulnerabilidade
      if (this.invulnerableTimer > 0) {
        if (Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
          return;
        }
      }

      SI.Assets.draw(ctx, 'player', this.x, this.y, 0, this.width, this.height);
    }
  }

  return Player;
})();
