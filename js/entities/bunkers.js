/**
 * entities/bunkers.js - 4 abrigos com destruição por pixel através de máscara lógica (Uint8Array)
 * e offscreen canvas com destination-out. Totalmente seguro contra canvas tainted em file://.
 * Namespace global: window.SI.Bunkers
 */

window.SI = window.SI || {};

window.SI.Bunkers = (function() {
  const CFG = SI.CONFIG.BUNKERS;
  const WIDTH = CFG.WIDTH;   // 22
  const HEIGHT = CFG.HEIGHT; // 16

  class Bunker {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.width = WIDTH;
      this.height = HEIGHT;

      // Máscara lógica de 22x16 bytes (1 = sólido, 0 = destruído)
      this.mask = new Uint8Array(WIDTH * HEIGHT);

      // Canvas offscreen para desenho e corrosão visual com destination-out
      this.canvas = document.createElement('canvas');
      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });

      this.reset();
    }

    reset() {
      // Define o formato clássico do bunker do Space Invaders (ref.)
      for (let py = 0; py < HEIGHT; py++) {
        for (let px = 0; px < WIDTH; px++) {
          let solid = false;

          if (py < 4) {
            // Topo com cantos chanfrados (4 a 17)
            if (px >= 4 && px <= 17) solid = true;
          } else if (py < 8) {
            // Ombros chanfrados (2 a 19)
            if (px >= 2 && px <= 19) solid = true;
          } else if (py < 12) {
            // Corpo principal completo (0 a 21)
            solid = true;
          } else {
            // Base com arco central inferior (pilares nas pontas 0..5 e 16..21)
            if (px <= 5 || px >= 16) solid = true;
          }

          this.mask[py * WIDTH + px] = solid ? 1 : 0;
        }
      }

      // Redesenha a aparência inicial no canvas offscreen
      this.redrawAppearance();
    }

    redrawAppearance() {
      const ctx = this.ctx;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Tenta desenhar a textura do cliente se carregada, ou desenha a forma verde original
      SI.Assets.draw(ctx, 'bunker', 0, 0, 0, WIDTH, HEIGHT);

      // Assegura que partes ocas da máscara fiquem transparentes
      for (let py = 0; py < HEIGHT; py++) {
        for (let px = 0; px < WIDTH; px++) {
          if (this.mask[py * WIDTH + px] === 0) {
            ctx.clearRect(px, py, 1, 1);
          }
        }
      }
    }

    // Corrói uma área circular na máscara lógica e no canvas offscreen
    erode(localX, localY, radius) {
      const r = Math.round(radius);
      const startX = Math.max(0, localX - r);
      const endX = Math.min(WIDTH - 1, localX + r);
      const startY = Math.max(0, localY - r);
      const endY = Math.min(HEIGHT - 1, localY + r);

      let erodedAny = false;
      const rSq = r * r;

      for (let py = startY; py <= endY; py++) {
        for (let px = startX; px <= endX; px++) {
          const dx = px - localX;
          const dy = py - localY;
          if (dx * dx + dy * dy <= rSq) {
            const idx = py * WIDTH + px;
            if (this.mask[idx] === 1) {
              this.mask[idx] = 0;
              erodedAny = true;
            }
          }
        }
      }

      if (erodedAny) {
        // DECISÃO: Uso de destination-out para corroer a textura sem precisar ler pixels
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(localX, localY, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      return erodedAny;
    }

    // Verifica e processa colisão com um projétil
    checkShotCollision(shot, erosionRadius) {
      // Teste AABB primário
      if (!SI.Util.checkAABB(shot, this)) {
        return false;
      }

      // Procura qualquer pixel sólido dentro dos limites do projétil
      const shotMinX = Math.floor(shot.x - this.x);
      const shotMaxX = Math.floor(shot.x + shot.width - this.x);
      const shotMinY = Math.floor(shot.y - this.y);
      const shotMaxY = Math.floor(shot.y + shot.height - this.y);

      for (let py = shotMinY; py <= shotMaxY; py++) {
        if (py < 0 || py >= HEIGHT) continue;
        for (let px = shotMinX; px <= shotMaxX; px++) {
          if (px < 0 || px >= WIDTH) continue;
          if (this.mask[py * WIDTH + px] === 1) {
            // Colisão confirmada: corrói o abrigo no ponto de impacto
            this.erode(px, py, erosionRadius);
            return true;
          }
        }
      }

      return false;
    }

    // Corrosão provocada pelo contato dos invasores em descida (arcade ref.)
    erodeFromInvader(invaderBox) {
      if (!SI.Util.checkAABB(invaderBox, this)) return;

      const minX = Math.max(0, Math.floor(invaderBox.x - this.x));
      const maxX = Math.min(WIDTH - 1, Math.floor(invaderBox.x + invaderBox.width - this.x));
      const minY = Math.max(0, Math.floor(invaderBox.y - this.y));
      const maxY = Math.min(HEIGHT - 1, Math.floor(invaderBox.y + invaderBox.height - this.y));

      let eroded = false;
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const idx = py * WIDTH + px;
          if (this.mask[idx] === 1) {
            this.mask[idx] = 0;
            eroded = true;
          }
        }
      }

      if (eroded) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
      }
    }

    render(ctx) {
      ctx.drawImage(this.canvas, Math.round(this.x), Math.round(this.y));
    }
  }

  class BunkersManager {
    constructor() {
      this.bunkers = [];
      for (let i = 0; i < CFG.COUNT; i++) {
        this.bunkers.push(new Bunker(CFG.X_POSITIONS[i], CFG.Y));
      }
    }

    reset() {
      for (const b of this.bunkers) {
        b.reset();
      }
    }

    // Colisão com tiros do jogador
    checkPlayerShots(playerShots, particleSystem) {
      for (let i = playerShots.length - 1; i >= 0; i--) {
        const s = playerShots[i];
        // Tiro perfurante passa pelos abrigos sem danificá-los (ref.)
        if (s.isPierce) continue;

        for (const b of this.bunkers) {
          if (b.checkShotCollision(s, CFG.EROSION_RADIUS_PLAYER)) {
            if (particleSystem) {
              particleSystem.emit(s.x, s.y, 4, '#00ff00', 1.0, 10, 1);
            }
            playerShots.splice(i, 1);
            break;
          }
        }
      }
    }

    // Colisão com tiros inimigos
    checkEnemyShots(enemyShots, particleSystem) {
      for (let i = enemyShots.length - 1; i >= 0; i--) {
        const s = enemyShots[i];
        for (const b of this.bunkers) {
          if (b.checkShotCollision(s, CFG.EROSION_RADIUS_ENEMY)) {
            if (particleSystem) {
              particleSystem.emit(s.x, s.y + s.height, 4, '#00ff00', 1.0, 10, 1);
            }
            enemyShots.splice(i, 1);
            break;
          }
        }
      }
    }

    // Corrosão por contato com os invasores
    checkInvaderOverlap(invader) {
      for (const b of this.bunkers) {
        b.erodeFromInvader(invader);
      }
    }

    render(ctx) {
      for (const b of this.bunkers) {
        b.render(ctx);
      }
    }
  }

  return BunkersManager;
})();
