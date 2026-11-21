# Shadow Protocol

Action RPG top-down para navegador, inspirado em Solo Leveling. Abra `index.html` diretamente ou execute `python3 -m http.server 8000` e acesse a página servida. Não há dependências externas de execução; sprites, tiles de cenário e efeitos sonoros são gerados no navegador. A tela inicial usa uma ilustração local em `assets/title-background.png`.

## Controles

- WASD / setas: mover; mouse: mirar; clique esquerdo / espaço: atacar
- Shift / clique direito: passo sombrio; 1, 2, 3: habilidades
- E: interagir / extrair sombra ("Levante-se"); R: invocar / guardar sombras
- G: chamar Yoo Jin-ho (depois que ele se junta a você)
- Q / F: poções de vida / mana
- C / Tab: status; T: talentos; I: inventário; V: sombras; P: contratos; B: loja; N: bestiário; Esc: pausa

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

## Sistemas da expansão

- **Combate com impacto:** hit-stop de 40–60 ms em golpes fortes, críticos e na morte do chefe; contador de combo visível que rende XP e MP quando você encadeia golpes sem levar dano; monsteris de elite (VELOZ, BLINDADO, EXPLOSIVO) com recompensas dobradas.
- **Usar o terreno:** o dash e a Autoridade empurram monstros para lava, teia e veneno; os pilares da Cidadela de Kargalgan quebram com golpes corpo a corpo e abrem passagem.
- **Chefes em fases:** aos 50% e 20% de HP o chefe muda o padrão, invoca ajudantes e o cenário reage (as estátuas de Cartenon se movem, a lava sobe na fortaleza vulcânica, a nevasca piora). Um QTE decisivo com barra de acerto aparece nas fases: acerte para enfraquecer, falhe e ele contra-ataca.
- **Exército das sombras:** extração com 3 tentativas (chance por nível e INT); chefes viram sombras únicas com nome e patente própria (IGRIS, TANK, IRON, BERU); ordens de ATACAR / DEFENDER / MANTER POSIÇÃO (botão no celular e no painel Sombras); Shadow Exchange para trocar de lugar com uma sombra (recarga longa). As sombras se espalham em formação e não se amontoam.
- **Progressão:** missão diária do Sistema (100 flexões = abates, 100 abdominais = esquivas, 10 km de corrida) com recompensa e, se falhar, a Zona de Penalidade (arena de ondas); árvore de talentos por atributo (FOR/AGI/VIT/INT/PER); equipamentos raros dos chefes (Adaga de Kasaka, Espada do Barca, Capa do Rei Demônio); mudança de classe no nível 40 com dungeon especial de Cartenon; bestiário com 50 abates por tipo concedendo +4% de dano.
- **Dungeons vivas:** gate vermelho sem saída até o chefe, com cronômetro e clima que piora (a lava sobe, a nevasca engrossa); eventos aleatórios de sala (baú armadilhado, caçador ferido, desafio contra o relógio); uma sala secreta por mapa, revelada por Percepção alta ou chegando perto da parede rachada; quebra de dungeon quando um gate expira sem dono, soltando monstros na cidade e fazendo os NPCs fugirem.
- **Cidade e mundo:** Associação dos Caçadores com contratos por rank e pontos de caçador que sobem seu rank da associação (com reavaliação); Yoo Jin-ho como companheiro de dungeon e Cha Hae-in nos gates de rank alto; ciclo de dia e noite (mais gates e mais vermelhos à noite, sombras mais fortes); segunda cidade (Busan) com praia, porto e portal de volta a Seoul; monetização do save em código para PC ↔ celular.
- **Interface e acessibilidade:** tutorial interativo nos primeiros minutos; assistente de mira no toque (segure o ataque para ver a direção e solte para golpear); indicador de inimigos fora da tela; configurações de tremor de tela reduzido, filtro para daltônicos, texto maior, medidor de FPS, música e efeitos ligados/desligados e perfil ultra leve.
- **Som procedural:** trilha por tema (tambores na cidadela, drone e gotas no metrô/mina, coro nos ranks S), áudio espacial com volume e pan por distância, bip do Sistema nas notificações.

## Verificação

Execute `node --check game.js` e `node tests/smoke.cjs` para verificar sintaxe, conectividade das salas, colisão, habilidades, regeneração e salvamento. Os testes de simulação não substituem testes visuais no navegador.

Este projeto ainda é um protótipo: não implementa todas as animações, tipos de inimigos, ataques de chefes e efeitos descritos na especificação original. Salvar registra a progressão, não o estado de uma dungeon em andamento; ao continuar, o jogador retorna ao hub.

### Animações

O protagonista usa quadros procedurais em oito direções, ciclo de caminhada, três poses de combo e animações próprias para Corte Vital, Mutilação, Autoridade, esquiva e invocação. Rastros e efeitos são temporários e pausam com o jogo. As poses são geradas em cache na inicialização; não dependem de imagens externas.
