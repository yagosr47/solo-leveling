// Dependency-free simulation smoke tests. Run with: node tests/smoke.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const noop = () => {};
const context2d = new Proxy({}, {get: (target, key) => target[key] || (key === 'createPattern' ? () => ({}) : noop), set: (target, key, value) => (target[key] = value, true)});
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {width: 0, height: 0, style: {}, dataset: {}, classList: {add: noop, remove: noop, toggle: noop}, getContext: () => context2d, addEventListener: noop, innerHTML: '', textContent: ''});
  return elements.get(id);
}
const store = new Map();
const sandbox = {console, Math, Date, JSON, Set, innerWidth: 1280, innerHeight: 800, setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop,
  window: {addEventListener: noop}, document: {querySelector: element, querySelectorAll: () => [], createElement: () => element('offscreen')},
  localStorage: {getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v)}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('game.js','utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);
run('game.start(null)');
assert.doesNotThrow(() => run('game.draw()'), 'hub renders');
for (let i = 0; i < 30; i++) {
  run("game.enter('E')");
  assert.equal(run('game.world.rooms.length'), 9);
  assert.equal(run('game.world.corridors.length'), 8);
  assert.doesNotThrow(() => run('game.draw()'), 'dungeon renders');
  // Every generated room must be reachable from the entrance via corridors.
  assert.equal(run(`(()=>{const w=game.world, reached=new Set([3]);let changed=true;while(changed){changed=false;for(let i=0;i<w.rooms.length;i++){if(!reached.has(i))continue;for(let j=0;j<w.rooms.length;j++){if(reached.has(j))continue;const a=w.rooms[i],b=w.rooms[j];if(w.corridors.some(c=>a.cx>=c.x&&a.cx<=c.x+c.w&&a.cy>=c.y&&a.cy<=c.y+c.h&&b.cx>=c.x&&b.cx<=c.x+c.w&&b.cy>=c.y&&b.cy<=c.y+c.h)){reached.add(j);changed=true}}}}return reached.size})()`),9);
}
for (const rank of ['A', 'S']) {
  run(`game.enter('${rank}')`);
  assert.equal(run('!!game.world.wallLayer'), true, 'dungeon walls are cached');
  assert.doesNotThrow(() => run('game.draw()'), `${rank} biome renders`);
}
run('game.player.x=300; game.player.y=600; game.moveActor(game.player,-1000,0)');
assert.ok(run('game.player.x') >= 102, 'player cannot tunnel through room wall');
run("game.player.x=300;game.player.y=600;game.player.cool=0;game.player.mp=125;game.skill(2)");
assert.equal(run('game.pendingStrikes.length'), 4);
assert.equal(run('game.player.mp'), 100);
// Each facing and pose is pre-cached; walking advances even without combat.
assert.equal(run('Object.keys(game.sprites.playerFrames).length'), 8 * 13);
run("game.animation=new PlayerAnimation(game.sprites);game.player.moving=true;game.player.moveAngle=Math.PI;game.animation.update(.15,game.player)");
assert.equal(run('game.animation.direction(game.animation.moveAngle)'), 4);
assert.equal(run('game.animation.frame(game.player)===game.sprites.playerFrames["4:walk1"]'), true);
run("game.player.moving=false;game.player.cool=0;game.player.comboWindow=0;game.attack()");
assert.equal(run('game.animation.action'), 'combo1');
run('game.player.cool=0;game.attack()');
assert.equal(run('game.animation.action'), 'combo2');
run('game.player.cool=0;game.attack()');
assert.equal(run('game.animation.action'), 'combo3');
run("game.player.cool=0;game.player.mp=125;game.skill(1)");
assert.equal(run('game.animation.action'), 'vital');
assert.equal(run('game.animation.effects.at(-1).type'), 'vital');
run("game.player.cool=0;game.player.mp=125;game.pendingStrikes=[];game.skill(2)");
assert.equal(run('game.animation.action'), 'mutilation');
assert.equal(run('game.pendingStrikes.length'), 4);
run("game.pendingStrikes=[];game.player.cool=0;game.player.mp=125;game.skill(3)");
assert.equal(run('game.animation.action'), 'authority');
assert.equal(run('game.animation.effects.at(-1).type'), 'authority');
assert.doesNotThrow(() => run('game.draw()'), 'combat effects render');
run('game.animation.update(2,game.player)');
assert.equal(run('game.animation.effects.length'), 0, 'effects expire');
run('game.player.dashCd=0;game.dash()');
assert.equal(run('game.animation.action'), 'dash');
run('game.animation.update(.02,game.player)');
assert.equal(run('game.animation.effects.some(f=>f.type==="ghost")'), true);
run("game.army=[{name:'Teste',kills:0}]; game.toggleArmy(); game.soldiers[0].hurt(9999,game)");
assert.equal(run('game.soldiers[0].state'), 'REGENERATE');
run('game.player.mp=20; game.soldiers[0].update(4.1,game,0)');
assert.equal(run('game.soldiers[0].state'), 'FOLLOW');
assert.equal(run('game.player.mp'), 5);
run('SaveSystem.save(game)');
assert.equal(run('SaveSystem.load().army[0].name'), 'Teste');
console.log('Smoke tests passed: dungeon, combat, animation, shadow regeneration and save.');
