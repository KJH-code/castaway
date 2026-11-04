/* 98-music.js — CASTAWAY
   지역 음악(사용자 요청 2026-11-04) — 바닷가는 보사노바 · 숲은 어둡고 차분한 쿨 재즈 · 산은 스윙 · 물속은 느리고 서늘한 보사.
   **원곡을 베끼지 않는다** — 화성 진행(ii–V–I 같은 재즈의 흔한 틀)과 리듬 꼴만 쓰고, 소리 · 선율은 이 파일이 즉석에서 짓는다
   (전자 피아노 · 기타 뜯기 · 베이스 · 브러시 · 라이드 · 클라베를 Web Audio 로 합성). 그래서 저작권 걱정이 없고 크레디트도 필요 없다.
   · musicVol(v) — 설정 '음악'(94-input.js) · 0 이면 끈다. 소리는 A.master(전체 음량)를 거친다.
   · 일정은 40 ms 마다 앞으로 0.25초 치를 미리 건다(AudioContext 시계 — 프레임과 무관). 멈춤 · 창 내림 · 상륙 전이면 잦아든다.
   · 지역이 바뀌면 1.5초에 걸쳐 잦아들었다 새 곡풍으로 다시 선다 */
"use strict";
const MUS={vol:0.6, style:null, want:null, bus:null, gain:null, rev:null, nextT:0, step:0, bar:0, last:72, hi:0, hiId:null, lvl:0, chk:0};
const mtof=m=>440*Math.pow(2,(m-69)/12);
/* 곡풍 — bpm · 스윙 · 화음(뿌리 미디, 음정들) · 화음당 마디 · 반주 자리(16분) · 베이스 자리[16분, 음정] 또는 걷는 베이스 · 타악 · 선율 빈도 · 소리 결 */
const MSTYLE={
  bossa:{bpm:132, sw:0, bars:2, ch:[[50,[0,3,7,10,14]],[55,[0,4,10,14,21]],[48,[0,4,7,11,14]],[45,[0,4,10,13,19]]],
         comp:[0,3,6,10,13], bass:[[0,0],[6,7],[8,0],[14,7]], clave:[0,3,6,10,12], shaker:1, mel:0.30, cut:2600, rv:0.25, gtr:1},
  water:{bpm:92, sw:0, bars:2, ch:[[53,[0,4,7,11,14]],[52,[0,3,7,10,14]],[51,[0,4,10,13,18]],[50,[0,3,7,10,14]]],
         comp:[0,6,10], bass:[[0,0],[8,7]], clave:[0,6,12], shaker:0, mel:0.22, cut:1400, rv:0.60, gtr:1},
  cool: {bpm:70, sw:1, bars:2, ch:[[48,[0,3,7,10,14]],[44,[0,4,7,11,14]],[50,[0,3,6,10,13]],[43,[0,4,10,13,15]]],
         comp:[0,10], walk:1, brush:1, mel:0.40, cut:1700, rv:0.45, gtr:0},
  swing:{bpm:150, sw:1, bars:1, ch:[[46,[0,4,7,11,14]],[43,[0,4,10,13,16]],[48,[0,3,7,10,14]],[41,[0,4,10,14,21]]],
         comp:[0,6], walk:1, ride:1, mel:0.45, cut:3200, rv:0.18, gtr:0}
};
function musicVol(v){ MUS.vol=v; }
function musInit(){
  if(MUS.bus||!A.ctx||!A.master) return !!MUS.bus;
  const C=A.ctx;
  MUS.gain=C.createGain(); MUS.gain.gain.value=0; MUS.gain.connect(A.master);
  MUS.bus=C.createBiquadFilter(); MUS.bus.type='lowpass'; MUS.bus.frequency.value=2600; MUS.bus.connect(MUS.gain);
  /* 잔향 — 지수로 사그라드는 잡음 2.4초(방의 울림) */
  const len=Math.floor(C.sampleRate*2.4), ir=C.createBuffer(2,len,C.sampleRate);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2); }
  MUS.rev=C.createConvolver(); MUS.rev.buffer=ir; MUS.revG=C.createGain(); MUS.revG.gain.value=0.3;
  MUS.bus.connect(MUS.revG); MUS.revG.connect(MUS.rev); MUS.rev.connect(MUS.gain);
  return true;
}
/* ── 악기 ── */
function musEnv(t,a,peak,dec,dur){ const g=A.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a);
  g.gain.setTargetAtTime(peak*0.25,t+a,dec); g.gain.setTargetAtTime(0,t+dur,0.08); g.connect(MUS.bus); return g; }
function musOsc(type,f,t,dur,g,det){ const o=A.ctx.createOscillator(); o.type=type; o.frequency.value=f; if(det) o.detune.value=det; o.connect(g); o.start(t); o.stop(t+dur+0.5); }
function musEP(m,t,dur,v){ const g=musEnv(t,0.012,v,0.5,dur); musOsc('sine',mtof(m),t,dur,g,(Math.random()-0.5)*6);
  const g2=musEnv(t,0.005,v*0.25,0.12,dur); musOsc('sine',mtof(m+12),t,dur,g2); }                     // 전자 피아노 — 바탕 + 짧은 쇳소리 배음
function musPluck(m,t,v){ const g=musEnv(t,0.004,v,0.16,0.9); musOsc('triangle',mtof(m),t,0.9,g); }      // 나일론 기타 뜯기
function musBass(m,t,dur,v){ const g=musEnv(t,0.008,v,0.25,dur); musOsc('sine',mtof(m),t,dur,g); musOsc('triangle',mtof(m),t,dur,musEnv(t,0.004,v*0.3,0.06,dur)); }
function musNoise(t,dur,v,f,q,type){ if(!A.noise) return; const s=A.ctx.createBufferSource(); s.buffer=A.noise;
  const b=A.ctx.createBiquadFilter(); b.type=type||'bandpass'; b.frequency.value=f; b.Q.value=q||1;
  const g=A.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+Math.min(0.02,dur*0.3)); g.gain.setTargetAtTime(0,t+dur*0.3,dur*0.35);
  s.connect(b); b.connect(g); g.connect(MUS.bus); s.start(t,Math.random()*1.5); s.stop(t+dur+0.4); }
function musKick(t,v){ const o=A.ctx.createOscillator(), g=A.ctx.createGain(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(42,t+0.13);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.3); o.connect(g); g.connect(MUS.bus); o.start(t); o.stop(t+0.35); }
function musRim(t,v){ musNoise(t,0.04,v,2800,6); const o=A.ctx.createOscillator(), g=A.ctx.createGain(); o.frequency.value=1650;
  g.gain.setValueAtTime(v*0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05); o.connect(g); g.connect(MUS.bus); o.start(t); o.stop(t+0.08); }
/* ── 지역 — 물속 · 바닷가 · 산 · 숲 ── */
function musicRegion(){
  if(typeof skyUnder!=='undefined'&&skyUnder) return 'water';
  if(typeof F==='undefined'||!F.elev) return 'bossa';
  if(MUS.hiId!==GAME_ID){ let h=0; for(let i=0;i<F.elev.length;i+=7) if(F.elev[i]>h) h=F.elev[i]; MUS.hi=h; MUS.hiId=GAME_ID; }
  const gx=clamp(Math.round(PL.pos.x/CELL+N/2),0,N-1), gz=clamp(Math.round(PL.pos.z/CELL+N/2),0,N-1), i=IDX(gx,gz), b=F.biome[i], e=F.elev[i];
  if(b===B.BEACH||b===B.DUNE||b===B.SHELF||b===B.DEEP||F.dWater[i]<140) return 'bossa';
  if(b===B.ROCK||b===B.SCREE||e>MUS.hi*0.42) return 'swing';
  return 'cool';
}
/* ── 일정 ── */
function musSchedule(S,until){
  const C=A.ctx, sd=60/S.bpm/4;                                        // 16분음표 한 칸
  while(MUS.nextT<until){
    const t0=MUS.nextT, st=MUS.step%16, ci=Math.floor(MUS.bar/S.bars)%S.ch.length, [root,iv]=S.ch[ci];
    const sw=S.sw&&(st%4===2)?sd*0.66:0, t=t0+sw, hum=()=>(Math.random()-0.5)*0.012;
    if(st===0&&MUS.bar%S.bars===0&&S.gtr===0) iv.slice(1).forEach((x,k)=>musEP(root+12+x,t+k*0.006,sd*14,0.05));   // 피아노 화음 — 화음이 바뀔 때 길게
    if(S.comp.indexOf(st)>=0){
      if(S.gtr) iv.forEach((x,k)=>musPluck(root+12+x,t+k*0.008+hum(),0.05));       // 기타 — 낮은 줄부터 훑는다
      else if(st!==0) iv.slice(1,4).forEach((x,k)=>musEP(root+12+x,t+hum(),sd*3,0.04));
    }
    if(S.walk){ if(st%4===0){ const k=st/4, w=[0,iv[1]>3?4:3,7,iv[1]>3?9:10], nx=S.ch[(ci+(MUS.bar%S.bars===S.bars-1&&k===3?1:0))%S.ch.length][0];
        const m=k===3&&MUS.bar%S.bars===S.bars-1?nx-1:root-12+w[k]; musBass(m,t+hum(),sd*3.5,0.16); } }
    else for(const [p,x] of S.bass) if(p===st) musBass(root-12+x,t,sd*(p===0?5:2),0.16);
    if(S.clave&&S.clave.indexOf(st)>=0&&MUS.bar%2===0) musRim(t,0.05);
    if(S.shaker&&st%2===0) musNoise(t,0.05,st%4===0?0.018:0.011,7000,1,'highpass');
    if(S.brush){ if(st%4===0) musNoise(t,sd*3.6,0.022,2400,0.7); if(st===4||st===12) musNoise(t,0.09,0.03,3200,1.2); }
    if(S.ride){ if(st%4===0||st===6||st===14) musNoise(t,0.28,st%8===4?0.035:0.025,8000,0.8,'highpass'); if(st===4||st===12) musNoise(t,0.05,0.02,6500,1,'highpass'); }
    if(S.gtr&&(st===0||st===8)) musKick(t,0.10);
    if(st%2===0&&Math.random()<S.mel*0.5){                              // 선율 — 화음 음 둘레를 한두 걸음씩
      const pool=iv.map(x=>root+24+x).concat(iv.map(x=>root+36+x)).filter(m=>m>=64&&m<=86);
      let best=pool[0], bd=1e9; for(const m of pool){ const d=Math.abs(m-MUS.last)+(Math.random()*6); if(d<bd&&m!==MUS.last){ bd=d; best=m; } }
      MUS.last=best; if(S.gtr) musPluck(best,t+hum(),0.06); else musEP(best,t+hum(),sd*(Math.random()<0.4?4:2),0.05); }
    MUS.nextT+=sd; MUS.step++; if(MUS.step%16===0) MUS.bar++;
  }
}
setInterval(()=>{
  if(typeof A==='undefined'||!A.ctx) return;
  if(!musInit()) return;
  const C=A.ctx, now=C.currentTime;
  const hidden=(typeof winHidden!=='undefined'&&winHidden)||document.hidden;
  const on=MUS.vol>0&&typeof landed!=='undefined'&&landed&&!paused&&!hidden&&!(typeof PL!=='undefined'&&PL.dead);
  if(now>MUS.chk){ MUS.chk=now+2; MUS.want=on?musicRegion():null; }
  /* 지역이 바뀌면 잦아들었다가(1.5초) 새 곡풍으로 */
  const want=MUS.want, tgt=(want&&want===MUS.style)?MUS.vol*0.55:0;
  MUS.lvl+=(tgt-MUS.lvl)*(tgt>MUS.lvl?0.03:0.06);
  MUS.gain.gain.setTargetAtTime(MUS.lvl,now,0.05);
  if(want!==MUS.style&&MUS.lvl<0.01){ MUS.style=want; if(want){ const S=MSTYLE[want]; MUS.nextT=now+0.1; MUS.step=0; MUS.bar=0;
    MUS.bus.frequency.setValueAtTime(S.cut,now); MUS.revG.gain.setValueAtTime(S.rv,now); } }
  if(MUS.style&&MUS.lvl>0.002){ if(MUS.nextT<now) MUS.nextT=now+0.05; musSchedule(MSTYLE[MUS.style],now+0.25); }
},40);
