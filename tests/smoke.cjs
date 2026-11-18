// Dependency-free simulation smoke tests. Run with: node tests/smoke.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const noop = () => {};
const gradient = {addColorStop: noop};
const context2d = new Proxy({}, {get: (target, key) => target[key] || (key === 'createPattern' ? () => ({}) : typeof key === 'string' && key.endsWith('Gradient') ? () => gradient : key === 'measureText' ? () => ({width: 40}) : noop), set: (target, key, value) => (target[key] = value, true)});
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
const HERO_POSES_COUNT = run('HERO_POSES.length');
assert.equal(HERO_POSES_COUNT, 37);
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
assert.equal(run('Object.keys(game.sprites.playerFrames).length'), 8 * HERO_POSES_COUNT);
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

// --- v2: facing regression (bug: side walk looked like walking backwards) -------------------
// Eyes must sit on the leading side of the head and the back view must not show the face.
const facing = run(`(()=>{const out={};for(const d of [0,2,4,6]){const g=makeHeroFrame(d,'walk1'),eyes=[],hair=[];for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){const c=g.px[y*g.w+x];if(c===HERO.eye)eyes.push(x);if(c===HERO.hair||c===HERO.hairL)hair.push(x)}const avg=a=>a.reduce((s,v)=>s+v,0)/(a.length||1);out[d]={eyes:eyes.length,eyeX:avg(eyes),hairX:avg(hair)}}return out})()`);
assert.ok(facing[0].eyes > 0 && facing[0].eyeX > facing[0].hairX + 2, 'east profile looks to the right');
assert.ok(facing[4].eyes > 0 && facing[4].eyeX < facing[4].hairX - 2, 'west profile looks to the left');
assert.ok(facing[2].eyes >= 2, 'south view shows both eyes');
assert.equal(facing[6].eyes, 0, 'north view shows the back of the head');
run("game.animation=new PlayerAnimation(game.sprites);game.player.moving=true;game.player.moveAngle=0;game.animation.update(.1,game.player)");
assert.equal(run('game.animation.frame(game.player)===game.sprites.playerFrames["0:walk1"]'), true, 'moving right uses the east-facing walk');
// --- v2: no post-dash transparency ---------------------------------------------------------
assert.ok(!/stealth>0\)ctx\.globalAlpha/.test(fs.readFileSync('game.js','utf8')), 'dash no longer fades the hero');
// --- v2: monster attributes ----------------------------------------------------------------
run('game.enter("C")');
assert.ok(run('game.enemies.filter(e=>!e.boss).every(e=>e.attacks.length===2&&e.attacks.every(a=>a.kind!=="super"))'), 'regular monsters have attacks 1 and 2 only');
assert.ok(run('(()=>{const b=game.enemies.find(e=>e.boss);return b.attacks.length===3&&b.attacks[2].kind==="super"})()'), 'bosses own the Super attack 3');
assert.ok(run('MONSTER_TYPES.bear.attacks[0].range>MONSTER_TYPES.goblin.attacks[0].range&&MONSTER_TYPES.goblin.attacks[0].range>43'), 'reach grows with size and beats the old 43px');
assert.ok(run('Object.values(MONSTER_TYPES).every(t=>t.hp&&t.speed&&t.radius)'), 'every type defines HP, speed and size');
run('(()=>{const b=game.enemies.find(e=>e.boss);game.player.x=b.x-150;game.player.y=b.y;game.player.invuln=0;b.state="windup";b.current=b.attacks[2];b.stateT=0;b.update(.016,game)})()');
assert.ok(run('game.hazards.some(h=>h.kind==="nova")'), 'boss super spawns its pattern');
const hp0 = run('game.player.hp');run('for(let i=0;i<60;i++)game.updateCombatFX(.03)');
assert.ok(run('game.player.hp') < hp0, 'super damages the player');
// --- v2: city + dynamic gates --------------------------------------------------------------
run('game.player.hp=game.player.maxhp;game.returnHub()');
assert.equal(run('game.world.w'), 7600, 'hub is now a full city');
assert.ok(run('game.world.blocked(HUB.ox+900,HUB.oy+150)'), 'association building is solid');
assert.ok(!run('game.world.blocked(HUB.spawn.x,HUB.spawn.y)'), 'spawn point is free');
run('game.gates=new GateSystem();for(let i=0;i<40;i++)game.gates.update(1,game)');
assert.ok(run('game.gates.list.length') >= 1, 'gates spawn over time');
assert.ok(run('game.gates.list.every(g=>!game.world.blocked(g.x,g.y,40))'), 'gates spawn in open areas');
assert.ok(run('new Set(game.gates.list.map(g=>g.x+","+g.y)).size===game.gates.list.length'), 'gates use distinct positions');
run('game.gates.list.forEach(g=>g.life=.5);game.gates.timer=99;game.gates.update(1,game)');
assert.equal(run('game.gates.list.length'), 0, 'gates collapse when their timer ends');
run('const g=game.gates.spawn(game,{x:HUB.spawn.x+40,y:HUB.spawn.y,instant:true,rank:"E",red:true});game.interact()');
assert.equal(run('game.panel'), 'gate');
assert.equal(run('game.selectedGate.red'), true);
run('UIManager.close()');
assert.doesNotThrow(() => run('game.update(.016);game.draw()'), 'city with gates renders');
// --- v2: HUD minimise state persists ------------------------------------------------------
run('HudManager.toggle("minimap")');
assert.equal(run('JSON.parse(localStorage.getItem("shadow-protocol-hud")).minimap'), true);
run('HudManager.toggle("minimap")');
assert.equal(run('JSON.parse(localStorage.getItem("shadow-protocol-hud")).minimap'), false);
// --- v3: traffic, NPCs and VFX -----------------------------------------------------------
run('game.returnHub()');
assert.ok(run('game.world.traffic.cars.length>30&&game.world.traffic.parked.length>10'), 'city has moving and parked cars');
assert.ok(run('(()=>{const p=game.world.traffic.parked[0];return game.world.blocked(p.x,p.y,10)})()'), 'parked cars are solid');
assert.ok(run('(()=>{const T=game.world.traffic,c=T.cars[0],q=T.pos(c);return game.world.blocked(q.x,q.y,10)})()'), 'moving cars are solid');
run(`(()=>{const T=game.world.traffic;globalThis.__car=T.cars.find(c=>c.lane.axis==='h');__car.v=__car.vmax;const q=T.pos(__car);game.player.x=q.x+__car.lane.dir*(__car.len/2+70);game.player.y=q.y;for(let i=0;i<90;i++){game.time+=1/30;T.update(1/30,game)}})()`);
assert.ok(run('Math.abs(game.player.x-game.world.traffic.pos(__car).x)>__car.len/2+8&&__car.v<1'), 'cars brake in front of the player');
assert.ok(run('game.world.npcs.graph.nodes.length>100&&game.world.npcs.list.length>150'), 'pedestrian graph and NPC crowd exist');
assert.ok(run('game.world.npcs.list.some(a=>a.kind==="hunter")&&game.world.npcs.list.filter(a=>a.post).length===2'), 'hunters and association door guards exist');
run('game.player.x=HUB.spawn.x;game.player.y=HUB.spawn.y;game.gates.list=[];game.gates.spawn(game,{x:HUB.ox+900,y:HUB.oy+1000,instant:true,rank:"E",silent:true});for(let i=0;i<300;i++){game.time+=1/30;game.world.update(1/30)}');
assert.ok(run('game.world.npcs.list.some(a=>a.state==="patrol"||a.state==="alert")'), 'hunters respond to gates');
assert.ok(run('game.world.npcs.list.every(a=>!game.world.blocked(a.x,a.y,3,true))'), 'NPCs stay out of buildings');
run('game.animation.effect("authority",game.player);game.animation.effect("summon",game.player);game.animation.effect("vital",game.player);game.animation.effect("mutilation",game.player,0,2)');
assert.doesNotThrow(() => run('game.update(.016);game.draw()'), 'Shadow Monarch VFX render');
console.log('Smoke tests passed: dungeon, combat, animation, facing, dash opacity, monster attributes, city gates, HUD, save, traffic, NPCs and VFX.');
