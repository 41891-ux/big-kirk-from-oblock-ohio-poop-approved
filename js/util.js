/**
 * util.js - Utilitários matemáticos, gerador pseudoaleatório com semente,
 * detecção de colisões AABB, pooling de objetos e persistência segura.
 * Namespace global: window.SI.Util
 */

window.SI = window.SI || {};

window.SI.Util = (function() {
  // --- Gerador Pseudoaleatório (Mulberry32) com Suporte a Semente ---
  let _seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;

  function setSeed(newSeed) {
    _seed = (Number(newSeed) >>> 0) || 123456789;
  }

  function random() {
    // DECISÃO: Uso do algoritmo Mulberry32 por ser rápido, uniforme e determinístico em 32-bit
    let t = (_seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function randomRange(min, max) {
    return min + random() * (max - min);
  }

  function randomChoice(array) {
    if (!array || array.length === 0) return null;
    const index = Math.floor(random() * array.length);
    return array[index];
  }

  // --- Colisão AABB (Axis-Aligned Bounding Box) ---
  function checkAABB(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // --- Funções Matemáticas Úteis ---
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // --- Pooling de Objetos para Desempenho sem Garbage Collection no Loop Quente ---
  class ObjectPool {
    constructor(factoryFn, resetFn, initialCapacity = 20) {
      this.factoryFn = factoryFn;
      this.resetFn = resetFn;
      this.pool = [];
      for (let i = 0; i < initialCapacity; i++) {
        this.pool.push(this.factoryFn());
      }
    }

    obtain() {
      if (this.pool.length > 0) {
        return this.pool.pop();
      }
      return this.factoryFn();
    }

    release(item) {
      if (this.resetFn) {
        this.resetFn(item);
      }
      this.pool.push(item);
    }
  }

  // --- Sistema de Partículas Pré-alocado ---
  class ParticleSystem {
    constructor(maxParticles = 120) {
      this.particles = [];
      this.pool = new ObjectPool(
        () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#ffffff', size: 1, active: false }),
        (p) => { p.active = false; },
        maxParticles
      );
    }

    emit(x, y, count = 8, color = '#ffffff', speed = 1.5, maxLife = 20, size = 1) {
      for (let i = 0; i < count; i++) {
        const p = this.pool.obtain();
        const angle = random() * Math.PI * 2;
        const spd = (0.3 + random() * 0.7) * speed;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.color = color;
        p.size = size;
        p.active = true;
        this.particles.push(p);
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          this.pool.release(p);
        }
      }
    }

    render(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }

    clear() {
      for (let i = 0; i < this.particles.length; i++) {
        this.pool.release(this.particles[i]);
      }
      this.particles.length = 0;
    }
  }

  // --- Persistência Segura (localStorage dentro de try/catch) ---
  function getStoredHiScore() {
    try {
      const saved = localStorage.getItem('SI_HI_SCORE');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      console.warn('[SI Util] Falha ao ler localStorage:', e);
      return 0;
    }
  }

  function setStoredHiScore(score) {
    try {
      localStorage.setItem('SI_HI_SCORE', String(score));
    } catch (e) {
      console.warn('[SI Util] Falha ao gravar localStorage:', e);
    }
  }

  // --- Leitura Segura de Parâmetros de URL ---
  function getUrlParams() {
    const params = { debug: false, seed: null };
    try {
      const search = window.location.search;
      if (search) {
        const urlParams = new URLSearchParams(search);
        params.debug = urlParams.get('debug') === '1';
        const s = urlParams.get('seed');
        if (s !== null) params.seed = parseInt(s, 10);
      }
    } catch (e) {
      console.warn('[SI Util] Falha ao ler URLSearchParams:', e);
    }
    return params;
  }

  return {
    setSeed,
    random,
    randomRange,
    randomChoice,
    checkAABB,
    clamp,
    degToRad,
    ObjectPool,
    ParticleSystem,
    getStoredHiScore,
    setStoredHiScore,
    getUrlParams
  };
})();
