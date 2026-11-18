# Shadow Protocol

Action RPG top-down para navegador, inspirado em Solo Leveling. Abra `index.html` diretamente ou execute `python3 -m http.server 8000` e acesse a página servida. Não há dependências de execução; sprites, cenário e efeitos sonoros são gerados no navegador.

## Controles

- WASD / setas: mover; mouse: mirar; clique esquerdo / espaço: atacar
- Shift / clique direito: passo sombrio; 1, 2, 3: habilidades
- E: interagir / extrair sombra; R: invocar / guardar sombras
- Q / F: poções de vida / mana
- C / Tab: status; I: inventário; V: sombras; B: loja; Esc: pausa

No hub, aproxime-se dos portais e pressione E para escolher uma dungeon. Derrote o chefe, abra o baú e use o portal para retornar. O progresso é salvo no armazenamento local do navegador.

As dungeons são geradas com salas conectadas e corredores; o minimapa revela as salas próximas. As sombras podem entrar em regeneração e consomem mana para retornar. A missão de treinamento é renovada por data local.

## Verificação

Execute `node --check game.js` e `node tests/smoke.cjs` para verificar sintaxe, conectividade das salas, colisão, habilidades, regeneração e salvamento. Os testes de simulação não substituem testes visuais no navegador.

Este projeto ainda é um protótipo: não implementa todas as animações, tipos de inimigos, ataques de chefes e efeitos descritos na especificação original. Salvar registra a progressão, não o estado de uma dungeon em andamento; ao continuar, o jogador retorna ao hub.

### Animações

O protagonista usa quadros procedurais em oito direções, ciclo de caminhada, três poses de combo e animações próprias para Corte Vital, Mutilação, Autoridade, esquiva e invocação. Rastros e efeitos são temporários e pausam com o jogo. As poses são geradas em cache na inicialização; não dependem de imagens externas.
