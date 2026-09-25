/**
 * assets.js - Manifesto de assets, carregador de imagens e gerador de placeholders procedurais.
 * Nunca trava se a imagem não existir e nunca lê pixels das imagens (evitando canvas tainted em file://).
 * Namespace global: window.SI.Assets
 */

window.SI = window.SI || {};

window.SI.Assets = (function() {
  // --- Manifesto de Texturas ---
  // Cada entrada mapeia: chave -> { src, w, h, frames, fps }
  // w e h são dimensões lógicas na grade 224x256.
  const MANIFEST = {
    player:          { src: 'assets/player.png',          w: 13, h: 8,  frames: 1, fps: 0 },
    player_death:    { src: 'assets/player_death.png',    w: 15, h: 8,  frames: 2, fps: 5 },
    invader_small:   { src: 'assets/invader_small.png',   w: 8,  h: 8,  frames: 2, fps: 2 },
    invader_medium:  { src: 'assets/invader_medium.png',  w: 11, h: 8,  frames: 2, fps: 2 },
    invader_large:   { src: 'assets/invader_large.png',   w: 12, h: 8,  frames: 2, fps: 2 },
    invader_death:   { src: 'assets/invader_death.png',   w: 13, h: 8,  frames: 1, fps: 0 },
    ufo:             { src: 'assets/ufo.png',             w: 16, h: 8,  frames: 1, fps: 0 },
    ufo_death:       { src: 'assets/ufo_death.png',       w: 21, h: 8,  frames: 1, fps: 0 },
    bunker:          { src: 'assets/bunker.png',          w: 22, h: 16, frames: 1, fps: 0 },
    shot_player:     { src: 'assets/shot_player.png',     w: 1,  h: 4,  frames: 1, fps: 0 },
    shot_rolling:    { src: 'assets/shot_rolling.png',    w: 3,  h: 7,  frames: 4, fps: 8 },
    shot_plunger:    { src: 'assets/shot_plunger.png',    w: 3,  h: 7,  frames: 4, fps: 8 },
    shot_squiggly:   { src: 'assets/shot_squiggly.png',   w: 3,  h: 7,  frames: 4, fps: 8 },
    powerup_pierce:  { src: 'assets/powerup_pierce.png',  w: 8,  h: 8,  frames: 1, fps: 0 },
    powerup_rapid:   { src: 'assets/powerup_rapid.png',   w: 8,  h: 8,  frames: 1, fps: 0 },
    powerup_triple:  { src: 'assets/powerup_triple.png',  w: 8,  h: 8,  frames: 1, fps: 0 },
    powerup_laser:   { src: 'assets/powerup_laser.png',   w: 8,  h: 8,  frames: 1, fps: 0 },
    boss:            { src: 'assets/boss.png',            w: 48, h: 24, frames: 2, fps: 3 },
    boss_shot:       { src: 'assets/boss_shot.png',       w: 4,  h: 6,  frames: 2, fps: 8 },
    background:      { src: 'assets/background.png',      w: 224,h: 256,frames: 1, fps: 0 },
    laser:           { src: 'assets/laser.png',           w: 39, h: 256,frames: 1, fps: 0 }
  };

  const _images = {};
  const _warnedMissing = {};
  let _loadedCount = 0;
  let _totalCount = 0;
  let _allDone = false;

  // Inicializa o carregamento de todas as texturas declaradas
  function init(onComplete) {
    const keys = Object.keys(MANIFEST);
    _totalCount = keys.length;

    if (_totalCount === 0) {
      _allDone = true;
      if (onComplete) onComplete();
      return;
    }

    keys.forEach(key => {
      const def = MANIFEST[key];
      const img = new Image();
      
      img.onload = function() {
        _images[key] = { img: img, loaded: true, def: def };
        _loadedCount++;
        checkCompletion(onComplete);
      };

      img.onerror = function() {
        // DECISÃO: Em caso de erro 404/local, marcar como não carregado e usar placeholder sem travar
        _images[key] = { img: null, loaded: false, def: def };
        if (!_warnedMissing[key]) {
          console.warn(`[SI Assets] Textura ausente para "${key}" (${def.src}). Usando placeholder procedural.`);
          _warnedMissing[key] = true;
        }
        _loadedCount++;
        checkCompletion(onComplete);
      };

      img.src = def.src;
    });
  }

  function checkCompletion(onComplete) {
    if (_loadedCount >= _totalCount && !_allDone) {
      _allDone = true;
      if (onComplete) onComplete();
    }
  }

  function isReady() {
    return _allDone;
  }

  function getManifestDef(key) {
    return MANIFEST[key] || null;
  }

  // --- Desenho Genérico com Fallback a Placeholder ---
  function draw(ctx, key, x, y, frameIndex = 0, customW = null, customH = null) {
    const asset = _images[key];
    const def = MANIFEST[key];
    const w = customW !== null ? customW : (def ? def.w : 8);
    const h = customH !== null ? customH : (def ? def.h : 8);

    if (asset && asset.loaded && asset.img) {
      // Desenha quadro específico da tira de imagem (spritesheet horizontal)
      const numFrames = def.frames || 1;
      const safeFrame = frameIndex % numFrames;
      const frameW = asset.img.width / numFrames;
      const frameH = asset.img.height;

      ctx.drawImage(
        asset.img,
        safeFrame * frameW, 0, frameW, frameH,
        Math.round(x), Math.round(y), w, h
      );
    } else {
      // Imagem ausente: desenha placeholder procedural fiel e colorido
      drawPlaceholder(ctx, key, Math.round(x), Math.round(y), w, h, frameIndex);
    }
  }

  // --- Desenho dos Placeholders Procedurais ---
  function drawPlaceholder(ctx, key, x, y, w, h, frameIndex) {
    ctx.save();
    
    switch (key) {
      case 'player': {
        // Canhão verde clássico
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x + 5, y, 3, 2);      // Ponta do canhão
        ctx.fillRect(x + 4, y + 2, 5, 2);  // Torre
        ctx.fillRect(x + 1, y + 4, 11, 2); // Base superior
        ctx.fillRect(x, y + 6, 13, 2);     // Base inferior
        break;
      }

      case 'player_death': {
        // Canhão destruído com linhas alternadas
        ctx.fillStyle = (frameIndex % 2 === 0) ? '#00ff00' : '#ff4444';
        ctx.fillRect(x + 1, y + 2, 4, 2);
        ctx.fillRect(x + 8, y + 1, 4, 2);
        ctx.fillRect(x + 2, y + 5, 10, 2);
        ctx.fillRect(x + 5, y + 3, 3, 2);
        break;
      }

      case 'invader_small': {
        // Invasor superior (30 pts) - Branco
        ctx.fillStyle = '#ffffff';
        if (frameIndex % 2 === 0) {
          ctx.fillRect(x + 3, y, 2, 1);
          ctx.fillRect(x + 2, y + 1, 4, 1);
          ctx.fillRect(x + 1, y + 2, 6, 1);
          ctx.fillRect(x, y + 3, 2, 1); ctx.fillRect(x + 3, y + 3, 2, 1); ctx.fillRect(x + 6, y + 3, 2, 1);
          ctx.fillRect(x, y + 4, 8, 1);
          ctx.fillRect(x + 2, y + 5, 1, 1); ctx.fillRect(x + 5, y + 5, 1, 1);
          ctx.fillRect(x + 1, y + 6, 1, 1); ctx.fillRect(x + 6, y + 6, 1, 1);
          ctx.fillRect(x, y + 7, 1, 1); ctx.fillRect(x + 7, y + 7, 1, 1);
        } else {
          ctx.fillRect(x + 3, y, 2, 1);
          ctx.fillRect(x + 2, y + 1, 4, 1);
          ctx.fillRect(x + 1, y + 2, 6, 1);
          ctx.fillRect(x, y + 3, 2, 1); ctx.fillRect(x + 3, y + 3, 2, 1); ctx.fillRect(x + 6, y + 3, 2, 1);
          ctx.fillRect(x, y + 4, 8, 1);
          ctx.fillRect(x + 2, y + 5, 4, 1);
          ctx.fillRect(x + 1, y + 6, 2, 1); ctx.fillRect(x + 5, y + 6, 2, 1);
          ctx.fillRect(x + 2, y + 7, 1, 1); ctx.fillRect(x + 5, y + 7, 1, 1);
        }
        break;
      }

      case 'invader_medium': {
        // Invasor médio (20 pts) - Ciano
        ctx.fillStyle = '#00ffff';
        if (frameIndex % 2 === 0) {
          ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x + 8, y, 1, 1);
          ctx.fillRect(x + 3, y + 1, 1, 1); ctx.fillRect(x + 7, y + 1, 1, 1);
          ctx.fillRect(x + 2, y + 2, 7, 1);
          ctx.fillRect(x + 1, y + 3, 2, 1); ctx.fillRect(x + 4, y + 3, 3, 1); ctx.fillRect(x + 8, y + 3, 2, 1);
          ctx.fillRect(x, y + 4, 11, 1);
          ctx.fillRect(x, y + 5, 1, 1); ctx.fillRect(x + 2, y + 5, 7, 1); ctx.fillRect(x + 10, y + 5, 1, 1);
          ctx.fillRect(x, y + 6, 1, 1); ctx.fillRect(x + 2, y + 6, 1, 1); ctx.fillRect(x + 8, y + 6, 1, 1); ctx.fillRect(x + 10, y + 6, 1, 1);
          ctx.fillRect(x + 3, y + 7, 2, 1); ctx.fillRect(x + 6, y + 7, 2, 1);
        } else {
          ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x + 8, y, 1, 1);
          ctx.fillRect(x, y + 1, 1, 1); ctx.fillRect(x + 10, y + 1, 1, 1);
          ctx.fillRect(x, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 7, 1); ctx.fillRect(x + 10, y + 2, 1, 1);
          ctx.fillRect(x, y + 3, 3, 1); ctx.fillRect(x + 4, y + 3, 3, 1); ctx.fillRect(x + 8, y + 3, 3, 1);
          ctx.fillRect(x, y + 4, 11, 1);
          ctx.fillRect(x + 2, y + 5, 7, 1);
          ctx.fillRect(x + 1, y + 6, 1, 1); ctx.fillRect(x + 9, y + 6, 1, 1);
          ctx.fillRect(x, y + 7, 1, 1); ctx.fillRect(x + 10, y + 7, 1, 1);
        }
        break;
      }

      case 'invader_large': {
        // Invasor grande (10 pts) - Verde
        ctx.fillStyle = '#33ff33';
        if (frameIndex % 2 === 0) {
          ctx.fillRect(x + 4, y, 4, 1);
          ctx.fillRect(x + 1, y + 1, 10, 1);
          ctx.fillRect(x, y + 2, 12, 1);
          ctx.fillRect(x, y + 3, 3, 1); ctx.fillRect(x + 5, y + 3, 2, 1); ctx.fillRect(x + 9, y + 3, 3, 1);
          ctx.fillRect(x, y + 4, 12, 1);
          ctx.fillRect(x + 3, y + 5, 6, 1);
          ctx.fillRect(x + 2, y + 6, 2, 1); ctx.fillRect(x + 8, y + 6, 2, 1);
          ctx.fillRect(x + 1, y + 7, 2, 1); ctx.fillRect(x + 9, y + 7, 2, 1);
        } else {
          ctx.fillRect(x + 4, y, 4, 1);
          ctx.fillRect(x + 1, y + 1, 10, 1);
          ctx.fillRect(x, y + 2, 12, 1);
          ctx.fillRect(x, y + 3, 3, 1); ctx.fillRect(x + 5, y + 3, 2, 1); ctx.fillRect(x + 9, y + 3, 3, 1);
          ctx.fillRect(x, y + 4, 12, 1);
          ctx.fillRect(x + 2, y + 5, 8, 1);
          ctx.fillRect(x + 3, y + 6, 1, 1); ctx.fillRect(x + 8, y + 6, 1, 1);
          ctx.fillRect(x + 2, y + 7, 1, 1); ctx.fillRect(x + 9, y + 7, 1, 1);
        }
        break;
      }

      case 'invader_death': {
        // Explosão clássica do invasor
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y, 1, 2);
        ctx.fillRect(x + 6, y + 6, 1, 2);
        ctx.fillRect(x, y + 3, 2, 1);
        ctx.fillRect(x + 11, y + 3, 2, 1);
        ctx.fillRect(x + 2, y + 1, 2, 2);
        ctx.fillRect(x + 9, y + 1, 2, 2);
        ctx.fillRect(x + 2, y + 5, 2, 2);
        ctx.fillRect(x + 9, y + 5, 2, 2);
        ctx.fillRect(x + 5, y + 3, 3, 2);
        break;
      }

      case 'ufo': {
        // Nave mistério vermelha
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(x + 5, y, 6, 1);
        ctx.fillRect(x + 3, y + 1, 10, 1);
        ctx.fillRect(x + 2, y + 2, 12, 1);
        ctx.fillRect(x + 1, y + 3, 14, 1);
        ctx.fillRect(x, y + 4, 16, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 3, y + 3, 2, 1);
        ctx.fillRect(x + 7, y + 3, 2, 1);
        ctx.fillRect(x + 11, y + 3, 2, 1);
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(x + 2, y + 6, 2, 1);
        ctx.fillRect(x + 6, y + 6, 4, 1);
        ctx.fillRect(x + 12, y + 6, 2, 1);
        break;
      }

      case 'ufo_death': {
        // Explosão da nave mistério
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 5, y + 3, w - 10, h - 6);
        break;
      }

      case 'bunker': {
        // Bunker verde clássico com arco central inferior
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x + 4, y, 14, 4);
        ctx.fillRect(x + 2, y + 4, 18, 4);
        ctx.fillRect(x, y + 8, 22, 4);
        ctx.fillRect(x, y + 12, 6, 4);
        ctx.fillRect(x + 16, y + 12, 6, 4);
        break;
      }

      case 'shot_player': {
        // Tiro reto do jogador (branco brilhante)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, h);
        break;
      }

      case 'shot_rolling':
      case 'shot_plunger':
      case 'shot_squiggly': {
        // Projéteis inimigos animados
        ctx.fillStyle = '#ffffff';
        const offset = (frameIndex % 4);
        if (key === 'shot_squiggly') {
          // Zigue-zague
          for (let i = 0; i < h; i++) {
            const sx = ((i + offset) % 2 === 0) ? 0 : 2;
            ctx.fillRect(x + sx, y + i, 1, 1);
          }
        } else if (key === 'shot_plunger') {
          // Cruz/T
          ctx.fillRect(x + 1, y, 1, h);
          ctx.fillRect(x, y + offset, 3, 1);
        } else {
          // Espigão giratório
          ctx.fillRect(x + 1, y, 1, h);
          ctx.fillRect(x, y + ((offset * 2) % h), 3, 1);
        }
        break;
      }

      case 'powerup_pierce': {
        // Cápsula Laranja (P - Perfurante)
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y + 1, 3, 6);
        ctx.fillRect(x + 5, y + 1, 2, 3);
        ctx.fillRect(x + 4, y + 3, 2, 1);
        break;
      }

      case 'powerup_rapid': {
        // Cápsula Amarela (R - Cadência rápida)
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2, y + 1, 3, 6);
        ctx.fillRect(x + 5, y + 1, 2, 3);
        ctx.fillRect(x + 5, y + 4, 2, 3);
        break;
      }

      case 'powerup_triple': {
        // Cápsula Ciano (T - Triplo)
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 1, y + 1, 6, 2);
        ctx.fillRect(x + 3, y + 3, 2, 4);
        break;
      }

      case 'powerup_laser': {
        // Cápsula Magenta (L - Super Laser)
        ctx.fillStyle = '#ff00bb';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y + 1, 2, 6);
        ctx.fillRect(x + 4, y + 5, 3, 2);
        break;
      }

      case 'boss': {
        // Chefe final: Grande nave alienígena biomecânica detalhada
        ctx.fillStyle = '#8800aa';
        ctx.fillRect(x + 12, y, 24, 4);
        ctx.fillRect(x + 6, y + 4, 36, 4);
        ctx.fillRect(x + 2, y + 8, 44, 6);
        ctx.fillRect(x, y + 14, 48, 6);
        ctx.fillRect(x + 4, y + 20, 10, 4);
        ctx.fillRect(x + 34, y + 20, 10, 4);

        // Canhões laterais e núcleo
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(x + 2, y + 18, 4, 6);
        ctx.fillRect(x + 42, y + 18, 4, 6);
        
        // Olho/núcleo central pulsante
        ctx.fillStyle = (frameIndex % 2 === 0) ? '#00ffff' : '#ffff00';
        ctx.fillRect(x + 20, y + 10, 8, 6);
        break;
      }

      case 'boss_shot': {
        // Projétil do chefe (plasma vermelho/amarelo)
        ctx.fillStyle = (frameIndex % 2 === 0) ? '#ff0033' : '#ffaa00';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        break;
      }

      default: {
        // Caixa genérica
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x, y, w, h);
        break;
      }
    }

    ctx.restore();
  }

  return {
    MANIFEST,
    init,
    isReady,
    getManifestDef,
    draw
  };
})();
