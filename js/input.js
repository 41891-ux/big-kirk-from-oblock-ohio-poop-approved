/**
 * input.js - Gerenciamento de entradas de teclado e toque.
 * Previne rolagem padrão do navegador nas teclas direcionais e espaço.
 * Desbloqueia o Web Audio na primeira interação.
 * Namespace global: window.SI.Input
 */

window.SI = window.SI || {};

window.SI.Input = (function() {
  const _keysDown = {};
  const _justPressed = {};

  // Estado lógico das ações
  const _state = {
    left: false,
    right: false,
    fire: false,
    superLaser: false,
    pause: false,
    mute: false,
    start: false,
    // Atalhos de Debug
    debugPw1: false,
    debugPw2: false,
    debugPw3: false,
    debugPw4: false,
    debugBoss: false,
    debugKill: false
  };

  function init() {
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });

    // Configura botões de toque opcionais caso estejam no DOM
    setupTouchButton('btn-left', 'left');
    setupTouchButton('btn-right', 'right');
    setupTouchButton('btn-fire', 'fire');
    setupTouchButton('btn-special', 'superLaser');
  }

  function setupTouchButton(id, actionName) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const startAction = (e) => {
      e.preventDefault();
      SI.Audio.resume();
      _state[actionName] = true;
      _justPressed[actionName] = true;
    };

    const endAction = (e) => {
      e.preventDefault();
      _state[actionName] = false;
    };

    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', endAction, { passive: false });
    btn.addEventListener('touchcancel', endAction, { passive: false });
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', endAction);
    btn.addEventListener('mouseleave', endAction);
  }

  function onKeyDown(e) {
    SI.Audio.resume();

    // Previne comportamento padrão do navegador para teclas do jogo
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    const code = e.code;
    const key = e.key;

    if (!_keysDown[code]) {
      _justPressed[code] = true;
    }
    _keysDown[code] = true;

    // Mapeamento direto de ações
    updateStateFromKey(code, key, true);
  }

  function onKeyUp(e) {
    const code = e.code;
    const key = e.key;
    _keysDown[code] = false;
    updateStateFromKey(code, key, false);
  }

  function updateStateFromKey(code, key, isDown) {
    const CONFIG = SI.CONFIG;
    if (!CONFIG) return;

    if (CONFIG.KEYS.LEFT.includes(code) || CONFIG.KEYS.LEFT.includes(key)) {
      _state.left = isDown;
    }
    if (CONFIG.KEYS.RIGHT.includes(code) || CONFIG.KEYS.RIGHT.includes(key)) {
      _state.right = isDown;
    }
    if (CONFIG.KEYS.FIRE.includes(code) || CONFIG.KEYS.FIRE.includes(key)) {
      _state.fire = isDown;
    }
    if (CONFIG.KEYS.SUPER.includes(code) || CONFIG.KEYS.SUPER.includes(key)) {
      _state.superLaser = isDown;
    }
    if (CONFIG.KEYS.START.includes(code) || CONFIG.KEYS.START.includes(key)) {
      _state.start = isDown;
    }

    // Ações de pulso único (just pressed)
    if (isDown) {
      if (CONFIG.KEYS.PAUSE.includes(code) || CONFIG.KEYS.PAUSE.includes(key)) {
        _justPressed['pause'] = true;
      }
      if (CONFIG.KEYS.MUTE.includes(code) || CONFIG.KEYS.MUTE.includes(key)) {
        _justPressed['mute'] = true;
      }
      if (code === CONFIG.KEYS.DEBUG_PW_PIERCE) _justPressed['debugPw1'] = true;
      if (code === CONFIG.KEYS.DEBUG_PW_RAPID)  _justPressed['debugPw2'] = true;
      if (code === CONFIG.KEYS.DEBUG_PW_TRIPLE) _justPressed['debugPw3'] = true;
      if (code === CONFIG.KEYS.DEBUG_PW_LASER)  _justPressed['debugPw4'] = true;
      if (code === CONFIG.KEYS.DEBUG_BOSS_JUMP) _justPressed['debugBoss'] = true;
      if (code === CONFIG.KEYS.DEBUG_KILL_ALL)  _justPressed['debugKill'] = true;
    }
  }

  // Verifica se a tecla/ação está atualmente mantida pressionada
  function isDown(action) {
    return !!_state[action];
  }

  // Verifica se a ação acabou de ser disparada (consome o evento)
  function isJustPressed(action) {
    if (_justPressed[action]) {
      _justPressed[action] = false;
      return true;
    }
    return false;
  }

  // Limpa os estados de borda ao final de cada frame lógico
  function clearFrame() {
    for (const k in _justPressed) {
      _justPressed[k] = false;
    }
  }

  return {
    init,
    isDown,
    isJustPressed,
    clearFrame
  };
})();
