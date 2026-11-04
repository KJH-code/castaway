/* ── 동굴 판 10 — 굴의 안팎 장식 (조각 E) ──────────────────────────────────────────────────────────────────────────
   굴 껍데기(31-cave10.js)가 다 지어지면 `CV10.onBuild` 가 `cv10Deco(rec)` 를 부른다. 이 파일은 그 굴의 **종류에 맞는 장식**을 격자(`rec.F` 바닥 ·
   `rec.C` 천장 · `rec.Hh` 땅 · `rec.O` 열린 데 · `rec.M` 땅 뚫기 · `rec.D` 입구 거리)에서 자리를 골라 놓는다.
     karst   종유석 · 빨대 종유석 · 석순 · 기둥 · 커튼 · 유석 둔덕 · 휴석 웅덩이(둑 + 물 + 동굴 진주) · 반딧불이 유충 · 빛나는 버섯
     lava    용암 고드름 · 작은 용암 석순 · 채광창 밑 무너진 돌 + 고사리 · 이끼 · 천장을 뚫고 늘어진 나무뿌리 · 광물 딱지 · 금빛 세균 점
     talus   바닥의 모난 무너진 돌 · 빛구멍 둘레 이끼 · 반딧불이 유충 · 버섯 조금
     shelter 앞쪽의 떨어진 판돌 · 벽의 흰 소금꽃 점
     모든 굴 이마의 늘어진 덩굴 · 입구 둘레(땅) 고사리 · 이끼 · 입구 앞 너덜
   · 결정론 — 난수는 `mulberry32((c.seed^0xdec0)>>>0)` 하나(격자가 같으면 같은 장식) · `Math.random` 없음 · 딸 것의 열쇠는 'CV'+굴 씨+'_'+번호.
   · 그림 — 모두 `rec.mesh` 의 자식(propGroup · surfList 아님). 같은 재질끼리 하나로 합쳐 굴 하나에 그리기 호출 ≤ 5
     (바위 · 시트(양면 — 풀 · 덩굴 · 커튼 · 둑) · 물 · 빛나는 버섯 · 빛나는 점). 빛을 더하지 않는다 — 빛나는 것은 스스로 빛나는 재질.
   · 몸을 막는 것 — 기둥 · 반지름 0.25 넘는 석순 · 지름 0.6 m 넘는 돌은 `rec.cols`(걷기는 B 가 읽는다).
   · 딸 것 — `CV10.picks`(95-flora.js 의 줍기 목록에 들어 있다) · 딴 것은 메시 안의 정점 범위를 접어 숨긴다(`cv10DecoSync` — 매 프레임 `FLORA.taken` 을 본다).
   · 옮긴 코드 — NW2 `PierfrancescoSoffritti/doodles` CaveMeshData.js(Apache-2.0)의 '밀도로 뿌리 자리를 검사'하는 생각 ·
     `ethanpil/marine-scene` 의 돌림 단면 식(종유석 0.26(1−v)^1.25 · 기둥 |2v−1|^1.7 — 식만 보고 다시 짰다). 라이선스 없는 코드는 읽기만 하고 베끼지 않았다.
   이름은 cv10Deco · cvd 로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다). 설계와 잰 값은 docs/notes/caves.md '구현 메모(E)'. */
const CVD={ hooked:false, mats:null, maxTri:30000, maxPick:90, q:[], cur:null, tEnd:0, k:0, budget:2 };
const cvdT=()=>(++CVD.k&15)===0&&performance.now()>CVD.tEnd;      // 이번 틱의 시간이 다 됐나 — 장식 짓기는 제너레이터라 여기서 쉰다
CV10.picks=[];

/* ── 재질 · 줍기 종류(처음 지을 때 — 95-flora.js 는 이 파일보다 뒤에 읽힌다) ───────────────────────────────────── */
function cvdInit(){
  if(!CVD.mats){
    CVD.mats={
      rock :new THREE.MeshLambertMaterial({vertexColors:true}),
      sheet:new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),
      water:new THREE.MeshLambertMaterial({color:0x1d4d52,transparent:true,opacity:0.55,depthWrite:false}),
      shr  :new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),
      gold :new THREE.PointsMaterial({color:0xc49a32,size:0.035,sizeAttenuation:true})
    };
  }
  if(typeof FLORA_PICK!=='undefined'&&!FLORA_PICK.cvcalcite)
    Object.assign(FLORA_PICK,{
      cvcalcite:{item:'limestone',n:'동굴 석회 조각',verb:'떼기',    regrow:9999,cnt:[1,1],dur:1.2,stam:3},
      cvrubble :{item:'pebble',   n:'무너진 돌',     verb:'줍기',    regrow:9999,cnt:[1,2],dur:0.5,stam:1.5},
      cvroot   :{item:'fiber',    n:'나무뿌리',       verb:'뜯기',    regrow:96,  cnt:[1,2],dur:1.0,stam:2}
    });
  if(!CVD.hooked&&typeof floraFindLook==='function'){          // 매 프레임 딴 것을 숨기고 다시 난 것을 보인다 + 빛나는 점의 시각(32-caves.js 는 판 9 굴이 없으면 안 돌린다)
    CVD.hooked=true; const f0=floraFindLook;
    floraFindLook=function(){ if(CV10.built.size){ cv10DecoRun(CVD.budget); cv10DecoSync(); } f0(); };
  }
}

/* ── 가는 도구 ───────────────────────────────────────────────────────────────────────────────────────────── */
const cvdSS=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const cvdAcc=()=>({p:[],n:[],c:[],i:[],tr:0});
const cvdLerp4=(a,q,nx,u,w)=>(a[q]*(1-u)+a[q+1]*u)*(1-w)+(a[q+nx]*(1-u)+a[q+nx+1]*u)*w;
function cvdNoise(X,x,z,sc,k){                                   // 값 잡음 [0,1) — 굴 씨로 갈린다
  const fx=x/sc, fz=z/sc, i=Math.floor(fx), j=Math.floor(fz), u=fx-i, w=fz-j, su=u*u*(3-2*u), sw=w*w*(3-2*w), s=X.seed+k*131;
  const a=cv10H(i,j,s), b=cv10H(i+1,j,s), c=cv10H(i,j+1,s), d=cv10H(i+1,j+1,s); return (a+(b-a)*su)*(1-sw)+(c+(d-c)*su)*sw;
}
function cvdFar(list,x,z,d){ const d2=d*d; for(let k=0;k<list.length;k++){ const dx=list[k].x-x, dz=list[k].z-z; if(dx*dx+dz*dz<d2) return false; } return true; }
function cvdChamfer(X,src){                                      // src[q]=1 인 칸에서의 거리(m) — 두 번 훑는 근사
  const nx=X.nx, nz=X.nz, S=X.S, S2=S*1.4142, d=new Float32Array(nx*nz);
  for(let q=0;q<d.length;q++) d[q]=src[q]?0:1e4;
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const q=j*nx+i; let v=d[q];
    if(i>0&&d[q-1]+S<v) v=d[q-1]+S; if(j>0){ if(d[q-nx]+S<v) v=d[q-nx]+S; if(i>0&&d[q-nx-1]+S2<v) v=d[q-nx-1]+S2; if(i<nx-1&&d[q-nx+1]+S2<v) v=d[q-nx+1]+S2; } d[q]=v; }
  for(let j=nz-1;j>=0;j--) for(let i=nx-1;i>=0;i--){ const q=j*nx+i; let v=d[q];
    if(i<nx-1&&d[q+1]+S<v) v=d[q+1]+S; if(j<nz-1){ if(d[q+nx]+S<v) v=d[q+nx]+S; if(i<nx-1&&d[q+nx+1]+S2<v) v=d[q+nx+1]+S2; if(i>0&&d[q+nx-1]+S2<v) v=d[q+nx-1]+S2; } d[q]=v; }
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
  let cyBase=1e9;                                                // 밑동: 각 정점이 제 자리 바닥(F)보다 −0.03 아래로 안 가게 가장 낮은 정점 기준
  for(const w of W){ const s=cv10Samp(X.rec,x+w[0],z+w[2]), f=base!==undefined?base:s.f; cyBase=Math.min(cyBase,w[1]-f); }
  let fAtBot=0; { let mn=1e9; for(const w of W){ const s=cv10Samp(X.rec,x+w[0],z+w[2]), f=base!==undefined?base:s.f; if(w[1]-f<mn){ mn=w[1]-f; fAtBot=f; } } }
  const y0=-0.03-cyBase, v0=A.p.length/3, P=CVD_PAL[X.kind]||CVD_PAL.talus; let ymx=-1e9, ymn=1e9; for(const w of W){ ymx=Math.max(ymx,y0+w[1]); ymn=Math.min(ymn,y0+w[1]); }
  for(const f of CVD_IF){ const a=W[f[0]], b=W[f[1]], c=W[f[2]];
    let nx=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
    const mx=(a[0]+b[0]+c[0])/3, my=(a[1]+b[1]+c[1])/3, mz=(a[2]+b[2]+c[2])/3, flip=(nx*mx+ny*my+nz*mz)<0;   // 안쪽을 보면 감김을 뒤집는다
    if(flip){ nx=-nx; ny=-ny; nz=-nz; }
    const sh=tone*(0.78+0.32*rnd())*(0.92+0.12*Math.max(0,ny)), pm=rnd()<0.12?0.5:0, o=A.p.length/3;
    for(const w of (flip?[a,c,b]:[a,b,c])){ A.p.push(x+w[0],y0+w[1],z+w[2]); A.n.push(nx,ny,nz);
      A.c.push((P.b[0]*(1-pm)+P.a[0]*pm)*sh,(P.b[1]*(1-pm)+P.a[1]*pm)*sh,(P.b[2]*(1-pm)+P.a[2]*pm)*sh); }
    A.i.push(o,o+1,o+2); A.tr++; }
  return {v0,v1:A.p.length/3,top:ymx,bot:fAtBot-0.03,botF:fAtBot};
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
function cvdCtx(rec){
  const c=rec.c, nx=rec.nx, nz=rec.nz, n=nx*nz, F=rec.F, C=rec.C, Hh=rec.Hh, O=rec.O, M=rec.M;
  const X={rec,c,kind:c.kind,nx,nz,S:rec.S,x0:rec.x0,z0:rec.z0,F,C,Hh,O,M,D:rec.D,seed:c.seed|0,rnd:mulberry32((c.seed^0xdec0)>>>0),
    A:{rock:cvdAcc(),sheet:cvdAcc(),water:cvdAcc(),shr:cvdAcc()}, gw:[], gold:[], items:[], log:[], cnt:{}, picks:[], cols:[], big:[], tri:null};
  const E=X.E=new Uint8Array(n), blocked=new Uint8Array(n); for(let q=0;q<n;q++){ E[q]=C[q]-F[q]>0.3?1:0; blocked[q]=1-E[q]; }
  X.blocked=blocked;
  const cells=[], ceil=X.ceil=new Uint8Array(n);
  for(let j=0;j<nz-1;j++) for(let i=0;i<nx-1;i++){ const q=j*nx+i;
    if(E[q]&&E[q+1]&&E[q+nx]&&E[q+nx+1]){ cells.push(q);
      if(!O[q]&&!O[q+1]&&!O[q+nx]&&!O[q+nx+1]&&Hh[q]-C[q]>=0.8&&Hh[q+1]-C[q+1]>=0.8&&Hh[q+nx]-C[q+nx]>=0.8&&Hh[q+nx+1]-C[q+nx+1]>=0.8) ceil[q]=1; } }
  X.cells=cells;
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
function cvdPick(X,kind,x,y,z,ay,r,it){                          // 딸 것 하나 — it: 이 장식의 정점 범위({acc,v0,v1})
  if(X.picks.length>=CVD.maxPick) return false;
  const idx=X.picks.length, p={kind,x,y,z,ay,key:'CV'+X.seed+'_'+idx,r,tree:false}, item={pick:p,kind,key:p.key,acc:it.acc,v0:it.v0,v1:it.v1,vis:true,saved:null};
  p.cv=item; X.picks.push(p); X.items.push(item); return true;
}
function cvdLog(X,t,x,z,y0,y1,r,ext,ref){ X.cnt[t]=(X.cnt[t]||0)+1; X.log.push({t,x,z,y0,y1,r,ext:!!ext,ref}); }
function cvdBlock(X,x,z,r,y0,y1){ const o={x,z,r,y0,y1,deco:1}; X.cols.push(o); X.big.push(o); }
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
    const it=cvdRev(A,x,y0,z,0,-1,0,len,t=>r0*Math.pow(1-t,1.25)*(1+0.1*Math.sin(t*11+ph))+0,8,6,cf,t=>[lx*t*t,0,lz*t*t]); it.acc=A;
    const tipY=o.c-Lm; cvdLog(X,'stalactite',x,z,y0,tipY,r0); st.push({x,z,L:Lm,r:r0,f:o.f,c:o.c,g,wd:o.wd,d:o.d});
    if(Lm<=0.55&&r0<=0.1&&rnd()<0.4) cvdPick(X,'cvcalcite',x,tipY,z,tipY+0.04,0.18,it); }
  let nstraw=0;
  for(const q of cells){ if(cvdT()) yield; if(!X.ceil[q]||nstraw>=230||!cvdBudget(X,15500)) continue;             // 빨대 종유석 — 평평한 천장에 빽빽이
    cvdAt(X,q,0.5,0.5,o); if(o.sc>0.4||o.c-o.f<2.6) continue;
    if(rnd()>0.22*cvdCluster(X,o.x,o.z,3,2)) continue;
    for(let k=0,m=1+((rnd()*3)|0);k<m;k++){ cvdAt(X,q,rnd(),rnd(),o); const Lm=Math.min(0.1+0.7*Math.pow(rnd(),1.4),o.c-o.f-2.2); if(Lm<0.1) continue;
      const r0=0.006+0.006*rnd(), cf=cvdCol(X,1.05+0.1*rnd(),0.2,rnd()*6), y0=o.c+0.04+Math.min(0.05,r0*o.sc);
      cvdRev(A,o.x,y0,o.z,0,-1,0,Lm+0.04+(y0-o.c-0.04),t=>r0*(1-0.55*t)*(t>=0.999?0:1),5,2,cf); nstraw++; cvdLog(X,'straw',o.x,o.z,y0,o.c-Lm,r0); } }
  /* 석순 — 큰 종유석 밑에 60% · 가끔 혼자 */
  const mk=(x,z,hMax,wantBig)=>{ const s=cv10Samp(X.rec,x,z); if(s.n<=0||s.open) return; const f=s.f, c=s.c, sl=0;
    let h=0.2+2.3*Math.pow(rnd(),1.8); h=Math.min(h,hMax); if(h<0.2) return;
    let r=Math.min(0.45,Math.max(0.1,0.09+h*0.12*(0.6+0.8*rnd()))), wd=X.wd[Math.round((x-X.x0)/X.S)+Math.round((z-X.z0)/X.S)*nx];
    const big=r>0.25;
    if(big&&!(wd>=1.4+r&&s.d>4&&cvdFar(X.big,x,z,2.8))) r=0.24;
    const tone=0.85+0.3*rnd(), ph=rnd()*6, cf=cvdCol(X,tone,0.6,ph), by=0.03+Math.min(0.07,r*0.3), r0=r;
    const it=cvdRev(A,x,f-by,z,0,1,0,h+by,t=>r0*Math.sqrt(Math.max(0,1-Math.pow(t,2.4)))*(1+0.35*Math.pow(1-t,4)),8,6,cf); it.acc=A; cvdLog(X,'stalagmite',x,z,f-by,f+h,r);
    if(r>0.25) cvdBlock(X,x,z,r*1.1,f,f+h); else if(h<=1.0&&rnd()<0.35) cvdPick(X,'cvcalcite',x,f,z,f+h*0.6,Math.max(0.2,r),it); };
  for(const s of st){ if(!cvdBudget(X,19000)) break; if(s.L>0.4&&rnd()<0.6) mk(s.x+(rnd()-0.5)*0.1,s.z+(rnd()-0.5)*0.1,s.g-s.L-0.35,false); }
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
    cvdGrid(B,nodes,cols,[gx,0,gz]); cvdLog(X,'curtain',o.x,o.z,o.c+0.06,o.c-H,W/2); }
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
      for(let k=0,m=2+((rnd()*3)|0);k<m;k++){ const a=1+((rnd()*(NA-2))|0), L=Math.hypot(wn[a][1][0]-wn[a][0][0],wn[a][1][2]-wn[a][0][2])*(0.25+0.5*rnd()), px=arc[a][0]-dx*L, pz=arc[a][1]-dz*L, sm=cv10Samp(X.rec,px,pz), pr=0.02+0.02*rnd();
        if(sm.n>0&&sm.f<yw-0.02) cvdRev(A,px,sm.f+0.005,pz,0,1,0,pr*2,t=>pr*Math.sin(3.1416*Math.min(1,t+0.001)),6,3,()=>[0.93,0.91,0.85]); }
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
    cvdPick(X,'mushroom',o.x,o.f,o.z,o.f+0.08,0.12,{acc:Bs,v0,v1:Bs.p.length/3}); }
}

/* ── 용암굴 — 고드름 · 작은 석순 · 뿌리 ────────────────────────────────────────────────────────────────────── */
function* cvdLavaTeeth(X){
  const rnd=X.rnd, o={}, A=X.A.rock, cells=X.cells; let nt=0;
  for(const q of cells){ if(cvdT()) yield; if(nt>=1300||!cvdBudget(X)) break; if(!X.ceil[q]) continue;                  // 용암 고드름 — 짧은 이빨 꼴, 천장에 빽빽이
    cvdAt(X,q,0.5,0.5,o); if(o.sc>0.8||rnd()>0.24*cvdCluster(X,o.x,o.z,4,4)) continue;
    for(let k=0;k<2;k++){ cvdAt(X,q,rnd(),rnd(),o); const L=0.03+0.12*Math.pow(rnd(),1.3), r0=0.012+0.018*rnd(), y0=o.c+0.03, t=0.7+0.5*rnd();
      cvdRev(A,o.x,y0,o.z,0,-1,0,L+0.03,s=>r0*(1-s),5,1,()=>[0.30*t,0.21*t,0.17*t]); nt++; cvdLog(X,'tooth',o.x,o.z,y0,o.c-L,r0); } }
  let ns=0;
  for(const q of cells){ if(cvdT()) yield; if(ns>=70||!cvdBudget(X)) break;                                          // 작은 용암 석순
    cvdAt(X,q,rnd(),rnd(),o); if(o.sf>0.4||rnd()>0.012) continue;
    const h=0.05+0.15*rnd(), r0=0.02+0.04*rnd(), by=0.03, t=0.8+0.4*rnd();
    cvdRev(A,o.x,o.f-by,o.z,0,1,0,h+by,s=>r0*Math.sqrt(Math.max(0,1-Math.pow(s,2))),6,2,()=>[0.20*t,0.15*t,0.13*t]); ns++; cvdLog(X,'lavamite',o.x,o.z,o.f-by,o.f+h,r0); }
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
    const it=cvdRock(A,X,o.x,o.z,R,0.55+0.4*rnd(),tone*(0.85+0.3*rnd())); it.acc=A; n++; cvdLog(X,'rock',o.x,o.z,it.bot,it.top,R,false,it.botF);
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
function cvdTris(X){
  if(X.tri) return X.tri; const g=X.rec.mesh.geometry, Pp=g.attributes.position.array, Nn=g.attributes.normal.array, I=g.index.array, wall=[], cum=[]; let tot=0;
  for(let t=0;t<I.length;t+=3){ const a=I[t]*3, b=I[t+1]*3, c=I[t+2]*3, ny=(Nn[a+1]+Nn[b+1]+Nn[c+1])/3; if(Math.abs(ny)>0.6) continue;
    const ux=Pp[b]-Pp[a], uy=Pp[b+1]-Pp[a+1], uz=Pp[b+2]-Pp[a+2], vx=Pp[c]-Pp[a], vy=Pp[c+1]-Pp[a+1], vz=Pp[c+2]-Pp[a+2], ar=0.5*Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx);
    tot+=ar; wall.push(t); cum.push(tot); }
  /* 법선이 굴 안쪽을 보는지(부호) — 벽 세모 몇십 개의 안쪽 0.3 m 가 빈 데인지 투표 */
  let vote=0; for(let k=0;k<Math.min(60,wall.length);k++){ const t=wall[(k*wall.length/60)|0], a=I[t]*3, mx=Pp[a], my=Pp[a+1], mz=Pp[a+2], nx=Nn[a], nz=Nn[a+2], s1=cv10Samp(X.rec,mx+nx*0.3,mz+nz*0.3), s2=cv10Samp(X.rec,mx-nx*0.3,mz-nz*0.3);
    const in1=s1.n>0&&my>s1.f&&my<s1.c, in2=s2.n>0&&my>s2.f&&my<s2.c; vote+=(in1?1:0)-(in2?1:0); }
  return X.tri={P:Pp,N:Nn,I,wall,cum,tot,sign:vote>=0?1:-1};
}
function cvdWallPt(X,o){                                          // 벽 세모 하나의 무작위 점 → o.{x,y,z,nx,ny,nz} (굴 안쪽 법선)
  const T=cvdTris(X); if(!T.wall.length) return false; const rnd=X.rnd, r=rnd()*T.tot; let lo=0, hi=T.cum.length-1; while(lo<hi){ const m=(lo+hi)>>1; if(T.cum[m]<r) lo=m+1; else hi=m; }
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
    for(let m=0,mm=3+((rnd()*4)|0);m<mm;m++){ const ox=(rnd()-0.5)*0.35, oy=(rnd()-0.5)*0.35, r=0.03+0.07*rnd();
      const col=kind==='salt'?[0.93,0.92,0.88]:(rnd()<0.5?[0.88,0.86,0.78]:[0.86,0.74,0.26]);
      cvdDisc(A,o.x,o.y,o.z,o.nx,o.ny,o.nz,r,col,ox,oy); }
    made++; cvdLog(X,kind==='salt'?'salt':'flake',o.x+o.nx*0.15,o.z+o.nz*0.15,o.y,o.y,0.1); }
}
function* cvdWallMoss(X,dMax,n){                                   // 입구 쪽 벽 이끼(어스름이 드는 데)
  const rnd=X.rnd, o={}, B=X.A.sheet; let made=0;
  for(let k=0;k<n*8&&made<n&&cvdBudget(X);k++){ if(cvdT()) yield; if(!cvdWallPt(X,o)) return; const s=cv10Samp(X.rec,o.x+o.nx*0.1,o.z+o.nz*0.1); if(s.n<=0||s.d>dMax||o.y<s.f+0.1||o.y>s.c+4) continue;
    if(rnd()>0.9*cvdSS(0,dMax,dMax-s.d)||cvdNoise(X,o.x,o.z,3,6)<0.4) continue;
    cvdMoss(B,X,o.x,o.y,o.z,0.15+0.3*rnd(),0.03+0.05*rnd(),o.nx,o.ny,o.nz); made++; cvdLog(X,'wallmoss',o.x+o.nx*0.15,o.z+o.nz*0.15,o.y,o.y,0.2); }
}

/* ── 입구 — 이마의 덩굴 · 입구 둘레 땅의 고사리 · 이끼 · 너덜 · 굴 안 빛 드는 데 고사리 · 이끼 ─────────────────── */
function* cvdEntrance(X){
  const rnd=X.rnd, o={}, B=X.A.sheet, A=X.A.rock, nx=X.nx, nz=X.nz, E=X.E, O=X.O, S=X.S;
  /* 이마(열린 데와 닫힌 데의 경계)의 늘어진 덩굴 — 닫힌 쪽 천장 칸에서 */
  let nv=0;
  for(let j=1;j<nz-1&&nv<28;j++) for(let i=1;i<nx-1&&nv<28;i++){ if(cvdT()) yield; const q=j*nx+i;
    if(!E[q]||O[q]||X.Hh[q]-X.C[q]<0.8||!(E[q+1]&&O[q+1]||E[q-1]&&O[q-1]||E[q+nx]&&O[q+nx]||E[q-nx]&&O[q-nx])||rnd()>0.4||!cvdBudget(X)) continue;
    const x=X.x0+i*S+(rnd()-0.5)*0.3, z=X.z0+j*S+(rnd()-0.5)*0.3, s=cv10Samp(X.rec,x,z); if(s.n<=0||s.open) continue; const Lm=Math.min(2.5,s.c-s.f-1.9); if(Lm<0.5) continue;
    const v0=B.p.length/3, nb=1+((rnd()*3)|0); let ytip=1e9;
    for(let k=0;k<nb;k++){ const L=0.5+(Lm-0.5)*Math.pow(rnd(),0.9), vx=x+(rnd()-0.5)*0.3, vz=z+(rnd()-0.5)*0.3, sm=cv10Samp(X.rec,vx,vz), cc=sm.n>0?sm.c:s.c, hw=0.025+0.03*rnd(), ph=rnd()*6, an=rnd()*3.1416, sx=Math.cos(an), sz=Math.sin(an), g=0.8+0.4*rnd();
      const nodes=[], cols=[]; for(let a=0;a<=5;a++){ const t=a/5, sw=0.12*Math.sin(t*3+ph)*t, px=vx+sw*sz, pz=vz-sw*sx, py=cc+0.06-L*t; nodes.push([[px-sx*hw,py,pz-sz*hw],[px+sx*hw,py,pz+sz*hw]]); const c=[(0.12+0.1*t)*g,(0.28+0.12*t)*g,(0.07+0.04*t)*g]; cols.push([c,c]); }
      cvdGrid(B,nodes,cols,[sz,0,-sx]); ytip=Math.min(ytip,cc-L); cvdLog(X,'vine',vx,vz,cc+0.06,cc-L,hw); }
    nv++; cvdPick(X,'vine',x,ytip,z,ytip+0.5,0.3,{acc:B,v0,v1:B.p.length/3}); }
  /* 굴 안 빛 드는 데(입구 거리 작음) — 고사리 · 이끼 (용암굴 채광창 밑이 가장 짙다) */
  const dF=X.kind==='lava'?7:X.kind==='shelter'?6:4.5, pF=X.kind==='lava'?0.07:0.035;
  let nf=0, nm=0;
  for(const q of X.cells){ if(cvdT()) yield; if((nf>=34&&nm>=40)||!cvdBudget(X)) break; cvdAt(X,q,rnd(),rnd(),o); if(o.d>10||o.sf>0.6||o.wd<0.1) continue;
    if(nf<34&&o.d<dF&&rnd()<pF){ const sc=0.7+0.7*rnd(), it=cvdFern(B,X,o.x,o.f-0.02,o.z,sc); it.acc=B; nf++; cvdLog(X,'fern',o.x,o.z,o.f,o.f+0.5*sc,0.4*sc); cvdPick(X,'fern',o.x,o.f,o.z,o.f+0.3*sc,0.35*sc,it); }
    else if(nm<40&&rnd()<0.06*(1-o.d/10)){ cvdMoss(B,X,o.x,o.f,o.z,0.15+0.35*rnd(),0.04+0.05*rnd(),0,1,0); nm++; cvdLog(X,'moss',o.x,o.z,o.f,o.f,0.3); } }
  /* 입구 둘레 땅 위(M 바깥 0.7~6 m) — 고사리 · 이끼 · 작은 너덜 */
  let ng=0, nmm=0, nr=0; const gH=X.rec.gH;
  for(let j=1;j<nz-1;j++) for(let i=1;i<nx-1;i++){ if(cvdT()) yield; const q=j*nx+i, d=X.md[q]; if(E[q]||X.M[q]||d<0.7||d>6||!cvdBudget(X)) continue; if(gH&&gH[q]<0.8) continue;
    const r0=rnd(), x=X.x0+(i+rnd()-0.5)*S, z=X.z0+(j+rnd()-0.5)*S; const y=heightAt(x,z);
    if(r0<0.03&&d<5&&ng<26){ const sc=0.8+0.7*rnd(), it=cvdFern(B,X,x,y-0.02,z,sc); it.acc=B; ng++; cvdLog(X,'fern',x,z,y,y+0.5*sc,0.4*sc,true); cvdPick(X,'fern',x,y,z,y+0.3*sc,0.35*sc,it); }
    else if(r0<0.06&&d<5&&nmm<18){ cvdMoss(B,X,x,y,z,0.2+0.4*rnd(),0.05+0.06*rnd(),0,1,0); nmm++; cvdLog(X,'moss',x,z,y,y,0.3,true); }
    else if(r0>0.93&&d>2&&nr<40){ const R=0.07+0.16*rnd(), it=cvdRock(A,X,x,z,R,0.5+0.4*rnd(),0.9+0.2*rnd(),y); it.acc=A; nr++; cvdLog(X,'rubble',x,z,it.bot,it.top,R,true,y);
      if(rnd()<0.4) cvdPick(X,'cvrubble',x,y,z,y+R*0.6,Math.max(0.2,R),it); } }
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
    CVD.tEnd=end; const t1=performance.now(), st=r.decoGen.next(); r.decoMs=(r.decoMs||0)+performance.now()-t1;
    if(st.done){ r.decoGen=null; CVD.cur=null; if(r.deco) r.deco.ms=r.decoMs; }
    if(performance.now()>=end) return;
  }
}
const cv10DecoFlush=()=>cv10DecoRun(1e9);                          // 시험 · 개발자 이동 — 줄 선 것을 전부 끝까지
function* cvdGen(rec){
  const c=rec.c, kind=c.kind;
  rec.cols=rec.cols.filter(o=>!o.deco);
  const X=cvdCtx(rec); yield; X.wd=cvdChamfer(X,X.blocked); yield; X.md=cvdChamfer(X,rec.M); X.blocked=null; yield;
  if(kind==='karst'){ yield* cvdKarstSpeleo(X); yield* cvdKarstFlow(X); yield* cvdGlow(X,12,0.30,8,0.05,420); yield* cvdRoots(X,0.05,10); }
  else if(kind==='lava'){ yield* cvdLavaTeeth(X); yield* cvdRubble(X,(o)=>o.d<7&&o.wd>0.2,0.30,1.0,60,1.0); yield* cvdRoots(X,0.14,40); yield* cvdWallDecals(X,'flake',70); yield* cvdWallDecals(X,'gold',220); }
  else if(kind==='talus'){ yield* cvdRubble(X,(o)=>o.wd>0.15,0.06,1.0,160,1.0); yield* cvdGlow(X,6,0.22,5,0.02,200); yield* cvdWallMoss(X,9,22); yield* cvdRoots(X,0.05,10); }
  else if(kind==='shelter'){ yield* cvdSlabs(X); yield* cvdRubble(X,(o)=>o.d<14&&o.wd>0.2,0.03,0.4,30,1.0); yield* cvdWallDecals(X,'salt',90); yield* cvdWallMoss(X,6,8); }
  yield* cvdEntrance(X);
  if(kind==='karst') yield* cvdWallMoss(X,8,14);
  yield;
  /* 합쳐서 메시로 */
  const mats=CVD.mats, parent=rec.mesh, out=[], accOf=new Map();
  const mk=(A,mat,lr)=>{ if(!A.p.length) return null; const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(A.p,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(A.n,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(A.c,3));
    g.setIndex(A.p.length/3>65535?new THREE.Uint32BufferAttribute(A.i,1):new THREE.Uint16BufferAttribute(A.i,1)); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat); m.matrixAutoUpdate=false; m.userData.cvDeco=1; if(lr) m.userData.lightRole=lr; if(mat===mats.water) m.renderOrder=2; parent.add(m); out.push(m); accOf.set(A,m); return m; };
  mk(X.A.rock,mats.rock); yield; mk(X.A.sheet,mats.sheet); yield; mk(X.A.water,mats.water); yield; mk(X.A.shr,mats.shr,'none');
  if(X.gw.length){ const g=new THREE.BufferGeometry(), P=[], G=[]; for(let k=0;k<X.gw.length;k+=6){ P.push(X.gw[k],X.gw[k+1],X.gw[k+2]); G.push(X.gw[k+3],X.gw[k+4],X.gw[k+5]); }
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aG',new THREE.Float32BufferAttribute(G,3)); g.computeBoundingSphere();
    const pt=new THREE.Points(g,caveGlowMat()); pt.matrixAutoUpdate=false; pt.userData.cvDeco=1; parent.add(pt); out.push(pt); }
  if(X.gold.length){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(X.gold,3)); g.computeBoundingSphere();
    const pt=new THREE.Points(g,mats.gold); pt.matrixAutoUpdate=false; pt.userData.cvDeco=1; parent.add(pt); out.push(pt); }
  for(const it of X.items) it.mesh=accOf.get(it.acc);
  for(const col of X.cols) rec.cols.push(col);
  const tr=X.A.rock.tr+X.A.sheet.tr+X.A.water.tr+X.A.shr.tr;
  rec.deco={meshes:out,items:X.items,log:X.log,cnt:X.cnt,tris:tr,draws:out.length,picks:X.picks,ms:0,cols:X.cols};
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
  rec.decoGen=null; const d=rec.deco; if(!d) return;
  for(const it of d.items){ const k=CV10.picks.indexOf(it.pick); if(k>=0) CV10.picks.splice(k,1); }
  for(const m of d.meshes){ if(m.parent) m.parent.remove(m); m.geometry.dispose(); }
  rec.cols=rec.cols.filter(o=>!o.deco); rec.deco=null;
}
CV10.onBuild.push(cv10Deco); CV10.onDrop.push(cv10DecoDrop);
