const $=s=>document.querySelector(s), canvas=$('#canvas'),ctx=canvas.getContext('2d'),mapctx=$('#map').getContext('2d');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), rand=(a,b)=>Math.random()*(b-a)+a, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class InputHandler{constructor(){this.keys={};this.mouse={x:0,y:0,down:false};window.addEventListener('keydown',e=>{if(['Tab',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(!this.keys[e.key.toLowerCase()])game.key(e.key.toLowerCase());this.keys[e.key.toLowerCase()]=true});window.addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false);canvas.addEventListener('mousemove',e=>{this.mouse.x=e.clientX;this.mouse.y=e.clientY});canvas.addEventListener('mousedown',e=>{if(e.button===0)this.mouse.down=true;if(e.button===2)game.dash()});window.addEventListener('mouseup',()=>this.mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault())}}
class SoundFX{constructor(){this.audio=null} play(type){try{this.audio??=new AudioContext();let a=this.audio,o=a.createOscillator(),g=a.createGain();o.type=type==='shadow'?'sawtooth':'triangle';o.frequency.setValueAtTime(type==='hit'?130:type==='shadow'?90:450,a.currentTime);o.frequency.exponentialRampToValueAtTime(type==='hit'?60:type==='shadow'?180:180,a.currentTime+.15);g.gain.setValueAtTime(.035,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.17);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.18)}catch{}}}
// Pixel sprites are painted once into cached canvases; no external artwork is required.
class ProceduralSprites{
 constructor(){this.cache={};for(const t of ['player','goblin','wolf','spider','orc','bear','demon','boss','shadow','npc'])this.cache[t]=this.make(t);this.playerFrames={};for(let d=0;d<8;d++)for(const pose of ['idle','walk0','walk1','walk2','walk3','dash','combo1','combo2','combo3','vital','mutilation','authority','summon'])this.playerFrames[`${d}:${pose}`]=this.makePlayer(d,pose)}
 makePlayer(dir,pose){
  const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.scale(2,2);
  // All poses are cached at 32×32; mirrored side and three-quarter views retain pixel edges.
  if(dir>=3&&dir<=5){x.translate(32,0);x.scale(-1,1)}
  const r=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(a,b,w,h)};
  const side=dir===0||dir===4,back=dir===5||dir===6||dir===7,three=dir%2===1;
  const walking=pose.startsWith('walk'),phase=walking?Number(pose.slice(-1)):0,step=[-2,0,2,0][phase]||0;
  const leaning=pose==='dash'||pose==='vital',attack=pose.startsWith('combo')||pose==='mutilation';
  const shift=leaning?2:side?1:0, bob=walking&&phase%2?1:0;
  // coat tails and moving boots are drawn independently instead of bobbing a static sprite.
  r('#070c14',9+shift,19+bob,14,8);r('#18283a',10+shift,20+bob,5,7+Math.max(0,-step));r('#233d50',17+shift,20+bob,5,7+Math.max(0,step));
  r('#090f19',10+shift+step,24+bob,5,5);r('#101a27',10+shift+step,27+bob,5,2);r('#090f19',17+shift-step,24+bob,5,5);r('#1b3040',17+shift-step,27+bob,5,2);
  r('#080e18',8+shift,11+bob,16,12);r('#182a3c',10+shift,12+bob,12,10);r('#355064',10+shift,12+bob,3,2);r('#29455a',19+shift,12+bob,3,2);r('#63dcef',15+shift,14+bob,1,7);r('#0b1621',9+shift,20+bob,14,2);
  // Head, side/back variants, and dark spiky hair.
  r('#080e17',10+shift,3+bob,12,10);r('#e1bca8',11+shift,6+bob,10,6);r('#bd8f82',11+shift,10+bob,10,2);
  r('#0b121c',9+shift,3+bob,14,4);r('#101925',10+shift,2+bob,4,5);r('#162431',15+shift,1+bob,4,5);r('#0a101a',19+shift,3+bob,4,6);
  if(back){r('#101925',10+shift,5+bob,12,7);r('#243445',12+shift,6+bob,6,1)}else if(side){r('#75edff',18+shift,8+bob,2,1);r('#131921',19+shift,10+bob,2,1)}else{r('#8cf3ff',12+shift+(three?2:0),8+bob,2,1);r('#8cf3ff',18+shift,8+bob,2,1)}
  // Arm and dagger positions encode the individual attacks and walk-cycle counter swing.
  let left=[6+shift,13+bob,4,7],right=[22+shift,13+bob,4,7];
  if(walking){left[1]+=step;right[1]-=step}
  if(pose==='combo1'){right=[24+shift,9+bob,5,4];left=[6+shift,16+bob,4,6]}
  if(pose==='combo2'){left=[4+shift,8+bob,5,4];right=[22+shift,16+bob,4,6]}
  if(pose==='combo3'){left=[4+shift,10+bob,5,4];right=[23+shift,10+bob,5,4]}
  if(pose==='vital'||pose==='dash'){left=[5+shift,15+bob,5,4];right=[23+shift,12+bob,6,4]}
  if(pose==='mutilation'){left=[5+shift,11+bob,5,4];right=[23+shift,14+bob,5,4]}
  if(pose==='authority'||pose==='summon'){left=[5+shift,12+bob,4,7];right=[22+shift,5+bob,4,9]}
  r('#0a111d',...left);r('#14283b',left[0]+1,left[1]+1,left[2]-1,left[3]-1);r('#0a111d',...right);r('#29445a',right[0]+1,right[1]+1,right[2]-1,right[3]-1);
  if(pose!=='authority'&&pose!=='summon'){
   r('#b9ffff',left[0]-2,left[1]+left[3]-2,2,7);r('#22bde5',left[0]-3,left[1]+left[3]-2,1,6);
   r('#b9ffff',right[0]+right[2],right[1]+right[3]-2,2,7);r('#22bde5',right[0]+right[2]+2,right[1]+right[3]-2,1,6);
  }else{r('#ad78ff',right[0],right[1]-3,4,3);r('#e7d9ff',right[0]+1,right[1]-4,2,2)}
  return c;
 }

 make(type){
  const c=document.createElement('canvas');c.width=48;c.height=56;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.scale(2,2);
  const r=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(a,b,w,h)};
  const pixels=(color,points)=>{for(const [a,b,w,h] of points)r(color,a,b,w,h)};
  if(type==='spider'){
   pixels('#090b13',[[2,17,8,2],[0,20,7,2],[1,23,3,3],[14,17,8,2],[17,20,7,2],[20,23,3,3],[6,11,12,12]]);
   pixels('#34283c',[[4,16,6,2],[2,20,4,2],[14,16,6,2],[18,20,4,2],[7,12,10,9]]);
   pixels('#64506a',[[9,12,6,2],[7,15,2,4],[15,15,2,4],[10,18,4,2]]);pixels('#fa465b',[[8,20,2,2],[11,21,2,2],[14,20,2,2]]);return c;
  }
  if(type==='wolf'||type==='bear'){
   const bear=type==='bear',dark=bear?'#456a80':'#172a39',base=bear?'#a7d3df':'#506d82',light=bear?'#e0f6f7':'#8ba8b5';
   pixels('#0a1018',[[4,22,5,4],[15,22,5,4],[3,12,18,11],[5,5,14,10],[4,4,4,5],[16,4,4,5]]);
   pixels(dark,[[5,20,4,5],[15,20,4,5],[4,12,16,10],[6,5,12,10]]);
   pixels(base,[[6,11,12,10],[7,6,10,8],[4,15,3,5],[17,15,3,5],[7,20,3,3],[14,20,3,3]]);
   pixels(light,[[7,6,3,3],[14,6,3,3],[8,11,8,4],[8,16,8,2]]);pixels('#ef5a69',[[8,9,2,1],[14,9,2,1]]);r('#15222c',11,13,2,2);return c;
  }
  const hero=type==='player',shadow=type==='shadow',boss=type==='boss',orc=type==='orc'||type==='goblin',npc=type==='npc';
  const dark=shadow?'#120c20':hero?'#0b111d':boss?'#260e1c':orc?'#1a2921':npc?'#2b211e':'#29141f';
  const base=shadow?'#3d205a':hero?'#233447':boss?'#692338':orc?'#536d44':npc?'#78614b':'#70364a';
  const light=shadow?'#9250b8':hero?'#486476':boss?'#a94859':orc?'#93a66c':npc?'#bc9a71':'#b96a6f';
  // silhouette, boots, coat and shoulders
  pixels('#070a10',[[7,22,4,5],[13,22,4,5],[6,11,12,12],[3,13,4,9],[17,13,4,9],[7,3,10,10],[8,1,8,2]]);
  pixels(dark,[[7,21,4,5],[13,21,4,5],[6,11,12,12],[4,13,3,8],[17,13,3,8],[7,4,10,9]]);
  pixels(base,[[8,12,8,8],[5,14,2,5],[17,14,2,5],[8,5,8,7],[8,22,2,3],[14,22,2,3]]);
  pixels(light,[[8,12,3,1],[13,12,3,1],[8,15,2,4],[14,15,2,4],[8,5,2,3],[14,5,2,3]]);
  r('#0a1118',7,20,10,2);r(light,11,20,2,1);
  if(hero){pixels('#09101a',[[6,2,12,4],[7,1,3,5],[11,0,4,5],[15,2,3,6],[6,5,3,4],[15,5,3,4],[6,21,4,4],[14,21,4,4]]);pixels('#d6b7a6',[[9,7,6,4],[10,11,4,1]]);pixels('#59eaff',[[9,8,2,1],[13,8,2,1],[11,14,1,5],[7,17,1,4],[16,17,1,4],[2,18,1,6],[21,18,1,6]]);r('#e4fcff',2,17,1,4);r('#e4fcff',21,17,1,4)}
  else if(shadow){pixels('#b96eff',[[8,8,2,1],[14,8,2,1],[11,13,2,6],[5,11,1,3],[18,11,1,3]]);pixels('#65358c',[[6,2,2,3],[16,2,2,3],[4,8,2,3],[18,8,2,3]])}
  else {pixels(boss?'#f58a95':'#ffc695',[[9,8,2,1],[13,8,2,1]]);if(boss||type==='demon'){pixels('#b04d60',[[5,2,2,5],[17,2,2,5],[8,1,8,2],[6,15,2,6],[16,15,2,6]]);pixels('#c9bbc0',[[21,13,2,12],[20,15,1,7]])}if(orc){pixels('#a7bf7c',[[7,6,2,3],[15,6,2,3],[10,10,4,2]]);pixels('#b7b8a7',[[8,11,1,2],[15,11,1,2]])}}
  return c;
 }
}
// Visual state is intentionally separate from combat timing and hitboxes.
class PlayerAnimation{
 constructor(sprites){this.sprites=sprites;this.action=null;this.remaining=0;this.duration=0;this.actionAngle=0;this.moveAngle=Math.PI/2;this.walkTime=0;this.effects=[];this.ghostClock=0}
 direction(angle){return ((Math.round(angle/(Math.PI/4))%8)+8)%8}
 play(name,p,duration,angle=p.angle){this.action=name;this.remaining=duration;this.duration=duration;this.actionAngle=angle}
 effect(type,p,angle=p.angle,variant=0){const duration=type==='authority'?.55:type==='summon'?.7:type==='vital'?.32:type==='mutilation'?.22:.25;this.effects.push({type,x:p.x,y:p.y,angle,variant,remaining:duration,duration})}
 update(dt,p){
  if(this.remaining>0)this.remaining=Math.max(0,this.remaining-dt);
  if(p.moving){this.walkTime+=dt;if(Number.isFinite(p.moveAngle))this.moveAngle=p.moveAngle}
  if(p.dashTime>0){this.ghostClock-=dt;if(this.ghostClock<=0){this.ghostClock=.045;this.effects.push({type:'ghost',x:p.x,y:p.y,angle:Math.atan2(p.dashY,p.dashX),remaining:.24,duration:.24})}}else this.ghostClock=0;
  for(const fx of this.effects)fx.remaining-=dt;this.effects=this.effects.filter(fx=>fx.remaining>0);
 }
 frame(p){const active=this.remaining>0,pose=active?this.action:p.moving?`walk${Math.floor(this.walkTime*10)%4}`:'idle';return this.sprites.playerFrames[`${this.direction(active?this.actionAngle:this.moveAngle)}:${pose}`]}
 drawGhosts(c){for(const fx of this.effects)if(fx.type==='ghost'){c.save();c.globalAlpha=.28*fx.remaining/fx.duration;c.shadowColor='#25dfff';c.shadowBlur=15;c.drawImage(this.sprites.playerFrames[`${this.direction(fx.angle)}:dash`],Math.round(fx.x-32),Math.round(fx.y-50),64,64);c.restore()}}
 draw(c){for(const fx of this.effects){if(fx.type==='ghost')continue;const t=1-fx.remaining/fx.duration,fade=Math.sin(Math.PI*t);c.save();c.translate(fx.x,fx.y);c.rotate(fx.angle);c.globalAlpha=fade;c.shadowColor=fx.type==='summon'?'#a855f7':'#00dfff';c.shadowBlur=18;c.lineCap='round';
  if(fx.type==='combo'){
   const reverse=fx.variant===2?-1:1,start=-1.35+2*t; c.strokeStyle='#67eaff';c.lineWidth=8*(1-t)+2;c.beginPath();c.arc(0,0,58,start*reverse,(start+.8)*reverse,reverse<0);c.stroke();c.strokeStyle='#efffff';c.lineWidth=2;c.beginPath();c.arc(0,0,53,start*reverse,(start+.8)*reverse,reverse<0);c.stroke();
   if(fx.variant===3){c.strokeStyle='#5dcaff';c.beginPath();c.arc(0,0,70,-start-1,-start+.2);c.stroke()}
  }else if(fx.type==='vital'){
   c.strokeStyle='#e6ffff';c.lineWidth=5*(1-t)+1;c.beginPath();c.moveTo(-30,0);c.lineTo(95+50*t,0);c.stroke();c.strokeStyle='#00d5ff';c.lineWidth=2;for(let i=-1;i<=1;i+=2){c.beginPath();c.moveTo(-20,i*9);c.lineTo(90+40*t,i*(4+12*t));c.stroke()}
  }else if(fx.type==='mutilation'){
   c.strokeStyle=fx.variant%2?'#f1ffff':'#6ce7ff';c.lineWidth=4;c.rotate((fx.variant%2?1:-1)*.5);for(let i=0;i<3;i++){c.beginPath();c.moveTo(30+i*13,-30);c.lineTo(65+i*13,30);c.stroke()}
  }else if(fx.type==='authority'){
   c.strokeStyle='#a6f7ff';c.lineWidth=6*(1-t)+1;c.beginPath();c.arc(0,0,18+142*t,0,Math.PI*2);c.stroke();c.strokeStyle='#248bdf';c.lineWidth=2;c.beginPath();c.arc(0,0,8+115*t,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4;c.fillStyle='#aefaff';c.fillRect(Math.cos(a)*140*t,Math.sin(a)*140*t,4,4)}
  }else if(fx.type==='summon'){
   c.rotate(-fx.angle);c.strokeStyle='#c785ff';c.lineWidth=3;c.beginPath();c.ellipse(0,10,25+45*t,10+18*t,0,0,Math.PI*2);c.stroke();c.strokeStyle='#7e22ce';c.beginPath();c.ellipse(0,10,18+30*t,6+10*t,0,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4+t;c.fillStyle='#dca8ff';c.fillRect(Math.cos(a)*45*t,Math.sin(a)*18*t+10,3,3)}
  }c.restore();}}
}

class ParticleSystem{constructor(){this.p=[]}burst(x,y,color,n=10){for(let i=0;i<n;i++)this.p.push({x,y,vx:rand(-100,100),vy:rand(-100,100),life:rand(.2,.7),color})}update(dt){this.p=this.p.filter(p=>(p.life-=dt)>0);for(let p of this.p){p.x+=p.vx*dt;p.y+=p.vy*dt}}draw(c){for(let p of this.p){c.globalAlpha=Math.min(1,p.life*2);c.fillStyle=p.color;c.fillRect(p.x,p.y,3,3)}c.globalAlpha=1}}
class SaveSystem{static save(g){try{localStorage.setItem('shadow-protocol-save',JSON.stringify({player:g.player.data(),army:g.army,quest:g.quest,questDone:g.questDone,questDate:g.questDate,unlocked:g.unlocked}))}catch(e){console.warn('Não foi possível salvar:',e)}}static load(){try{return JSON.parse(localStorage.getItem('shadow-protocol-save'))}catch{return null}}}
class Player{constructor(data={}){Object.assign(this,{x:900,y:790,level:1,xp:0,gold:250,points:0,stats:{FOR:5,AGI:5,VIT:5,INT:5,PER:5},weapon:0,owned:[0],hppots:3,mppots:3,hp:225,mp:125},data);this.owned=Array.isArray(this.owned)?this.owned:[0,this.weapon];if(!this.owned.includes(this.weapon))this.owned.push(this.weapon);this.x=900;this.y=790;this.cool=0;this.dashCd=0;this.slash=0;this.dashTime=0;this.invuln=0;this.stealth=0;this.angle=0;this.combo=0}get maxhp(){return 100+this.stats.VIT*25}get maxmp(){return 50+this.stats.INT*15}get rank(){return ['E','D','C','B','A','S'][Math.min(5,Math.floor(this.level/10))]}data(){let {level,xp,gold,points,stats,weapon,owned,hppots,mppots,hp,mp}=this;return {level,xp,gold,points,stats,weapon,owned,hppots,mppots,hp,mp}}}
class WorldMap{constructor(kind='hub',rank='E'){this.kind=kind;this.rank=rank;this.w=1800;this.h=1200;this.tile=this.makeTile()}makeTile(){
 const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 const hub=this.kind==='hub',snow=this.rank==='A',lava=this.rank==='S';
 const colors=hub?['#252c2b','#3d4741','#4a554a','#303b35']:snow?['#728e9b','#9db8c1','#c6d9dc','#84a1b0']:lava?['#221a20','#382a2b','#514038','#2f2428']:['#1b2529','#303d3f','#45544f','#273330'];
 x.fillStyle=colors[0];x.fillRect(0,0,64,64);
 for(let row=0;row<4;row++)for(let col=-1;col<3;col++){
  const px=col*32+(row%2)*16,py=row*16;
  x.fillStyle=colors[1];x.fillRect(px+1,py+1,30,14);x.fillStyle=colors[2];x.fillRect(px+2,py+2,26,1);x.fillRect(px+2,py+3,1,8);
  x.fillStyle=colors[3];x.fillRect(px+2,py+12,27,2);x.fillRect(px+28,py+4,2,8);
  const n=(row*17+col*23+70)%11;x.fillStyle=lava?'#a8442d':snow?'#deeff0':'#607365';x.globalAlpha=.35;
  x.fillRect(px+5+n,py+5,4,1);x.fillRect(px+16,py+7+n%3,1,2);x.globalAlpha=1;
  if(lava&&(row+col)%3===0){x.fillStyle='#a63f25';x.fillRect(px+7,py+8,7,1);x.fillRect(px+13,py+7,1,2);x.fillStyle='#e47b36';x.fillRect(px+10,py+8,3,1)}
 }
 return c;
}draw(c,time){let pat=c.createPattern(this.tile,'repeat');if(this.kind==='hub'){c.fillStyle=pat;c.fillRect(0,0,this.w,this.h);this.hub(c,time)}else{c.fillStyle='#101820';c.fillRect(0,0,this.w,this.h);c.fillStyle=pat;for(const r of this.walkable)c.fillRect(r.x,r.y,r.w,r.h);if(this.wallLayer)c.drawImage(this.wallLayer,0,0);else this.drawDungeonWalls(c);this.dungeon(c,time)};c.strokeStyle='#111a20';c.lineWidth=40;c.strokeRect(0,0,this.w,this.h)}drawDungeonWalls(c){
 const snow=this.rank==='A',lava=this.rank==='S';
 const outside=(x,y)=>!this.walkable.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
 const dark=snow?'#384e5a':lava?'#1a1119':'#101b20',mid=snow?'#617c87':lava?'#50302c':'#354742',light=snow?'#a9c8d2':lava?'#98513a':'#5b6e61';
 // Segments are only placed on the actual perimeter, so corridor openings remain visible.
 for(const r of this.walkable){
  for(let p=r.x;p<r.x+r.w;p+=16){let w=Math.min(16,r.x+r.w-p),midX=p+w/2;
   if(outside(midX,r.y-2)){c.fillStyle=dark;c.fillRect(p,r.y-12,w,16);c.fillStyle=mid;c.fillRect(p+1,r.y-10,w-2,9);c.fillStyle=light;c.fillRect(p+2,r.y-9,w-4,2)}
   if(outside(midX,r.y+r.h+2)){c.fillStyle=dark;c.fillRect(p,r.y+r.h-3,w,10);c.fillStyle=mid;c.fillRect(p+1,r.y+r.h-2,w-2,4);c.fillStyle=light;c.fillRect(p+2,r.y+r.h-2,w-4,1)}
  }
  for(let p=r.y;p<r.y+r.h;p+=16){let h=Math.min(16,r.y+r.h-p),midY=p+h/2;
   if(outside(r.x-2,midY)){c.fillStyle=dark;c.fillRect(r.x-7,p,10,h);c.fillStyle=mid;c.fillRect(r.x-5,p+1,5,h-2);c.fillStyle=light;c.fillRect(r.x-4,p+2,1,h-4)}
   if(outside(r.x+r.w+2,midY)){c.fillStyle=dark;c.fillRect(r.x+r.w-3,p,10,h);c.fillStyle=mid;c.fillRect(r.x+r.w,p+1,5,h-2);c.fillStyle=light;c.fillRect(r.x+r.w+1,p+2,1,h-4)}
  }
 }
}
hub(c,t){ // association and plaza
c.fillStyle='#26352f';c.fillRect(0,0,1800,280);for(let i=0;i<14;i++){let x=i*145+35;c.fillStyle='#263a31';c.beginPath();c.arc(x,195,55,0,7);c.fill();c.fillStyle='#395745';c.beginPath();c.arc(x-5,180,43,0,7);c.fill()}c.fillStyle='#1a2125';c.fillRect(540,55,720,285);c.fillStyle='#3a4141';c.fillRect(565,90,670,230);c.fillStyle='#252b2d';c.fillRect(540,50,720,65);c.fillStyle='#5d5548';c.fillRect(565,100,670,12);for(let i=0;i<6;i++){let x=590+i*105;c.fillStyle='#1b2527';c.fillRect(x,130,58,110);c.fillStyle='#8b704f';c.fillRect(x+7,140,44,75);c.fillStyle='#f6b76c';c.fillRect(x+12,145,34,60);c.fillStyle='#5b4a3c';c.fillRect(x+27,145,4,60)}c.fillStyle='#272320';c.fillRect(830,143,140,177);c.fillStyle='#665442';c.fillRect(842,155,116,165);c.fillStyle='#302c29';c.fillRect(849,160,102,160);c.fillStyle='#d5c4a4';c.font='bold 17px monospace';c.textAlign='center';c.fillText('HUNTERS ASSOCIATION',900,132);c.textAlign='left';for(let i=0;i<4;i++){c.fillStyle=i%2?'#58615a':'#4e5851';c.fillRect(770-i*10,320+i*18,260+i*20,16)}this.associationDetails(c,t); // plaza
c.fillStyle='#252f32';c.fillRect(490,510,820,400);c.strokeStyle='#5d6e6c';c.lineWidth=8;c.strokeRect(490,510,820,400);c.fillStyle='#39484a';c.fillRect(505,525,790,370);c.fillStyle=c.createPattern(this.tile,'repeat');c.fillRect(506,526,788,368);for(let i=0;i<8;i++){c.fillStyle='#697970';c.fillRect(510+i*100,526,5,16);c.fillRect(510+i*100,879,5,16)}this.plazaDetails(c,t);this.portal(c,730,690,'#3bcfff',t);this.portal(c,1070,690,'#ff4b57',t);this.stall(c,250,510,'#967763');this.stall(c,1420,510,'#4b6e78');this.npc(c,310,620,'MERCADOR');this.npc(c,1490,620,'CURANDEIRA');for(let i=0;i<7;i++)this.npc(c,350+i*175,1030,'')}
associationDetails(c,t){
 // Framing, banners and a lit entrance add architecture without affecting collision.
 c.fillStyle='#171f22';c.fillRect(552,60,696,27);c.fillStyle='#50605a';c.fillRect(560,65,680,7);c.fillStyle='#2b3837';
 for(let x=565;x<1230;x+=34){c.fillRect(x,72,29,9);c.fillStyle='#43504a';c.fillRect(x+2,73,25,2);c.fillStyle='#2b3837'}
 for(let i=0;i<7;i++){let x=568+i*105;c.fillStyle='#282d2b';c.fillRect(x,115,10,197);c.fillStyle='#6b6c5e';c.fillRect(x+2,115,6,180);c.fillStyle='#a09a7c';c.fillRect(x,115,10,5);c.fillRect(x,291,10,5)}
 for(let i=0;i<6;i++){let x=602+i*105;c.fillStyle='#3e332d';c.fillRect(x+9,145,4,60);c.fillRect(x-3,171,34,4);c.fillStyle='#f8da92';c.globalAlpha=.55;c.fillRect(x-3,145,7,24);c.globalAlpha=1}
 for(const x of [755,1005]){c.fillStyle='#253e4d';c.fillRect(x,135,30,80);c.fillStyle='#92a6a0';c.fillRect(x+3,139,24,2);c.fillRect(x+14,150,2,40);c.fillRect(x+8,160,14,2);c.fillStyle='#1c2931';c.fillRect(x+4,210,22,5)}
 c.fillStyle='#1a2527';c.fillRect(876,70,48,44);c.fillStyle='#bdab76';c.fillRect(881,74,38,35);c.fillStyle='#4f6265';c.fillRect(885,78,30,28);c.fillStyle='#e5d8a3';c.fillRect(898,80,4,23);c.fillRect(890,88,20,4);
 c.fillStyle='#b09c75';c.fillRect(895,165,4,145);c.fillRect(901,165,4,145);c.fillStyle='#d1b882';c.fillRect(882,231,5,5);c.fillRect(913,231,5,5);
 for(const x of [808,980]){c.fillStyle='#1a2525';c.fillRect(x,264,8,38);c.fillStyle='#d3ac68';c.shadowColor='#ffb764';c.shadowBlur=13;c.fillRect(x+1,260,6,9);c.shadowBlur=0}
}
plazaDetails(c,t){
  // Paving, braziers and flower planters give the square scale without blocking movement.
  for(const [x,y] of [[530,550],[1250,550],[530,855],[1250,855]]){
   c.fillStyle='#19272a';c.fillRect(x-10,y-18,20,36);c.fillStyle='#71807a';c.fillRect(x-8,y-16,16,4);c.fillStyle='#2d3e3b';c.fillRect(x-7,y-12,14,23);
   c.shadowColor='#ffd18a';c.shadowBlur=15;c.fillStyle='#f9af59';c.fillRect(x-4,y-23,8,8);c.fillStyle='#ffebad';c.fillRect(x-2,y-26+Math.sin(t*5+x)*2,4,7);c.shadowBlur=0;
  }
  for(const [x,y] of [[200,830],[1480,830],[250,950],[1420,950]]){
   c.fillStyle='#232d29';c.fillRect(x,y,72,28);c.fillStyle='#516453';c.fillRect(x+3,y+3,66,20);c.fillStyle='#718763';for(let i=0;i<9;i++)c.fillRect(x+7+i*7,y+5+(i%3)*3,4,4);c.fillStyle='#d1ac77';for(let i=0;i<4;i++)c.fillRect(x+10+i*16,y+10,2,2);
  }
  c.strokeStyle='#78928a88';c.lineWidth=2;c.beginPath();c.ellipse(900,710,330,140,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(900,710,315,129,0,0,Math.PI*2);c.stroke();
 }
 portal(c,x,y,color,t){c.save();c.translate(x,y);c.fillStyle='#121b24';c.beginPath();c.ellipse(0,45,66,25,0,0,Math.PI*2);c.fill();c.strokeStyle=color;c.globalAlpha=.4;c.lineWidth=2;c.beginPath();c.ellipse(0,45,62,20,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.fillStyle='#07101b';c.beginPath();c.ellipse(0,0,43,63,0,0,Math.PI*2);c.fill();c.shadowBlur=25;c.shadowColor=color;c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.ellipse(0,0,45,65,0,0,7);c.stroke();c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,32-i*8,50-i*12,t*.4+i,0,5);c.stroke()}c.fillStyle=color;for(let i=0;i<16;i++){let a=i*6.28/16+t*.3;c.globalAlpha=.4+(.4*Math.sin(t*2+i));c.fillRect(Math.cos(a)*56,Math.sin(a)*75,3+(i%2)*2,3+(i%2)*2)}c.globalAlpha=.6;c.strokeStyle=color;c.lineWidth=1;for(let i=0;i<8;i++){let a=i*Math.PI/4-t*.15;c.beginPath();c.moveTo(Math.cos(a)*48,45+Math.sin(a)*15);c.lineTo(Math.cos(a)*55,45+Math.sin(a)*19);c.stroke()}c.restore()}
stall(c,x,y,color){c.fillStyle='#322d29';c.fillRect(x,y,155,100);c.fillStyle=color;c.beginPath();c.moveTo(x-10,y);c.lineTo(x+10,y-55);c.lineTo(x+140,y-55);c.lineTo(x+165,y);c.fill();c.fillStyle='#b8a386';c.fillRect(x+5,y-8,145,9);c.fillStyle='#8c694a';c.fillRect(x+10,y+50,135,14);c.fillStyle='#3b2e29';for(let i=0;i<5;i++){c.fillRect(x+18+i*24,y+4,4,45)}c.fillStyle='#d2b899';for(let i=0;i<4;i++){c.fillRect(x+20+i*30,y-48,8,34)}c.fillStyle='#d2b578';for(let i=0;i<5;i++){c.fillRect(x+19+i*25,y+42,13,5);c.fillRect(x+23+i*25,y+35,6,6)}}npc(c,x,y,label){c.drawImage(game.sprites.cache.npc,x-24,y-40,48,56);if(label){c.fillStyle='#b9e1e4';c.font='bold 11px monospace';c.textAlign='center';c.fillText(label,x,y-48);c.textAlign='left'}}
dungeon(c,t){
 const snow=this.rank==='A',lava=this.rank==='S';
 for(const [i,room] of this.rooms.entries()){
  const {x,y,w,h,cx,cy}=room;
  // Floor insets and ruins are decorative; the actual passages remain unobstructed.
  c.strokeStyle=lava?'#9e3f2f':snow?'#d1ebed':'#61726a';c.globalAlpha=.35;c.lineWidth=2;c.strokeRect(x+22,y+22,w-44,h-44);c.globalAlpha=1;
  for(let j=0;j<4;j++){
   const px=x+35+j*110,py=y+38;c.fillStyle='#151f25';c.fillRect(px,py,22,26);c.fillStyle=lava?'#6d3027':snow?'#809eab':'#52625c';c.fillRect(px+3,py+3,16,18);
   c.fillStyle=lava?'#ff7750':snow?'#d8fbff':'#e3b779';c.shadowColor=c.fillStyle;c.shadowBlur=12;c.fillRect(px+9,py+4+Math.sin(t*5+j+i)*2,4,8);c.shadowBlur=0;
  }
  if(snow){for(const tx of [x+20,x+w-42]){c.fillStyle='#1e3745';c.fillRect(tx+8,y+79,7,19);c.fillStyle='#365b67';for(let k=0;k<3;k++){c.fillRect(tx+5-k*2,y+56+k*8,14+k*4,8)}c.fillStyle='#d4e9eb';for(let k=0;k<3;k++){c.fillRect(tx+6-k*2,y+56+k*8,12+k*4,3)}}}
  else if(lava){for(const tx of [x+18,x+w-34]){c.fillStyle='#1a1319';c.fillRect(tx,y+66,16,31);c.fillStyle='#51322e';c.fillRect(tx+2,y+68,12,24);c.fillStyle='#d75e36';c.fillRect(tx+4,y+81,8,2);c.fillRect(tx+7,y+76,2,12)}}
  else {for(const tx of [x+20,x+w-40]){c.fillStyle='#192622';c.fillRect(tx,y+75,20,17);c.fillStyle='#52665a';c.fillRect(tx+2,y+77,16,11);c.fillStyle='#889484';c.fillRect(tx+4,y+78,12,2)}}
  c.fillStyle=lava?'#bb4c2c':snow?'#e0f4f4':'#71877a';c.globalAlpha=.32;for(let j=0;j<9;j++)c.fillRect(x+45+(j*83)%330,y+95+(j*47)%130,10+(j%3)*4,2);c.globalAlpha=1;
  if(i===5){c.strokeStyle=lava?'#b43e38':'#8b5366';c.lineWidth=3;c.beginPath();c.arc(cx,cy,72,0,Math.PI*2);c.stroke();c.beginPath();c.arc(cx,cy,60,0,Math.PI*2);c.stroke();for(let j=0;j<8;j++){let a=j*Math.PI/4;c.fillStyle='#c37575';c.fillRect(cx+Math.cos(a)*65-2,cy+Math.sin(a)*65-2,4,4)}}
 }
 if(game.chest)this.portal(c,1560,650,'#3bcfff',t)
} }

// Connected room graph: randomized spanning tree, with fixed entrance and boss rooms.
class DungeonGenerator{
 static create(rank){
  const world=new WorldMap('dungeon',rank), rooms=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)rooms.push({x:col*600+90,y:row*400+60,w:420,h:280,cx:col*600+300,cy:row*400+200,seen:false});
  const corridors=[], visited=new Set([3]), frontier=[3];
  while(frontier.length){
   const current=frontier[frontier.length-1], col=current%3, row=Math.floor(current/3);
   const neighbors=[[col-1,row],[col+1,row],[col,row-1],[col,row+1]].filter(([x,y])=>x>=0&&x<3&&y>=0&&y<3&&!visited.has(y*3+x));
   if(!neighbors.length){frontier.pop();continue}
   const [x,y]=neighbors[Math.floor(Math.random()*neighbors.length)], next=y*3+x, a=rooms[current], b=rooms[next];
   if(a.cy===b.cy)corridors.push({x:Math.min(a.cx,b.cx),y:a.cy-55,w:Math.abs(a.cx-b.cx),h:110});
   else corridors.push({x:a.cx-55,y:Math.min(a.cy,b.cy),w:110,h:Math.abs(a.cy-b.cy)});
   visited.add(next);frontier.push(next);
  }
  world.rooms=rooms;world.corridors=corridors;world.walkable=[...rooms,...corridors];world.wallLayer=document.createElement('canvas');world.wallLayer.width=world.w;world.wallLayer.height=world.h;world.drawDungeonWalls(world.wallLayer.getContext('2d'));return world;
 }
}
class Enemy{constructor(x,y,type,level,boss=false){Object.assign(this,{x,y,type,level,boss,maxhp:boss?320+level*30:55+level*12,hp:boss?320+level*30:55+level*12,cool:rand(0,1),flash:0,stun:0});this.hp=this.maxhp}update(dt,g){this.cool-=dt;this.flash-=dt;this.stun-=dt;if(this.bleed>0){this.bleed-=dt;this.bleedTick=(this.bleedTick||0)-dt;if(this.bleedTick<=0){this.bleedTick=.5;g.hit(this,3+g.player.stats.INT,false);if(!g.enemies.includes(this))return}}if(this.stun>0)return;let p=g.player,near=g.soldiers.filter(s=>s.state!=='REGENERATE'&&dist(this,s)<dist(this,p)).sort((a,b)=>dist(this,a)-dist(this,b))[0];p=near||p;let d=dist(this,p);if(d<330&&d>35){let speed=this.boss?65:75;g.moveActor(this,(p.x-this.x)/d*speed*dt,(p.y-this.y)/d*speed*dt)}if(d<43&&this.cool<=0){this.cool=this.boss?1:1.3;this.swing=.25;p===g.player?g.damagePlayer((this.boss?20:8)+this.level*2):p.hurt((this.boss?20:8)+this.level*2,g)}}}
class Boss extends Enemy{constructor(x,y,type,level,name){super(x,y,type,level,true);this.name=name}}
class ShadowSoldier{
 constructor(data,i){this.data=data;this.x=game.player.x+i*20;this.y=game.player.y+50;this.cool=0;this.maxhp=90+game.player.level*8;this.hp=this.maxhp;this.state='FOLLOW';this.regen=0}
 update(dt,g,i){
  this.cool-=dt;
  if(this.state==='REGENERATE'){this.regen-=dt;if(this.regen<=0&&g.player.mp>=15){g.player.mp-=15;this.hp=this.maxhp;this.state='FOLLOW';g.particles.burst(this.x,this.y,'#a855f7',20)}return}
  let target=g.enemies.filter(e=>dist(e,this)<230).sort((a,b)=>dist(a,this)-dist(b,this))[0];
  let goal=target||{x:g.player.x+Math.cos(i*2)*55,y:g.player.y+Math.sin(i*2)*55},d=dist(this,goal);this.state=target?(d<45?'ATTACK':'ENGAGE'):'FOLLOW';
  if(d>(target?30:8))g.moveActor(this,(goal.x-this.x)/d*115*dt,(goal.y-this.y)/d*115*dt);
  if(target&&d<45&&this.cool<=0){this.cool=.8;this.swing=.22;g.hit(target,10+g.player.level*2,false,this)}
 }
 hurt(amount,g){if(this.state==='REGENERATE')return;this.hp-=amount;if(this.hp<=0){this.state='REGENERATE';this.regen=4;g.particles.burst(this.x,this.y,'#a855f7',20)}}
}
class UIManager{static open(type){game.panel=type;let p=game.player,box=$('#modal');box.classList.remove('hidden');let content='';if(type==='status'){content=`<p>Nível ${p.level} · Rank ${p.rank} · EXP ${p.xp}/${p.level*100} <br>Pontos disponíveis: <b>${p.points}</b></p>`+Object.entries(p.stats).map(([k,v])=>`<div class="stat-row"><b>${k}</b><span>${v} <button class="action" data-stat="${k}">+</button></span></div>`).join('')+`<p class="muted">ATQ ${Math.floor(10+p.stats.FOR*3.5+weapons[p.weapon].damage)} · DEF ${Math.min(60,p.stats.VIT*.8).toFixed(1)}% · CRÍTICO ${(5+p.stats.PER*1.2).toFixed(1)}% · SOMBRAS ${2+Math.floor(p.stats.INT/4)}</p>`}else if(type==='inventory'){content=`<p>OURO: <b>${p.gold} G</b></p>${p.owned.map(i=>`<div class="item-row"><b>⚔ ${weapons[i].name}</b><span>ATQ +${weapons[i].damage} <button class="action" data-equip="${i}">${i===p.weapon?'EQUIPADA':'EQUIPAR'}</button></span></div>`).join('')}<div class="item-row"><b>♥ Poção de vida</b><span>${p.hppots} unidades</span></div><div class="item-row"><b>♦ Poção de mana</b><span>${p.mppots} unidades</span></div>`}else if(type==='army'){content=`<p>SOLDADOS: ${game.army.length} / ${2+Math.floor(p.stats.INT/4)} · ${game.summoned?'INVOCADOS':'NA RESERVA'}</p>`+(game.army.length?game.army.map((s,i)=>`<div class="item-row"><b>♟ ${s.name}</b><span>${s.rank||'Normal'} · Nv. ${p.level} · ${s.kills||0} abates <button class="action" data-dismiss="${i}">DISPENSAR</button></span></div>`).join(''):'<p class="muted">Derrote inimigos e pressione E perto de seus corpos para extrair sombras.</p>')+`<button class="action" data-do="summon">INVOCAR / GUARDAR [R]</button>`}else if(type==='shop'){content=game.world.kind!=='hub'?'<p>A loja está disponível apenas no hub.</p>':`<p>OURO: ${p.gold} G</p>`+weapons.map((w,i)=>`<div class="item-row"><b>${w.name} <small>ATQ +${w.damage}</small></b><button class="action" data-buy="${i}">${i===p.weapon?'EQUIPADA':p.owned.includes(i)?'EQUIPAR':w.price+' G'}</button></div>`).join('')+`<button class="action" data-potion="hp">POÇÃO HP · 40 G</button><button class="action" data-potion="mp">POÇÃO MP · 40 G</button>`}else if(type==='gate'){content='<p>Escolha uma dungeon. O portal de saída abre após derrotar o chefe e coletar o baú.</p><div class="grid-buttons">'+['E','D','C','B','A','S'].map((r,i)=>`<button class="action" data-gate="${r}" ${i>game.unlocked?'disabled':''}>RANK ${r} ${i>game.unlocked?'🔒':''}</button>`).join('')+'</div>'}else if(type==='pause'){content='<p>O sistema está aguardando.</p><button class="action" data-do="resume">CONTINUAR</button><button class="action" data-do="save">SALVAR JOGO</button>'}else if(type==='dead'){content='<p>Você foi derrotado. O sistema lhe concedeu uma nova chance.</p><button class="action" data-do="revive">RETORNAR À ASSOCIAÇÃO</button>'}box.innerHTML=`<div class="modal-box"><div class="modal-title">◈ &nbsp; ${ {status:'STATUS',inventory:'INVENTÁRIO',army:'EXÉRCITO DAS SOMBRAS',shop:'LOJA DO SISTEMA',gate:'SELEÇÃO DE GATE',pause:'SISTEMA PAUSADO',dead:'VOCÊ FOI DERROTADO'}[type]} ${type==='dead'?'':'<button data-do="close">×</button>'}</div>${content}</div>`}static close(){game.panel=null;$('#modal').classList.add('hidden')}}
const weapons=[{name:'Adaga de Ferro',damage:5,price:0},{name:'Presa de Kasaka',damage:18,price:300},{name:'Adaga do Assassino',damage:35,price:700},{name:'Adaga do Rei Demônio',damage:65,price:1500}];
class GameEngine{constructor(){this.sprites=new ProceduralSprites();const portrait=$('#portraitCanvas').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.drawImage(this.sprites.playerFrames['2:idle'],12,0,40,50,0,0,80,100);this.sound=new SoundFX();this.particles=new ParticleSystem();this.input=new InputHandler();this.started=false;this.time=0;this.last=0;this.camera={x:0,y:0};this.resize();window.addEventListener('resize',()=>this.resize());requestAnimationFrame(t=>this.loop(t))}resize(){canvas.width=innerWidth;canvas.height=innerHeight;ctx.imageSmoothingEnabled=false}start(saved){this.player=new Player(saved?.player);this.animation=new PlayerAnimation(this.sprites);if(this.player.hp<=0){this.player.hp=this.player.maxhp;this.player.mp=this.player.maxmp}this.army=saved?.army||[];this.quest=saved?.quest||0;this.questDate=new Date().toLocaleDateString('en-CA');if(saved?.questDate!==this.questDate)this.quest=0;this.questDone=saved?.questDate===this.questDate&&(saved?.questDone||false);this.unlocked=saved?.unlocked||0;this.world=new WorldMap();this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.pendingStrikes=[];this.panel=null;this.started=true;this.bossDefeated=false;this.chest=false;$('#start').classList.add('hidden');$('#hud').classList.remove('hidden');this.message('BEM-VINDO, JOGADOR');this.sound.play('alert');this.updateHUD()}message(text){$('#notice').textContent=text;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>$('#notice').textContent='',2800)}key(k){if(!this.started)return;if(this.panel){if(this.panel==='dead')return;if(k==='escape'||k==='tab'||k==='c'||k==='i'||k==='v'||k==='b')UIManager.close();return}if(k==='c'||k==='tab')UIManager.open('status');else if(k==='i')UIManager.open('inventory');else if(k==='v')UIManager.open('army');else if(k==='b')UIManager.open('shop');else if(k==='escape')UIManager.open('pause');else if(k==='e')this.interact();else if(k==='r')this.toggleArmy();else if(k==='shift')this.dash();else if(k===' ')this.attack();else if(['1','2','3'].includes(k))this.skill(+k);else if(k==='q')this.potion('hp');else if(k==='f')this.potion('mp')}
enter(rank){UIManager.close();this.world=DungeonGenerator.create(rank);this.animation=new PlayerAnimation(this.sprites);this.player.x=300;this.player.y=600;this.bossDefeated=false;this.chest=false;this.pendingStrikes=[];this.corpses=[];this.soldiers=[];this.summoned=false;let idx=['E','D','C','B','A','S'].indexOf(rank),types=idx<2?['goblin','wolf','spider']:idx<4?['orc','orc','demon']:idx===4?['bear','wolf']:['demon','orc'];this.enemies=[];for(let i=0;i<16+idx*2;i++){let room=this.world.rooms[[0,1,2,4,6,7,8][i%7]];this.enemies.push(new Enemy(rand(room.x+50,room.x+room.w-50),rand(room.y+50,room.y+room.h-50),types[i%types.length],1+idx*8));}let names=['LOBO ALFA','ARANHA RAINHA','COMANDANTE IGRIS','KARGALGAN','URSO ALFA','REI DEMÔNIO BARAN'];this.enemies.push(new Boss(1500,600,'boss',3+idx*8,names[idx]));this.message(`GATE RANK ${rank} · SUBJUGUE O CHEFE`);this.sound.play('alert')}
moveActor(actor,dx,dy){
 const valid=(x,y)=>{if(x<30||y<30||x>this.world.w-30||y>this.world.h-30)return false;if(this.world.kind==='hub')return true;return [[-12,-12],[12,-12],[-12,12],[12,12]].every(([ox,oy])=>this.world.walkable.some(r=>x+ox>=r.x&&x+ox<=r.x+r.w&&y+oy>=r.y&&y+oy<=r.y+r.h))};
 // Small steps prevent high-speed dashes from tunneling through a wall.
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));for(let i=0;i<steps;i++){if(valid(actor.x+dx/steps,actor.y))actor.x+=dx/steps;if(valid(actor.x,actor.y+dy/steps))actor.y+=dy/steps}
}
returnHub(){this.world=new WorldMap();this.animation=new PlayerAnimation(this.sprites);this.pendingStrikes=[];this.player.x=900;this.player.y=790;this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.bossDefeated=false;this.chest=false;UIManager.close();SaveSystem.save(this);this.message('ÁREA SEGURA · ASSOCIAÇÃO DOS CAÇADORES')}
interact(){let p=this.player;if(this.world.kind==='hub'){if(dist(p,{x:730,y:690})<115||dist(p,{x:1070,y:690})<115)UIManager.open('gate');else if(dist(p,{x:310,y:620})<100)UIManager.open('shop');else if(dist(p,{x:1490,y:620})<100){p.hp=p.maxhp;p.mp=p.maxmp;this.message('HP E MP RESTAURADOS');this.sound.play('alert')}}else{let corpse=this.corpses.find(c=>dist(c,p)<75);if(corpse){corpse.tries++;let chance=Math.min(.9,.35+p.stats.INT*.02+(p.level-corpse.level)*.03);if(this.army.length>=2+Math.floor(p.stats.INT/4)){this.message('CAPACIDADE DE SOMBRAS ATINGIDA');return}this.animation.play('summon',p,.5);this.animation.effect('summon',corpse);this.particles.burst(corpse.x,corpse.y,'#bd59ff',30);this.sound.play('shadow');if(Math.random()<chance){this.army.push({name:corpse.name,rank:corpse.boss?'Comandante':'Normal',kills:0});this.corpses.splice(this.corpses.indexOf(corpse),1);this.message('EXTRAÇÃO DE SOMBRA BEM-SUCEDIDA!');SaveSystem.save(this)}else{this.message(`EXTRAÇÃO FALHOU · ${3-corpse.tries} TENTATIVAS`);if(corpse.tries>=3)this.corpses.splice(this.corpses.indexOf(corpse),1)}return}if(this.bossDefeated&&!this.chest&&dist(p,{x:1500,y:600})<90){this.chest=true;p.gold+=200+this.world.rank.charCodeAt(0);this.unlocked=Math.min(5,Math.max(this.unlocked,['E','D','C','B','A','S'].indexOf(this.world.rank)+1));this.message('BAÚ COLETADO! PORTAL DE SAÍDA ABERTO');SaveSystem.save(this)}else if(this.chest&&dist(p,{x:1560,y:650})<110)this.returnHub()}}
toggleArmy(){this.summoned=!this.summoned;this.soldiers=this.summoned?this.army.map((s,i)=>new ShadowSoldier(s,i)):[];this.message(this.summoned?'EXÉRCITO DAS SOMBRAS INVOCADO':'SOMBRAS GUARDADAS');this.animation.play('summon',this.player,.45);this.animation.effect('summon',this.player);this.sound.play('shadow')}
dash(){if(!this.started||this.panel||this.player.dashCd>0)return;let p=this.player;p.dashTime=.18;p.invuln=.3;p.stealth=1.5;p.dashCd=Math.max(.5,1.3-p.stats.AGI*.01);let dx=(this.input.keys.d||this.input.keys.arrowright?1:0)-(this.input.keys.a||this.input.keys.arrowleft?1:0),dy=(this.input.keys.s||this.input.keys.arrowdown?1:0)-(this.input.keys.w||this.input.keys.arrowup?1:0);let n=Math.hypot(dx,dy);p.dashX=n?dx/n:Math.cos(p.angle);p.dashY=n?dy/n:Math.sin(p.angle);this.animation.play('dash',p,.18,Math.atan2(p.dashY,p.dashX));this.sound.play('dash')}
attack(mult=1,range=85,area=false,forceCrit=false,bypass=false,style='combo'){
 let p=this.player;if(!p||(!bypass&&p.cool>0)||this.panel)return;
 if(!bypass)p.cool=Math.max(.16,.36-p.stats.AGI*.005);
 let variant=0;
 if(style==='combo'){p.combo=p.comboWindow>0?(p.combo%3)+1:1;p.comboWindow=.85;variant=p.combo;this.animation.play(`combo${variant}`,p,.23)}
 else if(style==='mutilation'){variant=bypass?++p.multiVisual:0;this.animation.play('mutilation',p,.16)}
 else if(style==='vital')this.animation.play('vital',p,.3);
 else if(style==='authority')this.animation.play('authority',p,.5);
 this.animation.effect(style,p,p.angle,variant);this.sound.play('slash');
 for(let e of [...this.enemies]){let d=dist(p,e),a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));if(d<range&&(area||Math.abs(diff)<1.15)){let crit=forceCrit||Math.random()<(5+p.stats.PER*1.2)/100;if(forceCrit)e.bleed=3;let damage=(10+p.stats.FOR*3.5+weapons[p.weapon].damage)*mult*(crit?1.75+p.stats.PER*.02:1)*(p.stealth>0?1.5:1);this.hit(e,damage,crit);p.stealth=0}}
}
skill(n){let p=this.player,cost=[0,15,25,35][n];if(p.mp<cost||p.cool>0){this.message('MANA INSUFICIENTE OU HABILIDADE EM RECARGA');return}p.mp-=cost;if(n===1){this.moveActor(p,Math.cos(p.angle)*55,Math.sin(p.angle)*55);this.attack(1.3,100,false,true,false,'vital')}if(n===2){p.multiVisual=0;this.attack(.7,110,false,false,false,'mutilation');p.cool=Math.max(p.cool,.42);for(let i=1;i<5;i++)this.pendingStrikes.push({delay:i*.09})}if(n===3){this.attack(1.8,160,true,false,false,'authority');for(let e of this.enemies)if(dist(e,p)<160){e.stun=1.5;let a=Math.atan2(e.y-p.y,e.x-p.x);this.moveActor(e,Math.cos(a)*40,Math.sin(a)*40)}this.particles.burst(p.x,p.y,'#71dfff',40)}}

hit(e,amount,crit,source=null){e.hp-=amount;e.flash=.12;this.particles.burst(e.x,e.y,crit?'#ffe490':'#79eaff',crit?16:7);this.floats.push({x:e.x,y:e.y-40,text:(crit?'CRÍTICO! ':'')+Math.floor(amount),life:.9,color:crit?'#ffe16c':'#fff'});this.sound.play('hit');if(e.hp<=0){if(source){source.data.kills=(source.data.kills||0)+1}this.kill(e)}}
kill(e){let p=this.player;this.enemies.splice(this.enemies.indexOf(e),1);this.corpses.push({x:e.x,y:e.y,life:12,tries:0,level:e.level,boss:e.boss,name:e.name||({goblin:'Goblin',wolf:'Lobo',spider:'Aranha',orc:'High Orc',bear:'Urso de Gelo',demon:'Demônio'}[e.type])});p.gold+=e.boss?150:rand(8,20)|0;p.xp+=e.boss?120+e.level*10:20+e.level*4;this.quest++;if(this.quest>=15&&!this.questDone){p.points+=3;this.questDone=true;this.message('MISSÃO DIÁRIA COMPLETA · +3 PONTOS')}while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.points+=5;p.hp=p.maxhp;p.mp=p.maxmp;this.message(`LEVEL UP! NÍVEL ${p.level} · +5 PONTOS`)}if(e.boss){this.bossDefeated=true;this.message('CHEFE DERROTADO · COLETE O BAÚ');this.particles.burst(e.x,e.y,'#ffb260',40)}SaveSystem.save(this)}
damagePlayer(n){let p=this.player;if(p.invuln>0)return;p.hp-=n*(1-Math.min(.6,p.stats.VIT*.008));p.invuln=.4;this.particles.burst(p.x,p.y,'#ff6579',10);this.sound.play('hit');if(p.hp<=0){p.hp=0;UIManager.open('dead')}}
potion(type){let p=this.player;if(type==='hp'&&p.hppots>0&&p.hp<p.maxhp){p.hppots--;p.hp=Math.min(p.maxhp,p.hp+p.maxhp*.5);this.message('POÇÃO DE VIDA UTILIZADA')}if(type==='mp'&&p.mppots>0&&p.mp<p.maxmp){p.mppots--;p.mp=Math.min(p.maxmp,p.mp+p.maxmp*.5);this.message('POÇÃO DE MANA UTILIZADA')}}
update(dt){let p=this.player;this.time+=dt;if(this.panel)return;let today=new Date().toLocaleDateString('en-CA');if(today!==this.questDate){this.questDate=today;this.quest=0;this.questDone=false;SaveSystem.save(this)}p.cool-=dt;p.dashCd-=dt;p.invuln-=dt;p.stealth-=dt;p.slash-=dt;p.comboWindow=(p.comboWindow||0)-dt;p.mp=Math.min(p.maxmp,p.mp+dt*1.2);for(const strike of this.pendingStrikes)strike.delay-=dt;const due=this.pendingStrikes.filter(strike=>strike.delay<=0);this.pendingStrikes=this.pendingStrikes.filter(strike=>strike.delay>0);for(const strike of due)this.attack(.7,110,false,false,true,'mutilation');let keys=this.input.keys,dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),n=Math.hypot(dx,dy);if(p.dashTime>0){p.dashTime-=dt;dx=p.dashX;dy=p.dashY;n=1;this.particles.burst(p.x,p.y,'#27bfff',2)}let speed=p.dashTime>0?570:140+p.stats.AGI*2.5;p.moving=!!n;if(n){p.moveAngle=Math.atan2(dy,dx);p.facing=dx||p.facing||1;this.moveActor(p,dx/n*speed*dt,dy/n*speed*dt)}let mx=this.input.mouse.x+this.camera.x,my=this.input.mouse.y+this.camera.y;if(this.input.mouse.x||this.input.mouse.y)p.angle=Math.atan2(my-p.y,mx-p.x);else if(n)p.angle=Math.atan2(dy,dx);this.animation.update(dt,p);if(this.input.mouse.down)this.attack();for(let e of [...this.enemies]){const x=e.x,y=e.y;e.update(dt,this);e.animMoving=Math.hypot(e.x-x,e.y-y)>.01;e.swing=Math.max(0,(e.swing||0)-dt)}for(let [i,s] of this.soldiers.entries()){const x=s.x,y=s.y;s.update(dt,this,i);s.animMoving=Math.hypot(s.x-x,s.y-y)>.01;s.swing=Math.max(0,(s.swing||0)-dt)}this.corpses=this.corpses.filter(c=>(c.life-=dt)>0);this.particles.update(dt);this.floats=this.floats.filter(f=>(f.life-=dt)>0);for(let f of this.floats)f.y-=35*dt;this.updateHUD()}
updateHUD(){let p=this.player;$('#rank').textContent='RANK '+p.rank;$('#level').textContent='LV. '+String(p.level).padStart(2,'0');$('#hpbar').style.width=clamp(p.hp/p.maxhp*100,0,100)+'%';$('#mpbar').style.width=clamp(p.mp/p.maxmp*100,0,100)+'%';$('#hptext').textContent=`${Math.ceil(p.hp)}/${p.maxhp}`;$('#mptext').textContent=`${Math.ceil(p.mp)}/${p.maxmp}`;$('#hppots').textContent='HP ×'+p.hppots;$('#mppots').textContent='MP ×'+p.mppots;$('#questcount').textContent=Math.min(15,this.quest)+' / 15';$('#questfill').style.width=Math.min(100,this.quest/15*100)+'%';let hub=this.world.kind==='hub';$('#location').textContent=hub?'HUNTERS ASSOCIATION':`DUNGEON · RANK ${this.world.rank}`;$('#locationSub').textContent=hub?'SAFE ZONE · SEOUL':'SUBJUGUE O CHEFE';$('#zoneLabel').textContent=hub?'ASSOCIAÇÃO DOS CAÇADORES':'DUNGEON RANK '+this.world.rank;let boss=this.enemies.find(e=>e.boss);$('#bossbar').classList.toggle('hidden',!boss||dist(p,boss)>420);if(boss){$('#bossname').textContent=boss.name;$('#bossfill').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%'}let hint='';if(hub){if(dist(p,{x:730,y:690})<115||dist(p,{x:1070,y:690})<115)hint='[ E ] ENTRAR NO GATE';else if(dist(p,{x:310,y:620})<100)hint='[ E ] FALAR COM MERCADOR';else if(dist(p,{x:1490,y:620})<100)hint='[ E ] CURAR HP E MP'}else if(this.corpses.some(c=>dist(c,p)<75))hint='[ E ] ERGA-SE';else if(this.bossDefeated&&!this.chest&&dist(p,{x:1500,y:600})<90)hint='[ E ] ABRIR BAÚ';else if(this.chest&&dist(p,{x:1560,y:650})<110)hint='[ E ] RETORNAR AO HUB';$('#interact').classList.toggle('hidden',!hint);$('#interact').textContent=hint}
draw(){ctx.clearRect(0,0,canvas.width,canvas.height);if(!this.started){ctx.fillStyle='#050d18';ctx.fillRect(0,0,canvas.width,canvas.height);return}let p=this.player;this.camera.x=clamp(p.x-canvas.width/2,0,Math.max(0,this.world.w-canvas.width));this.camera.y=clamp(p.y-canvas.height/2,0,Math.max(0,this.world.h-canvas.height));ctx.save();ctx.translate(-this.camera.x,-this.camera.y);this.world.draw(ctx,this.time);this.drawAtmosphere(ctx);this.animation.drawGhosts(ctx);for(let c of this.corpses){ctx.save();ctx.globalAlpha=Math.min(1,c.life);ctx.fillStyle='#160b27';ctx.beginPath();ctx.ellipse(c.x,c.y+10,24,10,0,0,7);ctx.fill();ctx.shadowColor='#a855f7';ctx.shadowBlur=16;ctx.strokeStyle='#9f4de0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.x,c.y+10,20+Math.sin(this.time*4)*2,7,0,0,7);ctx.stroke();for(let i=0;i<7;i++){let phase=(this.time*16+i*7)%30;ctx.fillStyle=i%2?'#b761f5':'#65238d';ctx.globalAlpha=Math.min(1,c.life)*(1-phase/35);ctx.fillRect(c.x+Math.sin(this.time*3+i*2)*12,c.y+8-phase,3+i%2,4+i%3)}ctx.restore()}if(this.bossDefeated&&!this.chest){ctx.fillStyle='#3b211a';ctx.fillRect(1477,580,46,32);ctx.fillStyle='#e9b950';ctx.fillRect(1477,586,46,5);ctx.fillRect(1497,582,5,29)}let actors=[...this.enemies,...this.soldiers,p].sort((a,b)=>a.y-b.y);for(let a of actors){let player=a===p,shadow=this.soldiers.includes(a);if(shadow&&a.state==='REGENERATE')continue;let type=player?'player':shadow?'shadow':a.type;ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(a.x,a.y+14,20,8,0,0,7);ctx.fill();if(shadow){ctx.shadowColor='#a33cff';ctx.shadowBlur=18}if(player&&p.stealth>0)ctx.globalAlpha=.55;let bob=a.animMoving?Math.round(Math.sin(this.time*12+a.x)*2):shadow?Math.round(Math.sin(this.time*3+a.x)*2):0;if(player)ctx.drawImage(this.animation.frame(p),Math.round(a.x-32),Math.round(a.y-50),64,64);else{ctx.save();ctx.translate(Math.round(a.x),Math.round(a.y+bob));if(a.swing>0)ctx.rotate(Math.sin(a.swing/.25*Math.PI)*.16);ctx.drawImage(this.sprites.cache[type],-24,-42,48,56);ctx.restore()}ctx.globalAlpha=1;ctx.shadowBlur=0;if(a.flash>0){ctx.fillStyle='#ffffff88';ctx.fillRect(a.x-14,a.y-32,28,35)}if(!player&&!shadow){ctx.fillStyle='#061019';ctx.fillRect(a.x-24,a.y-51,48,7);ctx.fillStyle='#713742';ctx.fillRect(a.x-23,a.y-50,46,5);ctx.fillStyle=a.boss?'#fa6d7a':'#dd596a';ctx.fillRect(a.x-22,a.y-49,44*Math.max(0,a.hp/a.maxhp),3);ctx.fillStyle='#ffb8b1';ctx.fillRect(a.x-22,a.y-49,44*Math.max(0,a.hp/a.maxhp),1)}}this.animation.draw(ctx);this.particles.draw(ctx);for(let f of this.floats){ctx.fillStyle=f.color;ctx.font='bold 16px monospace';ctx.lineWidth=3;ctx.strokeStyle='#07131b';ctx.strokeText(f.text,f.x,f.y);ctx.fillText(f.text,f.x,f.y)}ctx.restore();this.drawMap()}
drawAtmosphere(c){
 const dungeon=this.world.kind==='dungeon',snow=dungeon&&this.world.rank==='A',lava=dungeon&&this.world.rank==='S';
 c.save();c.globalAlpha=.32;c.fillStyle=snow?'#e8fbff':lava?'#ff9763':dungeon?'#78c4cc':'#b3d2c4';
 for(let i=0;i<52;i++){const x=(i*127+Math.sin(this.time*.35+i)*16)%this.world.w,y=(i*173+(snow?this.time*30:-this.time*7)*(1+i%3))%this.world.h;c.fillRect(x,(y+this.world.h)%this.world.h,i%7===0?3:2,i%7===0?3:2)}
 c.restore();
}
drawMap(){let m=mapctx;m.clearRect(0,0,160,112);m.fillStyle='#071825';m.fillRect(0,0,160,112);m.strokeStyle='#1c5669';m.strokeRect(4,4,152,104);m.strokeStyle='#143747';for(let x=20;x<160;x+=20){m.beginPath();m.moveTo(x,0);m.lineTo(x,112);m.stroke()}for(let y=20;y<112;y+=20){m.beginPath();m.moveTo(0,y);m.lineTo(160,y);m.stroke()}if(this.world.kind==='hub'){m.fillStyle='#244654';m.fillRect(45,12,70,24);m.fillRect(43,47,74,38);m.fillStyle='#54dfff';m.fillRect(64,62,4,4);m.fillStyle='#ff6371';m.fillRect(94,62,4,4)}else{for(const r of this.world.rooms)if(dist(this.player,{x:r.cx,y:r.cy})<260+this.player.stats.PER*5)r.seen=true;m.fillStyle='#17465b';for(const r of this.world.rooms.filter(r=>r.seen))m.fillRect(r.x/1800*150+5,r.y/1200*100+5,r.w/1800*150,r.h/1200*100);m.fillStyle='#32748a';for(const r of this.world.corridors)if(this.world.rooms.some(room=>room.seen&&dist({x:r.x+r.w/2,y:r.y+r.h/2},{x:room.cx,y:room.cy})<320))m.fillRect(r.x/1800*150+5,r.y/1200*100+5,r.w/1800*150,r.h/1200*100);m.fillStyle='#f16978';for(let e of this.enemies)if(dist(e,this.player)<260+this.player.stats.PER*5)m.fillRect(e.x/1800*150+5,e.y/1200*100+5,e.boss?4:2,e.boss?4:2)}m.fillStyle='#a7fcff';m.shadowColor='#58faff';m.shadowBlur=7;m.fillRect(this.player.x/1800*150+3,this.player.y/1200*100+3,5,5);m.shadowBlur=0}
loop(t){let dt=Math.min(.04,(t-this.last)/1000||0);this.last=t;if(this.started)this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t))}}
const game=new GameEngine();game.floats=[];$('#accept').onclick=()=>game.start(null);if(SaveSystem.load())$('#continue').classList.remove('hidden');$('#continue').onclick=()=>game.start(SaveSystem.load());document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{if(game.started)UIManager.open(b.dataset.panel)});$('#modal').addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;let d=b.dataset,p=game.player;if(d.do==='close'||d.do==='resume')UIManager.close();else if(d.do==='save'){SaveSystem.save(game);UIManager.close();game.message('PROGRESSO SALVO')}else if(d.do==='hub'||d.do==='revive'){p.hp=p.maxhp;p.mp=p.maxmp;game.returnHub()}else if(d.do==='summon'){game.toggleArmy();UIManager.open('army')}else if(d.stat&&p.points>0){p.stats[d.stat]++;p.points--;UIManager.open('status')}else if(d.dismiss!==undefined){game.army.splice(+d.dismiss,1);game.soldiers=[];game.summoned=false;UIManager.open('army')}else if(d.equip!==undefined){let i=+d.equip;if(p.owned.includes(i))p.weapon=i;UIManager.open('inventory')}else if(d.buy!==undefined){let i=+d.buy,w=weapons[i];if(p.owned.includes(i)){p.weapon=i}else if(p.gold>=w.price){p.gold-=w.price;p.owned.push(i);p.weapon=i;game.message('ARMA ADQUIRIDA')}UIManager.open('shop')}else if(d.potion){if(p.gold>=40){p.gold-=40;if(d.potion==='hp')p.hppots++;else p.mppots++}UIManager.open('shop')}else if(d.gate)game.enter(d.gate);if(game.started)SaveSystem.save(game)});
