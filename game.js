const $=s=>document.querySelector(s), canvas=$('#canvas'),ctx=canvas.getContext('2d'),mapctx=$('#map').getContext('2d');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), rand=(a,b)=>Math.random()*(b-a)+a, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class InputHandler{constructor(){this.keys={};this.mouse={x:0,y:0,down:false};window.addEventListener('keydown',e=>{if(['Tab',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(!this.keys[e.key.toLowerCase()])game.key(e.key.toLowerCase());this.keys[e.key.toLowerCase()]=true});window.addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false);this.stick={x:0,y:0,mag:0};this.touchAttack=false;this.touchMode=false;const fromTouch=()=>Mobile.on&&performance.now()-Mobile.lastTouch<1200;canvas.addEventListener('mousemove',e=>{if(fromTouch())return;const s=game.renderScale||1;this.mouse.x=e.clientX/s;this.mouse.y=e.clientY/s});canvas.addEventListener('mousedown',e=>{if(fromTouch())return;if(e.button===0)this.mouse.down=true;if(e.button===2)game.dash()});window.addEventListener('mouseup',()=>this.mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault())}}
class SoundFX{constructor(){this.audio=null;this.enabled=true;this.master=null} 
 // Spatial audio: volume and stereo pan follow the distance/side of the source relative to the player.
 play(type,x=0,y=0){if(!this.enabled)return;try{this.audio??=new AudioContext();if(this.audio.state==='suspended')this.audio.resume&&this.audio.resume();const a=this.audio;
  let vol=1,pan=0;const g0=liveGame();if(g0&&g0.player&&type!=='horn'&&type!=='sys'&&type!=='alert'){const d=Math.hypot(x-g0.player.x,y-g0.player.y);vol=clamp(1-d/900,.05,1);pan=clamp((x-g0.player.x)/700,-1,1)}
  const out=a.destination;let head=out;
  if(a.createStereoPanner&&pan){const pn=a.createStereoPanner();pn.pan.value=pan;pn.connect(out);head=pn}
  const g=a.createGain();g.gain.value=vol;g.connect(head);
  if(type==='horn'){const o=a.createOscillator(),o2=a.createOscillator();o.type=o2.type='square';o.frequency.value=392;o2.frequency.value=494;g.gain.setValueAtTime(.018*vol,a.currentTime);g.gain.setValueAtTime(.018*vol,a.currentTime+.32);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.4);o.connect(g);o2.connect(g);o.start();o2.start();o.stop(a.currentTime+.4);o2.stop(a.currentTime+.4);return}
  if(type==='sys'){// the System's signature notification beep: two bright square blips
   for(const [f,dt] of [[880,0],[1320,.09]]){const o=a.createOscillator();o.type='square';o.frequency.value=f;const gg=a.createGain();gg.gain.setValueAtTime(.0001,a.currentTime+dt);gg.gain.exponentialRampToValueAtTime(.05*vol,a.currentTime+dt+.01);gg.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dt+.12);o.connect(gg);gg.connect(g);o.start(a.currentTime+dt);o.stop(a.currentTime+dt+.14)}return}
  const o=a.createOscillator();o.type=type==='shadow'?'sawtooth':type==='slash'?'square':type==='dash'?'sine':'triangle';
  const f0=type==='hit'?130:type==='shadow'?90:type==='slash'?620:type==='dash'?300:type==='alert'?520:450,f1=type==='hit'?60:type==='shadow'?180:type==='slash'?180:type==='dash'?520:180;
  o.frequency.setValueAtTime(f0,a.currentTime);o.frequency.exponentialRampToValueAtTime(f1,a.currentTime+.15);
  g.gain.setValueAtTime(.035*vol,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.17);o.connect(g);o.start();o.stop(a.currentTime+.18)}catch{}}
 // Short helper for UI / system windows.
 beep(){this.play('sys')}}
// Procedural music: a tiny step sequencer built on Web Audio. Each dungeon theme gets a mood
// (drums for the citadel, drips + a low drone for the subway, a choir for S-rank maps, ambient pad
// elsewhere). No samples, no dependencies; it starts on the first user gesture and never crashes.
class MusicSystem{constructor(){this.enabled=true;this.theme=null;this.step=0;this.next=0;this.timer=null;this.intensity=0}
 setTheme(id,rank){this.theme=id;this.rank=rank;this.intensity=0}
 start(){if(this.timer||typeof window==='undefined'||!window.addEventListener)return;if(!this.enabled)return;const loop=()=>{if(!this.enabled)return;const g=liveGame();const th=g&&g.world&&g.world.theme;const hub=g&&g.world&&g.world.kind==='hub';
   if(th)this.theme=th.id;if(g&&g.world)this.rank=g.world.rank;this.intensity=clamp(this.intensity+.02,0,1);
   try{this.tick()}catch(e){} this.timer=setTimeout(loop,120)};this.timer=setTimeout(loop,400)}
 stop(){clearTimeout(this.timer);this.timer=null}
 tick(){const a=this.audio||(this.audio=new (window.AudioContext||window.webkitAudioContext)());if(a.state==='suspended')a.resume&&a.resume();const t=a.currentTime,th=this.theme||'hub';
  const scale=[0,3,5,7,10];
  const root=110,note=(i,oct=1)=>root*Math.pow(2,(scale[((i%scale.length)+scale.length)%scale.length]+12*(oct-1))/12);
  const out=a.createGain();out.gain.value=.16;out.connect(a.destination);
  const step=this.step++;
  const drum=(kind)=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(kind==='kick'?120:kind==='hat'?600:200,t);o.frequency.exponentialRampToValueAtTime(kind==='kick'?40:kind==='hat'?300:80,t+.1);g.gain.setValueAtTime(kind==='hat'?.05:.16,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(out);o.start(t);o.stop(t+.18)};
  const blip=(f,dur=.2,type='sine',v=.08)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.02)};
  const choir=(f,dur=1.6)=>{for(const det of [-6,0,6]){const o=a.createOscillator(),g=a.createGain();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.028,t+dur*.4);g.gain.linearRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05)}};
  if(th==='kargalgan'||th==='igris'||th==='volcanic'){// drums of the citadel
   if(step%4===0)drum('kick');if(step%4===2)drum('snare');if(step%2===1)drum('hat');if(step%16===8)blip(note(step/16,1),.3,'triangle',.05)}
  else if(th==='metro'||th==='mine'||th==='catacombs'){// low drone + water drips
   if(step%8===0)blip(55,1.8,'sine',.09);if(step%3===0&&Math.random()<.5)blip(1200+Math.random()*800,.12,'sine',.03);if(step%16===0)blip(82.4,1.2,'triangle',.05)}
  else if(this.rank==='S'||th==='rift'||th==='jeju'||th==='baran'){// choir for S-rank maps
   if(step%16===0)choir(note(0,1));if(step%16===8)choir(note(2,1));if(step%32===24)choir(note(4,1));if(step%8===4)blip(note(step,2),.4,'sine',.02)}
  else{if(step%8===0)blip(note(step/8,1),1.1,'sine',.05);if(step%8===4)blip(note(step/8+2,1),.9,'triangle',.035);if(step%16===12)blip(note(step/8+4,2),.5,'sine',.02)}
 }}
// Pixel art is rasterised once into cached canvases; no external artwork is required.
// PixelGrid is a tiny software painter: shapes are filled pixel by pixel (flat, or with three
// volumetric tones lit by moonlight from the upper left), then a selective-outline + rim-light
// pass gives every sprite a crisp, coloured silhouette at any facing.
const OUTLINE='#04070c',TONES={},SELOUT={},RGB={};
const hexRGB=c=>{if(RGB[c]!==undefined)return RGB[c];let h=c.slice(1);if(h.length<6)h=h.slice(0,3).split('').map(v=>v+v).join('');return RGB[c]=parseInt(h.slice(0,6),16)};
class PixelGrid{
 constructor(w,h){this.w=w;this.h=h;this.px=new Array(w*h).fill(null)}
 set(x,y,c){x|=0;y|=0;if(x>=0&&y>=0&&x<this.w&&y<this.h)this.px[y*this.w+x]=typeof c==='function'?c(x,y):c}
 get(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h?this.px[y*this.w+x]:null}
 rect(x,y,w,h,c){for(let j=Math.round(y);j<Math.round(y+h);j++)for(let i=Math.round(x);i<Math.round(x+w);i++)this.set(i,j,c)}
 disc(cx,cy,rx,ry,c){for(let j=Math.floor(cy-ry-1);j<=Math.ceil(cy+ry);j++)for(let i=Math.floor(cx-rx-1);i<=Math.ceil(cx+rx);i++){const dx=(i+.5-cx)/rx,dy=(j+.5-cy)/ry;if(dx*dx+dy*dy<=1)this.set(i,j,c)}}
 capsule(x0,y0,x1,y1,r,c){const minx=Math.floor(Math.min(x0,x1)-r-1),maxx=Math.ceil(Math.max(x0,x1)+r),miny=Math.floor(Math.min(y0,y1)-r-1),maxy=Math.ceil(Math.max(y0,y1)+r),vx=x1-x0,vy=y1-y0,l2=vx*vx+vy*vy||1;
  for(let j=miny;j<=maxy;j++)for(let i=minx;i<=maxx;i++){const px=i+.5,py=j+.5,t=clamp(((px-x0)*vx+(py-y0)*vy)/l2,0,1),dx=px-(x0+vx*t),dy=py-(y0+vy*t);if(dx*dx+dy*dy<=r*r)this.set(i,j,c)}}
 line(x0,y0,x1,y1,c){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.5));for(let k=0;k<=n;k++)this.set(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c)}
 poly(pts,c){if(pts.length<3)return;let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;for(const [x,y] of pts){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}
  for(let j=Math.floor(miny);j<=Math.ceil(maxy);j++)for(let i=Math.floor(minx);i<=Math.ceil(maxx);i++){const px=i+.5,py=j+.5;let inside=false;for(let a=0,b=pts.length-1;a<pts.length;b=a++){const [xa,ya]=pts[a],[xb,yb]=pts[b];if((ya>py)!==(yb>py)&&px<(xb-xa)*(py-ya)/(yb-ya)+xa)inside=!inside}if(inside)this.set(i,j,c)}}
 hullPts(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const q of p){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q)}
  for(const q of p.reverse()){while(up.length>1&&cross(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q)}
  return [...lo.slice(0,-1),...up.slice(0,-1)]}
 hull(pts,c){this.poly(this.hullPts(pts),c)}
 // Volumetric variants: dark / mid / light tones chosen per pixel from the surface normal.
 tone(c){return TONES[c]||(TONES[c]=[shadeHex(c,-.34),c,shadeHex(c,.2)])}
 capsuleT(x0,y0,x1,y1,r,c){const t=this.tone(c),vx=x1-x0,vy=y1-y0,l2=vx*vx+vy*vy||1;this.capsule(x0,y0,x1,y1,r,(i,j)=>{const px=i+.5,py=j+.5,k=clamp(((px-x0)*vx+(py-y0)*vy)/l2,0,1),s=(-(px-x0-vx*k)*.6-(py-y0-vy*k)*.8)/r;return s>.36?t[2]:s<-.4?t[0]:t[1]})}
 discT(cx,cy,rx,ry,c){const t=this.tone(c);this.disc(cx,cy,rx,ry,(i,j)=>{const s=-((i+.5-cx)/rx*.6+(j+.5-cy)/ry*.8);return s>.42?t[2]:s<-.45?t[0]:t[1]})}
 hullT(pts,c,lit=.27,shade=.7){const t=this.tone(c),h=this.hullPts(pts);let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;for(const [x,y] of h){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}
  const w=maxx-minx||1,hh=maxy-miny||1;this.poly(h,(i,j)=>{const u=(i+.5-minx)/w,v=(j+.5-miny)/hh;return u<lit&&v<.86?t[2]:(u>shade||v>.9)?t[0]:t[1]})}
 // Selective outline: lit (top/left) edges take a deep tint of the neighbouring colour, shadow
 // edges stay ink-black; then a rim light (upper left) and soft underside shade.
 finish(light={},dark={},outline=OUTLINE){const src=this.px.slice(),w=this.w,h=this.h,at=(x,y)=>x>=0&&y>=0&&x<w&&y<h?src[y*w+x]:null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=src[y*w+x];
   if(!c){const r=at(x+1,y),b=at(x,y+1),l=at(x-1,y),t=at(x,y-1);if(!(r||b||l||t))continue;const n=r||b;this.px[y*w+x]=n&&!l&&!t?(SELOUT[n]||(SELOUT[n]=shadeHex(n,-.74))):outline;continue}
   if((!at(x,y-1)||!at(x-1,y))&&light[c])this.px[y*w+x]=light[c];else if((!at(x,y+1)||!at(x+1,y))&&dark[c])this.px[y*w+x]=dark[c]}
  return this}
 toCanvas(scale=1){const c=document.createElement('canvas');c.width=this.w*scale;c.height=this.h*scale;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const img=scale===1&&x.createImageData?x.createImageData(this.w,this.h):null;
  if(img&&img.data){const d=img.data;for(let i=0;i<this.px.length;i++){const col=this.px[i];if(!col)continue;const v=hexRGB(col);d[i*4]=v>>16;d[i*4+1]=v>>8&255;d[i*4+2]=v&255;d[i*4+3]=255}x.putImageData(img,0,0);return c}
  for(let j=0;j<this.h;j++){let i=0;while(i<this.w){const col=this.px[j*this.w+i];if(!col){i++;continue}let k=i+1;while(k<this.w&&this.px[j*this.w+k]===col)k++;x.fillStyle=col;x.fillRect(i*scale,j*scale,(k-i)*scale,scale);i=k}}
  return c}
}
// Hero rig: joints live in a body space (r = lateral right, f = forward, h = height) and are
// projected for each of the 8 facings. Side, three-quarter and back views are therefore real
// views of the same model. The long coat has a segmented hem driven by a wave phase, so it
// sways while idle, ripples while running and flares on dashes and follow-throughs.
const HERO={coat:'#17253a',sleeve:'#1d3049',coatD:'#0c1522',coatL:'#2d4762',trim:'#46d6ff',lining:'#4a2384',shirt:'#0b1119',pants:'#121c2a',pantsL:'#22334b',boot:'#080a10',bootL:'#2c3647',skin:'#ecc8b2',skinD:'#c99883',hair:'#0b0f18',hairL:'#25344c',eye:'#a8f8ff',eyeG:'#22c8f0',blade:'#e2fdff',bladeE:'#4fd5ff',bladeV:'#9a72ff',grip:'#1a1f2b',guard:'#8798ad',glove:'#0d1119',belt:'#1d2534',buckle:'#a9bfd2',strap:'#2a3446'};
const HERO_LIGHT={[HERO.coat]:HERO.coatL,[HERO.sleeve]:'#355476',[HERO.pants]:HERO.pantsL,[HERO.boot]:HERO.bootL,[HERO.hair]:HERO.hairL,[HERO.skin]:'#fbe2d2',[HERO.shirt]:'#1b2533',[HERO.glove]:'#283041',[HERO.belt]:'#33415a'};
const HERO_DARK={[HERO.coat]:HERO.coatD,[HERO.sleeve]:'#101b2b',[HERO.skin]:HERO.skinD,[HERO.pants]:'#0a111b',[HERO.hair]:'#06080e'};
const HERO_IDLE=6,HERO_WALK=8,HERO_ATTACKS=['combo1','combo2','combo3','vital','mutilation','authority'];
const HERO_POSES=['idle',...[1,2,3,4,5].map(i=>'idle'+i),...Array.from({length:HERO_WALK},(_,i)=>'walk'+i),'dash','dash2',...HERO_ATTACKS.flatMap(a=>[a+'_w',a,a+'_f']),'summon_w','summon','hurt'];
const WINDUP_POSES=new Set(HERO_ATTACKS);
function heroPose(pose){
 // Follow-through frames extrapolate the swing past the strike pose (arcs keep travelling).
 if(pose.endsWith('_f')){const base=pose.slice(0,-2),S=heroPose(base),W=heroPose(base+'_w'),x=(a,b)=>a+(a-b)*.38,out={...S,twist:x(S.twist,W.twist),lean:S.lean+1.2,crouch:S.crouch*.7,tail:S.tail+3,wave:S.wave+1.5,flutter:S.flutter+.7,hands:{},blades:{}};
  for(const s of ['L','R']){const h=S.hands[s].map((v,i)=>x(v,W.hands[s][i]));out.hands[s]=[clamp(h[0],-13,13),clamp(h[1],-12,18),clamp(h[2],12,40)];const b=S.blades[s].map((v,i)=>x(v,W.blades[s][i])),n=Math.hypot(...b)||1;out.blades[s]=b.map(v=>v/n)}
  return out}
 const P={bob:0,lean:0,crouch:0,twist:0,tail:1,wave:0,flutter:.55,feet:{L:[-3.6,-.6,0],R:[3.6,.9,0]},hands:{L:[-8.3,1.5,17.5],R:[8.3,1.5,17.5]},blades:{L:[-.18,.55,-.82],R:[.18,.55,-.82]},orb:null};
 const k=Number(pose.replace(/\D/g,'')||0);
 if(pose.startsWith('idle')){const ph=k/HERO_IDLE*Math.PI*2,b=(1-Math.cos(ph))/2*.9;P.bob=b;P.hands.L[2]+=b*.6;P.hands.R[2]+=b*.6;P.hands.L[0]-=Math.sin(ph)*.3;P.hands.R[0]+=Math.sin(ph)*.3;P.tail=1+b*.8;P.wave=ph}
 else if(pose.startsWith('walk')){const ph=k/HERO_WALK*Math.PI*2,s=Math.sin(ph),c=Math.cos(ph);
  P.lean=2.8;P.bob=1.3*Math.abs(c)-.5;P.tail=4+1.6*Math.sin(ph*2);P.wave=ph*2;P.flutter=1.3;
  P.feet.L=[-3.3,7*s,3.6*Math.max(0,c)];P.feet.R=[3.3,-7*s,3.6*Math.max(0,-c)];
  P.hands.L=[-7.6,-6*s+1,20.5+1.5*Math.max(0,-s)];P.hands.R=[7.6,6*s+1,20.5+1.5*Math.max(0,s)];
  P.blades.L=[-.1,-.55,-.8];P.blades.R=[.1,-.55,-.8]}
 else if(pose==='dash'||pose==='dash2'){const two=pose==='dash2';Object.assign(P,{lean:6,crouch:3,tail:two?11.5:10,wave:two?2.4:.4,flutter:2.4});P.feet.L=two?[-3,4,3]:[-3,-9,2.5];P.feet.R=two?[3,-8,2]:[3,5.5,3.5];P.hands.L=[-6.5,-8.5,20];P.hands.R=[6.5,-7.5,22];P.blades.L=[-.15,-.85,-.35];P.blades.R=[.15,-.85,-.3]}
 else if(pose==='combo1_w'){Object.assign(P,{twist:-.6,lean:1,wave:.5,flutter:1});P.hands.R=[9.5,-4,28];P.blades.R=[.3,-.4,.86];P.hands.L=[-7,4,20];P.feet.R=[3.6,2.5,0]}
 else if(pose==='combo1'){Object.assign(P,{twist:.55,lean:3.5,tail:4,wave:2.2,flutter:1.5});P.hands.R=[1,12.5,24];P.blades.R=[-.75,.62,.1];P.hands.L=[-8,-2,19];P.feet.R=[3.6,5.5,0];P.feet.L=[-3.6,-4,0]}
 else if(pose==='combo2_w'){Object.assign(P,{twist:.6,lean:1,wave:.5,flutter:1});P.hands.L=[-2.5,3.5,28];P.blades.L=[.55,.2,.8];P.hands.R=[8,-3,20]}
 else if(pose==='combo2'){Object.assign(P,{twist:-.6,lean:3.5,tail:4,wave:2.2,flutter:1.5});P.hands.L=[-10,9.5,23];P.blades.L=[-.55,.83,.05];P.hands.R=[8,-4,20];P.feet.L=[-3.6,5.5,0];P.feet.R=[3.6,-4,0]}
 else if(pose==='combo3_w'){Object.assign(P,{bob:1,lean:-1,wave:.8,flutter:1});P.hands.L=[-5,6,32];P.hands.R=[5,6,32];P.blades.L=[-.45,.35,.82];P.blades.R=[.45,.35,.82]}
 else if(pose==='combo3'){Object.assign(P,{crouch:4,lean:5.5,tail:7,wave:2.6,flutter:1.9});P.hands.L=[-7,10.5,15];P.hands.R=[7,10.5,15];P.blades.L=[-.35,.6,-.7];P.blades.R=[.35,.6,-.7];P.feet.L=[-5,-5,0];P.feet.R=[5,6,0]}
 else if(pose==='vital_w'){Object.assign(P,{crouch:2.5,lean:-1,wave:.4,flutter:1});P.hands.R=[7,-7,24];P.blades.R=[0,.97,.2];P.hands.L=[-7,6,24];P.feet.R=[3.6,3,0];P.feet.L=[-3.6,-3,0]}
 else if(pose==='vital'){Object.assign(P,{crouch:3,lean:7.5,tail:9,wave:2.4,flutter:2.1});P.hands.R=[2.5,16.5,26];P.blades.R=[0,1,.05];P.hands.L=[-7,-6,21];P.feet.R=[3.6,9,1];P.feet.L=[-3.6,-7.5,0]}
 else if(pose==='mutilation_w'){Object.assign(P,{lean:1,bob:.5,wave:.6,flutter:1});P.hands.L=[-6,5,31];P.hands.R=[6,5,31];P.blades.L=[-.5,.3,.8];P.blades.R=[.5,.3,.8]}
 else if(pose==='mutilation'){Object.assign(P,{twist:.3,lean:4.5,crouch:2,tail:6,wave:2.3,flutter:1.7});P.hands.L=[3,10.5,20];P.hands.R=[-3,10.5,23];P.blades.L=[.72,.6,-.3];P.blades.R=[-.72,.6,.3];P.feet.R=[3.6,5,0];P.feet.L=[-3.6,-4,0]}
 else if(pose==='authority_w'){Object.assign(P,{bob:1,lean:-1,orb:'blue',wave:.7,flutter:1.2});P.hands.R=[5,3,45];P.hands.L=[-6,5,27]}
 else if(pose==='authority'){Object.assign(P,{lean:4.5,crouch:2,tail:6,orb:'blue',wave:2.5,flutter:2});P.hands.R=[3,12.5,27];P.hands.L=[-3,12.5,27];P.feet.R=[3.6,5,0];P.feet.L=[-3.6,-4,0]}
 else if(pose==='summon_w'){Object.assign(P,{crouch:1.5,orb:'purple',wave:1,flutter:1.2,tail:2});P.hands.R=[7,4,33];P.hands.L=[-7,4,33]}
 else if(pose==='summon'){Object.assign(P,{bob:.5,orb:'purple',wave:2.4,flutter:1.8,tail:5});P.hands.R=[6,4,43];P.hands.L=[-9,3,22]}
 else if(pose==='hurt'){Object.assign(P,{lean:-3.5,crouch:1,tail:3,wave:1.6,flutter:1.4});P.hands.L=[-9.5,-2,24];P.hands.R=[9.5,-2,24];P.feet.L=[-4,-3,0];P.feet.R=[4,1,0]}
 return P;
}
function makeHeroFrame(dir,pose){
 const g=new PixelGrid(64,64),C=HERO,P=heroPose(pose),a=dir*Math.PI/4,Fx=Math.cos(a),Fy=Math.sin(a),Rx=-Fy,Ry=Fx;
 const proj=(r,f,h)=>[32+r*Rx+f*Fx,59-h+(r*Ry+f*Fy)*.45,r*Ry+f*Fy];
 const hipH=19-P.crouch+P.bob*.4,ct=Math.cos(P.twist),st=Math.sin(P.twist);
 // Upper body transform: twist around the spine, lean proportional to height, breathing bob.
 const U=(r,f,h)=>{const rr=r*ct-f*st,ff=r*st+f*ct;return proj(rr,ff+P.lean*Math.max(0,h-19)/15,h-19+hipH+P.bob*Math.max(0,h-19)/15)};
 const parts=[],add=(depth,fn)=>parts.push({depth,fn}),avg=pts=>pts.reduce((s,p)=>s+p[2],0)/pts.length;
 // Legs with two-bone IK; the knee always bends forward along the facing. Shaded trousers,
 // boots with a toe-cap highlight and a dagger strap on the right thigh.
 for(const side of ['L','R']){const s=side==='L'?-1:1,hip=[s*3.3,0,hipH],ft=[...P.feet[side]];ft[2]+=1.6;
  let dx=ft[0]-hip[0],df=ft[1]-hip[1],dh=ft[2]-hip[2],d=Math.hypot(dx,df,dh),L=9.7;if(d>2*L){const k=2*L/d;dx*=k;df*=k;dh*=k;d=2*L}
  const bend=Math.sqrt(Math.max(0,L*L-d*d/4)),knee=[hip[0]+dx/2,hip[1]+df/2+bend,hip[2]+dh/2],foot=[hip[0]+dx,hip[1]+df,hip[2]+dh];
  const ph=proj(...hip),pk=proj(...knee),pf=proj(...foot),heel=proj(foot[0],foot[1]-1.2,foot[2]-1.2),toe=proj(foot[0],foot[1]+3.4,foot[2]-1.3),strap=proj((hip[0]+knee[0])/2,(hip[1]+knee[1])/2,(hip[2]+knee[2])/2);
  add(avg([ph,pk,pf])-.2,()=>{g.capsuleT(ph[0],ph[1],pk[0],pk[1],2.6,C.pants);g.capsuleT(pk[0],pk[1],pf[0],pf[1],2.2,C.pants);g.capsule(heel[0],heel[1],toe[0],toe[1],2,C.boot);g.capsule(pf[0],pf[1],heel[0],heel[1]-1,2,C.boot);g.set(toe[0],toe[1]-1,C.bootL);
   if(side==='R'){g.line(strap[0]-2,strap[1],strap[0]+2,strap[1],C.strap);g.set(strap[0],strap[1]-1,C.buckle)}})}
 // Torso, belt and the long coat (back shell + two front panels leave a readable opening).
 const ring=(rx,rf,h,n=10)=>Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2;return U(Math.cos(t)*rx,Math.sin(t)*rf,h)});
 const torso=[...ring(5,2.8,20),...ring(6.4,2.8,31)];add(0,()=>{g.hull(torso,C.shirt);const b=[...ring(5.4,3,20.5),...ring(5.4,3,22.2)];g.hull(b,C.belt);const bk=U(0,3.1,21.4);if(Fy>-.3)g.rect(bk[0]-1,bk[1]-1,2,2,C.buckle)});
 const hemH=6+P.tail*.45,back=[U(-7.5,0,32),U(7.5,0,32),U(-7.5,-2.6,32),U(7.5,-2.6,32),U(0,-3,32),U(-6.8,0,21),U(6.8,0,21),U(-6.8,-3,21),U(6.8,-3,21),U(-8.4,0,8),U(8.4,0,8),U(-8.7,-3.5-P.tail*.5,hemH),U(8.7,-3.5-P.tail*.5,hemH),U(0,-4.6-P.tail,hemH-1)];
 // Segmented hem: seven points ripple with the wave phase (secondary motion of the cloth).
 const hem=[];for(let i=0;i<=6;i++){const r=-8.6+i*17.2/6,cf=1-Math.abs(r)/8.6,wv=Math.sin(P.wave+i*1.15)*P.flutter;hem.push(U(r,-3.5-P.tail*(.5+.5*cf)-wv*.7,hemH-.4-cf*.6-Math.max(0,wv)*.9))}
 add(avg(back)-.6,()=>{g.hullT(back,C.coat);for(let i=0;i<6;i++)g.capsuleT(hem[i][0],hem[i][1],hem[i+1][0],hem[i+1][1],1.5,C.coat);
  if(Fy<-.2){const a1=U(0,-3.2,31),a2=U(0,-4.4-P.tail,hemH);g.line(a1[0],a1[1],a2[0],a2[1],C.coatD);const s1=U(-4,-3,30),s2=U(4,-3,30);g.line(s1[0],s1[1],s2[0],s2[1],C.coatD);for(const s of [-1,1]){const f1=U(s*4.5,-3.2,19),f2=U(s*5.8,-3.8-P.tail*.6,hemH+1);g.line(f1[0],f1[1],f2[0],f2[1],shadeHex(C.coat,-.25))}}
  if(P.tail>3)for(let i=0;i<6;i++)g.line(hem[i][0],hem[i][1],hem[i+1][0],hem[i+1][1],C.lining);
  for(let i=0;i<6;i++)g.line(hem[i][0],hem[i][1]+1.2,hem[i+1][0],hem[i+1][1]+1.2,C.trim)});
 for(const s of [-1,1]){const pts=[U(s*1.8,3,32),U(s*7.5,2.2,32),U(s*7.5,0,32),U(s*1.6,3.3,21),U(s*6.8,3,21),U(s*6.8,0,21),U(s*2.6,3.6,10),U(s*8.4,3,9),U(s*8.4,0,8)];
  add(avg(pts)+.4,()=>{g.hullT(pts,C.coat);const e1=U(s*1.8,3.1,32),e2=U(s*2.6,3.7,10);if(Fy>.15){g.line(e1[0],e1[1],e2[0],e2[1],C.trim);const f1=U(s*5,3.3,19),f2=U(s*6.2,3.2,10);g.line(f1[0],f1[1],f2[0],f2[1],shadeHex(C.coat,-.25))}const m1=U(s*2.6,3.6,10),m2=U(s*8.4,3,9);g.line(m1[0],m1[1],m2[0],m2[1],C.trim)})}
 // Arms (shaded sleeves, cuffs, gloves) and the twin daggers / energy orbs. The right blade
 // (Kasaka's Fang) carries a violet edge, the left one the cyan Knight Killer glow.
 for(const side of ['L','R']){const s=side==='L'?-1:1,sh=U(s*7,0,30.5),sr=[s*7*ct,s*7*st],hand=[...P.hands[side]];
  {const vx=hand[0]-sr[0],vy=hand[1]-sr[1],vz=hand[2]-30.5,dd=Math.hypot(vx,vy,vz);if(dd>18.5){const k=18.5/dd;hand[0]=sr[0]+vx*k;hand[1]=sr[1]+vy*k;hand[2]=30.5+vz*k}}
  const hp=proj(...hand),mid=[(sr[0]+hand[0])/2,(sr[1]+hand[1])/2,(30.5+hand[2])/2],dd=Math.hypot(hand[0]-sr[0],hand[1]-sr[1],hand[2]-30.5),bend=Math.sqrt(Math.max(0,57-dd*dd/4)),el=proj(mid[0]+s*bend*.55,mid[1]-bend*.45,mid[2]-bend*.55);
  const bl=P.blades[side],tip=proj(hand[0]+bl[0]*11.5,hand[1]+bl[1]*11.5,hand[2]+bl[2]*11.5),gb=proj(hand[0]-bl[0]*2.6,hand[1]-bl[1]*2.6,hand[2]-bl[2]*2.6),gd=proj(hand[0]+bl[0]*1.4,hand[1]+bl[1]*1.4,hand[2]+bl[2]*1.4);
  const cuff=[el[0]+(hp[0]-el[0])*.72,el[1]+(hp[1]-el[1])*.72];
  add(avg([sh,el,hp])+.3,()=>{g.capsuleT(sh[0],sh[1],el[0],el[1],2.5,C.sleeve);g.capsuleT(el[0],el[1],hp[0],hp[1],2.1,C.sleeve);g.disc(cuff[0],cuff[1],2.2,1.6,C.coatD);g.disc(hp[0],hp[1],1.8,1.8,C.glove);
   if(P.orb){const oc=P.orb==='purple'?['#7d2fd0','#d9b5ff']:['#1fb6e8','#e8ffff'];g.disc(hp[0],hp[1]-1,2.8,2.8,oc[0]);g.disc(hp[0],hp[1]-1,1.5,1.5,oc[1])}
   else{g.capsule(gb[0],gb[1],hp[0],hp[1],.9,C.grip);g.disc(gd[0],gd[1],1.4,1.2,C.guard);g.capsule(gd[0],gd[1],tip[0],tip[1],1,side==='R'?C.bladeV:C.bladeE);g.line(gd[0],gd[1],tip[0],tip[1],C.blade);g.set(tip[0],tip[1],'#ffffff')}})}
 // Neck, collar and head; hair mass sits behind the face so the facing reads at a glance.
 const neck0=U(0,0,31),neck1=U(0,.6,35),hc=U(0,.9,39.6);
 add(.5,()=>{g.capsule(neck0[0],neck0[1],neck1[0],neck1[1],1.9,C.skinD);g.hullT([...ring(4.4,2.7,31.4,8),...ring(4,2.4,34.6,8)],C.coat);const c1=U(-3.6,1.6,34.6),c2=U(3.6,1.6,34.6);if(Fy>-.3)g.line(c1[0],c1[1],c2[0],c2[1],C.trim);
  const [hx,hy]=hc,fsx=Fx,fsy=Fy*.45,face=Fy>-.5,sp=(dr,df,dh)=>[hx+dr*Rx+df*Fx,hy-dh+(dr*Ry+df*Fy)*.45];
  const spike=(tip)=>{const t=sp(...tip),r=sp(tip[0]*.45,tip[1]*.45,tip[2]*.45),vx=t[0]-r[0],vy=t[1]-r[1],l=Math.hypot(vx,vy)||1,nx=-vy/l*2,ny=vx/l*2;g.poly([[r[0]+nx,r[1]+ny],[r[0]-nx,r[1]-ny],t],C.hair);if(vx<-.5||vy<-1)g.line(r[0]+nx*.4,r[1]+ny*.4,t[0]*.7+r[0]*.3,t[1]*.7+r[1]*.3,C.hairL)};
  const spikes=[[0,-1,9.6],[-3.6,-2,8.6],[3.6,-2,8.6],[0,-5.6,6.6],[-4.6,-4.6,5],[4.6,-4.6,5],[-6.6,-1,4],[6.6,-1,4],[0,-7.2,2],[-3,-6.6,.8],[3,-6.6,.8],[-2.6,4.8,6],[1.6,5.6,5.4],[4.2,4,6.4],[-5,2.6,6]];
  for(const s of spikes)if(s[1]<-2)spike(s);
  g.disc(hx-fsx*1.3,hy-.7-fsy*1.3,6.3,6.1,C.hair);
  if(face){g.discT(hx+fsx*1.5,hy+.9+fsy*1.6,4.4+Math.abs(Fy)*.4,5,C.skin);if(Math.abs(Fx)>.6)g.set(hx+Fx*5.7,hy+2,C.skin)}
  else g.disc(hx,hy+4.2,2.4,1.3,C.skinD);
  g.disc(hx-fsx*.7,hy-2.8,5.9,3.4,C.hair);for(const s of spikes)if(s[1]>=-2)spike(s);
  const hl=sp(-2.4,-1.5,5.4);g.line(hl[0]-1.5,hl[1]+.5,hl[0]+1.5,hl[1]-.5,C.hairL);
  if(face){for(const s of [-1,1]){const n=Fy*.85+s*Ry*.5;if(n<.05)continue;const e=sp(s*2.2,5.6,-.4);g.rect(e[0]-1,e[1],2,1,C.eye);if(Math.abs(Fx)>.3)g.set(e[0]-1,e[1]+1,C.eyeG);g.rect(e[0]-1,e[1]-1.2,2,1,C.hair)}
   if(Fy>.3){const m=sp(0,5.8,-3.3);g.set(m[0],m[1],C.skinD)}}});
 parts.sort((p,q)=>p.depth-q.depth);for(const p of parts)p.fn();
 return finishAuto(g,[C.eye,C.eyeG,C.blade,'#ffffff',C.trim,C.lining,C.bladeV,C.bladeE,'#e8ffff','#d9b5ff','#1fb6e8','#7d2fd0'],HERO_LIGHT,HERO_DARK);
}
// Monster and NPC rigs (side view, facing right; flipped at draw time). Every type has
// idle, a 4-frame locomotion cycle, an attack wind-up and a strike pose.
const MONSTER_POSES=['idle0','idle1','move0','move1','move2','move3','windup','strike'];
const shadeHex=(hex,f)=>{const n=parseInt(hex.slice(1,7),16),r=n>>16,g=n>>8&255,b=n&255,t=f>0?255:0,a=Math.abs(f),m=v=>Math.round(v+(t-v)*a).toString(16).padStart(2,'0');return '#'+m(r)+m(g)+m(b)};
function finishAuto(g,glow=[],lo={},dk={}){const light={},dark={},skip=new Set(glow);for(const c of new Set(g.px))if(c&&!skip.has(c)){light[c]=lo[c]||shadeHex(c,.28);dark[c]=dk[c]||shadeHex(c,-.32)}return g.finish(light,dark)}
function monAnim(pose){const n=Number(pose.replace(/\D/g,'')||0);
 if(pose.startsWith('idle'))return {bob:n,stride:0,lift:0,lean:0,arm:0,open:0,swing:0};
 if(pose.startsWith('move')){const ph=n/4*Math.PI*2;return {bob:Math.abs(Math.cos(ph))*1.3,stride:Math.sin(ph),lift:Math.cos(ph),lean:1.5,arm:0,open:.2,swing:Math.sin(ph)}}
 if(pose==='windup')return {bob:.5,stride:-.2,lift:0,lean:-2.5,arm:-1,open:.7,swing:0};
 return {bob:0,stride:.7,lift:0,lean:4,arm:1,open:1,swing:0};
}
function drawHumanoid(g,pose,o,k){
 const A=monAnim(pose),cx=g.w/2,gy=o.gy*k,L=o.leg*k,T=o.torso*k,HR=o.head*k,BW=o.bw*k,AL=o.arm*k,far=shadeHex(o.body,-.35),farSkin=shadeHex(o.skin,-.3);
 const hipY=gy-L+A.bob*.5*k,hipX=cx-1*k,shX=hipX+A.lean*k,shY=hipY-T-A.bob*.4*k,hx=shX+HR*.3+A.lean*.3*k,hy=shY-HR*.85;
 const leg=(s,col)=>{const fx=hipX+s*A.stride*L*.5,lift=Math.max(0,s*A.lift)*3*k,fy=gy-1.5*k-lift,kx=(hipX+fx)/2+2.4*k,ky=(hipY+fy)/2;g.capsule(hipX,hipY,kx,ky,2.6*k,col);g.capsule(kx,ky,fx,fy,2.2*k,col);g.capsule(fx-1*k,fy+.5*k,fx+3.2*k,fy+.5*k,1.9*k,o.boot||shadeHex(col,-.4))};
 const armAng=s=>A.arm<0?-2.3+(s<0?.5:0):A.arm>0?.15+(s<0?.9:0):1.25+s*A.swing*.55;
 const arm=(s,col,hand)=>{const a=armAng(s),ex=shX+Math.cos(a-.35)*AL*.5,ey=shY+2*k+Math.sin(a-.35)*AL*.5,hx2=shX+Math.cos(a)*AL,hy2=shY+2*k+Math.sin(a)*AL;g.capsule(shX,shY+2*k,ex,ey,2.3*k,col);g.capsule(ex,ey,hx2,hy2,2*k,col);g.disc(hx2,hy2,1.9*k,1.9*k,hand);return [hx2,hy2,a]};
 // Behind the body: wings, cape, far leg and far arm.
 if(o.wings){const wy=shY+2*k,flap=A.arm<0?-4*k:A.bob*k;g.poly([[shX-2*k,wy],[shX-16*k,wy-12*k+flap],[shX-22*k,wy-2*k+flap],[shX-17*k,wy+2*k],[shX-12*k,wy+8*k],[shX-5*k,wy+6*k]],o.wings);g.line(shX-2*k,wy,shX-16*k,wy-12*k+flap,shadeHex(o.wings,.3))}
 if(o.cape)g.poly([[shX-3*k,shY],[shX+2*k,shY],[hipX-3*k-A.lean*.5*k,gy-4*k],[hipX-11*k-A.lean*k-A.stride*2*k,gy-2*k]],o.cape);
 leg(-1,far);if(!o.twoHand)arm(-1,far,farSkin);
 leg(1,o.legs||o.body);
 g.capsule(hipX,hipY,shX,shY+1*k,BW/2,o.body);
 if(o.armor){g.capsule(hipX+.5*k,hipY-2*k,shX+.5*k,shY+3*k,BW/2-1.6*k,o.armor);g.disc(shX,shY+1.5*k,BW*.42,3.2*k,o.armorL||shadeHex(o.armor,.2))}
 if(o.belt)g.rect(hipX-BW/2,hipY-2*k,BW,2.2*k,o.belt);
 g.disc(hx,hy,HR,HR*1.02,o.skin);
 if(o.ears){g.poly([[hx-HR*.3,hy-HR*.3],[hx-HR*1.9,hy-HR*1.1],[hx-HR*.1,hy+HR*.3]],o.skin)}
 if(o.hair)g.disc(hx-HR*.25,hy-HR*.35,HR*.95,HR*.75,o.hair);
 if(o.helm){g.disc(hx,hy,HR*1.08,HR*1.1,o.helm);g.rect(hx+HR*.15,hy-HR*.2,HR*.95,HR*.3,'#0a0508');if(o.plume)g.poly([[hx-HR*.4,hy-HR],[hx+HR*.3,hy-HR*1.25],[hx-HR*2.6,hy-HR*1.1+A.bob*k],[hx-HR*2.2,hy-HR*.2]],o.plume)}
 if(o.horns){g.poly([[hx-HR*.1,hy-HR*.7],[hx+HR*.5,hy-HR*.9],[hx-HR*.2,hy-HR*2.1]],o.horns);g.poly([[hx-HR*.7,hy-HR*.6],[hx-HR*.2,hy-HR*.9],[hx-HR*1.2,hy-HR*2]],shadeHex(o.horns,-.25))}
 if(o.hood)g.poly([[hx-HR*1.1,hy+HR*.2],[hx-HR*.6,hy-HR*1.3],[hx+HR*.5,hy-HR*1.25],[hx+HR*1.05,hy-HR*.1],[hx+HR*.4,hy-HR*.5],[hx-HR*.5,hy+HR*.9]],o.hood);
 const eye=o.eye;if(eye){g.rect(hx+HR*.35,hy-HR*.15,Math.max(1,1.6*k),Math.max(1,1*k),eye);if(!o.helm)g.rect(hx+HR*.35,hy-HR*.15-1.4*k,1.6*k,.9*k,shadeHex(o.skin,-.45))}
 if(o.tusks){g.rect(hx+HR*.55,hy+HR*.35,1*k,1.8*k,'#e8e2c8');g.rect(hx+HR*.15,hy+HR*.4,1*k,1.5*k,'#e8e2c8')}
 if(A.open>.5&&!o.helm)g.rect(hx+HR*.45,hy+HR*.45,HR*.5,Math.max(1,1*k),'#2a0a0e');
 // Near arm and weapon in front of the torso.
 const [wx,wy,wa]=arm(1,o.sleeve||o.body,o.skin);if(o.twoHand)g.disc(wx-1*k,wy+1*k,1.8*k,1.8*k,o.skin);
 const wpn=o.weapon,da=wa+(A.arm>0?.2:A.arm<0?-.3:-2.05),dx=Math.cos(da),dy=Math.sin(da),seg=(len,r,col,off=0)=>g.capsule(wx+dx*off*k,wy+dy*off*k,wx+dx*(off+len)*k,wy+dy*(off+len)*k,r*k,col);
 if(wpn==='dagger'){seg(2.5,.9,'#3b2a20',-2.5);seg(8,1,'#c8ccd0',0)}
 else if(wpn==='club'){seg(12,1.6,'#6b4a2e',-2);g.disc(wx+dx*10*k,wy+dy*10*k,2.6*k,2.6*k,'#7a5634')}
 else if(wpn==='axe'){seg(20,1.1,'#4a3424',-4);const ax=wx+dx*13*k,ay=wy+dy*13*k,nx=-dy,ny=dx;g.poly([[ax,ay],[ax+dx*5*k,ay+dy*5*k],[ax+dx*7*k+nx*7*k,ay+dy*7*k+ny*7*k],[ax-dx*2*k+nx*8*k,ay-dy*2*k+ny*8*k]],'#9aa3ab');g.line(ax+dx*7*k+nx*7*k,ay+dy*7*k+ny*7*k,ax-dx*2*k+nx*8*k,ay-dy*2*k+ny*8*k,'#e8f2f8')}
 else if(wpn==='sword'){seg(3,1,'#2a1a14',-3);const nx=-dy,ny=dx;g.capsule(wx-nx*3*k,wy-ny*3*k,wx+nx*3*k,wy+ny*3*k,.9*k,o.metal||'#c9a24a');seg(o.blade||22,1.3,o.bladeCol||'#d7dde3',.8);g.line(wx+dx*k,wy+dy*k,wx+dx*(o.blade||22)*k,wy+dy*(o.blade||22)*k,'#ffffff')}
 else if(wpn==='staff'){seg(24,1,'#3b2a3f',-10);g.disc(wx+dx*14*k,wy+dy*14*k,2.8*k,2.8*k,o.orb||'#c06bff');g.disc(wx+dx*14*k,wy+dy*14*k,1.3*k,1.3*k,'#fff0ff')}
 else if(wpn==='claw'){for(let i=-1;i<=1;i++){const a=wa+i*.35;g.line(wx,wy,wx+Math.cos(a)*5*k,wy+Math.sin(a)*5*k,o.claw||'#f2e6d0')}}
 else if(wpn==='basket'){g.rect(wx-3*k,wy,6*k,4*k,'#9b7448');g.rect(wx-2*k,wy+1*k,4*k,1*k,'#d8b46a')}
}
function drawQuadruped(g,pose,o,k){
 const A=monAnim(pose),cx=g.w/2,gy=o.gy*k,LL=o.leg*k,BL=o.len*k,BH=o.bh*k,HR=o.head*k,crouch=A.arm<0?2.5*k:0,lunge=A.arm>0?4*k:0;
 const by=gy-LL-BH*.45+crouch-A.bob*.6*k,bx=cx-2*k+lunge*.5,far=shadeHex(o.fur,-.38);
 const legs=[[.34,1,0],[-.32,-1,0],[.34,-1,1],[-.32,1,1]];
 const leg=(px,ph,col)=>{const sx=bx+px*BL,sy=by+BH*.25,st=A.stride*ph,fx=sx+st*LL*.45+(A.arm>0&&px>0?5*k:0),lift=Math.max(0,A.lift*ph)*3*k+(A.arm>0&&px>0?4*k:0),fy=gy-1.4*k-lift,kx=(sx+fx)/2+(px>0?-1.5:1.5)*k,ky=(sy+fy)/2;g.capsule(sx,sy,kx,ky,o.legR*k,col);g.capsule(kx,ky,fx,fy,o.legR*.8*k,col);g.disc(fx+1*k,fy,o.legR*.9*k,o.legR*.7*k,shadeHex(col,-.25));if(o.claw){g.set(fx+2.5*k,fy+.6*k,o.claw);g.set(fx+1.5*k,fy+1*k,o.claw)}};
 for(const [px,ph,f] of legs)if(!f)leg(px,-ph,far);
 const tw=Math.sin((A.stride||0)*2+A.bob)*2*k;g.capsule(bx-BL*.48,by-BH*.1,bx-BL*.48-o.tail*k,by-BH*.55-tw,o.tailR*k,o.fur);
 g.disc(bx-BL*.22,by,BL*.36,BH*.55,o.fur);g.disc(bx+BL*.2,by-BH*.05,BL*.36,BH*.6,o.fur);if(o.hump)g.disc(bx+BL*.12,by-BH*.42,BL*.2,BH*.3,o.fur);
 g.disc(bx,by+BH*.25,BL*.36,BH*.25,o.belly);
 if(o.mane)for(let i=0;i<5;i++)g.poly([[bx+BL*(.05+i*.08),by-BH*.45],[bx+BL*(.1+i*.08),by-BH*.45],[bx+BL*(.02+i*.08),by-BH*(.9+(i%2)*.2)]],o.mane);
 for(const [px,ph,f] of legs)if(f)leg(px,ph,o.fur);
 const hx=bx+BL*.5+HR*.4+lunge*.4,hy=by-BH*.45+crouch*.5+(A.arm<0?2*k:0);
 g.capsule(bx+BL*.3,by-BH*.2,hx,hy,BH*.38,o.fur);
 g.disc(hx,hy,HR,HR*.9,o.fur);
 const jaw=A.open*2.2*k;g.capsule(hx+HR*.3,hy+HR*.15,hx+HR*.3+o.snout*k,hy+HR*.2,HR*.42,o.fur);g.capsule(hx+HR*.2,hy+HR*.45+jaw,hx+o.snout*k,hy+HR*.5+jaw*1.3,HR*.28,shadeHex(o.fur,-.15));
 if(A.open>.5){g.rect(hx+HR*.6,hy+HR*.45,o.snout*k*.7,jaw,'#3a0b10');g.set(hx+o.snout*k*.6,hy+HR*.45,'#f4f0e6');g.set(hx+o.snout*k*.9,hy+HR*.45+jaw,'#f4f0e6')}
 g.disc(hx+HR*.3+o.snout*k,hy+HR*.1,1.2*k,1*k,'#0a0a0e');
 if(o.round){g.disc(hx-HR*.4,hy-HR*.8,HR*.32,HR*.32,o.fur)}else{g.poly([[hx-HR*.55,hy-HR*.5],[hx-HR*.05,hy-HR*.6],[hx-HR*.45,hy-HR*1.65]],o.fur);g.poly([[hx-HR*.4,hy-HR*.55],[hx-HR*.2,hy-HR*.6],[hx-HR*.4,hy-HR*1.2]],o.inner||'#3a2026')}
 g.rect(hx+HR*.25,hy-HR*.25,Math.max(1,1.7*k),Math.max(1,1.1*k),o.eye);
 if(o.crown)for(let i=0;i<3;i++)g.poly([[hx-HR*.5+i*HR*.4,hy-HR*.75],[hx-HR*.25+i*HR*.4,hy-HR*.75],[hx-HR*.38+i*HR*.4,hy-HR*1.25]],o.crown);
}
function drawSpider(g,pose,o,k){
 const A=monAnim(pose),cx=g.w/2,gy=o.gy*k,raise=A.arm<0?4*k:A.arm>0?-1*k:0,lunge=A.arm>0?4*k:0,ax=cx-7*k+lunge*.3,ay=gy-13*k-A.bob*.6*k,tx=cx+4*k+lunge,ty=gy-11*k-A.bob*.4*k,far=shadeHex(o.body,-.35);
 const leg=(i,side,col)=>{const base=[tx-3*k+i*2*k,ty+1*k],spread=[-1.5,-.6,.4,1.3][i],ph=(i%2?1:-1)*side*A.stride,kx=base[0]+spread*9*k+ph*2*k,ky=base[1]-9*k-(i===3?raise:0)-Math.max(0,ph*A.lift)*2*k,fx=base[0]+spread*15*k+ph*3*k+(i===3?lunge:0),fy=gy-1*k-(i===3?raise*1.4:0);g.capsule(base[0],base[1],kx,ky,1.3*k,col);g.capsule(kx,ky,fx,fy,1*k,col)};
 for(let i=0;i<4;i++)leg(i,-1,far);
 g.disc(ax,ay,9*k,7.5*k,o.body);g.disc(ax-1*k,ay-1.5*k,6*k,4*k,shadeHex(o.body,.15));g.poly([[ax-1*k,ay-4*k],[ax+1.5*k,ay],[ax-1*k,ay+4*k],[ax-3.5*k,ay]],o.mark);
 g.disc(tx,ty,6*k,5*k,o.body);g.disc(tx+5*k,ty+.5*k,3.6*k,3.3*k,shadeHex(o.body,-.1));
 for(const [ex,ey] of [[5.5,-1.2],[7,-.4],[6,.8],[7.6,.9]])g.rect(tx+ex*k,ty+ey*k,Math.max(1,k),Math.max(1,k),o.eye);
 const fo=A.open*1.5*k;g.capsule(tx+7*k,ty+2*k,tx+8.5*k+fo,ty+5*k,.9*k,o.fang);g.capsule(tx+6*k,ty+2.5*k,tx+6.5*k-fo*.5,ty+5.5*k,.9*k,o.fang);
 if(o.crown)for(let i=0;i<3;i++)g.poly([[ax-5*k+i*4*k,ay-6.5*k],[ax-3*k+i*4*k,ay-6.5*k],[ax-4*k+i*4*k,ay-10*k]],o.crown);
 for(let i=0;i<4;i++)leg(i,1,o.body);
}
// Visual + combat archetypes. size: footprint radius; scale used for boss rigs.
const MONSTER_ART={
 goblin:{rig:'h',w:48,h:50,gy:46,leg:9,torso:9,head:5.5,bw:9,arm:9,body:'#5c3f28',legs:'#4a3322',skin:'#6f9a44',ears:true,eye:'#ff4a3a',weapon:'dagger',belt:'#2b1d14'},
 orc:{rig:'h',w:72,h:74,gy:70,leg:15,torso:15,head:6.5,bw:15,arm:14,body:'#5a4636',skin:'#5b7d43',armor:'#6e5a46',armorL:'#8b949c',eye:'#ffd04a',tusks:true,weapon:'axe',belt:'#2c2118',hair:'#1e1a14'},
 demon:{rig:'h',w:72,h:74,gy:70,leg:14,torso:13,head:6,bw:12,arm:13,body:'#3a0f1c',skin:'#9a2a3a',horns:'#e3d4ba',eye:'#ffe45a',wings:'#4a1424',weapon:'claw',claw:'#ffd9a8'},
 knight:{rig:'h',w:76,h:84,gy:80,leg:15,torso:15,head:6.5,bw:14,arm:14,body:'#7d1820',skin:'#8e1a24',armor:'#a3232d',armorL:'#d4a14a',helm:'#8e1a24',plume:'#e2343c',cape:'#4e0b12',eye:null,weapon:'sword',metal:'#d4a14a',blade:26,twoHand:false},
 shadow:{rig:'h',w:64,h:66,gy:62,leg:13,torso:13,head:6,bw:12,arm:12,body:'#1d1230',skin:'#2b1a44',armor:'#2c1a48',armorL:'#6a3fa0',helm:'#24163a',eye:null,weapon:'sword',metal:'#b96eff',bladeCol:'#cfa8ff',blade:16},
 shaman:{rig:'h',w:72,h:76,gy:72,leg:15,torso:15,head:6.5,bw:15,arm:14,body:'#3c2a4a',skin:'#5b7d43',armor:'#5a3f6e',armorL:'#c9a24a',eye:'#ff6bf0',tusks:true,hood:'#2a1d36',weapon:'staff',orb:'#ff5ad0'},
 wolf:{rig:'q',w:72,h:54,gy:50,leg:11,len:30,bh:13,head:6,snout:7,legR:2.4,tail:11,tailR:2.2,fur:'#3d5568',belly:'#7f97a6',eye:'#ff4d5e',claw:'#d8d8d0',mane:'#26384a'},
 bear:{rig:'q',w:92,h:72,gy:68,leg:14,len:42,bh:21,head:8.5,snout:6,legR:4,tail:4,tailR:3,fur:'#b9dbe6',belly:'#e8f6f8',eye:'#2ec8ff',claw:'#3a5866',round:true,hump:true,inner:'#86b3c4'},
 spider:{rig:'s',w:76,h:54,gy:50,body:'#3b2b44',mark:'#d43a52',eye:'#ff3a4e',fang:'#e6d6c0'},
 npc:{rig:'h',w:48,h:58,gy:54,leg:11,torso:12,head:6,bw:11,arm:11,body:'#6e5a46',legs:'#2d2a2a',skin:'#e6c3a8',hair:'#2a1c14',eye:'#2a2a33',weapon:null,belt:'#3a2a1e'},
};
const BOSS_ART={
 E:{base:'wolf',k:1.9,over:{fur:'#1c2733',belly:'#4a5d6c',mane:'#0e151d',eye:'#ff2a3f',crown:'#c9333f'}},
 D:{base:'spider',k:1.9,over:{body:'#2a1f3a',mark:'#ffbe3b',eye:'#ff2a4a',crown:'#e9b347'}},
 C:{base:'knight',k:1.65,over:{}},
 B:{base:'shaman',k:1.7,over:{}},
 A:{base:'bear',k:1.75,over:{fur:'#dff4fa',belly:'#ffffff',eye:'#00e1ff',claw:'#2a90b8',crown:'#7fe8ff'}},
 S:{base:'demon',k:1.75,over:{body:'#1c0610',skin:'#5a0f1e',horns:'#f6d36b',wings:'#2a0812',eye:'#ffef7a',claw:'#ffd36b',weapon:'sword',bladeCol:'#ff9a5a',metal:'#f6d36b',blade:24}},
};
function buildMonsterGrid(art,pose,k=1,shadow=false){
 const g=new PixelGrid(Math.ceil(art.w*k),Math.ceil(art.h*k));
 if(art.rig==='q')drawQuadruped(g,pose,art,k);else if(art.rig==='s')drawSpider(g,pose,art,k);else drawHumanoid(g,pose,art,k);
 finishAuto(g,[art.eye,'#ffffff',art.bladeCol,art.orb,art.metal]);
 if(shadow)shadowize(g,art);
 return g;
}
function makeMonsterFrame(art,pose,k=1,shadow=false){const g=buildMonsterGrid(art,pose,k,shadow);let top=0;while(top<g.h-1&&!g.px.slice(top*g.w,(top+1)*g.w).some(Boolean))top++;return {img:g.toCanvas(1),w:g.w,h:g.h,ax:g.w/2,ay:Math.round(art.gy*k),top}}
// Shadow extraction look: the exact silhouette, pose set and proportions of the defeated monster,
// re-inked with a purple/black luminance ramp. Eyes (and glowing orbs) burn ice-blue with a halo,
// blades and metal turn violet, and the top edge gets a faint violet rim light.
const SHADOW_RAMP=['#05020a','#0f0620','#1a0b33','#271149','#381a66','#4f2690','#6c3cc0'];
const SHADOW_EYE='#8ff0ff',SHADOW_EYE_HALO='#2f86d6',SHADOW_EDGE='#9a62ff',SHADOW_METAL='#b98cff';
function shadowize(g,art){const eyes=new Set([art.eye,'#ffffff',art.orb].filter(Boolean)),metal=new Set([art.bladeCol,art.metal].filter(Boolean)),map={},w=g.w,h=g.h,src=g.px.slice(),eyePx=[];
 for(let i=0;i<src.length;i++){const c=src[i];if(!c)continue;if(eyes.has(c)){g.px[i]=SHADOW_EYE;eyePx.push(i);continue}if(metal.has(c)){g.px[i]=SHADOW_METAL;continue}
  let m=map[c];if(!m){const v=hexRGB(c),L=(.3*(v>>16)+.59*(v>>8&255)+.11*(v&255))/255;m=map[c]=SHADOW_RAMP[Math.min(SHADOW_RAMP.length-2,Math.floor(Math.pow(L,.75)*(SHADOW_RAMP.length-1)))]}g.px[i]=m}
 // rim light on upper edges (pixels right under transparent space, skipping the outline row)
 for(let y=1;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,c=g.px[i];if(!c||c===SHADOW_EYE||c===SHADOW_RAMP[0])continue;const up=src[i-w];if(up&&y>1&&!src[i-2*w])g.px[i]=SHADOW_EDGE}
 for(const i of eyePx){const x=i%w,y=(i/w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(g.px[j]&&g.px[j]!==SHADOW_EYE)g.px[j]=SHADOW_EYE_HALO}}
 // Arts without eyes (e.g. the legacy soldier) get two glowing pixels on the head.
 if(!eyePx.length){let top=-1;for(let i=0;i<g.px.length&&top<0;i++)if(g.px[i])top=i;if(top>=0){const y=((top/w)|0)+Math.max(3,Math.round(h*.09)),x=top%w;for(const dx of [-2,2]){const j=y*w+x+dx;if(g.px[j])g.px[j]=SHADOW_EYE}}}
 return g}
// ---------------------------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) for procedural layouts and looks.
// Stable 2D hash in [0,1): used to anchor procedural effects (water, motes) to world cells.
const hash2=(a,b)=>{let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return ((h^h>>>16)>>>0)/4294967296};
// Ring/spiral search for a free spot around (cx,cy). `ok(x,y)` decides; candidates fan out from
// `angle` (alternating sides), ring by ring, from minR to maxR. Returns {x,y} or null.
function spiralSearch(cx,cy,ok,{minR=0,maxR=240,rad=12,step=0,angle=0,flat=1,land=false}={}){if(minR<=0&&ok(cx,cy))return {x:cx,y:cy};const st=step||Math.max(14,rad*1.5);
 for(let r=Math.max(st,minR);r<=maxR;r+=st){const n=Math.max(8,Math.floor(Math.PI*2*r/Math.max(10,rad*2)));for(let i=0;i<n;i++){const a=angle+(i%2?1:-1)*Math.ceil(i/2)*Math.PI*2/n,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*flat;if(land){const t=(game&&game.world&&game.world.terrainAt)?game.world.terrainAt(x,y):(typeof w!=='undefined'&&w&&w.terrainAt?w.terrainAt(x,y):null);if(t&&t.kind==='slow')continue}if(ok(x,y))return {x,y}}}return null}
const seeded=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
// People rig (civilians and hunters). Same body-space projection as the hero, so every NPC has
// 8 real facings, a 6-frame walk, a 6-frame run, idle breathing, talking gestures, a phone pose
// and (hunters) a combat-ready stance with the weapon drawn. Looks are data: garments, hair
// styles, skin, accessories, armor, capes, helmets and weapons are combined procedurally.
const PERSON_POSES=['idle0','idle1',...Array.from({length:6},(_,i)=>'walk'+i),...Array.from({length:6},(_,i)=>'run'+i),'talk0','talk1','ready','phone'];
function personPose(pose){
 const P={bob:0,lean:0,crouch:0,tail:1,wave:0,flutter:.4,feet:{L:[-3.1,-.4,0],R:[3.1,.6,0]},hands:{L:[-7.4,.8,17.2],R:[7.4,.8,17.2]},held:null};
 const k=Number(pose.replace(/\D/g,'')||0);
 if(pose.startsWith('idle')){P.bob=k*.5;P.hands.L[2]+=k*.3;P.hands.R[2]+=k*.3;P.wave=k*1.7}
 else if(pose.startsWith('walk')){const ph=k/6*Math.PI*2,s=Math.sin(ph),c=Math.cos(ph);Object.assign(P,{lean:1.4,bob:1.1*Math.abs(c)-.4,wave:ph*2,flutter:1,tail:2.2});
  P.feet.L=[-3,6.2*s,3.2*Math.max(0,c)];P.feet.R=[3,-6.2*s,3.2*Math.max(0,-c)];P.hands.L=[-7.1,-5*s+.8,18.4];P.hands.R=[7.1,5*s+.8,18.4]}
 else if(pose.startsWith('run')){const ph=k/6*Math.PI*2,s=Math.sin(ph),c=Math.cos(ph);Object.assign(P,{lean:4.6,crouch:1,bob:2*Math.abs(c)-.6,wave:ph*2,flutter:2,tail:5});
  P.feet.L=[-3,9*s,5*Math.max(0,c)];P.feet.R=[3,-9*s,5*Math.max(0,-c)];P.hands.L=[-6.4,-7*s+2.5,22.5+2*s];P.hands.R=[6.4,7*s+2.5,22.5-2*s]}
 else if(pose.startsWith('talk')){P.bob=k*.4;P.hands.R=[5.6,6,24.5+k*3];if(k)P.hands.L=[-6,4.2,21.5];P.wave=k}
 else if(pose==='ready'){Object.assign(P,{crouch:2,lean:1.5,tail:2,wave:1,flutter:.8,held:'weapon'});P.feet.L=[-4.2,-4,0];P.feet.R=[4.2,3.6,0];P.hands.R=[5,8,24];P.hands.L=[-4,7,22]}
 else if(pose==='phone'){P.hands.R=[2.6,6.4,30];P.hands.L=[-2,5.4,27.5];P.held='phone'}
 return P;
}
function makePersonFrame(dir,pose,L){
 const g=new PixelGrid(64,64),P=personPose(pose),a=dir*Math.PI/4,Fx=Math.cos(a),Fy=Math.sin(a),Rx=-Fy,Ry=Fx,S=L.scale||1,W=L.build||1;
 const proj=(r,f,h)=>[32+(r*Rx+f*Fx)*S,59-h*S+(r*Ry+f*Fy)*.45*S,r*Ry+f*Fy];
 const hipH=18-P.crouch+P.bob*.4,U=(r,f,h)=>proj(r,f+P.lean*Math.max(0,h-18)/14,h-18+hipH+P.bob*Math.max(0,h-18)/14);
 const parts=[],add=(d,fn)=>parts.push({depth:d,fn}),avg=pts=>pts.reduce((s,p)=>s+p[2],0)/pts.length,rs=v=>v*S;
 const ring=(rx,rf,h,n=10)=>Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2;return U(Math.cos(t)*rx,Math.sin(t)*rf,h)});
 const T=L.topType,hunter=!!L.armor,long=T==='coat'||T==='labcoat'||T==='robe',dress=T==='dress'||T==='robe',ready=P.held==='weapon';
 // Legs (trousers or bare legs / tights under skirts) with knee IK and shoes.
 for(const side of ['L','R']){const s=side==='L'?-1:1,hip=[s*3*W,0,hipH],ft=[...P.feet[side]];ft[2]+=1.5;
  let dx=ft[0]-hip[0],df=ft[1]-hip[1],dh=ft[2]-hip[2],d=Math.hypot(dx,df,dh),LL=9.1;if(d>2*LL){const k=2*LL/d;dx*=k;df*=k;dh*=k;d=2*LL}
  const bend=Math.sqrt(Math.max(0,LL*LL-d*d/4)),knee=[hip[0]+dx/2,hip[1]+df/2+bend,hip[2]+dh/2],foot=[hip[0]+dx,hip[1]+df,hip[2]+dh];
  const ph=proj(...hip),pk=proj(...knee),pf=proj(...foot),heel=proj(foot[0],foot[1]-1.1,foot[2]-1.1),toe=proj(foot[0],foot[1]+3,foot[2]-1.2),bare=L.skirt||dress;
  add(avg([ph,pk,pf])-.2,()=>{g.capsuleT(ph[0],ph[1],pk[0],pk[1],rs(2.4*W),bare?L.legs||L.pants:L.pants);g.capsuleT(pk[0],pk[1],pf[0],pf[1],rs(2),bare?L.legs||L.pants:L.pants);
   if(hunter&&L.greaves){g.capsuleT(pk[0]*.65+pf[0]*.35,pk[1]*.65+pf[1]*.35,pf[0],pf[1]-1,rs(2.2),L.armor)}
   g.capsule(heel[0],heel[1],toe[0],toe[1],rs(1.8),L.shoes);g.capsule(pf[0],pf[1],heel[0],heel[1]-1,rs(1.8),L.shoes);g.set(toe[0],toe[1]-1,shadeHex(L.shoes,.35))})}
 // Torso and garments.
 const torso=[...ring(4.6*W,2.6,19),...ring(6*W,2.6,29.5)];
 add(0,()=>{g.hullT(torso,T==='jacket'||T==='suit'||T==='armor'||long&&T!=='robe'?L.inner:L.top);
  if(T==='suit'){const t1=U(0,2.9,29),t2=U(0,3.1,21);if(Fy>-.3){g.line(t1[0],t1[1],t2[0],t2[1],L.accent);g.set(t1[0],t1[1],shadeHex(L.accent,-.3))}}
  if(T==='hoodie'&&Fy>-.2){const p1=U(-3,2.9,22),p2=U(3,2.9,22);g.line(p1[0],p1[1],p2[0],p2[1],shadeHex(L.top,-.3));const d1=U(-1,2.9,29),d2=U(-1,2.9,25),d3=U(1,2.9,29),d4=U(1,2.9,25);g.line(d1[0],d1[1],d2[0],d2[1],'#e8e8e8');g.line(d3[0],d3[1],d4[0],d4[1],'#e8e8e8')}
  if(T==='apron'&&Fy>-.2){g.hullT([U(-4,2.9,27),U(4,2.9,27),U(-4.6,3.3,9),U(4.6,3.3,9)],L.accent);const n1=U(-3,2.9,27),n2=U(0,2.6,31.5),n3=U(3,2.9,27);g.line(n1[0],n1[1],n2[0],n2[1],L.accent);g.line(n3[0],n3[1],n2[0],n2[1],L.accent)}
  if(hunter){g.hullT([...ring(5.3*W,3.1,22),...ring(6.4*W,3.2,30)],L.armor);const b1=U(-4.8*W,3.2,22.2),b2=U(4.8*W,3.2,22.2);g.line(b1[0],b1[1],b2[0],b2[1],L.trim);if(Fy>-.3){const c1=U(0,3.4,29.5),c2=U(0,3.4,23.5);g.line(c1[0],c1[1],c2[0],c2[1],shadeHex(L.armor,.3));const em=U(0,3.5,27);g.rect(em[0]-1,em[1]-1,2,2,L.trim)}}
  const b=[...ring(5*W,2.8,19.2),...ring(5*W,2.8,20.6)];if(L.belt)g.hull(b,L.belt);
  if(L.skirt||dress){const hemH=dress&&T==='robe'?3:10.5,fl=dress?1.6:1;g.hullT([...ring(5*W,2.9,19.5),...ring(7.2*W*fl,4.2,hemH)],L.skirt||L.top)}});
 // Open garments (jacket / suit / coat / lab coat): back shell + front panels.
 if(T==='jacket'||T==='suit'||long){const hemH=T==='robe'?3:long?7.5+P.tail*.3:15,col=L.top,back=[U(-6.6*W,0,30),U(6.6*W,0,30),U(-6.6*W,-2.6,30),U(6.6*W,-2.6,30),U(-6.2*W,0,19),U(6.2*W,0,19),U(-6.2*W,-2.8,19),U(6.2*W,-2.8,19),U(-7*W,-3.2-(long?P.tail*.5:0),hemH),U(7*W,-3.2-(long?P.tail*.5:0),hemH),U(0,-3.4-(long?P.tail:0),hemH-.5)];
  const hem=[];if(long)for(let i=0;i<=4;i++){const r=(-7+i*3.5)*W,cf=1-Math.abs(r)/7,wv=Math.sin(P.wave+i*1.3)*P.flutter;hem.push(U(r,-3.3-P.tail*(.5+.5*cf)-wv*.6,hemH-.3-Math.max(0,wv)*.7))}
  add(avg(back)-.6,()=>{g.hullT(back,col);for(let i=0;i<hem.length-1;i++)g.capsuleT(hem[i][0],hem[i][1],hem[i+1][0],hem[i+1][1],rs(1.3),col)});
  for(const s of [-1,1]){const pts=[U(s*1.6,2.9,30),U(s*6.6*W,2.2,30),U(s*6.6*W,0,30),U(s*1.8,3.1,19),U(s*6.2*W,2.9,19),U(s*6.2*W,0,19),U(s*2.4,3.4,hemH),U(s*7*W,2.9,hemH),U(s*7*W,0,hemH)];
   add(avg(pts)+.4,()=>{g.hullT(pts,col);if(Fy>.15){const e1=U(s*1.6,3,30),e2=U(s*2.4,3.5,hemH);g.line(e1[0],e1[1],e2[0],e2[1],shadeHex(col,-.3));if(T==='suit'&&s>0){const p=U(4.2,3.1,27);g.set(p[0],p[1],'#e8e8e8')}}})}}
 // Hunter cape with a rippling hem.
 if(L.cape){const hemH=5+P.tail*.4,back=[U(-6.4*W,-1.6,30.5),U(6.4*W,-1.6,30.5),U(-7.6*W,-3.6-P.tail*.5,hemH),U(7.6*W,-3.6-P.tail*.5,hemH),U(0,-4.4-P.tail,hemH-.5)],hem=[];
  for(let i=0;i<=4;i++){const r=(-7.6+i*3.8)*W,cf=1-Math.abs(r)/7.6,wv=Math.sin(P.wave+i*1.2)*(P.flutter+.4);hem.push(U(r,-3.6-P.tail*(.5+.5*cf)-wv*.7,hemH-.3-Math.max(0,wv)*.9))}
  add(avg(back)-.9,()=>{g.hullT(back,L.cape);for(let i=0;i<4;i++)g.capsuleT(hem[i][0],hem[i][1],hem[i+1][0],hem[i+1][1],rs(1.4),L.cape);for(let i=0;i<4;i++)g.line(hem[i][0],hem[i][1]+1,hem[i+1][0],hem[i+1][1]+1,L.trim)})}
 // Backpack or shoulder bag.
 if(L.bag==='pack'){const pts=[U(-3.8,-2.9,29),U(3.8,-2.9,29),U(-3.8,-2.9,20.5),U(3.8,-2.9,20.5),U(-3.4,-5.6,28),U(3.4,-5.6,28),U(-3.4,-5.6,21.5),U(3.4,-5.6,21.5)];add(avg(pts),()=>{g.hullT(pts,L.bagCol);const z=U(0,-5.7,25);g.line(z[0]-2,z[1],z[0]+2,z[1],shadeHex(L.bagCol,-.35))})}
 else if(L.bag==='shoulder'){const bp=U(-6.4*W,1.5,18.5);add(bp[2]+.5,()=>{const s1=U(5*W,1.5,30),s2=U(-5.6*W,2.6,19.5);if(Fy>-.4)g.line(s1[0],s1[1],s2[0],s2[1],shadeHex(L.bagCol,-.3));g.discT(bp[0],bp[1],rs(2.8),rs(2.2),L.bagCol)})}
 // Weapon carried on the back (or drawn in the ready stance below).
 const wpn=L.weapon;if(wpn&&!ready){const metal=L.metal||'#c9d2da';
  if(wpn==='sword'||wpn==='greatsword'||wpn==='axe'){const big=wpn==='greatsword',b0=U(-4.5,-4.2,big?9:13),b1=U(5,-4.2,big?42:39),h1=U(6.2,-4.2,big?47:43);add(b0[2]*.5+b1[2]*.5-.8,()=>{g.capsule(b0[0],b0[1],b1[0],b1[1],rs(big?1.6:1),metal);g.line(b0[0],b0[1],b1[0],b1[1],shadeHex(metal,.35));g.capsule(b1[0],b1[1],h1[0],h1[1],rs(.9),'#2a1f1a');const gx=U(4.3,-4.2,big?40:37.5);g.disc(gx[0],gx[1],rs(1.7),rs(1),L.trim);if(wpn==='axe')g.discT(b1[0],b1[1]+rs(2),rs(3.2),rs(2.6),metal)})}
  else if(wpn==='spear'||wpn==='staff'){const b0=U(4.4,-4,4),b1=U(4.4,-4,50);add(b0[2]-.8,()=>{g.capsule(b0[0],b0[1],b1[0],b1[1],rs(.8),wpn==='staff'?'#4a3426':'#3a3a40');if(wpn==='spear')g.poly([[b1[0]-rs(1.6),b1[1]+rs(1)],[b1[0]+rs(1.6),b1[1]+rs(1)],[b1[0],b1[1]-rs(5)]],metal);else{g.disc(b1[0],b1[1],rs(2.4),rs(2.4),L.orb||'#57e3ff');g.set(b1[0],b1[1]-1,'#ffffff')}})}
  else if(wpn==='bow'){const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(U(-5+t*10,-4.4-Math.sin(t*Math.PI)*2.4,14+t*24))}add(pts[4][2]-.8,()=>{for(let i=0;i<8;i++)g.capsule(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],rs(.8),'#6a4a2a');g.line(pts[0][0],pts[0][1],pts[8][0],pts[8][1],'#d8d0c0')})}
  if(L.shield){const sp=U(0,-4.6,24);add(sp[2]-.7,()=>{g.discT(sp[0],sp[1],rs(4.2),rs(4.8),L.armor);g.disc(sp[0],sp[1],rs(1.6),rs(1.6),L.trim)})}}
 // Arms, hands, held items.
 for(const side of ['L','R']){const s=side==='L'?-1:1,sh=U(s*6.3*W,0,28.8),hand=P.hands[side],hp=proj(hand[0],hand[1]+P.lean*.5,hand[2]-18+hipH),sr=[s*6.3*W,0];
  const mid=[(sr[0]+hand[0])/2,(sr[1]+hand[1])/2,(28.8+hand[2])/2],dd=Math.hypot(hand[0]-sr[0],hand[1]-sr[1],hand[2]-28.8),bend=Math.sqrt(Math.max(0,50-dd*dd/4)),el=proj(mid[0]+s*bend*.5,mid[1]-bend*.45+P.lean*.3,mid[2]-bend*.55-18+hipH);
  const shortSleeve=T==='tee'||T==='dress'||T==='apron',sleeve=hunter?L.inner:(T==='jacket'||T==='suit'||long?L.top:L.top);
  add(avg([sh,el,hp])+.3,()=>{g.capsuleT(sh[0],sh[1],el[0],el[1],rs(2.3),sleeve);g.capsuleT(el[0],el[1],hp[0],hp[1],rs(1.9),shortSleeve?L.skin:sleeve);
   if(hunter){g.capsuleT(el[0]*.4+hp[0]*.6,el[1]*.4+hp[1]*.6,hp[0],hp[1],rs(2.1),L.armor);g.discT(sh[0],sh[1]-rs(.5),rs(3.2),rs(2.6),L.armor);g.set(sh[0]-1,sh[1]-rs(2.6),L.trim)}
   g.disc(hp[0],hp[1],rs(1.7),rs(1.7),hunter&&L.gloves?L.gloves:L.skin);
   if(P.held==='phone'&&side==='R'){g.rect(hp[0]-1,hp[1]-rs(3),rs(3),rs(4),'#15181e');if(Fy<.2)g.rect(hp[0]-.5,hp[1]-rs(2.5),rs(2),rs(3),'#9fe8ff')}
   if(ready&&side==='R'&&wpn){const metal=L.metal||'#c9d2da',dirv=wpn==='staff'?[0,.3,.95]:wpn==='spear'?[0,.95,.3]:[0,.78,.62],len=wpn==='greatsword'?16:wpn==='spear'?20:wpn==='staff'?16:wpn==='bow'?0:wpn==='axe'?11:12;
    if(wpn==='bow'){const lh=proj(-4,9,24-18+hipH),t=proj(-4,9.5,31-18+hipH),b=proj(-4,9.5,17-18+hipH);g.capsule(t[0],t[1],lh[0],lh[1],rs(.8),'#6a4a2a');g.capsule(lh[0],lh[1],b[0],b[1],rs(.8),'#6a4a2a');g.line(t[0],t[1],b[0],b[1],'#d8d0c0')}
    else{const back=wpn==='spear'?8:2,b0=proj(hand[0]-dirv[0]*back,hand[1]-dirv[1]*back,hand[2]-dirv[2]*back-18+hipH),tp=proj(hand[0]+dirv[0]*len,hand[1]+dirv[1]*len,hand[2]+dirv[2]*len-18+hipH);
     g.capsule(b0[0],b0[1],hp[0],hp[1],rs(.9),wpn==='staff'?'#4a3426':'#2a1f1a');
     if(wpn==='staff'){g.capsule(hp[0],hp[1],tp[0],tp[1],rs(.8),'#4a3426');g.disc(tp[0],tp[1],rs(2.6),rs(2.6),L.orb||'#57e3ff');g.set(tp[0],tp[1]-1,'#ffffff')}
     else if(wpn==='spear'){g.capsule(hp[0],hp[1],tp[0],tp[1],rs(.8),'#3a3a40');g.disc(tp[0],tp[1],rs(1.6),rs(1.6),metal)}
     else{g.disc(hp[0],hp[1],rs(1.6),rs(1.1),L.trim);g.capsule(hp[0],hp[1],tp[0],tp[1],rs(wpn==='greatsword'?1.6:1.05),metal);g.line(hp[0],hp[1],tp[0],tp[1],shadeHex(metal,.4));if(wpn==='axe')g.discT(tp[0],tp[1],rs(3),rs(2.6),metal)}}}
   if(ready&&side==='L'&&L.shield){g.discT(hp[0],hp[1],rs(4),rs(4.6),L.armor);g.disc(hp[0],hp[1],rs(1.5),rs(1.5),L.trim)}})}
 // Neck and head: hair mass split behind / in front of the face so the facing always reads.
 const neck0=U(0,0,29),neck1=U(0,.5,33),hc=U(0,.8,37.2);
 add(.5,()=>{g.capsule(neck0[0],neck0[1],neck1[0],neck1[1],rs(1.7),shadeHex(L.skin,-.18));if(T==='hoodie'){const hb=U(0,-3.2,31.5);g.discT(hb[0],hb[1],rs(4.8),rs(3),L.top)}
  if(hunter)g.hullT([...ring(4.2,2.6,29.4,8),...ring(3.8,2.3,32,8)],L.armor);else if(T==='suit'||T==='labcoat'||T==='coat')g.hullT([...ring(4,2.5,29.4,8),...ring(3.6,2.2,32,8)],L.top);
  const [hx,hy]=hc,fsx=Fx*S,fsy=Fy*.45*S,face=Fy>-.5,sp=(dr,df,dh)=>[hx+(dr*Rx+df*Fx)*S,hy-dh*S+(dr*Ry+df*Fy)*.45*S],hair=L.hair,st=L.hairStyle,helm=L.helm;
  if(st==='long'&&!helm){const a0=sp(0,-3,.5),a1=sp(0,-3.3,-8.5);g.capsuleT(a0[0],a0[1],a1[0],a1[1],rs(4.2),hair)}
  if(st==='pony'&&!helm){const a0=sp(0,-4.4,1.6),a1=sp(Math.sin(P.wave)*1.2,-6.6,-5.5);g.capsuleT(a0[0],a0[1],a1[0],a1[1],rs(1.8),hair)}
  if(!helm&&st!=='bald')g.discT(hx-fsx*1.2,hy-.6-fsy*1.2,rs(st==='bob'?5.8:5.2),rs(st==='bob'?6:5),hair);else if(st==='bald'&&!helm)g.discT(hx-fsx*.8,hy-.4-fsy*.8,rs(4.6),rs(4.8),L.skin);
  if(face){g.discT(hx+fsx*1.4,hy+.8+fsy*1.5,rs(4.1+Math.abs(Fy)*.3),rs(4.5),L.skin);if(Math.abs(Fx)>.6)g.set(hx+Fx*5.2*S,hy+2,L.skin);if(L.beard){const bd=sp(0,3.6,-2.6);g.disc(bd[0],bd[1],rs(2.8),rs(1.6),hair)}}
  else g.disc(hx,hy+rs(3.8),rs(2.2),rs(1.2),shadeHex(L.skin,-.2));
  if(helm==='visor'){g.discT(hx,hy-.6,rs(5.1),rs(5.3),L.armor);if(face){const e=sp(0,4.6,-.2);g.rect(e[0]-rs(3.4)+fsx,e[1]-.5,rs(6.8)-Math.abs(fsx)*2,rs(1.5),'#0b1018');g.set(e[0]+fsx*2,e[1],L.eyeGlow||'#7fe8ff')}const cr=sp(0,-1,6);if(L.crest)g.capsule(cr[0],cr[1]+1,cr[0]-fsx*4,cr[1]-rs(1),rs(1.2),L.crest)}
  else if(helm==='hood'){g.discT(hx-fsx*.9,hy-1.2-fsy,rs(5.6),rs(5.6),L.cape||L.top);if(face)g.discT(hx+fsx*1.6,hy+1.4+fsy*1.6,rs(3.4),rs(3.6),shadeHex(L.skin,-.25))}
  else if(st!=='bald'){
   if(st==='cap'){g.discT(hx-fsx*.4,hy-2.6,rs(5.3),rs(3.2),L.capCol||L.accent);if(Fy>-.8){const b0=sp(0,3,2.3),b1=sp(0,6.6,1.8);g.capsule(b0[0],b0[1],b1[0],b1[1],rs(1.5),shadeHex(L.capCol||L.accent,-.2))}}
   else{g.discT(hx-fsx*.6,hy-2.5,rs(st==='bob'?5.8:5.2),rs(3.1),hair);
    if(st==='spiky')for(const [dr,df,dh] of [[0,-1,8.4],[-3,-2,7.6],[3,-2,7.6],[0,-4.6,6.4],[-4.4,-3.6,5],[4.4,-3.6,5]]){const t=sp(dr,df,dh),r=sp(dr*.4,df*.4,dh*.45);g.poly([[r[0]-rs(1.8),r[1]],[r[0]+rs(1.8),r[1]],t],hair)}
    if(st==='bun'){const b=sp(0,-4.2,3.6);g.discT(b[0],b[1],rs(2.5),rs(2.4),hair)}
    if((st==='long'||st==='bob')&&face)for(const s of [-1,1]){const a0=sp(s*4.2,.5,-.5),a1=sp(s*4.5,0,st==='long'?-7:-4);if(s*Ry*Fy<.6)g.capsuleT(a0[0],a0[1],a1[0],a1[1],rs(1.5),hair)}}
   const hl=sp(-2,-1.4,4.6);g.line(hl[0]-1,hl[1]+.5,hl[0]+1.2,hl[1]-.4,shadeHex(st==='cap'?(L.capCol||L.accent):hair,.35));if(helm==='band'){const b0=sp(-4.4,1,2.2),b1=sp(4.4,1,2.2);g.line(b0[0],b0[1],b1[0],b1[1],L.trim)}}
  if(face&&helm!=='visor'){for(const s of [-1,1]){const n=Fy*.85+s*Ry*.5;if(n<.05)continue;const e=sp(s*2,5,-.6);g.rect(e[0]-.5,e[1],rs(1.4),1,L.eye||'#1c1a22')}
   if(L.glasses&&Fy>-.2){const e1=sp(-2.6,5.1,-.5),e2=sp(2.6,5.1,-.5);g.line(e1[0]-1,e1[1]-1,e2[0]+1,e2[1]-1,'#c8d0d8')}
   if(Fy>.3){const m=sp(0,5.2,-3);g.set(m[0],m[1],shadeHex(L.skin,-.3))}}});
 parts.sort((p,q)=>p.depth-q.depth);for(const p of parts)p.fn();
 return finishAuto(g,['#9fe8ff','#ffffff',L.orb||'#57e3ff',L.eyeGlow||'#7fe8ff',L.trim]);
}
// Look catalogue: seeded civilians plus hand-designed hunter archetypes and the lobby staff.
const PEOPLE=(()=>{
 const r=seeded(2024),pick=a=>a[Math.floor(r()*a.length)];
 const SKINS=['#f1d2bd','#ecc8b2','#e0b494','#cf9d7c','#b57e5c','#8f5c42','#6e4432'];
 const HAIRS=['#141218','#141218','#2a1c14','#3a2618','#5a3a22','#8a6038','#c8a870','#d9d2c4','#7d7f86','#5a2a6a','#24365e','#9a3434'];
 const TOPS=['#2f4a78','#c24a5a','#d8cfbd','#4f7a52','#d8b44a','#3a3a44','#7a4ab0','#e88a5a','#5ab0c0','#1d1d22','#8a5a3a','#b03a6a','#2a6a6a','#5a6472','#a8b4c0','#3a5a8a','#6a2a3a','#c8a878'];
 const PANTS=['#1e2430','#2a2a3a','#3a4a5a','#4a3a2a','#141418','#5a5a62','#2a3a5a','#6a5a48','#3a5a7a'];
 const SHOES=['#111317','#2a2220','#e8e4dc','#6a4a32','#3a3a44','#b03a3a'];
 const civ=[];
 for(let i=0;i<34;i++){const types=['tee','tee','tee','jacket','jacket','jacket','coat','hoodie','hoodie','suit','suit','dress','dress',i%9===4?'labcoat':'tee'],topType=types[Math.floor(r()*types.length)],fem=r()<.48;
  const styles=fem?['long','long','pony','bun','bob','short']:['short','short','spiky','cap','bald','short','long'];
  civ.push({id:'c'+i,kind:'civ',skin:pick(SKINS),hair:pick(HAIRS),hairStyle:pick(styles),top:topType==='labcoat'?'#e8eef0':pick(TOPS),inner:pick(['#e8e8e8','#1d1d22','#3a4a5a','#c8b8a0','#8a3a3a']),topType,
   pants:pick(PANTS),shoes:pick(SHOES),accent:pick(['#c23a3a','#2a4a8a','#d8b44a','#1d1d22','#3aa0a0']),legs:pick(['#1d1d22','#3a2a2a',null])||undefined,skirt:fem&&topType!=='dress'&&r()<.35?pick(['#2a2a3a','#7a3a4a','#3a4a6a','#c8b8a0']):null,
   bag:r()<.22?'pack':r()<.25?'shoulder':null,bagCol:pick(['#3a2a22','#1d1d22','#7a4a2a','#2a4a6a','#c24a5a']),glasses:r()<.16,beard:!fem&&r()<.14,scale:.9+r()*.1,build:fem?.9+r()*.06:.95+r()*.15,belt:topType==='tee'&&r()<.4?'#2a2220':null,capCol:pick(['#1d1d22','#c23a3a','#2a4a8a','#e8e8e8'])});
  const c=civ[i];c.legs=c.legs||c.skin}
 const H=(id,o)=>({id,kind:'hunter',skin:pick(SKINS),hair:pick(HAIRS.slice(0,7)),hairStyle:'short',inner:'#1b1f28',topType:'armor',pants:'#1a1d26',shoes:'#121418',scale:1,build:1.08,belt:'#2a2220',gloves:'#20242c',greaves:true,...o});
 const hunters=[
  H('h0',{armor:'#9aa6b2',trim:'#d8b44a',cape:'#7a1a24',helm:'visor',crest:'#c23a3a',weapon:'sword',shield:true,metal:'#dfe6ec'}),
  H('h1',{armor:'#2a2a34',trim:'#b88aff',cape:'#1a1026',weapon:'greatsword',metal:'#b8a8d8',hairStyle:'spiky',hair:'#141218'}),
  H('h2',{armor:'#d8dde2',trim:'#3a7ad8',cape:'#2a4a8a',weapon:'axe',hairStyle:'short',beard:true}),
  H('h3',{armor:'#3a2a5a',trim:'#57e3ff',topType:'robe',top:'#3a2a5a',cape:'#2a1d46',helm:'hood',weapon:'staff',orb:'#57e3ff',greaves:false,build:.95}),
  H('h4',{armor:'#3a5a3a',trim:'#d8c46a',cape:'#2a4a2a',helm:'hood',weapon:'bow',build:.98,greaves:false}),
  H('h5',{armor:'#6a6a72',trim:'#e88a3a',helm:'visor',weapon:'spear',shield:true,build:1.18,scale:1.04,metal:'#e0e4e8'}),
  H('h6',{armor:'#1f2a3a',trim:'#46d6ff',helm:'visor',weapon:'spear',cape:'#14202e',eyeGlow:'#46d6ff'}),
  H('h7',{armor:'#24242a',trim:'#ff4b57',cape:null,weapon:'sword',hairStyle:'pony',hair:'#2a1c14',build:.94,scale:.97,metal:'#ff9aa3'}),
  H('h8',{armor:'#7a4a2a',trim:'#e8c86a',cape:'#4a2a1a',weapon:'greatsword',hairStyle:'bald',beard:true,build:1.2,scale:1.05}),
  H('h9',{armor:'#c8b06a',trim:'#ffffff',cape:'#e8e0d0',helm:'band',weapon:'staff',orb:'#ffcf4a',topType:'robe',top:'#e8e0d0',greaves:false,hairStyle:'long',hair:'#c8a870',build:.92,scale:.97}),
  H('h10',{armor:'#3a1d4a',trim:'#c879ff',cape:'#22122e',helm:'visor',eyeGlow:'#c879ff',weapon:'sword',metal:'#d8b8ff'}),
  H('h11',{armor:'#4a5a6a',trim:'#7fe8ff',weapon:'bow',hairStyle:'bob',hair:'#141218',build:.92,scale:.96,greaves:false}),
 ];
 const special={
  merchant:{id:'merchant',kind:'civ',skin:'#e0b494',hair:'#8a8a8e',hairStyle:'short',beard:true,top:'#7a5636',topType:'apron',accent:'#c8b48a',inner:'#e8e0d0',pants:'#3a2a1e',shoes:'#2a2220',belt:'#2a1d14',scale:.97,build:1.12},
  healer:{id:'healer',kind:'civ',skin:'#f1d2bd',hair:'#c9a36b',hairStyle:'bun',top:'#eef6f6',topType:'labcoat',inner:'#5ab0b8',pants:'#5d7c86',shoes:'#e8e4dc',accent:'#4fb8c8',glasses:true,scale:.95,build:.92},
  guard:H('guard',{armor:'#1f2a3a',trim:'#d8b44a',helm:'visor',crest:'#2a4a8a',weapon:'spear',cape:'#14202e',eyeGlow:'#7fe8ff',scale:1.04}),
  jinho:H('jinho',{armor:'#d8dde2',trim:'#3a7ad8',cape:'#2a4a8a',weapon:'axe',hairStyle:'short',beard:true,top:'#d8dde2'}),
 };
 const all={};for(const l of [...civ,...hunters,...Object.values(special)])all[l.id]=l;
 return {civ,hunters,special,all};
})();
const NPC_LOOKS={
 merchant:{body:'#7a5636',legs:'#3a2a1e',hair:'#8a8a8a',belt:'#2a1d14',weapon:'basket'},
 healer:{body:'#dfeef0',legs:'#5d7c86',hair:'#c9a36b',belt:'#4fb8c8'},
 officer:{body:'#1f2a3a',legs:'#141a24',armor:'#2e4a6a',armorL:'#c9a24a',hair:'#141414'},
 hunter:{body:'#2a3a4a',legs:'#1a222c',armor:'#4a5a6a',hair:'#141414',weapon:'sword',blade:14},
 suit:{body:'#2f4a78',legs:'#1e2430',hair:'#121212',belt:'#111'},
 red:{body:'#c24a5a',legs:'#2a2a3a',hair:'#4a2a1a'},
 white:{body:'#e0d8c8',legs:'#3a4a5a',hair:'#2a1c14'},
 green:{body:'#4f7a52',legs:'#2b2b2b',hair:'#5a3a22'},
};
// Frames are built lazily on first access (keys stay enumerable), keeping start-up instant.
class ProceduralSprites{
 constructor(){
  this.playerFrames={};for(let d=0;d<8;d++)for(const pose of HERO_POSES)this.lazy(this.playerFrames,`${d}:${pose}`,()=>makeHeroFrame(d,pose).toCanvas(1));
  this.monsters={};for(const [t,art] of Object.entries(MONSTER_ART))this.monsters[t]=this.set(art,1);
  for(const [r,b] of Object.entries(BOSS_ART))this.monsters['boss_'+r]=this.set({...MONSTER_ART[b.base],...b.over},b.k);
  for(const [n,look] of Object.entries(NPC_LOOKS))this.monsters['npc_'+n]=this.set({...MONSTER_ART.npc,...look},1);
  this.people=new Map();this.queue=[];this.queued=new Set();this.budget=2;
  for(const pose of ['idle0','walk0','walk1','walk2','walk3','walk4','walk5'])for(let d=0;d<8;d++)for(const look of Object.values(PEOPLE.all))this.queue.push([look,d,pose]);
 }
 // People frames are built on demand and cached; a small per-frame budget plus a warm-up queue
 // (fed during the title screen and idle frames) keeps the city from stuttering.
 person(look,dir,pose){const key=look.id+'|'+dir+'|'+pose;let f=this.people.get(key);if(f)return f;
  if(this.budget>0){this.budget--;f=makePersonFrame(dir,pose,look).toCanvas(1);this.people.set(key,f);return f}
  if(!this.queued.has(key)){this.queued.add(key);this.queue.unshift([look,dir,pose])}
  for(const alt of ['idle0','walk0']){const a=this.people.get(look.id+'|'+dir+'|'+alt);if(a)return a}
  f=makePersonFrame(dir,'idle0',look).toCanvas(1);this.people.set(look.id+'|'+dir+'|idle0',f);return f}
 beginFrame(){this.budget=2}
 warm(ms=4){const end=Date.now()+ms;while(this.queue.length&&Date.now()<end){const [look,dir,pose]=this.queue.shift(),key=look.id+'|'+dir+'|'+pose;if(!this.people.has(key))this.people.set(key,makePersonFrame(dir,pose,look).toCanvas(1))}}
 lazy(obj,key,build){Object.defineProperty(obj,key,{enumerable:true,configurable:true,get(){const v=build();Object.defineProperty(obj,key,{value:v,enumerable:true});return v}})}
 set(art,k,shadow=false){const o={};for(const p of MONSTER_POSES)this.lazy(o,p,()=>makeMonsterFrame(art,p,k,shadow));return o}
 monster(key,pose){return (this.monsters[key]||this.monsters.goblin)[pose]}
 // Shadow-palette twin of any monster/boss art, built lazily the first time that shadow appears.
 artOf(key){if(key.startsWith('boss_')){const b=BOSS_ART[key.slice(5)];if(b)return {art:{...MONSTER_ART[b.base],...b.over},k:b.k}}return {art:MONSTER_ART[key]||MONSTER_ART.shadow,k:1}}
 shadowMonster(key,pose){const sets=this.shadows||(this.shadows={});if(!sets[key]){const {art,k}=this.artOf(key);sets[key]=this.set(art,k,true)}return sets[key][pose]}
}
// Visual state is intentionally separate from combat timing and hitboxes.
class PlayerAnimation{
 constructor(sprites){this.sprites=sprites;this.action=null;this.remaining=0;this.duration=0;this.actionAngle=0;this.moveAngle=Math.PI/2;this.walkTime=0;this.idleTime=0;this.effects=[];this.ghostClock=0}
 direction(angle){return ((Math.round(angle/(Math.PI/4))%8)+8)%8}
 play(name,p,duration,angle=p.angle){this.action=name;this.remaining=duration;this.duration=duration;this.actionAngle=angle;if(!p.moving)this.moveAngle=angle}
 update(dt,p){
  if(this.remaining>0)this.remaining=Math.max(0,this.remaining-dt);
  if(p.moving){this.walkTime+=dt;this.idleTime=0;if(Number.isFinite(p.moveAngle))this.moveAngle=p.moveAngle}else this.idleTime+=dt;
  if(p.dashTime>0){this.ghostClock-=dt;if(this.ghostClock<=0){this.ghostClock=.04;this.effects.push({type:'ghost',x:p.x,y:p.y,angle:Math.atan2(p.dashY,p.dashX),remaining:.22,duration:.22})}}else this.ghostClock=0;
  for(const fx of this.effects)fx.remaining-=dt;this.effects=this.effects.filter(fx=>fx.remaining>0);
 }
 // Attacks play wind-up -> strike -> follow-through; dash and summon have two-key cycles.
 pose(p){const active=this.remaining>0;if(active){const prog=1-this.remaining/this.duration,a=this.action;if(a==='dash')return prog<.5?'dash':'dash2';if(a==='summon')return prog<.35?'summon_w':'summon';if(WINDUP_POSES.has(a))return prog<.26?a+'_w':prog<.7?a:a+'_f';return a}
  if(p.hurtTime>0)return 'hurt';if(p.moving)return `walk${Math.floor(this.walkTime*13)%HERO_WALK}`;const k=Math.floor(this.idleTime*4.2)%HERO_IDLE;return k?`idle${k}`:'idle'}
 frame(p){return this.sprites.playerFrames[`${this.direction(this.remaining>0?this.actionAngle:this.moveAngle)}:${this.pose(p)}`]}
 // After-images are separate cyan echoes behind the hero; the hero itself is always drawn fully opaque.
 drawGhosts(c){for(const fx of this.effects)if(fx.type==='ghost'){const k=fx.remaining/fx.duration;c.save();c.globalAlpha=.32*k;c.globalCompositeOperation='lighter';c.drawImage(this.sprites.playerFrames[`${this.direction(fx.angle)}:dash`],Math.round(fx.x-32),Math.round(fx.y-50),64,64);c.restore()}}
 // Shadow Monarch VFX: layered crescents (violet glow -> electric blue -> white core), dark smoke,
 // embers, ground runes and fissures. Particles are seeded once when the effect starts.
 effect(type,p,angle=p.angle,variant=0){const duration={authority:.75,summon:.95,vital:.42,mutilation:.3,impact:.22,combo:variant===3?.42:.32}[type]||.25;const fx={type,x:p.x,y:p.y,angle,variant,remaining:duration,duration,seed:Math.random()*1000};this.effects.push(fx);this.seedFX(fx)}
 seedFX(fx){const P=typeof game!=='undefined'&&game.particles;if(!P)return;const {x,y,angle:a,type,variant:v}=fx,cx=Math.cos(a),cy=Math.sin(a),VI='#7b2cff',LV='#b06bff',BL='#3fd6ff';
  if(type==='combo'){const R=v===3?74:64;for(let i=0;i<(v===3?16:9);i++){const k=rand(-.9,.9),ax=a+k;P.burst(x+Math.cos(ax)*R,y-14+Math.sin(ax)*R,i%2?LV:BL,1,{speed:70,angle:ax,spread:.6,kind:'ember',life:1.2,size:rand(2,3.5),lift:20})}
   P.burst(x+cx*62,y-12+cy*62,'#1a0830',v===3?6:3,{kind:'smoke',speed:30,life:1.6,size:rand(10,16)});if(v===3){P.burst(x+cx*70,y-14+cy*70,'#f4ecff',10,{angle:a,spread:.5,speed:320,kind:'streak',life:.5});P.ring(x+cx*60,y+cy*60,LV,90,.4,4)}}
  else if(type==='vital'){for(let i=0;i<22;i++){const d=rand(0,150);P.burst(x+cx*d,y-14+cy*d,i%3?BL:LV,1,{angle:a+Math.PI+rand(-.5,.5),spread:.4,speed:rand(40,140),kind:i%4?'ember':'streak',life:1,size:rand(2,3)})}
   P.burst(x-cx*14,y-6-cy*14,'#14062a',5,{kind:'smoke',speed:40,angle:a+Math.PI,spread:1.2,life:1.4,size:14});P.ring(x+cx*130,y+cy*130,BL,60,.35,3)}
  else if(type==='mutilation'){for(let i=0;i<7;i++)P.burst(x+cx*55+rand(-20,20),y-14+cy*55+rand(-20,20),i%2?LV:'#e8f8ff',1,{speed:180,kind:'shard',life:.7,size:rand(2,4)});P.burst(x+cx*50,y-10+cy*50,'#1a0830',2,{kind:'smoke',speed:30,life:1.2,size:12})}
  else if(type==='authority'){for(let i=0;i<36;i++){const b=Math.random()*Math.PI*2,r=rand(10,60);P.burst(x+Math.cos(b)*r,y+10+Math.sin(b)*r*.55,i%3?LV:BL,1,{angle:b,spread:.3,speed:rand(160,320),kind:i%2?'ember':'streak',life:1.1,size:rand(2,4)})}
   for(let i=0;i<14;i++){const b=i/14*Math.PI*2;P.burst(x+Math.cos(b)*50,y+12+Math.sin(b)*28,'#12051f',1,{angle:b,spread:.2,speed:120,kind:'smoke',life:1.8,size:rand(16,24)})}
   for(let i=0;i<18;i++)P.burst(x+rand(-120,120),y+rand(-40,60),i%2?VI:BL,1,{kind:'wisp',speed:20,lift:70,life:1.4,size:2})}
  else if(type==='summon'){for(let i=0;i<26;i++)P.burst(x+rand(-40,40),y+20+rand(-12,12),i%3?LV:VI,1,{kind:'wisp',speed:15,lift:rand(60,120),life:rand(1,1.8),size:rand(2,3)});P.burst(x,y+22,'#0d0418',10,{kind:'smoke',speed:50,life:2,size:rand(14,22),lift:20});P.ring(x,y+24,LV,80,.6,4)}}
 crescent(c,R,a0,a1,w,col,alpha,dir=1){const n=18;c.globalAlpha=alpha;c.fillStyle=col;c.beginPath();for(let i=0;i<=n;i++){const k=i/n,a=(a0+(a1-a0)*k)*dir,ww=w*Math.pow(k,.9)*(1-Math.pow(k,8)*.6);c.lineTo(Math.cos(a)*(R+ww/2),Math.sin(a)*(R+ww/2))}for(let i=n;i>=0;i--){const k=i/n,a=(a0+(a1-a0)*k)*dir,ww=w*Math.pow(k,.9)*(1-Math.pow(k,8)*.6);c.lineTo(Math.cos(a)*(R-ww/2),Math.sin(a)*(R-ww/2))}c.closePath();c.fill()}
 spindle(c,x0,x1,w,col,alpha){c.globalAlpha=alpha;c.fillStyle=col;c.beginPath();c.moveTo(x0,0);c.quadraticCurveTo(x0+(x1-x0)*.35,-w,x1,0);c.quadraticCurveTo(x0+(x1-x0)*.35,w,x0,0);c.closePath();c.fill()}
 // layer 'under' paints ground decals (runes, fissures, portal pool) beneath the actors.
 draw(c,layer='top'){const U=layer==='under';for(const fx of this.effects){if(fx.type==='ghost')continue;if(U!==(fx.type==='authority'||fx.type==='summon')&&U)continue;const t=1-fx.remaining/fx.duration,fade=Math.sin(Math.PI*Math.min(1,t*1.1)),out=1-t,r=seeded(Math.floor(fx.seed));c.save();c.translate(fx.x,fx.y-14);c.globalCompositeOperation='lighter';
  if(fx.type==='combo'){c.rotate(fx.angle);const v=fx.variant,dir=v===2?-1:1,sweep=v===3?2.8:2.1,R=v===3?76:64,head=Math.min(1,t*2.2),a1=-sweep/2+sweep*head,a0=Math.max(-sweep/2,a1-sweep*.85);
   this.crescent(c,R,a0,a1,30*out+6,'#5a1ad8',fade*.35,dir);this.crescent(c,R+2,a0+.15,a1,20*out+4,'#7b2cff',fade*.55,dir);this.crescent(c,R,a0+.3,a1,12*out+3,'#3fd6ff',fade*.85,dir);this.crescent(c,R-1,a0+.5,a1,5*out+1.5,'#f4ecff',fade,dir);
   c.globalAlpha=fade*.5;c.strokeStyle='#b06bff';c.lineWidth=1.5;for(let i=0;i<4;i++){const rr=R+14+i*7,aa=a1-.25-i*.12;c.beginPath();c.arc(0,0,rr,(aa-.5)*dir,aa*dir,dir<0);c.stroke()}
   if(v===3){c.globalAlpha=fade;for(const s of [-1,1]){c.save();c.rotate(s*.55);this.spindle(c,10,130*Math.min(1,t*3),9*out+2,'#7b2cff',fade*.6);this.spindle(c,14,124*Math.min(1,t*3),4*out+1,'#3fd6ff',fade*.9);this.spindle(c,18,118*Math.min(1,t*3),1.6,'#ffffff',fade);c.restore()}
    c.globalAlpha=fade*.7;c.strokeStyle='#b06bff';c.lineWidth=3*out+1;c.beginPath();c.arc(78,0,8+46*t,0,Math.PI*2);c.stroke();c.strokeStyle='#3fd6ff';c.lineWidth=1.5;c.beginPath();c.arc(78,0,4+30*t,0,Math.PI*2);c.stroke()}}
  else if(fx.type==='vital'){c.rotate(fx.angle);const L=60+120*Math.min(1,t*2.5);
   this.spindle(c,-30,L+20,24*out+6,'#4a12b8',fade*.45);this.spindle(c,-20,L+10,12*out+3,'#7b2cff',fade*.7);this.spindle(c,-10,L,6*out+2,'#3fd6ff',fade*.95);this.spindle(c,0,L-6,2.2,'#ffffff',fade);
   c.strokeStyle='#b06bff';c.lineWidth=1.4;for(let i=0;i<7;i++){const yy=(r()-.5)*40*(.3+t),x0=-20+r()*60;c.globalAlpha=fade*(.3+r()*.5);c.beginPath();c.moveTo(x0,yy);c.lineTo(x0+60+r()*80*t,yy*.4);c.stroke()}
   const tx=L+4;c.globalAlpha=fade;c.strokeStyle='#e8f8ff';c.lineWidth=3*out+1;const s=10+16*t;c.beginPath();c.moveTo(tx-s,-s);c.lineTo(tx+s,s);c.moveTo(tx-s,s);c.lineTo(tx+s,-s);c.stroke();c.fillStyle='#ffffff';c.beginPath();c.arc(tx,0,5*out+2,0,Math.PI*2);c.fill();
   c.globalAlpha=fade*.35;c.fillStyle='#7b2cff';c.beginPath();c.arc(tx,0,22*out+8,0,Math.PI*2);c.fill()}
  else if(fx.type==='mutilation'){c.rotate(fx.angle);const v=fx.variant;for(let i=0;i<2;i++){const rr=seeded(v*31+i*7+Math.floor(fx.seed)),rot=(rr()-.5)*2.2,len=70+rr()*30,off=40+rr()*30;c.save();c.translate(off,(rr()-.5)*30);c.rotate(rot+Math.PI/2);const k=Math.min(1,t*3),a=-len/2,b=-len/2+len*k;
    c.save();c.translate(0,0);this.spindleV(c,a,b,9*out+3,'#7b2cff',fade*.6);this.spindleV(c,a+4,b,4*out+1.5,'#3fd6ff',fade*.9);this.spindleV(c,a+8,b,1.5,'#ffffff',fade);c.restore();c.restore()}
   c.globalAlpha=fade*.5;c.strokeStyle='#b06bff';c.lineWidth=2;c.beginPath();c.arc(60,0,10+30*t,0,Math.PI*2);c.stroke()}
  else if(fx.type==='authority'){const E=Math.min(1,t*1.6),R=30+190*E;c.translate(0,24);
   c.save();c.scale(1,.55);if(U){c.globalCompositeOperation='source-over';c.globalAlpha=.5*fade;const g=c.createRadialGradient(0,0,4,0,0,R);if(g){g.addColorStop(0,'rgba(10,2,24,.9)');g.addColorStop(.7,'rgba(30,8,60,.55)');g.addColorStop(1,'rgba(30,8,60,0)')}c.fillStyle=g||'rgba(20,6,40,.5)';c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.fill();c.globalCompositeOperation='lighter';
    // Fissures with glowing edges.
    for(let i=0;i<9;i++){const b=i/9*Math.PI*2+r()*.4,len=R*(.6+r()*.4);c.beginPath();let px=Math.cos(b)*14,py=Math.sin(b)*14;c.moveTo(px,py);for(let s=1;s<=6;s++){const d=len*s/6,j=(r()-.5)*.5;px=Math.cos(b+j)*d;py=Math.sin(b+j)*d;c.lineTo(px,py)}c.globalAlpha=fade*.9;c.strokeStyle='#7b2cff';c.lineWidth=5*out+2;c.stroke();c.strokeStyle='#3fd6ff';c.lineWidth=1.6;c.stroke()}
    // Rune circle.
    c.globalAlpha=fade;c.strokeStyle='#b06bff';c.lineWidth=2;c.beginPath();c.arc(0,0,R*.62,0,Math.PI*2);c.stroke();c.strokeStyle='#3fd6ff';c.lineWidth=1;c.beginPath();c.arc(0,0,R*.55,0,Math.PI*2);c.stroke();
    for(let i=0;i<16;i++){const b=i/16*Math.PI*2+t*1.4;c.save();c.rotate(b);c.translate(R*.585,0);c.fillStyle=i%2?'#b06bff':'#3fd6ff';c.fillRect(-2,-5,4,10);c.fillRect(-5,-1,10,2);c.restore()}
    }else{// Shockwaves.
    c.globalAlpha=fade;c.strokeStyle='#e8f8ff';c.lineWidth=6*out+1;c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.stroke();c.strokeStyle='#7b2cff';c.lineWidth=10*out+2;c.globalAlpha=fade*.5;c.beginPath();c.arc(0,0,R*.85,0,Math.PI*2);c.stroke()}c.restore();
   // Pillars of shadow energy.
   if(!U)for(let i=0;i<7;i++){const b=i/7*Math.PI*2+r(),d=R*(.35+r()*.5),px=Math.cos(b)*d,py=Math.sin(b)*d*.55,h=(40+r()*60)*Math.sin(Math.PI*Math.min(1,t*1.4));c.globalAlpha=fade*.55;const lg=c.createLinearGradient(0,py,0,py-h);if(lg){lg.addColorStop(0,'rgba(123,44,255,.9)');lg.addColorStop(1,'rgba(63,214,255,0)')}c.fillStyle=lg||'#7b2cff';c.fillRect(px-3,py-h,6,h);c.fillStyle='#e8f8ff';c.globalAlpha=fade*.8;c.fillRect(px-.5,py-h*.8,1,h*.8)}}
  else if(fx.type==='summon'){c.translate(0,38);const E=Math.min(1,t*2),R=26+40*E;
   if(U){c.save();c.scale(1,.4);c.globalCompositeOperation='source-over';c.globalAlpha=.8*fade;c.fillStyle='#06020c';c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.fill();c.globalCompositeOperation='lighter';c.globalAlpha=fade;c.strokeStyle='#7b2cff';c.lineWidth=6;c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.stroke();c.strokeStyle='#c785ff';c.lineWidth=2;c.beginPath();c.arc(0,0,R+4,0,Math.PI*2);c.stroke();
    for(let i=0;i<12;i++){const b=i/12*Math.PI*2-t*2;c.save();c.rotate(b);c.translate(R+14,0);c.fillStyle=i%3?'#b06bff':'#3fd6ff';c.fillRect(-3,-6,6,12);c.restore()}c.restore();c.restore();continue}
   // Shadow tendrils rising from the pool.
   for(let i=0;i<9;i++){const bx=(r()-.5)*R*1.6,h=(30+r()*60)*Math.sin(Math.PI*Math.min(1,t*1.3)),ph=r()*6;c.beginPath();c.moveTo(bx,0);for(let s=1;s<=8;s++){const k=s/8;c.lineTo(bx+Math.sin(ph+k*5+t*8)*7*k,-h*k)}c.globalAlpha=fade*.7;c.strokeStyle='#5a1ad8';c.lineWidth=5*(1-t*.5);c.stroke();c.strokeStyle='#c785ff';c.lineWidth=1.5;c.stroke()}
   c.globalAlpha=fade*.35;c.fillStyle='#7b2cff';c.beginPath();c.ellipse(0,-10,R*.8,R*.5,0,0,Math.PI*2);c.fill()}
  c.restore()}}
 spindleV(c,a,b,w,col,alpha){c.globalAlpha=alpha;c.fillStyle=col;c.beginPath();c.moveTo(0,a);c.quadraticCurveTo(-w,a+(b-a)*.6,0,b);c.quadraticCurveTo(w,a+(b-a)*.6,0,a);c.closePath();c.fill()}
}
class ParticleSystem{
 constructor(){this.p=[]}
 burst(x,y,color,n=10,o={}){n=Math.max(1,Math.round(n*(this.density||1)));const sp=o.speed||110,spread=o.spread??Math.PI*2;for(let i=0;i<n;i++){const a=o.angle!==undefined?o.angle+rand(-spread/2,spread/2):rand(0,Math.PI*2),v=rand(sp*.35,sp),life=rand(.25,.7)*(o.life||1);this.p.push({kind:o.kind||(i%3?'sq':'streak'),x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(o.lift||0),life,max:life,color,size:o.size||rand(2,4),g:o.gravity||(o.kind==='ember'?-18:0),drag:o.drag??(o.kind==='smoke'?1.6:2.2),seed:Math.random()*6})}}
 ring(x,y,color,r=60,life=.35,width=3){this.p.push({kind:'ring',x,y,vx:0,vy:0,r,life,max:life,color,size:width,g:0,drag:0})}
 update(dt){this.p=this.p.filter(p=>(p.life-=dt)>0);for(const p of this.p){const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='wisp'){p.x+=Math.sin(p.life*9+p.seed)*26*dt;p.vy-=30*dt}}const cap=this.cap||900;if(this.p.length>cap)this.p.splice(0,this.p.length-cap)}
 draw(c){c.save();for(const p of this.p)if(p.kind==='smoke'){const k=p.life/p.max,r=p.size*(1+(1-k)*1.8);c.globalAlpha=.26*Math.min(1,k*1.4)*Math.min(1,(1-k)*8);c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();c.globalAlpha*=.6;c.fillStyle='#3a1470';c.beginPath();c.arc(p.x-r*.2,p.y-r*.25,r*.55,0,Math.PI*2);c.fill()}
  c.globalCompositeOperation='lighter';for(const p of this.p){if(p.kind==='smoke')continue;const k=p.life/p.max;c.globalAlpha=Math.min(1,k*1.6);c.fillStyle=p.color;c.strokeStyle=p.color;
  if(p.kind==='ember'){const s=p.size*(.4+k*.6);c.fillRect(p.x-s/2,p.y-s/2,s,s);c.globalAlpha*=.25;c.fillRect(p.x-s*1.5,p.y-s*1.5,s*3,s*3);continue}
  if(p.kind==='wisp'){c.lineWidth=p.size;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-Math.sin(p.life*9+p.seed)*4,p.y+8*k+3);c.stroke();continue}
  if(p.kind==='shard'){const a=Math.atan2(p.vy,p.vx),l=p.size*2.5;c.beginPath();c.moveTo(p.x+Math.cos(a)*l,p.y+Math.sin(a)*l);c.lineTo(p.x+Math.cos(a+2.4)*p.size,p.y+Math.sin(a+2.4)*p.size);c.lineTo(p.x+Math.cos(a-2.4)*p.size,p.y+Math.sin(a-2.4)*p.size);c.closePath();c.fill();continue}
  if(p.kind==='ring'){c.lineWidth=p.size*k+.5;c.beginPath();c.ellipse(p.x,p.y,p.r*(1-k)+4,(p.r*(1-k)+4)*.6,0,0,Math.PI*2);c.stroke()}
  else if(p.kind==='streak'){c.lineWidth=p.size*.7;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.05,p.y-p.vy*.05);c.stroke()}
  else c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size*(.5+k*.5),p.size*(.5+k*.5))}c.restore()}
}
class SaveSystem{static save(g){try{localStorage.setItem('shadow-protocol-save',JSON.stringify({player:g.player.data(),army:g.army,quest:g.quest,questDone:g.questDone,questDate:g.questDate,unlocked:g.unlocked,daily:g.daily,bestiary:g.bestiary,hunter:g.hunter,contracts:g.contracts,story:g.story,tutorial:g.tutorialDone||0,dayTime:g.dayTime||0,cityIndex:g.cityIndex||0}))}catch(e){console.warn('Não foi possível salvar:',e)}}
 static load(){try{return JSON.parse(localStorage.getItem('shadow-protocol-save'))}catch{return null}}
 // Export / import: the whole save travels as a compact base64 string, so the player can move
 // between PC and phone (or keep a backup) without any server.
 static export(g){try{return btoa(unescape(encodeURIComponent(JSON.stringify({player:g.player.data(),army:g.army,quest:g.quest,questDone:g.questDone,questDate:g.questDate,unlocked:g.unlocked,daily:g.daily,bestiary:g.bestiary,hunter:g.hunter,contracts:g.contracts,story:g.story,tutorial:g.tutorialDone||0,dayTime:g.dayTime||0,cityIndex:g.cityIndex||0}))))}catch(e){return null}}
 static import(code){try{const o=JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));if(!o||!o.player)return null;try{localStorage.setItem('shadow-protocol-save',JSON.stringify(o))}catch(e){}return o}catch(e){return null}}}
class Player{constructor(data={}){Object.assign(this,{x:HUB.spawn.x,y:HUB.spawn.y,level:1,xp:0,gold:250,points:0,stats:{FOR:5,AGI:5,VIT:5,INT:5,PER:5},weapon:0,owned:[0],hppots:3,mppots:3,hp:225,mp:125,playerClass:0,items:[],equipped:{weapon:null,cape:null},talents:{},talentPoints:0,distance:0,dashes:0,kills:0},data);this.owned=Array.isArray(this.owned)?this.owned:[0,this.weapon];if(!this.owned.includes(this.weapon))this.owned.push(this.weapon);this.equipped=this.equipped||{weapon:null,cape:null};this.talents=this.talents||{};this.items=Array.isArray(this.items)?this.items:[];this.x=HUB.spawn.x;this.y=HUB.spawn.y;this.cool=0;this.dashCd=0;this.slash=0;this.dashTime=0;this.invuln=0;this.stealth=0;this.angle=0;this.combo=0;this.hurtTime=0;this.slow=0}
 get maxhp(){return Math.round((100+this.stats.VIT*25)*(1+talentLevel('vit_hp')*.08)*(this.playerClass>=1?1.15:1))}get maxmp(){return 50+this.stats.INT*15}
 get rank(){return ['E','D','C','B','A','S'][Math.min(5,Math.floor(this.level/10))]}
 get atk(){let a=10+this.stats.FOR*3.5+weapons[this.weapon].damage;for(const id of this.items)if(id&&ITEMS[id]&&ITEMS[id].slot==='weapon'&&this.equipped.weapon===id)a+=ITEMS[id].damage;return a}
 get armor(){let a=0;for(const id of this.items)if(id&&ITEMS[id]&&ITEMS[id].slot==='cape'&&this.equipped.cape===id)a+=ITEMS[id].armor||0;return a}
 get shadowPowerMult(){let m=1;for(const id of this.items)if(id&&ITEMS[id]&&ITEMS[id].effect&&ITEMS[id].effect.kind==='shadow'&&this.equipped.cape===id)m*=ITEMS[id].effect.mult;return m}
 get classColor(){return ['#b46bff','#7fe8ff','#ffd27a'][this.playerClass]||'#b46bff'}
 data(){let {level,xp,gold,points,stats,weapon,owned,hppots,mppots,hp,mp,playerClass,items,equipped,talents,talentPoints,distance,dashes,kills}=this;return {level,xp,gold,points,stats,weapon,owned,hppots,mppots,hp,mp,playerClass,items,equipped,talents,talentPoints,distance,dashes,kills}}}
// ---------------------------------------------------------------------------------------------
// City hub: the original association lobby sits in the middle of a modern Seoul-like district.
// The map grew from 4200x3000 to 7600x5200: an east district (Gwanghwamun plaza, Myeongdong
// market street, Hunter Arena, Hongdae neon blocks) and, across the Han river (four bridges),
// the south district (Hangang park, Yongsan station, school, night market, residential blocks
// with back alleys). Lobby drawing keeps its own local coordinates, translated by (ox, oy).
const HUB={w:7600,h:5200,ox:1200,oy:900};
HUB.spawn={x:HUB.ox+900,y:HUB.oy+790};HUB.merchant={x:HUB.ox+310,y:HUB.oy+620};HUB.healer={x:HUB.ox+1490,y:HUB.oy+620};HUB.contractBoard={x:HUB.ox+1000,y:HUB.oy+440};HUB.jinho={x:HUB.ox+700,y:HUB.oy+760};HUB.portal2={x:HUB.ox+1150,y:HUB.oy+760};
HUB.posts=[{x:HUB.ox+800,y:HUB.oy+402,dir:2},{x:HUB.ox+1000,y:HUB.oy+402,dir:2}];
const RIVER={y:2800,h:200};
const NAMES={
 shop:['CONVENIÊNCIA GS25','CAFÉ HUNTER','PADARIA PARIS','FARMÁCIA','LOJA DE POÇÕES','KIMBAP NARA','CHIMAEK','ÓTICA','LIVRARIA','TTEOKBOKKI','ARMARIA ORION','RELICÁRIO','BBQ COREANO','CAFÉ LUA','MANHWA CAFÉ','MERCADO 24H','FLORICULTURA','SORVETERIA','LOJA DE CRISTAIS','BOBA TEA'],
 neon:['NEON NOIR','GAME ZONE','CLUB GATE','BAR S-RANK','KARAOKÊ STAR','ARCADE 8-BIT','HOTEL LUA','SALÃO LOTUS','NORAEBANG','PC BANG 2'],
 tower:['TORRE YOOJIN','GRUPO CHOI','SEOUL BANK','KHN NEWS','HAN IND.','TORRE SAMWOO','EDIFÍCIO DAEHO','MIRAE TOWER','REALITY CORP','SUNG TECH','TORRE SEJONG','KOREA LIFE'],
 apartment:['APTS. SEONGSU','RESIDENCIAL MAPO','APTS. HANNAM','VILA ITAEWON','APTS. JAMSIL','RESIDENCIAL SINDANG','APTS. BANPO','APTS. YONGSAN','VILA HONGJE','APTS. SEOCHO'],
 guild:['GUILDA HWANG','GUILDA YUKGYEONG','GUILDA DOS CEIFADORES','GUILDA FAMA'],
};
const CITY=(()=>{
 const W=HUB.w,H=HUB.h,rnd=seeded(7),pick=a=>a[Math.floor(rnd()*a.length)],used=new Set(),name=t=>{const pool=NAMES[t]||NAMES.shop;for(let i=0;i<8;i++){const n=pick(pool);if(!used.has(n)){used.add(n);return n}}return pick(pool)};
 const R=(x,y,w,h,o={})=>({x,y,w,h,...o});
 const roads=[R(0,700,W,160,{main:true,traffic:true}),R(0,2140,W,160,{main:true,traffic:true}),R(0,250,W,120),R(1000,0,160,H,{main:true,traffic:true}),R(3040,0,160,H,{main:true,traffic:true}),R(430,0,100,700),R(430,2300,100,440),R(3700,0,100,2740),
  R(0,3060,W,160,{main:true,traffic:true}),R(0,4560,W,160,{main:true,traffic:true}),R(0,3900,W,100),R(4400,1420,3200,100),R(4240,0,160,H,{main:true,traffic:true}),R(5600,0,160,H,{main:true,traffic:true}),
  R(430,3220,100,H-3220),R(2080,3220,100,680),R(3700,3220,100,H-3220),R(6600,0,100,2740),R(6600,3220,100,H-3220)];
 const B=(x,y,w,h,type,nm,color)=>({x,y,w,h,type,name:nm,color,roof:Math.min(Math.round(h*.38),95)});
 // Original district (unchanged layout).
 const buildings=[
  B(20,20,390,210,'apartment','GANGNAM RESIDENCE','#5d6b78'),B(550,20,430,210,'tower','HUNTER NET','#2c3e55'),B(1180,20,520,210,'guild','AHJIN GUILD','#1d1a2e'),
  B(1740,20,720,210,'tower','SEOUL MEDIA TOWER','#32465c'),B(2500,20,520,210,'guild','WHITE TIGER GUILD','#d8dde2'),B(3220,20,460,210,'apartment','HANGANG APTS','#6f6458'),B(3820,20,360,210,'guild','FIEND GUILD','#3a1f26'),
  B(20,390,190,290,'shop','24/7 MART','#3d7f5a'),B(220,390,190,290,'shop','CAFÉ GATE','#7a5236'),B(550,390,430,290,'hospital','HUNTER MEDICAL','#dfe7ea'),
  B(1180,400,340,270,'guild','KNIGHTS GUILD','#4a3a2a'),B(2680,400,340,270,'guild','HUNTERS GUILD','#20304a'),
  B(3220,390,145,290,'shop','RAMEN','#a8423a'),B(3375,390,145,290,'shop','PC BANG','#3a3f8a'),B(3530,390,150,290,'shop','ARMAS & EQUIP','#4a5560'),
  B(3220,880,460,600,'tower','HUNTER MALL','#3a4c5e'),B(3220,1520,460,600,'apartment','SAMSEONG APTS','#7a6d60'),B(3820,880,360,600,'tower','GATE RESEARCH LAB','#2d3a40'),
  B(20,2320,390,400,'apartment','YEOUIDO APTS','#66707a'),B(550,2320,430,400,'hospital','HUNTER ACADEMY','#c8c2b0'),B(3220,2320,460,400,'shop','MERCADO NOTURNO','#5a3a5a'),B(3820,2320,360,400,'apartment','RIVERSIDE','#5f6f7a'),
 ];
 for(const n of ['GANGNAM RESIDENCE','HUNTER NET','RAMEN','PC BANG'])used.add(n);
 const parks=[{x:0,y:860,w:1000,h:1280,kind:'park'},{x:1560,y:380,w:1100,h:310,kind:'plaza'},{x:3820,y:390,w:360,h:290,kind:'parking'},{x:3820,y:1520,w:360,h:600,kind:'construction'},{x:1160,y:2300,w:1880,h:440,kind:'square'}];
 const alleys=[],decor=[],extraSolids=[],stalls=[],walk=[],pois=[];
 const PALETTE={shop:['#3d7f5a','#7a5236','#a8423a','#3a3f8a','#4a5560','#8a5a2a','#2a6a6a','#7a3a5a'],neon:['#1a1424','#14182a','#221420','#101c24'],tower:['#2c3e55','#32465c','#3a4c5e','#2d3a40','#40505e','#26323e'],apartment:['#5d6b78','#6f6458','#7a6d60','#66707a','#5f6f7a','#7a705e','#6a5a52'],guild:['#1d1a2e','#3a1f26','#20304a']};
 const TYPES={commercial:['shop','shop','neon','tower','shop'],office:['tower','tower','shop','guild'],residential:['apartment','apartment','apartment','shop'],neon:['neon','neon','shop','neon']};
 // Fills a city block with one or two rows of buildings, separated by a service alley; some lots
 // leave a 46px pedestrian alley (beco) that links the street to the back alley.
 const fill=(x,y,w,h,style='commercial')=>{const rows=h>=440?2:1,ah=60,rh=rows===2?Math.floor((h-ah)/2):h;
  for(let r=0;r<rows;r++){const ry=y+r*(rh+ah);let cx=x;
   while(cx<x+w-90){let bw=Math.round(170+rnd()*250);if(x+w-cx-bw<160)bw=x+w-cx;const type=pick(TYPES[style]);buildings.push(B(cx,ry,bw,rh,type,name(type),pick(PALETTE[type])));cx+=bw;
    if(cx<x+w-160){if(rnd()<.42){alleys.push({x:cx,y:ry,w:46,h:rh,v:true});walk.push({axis:'v',c:cx+23,a:ry-32,b:ry+rh+32,alley:true});
      if(rnd()<.6)decor.push({kind:rnd()<.5?'vending':'bins',x:cx+4,y:ry+rh*.35+rnd()*rh*.3});cx+=46}else cx+=8}}}
  if(rows===2){const ay=y+rh;alleys.push({x,y:ay,w,h:ah,v:false});walk.push({axis:'h',c:ay+34,a:x-32,b:x+w+32,alley:true});
   for(let dx=x+40+rnd()*80;dx<x+w-80;dx+=150+rnd()*160){const k=rnd();if(k<.45){decor.push({kind:'dumpster',x:dx,y:ay+3});extraSolids.push({x:dx,y:ay+3,w:38,h:20})}else if(k<.7)decor.push({kind:'boxes',x:dx,y:ay+4});else decor.push({kind:'steam',x:dx,y:ay+4})}
   for(let dx=x+60;dx<x+w-40;dx+=180)decor.push({kind:'lanternline',x:dx,y:ay,w:Math.min(140,x+w-dx-20)})}};
 // East district (x 4400-7600).
 const E1=[4420,1160],E2=[5780,800],E3=[6720,860];
 fill(E1[0],20,E1[1],210,'office');fill(E2[0],20,E2[1],210,'office');fill(E3[0],20,E3[1],210,'commercial');
 fill(E1[0],390,E1[1],290,'commercial');fill(E2[0],390,E2[1],290,'commercial');parks.push({x:E3[0],y:390,w:E3[1],h:290,kind:'parking'});
 parks.push({x:E1[0],y:880,w:E1[1],h:520,kind:'grandplaza'});extraSolids.push({x:4960,y:1112,w:80,h:56},{x:4650,y:1118,w:100,h:44},{x:5250,y:1118,w:100,h:44});
 fill(E2[0],880,E2[1],200,'commercial');fill(E2[0],1200,E2[1],200,'commercial');parks.push({x:E2[0],y:1080,w:E2[1],h:120,kind:'market'});walk.push({axis:'h',c:1140,a:5740,b:6620});
 for(let sx=E2[0]+30;sx<E2[0]+E2[1]-80;sx+=120){const top=((sx/120)|0)%2===0;stalls.push({x:sx,y:top?1084:1162,w:72,h:32,color:pick(['#c23a3a','#d8a020','#2a8a6a','#3a6ad8','#e86a3a','#a83a8a']),food:pick(['TTEOK','ODENG','HOTTEOK','KIMBAP','ESPETOS','DAKGANG']),top})}
 fill(E3[0],880,E3[1],520,'commercial');
 buildings.push(B(4520,1560,960,400,'arena','ARENA DOS CAÇADORES','#2a3442'));parks.push({x:E1[0],y:1960,w:E1[1],h:160,kind:'plaza'});walk.push({axis:'h',c:2040,a:4380,b:5620});
 fill(E2[0],1540,E2[1],580,'residential');fill(E3[0],1540,E3[1],580,'neon');
 fill(E1[0],2320,E1[1],400,'residential');parks.push({x:E2[0],y:2320,w:E2[1],h:400,kind:'park2'},{x:E3[0],y:2320,w:E3[1],h:400,kind:'park2'});
 // South district (y 3220-5200).
 const S0a=[20,390],S0b=[550,430],S1=[1180,1840],S1a=[1180,880],S1b=[2200,820],S2a=[3220,460],S2b=[3820,400];
 parks.push({x:S0a[0],y:3240,w:S0a[1],h:640,kind:'park2'},{x:S0b[0],y:3240,w:S0b[1],h:640,kind:'park2'});
 fill(S1a[0],3240,S1a[1],640,'residential');fill(S1b[0],3240,S1b[1],640,'commercial');fill(S2a[0],3240,S2a[1],640,'commercial');fill(S2b[0],3240,S2b[1],640,'residential');
 fill(E1[0],3240,E1[1],640,'commercial');fill(E2[0],3240,E2[1],640,'neon');
 buildings.push(B(E3[0],3240,E3[1],250,'school','ESCOLA SEOUL-SUL','#b8a888'));parks.push({x:E3[0],y:3500,w:E3[1],h:380,kind:'field'});walk.push({axis:'h',c:3505,a:E3[0]-32,b:E3[0]+E3[1]+32});
 fill(S0a[0],4020,S0a[1],520,'residential');fill(S0b[0],4020,S0b[1],520,'residential');
 buildings.push(B(S1[0],4020,S1[1],320,'station','ESTAÇÃO YONGSAN','#3a4652'));parks.push({x:S1[0],y:4340,w:S1[1],h:200,kind:'plaza'});walk.push({axis:'h',c:4440,a:1140,b:3060});
 fill(S2a[0],4020,S2a[1],520,'commercial');fill(S2b[0],4020,S2b[1],520,'commercial');fill(E1[0],4020,E1[1],520,'office');parks.push({x:E2[0],y:4020,w:E2[1],h:520,kind:'construction'});fill(E3[0],4020,E3[1],520,'residential');
 fill(S0a[0],4740,S0a[1],440,'residential');fill(S0b[0],4740,S0b[1],440,'commercial');
 parks.push({x:S1[0],y:4740,w:S1[1],h:440,kind:'marketsq'});walk.push({axis:'h',c:4960,a:1140,b:3060});
 for(let sx=S1[0]+70;sx<S1[0]+S1[1]-100;sx+=170)for(const sy of [4800,5070]){stalls.push({x:sx,y:sy,w:84,h:34,color:pick(['#c23a3a','#d8a020','#2a8a6a','#3a6ad8','#e86a3a','#a83a8a']),food:pick(['LÁMEN','TTEOK','ODENG','HOTTEOK','KIMBAP','ESPETOS','SUNDAE','BINDAETTEOK']),top:sy<4900})}
 fill(S2a[0],4740,S2a[1],440,'residential');fill(S2b[0],4740,S2b[1],440,'commercial');fill(E1[0],4740,E1[1],440,'commercial');fill(E2[0],4740,E2[1],440,'residential');parks.push({x:E3[0],y:4740,w:E3[1],h:440,kind:'parking'});
 for(const s of stalls)extraSolids.push({x:s.x,y:s.y,w:s.w,h:s.h});
 // Pedestrian network lines (sidewalks, alleys, park paths, plazas, promenades).
 for(const r of roads){if(r.w>r.h){walk.push({axis:'h',c:r.y+8,a:r.x,b:r.x+r.w,side:true},{axis:'h',c:r.y+r.h-8,a:r.x,b:r.x+r.w,side:true})}else{walk.push({axis:'v',c:r.x+8,a:r.y,b:r.y+r.h,side:true},{axis:'v',c:r.x+r.w-8,a:r.y,b:r.y+r.h,side:true})}}
 walk.push({axis:'h',c:1502,a:0,b:1012},{axis:'v',c:502,a:848,b:2152},{axis:'h',c:HUB.oy+760,a:1140,b:3060},{axis:'v',c:HUB.ox+640,a:HUB.oy+410,b:2160},{axis:'v',c:HUB.ox+1160,a:HUB.oy+410,b:2160},{axis:'h',c:HUB.oy+420,a:HUB.ox+430,b:HUB.ox+1370},
  {axis:'h',c:1010,a:4380,b:5620},{axis:'h',c:1290,a:4380,b:5620},{axis:'v',c:4560,a:840,b:1440},{axis:'v',c:5440,a:840,b:1440},{axis:'h',c:RIVER.y-30,a:0,b:W},{axis:'h',c:RIVER.y+RIVER.h+30,a:0,b:W});
 for(const p of parks)if(p.kind==='park2'){walk.push({axis:'h',c:p.y+p.h/2,a:p.x-32,b:p.x+p.w+32},{axis:'v',c:p.x+p.w/2,a:p.y-32,b:p.y+p.h+32})}
 // Points of interest: shop windows (browse), building doors (hunters), benches and plaza spots.
 for(const b of buildings){const fy=b.y+b.h+10;if(fy>RIVER.y-60&&fy<RIVER.y+RIVER.h+60)continue;
  if(b.type==='shop'||b.type==='neon'){for(let i=0;i<(b.w>260?2:1);i++)pois.push({x:Math.round(b.x+b.w*(i+1)/((b.w>260?2:1)+1)),y:fy,kind:'shop',face:6})}
  else if(b.type==='guild'||b.type==='arena'||b.type==='tower')pois.push({x:Math.round(b.x+b.w/2),y:fy,kind:b.type==='guild'||b.type==='arena'?'guild':'door',face:6})}
 for(const s of stalls)pois.push({x:s.x+s.w/2,y:s.top?s.y+s.h+12:s.y-12,kind:'shop',face:s.top?6:2});
 for(const [x,y] of [[HUB.ox+300,HUB.oy+690],[HUB.ox+1480,HUB.oy+690],[HUB.ox+700,HUB.oy+460],[HUB.ox+1100,HUB.oy+460],[HUB.ox+900,HUB.oy+470],[HUB.ox+760,HUB.oy+800],[HUB.ox+1040,HUB.oy+800]])pois.push({x,y,kind:'plaza',face:-1});
 for(const [x,y] of [[1700,600],[2100,600],[2500,600],[4700,1010],[5300,1010],[4800,1290],[5200,1290],[5000,2040],[2100,4440],[1600,4440],[2600,4440],[2100,2440],[1600,2440],[2600,2440]])pois.push({x,y,kind:'plaza',face:-1});
 // Static props and solids.
 const trees=[],lamps=[],cars=[],benches=[];
 for(let i=0;i<60;i++){const x=40+rnd()*920,y=900+rnd()*1200;if(!(x>110&&x<390&&y>1050&&y<1250)&&!(x>100&&x<420&&y>1700&&y<1910)&&!(Math.abs(y-1502)<40)&&!(Math.abs(x-502)<40))trees.push({x,y,s:.8+rnd()*.5})}
 for(let x=1600;x<2650;x+=150){trees.push({x,y:410,s:.8});trees.push({x,y:665,s:.8})}
 for(const p of parks){if(p.kind==='park2'){const n=Math.floor(p.w*p.h/16000);for(let i=0;i<n;i++){const x=p.x+20+rnd()*(p.w-40),y=p.y+40+rnd()*(p.h-50);if(Math.abs(x-(p.x+p.w/2))<40||Math.abs(y-(p.y+p.h/2))<44)continue;if(p.w*p.h>250000&&Math.hypot((x-p.x-p.w*.25)/110,(y-p.y-p.h*.25)/70)<1.3)continue;trees.push({x,y,s:.75+rnd()*.55})}
   if(p.w*p.h>250000){extraSolids.push({x:p.x+p.w*.25-95,y:p.y+p.h*.25-45,w:190,h:90})}}
  if(p.kind==='grandplaza'){for(let x=p.x+60;x<p.x+p.w-40;x+=110){trees.push({x,y:p.y+40,s:.7});trees.push({x,y:p.y+p.h-20,s:.7})}}
  if(p.kind==='plaza'&&p.y>3000)for(let x=p.x+80;x<p.x+p.w-40;x+=160)trees.push({x,y:p.y+p.h-16,s:.65})}
 const inRoad=(x,y,m=0)=>roads.some(r=>x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m);
 for(const r of roads){const hor=r.w>r.h,len=hor?r.w:r.h,step=260;
  for(let s=60;s<len;s+=step){if(hor){const x1=r.x+s,x2=r.x+s+130;if(!inRoad(x1,r.y-10)&&!(r.y-10>RIVER.y-70&&r.y-10<RIVER.y+RIVER.h+70))lamps.push({x:x1,y:r.y-10});if(x2<r.x+r.w&&!inRoad(x2,r.y+r.h+8))lamps.push({x:x2,y:r.y+r.h+8})}
   else{const y1=r.y+s,y2=r.y+s+130;if(!inRoad(r.x-10,y1)&&!(y1>RIVER.y-40&&y1<RIVER.y+RIVER.h+40))lamps.push({x:r.x-10,y:y1});if(y2<r.y+r.h&&!inRoad(r.x+r.w+10,y2)&&!(y2>RIVER.y-40&&y2<RIVER.y+RIVER.h+40))lamps.push({x:r.x+r.w+10,y:y2})}}}
 for(let x=80;x<W;x+=210){if(!inRoad(x,RIVER.y-48))lamps.push({x,y:RIVER.y-48});if(!inRoad(x+105,RIVER.y+RIVER.h+50))lamps.push({x:x+105,y:RIVER.y+RIVER.h+50})}
 const carColors=['#c94a4a','#e0e0e0','#2a4a8a','#1a1a1a','#d8b04a','#4a7a5a','#8a8a96','#3a3a6a','#e8e8e8','#5a2a2a'];
 for(const p of parks)if(p.kind==='parking'){const cols=Math.floor((p.w-40)/72);for(const row of [0,1])for(let i=0;i<cols;i++){if(rnd()<.28)continue;cars.push({x:p.x+30+i*72+36,y:row?p.y+p.h-55:p.y+55,color:pick(carColors),parked:true,angle:row?-Math.PI/2:Math.PI/2,len:52,wid:24})}}
 for(const [x,y] of [[1700,520],[1900,520],[2300,520],[2500,520],[300,1450],[700,1450],[1500,2420],[2700,2420],[4640,1010],[5360,1010],[4640,1290],[5360,1290],[4700,2060],[5300,2060],[1500,4400],[2700,4400]])benches.push({x,y});
 for(const p of parks)if(p.kind==='park2')for(let i=0;i<3;i++)benches.push({x:p.x+p.w/2+(i-1)*Math.min(140,p.w*.3)+30,y:p.y+p.h/2-22});
 // Bus stops along the main avenues and hydrants at corners.
 for(const r of roads)if(r.main&&r.w>r.h)for(let x=r.x+700;x<r.x+r.w-200;x+=1400){if(!inRoad(x,r.y-14)&&!inRoad(x+60,r.y-14))decor.push({kind:'busstop',x,y:r.y-4})}
 const lobbySolids=[[540,50,720,272],[205,360,210,205],[1385,360,210,205],[838,648,124,62]].map(([x,y,w,h])=>({x:x+HUB.ox,y:y+HUB.oy,w,h}));
 // River: solid water except where the main avenues cross on bridges.
 const bridges=roads.filter(r=>r.h>r.w&&r.y<RIVER.y&&r.y+r.h>RIVER.y+RIVER.h).sort((a,b)=>a.x-b.x),river=[];let rx=0;for(const b of bridges){river.push({x:rx,y:RIVER.y,w:b.x-rx,h:RIVER.h});rx=b.x+b.w}river.push({x:rx,y:RIVER.y,w:W-rx,h:RIVER.h});
 const solids=[...buildings.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h-6})),...lobbySolids,...river,{x:150,y:1095,w:200,h:110},...extraSolids];
 const cell=256,grid=new Map();for(const s of solids)for(let gx=Math.floor(s.x/cell);gx<=Math.floor((s.x+s.w)/cell);gx++)for(let gy=Math.floor(s.y/cell);gy<=Math.floor((s.y+s.h)/cell);gy++){const k=gx*1000+gy;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s)}
 // Gate spawn areas: open spaces large enough for a rift (names shown in alerts and the tracker).
 const spawnAreas=[{x:1640,y:430,w:940,h:220,name:'PRAÇA NORTE'},{x:90,y:930,w:860,h:1140,name:'PARQUE YEOUIDO'},{x:3850,y:430,w:300,h:220,name:'ESTACIONAMENTO LESTE'},{x:3860,y:1580,w:280,h:480,name:'CANTEIRO INTERDITADO'},{x:1220,y:2350,w:1760,h:340,name:'PRAÇA DO MEMORIAL'},
  {x:150,y:740,w:3900,h:80,name:'AVENIDA GANGNAM'},{x:150,y:2180,w:3900,h:80,name:'AVENIDA DO RIO'},{x:1040,y:120,w:80,h:2500,name:'RUA OESTE'},{x:3080,y:120,w:80,h:2500,name:'RUA LESTE'},{x:HUB.ox+560,y:HUB.oy+560,w:680,h:300,name:'PRAÇA DA ASSOCIAÇÃO'},
  {x:4470,y:930,w:1060,h:420,name:'PRAÇA GWANGHWAMUN'},{x:4460,y:1990,w:1080,h:110,name:'ARENA DOS CAÇADORES'},{x:5820,y:2370,w:720,h:300,name:'PARQUE DA ORLA LESTE'},{x:6760,y:2370,w:780,h:300,name:'PARQUE DA ORLA LESTE'},{x:60,y:3290,w:880,h:560,name:'PARQUE HANGANG SUL'},
  {x:1240,y:4360,w:1720,h:160,name:'PRAÇA DA ESTAÇÃO'},{x:6770,y:3540,w:760,h:300,name:'CAMPO DA ESCOLA'},{x:5820,y:4070,w:720,h:420,name:'CANTEIRO SUL'},{x:1240,y:4870,w:1720,h:170,name:'MERCADO DE YONGSAN'},{x:6760,y:440,w:780,h:200,name:'ESTACIONAMENTO HONGDAE'},
  {x:150,y:3100,w:7300,h:80,name:'AVENIDA HANGANG SUL'},{x:150,y:4600,w:7300,h:80,name:'AVENIDA YONGSAN'}];
 // Named zones for the HUD (first match wins).
 const zones=[{x:HUB.ox,y:HUB.oy,w:1800,h:1200,name:'HUNTERS ASSOCIATION'},{x:0,y:RIVER.y-60,w:W,h:RIVER.h+120,name:'RIO HAN'},{x:E1[0]-20,y:860,w:E1[1]+40,h:560,name:'PRAÇA GWANGHWAMUN'},{x:E2[0]-20,y:860,w:E2[1]+40,h:560,name:'MYEONGDONG'},
  {x:E1[0]-20,y:1520,w:E1[1]+40,h:620,name:'ARENA DOS CAÇADORES'},{x:E3[0]-20,y:1520,w:E3[1]+40,h:620,name:'HONGDAE'},{x:E2[0],y:2300,w:1820,h:440,name:'PARQUE DA ORLA LESTE'},{x:0,y:3220,w:1000,h:680,name:'PARQUE HANGANG SUL'},
  {x:S1[0],y:4000,w:S1[1],h:560,name:'ESTAÇÃO YONGSAN'},{x:S1[0],y:4720,w:S1[1],h:480,name:'MERCADO DE YONGSAN'},{x:E3[0],y:3220,w:E3[1],h:680,name:'ESCOLA SEOUL-SUL'},{x:E2[0],y:4000,w:E2[1],h:560,name:'CANTEIRO SUL'}];
 return {roads,buildings,parks,alleys,decor,stalls,walk,pois,spawnAreas,zones,solids,grid,cell,trees,lamps,cars,benches,bridges,river};
})();
const GATE_AREAS=CITY.spawnAreas.map(a=>a.name);
// ---------------------------------------------------------------------------------------------
// Traffic: cars drive on the right-hand lanes of every main avenue (both axes), obey the
// synchronized traffic lights, and use a frontal probe to brake smoothly for the player, NPCs,
// other vehicles and gates. Every vehicle (moving or parked) has a solid hitbox.
const LIGHTS={cycle:13,
 // Car signal for an axis ('h' = east/west traffic, 'v' = north/south traffic).
 phase(t,axis){const m=((t%13)+13)%13;if(axis==='h')return m<5?'green':m<6?'yellow':'red';return m>=6.5&&m<11.5?'green':m>=11.5&&m<12.5?'yellow':'red'},
 // Pedestrians may start crossing a road of this axis only with enough red time left.
 walk(t,axis){const m=((t%13)+13)%13;return axis==='v'?(m>=12.5||m<3):(m>=6&&m<9.5)}};
const CAR_KINDS={sedan:{len:54,wid:24},taxi:{len:54,wid:24},van:{len:64,wid:26},bus:{len:112,wid:30},police:{len:56,wid:24},hunter:{len:66,wid:27}};
const CAR_SPRITES=new Map();
function carSprite(kind,color){const key=kind+color;if(CAR_SPRITES.has(key))return CAR_SPRITES.get(key);const K=CAR_KINDS[kind],L=K.len,Wd=K.wid,cv=document.createElement('canvas');cv.width=L+6;cv.height=Wd+8;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.translate(3,4);
 const body=kind==='taxi'?'#e8b030':kind==='police'?'#f2f2f2':kind==='hunter'?'#1c2a3c':color,dk=shadeHex(body,-.35),lt=shadeHex(body,.25);
 c.fillStyle='#0b0d10';for(const [x,y] of [[6,-3],[L-17,-3],[6,Wd-2],[L-17,Wd-2]])c.fillRect(x,y,11,5);
 c.fillStyle=dk;c.fillRect(0,1,L,Wd-2);c.fillStyle=body;c.fillRect(1,0,L-2,Wd-3);c.fillStyle=lt;c.fillRect(2,1,L-4,2);c.fillStyle=dk;c.fillRect(1,Wd-6,L-2,3);
 if(kind==='bus'){c.fillStyle='#1d3a52';for(let x=8;x<L-14;x+=13)c.fillRect(x,2,10,Wd-8);c.fillStyle='#9fd0e8';c.fillRect(L-11,3,6,Wd-9);c.fillStyle='#e8e8e8';c.fillRect(4,Wd/2-4,L-20,2);c.fillStyle='#ffd27a';c.fillRect(L-8,Wd/2-5,3,8)}
 else{const cab=kind==='van'||kind==='hunter'?[L*.18,L*.78]:[L*.3,L*.72];c.fillStyle='#22303c';c.fillRect(cab[0],3,cab[1]-cab[0],Wd-9);c.fillStyle='#8fbcd4';c.fillRect(cab[1]-6,4,5,Wd-11);c.fillStyle='#5f8aa2';c.fillRect(cab[0]+1,4,3,Wd-11);c.fillStyle=lt;c.fillRect(cab[0]+5,5,cab[1]-cab[0]-12,Wd-13);c.fillStyle=shadeHex(body,.1);c.fillRect(cab[0]+6,6,cab[1]-cab[0]-14,Wd-15);
  c.fillStyle=dk;c.fillRect(cab[1]+1,Wd/2-.5-1,L-cab[1]-4,1);c.fillRect(3,Wd/2-1.5,cab[0]-5,1)}
 if(kind==='taxi'){c.fillStyle='#1d1d1d';c.fillRect(L*.46,Wd/2-3.5,8,5);c.fillStyle='#ffe68a';c.fillRect(L*.46+1,Wd/2-2.5,6,3)}
 if(kind==='police'){c.fillStyle='#1d2a5a';c.fillRect(L*.3,0,L*.42,3);c.fillRect(L*.3,Wd-6,L*.42,3)}
 if(kind==='hunter'){c.fillStyle='#46d6ff';c.fillRect(4,Wd/2-1.5,L-10,1);c.fillStyle='#d8b44a';c.fillRect(L*.5-3,Wd/2-3.5,6,5)}
 c.fillStyle='#fff6c8';c.fillRect(L-2,2,2,4);c.fillRect(L-2,Wd-8,2,4);c.fillStyle='#7a1018';c.fillRect(0,2,2,4);c.fillRect(0,Wd-8,2,4);
 CAR_SPRITES.set(key,cv);return cv}
let CONE=null;function headlightCone(){if(CONE)return CONE;const cv=document.createElement('canvas');cv.width=120;cv.height=80;const c=cv.getContext('2d'),g=c.createLinearGradient(0,0,120,0);if(g){g.addColorStop(0,'rgba(255,243,176,.32)');g.addColorStop(1,'rgba(255,243,176,0)')}c.fillStyle=g||'rgba(255,243,176,.15)';c.beginPath();c.moveTo(0,32);c.lineTo(120,0);c.lineTo(120,80);c.lineTo(0,48);c.closePath();c.fill();return CONE=cv}
class TrafficSystem{
 constructor(){const r=seeded(31);this.cars=[];this.parked=CITY.cars.map(p=>({...p,box:p.angle&&Math.abs(Math.sin(p.angle))>.5?{w:p.wid,h:p.len}:{w:p.len,h:p.wid}}));this.signals=[];this.lanes=[];this.honks=[];
  const roads=CITY.roads.filter(rd=>rd.traffic);
  for(const rd of roads){const hor=rd.w>rd.h;for(const dir of [1,-1]){const c=hor?(dir>0?rd.y+rd.h-48:rd.y+48):(dir>0?rd.x+48:rd.x+rd.w-48),lane={road:rd,axis:hor?'h':'v',dir,c,start:hor?rd.x:rd.y,end:hor?rd.x+rd.w:rd.y+rd.h,stops:[]};
    for(const o of CITY.roads){if(o===rd||(o.w>o.h)===hor)continue;if(hor?(o.y>c||o.y+o.h<c):(o.x>c||o.x+o.w<c))continue;const lo=hor?o.x:o.y,hi=hor?o.x+o.w:o.y+o.h;if(hi<lane.start||lo>lane.end)continue;
     lane.stops.push({pos:dir>0?lo-34:hi+34,signal:!!o.traffic,lo,hi})}
    this.lanes.push(lane);const len=lane.end-lane.start;
    for(let s=lane.start+r()*400;s<lane.end-80;s+=700+r()*700){const kind=r()<.08?'bus':r()<.12?'van':r()<.2?'taxi':r()<.05?'police':r()<.06?'hunter':'sedan',K=CAR_KINDS[kind];
     if(lane.stops.some(st=>Math.abs(st.pos-s)<K.len+40||(s>st.lo-K.len&&s<st.hi+K.len)))continue;
     this.cars.push({lane,s,v:0,vmax:kind==='bus'?95:110+r()*70,kind,len:K.len,wid:K.wid,color:['#c94a4a','#e8e8e8','#2a5aa8','#1d1d1d','#8a8a96','#4a8a6a','#3a3a6a','#5a2a2a'][Math.floor(r()*8)],brake:0,stuck:0,ghost:0,honkT:0,blockT:0})}}}
  // Signal poles at the corners of every crossing between two avenues with traffic.
  for(const h of roads.filter(rd=>rd.w>rd.h))for(const v of roads.filter(rd=>rd.h>rd.w)){if(v.y>h.y||v.y+v.h<h.y+h.h)continue;this.signals.push({x:v.x-8,y:h.y-6,axis:'v',face:2},{x:v.x+v.w+8,y:h.y+h.h+10,axis:'v',face:6},{x:v.x+v.w+8,y:h.y-6,axis:'h',face:4},{x:v.x-8,y:h.y+h.h+10,axis:'h',face:0})}}
 pos(car){const l=car.lane;return l.axis==='h'?{x:car.s,y:l.c}:{x:l.c,y:car.s}}
 box(car){const l=car.lane;return l.axis==='h'?{x:car.s-car.len/2,y:l.c-car.wid/2,w:car.len,h:car.wid}:{x:l.c-car.wid/2,y:car.s-car.len/2,w:car.wid,h:car.len}}
 pbox(p){return {x:p.x-p.box.w/2,y:p.y-p.box.h/2,w:p.box.w,h:p.box.h}}
 // Solid test used by the player / NPC movement (same squashed footprint as buildings).
 // Spatial buckets (cell 256) for cars, parked cars and NPCs keep the probes cheap.
 bucket(map,o,b){const C=256;for(let gx=Math.floor(b.x/C);gx<=Math.floor((b.x+b.w)/C);gx++)for(let gy=Math.floor(b.y/C);gy<=Math.floor((b.y+b.h)/C);gy++){const k=gx*1000+gy;let l=map.get(k);if(!l)map.set(k,l=[]);l.push(o)}}
 query(map,x,y,w,h,out){const C=256,st=this._st=(this._st||0)+1;out.length=0;for(let gx=Math.floor(x/C);gx<=Math.floor((x+w)/C);gx++)for(let gy=Math.floor(y/C);gy<=Math.floor((y+h)/C);gy++){const l=map.get(gx*1000+gy);if(l)for(const o of l)if(o._qs!==st){o._qs=st;out.push(o)}}return out}
 rebuild(npcs){if(!this.pg){this.pg=new Map();for(const p of this.parked){p._b=this.pbox(p);this.bucket(this.pg,p,p._b)}}this.cg=new Map();for(const car of this.cars){car._b=this.box(car);this.bucket(this.cg,car,car._b)}this.ng=new Map();for(const n of npcs)this.bucket(this.ng,n,{x:n.x,y:n.y,w:0,h:0})}
 hit(x,y,rad,skip=null){if(!this.cg)this.rebuild([]);const q=this._hq||(this._hq=[]);this.query(this.cg,x-rad,y-rad,rad*2,rad*2,q);for(const car of q){if(car===skip)continue;const b=this.box(car);if(x+rad>b.x&&x-rad<b.x+b.w&&y+rad*.6>b.y&&y-rad*.6<b.y+b.h)return car}
  this.query(this.pg,x-rad,y-rad,rad*2,rad*2,q);for(const p of q){const b=p._b;if(x+rad>b.x&&x-rad<b.x+b.w&&y+rad*.6>b.y&&y-rad*.6<b.y+b.h)return p}return null}
 nearCrossing(x,y,axis,r){// any car approaching a crossing point on a road of this axis
  for(const car of this.cars){if(car.lane.axis!==axis)continue;const p=this.pos(car);if(axis==='h'?Math.abs(p.y-y)>90:Math.abs(p.x-x)>90)continue;const along=axis==='h'?(x-p.x)*car.lane.dir:(y-p.y)*car.lane.dir;if(along>-car.len&&along<r+car.v*1.2)return true}return false}
 update(dt,g){const t=g.time,p=g.player,npcs=g.world.npcs?g.world.npcs.list:[],gates=g.gates?g.gates.list:[],ACC=150,DEC=380,qa=[],qb=[];this.rebuild(npcs);
  const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  for(const car of this.cars){const l=car.lane,dir=l.dir,front=car.s+dir*car.len/2,stopDist=car.v*car.v/(2*DEC),look=34+stopDist+car.v*.35;let gap=Infinity,byPlayer=false,byCross=false;
   for(const st of l.stops){if(!st.signal)continue;const d=(st.pos-front)*dir;if(d<-1||d>look+30)continue;const ph=LIGHTS.phase(t,l.axis);if(ph==='red'||(ph==='yellow'&&d>stopDist+6))gap=Math.min(gap,d)}
   // Frontal probe rectangle.
   const half=car.wid/2+5,pr=l.axis==='h'?{x:dir>0?front:front-look,y:l.c-half,w:look,h:half*2}:{x:l.c-half,y:dir>0?front:front-look,w:half*2,h:look};
   const along=(x,y)=>(l.axis==='h'?x-front:y-front)*dir,inPr=(x,y,r)=>x+r>pr.x&&x-r<pr.x+pr.w&&y+r>pr.y&&y-r<pr.y+pr.h;
   for(const o of this.query(this.cg,pr.x,pr.y,pr.w,pr.h,qa)){if(o===car)continue;const ob=this.box(o);if(!ov(ob,pr))continue;const cross=o.lane.axis!==l.axis;if(cross&&car.ghost>0)continue;
    const near=l.axis==='h'?(dir>0?ob.x-front:front-(ob.x+ob.w)):(dir>0?ob.y-front:front-(ob.y+ob.h));if(near<-4&&!cross)continue;const d=Math.max(0,near)-8;if(d<gap){gap=d;byCross=cross}}
   if(p&&inPr(p.x,p.y,14)){const d=along(p.x,p.y)-16;if(d<gap){gap=d;byPlayer=true}}
   for(const n of this.query(this.ng,pr.x-10,pr.y-10,pr.w+20,pr.h+20,qb))if(inPr(n.x,n.y,9)){const d=along(n.x,n.y)-12;if(d<gap){gap=d;byPlayer=false}}
   for(const gt of gates)if(inPr(gt.x,gt.y,70)){const d=along(gt.x,gt.y)-74;if(d<gap)gap=d}
   const target=gap===Infinity?car.vmax:Math.min(car.vmax,Math.sqrt(2*DEC*Math.max(0,gap-4)));
   car.brake=car.v>target+2?1:Math.max(0,car.brake-dt*3);car.v=car.v>target?Math.max(target,car.v-DEC*1.7*dt):Math.min(target,car.v+ACC*dt);
   // Never move into a body: final overlap check against the player, NPCs and other cars.
   if(car.v>0){const old=car.s;car.s+=dir*car.v*dt;const b=this.box(car);let bad=p&&p.x+11>b.x&&p.x-11<b.x+b.w&&p.y+7>b.y&&p.y-7<b.y+b.h;
    if(!bad)for(const n of this.query(this.ng,b.x-8,b.y-8,b.w+16,b.h+16,qb))if(n.x+7>b.x&&n.x-7<b.x+b.w&&n.y+5>b.y&&n.y-5<b.y+b.h){bad=true;break}
    if(!bad)for(const o of this.query(this.cg,b.x-12,b.y-12,b.w+24,b.h+24,qa)){if(o===car||(car.ghost>0&&o.lane.axis!==l.axis))continue;if(ov(this.box(o),b)){bad=true;break}}
    if(bad){car.s=old;car.v=0}}
   // Stuck resolution for perpendicular cars blocking each other inside an intersection.
   if(car.v<2&&byCross){car.stuck+=dt;if(car.stuck>2.5){car.ghost=1.6;car.stuck=0}}else car.stuck=Math.max(0,car.stuck-dt);car.ghost=Math.max(0,car.ghost-dt);
   if(car.v<4&&byPlayer){car.blockT+=dt;car.honkT-=dt;if(car.blockT>.7&&car.honkT<=0){car.honkT=2.6;this.honk(g,car)}}else car.blockT=0;
   // Wrap around at the map edge once the entry is free.
   if(dir>0&&car.s-car.len/2>l.end+20||dir<0&&car.s+car.len/2<l.start-20){const save=car.s;car.s=dir>0?l.start-car.len:l.end+car.len;const b=this.box(car),m={x:b.x-30,y:b.y-30,w:b.w+60,h:b.h+60};if(this.cars.some(o=>o!==car&&ov(this.box(o),m)))car.s=save;else car.v=car.vmax*.7}}
  this.honks=this.honks.filter(h=>(h.t-=dt)>0)}
 honk(g,car){const p=this.pos(car);this.honks.push({x:p.x,y:p.y-26,t:.9});if(g.player&&dist(p,g.player)<700)g.sound.play('horn')}
 draw(c,t,v,world){for(const p of this.parked)if(world.visible(v,p.x-40,p.y-40,80,80))this.drawCar(c,p.x,p.y,p.angle,p,false,t);
  for(const car of this.cars){const p=this.pos(car);if(!world.visible(v,p.x-70,p.y-70,140,140))continue;const l=car.lane,ang=l.axis==='h'?(l.dir>0?0:Math.PI):(l.dir>0?Math.PI/2:-Math.PI/2);this.drawCar(c,p.x,p.y,ang,car,true,t)}
  c.save();c.font='bold 11px monospace';c.textAlign='center';for(const h of this.honks){c.globalAlpha=Math.min(1,h.t*2);c.fillStyle='#061019';c.fillText('BIIP!',h.x+1,h.y+1-(.9-h.t)*14);c.fillStyle='#ffe16c';c.fillText('BIIP!',h.x,h.y-(.9-h.t)*14)}c.restore()}
 drawCar(c,x,y,ang,car,moving,t){const spr=carSprite(car.kind||'sedan',car.color);c.save();c.translate(Math.round(x),Math.round(y));c.rotate(ang);c.fillStyle='#0008';c.fillRect(-car.len/2+2,-car.wid/2+4,car.len,car.wid);c.drawImage(spr,-car.len/2-3,-car.wid/2-4);
  if(moving){c.save();c.globalCompositeOperation='lighter';c.drawImage(headlightCone(),car.len/2-2,-40);if(car.brake>0||car.v<5){c.globalAlpha=.6+.4*(car.brake||0);c.fillStyle='#ff2a3a';c.fillRect(-car.len/2-2,-car.wid/2+2,3,5);c.fillRect(-car.len/2-2,car.wid/2-8,3,5);c.globalAlpha=.25;c.beginPath();c.arc(-car.len/2-4,0,14,0,7);c.fill()}
   if(car.kind==='police'||car.kind==='hunter'){const on=Math.sin(t*14)>0;c.globalAlpha=.9;c.fillStyle=on?'#ff2a3a':'#2a6aff';c.fillRect(-3,-car.wid/2+3,4,4);c.fillStyle=on?'#2a6aff':'#ff2a3a';c.fillRect(-3,car.wid/2-8,4,4);c.globalAlpha=.18;c.beginPath();c.arc(0,0,26,0,7);c.fill()}c.restore()}
  c.restore()}
}

// ---------------------------------------------------------------------------------------------
// City NPCs: a pedestrian graph is built from CITY.walk (sidewalks, alleys, park paths). Each
// NPC runs a small state machine (walk / window / guard / talk / follow / loiter / flee / alert /
// patrol / return). Road crossings always use the crosswalks; at signalised crossings people wait
// for the pedestrian phase and, everywhere, for a gap in the traffic.
const NPC_RULES={spawnRad:8,roam:150,fleeR:430,combatR:300,alertR:950,patrolR:[150,230],maxPatrol:4,walk:[32,50],run:[118,150],near:1500};
class PedGraph{
 constructor(world){const W=CITY.walk.filter(l=>l.b>l.a),H=W.filter(l=>l.axis==='h'),V=W.filter(l=>l.axis==='v'),nodes=[],key=new Map(),free=(x,y)=>!world.blocked(x,y,6,true);
  const node=(x,y)=>{const k=Math.round(x)+','+Math.round(y);let n=key.get(k);if(!n){n={id:nodes.length,x:Math.round(x),y:Math.round(y),out:[]};nodes.push(n);key.set(k,n)}return n};
  const onLine=new Map();for(const l of W)onLine.set(l,[]);
  for(const h of H)for(const v of V)if(v.c>=h.a&&v.c<=h.b&&h.c>=v.a&&h.c<=v.b){if(!free(v.c,h.c))continue;const n=node(v.c,h.c);onLine.get(h).push(n);onLine.get(v).push(n)}
  const roadsV=CITY.roads.filter(r=>r.h>r.w),roadsH=CITY.roads.filter(r=>r.w>r.h);
  // Builds the waypoint list from A to B (detouring to the zebra crossing when the segment crosses a road).
  const route=(A,B,axis)=>{const c=axis==='h'?A.y:A.x,lo=Math.min(axis==='h'?A.x:A.y,axis==='h'?B.x:B.y),hi=Math.max(axis==='h'?A.x:A.y,axis==='h'?B.x:B.y);
   const cross=(axis==='h'?roadsV:roadsH).find(r=>axis==='h'?(r.x+16>=lo-1&&r.x+r.w-16<=hi+1&&c>=r.y&&c<=r.y+r.h):(r.y+16>=lo-1&&r.y+r.h-16<=hi+1&&c>=r.x&&c<=r.x+r.w));
   if(!cross)return [{x:B.x,y:B.y}];
   const host=(axis==='h'?roadsH:roadsV).find(r=>axis==='h'?(c>=r.y&&c<=r.y+r.h&&r.x<=cross.x&&r.x+r.w>=cross.x+cross.w):(c>=r.x&&c<=r.x+r.w&&r.y<=cross.y&&r.y+r.h>=cross.y+cross.h));
   const sig=!!(cross.traffic&&host&&host.traffic),xa=axis==='h'?'v':'h';let off=c;if(host)off=axis==='h'?(c<host.y+host.h/2?host.y-17:host.y+host.h+17):(c<host.x+host.w/2?host.x-17:host.x+host.w+17);
   const P=(along,lat)=>axis==='h'?{x:along,y:lat}:{x:lat,y:along},a0=axis==='h'?A.x:A.y,b0=axis==='h'?B.x:B.y,mid=axis==='h'?{x:cross.x+cross.w/2,y:off}:{x:off,y:cross.y+cross.h/2};
   const wps=[];if(off!==c)wps.push(P(a0,off));wps.push({...P(b0,off),cross:{axis:xa,signal:sig,traffic:!!cross.traffic,mx:mid.x,my:mid.y}});if(off!==c)wps.push(P(b0,c));return wps};
  const pois=CITY.pois;
  for(const [l,list] of onLine){list.sort((p,q)=>l.axis==='h'?p.x-q.x:p.y-q.y);for(let i=0;i+1<list.length;i++){const A=list[i],B=list[i+1];if(A===B)continue;
   const fw=route(A,B,l.axis),bw=route(B,A,l.axis);let ok=true,prev=A;for(const w of fw){const d=Math.hypot(w.x-prev.x,w.y-prev.y);for(let s=8;s<d;s+=12){const k=s/d;if(!free(prev.x+(w.x-prev.x)*k,prev.y+(w.y-prev.y)*k)){ok=false;break}}if(!ok)break;prev=w}if(!ok)continue;
   const lo=l.axis==='h'?Math.min(A.x,B.x):Math.min(A.y,B.y),hi=l.axis==='h'?Math.max(A.x,B.x):Math.max(A.y,B.y),simple=fw.length===1;
   const near=simple?pois.filter(p=>{const along=l.axis==='h'?p.x:p.y,lat=Math.abs((l.axis==='h'?p.y:p.x)-l.c),lim=p.kind==='plaza'?150:44;if(along<lo+10||along>hi-10||lat>lim)return false;const lx=l.axis==='h'?p.x:l.c,ly=l.axis==='h'?l.c:p.y,d=Math.hypot(p.x-lx,p.y-ly);for(let s=6;s<d;s+=10){const k=s/d;if(!free(lx+(p.x-lx)*k,ly+(p.y-ly)*k))return false}return free(p.x,p.y)}):[];
   const mk=(to,wps,dirSign)=>({to,wps,axis:l.axis,c:l.c,alley:!!l.alley,pois:near.slice().sort((p,q)=>((l.axis==='h'?p.x-q.x:p.y-q.y))*dirSign)});
   A.out.push(mk(B,fw,1));B.out.push(mk(A,bw,-1))}}
  // Keep the largest connected component only.
  const comp=new Array(nodes.length).fill(-1);let best=-1,bestN=0;for(const n of nodes){if(comp[n.id]>=0)continue;const id=n.id,st=[n];comp[n.id]=id;let cnt=0;while(st.length){const m=st.pop();cnt++;for(const e of m.out)if(comp[e.to.id]<0){comp[e.to.id]=id;st.push(e.to)}}if(cnt>bestN){bestN=cnt;best=id}}
  this.nodes=nodes.filter(n=>comp[n.id]===best&&n.out.length);this.cell=320;this.grid=new Map();for(const n of this.nodes){const k=Math.floor(n.x/this.cell)*1000+Math.floor(n.y/this.cell);if(!this.grid.has(k))this.grid.set(k,[]);this.grid.get(k).push(n)}}
 nearest(x,y,skip=null){let best=null,bd=1e18;for(let r=0;r<4&&!best;r++){const gx=Math.floor(x/this.cell),gy=Math.floor(y/this.cell);for(let i=gx-r;i<=gx+r;i++)for(let j=gy-r;j<=gy+r;j++){const l=this.grid.get(i*1000+j);if(l)for(const n of l){if(n===skip)continue;const d=(n.x-x)**2+(n.y-y)**2;if(d<bd){bd=d;best=n}}}}return best||this.nodes[0]}
 random(r=Math.random){return this.nodes[Math.floor(r()*this.nodes.length)]}
}
const dirOf=(dx,dy)=>((Math.round(Math.atan2(dy,dx)/(Math.PI/4))%8)+8)%8;
class CityNPC{
 constructor(sys,look,node,o={}){this.sys=sys;this.look=look;this.kind=look.kind==='hunter'?'hunter':'civ';this.node=node;this.x=node?node.x:o.x;this.y=node?node.y:o.y;this.path=[];this.prev=null;this.state='walk';this.timer=0;this.anim=Math.random()*6;this.dir=2;this.moving=false;
  this.speed=rand(...NPC_RULES.walk)*(this.kind==='hunter'?1.1:1);this.runSpeed=rand(...NPC_RULES.run);this.lat=rand(-5,5);this.isCityNPC=true;this.icon=null;this.iconT=0;this.cooldown=rand(2,10);this.waitT=0;this.carWait=0;Object.assign(this,o)}
 get scale(){return this.look.scale||1}
 // ---- graph walking ----
 nextEdge(g,mode=null,target=null){const n=this.node;if(!n||!n.out.length){this.state='return';return}
  let opts=n.out.filter(e=>e.to!==this.prev);if(!opts.length)opts=n.out;let e;
  if(mode){const sc=o=>{const t=o.to,d=Math.hypot(t.x-target.x,t.y-target.y);return mode==='flee'?-d:d};e=opts.slice().sort((a,b)=>sc(a)-sc(b))[0]}
  else{const straight=this.lastAxis&&opts.find(o=>o.axis===this.lastAxis&&Math.sign(this.lastAxis==='h'?o.to.x-n.x:o.to.y-n.y)===this.lastSign);
   const pool=this.kind==='civ'?opts.filter(o=>!o.alley||Math.random()<.35):opts;e=straight&&Math.random()<.62?straight:(pool.length?pool:opts)[Math.floor(Math.random()*(pool.length||opts.length))]}
  this.prev=n;this.node=null;this.edgeTo=e.to;this.lastAxis=e.axis;this.lastSign=Math.sign(e.axis==='h'?e.to.x-n.x:e.to.y-n.y);
  this.path=e.wps.map(w=>({...w}));
  if(!mode&&!this.leader&&this.cooldown<=0&&e.pois.length){for(const p of e.pois){const want=this.kind==='civ'?(p.kind==='shop'?.3:p.kind==='plaza'?.22:0):(p.kind==='guild'?.4:p.kind==='door'?.12:p.kind==='plaza'?.12:0);if(Math.random()<want){
   const back=e.axis==='h'?{x:p.x,y:e.c}:{x:e.c,y:p.y},act=this.kind==='hunter'&&p.kind!=='plaza'?{type:'guard',dur:rand(8,20),face:p.face===6?2:p.face}:p.kind==='plaza'?{type:'plaza',dur:rand(6,14),face:p.face<0?Math.floor(Math.random()*8):p.face}:{type:'window',dur:rand(3,8),face:p.face};
   this.path.splice(this.path.length-1,0,{x:p.x+rand(-6,6),y:p.y,act},back);this.cooldown=rand(10,25);break}}}}
 canCross(c,g){const T=g.world.traffic,t=g.time;if(this.state==='flee')return true;if(this.waitT>22)return true;if(c.signal)return LIGHTS.walk(t,c.axis)&&!T.nearCrossing(c.mx,c.my,c.axis,110);if(c.traffic)return !T.nearCrossing(c.mx,c.my,c.axis,300);return !T.nearCrossing(c.mx,c.my,c.axis,120)}
 follow(dt,g,speed){const w=this.path[0];if(!w){if(this.edgeTo){this.node=this.edgeTo;this.edgeTo=null;this.x=this.node.x;this.y=this.node.y}return 'node'}
  if(w.cross&&!this.crossOK){if(!this.canCross(w.cross,g)){this.waitT+=dt;this.moving=false;this.dir=dirOf(w.x-this.x,w.y-this.y);return 'wait'}this.crossOK=true;this.waitT=0}
  const dx=w.x-this.x,dy=w.y-this.y,d=Math.hypot(dx,dy);if(d<1.5){this.x=w.x;this.y=w.y;this.path.shift();this.crossOK=false;if(w.act)return w.act;return 'step'}
  const s=Math.min(d,speed*dt),nx=this.x+dx/d*s,ny=this.y+dy/d*s;
  if(this.blockedBy(nx,ny,g)){this.moving=false;this.carWait+=dt;if(this.carWait>3){this.ghost=1}return 'wait'}this.carWait=0;
  this.x=nx;this.y=ny;this.dir=dirOf(dx,dy);this.moving=true;return 'move'}
 blockedBy(nx,ny,g){const p=g.player;if(p&&Math.hypot(nx-p.x,ny-p.y)<16&&Math.hypot(nx-p.x,ny-p.y)<Math.hypot(this.x-p.x,this.y-p.y))return true;if(this.ghost>0)return false;return !!g.world.traffic.hit(nx,ny,7)}
 // ---- free movement (flee from loiter spots, patrol, return to the network) ----
 freeMove(tx,ty,speed,dt,g){const dx=tx-this.x,dy=ty-this.y,d=Math.hypot(dx,dy);if(d<2)return true;const s=Math.min(d,speed*dt),vx=dx/d*s,vy=dy/d*s,W=g.world;let moved=false;
  const ok=(x,y)=>!W.blocked(x,y,7)&&!(g.player&&Math.hypot(x-g.player.x,y-g.player.y)<16);
  if(ok(this.x+vx,this.y+vy)){this.x+=vx;this.y+=vy;moved=true}else{if(ok(this.x+vx,this.y)){this.x+=vx;moved=true}if(ok(this.x,this.y+vy)){this.y+=vy;moved=true}}
  this.moving=moved;if(moved){this.dir=dirOf(vx,vy);this.stuck=0}else this.stuck=(this.stuck||0)+dt;return false}
 threat(g){let best=null,bd=1e9;for(const gt of g.gates.list){const d=Math.hypot(gt.x-this.x,gt.y-this.y);if(d<NPC_RULES.fleeR&&d<bd){bd=d;best={x:gt.x,y:gt.y,gate:gt}}}
  if(g.combatT>0&&g.player){const d=Math.hypot(g.player.x-this.x,g.player.y-this.y);if(d<NPC_RULES.combatR&&d<bd){bd=d;best={x:g.player.x,y:g.player.y}}}
  for(const s of g.soldiers||[]){const d=Math.hypot(s.x-this.x,s.y-this.y);if(d<170&&d<bd){bd=d;best={x:s.x,y:s.y}}}return best}
 shout(icon,t=1.4){this.icon=icon;this.iconT=t}
 update(dt,g){this.anim+=dt;this.timer-=dt;this.cooldown-=dt;this.iconT-=dt;this.ghost=Math.max(0,(this.ghost||0)-dt);const T=g.time;
  // Reactions have priority over routines.
  if(this.kind==='civ'&&this.state!=='flee'){const th=this.threat(g);if(th){this.threatPos=th;this.state='flee';this.timer=rand(4,7);this.shout('!');this.talking=false;this.path=this.edgeTo?this.path.filter(w=>!w.act):[]}}
  if(this.kind==='hunter'&&!['alert','patrol'].includes(this.state)&&!this.post){const gt=this.sys.gateFor(this,g);if(gt){this.gate=gt;this.state='alert';this.shout('!',1.2);this.path=this.path.filter(w=>!w.act)}}
  if(this.post&&this.state!=='guardpost'){this.state='guardpost'}
  switch(this.state){
   case 'walk':{if(this.leader){this.followLeader(dt,g);break}if(this.node){this.nextEdge(g);break}if(!this.edgeTo&&!this.path.length){this.state='return';break}const r=this.follow(dt,g,this.speed);if(r&&typeof r==='object'){this.state=r.type;this.timer=r.dur;this.face=r.face;this.moving=false;this.dir=r.face>=0?r.face:this.dir}break}
   case 'window':case 'guard':case 'plaza':{this.moving=false;if(this.face>=0)this.dir=this.face;if(this.timer<=0)this.state='walk';break}
   case 'loiter':{this.moving=false;this.dir=this.face;if(this.kind==='civ'&&this.timer<=0&&Math.random()<.002){this.state='return'}break}
   case 'guardpost':{this.moving=false;const gt=g.gates.list.find(q=>Math.hypot(q.x-this.x,q.y-this.y)<500);this.dir=gt?dirOf(gt.x-this.x,gt.y-this.y):this.face;this.alertPose=!!gt||(g.combatT>0&&g.player&&Math.hypot(g.player.x-this.x,g.player.y-this.y)<300);break}
   case 'flee':{const th=this.threat(g)||this.threatPos;if(th)this.threatPos=th;if(this.timer<=0&&!this.threat(g)){this.state=this.node||this.edgeTo?'walk':'return';break}
    if(this.node){this.nextEdge(g,'flee',this.threatPos);break}if(this.edgeTo){const r=this.follow(dt,g,this.runSpeed);if(r&&typeof r==='object')this.path=this.path.filter(w=>!w.act);break}
    const ax=this.x-this.threatPos.x,ay=this.y-this.threatPos.y,d=Math.hypot(ax,ay)||1;this.freeMove(this.x+ax/d*60,this.y+ay/d*60,this.runSpeed,dt,g);if(this.stuck>1.2)this.state='return';break}
   case 'alert':{const gt=this.gate;if(!gt||!g.gates.list.includes(gt)){this.gate=null;this.state=this.node||this.edgeTo?'walk':'return';break}const d=Math.hypot(gt.x-this.x,gt.y-this.y);
    if(d<NPC_RULES.patrolR[1]+30){this.state='patrol';this.ang=Math.atan2(this.y-gt.y,this.x-gt.x);this.rad=rand(...NPC_RULES.patrolR);this.timer=rand(2,4);this.node=null;this.edgeTo=null;this.path=[];break}
    if(this.node){this.nextEdge(g,'seek',gt);break}if(this.edgeTo){this.follow(dt,g,this.speed*1.7);break}if(this.freeMove(gt.x,gt.y,this.speed*1.7,dt,g)||this.stuck>2)this.state='return';break}
   case 'patrol':{const gt=this.gate;if(!gt||!g.gates.list.includes(gt)){this.gate=null;this.state='return';break}
    if(this.hold>0){this.hold-=dt;this.moving=false;this.dir=dirOf(gt.x-this.x,gt.y-this.y);break}
    const tx=gt.x+Math.cos(this.ang)*this.rad,ty=gt.y+Math.sin(this.ang)*this.rad*.75;if(this.freeMove(tx,ty,this.speed*1.05,dt,g)||this.stuck>.6){this.ang+=(this.stuck>.6?.9:.45)*(this.cw||(this.cw=Math.random()<.5?1:-1));this.stuck=0}
    if(this.timer<=0){this.timer=rand(4,8);this.hold=rand(1.5,3)}break}
   case 'return':{if(this.anchor){if(this.freeMove(this.anchor.x,this.anchor.y,this.speed*1.2,dt,g)||this.stuck>3){this.x=this.stuck>3&&!this.sys.onScreen(this,g)?this.anchor.x:this.x;this.y=this.stuck>3&&!this.sys.onScreen(this,g)?this.anchor.y:this.y;this.state='loiter';this.stuck=0}break}
    if(!this.target||this.retryT<=0){this.target=this.sys.graph.nearest(this.x,this.y,this.badNode);this.retryT=6}this.retryT-=dt;
    if(this.freeMove(this.target.x,this.target.y,this.speed*1.2,dt,g)){this.node=this.target;this.target=null;this.state='walk';this.leader=null;break}
    if(this.stuck>2.5){this.badNode=this.target;this.target=null;this.stuck=0;if(!this.sys.onScreen(this,g)){const n=this.sys.graph.nearest(this.x,this.y);this.x=n.x;this.y=n.y;this.node=n;this.state='walk'}}break}
  }
 }
 followLeader(dt,g){const L=this.leader;if(!L||L.state==='flee'||L.state==='return'||!this.sys.list.includes(L)){this.leader=null;if(L)L.partner=null;this.state='return';return}
  if(['window','plaza','guard'].includes(L.state)){const side=this.side||1,fx=L.x+side*20,fy=L.y+2;if(this.freeMove(fx,fy,L.speed*1.6,dt,g)){this.moving=false;this.dir=dirOf(L.x-this.x,L.y-this.y);this.talking=L.state==='plaza'||L.state==='window'}return}
  this.talking=false;const a=(L.dir*Math.PI/4),px=-Math.sin(a)*(this.side||1)*13,py=Math.cos(a)*(this.side||1)*9,tx=L.x+px-Math.cos(a)*4,ty=L.y+py-Math.sin(a)*4,d=Math.hypot(tx-this.x,ty-this.y);
  if(d>160){this.x=L.x;this.y=L.y}
  if(d<3){this.moving=L.moving;this.dir=L.dir;return}const sp=d>24?L.speed*1.8:L.speed*1.05;const W=g.world,dx=tx-this.x,dy=ty-this.y,s=Math.min(d,sp*dt),nx=this.x+dx/d*s,ny=this.y+dy/d*s;
  if(!W.blocked(nx,ny,6)||this.ghost>0){this.x=nx;this.y=ny;this.moving=true;this.dir=L.moving?L.dir:dirOf(dx,dy)}else{const bx=L.x-Math.cos(a)*16,by=L.y-Math.sin(a)*16,k=Math.min(1,dt*4),qx=this.x+(bx-this.x)*k,qy=this.y+(by-this.y)*k;if(!W.blocked(qx,qy,5,true)){this.x=qx;this.y=qy}else{this.x+=(L.x-this.x)*k;this.y+=(L.y-this.y)*k}this.moving=true;this.dir=L.dir}}
 pose(){const t=this.anim;if(this.state==='flee'&&this.moving)return 'run'+(Math.floor(t*14)%6);
  if(this.moving)return 'walk'+(Math.floor(t*this.speed/5.2)%6);
  if(this.state==='guardpost')return this.alertPose?'ready':'idle'+(Math.floor(t*1.6+this.x)%2);
  if(this.state==='alert'||this.hold>0||(this.state==='guard'&&this.look.weapon&&Math.floor(t/3+this.x)%2))return 'ready';
  if(this.talking||(this.state==='plaza'&&this.partner)||(this.state==='loiter'&&this.chat))return 'talk'+(Math.floor(t*2.2+this.x*.1)%2);
  if((this.state==='window'||this.state==='plaza')&&this.kind==='civ'&&(this.look.id.charCodeAt(1)+Math.floor(this.x))%3===0)return 'phone';
  return 'idle'+(Math.floor(t*1.6+this.x)%2)}
 draw(c,g){const f=g.sprites.person(this.look,this.dir,this.pose()),s=this.scale;c.fillStyle='#0008';c.beginPath();c.ellipse(Math.round(this.x),Math.round(this.y)+1,10*s,3.6*s,0,0,7);c.fill();c.drawImage(f,Math.round(this.x-32),Math.round(this.y-59));
  if(this.iconT>0){const y=this.y-62*s-Math.min(6,(1.4-this.iconT)*20);c.font='bold 14px monospace';c.textAlign='center';c.fillStyle='#061019';c.fillText(this.icon,this.x+1,y+1);c.fillStyle=this.kind==='hunter'?'#ffd24a':'#ff6a5a';c.fillText(this.icon,this.x,y);c.textAlign='left'}}
}
class CityNPCSystem{
 constructor(world){this.world=world;this.graph=new PedGraph(world);this.list=[];this.recycleT=0;const r=seeded(77),G=this.graph,civ=PEOPLE.civ,hun=PEOPLE.hunters;
  for(let i=0;i<NPC_RULES.roam;i++){const hunter=r()<.2,look=hunter?hun[Math.floor(r()*hun.length)]:civ[Math.floor(r()*civ.length)],n=G.random(r),a=new CityNPC(this,look,n);this.list.push(a);
   if(!hunter&&r()<.22){const b=new CityNPC(this,civ[Math.floor(r()*civ.length)],null,{x:n.x+12,y:n.y,leader:a,side:r()<.5?1:-1});a.partner=b;this.list.push(b)}}
  // Hunters Association: two door guards, hunters chatting on the plaza and a squad by the entrance.
  for(const p of HUB.posts)this.list.push(new CityNPC(this,PEOPLE.special.guard,null,{x:p.x,y:p.y+4,post:true,face:2,state:'guardpost'}));
  const spots=[[620,470,0,1],[650,478,4,1],[1150,470,4,1],[1120,478,0,1],[760,560,2,0],[1040,560,2,0],[860,470,0,1],[890,462,4,1],[560,760,6,1],[590,752,4,1],[1240,760,4,1],[1210,768,0,1]];
  spots.forEach(([x,y,f,chat],i)=>this.list.push(new CityNPC(this,i%3===2?civ[(i*7)%civ.length]:hun[(i*5)%hun.length],null,{x:HUB.ox+x,y:HUB.oy+y,state:'loiter',face:f,chat:!!chat,timer:rand(20,60)})));
  // Spawn validation: nobody may start inside a building, wall, pond or parked car.
  for(const a of this.list)if(!this.free(a.x,a.y)){const sp=spiralSearch(a.x,a.y,(x,y)=>this.free(x,y),{rad:NPC_RULES.spawnRad,maxR:240});if(sp){a.x=sp.x;a.y=sp.y}}
  this.list.forEach(a=>{if(a.state==='loiter'&&a.kind==='hunter'){a.anchor={x:a.x,y:a.y}}})}
 free(x,y,cars=false){const w=this.world,r=NPC_RULES.spawnRad;return x>40&&y>40&&x<w.w-40&&y<w.h-40&&!w.blocked(x,y,r,!cars)}
 onScreen(a,g){const c=g.camera;return a.x>c.x-60&&a.x<c.x+(typeof canvas!=='undefined'?canvas.width:1280)+60&&a.y>c.y-80&&a.y<c.y+(typeof canvas!=='undefined'?canvas.height:800)+80}
 gateFor(a,g){for(const gt of g.gates.list){const d=Math.hypot(gt.x-a.x,gt.y-a.y);if(d<NPC_RULES.alertR&&this.list.filter(o=>o.gate===gt).length<NPC_RULES.maxPatrol)return gt}return null}
 update(dt,g){for(const a of this.list)a.update(dt,g);
  // Keep the neighbourhood of the player lively: relocate far-away walkers to off-screen nodes nearby.
  this.recycleT-=dt;if(this.recycleT<=0&&g.player){this.recycleT=.35;const p=g.player,near=this.list.filter(a=>Math.abs(a.x-p.x)<NPC_RULES.near&&Math.abs(a.y-p.y)<NPC_RULES.near).length;
   if(near<55){const far=this.list.find(a=>a.state==='walk'&&!a.leader&&Math.hypot(a.x-p.x,a.y-p.y)>2600);if(far){for(let i=0;i<8;i++){const n=this.graph.random(),d=Math.hypot(n.x-p.x,n.y-p.y);if(d>700&&d<1400&&!this.onScreen(n,g)&&this.free(n.x,n.y,true)){far.x=n.x;far.y=n.y;far.node=n;far.path=[];far.edgeTo=null;far.prev=null;if(far.partner){const ps=spiralSearch(n.x+10,n.y,(x,y)=>this.free(x,y,true),{rad:NPC_RULES.spawnRad,maxR:60})||n;far.partner.x=ps.x;far.partner.y=ps.y}break}}}}}}
 visible(v){return this.list.filter(a=>a.x>v.x-40&&a.x<v.x+v.w+40&&a.y>v.y-20&&a.y<v.y+v.h+70)}
}
class WorldMap{constructor(kind='hub',rank='E',theme=null){this.kind=kind;this.rank=rank;this.theme=kind==='dungeon'?(theme||pickTheme(rank)):null;this.w=kind==='hub'?HUB.w:2400;this.h=kind==='hub'?HUB.h:1500;this.tile=this.makeTile();if(kind==='hub'){this.solids=CITY.solids;this.grid=CITY.grid;this.buildingCache=new Map();this.traffic=new TrafficSystem();this.npcs=typeof CityNPCSystem!=='undefined'?new CityNPCSystem(this):null}}
makeTile(){
 if(this.theme)return DungeonArt.tile(this.theme);
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
}
blocked(x,y,rad=12,ignoreCars=false){if(!this.solids)return false;const g=this.grid,cs=CITY.cell;if(g){for(let gx=Math.floor((x-rad)/cs);gx<=Math.floor((x+rad)/cs);gx++)for(let gy=Math.floor((y-rad)/cs);gy<=Math.floor((y+rad)/cs);gy++){const l=g.get(gx*1000+gy);if(l)for(const s of l)if(x+rad>s.x&&x-rad<s.x+s.w&&y+rad*.6>s.y&&y-rad*.6<s.y+s.h)return true}}
 else for(const s of this.solids)if(x+rad>s.x&&x-rad<s.x+s.w&&y+rad*.6>s.y&&y-rad*.6<s.y+s.h)return true;
 return !ignoreCars&&!!this.traffic&&!!this.traffic.hit(x,y,rad)}
// Terrain hazard under a point (dungeon themes): slow water/webs/sand, ice, lava/fire, poison.
terrainAt(x,y){if(!this.zones)return null;for(const z of this.zones){const dx=(x-z.x)/z.rx,dy=(y-z.y)/z.ry;if(dx*dx+dy*dy<=1)return z}return null}
update(dt){if(this.kind!=='hub')return;this.traffic.update(dt,game);if(this.npcs)this.npcs.update(dt,game)}
draw(c,time,view){let pat=c.createPattern(this.tile,'repeat');if(this.kind==='hub'){this.city(c,time,view||{x:0,y:0,w:this.w,h:this.h})}else{if(this.wallLayer&&this.theme){const v=view||{x:0,y:0,w:this.w,h:this.h},x0=Math.max(0,Math.floor(v.x)),y0=Math.max(0,Math.floor(v.y)),w0=Math.min(this.w-x0,Math.ceil(v.w)+2),h0=Math.min(this.h-y0,Math.ceil(v.h)+2);if(w0>0&&h0>0)c.drawImage(this.wallLayer,x0,y0,w0,h0,x0,y0,w0,h0)}else{c.fillStyle='#101820';c.fillRect(0,0,this.w,this.h);c.fillStyle=pat;for(const r of this.walkable)c.fillRect(r.x,r.y,r.w,r.h);if(this.wallLayer)c.drawImage(this.wallLayer,0,0);else this.drawDungeonWalls(c)}this.dungeon(c,time,view)};c.strokeStyle='#111a20';c.lineWidth=40;c.strokeRect(0,0,this.w,this.h)}
visible(v,x,y,w,h,m=60){return x+w>v.x-m&&x<v.x+v.w+m&&y+h>v.y-m&&y<v.y+v.h+m}
city(c,t,v){
 // Ground: paved blocks, service alleys, parks and plazas, then the river under the bridges.
 c.fillStyle=c.createPattern(this.tile,'repeat');c.fillRect(v.x-40,v.y-40,v.w+80,v.h+80);
 for(const a of CITY.alleys)if(this.visible(v,a.x,a.y,a.w,a.h))this.alley(c,a,t);
 for(const p of CITY.parks)if(this.visible(v,p.x,p.y,p.w,p.h))this.parkArea(c,p,t);
 this.river(c,t,v);
 for(const r of CITY.roads)if(this.visible(v,r.x,r.y,r.w,r.h,30))this.road(c,r);
 for(const r of CITY.roads)if(this.visible(v,r.x,r.y,r.w,r.h,30))this.roadMarks(c,r);
 this.crosswalks(c,v);this.bridgeRails(c,t,v);
 this.lobby(c,t,v);
 for(const d of CITY.decor)if(d.kind!=='lanternline'&&d.kind!=='busstop'&&this.visible(v,d.x-40,d.y-60,100,100))this.decor(c,d,t);
 for(const s of CITY.stalls)if(this.visible(v,s.x-20,s.y-50,s.w+40,s.h+70))this.foodStall(c,s,t);
 this.traffic.draw(c,t,v,this);
 for(const b of CITY.benches)if(this.visible(v,b.x-30,b.y-20,60,40)){c.fillStyle='#0005';c.fillRect(b.x-28,b.y+12,58,4);c.fillStyle='#2a2320';c.fillRect(b.x-26,b.y+6,4,8);c.fillRect(b.x+22,b.y+6,4,8);c.fillStyle='#7a5a3a';c.fillRect(b.x-28,b.y,56,7);c.fillStyle='#9a7650';c.fillRect(b.x-28,b.y,56,2);c.fillStyle='#5a3f28';c.fillRect(b.x-28,b.y-8,56,5)}
 const list=CITY.buildings.filter(b=>this.visible(v,b.x,b.y,b.w,b.h)).sort((a,b)=>a.y-b.y);for(const b of list){c.drawImage(this.buildingImage(b),b.x,b.y);this.buildingLive(c,b,t)}
 for(const tr of CITY.trees)if(this.visible(v,tr.x-40,tr.y-80,80,100))this.tree(c,tr.x,tr.y,tr.s);
}
// Elements drawn above the actors (lamp heads, signals, shelters, lantern strings).
cityTop(c,t,v){if(this.kind!=='hub')return;
 for(const d of CITY.decor)if((d.kind==='lanternline'||d.kind==='busstop')&&this.visible(v,d.x-40,d.y-70,(d.w||80)+80,110))this.decor(c,d,t);
 for(const s of this.traffic.signals)if(this.visible(v,s.x-20,s.y-70,40,80))this.signal(c,s,t);
 for(const l of CITY.lamps)if(this.visible(v,l.x-20,l.y-60,40,70))this.lamp(c,l.x,l.y,t)}
signal(c,s,t){const ph=LIGHTS.phase(t,s.axis),walk=LIGHTS.walk(t,s.axis==='h'?'v':'h');c.fillStyle='#0006';c.fillRect(s.x-3,s.y-1,8,3);c.fillStyle='#15191b';c.fillRect(s.x-2,s.y-48,4,48);c.fillStyle='#202629';c.fillRect(s.x-7,s.y-64,14,22);
 const cols={red:'#ff3b3b',yellow:'#ffc23a',green:'#3dff8a'};[['red',-60],['yellow',-53],['green',-46]].forEach(([k,dy])=>{c.fillStyle=ph===k?cols[k]:'#2c3236';c.fillRect(s.x-3,s.y+dy,6,5)});
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.35;c.fillStyle=cols[ph];c.beginPath();c.arc(s.x,s.y+(ph==='red'?-58:ph==='yellow'?-51:-44),9,0,7);c.fill();c.restore();
 c.fillStyle='#202629';c.fillRect(s.x+3,s.y-34,8,10);c.fillStyle=walk?'#5affb0':'#ff6a4a';c.fillRect(s.x+5,s.y-32,4,6)}
river(c,t,v){const Y=RIVER.y,H=RIVER.h;if(v.y+v.h<Y-80||v.y>Y+H+80)return;const x0=Math.max(0,Math.floor(v.x-60)),x1=Math.min(this.w,Math.ceil(v.x+v.w+60)),w=x1-x0;
 c.fillStyle='#3b4646';c.fillRect(x0,Y-60,w,62);c.fillRect(x0,Y+H-2,w,62);c.fillStyle='#55625f';for(let x=x0-x0%32;x<x1;x+=32){c.fillRect(x,Y-58,30,4);c.fillRect(x,Y+H+54,30,4)}
 c.fillStyle='#2f3a3a';for(let x=x0-x0%96;x<x1;x+=96){c.fillRect(x+40,Y-40,2,30);c.fillRect(x+70,Y+H+16,2,30)}
 const g=c.createLinearGradient(0,Y,0,Y+H);g.addColorStop(0,'#0e3348');g.addColorStop(1,'#061a28');c.fillStyle=g;c.fillRect(x0,Y,w,H);
 // Current streaks live in fixed world cells (not in the viewport), so they stay put on the
 // water while the camera pans; each one drifts with the flow and fades out before wrapping.
 c.fillStyle='#8fb6c4';const WC=160;for(let gx=Math.floor((x0-40)/WC);gx*WC<x1+40;gx++)for(let j=0;j<8;j++){const sp=12+j%5*4,ph=(hash2(gx,j)*WC+t*sp)%WC,k=ph/WC,x=gx*WC+ph,y=Y+20+hash2(gx,j+31)*(H-30);c.globalAlpha=(.22+.2*Math.sin(t*2+gx+j))*Math.sin(k*Math.PI);c.fillRect(x,y,14+j%3*8,2)}c.globalAlpha=1;
 // City light reflections shimmer on the water.
 c.save();c.globalCompositeOperation='lighter';for(let x=x0-x0%140;x<x1;x+=140){const k=(x/140)%3;c.globalAlpha=.08+.05*Math.sin(t*1.7+x);c.fillStyle=k<1?'#ffd27a':k<2?'#b06bff':'#3fd6ff';for(let j=0;j<5;j++)c.fillRect(x+20+Math.sin(t*2+j+x)*4,Y+14+j*16,26-j*4,3)}c.restore();
 c.fillStyle='#22302f';c.fillRect(x0,Y-4,w,6);c.fillRect(x0,Y+H-2,w,6);c.fillStyle='#7d8b90';c.fillRect(x0,Y-16,w,2);c.fillRect(x0,Y+H+4,w,2);c.fillStyle='#65737a';for(let x=x0-x0%40+10;x<x1;x+=40){c.fillRect(x,Y-16,3,13);c.fillRect(x,Y+H+4,3,12)}
 c.fillStyle='#d8e4e8';c.font='bold 12px monospace';c.textAlign='center';for(let x=2000;x<this.w;x+=2600)if(x>x0-200&&x<x1+200)c.fillText('RIO HAN',x,Y+H/2+4);c.textAlign='left'}
bridgeRails(c,t,v){for(const b of CITY.bridges){if(!this.visible(v,b.x-20,RIVER.y-20,b.w+40,RIVER.h+40))continue;const Y=RIVER.y,H=RIVER.h;
 c.fillStyle='#0007';c.fillRect(b.x-10,Y+2,10,H-4);c.fillRect(b.x+b.w,Y+2,10,H-4);
 for(const x of [b.x-6,b.x+b.w]){c.fillStyle='#4a5458';c.fillRect(x,Y-8,6,H+16);c.fillStyle='#8a969a';c.fillRect(x,Y-8,6,2);for(let y=Y;y<Y+H;y+=20){c.fillStyle='#2a3236';c.fillRect(x+1,y,4,2)}}
 for(let y=Y+10;y<Y+H;y+=50)for(const x of [b.x-4,b.x+b.w+2]){c.fillStyle='#ffd27a';c.globalAlpha=.7+.3*Math.sin(t*3+y);c.fillRect(x,y,3,3);c.globalAlpha=1}}}
alley(c,a,t){c.fillStyle='#191d1f';c.fillRect(a.x,a.y,a.w,a.h);c.fillStyle='#202527';if(a.v)c.fillRect(a.x+6,a.y,a.w-12,a.h);else c.fillRect(a.x,a.y+6,a.w,a.h-12);
 c.fillStyle='#121517';if(a.v){c.fillRect(a.x+a.w/2-1,a.y,2,a.h);for(let y=a.y+30;y<a.y+a.h;y+=90){c.fillStyle='#2c3234';c.fillRect(a.x+a.w/2-6,y,12,8);c.fillStyle='#121517';c.fillRect(a.x+a.w/2-5,y+2,10,1);c.fillRect(a.x+a.w/2-5,y+5,10,1)}}
 else{c.fillRect(a.x,a.y+a.h/2-1,a.w,2);for(let x=a.x+50;x<a.x+a.w;x+=170){c.fillStyle='#0d2a36';c.globalAlpha=.7;c.beginPath();c.ellipse(x,a.y+a.h/2+8,16,4,0,0,7);c.fill();c.fillStyle='#6fb6d0';c.globalAlpha=.25+.15*Math.sin(t*2+x);c.fillRect(x-6,a.y+a.h/2+7,8,1);c.globalAlpha=1}}}
decor(c,d,t){const {x,y}=d;
 if(d.kind==='vending'){c.fillStyle='#0006';c.fillRect(x,y+30,22,4);c.fillStyle='#b8202a';c.fillRect(x,y,22,32);c.fillStyle='#e8e8e8';c.fillRect(x+2,y+2,18,3);c.fillStyle='#1a2a3a';c.fillRect(x+3,y+7,12,16);for(let i=0;i<3;i++){c.fillStyle=['#5affb0','#ffd27a','#3fd6ff'][i];c.fillRect(x+4+i*4,y+9,3,5);c.fillRect(x+4+i*4,y+16,3,5)}c.fillStyle='#222';c.fillRect(x+3,y+25,16,4);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.18;c.fillStyle='#ff6a6a';c.beginPath();c.ellipse(x+11,y+30,24,10,0,0,7);c.fill();c.restore()}
 else if(d.kind==='bins'){for(let i=0;i<2;i++){const bx=x+i*16;c.fillStyle='#0006';c.fillRect(bx,y+18,14,3);c.fillStyle=i?'#2a6a3a':'#2a4a7a';c.fillRect(bx,y+2,14,17);c.fillStyle=shadeHex(i?'#2a6a3a':'#2a4a7a',.25);c.fillRect(bx-1,y,16,4)}}
 else if(d.kind==='dumpster'){c.fillStyle='#0007';c.fillRect(x+2,y+18,38,5);c.fillStyle='#2a5a3a';c.fillRect(x,y,38,20);c.fillStyle='#3a7a4a';c.fillRect(x-1,y-2,40,5);c.fillStyle='#1d3a28';for(let i=6;i<38;i+=8)c.fillRect(x+i,y+5,2,13);c.fillStyle='#e8e0d0';c.fillRect(x+4,y+8,5,4)}
 else if(d.kind==='boxes'){c.fillStyle='#0006';c.fillRect(x,y+18,34,3);c.fillStyle='#8a6a40';c.fillRect(x,y+6,16,13);c.fillRect(x+14,y+10,18,9);c.fillStyle='#a8844e';c.fillRect(x+4,y-2,14,10);c.fillStyle='#5a4428';c.fillRect(x+7,y+6,2,13);c.fillRect(x+21,y+10,2,9);c.fillRect(x+10,y-2,2,10)}
 else if(d.kind==='steam'){c.fillStyle='#2c3234';c.fillRect(x-7,y+20,14,8);c.fillStyle='#14181a';c.fillRect(x-6,y+22,12,1);c.fillRect(x-6,y+25,12,1);for(let i=0;i<4;i++){const k=((t*.5+i*.25)%1);c.fillStyle='#c8d4dc';c.globalAlpha=.16*(1-k);c.beginPath();c.arc(x+Math.sin(t+i*2)*5,y+18-k*34,5+k*10,0,7);c.fill()}c.globalAlpha=1}
 else if(d.kind==='lanternline'){c.strokeStyle='#14181b';c.lineWidth=1;c.beginPath();c.moveTo(x,y+2);c.quadraticCurveTo(x+d.w/2,y+18,x+d.w,y+2);c.stroke();for(let i=1;i<6;i++){const k=i/6,lx=x+d.w*k,ly=y+2+16*4*k*(1-k)+3,col=['#ff4a4a','#ffb43a','#ff6ab0'][i%3];c.fillStyle=shadeHex(col,-.3);c.fillRect(lx-3,ly,6,8);c.fillStyle=col;c.fillRect(lx-2,ly+1,4,6);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25+.08*Math.sin(t*3+i);c.fillStyle=col;c.beginPath();c.arc(lx,ly+4,11,0,7);c.fill();c.restore()}}
 else if(d.kind==='busstop'){c.fillStyle='#0006';c.fillRect(x-4,y-2,72,6);c.fillStyle='#2a3236';c.fillRect(x,y-40,3,38);c.fillRect(x+61,y-40,3,38);c.fillStyle='#8fc8e066';c.fillRect(x+3,y-38,58,22);c.fillStyle='#1a2a3a';c.fillRect(x-2,y-46,68,7);c.fillStyle='#3a5a7a';c.fillRect(x-2,y-46,68,2);c.fillStyle='#5a4a3a';c.fillRect(x+8,y-12,48,5);
  c.fillStyle='#1d5aa8';c.fillRect(x+70,y-52,14,14);c.fillStyle='#e8f4f8';c.font='bold 9px monospace';c.fillText('BUS',x+70,y-42);c.fillStyle='#2a3236';c.fillRect(x+76,y-38,2,38);
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25;c.fillStyle='#a9e6ff';c.fillRect(x+4,y-37,56,20);c.restore();c.fillStyle='#ffd27a';c.fillRect(x+12,y-34,16,12)}}
foodStall(c,s,t){const {x,y,w,h}=s;c.fillStyle='#0007';c.fillRect(x+3,y+h-2,w,6);c.fillStyle='#4a3020';c.fillRect(x,y+10,w,h-10);c.fillStyle='#6a4a30';c.fillRect(x,y+10,w,3);c.fillStyle='#2a1c12';c.fillRect(x+3,y+h-4,6,6);c.fillRect(x+w-9,y+h-4,6,6);
 for(let i=0;i<4;i++){c.fillStyle=['#e8e0d0','#c8a070','#ffcf8a','#d84a3a'][i];c.fillRect(x+8+i*(w-16)/4,y+14,(w-16)/4-4,5)}
 const sx=Math.ceil(w/12);for(let i=0;i<sx;i++){c.fillStyle=i%2?'#f2f0e6':s.color;c.fillRect(x-4+i*12,y-8,12,14)}c.fillStyle=shadeHex(s.color,-.35);c.fillRect(x-4,y+5,w+8,3);
 c.fillStyle='#14181b';c.fillRect(x+w/2-22,y-22,44,12);c.fillStyle='#ffe7a0';c.font='bold 8px monospace';c.textAlign='center';c.fillText(s.food,x+w/2,y-13);c.textAlign='left';
 for(let i=0;i<2;i++){const k=((t*.6+i*.5+x*.01)%1);c.fillStyle='#e8eef2';c.globalAlpha=.18*(1-k);c.beginPath();c.arc(x+w*.3+i*w*.35,y+8-k*26,4+k*7,0,7);c.fill()}c.globalAlpha=1;
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.22+.05*Math.sin(t*5+x);c.fillStyle='#ffb45a';c.beginPath();c.ellipse(x+w/2,y+h,w*.8,22,0,0,7);c.fill();c.restore()}
parkArea(c,p,t){
 if(p.kind==='park'){c.fillStyle='#24382a';c.fillRect(p.x,p.y,p.w,p.h);const r=seeded(3);c.fillStyle='#2e4733';for(let i=0;i<260;i++)c.fillRect(p.x+r()*p.w,p.y+r()*p.h,6+r()*10,3);c.fillStyle='#4a5a4a';
  c.fillRect(p.x,p.y+620,p.w,44);c.fillRect(p.x+480,p.y,44,p.h);c.fillStyle='#5f6f5e';c.fillRect(p.x,p.y+624,p.w,3);c.fillRect(p.x+484,p.y,3,p.h);
  // pond with reflections (solid)
  c.fillStyle='#1b3a3e';c.beginPath();c.ellipse(250,1150,110,64,0,0,7);c.fill();c.fillStyle='#2f6a76';c.beginPath();c.ellipse(250,1150,100,56,0,0,7);c.fill();c.fillStyle='#9fd4dc';for(let i=0;i<8;i++){c.globalAlpha=.3+.3*Math.sin(t*2+i);c.fillRect(180+i*18,1130+(i%3)*14,10,2)}c.globalAlpha=1;
  // basketball court
  c.fillStyle='#8a4a3a';c.fillRect(120,1720,280,170);c.strokeStyle='#e8e0d0';c.lineWidth=2;c.strokeRect(130,1730,260,150);c.beginPath();c.moveTo(260,1730);c.lineTo(260,1880);c.stroke();c.beginPath();c.arc(260,1805,24,0,7);c.stroke();
  c.fillStyle='#d8d0c0';c.font='bold 12px monospace';c.fillText('PARQUE YEOUIDO',600,1010)}
 else if(p.kind==='plaza'||p.kind==='square'){c.fillStyle=p.kind==='square'?'#3a3f42':'#33403e';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#58646266';c.lineWidth=1;for(let x=p.x;x<p.x+p.w;x+=40){c.beginPath();c.moveTo(x,p.y);c.lineTo(x,p.y+p.h);c.stroke()}for(let y=p.y;y<p.y+p.h;y+=40){c.beginPath();c.moveTo(p.x,y);c.lineTo(p.x+p.w,y);c.stroke()}
  if(p.kind==='square'){const cx=2100,cy=2520;c.fillStyle='#262b2e';c.beginPath();c.ellipse(cx,cy+40,90,30,0,0,7);c.fill();c.fillStyle='#5a6266';c.fillRect(cx-26,cy-20,52,60);c.fillStyle='#7c868a';c.fillRect(cx-30,cy-26,60,8);c.fillStyle='#2a3236';c.fillRect(cx-12,cy-90,24,66);c.fillStyle='#3d4a50';c.beginPath();c.moveTo(cx-18,cy-90);c.lineTo(cx,cy-120);c.lineTo(cx+18,cy-90);c.fill();c.fillStyle='#57e3ff';c.shadowColor='#57e3ff';c.shadowBlur=14;c.fillRect(cx-2,cy-112,4,80);c.shadowBlur=0;c.fillStyle='#d6e0e2';c.font='bold 11px monospace';c.textAlign='center';c.fillText('MEMORIAL DOS CAÇADORES',cx,cy+64);c.textAlign='left'}}
 else if(p.kind==='parking'){c.fillStyle='#2a2e31';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#d8d8c8';c.lineWidth=2;const cols=Math.floor((p.w-40)/72);for(let i=0;i<=cols;i++){c.beginPath();c.moveTo(p.x+30+i*72,p.y+20);c.lineTo(p.x+30+i*72,p.y+90);c.stroke();c.beginPath();c.moveTo(p.x+30+i*72,p.y+p.h-90);c.lineTo(p.x+30+i*72,p.y+p.h-20);c.stroke()}c.fillStyle='#e8e8d8';c.font='bold 16px monospace';c.fillText('P',p.x+p.w-30,p.y+p.h-20)}
 else if(p.kind==='construction'){c.fillStyle='#4a4234';c.fillRect(p.x,p.y,p.w,p.h);const r=seeded(5);c.fillStyle='#5a5040';for(let i=0;i<80;i++)c.fillRect(p.x+r()*p.w,p.y+r()*p.h,8+r()*14,4);for(let x=p.x;x<p.x+p.w;x+=24){c.fillStyle=(x/24|0)%2?'#e8b830':'#1a1a1a';c.fillRect(x,p.y+4,24,8);c.fillRect(x,p.y+p.h-12,24,8)}
  c.fillStyle='#d8a020';c.fillRect(p.x+250,p.y+60,10,260);c.fillRect(p.x+120,p.y+60,240,8);c.fillStyle='#1a1a1a';c.fillRect(p.x+130,p.y+68,2,90);c.fillStyle='#6a6a6a';c.fillRect(p.x+60,p.y+380,90,50);c.fillStyle='#8a8a8a';c.fillRect(p.x+180,p.y+420,110,30);c.fillStyle='#e8e0d0';c.font='bold 11px monospace';c.fillText('ZONA DE GATE INTERDITADA',p.x+40,p.y+30)}
 else if(p.kind==='grandplaza'){c.fillStyle='#3a4144';c.fillRect(p.x,p.y,p.w,p.h);c.fillStyle='#454d50';c.fillRect(p.x+40,p.y+60,p.w-80,p.h-120);c.strokeStyle='#5a646655';c.lineWidth=1;for(let x=p.x+40;x<p.x+p.w-40;x+=48){c.beginPath();c.moveTo(x,p.y+60);c.lineTo(x,p.y+p.h-60);c.stroke()}for(let y=p.y+60;y<p.y+p.h-60;y+=48){c.beginPath();c.moveTo(p.x+40,y);c.lineTo(p.x+p.w-40,y);c.stroke()}
  c.fillStyle='#24382a';for(const [fx,fy] of [[p.x+60,p.y+150],[p.x+p.w-260,p.y+150],[p.x+60,p.y+p.h-200],[p.x+p.w-260,p.y+p.h-200]]){c.fillRect(fx,fy,200,60);c.fillStyle='#2e4733';c.fillRect(fx+4,fy+4,192,4);const r=seeded(fx);for(let i=0;i<20;i++){c.fillStyle=['#d84a6a','#e8c84a','#e8e8f0','#9a5ad8'][i%4];c.fillRect(fx+8+r()*184,fy+10+r()*44,3,3)}c.fillStyle='#24382a'}
  const cx=5000,cy=1140;c.fillStyle='#0007';c.beginPath();c.ellipse(cx,cy+30,70,20,0,0,7);c.fill();c.fillStyle='#5a6266';c.fillRect(cx-40,cy-28,80,56);c.fillStyle='#7c868a';c.fillRect(cx-44,cy-34,88,8);c.fillStyle='#3a4246';c.fillRect(cx-40,cy+20,80,8);
  c.fillStyle='#8a6a2a';c.fillRect(cx-9,cy-86,18,54);c.fillStyle='#a8843a';c.fillRect(cx-7,cy-84,6,50);c.fillStyle='#6a4e1e';c.fillRect(cx-14,cy-60,28,8);c.fillStyle='#8a6a2a';c.beginPath();c.arc(cx,cy-94,9,0,7);c.fill();c.fillRect(cx+8,cy-110,3,72);c.fillStyle='#e8c84a';c.fillRect(cx+6,cy-114,7,6);
  c.fillStyle='#d6e0e2';c.font='bold 11px monospace';c.textAlign='center';c.fillText('PRAÇA GWANGHWAMUN',cx,cy+50);
  for(const fx of [4700,5300]){c.fillStyle='#262b2e';c.beginPath();c.ellipse(fx,cy+2,58,26,0,0,7);c.fill();c.fillStyle='#6a7478';c.beginPath();c.ellipse(fx,cy,54,22,0,0,7);c.fill();c.fillStyle='#1d4a5a';c.beginPath();c.ellipse(fx,cy,48,18,0,0,7);c.fill();c.fillStyle='#9fe8f8';for(let i=0;i<10;i++){const a=i/10*7+t,k=(t*1.5+i*.1)%1;c.globalAlpha=.6*(1-k);c.fillRect(fx+Math.cos(a)*30*k,cy-6-18*Math.sin(k*3.14)+Math.sin(a)*10*k,2,4)}c.globalAlpha=1;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.2;c.fillStyle='#3fd6ff';c.beginPath();c.ellipse(fx,cy,48,18,0,0,7);c.fill();c.restore()}
  c.textAlign='left'}
 else if(p.kind==='market'){c.fillStyle='#4a2e2a';c.fillRect(p.x,p.y,p.w,p.h);c.fillStyle='#5a3a32';for(let x=p.x;x<p.x+p.w;x+=20)for(let y=p.y;y<p.y+p.h;y+=10)c.fillRect(x+((y/10|0)%2)*10,y,18,8);c.fillStyle='#d6c0a0';c.font='bold 11px monospace';c.textAlign='center';c.fillText('RUA DE MYEONGDONG',p.x+p.w/2,p.y+p.h/2+4);c.textAlign='left'}
 else if(p.kind==='park2'){c.fillStyle='#24382a';c.fillRect(p.x,p.y,p.w,p.h);const r=seeded(p.x+p.y);c.fillStyle='#2e4733';for(let i=0;i<p.w*p.h/2500;i++)c.fillRect(p.x+r()*p.w,p.y+r()*p.h,6+r()*10,3);c.fillStyle='#1d3022';c.fillRect(p.x,p.y,p.w,4);
  c.fillStyle='#4a5a4a';c.fillRect(p.x,p.y+p.h/2-22,p.w,44);c.fillRect(p.x+p.w/2-22,p.y,44,p.h);c.fillStyle='#5f6f5e';c.fillRect(p.x,p.y+p.h/2-18,p.w,3);c.fillRect(p.x+p.w/2-18,p.y,3,p.h);
  if(p.w*p.h>250000){const px=p.x+p.w*.25,py=p.y+p.h*.25;c.fillStyle='#1b3a3e';c.beginPath();c.ellipse(px,py,100,48,0,0,7);c.fill();c.fillStyle='#2f6a76';c.beginPath();c.ellipse(px,py,92,42,0,0,7);c.fill();c.fillStyle='#9fd4dc';for(let i=0;i<7;i++){c.globalAlpha=.3+.3*Math.sin(t*2+i);c.fillRect(px-60+i*18,py-14+(i%3)*12,10,2)}c.globalAlpha=1;c.fillStyle='#3a8a4a';for(let i=0;i<5;i++){c.beginPath();c.ellipse(px-50+i*24,py+18-(i%2)*30,6,3,0,0,7);c.fill()}}
  c.fillStyle='#d8d0c0';c.font='bold 11px monospace';const nm=p.y>3000?'PARQUE HANGANG SUL':'PARQUE DA ORLA';c.fillText(nm,p.x+p.w/2+30,p.y+p.h/2-30)}
 else if(p.kind==='field'){c.fillStyle='#8a4a3a';c.fillRect(p.x,p.y,p.w,p.h);c.fillStyle='#2c5a34';c.fillRect(p.x+40,p.y+40,p.w-80,p.h-80);c.fillStyle='#336a3c';for(let x=p.x+40;x<p.x+p.w-40;x+=40)c.fillRect(x,p.y+40,20,p.h-80);
  c.strokeStyle='#e8e0d0';c.lineWidth=2;c.strokeRect(p.x+60,p.y+60,p.w-120,p.h-120);c.beginPath();c.moveTo(p.x+p.w/2,p.y+60);c.lineTo(p.x+p.w/2,p.y+p.h-60);c.stroke();c.beginPath();c.arc(p.x+p.w/2,p.y+p.h/2,40,0,7);c.stroke();
  for(const gx of [p.x+60,p.x+p.w-60]){c.strokeRect(gx-(gx<p.x+p.w/2?0:80),p.y+p.h/2-60,80,120);c.fillStyle='#e8e8e8';c.fillRect(gx-(gx<p.x+p.w/2?6:-2),p.y+p.h/2-24,4,48)}
  c.strokeStyle='#e8e0d066';c.lineWidth=1;for(let i=1;i<4;i++)c.strokeRect(p.x+i*10,p.y+i*10,p.w-i*20,p.h-i*20)}
 else if(p.kind==='marketsq'){c.fillStyle='#3a3330';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#4f4640';c.lineWidth=1;for(let x=p.x;x<p.x+p.w;x+=32){c.beginPath();c.moveTo(x,p.y);c.lineTo(x,p.y+p.h);c.stroke()}for(let y=p.y;y<p.y+p.h;y+=32){c.beginPath();c.moveTo(p.x,y);c.lineTo(p.x+p.w,y);c.stroke()}
  c.fillStyle='#e8c870';c.font='bold 12px monospace';c.textAlign='center';c.fillText('MERCADO NOTURNO DE YONGSAN',p.x+p.w/2,p.y+p.h/2+4);c.textAlign='left';
  for(let x=p.x+40;x<p.x+p.w-60;x+=170)this.decor(c,{kind:'lanternline',x,y:p.y+p.h/2-40,w:140},t)}
}
road(c,r){c.fillStyle='#1d2124';c.fillRect(r.x,r.y,r.w,r.h);c.fillStyle='#24292c';const hor=r.w>r.h;if(hor){c.fillRect(r.x,r.y+18,r.w,r.h-36)}else c.fillRect(r.x+18,r.y,r.w-36,r.h);
 c.fillStyle='#4f5654';if(hor){c.fillRect(r.x,r.y,r.w,16);c.fillRect(r.x,r.y+r.h-16,r.w,16);c.fillStyle='#6c7472';c.fillRect(r.x,r.y+15,r.w,2);c.fillRect(r.x,r.y+r.h-17,r.w,2);c.fillStyle='#424947';for(let x=r.x;x<r.x+r.w;x+=24){c.fillRect(x,r.y,1,15);c.fillRect(x,r.y+r.h-15,1,15)}}
 else{c.fillRect(r.x,r.y,16,r.h);c.fillRect(r.x+r.w-16,r.y,16,r.h);c.fillStyle='#6c7472';c.fillRect(r.x+15,r.y,2,r.h);c.fillRect(r.x+r.w-17,r.y,2,r.h);c.fillStyle='#424947';for(let y=r.y;y<r.y+r.h;y+=24){c.fillRect(r.x,y,15,1);c.fillRect(r.x+r.w-15,y,15,1)}}}
roadMarks(c,r){const hor=r.w>r.h;c.fillStyle=r.main?'#d9b648':'#c8c8c0';
 const skip=(p)=>CITY.roads.some(o=>o!==r&&(hor?(o.w<o.h&&p>o.x-10&&p<o.x+o.w+10&&r.y>=o.y-5&&r.y<=o.y+o.h):(o.w>o.h&&p>o.y-10&&p<o.y+o.h+10&&r.x>=o.x-5&&r.x<=o.x+o.w)));
 if(hor){for(let x=r.x;x<r.x+r.w;x+=40)if(!skip(x)){if(r.main){c.fillRect(x,r.y+r.h/2-3,26,2);c.fillRect(x,r.y+r.h/2+1,26,2)}else c.fillRect(x,r.y+r.h/2-1,22,2)}}
 else{for(let y=r.y;y<r.y+r.h;y+=40)if(!skip(y)){if(r.main){c.fillRect(r.x+r.w/2-3,y,2,26);c.fillRect(r.x+r.w/2+1,y,2,26)}else c.fillRect(r.x+r.w/2-1,y,2,22)}}}
crosswalks(c,v){c.fillStyle='#d6d6cc';for(const h of CITY.roads.filter(r=>r.w>r.h))for(const vr of CITY.roads.filter(r=>r.h>r.w)){if(vr.y>h.y+h.h||vr.y+vr.h<h.y)continue;if(!this.visible(v,vr.x-40,h.y-40,vr.w+80,h.h+80))continue;
 for(let y=h.y+20;y<h.y+h.h-20;y+=12){c.fillRect(vr.x-28,y,22,7);c.fillRect(vr.x+vr.w+6,y,22,7)}for(let x=vr.x+20;x<vr.x+vr.w-20;x+=12){if(h.y>30)c.fillRect(x,h.y-28,7,22);c.fillRect(x,h.y+h.h+6,7,22)}}}
car(c,x,y,color,dir,parked,t=0){c.save();c.translate(Math.round(x),Math.round(y));if(parked){c.rotate(Math.PI/2)}else c.scale(dir,1);c.fillStyle='#0007';c.fillRect(-27,-11,56,26);c.fillStyle='#0b0d10';c.fillRect(-22,-14,10,5);c.fillRect(10,-14,10,5);c.fillRect(-22,11,10,5);c.fillRect(10,11,10,5);
 c.fillStyle=color;c.fillRect(-28,-12,56,24);c.fillStyle=shadeHex(color,-.3);c.fillRect(-28,6,56,6);c.fillStyle='#2a3a48';c.fillRect(-12,-10,26,20);c.fillStyle='#7fa9c0';c.fillRect(8,-9,6,18);c.fillStyle=shadeHex(color,.25);c.fillRect(-10,-8,18,16);
 if(!parked){c.fillStyle='#fff6c8';c.fillRect(26,-10,3,5);c.fillRect(26,5,3,5);c.fillStyle='#ff3a3a';c.fillRect(-29,-10,2,5);c.fillRect(-29,5,2,5);c.globalCompositeOperation='lighter';c.globalAlpha=.18;c.fillStyle='#fff3b0';c.beginPath();c.moveTo(28,-10);c.lineTo(110,-34);c.lineTo(110,34);c.lineTo(28,10);c.fill()}c.restore()}
tree(c,x,y,s){c.fillStyle='#0006';c.beginPath();c.ellipse(x,y+4,26*s,9*s,0,0,7);c.fill();c.fillStyle='#3a2a1e';c.fillRect(x-4*s,y-22*s,8*s,26*s);c.fillStyle='#1f3a28';c.beginPath();c.arc(x,y-38*s,26*s,0,7);c.fill();c.fillStyle='#2c5236';c.beginPath();c.arc(x-5*s,y-44*s,20*s,0,7);c.fill();c.fillStyle='#3e6c46';c.beginPath();c.arc(x-9*s,y-50*s,10*s,0,7);c.fill()}
lamp(c,x,y,t){c.fillStyle='#14181b';c.fillRect(x-2,y-46,4,46);c.fillRect(x-2,y-48,14,3);c.fillStyle='#ffe2a0';c.fillRect(x+8,y-46,6,3);c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(x+11,y-40,2,x+11,y-20,70);g.addColorStop(0,'rgba(255,214,140,.28)');g.addColorStop(1,'rgba(255,214,140,0)');c.fillStyle=g;c.beginPath();c.ellipse(x+11,y-10,70,46,0,0,7);c.fill();c.restore()}
buildingImage(b){if(this.buildingCache.has(b))return this.buildingCache.get(b);const cv=document.createElement('canvas');cv.width=b.w;cv.height=b.h;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;this.paintBuilding(c,b);this.buildingCache.set(b,cv);return cv}
paintBuilding(c,b){
 const r=seeded(b.x*7+b.y*13+b.w),W=b.w,H=b.h,R=b.roof,fH=H-R,col=b.color,dark=shadeHex(col,-.35),light=shadeHex(col,.18);
 // Roof with parapet and rooftop equipment.
 c.fillStyle=shadeHex(col,-.55);c.fillRect(0,0,W,R);c.fillStyle=shadeHex(col,-.4);c.fillRect(4,4,W-8,R-8);c.fillStyle=shadeHex(col,-.2);c.fillRect(0,0,W,4);c.fillRect(0,0,4,R);c.fillRect(W-4,0,4,R);
 c.fillStyle='#00000033';for(let x=12;x<W-12;x+=16)c.fillRect(x,8,1,R-16);
 if(b.type==='tower'||b.type==='guild'){c.fillStyle='#2b3036';c.fillRect(W/2-30,R/2-18,60,36);c.strokeStyle='#e8e0c0';c.lineWidth=2;c.beginPath();c.arc(W/2,R/2,14,0,7);c.stroke();c.fillStyle='#e8e0c0';c.font='bold 14px monospace';c.textAlign='center';c.fillText('H',W/2,R/2+5);c.textAlign='left'}
 for(let i=0;i<Math.max(2,W/90);i++){const x=10+r()*(W-50),y=8+r()*(R-28);c.fillStyle='#5a6268';c.fillRect(x,y,24,16);c.fillStyle='#3a4046';c.fillRect(x+3,y+3,8,8);c.fillRect(x+13,y+3,8,8);c.fillStyle='#788086';c.fillRect(x,y,24,2)}
 if(b.type==='apartment'){c.fillStyle='#2a4a6a';for(let i=0;i<3;i++)c.fillRect(W-60-i*40,10,32,18);c.fillStyle='#6a7a8a';c.fillRect(20,8,26,22)}
 // Facade.
 c.fillStyle=col;c.fillRect(0,R,W,fH);c.fillStyle=light;c.fillRect(0,R,W,3);c.fillStyle=dark;c.fillRect(0,R+3,W,4);
 const glassy=b.type==='tower'||b.type==='guild';
 if(glassy){const g=c.createLinearGradient(0,R,W,H);g.addColorStop(0,shadeHex(col,.1));g.addColorStop(1,shadeHex(col,-.25));c.fillStyle=g;c.fillRect(6,R+8,W-12,fH-34)}
 const cw=b.type==='shop'?28:glassy?16:24,ch=glassy?14:22,top=R+12,bottom=H-(b.type==='shop'?62:40);
 for(let y=top;y<bottom-ch+4;y+=ch+(glassy?4:8))for(let x=10;x<W-10-cw+4;x+=cw+(glassy?3:8)){const lit=r()<(glassy?.45:.55),warm=r()<.6;c.fillStyle=glassy?shadeHex(col,-.5):dark;c.fillRect(x-1,y-1,cw+2,ch+2);c.fillStyle=lit?(warm?'#ffd98a':'#a9e6ff'):'#1a2836';c.fillRect(x,y,cw,ch);if(lit){c.fillStyle='#ffffff55';c.fillRect(x,y,cw,2)}else{c.fillStyle='#3a5a7a44';c.fillRect(x,y,cw/2,ch)}
  if(b.type==='apartment'){c.fillStyle=shadeHex(col,-.2);c.fillRect(x-3,y+ch,cw+6,4);c.fillStyle='#9aa6ae';c.fillRect(x-3,y+ch-4,cw+6,1)}}
 // Ground floor.
 const gy=H-38;c.fillStyle=shadeHex(col,-.45);c.fillRect(0,gy,W,38);
 if(b.type==='shop'){c.fillStyle='#ffe7b0';c.fillRect(8,H-56,W-16,46);c.fillStyle='#e6c68a';for(let x=8;x<W-10;x+=30)c.fillRect(x,H-56,2,46);c.fillStyle='#2a2a2a';c.fillRect(W/2-10,H-46,20,40);const aw=b.color;for(let x=0;x<W;x+=18){c.fillStyle=(x/18|0)%2?'#f2f2ea':aw;c.fillRect(x,H-72,18,14)}c.fillStyle='#00000044';c.fillRect(0,H-58,W,3)}
 else{c.fillStyle='#bfe6ff';c.fillRect(W/2-24,gy+6,48,32);c.fillStyle='#6fa6c8';c.fillRect(W/2-1,gy+6,2,32);c.fillStyle='#d8eef8';for(let x=12;x<W-12;x+=40)if(Math.abs(x-W/2)>40){c.fillStyle='#ffe2a0';c.fillRect(x,gy+10,26,18)}}
 if(b.type==='hospital'){c.fillStyle='#e8f4f4';c.fillRect(W/2-40,R+16,80,40);c.fillStyle='#d93a4a';c.fillRect(W/2-6,R+20,12,32);c.fillRect(W/2-16,R+30,32,12)}
 if(b.type==='guild'){c.fillStyle=b.name.includes('AHJIN')?'#8a4aff':b.name.includes('TIGER')?'#3a3a3a':b.name.includes('FIEND')?'#d43a3a':'#e0b84a';c.beginPath();c.arc(W/2,R+42,22,0,7);c.fill();c.fillStyle=shadeHex(col,-.5);c.beginPath();c.arc(W/2,R+42,14,0,7);c.fill();for(const x of [W/2-70,W/2+52]){c.fillStyle=b.name.includes('AHJIN')?'#4a1a8a':'#7a1a24';c.fillRect(x,R+20,18,fH-70);c.fillStyle='#e0b84a';c.fillRect(x,R+20,18,3)}}
 if(b.type==='neon'){const nc=['#ff3aa8','#3fd6ff','#b06bff','#ffdd4a','#5affb0'],a=nc[(b.x/7|0)%5],bb=nc[(b.x/7+2|0)%5];c.fillStyle='#0b0b14';c.fillRect(10,R+14,24,fH-70);c.strokeStyle=a;c.lineWidth=2;c.strokeRect(12,R+16,20,fH-74);c.fillStyle=a;for(let y=R+24;y<H-70;y+=16)c.fillRect(17,y,10,8);
  c.fillStyle=bb;c.fillRect(40,H-66,W-50,3);c.fillStyle=a;c.fillRect(40,R+10,W-50,2);c.fillStyle='#14101c';c.fillRect(W/2-30,H-38,60,32);c.fillStyle=bb;c.fillRect(W/2-30,H-38,60,2);c.fillStyle='#ff3aa833';c.fillRect(8,H-36,W/2-46,22);c.fillRect(W/2+38,H-36,W/2-46,22)}
 if(b.type==='arena'){c.fillStyle=shadeHex(col,-.3);c.beginPath();c.ellipse(W/2,R/2+2,W/2-30,R/2-8,0,0,7);c.fill();c.strokeStyle='#8a96a6';c.lineWidth=2;for(let i=1;i<4;i++){c.beginPath();c.ellipse(W/2,R/2+2,(W/2-30)*i/4,(R/2-8)*i/4,0,0,7);c.stroke()}for(let i=0;i<12;i++){const a=i/12*Math.PI*2;c.beginPath();c.moveTo(W/2,R/2+2);c.lineTo(W/2+Math.cos(a)*(W/2-30),R/2+2+Math.sin(a)*(R/2-8));c.stroke()}
  for(let x=20;x<W-20;x+=64){c.fillStyle='#c8b070';c.fillRect(x,R+8,10,fH-50);c.fillStyle='#8a7444';c.fillRect(x+7,R+8,3,fH-50)}c.fillStyle='#0a1018';c.fillRect(W/2-170,R+20,340,110);c.fillStyle='#14202c';c.fillRect(W/2-164,R+26,328,98);
  c.fillStyle='#0a0e14';for(const ex of [W/2-260,W/2-40,W/2+180]){c.fillRect(ex,H-80,80,74);c.beginPath();c.arc(ex+40,H-80,40,Math.PI,0);c.fill()}c.fillStyle='#d8b44a';c.fillRect(0,H-86,W,4)}
 if(b.type==='school'){c.fillStyle='#3a6a4a';c.fillRect(0,0,W,R);c.fillStyle='#4a7a5a';c.fillRect(4,4,W-8,R-8);c.fillStyle='#2a5a3a';for(let x=8;x<W-8;x+=14)c.fillRect(x,6,2,R-12);
  c.fillStyle='#e8e0d0';c.beginPath();c.arc(W/2,R+34,20,0,7);c.fill();c.strokeStyle='#2a2a2a';c.lineWidth=2;c.beginPath();c.arc(W/2,R+34,20,0,7);c.stroke();c.beginPath();c.moveTo(W/2,R+34);c.lineTo(W/2,R+20);c.moveTo(W/2,R+34);c.lineTo(W/2+10,R+38);c.stroke();
  c.fillStyle='#9a9a9a';c.fillRect(W-60,4,3,R-10);c.fillStyle='#e8e8e8';c.fillRect(W-57,6,26,16);c.fillStyle='#c8202a';c.beginPath();c.arc(W-44,14,4,0,7);c.fill();c.fillStyle='#1d3a8a';c.fillRect(W-48,14,8,4)}
 if(b.type==='station'){c.fillStyle='#8fc8e044';c.fillRect(20,R+10,W-40,fH-60);c.strokeStyle='#5a6a78';c.lineWidth=2;for(let x=20;x<W-20;x+=60){c.beginPath();c.moveTo(x,R+10);c.lineTo(x,H-50);c.stroke()}c.beginPath();c.moveTo(20,R+10);c.lineTo(W-20,R+10);c.stroke();
  c.fillStyle='#1d2a36';c.fillRect(0,H-56,W,10);c.fillStyle='#3a6ad8';c.beginPath();c.arc(70,R+50,24,0,7);c.fill();c.fillStyle='#e8f4f8';c.font='bold 22px monospace';c.textAlign='center';c.fillText('M',70,R+58);c.textAlign='left';
  c.fillStyle='#0a1018';for(let x=W/2-300;x<W/2+300;x+=150){c.fillRect(x,H-44,110,40)}c.fillStyle='#ffe2a0';for(let x=W/2-300;x<W/2+300;x+=150)c.fillRect(x+4,H-40,102,3)}
 // Name sign.
 c.font='bold 13px monospace';const tw=(c.measureText&&(c.measureText(b.name)||{}).width)||b.name.length*8;c.fillStyle='#0b1218';c.fillRect(W/2-tw/2-8,gy-24,tw+16,20);c.fillStyle=b.type==='guild'&&b.name.includes('AHJIN')?'#c9a0ff':'#e8f4f8';c.textAlign='center';c.fillText(b.name,W/2,gy-9);c.textAlign='left';
 c.fillStyle='#00000055';c.fillRect(0,H-6,W,6);c.fillStyle=dark;c.fillRect(0,R,3,fH);c.fillStyle=shadeHex(col,-.6);c.fillRect(W-3,R,3,fH);
}
buildingLive(c,b,t){
 // Animated holo boards and neon on selected buildings.
 if(b.name==='SEOUL MEDIA TOWER'||b.name==='HUNTER NET'){const x=b.x+b.w/2-110,y=b.y+b.roof+18,w=220,h=70;c.fillStyle='#03101c';c.fillRect(x-4,y-4,w+8,h+8);const g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,'#0a4a7a');g.addColorStop(1,'#3a0f5a');c.fillStyle=g;c.fillRect(x,y,w,h);c.fillStyle='#ffffff';c.font='bold 13px monospace';c.textAlign='center';
  const msgs=['⚠ ALERTA DE GATE','RANK S · SUNG JIN-WOO','HUNTER NET · AO VIVO','GATES ATIVOS NA CIDADE'],m=msgs[Math.floor(t/3)%msgs.length];c.fillText(m,x+w/2,y+30);c.fillStyle='#5ae3ff';c.fillRect(x+10,y+44,(w-20)*((t*.3)%1),4);c.textAlign='left';c.fillStyle='#ffffff10';for(let i=0;i<h;i+=3)c.fillRect(x,y+i,w,1)}
 if(b.type==='shop'){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25+.12*Math.sin(t*4+b.x);c.fillStyle='#ffd27a';c.fillRect(b.x,b.y+b.h-60,b.w,50);c.restore()}
 if(b.name==='AHJIN GUILD'){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.35+.25*Math.sin(t*2);c.fillStyle='#8a4aff';c.beginPath();c.arc(b.x+b.w/2,b.y+b.roof+42,30,0,7);c.fill();c.restore()}
 if(b.type==='neon'){const nc=['#ff3aa8','#3fd6ff','#b06bff','#ffdd4a','#5affb0'],a=nc[(b.x/7|0)%5],bb=nc[(b.x/7+2|0)%5],fl=Math.sin(t*23+b.x)>.92?.25:1;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=(.3+.1*Math.sin(t*3+b.y))*fl;c.fillStyle=a;c.fillRect(b.x+6,b.y+b.roof+10,32,b.h-b.roof-60);c.globalAlpha=.22*fl;c.fillStyle=bb;c.fillRect(b.x+36,b.y+b.h-72,b.w-42,16);c.globalAlpha=.16;c.beginPath();c.ellipse(b.x+b.w/2,b.y+b.h+6,b.w*.55,24,0,0,7);c.fill();c.restore()}
 if(b.type==='arena'){const x=b.x+b.w/2-164,y=b.y+b.roof+26,w=328,h=98;c.save();const g=c.createLinearGradient(x,y,x+w,y+h);if(g){g.addColorStop(0,'#1a0a3a');g.addColorStop(1,'#08304a')}c.fillStyle=g||'#120a2a';c.fillRect(x,y,w,h);c.fillStyle='#fff';c.font='bold 16px monospace';c.textAlign='center';const msgs=['TORNEIO DE CAÇADORES','HOJE · 21:00','RANK S · AO VIVO','ARENA DOS CAÇADORES'];c.fillText(msgs[Math.floor(t/2.5)%4],x+w/2,y+44);c.fillStyle='#b06bff';c.fillRect(x+20,y+62,(w-40)*((t*.25)%1),4);c.fillStyle='#3fd6ff';c.fillRect(x+20,y+72,(w-40)*((t*.4+.3)%1),2);c.fillStyle='#ffffff0d';for(let i=0;i<h;i+=3)c.fillRect(x,y+i,w,1);c.textAlign='left';
  c.globalCompositeOperation='lighter';c.globalAlpha=.18+.08*Math.sin(t*2);c.fillStyle='#7b2cff';c.fillRect(x-8,y-8,w+16,h+16);c.restore()}
 if(b.type==='station'){const x=b.x+b.w-250,y=b.y+b.roof+20;c.fillStyle='#05080c';c.fillRect(x,y,200,60);c.font='bold 10px monospace';c.fillStyle='#ffb43a';const rows=['LINHA 1  SEUL    2 MIN','LINHA 4  GANGNAM 5 MIN','LINHA 2  HONGDAE 9 MIN'];for(let i=0;i<3;i++)c.fillText(rows[(i+Math.floor(t/4))%3],x+8,y+16+i*16)}
 if(b.type==='school'&&Math.sin(t*.7+b.x)>0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.12;c.fillStyle='#ffd98a';c.fillRect(b.x+8,b.y+b.roof+8,b.w-16,b.h-b.roof-50);c.restore()}
}
// ------------------------------- Association lobby (local coordinates) -------------------------
lobby(c,t,v){if(!this.visible(v,HUB.ox,HUB.oy,1800,1200))return;c.save();c.translate(HUB.ox,HUB.oy);this.hub(c,t);c.restore()}
hub(c,t){
 // garden band behind the association
 c.fillStyle='#22332b';c.fillRect(0,0,1800,300);c.fillStyle='#2c4234';for(let i=0;i<40;i++)c.fillRect((i*97)%1800,(i*53)%280,30,4);
 for(let i=0;i<14;i++){let x=i*135+30;if(x>500&&x<1300)continue;c.fillStyle='#1f3328';c.beginPath();c.arc(x,195,52,0,7);c.fill();c.fillStyle='#2f4d39';c.beginPath();c.arc(x-6,180,40,0,7);c.fill();c.fillStyle='#3f6648';c.beginPath();c.arc(x-12,168,18,0,7);c.fill()}
 c.fillStyle='#3a4744';c.fillRect(0,296,1800,8);for(let x=0;x<1800;x+=60){c.fillStyle='#55625e';c.fillRect(x,290,6,16)}
 this.associationBuilding(c,t);
 // plaza
 c.fillStyle='#252f32';c.fillRect(490,510,820,400);c.strokeStyle='#5d6e6c';c.lineWidth=8;c.strokeRect(490,510,820,400);c.fillStyle='#39484a';c.fillRect(505,525,790,370);c.fillStyle=c.createPattern(this.tile,'repeat');c.fillRect(506,526,788,368);for(let i=0;i<8;i++){c.fillStyle='#697970';c.fillRect(510+i*100,526,5,16);c.fillRect(510+i*100,879,5,16)}
 this.plazaDetails(c,t);this.fountain(c,900,680,t);
 this.merchantShop(c,205,360,t);this.clinic(c,1385,360,t);
 this.npc(c,310,620,'MERCADOR','npc_merchant',t);this.npc(c,1490,620,'CURANDEIRA','npc_healer',t);
 // Quadro de contratos da Associação, Yoo Jin-ho e o portal para Busan.
 this.contractBoard(c,1000,440,t);
 this.npc(c,700,760,'YOO JIN-HO','npc_jinho',t);
 this.portalMarker(c,1150,760,t,'PORTAL · BUSAN','#3bcfff');
 // Door guards and the hunters around the plaza are CityNPCs (see CityNPCSystem).
}
// Quadro de contratos: painel físico da Associação com os avisos de gate.
contractBoard(c,x,y,t){c.save();c.translate(x,y);
 c.fillStyle='#0008';c.fillRect(-52,44,104,10);
 c.fillStyle='#4a3a26';c.fillRect(-46,-34,92,80);c.fillStyle='#6a5232';c.fillRect(-46,-34,92,6);c.fillStyle='#3a2c1c';c.fillRect(-40,-28,80,68);
 for(let i=0;i<3;i++){const py=-22+i*20,pulse=.5+.5*Math.sin(t*2+i);c.fillStyle=i===0?`rgba(255,70,80,${.5+.4*pulse})`:'#e8e0cc';c.fillRect(-34,py,68,14);c.fillStyle='#2a2016';c.font='bold 7px monospace';c.textAlign='center';c.fillText(['GATE VERMELHO','CONTRATOS','RANK E'][i]||'',0,py+10);c.textAlign='left'}
 c.fillStyle='#d8c8a0';c.font='bold 9px monospace';c.textAlign='center';c.fillText('CONTRATOS',0,-40);c.textAlign='left';c.restore()}
// Marcador de portal de viagem entre cidades.
portalMarker(c,x,y,t,label,col){c.save();c.translate(x,y);
 const g=c.createRadialGradient(0,0,4,0,0,70);g.addColorStop(0,'#ffffff');g.addColorStop(.3,col);g.addColorStop(1,'#07101b');c.fillStyle=g;c.beginPath();c.ellipse(0,0,44,58,0,0,7);c.fill();
 c.shadowBlur=18;c.shadowColor=col;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.ellipse(0,0,46,60,0,0,7);c.stroke();c.shadowBlur=0;
 c.globalAlpha=.5+.3*Math.sin(t*3);c.fillStyle=col;c.beginPath();c.ellipse(0,0,20,30,0,0,7);c.fill();c.globalAlpha=1;
 c.fillStyle='#d8e4e8';c.font='bold 10px monospace';c.textAlign='center';c.fillText(label,0,-78);c.textAlign='left';c.restore()}
associationBuilding(c,t){
 // Footprint shadow and side wings give the facade depth.
 c.fillStyle='#0008';c.fillRect(530,318,740,14);
 c.fillStyle='#1b2326';c.fillRect(540,40,720,80);c.fillStyle='#2a3436';c.fillRect(548,48,704,64);c.fillStyle='#3d4a4b';c.fillRect(540,40,720,5);
 for(let x=560;x<1240;x+=24){c.fillStyle='#232c2e';c.fillRect(x,52,2,56)}
 c.fillStyle='#103848';c.fillRect(700,60,400,14);c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(80,220,255,${.35+.15*Math.sin(t*2)})`;c.fillRect(702,62,396,10);c.restore();
 for(const x of [600,1170]){c.fillStyle='#4a5456';c.fillRect(x,70,30,22);c.fillStyle='#626e70';c.fillRect(x,70,30,3);c.fillStyle='#2a3234';c.fillRect(x+4,76,10,10);c.fillRect(x+16,76,10,10)}
 for(const x of [575,1225]){c.fillStyle='#8a8a7a';c.fillRect(x,6,3,50);c.fillStyle='#1f4f8a';c.fillRect(x+3,8+Math.sin(t*3+x)*1.5,26,16);c.fillStyle='#e8e8e8';c.fillRect(x+12,12+Math.sin(t*3+x)*1.5,8,8)}
 // main body
 const g=c.createLinearGradient(0,115,0,320);g.addColorStop(0,'#4a5250');g.addColorStop(1,'#353c3b');c.fillStyle=g;c.fillRect(560,115,680,205);
 c.fillStyle='#2b3232';c.fillRect(540,110,24,212);c.fillRect(1236,110,24,212);c.fillStyle='#596361';c.fillRect(540,110,8,212);c.fillStyle='#1e2424';c.fillRect(1252,110,8,212);
 c.fillStyle='#6d685a';c.fillRect(556,112,688,8);c.fillStyle='#8f8670';c.fillRect(556,112,688,2);c.fillStyle='#5d5548';c.fillRect(560,206,680,6);
 for(let i=0;i<7;i++){const x=568+i*105;c.fillStyle='#282d2b';c.fillRect(x,120,12,198);c.fillStyle='#78786a';c.fillRect(x+2,120,7,196);c.fillStyle='#a8a084';c.fillRect(x,120,12,6);c.fillRect(x,296,12,6)}
 for(let i=0;i<6;i++){const x=590+i*105;if(x>800&&x<980)continue;for(const [y,h] of [[132,62],[222,78]]){c.fillStyle='#1b2527';c.fillRect(x,y,62,h);c.fillStyle='#2e3a3c';c.beginPath();c.arc(x+31,y+6,31,Math.PI,0);c.fill();c.fillStyle='#8b704f';c.fillRect(x+6,y+6,50,h-10);const lg=c.createLinearGradient(0,y,0,y+h);lg.addColorStop(0,'#ffd9a0');lg.addColorStop(1,'#d88a48');c.fillStyle=lg;c.fillRect(x+10,y+10,42,h-18);c.fillStyle='#5b4a3c';c.fillRect(x+29,y+10,4,h-18);c.fillRect(x+10,y+h/2,42,3);c.fillStyle='#3a3230';c.fillRect(x+4,y+h-6,54,5)}}
 // entrance portico
 c.fillStyle='#1f2523';c.fillRect(812,124,176,196);c.fillStyle='#6a6450';c.fillRect(820,128,160,8);c.fillStyle='#272320';c.fillRect(830,143,140,177);c.fillStyle='#665442';c.fillRect(842,160,116,160);
 const dg=c.createLinearGradient(0,165,0,320);dg.addColorStop(0,'#9fe4ff');dg.addColorStop(1,'#2a6a8a');c.fillStyle=dg;c.fillRect(850,170,100,150);c.fillStyle='#1a2a30';c.fillRect(898,170,4,150);c.fillRect(850,240,100,3);
 c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(120,230,255,${.18+.08*Math.sin(t*3)})`;c.fillRect(850,170,100,150);c.restore();
 c.fillStyle='#1a2527';c.fillRect(872,72,56,50);c.fillStyle='#bdab76';c.fillRect(877,76,46,42);c.fillStyle='#4f6265';c.fillRect(882,81,36,32);c.fillStyle='#e5d8a3';c.fillRect(898,84,4,26);c.fillRect(888,93,24,4);
 c.fillStyle='#0d1416';c.fillRect(780,134,240,24);c.fillStyle='#e5d39a';c.font='bold 17px monospace';c.textAlign='center';c.fillText('HUNTERS ASSOCIATION',900,152);c.textAlign='left';
 // holographic banners
 for(const x of [740,1030]){c.fillStyle='#0b2230';c.fillRect(x,170,32,96);c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(60,200,255,.55)';c.fillRect(x+2,172,28,92);c.fillStyle='rgba(255,255,255,.4)';const sy=172+((t*30)%92);c.fillRect(x+2,sy,28,2);c.restore();c.fillStyle='#e8fbff';c.fillRect(x+14,184,4,40);c.fillRect(x+8,196,16,4)}
 // steps, lamps and planters
 for(let i=0;i<5;i++){c.fillStyle=i%2?'#5e6862':'#525c56';c.fillRect(780-i*12,320+i*15,240+i*24,15);c.fillStyle='#737d76';c.fillRect(780-i*12,320+i*15,240+i*24,2)}
 for(const x of [700,1080]){c.fillStyle='#1a2525';c.fillRect(x,268,10,52);c.fillStyle='#d3ac68';c.fillRect(x-4,258,18,12);c.save();c.globalCompositeOperation='lighter';const lg=c.createRadialGradient(x+5,264,2,x+5,280,60);lg.addColorStop(0,'rgba(255,200,120,.45)');lg.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=lg;c.beginPath();c.arc(x+5,280,60,0,7);c.fill();c.restore()}
 for(const x of [600,1150]){c.fillStyle='#2b302c';c.fillRect(x,296,56,24);c.fillStyle='#3e5a3e';c.fillRect(x+4,286,48,14);c.fillStyle='#d77a8a';for(let i=0;i<5;i++)c.fillRect(x+7+i*9,288+(i%2)*4,4,4)}
}
merchantShop(c,x,y,t){
 // Two-storey weapon shop: tiled roof, timber frame, display window, awning, sign and lanterns.
 const W=210,H=205;c.fillStyle='#0008';c.fillRect(x-6,y+H-4,W+12,12);
 c.fillStyle='#4a1f1c';c.beginPath();c.moveTo(x-14,y+58);c.lineTo(x+18,y);c.lineTo(x+W-18,y);c.lineTo(x+W+14,y+58);c.fill();
 for(let r=0;r<5;r++){c.fillStyle=r%2?'#7a3a30':'#6a3028';const yy=y+4+r*11,ins=18-r*6;c.fillRect(x+ins,yy,W-ins*2,9);c.fillStyle='#8f4a3c';for(let i=x+ins+(r%2)*8;i<x+W-ins;i+=16)c.fillRect(i,yy,2,9);c.fillStyle='#6a3028'}
 c.fillStyle='#2a1612';c.fillRect(x-14,y+56,W+28,6);c.fillStyle='#5a4a3c';c.fillRect(x+W-60,y-26,22,30);c.fillStyle='#3a2e26';c.fillRect(x+W-62,y-30,26,6);
 for(let i=0;i<3;i++){c.fillStyle='#9a9aa0';c.globalAlpha=.25-i*.07;c.beginPath();c.arc(x+W-49+Math.sin(t+i)*4,y-38-i*14-(t*10%14),6+i*3,0,7);c.fill()}c.globalAlpha=1;
 c.fillStyle='#d8c8a8';c.fillRect(x,y+62,W,58);c.fillStyle='#4a3020';c.fillRect(x,y+62,W,5);c.fillRect(x,y+62,6,58);c.fillRect(x+W-6,y+62,6,58);c.fillRect(x+W/2-3,y+62,6,58);c.fillRect(x,y+90,W,4);
 for(const wx of [x+28,x+128]){c.fillStyle='#3a2416';c.fillRect(wx-2,y+70,54,40);c.fillStyle='#ffd88a';c.fillRect(wx,y+72,50,36);c.fillStyle='#3a2416';c.fillRect(wx+24,y+72,2,36);c.fillRect(wx,y+89,50,2);c.fillStyle='#4a6a3a';c.fillRect(wx-4,y+108,58,7);c.fillStyle='#e05a7a';for(let i=0;i<6;i++)c.fillRect(wx-1+i*9,y+104,4,4)}
 c.fillStyle='#5a3a26';c.fillRect(x,y+120,W,85);c.fillStyle='#6e4a32';for(let yy=y+124;yy<y+H;yy+=10)c.fillRect(x,yy,W,1);
 c.fillStyle='#22160f';c.fillRect(x+16,y+132,108,62);const dg=c.createLinearGradient(0,y+134,0,y+192);dg.addColorStop(0,'#ffe3a8');dg.addColorStop(1,'#c88a4a');c.fillStyle=dg;c.fillRect(x+20,y+136,100,54);
 for(let i=0;i<4;i++){const dx=x+30+i*24;c.fillStyle='#b9ffff';c.fillRect(dx,y+142,3,22);c.fillStyle='#3a2a1e';c.fillRect(dx-2,y+164,7,3);c.fillRect(dx,y+167,3,7)}c.fillStyle='#7a2a2a';c.fillRect(x+24,y+178,92,6);c.fillStyle='#d84a5a';c.fillRect(x+30,y+172,6,8);c.fillStyle='#3a8ad8';c.fillRect(x+44,y+172,6,8);c.fillStyle='#d84a5a';c.fillRect(x+58,y+172,6,8);
 c.fillStyle='#2a1a10';c.fillRect(x+140,y+130,52,75);c.fillStyle='#5a3a24';c.fillRect(x+144,y+134,44,71);c.fillStyle='#ffd27a';c.fillRect(x+176,y+168,4,4);
 for(let i=0;i<12;i++){c.fillStyle=i%2?'#e8e2d0':'#1e5a7a';const ax=x-8+i*19;c.beginPath();c.moveTo(ax,y+120);c.lineTo(ax+19,y+120);c.lineTo(ax+19,y+132+Math.sin(t*2+i)*1);c.lineTo(ax,y+132+Math.sin(t*2+i)*1);c.fill()}
 c.fillStyle='#1a1008';c.fillRect(x+W/2-2,y+96,4,10);const sw=Math.sin(t*1.6)*.12;c.save();c.translate(x+W/2,y+106);c.rotate(sw);c.fillStyle='#3a2416';c.fillRect(-46,0,92,24);c.fillStyle='#d8b46a';c.fillRect(-43,3,86,18);c.fillStyle='#2a1a10';c.font='bold 12px monospace';c.textAlign='center';c.fillText('⚔ ARMAS',0,16);c.textAlign='left';c.restore();
 for(const lx of [x+4,x+W-10]){c.fillStyle='#1a1008';c.fillRect(lx,y+124,6,8);c.fillStyle='#ffb347';c.fillRect(lx-1,y+132,8,10);c.save();c.globalCompositeOperation='lighter';const lg=c.createRadialGradient(lx+3,y+137,1,lx+3,y+137,40);lg.addColorStop(0,`rgba(255,180,80,${.5+.15*Math.sin(t*6+lx)})`);lg.addColorStop(1,'rgba(255,180,80,0)');c.fillStyle=lg;c.beginPath();c.arc(lx+3,y+137,40,0,7);c.fill();c.restore()}
 // crates, barrels, weapon rack and counter in front
 c.fillStyle='#6a4a2a';c.fillRect(x-30,y+170,30,30);c.fillStyle='#8a6a3a';c.fillRect(x-30,y+170,30,3);c.fillStyle='#4a321c';c.fillRect(x-30,y+184,30,2);c.fillRect(x-16,y+170,2,30);
 c.fillStyle='#5a3a22';c.fillRect(x+W+4,y+160,26,40);c.fillStyle='#3a2a1a';c.fillRect(x+W+4,y+168,26,3);c.fillRect(x+W+4,y+188,26,3);
 c.fillStyle='#3a2416';c.fillRect(x+W+40,y+150,4,52);c.fillRect(x+W+70,y+150,4,52);c.fillRect(x+W+38,y+156,38,4);for(let i=0;i<3;i++){c.fillStyle='#c9d4dc';c.fillRect(x+W+46+i*9,y+138,3,44)}
 c.fillStyle='#4a2e1a';c.fillRect(x+40,y+222,130,18);c.fillStyle='#7a5432';c.fillRect(x+36,y+218,138,6);c.fillStyle='#e05a6a';c.fillRect(x+60,y+210,8,10);c.fillStyle='#4aa8e8';c.fillRect(x+74,y+210,8,10);c.fillStyle='#d8b46a';c.fillRect(x+130,y+212,18,6);
}
clinic(c,x,y,t){
 const W=210,H=205;c.fillStyle='#0008';c.fillRect(x-6,y+H-4,W+12,12);
 c.fillStyle='#2a4a52';c.fillRect(x-8,y,W+16,58);c.fillStyle='#3a6a74';c.fillRect(x-8,y,W+16,6);for(let i=x;i<x+W;i+=20){c.fillStyle='#24424a';c.fillRect(i,y+8,2,48)}
 c.fillStyle='#e8f0f0';c.fillRect(x,y+58,W,H-58);c.fillStyle='#c8d6d8';c.fillRect(x,y+58,W,6);c.fillStyle='#9ab4b8';for(const wx of [x+20,x+130]){c.fillRect(wx,y+76,60,44);c.fillStyle='#bff0f4';c.fillRect(wx+3,y+79,54,38);c.fillStyle='#9ab4b8'}
 c.fillStyle='#7ad8e0';c.fillRect(x+80,y+130,50,75);c.fillStyle='#d8fbff';c.fillRect(x+84,y+134,42,71);c.fillStyle='#4aa8b0';c.fillRect(x+104,y+134,2,71);
 const pulse=.6+.4*Math.sin(t*3);c.save();c.translate(x+W/2,y+30);c.fillStyle='#e8fff8';c.fillRect(-22,-22,44,44);c.fillStyle=`rgba(40,220,160,${pulse})`;c.fillRect(-6,-16,12,32);c.fillRect(-16,-6,32,12);c.restore();
 c.fillStyle='#24424a';c.fillRect(x+20,y+150,50,8);c.fillRect(x+140,y+150,50,8);for(let i=0;i<4;i++){c.fillStyle=['#e05a6a','#4aa8e8','#5ad88a','#e0c05a'][i];c.fillRect(x+24+i*11,y+140,6,10);c.fillRect(x+144+i*11,y+140,6,10)}
 c.fillStyle='#2a4a52';c.fillRect(x+40,y+222,130,18);c.fillStyle='#3a7a84';c.fillRect(x+36,y+218,138,6);
}
plazaDetails(c,t){
 for(const [x,y] of [[530,550],[1250,550],[530,855],[1250,855]]){
  c.fillStyle='#19272a';c.fillRect(x-10,y-18,20,36);c.fillStyle='#71807a';c.fillRect(x-8,y-16,16,4);c.fillStyle='#2d3e3b';c.fillRect(x-7,y-12,14,23);
  c.shadowColor='#ffd18a';c.shadowBlur=15;c.fillStyle='#f9af59';c.fillRect(x-4,y-23,8,8);c.fillStyle='#ffebad';c.fillRect(x-2,y-26+Math.sin(t*5+x)*2,4,7);c.shadowBlur=0;
 }
 for(const [x,y] of [[200,830],[1480,830],[250,950],[1420,950]]){
  c.fillStyle='#232d29';c.fillRect(x,y,72,28);c.fillStyle='#516453';c.fillRect(x+3,y+3,66,20);c.fillStyle='#718763';for(let i=0;i<9;i++)c.fillRect(x+7+i*7,y+5+(i%3)*3,4,4);c.fillStyle='#d1ac77';for(let i=0;i<4;i++)c.fillRect(x+10+i*16,y+10,2,2);
 }
 c.strokeStyle='#78928a88';c.lineWidth=2;c.beginPath();c.ellipse(900,710,330,140,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(900,710,315,129,0,0,Math.PI*2);c.stroke();
 // gate alert monitors where the old fixed portals stood
 for(const x of [690,1110]){c.fillStyle='#111a20';c.fillRect(x-4,600,8,70);c.fillStyle='#0a1a26';c.fillRect(x-40,560,80,46);c.strokeStyle='#3fd6ff';c.lineWidth=2;c.strokeRect(x-40,560,80,46);c.fillStyle='#3fd6ff';c.font='bold 9px monospace';c.textAlign='center';c.fillText('GATES',x,574);c.fillStyle='#ffffff';c.fillText(game.gates?String(game.gates.list.length).padStart(2,'0')+' ATIVOS':'--',x,590);c.textAlign='left';c.fillStyle='#ffffff10';for(let i=0;i<46;i+=3)c.fillRect(x-40,560+i,80,1)}
}
fountain(c,x,y,t){c.fillStyle='#0007';c.beginPath();c.ellipse(x,y+26,72,24,0,0,7);c.fill();c.fillStyle='#4a5654';c.beginPath();c.ellipse(x,y+14,66,30,0,0,7);c.fill();c.fillStyle='#1f4c5a';c.beginPath();c.ellipse(x,y+12,58,24,0,0,7);c.fill();c.fillStyle='#3d8a9a';for(let i=0;i<10;i++){c.globalAlpha=.4+.3*Math.sin(t*3+i);c.fillRect(x-48+i*10,y+6+(i%3)*6,6,2)}c.globalAlpha=1;
 c.fillStyle='#6a7472';c.fillRect(x-8,y-30,16,40);c.fillStyle='#8a9492';c.fillRect(x-14,y-34,28,6);c.fillStyle='#bfefff';for(let i=0;i<14;i++){const a=i/14*Math.PI*2,k=(t*1.5+i/14)%1;c.globalAlpha=1-k;c.fillRect(x+Math.cos(a)*30*k,y-34+60*k*k-30*k+Math.sin(a)*10*k,2,3)}c.globalAlpha=1;c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(80,200,255,.12)';c.beginPath();c.ellipse(x,y+12,58,24,0,0,7);c.fill();c.restore()}
stall(c,x,y,color){c.fillStyle='#322d29';c.fillRect(x,y,155,100);c.fillStyle=color;c.fillRect(x-10,y-55,175,55)}
npc(c,x,y,label,look='npc_white',t=0,dir=1){const pl=PEOPLE.special[look.replace('npc_','')];c.save();c.translate(x,y+14);c.fillStyle='#0007';c.beginPath();c.ellipse(0,0,12,4.5,0,0,7);c.fill();if(pl){const p=game.player,d=p&&Math.hypot(p.x-HUB.ox-x,p.y-HUB.oy-y)<160?dirOf(p.x-HUB.ox-x,p.y-HUB.oy-y):2,f=game.sprites.person(pl,d,(d!==2?'talk':'idle')+(Math.floor((t+x*.01)*(d!==2?2.2:1.5))%2));c.drawImage(f,-32,-59)}else{const f=game.sprites.monster(look,Math.floor((t+x*.01)*1.5)%2?'idle1':'idle0');if(dir<0)c.scale(-1,1);c.drawImage(f.img,-f.ax,-f.ay)}c.restore();if(label){c.font='bold 11px monospace';c.textAlign='center';c.fillStyle='#061019cc';const w=label.length*7+12;c.fillRect(x-w/2,y-62,w,15);c.fillStyle='#b9e1e4';c.fillText(label,x,y-51);c.textAlign='left'}}
portal(c,x,y,color,t,s=1,form=1){c.save();c.translate(x,y);c.scale(s*form,s*(.3+.7*form));c.fillStyle='#121b24';c.beginPath();c.ellipse(0,45,66,25,0,0,Math.PI*2);c.fill();c.strokeStyle=color;c.globalAlpha=.4;c.lineWidth=2;c.beginPath();c.ellipse(0,45,62,20,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;
 const g=c.createRadialGradient(0,0,4,0,0,60);g.addColorStop(0,'#ffffff');g.addColorStop(.25,color);g.addColorStop(.7,'#07101b');g.addColorStop(1,'#07101b');c.fillStyle=g;c.beginPath();c.ellipse(0,0,43,63,0,0,Math.PI*2);c.fill();
 c.shadowBlur=25;c.shadowColor=color;c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.ellipse(0,0,45,65,0,0,7);c.stroke();c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,32-i*8,50-i*12,t*.8+i,0,5);c.stroke()}c.shadowBlur=0;
 c.fillStyle=color;for(let i=0;i<18;i++){let a=i*6.28/18+t*.5;c.globalAlpha=.4+(.4*Math.sin(t*2+i));c.fillRect(Math.cos(a)*56,Math.sin(a)*75,3+(i%2)*2,3+(i%2)*2)}
 c.globalAlpha=.6;c.lineWidth=1;for(let i=0;i<8;i++){let a=i*Math.PI/4-t*.15;c.beginPath();c.moveTo(Math.cos(a)*48,45+Math.sin(a)*15);c.lineTo(Math.cos(a)*55,45+Math.sin(a)*19);c.stroke()}c.restore()}
drawDungeonWalls(c){
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
dungeon(c,t,view){
 if(this.theme)DungeonArt.animate(c,this,t,view||{x:0,y:0,w:this.w,h:this.h});
 if(game.chest)this.portal(c,1560,650,'#3bcfff',t)
}
}
// Connected room graph: randomized spanning tree, with fixed entrance and boss rooms.
// =============================================================================================
// Dungeon themes: 3 biomes per rank (18 total), inspired by Solo Leveling arcs. Each theme sets
// its palette, floor / wall / background textures, props (some solid = cover / chokepoints),
// light sources, ambient FX, darkness level, colour tint, terrain hazards and monster pool.
// Low ranks are dark, cold and claustrophobic (no purple, so the shadow army reads instantly);
// high ranks get open, colourful, catastrophic scenery.
// =============================================================================================
const DUNGEON_THEMES={
 E:[
  {id:'metro',name:'ESTAÇÃO DE METRÔ ABANDONADA',short:'METRÔ ABANDONADO',arc:'Arco inicial',desc:'Trilhos enferrujados, vagões tombados como cobertura e luzes fluorescentes piscando.',
   floor:'tile',wall:'tile',bg:'tunnel',pal:{bg:'#0a0e10',f:['#20272a','#323b3e','#434d50','#181e21'],w:['#0b1114','#364245','#6f7f82'],acc:'#7fb8c4',light:'#e6f6ff',deco:'#56656a'},
   decals:['rails','puddle','sign','roots','debris','puddle'],solids:['wagon','wagon','debrispile'],center:'platform',light:'fluor',fx:['mist','drip'],dark:.8,mon:['goblin','wolf']},
  {id:'mine',name:'MINA DE MANA SUBTERRÂNEA',short:'MINA DE MANA',arc:'Cristais de mana',desc:'Cavernas estreitas com cristais azul-ciano, trilhos de mineração e desmoronamentos que criam gargalos.',
   floor:'rock',wall:'rock',bg:'rock',pal:{bg:'#07090c',f:['#1b1d22','#292c33','#383c44','#141619'],w:['#0a0b0e','#2b2e35','#4f5560'],acc:'#4fe3ff',light:'#5fe9ff',deco:'#6b5236'},
   decals:['minerails','pebbles','pebbles','beamfloor'],solids:['crystal','rubble','minecart','crystal'],center:'crystalcore',light:'crystal',fx:['dust'],dark:.82,mon:['goblin','spider']},
  {id:'cartenon',name:'TEMPLO SUBTERRÂNEO DE CARTENON',short:'TEMPLO DE CARTENON',arc:'Dungeon dupla',desc:'Salão colossal e simétrico, tochas de fogo azul, estátuas com instrumentos e o altar central.',
   floor:'marble',wall:'brick',bg:'stone',pal:{bg:'#08090c',f:['#36363a','#47474c','#5a5a5f','#2a2a2e'],w:['#111115','#44444a','#7a7a80'],acc:'#7fc4ff',light:'#6cb8ff',deco:'#8c8c90'},
   decals:['cracks','cracks','rubblefloor'],solids:['statue','statue','column','column'],center:'altar',light:'bluefire',fx:['dust'],dark:.74,mon:['goblin','wolf','spider']}
 ],
 D:[
  {id:'swamp',name:'PÂNTANO DOS HOMENS-LAGARTO',short:'PÂNTANO',arc:'Arco de Hwang Dongsuk',desc:'Ilhotas de lama cercadas por água turva que retarda o movimento. Totens de ossos marcam o território.',
   floor:'mud',wall:'foliage',bg:'swamp',pal:{bg:'#0d1a14',f:['#28281b','#363522','#46432e','#202118'],w:['#0e1811','#22362a','#3d583f'],acc:'#9be07a',light:'#c8f59a',deco:'#5a4a32'},
   decals:['reeds','reeds','pebbles'],solids:['deadtree','deadtree','totem'],center:'bonetotems',hazards:[{kind:'slow',name:'ÁGUA TURVA',mult:.58,color:'#203a26',n:2}],light:'wisp',fx:['mist','bubbles'],dark:.66,tint:['#2f5a2a',.1],mon:['goblin','spider','wolf']},
  {id:'catacombs',name:'CATACUMBAS DO CAVALEIRO CAÍDO',short:'CATACUMBAS',arc:'Emboscadas',desc:'Corredores de tijolos antigos, sarcófagos abertos, crânios empilhados e velas derretidas.',
   floor:'brick',wall:'brick',bg:'stone',pal:{bg:'#0b0a0a',f:['#2a2420','#39312b','#494038','#201b18'],w:['#100d0c','#3d342d','#6e6152'],acc:'#ffcf7a',light:'#ffc46b',deco:'#c9c0a8'},
   decals:['skulls','candles','grate','candles','skulls'],solids:['sarcophagus','sarcophagus','gratewall'],center:'knightgrave',light:'candle',fx:['dust'],dark:.76,mon:['goblin','spider','wolf']},
  {id:'fogforest',name:'RUÍNAS DA FLORESTA DE NEVOEIRO',short:'FLORESTA DE NEVOEIRO',arc:'Ruínas antigas',desc:'Grama alta e seca, pilares cobertos de hera, troncos caídos e círculos de pedras rúnicas apagadas.',
   floor:'grass',wall:'foliage',bg:'forest',pal:{bg:'#0a140e',f:['#26321e','#324128','#3f5233','#1f2919'],w:['#0c160e','#1f3322','#3b5a36'],acc:'#d6e8b0',light:'#e8f0c8',deco:'#6f7a64'},
   decals:['grasstuft','grasstuft','leafpile','grasstuft'],solids:['ivypillar','log','ivypillar'],center:'runestones',light:'shaft',fx:['leaves','mist'],dark:.6,mon:['wolf','goblin']}
 ],
 C:[
  {id:'spiderlair',name:'COVIL DA ARANHA GIGANTE',short:'COVIL DA ARANHA',arc:'Arco de Yoo Jinho',desc:'Teias espessas reduzem a mobilidade fora das trilhas de pedra; poças de ácido envenenam.',
   floor:'web',wall:'organic',bg:'web',pal:{bg:'#0b0c0c',f:['#282928','#363836','#474946','#202120'],w:['#121312','#3c3f3b','#8a8e88'],acc:'#9dff6a',light:'#b8ff8a',deco:'#d8dcd4'},
   decals:['cornerweb','cornerweb','bonesmall'],solids:['cocoon','cocoon','cocoon'],center:'pit',hazards:[{kind:'slow',name:'TEIA',mult:.5,color:'#c9ccc4',n:2,web:true},{kind:'poison',name:'ÁCIDO',color:'#5fd33a',n:1}],light:'acid',fx:['spores'],dark:.62,mon:['spider','spider','orc']},
  {id:'desert',name:'DESERTO DAS CENTOPEIAS GIGANTES',short:'DESERTO',arc:'Zona de penalidade',desc:'Dunas sob céu crepuscular, ossadas pré-históricas e tempestades de areia. Nenhuma sombra.',
   floor:'sand',wall:'dune',bg:'dunes',pal:{bg:'#8a5428',f:['#b07a44','#c08950','#d39c60','#9c6a3a'],w:['#7a4a24','#a8703c','#e2b072'],acc:'#ffd08a',light:'#ffd9a0',deco:'#efe2c8'},
   decals:['ripples','ripples','burrow'],solids:['ribcage','skull','rock'],center:'sinkhole',hazards:[{kind:'slow',name:'AREIA MOVEDIÇA',mult:.72,color:'#a8743f',n:2}],light:'none',fx:['sandstorm','dust'],dark:0,tint:['#ff8a3a',.12],mon:['spider','orc','demon']},
  {id:'sunken',name:'RUÍNAS SUBMERSAS DE MANA',short:'RUÍNAS SUBMERSAS',arc:'Templo inundado',desc:'Passarelas de pedra entre águas azul-profundas, corais bioluminescentes e estátuas de serpentes.',
   floor:'wetstone',wall:'brick',bg:'deepwater',pal:{bg:'#04223a',f:['#283e46','#344f58','#43646e','#1e3239'],w:['#0b1d24','#2f4f58','#6fa2ad'],acc:'#56f0ff',light:'#5ff0e0',deco:'#3fa0a8'},
   decals:['coral','coral','shells'],solids:['serpent','serpent'],center:'fountain',hazards:[{kind:'slow',name:'ÁGUA RASA',mult:.7,color:'#155777',n:2,water:true}],light:'coral',fx:['bubbles','caustics'],dark:.45,mon:['orc','demon','spider']}
 ],
 B:[
  {id:'igris',name:'SALÃO DO TRONO DE IGRIS',short:'SALÃO DO TRONO',arc:'Mudança de classe',desc:'Piso xadrez de mármore, tapete carmesim até o trono vazio, armaduras alinhadas e luar azulado pelos vitrais.',
   floor:'checker',wall:'brick',bg:'stone',pal:{bg:'#060608',f:['#17171b','#c9c6bf','#2a2a30','#aeaaa2'],w:['#0b0b0e','#2c2c33','#5a5a66'],acc:'#ff3048',light:'#9cc0ff',deco:'#a01828'},
   decals:['moonlight','moonlight','cracks'],solids:['armor','armor','armor','armor'],center:'throne',light:'moon',fx:['dust'],dark:.5,mon:['orc','demon']},
  {id:'glacial',name:'FLORESTA GLACIAL DO PORTAL VERMELHO',short:'FLORESTA GLACIAL',arc:'Arco dos elfos de gelo',desc:'Pinheiros cobertos de neve, lagos congelados escorregadios, cristais de gelo e nevasca contínua.',
   floor:'snow',wall:'pines',bg:'snowforest',pal:{bg:'#b8cfd8',f:['#d2e3ea','#e2eef2','#f3f9fb','#bdd2db'],w:['#1d3a3a','#2f5650','#e8f4f6'],acc:'#9be8ff',light:'#d8f6ff',deco:'#7fb6c8'},
   decals:['snowdrift','footprints','snowdrift'],solids:['pine','icecrystal','pine','snowrock'],center:'frozenlake',hazards:[{kind:'ice',name:'GELO',color:'#9fd4ea',n:2}],light:'none',fx:['snow'],dark:0,tint:['#7aa8ff',.08],mon:['bear','wolf']},
  {id:'volcanic',name:'FORTALEZA VULCÂNICA DOS ORCS',short:'FORTALEZA VULCÂNICA',arc:'Rios de lava',desc:'Obsidiana negra cercada por lava incandescente, pontes de correntes e braseiros acesos.',
   floor:'obsidian',wall:'obsidian',bg:'lava',pal:{bg:'#2a0904',f:['#191315','#251f21','#332a2b','#120e0f'],w:['#0a0708','#2a1f20','#6a3a2a'],acc:'#ff6a2a',light:'#ff8a3a',deco:'#4a3a36'},
   decals:['lavacrack','chainfloor','lavacrack'],solids:['brazier','brazier','obsidianspike'],center:'forge',hazards:[{kind:'burn',name:'LAVA',color:'#e2481c',n:1,lava:true}],light:'brazier',fx:['embers','smoke'],dark:.35,tint:['#ff4a1a',.08],mon:['orc','orc','demon']}
 ],
 A:[
  {id:'kargalgan',name:'CIDADELA DOS ALTOS ORCS',short:'CIDADELA DOS ORCS',arc:'Arco de Kargalgan',desc:'Coliseu de rocha avermelhada, estandartes tribais, totens xamânicos e círculos mágicos pulsantes.',
   floor:'redrock',wall:'rock',bg:'canyon',pal:{bg:'#1e0c08',f:['#56281c','#683222','#7a3e2c','#462016'],w:['#1e0c08','#5a2a1e','#a05a3a'],acc:'#b36bff',light:'#c48aff',deco:'#e0b070'},
   decals:['tribal','magiccircle','tribal'],solids:['shamantotem','pillar','pillar'],center:'arena',light:'rune',fx:['dust','embers'],dark:.4,mon:['orc','orc','demon']},
  {id:'burningcity',name:'CASTELO DEMONÍACO · CIDADE EM CHAMAS',short:'CIDADE EM CHAMAS',arc:'Andares inferiores',desc:'Metrópole em ruínas sob céu vermelho-sangue, carros carbonizados, fogo nas rachaduras e cinzas caindo.',
   floor:'asphalt',wall:'ruin',bg:'ruins',pal:{bg:'#1a0606',f:['#232020','#2e2a28','#3a3432','#1a1716'],w:['#100a0a','#3a2c28','#6a5048'],acc:'#ff6a2a',light:'#ff7a3a',deco:'#141010'},
   decals:['lane','crack','crack','scorch'],solids:['burntcar','burntcar','lamp','rubble'],center:'crater',hazards:[{kind:'burn',name:'FOGO',color:'#ff5a1a',n:1,fire:true}],light:'fire',fx:['ash','embers','smoke'],dark:.38,tint:['#c41a10',.14],mon:['demon','orc']},
  {id:'baran',name:'TOPO DA TORRE DEMONÍACA',short:'ARENA DE BARAN',arc:'Arena de Baran',desc:'Terraço do 100º andar: runas demoníacas, nuvens roxas, vento forte e relâmpagos.',
   floor:'runestone',wall:'parapet',bg:'sky',pal:{bg:'#0e0618',f:['#25212b','#2f2a36','#3b3543','#1d1922'],w:['#0a080d','#2f2a36','#6a6078'],acc:'#ff4060',light:'#ff5a7a',deco:'#c02040'},
   decals:['runes','debrisfloor','runes'],solids:['brokenpillar','brokenpillar'],center:'demonsigil',light:'rune',fx:['lightning','wind'],dark:.42,mon:['demon','demon','orc']}
 ],
 S:[
  {id:'jeju',name:'COLMEIA SUBTERRÂNEA DA ILHA JEJU',short:'COLMEIA DE JEJU',arc:'Arco de Beru',desc:'Cavernas de quitina com secreções roxas, pilares biológicos, ovos e luz bioluminescente.',
   floor:'chitin',wall:'organic',bg:'hive',pal:{bg:'#12060e',f:['#29131f','#381b2b','#482536','#1f0f19'],w:['#12060e','#3a1c2c','#7a3a5a'],acc:'#d06aff',light:'#c070ff',deco:'#e8d0a0'},
   decals:['shells','tunnel','shells'],solids:['eggs','biopillar','eggs'],center:'queenpit',hazards:[{kind:'poison',name:'SECREÇÃO',color:'#8a2a6a',n:1}],light:'bio',fx:['spores','mist'],dark:.6,mon:['spider','demon']},
  {id:'tokyo',name:'PORTÃO GIGANTE DE TÓQUIO',short:'PORTÃO DE TÓQUIO',arc:'Arco dos gigantes',desc:'Avenida devastada em escala titânica: cratera, pontes colapsadas e pegadas colossais no asfalto.',
   floor:'asphalt',wall:'ruin',bg:'ruins2',pal:{bg:'#14161a',f:['#323438','#3e4044','#4a4c50','#282a2e'],w:['#121316','#3a3c40','#7a7c80'],acc:'#ffd27a',light:'#ffe2a0',deco:'#d0b070'},
   decals:['lane','footprint','crack'],solids:['rubble','burntcar','rubble'],center:'giantcrater',light:'godray',fx:['dust'],dark:.12,tint:['#ffd27a',.05],mon:['bear','orc','demon']},
  {id:'rift',name:'FENDA DIMENSIONAL · GUERRA DOS MONARCAS',short:'FENDA DIMENSIONAL',arc:'Arco final',desc:'A realidade se fragmenta: terra rachada por energia sombria de um lado, ilhas astrais cristalinas do outro.',
   floor:'cracked',wall:'void',bg:'void',split:{f:['#2b3550','#384466','#4a587c','#212a40'],acc:'#ffd27a'},pal:{bg:'#03020a',f:['#29232f','#35303f','#423b4d','#1e1925'],w:['#03020a','#3a2a5a','#a07aff'],acc:'#a855f7',light:'#ffd27a',deco:'#7ad8ff'},
   decals:['energycrack','energycrack','floatrock'],solids:['astralcrystal','astralcrystal'],center:'riftcore',light:'rift',fx:['shock','stars'],dark:.35,mon:['demon','orc','bear']}
 ]
};
const ALL_THEMES=Object.values(DUNGEON_THEMES).flat();
// Fog-of-war mist colour per map [near, far]. Early ranks use neutral grey / green / amber so the
// shadow army (black + neon blue/purple) stays the only purple thing on screen.
{const FOG={metro:['#2c3438','#151a1c'],mine:['#1f3238','#0f181b'],cartenon:['#2a3040','#14171f'],swamp:['#2c4030','#141e17'],catacombs:['#3a3028','#1a1612'],fogforest:['#3c4438','#1c2019'],
 spiderlair:['#2c3826','#141a12'],desert:['#6a4424','#3a2412'],sunken:['#14405a','#08202e'],igris:['#3a1a22','#1a0a10'],glacial:['#6a8a9a','#3a4e58'],volcanic:['#4a1c10','#220c06'],
 kargalgan:['#4a2018','#22100c'],burningcity:['#4a1410','#200806'],baran:['#3a1e4a','#1a0e24'],jeju:['#3a1a3a','#1a0a1a'],tokyo:['#4a4434','#22201a'],rift:['#3a2a66','#1d1638']};
 for(const t of ALL_THEMES)t.fog=FOG[t.id]}
const themeById=id=>ALL_THEMES.find(t=>t.id===id)||null;
const pickTheme=rank=>{const l=DUNGEON_THEMES[rank]||DUNGEON_THEMES.E;return l[Math.floor(Math.random()*l.length)]};
const seededRandom=s=>()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
// Solid props never enter the "cross" that links every doorway to the room centre, nor the entrance
// spawn or the boss/chest area, so every room stays fully traversable.
const ROOM_SLOTS=[[30,24,110,52],[280,24,110,52],[30,204,110,54],[280,204,110,54]];

const DungeonArt={
 glowCache:new Map(),
 // Additive radial glow sprite, cached per colour (cheap to stamp every frame).
 glow(col){let g=this.glowCache.get(col);if(g)return g;g=document.createElement('canvas');g.width=g.height=64;const x=g.getContext('2d'),r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,col);r.addColorStop(.35,col+'88');r.addColorStop(1,col+'00');x.fillStyle=r;x.fillRect(0,0,64,64);this.glowCache.set(col,g);return g},
 // ---- Floor tiles (64x64, seamless) ---------------------------------------------------------
 tile(th,alt){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const [a,b,l,d]=alt?alt.f:th.pal.f,acc=alt?alt.acc:th.pal.acc,deco=th.pal.deco,H=(i,j)=>hash2(i*31+7,j*17+3);
  const R=(X,Y,w,h,col,al=1)=>{x.globalAlpha=al;x.fillStyle=col;x.fillRect(X,Y,w,h);x.globalAlpha=1};
  const noise=(n,cols,sz=2,al=.5,s=1)=>{for(let i=0;i<n;i++)R(Math.floor(H(i,s)*62),Math.floor(H(s,i)*62),sz,sz,cols[i%cols.length],al)};
  const line=(pts,col,w=1,al=1)=>{x.globalAlpha=al;x.strokeStyle=col;x.lineWidth=w;x.beginPath();pts.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.stroke();x.globalAlpha=1};
  R(0,0,64,64,a);
  switch(th.floor){
   case 'tile':for(let i=0;i<4;i++)for(let j=0;j<4;j++){const k=H(i,j);R(i*16+1,j*16+1,14,14,k<.12?a:k<.6?b:l);R(i*16+1,j*16+1,14,1,l,.5);R(i*16+1,j*16+14,14,1,d)}line([[18,20],[26,27],[24,34],[31,40]],d,1,.9);noise(16,[d,'#3e4a3a'],1,.6,4);break;
   case 'rock':noise(40,[b,l,d],5,.55,1);noise(30,[b,d],3,.7,2);line([[0,40],[14,36],[22,44],[40,40],[64,46]],d,1,.8);line([[30,0],[34,14],[28,22]],d,1,.7);noise(12,[l],1,.8,3);break;
   case 'marble':for(let i=0;i<2;i++)for(let j=0;j<2;j++){R(i*32+1,j*32+1,30,30,(i+j)%2?b:l);R(i*32+1,j*32+1,30,1,'#ffffff',.08)}R(0,31,64,2,d);R(31,0,2,64,d);line([[4,6],[14,18],[12,26],[22,30]],l,1,.35);line([[38,40],[50,46],[60,58]],a,1,.4);line([[40,4],[46,12]],d,1,.7);break;
   case 'mud':noise(26,[b,l],7,.5,1);noise(18,[d],6,.7,2);noise(20,['#5a5040','#3a3426'],2,.8,3);R(10,44,12,4,'#1a1a12',.6);break;
   case 'brick':for(let row=0;row<4;row++)for(let col=-1;col<3;col++){const px=col*32+(row%2)*16,py=row*16;R(px+1,py+1,30,14,b);R(px+2,py+2,26,1,l);R(px+2,py+3,1,8,l);R(px+2,py+12,27,2,d);R(px+28,py+4,2,8,d)}noise(10,[deco],1,.25,5);break;
   case 'grass':noise(28,[b,d],6,.5,1);for(let i=0;i<70;i++){const X=Math.floor(H(i,9)*63),Y=Math.floor(H(9,i)*60);R(X,Y,1,3+((i*7)%3),i%3?l:b,.85)}noise(6,['#8a8a5a'],2,.5,6);break;
   case 'web':noise(36,[b,l,d],4,.5,1);line([[0,0],[64,64]],deco,1,.18);line([[64,0],[0,64]],deco,1,.18);line([[32,0],[32,64]],deco,1,.12);for(const r of [10,20,30])line([[32-r,32],[32,32-r],[32+r,32],[32,32+r],[32-r,32]],deco,1,.12);break;
   case 'sand':noise(80,[l,d],1,.5,1);for(let j=0;j<4;j++)line([[0,8+j*16],[16,6+j*16],[32,9+j*16],[48,7+j*16],[64,8+j*16]],j%2?l:d,1,.45);noise(6,[deco],1,.6,4);break;
   case 'wetstone':for(let row=0;row<4;row++)for(let col=-1;col<3;col++){const px=col*32+(row%2)*16,py=row*16;R(px+1,py+1,30,14,(row+col)%3?b:l);R(px+1,py+14,30,1,d)}noise(10,[acc],3,.12,2);noise(14,['#2f6a50'],2,.5,3);break;
   case 'checker':for(let i=0;i<2;i++)for(let j=0;j<2;j++){const dark=(i+j)%2===0;R(i*32,j*32,32,32,dark?a:b);R(i*32,j*32,32,1,dark?l:'#ffffff',.25);R(i*32,j*32+31,32,1,dark?'#000':d,.5)}line([[40,6],[44,14],[42,20]],d,1,.6);break;
   case 'snow':R(0,0,64,64,b);noise(40,[l,d],3,.5,1);noise(20,['#ffffff'],1,.9,2);noise(4,[acc],1,.8,3);break;
   case 'obsidian':noise(24,[b,l],6,.5,1);for(let i=0;i<6;i++){const X=H(i,4)*60,Y=H(4,i)*60;line([[X,Y],[X+6,Y+3],[X+3,Y+8]],l,1,.5)}line([[0,50],[18,46],[26,54],[44,50],[64,52]],acc,1,.45);line([[0,51],[18,47]],'#ffd27a',1,.25);break;
   case 'redrock':for(let i=0;i<2;i++)for(let j=0;j<2;j++){R(i*32+1+(j%2)*0,j*32+1,30,30,(i+j)%2?b:l,.9);R(i*32+1,j*32+1,30,2,'#ffffff',.06)}R(0,31,64,2,d);R(31,0,2,64,d);noise(20,[d,'#9a5a3a'],2,.6,3);break;
   case 'asphalt':R(0,0,64,64,b);noise(120,[a,l,d],1,.6,1);noise(10,[l],2,.3,2);line([[0,22],[10,26],[18,24],[30,30]],a,1,.9);break;
   case 'runestone':for(let i=0;i<2;i++)for(let j=0;j<2;j++){R(i*32+1,j*32+1,30,30,(i+j)%2?b:l)}R(0,31,64,2,d);R(31,0,2,64,d);line([[12,10],[16,18],[20,10]],acc,1,.22);line([[44,42],[52,42],[48,50],[44,42]],acc,1,.22);noise(14,[d],1,.6,4);break;
   case 'chitin':for(let row=0;row<5;row++)for(let col=-1;col<5;col++){const px=col*16+(row%2)*8,py=row*13;R(px+1,py+1,14,11,(row+col)%3?b:l);R(px+2,py+1,10,1,'#ffffff',.08);R(px+1,py+11,14,1,d)}noise(8,[acc],2,.15,2);break;
   case 'cracked':noise(30,[b,l,d],5,.5,1);line([[0,30],[12,26],[20,34],[34,30],[46,38],[64,32]],acc,2,.55);line([[20,34],[24,48],[18,64]],acc,1,.45);line([[34,30],[38,12],[44,0]],acc,1,.4);line([[0,30],[12,26]],'#ffffff',1,.15);break;
  }
  return c},
 // ---- Background (outside the carved rooms) ---------------------------------------------------
 bg(c,w,th,R){const W=w.w,H=w.h,P=th.pal;c.fillStyle=P.bg;c.fillRect(0,0,W,H);
  const dots=(n,cols,s1,s2,al)=>{for(let i=0;i<n;i++){c.globalAlpha=al;c.fillStyle=cols[i%cols.length];const s=s1+R()*(s2-s1);c.fillRect(R()*W,R()*H,s,s*(.5+R()*.6))}c.globalAlpha=1};
  const blobs=(n,cols,r1,r2,al)=>{for(let i=0;i<n;i++){c.globalAlpha=al;c.fillStyle=cols[i%cols.length];c.beginPath();c.ellipse(R()*W,R()*H,r1+R()*(r2-r1),(r1+R()*(r2-r1))*.6,R()*3,0,7);c.fill()}c.globalAlpha=1};
  switch(th.bg){
   case 'tunnel':dots(900,['#141a1d','#06090a'],3,9,.8);c.globalAlpha=.25;c.strokeStyle='#2a3236';for(let y=0;y<H;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}c.globalAlpha=1;break;
   case 'rock':case 'stone':blobs(260,['#12151a','#05060a','#191b20'],10,40,.7);dots(500,['#1e2126'],2,4,.6);break;
   case 'canyon':blobs(240,['#2e130c','#120604','#3e1c12'],14,50,.8);dots(300,['#5a2a1a'],2,5,.5);break;
   case 'swamp':c.fillStyle='#14251b';c.fillRect(0,0,W,H);blobs(160,['#1a3022','#0c1810'],20,60,.7);c.strokeStyle='#3a5a42';c.globalAlpha=.35;for(let i=0;i<220;i++){const x=R()*W,y=R()*H;c.beginPath();c.ellipse(x,y,8+R()*14,3+R()*4,0,0,7);c.stroke()}c.globalAlpha=1;dots(160,['#2e4a24','#4a6a30'],3,7,.8);break;
   case 'deepwater':{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#05345a');g.addColorStop(1,'#031c33');c.fillStyle=g;c.fillRect(0,0,W,H);blobs(140,['#0a4a70','#021626'],20,70,.5);c.strokeStyle='#4ab8d8';c.globalAlpha=.18;for(let i=0;i<260;i++){const x=R()*W,y=R()*H;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+10,y-4,x+22,y);c.stroke()}c.globalAlpha=1;break}
   case 'lava':{c.fillStyle='#5a1404';c.fillRect(0,0,W,H);for(let i=0;i<70;i++){c.strokeStyle=i%3?'#ff5a14':'#ffb03a';c.globalAlpha=.55;c.lineWidth=3+R()*6;c.beginPath();let x=R()*W,y=R()*H;c.moveTo(x,y);for(let k=0;k<5;k++){x+=R()*120-60;y+=R()*80-20;c.lineTo(x,y)}c.stroke()}c.globalAlpha=1;blobs(220,['#1e0806','#2e0e08'],12,36,.85);c.lineWidth=1;break}
   case 'dunes':{const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#c08048');g.addColorStop(1,'#8a5226');c.fillStyle=g;c.fillRect(0,0,W,H);for(let i=0;i<90;i++){const x=R()*W,y=R()*H,r=60+R()*120;c.globalAlpha=.25;c.fillStyle='#e0a868';c.beginPath();c.ellipse(x,y,r,r*.35,-.2,Math.PI,0);c.fill();c.fillStyle='#6e3e1c';c.beginPath();c.ellipse(x,y,r,r*.3,-.2,0,Math.PI);c.fill()}c.globalAlpha=1;break}
   case 'snowforest':c.fillStyle='#dce9ee';c.fillRect(0,0,W,H);dots(400,['#c3d6de','#ffffff'],3,10,.7);for(let y=-20;y<H+40;y+=46)for(let x=-20;x<W+40;x+=40){const k=hash2(x,y);if(k<.35)continue;this.pine(c,x+k*24,y+hash2(y,x)*20,.8+k*.5)}break;
   case 'forest':blobs(260,['#142a18','#0a180c','#1e3a20'],20,46,.9);for(let i=0;i<160;i++){const x=R()*W,y=R()*H;c.fillStyle='#050a06';c.globalAlpha=.5;c.beginPath();c.arc(x+6,y+8,18,0,7);c.fill();c.globalAlpha=1;c.fillStyle=['#1c3a1e','#2a4a26','#163018'][i%3];c.beginPath();c.arc(x,y,16+R()*10,0,7);c.fill();c.fillStyle='#3e6a34';c.globalAlpha=.5;c.beginPath();c.arc(x-4,y-5,7,0,7);c.fill();c.globalAlpha=1}break;
   case 'web':blobs(200,['#101110','#050505'],14,44,.8);c.strokeStyle='#cfd2ca';for(let i=0;i<40;i++){const x=R()*W,y=R()*H,r=30+R()*50;c.globalAlpha=.12;for(let k=0;k<8;k++){const a=k*Math.PI/4;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);c.stroke()}for(let q=1;q<4;q++){c.beginPath();for(let k=0;k<=8;k++){const a=k*Math.PI/4,rr=r*q/4;k?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+rr,y)}c.stroke()}}c.globalAlpha=1;break;
   case 'void':dots(700,['#ffffff','#b48aff','#7ad8ff'],1,2,.8);for(let i=0;i<14;i++){const x=R()*W,y=R()*H,r=90+R()*160,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'#5a2aa044':'#c08a3044');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}break;
   case 'sky':blobs(120,['#2a1240','#1a0a2a','#3a1a50'],40,110,.75);blobs(60,['#4a2a6a'],30,70,.35);for(let i=0;i<120;i++){c.fillStyle=i%3?'#ff7a3a':'#ffb05a';c.globalAlpha=.25;c.fillRect(R()*W,R()*H,2,2)}c.globalAlpha=1;break;
   case 'ruins':case 'ruins2':{const red=th.bg==='ruins';blobs(200,red?['#2a0e0c','#120606']:['#1e2024','#0c0d10'],14,40,.8);for(let i=0;i<70;i++){const x=R()*W,y=R()*H,bw=40+R()*90,bh=30+R()*60;c.fillStyle=red?'#1a0c0c':'#1a1c20';c.fillRect(x,y,bw,bh);c.fillStyle=red?'#2a1614':'#2a2c30';c.fillRect(x+3,y+3,bw-6,bh-6);for(let wy=y+8;wy<y+bh-8;wy+=12)for(let wx=x+8;wx<x+bw-8;wx+=12){c.fillStyle=red&&R()<.25?'#ff6a2a':'#08090b';c.fillRect(wx,wy,5,6)}}break}
   case 'hive':blobs(220,['#2a0e20','#0c0408','#3a1630'],14,46,.85);for(let i=0;i<120;i++){const x=R()*W,y=R()*H,r=6+R()*12;c.fillStyle='#050103';c.beginPath();c.ellipse(x,y,r,r*.7,0,0,7);c.fill();c.strokeStyle='#6a2a50';c.globalAlpha=.6;c.stroke();c.globalAlpha=1}break;
  }},
 // ---- Walls along the carved perimeter --------------------------------------------------------
 walls(c,w,th){const [dark,mid,light]=th.pal.w,st=th.wall,out=(x,y)=>!w.walkable.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
  const seg=(x,y,ww,hh,side,i)=>{const k=hash2(Math.round(x),Math.round(y));
   if(st==='foliage'||st==='pines'){c.fillStyle=dark;c.fillRect(x,y,ww,hh);if(i%2===0){const cx=x+ww/2+(side==='l'?-8:side==='r'?8:0),cy=y+hh/2+(side==='t'?-10:side==='b'?6:0);if(st==='pines')this.pine(c,cx,cy+8,.7+k*.3);else{c.fillStyle=mid;c.beginPath();c.arc(cx,cy,12+k*6,0,7);c.fill();c.fillStyle=light;c.globalAlpha=.6;c.beginPath();c.arc(cx-3,cy-4,6,0,7);c.fill();c.globalAlpha=1}}return}
   if(st==='rock'||st==='organic'||st==='dune'||st==='ruin'){c.fillStyle=dark;c.fillRect(x,y,ww,hh);const bx=x+ww/2,by=y+hh/2,r=7+k*7;c.fillStyle=mid;c.beginPath();st==='ruin'?c.rect(bx-r,by-r*.8,r*2,r*1.4):c.ellipse(bx,by+(side==='t'?-3:0),r,r*.8,0,0,7);c.fill();c.fillStyle=light;c.globalAlpha=st==='organic'?.5:.35;c.beginPath();c.ellipse(bx-2,by-3,r*.5,r*.3,0,0,7);c.fill();c.globalAlpha=1;if(st==='ruin'&&k>.7){c.fillStyle='#4a4a4a';c.fillRect(bx-1,by-r,2,r)}return}
   if(st==='void'){c.fillStyle=light;c.globalAlpha=.55;c.fillRect(x,y,ww,hh);c.globalAlpha=1;c.fillStyle=mid;c.fillRect(x+(side==='l'?ww-3:0),y+(side==='t'?hh-3:0),side==='l'||side==='r'?3:ww,side==='t'||side==='b'?3:hh);return}
   c.fillStyle=dark;c.fillRect(x,y,ww,hh);c.fillStyle=mid;c.fillRect(x+1,y+1,ww-2,hh-2);c.fillStyle=light;c.fillRect(x+2,y+1,side==='l'||side==='r'?1:ww-4,side==='l'||side==='r'?hh-2:2);
   if(st==='tile'&&side==='t'){c.fillStyle=th.pal.acc;c.globalAlpha=.35;c.fillRect(x,y+6,ww,2);c.globalAlpha=1}
   if(st==='parapet'&&side==='t'&&i%2===0){c.fillStyle=mid;c.fillRect(x+2,y-8,ww-4,8);c.fillStyle=light;c.fillRect(x+3,y-8,ww-6,2)}
   if(st==='obsidian'&&i%3===0){c.fillStyle=light;c.globalAlpha=.5;c.beginPath();c.moveTo(x+4,y+hh);c.lineTo(x+8,y-6);c.lineTo(x+12,y+hh);c.fill();c.globalAlpha=1}};
  for(const r of w.walkable){let i=0;
   for(let p=r.x;p<r.x+r.w;p+=16,i++){const ww=Math.min(16,r.x+r.w-p),mx=p+ww/2;if(out(mx,r.y-2))seg(p,r.y-12,ww,16,'t',i);if(out(mx,r.y+r.h+2))seg(p,r.y+r.h-3,ww,10,'b',i)}
   i=0;for(let p=r.y;p<r.y+r.h;p+=16,i++){const hh=Math.min(16,r.y+r.h-p),my=p+hh/2;if(out(r.x-2,my))seg(r.x-7,p,10,hh,'l',i);if(out(r.x+r.w+2,my))seg(r.x+r.w-3,p,10,hh,'r',i)}}},
 pine(c,x,y,s=1){c.fillStyle='#0c1a18';c.globalAlpha=.35;c.beginPath();c.ellipse(x+4,y+4,12*s,5*s,0,0,7);c.fill();c.globalAlpha=1;c.fillStyle='#3a2a1e';c.fillRect(x-2*s,y-6*s,4*s,8*s);for(let k=0;k<3;k++){const yy=y-8*s-k*9*s,ww=(16-k*4)*s;c.fillStyle=k%2?'#24463e':'#1d3a34';c.beginPath();c.moveTo(x-ww,yy);c.lineTo(x,yy-12*s);c.lineTo(x+ww,yy);c.fill();c.fillStyle='#f2f8fa';c.beginPath();c.moveTo(x-ww*.7,yy-3*s);c.lineTo(x,yy-12*s);c.lineTo(x+ww*.6,yy-4*s);c.fill()}},
 // ---- Layout: hazards, decals, solid props and lights for every room ---------------------------
 layout(w,th,R){w.zones=[];w.props=[];w.solids=[];w.lights=[];const rooms=w.rooms;
  const addLight=(x,y,r,col,f=1)=>w.lights.push({x,y,r,c:col,f,seed:R()*6});
  rooms.forEach((room,i)=>{const entrance=i===3,boss=i===5,L=(lx,ly)=>({x:room.x+lx,y:room.y+ly});
   // wall lights along the top edge
   const lt=th.light;if(lt!=='none'&&lt!=='shaft'&&lt!=='godray')for(const lx of [62,166,254,358]){const p=L(lx,10);w.props.push({k:'walllight',x:p.x,y:p.y,lt});addLight(p.x,p.y+18,lt==='candle'?120:lt==='fluor'?190:160,th.pal.light,lt==='fluor'?2:1)}
   if(lt==='shaft'||lt==='godray')for(let n=0;n<2;n++){const p=L(70+R()*280,60+R()*160);w.props.push({k:'shaft',x:p.x,y:p.y,gold:lt==='godray'});addLight(p.x,p.y,170,th.pal.light,0)}
   if(lt==='moon')for(const lx of [100,320]){const p=L(lx,140);addLight(p.x,p.y,150,th.pal.light,0)}
   // terrain hazards (never in the entrance room, never on the boss / chest / portal spot)
   if(!entrance&&th.hazards)for(const hz of th.hazards)for(let n=0;n<hz.n;n++){for(let t=0;t<12;t++){const rx=hz.lava||hz.fire?34+R()*26:44+R()*40,ry=rx*(.45+R()*.25),p=L(rx+16+R()*(room.w-rx*2-32),ry+30+R()*(room.h-ry*2-50));
     if(boss&&Math.hypot(p.x-room.cx,p.y-room.cy)<rx+110)continue;if(w.zones.some(z=>Math.hypot(z.x-p.x,z.y-p.y)<z.rx+rx))continue;
     w.zones.push({...hz,x:p.x,y:p.y,rx,ry,seed:R()*9});if(hz.kind==='burn')addLight(p.x,p.y,rx+70,hz.color,1);if(hz.kind==='poison')addLight(p.x,p.y,rx+30,hz.color,0);break}}
   // flat decals (purely visual)
   const nd=entrance?3:5;for(let n=0;n<nd;n++){const k=th.decals[(n+i)%th.decals.length],p=L(30+R()*(room.w-60),40+R()*(room.h-70));w.props.push({k,x:p.x,y:p.y,s:.8+R()*.5,v:R(),room:i})}
   // solid props in the four corner slots
   const ns=entrance?0:boss?2:Math.min(th.solids.length,2+Math.floor(R()*2)),slots=[0,1,2,3].sort(()=>R()-.5);
   for(let n=0;n<ns;n++){const sl=ROOM_SLOTS[slots[n]],k=th.solids[(n+i)%th.solids.length],p=L(sl[0]+20+R()*(sl[2]-40),sl[1]+16+R()*(sl[3]-28));
    const sz=PROP_SIZE[k]||[24,18];w.props.push({k,x:p.x,y:p.y,v:R(),solid:true});w.solids.push({x:p.x-sz[0]/2,y:p.y-sz[1]/2,w:sz[0],h:sz[1],k});
    if(PROP_LIGHT[k])addLight(p.x,p.y-10,PROP_LIGHT[k],th.pal.light,k==='brazier'?1:0)}
  });
  // centrepieces: boss room (and the hub room in the middle of the map)
  for(const i of [5,4]){const r=rooms[i];w.props.push({k:th.center,x:r.cx,y:r.cy,center:true,main:i===5});if(i===5)addLight(r.cx,r.cy,180,th.pal.acc,0)}
  if(th.id==='igris')for(const r of rooms)w.props.push({k:'carpet',x:r.cx,y:r.cy,h:r.h-6});
  // long rails through the horizontal corridors for the metro / mine
  if(th.id==='metro'||th.id==='mine')for(const cr of w.corridors)if(cr.h===110)w.props.push({k:'corridorrails',x:cr.x,y:cr.y+55,w:cr.w});
  w.props.sort((a,b)=>(a.solid?1:0)-(b.solid?1:0)||a.y-b.y)},
 // ---- Static bake: background, floor, hazards, decals, walls, solid props ----------------------
 bake(w){const th=w.theme,R=seededRandom(w.seed),cv=document.createElement('canvas');cv.width=w.w;cv.height=w.h;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  this.bg(c,w,th,R);
  const pat=c.createPattern(w.tile,'repeat'),pat2=th.split?c.createPattern(this.tile(th,th.split),'repeat'):null;
  for(const r of w.walkable){c.fillStyle=pat;c.fillRect(r.x,r.y,r.w,r.h);if(pat2&&r.x+r.w>w.w/2){const x0=Math.max(r.x,w.w/2);c.fillStyle=pat2;c.fillRect(x0,r.y,r.x+r.w-x0,r.h)}}
  // subtle vignette inside each room (corners darker) gives depth to flat tiles
  for(const r of w.rooms){const g=c.createRadialGradient(r.cx,r.cy,40,r.cx,r.cy,Math.max(r.w,r.h)*.62);g.addColorStop(0,'#00000000');g.addColorStop(1,'#00000055');c.fillStyle=g;c.fillRect(r.x,r.y,r.w,r.h)}
  for(const z of w.zones)this.zoneBase(c,z,th);
  for(const p of w.props)if(!p.solid&&!p.dead)this.prop(c,p,th,R);
  this.walls(c,w,th);
  for(const p of w.props)if(p.solid&&!p.dead)this.prop(c,p,th,R);
  // pilares quebráveis: rachaduras mostram o dano acumulado antes de desabar
  const brk=(typeof game!=='undefined'&&game.breakables)||[];for(const b of brk){if(b.hp>=b.maxhp)continue;const cx=b.x+b.w/2,cy=b.y+b.h/2;c.save();c.globalAlpha=.7;c.strokeStyle='#1a0f08';c.lineWidth=1.5;const k=1-b.hp/b.maxhp;c.beginPath();c.moveTo(cx-8,cy-14*k);c.lineTo(cx+3,cy-4);c.lineTo(cx-4,cy+8*k);c.stroke();c.restore()}
  return cv},
 zoneBase(c,z,th){c.save();c.translate(z.x,z.y);const k=z.kind;
  const blob=(rx,ry,col,al)=>{c.globalAlpha=al;c.fillStyle=col;c.beginPath();for(let i=0;i<=16;i++){const a=i/16*Math.PI*2,j=.85+.15*Math.sin(a*3+z.seed);i?c.lineTo(Math.cos(a)*rx*j,Math.sin(a)*ry*j):c.moveTo(rx*j,0)}c.closePath();c.fill();c.globalAlpha=1};
  if(k==='slow'&&z.web){c.strokeStyle='#d8dcd4';c.globalAlpha=.55;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*z.rx,Math.sin(a)*z.ry);c.stroke()}for(let q=1;q<=4;q++){c.beginPath();for(let i=0;i<=10;i++){const a=i/10*Math.PI*2;i?c.lineTo(Math.cos(a)*z.rx*q/4,Math.sin(a)*z.ry*q/4):c.moveTo(z.rx*q/4,0)}c.stroke()}c.globalAlpha=.18;c.fillStyle='#e8ece4';c.beginPath();c.ellipse(0,0,z.rx,z.ry,0,0,7);c.fill()}
  else if(k==='slow'){blob(z.rx+6,z.ry+5,'#00000066',.6);blob(z.rx,z.ry,z.color,.92);blob(z.rx*.7,z.ry*.6,'#000000',.18);if(z.water){blob(z.rx*.8,z.ry*.7,'#2a8ab0',.35)}}
  else if(k==='ice'){blob(z.rx+4,z.ry+3,'#6a9ab0',.7);blob(z.rx,z.ry,'#bfe6f4',.95);c.strokeStyle='#ffffff';c.globalAlpha=.6;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-z.rx*.6+i*z.rx*.3,-z.ry*.5);c.lineTo(-z.rx*.5+i*z.rx*.3,z.ry*.4);c.stroke()}c.globalAlpha=1}
  else if(k==='burn'){if(z.lava){blob(z.rx+8,z.ry+6,'#1a0806',.9);blob(z.rx,z.ry,'#d8401a',1);blob(z.rx*.65,z.ry*.6,'#ffb03a',.8)}else{blob(z.rx,z.ry,'#1a0c08',.85);blob(z.rx*.8,z.ry*.7,'#5a1a0a',.8)}}
  else if(k==='poison'){blob(z.rx+5,z.ry+4,'#000000',.4);blob(z.rx,z.ry,z.color,.85);blob(z.rx*.5,z.ry*.4,'#ffffff',.12)}
  c.restore()},
 // Static prop / decal drawing. Coordinates are the prop centre (solid props sit on their base).
 prop(c,p,th,R){const P=th.pal,x=p.x,y=p.y,s=p.s||1;c.save();
  const box=(X,Y,W,H,col,al=1)=>{c.globalAlpha=al;c.fillStyle=col;c.fillRect(Math.round(X),Math.round(Y),Math.round(W),Math.round(H));c.globalAlpha=1};
  const ell=(X,Y,rx,ry,col,al=1)=>{c.globalAlpha=al;c.fillStyle=col;c.beginPath();c.ellipse(X,Y,Math.max(.5,rx),Math.max(.5,ry),0,0,7);c.fill();c.globalAlpha=1};
  const ln=(pts,col,wd=1,al=1)=>{c.globalAlpha=al;c.strokeStyle=col;c.lineWidth=wd;c.beginPath();pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.stroke();c.globalAlpha=1};
  const shadow=(rx,ry=rx*.35,dy=0)=>ell(x+3,y+dy+3,rx,ry,'#000',.38);
  const glow=(X,Y,r,col,al=.5)=>{c.globalAlpha=al;c.globalCompositeOperation='lighter';c.drawImage(this.glow(col),X-r,Y-r,r*2,r*2);c.globalCompositeOperation='source-over';c.globalAlpha=1};
  switch(p.k){
   // ---------- metro
   case 'rails':for(const o of [-14,14])box(x-60*s,y+o,120*s,3,'#6a5a4a');for(let i=-56;i<56;i+=12)box(x+i*s,y-20,6,40,'#3a2c22',.9);for(const o of [-14,14])box(x-60*s,y+o,120*s,1,'#a08a70',.6);break;
   case 'corridorrails':for(const o of [-14,14])box(x,y+o,p.w,3,'#5a4a3c');for(let i=0;i<p.w;i+=13)box(x+i,y-20,6,40,'#2e241c',.85);for(const o of [-14,14])box(x,y+o,p.w,1,'#a08a70',.5);break;
   case 'puddle':ell(x,y,22*s,8*s,'#0a1418',.85);ell(x-4,y-1,14*s,4*s,'#9fd8e8',.18);ell(x+6,y+1,6*s,2,'#e6f6ff',.25);break;
   case 'sign':c.translate(x,y);c.rotate(p.v*2-1);box(-18,-8,36,16,'#e8e8e0');box(-16,-6,32,12,'#1e6a3a');box(-10,-2,20,3,'#e8e8e0',.9);break;
   case 'roots':ln([[x-20,y],[x-8,y-4],[x,y+3],[x+16,y-2],[x+26,y+4]],'#141a12',2);ln([[x-8,y-4],[x-12,y-14]],'#2e4a24',2,.8);ln([[x+16,y-2],[x+20,y+10]],'#2e4a24',2,.8);ell(x+2,y+2,10,4,'#2e4a24',.5);break;
   case 'debris':for(let i=0;i<6;i++)box(x+(hash2(i,p.v*99)-.5)*40,y+(hash2(p.v*99,i)-.5)*24,4+i%3*3,3+i%2*3,i%2?'#4a5457':'#262d30');break;
   case 'wagon':shadow(40,12,10);c.translate(x,y);c.rotate((p.v-.5)*.3);box(-38,-16,76,30,'#1c2a30');box(-36,-14,72,26,'#3a5560');box(-36,-14,72,5,'#5a7a84');for(let i=0;i<5;i++)box(-31+i*14,-6,10,9,'#0e1a1e');box(-31,-6,10,9,'#9fd8e8',.15);box(-36,8,72,4,'#d0b020',.7);box(-38,12,76,2,'#0a0a0a');break;
   case 'debrispile':shadow(22,9,6);for(let i=0;i<9;i++){const a=i*.7,r=4+i*1.6;box(x+Math.cos(a)*r-6,y+Math.sin(a)*r*.6-8,10+i%3*3,7,i%3?'#434d50':'#2a3134')}box(x-14,y-6,28,3,'#6a5a4a');break;
   case 'platform':box(x-110,y-60,220,10,'#c8b030',.5);box(x-110,y+50,220,10,'#c8b030',.5);for(let i=-100;i<100;i+=20){box(x+i,y-60,10,10,'#1a1a1a',.6);box(x+i,y+50,10,10,'#1a1a1a',.6)}box(x-30,y-10,60,20,'#e8e8e0',.12);break;
   // ---------- mine
   case 'minerails':this.prop(c,{k:'rails',x,y,s},th,R);break;
   case 'pebbles':for(let i=0;i<7;i++)ell(x+(hash2(i,p.v*77)-.5)*30,y+(hash2(p.v*77,i)-.5)*16,2+i%3,1.5+i%2,i%2?P.f[2]:P.f[3],.9);break;
   case 'beamfloor':box(x-22,y-3,44,6,'#4a3420');box(x-22,y-3,44,1,'#7a5a36');box(x-14,y-3,2,6,'#2a1c10');break;
   case 'crystal':shadow(14,5,8);for(const [ox,h,wd] of [[-7,22,7],[0,30,8],[7,18,6],[3,14,5]]){c.fillStyle=P.acc;c.globalAlpha=.9;c.beginPath();c.moveTo(x+ox-wd/2,y+8);c.lineTo(x+ox,y+8-h);c.lineTo(x+ox+wd/2,y+8);c.fill();c.fillStyle='#ffffff';c.globalAlpha=.5;c.beginPath();c.moveTo(x+ox-wd/4,y+6);c.lineTo(x+ox,y+8-h);c.lineTo(x+ox,y+6);c.fill()}c.globalAlpha=1;glow(x,y-6,34,P.acc,.35);break;
   case 'crystalcore':glow(x,y,90,P.acc,.25);for(let i=0;i<6;i++){const a=i*Math.PI/3;ln([[x,y],[x+Math.cos(a)*70,y+Math.sin(a)*40]],P.acc,2,.3)}ell(x,y,28,12,'#0a2a34',.8);break;
   case 'rubble':shadow(26,10,8);for(let i=0;i<10;i++){const a=i*1.3,r=3+i*1.8;ell(x+Math.cos(a)*r,y+Math.sin(a)*r*.5-4,8+i%3*2,6,i%3?P.w[1]:P.w[2])}break;
   case 'minecart':shadow(18,6,10);box(x-16,y-14,32,20,'#3a2c20');box(x-14,y-12,28,6,'#2a3a44');box(x-12,y-14,24,4,P.acc,.55);ell(x-9,y+7,4,4,'#1a1a1a');ell(x+9,y+7,4,4,'#1a1a1a');break;
   // ---------- cartenon
   case 'cracks':ln([[x-24,y-6],[x-8,y],[x+2,y-8],[x+20,y+4]],'#1c1c20',1.5,.8);ln([[x-8,y],[x-4,y+12]],'#1c1c20',1,.7);break;
   case 'rubblefloor':for(let i=0;i<5;i++)box(x+(hash2(i,9+p.v*50)-.5)*30,y+(hash2(9+p.v*50,i)-.5)*14,6,4,P.f[2]);break;
   case 'statue':shadow(16,6,14);box(x-14,y+4,28,12,'#2a2a2e');box(x-12,y+4,24,3,'#5a5a60');box(x-7,y-26,14,30,'#6a6a70');box(x-7,y-26,4,30,'#8a8a90');ell(x,y-30,6,6,'#7a7a80');{const inst=Math.floor(p.v*3);if(inst===0)ln([[x+8,y-24],[x+8,y+2]],'#9a8a60',2);else if(inst===1){ell(x+9,y-12,5,7,'#8a7a50');ln([[x+9,y-20],[x+9,y-30]],'#8a7a50',1.5)}else ln([[x-12,y-30],[x+10,y-6]],'#b0b0b8',2)}break;
   case 'column':shadow(14,6,10);ell(x,y+8,13,6,'#2a2a2e');box(x-10,y-34,20,42,'#55555a');box(x-10,y-34,5,42,'#77777c');box(x+6,y-34,4,42,'#3a3a3e');ell(x,y-34,12,5,'#6a6a70');break;
   case 'altar':ell(x,y,76,44,'#000',.25);c.strokeStyle='#7a7a80';c.lineWidth=3;c.beginPath();c.ellipse(x,y,70,40,0,0,7);c.stroke();c.beginPath();c.ellipse(x,y,56,30,0,0,7);c.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;box(x+Math.cos(a)*63-2,y+Math.sin(a)*35-2,4,4,P.acc,.7)}if(p.main){box(x-26,y-110,52,30,'#3a3a3e');box(x-20,y-130,40,24,'#55555a');ell(x,y-138,10,8,'#6a6a70');box(x-6,y-134,3,3,'#ff3040');box(x+3,y-134,3,3,'#ff3040')}break;
   // ---------- swamp
   case 'reeds':for(let i=0;i<7;i++){const ox=(i-3)*4;ln([[x+ox,y+6],[x+ox+(i%2?2:-2),y-10-i%3*4]],i%2?'#4a6a30':'#6a8a40',1.5);if(i%3===0)box(x+ox-1,y-12-i%3*4,3,6,'#5a3a20')}break;
   case 'deadtree':shadow(18,7,12);box(x-4,y-30,8,40,'#2a2018');ln([[x,y-20],[x-16,y-36],[x-22,y-34]],'#2a2018',3);ln([[x,y-26],[x+14,y-42],[x+20,y-44]],'#2a2018',3);ln([[x,y-12],[x+12,y-20]],'#2a2018',2);ell(x,y+8,12,4,'#1a140e');break;
   case 'totem':shadow(10,4,10);box(x-3,y-30,6,40,'#cfc6a8');ell(x,y-32,8,7,'#e8e0c8');box(x-4,y-34,3,3,'#1a1a12');box(x+1,y-34,3,3,'#1a1a12');for(let i=0;i<3;i++)box(x-8,y-20+i*7,16,2,'#a89a70');break;
   case 'bonetotems':for(let i=0;i<6;i++){const a=i*Math.PI/3;this.prop(c,{k:'totem',x:x+Math.cos(a)*92,y:y+Math.sin(a)*58},th,R)}break;
   // ---------- catacombs
   case 'skulls':for(let i=0;i<5;i++){const ox=(i%3-1)*8,oy=(i>2?-6:0);ell(x+ox,y+oy,5,4.5,'#d8d0b8');box(x+ox-3,y+oy-1,2,2,'#1a1410');box(x+ox+1,y+oy-1,2,2,'#1a1410')}break;
   case 'candles':for(let i=0;i<4;i++){const ox=(i-1.5)*7,h=6+i%2*5;box(x+ox-2,y-h,4,h,'#e8dcc0');ell(x+ox,y,4,2,'#d8ccb0',.8);box(x+ox-.5,y-h-4,1.5,4,'#ffcf7a')}glow(x,y-8,30,'#ffc46b',.45);break;
   case 'grate':box(x-16,y-10,32,20,'#0a0807');for(let i=0;i<5;i++)box(x-14+i*7,y-10,2,20,'#4a4a4e');box(x-16,y-10,32,2,'#5a5a5e');box(x-16,y+8,32,2,'#3a3a3e');break;
   case 'sarcophagus':shadow(22,8,8);box(x-22,y-12,44,24,'#3a332d');box(x-20,y-10,40,20,'#5a5046');box(x-20,y-10,40,3,'#7a6e60');c.translate(x+8,y-6);c.rotate(.35);box(-18,-8,36,14,'#4a4038');box(-18,-8,36,2,'#7a6e60');break;
   case 'gratewall':shadow(18,6,6);box(x-18,y-24,36,30,'#100c0a');for(let i=0;i<6;i++)box(x-16+i*6,y-24,2,30,'#5a4a3a');box(x-18,y-24,36,3,'#6e6152');break;
   case 'knightgrave':box(x-24,y-40,48,80,'#2a2420',.6);box(x-20,y-36,40,72,'#4a4038',.7);ln([[x,y-30],[x,y+30]],'#9a9aa0',3);ln([[x-12,y-18],[x+12,y-18]],'#9a9aa0',3);glow(x,y,60,'#ffc46b',.2);break;
   // ---------- fog forest
   case 'grasstuft':for(let i=0;i<9;i++)ln([[x+(i-4)*3,y+4],[x+(i-4)*4+(i%2?3:-3),y-8-i%3*3]],i%3?P.f[2]:'#7a8a50',1.5,.9);break;
   case 'leafpile':for(let i=0;i<10;i++)box(x+(hash2(i,p.v*40)-.5)*30,y+(hash2(p.v*40,i)-.5)*16,3,2,i%2?'#8a6a30':'#6a4a20',.9);break;
   case 'ivypillar':shadow(14,6,10);box(x-11,y-36,22,46,'#5a5e58');box(x-11,y-36,6,46,'#7a7e76');for(let i=0;i<8;i++)ell(x-8+hash2(i,3)*16,y-30+i*5,4,3,i%2?'#2e5a26':'#3e7a30',.95);box(x-13,y-38,26,4,'#6a6e66');break;
   case 'log':shadow(36,7,6);c.translate(x,y);c.rotate((p.v-.5)*.4);box(-36,-8,72,16,'#4a3420');box(-36,-8,72,4,'#6a4a2c');ell(-36,0,5,8,'#8a6a40');ell(-36,0,2.5,4,'#5a3a20');for(let i=0;i<4;i++)ell(-20+i*14,-8,4,2.5,'#3e7a30',.9);break;
   case 'runestones':for(let i=0;i<8;i++){const a=i*Math.PI/4,sx=x+Math.cos(a)*74,sy=y+Math.sin(a)*46;ell(sx+2,sy+6,8,3,'#000',.35);box(sx-5,sy-14,10,18,'#6a6e66');box(sx-5,sy-14,3,18,'#8a8e86');box(sx-2,sy-8,4,1,'#9ab0a0',.6)}break;
   // ---------- spider lair
   case 'cornerweb':c.strokeStyle='#d8dcd4';c.globalAlpha=.35;for(let i=0;i<7;i++){const a=i/6*Math.PI/2*2-Math.PI/2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*34*s,y+Math.sin(a)*22*s);c.stroke()}for(let q=1;q<4;q++){c.beginPath();c.ellipse(x,y,12*q*s,7*q*s,0,0,7);c.stroke()}c.globalAlpha=1;break;
   case 'bonesmall':ln([[x-10,y],[x+10,y-3]],'#d8d0b8',2.5);ell(x-11,y,3,3,'#d8d0b8');ell(x+11,y-3,3,3,'#d8d0b8');break;
   case 'cocoon':shadow(10,4,12);ln([[x,y-40],[x,y-22]],'#d8dcd4',1,.6);ell(x,y-6,10,17,'#c8ccc2');for(let i=0;i<5;i++)ln([[x-9,y-18+i*6],[x+9,y-14+i*6]],'#9a9e94',1,.8);break;
   case 'pit':ell(x,y,84,52,'#000',.55);ell(x,y,64,38,'#050605',.9);c.strokeStyle='#d8dcd4';c.globalAlpha=.4;for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(x+Math.cos(a)*30,y+Math.sin(a)*18);c.lineTo(x+Math.cos(a)*92,y+Math.sin(a)*58);c.stroke()}c.globalAlpha=1;break;
   // ---------- desert
   case 'ripples':for(let i=0;i<4;i++)ln([[x-26,y+i*5],[x-10,y-2+i*5],[x+8,y+1+i*5],[x+26,y-1+i*5]],i%2?P.f[2]:P.f[3],1,.6);break;
   case 'burrow':ell(x,y,12,6,'#5a3a1c',.8);ell(x,y,7,3,'#1a0e06');for(let i=0;i<5;i++)ell(x+(i-2)*9,y+8,3,1.5,P.f[2],.7);break;
   case 'ribcage':shadow(30,8,10);box(x-30,y-3,60,6,'#e8dcc0');for(let i=0;i<6;i++){ln([[x-24+i*10,y],[x-28+i*10,y-24]],'#efe2c8',3);ln([[x-24+i*10,y],[x-28+i*10,y+10]],'#d8cbb0',2)}break;
   case 'skull':shadow(24,8,10);ell(x,y-8,22,16,'#e8dcc0');ell(x-8,y-10,6,5,'#3a2410');ell(x+8,y-10,6,5,'#3a2410');box(x-10,y+2,20,8,'#d8cbb0');for(let i=0;i<5;i++)box(x-9+i*4,y+4,2,5,'#3a2410');break;
   case 'rock':shadow(18,6,6);ell(x,y-4,18,12,P.w[1]);ell(x-4,y-8,10,6,P.w[2],.7);break;
   case 'sinkhole':for(let i=4;i>0;i--)ell(x,y,i*22,i*14,i%2?'#8a5428':'#a86a36',.6);ell(x,y,20,12,'#2a1408');break;
   // ---------- sunken
   case 'coral':for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.4;ln([[x,y+6],[x+Math.cos(a)*14,y+Math.sin(a)*14]],i%2?'#ff7ab0':'#56f0ff',3,.85)}glow(x,y-2,26,P.acc,.35);break;
   case 'shells':for(let i=0;i<5;i++){const ox=(hash2(i,p.v*31)-.5)*26,oy=(hash2(p.v*31,i)-.5)*12;ell(x+ox,y+oy,4,3,i%2?'#e8d0c0':P.deco,.9)}break;
   case 'serpent':shadow(16,6,12);box(x-14,y+2,28,12,'#2f4f58');ln([[x-6,y+4],[x-10,y-10],[x,y-22],[x+8,y-30]],'#5a8a90',8);ell(x+10,y-32,8,6,'#6a9aa0');box(x+12,y-34,2,2,P.acc);break;
   case 'fountain':ell(x,y,70,42,'#0b1d24',.9);ell(x,y,60,34,'#155777');ell(x,y,30,16,'#2f4f58');box(x-6,y-30,12,30,'#6fa2ad');glow(x,y,70,P.acc,.25);break;
   // ---------- igris
   case 'carpet':{const h=p.h||80;box(x-24,y-h/2,48,h,'#5a0c14',.85);box(x-24,y-h/2,4,h,'#c8a040',.8);box(x+20,y-h/2,4,h,'#c8a040',.8);for(let i=0;i<4;i++)box(x-10+i*7,y-h/2+20+i*53,9,5,'#2a0408',.8);break}
   case 'moonlight':c.globalCompositeOperation='lighter';c.globalAlpha=.12;c.fillStyle='#9cc0ff';c.beginPath();c.moveTo(x-20,y-50);c.lineTo(x+10,y-50);c.lineTo(x+40,y+30);c.lineTo(x-4,y+30);c.fill();c.globalAlpha=.1;c.fillStyle='#ff4060';c.fillRect(x+6,y,8,8);c.globalCompositeOperation='source-over';c.globalAlpha=1;break;
   case 'armor':shadow(12,5,12);box(x-9,y+6,18,6,'#2c2c33');box(x-6,y-14,12,20,'#5a5a66');box(x-6,y-14,4,20,'#8a8a96');ell(x,y-19,6,6,'#6a6a76');box(x-4,y-20,8,2,'#0a0a0e');ln([[x+9,y-26],[x+9,y+10]],'#b0b0bc',2);break;
   case 'throne':box(x-30,y-50,60,120,'#5a0c14',.85);box(x-30,y-50,4,120,'#c8a040');box(x+26,y-50,4,120,'#c8a040');if(p.main){box(x-24,y-118,48,44,'#1a1a20');box(x-20,y-136,40,24,'#2a2a32');box(x-20,y-136,40,3,'#c8a040');box(x-30,y-92,8,22,'#2a2a32');box(x+22,y-92,8,22,'#2a2a32');for(const bx of [-140,120])box(x+bx,y-120,20,46,'#a01828')}break;
   // ---------- glacial
   case 'snowdrift':ell(x,y,24*s,8*s,'#ffffff',.7);ell(x+4,y-2,12*s,4*s,'#ffffff',.9);ell(x,y+4,22*s,3,'#a8c4d0',.4);break;
   case 'footprints':for(let i=0;i<5;i++)ell(x-20+i*10,y+(i%2?4:-4),2.5,1.8,'#9ab4c0',.7);break;
   case 'pine':this.pine(c,x,y+8,1.15);break;
   case 'icecrystal':shadow(12,5,8);for(const [ox,h] of [[-5,20],[0,28],[5,16]]){c.fillStyle='#bfefff';c.beginPath();c.moveTo(x+ox-4,y+8);c.lineTo(x+ox,y+8-h);c.lineTo(x+ox+4,y+8);c.fill();c.fillStyle='#ffffff';c.globalAlpha=.6;c.fillRect(x+ox-1,y+8-h+4,1,h-6);c.globalAlpha=1}glow(x,y-4,28,'#9be8ff',.35);break;
   case 'snowrock':shadow(18,6,6);ell(x,y-4,18,12,'#5a6e78');ell(x,y-10,16,7,'#f4fafb');break;
   case 'frozenlake':ell(x,y,90,54,'#7ab0c8',.5);ell(x,y,80,46,'#bfe6f4',.8);for(let i=0;i<6;i++)ln([[x-60+i*24,y-30],[x-50+i*24,y+28]],'#ffffff',1,.5);break;
   // ---------- volcanic
   case 'lavacrack':ln([[x-26,y],[x-10,y-5],[x,y+4],[x+18,y-2],[x+28,y+6]],'#ff6a2a',2.5,.85);ln([[x-26,y],[x-10,y-5],[x,y+4]],'#ffd27a',1,.6);break;
   case 'chainfloor':for(let i=0;i<6;i++){c.strokeStyle='#5a5a5e';c.lineWidth=2;c.beginPath();c.ellipse(x-25+i*10,y,5,3,0,0,7);c.stroke()}break;
   case 'brazier':shadow(12,5,10);box(x-3,y-4,6,14,'#2a2a2e');box(x-12,y-14,24,10,'#3a3a3e');box(x-12,y-14,24,2,'#6a6a6e');break;
   case 'obsidianspike':shadow(14,5,8);for(const [ox,h] of [[-6,20],[2,30],[8,14]]){c.fillStyle='#1a1416';c.beginPath();c.moveTo(x+ox-6,y+8);c.lineTo(x+ox,y+8-h);c.lineTo(x+ox+6,y+8);c.fill();c.fillStyle='#5a4a50';c.beginPath();c.moveTo(x+ox-2,y+6);c.lineTo(x+ox,y+8-h);c.lineTo(x+ox+1,y+6);c.fill()}break;
   case 'forge':ell(x,y,72,44,'#120e0f',.8);c.strokeStyle='#ff6a2a';c.lineWidth=2;c.globalAlpha=.6;c.beginPath();c.ellipse(x,y,64,38,0,0,7);c.stroke();c.globalAlpha=1;if(p.main){box(x-30,y-120,60,40,'#2a1f20');box(x-24,y-112,48,20,'#ff6a2a',.8)}break;
   // ---------- kargalgan
   case 'tribal':box(x-10,y-14,20,28,'#7a2a1a');box(x-10,y-14,20,3,'#e0b070');ln([[x-6,y-4],[x,y+6],[x+6,y-4]],'#e0b070',2);break;
   case 'magiccircle':c.strokeStyle=P.acc;c.globalAlpha=.35;c.lineWidth=2;c.beginPath();c.ellipse(x,y,36*s,22*s,0,0,7);c.stroke();c.beginPath();for(let i=0;i<=5;i++){const a=i*Math.PI*4/5-Math.PI/2;i?c.lineTo(x+Math.cos(a)*34*s,y+Math.sin(a)*20*s):c.moveTo(x+Math.cos(a)*34*s,y+Math.sin(a)*20*s)}c.stroke();c.globalAlpha=1;break;
   case 'shamantotem':shadow(12,5,12);box(x-8,y-34,16,44,'#5a2a1e');box(x-10,y-34,20,10,'#8a4a2a');box(x-6,y-30,4,4,P.acc);box(x+2,y-30,4,4,P.acc);for(let i=0;i<3;i++)box(x-8,y-18+i*9,16,2,P.acc,.6);glow(x,y-28,26,P.acc,.4);break;
   case 'pillar':shadow(15,6,10);ell(x,y+8,14,6,'#2e130c');box(x-12,y-38,24,46,'#7a3e2c');box(x-12,y-38,6,46,'#9a5a3a');ell(x,y-38,13,5,'#8a4a32');ln([[x-4,y-20],[x+2,y-10],[x-2,y]],'#2e130c',1.5);break;
   case 'arena':for(let i=0;i<3;i++){c.strokeStyle=i===1?P.acc:'#e0b070';c.globalAlpha=.35;c.lineWidth=2;c.beginPath();c.ellipse(x,y,90-i*18,56-i*11,0,0,7);c.stroke()}c.globalAlpha=1;if(p.main)box(x-40,y-20,80,40,'#5a2a1e',.6);break;
   // ---------- burning city
   case 'lane':for(let i=-2;i<=2;i++)box(x+i*30-10,y-2,20,4,'#c8b030',.55);break;
   case 'crack':ln([[x-28,y-4],[x-12,y+2],[x,y-6],[x+14,y+3],[x+30,y-2]],'#0a0808',3,.9);if(th.id==='burningcity')ln([[x-12,y+2],[x,y-6],[x+14,y+3]],'#ff6a2a',1,.7);break;
   case 'scorch':ell(x,y,24*s,12*s,'#0a0606',.6);ell(x,y,12*s,6*s,'#000',.5);break;
   case 'burntcar':shadow(30,10,10);c.translate(x,y);c.rotate((p.v-.5)*.5);box(-28,-14,56,26,'#141010');box(-26,-12,52,22,'#2a2220');box(-14,-10,26,16,'#0a0808');box(-26,-12,6,22,'#3a2a24');ell(-18,12,5,4,'#050505');ell(18,12,5,4,'#050505');break;
   case 'lamp':shadow(8,3,12);box(x-2,y-34,4,44,'#2a2a2e');ln([[x,y-34],[x+12,y-40],[x+16,y-30]],'#2a2a2e',3);break;
   case 'crater':ell(x,y,92,56,'#0a0606',.7);ell(x,y,70,42,'#1a0c08',.9);c.strokeStyle=P.acc;c.globalAlpha=.4;c.beginPath();c.ellipse(x,y,70,42,0,0,7);c.stroke();c.globalAlpha=1;break;
   // ---------- baran
   case 'runes':c.strokeStyle=P.acc;c.globalAlpha=.4;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,20*s,12*s,0,0,7);c.stroke();ln([[x-10*s,y],[x,y-8*s],[x+10*s,y],[x,y+8*s],[x-10*s,y]],P.acc,1.5,.4);c.globalAlpha=1;break;
   case 'debrisfloor':for(let i=0;i<6;i++)box(x+(hash2(i,p.v*21)-.5)*36,y+(hash2(p.v*21,i)-.5)*18,5+i%3*2,4,i%2?P.f[2]:P.w[1]);break;
   case 'brokenpillar':shadow(15,6,10);ell(x,y+8,14,6,'#1a1622');box(x-12,y-18,24,26,'#3b3543');box(x-12,y-18,6,26,'#5a5266');c.fillStyle='#3b3543';c.beginPath();c.moveTo(x-12,y-18);c.lineTo(x-4,y-28);c.lineTo(x+4,y-20);c.lineTo(x+12,y-26);c.lineTo(x+12,y-18);c.fill();break;
   case 'demonsigil':c.strokeStyle=P.acc;c.lineWidth=2;c.globalAlpha=.5;c.beginPath();c.ellipse(x,y,86,52,0,0,7);c.stroke();c.beginPath();for(let i=0;i<=6;i++){const a=i*Math.PI*2/3*2;i?c.lineTo(x+Math.cos(a)*80,y+Math.sin(a)*48):c.moveTo(x+80,y)}c.stroke();c.globalAlpha=1;break;
   // ---------- jeju
   case 'tunnel':ell(x,y,18*s,10*s,'#000',.9);c.strokeStyle='#7a3a5a';c.lineWidth=2;c.beginPath();c.ellipse(x,y,18*s,10*s,0,0,7);c.stroke();break;
   case 'eggs':shadow(18,7,8);for(const [ox,oy] of [[-9,0],[8,-2],[0,-10],[-2,4]]){ell(x+ox,y+oy-6,8,11,'#e8d0a0');ell(x+ox-2,y+oy-10,3,4,'#ffffff',.5)}ell(x,y+4,18,5,'#7a2a5a',.6);break;
   case 'biopillar':shadow(12,5,10);ell(x,y-14,10,26,'#3a1c2c');ell(x-3,y-20,4,16,'#5a2a44');for(let i=0;i<4;i++)ell(x+(i%2?5:-5),y-28+i*9,2.5,2.5,P.acc);glow(x,y-16,30,P.acc,.35);break;
   case 'queenpit':ell(x,y,90,56,'#050103',.8);for(let i=0;i<10;i++){const a=i*Math.PI/5;ell(x+Math.cos(a)*70,y+Math.sin(a)*42,10,8,'#3a1c2c')}glow(x,y,80,P.acc,.2);break;
   // ---------- tokyo
   case 'footprint':ell(x,y,30*s,18*s,'#1a1c20',.7);for(let i=0;i<4;i++)ell(x-18*s+i*12*s,y-20*s,6*s,5*s,'#1a1c20',.7);ln([[x-26*s,y],[x-10*s,y+4]],'#0a0b0e',2,.8);break;
   case 'giantcrater':ell(x,y,100,62,'#0a0b0e',.6);ell(x,y,80,48,'#14161a',.95);for(let i=0;i<10;i++){const a=i*Math.PI/5;ln([[x+Math.cos(a)*80,y+Math.sin(a)*48],[x+Math.cos(a)*120,y+Math.sin(a)*72]],'#0a0b0e',2,.8)}break;
   // ---------- rift
   case 'energycrack':ln([[x-30,y],[x-14,y-6],[x-2,y+4],[x+14,y-4],[x+30,y+2]],P.acc,3,.6);ln([[x-14,y-6],[x-18,y-16]],P.acc,1.5,.5);ln([[x-30,y],[x-14,y-6],[x-2,y+4]],'#ffffff',1,.3);break;
   case 'floatrock':break; // animated in the dynamic pass
   case 'astralcrystal':shadow(12,5,8);for(const [ox,h] of [[-6,22],[0,32],[6,18]]){c.fillStyle='#ffd27a';c.beginPath();c.moveTo(x+ox-5,y+8);c.lineTo(x+ox,y+8-h);c.lineTo(x+ox+5,y+8);c.fill();c.fillStyle='#fff6d0';c.globalAlpha=.6;c.fillRect(x+ox-1,y+8-h+4,1.5,h-6);c.globalAlpha=1}glow(x,y-6,34,'#ffd27a',.4);break;
   case 'riftcore':ell(x,y,90,56,'#000',.5);c.strokeStyle='#a855f7';c.lineWidth=3;c.globalAlpha=.6;c.beginPath();c.ellipse(x,y,80,48,0,0,7);c.stroke();c.strokeStyle='#ffd27a';c.beginPath();c.ellipse(x,y,60,36,0,0,7);c.stroke();c.globalAlpha=1;break;
   case 'walllight':case 'shaft':break; // dynamic
  }
  c.restore()},
 // ---- Dynamic pass (every frame, culled to the view) ------------------------------------------
 animate(c,w,t,v){const th=w.theme,P=th.pal,lite=typeof Mobile!=='undefined'&&Mobile.light,vis=(x,y,m=80)=>x>v.x-m&&x<v.x+v.w+m&&y>v.y-m&&y<v.y+v.h+m;
  c.save();
  // animated background: lava glow, water shimmer, void twinkle (clipped to outside the rooms)
  if(th.bg==='lava'||th.bg==='deepwater'||th.bg==='swamp'||th.bg==='void'||th.bg==='sky'){c.save();c.beginPath();c.rect(v.x,v.y,v.w,v.h);for(const r of w.walkable)c.rect(r.x+r.w,r.y,-r.w,r.h);c.clip();
   if(th.bg==='lava'){c.globalCompositeOperation='lighter';c.globalAlpha=.10+.06*Math.sin(t*2);c.fillStyle='#ff5a14';c.fillRect(v.x,v.y,v.w,v.h);c.globalAlpha=.5;for(let i=0;i<(lite?6:14);i++){const x=v.x+((hash2(i,7)*v.w+t*12*(i%3+1))%v.w),y=v.y+hash2(7,i)*v.h;c.drawImage(this.glow('#ffb03a'),x-10,y-10,20,20)}}
   else if(th.bg==='void'){c.globalCompositeOperation='lighter';for(let i=0;i<(lite?20:40);i++){const x=v.x+hash2(i,3)*v.w,y=v.y+hash2(3,i)*v.h,a=.5+.5*Math.sin(t*3+i);c.globalAlpha=a*.8;c.fillStyle=i%3?'#ffffff':'#c8a0ff';c.fillRect(x,y,2,2)}}
   else if(th.bg==='sky'){c.globalAlpha=.12;c.fillStyle='#6a3a9a';for(let i=0;i<5;i++){const x=v.x+((hash2(i,5)*v.w*1.5+t*40*(1+i%2))%(v.w*1.5))-v.w*.25,y=v.y+hash2(5,i)*v.h;c.beginPath();c.ellipse(x,y,120,40,0,0,7);c.fill()}}
   else{c.strokeStyle=th.bg==='swamp'?'#6a9a6a':'#7ad8f0';c.globalAlpha=.25;const C=90;for(let gx=Math.floor(v.x/C);gx*C<v.x+v.w;gx++)for(let gy=Math.floor(v.y/C);gy*C<v.y+v.h;gy++){const ph=(t*.6+hash2(gx,gy)*3)%3;if(ph>1)continue;const x=gx*C+hash2(gy,gx)*C,y=gy*C+hash2(gx+5,gy)*C;c.globalAlpha=.3*(1-ph);c.beginPath();c.ellipse(x,y,6+ph*22,2+ph*7,0,0,7);c.stroke()}}
   c.restore()}
  // hazards: lava/fire glow, ripples, ice glints, bubbling acid
  for(const z of w.zones){if(!vis(z.x,z.y,z.rx+40))continue;
   if(z.kind==='burn'){c.globalCompositeOperation='lighter';c.globalAlpha=.25+.15*Math.sin(t*3+z.seed);c.drawImage(this.glow(z.lava?'#ff7a2a':'#ff5a1a'),z.x-z.rx*1.4,z.y-z.ry*1.6,z.rx*2.8,z.ry*3.2);c.globalCompositeOperation='source-over';
    if(z.fire){for(let i=0;i<(lite?4:8);i++){const ph=(t*1.4+i/8+z.seed)%1,ox=(hash2(i,z.seed*10)-.5)*z.rx*1.4,oy=(hash2(z.seed*10,i)-.5)*z.ry;c.globalAlpha=1-ph;c.fillStyle=ph<.4?'#ffd27a':'#ff5a1a';c.fillRect(z.x+ox-2,z.y+oy-ph*26,4,6-ph*3)}}
    else{c.globalAlpha=.6;c.fillStyle='#ffd27a';for(let i=0;i<3;i++){const ph=(t*.5+i/3+z.seed)%1;c.beginPath();c.arc(z.x+Math.cos(i*2+z.seed)*z.rx*.4,z.y+Math.sin(i*2)*z.ry*.3,2+ph*4,0,7);c.globalAlpha=.6*(1-ph);c.fill()}}}
   else if(z.kind==='slow'&&!z.web){c.strokeStyle=z.water?'#8ae0ff':'#7a9a6a';for(let i=0;i<2;i++){const ph=(t*.5+i*.5+z.seed)%1;c.globalAlpha=.35*(1-ph);c.beginPath();c.ellipse(z.x,z.y,z.rx*(.3+ph*.6),z.ry*(.3+ph*.6),0,0,7);c.stroke()}}
   else if(z.kind==='ice'){const ph=(t*.7+z.seed)%2;if(ph<.3){c.globalAlpha=1-ph/.3;c.fillStyle='#ffffff';const gx=z.x+Math.cos(z.seed*5)*z.rx*.5,gy=z.y+Math.sin(z.seed*3)*z.ry*.4;c.fillRect(gx-4,gy,9,1);c.fillRect(gx,gy-4,1,9)}}
   else if(z.kind==='poison'){for(let i=0;i<3;i++){const ph=(t*.8+i/3+z.seed)%1;c.globalAlpha=.7*(1-ph);c.strokeStyle='#e8ffc8';c.beginPath();c.arc(z.x+Math.cos(i*2.1+z.seed)*z.rx*.5,z.y+Math.sin(i*2.1+z.seed)*z.ry*.4,1+ph*4,0,7);c.stroke()}}
   c.globalAlpha=1}
  // light sources (flames, crystals, fluorescent tubes) and special props
  for(const p of w.props){if(!vis(p.x,p.y,120))continue;
   if(p.k==='walllight'){const lt=p.lt,col=P.light,f=lt==='fluor'?(Math.sin(t*23+p.x)>.92||Math.sin(t*3.1+p.x*.1)>.97?.15:1):.8+.2*Math.sin(t*9+p.x);
    if(lt==='fluor'){c.fillStyle='#1a2226';c.fillRect(p.x-14,p.y-4,28,6);c.fillStyle=f>.5?'#f0fbff':'#5a6a70';c.fillRect(p.x-12,p.y-3,24,3)}
    else if(lt==='crystal'||lt==='coral'||lt==='bio'||lt==='rune'||lt==='rift'||lt==='acid'||lt==='moon'||lt==='wisp'){c.fillStyle=col;c.globalAlpha=.75+.25*Math.sin(t*2+p.x);c.beginPath();c.moveTo(p.x-4,p.y+6);c.lineTo(p.x,p.y-8+(lt==='wisp'?Math.sin(t*2+p.x)*3:0));c.lineTo(p.x+4,p.y+6);c.fill();c.globalAlpha=1}
    else{c.fillStyle='#1a1414';c.fillRect(p.x-3,p.y-2,6,10);c.fillStyle=col;c.fillRect(p.x-3,p.y-8+Math.sin(t*12+p.x)*1.5,6,7);c.fillStyle='#ffffff';c.globalAlpha=.7;c.fillRect(p.x-1,p.y-6,2,3);c.globalAlpha=1}
    c.globalCompositeOperation='lighter';c.globalAlpha=.32*f;c.drawImage(this.glow(col),p.x-40,p.y-34,80,80);c.globalCompositeOperation='source-over';c.globalAlpha=1}
   else if(p.k==='brazier'){for(let i=0;i<5;i++){const ph=(t*2+i/5+p.v)%1;c.globalAlpha=1-ph;c.fillStyle=ph<.35?'#ffe08a':'#ff6a2a';c.fillRect(p.x-8+i*4,p.y-16-ph*18,4,6)}c.globalAlpha=1;c.globalCompositeOperation='lighter';c.globalAlpha=.35+.1*Math.sin(t*10+p.v*9);c.drawImage(this.glow('#ff8a3a'),p.x-45,p.y-60,90,90);c.globalCompositeOperation='source-over';c.globalAlpha=1}
   else if(p.k==='shaft'){c.globalCompositeOperation='lighter';c.globalAlpha=.07+.03*Math.sin(t*.8+p.x);c.fillStyle=p.gold?'#ffd27a':'#e8f0c8';c.beginPath();c.moveTo(p.x-30,p.y-120);c.lineTo(p.x+10,p.y-120);c.lineTo(p.x+40,p.y+30);c.lineTo(p.x-10,p.y+30);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1}
   else if(p.k==='floatrock'){const bob=Math.sin(t*1.5+p.v*9)*5;c.fillStyle='#000';c.globalAlpha=.35;c.beginPath();c.ellipse(p.x,p.y+14,12,4,0,0,7);c.fill();c.globalAlpha=1;c.fillStyle='#423b4d';c.beginPath();c.moveTo(p.x-12,p.y-8+bob);c.lineTo(p.x+12,p.y-10+bob);c.lineTo(p.x+4,p.y+4+bob);c.lineTo(p.x-6,p.y+2+bob);c.fill();c.fillStyle=P.acc;c.globalAlpha=.5;c.fillRect(p.x-8,p.y-9+bob,14,2);c.globalAlpha=1}
   else if(p.k==='magiccircle'||(p.center&&(th.center==='arena'||th.center==='demonsigil'||th.center==='altar'||th.center==='riftcore'||th.center==='crystalcore'))){const r=p.center?70:30;c.save();c.translate(p.x,p.y);c.scale(1,.6);c.rotate(t*.4*(p.center?1:-1));c.strokeStyle=P.acc;c.globalAlpha=.25+.2*Math.sin(t*2+p.x);c.lineWidth=2;c.setLineDash([10,8]);c.beginPath();c.arc(0,0,r,0,7);c.stroke();c.setLineDash([]);c.restore();c.globalAlpha=1}
  }
  if(th.id==='sunken'){for(const r of w.rooms){if(!vis(r.cx,r.y,r.w))continue;for(const lx of [40,r.w-40]){const x=r.x+lx;c.fillStyle='#8ae0ff';for(let i=0;i<6;i++){const ph=(t*1.6+i/6)%1;c.globalAlpha=.5*(1-ph);c.fillRect(x-6+i*2,r.y-10+ph*26,2,8)}}}c.globalAlpha=1}
  c.restore()}
};
const PROP_SIZE={wagon:[72,26],debrispile:[34,18],crystal:[22,16],rubble:[40,18],minecart:[32,18],statue:[26,18],column:[24,14],deadtree:[18,14],totem:[12,10],sarcophagus:[44,22],gratewall:[36,14],ivypillar:[22,14],log:[66,16],cocoon:[18,14],ribcage:[58,12],skull:[40,20],rock:[32,14],serpent:[28,14],armor:[18,12],pine:[18,12],icecrystal:[18,12],snowrock:[32,14],brazier:[22,12],obsidianspike:[22,12],shamantotem:[18,12],pillar:[26,14],burntcar:[56,24],lamp:[8,8],brokenpillar:[24,14],eggs:[32,18],biopillar:[18,12],astralcrystal:[20,12]};
const PROP_LIGHT={crystal:120,icecrystal:90,brazier:170,shamantotem:110,biopillar:120,astralcrystal:130};

class DungeonGenerator{
 static create(rank,themeId){
  const world=new WorldMap('dungeon',rank,themeById(themeId)||pickTheme(rank)), rooms=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)rooms.push({x:col*600+90,y:row*400+60,w:420,h:280,cx:col*600+300,cy:row*400+200,seen:false});
  const corridors=[], visited=new Set([3]), frontier=[3];
  while(frontier.length){
   const current=frontier[frontier.length-1], col=current%3, row=Math.floor(current/3);
   const neighbors=[[col-1,row],[col+1,row],[col,row-1],[col,row+1]].filter(([x,y])=>x>=0&&x<3&&y>=0&&y<3&&!visited.has(y*3+x));
   if(!neighbors.length){frontier.pop();continue}
   const [x,y]=neighbors[Math.floor(Math.random()*neighbors.length)], next=y*3+x, a=rooms[current], b=rooms[next];
   // Corridors remember the two rooms they join (a/b) and their "gap" (the stretch outside both
   // rooms), which is what fog of war and room-based aggro treat as the corridor zone.
   if(a.cy===b.cy){const L=a.cx<b.cx?a:b,R=a.cx<b.cx?b:a;corridors.push({x:Math.min(a.cx,b.cx),y:a.cy-55,w:Math.abs(a.cx-b.cx),h:110,a:current,b:next,gap:{x:L.x+L.w,y:a.cy-55,w:R.x-(L.x+L.w),h:110}})}
   else{const T=a.cy<b.cy?a:b,B=a.cy<b.cy?b:a;corridors.push({x:a.cx-55,y:Math.min(a.cy,b.cy),w:110,h:Math.abs(a.cy-b.cy),a:current,b:next,gap:{x:a.cx-55,y:T.y+T.h,w:110,h:B.y-(T.y+T.h)}})}
   visited.add(next);frontier.push(next);
  }
  rooms.forEach((r,i)=>{r.id=i;r.links=corridors.filter(c=>c.a===i||c.b===i).map(c=>c.a===i?c.b:c.a)});
  world.rooms=rooms;world.corridors=corridors;world.walkable=[...rooms,...corridors];world.seed=Math.floor(Math.random()*1e9);
  // Sala secreta: um décimo cômodo escondido atrás de uma parede rachada, fora da grade 3x3.
  // Só entra em `rooms`/`walkable` (e no bake) quando o jogador a revela.
  {const opt=[{adj:2,dir:'r'},{adj:8,dir:'r'},{adj:6,dir:'b'},{adj:8,dir:'b'}][Math.floor(Math.random()*4)],A=rooms[opt.adj];
   let sr,scr,crack;
   if(opt.dir==='r'){sr={x:1830,y:A.y,w:420,h:280,cx:2040,cy:A.cy,seen:false};crack={x:A.x+A.w,y:A.cy};
    scr={x:A.cx,y:A.cy-55,w:sr.cx-A.cx,h:110,a:opt.adj,b:99,gap:{x:A.x+A.w,y:A.cy-55,w:sr.x-(A.x+A.w),h:110}}}
   else{sr={x:A.x,y:1230,w:420,h:280,cx:A.cx,cy:1370,seen:false};crack={x:A.cx,y:A.y+A.h};
    scr={x:A.cx-55,y:A.cy,w:110,h:sr.cy-A.cy,a:opt.adj,b:99,gap:{x:A.cx-55,y:A.y+A.h,w:110,h:sr.y-(A.y+A.h)}}}
   sr.id=99;sr.links=[opt.adj];A.links.push(99);
   world.secret={room:sr,corridor:scr,adj:opt.adj,crack,revealed:false}}
  // Themed layout (hazards, props, solid cover, lights) and a single pre-rendered static layer.
  DungeonArt.layout(world,world.theme,seededRandom(world.seed));world.wallLayer=DungeonArt.bake(world);return world;
 }
}
// ---------------------------------------------------------------------------------------------
// Dynamic gates: blue/red rifts open at random spots of the city, live for a limited time and
// collapse. They are announced with a notice, a minimap blip, an off-screen arrow and a timer.
const RANKS=['E','D','C','B','A','S'];
const GATE_RULES={maxActive:4,firstDelay:1.5,interval:[16,28],life:[75,130],forming:2.6,warnAt:20};
class GateSystem{
 constructor(){this.list=[];this.timer=GATE_RULES.firstDelay;this.nextId=1}
 update(dt,g){
  for(const gate of this.list){if(gate.forming>0){gate.forming-=dt;if(gate.forming<=0)g.particles.ring(gate.x,gate.y+40,gate.red?'#ff4b57':'#3bcfff',120,.6,4);continue}gate.life-=dt;gate.age+=dt;
   if(gate.life<=GATE_RULES.warnAt&&!gate.warned){gate.warned=true;g.message(`GATE RANK ${gate.rank} INSTÁVEL · ${Math.ceil(gate.life)}s`)}}
  const closed=this.list.filter(gate=>gate.life<=0);for(const gate of closed){g.particles.burst(gate.x,gate.y,gate.red?'#ff4b57':'#3bcfff',40,{speed:220});g.particles.ring(gate.x,gate.y+30,gate.red?'#ff4b57':'#3bcfff',160,.5,5);g.message(`GATE RANK ${gate.rank} SE FECHOU`)}
  this.list=this.list.filter(gate=>gate.life>0);
  this.timer-=dt;if(!this.list.length&&this.timer>4)this.timer=4;
  if(this.timer<=0){this.timer=rand(...GATE_RULES.interval);if(this.list.length<GATE_RULES.maxActive){
   // portais à noite ficam mais perigosos e mais frequentes
   const night=g.isNight?.();if(night)this.timer*=.6;
   this.spawn(g,{red:Math.random()<(night?.45:.22)})}}
 }
 point(g){const areas=(g.world&&g.world.spawnAreas)||CITY.spawnAreas,total=areas.reduce((s,a)=>s+a.w*a.h,0);
  for(let i=0;i<40;i++){let pick=Math.random()*total,idx=0;for(;idx<areas.length-1;idx++){pick-=areas[idx].w*areas[idx].h;if(pick<=0)break}const a=areas[idx],x=a.x+Math.random()*a.w,y=a.y+Math.random()*a.h;
   if(g.world.blocked&&g.world.blocked(x,y,70))continue;if(this.list.some(o=>dist(o,{x,y})<320))continue;if(g.player&&dist(g.player,{x,y})<180)continue;return {x,y,district:a.name||GATE_AREAS[idx]}}
  return null}
 spawn(g,opts={}){const pt=opts.x!==undefined?{x:opts.x,y:opts.y,district:opts.district||'CIDADE'}:this.point(g);if(!pt)return null;
  const top=clamp(g.unlocked||0,0,5),red=opts.red??Math.random()<.25,rankIdx=opts.rank!==undefined?RANKS.indexOf(opts.rank):Math.floor(Math.random()*(top+1));
  const life=rand(...GATE_RULES.life),gate={id:this.nextId++,x:Math.round(pt.x),y:Math.round(pt.y),district:pt.district,red,rank:RANKS[clamp(rankIdx,0,5)],life,maxLife:life,forming:opts.instant?0:GATE_RULES.forming,age:0};gate.theme=(opts.theme&&themeById(opts.theme)?opts.theme:pickTheme(gate.rank).id);
  this.list.push(gate);if(!opts.silent){g.message(`⚠ GATE ${red?'VERMELHO':'AZUL'} RANK ${gate.rank} DETECTADO · ${gate.district}`);g.sound.play('alert');if(opts.instant&&red)g.sound.play('horn')}return gate}
 nearest(p,r=115){return this.list.filter(gate=>gate.forming<=0&&dist(gate,p)<r).sort((a,b)=>dist(a,p)-dist(b,p))[0]||null}
 remove(gate){this.list=this.list.filter(o=>o!==gate)}
 draw(c,t,world){
  for(const gate of this.list){const col=gate.red?'#ff3b4f':'#3bcfff',{x,y}=gate;
   if(gate.forming>0){const k=1-gate.forming/GATE_RULES.forming;c.save();c.globalCompositeOperation='lighter';c.strokeStyle=col;c.lineWidth=3+6*k;c.shadowColor=col;c.shadowBlur=20;c.beginPath();for(let i=0;i<=10;i++){const yy=y-70*k+i*14*k,xx=x+Math.sin(i*1.7+t*20)*6*k;i?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.stroke();c.globalAlpha=.4*k;c.fillStyle=col;c.beginPath();c.ellipse(x,y+45,70*k,22*k,0,0,7);c.fill();c.restore();
    if(Math.random()<.5)game.particles.burst(x+rand(-20,20),y+rand(-60,40),col,1,{speed:80,lift:40});continue}
   const unstable=gate.life<GATE_RULES.warnAt,flick=unstable&&Math.sin(t*18)>.3?.85:1;
   if(gate.red){c.save();c.globalCompositeOperation='lighter';const g2=c.createRadialGradient(x,y,10,x,y,170);g2.addColorStop(0,'rgba(255,40,60,.25)');g2.addColorStop(1,'rgba(255,40,60,0)');c.fillStyle=g2;c.beginPath();c.arc(x,y,170,0,7);c.fill();c.restore()}
   world.portal(c,x,y,col,t*(gate.red?1.6:1),gate.rank==='S'?1.25:1,flick);
   // label + countdown bar
   const left=Math.max(0,gate.life),mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(Math.floor(left%60)).padStart(2,'0');
   c.fillStyle='#050c14dd';c.fillRect(x-58,y-112,116,32);c.strokeStyle=col;c.lineWidth=1;c.strokeRect(x-58,y-112,116,32);c.font='bold 11px monospace';c.textAlign='center';c.fillStyle=col;c.fillText(`${gate.red?'GATE VERMELHO':'GATE AZUL'} · ${gate.rank}`,x,y-99);
   c.fillStyle=unstable?'#ff8a8a':'#d8f6ff';c.fillText(unstable?`INSTÁVEL ${mm}:${ss}`:`FECHA EM ${mm}:${ss}`,x,y-86);c.textAlign='left';c.fillStyle='#1a2a36';c.fillRect(x-54,y-80,108,3);c.fillStyle=col;c.fillRect(x-54,y-80,108*left/gate.maxLife,3);
   if(Math.random()<.25)game.particles.burst(x+rand(-40,40),y+rand(-60,60),col,1,{speed:50,lift:30,kind:'sq'})}
 }
}
// ---------------------------------------------------------------------------------------------
// Monster attributes. Every type has its own HP curve [base, per level], movement speed, aggro
// radius, body radius and attack set. Ranges scale with body size; Attack 3 (Super) is boss-only.
// Attack kinds: melee (frontal arc), slam (circle around self), projectile, lunge (dash),
// super (boss pattern: nova rings and/or telegraphed blasts, optional summons).
const ATK=(id,name,kind,o)=>({id,name,kind,...o});
const MONSTER_TYPES={
 goblin:{name:'Goblin',size:'Pequeno',art:'goblin',hp:[48,10],speed:96,aggro:340,radius:13,attacks:[
  ATK(1,'Golpe de Adaga','melee',{range:58,arc:.9,damage:[7,1.6],windup:.32,recover:.35,cooldown:1.1}),
  ATK(2,'Pedra Arremessada','projectile',{range:250,minRange:90,damage:[6,1.4],windup:.45,recover:.4,cooldown:3.6,speed:320,color:'#d8c08a',size:5})]},
 wolf:{name:'Lobo',size:'Médio',art:'wolf',hp:[58,11],speed:124,aggro:400,radius:17,attacks:[
  ATK(1,'Mordida','melee',{range:66,arc:.8,damage:[8,1.8],windup:.28,recover:.35,cooldown:1}),
  ATK(2,'Investida Selvagem','lunge',{range:190,minRange:85,damage:[11,2.2],windup:.5,recover:.5,cooldown:4,dash:560,dashTime:.32})]},
 spider:{name:'Aranha',size:'Médio',art:'spider',hp:[52,10],speed:86,aggro:360,radius:17,attacks:[
  ATK(1,'Picada Venenosa','melee',{range:72,arc:.8,damage:[7,1.6],windup:.35,recover:.4,cooldown:1.2,poison:3}),
  ATK(2,'Jato de Teia','projectile',{range:290,minRange:80,damage:[5,1.2],windup:.5,recover:.4,cooldown:4,speed:280,color:'#e8f0f0',size:7,slow:1.6})]},
 orc:{name:'High Orc',size:'Grande',art:'orc',hp:[95,17],speed:74,aggro:360,radius:21,attacks:[
  ATK(1,'Machadada','melee',{range:86,arc:1.15,damage:[12,2.4],windup:.45,recover:.5,cooldown:1.4}),
  ATK(2,'Pisão Sísmico','slam',{range:110,radius:120,damage:[15,2.8],windup:.8,recover:.7,cooldown:5.5})]},
 bear:{name:'Urso de Gelo',size:'Enorme',art:'bear',hp:[125,19],speed:82,aggro:380,radius:26,attacks:[
  ATK(1,'Garras Glaciais','melee',{range:96,arc:1.1,damage:[14,2.6],windup:.42,recover:.5,cooldown:1.4}),
  ATK(2,'Avalanche','lunge',{range:220,minRange:95,damage:[17,3],windup:.6,recover:.6,cooldown:5,dash:520,dashTime:.38,slow:1.2})]},
 demon:{name:'Demônio',size:'Médio',art:'demon',hp:[82,14],speed:98,aggro:380,radius:18,attacks:[
  ATK(1,'Garra Infernal','melee',{range:76,arc:1,damage:[11,2.2],windup:.32,recover:.4,cooldown:1.1}),
  ATK(2,'Bola de Fogo','projectile',{range:320,minRange:90,damage:[12,2.4],windup:.55,recover:.45,cooldown:3.4,speed:340,color:'#ff7a3a',size:8})]},
};
const BOSS_TYPES={
 E:{name:'LOBO ALFA',size:'Chefe',art:'boss_E',hp:[380,30],speed:112,aggro:620,radius:34,attacks:[
  ATK(1,'Mordida Alfa','melee',{range:112,arc:1,damage:[18,2.2],windup:.42,recover:.45,cooldown:1.2}),
  ATK(2,'Investida Sombria','lunge',{range:300,minRange:120,damage:[24,2.6],windup:.6,recover:.6,cooldown:4.5,dash:640,dashTime:.4}),
  ATK(3,'SUPER · Uivo da Matilha','super',{range:420,pattern:'nova',rings:2,radius:260,damage:[26,3],windup:1.1,recover:1,cooldown:13,summon:'wolf',summonCount:2,color:'#ff3a52'})]},
 D:{name:'ARANHA RAINHA',size:'Chefe',art:'boss_D',hp:[420,32],speed:92,aggro:620,radius:34,attacks:[
  ATK(1,'Presas Reais','melee',{range:118,arc:1,damage:[18,2.2],windup:.42,recover:.45,cooldown:1.2,poison:3}),
  ATK(2,'Chuva de Teia','projectile',{range:340,minRange:100,damage:[14,2],windup:.6,recover:.5,cooldown:3.6,speed:320,color:'#f2f6f6',size:8,count:3,spread:.38,slow:1.4}),
  ATK(3,'SUPER · Ninho Venenoso','super',{range:440,pattern:'rain',count:7,blast:72,damage:[28,3],windup:1,recover:1,cooldown:12,color:'#7dff5a',poison:3})]},
 C:{name:'COMANDANTE IGRIS',size:'Chefe',art:'boss_C',hp:[480,34],speed:120,aggro:620,radius:30,attacks:[
  ATK(1,'Corte Carmesim','melee',{range:128,arc:1.3,damage:[20,2.4],windup:.38,recover:.4,cooldown:1.1}),
  ATK(2,'Investida do Cavaleiro','lunge',{range:320,minRange:120,damage:[26,2.8],windup:.55,recover:.55,cooldown:4,dash:700,dashTime:.4}),
  ATK(3,'SUPER · Tempestade de Lâminas','super',{range:420,pattern:'nova',rings:3,radius:290,damage:[24,2.8],windup:1.1,recover:1,cooldown:12,color:'#ff2a3a'})]},
 B:{name:'KARGALGAN',size:'Chefe',art:'boss_B',hp:[520,36],speed:90,aggro:640,radius:32,attacks:[
  ATK(1,'Cajado Xamânico','melee',{range:118,arc:1.1,damage:[20,2.4],windup:.45,recover:.45,cooldown:1.3}),
  ATK(2,'Orbes Malditos','projectile',{range:380,minRange:110,damage:[16,2.2],windup:.6,recover:.5,cooldown:3.4,speed:300,color:'#ff5ad0',size:9,count:5,spread:.95}),
  ATK(3,'SUPER · Ritual de Sangue','super',{range:460,pattern:'rain',count:9,blast:80,damage:[30,3.2],windup:1.1,recover:1,cooldown:12,color:'#ff3ab0',summon:'orc',summonCount:1})]},
 A:{name:'URSO ALFA',size:'Chefe',art:'boss_A',hp:[600,40],speed:96,aggro:640,radius:40,attacks:[
  ATK(1,'Garra Glacial','melee',{range:136,arc:1.2,damage:[22,2.6],windup:.45,recover:.45,cooldown:1.3}),
  ATK(2,'Terremoto','slam',{range:160,radius:178,damage:[26,3],windup:.85,recover:.7,cooldown:5}),
  ATK(3,'SUPER · Nevasca Ártica','super',{range:460,pattern:'nova',rings:3,radius:310,damage:[26,3],windup:1.2,recover:1,cooldown:12,color:'#7fe8ff',slow:2})]},
 S:{name:'REI DEMÔNIO BARAN',size:'Chefe',art:'boss_S',hp:[680,44],speed:108,aggro:660,radius:36,attacks:[
  ATK(1,'Lâmina Infernal','melee',{range:132,arc:1.25,damage:[24,2.8],windup:.4,recover:.4,cooldown:1.1}),
  ATK(2,'Relâmpago Negro','projectile',{range:420,minRange:110,damage:[20,2.6],windup:.5,recover:.45,cooldown:3,speed:440,color:'#c18bff',size:9,count:3,spread:.3}),
  ATK(3,'SUPER · Julgamento do Rei Demônio','super',{range:480,pattern:'both',rings:2,radius:280,count:8,blast:78,damage:[30,3.4],windup:1.2,recover:1.1,cooldown:11,color:'#ffcf4a'})]},
};
class Enemy{
 constructor(x,y,type,level,boss=false,opts={}){
  const def=boss?(BOSS_TYPES[type]||BOSS_TYPES.E):(MONSTER_TYPES[type]||MONSTER_TYPES.goblin),red=!!opts.red;
  Object.assign(this,{x,y,home:{x,y},alerted:false,type,level,boss,def,name:def.name,art:def.art,radius:def.radius,speed:def.speed,aggro:def.aggro,red,dmgMult:red?1.3:1,cool:0,flash:0,stun:0,facing:1,state:'chase',stateT:0,current:null,animT:rand(0,4),phaseIdx:1,elite:null,eliteName:null,slowed:0});
  this.maxhp=Math.round((def.hp[0]+def.hp[1]*level)*(red?1.35:1));this.hp=this.maxhp;
  this.attacks=def.attacks.map(a=>({...a,cd:rand(.4,1.4)+(a.kind==='super'?6:0)}));
 }
 get range(){return Math.max(...this.attacks.map(a=>a.range))}
 damageOf(a){const pm=this.boss?(this.phaseIdx>=3?1.3:this.phaseIdx>=2?1.15:1):1;return Math.round((a.damage[0]+a.damage[1]*this.level)*this.dmgMult*pm)}
 update(dt,g){
  this.flash-=dt;this.stun-=dt;this.animT+=dt;this.slowed=Math.max(0,(this.slowed||0)-dt);for(const a of this.attacks)a.cd-=dt;
  if(this.boss){const f=this.hp/this.maxhp;const ph=f<=.2?3:f<=.5?2:1;if(ph!==this.phaseIdx){this.phaseIdx=ph;g.bossPhase&&g.bossPhase(this,ph)}}
  if(this.bleed>0){this.bleed-=dt;this.bleedTick=(this.bleedTick||0)-dt;if(this.bleedTick<=0){this.bleedTick=.5;g.hit(this,3+g.player.stats.INT,false);if(!g.enemies.includes(this))return}}
  if(this.stun>0){if(this.state!=='chase'){this.state='chase';this.current=null}return}
  // Room-based awareness: a monster only notices targets standing in its own room/corridor (or,
  // once it is already hunting, in a zone right next to it). Otherwise it stays in the dark.
  const target=[g.player,...g.soldiers.filter(s=>s.state!=='REGENERATE')].filter(t=>g.canEngage(this,t)).sort((a,b)=>dist(this,a)-dist(this,b))[0];
  let p=target||g.player;
  const d=dist(this,p),ang=Math.atan2(p.y-this.y,p.x-this.x);
  if(this.state==='windup'){this.stateT-=dt;if(this.stateT>this.current.windup*.45){this.aim=ang;this.aimPos={x:p.x,y:p.y}}if(this.stateT<=0)g.enemyStrike(this,this.current);return}
  if(this.state==='lunge'){const a=this.current;g.moveActor(this,Math.cos(this.aim)*a.dash*dt,Math.sin(this.aim)*a.dash*dt);if(Math.random()<.6)g.particles.burst(this.x,this.y,this.red?'#ff4b57':'#c9d6e0',1,{speed:40});
   for(const tg of g.enemyTargets())if(!this.lungeHit.has(tg)&&dist(this,tg)<this.radius+18){this.lungeHit.add(tg);g.enemyDamage(tg,this.damageOf(a),a,this)}
   this.stateT-=dt;if(this.stateT<=0){this.state='recover';this.stateT=a.recover}return}
  if(this.state==='recover'){this.stateT-=dt;if(this.stateT<=0){this.state='chase';this.current=null}return}
  if(!target||d>this.aggro){if(!target)this.alerted=false;
   // Lost track: walk back to the spawn point of its room.
   if(!this.alerted&&this.home&&dist(this,this.home)>24){const ha=Math.atan2(this.home.y-this.y,this.home.x-this.x);if(Math.abs(this.home.x-this.x)>4)this.facing=this.home.x>this.x?1:-1;g.moveActor(this,Math.cos(ha)*this.speed*.55*dt,Math.sin(ha)*this.speed*.55*dt)}return}
  this.alerted=true;if(Math.abs(p.x-this.x)>4)this.facing=p.x>this.x?1:-1;
  const ready=this.attacks.filter(a=>a.cd<=0&&d<=a.range&&d>=(a.minRange||0)).sort((a,b)=>b.id-a.id)[0];
  if(ready){this.state='windup';this.current=ready;this.stateT=ready.windup;this.aim=ang;this.aimPos={x:p.x,y:p.y};ready.cd=ready.cooldown;for(const o of this.attacks)o.cd=Math.max(o.cd,.35);
   if(ready.kind==='super'){g.message(`⚠ ${this.name} · ${ready.name}`);g.shake(7,.5);g.sound.play('alert')}return}
  const keep=this.attacks[0].range*.72;if(d>keep){const pm=this.boss?(this.phaseIdx>=3?1.3:this.phaseIdx>=2?1.15:1):1;const sp=this.speed*pm*(this.slowed>0?.6:1)*(this.elite==='VELOZ'?1.45:1);g.moveActor(this,Math.cos(ang)*sp*dt,Math.sin(ang)*sp*dt)}
 }
}
class Boss extends Enemy{constructor(x,y,type,level,name,opts={}){super(x,y,type,level,true,opts);if(name)this.name=name}}
// ---- Shadow army -----------------------------------------------------------------------------
// Every extracted shadow keeps the type, look (shadow palette), size and attack kit of the monster
// it was raised from, plus its own level/XP. Capacity grows with the player's level and INT.
const SHADOW_GENERIC={name:'SOLDADO DAS SOMBRAS',size:'Médio',art:'shadow',hp:[90,8],speed:120,aggro:260,radius:16,attacks:[ATK(1,'Corte Sombrio','melee',{range:58,arc:1.1,damage:[10,2],windup:.12,recover:.3,cooldown:.8})]};
const ARMY_RULES={base:2,perINT:4,perLevel:5,seek:300,leash:700,regen:4,regenMP:15,xpNeed:l=>30+l*15,maxLevel:99};
// Shadow army mana: an up-front summon cost plus a per-second upkeep while the shadows are out.
// Bigger/higher-level shadows (and bosses) cost more; INT lowers every cost. Fallen shadows (regenerating) have no upkeep.
const MP_REGEN=1.2;
const ARMY_MANA={summonBase:8,summonPer:4,summonPerLv:.5,upkeepPer:.8,upkeepPerLv:.04,bossMult:2.5,intDiscount:.012,minMult:.4};
const armyManaMult=p=>Math.max(ARMY_MANA.minMult,1-p.stats.INT*ARMY_MANA.intDiscount);
const shadowMana=(d,p)=>{const m=(d.boss?ARMY_MANA.bossMult:1)*armyManaMult(p),lv=d.level||1;return{summon:(ARMY_MANA.summonPer+lv*ARMY_MANA.summonPerLv)*m,upkeep:(ARMY_MANA.upkeepPer+lv*ARMY_MANA.upkeepPerLv)*m}};
const armySummonCost=(p,army)=>army.length?Math.round(ARMY_MANA.summonBase*armyManaMult(p)+army.reduce((t,d)=>t+shadowMana(d,p).summon,0)):0;
const armyUpkeep=(p,army)=>army.reduce((t,d)=>t+shadowMana(d,p).upkeep,0);
const fmtRate=v=>(Math.round(v*10)/10).toFixed(1).replace('.',',');
const armyCap=p=>ARMY_RULES.base+Math.floor(p.stats.INT/ARMY_RULES.perINT)+Math.floor((p.level-1)/ARMY_RULES.perLevel);
const shadowDef=d=>(d.boss?BOSS_TYPES[d.type]:MONSTER_TYPES[d.type])||SHADOW_GENERIC;
// Old saves stored only {name,rank,kills}: recover the monster type from its name when possible.
function normalizeShadow(d,lvl=1){if(!d.type){const b=Object.entries(BOSS_TYPES).find(([,v])=>v.name===d.name),m=Object.entries(MONSTER_TYPES).find(([,v])=>v.name===d.name);if(b){d.type=b[0];d.boss=true}else if(m){d.type=m[0];d.boss=false}}
 d.boss=!!d.boss;d.level=Math.max(1,d.level||lvl);d.xp=d.xp||0;d.kills=d.kills||0;d.rank=d.rank||(d.boss?'Comandante':'Normal');d.art=shadowDef(d).art;return d}
class ShadowSoldier{
 constructor(data,i,pos){const g=game,p=g.player;normalizeShadow(data,p.level);this.data=data;this.def=shadowDef(data);this.type=data.type||'shadow';this.boss=data.boss;this.name=data.name;this.art=this.def.art;this.radius=this.def.radius;this.isShadow=true;this.slot=i;
  const sp=pos||{x:p.x,y:p.y};this.x=sp.x;this.y=sp.y;this.cool=0;this.state='FOLLOW';this.regen=0;this.facing=1;this.animT=rand(0,4);this.act=null;this.hurtT=0;
  this.unique=UNIQUE_SHADOWS[data.type]||null;if(this.unique){this.data.unique=this.unique.key;this.name=this.unique.name}
  this.attacks=this.def.attacks.map(a=>({...a,cd:rand(.2,.8)+(a.kind==='super'?4:0)}));
  if(this.unique&&this.unique.key==='igris')this.attacks.push(ATK(4,'Corte Carmesim','lunge',{range:240,minRange:60,damage:[26,3],windup:.3,recover:.4,cooldown:4,dash:680,dashTime:.3}));
  this.refresh();this.hp=this.maxhp}
 get level(){return this.data.level}
 get power(){return (1+game.player.stats.INT*.02)*game.shadowPowerMult()}
 get speed(){return Math.max(125,this.def.speed*1.15*(this.unique&&this.unique.mod.speed||1))}
 refresh(){const d=this.def;this.maxhp=Math.round((d.hp[0]+d.hp[1]*this.level)*this.power)}
 damageOf(a){return Math.round((a.damage[0]+a.damage[1]*this.level)*this.power)}
 gainXP(e,g){const d=this.data;if(d.level>=ARMY_RULES.maxLevel)return;d.xp+=(e.boss?60:10)+e.level*3;let up=false;while(d.xp>=ARMY_RULES.xpNeed(d.level)&&d.level<ARMY_RULES.maxLevel){d.xp-=ARMY_RULES.xpNeed(d.level);d.level++;up=true}
  if(up){const r=this.hp/this.maxhp;this.refresh();this.hp=Math.max(this.hp,Math.round(this.maxhp*Math.max(r,.5)));g.floats.push({x:this.x,y:this.y-60,text:`SOMBRA LV ${d.level}`,life:1.1,color:'#c99bff',size:13});g.particles.burst(this.x,this.y-20,'#8ff0ff',16,{speed:120,lift:40})}}
 update(dt,g,i){
  this.cool-=dt;this.animT+=dt;this.hurtT-=dt;for(const a of this.attacks)a.cd-=dt;
  if(this.state==='REGENERATE'){this.regen-=dt;if(this.regen<=0&&g.player.mp>=ARMY_RULES.regenMP){g.player.mp-=ARMY_RULES.regenMP;this.hp=this.maxhp;this.state='FOLLOW';g.particles.burst(this.x,this.y,'#a855f7',20)}return}
  const p=g.player;
  // Left behind (walls, long dash, other room): re-materialise on a free spot next to the master.
  if(dist(this,p)>ARMY_RULES.leash){const sp=g.findFreeSpot(p.x,p.y,this.radius,40,220,{los:true,avoid:g.soldiers.filter(s=>s!==this),sep:28,angle:(p.angle||0)+Math.PI});if(sp){g.particles.burst(this.x,this.y,'#3b1466',10,{speed:60});this.x=sp.x;this.y=sp.y;this.act=null;g.particles.burst(this.x,this.y-10,'#a855f7',16,{speed:90,lift:30})}}
  if(this.act){this.runAction(dt,g);return}
  // Separação inteligente: círculo igual para todas as sombras; chefes têm o seu maior.
  for(const o of g.soldiers){if(o===this||o.state==='REGENERATE')continue;const dx=this.x-o.x,dy=this.y-o.y,dd=Math.hypot(dx,dy)||.01;const min=(this.boss||o.boss)?Math.max(this.radius,o.radius)*1.15:24;if(dd<min){const push=Math.min(90*dt,(min-dd)*.6);g.moveActor(this,dx/dd*push,dy/dd*push)}}
  {const dx=this.x-p.x,dy=this.y-p.y,dd=Math.hypot(dx,dy)||.01;if(dd<22){g.moveActor(this,dx/dd*80*dt,dy/dd*80*dt)}}
  // ORDEM · MANTER POSIÇÃO: a sombra segura a posição e não persegue.
  if(g.armyOrder==='HOLD'){this.state='HOLD';return}
  // ATACAR prioriza o alvo do jogador; DEFENDER só engaja o que chega perto dele.
  const pt=g.aimTarget?g.aimTarget():null;let pool=g.enemies.filter(e=>g.shadowCanTarget(e));
  if(g.armyOrder==='DEFEND')pool=pool.filter(e=>dist(e,p)<380);
  const target=pool.filter(e=>dist(e,this)<ARMY_RULES.seek).sort((a,b)=>{if(pt&&(a===pt)!==(b===pt))return a===pt?-1:1;return dist(a,this)-dist(b,this)})[0];
  if(target){const d=dist(this,target),ang=Math.atan2(target.y-this.y,target.x-this.x);if(Math.abs(target.x-this.x)>3)this.facing=target.x>this.x?1:-1;
   const ready=this.attacks.filter(a=>a.cd<=0&&d<=a.range+target.radius*.5&&d>=(a.minRange||0)).sort((a,b)=>b.id-a.id)[0];
   if(ready){this.state='ATTACK';ready.cd=ready.cooldown*.9;for(const o of this.attacks)o.cd=Math.max(o.cd,.3);this.act={a:ready,phase:'windup',t:ready.windup*.6,aim:ang,tg:target,pos:{x:target.x,y:target.y}};return}
   this.state='ENGAGE';const keep=this.attacks[0].range*.7+target.radius*.4;if(d>keep)g.moveActor(this,Math.cos(ang)*this.speed*dt,Math.sin(ang)*this.speed*dt);return}
  // Formation behind the player; slots that fall inside a wall collapse onto the player.
  this.state='FOLLOW';const n=Math.max(1,g.soldiers.length),row=Math.floor(i/6),a0=(p.angle||0)+Math.PI+((i%6)-(Math.min(6,n)-1)/2)*.55,r=(g.armyOrder==='DEFEND'?44:58)+row*34;
  let goal={x:p.x+Math.cos(a0)*r,y:p.y+Math.sin(a0)*r*.8};if(!g.isWalkable(goal.x,goal.y,Math.min(this.radius,20)))goal={x:p.x,y:p.y};
  const d=dist(this,goal);if(Math.abs(goal.x-this.x)>3&&d>8)this.facing=goal.x>this.x?1:-1;
  if(d>(goal.x===p.x&&goal.y===p.y?40:8)){const sp=this.speed*(d>220?1.5:1);g.moveActor(this,(goal.x-this.x)/d*Math.min(sp*dt,d),(goal.y-this.y)/d*Math.min(sp*dt,d))}}
 runAction(dt,g){const A=this.act,a=A.a;A.t-=dt;
  if(A.phase==='windup'){if(A.tg&&g.enemies.includes(A.tg)&&A.t>a.windup*.25){A.aim=Math.atan2(A.tg.y-this.y,A.tg.x-this.x);A.pos={x:A.tg.x,y:A.tg.y}}if(A.t<=0)g.shadowStrike(this,A);return}
  if(A.phase==='lunge'){g.moveActor(this,Math.cos(A.aim)*a.dash*dt,Math.sin(A.aim)*a.dash*dt);if(Math.random()<.6)g.particles.burst(this.x,this.y,'#7b2cff',1,{speed:40});
   for(const e of [...g.enemies])if(!A.hit.has(e)&&dist(this,e)<this.radius+e.radius+10){A.hit.add(e);g.hit(e,this.damageOf(a),false,this,A.aim)}
   if(A.t<=0){A.phase='recover';A.t=a.recover*.6}return}
  if(A.t<=0){this.act=null;this.state='ENGAGE'}}
 hurt(amount,g){if(this.state==='REGENERATE')return;const armor=this.unique&&this.unique.mod.armor||0;this.hp-=amount*(1-armor);this.hurtT=.15;if(this.hp<=0){this.hp=0;this.act=null;this.state='REGENERATE';this.regen=ARMY_RULES.regen;g.particles.burst(this.x,this.y,'#a855f7',20)}}
}
const FOG_RULES={perAdjacent:15};
const GATE_MONSTERS=idx=>idx<2?['goblin','wolf','spider']:idx<4?['orc','orc','demon']:idx===4?['bear','wolf']:['demon','orc'];
const fmtTime=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
function attackLine(a,level){const kind={melee:'Corpo a corpo',slam:'Área',projectile:'Projétil',lunge:'Investida',super:'Super'}[a.kind];return `<div class="atk-row ${a.kind==='super'?'super':''}"><b>ATQ ${a.id}</b><span>${a.name.replace('SUPER · ','')}</span><small>${kind} · alcance ${a.radius||a.range} · dano ${Math.round(a.damage[0]+a.damage[1]*level)}</small></div>`}
function monsterCard(def,level,boss=false){return `<div class="beast ${boss?'boss':''}"><div class="beast-head"><b>${def.name}</b><span>${def.size}</span></div><div class="beast-stats"><span>HP <b>${Math.round(def.hp[0]+def.hp[1]*level)}</b></span><span>VEL <b>${def.speed}</b></span><span>ALCANCE <b>${Math.max(...def.attacks.map(a=>a.range))}</b></span></div>${def.attacks.map(a=>attackLine(a,level)).join('')}</div>`}
class UIManager{static open(type){game.panel=type;let p=game.player,box=$('#modal');box.classList.remove('hidden');let content='';
 if(type==='status'){content=`<p>Nível ${p.level} · Rank ${p.rank} · ${CLASSES[p.playerClass].name} · EXP ${p.xp}/${p.level*100} <br>Pontos: <b>${p.points}</b> · Talentos: <b>${p.talentPoints||0}</b> <button class="action" data-do="talents">ÁRVORE DE TALENTOS</button></p>`+Object.entries(p.stats).map(([k,v])=>`<div class="stat-row"><b>${k}</b><span>${v} <button class="action" data-stat="${k}">+</button></span></div>`).join('')+`<p class="muted">ATQ ${Math.floor(p.atk)} · DEF ${Math.min(50,p.armor).toFixed(0)}% · CRÍTICO ${game.critChance().toFixed(1)}% · SOMBRAS ${game.army.length}/${game.shadowCap()}<br>VISÃO NA DUNGEON: ${p.stats.PER>=FOG_RULES.perAdjacent?'SALAS ADJACENTES REVELADAS':`APENAS A SALA ATUAL (PER ${FOG_RULES.perAdjacent} revela salas adjacentes)`}<br>PONTOS DE CAÇADOR: ${(game.hunter||{}).points||0} · RANK DA ASSOCIAÇÃO ${(game.hunter||{}).rank||'E'}</p>`+(p.level>=CLASS_CHANGE_LEVEL&&p.playerClass<1?`<p style="color:#ffd27a">★ MUDANÇA DE CLASSE DISPONÍVEL · ENFRENTE O CARTENON (DUNGEON C)</p>`:'')}
 else if(type==='inventory'){content=`<p>OURO: <b>${p.gold} G</b></p>${p.owned.map(i=>`<div class="item-row"><b>⚔ ${weapons[i].name}</b><span>ATQ +${weapons[i].damage} <button class="action" data-equip="${i}">${i===p.weapon?'EQUIPADA':'EQUIPAR'}</button></span></div>`).join('')}`+(p.items&&p.items.length?p.items.map(id=>{const it=ITEMS[id];if(!it)return'';const eq=p.equipped[it.slot]===id;return `<div class="item-row"><b style="color:${it.color}">★ ${it.name}</b><span>${it.rarity} · ${it.slot==='cape'?'DEF +'+it.armor:(it.damage?'ATQ +'+it.damage:'')} <button class="action" data-item-equip="${id}">${eq?'EQUIPADO':'EQUIPAR'}</button></span></div>`}).join(''):'')+`<div class="item-row"><b>♥ Poção de vida</b><span>${p.hppots} unidades</span></div><div class="item-row"><b>♦ Poção de mana</b><span>${p.mppots} unidades</span></div><button class="action" data-do="export">EXPORTAR SAVE (CÓDIGO)</button><button class="action" data-do="import">IMPORTAR SAVE</button>`}
 else if(type==='talents'){const T=TALENTS;content=`<p>Talentos disponíveis: <b>${p.talentPoints||0}</b> · Suba de nível para ganhar mais.</p>`+Object.entries(T).map(([attr,list])=>`<h2>${attr}</h2>`+list.map(t=>{const lv=talentLevel(t.id);return `<div class="item-row"><b>${t.name}</b><span>NV ${lv}/${t.max} · ${t.desc} <button class="action" data-talent="${t.id}" ${lv>=t.max?'disabled':''}>+1</button></span></div>`}).join('')).join('')+`<button class="action" data-open="status">VOLTAR</button>`}
 else if(type==='contracts'){const cs=game.contracts||[];content=`<p>ASSOCIAÇÃO DOS CAÇADORES · Rank do caçador: <b>${(game.hunter||{}).rank||'E'}</b> (${(game.hunter||{}).points||0} pts)</p>`+(cs.length?cs.map((c,i)=>`<div class="item-row"><b>RANK ${c.rank} · CONTRATO DE ABATES</b><span>${c.kills}/${c.need} abates · ${c.reward} G · 20 pts caçador <button class="action" data-contract="${i}" ${c.done||c.taken?'disabled':''}>${c.done?'CONCLUÍDO':c.taken?'EM ANDAMENTO':'ACEITAR'}</button></span></div>`).join(''):'<p class="muted">Nenhum contrato no momento. Volte em alguns instantes.</p>')+`<button class="action" data-open="status">FECHAR</button>`}
 else if(type==='export'){content=`<p>Cole este código em outro aparelho (PC ↔ celular):</p><textarea readonly style="width:100%;height:90px;font-size:11px">${SaveSystem.export(game)}</textarea><button class="action" data-open="inventory">VOLTAR</button>`}
 else if(type==='import'){content=`<p>Cole o código de save:</p><textarea id="importCode" style="width:100%;height:90px;font-size:11px"></textarea><button class="action" data-do="importRun">IMPORTAR</button>`}
 else if(type==='army'){const cap=armyCap(p);game.army.forEach(s=>normalizeShadow(s,p.level));content=`<p>SLOTS: <b>${game.army.length} / ${cap}</b> · ${game.summoned?'INVOCADOS':'NA RESERVA'}</p><p class="muted">Capacidade = ${ARMY_RULES.base} + INT/${ARMY_RULES.perINT} + 1 a cada ${ARMY_RULES.perLevel} níveis. Próximo slot: INT ${(Math.floor(p.stats.INT/ARMY_RULES.perINT)+1)*ARMY_RULES.perINT} ou nível ${(Math.floor((p.level-1)/ARMY_RULES.perLevel)+1)*ARMY_RULES.perLevel+1}.</p>`+(game.army.length?(()=>{const cost=armySummonCost(p,game.army),up=armyUpkeep(p,game.army),drain=game.armyDrain(),net=MP_REGEN-(game.summoned?drain:up);return `<div class="army-mana"><div><small>INVOCAR</small><b>${cost} MP</b></div><div><small>MANUTENÇÃO</small><b>−${fmtRate(game.summoned?drain:up)} MP/s</b></div><div><small>SALDO C/ REGEN.</small><b class="${net<0?'neg':'pos'}">${net<0?'−':'+'}${fmtRate(Math.abs(net))} MP/s</b></div><div><small>${game.summoned?'TEMPO ATIVO':'DURAÇÃO C/ MP ATUAL'}</small><b>${game.summoned?fmtTime(game.armyT||0):net<0?fmtTime(Math.max(0,p.mp-cost)/-net):'∞'}</b></div></div><p class="muted">A invocação cobra o custo inicial e cada sombra em campo consome mana por segundo (sombras caídas em regeneração não consomem). Sem mana, o exército retorna sozinho. INT reduz todos os custos (−${Math.round((1-armyManaMult(p))*100)}% agora).</p>`})():'')+(game.army.length?game.army.map((s,i)=>{const d=shadowDef(s),m=shadowMana(s,p);return `<div class="item-row"><b>♟ ${s.name}<small class="muted"> · ${d.size||''} · ${d.attacks.map(a=>a.name.replace('SUPER · ','★ ')).join(' / ')}</small><i class="mana-tag">INVOCAR ${Math.round(m.summon)} MP · MANUTENÇÃO −${fmtRate(m.upkeep)} MP/s</i></b><span>${s.rank} · LV ${s.level} · ${s.kills} abates <button class="action" data-dismiss="${i}">DISPENSAR</button></span></div>`}).join(''):'<p class="muted">Derrote inimigos e pressione E perto de seus corpos para extrair sombras.</p>')+`<button class="action" data-do="summon">INVOCAR / GUARDAR [R]</button>`}
 else if(type==='shop'){content=game.world.kind!=='hub'?'<p>A loja está disponível apenas na cidade.</p>':`<p>OURO: ${p.gold} G</p>`+weapons.map((w,i)=>`<div class="item-row"><b>${w.name} <small>ATQ +${w.damage}</small></b><button class="action" data-buy="${i}">${i===p.weapon?'EQUIPADA':p.owned.includes(i)?'EQUIPAR':w.price+' G'}</button></div>`).join('')+`<button class="action" data-potion="hp">POÇÃO HP · 40 G</button><button class="action" data-potion="mp">POÇÃO MP · 40 G</button>`}
 else if(type==='gate'){const gate=game.selectedGate;if(!gate||!game.gates.list.includes(gate)){content='<p>Este gate já se fechou.</p>'}else{const idx=RANKS.indexOf(gate.rank),boss=BOSS_TYPES[gate.rank],th=themeById(gate.theme),types=[...new Set(th?th.mon:GATE_MONSTERS(idx))];
  content=`<div class="gate-card ${gate.red?'red':'blue'}"><div class="gate-rank">${gate.rank}</div><div><b>${gate.red?'GATE VERMELHO':'GATE AZUL'} · RANK ${gate.rank}</b><small>${gate.district} · FECHA EM <span id="gateTime">${fmtTime(gate.life)}</span></small><small>${gate.red?'Monstros +35% HP e +30% dano · recompensas x2':'Dificuldade padrão · recompensas x1'}</small></div></div>`+
  (th?`<div class="gate-theme" style="--th:${th.pal.acc}"><small>${th.arc.toUpperCase()}</small><b>${th.name}</b><p>${th.desc}</p>${th.hazards?`<em>⚠ ${th.hazards.map(h=>h.name).join(' · ')}</em>`:''}</div>`:'')+`<p class="muted">MONSTROS: ${types.map(t=>MONSTER_TYPES[t].name).join(' · ')} — CHEFE: <b>${boss.name}</b></p><button class="action wide" data-gate="${gate.rank}" data-red="${gate.red?1:0}" data-theme="${gate.theme||''}">ENTRAR NO GATE</button>`}}
 else if(type==='bestiary'){const lv=1+Math.max(0,RANKS.indexOf(game.world.rank||'E'))*8;const kills=t=>((game.bestiary||{})[t]||{}).kills||0;const badge=t=>{const k=kills(t);return `<i class="mana-tag" style="color:${k>=50?'#ffd27a':'#8fb4c8'}">${k>=50?'✔ COMPLETO · +4% DANO':k+' / 50 abates'}</i>`};
  content=`<p class="muted">Atributos por tipo (nível ${lv}). 50 abates do mesmo tipo concedem +4% de dano contra ele. Ataque 3 (Super) é exclusivo dos chefes.</p><h2>MONSTROS</h2>`+Object.entries(MONSTER_TYPES).map(([k,d])=>`<div class="beast">${badge(k)}${monsterCard(d,lv)}</div>`).join('')+'<h2>CHEFES</h2>'+RANKS.map((r,i)=>`<div class="beast boss">${badge(r)}${monsterCard(BOSS_TYPES[r],3+i*8,true)}</div>`).join('')}
 else if(type==='pause'){content='<p>O sistema está aguardando.</p><button class="action" data-do="resume">CONTINUAR</button><button class="action" data-do="save">SALVAR JOGO</button><button class="action" data-open="menu">CONFIGURAÇÕES</button>'}
 else if(type==='menu'){content=Mobile.menuHTML()}
 else if(type==='dead'){content='<p>Você foi derrotado. O sistema lhe concedeu uma nova chance.</p><button class="action" data-do="revive">RETORNAR À ASSOCIAÇÃO</button>'}
 box.innerHTML=`<div class="modal-box"><div class="modal-title">◈ &nbsp; ${ {status:'STATUS',inventory:'INVENTÁRIO',army:'EXÉRCITO DAS SOMBRAS',shop:'LOJA DO SISTEMA',gate:'GATE DETECTADO',bestiary:'BESTIÁRIO DO SISTEMA',pause:'SISTEMA PAUSADO',menu:'MENU DO SISTEMA',dead:'VOCÊ FOI DERROTADO',talents:'ÁRVORE DE TALENTOS',contracts:'CONTRATOS DA ASSOCIAÇÃO',export:'EXPORTAR SAVE',import:'IMPORTAR SAVE'}[type]} ${type==='dead'?'':'<button data-do="close">×</button>'}</div>${content}</div>`}
 static close(){game.panel=null;$('#modal').classList.add('hidden')}}
// HUD panels can be minimised individually ([−]/[+]) or all at once (H / HUD button).
// Collapsed state persists in localStorage so the screen stays as clean as the player left it.
class HudManager{
 static init(){this.key=Mobile.on?'shadow-protocol-hud-touch':'shadow-protocol-hud';try{this.state=JSON.parse(localStorage.getItem(this.key))||(Mobile.on?{quest:true,gates:true}:{})}catch{this.state={}}
  for(const el of document.querySelectorAll('[data-hud]'))this.apply(el.dataset.hud);this.applyClean();if(this.bound)return;this.bound=true;
  for(const b of document.querySelectorAll('[data-toggle]'))b.addEventListener('click',e=>{e.stopPropagation();this.toggle(b.dataset.toggle)});
  const all=document.querySelector('#hudToggle');if(all&&all.addEventListener)all.addEventListener('click',()=>this.toggleClean())}
 static apply(id){const el=document.querySelector(`[data-hud="${id}"]`);if(!el||!el.classList)return;const c=!!this.state[id];el.classList.toggle('collapsed',c);const b=el.querySelector&&el.querySelector(`[data-toggle="${id}"]`);if(b){b.textContent=c?'+':'−';b.setAttribute&&b.setAttribute('aria-label',(c?'Maximizar ':'Minimizar ')+id);b.title=c?'Maximizar':'Minimizar'}}
 static toggle(id){this.state[id]=!this.state[id];this.apply(id);this.save()}
 static applyClean(){const hud=document.querySelector('#hud');if(hud&&hud.classList)hud.classList.toggle('clean',!!this.state.clean);const b=document.querySelector('#hudToggle');if(b)b.textContent=this.state.clean?'◈ MOSTRAR HUD [H]':'◈ OCULTAR HUD [H]'}
 static toggleClean(){this.state.clean=!this.state.clean;this.applyClean();this.save()}
 static save(){try{localStorage.setItem(this.key||'shadow-protocol-hud',JSON.stringify(this.state))}catch{}}
}
// ---- Mobile / touch -----------------------------------------------------------------------------
// Settings persist per device. Touch mode turns on automatically on coarse-pointer devices (or on the
// first touch), shows a floating analog stick + action cluster, compacts the HUD, auto-aims attacks
// and offers browser fullscreen with landscape lock. Zoom scales the canvas so small/short screens
// still show enough of the world; "light" quality drops glows and halves particles when FPS sags.
const Settings={key:'shadow-protocol-settings',d:{touch:'auto',zoom:'auto',quality:'auto',ctl:1,alpha:.9,lefty:false,vibrate:true,autoFull:true,shake:true,colorblind:false,bigtext:false,fps:false,music:true,sfx:true,ultralight:false},
 load(){try{Object.assign(this.d,JSON.parse(localStorage.getItem(this.key))||{})}catch{}return this},
 save(){try{localStorage.setItem(this.key,JSON.stringify(this.d))}catch{}}};
function liveGame(){try{return game}catch(e){return null}}
const Mobile={on:false,light:false,lastTouch:-1e9,stickId:null,cache:{},
 mm(q){return typeof matchMedia==='function'&&matchMedia(q).matches},
 detect(){const t=Settings.d.touch;if(t==='on')return true;if(t==='off')return false;return this.mm('(pointer:coarse)')||(typeof navigator!=='undefined'&&navigator.maxTouchPoints>0&&this.mm('(hover:none)'))},
 standalone(){return this.mm('(display-mode: fullscreen)')||this.mm('(display-mode: standalone)')||(typeof navigator!=='undefined'&&navigator.standalone===true)},
 init(){Settings.load();this.on=this.detect();
  if(typeof window!=='undefined'&&window.addEventListener){
   // Hybrid devices: the first real touch switches to touch mode (unless the player forced it off).
   window.addEventListener('touchstart',()=>{this.lastTouch=performance.now();if(!this.on&&Settings.d.touch==='auto'){this.on=true;this.apply();HudManager.init()}},{capture:true,passive:true});
   window.addEventListener('orientationchange',()=>setTimeout(()=>{const g=liveGame();if(g)g.resize()},250))}
  if(typeof document!=='undefined'&&document.addEventListener){
   // Mobile browsers freeze or kill background tabs: save and pause when the page is hidden.
   document.addEventListener('visibilitychange',()=>{const game=liveGame();if(document.hidden&&game&&game.started){SaveSystem.save(game);if(!game.panel)UIManager.open('pause')}});
   for(const ev of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(ev,()=>{this.syncFull();setTimeout(()=>{const g=liveGame();if(g)g.resize()},120)})}
  const skip=$('#rotateSkip');if(skip)skip.onclick=()=>{document.body.classList.add('allow-portrait')};
  this.apply();if(Settings.d.quality==='light')this.setLight(true)},
 apply(){const b=typeof document!=='undefined'&&document.body,d=Settings.d;if(b&&b.classList){b.classList.toggle('touch',this.on);b.classList.toggle('lefty',!!d.lefty);b.classList.toggle('colorblind',!!d.colorblind);b.classList.toggle('bigtext',!!d.bigtext);b.classList.toggle('ultralight',!!d.ultralight);if(b.style&&b.style.setProperty){b.style.setProperty('--ctl',d.ctl);b.style.setProperty('--ctl-alpha',d.alpha)}}
  const g=liveGame(),t=$('#touch');if(t&&t.classList)t.classList.toggle('hidden',!this.on||!(g&&g.started));
  if(this.on)this.bind();this.syncFull();if(g&&g.input){g.input.touchMode=this.on;g.resize()}},
 // Canvas pixels per CSS pixel: AUTO keeps ~460 world px of height visible on short phone screens.
 scale(W,H){const z=Settings.d.zoom;if(z!=='auto')return clamp(+z||1,.5,1.6);return clamp(Math.min(H/460,W/820),.62,1)},
 buzz(ms=8){if(Settings.d.vibrate&&typeof navigator!=='undefined'&&navigator.vibrate)try{navigator.vibrate(ms)}catch{}},
 canFull(){const el=document.documentElement;return !!(el&&(el.requestFullscreen||el.webkitRequestFullscreen))},
 isFull(){return !!(document.fullscreenElement||document.webkitFullscreenElement)},
 async enterFull(){const el=document.documentElement;if(!this.canFull()){if(!this.standalone())game.message('TELA CHEIA: USE "ADICIONAR À TELA DE INÍCIO" NO MENU DO NAVEGADOR');return}
  try{await (el.requestFullscreen?el.requestFullscreen({navigationUI:'hide'}):el.webkitRequestFullscreen())}catch(e){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(e){}},
 exitFull(){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}},
 toggleFull(){if(this.isFull())this.exitFull();else this.enterFull()},
 syncFull(){const b=typeof document!=='undefined'&&$('#tFull');if(!b||!b.classList)return;b.classList.toggle('hidden',this.standalone()&&!this.isFull());const f=this.isFull();if(b.dataset.full!==String(f)){b.dataset.full=String(f);b.innerHTML=f?'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>':'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';b.title=f?'Sair da tela cheia':'Tela cheia'}},
 onStart(){if(this.on&&Settings.d.autoFull&&!this.isFull()&&!this.standalone())this.enterFull()},
 setLight(v){this.light=v;const b=document.body;if(b&&b.classList)b.classList.toggle('lite',v);
  try{if(v)Object.defineProperty(ctx,'shadowBlur',{configurable:true,get:()=>0,set:()=>{}});else delete ctx.shadowBlur}catch{}
  const g=liveGame();if(g&&g.particles){g.particles.density=v?.35:1;g.particles.cap=v?300:900}
  if(v&&g&&g.drawDarkness)g._darkOff=true;else if(g)g._darkOff=false},
 perf(dt){const q=Settings.d.quality;if(q!=='auto'||this.light||!game.started||game.panel)return;this.ema=(this.ema||1/60)*.95+dt*.05;
  if(this.ema>1/38){this.slowT=(this.slowT||0)+dt;if(this.slowT>3){this.setLight(true);game.message('MODO LEVE ATIVADO PARA MELHORAR O DESEMPENHO')}}else this.slowT=0},
 set(k,v){const d=Settings.d;if(k==='full'){this.toggleFull();return}
  if(k==='hudmin'){for(const el of document.querySelectorAll('[data-hud]'))HudManager.state[el.dataset.hud]=true;for(const el of document.querySelectorAll('[data-hud]'))HudManager.apply(el.dataset.hud);HudManager.save();return}
  if(k==='hudreset'){HudManager.state={clean:false};for(const el of document.querySelectorAll('[data-hud]'))HudManager.apply(el.dataset.hud);HudManager.applyClean();HudManager.save();return}
  d[k]=v==='true'?true:v==='false'?false:(v!==''&&!isNaN(+v))?+v:v;Settings.save();
  if(k==='quality')this.setLight(v==='light');if(k==='ultralight'){this.setLight(!!v||Settings.d.quality==='light');const g=liveGame();if(g&&g.particles){g.particles.density=v?.25:1;g.particles.cap=v?180:900}}if(k==='touch'){this.on=this.detect();HudManager.init()}
  if(k==='music'||k==='sfx'){const g=liveGame();if(g&&g.music)g.music.enabled=Settings.d.music;if(g&&g.sound)g.sound.enabled=Settings.d.sfx}
  if(k==='fps'){const g=liveGame();if(g)g.fps=Settings.d.fps?1:0}
  this.apply()},
 menuHTML(){const d=Settings.d,opt=(k,list)=>list.map(([v,l])=>`<button class="action opt ${String(d[k])===String(v)?'on':''}" data-set="${k}" data-val="${v}">${l}</button>`).join(''),row=(t,h,n='')=>`<div class="set-row"><span>${t}${n?`<small>${n}</small>`:''}</span><div>${h}</div></div>`;
  return `<div class="menu-grid">${[['status','◈ STATUS'],['inventory','✚ INVENTÁRIO'],['army','♟ SOMBRAS'],['shop','✦ LOJA'],['bestiary','☠ BESTIÁRIO']].map(([k,l])=>`<button class="action big" data-open="${k}">${l}</button>`).join('')}<button class="action big" data-do="save">▣ SALVAR</button></div>
  <h2>TELA</h2>${row('Tela cheia',`<button class="action" data-set="full">${this.isFull()?'SAIR DA TELA CHEIA':'ATIVAR TELA CHEIA'}</button>`,this.canFull()?'':'iPhone: Compartilhar → Adicionar à Tela de Início')}
  ${row('Tela cheia ao iniciar',opt('autoFull',[[true,'SIM'],[false,'NÃO']]))}
  ${row('Zoom da câmera',opt('zoom',[['auto','AUTO'],[.7,'70%'],[.85,'85%'],[1,'100%'],[1.2,'120%']]),'Menor = enxerga mais do mapa')}
  ${row('Qualidade gráfica',opt('quality',[['auto','AUTO'],['high','ALTA'],['light','LEVE']]),this.light?'Modo leve ativo':'')}
  ${row('Perfil ultra leve',opt('ultralight',[[false,'DESLIGADO'],[true,'LIGADO']]),'Menos partículas, sem brilho e sem escuridão')}
  ${row('Tremor de tela',opt('shake',[[true,'NORMAL'],[false,'REDUZIDO']]),'Acessibilidade: reduz o impacto visual')}
  ${row('Filtro para daltônicos',opt('colorblind',[[false,'DESLIGADO'],[true,'LIGADO']]),'Hitboxes e telegraphs em azul/laranja')}
  ${row('Texto maior',opt('bigtext',[[false,'DESLIGADO'],[true,'LIGADO']]),'Acessibilidade: interface e avisos maiores')}
  ${row('Medidor de FPS',opt('fps',[[false,'DESLIGADO'],[true,'LIGADO']]),'Mostra os quadros por segundo no canto')}
  ${row('Música do Sistema',opt('music',[[true,'LIGADA'],[false,'DESLIGADA']]),'Trilha procedural por tema de mapa')}
  ${row('Efeitos sonoros',opt('sfx',[[true,'LIGADOS'],[false,'DESLIGADOS']]),'Sons espaciais de combate')}
  ${row('Interface',`<button class="action" data-set="hudmin">MINIMIZAR PAINÉIS</button><button class="action" data-set="hudreset">RESTAURAR</button>`)}
  <h2>CONTROLES DE TOQUE</h2>${row('Controles na tela',opt('touch',[['auto','AUTO'],['on','SEMPRE'],['off','NUNCA']]))}
  ${row('Tamanho dos botões',opt('ctl',[[.85,'P'],[1,'M'],[1.18,'G']]))}
  ${row('Opacidade',opt('alpha',[[.5,'50%'],[.7,'70%'],[.9,'90%']]))}
  ${row('Analógico',opt('lefty',[[false,'ESQUERDA'],[true,'DIREITA']]),'Direita = modo canhoto')}
  ${row('Vibração',opt('vibrate',[[true,'LIGADA'],[false,'DESLIGADA']]))}
  <p class="muted">Toque: analógico em qualquer ponto da metade esquerda · ATAQUE (segure para combo, mira automática no inimigo mais próximo) · » esquiva · 1/2/3 habilidades · R sombras · botão de interação aparece no centro.</p>`},
 // ---- input wiring ----
 bind(){if(this.bound||typeof document==='undefined')return;const zone=$('#stickZone'),base=$('#stickBase'),knob=$('#stickKnob');if(!zone||!zone.addEventListener)return;this.bound=true;
  const hot=[...document.querySelectorAll('.hotbar .hot b svg')];for(const b of document.querySelectorAll('#actions [data-hot]')){const svg=hot[+b.dataset.hot];if(svg)b.querySelector('.ico').appendChild(svg.cloneNode(true))}
  const atk=document.querySelector('#actions .atk .ico');if(atk)atk.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 31 27 9l6-2-2 6L13 33Z" fill="#c9fbff" stroke="#52daff" stroke-width="2"/><path d="m8 27 7 7M6 33l5-5" stroke="#91d6f3" stroke-width="2.5"/></svg>';
  const reset=()=>{base.classList.remove('active');base.style.left='';base.style.top='';knob.style.transform='';game.input.stick={x:0,y:0,mag:0}};
  const move=e=>{const R=(base.offsetWidth||120)/2;let dx=e.clientX-this.sx,dy=e.clientY-this.sy,m=Math.hypot(dx,dy);
   // Dragging past the rim pulls the base along, so the thumb never "falls off" the stick.
   if(m>R){this.sx+=dx/m*(m-R);this.sy+=dy/m*(m-R);dx=e.clientX-this.sx;dy=e.clientY-this.sy;m=R;base.style.left=this.sx+'px';base.style.top=this.sy+'px'}
   const k=m/R;knob.style.transform=`translate(${dx}px,${dy}px)`;game.input.stick={x:m?dx/m*k:0,y:m?dy/m*k:0,mag:k}};
  zone.addEventListener('pointerdown',e=>{if(this.stickId!==null||!game.started)return;e.preventDefault();this.stickId=e.pointerId;try{zone.setPointerCapture(e.pointerId)}catch{}this.sx=e.clientX;this.sy=e.clientY;base.style.left=this.sx+'px';base.style.top=this.sy+'px';base.classList.add('active');move(e)});
  zone.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId){e.preventDefault();move(e)}});
  const end=e=>{if(e.pointerId!==this.stickId)return;this.stickId=null;reset()};zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);zone.addEventListener('lostpointercapture',end);
  const keyOf={dash:'shift',skill1:'1',skill2:'2',skill3:'3',summon:'r',hp:'q',mp:'f'};
  for(const b of document.querySelectorAll('#touch [data-t]')){const t=b.dataset.t;
   b.addEventListener('contextmenu',e=>e.preventDefault());
   b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{b.setPointerCapture(e.pointerId)}catch{}b.classList.add('down');this.buzz();
    if(t==='attack'){game.input.touchAttack=true;game.key(' ')}else if(keyOf[t])game.key(keyOf[t]);else if(t==='menu'){if(game.started&&!game.panel)UIManager.open('menu');else if(game.panel&&game.panel!=='dead')UIManager.close()}else if(t==='hud')HudManager.toggleClean();else if(t==='fullscreen')this.toggleFull();else if(t==='order'){game.cycleArmyOrder()}else if(t==='jinho'){game.story.jinho===2?game.spawnAlly(PEOPLE.hunters[2],'YOO JIN-HO'):game.message('JIN-HO AINDA NÃO SE JUNTOU A VOCÊ');UIManager.close()}});
   const up=()=>{b.classList.remove('down');if(t==='attack')game.input.touchAttack=false};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)}
  const it=$('#interact');if(it&&it.addEventListener)it.addEventListener('pointerdown',e=>{if(!this.on)return;e.preventDefault();this.buzz(12);game.key('e')})},
 // Per-frame touch HUD sync (writes the DOM only when a value changes).
 put(id,key,val,fn){if(this.cache[key]===val)return;this.cache[key]=val;fn(val)},
 sync(g,loc){if(!this.on||typeof document==='undefined')return;const p=g.player,c=this.cache;
  this.put('l','loc',loc,v=>{const e=$('#tLoc');if(e)e.textContent=v});
  this.put('h','hp',p.hppots,v=>{const e=$('#tHp');if(e)e.textContent=v});this.put('m','mp',p.mppots,v=>{const e=$('#tMp');if(e)e.textContent=v});
  const cost=armySummonCost(p,g.army),dr=fmtRate(g.armyDrain());this.put('a','army',`${g.army.length}/${g.shadowCap()}|${g.summoned}|${dr}|${!g.summoned&&(!g.army.length||p.mp<cost)}`,()=>{const e=$('#tArmy');if(e)e.textContent=g.summoned?`−${dr}/s`:`${g.army.length}/${g.shadowCap()}`;const b=document.querySelector('#actions .summon');if(b&&b.classList){b.classList.toggle('active',!!g.summoned);b.classList.toggle('off',!g.summoned&&(!g.army.length||p.mp<cost))}});
  this.put('o','order',g.armyOrder,v=>{const b=document.querySelector('#actions .order');if(b){const s=b.querySelector('small'),bb=b.querySelector('b');if(s)s.textContent='ORDEM';if(bb)bb.textContent=g.armyOrder}});
  this.put('j','jinho',String(g.story.jinho===2&&!g.ally),v=>{const b=document.querySelector('#actions .jinho');if(b&&b.classList)b.classList.toggle('off',!(g.story.jinho===2&&!g.ally))});
  [15,25,35].forEach((cost,i)=>this.put('s'+i,'sk'+i,p.mp<cost||p.cool>0.05?1:0,v=>{const b=document.querySelector('#actions .s'+(i+1));if(b&&b.classList)b.classList.toggle('off',!!v)}));
  const dmax=Math.max(.5,1.3-p.stats.AGI*.01),dk=Math.round(clamp(p.dashCd/dmax,0,1)*20)/20;this.put('d','dash',dk,v=>{const b=document.querySelector('#actions .dash');if(b&&b.style&&b.style.setProperty)b.style.setProperty('--cd',v)});
  this.put('q','pq',`${p.hppots>0&&p.hp<p.maxhp}|${p.mppots>0&&p.mp<p.maxmp}`,()=>{const h=document.querySelector('#actions .hp'),m=document.querySelector('#actions .mp');if(h&&h.classList)h.classList.toggle('off',!(p.hppots>0&&p.hp<p.maxhp));if(m&&m.classList)m.classList.toggle('off',!(p.mppots>0&&p.mp<p.maxmp))})}
};
// =============================================================================================
// EXPANSÃO · sistemas de combate, sombras, progressão, mundo e interface
// =============================================================================================
// ---- Monstros de elite -----------------------------------------------------------------------
const ELITE_MODS={
 VELOZ:{name:'VELOZ',color:'#5ad8ff',blurb:'+45% de velocidade'},
 BLINDADO:{name:'BLINDADO',color:'#d8e2ea',blurb:'-45% de dano sofrido'},
 EXPLOSIVO:{name:'EXPLOSIVO',color:'#ff8a3a',blurb:'explode ao morrer'},
};
const ELITE_KEYS=Object.keys(ELITE_MODS);
// ---- Sombras únicas (evolução de chefe) ------------------------------------------------------
const SHADOW_RANKS=[[0,'Normal'],[10,'Elite'],[30,'Comandante'],[70,'General'],[150,'Supremo']];
const shadowRankTitle=k=>{let t=SHADOW_RANKS[0][1];for(const [n,s] of SHADOW_RANKS)if(k>=n)t=s;return t};
const UNIQUE_SHADOWS={
 C:{key:'igris',name:'IGRIS',title:'Cavaleiro Carmesim',color:'#ff5a6a',ability:'Corte Carmesim',ablDesc:'Investida que atravessa fileiras',mod:{speed:1.2,range:22}},
 A:{key:'tank',name:'TANK',title:'Urso de Guerra',color:'#8fd8ff',ability:'Pele de Ferro',ablDesc:'-30% de dano recebido',mod:{armor:.3}},
 B:{key:'iron',name:'IRON',title:'Golem de Ferro',color:'#c9d2da',ability:'Provocar',ablDesc:'Atrai os ataques inimigos',mod:{armor:.18,speed:.92}},
 S:{key:'beru',name:'BERU',title:'General da Colmeia',color:'#d06aff',ability:'Voo Predador',ablDesc:'+35% de velocidade',mod:{speed:1.35}},
};
// ---- Equipamentos com raridade ----------------------------------------------------------------
const RARITY={COMUM:{name:'COMUM',color:'#9fb4c0'},RARO:{name:'RARO',color:'#4fd5ff'},EPICO:{name:'ÉPICO',color:'#c879ff'},LENDARIO:{name:'LENDÁRIO',color:'#ffb24a'}};
const ITEMS={
 kasaka:{id:'kasaka',name:'Adaga de Kasaka',slot:'weapon',rarity:'EPICO',damage:26,price:900,effect:{kind:'bleed',chance:.35},desc:'35% de chance de sangramento'},
 barca:{id:'barca',name:'Espada do Barca',slot:'weapon',rarity:'LENDARIO',damage:60,price:2600,effect:{kind:'burn',chance:.4},desc:'40% de chance de queimadura'},
 demoncape:{id:'demoncape',name:'Capa do Rei Demônio',slot:'cape',rarity:'LENDARIO',armor:14,price:2200,effect:{kind:'shadow',mult:1.25},desc:'+25% de poder das sombras'},
};
// ---- Árvore de talentos por atributo ----------------------------------------------------------
const TALENTS={
 FOR:{name:'FORÇA',desc:'Dano e impacto',nodes:[
  {id:'for_dmg',name:'Lâminas Afiadas',max:5,desc:'+10% de dano por ponto'},
  {id:'for_stun',name:'Impacto Atordoador',max:3,desc:'8% de chance de atordoar por ponto'}]},
 AGI:{name:'AGILIDADE',desc:'Velocidade e esquiva',nodes:[
  {id:'agi_speed',name:'Passo Leve',max:5,desc:'+3% de velocidade por ponto'},
  {id:'agi_dash',name:'Recarga Rápida',max:3,desc:'-7% no tempo da esquiva por ponto'}]},
 VIT:{name:'VITALIDADE',desc:'Vida e regeneração',nodes:[
  {id:'vit_hp',name:'Corpo de Ferro',max:5,desc:'+8% de HP máximo por ponto'},
  {id:'vit_regen',name:'Recuperação',max:3,desc:'+0,4 HP/s por ponto'}]},
 INT:{name:'INTELIGÊNCIA',desc:'Sombras e mana',nodes:[
  {id:'int_cap',name:'Mais Sombras',max:4,desc:'+1 slot de sombra por ponto'},
  {id:'int_power',name:'Sombras Fortes',max:5,desc:'+6% de poder das sombras por ponto'}]},
 PER:{name:'PERCEPÇÃO',desc:'Crítico e sangramento',nodes:[
  {id:'per_crit',name:'Olho Crítico',max:5,desc:'+2% de crítico por ponto'},
  {id:'per_bleed',name:'Sangramento',max:3,desc:'+12% de chance de sangramento por ponto'}]},
};
const talentLevel=id=>{const p=liveGame()&&liveGame().player;return p&&p.talents?(p.talents[id]||0):0};
// ---- Missão diária do Sistema -----------------------------------------------------------------
const DAILY_GOALS=[
 {id:'pushups',name:'FLEXÕES',target:100,blurb:'abates'},
 {id:'situps',name:'ABDOMINAIS',target:100,blurb:'dashes'},
 {id:'run',name:'CORRIDA · 10 KM',target:10000,blurb:'metros'},
];
const CLASS_CHANGE_LEVEL=40;
const CLASSES=['SHADOW MONARCH','MONARCA DAS SOMBRAS','SOBERANO DAS SOMBRAS'];
// ---- Contratos da Associação e reavaliação de rank --------------------------------------------
const CONTRACT_TIERS=[{rank:'E',need:8,reward:120},{rank:'D',need:10,reward:200},{rank:'C',need:12,reward:340},{rank:'B',need:12,reward:520},{rank:'A',need:14,reward:800},{rank:'S',need:15,reward:1200}];
const HUNTER_THRESH=[0,60,160,320,560,900];
// ---- Cutscenes (história, NPCs, missão) -------------------------------------------------------
class Cutscene{constructor(lines,opts={}){this.lines=lines;this.i=0;this.t=0;this.opts=opts;this.done=false;this.zoom=opts.zoom||1.6;this.auto=opts.auto||0;this.slow=opts.slow??.22;game.cutscene=this}
 current(){return this.lines[this.i]}
 focus(){const o=this.opts,L=this.current();if(o.focus)return o.focus;if(L&&L.at)return L.at();return game.player}
 advance(){if(this.done)return;this.i++;this.t=0;if(this.i>=this.lines.length){this.done=true;game.cutscene=null;const cb=this.opts.onDone;if(cb)cb()}}
 update(dt){if(this.done)return;this.t+=dt;if(this.auto&&this.t>=this.auto)this.advance()}
draw(c){const L=this.current();if(!L)return;const f=this.focus();const W=canvas.width,H=canvas.height;
 // letterbox cinematográfico
 c.save();c.fillStyle='#000000cc';c.fillRect(0,0,W,84);c.fillRect(0,H-150,W,150);
 // retrato do falante (câmera vira para o rosto)
 if(f&&f.x!==undefined){const cx=clamp(f.x-game.camera.x,60,W-60),cy=clamp(f.y-game.camera.y,120,H-190);c.save();c.globalAlpha=.85;c.strokeStyle='#3fd6ff';c.lineWidth=2;c.beginPath();c.arc(cx,cy,26,0,7);c.stroke();c.fillStyle='#07131b';c.beginPath();c.arc(cx,cy,24,0,7);c.fill();
  const sp=(f.isAlly&&f.look)?game.sprites.person(f.look,f.facing===1?0:4,'idle0'):null;if(sp)c.drawImage(sp,Math.round(cx-24),Math.round(cy-40),48,48);else if(f.art){const im=game.sprites.monster(f.art,'idle0');if(im)c.drawImage(im.img,Math.round(cx-24),Math.round(cy-40),48,48)}
  c.restore()}
 c.fillStyle='#020810cc';c.fillRect(0,H-150,W,150);c.strokeStyle='#3fd6ff';c.lineWidth=1;c.beginPath();c.moveTo(0,H-150);c.lineTo(W,H-150);c.stroke();
 c.font='bold 13px monospace';c.textAlign='left';c.fillStyle=L.color||'#7fe8ff';c.fillText(L.who||'SISTEMA',24,H-112);
 c.font='15px monospace';c.fillStyle='#e8fbff';this.wrap(c,L.text,24,H-86,W-48,20);
 c.font='10px monospace';c.fillStyle='#6fa8b8';c.fillText(this.i<this.lines.length-1?'[ E / ESPAÇO ] CONTINUAR':'[ E / ESPAÇO ] FECHAR',24,H-20);c.restore()}
 wrap(c,text,x,y,maxW,lh){const words=String(text).split(' ');let line='',yy=y;for(const w of words){const t=line?line+' '+w:w;if(c.measureText(t).width>maxW){c.fillText(line,x,yy);line=w;yy+=lh}else line=t}if(line)c.fillText(line,x,yy)}}
// ---- Aliado de história (Yoo Jin-ho) ----------------------------------------------------------
class Ally{constructor(x,y,look,name){this.x=x;this.y=y;this.look=look;this.name=name||'YOO JIN-HO';this.dir=2;this.moving=false;this.anim=0;this.hp=220;this.maxhp=220;this.cool=0;this.speed=150;this.isAlly=true;this.radius=12;this.facing=1}
 update(dt,g){this.anim+=dt;this.cool-=dt;const p=g.player,d=dist(this,p);
  let target=g.enemies.filter(e=>dist(e,this)<340).sort((a,b)=>dist(a,this)-dist(b,this))[0];
  if(target){const dd=dist(this,target),ang=Math.atan2(target.y-this.y,target.x-this.x);if(Math.abs(target.x-this.x)>3)this.facing=target.x>this.x?1:-1;
   if(dd>60){this.x+=Math.cos(ang)*this.speed*dt;this.y+=Math.sin(ang)*this.speed*dt;this.moving=true}else{this.moving=false;if(this.cool<=0){this.cool=.7;g.hit(target,14+p.stats.FOR*1.5,false,null,ang);g.particles.burst(target.x,target.y-14,'#ffd27a',6,{angle:ang,spread:1.2,speed:180})}}}
  else if(d>46){const ang=Math.atan2(p.y-this.y,p.x-this.x);this.x+=Math.cos(ang)*this.speed*1.2*dt;this.y+=Math.sin(ang)*this.speed*1.2*dt;this.moving=true;this.facing=p.x>this.x?1:-1}
  else this.moving=false;
  this.x=clamp(this.x,30,g.world.w-30);this.y=clamp(this.y,30,g.world.h-30)}
 draw(c,g){const f=g.sprites.person(this.look,this.facing===1?0:4,this.moving?'walk'+(Math.floor(this.anim*10)%6):'idle'+(Math.floor(this.anim*1.6)%2));c.fillStyle='#0009';c.beginPath();c.ellipse(this.x,this.y+8,12,4,0,0,7);c.fill();c.drawImage(f,Math.round(this.x-32),Math.round(this.y-59));
  c.font='bold 10px monospace';c.textAlign='center';c.fillStyle='#061019';c.fillText(this.name,this.x+1,this.y-62+1);c.fillStyle='#ffd27a';c.fillText(this.name,this.x,this.y-62);c.textAlign='left';
  c.fillStyle='#182c37';c.fillRect(this.x-16,this.y-58,32,3);c.fillStyle='#ffd27a';c.fillRect(this.x-16,this.y-58,32*clamp(this.hp/this.maxhp,0,1),3)}
 hurt(n,g){this.hp-=n;if(this.hp<=0){g.removeAlly();g.message(`${this.name} FOI DERROTADO`)}}}
// ---- QTE decisivo (aperte a tecla na hora certa) ----------------------------------------------
class QTE{constructor(opts={}){this.key=opts.key||' ';this.dur=opts.dur||1.5;this.t=0;this.zone=opts.zone||[.34,.66];this.label=opts.label||'APERTE ESPAÇO';this.onDone=opts.onDone;this.done=false;game.qte=this}
 update(dt){if(this.done)return;this.t+=dt;if(this.t>=this.dur)this.finish(false)}
 press(k){if(this.done||k!==this.key)return false;this.finish(this.t/this.dur>=this.zone[0]&&this.t/this.dur<=this.zone[1]);return true}
 finish(ok){if(this.done)return;this.done=true;game.qte=null;if(this.onDone)this.onDone(ok)}}
// ---- Tutorial interativo ----------------------------------------------------------------------
const TUTORIAL_STEPS=[
 {id:'move',text:'MOVA-SE · W A S D / SETAS / ANALÓGICO',check:g=>(g.tutMove||0)>1.1},
 {id:'attack',text:'ATAQUE · CLIQUE ESQUERDO / ESPAÇO / BOTÃO ATAQUE',check:g=>(g.tutAttack||0)>=3},
 {id:'dash',text:'ESQUIVE · SHIFT / BOTÃO ESQUIVA',check:g=>(g.tutDash||0)>=1},
 {id:'summon',text:'INVOQUE AS SOMBRAS · R / BOTÃO SOMBRAS',check:g=>(g.tutSummon||0)>=1},
 {id:'done',text:'TUTORIAL CONCLUÍDO · BOA CAÇADA',check:g=>(g.tutT||0)>1.6},
];
// ---- Nova cidade: BUSAN · distrito costeiro (acesso por portal na Associação) -----------------
const THIS_CITY2=(()=>{
 const W=3200,H=2200,rnd=seeded(4242),pick=a=>a[Math.floor(rnd()*a.length)];
 const buildings=[],solids=[],lamps=[],palms=[],boats=[],stalls=[];
 const PALETTE=['#3a6a8a','#8a5a3a','#4a7a5a','#6a4a7a','#a8763a','#2a5a6a','#7a3a4a'];
 const B=(x,y,w,h,col,name)=>{buildings.push({x,y,w,h,color:col,name,roof:Math.min(40,Math.round(h*.3))});solids.push({x,y,w,h:h-6})};
 // Malha urbana: 5 ruas verticais (120 px) e 3 ruas horizontais (110 px) deixam 4x3 quarteirões
 // de 640x410. Os prédios ficam inteiramente dentro do quarteirão, sem invadir rua nem o vizinho.
 // O quarteirão (col 2, row 2) é a Praça de Busan — área aberta com fonte, spawn e portal.
 const PLAZA={x:1640,y:1300,w:640,h:410},PC={x:1960,y:1505};
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const bx=120+col*760,by=260+row*520,bw=640,bh=410;
  if(col===2&&row===2)continue; // praça
  const w2=(bw-36-20)/2;
  for(let i=0;i<2;i++)B(bx+18+i*(w2+20),by+18,w2,bh-36,pick(PALETTE),pick(NAMES.shop));
  lamps.push({x:bx-8,y:by-8});lamps.push({x:bx+bw+8,y:by+bh+8});
  palms.push({x:bx+26,y:by+bh-24,s:.85});palms.push({x:bx+bw-30,y:by+26,s:.75})}
 // orla: praia e mar (a água é terreno lento, não uma parede invisível)
 for(let i=0;i<30;i++)palms.push({x:100+rnd()*(W-200),y:1762+rnd()*110,s:.9+rnd()*.5});
 for(let i=0;i<7;i++)boats.push({x:300+rnd()*(W-600),y:1990+rnd()*100,a:rnd()*Math.PI});
 for(let i=0;i<8;i++)stalls.push({x:180+i*360,y:1725,w:90,h:26,color:pick(['#c23a3a','#d8a020','#2a8a6a','#3a6ad8']),food:pick(['PEIXE','TTEOK','HOTTEOK','ESPETOS'])});
 for(const s of stalls)solids.push({x:s.x,y:s.y,w:s.w,h:s.h});
 const spawn={x:PC.x,y:PC.y+150};
 const spawnAreas=[
  {x:PLAZA.x+40,y:PLAZA.y+40,w:PLAZA.w-80,h:PLAZA.h-80,name:'PRAÇA DE BUSAN'},
  {x:120,y:160,w:640,h:90,name:'AVENIDA NORTE'},
  {x:880,y:680,w:640,h:90,name:'AVENIDA CENTRAL'},
  {x:2400,y:1200,w:640,h:90,name:'AVENIDA SUL'},
  {x:200,y:1720,w:2800,h:40,name:'ORLA DE BUSAN'}];
 const zones=[{x:0,y:0,w:W,h:1710,name:'BUSAN'},{x:0,y:1710,w:W,h:190,name:'PRAIA DE BUSAN'},{x:0,y:1900,w:W,h:H-1900,name:'MAR DE BUSAN'}];
 const grid=new Map(),cell=256;for(const s of solids)for(let gx=Math.floor(s.x/cell);gx<=Math.floor((s.x+s.w)/cell);gx++)for(let gy=Math.floor(s.y/cell);gy<=Math.floor((s.y+s.h)/cell);gy++){const k=gx*1000+gy;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s)}
 return {w:W,h:H,buildings,lamps,palms,boats,stalls,spawn,spawnAreas,zones,solids,grid,cell,plaza:PC,portal:{x:PC.x,y:PLAZA.y+40}};
})();
function makeSecondCity(){const C=THIS_CITY2;
 const world={kind:'city2',rank:'E',theme:null,w:C.w,h:C.h,solids:C.solids,grid:C.grid,cell:C.cell,npcs:null,traffic:null,spawnAreas:C.spawnAreas,portal:C.portal,
  walkable:[{x:0,y:0,w:C.w,h:1900}],
  blocked(x,y,rad=12){const g=this.grid,cs=C.cell;if(g){for(let gx=Math.floor((x-rad)/cs);gx<=Math.floor((x+rad)/cs);gx++)for(let gy=Math.floor((y-rad)/cs);gy<=Math.floor((y+rad)/cs);gy++){const l=g.get(gx*1000+gy);if(l)for(const s of l)if(x+rad>s.x&&x-rad<s.x+s.w&&y+rad*.6>s.y&&y-rad*.6<s.y+s.h)return true}}return y>2120},
  terrainAt(x,y){if(y>1900&&y<=2120)return{kind:'slow',name:'ÁGUA DO MAR',color:'#2a7a9a',mult:.5,seed:1};return null},update(){},cityTop(){},visible(v,x,y,w,h,m=60){return x+w>v.x-m&&x<v.x+v.w+m&&y+h>v.y-m&&y<v.y+v.h+m},
  draw(c,t,v){const x0=v.x-40,y0=v.y-40,w=v.w+80,h=v.h+80;
   // grama/pedra
   c.fillStyle='#2c4438';c.fillRect(x0,y0,w,h);c.fillStyle='#3a5648';
   for(let i=0;i<300;i++){const px=(i*173)%(C.w),py=(i*97)%(1710);c.fillRect(px,py,8,3)}
   // orla, praia e mar (a água rasa é caminhável e fica escura com a profundidade)
   c.fillStyle='#4a5458';c.fillRect(x0,1710,w,50);
   c.fillStyle='#c8a878';c.fillRect(x0,1760,w,140);c.fillStyle='#e0c090';c.fillRect(x0,1760,w,20);
   const g=c.createLinearGradient(0,1900,0,C.h);g.addColorStop(0,'#1a6a8c');g.addColorStop(.55,'#0e4a68');g.addColorStop(1,'#06283c');c.fillStyle=g;c.fillRect(x0,1900,w,C.h-1900);
   c.save();c.globalAlpha=.3;c.strokeStyle='#bff4ff';for(let x=x0-x0%140;x<x0+w;x+=140){c.beginPath();c.ellipse(x+Math.sin(t+x)*10,1960+Math.sin(t*.7+x)*8,60,8,0,0,7);c.stroke()}c.restore();
   c.fillStyle='#e8fbff';c.font='bold 9px monospace';c.textAlign='center';c.globalAlpha=.7;c.fillText('MAR DE BUSAN',x0+w/2,2000);c.globalAlpha=1;c.textAlign='left';
   for(const b of C.boats){c.save();c.translate(b.x,b.y);c.rotate(b.a+Math.sin(t*.5+b.x)*.1);c.fillStyle='#5a3a22';c.fillRect(-22,-6,44,12);c.fillStyle='#e8e0d0';c.fillRect(-4,-26,3,22);c.beginPath();c.moveTo(0,-26);c.lineTo(16,-8);c.lineTo(0,-8);c.fill();c.restore()}
   // ruas
   c.fillStyle='#232a2e';for(let x=0;x<C.w;x+=760)c.fillRect(x,0,120,1710);for(let y=150;y<1300;y+=520)c.fillRect(0,y,C.w,110);
   c.fillStyle='#3a4448';for(let x=0;x<C.w;x+=760)c.fillRect(x+10,0,100,1710);for(let y=150;y<1300;y+=520)c.fillRect(0,y+10,C.w,90);
   // praça central
   c.fillStyle='#3f4a4e';c.beginPath();c.ellipse(1960,1505,220,120,0,0,7);c.fill();c.fillStyle='#5a666a';c.beginPath();c.ellipse(1960,1505,180,92,0,0,7);c.fill();
   c.fillStyle='#1d4a5a';c.beginPath();c.ellipse(1960,1505,70,40,0,0,7);c.fill();c.fillStyle='#9fe8f8';for(let i=0;i<8;i++){const a=i/8*7+t;c.globalAlpha=.4+.3*Math.sin(t*3+i);c.fillRect(1960+Math.cos(a)*40,1505+Math.sin(a)*22,3,3)}c.globalAlpha=1;
   c.fillStyle='#d8e4e8';c.font='bold 12px monospace';c.textAlign='center';c.fillText('PRAÇA DE BUSAN',1960,1395);c.textAlign='left';
   // prédios
   for(const b of C.buildings){if(!world.visible(v,b.x,b.y,b.w,b.h))continue;const col=b.color,dark=shadeHex(col,-.35),light=shadeHex(col,.18);c.fillStyle=shadeHex(col,-.5);c.fillRect(b.x,b.y,b.w,b.roof);c.fillStyle=col;c.fillRect(b.x,b.y+b.roof,b.w,b.h-b.roof);
    for(let wy=b.y+b.roof+10;wy<b.y+b.h-40;wy+=26)for(let wx=b.x+10;wx<b.x+b.w-20;wx+=24){c.fillStyle='';c.fillStyle=((wx+wy)%3===0)?'#ffd98a':'#1a2836';c.fillRect(wx,wy,12,14)}
    c.fillStyle='#0b1218';c.fillRect(b.x+b.w/2-24,b.y+b.h-34,48,30);c.fillStyle='#bfe6ff';c.font='bold 10px monospace';c.textAlign='center';c.fillText(b.name,b.x+b.w/2,b.y+b.h-40);c.textAlign='left'}
   for(const p of C.palms){c.fillStyle='#3a2a1e';c.fillRect(p.x-3*p.s,p.y-30*p.s,6*p.s,34*p.s);c.fillStyle='#2c5236';for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.5;c.beginPath();c.ellipse(p.x+Math.cos(a)*14*p.s,p.y-30*p.s+Math.sin(a)*8*p.s,14*p.s,5*p.s,a,0,7);c.fill()}}
   for(const s of C.stalls){c.fillStyle='#4a3020';c.fillRect(s.x,s.y+10,s.w,s.h-10);for(let i=0;i<4;i++){c.fillStyle=i%2?'#f2f0e6':s.color;c.fillRect(s.x-4+i*12,s.y-8,12,14)}c.fillStyle='#14181b';c.font='bold 8px monospace';c.textAlign='center';c.fillText(s.food,s.x+s.w/2,s.y-13);c.textAlign='left'}
   // portal de volta a Seoul
   const P=C.portal;c.save();c.translate(P.x,P.y);const pg=c.createRadialGradient(0,0,4,0,0,60);pg.addColorStop(0,'#ffffff');pg.addColorStop(.3,'#3bcfff');pg.addColorStop(1,'#07101b');c.fillStyle=pg;c.beginPath();c.ellipse(0,0,42,60,0,0,7);c.fill();c.shadowBlur=20;c.shadowColor='#3bcfff';c.strokeStyle='#3bcfff';c.lineWidth=4;c.beginPath();c.ellipse(0,0,44,62,0,0,7);c.stroke();c.shadowBlur=0;c.restore();
   c.fillStyle='#d8e4e8';c.font='bold 10px monospace';c.textAlign='center';c.fillText('PORTAL · SEOUL',P.x,P.y-90);c.textAlign='left';
   // spawn marker
   c.strokeStyle='#ffffff44';c.strokeRect(C.spawn.x-20,C.spawn.y-20,40,40);
   // nadando: ondulação em volta do jogador quando ele entra na água
   const pl=typeof game!=='undefined'&&game.player;
   if(pl&&pl.y>1900&&pl.y<=2120){c.save();c.strokeStyle='#bff4ff';c.globalAlpha=.4+.25*Math.sin(t*4);c.lineWidth=2;c.beginPath();c.ellipse(pl.x,pl.y+8,20+Math.sin(t*4)*3,7,0,0,7);c.stroke();c.beginPath();c.ellipse(pl.x,pl.y+8,30+Math.sin(t*4+1)*4,11,0,0,7);c.stroke();c.restore()}
  }};
 return world}
const weapons=[{name:'Adaga de Ferro',damage:5,price:0},{name:'Presa de Kasaka',damage:18,price:300},{name:'Adaga do Assassino',damage:35,price:700},{name:'Adaga do Rei Demônio',damage:65,price:1500}];
class GameEngine{constructor(){this.sprites=new ProceduralSprites();const portrait=$('#portraitCanvas').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.drawImage(this.sprites.playerFrames['2:idle'],14,4,36,45,0,0,80,100);this.sound=new SoundFX();this.music=new MusicSystem();this.particles=new ParticleSystem();this.input=new InputHandler();this.gates=new GateSystem();this.projectiles=[];this.hazards=[];this.impacts=[];this.shakeT=0;this.shakeMag=0;this.started=false;this.time=0;this.last=0;this.hudClock=0;this.camera={x:0,y:0};this.renderScale=1;
 // expansion state
 this.hitStop=0;this.comboSeq=0;this.comboSeqT=0;this.armyOrder='ATTACK';this.exchangeCd=0;this.daily=null;this.bestiary={};this.hunter={points:0,rank:'E',evalReady:false};this.contracts=[];this.story={};this.tutorialDone=0;this.tutorial={step:0};this.tutMove=0;this.tutAttack=0;this.tutDash=0;this.tutSummon=0;this.tutT=0;this.dayTime=.32;this.weather=0;this.redTimer=0;this.redGateActive=false;this.roomEvent=null;this.eventRoom=-1;this.cutscene=null;this.qte=null;this.ally=null;this.companion=null;this.cityIndex=0;this.newCityUnlocked=false;this.secretRevealed=false;this.penalty=null;this.fps=0;this._fpsAcc=0;this._fpsN=0;this.fpsVal=0;this._darkOff=false;this._lastRoomId=3;
 Mobile.init();this.resize();window.addEventListener('resize',()=>this.resize());HudManager.init();requestAnimationFrame(t=>this.loop(t))}
resize(){const W=innerWidth,H=innerHeight,base=Mobile.scale(W,H);let s=base;this.viewLayout=null;
 if(this.world&&this.world.kind==='dungeon'){const L=this.viewLayout=this.roomLayout(W,H,base);s=L.s}
 this.renderScale=s;canvas.width=Math.round(W/s);canvas.height=Math.round(H/s);ctx.imageSmoothingEnabled=false;this._layoutSig=this.hudSignature()}
// ---- Dungeon room framing ------------------------------------------------------------------
// Inside a dungeon the current room is always shown whole and centred in the free part of the
// screen. Visible HUD panels, the skill bar and the touch controls are measured as obstacles; the
// zoom is the largest one (never above the normal zoom) that fits the room plus its walls between
// them, so the hotbar / buttons sit over the dark surroundings, never over the room.
hudObstacles(){const out=[];if(typeof document==='undefined'||!document.querySelectorAll)return out;
 const sel='#hud:not(.hidden) [data-hud],#hud:not(.hidden) #hudToggle,#touch:not(.hidden) .t-top,#touch:not(.hidden) .t-btn,#touch:not(.hidden) #stickBase';
 let list=[];try{list=document.querySelectorAll(sel)}catch(e){return out}
 for(const el of list){if(!el||!el.getBoundingClientRect)continue;const r=el.getBoundingClientRect();if(!(r.width>2&&r.height>2))continue;
  if(typeof getComputedStyle==='function'){const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue}
  out.push({x:r.left,y:r.top,w:r.width,h:r.height})}
 return out}
hudSignature(){return this.hudObstacles().map(r=>`${r.x|0},${r.y|0},${r.w|0},${r.h|0}`).join(';')+'|'+innerWidth+'x'+innerHeight}
roomLayout(W,H,base){const obs=this.hudObstacles(),pad=8,FW=420+2*30,FH=280+2*34,cx=W/2;
 // free vertical band in the central column: below the top HUD, above the bottom HUD
 let top=0,bottom=H;for(const o of obs){if(o.x>cx+60||o.x+o.w<cx-60)continue;const mid=o.y+o.h/2;if(mid<H/2)top=Math.max(top,o.y+o.h+pad);else bottom=Math.min(bottom,o.y-pad)}
 if(bottom-top<H*.4){top=0;bottom=H}
 const cy=(top+bottom)/2,fits=k=>{const hw=FW*k/2,hh=FH*k/2,x0=cx-hw,x1=cx+hw,y0=cy-hh,y1=cy+hh;if(y0<top-1||y1>bottom+1||x0<0||x1>W)return false;
  for(const o of obs)if(x1>o.x-pad&&x0<o.x+o.w+pad&&y1>o.y-pad&&y0<o.y+o.h+pad)return false;return true};
 let s=base;if(!fits(s)){let lo=.3,hi=s;for(let i=0;i<16;i++){const m=(lo+hi)/2;if(fits(m))lo=m;else hi=m}s=lo}
 return {s,cx:cx/s,cy:cy/s,top,bottom,obs:obs.length}}
// World point the camera frames: the centre of the current room, or (in a corridor) a point that
// slides between the two linked rooms following the hunter's progress along the corridor.
cameraFocus(){const w=this.world,p=this.player,z=this.zoneAt(p.x,p.y);
 if(z&&z[0]==='r'){const r=w.rooms[+z.slice(1)];this._lastRoom=r;return {x:r.cx,y:r.cy}}
 if(z&&z[0]==='c'){const c=w.corridors[+z.slice(1)],A=w.rooms[c.a],B=w.rooms[c.b],hor=Math.abs(A.cy-B.cy)<Math.abs(A.cx-B.cx);
  const t=clamp(hor?(p.x-A.cx)/(B.cx-A.cx):(p.y-A.cy)/(B.cy-A.cy),0,1),e=t*t*(3-2*t);return {x:A.cx+(B.cx-A.cx)*e,y:A.cy+(B.cy-A.cy)*e}}
 const r=this._lastRoom||w.rooms[3];return {x:r.cx,y:r.cy}}
updateCamera(){const p=this.player,w=this.world,now=this.time,dt=Math.min(.1,Math.max(0,now-(this._camT??now)));this._camT=now;
 if(w.kind!=='dungeon'||!this.viewLayout){this.camera.x=clamp(p.x-canvas.width/2,0,Math.max(0,w.w-canvas.width));this.camera.y=clamp(p.y-canvas.height/2,0,Math.max(0,w.h-canvas.height));this._camSnap=true;return}
 const L=this.viewLayout,f=this.cameraFocus(),tx=f.x-L.cx,ty=f.y-L.cy;
 if(this._camSnap||!isFinite(this.camera.x)){this.camera.x=tx;this.camera.y=ty;this._camSnap=false;return}
 const k=1-Math.exp(-dt*9);this.camera.x+=(tx-this.camera.x)*k;this.camera.y+=(ty-this.camera.y)*k}
// The camera may frame rooms near the map border, so the area beyond the map is filled with the
// theme's deep background colour and the map edge fades into it (no hard seam).
backdropColor(){const th=this.world.theme;return th?shadeHex(th.pal.bg,th.dark>0?-.55:-.35):'#05080c'}
drawDungeonBackdrop(){ctx.fillStyle=this.backdropColor();ctx.fillRect(0,0,canvas.width,canvas.height)}
drawWorldEdges(c,v){const w=this.world,col=this.backdropColor(),F=90;if(v.x>F&&v.y>F&&v.x+v.w<w.w-F&&v.y+v.h<w.h-F)return;c.save();
 const fade=(x0,y0,x1,y1,rx,ry,rw,rh)=>{const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,col);g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(rx,ry,rw,rh)};
 if(v.x<F)fade(0,0,F,0,0,0,F,w.h);if(v.x+v.w>w.w-F)fade(w.w,0,w.w-F,0,w.w-F,0,F,w.h);if(v.y<F)fade(0,0,0,F,0,0,w.w,F);if(v.y+v.h>w.h-F)fade(0,w.h,0,w.h-F,0,w.h-F,w.w,F);
 c.restore()}
// Re-measure the HUD a few times per second; resize only when the layout really changed.
checkViewLayout(dt){if(this.world.kind!=='dungeon')return;this._layoutT=(this._layoutT||0)-dt;if(this._layoutT>0)return;this._layoutT=.3;const sig=this.hudSignature();if(sig!==this._layoutSig)this.resize()}
start(saved){this.player=new Player(saved?.player);this.animation=new PlayerAnimation(this.sprites);if(this.player.hp<=0){this.player.hp=this.player.maxhp;this.player.mp=this.player.maxmp}this.army=saved?.army||[];this.quest=saved?.quest||0;this.questDate=new Date().toLocaleDateString('en-CA');if(saved?.questDate!==this.questDate)this.quest=0;this.questDone=saved?.questDate===this.questDate&&(saved?.questDone||false);this.unlocked=saved?.unlocked||0;
 const today=new Date().toLocaleDateString('en-CA');this.daily=saved?.daily&&saved.daily.date===today?saved.daily:{date:today,kills:0,dashes:0,distance:0,done:false,penalty:false};this.bestiary=saved?.bestiary||{};this.hunter=saved?.hunter||{points:0,rank:'E',evalReady:false};this.contracts=saved?.contracts||[];this.story=saved?.story||{};this.tutorialDone=saved?.tutorial||0;this.dayTime=saved?.dayTime??.32;this.cityIndex=saved?.cityIndex||0;this.newCityUnlocked=this.cityIndex>0;
 this.world=this.cityIndex===1?makeSecondCity():new WorldMap();this.gates=new GateSystem();this.gates.update(0,this);this.rollContracts();this.placePlayerAt(this.cityIndex===1?THIS_CITY2.spawn:HUB.spawn);this.projectiles=[];this.hazards=[];this.impacts=[];this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.pendingStrikes=[];this.panel=null;this.started=true;this.bossDefeated=false;this.chest=false;this.redGate=false;this.redGateActive=false;this.redTimer=0;this.weather=0;this.roomEvent=null;this.eventRoom=-1;this.cutscene=null;this.qte=null;this.ally=null;this.companion=null;this.hitStop=0;this.comboSeq=0;this.comboSeqT=0;this.exchangeCd=0;this.armyOrder='ATTACK';this.penalty=null;
 $('#start').classList.add('hidden');$('#hud').classList.remove('hidden');this.message(this.tutorialDone?'BEM-VINDO DE VOLTA, JOGADOR':'BEM-VINDO, JOGADOR');this.sound.play('alert');this.music.enabled=Settings.d.music;this.music.start();this.sound.enabled=Settings.d.sfx;this.fps=Settings.d.fps?1:0;Mobile.apply();this.updateHUD()}
message(text){$('#notice').textContent=text;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>$('#notice').textContent='',3200)}
shake(mag,time=.25){this.shakeMag=Math.max(this.shakeMag,mag);this.shakeT=Math.max(this.shakeT,time)}
key(k){if(!this.started)return;if(k==='h'){HudManager.toggleClean();return}
 if(this.cutscene){if(k===' '||k==='enter')this.advanceCutscene();return}
 if(this.qte){if(k===' ')this.qte.press();return}
 if(this.panel){if(this.panel==='dead')return;if(['escape','tab','c','i','v','b','n','t','p'].includes(k))UIManager.close();return}
 if(k==='c'||k==='tab')UIManager.open('status');else if(k==='i')UIManager.open('inventory');else if(k==='v')UIManager.open('army');else if(k==='b')UIManager.open('shop');else if(k==='n')UIManager.open('bestiary');else if(k==='t')UIManager.open('talents');else if(k==='p')UIManager.open('contracts');else if(k==='escape')UIManager.open('pause');else if(k==='e')this.interact();else if(k==='r')this.toggleArmy();else if(k==='g'){if(this.story.jinho===2){this.spawnAlly(PEOPLE.hunters[2],'YOO JIN-HO')}else this.message('YOO JIN-HO AINDA NÃO SE JUNTOU A VOCÊ')}else if(k==='shift')this.dash();else if(k===' ')this.attack();else if(['1','2','3'].includes(k))this.skill(+k);else if(k==='q')this.potion('hp');else if(k==='f')this.potion('mp')}
// Damage / status from the terrain under the hunter, plus a one-time warning per hazard type.
terrainEffects(p,dt){const z=this.world.terrainAt?this.world.terrainAt(p.x,p.y):null;if(!z){p.burnT=0;return}
 if(this.hazardSeen&&!this.hazardSeen.has(z.name)){this.hazardSeen.add(z.name);this.message(`⚠ ${z.name}: ${z.kind==='burn'?'causa dano contínuo':z.kind==='poison'?'envenena':z.kind==='ice'?'escorregadio · o movimento desliza':'reduz a velocidade'}`)}
 if(z.kind!=='burn'&&z.kind!=='poison')return;if(p.dashTime>0||p.hp<=0)return;const burn=z.kind==='burn';p.burnT=(p.burnT||0)-dt;
 if(p.burnT<=0){p.burnT=burn?.5:.7;const dmg=Math.max(1,Math.round((burn?3+p.level*.6:2+p.level*.35)*(1-Math.min(.6,p.stats.VIT*.008))));p.hp-=dmg;p.hurtTime=.12;
  this.floats.push({x:p.x+rand(-8,8),y:p.y-46,text:'-'+dmg,life:.6,color:burn?'#ff9a4a':'#c6ff6a',size:13});this.particles.burst(p.x,p.y,burn?'#ff7a2a':z.color||'#8aff4a',6,burn?{kind:'ember',speed:60,lift:50}:{speed:40,lift:30});
  if(!burn)p.slow=Math.max(p.slow||0,.6);if(p.hp<=0){p.hp=0;UIManager.open('dead')}}}
enter(rank,red=false,themeId=null){UIManager.close();this.world=DungeonGenerator.create(rank,themeId);this.hazardSeen=new Set();this._lastRoom=null;this._camSnap=true;this.resize();this.animation=new PlayerAnimation(this.sprites);this.player.x=300;this.player.y=600;this.bossDefeated=false;this.chest=false;this.redGate=!!red;this.redGateActive=!!red;this.redTimer=red?90:0;this.weather=0;this.classChangeReady=false;this.pendingStrikes=[];
 const pg=this.pendingGate;this.pendingGate=null;this.penalty=pg&&pg.penalty?{wave:0,need:3}:null;this.classChange=pg&&pg.classChange?true:false;this.weather=0;this.roomEvent=null;this.eventRoom=-1;this.secretRevealed=false;this._secretCheck=0;this.buildBreakables();this.projectiles=[];this.hazards=[];this.impacts=[];this.corpses=[];this.soldiers=[];this.summoned=false;let idx=Math.max(0,RANKS.indexOf(rank)),th=this.world.theme,types=th&&th.mon?th.mon.filter(t=>MONSTER_TYPES[t]):GATE_MONSTERS(idx);if(!types.length)types=GATE_MONSTERS(idx);this.enemies=[];
 // Every monster is placed only on a validated walkable spot (inside its room, clear of walls and of
 // the other monsters); if random tries fail, a ring search from the room centre takes over.
 const bdef=BOSS_TYPES[rank]||BOSS_TYPES.E,bossRoom=this.world.rooms[5],bsp=this.findFreeSpot(bossRoom.cx,bossRoom.cy,bdef.radius,0,200)||{x:bossRoom.cx,y:bossRoom.cy};
 const placed=[{x:bsp.x,y:bsp.y,radius:bdef.radius}];
 for(let i=0;i<16+idx*2+(red?4:0);i++){const room=this.world.rooms[[0,1,2,4,6,7,8][i%7]],type=types[i%types.length],def=MONSTER_TYPES[type],R=def.radius;
  const free=(x,y)=>x>=room.x+R+12&&x<=room.x+room.w-R-12&&y>=room.y+R+12&&y<=room.y+room.h-R-12&&this.isWalkable(x,y,R)&&!this.world.terrainAt(x,y)&&placed.every(o=>Math.hypot(o.x-x,o.y-y)>o.radius+R+8);
  let sp=null;for(let t=0;t<14&&!sp;t++){const x=rand(room.x+50,room.x+room.w-50),y=rand(room.y+50,room.y+room.h-50);if(free(x,y))sp={x,y}}
  sp=sp||spiralSearch(room.cx,room.cy,free,{rad:R,maxR:260});if(!sp)continue;placed.push({x:sp.x,y:sp.y,radius:R});this.enemies.push(new Enemy(sp.x,sp.y,type,1+idx*8,false,{red}))}
 this.enemies.push(new Boss(bsp.x,bsp.y,rank,3+idx*8,bdef.name,{red}));this.fog=null;this.computeFog();this.message(`${red?'GATE VERMELHO':'GATE'} RANK ${rank} · ${th?th.name:'SUBJUGUE O CHEFE'}`);this.sound.play('alert')}
moveActor(actor,dx,dy){
 const hub=this.world.kind==='hub',rad=actor.radius?Math.min(actor.radius,22):12;
 const stuck=hub&&!!this.world.traffic&&!!this.world.traffic.hit(actor.x,actor.y,rad);
 const valid=(x,y)=>{if(x<30||y<30||x>this.world.w-30||y>this.world.h-30)return false;if(hub)return !this.world.blocked(x,y,rad,stuck);return [[-12,-12],[12,-12],[-12,12],[12,12]].every(([ox,oy])=>this.world.walkable.some(r=>x+ox>=r.x&&x+ox<=r.x+r.w&&y+oy>=r.y&&y+oy<=r.y+r.h))&&!(this.world.solids&&this.world.blocked(x,y,Math.min(rad,14)))};
 // Slowing terrain (murky water, webs, quicksand) affects everyone except a dashing hunter.
 if(!hub&&this.world.terrainAt&&!(actor===this.player&&actor.dashTime>0)){const z=this.world.terrainAt(actor.x,actor.y);if(z&&z.mult){dx*=z.mult;dy*=z.mult}}
 // Small steps prevent high-speed dashes from tunneling through a wall.
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));for(let i=0;i<steps;i++){if(valid(actor.x+dx/steps,actor.y))actor.x+=dx/steps;if(valid(actor.x,actor.y+dy/steps))actor.y+=dy/steps}
}
// ---- Walkable-area checks (used before ANY entity is placed) ---------------------------------
// Hub: map bounds + building/prop/pond/car colliders. Dungeon: the actor's box must lie inside the
// carved rooms/corridors (same rule moveActor uses), so nothing can appear inside a wall.
isWalkable(x,y,rad=12,opts={}){const w=this.world;if(!w||x<30||y<30||x>w.w-30||y>w.h-30)return false;
 if(w.kind==='hub')return !w.blocked(x,y,rad,!!opts.ignoreCars);
 const m=Math.max(12,Math.min(rad,30));return [[-m,-m],[m,-m],[-m,m],[m,m]].every(([ox,oy])=>w.walkable.some(r=>x+ox>=r.x&&x+ox<=r.x+r.w&&y+oy>=r.y&&y+oy<=r.y+r.h))&&!(w.solids&&w.blocked(x,y,Math.max(12,Math.min(rad,30))))}
// True when a small body can travel in a straight line from A to B (no wall in between).
pathClear(x0,y0,x1,y1,rad=10){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/10));for(let i=1;i<=n;i++){const k=i/n;if(!this.isWalkable(x0+(x1-x0)*k,y0+(y1-y0)*k,rad,{ignoreCars:true}))return false}return true}
// Nearest free spot around (cx,cy) on rings minR..maxR. opts: avoid (entities), sep (min distance
// to them), los (must be reachable in a straight line from the center), angle (preferred side).
// Coloca o jogador em um ponto livre a partir do spawn/portal: nunca dentro de prédio ou água funda.
placePlayerAt(sp){if(!sp)return;const free=this.findFreeSpot(sp.x,sp.y,16,0,260,{avoid:[],sep:8})||sp;this.player.x=Math.round(free.x);this.player.y=Math.round(free.y);const t=this.world.terrainAt?this.world.terrainAt(free.x,free.y):null;if(t&&t.kind==='slow'){const s=this.findFreeSpot(sp.x,sp.y,16,0,260,{avoid:[],sep:8,land:true})||sp;this.player.x=Math.round(s.x);this.player.y=Math.round(s.y)}else{this.player.x=Math.round(free.x);this.player.y=Math.round(free.y)}this._camSnap=true;this.updateCamera()}
findFreeSpot(cx,cy,rad=12,minR=0,maxR=260,opts={}){const avoid=opts.avoid||[],sep=opts.sep??rad*2;
 const ok=(x,y)=>this.isWalkable(x,y,rad,opts)&&avoid.every(o=>Math.hypot(o.x-x,o.y-y)>=sep+(o.radius&&opts.useRadius?o.radius:0))&&(!opts.los||this.pathClear(cx,cy,x,y,Math.min(10,rad)));
 return spiralSearch(cx,cy,ok,{minR,maxR,rad,angle:opts.angle||0,step:opts.step||0})}
// ---- Dungeon zones: rooms ('r#') and corridor gaps ('c#') ------------------------------------
zoneAt(x,y){const w=this.world;if(!w||w.kind!=='dungeon')return null;for(const r of w.rooms)if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return 'r'+r.id;
 for(let i=0;i<w.corridors.length;i++){const c=w.corridors[i];if(x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h)return 'c'+i}return null}
zoneOf(a){const z=this.zoneAt(a.x,a.y);if(z)a._zone=z;return z||a._zone||null}
roomAt(x,y){const z=this.zoneAt(x,y);return z&&z[0]==='r'?+z.slice(1):-1}
zonesAdjacent(a,b){if(!a||!b)return false;if(a===b)return true;const w=this.world;if(a[0]===b[0])return false;const c=w.corridors[+(a[0]==='c'?a:b).slice(1)],r=+(a[0]==='r'?a:b).slice(1);return !!c&&(c.a===r||c.b===r)}
// A monster may fight a target in its own zone; once alerted it keeps chasing into adjacent zones.
canEngage(e,t){if(this.world.kind!=='dungeon')return true;const ze=this.zoneOf(e),zt=this.zoneOf(t);if(!ze||!zt)return false;return ze===zt||(!!e.alerted&&this.zonesAdjacent(ze,zt))}
// Shadows only pick fights the player can see (current room) or with monsters already hunting.
shadowCanTarget(e){if(this.world.kind!=='dungeon')return true;const f=this.fog||this.computeFog();return f.lit.has(this.zoneOf(e))||!!e.alerted}
// ---- Fog of war ------------------------------------------------------------------------------
// Only the player's current zone is lit. Corridors leaving the current room are dimly visible;
// with high Perception the neighbouring rooms are revealed too (enemies inside become visible).
computeFog(){const w=this.world,p=this.player,lit=new Set(),near=new Set(),per=p.stats.PER>=FOG_RULES.perAdjacent;if(w.kind!=='dungeon')return this.fog={lit,near,per,zone:null};
 const z=this.zoneOf(p);if(z){lit.add(z);if(z[0]==='r'){const i=+z.slice(1);w.corridors.forEach((c,k)=>{if(c.a===i||c.b===i){near.add('c'+k);if(per)near.add('r'+(c.a===i?c.b:c.a))}})}else{const c=w.corridors[+z.slice(1)];if(per){near.add('r'+c.a);near.add('r'+c.b)}}}
 for(const r of w.rooms)if(lit.has('r'+r.id)||near.has('r'+r.id))r.seen=true;
 return this.fog={lit,near,per,zone:z}}
fogVisible(a){if(this.world.kind!=='dungeon')return true;const f=this.fog||this.computeFog(),z=this.zoneOf(a);return f.lit.has(z)||f.near.has(z)}
drawFog(c){const w=this.world;if(w.kind!=='dungeon')return;const f=this.fog||this.computeFog(),t=this.time,M=16,dark=w.theme?shadeHex(w.theme.pal.bg,w.theme.dark>=.5?-.75:-.55):'#020409';c.save();
 w.corridors.forEach((cr,k)=>{const z='c'+k;if(f.lit.has(z))return;const g=cr.gap;c.globalAlpha=f.near.has(z)?.42:(w.rooms[cr.a].seen||w.rooms[cr.b].seen)?.82:.97;c.fillStyle=dark;
  if(g.w<g.h)c.fillRect(g.x-M,g.y,g.w+M*2,g.h);else c.fillRect(g.x,g.y-M,g.w,g.h+M*2)});
 for(const r of w.rooms){const z='r'+r.id;if(f.lit.has(z))continue;const a=f.near.has(z)?.5:r.seen?.8:.97;c.globalAlpha=a;c.fillStyle=dark;c.fillRect(r.x-M,r.y-M,r.w+M*2,r.h+M*2);
  // drifting mist (world-anchored) over the dark room
  c.save();c.beginPath();c.rect(r.x-M,r.y-M,r.w+M*2,r.h+M*2);c.clip();const fm=w.theme&&w.theme.fog||['#3a2a66','#1d1638'];c.fillStyle=f.near.has(z)?fm[0]:fm[1];
  for(let i=0;i<6;i++){const hx=hash2(r.id,i),hy=hash2(i,r.id+9),x=r.x+((hx*r.w+t*(8+i*3))%(r.w+160))-80,y=r.y+hy*r.h;c.globalAlpha=(f.near.has(z)?.16:.22)*(.6+.4*Math.sin(t*.7+i));c.beginPath();c.ellipse(x,y,70+hx*60,18+hy*14,0,0,7);c.fill()}c.restore()}
 c.restore()}
// ---- Shadow attacks (copies of the monster kit, aimed at enemies) ---------------------------
shadowStrike(s,A){const a=A.a,dmg=s.damageOf(a),col='#b46bff';s.swing=.25;A.phase='recover';A.t=a.recover*.6;
 if(a.kind==='melee'){for(const e of [...this.enemies]){const d=dist(s,e),ang=Math.atan2(e.y-s.y,e.x-s.x),diff=Math.abs(Math.atan2(Math.sin(ang-A.aim),Math.cos(ang-A.aim)));if(d<a.range+e.radius*.5+10&&diff<a.arc)this.hit(e,dmg,false,s,ang)}this.hazards.push({kind:'claw',x:s.x,y:s.y-14,angle:A.aim,r:a.range,arc:a.arc,t:.2,max:.2,color:col});this.particles.burst(s.x+Math.cos(A.aim)*a.range*.6,s.y-14+Math.sin(A.aim)*a.range*.6,'#8ff0ff',5,{angle:A.aim,spread:1.2,speed:150})}
 else if(a.kind==='slam'){for(const e of [...this.enemies])if(dist(s,e)<a.radius)this.hit(e,dmg,false,s);this.particles.ring(s.x,s.y+8,col,a.radius,.45,6);this.particles.burst(s.x,s.y,'#4b1f86',22,{speed:220});this.shake(3,.15)}
 else if(a.kind==='projectile'){const n=a.count||1;for(let i=0;i<n;i++){const ang=A.aim+(n>1?(i/(n-1)-.5)*a.spread*2:0);this.projectiles.push({x:s.x+Math.cos(ang)*s.radius,y:s.y-16+Math.sin(ang)*s.radius*.5,vx:Math.cos(ang)*a.speed,vy:Math.sin(ang)*a.speed,life:a.range/a.speed+.25,damage:dmg,color:'#a66bff',size:a.size||6,atk:a,owner:s,ally:true})}}
 else if(a.kind==='lunge'){A.phase='lunge';A.t=a.dashTime;A.hit=new Set();this.particles.ring(s.x,s.y+8,col,60,.3,3)}
 else if(a.kind==='super'){const pat=a.pattern;this.shake(6,.4);this.particles.burst(s.x,s.y-20,col,40,{speed:300});
  if(pat==='nova'||pat==='both')for(let i=0;i<(a.rings||1);i++)this.hazards.push({kind:'nova',x:s.x,y:s.y,r:10,max:a.radius,speed:a.radius/.75,delay:i*.4,damage:dmg,hit:new Set(),color:col,atk:a,owner:s,ally:true});
  if(pat==='rain'||pat==='both'){const c=A.pos||s;for(let i=0;i<(a.count||6);i++){const r=i?rand(50,170):0,an=rand(0,Math.PI*2);this.hazards.push({kind:'blast',x:c.x+Math.cos(an)*r,y:c.y+Math.sin(an)*r*.8,r:a.blast||70,delay:.6+i*.08,max:.6+i*.08,damage:dmg,color:col,atk:a,owner:s,boom:0,ally:true})}}}
}
spawnSoldiers(){const p=this.player,taken=[];return this.army.map((d,i)=>{const r=Math.min(26,shadowDef(normalizeShadow(d,p.level)).radius||16);
 const sp=this.findFreeSpot(p.x,p.y,r,40,260,{los:true,avoid:[p,...taken],sep:r+14,angle:(p.angle||0)+Math.PI})||this.findFreeSpot(p.x,p.y,12,0,320,{avoid:taken,sep:20})||{x:p.x,y:p.y};taken.push(sp);return new ShadowSoldier(d,i,sp)})}
returnHub(){this.world=this.cityIndex===1?makeSecondCity():new WorldMap();this.animation=new PlayerAnimation(this.sprites);this.pendingStrikes=[];this.projectiles=[];this.hazards=[];this.impacts=[];const sp=this.cityIndex===1?THIS_CITY2.spawn:HUB.spawn;this.placePlayerAt(sp);this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.bossDefeated=false;this.chest=false;this.redGate=false;this.redGateActive=false;this.penalty=null;this.classChange=false;this.ally=null;this.roomEvent=null;this.eventRoom=-1;this.weather=0;this.armyOrder='ATTACK';
 if(this.cityIndex===1){this.gates=new GateSystem();this.gates.update(0,this);this.rollContracts()}
 UIManager.close();this.resize();this._camSnap=true;SaveSystem.save(this);this.message(this.cityIndex===1?'ÁREA SEGURA · BUSAN':'ÁREA SEGURA · ASSOCIAÇÃO DOS CAÇADORES')}
interact(){let p=this.player;
 if(this.cutscene){this.advanceCutscene();return}
 if(this.world.kind==='hub'||this.world.kind==='city2'){
  if(this.world.kind==='city2'&&this.world.portal&&dist(p,this.world.portal)<90){this.travelToCity(0);return}
  const gate=this.gates.nearest(p);if(gate){this.selectedGate=gate;UIManager.open('gate');return}
  if(dist(p,HUB.merchant)<100){UIManager.open('shop');return}
  if(dist(p,HUB.healer)<100){p.hp=p.maxhp;p.mp=p.maxmp;this.message('HP E MP RESTAURADOS');this.sound.play('alert');this.particles.burst(p.x,p.y,'#5affb0',24,{speed:90,lift:60});return}
  if(this.world.kind==='hub'&&dist(p,HUB.contractBoard)<90){this.openContracts();return}
  if(this.world.kind==='hub'&&dist(p,HUB.jinho)<90){this.talkJinho();return}
  if(this.world.kind==='hub'&&dist(p,HUB.portal2)<90){this.travelToCity(1);return}
  const hi=this.gates.list.find(g=>dist(g,p)<150&&RANKS.indexOf(g.rank)>=3);if(hi&&Math.random()<.5){this.talkCha();return}
  return}
 // dentro da dungeon
 let corpse=this.corpses.find(c=>dist(c,p)<75);if(corpse){this.extractShadow(corpse);return}
 // eventos aleatórios de sala
 if(this.roomEvent){const ev=this.roomEvent,r=this.world.rooms[ev.room];if(r&&Math.hypot(p.x-r.cx,p.y-r.cy)<120){
  if(ev.type==='trap'){this.roomEvent=null;this.message('ARMADILHA ACIONADA!');this.shake(6,.3);this.damagePlayer(14);this.spawnCityMonsters(r.cx,r.cy,2,1+RANKS.indexOf(this.world.rank)*4);return}
  if(ev.type==='hunter'&&!ev.taken){ev.taken=true;this.message('CAÇADOR FERIDO SE JUNTOU A VOCÊ');this.spawnAlly(PEOPLE.hunters[4],'CAÇADOR FERIDO');this.roomEvent=null;return}
  if(ev.type==='challenge'){this.message('DESAFIO EM ANDAMENTO · ABATA '+ev.need);return}}
 if(this.bossDefeated&&!this.chest&&dist(p,{x:1500,y:600})<90){this.chest=true;p.gold+=(200+this.world.rank.charCodeAt(0))*(this.redGate?2:1);this.unlocked=Math.min(5,Math.max(this.unlocked,RANKS.indexOf(this.world.rank)+1));this.message('BAÚ COLETADO! PORTAL DE SAÍDA ABERTO');
   if(this.classChangeReady){p.playerClass=1;this.classChange=false;this.classChangeReady=false;this.redGateActive=false;this.startCutscene([{who:'SISTEMA',text:'MUDANÇA DE CLASSE · MONARCA DAS SOMBRAS',color:'#c879ff',dur:2.6},{who:'SISTEMA',text:'HP +15% · novas sombras obedecem · o Sistema reconhece você',color:'#7fe8ff',dur:2.8}],{auto:2.6,zoom:1.9,focus:()=>p,onDone:()=>this.message('CLASSE DESBLOQUEADA')})}
   SaveSystem.save(this)}else if(this.chest&&dist(p,{x:1560,y:650})<110)this.returnHub()}}
// Cerimônia do "Levante-se": 3 tentativas, chance por nível e INT; chefes ganham câmera lenta + LEVANTE-SE.
extractShadow(corpse){const p=this.player;corpse.tries=(corpse.tries||0)+1;const isBoss=!!corpse.boss;
 const chance=Math.min(.9,.35+p.stats.INT*.02+(p.level-corpse.level)*.03)*(isBoss?.7:1)*(this.isNight()?1.1:1);
 if(this.army.length>=this.shadowCap()){this.message(`CAPACIDADE DE SOMBRAS ATINGIDA · ${this.army.length}/${this.shadowCap()}`);return}
 this.animation.play('summon',p,.5);this.animation.effect('summon',corpse);this.particles.burst(corpse.x,corpse.y,'#bd59ff',30);this.sound.play('shadow',corpse.x,corpse.y);
 if(Math.random()<chance){
  const u=isBoss?UNIQUE_SHADOWS[corpse.type]:null;
  const d=normalizeShadow({name:u?u.name:corpse.name,type:corpse.type,boss:isBoss,art:corpse.art,level:corpse.level,rank:isBoss?'Comandante':'Normal',kills:0,xp:0,unique:u?u.key:null},p.level);
  if(u){d.rank=shadowRankTitle(0);d.unique=u.key}
  this.army.push(d);
  if(this.summoned){const sp=this.findFreeSpot(corpse.x,corpse.y,Math.min(26,shadowDef(d).radius),0,160,{avoid:this.soldiers,sep:24})||{x:p.x,y:p.y};this.soldiers.push(new ShadowSoldier(d,this.soldiers.length,sp))}
  this.corpses.splice(this.corpses.indexOf(corpse),1);
  if(isBoss){this.startCutscene([{who:'SISTEMA',text:'LEVANTE-SE',color:'#c879ff',dur:2.2},{who:'SISTEMA',text:`${d.name} · ${u?u.title:'SOMBRA'} EXTRAÍDA COM SUCESSO`,color:'#7fe8ff',dur:2.4}],{auto:2.2,zoom:1.8,focus:()=>corpse})}
  else this.message('EXTRAÇÃO DE SOMBRA BEM-SUCEDIDA!');
  SaveSystem.save(this)}else{this.message(`EXTRAÇÃO FALHOU · ${3-corpse.tries} TENTATIVAS`);if(corpse.tries>=3)this.corpses.splice(this.corpses.indexOf(corpse),1)}}
// ---- Interações da cidade: contratos, história, nova cidade -----------------------------------
openContracts(){UIManager.open('contracts')}
talkJinho(){const st=this.story;
 if(!st.jinho){st.jinho=1;this.startCutscene([{who:'YOO JIN-HO',text:'Você é o Player? Eu ouvi falar de você. Me deixe entrar na próxima dungeon com você.',color:'#ffd27a',dur:3},{who:'SISTEMA',text:'Missão: entre em uma dungeon com Yoo Jin-ho. Recompensa: 200 G e 2 pontos.',color:'#7fe8ff',dur:3}],{auto:3,zoom:1.6,focus:()=>({x:HUB.jinho.x,y:HUB.jinho.y}),onDone:()=>{st.jinho=2;this.message('JIN-HO DISPONÍVEL · INVOQUE-O NA DUNGEON COM [G]')}});return}
 if(st.jinho===2){this.startCutscene([{who:'YOO JIN-HO',text:'Estou pronto quando você estiver. Vamos nessa!',color:'#ffd27a',dur:2.4}],{auto:2.4,zoom:1.6,focus:()=>({x:HUB.jinho.x,y:HUB.jinho.y})});return}
 this.startCutscene([{who:'YOO JIN-HO',text:'Obrigado por hoje. Você é mais forte do que todos dizem.',color:'#ffd27a',dur:2.6}],{auto:2.6,zoom:1.6,focus:()=>({x:HUB.jinho.x,y:HUB.jinho.y})})}
talkCha(){const st=this.story;st.cha=(st.cha||0)+1;
 this.startCutscene([{who:'CHA HAE-IN',text:'Você é Sung Jin-Woo. Eu sinto... um poder diferente em você. Cuidado com gates de rank alto.',color:'#8fd8ff',dur:3.2},{who:'SISTEMA',text:'Cha Hae-in concedeu sua bênção: +10% de mana por 60 segundos.',color:'#7fe8ff',dur:2.6}],{auto:3,zoom:1.7,focus:()=>this.player,onDone:()=>{this.player.mp=this.player.maxmp;this.message('BÊNÇÃO DE CHA HAE-IN')}})}
// ---- Gate vermelho: sem saída até o chefe; clima piora com o tempo -----------------------------
enterRed(rank,themeId){this.enter(rank,true,themeId);this.redGateActive=true;this.redTimer=90;this.weather=0;this.message('GATE VERMELHO · SEM SAÍDA ATÉ O CHEFE')}
// MP/s currently drained by the summoned army (only shadows standing on the field).
armyDrain(){return this.summoned?armyUpkeep(this.player,this.soldiers.filter(s=>s.state!=='REGENERATE').map(s=>s.data)):0}
updateArmyMana(dt){const p=this.player;this.armyT=(this.armyT||0)+dt;p.mp-=this.armyDrain()*dt;
 if(p.mp<=0){p.mp=0;for(const s of this.soldiers)this.particles.burst(s.x,s.y-12,'#3b1466',12,{speed:70});this.summoned=false;this.soldiers=[];this.message(`MANA ESGOTADA · SOMBRAS RETORNARAM APÓS ${fmtTime(this.armyT)}`);this.sound.play('shadow')}}
toggleArmy(){const p=this.player;let cost=0;
 if(!this.summoned){if(!this.army.length){this.tutSummon++;this.message('NENHUMA SOMBRA NO EXÉRCITO · EXTRAIA COM [E]');return}
  this.army.forEach(d=>normalizeShadow(d,p.level));cost=armySummonCost(p,this.army);
  if(p.mp<cost){this.message(`MANA INSUFICIENTE · INVOCAR CUSTA ${cost} MP`);this.floats.push({x:p.x,y:p.y-58,text:`${cost} MP`,life:.9,color:'#ff8fa0',size:13});return}
  p.mp-=cost;this.armyT=0;this.floats.push({x:p.x,y:p.y-62,text:`−${cost} MP`,life:1.1,color:'#c99bff',size:15})}
 this.summoned=!this.summoned;this.soldiers=this.summoned?this.spawnSoldiers():[];if(this.summoned)this.tutSummon++;for(const s of this.soldiers)this.particles.burst(s.x,s.y-12,'#a855f7',14,{speed:90,lift:40});this.message(this.summoned?`EXÉRCITO INVOCADO · −${cost} MP · −${fmtRate(this.armyDrain())} MP/s · ORDEM ${this.armyOrder}`:'SOMBRAS GUARDADAS');this.animation.play('summon',this.player,.45);this.animation.effect('summon',this.player);this.sound.play('shadow')}
// Dash: short invulnerability and an ambush bonus window (stealth). The hero stays fully opaque.
// Touch auto-aim: nearest visible enemy (wider reach while the attack button is held).
aimTarget(){const p=this.player;let best=null,bd=this.input.touchAttack?280:200;for(const e of this.enemies){if(!this.fogVisible(e))continue;const d=dist(e,p)-e.radius*.5;if(d<bd){bd=d;best=e}}return best}
// Assistente de mira no toque: mirar no alvo mais próximo enquanto o ataque está pressionado;
// soltar dispara o golpe. No PC, o mouse mira pelo ângulo do cursor.
aimAssist(){if(!this.input.touchAttack||!this.input.stick||this.input.stick.mag<.18)return;const t=this.aimTarget();if(t){this.player.angle=Math.atan2(t.y-this.player.y,t.x-this.player.x);this.player.aimAssist=true}}
drawAimAssist(){if(!this.input.touchAttack)return;const t=this.aimTarget();if(!t)return;const p=this.player;const sx=t.x-this.camera.x,sy=t.y-this.camera.y,W=canvas.width,H=canvas.height;ctx.save();ctx.strokeStyle='#3fd6ff';ctx.globalAlpha=.5;ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(p.x-this.camera.x,p.y-14-this.camera.y);ctx.lineTo(clamp(sx,20,W-20),clamp(sy,20,H-20));ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(clamp(sx,20,W-20),clamp(sy,20,H-20),10,0,7);ctx.stroke();ctx.restore()}
dash(){if(!this.started||this.panel||this.player.dashCd>0)return;let p=this.player;p.dashTime=.18;p.invuln=.3;p.stealth=1.5;p.dashCd=this.dashCdMax();this.tutDash++;if(this.daily)this.daily.dashes++;let dx=(this.input.keys.d||this.input.keys.arrowright?1:0)-(this.input.keys.a||this.input.keys.arrowleft?1:0),dy=(this.input.keys.s||this.input.keys.arrowdown?1:0)-(this.input.keys.w||this.input.keys.arrowup?1:0);let n=Math.hypot(dx,dy);const st=this.input.stick;if(!n&&st&&st.mag>.18){dx=st.x;dy=st.y;n=Math.hypot(dx,dy)}p.dashX=n?dx/n:Math.cos(p.angle);p.dashY=n?dy/n:Math.sin(p.angle);this.animation.play('dash',p,.18,Math.atan2(p.dashY,p.dashX));this.particles.ring(p.x,p.y+8,'#3fd6ff',50,.3,3);this.particles.burst(p.x,p.y-4,'#14062a',4,{kind:'smoke',speed:30,life:1,size:10});this.particles.burst(p.x,p.y-10,'#b06bff',8,{kind:'ember',speed:60,life:.8});this.sound.play('dash')}
attack(mult=1,range=85,area=false,forceCrit=false,bypass=false,style='combo'){this.combatT=2.5;
 let p=this.player;if(!p||(!bypass&&p.cool>0)||this.panel)return;
 if(!bypass)p.cool=Math.max(.16,.36-p.stats.AGI*.005);
 if(style==='combo'){this.tutAttack++}
 let variant=0;
 if(style==='combo'){p.combo=p.comboWindow>0?(p.combo%3)+1:1;p.comboWindow=.85;variant=p.combo;this.animation.play(`combo${variant}`,p,variant===3?.3:.23)}
 else if(style==='mutilation'){variant=bypass?++p.multiVisual:0;this.animation.play('mutilation',p,.16)}
 else if(style==='vital')this.animation.play('vital',p,.3);
 else if(style==='authority')this.animation.play('authority',p,.5);
 this.animation.effect(style,p,p.angle,variant);this.sound.play('slash',p.x,p.y);
 const fx=p.x+Math.cos(p.angle)*50,fy=p.y-14+Math.sin(p.angle)*50;this.particles.burst(fx,fy,variant===3?'#b06bff':'#7ff0ff',variant===3?14:6,{angle:p.angle,spread:1.4,speed:220,life:.6});
 const dmgBase=p.atk*mult*this.talentDmgMult()*(p.stealth>0?1.5:1)*(variant===3?1.25:1);
 for(let e of [...this.enemies]){let d=dist(p,e),a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));if(d<range+e.radius*.6&&(area||Math.abs(diff)<1.15)){let crit=forceCrit||Math.random()<this.critChance();if(forceCrit)e.bleed=3;let damage=dmgBase*(crit?1.75+p.stats.PER*.02:1)*(1+this.bestiaryBonus(e.type));this.hit(e,damage,crit,null,a);p.stealth=0}}
 // golpes fortes também quebram pilares e revelam paredes rachadas
 if(style!=='mutilation')this.hitBreakables(p.x,p.y,p.angle,range,area?Math.PI:1.15);
 if(this._secretCheck===0&&this.world.secret)this._secretCheck=1;
 if(this.world.secret&&this.player.stats.PER>=18)this.revealSecret();
}
skill(n){let p=this.player,cost=[0,15,25,35][n];if(p.mp<cost||p.cool>0){this.message('MANA INSUFICIENTE OU HABILIDADE EM RECARGA');return}p.mp-=cost;if(n===1){this.moveActor(p,Math.cos(p.angle)*55,Math.sin(p.angle)*55);this.attack(1.3,100,false,true,false,'vital')}if(n===2){p.multiVisual=0;this.attack(.7,110,false,false,false,'mutilation');p.cool=Math.max(p.cool,.42);for(let i=1;i<5;i++)this.pendingStrikes.push({delay:i*.09})}if(n===3){this.attack(1.8,160,true,false,false,'authority');for(let e of this.enemies)if(dist(e,p)<160+e.radius*.5){e.stun=1.5;if(e.state!=='chase'){e.state='chase';e.current=null}let a=Math.atan2(e.y-p.y,e.x-p.x);this.moveActor(e,Math.cos(a)*70,Math.sin(a)*70);this.terrainPunish(e)}this.hitBreakables(p.x,p.y,p.angle,170,Math.PI);this.particles.burst(p.x,p.y,'#71dfff',30,{speed:260});this.particles.ring(p.x,p.y+10,'#b06bff',190,.55,6);this.particles.ring(p.x,p.y+10,'#3fd6ff',150,.45,3);this.shake(7,.32)}}
hit(e,amount,crit,source=null,angle=null){amount=this.eliteOnHit(e,amount);amount*=1+this.bestiaryBonus(e.type);e.hp-=amount;e.flash=.14;const a=angle??Math.atan2(e.y-this.player.y,e.x-this.player.x);
 this.particles.burst(e.x,e.y-16,crit?'#ffe490':'#79eaff',crit?22:10,{angle:a,spread:1.6,speed:crit?300:220});this.particles.burst(e.x,e.y-16,'#ffffff',4,{speed:140,size:2});this.impacts.push({x:e.x,y:e.y-18,angle:a,crit,t:.2,max:.2});
 if(crit)this.shake(4,.12);
 // hit-stop: golpes fortes, críticos e chefes congelam a tela por um instante
 if(crit||amount>40||e.boss)this.hitStop=Math.max(this.hitStop,e.boss?.05:.045);
 // combo visível: sequência de golpes do jogador sem levar dano
 if(!source||source.isShadow){this.comboSeq++;this.comboSeqT=3;if(this.comboSeq%10===0){this.player.xp+=15;this.player.mp=Math.min(this.player.maxmp,this.player.mp+12);this.floats.push({x:this.player.x,y:this.player.y-70,text:`COMBO x${this.comboSeq} · +XP +MP`,life:1.1,color:'#7fe8ff',size:14});this.sound.play('sys')}}
 // talento de atordoamento e efeitos dos equipamentos
 if(!source&&Math.random()<talentLevel('for_stun')*.08){e.stun=Math.max(e.stun,.7);this.floats.push({x:e.x,y:e.y-56,text:'ATORDOADO',life:.7,color:'#ffe16c',size:11})}
 if(!source&&Math.random()<this.bleedChance()){e.bleed=3;this.floats.push({x:e.x,y:e.y-52,text:'SANGRAMENTO',life:.7,color:'#ff6a7a',size:11})}
 if(!source&&this.player.equipped.weapon==='barca'&&Math.random()<.4){e.hp-=6;e.flash=.12;this.particles.burst(e.x,e.y-16,'#ff8a3a',10,{kind:'ember',speed:120,lift:40});if(e.hp<=0){this.kill(e);return}}
 if(!e.boss&&e.state!=='lunge'){this.moveActor(e,Math.cos(a)*(crit?10:5),Math.sin(a)*(crit?10:5))}
 this.terrainPunish(e);
 this.floats.push({x:e.x,y:e.y-40,text:(crit?'CRÍTICO! ':'')+Math.floor(amount),life:.9,color:crit?'#ffe16c':'#fff',size:crit?20:16});this.sound.play('hit',e.x,e.y);e.alerted=true;
 if(e.hp<=0){if(source){source.data.kills=(source.data.kills||0)+1;if(source.gainXP)source.gainXP(e,this)}this.kill(e)}}
kill(e){let p=this.player,mult=(this.redGate?2:1)*this.eliteRewardMult(e);this.enemies.splice(this.enemies.indexOf(e),1);this.eliteDeath(e);this.corpses.push({x:e.x,y:e.y,life:12,tries:0,level:e.level,boss:e.boss,name:e.name,type:e.type,art:e.art,unique:e.unique||null});this.particles.burst(e.x,e.y-10,e.red?'#ff4b57':'#9fb4c8',18,{speed:160});
 p.gold+=Math.round((e.boss?150:rand(8,20)|0)*mult);p.xp+=Math.round((e.boss?120+e.level*10:20+e.level*4)*mult);p.kills=(p.kills||0)+1;if(this.daily)this.daily.kills++;
 this.bestiaryKill(e);this.contractKill(this.world.kind==='dungeon'?this.world.rank:null);this.addHunterPoints(e.boss?40:e.elite?8:2);
 if(e.boss){this.addHunterPoints(20);const drop=this.bossDrop(e);if(drop)this.gainItem(drop);if(this.classChange){this.classChangeReady=true;this.message('O CARTENON FOI CUMPRIDO · COLETE O BAÚ PARA MUDAR DE CLASSE')}}
 // eventos de sala: o desafio conta os abates do jogador
 if(this.roomEvent&&this.roomEvent.type==='challenge'){this.roomEvent.kills++;this.roomEvent.kills>=this.roomEvent.need&&this.resolveRoomEvent()}
 // zona de penalidade: onda de monstros concluída
 if(this.penalty&&this.penalty.need&&this.penalty.wave>=this.penalty.need&&!this.enemies.length){this.penalty=null;this.daily.penalty=false;this.daily.done=true;this.player.points+=2;this.message('PENALDADE CUMPRIDA · O SISTEMA ESTÁ SATISFEITO');this.sound.play('sys')}
 // progressão de sombras únicas: patente sobe com abates
 if(e.boss){const u=UNIQUE_SHADOWS[e.type];if(u){const sh=this.army.find(s=>s.unique===u.key);if(sh){sh.kills=(sh.kills||0)+1;sh.rank=shadowRankTitle(sh.kills)}}}
 if(this.quest>=15&&!this.questDone){p.points+=3;this.questDone=true;this.message('MISSÃO DIÁRIA COMPLETA · +3 PONTOS')}
 while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.points+=5;p.talentPoints=(p.talentPoints||0)+1;p.hp=p.maxhp;p.mp=p.maxmp;this.message(`LEVEL UP! NÍVEL ${p.level} · +5 PONTOS · +1 TALENTO`);if(p.level===CLASS_CHANGE_LEVEL&&p.playerClass<1){this.message('MUDANÇA DE CLASSE DISPONÍVEL · DUNGEON ESPECIAL DE CARTENON');this.spawnClassGate()}}
 if(e.boss){this.bossDefeated=true;this.hazards=[];this.projectiles=[];this.hitStop=Math.max(this.hitStop,.06);this.message('CHEFE DERROTADO · COLETE O BAÚ');this.particles.burst(e.x,e.y,'#ffb260',60,{speed:300});this.particles.ring(e.x,e.y,'#ffb260',220,.7,6);this.shake(10,.5);if(this.penalty)this.penalty.wave++}
 SaveSystem.save(this)}
bossDrop(e){const t=e.type;if(t==='C')return 'kasaka';if(t==='S')return 'barca';if(t==='B')return 'demoncape';return null}
spawnClassGate(){const p=this.player;const g=this.gates.spawn(this,{x:clamp(p.x+300,100,this.world.w-100),y:clamp(p.y-200,100,this.world.h-100),instant:true,rank:'C',theme:'cartenon',silent:false});if(g)g.classChange=true}
damagePlayer(n){let p=this.player;if(p.invuln>0)return false;const red=(1-Math.min(.6,p.stats.VIT*.008))*(1-Math.min(.5,p.armor/100));p.hp-=n*red;p.invuln=.4;p.hurtTime=.22;this.shake(5,.18);this.comboSeq=0;this.comboSeqT=0;this.particles.burst(p.x,p.y-16,'#ff6579',14,{speed:180});this.floats.push({x:p.x,y:p.y-50,text:'-'+Math.round(n*red),life:.8,color:'#ff7d8c',size:15});this.sound.play('hit',p.x,p.y);if(p.hp<=0){p.hp=0;UIManager.open('dead')}return true}
potion(type){let p=this.player;if(type==='hp'&&p.hppots>0&&p.hp<p.maxhp){p.hppots--;p.hp=Math.min(p.maxhp,p.hp+p.maxhp*.5);this.message('POÇÃO DE VIDA UTILIZADA');this.particles.burst(p.x,p.y,'#ff6b7f',18,{speed:80,lift:60})}if(type==='mp'&&p.mppots>0&&p.mp<p.maxmp){p.mppots--;p.mp=Math.min(p.maxmp,p.mp+p.maxmp*.5);this.message('POÇÃO DE MANA UTILIZADA');this.particles.burst(p.x,p.y,'#4fd5ff',18,{speed:80,lift:60})}}
// ---- Enemy attacks ------------------------------------------------------------------------
enemyTargets(){return [this.player,...(this.ally?[this.ally]:[]),...this.soldiers.filter(s=>s.state!=='REGENERATE')]}
enemyDamage(tg,amount,a,e){if(tg===this.player){if(this.damagePlayer(amount)){if(a.slow)tg.slow=Math.max(tg.slow||0,a.slow);if(a.poison)tg.poison=Math.max(tg.poison||0,a.poison)}}else tg.hurt(amount,this)}
enemyStrike(e,a){const dmg=e.damageOf(a),col=a.color||(e.red?'#ff4b57':'#ff8a6a');e.state='recover';e.stateT=a.recover;e.swing=.25;
 if(a.kind==='melee'){for(const tg of this.enemyTargets()){const d=dist(e,tg),ang=Math.atan2(tg.y-e.y,tg.x-e.x),diff=Math.abs(Math.atan2(Math.sin(ang-e.aim),Math.cos(ang-e.aim)));if(d<a.range+14&&diff<a.arc){this.enemyDamage(tg,dmg,a,e);if(tg.isAlly)tg.hurt(dmg,this)}}this.hazards.push({kind:'claw',x:e.x,y:e.y-14,angle:e.aim,r:a.range,arc:a.arc,t:.2,max:.2,color:e.boss?'#ff4b57':'#ffd2c8'});this.particles.burst(e.x+Math.cos(e.aim)*a.range*.6,e.y-14+Math.sin(e.aim)*a.range*.6,'#ffb3a8',6,{angle:e.aim,spread:1.2,speed:160})}
 else if(a.kind==='slam'){for(const tg of this.enemyTargets())if(dist(e,tg)<a.radius){this.enemyDamage(tg,dmg,a,e);if(tg.isAlly)tg.hurt(dmg,this)}this.particles.ring(e.x,e.y+8,'#ffcf8a',a.radius,.45,6);this.particles.burst(e.x,e.y,'#c9a46a',26,{speed:240});this.shake(7,.3)}
 else if(a.kind==='projectile'){const n=a.count||1;for(let i=0;i<n;i++){const ang=e.aim+(n>1?(i/(n-1)-.5)*a.spread*2:0);this.projectiles.push({x:e.x+Math.cos(ang)*e.radius,y:e.y-16+Math.sin(ang)*e.radius*.5,vx:Math.cos(ang)*a.speed,vy:Math.sin(ang)*a.speed,life:a.range/a.speed+.25,damage:dmg,color:a.color,size:a.size||6,atk:a,owner:e})}}
 else if(a.kind==='lunge'){e.state='lunge';e.stateT=a.dashTime;e.lungeHit=new Set();this.particles.ring(e.x,e.y+8,'#ffffff',60,.3,3)}
 else if(a.kind==='super'){const pat=a.pattern;this.shake(10,.6);this.particles.burst(e.x,e.y-20,col,50,{speed:320});
  if(pat==='nova'||pat==='both')for(let i=0;i<(a.rings||1);i++)this.hazards.push({kind:'nova',x:e.x,y:e.y,r:10,max:a.radius,speed:a.radius/.75,delay:i*.4,damage:dmg,hit:new Set(),color:col,atk:a,owner:e});
  if(pat==='rain'||pat==='both'){const c=e.aimPos||this.player;for(let i=0;i<(a.count||6);i++){const r=i?rand(60,200):0,an=rand(0,Math.PI*2);this.hazards.push({kind:'blast',x:c.x+Math.cos(an)*r,y:c.y+Math.sin(an)*r*.8,r:a.blast||70,delay:.85+i*.09,max:.85+i*.09,damage:dmg,color:col,atk:a,owner:e,boom:0})}}
  if(a.summon&&this.world.kind==='dungeon')for(let i=0;i<(a.summonCount||1);i++){const def=MONSTER_TYPES[a.summon]||MONSTER_TYPES.goblin,sp=this.findFreeSpot(e.x,e.y,def.radius,e.radius+30,220,{avoid:this.enemies,sep:def.radius*2+6,los:true,angle:rand(0,Math.PI*2)});if(!sp)continue;const m=new Enemy(sp.x,sp.y,a.summon,Math.max(1,e.level-2),false,{red:e.red});m.alerted=true;m.home={x:e.home.x,y:e.home.y};this.enemies.push(m);this.particles.burst(m.x,m.y,'#a855f7',20)}}
}
updateCombatFX(dt){
 for(const pr of this.projectiles){pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.life-=dt;if(Math.random()<.7)this.particles.burst(pr.x,pr.y,pr.color,1,{speed:30,size:2,life:.5});
  if(this.world.kind==='dungeon'&&!this.world.walkable.some(r=>pr.x>=r.x&&pr.x<=r.x+r.w&&pr.y+16>=r.y&&pr.y+16<=r.y+r.h))pr.life=0;
  if(pr.ally){for(const e of [...this.enemies])if(pr.life>0&&Math.hypot(e.x-pr.x,e.y-16-pr.y)<pr.size+e.radius*.6+6){this.hit(e,pr.damage,false,pr.owner,Math.atan2(pr.vy,pr.vx));pr.life=0;this.particles.burst(pr.x,pr.y,'#8ff0ff',12,{speed:160})}continue}
  for(const tg of this.enemyTargets())if(pr.life>0&&Math.hypot(tg.x-pr.x,tg.y-16-pr.y)<pr.size+14){this.enemyDamage(tg,pr.damage,pr.atk,pr.owner);pr.life=0;this.particles.burst(pr.x,pr.y,pr.color,12,{speed:160})}}
 this.projectiles=this.projectiles.filter(pr=>pr.life>0);
 for(const h of this.hazards){
  if(h.kind==='claw'){h.t-=dt;continue}
  if(h.kind==='nova'){if(h.delay>0){h.delay-=dt;continue}h.r+=h.speed*dt;for(const tg of (h.ally?[...this.enemies]:this.enemyTargets()))if(!h.hit.has(tg)&&Math.abs(Math.hypot((tg.x-h.x),(tg.y-h.y)/.6)-h.r)<22){h.hit.add(tg);if(h.ally)this.hit(tg,h.damage,false,h.owner);else this.enemyDamage(tg,h.damage,h.atk,h.owner)}if(h.r>=h.max)h.done=true}
  if(h.kind==='blast'){if(h.delay>0){h.delay-=dt;if(h.delay<=0){for(const tg of (h.ally?[...this.enemies]:this.enemyTargets()))if(Math.hypot(tg.x-h.x,(tg.y-h.y)/.7)<h.r){if(h.ally)this.hit(tg,h.damage,false,h.owner);else this.enemyDamage(tg,h.damage,h.atk,h.owner)}this.particles.burst(h.x,h.y,h.color,26,{speed:260,lift:80});this.particles.ring(h.x,h.y,h.color,h.r*1.3,.4,5);this.shake(4,.15)}}else{h.boom+=dt;if(h.boom>.25)h.done=true}}
 }
 this.hazards=this.hazards.filter(h=>!h.done&&!(h.kind==='claw'&&h.t<=0));
 for(const im of this.impacts)im.t-=dt;this.impacts=this.impacts.filter(im=>im.t>0);
}
update(dt){let p=this.player;
 // Hit-stop: congela a ação por 40–60 ms em golpes fortes, críticos e na morte do chefe.
 if(this.hitStop>0){this.hitStop-=dt;dt=Math.min(dt,.006)}
 this.time+=dt;this.checkViewLayout(dt);
 if(this.qte)this.qte.update(dt);
 if(this.qte&&this.qte.done&&!this.qte.onDone)this.qte=null;
 if(this.cutscene){this.cutscene.update(dt);this.particles.update(dt);this.updateHUD();return}
 if(this.panel){if(this.panel==='gate'&&this.selectedGate){const el=$('#gateTime');if(el)el.textContent=fmtTime(this.selectedGate.life)}return}
 let today=new Date().toLocaleDateString('en-CA');const dateChanged=today!==this.questDate;if(dateChanged){this.questDate=today;this.quest=0;this.questDone=false;this.dailyTick(dateChanged);SaveSystem.save(this)}
 // ciclo dia/noite (cerca de 4 minutos por dia)
 this.dayTime=(this.dayTime+dt/240)%1;
 this.updateTutorial(dt);
 p.cool-=dt;p.dashCd-=dt;p.invuln-=dt;p.stealth-=dt;p.slash-=dt;p.hurtTime-=dt;p.slow=Math.max(0,(p.slow||0)-dt);p.comboWindow=(p.comboWindow||0)-dt;p.mp=Math.min(p.maxmp,p.mp+dt*MP_REGEN);p.hp=Math.min(p.maxhp,p.hp+dt*talentLevel('vit_regen')*.4);if(this.summoned)this.updateArmyMana(dt);
 this.exchangeCd=Math.max(0,this.exchangeCd-dt);
 if(p.poison>0){p.poison-=dt;p.poisonTick=(p.poisonTick||0)-dt;if(p.poisonTick<=0){p.poisonTick=.6;p.hp=Math.max(1,p.hp-(2+p.level*.4));this.particles.burst(p.x,p.y-20,'#7dff5a',4,{speed:40,lift:30})}}
 for(const strike of this.pendingStrikes)strike.delay-=dt;const due=this.pendingStrikes.filter(strike=>strike.delay<=0);this.pendingStrikes=this.pendingStrikes.filter(strike=>strike.delay>0);for(const strike of due)this.attack(.7,110,false,false,true,'mutilation');
 let keys=this.input.keys,dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),n=Math.hypot(dx,dy),analog=1;
 // Analog stick (touch): 360° movement; a light push walks, a full push runs.
 const st=this.input.stick;if(!n&&st&&st.mag>.18){dx=st.x;dy=st.y;n=Math.hypot(dx,dy);analog=st.mag<.6?.6:1}
 if(p.dashTime>0){p.dashTime-=dt;dx=p.dashX;dy=p.dashY;n=1;this.particles.burst(p.x,p.y-14,'#27bfff',2,{angle:Math.atan2(-dy,-dx),spread:.6,speed:120,kind:'streak'});
  // usar o dash para empurrar inimigos contra o terreno
  for(const e of this.enemies){if(e.boss)continue;const d=dist(e,p);if(d<60+e.radius){const a=Math.atan2(e.y-p.y,e.x-p.x);this.moveActor(e,Math.cos(a)*90*dt*4,Math.sin(a)*90*dt*4);this.terrainPunish(e)}}}
 let speed=p.dashTime>0?570:(140+p.stats.AGI*2.5)*this.moveSpeedMult()*(p.slow>0?.55:1)*analog;p.moving=!!n;if(n){p.moveAngle=Math.atan2(dy,dx);p.facing=dx||p.facing||1}
 // Ice: the hunter keeps momentum and slides (velocity eases toward the input instead of snapping).
 const px=p.x,py=p.y;
 {let vx=n?dx/n*speed:0,vy=n?dy/n*speed:0;const tz=this.world.terrainAt?this.world.terrainAt(p.x,p.y):null;
  if(tz&&tz.kind==='ice'&&!(p.dashTime>0)){const k=Math.min(1,dt*2.2);p.ivx=(p.ivx||0)+(vx-(p.ivx||0))*k;p.ivy=(p.ivy||0)+(vy-(p.ivy||0))*k;vx=p.ivx;vy=p.ivy;if(Math.hypot(vx,vy)>40&&Math.random()<dt*8)this.particles.burst(p.x,p.y+8,'#e8faff',1,{speed:30})}else{p.ivx=vx;p.ivy=vy}
  if(Math.abs(vx)+Math.abs(vy)>.5)this.moveActor(p,vx*dt,vy*dt)}
 if(p.moving&&p.dashTime<=0){const step=Math.hypot(p.x-px,p.y-py);p.distance+=step;if(this.daily)this.daily.distance+=step}
 if(p.moving)this.tutMove=(this.tutMove||0)+dt;
 this.terrainEffects(p,dt);
 // combo visível: sequência de golpes sem levar dano
 this.comboSeqT-=dt;if(this.comboSeqT<=0&&this.comboSeq>0){this.comboSeq=0}
 if(this.daily)this.checkDaily();
 // clima do gate vermelho: piora com o tempo
 if(this.redGateActive&&this.redTimer>0){this.redTimer-=dt;this.weather=clamp(1-this.redTimer/90,0,1);if(this.redTimer<=0){const rk=this.world.rank;this.message('O GATE VERMELHO COLAPSOU · QUEBRA DE DUNGEON');this.returnHub();this.dungeonBreak({x:this.player.x,y:this.player.y,rank:rk,broken:false});return}}
 // zona de penalidade: ondas de monstros até cumprir a sentença
 if(this.penalty){this.penalty.t=(this.penalty.t||1.5)-dt;
  if(!this.enemies.length&&this.penalty.t<=0&&this.penalty.wave<this.penalty.need){this.penalty.wave++;this.penalty.t=2.5;const n=2+this.penalty.wave;this.spawnCityMonsters(this.player.x,this.player.y,n,6+this.penalty.wave*3);this.message(`PENALDADE · ONDA ${this.penalty.wave}/${this.penalty.need}`);this.sound.play('alert')}}
 // eventos de sala e sala secreta
 this.roomEventCheck();this.roomEventTick(dt);this.checkSecretRoom();
 if(this.qte&&this.qte.done&&!this.qte.onDone)this.qte=null;
 if(this.fps){this._fpsAcc=(this._fpsAcc||0)+dt;this._fpsN=(this._fpsN||0)+1;if(this._fpsAcc>=.5){this.fpsVal=Math.round(this._fpsN/this._fpsAcc);this._fpsAcc=0;this._fpsN=0}}
 this.aimAssist();
 if(this.ally)this.ally.update(dt,this);
 let mx=this.input.mouse.x+this.camera.x,my=this.input.mouse.y+this.camera.y;if(this.input.touchMode){const t=this.aimTarget();if(t)p.angle=Math.atan2(t.y-p.y,t.x-p.x);else if(n)p.angle=Math.atan2(dy,dx)}else if(this.input.mouse.x||this.input.mouse.y)p.angle=Math.atan2(my-p.y,mx-p.x);else if(n)p.angle=Math.atan2(dy,dx);
 this.animation.update(dt,p);if(this.world.kind==='dungeon')this.computeFog();if(this.input.mouse.down||this.input.touchAttack)this.attack();
 if(this.world.kind==='hub'){this.combatT=Math.max(0,(this.combatT||0)-dt);this.world.update(dt);this.gates.update(dt,this)}
 for(let e of [...this.enemies]){const x=e.x,y=e.y;e.update(dt,this);e.animMoving=Math.hypot(e.x-x,e.y-y)>.01;e.swing=Math.max(0,(e.swing||0)-dt)}
 for(let [i,s] of this.soldiers.entries()){const x=s.x,y=s.y;s.update(dt,this,i);s.animMoving=Math.hypot(s.x-x,s.y-y)>.01;s.swing=Math.max(0,(s.swing||0)-dt)}
 this.updateCombatFX(dt);this.corpses=this.corpses.filter(c=>(c.life-=dt)>0);this.particles.update(dt);this.floats=this.floats.filter(f=>(f.life-=dt)>0);for(let f of this.floats)f.y-=35*dt;this.shakeT-=dt;if(this.shakeT<=0)this.shakeMag=0;
 this.hudClock-=dt;this.updateHUD()}
// ---- Expansão: tempo, talentos, itens, elite, terreno, quebra de dungeon ---------------------
isNight(){return this.dayTime>.78||this.dayTime<.22}
nightMult(){return this.isNight()?1.35:1}
talentDmgMult(){return 1+talentLevel('for_dmg')*.10}
critChance(){return (5+this.player.stats.PER*1.2+talentLevel('per_crit')*2)/100}
bleedChance(){return talentLevel('per_bleed')*.12+(this.player.equipped.weapon==='kasaka'?.35:0)}
dashCdMax(){return Math.max(.5,(1.3-this.player.stats.AGI*.01)*(1-talentLevel('agi_dash')*.07))}
moveSpeedMult(){return 1+talentLevel('agi_speed')*.03}
// Bonus de bestiário: 50 abates do mesmo tipo concedem +4% de dano contra ele.
bestiaryBonus(type){const b=this.bestiary[type];return b&&b.kills>=50?.04:0}
bestiaryKill(e){const t=e.type;if(!t)return;const b=this.bestiary[t]||(this.bestiary[t]={kills:0,seen:0});b.kills++;b.seen=Math.max(b.seen,1);if(b.kills===50){this.message(`BESTIÁRIO · ${e.name} COMPLETO · +4% DE DANO`);this.sound.play('sys')}}
// Elite: aplica um modificador e melhora as recompensas.
makeElite(e){if(e.boss||this.redGate&&Math.random()<.5||Math.random()<.16){e.elite=ELITE_KEYS[Math.floor(Math.random()*ELITE_KEYS.length)];e.eliteName=ELITE_MODS[e.elite].name;e.maxhp=Math.round(e.maxhp*(e.elite==='BLINDADO'?1.5:1.2));e.hp=e.maxhp;e.dmgMult*=1.15;return e}return e}
eliteRewardMult(e){return e.elite?2:1}
// Dano de Elite Blindado + explosão de Elite Explosivo.
eliteOnHit(e,amount){if(e.elite==='BLINDADO')return amount*.55;return amount}
eliteDeath(e){if(e.elite!=='EXPLOSIVO')return;const g=this;g.particles.burst(e.x,e.y-14,'#ff8a3a',34,{speed:260,kind:'ember'});g.particles.ring(e.x,e.y,'#ff8a3a',120,.4,6);g.shake(6,.3);g.sound.play('hit',e.x,e.y);
 for(const tg of g.enemyTargets()){if(Math.hypot(tg.x-e.x,tg.y-e.y)<110){if(tg===g.player)g.damagePlayer(18);else tg.hurt(24,g)}}}
// Usar o terreno contra os monstros: empurrar para lava/teia causa dano e lentidão.
terrainPunish(e){const z=this.world.terrainAt?this.world.terrainAt(e.x,e.y):null;if(!z)return;
 if(z.kind==='burn'){e.hp-=8+e.level;e.flash=.1;this.floats.push({x:e.x,y:e.y-44,text:'TERRENO!',life:.8,color:'#ff9a4a',size:12});if(e.hp<=0)this.kill(e)}
 else if(z.kind==='slow'&&z.web){e.slowed=2.5}
 else if(z.kind==='poison'){e.hp-=5;e.flash=.08;if(e.hp<=0)this.kill(e)}}
// Pilares quebráveis (Cidadela de Kargalgan): abertos com golpes corpo a corpo e Autoridade.
buildBreakables(){this.breakables=[];if(!this.world.solids)return;for(const s of this.world.solids)if(s.k==='pillar')this.breakables.push({x:s.x,y:s.y,w:s.w,h:s.h,hp:40,maxhp:40,solid:s})}
damageBreakable(b,dmg,angle){b.hp-=dmg;this.particles.burst(b.x+b.w/2,b.y+b.h/2,'#c9b08a',8,{speed:180,angle:angle??0,spread:1.4});
 if(b.hp<=0){const i=this.world.solids.indexOf(b.solid);if(i>=0)this.world.solids.splice(i,1);for(const p of this.world.props||[])if(p.solid&&p.x>=b.x-2&&p.x<=b.x+b.w+2&&p.y>=b.y-2&&p.y<=b.y+b.h+2)p.dead=true;
  if(this.world.wallLayer!==undefined){try{this.world.wallLayer=DungeonArt.bake(this.world)}catch(e){}}
  this.particles.burst(b.x+b.w/2,b.y+b.h/2,'#e8c89a',30,{speed:260});this.shake(5,.25);this.message('PILAR DESTRUÍDO · PASSAGEM ABERTA');this.sound.play('hit',b.x,b.y);return true}return false}
hitBreakables(x,y,angle,range,arc){for(const b of this.breakables||[]){const cx=b.x+b.w/2,cy=b.y+b.h/2,d=Math.hypot(cx-x,cy-y);if(d<range+20){const a=Math.atan2(cy-y,cx-x),diff=Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)));if(Math.abs(diff)<arc)this.damageBreakable(b,10,angle)}}}
// Fases do chefe: 50% e 20% de HP mudam o padrão, invocam ajudantes e reagem ao cenário.
bossPhase(e,ph){this.message(`⚠ ${e.name} · FASE ${ph}`);this.shake(8,.5);this.sound.play('alert');e.dmgMult*=1.12;
 const n=ph===3?3:2;for(let i=0;i<n;i++){const def=MONSTER_TYPES[GATE_MONSTERS(RANKS.indexOf(this.world.rank||'E'))[0]]||MONSTER_TYPES.goblin;
  const sp=this.findFreeSpot(e.x,e.y,def.radius,e.radius+20,200,{avoid:this.enemies,sep:def.radius*2+6,los:true,angle:rand(0,Math.PI*2)});if(!sp)continue;
  const m=new Enemy(sp.x,sp.y,GATE_MONSTERS(RANKS.indexOf(this.world.rank||'E'))[0],Math.max(1,e.level-2),false,{red:e.red});m.alerted=true;m.home={x:e.home.x,y:e.home.y};this.enemies.push(m);this.particles.burst(m.x,m.y,'#a855f7',18)}
 this.sceneryReact(this.world.theme?this.world.theme.id:'',ph);
 // QTE decisivo: acerte a tecla na zona para enfraquecer o chefe; falhar o deixa mais agressivo.
 if(!this.qte&&!this.cutscene&&ph>=2)this.startQTE({key:' ',dur:1.7,zone:[.34,.66],label:'APERTE ESPAÇO · ENFRAQUECER',onDone:ok=>{if(ok){e.stun=Math.max(e.stun||0,2.2);e.hp-=e.maxhp*.06;this.hitStop=Math.max(this.hitStop,.05);this.message('QTE VENCIDO · CHEFE ENFRAQUECIDO');this.sound.play('sys')}else{this.message('QTE FALHOU · O CHEFE CONTRA-ATACA');e.dmgMult*=1.12;this.sound.play('alert')}}})}
sceneryReact(themeId,ph){this.scenery=this.scenery||{};
 if(themeId==='cartenon'){this.scenery.statuesAwake=true;for(const p of this.world.props||[])if(p.k==='statue')p.awake=true;this.message('AS ESTÁTUAS DE CARTENON SE MEXEM')}
 if(themeId==='volcanic'){this.scenery.lavaRise=ph;this.message('A LAVA SOBE NA FORTALEZA VULCÂNICA');
  for(let i=0;i<ph;i++){const r=this.world.rooms[Math.floor(rand(0,9))];if(!r)continue;const z={kind:'burn',name:'LAVA',color:'#e2481c',x:r.cx+rand(-120,120),y:r.cy+rand(-70,70),rx:40+ph*10,ry:26+ph*6,lava:true,seed:rand(0,9)};this.world.zones.push(z)}}
 if(themeId==='kargalgan'){this.scenery.runes=ph;this.message('OS CÍRCULOS MÁGICOS PULSAM COM FÚRIA')}
 if(themeId==='glacial'){this.weather=Math.max(this.weather,ph*.4);this.message('A NEVASCA PIORA')}}
// O cenário da dungeon reage ao clima do gate vermelho (a lava sobe com o tempo).
drawDungeonWeather(c){const w=this.world,t=this.time,ox=this.camera.x,oy=this.camera.y,W=canvas.width,H=canvas.height;
 const id=w.theme?w.theme.id:null;if(id!=='volcanic'&&id!=='glacial'&&id!=='ash')return;
 if(id==='volcanic'){const k=this.weather||0;c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,oy+H,0,oy+H-k*120);g.addColorStop(0,'rgba(255,90,20,.28)');g.addColorStop(1,'rgba(255,90,20,0)');c.fillStyle=g;c.fillRect(ox,oy,W,H);
  for(let i=0;i<Math.ceil(k*8);i++){const x=ox+((i*397+t*40)%(W+200))-100,y=oy+((i*211+t*60)%(H+120))-60;c.fillStyle=i%2?'#ffb04a':'#ff5a1a';c.globalAlpha=.5;c.fillRect(x,y,2,2)}c.restore()}
 if(id==='glacial'){const k=this.weather||0;c.save();c.fillStyle='#e8fbff';for(let i=0;i<Math.ceil(30+k*60);i++){const x=ox+((i*173+t*(30+i*3))%(W+120))-60,y=oy+((i*97+t*(50+i*5))%(H+80))-40;c.globalAlpha=.4+.3*Math.sin(t*3+i);c.fillRect(x,y,2,2)}c.restore()}}
// Quebra de dungeon: um gate que expira sem dono solta monstros na cidade e os NPCs fogem.
dungeonBreak(gate){if(gate.broken)return;gate.broken=true;this.message('⚠ QUEBRA DE DUNGEON · MONSTROS NA CIDADE');this.sound.play('alert');
 const n=4+RANKS.indexOf(gate.rank)*2;this.spawnCityMonsters(gate.x,gate.y,n,3+RANKS.indexOf(gate.rank)*6);
 for(const a of this.world.npcs?this.world.npcs.list:[]){if(Math.hypot(a.x-gate.x,a.y-gate.y)<700){a.state='flee';a.timer=rand(5,9);a.threatPos={x:gate.x,y:gate.y};a.shout('!')}}}
spawnCityMonsters(x,y,n,level){const types=['goblin','wolf','spider','orc','demon'];for(let i=0;i<n;i++){const type=types[Math.min(types.length-1,Math.floor(rand(0,types.length)))];const def=MONSTER_TYPES[type];
 const sp=this.findFreeSpot(x,y,def.radius,30,260,{avoid:this.enemies,sep:def.radius*2+8,ignoreCars:true})||{x:x+rand(-80,80),y:y+rand(-80,80)};
 const e=new Enemy(sp.x,sp.y,type,level,false,{red:Math.random()<.2});e.alerted=true;this.enemies.push(e);this.makeElite(e)}this.updateHUD()}
// ---- Expansão: missões diárias, contratos, rank de caçador -----------------------------------
checkDaily(){const d=this.daily;if(!d||d.done)return;d.kills=Math.min(100,d.kills);d.dashes=Math.min(100,d.dashes);d.distance=Math.min(10000,Math.floor(d.distance));
 if(d.kills>=100&&d.dashes>=100&&d.distance>=10000){d.done=true;this.player.points+=3;this.player.gold+=150;this.message('MISSÃO DIÁRIA COMPLETA · +3 PONTOS · +150 G');this.sound.play('sys')}}
dailyTick(dateChanged){if(dateChanged){const d=this.daily;if(d&&!d.done&&!d.penalty){d.penalty=true;this.message('VOCÊ NÃO CUMPRIU A MISSÃO · ZONA DE PENALIDADE DISPONÍVEL');this.spawnPenaltyGate()}this.daily={date:new Date().toLocaleDateString('en-CA'),kills:0,dashes:0,distance:0,done:false,penalty:false};this.rollContracts()}}
spawnPenaltyGate(){if(!this.gates)return;const p=this.player;const g=this.gates.spawn(this,{x:clamp(p.x+260,100,this.world.w-100),y:clamp(p.y-160,100,this.world.h-100),instant:true,rank:'C',theme:'desert',silent:false});if(g){g.penalty=true;g.red=true;this.message('PORTAL DA ZONA DE PENALIDADE ABERTO')}}
rollContracts(){const top=clamp(this.unlocked||0,0,5);this.contracts=CONTRACT_TIERS.slice(0,Math.max(2,top+1)).slice(-3).map(t=>({rank:t.rank,need:t.need,reward:t.reward,kills:0,done:false,taken:false}));this.activeContract=-1}
acceptContract(i){const c=this.contracts[i];if(!c||c.done)return;if(this.activeContract>=0){this.message('JÁ EXISTE UM CONTRATO ATIVO');return}c.taken=true;this.activeContract=i;this.message(`CONTRATO RANK ${c.rank} ACEITO · ${c.need} ABATES`)}
contractKill(rank){const i=this.activeContract;if(i<0)return;const c=this.contracts[i];if(!c)return;c.kills++;if(c.kills>=c.need){c.done=true;this.activeContract=-1;this.player.gold+=c.reward;this.player.points+=2;this.addHunterPoints(20);this.message(`CONTRATO RANK ${c.rank} CONCLUÍDO · +${c.reward} G`);this.sound.play('sys')}}
addHunterPoints(n){this.hunter.points+=n;const idx=HUNTER_THRESH.filter(t=>this.hunter.points>=t).length-1;const newRank=RANKS[clamp(idx,0,5)];
 if(newRank!==this.hunter.rank){this.hunter.rank=newRank;this.hunter.evalReady=true;this.message(`REAVALIAÇÃO DE RANK DISPONÍVEL · RANK ${newRank}`);this.sound.play('sys');this.spawnEvalGate()}}
spawnEvalGate(){const p=this.player;const g=this.gates.spawn(this,{x:clamp(p.x-260,100,this.world.w-100),y:clamp(p.y+160,100,this.world.h-100),instant:true,rank:this.hunter.rank,red:false,silent:false});if(g)g.eval=true}
// ---- Expansão: itens, talentos, melhorias de sombra ------------------------------------------
gainItem(id){if(!ITEMS[id])return;if(!this.player.items.includes(id))this.player.items.push(id);this.message(`ITEM OBTIDO · ${ITEMS[id].name}`);this.sound.play('sys')}
equipItem(id){const it=ITEMS[id];if(!it||!this.player.items.includes(id))return;this.player.equipped[it.slot]=this.player.equipped[it.slot]===id?null:id;this.message(`${it.name} ${this.player.equipped[it.slot]?'EQUIPADO':'DESEQUIPADO'}`)}
spendTalent(id){const p=this.player;let node=null;for(const k in TALENTS){const f=TALENTS[k].nodes.find(n=>n.id===id);if(f){node=f;break}}if(!node)return;if((p.talents[id]||0)>=node.max){this.message('TALENTO NO MÁXIMO');return}if(p.talentPoints<=0){this.message('SEM PONTOS DE TALENTO');return}p.talents[id]=(p.talents[id]||0)+1;p.talentPoints--;const r=p.hp/p.maxhp;p.hp=Math.round(p.maxhp*r);this.message(`TALENTO · ${node.name} ${p.talents[id]}/${node.max}`);this.sound.play('sys')}
shadowCap(){return armyCap(this.player)+talentLevel('int_cap')}
shadowPowerMult(){let m=this.player.shadowPowerMult*(1+talentLevel('int_power')*.06);if(this.isNight())m*=1.1;return m}
// Troca de lugar com uma sombra (Shadow Exchange): teleporte com recarga longa.
shadowExchange(){const p=this.player;if(this.exchangeCd>0){this.message(`TROCA EM RECARGA · ${Math.ceil(this.exchangeCd)}s`);return}if(!this.soldiers||!this.soldiers.length){this.message('NENHUMA SOMBRA EM CAMPO');return}
 let best=null,bd=1e9;for(const s of this.soldiers){if(s.state==='REGENERATE')continue;const d=dist(s,p);if(d<bd){bd=d;best=s}}if(!best){this.message('NENHUMA SOMBRA DISPONÍVEL');return}
 const sp=this.findFreeSpot(p.x,p.y,Math.min(24,best.radius),0,120,{avoid:[p,...this.soldiers.filter(s=>s!==best)],sep:20});
 const ox=p.x,oy=p.y;p.x=best.x;p.y=best.y;best.x=sp?sp.x:ox;best.y=sp?sp.y:oy;p.invuln=Math.max(p.invuln,.5);this.exchangeCd=20;this.animation.play('summon',p,.4);this.animation.effect('summon',p);this.particles.burst(ox,oy,'#a855f7',20);this.particles.burst(p.x,p.y,'#a855f7',20);this.message('SHADOW EXCHANGE');this.sound.play('shadow')}
cycleArmyOrder(){const orders=['ATTACK','DEFEND','HOLD'];this.armyOrder=orders[(orders.indexOf(this.armyOrder)+1)%orders.length];this.message(`ORDEM DAS SOMBRAS · ${this.armyOrder==='ATTACK'?'ATACAR O ALVO':this.armyOrder==='DEFEND'?'DEFENDER O JOGADOR':'MANTER POSIÇÃO'}`);this.sound.play('sys')}
dismissShadow(i){const s=this.army[i];if(!s)return;this.army.splice(i,1);this.soldiers=[];this.summoned=false;this.message('SOMBRA DISPENSADA');SaveSystem.save(this)}
// ---- Expansão: cutscenes, QTE, tutorial, histórico -------------------------------------------
startCutscene(lines,opts){this.cutscene=new Cutscene(lines,opts);return this.cutscene}
advanceCutscene(){if(this.cutscene)this.cutscene.advance()}
advanceCutscene(){if(this.cutscene)this.cutscene.advance()}
startQTE(opts){this.qte=new QTE(opts);return this.qte}
updateTutorial(dt){if(this.tutorialDone)return;const st=TUTORIAL_STEPS[this.tutorial.step];if(!st){this.tutorialDone=1;SaveSystem.save(this);return}
 if(st.id==='done'){this.tutT+=dt;if(this.tutT>1.6){this.tutorialDone=1;SaveSystem.save(this);this.message('TUTORIAL CONCLUÍDO');this.sound.play('sys')}return}
 if(st.check(this)){this.tutorial.step++;this.tutT=0;this.sound.play('sys');if(this.tutorial.step>=TUTORIAL_STEPS.length){this.tutorialDone=1;SaveSystem.save(this)}}}
// ---- Expansão: eventos aleatórios de sala e sala secreta --------------------------------------
roomEventCheck(){const w=this.world;if(w.kind!=='dungeon'||this.roomEvent)return;const r=this.roomAt(this.player.x,this.player.y);if(r<0||r===this.eventRoom)return;this.eventRoom=r;if(r===3||Math.random()>.2)return;
 const roll=Math.random();if(roll<.4){this.roomEvent={type:'trap',room:r,armed:true};this.message('BAÚ ARMADILHADO DETECTADO')}else if(roll<.7){this.roomEvent={type:'hunter',room:r,done:false};this.message('UM CAÇADOR FERIDO PEDIU AJUDA')}else{this.roomEvent={type:'challenge',room:r,t:45,need:5,kills:0};this.message('SALA DE DESAFIO · ABATA 5 EM 45s')}}
roomEventTick(dt){const ev=this.roomEvent;if(!ev)return;if(ev.type==='challenge'){ev.t-=dt;if(ev.t<=0){this.message('DESAFIO FALHOU · O TEMPO ACABOU');this.roomEvent=null;return}if(ev.kills>=ev.need){this.player.gold+=120;this.player.points+=1;this.message('DESAFIO VENCIDO · +120 G');this.sound.play('sys');this.roomEvent=null}}}
resolveRoomEvent(){const ev=this.roomEvent;if(!ev)return false;if(ev.type==='challenge'){if(ev.kills>=ev.need){this.player.gold+=120;this.player.points+=1;this.message('DESAFIO VENCIDO · +120 G');this.sound.play('sys');this.roomEvent=null;return true}}return false}
checkSecretRoom(){const w=this.world;if(w.kind!=='dungeon'||!w.secret||w.secret.revealed)return;const s=w.secret;
 if(this.player.stats.PER>=18){this.revealSecret();return}
 // parede rachada: aproximação revela
 if(this._secretCheck===0){const dx=this.player.x-s.crack.x,dy=this.player.y-s.crack.y;if(Math.hypot(dx,dy)<70)this.revealSecret()}}
revealSecret(){const w=this.world;if(!w.secret||w.secret.revealed)return;w.secret.revealed=true;this.secretRevealed=true;
 if(!w.rooms.includes(w.secret.room))w.rooms.push(w.secret.room);
 w.walkable.push(w.secret.room,w.secret.corridor);w.corridors.push(w.secret.corridor);w.rooms.forEach(r=>{if(r.id===w.secret.adj)r.links.push(99)});
 const sr=w.secret.room;w.props=w.props||[];w.props.push({k:'crystal',x:sr.cx-46,y:sr.cy-6,s:1.25,v:.4},{k:'crystal',x:sr.cx+52,y:sr.cy+18,s:.9,v:.7},{k:'rubble',x:sr.cx+8,y:sr.cy-34,s:1,v:.2});
 w.lights=w.lights||[];w.lights.push({x:sr.cx,y:sr.cy-20,r:190,c:(w.theme&&w.theme.pal.acc)||'#ffd27a',f:1,seed:3});
 this.world.wallLayer=DungeonArt.bake(w);this.message('SALA SECRETA REVELADA');this.sound.play('sys');this.particles.ring(this.player.x,this.player.y,'#ffd27a',160,.6,5);
 this.player.gold+=150}
// ---- Expansão: aliado de história --------------------------------------------------------------
spawnAlly(look,name){const p=this.player;const sp=this.findFreeSpot(p.x,p.y,14,20,120,{avoid:[p],sep:24})||{x:p.x+30,y:p.y};this.ally=new Ally(sp.x,sp.y,look||PEOPLE.hunters[2],name);this.message(`${this.ally.name} ENTROU NA DUNGEON`)}
removeAlly(){this.ally=null}
// ---- Expansão: nova cidade (Jeju / Busan) -----------------------------------------------------
travelToCity(idx){this.cityIndex=idx;this.newCityUnlocked=true;if(idx===0){this.world=new WorldMap();this.placePlayerAt(HUB.spawn);this.message('SEOUL · ASSOCIAÇÃO DOS CAÇADORES')}
 else{this.world=makeSecondCity();this.placePlayerAt(THIS_CITY2.spawn);this.message('BUSAN · DISTRITO COSTEIRO')}
 this.gates=new GateSystem();this.gates.update(0,this);this.rollContracts();this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.projectiles=[];this.hazards=[];this._camSnap=true;this.resize();SaveSystem.save(this)}
district(p){for(const z of CITY.zones)if(p.x>z.x&&p.x<z.x+z.w&&p.y>z.y&&p.y<z.y+z.h)return z.name;for(const a of CITY.spawnAreas)if(a.w<3000&&a.h<2000&&p.x>a.x&&p.x<a.x+a.w&&p.y>a.y&&p.y<a.y+a.h)return a.name;return p.y>RIVER.y?(p.x>4400?'YONGSAN LESTE':'YONGSAN'):p.y<700?'DISTRITO DAS GUILDAS':p.x>4400?'JONGNO':p.x>3040?'DISTRITO COMERCIAL':p.x<1000?'GANGNAM OESTE':'CENTRO DE SEUL'}
updateHUD(){let p=this.player;const cap=this.shadowCap();const rankIdx=RANKS.indexOf(p.rank),hunter=this.hunter||{rank:'E',points:0};const hNext=rankIdx<5?HUNTER_THRESH[rankIdx+1]:null;const hTxt=`RANK ${p.rank}${hNext?` · ${hunter.points}/${hNext}`:` · MÁX`} · ${CLASSES[p.playerClass].name}`;const rk=$('#rank');if(rk){rk.textContent=hTxt;rk.style.color=CLASSES[p.playerClass].color}
 $('#level').textContent='LV. '+String(p.level).padStart(2,'0');$('#hpbar').style.width=clamp(p.hp/p.maxhp*100,0,100)+'%';$('#mpbar').style.width=clamp(p.mp/p.maxmp*100,0,100)+'%';$('#hptext').textContent=`${Math.ceil(p.hp)}/${p.maxhp}`;$('#mptext').textContent=`${Math.ceil(p.mp)}/${p.maxmp}`;$('#hppots').textContent='HP ×'+p.hppots;$('#mppots').textContent='MP ×'+p.mppots;$('#questcount').textContent=Math.min(15,this.quest)+' / 15';const ac=$('#armycount'),drain=this.armyDrain(),cost=armySummonCost(p,this.army);if(ac){ac.textContent=this.summoned?`−${fmtRate(drain)} MP/s`:`SOMBRAS ${this.army.length}/${cap}`;ac.title=this.summoned?'Mana gasta por segundo pelas sombras ativas':`Sombras no exército / capacidade máxima · invocar custa ${cost} MP`}
 const dg=$('#dailyGoals');if(dg){const d=this.daily||{kills:0,dashes:0,distance:0};const km=Math.min(10,Math.floor((d.distance||0)/1000));dg.innerHTML=`<span title="Flexões = abates">💪 ${Math.min(d.kills||0,100)}/100</span><span title="Abdominais = esquivas">🌀 ${Math.min(d.dashes||0,100)}/100</span><span title="Corrida">🏃 ${km}/10 km</span><span class="${d.done?'ok':''}">${d.done?'✔ CUMPRIDA':d.penalty?'⚠ PENALDADE':''}</span>`}
 const am=$('#armyMana');if(am){am.classList.toggle('hidden',!this.summoned);if(this.summoned){const up=this.soldiers.filter(s=>s.state!=='REGENERATE').length,net=MP_REGEN-drain;am.innerHTML=`<span>♟ ${up}/${this.soldiers.length}<em> ATIVAS</em></span><span>${fmtTime(this.armyT||0)}</span><b>−${fmtRate(drain)} MP/s</b>`;am.title=`Saldo de mana: ${net>=0?'+':'−'}${fmtRate(Math.abs(net))} MP/s (regeneração +${fmtRate(MP_REGEN)}/s)`}}
 const mm=$('#mpbar');if(mm&&mm.parentNode&&mm.parentNode.parentNode&&mm.parentNode.parentNode.classList)mm.parentNode.parentNode.classList.toggle('drain',this.summoned&&drain>MP_REGEN);const qf=$('#questfill');if(qf)qf.style.width=Math.min(100,this.quest/15*100)+'%';
 const isCity=this.world.kind==='hub'||this.world.kind==='city2';
 let hub=this.world.kind==='hub',zone=hub?this.district(p):'';const th=this.world.theme;const loc=$('#location');if(loc)loc.textContent=isCity?(this.world.kind==='city2'?'BUSAN · LITORAL':zone):(th?`${th.short} · RANK ${this.world.rank}`:`DUNGEON · RANK ${this.world.rank}`);const ls=$('#locationSub');if(ls)ls.textContent=isCity?(this.world.kind==='city2'?'CIDADE · BUSAN':zone==='HUNTERS ASSOCIATION'?'SAFE ZONE · SEOUL':'CIDADE · SEOUL'):(this.redGate?'GATE VERMELHO · SEM SAÍDA':'SUBJUGUE O CHEFE');const zl=$('#zoneLabel');if(zl)zl.textContent=isCity?(this.world.kind==='city2'?'BUSAN':zone):(th?th.name:'DUNGEON RANK '+this.world.rank);
 let boss=this.enemies.find(e=>e.boss);$('#bossbar').classList.toggle('hidden',!boss||dist(p,boss)>520||!(this.fogVisible(boss)||boss.alerted));if(boss){$('#bossname').textContent=boss.name;$('#bossfill').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';$('#bossskill').textContent=boss.state==='windup'?'⚠ '+boss.current.name:''}
 let hint='';if(this.world.kind==='hub'){const gate=this.gates.nearest(p);if(gate)hint=`[ E ] ENTRAR NO GATE ${gate.red?'VERMELHO':'AZUL'} · RANK ${gate.rank}`;else if(dist(p,HUB.merchant)<100)hint='[ E ] FALAR COM MERCADOR';else if(dist(p,HUB.healer)<100)hint='[ E ] CURAR HP E MP';else if(dist(p,HUB.contractBoard)<90)hint='[ E ] QUADRO DE CONTRATOS';else if(dist(p,HUB.jinho)<90)hint='[ E ] FALAR COM YOO JIN-HO';else if(dist(p,HUB.portal2)<90)hint='[ E ] VIAJAR PARA BUSAN'}
 else if(this.world.kind==='city2'){const gate=this.gates.nearest(p);if(gate)hint=`[ E ] ENTRAR NO GATE ${gate.red?'VERMELHO':'AZUL'} · RANK ${gate.rank}`;else if(this.world.portal&&dist(p,this.world.portal)<90)hint='[ E ] VOLTAR PARA SEOUL'}
 else if(this.corpses.some(c=>dist(c,p)<75))hint='[ E ] ERGA-SE';else if(this.bossDefeated&&!this.chest&&dist(p,{x:1500,y:600})<90)hint='[ E ] ABRIR BAÚ';else if(this.chest&&dist(p,{x:1560,y:650})<110)hint='[ E ] RETORNAR À CIDADE';else if(this.roomEvent&&this.roomEvent.type==='challenge')hint=`DESAFIO · ${this.roomEvent.kills}/${this.roomEvent.need} · ${Math.ceil(this.roomEvent.t)}s`;
 $('#interact').classList.toggle('hidden',!hint);$('#interact').textContent=Mobile.on?hint.replace('[ E ] ','▶ '):hint;Mobile.sync(this,this.world.kind==='hub'?zone:(this.world.kind==='city2'?'BUSAN · LITORAL':`DUNGEON · RANK ${this.world.rank}`));
 if(this.hudClock<=0){this.hudClock=.25;const list=(hub||this.world.kind==='city2')?[...this.gates.list].sort((a,b)=>dist(a,p)-dist(b,p)):[];const gc=$('#gatecount');if(gc)gc.textContent=(hub||this.world.kind==='city2')?String(list.length):'—';
  const gl=$('#gateList');if(gl)gl.innerHTML=!(hub||this.world.kind==='city2')?'<p class="gate-empty">Rastreamento indisponível dentro da dungeon.</p>':list.length?list.map(g=>{const a=Math.atan2(g.y-p.y,g.x-p.x),arrow='→↘↓↙←↖↑↗'[((Math.round(a/(Math.PI/4))%8)+8)%8];return `<div class="gate-row ${g.red?'red':'blue'} ${g.life<GATE_RULES.warnAt?'unstable':''}"><i></i><b>RANK ${g.rank}</b><span>${g.forming>0?'FORMANDO…':fmtTime(g.life)}</span><small>${g.district} · ${Math.round(dist(g,p)/10)}m ${arrow}</small></div>`}).join(''):'<p class="gate-empty">Nenhum gate ativo. Aguarde o próximo alerta…</p>'}}
// ---- Rendering ----------------------------------------------------------------------------
drawEnemy(e){const c=ctx,moving=e.animMoving,pose=e.state==='windup'?'windup':(e.state==='lunge'||(e.state==='recover'&&e.current&&e.stateT>e.current.recover-.2))?'strike':moving?'move'+(Math.floor(e.animT*(e.speed/12))%4):'idle'+(Math.floor(e.animT*2)%2),f=this.sprites.monster(e.art,pose);
 c.save();c.translate(Math.round(e.x),Math.round(e.y));c.fillStyle='#0009';c.beginPath();c.ellipse(0,4,e.radius*1.1,e.radius*.4,0,0,7);c.fill();
 if(e.boss||e.red){c.save();c.globalCompositeOperation='lighter';c.strokeStyle=e.boss?(e.red?'#ff3b4f':'#ff6a3a'):'#ff3b4f';c.globalAlpha=.35+.2*Math.sin(this.time*4);c.lineWidth=2;c.beginPath();c.ellipse(0,4,e.radius*1.4+Math.sin(this.time*4)*3,e.radius*.55,0,0,7);c.stroke();c.restore();if(e.boss&&Math.random()<.3)this.particles.burst(e.x+rand(-e.radius,e.radius),e.y,e.red?'#ff3b4f':'#ff8a5a',1,{speed:30,lift:50,kind:'sq'})}
 if(e.state==='windup'){const k=1-e.stateT/e.current.windup;c.scale(1+.06*k,1-.06*k)}
 if(e.facing<0)c.scale(-1,1);c.drawImage(f.img,-f.ax,-f.ay);
 if(e.flash>0){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,e.flash*7);c.drawImage(f.img,-f.ax,-f.ay);c.drawImage(f.img,-f.ax,-f.ay)}
 c.restore();
 const top=e.y-f.ay-8,w=Math.max(44,e.radius*2.4);c.fillStyle='#061019';c.fillRect(e.x-w/2-1,top-1,w+2,6);c.fillStyle='#4a1f28';c.fillRect(e.x-w/2,top,w,4);c.fillStyle=e.boss?'#fa6d7a':e.red?'#ff3b4f':'#dd596a';c.fillRect(e.x-w/2,top,w*Math.max(0,e.hp/e.maxhp),4);c.fillStyle='#ffb8b1';c.fillRect(e.x-w/2,top,w*Math.max(0,e.hp/e.maxhp),1);
 if(e.stun>0){for(let i=0;i<3;i++){const a=this.time*5+i*2.1;c.fillStyle='#ffe16c';c.fillRect(e.x+Math.cos(a)*14-2,top-10+Math.sin(a)*4,4,4)}}}
// Shadow soldiers: the original monster sprite in the shadow palette, a violet aura and a mini-HUD
// (level + live HP bar) floating above each one. Regenerating shadows show a recharge ring.
drawShadow(a){const c=ctx;
 if(a.state==='REGENERATE'){c.save();c.globalAlpha=.6;c.fillStyle='#160b27';c.beginPath();c.ellipse(a.x,a.y+6,18,7,0,0,7);c.fill();c.strokeStyle='#8a4ad8';c.lineWidth=2;c.beginPath();c.arc(a.x,a.y-12,9,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-Math.max(0,a.regen)/ARMY_RULES.regen));c.stroke();c.restore();this.drawShadowHUD(a,a.y-34);return}
 const ph=a.act&&a.act.phase,pose=ph==='windup'?'windup':(a.swing>0||ph==='lunge')?'strike':a.animMoving?'move'+(Math.floor(a.animT*(a.speed/12))%4):'idle'+(Math.floor(a.animT*2)%2),f=this.sprites.shadowMonster(a.art,pose);
 c.save();c.translate(Math.round(a.x),Math.round(a.y));c.fillStyle='#14072acc';c.beginPath();c.ellipse(0,4,a.radius*1.15,a.radius*.42,0,0,7);c.fill();
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25+.12*Math.sin(this.time*5+a.slot);c.strokeStyle='#7b2cff';c.lineWidth=2;c.beginPath();c.ellipse(0,4,a.radius*1.3+Math.sin(this.time*5+a.slot)*2,a.radius*.5,0,0,7);c.stroke();c.restore();
 if(ph==='windup'){const k=1-a.act.t/Math.max(.01,a.act.a.windup*.6);c.scale(1+.06*k,1-.06*k)}
 if(a.facing<0)c.scale(-1,1);c.shadowColor='#a33cff';c.shadowBlur=14;c.drawImage(f.img,-f.ax,-f.ay);c.shadowBlur=0;
 if(a.hurtT>0){c.globalCompositeOperation='lighter';c.globalAlpha=.55;c.drawImage(f.img,-f.ax,-f.ay)}c.restore();
 if(Math.random()<.15)this.particles.burst(a.x+rand(-.6,.6)*a.radius,a.y-rand(0,f.ay*.8),Math.random()<.5?'#3b1466':'#7b2cff',1,{speed:20,lift:40,kind:'sq'});
 this.drawShadowHUD(a,a.y-f.ay+(f.top||0)-8)}
drawShadowHUD(a,top){const c=ctx,w=Math.round(Math.max(40,Math.min(72,a.radius*2.2))),x=Math.round(a.x-w/2),y=Math.round(top),k=clamp(a.hp/a.maxhp,0,1);
 if(a.unique){c.fillStyle='#ffd27a';c.font='bold 9px monospace';c.textAlign='center';c.fillText(a.name.toUpperCase(),a.x,y-10);c.textAlign='left'}
 c.save();c.globalAlpha=1;c.fillStyle='#05020bcc';c.fillRect(x-1,y-1,w+2,6);c.fillStyle='#2a1440';c.fillRect(x,y,w,4);c.fillStyle=a.state==='REGENERATE'?'#4a3a66':k<.3?'#ff5ad0':'#9b5bff';c.fillRect(x,y,w*k,4);c.fillStyle='#8ff0ff';c.fillRect(x,y,w*k,1);
 const label=`LV ${a.level}${a.boss?' ★':''}`;c.font='bold 10px monospace';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#05020b';c.strokeText(label,a.x,y-3);c.fillStyle=a.boss?'#ffd27a':'#d7b8ff';c.fillText(label,a.x,y-3);c.textAlign='left';c.restore()}
drawTelegraph(e){const a=e.current,k=1-e.stateT/a.windup,c=ctx;c.save();c.globalAlpha=.18+.3*k;c.fillStyle=a.kind==='super'?(a.color||'#ff3b4f'):'#ff3b4f';c.strokeStyle='#ff6a7a';c.lineWidth=2;
 if(a.kind==='melee'){c.beginPath();c.moveTo(e.x,e.y);c.arc(e.x,e.y,a.range,e.aim-a.arc,e.aim+a.arc);c.closePath();c.fill();c.globalAlpha=.6;c.beginPath();c.arc(e.x,e.y,a.range*k,e.aim-a.arc,e.aim+a.arc);c.stroke()}
 else if(a.kind==='slam'){c.beginPath();c.ellipse(e.x,e.y,a.radius,a.radius*.6,0,0,7);c.fill();c.globalAlpha=.7;c.beginPath();c.ellipse(e.x,e.y,a.radius*k,a.radius*.6*k,0,0,7);c.stroke()}
 else if(a.kind==='lunge'){c.translate(e.x,e.y);c.rotate(e.aim);c.fillRect(0,-e.radius,a.dash*a.dashTime,e.radius*2);c.globalAlpha=.7;c.strokeRect(0,-e.radius,a.dash*a.dashTime*k,e.radius*2)}
 else if(a.kind==='projectile'){const n=a.count||1;c.globalAlpha=.25+.4*k;c.strokeStyle=a.color;c.setLineDash&&c.setLineDash([8,8]);for(let i=0;i<n;i++){const ang=e.aim+(n>1?(i/(n-1)-.5)*a.spread*2:0);c.beginPath();c.moveTo(e.x,e.y-16);c.lineTo(e.x+Math.cos(ang)*a.range,e.y-16+Math.sin(ang)*a.range);c.stroke()}c.setLineDash&&c.setLineDash([])}
 else if(a.kind==='super'){c.globalCompositeOperation='lighter';if(a.pattern!=='rain'){c.beginPath();c.ellipse(e.x,e.y,a.radius,a.radius*.6,0,0,7);c.globalAlpha=.12+.18*k;c.fill();c.globalAlpha=.8;c.strokeStyle=a.color;c.lineWidth=3;c.stroke()}if(a.pattern!=='nova'&&e.aimPos){c.globalAlpha=.3+.3*k;c.strokeStyle=a.color;c.beginPath();c.ellipse(e.aimPos.x,e.aimPos.y,200,160,0,0,7);c.stroke()}
  c.globalAlpha=k;c.strokeStyle=a.color;c.lineWidth=4;c.beginPath();c.arc(e.x,e.y-40,30+k*40,0,Math.PI*2*k);c.stroke()}
 c.restore()}
drawHazards(){const c=ctx;for(const h of this.hazards){c.save();
 if(h.kind==='claw'){const k=1-h.t/h.max;c.globalCompositeOperation='lighter';c.globalAlpha=1-k;c.strokeStyle=h.color;c.lineCap='round';for(let i=-1;i<=1;i++){c.lineWidth=4-Math.abs(i);c.beginPath();c.arc(h.x,h.y,h.r*.8+i*8,h.angle-h.arc*.8+k*.3,h.angle+h.arc*.8*(k*2-1));c.stroke()}}
 else if(h.kind==='nova'&&h.delay<=0){c.globalCompositeOperation='lighter';c.strokeStyle=h.color;c.globalAlpha=1-h.r/h.max*.6;c.lineWidth=14;c.beginPath();c.ellipse(h.x,h.y,h.r,h.r*.6,0,0,7);c.stroke();c.lineWidth=3;c.strokeStyle='#ffffff';c.beginPath();c.ellipse(h.x,h.y,h.r,h.r*.6,0,0,7);c.stroke()}
 else if(h.kind==='blast'){if(h.delay>0){const k=1-h.delay/h.max;c.globalAlpha=.25;c.fillStyle=h.color;c.beginPath();c.ellipse(h.x,h.y,h.r,h.r*.7,0,0,7);c.fill();c.globalAlpha=.55;c.beginPath();c.ellipse(h.x,h.y,h.r*k,h.r*.7*k,0,0,7);c.fill();c.globalAlpha=.9;c.strokeStyle=h.color;c.lineWidth=2;c.beginPath();c.ellipse(h.x,h.y,h.r,h.r*.7,0,0,7);c.stroke()}
  else{c.globalCompositeOperation='lighter';c.globalAlpha=1-h.boom/.25;c.fillStyle=h.color;c.beginPath();c.ellipse(h.x,h.y,h.r*1.1,h.r*.8,0,0,7);c.fill();c.fillStyle='#ffffff';c.fillRect(h.x-6,h.y-160,12,160)}}
 c.restore()}
 for(const pr of this.projectiles){c.save();c.globalCompositeOperation='lighter';c.fillStyle=pr.color;c.globalAlpha=.35;c.beginPath();c.arc(pr.x,pr.y,pr.size*2,0,7);c.fill();c.globalAlpha=1;c.beginPath();c.arc(pr.x,pr.y,pr.size,0,7);c.fill();c.fillStyle='#ffffff';c.beginPath();c.arc(pr.x,pr.y,pr.size*.45,0,7);c.fill();c.restore()}}
drawImpacts(){const c=ctx;for(const im of this.impacts){const k=1-im.t/im.max,s=(im.crit?30:20)*(.4+k);c.save();c.translate(im.x,im.y);c.globalCompositeOperation='lighter';c.globalAlpha=1-k;c.fillStyle=im.crit?'#f4d0ff':'#e8ffff';c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4+im.angle,r=i%2?s*.3:s;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.strokeStyle=im.crit?'#b06bff':'#3fd6ff';c.lineWidth=2;c.beginPath();c.arc(0,0,s*1.2,0,7);c.stroke();c.globalAlpha=(1-k)*.5;c.strokeStyle='#7b2cff';c.lineWidth=4*(1-k)+1;c.beginPath();c.arc(0,0,s*1.6+8*k,0,7);c.stroke();c.restore()}}
draw(){ctx.clearRect(0,0,canvas.width,canvas.height);if(!this.started){ctx.fillStyle='#050d18';ctx.fillRect(0,0,canvas.width,canvas.height);return}let p=this.player;
 this.updateCamera();if(this.world.kind==='dungeon')this.drawDungeonBackdrop();const sx=this.shakeMag>0?rand(-1,1)*this.shakeMag:0,sy=this.shakeMag>0?rand(-1,1)*this.shakeMag:0;
 ctx.save();ctx.translate(Math.round(-this.camera.x+sx),Math.round(-this.camera.y+sy));const view={x:this.camera.x,y:this.camera.y,w:canvas.width,h:canvas.height};this.world.draw(ctx,this.time,view);if(this.world.kind==='dungeon')this.drawWorldEdges(ctx,view);if(this.world.kind==='hub')this.gates.draw(ctx,this.time,this.world);this.drawAtmosphere(ctx);
 for(let c of this.corpses){ctx.save();ctx.globalAlpha=Math.min(1,c.life);ctx.fillStyle='#160b27';ctx.beginPath();ctx.ellipse(c.x,c.y+10,24,10,0,0,7);ctx.fill();ctx.shadowColor='#a855f7';ctx.shadowBlur=16;ctx.strokeStyle='#9f4de0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.x,c.y+10,20+Math.sin(this.time*4)*2,7,0,0,7);ctx.stroke();for(let i=0;i<7;i++){let phase=(this.time*16+i*7)%30;ctx.fillStyle=i%2?'#b761f5':'#65238d';ctx.globalAlpha=Math.min(1,c.life)*(1-phase/35);ctx.fillRect(c.x+Math.sin(this.time*3+i*2)*12,c.y+8-phase,3+i%2,4+i%3)}ctx.restore()}
 if(this.bossDefeated&&!this.chest){ctx.fillStyle='#3b211a';ctx.fillRect(1477,580,46,32);ctx.fillStyle='#e9b950';ctx.fillRect(1477,586,46,5);ctx.fillRect(1497,582,5,29);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.2*Math.sin(this.time*4);ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(1500,596,40,0,7);ctx.fill();ctx.restore()}
 for(const e of this.enemies)if(e.state==='windup'&&this.fogVisible(e))this.drawTelegraph(e);
 this.animation.drawGhosts(ctx);this.animation.draw(ctx,'under');
 let actors=[...this.enemies.filter(e=>this.fogVisible(e)),...this.soldiers,p,...(this.world.npcs?this.world.npcs.visible(view):[])];if(this.ally)actors.push(this.ally);
 actors.sort((a,b)=>a.y-b.y);
 for(let a of actors){if(a.isCityNPC){a.draw(ctx,this);continue}if(a.isAlly){a.draw(ctx,this);continue}if(a===p){
   // The hero is always rendered at full opacity (no post-dash transparency).
   ctx.globalAlpha=1;ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(a.x,a.y+9,15,5,0,0,7);ctx.fill();
   if(p.stealth>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#5a6bff';ctx.globalAlpha=.45*Math.min(1,p.stealth);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y+9,20+Math.sin(this.time*10)*2,7,0,0,7);ctx.stroke();ctx.restore()}
   if(p.poison>0||p.slow>0){ctx.save();ctx.globalAlpha=.6;ctx.fillStyle=p.poison>0?'#7dff5a':'#bff0ff';ctx.fillRect(a.x-12,a.y-58,24,2);ctx.restore()}
   ctx.drawImage(this.animation.frame(p),Math.round(a.x-32),Math.round(a.y-50),64,64);continue}
  if(a.isShadow){this.drawShadow(a);continue}
  this.drawEnemy(a)}
 if(this.world.kind==='hub')this.world.cityTop(ctx,this.time,view);this.drawHazards();this.animation.draw(ctx);this.drawImpacts();this.particles.draw(ctx);if(this.world.theme){this.drawDarkness(ctx);this.drawTint(ctx);this.drawDungeonWeather(ctx)}this.drawFog(ctx);
 for(let f of this.floats){ctx.fillStyle=f.color;ctx.font=`bold ${f.size||16}px monospace`;ctx.lineWidth=3;ctx.strokeStyle='#07131b';ctx.strokeText(f.text,f.x,f.y);ctx.fillText(f.text,f.x,f.y)}
 ctx.restore();
 // indicador de inimigos fora da tela (principalmente à noite)
 if(this.world.kind!=='dungeon')this.drawOffscreenEnemies(ctx);
 // tutorial interativo: passo atual no centro da tela
 if(!this.tutorialDone&&this.tutorial){const st=TUTORIAL_STEPS[this.tutorial.step];if(st){ctx.save();ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillStyle='#07131b';ctx.fillText(st.text,canvas.width/2+1,65);ctx.fillStyle='#7fe8ff';ctx.fillText(st.text,canvas.width/2,64);ctx.font='10px monospace';ctx.fillStyle='#6fa8b8';ctx.fillText(`PASSO ${this.tutorial.step+1}/${TUTORIAL_STEPS.length}`,canvas.width/2,80);ctx.restore()}}
 if(this.world.kind==='hub'||this.world.kind==='city2')this.drawGateArrows();
 this.drawMap();
 if(this.qte&&!this.qte.done){const q=this.qte,k=q.t/q.dur,W=canvas.width,H=canvas.height;ctx.save();ctx.fillStyle='#020810cc';ctx.fillRect(W/2-160,H*.32,320,86);ctx.strokeStyle='#3fd6ff';ctx.strokeRect(W/2-160,H*.32,320,86);
  ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillStyle='#7fe8ff';ctx.fillText(q.label,W/2,H*.32+22);
  const bx=W/2-130,bw=260,by=H*.32+40;ctx.fillStyle='#0a1826';ctx.fillRect(bx,by,bw,16);ctx.fillStyle='#27bfff55';ctx.fillRect(bx+bw*q.zone[0],by,bw*(q.zone[1]-q.zone[0]),16);ctx.fillStyle='#ffe16c';ctx.fillRect(bx+bw*k-3,by-4,6,24);
  ctx.fillStyle='#e8fbff';ctx.font='bold 11px monospace';ctx.fillText(`${Math.ceil(Math.max(0,q.dur-q.t)*10)/10}s`,W/2,H*.32+74);ctx.restore()}
 this.drawAimAssist();
 if(this.cutscene)this.cutscene.draw(ctx);
 if(this.comboSeq>=3){ctx.save();ctx.font='bold 22px monospace';ctx.textAlign='center';ctx.fillStyle='#7fe8ff';ctx.lineWidth=4;ctx.strokeStyle='#07131b';const tx=canvas.width/2,ty=110;ctx.strokeText(`COMBO x${this.comboSeq}`,tx,ty);ctx.fillText(`COMBO x${this.comboSeq}`,tx,ty);ctx.restore()}
 if(this.fps&&this.fpsVal!==undefined){ctx.save();ctx.font='bold 11px monospace';ctx.fillStyle='#7fe8ff';ctx.textAlign='left';ctx.fillText(`${this.fpsVal} FPS`,12,canvas.height-10);ctx.restore()}
 if(this.penalty){ctx.save();ctx.fillStyle='#ffd27a';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(`ZONA DE PENALDADE · ONDA ${this.penalty.wave}`,canvas.width/2,42);ctx.restore()}
 if(this.redGateActive){ctx.save();ctx.fillStyle='#ff8a8a';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(`GATE VERMELHO · ${Math.ceil(this.redTimer)}s`,canvas.width/2,58);ctx.restore()}
 if(this.classChange){ctx.save();ctx.fillStyle='#ffd27a';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('DUNGEON ESPECIAL · MUDANÇA DE CLASSE',canvas.width/2,74);ctx.restore()}}
drawOffscreenEnemies(ctx){const W=canvas.width,H=canvas.height;for(const e of this.enemies){const sx=e.x-this.camera.x,sy=e.y-this.camera.y;if(sx>0&&sx<W&&sy>0&&sy<H)continue;if(e.boss)continue;const a=Math.atan2(sy-H/2,sx-W/2),m=40,ex=clamp(W/2+Math.cos(a)*W,m,W-m),ey=clamp(H/2+Math.sin(a)*H,m+80,H-m-40);ctx.save();ctx.globalAlpha=.6;ctx.fillStyle='#ff4b57';ctx.beginPath();ctx.arc(ex,ey,5,0,7);ctx.fill();ctx.restore()}}
drawGateArrows(){const p=this.player,W=canvas.width,H=canvas.height;for(const g of this.gates.list){const sx=g.x-this.camera.x,sy=g.y-this.camera.y;if(sx>0&&sx<W&&sy>0&&sy<H)continue;const a=Math.atan2(sy-H/2,sx-W/2),m=60,ex=clamp(W/2+Math.cos(a)*W,m,W-m),ey=clamp(H/2+Math.sin(a)*H,m+90,H-m-90),col=g.red?'#ff4b57':'#3bcfff';
 ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.globalAlpha=.75+.25*Math.sin(this.time*5);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-8,-9);ctx.lineTo(-4,0);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle=col;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(`${g.rank} · ${Math.round(dist(g,p)/10)}m`,ex-Math.cos(a)*24,ey-Math.sin(a)*24+4);ctx.textAlign='left'}}
drawAtmosphere(c){
 if(this.world.theme){this.drawThemeFX(c);return}
 const dungeon=this.world.kind==='dungeon',snow=dungeon&&this.world.rank==='A',lava=dungeon&&this.world.rank==='S';
 c.save();c.globalAlpha=.32;c.fillStyle=snow?'#e8fbff':lava?'#ff9763':dungeon?'#78c4cc':'#b3d2c4';
 // Motes are anchored to world cells (not to the screen), so they no longer slide along with the
 // camera/player; they drift inside their cell (snow falls, dust rises) and wrap seamlessly.
 const ox=this.camera.x,oy=this.camera.y,W=canvas.width,H=canvas.height,C=300,drift=snow?30:-7;
 for(let gx=Math.floor(ox/C);gx*C<ox+W;gx++)for(let gy=Math.floor(oy/C);gy*C<oy+H;gy++)for(let i=0;i<3;i++){const n=gx*7+gy*13+i,x=gx*C+hash2(gx*3+i,gy)*C+Math.sin(this.time*.35+n)*16,y=gy*C+(((hash2(gx,gy*3+i)*C+this.time*drift*(1+i))%C)+C)%C,sz=(n%7===0)?3:2;c.fillRect(x,y,sz,sz)}
 c.restore();
}
// ---- Dungeon lighting (layered darkness) ---------------------------------------------------
// Darkness is painted on a half-resolution offscreen buffer, then soft holes are punched with
// destination-out around the hunter (radius grows with Perception), every themed light source
// (flicker: 1 = flame, 2 = fluorescent tube) and the shadow soldiers' faint aura. The buffer is
// stretched back over the view, so the light falloff stays soft and the cost stays low.
lightSprite(){if(this._lightSpr)return this._lightSpr;const s=document.createElement('canvas');s.width=s.height=128;const g=s.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.45,'rgba(255,255,255,.75)');gr.addColorStop(.75,'rgba(255,255,255,.28)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return this._lightSpr=s}
drawDarkness(c){const w=this.world,th=w.theme;if(!th||!(th.dark>0))return;const S=.5,M=24,W=canvas.width+M*2,H=canvas.height+M*2,ox=this.camera.x-M,oy=this.camera.y-M,t=this.time,p=this.player;
 let b=this._darkBuf;if(!b){b=this._darkBuf=document.createElement('canvas')}const bw=Math.ceil(W*S),bh=Math.ceil(H*S);if(b.width!==bw||b.height!==bh){b.width=bw;b.height=bh}
 const g=b.getContext('2d'),spr=this.lightSprite();g.globalCompositeOperation='source-over';g.clearRect(0,0,bw,bh);g.globalAlpha=1;g.fillStyle=th.pal.bg||'#000';g.fillRect(0,0,bw,bh);g.fillStyle='#000';g.globalAlpha=.7;g.fillRect(0,0,bw,bh);
 g.globalCompositeOperation='destination-out';
 const hole=(x,y,r,a)=>{if(r<=0||a<=0)return;const X=(x-ox)*S,Y=(y-oy)*S,R=r*S;if(X+R<0||Y+R<0||X-R>bw||Y-R>bh)return;g.globalAlpha=Math.min(1,a);g.drawImage(spr,X-R,Y-R,R*2,R*2)};
 const per=p.stats.PER||5,pr=170+Math.min(170,per*5);hole(p.x,p.y-10,pr,1);hole(p.x,p.y-10,pr*.6,1);
 const lite=typeof Mobile!=='undefined'&&Mobile.light;
 for(const L of w.lights||[]){let a=1,r=L.r;if(L.f===1){const k=Math.sin(t*9+L.seed)*.5+Math.sin(t*23+L.seed*3)*.25;a=.86+k*.1;r*=1+k*.05}else if(L.f===2){const ph=Math.sin(t*1.7+L.seed*5);a=ph>.86&&Math.sin(t*41+L.seed)>0?.25:ph<-.95?.5:.95}hole(L.x,L.y,r,a*.62);if(!lite)hole(L.x,L.y,r*.4,a*.5)}
 if(!lite)for(const s of this.soldiers)hole(s.x,s.y-8,70,.35);
 for(const pr2 of this.projectiles)hole(pr2.x,pr2.y,60,.45);
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 c.save();c.globalAlpha=th.dark;c.imageSmoothingEnabled=true;c.drawImage(b,0,0,bw,bh,ox,oy,W,H);c.restore();
 // colored glow of the lights, added on top of the darkness so torches / crystals read as sources
 if(!lite){c.save();c.globalCompositeOperation='lighter';for(const L of w.lights||[]){if(L.x+L.r<ox||L.y+L.r<oy||L.x-L.r>ox+W||L.y-L.r>oy+H)continue;const k=L.f===1?.85+Math.sin(t*9+L.seed)*.12:1;c.globalAlpha=.16*k*th.dark;c.drawImage(DungeonArt.glow(L.c),L.x-L.r*.6,L.y-L.r*.6,L.r*1.2,L.r*1.2)}c.restore()}}
drawTint(c){const th=this.world.theme;if(!th||!th.tint)return;c.save();c.globalAlpha=th.tint[1];c.fillStyle=th.tint[0];c.fillRect(this.camera.x-30,this.camera.y-30,canvas.width+60,canvas.height+60);c.restore()}
// ---- Themed ambient effects (world-anchored so they never slide with the camera) -----------
drawThemeFX(c){const w=this.world,th=w.theme,t=this.time,ox=this.camera.x,oy=this.camera.y,W=canvas.width,H=canvas.height,lite=typeof Mobile!=='undefined'&&Mobile.light,P=th.pal;
 const cells=(C,n,fn)=>{for(let gx=Math.floor(ox/C);gx*C<ox+W;gx++)for(let gy=Math.floor(oy/C);gy*C<oy+H;gy++)for(let i=0;i<(lite?Math.ceil(n/2):n);i++)fn(gx,gy,i,hash2(gx*7+i,gy*3+1),hash2(gy*5+i,gx*11+2),C)};
 const wrap=(v,C)=>((v%C)+C)%C;c.save();
 for(const fx of th.fx||[]){switch(fx){
  case 'mist':{const col=th.id==='swamp'?'#7fa86a':th.id==='jeju'?'#6a3a78':th.id==='fogforest'?'#b8c4b0':'#8a9aa0';c.fillStyle=col;cells(420,3,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(10+i*4),C+200)-100,y=gy*C+b*C+Math.sin(t*.4+i)*12;c.globalAlpha=.07+.04*Math.sin(t*.6+a*9);c.beginPath();c.ellipse(x,y,110+a*80,26+b*16,0,0,7);c.fill()});break}
  case 'drip':cells(260,3,(gx,gy,i,a,b,C)=>{const per=1.6+a*2,ph=wrap(t+b*per,per)/per,x=gx*C+a*C,y0=gy*C+b*C;if(ph<.55){c.globalAlpha=.7;c.fillStyle='#a8d8e8';c.fillRect(x,y0-60+ph/.55*60,2,5)}else{const k=(ph-.55)/.45;c.globalAlpha=.5*(1-k);c.strokeStyle='#a8d8e8';c.lineWidth=1;c.beginPath();c.ellipse(x+1,y0+4,3+k*12,1+k*4,0,0,7);c.stroke()}});break;
  case 'dust':c.fillStyle=P.light;cells(300,4,(gx,gy,i,a,b,C)=>{const x=gx*C+a*C+Math.sin(t*.3+i+a*9)*20,y=gy*C+wrap(b*C-t*(5+i*2),C);c.globalAlpha=.18+.14*Math.sin(t*1.3+a*20);c.fillRect(x,y,2,2)});break;
  case 'bubbles':{const col=th.id==='swamp'?'#b8e08a':'#9ff4ff';c.strokeStyle=col;c.lineWidth=1;for(const z of w.zones||[]){if(z.kind!=='slow'&&z.kind!=='poison')continue;if(z.x+z.rx<ox||z.x-z.rx>ox+W||z.y+z.ry<oy||z.y-z.ry>oy+H)continue;for(let i=0;i<(lite?2:4);i++){const per=1.8+i*.5,ph=wrap(t+z.seed+i*.7,per)/per,bx=z.x+(hash2(i,z.seed*9|0)-.5)*z.rx*1.2,by=z.y+(hash2(z.seed*9|0,i)-.5)*z.ry*1.1-ph*10;c.globalAlpha=.65*(1-ph);c.beginPath();c.arc(bx,by,2+ph*4,0,7);c.stroke()}}
   if(th.id==='sunken'){c.fillStyle='#bff8ff';cells(240,4,(gx,gy,i,a,b,C)=>{const x=gx*C+a*C+Math.sin(t*2+i)*4,y=gy*C+wrap(b*C-t*(18+i*6),C);c.globalAlpha=.35;c.beginPath();c.arc(x,y,1.5+i%2,0,7);c.fill()})}break}
  case 'leaves':cells(280,3,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(30+i*10),C),y=gy*C+wrap(b*C+t*(12+i*3),C)+Math.sin(t*2+a*9)*8;c.globalAlpha=.8;c.fillStyle=i%2?'#a8843a':'#7a8a3a';c.save();c.translate(x,y);c.rotate(t*2+a*9);c.fillRect(-3,-1.5,6,3);c.restore()});break;
  case 'spores':c.fillStyle=P.light;cells(260,4,(gx,gy,i,a,b,C)=>{const x=gx*C+a*C+Math.sin(t*.7+i*2+a*5)*18,y=gy*C+wrap(b*C-t*(6+i*3),C);c.globalAlpha=.35+.3*Math.sin(t*2+a*30);c.beginPath();c.arc(x,y,1.5+(i%3)*.7,0,7);c.fill()});break;
  case 'sandstorm':{const gust=.5+.5*Math.sin(t*.35);c.fillStyle='#e8b070';cells(220,lite?4:7,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(220+i*40),C),y=gy*C+b*C+Math.sin(t*3+i)*3;c.globalAlpha=(.15+.25*gust)*(.5+a*.5);c.fillRect(x,y,10+i*4,1.5)});c.globalAlpha=.1*gust;c.fillStyle='#d89050';c.fillRect(ox,oy,W,H);break}
  case 'caustics':{c.globalCompositeOperation='lighter';c.strokeStyle='#5ff0e0';c.lineWidth=2;cells(200,2,(gx,gy,i,a,b,C)=>{const x=gx*C+a*C,y=gy*C+b*C,r=22+Math.sin(t*1.4+a*9)*8;c.globalAlpha=.06+.04*Math.sin(t*2+b*9);c.beginPath();c.ellipse(x+Math.sin(t*.8+i)*10,y,r*1.6,r*.7,Math.sin(t*.3+a)*.6,0,7);c.stroke()});c.globalCompositeOperation='source-over';break}
  case 'snow':c.fillStyle='#ffffff';cells(260,lite?4:7,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(40+i*6)+Math.sin(t+i*2)*10,C),y=gy*C+wrap(b*C+t*(60+i*14),C);c.globalAlpha=.55+.3*a;const s=i%3===0?3:2;c.fillRect(x,y,s,s)});break;
  case 'embers':c.globalCompositeOperation='lighter';cells(260,4,(gx,gy,i,a,b,C)=>{const x=gx*C+a*C+Math.sin(t*1.5+i+a*7)*14,y=gy*C+wrap(b*C-t*(28+i*10),C);c.globalAlpha=.5+.4*Math.sin(t*6+a*40);c.fillStyle=i%2?'#ffb04a':'#ff5a1a';c.fillRect(x,y,2,2)});c.globalCompositeOperation='source-over';break;
  case 'smoke':{c.fillStyle='#1a1414';const M=110;for(const [x0,y0,x1,y1] of [[ox,oy,ox+W,oy+M],[ox,oy+H-M,ox+W,oy+H]]){for(let i=0;i<(lite?4:8);i++){const x=x0+wrap(i*173+t*(14+i*3)-ox*0,W+200)-100,y=(y0+y1)/2+Math.sin(t*.5+i)*20;c.globalAlpha=.18;c.beginPath();c.ellipse(x,y,90,40,0,0,7);c.fill()}}break}
  case 'ash':cells(260,5,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(10+i*4)+Math.sin(t*.8+i)*14,C),y=gy*C+wrap(b*C+t*(22+i*6),C);c.globalAlpha=.55;c.fillStyle=i%2?'#8a8580':'#3a3434';c.fillRect(x,y,2+(i%2),2)});break;
  case 'wind':c.strokeStyle='#e8d8ff';c.lineWidth=1;cells(300,3,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(260+i*60),C+200)-100,y=gy*C+b*C;c.globalAlpha=.16;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+30,y-4,x+70,y+2);c.stroke()});c.fillStyle='#5a4a6a';cells(320,2,(gx,gy,i,a,b,C)=>{const x=gx*C+wrap(a*C+t*(180+i*40),C),y=gy*C+b*C+Math.sin(t*3+i)*10;c.globalAlpha=.7;c.save();c.translate(x,y);c.rotate(t*6+a*9);c.fillRect(-3,-2,6,4);c.restore()});break;
  case 'lightning':{const cyc=7,ph=wrap(t,cyc);if(ph<.5){const k=ph<.08?1:ph<.16?.2:ph<.24?.8:Math.max(0,1-(ph-.24)/.26);c.globalAlpha=.35*k;c.fillStyle='#e6d8ff';c.fillRect(ox,oy,W,H);if(ph<.3){const bx=ox+hash2(Math.floor(t/cyc),3)*W;c.globalAlpha=.9*k;c.strokeStyle='#f4ecff';c.lineWidth=3;c.beginPath();let x=bx,y=oy;c.moveTo(x,y);while(y<oy+H*.6){x+=(hash2(y|0,Math.floor(t/cyc))-.5)*60;y+=40;c.lineTo(x,y)}c.stroke()}}break}
  case 'shock':{c.lineWidth=3;for(let i=0;i<3;i++){const per=4.5,ph=wrap(t+i*1.5,per)/per,k=Math.floor((t+i*1.5)/per),x=300+hash2(k,i)*1200,y=200+hash2(i,k)*800,r=ph*360;if(x+r<ox||x-r>ox+W||y+r<oy||y-r>oy+H)continue;c.globalAlpha=.5*(1-ph);c.strokeStyle=i%2?'#ffd27a':'#a855f7';c.beginPath();c.ellipse(x,y,r,r*.55,0,0,7);c.stroke()}break}
  case 'stars':c.globalCompositeOperation='lighter';cells(200,3,(gx,gy,i,a,b,C)=>{const x=gx*C+a*C,y=gy*C+b*C;if(w.theme.split&&x<w.w/2)return;c.globalAlpha=.3+.5*Math.max(0,Math.sin(t*2+a*40));c.fillStyle=i%2?'#ffe6a8':'#d8c8ff';c.fillRect(x,y,2,2)});c.globalCompositeOperation='source-over';break;
 }}
 c.restore()}
drawMap(){let m=mapctx,w=this.world,sx=150/w.w,sy=100/w.h,X=x=>x*sx+5,Y=y=>y*sy+5;m.clearRect(0,0,160,112);m.fillStyle='#071825';m.fillRect(0,0,160,112);m.strokeStyle='#143747';for(let x=20;x<160;x+=20){m.beginPath();m.moveTo(x,0);m.lineTo(x,112);m.stroke()}for(let y=20;y<112;y+=20){m.beginPath();m.moveTo(0,y);m.lineTo(160,y);m.stroke()}m.strokeStyle='#1c5669';m.strokeRect(4,4,152,104);
 if(w.kind==='hub'){m.fillStyle='#163a2a';for(const pk of CITY.parks)m.fillRect(X(pk.x),Y(pk.y),pk.w*sx,pk.h*sy);m.fillStyle='#2a3a44';for(const r of CITY.roads)m.fillRect(X(r.x),Y(r.y),Math.max(1,r.w*sx),Math.max(1,r.h*sy));m.fillStyle='#0e3a55';m.fillRect(X(0),Y(RIVER.y),w.w*sx,RIVER.h*sy);m.fillStyle='#24566a';for(const b of CITY.buildings)m.fillRect(X(b.x),Y(b.y),b.w*sx,b.h*sy);m.fillStyle='#3b7c8c';m.fillRect(X(HUB.ox+540),Y(HUB.oy+50),720*sx,270*sy);
  m.fillStyle='#e0b84a';m.fillRect(X(HUB.merchant.x)-1,Y(HUB.merchant.y)-1,3,3);m.fillStyle='#5affb0';m.fillRect(X(HUB.healer.x)-1,Y(HUB.healer.y)-1,3,3);
  for(const g of this.gates.list){const blink=g.forming>0||g.life<GATE_RULES.warnAt?Math.sin(this.time*12)>0:true;if(!blink)continue;m.fillStyle=g.red?'#ff5363':'#54dfff';m.shadowColor=m.fillStyle;m.shadowBlur=6;m.fillRect(X(g.x)-2,Y(g.y)-2,5,5);m.shadowBlur=0}
  m.strokeStyle='#a7fcff55';m.strokeRect(X(this.camera.x),Y(this.camera.y),canvas.width*sx,canvas.height*sy)}
 else if(w.kind==='city2'){// Busan: quadras, orla e o portal de volta a Seoul.
  m.fillStyle='#2c4438';m.fillRect(X(0),Y(0),w.w*sx,1760*sy);m.fillStyle='#c8a878';m.fillRect(X(0),Y(1760),w.w*sx,140*sy);m.fillStyle='#0e4a68';m.fillRect(X(0),Y(1900),w.w*sx,(w.h-1900)*sy);
  m.fillStyle='#232a2e';for(let x=0;x<w.w;x+=760)m.fillRect(X(x),Y(0),120*sx,1710*sy);for(let y=150;y<1300;y+=520)m.fillRect(X(0),Y(y),w.w*sx,110*sy);
  m.fillStyle='#4a5a68';for(const b of THIS_CITY2.buildings)m.fillRect(X(b.x),Y(b.y),b.w*sx,b.h*sy);
  m.fillStyle='#3bcfff';m.fillRect(X(THIS_CITY2.portal.x)-2,Y(THIS_CITY2.portal.y)-2,5,5);
  for(const g of this.gates.list){m.fillStyle=g.red?'#ff5363':'#54dfff';m.fillRect(X(g.x)-2,Y(g.y)-2,4,4)}
  m.strokeStyle='#a7fcff55';m.strokeRect(X(this.camera.x),Y(this.camera.y),canvas.width*sx,canvas.height*sy)}
 else{// Minimap follows the fog of war: only explored rooms, the corridors leaving them and monsters
  // the player can currently see (lit room, or adjacent rooms with high Perception).
  const f=this.fog||this.computeFog();m.fillStyle='#32748a';for(const r of (w.corridors||[]))if(w.rooms[r.a].seen||w.rooms[r.b].seen)m.fillRect(X(r.gap.x),Y(r.gap.y),Math.max(1,r.gap.w*sx),Math.max(1,r.gap.h*sy));
  for(const r of w.rooms.filter(r=>r.seen)){const z='r'+r.id;m.fillStyle=f.lit.has(z)?'#2a7d98':f.near.has(z)?'#1f5f78':'#17465b';m.fillRect(X(r.x),Y(r.y),r.w*sx,r.h*sy)}
  m.fillStyle='#f16978';for(let e of this.enemies)if(this.fogVisible(e))m.fillRect(X(e.x),Y(e.y),e.boss?4:2,e.boss?4:2);m.fillStyle='#b46bff';for(const s of this.soldiers)if(s.state!=='REGENERATE')m.fillRect(X(s.x),Y(s.y),2,2)}
 m.fillStyle='#a7fcff';m.shadowColor='#58faff';m.shadowBlur=7;m.fillRect(X(this.player.x)-2,Y(this.player.y)-2,5,5);m.shadowBlur=0}
loop(t){let rdt=(t-this.last)/1000||0,dt=Math.min(.04,rdt);this.last=t;if(rdt<1)Mobile.perf(rdt);this.sprites.beginFrame();if(this.started)this.update(dt);this.draw();this.sprites.warm(this.started?(dt>.02?1:3):8);requestAnimationFrame(t=>this.loop(t))}}
const game=new GameEngine();game.floats=[];game.contracts=[];game.bestiary={};game.hunter={points:0,rank:'E',evalReady:false};game.story={};game.daily={date:new Date().toLocaleDateString('en-CA'),kills:0,dashes:0,distance:0,pushups:0,situps:0,deaths:0,done:false,penalty:false};game.rollContracts();
 $('#accept').onclick=()=>{Mobile.onStart();game.start(null)};if(SaveSystem.load())$('#continue').classList.remove('hidden');$('#continue').onclick=()=>{Mobile.onStart();game.start(SaveSystem.load())};document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{if(game.started)UIManager.open(b.dataset.panel)});$('#modal').addEventListener('click',e=>{if(e.target===e.currentTarget&&game.panel!=='dead'){UIManager.close();return}let b=e.target.closest('button');if(!b)return;let d=b.dataset,p=game.player;if(d.open){UIManager.open(d.open);return}if(d.set){Mobile.set(d.set,d.val);if(game.panel==='menu')UIManager.open('menu');return}if(d.do==='close'||d.do==='resume')UIManager.close();else if(d.do==='save'){SaveSystem.save(game);UIManager.close();game.message('PROGRESSO SALVO')}else if(d.do==='hub'||d.do==='revive'){p.hp=p.maxhp;p.mp=p.maxmp;game.returnHub()}else if(d.do==='summon'){game.toggleArmy();UIManager.open('army')}else if(d.do==='order'){game.cycleArmyOrder();UIManager.open('army')}else if(d.do==='talents'){UIManager.open('talents')}else if(d.do==='export'){UIManager.open('export')}else if(d.do==='import'){UIManager.open('import')}else if(d.do==='importRun'){const ta=$('#importCode');if(ta&&SaveSystem.import(ta.value)){game.start(SaveSystem.load());UIManager.close();game.message('SAVE IMPORTADO')}else game.message('CÓDIGO INVÁLIDO')}
 else if(d.talent){game.spendTalent(d.talent);UIManager.open('talents')}else if(d.contract!==undefined){game.acceptContract(+d.contract);UIManager.open('contracts')}else if(d.itemEquip!==undefined){game.equipItem(d.itemEquip);UIManager.open('inventory')}else if(d.stat&&p.points>0){p.stats[d.stat]++;p.points--;UIManager.open('status')}else if(d.dismiss!==undefined){game.dismissShadow(+d.dismiss);UIManager.open('army')}else if(d.equip!==undefined){let i=+d.equip;if(p.owned.includes(i))p.weapon=i;UIManager.open('inventory')}else if(d.buy!==undefined){let i=+d.buy,w=weapons[i];if(p.owned.includes(i)){p.weapon=i}else if(p.gold>=w.price){p.gold-=w.price;p.owned.push(i);p.weapon=i;game.message('ARMA ADQUIRIDA')}UIManager.open('shop')}else if(d.potion){if(p.gold>=40){p.gold-=40;if(d.potion==='hp')p.hppots++;else p.mppots++}UIManager.open('shop')}else if(d.gate){const gate=game.selectedGate;if(gate)game.gates.remove(gate);game.selectedGate=null;game.enter(d.gate,d.red==='1',d.theme||null)}if(game.started)SaveSystem.save(game)});
