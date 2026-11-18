const $=s=>document.querySelector(s), canvas=$('#canvas'),ctx=canvas.getContext('2d'),mapctx=$('#map').getContext('2d');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), rand=(a,b)=>Math.random()*(b-a)+a, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class InputHandler{constructor(){this.keys={};this.mouse={x:0,y:0,down:false};window.addEventListener('keydown',e=>{if(['Tab',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(!this.keys[e.key.toLowerCase()])game.key(e.key.toLowerCase());this.keys[e.key.toLowerCase()]=true});window.addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false);canvas.addEventListener('mousemove',e=>{this.mouse.x=e.clientX;this.mouse.y=e.clientY});canvas.addEventListener('mousedown',e=>{if(e.button===0)this.mouse.down=true;if(e.button===2)game.dash()});window.addEventListener('mouseup',()=>this.mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault())}}
class SoundFX{constructor(){this.audio=null} play(type){try{this.audio??=new AudioContext();let a=this.audio,o=a.createOscillator(),g=a.createGain();o.type=type==='shadow'?'sawtooth':'triangle';o.frequency.setValueAtTime(type==='hit'?130:type==='shadow'?90:450,a.currentTime);o.frequency.exponentialRampToValueAtTime(type==='hit'?60:type==='shadow'?180:180,a.currentTime+.15);g.gain.setValueAtTime(.035,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.17);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.18)}catch{}}}
// Pixel art is rasterised once into cached canvases; no external artwork is required.
// PixelGrid is a tiny software painter: shapes are filled pixel by pixel, then an outline
// and rim-light pass is applied so every sprite has a crisp silhouette at any facing.
const OUTLINE='#04070c';
class PixelGrid{
 constructor(w,h){this.w=w;this.h=h;this.px=new Array(w*h).fill(null)}
 set(x,y,c){x|=0;y|=0;if(x>=0&&y>=0&&x<this.w&&y<this.h)this.px[y*this.w+x]=c}
 get(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h?this.px[y*this.w+x]:null}
 rect(x,y,w,h,c){for(let j=Math.round(y);j<Math.round(y+h);j++)for(let i=Math.round(x);i<Math.round(x+w);i++)this.set(i,j,c)}
 disc(cx,cy,rx,ry,c){for(let j=Math.floor(cy-ry-1);j<=Math.ceil(cy+ry);j++)for(let i=Math.floor(cx-rx-1);i<=Math.ceil(cx+rx);i++){const dx=(i+.5-cx)/rx,dy=(j+.5-cy)/ry;if(dx*dx+dy*dy<=1)this.set(i,j,c)}}
 capsule(x0,y0,x1,y1,r,c){const minx=Math.floor(Math.min(x0,x1)-r-1),maxx=Math.ceil(Math.max(x0,x1)+r),miny=Math.floor(Math.min(y0,y1)-r-1),maxy=Math.ceil(Math.max(y0,y1)+r),vx=x1-x0,vy=y1-y0,l2=vx*vx+vy*vy||1;
  for(let j=miny;j<=maxy;j++)for(let i=minx;i<=maxx;i++){const px=i+.5,py=j+.5,t=clamp(((px-x0)*vx+(py-y0)*vy)/l2,0,1),dx=px-(x0+vx*t),dy=py-(y0+vy*t);if(dx*dx+dy*dy<=r*r)this.set(i,j,c)}}
 line(x0,y0,x1,y1,c){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.5));for(let k=0;k<=n;k++)this.set(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c)}
 poly(pts,c){if(pts.length<3)return;let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;for(const [x,y] of pts){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}
  for(let j=Math.floor(miny);j<=Math.ceil(maxy);j++)for(let i=Math.floor(minx);i<=Math.ceil(maxx);i++){const px=i+.5,py=j+.5;let inside=false;for(let a=0,b=pts.length-1;a<pts.length;b=a++){const [xa,ya]=pts[a],[xb,yb]=pts[b];if((ya>py)!==(yb>py)&&px<(xb-xa)*(py-ya)/(yb-ya)+xa)inside=!inside}if(inside)this.set(i,j,c)}}
 hull(pts,c){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const q of p){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q)}
  for(const q of p.reverse()){while(up.length>1&&cross(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q)}
  this.poly([...lo.slice(0,-1),...up.slice(0,-1)],c)}
 // Outline + directional rim light (moonlight from the upper left) + soft underside shade.
 finish(light={},dark={},outline=OUTLINE){const src=this.px.slice(),w=this.w,h=this.h,at=(x,y)=>x>=0&&y>=0&&x<w&&y<h?src[y*w+x]:null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=src[y*w+x];if(!c){if(at(x-1,y)||at(x+1,y)||at(x,y-1)||at(x,y+1))this.px[y*w+x]=outline;continue}
   if((!at(x,y-1)||!at(x-1,y))&&light[c])this.px[y*w+x]=light[c];else if((!at(x,y+1)||!at(x+1,y))&&dark[c])this.px[y*w+x]=dark[c]}
  return this}
 toCanvas(scale=1){const c=document.createElement('canvas');c.width=this.w*scale;c.height=this.h*scale;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  for(let j=0;j<this.h;j++){let i=0;while(i<this.w){const col=this.px[j*this.w+i];if(!col){i++;continue}let k=i+1;while(k<this.w&&this.px[j*this.w+k]===col)k++;x.fillStyle=col;x.fillRect(i*scale,j*scale,(k-i)*scale,scale);i=k}}
  return c}
}
// Hero rig: joints live in a body space (r = lateral right, f = forward, h = height) and are
// projected for each of the 8 facings. Side, three-quarter and back views are therefore real
// views of the same model (no more front sprite with shifted eyes walking "backwards").
const HERO={coat:'#17253a',sleeve:'#1d3049',coatD:'#0c1522',coatL:'#2d4762',trim:'#46d6ff',shirt:'#0b1119',pants:'#121c2a',pantsL:'#22334b',boot:'#080a10',bootL:'#2c3647',skin:'#ecc8b2',skinD:'#c99883',hair:'#0b0f18',hairL:'#25344c',eye:'#a8f8ff',eyeG:'#22c8f0',blade:'#e2fdff',bladeE:'#4fd5ff',grip:'#1a1f2b',guard:'#8798ad',glove:'#0d1119',belt:'#1d2534',buckle:'#a9bfd2'};
const HERO_LIGHT={[HERO.coat]:HERO.coatL,[HERO.sleeve]:'#355476',[HERO.pants]:HERO.pantsL,[HERO.boot]:HERO.bootL,[HERO.hair]:HERO.hairL,[HERO.skin]:'#fbe2d2',[HERO.shirt]:'#1b2533',[HERO.glove]:'#283041',[HERO.belt]:'#33415a'};
const HERO_DARK={[HERO.coat]:HERO.coatD,[HERO.sleeve]:'#101b2b',[HERO.skin]:HERO.skinD,[HERO.pants]:'#0a111b',[HERO.hair]:'#06080e'};
const HERO_POSES=['idle','idle1','idle2','idle3','walk0','walk1','walk2','walk3','walk4','walk5','dash','combo1_w','combo1','combo2_w','combo2','combo3_w','combo3','vital_w','vital','mutilation_w','mutilation','authority_w','authority','summon','hurt'];
const WINDUP_POSES=new Set(['combo1','combo2','combo3','vital','mutilation','authority']);
function heroPose(pose){
 const P={bob:0,lean:0,crouch:0,twist:0,tail:1,feet:{L:[-3.6,-.6,0],R:[3.6,.9,0]},hands:{L:[-8.3,1.5,17.5],R:[8.3,1.5,17.5]},blades:{L:[-.18,.55,-.82],R:[.18,.55,-.82]},orb:null};
 const k=Number(pose.replace(/\D/g,'')||0);
 if(pose.startsWith('idle')){const b=[0,.45,.9,.45][k];P.bob=b;P.hands.L[2]+=b*.6;P.hands.R[2]+=b*.6;P.tail=1+b}
 else if(pose.startsWith('walk')){const ph=k/6*Math.PI*2,s=Math.sin(ph),c=Math.cos(ph);
  P.lean=2.8;P.bob=1.3*Math.abs(c)-.5;P.tail=4+1.6*Math.sin(ph*2);
  P.feet.L=[-3.3,7*s,3.6*Math.max(0,c)];P.feet.R=[3.3,-7*s,3.6*Math.max(0,-c)];
  P.hands.L=[-7.6,-6*s+1,20.5+1.5*Math.max(0,-s)];P.hands.R=[7.6,6*s+1,20.5+1.5*Math.max(0,s)];
  P.blades.L=[-.1,-.55,-.8];P.blades.R=[.1,-.55,-.8]}
 else if(pose==='dash'){Object.assign(P,{lean:6,crouch:3,tail:10});P.feet.L=[-3,-9,2.5];P.feet.R=[3,5.5,3.5];P.hands.L=[-6.5,-8.5,20];P.hands.R=[6.5,-7.5,22];P.blades.L=[-.15,-.85,-.35];P.blades.R=[.15,-.85,-.3]}
 else if(pose==='combo1_w'){Object.assign(P,{twist:-.6,lean:1});P.hands.R=[9.5,-4,28];P.blades.R=[.3,-.4,.86];P.hands.L=[-7,4,20];P.feet.R=[3.6,2.5,0]}
 else if(pose==='combo1'){Object.assign(P,{twist:.55,lean:3.5,tail:4});P.hands.R=[1,12.5,24];P.blades.R=[-.75,.62,.1];P.hands.L=[-8,-2,19];P.feet.R=[3.6,5.5,0];P.feet.L=[-3.6,-4,0]}
 else if(pose==='combo2_w'){Object.assign(P,{twist:.6,lean:1});P.hands.L=[-2.5,3.5,28];P.blades.L=[.55,.2,.8];P.hands.R=[8,-3,20]}
 else if(pose==='combo2'){Object.assign(P,{twist:-.6,lean:3.5,tail:4});P.hands.L=[-10,9.5,23];P.blades.L=[-.55,.83,.05];P.hands.R=[8,-4,20];P.feet.L=[-3.6,5.5,0];P.feet.R=[3.6,-4,0]}
 else if(pose==='combo3_w'){Object.assign(P,{bob:1,lean:-1});P.hands.L=[-5,6,32];P.hands.R=[5,6,32];P.blades.L=[-.45,.35,.82];P.blades.R=[.45,.35,.82]}
 else if(pose==='combo3'){Object.assign(P,{crouch:4,lean:5.5,tail:7});P.hands.L=[-7,10.5,15];P.hands.R=[7,10.5,15];P.blades.L=[-.35,.6,-.7];P.blades.R=[.35,.6,-.7];P.feet.L=[-5,-5,0];P.feet.R=[5,6,0]}
 else if(pose==='vital_w'){Object.assign(P,{crouch:2.5,lean:-1});P.hands.R=[7,-7,24];P.blades.R=[0,.97,.2];P.hands.L=[-7,6,24];P.feet.R=[3.6,3,0];P.feet.L=[-3.6,-3,0]}
 else if(pose==='vital'){Object.assign(P,{crouch:3,lean:7.5,tail:9});P.hands.R=[2.5,16.5,26];P.blades.R=[0,1,.05];P.hands.L=[-7,-6,21];P.feet.R=[3.6,9,1];P.feet.L=[-3.6,-7.5,0]}
 else if(pose==='mutilation_w'){Object.assign(P,{lean:1,bob:.5});P.hands.L=[-6,5,31];P.hands.R=[6,5,31];P.blades.L=[-.5,.3,.8];P.blades.R=[.5,.3,.8]}
 else if(pose==='mutilation'){Object.assign(P,{twist:.3,lean:4.5,crouch:2,tail:6});P.hands.L=[3,10.5,20];P.hands.R=[-3,10.5,23];P.blades.L=[.72,.6,-.3];P.blades.R=[-.72,.6,.3];P.feet.R=[3.6,5,0];P.feet.L=[-3.6,-4,0]}
 else if(pose==='authority_w'){Object.assign(P,{bob:1,lean:-1,orb:'blue'});P.hands.R=[5,3,45];P.hands.L=[-6,5,27]}
 else if(pose==='authority'){Object.assign(P,{lean:4.5,crouch:2,tail:6,orb:'blue'});P.hands.R=[3,12.5,27];P.hands.L=[-3,12.5,27];P.feet.R=[3.6,5,0];P.feet.L=[-3.6,-4,0]}
 else if(pose==='summon'){Object.assign(P,{bob:.5,orb:'purple'});P.hands.R=[6,4,43];P.hands.L=[-9,3,22]}
 else if(pose==='hurt'){Object.assign(P,{lean:-3.5,crouch:1,tail:3});P.hands.L=[-9.5,-2,24];P.hands.R=[9.5,-2,24];P.feet.L=[-4,-3,0];P.feet.R=[4,1,0]}
 return P;
}
function makeHeroFrame(dir,pose){
 const g=new PixelGrid(64,64),C=HERO,P=heroPose(pose),a=dir*Math.PI/4,Fx=Math.cos(a),Fy=Math.sin(a),Rx=-Fy,Ry=Fx;
 const proj=(r,f,h)=>[32+r*Rx+f*Fx,59-h+(r*Ry+f*Fy)*.45,r*Ry+f*Fy];
 const hipH=19-P.crouch+P.bob*.4,ct=Math.cos(P.twist),st=Math.sin(P.twist);
 // Upper body transform: twist around the spine, lean proportional to height, breathing bob.
 const U=(r,f,h)=>{const rr=r*ct-f*st,ff=r*st+f*ct;return proj(rr,ff+P.lean*Math.max(0,h-19)/15,h-19+hipH+P.bob*Math.max(0,h-19)/15)};
 const parts=[],add=(depth,fn)=>parts.push({depth,fn}),avg=pts=>pts.reduce((s,p)=>s+p[2],0)/pts.length;
 // Legs with two-bone IK; the knee always bends forward along the facing.
 for(const side of ['L','R']){const s=side==='L'?-1:1,hip=[s*3.3,0,hipH],ft=[...P.feet[side]];ft[2]+=1.6;
  let dx=ft[0]-hip[0],df=ft[1]-hip[1],dh=ft[2]-hip[2],d=Math.hypot(dx,df,dh),L=9.7;if(d>2*L){const k=2*L/d;dx*=k;df*=k;dh*=k;d=2*L}
  const bend=Math.sqrt(Math.max(0,L*L-d*d/4)),knee=[hip[0]+dx/2,hip[1]+df/2+bend,hip[2]+dh/2],foot=[hip[0]+dx,hip[1]+df,hip[2]+dh];
  const ph=proj(...hip),pk=proj(...knee),pf=proj(...foot),heel=proj(foot[0],foot[1]-1.2,foot[2]-1.2),toe=proj(foot[0],foot[1]+3.4,foot[2]-1.3);
  add(avg([ph,pk,pf])-.2,()=>{g.capsule(ph[0],ph[1],pk[0],pk[1],2.6,C.pants);g.capsule(pk[0],pk[1],pf[0],pf[1],2.2,C.pants);g.capsule(heel[0],heel[1],toe[0],toe[1],2,C.boot);g.capsule(pf[0],pf[1],heel[0],heel[1]-1,2,C.boot)})}
 // Torso, belt and the long coat (back shell + two front panels leave a readable opening).
 const ring=(rx,rf,h,n=10)=>Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2;return U(Math.cos(t)*rx,Math.sin(t)*rf,h)});
 const torso=[...ring(5,2.8,20),...ring(6.4,2.8,31)];add(0,()=>{g.hull(torso,C.shirt);const b=[...ring(5.4,3,20.5),...ring(5.4,3,22.2)];g.hull(b,C.belt);const bk=U(0,3.1,21.4);if(Fy>-.3)g.rect(bk[0]-1,bk[1]-1,2,2,C.buckle)});
 const hemH=6+P.tail*.45,back=[U(-7.5,0,32),U(7.5,0,32),U(-7.5,-2.6,32),U(7.5,-2.6,32),U(0,-3,32),U(-6.8,0,21),U(6.8,0,21),U(-6.8,-3,21),U(6.8,-3,21),U(-8.4,0,8),U(8.4,0,8),U(-8.7,-3.5-P.tail*.5,hemH),U(8.7,-3.5-P.tail*.5,hemH),U(0,-4.6-P.tail,hemH-1)];
 add(avg(back)-.6,()=>{g.hull(back,C.coat);if(Fy<-.2){const a1=U(0,-3.2,31),a2=U(0,-4.4-P.tail,hemH);g.line(a1[0],a1[1],a2[0],a2[1],C.coatD);const s1=U(-4,-3,30),s2=U(4,-3,30);g.line(s1[0],s1[1],s2[0],s2[1],C.coatD)}
  const h1=U(-8.6,-3.5-P.tail*.5,hemH),h2=U(0,-4.6-P.tail,hemH-1),h3=U(8.6,-3.5-P.tail*.5,hemH);g.line(h1[0],h1[1]+1,h2[0],h2[1]+1,C.trim);g.line(h2[0],h2[1]+1,h3[0],h3[1]+1,C.trim)});
 for(const s of [-1,1]){const pts=[U(s*1.8,3,32),U(s*7.5,2.2,32),U(s*7.5,0,32),U(s*1.6,3.3,21),U(s*6.8,3,21),U(s*6.8,0,21),U(s*2.6,3.6,10),U(s*8.4,3,9),U(s*8.4,0,8)];
  add(avg(pts)+.4,()=>{g.hull(pts,C.coat);const e1=U(s*1.8,3.1,32),e2=U(s*2.6,3.7,10);if(Fy>.15)g.line(e1[0],e1[1],e2[0],e2[1],C.trim);const m1=U(s*2.6,3.6,10),m2=U(s*8.4,3,9);g.line(m1[0],m1[1],m2[0],m2[1],C.trim)})}
 // Arms (sleeves, gloves) and the twin daggers / energy orbs.
 for(const side of ['L','R']){const s=side==='L'?-1:1,sh=U(s*7,0,30.5),hand=P.hands[side],hp=proj(...hand),sr=[s*7*ct,s*7*st];
  const mid=[(sr[0]+hand[0])/2,(sr[1]+hand[1])/2,(30.5+hand[2])/2],dd=Math.hypot(hand[0]-sr[0],hand[1]-sr[1],hand[2]-30.5),bend=Math.sqrt(Math.max(0,57-dd*dd/4)),el=proj(mid[0]+s*bend*.55,mid[1]-bend*.45,mid[2]-bend*.55);
  const bl=P.blades[side],tip=proj(hand[0]+bl[0]*11.5,hand[1]+bl[1]*11.5,hand[2]+bl[2]*11.5),gb=proj(hand[0]-bl[0]*2.6,hand[1]-bl[1]*2.6,hand[2]-bl[2]*2.6),gd=proj(hand[0]+bl[0]*1.4,hand[1]+bl[1]*1.4,hand[2]+bl[2]*1.4);
  add(avg([sh,el,hp])+.3,()=>{g.capsule(sh[0],sh[1],el[0],el[1],2.5,C.sleeve);g.capsule(el[0],el[1],hp[0],hp[1],2.1,C.sleeve);g.disc(hp[0],hp[1],1.8,1.8,C.glove);
   if(P.orb){const oc=P.orb==='purple'?['#7d2fd0','#d9b5ff']:['#1fb6e8','#e8ffff'];g.disc(hp[0],hp[1]-1,2.8,2.8,oc[0]);g.disc(hp[0],hp[1]-1,1.5,1.5,oc[1])}
   else{g.capsule(gb[0],gb[1],hp[0],hp[1],.9,C.grip);g.disc(gd[0],gd[1],1.4,1.2,C.guard);g.capsule(gd[0],gd[1],tip[0],tip[1],1,C.bladeE);g.line(gd[0],gd[1],tip[0],tip[1],C.blade)}})}
 // Neck, collar and head; hair mass sits behind the face so the facing reads at a glance.
 const neck0=U(0,0,31),neck1=U(0,.6,35),hc=U(0,.9,39.6);
 add(.5,()=>{g.capsule(neck0[0],neck0[1],neck1[0],neck1[1],1.9,C.skin);g.hull([...ring(4.4,2.7,31.4,8),...ring(4,2.4,34.6,8)],C.coat);const c1=U(-3.6,1.6,34.6),c2=U(3.6,1.6,34.6);if(Fy>-.3)g.line(c1[0],c1[1],c2[0],c2[1],C.trim);
  const [hx,hy]=hc,fsx=Fx,fsy=Fy*.45,face=Fy>-.5,sp=(dr,df,dh)=>[hx+dr*Rx+df*Fx,hy-dh+(dr*Ry+df*Fy)*.45];
  const spike=(tip)=>{const t=sp(...tip),r=sp(tip[0]*.45,tip[1]*.45,tip[2]*.45),vx=t[0]-r[0],vy=t[1]-r[1],l=Math.hypot(vx,vy)||1,nx=-vy/l*2,ny=vx/l*2;g.poly([[r[0]+nx,r[1]+ny],[r[0]-nx,r[1]-ny],t],C.hair)};
  const spikes=[[0,-1,9.6],[-3.6,-2,8.6],[3.6,-2,8.6],[0,-5.6,6.6],[-4.6,-4.6,5],[4.6,-4.6,5],[-6.6,-1,4],[6.6,-1,4],[0,-7.2,2],[-3,-6.6,.8],[3,-6.6,.8],[-2.6,4.8,6],[1.6,5.6,5.4],[4.2,4,6.4],[-5,2.6,6]];
  for(const s of spikes)if(s[1]<-2)spike(s);
  g.disc(hx-fsx*1.3,hy-.7-fsy*1.3,6.3,6.1,C.hair);
  if(face){g.disc(hx+fsx*1.8,hy+.9+fsy*1.8,4.5+Math.abs(Fy)*.4,5,C.skin);if(Math.abs(Fx)>.6)g.rect(hx+Fx*6-.5,hy+1.2,1,2,C.skin)}
  else g.disc(hx,hy+4.2,2.4,1.3,C.skinD);
  g.disc(hx-fsx*.7,hy-2.8,5.9,3.4,C.hair);for(const s of spikes)if(s[1]>=-2)spike(s);
  if(face){for(const s of [-1,1]){const n=Fy*.85+s*Ry*.5;if(n<.05)continue;const e=sp(s*2.2,5.6,-.4);g.rect(e[0]-1,e[1],2,1,C.eye);g.set(e[0]-1,e[1]+1,C.eyeG);g.rect(e[0]-1,e[1]-1.2,2,1,C.hair)}
   if(Fy>.3){const m=sp(0,5.8,-3.3);g.set(m[0],m[1],C.skinD)}}});
 parts.sort((p,q)=>p.depth-q.depth);for(const p of parts)p.fn();
 return g.finish(HERO_LIGHT,HERO_DARK);
}
// Monster and NPC rigs (side view, facing right; flipped at draw time). Every type has
// idle, a 4-frame locomotion cycle, an attack wind-up and a strike pose.
const MONSTER_POSES=['idle0','idle1','move0','move1','move2','move3','windup','strike'];
const shadeHex=(hex,f)=>{const n=parseInt(hex.slice(1,7),16),r=n>>16,g=n>>8&255,b=n&255,t=f>0?255:0,a=Math.abs(f),m=v=>Math.round(v+(t-v)*a).toString(16).padStart(2,'0');return '#'+m(r)+m(g)+m(b)};
function finishAuto(g,glow=[]){const light={},dark={},skip=new Set(glow);for(const c of new Set(g.px))if(c&&!skip.has(c)){light[c]=shadeHex(c,.28);dark[c]=shadeHex(c,-.32)}return g.finish(light,dark)}
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
function makeMonsterFrame(art,pose,k=1){
 const g=new PixelGrid(Math.ceil(art.w*k),Math.ceil(art.h*k));
 if(art.rig==='q')drawQuadruped(g,pose,art,k);else if(art.rig==='s')drawSpider(g,pose,art,k);else drawHumanoid(g,pose,art,k);
 finishAuto(g,[art.eye,'#ffffff',art.bladeCol,art.orb,art.metal]);
 return {img:g.toCanvas(1),w:g.w,h:g.h,ax:g.w/2,ay:Math.round(art.gy*k)};
}
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
 }
 lazy(obj,key,build){Object.defineProperty(obj,key,{enumerable:true,configurable:true,get(){const v=build();Object.defineProperty(obj,key,{value:v,enumerable:true});return v}})}
 set(art,k){const o={};for(const p of MONSTER_POSES)this.lazy(o,p,()=>makeMonsterFrame(art,p,k));return o}
 monster(key,pose){return (this.monsters[key]||this.monsters.goblin)[pose]}
}
// Visual state is intentionally separate from combat timing and hitboxes.
class PlayerAnimation{
 constructor(sprites){this.sprites=sprites;this.action=null;this.remaining=0;this.duration=0;this.actionAngle=0;this.moveAngle=Math.PI/2;this.walkTime=0;this.idleTime=0;this.effects=[];this.ghostClock=0}
 direction(angle){return ((Math.round(angle/(Math.PI/4))%8)+8)%8}
 play(name,p,duration,angle=p.angle){this.action=name;this.remaining=duration;this.duration=duration;this.actionAngle=angle;if(!p.moving)this.moveAngle=angle}
 effect(type,p,angle=p.angle,variant=0){const duration={authority:.6,summon:.75,vital:.34,mutilation:.24,impact:.22,combo:variant===3?.34:.26}[type]||.25;this.effects.push({type,x:p.x,y:p.y,angle,variant,remaining:duration,duration})}
 update(dt,p){
  if(this.remaining>0)this.remaining=Math.max(0,this.remaining-dt);
  if(p.moving){this.walkTime+=dt;this.idleTime=0;if(Number.isFinite(p.moveAngle))this.moveAngle=p.moveAngle}else this.idleTime+=dt;
  if(p.dashTime>0){this.ghostClock-=dt;if(this.ghostClock<=0){this.ghostClock=.04;this.effects.push({type:'ghost',x:p.x,y:p.y,angle:Math.atan2(p.dashY,p.dashX),remaining:.22,duration:.22})}}else this.ghostClock=0;
  for(const fx of this.effects)fx.remaining-=dt;this.effects=this.effects.filter(fx=>fx.remaining>0);
 }
 pose(p){const active=this.remaining>0;if(active){const prog=1-this.remaining/this.duration;return WINDUP_POSES.has(this.action)&&prog<.3?this.action+'_w':this.action}
  if(p.hurtTime>0)return 'hurt';if(p.moving)return `walk${Math.floor(this.walkTime*12)%6}`;const k=Math.floor(this.idleTime*2.6)%4;return k?`idle${k}`:'idle'}
 frame(p){return this.sprites.playerFrames[`${this.direction(this.remaining>0?this.actionAngle:this.moveAngle)}:${this.pose(p)}`]}
 // After-images are separate cyan echoes behind the hero; the hero itself is always drawn fully opaque.
 drawGhosts(c){for(const fx of this.effects)if(fx.type==='ghost'){const k=fx.remaining/fx.duration;c.save();c.globalAlpha=.32*k;c.globalCompositeOperation='lighter';c.drawImage(this.sprites.playerFrames[`${this.direction(fx.angle)}:dash`],Math.round(fx.x-32),Math.round(fx.y-50),64,64);c.restore()}}
 draw(c){for(const fx of this.effects){if(fx.type==='ghost')continue;const t=1-fx.remaining/fx.duration,fade=Math.sin(Math.PI*Math.min(1,t*1.15));c.save();c.translate(fx.x,fx.y-14);if(fx.type!=='impact'&&fx.type!=='summon')c.rotate(fx.angle);c.globalCompositeOperation='lighter';c.lineCap='round';
  if(fx.type==='combo'){
   const dir=fx.variant===2?-1:1,sweep=fx.variant===3?2.6:1.9,head=-sweep/2+sweep*Math.min(1,t*1.6),R=fx.variant===3?74:64;
   for(let i=0;i<10;i++){const a0=head-.1*(i+1),a1=head-.1*i;c.globalAlpha=fade*(1-i/10);c.strokeStyle=i<2?'#f2ffff':'#3fd6ff';c.lineWidth=(12-i)*(1-t*.6);c.beginPath();c.arc(0,0,R-i*1.2,a0*dir,a1*dir,dir<0);c.stroke()}
   c.globalAlpha=fade*.5;c.strokeStyle='#1a8cff';c.lineWidth=3;c.beginPath();c.arc(0,0,R+8,(head-.9)*dir,head*dir,dir<0);c.stroke();
   if(fx.variant===3){c.globalAlpha=fade;c.strokeStyle='#bff8ff';c.lineWidth=4;for(const s of [-1,1]){c.beginPath();c.moveTo(20,-34*s*(1-t));c.lineTo(95,34*s*(1-t));c.stroke()}c.globalAlpha=fade*.6;c.beginPath();c.arc(70,0,10+40*t,0,Math.PI*2);c.stroke()}
  }else if(fx.type==='vital'){
   c.globalAlpha=fade;c.strokeStyle='#e6ffff';c.lineWidth=7*(1-t)+1;c.beginPath();c.moveTo(-20,0);c.lineTo(110+60*t,0);c.stroke();c.strokeStyle='#00d5ff';c.lineWidth=2;
   for(let i=0;i<6;i++){const y=(i-2.5)*7*(.4+t);c.globalAlpha=fade*(.4+i%2*.4);c.beginPath();c.moveTo(-10+i*9,y);c.lineTo(80+i*12+40*t,y*.5);c.stroke()}
   c.globalAlpha=fade;c.fillStyle='#ffffff';c.beginPath();c.arc(115+60*t,0,6*(1-t)+2,0,Math.PI*2);c.fill();
  }else if(fx.type==='mutilation'){
   c.globalAlpha=fade;for(let i=0;i<3;i++){const r=((fx.variant*37+i*61)%100)/100-.5;c.save();c.rotate(r*1.6+(fx.variant%2?.5:-.5));c.strokeStyle=i===1?'#f1ffff':'#6ce7ff';c.lineWidth=5-i;c.beginPath();c.moveTo(25,-36+i*6);c.lineTo(85,34-i*6);c.stroke();c.restore()}
  }else if(fx.type==='authority'){
   c.rotate(-fx.angle);c.globalAlpha=fade;c.strokeStyle='#a6f7ff';c.lineWidth=8*(1-t)+1;c.beginPath();c.ellipse(0,14,22+150*t,(22+150*t)*.55,0,0,Math.PI*2);c.stroke();c.strokeStyle='#248bdf';c.lineWidth=3;c.beginPath();c.ellipse(0,14,10+120*t,(10+120*t)*.55,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<12;i++){const a=i*Math.PI/6+t;c.strokeStyle='#aefaff';c.lineWidth=2;c.beginPath();c.moveTo(Math.cos(a)*40*t,14+Math.sin(a)*22*t);c.lineTo(Math.cos(a)*150*t,14+Math.sin(a)*82*t);c.stroke()}
  }else if(fx.type==='summon'){
   c.globalAlpha=fade;c.strokeStyle='#c785ff';c.lineWidth=3;c.beginPath();c.ellipse(0,24,25+45*t,10+18*t,0,0,Math.PI*2);c.stroke();c.strokeStyle='#7e22ce';c.beginPath();c.ellipse(0,24,18+30*t,6+10*t,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<10;i++){const a=i*Math.PI/5+t*2;c.fillStyle='#dca8ff';c.fillRect(Math.cos(a)*45*t,Math.sin(a)*18*t+24-40*t*(i%3)/2,3,6)}
  }else if(fx.type==='impact'){
   c.globalAlpha=fade;c.fillStyle=fx.variant?'#ffe490':'#d8ffff';c.strokeStyle=fx.variant?'#ffb347':'#4fdcff';c.lineWidth=2;const s=(fx.variant?26:18)*(.4+t);
   c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4+fx.angle,r=i%2?s*.35:s;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.beginPath();c.arc(0,0,s*1.3,0,Math.PI*2);c.stroke();
  }c.restore();}}
}
class ParticleSystem{
 constructor(){this.p=[]}
 burst(x,y,color,n=10,o={}){const sp=o.speed||110,spread=o.spread??Math.PI*2;for(let i=0;i<n;i++){const a=o.angle!==undefined?o.angle+rand(-spread/2,spread/2):rand(0,Math.PI*2),v=rand(sp*.35,sp),life=rand(.25,.7)*(o.life||1);this.p.push({kind:o.kind||(i%3?'sq':'streak'),x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(o.lift||0),life,max:life,color,size:o.size||rand(2,4),g:o.gravity||0,drag:o.drag??2.2})}}
 ring(x,y,color,r=60,life=.35,width=3){this.p.push({kind:'ring',x,y,vx:0,vy:0,r,life,max:life,color,size:width,g:0,drag:0})}
 update(dt){this.p=this.p.filter(p=>(p.life-=dt)>0);for(const p of this.p){const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}if(this.p.length>900)this.p.splice(0,this.p.length-900)}
 draw(c){c.save();c.globalCompositeOperation='lighter';for(const p of this.p){const k=p.life/p.max;c.globalAlpha=Math.min(1,k*1.6);c.fillStyle=p.color;c.strokeStyle=p.color;
  if(p.kind==='ring'){c.lineWidth=p.size*k+.5;c.beginPath();c.ellipse(p.x,p.y,p.r*(1-k)+4,(p.r*(1-k)+4)*.6,0,0,Math.PI*2);c.stroke()}
  else if(p.kind==='streak'){c.lineWidth=p.size*.7;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.05,p.y-p.vy*.05);c.stroke()}
  else c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size*(.5+k*.5),p.size*(.5+k*.5))}c.restore()}
}
class SaveSystem{static save(g){try{localStorage.setItem('shadow-protocol-save',JSON.stringify({player:g.player.data(),army:g.army,quest:g.quest,questDone:g.questDone,questDate:g.questDate,unlocked:g.unlocked}))}catch(e){console.warn('Não foi possível salvar:',e)}}static load(){try{return JSON.parse(localStorage.getItem('shadow-protocol-save'))}catch{return null}}}
class Player{constructor(data={}){Object.assign(this,{x:HUB.spawn.x,y:HUB.spawn.y,level:1,xp:0,gold:250,points:0,stats:{FOR:5,AGI:5,VIT:5,INT:5,PER:5},weapon:0,owned:[0],hppots:3,mppots:3,hp:225,mp:125},data);this.owned=Array.isArray(this.owned)?this.owned:[0,this.weapon];if(!this.owned.includes(this.weapon))this.owned.push(this.weapon);this.x=HUB.spawn.x;this.y=HUB.spawn.y;this.cool=0;this.dashCd=0;this.slash=0;this.dashTime=0;this.invuln=0;this.stealth=0;this.angle=0;this.combo=0;this.hurtTime=0;this.slow=0}get maxhp(){return 100+this.stats.VIT*25}get maxmp(){return 50+this.stats.INT*15}get rank(){return ['E','D','C','B','A','S'][Math.min(5,Math.floor(this.level/10))]}data(){let {level,xp,gold,points,stats,weapon,owned,hppots,mppots,hp,mp}=this;return {level,xp,gold,points,stats,weapon,owned,hppots,mppots,hp,mp}}}
// ---------------------------------------------------------------------------------------------
// City hub: the original association lobby sits in the middle of a modern Seoul-like district.
// Lobby drawing keeps its own local coordinates and is translated by (HUB.ox, HUB.oy).
const HUB={w:4200,h:3000,ox:1200,oy:900};
HUB.spawn={x:HUB.ox+900,y:HUB.oy+790};HUB.merchant={x:HUB.ox+310,y:HUB.oy+620};HUB.healer={x:HUB.ox+1490,y:HUB.oy+620};
const seeded=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
const CITY=(()=>{
 const roads=[{x:0,y:700,w:4200,h:160,main:true},{x:0,y:2140,w:4200,h:160,main:true},{x:0,y:250,w:4200,h:120},{x:1000,y:0,w:160,h:2740,main:true},{x:3040,y:0,w:160,h:2740,main:true},{x:430,y:0,w:100,h:700},{x:430,y:2300,w:100,h:440},{x:3700,y:0,w:100,h:2740}];
 const B=(x,y,w,h,type,name,color)=>({x,y,w,h,type,name,color,roof:Math.min(Math.round(h*.38),95)});
 const buildings=[
  B(20,20,390,210,'apartment','GANGNAM RESIDENCE','#5d6b78'),B(550,20,430,210,'tower','HUNTER NET','#2c3e55'),B(1180,20,520,210,'guild','AHJIN GUILD','#1d1a2e'),
  B(1740,20,720,210,'tower','SEOUL MEDIA TOWER','#32465c'),B(2500,20,520,210,'guild','WHITE TIGER GUILD','#d8dde2'),B(3220,20,460,210,'apartment','HANGANG APTS','#6f6458'),B(3820,20,360,210,'guild','FIEND GUILD','#3a1f26'),
  B(20,390,190,290,'shop','24/7 MART','#3d7f5a'),B(220,390,190,290,'shop','CAFÉ GATE','#7a5236'),B(550,390,430,290,'hospital','HUNTER MEDICAL','#dfe7ea'),
  B(1180,400,340,270,'guild','KNIGHTS GUILD','#4a3a2a'),B(2680,400,340,270,'guild','HUNTERS GUILD','#20304a'),
  B(3220,390,145,290,'shop','RAMEN','#a8423a'),B(3375,390,145,290,'shop','PC BANG','#3a3f8a'),B(3530,390,150,290,'shop','ARMAS & EQUIP','#4a5560'),
  B(3220,880,460,600,'tower','HUNTER MALL','#3a4c5e'),B(3220,1520,460,600,'apartment','SAMSEONG APTS','#7a6d60'),B(3820,880,360,600,'tower','GATE RESEARCH LAB','#2d3a40'),
  B(20,2320,390,400,'apartment','YEOUIDO APTS','#66707a'),B(550,2320,430,400,'hospital','HUNTER ACADEMY','#c8c2b0'),B(3220,2320,460,400,'shop','MERCADO NOTURNO','#5a3a5a'),B(3820,2320,360,400,'apartment','RIVERSIDE','#5f6f7a'),
 ];
 const parks=[{x:0,y:860,w:1000,h:1280,kind:'park'},{x:1560,y:380,w:1100,h:310,kind:'plaza'},{x:3820,y:390,w:360,h:290,kind:'parking'},{x:3820,y:1520,w:360,h:600,kind:'construction'},{x:1160,y:2300,w:1880,h:440,kind:'square'}];
 const spawnAreas=[{x:1640,y:430,w:940,h:220},{x:90,y:930,w:860,h:1140},{x:3850,y:430,w:300,h:220},{x:3860,y:1580,w:280,h:480},{x:1220,y:2350,w:1760,h:340},{x:150,y:740,w:3900,h:80},{x:150,y:2180,w:3900,h:80},{x:1040,y:120,w:80,h:2500},{x:3080,y:120,w:80,h:2500},{x:HUB.ox+560,y:HUB.oy+560,w:680,h:300}];
 const lobbySolids=[[540,50,720,272],[205,360,210,205],[1385,360,210,205],[838,648,124,62]].map(([x,y,w,h])=>({x:x+HUB.ox,y:y+HUB.oy,w,h}));
 const solids=[...buildings.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h-6})),...lobbySolids,{x:0,y:2800,w:4200,h:200},{x:420,y:1240,w:200,h:120}];
 const rnd=seeded(7),trees=[],lamps=[],cars=[],benches=[];
 for(let i=0;i<60;i++){const x=40+rnd()*920,y=900+rnd()*1200;if(!(x>380&&x<680&&y>1200&&y<1400)&&!(Math.abs(y-1500)<40)&&!(Math.abs(x-500)<40))trees.push({x,y,s:.8+rnd()*.5})}
 for(let x=1600;x<2650;x+=150){trees.push({x,y:410,s:.8});trees.push({x,y:665,s:.8})}
 for(let x=60;x<4200;x+=260){if(x<990||x>1170)lamps.push({x,y:690});lamps.push({x,y:2310});lamps.push({x:x+130,y:868})}
 for(let y=60;y<2740;y+=240){lamps.push({x:992,y});lamps.push({x:3208,y})}
 for(let x=80;x<4150;x+=210)lamps.push({x,y:2752});
 for(let i=0;i<8;i++)cars.push({x:3870+(i%4)*72,y:450+Math.floor(i/4)*120,color:['#c94a4a','#e0e0e0','#2a4a8a','#1a1a1a','#d8b04a','#4a7a5a','#8a8a96','#3a3a6a'][i],dir:1,parked:true});
 for(const [x,y] of [[1700,520],[1900,520],[2300,520],[2500,520],[300,1450],[700,1450],[1500,2420],[2700,2420]])benches.push({x,y});
 const traffic=[];for(let i=0;i<10;i++)traffic.push({lane:i%4,t:rnd()*4200,speed:120+rnd()*90,color:['#c94a4a','#e8e8e8','#2a5aa8','#1d1d1d','#e0b84a','#4a8a6a'][i%6]});
 return {roads,buildings,parks,spawnAreas,solids,trees,lamps,cars,benches,traffic};
})();
const LANES=[{y:745,dir:1},{y:815,dir:-1},{y:2185,dir:1},{y:2255,dir:-1}];

class WorldMap{constructor(kind='hub',rank='E'){this.kind=kind;this.rank=rank;this.w=kind==='hub'?HUB.w:1800;this.h=kind==='hub'?HUB.h:1200;this.tile=this.makeTile();if(kind==='hub'){this.solids=CITY.solids;this.buildingCache=new Map();this.walkers=this.makeWalkers()}}
makeTile(){
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
makeWalkers(){const r=seeded(11),looks=['suit','red','white','green','hunter','suit','white','red'],w=[];
 for(let i=0;i<18;i++){const lane=[[690,60,990],[690,1170,3030],[868,1170,3030],[2310,60,4150],[2148,1170,3030],[2752,60,4150]][i%6];w.push({x:lane[1]+r()*(lane[2]-lane[1]),y:lane[0]+(r()-.5)*8,x1:lane[1],x2:lane[2],dir:r()<.5?-1:1,speed:28+r()*26,look:'npc_'+looks[i%looks.length],phase:r()*4})}
 for(let i=0;i<8;i++){const x=1240+r()*1700,y=2380+r()*300;w.push({x,y,x1:x-120,x2:x+120,dir:1,speed:20+r()*15,look:'npc_'+looks[i%looks.length],phase:r()*4})}
 return w}
blocked(x,y,rad=12){if(!this.solids)return false;for(const s of this.solids)if(x+rad>s.x&&x-rad<s.x+s.w&&y+rad*.6>s.y&&y-rad*.6<s.y+s.h)return true;return false}
update(dt){if(this.kind!=='hub')return;for(const w of this.walkers){w.x+=w.dir*w.speed*dt;if(w.x<w.x1||w.x>w.x2){w.dir*=-1;w.x=clamp(w.x,w.x1,w.x2)}w.phase+=dt}for(const t of CITY.traffic){const l=LANES[t.lane];t.t=(t.t+t.speed*dt*l.dir+4400)%4400}}
draw(c,time,view){let pat=c.createPattern(this.tile,'repeat');if(this.kind==='hub'){this.city(c,time,view||{x:0,y:0,w:this.w,h:this.h})}else{c.fillStyle='#101820';c.fillRect(0,0,this.w,this.h);c.fillStyle=pat;for(const r of this.walkable)c.fillRect(r.x,r.y,r.w,r.h);if(this.wallLayer)c.drawImage(this.wallLayer,0,0);else this.drawDungeonWalls(c);this.dungeon(c,time)};c.strokeStyle='#111a20';c.lineWidth=40;c.strokeRect(0,0,this.w,this.h)}
visible(v,x,y,w,h,m=60){return x+w>v.x-m&&x<v.x+v.w+m&&y+h>v.y-m&&y<v.y+v.h+m}
city(c,t,v){
 // Ground: paved blocks, parks and plazas.
 c.fillStyle=c.createPattern(this.tile,'repeat');c.fillRect(v.x-40,v.y-40,v.w+80,v.h+80);
 for(const p of CITY.parks)if(this.visible(v,p.x,p.y,p.w,p.h))this.parkArea(c,p,t);
 for(const r of CITY.roads)if(this.visible(v,r.x,r.y,r.w,r.h,30))this.road(c,r);
 for(const r of CITY.roads)if(this.visible(v,r.x,r.y,r.w,r.h,30))this.roadMarks(c,r);
 this.crosswalks(c,v);
 // River promenade and Han river.
 if(v.y+v.h>2700){c.fillStyle='#3b4646';c.fillRect(0,2740,4200,62);c.fillStyle='#55625f';for(let x=0;x<4200;x+=32)c.fillRect(x,2742,30,4);const g=c.createLinearGradient(0,2800,0,3000);g.addColorStop(0,'#0e3348');g.addColorStop(1,'#061a28');c.fillStyle=g;c.fillRect(0,2800,4200,200);
  c.fillStyle='#8fb6c4';for(let i=0;i<70;i++){const x=(i*173+t*(12+i%5*4))%4300-50,y=2820+(i*37)%170;c.globalAlpha=.25+.2*Math.sin(t*2+i);c.fillRect(x,y,14+i%3*8,2)}c.globalAlpha=1;c.fillStyle='#22302f';c.fillRect(0,2796,4200,6);for(let x=10;x<4200;x+=40){c.fillStyle='#65737a';c.fillRect(x,2784,3,14)}c.fillStyle='#7d8b90';c.fillRect(0,2784,4200,2);
  // distant bridge
  c.fillStyle='#1d2a33';c.fillRect(2600,2860,1300,18);for(let x=2620;x<3900;x+=90){c.fillRect(x,2878,10,60)}c.fillStyle='#ffd27a';for(let x=2610;x<3900;x+=45){c.globalAlpha=.6+.4*Math.sin(t*3+x);c.fillRect(x,2856,3,3)}c.globalAlpha=1}
 this.lobby(c,t,v);
 for(const car of CITY.cars)if(this.visible(v,car.x-30,car.y-20,60,40))this.car(c,car.x,car.y,car.color,1,true);
 for(const tr of CITY.traffic){const l=LANES[tr.lane],x=tr.t-100;if(this.visible(v,x-40,l.y-20,80,40))this.car(c,x,l.y,tr.color,l.dir,false,t)}
 for(const b of CITY.benches)if(this.visible(v,b.x-30,b.y-20,60,40)){c.fillStyle='#2a2320';c.fillRect(b.x-26,b.y+6,4,8);c.fillRect(b.x+22,b.y+6,4,8);c.fillStyle='#7a5a3a';c.fillRect(b.x-28,b.y,56,7);c.fillStyle='#5a3f28';c.fillRect(b.x-28,b.y-8,56,5)}
 const list=CITY.buildings.filter(b=>this.visible(v,b.x,b.y,b.w,b.h)).sort((a,b)=>a.y-b.y);for(const b of list){c.drawImage(this.buildingImage(b),b.x,b.y);this.buildingLive(c,b,t)}
 for(const tr of CITY.trees)if(this.visible(v,tr.x-40,tr.y-80,80,100))this.tree(c,tr.x,tr.y,tr.s);
 for(const w of this.walkers)if(this.visible(v,w.x-20,w.y-50,40,60)){const pose='move'+(Math.floor(w.phase*6)%4),f=game.sprites.monster(w.look,pose);c.save();c.translate(Math.round(w.x),Math.round(w.y));c.fillStyle='#0006';c.beginPath();c.ellipse(0,2,11,4,0,0,7);c.fill();if(w.dir<0)c.scale(-1,1);c.drawImage(f.img,-f.ax,-f.ay);c.restore()}
 for(const l of CITY.lamps)if(this.visible(v,l.x-20,l.y-60,40,70))this.lamp(c,l.x,l.y,t);
}
parkArea(c,p,t){
 if(p.kind==='park'){c.fillStyle='#24382a';c.fillRect(p.x,p.y,p.w,p.h);const r=seeded(3);c.fillStyle='#2e4733';for(let i=0;i<260;i++)c.fillRect(p.x+r()*p.w,p.y+r()*p.h,6+r()*10,3);c.fillStyle='#4a5a4a';
  c.fillRect(p.x,p.y+620,p.w,44);c.fillRect(p.x+480,p.y,44,p.h);c.fillStyle='#5f6f5e';c.fillRect(p.x,p.y+624,p.w,3);c.fillRect(p.x+484,p.y,3,p.h);
  // pond with reflections (solid)
  c.fillStyle='#1b3a3e';c.beginPath();c.ellipse(520,1300,110,64,0,0,7);c.fill();c.fillStyle='#2f6a76';c.beginPath();c.ellipse(520,1300,100,56,0,0,7);c.fill();c.fillStyle='#9fd4dc';for(let i=0;i<8;i++){c.globalAlpha=.3+.3*Math.sin(t*2+i);c.fillRect(450+i*18,1280+(i%3)*14,10,2)}c.globalAlpha=1;
  // basketball court
  c.fillStyle='#8a4a3a';c.fillRect(120,1720,280,170);c.strokeStyle='#e8e0d0';c.lineWidth=2;c.strokeRect(130,1730,260,150);c.beginPath();c.moveTo(260,1730);c.lineTo(260,1880);c.stroke();c.beginPath();c.arc(260,1805,24,0,7);c.stroke();
  c.fillStyle='#d8d0c0';c.font='bold 12px monospace';c.fillText('PARQUE YEOUIDO',600,1010)}
 else if(p.kind==='plaza'||p.kind==='square'){c.fillStyle=p.kind==='square'?'#3a3f42':'#33403e';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#58646266';c.lineWidth=1;for(let x=p.x;x<p.x+p.w;x+=40){c.beginPath();c.moveTo(x,p.y);c.lineTo(x,p.y+p.h);c.stroke()}for(let y=p.y;y<p.y+p.h;y+=40){c.beginPath();c.moveTo(p.x,y);c.lineTo(p.x+p.w,y);c.stroke()}
  if(p.kind==='square'){const cx=2100,cy=2520;c.fillStyle='#262b2e';c.beginPath();c.ellipse(cx,cy+40,90,30,0,0,7);c.fill();c.fillStyle='#5a6266';c.fillRect(cx-26,cy-20,52,60);c.fillStyle='#7c868a';c.fillRect(cx-30,cy-26,60,8);c.fillStyle='#2a3236';c.fillRect(cx-12,cy-90,24,66);c.fillStyle='#3d4a50';c.beginPath();c.moveTo(cx-18,cy-90);c.lineTo(cx,cy-120);c.lineTo(cx+18,cy-90);c.fill();c.fillStyle='#57e3ff';c.shadowColor='#57e3ff';c.shadowBlur=14;c.fillRect(cx-2,cy-112,4,80);c.shadowBlur=0;c.fillStyle='#d6e0e2';c.font='bold 11px monospace';c.textAlign='center';c.fillText('MEMORIAL DOS CAÇADORES',cx,cy+64);c.textAlign='left'}}
 else if(p.kind==='parking'){c.fillStyle='#2a2e31';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#d8d8c8';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(p.x+30+i*72,p.y+20);c.lineTo(p.x+30+i*72,p.y+90);c.stroke();c.beginPath();c.moveTo(p.x+30+i*72,p.y+140);c.lineTo(p.x+30+i*72,p.y+210);c.stroke()}c.fillStyle='#e8e8d8';c.font='bold 16px monospace';c.fillText('P',p.x+p.w-30,p.y+p.h-20)}
 else if(p.kind==='construction'){c.fillStyle='#4a4234';c.fillRect(p.x,p.y,p.w,p.h);const r=seeded(5);c.fillStyle='#5a5040';for(let i=0;i<80;i++)c.fillRect(p.x+r()*p.w,p.y+r()*p.h,8+r()*14,4);for(let x=p.x;x<p.x+p.w;x+=24){c.fillStyle=(x/24|0)%2?'#e8b830':'#1a1a1a';c.fillRect(x,p.y+4,24,8);c.fillRect(x,p.y+p.h-12,24,8)}
  c.fillStyle='#d8a020';c.fillRect(p.x+250,p.y+60,10,260);c.fillRect(p.x+120,p.y+60,240,8);c.fillStyle='#1a1a1a';c.fillRect(p.x+130,p.y+68,2,90);c.fillStyle='#6a6a6a';c.fillRect(p.x+60,p.y+380,90,50);c.fillStyle='#8a8a8a';c.fillRect(p.x+180,p.y+420,110,30);c.fillStyle='#e8e0d0';c.font='bold 11px monospace';c.fillText('ZONA DE GATE INTERDITADA',p.x+40,p.y+30)}
}
road(c,r){c.fillStyle='#1d2124';c.fillRect(r.x,r.y,r.w,r.h);c.fillStyle='#24292c';const hor=r.w>r.h;if(hor){c.fillRect(r.x,r.y+18,r.w,r.h-36)}else c.fillRect(r.x+18,r.y,r.w-36,r.h);
 c.fillStyle='#4f5654';if(hor){c.fillRect(r.x,r.y,r.w,16);c.fillRect(r.x,r.y+r.h-16,r.w,16);c.fillStyle='#6c7472';c.fillRect(r.x,r.y+15,r.w,2);c.fillRect(r.x,r.y+r.h-17,r.w,2);c.fillStyle='#424947';for(let x=r.x;x<r.x+r.w;x+=24){c.fillRect(x,r.y,1,15);c.fillRect(x,r.y+r.h-15,1,15)}}
 else{c.fillRect(r.x,r.y,16,r.h);c.fillRect(r.x+r.w-16,r.y,16,r.h);c.fillStyle='#6c7472';c.fillRect(r.x+15,r.y,2,r.h);c.fillRect(r.x+r.w-17,r.y,2,r.h);c.fillStyle='#424947';for(let y=r.y;y<r.y+r.h;y+=24){c.fillRect(r.x,y,15,1);c.fillRect(r.x+r.w-15,y,15,1)}}}
roadMarks(c,r){const hor=r.w>r.h;c.fillStyle=r.main?'#d9b648':'#c8c8c0';
 const skip=(p)=>CITY.roads.some(o=>o!==r&&(hor?(o.w<o.h&&p>o.x-10&&p<o.x+o.w+10&&r.y>=o.y-5&&r.y<=o.y+o.h):(o.w>o.h&&p>o.y-10&&p<o.y+o.h+10&&r.x>=o.x-5&&r.x<=o.x+o.w)));
 if(hor){for(let x=r.x;x<r.x+r.w;x+=40)if(!skip(x)){if(r.main){c.fillRect(x,r.y+r.h/2-3,26,2);c.fillRect(x,r.y+r.h/2+1,26,2)}else c.fillRect(x,r.y+r.h/2-1,22,2)}}
 else{for(let y=r.y;y<r.y+r.h;y+=40)if(!skip(y)){if(r.main){c.fillRect(r.x+r.w/2-3,y,2,26);c.fillRect(r.x+r.w/2+1,y,2,26)}else c.fillRect(r.x+r.w/2-1,y,2,22)}}}
crosswalks(c,v){c.fillStyle='#d6d6cc';for(const h of CITY.roads.filter(r=>r.w>r.h))for(const vr of CITY.roads.filter(r=>r.h>r.w)){if(vr.y>h.y+h.h||vr.y+vr.h<h.y)continue;if(!this.visible(v,vr.x-40,h.y-40,vr.w+80,h.h+80))continue;
 for(let y=h.y+20;y<h.y+h.h-20;y+=12){c.fillRect(vr.x-28,y,22,7);c.fillRect(vr.x+vr.w+6,y,22,7)}for(let x=vr.x+20;x<vr.x+vr.w-20;x+=12){if(h.y>30)c.fillRect(x,h.y-28,7,22);c.fillRect(x,h.y+h.h+6,7,22)}
 // traffic light
 c.fillStyle='#15191b';c.fillRect(vr.x-10,h.y-46,4,40);c.fillRect(vr.x-16,h.y-58,16,14);c.fillStyle=(Math.floor(game.time/4)%2)?'#3dff8a':'#ff4a4a';c.fillRect(vr.x-12,h.y-54,6,6);c.fillStyle='#d6d6cc'}}
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
 this.npc(c,800,395,'','npc_officer',t);this.npc(c,1000,395,'','npc_officer',t,-1);
 const looks=['npc_hunter','npc_suit','npc_red','npc_hunter','npc_white','npc_green','npc_hunter'];for(let i=0;i<7;i++)this.npc(c,350+i*175,1030,'',looks[i],t,i%2?-1:1)}
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
npc(c,x,y,label,look='npc_white',t=0,dir=1){const f=game.sprites.monster(look,Math.floor((t+x*.01)*1.5)%2?'idle1':'idle0');c.save();c.translate(x,y+14);c.fillStyle='#0006';c.beginPath();c.ellipse(0,0,13,5,0,0,7);c.fill();if(dir<0)c.scale(-1,1);c.drawImage(f.img,-f.ax,-f.ay);c.restore();if(label){c.font='bold 11px monospace';c.textAlign='center';c.fillStyle='#061019cc';const w=label.length*7+12;c.fillRect(x-w/2,y-62,w,15);c.fillStyle='#b9e1e4';c.fillText(label,x,y-51);c.textAlign='left'}}
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
}
}
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
// ---------------------------------------------------------------------------------------------
// Dynamic gates: blue/red rifts open at random spots of the city, live for a limited time and
// collapse. They are announced with a notice, a minimap blip, an off-screen arrow and a timer.
const RANKS=['E','D','C','B','A','S'];
const GATE_AREAS=['PRAÇA NORTE','PARQUE YEOUIDO','ESTACIONAMENTO LESTE','CANTEIRO INTERDITADO','PRAÇA DO MEMORIAL','AVENIDA GANGNAM','AVENIDA DO RIO','RUA OESTE','RUA LESTE','PRAÇA DA ASSOCIAÇÃO'];
const GATE_RULES={maxActive:4,firstDelay:1.5,interval:[16,28],life:[75,130],forming:2.6,warnAt:20};
class GateSystem{
 constructor(){this.list=[];this.timer=GATE_RULES.firstDelay;this.nextId=1}
 update(dt,g){
  for(const gate of this.list){if(gate.forming>0){gate.forming-=dt;if(gate.forming<=0)g.particles.ring(gate.x,gate.y+40,gate.red?'#ff4b57':'#3bcfff',120,.6,4);continue}gate.life-=dt;gate.age+=dt;
   if(gate.life<=GATE_RULES.warnAt&&!gate.warned){gate.warned=true;g.message(`GATE RANK ${gate.rank} INSTÁVEL · ${Math.ceil(gate.life)}s`)}}
  const closed=this.list.filter(gate=>gate.life<=0);for(const gate of closed){g.particles.burst(gate.x,gate.y,gate.red?'#ff4b57':'#3bcfff',40,{speed:220});g.particles.ring(gate.x,gate.y+30,gate.red?'#ff4b57':'#3bcfff',160,.5,5);g.message(`GATE RANK ${gate.rank} SE FECHOU`)}
  this.list=this.list.filter(gate=>gate.life>0);
  this.timer-=dt;if(!this.list.length&&this.timer>4)this.timer=4;
  if(this.timer<=0){this.timer=rand(...GATE_RULES.interval);if(this.list.length<GATE_RULES.maxActive)this.spawn(g)}
 }
 point(g){const areas=CITY.spawnAreas,total=areas.reduce((s,a)=>s+a.w*a.h,0);
  for(let i=0;i<40;i++){let pick=Math.random()*total,idx=0;for(;idx<areas.length-1;idx++){pick-=areas[idx].w*areas[idx].h;if(pick<=0)break}const a=areas[idx],x=a.x+Math.random()*a.w,y=a.y+Math.random()*a.h;
   if(g.world.blocked&&g.world.blocked(x,y,70))continue;if(this.list.some(o=>dist(o,{x,y})<320))continue;if(g.player&&dist(g.player,{x,y})<180)continue;return {x,y,district:GATE_AREAS[idx]}}
  return null}
 spawn(g,opts={}){const pt=opts.x!==undefined?{x:opts.x,y:opts.y,district:opts.district||'CIDADE'}:this.point(g);if(!pt)return null;
  const top=clamp(g.unlocked||0,0,5),red=opts.red??Math.random()<.25,rankIdx=opts.rank!==undefined?RANKS.indexOf(opts.rank):Math.floor(Math.random()*(top+1));
  const life=rand(...GATE_RULES.life),gate={id:this.nextId++,x:Math.round(pt.x),y:Math.round(pt.y),district:pt.district,red,rank:RANKS[clamp(rankIdx,0,5)],life,maxLife:life,forming:opts.instant?0:GATE_RULES.forming,age:0};
  this.list.push(gate);if(!opts.silent){g.message(`⚠ GATE ${red?'VERMELHO':'AZUL'} RANK ${gate.rank} DETECTADO · ${gate.district}`);g.sound.play('alert')}return gate}
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
  Object.assign(this,{x,y,type,level,boss,def,name:def.name,art:def.art,radius:def.radius,speed:def.speed,aggro:def.aggro,red,dmgMult:red?1.3:1,cool:0,flash:0,stun:0,facing:1,state:'chase',stateT:0,current:null,animT:rand(0,4)});
  this.maxhp=Math.round((def.hp[0]+def.hp[1]*level)*(red?1.35:1));this.hp=this.maxhp;
  this.attacks=def.attacks.map(a=>({...a,cd:rand(.4,1.4)+(a.kind==='super'?6:0)}));
 }
 get range(){return Math.max(...this.attacks.map(a=>a.range))}
 damageOf(a){return Math.round((a.damage[0]+a.damage[1]*this.level)*this.dmgMult)}
 update(dt,g){
  this.flash-=dt;this.stun-=dt;this.animT+=dt;for(const a of this.attacks)a.cd-=dt;
  if(this.bleed>0){this.bleed-=dt;this.bleedTick=(this.bleedTick||0)-dt;if(this.bleedTick<=0){this.bleedTick=.5;g.hit(this,3+g.player.stats.INT,false);if(!g.enemies.includes(this))return}}
  if(this.stun>0){if(this.state!=='chase'){this.state='chase';this.current=null}return}
  let p=g.player,near=g.soldiers.filter(s=>s.state!=='REGENERATE'&&dist(this,s)<dist(this,p)).sort((a,b)=>dist(this,a)-dist(this,b))[0];p=near||p;
  const d=dist(this,p),ang=Math.atan2(p.y-this.y,p.x-this.x);
  if(this.state==='windup'){this.stateT-=dt;if(this.stateT>this.current.windup*.45){this.aim=ang;this.aimPos={x:p.x,y:p.y}}if(this.stateT<=0)g.enemyStrike(this,this.current);return}
  if(this.state==='lunge'){const a=this.current;g.moveActor(this,Math.cos(this.aim)*a.dash*dt,Math.sin(this.aim)*a.dash*dt);if(Math.random()<.6)g.particles.burst(this.x,this.y,this.red?'#ff4b57':'#c9d6e0',1,{speed:40});
   for(const tg of g.enemyTargets())if(!this.lungeHit.has(tg)&&dist(this,tg)<this.radius+18){this.lungeHit.add(tg);g.enemyDamage(tg,this.damageOf(a),a,this)}
   this.stateT-=dt;if(this.stateT<=0){this.state='recover';this.stateT=a.recover}return}
  if(this.state==='recover'){this.stateT-=dt;if(this.stateT<=0){this.state='chase';this.current=null}return}
  if(Math.abs(p.x-this.x)>4)this.facing=p.x>this.x?1:-1;
  if(d>this.aggro)return;
  const ready=this.attacks.filter(a=>a.cd<=0&&d<=a.range&&d>=(a.minRange||0)).sort((a,b)=>b.id-a.id)[0];
  if(ready){this.state='windup';this.current=ready;this.stateT=ready.windup;this.aim=ang;this.aimPos={x:p.x,y:p.y};ready.cd=ready.cooldown;for(const o of this.attacks)o.cd=Math.max(o.cd,.35);
   if(ready.kind==='super'){g.message(`⚠ ${this.name} · ${ready.name}`);g.shake(7,.5);g.sound.play('alert')}return}
  const keep=this.attacks[0].range*.72;if(d>keep){const sp=this.speed*(this.slowed>0?.6:1);g.moveActor(this,Math.cos(ang)*sp*dt,Math.sin(ang)*sp*dt)}
 }
}
class Boss extends Enemy{constructor(x,y,type,level,name,opts={}){super(x,y,type,level,true,opts);if(name)this.name=name}}
class ShadowSoldier{
 constructor(data,i){this.data=data;this.x=game.player.x+i*20;this.y=game.player.y+50;this.cool=0;this.maxhp=90+game.player.level*8;this.hp=this.maxhp;this.state='FOLLOW';this.regen=0;this.facing=1;this.animT=rand(0,4)}
 update(dt,g,i){
  this.cool-=dt;this.animT+=dt;
  if(this.state==='REGENERATE'){this.regen-=dt;if(this.regen<=0&&g.player.mp>=15){g.player.mp-=15;this.hp=this.maxhp;this.state='FOLLOW';g.particles.burst(this.x,this.y,'#a855f7',20)}return}
  let target=g.enemies.filter(e=>dist(e,this)<260).sort((a,b)=>dist(a,this)-dist(b,this))[0];
  let goal=target||{x:g.player.x+Math.cos(i*2)*55,y:g.player.y+Math.sin(i*2)*55},d=dist(this,goal),reach=target?48+target.radius*.6:0;this.state=target?(d<reach?'ATTACK':'ENGAGE'):'FOLLOW';
  if(Math.abs(goal.x-this.x)>3)this.facing=goal.x>this.x?1:-1;
  if(d>(target?reach*.8:8))g.moveActor(this,(goal.x-this.x)/d*120*dt,(goal.y-this.y)/d*120*dt);
  if(target&&d<reach&&this.cool<=0){this.cool=.8;this.swing=.22;g.particles.burst(target.x,target.y-14,'#b96eff',6,{speed:120});g.hit(target,10+g.player.level*2,false,this)}
 }
 hurt(amount,g){if(this.state==='REGENERATE')return;this.hp-=amount;if(this.hp<=0){this.state='REGENERATE';this.regen=4;g.particles.burst(this.x,this.y,'#a855f7',20)}}
}
const GATE_MONSTERS=idx=>idx<2?['goblin','wolf','spider']:idx<4?['orc','orc','demon']:idx===4?['bear','wolf']:['demon','orc'];
const fmtTime=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
function attackLine(a,level){const kind={melee:'Corpo a corpo',slam:'Área',projectile:'Projétil',lunge:'Investida',super:'Super'}[a.kind];return `<div class="atk-row ${a.kind==='super'?'super':''}"><b>ATQ ${a.id}</b><span>${a.name.replace('SUPER · ','')}</span><small>${kind} · alcance ${a.radius||a.range} · dano ${Math.round(a.damage[0]+a.damage[1]*level)}</small></div>`}
function monsterCard(def,level,boss=false){return `<div class="beast ${boss?'boss':''}"><div class="beast-head"><b>${def.name}</b><span>${def.size}</span></div><div class="beast-stats"><span>HP <b>${Math.round(def.hp[0]+def.hp[1]*level)}</b></span><span>VEL <b>${def.speed}</b></span><span>ALCANCE <b>${Math.max(...def.attacks.map(a=>a.range))}</b></span></div>${def.attacks.map(a=>attackLine(a,level)).join('')}</div>`}
class UIManager{static open(type){game.panel=type;let p=game.player,box=$('#modal');box.classList.remove('hidden');let content='';
 if(type==='status'){content=`<p>Nível ${p.level} · Rank ${p.rank} · EXP ${p.xp}/${p.level*100} <br>Pontos disponíveis: <b>${p.points}</b></p>`+Object.entries(p.stats).map(([k,v])=>`<div class="stat-row"><b>${k}</b><span>${v} <button class="action" data-stat="${k}">+</button></span></div>`).join('')+`<p class="muted">ATQ ${Math.floor(10+p.stats.FOR*3.5+weapons[p.weapon].damage)} · DEF ${Math.min(60,p.stats.VIT*.8).toFixed(1)}% · CRÍTICO ${(5+p.stats.PER*1.2).toFixed(1)}% · SOMBRAS ${2+Math.floor(p.stats.INT/4)}</p>`}
 else if(type==='inventory'){content=`<p>OURO: <b>${p.gold} G</b></p>${p.owned.map(i=>`<div class="item-row"><b>⚔ ${weapons[i].name}</b><span>ATQ +${weapons[i].damage} <button class="action" data-equip="${i}">${i===p.weapon?'EQUIPADA':'EQUIPAR'}</button></span></div>`).join('')}<div class="item-row"><b>♥ Poção de vida</b><span>${p.hppots} unidades</span></div><div class="item-row"><b>♦ Poção de mana</b><span>${p.mppots} unidades</span></div>`}
 else if(type==='army'){content=`<p>SOLDADOS: ${game.army.length} / ${2+Math.floor(p.stats.INT/4)} · ${game.summoned?'INVOCADOS':'NA RESERVA'}</p>`+(game.army.length?game.army.map((s,i)=>`<div class="item-row"><b>♟ ${s.name}</b><span>${s.rank||'Normal'} · Nv. ${p.level} · ${s.kills||0} abates <button class="action" data-dismiss="${i}">DISPENSAR</button></span></div>`).join(''):'<p class="muted">Derrote inimigos e pressione E perto de seus corpos para extrair sombras.</p>')+`<button class="action" data-do="summon">INVOCAR / GUARDAR [R]</button>`}
 else if(type==='shop'){content=game.world.kind!=='hub'?'<p>A loja está disponível apenas na cidade.</p>':`<p>OURO: ${p.gold} G</p>`+weapons.map((w,i)=>`<div class="item-row"><b>${w.name} <small>ATQ +${w.damage}</small></b><button class="action" data-buy="${i}">${i===p.weapon?'EQUIPADA':p.owned.includes(i)?'EQUIPAR':w.price+' G'}</button></div>`).join('')+`<button class="action" data-potion="hp">POÇÃO HP · 40 G</button><button class="action" data-potion="mp">POÇÃO MP · 40 G</button>`}
 else if(type==='gate'){const gate=game.selectedGate;if(!gate||!game.gates.list.includes(gate)){content='<p>Este gate já se fechou.</p>'}else{const idx=RANKS.indexOf(gate.rank),boss=BOSS_TYPES[gate.rank],types=[...new Set(GATE_MONSTERS(idx))];
  content=`<div class="gate-card ${gate.red?'red':'blue'}"><div class="gate-rank">${gate.rank}</div><div><b>${gate.red?'GATE VERMELHO':'GATE AZUL'} · RANK ${gate.rank}</b><small>${gate.district} · FECHA EM <span id="gateTime">${fmtTime(gate.life)}</span></small><small>${gate.red?'Monstros +35% HP e +30% dano · recompensas x2':'Dificuldade padrão · recompensas x1'}</small></div></div>`+
  `<p class="muted">MONSTROS: ${types.map(t=>MONSTER_TYPES[t].name).join(' · ')} — CHEFE: <b>${boss.name}</b></p><button class="action wide" data-gate="${gate.rank}" data-red="${gate.red?1:0}">ENTRAR NO GATE</button>`}}
 else if(type==='bestiary'){const lv=1+Math.max(0,RANKS.indexOf(game.world.rank||'E'))*8;content=`<p class="muted">Atributos individuais por tipo (nível ${lv}). Ataque 3 (Super) é exclusivo dos chefes.</p><h2>MONSTROS</h2>`+Object.values(MONSTER_TYPES).map(d=>monsterCard(d,lv)).join('')+'<h2>CHEFES</h2>'+RANKS.map((r,i)=>monsterCard(BOSS_TYPES[r],3+i*8,true)).join('')}
 else if(type==='pause'){content='<p>O sistema está aguardando.</p><button class="action" data-do="resume">CONTINUAR</button><button class="action" data-do="save">SALVAR JOGO</button>'}
 else if(type==='dead'){content='<p>Você foi derrotado. O sistema lhe concedeu uma nova chance.</p><button class="action" data-do="revive">RETORNAR À ASSOCIAÇÃO</button>'}
 box.innerHTML=`<div class="modal-box"><div class="modal-title">◈ &nbsp; ${ {status:'STATUS',inventory:'INVENTÁRIO',army:'EXÉRCITO DAS SOMBRAS',shop:'LOJA DO SISTEMA',gate:'GATE DETECTADO',bestiary:'BESTIÁRIO DO SISTEMA',pause:'SISTEMA PAUSADO',dead:'VOCÊ FOI DERROTADO'}[type]} ${type==='dead'?'':'<button data-do="close">×</button>'}</div>${content}</div>`}
 static close(){game.panel=null;$('#modal').classList.add('hidden')}}
// HUD panels can be minimised individually ([−]/[+]) or all at once (H / HUD button).
// Collapsed state persists in localStorage so the screen stays as clean as the player left it.
class HudManager{
 static init(){try{this.state=JSON.parse(localStorage.getItem('shadow-protocol-hud'))||{}}catch{this.state={}}
  for(const el of document.querySelectorAll('[data-hud]'))this.apply(el.dataset.hud);this.applyClean();
  for(const b of document.querySelectorAll('[data-toggle]'))b.addEventListener('click',e=>{e.stopPropagation();this.toggle(b.dataset.toggle)});
  const all=document.querySelector('#hudToggle');if(all&&all.addEventListener)all.addEventListener('click',()=>this.toggleClean())}
 static apply(id){const el=document.querySelector(`[data-hud="${id}"]`);if(!el||!el.classList)return;const c=!!this.state[id];el.classList.toggle('collapsed',c);const b=el.querySelector&&el.querySelector(`[data-toggle="${id}"]`);if(b){b.textContent=c?'+':'−';b.setAttribute&&b.setAttribute('aria-label',(c?'Maximizar ':'Minimizar ')+id);b.title=c?'Maximizar':'Minimizar'}}
 static toggle(id){this.state[id]=!this.state[id];this.apply(id);this.save()}
 static applyClean(){const hud=document.querySelector('#hud');if(hud&&hud.classList)hud.classList.toggle('clean',!!this.state.clean);const b=document.querySelector('#hudToggle');if(b)b.textContent=this.state.clean?'◈ MOSTRAR HUD [H]':'◈ OCULTAR HUD [H]'}
 static toggleClean(){this.state.clean=!this.state.clean;this.applyClean();this.save()}
 static save(){try{localStorage.setItem('shadow-protocol-hud',JSON.stringify(this.state))}catch{}}
}
const weapons=[{name:'Adaga de Ferro',damage:5,price:0},{name:'Presa de Kasaka',damage:18,price:300},{name:'Adaga do Assassino',damage:35,price:700},{name:'Adaga do Rei Demônio',damage:65,price:1500}];
class GameEngine{constructor(){this.sprites=new ProceduralSprites();const portrait=$('#portraitCanvas').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.drawImage(this.sprites.playerFrames['2:idle'],14,4,36,45,0,0,80,100);this.sound=new SoundFX();this.particles=new ParticleSystem();this.input=new InputHandler();this.gates=new GateSystem();this.projectiles=[];this.hazards=[];this.impacts=[];this.shakeT=0;this.shakeMag=0;this.started=false;this.time=0;this.last=0;this.hudClock=0;this.camera={x:0,y:0};this.resize();window.addEventListener('resize',()=>this.resize());HudManager.init();requestAnimationFrame(t=>this.loop(t))}
resize(){canvas.width=innerWidth;canvas.height=innerHeight;ctx.imageSmoothingEnabled=false}
start(saved){this.player=new Player(saved?.player);this.animation=new PlayerAnimation(this.sprites);if(this.player.hp<=0){this.player.hp=this.player.maxhp;this.player.mp=this.player.maxmp}this.army=saved?.army||[];this.quest=saved?.quest||0;this.questDate=new Date().toLocaleDateString('en-CA');if(saved?.questDate!==this.questDate)this.quest=0;this.questDone=saved?.questDate===this.questDate&&(saved?.questDone||false);this.unlocked=saved?.unlocked||0;this.world=new WorldMap();this.gates=new GateSystem();this.projectiles=[];this.hazards=[];this.impacts=[];this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.pendingStrikes=[];this.panel=null;this.started=true;this.bossDefeated=false;this.chest=false;this.redGate=false;$('#start').classList.add('hidden');$('#hud').classList.remove('hidden');this.message('BEM-VINDO, JOGADOR');this.sound.play('alert');this.updateHUD()}
message(text){$('#notice').textContent=text;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>$('#notice').textContent='',3200)}
shake(mag,time=.25){this.shakeMag=Math.max(this.shakeMag,mag);this.shakeT=Math.max(this.shakeT,time)}
key(k){if(!this.started)return;if(k==='h'){HudManager.toggleClean();return}if(this.panel){if(this.panel==='dead')return;if(['escape','tab','c','i','v','b','n'].includes(k))UIManager.close();return}if(k==='c'||k==='tab')UIManager.open('status');else if(k==='i')UIManager.open('inventory');else if(k==='v')UIManager.open('army');else if(k==='b')UIManager.open('shop');else if(k==='n')UIManager.open('bestiary');else if(k==='escape')UIManager.open('pause');else if(k==='e')this.interact();else if(k==='r')this.toggleArmy();else if(k==='shift')this.dash();else if(k===' ')this.attack();else if(['1','2','3'].includes(k))this.skill(+k);else if(k==='q')this.potion('hp');else if(k==='f')this.potion('mp')}
enter(rank,red=false){UIManager.close();this.world=DungeonGenerator.create(rank);this.animation=new PlayerAnimation(this.sprites);this.player.x=300;this.player.y=600;this.bossDefeated=false;this.chest=false;this.redGate=!!red;this.pendingStrikes=[];this.projectiles=[];this.hazards=[];this.impacts=[];this.corpses=[];this.soldiers=[];this.summoned=false;let idx=Math.max(0,RANKS.indexOf(rank)),types=GATE_MONSTERS(idx);this.enemies=[];
 for(let i=0;i<16+idx*2+(red?4:0);i++){let room=this.world.rooms[[0,1,2,4,6,7,8][i%7]];this.enemies.push(new Enemy(rand(room.x+50,room.x+room.w-50),rand(room.y+50,room.y+room.h-50),types[i%types.length],1+idx*8,false,{red}))}
 this.enemies.push(new Boss(1500,600,rank,3+idx*8,BOSS_TYPES[rank].name,{red}));this.message(`${red?'GATE VERMELHO':'GATE'} RANK ${rank} · SUBJUGUE O CHEFE`);this.sound.play('alert')}
moveActor(actor,dx,dy){
 const hub=this.world.kind==='hub',rad=actor.radius?Math.min(actor.radius,22):12;
 const valid=(x,y)=>{if(x<30||y<30||x>this.world.w-30||y>this.world.h-30)return false;if(hub)return !this.world.blocked(x,y,rad);return [[-12,-12],[12,-12],[-12,12],[12,12]].every(([ox,oy])=>this.world.walkable.some(r=>x+ox>=r.x&&x+ox<=r.x+r.w&&y+oy>=r.y&&y+oy<=r.y+r.h))};
 // Small steps prevent high-speed dashes from tunneling through a wall.
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));for(let i=0;i<steps;i++){if(valid(actor.x+dx/steps,actor.y))actor.x+=dx/steps;if(valid(actor.x,actor.y+dy/steps))actor.y+=dy/steps}
}
returnHub(){this.world=new WorldMap();this.animation=new PlayerAnimation(this.sprites);this.pendingStrikes=[];this.projectiles=[];this.hazards=[];this.impacts=[];this.player.x=HUB.spawn.x;this.player.y=HUB.spawn.y;this.enemies=[];this.corpses=[];this.soldiers=[];this.summoned=false;this.bossDefeated=false;this.chest=false;this.redGate=false;UIManager.close();SaveSystem.save(this);this.message('ÁREA SEGURA · ASSOCIAÇÃO DOS CAÇADORES')}
interact(){let p=this.player;if(this.world.kind==='hub'){const gate=this.gates.nearest(p);if(gate){this.selectedGate=gate;UIManager.open('gate')}else if(dist(p,HUB.merchant)<100)UIManager.open('shop');else if(dist(p,HUB.healer)<100){p.hp=p.maxhp;p.mp=p.maxmp;this.message('HP E MP RESTAURADOS');this.sound.play('alert');this.particles.burst(p.x,p.y,'#5affb0',24,{speed:90,lift:60})}}
 else{let corpse=this.corpses.find(c=>dist(c,p)<75);if(corpse){corpse.tries++;let chance=Math.min(.9,.35+p.stats.INT*.02+(p.level-corpse.level)*.03);if(this.army.length>=2+Math.floor(p.stats.INT/4)){this.message('CAPACIDADE DE SOMBRAS ATINGIDA');return}this.animation.play('summon',p,.5);this.animation.effect('summon',corpse);this.particles.burst(corpse.x,corpse.y,'#bd59ff',30);this.sound.play('shadow');if(Math.random()<chance){this.army.push({name:corpse.name,rank:corpse.boss?'Comandante':'Normal',kills:0});this.corpses.splice(this.corpses.indexOf(corpse),1);this.message('EXTRAÇÃO DE SOMBRA BEM-SUCEDIDA!');SaveSystem.save(this)}else{this.message(`EXTRAÇÃO FALHOU · ${3-corpse.tries} TENTATIVAS`);if(corpse.tries>=3)this.corpses.splice(this.corpses.indexOf(corpse),1)}return}
  if(this.bossDefeated&&!this.chest&&dist(p,{x:1500,y:600})<90){this.chest=true;p.gold+=(200+this.world.rank.charCodeAt(0))*(this.redGate?2:1);this.unlocked=Math.min(5,Math.max(this.unlocked,RANKS.indexOf(this.world.rank)+1));this.message('BAÚ COLETADO! PORTAL DE SAÍDA ABERTO');SaveSystem.save(this)}else if(this.chest&&dist(p,{x:1560,y:650})<110)this.returnHub()}}
toggleArmy(){this.summoned=!this.summoned;this.soldiers=this.summoned?this.army.map((s,i)=>new ShadowSoldier(s,i)):[];this.message(this.summoned?'EXÉRCITO DAS SOMBRAS INVOCADO':'SOMBRAS GUARDADAS');this.animation.play('summon',this.player,.45);this.animation.effect('summon',this.player);this.sound.play('shadow')}
// Dash: short invulnerability and an ambush bonus window (stealth). The hero stays fully opaque.
dash(){if(!this.started||this.panel||this.player.dashCd>0)return;let p=this.player;p.dashTime=.18;p.invuln=.3;p.stealth=1.5;p.dashCd=Math.max(.5,1.3-p.stats.AGI*.01);let dx=(this.input.keys.d||this.input.keys.arrowright?1:0)-(this.input.keys.a||this.input.keys.arrowleft?1:0),dy=(this.input.keys.s||this.input.keys.arrowdown?1:0)-(this.input.keys.w||this.input.keys.arrowup?1:0);let n=Math.hypot(dx,dy);p.dashX=n?dx/n:Math.cos(p.angle);p.dashY=n?dy/n:Math.sin(p.angle);this.animation.play('dash',p,.18,Math.atan2(p.dashY,p.dashX));this.particles.ring(p.x,p.y+8,'#3fd6ff',50,.3,3);this.sound.play('dash')}
attack(mult=1,range=85,area=false,forceCrit=false,bypass=false,style='combo'){
 let p=this.player;if(!p||(!bypass&&p.cool>0)||this.panel)return;
 if(!bypass)p.cool=Math.max(.16,.36-p.stats.AGI*.005);
 let variant=0;
 if(style==='combo'){p.combo=p.comboWindow>0?(p.combo%3)+1:1;p.comboWindow=.85;variant=p.combo;this.animation.play(`combo${variant}`,p,variant===3?.3:.23)}
 else if(style==='mutilation'){variant=bypass?++p.multiVisual:0;this.animation.play('mutilation',p,.16)}
 else if(style==='vital')this.animation.play('vital',p,.3);
 else if(style==='authority')this.animation.play('authority',p,.5);
 this.animation.effect(style,p,p.angle,variant);this.sound.play('slash');
 const fx=p.x+Math.cos(p.angle)*50,fy=p.y-14+Math.sin(p.angle)*50;this.particles.burst(fx,fy,'#7ff0ff',variant===3?14:6,{angle:p.angle,spread:1.4,speed:220,life:.6});
 for(let e of [...this.enemies]){let d=dist(p,e),a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));if(d<range+e.radius*.6&&(area||Math.abs(diff)<1.15)){let crit=forceCrit||Math.random()<(5+p.stats.PER*1.2)/100;if(forceCrit)e.bleed=3;let damage=(10+p.stats.FOR*3.5+weapons[p.weapon].damage)*mult*(crit?1.75+p.stats.PER*.02:1)*(p.stealth>0?1.5:1)*(variant===3?1.25:1);this.hit(e,damage,crit,null,a);p.stealth=0}}
}
skill(n){let p=this.player,cost=[0,15,25,35][n];if(p.mp<cost||p.cool>0){this.message('MANA INSUFICIENTE OU HABILIDADE EM RECARGA');return}p.mp-=cost;if(n===1){this.moveActor(p,Math.cos(p.angle)*55,Math.sin(p.angle)*55);this.attack(1.3,100,false,true,false,'vital')}if(n===2){p.multiVisual=0;this.attack(.7,110,false,false,false,'mutilation');p.cool=Math.max(p.cool,.42);for(let i=1;i<5;i++)this.pendingStrikes.push({delay:i*.09})}if(n===3){this.attack(1.8,160,true,false,false,'authority');for(let e of this.enemies)if(dist(e,p)<160+e.radius*.5){e.stun=1.5;if(e.state!=='chase'){e.state='chase';e.current=null}let a=Math.atan2(e.y-p.y,e.x-p.x);this.moveActor(e,Math.cos(a)*40,Math.sin(a)*40)}this.particles.burst(p.x,p.y,'#71dfff',40,{speed:260});this.particles.ring(p.x,p.y+10,'#a6f7ff',170,.5,5);this.shake(6,.3)}}
hit(e,amount,crit,source=null,angle=null){e.hp-=amount;e.flash=.14;const a=angle??Math.atan2(e.y-this.player.y,e.x-this.player.x);
 this.particles.burst(e.x,e.y-16,crit?'#ffe490':'#79eaff',crit?22:10,{angle:a,spread:1.6,speed:crit?300:220});this.particles.burst(e.x,e.y-16,'#ffffff',4,{speed:140,size:2});this.impacts.push({x:e.x,y:e.y-18,angle:a,crit,t:.2,max:.2});
 if(crit)this.shake(4,.12);if(!e.boss&&e.state!=='lunge'){this.moveActor(e,Math.cos(a)*(crit?10:5),Math.sin(a)*(crit?10:5))}
 this.floats.push({x:e.x,y:e.y-40,text:(crit?'CRÍTICO! ':'')+Math.floor(amount),life:.9,color:crit?'#ffe16c':'#fff',size:crit?20:16});this.sound.play('hit');if(e.hp<=0){if(source){source.data.kills=(source.data.kills||0)+1}this.kill(e)}}
kill(e){let p=this.player,mult=this.redGate?2:1;this.enemies.splice(this.enemies.indexOf(e),1);this.corpses.push({x:e.x,y:e.y,life:12,tries:0,level:e.level,boss:e.boss,name:e.name});this.particles.burst(e.x,e.y-10,e.red?'#ff4b57':'#9fb4c8',18,{speed:160});p.gold+=(e.boss?150:rand(8,20)|0)*mult;p.xp+=(e.boss?120+e.level*10:20+e.level*4)*mult;this.quest++;if(this.quest>=15&&!this.questDone){p.points+=3;this.questDone=true;this.message('MISSÃO DIÁRIA COMPLETA · +3 PONTOS')}while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.points+=5;p.hp=p.maxhp;p.mp=p.maxmp;this.message(`LEVEL UP! NÍVEL ${p.level} · +5 PONTOS`)}if(e.boss){this.bossDefeated=true;this.hazards=[];this.projectiles=[];this.message('CHEFE DERROTADO · COLETE O BAÚ');this.particles.burst(e.x,e.y,'#ffb260',60,{speed:300});this.particles.ring(e.x,e.y,'#ffb260',220,.7,6);this.shake(10,.5)}SaveSystem.save(this)}
damagePlayer(n){let p=this.player;if(p.invuln>0)return false;p.hp-=n*(1-Math.min(.6,p.stats.VIT*.008));p.invuln=.4;p.hurtTime=.22;this.shake(5,.18);this.particles.burst(p.x,p.y-16,'#ff6579',14,{speed:180});this.floats.push({x:p.x,y:p.y-50,text:'-'+Math.round(n*(1-Math.min(.6,p.stats.VIT*.008))),life:.8,color:'#ff7d8c',size:15});this.sound.play('hit');if(p.hp<=0){p.hp=0;UIManager.open('dead')}return true}
potion(type){let p=this.player;if(type==='hp'&&p.hppots>0&&p.hp<p.maxhp){p.hppots--;p.hp=Math.min(p.maxhp,p.hp+p.maxhp*.5);this.message('POÇÃO DE VIDA UTILIZADA');this.particles.burst(p.x,p.y,'#ff6b7f',18,{speed:80,lift:60})}if(type==='mp'&&p.mppots>0&&p.mp<p.maxmp){p.mppots--;p.mp=Math.min(p.maxmp,p.mp+p.maxmp*.5);this.message('POÇÃO DE MANA UTILIZADA');this.particles.burst(p.x,p.y,'#4fd5ff',18,{speed:80,lift:60})}}
// ---- Enemy attacks ------------------------------------------------------------------------
enemyTargets(){return [this.player,...this.soldiers.filter(s=>s.state!=='REGENERATE')]}
enemyDamage(tg,amount,a,e){if(tg===this.player){if(this.damagePlayer(amount)){if(a.slow)tg.slow=Math.max(tg.slow||0,a.slow);if(a.poison)tg.poison=Math.max(tg.poison||0,a.poison)}}else tg.hurt(amount,this)}
enemyStrike(e,a){const dmg=e.damageOf(a),col=a.color||(e.red?'#ff4b57':'#ff8a6a');e.state='recover';e.stateT=a.recover;e.swing=.25;
 if(a.kind==='melee'){for(const tg of this.enemyTargets()){const d=dist(e,tg),ang=Math.atan2(tg.y-e.y,tg.x-e.x),diff=Math.abs(Math.atan2(Math.sin(ang-e.aim),Math.cos(ang-e.aim)));if(d<a.range+14&&diff<a.arc)this.enemyDamage(tg,dmg,a,e)}this.hazards.push({kind:'claw',x:e.x,y:e.y-14,angle:e.aim,r:a.range,arc:a.arc,t:.2,max:.2,color:e.boss?'#ff4b57':'#ffd2c8'});this.particles.burst(e.x+Math.cos(e.aim)*a.range*.6,e.y-14+Math.sin(e.aim)*a.range*.6,'#ffb3a8',6,{angle:e.aim,spread:1.2,speed:160})}
 else if(a.kind==='slam'){for(const tg of this.enemyTargets())if(dist(e,tg)<a.radius)this.enemyDamage(tg,dmg,a,e);this.particles.ring(e.x,e.y+8,'#ffcf8a',a.radius,.45,6);this.particles.burst(e.x,e.y,'#c9a46a',26,{speed:240});this.shake(7,.3)}
 else if(a.kind==='projectile'){const n=a.count||1;for(let i=0;i<n;i++){const ang=e.aim+(n>1?(i/(n-1)-.5)*a.spread*2:0);this.projectiles.push({x:e.x+Math.cos(ang)*e.radius,y:e.y-16+Math.sin(ang)*e.radius*.5,vx:Math.cos(ang)*a.speed,vy:Math.sin(ang)*a.speed,life:a.range/a.speed+.25,damage:dmg,color:a.color,size:a.size||6,atk:a,owner:e})}}
 else if(a.kind==='lunge'){e.state='lunge';e.stateT=a.dashTime;e.lungeHit=new Set();this.particles.ring(e.x,e.y+8,'#ffffff',60,.3,3)}
 else if(a.kind==='super'){const pat=a.pattern;this.shake(10,.6);this.particles.burst(e.x,e.y-20,col,50,{speed:320});
  if(pat==='nova'||pat==='both')for(let i=0;i<(a.rings||1);i++)this.hazards.push({kind:'nova',x:e.x,y:e.y,r:10,max:a.radius,speed:a.radius/.75,delay:i*.4,damage:dmg,hit:new Set(),color:col,atk:a,owner:e});
  if(pat==='rain'||pat==='both'){const c=e.aimPos||this.player;for(let i=0;i<(a.count||6);i++){const r=i?rand(60,200):0,an=rand(0,Math.PI*2);this.hazards.push({kind:'blast',x:c.x+Math.cos(an)*r,y:c.y+Math.sin(an)*r*.8,r:a.blast||70,delay:.85+i*.09,max:.85+i*.09,damage:dmg,color:col,atk:a,owner:e,boom:0})}}
  if(a.summon&&this.world.kind==='dungeon')for(let i=0;i<(a.summonCount||1);i++){const m=new Enemy(e.x+rand(-80,80),e.y+rand(-60,60),a.summon,Math.max(1,e.level-2),false,{red:e.red});this.enemies.push(m);this.particles.burst(m.x,m.y,'#a855f7',20)}}
}
updateCombatFX(dt){
 for(const pr of this.projectiles){pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.life-=dt;if(Math.random()<.7)this.particles.burst(pr.x,pr.y,pr.color,1,{speed:30,size:2,life:.5});
  if(this.world.kind==='dungeon'&&!this.world.walkable.some(r=>pr.x>=r.x&&pr.x<=r.x+r.w&&pr.y+16>=r.y&&pr.y+16<=r.y+r.h))pr.life=0;
  for(const tg of this.enemyTargets())if(pr.life>0&&Math.hypot(tg.x-pr.x,tg.y-16-pr.y)<pr.size+14){this.enemyDamage(tg,pr.damage,pr.atk,pr.owner);pr.life=0;this.particles.burst(pr.x,pr.y,pr.color,12,{speed:160})}}
 this.projectiles=this.projectiles.filter(pr=>pr.life>0);
 for(const h of this.hazards){
  if(h.kind==='claw'){h.t-=dt;continue}
  if(h.kind==='nova'){if(h.delay>0){h.delay-=dt;continue}h.r+=h.speed*dt;for(const tg of this.enemyTargets())if(!h.hit.has(tg)&&Math.abs(Math.hypot((tg.x-h.x),(tg.y-h.y)/.6)-h.r)<22){h.hit.add(tg);this.enemyDamage(tg,h.damage,h.atk,h.owner)}if(h.r>=h.max)h.done=true}
  if(h.kind==='blast'){if(h.delay>0){h.delay-=dt;if(h.delay<=0){for(const tg of this.enemyTargets())if(Math.hypot(tg.x-h.x,(tg.y-h.y)/.7)<h.r)this.enemyDamage(tg,h.damage,h.atk,h.owner);this.particles.burst(h.x,h.y,h.color,26,{speed:260,lift:80});this.particles.ring(h.x,h.y,h.color,h.r*1.3,.4,5);this.shake(4,.15)}}else{h.boom+=dt;if(h.boom>.25)h.done=true}}
 }
 this.hazards=this.hazards.filter(h=>!h.done&&!(h.kind==='claw'&&h.t<=0));
 for(const im of this.impacts)im.t-=dt;this.impacts=this.impacts.filter(im=>im.t>0);
}
update(dt){let p=this.player;this.time+=dt;if(this.panel){if(this.panel==='gate'&&this.selectedGate){const el=$('#gateTime');if(el)el.textContent=fmtTime(this.selectedGate.life)}return}let today=new Date().toLocaleDateString('en-CA');if(today!==this.questDate){this.questDate=today;this.quest=0;this.questDone=false;SaveSystem.save(this)}
 p.cool-=dt;p.dashCd-=dt;p.invuln-=dt;p.stealth-=dt;p.slash-=dt;p.hurtTime-=dt;p.slow=Math.max(0,(p.slow||0)-dt);p.comboWindow=(p.comboWindow||0)-dt;p.mp=Math.min(p.maxmp,p.mp+dt*1.2);
 if(p.poison>0){p.poison-=dt;p.poisonTick=(p.poisonTick||0)-dt;if(p.poisonTick<=0){p.poisonTick=.6;p.hp=Math.max(1,p.hp-(2+p.level*.4));this.particles.burst(p.x,p.y-20,'#7dff5a',4,{speed:40,lift:30})}}
 for(const strike of this.pendingStrikes)strike.delay-=dt;const due=this.pendingStrikes.filter(strike=>strike.delay<=0);this.pendingStrikes=this.pendingStrikes.filter(strike=>strike.delay>0);for(const strike of due)this.attack(.7,110,false,false,true,'mutilation');
 let keys=this.input.keys,dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),n=Math.hypot(dx,dy);
 if(p.dashTime>0){p.dashTime-=dt;dx=p.dashX;dy=p.dashY;n=1;this.particles.burst(p.x,p.y-14,'#27bfff',2,{angle:Math.atan2(-dy,-dx),spread:.6,speed:120,kind:'streak'})}
 let speed=p.dashTime>0?570:(140+p.stats.AGI*2.5)*(p.slow>0?.55:1);p.moving=!!n;if(n){p.moveAngle=Math.atan2(dy,dx);p.facing=dx||p.facing||1;this.moveActor(p,dx/n*speed*dt,dy/n*speed*dt)}
 let mx=this.input.mouse.x+this.camera.x,my=this.input.mouse.y+this.camera.y;if(this.input.mouse.x||this.input.mouse.y)p.angle=Math.atan2(my-p.y,mx-p.x);else if(n)p.angle=Math.atan2(dy,dx);
 this.animation.update(dt,p);if(this.input.mouse.down)this.attack();
 if(this.world.kind==='hub'){this.world.update(dt);this.gates.update(dt,this)}
 for(let e of [...this.enemies]){const x=e.x,y=e.y;e.update(dt,this);e.animMoving=Math.hypot(e.x-x,e.y-y)>.01;e.swing=Math.max(0,(e.swing||0)-dt)}
 for(let [i,s] of this.soldiers.entries()){const x=s.x,y=s.y;s.update(dt,this,i);s.animMoving=Math.hypot(s.x-x,s.y-y)>.01;s.swing=Math.max(0,(s.swing||0)-dt)}
 this.updateCombatFX(dt);this.corpses=this.corpses.filter(c=>(c.life-=dt)>0);this.particles.update(dt);this.floats=this.floats.filter(f=>(f.life-=dt)>0);for(let f of this.floats)f.y-=35*dt;this.shakeT-=dt;if(this.shakeT<=0)this.shakeMag=0;
 this.hudClock-=dt;this.updateHUD()}
district(p){if(p.x>HUB.ox&&p.x<HUB.ox+1800&&p.y>HUB.oy&&p.y<HUB.oy+1200)return 'HUNTERS ASSOCIATION';if(p.y>2740)return 'ORLA DO RIO HAN';for(const pk of CITY.parks)if(p.x>pk.x&&p.x<pk.x+pk.w&&p.y>pk.y&&p.y<pk.y+pk.h)return {park:'PARQUE YEOUIDO',plaza:'PRAÇA NORTE',parking:'ESTACIONAMENTO LESTE',construction:'CANTEIRO INTERDITADO',square:'PRAÇA DO MEMORIAL'}[pk.kind];return p.y<700?'DISTRITO DAS GUILDAS':p.x>3040?'DISTRITO COMERCIAL':p.x<1000?'GANGNAM OESTE':'CENTRO DE SEUL'}
updateHUD(){let p=this.player;$('#rank').textContent='RANK '+p.rank;$('#level').textContent='LV. '+String(p.level).padStart(2,'0');$('#hpbar').style.width=clamp(p.hp/p.maxhp*100,0,100)+'%';$('#mpbar').style.width=clamp(p.mp/p.maxmp*100,0,100)+'%';$('#hptext').textContent=`${Math.ceil(p.hp)}/${p.maxhp}`;$('#mptext').textContent=`${Math.ceil(p.mp)}/${p.maxmp}`;$('#hppots').textContent='HP ×'+p.hppots;$('#mppots').textContent='MP ×'+p.mppots;$('#questcount').textContent=Math.min(15,this.quest)+' / 15';$('#questfill').style.width=Math.min(100,this.quest/15*100)+'%';
 let hub=this.world.kind==='hub',zone=hub?this.district(p):'';$('#location').textContent=hub?zone:`DUNGEON · RANK ${this.world.rank}`;$('#locationSub').textContent=hub?(zone==='HUNTERS ASSOCIATION'?'SAFE ZONE · SEOUL':'CIDADE · SEOUL'):(this.redGate?'GATE VERMELHO · SEM SAÍDA':'SUBJUGUE O CHEFE');$('#zoneLabel').textContent=hub?zone:'DUNGEON RANK '+this.world.rank;
 let boss=this.enemies.find(e=>e.boss);$('#bossbar').classList.toggle('hidden',!boss||dist(p,boss)>520);if(boss){$('#bossname').textContent=boss.name;$('#bossfill').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';$('#bossskill').textContent=boss.state==='windup'?'⚠ '+boss.current.name:''}
 let hint='';if(hub){const gate=this.gates.nearest(p);if(gate)hint=`[ E ] ENTRAR NO GATE ${gate.red?'VERMELHO':'AZUL'} · RANK ${gate.rank}`;else if(dist(p,HUB.merchant)<100)hint='[ E ] FALAR COM MERCADOR';else if(dist(p,HUB.healer)<100)hint='[ E ] CURAR HP E MP'}else if(this.corpses.some(c=>dist(c,p)<75))hint='[ E ] ERGA-SE';else if(this.bossDefeated&&!this.chest&&dist(p,{x:1500,y:600})<90)hint='[ E ] ABRIR BAÚ';else if(this.chest&&dist(p,{x:1560,y:650})<110)hint='[ E ] RETORNAR À CIDADE';$('#interact').classList.toggle('hidden',!hint);$('#interact').textContent=hint;
 if(this.hudClock<=0){this.hudClock=.25;const list=hub?[...this.gates.list].sort((a,b)=>dist(a,p)-dist(b,p)):[];$('#gatecount').textContent=hub?String(list.length):'—';
  $('#gateList').innerHTML=!hub?'<p class="gate-empty">Rastreamento indisponível dentro da dungeon.</p>':list.length?list.map(g=>{const a=Math.atan2(g.y-p.y,g.x-p.x),arrow='→↘↓↙←↖↑↗'[((Math.round(a/(Math.PI/4))%8)+8)%8];return `<div class="gate-row ${g.red?'red':'blue'} ${g.life<GATE_RULES.warnAt?'unstable':''}"><i></i><b>RANK ${g.rank}</b><span>${g.forming>0?'FORMANDO…':fmtTime(g.life)}</span><small>${g.district} · ${Math.round(dist(g,p)/10)}m ${arrow}</small></div>`}).join(''):'<p class="gate-empty">Nenhum gate ativo. Aguarde o próximo alerta…</p>'}}
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
drawImpacts(){const c=ctx;for(const im of this.impacts){const k=1-im.t/im.max,s=(im.crit?30:20)*(.4+k);c.save();c.translate(im.x,im.y);c.globalCompositeOperation='lighter';c.globalAlpha=1-k;c.fillStyle=im.crit?'#ffe490':'#e8ffff';c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4+im.angle,r=i%2?s*.3:s;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.strokeStyle=im.crit?'#ffb347':'#4fdcff';c.lineWidth=2;c.beginPath();c.arc(0,0,s*1.2,0,7);c.stroke();c.restore()}}
draw(){ctx.clearRect(0,0,canvas.width,canvas.height);if(!this.started){ctx.fillStyle='#050d18';ctx.fillRect(0,0,canvas.width,canvas.height);return}let p=this.player;
 this.camera.x=clamp(p.x-canvas.width/2,0,Math.max(0,this.world.w-canvas.width));this.camera.y=clamp(p.y-canvas.height/2,0,Math.max(0,this.world.h-canvas.height));const sx=this.shakeMag>0?rand(-1,1)*this.shakeMag:0,sy=this.shakeMag>0?rand(-1,1)*this.shakeMag:0;
 ctx.save();ctx.translate(Math.round(-this.camera.x+sx),Math.round(-this.camera.y+sy));const view={x:this.camera.x,y:this.camera.y,w:canvas.width,h:canvas.height};this.world.draw(ctx,this.time,view);if(this.world.kind==='hub')this.gates.draw(ctx,this.time,this.world);this.drawAtmosphere(ctx);
 for(let c of this.corpses){ctx.save();ctx.globalAlpha=Math.min(1,c.life);ctx.fillStyle='#160b27';ctx.beginPath();ctx.ellipse(c.x,c.y+10,24,10,0,0,7);ctx.fill();ctx.shadowColor='#a855f7';ctx.shadowBlur=16;ctx.strokeStyle='#9f4de0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.x,c.y+10,20+Math.sin(this.time*4)*2,7,0,0,7);ctx.stroke();for(let i=0;i<7;i++){let phase=(this.time*16+i*7)%30;ctx.fillStyle=i%2?'#b761f5':'#65238d';ctx.globalAlpha=Math.min(1,c.life)*(1-phase/35);ctx.fillRect(c.x+Math.sin(this.time*3+i*2)*12,c.y+8-phase,3+i%2,4+i%3)}ctx.restore()}
 if(this.bossDefeated&&!this.chest){ctx.fillStyle='#3b211a';ctx.fillRect(1477,580,46,32);ctx.fillStyle='#e9b950';ctx.fillRect(1477,586,46,5);ctx.fillRect(1497,582,5,29);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.2*Math.sin(this.time*4);ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(1500,596,40,0,7);ctx.fill();ctx.restore()}
 for(const e of this.enemies)if(e.state==='windup')this.drawTelegraph(e);
 this.animation.drawGhosts(ctx);
 let actors=[...this.enemies,...this.soldiers,p].sort((a,b)=>a.y-b.y);
 for(let a of actors){if(a===p){
   // The hero is always rendered at full opacity (no post-dash transparency).
   ctx.globalAlpha=1;ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(a.x,a.y+9,15,5,0,0,7);ctx.fill();
   if(p.stealth>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#5a6bff';ctx.globalAlpha=.45*Math.min(1,p.stealth);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y+9,20+Math.sin(this.time*10)*2,7,0,0,7);ctx.stroke();ctx.restore()}
   if(p.poison>0||p.slow>0){ctx.save();ctx.globalAlpha=.6;ctx.fillStyle=p.poison>0?'#7dff5a':'#bff0ff';ctx.fillRect(a.x-12,a.y-58,24,2);ctx.restore()}
   ctx.drawImage(this.animation.frame(p),Math.round(a.x-32),Math.round(a.y-50),64,64);continue}
  if(this.soldiers.includes(a)){if(a.state==='REGENERATE')continue;const pose=a.swing>0?'strike':a.animMoving?'move'+(Math.floor(a.animT*9)%4):'idle'+(Math.floor(a.animT*2)%2),f=this.sprites.monster('shadow',pose);ctx.save();ctx.translate(Math.round(a.x),Math.round(a.y));ctx.fillStyle='#1a0a2a99';ctx.beginPath();ctx.ellipse(0,4,16,6,0,0,7);ctx.fill();if(a.facing<0)ctx.scale(-1,1);ctx.shadowColor='#a33cff';ctx.shadowBlur=14;ctx.drawImage(f.img,-f.ax,-f.ay);ctx.restore();continue}
  this.drawEnemy(a)}
 this.drawHazards();this.animation.draw(ctx);this.drawImpacts();this.particles.draw(ctx);
 for(let f of this.floats){ctx.fillStyle=f.color;ctx.font=`bold ${f.size||16}px monospace`;ctx.lineWidth=3;ctx.strokeStyle='#07131b';ctx.strokeText(f.text,f.x,f.y);ctx.fillText(f.text,f.x,f.y)}
 ctx.restore();if(this.world.kind==='hub')this.drawGateArrows();this.drawMap()}
drawGateArrows(){const p=this.player,W=canvas.width,H=canvas.height;for(const g of this.gates.list){const sx=g.x-this.camera.x,sy=g.y-this.camera.y;if(sx>0&&sx<W&&sy>0&&sy<H)continue;const a=Math.atan2(sy-H/2,sx-W/2),m=60,ex=clamp(W/2+Math.cos(a)*W,m,W-m),ey=clamp(H/2+Math.sin(a)*H,m+90,H-m-90),col=g.red?'#ff4b57':'#3bcfff';
 ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.globalAlpha=.75+.25*Math.sin(this.time*5);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-8,-9);ctx.lineTo(-4,0);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle=col;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(`${g.rank} · ${Math.round(dist(g,p)/10)}m`,ex-Math.cos(a)*24,ey-Math.sin(a)*24+4);ctx.textAlign='left'}}
drawAtmosphere(c){
 const dungeon=this.world.kind==='dungeon',snow=dungeon&&this.world.rank==='A',lava=dungeon&&this.world.rank==='S';
 c.save();c.globalAlpha=.32;c.fillStyle=snow?'#e8fbff':lava?'#ff9763':dungeon?'#78c4cc':'#b3d2c4';
 const ox=this.camera.x,oy=this.camera.y,W=canvas.width,H=canvas.height;for(let i=0;i<60;i++){const x=(i*127+Math.sin(this.time*.35+i)*16)%W,y=(i*173+(snow?this.time*30:-this.time*7)*(1+i%3))%H;c.fillRect(ox+x,oy+(y+H)%H,i%7===0?3:2,i%7===0?3:2)}
 c.restore();
}
drawMap(){let m=mapctx,w=this.world,sx=150/w.w,sy=100/w.h,X=x=>x*sx+5,Y=y=>y*sy+5;m.clearRect(0,0,160,112);m.fillStyle='#071825';m.fillRect(0,0,160,112);m.strokeStyle='#143747';for(let x=20;x<160;x+=20){m.beginPath();m.moveTo(x,0);m.lineTo(x,112);m.stroke()}for(let y=20;y<112;y+=20){m.beginPath();m.moveTo(0,y);m.lineTo(160,y);m.stroke()}m.strokeStyle='#1c5669';m.strokeRect(4,4,152,104);
 if(w.kind==='hub'){m.fillStyle='#163a2a';for(const pk of CITY.parks)m.fillRect(X(pk.x),Y(pk.y),pk.w*sx,pk.h*sy);m.fillStyle='#2a3a44';for(const r of CITY.roads)m.fillRect(X(r.x),Y(r.y),Math.max(1,r.w*sx),Math.max(1,r.h*sy));m.fillStyle='#0e3a55';m.fillRect(X(0),Y(2800),150,200*sy);m.fillStyle='#24566a';for(const b of CITY.buildings)m.fillRect(X(b.x),Y(b.y),b.w*sx,b.h*sy);m.fillStyle='#3b7c8c';m.fillRect(X(HUB.ox+540),Y(HUB.oy+50),720*sx,270*sy);
  m.fillStyle='#e0b84a';m.fillRect(X(HUB.merchant.x)-1,Y(HUB.merchant.y)-1,3,3);m.fillStyle='#5affb0';m.fillRect(X(HUB.healer.x)-1,Y(HUB.healer.y)-1,3,3);
  for(const g of this.gates.list){const blink=g.forming>0||g.life<GATE_RULES.warnAt?Math.sin(this.time*12)>0:true;if(!blink)continue;m.fillStyle=g.red?'#ff5363':'#54dfff';m.shadowColor=m.fillStyle;m.shadowBlur=6;m.fillRect(X(g.x)-2,Y(g.y)-2,5,5);m.shadowBlur=0}
  m.strokeStyle='#a7fcff55';m.strokeRect(X(this.camera.x),Y(this.camera.y),canvas.width*sx,canvas.height*sy)}
 else{for(const r of w.rooms)if(dist(this.player,{x:r.cx,y:r.cy})<260+this.player.stats.PER*5)r.seen=true;m.fillStyle='#17465b';for(const r of w.rooms.filter(r=>r.seen))m.fillRect(X(r.x),Y(r.y),r.w*sx,r.h*sy);m.fillStyle='#32748a';for(const r of w.corridors)if(w.rooms.some(room=>room.seen&&dist({x:r.x+r.w/2,y:r.y+r.h/2},{x:room.cx,y:room.cy})<320))m.fillRect(X(r.x),Y(r.y),r.w*sx,r.h*sy);m.fillStyle='#f16978';for(let e of this.enemies)if(dist(e,this.player)<260+this.player.stats.PER*5)m.fillRect(X(e.x),Y(e.y),e.boss?4:2,e.boss?4:2)}
 m.fillStyle='#a7fcff';m.shadowColor='#58faff';m.shadowBlur=7;m.fillRect(X(this.player.x)-2,Y(this.player.y)-2,5,5);m.shadowBlur=0}
loop(t){let dt=Math.min(.04,(t-this.last)/1000||0);this.last=t;if(this.started)this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t))}}
const game=new GameEngine();game.floats=[];$('#accept').onclick=()=>game.start(null);if(SaveSystem.load())$('#continue').classList.remove('hidden');$('#continue').onclick=()=>game.start(SaveSystem.load());document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{if(game.started)UIManager.open(b.dataset.panel)});$('#modal').addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;let d=b.dataset,p=game.player;if(d.do==='close'||d.do==='resume')UIManager.close();else if(d.do==='save'){SaveSystem.save(game);UIManager.close();game.message('PROGRESSO SALVO')}else if(d.do==='hub'||d.do==='revive'){p.hp=p.maxhp;p.mp=p.maxmp;game.returnHub()}else if(d.do==='summon'){game.toggleArmy();UIManager.open('army')}else if(d.stat&&p.points>0){p.stats[d.stat]++;p.points--;UIManager.open('status')}else if(d.dismiss!==undefined){game.army.splice(+d.dismiss,1);game.soldiers=[];game.summoned=false;UIManager.open('army')}else if(d.equip!==undefined){let i=+d.equip;if(p.owned.includes(i))p.weapon=i;UIManager.open('inventory')}else if(d.buy!==undefined){let i=+d.buy,w=weapons[i];if(p.owned.includes(i)){p.weapon=i}else if(p.gold>=w.price){p.gold-=w.price;p.owned.push(i);p.weapon=i;game.message('ARMA ADQUIRIDA')}UIManager.open('shop')}else if(d.potion){if(p.gold>=40){p.gold-=40;if(d.potion==='hp')p.hppots++;else p.mppots++}UIManager.open('shop')}else if(d.gate){const gate=game.selectedGate;if(gate)game.gates.remove(gate);game.selectedGate=null;game.enter(d.gate,d.red==='1')}if(game.started)SaveSystem.save(game)});
