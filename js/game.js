/**
 * game.js - Máquina de estados principal, loop em passo fixo de 60 Hz com acumulador,
 * HUD clássico, transições de ondas, acionamento do chefe e integração completa de entidades.
 * Namespace global: window.SI.Game
 */

window.SI = window.SI || {};

window.SI.Game = (function() {
  const VIDEO_CFG = SI.CONFIG.VIDEO;
  const LOOP_CFG = SI.CONFIG.LOOP;
  const STRINGS = SI.CONFIG.STRINGS;

  // Estados do Jogo
  const STATES = {
    LOADING: 'LOADING',
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PLAYER_DYING: 'PLAYER_DYING',
    WAVE_CLEAR: 'WAVE_CLEAR',
    BOSS_INTRO: 'BOSS_INTRO',
    BOSS_FIGHT: 'BOSS_FIGHT',
    BOSS_DEATH: 'BOSS_DEATH',
    VICTORY: 'VICTORY',
    GAME_OVER: 'GAME_OVER'
  };

  let _canvas = null;
  let _ctx = null;
  let _state = STATES.LOADING;
  let _isPaused = false;

  // Temporizadores do Loop Fixo
  let _lastTime = 0;
  let _accumulator = 0;
  let _frameCount = 0;
  let _fps = 60;
  let _fpsTimer = 0;

  // Entidades
  let _player = null;
  let _formation = null;
  let _shots = null;
  let _bunkers = null;
  let _ufo = null;
  let _powerups = null;
  let _laser = null;
  let _boss = null;
  let _particles = null;

  // Placar e Progresso
  let _score = 0;
  let _hiScore = 0;
  let _wave = 1;
  let _playerShotCountInWave = 0;
  let _extraLifeAwarded = false;
  let _bossTriggered = false;

  // Temporizadores de Transição de Estado
  let _stateTimer = 0;
  let _introPhase = 0; // Para sequência de entrada do chefe

  // Opções de Debug
  let _debug = false;

  function init(canvasElement) {
    _canvas = canvasElement;
    _ctx = _canvas.getContext('2d');

    // Configuração da resolução interna: grade lógica x escala (ref.)
    _canvas.width = VIDEO_CFG.LOGICAL_WIDTH * VIDEO_CFG.RENDER_SCALE;
    _canvas.height = VIDEO_CFG.LOGICAL_HEIGHT * VIDEO_CFG.RENDER_SCALE;
    _ctx.imageSmoothingEnabled = !VIDEO_CFG.PIXEL_ART;

    // Inicialização segura de hi-score via localStorage
    _hiScore = SI.Util.getStoredHiScore();

    // Instanciação das entidades
    _player = new SI.Player();
    _formation = new SI.Formation();
    _shots = new SI.Shots();
    _bunkers = new SI.Bunkers();
    _ufo = new SI.UFO();
    _powerups = new SI.Powerups();
    _laser = new SI.Laser();
    _boss = new SI.Boss();
    _particles = new SI.Util.ParticleSystem(150);

    // Parâmetros de URL (?debug=1 e ?seed=N)
    const urlParams = SI.Util.getUrlParams();
    _debug = urlParams.debug;
    if (urlParams.seed !== null) {
      SI.Util.setSeed(urlParams.seed);
    }

    // Gerenciamento de foco e pausa automática
    window.addEventListener('blur', () => {
      if (_state === STATES.PLAYING || _state === STATES.BOSS_FIGHT) {
        _isPaused = true;
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (_state === STATES.PLAYING || _state === STATES.BOSS_FIGHT)) {
        _isPaused = true;
      }
    });

    // Inicia na tela de título quando os assets estiverem prontos
    SI.Assets.init(() => {
      _state = STATES.TITLE;
    });

    _lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  // --- Loop de Jogo com Passo Fixo de 60 Hz (Acumulador) ---
  function gameLoop(currentTime) {
    let delta = currentTime - _lastTime;
    _lastTime = currentTime;

    // Proteção contra saltos bruscos caso a aba fique em segundo plano
    if (delta > 250) delta = 250;

    // Cálculo do contador de FPS para o modo debug
    _fpsTimer += delta;
    _frameCount++;
    if (_fpsTimer >= 1000) {
      _fps = _frameCount;
      _frameCount = 0;
      _fpsTimer = 0;
    }

    _accumulator += delta;
    while (_accumulator >= LOOP_CFG.TIMESTEP) {
      fixedUpdate();
      _accumulator -= LOOP_CFG.TIMESTEP;
      SI.Input.clearFrame();
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  // --- Atualização Lógica em Passo Fixo ---
  function fixedUpdate() {
    // 1. Alterna Pausa (Tecla P ou Esc)
    if (SI.Input.isJustPressed('pause')) {
      if (_state === STATES.PLAYING || _state === STATES.BOSS_FIGHT) {
        _isPaused = !_isPaused;
      }
    }

    // 2. Alterna Mudo (Tecla M)
    if (SI.Input.isJustPressed('mute')) {
      SI.Audio.toggleMute();
    }

    if (_isPaused) return;

    // 3. Atalhos do Modo Debug (?debug=1)
    if (_debug) {
      handleDebugHotkeys();
    }

    // 4. Máquina de Estados Principal
    switch (_state) {
      case STATES.TITLE:
        updateTitle();
        break;
      case STATES.PLAYING:
        updatePlaying();
        break;
      case STATES.PLAYER_DYING:
        updatePlayerDying();
        break;
      case STATES.WAVE_CLEAR:
        updateWaveClear();
        break;
      case STATES.BOSS_INTRO:
        updateBossIntro();
        break;
      case STATES.BOSS_FIGHT:
        updateBossFight();
        break;
      case STATES.BOSS_DEATH:
        updateBossDeath();
        break;
      case STATES.VICTORY:
      case STATES.GAME_OVER:
        updateEndScreens();
        break;
    }

    _particles.update();
  }

  function handleDebugHotkeys() {
    const PW = SI.CONFIG.POWERUPS.TYPES;
    if (SI.Input.isJustPressed('debugPw1')) _player.addPowerup(PW.PIERCE);
    if (SI.Input.isJustPressed('debugPw2')) _player.addPowerup(PW.RAPID);
    if (SI.Input.isJustPressed('debugPw3')) _player.addPowerup(PW.TRIPLE);
    if (SI.Input.isJustPressed('debugPw4')) _player.addPowerup(PW.LASER);
    if (SI.Input.isJustPressed('debugBoss')) {
      addScore(SI.CONFIG.BOSS.SCORE_CAP - _score);
    }
    if (SI.Input.isJustPressed('debugKill')) {
      _formation.killAll();
    }
  }

  // --- Estado: TITLE ---
  function updateTitle() {
    if (SI.Input.isJustPressed('start') || SI.Input.isDown('fire')) {
      startNewGame();
    }
  }

  function startNewGame() {
    _score = 0;
    _wave = 1;
    _playerShotCountInWave = 0;
    _extraLifeAwarded = false;
    _bossTriggered = false;
    _player.reset();
    _formation.initWave(1);
    _bunkers.reset();
    _shots.reset();
    _ufo.reset();
    _powerups.reset();
    _laser.reset();
    _boss.reset();
    _particles.clear();
    _state = STATES.PLAYING;
  }

  // --- Estado: PLAYING ---
  function updatePlaying() {
    // 1. Atualização do canhão do jogador
    const laserFiring = _laser.isFiring();
    _player.update(laserFiring);

    // 2. Disparo do Canhão (Espaço)
    if (!laserFiring && SI.Input.isDown('fire')) {
      const activeCount = _shots.getEffectivePlayerShotCount();
      if (_player.canShoot(activeCount)) {
        const isPierce = _player.powerups.pierceTimer > 0;
        const isTriple = _player.powerups.tripleTimer > 0;
        _shots.spawnPlayerShot(_player.x, _player.y, isPierce, isTriple);
        _player.registerShotFired();
        _playerShotCountInWave++;
      }
    }

    // 3. Disparo do Super Laser (X ou Seta Cima)
    if (!laserFiring && SI.Input.isJustPressed('superLaser')) {
      if (_player.consumeLaserCharge()) {
        _laser.trigger();
      }
    }

    // 4. Atualização do Super Laser
    _laser.update(_player.x, _player.y, _formation, _ufo, _shots, _boss, _particles);

    // 5. Atualização da formação de invasores (movimento 1:1)
    _formation.update(_bunkers);

    // 6. Atualização dos disparos inimigos
    _shots.updateEnemyFiring(_score, _formation, _player.x);
    _shots.update(_particles);

    // 7. Atualização do UFO (Nave mistério)
    _ufo.update(_formation.getLivingCount());

    // 8. Atualização das cápsulas de power-ups
    _powerups.update();
    _powerups.checkPlayerCollection(_player);

    // 9. Processamento de Colisões
    handleCollisions();

    // 10. Verifica invasão da linha do canhão (Game Over imediato mesmo com vidas) (ref.)
    if (_formation.hasReachedCannonLine(SI.CONFIG.PLAYER.CANNON_Y)) {
      _player.kill();
      _state = STATES.GAME_OVER;
      _stateTimer = 180;
      return;
    }

    // 11. Verifica se a onda foi concluída
    if (_formation.getLivingCount() === 0) {
      _state = STATES.WAVE_CLEAR;
      _stateTimer = 90; // ~1.5s de pausa entre ondas (ref.)
    }
  }

  // --- Processamento de Colisões no Estado PLAYING ---
  function handleCollisions() {
    const pShots = _shots.playerShots;
    const eShots = _shots.enemyShots;

    // Colisão dos tiros com os abrigos (bunkers)
    _bunkers.checkPlayerShots(pShots, _particles);
    _bunkers.checkEnemyShots(eShots, _particles);

    // Colisão dos tiros do jogador com invasores comuns
    for (let i = pShots.length - 1; i >= 0; i--) {
      const s = pShots[i];
      for (let j = _formation.livingInvaders.length - 1; j >= 0; j--) {
        const inv = _formation.livingInvaders[j];
        if (SI.Util.checkAABB(s, inv)) {
          if (!s.isPierce || !s.hitIds.has(inv)) {
            if (s.isPierce) s.hitIds.add(inv);

            _formation.killInvader(inv);
            addScore(inv.points);

            // Tenta dropar power-up (4% de chance)
            _powerups.tryDropFromInvader(inv.x + inv.width / 2, inv.y + inv.height);

            if (!s.isPierce) {
              pShots.splice(i, 1);
              _shots.playerShotPool.release(s);
              break;
            }
          }
        }
      }
    }

    // Colisão dos tiros do jogador com o UFO
    if (_ufo.active) {
      for (let i = pShots.length - 1; i >= 0; i--) {
        const s = pShots[i];
        if (SI.Util.checkAABB(s, _ufo)) {
          const pts = _ufo.hit(_playerShotCountInWave);
          addScore(pts);

          // Destruir o UFO SEMPRE solta uma cápsula de power-up (ref.)
          _powerups.dropFromUFO(_ufo.pointsX + _ufo.width / 2, _ufo.pointsY + _ufo.height);

          if (!s.isPierce) {
            pShots.splice(i, 1);
            _shots.playerShotPool.release(s);
          }
          break;
        }
      }
    }

    // Colisão dos tiros inimigos com o canhão do jogador
    for (let i = eShots.length - 1; i >= 0; i--) {
      const s = eShots[i];
      if (SI.Util.checkAABB(s, _player)) {
        eShots.splice(i, 1);
        _shots.enemyShotPool.release(s);

        if (_player.hit()) {
          _laser.stop();
          _state = STATES.PLAYER_DYING;
          _stateTimer = SI.CONFIG.PLAYER.RESPAWN_DELAY_FRAMES;
          break;
        }
      }
    }
  }

  // --- Estado: PLAYER_DYING ---
  function updatePlayerDying() {
    _player.update(false);
    _stateTimer--;
    if (_stateTimer <= 0) {
      if (_player.lives > 0) {
        _player.respawn(_boss.active);
        _state = _boss.active ? STATES.BOSS_FIGHT : STATES.PLAYING;
      } else {
        _state = STATES.GAME_OVER;
        _stateTimer = 180;
      }
    }
  }

  // --- Estado: WAVE_CLEAR ---
  function updateWaveClear() {
    _stateTimer--;
    if (_stateTimer <= 0) {
      _wave++;
      _playerShotCountInWave = 0;
      _formation.initWave(_wave);
      _bunkers.reset(); // Bunkers restaurados a cada onda (ref.)
      _shots.reset();
      _state = STATES.PLAYING;
    }
  }

  // --- Transição para o Chefe Final aos 67.000 pontos ---
  function triggerBossSequence() {
    _bossTriggered = true;
    _state = STATES.BOSS_INTRO;
    _introPhase = 0;
    _stateTimer = SI.CONFIG.BOSS.INTRO_FREEZE_FRAMES; // 0.5s de congelamento (ref.)
    _laser.stop();
  }

  function updateBossIntro() {
    _stateTimer--;
    if (_stateTimer <= 0) {
      if (_introPhase === 0) {
        // Fase 1: Invasores, UFO, tiros e cápsulas explodem em cadeia (sem pontos) (ref.)
        _introPhase = 1;
        _stateTimer = 30;
        _formation.killAll();
        _ufo.reset();
        _shots.reset();
        _powerups.reset();
        _bunkers.reset(); // Bunkers restaurados para a luta final (ref.)
        SI.Audio.playPlayerExplosion();
      } else if (_introPhase === 1) {
        // Fase 2: Alerta "WARNING!" na tela por 2.0s (ref.)
        _introPhase = 2;
        _stateTimer = SI.CONFIG.BOSS.WARNING_FRAMES;
        SI.Audio.playBossWarning();
      } else if (_introPhase === 2) {
        // Fase 3: Chefe desce do topo da tela
        _introPhase = 3;
        _state = STATES.BOSS_FIGHT;
        _boss.startIntro();
      }
    }
  }

  // --- Estado: BOSS_FIGHT ---
  function updateBossFight() {
    const laserFiring = _laser.isFiring();
    _player.update(laserFiring);

    // Disparos do jogador
    if (!laserFiring && SI.Input.isDown('fire')) {
      const activeCount = _shots.getEffectivePlayerShotCount();
      if (_player.canShoot(activeCount)) {
        const isPierce = _player.powerups.pierceTimer > 0;
        const isTriple = _player.powerups.tripleTimer > 0;
        _shots.spawnPlayerShot(_player.x, _player.y, isPierce, isTriple);
        _player.registerShotFired();
      }
    }

    // Super Laser
    if (!laserFiring && SI.Input.isJustPressed('superLaser')) {
      if (_player.consumeLaserCharge()) {
        _laser.trigger();
      }
    }

    _laser.update(_player.x, _player.y, null, null, _shots, _boss, _particles);
    _boss.update(_player.x, _player.y, _bunkers, _shots, _powerups, _particles);
    _shots.update(_particles);
    _powerups.update();
    _powerups.checkPlayerCollection(_player);

    // Colisões do combate com o chefe
    handleBossCollisions();

    // Verifica derrota do chefe
    if (_boss.defeated && _boss.deathTimer >= SI.CONFIG.BOSS.DEATH_EXPLOSION_FRAMES) {
      _state = STATES.VICTORY;
      _stateTimer = 180;
    }
  }

  function handleBossCollisions() {
    const pShots = _shots.playerShots;

    // Colisão dos tiros do jogador com os abrigos
    _bunkers.checkPlayerShots(pShots, _particles);

    // Colisão dos tiros do jogador com o chefe e mini-invasores
    for (let i = pShots.length - 1; i >= 0; i--) {
      const s = pShots[i];
      if (_boss.checkHitByPlayerShot(s, _particles)) {
        // No chefe, o tiro perfurante causa dano e é consumido (ref.)
        pShots.splice(i, 1);
        _shots.playerShotPool.release(s);
      }
    }

    // Colisão dos projéteis do chefe com abrigos
    for (let i = _boss.bossShots.length - 1; i >= 0; i--) {
      const bs = _boss.bossShots[i];
      for (const b of _bunkers.bunkers) {
        if (b.checkShotCollision(bs, 3)) {
          _particles.emit(bs.x, bs.y, 4, '#ff0055', 1.0, 10, 1);
          _boss.bossShots.splice(i, 1);
          break;
        }
      }
    }

    // Colisão dos projéteis do chefe com o jogador
    for (let i = _boss.bossShots.length - 1; i >= 0; i--) {
      const bs = _boss.bossShots[i];
      if (SI.Util.checkAABB(bs, _player)) {
        _boss.bossShots.splice(i, 1);
        if (_player.hit()) {
          _laser.stop();
          _state = STATES.PLAYER_DYING;
          _stateTimer = SI.CONFIG.PLAYER.RESPAWN_DELAY_FRAMES;
          break;
        }
      }
    }

    // Colisão do Raio Vertical Fatal (Ataque C) com o jogador
    if (_boss.currentAttack === 'beam' && _boss.attackPhase === 'execute' && _boss.telegraphData) {
      const bW = _boss.telegraphData.beamWidth;
      const b1 = { x: _boss.telegraphData.col1 - bW / 2, y: 0, width: bW, height: SI.CONFIG.PLAYER.GROUND_Y };
      if (SI.Util.checkAABB(b1, _player)) {
        if (_player.hit()) {
          _laser.stop();
          _state = STATES.PLAYER_DYING;
          _stateTimer = SI.CONFIG.PLAYER.RESPAWN_DELAY_FRAMES;
          return;
        }
      }
      if (_boss.telegraphData.col2 !== null) {
        const b2 = { x: _boss.telegraphData.col2 - bW / 2, y: 0, width: bW, height: SI.CONFIG.PLAYER.GROUND_Y };
        if (SI.Util.checkAABB(b2, _player)) {
          if (_player.hit()) {
            _laser.stop();
            _state = STATES.PLAYER_DYING;
            _stateTimer = SI.CONFIG.PLAYER.RESPAWN_DELAY_FRAMES;
          }
        }
      }
    }

    // Mini-invasores alcançando a linha do canhão explodem e tiram 1 vida (ref.)
    for (let i = _boss.miniInvaders.length - 1; i >= 0; i--) {
      const m = _boss.miniInvaders[i];
      if (m.alive && m.y + m.height >= SI.CONFIG.PLAYER.CANNON_Y) {
        m.alive = false;
        m.explodingTimer = 12;
        _particles.emit(m.x + m.width / 2, m.y + m.height / 2, 10, '#ff0055', 2.0, 15, 1);
        if (_player.hit()) {
          _laser.stop();
          _state = STATES.PLAYER_DYING;
          _stateTimer = SI.CONFIG.PLAYER.RESPAWN_DELAY_FRAMES;
          break;
        }
      }
    }
  }

  // --- Estado: BOSS_DEATH & Telas Finais ---
  function updateBossDeath() {
    _boss.update(_player.x, _player.y, _bunkers, _shots, _powerups, _particles);
  }

  function updateEndScreens() {
    if (SI.Input.isJustPressed('start') || SI.Input.isDown('fire')) {
      _state = STATES.TITLE;
    }
  }

  // --- Adição de Pontos e Checagem do Teto de 67.000 (SCORE_CAP) ---
  function addScore(points) {
    if (points <= 0) return;

    _score += points;

    // Vida extra única em 1.500 pontos (ref.)
    if (!_extraLifeAwarded && _score >= SI.CONFIG.PLAYER.EXTRA_LIFE_SCORE) {
      _extraLifeAwarded = true;
      _player.lives++;
      SI.Audio.playPowerupCollect();
    }

    // Teto estrito da pontuação em 67.000 pontos (ref.)
    if (_score >= SI.CONFIG.BOSS.SCORE_CAP) {
      _score = SI.CONFIG.BOSS.SCORE_CAP;
      if (SI.CONFIG.FEATURES.boss && !_bossTriggered) {
        triggerBossSequence();
      }
    }

    // Atualização e persistência de HI-SCORE
    if (_score > _hiScore) {
      _hiScore = _score;
      SI.Util.setStoredHiScore(_hiScore);
    }
  }

  // --- Renderização Completa na Grade Lógica (224 x 256) ---
  function render() {
    const ctx = _ctx;
    ctx.save();

    // Aplica o fator de escala interna
    ctx.scale(VIDEO_CFG.RENDER_SCALE, VIDEO_CFG.RENDER_SCALE);

    // Efeito de tremor de tela (screen shake do laser)
    if (_laser.screenShake !== 0) {
      ctx.translate(0, _laser.screenShake);
    }

    // Fundo preto absoluto do arcade (ref.)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VIDEO_CFG.LOGICAL_WIDTH, VIDEO_CFG.LOGICAL_HEIGHT);

    // Renderização conforme o estado atual
    if (_state === STATES.TITLE) {
      renderTitle(ctx);
    } else {
      renderGamePlay(ctx);
    }

    // Se pausado, desenha sobreposição
    if (_isPaused) {
      renderPauseOverlay(ctx);
    }

    // Indicador e estatísticas do modo debug
    if (_debug) {
      renderDebugInfo(ctx);
    }

    ctx.restore();
  }

  function renderTitle(ctx) {
    renderScoreHeader(ctx);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(STRINGS.GAME_TITLE, 112, 60);

    ctx.font = '6px monospace';
    ctx.fillText(STRINGS.POINTS_TABLE_TITLE, 112, 85);

    // Desenho dos invasores e tabela de pontuação
    SI.Assets.draw(ctx, 'ufo', 72, 100, 0, 16, 8);
    ctx.textAlign = 'left';
    ctx.fillText(STRINGS.POINTS_UFO, 96, 106);

    SI.Assets.draw(ctx, 'invader_small', 74, 116, 0, 8, 8);
    ctx.fillText(STRINGS.POINTS_SMALL, 96, 122);

    SI.Assets.draw(ctx, 'invader_medium', 73, 132, 0, 11, 8);
    ctx.fillText(STRINGS.POINTS_MEDIUM, 96, 138);

    SI.Assets.draw(ctx, 'invader_large', 72, 148, 0, 12, 8);
    ctx.fillText(STRINGS.POINTS_LARGE, 96, 154);

    ctx.textAlign = 'center';
    ctx.fillText(STRINGS.CREDITS, 112, 185);

    // Texto de início piscante
    if (Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.fillStyle = '#00ff00';
      ctx.fillText(STRINGS.PUSH_ENTER, 112, 215);
    }
  }

  function renderGamePlay(ctx) {
    // 1. Cabeçalho de Pontuação
    renderScoreHeader(ctx);

    // 2. Bunkers (Abrigos corroídos em nível de pixel)
    _bunkers.render(ctx);

    // 3. Formação de Invasores ou Chefe Final
    if (_state === STATES.BOSS_FIGHT || _state === STATES.BOSS_DEATH) {
      _boss.render(ctx);
    } else {
      _formation.render(ctx);
    }

    // 4. Nave Mistério (UFO)
    _ufo.render(ctx);

    // 5. Projéteis do Jogador e dos Inimigos
    _shots.render(ctx);

    // 6. Cápsulas de Power-ups caindo
    _powerups.render(ctx);

    // 7. Canhão do Jogador
    _player.render(ctx);

    // 8. Super Laser Convergente
    _laser.render(ctx, _player.x, _player.y);

    // 9. Sistema de Partículas
    _particles.render(ctx);

    // 10. Linha verde do chão e Rodapé de Vidas (arcade ref.)
    renderFooter(ctx);

    // 11. Telas de Aviso, Vitória ou Game Over
    if (_state === STATES.BOSS_INTRO && _introPhase === 2) {
      ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff0000' : '#ffff00';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(STRINGS.WARNING, 112, 120);
    } else if (_state === STATES.VICTORY) {
      renderVictoryScreen(ctx);
    } else if (_state === STATES.GAME_OVER) {
      renderGameOverScreen(ctx);
    }
  }

  function renderScoreHeader(ctx) {
    ctx.font = '6px monospace';
    ctx.fillStyle = '#ffffff';

    // SCORE<1>
    ctx.textAlign = 'left';
    ctx.fillText(STRINGS.SCORE_HEADER, 16, 12);
    ctx.fillText(String(_score).padStart(4, '0'), 16, 22);

    // HI-SCORE
    ctx.textAlign = 'center';
    ctx.fillText(STRINGS.HI_SCORE_HEADER, 112, 12);
    ctx.fillText(String(_hiScore).padStart(4, '0'), 112, 22);

    // SCORE<2>
    ctx.textAlign = 'right';
    ctx.fillText(STRINGS.SCORE_2_HEADER, 208, 12);
    ctx.fillText('0000', 208, 22);
  }

  function renderFooter(ctx) {
    const groundY = SI.CONFIG.PLAYER.GROUND_Y;

    // Linha verde do chão de 1 px de espessura (ref.)
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, groundY, VIDEO_CFG.LOGICAL_WIDTH, 1);

    // Quantidade de vidas em dígitos e ícones do canhão
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(_player.lives), 8, groundY + 9);

    for (let i = 0; i < Math.min(5, _player.lives - 1); i++) {
      SI.Assets.draw(ctx, 'player', 18 + i * 16, groundY + 2, 0, 13, 8);
    }

    // Indicadores visuais dos Power-ups no HUD
    renderPowerupHud(ctx, groundY);
  }

  function renderPowerupHud(ctx, groundY) {
    let hudX = 110;
    const pw = _player.powerups;
    const dur = SI.CONFIG.POWERUPS.DURATION_FRAMES;
    const blinkFrames = SI.CONFIG.POWERUPS.BLINK_START_FRAMES;

    // Ícone e barra de tiros perfurantes
    if (pw.pierceTimer > 0) {
      const blink = (pw.pierceTimer <= blinkFrames && Math.floor(pw.pierceTimer / 6) % 2 === 0);
      if (!blink) {
        SI.Assets.draw(ctx, 'powerup_pierce', hudX, groundY + 2, 0, 7, 7);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(hudX, groundY + 10, (pw.pierceTimer / dur) * 12, 1.5);
      }
      hudX += 18;
    }

    // Ícone e barra de cadência rápida
    if (pw.rapidTimer > 0) {
      const blink = (pw.rapidTimer <= blinkFrames && Math.floor(pw.rapidTimer / 6) % 2 === 0);
      if (!blink) {
        SI.Assets.draw(ctx, 'powerup_rapid', hudX, groundY + 2, 0, 7, 7);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(hudX, groundY + 10, (pw.rapidTimer / dur) * 12, 1.5);
      }
      hudX += 18;
    }

    // Ícone e barra de disparo triplo
    if (pw.tripleTimer > 0) {
      const blink = (pw.tripleTimer <= blinkFrames && Math.floor(pw.tripleTimer / 6) % 2 === 0);
      if (!blink) {
        SI.Assets.draw(ctx, 'powerup_triple', hudX, groundY + 2, 0, 7, 7);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(hudX, groundY + 10, (pw.tripleTimer / dur) * 12, 1.5);
      }
      hudX += 18;
    }

    // Ícone da carga do Super Laser
    if (pw.laserCharge > 0) {
      SI.Assets.draw(ctx, 'powerup_laser', hudX, groundY + 2, 0, 7, 7);
      ctx.fillStyle = '#ff00bb';
      ctx.font = '5px monospace';
      ctx.fillText('[X]', hudX + 9, groundY + 8);
    }
  }

  function renderPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, VIDEO_CFG.LOGICAL_WIDTH, VIDEO_CFG.LOGICAL_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(STRINGS.PAUSED, 112, 128);
  }

  function renderVictoryScreen(ctx) {
    ctx.fillStyle = '#00ff00';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(STRINGS.VICTORY, 112, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.fillText(`PONTUAÇÃO FINAL: ${_score}`, 112, 120);
    ctx.fillText(`HI-SCORE: ${_hiScore}`, 112, 132);

    if (Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.fillText(STRINGS.PUSH_ENTER, 112, 160);
    }
  }

  function renderGameOverScreen(ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(STRINGS.GAME_OVER, 112, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    if (Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.fillText(STRINGS.PUSH_ENTER, 112, 150);
    }
  }

  function renderDebugInfo(ctx) {
    ctx.save();

    // 1. Bounding Boxes de Colisão em Cores
    ctx.lineWidth = 0.5;

    // Jogador (Verde)
    ctx.strokeStyle = '#00ff00';
    ctx.strokeRect(_player.x, _player.y, _player.width, _player.height);

    // Tiros do Jogador (Ciano)
    ctx.strokeStyle = '#00ffff';
    for (const s of _shots.playerShots) {
      ctx.strokeRect(s.x, s.y, s.width, s.height);
    }

    // Tiros Inimigos (Vermelho)
    ctx.strokeStyle = '#ff0000';
    for (const s of _shots.enemyShots) {
      ctx.strokeRect(s.x, s.y, s.width, s.height);
    }

    // Invasores (Amarelo)
    ctx.strokeStyle = '#ffff00';
    for (const inv of _formation.livingInvaders) {
      ctx.strokeRect(inv.x, inv.y, inv.width, inv.height);
    }

    // UFO (Magenta)
    if (_ufo.active) {
      ctx.strokeStyle = '#ff00ff';
      ctx.strokeRect(_ufo.x, _ufo.y, _ufo.width, _ufo.height);
    }

    // Bunkers (Branco)
    ctx.strokeStyle = '#ffffff';
    for (const b of _bunkers.bunkers) {
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    }

    // Chefe e seus mini-invasores
    if (_boss.active) {
      ctx.strokeStyle = '#ff0055';
      ctx.strokeRect(_boss.x, _boss.y, _boss.width, _boss.height);
      for (const m of _boss.miniInvaders) {
        if (m.alive) ctx.strokeRect(m.x, m.y, m.width, m.height);
      }
    }

    // 2. HUD Informativo de Depuração
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(2, 26, 100, 36);

    ctx.fillStyle = '#00ff00';
    ctx.font = '5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${STRINGS.DEBUG_MODE} FPS:${_fps}`, 4, 32);
    ctx.fillText(`STATE: ${_state}`, 4, 38);
    const st = _powerups.stats;
    ctx.fillText(`DROPS T:${st.total} P:${st.pierce} R:${st.rapid}`, 4, 44);
    ctx.fillText(`       3:${st.triple} L:${st.laser}`, 4, 50);
    ctx.fillText(`[1-4]:PW [B]:BOSS [K]:KILL`, 4, 58);

    ctx.restore();
  }

  return {
    init,
    STATES
  };
})();
