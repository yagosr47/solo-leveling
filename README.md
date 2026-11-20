# Shadow Protocol

Action RPG top-down para navegador, inspirado em Solo Leveling. Abra `index.html` diretamente ou execute `python3 -m http.server 8000` e acesse a página servida. Não há dependências externas de execução; sprites, tiles de cenário e efeitos sonoros são gerados no navegador. A tela inicial usa uma ilustração local em `assets/title-background.png`.

## Controles

- WASD / setas: mover; mouse: mirar; clique esquerdo / espaço: atacar
- Shift / clique direito: passo sombrio; 1, 2, 3: habilidades
- E: interagir / extrair sombra; R: invocar / guardar sombras
- Q / F: poções de vida / mana
- C / Tab: status; I: inventário; V: sombras; B: loja; Esc: pausa

No hub, aproxime-se dos portais e pressione E para escolher uma dungeon. Derrote o chefe, abra o baú e use o portal para retornar. O progresso é salvo no armazenamento local do navegador.

**Mana das sombras.** Invocar o exército (R) tem um custo inicial de MP, que é a base mais um valor por sombra. Enquanto as sombras estão em campo, cada uma consome MP por segundo.

- Sombras maiores, de nível mais alto ou de chefes custam mais. INT reduz todos os custos.
- Sombras caídas, em regeneração, não consomem mana.
- O MP regenera 1,2/s naturalmente. Se o saldo for negativo e a mana acabar, o exército retorna sozinho.
- O painel de identidade mostra as sombras ativas, o tempo invocado e o gasto em MP/s. O mesmo valor aparece na hotbar e no botão de toque.
- O painel Sombras (V) detalha o custo de invocação, a manutenção, o saldo com a regeneração, o tempo ativo e o custo de cada sombra.

## Mapas de dungeon (18 temas)

Cada gate sorteia um dos **3 mapas do seu rank**. O tema aparece no painel do gate (com descrição e perigos) e no HUD dentro da dungeon. Cada mapa tem piso, paredes, fundo, objetos sólidos que servem de cobertura, perigos de terreno, fontes de luz, partículas de ambiente e monstros próprios.

| Rank | Mapas |
|---|---|
| **E** | Estação de Metrô Abandonada · Mina de Mana Subterrânea · Templo de Cartenon (dungeon dupla) |
| **D** | Pântano dos Homens-Lagarto · Catacumbas do Cavaleiro Caído · Ruínas da Floresta de Névoa |
| **C** | Covil da Aranha Gigante · Deserto da Centopeia Gigante · Ruínas de Mana Submersas |
| **B** | Sala do Trono de Igris · Floresta Glacial do Gate Vermelho · Fortaleza Vulcânica dos Orcs |
| **A** | Cidadela de Kargalgan · Cidade em Chamas do Castelo Demoníaco · Topo da Torre Demoníaca (arena de Baran) |
| **S** | Formigueiro de Jeju · Gate Gigante de Tóquio · Fenda Dimensional (guerra dos Monarcas) |

- **Iluminação em camadas:** nos ranks E/D a dungeon fica no escuro. Há um círculo de luz suave em volta do caçador (maior com Percepção) e em volta de tochas, cristais, velas e lâmpadas fluorescentes que piscam. As sombras emitem uma aura fraca. Os mapas iniciais evitam fundos roxos, para que o exército (preto + neon azul/roxo) se destaque.
- **Terreno:** água turva, teias e areia movediça deixam o movimento lento; lagos congelados fazem deslizar; lava e fogo causam dano contínuo (o dash atravessa sem dano); secreções envenenam. Um aviso aparece na primeira vez que você pisa em cada perigo.
- **Cobertura:** vagões, sarcófagos, armaduras, pilares, cristais e outros objetos bloqueiam a passagem. Monstros e o caçador nunca nascem dentro deles nem sobre perigos.
- A sala de entrada fica sempre livre de perigos. A camada estática do mapa é pré-renderizada uma vez, e o modo leve reduz partículas e luzes.

As dungeons são geradas com salas conectadas e corredores; o minimapa revela as salas próximas. As sombras podem entrar em regeneração e consomem mana para retornar. A missão de treinamento é renovada por data local.

## Celular e tablet

Em telas de toque, os controles aparecem sozinhos. Também dá para forçar ou desligar o modo de toque em **☰ → Menu do Sistema**.

- **Analógico flutuante (lado esquerdo):** surge onde o dedo encosta. Um toque leve faz o herói andar e um toque firme faz correr. A esquiva segue a direção do analógico.
- **Botões (lado direito):**
  - ATAQUE: segure para atacar em sequência. A mira automática escolhe o inimigo visível mais próximo.
  - ESQUIVA, as habilidades 1, 2 e 3 (mostram o custo de MP e se ficam indisponíveis), invocar sombras e poções de HP e MP.
  - O aviso de interação ("▶ …") também pode ser tocado.
- **Barra superior:** tela cheia, ocultar ou mostrar o HUD e o menu.
- **Menu do Sistema (toque):**
  - Atalhos para Status, Inventário, Sombras, Loja, Bestiário e Salvar.
  - Tela cheia e tela cheia ao iniciar.
  - Zoom da câmera (automático, 70–120%) e qualidade (automática, alta ou leve).
  - Tamanho e opacidade dos botões, modo canhoto, vibração.
  - Minimizar ou restaurar os painéis.
- **Tamanho adaptativo:** a câmera se afasta em telas baixas (celular na horizontal), para mostrar mais do mapa sem deixar o desenho minúsculo. O HUD fica compacto: só a identidade, o minimapa e os painéis recolhíveis de missão e gates. A ajuda de teclado e a hotbar do desktop ficam ocultas.
- **Desempenho:** se o jogo ficar abaixo de cerca de 38 FPS por alguns segundos, o modo leve é ativado automaticamente, com menos partículas e brilho.
- **Tela cheia e PWA:** o jogo pede tela cheia ao começar, se essa opção estiver ligada. Ao usar "Adicionar à tela inicial", ele abre em tela cheia na horizontal (`manifest.webmanifest`).
- **Orientação:** na vertical aparece um aviso para girar o aparelho. Também é possível escolher "Jogar na vertical".

O layout de desktop (teclado e mouse) não mudou.

## Verificação

Execute `node --check game.js` e `node tests/smoke.cjs` para verificar sintaxe, conectividade das salas, colisão, habilidades, regeneração e salvamento. Os testes de simulação não substituem testes visuais no navegador.

Este projeto ainda é um protótipo: não implementa todas as animações, tipos de inimigos, ataques de chefes e efeitos descritos na especificação original. Salvar registra a progressão, não o estado de uma dungeon em andamento; ao continuar, o jogador retorna ao hub.

### Animações

O protagonista usa quadros procedurais em oito direções, ciclo de caminhada, três poses de combo e animações próprias para Corte Vital, Mutilação, Autoridade, esquiva e invocação. Rastros e efeitos são temporários e pausam com o jogo. As poses são geradas em cache na inicialização; não dependem de imagens externas.
