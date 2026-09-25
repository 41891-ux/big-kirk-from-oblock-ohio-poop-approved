/**
 * entities/boss.js - Chefe Final acionado aos 67.000 pontos.
 * Barra de vida (150 HP), flash de dano, 3 fases de combate com velocidade progressiva,
 * 3 ataques telegrafados com aviso prévio >= 0.5s (Leque, Cortina com brechas seguras e Raio Vertical),
 * reforços de mini-invasores limitados a 10 vivos e sequência dramática de derrota.
 * Namespace global: window.SI.Boss
 */

window.SI = window.SI || {};

window.SI.Boss = (function() {
  const CFG = SI.CONFIG.BOSS;

  class MiniInvader {
    constructor(x, y, col) {
      this.x = x;
      this.y = y;
      this.col = col;
      this.width = 11;
      this.height = 8;
      this.type = 'invader_medium';
      this.alive = true;
      this.animFrame = 0;
      this.explodingTimer = 0;
    }
  }

  class Boss {
    constructor() {
      this.reset();
    }

    reset() {
      this.active = false;
      this.defeated = false;
      this.x = (SI.CONFIG.VIDEO.LOGICAL_WIDTH - CFG.WIDTH) / 2;
      this.y = -CFG.HEIGHT;
      this.width = CFG.WIDTH;
      this.height = CFG.HEIGHT;
      this.hp = CFG.MAX_HP;
      this.maxHp = CFG.MAX_HP;
      this.isInvulnerable = false;
      this.invulnerableTimer = 0;
      this.damageFlashTimer = 0;

      this.direction = 1;
      this.baseSpeed = CFG.PHASES.PHASE_1.speed;
      this.oscillationTimer = 0;

      // Estado dos Ataques
      this.attackCooldown = 120; // 2 segundos iniciais
      this.currentAttack = null; // 'fan', 'curtain', 'beam'
      this.attackPhase = 'idle'; // 'telegraph', 'execute'
      this.attackTimer = 0;
      this.telegraphData = null;

      // Reforços (Mini-invasores)
      this.miniInvaders = [];
      this.miniCycleIndex = 0;
      this.miniDirection = 1;
      this.miniDropActive = false;
      this.miniEdgeReached = false;
      this.reinforcementTimer = CFG.REINFORCEMENTS.INTERVAL_FRAMES;
      this.spawnedThreshold50 = false;
      this.spawnedThreshold25 = false;

      // Projéteis específicos do chefe
      this.bossShots = [];

      // Sequência de morte
      this.deathTimer = 0;
    }

    startIntro() {
      this.reset();
      this.active = true;
      this.isInvulnerable = true;
      this.invulnerableTimer = CFG.DESCEND_FRAMES + CFG.INVULNERABLE_FRAMES;
      this.y = -CFG.HEIGHT;
    }

    update(playerX, playerY, bunkers, shotsManager, powerupsManager, particleSystem) {
      if (!this.active) return;

      // 1. Atualiza temporizadores de dano e invulnerabilidade
      if (this.damageFlashTimer > 0) this.damageFlashTimer--;
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer--;
        if (this.invulnerableTimer <= 0) {
          this.isInvulnerable = false;
        }
      }

      // 2. Animação de descida inicial para entrar na tela
      if (this.y < CFG.Y_FIGHT) {
        this.y += (CFG.Y_FIGHT - (-CFG.HEIGHT)) / CFG.DESCEND_FRAMES;
        if (this.y >= CFG.Y_FIGHT) {
          this.y = CFG.Y_FIGHT;
        }
        return;
      }

      // 3. Sequência de Derrota
      if (this.defeated) {
        this.deathTimer++;
        if (particleSystem && Math.random() < 0.7) {
          const rx = this.x + SI.Util.randomRange(2, this.width - 2);
          const ry = this.y + SI.Util.randomRange(2, this.height - 2);
          particleSystem.emit(rx, ry, 10, SI.Util.randomChoice(['#ff0055', '#ffff00', '#ffffff']), 2.0, 20, 1);
        }
        return;
      }

      // 4. Movimentação horizontal com oscilação vertical suave
      this.updateMovement();

      // 5. Sistema de Ataques Telegrafados (Avisos >= 0.5s)
      this.updateAttacks(playerX, playerY, particleSystem);

      // 6. Atualização de Reforços (Mini-invasores)
      this.updateReinforcements(bunkers, shotsManager, powerupsManager, particleSystem);

      // 7. Atualização dos projéteis do chefe
      this.updateBossShots(particleSystem);
    }

    updateMovement() {
      // Determina a velocidade da fase atual
      const hpRatio = this.hp / this.maxHp;
      if (hpRatio > CFG.PHASES.PHASE_2.hpThreshold) {
        this.baseSpeed = CFG.PHASES.PHASE_1.speed;
      } else if (hpRatio > CFG.PHASES.PHASE_3.hpThreshold) {
        this.baseSpeed = CFG.PHASES.PHASE_2.speed;
      } else {
        this.baseSpeed = CFG.PHASES.PHASE_3.speed;
      }

      this.x += this.direction * this.baseSpeed;
      if (this.x <= 16) {
        this.x = 16;
        this.direction = 1;
      } else if (this.x + this.width >= SI.CONFIG.VIDEO.LOGICAL_WIDTH - 16) {
        this.x = SI.CONFIG.VIDEO.LOGICAL_WIDTH - 16 - this.width;
        this.direction = -1;
      }

      // Leve oscilação vertical
      this.oscillationTimer += 0.05;
      this.y = CFG.Y_FIGHT + Math.sin(this.oscillationTimer) * 4;
    }

    updateAttacks(playerX, playerY, particleSystem) {
      if (this.isInvulnerable) return;

      if (!this.currentAttack) {
        this.attackCooldown--;
        if (this.attackCooldown <= 0) {
          this.decideNextAttack(playerX);
        }
        return;
      }

      // Processa o ataque ativo
      if (this.attackPhase === 'telegraph') {
        this.attackTimer--;
        if (this.attackTimer <= 0) {
          this.executeAttack(playerX, playerY);
        }
      } else if (this.attackPhase === 'execute') {
        this.attackTimer--;
        if (this.attackTimer <= 0) {
          // Concluiu o ataque
          this.currentAttack = null;
          this.attackPhase = 'idle';
          this.telegraphData = null;
          // Cooldown varia conforme a fase (mais agressivo na fase 3)
          const hpRatio = this.hp / this.maxHp;
          this.attackCooldown = hpRatio < 0.33 ? 60 : 100;
        }
      }
    }

    decideNextAttack(playerX) {
      const hpRatio = this.hp / this.maxHp;
      const choices = ['fan', 'curtain'];

      // Ataque C (Raio Vertical) desbloqueado a partir da fase 2 (ref.)
      if (hpRatio <= CFG.PHASES.PHASE_2.hpThreshold) {
        choices.push('beam');
      }

      this.currentAttack = SI.Util.randomChoice(choices);
      this.attackPhase = 'telegraph';

      if (this.currentAttack === 'fan') {
        // Aviso de 0.6s (36 frames) nos canhões
        this.attackTimer = 36;
        this.telegraphData = { type: 'fan' };
      } else if (this.currentAttack === 'curtain') {
        // Aviso de 0.7s (42 frames) no topo com 2 brechas seguras calculadas
        this.attackTimer = 42;
        // Brechas seguras alcançáveis pela velocidade do canhão (~1 px/frame)
        const gap1 = SI.Util.clamp(playerX - 20 + SI.Util.randomRange(-15, 15), 24, 90);
        const gap2 = SI.Util.clamp(gap1 + SI.Util.randomRange(60, 90), 120, 195);
        this.telegraphData = { type: 'curtain', gap1, gap2, gapWidth: 26 };
      } else if (this.currentAttack === 'beam') {
        // Aviso de 1.0s (60 frames) nas colunas miradas (ref.)
        this.attackTimer = 60;
        const col1 = SI.Util.clamp(playerX + 6, 20, 204);
        const col2 = (hpRatio < 0.33) ? (col1 < 112 ? col1 + 60 : col1 - 60) : null;
        this.telegraphData = { type: 'beam', col1, col2, beamWidth: 16 };
      }
    }

    executeAttack(playerX, playerY) {
      this.attackPhase = 'execute';

      if (this.currentAttack === 'fan') {
        // Dispara 5 a 7 projéteis em arco mirados no canhão (ref.)
        this.attackTimer = 25; // Duração para rajadas
        const count = (this.hp / this.maxHp < 0.33) ? 7 : 5;
        this.spawnFanBurst(playerX, playerY, count);

        // Segunda rajada após 0.25s (15 frames)
        setTimeout(() => {
          if (this.active && !this.defeated) {
            this.spawnFanBurst(playerX, playerY, count);
          }
        }, 250);
      } else if (this.currentAttack === 'curtain') {
        // Linha de projéteis caindo por toda a largura com as 2 brechas seguras (ref.)
        this.attackTimer = 20;
        const data = this.telegraphData;
        const step = 8;
        for (let x = 12; x < SI.CONFIG.VIDEO.LOGICAL_WIDTH - 12; x += step) {
          const inGap1 = (x >= data.gap1 - 2 && x <= data.gap1 + data.gapWidth + 2);
          const inGap2 = (x >= data.gap2 - 2 && x <= data.gap2 + data.gapWidth + 2);
          if (!inGap1 && !inGap2) {
            this.bossShots.push({
              x: x,
              y: this.y + this.height,
              vx: 0,
              vy: 1.6,
              width: 4,
              height: 6,
              active: true
            });
          }
        }
      } else if (this.currentAttack === 'beam') {
        // Raio vertical contínuo por 0.5s (30 frames) que atravessa abrigos (ref.)
        this.attackTimer = 30;
      }
    }

    spawnFanBurst(playerX, playerY, count) {
      const originX = this.x + this.width / 2;
      const originY = this.y + this.height - 2;
      const targetX = playerX + 6.5;
      const targetY = playerY + 4;

      const baseAngle = Math.atan2(targetY - originY, targetX - originX);
      const spreadAngle = SI.Util.degToRad(35);
      const angleStep = spreadAngle / (count - 1);
      const startAngle = baseAngle - spreadAngle / 2;

      for (let i = 0; i < count; i++) {
        const ang = startAngle + i * angleStep;
        const spd = 1.8;
        this.bossShots.push({
          x: originX,
          y: originY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          width: 4,
          height: 6,
          active: true
        });
      }
    }

    updateBossShots(particleSystem) {
      for (let i = this.bossShots.length - 1; i >= 0; i--) {
        const s = this.bossShots[i];
        s.x += s.vx;
        s.y += s.vy;

        // Fundo da tela
        if (s.y > SI.CONFIG.PLAYER.GROUND_Y || s.x < 0 || s.x > SI.CONFIG.VIDEO.LOGICAL_WIDTH) {
          this.bossShots.splice(i, 1);
        }
      }
    }

    updateReinforcements(bunkers, shotsManager, powerupsManager, particleSystem) {
      const hpRatio = this.hp / this.maxHp;

      // Invocações por gatilhos de 50% e 25% de vida
      if (!this.spawnedThreshold50 && hpRatio <= 0.50) {
        this.spawnedThreshold50 = true;
        this.spawnReinforcements();
      }
      if (!this.spawnedThreshold25 && hpRatio <= 0.25) {
        this.spawnedThreshold25 = true;
        this.spawnReinforcements();
      }

      // Invocações periódicas a cada ~12s (a partir da fase 2)
      if (hpRatio <= CFG.PHASES.PHASE_2.hpThreshold) {
        this.reinforcementTimer--;
        if (this.reinforcementTimer <= 0) {
          this.reinforcementTimer = CFG.REINFORCEMENTS.INTERVAL_FRAMES;
          this.spawnReinforcements();
        }
      }

      // Atualiza movimento dos mini-invasores (regra de 1 por frame)
      const living = this.miniInvaders.filter(m => m.alive);
      if (living.length === 0) return;

      if (this.miniCycleIndex >= living.length) {
        this.miniCycleIndex = 0;
        if (this.miniDropActive) {
          this.miniDropActive = false;
          this.miniEdgeReached = false;
        } else if (this.miniEdgeReached) {
          this.miniDropActive = true;
          this.miniDirection = -this.miniDirection;
          this.miniEdgeReached = false;
        }
      }

      const mini = living[this.miniCycleIndex];
      if (mini && mini.alive) {
        if (this.miniDropActive) {
          mini.y += 6;
          if (bunkers) bunkers.checkInvaderOverlap(mini);
        } else {
          mini.x += this.miniDirection * 2;
          if (mini.x <= 10 || mini.x + mini.width >= SI.CONFIG.VIDEO.LOGICAL_WIDTH - 10) {
            this.miniEdgeReached = true;
          }
        }
        mini.animFrame = 1 - mini.animFrame;
      }

      this.miniCycleIndex++;
    }

    spawnReinforcements() {
      const currentAlive = this.miniInvaders.filter(m => m.alive).length;
      const countToSpawn = Math.min(
        CFG.REINFORCEMENTS.SPAWN_COUNT,
        CFG.REINFORCEMENTS.MAX_ALIVE - currentAlive
      );

      if (countToSpawn <= 0) return;

      const startX = this.x + 4;
      const startY = this.y + this.height + 4;
      for (let i = 0; i < countToSpawn; i++) {
        const mini = new MiniInvader(startX + (i % 4) * 14, startY + Math.floor(i / 4) * 12, i);
        this.miniInvaders.push(mini);
      }
    }

    takeDamage(amount, particleSystem) {
      if (!this.active || this.hp <= 0 || this.isInvulnerable) return;

      this.hp -= amount;
      this.damageFlashTimer = 6;
      SI.Audio.playBossHit();

      if (particleSystem) {
        particleSystem.emit(
          this.x + this.width / 2 + SI.Util.randomRange(-15, 15),
          this.y + this.height / 2 + SI.Util.randomRange(-8, 8),
          6,
          '#ffffff',
          1.5,
          10,
          1
        );
      }

      if (this.hp <= 0) {
        this.hp = 0;
        this.defeated = true;
        this.deathTimer = 0;
        SI.Audio.playBossDefeatExplosion();
      }
    }

    checkHitByPlayerShot(shot, particleSystem) {
      if (!this.active || this.hp <= 0 || this.isInvulnerable) return false;

      // Colisão com o corpo do chefe
      if (SI.Util.checkAABB(shot, this)) {
        this.takeDamage(1, particleSystem);
        return true;
      }

      // Colisão com os mini-invasores
      for (let i = 0; i < this.miniInvaders.length; i++) {
        const mini = this.miniInvaders[i];
        if (mini.alive && SI.Util.checkAABB(shot, mini)) {
          mini.alive = false;
          mini.explodingTimer = 12;
          SI.Audio.playInvaderExplosion();
          if (particleSystem) {
            particleSystem.emit(mini.x + mini.width / 2, mini.y + mini.height / 2, 8, '#00ffff', 1.5, 12, 1);
          }
          return true;
        }
      }

      return false;
    }

    render(ctx) {
      if (!this.active) return;

      ctx.save();

      // 1. Telegrafia dos Ataques (Avisos Visuais Claros)
      if (this.attackPhase === 'telegraph' && this.telegraphData) {
        const tType = this.telegraphData.type;

        if (tType === 'fan') {
          // Círculos de carregamento pulsando nos canhões
          const pulse = (Math.sin(this.attackTimer * 0.4) + 1) * 0.5;
          ctx.strokeStyle = `rgba(255, 50, 50, ${0.4 + pulse * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(this.x + 4, this.y + this.height - 2, 4 + pulse * 3, 0, Math.PI * 2);
          ctx.arc(this.x + this.width - 4, this.y + this.height - 2, 4 + pulse * 3, 0, Math.PI * 2);
          ctx.stroke();
        } else if (tType === 'curtain') {
          // Barra de alerta no topo destacando as brechas seguras
          ctx.fillStyle = (Math.floor(this.attackTimer / 4) % 2 === 0) ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 255, 0, 0.4)';
          ctx.fillRect(0, this.y + this.height + 2, SI.CONFIG.VIDEO.LOGICAL_WIDTH, 2);
          // Marca as brechas seguras em verde
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(this.telegraphData.gap1, this.y + this.height + 1, this.telegraphData.gapWidth, 4);
          ctx.fillRect(this.telegraphData.gap2, this.y + this.height + 1, this.telegraphData.gapWidth, 4);
        } else if (tType === 'beam') {
          // Colunas verticais piscantes indicando a área do raio fatal
          const pulse = (Math.sin(this.attackTimer * 0.5) + 1) * 0.5;
          ctx.fillStyle = `rgba(255, 0, 50, ${0.15 + pulse * 0.3})`;
          const bW = this.telegraphData.beamWidth;
          ctx.fillRect(this.telegraphData.col1 - bW / 2, 0, bW, SI.CONFIG.PLAYER.GROUND_Y);
          if (this.telegraphData.col2 !== null) {
            ctx.fillRect(this.telegraphData.col2 - bW / 2, 0, bW, SI.CONFIG.PLAYER.GROUND_Y);
          }
        }
      }

      // 2. Execução do Ataque C (Raio Vertical Fatal)
      if (this.currentAttack === 'beam' && this.attackPhase === 'execute' && this.telegraphData) {
        const bW = this.telegraphData.beamWidth;
        const grad = ctx.createLinearGradient(0, 0, bW, 0);
        grad.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, 'rgba(255, 0, 0, 0.4)');

        ctx.fillStyle = grad;
        ctx.fillRect(this.telegraphData.col1 - bW / 2, 0, bW, SI.CONFIG.PLAYER.GROUND_Y);
        if (this.telegraphData.col2 !== null) {
          ctx.fillRect(this.telegraphData.col2 - bW / 2, 0, bW, SI.CONFIG.PLAYER.GROUND_Y);
        }
      }

      // 3. Desenho do Chefe com Flash de Dano (globalCompositeOperation)
      if (this.damageFlashTimer > 0) {
        // Desenha a silhueta em branco puro durante o impacto (sem tainting)
        SI.Assets.draw(ctx, 'boss', this.x, this.y, 0, this.width, this.height);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      } else {
        const frame = (Math.floor(this.oscillationTimer * 2) % 2);
        SI.Assets.draw(ctx, 'boss', this.x, this.y, frame, this.width, this.height);
      }

      // 4. Desenha mini-invasores de reforço
      for (const mini of this.miniInvaders) {
        if (mini.alive) {
          SI.Assets.draw(ctx, mini.type, mini.x, mini.y, mini.animFrame, mini.width, mini.height);
        } else if (mini.explodingTimer > 0) {
          SI.Assets.draw(ctx, 'invader_death', mini.x, mini.y, 0, 13, 8);
        }
      }

      // 5. Desenha projéteis do chefe
      for (const s of this.bossShots) {
        SI.Assets.draw(ctx, 'boss_shot', s.x, s.y, 0, s.width, s.height);
      }

      // 6. Barra de Vida do Chefe no Topo da Tela
      this.renderHealthBar(ctx);

      ctx.restore();
    }

    renderHealthBar(ctx) {
      const barWidth = 140;
      const barHeight = 4;
      const x = (SI.CONFIG.VIDEO.LOGICAL_WIDTH - barWidth) / 2;
      const y = 14;

      // Fundo da barra
      ctx.fillStyle = '#220022';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Preenchimento proporcional
      const fillW = Math.max(0, (this.hp / this.maxHp) * barWidth);
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? '#ff0055' : (hpRatio > 0.25 ? '#ffaa00' : '#ff0000');
      ctx.fillRect(x, y, fillW, barHeight);

      // Borda
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);

      // Rótulo de texto
      ctx.fillStyle = '#ffffff';
      ctx.font = '6px monospace';
      ctx.fillText(SI.CONFIG.STRINGS.BOSS_HP, x - 28, y + 4);
    }
  }

  return Boss;
})();
