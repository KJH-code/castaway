/* ── 동굴 판 10 — 굴의 안팎 장식 (조각 E) ──────────────────────────────────────────────────────────────────────────
   굴 껍데기(31-cave10.js)가 다 지어지면 `CV10.onBuild` 가 `cv10Deco(rec)` 를 부른다. 이 파일은 그 굴의 **종류에 맞는 장식**을 격자(`rec.F` 바닥 ·
   `rec.C` 천장 · `rec.Hh` 땅 · `rec.O` 열린 데 · `rec.M` 땅 뚫기 · `rec.D` 입구 거리)에서 자리를 골라 놓는다.
     karst   종유석 · 빨대 종유석 · 석순 · 기둥 · 커튼 · 유석 둔덕 · 휴석 웅덩이(둑 + 물 + 동굴 진주) · 반딧불이 유충 · 빛나는 버섯
     lava    용암 고드름 · 작은 용암 석순 · 채광창 밑 무너진 돌 + 고사리 · 이끼 · 천장을 뚫고 늘어진 나무뿌리 · 광물 딱지 · 금빛 세균 점
     talus   바닥의 모난 무너진 돌 · 빛구멍 둘레 이끼 · 반딧불이 유충 · 버섯 조금
     shelter 앞쪽의 떨어진 판돌 · 벽의 흰 소금꽃 점
     모든 굴 이마의 늘어진 덩굴 · 입구 둘레(땅) 고사리 · 이끼 · 입구 앞 너덜
   · 결정론 — 난수는 `mulberry32((c.seed^0xdec0)>>>0)` 하나(격자가 같으면 같은 장식) · `Math.random` 없음 · 딸 것의 열쇠는 'CV'+굴 씨+'_'+번호.
     종유석 · 석순 · 용암 고드름 · 작은 석순은 사용자 모형 조각(`cvdPcPut` — 아래 '사용자 모형 조각')이고 그 고르기 · 돌림 · 흔들기만 따로 난수 `X.prnd`(0x57a1c)를 쓴다.
   · 그림 — 모두 `rec.mesh` 의 자식(propGroup · surfList 아님). 같은 재질끼리 하나로 합쳐 굴 하나에 그리기 호출 ≤ 5
     (바위 · 시트(양면 — 풀 · 덩굴 · 커튼 · 둑) · 물 · 빛나는 버섯 · 빛나는 점). 빛을 더하지 않는다 — 빛나는 것은 스스로 빛나는 재질.
   · 몸을 막는 것 — 기둥 · 반지름 0.25 넘는 석순 · 지름 0.6 m 넘는 돌은 `rec.cols`(걷기는 B 가 읽는다).
   · 딸 것 — `CV10.picks`(95-flora.js 의 줍기 목록에 들어 있다) · 딴 것은 메시 안의 정점 범위를 접어 숨긴다(`cv10DecoSync` — 매 프레임 `FLORA.taken` 을 본다).
   · 옮긴 코드 — NW2 `PierfrancescoSoffritti/doodles` CaveMeshData.js(Apache-2.0)의 '밀도로 뿌리 자리를 검사'하는 생각 ·
     `ethanpil/marine-scene` 의 돌림 단면 식(종유석 0.26(1−v)^1.25 · 기둥 |2v−1|^1.7 — 식만 보고 다시 짰다). 라이선스 없는 코드는 읽기만 하고 베끼지 않았다.
   이름은 cv10Deco · cvd 로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다). 설계와 잰 값은 docs/notes/caves.md '구현 메모(E)'. */
const CVD={ hooked:false, mats:null, maxTri:30000, dbg:false, q:[], cur:null, tEnd:0, k:0, budget:2 };
const cvdT=()=>performance.now()>CVD.tEnd;      // 이번 틱의 시간이 다 됐나 — 장식 짓기는 제너레이터라 여기서 쉰다
CV10.picks=[];

/* ── 재질 · 줍기 종류(처음 지을 때 — 95-flora.js 는 이 파일보다 뒤에 읽힌다) ───────────────────────────────────── */
function cvdInit(){
  if(!CVD.mats){
    CVD.mats={
      rock :new THREE.MeshLambertMaterial({vertexColors:true}),
      sheet:new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),
      water:new THREE.MeshLambertMaterial({color:0x1d4d52,transparent:true,opacity:0.55,depthWrite:false}),
      shr  :new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),
      gold :new THREE.PointsMaterial({vertexColors:true,size:0.035,sizeAttenuation:true})   // 빛을 안 받는 점 — 빛깔에 그 자리 굴 깊이만큼 어둠을 구워 넣는다(아래 · review C)
    };
    for(const k of ['rock','sheet','water']) envPatch(CVD.mats[k]);   // 굴 속 어둠 · 굴 불빛(CAVE_GLSL)을 받게 — 장식은 LIGHT 배역 훑기에 안 걸려 예전엔 깊은 데에서도 밖처럼 밝았다(독립 검수 C3)
  }
  if(typeof FLORA_PICK!=='undefined'&&!FLORA_PICK.cvcalcite)
    Object.assign(FLORA_PICK,{
      cvcalcite:{item:'limestone',n:'동굴 석회 조각',verb:'떼기',    regrow:9999,cnt:[1,1],dur:1.2,stam:3},
      cvrubble :{item:'pebble',   n:'무너진 돌',     verb:'줍기',    regrow:9999,cnt:[1,2],dur:0.5,stam:1.5},
      cvroot   :{item:'fiber',    n:'나무뿌리',       verb:'뜯기',    regrow:96,  cnt:[1,2],dur:1.0,stam:2},
      cvstraw  :{item:'limestone',n:'빨대 종유석',   verb:'꺾기',    regrow:9999,cnt:[1,1],dur:0.6,stam:1.5},
      cvcurtain:{item:'limestone',n:'동굴 커튼(유석)',verb:'떼기',    regrow:9999,cnt:[1,2],dur:1.4,stam:3},
      cvpearl  :{item:'limestone',n:'동굴 진주',     verb:'줍기',    regrow:9999,cnt:[1,1],dur:0.5,stam:1},
      cvsalt   :{item:'salt',     n:'소금꽃',         verb:'긁어 모으기',regrow:9999,cnt:[1,1],dur:0.8,stam:1.5},
      cvmoss   :{item:'fiber',    n:'이끼',           verb:'뜯기',    regrow:96,  cnt:[1,1],dur:0.6,stam:1},
      cvflake  :{item:'pebble',   n:'광물 딱지',      verb:'긁어내기',regrow:9999,cnt:[1,1],dur:0.8,stam:2},
      cvmush   :{item:'mushroom', n:'굴 버섯',        verb:'따기',    regrow:36,  cnt:[1,1],dur:0.5,stam:1}
    });
  if(!CVD.hooked&&typeof floraFindLook==='function'){          // 매 프레임 딴 것을 숨기고 다시 난 것을 보인다 + 빛나는 점의 시각(32-caves.js 는 판 9 굴이 없으면 안 돌린다)
    CVD.hooked=true; const f0=floraFindLook;
    floraFindLook=function(){ if(CV10.built.size){ try{ cv10DecoRun(CVD.budget); cv10DecoSync(); }catch(e){ showErr('굴 장식',e); } } f0(); };   // 장식이 던져도 원래 floraFindLook 은 늘 부른다
  }
}

/* ── 가는 도구 ───────────────────────────────────────────────────────────────────────────────────────────── */
const cvdSS=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const cvdAcc=()=>({p:[],n:[],c:[],i:[],tr:0});
const cvdLerp4=(a,q,nx,u,w)=>(a[q]*(1-u)+a[q+1]*u)*(1-w)+(a[q+nx]*(1-u)+a[q+nx+1]*u)*w;
function cvdBil(X,arr,x,z){                                      // 격자 쌍선형(가장자리는 붙잡는다) — 검사가 쓰는 것과 같은 식
  const S=X.S, nx=X.nx, nz=X.nz; let fx=(x-X.x0)/S, fz=(z-X.z0)/S, i=Math.floor(fx), j=Math.floor(fz); fx-=i; fz-=j;
  if(i<0){ i=0; fx=0; } if(j<0){ j=0; fz=0; } if(i>nx-2){ i=nx-2; fx=1; } if(j>nz-2){ j=nz-2; fz=1; }
  const q=j*nx+i; return (arr[q]*(1-fx)+arr[q+1]*fx)*(1-fz)+(arr[q+nx]*(1-fx)+arr[q+nx+1]*fx)*fz;
}
function cvdNoise(X,x,z,sc,k){                                   // 값 잡음 [0,1) — 굴 씨로 갈린다
  const fx=x/sc, fz=z/sc, i=Math.floor(fx), j=Math.floor(fz), u=fx-i, w=fz-j, su=u*u*(3-2*u), sw=w*w*(3-2*w), s=X.seed+k*131;
  const a=cv10H(i,j,s), b=cv10H(i+1,j,s), c=cv10H(i,j+1,s), d=cv10H(i+1,j+1,s); return (a+(b-a)*su)*(1-sw)+(c+(d-c)*su)*sw;
}
function cvdFar(list,x,z,d){ const d2=d*d; for(let k=0;k<list.length;k++){ const dx=list[k].x-x, dz=list[k].z-z; if(dx*dx+dz*dz<d2) return false; } return true; }
function* cvdTyped(T,arr){                                        // 숫자 배열 → 형 배열(큰 것은 덩이마다 쉬며 옮긴다)
  const out=new T(arr.length);
  for(let i=0;i<arr.length;i+=8192){ const e=Math.min(arr.length,i+8192); for(let k=i;k<e;k++) out[k]=arr[k]; if(e<arr.length&&cvdT()) yield; }
  return out;
}
function* cvdChamfer(X,src){                                     // src[q]=1 인 칸에서의 거리(m) — 두 번 훑는 근사(줄 묶음마다 쉰다)
  const nx=X.nx, nz=X.nz, S=X.S, S2=S*1.4142, d=new Float32Array(nx*nz);
  for(let q=0;q<d.length;q++) d[q]=src[q]?0:1e4;
  for(let j=0;j<nz;j++){ if((j&7)===7&&cvdT()) yield; for(let i=0;i<nx;i++){ const q=j*nx+i; let v=d[q];
    if(i>0&&d[q-1]+S<v) v=d[q-1]+S; if(j>0){ if(d[q-nx]+S<v) v=d[q-nx]+S; if(i>0&&d[q-nx-1]+S2<v) v=d[q-nx-1]+S2; if(i<nx-1&&d[q-nx+1]+S2<v) v=d[q-nx+1]+S2; } d[q]=v; } }
  for(let j=nz-1;j>=0;j--){ if((j&7)===0&&cvdT()) yield; for(let i=nx-1;i>=0;i--){ const q=j*nx+i; let v=d[q];
    if(i<nx-1&&d[q+1]+S<v) v=d[q+1]+S; if(j<nz-1){ if(d[q+nx]+S<v) v=d[q+nx]+S; if(i<nx-1&&d[q+nx+1]+S2<v) v=d[q+nx+1]+S2; if(i>0&&d[q+nx-1]+S2<v) v=d[q+nx-1]+S2; } d[q]=v; } }
  return d;
}
/* 종류별 바탕 빛깔 b · 띠 빛깔 a (방해석 크림 + 철분 주황 / 용암 검정 + 붉은 산화 / 화강암 회색 + 분홍 / 사암 황갈 + 붉은 켜) */
const CVD_PAL={ karst:{b:[0.80,0.74,0.62],a:[0.66,0.42,0.24]}, lava:{b:[0.17,0.155,0.15],a:[0.32,0.18,0.13]}, talus:{b:[0.54,0.52,0.50],a:[0.64,0.47,0.44]}, shelter:{b:[0.78,0.60,0.40],a:[0.64,0.36,0.22]} };
function cvdCol(X,tone,band,ph){                                 // (t,j)→[r,g,b] — t 가 길이 방향. 띠가 그 위를 지난다
  const P=CVD_PAL[X.kind]||CVD_PAL.talus, b=P.b, a=P.a;
  return (t)=>{ const m=Math.min(0.7,Math.max(0,Math.sin(t*9+ph)-0.4)*band), k=tone*(1-0.12*t);
    return [(b[0]*(1-m)+a[0]*m)*k,(b[1]*(1-m)+a[1]*m)*k,(b[2]*(1-m)+a[2]*m)*k]; };
}

/* 돌림꼴 하나 — 뿌리 (x,y,z)에서 축 u 로 len 만큼 · 반지름 rf(t) · SG 모 · RG 마디. rf(1)=0 이면 끝은 한 점(꼭짓점 하나로 모은다).
   cf(t)→[r,g,b] · sh(t)→[dx,dy,dz] 휘어짐. 돌려주는 것 {v0,v1}(정점 범위 — 숨길 때). 세모 수는 A.tr 에 센다 */
function cvdRev(A,x,y,z,ux,uy,uz,len,rf,SG,RG,cf,sh){
  let l=Math.hypot(ux,uy,uz)||1; ux/=l; uy/=l; uz/=l;
  let e1x,e1y,e1z; if(Math.abs(uy)<0.9){ e1x=-uz; e1y=0; e1z=ux; } else { e1x=0; e1y=uz; e1z=-uy; }   // u × (0,1,0) 또는 u × (1,0,0) 쪽
  l=Math.hypot(e1x,e1y,e1z)||1; e1x/=l; e1y/=l; e1z/=l;
  const e2x=uy*e1z-uz*e1y, e2y=uz*e1x-ux*e1z, e2z=ux*e1y-uy*e1x;                                          // e2 = u × e1 → e1 × e2 = u
  const tip=rf(1)<1e-4, rings=tip?RG:RG+1, v0=A.p.length/3;
  for(let k=0;k<rings;k++){ const t=k/RG, r=rf(t), dr=(rf(Math.min(1,t+0.04))-rf(Math.max(0,t-0.04)))/(len*(Math.min(1,t+0.04)-Math.max(0,t-0.04))||1), col=cf(t), s=sh?sh(t):null;
    const cx=x+ux*len*t+(s?s[0]:0), cy=y+uy*len*t+(s?s[1]:0), cz=z+uz*len*t+(s?s[2]:0);
    for(let j=0;j<SG;j++){ const an=j/SG*6.2831853, ca=Math.cos(an), sa=Math.sin(an), rx=ca*e1x+sa*e2x, ry=ca*e1y+sa*e2y, rz=ca*e1z+sa*e2z;
      let nx=rx-dr*ux, ny=ry-dr*uy, nz=rz-dr*uz; const nl=Math.hypot(nx,ny,nz)||1;
      A.p.push(cx+rx*r,cy+ry*r,cz+rz*r); A.n.push(nx/nl,ny/nl,nz/nl); A.c.push(col[0]*(0.94+0.06*ca),col[1]*(0.94+0.06*ca),col[2]*(0.94+0.06*ca)); } }
  const o=v0, bands=tip?RG-1:RG;
  for(let k=0;k<bands;k++) for(let j=0;j<SG;j++){ const j1=(j+1)%SG, a=o+k*SG+j, b=o+k*SG+j1, e=a+SG, f=b+SG; A.i.push(a,b,e, b,f,e); A.tr+=2; }
  if(tip){ const col=cf(1), s=sh?sh(1):null, ap=A.p.length/3;
    A.p.push(x+ux*len+(s?s[0]:0),y+uy*len+(s?s[1]:0),z+uz*len+(s?s[2]:0)); A.n.push(ux,uy,uz); A.c.push(col[0],col[1],col[2]);
    const lo=o+(RG-1)*SG; for(let j=0;j<SG;j++){ A.i.push(lo+j,lo+(j+1)%SG,ap); A.tr++; } }
  return {v0,v1:A.p.length/3};
}
/* ── 사용자 모형 조각 — 종유석 · 석순 · 용암 고드름 · 작은 용암 석순(2026-11-11 사용자 요청 '그 모형을 종유석 석순으로 넣는데 렌덤 요소를') ──────────
   큰 지형 모형 `cave_stalactites_and_stalagmites`(data-geo-meshes.js 의 near — geoMeshGeo 와 같은 풀기를 여기서 쪼개 돈다 · 캐시를 안 만든다)는 서로 안 붙은 조각 79 개다 —
   바닥(y≈0)에 선 것 27(g) · 천장(y≈1)에 매달린 것 22(c)만 쓰고(가운데 뜬 것 · 잔조각은 버림) 조각마다 '밑동이 y=0 · 끝이 y=1 · 가로 반지름 1' 로 고쳐 놓은 뒤
   (매달린 것은 위아래를 뒤집고 면 차례도 뒤집는다) 모서리 접기(QEM · 이웃 고리 조건 · 면이 뒤집히는 접기는 버림 · 밑동 면의 정점은 그 면을 안 떠난다)로
   CVD_PC.T 단계까지 줄인 꼴을 처음 한 번 만든다(제너레이터 — 풀기 · 나누기 · 줄이기 모두 cvdT() 마다 쉰다).
   놓기 — 자리 · 길이 · 굵기 · 빛깔 바탕은 예전 식(X.rnd) 그대로 · 조각 고르기 · 돌림 · 뒤집기 · 기울임 · 굵기 흔들기 · 빛깔 흔들기는 따로 난수 X.prnd 만 쓴다
   (X.rnd 차례가 그대로라 자리 · 딸 것 열쇠가 예전과 같다). 세모 예산(cvdBudget)은 예전 원뿔의 세모 수(eq)로 센다(단계 cap 이 개수를 자르는 자리가 그대로) —
   늘어난 몫은 X.xtr · 굴을 다 지은 뒤 참 세모 합이 CVD.maxTri 를 넘으면 cvdPcCap 이 조각들을 거친 단계(그래도 넘치면 원뿔)로 다시 고른다.
   자료가 없으면(list=false) 부른 쪽이 예전 원뿔(cvdRev)을 그린다. */
const CVD_PC={ name:'cave_stalactites_and_stalagmites', T:[320,160,96,56,32,20,12], list:null };
function* cvdPcDecode(){                                          // geoMeshGeo 와 같은 풀기(위치 · 오목함 → 빛깔 값 · 인덱스) — 덩이마다 쉰다
  const D=GEO_MESH_DATA[CVD_PC.name].near, bin=atob(D.b), nb=bin.length, u8=new Uint8Array(nb);
  for(let i=0;i<nb;i+=32768){ const e=Math.min(nb,i+32768); for(let k=i;k<e;k++) u8[k]=bin.charCodeAt(k); if(cvdT()) yield; }
  const q=new Uint16Array(u8.buffer,0,D.nv*3), cav=u8.subarray(D.nv*6,D.nv*7), io=D.nv*7+(D.nv%2);
  const I=D.i32?new Uint32Array(u8.buffer.slice(io,io+D.nt*12)):new Uint16Array(u8.buffer.slice(io,io+D.nt*6));
  const P=new Float32Array(D.nv*3), C=new Float32Array(D.nv);
  for(let i=0;i<D.nv;i++){ for(let a=0;a<3;a++) P[i*3+a]=D.mn[a]+q[i*3+a]/65535*(D.mx[a]-D.mn[a]); C[i]=1-0.62*Math.pow(cav[i]/255,1.6); if((i&1023)===1023&&cvdT()) yield; }
  return {P,C,I};
}
function* cvdPcSplit(P,Cv,I){                                     // 모형 → 조각 [{up:g 이면 참, P,C,I,lock}] (밑동 y=0 · 끝 y=1 · 가로 반지름 1 · 차례는 밖에서 보아 반시계)
  const nv=P.length/3, nt=I.length/3, par=new Int32Array(nv); for(let v=0;v<nv;v++) par[v]=v;
  const fd=x=>{ while(par[x]!==x){ par[x]=par[par[x]]; x=par[x]; } return x; };
  for(let t=0;t<nt;t++){ const a=fd(I[t*3]), b=fd(I[t*3+1]); par[b]=a; const c=fd(I[t*3+2]); par[c]=a; if((t&2047)===2047&&cvdT()) yield; }
  const comp=new Map(); for(let t=0;t<nt;t++){ const r=fd(I[t*3]); let l=comp.get(r); if(!l) comp.set(r,l=[]); l.push(t); }
  if(cvdT()) yield;
  const out=[];
  for(const ts of comp.values()){ if(cvdT()) yield; let y0=1e9, y1=-1e9; for(const t of ts) for(let e=0;e<3;e++){ const y=P[I[t*3+e]*3+1]; if(y<y0) y0=y; if(y>y1) y1=y; }
    const up=y0<0.002, dn=y1>0.998; if(up===dn||ts.length<24) continue;           // 바닥에 선 것 · 천장에 매달린 것만
    /* 차례 맞추기 — geoOrient 와 같은 생각: 두 세모가 나눠 쓰는 모서리는 서로 반대로 돌게 퍼뜨리고, 부피가 음수면 통째로 뒤집는다 */
    const T=ts.map(t=>[I[t*3],I[t*3+1],I[t*3+2]]), E=new Map(), key=(a,b)=>a<b?a*nv+b:b*nv+a;
    T.forEach((t,j)=>{ for(let e=0;e<3;e++){ const k=key(t[e],t[(e+1)%3]); const l=E.get(k); if(l) l.push(j); else E.set(k,[j]); } });
    const seen=new Uint8Array(T.length), dir=(t,a,b)=>{ for(let e=0;e<3;e++){ if(t[e]===a&&t[(e+1)%3]===b) return 1; if(t[e]===b&&t[(e+1)%3]===a) return -1; } return 0; };
    for(let s0=0;s0<T.length;s0++){ if(seen[s0]) continue; seen[s0]=1; const st=[s0];
      while(st.length){ const j=st.pop(), t=T[j]; for(let e=0;e<3;e++){ const a=t[e], b=t[(e+1)%3], l=E.get(key(a,b)); if(l.length!==2) continue; const u=l[0]===j?l[1]:l[0]; if(seen[u]) continue;
        if(dir(T[u],a,b)===1){ const x=T[u][1]; T[u][1]=T[u][2]; T[u][2]=x; } seen[u]=1; st.push(u); } } }
    let vol=0; for(const t of T){ const A=t[0]*3, B=t[1]*3, C=t[2]*3; vol+=P[A]*(P[B+1]*P[C+2]-P[B+2]*P[C+1])-P[A+1]*(P[B]*P[C+2]-P[B+2]*P[C])+P[A+2]*(P[B]*P[C+1]-P[B+1]*P[C]); }
    const flip=(vol<0)!==dn;                                      // 매달린 것은 위아래를 뒤집으니 차례도 한 번 더 뒤집는다
    const map=new Map(), p=[], c=[], ix=[], lock=[];
    for(const tri of T){ if(flip){ const s=tri[1]; tri[1]=tri[2]; tri[2]=s; }
      for(const v of tri){ let k=map.get(v); if(k===undefined){ k=p.length/3; map.set(v,k); const y=up?P[v*3+1]:1-P[v*3+1]; p.push(P[v*3],y,P[v*3+2]); c.push(Cv[v]); lock.push(y<0.0015?1:0); } ix.push(k); } }
    let cx=0, cz=0, nb=0, hp=0, rp=0; for(let k=0;k<lock.length;k++){ if(lock[k]){ cx+=p[k*3]; cz+=p[k*3+2]; nb++; } if(p[k*3+1]>hp) hp=p[k*3+1]; }
    if(!nb||hp<0.02) continue; cx/=nb; cz/=nb;
    for(let k=0;k<lock.length;k++) rp=Math.max(rp,Math.hypot(p[k*3]-cx,p[k*3+2]-cz));
    for(let k=0;k<lock.length;k++){ p[k*3]=(p[k*3]-cx)/rp; p[k*3+1]=lock[k]?0:p[k*3+1]/hp; p[k*3+2]=(p[k*3+2]-cz)/rp; }
    out.push({up,P:p,C:c,I:ix,lock,asp:hp/rp}); }
  return out;
}
/* 줄이기 — 모서리 접기(QEM). 이웃 고리 조건(두 끝의 공통 이웃이 둘)으로 닫힌 껍데기를 지키고 · 둘레 면의 법선이 0.2 아래로 돌면 버리고 · 정점 넷 밑으로는 안 간다.
   밑동 면(lock)의 정점은 그 면 위에만 머문다(밑동과 옆이 만나면 밑동 쪽 자리로). 돌려주는 것: T 단계마다 하나(같은 세모 수는 하나로) — 세모 수 내림차순.
   정점 법선은 밑동 뚜껑(세 꼭짓점이 다 lock 인 면 — 늘 묻혀 안 보인다)을 빼고 센다(넣으면 밑동 둘레 법선이 아래로 눕는다) */
function* cvdDecim(S,T){
  const nv=S.P.length/3, F=Int32Array.from(S.I), nt=F.length/3, X=Float64Array.from(S.P), Cv=Float64Array.from(S.C), L=S.lock;
  const Q=new Float64Array(nv*10), aliveF=new Uint8Array(nt).fill(1), aliveV=new Uint8Array(nv).fill(1), ver=new Int32Array(nv), vf=[];
  for(let v=0;v<nv;v++) vf.push([]);
  for(let f=0;f<nt;f++){ const a=F[f*3], b=F[f*3+1], c=F[f*3+2]; vf[a].push(f); vf[b].push(f); vf[c].push(f);
    const ux=X[b*3]-X[a*3], uy=X[b*3+1]-X[a*3+1], uz=X[b*3+2]-X[a*3+2], wx=X[c*3]-X[a*3], wy=X[c*3+1]-X[a*3+1], wz=X[c*3+2]-X[a*3+2];
    let nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx; const l=Math.hypot(nx,ny,nz); if(l<1e-14) continue; nx/=l; ny/=l; nz/=l;
    const d=-(nx*X[a*3]+ny*X[a*3+1]+nz*X[a*3+2]), w=l*0.5, q=[nx*nx,nx*ny,nx*nz,nx*d,ny*ny,ny*nz,ny*d,nz*nz,nz*d,d*d];
    for(const v of [a,b,c]) for(let k=0;k<10;k++) Q[v*10+k]+=w*q[k]; }
  if(cvdT()) yield;
  const err=(a,b,x,y,z)=>{ const o=a*10, r=b*10, g=k=>Q[o+k]+Q[r+k];
    return g(0)*x*x+2*g(1)*x*y+2*g(2)*x*z+2*g(3)*x+g(4)*y*y+2*g(5)*y*z+2*g(6)*y+g(7)*z*z+2*g(8)*z+g(9); };
  const facesOf=v=>{ const l=vf[v].filter(f=>aliveF[f]); vf[v]=l; return l; };
  const nbrs=v=>{ const s=new Set(); for(const f of facesOf(v)) for(let e=0;e<3;e++){ const u=F[f*3+e]; if(u!==v) s.add(u); } return s; };
  const H=[], hpush=e=>{ H.push(e); let i=H.length-1; while(i>0){ const p=(i-1)>>1; if(H[p][0]<=H[i][0]) break; const t=H[p]; H[p]=H[i]; H[i]=t; i=p; } };
  const hpop=()=>{ const top=H[0], last=H.pop(); if(H.length){ H[0]=last; let i=0; for(;;){ const l=2*i+1, r=l+1; let m=i; if(l<H.length&&H[l][0]<H[m][0]) m=l; if(r<H.length&&H[r][0]<H[m][0]) m=r; if(m===i) break; const t=H[m]; H[m]=H[i]; H[i]=t; i=m; } } return top; };
  const cand=(a,b)=>{ const pa=[X[a*3],X[a*3+1],X[a*3+2]], pb=[X[b*3],X[b*3+1],X[b*3+2]], len2=(pa[0]-pb[0])**2+(pa[1]-pb[1])**2+(pa[2]-pb[2])**2;
    const opts=L[a]&&!L[b]?[[a,b,pa]]:L[b]&&!L[a]?[[b,a,pb]]:[[a,b,pa],[b,a,pb],[a,b,[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2,(pa[2]+pb[2])/2]]];
    let best=null, bc=1e30; for(const o of opts){ const c=err(a,b,o[2][0],o[2][1],o[2][2]); if(c<bc-1e-15){ bc=c; best=o; } }
    hpush([Math.max(0,bc)+1e-6*len2,best[0],best[1],best[2],ver[a],ver[b],a,b]); };
  const pushAll=v=>{ for(const u of nbrs(v)) cand(v,u); };
  const fn=(f,w,p)=>{ const P3=k=>{ const v=F[f*3+k]; return v===w?p:[X[v*3],X[v*3+1],X[v*3+2]]; }, a=P3(0), b=P3(1), c=P3(2);
    const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], wx=c[0]-a[0], wy=c[1]-a[1], wz=c[2]-a[2]; return [uy*wz-uz*wy, uz*wx-ux*wz, ux*wy-uy*wx]; };
  const snap=()=>{ const map=new Int32Array(nv).fill(-1), p=[], c=[], ix=[], lk=[];
    for(let f=0;f<nt;f++){ if(!aliveF[f]) continue; for(let e=0;e<3;e++){ const v=F[f*3+e]; if(map[v]<0){ map[v]=p.length/3; p.push(X[v*3],X[v*3+1],X[v*3+2]); c.push(Cv[v]); lk.push(L[v]); } ix.push(map[v]); } }
    const n=new Float32Array(p.length);
    for(let t=0;t<ix.length;t+=3){ if(lk[ix[t]]&&lk[ix[t+1]]&&lk[ix[t+2]]) continue;             // 밑동 뚜껑은 법선에 안 센다
      const a=ix[t]*3, b=ix[t+1]*3, d=ix[t+2]*3, ux=p[b]-p[a], uy=p[b+1]-p[a+1], uz=p[b+2]-p[a+2], wx=p[d]-p[a], wy=p[d+1]-p[a+1], wz=p[d+2]-p[a+2];
      const nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx; for(const v of [a,b,d]){ n[v]+=nx; n[v+1]+=ny; n[v+2]+=nz; } }
    for(let v=0;v<n.length;v+=3){ const l=Math.hypot(n[v],n[v+1],n[v+2]); if(l>1e-20){ n[v]/=l; n[v+1]/=l; n[v+2]/=l; } else n[v+1]=-1; }   // 뚜껑 안쪽에만 있는 정점은 아래
    return {p:new Float32Array(p),n,c:new Float32Array(c),i:new Uint16Array(ix),lock:new Uint8Array(lk),tr:ix.length/3,nv:p.length/3}; };
  let nF=nt, nV=nv, ti=0, step=0; const out=[];
  while(ti<T.length&&T[ti]>=nF) ti++;
  if(nF<=T[0]) out.push(snap());
  for(let v=0;v<nv;v++){ pushAll(v); if((v&63)===63&&cvdT()) yield; }
  while(ti<T.length&&H.length&&nV>4){ if((++step&31)===0&&cvdT()) yield;
    const e=hpop(), keep=e[1], rem=e[2], pos=e[3];
    if(!aliveV[e[6]]||!aliveV[e[7]]||ver[e[6]]!==e[4]||ver[e[7]]!==e[5]) continue;
    const fr=facesOf(rem), sh=fr.filter(f=>F[f*3]===keep||F[f*3+1]===keep||F[f*3+2]===keep); if(sh.length!==2) continue;
    const nk=nbrs(keep), nr=nbrs(rem); let com=0; for(const u of nr) if(nk.has(u)) com++; if(com!==2) continue;
    let ok=true; for(const f of facesOf(keep).concat(fr)){ if(sh.indexOf(f)>=0) continue;
      const w=F[f*3]===rem||F[f*3+1]===rem||F[f*3+2]===rem?rem:keep, n0=fn(f,-1,null), n1=fn(f,w,pos), l0=Math.hypot(n0[0],n0[1],n0[2]), l1=Math.hypot(n1[0],n1[1],n1[2]);
      if(l1<1e-12||n0[0]*n1[0]+n0[1]*n1[1]+n0[2]*n1[2]<0.2*l0*l1){ ok=false; break; } }
    if(!ok) continue;
    const mid=pos[0]!==X[keep*3]||pos[1]!==X[keep*3+1]||pos[2]!==X[keep*3+2];
    if(mid) Cv[keep]=(Cv[keep]+Cv[rem])*0.5;
    X[keep*3]=pos[0]; X[keep*3+1]=pos[1]; X[keep*3+2]=pos[2]; L[keep]=L[keep]||L[rem]?1:0;
    for(let k=0;k<10;k++) Q[keep*10+k]+=Q[rem*10+k];
    for(const f of sh){ aliveF[f]=0; nF--; }
    for(const f of fr){ if(!aliveF[f]) continue; for(let k=0;k<3;k++) if(F[f*3+k]===rem) F[f*3+k]=keep; vf[keep].push(f); }
    aliveV[rem]=0; nV--; ver[keep]++; ver[rem]++; pushAll(keep);
    if(nF<=T[ti]){ out.push(snap()); while(ti<T.length&&T[ti]>=nF) ti++; } }
  if(!out.length||out[out.length-1].tr>nF) out.push(snap());
  return out;
}
function* cvdPcInit(){                                            // 처음 한 번 — 풀고 · 조각을 뜯고 · 단계마다 줄인다(모두 cvdT() 마다 쉰다). 버려진 굴의 짓기에서 멈추면 다음 굴이 처음부터
  let list=false; const t0=performance.now();
  try{ const G=typeof GEO_MESH_DATA!=='undefined'&&GEO_MESH_DATA[CVD_PC.name];
    if(G&&G.near){ const d=yield* cvdPcDecode(), src=yield* cvdPcSplit(d.P,d.C,d.I); list=[];
      for(const s of src){ if(cvdT()) yield; const lods=yield* cvdDecim({P:s.P,C:s.C,I:s.I,lock:s.lock.slice()},CVD_PC.T);
        /* 단계마다 끝을 y=1 로 다시 늘인다 — 거친 단계는 끝 정점이 접혀 0.47~0.7 까지 낮아져, 3 cm 묻는 짧은 고드름이 통째로 천장 속에 들었다(H2 · 2026-11-11) */
        for(const G of lods){ let ym=0; for(let v=0;v<G.nv;v++) if(G.p[v*3+1]>ym) ym=G.p[v*3+1]; if(ym<=0.05||ym>=0.9999) continue;
          for(let v=0;v<G.nv;v++){ G.p[v*3+1]/=ym; const nx=G.n[v*3], ny=G.n[v*3+1]*ym, nz=G.n[v*3+2], l=Math.hypot(nx,ny,nz)||1; G.n[v*3]=nx/l; G.n[v*3+1]=ny/l; G.n[v*3+2]=nz/l; } }
        list.push({up:s.up,asp:s.asp,L:lods}); }
      if(!list.some(p=>p.up)||!list.some(p=>!p.up)) list=false;
      else { const med=a=>{ a.sort((p,q)=>p-q); return a[a.length>>1]; };   // 묶음(g · c)마다 본디 키/굵기 비의 가운데값 — 굵기를 정할 때 그 조각의 비를 반쯤 섞는다(H5)
        CVD_PC.am={g:med(list.filter(p=>p.up).map(p=>p.asp)),c:med(list.filter(p=>!p.up).map(p=>p.asp))}; } } }
  catch(e){ showErr('굴 장식 조각',e); list=false; }
  CVD_PC.list=list; CVD_PC.ms=performance.now()-t0;              // ms — 처음 만든 데 걸린 벽시계(틱마다 나눠 쓴 것 포함)
}
/* 조각 하나를 놓는다 — pool 'g'(바닥에 선 것) · 'c'(매달린 것) · down 이면 끝이 아래(종유석 · 고드름). (x,y,z) 밑동 가운데 · H 길이 · R 가로 반지름 · eq 예전 원뿔의 세모 수 ·
   want 바라는 세모 수 · o:{cf(t)→빛깔 · col 고정 빛깔 · lx,lz 끝 쪽 휨 · pair 짝(같은 조각 · 같은 돌림) · cone(acc) 예전 원뿔을 그리는 함수}.
   돌려주는 것 {v0,v1,pc,dy}(정점 범위 · 고른 조각 · 밑동 맞추기로 옮긴 높이) 또는 null(자료 없음 · 밑동을 못 맞춤 — 부른 쪽이 원뿔을 그린다) */
function cvdPcPut(X,A,pool,down,x,y,z,H,R,eq,want,o){
  const PL_=CVD_PC.list; if(!PL_) return null;
  const pr=X.prnd, up=pool==='g';
  if(!X.pw) X.pw={}; let W=X.pw[pool];
  if(!W){ W=X.pw[pool]=[]; for(let k=0;k<PL_.length;k++) if(PL_[k].up===up) W.push([k,0.04+Math.pow(pr(),3)]); }   // 굴마다의 몫 — 몇 조각이 많이 나온다
  let s=0; for(const w of W) s+=w[1]; let r=pr()*s, k=W[W.length-1][0]; for(const w of W){ r-=w[1]; if(r<=0){ k=w[0]; break; } }
  const yaw0=pr()*6.2831853, mir0=pr()<0.5?-1:1, ta0=(3+5*pr())*0.0174533, td=pr()*6.2831853, th=0.7+0.6*pr(), ox=0.9+0.2*pr(), cj=0.92+0.16*pr();
  const pair=o.pair, pk=pair?pair.k:k, yaw=pair?pair.yaw:yaw0, mir=pair?pair.mir:mir0, pc=PL_[pk];
  /* 굵기 — 조각 본디 키/굵기 비(asp)를 반쯤 섞는다: 그 묶음 가운데값에 대어 가늘고 긴 조각은 가늘게 · 뭉툭한 것은 굵게(0.7~1.3 배 · H5) */
  const am=CVD_PC.am?CVD_PC.am[pc.up?'g':'c']:0, ka=am?Math.min(1.3,Math.max(0.7,Math.sqrt(am/pc.asp))):1, th2=th*ka;
  let a=o.big?Math.min(1,th2):th2, sy=H;
  /* 겉 반지름 상한(o.rmax — 몸 막이가 없는 석순: 예전 원뿔의 가장 굵은 반지름) — 기울임은 그 반까지만 · 굵기는 모든 단계의 정점이 밑동 세로축에서 rmax 안에 들게(H1) */
  const lim=o.rmax||0, ta=lim?Math.min(ta0,Math.asin(Math.min(1,0.5*lim/H))):ta0;
  let li=0; while(li<pc.L.length-1&&pc.L[li].tr>want) li++;
  const cy=Math.cos(yaw), sy_=Math.sin(yaw), ca=Math.cos(ta), sa=Math.sin(ta), kx=Math.cos(td), kz=Math.sin(td);
  /* M = 기울임(축 (kx,0,kz) 둘레 ta) × 돌림(위 축 yaw) */
  const Ry=[cy,0,sy_, 0,1,0, -sy_,0,cy];
  const Rt=[ca+kx*kx*(1-ca), -kz*sa, kx*kz*(1-ca),  kz*sa, ca, -kx*sa,  kz*kx*(1-ca), kx*sa, ca+kz*kz*(1-ca)];
  const M=[]; for(let i=0;i<3;i++) for(let j=0;j<3;j++) M.push(Rt[i*3]*Ry[j]+Rt[i*3+1]*Ry[3+j]+Rt[i*3+2]*Ry[6+j]);
  const fy=down?-1:1, lx=o.lx||0, lz=o.lz||0;
  const xf=(G,sx,sz,v,out)=>{ const P=G.p, px=P[v*3]*mir*sx, py=P[v*3+1]*sy, pz=P[v*3+2]*sz, t=P[v*3+1];
    out[0]=M[0]*px+M[1]*py+M[2]*pz+lx*t*t; out[1]=(M[3]*px+M[4]*py+M[5]*pz)*fy; out[2]=M[6]*px+M[7]*py+M[8]*pz+lz*t*t; return out; };
  if(lim){ const sx0=R*a*ox, sz0=R*a/ox; let kmin=1;            // 가로 = k·A + B(A 굵기 몫 · B 기울임 · 휨 몫) — |k·A+B| ≤ lim 을 푸는 가장 큰 k(모든 단계 · 모든 정점)
    for(const G of pc.L){ const P=G.p; for(let v=0;v<G.nv;v++){ const px=P[v*3]*mir*sx0, pz=P[v*3+2]*sz0, py=P[v*3+1]*sy, t=P[v*3+1];
      const ax=M[0]*px+M[2]*pz, az=M[6]*px+M[8]*pz, bx=M[1]*py+lx*t*t, bz=M[7]*py+lz*t*t, AA=ax*ax+az*az, AB=ax*bx+az*bz, BB=bx*bx+bz*bz;
      if(AA<1e-14) continue; const k=(-AB+Math.sqrt(Math.max(0,AB*AB-AA*(BB-lim*lim))))/AA; if(k<kmin) kmin=k; } }
    a*=Math.max(1e-3,kmin); }
  /* 밑동 맞추기 — 가장 고운 단계(L[0])의 밑동 정점마다 그 자리 바닥(석순) · 천장(종유석)을 재 1 cm 안쪽에 들게 통째로 민다(단계를 바꿔도 같은 양).
     가운데의 바닥 · 천장과 0.3 m 넘게 다른 표본(옆 칸 · 벼랑 너머)은 버린다 · 미는 양은 길이의 0.2 배 · 0.15 m 까지 — 넘치면 품(R)을 0.7 배씩 두 번 줄여 보고, 그래도 넘치면 원뿔로(null) */
  const s0=cv10Samp(X.rec,x,z), surf0=s0.n>0?(down?s0.c:s0.f):null, cap=Math.min(0.2*H,0.15), G0=pc.L[0], tmp=[0,0,0];
  let Rk=1, sft=-1, gap0=-1e9;
  for(let tr=0;tr<3&&sft<0;tr++,Rk*=0.7){ const sx=R*Rk*a*ox, sz=R*Rk*a/ox; let need=-1e9;
    for(let v=0;v<G0.nv;v++){ if(!G0.lock[v]) continue; xf(G0,sx,sz,v,tmp); const sm=cv10Samp(X.rec,x+tmp[0],z+tmp[2]); if(sm.n<=0) continue;
      const sf=down?sm.c:sm.f; if(surf0!==null&&Math.abs(sf-surf0)>0.3) continue; const gap=down?sf-(y+tmp[1]):(y+tmp[1])-sf; if(gap>need) need=gap; }
    if(tr===0) gap0=need;
    need+=0.01; if(need<=0) sft=0; else if(need<=cap) sft=need; }
  if(sft<0){ if(X.pcs) X.pcs.cone=(X.pcs.cone||0)+1; return null; }
  Rk/=0.7; const sx=R*Rk*a*ox, sz=R*Rk*a/ox, dy=down?sft:-sft;
  const emit=(acc,lj)=>{ const G=pc.L[lj], n=G.nv, N=G.n, Cg=G.c, v0=acc.p.length/3, i0=acc.i.length, V=[0,0,0];
    for(let v=0;v<n;v++){ xf(G,sx,sz,v,V); const nx=N[v*3]*mir/sx, ny=N[v*3+1]/sy, nz=N[v*3+2]/sz; const mx=M[0]*nx+M[1]*ny+M[2]*nz, my=(M[3]*nx+M[4]*ny+M[5]*nz)*fy, mz=M[6]*nx+M[7]*ny+M[8]*nz, l=Math.hypot(mx,my,mz)||1;
      const t=G.p[v*3+1], col=o.col||o.cf(t), g=(0.5+0.5*Cg[v])*cj;                              // 오목함은 반만(그대로 곱하면 예전 원뿔보다 15% 넘게 어두웠다)
      acc.p.push(x+V[0],y+V[1]+dy,z+V[2]); acc.n.push(mx/l,my/l,mz/l); acc.c.push(col[0]*g,col[1]*g,col[2]*g); }
    const I=G.i, rev=(mir<0)!==down;
    for(let t=0;t<I.length;t+=3){ if(rev) acc.i.push(v0+I[t],v0+I[t+2],v0+I[t+1]); else acc.i.push(v0+I[t],v0+I[t+1],v0+I[t+2]); }
    acc.tr+=eq; return {v0,v1:acc.p.length/3,i0,i1:acc.i.length}; };
  /* 몸 막이(o.blk:{f} — 큰 석순) — 사람 키 높이(바닥 f ~ f+2 m)에 든 겉(모든 단계의 정점 + 그 높이 면을 지나는 모서리)을 다 품는 원기둥.
     가운데는 그 높이 띠 한가운데의 기울어진 몸 축(H1 — 예전 1.1 r 원기둥은 큰 굵기 · 기울임에서 몸이 35 cm 까지 비어져 나왔다) */
  let blk=null;
  if(o.blk){ const lo=o.blk.f, hi=lo+2, b0=y+dy, ylo=Math.max(0,lo-b0), yhi=Math.max(ylo,Math.min(H*M[4],hi-b0)), ym=(ylo+yhi)/2, cx=x+M[1]/M[4]*ym, cz=z+M[7]/M[4]*ym, V=[0,0,0]; let rr=0;
    const pt=(px,pz)=>{ const d=Math.hypot(px-cx,pz-cz); if(d>rr) rr=d; };
    for(const G of pc.L){ const W=new Float64Array(G.nv*3), I=G.i;
      for(let v=0;v<G.nv;v++){ xf(G,sx,sz,v,V); W[v*3]=x+V[0]; W[v*3+1]=b0+V[1]; W[v*3+2]=z+V[2]; if(W[v*3+1]>=lo&&W[v*3+1]<=hi) pt(W[v*3],W[v*3+2]); }
      for(let t=0;t<I.length;t+=3) for(let e2=0;e2<3;e2++){ const p=I[t+e2]*3, q=I[t+(e2+1)%3]*3, ya=W[p+1], yb=W[q+1];
        for(const hh of [lo,hi]) if((ya-hh)*(yb-hh)<0){ const s=(hh-ya)/(yb-ya); pt(W[p]+s*(W[q]-W[p]),W[p+2]+s*(W[q+2]-W[p+2])); } } }
    blk={x:cx,z:cz,r:rr}; }
  const e=emit(A,li); X.xtr+=pc.L[li].tr-eq;
  const pr_={pk,li,eq,emit,cone:o.cone,down,v0:e.v0,v1:e.v1,i0:e.i0,i1:e.i1,isCone:false,dy,picks:[],blk:null};   // picks · blk — 원뿔로 바뀌면 겨눔점 · 몸 막이를 원뿔 기준으로 되돌린다(cvdPcCap · H3)
  X.pcl.push(pr_);
  if(X.pcs&&X.pcs.dbg) pr_.info={x,z,H,R,lim,asp:pc.asp,ka,a,th,grp:pc.up?'g':'c',pk,dy,f:o.blk?o.blk.f:null};   // 시험(CVD.dbg)
  if(X.pcs){ const u=X.pcs[down?'dn':'up'], uk=(pc.up?'g':'c')+pk; u[uk]=(u[uk]||0)+1; X.pcs.n++; if(gap0>X.pcs.gap0) X.pcs.gap0=gap0; if(sft>0.1) X.pcs.deep=(X.pcs.deep||0)+1; if(Rk<1) X.pcs.thin=(X.pcs.thin||0)+1; if(sft>X.pcs.sftMax) X.pcs.sftMax=sft; }   // 열쇠에 묶음(g 바닥 · c 천장)을 붙인다 — 짝으로 쓴 천장 조각이 석순 쪽 바닥 조각과 섞이지 않게(H4)
  return {v0:e.v0,v1:e.v1,pc:{k:pk,yaw,mir},dy,blk,pr:pr_};
}
/* 굴을 다 지은 뒤 — 참 세모 합(예산은 eq 로 셌다)이 CVD.maxTri 를 넘으면 조각들을 한 단계씩 거칠게(여러 바퀴) · 그래도 넘치면 뒤에서부터 예전 원뿔로 바꿔
   바위 메시를 다시 엮는다. 사이의 다른 장식은 그대로 옮기고 정점 번호만 민다 — 딸 것(X.items)의 v0/v1 도 같이 */
function* cvdPcCap(X){
  const A=X.A.rock, L=X.pcl, PL_=CVD_PC.list; if(!L||!L.length||!PL_) return;
  let over=X.A.rock.tr+X.A.sheet.tr+X.A.water.tr+X.A.shr.tr+X.xtr-CVD.maxTri; if(over<=0) return;
  const nl=L.map(r=>r.li), cone=new Uint8Array(L.length), trOf=(r,lj)=>PL_[r.pk].L[lj].tr;
  for(let moved=true;over>0&&moved;){ moved=false; for(let k=0;k<L.length&&over>0;k++){ const r=L[k]; if(nl[k]<PL_[r.pk].L.length-1){ over-=trOf(r,nl[k])-trOf(r,nl[k]+1); nl[k]++; moved=true; } } }
  for(let k=L.length-1;k>=0&&over>0;k--){ if(!L[k].cone) continue; over-=trOf(L[k],nl[k])-L[k].eq; cone[k]=1; }
  const P=[], N=[], C=[], I=[], bV=[], bD=[]; let vO=0, iO=0, dv=0, xtr=0;
  const copy=(v0,v1,i0,i1,d)=>{ for(let k=v0*3;k<v1*3;k++){ P.push(A.p[k]); N.push(A.n[k]); C.push(A.c[k]); } for(let k=i0;k<i1;k++) I.push(A.i[k]+d); };
  for(let k=0;k<L.length;k++){ if((k&63)===63&&cvdT()) yield; const r=L[k];
    copy(vO,r.v0,iO,r.i0,dv); const nv0=P.length/3, ni0=I.length;
    if(!cone[k]&&nl[k]===r.li) copy(r.v0,r.v1,r.i0,r.i1,dv);
    else { const t=cvdAcc(); if(cone[k]) r.cone(t); else r.emit(t,nl[k]); for(let q=0;q<t.p.length;q++){ P.push(t.p[q]); N.push(t.n[q]); C.push(t.c[q]); } for(const q of t.i) I.push(q+nv0); }
    if(!cone[k]) xtr+=trOf(r,nl[k])-r.eq;
    vO=r.v1; iO=r.i1; dv=P.length/3-r.v1; bV.push(r.v1); bD.push(dv);
    if(cone[k]&&!r.isCone){ for(const p of r.picks){ p.y-=r.dy; p.ay-=r.dy; }   // 원뿔은 밑동을 안 민다 — 겨눔점 · 몸 막이를 원뿔 기준으로(열쇠는 그대로 · H3)
      if(r.blk){ const b=r.blk, c=b[0]; c.x=b[1]; c.z=b[2]; c.r=b[3]; c.y0=b[4]; c.y1=b[5]; } r.dy=0; }
    r.v0=nv0; r.v1=P.length/3; r.i0=ni0; r.i1=I.length; r.li=nl[k]; r.isCone=!!cone[k]; }
  copy(vO,A.p.length/3,iO,A.i.length,dv);
  const mapB=b=>{ let lo=0, hi=bV.length-1, d=0; while(lo<=hi){ const m=(lo+hi)>>1; if(bV[m]<=b){ d=bD[m]; lo=m+1; } else hi=m-1; } return b+d; };   // 옛 정점 번호(범위 끝) → 새 번호
  for(const it of X.items) if(it.acc===A){ it.v0=mapB(it.v0); it.v1=mapB(it.v1); }
  A.p=P; A.n=N; A.c=C; A.i=I; X.xtr=xtr;
  if(X.pcs){ X.pcs.capped=1; X.pcs.cones=(X.pcs.cones||0)+cone.reduce((s,v)=>s+v,0); }
}
/* 그물 한 장(양면 시트) — nodes[a][b]=[x,y,z] · cols[a][b]=[r,g,b] · nrm=[nx,ny,nz]  (a: 길이 방향 · b: 너비 방향) */
function cvdGrid(A,nodes,cols,nrm){
  const v0=A.p.length/3, na=nodes.length, nb=nodes[0].length;
  for(let a=0;a<na;a++) for(let b=0;b<nb;b++){ const p=nodes[a][b], c=cols[a][b], n=Array.isArray(nrm[0])?nrm[a][b]:nrm; A.p.push(p[0],p[1],p[2]); A.n.push(n[0],n[1],n[2]); A.c.push(c[0],c[1],c[2]); }
  for(let a=0;a<na-1;a++) for(let b=0;b<nb-1;b++){ const i0=v0+a*nb+b, i1=i0+1, i2=i0+nb, i3=i2+1; A.i.push(i0,i2,i1, i1,i2,i3); A.tr+=2; }
  return {v0,v1:A.p.length/3};
}
/* 모난 돌 — 정이십면체를 흩뜨려 평면 몇 개로 깎고 면마다 따로 칠한다(평면 음영). 맨 밑 정점이 바닥 면(F)에서 −0.03 m */
const CVD_PHI=(1+Math.sqrt(5))/2;
const CVD_IV=[[-1,CVD_PHI,0],[1,CVD_PHI,0],[-1,-CVD_PHI,0],[1,-CVD_PHI,0],[0,-1,CVD_PHI],[0,1,CVD_PHI],[0,-1,-CVD_PHI],[0,1,-CVD_PHI],[CVD_PHI,0,-1],[CVD_PHI,0,1],[-CVD_PHI,0,-1],[-CVD_PHI,0,1]].map(v=>{ const l=Math.hypot(v[0],v[1],v[2]); return [v[0]/l,v[1]/l,v[2]/l]; });
const CVD_IF=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
function cvdRock(A,X,x,z,R,sy,tone,base){                       // base: 바닥 높이를 어디서 잴지(없으면 cv10Samp)
  const rnd=X.rnd, cs=Math.cos, sn=Math.sin, yaw=rnd()*6.2832, tx=(rnd()-0.5)*0.5, tz=(rnd()-0.5)*0.5, cy=cs(yaw), sy2=sn(yaw);
  const V=CVD_IV.map(v=>{ const j=0.8+0.36*rnd(); return [v[0]*j,v[1]*j,v[2]*j]; });
  for(let k=0;k<2+((rnd()*2)|0);k++){                            // 평면으로 깎기
    let nx=rnd()-0.5, ny=rnd()-0.5, nz=rnd()-0.5; const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl; const d=0.5+0.2*rnd();
    for(const v of V){ const dd=v[0]*nx+v[1]*ny+v[2]*nz; if(dd>d){ v[0]-=(dd-d)*nx; v[1]-=(dd-d)*ny; v[2]-=(dd-d)*nz; } } }
  const W=V.map(v=>{ let px=v[0]*R, py=v[1]*R*sy, pz=v[2]*R;
    const qx=px*cy+pz*sy2, qz=-px*sy2+pz*cy; px=qx; pz=qz;     // 돌림(위쪽 축)
    const qy=py*cs(tx)-pz*sn(tx); pz=py*sn(tx)+pz*cs(tx); py=qy; const qy2=py*cs(tz)-px*sn(tz); px=py*sn(tz)+px*cs(tz); py=qy2;
    return [px,py,pz]; });
  /* 앉히기 — 발자국 아래쪽 꼭짓점마다 그 자리 바닥(격자 쌍선형 F)보다 높이 뜨지 않게(묻히는 것은 된다) 가라앉히고,
     돌 가운데 밑이 그 자리 F ±0.1 m 가 아니거나 꼭짓점 자리가 벽 가까워 바닥을 믿을 수 없으면 버린다(null) */
  let wmin=1e9; for(const w of W) if(w[1]<wmin) wmin=w[1];
  let hmax=-1e9; for(const w of W) if(w[1]>hmax) hmax=w[1];
  let y0=1e9; const low=wmin+0.3*(hmax-wmin);
  for(const w of W){ if(w[1]>low) continue; let f;
    if(base!==undefined) f=base; else { const sm=cv10Samp(X.rec,x+w[0],z+w[2]); f=cvdBil(X,X.F,x+w[0],z+w[2]); if(sm.n<=0||Math.abs(sm.f-f)>0.05) return null; }
    y0=Math.min(y0,f-w[1]+0.02); }
  const fc=base!==undefined?base:cvdBil(X,X.F,x,z); if(Math.abs(y0+wmin-fc)>0.1) return null;
  const v0=A.p.length/3, P=CVD_PAL[X.kind]||CVD_PAL.talus; let ymx=-1e9, ymn=1e9; for(const w of W){ ymx=Math.max(ymx,y0+w[1]); ymn=Math.min(ymn,y0+w[1]); }
  for(const f of CVD_IF){ const a=W[f[0]], b=W[f[1]], c=W[f[2]];
    let nx=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
    const mx=(a[0]+b[0]+c[0])/3, my=(a[1]+b[1]+c[1])/3, mz=(a[2]+b[2]+c[2])/3, flip=(nx*mx+ny*my+nz*mz)<0;   // 안쪽을 보면 감김을 뒤집는다
    if(flip){ nx=-nx; ny=-ny; nz=-nz; }
    const sh=tone*(0.78+0.32*rnd())*(0.92+0.12*Math.max(0,ny)), pm=rnd()<0.12?0.5:0, o=A.p.length/3;
    for(const w of (flip?[a,c,b]:[a,b,c])){ A.p.push(x+w[0],y0+w[1],z+w[2]); A.n.push(nx,ny,nz);
      A.c.push((P.b[0]*(1-pm)+P.a[0]*pm)*sh,(P.b[1]*(1-pm)+P.a[1]*pm)*sh,(P.b[2]*(1-pm)+P.a[2]*pm)*sh); }
    A.i.push(o,o+1,o+2); A.tr++; }
  return {v0,v1:A.p.length/3,top:ymx,bot:ymn,botF:fc};
}
/* 고사리 한 포기 — 활처럼 휜 잎 여섯~여덟 장(양면 시트) */
function cvdFern(A,X,x,y,z,sc){
  const rnd=X.rnd, nf=6+((rnd()*3)|0), v0=A.p.length/3;
  for(let k=0;k<nf;k++){ const an=k/nf*6.2832+rnd()*0.5, ca=Math.cos(an), sa=Math.sin(an), L=(0.30+0.28*rnd())*sc, nodes=[], cols=[], g=0.75+0.5*rnd();
    for(let s=0;s<=4;s++){ const t=s/4, h=L*0.62*(1.35*t-1.05*t*t), w=L*0.16*Math.sin(3.1416*Math.min(1,t*0.92+0.04)), px=x+ca*L*t, pz=z+sa*L*t, py=y+0.03+h;
      nodes.push([[px-sa*w,py,pz+ca*w],[px+sa*w,py,pz-ca*w]]);
      cols.push([[0.10+0.20*t,0.27+0.30*t,0.07+0.08*t].map(v=>v*g),[0.10+0.20*t,0.27+0.30*t,0.07+0.08*t].map(v=>v*g)]); }
    cvdGrid(A,nodes,cols,[0,1,0]); }
  return {v0,v1:A.p.length/3};
}
/* 이끼 덩이 — 납작한 둔덕. 축 u 를 벽 법선으로 주면 벽에 붙는다 */
function cvdMoss(A,X,x,y,z,r,h,ux,uy,uz){
  const g=0.7+0.5*X.rnd(), cf=t=>[(0.16+0.1*t)*g,(0.34+0.14*t)*g,(0.08+0.05*t)*g];
  return cvdRev(A,x-ux*0.02,y-uy*0.02,z-uz*0.02,ux,uy,uz,h+0.02,t=>r*Math.sqrt(Math.max(0,1-t*t))*(1+0.18*Math.sin(t*9)),7,3,cf);
}

/* ── 한 굴의 놓기 바탕 ──────────────────────────────────────────────────────────────────────────────────── */
function* cvdCtx(rec){
  const c=rec.c, nx=rec.nx, nz=rec.nz, n=nx*nz, F=rec.F, C=rec.C, Hh=rec.Hh, O=rec.O, M=rec.M;
  const X={rec,c,kind:c.kind,nx,nz,S:rec.S,x0:rec.x0,z0:rec.z0,F,C,Hh,O,M,D:rec.D,seed:c.seed|0,rnd:mulberry32((c.seed^0xdec0)>>>0),
    prnd:mulberry32((c.seed^0x57a1c)>>>0), xtr:0, pcl:[], pcs:{up:{},dn:{},n:0,tri:0,gap0:-1e9,sftMax:0,dbg:CVD.dbg?[]:null},   // prnd — 모형 조각 고르기 · 돌림 · 흔들기만(X.rnd 차례를 안 건드린다) · xtr — 조각이 예전 원뿔보다 더 쓴 세모
    A:{rock:cvdAcc(),sheet:cvdAcc(),water:cvdAcc(),shr:cvdAcc()}, gw:[], gold:[], items:[], log:[], cnt:{}, picks:[], cols:[], big:[], tri:null};
  const E=X.E=new Uint8Array(n), blocked=new Uint8Array(n);
  for(let j=0;j<nz;j++){ if((j&7)===7&&cvdT()) yield; for(let i=0;i<nx;i++){ const q=j*nx+i; E[q]=C[q]-F[q]>0.3?1:0; blocked[q]=1-E[q]; } }
  const cells=[], ceil=X.ceil=new Uint8Array(n);
  for(let j=0;j<nz-1;j++){ if((j&7)===7&&cvdT()) yield; for(let i=0;i<nx-1;i++){ const q=j*nx+i;
    if(E[q]&&E[q+1]&&E[q+nx]&&E[q+nx+1]){ cells.push(q);
      if(!O[q]&&!O[q+1]&&!O[q+nx]&&!O[q+nx+1]&&Hh[q]-C[q]>=0.8&&Hh[q+1]-C[q+1]>=0.8&&Hh[q+nx]-C[q+nx]>=0.8&&Hh[q+nx+1]-C[q+nx+1]>=0.8) ceil[q]=1; } } }
  X.cells=cells; X.blocked=blocked;
  return X;
}
/* 칸 q 안의 (u,w) 점의 값들 — 바닥 f · 천장 c · 땅 h · 벽 거리 wd · 입구 거리 d · 바닥 기울기 sf · 천장 기울기 sc(셋째 인자 out) */
function cvdAt(X,q,u,w,o){
  const nx=X.nx, S=X.S, F=X.F, C=X.C;
  o.x=X.x0+((q%nx)+u)*S; o.z=X.z0+(((q/nx)|0)+w)*S;
  o.f=cvdLerp4(F,q,nx,u,w); o.c=cvdLerp4(C,q,nx,u,w); o.h=cvdLerp4(X.Hh,q,nx,u,w); o.wd=Math.min(X.wd[q],X.wd[q+1],X.wd[q+nx],X.wd[q+nx+1]);
  o.d=Math.min(cvdLerp4(X.D,q,nx,u,w),1e4);
  const fx=((F[q+1]-F[q])+(F[q+nx+1]-F[q+nx]))/(2*S), fz=((F[q+nx]-F[q])+(F[q+nx+1]-F[q+1]))/(2*S), cx=((C[q+1]-C[q])+(C[q+nx+1]-C[q+nx]))/(2*S), cz=((C[q+nx]-C[q])+(C[q+nx+1]-C[q+1]))/(2*S);
  o.fx=fx; o.fz=fz; o.sf=Math.hypot(fx,fz); o.cx=cx; o.cz=cz; o.sc=Math.hypot(cx,cz);
  return o;
}
const cvdCluster=(X,x,z,sc,k,a,b)=>0.12+0.88*cvdSS(a===undefined?0.30:a,b===undefined?0.65:b,cvdNoise(X,x,z,sc,k));
function cvdHash(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(36); }
function cvdPick(X,kind,x,y,z,ay,r,it,dy){                   // dy — 모형 조각의 밑동 맞추기로 옮긴 높이(겨눔점만 옮기고 열쇠는 옮기기 전 자리로 — 저장이 기억하는 번호가 그대로)                          // 딸 것 하나 — it: 이 장식의 정점 범위({acc,v0,v1})
  const fl=cv10Samp(X.rec,x,z).f; if(ay-fl>4.0) return false;     // 서서 닿지 않는 높이는 꼴로만(줍기 목록에 안 넣는다)
  /* 열쇠 = 굴 씨 + 종류 + 겨눌 점(1 cm 정수)의 짧은 해시 — 장식이 생기는 차례가 바뀌어도 따간 표가 다른 장식에 안 붙는다. 같은 굴 안에서 겹치면 번호를 덧붙인다 */
  const base='CV'+X.seed+'_'+kind+'_'+cvdHash(kind+'|'+Math.round(x*100)+'|'+Math.round(ay*100)+'|'+Math.round(z*100)); let key=base;
  if(!X.keys) X.keys=new Set(); for(let n=2;X.keys.has(key);n++) key=base+'.'+n; X.keys.add(key);
  dy=dy||0; const p={kind,x,y:y+dy,z,ay:ay+dy,key,r,tree:false}, item={pick:p,kind,key,acc:it.acc,v0:it.v0,v1:it.v1,vis:true,saved:null};
  p.cv=item; X.picks.push(p); X.items.push(item); if(it.pr) it.pr.picks.push(p); return true;   // it.pr — 모형 조각 기록(원뿔로 바뀌면 cvdPcCap 이 dy 를 되돌린다)
}
function cvdLog(X,t,x,z,y0,y1,r,ext,ref){ X.cnt[t]=(X.cnt[t]||0)+1; X.log.push({t,x,z,y0,y1,r,ext:!!ext,ref}); }
function cvdBlock(X,x,z,r,y0,y1,cx,cz){ const o={x:cx===undefined?x:cx,z:cz===undefined?z:cz,r,y0,y1,deco:1}; X.cols.push(o); X.big.push(cx===undefined?o:{x,z,r,y0,y1,deco:1}); return o; }   // cx,cz — 걷기 막이 가운데(기울어진 몸 축) · 띄우기(X.big — cvdFar)는 늘 밑동 자리로
const cvdBudget=(X,cap)=>X.A.rock.tr+X.A.sheet.tr+X.A.water.tr+X.A.shr.tr<(cap||CVD.maxTri);   // cap: 이 단계가 쓸 수 있는 세모 합(앞 단계가 뒤 단계 몫을 다 먹지 않게)

/* ── 종유석 · 빨대 · 석순 · 기둥 (석회암) ─────────────────────────────────────────────────────────────────── */
function* cvdKarstSpeleo(X){
  const rnd=X.rnd, A=X.A.rock, o={}, cells=X.cells, nx=X.nx, st=[];
  const bury=(r,s)=>0.04+Math.min(0.06,r*s);
  for(const q of cells){ if(cvdT()) yield; if(!X.ceil[q]||!cvdBudget(X,12000)) continue;                          // 종유석
    const u0=rnd(), w0=rnd(); cvdAt(X,q,u0,w0,o); const g=o.c-o.f;
    if(rnd()>0.075*cvdCluster(X,o.x,o.z,6,1)*(g>4.5?1.7:1)||o.sc>0.7||g<2.6) continue;
    const L=Math.min(2.0,0.2+1.8*Math.pow(rnd(),1.7))*(g>4.5?1.2:1), Lm=Math.min(L,2.0,g-2.2); if(Lm<0.2) continue;
    const r0=Math.min(0.22,Math.max(0.04,0.035+Lm*0.085*(0.6+0.8*rnd()))), tone=0.85+0.3*rnd(), ph=rnd()*6, cf=cvdCol(X,tone,0.7,ph), y0=o.c+bury(r0,o.sc), len=Lm+(y0-o.c);
    const lx=(rnd()-0.5)*0.1*Lm, lz=(rnd()-0.5)*0.1*Lm, x=o.x, z=o.z;
    const cone=a=>cvdRev(a,x,y0,z,0,-1,0,len,t=>r0*Math.pow(1-t,1.25)*(1+0.1*Math.sin(t*11+ph))+0,8,6,cf,t=>[lx*t*t,0,lz*t*t]), it=cvdPcPut(X,A,'c',true,x,y0,z,len,r0*1.05,88,56+70*Lm,{cf,lx,lz,cone})||cone(A); it.acc=A;
    const tipY=o.c-Lm; cvdLog(X,'stalactite',x,z,y0,tipY,r0); st.push({x,z,L:Lm,r:r0,f:o.f,c:o.c,g,wd:o.wd,d:o.d,pc:it.pc});
    if(Lm<=0.55&&r0<=0.1&&rnd()<0.4) cvdPick(X,'cvcalcite',x,tipY,z,tipY+0.04,0.18,it,it.dy); }
  let nstraw=0;
  for(const q of cells){ if(cvdT()) yield; if(!X.ceil[q]||nstraw>=230||!cvdBudget(X,15500)) continue;             // 빨대 종유석 — 평평한 천장에 빽빽이
    cvdAt(X,q,0.5,0.5,o); if(o.sc>0.4||o.c-o.f<2.6) continue;
    if(rnd()>0.22*cvdCluster(X,o.x,o.z,3,2)) continue;
    const sg0=A.p.length/3; let sp=null;
    for(let k=0,m=1+((rnd()*3)|0);k<m;k++){ cvdAt(X,q,rnd(),rnd(),o); const Lm=Math.min(0.1+0.7*Math.pow(rnd(),1.4),o.c-o.f-2.2); if(Lm<0.1) continue;
      const r0=0.006+0.006*rnd(), cf=cvdCol(X,1.05+0.1*rnd(),0.2,rnd()*6), y0=o.c+0.04+Math.min(0.05,r0*o.sc);
      cvdRev(A,o.x,y0,o.z,0,-1,0,Lm+0.04+(y0-o.c-0.04),t=>r0*(1-0.55*t)*(t>=0.999?0:1),5,2,cf); nstraw++; cvdLog(X,'straw',o.x,o.z,y0,o.c-Lm,r0); if(!sp) sp=[o.x,o.z,o.c-Lm]; }
    if(sp) cvdPick(X,'cvstraw',sp[0],sp[2],sp[1],sp[2]+0.05,0.15,{acc:A,v0:sg0,v1:A.p.length/3}); }
  /* 석순 — 큰 종유석 밑에 60% · 가끔 혼자 */
  const mk=(x,z,hMax,wantBig,pair)=>{ const s=cv10Samp(X.rec,x,z); if(s.n<=0||s.open) return; const f=s.f, c=s.c, sl=0;
    let h=0.2+2.3*Math.pow(rnd(),1.8); h=Math.min(h,hMax); if(h<0.2) return;
    let r=Math.min(0.45,Math.max(0.1,0.09+h*0.12*(0.6+0.8*rnd()))), wd=X.wd[Math.round((x-X.x0)/X.S)+Math.round((z-X.z0)/X.S)*nx];
    const big=r>0.25;
    if(big&&!(wd>=1.4+r&&s.d>4&&cvdFar(X.big,x,z,2.8))) r=0.24;
    const tone=0.85+0.3*rnd(), ph=rnd()*6, cf=cvdCol(X,tone,0.6,ph), by=0.03+Math.min(0.07,r*0.3), r0=r;
    const cone=a=>cvdRev(a,x,f-by,z,0,1,0,h+by,t=>r0*Math.sqrt(Math.max(0,1-Math.pow(t,2.4)))*(1+0.35*Math.pow(1-t,4)),8,6,cf), it=cvdPcPut(X,A,'g',false,x,f-by,z,h+by,r0*1.25,88,56+60*h,{cf,pair,big:r0>0.25,cone,rmax:r0>0.25?0:r0*1.35,blk:r0>0.25?{f}:null})||cone(A), dy=it.dy||0; it.acc=A; cvdLog(X,'stalagmite',x,z,f-by,f+h,r);   // 짝 — 종유석 밑의 석순은 그 조각을 위아래로 뒤집어(같은 돌림)
    if(r>0.25){ const b=it.blk, col=b?cvdBlock(X,x,z,b.r,f+dy,f+h+dy,b.x,b.z):cvdBlock(X,x,z,r*1.1,f+dy,f+h+dy); if(it.pr) it.pr.blk=[col,x,z,r*1.1,f,f+h]; } else if(h<=1.0&&rnd()<0.35) cvdPick(X,'cvcalcite',x,f,z,f+h*0.6,Math.max(0.2,r),it,dy); };
  for(const s of st){ if(cvdT()) yield; if(!cvdBudget(X,19000)) break; if(s.L>0.4&&rnd()<0.6) mk(s.x+(rnd()-0.5)*0.1,s.z+(rnd()-0.5)*0.1,s.g-s.L-0.35,false,s.pc); }
  for(const q of cells){ if(cvdT()) yield; if(!cvdBudget(X,19500)) break; if(rnd()>0.012) continue; cvdAt(X,q,rnd(),rnd(),o); if(o.c-o.f<2.6||o.sf>0.5) continue; mk(o.x,o.z,1.6,false); }
  /* 기둥 — 낮은 방 자리(천장−바닥 < 3.2). 낮은 자리가 없으면 가장 낮은 두어 곳 */
  const cand=[], colMk=(x,z,f,c,wd)=>{ const rmin=0.14+0.16*rnd(), rmax=rmin*(1.5+0.7*rnd()), ph=rnd()*6, cf=cvdCol(X,0.9+0.2*rnd(),0.8,ph), h=c-f+0.2;
      const it=cvdRev(A,x,f-0.1,z,0,1,0,h,t=>rmin+(rmax-rmin)*Math.pow(Math.abs(2*t-1),1.7),10,8,cf); it.acc=A;
      cvdLog(X,'column',x,z,f-0.1,c+0.1,rmax); cvdBlock(X,x,z,(rmin+rmax)*0.5*1.15,f,c); };
  for(const q of cells){ if(cvdT()) yield; if(!X.ceil[q]) continue; cvdAt(X,q,0.5,0.5,o); const g=o.c-o.f; if(o.wd<1.6||o.d<4||g>4.4||o.sf>0.35||o.sc>0.35) continue;
    if(g<3.2){ if(rnd()<0.05*cvdCluster(X,o.x,o.z,8,3)&&cvdFar(X.big,o.x,o.z,3.2)){ colMk(o.x,o.z,o.f,o.c,o.wd); } } else cand.push({q,g,x:o.x,z:o.z,f:o.f,c:o.c,wd:o.wd}); }
  if((X.cnt.column||0)<2){ cand.sort((a,b)=>a.g-b.g||a.q-b.q); for(const k of cand){ if((X.cnt.column||0)>=2) break; if(cvdFar(X.big,k.x,k.z,4)) colMk(k.x,k.z,k.f,k.c,k.wd); } }
}

/* ── 커튼 · 유석 둔덕 · 휴석 웅덩이 (석회암) ─────────────────────────────────────────────────────────────── */
function* cvdKarstFlow(X){
  const rnd=X.rnd, o={}, cells=X.cells, A=X.A.rock, B=X.A.sheet, cur=[], nx=X.nx;
  for(const q of cells){ if(cvdT()) yield; if(!X.ceil[q]||cur.length>=14||!cvdBudget(X,24000)) continue;           // 커튼 — 비탈진 천장이 벽에 닿는 데
    cvdAt(X,q,0.5,0.5,o); if(o.sc<0.12||o.sc>0.9||o.wd>1.3||o.c-o.f<2.9||rnd()>0.07||!cvdFar(cur,o.x,o.z,2.2)) continue;
    const gx=o.cx/o.sc, gz=o.cz/o.sc, tx=-gz, tz=gx, W=0.5+1.5*rnd(), nn=Math.min(9,Math.ceil(W/0.25)+1), H=Math.min(1.4,0.4+rnd(),o.c-o.f-2.1), ph=rnd()*6; if(H<0.3) continue;
    const nodes=[], cols=[], P=CVD_PAL.karst; cur.push({x:o.x,z:o.z});
    for(let k=0;k<nn;k++){ const s=(k/(nn-1)-0.5)*W, px=o.x+tx*s, pz=o.z+tz*s, sm=cv10Samp(X.rec,px,pz), cc=sm.n>0?sm.c:o.c, e=Math.pow(Math.sin(3.1416*(0.08+0.84*k/(nn-1))),0.6);
      const hk=Math.min(sm.n>0?sm.c-sm.f-2.1:H,H*(0.5+0.5*Math.sin(k*1.4+ph))*e), wob=0.07*Math.sin(k*1.7+ph), col=[];
      const row=[], rc=[];
      for(let r=0;r<3;r++){ const v=r/2; row.push([px+gx*wob*(0.3+v)+gx*0.0,cc+0.06-hk*v,pz+gz*wob*(0.3+v)]); const m=Math.max(0,Math.sin(v*5+ph+k*0.3)-0.2)*0.8; rc.push([(P.b[0]*(1-m)+P.a[0]*m)*(0.95-0.1*v),(P.b[1]*(1-m)+P.a[1]*m)*(0.95-0.1*v),(P.b[2]*(1-m)+P.a[2]*m)*(0.95-0.1*v)]); }
      nodes.push(row); cols.push(rc); }
    const cit=cvdGrid(B,nodes,cols,[gx,0,gz]); cit.acc=B; cvdLog(X,'curtain',o.x,o.z,o.c+0.06,o.c-H,W/2); cvdPick(X,'cvcurtain',o.x,o.c-H*0.7,o.z,o.c-H*0.7,Math.max(0.3,W/2),cit); }
  for(const q of cells){ if(cvdT()) yield; if(!cvdBudget(X,24000)) break;                                          // 유석 둔덕 — 벽 밑 바닥
    cvdAt(X,q,0.5,0.5,o); if(o.wd<0.1||o.wd>1.0||o.sf>0.45||rnd()>0.05) continue;
    const u=rnd(), w=rnd(); cvdAt(X,q,u,w,o); const r=0.25+0.5*rnd(), tiers=1+((rnd()*2)|0), ph=rnd()*6; let yb=o.f-0.04-Math.min(0.1,r*o.sf), first=null, last=null;
    for(let k=0;k<tiers;k++){ const rk=r*(1-0.35*k), hk=0.08+0.18*rnd(), cf=cvdCol(X,1.0+0.1*k,0.9,ph+k*2);
      const it=cvdRev(A,o.x+(rnd()-0.5)*0.1*k,yb,o.z+(rnd()-0.5)*0.1*k,0,1,0,hk+0.04,t=>rk*Math.sqrt(Math.max(0,1-t*t))*(1+0.07*Math.sin(t*14)),9,3,cf);
      if(!first) first=it; last=it; yb+=hk*0.75; }
    const it={acc:A,v0:first.v0,v1:last.v1}; cvdLog(X,'mound',o.x,o.z,o.f-0.04,yb+0.1,r);
    if(r<=0.5&&rnd()<0.35) cvdPick(X,'cvcalcite',o.x,o.f,o.z,o.f+0.12,Math.max(0.25,r),it); }
  /* 휴석 웅덩이 — 5~20% 비탈 바닥에 가로로 굽은 낮은 둑이 계단처럼 · 둑 안에 물 · 동굴 진주 */
  const pools=[]; let np=0;
  for(const q of cells){ if(cvdT()) yield; if(np>=4||!cvdBudget(X,26500)) break;
    cvdAt(X,q,0.5,0.5,o); if(o.sf<0.05||o.sf>0.2||o.wd<1.1||o.c-o.f<2.6||rnd()>0.012||!cvdFar(pools,o.x,o.z,7)) continue;
    pools.push({x:o.x,z:o.z}); let x=o.x, z=o.z, made=0; const ph=rnd()*6;
    for(let d=0;d<4;d++){ const s=cv10Samp(X.rec,x,z); if(s.n<=0) break; const h=0.5, g1=cv10Samp(X.rec,x+h,z).f-cv10Samp(X.rec,x-h,z).f, g2=cv10Samp(X.rec,x,z+h).f-cv10Samp(X.rec,x,z-h).f, gl=Math.hypot(g1,g2)/(2*h);
      if(gl<0.04||gl>0.26) break; const dx=-g1/(2*h)/gl, dz=-g2/(2*h)/gl, tx=-dz, tz=dx;                   // 내리막 방향 d · 등고선 방향 t
      const hw=0.6+0.5*rnd(), hd=0.05+0.1*rnd(), NA=9, bow=0.28*hw, arc=[], fs=[]; let ok=true;
      for(let a=0;a<NA;a++){ const sx=(a/(NA-1)*2-1)*hw, ex=x+tx*sx+dx*bow*(1-(sx/hw)*(sx/hw)), ez=z+tz*sx+dz*bow*(1-(sx/hw)*(sx/hw)), sm=cv10Samp(X.rec,ex,ez);
        const wdv=X.wd[Math.round((ex-X.x0)/X.S)+Math.round((ez-X.z0)/X.S)*nx]; if(sm.n<=0||wdv<0.35){ ok=false; break; } arc.push([ex,ez]); fs.push(sm.f); }
      if(!ok) break;
      const nodes=[], cols=[], nr=[], P=CVD_PAL.karst;                                                       // 둑의 단면: 바깥 밑 · 바깥 마루 · 안 마루 · 안 밑
      for(let a=0;a<NA;a++){ const [ex,ez]=arc[a], f=fs[a]; const row=[[ex+dx*0.09,f-0.03,ez+dz*0.09],[ex+dx*0.03,f+hd,ez+dz*0.03],[ex-dx*0.03,f+hd,ez-dz*0.03],[ex-dx*0.09,f-0.03,ez-dz*0.09]];
        nodes.push(row); const cc=[P.b[0]*0.95,P.b[1]*0.92,P.b[2]*0.88]; cols.push([cc,cc,cc,cc]); nr.push([[dx,0.3,dz],[0,1,0],[0,1,0],[-dx,0.3,-dz]]); }
      cvdGrid(B,nodes,cols,nr);
      const yw=Math.min(...fs)+hd*0.8, W=X.A.water, wn=[], wc=[]; let any=false;                              // 물 판: 둑 안쪽에서 올라가는 바닥이 물높이에 닿을 때까지
      for(let a=0;a<NA;a++){ const [ex,ez]=arc[a]; let L=0.15; for(let l=0.15;l<3;l+=0.1){ const s2=cv10Samp(X.rec,ex-dx*l,ez-dz*l); if(s2.n<=0){ break; } L=l; if(s2.f>=yw-0.005) break; }
        wn.push([[ex-dx*0.02,yw,ez-dz*0.02],[ex-dx*L,yw,ez-dz*L]]); wc.push([[1,1,1],[1,1,1]]); if(L>0.2) any=true; }
      if(any) cvdGrid(W,wn,wc,[0,1,0]);
      const pg0=A.p.length/3; let pp=null;
      for(let k=0,m=2+((rnd()*3)|0);k<m;k++){ const a=1+((rnd()*(NA-2))|0), L=Math.hypot(wn[a][1][0]-wn[a][0][0],wn[a][1][2]-wn[a][0][2])*(0.25+0.5*rnd()), px=arc[a][0]-dx*L, pz=arc[a][1]-dz*L, sm=cv10Samp(X.rec,px,pz), pr=0.02+0.02*rnd();
        if(sm.n>0&&sm.f<yw-0.02){ cvdRev(A,px,sm.f+0.005,pz,0,1,0,pr*2,t=>pr*Math.sin(3.1416*Math.min(1,t+0.001)),6,3,()=>[0.93,0.91,0.85]); if(!pp) pp=[px,sm.f,pz]; } }
      if(pp) cvdPick(X,'cvpearl',pp[0],pp[1],pp[2],pp[1]+0.03,0.2,{acc:A,v0:pg0,v1:A.p.length/3});
      cvdLog(X,'dam',x,z,fs[4],fs[4]+hd,hw); made++; np++;
      x+=dx*(0.9+0.5*rnd()); z+=dz*(0.9+0.5*rnd()); }
    if(made) X.cnt.pool=(X.cnt.pool||0)+1; }
}

/* ── 빛나는 것 — 반딧불이 유충 점(천장) · 빛나는 버섯(벽 밑) ────────────────────────────────────────────────── */
function* cvdGlow(X,dWorm,pWorm,dShr,pShr,capW){
  const rnd=X.rnd, o={}, cells=X.cells, Bs=X.A.shr, shr=[];
  for(const q of cells){ if(cvdT()) yield; if(X.gw.length/6>=capW) break; if(!X.ceil[q]) continue;
    cvdAt(X,q,0.5,0.5,o); if(o.d<dWorm||o.c-o.f<2.2) continue;
    if(rnd()>pWorm*cvdSS(0.42,0.72,cvdNoise(X,o.x,o.z,5,3))) continue;
    for(let k=0,m=1+((rnd()*3)|0);k<m;k++){ cvdAt(X,q,rnd(),rnd(),o); X.gw.push(o.x,o.c-0.05,o.z); X.gw.push(0.07+0.07*rnd(),rnd(),0.6+0.4*rnd()); cvdLog(X,'glowworm',o.x,o.z,o.c-0.05,o.c-0.05,0); } }
  for(const q of cells){ if(cvdT()) yield; if(!cvdBudget(X,28000)) break;
    cvdAt(X,q,0.5,0.5,o); if(o.wd<0.1||o.wd>0.9||o.d<dShr||o.sf>0.5||rnd()>pShr||!cvdFar(shr,o.x,o.z,2.5)) continue;
    shr.push({x:o.x,z:o.z}); const v0=Bs.p.length/3, n=2+((rnd()*3)|0); let ymin=1e9;
    for(let k=0;k<n;k++){ cvdAt(X,q,rnd(),rnd(),o); const r=0.04+0.06*rnd(), h=0.06+0.14*rnd(), lean=(rnd()-0.5)*0.05, y=o.f-0.02, g=0.8+0.3*rnd();
      cvdRev(Bs,o.x,y,o.z,lean,1,0,h+0.02,t=>r*0.3,6,1,()=>[0.10,0.34,0.29]);
      cvdRev(Bs,o.x+lean*h,y+h-0.1*r,o.z,0,1,0,r*0.8,t=>r*Math.sqrt(Math.max(0,1-t*t)),6,3,t=>[(0.22+0.34*t)*g,(0.86+0.14*t)*g,(0.68+0.22*t)*g]); ymin=Math.min(ymin,y); cvdLog(X,'mushroom',o.x,o.z,y,y+h+r*0.7,r); }
    cvdPick(X,'cvmush',o.x,o.f,o.z,o.f+0.08,0.12,{acc:Bs,v0,v1:Bs.p.length/3}); }
}

/* ── 용암굴 — 고드름 · 작은 석순 · 뿌리 ────────────────────────────────────────────────────────────────────── */
function* cvdLavaTeeth(X){
  const rnd=X.rnd, o={}, A=X.A.rock, cells=X.cells; let nt=0;
  for(const q of cells){ if(cvdT()) yield; if(nt>=1300||!cvdBudget(X)) break; if(!X.ceil[q]) continue;                  // 용암 고드름 — 짧은 이빨 꼴, 천장에 빽빽이
    cvdAt(X,q,0.5,0.5,o); if(o.sc>0.8||rnd()>0.24*cvdCluster(X,o.x,o.z,4,4)) continue;
    for(let k=0;k<2;k++){ cvdAt(X,q,rnd(),rnd(),o); const L=0.03+0.12*Math.pow(rnd(),1.3), r0=0.012+0.018*rnd(), y0=o.c+0.03, t=0.7+0.5*rnd();
      const ox=o.x, oz=o.z, cone=a=>cvdRev(a,ox,y0,oz,0,-1,0,L+0.03,s=>r0*(1-s),5,1,()=>[0.30*t,0.21*t,0.17*t]); cvdPcPut(X,A,'c',true,ox,y0,oz,L+0.03,r0,5,L>0.12?20:12,{col:[0.30*t,0.21*t,0.17*t],cone})||cone(A); nt++; cvdLog(X,'tooth',o.x,o.z,y0,o.c-L,r0); } }
  let ns=0;
  for(const q of cells){ if(cvdT()) yield; if(ns>=70||!cvdBudget(X)) break;                                          // 작은 용암 석순
    cvdAt(X,q,rnd(),rnd(),o); if(o.sf>0.4||rnd()>0.012) continue;
    const h=0.05+0.15*rnd(), r0=0.02+0.04*rnd(), by=0.03, t=0.8+0.4*rnd();
    const ox=o.x, oy=o.f-by, oz=o.z, cone=a=>cvdRev(a,ox,oy,oz,0,1,0,h+by,s=>r0*Math.sqrt(Math.max(0,1-Math.pow(s,2))),6,2,()=>[0.20*t,0.15*t,0.13*t]); cvdPcPut(X,A,'g',false,ox,oy,oz,h+by,r0,18,20,{col:[0.20*t,0.15*t,0.13*t],cone})||cone(A); ns++; cvdLog(X,'lavamite',o.x,o.z,o.f-by,o.f+h,r0); }
}
function* cvdRoots(X,pr,cap){                                    // 지붕이 얇은 데(땅−천장<4)에 천장을 뚫고 늘어진 나무뿌리
  const rnd=X.rnd, o={}, A=X.A.rock; let nr=0;
  for(const q of X.cells){ if(cvdT()) yield; if(nr>=cap||!cvdBudget(X)) break; if(!X.ceil[q]) continue;
    cvdAt(X,q,0.5,0.5,o); if(o.h-o.c>=4||o.h-o.c<0.8||o.c-o.f<2.9||rnd()>pr) continue;
    const nS=2+((rnd()*3)|0), Lmax=Math.min(3,o.c-o.f-1.9); if(Lmax<0.5) continue; let v0=1e9, v1=0, cx=0, cz=0, ytip=1e9;
    cvdAt(X,q,rnd(),rnd(),o); cx=o.x; cz=o.z;
    for(let k=0;k<nS;k++){ const L=0.5+(Lmax-0.5)*Math.pow(rnd(),0.8), r0=0.012+0.028*rnd(), x=cx+(rnd()-0.5)*0.25, z=cz+(rnd()-0.5)*0.25, sm=cv10Samp(X.rec,x,z), cc=sm.n>0?sm.c:o.c, ph=rnd()*6, wob=0.06+0.1*rnd(), tl=(rnd()-0.5)*0.3, tm=(rnd()-0.5)*0.3, g=0.8+0.4*rnd();
      const it=cvdRev(A,x,cc+0.08,z,tl,-1,tm,L+0.08,t=>r0*(1-0.8*t)*(t>=0.999?0:1),4,5,()=>[0.34*g,0.24*g,0.14*g],t=>[wob*Math.sin(t*5+ph)*t,0,wob*Math.cos(t*4+ph)*t]);
      v0=Math.min(v0,it.v0); v1=Math.max(v1,it.v1); ytip=Math.min(ytip,cc-L); cvdLog(X,'root',x,z,cc+0.08,cc-L,r0); }
    nr++; cvdPick(X,'cvroot',cx,ytip,cz,ytip+0.2,0.3,{acc:A,v0,v1}); }
}

/* ── 모난 돌 더미(용암 채광창 밑 · 바위틈 · 바위그늘 판돌) ────────────────────────────────────────────────── */
function* cvdRubble(X,sel,p,Rmax,cap,tone){                       // sel(o,q) 가 참인 칸에 p 확률로 모난 돌
  const rnd=X.rnd, o={}, A=X.A.rock; let n=0;
  for(const q of X.cells){ if(cvdT()) yield; if(n>=cap||!cvdBudget(X)) break;
    cvdAt(X,q,rnd(),rnd(),o); if(!sel(o,q)||rnd()>p) continue;
    let R=0.12+(Rmax-0.12)*Math.pow(rnd(),2.2); const big=R>=0.3;
    if(big&&!(o.wd>=R+0.9&&o.d>3&&cvdFar(X.big,o.x,o.z,R+1.0))) R=0.14+0.14*rnd();
    if(o.sf>0.7) continue;
    const it=cvdRock(A,X,o.x,o.z,R,0.55+0.4*rnd(),tone*(0.85+0.3*rnd())); if(!it) continue; it.acc=A; n++; cvdLog(X,'rock',o.x,o.z,it.bot,it.top,R,false,it.botF);
    if(R>=0.3) cvdBlock(X,o.x,o.z,R*0.85,o.f,it.top); else if(rnd()<0.3) cvdPick(X,'cvrubble',o.x,o.f,o.z,o.f+R*0.6,Math.max(0.2,R),it); }
}
function* cvdSlabs(X){                                             // 바위그늘 — 앞쪽에 떨어진 판돌(몸을 막는다) 몇 장 + 잔돌
  const rnd=X.rnd, o={}, A=X.A.sheet, sl=[];
  for(const q of X.cells){ if(cvdT()) yield; if(sl.length>=6) break;
    cvdAt(X,q,0.5,0.5,o); if(o.d>14||o.wd<1.8||o.sf>0.15||o.d<1.5||rnd()>0.02||!cvdFar(sl,o.x,o.z,3.2)) continue;
    const w=0.9+1.1*rnd(), dp=0.5+0.7*rnd(), t=0.15+0.25*rnd(), yaw=rnd()*3.1416, ca=Math.cos(yaw), sa=Math.sin(yaw), tilt=(rnd()-0.5)*0.3, cb=0.8+0.3*rnd(), P=CVD_PAL.shelter;
    const pts=[], hx=w/2, hz=dp/2; for(const dy of [0,t]) for(const sx of [-1,1]) for(const sz of [-1,1]){ const lx=sx*hx, lz=sz*hz; pts.push([o.x+lx*ca-lz*sa,o.f+dy+lx*tilt+0.02*(sz),o.z+lx*sa+lz*ca]); }
    let ymin=1e9; for(const p of pts) ymin=Math.min(ymin,p[1]-cv10Samp(X.rec,p[0],p[2]).f); const sh=-0.03-ymin; for(const p of pts) p[1]+=sh;
    const v0=A.p.length/3, faces=[[0,1,3,2,[0,-1,0]],[4,6,7,5,[0,1,0]],[0,4,5,1,[-1,0,0]],[2,3,7,6,[1,0,0]],[0,2,6,4,[0,0,-1]],[1,5,7,3,[0,0,1]]];   // 아래 · 위 · 옆
    for(const f of faces){ const n=f[4], nxw=n[0]*ca-n[2]*sa, nzw=n[0]*sa+n[2]*ca, o0=A.p.length/3, br=cb*(0.85+0.2*rnd())*(n[1]>0?1.1:0.9);
      for(let k=0;k<4;k++){ const p=pts[f[k]]; A.p.push(p[0],p[1],p[2]); A.n.push(nxw,n[1],nzw); A.c.push(P.b[0]*br,P.b[1]*br,P.b[2]*br); } A.i.push(o0,o0+1,o0+2, o0,o0+2,o0+3); A.tr+=2; }
    sl.push({x:o.x,z:o.z}); cvdLog(X,'slab',o.x,o.z,o.f+sh,o.f+sh+t,Math.max(hx,hz)); cvdBlock(X,o.x,o.z,Math.max(hx,hz)*0.85,o.f,o.f+t+0.2); }
}

/* ── 껍데기 세모에서 벽 자리 뽑기 — 광물 딱지 · 소금꽃 · 벽 이끼 · 금빛 점 ───────────────────────────────────── */
function* cvdTris(X){                                             // 껍데기 세모에서 벽 세모를 가려 둔다(덩이마다 쉰다)
  const g=X.rec.mesh.geometry, Pp=g.attributes.position.array, Nn=g.attributes.normal.array, I=g.index.array, wall=[], cum=[]; let tot=0;
  for(let t=0;t<I.length;t+=3){ if((t%1500)===0&&t&&cvdT()) yield;
    const a=I[t]*3, b=I[t+1]*3, c=I[t+2]*3, ny=(Nn[a+1]+Nn[b+1]+Nn[c+1])/3; if(Math.abs(ny)>0.6) continue;
    const ux=Pp[b]-Pp[a], uy=Pp[b+1]-Pp[a+1], uz=Pp[b+2]-Pp[a+2], vx=Pp[c]-Pp[a], vy=Pp[c+1]-Pp[a+1], vz=Pp[c+2]-Pp[a+2], ar=0.5*Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx);
    tot+=ar; wall.push(t); cum.push(tot); }
  /* 법선이 굴 안쪽을 보는지(부호) — 벽 세모 몇십 개의 안쪽 0.3 m 가 빈 데인지 투표 */
  let vote=0; for(let k=0;k<Math.min(60,wall.length);k++){ const t=wall[(k*wall.length/60)|0], a=I[t]*3, mx=Pp[a], my=Pp[a+1], mz=Pp[a+2], nx=Nn[a], nz=Nn[a+2], s1=cv10Samp(X.rec,mx+nx*0.3,mz+nz*0.3), s2=cv10Samp(X.rec,mx-nx*0.3,mz-nz*0.3);
    const in1=s1.n>0&&my>s1.f&&my<s1.c, in2=s2.n>0&&my>s2.f&&my<s2.c; vote+=(in1?1:0)-(in2?1:0); }
  X.tri={P:Pp,N:Nn,I,wall,cum,tot,sign:vote>=0?1:-1};
}
function cvdWallPt(X,o){                                          // 벽 세모 하나의 무작위 점 → o.{x,y,z,nx,ny,nz} (굴 안쪽 법선)
  const T=X.tri; if(!T||!T.wall.length) return false; const rnd=X.rnd, r=rnd()*T.tot; let lo=0, hi=T.cum.length-1; while(lo<hi){ const m=(lo+hi)>>1; if(T.cum[m]<r) lo=m+1; else hi=m; }
  const t=T.wall[lo], a=T.I[t]*3, b=T.I[t+1]*3, c=T.I[t+2]*3; let u=rnd(), w=rnd(); if(u+w>1){ u=1-u; w=1-w; } const q=1-u-w, P=T.P, N=T.N;
  let nx=N[a]*q+N[b]*u+N[c]*w, ny=N[a+1]*q+N[b+1]*u+N[c+1]*w, nz=N[a+2]*q+N[b+2]*u+N[c+2]*w; const nl=Math.hypot(nx,ny,nz)||1; nx*=T.sign/nl; ny*=T.sign/nl; nz*=T.sign/nl;
  o.x=P[a]*q+P[b]*u+P[c]*w; o.y=P[a+1]*q+P[b+1]*u+P[c+1]*w; o.z=P[a+2]*q+P[b+2]*u+P[c+2]*w; o.nx=nx; o.ny=ny; o.nz=nz; return true;
}
function cvdDisc(A,x,y,z,nx,ny,nz,r,col,ox,oy){                         // 벽에 붙은 여섯 모 납작한 딱지
  const l=Math.hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l; let ex,ey,ez; if(Math.abs(ny)<0.9){ ex=-nz; ey=0; ez=nx; } else { ex=0; ey=nz; ez=-ny; } const el=Math.hypot(ex,ey,ez)||1; ex/=el; ey/=el; ez/=el;
  const fx=ny*ez-nz*ey, fy=nz*ex-nx*ez, fz=nx*ey-ny*ex, o=A.p.length/3; x+=ex*ox+fx*oy; y+=ey*ox+fy*oy; z+=ez*ox+fz*oy;
  A.p.push(x+nx*0.012,y+ny*0.012,z+nz*0.012); A.n.push(nx,ny,nz); A.c.push(col[0],col[1],col[2]);
  for(let j=0;j<6;j++){ const an=j/6*6.2832, ca=Math.cos(an)*r*(0.8+0.4*((j*7)%3)/2), sa=Math.sin(an)*r*(0.8+0.4*((j*5)%3)/2); A.p.push(x+ex*ca+fx*sa,y+ey*ca+fy*sa,z+ez*ca+fz*sa); A.n.push(nx,ny,nz); A.c.push(col[0]*0.9,col[1]*0.9,col[2]*0.9); }
  for(let j=0;j<6;j++){ A.i.push(o,o+1+j,o+1+(j+1)%6); A.tr++; }
}
function* cvdWallDecals(X,kind,n){                                 // 'flake' 용암 광물 딱지 · 'salt' 소금꽃 · 'gold' 금빛 점
  const rnd=X.rnd, o={}, A=X.A.rock, tries=n*6; let made=0;
  for(let k=0;k<tries&&made<n&&cvdBudget(X);k++){ if(cvdT()) yield; if(!cvdWallPt(X,o)) return; const s=cv10Samp(X.rec,o.x+o.nx*0.1,o.z+o.nz*0.1); if(s.n<=0||o.y<s.f+0.2||o.y>s.c-0.1) continue;
    if(cvdNoise(X,o.x,o.z,3,5)<0.45) continue;                    // 얼룩져 모여 있다
    if(kind==='gold'){ X.gold.push(o.x+o.nx*0.02,o.y+o.ny*0.02,o.z+o.nz*0.02); X.cnt.gold=(X.cnt.gold||0)+1; made++; continue; }
    const dg0=A.p.length/3;
    for(let m=0,mm=3+((rnd()*4)|0);m<mm;m++){ const ox=(rnd()-0.5)*0.35, oy=(rnd()-0.5)*0.35, r=0.03+0.07*rnd();
      const col=kind==='salt'?[0.93,0.92,0.88]:(rnd()<0.5?[0.88,0.86,0.78]:[0.86,0.74,0.26]);
      cvdDisc(A,o.x,o.y,o.z,o.nx,o.ny,o.nz,r,col,ox,oy); }
    made++; cvdLog(X,kind==='salt'?'salt':'flake',o.x+o.nx*0.15,o.z+o.nz*0.15,o.y,o.y,0.1); cvdPick(X,kind==='salt'?'cvsalt':'cvflake',o.x,o.y,o.z,o.y,0.3,{acc:A,v0:dg0,v1:A.p.length/3}); }
}
function* cvdWallMoss(X,dMax,n){                                   // 입구 쪽 벽 이끼(어스름이 드는 데)
  const rnd=X.rnd, o={}, B=X.A.sheet; let made=0;
  for(let k=0;k<n*8&&made<n&&cvdBudget(X);k++){ if(cvdT()) yield; if(!cvdWallPt(X,o)) return; const s=cv10Samp(X.rec,o.x+o.nx*0.1,o.z+o.nz*0.1); if(s.n<=0||s.d>dMax||o.y<s.f+0.1||o.y>s.c-0.05) continue;
    if(rnd()>0.9*cvdSS(0,dMax,dMax-s.d)||cvdNoise(X,o.x,o.z,3,6)<0.4) continue;
    const mi=cvdMoss(B,X,o.x,o.y,o.z,0.15+0.3*rnd(),0.03+0.05*rnd(),o.nx,o.ny,o.nz); mi.acc=B; made++; cvdLog(X,'wallmoss',o.x+o.nx*0.15,o.z+o.nz*0.15,o.y,o.y,0.2); cvdPick(X,'cvmoss',o.x,o.y,o.z,o.y,0.3,mi); }
}

/* ── 입구 — 이마의 덩굴 · 입구 둘레 땅의 고사리 · 이끼 · 너덜 · 굴 안 빛 드는 데 고사리 · 이끼 ─────────────────── */
function* cvdEntrance(X){
  const rnd=X.rnd, o={}, B=X.A.sheet, A=X.A.rock, nx=X.nx, nz=X.nz, E=X.E, O=X.O, S=X.S;
  /* 이마(열린 데와 닫힌 데의 경계)의 늘어진 덩굴 — 닫힌 쪽 천장 칸에서 */
  let nv=0;
  for(let j=1;j<nz-1&&nv<28;j++) for(let i=1;i<nx-1&&nv<28;i++){ if(cvdT()) yield; const q=j*nx+i;
    if(!E[q]||O[q]||X.Hh[q]-X.C[q]<0.8||!(E[q+1]&&O[q+1]||E[q-1]&&O[q-1]||E[q+nx]&&O[q+nx]||E[q-nx]&&O[q-nx])||rnd()>0.4||!cvdBudget(X)) continue;
    const x=X.x0+i*S+(rnd()-0.5)*0.3, z=X.z0+j*S+(rnd()-0.5)*0.3, cq=Math.floor((z-X.z0)/S)*nx+Math.floor((x-X.x0)/S); if(!X.ceil[cq]) continue;   // 둘레 네 기둥이 다 빈 데이고 열린 데 아닌 자리만(열린 기둥의 C 는 가짜다)
    const Lm=Math.min(2.5,cvdBil(X,X.C,x,z)-cvdBil(X,X.F,x,z)-1.9); if(Lm<0.5) continue;
    const v0=B.p.length/3, nb=1+((rnd()*3)|0); let ytip=1e9;
    for(let k=0;k<nb;k++){ const L=0.5+(Lm-0.5)*Math.pow(rnd(),0.9), vx=x+(rnd()-0.5)*0.3, vz=z+(rnd()-0.5)*0.3, vq=Math.floor((vz-X.z0)/S)*nx+Math.floor((vx-X.x0)/S); if(!X.ceil[vq]) continue; const cc=cvdBil(X,X.C,vx,vz), hw=0.025+0.03*rnd(), ph=rnd()*6, an=rnd()*3.1416, sx=Math.cos(an), sz=Math.sin(an), g=0.8+0.4*rnd();
      const nodes=[], cols=[]; for(let a=0;a<=5;a++){ const t=a/5, sw=0.12*Math.sin(t*3+ph)*t, px=vx+sw*sz, pz=vz-sw*sx, py=cc+0.06-L*t; nodes.push([[px-sx*hw,py,pz-sz*hw],[px+sx*hw,py,pz+sz*hw]]); const c=[(0.12+0.1*t)*g,(0.28+0.12*t)*g,(0.07+0.04*t)*g]; cols.push([c,c]); }
      cvdGrid(B,nodes,cols,[sz,0,-sx]); ytip=Math.min(ytip,cc-L); cvdLog(X,'vine',vx,vz,cc+0.06,cc-L,hw); }
    if(ytip>1e8) continue;
    nv++; cvdPick(X,'vine',x,ytip,z,ytip+0.5,0.3,{acc:B,v0,v1:B.p.length/3}); }
  /* 굴 안 빛 드는 데(입구 거리 작음) — 고사리 · 이끼 (용암굴 채광창 밑이 가장 짙다) */
  const dF=X.kind==='lava'?7:X.kind==='shelter'?6:4.5, pF=X.kind==='lava'?0.07:0.035;
  let nf=0, nm=0;
  for(const q of X.cells){ if(cvdT()) yield; if((nf>=34&&nm>=40)||!cvdBudget(X)) break; cvdAt(X,q,rnd(),rnd(),o); if(o.d>10||o.sf>0.6||o.wd<0.1) continue;
    if(nf<34&&o.d<dF&&rnd()<pF){ const sc=0.7+0.7*rnd(), it=cvdFern(B,X,o.x,o.f-0.02,o.z,sc); it.acc=B; nf++; cvdLog(X,'fern',o.x,o.z,o.f,o.f+0.5*sc,0.4*sc); cvdPick(X,'fern',o.x,o.f,o.z,o.f+0.3*sc,0.35*sc,it); }
    else if(nm<40&&rnd()<0.06*(1-o.d/10)){ const mi=cvdMoss(B,X,o.x,o.f,o.z,0.15+0.35*rnd(),0.04+0.05*rnd(),0,1,0); mi.acc=B; nm++; cvdLog(X,'moss',o.x,o.z,o.f,o.f,0.3); cvdPick(X,'cvmoss',o.x,o.f,o.z,o.f+0.04,0.3,mi); } }
  /* 입구 둘레 땅 위(M 바깥 0.7~6 m) — 고사리 · 이끼 · 작은 너덜 */
  let ng=0, nmm=0, nr=0; const gH=X.rec.gH;
  for(let j=1;j<nz-1;j++) for(let i=1;i<nx-1;i++){ if(cvdT()) yield; const q=j*nx+i, d=X.md[q]; if(E[q]||X.M[q]||d<0.7||d>6||!cvdBudget(X)) continue; if(gH&&gH[q]<0.8) continue;
    const r0=rnd(), x=X.x0+(i+rnd()-0.5)*S, z=X.z0+(j+rnd()-0.5)*S; const y=cv10Sfc(x,z);
    if(r0<0.03&&d<5&&ng<26){ const sc=0.8+0.7*rnd(), it=cvdFern(B,X,x,y-0.02,z,sc); it.acc=B; ng++; cvdLog(X,'fern',x,z,y,y+0.5*sc,0.4*sc,true); cvdPick(X,'fern',x,y,z,y+0.3*sc,0.35*sc,it); }
    else if(r0<0.06&&d<5&&nmm<18){ const mi=cvdMoss(B,X,x,y,z,0.2+0.4*rnd(),0.05+0.06*rnd(),0,1,0); mi.acc=B; nmm++; cvdLog(X,'moss',x,z,y,y,0.3,true); cvdPick(X,'cvmoss',x,y,z,y+0.04,0.3,mi); }
    else if(r0>0.93&&d>2&&nr<40){ const R=0.07+0.16*rnd(), it=cvdRock(A,X,x,z,R,0.5+0.4*rnd(),0.9+0.2*rnd(),y); if(!it) continue; it.acc=A; nr++; cvdLog(X,'rubble',x,z,it.bot,it.top,R,true,y);
      if(rnd()<0.4) cvdPick(X,'cvrubble',x,y,z,y+R*0.6,Math.max(0.2,R),it); } }
  if((X.c._P||cv10Prep(X.c)).v16) yield* cvd16Mouth(X);              // 판 16 — 입구 테 붕락 덩이(판 15 이하는 이 줄을 안 타 장식 · 열쇠가 그대로)
}

/* ── 판 16 — 입구 테 붕락 덩이(research E 입구 · 사용자 결정 2026-11-12) ─────────────────────────────────────────────
   karst  무너진 입구 둘레의 판상 석회암 더미 + 굴 안 벽 쪽으로 씻겨 든 흙 원뿔(낙엽)
   lava   채광창 · 입구 테의 각진 현무암 붕락 + 고사리 둔덕(이끼 둔덕 위 고사리)
   talus  '문' 없이 — 사면의 덩이가 테를 넘어 굴 바닥(벽 쪽)으로 이어진다
   shelter 처마 밑 판상 낙반 + 바깥 애추 + 처마 윤곽을 따라 물방울 선 자갈 줄
   제 난수(c.seed^0x15e7)만 쓴다 — 이 동안 X.rnd 를 바꿔 끼웠다 되돌린다(cvdRock · cvdFern 이 X.rnd 를 읽는다 · 뒤 단계의 차례도 그대로).
   앉히기 — 덩이를 가운데 높이의 판판한 바닥에 지은 뒤 그 자리 땅 기울기만큼 기울여(전단) 비탈을 따르게 하고, 발자국 다섯 기둥(가운데 · ±0.5R)에서
   덩이 밑면과 딛는 높이(굴 안 격자 바닥 F · 밖 cv10Sfc — 큰 지형 모형 윗면까지)가 0.12 m 넘게 어긋나면 되돌린다.
   걷는 길(주 입구 앞 들머리 가운데 · 용암 내리막)은 비우고 굴 안은 벽 쪽(벽 거리 0.25~1.2 m · 길 반너비 1.3 m 넘는 데)에만.
   한도: 덩이 ≤24 · 줍기 ≤6 · 세모 ≤6k(굴 하나). 시험 — rec.deco 를 만들 때 X.f16 이 남긴 목록(D.f16) */
const CVD16={
  karst  :{out:9, inn:7, ob:[0.3,2.2], di:7.0, Ro:[0.25,0.8], Ri:[0.2,0.5],  so:[0.30,0.48], si:[0.30,0.45], pile:0.7, moss:0.45, mc:[0.50,0.54,0.40], cone:1, fern:4, flat:2, pal:{b:[0.40,0.39,0.355],a:[0.42,0.33,0.23]}},
  lava   :{out:15,inn:5, ob:[0.3,2.8], di:6.0, Ro:[0.30,1.3], Ri:[0.2,0.55], so:[0.50,0.80],si:[0.55,0.8],  pile:0.65,moss:0.60, mc:[0.20,0.31,0.10], mound:3, pal:{b:[0.20,0.19,0.18],a:[0.34,0.17,0.11]}},
  talus  :{out:12,inn:8, ob:[0.4,5.0], di:5.0, Ro:[0.32,1.0], Ri:[0.25,0.6], so:[0.60,0.90],si:[0.60,0.85], pile:0.45,moss:0.40, mc:[0.48,0.52,0.38], fern:2, pal:{b:[0.40,0.39,0.37],a:[0.44,0.39,0.30]}},
  shelter:{out:7, inn:5, ob:[1.0,4.5], di:5.0, Ro:[0.15,0.5], Ri:[0.25,0.6], so:[0.45,0.7], si:[0.28,0.42], pile:0.5, moss:0.18, mc:[0.46,0.44,0.32], grav:12, flat:1, pal:{b:[0.50,0.37,0.26],a:[0.40,0.24,0.15]}}
};
function* cvd16Mouth(X){
  const K=CVD16[X.kind]; if(!K) return;
  const r0=X.rnd; X.rnd=mulberry32((X.seed^0x15e7)>>>0);
  try{ yield* cvd16Run(X,K); } finally { X.rnd=r0; }
}
/* 붕락 덩이 — 한 번 나눈 정이십면체(세모 80)를 흔들고 밑면 · (판상이면 윗면도) · 비스듬한 평면 4~6 개로 깎아 모난 덩이로. 면마다 따로 칠한다(평면 음영) */
const CVD16_S=(()=>{ const V=CVD_IV.map(v=>v.slice()), F=[], mid=new Map();
  const m=(a,b)=>{ const k=a<b?a+'_'+b:b+'_'+a; if(mid.has(k)) return mid.get(k); const p=V[a], q=V[b], x=p[0]+q[0], y=p[1]+q[1], z=p[2]+q[2], l=Math.hypot(x,y,z); V.push([x/l,y/l,z/l]); mid.set(k,V.length-1); return V.length-1; };
  for(const [a,b,c] of CVD_IF){ const ab=m(a,b), bc=m(b,c), ca=m(c,a); F.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]); }
  return {V,F}; })();
function cvd16Stone(A,X,x,z,R,sy,tone,fc,flat){                  // fc — 밑면을 놓을 높이(가장 낮은 꼭짓점이 fc−0.05)
  const rnd=X.rnd, cs=Math.cos, sn=Math.sin, yaw=rnd()*6.2832, cy=cs(yaw), sy2=sn(yaw), tx=(rnd()-0.5)*0.35, tz=(rnd()-0.5)*0.35;
  const V=CVD16_S.V.map(v=>{ const j=0.86+0.26*rnd(); return [v[0]*j,v[1]*j,v[2]*j]; });
  const cut=(nx,ny,nz,d)=>{ for(const v of V){ const dd=v[0]*nx+v[1]*ny+v[2]*nz; if(dd>d){ v[0]-=(dd-d)*nx; v[1]-=(dd-d)*ny; v[2]-=(dd-d)*nz; } } };
  cut(0,-1,0,0.55+0.2*rnd()); if(flat) cut(0,1,0,0.45+0.2*rnd());
  for(let k=0,nk=4+((rnd()*3)|0);k<nk;k++){ let nx=rnd()-0.5, ny=(rnd()-0.5)*(flat?0.4:1), nz=rnd()-0.5; const l=Math.hypot(nx,ny,nz)||1; cut(nx/l,ny/l,nz/l,0.5+0.3*rnd()); }
  const W=V.map(v=>{ let px=v[0]*R, py=v[1]*R*sy, pz=v[2]*R;
    const qx=px*cy+pz*sy2, qz=-px*sy2+pz*cy; px=qx; pz=qz;
    const qy=py*cs(tx)-pz*sn(tx); pz=py*sn(tx)+pz*cs(tx); py=qy; const qy2=py*cs(tz)-px*sn(tz); px=py*sn(tz)+px*cs(tz); py=qy2;
    return [px,py,pz]; });
  let wmin=1e9; for(const w of W) if(w[1]<wmin) wmin=w[1]; const y0=fc-0.05-wmin;
  const v0=A.p.length/3, P=(CVD16[X.kind]||CVD16.talus).pal;   // 사진 값(research — 석회암 #9E9A90 · 현무암 #4F4A45 · 화강암 #9A958E · 사암 #C98A5A) · a 는 철 얼룩 · 산화
  for(const f of CVD16_S.F){ const a=W[f[0]], b=W[f[1]], c=W[f[2]];
    let nx=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const nl=Math.hypot(nx,ny,nz); if(nl<1e-9) continue; nx/=nl; ny/=nl; nz/=nl;
    const mx=(a[0]+b[0]+c[0])/3, my=(a[1]+b[1]+c[1])/3, mz=(a[2]+b[2]+c[2])/3, flip=(nx*mx+ny*my+nz*mz)<0;
    if(flip){ nx=-nx; ny=-ny; nz=-nz; }
    const sh=tone*(0.80+0.28*rnd())*(0.90+0.14*Math.max(0,ny)), pm=rnd()<0.18?0.5:0, o=A.p.length/3;
    for(const w of (flip?[a,c,b]:[a,b,c])){ A.p.push(x+w[0],y0+w[1],z+w[2]); A.n.push(nx,ny,nz);
      A.c.push((P.b[0]*(1-pm)+P.a[0]*pm)*sh,(P.b[1]*(1-pm)+P.a[1]*pm)*sh,(P.b[2]*(1-pm)+P.a[2]*pm)*sh); }
    A.i.push(o,o+1,o+2); A.tr++; }
  return {v0,v1:A.p.length/3};
}
/* 덩이 하나의 세모 [i0,i1) 가운데 (px,pz) 기둥을 지나는 가장 낮은 높이(없으면 null) */
function cvd16Col(A,i0,i1,px,pz){
  const P=A.p, I=A.i; let lo=null;
  for(let t=i0;t<i1;t+=3){ const a=I[t]*3, b=I[t+1]*3, c=I[t+2]*3, x1=P[a], z1=P[a+2], x2=P[b], z2=P[b+2], x3=P[c], z3=P[c+2];
    const d=(z2-z3)*(x1-x3)+(x3-x2)*(z1-z3); if(Math.abs(d)<1e-9) continue;
    const u=((z2-z3)*(px-x3)+(x3-x2)*(pz-z3))/d, v=((z3-z1)*(px-x3)+(x1-x3)*(pz-z3))/d, w=1-u-v; if(u<-1e-6||v<-1e-6||w<-1e-6) continue;
    const y=u*P[a+1]+v*P[b+1]+w*P[c+1]; if(lo===null||y<lo) lo=y; }
  return lo;
}
function* cvd16Run(X,K){
  const rnd=X.rnd, nx=X.nx, nz=X.nz, E=X.E, M=X.rec.M, S=X.S, gH=X.rec.gH, A=X.A.rock, B=X.A.sheet, m0=X.c.mouths[0], cy=Math.cos(m0.yaw), sy=Math.sin(m0.yaw);
  const st=X.f16={n:0,pk:0,tr0:A.tr+B.tr,list:[],cone:0,fern:0,grav:0,rj:{}}, rj=k=>{ st.rj[k]=(st.rj[k]||0)+1; return null; };   // rj — 버린 까닭 수(시험)
  const room=()=>st.n<24&&A.tr+B.tr-st.tr0<5900&&cvdBudget(X);
  const lane=(x,z)=>{ const dx=x-m0.x, dz=z-m0.z, al=dx*cy+dz*sy, lt=Math.abs(-dx*sy+dz*cy);   // 걷는 들머리(주 입구 바깥쪽 · 용암은 내리막)
    return m0.sky?(al>-m0.r*0.3&&al<m0.r+9&&lt<1.9):(al>-5&&al<9&&lt<(m0.w||4)*0.25+0.8); };
  const gOut=(x,z)=>cv10Sfc(x,z);
  const gIn=(x,z)=>{ const s=cv10Samp(X.rec,x,z); return s.n>=0.5?s.f:null; };   // 벽 곁은 빈 데 기둥만 섞은 바닥(그려진 바닥과 같은 식)
  const aisle=(x,z,R)=>{ const c=X.c;                              // 굴 안 덩이 — 굴길 · 방의 가운데 선에서 안쪽 가장자리까지 0.7 m 와 반너비의 반(u>0.5)을 남긴다
    for(const g of c.segs){ const dx=g.bx-g.ax, dz=g.bz-g.az, L2=dx*dx+dz*dz||1, t=Math.max(0,Math.min(1,((x-g.ax)*dx+(z-g.az)*dz)/L2)), d=Math.hypot(x-g.ax-dx*t,z-g.az-dz*t), hw=(g.w||2)/2;
      if(d<hw+1&&d-R<Math.max(0.7,0.5*hw)) return false; }
    for(const r of c.rooms){ const d=Math.hypot(x-r.x,z-r.z); if(d<r.R+1&&d-R<Math.max(0.7,0.5*r.R)) return false; }
    return true; };
  const dry=(x,z)=>{ const i=Math.floor((x-X.x0)/S), j=Math.floor((z-X.z0)/S); if(i<0||j<0||i>=nx-1||j>=nz-1) return false; const q=j*nx+i; return !M[q]&&!M[q+1]&&!M[q+nx]&&!M[q+nx+1]&&!E[q]&&!E[q+1]&&!E[q+nx]&&!E[q+nx+1]; };   // 바깥 덩이의 발자국 — 땅 구멍(M)이나 굴 위(E) 칸에 걸치지 않게(걸치면 덩이가 구멍 위에 뜬다)
  const cellOf=(x,z)=>{ const i=Math.floor((x-X.x0)/S), j=Math.floor((z-X.z0)/S); return (i<1||j<1||i>=nx-1||j>=nz-1)?-1:j*nx+i; };
  /* 자리 표 — 1 바깥 테 · 2 굴 안 벽 쪽 · 4 물방울 선 */
  const cand=new Uint8Array(nx*nz), wmA=new Float32Array(nx*nz), out=[], inn=[], grav=[];
  for(let j=1;j<nz-1;j++){ if((j&7)===7&&cvdT()) yield; for(let i=1;i<nx-1;i++){ const q=j*nx+i, d=X.md[q];
    if(!E[q]){ if(M[q]||(gH&&gH[q]<0.8)) continue; if(d>=K.ob[0]&&d<=K.ob[1]){ cand[q]|=1; out.push(q); } if(K.grav&&d>=0.15&&d<=0.7){ cand[q]|=4; grav.push(q); } }
    else if(X.D[q]<K.di&&X.wd[q]>=0.25&&X.wd[q]<=1.2){ let wm=0; for(let b=-4;b<=4;b++) for(let a=-4;a<=4;a++){ const i2=i+a, j2=j+b; if(i2<0||j2<0||i2>=nx||j2>=nz) continue; const w=X.wd[j2*nx+i2]; if(w>wm) wm=w; }
      if(wm>=1.3){ cand[q]|=2; wmA[q]=wm; inn.push(q); } } } }
  st.cand=[out.length,inn.length,grav.length];
  /* 덩이 하나 — 판판하게 지어 기울이고(전단) · 법선을 다시 · 다섯 기둥 검사 · 빛깔(얼룩 · 윗면 이끼/지의류 · 밑동 흙) */
  const put=(x,z,R,shy,inside,tone)=>{   // 덩이 하나 — 밑면 높이 fc 에 짓고 기울인다
    const g=inside?gIn:gOut, fc=g(x,z); if(fc===null) return rj('g');
    const e=0.3, gxp=g(x+e,z), gxm=g(x-e,z), gzp=g(x,z+e), gzm=g(x,z-e); if(gxp===null||gxm===null||gzp===null||gzm===null) return rj('g4');
    const gx=(gxp-gxm)/(2*e), gz=(gzp-gzm)/(2*e); if(Math.hypot(gx,gz)>0.7) return rj('sl');
    const L0=A.p.length, Ln=A.n.length, Lc=A.c.length, Li=A.i.length, Lt=A.tr, back=()=>{ A.p.length=L0; A.n.length=Ln; A.c.length=Lc; A.i.length=Li; A.tr=Lt; return null; };
    const it=cvd16Stone(A,X,x,z,R,shy,tone,fc,K.flat&&(inside||K.flat>1));
    const P=A.p, N=A.n, C=A.c;
    for(let v=it.v0;v<it.v1;v++) P[v*3+1]+=gx*(P[v*3]-x)+gz*(P[v*3+2]-z);
    for(let t=Li;t<A.i.length;t+=3){ const a=A.i[t]*3, b=A.i[t+1]*3, c=A.i[t+2]*3;
      let nx_=(P[b+1]-P[a+1])*(P[c+2]-P[a+2])-(P[b+2]-P[a+2])*(P[c+1]-P[a+1]), ny_=(P[b+2]-P[a+2])*(P[c]-P[a])-(P[b]-P[a])*(P[c+2]-P[a+2]), nz_=(P[b]-P[a])*(P[c+1]-P[a+1])-(P[b+1]-P[a+1])*(P[c]-P[a]);
      const l=Math.hypot(nx_,ny_,nz_)||1; nx_/=l; ny_/=l; nz_/=l;
      for(const k of [a,b,c]){ let rx=P[k]-x, ry=P[k+1]-fc-R*shy*0.5, rz=P[k+2]-z; const rl=Math.hypot(rx,ry,rz)||1; rx=nx_*0.68+rx/rl*0.32; ry=ny_*0.68+ry/rl*0.32; rz=nz_*0.68+rz/rl*0.32; const ql=Math.hypot(rx,ry,rz)||1; N[k]=rx/ql; N[k+1]=ry/ql; N[k+2]=rz/ql; } }   // 모서리를 조금 무디게(면 법선에 가운데에서 나가는 쪽을 32%)
    for(const [ox,oz] of [[0,0],[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]]){ const px=x+ox*R, pz=z+oz*R; if(!inside&&!dry(px,pz)){ rj('m'); return back(); } const y=cvd16Col(A,Li,A.i.length,px,pz); if(y===null) continue; const gg=g(px,pz); if(gg===null||Math.abs(y-gg)>0.12){ rj(gg===null?'cg':'col'); return back(); } }
    let top=-1e9; for(let v=it.v0;v<it.v1;v++) if(P[v*3+1]>top) top=P[v*3+1];
    const lit=inside?Math.max(0,1-cvdBil(X,X.D,x,z)/3)*0.4:1;      // 굴 안은 빛 드는 데만 조금
    for(let v=it.v0;v<it.v1;v++){ const vx=P[v*3], vy=P[v*3+1], vz=P[v*3+2];
      const h=((Math.imul(Math.round(vx*23)|0,73856093)^Math.imul(Math.round(vy*23)|0,19349663)^Math.imul(Math.round(vz*23)|0,83492791))>>>0)/4294967296;
      const ny=N[v*3+1], mk=K.moss*lit*cvdSS(0.35,0.85,ny)*(0.45+0.9*h)*cvdSS(0.2,0.5,cvdNoise(X,vx,vz,1.3,9)), gk=Math.max(0,1-(vy-(fc+gx*(vx-x)+gz*(vz-z)))/0.14)*0.55, mo=0.78+0.40*h;
      for(let k=0;k<3;k++){ let col=C[v*3+k]*mo; col+=(K.mc[k]-col)*Math.min(1,mk); col+=([0.27,0.21,0.15][k]-col)*gk; C[v*3+k]=col; } }
    st.n++; const tp=[]; for(let t=Li;t<A.i.length;t++){ const a=A.i[t]*3; tp.push(P[a],P[a+1],P[a+2]); }   // 시험용 세모 자리(조각 줄이기 cvdPcCap 이 정점 번호를 옮기므로 번호 대신)
    const o={x,z,R,inside,tp,top,fc}; st.list.push(o); it.acc=A; o.it=it;
    cvdLog(X,'fall',x,z,fc,top,R,!inside,fc);
    if(inside&&R>=0.3) cvdBlock(X,x,z,R*0.85,fc,top);
    return o;
  };
  const pickRub=(o)=>{ if(st.pk>=6||o.R>=0.3||rnd()>0.5) return; if(cvdPick(X,'cvrubble',o.x,o.fc,o.z,o.fc+o.R*0.6,Math.max(0.2,o.R),o.it)) st.pk++; };
  /* 바깥 테 — 반쯤은 앞 덩이에 기대어 더미로 */
  const outs=[];
  for(let k=0;k<K.out*10&&outs.length<K.out&&out.length&&room();k++){ if(cvdT()) yield;
    let x, z; const R=K.Ro[0]+(K.Ro[1]-K.Ro[0])*Math.pow(rnd(),1.8);
    if(outs.length&&rnd()<K.pile){ const p=outs[(rnd()*outs.length)|0], an=rnd()*6.2832, dd=(p.R+R)*(0.75+0.3*rnd()); x=p.x+Math.cos(an)*dd; z=p.z+Math.sin(an)*dd; }
    else { const q=out[(rnd()*out.length)|0]; x=X.x0+((q%nx)+rnd())*S; z=X.z0+(((q/nx)|0)+rnd())*S; }
    const q=cellOf(x,z); if(q<0||!(cand[q]&1)||lane(x,z)) continue;
    let bad=false; for(const p of outs){ if(Math.hypot(p.x-x,p.z-z)<(p.R+R)*0.6){ bad=true; break; } } if(bad) continue;
    const o=put(x,z,R,K.so[0]+(K.so[1]-K.so[0])*rnd(),false,0.85+0.25*rnd()); if(!o) continue; outs.push(o); pickRub(o); }
  /* 굴 안 벽 쪽 */
  const ins=[];
  for(let k=0;k<K.inn*10&&ins.length<K.inn&&inn.length&&room();k++){ if(cvdT()) yield;
    const q=inn[(rnd()*inn.length)|0], x=X.x0+((q%nx)+rnd())*S, z=X.z0+(((q/nx)|0)+rnd())*S, w=cvdBil(X,X.wd,x,z), R=Math.min(K.Ri[0]+(K.Ri[1]-K.Ri[0])*Math.pow(rnd(),1.5),w+0.05);
    if(R<0.15||w+R>wmA[q]-0.5||w<R*0.3){ rj('iw'); continue; }   // 길 가운데(벽에서 wm)까지 0.5 m 넘게 남기고 · 벽에 기댄다
    if(!aisle(x,z,R)){ rj('ai'); continue; }
    let bad=false; for(const p of ins){ if(Math.hypot(p.x-x,p.z-z)<(p.R+R)*0.7){ bad=true; break; } } if(bad) continue;
    const o=put(x,z,R,K.si[0]+(K.si[1]-K.si[0])*rnd(),true,0.8+0.25*rnd()); if(!o) continue; ins.push(o); pickRub(o); }
  /* 물방울 선 자갈 줄(바위그늘) */
  for(let k=0;k<(K.grav||0)*8&&st.grav<(K.grav||0)&&grav.length&&room();k++){ if(cvdT()) yield;
    const q=grav[(rnd()*grav.length)|0], x=X.x0+((q%nx)+rnd())*S, z=X.z0+(((q/nx)|0)+rnd())*S; if(lane(x,z)&&rnd()<0.6) continue;
    const o=put(x,z,0.05+0.06*rnd(),0.5+0.3*rnd(),false,0.75+0.3*rnd()); if(!o) continue; st.grav++; pickRub(o); }
  /* 흙 원뿔(석회암) — 굴 안 벽 쪽 · 낙엽 딱지 */
  for(let k=0;k<30&&st.cone<(K.cone||0)&&inn.length&&room();k++){ if(cvdT()) yield;
    const q=inn[(rnd()*inn.length)|0], x=X.x0+((q%nx)+rnd())*S, z=X.z0+(((q/nx)|0)+rnd())*S, fc=gIn(x,z); if(fc===null||X.O[q]){ rj('co'); continue; }   // 지붕 밑에만(열린 마당이면 땅에 놓인 갈색 접시로 보였다)
    const Rc=0.6+0.35*rnd(), h=0.30+0.15*rnd(), w=cvdBil(X,X.wd,x,z); let ok=w+Rc*0.5<=wmA[q]-0.5&&aisle(x,z,Rc*0.5), gmin=fc, nv=0;   // 벽에 반쯤 묻힌 원뿔 — 길 쪽 가장자리가 가운데까지 0.5 m 넘게 남게
    for(let a=0;a<8&&ok;a++){ const an=a/8*6.2832, gg=gIn(x+Math.cos(an)*Rc,z+Math.sin(an)*Rc); if(gg===null) continue; nv++; if(Math.abs(gg-fc)>0.12) ok=false; else gmin=Math.min(gmin,gg); }
    if(nv<4) ok=false;
    if(!ok){ rj('cn'); continue; }
    const y0=gmin-0.04, it=cvdRev(A,x,y0,z,0,1,0,h+(fc-y0),t=>Rc*Math.pow(1-t,1.05)*(t>=0.999?0:1),10,3,t=>[0.24+0.04*t,0.18+0.03*t,0.12+0.02*t]);
    for(let v=it.v0;v<it.v1;v++){ const vx=A.p[v*3], vz=A.p[v*3+2], hh=((Math.imul(Math.round(vx*31)|0,73856093)^Math.imul(Math.round(vz*31)|0,83492791))>>>0)/4294967296;
      const lf=hh<0.22?[0.34,0.21,0.10]:hh<0.45?[0.28,0.21,0.13]:null; if(lf) for(let c=0;c<3;c++) A.c[v*3+c]=lf[c]*(0.85+0.3*hh); }
    it.acc=A; st.cone++; cvdLog(X,'cone',x,z,y0,fc+h,Rc);
    for(let n=0;n<8;n++){ const an=rnd()*6.2832, rr=Rc*(0.2+1.1*rnd()), lx=x+Math.cos(an)*rr, lz=z+Math.sin(an)*rr, gg=gIn(lx,lz); if(gg===null) continue;
      const ly=rr<Rc?Math.max(gg,y0+(h+fc-y0)*Math.pow(1-rr/Rc,1.05)):gg, cc=rnd(); cvdDisc(B,lx,ly+0.005,lz,0,1,0,0.03+0.04*rnd(),cc<0.5?[0.40,0.24,0.10]:cc<0.8?[0.32,0.23,0.12]:[0.44,0.35,0.15],0,0); }
    }
  /* 고사리 둔덕(용암) · 덩이 곁 고사리(석회암 · 바위틈) — 바깥 덩이 곁 땅에 */
  const nMound=K.mound||0, nFern=K.fern||0;
  for(let k=0;k<(nMound+nFern)*6&&st.fern<nMound+nFern&&outs.length&&room();k++){ if(cvdT()) yield;
    const p=outs[(rnd()*outs.length)|0], an=rnd()*6.2832, dd=p.R+0.25+0.4*rnd(), x=p.x+Math.cos(an)*dd, z=p.z+Math.sin(an)*dd, q=cellOf(x,z); if(q<0||!(cand[q]&1)||lane(x,z)) continue;
    let bad=false; for(const o of outs){ if(Math.hypot(o.x-x,o.z-z)<o.R+0.1){ bad=true; break; } } if(bad) continue;
    const y=gOut(x,z);
    if(st.fern<nMound){ const r=0.35+0.3*rnd(), hm=0.10+0.08*rnd(), mi=cvdMoss(B,X,x,y-0.03,z,r,hm,0,1,0); mi.acc=B; cvdLog(X,'mound',x,z,y,y+hm,r,true);
      const f0=B.p.length/3; for(let f=0,nf=2+((rnd()*2)|0);f<nf;f++){ const fa=rnd()*6.2832, fr=r*0.45*rnd(); cvdFern(B,X,x+Math.cos(fa)*fr,y-0.03+hm*0.75,z+Math.sin(fa)*fr,0.7+0.5*rnd()); }
      if(st.pk<6&&cvdPick(X,'fern',x,y,z,y+0.3,0.35,{acc:B,v0:f0,v1:B.p.length/3})) st.pk++; }
    else { const sc=0.7+0.6*rnd(), it=cvdFern(B,X,x,y-0.02,z,sc); it.acc=B; cvdLog(X,'fern',x,z,y,y+0.5*sc,0.4*sc,true); if(st.pk<6&&cvdPick(X,'fern',x,y,z,y+0.3*sc,0.35*sc,it)) st.pk++; }
    st.fern++; }
  st.tri=A.tr+B.tr-st.tr0;
}

/* ── 한 굴 ───────────────────────────────────────────────────────────────────────────────────────────────── */
/* onBuild — 짓기를 줄에 세운다(한 틱에 2 ms 만 쓴다 · 마저 끝내려면 cv10DecoFlush). 굴을 버리면 멈춘다 */
function cv10Deco(rec){
  cvdInit(); if(rec.deco) cv10DecoDrop(rec);
  rec.decoGen=cvdGen(rec); CVD.q.push(rec);
}
function cv10DecoRun(ms){
  const end=performance.now()+ms;
  for(;;){
    while(!CVD.cur&&CVD.q.length){ const r=CVD.q.shift(); if(r.decoGen&&CV10.built.get(r.c)===r) CVD.cur=r; }
    const r=CVD.cur; if(!r) return;
    if(!r.decoGen||CV10.built.get(r.c)!==r){ CVD.cur=null; continue; }
    CVD.tEnd=end; const t1=performance.now(); let st;
    try{ st=r.decoGen.next(); }catch(e){ showErr('굴 장식',e); cv10DecoDrop(r); CVD.cur=null; continue; }   // 던진 굴은 짓기를 멈추고 붙은 것을 치운다
    r.decoMs=(r.decoMs||0)+performance.now()-t1;
    if(st.done){ r.decoGen=null; CVD.cur=null; if(r.deco) r.deco.ms=r.decoMs; }
    if(performance.now()>=end) return;
  }
}
const cv10DecoFlush=()=>cv10DecoRun(1e9);                          // 시험 · 개발자 이동 — 줄 선 것을 전부 끝까지
function* cvdGen(rec){
  const c=rec.c, kind=c.kind;
  rec.cols=rec.cols.filter(o=>!o.deco);
  const D=rec.deco={meshes:[],items:[],log:[],cnt:{},tris:0,draws:0,picks:[],ms:0,cols:[]};   // 짓기 시작할 때 먼저 세운다 — 붙인 자식은 버릴 때 반드시 떼어 낸다(cv10DecoDrop)
  const X=yield* cvdCtx(rec); yield;
  if((kind==='karst'||kind==='lava')&&CVD_PC.list===null) yield* cvdPcInit();   // 모형 조각(처음 한 번)
  X.wd=yield* cvdChamfer(X,X.blocked); X.md=yield* cvdChamfer(X,rec.M); X.blocked=null; yield* cvdTris(X); yield;
  if(kind==='karst'){ yield* cvdKarstSpeleo(X); yield* cvdKarstFlow(X); yield* cvdGlow(X,12,0.30,8,0.05,420); yield* cvdRoots(X,0.05,10); }
  else if(kind==='lava'){ yield* cvdLavaTeeth(X); yield* cvdRubble(X,(o)=>o.d<7&&o.wd>0.2,0.30,1.0,60,1.0); yield* cvdRoots(X,0.14,40); yield* cvdWallDecals(X,'flake',70); yield* cvdWallDecals(X,'gold',220); }
  else if(kind==='talus'){ yield* cvdRubble(X,(o)=>o.wd>0.15,0.06,1.0,160,1.0); yield* cvdGlow(X,6,0.22,5,0.02,200); yield* cvdWallMoss(X,9,22); yield* cvdRoots(X,0.05,10); }
  else if(kind==='shelter'){ yield* cvdSlabs(X); yield* cvdRubble(X,(o)=>o.d<14&&o.wd>0.2,0.03,0.4,30,1.0); yield* cvdWallDecals(X,'salt',90); yield* cvdWallMoss(X,6,8); }
  yield* cvdEntrance(X);
  if(kind==='karst') yield* cvdWallMoss(X,8,14);
  yield* cvdPcCap(X);                                            // 참 세모가 CVD.maxTri 를 넘으면 조각을 거친 단계 · 원뿔로
  if(X.pcs){ let tri=0; for(const r of X.pcl){ if(r.isCone){ if(X.pcs.dbg) (X.pcs.dbgCone||(X.pcs.dbgCone=[])).push({picks:r.picks.map(p=>p.key),col:r.blk?X.cols.indexOf(r.blk[0]):-1}); continue; } const G=CVD_PC.list[r.pk].L[r.li]; tri+=G.tr;
    if(X.pcs.dbg){ const b=[]; for(let v=0;v<G.nv;v++) if(G.lock[v]) b.push(r.v0+v); X.pcs.dbg.push([r.v0,r.v1,r.i0,r.i1,r.down?1:0,b,r.info,r.blk?X.cols.indexOf(r.blk[0]):-1,r.picks.map(p=>p.key)]); } } X.pcs.tri=tri; }   // 시험(CVD.dbg) — 낱개마다 정점 · 세모 범위와 밑동 정점
  /* 합쳐서 메시로 — 배열을 숫자 배열로 바꾸는 일도 한 장씩 쉬며 */
  const mats=CVD.mats, parent=rec.mesh, accOf=new Map();
  for(const [A,mat,lr] of [[X.A.rock,mats.rock],[X.A.sheet,mats.sheet],[X.A.water,mats.water],[X.A.shr,mats.shr,'none']]){ if(!A.p.length) continue;
    const g=new THREE.BufferGeometry(); yield;
    g.setAttribute('position',new THREE.BufferAttribute(yield* cvdTyped(Float32Array,A.p),3));
    g.setAttribute('normal',new THREE.BufferAttribute(yield* cvdTyped(Float32Array,A.n),3));
    g.setAttribute('color',new THREE.BufferAttribute(yield* cvdTyped(Float32Array,A.c),3));
    g.setIndex(new THREE.BufferAttribute(yield* cvdTyped(A.p.length/3>65535?Uint32Array:Uint16Array,A.i),1));
    g.computeBoundingSphere(); yield;
    const m=new THREE.Mesh(g,mat); m.matrixAutoUpdate=false; m.userData.cvDeco=1; if(lr) m.userData.lightRole=lr; if(mat===mats.water) m.renderOrder=2; parent.add(m); D.meshes.push(m); accOf.set(A,m); }
  if(X.gw.length){ const g=new THREE.BufferGeometry(), P=[], G=[]; for(let k=0;k<X.gw.length;k+=6){ P.push(X.gw[k],X.gw[k+1],X.gw[k+2]); G.push(X.gw[k+3],X.gw[k+4],X.gw[k+5]); }
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aG',new THREE.Float32BufferAttribute(G,3)); g.computeBoundingSphere();
    const pt=new THREE.Points(g,caveGlowMat()); pt.matrixAutoUpdate=false; pt.userData.cvDeco=1; parent.add(pt); D.meshes.push(pt); }
  if(X.gold.length){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(X.gold,3)); g.computeBoundingSphere();
    { const col=new Float32Array(X.gold.length); for(let i=0;i<X.gold.length;i+=3){ const sm=cv10Samp(X.rec,X.gold[i],X.gold[i+2]), k=1-0.9*_cv10Smooth(2,16,sm.n>0?sm.d:0);   // 깊을수록 어둡게(입구 쪽 1 · 깊은 데 0.1)
        col[i]=0.769*k; col[i+1]=0.604*k; col[i+2]=0.196*k; } g.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); }
    const pt=new THREE.Points(g,mats.gold); pt.matrixAutoUpdate=false; pt.userData.cvDeco=1; parent.add(pt); D.meshes.push(pt); }
  for(const it of X.items) it.mesh=accOf.get(it.acc);
  for(const col of X.cols) rec.cols.push(col);
  D.items=X.items; D.log=X.log; D.cnt=X.cnt; D.picks=X.picks; D.cols=X.cols; D.draws=D.meshes.length;
  D.tris=X.A.rock.tr+X.A.sheet.tr+X.A.water.tr+X.A.shr.tr+X.xtr; D.trisEq=D.tris-X.xtr; D.pc=X.pcs; D.f16=X.f16||null;   // tris 참 세모 · trisEq 예산이 센 것(조각을 예전 원뿔 세모로) · pc 고른 조각(조각 번호 → 개수)
  /* 이미 따간 것은 숨기고, 아닌 것만 딸 것 목록에 */
  for(const it of X.items){ if(cvdTaken(it)) cvdSet(it,false); else CV10.picks.push(it.pick); }
}
const cvdTaken=it=>{ const t=FLORA.taken.get(it.key); return t!==undefined&&gameHours-t<FLORA_PICK[it.kind].regrow; };
function cvdSet(it,vis){                                          // 정점 범위를 한 점으로 접어 숨기고 · 되돌려 보인다
  if(it.vis===vis||!it.mesh) { it.vis=vis; return; }
  const pos=it.mesh.geometry.attributes.position, a=pos.array;
  if(!vis){ it.saved=a.slice(it.v0*3,it.v1*3); const x=a[it.v0*3], y=a[it.v0*3+1], z=a[it.v0*3+2]; for(let v=it.v0;v<it.v1;v++){ a[v*3]=x; a[v*3+1]=y; a[v*3+2]=z; } }
  else if(it.saved){ a.set(it.saved,it.v0*3); it.saved=null; }
  pos.needsUpdate=true; it.vis=vis;
  const k=CV10.picks.indexOf(it.pick); if(vis){ if(k<0) CV10.picks.push(it.pick); } else if(k>=0) CV10.picks.splice(k,1);
}
/* 매 프레임 — 딴 것을 숨기고 다시 난 것을 보인다 · 빛나는 점의 시각 */
function cv10DecoSync(){
  const T=FLORA.taken, now=gameHours;
  for(const rec of CV10.built.values()){ const d=rec.deco; if(!d) continue;
    for(const it of d.items){ const t=T.get(it.key), gone=t!==undefined&&now-t<FLORA_PICK[it.kind].regrow; if(gone===it.vis) cvdSet(it,!gone); } }
  if(typeof CAVE_GLOW!=='undefined'&&CAVE_GLOW){ CAVE_GLOW.uniforms.uT.value=performance.now()*0.001;
    CAVE_GLOW.uniforms.uPx.value=((typeof CAMC!=='undefined'&&CAMC.rt)?CAMC.rt.height:renderer.domElement.height)*0.5*camera.projectionMatrix.elements[5]; }
}
function cv10DecoDrop(rec){
  rec.decoGen=null; if(CVD.cur===rec) CVD.cur=null; { const qi=CVD.q.indexOf(rec); if(qi>=0) CVD.q.splice(qi,1); } const d=rec.deco;
  if(d) for(const it of d.items){ const k=CV10.picks.indexOf(it.pick); if(k>=0) CV10.picks.splice(k,1); }
  if(rec.mesh) for(const m of rec.mesh.children.slice()) if(m.userData.cvDeco){ rec.mesh.remove(m); m.geometry.dispose(); }   // 짓다 만 것까지(rec.deco 가 아직 없어도) 껍데기에서 떼고 지오메트리를 버린다
  rec.cols=rec.cols.filter(o=>!o.deco); rec.deco=null;
}
CV10.onBuild.push(cv10Deco); CV10.onDrop.push(cv10DecoDrop);
