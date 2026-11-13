/* ── 동굴 판 10 — 바위 껍데기 재질 (조각 D) ─────────────────────────────────────────────────────────────────────
   굴 껍데기 메시(31-cave10.js A2 — 벽 · 천장 · 바닥이 한 메시)를 굴 종류마다 실제 굴처럼 칠한다. `CV10.mat(kind)` 갈고리를 이 파일이 채운다
   (갈고리가 비면 31-cave10.js 의 단색 `cv10SeatMat`). 설계는 docs/notes/caves.md '5.3 바위 재질(D)' · 잰 값은 '구현 메모(D)'.
   · 사진 — data-cave-textures.js(ambientCG CC0 512² 여섯 벌: 0 석회암 · 1 현무암 · 2 화강암 · 3 사암 · 4 이끼 낀 바위 · 5 진흙 바닥)를
     배열 텍스처 두 장(빛깔 `cmC` · 법선 `cmN`)으로 올린다(22-ground-textures.js rockPhotoInit 과 같은 법 — 빛깔은 밝기만 평균 0.5 로).
   · 종류마다 재질 하나 · 셰이더 하나(결 갈래는 #define 으로 박는다 — 유니폼으로 돌리지 않는다 · terrain 노트):
       karst   크림 · 황토 석회암, 위에서 아래로 늘어진 유석 세로 결, 오목한 데 갈색, 위로 갈수록 희고 밑은 진흙빛, 젖어 횃불 쪽으로 번들 · 바닥 물웅덩이
       lava    붉은 갈색 현무암, 용암이 흐른 높이의 가로 띠 여러 겹, 매끈한 천장, 밧줄 무늬 바닥, 굴마다(굴 씨) 흰 석회 물결 띠 0 ~ 강하게
       talus   잿빛 화강암(거친 알갱이) · 지의류 얼룩(주황 · 잿빛 초록) · 눅눅한 번들 · 자갈 바닥
       shelter 밝은 사암 가로 켜 · 처마 밑을 타고 내린 검은 물 얼룩 줄 · 마른 흙 바닥
     모두 — 하늘이 트인 입구(aSky)와 위를 보는 면에 이끼(사진 4) · 땅 높이 가까운 입구 가장자리는 그 자리 바이옴 빛깔(흙 · 풀)로 녹아든다.
   · 굴 속 어둠 · 하늘 트임 · 굴 불빛은 envPatch(45-sky.js)가 넣는다 — 조각 셰이더에 `vCv10Sky` 를 선언했으니 `CV10_MESH` 갈래(정점 값)로 읽는다.
     해 · 하늘빛을 sky 로 깎는 것도 envPatch 몫(cvK10 = 1−vCv10Sky). 이 파일은 빛을 더하지 않는다 — 젖은 번들거림만 사람이 든 횃불(`torchLight`)의
     세기 · 거리대로 스스로 빛나는 몫에 얹는다(횃불이 꺼져 있으면 0 — 깊은 데 어둠은 그대로).
   · 법선 지도의 높낮이는 램버트가 정점에서 센 빛을 화소마다 고친다(rockMat 과 같은 법 — 굴 속은 횃불 쪽 · 입구는 해 쪽).
   · 굴 씨(`aCs`) — 굴마다 다른 값(석회 띠 정도)을 정점 속성 하나로 싣는다(onBuild 에서 · 재질은 종류마다 하나라 유니폼으로는 못 가른다).
   이름은 cv10Mat · CMAT · cm 로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다).
   ── 재질 틀(2026-11-11 · 판 10 굴을 실제처럼 U1) — 빛깔 · 무늬 처방은 그대로 두고 틀만 바꿨다:
   · 정수 해시(pcg3d — 예전 sin 해시는 세계 좌표 수천 m 에서 망가져 결이 생겼다) · 띠 도우미(cmWarp 단조 휨 · cmBand 띠마다 해시 · cmBandLine)
   · 미분 범프 — 무늬 높이 합 Ht(m)에서 화면 미분(dFdx · dFdy 는 if 갈래 밖)으로 법선을 고친다 · 법선 지도는 25 m 안 · 삼면 투영은 무게 0.10 밑 면을 안 읽는다
   · 반사 — 정규화 Blinn(n=min(256, 2/r⁴−2) · (n+8)/8π) + Schlick F0 정반사를 횃불에만 · 입구 쪽은 하늘 번들(F(θ) · 젖음 · sky · 하늘빛). 해 정반사 · 반짝임 점광은 없다
   · 젖음 cmWetF — 알베도 ×(1−0.45·w·공극) · 채도 +0.25w · r → 0.08 · F0 → 0.02
   · 사진 · 법선 층 굽기(cmBake — 불러올 때 한 번 · 텍스처 읽기는 그대로): 화강암 결정 반점(사진 층 2) · 스캘럽(법선 0) · 용암 기공(법선 1) · 사암 벌집(법선 3)
   · 잡음 그림 분위수(cmQuant — CM_QR05 … CM_QA95 정의 · 몫을 면적으로 맞출 문턱)
   · 정점 속성 aFh(바닥 위 높이 m) · aLay(켜 b · off · 보로노이 씨 — c._P) · aAo(정점 법선 반구 8 방위 × 0.6 · 1.4 m 의 바위 몫 → 바탕 ×mix(0.5,1,aAo)) —
     onBuild 가 일을 걸고 cmTick 이 프레임마다 0.6 ms 씩 굽는다(다 될 때까지 aAo 1 · aFh 0)
   · 해 · 구름 그림자는 껍데기의 sky<0.01 화소에서 안 읽는다(45-sky.js envPatch — 이 재질의 CM_SUNCUT 정의를 보고)
   · 디버그 정의(CMAT.dbg): CM_DBG_ALB 조명 없는 바탕 빛깔 · CM_DBG_ZONE 갈래(빨강 바탕 바위 · 초록 덧쌓임 · 파랑 바닥 · 노랑 이끼 · 땅 · 자홍 얼룩) */
const CMAT={ mats:{}, tex:null, nrm:null, left:-1, ready:false, wt:[], geo:null, q:null, qd:'',
  torch:{value:new THREE.Vector4(0,0,0,0)}, tpos:{value:new THREE.Vector3()}, tpv:{value:new THREE.Vector3(1e9,1e9,1e9)}, eye:{value:new THREE.Vector3()}, tcol:{value:new THREE.Vector3(1,0.56,0.25)},
  ao:{q:[], f:-1, budget:0.6, max:0, n:0},
  /* 종류마다: 사진 층 · 한 장의 크기(m) · 젖음 · (옛 번들 날카로움 sh — 쓰지 않음) · 이끼 몫 · 마른 거칠기 r · F0 · 공극(젖으면 어두워지는 몫) · 정반사 세기 */
  /* (U2) wet 바탕 젖음 · hum 안으로 오르는 젖음(aDeep 곱)
     (TX2) 사진 층 — L 벽 · LF 바닥 · LC 천장 · LM 큰 장(층 번호는 CMAT.SRC) · KM 큰 장 배율 · SU · SV 벽 uv 늘림 · rot 벽 uv 돌림(도 — lava 는 사진 결 −49.5° 를 수평으로) ·
     KA · KB 바탕 · 큰 장 결 세기 · SAT · SATB 사진 빛깔 몫 · JV uv 밀기의 세로 몫(켜가 있는 종류는 0) · hex 평균 빛깔(CM_DBG_BASE 검사) */
  K:{ karst:{LF:5,LC:0,LM:7,KM:3.3,SU:0.6,SV:1,rot:0,KA:1.0,KB:0.8,SAT:0.5,SATB:0.5,JV:0,hex:'CP_LIME',L:0,RS:1.7,wet:0.30,sh:90,moss:0.8,id:0,r:0.78,f0:0.045,por:0.70,ks:1,hum:0.22}, lava:{LF:7,LC:6,LM:0,KM:3.0,SU:0.5,SV:1,rot:-49.5,KA:1.0,KB:0.7,SAT:0.15,SATB:0.15,JV:1,hex:'(0.5*(CP_BAS0+CP_BAS1))',L:1,RS:2.1,wet:0.03,sh:20,moss:1.15,id:1,r:0.90,f0:0.04,por:0.40,ks:1,hum:0.08},
      talus:{LF:7,LC:2,LM:0,KM:2.6,SU:1,SV:1,rot:0,KA:0.9,KB:0.8,SAT:0.2,SATB:0.2,JV:1,hex:'CP_GRAN',L:2,RS:1.3,wet:0.40,sh:60,moss:0.9,id:2,r:0.68,f0:0.045,por:0.55,ks:1,hum:0.25}, shelter:{LF:8,LC:8,LM:9,KM:2.7,SU:0.6,SV:1,rot:0,KA:1.0,KB:0.6,SAT:0.9,SATB:0.6,JV:0,hex:'CP_SSW',L:3,RS:2.4,wet:0.0,sh:12,moss:0.3,id:3,r:0.90,f0:0.035,por:1.00,ks:1,hum:0.03} },
  /* (U2) 빛깔 — 실제 동굴 사실표(hex/255 를 바탕값으로 · 출력 부호화 없음). 셰이더에는 CP_이름 으로 든다 */
  PAL:{ LIME:'#9E9A90', MUD:'#6B5640', MUDW:'#4A3A2A', FLOH:'#D9A86C', FLOW:'#F2EEE6', MANG:'#2A2622', IRON:'#A0522D', MOON:'#F4F2EC',
        BAS0:'#3A3836', BAS1:'#4F4A45', GLAZ:'#8A8C90', OXID:'#8B3A24', CRUS:'#E8E4DA', MATG:'#C9A85A', HIGH:'#D8C46A',
        GRAN:'#9A958E', LICG:'#8C9A7E', LICY:'#C8B24A',
        SSW:'#E6D8C3', SSO:'#C98A5A', SSR:'#9A4E36', VARK:'#2E2A28', VARR:'#6A3B26', SALT:'#F0EEE8', SEEP:'#5F5A4E', ALGA:'#4E5A3A' },
  /* (U2) 입구 테 팔레트 — 풀(그 자리 바이옴 빛깔) → 낙엽 → 부식토 → 자갈 → 바위. 땅 테(U4 — 땅 셰이더 cvF)가 같은 값을 쓴다. 셰이더에는 CR_이름 */
  RIM:{ LITTER:'#5A4630', HUMUS:'#3B2F22', GRAVEL:'#857D70' } };
const cmV3=h=>{ const v=parseInt(h.slice(1),16); return 'vec3('+[(v>>16)&255,(v>>8)&255,v&255].map(x=>(x/255).toFixed(4)).join(',')+')'; };
const cmPalDefs=()=>Object.keys(CMAT.PAL).map(k=>'#define CP_'+k+' '+cmV3(CMAT.PAL[k])).join('\n')+'\n'+Object.keys(CMAT.RIM).map(k=>'#define CR_'+k+' '+cmV3(CMAT.RIM[k])).join('\n')+'\n';

/* 사진 올리기(TX2 — 층 표 CMAT.SRC · 레포 안 사진 열 장) — 다 풀리기 전에는 한 점짜리(중간 회색 · 곧게 선 법선).
   층마다 원본 c(빛깔) · n(법선 — 없으면 밝기에서 깊이 hd m 로 짓는다) · rs 한 장 크기 m(굽기의 m→화소) · blur 얼룩 걷기(1 통째 · 2 줄 평균은 남김) · cg 색 변이 · tg 중간 대역 대비 목표 · bake 굽기.
   원본: R = ROCK_JPG/ROCK_NRM(data-rock-textures.js · 22-ground-textures.js rockPhotoInit 과 같은 그림) · G = GND_JPG(data-ground-textures.js — 법선 없음) · C = CAVE_JPG/CAVE_NRM.
   땅 · 바위 사진을 갈면 굴도 바뀐다(같이 고칠 짝). R · G 가 없으면 굴 사진 여섯 장으로 물러난다(CMAT.FB) */
CMAT.SRC=[
  {nm:'R6 rock_boulder_dry · karst 벽 · 천장',  c:['R',6], n:['R',6], rs:1.7, blur:1, cg:0.6,  tg:0.13, bake:'scallop'},
  {nm:'C1 Rock047 · lava 벽',                   c:['C',1], n:['C',1], rs:2.1, blur:0, cg:0.25, tg:0.14, bake:'pore'},
  {nm:'C2 Rock028 · talus 바탕',                c:['C',2], n:['C',2], rs:1.3, blur:1, cg:0.3,  tg:0.13, bake:'crystal'},
  {nm:'R1 cliff_side · shelter 벽(켜)',          c:['R',1], n:['R',1], rs:2.4, blur:2, cg:1.0,  tg:0.14, bake:'honey'},
  {nm:'C4 Rock036 · 이끼',                      c:['C',4], n:['C',4], rs:1.1, moss:1},
  {nm:'G6 brown_mud_03 · karst 바닥 · 진흙',     c:['G',6], n:null,    rs:1.7, blur:1, cg:0.5,  tg:0.14, hd:0.015},
  {nm:'R4 seaside_rock · lava 천장',             c:['R',4], n:['R',4], rs:2.1, blur:0, cg:0.3,  tg:0.08, bake:'pore'},
  {nm:'R7 rock_05 · lava · talus 바닥 · 큰 장',   c:['R',7], n:['R',7], rs:1.7, blur:0, cg:0.4,  tg:0.14},
  {nm:'G0 sand_01 · 유석 · shelter 바닥 · 천장',  c:['G',0], n:null,    rs:2.4, blur:1, cg:0.5,  tg:0.08, hd:0.008},
  {nm:'C3 Rock052 · shelter 큰 장',              c:['C',3], n:['C',3], rs:2.4, blur:0, cg:1.2,  tg:0.10} ];
CMAT.FB={R6:0,R1:3,R4:1,R7:2,G6:5,G0:3};
CMAT.stat=[]; CMAT.loadMs=0; CMAT.aniso=1; CMAT.joints=0;   // karst 절리 벌 수(프레임 — 0 이면 끔 · 1~2)
function cmSrc(s){ if(!s) return null; const [a,i]=s;
  if(a==='R'&&typeof ROCK_JPG!=='undefined'&&ROCK_JPG[i]) return {c:ROCK_JPG[i],n:typeof ROCK_NRM!=='undefined'?ROCK_NRM[i]:null};
  if(a==='G'&&typeof GND_JPG!=='undefined'&&GND_JPG[i]) return {c:GND_JPG[i],n:null};
  const k=a==='C'?i:CMAT.FB[a+i]; return {c:CAVE_JPG[k],n:CAVE_NRM[k]}; }
function cmPhotos(){
  if(CMAT.tex||typeof CAVE_JPG==='undefined'||typeof THREE.DataTexture2DArray!=='function') return;
  const L=CMAT.SRC, n=L.length, S=512, flat=new Uint8Array(4*n);
  for(let i=0;i<n;i++) flat.set([128,128,255,255],i*4);
  CMAT.tex={value:gndArrayTex(new Uint8Array(4*n).fill(128),1,n)};
  CMAT.nrm={value:gndArrayTex(flat,1,n)};
  const cd=new Uint8Array(S*S*4*n), nd=new Uint8Array(S*S*4*n); let left=n;
  const pix=im=>{ const cv2=document.createElement('canvas'); cv2.width=cv2.height=S; const g=cv2.getContext('2d'); g.drawImage(im,0,0,S,S); return g.getImageData(0,0,S,S).data; };
  /* 밉맵은 한 장만 읽는다(LinearMipmapNearest — 두 장 섞기는 텍스처 읽기가 두 배 · 굴 속은 화면이 다 껍데기다) · 빛깔만 비등방 4 */
  const done=()=>{
    const o1=CMAT.tex.value, o2=CMAT.nrm.value;
    const t1=gndArrayTex(cd,S,n), t2=gndArrayTex(nd,S,n); t1.minFilter=t2.minFilter=THREE.LinearMipmapNearestFilter;
    if(renderer&&renderer.capabilities&&CMAT.aniso>1) t1.anisotropy=Math.min(CMAT.aniso,renderer.capabilities.getMaxAnisotropy());   // 비등방(CMAT.aniso — 프레임 때문에 기본 끔)
    CMAT.tex.value=t1; CMAT.nrm.value=t2; o1.dispose(); o2.dispose();
    CMAT.ready=true; for(const f of CMAT.wt) f(); CMAT.wt.length=0; };
  const fin=()=>{ if(--left===0) done(); };
  L.forEach((T,k)=>{ const src=cmSrc(T.c), sn=cmSrc(T.n), o=k*S*S*4; let cpx=null, npx=null, need=sn&&sn.n?2:1;
    /* 굽기 · 손질은 일을 셋으로 나눠 한 번에 오래 멈추지 않게(빛깔 굽기 → 손질 → 법선 굽기 · 사이마다 setTimeout) */
    const go=()=>{ if(--need>0) return;
      if(!cpx){ cpx=new Uint8ClampedArray(S*S*4); for(let i=0;i<S*S*4;i+=4){ cpx[i]=cpx[i+1]=cpx[i+2]=128; cpx[i+3]=255; } }
      if(!npx){ npx=new Uint8ClampedArray(S*S*4); for(let i=0;i<S*S*4;i+=4){ npx[i]=npx[i+1]=128; npx[i+2]=255; npx[i+3]=255; } }
      const st={nm:T.nm}, r1=v=>Math.round(v*10)/10, step=(f,key,nx)=>{ const t0=performance.now();
        try{ f(); }catch(e){ if(typeof showErr==='function') showErr('굴 사진 손질',e); }
        st[key]=r1(performance.now()-t0); CMAT.loadMs+=st[key]; if(nx) setTimeout(nx,0); else{ cd.set(cpx,o); nd.set(npx,o); CMAT.stat[k]=st; fin(); } };
      step(()=>cmBake(T,false,cpx,S),'bakeC',()=>step(()=>{ Object.assign(st,T.moss?cmNormMoss(cpx,S):cmNorm(cpx,S,T)); if(T.hd) cmNrmLum(npx,cpx,S,T.rs/S,T.hd); },'ms',
        ()=>step(()=>cmNormSt(st,S),'msSt',()=>step(()=>cmBake(T,true,npx,S),'bakeN',null)))); };
    const img=(s,f)=>{ const im=new Image(); im.onload=()=>{ f(pix(im)); go(); }; im.onerror=()=>go(); im.src=s; };
    if(src&&src.c) img(src.c,p=>{ cpx=p; }); else go();
    if(need===2) img(sn.n,p=>{ npx=p; });
  });
}
/* ── 사진 손질(cmNorm — 불러올 때 한 번): ① 얼룩 걷기(감아 도는 상자 흐림 반지름 32 두 번 = LP · px −= LP − 평균 · blur 2 는 LP − 그 줄의 LP 평균만 — 세로 켜 차례를 남긴다)
   ② hex 고정(채널 평균 → 127.5 — 평균 빛깔은 셰이더의 hex 가 준다) ③ 색 변이 cg(L = 0.30R+0.59G+0.11B · c = L + (c−L)·cg)
   ④ 대비 맞추기(중간 대역 σm = √(var(상자 8) − var(상자 64))/127.5 · g = clamp(tg/σm, 0.6, 2.2)) · 자른 뒤 채널 평균을 한 번 더 127.5 로. 잰 값은 CMAT.stat[층] */
function cmBox(a,S,r,tmp){   // 감아 도는 상자 흐림(가로 · 세로 한 번씩) — 제자리 · 감는 자리는 표로 · 세로는 줄 단위(열 합을 끌고 간다 — 캐시)
  const w=1/(2*r+1), b=tmp||new Float32Array(S*S), ad=new Int32Array(S), sb=new Int32Array(S), cs=new Float32Array(S);
  for(let x=0;x<S;x++){ ad[x]=(x+r+1)%S; sb[x]=((x-r)%S+S)%S; }
  for(let y=0;y<S;y++){ const o=y*S; let s=0; for(let k=-r;k<=r;k++) s+=a[o+((k%S)+S)%S];
    for(let x=0;x<S;x++){ b[o+x]=s*w; s+=a[o+ad[x]]-a[o+sb[x]]; } }
  for(let k=-r;k<=r;k++){ const o=(((k%S)+S)%S)*S; for(let x=0;x<S;x++) cs[x]+=b[o+x]; }
  for(let y=0;y<S;y++){ const o=y*S, oa=ad[y]*S, os=sb[y]*S; for(let x=0;x<S;x++){ a[o+x]=cs[x]*w; cs[x]+=b[oa+x]-b[os+x]; } }
  return a; }
/* 4×4 평균으로 줄인 그림(감아 도는 큰 흐림 · 큰 대역 분산은 이것으로 — 64 px 대역은 줄여도 같다) · 쌍선형으로 되키우기 */
function cmDown4(a,S){ const s=S>>2, o=new Float32Array(s*s);
  for(let y=0;y<S;y++){ const yr=(y>>2)*s, r=y*S; for(let x=0;x<S;x++) o[yr+(x>>2)]+=a[r+x]; }
  for(let i=0;i<s*s;i++) o[i]*=1/16; return o; }
function cmUp4(o,S){ const s=S>>2, a=new Float32Array(S*S), i0=new Int32Array(S), i1=new Int32Array(S), wu=new Float32Array(S);
  for(let x=0;x<S;x++){ const fx=(x+0.5)/4-0.5, k=Math.floor(fx); wu[x]=fx-k; i0[x]=((k%s)+s)%s; i1[x]=(k+1)%s; }
  for(let y=0;y<S;y++){ const v=wu[y], ja=i0[y]*s, jb=i1[y]*s, r=y*S;
    for(let x=0;x<S;x++){ const u=wu[x], p=i0[x], q=i1[x]; a[r+x]=(o[ja+p]*(1-u)+o[ja+q]*u)*(1-v)+(o[jb+p]*(1-u)+o[jb+q]*u)*v; } }
  return a; }
/* 대역 대비(σ/127.5) — 잔(<8 px) · 중간(8~64) · 큰(>64). 상자 64 는 4×4 로 줄인 그림의 상자 16 */
function cmBandSt(Lc,S){ const n=S*S, b8=Float32Array.from(Lc); cmBox(b8,S,4);
  const d=cmDown4(Lc,S), s=S>>2; cmBox(d,s,8);
  let m=0; for(let i=0;i<n;i++) m+=Lc[i]; m/=n; let vF=0,v8=0,v64=0;
  for(let i=0;i<n;i++){ const f=Lc[i]-b8[i], g=b8[i]-m; vF+=f*f; v8+=g*g; }
  for(let i=0;i<s*s;i++){ const g=d[i]-m; v64+=g*g; }
  vF/=n; v8/=n; v64/=s*s; return {sF:Math.sqrt(vF)/127.5, sM:Math.sqrt(Math.max(0,v8-v64))/127.5, sBig:Math.sqrt(v64)/127.5}; }
function cmNorm(px,S,T){
  const n=S*S, ch=[0,1,2].map(c=>{ const a=new Float32Array(n); for(let i=0,j=c;i<n;i++,j+=4) a[i]=px[j]; return a; });
  const mean=a=>{ let s=0; for(let i=0;i<n;i++) s+=a[i]; return s/n; };
  /* ① 얼룩 걷기 — 4×4 로 줄여 상자 반지름 8 두 번(= 원래 크기 반지름 32 두 번) 뒤 쌍선형으로 되키운 것이 LP */
  if(T.blur){ const s=S>>2;
    for(const a of ch){ const d=cmDown4(a,S); cmBox(d,s,8); cmBox(d,s,8); const lp=cmUp4(d,S);
      if(T.blur===2){ for(let y=0;y<S;y++){ let rm=0; const o=y*S; for(let x=0;x<S;x++) rm+=lp[o+x]; rm/=S; for(let x=0;x<S;x++) a[o+x]-=lp[o+x]-rm; } }
      else{ const m=mean(lp); for(let i=0;i<n;i++) a[i]-=lp[i]-m; } } }
  const fix=()=>{ for(const a of ch){ const k=127.5/(mean(a)||1); for(let i=0;i<n;i++) a[i]*=k; } };
  fix();
  const Lc=new Float32Array(n), A=ch[0], B=ch[1], C=ch[2], cg=T.cg;
  for(let i=0;i<n;i++){ const l=0.30*A[i]+0.59*B[i]+0.11*C[i]; Lc[i]=l; A[i]=l+(A[i]-l)*cg; B[i]=l+(B[i]-l)*cg; C[i]=l+(C[i]-l)*cg; }
  const s0=cmBandSt(Lc,S), g=Math.max(0.6,Math.min(2.2,T.tg/Math.max(s0.sM,1e-4)));
  for(const a of ch) for(let i=0;i<n;i++){ const v=127.5+(a[i]-127.5)*g; a[i]=v<0?0:v>255?255:v; }
  fix();
  const mu=[0,0,0];
  for(let i=0,j=0;i<n;i++,j+=4){ px[j]=A[i]; px[j+1]=B[i]; px[j+2]=C[i]; px[j+3]=255; mu[0]+=px[j]; mu[1]+=px[j+1]; mu[2]+=px[j+2]; Lc[i]=0.30*px[j]+0.59*px[j+1]+0.11*px[j+2]; }
  const r3=v=>Math.round(v*1000)/1000;
  return {mu:mu.map(v=>r3(v/n)), g:r3(g), sM0:r3(s0.sM), _L:Lc}; }
function cmNormSt(st,S){ if(!st._L) return; const s1=cmBandSt(st._L,S), r3=v=>Math.round(v*1000)/1000; st.sF=r3(s1.sF); st.sM=r3(s1.sM); st.sBig=r3(s1.sBig); delete st._L; }
/* 이끼 층 — 예전처럼 밝기만 평균 0.5 로(풀빛이 필요하다) */
function cmNormMoss(px,S){ let L=0; for(let i=0;i<px.length;i+=4) L+=0.30*px[i]+0.59*px[i+1]+0.11*px[i+2];
  const kk=127.5/(L/(S*S)||1); for(let i=0;i<px.length;i+=4){ px[i]=Math.min(255,px[i]*kk); px[i+1]=Math.min(255,px[i+1]*kk); px[i+2]=Math.min(255,px[i+2]*kk); px[i+3]=255; }
  return {mu:null,moss:1}; }
/* 법선 지도가 없는 층(땅 사진) — 손질한 빛깔의 밝기를 높이로(±hd m) 보고 기울기를 법선 층에 더한다 */
function cmNrmLum(npx,cpx,S,ps,hd){ const h=new Float32Array(S*S); for(let i=0;i<S*S;i++) h[i]=((0.30*cpx[i*4]+0.59*cpx[i*4+1]+0.11*cpx[i*4+2])/127.5-1)*hd; cmNrmAdd(npx,h,S,ps); }
/* ── 사진 · 법선 층 굽기(cmBake) — 잔 결(<2 m 의 꼴은 셰이더 몫)을 불러올 때 한 번 사진 층에 싣는다. 텍스처 읽기 수는 그대로 · 밉맵은 gndArrayTex 가 짓는다.
   무늬는 512² 그림 안에서 이어 붙게(칸 번호를 감아 돈다) · 난수는 정수 섞기(cmH2 — 지형 · 자원과 상관없는 그림이라 시드 차례를 안 건드린다).
   크기는 층의 한 장 크기(CMAT.SRC[층].rs m / 512 화소)로 m 를 화소로 옮긴다 — 굽기 갈래는 층 표의 bake(crystal 빛깔 · scallop · pore · honey 법선) */
const cmH2=(i,j,s)=>{ let h=Math.imul(i|0,374761393)^Math.imul(j|0,668265263)^Math.imul((s|0)+1,1274126177); h=Math.imul(h^(h>>>13),1103515245); return ((h^(h>>>16))>>>0)/4294967296; };
/* 이어 붙는 보로노이 — 가로 nx · 세로 ny 칸(칸 단위 거리라 nx≠ny 면 늘인 칸) · 화소마다 fn(i, F1, F2, 씨 번호, 씨까지 du, dv) */
function cmVor(S,nx,ny,sd,fn){
  const sx=new Float32Array(nx*ny), sy=new Float32Array(nx*ny);
  for(let j=0;j<ny;j++) for(let i=0;i<nx;i++){ sx[j*nx+i]=0.1+0.8*cmH2(i,j,sd); sy[j*nx+i]=0.1+0.8*cmH2(i,j,sd+1); }
  for(let y=0;y<S;y++){ const fy=y*ny/S, j=Math.floor(fy);
    for(let x=0;x<S;x++){ const fx=x*nx/S, i=Math.floor(fx); let f1=1e9,f2=1e9,id=0,du=0,dv=0;
      for(let b=-1;b<=1;b++){ const jj=j+b, wj=(jj+ny)%ny;
        for(let a=-1;a<=1;a++){ const ii=i+a, wi=(ii+nx)%nx, q=wj*nx+wi, ex=fx-(ii+sx[q]), ey=fy-(jj+sy[q]), d=Math.sqrt(ex*ex+ey*ey);
          if(d<f1){ f2=f1; f1=d; id=q; du=ex; dv=ey; } else if(d<f2) f2=d; } }
      fn(y*S+x,f1,f2,id,du,dv); } }
}
/* 이어 붙는 값잡음(칸 n · 0~1) */
const cmVN=(S,n,sd)=>{ const o=new Float32Array(S*S), sm=t=>t*t*(3-2*t);
  for(let y=0;y<S;y++){ const fy=y*n/S, j=Math.floor(fy), v=sm(fy-j); for(let x=0;x<S;x++){ const fx=x*n/S, i=Math.floor(fx), u=sm(fx-i), g=(a,b)=>cmH2((i+a)%n,(j+b)%n,sd);
    o[y*S+x]=(g(0,0)*(1-u)+g(1,0)*u)*(1-v)+(g(0,1)*(1-u)+g(1,1)*u)*v; } }
  return o; };
/* 높이(m) → 법선 층에 기울기를 더한다(이어 붙는 가운데 차분 · ps = m/화소). 셰이더는 t.x 를 그림 가로(u) 쪽, t.y 를 세로(v) 쪽 기울기로 얹는다 */
function cmNrmAdd(px,h,S,ps){
  for(let y=0;y<S;y++){ const yu=((y+S-1)%S)*S, yd=((y+1)%S)*S, yr=y*S;
    for(let x=0;x<S;x++){ const i=(yr+x)*4, gx=(h[yr+(x+1)%S]-h[yr+(x+S-1)%S])/(2*ps), gy=(h[yd+x]-h[yu+x])/(2*ps);
      if(gx===0&&gy===0) continue;
      const nz=Math.max(px[i+2]/127.5-1,0.05), sx=(px[i]/127.5-1)/nz-gx, sy=(px[i+1]/127.5-1)/nz-gy, l=Math.sqrt(sx*sx+sy*sy+1);
      px[i]=Math.round((sx/l+1)*127.5); px[i+1]=Math.round((sy/l+1)*127.5); px[i+2]=Math.round((1/l+1)*127.5); } }
}
function cmBake(T,nrm,px,S){
  const ps=T.rs/S, B=T.bake;
  if(!B) return;
  if(!nrm&&B==='crystal'){
    /* 화강암 결정 반점 — 장석 #B89A8A 27% · 석영 #D8D6D0 27% · 운모 #2B2A28 9% · 나머지는 사진 그대로. 알갱이 2~15 mm: 잔 칸(≈ 8 mm)과
       굵은 칸(≈ 25 mm — 장석 반정)을 겹쳐 잔 칸의 35% 는 굵은 칸의 갈래를 따른다. 사진 결(밝기)을 반쯤 남긴다 · 평균 밝기는 뒤의 맞춤이 0.5 로 되돌린다 */
    const nf=Math.max(8,Math.round(S*ps/0.008)), nc=Math.max(4,Math.round(S*ps/0.025)), cls=new Int8Array(S*S);
    const kind=(h)=>h<0.27?0:h<0.54?1:h<0.63?2:3;
    cmVor(S,nc,nc,0x6a1,(i,f1,f2,id)=>{ cls[i]=kind(cmH2(id,7,0x6a3)); });
    const COL=[[184,154,138],[216,214,208],[43,42,40]];
    let Lm=0; for(let i=0;i<px.length;i+=4) Lm+=0.30*px[i]+0.59*px[i+1]+0.11*px[i+2]; Lm=Lm/(S*S)||128;
    cmVor(S,nf,nf,0x6a5,(i,f1,f2,id)=>{ const k=cmH2(id,3,0x6a7)<0.35?cls[i]:kind(cmH2(id,5,0x6a9)); if(k>2) return;
      const o=i*4, l=(0.30*px[o]+0.59*px[o+1]+0.11*px[o+2])/Lm, e=Math.min(1,(f2-f1)*6), a=0.35*e, C=COL[k], m=0.7+0.3*l;
      px[o]=px[o]*(1-a)+C[0]*m*a; px[o+1]=px[o+1]*(1-a)+C[1]*m*a; px[o+2]=px[o+2]*(1-a)+C[2]*m*a; });
    return;
  }
  if(!nrm) return;
  const h=new Float32Array(S*S);
  if(B==='scallop'){
    /* 스캘럽 — 물이 판 접시 꼴 오목(5~30 cm · 가로로 늘인 칸 1.5:1 · 물이 오는 쪽(-u)이 가파르다) · 깊이 1.5 cm */
    const nx=Math.max(2,Math.round(S*ps/0.21)), ny=Math.max(2,Math.round(S*ps/0.14));
    cmVor(S,nx,ny,0x5ca1,(i,f1,f2,id,du)=>{ const t=Math.min(1,(f2-f1)/0.6), as=1+0.45*Math.max(-1,Math.min(1,du*2));
      h[i]=-0.015*(0.6+0.8*cmH2(id,1,0x5ca3))*(1-(1-t)*(1-t))*as; });
  }else if(B==='pore'){
    /* 용암 기공 — 둥근 구멍(지름 5~14 mm) 면적 6% 쯤 · 깊이 = 반지름의 반 */
    const n=Math.round(S*S*0.06/(Math.PI*2.2*2.2));
    for(let k=0;k<n;k++){ const cx=cmH2(k,1,0x7a1)*S, cy=cmH2(k,2,0x7a1)*S, r=0.006/ps*Math.exp(0.45*(cmH2(k,3,0x7a1)*2-1))*(0.6+0.4*cmH2(k,4,0x7a1)), d=0.5*r*ps, R=Math.ceil(r);
      for(let b=-R;b<=R;b++) for(let a=-R;a<=R;a++){ const q=(a*a+b*b)/(r*r); if(q>=1) continue; const x=((Math.floor(cx)+a)%S+S)%S, y=((Math.floor(cy)+b)%S+S)%S, v=-d*(1-q);
        if(v<h[y*S+x]) h[y*S+x]=v; } }
  }else if(B==='honey'){
    /* 사암 벌집 풍화 — 2~6 cm 칸 · 칸 사이 얇은 둑 · 얼룩(값잡음)진 데만 · 깊이 8 mm */
    const nc=Math.max(4,Math.round(S*ps/0.038)), mk=cmVN(S,4,0x3b1);
    cmVor(S,nc,nc,0x3b3,(i,f1,f2,id)=>{ const m=Math.min(1,Math.max(0,(mk[i]-0.52)/0.16)); if(m<=0) return; const t=Math.min(1,(f2-f1)/0.5);
      h[i]=-0.008*m*(0.7+0.6*cmH2(id,2,0x3b5))*Math.pow(t,0.6); });
  }else return;
  cmNrmAdd(px,h,S,ps);
}
/* 3 차원 잡음 그림 32³ — 칸 크기가 다른 이어 붙는 값잡음 넷(r 4 · g 8 · b 16 · a 2 칸점). 실수 텍스처 금지(헤드리스가 0 을 읽는다) — 8 비트로 담는다.
   난수는 정수 섞기(지형 · 자원과 상관없는 그림이라 시드 차례를 안 건드린다) */
function cmNoise3(){
  if(CMAT.nz) return CMAT.nz;
  const S=64, d=new Uint8Array(S*S*S*4), H=(i,j,k,c)=>{ let h=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(k,2147483647)^Math.imul(c+1,1274126177); h=Math.imul(h^(h>>>13),1103515245); return ((h^(h>>>16))>>>0)/4294967296; };
  const sm=t=>t*t*(3-2*t), C=[8,16,32,4], val=new Float32Array(S*S*S);
  /* 한 옥타브 — 격자(n³) 값을 먼저 세고 칸 안은 smoothstep 보간 · 감아 돈다 */
  const oct=(cs,c,amp)=>{ const n=S/cs, L=new Float32Array(n*n*n); for(let k=0;k<n;k++) for(let j=0;j<n;j++) for(let i=0;i<n;i++) L[(k*n+j)*n+i]=H(i,j,k,c);
    const g=(i,j,k)=>L[((k%n)*n+(j%n))*n+(i%n)];
    for(let z=0;z<S;z++){ const fz=z/cs, k=Math.floor(fz), w=sm(fz-k);
      for(let y=0;y<S;y++){ const fy=y/cs, j=Math.floor(fy), v=sm(fy-j);
        for(let x=0;x<S;x++){ const fx=x/cs, i=Math.floor(fx), u=sm(fx-i);
          val[(z*S+y)*S+x]+=amp*(((g(i,j,k)*(1-u)+g(i+1,j,k)*u)*(1-v)+(g(i,j+1,k)*(1-u)+g(i+1,j+1,k)*u)*v)*(1-w)+((g(i,j,k+1)*(1-u)+g(i+1,j,k+1)*u)*(1-v)+(g(i,j+1,k+1)*(1-u)+g(i+1,j+1,k+1)*u)*v)*w); } } } };
  for(let c=0;c<4;c++){ val.fill(0); oct(C[c],c,1);
    if(c<2){ oct(C[c]>>1,c+8,0.5); for(let i=0;i<val.length;i++) val[i]/=1.5; }   // 반 진폭 옥타브 — 등고선이 둥근 덩이로만 서지 않게
    for(let i=0;i<val.length;i++) d[i*4+c]=Math.round(val[i]*255); }
  cmQuant(d);
  const t=new THREE.DataTexture3D(d,S,S,S); t.format=THREE.RGBAFormat; t.type=THREE.UnsignedByteType;
  t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping; t.minFilter=t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.unpackAlignment=1; t.needsUpdate=true;
  return CMAT.nz={value:t};
}
/* 잡음 그림의 채널별 분위수(5 % 눈금) — 셰이더에 #define CM_QG70 0.xxxx 처럼 넣는다. 무늬의 몫(면적)을 문턱으로 맞출 때 쓴다:
   smoothstep(CM_QG70,CM_QG80,Z.g) 는 화소의 20~30 % 를 덮는다(부피 분위수 ≈ 면적 분위수) */
function cmQuant(d){
  const H=[0,1,2,3].map(()=>new Uint32Array(256)), n=d.length>>2, Q={};
  for(let i=0;i<d.length;i++) H[i&3][d[i]]++;
  for(let c=0;c<4;c++){ let acc=0,b=0;
    for(let p=5;p<=95;p+=5){ const tg=n*p/100; while(b<255&&acc+H[c][b]<tg){ acc+=H[c][b]; b++; }
      const fr=H[c][b]?(tg-acc)/H[c][b]:0; Q['CM_Q'+'RGBA'[c]+String(p).padStart(2,'0')]=Math.max(0,Math.min(1,(b-0.5+fr)/255)); } }
  CMAT.q=Q; CMAT.qd=Object.keys(Q).map(k=>'#define '+k+' '+Q[k].toFixed(4)).join('\n')+'\n';
  return Q;
}
/* 시험이 사진이 다 풀릴 때까지 기다린다(probe) */
CMAT.wait=()=>{ cmPhotos(); return (CMAT.ready||!CMAT.tex)?Promise.resolve():new Promise(r=>CMAT.wt.push(r)); };

/* ── 셰이더 글 ────────────────────────────────────────────────────────────────────────────────────────────── */
const CM_VERT=`attribute float aSky, aDeep, aFl, aCs, aFh, aAo;
attribute vec2 aSu;
varying vec2 vCmS;
attribute vec3 aLay;
varying float vCv10Sky, vCv10Deep;
varying vec3 vCmW, vCmN, vCmBio;
varying vec4 vCmA, vCmK;
varying float vCmD;
uniform vec3 cmTPv;
uniform sampler2D cmElev; uniform vec2 cmGrid; uniform sampler2D cmBio; uniform float cmBioN, cmCell;
float cmE(vec2 g){ vec4 t=texelFetch(cmElev,ivec2(clamp(g,vec2(0.0),vec2(cmGrid.x-1.0))),0); return (t.r*255.0*256.0+t.g*255.0)/65535.0*1200.0-100.0; }
`;
/* vCmA = 바닥 몫(aFl) · 바닥 위 높이 m(aFh) · 트임(aAo — 1 이 트인 데) · 땅(표고 그림)에서 몇 m 위인가 / vCmK = 켜 사이 b · 켜 기준 off · 보로노이 씨 · 굴 씨(aCs)
   (따로따로 float 로 넘기면 varying 칸이 모자랄 수 있어 vec4 둘에 묶는다) */
const CM_VMAIN=`#include <begin_vertex>
  { vec4 w4=modelMatrix*vec4(transformed,1.0); vCmW=w4.xyz; vCmN=mat3(modelMatrix)*objectNormal; vCmD=length((modelViewMatrix*vec4(transformed,1.0)).xyz);
    vCv10Sky=aSky; vCv10Deep=aDeep;
    vec2 mg=w4.xz/cmGrid.y+cmGrid.x*0.5, mf=fract(mg); mg=floor(mg);
    float gh=w4.y-mix(mix(cmE(mg),cmE(mg+vec2(1.0,0.0)),mf.x),mix(cmE(mg+vec2(0.0,1.0)),cmE(mg+vec2(1.0,1.0)),mf.x),mf.y);
    vCmA=vec4(aFl,aFh,aAo,gh); vCmK=vec4(aLay,aCs); vCmS=aSu;
    vCmBio=texture2D(cmBio,(w4.xz/cmCell+cmBioN*0.5+0.5)/cmBioN).rgb; }`;
const CM_FRAG=`varying float vCv10Sky, vCv10Deep;
varying vec2 vCmS;
uniform vec4 uCv10Glow;
varying vec3 vCmW, vCmN, vCmBio;
varying vec4 vCmA, vCmK;
varying float vCmD;
uniform mediump sampler2DArray cmC;
uniform mediump sampler2DArray cmN;
uniform vec4 cmT; uniform vec3 cmTP, cmTC, cmSun, cmEye;
uniform mediump sampler3D cmZ;
/* 정수 해시 pcg3d(Jarzynski · Olano 2020) — 칸 번호(정수)마다 0~1 셋. 세계 좌표가 커도 결이 안 생긴다(예전 fract(sin) 해시는 수천 m 에서 망가졌다) */
uvec3 cmPcg(uvec3 v){ v=v*1664525u+1013904223u; v.x+=v.y*v.z; v.y+=v.z*v.x; v.z+=v.x*v.y; v^=v>>16u; v.x+=v.y*v.z; v.y+=v.z*v.x; v.z+=v.x*v.y; return v; }
vec3 cmH3(vec3 p){ return vec3(cmPcg(uvec3(ivec3(floor(p)))))*(1.0/4294967296.0); }
float cmH(vec3 p){ return cmH3(p).x; }
/* 31-cave10.js cv10H 와 같은 정수 해시(Math.imul 은 2³² 둘레 곱 — uint 곱과 같다) — 바위틈 덩이 칸이 JS 몸(cv10Eval P.vor)과 같은 자리 */
float cmJH(int i,int j,int s){ uint h=(uint(i)*374761393u)^(uint(j)*668265263u)^(uint(s)*1274126177u); h=(h^(h>>13u))*1103515245u; return float(h^(h>>16u))*(1.0/4294967296.0); }
/* 띠 — 단조 휨 y' = y/t + 0.3 sin(1.3 y/t + ph) + 0.12 sin(3.7 y/t + ph) (기울기 1 − 0.39 − 0.444 > 0 이라 띠 차례가 안 뒤집힌다 · 간격만 고르지 않다) */
float cmWarp(float y,float t,float ph){ float u=y/t; return u+0.3*sin(1.3*u+ph)+0.12*sin(3.7*u+ph); }
/* 띠마다 해시 — x 있음(문턱과 견줄 0~1) · y 띠 안 자리(0~1) · z 두께 · w 톤. sd 는 무늬마다 다른 씨 */
vec4 cmBand(float y,float t,float ph,float sd){ float u=cmWarp(y,t,ph), k=floor(u); vec3 h=cmH3(vec3(k,sd,17.0)); return vec4(h.x,u-k,h.y,h.z); }
/* 띠 줄 — 있음 몫 pr 안의 띠만 · 띠 안 자리가 두께(th×(0.5+해시)) 안이면 1 · 가장자리는 fw(화면 미분) 만큼 흐리게 · cut(cmZ 얼룩 0~1)으로 끊는다 */
float cmBandLine(vec4 b,float pr,float th,float fw,float cut){ float w=th*(0.5+b.z); return step(b.x,pr)*cut*(1.0-smoothstep(w-fw,w+fw,b.y)); }
/* 삼면 투영(TX2) — 벽 면(X · Z)은 층 L · 위아래 면(Y)은 층 LY(바닥 CM_LF · 천장 CM_LC) · uv 는 밖에서 센 것(벽은 종류마다 돌림 · 늘림 CM_M) · 무게 0.10 밑 면은 안 읽는다(굴 속 화소가 화면을 다 덮어 읽는 수가 곧 프레임이다) */
vec3 cmTri(vec2 uX,vec2 uY,vec2 uZ,vec3 tw,float L,float LY){ vec3 r=vec3(0.0);
  if(tw.x>0.10) r+=texture(cmC,vec3(uX,L)).rgb*tw.x;
  if(tw.y>0.10) r+=texture(cmC,vec3(uY,LY)).rgb*tw.y;
  if(tw.z>0.10) r+=texture(cmC,vec3(uZ,L)).rgb*tw.z;
  return r/max(tw.x*step(0.10,tw.x)+tw.y*step(0.10,tw.y)+tw.z*step(0.10,tw.z),1e-3); }
/* 사진이 정하는 가장자리 — f 문턱에서의 거리(안쪽 +) · w 넘어가는 너비 · hp 사진 높이 대용(평균 0) · k 사진 몫(낮은 데를 메우는 것 −, 높은 데를 덮는 것 +) */
float cmHB(float f,float w,float hp,float k){ return smoothstep(0.35,0.65,f/w+0.5+k*hp); }
float cmLum(vec3 c){ return dot(c,vec3(0.30,0.59,0.11)); }
/* 젖음 — 알베도 ×(1−0.45·w·공극) · 채도 +0.25w · 거칠기 → 0.08 · F0 → 0.02(물 막) */
void cmWetF(inout vec3 c,inout float r,inout float f0,float w,float por){
  c*=1.0-0.45*w*por; float l=cmLum(c); c=max(vec3(0.0),vec3(l)+(c-vec3(l))*(1.0+0.25*w));
  r=mix(r,0.08,w); f0=mix(f0,0.02,w); }
`;
/* 조각 본문 — color_fragment 뒤. diffuseColor 를 고치고 정반사(횃불) · 하늘 번들을 totalEmissiveRadiance 에 더한다 */
const CM_BODY=`#include <color_fragment>
#ifndef CM_NO_ALL
  {
    vec3 p=vCmW, n=normalize(vCmN)*(gl_FrontFacing?1.0:-1.0);
    float dist=vCmD, nearK=clamp(1.0-dist/40.0,0.0,1.0), nrmK=clamp(1.0-dist/14.0,0.0,1.0), sky=vCv10Sky, fl=vCmA.x, ao=vCmA.z;
    /* (TX2) 투영 무게는 면의 참 법선으로 — 매끈한 정점 법선과 26° 안이면 그대로 · 45° 넘게 어긋나면 면 법선(가파른 턱에 위 투영이 걸려 사진이 세로로 늘어나던 것) · 미분은 갈래 밖 */
    vec3 dpx=dFdx(p), dpy=dFdy(p), ngr=cross(dpx,dpy); vec3 ng=dot(ngr,ngr)>1e-20?normalize(ngr):n; ng*=dot(ng,n)<0.0?(0.0-1.0):1.0;
    vec3 nt=normalize(mix(n,ng,1.0-smoothstep(0.70,0.90,dot(n,ng))));
    vec3 tw=pow(abs(nt),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4;
    float flo=smoothstep(0.35,0.75,n.y)*(1.0-smoothstep(0.30,0.55,fl));            // 바닥
    float cei=smoothstep(0.25,0.70,-n.y);                                            // 천장
    float wal=clamp(1.0-flo-cei,0.0,1.0);                                            // 벽
    /* 잡음은 3 차원 잡음 그림(cmZ — 32³ · 채널마다 칸 크기가 다르다: r 1/8 · g 1/4 · b 1/2 · a 1/16 판) 한 번에 넷씩 읽는다 */
#ifdef CM_NO_NOISE
    vec4 Z1=vec4(0.5);
#else
    vec4 Z1=texture(cmZ,p/12.0);                                                     // r 1.5 · g 3 · b 6 · a 0.75 m 얼룩
#endif
    /* 많이 섞인 면 하나 — 법선 지도 · 이끼 · 큰 사진은 이 면에서 한 장만 읽는다 */
    bool ax=tw.x>tw.y&&tw.x>tw.z, ay=!ax&&tw.y>tw.z;
    vec2 pd=ax?p.zy:(ay?p.xz:p.xy);
    /* 사진 uv — 벽은 CM_M(돌림 × 늘림) · 잡음으로 살짝 민다(되풀이 숨기기 · 켜가 있는 종류는 가로만) · 위아래 면 층은 바닥 · 천장 따로 */
    vec2 jv=(Z1.ra-0.5)*0.25*vec2(1.0,CM_JV);
#if CM_KIND==2
    /* (TX4) 바위틈 덩이 — 31-cave10.js cv10Eval 의 P.vor 와 같은 1.8 m 칸 · 같은 씨. 사진 읽기 앞에서 세어 덩이마다 사진 자리 · 톤 · 풍화 빛을 바꾼다(덩이마다 다른 돌) ·
       위 · 아래 덩이(aFl) · 이웃 두 칸의 해시로 틈 갈래(실금 30 · 빈틈 50 · 메워진 틈 20%) */
    vec3 tbC=CP_GRAN, tbH=vec3(0.5); float tbE=9.0, tbT=0.5, tbP=0.5, tbW=0.01;
    { vec2 X=p.xz/1.8, ib=floor(X); float d1=9.0, d2=9.0; ivec2 c1=ivec2(0), c2=ivec2(0); int iv=int(floor(vCmK.z+0.5));
      for(int b=-1;b<=1;b++) for(int a=-1;a<=1;a++){ int i=int(ib.x)+a, j=int(ib.y)+b;
        float d=length(X-vec2(float(i)+0.15+0.7*cmJH(i,j,iv),float(j)+0.15+0.7*cmJH(i,j,iv+1)));
        if(d<d1){ d2=d1; c2=c1; d1=d; c1=ivec2(i,j); } else if(d<d2){ d2=d; c2=ivec2(i,j); } }
      float hv=step(0.5,fl+0.2*(Z1.r-0.5)), vsf=floor(vCmK.z+0.5);
      tbH=cmH3(vec3(float(c1.x),float(c1.y)+4096.0*hv,61.0+vsf));
      tbE=(d2-d1)*0.5;
      vec3 ph=cmH3(vec3(float(min(c1.x,c2.x))*7.0+float(max(c1.x,c2.x)),float(min(c1.y,c2.y))*7.0+float(max(c1.y,c2.y)),83.0+vsf));
      tbT=ph.x; tbP=ph.y*ph.y; tbW=tbT<0.3?0.005:(tbT<0.8?0.01+0.03*ph.y:0.05+0.07*ph.y);
      tbC=tbH.y<0.60?CP_GRAN:(tbH.y<0.85?vec3(0.659,0.580,0.431):vec3(0.722,0.604,0.541));
      tbC*=exp(0.2*(tbH.z-0.5));
      jv+=cmH3(vec3(float(c1.x),float(c1.y)+4096.0*hv,67.0+vsf)).xy*1.7; }
#endif
    vec2 uX=CM_M*vec2(p.z,p.y)/CM_RS+jv, uZ=CM_M*vec2(p.x,p.y)/CM_RS+jv, uY=p.xz/CM_RS+jv;
    float LY=n.y>0.0?CM_LF:CM_LC;
#ifdef CM_NO_PHOTO
    vec3 rk=vec3(0.5), rk2=vec3(0.5);
#else
    vec3 rk=cmTri(uX,uY,uZ,tw,CM_L,LY);
    /* 큰 장 — 다른 사진(층 CM_LM)을 CM_KM 배 크게 · 돌려 · 비켜 한 장 더(같은 금이 크게 한 번 더 서지 않게 · 수십 cm 얼룩은 큰 장이 준다) */
    vec3 rk2=texture(cmC,vec3(mat2(0.83,-0.56,0.56,0.83)*pd/(CM_RS*CM_KM)+vec2(0.37,0.71),CM_LM)).rgb;
#endif
    /* 평균을 지키는 섞기 — 사진은 불러올 때 채널 평균 0.5(cmNorm)라 E[dt]=1 → 바탕의 평균 = hex 그대로 · 사진은 결만 바꾼다 */
    vec3 dA=rk*2.0-1.0, dB=rk2*2.0-1.0; float lA=cmLum(dA), lB=cmLum(dB);
    vec3 dt=max(vec3(0.08),vec3(1.0)+CM_KA*mix(vec3(lA),dA,CM_SAT)+CM_KB*mix(vec3(lB),dB,CM_SATB));
    float hp=0.6*lA+0.4*lB;                                                          // 사진 높이 대용(평균 0) — 가장자리를 사진이 정하게(cmHB)
    float fine=0.5+0.5*lA, fine2=0.5+0.5*lB, jt=fine-0.5, big=Z1.g, mid=Z1.a;      // 잔 결 · 큰 장 밝기 · jt — 경계를 사진 결로 들쭉날쭉하게
    vec3 c, zn=vec3(1.0,0.0,0.0);                                                // zn: 갈래(CM_DBG_ZONE) — 빨강 바탕 바위 · 초록 덧쌓임 · 파랑 바닥(진흙) · 노랑 이끼 · 녹조 · 테 · 자홍 얼룩(철 · 망간 · 산화 · 칠)
    float wet=CM_WET, rel=1.0, Ht=0.0, rg=CM_R, f0=CM_F0, pr=CM_POR, sss=0.0;                            // wet: 젖음(0~1 로 자른다) · rel: 법선 지도 세기 · Ht: 무늬 높이 합(m — 미분 범프) · rg · f0: 거칠기 · F0
    vec3 sT=vec3(1.0);                                                               // 정반사 빛깔(글레이즈는 바탕빛에 물든다)
    float fh=vCmA.y, cs=vCmK.w, vs=floor(vCmK.z+0.5), dS=-5.0*log(max(sky,1e-4));    // fh 바닥 위 높이 m · cs 굴 씨 · vs 보로노이 씨 · dS 열린 데까지 m(aSky=exp(−d/5) 를 되돌림)
    float fwY=max(fwidth(p.y),1e-4), fwH=max(fwidth(fh),1e-4);
    float lvOK=step(-1.5,fh)*(1.0-smoothstep(2.0,3.0,fwH/fwY));                    // (TX3) 수위 무늬 문 — 굽기 전(−2) · 기준 바닥이 뛰는 데는 끈다
    vec2 su=vCmS;                                                                    // 길 거리 s(m) · 가로 자리 u                       // 줄의 화면 너비(갈래 밖에서 센다)
#if CM_KIND==0
    /* (TX4) 석회암 용식 굴 — 원인 사슬: 켜 진 석회암 + 절리 두 벌 → 물은 젖은 절리 · 켜 틈으로 → 그 밑에 유석 / 큰물 → 수위 밑 진흙(욕조 테) · 선반 윗면 진흙 → 진흙 위 망간 / 입구 쪽 응결 → 달우유.
       줄을 빛깔 선으로 긋지 않는다 — 턱(Ht) · 톤 계단 · 닿는 그늘 · 사진이 깎는 가장자리(cmHB) */
    c=CP_LIME*dt;
    /* 켜 — 기하 켜(aLay)의 경계(0.12 b 올림 · 물결) · 켜마다 톤(이웃 세 켜 묶음 상관 0.5) · 두드러짐 = 해시^2.5 → 홈 + 경계 밑 그늘(턱 밑) */
    float lb=max(vCmK.x,0.3), lq=(p.y-vCmK.y+0.04*(Z1.b-0.5)+0.012*jt)/lb-0.12, lk=floor(lq), lf=lq-lk;
    vec3 lh=cmH3(vec3(lk,vs,31.0)), lhU=cmH3(vec3(lk+1.0,vs,31.0)); float hbk=lh.x;
    float dUp=(1.0-lf)*lb, proU=pow(lhU.y,2.5), bwk=smoothstep(0.15,0.5,sqrt(max(0.0,1.0-n.y*n.y)))*(1.0-flo);
    c*=0.94+0.12*hbk;
    float gw=0.01+0.04*proU, grv=(1.0-smoothstep(0.0,gw+fwY,dUp))*bwk;
    Ht-=grv*(0.01+0.04*proU); c*=1.0-0.22*proU*exp(0.0-dUp/(0.03+0.05*proU))*bwk;
    /* 절리(프레임 때문에 한 벌만 — 둘째 벌은 i<2) — 방위는 굴 씨에서(세계 축에 안 묶임) · 간격 2.2 m 로그정규 어림(칸 자리 흔들기 + 있음 0.55) · 금은 2~6 켜마다 끊기고 비켜 다시 선다 · 젖은 금(굴마다 몫) */
    float jd=9.0, jh=0.0, jwz=1.0;
    for(int i=0;i<CM_JN;i++){ float a=cs*6.2832+float(i)*(1.05+0.5*fract(cs*7.1)); vec2 dr2=vec2(cos(a),sin(a));
      float u=(dot(p.xz,dr2)+0.2*(fract(cs*(3.1+float(i)))-0.5)*p.y)/2.2, k0=floor(u-0.5);
      for(int t=0;t<=1;t++){ float kk=k0+float(t);
        vec3 h=cmH3(vec3(kk,float(i)+vs*2.0,floor(lk/(3.0+2.0*float(i)))+41.0)); float cx=kk+0.5+0.7*(h.y-0.5), d=abs(u-cx)*2.2;
        if(h.x<0.55&&d<jd){ jd=d; jh=h.y; jwz=h.z; } } }
    float jpro=jh*jh, jw=0.004+0.03*jpro, jl=(1.0-smoothstep(jw,jw+0.01+fwY,jd+0.004*jt))*clamp(wal+cei,0.0,1.0);
    c*=1.0-0.03*jl*(0.3+0.7*jpro); Ht-=0.035*jl*(0.3+0.7*jpro);
    float vein=jl*step(0.88,fract(jh*13.7)); c=mix(c,CP_FLOW*dt,vein*0.6); rg=mix(rg,0.45,vein);
    /* 유석 — 젖은 금(굴마다: 마른 0.05 · 보통 0.4 · 화려 0.8) 밑 · 위 켜 경계에서 아래로 넓어지는 부채 · 길이 0.6~2.6 켜 · 두께 t 에서 빛깔(가장자리 갈색 → 꿀색 → 흰) */
    float tier=fract(cs*3.3), wsh=tier<0.35?0.05:(tier<0.80?0.40:0.80), wetJ=step(jwz,wsh);
    vec4 S=texture(cmZ,vec3(p.x*1.25,p.y*0.085,p.z*1.25));                            // 세로로 늘인 잡음 — 기둥 · 길이
    float Lf=lb*(0.6+2.0*S.g), dyy=min(dUp,3.0), fan=0.25+0.35*dyy;
    float drw=wetJ*(1.0-smoothstep(fan*0.5,fan,jd+0.25*(S.r-0.5)))*(1.0-smoothstep(0.6*Lf,Lf,dUp))*clamp(wal+cei,0.0,1.0)*(1.0-flo);
    float dr=smoothstep(-0.15*(0.5),0.15*(0.5),drw-0.5)*step(0.02,drw);
    float dry=smoothstep(0.15,0.5,sky);
    vec3 fcol=mix(vec3(0.612,0.420,0.243),CP_FLOH,smoothstep(0.25,0.55,drw));
    fcol=mix(fcol,CP_FLOW,smoothstep(0.70,0.95,drw)*smoothstep(0.35,0.75,S.r));
    c=mix(c,fcol*mix(vec3(1.0),dt,0.6),dr); zn=mix(zn,vec3(0.0,1.0,0.0),dr);
    Ht+=0.015*dr*(S.r-0.5)+0.01*dr;
    rg=mix(rg,mix(0.10,0.45,dry),dr); f0=mix(f0,mix(0.02,0.05,dry),dr); wet=mix(wet,mix(0.9,0.12,dry),dr); pr=mix(pr,0.25,dr); sss=dr;
    /* 철 — 철분 켜 경계(10%) 밑 녹물 줄(곱 · 불투명 0.35) */
    float fe=step(0.9,lhU.z)*(1.0-smoothstep(0.1,0.15+0.5*S.g,dUp))*smoothstep(0.55,0.75,S.b)*wal*(1.0-dr)*0.35;
    c*=mix(vec3(1.0),CP_IRON/CP_LIME,fe); zn=mix(zn,vec3(1.0,0.0,1.0),fe);
    /* 달우유 — 입구 쪽 천장(dS 3~15 m) 오목한 데 */
    float mm=cei*smoothstep(3.0,5.0,dS)*(1.0-smoothstep(12.0,15.0,dS))*(1.0-smoothstep(0.85,0.95,ao))*smoothstep(-0.15*(0.06),0.15*(0.06),Z1.b-CM_QB85)*0.6;
    c=mix(c,CP_MOON*(0.85+0.3*fine),mm); zn=mix(zn,vec3(0.0,1.0,0.0),mm); rg=mix(rg,0.95,mm);
    /* 진흙 — (a) 바닥의 낮은 데(가림 · 사진 낮은 데부터) (b) 수위 밑 벽: 위 가장자리 또렷 · 줄 밑 짙고 아래로 얼룩 (c) 선반 · 턱 윗면. 수위는 굴마다 0.4~1.2 m · 길 따라 이어지다 끊김 */
    float wl=0.4+0.8*fract(cs*7.31), wlOn=step(0.3,cmH(vec3(floor(su.x/9.0+fract(cs*3.1)),vs,59.0)));
    float bel=wl-fh;
    float mudW=wal*lvOK*wlOn*(1.0-smoothstep(-0.012,0.004,0.0-bel+0.01*hp))*mix(0.85,smoothstep(0.42,0.62,Z1.r-0.3*hp),smoothstep(0.05,0.35,bel));
    float mudL=wal*smoothstep(0.30,0.50,n.y)*smoothstep(-0.15*(0.15),0.15*(0.15),Z1.a-0.35)*0.8;
    float mudF=flo*smoothstep(-0.06,0.06,0.55*Z1.r+0.45*(1.0-ao)-0.40+0.15*(0.5-mid)+0.18*(S.g-0.5)+0.12*(Z1.a-0.5)+0.10*(0.5-fine2));
    float mud=max(max(mudW,mudL),mudF), mwt=mud*(1.0-smoothstep(0.0,0.6,fh))*smoothstep(0.45,0.70,Z1.r);
    c=mix(c,mix(CP_MUD,CP_MUDW,mwt)*mix(vec3(1.0),dt,0.8),mud*mix(1.0,0.55,flo)); Ht-=0.02*mudF; c*=1.0-0.10*mudF; zn=mix(zn,vec3(0.0,0.0,1.0),mud);
    rg=mix(rg,mix(0.95,0.3,mwt),mud); wet=mix(wet,mwt,mud); pr=mix(pr,0.0,mud);
    float pud=flo*mudF*smoothstep(-0.15*(0.05),0.15*(0.05),Z1.r-0.76)*(1.0-smoothstep(0.05,0.3,fh));   // 고인 물 — 가장 낮은 바닥에만
    c*=1.0-0.15*pud; wet=mix(wet,1.0,pud); rel*=1.0-pud; rg=mix(rg,0.05,pud);
    float mn=mudW*(1.0-smoothstep(0.01,0.04,bel))*step(0.4,fract(su.x*0.2+cs*7.0))*0.8;   // 망간 — 수위선 욕조 테(구간 40%)
    mn=max(mn,mudF*(1.0-smoothstep(0.0,0.1,fh))*smoothstep(-0.15*(0.03),0.15*(0.03),mid-CM_QA90)*0.6);
    c=mix(c,CP_MANG*mix(vec3(1.0),dt,0.5),mn); zn=mix(zn,vec3(1.0,0.0,1.0),mn);
    rel*=1.0-0.8*max(flo,mud);
#elif CM_KIND==1
    /* (TX4) 용암굴 — 잿빛 현무암 #3A3836~#4F4A45 바탕 · 수위 줄 2~5(턱 · 그늘 — 줄을 긋지 않는다) · 최고 자국 · 은빛 글레이즈(천장) · 러너 ·
       붉은 산화는 '몫'으로(입구 안 30% → 길 20 m 에서 0 — 채광창이 많아 굴 대부분이 dS<20 이어도 넘치지 않게) · 밧줄 바닥은 길 좌표(aSu)로 흐름에 볼록한 호 */
    c=mix(CP_BAS0,CP_BAS1,smoothstep(CM_QG30,CM_QG70,big))*dt;
    vec4 S=texture(cmZ,vec3(p.x*1.6,p.y*0.05,p.z*1.6));
    float fy=fh+0.04*(Z1.b-0.5)+0.012*jt;
    vec4 fb=cmBand(fy,0.45,cs*6.2832,vs+5.0);
    float fpro=fb.z*fb.z, fon=step(fb.x,0.55)*lvOK*cmHB(Z1.a-0.35,0.2,hp,0.4)*(1.0-smoothstep(2.2,3.2,fy))*step(0.15,fy)*wal*(1.0-smoothstep(0.08,0.25,fwH/0.45));
    c*=1.0-0.10*fon*smoothstep(0.70,0.97,fb.y)*(0.5+fpro); c*=1.0+0.05*fon*smoothstep(0.0,0.06,fb.y)*smoothstep(0.18,0.06,fb.y);
    Ht-=0.045*fon*smoothstep(0.80,0.97,fb.y)*(0.4+0.6*fpro);
    /* 최고 자국 — 굴의 60% · 욕조 테 2~6 cm · 반은 끊김 */
    float hmh=0.50+0.2*fract(cs*3.7), hmd=fy-hmh;
    float hk=step(fract(cs*5.9),0.6)*lvOK*wal*(1.0-smoothstep(0.0,0.006+fwH,0.0-hmd))*(1.0-smoothstep(0.02,0.06,hmd))*step(0.5,cmH(vec3(floor(su.x/3.0),vs,67.0)))*cmHB(Z1.r-0.4,0.2,hp,0.6)*0.25;
    c=mix(c,CP_HIGH*dt,hk); zn=mix(zn,vec3(0.0,1.0,0.0),hk);
    /* 은빛 글레이즈 — 천장 · 윗벽 · 굴마다 몫 0~40% · 알베도는 조금만(은빛은 정반사가 낸다) · 높은 데부터 */
    float ga=0.4*fract(cs*13.7), gth=mix(CM_QG95,CM_QG55,ga/0.4);
    float gz=cmHB(big*0.8+mid*0.2-gth,0.08,hp,0.5)*(cei+wal*smoothstep(0.6,0.85,fl))*step(0.02,ga);
    c=mix(c,c*0.8+CP_GLAZ*0.15,gz); zn=mix(zn,vec3(0.0,1.0,0.0),gz);
    rg=mix(rg,0.22+0.16*Z1.a,gz); f0=mix(f0,0.20,gz); pr=mix(pr,0.1,gz); sT=mix(sT,vec3(0.85,0.87,0.95),gz);
    /* 러너 — 줄 밑 흘러내린 구슬 자국 */
    float rn=smoothstep(CM_QR90,CM_QR95+0.02,S.r)*wal*smoothstep(0.35,0.7,fl)*step(0.45,mid);
    c=mix(c,c*1.2,rn); Ht+=0.008*rn; rg=mix(rg,0.30,rn); f0=mix(f0,0.05,rn);
    /* 붉은 산화 — 몫 0.30·ok^1.5 · 금 · 오목한 데부터(k<0) · 먼 쪽 #6B4A33 → 가까운 쪽 #8B3A24 · 얇은 막(곱) */
    float ok=clamp(1.0-dS/20.0,0.0,1.0), ok15=ok*sqrt(ok), oth=mix(1.05,CM_QB70,ok15);
    float ox=cmHB(Z1.b+0.30*(S.b-0.5)+0.25*(mid-0.5)+0.15*(fine2-0.5)-oth,0.12,hp,0.0-0.4)*step(0.001,ok)*(1.0-0.6*flo);
    vec3 oxc=mix(vec3(0.420,0.290,0.200),CP_OXID,ok);
    c=mix(c,c*oxc/(0.5*(CP_BAS0+CP_BAS1)),0.5*ox); zn=mix(zn,vec3(1.0,0.0,1.0),ox); rg=mix(rg,0.88,ox);
    /* 흰 크러스트 · 금빛 세균 매트 — 합 5% 밑 */
    float cr=cmHB(mid-CM_QA95,0.02,hp,0.5)*smoothstep(0.5,0.6,Z1.r)*(cei+wal*smoothstep(0.5,0.8,fl));
    c=mix(c,CP_CRUS*(0.8+0.4*fine2),cr); zn=mix(zn,vec3(0.0,1.0,0.0),cr); rg=mix(rg,0.9,cr); wet*=1.0-cr;
    float mt=cmHB(Z1.r-CM_QR95,0.02,hp,0.5)*smoothstep(0.55,0.65,mid)*wal*smoothstep(8.0,12.0,dS);
    c=mix(c,CP_MATG*(0.8+0.4*fine2),mt); zn=mix(zn,vec3(0.0,1.0,0.0),mt); rg=mix(rg,0.9,mt); wet*=1.0-mt;
    /* 밧줄 바닥 — 길 좌표: 위상 s·k − A(1−u²) (흐름 쪽으로 볼록한 호) · 굴길 가운데(u<0.6) · s 따라 밭과 매끈한 판이 번갈아 */
    float rpA=(su.x-1.4*(1.0-su.y*su.y)+0.3*(Z1.r-0.5))*(6.2832/0.14), rf=1.0-smoothstep(0.6,1.6,fwidth(rpA));
    float rp=smoothstep(-0.6,0.8,sin(rpA+3.0*jt)), rpk=flo*rf*(1.0-smoothstep(0.5,0.7,su.y))*smoothstep(0.35,0.65,cmH(vec3(floor(su.x/4.0),vs,71.0))+0.3*(Z1.b-0.5));
    c*=mix(1.0,0.97+0.06*rp,rpk); Ht+=0.015*rpk*rp; rg=mix(rg,0.55,rpk*rp); zn=mix(zn,vec3(0.0,0.0,1.0),flo*(1.0-ox));
    rel=mix(rel,0.35,cei);
#elif CM_KIND==2
    /* (TX4) 화강암 바위틈 — 덩이마다 다른 돌(톤 · 풍화 빛 · 사진 자리 — 머리에서 tb*) · 틈 셋(실금 · 빈틈 · 메워진 틈) · 덩이마다 지의류 덮개 · 틈에서 내린 물때 */
    c=tbC*dt;
    float bk=1.0-smoothstep(0.0,tbW+fwY*2.0,tbE*1.8+0.01*jt);                       // 틈(덩이 경계까지 m 어림)
    bk*=(cei+wal*0.6+flo*0.3);
    if(tbT<0.30){ c*=1.0-0.10*bk; Ht-=0.005*bk; }
    else if(tbT<0.80){ c*=1.0-0.05*bk-0.03*(1.0-smoothstep(0.0,0.04+tbW,tbE*1.8)); Ht-=(0.03+0.05*tbP)*bk; }
    else{ float fz=1.0-smoothstep(0.0,0.05+0.07*tbP,tbE*1.8); c=mix(c,vec3(0.353,0.275,0.188)*mix(vec3(1.0),dt,0.6),fz*0.5); Ht-=0.01*fz; zn=mix(zn,vec3(0.0,0.0,1.0),fz); rg=mix(rg,0.95,fz); }
    c*=1.0+0.06*step(0.5,tbH.z)*(1.0-smoothstep(0.05,0.15,tbE*1.8));               // 오래된 덩이 — 가장자리가 닳아 밝다
    zn=mix(zn,vec3(1.0,0.0,1.0),bk*0.3);
    /* 지의류 — sky>0.45 의 위를 보는 면 · 덩이마다 덮개 0~80%(해시²) · 사진 얼룩 꼴을 따른다 */
    float lz=smoothstep(0.45,0.70,sky)*smoothstep(0.15,0.55,n.y), lcov=0.8*tbH.x*tbH.x;
    float li=lz*cmHB(mid+0.4*lB-mix(1.2,CM_QA30,lcov),0.06,hp,0.6);
    c=mix(c,(tbH.z<0.6?CP_LICG:CP_LICY)*mix(vec3(1.0),dt,0.6),li*0.85); zn=mix(zn,vec3(0.0,1.0,0.0),li); rg=mix(rg,0.95,li); wet*=1.0-li;
    /* 물때 — 틈 · 벽 윗단에서 아래로 가늘어지는 줄(곱) */
    vec4 S=texture(cmZ,vec3(p.x*0.9,p.y*0.03,p.z*0.9));
    float stk=cmHB(S.b*0.7+S.r*0.3-CM_QB85,0.03,hp,0.0-0.4)*wal*smoothstep(0.3,0.6,Z1.b);
    c*=mix(1.0,0.55,stk); zn=mix(zn,vec3(1.0,0.0,1.0),stk); wet=mix(wet,0.85,stk); rg=mix(rg,0.25,stk);
    wet+=0.25*vCv10Deep*smoothstep(0.5,0.7,Z1.b);
    /* 바닥 — 흙과 자갈 */
    if(flo>0.01){ vec3 md=0.5*dt; float ml=cmLum(md);
      vec3 fc=mix(vec3(0.37,0.33,0.29)*mix(vec3(ml),md,0.4)*2.0,tbC*dt*0.85,smoothstep(0.40,0.60,ml));
      c=mix(c,fc,flo); zn=mix(zn,vec3(0.0,0.0,1.0),flo); }
#else
    /* (TX4) 사암 바위그늘 — 세트 = 꼴의 켜 둘씩(세트 경계가 켜 선반에 앉는다) · 굴마다 바탕 한 빛(크림 · 담황 · 붉은)에서 세트마다 ±0.15(이웃 상관) — 깃발 줄무늬 금지 ·
       엽층은 굴의 옛 바람 방향 ±25° · 세트 밑으로 눕는다 · 톤 ±4% + 잔 턱(선 없음) · 철 띠 등고선 없앰 · 사막 칠은 비 맞는 바깥면의 턱에서 흘러내림 ·
       샘 줄은 한 켜 경계(바닥 위 0.3 m 넘는 가장 낮은 것) 밑의 젖은 띠(수평) · 염 꽃 */
    float lb=max(vCmK.x,0.3), lq=(p.y-vCmK.y+0.03*(Z1.b-0.5))/lb, lk=floor(lq), lf=lq-lk, dUp=(1.0-lf)*lb, dDn=lf*lb;
    float sk=floor((lk+floor(fract(cs*4.3)*2.0))/2.0), sf=(lq-(sk*2.0-floor(fract(cs*4.3)*2.0)))/2.0;
    float cb=fract(cs*5.7), tb=cb<0.70?0.08:(cb<0.92?0.40:0.80);
    float sh1=mix(cmH(vec3(sk,vs,17.0)),cmH(vec3(sk-1.0,vs,17.0)),0.5), ts=clamp(tb+0.2*(sh1-0.5)+0.35*step(0.80,sh1),0.0,1.0);   // 주황 세트는 일부(약 20%)만
    vec3 sc=mix(mix(CP_SSW,CP_SSO,clamp(ts*2.0,0.0,1.0)),CP_SSR,clamp(ts*2.0-1.0,0.0,1.0));
    c=sc*dt*(0.95+0.10*cmH(vec3(lk,vs,19.0)));
    float sbd=min(sf,1.0-sf)*2.0*lb, spro=pow(cmH(vec3(sk,vs,23.0)),2.5);
    float sbv=(1.0-smoothstep(0.0,0.02+0.03*spro+fwY,sbd))*(1.0-flo);
    c*=1.0-0.05*sbv-0.15*spro*exp(0.0-dUp/0.05)*(1.0-flo)*step(0.5,1.0-sf); Ht-=0.03*sbv*(0.3+0.7*spro);
    /* 엽층 — 굴의 바람 방향 ±25° · 기울기 20~34° 가 세트 밑으로 갈수록 눕는다 · 톤 ±4% 와 잔 턱(먼 데는 끈다) */
    vec3 sh2=cmH3(vec3(sk,vs,53.0)); float az=fract(cs*2.9)*6.2832+(sh2.x-0.5)*0.87, dip=radians(20.0+14.0*sh2.y)*(0.3+0.7*smoothstep(0.0,0.6,sf));
    float lam=(p.y-tan(dip)*dot(p.xz,vec2(cos(az),sin(az))))/(0.03+0.05*sh2.z);
    float lmk=(1.0-smoothstep(0.25,0.6,fwidth(lam)))*(1.0-flo), ltr=abs(fract(lam)-0.5)*2.0;
    c*=1.0+0.04*lmk*(ltr-0.5)*(0.6+0.8*step(0.8,fract(floor(lam)*0.618))); Ht+=0.004*lmk*(ltr-0.5);
    vec4 S=texture(cmZ,vec3(p.x*0.9,p.y*0.03,p.z*0.9));
    /* 사막 칠 — sky>0.5 바깥면 · 근원 = 켜 턱(dUp) · 아래로 가늘어짐 · 길이 0.5~4 m · 두께 t: 얇으면 적갈 · 두꺼우면 검정(곱) */
    float vL=0.5+3.5*S.g, vt=(S.b*0.7+S.r*0.3)-mix(CM_QB70,CM_QB95,clamp(dUp/vL,0.0,1.0));
    float vk=cmHB(vt,0.04,hp,0.5)*(1.0-smoothstep(0.7*vL,vL,dUp))*smoothstep(0.45,0.65,sky)*wal*(1.0-smoothstep(-0.2,0.2,n.y));
    vec3 vc=mix(CP_VARR,CP_VARK,smoothstep(0.4,0.6,clamp(vt*6.0+0.5,0.0,1.0)));
    c=mix(c,c*vc/sc,vk*0.85); zn=mix(zn,vec3(1.0,0.0,1.0),vk*0.85); rg=mix(rg,0.55,vk); f0=mix(f0,0.05,vk); pr=mix(pr,0.3,vk);
    /* 샘 줄 — 굴의 60% · 바닥 위 0.3 m 넘는 가장 낮은 켜 경계 밑 젖은 띠 10~40 cm(아랫가장자리 들쭉날쭉) · 빛 드는 데 녹조 */
    float bh=fh+dUp, sw=0.10+0.30*S.g+0.04*hp;
    float se=step(fract(cs*9.7),0.6)*lvOK*wal*step(0.3,bh)*(1.0-step(0.3+lb,bh))*(1.0-smoothstep(sw-0.03,sw+0.02,dUp));
    vec3 sgc=mix(CP_SEEP,CP_ALGA,smoothstep(0.1,0.4,sky)*smoothstep(0.4,0.6,mid)); float sgl=cmLum(sgc);
    c*=mix(vec3(1.0),mix(vec3(sgl),sgc,0.5)/cmLum(sc)*0.9+0.1,se*0.5); zn=mix(zn,vec3(0.0,1.0,0.0),se);
    wet=mix(wet,0.9,se); rg=mix(rg,0.2,se);
    /* 염 꽃 — 샘 줄 바로 위 5~30 cm · 마른 처마 아랫면의 얼룩 */
    float sa=cei*cmHB(mid-CM_QA95,0.03,hp,0.6)*smoothstep(0.4,0.6,Z1.r)*0.5;
    c=mix(c,CP_SALT*(0.8+0.4*fine),sa); zn=mix(zn,vec3(0.0,1.0,0.0),sa); rg=mix(rg,0.9,sa); wet*=1.0-sa;
    /* 바닥 — 마른 먼지 · 처마 물방울 선(젖은 띠 0.3 m — 열린 데 바로 안쪽) */
    if(flo>0.01){ vec3 md=0.5*dt; float ml=cmLum(md);
      vec3 fc=mix(vec3(0.66,0.56,0.44),vec3(0.75,0.65,0.52),mid)*mix(vec3(ml),md,0.5)*2.0;
      float dl=smoothstep(0.86,0.93,sky)*(1.0-smoothstep(0.975,0.995,sky));
      fc=mix(fc,fc*0.62,dl); wet=mix(wet,0.8,dl*flo);
      c=mix(c,fc,flo); zn=mix(zn,vec3(0.0,0.0,1.0),flo); }
#endif
    /* 여러 크기 — 몇 m 구간 톤 · 채도 ±6%(Z1.b 6 m · big 3 m) */
    { float tn=(Z1.b-0.5)*0.24+(big-0.5)*0.12, lc=cmLum(c); c=max(vec3(0.0),vec3(lc)+(c-vec3(lc))*(1.0+0.6*tn))*(1.0+0.5*tn); }
    /* (TX1 빛 틀) 화소 하나가 덮는 길이 fp(m) — 잔 결 · 중간 결 높낮이를 화소 크기로 끈다(화소보다 잔 높낮이를 미분하면 결이 아니라 잡음이다) · 미분은 갈래 밖 */
    float fp=max(length(dpx),length(dpy));
    float kMi=1.0-smoothstep(0.004,0.012,fp), kMe=1.0-smoothstep(0.012,0.040,fp);
    float cav=clamp((0.5-fine2)*1.6+max(0.0,0.0-Ht)*30.0,0.0,1.0);                 // 잔 오목 0~1(큰 장 사진의 어두운 데 · 무늬 홈)
    float edg=clamp((fine2-0.55)*2.2,0.0,1.0)*ao;                                   // 닳은 모서리
    c=mix(c,c*vec3(0.62,0.55,0.47),clamp((1.0-ao)*1.2+cav*0.35,0.0,0.7));          // 오목한 데엔 때 · 진흙(aAo 낮음 + 잔 오목)
    c*=1.0+0.08*edg;
    rg=clamp(rg*(0.85+0.3*mid+0.2*jt)-0.10*edg,0.05,1.0);
    /* 빛 구역 — 입구 이끼(sky 높음) → 녹조막(sky 0.04~0.45) → 맨 바위 · 습도(젖음)는 안으로 오른다 · 젖음은 높낮이로 끊는다(낮은 데 · 오목한 데부터 젖는다) */
    wet+=CM_HUM*vCv10Deep;
    float w=clamp(wet,0.0,1.0);
    w*=mix(1.0,smoothstep(0.25,0.60,w+0.6*(0.5-fine2)+0.25*cav),0.85);
    float al=smoothstep(0.04,0.12,sky)*(1.0-smoothstep(0.30,0.45,sky))*smoothstep(0.35,0.60,mid*0.6+big*0.4)*(1.0-0.5*flo);
    c=mix(c,CP_ALGA*dt,al*0.15); zn=mix(zn,vec3(1.0,1.0,0.0),al*0.15);
    /* 이끼 — 하늘이 트인 입구 · 위를 보는 면 · 얼룩지게(안으로 들어가며 끊긴다) */
    float mw=CM_MOSS*smoothstep(0.25,0.65,sky)*(0.30+0.70*smoothstep(-0.2,0.7,n.y))*(1.0-0.75*flo)*smoothstep(0.45,0.66,big*0.7+mid*0.3+sky*0.15);   // 밟는 바닥엔 드물다
    if(mw>0.01){ vec3 mz=texture(cmC,vec3(pd/1.1,4.0)).rgb; float mk=clamp(mw,0.0,0.92); c=mix(c,vec3(0.24,0.33,0.12)*mz*2.0,mk); zn=mix(zn,vec3(1.0,1.0,0.0),mk); w=mix(w,0.07,mw); rg=mix(rg,0.9,mk); }
    /* 입구 테 — 땅 테와 같은 팔레트(CMAT.RIM): 풀(그 자리 바이옴) → 낙엽 → 부식토 → 자갈 → 바위. ru 는 땅 겉 밑 깊이 · 열린 데까지 거리 · 잡음(경계를 곧게 두지 않는다) */
    float ru=max(0.0,-vCmA.w)/2.5+dS/4.0+(mid-0.5)*0.45+(Z1.r-0.5)*0.2;
    float rw=smoothstep(-0.2,0.35,n.y)*(1.0-smoothstep(0.95,1.25,ru))*step(-4.0,vCmA.w)*smoothstep(0.02,0.10,sky);
    vec3 rc=mix(vCmBio,CR_LITTER,smoothstep(0.10,0.22,ru));
    rc=mix(rc,CR_HUMUS,smoothstep(0.30,0.42,ru)); rc=mix(rc,CR_GRAVEL,smoothstep(0.62,0.75,ru));
    c=mix(c,rc*mix(vec3(1.0),dt,0.4),rw); zn=mix(zn,vec3(1.0,1.0,0.0),rw); rg=mix(rg,0.95,rw);
    /* 젖음 · 거칠기 · F0 — 젖으면 공극 pr 만큼 어두워진다 */
#ifndef CM_NO_WET
    cmWetF(c,rg,f0,w,pr);
#endif
    vec3 cAlb=c;                                                                     // 조명 없는 바탕 빛깔(CM_DBG_ALB)
    /* 가림 셋 — 둘레빛 · 정점 광원(세게) · 횃불(약하게) · 정반사(오목한 데는 가린다) */
#ifdef CM_NO_AO
    float occA=1.0, occD=1.0, occS=1.0;
#else
    float occA=mix(0.35,1.0,ao*ao)*(1.0-0.55*cav), occD=mix(0.70,1.0,ao)*(1.0-0.30*cav), occS=clamp(ao*1.3-0.3,0.0,1.0)*(1.0-0.7*cav);
#endif
    /* 미분 범프 — 무늬 높이 합 Ht 의 화면 미분으로 표면 기울기를 센다(Mikkelsen 표면 기울기). 사진 밝기를 높낮이로(큰 장 ±3 cm · 잔 결 ±6 mm — 화소보다 잘면 끈다) · 25 m 밖은 0 */
    Ht+=(fine2-0.5)*0.06*kMe+(fine-0.5)*0.012*kMi;
#ifdef CM_NO_BUMP
    vec3 nb=n;
#else
    float hb=Ht*nrmK, hx=dFdx(hb), hy=dFdy(hb);
    vec3 r1=cross(dpy,n), r2=cross(n,dpx); float det=dot(dpx,r1);
    vec3 nb=abs(det)>1e-12?normalize(abs(det)*n-sign(det)*(hx*r1+hy*r2)):n;
#endif
    /* 결의 높낮이 — 법선 지도(많이 섞인 쪽 한 장) · 화소가 법선 지도 텍셀보다 크면 안 읽는다(먼 화소의 읽기 −1) */
    float kN=nrmK*(1.0-smoothstep(0.006,0.020,fp)); vec3 np=nb;
#ifndef CM_NO_NRM
    if(kN>0.02){
      vec3 t=texture(cmN,vec3(ax?uX:(ay?uY:uZ),ay?LY:CM_L)).rgb*2.0-1.0;
      if(!ay) t.xy=transpose(CM_M)*t.xy;                                             // 벽 uv 의 돌림 · 늘림을 되돌려 얹는다
      vec3 bt=ax?vec3(nb.x,t.y+nb.y,t.x+nb.z):(ay?vec3(t.x+nb.x,nb.y,t.y+nb.z):vec3(t.x+nb.x,t.y+nb.y,nb.z));
      np=normalize(mix(nb,normalize(bt),0.75*rel*kN));
    }
#endif
    vec3 tv=cmTP-p; float tl=length(tv); vec3 Lt=tv/max(tl,1e-4), V=normalize(cmEye-p);   // 세계 좌표로 센다(램버트엔 cameraPosition 이 안 실린다 — 눈 · 횃불 자리는 cmTick 이 준다)
    float at=clamp(1.0-tl/max(cmT.x,1e-3),0.0,1.0); at*=at;                          // 램버트 점광과 같은 거리 감쇠((1−d/거리)²)
    float sbk=smoothstep(0.2,0.8,sky);                                              // 입구 — 해 쪽 결(옛 어림은 여기만)
    vec3 cD=c*occA*(0.74+0.26*clamp(dot(np,n),0.0,1.0))*(1.0+sbk*clamp((dot(np,cmSun)-dot(n,cmSun))*1.5,-0.5,0.5));
#ifdef CM_PXT
    /* 횃불 난반사를 화소에서 — 정점 묶음에서 횃불을 뺐다(cv10Mat 의 lights_lambert_vertex 손질) · 유석만 감싸기(sss — 반투명 방해석) */
    float nlp=max(dot(np,Lt),0.0), nlT=mix(nlp,(nlp+0.30)/1.30,sss);
    totalEmissiveRadiance+=c*occD*cmTC*(cmT.w*at*nlT);
#else
    cD*=1.0+(1.0-sbk)*clamp((dot(np,Lt)-dot(n,Lt))*2.4,-0.65,0.65);                 // 옛 길(정점 빛에 곱하는 어림)
#endif
    diffuseColor.rgb=cD;
    /* 정반사 — 사람이 든 횃불에서만 · 젖었거나 매끈한 데(정규화 Blinn · Schlick). 물막은 잔 결을 메운다 · 화소 안 법선 흩어짐 sg2 로 거칠기를 넓힌다(튀는 점 대신 번들) */
    vec3 ns=normalize(mix(np,nb,0.7*w));
    float sg2=min(0.25,0.5*(dot(dFdx(ns),dFdx(ns))+dot(dFdy(ns),dFdy(ns))));
    float gls=max(w,1.0-smoothstep(0.35,0.70,rg));
#ifndef CM_NO_SPEC
    if(cmT.w>0.0&&gls>0.03){
      vec3 Hh=normalize(Lt+V); float a2=min(1.0,rg*rg*rg*rg+sg2), sn=clamp(2.0/a2-2.0,1.0,160.0);
      float nl=max(dot(ns,Lt),0.0), nh=max(dot(ns,Hh),0.0), x=1.0-max(dot(V,Hh),0.0), x2=x*x, Fs=f0+(1.0-f0)*x2*x2*x;
      totalEmissiveRadiance+=cmTC*sT*(cmT.w*at*nl*(sn+8.0)*0.125*pow(nh,sn)*Fs*CM_KS*gls*occS);
    }
#endif
    /* 하늘 번들 — 입구 쪽 젖었거나 매끈한 면이 하늘을 비춘다(Schlick F(θ) · sky · 위로 되비치는 쪽만 · 거친 면은 덜 · 오목한 데는 가림) */
#if NUM_HEMI_LIGHTS > 0
    if(sky*gls>0.002){ vec3 Rv=reflect(-V,ns); float x=1.0-max(dot(ns,V),0.0), x2=x*x, Fv=f0+(1.0-f0)*x2*x2*x;
      totalEmissiveRadiance+=hemisphereLights[0].skyColor*(Fv*gls*sky*(1.0-rg)*smoothstep(-0.1,0.6,Rv.y)*occS); }
#endif
#if defined(CM_DBG_ALB)
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=cAlb;
#elif defined(CM_DBG_ZONE)
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=zn;
#elif defined(CM_DBG_BASE)
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=CM_HEX*dt;
#elif defined(CM_DBG_LGT)
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=vec3(w,rg,cav);
#endif
  }
#endif`;

/* ── 재질 — 종류마다 하나 ────────────────────────────────────────────────────────────────────────────────── */
function cv10Mat(kind){
  const K=CMAT.K[kind]||CMAT.K.talus, key=CMAT.K[kind]?kind:'talus';
  if(CMAT.mats[key]) return CMAT.mats[key];
  cmPhotos();
  const m=new THREE.MeshLambertMaterial({color:0xffffff});
  const gl=(typeof CV10_GLOW!=='undefined'&&(CV10_GLOW[key]||CV10_GLOW.shelter))||[0,0,0,0];
  const U={cmC:CMAT.tex, cmN:CMAT.nrm, cmZ:cmNoise3(), cmT:CMAT.torch, cmTP:CMAT.tpos, cmTPv:CMAT.tpv, cmEye:CMAT.eye, cmTC:CMAT.tcol, cmSun:TERR_U.uSunDir,
    cmElev:WATER_U.uElev, cmGrid:WATER_U.uGrid, cmBio:TERR_U.uBio, cmBioN:TERR_U.uBioN, cmCell:TERR_U.uCell,
    uCv10Glow:{value:new THREE.Vector4(gl[0],gl[1],gl[2],gl[3])}};
  /* CM_SUNCUT — envPatch(45-sky.js)가 이 정의를 보고 sky<0.01 화소에서 해 · 구름 그림자를 안 읽는다(옛 재질을 같은 페이지에서 견줄 때 옛 길이 그대로 남게) */
  const ra=K.rot*Math.PI/180, cr=Math.cos(ra), sr=Math.sin(ra), f4=v=>'('+v.toFixed(4)+')';
  const DX=`#define CM_LF ${K.LF.toFixed(1)}\n#define CM_LC ${K.LC.toFixed(1)}\n#define CM_LM ${K.LM.toFixed(1)}\n#define CM_KM ${K.KM.toFixed(2)}\n#define CM_KA ${K.KA.toFixed(3)}\n#define CM_KB ${K.KB.toFixed(3)}\n`+
    `#define CM_SAT ${K.SAT.toFixed(3)}\n#define CM_SATB ${K.SATB.toFixed(3)}\n#define CM_JV ${K.JV.toFixed(1)}\n#define CM_HEX ${K.hex}\n`+
    `#define CM_M mat2(${f4(cr*K.SU)},${f4(sr*K.SU)},${f4(-sr*K.SV)},${f4(cr*K.SV)})\n`;
  const D=DX+`#define CM_JN ${CMAT.joints|0}\n#define CM_KIND ${K.id}\n#define CM_L ${K.L.toFixed(1)}\n#define CM_RS ${K.RS.toFixed(2)}\n#define CM_WET ${K.wet.toFixed(3)}\n#define CM_SH ${K.sh.toFixed(1)}\n#define CM_MOSS ${K.moss.toFixed(2)}\n`+
    `#define CM_R ${K.r.toFixed(3)}\n#define CM_F0 ${K.f0.toFixed(3)}\n#define CM_POR ${K.por.toFixed(3)}\n#define CM_KS ${K.ks.toFixed(3)}\n#define CM_HUM ${K.hum.toFixed(3)}\n#define CM_SUNCUT\n`+CMAT.qd+cmPalDefs()+(CMAT.dbg||'');
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    sh.vertexShader=CM_VERT+sh.vertexShader.replace('#include <begin_vertex>',CM_VMAIN);
    /* (TX1) 횃불 난반사는 화소에서(CM_PXT) — 정점 묶음의 점광 고리에서 횃불 자리(눈 좌표 cmTPv)의 빛만 0 으로. 이 재질에만 · 묶음 꼴이 예상과 다르면 옛 길 */
    const LV=THREE.ShaderChunk.lights_lambert_vertex, G='getPointDirectLightIrradiance( pointLights[ i ], geometry, directLight );';
    const pxt=!/CM_NO_PXT/.test(CMAT.dbg||'')&&LV.split(G).length===2&&sh.vertexShader.split('#include <lights_lambert_vertex>').length===2;
    if(pxt) sh.vertexShader=sh.vertexShader.replace('#include <lights_lambert_vertex>',LV.replace(G,G+'\n\t\tdirectLight.color *= step( 0.001, distance( pointLights[ i ].position, cmTPv ) );'));
    CMAT.pxt=pxt;
    sh.fragmentShader=(pxt?'#define CM_PXT\n':'')+D+CM_FRAG+sh.fragmentShader.replace('#include <color_fragment>',CM_BODY);
  };
  const dk=CMAT.dbg||''; m.customProgramCacheKey=()=>'cv10mat-'+key+dk;
  envPatch(m);
  return CMAT.mats[key]=m;
}
/* 사진을 쓸 수 있을 때만 갈고리를 건다(WebGL1 · 사진 없음이면 단색 cv10SeatMat 그대로) */
function cmOK(){ return typeof CAVE_JPG!=='undefined'&&typeof THREE.DataTexture2DArray==='function'&&typeof THREE.DataTexture3D==='function'&&!!(renderer&&renderer.capabilities.isWebGL2); }
CV10.mat=kind=>cmOK()?cv10Mat(kind):cv10SeatMat(kind);
/* 미리 짜기(90-init.js precompPlan) — 껍데기 메시와 같은 꼴(자리 · 법선 · aDeep · aSky · aFl · aCs · aFh · aAo · aLay) */
function cmPrecompGeo(){
  if(CMAT.geo) return CMAT.geo;
  const g=new THREE.BufferGeometry(), z9=new Float32Array(9);
  g.setAttribute('position',new THREE.Float32BufferAttribute(z9,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(z9.slice(),3));
  for(const a of ['aDeep','aSky','aFl','aCs','aFh','aAo']) g.setAttribute(a,new THREE.Float32BufferAttribute(new Float32Array(3),1));
  g.setAttribute('aLay',new THREE.Float32BufferAttribute(new Float32Array(9),3)); g.setAttribute('aSu',new THREE.Float32BufferAttribute(new Float32Array(6),2));
  return CMAT.geo=g;
}
/* 횃불 값 · 정점 가림 굽기 — 껍데기를 그리기 직전(mesh.onBeforeRender). 굽기는 그리기 한 번(renderer.info.render.frame)에 한 번만 · CMAT.ao.budget ms 까지 */
function cmTick(r,s,cam){
  const t=typeof torchLight!=='undefined'&&torchLight, v=CMAT.torch.value;
  if(cam) CMAT.eye.value.setFromMatrixPosition(cam.matrixWorld);
  if(t&&t.visible&&t.intensity>0){ v.set(t.distance||26,0,0,t.intensity); CMAT.tpos.value.setFromMatrixPosition(t.matrixWorld); CMAT.tcol.value.set(t.color.r,t.color.g,t.color.b);
    if(cam) CMAT.tpv.value.copy(CMAT.tpos.value).applyMatrix4(cam.matrixWorldInverse); }   // 눈 좌표 — three 가 올리는 pointLights[i].position 과 같은 값
  else{ v.w=0; CMAT.tpv.value.set(1e9,1e9,1e9); }
  const A=CMAT.ao; if(A.q.length&&r&&r.info){ const f=r.info.render.frame; if(f!==A.f){ A.f=f; cmAoWork(A.budget); } }
}
/* ── 정점 속성 굽기(aAo · aFh) — 굴 격자(31-cave10.js cv10Samp)만 읽는다. 같은 굴은 늘 같은 값(짓는 차례 · 프레임과 상관없다) ──────────────
   aAo: 정점 법선 둘레 반구의 여덟 방위(높이 35°) × 0.6 · 1.4 m 열여섯 점 가운데 바위가 아닌 몫(1 = 다 트임). 바위 = 땅 겉(Hh) 밑이면서 빈 데 기둥의 바닥 밑 · 천장 위
   (빈 데 기둥이 둘레에 없으면 바위 — cv10V 와 같은 식) · aFh: 바닥(빈 데 기둥 쌍선형) 위 높이 m(−1 ~ 40 으로 자름 · 둘레에 빈 데가 없는 겉 정점은 0) */
const _cmAz=[0,1,2,3,4,5,6,7].map(k=>[Math.cos((k+0.5)*Math.PI/4),Math.sin((k+0.5)*Math.PI/4)]);
function cmRock(rec,x,y,z){ const s=cv10Samp(rec,x,z); if(y>=s.h) return 0; if(s.n<=0) return 1; return (y<s.f||y>s.c)?1:0; }
function cmAoRun(J,t1){
  const P=J.pos, N=J.nor, ao=J.ao, fh=J.fh, su=J.su, rec=J.rec, nv=J.nv, EN=0.57357644, ET=0.81915204;   // 높이 35° — 반구를 코사인 무게로 고르게 본 평균 높이쯤
  while(J.i<nv){ if(performance.now()>t1) break; const e=Math.min(nv,J.i+2);   // 두 정점마다 시계를 본다(한 조각이 예산을 넘는 몫 ≤ 정점 둘 · 수 µs)
    for(let v=J.i;v<e;v++){ const o=v*3, x=P[o], y=P[o+1], z=P[o+2]; let nx=N[o], ny=N[o+1], nz=N[o+2];
      /* (TX3) aFh — 안쪽 바닥 기준: 수평 법선(빈 데 쪽)으로 0 · 1 · 2 · 3 m 나간 점의 바닥(빈 데 기둥) 가운데 가장 낮은 것 위 높이(벽 정점의 '제 발밑'은 벽 자신이라 값이 튀었다).
         바닥 · 천장(수평 법선 0.2 밑)은 제자리만. aSu — 그 안쪽 점에서 길 거리 s · 가로 자리 u(cv10Field) */
      const hl=Math.hypot(nx,nz), hx=hl>0.2?nx/hl:0, hz=hl>0.2?nz/hl:0; let fm=1e9, sx=x, sz=z;
      for(let t=0;t<(hl>0.2?4:1);t++){ const qx=x+hx*t, qz=z+hz*t, s=cv10Samp(rec,qx,qz); if(s.n>0&&s.f<fm){ fm=s.f; } if(s.n>0&&sx===x&&sz===z&&t>0){ sx=qx; sz=qz; } }
      fh[v]=fm<1e8?Math.max(-1,Math.min(40,y-fm)):0;
      { const F=cv10Field(rec.c,sx,sz); su[v*2]=F.g>0?F.s:0; su[v*2+1]=F.g>0?F.u:1; }
      /* 접선 틀 — 법선에 곧은 두 축 */
      let ax=0,ay=1,az=0; if(Math.abs(ny)>0.9){ ax=1; ay=0; }
      let tx=ay*nz-az*ny, ty=az*nx-ax*nz, tz=ax*ny-ay*nx; const tl=Math.hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
      const bx=ny*tz-nz*ty, by=nz*tx-nx*tz, bz=nx*ty-ny*tx;
      let rk=0;
      for(let k=0;k<8;k++){ const c=_cmAz[k][0], sn=_cmAz[k][1], dx=nx*EN+(tx*c+bx*sn)*ET, dy=ny*EN+(ty*c+by*sn)*ET, dz=nz*EN+(tz*c+bz*sn)*ET;
        rk+=cmRock(rec,x+dx*0.6,y+dy*0.6,z+dz*0.6)+cmRock(rec,x+dx*1.4,y+dy*1.4,z+dz*1.4); }
      ao[v]=1-rk/16; }
    J.i=e; }
  return J.i>=nv;
}
function cmAoWork(ms){
  const A=CMAT.ao, t0=performance.now(), t1=t0+ms;
  while(A.q.length&&performance.now()<t1){ const J=A.q[0];
    if(!J.rec.mesh||J.rec.mesh.geometry!==J.g){ A.q.shift(); continue; }        // 다 굽기 전에 버린 굴
    const T=performance.now(), done=cmAoRun(J,t1); J.ms+=performance.now()-T;
    if(done){ J.g.attributes.aAo.needsUpdate=true; J.g.attributes.aFh.needsUpdate=true; J.g.attributes.aSu.needsUpdate=true; J.rec.aoMs=J.ms; A.q.shift(); }
    if(performance.now()>=t1) break; }
  const dt=performance.now()-t0; A.n++; if(dt>A.max) A.max=dt; if(dt>1) A.over=(A.over||0)+1; return dt;
}
/* 시험 — 이 굴의 굽기를 프레임 조각 그대로(CMAT.ao.budget 씩) 끝까지 돌리고 {조각 수 · 가장 긴 조각 ms · 합 ms} */
function cmAoFlush(rec){
  const A=CMAT.ao, has=()=>A.q.some(J=>!rec||J.rec===rec), ds=[]; let sum=0;
  while(has()&&ds.length<100000){ const d=cmAoWork(A.budget); ds.push(d); sum+=d; }
  ds.sort((a,b)=>a-b); const r3=v=>Math.round((v||0)*1000)/1000;
  return {slices:ds.length, maxMs:r3(ds[ds.length-1]), p99Ms:r3(ds[Math.floor(ds.length*0.99)]), medMs:r3(ds[ds.length>>1]), over1:ds.filter(d=>d>1).length, sumMs:Math.round(sum*10)/10, verts:rec&&rec.mesh?rec.mesh.geometry.attributes.position.count:0};
}
/* 굴 씨(aCs) · 켜(aLay) — 껍데기가 다 지어진 뒤(31-cave10.js onBuild) · 가림 · 바닥 위 높이는 일로 건다 */
CV10.onBuild.push(rec=>{
  const m=rec.mesh; if(!m||!m.geometry) return;
  const g=m.geometry, nv=g.attributes.position.count, s=cv10H(rec.c.seed|0,71,0x5eed), P=rec.c._P||{b:1,off:0,vs:0}, lay=new Float32Array(nv*3);
  for(let v=0;v<nv;v++){ lay[v*3]=P.b||1; lay[v*3+1]=P.off||0; lay[v*3+2]=P.vs||0; }
  g.setAttribute('aCs',new THREE.BufferAttribute(new Float32Array(nv).fill(s),1));
  g.setAttribute('aLay',new THREE.BufferAttribute(lay,3));
  const ao=new Float32Array(nv).fill(1), fh=new Float32Array(nv).fill(-2), su=new Float32Array(nv*2);   // aFh 굽기 전 −2 — 셰이더가 수위 무늬를 끈다(lvOK)
  g.setAttribute('aAo',new THREE.BufferAttribute(ao,1)); g.setAttribute('aFh',new THREE.BufferAttribute(fh,1)); g.setAttribute('aSu',new THREE.BufferAttribute(su,2));
  CMAT.ao.q=CMAT.ao.q.filter(J=>J.rec!==rec);
  CMAT.ao.q.push({rec,g,pos:g.attributes.position.array,nor:g.attributes.normal.array,ao,fh,su,nv,i:0,ms:0});
  m.onBeforeRender=cmTick;
});
