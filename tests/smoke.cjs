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
run("game.army=[{name:'Teste',kills:0}]; game.player.mp=game.player.maxmp;game.toggleArmy(); game.soldiers[0].hurt(9999,game)");
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
run('game.gates.list.forEach(g=>{g.life=.5;g.forming=0});game.gates.timer=99;game.gates.update(1,game)');
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

// --- v4: safe spawning ---------------------------------------------------------------------------
run('globalThis.__w=new WorldMap()');
assert.ok(run('__w.npcs.list.every(a=>__w.npcs.free(a.x,a.y))'), 'every city NPC spawns on a free spot (no buildings, props or cars)');
for (const rank of ['E','C','S']) for (let i = 0; i < 6; i++) {
  run(`game.enter('${rank}',${i%2===0})`);
  assert.ok(run('game.enemies.every(e=>game.isWalkable(e.x,e.y,e.radius)&&game.roomAt(e.x,e.y)>=0)'), `rank ${rank}: monsters spawn inside rooms, never inside walls`);
  assert.ok(run('game.enemies.filter(e=>!e.boss).every((e,i,a)=>a.every(o=>o===e||Math.hypot(o.x-e.x,o.y-e.y)>o.radius+e.radius))'), 'monsters do not spawn on top of each other');
}
// R next to a wall: every shadow must appear on a free spot reachable from the player (no wall in between).
run(`game.enter('C');game.player.x=104;game.player.y=470;game.player.angle=Math.PI;game.summoned=false;
 game.army=Array.from({length:8},(_,i)=>({name:'S'+i,type:['orc','wolf','spider','bear'][i%4],level:5,kills:0}));game.player.mp=game.player.maxmp;game.toggleArmy()`);
assert.equal(run('game.soldiers.length'), 8);
assert.ok(run('game.soldiers.every(s=>game.isWalkable(s.x,s.y,Math.min(26,s.radius))&&game.pathClear(game.player.x,game.player.y,s.x,s.y,10))'), 'shadows spawn on free spots around the player');
assert.ok(run('game.soldiers.every((s,i,a)=>a.every(o=>o===s||Math.hypot(o.x-s.x,o.y-s.y)>=20))'), 'shadows do not stack on one spot');
run(`game.returnHub();const b=CITY.buildings[0];game.player.x=b.x+b.w/2;game.player.y=b.y+b.h+14;game.summoned=false;game.player.mp=game.player.maxmp;game.toggleArmy()`);
assert.ok(run('game.soldiers.every(s=>!game.world.blocked(s.x,s.y,12,true))'), 'shadows never spawn inside city buildings');
run('game.summoned=false;game.soldiers=[]');
// --- v4: water and ambient effects anchored to the world ----------------------------------------
const src = fs.readFileSync('game.js','utf8');
assert.ok(!/x0\+\(\(i\*173/.test(src), 'river streaks no longer depend on the viewport');
assert.ok(/hash2\(gx,j\)/.test(src) && /gx\*C\+hash2/.test(src), 'river streaks and motes use world cells');
// --- v4: fog of war and room aggro ---------------------------------------------------------------
run(`Math.random=(()=>{let s=11;return()=>{s=(s*16807)%2147483647;return s/2147483647}})();game.enter('E');game.player.stats.PER=5;game.player.x=300;game.player.y=600;game.computeFog()`);
assert.equal(run('JSON.stringify([...game.fog.lit])'), '["r3"]', 'only the current room is lit');
assert.ok(run('game.enemies.every(e=>game.roomAt(e.x,e.y)===3||!game.fogVisible(e))'), 'monsters in other rooms are hidden by the fog');
// Stand at the edge of room 3 closest to a monster of another room, well inside its aggro radius.
run(`const r=game.world.rooms[3],spot=e=>({x:clamp(e.x,r.x+20,r.x+r.w-20),y:clamp(e.y,r.y+20,r.y+r.h-20)});
 globalThis.__e=game.enemies.filter(e=>!e.boss&&game.roomAt(e.x,e.y)!==3).sort((a,b)=>dist(a,spot(a))-dist(b,spot(b)))[0];globalThis.__p={x:__e.x,y:__e.y};globalThis.__s=spot(__e);
 for(let i=0;i<120;i++){game.player.x=__s.x;game.player.y=__s.y;game.player.hp=game.player.maxhp;game.update(1/60)}`);
assert.ok(run('dist(__e,__s)<__e.aggro'), 'test setup: the monster is within its aggro radius');
assert.equal(run('__e.alerted'), false, 'a monster in a dark room does not detect the player');
assert.ok(run('Math.hypot(__e.x-__p.x,__e.y-__p.y)<2'), 'a monster in a dark room does not chase the player');
run(`const room=game.world.rooms[game.roomAt(__e.x,__e.y)];game.player.x=room.cx;game.player.y=room.cy;game.player.invuln=99;for(let i=0;i<30;i++)game.update(1/60)`);
assert.equal(run('__e.alerted||game.enemies.indexOf(__e)<0'), true, 'entering the room wakes the monster up');
run(`game.player.invuln=0;game.player.stats.PER=20;game.player.x=300;game.player.y=600;game.computeFog()`);
assert.ok(run('game.world.rooms[3].links.every(i=>game.fog.near.has("r"+i))'), 'high Perception reveals adjacent rooms');
assert.ok(run('[...game.fog.near].filter(z=>z[0]==="r").every(z=>game.world.rooms[3].links.includes(+z.slice(1)))'), 'only adjacent rooms are revealed');
assert.doesNotThrow(() => run('game.draw()'), 'fog renders');
run('game.player.stats.PER=5');
// --- v4: faithful shadow extraction, capacity and mini-HUD ---------------------------------------
run(`game.enter('C');game.corpses=[];const e=game.enemies.find(e=>e.type==='orc')||game.enemies[0];globalThis.__t=e.type;game.player.x=e.x;game.player.y=e.y;game.player.stats.INT=40;game.army=[];game.summoned=false;
 e.hp=1;game.hit(e,999,false);Math.random=()=>0;game.interact()`);
assert.equal(run('game.army.length'), 1, 'extraction succeeds');
assert.equal(run('game.army[0].type'), run('__t'), 'shadow keeps the monster type');
assert.equal(run('game.army[0].level'), 17, 'shadow keeps the monster level');
run('game.player.mp=game.player.maxmp;game.toggleArmy()');
assert.equal(run('game.soldiers[0].art'), run('MONSTER_TYPES[__t].art'), 'shadow uses the monster sprite');
assert.equal(run('JSON.stringify(game.soldiers[0].attacks.map(a=>a.name+a.kind+a.range))'), run('JSON.stringify(MONSTER_TYPES[__t].attacks.map(a=>a.name+a.kind+a.range))'), 'shadow copies the monster attacks and reach');
const pal = run(`(()=>{const g=buildMonsterGrid(MONSTER_ART[MONSTER_TYPES[__t].art],'idle0',1,true),ok=new Set([...SHADOW_RAMP,SHADOW_EYE,SHADOW_EYE_HALO,SHADOW_EDGE,SHADOW_METAL]);return {all:g.px.filter(Boolean).every(c=>ok.has(c)),eyes:g.px.filter(c=>c===SHADOW_EYE).length}})()`);
assert.ok(pal.all && pal.eyes > 0, 'shadow sprite uses the purple/black palette with glowing blue eyes');
assert.ok(run('game.sprites.shadowMonster("boss_C","idle0").img')!==undefined, 'boss shadows have a shadow-palette sprite');
assert.equal(run('armyCap({stats:{INT:4},level:1})'), 3);
assert.ok(run('armyCap({stats:{INT:4},level:21})>armyCap({stats:{INT:4},level:1})&&armyCap({stats:{INT:12},level:1})>armyCap({stats:{INT:4},level:1})'), 'capacity grows with level and INT');
run(`game.army=Array.from({length:armyCap(game.player)},(_,i)=>({name:'x',type:'goblin',level:1}));game.corpses=[{x:game.player.x,y:game.player.y,life:5,tries:0,level:1,name:'G',type:'goblin'}];game.interact()`);
assert.equal(run('game.army.length'), run('armyCap(game.player)'), 'extraction respects the slot cap');
run(`game.summoned=false;game.army=[{name:'O',type:'orc',level:3}];game.player.mp=game.player.maxmp;game.toggleArmy();const s=game.soldiers[0];s.data.xp=0;s.gainXP({level:30,boss:false},game)`);
assert.ok(run('game.soldiers[0].level>3&&game.soldiers[0].maxhp===Math.round((MONSTER_TYPES.orc.hp[0]+MONSTER_TYPES.orc.hp[1]*game.soldiers[0].level)*game.soldiers[0].power)'), 'shadows level up and their HP scales');
assert.ok(/drawShadowHUD/.test(src) && /`LV \$\{a\.level\}/.test(src), 'mini-HUD shows LV and HP above every shadow');
assert.doesNotThrow(() => run('for(let i=0;i<60;i++)game.update(1/60);game.draw()'), 'shadow army renders');
// Shadow army mana: summon cost, per-second upkeep while active, auto-recall when MP runs out.
run(`game.returnHub();game.panel=null;game.player.stats.INT=5;game.army=[{name:'O',type:'orc',level:5,kills:0},{name:'W',type:'wolf',level:5,kills:0}];game.summoned=false;game.soldiers=[]`);
const cost = run('armySummonCost(game.player,game.army)');
assert.ok(cost > 0, 'summoning has a mana cost');
run(`game.player.mp=${cost}-1;game.toggleArmy()`);
assert.equal(run('game.summoned'), false, 'cannot summon without enough mana');
run('game.player.mp=100;game.toggleArmy()');
assert.equal(run('game.summoned'), true, 'summon succeeds with enough mana');
assert.ok(Math.abs(run('game.player.mp') - (100 - cost)) < 1e-9, 'summon cost is deducted');
const drain = run('game.armyDrain()');
assert.ok(drain > 0 && Math.abs(drain - run('armyUpkeep(game.player,game.army)')) < 1e-9, 'active shadows drain mana per second');
run('globalThis.__m0=game.player.mp;game.armyT=0;for(let i=0;i<60;i++)game.update(1/60)');
assert.ok(Math.abs(run('game.player.mp') - (run('__m0') + run('MP_REGEN') - drain)) < 0.05, 'one second of upkeep costs the shown MP/s (net of regen)');
assert.ok(Math.abs(run('game.armyT') - 1) < 1e-6, 'active time is tracked');
run("game.soldiers[0].hurt(1e6,game)");
assert.ok(run('game.armyDrain()') < drain, 'fallen (regenerating) shadows stop draining');
assert.ok(run(`shadowMana({type:'igris',boss:true,level:5},game.player).upkeep>shadowMana({type:'orc',level:5},game.player).upkeep`), 'boss shadows cost more');
assert.ok(run(`(()=>{const a=armyUpkeep(game.player,game.army);game.player.stats.INT=30;const b=armyUpkeep(game.player,game.army);game.player.stats.INT=5;return b<a})()`), 'INT reduces the upkeep');
run(`game.summoned=false;game.army=Array.from({length:4},(_,i)=>({name:'S'+i,type:'orc',level:12,kills:0}));game.player.mp=game.player.maxmp;game.toggleArmy();game.player.mp=0.001;game.update(1/60)`);
assert.equal(run('game.summoned'), false, 'army is recalled when mana runs out');
assert.equal(run('game.soldiers.length'), 0);
run('game.army=[];game.player.mp=game.player.maxmp;game.toggleArmy()');
assert.equal(run('game.summoned'), false, 'empty army cannot be summoned');
// Mobile / touch: adaptive scale, analog stick, auto-aim attack and persisted settings.
assert.ok(Math.abs(run('Mobile.scale(844,390)') - 390/460) < 1e-9, 'short landscape phone zooms the camera out');
assert.equal(run('Mobile.scale(1366,768)'), 1, 'desktop keeps 1:1 scale');
assert.equal(run('Mobile.scale(480,240)'), 0.62, 'scale never drops below the readable minimum');
run("Mobile.set('zoom','0.7')");
assert.equal(run('Mobile.scale(844,390)'), 0.7, 'manual zoom overrides auto scale');
assert.equal(JSON.parse(store.get('shadow-protocol-settings')).zoom, 0.7, 'settings persist to localStorage');
run("Mobile.set('zoom','auto');Mobile.set('lefty','true')");
assert.equal(run('Settings.d.lefty'), true, 'boolean settings are parsed');
assert.equal(run("(Settings.d.lefty=false,Settings.load(),Settings.d.lefty)"), true, 'settings reload from storage');
run("Mobile.set('lefty','false')");
run(`game.enter('E');game.enemies=[];game.panel=null;(()=>{const r=game.world.rooms[3];game.player.x=r.cx;game.player.y=r.cy;game.player.vx=game.player.vy=0;game.input.keys={};game.input.touchMode=true;game.input.stick={x:1,y:0,mag:1};globalThis.__x0=game.player.x})();for(let i=0;i<6;i++)game.update(1/60)`);
assert.ok(run('game.player.x') > run('__x0') + 3, 'analog stick moves the hunter');
run(`game.input.stick={x:0,y:-.3,mag:.3};globalThis.__y0=game.player.y;globalThis.__x1=game.player.x;for(let i=0;i<6;i++)game.update(1/60)`);
assert.ok(run('game.player.y') < run('__y0'), 'light stick push walks');
run(`game.input.stick={x:.1,y:0,mag:.1};game.player.vx=game.player.vy=0;globalThis.__p0={x:game.player.x,y:game.player.y};for(let i=0;i<6;i++)game.update(1/60)`);
assert.ok(run('Math.hypot(game.player.x-__p0.x,game.player.y-__p0.y)') < 2, 'stick dead zone ignores tiny pushes');
run(`game.input.stick={x:0,y:0,mag:0};(()=>{const p=game.player,e=new Enemy(p.x+60,p.y+40,'goblin',1);game.enemies=[e];globalThis.__e=e;e.hp=e.maxhp=1e6;game.input.touchAttack=true;p.cool=0})()`);
assert.equal(run('game.aimTarget()===__e'), true, 'auto-aim picks the closest visible enemy');
run('game.update(1/60)');
assert.ok(Math.abs(run('game.player.angle') - Math.atan2(40, 60)) < 0.05, 'touch attack faces the auto-aim target');
assert.ok(run('game.player.cool') > 0, 'holding the attack button swings the weapon');
run('game.input.touchAttack=false;game.input.touchMode=false');
// Dungeon themes: 18 maps (3 per rank), safe spawns clear of solid props and hazards, terrain effects.
assert.equal(run('ALL_THEMES.length'), 18, '18 dungeon themes');
assert.equal(run("RANKS.every(r=>DUNGEON_THEMES[r]&&DUNGEON_THEMES[r].length===3)"), true, '3 themes per rank E..S');
assert.equal(run('new Set(ALL_THEMES.map(t=>t.id)).size'), 18, 'unique theme ids');
assert.equal(run("ALL_THEMES.every(t=>t.mon.every(m=>MONSTER_TYPES[m])&&t.fog&&t.pal&&t.name)"), true, 'themes reference valid monsters');
assert.equal(run("['E','D'].every(r=>DUNGEON_THEMES[r].every(t=>t.dark>=.5))"), true, 'E/D maps use the layered darkness');
for (const th of run('JSON.stringify(ALL_THEMES.map(t=>[t.id,RANKS.find(r=>DUNGEON_THEMES[r].includes(t))]))').length ? JSON.parse(run('JSON.stringify(ALL_THEMES.map(t=>[t.id,RANKS.find(r=>DUNGEON_THEMES[r].includes(t))]))')) : []) {
  const [id, rank] = th;
  run(`game.enter('${rank}',false,'${id}')`);
  assert.equal(run('game.world.theme.id'), id, `${id}: theme applied`);
  assert.ok(run('!!game.world.wallLayer&&Array.isArray(game.world.solids)&&Array.isArray(game.world.zones)&&game.world.lights.length>=0'), `${id}: static layer baked`);
  assert.ok(run('game.isWalkable(game.player.x,game.player.y,14)'), `${id}: hunter spawns on a walkable spot`);
  assert.equal(run('game.world.terrainAt(game.player.x,game.player.y)'), null, `${id}: entrance is free of hazards`);
  assert.ok(run('game.enemies.length') >= 15, `${id}: monsters spawned`);
  assert.equal(run(`game.enemies.every(e=>!game.world.blocked(e.x,e.y,8)&&game.world.walkable.some(r=>e.x>=r.x&&e.x<=r.x+r.w&&e.y>=r.y&&e.y<=r.y+r.h))`), true, `${id}: no monster inside a solid prop`);
  assert.equal(run(`game.enemies.every(e=>game.world.theme.mon.includes(e.type)||e.boss)`), true, `${id}: themed monster roster`);
  run('game.player.dashTime=0;game.draw()');
}
// Solid props block movement.
run(`game.enter('E',false,'metro');globalThis.__s=game.world.solids.find(s=>s.w>20&&s.h>14);`);
assert.ok(run('!!__s'), 'metro has solid cover');
assert.equal(run('game.isWalkable(__s.x+__s.w/2,__s.y+__s.h/2,12)'), false, 'solid props are not walkable');
// Slow terrain (swamp water) reduces displacement.
run(`game.enter('D',false,'swamp');globalThis.__z=game.world.zones.find(z=>z.kind==='slow');`);
assert.ok(run('!!__z&&__z.mult<1'), 'swamp has slowing water');
const slowMove = code => run(`(()=>{const p=game.player;${code};p.dashTime=0;const x0=p.x;game.moveActor(p,6,0);return p.x-x0})()`);
const outside = slowMove(`const r=game.world.rooms[3];p.x=r.cx;p.y=r.cy`);
const inside = slowMove(`p.x=__z.x;p.y=__z.y;game.world.solids=[]`);
assert.ok(inside < outside && inside > 0, 'murky water slows the hunter');
// Burn terrain damages over time and can kill.
run(`game.enter('B',false,'volcanic');globalThis.__z=game.world.zones.find(z=>z.kind==='burn');(()=>{const p=game.player;p.x=__z.x;p.y=__z.y;p.dashTime=0;p.burnT=0;globalThis.__hp=p.hp=p.maxhp})()`);
assert.ok(run('!!__z'), 'volcanic map has lava');
run('game.terrainEffects(game.player,1/60)');
assert.ok(run('game.player.hp') < run('__hp'), 'lava burns the hunter');
run(`game.player.hp=1;game.player.burnT=0;game.terrainEffects(game.player,1/60)`);
assert.equal(run('UIManager.open&&game.player.hp'), 0, 'lava can kill');
run('UIManager.close();game.player.hp=game.player.maxhp');
// Ice keeps momentum (the hunter keeps sliding after releasing the keys).
run(`game.enter('B',false,'glacial');globalThis.__z=game.world.zones.find(z=>z.kind==='ice');(()=>{const p=game.player;game.enemies=[];game.world.solids=[];game.hitStop=0;p.x=__z.x;p.y=__z.y;p.ivx=200;p.ivy=0;p.dashTime=0;game.input.keys={};game.input.touchMode=false;game.input.stick={x:0,y:0,mag:0};globalThis.__x0=p.x;game.update(1/30)})()`);
assert.ok(run('game.player.x') > run('__x0') + 2, 'ice keeps the hunter sliding');
// Gates carry a theme that the gate panel shows and passes to enter().
run('game.returnHub();game.gates.list=[]');
assert.equal(run(`(()=>{const g=game.gates.spawn(game,{x:HUB.spawn.x+40,y:HUB.spawn.y,instant:true,rank:'C',theme:'sunken'});return g&&g.theme})()`), 'sunken', 'gate keeps its theme');
assert.equal(run(`(()=>{const g=game.gates.spawn(game,{x:HUB.spawn.x-40,y:HUB.spawn.y,instant:true,rank:'S'});return DUNGEON_THEMES.S.some(t=>t.id===g.theme)})()`), true, 'gates roll a theme of their rank');
// Room framing: the current room is centred in the free screen area and never under the HUD.
run(`game.enter('E',false,'cartenon');game.enemies=[];(()=>{const r=game.world.rooms[3];game.player.x=r.cx;game.player.y=r.cy})();game.draw()`);
assert.ok(run('!!game.viewLayout'), 'dungeon uses the room layout');
assert.ok(Math.abs(run('game.camera.x+game.viewLayout.cx') - run('game.world.rooms[3].cx')) < 1, 'room centred horizontally (even at the map edge)');
assert.ok(Math.abs(run('game.camera.y+game.viewLayout.cy') - run('game.world.rooms[3].cy')) < 1, 'room centred vertically');
assert.equal(run('Math.round(innerWidth/2/game.renderScale)'), run('Math.round(game.viewLayout.cx)'), 'room centre is the screen centre');
// With a bottom skill bar and side touch buttons, the zoom shrinks so the room clears all of them.
run(`globalThis.__obs=[{x:340,y:560,w:600,h:240},{x:1000,y:300,w:280,h:500},{x:0,y:0,w:340,h:160},{x:560,y:0,w:160,h:30}];game.hudObstacles=()=>__obs;game.resize();game._camSnap=true;game.draw()`);
assert.equal(run(`(()=>{const L=game.viewLayout,s=game.renderScale,r=game.world.rooms[3],x0=(r.x-30-game.camera.x)*s,x1=(r.x+r.w+30-game.camera.x)*s,y0=(r.y-34-game.camera.y)*s,y1=(r.y+r.h+34-game.camera.y)*s;return __obs.every(o=>x1<=o.x||x0>=o.x+o.w||y1<=o.y||y0>=o.y+o.h)&&x0>=0&&x1<=innerWidth&&y0>=0&&y1<=innerHeight})()`), true, 'room (with walls) never overlaps the HUD');
assert.ok(run('game.viewLayout.cy*game.renderScale') < 400, 'room centred in the band above the skill bar');
assert.ok(run('game.renderScale') <= run('Mobile.scale(innerWidth,innerHeight)'), 'never zooms beyond the normal zoom');
// Moving to another room glides the camera there; corridors interpolate between both rooms.
run(`(()=>{const w=game.world,c=w.corridors.find(c=>c.a===3||c.b===3),o=c.a===3?c.b:c.a;globalThis.__c=c;globalThis.__o=o;game.player.x=c.x+c.w/2;game.player.y=c.y+c.h/2})()`);
assert.equal(run(`(()=>{const f=game.cameraFocus(),A=game.world.rooms[__c.a],B=game.world.rooms[__c.b];return f.x>=Math.min(A.cx,B.cx)-1&&f.x<=Math.max(A.cx,B.cx)+1&&f.y>=Math.min(A.cy,B.cy)-1&&f.y<=Math.max(A.cy,B.cy)+1})()`), true, 'corridor focus lies between the linked rooms');
run(`(()=>{const r=game.world.rooms[__o];game.player.x=r.cx;game.player.y=r.cy;for(let i=0;i<90;i++){game.time+=1/60;game.draw()}})()`);
assert.ok(Math.abs(run('game.camera.x+game.viewLayout.cx') - run('game.world.rooms[__o].cx')) < 2, 'camera glides to the new room');
run('delete game.hudObstacles;game.returnHub();game.draw()');
assert.equal(run('game.viewLayout'), null, 'city keeps the follow camera');
assert.ok(run('game.camera.x') >= 0, 'city camera stays clamped to the map');
console.log('Smoke tests passed: dungeon, combat, animation, facing, dash opacity, monster attributes, city gates, HUD, save, traffic, NPCs, VFX, safe spawns, world-anchored water, fog of war, room aggro, shadow army, army mana, mobile touch controls, 18 dungeon themes and centred room framing.');
