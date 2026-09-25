/**
 * audio.js - Sintetizador de áudio via Web Audio API.
 * 100% sintetizado em tempo real, sem necessidade de arquivos externos de áudio.
 * Inicia com segurança após o primeiro gesto do usuário (teclado/toque).
 * Tecla 'M' alterna o estado mudo.
 * Namespace global: window.SI.Audio
 */

window.SI = window.SI || {};

window.SI.Audio = (function() {
  let _ctx = null;
  let _masterGain = null;
  let _isMuted = false;
  let _initialized = false;

  // Frequências clássicas das 4 notas da marcha dos invasores (ref.)
  const MARCH_FREQS = [175, 156, 139, 123];
  let _marchNoteIndex = 0;

  // Som contínuo da nave mistério (UFO)
  let _ufoOsc = null;
  let _ufoGain = null;
  let _ufoInterval = null;

  function init() {
    if (_initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[SI Audio] Web Audio API não suportada pelo navegador.');
        return;
      }
      _ctx = new AudioContextClass();
      _masterGain = _ctx.createGain();
      _masterGain.gain.setValueAtTime(0.3, _ctx.currentTime);
      _masterGain.connect(_ctx.destination);
      _initialized = true;
    } catch (e) {
      console.warn('[SI Audio] Falha ao criar AudioContext:', e);
    }
  }

  function resume() {
    if (!_ctx) init();
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume().catch(e => console.warn('[SI Audio] Resume falhou:', e));
    }
  }

  function toggleMute() {
    _isMuted = !_isMuted;
    if (_masterGain && _ctx) {
      _masterGain.gain.setValueAtTime(_isMuted ? 0 : 0.3, _ctx.currentTime);
    }
    return _isMuted;
  }

  function isMuted() {
    return _isMuted;
  }

  // --- 1. Marcha dos Invasores (4 notas em loop) ---
  function playMarchStep() {
    if (!_ctx || _isMuted) return;
    try {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      const freq = MARCH_FREQS[_marchNoteIndex % MARCH_FREQS.length];
      _marchNoteIndex = (_marchNoteIndex + 1) % MARCH_FREQS.length;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, _ctx.currentTime);

      gain.gain.setValueAtTime(0.25, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(_masterGain);

      osc.start();
      osc.stop(_ctx.currentTime + 0.08);
    } catch (e) {
      // Ignora pequenos erros de contexto
    }
  }

  function resetMarch() {
    _marchNoteIndex = 0;
  }

  // --- 2. Tiro do Jogador (Chirp agudo decrescente) ---
  function playPlayerShot() {
    if (!_ctx || _isMuted) return;
    try {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, _ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, _ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(_masterGain);

      osc.start();
      osc.stop(_ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // --- 3. Explosão do Invasor (Ruído branco filtrado) ---
  function playInvaderExplosion() {
    if (!_ctx || _isMuted) return;
    try {
      const bufferSize = _ctx.sampleRate * 0.15;
      const buffer = _ctx.createBuffer(1, bufferSize, _ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = _ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = _ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, _ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, _ctx.currentTime + 0.15);

      const gain = _ctx.createGain();
      gain.gain.setValueAtTime(0.4, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + 0.15);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(_masterGain);

      whiteNoise.start();
    } catch (e) {}
  }

  // --- 4. Explosão do Jogador (Ruído longo com dente de serra) ---
  function playPlayerExplosion() {
    if (!_ctx || _isMuted) return;
    try {
      const bufferSize = _ctx.sampleRate * 0.8;
      const buffer = _ctx.createBuffer(1, bufferSize, _ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = _ctx.createBufferSource();
      noise.buffer = buffer;

      const osc = _ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, _ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, _ctx.currentTime + 0.8);

      const gain = _ctx.createGain();
      gain.gain.setValueAtTime(0.5, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + 0.8);

      noise.connect(gain);
      osc.connect(gain);
      gain.connect(_masterGain);

      noise.start();
      osc.start();
      osc.stop(_ctx.currentTime + 0.8);
    } catch (e) {}
  }

  // --- 5. Sirene do UFO (Nave Mistério) ---
  function startUfoSound() {
    if (!_ctx || _isMuted || _ufoOsc) return;
    try {
      _ufoOsc = _ctx.createOscillator();
      _ufoGain = _ctx.createGain();

      _ufoOsc.type = 'triangle';
      _ufoOsc.frequency.setValueAtTime(450, _ctx.currentTime);

      _ufoGain.gain.setValueAtTime(0.2, _ctx.currentTime);

      _ufoOsc.connect(_ufoGain);
      _ufoGain.connect(_masterGain);

      _ufoOsc.start();

      let toggle = false;
      _ufoInterval = setInterval(() => {
        if (_ufoOsc && _ctx) {
          toggle = !toggle;
          _ufoOsc.frequency.setValueAtTime(toggle ? 520 : 420, _ctx.currentTime);
        }
      }, 120);
    } catch (e) {}
  }

  function stopUfoSound() {
    if (_ufoInterval) {
      clearInterval(_ufoInterval);
      _ufoInterval = null;
    }
    if (_ufoOsc) {
      try {
        _ufoOsc.stop();
        _ufoOsc.disconnect();
      } catch (e) {}
      _ufoOsc = null;
    }
  }

  // --- 6. Coleta de Power-up (Acorde ascendente agradável) ---
  function playPowerupCollect() {
    if (!_ctx || _isMuted) return;
    try {
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = _ctx.createOscillator();
        const gain = _ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, _ctx.currentTime + idx * 0.05);

        gain.gain.setValueAtTime(0.25, _ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(_masterGain);

        osc.start(_ctx.currentTime + idx * 0.05);
        osc.stop(_ctx.currentTime + idx * 0.05 + 0.12);
      });
    } catch (e) {}
  }

  // --- 7. Super Laser (Convergência e Raio) ---
  function playLaserCharge() {
    if (!_ctx || _isMuted) return;
    try {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, _ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, _ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.4, _ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(_masterGain);

      osc.start();
      osc.stop(_ctx.currentTime + 0.35);
    } catch (e) {}
  }

  function playLaserBeamLoop() {
    if (!_ctx || _isMuted) return null;
    try {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, _ctx.currentTime);

      gain.gain.setValueAtTime(0.35, _ctx.currentTime);

      osc.connect(gain);
      gain.connect(_masterGain);

      osc.start();
      return { osc, gain };
    } catch (e) {
      return null;
    }
  }

  // --- 8. Alerta do Chefe ("WARNING!") ---
  function playBossWarning() {
    if (!_ctx || _isMuted) return;
    try {
      for (let i = 0; i < 4; i++) {
        const osc = _ctx.createOscillator();
        const gain = _ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, _ctx.currentTime + i * 0.5);
        osc.frequency.linearRampToValueAtTime(300, _ctx.currentTime + i * 0.5 + 0.4);

        gain.gain.setValueAtTime(0.3, _ctx.currentTime + i * 0.5);
        gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + i * 0.5 + 0.45);

        osc.connect(gain);
        gain.connect(_masterGain);

        osc.start(_ctx.currentTime + i * 0.5);
        osc.stop(_ctx.currentTime + i * 0.5 + 0.45);
      }
    } catch (e) {}
  }

  // --- 9. Impacto no Chefe ---
  function playBossHit() {
    if (!_ctx || _isMuted) return;
    try {
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, _ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, _ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, _ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, _ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(_masterGain);

      osc.start();
      osc.stop(_ctx.currentTime + 0.08);
    } catch (e) {}
  }

  // --- 10. Morte do Chefe (Sequência estrondosa) ---
  function playBossDefeatExplosion() {
    if (!_ctx || _isMuted) return;
    try {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          playPlayerExplosion();
        }, i * 350);
      }
    } catch (e) {}
  }

  return {
    init,
    resume,
    toggleMute,
    isMuted,
    playMarchStep,
    resetMarch,
    playPlayerShot,
    playInvaderExplosion,
    playPlayerExplosion,
    startUfoSound,
    stopUfoSound,
    playPowerupCollect,
    playLaserCharge,
    playLaserBeamLoop,
    playBossWarning,
    playBossHit,
    playBossDefeatExplosion
  };
})();
