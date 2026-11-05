/* 98-music.js — CASTAWAY
   **지형마다 한 곡**(사용자 요청 2026-11-05 — 지형마다 곡 · 날씨가 바뀌면 곡도 바뀐다 · 악기가 제 소리처럼 · 다 들어 볼 수 있게).
   곡은 이 파일이 즉석에서 짓는다 — 화성 진행(재즈의 흔한 틀)과 리듬 꼴만 정해 두고 선율 · 반주 · 베이스 · 북은 마디마다 새로 고른다.
   원곡을 베끼지 않으므로 저작권 걱정이 없고 크레디트도 필요 없다.
   ── 악기(전부 Web Audio — 소리는 표본을 미리 '빚어' 두고 튕긴다) ──
   · 피아노 — 줄 둘(조금 어긋나 맥놀이)의 배음 18개 · 비조화(높을수록 배음이 위로 벌어진다) · 배음마다 빠른/느린 두 겹 사그라듦 · 망치 친 자리(1/7)의 빈 배음 · 망치 소리
   · 콘트라베이스 · 나일론 기타 · 프렛리스 — 카플러스-스트롱 줄(지연선 + 고리 거르개 · 뜯은 자리 빗살) + 몸통 울림(봉우리 거르개). 죽은 음(고스트) · 미끄러짐(재생 빠르기를 밀어)
   · 실로폰 — 나무 막대의 모드(1 : 3 : 6.2 : 9.9 — 첫 배음을 열두째음에 맞춘 막대) · 채 소리
   · 트럼펫 · 알토 색소폰 · 트롬본 — 톱니파 둘 + 소리 세기를 따라 열리는 거르개(관악기는 세게 불수록 밝다) + 악기마다 포먼트 · 숨소리 · 퍼올림(스쿠프) · 늦게 들어오는 떨림
   · 북 — 킥 · 스네어(고스트) · 크로스 스틱 · 하이햇(쇳조각 여섯 네모파 · 닫힘/열림/발) · 라이드(비조화 배음 60개 · 벨) · 브러시(쓸기 · 두드림) · 탐 · 셰이커
   ── 곡(`MU_SONGS`) · 지역(`musicRegion`) ──
   석회 동굴 · 화강암 동굴 · 자수정 동굴(땅속 세계) · 협곡 · 침엽수림 · 마른 땅 · 밀림 · 바닷가 · 산 · 벼랑 · 습지 · 물속
   ── 날씨(`musicWx`) — 맑고 마르면 높은 음 · 덜 끈적한 박(스윙을 곧게 · 고스트를 덜) / 비가 오면 낮은 음 · 느린 빠르기 · 어두운 소리
   · musicVol(v) — 설정 '음악'(94-input.js) · 0 이면 끈다. 소리는 A.master 를 거친다.
   · 일정은 한 마디씩 0.6초 앞서 건다(AudioContext 시계 — 프레임과 무관). 멈춤 · 창 내림 · 상륙 전이면 잦아든다.
   · **음악 듣기**(설정 창 — `pJuke` · `pJukeW`) — 곡과 날씨를 골라 언제든 듣는다(멈춤 · 시작 화면에서도) */
"use strict";
const MUS={vol:0.6, cur:null, want:null, wx:'mid', curWx:'mid', lvl:0, chk:0, nextBar:0, bar:0, juke:null, jukeWx:'auto', cache:new Map(), st:null, bus:null};
const mtof=m=>440*Math.pow(2,(m-69)/12);
const MU_SR=22050;                                                  // 표본을 빚는 빠르기(높은 배음이 필요한 쇠붙이만 상자 빠르기)
const MU_PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
const muR=(a,b)=>a+Math.random()*(b-a), muPick=a=>a[(Math.random()*a.length)|0];
/* 화음 성질 — t 화음 음(근음에서) · s 음계 · a/b 왼손 보이싱 두 꼴(근음 뺀 3-5-7-9 / 7-9-3-5 — 빌 에번스식) */
const MU_Q={
  maj7:{t:[0,4,7,11,14],s:[0,2,4,7,9,11],a:[4,7,11,14],b:[11,14,16,19]},
  maj7s11:{t:[0,4,7,11,18],s:[0,2,4,6,7,9,11],a:[4,6,11,14],b:[11,14,16,18]},
  '69':{t:[0,4,7,9,14],s:[0,2,4,7,9],a:[4,9,14,19],b:[9,14,16,19]},
  m7:{t:[0,3,7,10,14],s:[0,2,3,5,7,9,10],a:[3,7,10,14],b:[10,14,15,19]},
  m9:{t:[0,3,7,10,14],s:[0,2,3,5,7,9,10],a:[3,7,10,14],b:[10,14,15,17]},
  mmaj7:{t:[0,3,7,11,14],s:[0,2,3,5,7,9,11],a:[3,7,11,14],b:[11,14,15,19]},
  '7':{t:[0,4,7,10,14],s:[0,2,4,5,7,9,10],a:[4,9,10,14],b:[10,14,16,21]},
  '13':{t:[0,4,10,14,21],s:[0,2,4,7,9,10],a:[4,9,10,14],b:[10,14,16,21]},
  '7b9':{t:[0,4,7,10,13],s:[0,1,3,4,7,9,10],a:[4,7,10,13],b:[10,13,16,19]},
  '7alt':{t:[0,4,10,13,15,20],s:[0,1,3,4,6,8,10],a:[4,10,13,15],b:[10,13,16,20]},
  m7b5:{t:[0,3,6,10],s:[0,2,3,5,6,8,10],a:[3,6,10,12],b:[10,12,15,18]},
  sus:{t:[0,5,7,10,14],s:[0,2,5,7,9,10],a:[5,10,14,19],b:[10,14,17,19]},
  m11q:{t:[0,3,7,10,14,17],s:[0,2,3,5,7,9,10],a:[2,7,12,17,21],b:[0,5,10,15,19]},   // 모달 — 도리안 · 4도 쌓기 둘(9-5-근-11-13 / 근-11-7-3-5)
  dim7:{t:[0,3,6,9],s:[0,2,3,5,6,8,9,11],a:[3,6,9,12],b:[9,12,15,18]}
};
/* ── 곡 ─────────────────────────────────────────────────────────────────────────────
   bpm · sw(스윙 — 0.5 곧게 · 0.67 셋잇단) · prog(마디마다 [근음, 성질] 또는 반 마디씩 둘) · comp(반주) · bass · drums · lead(선율 꼴) · rv(울림: room · hall · cave) · cut(거르개) */
const MU_SONGS={
  limecave:{n:'석회 동굴', d:'어둡고 느린 쿨 재즈 · 단조 · 낮게 깔린 베이스 · 스네어 고스트', bpm:62, sw:0.62, cave:1,
    prog:[['C','m9'],['C','m9'],['Ab','maj7'],['G','7alt'],['C','m9'],['F','m9'],['D','m7b5'],['G','7b9']],
    comp:'evansLow', bass:'two', bassGhost:0.35, drums:'ghost', lead:'dark', rv:'cave', rvA:0.55, cut:2600, gain:{bass:1.05}},
  granitecave:{n:'화강암 동굴', d:'다크 아카데미아 재즈 · 쪼개진 화음 · 무거운 베이스 · 또렷한 하이햇', bpm:84, sw:0.6, cave:1,
    prog:[['D','mmaj7'],['D','m7'],['Bb','maj7'],['A','7b9'],['G','m9'],['Eb','maj7s11'],['E','m7b5'],['A','7alt']],
    comp:'academia', bass:'walk', bassGhost:0.15, arco:1, drums:'hats', lead:'academia', rv:'cave', rvA:0.45, cut:3400, gain:{bass:1.0}},
  amethystcave:{n:'자수정 동굴', d:'실로폰 · 글리산도 · 반짝이는 리디아 화음 · 깊은 울림', bpm:76, sw:0.5, cave:1,
    prog:[['E','maj7s11'],['E','maj7s11'],['C#','m9'],['C#','m9'],['A','maj7s11'],['A','maj7s11'],['B','sus'],['B','sus']],
    comp:'pad', bass:'drone', drums:'mallet', lead:'xylo', rv:'cave', rvA:0.65, cut:6000},
  canyon:{n:'협곡', d:'비밥 · 알토 색소폰 프레이징 · 협곡의 메아리', bpm:196, sw:0.6, echo:1,
    prog:[[['Bb','maj7'],['G','7b9']],[['C','m7'],['F','7']],[['D','m7'],['G','7alt']],[['C','m7'],['F','7']],[['F','m7'],['Bb','7']],[['Eb','maj7'],['Ab','7']],[['D','m7'],['Db','7']],[['C','m7'],['F','7']]],
    comp:'swing', bass:'walk', drums:'bebop', lead:'bebop', rv:'hall', rvA:0.25, cut:5200},
  conifer:{n:'침엽수림', d:'쿨 재즈 · 부드러운 피아노(빌 에번스풍) · 어두운 베이스 고스트 노트', bpm:72, sw:0.62,
    prog:[['A','m9'],['D','13'],['G','maj7'],['C','maj7'],['F#','m7b5'],['B','7b9'],['E','m9'],['E','7alt']],
    comp:'evans', bass:'walk', bassGhost:0.4, drums:'brush', lead:'evans', rv:'room', rvA:0.35, cut:3600},
  drylands:{n:'마른 땅', d:'미디엄 스윙 · 부드러운 트럼펫(쳇 베이커풍)', bpm:120, sw:0.63,
    prog:[['F','maj7'],[['G','m7'],['C','7']],['A','m7'],['D','7b9'],[['G','m7'],['C','7']],['F','69'],[['Bb','7'],['A','7alt']],[['D','m7'],['G','7']]],
    comp:'swingSoft', bass:'walk', drums:'brushSwing', lead:'chet', rv:'room', rvA:0.3, cut:4200},
  jungle:{n:'밀림', d:'모달 재즈(도리안에 오래 머문다 · 다크 아카데미아) · 하몬 뮤트 트럼펫 · 빌 에번스풍 부드러운 피아노 코드 · 브러시와 라이드', bpm:136, sw:0.62,
    prog:[...Array(16).fill(['D','m11q']),...Array(8).fill(['Eb','m11q']),...Array(8).fill(['D','m11q'])],
    comp:'modal', bass:'walk', bassGhost:0.2, drums:'cobb', lead:'miles', rv:'room', rvA:0.34, cut:4300},
  coastal:{n:'바닷가', d:'보사노바 · 나일론 기타의 짧은 릭(주앙 질베르투풍)', bpm:128, sw:0.5,
    prog:[['G','maj7'],['G','maj7'],['E','m9'],['A','13'],['A','m9'],['D','7b9'],['B','m7'],['E','7b9'],['A','m9'],['D','13'],['G','69'],['D','sus']],
    comp:'bossa', bass:'bossa', drums:'bossa', lead:'gilberto', solo:{every:24,len:8,lead:'gtrSolo'}, rv:'room', rvA:0.28, cut:5600},
  mountains:{n:'산', d:'스윙 · 묵직한 재즈 드럼 · 부드러운 빅밴드', bpm:152, sw:0.64,
    prog:[['Eb','maj7'],['C','m7'],['F','m7'],['Bb','7'],[['G','m7'],['C','7']],[['F','m7'],['Bb','7']],[['Eb','maj7'],['Ab','7']],[['G','m7'],['C','7alt']]],
    comp:'bigband', bass:'walk', drums:'bigswing', lead:'section', rv:'hall', rvA:0.3, cut:5000, gain:{drums:1.25}},
  cliff:{n:'벼랑', d:'산처럼 스윙 · 관악이 부르고 거울처럼 되받는다', bpm:148, sw:0.64,
    prog:[['G','m9'],['C','13'],['F','maj7'],['Bb','maj7'],['E','m7b5'],['A','7alt'],['D','m9'],['D','7alt']],
    comp:'bigband', bass:'walk', drums:'bigswing', lead:'mirror', rv:'hall', rvA:0.34, cut:5000, gain:{drums:1.1}},
  wetland:{n:'습지', d:'느리게 · 프렛리스 베이스의 미끄러짐과 해머온', bpm:58, sw:0.58,
    prog:[['D','m9'],['G','13'],['D','m9'],['G','13'],['Bb','maj7'],['A','sus'],['D','m9'],[['E','m7b5'],['A','7b9']]],
    comp:'gtrArp', bass:'fretless', drums:'wet', lead:'none', rv:'hall', rvA:0.42, cut:3000, gain:{bass:1.1}},
  water:{n:'물속', d:'느리고 서늘한 보사 · 물에 잠긴 소리', bpm:84, sw:0.5, cave:1,
    prog:[['F','maj7'],['F','maj7'],['E','m9'],['E','m9'],['Eb','maj7s11'],['Eb','maj7s11'],['D','m9'],['Db','maj7']],
    comp:'bossa', bass:'bossa', drums:'none', lead:'water', rv:'hall', rvA:0.6, cut:1300}
};
const MU_ORDER=['coastal','conifer','jungle','drylands','mountains','cliff','canyon','wetland','limecave','granitecave','amethystcave','water'];
/* 선율 꼴 — ins 악기 · rng 음역 · dens 빽빽함 · phr/rest 마디 · step 걸음(반음) · leap 뛰기 · appr 반음 다가가기(비밥) · leg 이어 불기 · vel · lay 박 뒤로(초) */
const MU_LEAD={
  dark:{ins:'piano', rng:[50,72], dens:'sparse', phr:[2,3], rest:[2,3], step:[1,3], leap:0.15, appr:0.05, leg:1.0, vel:[0.32,0.5], lay:0.03, sync:0.25, trill:0.12, gl:0.08, chord:0.45},
  academia:{ins:'piano', rng:[64,86], dens:'medium', phr:[2,4], rest:[1,2], step:[1,2], leap:0.1, appr:0.2, turn:0.35, leg:0.95, vel:[0.38,0.58], lay:0.01, sync:0.2, trill:0.35, gl:0.15, chord:0.35},
  xylo:{ins:'xylo', rng:[72,96], dens:'medium', phr:[2,3], rest:[1,2], step:[2,4], leap:0.25, appr:0.0, gliss:0.7, leg:1.0, vel:[0.45,0.7], lay:0, sync:0.22, trill:0.3, gl:0.0, chord:0},
  bebop:{ins:'alto', rng:[56,81], dens:'dense', phr:[2,4], rest:[1,1], step:[1,2], leap:0.18, appr:0.55, leg:0.92, vel:[0.5,0.78], lay:0, sync:0.38, trill:0.15, gl:0.25, chord:0},
  evans:{ins:'piano', rng:[62,86], dens:'medium', phr:[2,3], rest:[1,2], step:[1,3], leap:0.2, appr:0.15, leg:1.0, vel:[0.34,0.58], lay:0.02, sync:0.3, trill:0.15, gl:0.22, chord:0.55},
  chet:{ins:'tpt', rng:[57,77], dens:'sparse', phr:[2,3], rest:[1,2], step:[1,3], leap:0.12, appr:0.1, leg:0.97, vel:[0.38,0.6], lay:0.035, scoop:0.55, fall:0.12, sync:0.3, trill:0.06, gl:0.12, chord:0},
  hardbop:{ins:'unison', rng:[58,79], dens:'riff', phr:[4,4], rest:[0,0], step:[1,3], leap:0.2, appr:0.35, leg:0.85, vel:[0.55,0.8], lay:0, sync:0.45, trill:0.1, gl:0.25, chord:0},
  gilberto:{ins:'gtr', rng:[62,82], dens:'lick', phr:[1,2], rest:[1,2], step:[1,3], leap:0.1, appr:0.1, leg:0.9, vel:[0.5,0.68], lay:0.01, sync:0.4, trill:0.05, gl:0.3, chord:0.35},
  section:{ins:'section', rng:[67,82], dens:'medium', phr:[2,4], rest:[2,2], step:[1,3], leap:0.15, appr:0.1, leg:0.95, vel:[0.4,0.6], lay:0, sync:0.35, trill:0.1, gl:0.18, chord:0},
  mirror:{ins:'mirror', rng:[64,80], dens:'medium', phr:[2,2], rest:[2,2], step:[1,3], leap:0.2, appr:0.15, leg:0.92, vel:[0.45,0.65], lay:0, sync:0.35, trill:0.1, gl:0.2, chord:0},
  water:{ins:'piano', rng:[64,84], dens:'sparse', phr:[2,3], rest:[2,3], step:[2,4], leap:0.2, appr:0, leg:1.0, vel:[0.3,0.45], lay:0.03, sync:0.1, trill:0.2, gl:0.3, chord:0.3},
  gtrSolo:{ins:'gtr', rng:[67,90], dens:'medium', mix:0.3, phr:[2,4], rest:[0,1], step:[1,3], leap:0.22, appr:0.3, leg:0.95, vel:[0.55,0.82], lay:0, sync:0.45, trill:0.12, gl:0.4, chord:0.4},   // 바닷가 솔로 — 높게 · 빽빽함을 섞고 · 미끄러짐 · 겹음
  miles:{ins:'tptM', rng:[58,79], dens:'sparse', phr:[2,4], rest:[2,3], step:[1,3], leap:0.2, appr:0.05, leg:1.0, vel:[0.42,0.62], lay:0.04, scoop:0.3, fall:0.18, sync:0.3, trill:0.03, gl:0.1, chord:0},
  none:null
};
function musicVol(v){ MUS.vol=v; }

/* ── 표본 빚기 ───────────────────────────────────────────────────────────────────── */
function muBQ(d,sr,type,f,q,db){                                     // 2차 거르개(RBJ) — 빚은 표본에 한 번
  const w=2*Math.PI*Math.min(f,sr*0.45)/sr, cs=Math.cos(w), sn=Math.sin(w), al=sn/(2*q), ga=Math.pow(10,(db||0)/40); let b0,b1,b2,a0,a1,a2;
  if(type==='lp'){ b0=(1-cs)/2; b1=1-cs; b2=b0; a0=1+al; a1=-2*cs; a2=1-al; }
  else if(type==='hp'){ b0=(1+cs)/2; b1=-(1+cs); b2=b0; a0=1+al; a1=-2*cs; a2=1-al; }
  else if(type==='bp'){ b0=al; b1=0; b2=-al; a0=1+al; a1=-2*cs; a2=1-al; }
  else { b0=1+al*ga; b1=-2*cs; b2=1-al*ga; a0=1+al/ga; a1=-2*cs; a2=1-al/ga; }
  b0/=a0; b1/=a0; b2/=a0; a1/=a0; a2/=a0; let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<d.length;i++){ const x=d[i], y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2; x2=x1; x1=x; y2=y1; y1=y; d[i]=y; } return d; }
function muNorm(d,pk){ let m=1e-9; for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(a>m) m=a; } const k=pk/m; for(let i=0;i<d.length;i++) d[i]*=k; return d; }
function muBuf(d,sr){ const b=A.ctx.createBuffer(1,d.length,sr); b.getChannelData(0).set(d); return b; }
function muFade(d,sr,a){ const n=Math.min(d.length,Math.floor(sr*a)); for(let i=0;i<n;i++) d[i]*=i/n; return d; }
/* 카플러스-스트롱 줄 — 뜯은 자리 빗살 · 들뜬 소리의 무르기(soft) · 고리 거르개(두 점 평균 — 반 칸 늦음을 빼 음높이를 맞춘다) · t60 사그라듦 */
function muKS(f0,dur,t60,pos,soft){
  const sr=MU_SR, n=Math.floor(sr*dur), d=new Float32Array(n), P=sr/f0-0.5, damp=Math.pow(10,-3/(t60*f0)), L=Math.max(2,Math.round(P)), ex=new Float32Array(L);
  let lp=0; for(let i=0;i<L;i++){ lp=lp*soft+(Math.random()*2-1)*(1-soft); ex[i]=lp; }
  const pk=Math.max(1,Math.round(L*pos)); for(let i=L-1;i>=pk;i--) ex[i]-=ex[i-pk];
  let prev=0;
  for(let i=0;i<n;i++){ let y=i<L?ex[i]:0; const r=i-P; if(r>=0){ const i0=r|0, fr=r-i0, yd=d[i0]*(1-fr)+d[i0+1]*fr; y+=damp*0.5*(yd+prev); prev=yd; } d[i]=y; }
  return d; }
function muGet(key,mk){ let b=MUS.cache.get(key); if(!b){ b=mk(); MUS.cache.set(key,b); } return b; }
/* 피아노 — 줄 둘 · 배음 18 · 비조화 B · 두 겹 사그라듦 · 망치 자리 · 망치 소리 */
function muPianoBuf(m,vb){ return muGet('p'+m+'_'+vb,()=>{
  const sr=MU_SR, f0=mtof(m), dur=m<48?3.4:m<62?2.9:m<76?2.3:1.7, n=Math.floor(sr*dur), d=new Float32Array(n);
  const B=0.00012*Math.pow(2,(m-40)/13), tau1=Math.min(3.2,Math.max(0.4,1.7*Math.pow(261.6/f0,0.6))), br=[0.55,0.85,1.15][vb];
  for(let k=1;k<=18;k++){ const fk=k*f0*Math.sqrt(1+B*k*k); if(fk>Math.min(sr*0.46,6000)) break;
    const a=Math.pow(k,-0.9)*Math.exp(-(k-1)*0.30/br)*(0.3+0.7*Math.abs(Math.sin(Math.PI*k/7.3)));
    const tau=tau1/(1+0.33*(k-1)), tF=tau*0.22, rF=Math.exp(-1/(tF*sr)), rS=Math.exp(-1/(tau*sr));
    const DT=k<=5?(m>=48?[0.9997,1,1.0003]:[0.99965,1.00035]):[1];   // 깊이(사용자 요청 2026-11-05) — 가운데부터는 줄 셋 · 낮은 배음에서 맥놀이 · 뒤에 남는 울림(eS) 몫을 키운다
    for(const dt of DT){ const w=2*Math.PI*fk*dt/sr, cw=Math.cos(w), sw=Math.sin(w), ka=2/DT.length; let x=0, y=1, eF=0.42*a*ka, eS=0.58*a*ka;
      for(let i=0;i<n;i++){ const nx=x*cw+y*sw; y=y*cw-x*sw; x=nx; d[i]+=x*(eF+eS); eF*=rF; eS*=rS; if((i&511)===0&&eF+eS<3e-5) break; } } }   // 다 사그라든 배음은 그만 센다
  const hl=Math.floor(sr*0.014), hm=new Float32Array(hl); for(let i=0;i<hl;i++) hm[i]=(Math.random()*2-1)*(1-i/hl);
  muBQ(hm,sr,'lp',900+900*br,0.7); for(let i=0;i<hl;i++) d[i]+=hm[i]*0.35*br;
  muBQ(d,sr,'peak',130,0.8,3.5); muBQ(d,sr,'peak',290,1.0,2); muBQ(d,sr,'peak',3200,1.2,-2);   // 몸통 · 울림판의 낮은 울림을 키우고 쇳소리를 조금 눅인다
  muFade(d,sr,0.002); return muBuf(muNorm(d,0.8),sr); }); }
/* 콘트라베이스 — 손가락 살로 무르게 뜯기(들뜸을 많이 눅여 튕김을 줄인다 · 사용자 요청 2026-11-05) · 몸통(90 Hz) · 줄 소리는 520 Hz 위로 두 번 눅인다 ·
   길게 남는다(t60 2.8 s) · dead: 죽은 음(손으로 눌러 막은 고스트) */
function muBassBuf(m,dead){ return muGet('b'+m+(dead?'d':''),()=>{
  const sr=MU_SR, f0=mtof(m), d=dead?muKS(f0,0.18,0.08,0.34,0.88):muKS(f0,2.8,2.8*Math.pow(55/f0,0.25),0.32,0.86);
  muBQ(d,sr,'lp',dead?420:520,0.6); muBQ(d,sr,'lp',dead?700:900,0.5); muBQ(d,sr,'peak',95,1.4,3); if(!dead) muBQ(d,sr,'peak',400,1.0,-2);
  muFade(d,sr,0.004); muNorm(d,1);
  /* 펀치 · 줄 타격(사용자 요청 2026-11-05 — '콘트라베이스 특유의 줄 튕기는 소리를 앞에 · 소리를 줄여 펀치하게'):
     첫 90 ms 만 세게 쳤다가 울림 높이로 내려앉고(뒤의 서스테인은 그대로) · 손가락 살이 줄을 치는 '퉁'(낮은 가운데 700 Hz · 25 ms) ·
     줄이 손가락을 떠나며 지판을 치는 '탁'(1.9 kHz · 6 ms) — 줄 소리는 거르개를 지난 뒤에 더해 머리에만 밝다 */
  const pn=Math.floor(sr*0.35); for(let i=0;i<pn&&i<d.length;i++){ const t=i/sr; d[i]*=0.62+0.55*Math.exp(-t/0.09); } for(let i=pn;i<d.length;i++) d[i]*=0.62+0.55*Math.exp(-0.35/0.09);
  const tl=Math.floor(sr*0.06), th=new Float32Array(tl), sn=new Float32Array(tl);
  for(let i=0;i<tl;i++){ const t=i/sr; th[i]=(Math.random()*2-1)*Math.exp(-t/0.025)*Math.min(1,t/0.0015); sn[i]=(Math.random()*2-1)*Math.exp(-t/0.006); }
  muBQ(th,sr,'bp',700,0.9); muBQ(th,sr,'lp',1400,0.7); muBQ(sn,sr,'bp',1900,1.4); muNorm(th,1); muNorm(sn,1);
  const ka=dead?0.55:0.38, ks=dead?0.3:0.22; for(let i=0;i<tl&&i<d.length;i++){ d[i]+=th[i]*ka+sn[i]*ks; }
  muFade(d,sr,0.0015); return muBuf(muNorm(d,dead?0.45:0.8),sr); }); }
/* 나일론 기타 — 손가락 살로 지판 쪽을 무르게(음들이 섞이게 · 사용자 요청 2026-11-05) · 몸통 울림(105 · 220 Hz) · 2.2 kHz 위로 눅인다 · 길게 남는다 */
function muGtrBuf(m){ return muGet('g'+m,()=>{
  const sr=MU_SR, f0=mtof(m), d=muKS(f0,3.2,2.9*Math.pow(196/f0,0.35),0.33,0.6+0.25*Math.min(1,f0/330));
  muBQ(d,sr,'peak',105,2,4); muBQ(d,sr,'peak',220,1.5,2.5); muBQ(d,sr,'lp',1900,0.6); muBQ(d,sr,'lp',3000,0.5);
  muFade(d,sr,0.005); return muBuf(muNorm(d,0.8),sr); }); }
/* 솔로 기타(사용자 요청 2026-11-05 — '톤은 두꺼우나 높은 솔로') — 리듬 기타보다 줄 가운데 쪽을 조금 세게 뜯어 또렷하고 ·
   몸통(110 Hz) · 두께(260 Hz) · 앞으로 나오는 결(1.2 kHz)을 세우고 · 쇳소리는 3.6 kHz 위로 눅인다 */
function muGtrLBuf(m){ return muGet('gl'+m,()=>{
  const sr=MU_SR, f0=mtof(m), d=muKS(f0,3.0,2.7*Math.pow(196/f0,0.3),0.24,0.5);
  muBQ(d,sr,'peak',110,1.6,3); muBQ(d,sr,'peak',260,1.1,4); muBQ(d,sr,'peak',1200,1.2,2.5); muBQ(d,sr,'lp',3600,0.6); muBQ(d,sr,'lp',5200,0.5);
  muFade(d,sr,0.003); return muBuf(muNorm(d,0.8),sr); }); }
/* 프렛리스 — 둥글고 길게 우는 줄(무른 들뜸 · 오래 남는다) · '므와' 는 칠 때 거르개로 */
function muFretBuf(m){ return muGet('f'+m,()=>{
  const sr=MU_SR, f0=mtof(m), d=muKS(f0,3.4,4.0,0.38,0.9);
  muBQ(d,sr,'lp',800,0.6); muBQ(d,sr,'lp',1300,0.5); muBQ(d,sr,'peak',80,1.2,3);
  muFade(d,sr,0.004); return muBuf(muNorm(d,0.85),sr); }); }
/* 실로폰 — 장미목 막대: 모드 1 · 3(열두째음에 맞춘 첫 배음) · 6.2 · 9.9 · 위로 갈수록 짧다 · 채 소리 */
function muXyloBuf(m){ return muGet('x'+m,()=>{
  const sr=MU_SR, f0=mtof(m), n=Math.floor(sr*1.2), d=new Float32Array(n);
  const MD=[[1,1,0.45*Math.pow(523/f0,0.5)],[3.0,0.42,0.13],[6.2,0.15,0.05],[9.9,0.07,0.028]];
  for(const [r,a,tau] of MD){ const f=f0*r; if(f>sr*0.46) continue; const w=2*Math.PI*f/sr, cw=Math.cos(w), sw=Math.sin(w), rr=Math.exp(-1/(tau*sr)); let x=0,y=1,e=a;
    for(let i=0;i<n;i++){ const nx=x*cw+y*sw; y=y*cw-x*sw; x=nx; d[i]+=x*e; e*=rr; } }
  const cl=Math.floor(sr*0.004), c=new Float32Array(cl); for(let i=0;i<cl;i++) c[i]=(Math.random()*2-1)*(1-i/cl); muBQ(c,sr,'bp',3600,0.8);
  for(let i=0;i<cl;i++) d[i]+=c[i]*0.6;
  muFade(d,sr,0.0008); return muBuf(muNorm(d,0.8),sr); }); }
/* 북 — 한 번 빚어 둔다 */
function muDrumBuf(k){ return muGet('d'+k,()=>{
  const sr=(k==='hat'||k==='hatO'||k==='hatP'||k==='shk')?A.ctx.sampleRate:(k==='ride'||k==='rideB'||k==='crash')?32000:MU_SR;
  const L={kick:0.5,snare:0.35,snG:0.18,xs:0.09,hat:0.14,hatO:0.7,hatP:0.06,ride:2.0,rideB:1.6,crash:2.3,brT:0.14,brS:1.2,tom1:0.5,tom2:0.55,tom3:0.6,shk:0.1,tam:0.16,tamM:0.07}[k];
  const n=Math.floor(sr*L), d=new Float32Array(n), N=()=>Math.random()*2-1;
  const sine=(f,a,tau,f1,ft)=>{ let ph=0; for(let i=0;i<n;i++){ const t=i/sr, ff=f1?f+(f1-f)*Math.exp(-t/ft):f; ph+=2*Math.PI*ff/sr; d[i]+=Math.sin(ph)*a*Math.exp(-t/tau); } };
  const noise=(a,tau,att,fl)=>{ const z=new Float32Array(n); for(let i=0;i<n;i++){ const t=i/sr; z[i]=N()*a*Math.exp(-t/tau)*(att?Math.min(1,t/att):1); } if(fl) fl(z); for(let i=0;i<n;i++) d[i]+=z[i]; };
  if(k==='kick'){ sine(60,1,0.17,125,0.022); noise(0.25,0.004,0,z=>muBQ(z,sr,'lp',3000,0.7)); noise(0.12,0.06,0,z=>muBQ(z,sr,'lp',250,0.7)); }
  else if(k==='snare'||k==='snG'){ const g=k==='snG'; sine(190,g?0.35:0.6,0.055); sine(335,g?0.15:0.3,0.035);
    noise(g?0.5:0.9,g?0.06:0.12,0.001,z=>{ muBQ(z,sr,'bp',2100,0.6); }); noise(g?0.15:0.45,g?0.05:0.16,0.001,z=>muBQ(z,sr,'hp',4800,0.7)); if(g) muBQ(d,sr,'lp',3800,0.7); }
  else if(k==='xs'){ sine(480,0.6,0.02); sine(1250,0.4,0.015); sine(2300,0.2,0.01); noise(0.5,0.008,0,z=>muBQ(z,sr,'bp',1900,1.2)); }
  else if(k==='hat'||k==='hatO'||k==='hatP'){ const F=[205.3,304.4,369.6,522.7,540,800], tau=k==='hat'?0.022:k==='hatO'?0.2:0.012;
    for(let i=0;i<n;i++){ const t=i/sr; let s=0; for(const f of F) s+=Math.sin(2*Math.PI*f*1.72*t)>0?1:-1; d[i]=s/6*Math.exp(-t/tau)*Math.min(1,t/0.0005); }
    muBQ(d,sr,'hp',k==='hatP'?4200:6800,0.7); muBQ(d,sr,'hp',6800,0.7); muBQ(d,sr,'peak',10500,1,5);
    noise(k==='hatP'?0.15:0.3,tau*0.8,0,z=>muBQ(z,sr,'hp',8000,0.7)); }
  else if(k==='ride'||k==='rideB'||k==='crash'){ const bell=k==='rideB', cr=k==='crash';
    /* 비조화 배음 스물(쇠판의 모드 — 낮을수록 오래) + 쇠 울림 봉우리 여섯을 세운 잡음(씻기는 소리 — 배음을 예순 개 세던 것보다 열 배 싸다) */
    for(let p=0;p<(bell?16:20);p++){ const f=bell?muR(650,2800):340*Math.pow(26,Math.random()), a=(bell?1.4:1)*muR(0.3,1)/Math.sqrt(f/340), tau=cr?muR(0.6,1.6):muR(0.5,2.0)*Math.pow(340/f,0.25)*(bell?1.4:1);
      const w=2*Math.PI*f/sr, cw=Math.cos(w), sw=Math.sin(w), rr=Math.exp(-1/(tau*sr)); let x=Math.random(), y=Math.sqrt(1-x*x), e=a;
      for(let i=0;i<n;i++){ const nx=x*cw+y*sw; y=y*cw-x*sw; x=nx; d[i]+=x*e; e*=rr; } }
    noise(cr?3.0:1.2,cr?0.7:0.6,0.001,z=>{ const zz=z.slice(); z.fill(0); for(const f of [3150,4720,5830,7410,9120,11300]){ const y=muBQ(zz.slice(),sr,'bp',Math.min(f,sr*0.44),6); for(let i=0;i<n;i++) z[i]+=y[i]; } muBQ(z,sr,'hp',2500,0.7); });
    noise(cr?1.2:0.3,cr?0.5:0.2,0.001,z=>muBQ(z,sr,'hp',6000,0.7)); if(!cr){ sine(4300,0.5,0.05); sine(5650,0.35,0.04); }
    muBQ(d,sr,'hp',300,0.7); }
  else if(k==='brT'){ noise(1,0.045,0.004,z=>muBQ(z,sr,'bp',3000,0.5)); }
  else if(k==='brS'){ for(let i=0;i<n;i++){ const t=i/L/sr; d[i]=N()*Math.pow(Math.sin(Math.PI*t),1.5)*(0.6+0.4*Math.sin(t*Math.PI*6)); } muBQ(d,sr,'bp',2600,0.4); }
  else if(k.startsWith('tom')){ const f={tom1:175,tom2:140,tom3:108}[k]; sine(f,1,0.22,f*1.5,0.03); noise(0.3,0.05,0,z=>muBQ(z,sr,'bp',f*3,1)); }
  else if(k==='shk'){ noise(1,0.03,0.012,z=>muBQ(z,sr,'hp',6000,0.7)); }
  else if(k==='tam'||k==='tamM'){ const m=k==='tamM';                  // 탐보림 — 팽팽한 작은 가죽(15 cm)을 채로: 높게 '딱' 울리고(첫 모드 720 Hz · 둘째 1.59배) · 채 닿는 소리 · tamM 은 밑을 손가락으로 막아 짧고 먹먹하게
    sine(720,1,m?0.012:0.045,960,0.006); sine(1145,0.45,m?0.008:0.025); sine(1610,0.2,m?0.006:0.015); noise(m?0.5:0.7,m?0.004:0.007,0,z=>muBQ(z,sr,'bp',3200,0.9)); if(m) muBQ(d,sr,'lp',2600,0.7); }
  return muBuf(muNorm(d,0.85),sr); }); }

/* ── 소리 길(버스) — 악기마다 → 곡 거르개 → 마른 소리 + 울림(방 · 홀 · 굴) + 메아리(협곡) → MUS.gain → A.master ── */
function muIR(sec,dark){
  const C=A.ctx, sr=C.sampleRate, n=Math.floor(sr*sec), b=C.createBuffer(2,n,sr), pre=Math.floor(sr*0.018);
  for(let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0;
    let env=1, k=0.3; for(let i=pre;i<n;i++){ if(((i-pre)&63)===0){ const t=(i-pre)/(n-pre); k=dark?0.35+0.6*t:0.15+0.5*t; env=Math.pow(1-t,2.2)*Math.exp(-t*2.5)*(1+k); }
      lp=lp*k+(Math.random()*2-1)*(1-k); d[i]=lp*env; } }
  return b; }
function musInit(){
  if(MUS.bus||!A.ctx||!A.master) return !!MUS.bus;
  const C=A.ctx;
  MUS.gain=C.createGain(); MUS.gain.gain.value=0; MUS.gain.connect(A.master);
  /* 마스터링(2026-11-05 사용자 요청 '곡들을 잘 만들고 마스터링해 게임에 맞게'): 섞은 소리(MUS.mix — 마른 소리 + 울림 + 메아리)
     → 묶음 압축(2.5:1 · −20 dB · 느리게 — 한 덩어리로) → 음색(90 Hz 밑 +1.5 dB 따뜻하게 · 2.8 kHz −3 dB — 발소리 · 총소리 · 안내음 자리를 비운다 · 9 kHz 위 −1.5 dB)
     → 곡마다 크기 맞춤(MU_TRIM 고정 + 느린 자동 음량 MUS.norm) → 덕킹(다치거나 쏘면 −4 dB) → 리미터(−2 dB · 20:1 · 빠르게) → 크기(MUS.gain) */
  MUS.lim=C.createDynamicsCompressor(); MUS.lim.threshold.value=-2; MUS.lim.knee.value=0; MUS.lim.ratio.value=20; MUS.lim.attack.value=0.002; MUS.lim.release.value=0.12; MUS.lim.connect(MUS.gain);
  MUS.duckG=C.createGain(); MUS.duckG.connect(MUS.lim);
  MUS.norm=C.createGain(); MUS.norm.connect(MUS.duckG);
  MUS.an=C.createAnalyser(); MUS.an.fftSize=2048; MUS.norm.connect(MUS.an); MUS.anBuf=new Float32Array(2048);
  let tone=MUS.norm; for(const [ty,f,q,db] of [['highshelf',9000,0.7,-1.5],['peaking',2800,0.8,-3],['lowshelf',90,0.7,1.5]]){ const b=C.createBiquadFilter(); b.type=ty; b.frequency.value=f; b.Q.value=q; b.gain.value=db; b.connect(tone); tone=b; }
  MUS.glue=C.createDynamicsCompressor(); MUS.glue.threshold.value=-20; MUS.glue.knee.value=10; MUS.glue.ratio.value=2.5; MUS.glue.attack.value=0.02; MUS.glue.release.value=0.25; MUS.glue.connect(tone);
  MUS.mix=C.createGain(); MUS.mix.connect(MUS.glue);
  MUS.bus=C.createBiquadFilter(); MUS.bus.type='lowpass'; MUS.bus.frequency.value=4000; MUS.bus.Q.value=0.5; MUS.bus.connect(MUS.mix);
  MUS.rev={}; MUS.revG={};
  for(const [k,s,dk] of [['room',1.6,0],['hall',2.8,0],['cave',5.2,1]]){ const cv=C.createConvolver(); cv.buffer=muIR(s,dk); const g=C.createGain(); g.gain.value=0;
    MUS.bus.connect(g); g.connect(cv); cv.connect(MUS.mix); MUS.rev[k]=cv; MUS.revG[k]=g; }
  /* 협곡의 메아리 — 0.42초 · 되먹임 0.3 · 되돌아올수록 어둡다 */
  MUS.dly=C.createDelay(1.5); MUS.dly.delayTime.value=0.42; MUS.dlyFb=C.createGain(); MUS.dlyFb.gain.value=0.3; MUS.dlyLp=C.createBiquadFilter(); MUS.dlyLp.type='lowpass'; MUS.dlyLp.frequency.value=2400;
  MUS.dlyG=C.createGain(); MUS.dlyG.gain.value=0; MUS.bus.connect(MUS.dlyG); MUS.dlyG.connect(MUS.dly); MUS.dly.connect(MUS.dlyLp); MUS.dlyLp.connect(MUS.dlyFb); MUS.dlyFb.connect(MUS.dly); MUS.dlyLp.connect(MUS.mix);
  MUS.ins={};
  /* 악기마다 — 크기 · 저역 덜기(베이스가 아닌 것은 110 Hz 밑 · 베이스는 38 Hz 밑 웅웅거림만 · 북은 30 Hz) · 자리(좌우).
     선율 피아노(pianoL)는 반주 피아노와 길을 갈라 위로(재 보니 선율이 반주보다 작았다) · 관악기도 조금 올림 */
  for(const [k,pan,g,hp] of [['piano',-0.25,0.48,110],['pianoL',0.08,0.68,110],['bass',0,0.5,38],['gtr',-0.2,0.42,110],['gtrL',0.18,0.9,110],['xylo',0.2,0.5,140],['horn',0.12,0.55,120],['horn2',-0.3,0.42,90],['drums',0.05,0.6,30]]){
    const gn=C.createGain(); gn.gain.value=g; const h=C.createBiquadFilter(); h.type='highpass'; h.frequency.value=hp; h.Q.value=0.6; gn.connect(h);
    const p=C.createStereoPanner?C.createStereoPanner():null; if(p){ p.pan.value=pan; h.connect(p); p.connect(MUS.bus); } else h.connect(MUS.bus);
    MUS.ins[k]={g:gn, base:g}; }
  MUS.noise=A.noise;
  return true;
}
/* ── 치기 ── */
function muPlay(buf,t,gain,dest,o){
  o=o||{}; const C=A.ctx; if(!(t>=C.currentTime)) t=C.currentTime;   // 앞당겨 치는 꾸밈음(글리산도)이 지난 시각으로 가지 않게
  const s=C.createBufferSource(); s.buffer=buf; const g=C.createGain(); g.gain.value=0;
  if(o.rate) s.playbackRate.setValueAtTime(o.rate,t);
  if(o.from){ s.playbackRate.setValueAtTime(o.from*(o.rate||1),t); s.playbackRate.exponentialRampToValueAtTime(o.rate||1,t+(o.glide||0.08)); }
  const at=o.att||0.001; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+at);
  let node=s; if(o.flt){ o.flt(s,t); node=o.fltOut; }
  node.connect(g); g.connect(dest||MUS.ins.drums.g);
  const end=o.dur!=null?t+o.dur:t+buf.duration/(o.rate||1);
  if(o.dur!=null){ g.gain.setValueAtTime(gain,Math.max(t+at,end)); g.gain.setTargetAtTime(0,Math.max(t+at,end),o.rel||0.08); }
  s.start(t,o.off||0); s.stop(Math.min(t+buf.duration/(o.rate||1)+0.05,end+(o.rel||0.08)*6+0.05));
  return s; }
const muHit=(k,t,v,o)=>{ if(v>0.005) muPlay(muDrumBuf(k),t,v*v*0.9,MUS.ins.drums.g,o); };
function muPiano(m,t,dur,v,bus){ m=Math.round(Math.min(100,Math.max(28,m))); muPlay(muPianoBuf(m,v<0.42?0:v<0.68?1:2),t,0.25+0.75*v*v,MUS.ins[bus||'piano'].g,{dur,rel:0.24}); }
function muBass(m,t,dur,v,dead){ m=Math.round(Math.min(64,Math.max(26,m))); muPlay(muBassBuf(m,dead),t,(dead?0.45:0.5+0.5*v)*v,MUS.ins.bass.g,{dur:dead?undefined:dur*1.08,att:0.01,rel:0.16}); }
function muArco(m,t,dur,v){ m=Math.round(Math.min(60,Math.max(26,m))); muPlay(muFretBuf(m),t,0.55*v,MUS.ins.bass.g,{dur,att:0.22,rel:0.35,off:0.05}); }
function muGtr(m,t,dur,v,o){ o=o||{}; m=Math.round(Math.min(o.lead?90:84,Math.max(40,m)));
  if(o.lead){ const oo={dur:dur*1.15,att:0.004,rel:0.22,from:o.slide?Math.pow(2,o.slide/12):0,glide:o.glide||0.07}, g=0.45+0.55*v*v;   // 솔로 — 제 소리 길 · 살짝 어긋난 둘째 줄을 얹어 두껍게
    muPlay(muGtrLBuf(m),t,g,MUS.ins.gtrL.g,oo); muPlay(muGtrLBuf(m),t+0.011,g*0.38,MUS.ins.gtrL.g,Object.assign({},oo,{rate:1.0023})); return; }
  muPlay(muGtrBuf(m),t,0.4+0.5*v*v,MUS.ins.gtr.g,{dur:dur*1.25,att:0.006,rel:0.3,from:o.slide?Math.pow(2,o.slide/12):0,glide:o.glide||0.07}); }
function muXylo(m,t,v){ m=Math.round(Math.min(100,Math.max(60,m))); muPlay(muXyloBuf(m),t,0.25+0.75*v*v,MUS.ins.xylo.g); }
/* 프렛리스 — '므와'(봉우리 거르개가 380 → 950 → 520 Hz) · from: 앞 음에서 미끄러져 · ham: 해머온(뜯지 않고 — 들뜬 머리를 건너뛴다) */
function muFret(m,t,dur,v,o){
  o=o||{}; m=Math.round(Math.min(64,Math.max(26,m))); const C=A.ctx;
  const flt=(s,tt)=>{ const p=C.createBiquadFilter(); p.type='peaking'; p.Q.value=1.6; p.gain.value=3.5; p.frequency.setValueAtTime(320,tt); p.frequency.linearRampToValueAtTime(700,tt+0.14); p.frequency.setTargetAtTime(430,tt+0.16,0.3); s.connect(p); oo.fltOut=p; };
  const oo={dur:dur*1.08,rel:0.22,att:o.ham?0.015:0.01,off:o.ham?0.045:0,flt,from:o.from!=null?mtof(o.from)/mtof(m):0,glide:o.glide||0.14};
  muPlay(muFretBuf(m),t,(0.35+0.65*v)*v,MUS.ins.bass.g,oo); }
/* 관악기 — 톱니파 둘(앙상블로 조금 어긋나게) · 세기를 따라 열리는 거르개 · 포먼트 · 숨소리 · 퍼올림 · 늦게 오는 떨림 · 떨어뜨리기 */
const MU_HORN={
  tpt:{o:[['sawtooth',1,0.5],['sawtooth',1.0025,0.5]], base:1.4, mul:3.2, max:2700, F:[[1150,1.4,5],[2350,2,3]], att:0.05, rel:0.12, br:0.07, vh:5.0, vc:14, bus:'horn'},
  tptB:{o:[['sawtooth',1,0.5],['sawtooth',1.003,0.5]], base:1.8, mul:5.5, max:5200, F:[[1250,1.3,5],[2600,2,4]], att:0.03, rel:0.1, br:0.03, vh:5.4, vc:10, bus:'horn'},
  tptM:{o:[['sawtooth',1,0.5],['sawtooth',1.002,0.45]], base:2.6, mul:6.5, max:6500, F:[[320,0.7,-14],[1750,3,10],[3900,3,5],[900,1.5,-4]], att:0.045, rel:0.18, br:0.11, vh:5.0, vc:3, bus:'horn'},   // 하몬 뮤트 — 낮은 소리를 잘라 가늘고 콧소리(1.75 · 3.9 kHz) · 떨림을 거의 안 건다
  tbn:{o:[['sawtooth',1,0.5],['sawtooth',0.9975,0.5]], base:1.5, mul:3.6, max:1900, F:[[520,1.2,5],[1150,1.6,3]], att:0.06, rel:0.12, br:0.04, vh:4.6, vc:8, bus:'horn2'},
  alto:{o:[['sawtooth',1,0.45],['square',1,0.32],['sawtooth',2.002,0.12]], base:1.6, mul:4.6, max:4300, F:[[620,1.3,6],[1500,1.8,7],[2900,2.5,3]], att:0.02, rel:0.06, br:0.09, vh:5.6, vc:18, bus:'horn'},
  tenor:{o:[['sawtooth',1,0.45],['square',1,0.3],['sawtooth',2.002,0.1]], base:1.5, mul:4.2, max:3200, F:[[470,1.3,6],[1250,1.8,6],[2450,2.5,3]], att:0.025, rel:0.07, br:0.08, vh:5.2, vc:16, bus:'horn2'}
};
function muHorn(kind,m,t,dur,v,o){
  o=o||{}; const C=A.ctx, K=MU_HORN[kind], f=mtof(m), out=C.createGain(), lp=C.createBiquadFilter(), env=C.createGain();
  lp.type='lowpass'; lp.Q.value=0.6; let node=lp;
  for(const [ff,q,db] of K.F){ const p=C.createBiquadFilter(); p.type='peaking'; p.frequency.value=ff; p.Q.value=q; p.gain.value=db; node.connect(p); node=p; }
  node.connect(env); env.connect(MUS.ins[o.bus||K.bus].g);
  const att=o.att||K.att*(o.leg?0.5:1), end=t+dur, peak=Math.min(K.max,f*K.mul*(0.55+v)), base=f*K.base;
  env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(v*0.32,t+att); env.gain.setTargetAtTime(v*0.27,t+att,Math.max(0.05,dur*0.5));
  env.gain.setValueAtTime(v*0.27,end); env.gain.setTargetAtTime(0,end,K.rel/3);
  lp.frequency.setValueAtTime(base,t); lp.frequency.linearRampToValueAtTime(peak,t+att*1.3); lp.frequency.setTargetAtTime(peak*0.72,t+att*1.5,Math.max(0.06,dur*0.5)); lp.frequency.setTargetAtTime(base,end,K.rel/3);
  const oscs=[], stop=end+K.rel*3+0.05;
  for(const [ty,r,g] of K.o){ const os=C.createOscillator(), og=C.createGain(); os.type=ty; os.frequency.value=f*r; og.gain.value=g; os.connect(og); og.connect(lp); oscs.push(os); }
  const sc=o.scoop!=null?o.scoop:0, det=c=>{ for(const os of oscs) os.detune.setValueAtTime(c,t); };
  if(sc>0&&!o.leg){ det(-sc*100); for(const os of oscs) os.detune.linearRampToValueAtTime(0,t+0.07); }
  if(o.rip&&!o.leg){ const c0=-o.rip*100; for(const os of oscs){ os.detune.setValueAtTime(c0,t); os.detune.linearRampToValueAtTime(0,t+0.13); } }   // 립 — 밑에서 쓸어 올라 닿는다(글리산도)
  if(o.trill){ const st=0.072, a=t+Math.min(0.12,dur*0.15), b=t+dur*0.72; let k=0;                      // 트릴 — 윗음과 번갈아(음높이를 계단으로)
    for(let x=a;x<b;x+=st,k++) for(const os of oscs) os.detune.setValueAtTime(k%2?0:o.trill*100,x);
    for(const os of oscs) os.detune.setValueAtTime(0,b); }
  if(o.fall){ for(const os of oscs){ os.detune.setValueAtTime(0,end-0.04); os.detune.linearRampToValueAtTime(-450,end+0.22); } env.gain.setTargetAtTime(0,end,0.08); }
  if(dur>0.42){ const lf=C.createOscillator(), lg=C.createGain(); lf.frequency.value=K.vh*muR(0.94,1.06); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(0,t+Math.min(0.3,dur*0.4));
    lg.gain.linearRampToValueAtTime(K.vc*(o.vib||1),t+Math.min(0.75,dur*0.85)); lf.connect(lg); for(const os of oscs) lg.connect(os.detune); lf.start(t); lf.stop(stop); }
  if(MUS.noise&&K.br>0){ const ns=C.createBufferSource(); ns.buffer=MUS.noise; const bp=C.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=Math.min(6000,f*3); bp.Q.value=0.9;
    const ng=C.createGain(); ng.gain.setValueAtTime(0,t); ng.gain.linearRampToValueAtTime(K.br*v*1.6,t+att*0.6); ng.gain.setTargetAtTime(K.br*v*0.45,t+att,0.06); ng.gain.setTargetAtTime(0,end,0.05);
    ns.connect(bp); bp.connect(ng); ng.connect(env); ns.start(t,Math.random()*1.5); ns.stop(stop); }
  for(const os of oscs){ os.start(t); os.stop(stop); }
}

/* ── 화성 도구 ── */
function muBars(S){ if(S._bars) return S._bars;
  return S._bars=S.prog.map(b=>Array.isArray(b[0])?b.map((c,k)=>({pc:MU_PC[c[0]],q:MU_Q[c[1]],at:k*2,len:2})):[{pc:MU_PC[b[0]],q:MU_Q[b[1]],at:0,len:4}]); }
const muAt=(bar,p)=>{ let c=bar[0]; for(const x of bar) if(p>=x.at) c=x; return c; };
const muNear=(pc,last,lo,hi)=>{ let best=lo+((pc-lo)%12+12)%12, bd=1e9; for(let m=best;m<=hi;m+=12){ const dd=Math.abs(m-last); if(dd<bd){ bd=dd; best=m; } } return best; };
function muVoice(c,prev,lo){                                         // 왼손 보이싱 — a/b 가운데 앞 화음에서 덜 움직이는 쪽
  let best=null, bs=1e9;
  for(const V of [c.q.a,c.q.b]) for(let o=-12;o<=12;o+=12){ const v=V.map(x=>c.pc+x+o+48); while(v[0]<lo) for(let i=0;i<v.length;i++) v[i]+=12; while(v[0]>lo+11) for(let i=0;i<v.length;i++) v[i]-=12;
    const s=prev?v.reduce((a,x,i)=>a+Math.abs(x-(prev[i]||x)),0):Math.abs(v[0]-lo-5); if(s<bs){ bs=s; best=v; } }
  return best; }
const muScale=(c,lo,hi,tones)=>{ const a=[], st=tones?c.q.t:c.q.s; for(let m=lo;m<=hi;m++) if(st.some(x=>(c.pc+x-m)%12===0)) a.push(m); return a; };
const muSwing=(p,sw)=>{ const b=Math.floor(p+1e-6), f=p-b; if(Math.abs(f-0.5)<1e-3) return b+sw; if(Math.abs(f-0.25)<1e-3) return b+sw*0.5; if(Math.abs(f-0.75)<1e-3) return b+sw+(1-sw)*0.5; return p; };

/* ── 마디 하나를 건다 ─────────────────────────────────────────────────────────────── */
function muBar(S,t0,bi){
  const st=MUS.st, wx=MUS.curWx, bars=muBars(S), bar=bars[bi%bars.length], nxBar=bars[(bi+1)%bars.length], nx=nxBar[0];
  const bpm=S.bpm*(wx==='rain'?0.82:1), bt=60/bpm;
  const sw=wx==='dry'?0.5+(S.sw-0.5)*0.5:S.sw;                       // 맑으면 덜 끈적하게(스윙을 곧게)
  const ghostK=wx==='dry'?0.35:wx==='rain'?1.2:1;
  const T=(p,j)=>t0+muSwing(p,sw)*bt+(j||0)*(Math.random()-0.5);
  const reg=wx==='rain'?-1:wx==='dry'?1:0;                           // 음역 — 비 오면 낮게 · 맑으면 높게
  /* 반주 */
  const CP=S.comp, cl=(CP==='evansLow'?45:CP==='academia'?50:52)+reg*5;
  for(const c of bar){
    const v=st.v=muVoice(c,st.v,cl);
    if(CP==='evans'||CP==='evansLow'||CP==='pad'){
      if(c.at===0&&st.antic){ st.antic=false; continue; }
      const roll=CP==='pad'?0.04:0.018, vv=CP==='pad'?0.3:muR(0.32,0.46);
      v.forEach((m,k)=>muPiano(m,T(c.at,0.01)+k*roll,c.len*bt*0.95,vv*(k===v.length-1?1.08:1)));
      if(CP!=='pad'&&c.len===4&&Math.random()<0.3) v.slice(2).forEach(m=>muPiano(m,T(2.5,0.01),bt*1.2,vv*0.8));
    }else if(CP==='modal'){
      /* 모달(사용자 요청 2026-11-05 — '빌 에번스풍 부드러운 코드') — 4도 쌓기를 무르게 굴려 길게 놓고 · 안쪽 한 음이 음계로 한 칸 올랐다 돌아오고 ·
         엇박에서 음계 안으로 한 칸 위로 옮겼다(평행) 돌아오는 두 화음 · 화음이 바뀌기 앞 마디는 반음 위에서 미끄러져 내려온다 */
      const sc=c.q.s.map(x=>(c.pc+x)%12), plane=(vv,dn)=>vv.map(m=>{ let q=m+dn; while(!sc.includes(((q%12)+12)%12)) q+=dn; return q; });
      const ch=nx.pc!==c.pc, r=Math.random(), vv=muR(0.26,0.36);
      if(c.at===0&&st.antic){ st.antic=false; }
      else if(r<0.45){ v.forEach((m,k)=>muPiano(m,T(c.at,0.01)+k*0.028,bt*3.8,vv*(k===v.length-1?1.1:0.95)));
        if(Math.random()<0.55){ const k=1+((Math.random()*(v.length-2))|0), up=plane([v[k]],1)[0]; muPiano(up,T(2,0.01),bt*0.95,vv*0.85); muPiano(v[k],T(3,0.01),bt*1.2,vv*0.8); } }
      else if(r<0.8){ const hp=muPick([[1.5,2],[2.5,3],[1.5,3.5]]), u=plane(v,1);
        u.forEach((m,k)=>muPiano(m,T(hp[0],0.008)+k*0.012,bt*0.5,vv*0.9)); v.forEach((m,k)=>muPiano(m,T(hp[1],0.008)+k*0.016,bt*(4-hp[1])*1.05,vv)); }
      else if(r<0.9){ const u=plane(v,-1); v.forEach((m,k)=>muPiano(m,T(0,0.01)+k*0.03,bt*1.6,vv)); u.forEach((m,k)=>muPiano(m,T(2.5,0.01)+k*0.02,bt*1.5,vv*0.85)); }
      if(ch){ const nv=muVoice(nx,st.v,cl); nv.map(m=>m+1).forEach((m,k)=>muPiano(m,T(3.5,0.01)+k*0.02,bt*0.45,vv*0.9)); }
    }else if(CP==='swing'||CP==='swingSoft'||CP==='hardbop'){
      const pats=CP==='hardbop'?[[0.5,2.5],[1.5,3.5],[0,1.5,3],[2.5,3.5],[0.5,1.5,3.5]]:CP==='swing'?[[0,1.5],[1.5,3.5],[0.5,2],[1,2.5],[2,3.5]]:[[0,1.5],[2,3.5],[1.5],[0,2.5]];
      for(const p of muPick(pats)){ if(p<c.at||p>=c.at+c.len) continue; const vv=CP==='hardbop'?muR(0.5,0.68):CP==='swing'?muR(0.4,0.55):muR(0.32,0.45);
        v.forEach(m=>muPiano(m,T(p,0.008),bt*(CP==='swingSoft'?0.8:p%1?0.55:0.38),vv*(p%1?1.2:0.9))); }
    }else if(CP==='academia'){
      if(bi%4===3){ v.forEach((m,k)=>muPiano(m,T(c.at,0.01)+k*0.012,c.len*bt*0.9,0.4)); continue; }
      const lo=muNear(c.pc,st.al||43,36,48); st.al=lo; const seq=[lo,v[0],v[2],v[1],v[3],v[1],v[2],v[0]];
      for(let e=0;e<c.len*2;e++) muPiano(seq[e%8]+(e%8===0?0:0),T(c.at+e*0.5,0.008),bt*0.6,e%2?0.3:0.38);
    }else if(CP==='bossa'){
      const tl=muNear(c.pc,st.gl||45,40,52); st.gl=tl; const tf=tl+7>55?tl-5:tl+7;
      muGtr(c.at===0?tl:tl,T(c.at),bt*1.6,0.5); if(c.len===4) muGtr(tf,T(2),bt*1.6,0.45);
      const top=v.slice(1).map(m=>m+(m<55?12:0)), pat=(bi%2===0?[0,0.75,1.5,2.5,3.25]:[0.5,1.5,2.5,3.25]).filter(p=>p>=c.at&&p<c.at+c.len);
      const sk=muSolo(S,bi)?0.7:1; for(const p of pat) top.forEach((m,k)=>muGtr(m,T(p,0.006)+k*0.006,bt*0.45,muR(0.36,0.46)*sk));
    }else if(CP==='gtrArp'){
      const lo=muNear(c.pc,st.gl||45,40,52); st.gl=lo; const seq=[lo,v[1]+12>76?v[1]:v[1]+12,v[2],v[3]+12>79?v[3]:v[3]+12,v[2],v[1]];
      for(let e=0;e<c.len*1.5;e++) muGtr(seq[e%seq.length],T(c.at+e*(2/3),0.01),bt*1.6,e%3?0.32:0.4);
    }else if(CP==='bigband'){
      if(c.at===0&&(bi%2===0||bar.length>1)){ const sv=muVoice(c,st.sv,58+reg*4); st.sv=sv;
        sv.forEach((m,k)=>muHorn(k<2?'tbn':'tptB',k<2?m-12:m,T(c.at,0.01),c.len*bt*(bi%2===0&&bar.length===1?1.9:0.95),0.38,{att:0.28,scoop:0,vib:0.5,bus:k<2?'horn2':'horn'})); }
      if(bi%4===3&&c===bar[bar.length-1]){ const sv=muVoice(nx,st.sv,62); sv.forEach((m,k)=>muHorn(k<2?'tbn':'tptB',k<2?m-12:m,T(3.5),bt*0.6,0.55,{scoop:0.2,bus:k<2?'horn2':'horn'})); }
      if(Math.random()<0.35){ const pl=muScale(c,74,88,true); muPiano(muPick(pl),T(muPick([1.5,2.5,3.5]),0.01),bt*0.4,0.38); }
    }
  }
  if((CP==='evans'||CP==='evansLow')&&Math.random()<0.22&&nxBar.length===1){ const v=muVoice(nx,st.v,cl); st.v=v; st.antic=true; v.forEach((m,k)=>muPiano(m,T(3.5,0.01)+k*0.016,bt*3,0.36)); }
  /* 베이스 */
  const BS=S.bass, bv=0.85;
  if(BS==='walk'){
    for(let b=0;b<4;b++){ const c=muAt(bar,b), cn=b===3?nx:muAt(bar,b+1); let m;
      if(b===c.at) m=muNear(c.pc,st.bl||36,28,43);
      else if(b===3||cn.at===b+1&&cn!==c){ const tg=muNear(cn.pc,st.bl||36,28,45); m=tg+(Math.random()<0.6?(st.bl>tg?1:-1):7-12*(tg+7>47?1:0)); }
      else { const sc=muScale(c,26,50,Math.random()<0.6), tg=muNear(cn.pc,st.bl,28,45); let best=sc[0], bd=1e9; for(const x of sc){ if(x===st.bl) continue; const dd=Math.abs(x-(st.bl+Math.sign(tg-st.bl||1)*muR(1,4))); if(dd<bd){ bd=dd; best=x; } } m=best; }
      if(S.bassGhost&&b>0&&Math.random()<S.bassGhost*ghostK) muBass(m,T(b-1/3,0.006),0.1,0.5,true);
      muBass(m,T(b,0.008),bt*0.9,bv*(b%2?0.92:1)); st.bl=m; }
    if(S.arco&&bi%4===0) muArco(muNear(bar[0].pc,36,31,43)-12+12,T(0),bt*7.5,0.5);
  }else if(BS==='two'){
    const c=bar[0], r=muNear(c.pc,st.bl||36,28,40), fv=r+7>45?r-5:r+7;
    muBass(r,T(0,0.008),bt*1.9,bv); muBass(fv,T(2,0.008),bt*1.7,bv*0.9); st.bl=fv;
    if(Math.random()<0.5){ const tg=muNear(nx.pc,fv,28,42); muBass(tg+(fv>tg?1:-1),T(3.5,0.006),bt*0.45,bv*0.75); }
    if(S.bassGhost) for(const p of [1+2/3,3+2/3]) if(Math.random()<S.bassGhost*ghostK) muBass(p<2?r:fv,T(p,0.006),0.1,0.45,true);
  }else if(BS==='bossa'){
    for(const c of bar){ const r=muNear(c.pc,st.bl||36,31,43), fv=r+7>47?r-5:r+7;
      muBass(r,T(c.at),bt*1.4,bv*0.85); muBass(fv,T(c.at+1.5),bt*0.45,bv*0.7);
      if(c.len===4){ muBass(fv,T(2),bt*1.4,bv*0.8); muBass(Math.random()<0.5?muNear(nx.pc,r,31,43):r,T(3.5),bt*0.45,bv*0.7); } st.bl=r; }
  }else if(BS==='drone'){
    if(bi%2===0){ const r=muNear(bar[0].pc,33,28,40); muArco(r,T(0),bt*7.6,0.55); muArco(r+7,T(0)+0.05,bt*7.6,0.25); }
  }else if(BS==='fretless'){
    /* 습지 — 프렛리스가 노래한다: 마디마다 둘셋 · 화음 음으로 미끄러져 들어가고 · 가끔 해머온(윗음 잠깐 올렸다 돌아오기) · 첫 박은 낮은 근음일 때가 많다 */
    const c=bar[0], tones=muScale(c,33,60,true), rr=muNear(c.pc,st.bl||38,28,40);
    const rhy=muPick([[[0,1.5],[1.5,1],[2.5,1.5]],[[0,2],[2,2]],[[0,1],[1,2],[3,1]],[[0,3],[3,1]]]);
    rhy.forEach(([p,d],k)=>{ const ci=muAt(bar,p), tn=muScale(ci,33,60,true); let m=k===0&&Math.random()<0.55?rr:tn.reduce((a,x)=>Math.abs(x-(st.bl+muR(-5,5)))<Math.abs(a-(st.bl+muR(-5,5)))?x:a,tn[0]);
      const slide=k>0&&Math.random()<0.6, from=slide?st.bl:(Math.random()<0.3?m-2:null);
      muFret(m,T(p,0.012),d*bt*1.02,muR(0.6,0.85),{from,glide:slide?0.16:0.09});
      if(d>=1.5&&Math.random()<0.35){ const up=tn.find(x=>x>m)||m+2; muFret(up,T(p+d*0.55),bt*0.25,0.6,{ham:1}); muFret(m,T(p+d*0.55)+bt*0.25,bt*(d*0.45-0.25),0.55,{ham:1}); }
      st.bl=m; });
  }
  /* 북 */
  const D=S.drums, hm=0.006, gk=ghostK;
  const ride=vmul=>{ for(const [p,v] of [[0,0.48],[1,0.56],[1.5,0.38],[2,0.48],[3,0.56],[3.5,0.38]]) muHit('ride',T(p,hm*0.5),v*vmul*muR(0.9,1.08)); };   // 딩 — 딩-가 딩 — 딩-가
  if(D==='ghost'){                                                     // 석회 동굴 — 킥 하나 · 스네어 고스트 16분 · 크로스 스틱 4 · 하이햇 발 2·4
    muHit('kick',T(0,hm),0.5); if(Math.random()<0.4) muHit('kick',T(2.5,hm),0.35);
    for(let s=0;s<16;s++){ const p=s/4; if(s===12) continue; if(Math.random()<(s%4===2?0.5:0.22)*gk) muHit('snG',T(p,hm),muR(0.14,0.26)); }
    muHit('xs',T(3,hm),0.45); muHit('hatP',T(1,hm),0.4); muHit('hatP',T(3,hm),0.4);
    if(bi%4===3) muHit('brS',T(2,hm),0.25);
  }else if(D==='hats'){                                                // 화강암 동굴 — 스윙 16분 하이햇 · 열린 하이햇 강세 · 림
    for(let s=0;s<16;s++){ const p=s/4, acc=s%4===0?0.55:s%4===2?0.42:0.26; if(s%4===1||s%4===3){ if(Math.random()>0.55*gk) continue; }
      if(s===14&&Math.random()<0.5) muHit('hatO',T(p,hm),0.4); else muHit('hat',T(p,hm*0.5),acc*muR(0.85,1.1)); }
    muHit('kick',T(0,hm),0.45); if(Math.random()<0.5) muHit('kick',T(2.5,hm),0.3); muHit('xs',T(1,hm),0.35); muHit('xs',T(3,hm),0.42);
    if(Math.random()<0.4*gk) muHit('snG',T(muPick([1.5,2.5,3.75]),hm),0.2);
  }else if(D==='mallet'){                                              // 자수정 동굴 — 셰이커 살짝 · 라이드를 채로 굴려 부풀린다
    for(let s=0;s<8;s++) if(Math.random()<0.6) muHit('shk',T(s/2,hm),s%2?0.18:0.25);
    if(bi%2===0){ const C=A.ctx, t=T(0); for(let k=0;k<14;k++) muHit('ride',t+k*bt*0.28,0.08+0.18*(k/13)); }
  }else if(D==='bebop'){                                               // 협곡 — 라이드 딩 딩-가 딩 · 하이햇 2·4 · 스네어 · 킥 컴핑(가끔 '폭탄')
    ride(1); muHit('hatP',T(1,hm),0.5); muHit('hatP',T(3,hm),0.5);
    for(let k=0;k<3;k++) if(Math.random()<0.45*gk) muHit(Math.random()<0.8?'snG':'snare',T(muPick([0.5,1.5,2.5,3.5,2+2/3,3+2/3]),hm),muR(0.18,0.4));
    if(Math.random()<0.22) muHit('kick',T(muPick([1.5,3.5,2.5]),hm),0.6); muHit('kick',T(0,hm),0.22);
  }else if(D==='brush'||D==='brushSwing'){                             // 침엽수림 · 마른 땅 — 브러시 쓸기 + 2·4 두드림 · 하이햇 발
    muHit('brS',T(0,hm),0.32); muHit('brS',T(2,hm),0.3);
    muHit('brT',T(1,hm),0.42); muHit('brT',T(3,hm),0.45);
    if(D==='brushSwing'){ for(const p of [1.5,3.5]) muHit('brT',T(p,hm),0.25); }
    if(Math.random()<0.5*gk) muHit('brT',T(muPick([2.5,0.5,3+2/3]),hm),0.2);
    muHit('hatP',T(1,hm),0.3); muHit('hatP',T(3,hm),0.3); muHit('kick',T(0,hm),0.25);
  }else if(D==='hardbop'){                                             // 밀림 — 바쁜 하이햇(16분 · 열림 강세) · 당김음 스네어 · 킥 폭탄
    for(let s=0;s<16;s++){ const p=s/4; if(s%2&&Math.random()>0.75) continue; if((s===6||s===14)&&Math.random()<0.6) muHit('hatO',T(p,hm*0.5),0.42); else muHit('hat',T(p,hm*0.5),(s%4===0?0.5:s%2?0.24:0.36)*muR(0.85,1.1)); }
    ride(0.55);
    for(const p of muPick([[1.5,3.5],[0.5,2.5],[1.5,2.5,3.5],[2+2/3,3.5]])) muHit('snare',T(p,hm),muR(0.35,0.55));
    for(let k=0;k<3;k++) if(Math.random()<0.5*gk) muHit('snG',T(muPick([0.25,0.75,1.25,2.75,3.25]),hm),muR(0.15,0.25));
    muHit('kick',T(0,hm),0.5); if(Math.random()<0.5) muHit('kick',T(muPick([1.5,2.5,3.5]),hm),0.6);
    if(bi%4===3){ muHit('tom1',T(3,hm),0.55); muHit('tom2',T(3+1/3,hm),0.55); muHit('tom3',T(3+2/3,hm),0.6); }
  }else if(D==='bossa'){                                               // 바닷가 — 림 클라베(2마디) · 셰이커 16분 · 킥 1·3 쯤
    const cl=bi%2===0?[0,0.75,1.5,2.5,3]:[0.5,1.5,2.5];
    for(const p of cl) muHit('xs',T(p,hm),0.32);
    for(let s=0;s<16;s++) muHit('shk',T(s/4,hm*0.5),(s%4===0?0.32:s%2?0.16:0.22)*muR(0.85,1.1));
    muHit('kick',T(0,hm),0.4); muHit('kick',T(1.5,hm),0.25); muHit('kick',T(2,hm),0.38); muHit('kick',T(3.5,hm),0.22);
    /* 탐보림(사용자 요청 2026-11-05 — 신나는 보사에는 특유의 탐) — 빠른 곡(110 bpm 위)에서만 · 비 오면 안 치고 · 맑으면 늘 · 보통이면 여덟 마디 걸러 여덟 마디
       텔레코-테코(삼바 2/4 두 마디 = 이 4/4 한 마디의 16분 0 2 4 5 7 · 9 11 12 14) · 열린 '딱' 은 강세 자리 · 나머지는 막은 음 · 넷째 마디는 16분으로 몰아 채운다 */
    if(S.bpm>=110&&wx!=='rain'&&(wx==='dry'||(bi>>3)%2===1)){
      if(bi%4===3) for(let s=8;s<16;s++) muHit(s%2?'tamM':'tam',T(s/4,hm*0.5),(0.28+0.03*(s-8))*muR(0.9,1.08));
      else for(const s of [0,2,4,5,7,9,11,12,14]) muHit(s===4||s===7||s===12||s===14?'tam':'tamM',T(s/4,hm*0.5),(s===4||s===7||s===12||s===14?0.42:0.26)*muR(0.88,1.1)); }
  }else if(D==='bigswing'){                                            // 산 · 벼랑 — 센 라이드 · 하이햇 2·4 · 스네어 컴핑 · 킥 4박을 살살(페더링) · 4마디마다 채움
    ride(1.2); muHit('hatP',T(1,hm),0.6); muHit('hatP',T(3,hm),0.6);
    for(let b=0;b<4;b++) muHit('kick',T(b,hm),0.2);
    for(let k=0;k<2;k++) if(Math.random()<0.55*gk) muHit('snG',T(muPick([0.5,1.5,2+2/3,3.5]),hm),muR(0.22,0.4));
    if(Math.random()<0.3) muHit('kick',T(muPick([1.5,3.5]),hm),0.7);
    if(bi%4===3){ for(let k=0;k<6;k++) muHit(k<3?'snare':'tom'+(k-2),T(2+k/3,hm),0.45+k*0.05); }
    if(bi%8===0) muHit('crash',T(0,hm),0.5);
  }else if(D==='cobb'){                                                // 밀림(모달) — 라이드를 살살 · 하이햇 발 2·4 · 브러시 고스트 · 킥은 깃털처럼 · 화음이 바뀌는 마디 첫 박에 심벌을 살짝
    ride(0.62); muHit('hatP',T(1,hm),0.42); muHit('hatP',T(3,hm),0.42);
    for(let b=0;b<4;b++) muHit('kick',T(b,hm),0.13);
    for(let k=0;k<2;k++) if(Math.random()<0.4*gk) muHit(Math.random()<0.6?'brT':'snG',T(muPick([1.5,2+2/3,3.5,0.5]),hm),muR(0.16,0.28));
    if(bars[(bi+bars.length-1)%bars.length][0].pc!==bar[0].pc||bi%32===0) muHit('crash',T(0,hm),0.3);
  }else if(D==='wet'){                                                 // 습지 — 느린 브러시 쓸기 · 가끔 림 · 라이드를 채로 살살
    muHit('brS',T(0,hm),0.28); muHit('brS',T(2,hm),0.24); if(Math.random()<0.5) muHit('xs',T(3,hm),0.25);
    if(bi%4===0) muHit('rideB',T(0,hm),0.22);
  }
  /* 선율 — 당김음 강세에 북이 받는다 */
  const la=muLead(S,bar,nx,bi,T,bt,reg)||[];
  for(const p of la){ if(Math.random()>0.6) continue;
    if(D==='bebop'||D==='hardbop'||D==='bigswing'||D==='cobb'){ muHit('kick',T(p,hm),D==='cobb'?0.4:0.6); if(Math.random()<0.5) muHit('snare',T(p,hm),0.42); }
    else if(D==='hats'||D==='ghost') muHit('snare',T(p,hm),0.38);
    else if(D==='brush'||D==='brushSwing') muHit('brT',T(p,hm),0.5);
    else if(D==='bossa') muHit('xs',T(p,hm),0.4); }
  /* 합주 강세 — 네 마디째 엇박에 반주 · 베이스 · 북이 함께 '탁'(3.5 면 다음 화음을 미리) · 길게 · 크게 */
  if(bi%4===3&&D!=='none'&&D!=='mallet'&&Math.random()<(wx==='rain'?0.35:0.6)){
    const hp=CP==='bigband'?3.5:muPick([3.5,3.5,2.5]), hc=hp===3.5?nx:muAt(bar,hp), hv=wx==='rain'?0.8:1;
    if(CP==='evans'||CP==='evansLow'||CP==='swing'||CP==='swingSoft'||CP==='hardbop'||CP==='academia'||CP==='pad'||CP==='modal'){
      const v=muVoice(hc,st.v,cl); v.forEach((m,k)=>muPiano(m,T(hp,0.006)+k*0.008,bt*1.7,0.72*hv)); muPiano(muNear(hc.pc,40,33,45),T(hp,0.006),bt*1.7,0.6*hv);
      if(hp===3.5&&nxBar.length===1&&(CP==='evans'||CP==='evansLow')){ st.v=v; st.antic=true; } }
    else if(CP==='bossa'||CP==='gtrArp'){ const v=muVoice(hc,st.v,52); v.forEach((m,k)=>muGtr(m+(m<55?12:0),T(hp,0.004)+k*0.012,bt*1.6,0.62*hv)); }
    if(BS!=='drone'){ const r=muNear(hc.pc,st.bl||36,28,43); (BS==='fretless'?muFret:muBass)(r,T(hp,0.004),bt*1.6,1.0*hv); }
    if(D==='bebop'||D==='hardbop'||D==='bigswing'||D==='cobb'){ const kk=D==='cobb'?0.6:1; muHit('kick',T(hp,hm),0.8*hv*kk); muHit('crash',T(hp,hm),0.5*hv*kk); }
    else if(D==='hats'||D==='ghost'){ muHit('kick',T(hp,hm),0.65*hv); muHit('snare',T(hp,hm),0.5*hv); muHit('hatO',T(hp,hm),0.4*hv); }
    else if(D==='brush'||D==='brushSwing'||D==='wet'){ muHit('kick',T(hp,hm),0.5*hv); muHit('brT',T(hp,hm),0.6*hv); muHit('rideB',T(hp,hm),0.3*hv); }
    else if(D==='bossa'){ muHit('kick',T(hp,hm),0.55*hv); muHit('xs',T(hp,hm),0.5*hv); }
  }
}
/* ── 선율 — 구(마디 둘~넷) · 쉼 · 강박엔 화음 음 · 약박엔 음계로 걷고 · 비밥은 반음으로 다가간다 · 모티프를 되풀이(리듬을 다시 쓴다) ── */
const MU_R={
  sparse:[[[0,1.5],[1.5,0.5],[2,2]],[[0.5,1],[1.5,0.5],[2,1],[3,1]],[[0,3]],[[1,1],[2,0.5],[2.5,1.5]],[[0,0.5],[0.5,0.5],[1,1],[2.5,1.5]],[[0,1],[1,1],[2,2]],[[1.5,2.5]]],
  medium:[[[0,0.5],[0.5,0.5],[1,0.5],[1.5,0.5],[2,1],[3,1]],[[0.5,0.5],[1,0.5],[1.5,1],[2.5,0.5],[3,1]],[[0,1/3],[1/3,1/3],[2/3,1/3],[1,1],[2,2]],[[0,1],[1,0.5],[1.5,0.5],[2,0.5],[2.5,1.5]],[[0,1.5],[1.5,0.5],[2,0.5],[2.5,0.5],[3,1]],[[0.5,1],[1.5,1],[2.5,1.5]]],
  riff:[[[0,0.5],[0.5,0.5],[1.5,0.5],[2.5,0.5],[3,0.5]],[[0.5,0.5],[1,0.5],[2,0.5],[2.5,1],[3.5,0.5]],[[0,1],[1.5,0.5],[2,0.5],[3.5,0.5]]],
  lick:[[[2.5,0.25],[2.75,0.25],[3,0.5],[3.5,0.5]],[[3,0.25],[3.25,0.25],[3.5,0.5]],[[0,0.5],[0.5,0.25],[0.75,0.75]],[[2,0.5],[2.5,0.5],[3,1]]]
};
function muRhythm(L){
  if(L.dens==='dense'){ const r=[]; const s0=Math.random()<0.35?0.5:0; for(let p=s0;p<4-1e-6;p+=0.5){ if(Math.random()<0.1) continue; if(p%1===0&&Math.random()<0.12){ r.push([p,1/3],[p+1/3,1/3],[p+2/3,1/3]); p+=0.5; continue; } r.push([p,0.5]); } return r; }
  return muPick(MU_R[L.dens]).map(x=>x.slice()); }
const muSolo=(S,bi)=>!!(S.solo&&(bi%S.solo.every)>=S.solo.every-S.solo.len);   // 솔로 마디인가(사용자 요청 2026-11-05 — 바닷가 보사에 짧은 기타 솔로)
function muLead(S,bar,nx,bi,T,bt,reg){
  const key=muSolo(S,bi)?S.solo.lead:S.lead, L=MU_LEAD[key]; if(!L) return [];
  const st=MUS.st, ls=st.ld||(st.ld={phr:0,rest:2,last:Math.round((L.rng[0]+L.rng[1])/2),dir:1,motif:null,mi:0,call:[],resp:null});
  if(ls.key!==key){ ls.key=key; ls.phr=0; ls.rest=0; ls.motif=null; ls.last=Math.round((L.rng[0]*0.4+L.rng[1]*0.6)); }   // 솔로로 들고 날 때 구를 새로
  const sh=reg*(L.ins==='xylo'?12:L.ins==='tpt'||L.ins==='alto'?5:7), lo=L.rng[0]+sh, hi=L.rng[1]+sh;
  if(ls.phr<=0){
    if(ls.rest>0){ ls.rest--;
      if(ls.resp&&ls.resp.length){ const R=ls.resp.shift(); for(const n of R) muHorn('tbn',n.m,T(n.p,0.008),n.d*bt*L.leg,n.v,{scoop:0.15}); }   // 벼랑 — 되받는 구는 쉬는 마디에
      return []; }
    ls.phr=muPick([L.phr[0],L.phr[1]]); ls.mi=0; if(Math.random()<0.5||!ls.motif) ls.motif=[]; ls.call=[]; }
  let rhy; if(L.mix&&Math.random()<L.mix) rhy=muRhythm({dens:'dense'}); else if(ls.motif&&ls.motif[ls.mi]&&Math.random()<0.6) rhy=ls.motif[ls.mi].map(x=>x.slice()); else { rhy=muRhythm(L); if(ls.motif) ls.motif[ls.mi]=rhy; }
  ls.mi++; ls.phr--; const last=ls.phr<=0;
  if(last&&rhy.length){ const e=rhy[rhy.length-1]; e[1]=Math.max(e[1],Math.min(4-e[0],1.5)); }
  if(L.ins==='xylo'&&ls.mi===1&&Math.random()<L.gliss){                 // 실로폰 — 구 앞에서 글리산도로 쓸어 올린다
    const c=bar[0], sc=muScale(c,lo-2,hi,false), first=sc[(sc.length*0.55)|0], run=sc.filter(m=>m<=first).slice(-9);
    run.forEach((m,k)=>muXylo(m,T(0)-bt*0.6+k*0.045,0.3+0.03*k)); ls.last=first; }
  const notes=[];
  for(let i=0;i<rhy.length;i++){ const [p,d]=rhy[i], c=muAt(bar,p), strong=Math.abs(p-Math.round(p))<1e-3;
    const nextStrong=i+1<rhy.length&&Math.abs(rhy[i+1][0]-Math.round(rhy[i+1][0]))<1e-3;
    if(ls.last>=hi-2) ls.dir=-1; else if(ls.last<=lo+2) ls.dir=1; else if(Math.random()<0.2) ls.dir=-ls.dir;
    const pool=muScale(c,lo,hi,strong||L.dens==='sparse'), want=ls.last+ls.dir*(Math.random()<L.leap?muR(4,7):muR(L.step[0],L.step[1]));
    let m=pool[0]; for(const x of pool) if(Math.abs(x-want)<Math.abs(m-want)&&x!==ls.last) m=x;
    if(nextStrong&&!strong&&Math.random()<L.appr){ const nc=muAt(bar,rhy[i+1][0]), tg=muScale(nc,lo,hi,true); let t2=tg[0]; for(const x of tg) if(Math.abs(x-(m+ls.dir*2))<Math.abs(t2-(m+ls.dir*2))) t2=x; m=t2+(Math.random()<0.5?1:-1); }
    if(L.turn&&strong&&d>=1&&Math.random()<L.turn){ const up=pool.find(x=>x>m)||m+2, dn=[...pool].reverse().find(x=>x<m)||m-1;   // 꾸밈 — 위 · 제 음 · 아래 · 제 음(턴)
      [[up,0],[m,1],[dn,2]].forEach(([q,k])=>notes.push({m:q,p:p+k*d/6,d:d/6,v:muR(L.vel[0],L.vel[1])*0.85,orn:1})); notes.push({m,p:p+d/2,d:d/2,v:muR(L.vel[0],L.vel[1])}); ls.last=m; continue; }
    notes.push({m,p,d,v:muR(L.vel[0],L.vel[1])*(p%1===0.5&&L.dens==='dense'?1.1:1)}); ls.last=m; }
  /* 강세 · 당김음 · 꾸밈(사용자 요청 2026-11-05 — '강조할 데는 길게 · 크게 · 당김음 세게 · 글리산도 · 피아노 코드 · 트릴') */
  const wk=MUS.curWx==='rain'?0.7:MUS.curWx==='dry'?1.2:1, sy=(L.sync||0)*wk, onB=x=>Math.abs(x-Math.round(x))<1e-3;
  for(let i=0;i<notes.length;i++){ const n=notes[i], pv=notes[i-1]; if(n.orn) continue;
    if(n.p>=1&&onB(n.p)&&Math.random()<sy&&(!pv||pv.p<=n.p-1+1e-3)){            // 정박을 반 박 앞으로 당겨 걸친다(푸시)
      if(pv) pv.d=Math.min(pv.d,n.p-0.5-pv.p); n.p-=0.5; n.d+=0.5; n.acc=1; n.sync=1; } }
  { const e=notes[notes.length-1]; if(e&&!e.orn&&e.p>=3&&!onB(e.p)&&Math.random()<sy*1.2){ e.d=Math.max(e.d,1.75); e.acc=1; e.sync=1; } }   // 마디 끝 엇박 음을 다음 마디로 끈다
  { let pk=null; for(const n of notes) if(!n.orn&&(!pk||n.m>pk.m)) pk=n; if(pk&&Math.random()<0.55) pk.acc=1; }                         // 구의 꼭대기
  if(last&&notes.length) notes[notes.length-1].acc=1;
  for(const n of notes){ if(n.orn) continue; if(!n.acc&&n.d>=1.5&&Math.random()<0.4) n.acc=1;
    if(n.acc){ n.v=Math.min(1,n.v*1.3+0.1); n.d*=1.4; } else n.v*=0.86; }                       // 세기의 높낮이를 벌린다
  const lay=L.lay*(MUS.curWx==='dry'?0:MUS.curWx==='rain'?1.5:1), acc=[];
  const step=L.ins==='xylo'?0.058:0.068;
  for(let i=0;i<notes.length;i++){ const n=notes[i], t=T(n.p,0.012)+lay, dur=n.d*bt*L.leg, leg=!n.acc&&i>0&&Math.abs(notes[i-1].p+notes[i-1].d-n.p)<1e-3, c=muAt(bar,n.p);
    if(n.sync) acc.push(n.p);
    const up=(muScale(c,n.m+1,n.m+3,false)[0])||n.m+2;
    const tr=!n.orn&&(n.acc||n.d>=1.5)&&dur>0.5&&Math.random()<(L.trill||0);
    const gl=!tr&&n.acc&&!leg&&Math.random()<(L.gl||0);
    const ch=n.acc&&!n.orn&&Math.random()<(L.chord||0), below=ch?muScale(c,n.m-11,n.m-1,true).reverse().slice(0,L.ins==='gtr'?1:3):[];
    if(L.ins==='piano'||L.ins==='xylo'||L.ins==='gtr'){
      const play=L.ins==='piano'?(m,tt,dd,vv)=>muPiano(m,tt,dd*1.1,vv,'pianoL'):L.ins==='xylo'?(m,tt,dd,vv)=>muXylo(m,tt,vv):(m,tt,dd,vv,oo)=>muGtr(m,tt,dd,vv,Object.assign({lead:1},oo));
      if(gl&&L.ins!=='gtr'){ const run=muScale(c,n.m-14,n.m-1,false).slice(-muPick([5,7,9])), sp=L.ins==='xylo'?0.04:0.03;    // 쓸어 올리기
        run.forEach((m,k)=>play(m,t-(run.length-k)*sp,0.12,n.v*(0.3+0.35*k/run.length))); }
      if(tr){ const nk=Math.max(4,Math.floor(dur*0.65/step)); for(let k=0;k<nk;k++) play(k%2?up:n.m,t+k*step,step*1.6,n.v*(k%2?0.62:0.74));
        play(n.m,t+nk*step,Math.max(0.15,dur-nk*step),n.v*0.8); }
      else play(n.m,t,dur,n.v,{slide:gl?-3:i===0&&Math.random()<0.4?-1:0,glide:gl?0.13:0.07});
      below.forEach((m,k)=>play(m,t+0.004*(k+1),dur,n.v*0.6));                                  // 피아노 블록 코드 · 기타 겹음
    }
    else if(L.ins==='tpt'||L.ins==='tptM') muHorn(L.ins,n.m,t,dur,n.v,{scoop:Math.random()<L.scoop?0.5:0,leg,rip:gl?6:0,trill:tr?up-n.m:0,fall:last&&i===notes.length-1&&Math.random()<L.fall});
    else if(L.ins==='alto') muHorn('alto',n.m,t,dur,n.v,{scoop:i===0||n.d>=1?0.3:0,leg,rip:gl?7:0,trill:tr?up-n.m:0});
    else if(L.ins==='unison'){ muHorn('tenor',n.m-12,t,dur,n.v*0.9,{leg,scoop:i===0?0.3:0,rip:gl?5:0}); muHorn('tpt',n.m,t+0.004,dur,n.v*0.75,{leg,scoop:0,rip:gl?5:0,trill:tr?up-n.m:0}); }
    else if(L.ins==='section'){ const tn=muScale(c,n.m-14,n.m-1,true).reverse().slice(0,3);   // 네 성부 밀집(리드 밑으로 화음 음 셋)
      muHorn('tptB',n.m,t,dur,n.v,{leg,scoop:0.15,rip:gl?5:0,trill:tr?up-n.m:0}); tn.forEach((q,k)=>muHorn(k<1?'tptB':'tbn',k<1?q:q-12,t+0.003*(k+1),dur,n.v*0.7,{leg,bus:k<1?'horn':'horn2',rip:gl?5:0})); }
    else if(L.ins==='mirror'){ muHorn('tptB',n.m,t,dur,n.v,{leg,scoop:0.2,rip:gl?6:0,trill:tr?up-n.m:0}); }
  }
  if(L.ins==='mirror'){ ls.call.push(notes); if(last){                  // 부른 구를 거울처럼(첫 음을 축으로 뒤집어) 트롬본이 되받는다
      const ax=ls.call[0]&&ls.call[0][0]?ls.call[0][0].m:60; ls.resp=ls.call.map(bn=>bn.map(n=>({m:Math.max(40,Math.min(70,2*ax-n.m-12)),p:n.p,d:n.d,v:n.v*0.9}))); ls.call=[]; } }
  if(last) ls.rest=L.ins==='mirror'?Math.max(2,(ls.resp||[]).length):muPick([L.rest[0],L.rest[1]]);
  return acc;
}

/* ── 지역 · 날씨 ── */
function musicRegion(){
  if(typeof skyUnder!=='undefined'&&skyUnder) return 'water';
  if(typeof PL==='undefined'||typeof F==='undefined'||!F.elev) return 'coastal';
  if(PL.under) return 'amethystcave';                                  // 땅속 세계 — 결정 · 빛나는 것
  const x=PL.pos.x, z=PL.pos.z;
  if(typeof caveAt==='function'){ const r=caveAt(x,z,0,true); if(r){ const k=(r.cave&&r.cave.kind)||'karst'; return (k==='talus'||k==='lava')?'granitecave':'limecave'; } }
  if(MUS.hiId!==GAME_ID){ let h=0; for(let i=0;i<F.elev.length;i+=7) if(F.elev[i]>h) h=F.elev[i]; MUS.hi=h; MUS.hiId=GAME_ID; }
  const gx=clamp(Math.round(x/CELL+N/2),1,N-2), gz=clamp(Math.round(z/CELL+N/2),1,N-2), i=IDX(gx,gz), b=F.biome[i], e=F.elev[i];
  if(typeof GEO_LF!=='undefined'&&GEO_LF.canyon){ const P0=GEO_LF.canyon; for(let k=0;k<P0.length;k+=2){ const j=P0[k], dx=(j%N-gx), dz=(((j/N)|0)-gz); if(dx*dx+dz*dz<36) return 'canyon'; } }
  if(b===B.ROCK||b===B.SCREE||e>MUS.hi*0.42||(typeof geoFloor==='function'&&geoFloor(x,z)>heightAt(x,z)+0.5)) return 'mountains';
  let smax=0; for(let dz=-3;dz<=3;dz+=3) for(let dx=-3;dx<=3;dx+=3){ const s=F.slope[IDX(clamp(gx+dx,0,N-1),clamp(gz+dz,0,N-1))]; if(s>smax) smax=s; }
  if(smax>1.0||(typeof cragNear==='function'&&cragNear(x,z,12))) return 'cliff';
  if(b===B.BEACH||b===B.DUNE||b===B.SHELF||b===B.DEEP||(F.dWater[i]<140&&e<15)) return 'coastal';
  if(b===B.MARSH||b===B.RIVER||(F.dRiver[i]<30&&F.moist[i]>0.55)) return 'wetland';
  if(b===B.BROADLEAF||b===B.BAMBOO) return 'jungle';
  if(b===B.CONIFER) return 'conifer';
  return 'drylands';
}
function musicWx(song){
  const S=MU_SONGS[song]; if(!S||S.cave||typeof WEA==='undefined') return 'mid';
  const r=WEA.rain||0, c=WEA.cover||0; return r>0.25?'rain':(r<0.03&&c<0.45?'dry':'mid');
}
/* ── 음악 듣기 — 곡 · 날씨를 골라 언제든(설정 창) ── */
function musicJuke(song,wx){
  MUS.juke=song&&MU_SONGS[song]?song:null; MUS.jukeWx=wx||'auto';
  if(MUS.juke){ if(typeof initAudio==='function') initAudio(); if(A.ctx&&A.ctx.state==='suspended') A.ctx.resume(); }
  else if(A.ctx&&typeof paused!=='undefined'&&(paused||!landed)) try{ A.ctx.suspend(); }catch(e){}       // 멈춘 동안 듣던 것을 끄면 다시 조용히
  MUS.chk=0;
}
(function(){
  const sj=document.getElementById('pJuke'), sw=document.getElementById('pJukeW'); if(!sj||!sw) return;
  sj.innerHTML='<option value="">자동 — 그 자리의 곡</option>'+MU_ORDER.map(k=>`<option value="${k}">${MU_SONGS[k].n} — ${MU_SONGS[k].d}</option>`).join('');
  sw.innerHTML=[['auto','날씨대로'],['dry','맑음 — 높은 음 · 가벼운 박'],['mid','보통'],['rain','비 — 낮은 음 · 느리게']].map(([k,n])=>`<option value="${k}">${n}</option>`).join('');
  const go=()=>musicJuke(sj.value,sw.value); sj.addEventListener('change',go); sw.addEventListener('change',go);
})();

/* ── 미리 빚기 — 곡이 쓸 표본을 한 번에 6 ms 씩 미리(처음 치는 마디에 표본을 빚느라 한 프레임이 0.1초 넘게 멈췄다) ── */
MUS.warmQ=[];
function muWarm(S){
  const q=MUS.warmQ; q.length=0; MUS.warmT=(A.ctx?A.ctx.currentTime:0)+10; const L=MU_LEAD[S.lead]||{}, add=(lo,hi,f)=>{ const c=(lo+hi)>>1; for(let d=0;d<=hi-lo;d++){ const m=c+(d%2?-1:1)*((d+1)>>1); if(m>=lo&&m<=hi) q.push(()=>f(m)); } };
  for(const k of ['kick','snare','snG','xs','hat','hatO','hatP','ride','rideB','brT','brS','shk','tom1','tom2','tom3','crash','tam','tamM']) q.push(()=>muDrumBuf(k));
  add(28,50,m=>muBassBuf(m,false));
  if(S.bassGhost) add(28,50,m=>muBassBuf(m,true));
  if(S.bass==='fretless'||S.bass==='drone'||S.arco) add(28,60,muFretBuf);
  if(S.comp==='bossa'||S.comp==='gtrArp') add(40,80,muGtrBuf);
  if(L.ins==='gtr'||S.solo) add(52,90,muGtrLBuf);
  if(L.ins==='xylo') add(60,100,muXyloBuf);
  if(/evans|academia|pad|swing|hardbop|bigband|modal/.test(S.comp)||L.ins==='piano'){ add(44,90,m=>muPianoBuf(m,0)); add(44,90,m=>muPianoBuf(m,1)); }
  /* 더 빚을 것(강세의 센 피아노 · 글리산도 · 블록 코드가 닿는 맨 낮은/높은 음) — 곡은 이것을 안 기다리고 시작한다(줄 끝에 남겨 두고 MUS.warmX 로 센다) */
  const n0=q.length;
  if(/evans|academia|pad|swing|hardbop|bigband|modal/.test(S.comp)||L.ins==='piano'){ add(46,92,m=>muPianoBuf(m,2)); for(const vb of [0,1]){ add(33,43,m=>muPianoBuf(m,vb)); add(91,96,m=>muPianoBuf(m,vb)); } }
  MUS.warmX=q.length-n0;
}
/* ── 일정 ── */
setInterval(()=>{
  if(MUS.off||typeof A==='undefined'||!A.ctx) return;                  // MUS.off — 시험(오프라인 그리기) 동안 일정을 멈춘다
  if(!musInit()) return;
  const C=A.ctx, now=C.currentTime;
  if(MUS.warmQ.length){ const w0=performance.now(); while(MUS.warmQ.length&&performance.now()-w0<6) MUS.warmQ.shift()(); }
  const hidden=(typeof winHidden!=='undefined'&&winHidden)||document.hidden;
  const juke=MUS.juke&&!hidden;
  const on=juke||(MUS.vol>0&&typeof landed!=='undefined'&&landed&&!paused&&!hidden&&!(typeof PL!=='undefined'&&PL.dead));
  if(now>MUS.chk){ MUS.chk=now+2;
    const pw=MUS.want; MUS.want=on?(juke?MUS.juke:musicRegion()):null; if(MUS.want&&MUS.want!==pw&&MUS.want!==MUS.cur) muWarm(MU_SONGS[MUS.want]);
    MUS.wx=MUS.want?(juke&&MUS.jukeWx!=='auto'?MUS.jukeWx:musicWx(MUS.want)):'mid';
    const vj=document.getElementById('vJuke'); if(vj){ const k=MUS.cur||MUS.want; const nm=k?MU_SONGS[k].n+({dry:' · 맑음',rain:' · 비',mid:''}[MUS.curWx]||''):'—'; if(vj.textContent!==nm) vj.textContent=nm; } }
  /* 곡이 바뀌면 잦아들었다가(2초) 새 곡으로 · 날씨만 바뀌면 다음 마디부터 */
  const want=MUS.want, tgt=(want&&want===MUS.cur)?Math.max(MUS.vol,juke?0.5:0)*0.6:0;
  MUS.lvl+=(tgt-MUS.lvl)*(tgt>MUS.lvl?0.025:0.05);
  MUS.gain.gain.setTargetAtTime(MUS.lvl,now,0.05);
  muLoud(now);
  /* 새 곡은 표본을 다 빚은 뒤에(늦어도 10초) */
  if(want!==MUS.cur&&MUS.lvl<0.01&&(!want||MUS.warmQ.length<=(MUS.warmX||0)||now>MUS.warmT)){ MUS.cur=want; if(want){ MUS.st={bl:36}; MUS.nextBar=now+0.15; MUS.bar=0; MUS.curWx=MUS.wx; muApply(MU_SONGS[want],now); } }
  if(MUS.cur&&MUS.wx!==MUS.curWx){ MUS.curWx=MUS.wx; muApply(MU_SONGS[MUS.cur],now); }
  if(MUS.cur&&MUS.lvl>0.002){ const S=MU_SONGS[MUS.cur];
    if(MUS.nextBar<now) MUS.nextBar=now+0.05;
    while(MUS.nextBar<now+0.6){ const bt=60/(S.bpm*(MUS.curWx==='rain'?0.82:1)); try{ muBar(S,MUS.nextBar,MUS.bar); }catch(e){ console.error('음악',e); }
      MUS.nextBar+=bt*4; MUS.bar++; } }
},40);
/* 곡마다 크기 — 오프라인으로 열두 곡을 마스터 사슬까지 그려 잰 RMS 로 맞춘 고정 보정(muMasterCal) · 그 위에 느린 자동 음량이 ±4 dB 안에서 다듬는다 */
/* 곡마다 맞출 크기(마스터 사슬의 RMS · 크기 1 일 때) — 동굴 · 물속 · 습지는 조금 작게, 협곡 · 산 · 벼랑 · 밀림은 조금 크게(게임의 결에 맞춰) */
const MU_LOUD_T={limecave:0.13,granitecave:0.13,amethystcave:0.13,water:0.13,wetland:0.13,canyon:0.16,mountains:0.16,cliff:0.16,jungle:0.16};
const MU_LOUD=k=>MU_LOUD_T[k]||0.15;
/* 잰 RMS(보정 없이 · 2026-11-05 오프라인 16 초 · 날씨 보통) — 고정 보정 = 맞출 크기 ÷ 이것 */
const MU_RMS0={coastal:0.137,conifer:0.1321,jungle:0.1537,drylands:0.1496,mountains:0.1609,cliff:0.1458,canyon:0.1882,wetland:0.0994,limecave:0.138,granitecave:0.1683,amethystcave:0.13,water:0.1565};
const MU_TRIM={}; for(const k in MU_RMS0) MU_TRIM[k]=Math.min(2,Math.max(0.5,MU_LOUD(k)/MU_RMS0[k]));
function muLoud(now){
  if(!MUS.an||!MUS.cur||MUS.lvl<0.05) return;
  MUS.an.getFloatTimeDomainData(MUS.anBuf); let s=0; const b=MUS.anBuf; for(let i=0;i<b.length;i++) s+=b[i]*b[i];
  const r=Math.sqrt(s/b.length)/Math.max(1e-4,MUS.norm.gain.value);   // 자동 음량 앞의 크기(고정 보정 뒤 · 크기 1 기준 — 분석기는 MUS.gain 앞이다)
  if(r>0.004){ MUS.loud=MUS.loud?MUS.loud+(r-MUS.loud)*0.012:r;         // 3초쯤에 걸쳐 · 쉬는 마디는 안 센다
    const g=Math.min(1.6,Math.max(0.63,MU_LOUD(MUS.cur)/MUS.loud)); MUS.norm.gain.setTargetAtTime(g,now,2.0); }
  const duck=MUS.duckT&&now-MUS.duckT<1.2?0.63:1; MUS.duckG.gain.setTargetAtTime(duck,now,duck<1?0.03:0.6);   // 다치거나 쏘면 −4 dB · 0.6초에 걸쳐 돌아온다
}
function musDuck(){ if(A.ctx) MUS.duckT=A.ctx.currentTime; }
/* 곡 · 날씨의 소리 길 — 거르개 · 울림 · 메아리 · 악기 크기 · 곡 크기 */
function muApply(S,now){
  const wx=MUS.curWx, cut=S.cut*(wx==='rain'?0.65:wx==='dry'?1.25:1);
  MUS.bus.frequency.setTargetAtTime(cut,now,0.3);
  for(const k in MUS.revG) MUS.revG[k].gain.setTargetAtTime(k===S.rv?S.rvA+(wx==='rain'?0.1:0):0,now,0.3);
  MUS.dlyG.gain.setTargetAtTime(S.echo?0.28:0,now,0.3);
  for(const k in MUS.ins){ const I=MUS.ins[k], g=(S.gain&&S.gain[k])||1; I.g.gain.setTargetAtTime(I.base*g,now,0.3); }
  if(MUS.mix){ const key=Object.keys(MU_SONGS).find(k=>MU_SONGS[k]===S); MUS.mix.gain.setTargetAtTime(MU_TRIM[key]||1,now,0.5); MUS.loud=0; }
}
/* 덕킹 — 쏘거나 크게 다치면 음악을 잠깐 낮춘다(게임 소리가 먼저 · 74-icons-guns.js shoot · 80-player.js hurtPL 을 감싼다) */
if(typeof shoot==='function'){ const _mSh=shoot; shoot=function(){ musDuck(); return _mSh.apply(this,arguments); }; }
if(typeof hurtPL==='function'){ const _mHu=hurtPL; hurtPL=function(d){ if(d>=5) musDuck(); return _mHu.apply(this,arguments); }; }
