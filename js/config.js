/**
 * config.js - Todas as constantes de balanceamento, regras do arcade e configurações.
 * Namespace global: window.SI
 */

window.SI = window.SI || {};

window.SI.CONFIG = {
  // --- Vídeo e Resolução ---
  VIDEO: {
    LOGICAL_WIDTH: 224,      // Grade lógica do arcade original (ref.)
    LOGICAL_HEIGHT: 256,     // Grade lógica do arcade original (ref.)
    RENDER_SCALE: 4,         // Fator de escala interna (896x1024)
    PIXEL_ART: true          // true = pixel art sem suavização; false = texturas HD suavizadas
  },

  // --- Loop de Jogo ---
  LOOP: {
    TARGET_FPS: 60,
    TIMESTEP: 1000 / 60      // Passo fixo de 60 Hz (16.666ms)
  },

  // --- Chaves dos Recursos (Diferenciais) ---
  FEATURES: {
    powerups: true,          // Habilita power-ups coletáveis
    boss: true               // Habilita o chefe final ao atingir SCORE_CAP
  },

  // --- Jogador (Canhão) ---
  PLAYER: {
    SPEED: 1.0,              // ~1 px por frame (ref.)
    INITIAL_LIVES: 3,        // 3 vidas iniciais (ref.)
    EXTRA_LIFE_SCORE: 1500,  // Vida extra única em 1.500 pontos (ref.)
    WIDTH: 13,               // Largura lógica do canhão (ref.)
    HEIGHT: 8,               // Altura lógica do canhão (ref.)
    START_X: 30,             // Posição X inicial
    START_Y: 216,            // Posição Y inicial (linha acima do chão)
    GROUND_Y: 240,           // Linha verde do chão (ref.)
    MIN_X: 10,               // Limite esquerdo de deslocamento
    MAX_X: 201,              // Limite direito de deslocamento (224 - 13 - 10)
    RESPAWN_DELAY_FRAMES: 90 // Congelamento de ~1.5s (90 frames) ao morrer
  },

  // --- Disparo do Jogador ---
  PLAYER_SHOT: {
    SPEED: 4.0,              // ~4 px por frame subindo (ref.)
    WIDTH: 1,                // Largura do tiro comum
    HEIGHT: 4,               // Altura do tiro comum
    MAX_NORMAL: 1,           // Apenas UM tiro simultâneo por padrão (ref.)
    BURST_Y_TOP: 36          // Altura onde o tiro explode no teto caso não atinja nada
  },

  // --- Formação de Invasores ---
  FORMATION: {
    ROWS: 5,                 // 5 linhas (ref.)
    COLS: 11,                // 11 colunas (ref.)
    TOTAL_INVADERS: 55,      // 55 invasores no total (ref.)
    SPACING_X: 16,           // Espaçamento horizontal entre centros/origens (ref.)
    SPACING_Y: 16,           // Espaçamento vertical entre linhas (ref.)
    STEP_X: 2,               // Passo horizontal de 2 px por movimento (ref.)
    STEP_Y: 8,               // Descida de 8 px ao tocar a borda (ref.)
    MARGIN_LEFT: 8,          // Margem esquerda para inverter sentido (ref.)
    MARGIN_RIGHT: 208,       // Margem direita para inverter sentido (224 - 16)
    START_X: 24,             // Posição X da primeira coluna na onda 1
    // Ciclo de 8 posições iniciais de Y para cada onda subsequente (ref.)
    WAVE_START_Y_CYCLE: [64, 72, 80, 88, 96, 104, 112, 120],
    POINTS: {
      ROW_TOP: 30,           // Invasor pequeno (linha 0) = 30 pts (ref.)
      ROW_MID: 20,           // Invasor médio (linhas 1 e 2) = 20 pts (ref.)
      ROW_BOT: 10            // Invasor grande (linhas 3 e 4) = 10 pts (ref.)
    },
    EXPLOSION_FRAMES: 15     // Tempo da animação de explosão do invasor (~0.25s)
  },

  // --- Tiros Inimigos ---
  ENEMY_SHOTS: {
    MAX_CONCURRENT: 3,       // No máx. 3 simultâneos (1 por tipo) (ref.)
    SPEED: 1.25,             // Velocidade de descida dos tiros inimigos
    WIDTH: 3,                // Largura do projétil
    HEIGHT: 7,               // Altura do projétil
    ANIM_FRAMES: 4,          // Animação de 4 quadros (ref.)
    // Intervalo de recarga (frames) conforme faixas de pontuação (ref.)
    RELOAD_TIERS: [
      { scoreMax: 200, interval: 60 },
      { scoreMax: 1000, interval: 48 },
      { scoreMax: 2000, interval: 36 },
      { scoreMax: 3000, interval: 28 },
      { scoreMax: Infinity, interval: 22 }
    ]
  },

  // --- Bunkers (Abrigos) ---
  BUNKERS: {
    COUNT: 4,                // 4 abrigos (ref.)
    WIDTH: 22,               // Largura do abrigo (ref.)
    HEIGHT: 16,              // Altura do abrigo (ref.)
    Y: 192,                  // Posição Y dos abrigos (ref.)
    X_POSITIONS: [32, 76, 120, 164], // Posições X uniformemente distribuídas
    EROSION_RADIUS_PLAYER: 3,
    EROSION_RADIUS_ENEMY: 3,
    EROSION_RADIUS_INVADER: 4
  },

  // --- UFO (Nave Mistério) ---
  UFO: {
    SPAWN_INTERVAL_FRAMES: 25 * 60, // A cada ~25s (1500 frames) (ref.)
    MIN_INVADERS_ALIVE: 8,          // Só surge com 8 ou mais invasores vivos (ref.)
    Y: 42,                          // Altitude de cruzamento
    WIDTH: 16,
    HEIGHT: 8,
    SPEED: 1.0,
    POINTS_TABLE: [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100, 50],
    SCORE_DISPLAY_FRAMES: 45        // Exibir pontuação no local da explosão (~0.75s)
  },

  // --- Power-Ups (Diferencial 1) ---
  POWERUPS: {
    DROP_CHANCE: 0.04,              // 4% de chance em cada invasor destruído (ref.)
    DROP_COOLDOWN_FRAMES: 10 * 60,  // Cooldown mínimo de 10s entre drops (ref.)
    MAX_ON_SCREEN: 1,               // No máx. 1 cápsula na tela por vez (ref.)
    FALL_SPEED: 0.75,               // Cai reta e devagar
    DURATION_FRAMES: 10 * 60,       // Duração dos temporizados = 10s (ref.)
    BLINK_START_FRAMES: 2 * 60,     // Pisca nos últimos 2s (ref.)
    WIDTH: 8,
    HEIGHT: 8,
    TYPES: {
      PIERCE: 'pierce',             // Tiros perfurantes
      RAPID: 'rapid',               // Cadência aumentada (até 4 tiros, intervalo 12 frames)
      TRIPLE: 'triple',             // Tiros triplos (central + 2 a +/- 12 graus)
      LASER: 'laser'                // Super laser convergente (1 carga armazenada)
    },
    WEIGHTS: {
      pierce: 0.25,                 // 25% cada (sorteio uniforme) (ref.)
      rapid: 0.25,
      triple: 0.25,
      laser: 0.25
    },
    RAPID_MAX_SHOTS: 4,             // Até 4 tiros simultâneos
    RAPID_COOLDOWN_FRAMES: 12,      // Intervalo de 12 frames entre disparos (ref.)
    TRIPLE_ANGLE_DEG: 12,           // Ângulo de +/- 12 graus para os tiros laterais (ref.)
    LASER: {
      CONVERGE_FRAMES: 21,          // 0.35s de convergência (ref.)
      BEAM_FRAMES: 120,             // 2.0s de feixe contínuo (ref.)
      BEAM_WIDTH: 39,               // ~3x a largura do canhão (13 * 3 = 39)
      TICK_DAMAGE_INTERVAL: 6,      // Causa dano a cada 6 frames (ref.)
      TICK_DAMAGE_BOSS: 2,          // ~2 de dano por tick ao chefe (ref.)
      PLAYER_SPEED_FACTOR: 0.5      // Canhão move-se a 50% da velocidade durante o disparo (ref.)
    }
  },

  // --- Chefe Final (Diferencial 2) ---
  BOSS: {
    SCORE_CAP: 67000,               // Gatilho exato e teto da pontuação (ref.)
    MAX_HP: 150,                    // 150 pontos de vida do chefe (ref.)
    WIDTH: 48,                      // Largura lógica do chefe
    HEIGHT: 24,                     // Altura lógica do chefe
    Y_FIGHT: 44,                    // Posição Y de combate
    INTRO_FREEZE_FRAMES: 30,        // 0.5s de congelamento inicial (ref.)
    WARNING_FRAMES: 120,            // 2.0s de aviso "WARNING" (ref.)
    DESCEND_FRAMES: 120,            // 2.0s de descida do chefe (ref.)
    INVULNERABLE_FRAMES: 120,       // 2.0s de invulnerabilidade ao surgir (ref.)
    PLAYER_RESPAWN_INVULN_FRAMES: 120, // 2.0s de invulnerabilidade do canhão ao renascer na luta
    DEATH_EXPLOSION_FRAMES: 180,    // 3.0s de explosões ao ser derrotado (ref.)
    PHASES: {
      PHASE_1: { hpThreshold: 1.00, speed: 0.8 },
      PHASE_2: { hpThreshold: 0.66, speed: 1.3 },
      PHASE_3: { hpThreshold: 0.33, speed: 1.8 }
    },
    REINFORCEMENTS: {
      INTERVAL_FRAMES: 12 * 60,     // A cada ~12s (ref.)
      SPAWN_COUNT: 7,               // 6 a 8 mini-invasores (ref.)
      MAX_ALIVE: 10,                // Máximo de 10 vivos simultâneos (ref.)
      DROP_CHANCE: 0.25             // 25% de chance de soltar power-up ao morrer (ref.)
    }
  },

  // --- Textos e Interface (pt-BR) ---
  STRINGS: {
    GAME_TITLE: "INVASORES",
    SCORE_HEADER: "SCORE<1>",
    HI_SCORE_HEADER: "HI-SCORE",
    SCORE_2_HEADER: "SCORE<2>",
    PUSH_ENTER: "PRESS ENTER TO START",
    PAUSED: "PAUSADO",
    GAME_OVER: "GAME OVER",
    VICTORY: "MISSÃO CUMPRIDA!",
    WARNING: "WARNING! ALERTA DE CHEFE!",
    BOSS_HP: "BOSS HP",
    POINTS_TABLE_TITLE: "* TABELA DE PONTOS *",
    POINTS_UFO: "=?  NUVEM MISTÉRIO",
    POINTS_SMALL: "=30 PONTOS",
    POINTS_MEDIUM: "=20 PONTOS",
    POINTS_LARGE: "=10 PONTOS",
    CREDITS: "1 OU 2 JOGADORES",
    DEBUG_MODE: "[DEBUG ATIVO]"
  },

  // --- Mapeamento de Teclas ---
  KEYS: {
    LEFT: ['ArrowLeft', 'KeyA', 'a', 'A'],
    RIGHT: ['ArrowRight', 'KeyD', 'd', 'D'],
    FIRE: ['Space'],
    SUPER: ['KeyX', 'x', 'X', 'ArrowUp'],
    PAUSE: ['KeyP', 'p', 'P', 'Escape'],
    MUTE: ['KeyM', 'm', 'M'],
    START: ['Enter'],
    // Atalhos do Modo Debug (?debug=1)
    DEBUG_PW_PIERCE: 'Digit1',
    DEBUG_PW_RAPID: 'Digit2',
    DEBUG_PW_TRIPLE: 'Digit3',
    DEBUG_PW_LASER: 'Digit4',
    DEBUG_BOSS_JUMP: 'KeyB',
    DEBUG_KILL_ALL: 'KeyK'
  }
};
