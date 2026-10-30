/* 64-dex.js — CASTAWAY
   사전과 창 — 아이템·광물 사전 · 상자 창(drawBox) · 숫돌 창
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   12-d) 사전
   ----------------------------------------------------------------------------
   획득 방법은 레시피·채집·채굴 표에서 역으로 뽑는다. 표를 고치면 사전도 따라
   바뀌므로 설명이 실제 동작과 어긋날 일이 없다.
   ========================================================================== */
const GEO={
  flint:  {tier:'맨손', where:'해빈 자갈밭 · 하천 바닥',
           note:'석회질 퇴적층에서 빠져나온 처트 단괴. 패각상으로 깨져 저절로 날이 선다.'},
  pebble: {tier:'맨손', where:'하상 자갈 · 해빈 · 애추 사면 · 급사면 아래 붕적층',
           note:'물살에 굴러 모난 데가 없어진 돌. 망치돌로 쓰면 부싯돌을 뗄 수 있다.'},
  clay:   {tier:'경도 1', where:'하천 범람원의 저지 완경사 · 습지',
           note:'물이 느려지는 곳에 가라앉은 세립 퇴적물. 물을 먹으면 가소성이 생긴다.'},
  iron:   {tier:'경도 1', where:'습지 · 이탄지',
           note:'혐기성 물속에서 철분이 침전해 굳은 것. 북유럽 철기 시대의 출발점이었다.'},
  tin:    {tier:'경도 1', where:'하천 하류의 사광 퇴적',
           note:'비중이 커서 물살에 씻겨 하류 자갈층에 모인다. 구리와 섞으면 청동이 된다.'},
  coal:   {tier:'경도 2', where:'절벽 노두 · 이탄층',
           note:'두꺼운 유기 퇴적이 압밀된 것. 장작보다 훨씬 높은 온도를 낸다.'},
  copper: {tier:'경도 2', where:'중고도 노출 암반',
           note:'구리 광화대가 산화되며 생긴 이차 광물. 초록빛이 광맥의 표시다.'},
  granite:{tier:'경도 3', where:'노출 암반 · 급경사면',
           note:'석영·장석·운모가 뭉친 조립질 암석. 때려도 날이 서지 않고 부스러진다. '
                +'불로 달궈 균열을 낸 뒤에야 떼어낼 수 있다.'},
  /* 아래 다섯은 오래 빠져 있었다. sand 는 MINERALS 에는 들어 있으면서 여기에만
     없어서, 광물 탭을 펴는 순간 g.tier 에서 터져 탭 전체가 안 그려졌다. */
  sand:   {tier:'맨손', where:'해빈 · 사구',
           note:'파도와 바람이 알갱이를 골라 쌓아 둔 규사. 손으로 퍼면 손가락 사이로 '
                +'흐르므로 빈 토기에 담아 나른다. 녹이면 유리가 된다.'},
  sulfur: {tier:'맨손', where:'분기공 둘레에만',
           note:'땅속 가스가 식으며 결정으로 앉은 노란 딱지. 숨이 맵다. '
                +'초석·숯과 섞으면 화약이 되고, 태워 받으면 황산이 된다.'},
  zinc:   {tier:'경도 2', where:'분기공 언저리 암반 · 애추 — 구리를 따라 붙는다',
           note:'열수가 식으며 앉은 황화물. 끓는점이 녹는점보다 낮아 환원되는 족족 '
                +'증기로 날아간다 — 그래서 수율이 나쁘다. 구리와 섞으면 황동이다.'},
  galena: {tier:'경도 2', where:'섬아연석과 같은 열수 광맥',
           note:'납의 황화물. 정육면체로 똑 떨어지게 쪼개진다. 낮은 열에도 녹아 '
                +'다루기 쉽다 — 축전지의 극판이 여기서 나온다.'},
  cinnabar:{tier:'간이 곡괭이', where:'분기공 둘레에만 — 유황과 같은 자리',
           note:'열수가 식으며 앉은 붉은 딱지. 구우면 수은이 김으로 날아오른다. '
                +'그 김은 마시면 안 된다. 뇌관의 뇌홍이 여기서 시작한다.'},
  basalt: {tier:'경도 2', where:'분기공 언저리 — 화산이 흘린 용암',
           note:'용암이 식으며 오그라들어 육각 기둥 결로 갈라진 검은 돌. 결을 따라 판돌로 떨어진다. '
                +'열을 오래 품어 달궈 두면 고기·생선을 굽는 돌판이 된다.'},
  karst:  {tier:'경도 1', where:'낮은 초지 · 숲 · 덤불',
           note:'얕은 바다 밑에 쌓인 조개껍데기와 산호가 굳어 솟은 흰 돌. 빗물에 녹아 구멍이 숭숭하다. '
                +'구우면 석회가 되고, 그 속에 박힌 부싯돌 단괴가 딸려 나온다.'},
  sandstone:{tier:'경도 2', where:'바닷가 가까운 낮은 모래땅',
           note:'모래가 켜켜이 쌓여 굳은 돌. 켜를 따라 쐐기를 박으면 반듯한 석재로 떨어진다 — '
                +'화강암처럼 불로 달굴 필요가 없지만 무르다.'}
};
/* 사전 광물 탭에 싣는 차례 — 캐는 단계가 얕은 것부터 */
const MINERALS=['flint','pebble','clay','sand','sulfur','iron','tin','coal','copper',
                'granite','basalt','karst','sandstone','zinc','galena','cinnabar'];

/* 광물 삽화 — 게임 안 암석과 같은 배합표(`HABIT`)를 2차원으로 옮긴다.
   ① 혹으로 윤곽을 흔들고 ② 무작위 직선으로 잘라 내고(모난 면) ③ 정사각형 쪽으로
   당긴다(정벽 쪼개짐). 안쪽은 내부 꼭짓점 하나에서 부채꼴로 쪼개 면마다 밝기를
   달리하고, 광택 있는 것에는 흰 띠를, 결이 있는 것에는 쪼개진 선을 얹는다.
   외부 이미지 없이 광물마다 고정된 그림이 나온다. */
const ICONS={};
/* 광택 — met: 금속처럼 번들거림 · 0 이면 무광. tex: 표면 무늬 종류 */
const LUSTRE={
  galena  :{met:1.00,tex:'step'},   // 납빛 정벽 — 계단처럼 어긋난 면
  iron    :{met:0.55,tex:'grain'},
  copper  :{met:0.30,tex:'vein'},   // 공작석 결 무늬
  tin     :{met:0.45,tex:'grain'},
  zinc    :{met:0.70,tex:'step'},
  coal    :{met:0.30,tex:'crack'},  // 결을 따라 갈라진 금
  flint   :{met:0.22,tex:'conch'},  // 조개 무늬 파임
  granite :{met:0.06,tex:'speck'},  // 알갱이
  pebble  :{met:0.10,tex:'speck'},
  sulfur  :{met:0.18,tex:'botry'},  // 포도송이 혹
  cinnabar:{met:0.25,tex:'botry'},
  clay    :{met:0.00,tex:'smooth'},
  sand    :{met:0.00,tex:'speck'},
  basalt  :{met:0.05,tex:'crack'},  // 기둥 결
  karst   :{met:0.02,tex:'smooth'},
  sandstone:{met:0.00,tex:'step'}   // 켜
};
function mineralIcon(k,hex){
  if(ICONS[k]) return ICONS[k];
  const S=128, c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d');
  const rnd=mulberry32(hashStr('icon|'+k));
  const H=(typeof HABIT!=='undefined'&&HABIT[k])||{amp:0.22,bump:4,nb:3,cuts:0,deep:1,
                                                   cube:0,smooth:0.7,flat:0.88,st:0.3};
  const L=LUSTRE[k]||{met:0.2,tex:'smooth'};
  const cx=S/2, cy=S/2+S*0.03, R=S*0.36;
  const base=new THREE.Color(hex), col=new THREE.Color();
  const put=(cc,m)=>{ col.copy(cc).multiplyScalar(m);
    return 'rgb('+Math.round(clamp(col.r,0,1)*255)+','+Math.round(clamp(col.g,0,1)*255)
      +','+Math.round(clamp(col.b,0,1)*255)+')'; };

  // ① 혹  ② 자를 직선  ③ 정사각형 당기기 — 3D 쪽과 같은 순서
  const lobe=[];
  for(let i=0;i<H.nb;i++) lobe.push([2+Math.floor(rnd()*Math.max(2,H.bump/2)),
                                     rnd()*6.283, rnd()*2-1]);
  let wsum=0; for(const l of lobe) wsum+=Math.abs(l[2]); wsum=wsum||1;
  const cut=[];
  for(let i=0;i<H.cuts;i++){ const th=rnd()*6.283;
    cut.push([Math.cos(th),Math.sin(th),H.deep*(0.86+rnd()*0.30)]); }
  const NP=H.cuts?72:28, pts=[];
  for(let i=0;i<NP;i++){
    const th=i/NP*6.283, dx=Math.cos(th), dy=Math.sin(th);
    let f=0; for(const l of lobe) f+=l[2]*Math.sin(l[0]*th+l[1]);
    let r=1+(f/wsum)*H.amp;
    if(H.cube>0) r=r*(1-H.cube)+r*H.cube/Math.max(Math.abs(dx),Math.abs(dy));
    for(const q of cut){ const d=dx*q[0]+dy*q[1];
      if(d>1e-3){ const lim=q[2]/d; if(lim<r) r=lim; } }
    pts.push([cx+dx*r*R, cy+dy*r*R*H.flat]);
  }
  // 바닥 그림자
  g.fillStyle='rgba(0,0,0,0.26)';
  g.beginPath(); g.ellipse(cx,cy+R*0.92,R*0.86,R*0.19,0,0,6.283); g.fill();

  // 면 나누기 — 빛이 오는 좌상단으로 치우친 안쪽 꼭짓점에서 부채꼴로
  const ix=cx-R*0.24, iy=cy-R*0.30;
  const path=()=>{ g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<NP;i++) g.lineTo(pts[i][0],pts[i][1]); g.closePath(); };
  for(let i=0;i<NP;i++){
    const a=pts[i], b=pts[(i+1)%NP];
    const mx=(a[0]+b[0])/2-ix, my=(a[1]+b[1])/2-iy;
    const ml=Math.hypot(mx,my)||1, nx=mx/ml, ny=my/ml;
    // 램버트 + 금속일수록 좁고 센 반사
    const d=clamp(-nx*0.45-ny*0.72+0.52,0,1.6);
    let lit=0.42+d*0.62;
    lit+=L.met*0.85*Math.pow(clamp(-nx*0.5-ny*0.78,0,1),6);
    lit*=0.94+rnd()*0.12;                       // 면마다 살짝 다르게
    g.fillStyle=put(base,clamp(lit,0.26,1.55));
    g.beginPath(); g.moveTo(ix,iy); g.lineTo(a[0],a[1]); g.lineTo(b[0],b[1]);
    g.closePath(); g.fill();
    if(H.cuts&&!(i%2)){                          // 쪼개진 면의 모서리를 살짝 긋는다
      g.strokeStyle='rgba(0,0,0,0.13)'; g.lineWidth=1;
      g.beginPath(); g.moveTo(ix,iy); g.lineTo(a[0],a[1]); g.stroke();
    }
  }

  // 표면 무늬 — 윤곽 안으로만
  g.save(); path(); g.clip();
  const tex=L.tex;
  if(tex==='speck'){                             // 알갱이(화강암·모래)
    for(let i=0;i<190;i++){
      const th=rnd()*6.283, rr=Math.sqrt(rnd())*R;
      const x=cx+Math.cos(th)*rr, y=cy+Math.sin(th)*rr*H.flat;
      g.fillStyle=rnd()<0.45?'rgba(255,255,255,0.30)':'rgba(0,0,0,0.26)';
      g.beginPath(); g.arc(x,y,0.7+rnd()*1.5,0,6.283); g.fill();
    }
  }else if(tex==='botry'){                       // 포도송이 혹(황·진사)
    for(let i=0;i<26;i++){
      const th=rnd()*6.283, rr=Math.sqrt(rnd())*R*0.92;
      const x=cx+Math.cos(th)*rr, y=cy+Math.sin(th)*rr*H.flat, br=R*(0.10+rnd()*0.16);
      const gr=g.createRadialGradient(x-br*0.35,y-br*0.4,br*0.1,x,y,br);
      gr.addColorStop(0,'rgba(255,255,255,0.30)');
      gr.addColorStop(0.55,'rgba(255,255,255,0.05)');
      gr.addColorStop(1,'rgba(0,0,0,0.26)');
      g.fillStyle=gr; g.beginPath(); g.arc(x,y,br,0,6.283); g.fill();
    }
  }else if(tex==='crack'){                       // 결을 따라 갈라진 금(석탄)
    for(let i=0;i<7;i++){
      const y=cy-R*0.7+rnd()*R*1.4;
      g.strokeStyle='rgba(0,0,0,0.42)'; g.lineWidth=0.8+rnd();
      g.beginPath(); g.moveTo(cx-R,y);
      for(let x=-R;x<R;x+=R*0.25) g.lineTo(cx+x,y+(rnd()*2-1)*R*0.05);
      g.stroke();
    }
  }else if(tex==='conch'){                       // 조개 무늬 파임(부싯돌)
    for(let i=0;i<5;i++){
      const x=cx+(rnd()*2-1)*R*0.5, y=cy+(rnd()*2-1)*R*0.45, rr=R*(0.18+rnd()*0.26);
      for(let j=1;j<=3;j++){
        g.strokeStyle='rgba(255,255,255,'+(0.16-j*0.03)+')'; g.lineWidth=1;
        g.beginPath(); g.arc(x,y,rr*j/3,0.6,3.4); g.stroke();
      }
    }
  }else if(tex==='step'){                        // 계단처럼 어긋난 정벽(방연석·섬아연석)
    for(let i=0;i<5;i++){
      const x=cx-R*0.8+rnd()*R*1.2, y=cy-R*0.7+rnd()*R*1.3, w=R*(0.25+rnd()*0.4);
      g.strokeStyle='rgba(255,255,255,0.22)'; g.lineWidth=1.2;
      g.beginPath(); g.moveTo(x,y); g.lineTo(x+w,y-w*0.42); g.stroke();
      g.strokeStyle='rgba(0,0,0,0.30)';
      g.beginPath(); g.moveTo(x,y+1.4); g.lineTo(x+w,y-w*0.42+1.4); g.stroke();
    }
  }else if(tex==='vein'){                        // 결 무늬(공작석)
    for(let i=0;i<9;i++){
      const y=cy-R*0.8+i*R*0.2;
      g.strokeStyle=i%2?'rgba(255,255,255,0.20)':'rgba(0,0,0,0.20)';
      g.lineWidth=R*0.07;
      g.beginPath(); g.moveTo(cx-R,y);
      g.bezierCurveTo(cx-R*0.3,y-R*0.16,cx+R*0.3,y+R*0.16,cx+R,y); g.stroke();
    }
  }else if(tex==='grain'){                       // 잔 알갱이(철·주석)
    for(let i=0;i<120;i++){
      const th=rnd()*6.283, rr=Math.sqrt(rnd())*R;
      g.fillStyle=rnd()<0.5?'rgba(255,255,255,0.16)':'rgba(0,0,0,0.20)';
      g.beginPath(); g.arc(cx+Math.cos(th)*rr,cy+Math.sin(th)*rr*H.flat,
                           0.6+rnd()*1.1,0,6.283); g.fill();
    }
  }
  // 금속 광택 띠 — 좌상단에 길게
  if(L.met>0.3){
    const gr=g.createLinearGradient(cx-R,cy-R,cx+R*0.2,cy+R*0.3);
    gr.addColorStop(0,'rgba(255,255,255,'+(0.10+L.met*0.30)+')');
    gr.addColorStop(0.45,'rgba(255,255,255,0.04)');
    gr.addColorStop(1,'rgba(0,0,0,0.16)');
    g.fillStyle=gr; g.fillRect(0,0,S,S);
  }
  g.restore();

  // 외곽선
  g.strokeStyle='rgba(0,0,0,0.5)'; g.lineWidth=1.4; path(); g.stroke();
  return ICONS[k]=c.toDataURL();
}

// 이 아이템을 어떻게 얻는가 — 표에서 역으로 뽑는다
function obtainOf(id){
  const out=[];
  for(const R of RECIPES){
    if(R.out&&R.out.id===id&&!R.proc)
      out.push('제작 — '+R.in.map(r=>matName(r)+' '+r.n).join(' + ')
        +((R.need&&R.need.length)?' (도구: '+R.need.map(matName).join(', ')+')':''));
  }
  const from=(tbl,verb)=>{
    const ks=Object.keys(tbl).filter(k=>tbl[k].item===id);
    if(ks.length) out.push(verb+' — '+ks.map(k=>RESOURCES.find(r=>r.k===k).n).join(', '));
  };
  from(HARVEST,'채집'); from(CHOP,'벌목'); from(MINE,'채굴');
  for(const k in MINE){ const X=MINE[k].extra;
    if(X&&X.id===id) out.push('채굴 — '+RESOURCES.find(r=>r.k===k).n+' (떼어 낼 때 '+Math.round(X.p*100)+'% 로 딸려 나온다)'); }
  // 표에서 뽑히지 않는 부수 산출물
  if(id==='berry') out.push('채집 — 풀숲 (열매가 달린 덤불에서 가끔 딸려 나온다)');
  if(/^jar_/.test(id)) out.push('잡기 — 잠자리채로 '+({jar_butterfly:'낮 풀밭의 나비',jar_dragonfly:'민물가의 잠자리',jar_firefly:'밤 숲·늪의 반딧불이'}[id])+'를 떠서 빈 유리병에 담는다');
  /* 식생·바닷가에서 따는 것(95-flora.js FLORA_PICK · 96-sea.js SEA_PICK) */
  for(const k in FLORA_PICK){ const D=FLORA_PICK[k];
    if(D.item===id) out.push('따기 — '+D.n+' ('+D.verb+(D.need?' · 날붙이를 지녀야':'')+')');
    if(D.extra) for(const x of D.extra) if(x[0]===id) out.push('따기 — '+D.n+' ('+D.verb+' 때 '+Math.round(x[1]*100)+'% 로 딸려 나온다)'); }
  for(const k in SEA_PICK){ const D=SEA_PICK[k]; if(D.item===id) out.push('줍기 — 바닷가 '+D.n+' ('+D.verb+')'); }
  if(id==='ring_platinum') out.push((P.tv|0)<8?'처음부터 지님 — 표류 전부터 끼고 있었다':'해저 신전 — 섬 밖 깊은 바다 밑, 제단의 상자에 바쳐져 있다');
  if(id==='can_food')    out.push('처음부터 지님 — 보급선이 두 캔 쥐여 주었다. 섬에서는 못 만든다');
  if(id==='bottle_water'||id==='bottle_empty')
    out.push('처음부터 지님 — 보급선이 준 물병. 섬에서는 못 만들고 다시 채우기만 한다');
  for(const raw in FIRING) if(FIRING[raw].out===id)
    out.push('모닥불 소성 — '+ITEMS[raw].n+' 1 (모닥불 안에 땔감과 같이 넣어두면 구워진다)');
  for(const R of SMELT) if(R.out.id===id)
    out.push('제련로 — '+R.in.map(r=>ITEMS[r.id].n+' '+r.n).join(' + ')
      +(R.need?' (안에 같이: '+R.need.map(r=>ITEMS[r.id].n).join(', ')+')':'')
      +' → '+R.out.n+'개');
  if(id==='stone_block') out.unshift('사전 준비 — 모닥불이나 횃불로 달궈 균열을 낸 뒤');
  /* 짐승이 떨구는 것 — MOBS 의 drop 표를 그대로 읽는다. 이걸 안 보면
     키틴·뼈·가죽·잿불 비늘 같은 사냥물이 전부 '처음부터 지님' 으로 나온다. */
  for(const M of MOBS) if(M.drop) for(const d of M.drop)
    if(d.id===id) out.push('사냥 — '+M.n+' (잡으면 '+d.n+'개)');
  if(id==='fish') out.push('그물질 — 무릎 위까지 잠기는 물에 서서 던진다');
  return out;
}
function toolSpec(t,it){
  const p=[];
  if(t.axe) p.push('벌목');
  if(t.pick) p.push('채굴 경도 '+t.pick+'까지');
  if(t.fire) p.push('마찰 발화');
  if(t.torch) p.push('휴대 조명');
  if(t.weapon){
    p.push('피해 '+t.dmg+' · 사거리 '+t.reach+' m · '+(1/t.rate).toFixed(2)+'회/초');
    p.push('초당 피해 '+Math.round(t.dmg/t.rate));
    if(t.stun) p.push('기절 '+t.stun+'초');
    if(t.burn) p.push('화상 '+t.burn.t+'초 · '+t.burn.every+'초마다 '+t.burn.dmg
      +'(모두 '+Math.round(t.burn.t/t.burn.every)*t.burn.dmg+') · 겹치지 않음');
    if(t.gun) p.push((t.bore==='arrow'?'한 대씩 메김 · 메기는 데 '+t.reload+'초 · 쓰는 화살 '
                                      :'탄창 '+t.mag+'발 · 재장전 '+t.reload+'초 · 쓰는 탄 ')
      +Object.keys(ITEMS).filter(k=>isAmmo(k)&&boreOf(k)===(t.bore||'rifle'))   // 구경이 맞는 것만
        .map(k=>ITEMS[k].n+(ITEMS[k].ammo.dmg!==1?'(×'+(+ITEMS[k].ammo.dmg.toFixed(2))+')':''))
        .join(' · '));
  }
  if(t.speed&&t.speed!==1) p.push('작업 속도 ×'+t.speed);
  if(it.durMax) p.push('내구 '+it.durMax);
  if(it.burn) p.push('연소 '+it.burn+'시간');
  return p.join(' · ');
}
let boxOpen=false, boxDirty=true, curStore=null, boxT=0;
/* 용기의 지금 상태 한 줄 — 머리글과 조준 프롬프트가 같이 쓴다 */
const isHearth=c=>c.kind==='fire'||c.kind==='furnace';
function contStatus(c){
  if(isHearth(c)){
    if(!c.lit)
      return contFuel(c)?'꺼져 있다 — 불을 붙일 수 있다':'꺼져 있다 · 땔감을 넣어라';
    let t='타는 중 · 남은 연료 '+fmtFuel(c.fuel);
    // 안에서 함께 돌아가는 것을 전부 적는다
    const parts=(c.kind==='fire')
      ? fireJobs(c).map(j=>ITEMS[j].n+' '
          +Math.round(clamp((c.cook&&c.cook[j]||0)/FIRING[j].hours,0,1)*100)+'%')
      : furnaceJobs(c).map(R=>R.n+' '
          +Math.round(clamp((c.jobs&&c.jobs[R.id]||0)/R.hours,0,1)*100)+'%');
    if(parts.length) t+=' · '+parts.join(' · ');
    return t;
  }
  return c.slots.length+'종';
}
/* 용기 아래에 붙는 안내 — 무엇을 넣으면 되는지 알려준다 */
function contHint(c){
  const tail=' · 항목을 눌러 1개 이동 · Shift+클릭으로 전부 · E 또는 Esc로 닫기';
  const cap=c.slotCap?' · '+c.slots.length+'/'+c.slotCap+'칸':'';
  if(c.kind==='fire')
    return '땔감(나뭇가지 · 통나무 · 석탄 · 참숯)을 넣으면 알아서 타고, '
      +'구울 것(그릇 · 도가니 · 흙 덮은 장작 · 고기 · 온갖 물고기 · 조개 · 굴'
      +')을 넣으면 들어 있는 것이 모두 함께 구워진다'+cap+tail;
  if(c.kind==='furnace'){
    const live=furnaceJobs(c);
    if(live.length) return live.map(R=>R.note).join(' / ')+cap+tail;
    return '불을 붙여야 돈다(참숯은 땔감이 아니라 환원제다 — 장작이나 석탄을 같이 넣어라). '
      +'넣을 것 — '+SMELT.map(r=>r.n+'('
      +r.in.map(x=>ITEMS[x.id].n+' '+x.n).join('+')
      +(r.need?' +'+r.need.map(x=>ITEMS[x.id].n).join('+'):'')+')').join(' · ')+cap+tail;
  }
  if(STORE_DEF[c.kind]&&STORE_DEF[c.kind].trash)
    return '⚠ 넣은 것은 창을 닫는 순간 사라진다 — 닫기 전에는 도로 꺼낼 수 있다'+tail;
  return '적재 상한과 무관하게 쌓아둘 수 있다'+tail;
}
function drawBox(){
  if(!boxOpen||!curStore) return;
  const st=curStore;
  document.getElementById('boxN').textContent=st.label?st.cname+' ('+STORE_DEF[st.kind].n+')':st.cname;
  const editing=document.getElementById('boxNm').style.display==='inline-block';
  document.getElementById('boxRn').style.display=(STORE_DEF[st.kind]&&!editing)?'inline-block':'none';
  document.getElementById('boxK').textContent=contStatus(st);
  document.getElementById('boxF').textContent=contHint(st);
  const w1=document.getElementById('boxW1'), w2=document.getElementById('boxW2');
  w1.textContent=invWeight().toFixed(1)+' / '+INV.max+' kg';
  w1.className=invLoad()>0.85?'over':'';
  const sw=contWeight(st);
  w2.textContent=sw.toFixed(1)+' / '+st.cap+' kg';
  w2.className=sw/st.cap>0.85?'over':'';
  document.getElementById('boxT2').textContent=st.cname;
  const row=(sl,side,i)=>{
    const t=ITEMS[sl.id];
    return '<div class="bi" data-s="'+side+'" data-i="'+i+'">'
      +iconTag(sl.id,t)
      +'<span class="nm">'+t.n+'</span>'
      +(sl.dur!==undefined?'<span class="qt">'+(Math.round(sl.dur*10)/10)+'</span>':'')
      +(sl.fuel!==undefined?'<span class="qt">'+Math.round(sl.fuel/t.burn*100)+'%</span>':'')
      +'<span class="qt">×'+sl.n+'</span></div>';
  };
  /* 목록은 **내용이 달라졌을 때만** 갈아 끼운다. 예전엔 0.25초마다 줄을 통째로 새로 만들어서, 누르는 사이(누름 → 뗌)에
     그 줄이 새것으로 바뀌면 브라우저가 '눌렀다'로 쳐 주지 않았다 — 두세 번 눌러야 한 번 옮겨지고, 아이콘도 매번
     다시 그려져 깜빡였다. 누르기는 목록 바탕에서 한 번에 받는다(`boxWire`). */
  const L1=document.getElementById('boxL1'), L2=document.getElementById('boxL2');
  const h1=INV.slots.length?INV.slots.map((sl,i)=>row(sl,'i',i)).join(''):'<div class="be">비어 있음</div>';
  const h2=st.slots.length?st.slots.map((sl,i)=>row(sl,'s',i)).join(''):'<div class="be">비어 있음</div>';
  if(L1._html!==h1){ const sc=L1.scrollTop; L1.innerHTML=h1; L1._html=h1; L1.scrollTop=sc; }
  if(L2._html!==h2){ const sc=L2.scrollTop; L2.innerHTML=h2; L2._html=h2; L2.scrollTop=sc; }
}
/* 상자 창의 줄 누르기 — 줄마다 달지 않고 목록 바탕 둘에서 받는다. 누르는 사이 줄이 바뀌었으면
   (굽던 것이 다 익어 목록이 달라졌을 때) 누른 자리의 새 줄을 찾아 옮긴다. */
function boxWire(){
  const move=ev=>{
    if(!boxOpen||!curStore) return;
    let el=ev.target&&ev.target.closest?ev.target.closest('.bi'):null;
    if(!el){ const at=document.elementFromPoint(ev.clientX,ev.clientY); el=at&&at.closest?at.closest('.bi'):null; }
    if(!el) return;
    const i=+el.dataset.i;
    if(el.dataset.s==='i') toStore(i,ev.shiftKey); else fromStore(i,ev.shiftKey);
    drawBox();
  };
  document.getElementById('boxL1').addEventListener('click',move);
  document.getElementById('boxL2').addEventListener('click',move);
}
boxWire();
function toggleBox(st){
  boxRenameEnd(false);                       // 이름을 적다 만 채로 닫으면 그만둔 것이다
  /* 쓰레기통은 닫는 순간 비운다 — 넣은 것이 사라진다 */
  if(boxOpen && curStore && STORE_DEF[curStore.kind] && STORE_DEF[curStore.kind].trash && curStore.slots.length){
    const n=curStore.slots.reduce((a,s)=>a+s.n,0);
    curStore.slots.length=0; toast('쓰레기통을 비웠다 — '+n+'개를 버렸다'); sfx('bind');
  }
  boxOpen=!boxOpen && !!st;
  curStore=boxOpen?st:null;
  document.getElementById('box').style.display=boxOpen?'block':'none';
  if(boxOpen){ invOpen=craftOpen=dexOpen=false; closeCfg();
    document.getElementById('inv').style.display='none';
    document.getElementById('crf').style.display='none';
    document.getElementById('dex').style.display='none'; }
  drawBox(); syncLock();
}
/* ── 숫돌 ─────────────────────────────────────────────────────────────────
   위쪽은 숫돌에서 만드는 것, 아래쪽은 수리다.
   수리에 드는 재료는 **처음 만들 때 든 것의 절반, 내림**이다. 다만 그렇게
   깎으면 값이 0 에 가까워지는 것들이 있어(재료가 하나씩만 드는 것),
   전부 0 으로 내려가면 가장 앞의 재료 하나는 받는다 — 공짜 수리는 없다.
   도구(need)는 만들 때와 똑같이 있어야 하고 닳지 않는다. */
let grindOpen=false, grindSel=null, pickOpen=false;
const repairRecipe=id=>RECIPES.find(r=>r.out&&r.out.id===id);
function repairCost(id){
  const R=repairRecipe(id);
  if(!R) return null;
  const out=Math.max(1,(R.out&&R.out.n)||1);
  /* 한 번에 여럿 나오는 레시피는 한 개분으로 나눠 셈한다 —
     화살처럼 열 개씩 나오는 것을 열 개분으로 받으면 말이 안 된다. */
  let c=R.in.map(x=>({id:x.id, tag:x.tag, n:Math.floor(x.n/out/2)}));
  if(!c.some(x=>x.n>0)) c[0].n=1;                  // 전부 0 이면 하나는 받는다
  return {R, in:c.filter(x=>x.n>0), stam:Math.max(4,Math.round(R.stam*0.4))};
}
/* 수리할 수 있는가 — 내구가 있고, 닳았고, 만드는 법이 있는 것 */
const canRepairSlot=sl=>!!(sl && sl.dur!==undefined && ITEMS[sl.id].durMax
  && sl.dur<ITEMS[sl.id].durMax && repairRecipe(sl.id));

function toggleGrind(){
  grindOpen=!grindOpen;
  if(grindOpen){
    boxOpen=false; curStore=null; invOpen=craftOpen=dexOpen=false; closeCfg();
    for(const id of ['box','inv','crf','dex']) document.getElementById(id).style.display='none';
    if(grindSel && INV.slots.indexOf(grindSel)<0) grindSel=null;
  }
  pickOpen=false;
  document.getElementById('gws').style.display=grindOpen?'flex':'none';
  drawGrind(); syncLock();
}
function drawGrind(){
  if(!grindOpen) return;
  /* 위 — 숫돌에서 만드는 것. 제작창과 같은 줄 모양을 쓴다 */
  const list=RECIPES.filter(r=>r.station==='grind');
  document.getElementById('gwsTop').innerHTML=
    '<div class="ch">숫돌에서 만드는 것<span>'+list.filter(canCraft).length
      +' / '+list.length+'</span></div>'
    +(list.length?list.map(R=>{
      const i=RECIPES.indexOf(R), ok=canCraft(R);
      const mats=R.in.map(r=>{ const h=countMat(r);
        return '<span class="'+(h>=r.n?'g':'b')+'">'+matName(r)+' '+h+'/'+r.n+'</span>';
      }).join(' · ');
      return '<div class="cr'+(ok?'':' no')+'" data-i="'+i+'">'
        +'<div class="cn">'+R.n+'<span class="ck">'+ITEMS[R.out.id].kg+' kg</span></div>'
        +'<div class="cm">'+mats+'</div><div class="cd">'+R.note+'</div></div>';
    }).join('') : '<div style="color:var(--dim);font-size:12px;padding:8px 2px">'
      +'숫돌에서 만드는 것이 아직 없다</div>');
  document.getElementById('gwsTop').querySelectorAll('.cr').forEach(el=>{
    el.onclick=()=>{ startCraft(RECIPES[+el.dataset.i]); toggleGrind(); };
  });

  /* 아래 — 수리 칸 */
  const sEl=document.getElementById('gwsSlot'), cEl=document.getElementById('gwsCost');
  if(grindSel && INV.slots.indexOf(grindSel)<0) grindSel=null;
  if(!grindSel){
    sEl.innerHTML='<i>수리할 것을 끌어다 놓거나 눌러서 고른다</i>';
    cEl.innerHTML='<span style="color:var(--dim)">칸이 비어 있다</span>';
  }else{
    const T=ITEMS[grindSel.id];
    sEl.innerHTML='<b>'+T.n+'</b><i>'+grindSel.dur+' / '+T.durMax+'</i>';
    const C=repairCost(grindSel.id);
    if(!T.durMax) cEl.innerHTML='<span class="b">내구가 없는 물건이다</span>';
    else if(grindSel.dur>=T.durMax) cEl.innerHTML='<span class="g">이미 성하다</span>';
    else if(!C) cEl.innerHTML='<span class="b">만드는 법을 모르는 물건이라 고칠 수 없다</span>';
    else{
      /* 만들 때 쓰던 도구는 고칠 때도 있어야 한다 — 닳지는 않는다.
         이걸 안 적어 두면 재료가 다 초록인데 단추가 먹지 않는 것처럼 보인다. */
      const needs=(C.R.need||[]).map(r=>{
        if(r.id) return '<span class="'+(haveId(r.id)>=r.n?'g':'b')+'">'+ITEMS[r.id].n+'</span>';
        return tagItems(r.tag).map(k=>'<span class="'+(haveId(k)>0?'g':'b')+'">'
          +ITEMS[k].n+'</span>').join('<span style="color:var(--dim)"> 또는 </span>');
      }).join(' · ');
      cEl.innerHTML='드는 것 — '+C.in.map(r=>{ const h=countMat(r);
          return '<span class="'+(h>=r.n?'g':'b')+'">'+matName(r)+' '+h+'/'+r.n+'</span>';
        }).join(' · ')+' · 기력 '+C.stam
        +(needs?'<br><span style="color:var(--dim)">도구(소모 안 됨) </span>'+needs:'')
        +'<br><span style="color:var(--dim)">내구 '+grindSel.dur+' → '+T.durMax+' 로 돌아간다</span>';
    }
  }
  /* 고르는 목록 */
  const pEl=document.getElementById('gwsPick');
  pEl.style.display=pickOpen?'block':'none';
  if(pickOpen){
    const cand=INV.slots.filter(canRepairSlot);
    pEl.innerHTML=cand.length
      ? cand.map(sl=>'<div data-i="'+INV.slots.indexOf(sl)+'">'+ITEMS[sl.id].n
          +' <span style="color:var(--dim)">'+sl.dur+' / '+ITEMS[sl.id].durMax+'</span></div>').join('')
      : '<div style="color:var(--dim)">고칠 것이 없다 — 닳은 도구를 지녀야 한다</div>';
    pEl.querySelectorAll('div[data-i]').forEach(el=>{
      el.onclick=()=>{ grindSel=INV.slots[+el.dataset.i]; pickOpen=false; drawGrind(); };
    });
  }
}
function doRepair(){
  const sl=grindSel;
  if(!sl||INV.slots.indexOf(sl)<0){ toast('칸이 비어 있다'); return; }
  if(!nearGrind()){ toast('숫돌 곁에서만 고칠 수 있다'); return; }
  const T=ITEMS[sl.id];
  if(sl.dur>=T.durMax){ toast('이미 성하다'); return; }
  const C=repairCost(sl.id);
  if(!C){ toast('만드는 법을 모르는 물건이라 고칠 수 없다'); return; }
  if(!C.in.every(r=>countMat(r)>=r.n)){ toast('재료가 모자란다'); return; }
  if(C.R.need && !C.R.need.every(r=>countMat(r)>=r.n)){
    toast(C.R.need.map(matName).join(', ')+' 이 있어야 한다'); return; }
  if(PL.stam<C.stam){ toast('기력이 없다'); return; }
  for(const r of C.in) consumeMat(r);
  PL.stam=clamp(PL.stam-C.stam,0,100);
  sl.dur=T.durMax;
  toast(T.n+' 을 갈아 세웠다 — 내구 '+T.durMax);
  sfx('bind'); invDirty=true; drawGrind();
}
document.getElementById('gwsDo').onclick=doRepair;
document.getElementById('gwsSlot').onclick=()=>{ pickOpen=!pickOpen; drawGrind(); };
document.getElementById('gwsSlot').ondragover=ev=>{
  if(DRAG){ ev.preventDefault(); document.getElementById('gwsSlot').classList.add('on'); } };
document.getElementById('gwsSlot').ondragleave=()=>
  document.getElementById('gwsSlot').classList.remove('on');
document.getElementById('gwsSlot').ondrop=ev=>{
  ev.preventDefault(); document.getElementById('gwsSlot').classList.remove('on');
  dragPut('grind');
};

let dexOpen=false, dexTab='item';
/* 사전 '조작' 탭 — 갈래마다 [글쇠, 설명]. 시작 화면의 짧은 안내(#ov .k)보다 자세하다.
   **조작을 바꾸면 여기도 고칠 것** — 글쇠 처리는 js/94-input.js 의 keydown · mousedown/mouseup 에 있다. */
/* 조작 안내 — {행동} 자리는 그릴 때 지금 키로 바뀐다(kbText · 93-keys.js · 키 창에서 바꾼 것) */
const CONTROLS_GUIDE=[
  ['움직이기',[
    ['{fwd} {left} {back} {right}','걷기 · <b>{run}</b> 달리기(기력이 닳는다 · 배고프거나 목마르면 못 달린다)'],
    ['{dash}','돌진 — 가는 쪽(누른 방향 · 없으면 보는 쪽)으로 2~3 m 몸을 날린다 · 기력 10 · 물에서는 못 한다'],
    ['{jump}','뛰기(위로 1.3 m 쯤 · 기력 9 · 짐이 무거우면 낮게 · 물에서는 못 뛴다) · 물속에선 떠오르기 — 스노클·오리발·물안경을 입으면 물속이 편해진다 · 벼랑·나무·수직굴 앞에서는 아래 줄'],
    ['{jump}(벼랑 앞 · 누르고 있기)','벼랑에 매달리기 — <b>{fwd}·{back}</b> 오르내리기 · <b>{left}·{right}</b> 옆으로 · <b>{dash}·{run}</b> 누른 쪽으로 몸 던지기(기력 18) · 매달린 동안 기력이 든다 · 손을 떼거나 기력이 다하면 떨어진다 · 꼭대기에 닿으면 올라선다'],
    ['{crouch}','앉기 · 물속에선 가라앉기 · <b>{crouch} + {jump}</b> 지붕 위에서 아래로 내려가기'],
    ['마우스','둘러보기 — 화면을 한 번 누르면 마우스가 잠긴다'],
  ]],
  ['좌클릭 — 손에 든 것 쓰기',[
    ['무기','휘두르기·찌르기 · 총은 쏘기(연사총은 누르고 있으면 계속)'],
    ['캐기','캘 것을 보고 <b>누르고 있기</b> — 빈손(풀·열매·가지) · 도끼(나무) · 곡괭이·드릴(광석·암석)'],
    ['먹을 것','먹기·마시기·붕대 감기'],
    ['빈손','<b>민물</b>(하천)을 보고 누르면 물 마시기 — 바닷물은 못 마신다'],
    ['딸 것','덩굴·대나무·열매·버섯·덤불을 보고 좌클릭을 누르고 있으면 막대가 차고 딴다(덤불은 나뭇가지 — 가끔 부싯깃·베리) · 바다에선 조개·굴·성게 줍기'],
    ['작살','물고기를 겨누고 찌르기'],
    ['손 충전기','누르고 있으면 캠코더 배터리를 돌려 채운다'],
    ['전등','켜고 끄기(<b>{lamp}</b> 도 된다)'],
    ['횃불·등잔','켜고 끄기 — 불씨는 ① 3.5 m 안의 타는 불 ② 긴 라이터 ③ 활비비 + 부싯깃 차례로 찾는다 · 물속에선 못 붙인다'],
    ['그물','무릎 위까지 잠기는 물에 들어가서 던지기'],
    ['잠자리채','벌레를 겨누고 좌클릭 — 빈 유리병에 담긴다(한 번에 1~3마리) · 벌레 병은 그물을 던질 때 미끼가 된다'],
    ['수류탄','던지기 — 3.5초 뒤 터진다'],
  ]],
  ['좌클릭 — 설비를 보고 있을 때',[
    ['','설비를 보고 있으면 손에 든 것은 안 쓴다 — 설비가 먼저다'],
    ['짧게','상자·모닥불·제련로·숫돌·발전기 창 열기 · 문 여닫기 · 발전기는 지닌 축전지·전등 채우기'],
    ['길게','모닥불·제련로 불 다루기 — 부싯깃 + 활비비로 불 피우기'],
    ['횃불','<b>켠 횃불</b>을 들고 꺼진 모닥불을 길게 → 모닥불에 불이 옮겨 붙는다(땔감이 있어야 함) · <b>꺼진 횃불</b>을 들고 타는 모닥불을 길게 → 횃불에 불이 붙는다'],
    ['{move}','설비를 보고 누르면 바구니·상자·모닥불·가마·제련로·숫돌·모루를 <b>집어 든다</b> — 드는 동안 몸은 제자리, 시선을 따라 옮기고 휠·{rot} 로 돌려 좌클릭으로 놓는다(토대·지붕 위도 된다) · {move}·우클릭·Esc 는 그만두기'],
    ['이름표','바구니·상자를 열고 <b>✎ 이름표</b> — 적은 이름이 상자 위에 뜬다'],
    ['{close} · Esc','열린 상자·모닥불·숫돌 창 닫기'],
  ]],
  ['우클릭',[
    ['저격총','누르고 있는 동안 조준경'],
    ['전등·드릴','지닌 축전지에서 전기 옮겨 담기'],
  ]],
  ['소지품 · 제작 · 사전',[
    ['{bag}','가방 — 소지품 · 고른 물건 · 제작이 한 화면에 · 끌어다 <b>손·옷·입</b> 칸에 놓는다 · 쓰레기 칸에 놓으면 버린다'],
    ['{drop}','고른 것 1개 버리기 · <b>Shift + {drop}</b> 전부 — 버릴지 한 번 묻는다(Y 예 · N 아니오) · <b>Ctrl</b> 을 누른 채면 묻지 않는다(가방의 버리기 단추 · 버리기 칸에 끌어 놓기도 같다)'],
    ['Esc','가방 닫기 · 검색칸은 눌러야 글자를 받는다(<b>Esc</b> 로 풀린다)'],
    ['{jump}(나무 앞)','나무 오르기 — 줄기를 보고 누른다 · <b>{fwd}·{back}</b> 오르내리기 · <b>{left}·{right}</b> 돌기 · 다시 <b>{jump}</b> 뛰어내리기'],
    ['{jump}(수직굴)','굴 마지막 방 바닥의 구멍 위에서 — 밧줄을 타고 <b>땅속</b>으로 내려간다 · 밑에서 밧줄 곁에 서서 누르면 올라간다(기력이 든다) · 땅속은 어둡다 — 횃불·전등을 들고 갈 것'],
    ['{dex}','사전(이 창) — 아이템·광물·조작'],
    ['1 ~ 5','빠른 칸 — 손의 것과 맞바꾼다'],
    ['{reload}','재장전'],
  ]],
  ['집 짓기',[
    ['{build}','짓기 시작·끝'],
    ['1 ~ 9','조각 고르기(토대·벽·지붕·문…) · <b>0</b> 재료 등급'],
    ['{rot} · {bFlip}','방향 돌리기 · 삼각 벽 좌우 뒤집기'],
    ['좌클릭 · {bUndo}','놓기 · 걷어내기'],
  ]],
  ['화면 · 저장',[
    ['{map}','지도 펴기/접기 — 펴면 마우스가 풀린다 · 좌클릭 핀 꽂기(따라가기) · 핀 우클릭 뽑기 · 따라가는 핀은 나침반에'],
    ['{fly}','자유 카메라'],
    ['{dev}','개발자 모드 — 날아서 둘러보기({fwd} {left} {back} {right} · {jump} 위 · {crouch} 아래 · {run} 빠르게 · 휠 빠르기 · {devNext} {devPrev} 굴 둘러보기) · 다치지도 배고프지도 않는다'],
    ['{time}','시간 빠르게(1 → 20 → 60 → 300배)'],
    ['{cfg}','설정 — 그래픽·캠코더 화면(줄 수)·음량·마우스 감도·저장 칸·섬 생성 · <b>조작 · 키 바꾸기</b>'],
    ['{perf}','성능 창'],
    ['{save} · {load}','고른 칸에 저장 · 불러오기(묻고 나서) — 놀이 5분마다 · 창을 닫거나 새로 고칠 때 자동 저장'],
    ['{newIsle}','새 섬(묻고 나서)'],
    ['Esc','일시정지'],
  ]],
];
function drawDex(){
  if(!dexOpen) return;
  const L=document.getElementById('dexL');
  let h='';
  if(dexTab==='item'){
    /* 가방에서 뺀 자세한 것이 다 여기에 있다(사용자 요청: 가방이 어렵다 — 자세한 것은 사전에) —
       먹으면 · 입으면 · 성능 · 얻는 법 · 넣어 두면(모닥불·제련로) · 이것으로 만드는 것. 위의 찾기 칸으로 거른다 */
    const q=(document.getElementById('dexS')||{value:''}).value.trim();
    const order=Object.keys(ITEMS).filter(id=>!q||ITEMS[id].n.indexOf(q)>=0||(ITEMS[id].use||'').indexOf(q)>=0);
    h+='<div class="dt">아이템 '+order.length+'종'+(q?' — \''+q.replace(/[<>&"']/g,'')+'\' 찾기':'')+'</div>';
    for(const id of order){
      const it=ITEMS[id], got=obtainOf(id), ico=ITEM_ICON[id];
      h+='<div class="de" id="dx_'+id+'">'+(ico?'<img class="ic" src="'+ico+'" alt="">':'')
        +'<div class="dn"><span>'+it.n+'</span>'
        +'<span class="dw">'+it.kg+' kg</span></div>'
        +'<div class="du">'+it.use+'</div>';
      const st=[];
      if(it.food) st.push('허기 +'+it.food); if(it.water) st.push('목마름 +'+it.water); if(it.drink) st.push('목마름 +'+it.drink.n);
      if(it.heal){ const H=it.heal; if(H.hp) st.push('체력 +'+H.hp); if(H.stam) st.push('기력 +'+H.stam); if(H.ill) st.push('탈을 가라앉힌다'); }
      if(it.raw) st.push('날것 — 탈이 날 수 있다'); if(it.poison) st.push('독'); if(it.rot) st.push(Math.round(it.rot/24)+'일이면 상한다');
      if(it.empty) st.push('다 먹으면 빈 '+ITEMS[it.empty].n+'이 남는다');
      if(it.wear){ const W=it.wear; st.push(WEAR_N[W.slot]+(W.armor?' · 방어 '+W.armor:'')+(W.warm?' · 보온 '+W.warm:'')+(W.carry?' · 적재 +'+W.carry+' kg':'')); }
      if(st.length) h+='<div class="dg"><b>쓰면</b> '+st.join(' · ')+'</div>';
      if(it.tool) h+='<div class="dg"><b>성능</b> '+toolSpec(it.tool,it)+'</div>';
      h+='<div class="dg">'+(got.length?got.map(g=>'<b>'+g.split(' — ')[0]+'</b> '
          +g.split(' — ').slice(1).join(' — ')).join('<br>')
        :'<b>처음부터 지님</b>')+'</div>';
      const put=[];
      if(FIRING[id]) put.push('타는 모닥불에 넣어 두면 → '+ITEMS[FIRING[id].out].n+(FIRING[id].count>1?' ×'+FIRING[id].count:''));
      if(FUEL[id]) put.push('땔감 — '+fmtFuel(FUEL[id])+' 동안 탄다');
      for(const S of SMELT) if(S.in.some(r=>r.id===id)||(S.need||[]).some(r=>r.id===id)) put.push('제련로 — '+S.n+' → '+ITEMS[S.out.id].n);
      if(put.length) h+='<div class="dg"><b>넣어 두면</b> '+put.slice(0,6).join('<br>')+'</div>';
      const us=RECIPES.filter(R=>R.in.some(r=>bagUses(id,r))||(R.need||[]).some(r=>bagUses(id,r)));
      if(us.length) h+='<div class="dg"><b>이것으로 만드는 것 '+us.length+'</b> '+us.map(R=>R.n).join(' · ')+'</div>';
      h+='</div>';
    }
  }else if(dexTab==='keys'){
    h+='<div class="dt">조작 안내</div>';
    for(const [title,rows] of CONTROLS_GUIDE){
      h+='<div class="de"><div class="dn"><span>'+title+'</span></div>'
        +rows.map(([k,d])=>'<div class="kr"><b>'+kbText(k)+'</b><span>'+kbText(d)+'</span></div>').join('')+'</div>';   // {행동} → 지금 키(93-keys.js)
    }
  }else{
    h+='<div class="dt">광물 '+MINERALS.length+'종</div>';
    for(const k of MINERALS){
      const R=RESOURCES.find(r=>r.k===k), g=GEO[k], M=MINE[k], H=HARVEST[k];
      const out=(M&&M.item)?ITEMS[M.item].n:(H?ITEMS[H.item].n:'—');
      let need='맨손';
      if(M) need = M.tier===1?'간이 곡괭이 이상' : M.tier===2?'돌 곡괭이 이상'
                 : '철 곡괭이 · 또는 화입 후 돌 곡괭이';
      h+='<div class="de">'
        +'<img class="ic" src="'+mineralIcon(k,R.c)+'" alt="">'
        +'<div class="dn"><span>'+R.n+'</span>'
        +'<span class="dw">'+g.tier+'</span></div>'
        +'<div class="du">'+g.note+'</div>'
        +'<div class="dg"><b>산출</b> '+g.where+'</div>'
        +'<div class="dg"><b>채취</b> '+need+' → '+out+'</div></div>';
    }
  }
  L.innerHTML=h;
}
/* 가방의 '사전에서 자세히' — 사전을 아이템 탭으로 열고 그 물건으로 굴려 밝힌다. 사전을 닫으면 가방으로 돌아간다 */
let dexBack=false;
function dexShow(id){
  if(!INV.slots.some(s=>s.id==='codex')){ toast('사전을 가지고 있지 않다'); return; }
  const s=document.getElementById('dexS'); if(s) s.value='';
  dexTab='item'; for(const [b,t] of [['dexI','item'],['dexM','mineral'],['dexK','keys']]) document.getElementById(b).classList.toggle('on',t==='item');
  if(!ITEM_ICON[id]) itemIcon(id);
  if(!dexOpen) toggleDex(); else drawDex();
  dexBack=true;
  const el=document.getElementById('dx_'+id);
  if(el){ el.classList.add('hl'); el.scrollIntoView({block:'center'}); }
}
function toggleDex(){
  if(!INV.slots.some(s=>s.id==='codex')){ toast('사전을 가지고 있지 않다'); return; }
  dexOpen=!dexOpen;
  if(!dexOpen&&dexBack){ dexBack=false; document.getElementById('dex').style.display='none'; openBag(); return; }
  if(dexOpen) dexBack=false;
  document.getElementById('dex').style.display=dexOpen?'block':'none';
  if(dexOpen){
    invOpen=false; craftOpen=false; closeCfg();
    document.getElementById('inv').style.display='none';
    document.getElementById('crf').style.display='none';
  }
  drawDex(); syncLock();
}
function closeCfg(){ cfgOpen=false; document.getElementById('cfg').style.display='none'; }
