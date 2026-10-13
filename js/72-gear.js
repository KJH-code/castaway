/* 72-gear.js — CASTAWAY
   착용품 생김새 — 갑옷·투구·옷·등짐을 사람 몸 좌표로 빚는다(아이콘과 착용 모습)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ── 착용품 생김새 ────────────────────────────────────────────────────────
   갑옷·투구·옷·등짐을 **사람 몸 좌표**(m · 두 발 사이 바닥이 원점 · +y 위 · +z 앞 · +x 왼쪽)로
   빚는다. 아이콘이 이걸 찍고, 나중에 여럿이 할 때 남의 몸에 그대로 입힌다 — 몸은 `GB` 한 벌
   (키 1.75 m · 팔은 17° 벌린 A 자세)이고, 부위마다 묶음에 `userData.bone`(몸통·골반·위팔·
   아래팔·손·머리·넓적다리·정강이·발, 오른쪽은 끝이 R)을 달아 두었으니 뼈를 따라 옮기면 된다.
   왼쪽만 빚고 오른쪽은 x 를 뒤집어 복제한다. 다리처럼 아이콘에 안 넣을 것은 `userData.noIcon`.
   재질은 물리 재질(`gM`) + 하늘 반사 정육면체(`gEnv`) — 쇠는 반사가 생김새의 반이다.
   비늘은 실제로 한 장씩 겹쳐 단다(`gScales` — 윗줄 끝이 아랫줄 머리를 덮도록 바깥으로 젖힌다). */
const GB={ head:new THREE.Vector3(0,1.625,0.012),
  sh:new THREE.Vector3(0.2,1.425,-0.005), el:new THREE.Vector3(0.285,1.155,-0.025), wr:new THREE.Vector3(0.345,0.91,0),
  hip:new THREE.Vector3(0.092,0.905,0), kn:new THREE.Vector3(0.105,0.49,0.012), an:new THREE.Vector3(0.11,0.085,-0.02) };
/* 몸통 단면 — 높이마다 반폭 · 앞 반깊이 · 뒤 반깊이(초타원, 지수 2.6) */
const GB_A=[[0.78,0.178],[0.88,0.170],[0.95,0.153],[1.03,0.142],[1.12,0.149],[1.22,0.160],[1.31,0.166],[1.38,0.168],[1.43,0.150],[1.47,0.105],[1.505,0.062],[1.56,0.058]];
const GB_BF=[[0.78,0.108],[0.88,0.103],[0.95,0.094],[1.03,0.091],[1.12,0.100],[1.22,0.116],[1.31,0.119],[1.38,0.108],[1.43,0.090],[1.47,0.070],[1.505,0.056],[1.56,0.055]];
const GB_BK=[[0.78,0.122],[0.88,0.118],[0.95,0.104],[1.03,0.095],[1.12,0.097],[1.22,0.103],[1.31,0.106],[1.38,0.104],[1.43,0.096],[1.47,0.076],[1.505,0.06],[1.56,0.06]];
function crv(T,x){                       // 표 [[x,y]…] 를 캣멀-롬으로 잇는다
  let i=0; while(i<T.length-2&&x>T[i+1][0]) i++;
  const f=clamp((x-T[i][0])/(T[i+1][0]-T[i][0]),0,1);
  const p0=T[Math.max(0,i-1)][1], p1=T[i][1], p2=T[i+1][1], p3=T[Math.min(T.length-1,i+2)][1];
  return 0.5*(2*p1+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f);
}
/* 몸통 겉 — th 0 이 앞(+z), π/2 가 왼쪽(+x). d 만큼 단면 법선으로 띄운다 */
function gbT(th,y,d,o){
  const a=crv(GB_A,y), c=Math.cos(th), s=Math.sin(th), b=c>=0?crv(GB_BF,y):crv(GB_BK,y);
  const px=Math.pow(Math.abs(s),0.77), pz=Math.pow(Math.abs(c),0.77);
  const x=a*Math.sign(s)*px, z=b*Math.sign(c)*pz;
  const nx=Math.sign(s)*Math.pow(px,1.6)/a, nz=Math.sign(c)*Math.pow(pz,1.6)/b, L=Math.hypot(nx,nz)||1;
  return o.set(x+nx/L*d, y, z+nz/L*d);
}
/* 팔다리 틀 — A→B 축 · phi 0 바깥(+x) · π/2 앞 · -π/2 뒤 · π 몸 쪽 */
function gbLimb(A,B){
  const ax=B.clone().sub(A), len=ax.length(); ax.divideScalar(len);
  const out=new THREE.Vector3(1,0,0).addScaledVector(ax,-ax.x).normalize(), fw=new THREE.Vector3().crossVectors(ax,out);
  return {o:A.clone(), ax, out, fw, len,
    at(ph,t,r,v){ return v.copy(this.o).addScaledVector(this.ax,t).addScaledVector(this.out,Math.cos(ph)*r).addScaledVector(this.fw,Math.sin(ph)*r); },
    cen(p){ const t=_gv.copy(p).sub(this.o).dot(this.ax); return this.o.clone().addScaledVector(this.ax,t); } };
}
const _gv=new THREE.Vector3();
const gHead=(ph,e,rx,ry,rz,o)=>o.set(GB.head.x+rx*Math.cos(e)*Math.sin(ph), GB.head.y+ry*Math.sin(e), GB.head.z+rz*Math.cos(e)*Math.cos(ph));
const cTorso=p=>new THREE.Vector3(0,p.y,0), cHead=()=>GB.head;

/* 격자 곡면 — f(u,v,out) · keep(u,v) 가 거짓인 칸은 뺀다(구멍) · wrap 이면 u 이음매 법선을 맞춘다 */
function gSurf(nu,nv,f,keep,wrap){
  const n=(nu+1)*(nv+1), P=new Float32Array(n*3), U=new Float32Array(n*2), I=[], o=new THREE.Vector3();
  for(let j=0,k=0;j<=nv;j++) for(let i=0;i<=nu;i++,k++){ f(i/nu,j/nv,o); P[k*3]=o.x; P[k*3+1]=o.y; P[k*3+2]=o.z; U[k*2]=i/nu; U[k*2+1]=1-j/nv; }
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ if(keep&&!keep((i+0.5)/nu,(j+0.5)/nv)) continue;
    const a=j*(nu+1)+i, b=a+1, c=a+nu+1, d=c+1; I.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('uv',new THREE.BufferAttribute(U,2));
  g.setIndex(I); g.computeVertexNormals();
  if(wrap){ const N=g.attributes.normal; for(let j=0;j<=nv;j++){ const a=j*(nu+1), b=a+nu;
    const x=N.getX(a)+N.getX(b), y=N.getY(a)+N.getY(b), z=N.getZ(a)+N.getZ(b), l=Math.hypot(x,y,z)||1; N.setXYZ(a,x/l,y/l,z/l); N.setXYZ(b,x/l,y/l,z/l); } }
  return g;
}
const gRow=(S,v,n,u0=0,u1=1)=>{ const a=[]; for(let i=0;i<=n;i++){ const o=new THREE.Vector3(); S(u0+(u1-u0)*i/n,v,o); a.push(o); } return a; };
const gCol=(S,u,n,v0=0,v1=1)=>{ const a=[]; for(let i=0;i<=n;i++){ const o=new THREE.Vector3(); S(u,v0+(v1-v0)*i/n,o); a.push(o); } return a; };
const gLift=(pts,h,cen)=>{ for(const p of pts){ const c=cen(p); _gv.copy(p).sub(c); const l=_gv.length()||1; p.addScaledVector(_gv,h/l); } return pts; };
function gTube(pts,r,mat,closed,rs){
  const cv=new THREE.CatmullRomCurve3(pts,!!closed,'catmullrom',0.5);
  return new THREE.Mesh(new THREE.TubeGeometry(cv,Math.max(8,pts.length*2),r,rs||6,!!closed),mat);
}
/* 쓸어 빚기 — 길을 따라 타원 단면(w 옆 · h 위, up 쪽이 위)을 끌고 간다. 송곳니·턱·끈 */
function gSweep(pts,w,h,mat,up,nu,nv){
  const cv=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.5), T=new THREE.Vector3(), B=new THREE.Vector3(), N=new THREE.Vector3(), p=new THREE.Vector3();
  return new THREE.Mesh(gSurf(nu||24,nv||10,(u,v,o)=>{ cv.getPointAt(u,p); cv.getTangentAt(u,T);
    const U=typeof up==='function'?up(p):up; B.copy(U).addScaledVector(T,-T.dot(U)).normalize(); N.crossVectors(T,B);
    const a=v*Math.PI*2; return o.copy(p).addScaledVector(B,Math.cos(a)*h(u)).addScaledVector(N,Math.sin(a)*w(u)); },null,true),mat);
}
const gPut=(grp,geo,mat,x,y,z)=>{ const m=new THREE.Mesh(geo,mat); m.position.set(x||0,y||0,z||0); grp.add(m); return m; };
/* 곡면 위 한 점의 틀 — 장식(소용돌이·문장)을 접평면에 얹는다 */
function gFrame(S,u,v){
  const p=new THREE.Vector3(), a=new THREE.Vector3(), b=new THREE.Vector3(), e=0.004;
  S(u,v,p); S(u+e,v,a); S(u-e,v,b); const X=a.clone().sub(b).normalize();
  S(u,v-e,a); S(u,v+e,b); const Y=a.clone().sub(b).normalize(); const Z=new THREE.Vector3().crossVectors(X,Y).normalize();
  if(Z.dot(_gv.copy(p).sub(cTorso(p)))<0&&Z.dot(_gv.copy(p).sub(GB.head))<0) Z.negate();
  Y.crossVectors(Z,X).normalize(); return {p,X,Y,Z};
}
const gOn=(F,x,y,lift)=>F.p.clone().addScaledVector(F.X,x).addScaledVector(F.Y,y).addScaledVector(F.Z,lift||0);
/* 소용돌이 덩굴 — 판 가장자리·어깨받이의 금 장식 */
function gScroll(F,size,mat,flip,lift){
  const pts=[], k=flip?-1:1;
  for(let i=0;i<=40;i++){ const t=i/40, a=t*Math.PI*3.4, r=size*(0.12+0.88*t)*0.5; pts.push(gOn(F,k*Math.cos(a)*r,Math.sin(a)*r,lift||0.003)); }
  for(let i=1;i<=10;i++){ const t=i/10; pts.push(gOn(F,k*(size*0.5+size*0.6*t),-size*0.15-size*0.35*t*t,lift||0.003)); }
  return gTube(pts,size*0.05,mat);
}

/* ── 재질 · 그림 ── */
let _gEnv=null;
function gEnv(){                         // 밝은 하늘 · 어두운 땅 · 왼쪽 위 창 — 쇠가 비출 둘레
  if(_gEnv) return _gEnv;
  const S=64, faces=[];
  for(let f=0;f<6;f++){ const cv=document.createElement('canvas'); cv.width=cv.height=S; const g=cv.getContext('2d'), im=g.createImageData(S,S);
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const a=(i+0.5)/S*2-1, b=(j+0.5)/S*2-1; let x,y,z;
      switch(f){ case 0:x=1;y=-b;z=-a;break; case 1:x=-1;y=-b;z=a;break; case 2:x=a;y=1;z=b;break; case 3:x=a;y=-1;z=-b;break; case 4:x=a;y=-b;z=1;break; default:x=-a;y=-b;z=-1; }
      const L=Math.hypot(x,y,z); x/=L; y/=L; z/=L; let r,gg,bb;
      if(y>0){ const t=Math.pow(y,0.55); r=0.74+0.24*t; gg=0.77+0.22*t; bb=0.82+0.18*t; }
      else{ const t=Math.min(1,-y*2.0); r=0.62-0.36*t; gg=0.6-0.36*t; bb=0.57-0.35*t; }
      const k=Math.max(0,-x*0.5+y*0.62+z*0.6), kk=Math.pow(k,36)*2.2+Math.pow(k,5)*0.2, band=Math.exp(-Math.pow((y+0.12)/0.05,2))*0.12;
      const o=(j*S+i)*4; im.data[o]=clamp((r+kk-band)*255,0,255); im.data[o+1]=clamp((gg+kk-band)*255,0,255); im.data[o+2]=clamp((bb+kk*0.95-band)*255,0,255); im.data[o+3]=255; }
    g.putImageData(im,0,0); faces.push(cv); }
  _gEnv=new THREE.CubeTexture(faces); _gEnv.needsUpdate=true; return _gEnv;
}
const _GM={};
function gM(key,c,m,r,ex){               // 물리 재질 하나를 이름으로 나눠 쓴다
  if(_GM[key]) return _GM[key];
  const mt=new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r,envMap:gEnv(),side:THREE.DoubleSide});
  if(ex) ex(mt); return _GM[key]=mt;
}
const _GT={};
function gTex(key,W,H,px,rep){           // px(u,v,rn) → [r,g,b,a] (0..1) 로 그린 그림
  const k=key+(rep?rep.join(','):''); if(_GT[k]) return _GT[k];
  let base=_GT[key+'#'];
  if(!base){ const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'), im=g.createImageData(W,H), rn=mulberry32(hashStr(key));
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=px((x+0.5)/W,(y+0.5)/H,rn,x,y), o=(y*W+x)*4;
      im.data[o]=clamp(c[0]*255,0,255); im.data[o+1]=clamp(c[1]*255,0,255); im.data[o+2]=clamp(c[2]*255,0,255); im.data[o+3]=clamp((c[3]==null?1:c[3])*255,0,255); }
    g.putImageData(im,0,0); base=_GT[key+'#']=new THREE.CanvasTexture(cv); }
  if(!rep) return _GT[k]=base;
  const t=base.clone(); t.needsUpdate=true; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rep[0],rep[1]); return _GT[k]=t;
}
/* 값잡음 — 그림용(격자 n, 씨앗 s) */
function gNoise(n,s){ const r=mulberry32(s), G=[]; for(let i=0;i<(n+1)*(n+1);i++) G.push(r());
  return (u,v)=>{ u=((u%1)+1)%1*n; v=((v%1)+1)%1*n; const i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, a=G[j*(n+1)+i], b=G[j*(n+1)+((i+1)%n)], c=G[((j+1)%n)*(n+1)+i], d=G[((j+1)%n)*(n+1)+((i+1)%n)];
    const su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv); return a+(b-a)*su+(c-a)*sv+(a-b-c+d)*su*sv; }; }
const gTexLeather=rep=>{ const n1=gNoise(8,11), n2=gNoise(32,12), n3=gNoise(64,13);
  return gTex('leather',128,128,(u,v,rn)=>{ const c=0.72+0.16*n1(u,v)+0.1*n2(u,v)-0.14*Math.max(0,n3(u,v*0.5)-0.72)*3+0.05*rn(); return [c,c,c]; },rep); };
const gTexWeave=rep=>gTex('weave',64,64,(u,v,rn,x,y)=>{ const cx=x>>2, cy=y>>2, hor=(cx+cy)&1, f=hor?(y%4)/4:(x%4)/4;
  const c=0.66+0.3*Math.sin(Math.PI*(f*0.9+0.05))+0.08*(rn()-0.5); return [c,c,c]; },rep);
const gTexFur=rep=>gTex('fur',128,64,(u,v,rn,x,y)=>{ const s=Math.sin(x*0.9+Math.sin(y*0.35)*3)*0.5+0.5; const c=0.55+0.35*s*(0.6+0.4*rn())+0.1*rn(); return [c,c*0.97,c*0.93]; },rep);
const gTexBone=rep=>{ const n1=gNoise(6,21), n2=gNoise(40,22);
  return gTex('bone',128,128,(u,v,rn)=>{ let c=0.82+0.12*n1(u,v)+0.06*n2(u,v)-(rn()<0.03?0.18:0); const cr=Math.abs(n1(u*1.7+0.3,v*1.3)-0.5); if(cr<0.012) c-=0.25; return [c,c*0.97,c*0.9]; },rep); };
const gTexHair=rep=>gTex('hair',128,32,(u,v,rn,x)=>{ const r=mulberry32(x*7+3)(); const c=0.55+0.45*r*(0.85+0.15*Math.sin(v*9+r*6)); return [c,c,c]; },rep);
const gTexStraw=rep=>gTex('straw',64,64,(u,v,rn,x,y)=>{ const cy=(y>>3), off=(cy&1)*4, cx=((x+off)>>3), f=((x+off)%8)/8, g=(y%8)/8;
  const c=0.6+0.32*Math.sin(Math.PI*g)*(0.75+0.25*Math.sin(Math.PI*f))+0.06*(rn()-0.5)-((cx+cy)&1)*0.06; return [c,c,c]; },rep);
/* 비늘 한 장의 그림 — 가장자리 어둡고 얇은 테가 빛나며 가운데 등줄이 선다 · 잿불은 가장자리가 달아오른다 */
function gTexScale(kind){ const hw=gScaleHW(kind), nz=gNoise(16,31+kind.length);
  return gTex('scale_'+kind,64,96,(u,v)=>{ const xn=Math.abs(u-0.5)*2, e=Math.min(1-xn,(1-v)*2.4);
    let c=0.5+0.5*smoothstep(0,0.32,e)+0.22*Math.exp(-Math.pow((e-0.035)/0.03,2));
    c+=0.14*Math.exp(-Math.pow(xn/0.13,2))*smoothstep(0.15,0.55,v)*(1-v); c*=0.9+0.12*nz(u,v*0.66);
    const rim=Math.exp(-Math.pow(e/0.04,2))*smoothstep(0.25,0.6,v);           // 드러난 아랫단만 · 1~2 화소
    if(kind==='ember_glow') return [rim,rim,rim];
    if(kind==='ember'){ const b=0.075*c; return [b+0.78*rim,b+0.05*rim,b+0.04*rim]; }
    return [c,c,c]; }); }
const gTexHex=()=>gTex('hex',64,64,(u,v)=>{ const s=10, x=u*s, y=v*s*1.15, r=Math.floor(y), xx=x+(r&1)*0.5, cx=xx-Math.floor(xx)-0.5, cy=y-r-0.5, d=Math.hypot(cx,cy*1.1);
  const c=0.35+0.65*(1-smoothstep(0.25,0.5,d)); return [c,c,c]; });
const gTexFeather=()=>{ const n1=gNoise(16,51), n2=gNoise(48,52);
  return gTex('feather',64,256,(u,v)=>{ const x=Math.abs(u-0.5)*2, w=Math.pow(Math.sin(Math.PI*Math.min(1,v*1.04)),0.4);
    if(x<0.03&&v<0.97) return [0.95,0.95,0.93,1];
    const edge=w*(0.62+0.5*n1(v*3,x*1.5+(u<0.5?0:0.5))), gap=n2(v*5,x*2+(u<0.5?0:0.37));
    const c=0.8+0.16*Math.sin(v*150-x*34+6*n1(v*2,x))+0.04*gap;
    return [c,c,c*0.98,x<edge&&gap<0.8?1:0]; }); };

/* 덩굴띠 — 위아래 테 · 굽이치는 줄기 · 말려 나온 소용돌이(참고 그림의 청동 가장자리). 띠 길이에 맞춰 rep 번 되풀이 */
function gTexFil(rep){ const key='fil'+rep;
  if(_GT[key]) return _GT[key];
  let base=_GT['fil#'];
  if(!base){ const cv=document.createElement('canvas'); cv.width=128; cv.height=32; const g=cv.getContext('2d');
    g.fillStyle='#5a5a5a'; g.fillRect(0,0,128,32); g.strokeStyle='#f4f4f4'; g.lineCap='round';
    g.lineWidth=2.4; g.beginPath(); g.moveTo(0,3); g.lineTo(128,3); g.moveTo(0,29); g.lineTo(128,29); g.stroke();
    g.lineWidth=2; g.beginPath(); for(let x=0;x<=128;x++){ const y=16+7*Math.sin(x/128*Math.PI*2); x?g.lineTo(x,y):g.moveTo(x,y); } g.stroke();
    for(const [cx,cy,k] of [[30,12,1],[94,20,-1],[62,22,1],[126,10,-1],[-2,10,-1]]){ g.beginPath(); for(let i=0;i<=30;i++){ const a=i/30*Math.PI*2.3, r=1+5*i/30; g.lineTo(cx+Math.cos(a)*r*k,cy+Math.sin(a)*r); } g.stroke(); }
    base=_GT['fil#']=new THREE.CanvasTexture(cv); }
  const t=base.clone(); t.needsUpdate=true; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rep,1); return _GT[key]=t; }
const gFilM=rep=>gM('fil'+rep,0xc49a62,0.9,0.36,m=>{ m.map=gTexFil(rep); });

/* 쓰는 재질 */
const GMT={
  steel:()=>gM('steel',0xd5d9de,0.94,0.2),
  steelD:()=>gM('steelD',0x9aa0a8,0.9,0.32),
  gold:()=>gM('gold',0xe0ad52,1,0.26),
  bronze:()=>gM('bronze',0xcc9a54,1,0.3),
  iron:()=>gM('iron',0x8e8a84,0.85,0.42),
  dark:()=>gM('dark',0x050505,0,1,m=>{ m.envMap=null; m.side=THREE.FrontSide; }),
  leather:(c,k)=>gM('lea'+c+(k||''),c,0,0.62,m=>{ m.map=gTexLeather(k||[2,2]); }),
  cloth:(c,rep)=>gM('clo'+c+rep,c,0,0.92,m=>{ m.map=gTexWeave(rep); m.envMapIntensity=0.3; }),
  fur:(c)=>gM('fur'+c,c,0,1,m=>{ m.map=gTexFur([3,1]); m.envMapIntensity=0.15; }),
  bone:()=>gM('bone',0xe2d8bc,0,0.5,m=>{ m.map=gTexBone([1,1]); }),
  chitin:()=>gM('chitin',0x34483c,0.35,0.2),
  chitinE:()=>gM('chitinE',0x7fa486,0.4,0.22),
  blackM:()=>gM('blackM',0x2a2522,0.85,0.3),
  glow:()=>gM('emglow',0x1a0402,0.2,0.4,m=>{ m.emissive=new THREE.Color(0xff3010); m.emissiveIntensity=1.0; }),
};

/* ── 비늘 ── */
function gScaleHW(kind){ return kind==='lam'
  ? v=>v<0.12?0.5*Math.sqrt(Math.max(0,1-Math.pow((0.12-v)/0.14,2))):(v<0.8?0.5:0.5-(v-0.8)/0.2*0.14)
  : v=>v<0.36?0.5*Math.sqrt(Math.max(0,1-Math.pow((0.36-v)/0.44,2))):0.5*(1-Math.pow((v-0.36)/0.64,1.7)); }
const _GSG={};
function gScaleGeo(kind){                // 폭 1 · 머리 y 0 → 끝 y -1 · 바깥 +z 로 봉긋
  if(_GSG[kind]) return _GSG[kind];
  const lam=kind==='lam', hw=gScaleHW(kind==='dropL'?'drop':kind), blade=kind==='blade', lo=kind==='dropL';
  let geo;
  if(blade){ geo=new THREE.BoxGeometry(1,1,0.22,1,3,1); geo.translate(0,-0.5,0); }
  else geo=gSurf(lo?2:5,lo?3:7,(u,v,o)=>{ const xn=(u-0.5)*2, w=hw(v); let y=-v; if(lam) y+=0.1*xn*xn*smoothstep(0.75,1,v);
    const z=(lam?0.16:0.12)*(1-xn*xn)*smoothstep(-0.05,0.4,v)+(lam?0.035:0.03)*Math.exp(-Math.pow(xn/0.18,2))*smoothstep(0.1,0.6,v)+0.05*v*v;
    return o.set(xn*w,y,z); });
  geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));
  return _GSG[kind]=geo;
}
function gScaleMat(kind){
  return {
    bronze:()=>gM('sc_bronze',0xd09a50,1,0.28,m=>{ m.map=gTexScale('drop'); m.vertexColors=true; }),
    iron:()=>gM('sc_iron',0x908b84,0.88,0.4,m=>{ m.map=gTexScale('drop'); m.vertexColors=true; }),
    ember:()=>gM('sc_ember',0xffffff,0.45,0.22,m=>{ m.map=gTexScale('ember'); m.vertexColors=true; m.emissive=new THREE.Color(0xff2a12); m.emissiveMap=gTexScale('ember_glow'); m.emissiveIntensity=0.8; }),
    chitin:()=>gM('sc_chitin',0x3c5444,0.35,0.18,m=>{ m.map=gTexScale('lam'); m.vertexColors=true; }),
    straw:()=>gM('sc_straw',0xffffff,0,0.85,m=>{ m.vertexColors=true; m.envMapIntensity=0.25; }),
  }[kind]();
}
/* 겉면 P(s,t,d,out) — s 가로(둘레) 0..1 · t 세로 0(위)..1(아래) · d 띄움.
   줄마다 둘레를 재 장수를 정하고, 홀수 줄은 반 칸 민다. 장마다 겉면 법선으로 세우고 끝을 tilt 만큼 젖힌다 */
function gScales(P,o){
  const t0=o.t0||0, t1=o.t1==null?1:o.t1, lift=o.lift==null?0.004:o.lift, tilt=o.tilt==null?0.22:o.tilt, rn=mulberry32(o.seed||7);
  const A=new THREE.Vector3(), B=new THREE.Vector3(), C=new THREE.Vector3(), N=new THREE.Vector3(), D=new THREE.Vector3(), X=new THREE.Vector3(), Y=new THREE.Vector3(), Q=new THREE.Vector3();
  const M=64, tl=[0]; let L=0; P(0.5,t0,0,A);
  for(let i=1;i<=M;i++){ P(0.5,t0+(t1-t0)*i/M,0,B); L+=A.distanceTo(B); tl.push(L); A.copy(B); }
  const nr=Math.max(1,Math.round(L/o.row)), items=[];
  for(let r=0;r<=nr;r++){ const tg=L*r/nr; let i=0; while(i<M-1&&tl[i+1]<tg) i++;
    const t=t0+(t1-t0)*(i+clamp((tg-tl[i])/((tl[i+1]-tl[i])||1),0,1))/M;
    let C0=0; P(0,t,0,A); for(let k=1;k<=48;k++){ P(k/48,t,0,B); C0+=A.distanceTo(B); A.copy(B); }
    const wr=typeof o.wrap==='function'?o.wrap(t):o.wrap!==false, nc=Math.max(1,Math.round(C0/o.col));
    for(let k=0;k<=nc;k++){ const s=(k+0.5*(r&1))/nc; if(wr&&k===nc) break; if(s>1.0001) continue;
      if(o.skip&&o.skip(s,t)) continue; items.push(s,t); } }
  const cnt=items.length/2, im=new THREE.InstancedMesh(o.geo,o.mat,cnt), m4=new THREE.Matrix4(), col=new THREE.Color(), e=1e-3;
  for(let n=0;n<cnt;n++){ const s=items[n*2], t=items[n*2+1];
    P(s,t,0,A); P(s+e,t,0,B); P(s-e,t,0,C); X.subVectors(B,C);
    P(s,Math.min(1,t+e),0,B); P(s,Math.max(0,t-e),0,C); D.subVectors(B,C).normalize();
    N.crossVectors(X,D).normalize(); P(s,t,0.01,Q); Q.sub(A); if(N.dot(Q)<0) N.negate();
    Y.copy(D).negate().addScaledVector(N,D.dot(N)).normalize(); X.crossVectors(Y,N).normalize();
    const a=tilt*(0.8+0.4*rn()), ca=Math.cos(a), sa=Math.sin(a), g=(rn()-0.5)*(o.twist||0.14), cg=Math.cos(g), sg=Math.sin(g);
    const Y2=Y.clone().multiplyScalar(ca).addScaledVector(N,-sa), Z2=N.clone().multiplyScalar(ca).addScaledVector(Y,sa);
    const X3=X.clone().multiplyScalar(cg).addScaledVector(Y2,sg), Y3=Y2.clone().multiplyScalar(cg).addScaledVector(X,-sg);
    const k=(0.94+0.12*rn())*(o.size?o.size(s,t):1), ww=o.w*k, hh=o.h*k*(o.hj?(1-o.hj/2+o.hj*rn()):1);
    P(s,t,lift,A); m4.makeBasis(X3.multiplyScalar(ww),Y3.multiplyScalar(hh),Z2.multiplyScalar(ww*(o.zk||1))); m4.setPosition(A); im.setMatrixAt(n,m4);
    const b=0.84+0.24*rn(); col.setRGB(b,b,b); if(o.tint) o.tint(col,rn,s,t); im.setColorAt(n,col); }
  im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true;
  return im;
}

/* ── 묶음 ── */
function gBone(g,name){ const b=new THREE.Group(); b.userData.bone=name; g.add(b); return b; }
function gMirror(g,side){                // 왼쪽 묶음을 x 로 뒤집어 오른쪽을 만든다
  const r=side.clone(); r.scale.x=-1; r.traverse(o=>{ if(o.userData.bone) o.userData.bone=o.userData.bone.replace(/L$/,'R'); }); g.add(r); return r; }
const gHide=o=>{ o.userData.noIcon=true; return o; };
const gHideNew=(grp,fn)=>{ const n=grp.children.length; fn(); grp.children.slice(n).forEach(gHide); };
/* 팔 겉 — 위팔 틀에서 어깨 위(t<0)로 둥글게 덮어 올라가다 몸 쪽은 터 둔다 */
const gFU=()=>gbLimb(GB.sh,GB.el), gFL=()=>gbLimb(GB.el,GB.wr), gFT=()=>gbLimb(GB.hip,GB.kn), gFS=()=>gbLimb(GB.kn,GB.an);
function gRev(F,t0,t1,rf,p0,p1,nu,nv){
  const wrap=Math.abs(p1-p0-2*Math.PI)<1e-6;
  return gSurf(nu||36,nv||8,(u,v,o)=>{ const t=t0+(t1-t0)*v, ph=p0+(p1-p0)*u; return F.at(ph,t,rf(t,ph),o); },null,wrap);
}
const gRing=(F,t,r,p0,p1,n)=>{ const a=[]; for(let i=0;i<=n;i++){ const ph=p0+(p1-p0)*i/n; a.push(F.at(ph,typeof t==='function'?t(ph):t,typeof r==='function'?r(ph):r,new THREE.Vector3())); } return a; };

/* 판금 띠 하나(팔다리 둘레) — 말린 가장자리 · 금테.
   o.keel 바깥 가운데(pc)를 접어 세운 능선(|phi| 에 꺾이는 천막꼴이라 날이 선다) · o.point 아랫단 가운데를 뾰족하게(갈매기) ·
   o.curl 끝을 바깥으로 젖힘 · o.flare 아래로 벌어짐 */
function gBand(grp,F,t0,t1,r0,r1,p0,p1,mat,trim,o){
  o=o||{}; const wrap=Math.abs(p1-p0-2*Math.PI)<1e-6, flare=o.flare||0, pc=o.pc||0, n=o.nu||40;
  const kl=ph=>(o.keel?o.keel*Math.max(0,1-Math.abs(ph-pc)/(o.keelW||0.7)):0)+(o.side?o.side*Math.max(0,1-Math.abs(Math.abs(ph-pc)-1.15)/0.3):0);
  const tb=ph=>t1+(o.point?o.point*Math.max(0,1-Math.abs(ph-pc)/(o.pointW||0.9)):0);
  const rf=(t,ph)=>{ const f=(t-t0)/(tb(ph)-t0); return r0+(r1-r0)*f+flare*f*f+kl(ph)+(o.curl||0)*smoothstep(0.7,1,f)+(o.bump?o.bump(t,ph):0); };
  const S=(u,v,out)=>{ const ph=p0+(p1-p0)*u, t=t0+(tb(ph)-t0)*v; return F.at(ph,t,rf(t,ph),out); };
  grp.add(new THREE.Mesh(gSurf(n,o.nv||6,S,null,wrap),mat));
  grp.add(gTube(gRow(S,1,n),0.0045,mat,wrap)); grp.add(gTube(gRow(S,0,n),0.0035,mat,wrap));
  if(!wrap) for(const u of [0,1]) grp.add(gTube(gCol(S,u,6),0.0035,mat));
  if(trim){ const a=[]; for(let i=0;i<=n;i++){ const ph=p0+(p1-p0)*i/n, t=tb(ph)-0.012; a.push(F.at(ph,t,rf(t,ph)+0.0025,new THREE.Vector3())); } grp.add(gTube(a,0.0022,trim,wrap)); }
}
/* 어깨받이(참고 그림의 은빛 기사) — 넓고 네모진 큰 판 하나: 위는 거의 평평하고 바깥·앞·뒤로 각지게 꺾여 내려온다
   (초타원 껍질 · 가로 지수 4.6 · 세로 3.8 — 위가 평평하고 모서리가 꺾인다 · 아랫단은 바깥으로 젖힌다). 목 쪽 가장자리는 위로 젖힌 입술 · 가장자리를 따라 굵은 말림과 청동 덩굴띠(o.fil) ·
   앞 아래 모서리에 소용돌이(o.scroll) · 그 밑에 띠 하나(o.lames) · 키틴은 뒤로 휜 뿔(o.horns) */
function gPauldron(grp,mat,trim,o){
  o=o||{}; const k=o.k||1, C=new THREE.Vector3(0.212-0.06*(1-k),1.432,-0.004), AX=0.125*k, AY=0.1*k, AZ=0.13*k, n=4.6, m=3.8;
  const S=(x,e)=>Math.sign(x)*Math.pow(Math.abs(x),e);
  const eLow=ps=>{ const a=Math.abs(ps); return lerp(lerp(-0.9,-0.64,smoothstep(0.22*Math.PI,0.5*Math.PI,a)),0.72,smoothstep(0.6*Math.PI,0.88*Math.PI,a)); };
  const P=(ps,e,d,out)=>{ const ce=Math.cos(e), el=eLow(ps), lip=0.026*smoothstep(0.6*Math.PI,0.88*Math.PI,Math.abs(ps))*Math.max(0,1-(e-el)/0.4);
    return out.set(C.x+(AX+d)*S(ce,2/m)*S(Math.cos(ps),2/n), C.y+(AY+d)*S(Math.sin(e),2/m)+lip, C.z+(AZ+d)*S(ce,2/m)*S(Math.sin(ps),2/n)); };
  const fl=(ps,e)=>0.014*Math.pow(smoothstep(eLow(ps)+0.3,eLow(ps),e),2);           // 아랫단 젖힘
  const M=(u,v,out)=>{ const ps=(u-0.5)*2*Math.PI, e=Math.PI/2+(eLow(ps)-Math.PI/2)*v; return P(ps,e,fl(ps,e),out); };
  const band=(e0,e1,d)=>(u,v,out)=>{ const ps=(u-0.5)*2*Math.PI, e=eLow(ps)+e0+(e1-e0)*v; return P(ps,e,d+fl(ps,e),out); };
  grp.add(new THREE.Mesh(gSurf(80,22,M,null,true),mat));
  grp.add(gTube(gRow(M,1,120),0.0065,mat,true));
  if(o.fil) grp.add(new THREE.Mesh(gSurf(120,2,band(0.38,0.15,0.003),null,true),gFilM(20)));
  else if(trim) grp.add(gTube(gRow(band(0.1,0.1,0.003),0,120),0.0026,trim,true));
  if(o.scroll){ const Fr=gFrame(M,0.71,0.66); Fr.Z.copy(_gv.copy(Fr.p).sub(C).normalize()); Fr.Y.crossVectors(Fr.Z,Fr.X).normalize(); grp.add(gScroll(Fr,0.045,trim,false,0.004)); }
  if(o.lames!==0) gBand(grp,gFU(),0.085,0.142,0.072,0.072,-0.7*Math.PI,0.7*Math.PI,mat,trim,{flare:0.012,curl:0.004,nu:44});
  if(o.horns) [[0.12,0.78,0.11],[-0.32,0.42,0.075]].forEach(([ps,e,L])=>{ const p=P(ps,e,-0.004,new THREE.Vector3()), r=p.clone().sub(C).normalize();
    const d=r.multiplyScalar(0.55).add(_gv.set(0,0.75,-0.15)).normalize(), B=new THREE.Vector3(0,0,-1), D=new THREE.Vector3(0,-1,0);
    const pts=[p.clone(),p.clone().addScaledVector(d,L*0.4),p.clone().addScaledVector(d,L*0.72).addScaledVector(B,L*0.22),p.clone().addScaledVector(d,L*0.88).addScaledVector(B,L*0.55).addScaledVector(D,L*0.08)];
    grp.add(gSweep(pts,u=>0.013*(1-u)+0.0012,u=>0.013*(1-u)+0.0012,mat,new THREE.Vector3(1,0,0),16,8)); });
}
/* 팔꿈치(참고 그림) — 뒤를 감싼 컵 + 바깥에 뒤로 뾰족한 화살촉꼴 큰 날개(가운데가 솟은 각뿔 · 굵은 말림 · 덩굴띠).
   o.fil 청동 덩굴띠 · o.spike 팔꿈치 끝 가시 */
function gCouter(grp,mat,trim,o){
  o=o||{}; const F=gFU(), el=F.len;
  const cup=(u,v,out)=>{ const ph=-0.98*Math.PI+1.15*Math.PI*u, t=el-0.055+0.11*v, r=0.066*Math.sqrt(Math.max(0.02,1-Math.pow((t-el)/0.062,2))); return F.at(ph,t,r+0.012*Math.exp(-Math.pow((ph+Math.PI/2)/0.5,2))*(1-Math.pow((t-el)/0.06,2)),out); };
  grp.add(new THREE.Mesh(gSurf(28,12,cup),mat)); grp.add(gTube(gCol(cup,0,12),0.004,mat)); grp.add(gTube(gCol(cup,1,12),0.004,mat));
  const OL=[[0.044,0.004],[0.004,-0.068],[-0.112,0.036],[-0.014,0.064]];         // (앞, 팔 아래) 꼭짓점 — 앞 · 위 · 뒤 끝 · 아래
  const ol=a=>{ a=((a%1)+1)%1; const q=a*4, k=Math.floor(q)%4, f=q-Math.floor(q), A=OL[k], B=OL[(k+1)%4]; return [A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f]; };
  const W=(u,v,out)=>{ const [x,y]=ol(u); return out.copy(F.o).addScaledVector(F.ax,el+y*v).addScaledVector(F.fw,x*v).addScaledVector(F.out,0.071+0.026*Math.pow(1-v,1.2)-0.008*v*v); };
  grp.add(new THREE.Mesh(gSurf(64,10,W,null,true),mat)); grp.add(gTube(gRow(W,1,96),0.0045,mat,true));
  if(o.fil) grp.add(new THREE.Mesh(gSurf(96,1,(u,v,out)=>{ W(u,0.72+0.14*v,out); return out.addScaledVector(F.out,0.0025); },null,true),gFilM(8)));
  else if(trim) grp.add(gTube(gRow(W,0.8,96).map(p=>p.addScaledVector(F.out,0.002)),0.0024,trim,true));
  if(trim){ const a=[]; for(let i=0;i<=8;i++){ const p=new THREE.Vector3(); W(0.5,i/8*0.95,p); a.push(p.addScaledVector(F.out,0.002)); } grp.add(gTube(a,0.0026,trim)); }
  if(o.spike){ const p=F.at(-Math.PI/2,el,0.074,new THREE.Vector3()), d=F.fw.clone().negate().multiplyScalar(0.8).addScaledVector(F.ax,0.6).normalize();
    const c=gPut(grp,new THREE.ConeGeometry(0.0085,0.04,10),mat); c.position.copy(p).addScaledVector(d,0.016); c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d); }
}
/* 잎꼴 장식 — 가운데 줄기 · 뾰족한 잎 둘레 · 밑에 소용돌이 둘(아래팔 바깥 · 참고 그림) */
function gFleur(grp,F,s,mat){
  const L=pts=>grp.add(gTube(pts.map(([x,y])=>gOn(F,x*s,y*s,0.003)),0.05*s,mat));
  L([[0,-0.95],[0,0],[0,0.95]]);
  for(const k of [-1,1]) L(Array.from({length:13},(_,i)=>{ const t=i/12; return [k*0.4*Math.sin(Math.PI*t)*(1-0.35*t),-0.85+1.8*t]; }));
  for(const k of [-1,1]) grp.add(gScroll({p:gOn(F,k*0.28*s,-0.98*s,0),X:F.X,Y:F.Y,Z:F.Z},0.5*s,mat,k<0,0.003));
}
/* 무릎 덮개 — 무릎 앞 둥근 판 · 바깥 마름모 날개 · spike 면 가운데 가시 (아이콘엔 안 넣는다) */
function gKnee(grp,mat,trim,spike){
  const F=gFT(), kc=(u,v,o)=>{ const a=(u-0.5)*2.6, b=(v-0.5)*2.6; return F.at(Math.PI/2+a*0.55,F.len+b*0.035,0.068+0.02*Math.max(0,1-(a*a+b*b)*0.4),o); };
  grp.add(gHide(new THREE.Mesh(gSurf(18,14,kc),mat)));
  const rim=[...gRow(kc,0,12),...gCol(kc,1,12).slice(1),...gRow(kc,1,12).reverse().slice(1),...gCol(kc,0,12).reverse().slice(1,-1)];
  grp.add(gHide(gTube(rim,0.0038,trim||mat,true)));
  const wing=(u,v,o)=>{ const a=(u-0.5)*2, b=(v-0.5)*2, rr=Math.max(0,1-Math.abs(a)-Math.abs(b)); return F.at(0.1+a*0.45,F.len+b*0.05,0.072+0.018*rr,o); };
  grp.add(gHide(new THREE.Mesh(gSurf(16,16,wing,(u,v)=>Math.abs((u-0.5)*2)+Math.abs((v-0.5)*2)<1),mat)));
  if(spike){ const p=F.at(Math.PI/2,F.len,0.086,new THREE.Vector3()); const c=gPut(grp,new THREE.ConeGeometry(0.008,0.035,10),mat); c.position.copy(p).addScaledVector(F.fw,0.014); c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),F.fw); gHide(c); }
}
/* 발 — 발등을 덮는 판(lines 면 마디 줄) · 장화면 발목 위로 목을 올린다 */
function gFoot(grp,mat,lines,boot){
  const foot=(u,v,o)=>{ const a=(u-0.5)*2, w=0.048*(1-0.55*Math.pow(v,3)), h=0.082*Math.pow(1-v,0.55)+0.012, z=lerp(-0.075,0.2,v);
    return o.set(GB.an.x+a*w, 0.012+h*Math.sqrt(Math.max(0,1-a*a)), GB.an.z+z); };
  grp.add(gHide(new THREE.Mesh(gSurf(16,24,foot),mat)));
  if(lines) for(let k=1;k<6;k++) grp.add(gHide(gTube(gRow(foot,k/6.5,16),0.0028,lines)));
  if(boot){ const F=gFS(); grp.add(gHide(new THREE.Mesh(gSurf(24,4,(u,v,o)=>F.at(u*2*Math.PI,0.27+0.15*v,0.056-0.008*v,o),null,true),mat)));
    grp.add(gHide(gTube(gRing(F,0.27,0.058,0,Math.PI*2,24),0.008,mat,true))); }
}

/* 강철 판금·강철 투구 — 사용자가 준 모형(Meshy 'Plumed Sentinel', 18.6만 → 4.7만 삼각형으로 줄임)을 그대로 입힌다.
   `SENTINEL` 은 정점 자리를 16비트로 눌러 담고(경계 min·max), 삼각형은 [투구 nh · 쇠 · 천 nc] 차례로 담았다.
   몸 좌표(GB)와 같다 — 발바닥 y 0 · 키 1.75 m · +z 앞. 갈래는 자리로 나눴다: 투구 = 목(1.50 m) 위 머리 둘레,
   천 = 허리(0.97) 밑에서 다리 축 0.1 m 밖(겉옷자락). 바탕그림이 없는 모형이라 빛깔은 재질로만 준다. */
let _sentG=null;
function gSentinelGeo(){
  if(_sentG) return _sentG;
  const S=SENTINEL, dec=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0)).buffer, q=new Uint16Array(dec(S.p)), I=new Uint32Array(dec(S.i));
  const P=new Float32Array(q.length); for(let i=0;i<q.length;i++){ const k=i%3; P[i]=S.min[k]+(S.max[k]-S.min[k])*q[i]/65535; }
  const pos=new THREE.BufferAttribute(P,3), all=new THREE.BufferGeometry(); all.setAttribute('position',pos); all.setIndex(new THREE.BufferAttribute(I,1)); all.computeVertexNormals();
  const sub=(a,b)=>{ const g=new THREE.BufferGeometry(); g.setAttribute('position',pos); g.setAttribute('normal',all.attributes.normal); g.setIndex(new THREE.BufferAttribute(I.slice(a*3,b*3),1));
    const bb=new THREE.Box3(), v=new THREE.Vector3(); for(let k=a*3;k<b*3;k++) bb.expandByPoint(v.fromBufferAttribute(pos,I[k])); g.boundingBox=bb; g.boundingSphere=bb.getBoundingSphere(new THREE.Sphere()); return g; };   // 정점을 나눠 써서 경계는 제 삼각형으로 잰다
  const G={}; for(const k in S.r) G[k]=sub(S.r[k][0],S.r[k][1]); return _sentG=G;
}
function gPlate(g){ const G=gSentinelGeo(), b=gBone(g,'chest');
  b.add(new THREE.Mesh(G.u,GMT.steel())); b.add(gHide(new THREE.Mesh(G.l,GMT.steel()))); b.add(gHide(new THREE.Mesh(G.c,GMT.cloth(0xece8e0,[1,1])))); }
/* 모형에서 떼어 낸 왼 어깨받이(pl)·왼 팔꿈치(el) — 다른 갑옷이 같은 구조를 쓴다(오른쪽은 gMirror).
   팔꿈치는 모형의 팔꿈치(E)를 몸 GB.el 로 옮긴다. scale 이면 그 겉에 비늘을 덮는다 */
function gSentPiece(grp,name,mat,scale){
  const G=gSentinelGeo()[name], m=new THREE.Mesh(G,mat);
  if(name==='el') m.position.set(GB.el.x-SENTINEL.E[0],GB.el.y-SENTINEL.E[1],GB.el.z-SENTINEL.E[2]);
  grp.add(m); if(scale){ const s=gScalesOnMesh(G,scale.mat,scale.geo,scale.d||0.021,7+name.length); s.position.copy(m.position); grp.add(s); }
  return m;
}
/* 곡면 식이 없는 모형 겉에 비늘을 단다 — 넓이에 비례해 점을 뽑고(서로 d 안이면 버림), 바깥을 향한 면에만
   면 법선으로 세운다. 위쪽은 세계 +y(눕힌 면이면 바깥쪽)로 잡아 끝이 아래로 늘어지게 한다 */
const SCALE_FILL_R=0.7;
function gScalesOnMesh(G,mat,sgeo,d,seed){
  const P=G.attributes.position, I=G.index.array, rn=mulberry32(seed), A=new THREE.Vector3(), B=new THREE.Vector3(), C=new THREE.Vector3(), N=new THREE.Vector3();
  const cen=G.boundingBox.getCenter(new THREE.Vector3()), tri=[], cum=[]; let tot=0;
  for(let k=0;k<I.length;k+=3){ A.fromBufferAttribute(P,I[k]); B.fromBufferAttribute(P,I[k+1]); C.fromBufferAttribute(P,I[k+2]);
    N.subVectors(B,A).cross(_gv.subVectors(C,A)); const ar=N.length()/2; if(ar<1e-9) continue; N.normalize();
    const m=A.clone().add(B).add(C).divideScalar(3), out=m.clone().sub(cen); out.y*=0.3; if(N.dot(out)<0) N.negate();
    if(N.dot(out.normalize())<-0.2) continue; tot+=ar; tri.push([k,N.clone()]); cum.push(tot); }
  /* 줄 맞추기 — 점을 부위 축(몸통 · 두 다리 · 두 팔) 둘레 원기둥 좌표(둘레 각 × 높이)로 옮겨 칸(줄 높이 rowH · 칸 폭 colW,
     홀수 줄은 반 칸 민다)에 넣고, 칸마다 칸 가운데에 가장 가까운 점 하나만 남긴다. 그래서 비늘이 가로줄로 가지런히 선다 */
  const rowH=d*0.9, colW=d*1.15, best=new Map();
  const axis=p=>{ const ax=Math.abs(p.x), s=Math.sign(p.x)||1;
    if(ax>0.15&&p.y>0.72&&p.y<1.45&&Math.abs(ax-(0.17+(1.38-p.y)*0.18))<0.11) return [1+(s>0), s*(0.17+(1.38-p.y)*0.18), 0.02];   // 모형 팔 축(어깨 0.17·1.38 → 손 0.27·0.84)
    if(p.y<0.92&&ax<0.2) return [3+(s>0), s*0.1, 0.01];
    return [0,0,0]; };
  const n=Math.round(tot/(d*d)*24);
  for(let t=0;t<n;t++){ const r=rn()*tot; let lo=0,hi=cum.length-1; while(lo<hi){ const mid=(lo+hi)>>1; if(cum[mid]<r) lo=mid+1; else hi=mid; }
    const [k,Nn]=tri[lo]; let a=rn(), b=rn(); if(a+b>1){ a=1-a; b=1-b; }
    A.fromBufferAttribute(P,I[k]); B.fromBufferAttribute(P,I[k+1]); C.fromBufferAttribute(P,I[k+2]);
    const p=A.clone().multiplyScalar(1-a-b).addScaledVector(B,a).addScaledVector(C,b), [rg,cx,cz]=axis(p);
    const dx=p.x-cx, dz=p.z-cz, rad=Math.max(0.04,Math.hypot(dx,dz)), th=Math.atan2(dx,dz);
    const row=Math.floor(p.y/rowH), sh=(row&1)*0.5, ncol=Math.max(3,Math.round(2*Math.PI*rad/colW)), cf=th/(2*Math.PI)*ncol-sh, col=Math.round(cf);
    const err=Math.hypot((cf-col)*colW,(p.y/rowH-row-0.5)*rowH), key=rg+':'+row+':'+((col%ncol+ncol)%ncol);
    const o=best.get(key); if(!o||err<o[2]){ const mx=o?Math.max(o[10],rad):rad; best.set(key,[p,Nn,err,cx,cz,rad,row,col,ncol,sh,mx]); } else o[10]=Math.max(o[10],rad); }
  /* 칸 가운데에 가장 가까운 점에 세우되, 칸 안에서 더 바깥 점이 있으면 1.2 cm 까지만 따라 나간다 — 장식이 비늘 위로 솟지 않게.
     끝까지 따라가면 등에서 어깨받이·깃 뒤 날개에 붙어 비늘이 등판을 떠났다 */
  for(const v of best.values()) v[5]=Math.min(v[10],v[5]+0.012);
  /* 빈 칸 메우기 — 같은 줄에서 양옆이 찬 빈 칸(8칸까지)은 양옆 반지름을 이어 비늘을 세운다(등 가운데 트임·장식 사이) */
  const rows=new Map(); for(const [k,v] of best){ const [rg,row,col]=k.split(':').map(Number); const kk=rg+':'+row; (rows.get(kk)||rows.set(kk,[]).get(kk)).push([col,v]); }
  for(const [kk,arr] of rows){ arr.sort((a,b)=>a[0]-b[0]); const ncol=arr[0][1][8]; if(arr.length<2) continue;
    for(let i=0;i<arr.length;i++){ const [c0,v0]=arr[i], [c1r,v1]=arr[(i+1)%arr.length], c1=i+1<arr.length?c1r:c1r+ncol, gap=c1-c0-1;
      if(gap<1||gap>8) continue;
      for(let g=1;g<=gap;g++){ const f=g/(gap+1), col=c0+g, v=v0.slice(); v[5]=v0[5]+(v1[5]-v0[5])*f; v[7]=col; v[1]=new THREE.Vector3(0,0,0); v[2]=0; best.set(kk+':'+((col%ncol+ncol)%ncol),v); } } }
  /* 비늘은 칸 가운데에 정확히 세우고(뽑힌 점의 반지름만 쓴다), 바라보는 쪽은 축에서 바깥(가로) 3/4 + 면 법선 1/4 — 장식 요철을 따라 비늘이 제멋대로 눕지 않게 */
  const pts=[...best.values()].map(([p,Nn,e,cx,cz,rad,row,col,ncol,sh])=>{ const th=(col+sh)/ncol*2*Math.PI, q=new THREE.Vector3(cx+rad*Math.sin(th),(row+0.5)*rowH,cz+rad*Math.cos(th));
    const out=new THREE.Vector3(Math.sin(th),0,Math.cos(th)), N=out.multiplyScalar(0.75).addScaledVector(Nn,0.25).normalize(); return [q.addScaledVector(N,0.006),N]; });
  /* 구멍 메우기 — 겉을 촘촘히 훑어, 둘레 0.85d 안에 비늘이 없는 점마다 비늘을 하나 더 세운다(줄 칸이 못 잡은 겹친 겉·오목한 데·손).
     이 점 자리에 세운 비늘도 다음 점을 덮으므로 빈자리가 남지 않을 때까지 한 번에 메워진다 */
  /* 메우는 반경 — 넓이로 훑을 때와 열린 가장자리는 SCALE_FILL_R·d(0.7d), 마지막 삼각형 짚기는 0.55d. 비늘 한 장이 2.3d×2.8d 라
     0.7d 안은 대개 덮여 있다. 예전엔 어디서나 0.35d(4.6 mm)라 덮인 자리에도 4.6 mm 마다 비늘을 또 세워 메우기가 한 벌 20만 장
     (전체의 89%)이었다. 반경을 넓히는 대신 **같은 쪽(법선 45° 안)을 보는 비늘만** 덮었다고 친다 — 넓은 반경에선 바깥 비늘이 1.2 cm
     안쪽 면 점이나 꺾인 옆면까지 덮은 셈이 되어 망토 안·가랑이·겨드랑이가 빈다. 반경을 0.9d 로 하면 구멍이 남았고(512 화소), 비늘 꼴로
     덮임을 재 보기도 했으나 젖혀진 끝 밑이 아래에서 비쳐 반경 방식보다 무거웠다. 마지막 짚기를 좁게(0.55d) 두는 것은 꺾인 자리의 작은
     삼각형이 0.7d 안 남의 비늘에 '덮인 셈' 이 되어 한두 화소 구멍이 남기 때문이다(0.7d 5 화소 · 0.5d 1 화소 · 0.55d 0 화소 — 48방향) */
  { const hd=d*SCALE_FILL_R, H=new Map(), hk=(x,y,z)=>x+','+y+','+z, ins=p=>{ const k=hk(Math.floor(p.x/hd),Math.floor(p.y/hd),Math.floor(p.z/hd)); (H.get(k)||H.set(k,[]).get(k)).push(p); };
    let nr=hd;
    const near=(p,n)=>{ const x=Math.floor(p.x/hd), y=Math.floor(p.y/hd), z=Math.floor(p.z/hd);
      for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++) for(let c=-1;c<=1;c++){ const L=H.get(hk(x+a,y+b,z+c)); if(L) for(const q of L) if(q.distanceToSquared(p)<(p.y<0.2?Math.min(nr*nr,d*d*0.04):nr*nr)&&(!n||!q.n||q.n.dot(n)>0.7)) return true; } return false; };
    for(const [q,qn] of pts){ q.n=qn; ins(q); }
    const m2=Math.round(tot/(d*d)*60);
    for(let t=0;t<m2;t++){ const r=rn()*tot; let lo=0,hi=cum.length-1; while(lo<hi){ const mid=(lo+hi)>>1; if(cum[mid]<r) lo=mid+1; else hi=mid; }
      const [k,Nn]=tri[lo]; let a=rn(), b=rn(); if(a+b>1){ a=1-a; b=1-b; }
      A.fromBufferAttribute(P,I[k]); B.fromBufferAttribute(P,I[k+1]); C.fromBufferAttribute(P,I[k+2]);
      const p0=A.clone().multiplyScalar(1-a-b).addScaledVector(B,a).addScaledVector(C,b);
      /* 겉의 앞뒤를 몸 가운데로만 가리므로 손바닥·안쪽 팔은 틀린 쪽에 설 수 있다 — 메우는 비늘은 양쪽에 다 세운다(속에 든 쪽은 안 보일 뿐이다) */
      for(const sg of [1,-1]){ const p=p0.clone().addScaledVector(Nn,0.006*sg), pn=Nn.clone().multiplyScalar(sg); if(near(p,pn)) continue; p.n=pn; ins(p); pts.push([p,pn,1]); } }
    /* 열린 가장자리(삼각형 하나만 쓰는 변 — 투구를 떼어 낸 목둘레·발끝)를 따라 hd 마다 짚는다 — 바탕이 모로 드러나는 자리다 */
    { const E=new Map(), ek=(i,j)=>{ const a=Math.round(P.getX(i)*1e4)+','+Math.round(P.getY(i)*1e4)+','+Math.round(P.getZ(i)*1e4), b=Math.round(P.getX(j)*1e4)+','+Math.round(P.getY(j)*1e4)+','+Math.round(P.getZ(j)*1e4); return a<b?a+'|'+b:b+'|'+a; };
      for(const [k,Nn] of tri) for(let e=0;e<3;e++){ const i=I[k+e], j=I[k+(e+1)%3], key=ek(i,j), o=E.get(key); if(o) o.n++; else E.set(key,{n:1,i,j,Nn}); }
      for(const {n,i,j,Nn} of E.values()) if(n===1){ A.fromBufferAttribute(P,i); B.fromBufferAttribute(P,j); const m=Math.max(1,Math.ceil(A.distanceTo(B)/(hd*0.5)));
        for(let t=0;t<=m;t++){ const p0=A.clone().lerp(B,t/m); for(const sg of [1,-1]){ const p=p0.clone().addScaledVector(Nn,0.006*sg), pn=Nn.clone().multiplyScalar(sg); if(near(p,pn)) continue; p.n=pn; ins(p); pts.push([p,pn]); } } } }
    /* 끝으로 삼각형마다 가운데와 세 꼭짓점을 빠짐없이 짚는다 — 아주 작거나 가는 삼각형은 넓이 비례로 뽑으면 거의 안 걸려 한두 화소 구멍이 남았다 */
    nr=d*0.55;
    for(const [k,Nn] of tri){ A.fromBufferAttribute(P,I[k]); B.fromBufferAttribute(P,I[k+1]); C.fromBufferAttribute(P,I[k+2]);
      for(const p0 of [A.clone().add(B).add(C).divideScalar(3),A.clone(),B.clone(),C.clone()])
        for(const sg of [1,-1]){ const p=p0.clone().addScaledVector(Nn,0.006*sg), pn=Nn.clone().multiplyScalar(sg); if(near(p,pn)) continue; p.n=pn; ins(p); pts.push([p,pn,1]); } } }
  const im=new THREE.InstancedMesh(sgeo,mat,pts.length), m4=new THREE.Matrix4(), col=new THREE.Color(), Y=new THREE.Vector3(), X=new THREE.Vector3();
  pts.forEach(([p,Nn,fc],i)=>{ Y.set(0,1,0).addScaledVector(Nn,-Nn.y); if(Y.lengthSq()<0.09) Y.copy(_gv.copy(p).sub(cen).setY(0)).addScaledVector(Nn,-Nn.dot(_gv)); Y.normalize();
    const a=0.22, Y2=Y.clone().multiplyScalar(Math.cos(a)).addScaledVector(Nn,-Math.sin(a)), Z2=Nn.clone().multiplyScalar(Math.cos(a)).addScaledVector(Y,Math.sin(a));
    X.crossVectors(Y2,Z2).normalize(); const w=d*2.3, h=d*2.8;
    m4.makeBasis(X.multiplyScalar(w),Y2.multiplyScalar(h),Z2.multiplyScalar(w)); m4.setPosition(p.clone().addScaledVector(Nn,0.003).addScaledVector(Y,h*0.45)); im.setMatrixAt(i,m4);
    const v=0.84+0.24*rn(); col.setRGB(v,v,v); im.setColorAt(i,col); });
  im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; return im;
}
/* 투구 일곱은 전부 사용자가 준 모형의 투구 꼴이다(사용자 요청) — 껍질(머리 타원체 둘레·턱·목 가리개)과 장식(그 밖으로 솟은 깃·볏)을 갈라 재질을 따로 칠한다 */
let _helmPart=null;
/* 투구 장식(깃)은 사용자가 손으로 칠해 정했다(칠하기 페이지 · 삼각형마다 한 비트, gSentinelGeo().h 삼각형 차례) —
   두께 광선·번지기로 가르니 깃 일부가 빠지고 날개가 칠해지기를 되풀이했다(사용자: "그냥 깃털과 투구를 분리하자") */
const HELM_MASK='AAAAAAAAAAAAAA+AMBAM+Bj6BgCMEwMCHAQAQGIgQAAAwEcIAkJuCCICATAIXLxBAGDguAyRQCMWs403DyyA42i+/xWByNRfbF6HOcAkv+z/+yCit9e9z5v3Yifef+//iD+Z+/14xGf/DmP+t+H3//8//Kc+e/P4XU7Y5/E3dqODfwGCk7cn8hfyvG/fN4zO2LN/z89Pd+fL/eyP99///ien/P/Bu3V2X9/7/Z/r/+PPH////8z7fNif+9e/D+7/H/5zYD/wQWbvOX/E8t796f6+H9lSnFyOnOO5/oPPeX6z3rdfx3//////4f3P/vf7///PW//P9z//8fv+/7/efx//vd/v+/Y6+v/66/6Y+vbL/5bd1/3M/Pf/jbT3+7n/+f/v98Xb/9s/7z+/f6+fz09p9m+/7ufPc7/gf/ZbP2f3UHh+/fu3DPnXCZ/x27149kOwsPLWHyAOJALwFvgpogoIsnRhq9lAyvgFcP4OQ6DVcmQIYPb+EC4jfFwi6yNee+DjYPjPJwEAC3uiAcIRFjDgAOL3////////////6+7fbwJ/////////////////////////////////////////////////////////////////fwA=';
function gHelmParts(){ if(_helmPart) return _helmPart;
  const h=gSentinelGeo().h, I=h.index.array, B=atob(HELM_MASK), on=t=>(B.charCodeAt((t/3)>>3)>>((t/3)&7))&1;
  const sub=keep=>{ const g2=h.clone(), k=[]; for(let t=0;t<I.length;t+=3) if(keep(t)) k.push(I[t],I[t+1],I[t+2]); g2.setIndex(k); g2.computeBoundingBox(); return g2; };
  return _helmPart={shell:sub(t=>!on(t)), orn:sub(t=>on(t))}; }
function gSentHelm(g,shell,orn,sc){ const P=gHelmParts(), b=gBone(g,'head'); b.add(new THREE.Mesh(P.shell,shell)); b.add(new THREE.Mesh(P.orn,orn));
  if(sc) b.add(gScalesOnMesh(P.shell,sc,gScaleGeo('dropL'),0.013,23)); }   // 잿불 투구 둘은 껍질 겉에 비늘을 뒤집어씌운다(사용자 요청)
function gHelmSteel(g){ gSentHelm(g,GMT.steel(),gM('plumeR',0x9e1b1b,0,0.75)); }   // 강철 — 진홍 깃

/* 판금 장갑 — 손등 띠판 · 손가락 마디 · 엄지 · 가죽 손바닥 */
function gGauntlet(hand,ST,LE){
  const F=gFL(), w0=F.len, V=()=>new THREE.Vector3();
  const hp=(ph,t,o)=>o.copy(F.o).addScaledVector(F.ax,t).addScaledVector(F.out,Math.cos(ph)*0.026).addScaledVector(F.fw,Math.sin(ph)*0.048);
  for(let k=0;k<3;k++){ const t0=w0+0.008+0.03*k, S=(u,v,o)=>{ const ph=(u-0.5)*1.05*Math.PI, t=t0+0.04*v; hp(ph,t,o); return o.addScaledVector(F.out,0.004*(1-k*0.2)+0.003*v); };
    hand.add(new THREE.Mesh(gSurf(14,4,S),ST)); hand.add(gTube(gRow(S,1,14),0.003,ST)); }
  const palm=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.088,0.088),LE); palm.position.copy(F.o).addScaledVector(F.ax,w0+0.05).addScaledVector(F.out,-0.006);
  palm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),F.ax.clone().negate()); hand.add(palm);
  const seg=(p,d,len,r)=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(r*0.92,r,len,7),ST); m.position.copy(p).addScaledVector(d,len/2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),d); hand.add(m);
    const k=new THREE.Mesh(new THREE.SphereGeometry(r*1.02,8,6),ST); k.position.copy(p); hand.add(k); return p.clone().addScaledVector(d,len); };
  const fl=[[0.034,1],[0.012,1.08],[-0.011,1.0],[-0.032,0.82]];
  for(const [z,L] of fl){ let p=V().copy(F.o).addScaledVector(F.ax,w0+0.1).addScaledVector(F.fw,z*1.05).addScaledVector(F.out,0.002), a=0;
    [[0.042,0.35],[0.03,0.55],[0.023,0.45]].forEach(([len,b],i)=>{ a+=b; const d=F.ax.clone().multiplyScalar(Math.cos(a)).addScaledVector(F.out,-Math.sin(a)); p=seg(p,d,len*L,0.0098-i*0.001); }); }
  let p=V().copy(F.o).addScaledVector(F.ax,w0+0.035).addScaledVector(F.fw,0.05).addScaledVector(F.out,-0.012);
  const d0=F.ax.clone().multiplyScalar(0.7).addScaledVector(F.fw,0.55).addScaledVector(F.out,-0.45).normalize(); p=seg(p,d0,0.038,0.011);
  const d1=F.ax.clone().multiplyScalar(0.8).addScaledVector(F.fw,0.2).addScaledVector(F.out,-0.55).normalize(); seg(p,d1,0.03,0.0095);
}
/* 털 테 — 관 겉을 잡음으로 부풀린다 */
function gFur(pts,r,c,closed){
  const cv=new THREE.CatmullRomCurve3(pts,!!closed), geo=new THREE.TubeGeometry(cv,pts.length*3,r,9,!!closed), P=geo.attributes.position, nz=gNoise(24,hashStr('fur'+pts.length));
  const N=geo.attributes.normal, n=P.count, segs=pts.length*3;
  for(let i=0;i<n;i++){ const ring=Math.floor(i/10), k=i%10, f=1+0.55*(nz(ring/segs*3.7,k/10)-0.5)+0.25*(nz(ring/segs*11,k/10*2)-0.5);
    P.setXYZ(i,P.getX(i)+N.getX(i)*r*(f-1),P.getY(i)+N.getY(i)*r*(f-1),P.getZ(i)+N.getZ(i)*r*(f-1)); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo,GMT.fur(c));
}

/* ── 비늘 갑옷 — 몸통 비늘옷 · 각진 비늘 어깨받이 · 비늘 소매 · 바탕천 · 가죽 띠 ──
   kind: bronze(섬유 바탕) · iron(가죽 바탕) · ember(검은 비늘 · 테만 아주 얇게 붉다) */
const gCoatP=(lo,flare)=>(s,t,d,o)=>{ const y=1.475+(lo-1.475)*t; gbT(2*Math.PI*s,Math.max(y,0.8),d+(y<0.93?(0.93-y)*flare:0),o); o.y=y; return o; };
const gSleeveP=(F,tEnd,R)=>(s,t,d,o)=>{ const tm=-0.07+(tEnd+0.07)*t, PH=Math.PI*(0.78+0.22*smoothstep(0,0.09,tm)), ph=-PH+2*PH*s;
  const r=tm<0.04?R*Math.sqrt(Math.max(0.06,1-Math.pow((tm-0.04)/0.115,2))):R-(tm-0.04)*0.09; return F.at(ph,tm,r+d,o); };
const gScl=(SM,SG,o)=>Object.assign({row:0.021,col:0.029,w:0.037,h:0.047,tilt:0.24,lift:0.005,geo:SG,mat:SM,wrap:true,seed:3},o||{});
/* 비늘 바지 — 넓적다리·정강이를 비늘로 감싸고(바탕 밑에 깜) 무릎엔 쇠 덮개, 발엔 가죽 장화 */
function gScaleLegs(thighL,shinL,footL,SM,SG,MT,BK,boot){
  const FT=gFT(), FS=gFS();
  const Q=(s,t,d,o)=>FT.at(s*2*Math.PI,0.035+0.375*t,0.086-0.02*t+d,o);
  thighL.add(new THREE.Mesh(gSurf(32,14,(u,v,o)=>Q(u,v,0.002,o),null,true),BK));
  thighL.add(gScales(Q,gScl(SM,SG,{seed:17})));
  const Z=(s,t,d,o)=>{ const ph=s*2*Math.PI; return FS.at(ph,0.03+0.25*t,0.058-0.012*t+0.012*Math.exp(-Math.pow((t-0.3)/0.3,2))*Math.max(0,-Math.sin(ph))+d,o); };
  shinL.add(gHide(new THREE.Mesh(gSurf(32,12,(u,v,o)=>Z(u,v,0.002,o),null,true),BK)));
  shinL.add(gHide(gScales(Z,gScl(SM,SG,{row:0.019,col:0.025,w:0.032,h:0.042,seed:19}))));
  if(MT) gKnee(shinL,MT,null,false);
  if(boot) gFoot(footL,boot,null,true);
}
function gScaleArmor(g,kind){
  const torso=gBone(g,'chest'), side=new THREE.Group(); g.add(side); const armUL=gBone(side,'upperArmL');
  const back={bronze:0x6e6a44,iron:0x3e3024,ember:0x181312}[kind];
  const BK=kind==='bronze'?GMT.cloth(back,[14,10]):GMT.leather(back,[6,5]);
  const SM=gScaleMat(kind), SG=gScaleGeo('drop'), MT=kind==='bronze'?GMT.bronze():(kind==='iron'?GMT.iron():GMT.blackM());
  const P=gCoatP(0.8,0.08);
  torso.add(new THREE.Mesh(gSurf(72,34,(u,v,o)=>P(u,v,0.002,o),null,true),BK));
  torso.add(gScales(P,gScl(SM,SG)));
  const LE=GMT.leather(kind==='ember'?0x1a1412:0x4a3020,[1,1]);
  torso.add(gTube(gRow((u,v,o)=>P(u,v,0.008,o),0,72),0.009,LE,true));
  torso.add(gTube(gRow((u,v,o)=>P(u,v,0.012,o),1,72),0.006,LE,true));
  gBelt(torso,(u,v,o)=>P(u,lerp(0.704,0.758,v),0.03,o),kind==='ember'?GMT.blackM():MT);
  const F=gFU(), SP=gSleeveP(F,0.215,0.088);
  armUL.add(new THREE.Mesh(gSurf(40,10,(u,v,o)=>SP(u,0.46+0.54*v,0.002,o)),BK));
  armUL.add(gScales(SP,gScl(SM,SG,{row:0.019,col:0.025,w:0.032,h:0.042,wrap:t=>t>0.55,seed:9,t0:0.46})));
  armUL.add(gTube(gRing(F,0.217,0.084,0,Math.PI*2,32),0.006,LE,true));
  gSentPiece(armUL,'pl',BK,{mat:SM,geo:SG}); gSentPiece(gBone(side,'foreArmL'),'el',BK,{mat:SM,geo:SG,d:0.018});
  gScaleLegs(gBone(side,'thighL'),gBone(side,'shinL'),gBone(side,'footL'),SM,SG,MT,BK,GMT.leather(kind==='ember'?0x1a1412:0x3a2616,[2,2]));
  gMirror(g,side);
}
/* 가죽 띠 — 고리(네모 틀 + 혀)와 늘어진 끝 */
function gBelt(grp,S,BM){
  grp.add(new THREE.Mesh(gSurf(56,3,S,null,true),GMT.leather(0x3a2414)));
  const F=gFrame(S,0,0.5), bx=(w,h,x,y)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.007),BM); m.matrix.makeBasis(F.X,F.Y,F.Z).setPosition(gOn(F,x,y,0.004)); m.matrixAutoUpdate=false; grp.add(m); };
  bx(0.05,0.008,0,0.019); bx(0.05,0.008,0,-0.019); bx(0.008,0.046,-0.021,0); bx(0.008,0.046,0.021,0); bx(0.005,0.04,-0.002,0);
  grp.add(gSweep([gOn(F,0.03,0,0.006),gOn(F,0.06,-0.01,0.004),gOn(F,0.075,-0.06,0.002)],()=>0.012,()=>0.0025,GMT.leather(0x3a2414),F.Z,10,6));
}

/* ── 키틴 판금 — 벌레 껍질을 판으로 다듬어 짠 판금: 가슴 껍질(날 선 용골 · 마디 금) · 등 껍질(등뼈 능선) · 배 마디 다섯 ·
   각진 어깨받이와 휜 뿔 · 위팔 통 · 팔꿈치 날개와 가시 · 아래팔 통 · 허벅지 덮개.
   mix(잿불 비늘 키틴 복합): 판 밑에 잿불 비늘옷을 받쳐 입는다 — 판이 못 덮는 약한 곳(목 · 옆구리 · 허리 · 위팔과 팔꿈치 ·
   엉덩이)을 비늘이 감싼다. 판 밑에 숨는 비늘은 안 단다 */
function gChitinArmor(g,mix){
  const CH=GMT.chitin(), CE=GMT.chitinE(), torso=gBone(g,'chest'), pelvis=gBone(g,'pelvis'), side=new THREE.Group(); g.add(side);
  const armUL=gBone(side,'upperArmL'), armLL=gBone(side,'foreArmL'), thighL=gBone(side,'thighL');
  const SM=gScaleMat('ember'), SG=gScaleGeo('drop'), DL=GMT.leather(0x1a1412,[6,5]);
  const ws=mix?0.42*Math.PI:0.6*Math.PI, wb=mix?0.36*Math.PI:0.4*Math.PI, dP=mix?0.034:0.026;
  const A=th=>Math.abs(Math.atan2(Math.sin(th),Math.cos(th)));
  /* 밑옷 */
  const lo=0.8, P=gCoatP(lo,0.08);
  torso.add(new THREE.Mesh(gSurf(72,36,(u,v,o)=>P(u,v,0.002,o),null,true),mix?DL:GMT.leather(0x2a2018,[6,5])));
  if(mix){ const cov=(s,t)=>{ const a=A(s*2*Math.PI), y=1.475+(lo-1.475)*t; return y>1.08&&y<1.39&&(a<ws-0.12||a>Math.PI-wb+0.12); };
    torso.add(gScales(P,gScl(SM,SG,{skip:cov})));
    torso.add(gTube(gRow((u,v,o)=>P(u,v,0.012,o),1,72),0.006,DL,true)); torso.add(gTube(gRow((u,v,o)=>P(u,v,0.008,o),0,72),0.008,DL,true)); }
  /* 가슴 껍질 */
  const yT=th=>crv([[0,1.395],[0.12,1.41],[0.22,1.44],[0.3,1.445],[0.36,1.41],[0.42,1.34],[0.5,1.29],[0.6,1.29]],A(th)/Math.PI);
  const yB=th=>1.055-0.035*Math.max(0,1-A(th)/0.55);
  const chest=(u,v,o)=>{ const th=(u-0.5)*2*ws, y=lerp(yT(th),yB(th),v);
    return gbT(th,y,dP+0.017*Math.max(0,1-A(th)/0.45)*smoothstep(1.0,1.12,y)+0.007*Math.exp(-Math.pow((A(th)-0.78)/0.16,2)),o); };
  torso.add(new THREE.Mesh(gSurf(60,30,chest),CH));
  torso.add(gTube(gRow(chest,0,64),0.005,CE)); torso.add(gTube(gRow(chest,1,48),0.005,CE)); for(const u of [0,1]) torso.add(gTube(gCol(chest,u,20),0.0045,CE));
  for(const v of [0.42,0.72]) torso.add(gTube(gLift(gRow(chest,v,48,0.06,0.94),0.0016,cTorso),0.0022,CE));
  /* 등 껍질 */
  const yK=th=>crv([[0,1.47],[0.15,1.465],[0.25,1.44],[0.33,1.35],[0.4,1.29]],(Math.PI-A(th))/Math.PI);
  const back=(u,v,o)=>{ const th=Math.PI-wb+2*wb*u, y=lerp(yK(th),1.055,v); return gbT(th,y,dP-0.003+0.013*Math.max(0,1-Math.abs(th-Math.PI)/0.35),o); };
  torso.add(new THREE.Mesh(gSurf(44,30,back),CH)); torso.add(gTube(gRow(back,0,48),0.005,CE)); torso.add(gTube(gRow(back,1,40),0.005,CE));
  for(const u of [0,1]) torso.add(gTube(gCol(back,u,20),0.0045,CE));
  if(!mix){ /* 목가리개 둘 · 배 마디 다섯 */
    for(let k=0;k<2;k++){ const yb=k===0?(th=>1.432-0.045*Math.pow(Math.max(0,Math.cos(th)),2)):(()=>1.478), yt=1.49+0.03*k;
      const S=(u,v,o)=>{ const th=u*Math.PI*2, y=lerp(yt,yb(th),v); return gbT(th,y,0.034-0.005*k+(k===0?0.06*Math.max(0,1.47-y):0),o); };
      torso.add(new THREE.Mesh(gSurf(48,6,S,null,true),CH)); torso.add(gTube(gRow(S,1,48),0.0045,CE,true)); }
    for(let k=0;k<5;k++){ const yt=1.068-0.046*k, S=(u,v,o)=>{ const th=u*Math.PI*2, a=A(th), y=yt-0.058*v-0.014*Math.max(0,1-a/0.5)*v;
        return gbT(th,y,0.03+0.004*k+0.06*(yt-y)+0.009*Math.max(0,1-a/0.4),o); };
      pelvis.add(new THREE.Mesh(gSurf(64,5,S,null,true),CH)); pelvis.add(gTube(gRow(S,1,64),0.0045,CE,true)); pelvis.add(gTube(gRow(S,0,64),0.0035,CH,true)); } }
  gBelt(pelvis,(u,v,o)=>gbT(u*Math.PI*2,0.988-0.034*v,mix?0.03:0.05,o),GMT.bone());
  /* 허벅지 덮개 — 띠 밑에서 내려와 끝이 뾰족 */
  { const F=gFT(), c=0.42*Math.PI, w=0.62;
    for(let k=0;k<2;k++){ const a=0.075+0.07*k; gBand(thighL,F,a,a+0.085,0.1+0.005*k,0.11+0.005*k,c-w,c+w,CH,CE,{nu:24,pc:c,point:k===1?0.04:0.016,pointW:w,keel:0.01,keelW:0.45,curl:0.004}); } }
  /* 팔 */
  gSentPiece(armUL,'pl',CH); gSentPiece(armLL,'el',CH);
  const FU=gFU();
  if(mix){ const Q=(s,t,d,o)=>FU.at(s*2*Math.PI,0.05+0.26*t,0.068-0.022*t+d,o);
    armUL.add(new THREE.Mesh(gSurf(32,10,(u,v,o)=>Q(u,v,0.002,o),null,true),DL));
    armUL.add(gScales(Q,gScl(SM,SG,{row:0.019,col:0.025,w:0.032,h:0.042,seed:9})));
    armUL.add(gTube(gRing(FU,0.311,0.06,0,Math.PI*2,32),0.0055,DL,true)); }
  else{ gBand(armUL,FU,0.13,0.25,0.057,0.055,0,Math.PI*2,CH,CE,{keel:0.007,keelW:0.6}); }
  gBand(armLL,gFL(),0.045,0.215,0.053,0.045,0,Math.PI*2,CH,CE,{keel:0.009,keelW:0.6,flare:0.004});
  /* 다리 — 키틴은 가죽 누비 위에 넓적다리 판 둘 · 무릎(가시) · 정강이 통 · 발 판.
     복합은 비늘 바지 위에 앞쪽만 판을 대고 무릎은 비늘로 둔다(약한 곳) */
  const shinL=gBone(side,'shinL'), footL=gBone(side,'footL'), FT=gFT(), FS=gFS();
  if(mix){ gScaleLegs(thighL,shinL,footL,SM,SG,null,DL,null);
    gBand(thighL,FT,0.16,0.37,0.106,0.092,0.08*Math.PI,0.92*Math.PI,CH,CE,{keel:0.012,keelW:0.6,pc:Math.PI/2,flare:0.004,nu:28});
    gHideNew(shinL,()=>gBand(shinL,FS,0.06,0.3,0.076,0.064,0.1*Math.PI,0.9*Math.PI,CH,CE,{keel:0.012,keelW:0.6,pc:Math.PI/2,nu:28})); }
  else{ thighL.add(new THREE.Mesh(gSurf(32,6,(u,v,o)=>FT.at(u*2*Math.PI,0.05+0.36*v,0.082-0.018*v,o),null,true),DL));
    shinL.add(gHide(new THREE.Mesh(gSurf(32,6,(u,v,o)=>FS.at(u*2*Math.PI,0.02+0.3*v,0.054-0.012*v,o),null,true),DL)));
    for(const [a,b] of [[0.16,0.29],[0.27,0.4]]) gBand(thighL,FT,a,b,0.09-0.03*(a-0.16),0.084-0.03*(a-0.16),-0.25*Math.PI,1.25*Math.PI,CH,CE,{keel:0.012,keelW:0.6,pc:Math.PI/2,flare:0.006,nu:40});
    gKnee(shinL,CH,CE,true);
    gHideNew(shinL,()=>gBand(shinL,FS,0.04,0.34,0.06,0.046,0,Math.PI*2,CH,CE,{keel:0.012,keelW:0.6,pc:Math.PI/2,bump:(t,ph)=>0.012*Math.exp(-Math.pow((t-0.11)/0.07,2))*Math.max(0,-Math.sin(ph))})); }
  gFoot(footL,CH,CE);
  gMirror(g,side);
}

/* ── 투구 ── */
const gDarkHead=g=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),GMT.dark()); m.scale.set(0.088,0.108,0.1); m.position.copy(GB.head); g.add(m); return m; };
/* 청동 — 코린트식 한 장 투구: 아몬드 눈구멍 · 코 가리개 · 뺨 가리개 사이 세로 틈 · 목 뒤로 벌어짐 · 붉은 갈기 볏 */
function gHelmBronze(g){
  const BR=GMT.bronze(), RX=0.106, RY=0.122, RZ=0.122; gDarkHead(g);
  const eMin=ph=>{ const a=Math.abs(ph), f1=smoothstep(0.48*Math.PI,0.56*Math.PI,a), f2=smoothstep(0.7*Math.PI,0.8*Math.PI,a); return -1.02*(1-f1)-0.42*f1*(1-f2)-0.92*f2; };
  const PE=(u,v)=>{ const ph=(u-0.5)*2*Math.PI; return [ph,Math.PI/2+(eMin(ph)-Math.PI/2)*v]; };
  const shell=(u,v,o)=>{ const [ph,e]=PE(u,v), bk=smoothstep(0.6*Math.PI,Math.PI,Math.abs(ph)), fr=1-smoothstep(0.3*Math.PI,0.55*Math.PI,Math.abs(ph));
    const k=1+0.5*bk*Math.pow(Math.max(0,-0.35-e),1.3)+0.1*fr*Math.max(0,-0.45-e); return gHead(ph,e,RX*k,RY,RZ*k,o); };
  const eyeH=a=>0.125*Math.pow(Math.max(0,Math.sin(Math.PI*(a-0.07)/0.43)),0.7);
  const open=(ph,e)=>{ const a=Math.abs(ph); if(a>0.07&&a<0.5&&Math.abs(e-0.03+0.06*(a-0.07))<eyeH(a)) return true; return e<-0.12&&a<0.085+0.16*(-0.12-e); };
  g.add(new THREE.Mesh(gSurf(144,64,shell,(u,v)=>{ const [ph,e]=PE(u,v); return !open(ph,e); },true),BR));
  g.add(gTube(gRow(shell,1,128),0.0045,BR,true));
  const at=(ph,e,k)=>gHead(ph,e,RX*(k||1.004),RY*(k||1.004),RZ*(k||1.004),new THREE.Vector3());
  for(const s of [-1,1]){ const eye=[]; for(let i=0;i<=24;i++){ const a=0.07+0.43*i/24; eye.push(at(s*a,0.03-0.06*(a-0.07)+eyeH(a))); }
    for(let i=23;i>0;i--){ const a=0.07+0.43*i/24; eye.push(at(s*a,0.03-0.06*(a-0.07)-eyeH(a))); } g.add(gTube(eye,0.0028,BR,true));
    const brow=[]; for(let i=0;i<=20;i++){ const a=0.05+0.48*i/20; brow.push(at(s*a,0.03-0.06*(a-0.07)+eyeH(Math.min(0.49,Math.max(0.08,a)))+0.035,1.012)); } g.add(gTube(brow,0.0055,BR)); }
  const slot=[]; for(let i=0;i<=14;i++){ const e=-1.0+0.88*i/14; slot.push(at(-(0.085+0.16*(-0.12-e)),e)); }
  for(let i=0;i<=8;i++){ const ph=-0.085+0.17*i/8; slot.push(at(ph,-0.12-0.012*Math.sin(Math.PI*i/8))); }
  for(let i=14;i>=0;i--){ const e=-1.0+0.88*i/14; slot.push(at(0.085+0.16*(-0.12-e),e)); } g.add(gTube(slot,0.0028,BR));
  /* 볏 — 이마에서 목덜미까지 활처럼, 붉은 말총 */
  const HM=gM('crest',0x9a1c18,0,0.78,m=>{ m.map=gTexHair([6,1]); });
  const arc=t=>{ const e=0.45+t*(Math.PI-0.45-0.1); const ph=e>Math.PI/2?Math.PI:0, ee=e>Math.PI/2?Math.PI-e:e; return gHead(ph,ee,RX,RY+0.01,RZ+0.01,new THREE.Vector3()); };
  const crest=(u,v,o)=>{ const b=arc(u), up=_gv.copy(b).sub(GB.head).normalize().clone(), h=0.02+0.085*Math.pow(Math.sin(Math.PI*Math.min(1,u*1.05)),0.6)*(1-0.25*u), w=0.016;
    let x, y; if(v<0.4){ x=-w; y=h*v/0.4; } else if(v<0.6){ const a=(v-0.4)/0.2*Math.PI; x=-w*Math.cos(a); y=h+0.008*Math.sin(a); } else { x=w; y=h*(1-v)/0.4; }
    return o.copy(b).addScaledVector(up,y).add(_gv.set(x,0,0)); };
  g.add(new THREE.Mesh(gSurf(40,12,crest),HM));
  const rail=[]; for(let i=0;i<=24;i++) rail.push(arc(i/24)); g.add(gTube(rail,0.007,BR));
}
/* 키틴 — 마디 판 넷이 앞에서 뒤로 겹친 머리 껍질 · 관자놀이 겹눈 · 턱을 감싸는 큰 턱 둘 */
function gChitinDome(g,nseg,eyes,edge){
  const CH=GMT.chitin(), CE=edge||GMT.chitinE(), RX=0.104, RY=0.122, RZ=0.118;
  const segs=[[-0.24,0.62],[0.5,1.32],[1.2,2.02],[1.9,2.78],[2.66,3.95]];
  for(let k=0;k<nseg;k++){ const [b0,b1]=segs[k], kk=1.0+0.014*(nseg-k);
    const S=(u,v,o)=>{ const ga=(u-0.5)*0.97*Math.PI, be=b0+(b1-b0)*v, sw=1+0.03*Math.sin(Math.PI*v);
      const bot=k===nseg-1?1+0.25*Math.max(0,be-Math.PI)*0.5:1;
      return o.set(GB.head.x+RX*kk*sw*bot*Math.sin(ga), GB.head.y+RY*kk*sw*Math.cos(ga)*Math.sin(be), GB.head.z+RZ*kk*sw*bot*Math.cos(ga)*Math.cos(be)); };
    g.add(new THREE.Mesh(gSurf(40,10,S),CH)); g.add(gTube(gRow(S,k===0?0:1,40),0.0035,CE)); if(k===0) g.add(gTube(gRow(S,1,40),0.003,CH)); }
  if(eyes) for(const s of [-1,1]){ const p=gHead(s*0.4*Math.PI,0.06,RX*1.03,RY*1.03,RZ*1.03,new THREE.Vector3());
    const m=gPut(g,new THREE.SphereGeometry(1,24,16),gM('ceye',0x3a0c08,0.3,0.12,m=>{ m.map=gTexHex(); m.emissive=new THREE.Color(0x9a1808); m.emissiveMap=gTexHex(); m.emissiveIntensity=0.7; }),p.x,p.y,p.z); m.scale.set(0.036,0.028,0.02); m.lookAt(_gv.copy(p).multiplyScalar(2).sub(GB.head)); }
}
/* 키틴 — 마디 판 다섯 · 빛나는 겹눈 · 이마에서 솟아 뒤로 휜 큰 코뿔(끝이 두 갈래) · 정수리 등 가시 다섯 · 이빨 달린 큰 턱 둘 */
function gHelmChitin(g){
  gChitinDome(g,5,true); const CH=GMT.chitin(), CE=GMT.chitinE(), H=GB.head, Y=new THREE.Vector3(0,1,0), X=new THREE.Vector3(1,0,0);
  const V=(x,y,z)=>new THREE.Vector3(x,y,z+H.z-0.012);
  const horn=[V(0,1.668,0.114),V(0,1.735,0.13),V(0,1.795,0.114),V(0,1.84,0.072),V(0,1.858,0.026)];
  g.add(gSweep(horn,u=>0.024*Math.pow(1-u,0.8)+0.004,u=>0.028*Math.pow(1-u,0.8)+0.004,CH,X,24,10));
  g.add(gTube(horn.map(p=>p.clone().add(_gv.set(0,0,0))).slice(1).map((p,i)=>p.clone().addScaledVector(_gv.set(0,0.35,0.94).normalize(),0.016*(1-i/4))),0.0022,CE));
  for(const k of [-1,1]){ const t=horn[4]; g.add(gSweep([t.clone(),t.clone().add(_gv.set(k*0.012,0.008,-0.012)),t.clone().add(_gv.set(k*0.024,0.004,-0.03))],u=>0.0045*(1-u)+0.001,u=>0.0045*(1-u)+0.001,CH,Y,10,6)); }
  for(let i=0;i<5;i++){ const be=1.25+0.32*i, base=new THREE.Vector3(0,H.y+0.13*Math.sin(be),H.z+0.126*Math.cos(be)), d=new THREE.Vector3(0,Math.sin(be),Math.cos(be)-0.55).normalize(), h=0.03-0.004*i;
    const c=gPut(g,new THREE.ConeGeometry(0.0075,h,8),CH); c.position.copy(base).addScaledVector(d,h/2-0.003); c.quaternion.setFromUnitVectors(Y,d); }
  for(const s of [-1,1]){ const P=[[0.1,1.62,-0.005],[0.116,1.575,0.05],[0.098,1.528,0.105],[0.05,1.505,0.142],[0.016,1.514,0.148]].map(([x,y,z])=>V(s*x,y,z+0.012));
    const hh=u=>0.03*(1-u)*(0.6+0.4*Math.sin(Math.PI*Math.min(1,u*2)))+0.003;
    g.add(gSweep(P,u=>0.009*(1-0.6*u)+0.002,hh,CH,Y,24,12));
    const cv=new THREE.CatmullRomCurve3(P), edge=[]; for(let i=0;i<=12;i++){ const u=i/12; edge.push(cv.getPointAt(u).add(_gv.set(0,hh(u)+0.001,0))); } g.add(gTube(edge,0.0022,CE));
    for(const u of [0.42,0.58,0.72,0.84]){ const p=cv.getPointAt(u), T=cv.getTangentAt(u), inn=new THREE.Vector3().crossVectors(Y,T).multiplyScalar(s).normalize();   // 안쪽(얼굴 쪽) 이빨
      if(inn.x*s>0) inn.negate(); const c=gPut(g,new THREE.ConeGeometry(0.0045,0.016,6),CE); c.position.copy(p).addScaledVector(inn,0.009).add(_gv.set(0,-hh(u)*0.4,0)); c.quaternion.setFromUnitVectors(Y,inn); } }
}
/* 잿불 비늘 — 머리·목·어깨를 덮는 두건에 붉은 비늘을 겹쳐 꿴다(얼굴만 둥글게 튼다) */
const gHoodP=(s,t,d,o)=>{ const ph=2*Math.PI*s, RX=0.098+d, RY=0.118+d, RZ=0.112+d;
  if(t<0.6){ const e=Math.PI/2-(t/0.6)*(Math.PI/2+0.55); return gHead(ph,e,RX,RY,RZ,o); }
  const f=(t-0.6)/0.4, ff=Math.pow(f,1.8), c=Math.cos(0.55), y=lerp(GB.head.y-RY*Math.sin(0.55),1.47,f);
  const rx=lerp(RX*c,0.145+d,ff), rz=lerp(RZ*c,(Math.cos(ph)>0?0.112:0.122)+d,ff);
  return o.set(GB.head.x+rx*Math.sin(ph),y,GB.head.z+rz*Math.cos(ph)); };
const gFace=(s,t,m)=>{ const ph=(s>0.5?s-1:s)*2*Math.PI; return Math.pow(ph/(0.6+m),2)+Math.pow((t-0.48)/(0.135+m*0.25),2)<1; };
function gHelmEmber(g,chit){
  const SM=gScaleMat('ember'), LE=GMT.leather(0x2e1e16);
  const t0=chit?0.42:0.05, skip=(s,t)=>gFace(s,t,0.06);
  g.add(new THREE.Mesh(gSurf(56,40,(u,v,o)=>gHoodP(u,t0+(1-t0)*v,0.001,o),(u,v)=>!gFace(u,t0+(1-t0)*v,0),true),LE));
  g.add(gScales(gHoodP,{t0,t1:1,row:0.0135,col:0.0165,w:0.021,h:0.028,tilt:0.25,lift:0.004,geo:gScaleGeo('drop'),mat:SM,wrap:true,skip,seed:21}));
  const face=[]; for(let i=0;i<=48;i++){ const a=i/48*Math.PI*2, s=(0.6/(2*Math.PI))*Math.cos(a), t=0.48+0.135*Math.sin(a); face.push(gHoodP((s+1)%1,t,0.009,new THREE.Vector3())); }
  g.add(gTube(face,0.0065,LE,true));
  g.add(gTube(gRow((u,v,o)=>gHoodP(u,v,0.008,o),1,64),0.006,LE,true));
  if(chit){ const GL=GMT.glow(), CH=GMT.chitin(), H=GB.head, Y=new THREE.Vector3(0,1,0); gChitinDome(g,4,false,GL);      // 마디 금이 잿불빛으로 달아오른다
    const nas=[]; for(let i=0;i<=8;i++){ const e=0.05-0.32*i/8; nas.push(gHead(0,e,0.11,0.13,0.127+0.004*i/8,new THREE.Vector3())); } g.add(gSweep(nas,u=>0.012*(1-0.5*u),()=>0.004,CH,p=>_gv.copy(p).sub(GB.head).normalize().clone(),12,8));
    g.add(gTube(nas.map(p=>gLift([p.clone()],0.0045,cHead)[0]),0.0018,GL));
    for(const s of [-1,1]){ /* 관자놀이 뿔 — 뒤로 휘어 솟고 끝이 달아오른다 */
      const P=[[0.088,1.672,0.062],[0.118,1.698,0.0],[0.13,1.73,-0.07],[0.12,1.765,-0.13],[0.104,1.79,-0.17]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z+H.z-0.012));
      g.add(gSweep(P,u=>0.014*(1-u)+0.002,u=>0.014*(1-u)+0.002,CH,new THREE.Vector3(1,0,0),20,8));
      const cv=new THREE.CatmullRomCurve3(P), t=cv.getPointAt(0.86), d=cv.getTangentAt(0.86); const c=gPut(g,new THREE.ConeGeometry(0.0042,0.03,8),GL); c.position.copy(t).addScaledVector(d,0.012); c.quaternion.setFromUnitVectors(Y,d);
      /* 뺨 판 — 비늘 두건 위로 뺨을 덮고 테가 달아오른다 */
      const CK=(u,v,o)=>gHead(s*lerp(0.27,0.52,u)*Math.PI,lerp(-0.08,-0.78,v)+0.08*Math.sin(Math.PI*u)*v,0.123,0.137,0.132,o);
      g.add(new THREE.Mesh(gSurf(12,12,CK),CH)); g.add(gTube([...gRow(CK,0,8),...gCol(CK,1,8).slice(1),...gRow(CK,1,8).reverse().slice(1),...gCol(CK,0,8).reverse().slice(1,-1)],0.0022,GL,true)); }
    for(let i=0;i<4;i++){ const be=1.3+0.34*i, base=new THREE.Vector3(0,H.y+0.13*Math.sin(be),H.z+0.126*Math.cos(be)), d=new THREE.Vector3(0,Math.sin(be),Math.cos(be)-0.6).normalize(), h=0.026-0.004*i;
      const c=gPut(g,new THREE.ConeGeometry(0.007,h,8),i?CH:GL); c.position.copy(base).addScaledVector(d,h/2-0.003); c.quaternion.setFromUnitVectors(Y,d); } }
  else{ const top=gHoodP(0,0.02,0.004,new THREE.Vector3()); const b=gPut(g,new THREE.CylinderGeometry(0.03,0.034,0.012,16),GMT.blackM(),top.x,top.y,top.z);
    gPut(g,new THREE.ConeGeometry(0.009,0.03,10),GMT.blackM(),top.x,top.y+0.02,top.z); }
}
/* 가죽 모자 — 네 쪽을 꿰맨 둥근 모자 · 귀덮개 · 털 테 · 끈 */
function gCapP(front,flap,backE){ const RX=0.096, RY=0.116, RZ=0.11;
  const eLow=ph=>{ const a=Math.abs(ph), fw=flap?Math.exp(-Math.pow((a-0.5*Math.PI)/0.3,2)):0, bk=smoothstep(0.6*Math.PI,0.9*Math.PI,a); return front*(1-fw)*(1-bk)+(flap||0)*fw+backE*bk*(1-fw); };
  return [(u,v,o)=>{ const ph=(u-0.5)*2*Math.PI, el=eLow(ph), e=Math.PI/2+(el-Math.PI/2)*v, k=1+0.12*Math.max(0,-0.2-e); return gHead(ph,e,RX*k,RY,RZ*k,o); },eLow]; }
function gSeams(g,S,us,col){ const SM=GMT.leather(col,[1,1]), st=new THREE.BoxGeometry(0.0065,0.0016,0.0016);
  for(const u of us){ const pts=gLift(gCol(S,u,24,0.0,0.92),0.0012,cHead); g.add(gTube(pts,0.0016,SM));
    for(let i=1;i<pts.length-1;i+=1){ const m=gPut(g,st,SM,pts[i].x,pts[i].y,pts[i].z);
      m.lookAt(GB.head); } } }
function gHelmHide(g){
  const [S]=gCapP(0.1,-0.95,-0.3), LE=GMT.leather(0x8a6a4a,[3,3]);
  g.add(new THREE.Mesh(gSurf(72,24,S,null,true),LE));
  g.add(gFur(gRow(S,1,72),0.014,0x6e4e34,true));
  gSeams(g,S,[0.125,0.375,0.625,0.875],0x3a2818);
  const top=gHead(0,Math.PI/2,0.096,0.12,0.11,new THREE.Vector3()); gPut(g,new THREE.SphereGeometry(0.012,10,8),LE,top.x,top.y,top.z);
  for(const s of [-1,1]){ const p=new THREE.Vector3(); S(0.5+s*0.25,1,p); const tie=[p.clone(),p.clone().add(_gv.set(s*0.004,-0.06,0.01)),p.clone().add(_gv.set(s*0.01,-0.13,0.004))];
    g.add(gTube(tie,0.0025,GMT.leather(0x5a4030,[1,1]))); }
}
/* 뼈 투구 — 가죽 안감 위에 두개골 뼈판(볏판·이마판·옆판)을 꿰고 관자놀이에 송곳니 둘 */
function gHelmBone(g){
  const [S]=gCapP(0.16,null,-0.42), LE=GMT.leather(0x5a4030,[3,3]), BO=GMT.bone(), RV=gM('rivet',0x3a3430,0.8,0.5);
  g.add(new THREE.Mesh(gSurf(72,24,S,null,true),LE)); g.add(gTube(gRow(S,1,72),0.005,LE,true));
  const RX=0.104, RY=0.124, RZ=0.118, rn=mulberry32(33), nz=gNoise(8,34);
  const plate=(ph0,ph1,e0,e1,lift,jag)=>{ const P=(u,v,o)=>{ const ph=lerp(ph0,ph1,u), e=lerp(e0,e1,v)+(v>0.9||v<0.1?jag*(nz(u*3,v)-0.5):0); return gHead(ph,e,RX+lift,RY+lift,RZ+lift,o); };
    g.add(new THREE.Mesh(gSurf(20,12,P),BO)); g.add(gTube(gRow(P,0,20),0.0035,BO)); g.add(gTube(gRow(P,1,20),0.0035,BO)); g.add(gTube(gCol(P,0,12),0.0035,BO)); g.add(gTube(gCol(P,1,12),0.0035,BO));
    for(const [u,v] of [[0.1,0.15],[0.9,0.15],[0.1,0.85],[0.9,0.85]]){ const p=new THREE.Vector3(); P(u,v,p); gLift([p],0.003,cHead); gPut(g,new THREE.SphereGeometry(0.0045,8,6),RV,p.x,p.y,p.z); } };
  /* 이마판 — 눈 위로 활 · 콧등 뾰족 */
  const brow=(u,v,o)=>{ const ph=(u-0.5)*1.15*Math.PI, a=Math.abs(ph), lo=0.16+0.08*Math.exp(-Math.pow((a-0.2*Math.PI)/0.13,2))-0.42*Math.exp(-Math.pow(ph/0.07,2)), e=lerp(0.62-0.06*Math.cos(ph*3),lo,v);
    return gHead(ph,e,RX+0.006,RY+0.006,RZ+0.006+0.006*(1-a),o); };
  g.add(new THREE.Mesh(gSurf(48,14,brow),BO)); g.add(gTube(gRow(brow,1,64),0.0045,BO)); g.add(gTube(gRow(brow,0,48),0.0035,BO));
  for(let i=0;i<5;i++){ const p=new THREE.Vector3(); brow(0.1+0.8*i/4,0.3,p); gLift([p],0.003,cHead); gPut(g,new THREE.SphereGeometry(0.0045,8,6),RV,p.x,p.y,p.z); }
  for(const s of [-1,1]){ plate(s*0.36*Math.PI,s*0.6*Math.PI,-0.18,0.62,0.004,0.12); plate(s*0.64*Math.PI,s*0.95*Math.PI,-0.3,0.66,0.004,0.15); }
  const crest=[]; for(let i=0;i<=28;i++){ const e=0.5+i/28*(Math.PI-0.5+0.25); const ph=e>Math.PI/2?Math.PI:0, ee=e>Math.PI/2?Math.PI-e:e; crest.push(gHead(ph,ee,RX+0.008,RY+0.008,RZ+0.008,new THREE.Vector3())); }
  g.add(gSweep(crest,u=>0.017*(0.7+0.3*Math.sin(Math.PI*u)),u=>0.007+0.008*Math.sin(Math.PI*u),BO,p=>_gv.copy(p).sub(GB.head).normalize().clone(),28,8));
  for(const s of [-1,1]){ const P=[[0.082,1.672,0.078],[0.098,1.63,0.1],[0.1,1.585,0.112],[0.088,1.55,0.122]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z+GB.head.z));
    g.add(gSweep(P,u=>0.011*(1-u)+0.0008,u=>0.011*(1-u)+0.0008,gM('fang',0xece2c4,0,0.35),new THREE.Vector3(0,0,1),16,8)); }
}

/* ── 옷 ── */
/* 섬유 옷 — 엮은 웃옷: V 목 · 짧은 소매 · 들쭉날쭉한 밑단 · 새끼 띠 */
function gTunic(g){
  const torso=gBone(g,'chest'), side=new THREE.Group(); g.add(side); const armUL=gBone(side,'upperArmL');
  const CL=GMT.cloth(0x9aa06a,[16,10]), CS=GMT.cloth(0x9aa06a,[7,3]), RO=GMT.leather(0x8a7a50,[1,1]);
  const yT=th=>{ const a=Math.abs(Math.atan2(Math.sin(th),Math.cos(th))); return 1.505-0.13*Math.max(0,1-a/0.26); };
  const yB=th=>0.7+0.012*Math.sin(7*th+1)+0.008*Math.sin(13*th);
  const S=(u,v,o)=>{ const th=u*2*Math.PI, y=lerp(yT(th),yB(th),v); gbT(th,Math.max(y,0.79),0.007+(y<0.93?(0.93-y)*0.22:0)+0.004*Math.sin(11*th)*smoothstep(0.95,0.75,y),o); o.y=y; return o; };
  torso.add(new THREE.Mesh(gSurf(72,36,S,null,true),CL));
  torso.add(gTube(gRow(S,0,72),0.004,CL,true));
  const rope=[]; for(let i=0;i<=64;i++) rope.push(gbT(i/64*Math.PI*2,0.965,0.017,new THREE.Vector3())); torso.add(gTube(rope,0.0065,RO,true));
  const k=gbT(0.3,0.965,0.024,new THREE.Vector3()); gPut(torso,new THREE.SphereGeometry(0.012,10,8),RO,k.x,k.y,k.z);
  for(const dx of [-0.008,0.01]) torso.add(gTube([k.clone(),k.clone().add(_gv.set(dx,-0.07,0.012)),k.clone().add(_gv.set(dx*1.6,-0.14,0.006))],0.005,RO));
  const lace=[]; for(let i=0;i<=8;i++){ const y=1.39+0.1*i/8, th=(i%2?1:-1)*0.26*(1-(1.505-y)/0.13)*0.9; lace.push(gbT(th,y,0.011,new THREE.Vector3())); } torso.add(gTube(lace,0.0022,GMT.leather(0x4a3a24,[1,1])));
  const F=gFU(), SP=(u,v,o)=>{ const tm=-0.065+0.2*v, PH=Math.PI*(0.75+0.25*smoothstep(-0.01,0.05,tm)), ph=-PH+2*PH*u;
    const r=tm<0.03?0.078*Math.sqrt(Math.max(0.08,1-Math.pow((tm-0.03)/0.1,2))):0.078+(tm-0.03)*0.08; return F.at(ph,tm+0.006*Math.sin(ph*5)*v,r,o); };
  armUL.add(new THREE.Mesh(gSurf(40,12,SP),CS)); armUL.add(gTube(gRow(SP,1,40),0.003,CS));
  gMirror(g,side);
}
/* 가죽 속옷 — 털을 안으로 댄 소매 없는 조끼: 앞 끈 · 옆 솔기 · 가장자리로 털이 비어져 나온다 */
function gHideCoat(g){
  const torso=gBone(g,'chest'), LE=GMT.leather(0x8a6a4a,[5,4]), FU2=0x5e4430;
  const yT=th=>crv([[0,1.43],[0.15,1.468],[0.27,1.485],[0.36,1.43],[0.45,1.3],[0.5,1.28],[0.6,1.32],[0.7,1.46],[1,1.5]],Math.abs(Math.atan2(Math.sin(th),Math.cos(th)))/Math.PI);
  const S=(u,v,o)=>{ const th=0.035+u*(2*Math.PI-0.07), y=lerp(yT(th),0.83+0.006*Math.sin(th*5),v); gbT(th,Math.max(y,0.79),0.006+(y<0.93?(0.93-y)*0.12:0),o); o.y=y; return o; };
  torso.add(new THREE.Mesh(gSurf(72,30,S),LE));
  torso.add(gFur(gRow(S,0,90),0.011,FU2)); torso.add(gFur(gRow(S,1,72),0.009,FU2));
  for(const u of [0,1]) torso.add(gFur(gCol(S,u,20),0.008,FU2));
  gSeams(torso,S,[0.25,0.75],0x3a2818);
  const CO=GMT.leather(0x2e2014,[1,1]), lace=[];
  for(let i=0;i<=12;i++){ const y=0.88+0.48*i/12, s=i%2?1:-1; lace.push(gbT(s*0.05,y,0.013,new THREE.Vector3())); }
  torso.add(gTube(lace,0.0036,GMT.leather(0x6a5034,[1,1])));
  for(let i=0;i<=12;i++){ const y=0.88+0.48*i/12; for(const s of [-1,1]){ const p=gbT(s*0.05,y,0.009,new THREE.Vector3()); gPut(torso,new THREE.TorusGeometry(0.004,0.0016,6,10),GMT.iron(),p.x,p.y,p.z); } }
}
/* 풀 도롱이 — 목에서 어깨를 덮고 허리까지 풀잎을 층층이 늘어뜨린다(앞은 튼다) */
function gStrawCape(g){
  const torso=gBone(g,'chest');
  const P=(s,t,d,o)=>{ const th=0.13*Math.PI+1.74*Math.PI*s, y=crv([[0,1.505],[0.28,1.42],[1,0.86]],t), rx=crv([[0,0.075],[0.28,0.27],[1,0.3]],t)+d, rz=crv([[0,0.068],[0.28,0.16],[1,0.21]],t)+d;
    return o.set(rx*Math.sin(th),y,rz*Math.cos(th)); };
  torso.add(new THREE.Mesh(gSurf(56,20,(u,v,o)=>P(u,v,-0.002,o)),gM('strawM',0x5a5a2e,0,0.95,m=>{ m.map=gTexStraw([10,8]); })));
  torso.add(gScales(P,{row:0.04,col:0.0085,w:0.009,h:0.15,hj:0.5,tilt:0.18,twist:0.3,lift:0.003,geo:gScaleGeo('blade'),mat:gScaleMat('straw'),wrap:false,seed:41,
    tint:(c,rn)=>{ const k=rn(); c.setHex(k<0.4?0x7c8a46:(k<0.75?0x97994e:(k<0.92?0xb0a462:0x6a7a3e))); c.multiplyScalar(0.85+0.3*rn()); }}));
  const rope=[]; for(let i=0;i<=40;i++){ const o=new THREE.Vector3(); P(i/40,0.03,0.006,o); rope.push(o); } torso.add(gTube(rope,0.006,GMT.leather(0x8a7a50,[1,1])));
  const a=new THREE.Vector3(), b=new THREE.Vector3(); P(0,0.03,0.008,a); P(1,0.03,0.008,b);
  torso.add(gTube([a,new THREE.Vector3(0,a.y-0.02,a.z+0.012),b],0.005,GMT.leather(0x8a7a50,[1,1])));
  for(const dx of [-0.01,0.012]) torso.add(gTube([new THREE.Vector3(0,a.y-0.02,a.z+0.012),new THREE.Vector3(dx,a.y-0.09,a.z+0.02),new THREE.Vector3(dx*1.5,a.y-0.15,a.z+0.016)],0.0045,GMT.leather(0x8a7a50,[1,1])));
}

/* ── 등짐 ── */
const gStraps=(g,mat,r,flat)=>{ g=gBone(g,'straps'); g.userData.noIcon=true; for(const s of [-1,1]){ const P=[[0.075,1.36,-0.16],[0.11,1.475,-0.04],[0.12,1.45,0.09],[0.125,1.3,0.135],[0.16,1.15,0.08],[0.17,1.06,-0.06],[0.11,0.97,-0.15]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z));
  g.add(flat?gSweep(P,()=>0.016,()=>0.0028,mat,p=>_gv.set(p.x,0,p.z+0.02).normalize().clone(),40,6):gTube(P,r,mat)); } };
/* 엮은 등짐 — 새끼로 엮은 망태: 부푼 자루 · 졸라맨 아가리 · 새끼 멜빵 */
function gPackWoven(g){
  const torso=gBone(g,'chest'), SW=gM('wov',0xb0a070,0,0.9,m=>{ m.map=gTexStraw([8,6]); }), RO=GMT.leather(0x9a8a5a,[1,1]);
  const S=(u,v,o)=>{ const th=u*2*Math.PI, r=crv([[0,0.075],[0.07,0.052],[0.2,0.12],[0.5,0.158],[0.8,0.15],[0.92,0.115],[1,0.0]],v), y=crv([[0,1.43],[0.07,1.385],[0.5,1.17],[0.92,0.965],[1,0.952]],v);
    let z=Math.cos(th)*r*0.66; if(z>0.035) z=0.035+(z-0.035)*0.3; return o.set(Math.sin(th)*r,y,z-0.215); };
  torso.add(new THREE.Mesh(gSurf(40,24,S,null,true),SW));
  torso.add(gTube(gRow(S,0.075,40),0.008,RO,true));
  torso.add(gTube(gRow(S,0,40),0.005,SW,true));
  for(const v of [0.3,0.55,0.8]) torso.add(gTube(gLift(gRow(S,v,40),0.002,p=>new THREE.Vector3(0,p.y,-0.215)),0.004,RO,true));
  gStraps(torso,RO,0.0075,false);
}
/* 가죽 배낭 — 뼈 틀에 씌운 가죽 자루 · 덮개 · 고리 띠 · 위에 말아 얹은 털가죽 */
function gPackHide(g){
  const torso=gBone(g,'chest'), LE=GMT.leather(0x7a5a3c,[3,3]), BO=GMT.bone(), DK=GMT.leather(0x3a2616,[1,1]);
  const se=(x,e)=>Math.sign(x)*Math.pow(Math.abs(x),e);
  const S=(u,v,o)=>{ const th=u*2*Math.PI, ph=Math.PI/2-v*Math.PI, c=se(Math.cos(ph),0.45); return o.set(0.15*c*se(Math.sin(th),0.45),1.13+0.2*se(Math.sin(ph),0.45),-0.205+0.075*c*se(Math.cos(th),0.45)); };
  torso.add(new THREE.Mesh(gSurf(40,24,S,null,true),LE));
  torso.add(new THREE.Mesh(gSurf(20,10,(u,v,o)=>{ const x=(u-0.5)*2; o.set(x*0.152,lerp(1.335,1.2-0.03*(1-x*x),v),lerp(-0.22,-0.288,Math.min(1,v*1.6))); return o; }),GMT.leather(0x6a4a30,[2,2])));
  for(const s of [-1,1]){ torso.add(new THREE.Mesh(new THREE.BoxGeometry(0.02,0.16,0.004),DK).translateX(s*0.07).translateY(1.17).translateZ(-0.29));
    gPut(torso,new THREE.BoxGeometry(0.026,0.02,0.006),GMT.iron(),s*0.07,1.12,-0.291); }
  for(const s of [-1,1]){ torso.add(gTube([new THREE.Vector3(s*0.17,0.86,-0.135),new THREE.Vector3(s*0.172,1.43,-0.135)],0.011,BO)); for(const y of [0.86,1.43]) gPut(torso,new THREE.SphereGeometry(0.017,10,8),BO,s*0.17,y,-0.135); }
  for(const y of [0.9,1.38]){ torso.add(gTube([new THREE.Vector3(-0.17,y,-0.135),new THREE.Vector3(0.17,y,-0.135)],0.009,BO)); for(const s of [-1,1]) gPut(torso,new THREE.TorusGeometry(0.014,0.004,6,12),DK,s*0.17,y,-0.135).rotation.y=Math.PI/2; }
  const roll=gPut(torso,new THREE.CylinderGeometry(0.05,0.05,0.34,18),GMT.fur(0x5e4430),0,1.39,-0.215); roll.rotation.z=Math.PI/2;
  for(const s of [-1,1]) gPut(torso,new THREE.TorusGeometry(0.052,0.004,6,18),DK,s*0.1,1.39,-0.215).rotation.y=Math.PI/2;
  gStraps(torso,DK,0,true);
}


/* 모든 갑옷이 같은 모형 꼴이다(사용자 요청) — 재질만 바꾸고, 비늘 갑옷은 겉에 비늘을 덮는다(scaleOn: 덮을 갈래) */
/* 복합 갑옷의 비늘 자리(사용자 지정) — 어깨 가리개 · 흉갑 · 등 · 옆구리 · 허리받이 · 망토(c 갈래 통째) · 팔꿈치 · 무릎 · 신발. 나머지(팔 · 넓적다리 · 정강이 · 허리 밑)는 키틴 판 */
/* 어깨 가리개 자리 — 모형의 왼 어깨받이 조각(pl) 정점을 3 cm 칸에 담아, |x| 로 양쪽을 같이 본다 */
let _plH=null;
function gPauldronAt(ax,y,z){ const e=0.03;
  if(!_plH){ _plH=new Set(); const g=gSentinelGeo().pl, P=g.attributes.position, I=g.index.array; for(let k=g.drawRange.start||0;k<I.length;k++){ const i=I[k]; _plH.add(Math.floor(Math.abs(P.getX(i))/e)+','+Math.floor(P.getY(i)/e)+','+Math.floor(P.getZ(i)/e)); } }
  return _plH.has(Math.floor(ax/e)+','+Math.floor(y/e)+','+Math.floor(z/e)); }
function gEmberSpot(x,y,z){ const ax=Math.abs(x);
  if(y>0.95&&y<1.47&&ax<0.19) return true;                       // 흉갑 · 등 · 옆구리
  if(y>0.68&&y<=0.95&&ax<0.24) return true;                      // 허리받이(앞 배 아래 판 · 뒤 허리 띠 — 사용자 요청)
  if(ax>0.2&&y>0.8&&y<1.1) return true;                          // 전완(아래팔) 통째 — 팔꿈치 밑부터 손목까지(사용자 요청)
  if(ax>=0.15&&gPauldronAt(ax,y,z)) return true;                 // 어깨 가리개(모형의 pl 조각 자리)만 — 그 밑 팔(위팔·팔꿈치·아래팔)은 전부 판(사용자 요청)
  if(y>0.42&&y<0.6&&ax<0.2) return true;                          // 무릎
  return y<0.16; }                                                // 신발
/* 지오메트리에서 삼각형 가운데가 pred 를 따르는 것만 남긴 복제 */
function gSubGeo(G0,pred){ const g2=G0.clone(), I=G0.index.array, P=G0.attributes.position, keep=[];
  for(let k=0;k<I.length;k+=3){ const x=(P.getX(I[k])+P.getX(I[k+1])+P.getX(I[k+2]))/3, y=(P.getY(I[k])+P.getY(I[k+1])+P.getY(I[k+2]))/3, z=(P.getZ(I[k])+P.getZ(I[k+1])+P.getZ(I[k+2]))/3;
    if(pred(x,y,z)) keep.push(I[k],I[k+1],I[k+2]); }
  g2.setIndex(keep); g2.computeBoundingBox(); return g2; }
function gSentArmor(g,mat,cloth,sc,scaleOn,spot){
  const G0=gSentinelGeo(), b=gBone(g,'chest');
  /* spot(자리 판정)이 있으면 갈래마다 비늘 쪽(이름+'s')과 판 쪽으로 나눈다 */
  const G=spot?Object.assign({},G0):G0;
  if(spot){ /* 망토(c) 비늘도 이웃 판 쪽으로 2.5 cm 넘겨 단다 — 예전엔 다리 비늘이 덮던 망토 바탕 끝이 비쳤다 */
    const e=0.025, H=new Set(), Pc=G0.c.attributes.position, key=(x,y,z)=>Math.floor(x/e)+','+Math.floor(y/e)+','+Math.floor(z/e);
    /* 망토 천은 판 밑으로 넓게 깔려 있다 — '망토 가까이' 가 아니라 망토의 열린 가장자리(삼각형 하나만 쓰는 변) 2.5 cm 안만 넘긴다 */
    const Ic=G0.c.index.array, vk=i=>Math.round(Pc.getX(i)*1e4)+','+Math.round(Pc.getY(i)*1e4)+','+Math.round(Pc.getZ(i)*1e4), EC=new Map();
    for(let t=0;t<Ic.length;t+=3) for(let q=0;q<3;q++){ const a=vk(Ic[t+q]), b=vk(Ic[t+(q+1)%3]), kk=a<b?a+'|'+b:b+'|'+a; const o=EC.get(kk); if(o) o.n++; else EC.set(kk,{n:1,i:Ic[t+q],j:Ic[t+(q+1)%3]}); }
    const BP=new Map(); for(const {n,i,j} of EC.values()) if(n===1) for(const v of [i,j]){ const x=Pc.getX(v), y=Pc.getY(v), z=Pc.getZ(v), kk=key(x,y,z); (BP.get(kk)||BP.set(kk,[]).get(kk)).push([x,y,z]); }
    const nearC=(x,y,z)=>{ const a=Math.floor(x/e), b=Math.floor(y/e), c=Math.floor(z/e); for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) for(let k=-1;k<=1;k++){ const L=BP.get((a+i)+','+(b+j)+','+(c+k)); if(L) for(const p of L) if(Math.hypot(p[0]-x,p[1]-y,p[2]-z)<e) return true; } return false; };
    const parts=[G0.c,gSubGeo(G0.u,nearC),gSubGeo(G0.l,nearC)], pos=[], idx=[];
    for(const p of parts){ const P=p.attributes.position, I=p.index.array, o=pos.length/3; for(let i=0;i<P.count;i++) pos.push(P.getX(i),P.getY(i),P.getZ(i)); for(const v of I) idx.push(v+o); }
    const gc=new THREE.BufferGeometry(); gc.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); gc.setIndex(idx); gc.computeVertexNormals(); gc.computeBoundingBox(); G.cx=gc; }
  if(spot) for(const k of ['u','l']){ G[k+'s']=gSubGeo(G0[k],spot); { const e=0.025; G[k+'sx']=gSubGeo(G0[k],(x,y,z)=>spot(x,y,z)||spot(x+e,y,z)||spot(x-e,y,z)||spot(x,y+e,z)||spot(x,y-e,z)||spot(x,y,z+e)||spot(x,y,z-e)); }   // 비늘은 바탕보다 2.5 cm 넓게 단다(경계에 몇 화소 비치는 것은 사용자가 괜찮다고 함 · 4 cm 는 판을 너무 덮었다) — 바탕 끝이 비늘 밖으로 비쳤다
    G[k]=gSubGeo(G0[k],(x,y,z)=>{ const e=0.025; return !(spot(x,y,z)&&spot(x+e,y,z)&&spot(x-e,y,z)&&spot(x,y+e,z)&&spot(x,y-e,z)&&spot(x,y,z+e)&&spot(x,y,z-e)); }); }   // 판은 비늘 자리 안쪽으로 2.5 cm 더 깐다 — 경계에서 비늘 바탕 끝이 비쳤다
  /* 비늘 밑 바탕은 4 mm 밀어 넣는다 — 비늘이 옆으로 비껴 보이는 틈에서 바탕이 한두 화소씩 비쳤다. 법선이 뒤집힌 데서 4 mm 밖으로 나가도 비늘(6 mm 띄움) 밑이다. 1.4 cm 일 땐 그게 비늘을 덮었다 */
  const sink=k=>{ const g=G[k].clone(), P=g.attributes.position.clone(), N=g.attributes.normal; for(let i=0;i<P.count;i++){ const x=P.getX(i), y=P.getY(i), z=P.getZ(i); let nx=N.getX(i), ny=N.getY(i), nz=N.getZ(i); if(nx*x+nz*z<0&&!(y>1.36&&x*x+z*z<0.13*0.13)&&y>0.2){   // 목둘레·발은 몸 가운데 기준이 틀린다 — 모형 법선 그대로
      nx=-nx; ny=-ny; nz=-nz; }   // 모형 법선이 안쪽을 볼 때가 있다(등) — 바깥으로 돌려 놓고 민다
      const rim=(y>1.40&&x*x+z*z<0.13*0.13)?0.01:0;   // 목둘레 끝(투구를 떼어 낸 자리) — 안팎 비늘 사이로 바탕 윗단이 비친다, 1 cm 내려 비늘 밑에 숨긴다
      const dd=(y>0.1&&y<0.17)?0.002:((y>0.25&&y<0.34&&Math.abs(Math.abs(x)-0.2)<0.03&&Math.abs(z-0.06)<0.04)||(y>1.04&&y<1.1&&Math.abs(Math.abs(x)-0.185)<0.02&&Math.abs(z+0.08)<0.025))?0.014:0.006;   // 장화 목은 얕게(접힌 데라 깊이 밀면 거꾸로 튀어나온다) · 정강이 옆 망토 안단 · 옆구리 뒤(복합 판 경계)는 깊게
      P.setXYZ(i,x-nx*dd,y-ny*dd-rim,z-nz*dd); } g.setAttribute('position',P); return g; };
  const put=(k,m,hide)=>{ const me=new THREE.Mesh(sc&&scaleOn.includes(k)?sink(k):G[k],m); if(sc&&scaleOn.includes(k)) me.userData.under=true; b.add(hide?gHide(me):me);
    if(sc&&scaleOn.includes(k)){ const s=gScalesOnMesh(G[k+'x']||G[k],sc.mat,gScaleGeo('dropL'),0.013,11+k.length); b.add(hide?gHide(s):s); } };
  put('u',mat); put('l',mat,true); put('c',cloth,true);
  if(spot){ put('us',mat); put('ls',mat,true); return; }
  /* 윗몸은 판인데 아래만 비늘인 갑옷(복합)은 판 아랫단(1.02 m 밑)에도 비늘을 올린다 — 비늘 자락과 판 사이에 바탕이 한 줄 비쳤다 */
  if(sc&&!scaleOn.includes('u')&&scaleOn.length){ const g2=G.u.clone(), I=G.u.index.array, P=G.u.attributes.position, keep=[];
    for(let k=0;k<I.length;k+=3) if((P.getY(I[k])+P.getY(I[k+1])+P.getY(I[k+2]))/3<1.02) keep.push(I[k],I[k+1],I[k+2]);
    g2.setIndex(keep); g2.computeBoundingBox(); b.add(gHide(gScalesOnMesh(g2,sc.mat,gScaleGeo('dropL'),0.013,19))); }
}
const GEAR={ plate_steel:gPlate,
  scale_bronze:g=>gSentArmor(g,gM('scB',0x5a4020,0.8,0.5),gM('scB',0x5a4020,0.8,0.5),{mat:gScaleMat('bronze'),geo:gScaleGeo('drop')},['u','l','c']), scale_iron:g=>gSentArmor(g,gM('scI',0x45423e,0.8,0.5),gM('scI',0x45423e,0.8,0.5),{mat:gScaleMat('iron'),geo:gScaleGeo('drop')},['u','l','c']), scale_ember:g=>gSentArmor(g,gM('scE',0x120e0d,0.6,0.5),gM('scE',0x120e0d,0.6,0.5),{mat:gScaleMat('ember'),geo:gScaleGeo('drop')},['u','l','c']),
  scale_chitin:g=>gSentArmor(g,GMT.chitin(),GMT.leather(0x2a2018,[1,1])), scale_ember_chitin:g=>gSentArmor(g,GMT.chitin(),GMT.leather(0x181312,[1,1]),{mat:gScaleMat('ember'),geo:gScaleGeo('drop')},['us','ls','c'],gEmberSpot),
  helm_steel:gHelmSteel,
  helm_bronze:g=>gSentHelm(g,GMT.bronze(),gM('plumeH',0xb02a1c,0,0.85)),                 // 청동 — 붉은 말총
  helm_chitin:g=>gSentHelm(g,GMT.chitin(),GMT.chitinE()),                                // 키틴 — 밝은 초록 키틴 볏
  helm_ember:g=>gSentHelm(g,gM('scE',0x120e0d,0.6,0.5),GMT.glow(),gScaleMat('ember')),                      // 잿불 — 검은 껍질 · 달아오른 볏
  helm_ember_chitin:g=>gSentHelm(g,GMT.chitin(),GMT.chitin(),gScaleMat('ember')),                             // 복합 — 키틴에 잿불 비늘 · 키틴 깃
  helm_hide:g=>gSentHelm(g,GMT.leather(0x6b4a2e,[1,1]),GMT.fur(0xd9cdb4)),               // 가죽 — 흰 털 장식
  helm_bone:g=>gSentHelm(g,GMT.bone(),GMT.leather(0x3a2618,[1,1])),                      // 뼈 — 짙은 가죽 끈 장식
  tunic_fiber:gTunic, coat_hide:gHideCoat, cape_grass:gStrawCape, pack_woven:gPackWoven, pack_hide:gPackHide };
/* 착용품 하나를 몸 좌표로 빚어 돌려준다 — 없으면 null. 머리는 'head' 한 묶음 */
function gearModel(id){
  const f=GEAR[id]; if(!f) return null;
  const g=new THREE.Group(); g.userData.gear=id;
  if(/^helm_/.test(id)){ const h=gBone(g,'head'); f(h); } else f(g);
  return g;
}
/* 인스턴스까지 넣은 경계 상자(Box3.setFromObject 는 인스턴스를 안 본다) — 숨긴 것은 뺀다 */
function gBox(obj){
  const bb=new THREE.Box3(), b=new THREE.Box3(), m=new THREE.Matrix4(); obj.updateMatrixWorld(true);
  obj.traverseVisible(o=>{ const g=o.geometry; if(!g) return; if(!g.boundingBox) g.computeBoundingBox();
    if(o.isInstancedMesh){ for(let i=0;i<o.count;i++){ o.getMatrixAt(i,m); m.premultiply(o.matrixWorld); bb.union(b.copy(g.boundingBox).applyMatrix4(m)); } }
    else bb.union(b.copy(g.boundingBox).applyMatrix4(o.matrixWorld)); });
  return bb;
}
