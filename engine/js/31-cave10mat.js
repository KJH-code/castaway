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
     onBuild 가 일을 걸고 cmTick 이 프레임마다 0.7 ms 씩 굽는다(다 될 때까지 aAo 1 · aFh 0)
   · 해 · 구름 그림자는 껍데기의 sky<0.01 화소에서 안 읽는다(45-sky.js envPatch — 이 재질의 CM_SUNCUT 정의를 보고)
   · 디버그 정의(CMAT.dbg): CM_DBG_ALB 조명 없는 바탕 빛깔 · CM_DBG_ZONE 갈래(빨강 바탕 바위 · 초록 덧쌓임 · 파랑 바닥 · 노랑 이끼 · 땅 · 자홍 얼룩) */
const CMAT={ mats:{}, tex:null, nrm:null, left:-1, ready:false, wt:[], geo:null, q:null, qd:'',
  torch:{value:new THREE.Vector4(0,0,0,0)}, tpos:{value:new THREE.Vector3()}, eye:{value:new THREE.Vector3()}, tcol:{value:new THREE.Vector3(1,0.56,0.25)},
  ao:{q:[], f:-1, budget:0.7, max:0, n:0},
  /* 종류마다: 사진 층 · 한 장의 크기(m) · 젖음 · (옛 번들 날카로움 sh — 쓰지 않음) · 이끼 몫 · 마른 거칠기 r · F0 · 공극(젖으면 어두워지는 몫) · 정반사 세기 */
  K:{ karst:{L:0,RS:1.7,wet:1.00,sh:90,moss:0.8,id:0,r:0.80,f0:0.04,por:0,ks:1}, lava:{L:1,RS:2.1,wet:0.046,sh:20,moss:1.15,id:1,r:0.90,f0:0.04,por:0,ks:1},
      talus:{L:2,RS:1.3,wet:0.45,sh:60,moss:0.9,id:2,r:0.70,f0:0.04,por:0,ks:1}, shelter:{L:3,RS:2.4,wet:0.009,sh:12,moss:0.3,id:3,r:0.90,f0:0.04,por:0,ks:1} } };

/* 사진 올리기 — 다 풀리기 전에는 한 점짜리(중간 회색 · 곧게 선 법선) */
function cmPhotos(){
  if(CMAT.tex||typeof CAVE_JPG==='undefined'||typeof THREE.DataTexture2DArray!=='function') return;
  const n=CAVE_JPG.length, S=512, flat=new Uint8Array(4*n);
  for(let i=0;i<n;i++) flat.set([128,128,255,255],i*4);
  CMAT.tex={value:gndArrayTex(new Uint8Array(4*n).fill(128),1,n)};
  CMAT.nrm={value:gndArrayTex(flat,1,n)};
  CMAT.left=2;
  const load=(list,nrm,uni)=>{
    const data=new Uint8Array(S*S*4*n); let left=n;
    /* 밉맵은 한 장만 읽는다(LinearMipmapNearest — 두 장 섞기는 텍스처 읽기가 두 배 · 굴 속은 화면이 다 껍데기다) */
    const done=()=>{ const old=uni.value; uni.value=gndArrayTex(data,S,n); uni.value.minFilter=THREE.LinearMipmapNearestFilter; old.dispose(); if(--CMAT.left===0){ CMAT.ready=true; for(const f of CMAT.wt) f(); CMAT.wt.length=0; } };
    list.forEach((src,k)=>{
      const im=new Image(), o=k*S*S*4;
      im.onerror=()=>{ for(let i=0;i<S*S;i++) data.set(nrm?[128,128,255,255]:[128,128,128,255],o+i*4); if(--left===0) done(); };
      im.onload=()=>{
        const cv2=document.createElement('canvas'); cv2.width=cv2.height=S;
        const g=cv2.getContext('2d'); g.drawImage(im,0,0,S,S);
        const px=g.getImageData(0,0,S,S).data;
        try{ cmBake(k,nrm,px,S); }catch(e){ if(typeof showErr==='function') showErr('굴 사진 굽기',e); }
        if(nrm) data.set(px,o);
        else{ let L=0; for(let i=0;i<px.length;i+=4) L+=0.30*px[i]+0.59*px[i+1]+0.11*px[i+2];
          const kk=127.5/(L/(S*S)||1);
          for(let i=0;i<px.length;i+=4){ data[o+i]=Math.min(255,px[i]*kk); data[o+i+1]=Math.min(255,px[i+1]*kk); data[o+i+2]=Math.min(255,px[i+2]*kk); data[o+i+3]=255; } }
        if(--left===0) done();
      };
      im.src=src;
    });
  };
  load(CAVE_JPG,false,CMAT.tex); load(CAVE_NRM,true,CMAT.nrm);
}
/* ── 사진 · 법선 층 굽기(cmBake) — 잔 결(<2 m 의 꼴은 셰이더 몫)을 불러올 때 한 번 사진 층에 싣는다. 텍스처 읽기 수는 그대로 · 밉맵은 gndArrayTex 가 짓는다.
   무늬는 512² 그림 안에서 이어 붙게(칸 번호를 감아 돈다) · 난수는 정수 섞기(cmH2 — 지형 · 자원과 상관없는 그림이라 시드 차례를 안 건드린다).
   크기는 층의 한 장 크기(K.RS m / 512 화소)로 m 를 화소로 옮긴다 — 층 0 석회암 · 1 현무암 · 2 화강암 · 3 사암 */
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
function cmBake(L,nrm,px,S){
  const ps=(L===0?CMAT.K.karst.RS:L===1?CMAT.K.lava.RS:L===2?CMAT.K.talus.RS:CMAT.K.shelter.RS)/S;
  if(!nrm&&L===2){
    /* 화강암 결정 반점 — 장석 #B89A8A 27% · 석영 #D8D6D0 27% · 운모 #2B2A28 9% · 나머지는 사진 그대로. 알갱이 2~15 mm: 잔 칸(≈ 8 mm)과
       굵은 칸(≈ 25 mm — 장석 반정)을 겹쳐 잔 칸의 35% 는 굵은 칸의 갈래를 따른다. 사진 결(밝기)을 반쯤 남긴다 · 평균 밝기는 뒤의 맞춤이 0.5 로 되돌린다 */
    const nf=Math.max(8,Math.round(S*ps/0.008)), nc=Math.max(4,Math.round(S*ps/0.025)), cls=new Int8Array(S*S);
    const kind=(h)=>h<0.27?0:h<0.54?1:h<0.63?2:3;
    cmVor(S,nc,nc,0x6a1,(i,f1,f2,id)=>{ cls[i]=kind(cmH2(id,7,0x6a3)); });
    const COL=[[184,154,138],[216,214,208],[43,42,40]];
    let Lm=0; for(let i=0;i<px.length;i+=4) Lm+=0.30*px[i]+0.59*px[i+1]+0.11*px[i+2]; Lm=Lm/(S*S)||128;
    cmVor(S,nf,nf,0x6a5,(i,f1,f2,id)=>{ const k=cmH2(id,3,0x6a7)<0.35?cls[i]:kind(cmH2(id,5,0x6a9)); if(k>2) return;
      const o=i*4, l=(0.30*px[o]+0.59*px[o+1]+0.11*px[o+2])/Lm, e=Math.min(1,(f2-f1)*6), a=0.55*e, C=COL[k], m=0.7+0.3*l;
      px[o]=px[o]*(1-a)+C[0]*m*a; px[o+1]=px[o+1]*(1-a)+C[1]*m*a; px[o+2]=px[o+2]*(1-a)+C[2]*m*a; });
    return;
  }
  if(!nrm) return;
  const h=new Float32Array(S*S);
  if(L===0){
    /* 스캘럽 — 물이 판 접시 꼴 오목(5~30 cm · 가로로 늘인 칸 1.5:1 · 물이 오는 쪽(-u)이 가파르다) · 깊이 1.5 cm */
    const nx=Math.max(2,Math.round(S*ps/0.21)), ny=Math.max(2,Math.round(S*ps/0.14));
    cmVor(S,nx,ny,0x5ca1,(i,f1,f2,id,du)=>{ const t=Math.min(1,(f2-f1)/0.6), as=1+0.45*Math.max(-1,Math.min(1,du*2));
      h[i]=-0.015*(0.6+0.8*cmH2(id,1,0x5ca3))*(1-(1-t)*(1-t))*as; });
  }else if(L===1){
    /* 용암 기공 — 둥근 구멍(지름 5~14 mm) 면적 6% 쯤 · 깊이 = 반지름의 반 */
    const n=Math.round(S*S*0.06/(Math.PI*2.2*2.2));
    for(let k=0;k<n;k++){ const cx=cmH2(k,1,0x7a1)*S, cy=cmH2(k,2,0x7a1)*S, r=0.006/ps*Math.exp(0.45*(cmH2(k,3,0x7a1)*2-1))*(0.6+0.4*cmH2(k,4,0x7a1)), d=0.5*r*ps, R=Math.ceil(r);
      for(let b=-R;b<=R;b++) for(let a=-R;a<=R;a++){ const q=(a*a+b*b)/(r*r); if(q>=1) continue; const x=((Math.floor(cx)+a)%S+S)%S, y=((Math.floor(cy)+b)%S+S)%S, v=-d*(1-q);
        if(v<h[y*S+x]) h[y*S+x]=v; } }
  }else if(L===3){
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
  const S=32, d=new Uint8Array(S*S*S*4), H=(i,j,k,c)=>{ let h=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(k,2147483647)^Math.imul(c+1,1274126177); h=Math.imul(h^(h>>>13),1103515245); return ((h^(h>>>16))>>>0)/4294967296; };
  const sm=t=>t*t*(3-2*t), C=[4,8,16,2];
  for(let c=0;c<4;c++){ const cs=C[c], n=S/cs;
    for(let z=0;z<S;z++) for(let y=0;y<S;y++) for(let x=0;x<S;x++){
      const fx=x/cs, fy=y/cs, fz=z/cs, i=Math.floor(fx), j=Math.floor(fy), k=Math.floor(fz), u=sm(fx-i), v=sm(fy-j), w=sm(fz-k);
      const g=(a,b,e)=>H((i+a)%n,(j+b)%n,(k+e)%n,c);
      const val=((g(0,0,0)*(1-u)+g(1,0,0)*u)*(1-v)+(g(0,1,0)*(1-u)+g(1,1,0)*u)*v)*(1-w)+((g(0,0,1)*(1-u)+g(1,0,1)*u)*(1-v)+(g(0,1,1)*(1-u)+g(1,1,1)*u)*v)*w;
      d[((z*S+y)*S+x)*4+c]=Math.round(val*255); } }
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
attribute vec3 aLay;
varying float vCv10Sky, vCv10Deep;
varying vec3 vCmW, vCmN, vCmBio;
varying vec4 vCmA, vCmK;
varying float vCmD;
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
    vCmA=vec4(aFl,aFh,aAo,gh); vCmK=vec4(aLay,aCs);
    vCmBio=texture2D(cmBio,(w4.xz/cmCell+cmBioN*0.5+0.5)/cmBioN).rgb; }`;
const CM_FRAG=`varying float vCv10Sky, vCv10Deep;
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
/* 띠 — 단조 휨 y' = y/t + 0.3 sin(1.3 y/t + ph) + 0.12 sin(3.7 y/t + ph) (기울기 1 − 0.39 − 0.444 > 0 이라 띠 차례가 안 뒤집힌다 · 간격만 고르지 않다) */
float cmWarp(float y,float t,float ph){ float u=y/t; return u+0.3*sin(1.3*u+ph)+0.12*sin(3.7*u+ph); }
/* 띠마다 해시 — x 있음(문턱과 견줄 0~1) · y 띠 안 자리(0~1) · z 두께 · w 톤. sd 는 무늬마다 다른 씨 */
vec4 cmBand(float y,float t,float ph,float sd){ float u=cmWarp(y,t,ph), k=floor(u); vec3 h=cmH3(vec3(k,sd,17.0)); return vec4(h.x,u-k,h.y,h.z); }
/* 띠 줄 — 있음 몫 pr 안의 띠만 · 띠 안 자리가 두께(th×(0.5+해시)) 안이면 1 · 가장자리는 fw(화면 미분) 만큼 흐리게 · cut(cmZ 얼룩 0~1)으로 끊는다 */
float cmBandLine(vec4 b,float pr,float th,float fw,float cut){ float w=th*(0.5+b.z); return step(b.x,pr)*cut*(1.0-smoothstep(w-fw,w+fw,b.y)); }
/* 삼면 투영 — 무게가 작은 면(0.10 밑)은 안 읽는다(굴 속 화소가 화면을 다 덮어 읽는 수가 곧 프레임이다) */
vec3 cmTri(vec3 q,vec3 tw,float L){ vec3 r=vec3(0.0);
  if(tw.x>0.10) r+=texture(cmC,vec3(q.zy,L)).rgb*tw.x;
  if(tw.y>0.10) r+=texture(cmC,vec3(q.xz,L)).rgb*tw.y;
  if(tw.z>0.10) r+=texture(cmC,vec3(q.xy,L)).rgb*tw.z;
  return r/max(tw.x*step(0.10,tw.x)+tw.y*step(0.10,tw.y)+tw.z*step(0.10,tw.z),1e-3); }
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
    float dist=vCmD, nearK=clamp(1.0-dist/40.0,0.0,1.0), nrmK=clamp(1.0-dist/25.0,0.0,1.0), sky=vCv10Sky, fl=vCmA.x, ao=vCmA.z;
    vec3 tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4;
    float flo=smoothstep(0.35,0.75,n.y)*(1.0-smoothstep(0.30,0.55,fl));            // 바닥
    float cei=smoothstep(0.25,0.70,-n.y);                                            // 천장
    float wal=clamp(1.0-flo-cei,0.0,1.0);                                            // 벽
    vec3 q=p/CM_RS;
#ifdef CM_NO_PHOTO
    vec3 rk=vec3(0.5);
#else
    vec3 rk=cmTri(q,tw,CM_L);
#endif
    /* 잡음은 3 차원 잡음 그림(cmZ — 32³ · 채널마다 칸 크기가 다르다: r 1/8 · g 1/4 · b 1/2 · a 1/16 판) 한 번에 넷씩 읽는다(예전 값잡음 함수는 화소마다 수십 번 sin 을 셌다) */
#ifdef CM_NO_NOISE
    vec4 Z1=vec4(0.5);
#else
    vec4 Z1=texture(cmZ,p/12.0);                                                     // r 1.5 · g 3 · b 6 · a 0.75 m 얼룩
#endif
    float big=Z1.g, mid=Z1.a, fine=cmLum(rk);                                         // 잔 결은 사진 밝기로(잡음 그림을 한 번 더 읽지 않는다)
    /* 많이 섞인 면 하나 — 법선 지도 · 이끼는 이 면에서 한 장만 읽는다 */
    bool ax=tw.x>tw.y&&tw.x>tw.z, ay=!ax&&tw.y>tw.z;
    vec2 pd=ax?p.zy:(ay?p.xz:p.xy);
    vec3 c, zn=vec3(1.0,0.0,0.0);                                                    // zn: 갈래(CM_DBG_ZONE) — 빨강 바탕 바위 · 초록 덧쌓임 · 파랑 바닥 · 노랑 이끼 · 땅 · 자홍 얼룩
    float wet=CM_WET, rel=1.0, Ht=0.0;                                               // wet: 젖음(0~1 로 자른다) · rel: 법선 지도 세기 · Ht: 무늬 높이 합(m — 미분 범프)
#if CM_KIND==0
    /* 석회암 종유굴 — 크림(위) · 황토(가운데) · 진흙빛(밑) · 유석 세로 결(위에서 아래로 늘어진 겹) · 오목한 데 갈색 */
    rk=mix(vec3(cmLum(rk)),rk,0.35);
    vec3 base=mix(vec3(0.50,0.40,0.28),vec3(0.80,0.73,0.60),smoothstep(0.10,0.85,fl+0.25*(big-0.5)));
    c=base*rk*2.0;
    vec4 S=texture(cmZ,vec3(p.x*1.25,p.y*0.085,p.z*1.25));                            // 세로로 늘인 잡음 — b 가로 0.4 · 세로 6 m · r 0.1 · 1.5 m
    float fs=S.b*0.65+S.r*0.35;
    float drape=smoothstep(0.45,0.80,fs)*(wal+cei*0.6);
    c=mix(c,vec3(0.86,0.80,0.66)*(0.9+0.2*rk.r),drape*0.55);                          // 크림빛 유석
    zn=mix(zn,vec3(0.0,1.0,0.0),drape*0.55);
    c*=mix(1.0,0.78,smoothstep(0.55,0.25,fs)*wal);                                   // 유석 겹 사이 골
    Ht+=0.012*smoothstep(0.30,0.80,fs)*(wal+cei*0.6);                                // 유석 겹은 도톰하게 · 골은 패게
    float fe=smoothstep(0.55,0.80,big)*0.45;
    c=mix(c,c*vec3(0.80,0.66,0.48),fe);                                              // 철분 얼룩(황토)
    zn=mix(zn,vec3(1.0,0.0,1.0),fe);
    wet*=0.55+0.9*drape;
#elif CM_KIND==1
    /* 용암굴 — 붉은 갈색 현무암 · 흐른 높이의 가로 띠 · 매끈한 천장 · 굴마다 흰 석회 물결 */
    rk=mix(vec3(cmLum(rk)),rk,0.5);
    c=mix(vec3(0.30,0.19,0.13),vec3(0.38,0.23,0.15),big)*rk*2.0;
    float bh=p.y*1.35+(Z1.b-0.5)*1.4+(mid-0.5)*0.25;           // 흐름 띠 — 거의 수평(띠마다 높이가 조금씩 다르다)
    float bf=fract(bh), bid=cmH(vec3(floor(bh),2.0,7.0));
    c*=mix(1.0,0.86+0.26*bid,wal);
    c*=1.0-0.42*wal*smoothstep(0.86,0.97,bf)*step(0.30,bid);                          // 띠 턱의 그늘
    c*=1.0+0.18*wal*smoothstep(0.0,0.08,bf)*smoothstep(0.22,0.08,bf)*step(0.30,bid);  // 턱 위 밝은 테
    Ht-=0.012*wal*smoothstep(0.80,0.97,bf)*step(0.30,bid);                            // 띠 턱 밑은 안으로 든다
    rel=mix(1.0,0.35,cei);                                                           // 둥글고 매끈한 천장
    /* 석회 — 굴 씨 vCmK.w 가 정도를 정한다(35% 는 없음). 위쪽 벽 · 천장에 물결 띠로 흘러내린 흰 · 크림 겹 */
    float ca=smoothstep(0.35,1.0,vCmK.w);
    if(ca>0.0){ float wv=sin(p.y*5.5+(Z1.r-0.5)*7.0+(fine-0.5)*1.2);
      float cm=smoothstep(0.15,0.65,wv)*smoothstep(0.25,0.75,fl+0.25*(big-0.5))*(1.0-flo)*smoothstep(0.30,0.60,Z1.g+ca*0.4);
      c=mix(c,vec3(0.80,0.76,0.66)*(0.85+0.3*mid),cm*ca); zn=mix(zn,vec3(0.0,1.0,0.0),cm*ca);
      float fr2=(1.0-cm)*ca*0.35*smoothstep(0.4,0.8,big);
      c=mix(c,c*vec3(1.20,0.82,0.62),fr2); zn=mix(zn,vec3(1.0,0.0,1.0),fr2); }       // 철 녹 붉은 얼룩
    if(flo>0.01){ /* 밧줄 무늬 바닥(파호이호이) — 굽은 주름 */
      vec2 r2=p.xz+vec2(Z1.r,Z1.a)*2.2;
      float rp=sin(dot(r2,vec2(0.80,0.60))*7.0+length(r2-floor(r2/6.0)*6.0-3.0)*2.2);
      c*=mix(1.0,0.80+0.32*smoothstep(-0.6,0.8,rp),flo); Ht+=0.010*flo*smoothstep(-0.6,0.8,rp); }
#elif CM_KIND==2
    /* 화강암 바위틈 — 잿빛 거친 알갱이 · 지의류 얼룩 */
    rk=mix(vec3(cmLum(rk)),rk,0.45);
    c=vec3(0.54,0.53,0.51)*rk*2.0;
    float fw=fwidth(p.x+p.y+p.z);
    c*=mix(1.0,0.78+0.40*cmH(floor(p/0.018)),nearK*(1.0-smoothstep(0.004,0.012,fw)));     // 장석 · 석영 · 흑운모 알갱이(가까이서만)
    float li=smoothstep(0.55,0.78,Z1.a)*(0.3+0.7*smoothstep(0.0,0.4,sky))*(1.0-flo);
    c=mix(c,(cmH(floor(p/1.7))<0.5?vec3(0.66,0.47,0.24):vec3(0.62,0.66,0.55))*(0.85+0.3*mid),li*0.55);
    zn=mix(zn,vec3(0.0,1.0,0.0),li*0.55);
#else
    /* 사암 바위그늘 — 가로 켜 · 처마 밑을 타고 내린 검은 물 얼룩 */
    rk=mix(vec3(cmLum(rk)),rk,0.7);
    c=vec3(0.74,0.57,0.39)*rk*2.0;
    float st=p.y*3.2+(Z1.r-0.5)*1.1;
    c*=mix(vec3(0.88,0.84,0.80),vec3(1.06,1.03,0.98),0.5+0.5*sin(st*3.1416))*(0.92+0.12*cmH(vec3(0.0,floor(st),1.0)));
    float gr=smoothstep(0.93,0.99,fract(st*0.5+0.3))*(1.0-flo);
    c*=1.0-0.30*gr;                                                                  // 켜 사이 가는 금
    Ht-=0.006*gr;
    vec4 S=texture(cmZ,vec3(p.x*0.9,p.y*0.03,p.z*0.9));                               // 세로로 늘인 잡음(물 얼룩 줄)
    float stk=smoothstep(0.58,0.86,S.b*0.7+S.r*0.3)*smoothstep(0.40,0.80,Z1.b);
    c=mix(c,vec3(0.13,0.11,0.10)*(0.8+0.4*mid),stk*(wal+cei)*0.75);                  // 검은 물 얼룩 줄
    zn=mix(zn,vec3(1.0,0.0,1.0),stk*(wal+cei)*0.75);
#endif
    /* 바닥 — 진흙(석회암 · 젖음) · 밧줄 용암(위에서 그대로) · 자갈(화강암) · 마른 흙(사암) */
    if(flo>0.01){
#if CM_KIND==0
      vec3 md=mix(vec3(cmLum(rk)),rk,0.5);                                            // 석회암 굴 바닥은 벽 사진 결 그대로(진흙 빛깔만 입힌다 · 한 번 덜 읽는다 — 프레임 +10% 안)
#else
      vec3 md=texture(cmC,vec3(p.xz/1.3,5.0)).rgb; md=mix(vec3(cmLum(md)),md,0.5);
#endif
#if CM_KIND==0
      vec3 fc=vec3(0.42,0.34,0.25)*md*2.0;
      float pud=smoothstep(0.58,0.70,Z1.r)*flo;                           // 고인 물 — 짙고 반들
      fc*=1.0-0.35*pud; wet=mix(wet,1.0,pud); rel*=1.0-pud;
#elif CM_KIND==1
      vec3 fc=c;
#elif CM_KIND==2
      vec2 gc=floor(p.xz/0.16); float gh=cmH(vec3(gc,3.0));
      vec3 fc=mix(vec3(0.33,0.30,0.27)*md*2.0,c*(0.75+0.5*gh),smoothstep(0.42,0.58,cmLum(md)));   // 흙 사이 자갈
#else
      vec3 fc=mix(vec3(0.56,0.47,0.36),vec3(0.62,0.54,0.42),mid)*md*2.0;           // 마른 흙
#endif
      c=mix(c,fc,flo); zn=mix(zn,vec3(0.0,0.0,1.0),flo);
    }
    /* 이끼 — 하늘이 트인 입구 · 위를 보는 면 · 얼룩지게(안으로 들어가며 끊긴다) */
    float mw=CM_MOSS*smoothstep(0.08,0.55,sky)*(0.30+0.70*smoothstep(-0.2,0.7,n.y))*(1.0-0.75*flo)*smoothstep(0.45,0.66,big*0.7+mid*0.3+sky*0.15);   // 밟는 바닥엔 드물다
    if(mw>0.01){ vec3 mz=texture(cmC,vec3(pd/1.1,4.0)).rgb; float mk=clamp(mw,0.0,0.92); c=mix(c,vec3(0.24,0.33,0.12)*mz*2.0,mk); zn=mix(zn,vec3(1.0,1.0,0.0),mk); wet=mix(wet,0.07,mw); }
    /* 땅 높이 가까운 입구 가장자리 — 그 자리 바이옴 빛깔(흙 · 풀)로 */
    float gb=(1.0-smoothstep(0.05,0.7,abs(vCmA.w)+(mid-0.5)*0.4))*smoothstep(0.30,0.85,sky)*smoothstep(-0.4,0.2,n.y);
    c=mix(c,mix(vCmBio,vec3(0.30,0.25,0.19),0.35)*(0.75+0.5*cmLum(rk)),gb*0.85); zn=mix(zn,vec3(1.0,1.0,0.0),gb*0.85);
    /* 젖음 · 거칠기 · F0 */
    float w=clamp(wet,0.0,1.0), rg=CM_R, f0=CM_F0;
    cmWetF(c,rg,f0,w,CM_POR);
    vec3 cAlb=c;                                                                     // 조명 없는 바탕 빛깔(CM_DBG_ALB)
    c*=mix(0.5,1.0,ao);                                                              // 정점 가림(aAo — 오목한 데는 둘레 바위가 빛을 가린다)
    /* 미분 범프 — 무늬 높이 합 Ht 의 화면 미분으로 표면 기울기를 센다(Mikkelsen 표면 기울기). 미분은 갈래 밖에서 · 25 m 밖은 0 */
    float hb=Ht*nrmK;
    vec3 dpx=dFdx(p), dpy=dFdy(p); float hx=dFdx(hb), hy=dFdy(hb);
    vec3 r1=cross(dpy,n), r2=cross(n,dpx); float det=dot(dpx,r1);
    vec3 nb=abs(det)>1e-12?normalize(abs(det)*n-sign(det)*(hx*r1+hy*r2)):n;
    /* 결의 높낮이 — 법선 지도(많이 섞인 쪽 한 장) · 굴 속은 횃불 쪽, 입구는 해 쪽 볕이 금과 혹을 따라 갈린다 */
    vec3 np=nb;
#ifndef CM_NO_NRM
    if(nrmK>0.0){
      vec3 t=texture(cmN,vec3(pd/CM_RS,CM_L)).rgb*2.0-1.0;
      vec3 bt=ax?vec3(nb.x,t.y+nb.y,t.x+nb.z):(ay?vec3(t.x+nb.x,nb.y,t.y+nb.z):vec3(t.x+nb.x,t.y+nb.y,nb.z));
      np=normalize(mix(nb,normalize(bt),0.75*rel*nrmK));
    }
#endif
    vec3 tv=cmTP-p, Lt=normalize(tv);                                                // 세계 좌표로 센다(램버트엔 cameraPosition 이 안 실린다 — 눈 · 횃불 자리는 cmTick 이 준다)
    vec3 Lr=normalize(mix(Lt,cmSun,smoothstep(0.2,0.8,sky)));
    c*=1.0+clamp((dot(np,Lr)-dot(n,Lr))*1.5,-0.5,0.5);
    c*=0.74+0.26*clamp(dot(np,n),0.0,1.0);                                            // 패인 데는 덜 본다
    diffuseColor.rgb=c;
    vec3 V=normalize(cmEye-p);
    /* 정반사 — 사람이 든 횃불에서만(정규화 Blinn · Schlick). 세기 · 거리 감쇠는 램버트의 점광과 같은 식((1−d/거리)²) */
    if(cmT.w>0.0){
      vec3 Hh=normalize(Lt+V);
      float r4=rg*rg*rg*rg, sn=clamp(2.0/max(r4,1e-4)-2.0,1.0,256.0), nl=max(dot(np,Lt),0.0), nh=max(dot(np,Hh),0.0), vh=max(dot(V,Hh),0.0);
      float at=clamp(1.0-length(tv)/cmT.x,0.0,1.0); at*=at;
      float Fs=f0+(1.0-f0)*pow(1.0-vh,5.0);
      totalEmissiveRadiance+=cmTC*(cmT.w*at*nl*(sn+8.0)*0.125*pow(nh,sn)*Fs*CM_KS);
    }
    /* 하늘 번들 — 입구 쪽 젖은 면이 하늘을 비춘다(Schlick F(θ) · 젖음 · sky · 위로 되비치는 쪽만 · 거친 면은 덜) */
#if NUM_HEMI_LIGHTS > 0
    if(sky*w>0.002){ vec3 Rv=reflect(-V,np); float Fv=f0+(1.0-f0)*pow(1.0-max(dot(np,V),0.0),5.0);
      totalEmissiveRadiance+=hemisphereLights[0].skyColor*(Fv*w*sky*(1.0-rg)*smoothstep(-0.1,0.6,Rv.y)); }
#endif
#if defined(CM_DBG_ALB)
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=cAlb;
#elif defined(CM_DBG_ZONE)
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=zn;
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
  const U={cmC:CMAT.tex, cmN:CMAT.nrm, cmZ:cmNoise3(), cmT:CMAT.torch, cmTP:CMAT.tpos, cmEye:CMAT.eye, cmTC:CMAT.tcol, cmSun:TERR_U.uSunDir,
    cmElev:WATER_U.uElev, cmGrid:WATER_U.uGrid, cmBio:TERR_U.uBio, cmBioN:TERR_U.uBioN, cmCell:TERR_U.uCell,
    uCv10Glow:{value:new THREE.Vector4(gl[0],gl[1],gl[2],gl[3])}};
  /* CM_SUNCUT — envPatch(45-sky.js)가 이 정의를 보고 sky<0.01 화소에서 해 · 구름 그림자를 안 읽는다(옛 재질을 같은 페이지에서 견줄 때 옛 길이 그대로 남게) */
  const D=`#define CM_KIND ${K.id}\n#define CM_L ${K.L.toFixed(1)}\n#define CM_RS ${K.RS.toFixed(2)}\n#define CM_WET ${K.wet.toFixed(3)}\n#define CM_SH ${K.sh.toFixed(1)}\n#define CM_MOSS ${K.moss.toFixed(2)}\n`+
    `#define CM_R ${K.r.toFixed(3)}\n#define CM_F0 ${K.f0.toFixed(3)}\n#define CM_POR ${K.por.toFixed(3)}\n#define CM_KS ${K.ks.toFixed(3)}\n#define CM_SUNCUT\n`+CMAT.qd+(CMAT.dbg||'');
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    sh.vertexShader=CM_VERT+sh.vertexShader.replace('#include <begin_vertex>',CM_VMAIN);
    sh.fragmentShader=D+CM_FRAG+sh.fragmentShader.replace('#include <color_fragment>',CM_BODY);
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
  g.setAttribute('aLay',new THREE.Float32BufferAttribute(new Float32Array(9),3));
  return CMAT.geo=g;
}
/* 횃불 값 · 정점 가림 굽기 — 껍데기를 그리기 직전(mesh.onBeforeRender). 굽기는 그리기 한 번(renderer.info.render.frame)에 한 번만 · CMAT.ao.budget ms 까지 */
function cmTick(r,s,cam){
  const t=typeof torchLight!=='undefined'&&torchLight, v=CMAT.torch.value;
  if(cam) CMAT.eye.value.setFromMatrixPosition(cam.matrixWorld);
  if(t&&t.visible&&t.intensity>0){ v.set(t.distance||26,0,0,t.intensity); CMAT.tpos.value.setFromMatrixPosition(t.matrixWorld); CMAT.tcol.value.set(t.color.r,t.color.g,t.color.b); }
  else v.w=0;
  const A=CMAT.ao; if(A.q.length&&r&&r.info){ const f=r.info.render.frame; if(f!==A.f){ A.f=f; cmAoWork(A.budget); } }
}
/* ── 정점 속성 굽기(aAo · aFh) — 굴 격자(31-cave10.js cv10Samp)만 읽는다. 같은 굴은 늘 같은 값(짓는 차례 · 프레임과 상관없다) ──────────────
   aAo: 정점 법선 둘레 반구의 여덟 방위(높이 35°) × 0.6 · 1.4 m 열여섯 점 가운데 바위가 아닌 몫(1 = 다 트임). 바위 = 땅 겉(Hh) 밑이면서 빈 데 기둥의 바닥 밑 · 천장 위
   (빈 데 기둥이 둘레에 없으면 바위 — cv10V 와 같은 식) · aFh: 바닥(빈 데 기둥 쌍선형) 위 높이 m(−1 ~ 40 으로 자름 · 둘레에 빈 데가 없는 겉 정점은 0) */
const _cmAz=[0,1,2,3,4,5,6,7].map(k=>[Math.cos((k+0.5)*Math.PI/4),Math.sin((k+0.5)*Math.PI/4)]);
function cmRock(rec,x,y,z){ const s=cv10Samp(rec,x,z); if(y>=s.h) return 0; if(s.n<=0) return 1; return (y<s.f||y>s.c)?1:0; }
function cmAoRun(J,t1){
  const P=J.pos, N=J.nor, ao=J.ao, fh=J.fh, rec=J.rec, nv=J.nv, EN=0.57357644, ET=0.81915204;   // 높이 35° — 반구를 코사인 무게로 고르게 본 평균 높이쯤
  while(J.i<nv){ if(performance.now()>t1) break; const e=Math.min(nv,J.i+8);
    for(let v=J.i;v<e;v++){ const o=v*3, x=P[o], y=P[o+1], z=P[o+2]; let nx=N[o], ny=N[o+1], nz=N[o+2];
      const s=cv10Samp(rec,x,z); fh[v]=s.n>0?Math.max(-1,Math.min(40,y-s.f)):0;
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
    if(done){ J.g.attributes.aAo.needsUpdate=true; J.g.attributes.aFh.needsUpdate=true; J.rec.aoMs=J.ms; A.q.shift(); }
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
  const ao=new Float32Array(nv).fill(1), fh=new Float32Array(nv);
  g.setAttribute('aAo',new THREE.BufferAttribute(ao,1)); g.setAttribute('aFh',new THREE.BufferAttribute(fh,1));
  CMAT.ao.q=CMAT.ao.q.filter(J=>J.rec!==rec);
  CMAT.ao.q.push({rec,g,pos:g.attributes.position.array,nor:g.attributes.normal.array,ao,fh,nv,i:0,ms:0});
  m.onBeforeRender=cmTick;
});
