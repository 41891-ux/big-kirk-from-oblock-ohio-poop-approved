/**
 * entities/powerups.js - Gerenciamento de cápsulas de power-ups coletáveis.
 * Sorteio uniforme (25%), limites de tela, cooldown mínimo e contagem estatística para QA.
 * Namespace global: window.SI.Powerups
 */

window.SI = window.SI || {};

window.SI.Powerups = (function() {
  const CFG = SI.CONFIG.POWERUPS;

  class Capsule {
    constructor(type, x, y) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.width = CFG.WIDTH;
      this.height = CFG.HEIGHT;
      this.speed = CFG.FALL_SPEED;
      this.active = true;
    }

    update() {
      // Cai reta e devagar (ref.)
      this.y += this.speed;

      // Some ao sair pelo chão da tela
      if (this.y > SI.CONFIG.VIDEO.LOGICAL_HEIGHT) {
        this.active = false;
      }
    }

    render(ctx) {
      const assetKey = 'powerup_' + this.type;
      SI.Assets.draw(ctx, assetKey, this.x, this.y, 0, this.width, this.height);
    }
  }

  class PowerupsManager {
    constructor() {
      this.capsules = [];
      this.dropCooldownTimer = 0;

      // Estatísticas de sorteio para auditoria de QA e Modo Debug
      this.stats = {
        total: 0,
        pierce: 0,
        rapid: 0,
        triple: 0,
        laser: 0
      };
    }

    reset() {
      this.capsules.length = 0;
      this.dropCooldownTimer = 0;
    }

    update() {
      if (this.dropCooldownTimer > 0) {
        this.dropCooldownTimer--;
      }

      for (let i = this.capsules.length - 1; i >= 0; i--) {
        const c = this.capsules[i];
        c.update();
        if (!c.active) {
          this.capsules.splice(i, 1);
        }
      }
    }

    // Sorteio aleatório estritamente uniforme entre os 4 tipos de power-ups (ref.)
    rollType() {
      const types = [
        CFG.TYPES.PIERCE,
        CFG.TYPES.RAPID,
        CFG.TYPES.TRIPLE,
        CFG.TYPES.LASER
      ];
      // DECISÃO: Uso do gerador pseudoaleatório seeded da engine para sorteio uniforme 25% cada
      const picked = SI.Util.randomChoice(types);
      this.stats[picked]++;
      this.stats.total++;
      return picked;
    }

    // Tentativa de drop a partir de um invasor comum destruído (4% de chance)
    tryDropFromInvader(x, y) {
      if (!SI.CONFIG.FEATURES.powerups) return;
      if (this.capsules.length >= CFG.MAX_ON_SCREEN) return;
      if (this.dropCooldownTimer > 0) return;

      if (SI.Util.random() < CFG.DROP_CHANCE) {
        this.spawnCapsule(x, y);
      }
    }

    // Drop garantido a partir do UFO destruído (100% de chance)
    dropFromUFO(x, y) {
      if (!SI.CONFIG.FEATURES.powerups) return;

      // Se já houver cápsula na tela, remove para dar prioridade ao UFO mantendo máx 1 na tela (ref.)
      this.capsules.length = 0;
      this.spawnCapsule(x, y);
    }

    spawnCapsule(x, y, forcedType = null) {
      const type = forcedType || this.rollType();
      const capsule = new Capsule(type, x, y);
      this.capsules.push(capsule);
      this.dropCooldownTimer = CFG.DROP_COOLDOWN_FRAMES;
    }

    // Verifica coleta por contato com o canhão do jogador
    checkPlayerCollection(player) {
      if (!player.alive) return;

      for (let i = this.capsules.length - 1; i >= 0; i--) {
        const c = this.capsules[i];
        if (SI.Util.checkAABB(c, player)) {
          // Coletou!
          player.addPowerup(c.type);
          this.capsules.splice(i, 1);
        }
      }
    }

    render(ctx) {
      for (const c of this.capsules) {
        c.render(ctx);
      }
    }
  }

  return PowerupsManager;
})();
