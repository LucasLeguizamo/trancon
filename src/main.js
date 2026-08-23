import './style.css';
import mapData from './world/data/bogota.json';
import { buildNetwork } from './world/network.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const healthBar = document.querySelector('.health i');
const scoreEl = document.querySelector('#score');
const speedEl = document.querySelector('#speed');
const livesEl = document.querySelector('#lives');
const finesEl = document.querySelector('#fines');
const starsEl = document.querySelector('#stars');
const signalEl = document.querySelector('#signal');
const abilityEl = document.querySelector('#ability');
const alertEl = document.querySelector('#alert');
const intro = document.querySelector('#intro');
const dead = document.querySelector('#dead');
const finalScore = document.querySelector('#final-score');
const skinPowerEl = document.querySelector('#skin-power');
const keys = new Set();
const C = { road:'#38464a', edge:'#192529', sidewalk:'#a4aaa2', brick:'#914c3a', dark:'#202e31', yellow:'#e8bd24', red:'#db3024', tm:'#e42920', green:'#40c86b', sky:'#59707a' };
let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio,2),running=false,last=0,time=0,score=0,shake=0;

const player = { x:0,y:0,vx:0,vy:0,a:-Math.PI/2,r:15,health:100,hit:0,dead:false };
const camera = {x:0,y:0};
const traffic=[], pedestrians=[], dogs=[], escorts=[], particles=[], helis=[];
let selectedSkin = 'taxi';
let heliTimer = 9;
const skins = {
  taxi:{label:'TAXISTA',color:'#f1c21d',roof:'#151d20',accent:'#d62822',power:'TURBO CARRERA',cooldown:4},
  uber:{label:'UBER',color:'#15191a',roof:'#79ff94',accent:'#62cc76',power:'MODO FANTASMA',cooldown:7},
  tombo:{label:'TOMBO',color:'#edf4ef',roof:'#317b55',accent:'#317b55',power:'SIRENA · CEDA EL PASO',cooldown:8},
  sitp:{label:'SITP',color:'#237ec4',roof:'#10518a',accent:'#eaf4e9',bus:true,power:'PRIORIDAD AZUL',cooldown:7},
  rbr:{label:'RBR · RADIO ACTIVA',color:'#18d56b',roof:'#102d24',accent:'#eaff52',radio:true,power:'PULSO RADIACTIVO',cooldown:8},
  presidential:{label:'TIGRE PRESIDENCIAL',color:'#ef8b20',roof:'#1e1915',accent:'#1b1714',escort:true,tiger:true,power:'RUGIDO PRESIDENCIAL',cooldown:9}
};
const net = buildNetwork(mapData);
const spawn = mapData.meta.spawn;
const startStation = mapData.stations.find(station=>station.name==='Av. Jiménez') || mapData.stations[0];

function resize(){ W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio,2); canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize',resize); resize();
addEventListener('keydown',e=>{ if(e.code==='Space'){e.preventDefault();activateAbility();return;} if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault(); keys.add(e.key.toLowerCase()); });
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

const rand=(x,y,n=0)=>{ const s=Math.sin(x*12.9898+y*78.233+n*43.77)*43758.5453;return s-Math.floor(s); };
const mod=(n,m)=>((n%m)+m)%m;
const isRoad=(x,y)=> net.isDriveable(x,y) || net.isCycleway(x,y);
function nearIntersection(x,y){
  const hit=net.nearest(x,y,['road']);
  if(!hit || hit.dist>36) return false;
  const seg=hit.way.segs[hit.si];
  return Math.hypot(x-seg.a.x,y-seg.a.y)<30 || Math.hypot(x-seg.b.x,y-seg.b.y)<30;
}

function reset(){
  // La estación es el punto de encuentro; el carro aparece en la calzada vecina.
  const snap=net.nearest(startStation.x,startStation.y,['road']);
  const x=snap?snap.px:startStation.x, y=snap?snap.py:startStation.y, a=snap?snap.heading:-Math.PI/2;
  Object.assign(player,{x,y,vx:0,vy:-40,a,r:10,health:100,lives:3,hit:0,shield:.65,dead:false,fines:0,stars:0,cameraHits:new Map(),skin:selectedSkin,abilityCooldown:0,abilityActive:0,ghost:0});
  camera.x=x;camera.y=y; traffic.length=0;pedestrians.length=0;dogs.length=0;escorts.length=0;particles.length=0;helis.length=0;score=0;time=0;shake=0;heliTimer=0;if(skins[selectedSkin].escort){escorts.push({x:x-20,y:y-38,vx:0,vy:0,side:-1},{x:x+96,y:y+38,vx:0,vy:0,side:1});} seedPopulation({x,y}); }
function seedPopulation(origin){
  const CARS=['#f1c21d','#f1c21d','#f1c21d','#e8ecee','#4e86aa','#d87b38','#2f3336','#54a77b','#8c5b94','#c9d0d4'];
  let n=0;
  const roads=net.nearbyWays(origin.x, origin.y, 'road', 2600);
  for(const way of roads){
    const dirs=way.oneway||!(way.lanesB>0)?[1]:[1,-1];
    for(const dir of dirs){
      const lanes=net.laneCount(way, dir);
      for(let lane=0; lane<lanes; lane++){
        // El carril tiene tamaño para tres carros, pero solo ocupamos una fracción:
        // uno normal, y un segundo únicamente en arterias largas y congestionadas.
        if(n<135 && rand(way.length,lane,dir)>.28){const s=Math.max(12,Math.min(way.length-12,way.length*.5));spawnOnLane(way,s,dir,lane,n,CARS[n%CARS.length],'car');n++;}
        if(n<135 && way.w>=58 && rand(way.length,lane,dir+10)>.58){const s=Math.max(16,Math.min(way.length-16,way.length*.78));spawnOnLane(way,s,dir,lane,n,CARS[n%CARS.length],'car');n++;}
        // Motos veloces, pero escasas: una oportunidad por cada cuatro carriles.
        if(n<160 && (n+lane)%4===0){const s=Math.max(16,Math.min(way.length-16,way.length*.28));spawnOnLane(way,s,dir,lane,n,'#e6c927','moto');n++;}
      }
    }
  }
  for(let i=0;i<12;i++) spawnOnWay('tm', i, origin);
  for(let i=0;i<28;i++) spawnOnWay('cycle', i, origin);
  for(let i=0;i<36;i++){
    const localRoads=net.nearbyWays(origin.x, origin.y, 'road', 1500); const way=localRoads.length?localRoads[i%localRoads.length]:net.pickWay('road', i+20); const p=net.pointAt(way, (i*83)%Math.max(20,way.length), 1, 0);
    const nx=Math.cos(p.heading+Math.PI/2), ny=Math.sin(p.heading+Math.PI/2);
    pedestrians.push({x:p.x+nx*(way.w*.55+10),y:p.y+ny*(way.w*.55+10),a:p.heading,phase:rand(i,4)*6.28,r:5,type:i%5===0?'thief':'person',stolen:false,escape:0});
  }
  for(let i=0;i<9;i++) dogs.push({x:origin.x+(i*239)%900-420,y:origin.y+(i*317)%800-380,a:rand(i,9)*6.28,phase:rand(i,11)*6.28,r:7,hit:0});
}
function spawnOnLane(way, s, dir, lane, i, color, kind='car'){
  const moto=kind==='moto';
  const p=net.pointAt(way, s, dir, lane);
  const heading=dir>0?p.heading:p.heading+Math.PI;
  const jam=way.w>70 || /Séptima|Carrera 10|Calle 26|Calle 19|Jiménez|Calle 13|Calle 7/.test(way.name||'');
  const base=moto?168:(jam?22+rand(i,3)*16:34+rand(i,3)*22);
  traffic.push({way,s,dir,lane,kind,x:p.x,y:p.y,a:heading,r:moto?5:9,len:moto?12:20,speed:base*.35,base,damage:moto?22:20,color,hit:0});
}
function spawnOnWay(kind, i, origin){
  const layer=kind==='tm'?'tm':kind==='cycle'?'cycle':'road';
  const local=origin?net.nearbyWays(origin.x,origin.y,layer,2600):[];
  const way=local.length?local[i%local.length]:net.pickWay(layer, i);
  if(!way) return;
  const tm=kind==='tm', cycle=kind==='cycle';
  const dir=way.oneway?1:(i%2?1:-1);
  const lane=i % net.laneCount(way, dir);
  const s=(i*110+40)%Math.max(30, way.length-10);
  const p=net.pointAt(way, s, dir, lane);
  const heading=dir>0?p.heading:p.heading+Math.PI;
  traffic.push({way,s,dir,lane,kind,x:p.x,y:p.y,a:heading,r:tm?17:cycle?5:13,len:tm?84:cycle?19:30,speed:tm?48:cycle?32:40,base:tm?52:cycle?36:40,damage:tm?34:cycle?7:20,color:tm?C.tm:cycle?'#72e4ea':'#e3b42a',hit:0});
}

function update(dt){
 time+=dt; updateHeli(dt); if(!running||player.dead) return;
 player.abilityCooldown=Math.max(0,player.abilityCooldown-dt);player.abilityActive=Math.max(0,player.abilityActive-dt);player.ghost=Math.max(0,player.ghost-dt);
 const up=keys.has('w')||keys.has('arrowup'), down=keys.has('s')||keys.has('arrowdown'), left=keys.has('a')||keys.has('arrowleft'), right=keys.has('d')||keys.has('arrowright');
 const forward=player.vx*Math.cos(player.a)+player.vy*Math.sin(player.a);
 if(up){player.vx+=Math.cos(player.a)*310*dt;player.vy+=Math.sin(player.a)*310*dt;}
 if(down){player.vx-=Math.cos(player.a)*210*dt;player.vy-=Math.sin(player.a)*210*dt;}
 const speed=Math.hypot(player.vx,player.vy); const steer=Math.min(1,speed/65)*(left?-1:right?1:0)*2.35; player.a+=steer*dt*(forward>=-10?1:-1);
 const drag=Math.pow(.19,dt); player.vx*=drag;player.vy*=drag;
 if(player.skin==='taxi'&&player.abilityActive>0){player.vx+=Math.cos(player.a)*190*dt;player.vy+=Math.sin(player.a)*190*dt;}
 const max=player.skin==='taxi'&&player.abilityActive>0?315:235; if(speed>max){player.vx*=max/speed;player.vy*=max/speed;}
 player.x+=player.vx*dt;player.y+=player.vy*dt; player.hit=Math.max(0,player.hit-dt); player.shield=Math.max(0,player.shield-dt); shake=Math.max(0,shake-dt*2.5);
 collideWorld(); updateTraffic(dt); updatePedestrians(dt); updateDogs(dt); updateEscort(dt); updateSpeedCameras(speed,dt); updateParticles(dt); score+=Math.max(0,speed)*dt*.18;
 camera.x+=(player.x-camera.x)*Math.min(1,dt*5);camera.y+=(player.y-camera.y)*Math.min(1,dt*5);
 const sig=signalAt(player.x,player.y); signalEl.textContent=`SEMÁFORO: ${sig.toUpperCase()}`; signalEl.style.color=sig==='red'?'#ff786d':sig==='yellow'?'#f9ca1d':'#75e791';
 if(sig==='red' && speed>115 && nearIntersection(player.x,player.y)) damage(3*dt, false);
 healthBar.style.width=`${Math.max(0,player.health)}%`;scoreEl.textContent=Math.max(0,Math.floor(score-player.fines)).toString().padStart(6,'0');speedEl.textContent=`${Math.round(speed*.75)} km/h`;livesEl.textContent='♥ '.repeat(player.lives).trim()||'—';finesEl.textContent=`$${player.fines.toLocaleString('es-CO')}`;starsEl.textContent='★'.repeat(player.stars)+'☆'.repeat(5-player.stars);
 abilityEl.textContent=player.abilityCooldown>0?`${skins[player.skin].power} · ${player.abilityCooldown.toFixed(1)} s`:`ESPACIO · ${skins[player.skin].power}`;
 if(player.health<=0) loseLife();
}
function collideWorld(){
  const tm=net.nearest(player.x,player.y,['tm']);
  if(tm && tm.dist<tm.way.w*0.42){
    const dx=player.x-tm.px, dy=player.y-tm.py, d=Math.hypot(dx,dy)||1;
    player.x+=dx/d*12; player.y+=dy/d*12; player.vx*=-.5; player.vy*=-.5;
    if(Math.hypot(player.vx,player.vy)>25){ damage(14,true); showAlert('CARRIL TRANSMILENIO'); }
    return;
  }
  if(!net.isDriveable(player.x,player.y)){
    const hit=net.nearest(player.x,player.y,['road','cycle']);
    if(hit){
      const dx=hit.px-player.x, dy=hit.py-player.y, d=Math.hypot(dx,dy)||1;
      player.x+=dx/d*Math.min(14, hit.dist*0.6); player.y+=dy/d*Math.min(14, hit.dist*0.6);
      if(Math.hypot(player.vx,player.vy)>55){ player.vx*=-.38; player.vy*=-.38; damage(Math.hypot(player.vx,player.vy)*.03,true); }
      else { player.vx*=.82; player.vy*=.82; }
    }
  }
}
function signalAt(x,y){
  const hit=net.nearest(x,y,['road']);
  const key=hit?Math.round(hit.px/110)+Math.round(hit.py/110):0;
  const phase=mod(time+key*4.2, 16);
  return phase<5.2?'green':phase<6.6?'yellow':'red';
}
function distToStopLine(v){
  if(v.dir>0) return v.way.length - v.s;
  return v.s;
}
function updateTraffic(dt){
  const groups=new Map();
  for(const v of traffic){
    const k=`${v.way.id}:${v.dir}:${v.lane|0}`;
    let g=groups.get(k); if(!g){g=[]; groups.set(k,g);} g.push(v);
  }
  for(const g of groups.values()){
    g.sort((a,b)=> (a.s-b.s)*a.dir);
  }
  for(const v of traffic){
    v.hit=Math.max(0,v.hit-dt);
    const close=nearIntersection(v.x,v.y);
    const sig=signalAt(v.x,v.y);
    const stop=distToStopLine(v);
    let desired=v.base;
    if(v.yieldUntil>time) desired=0;
    if(v.radioUntil>time) desired=Math.min(desired,v.base*.24);
    if(v.kind!=='tm' && v.kind!=='cycle'){
      if(close && sig==='red' && stop<110) desired=0;
      else if(close && sig==='yellow' && stop<80) desired=Math.min(desired, 10);
    }
    if(v.kind==='tm'){
      for(const st of mapData.stations){
        if(Math.hypot(v.x-st.x,v.y-st.y)<56) desired=Math.min(desired, 6);
      }
    }
    const pack=groups.get(`${v.way.id}:${v.dir}:${v.lane|0}`);
    if(pack){
      const idx=pack.indexOf(v);
      const ahead=pack[idx+1];
      if(ahead){
        const along=(ahead.s-v.s)*v.dir;
        const gap=v.len*.55+ahead.len*.55+8;
        if(along<gap+40) desired=Math.min(desired, Math.max(0,(along-gap)*2.2), ahead.speed);
      }
    }
    const accel=v.kind==='moto'?3.2:1.0;
    v.speed+=(desired-v.speed)*Math.min(1,dt*accel);
    if(v.speed<1.8 && desired<2) v.speed=0;
    v.s+=v.dir*v.speed*dt;
    if(v.s>v.way.length || v.s<0){
      const nxt=net.nextWay(v.way, v.dir>0);
      if(nxt){
        v.way=nxt.way; v.dir=nxt.reverse?-1:1;
        v.lane=Math.min(v.lane|0, net.laneCount(v.way, v.dir)-1);
        v.s=nxt.reverse?Math.max(0,v.way.length-8):8;
      } else { v.dir*=-1; v.s=Math.max(0,Math.min(v.way.length,v.s)); }
    }
    const p=net.pointAt(v.way, v.s, v.dir, v.lane|0);
    v.x=p.x; v.y=p.y; v.a=v.dir>0?p.heading:p.heading+Math.PI;
    if(Math.hypot(v.x-player.x,v.y-player.y)<v.len*.55+player.r) impact(v);
    if(Math.hypot(v.x-player.x,v.y-player.y)>2000){
      const layer=v.kind==='tm'?'tm':v.kind==='cycle'?'cycle':'road';
      const pool=net.nearbyWays(player.x, player.y, layer, 1400);
      const way=pool.length?pool[Math.abs(Math.floor(v.x))%pool.length]:net.pickWay(layer, 0);
      v.way=way; v.dir=way.oneway?1:(Math.random()>.5?1:-1);
      v.lane=Math.floor(Math.random()*net.laneCount(way, v.dir));
      v.s=(Math.abs(v.y)*3)%Math.max(20,way.length);
      v.speed=6;
    }
  }
}
function updatePedestrians(dt){ for(const p of pedestrians){p.phase+=dt*(.7+rand(p.x,p.y)*.4);p.escape=Math.max(0,p.escape-dt);p.flattened=Math.max(0,(p.flattened||0)-dt);const dx=player.x-p.x,dy=player.y-p.y,d=Math.hypot(dx,dy);if(p.flattened>0)continue;if(p.type==='thief'&&p.stolen){p.a=Math.atan2(-dy,-dx);p.x+=Math.cos(p.a)*42*dt;p.y+=Math.sin(p.a)*42*dt;}else{p.x+=Math.cos(p.a)*11*dt;p.y+=Math.sin(p.a)*11*dt;if(rand(Math.floor(time*2),p.x,p.y)<.012)p.a+=(rand(p.y,p.x)-.5)*1.5;}if(!isRoad(p.x,p.y)&&d>1200){p.x=player.x+(rand(p.x,p.y)*2-1)*700;p.y=player.y+(rand(p.y,p.x)*2-1)*550;p.stolen=false;}if(p.type==='thief'&&!p.stolen&&d<28&&p.escape===0){if(skins[player.skin].escort){p.escape=4;showAlert('ESCOLTAS: ROBO FRUSTRADO');}else{p.stolen=true;p.escape=5;score=Math.max(0,score-120);showAlert('LADRÓN: TE ROBÓ $120 · PERSÍGUELO');}}if(p.type==='thief'&&p.stolen&&d<26&&Math.hypot(player.vx,player.vy)<70){p.stolen=false;score+=180;showAlert('BOTÍN RECUPERADO +$180');}if(d<18&&Math.hypot(player.vx,player.vy)>80){p.flattened=3.5;player.stars=Math.min(5,player.stars+1);showAlert(`PEATÓN DERRIBADO · ${'★'.repeat(player.stars)}`);impact({damage:p.type==='thief'?5:8,kind:p.type,x:p.x,y:p.y});} } }
function updateDogs(dt){ for(let i=dogs.length-1;i>=0;i--){const d=dogs[i];if(d.dead){d.dead-=dt;if(d.dead<=0)dogs.splice(i,1);continue;}d.hit=Math.max(0,d.hit-dt);d.phase+=dt;d.x+=Math.cos(d.a)*15*dt;d.y+=Math.sin(d.a)*15*dt;if(rand(Math.floor(time*2),d.x,d.y,4)<.015)d.a+=(rand(d.y,d.x,1)-.5)*1.8;if(Math.hypot(d.x-player.x,d.y-player.y)>1100){d.x=player.x+(rand(d.x,d.y)*2-1)*650;d.y=player.y+(rand(d.y,d.x)*2-1)*500;}if(d.hit===0&&Math.hypot(d.x-player.x,d.y-player.y)<20&&Math.hypot(player.vx,player.vy)>70){d.hit=.8;d.dead=2.8;impact({damage:5,kind:'dog',x:d.x,y:d.y});showAlert('PERRO ATROPELLADO · -5 INTEGRIDAD');}} }
function updateSpeedCameras(speed,dt){ const hit=net.nearest(player.x,player.y,['road']); const key=hit?`${Math.round(hit.px/80)}:${Math.round(hit.py/80)}`:'0:0'; for(const [id,cooldown] of player.cameraHits){if(cooldown<=dt)player.cameraHits.delete(id);else player.cameraHits.set(id,cooldown-dt);} if(nearIntersection(player.x,player.y)&&speed*.75>50&&!player.cameraHits.has(key)){player.cameraHits.set(key,10);player.fines+=633200;score=Math.max(0,score-6332);showAlert(`FOTOMULTA C29 · ${Math.round(speed*.75)} km/h · -$633.200`);shake=.12;}}
function updateEscort(dt){ if(!skins[player.skin].escort)return;for(const e of escorts){const orbit=player.a+e.side*1.12+Math.sin(time*1.7+e.side)*.3;const radius=54+Math.sin(time*2.3+e.side)*9;const tx=player.x+Math.cos(orbit)*radius,ty=player.y+Math.sin(orbit)*radius;const dx=tx-e.x,dy=ty-e.y;e.vx+=(dx*5-e.vx*4)*dt;e.vy+=(dy*5-e.vy*4)*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;}const clear=(item,radius,strength)=>{let nearest;let best=Infinity;for(const e of escorts){const dx=item.x-e.x,dy=item.y-e.y,d=Math.hypot(dx,dy)||1;if(d<best){best=d;nearest={dx,dy,d};}}if(best<radius){item.x+=nearest.dx/nearest.d*strength*dt;item.y+=nearest.dy/nearest.d*strength*dt;}};const presidentialRadius=player.abilityActive>0?330:150;for(let i=traffic.length-1;i>=0;i--){const v=traffic[i];if(v.kind!=='tm'&&Math.hypot(v.x-player.x,v.y-player.y)<presidentialRadius){traffic.splice(i,1);continue;}clear(v,player.abilityActive>0?150:95,player.abilityActive>0?720:380);}for(const p of pedestrians)clear(p,player.abilityActive>0?180:82,player.abilityActive>0?760:390);for(const d of dogs)clear(d,player.abilityActive>0?160:74,player.abilityActive>0?720:360); }
function showAlert(text){alertEl.textContent=text;alertEl.classList.add('show');clearTimeout(showAlert.timer);showAlert.timer=setTimeout(()=>alertEl.classList.remove('show'),1800);}
function activateAbility(){
  if(!running||player.dead||player.abilityCooldown>0)return;
  const skin=skins[player.skin]; player.abilityCooldown=skin.cooldown; player.abilityActive=skin.power==='TURBO CARRERA'?1.2:2.6;
  if(player.skin==='taxi'){player.vx+=Math.cos(player.a)*180;player.vy+=Math.sin(player.a)*180;}
  if(player.skin==='uber'){player.ghost=2.6;}
  if(player.skin==='tombo'){for(const v of traffic)if(v.kind!=='tm')v.yieldUntil=time+2.6;}
  if(player.skin==='sitp'){player.shield=Math.max(player.shield,2.8);for(const v of traffic)if(v.kind!=='tm')v.yieldUntil=time+1.1;}
  if(player.skin==='rbr'){for(const v of traffic)if(v.kind!=='tm')v.radioUntil=time+2.6;score+=90;}
  if(player.skin==='presidential'){player.shield=Math.max(player.shield,1.2);}
  showAlert(`${skin.power} ACTIVADO`);
}
function updateHeli(dt){
  heliTimer+=dt;
  if(heliTimer>=10){
    heliTimer=0;
    const goRight=Math.floor(time/10)%2===0;
    helis.push({x:goRight?-200:W+200,y:52+(Math.abs(Math.sin(time))*22),vx:goRight?230:-230,rotor:0});
    showAlert('FIRMES PARA LA PATRIA');
  }
  for(let i=helis.length-1;i>=0;i--){
    const h=helis[i];
    h.x+=h.vx*dt;
    h.rotor+=dt*46;
    if(h.x<-320||h.x>W+320) helis.splice(i,1);
  }
}
function drawHelis(){
  for(const h of helis){
    ctx.save();
    ctx.translate(h.x,h.y);
    ctx.fillStyle='rgba(220,230,220,.3)';
    ctx.beginPath(); ctx.ellipse(0,-13,38,7,0,0,7); ctx.fill();
    ctx.strokeStyle='rgba(245,248,245,.95)'; ctx.lineWidth=1.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(h.rotor)*36,-13+Math.sin(h.rotor)*6);
    ctx.lineTo(Math.cos(h.rotor+Math.PI)*36,-13+Math.sin(h.rotor+Math.PI)*6);
    ctx.moveTo(Math.cos(h.rotor+1.57)*36,-13+Math.sin(h.rotor+1.57)*6);
    ctx.lineTo(Math.cos(h.rotor+4.71)*36,-13+Math.sin(h.rotor+4.71)*6);
    ctx.stroke();
    ctx.fillStyle='#1c3d2a'; ctx.beginPath(); ctx.ellipse(0,0,17,8,0,0,7); ctx.fill();
    const tail=h.vx>=0?1:-1;
    ctx.fillStyle='#2a5a3c'; ctx.fillRect(tail>0?8:-38,-3,30,5);
    ctx.fillStyle='#c9a227'; ctx.fillRect(tail>0?34:-38,-9,4,14);
    ctx.fillStyle='#9fe0b4'; ctx.fillRect(-5,-4,11,5);
    ctx.strokeStyle='#d7ddd8'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-14,8); ctx.lineTo(14,8); ctx.stroke();
    const bx=tail>0?22:-218;
    ctx.fillStyle='#10180f'; ctx.fillRect(bx,16,196,24);
    ctx.strokeStyle='#f1d24a'; ctx.strokeRect(bx,16,196,24);
    ctx.fillStyle='#f4d35e'; ctx.font='700 15px Barlow Condensed, sans-serif'; ctx.textAlign='left';
    ctx.fillText('FIRMES PARA LA PATRIA', bx+10, 34);
    ctx.restore();
  }
}
function impact(v){ if(player.hit>0||player.ghost>0)return; const speed=Math.hypot(player.vx,player.vy); const dx=player.x-v.x,dy=player.y-v.y,d=Math.hypot(dx,dy)||1; player.x+=dx/d*8;player.y+=dy/d*8;player.vx+=dx/d*(v.kind==='tm'?105:62);player.vy+=dy/d*(v.kind==='tm'?105:62); damage((v.damage+speed*.075)*.68,true); v.hit=.55; }
function damage(amount,burst){ if(player.hit>0||player.dead||player.shield>0)return;const loss=Math.max(35,Math.round(amount));player.health-=loss;player.hit=.58;shake=.28;showAlert(`IMPACTO · -${loss} INTEGRIDAD`);if(burst)for(let i=0;i<12;i++)particles.push({x:player.x,y:player.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,t:.4+Math.random()*.35}); }
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t<=0)particles.splice(i,1);}}
function loseLife(){ player.lives--; if(player.lives<=0){die();return;} player.health=100;player.shield=1.1;player.vx=0;player.vy=0;player.hit=0;showAlert(`VIDA PERDIDA · QUEDAN ${player.lives}`); }
function die(){player.dead=true;running=false;finalScore.textContent=Math.max(0,Math.floor(score-player.fines)).toLocaleString('es-CO');dead.classList.remove('hidden');}

function screen(x,y){return{x:x-camera.x+W/2+(Math.random()-.5)*shake*9,y:y-camera.y+H/2+(Math.random()-.5)*shake*9};}
function draw(){ ctx.clearRect(0,0,W,H);ctx.fillStyle=C.sky;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(0,0); drawWorld(); drawLiveActorsCompact(); drawRadioActive(); drawAbilityAura();ctx.restore(); drawHelis(); drawMinimap(); requestAnimationFrame(draw); }
function strokeOffset(way, offset, color, width, dash){
  ctx.beginPath();
  for(let i=0;i<way.pts.length;i++){
    const h=i<way.segs.length?way.segs[i].heading:way.segs[way.segs.length-1].heading;
    const nx=Math.cos(h+Math.PI/2), ny=Math.sin(h+Math.PI/2);
    const p=screen(way.pts[i].x+nx*offset, way.pts[i].y+ny*offset);
    i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);
  }
  ctx.strokeStyle=color; ctx.lineWidth=width; ctx.setLineDash(dash||[]);
  ctx.lineJoin='round'; ctx.stroke(); ctx.setLineDash([]);
}
function drawLaneMarks(){
  const left=camera.x-W/2-80,right=camera.x+W/2+80,top=camera.y-H/2-80,bottom=camera.y+H/2+80;
  for(const way of net.ways){
    if(way.kind!=='road') continue;
    if(way.maxx<left||way.minx>right||way.maxy<top||way.miny>bottom) continue;
    const lw=way.laneW||20;
    const f=way.lanesF||1, b=way.lanesB||0;
    if(!way.oneway && b>0){
      strokeOffset(way, 0, '#e7c34a', 3, []);
      strokeOffset(way, 2.4, '#e7c34a', 1.4, []);
      strokeOffset(way, -2.4, '#e7c34a', 1.4, []);
      for(let i=1;i<f;i++) strokeOffset(way, (i)*lw, '#d9d7c9', 1.4, [16,18]);
      for(let i=1;i<b;i++) strokeOffset(way, -(i)*lw, '#d9d7c9', 1.4, [16,18]);
    } else {
      for(let i=1;i<f;i++) strokeOffset(way, (i-(f)/2)*lw, '#d9d7c9', 1.4, [16,18]);
    }
  }
}
function strokeWays(kinds, colorFn, widthFn){
  const left=camera.x-W/2-160,right=camera.x+W/2+160,top=camera.y-H/2-160,bottom=camera.y+H/2+160;
  for(const way of net.ways){
    if(!kinds.includes(way.kind)) continue;
    if(way.maxx<left||way.minx>right||way.maxy<top||way.miny>bottom) continue;
    ctx.beginPath();
    const p0=screen(way.pts[0].x,way.pts[0].y);
    ctx.moveTo(p0.x,p0.y);
    for(let i=1;i<way.pts.length;i++){ const p=screen(way.pts[i].x,way.pts[i].y); ctx.lineTo(p.x,p.y); }
    ctx.strokeStyle=colorFn(way);
    ctx.lineWidth=widthFn(way);
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.stroke();
  }
}
function drawWorld(){
  ctx.fillStyle='#1c2628'; ctx.fillRect(0,0,W,H);
  const east=mapData.meta.width-220;
  const e0=screen(east,camera.y-H), e1=screen(mapData.meta.width+80,camera.y+H);
  const g=ctx.createLinearGradient(e0.x,0,e1.x,0);
  g.addColorStop(0,'rgba(35,63,59,0)'); g.addColorStop(.4,'#233f3b'); g.addColorStop(1,'#152823');
  ctx.fillStyle=g; ctx.fillRect(Math.max(0,e0.x),0,W,H);

  for(const park of mapData.parks){
    const p=screen(park.x,park.y);
    ctx.fillStyle='#315840';
    ctx.fillRect(p.x-park.w/2,p.y-park.h/2,park.w,park.h);
  }
  for(const lm of mapData.landmarks||[]){
    if(lm.kind!=='palace') continue;
    const p=screen(lm.x,lm.y);
    ctx.fillStyle='#cbb88a'; ctx.fillRect(p.x-lm.w/2,p.y-lm.h/2,lm.w,lm.h);
    ctx.fillStyle='#8c7a52'; ctx.fillRect(p.x-lm.w/2,p.y-lm.h/2,lm.w,10);
    ctx.fillStyle='#e63a29'; ctx.fillRect(p.x-6,p.y-lm.h/2-28,4,28);
    ctx.fillStyle='#f9ca1d'; ctx.fillRect(p.x-2,p.y-lm.h/2-26,16,10);
    ctx.fillStyle='#f4efe6'; ctx.font='700 13px Barlow Condensed'; ctx.fillText('CASA DE NARIÑO', p.x-lm.w/2+8, p.y-lm.h/2-8);
  }

  const left=camera.x-W/2, right=camera.x+W/2, top=camera.y-H/2, bottom=camera.y+H/2;
  for(let gx=Math.floor(left/88)*88; gx<right; gx+=88){
    for(let gy=Math.floor(top/88)*88; gy<bottom; gy+=88){
      const hit=net.nearest(gx+40,gy+40,['road','tm','cycle']);
      if(hit && hit.dist<hit.way.w*.55+22) continue;
      const r=rand(gx,gy);
      ctx.fillStyle=r>.35?C.brick:'#3d4c4a';
      const s=screen(gx+10,gy+10);
      ctx.fillRect(s.x,s.y,68,68);
      ctx.fillStyle='rgba(0,0,0,.16)';
      ctx.fillRect(s.x+8,s.y+10,16,48); ctx.fillRect(s.x+42,s.y+10,16,48);
    }
  }

  strokeWays(['road'], ()=>C.sidewalk, w=>w.w+18);
  strokeWays(['road'], ()=>C.road, w=>w.w);
  drawLaneMarks();
  strokeWays(['tm'], ()=>C.tm, w=>w.w);
  strokeWays(['cycle'], ()=>'#4aa37a', w=>w.w);

  for(const st of mapData.stations){
    const p=screen(st.x,st.y);
    if(p.x<-80||p.y<-80||p.x>W+80||p.y>H+80) continue;
    ctx.fillStyle='#1a1212'; ctx.fillRect(p.x-34,p.y-16,68,32);
    ctx.fillStyle=C.tm; ctx.fillRect(p.x-32,p.y-11,64,22);
    ctx.fillStyle='#f9ca1d'; ctx.fillRect(p.x-32,p.y-14,64,3);
    ctx.fillStyle='#f4efe6'; ctx.font='10px DM Mono';
    ctx.fillText('TM · '+st.name, p.x+38, p.y+4);
  }

  const named=new Set();
  ctx.font='11px DM Mono'; ctx.fillStyle='rgba(255,255,255,.38)';
  for(const way of net.ways){
    if(way.kind!=='road' || !way.name || named.has(way.name)) continue;
    if(way.w<48) continue;
    named.add(way.name);
    const mid=way.pts[Math.floor(way.pts.length/2)];
    const p=screen(mid.x,mid.y);
    if(p.x>0&&p.y>0&&p.x<W&&p.y<H) ctx.fillText(way.name, p.x+6, p.y-6);
  }
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawActors(){
 for(const p of pedestrians){const s=screen(p.x,p.y);if(p.flattened>0){ctx.fillStyle='rgba(46,37,35,.65)';ctx.beginPath();ctx.ellipse(s.x,s.y+3,10,3,0,0,7);ctx.fill();ctx.fillStyle='#f9ca1d';ctx.font='10px DM Mono';ctx.fillText('★',s.x-3,s.y-6);continue;}ctx.fillStyle='#e2b189';ctx.beginPath();ctx.arc(s.x,s.y-4,3,0,7);ctx.fill();ctx.fillStyle=p.type==='thief'?'#241d27':'#263d60';ctx.fillRect(s.x-3,s.y-1,6,8);if(p.type==='thief'){ctx.fillStyle=p.stolen?'#f1c21d':'#d73532';ctx.fillRect(s.x+4,s.y+2,5,5);ctx.fillStyle='#f0ece2';ctx.fillRect(s.x-4,s.y-8,8,2);}}
 for(const d of dogs){const s=screen(d.x,d.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(d.a);ctx.fillStyle='#c88748';ctx.fillRect(-7,-4,12,8);ctx.beginPath();ctx.arc(6,-3,4,0,7);ctx.fill();ctx.fillStyle='#302418';ctx.fillRect(-8,4,2,5);ctx.fillRect(3,4,2,5);ctx.restore();}
 for(const v of traffic){const s=screen(v.x,v.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(v.a);if(v.kind==='cycle'){ctx.strokeStyle='#101b20';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-6,0,4,0,7);ctx.arc(6,0,4,0,7);ctx.moveTo(-6,0);ctx.lineTo(1,-6);ctx.lineTo(6,0);ctx.moveTo(1,-6);ctx.lineTo(3,2);ctx.stroke();ctx.fillStyle=v.color;ctx.beginPath();ctx.arc(0,-9,3,0,7);ctx.fill();}else{rounded(-v.len/2,-v.r,v.len,v.r*2,v.kind==='tm'?5:4,v.color);if(v.kind==='tm'){ctx.fillStyle='#272f31';ctx.fillRect(-v.len*.34,-v.r+3,v.len*.68,6);ctx.fillStyle='#f3d2bd';for(let i=-v.len*.3;i<v.len*.3;i+=16)ctx.fillRect(i,-v.r+4,9,4);}else{ctx.fillStyle='#dce8e3';ctx.fillRect(-v.len*.15,-v.r+3,v.len*.3,6);}}ctx.restore();}
 for(const p of particles){const s=screen(p.x,p.y);ctx.fillStyle=`rgba(255,197,72,${p.t*2})`;ctx.fillRect(s.x-2,s.y-2,4,4);}
 const skin=skins[player.skin],s=screen(player.x,player.y);if(skin.escort){for(const offset of [-43,43]){ctx.save();ctx.translate(s.x+Math.cos(player.a+Math.PI/2)*offset,s.y+Math.sin(player.a+Math.PI/2)*offset);ctx.rotate(player.a);rounded(-12,-7,24,14,4,'#1c2228');ctx.fillStyle='#477ca0';ctx.fillRect(-11,-8,5,2);ctx.restore();}}ctx.save();ctx.translate(s.x,s.y);ctx.rotate(player.a);if(skin.tiger){ctx.shadowColor='#ef8b20';ctx.shadowBlur=player.shield>0?18:6;ctx.fillStyle=player.hit>0?'#fff0dd':skin.color;ctx.beginPath();ctx.ellipse(0,0,18,11,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(15,-4,8,0,7);ctx.fill();ctx.fillStyle='#1b1714';for(const stripe of [-9,-2,5]){ctx.fillRect(stripe,-10,3,20);}ctx.fillRect(12,-6,9,3);ctx.fillStyle='#fff7dc';ctx.beginPath();ctx.arc(18,-5,1.7,0,7);ctx.fill();ctx.strokeStyle='#ef8b20';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,2);ctx.quadraticCurveTo(-31,10,-25,17);ctx.stroke();}else{const carW=skin.bus?50:36,carH=skin.bus?25:20;rounded(-carW/2,-carH/2,carW,carH,6,player.hit>0?'#fff0dd':skin.color);ctx.shadowColor=skin.color;ctx.shadowBlur=player.shield>0?18:6;ctx.fillStyle=skin.roof;ctx.fillRect(-carW*.14,-carH*.35,carW*.38,carH*.7);if(skin.bus){ctx.fillStyle='#e8f3ed';for(let i=-carW*.37;i<carW*.34;i+=10)ctx.fillRect(i,-carW*.36,7,4);}ctx.fillStyle=skin.accent;ctx.fillRect(-carW*.45,-carH*.55,carW*.22,2);ctx.fillRect(-carW*.45,carH*.45,carW*.22,2);}ctx.restore();ctx.shadowBlur=0;
}
function drawLiveActors(){
  for(const p of pedestrians){const s=screen(p.x,p.y);if(p.flattened>0){ctx.fillStyle='#3a3030';ctx.beginPath();ctx.ellipse(s.x,s.y+3,10,3,0,0,7);ctx.fill();ctx.fillStyle='#f9ca1d';ctx.font='10px DM Mono';ctx.fillText('★',s.x-3,s.y-6);continue;}ctx.fillStyle='#e2b189';ctx.beginPath();ctx.arc(s.x,s.y-4,3,0,7);ctx.fill();ctx.fillStyle=p.type==='thief'?'#241d27':'#263d60';ctx.fillRect(s.x-3,s.y-1,6,8);if(p.type==='thief'){ctx.fillStyle=p.stolen?'#f1c21d':'#d73532';ctx.fillRect(s.x+4,s.y+2,5,5);}}
  for(const d of dogs){const s=screen(d.x,d.y);if(d.dead){ctx.fillStyle='rgba(66,47,37,.65)';ctx.beginPath();ctx.ellipse(s.x,s.y+2,10,3,0,0,7);ctx.fill();continue;}ctx.fillStyle='#c88748';ctx.beginPath();ctx.ellipse(s.x,s.y,8,5,d.a,0,7);ctx.fill();}
  for(const v of traffic){const s=screen(v.x,v.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(v.a||0);if(v.kind==='cycle'){ctx.strokeStyle='#101b20';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-6,0,4,0,7);ctx.arc(6,0,4,0,7);ctx.stroke();ctx.fillStyle=v.color;ctx.beginPath();ctx.arc(0,-8,3,0,7);ctx.fill();}else{rounded(-v.len/2,-v.r,v.len,v.r*2,4,v.color);ctx.fillStyle=v.kind==='tm'?'#f4ddd1':'#dce8e3';ctx.fillRect(-v.len*.17,-v.r+3,v.len*.34,5);}ctx.restore();}
  for(const e of escorts){const s=screen(e.x,e.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(e.vy,e.vx)||player.a);rounded(-13,-8,26,16,4,'#1c2228');ctx.fillStyle='#477ca0';ctx.fillRect(-12,-9,6,2);ctx.fillStyle='#e6f3f5';ctx.fillRect(-2,-5,9,10);ctx.restore();}
  for(const p of particles){const s=screen(p.x,p.y);ctx.fillStyle=`rgba(255,197,72,${p.t*2})`;ctx.fillRect(s.x-2,s.y-2,4,4);}
  const skin=skins[player.skin],s=screen(player.x,player.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(player.a);if(skin.tiger){ctx.fillStyle=player.hit>0?'#fff0dd':skin.color;ctx.beginPath();ctx.ellipse(0,0,18,11,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(15,-4,8,0,7);ctx.fill();ctx.fillStyle='#1b1714';for(const stripe of[-9,-2,5])ctx.fillRect(stripe,-10,3,20);ctx.strokeStyle='#ef8b20';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,2);ctx.quadraticCurveTo(-31,10,-25,17);ctx.stroke();}else{const cw=skin.bus?50:36,ch=skin.bus?25:20;rounded(-cw/2,-ch/2,cw,ch,6,player.hit>0?'#fff0dd':skin.color);ctx.fillStyle=skin.roof;ctx.fillRect(-cw*.14,-ch*.35,cw*.38,ch*.7);ctx.fillStyle=skin.accent;ctx.fillRect(-cw*.45,-ch*.55,cw*.22,2);ctx.fillRect(-cw*.45,ch*.45,cw*.22,2);}ctx.restore();
}
function drawRadioActive(){if(!skins[player.skin].radio)return;const s=screen(player.x,player.y),pulse=16+Math.sin(time*8)*5;ctx.strokeStyle='rgba(112,255,174,.9)';ctx.lineWidth=2;for(const r of[pulse,pulse+8]){ctx.beginPath();ctx.arc(s.x,s.y,r,player.a-.65,player.a+.65);ctx.stroke();}ctx.fillStyle='#eaff52';ctx.font='9px DM Mono';ctx.fillText('RBR · ON AIR',s.x-25,s.y-27);}
function drawAbilityAura(){if(player.abilityActive<=0)return;const s=screen(player.x,player.y),skin=skins[player.skin],pulse=24+(1-player.abilityActive%1)*22;ctx.save();ctx.globalAlpha=.72;ctx.strokeStyle=skin.accent;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(s.x,s.y,player.skin==='presidential'?pulse*2.7:pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(player.ghost>0){ctx.fillStyle='rgba(121,255,148,.16)';ctx.beginPath();ctx.arc(s.x,s.y,25,0,Math.PI*2);ctx.fill();}ctx.restore();}
function drawMinimap(){ const size=Math.min(150,Math.max(112,W*.14)),x=W-size-26,y=H-size-31,scale=size/1200;ctx.save();ctx.fillStyle='rgba(13,23,25,.9)';ctx.fillRect(x-7,y-24,size+14,size+31);ctx.strokeStyle='#71817b';ctx.strokeRect(x-7,y-24,size+14,size+31);ctx.fillStyle='#d0dbd6';ctx.font='9px DM Mono';ctx.fillText('MINIMAPA · CENTRO',x,y-10);ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();ctx.fillStyle='#253337';ctx.fillRect(x,y,size,size);for(const way of net.ways){ctx.strokeStyle=way.kind==='tm'?C.tm:way.kind==='cycle'?'#72e4ea':'#74817c';ctx.lineWidth=Math.max(1,way.w*scale*.7);ctx.beginPath();way.pts.forEach((p,i)=>{const px=x+size/2+(p.x-player.x)*scale,py=y+size/2+(p.y-player.y)*scale;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();}for(const v of traffic){if(Math.abs(v.x-player.x)<600&&Math.abs(v.y-player.y)<600){ctx.fillStyle=v.kind==='tm'?C.tm:v.kind==='moto'?'#e6c927':v.kind==='cycle'?'#72e4ea':'#d0d7d1';ctx.fillRect(x+size/2+(v.x-player.x)*scale-1,y+size/2+(v.y-player.y)*scale-1,3,3);}}for(const st of mapData.stations){ctx.fillStyle=C.tm;ctx.fillRect(x+size/2+(st.x-player.x)*scale-2,y+size/2+(st.y-player.y)*scale-2,4,4);}ctx.fillStyle='#7CFF00';ctx.beginPath();ctx.arc(x+size/2,y+size/2,4,0,7);ctx.fill();ctx.restore(); }

function drawLiveActorsCompact(){
  for(const p of pedestrians){const s=screen(p.x,p.y);if(p.flattened>0){ctx.fillStyle='#3a3030';ctx.beginPath();ctx.ellipse(s.x,s.y+3,10,3,0,0,7);ctx.fill();continue;}ctx.fillStyle='#e2b189';ctx.beginPath();ctx.arc(s.x,s.y-4,3,0,7);ctx.fill();ctx.fillStyle=p.type==='thief'?'#241d27':'#263d60';ctx.fillRect(s.x-3,s.y-1,6,8);if(p.type==='thief'){ctx.fillStyle=p.stolen?'#f1c21d':'#d73532';ctx.fillRect(s.x+4,s.y+2,5,5);}}
  for(const d of dogs){const s=screen(d.x,d.y);if(d.dead){ctx.fillStyle='rgba(66,47,37,.65)';ctx.beginPath();ctx.ellipse(s.x,s.y+2,10,3,0,0,7);ctx.fill();continue;}ctx.fillStyle='#c88748';ctx.beginPath();ctx.ellipse(s.x,s.y,8,5,d.a,0,7);ctx.fill();}
  for(const v of traffic){const s=screen(v.x,v.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(v.a||0);if(v.kind==='cycle'){ctx.strokeStyle='#101b20';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-5,0,3.5,0,7);ctx.arc(5,0,3.5,0,7);ctx.stroke();}else{rounded(-v.len/2,-v.r,v.len,v.r*2,4,v.color);ctx.fillStyle=v.kind==='tm'?'#f4ddd1':'#dce8e3';ctx.fillRect(-v.len*.17,-v.r+3,v.len*.34,5);}ctx.restore();}
  for(const e of escorts){const s=screen(e.x,e.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(e.vy,e.vx)||player.a);rounded(-10,-6,20,12,3,'#1c2228');ctx.fillStyle='#477ca0';ctx.fillRect(-9,-7,5,2);ctx.restore();}
  for(const p of particles){const s=screen(p.x,p.y);ctx.fillStyle=`rgba(255,197,72,${p.t*2})`;ctx.fillRect(s.x-2,s.y-2,4,4);}
  const skin=skins[player.skin],s=screen(player.x,player.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(player.a);if(skin.tiger){ctx.fillStyle=player.hit>0?'#fff0dd':skin.color;ctx.beginPath();ctx.ellipse(0,0,13,8,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(11,-3,5.5,0,7);ctx.fill();ctx.fillStyle='#1b1714';for(const stripe of[-6,0,6])ctx.fillRect(stripe,-7,2,14);}else{const cw=skin.bus?35:25,ch=skin.bus?18:14;rounded(-cw/2,-ch/2,cw,ch,4,player.hit>0?'#fff0dd':skin.color);ctx.fillStyle=skin.roof;ctx.fillRect(-cw*.14,-ch*.35,cw*.38,ch*.7);ctx.fillStyle=skin.accent;ctx.fillRect(-cw*.43,-ch*.52,cw*.2,2);ctx.fillRect(-cw*.43,ch*.4,cw*.2,2);}ctx.restore();
}
function updateSkinPowerCopy(){skinPowerEl.textContent=`${skins[selectedSkin].label} · ${skins[selectedSkin].power}`;}
document.querySelectorAll('.skin').forEach(button=>button.onclick=()=>{selectedSkin=button.dataset.skin;document.querySelectorAll('.skin').forEach(item=>item.classList.toggle('selected',item===button));updateSkinPowerCopy();});
document.querySelector('#start').onclick=()=>{intro.classList.add('hidden');running=true;reset();showAlert(`${startStation.name.toUpperCase()} · ${skins[player.skin].label} EN SERVICIO`);};
document.querySelector('#restart').onclick=()=>{dead.classList.add('hidden');running=true;reset();};
function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);requestAnimationFrame(loop);} updateSkinPowerCopy();requestAnimationFrame(loop);requestAnimationFrame(draw); reset();
