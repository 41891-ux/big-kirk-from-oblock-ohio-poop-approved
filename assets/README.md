# Guia de Texturas e Sprites - INVASORES

Este diretório armazena os arquivos de textura do jogo. O jogo foi construído para ser **100% jogável sem nenhuma textura externa** (utilizando renderização vetorial e procedural como fallback). Para aplicar a identidade visual definitiva, basta colar os arquivos PNG nesta pasta com os nomes exatos listados na tabela abaixo.

---

## Regras de Formato e Resolução

1. **Formato**: PNG com canal alfa (transparência / 32-bit RGBA).
2. **Spritesheets horizontais**: Para assets com mais de 1 quadro (frame), organize os quadros lado a lado horizontalmente em uma única tira (largura total da imagem = `w * frames`).
3. **Hitboxes e Jogabilidade**: A detecção de colisões e a velocidade são calculadas com base nas constantes de `js/config.js` e na grade lógica 224×256. Alterar a arte gráfica ou o estilo visual **não altera a precisão da jogabilidade**.
4. **Modo Pixel Art vs HD**: Caso utilize texturas em alta resolução ou arte suavizada, altere a opção `PIXEL_ART: false` em `js/config.js`.

---

## Tabela de Texturas Esperadas

| Chave | Arquivo Esperado | Tamanho Lógico (L × A) | Nº Quadros | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `player` | `player.png` | 13 × 8 px | 1 | Canhão laser do jogador |
| `player_death` | `player_death.png` | 15 × 8 px | 2 | Animação de destruição do canhão |
| `invader_small` | `invader_small.png` | 8 × 8 px | 2 | Invasor superior (30 pontos) |
| `invader_medium` | `invader_medium.png` | 11 × 8 px | 2 | Invasor intermediário (20 pontos) |
| `invader_large` | `invader_large.png` | 12 × 8 px | 2 | Invasor inferior (10 pontos) |
| `invader_death` | `invader_death.png` | 13 × 8 px | 1 | Explosão do invasor destruído |
| `ufo` | `ufo.png` | 16 × 8 px | 1 | Nave Mistério que cruza o topo |
| `ufo_death` | `ufo_death.png` | 21 × 8 px | 1 | Explosão da Nave Mistério |
| `bunker` | `bunker.png` | 22 × 16 px | 1 | Abrigo com arco central inferior |
| `shot_player` | `shot_player.png` | 1 × 4 px | 1 | Projétil comum disparado pelo jogador |
| `shot_rolling` | `shot_rolling.png` | 3 × 7 px | 4 | Projétil inimigo tipo "Rolling" |
| `shot_plunger` | `shot_plunger.png` | 3 × 7 px | 4 | Projétil inimigo tipo "Plunger" |
| `shot_squiggly` | `shot_squiggly.png` | 3 × 7 px | 4 | Projétil inimigo tipo "Squiggly" |
| `powerup_pierce` | `powerup_pierce.png` | 8 × 8 px | 1 | Cápsula: Tiro Perfurante (P) |
| `powerup_rapid` | `powerup_rapid.png` | 8 × 8 px | 1 | Cápsula: Cadência Rápida (R) |
| `powerup_triple` | `powerup_triple.png` | 8 × 8 px | 1 | Cápsula: Tiro Triplo (T) |
| `powerup_laser` | `powerup_laser.png` | 8 × 8 px | 1 | Cápsula: Super Laser (L) |
| `boss` | `boss.png` | 48 × 24 px | 2 | Chefe final (nave-mãe alienígena) |
| `boss_shot` | `boss_shot.png` | 4 × 6 px | 2 | Projétil de plasma disparado pelo chefe |
| `background` | `background.png` | 224 × 256 px | 1 | *(Opcional)* Fundo de estrelas/nebulosa |
| `laser` | `laser.png` | 39 × 256 px | 1 | *(Opcional)* Textura do feixe do Super Laser |
