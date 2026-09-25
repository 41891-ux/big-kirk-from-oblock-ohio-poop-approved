/**
 * main.js - Ponto de entrada da aplicação.
 * Inicializa os módulos de entrada, áudio e o núcleo do jogo após o carregamento do DOM.
 * Namespace global: window.SI
 */

window.SI = window.SI || {};

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('[SI Main] Elemento #game-canvas não encontrado no documento.');
    return;
  }

  // Inicializa o gerenciador de entradas (teclado e toque)
  SI.Input.init();

  // Inicializa o núcleo do jogo
  SI.Game.init(canvas);

  console.log('[SI Main] Jogo inicializado com sucesso.');
});
