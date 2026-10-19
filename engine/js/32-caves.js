/* 32-caves.js — CASTAWAY
   동굴 — 가파른 바위 비탈에 선 바위 굴집(자리와 속의 광석은 10-worldgen.js caveSites 가 정한다)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   동굴
   ----------------------------------------------------------------------------
   땅은 높이 지도 한 장이라 속을 팔 수 없다(굴은 위아래로 겹친 면이 있어야 한다). 그래서 굴을 **땅 위에 짓는다**:
   집채만 한 바위 스무 남짓이 둥글게 둘러서고(벽), 안쪽으로 기울어 얹히고(둘째 단), 가운데를 덮는다(지붕).
   방 하나는 지름 10~14 m · 머리 위 3~4 m 의 그늘진 자리다. 굴 하나는 그런 방 1~3 개가 등고선을 따라 이어진 것이고,
   첫 방의 비탈 아래쪽이 터져 있다 — 입구. 바닥에 금속 광석이 모여 있다.
   · 굴 하나가 메시 하나다(바위를 한 덩이로 합친다 · 화강암 재질 — 밑동이 땅에 녹아든다). 420 m 밖의 굴은 안 그린다.
   · 벽 바위마다 몸이 막히는 원을 둔다(터진 데로만 드나든다). 지붕은 머리 위라 안 막는다.
   · 지형 판 1(옛 저장)에는 굴이 없다. 착륙 자리에 걸린 굴은 안 짓는다.
   · **굴 속의 빛**(사용자 요청 — 불 없이도 더듬어 일할 만큼): 천장과 벽 안쪽에 반딧불이 유충 무리가 청록빛 점으로 붙어 깜박이고
     (빛나는 점 — 뉴질랜드 와이토모 굴의 그것), 바닥 가장자리에 빛나는 버섯이 무더기로 돋는다. 방마다 약한 청록 불빛 하나를
     불빛 풀(40-light.js)에 걸어 둔다 — 광원 수는 안 는다(풀의 세 자리 가운데 남는 자리를 쓰고, 모닥불·횃불이 있으면 그쪽이 먼저다).
   ========================================================================== */
const CAVE_MESH=[];
/* ── 굴 바위의 참 꼴(눈의 경계 — 사용자 지적: 굴 벽·바위에 붙어 고개를 조금 돌리면 속이 보인다) ──────────────
   예전엔 벽 바위마다 원 하나(반지름의 0.86)로만 몸을 막았다. 바위는 혹(±26 %)이 난 덩이라 넓은 쪽에서는 원보다 한참 나와 있어
   몸은 원 밖인데 눈이 바위 속에 들었다. 이제 ① 몸은 그 바위가 몸 높이에서 실제로 내민 만큼(방위 16 · `prof`) 막히고
   ② 눈(80-player.js eyeHit)은 바위마다 적어 둔 **방향별 반지름 표**(덩이를 빚은 공의 위도·경도 칸 그대로)로 속인지 본다 —
   벽 · 처마 · 지붕 · 문틀 바위 모두. 표는 8 m 칸에 담는다 */
const CAVE_SOL=new Map(), CSG=8, csKey=(gx,gz)=>(gx+4096)*8192+(gz+4096);
const _csV=new THREE.Vector3();
function caveSolid(x,y,z){
  const a=CAVE_SOL.get(csKey(Math.floor(x/CSG),Math.floor(z/CSG))); if(!a) return false;
  for(const s of a){
    const dx=x-s.x, dy=y-s.y, dz=z-s.z; if(dx*dx+dy*dy+dz*dz>s.R*s.R) continue;
    const m=s.m, qx=(m[0]*dx+m[1]*dy+m[2]*dz)/s.sx, qy=(m[3]*dx+m[4]*dy+m[5]*dz)/s.sy, qz=(m[6]*dx+m[7]*dy+m[8]*dz)/s.sz;   // 바위의 빚기 자리로(돌림을 되돌리고 늘인 만큼 줄인다)
    const q=Math.sqrt(qx*qx+qy*qy+qz*qz); if(q<1e-6) return true;
    const W=s.w, Hh=s.h, th=Math.acos(clamp(qy/q,-1,1))/Math.PI*Hh, ph=((Math.atan2(qz,-qx)/6.2832)+1)%1*W;   // 공 꼭짓점의 위도·경도 칸
    const j=Math.min(Hh-1,Math.floor(th)), i=Math.min(W-1,Math.floor(ph)), K=s.k, r1=W+1;
    const kk=Math.max(K[j*r1+i],K[j*r1+i+1],K[(j+1)*r1+i],K[(j+1)*r1+i+1]);   // 네 모서리 가운데 큰 것(덜 들어가게)
    if(q<kk*1.03) return true;
  }
  return false;
}
let CAVE_GLOW=null, CAVE_SHROOM=null;                  // 빛나는 점 · 버섯의 재질(굴 전체가 함께 쓴다)
function caveGlowMat(){
  return CAVE_GLOW||(CAVE_GLOW=new THREE.ShaderMaterial({
    uniforms:{uT:{value:0},uPx:{value:700}},
    vertexShader:`attribute vec3 aG;                    // x 크기(m) · y 깜박임 위상 · z 밝기
uniform float uT; uniform float uPx; varying float vA;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
  float tw=0.70+0.30*sin(uT*(0.5+fract(aG.y*7.31)*0.9)+aG.y*40.0);
  float s=aG.x*uPx/max(0.3,-mv.z);
  vA=aG.z*tw*clamp(s/2.0,0.0,1.0); gl_PointSize=clamp(s,2.0,96.0); }`,
    fragmentShader:`varying float vA;
void main(){ float d=length(gl_PointCoord-0.5)*2.0, a=(exp(-d*d*11.0)+0.38*exp(-d*d*2.6))*vA; if(a<0.012) discard; gl_FragColor=vec4(vec3(0.40,1.0,0.84)*a,a); }   // 밝은 알맹이 + 엷은 빛무리`,
    blending:THREE.AdditiveBlending, depthWrite:false, transparent:true}));
}
function buildCaves(){
  for(const m of CAVE_MESH){ scene.remove(m); m.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); } CAVE_MESH.length=0; CAVE_SOL.clear();
  if(typeof CAVES==='undefined'||!CAVES.length) return;
  const mat=cragMat();                                 // 화강암 재질 + 덩이마다 다른 빛깔(33-crags.js)
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), S=new THREE.Vector3(), nm=new THREE.Matrix3(), v=new THREE.Vector3();
  const adiff=(a,b)=>{ let d=(a-b)%6.2832; if(d>3.1416) d-=6.2832; if(d<-3.1416) d+=6.2832; return Math.abs(d); };
  for(const c of CAVES){
    if(c.rooms.some(r=>inLanding(r.x,r.z,r.R+8))){ c.off=1; continue; }
    const rnd=mulberry32(c.seed>>>0), P=[], Nn=[], I=[], ML=[], CL=[], TB=0.74+0.34*rnd(), T0=CRAG_TINT[(rnd()*CRAG_TINT.length)|0];
    const GP=[], GA=[], SP=[], SC=[], SI=[], lamps=[], DRIP=[];   // DRIP: 종유석이 달릴 천장 자리   // 빛나는 점(자리 · 크기/위상/밝기) · 버섯(자리 · 빛깔 · 세모) · 방의 불빛
    /* 바위 한 덩이의 세모(I 의 i0~i1)에서 빛나는 점을 뿌린다 — roof: 아래를 보는 면(천장) · 아니면 방 가운데를 보는 면(벽 안쪽).
       고르게 뿌리지 않고 무리(col)를 짓는다 */
    const p1=rnd()*6.283, p2=rnd()*6.283;
    const glowOn=(i0,i1,rm,roof)=>{ for(let t=i0;t<i1;t+=3){ const a=I[t]*3, b=I[t+1]*3, d=I[t+2]*3;
        const cx=(P[a]+P[b]+P[d])/3, cy=(P[a+1]+P[b+1]+P[d+1])/3, cz=(P[a+2]+P[b+2]+P[d+2])/3;
        let nx=Nn[a]+Nn[b]+Nn[d], ny=Nn[a+1]+Nn[b+1]+Nn[d+1], nz=Nn[a+2]+Nn[b+2]+Nn[d+2]; const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
        const dx=rm.x-cx, dz=rm.z-cz, dh=Math.hypot(dx,dz), up=cy-rm.y;
        if(roof){ if(ny>-0.3||dh>rm.R-0.3||up<1.9) continue; }
        else{ if(dh>rm.R+0.9||up<1.2||up>4.2||(nx*dx+nz*dz)/(dh||1)<0.45) continue; }
        const col=0.5+0.5*Math.sin(cx*1.1+p1)*Math.sin(cz*0.9+p2);
        if(roof&&up>3.0&&dh<rm.R-1.2&&rnd()<0.045) DRIP.push(cx,cy,cz);             // 천장 높은 데 — 종유석 자리(물이 떨어지는 데)
        if(rnd()>(col>0.5?(roof?0.90:0.30):0.10)) continue;
        let u=rnd(), w=rnd(); if(u+w>1){ u=1-u; w=1-w; } const q=1-u-w;
        GP.push(P[a]*q+P[b]*u+P[d]*w+nx*0.05, P[a+1]*q+P[b+1]*u+P[d+1]*w+ny*0.05, P[a+2]*q+P[b+2]*u+P[d+2]*w+nz*0.05);
        GA.push(0.16+rnd()*0.20,rnd(),0.75+rnd()*0.25); } };
    /* 빛나는 버섯 한 송이 — 대(여덟 모) + 갓(반구). 둥글게 빚는다 */
    const shroom=(x,y,z,r,h,lean,la)=>{ const o=SP.length/3, SG=10, lx=Math.cos(la)*lean, lz=Math.sin(la)*lean;
      for(let k=0;k<2;k++) for(let j=0;j<SG;j++){ const a=j/SG*6.283, rr=r*(k?0.22:0.34); SP.push(x+Math.cos(a)*rr+lx*k*h,y+k*h-0.02*(1-k),z+Math.sin(a)*rr+lz*k*h); SC.push(0.10+0.10*k,0.34+0.22*k,0.29+0.19*k); }
      for(let j=0;j<SG;j++){ const j1=(j+1)%SG; SI.push(o+j,o+SG+j,o+j1, o+j1,o+SG+j,o+SG+j1); }
      const o2=SP.length/3, RG=4, tx=x+lx*h, tz=z+lz*h;
      for(let k=0;k<=RG;k++){ const ph=k/RG*1.5708, rr=r*Math.cos(ph)*(k?1:1.06), yy=y+h-r*0.10+r*0.78*Math.sin(ph);
        for(let j=0;j<SG;j++){ const a=j/SG*6.283; SP.push(tx+Math.cos(a)*rr,yy,tz+Math.sin(a)*rr); const g=k/RG; SC.push(0.22+0.34*g,0.86+0.14*g,0.68+0.22*g); } }
      for(let k=0;k<RG;k++) for(let j=0;j<SG;j++){ const j1=(j+1)%SG, a=o2+k*SG+j, b=o2+k*SG+j1, e=a+SG, f=b+SG; SI.push(a,e,b, b,e,f); }
      const oc=SP.length/3; SP.push(tx,y+h-r*0.10,tz); SC.push(0.12,0.52,0.42);                       // 갓 밑(주름) — 한 톤 어둡다
      for(let j=0;j<SG;j++) SI.push(oc,o2+j,o2+(j+1)%SG); };
    let rkO=0, rkN=0;                                  // 방금 빚은 바위의 꼭짓점 자리(P 의 몇 번째부터 몇 개) — 벽 바위의 몸 테두리를 뽑는다
    const rock=(x,y,z,r,sy,melt,tone)=>{
      const g=SHP.blob(1,(rnd()*1e6)|0,{w:10,h:7,amp:0.26,nb:4}), pa=g.attributes.position.array, na=g.attributes.normal.array, o=P.length/3;
      const cb=(tone||TB)*(0.78+0.44*rnd());          // 덩이마다 밝기가 다르다(tone — 종유석은 밝은 석회빛)
      E.set(rnd()*0.5-0.25,rnd()*6.283,rnd()*0.5-0.25); Q.setFromEuler(E); V.set(x,y,z); S.set(r*(0.9+rnd()*0.3),r*sy,r*(0.9+rnd()*0.3)); M.compose(V,Q,S); nm.getNormalMatrix(M);
      /* 눈의 경계에 쓸 참 꼴 — 공 꼭짓점마다의 반지름(빚기 자리) · 되돌리는 돌림 · 늘인 몫. 종유석처럼 가는 것은 뺀다 */
      if(r*Math.min(1,sy)>=0.35){ const K=new Float32Array(pa.length/3); let km=0; for(let i=0;i<K.length;i++){ K[i]=Math.hypot(pa[i*3],pa[i*3+1],pa[i*3+2]); if(K[i]>km) km=K[i]; }
        const e=new THREE.Matrix4().makeRotationFromQuaternion(Q).elements;     // 열 우선 — 되돌림은 전치(행렬 m 의 행 = 돌림의 열)
        const s={x,y,z,sx:S.x,sy:S.y,sz:S.z,k:K,w:10,h:7,m:[e[0],e[1],e[2],e[4],e[5],e[6],e[8],e[9],e[10]],R:Math.max(S.x,S.y,S.z)*km*1.05};
        for(let gz=Math.floor((z-s.R)/CSG);gz<=Math.floor((z+s.R)/CSG);gz++) for(let gx=Math.floor((x-s.R)/CSG);gx<=Math.floor((x+s.R)/CSG);gx++){
          const k=csKey(gx,gz); let a=CAVE_SOL.get(k); if(!a) CAVE_SOL.set(k,a=[]); a.push(s); } }
      for(let i=0;i<pa.length;i+=3){ v.set(pa[i],pa[i+1],pa[i+2]).applyMatrix4(M); P.push(v.x,v.y,v.z);
        v.set(na[i],na[i+1],na[i+2]).applyMatrix3(nm).normalize(); Nn.push(v.x,v.y,v.z); ML.push(melt); CL.push(cb*T0[0],cb*T0[1],cb*T0[2]); }
      const ix=g.index.array, i0=I.length; for(let i=0;i<ix.length;i++) I.push(o+ix[i]);
      rkO=o; rkN=pa.length/3; g.dispose(); return i0; };
    /* 몸 높이(발 밑 0.2 m ~ 머리 위 0.3 m)에서 바위가 방위마다 내민 거리 — 16 방위 · 빈 방위는 이웃으로 메운다 */
    const profOf=(cx,cz,y0,y1)=>{ const K=16, pr=new Float32Array(K); let mx=0;
      for(let q=rkO;q<rkO+rkN;q++){ const py=P[q*3+1]; if(py<y0||py>y1) continue; const dx=P[q*3]-cx, dz=P[q*3+2]-cz, d=Math.hypot(dx,dz), k=Math.floor((Math.atan2(dz,dx)/6.2832+1)%1*K)%K; if(d>pr[k]) pr[k]=d; }
      const f=pr.slice(); for(let k=0;k<K;k++){ f[k]=Math.max(pr[k],0.5*(pr[(k+K-1)%K]+pr[(k+1)%K])); if(f[k]>mx) mx=f[k]; }
      return {pr:f,mx}; };
    for(const rm of c.rooms){
      const R=rm.R, n1=Math.max(9,Math.round((R+1.7)*6.283/4.1)), n2=Math.max(6,Math.round(R*6.283/5.4)), a0=rnd()*6.283;
      for(let i=0;i<n1;i++){ const a=a0+i/n1*6.283; if(rm.open.some(o=>adiff(a,o)<0.50)) continue;       // 벽 — 터진 데는 비운다
        const r=2.7+rnd()*0.8, d=R+r*0.55, x=rm.x+Math.cos(a)*d, z=rm.z+Math.sin(a)*d, gy=heightAt(x,z);
        const i0=rock(x,gy+r*0.55,z,r,1.0+rnd()*0.25,1.1); glowOn(i0,I.length,rm,false);
        const pf=profOf(x,z,Math.min(gy,rm.y)-0.2,Math.max(gy,rm.y)+2.2);
        COLLIDERS.push(pf.mx>0.5?{x,z,r:pf.mx,prof:pf.pr}:{x,z,r:r*0.86}); }
      for(let i=0;i<n2;i++){ const a=a0+0.3+i/n2*6.283, r=2.8+rnd()*0.7, d=R-0.6, x=rm.x+Math.cos(a)*d, z=rm.z+Math.sin(a)*d;   // 둘째 단 — 안으로 기운 처마
        const i0=rock(x,Math.max(rm.y,heightAt(x,z))+4.9+rnd()*0.5,z,r,0.72,0.3); glowOn(i0,I.length,rm,true); }
      for(let i=0;i<5;i++){ const a=rnd()*6.283, d=i?R*0.45*rnd()+0.6:0, x=rm.x+Math.cos(a)*d, z=rm.z+Math.sin(a)*d;                  // 지붕
        const i0=rock(x,Math.max(rm.y,heightAt(x,z))+6.6+rnd()*0.5,z,3.6+rnd()*0.8,0.55,0.3); glowOn(i0,I.length,rm,true); }
      for(const o of rm.open){ const x=rm.x+Math.cos(o)*(R+1.0), z=rm.z+Math.sin(o)*(R+1.0); rock(x,Math.max(rm.y,heightAt(x,z))+6.1,z,3.3,0.5,0.3); }   // 터진 데 위에 걸친 문틀 바위
      /* 버섯 무더기 — 벽 밑을 따라 네댓 군데(터진 데는 비운다). 무더기마다 은은한 빛무리 하나 */
      for(let k=0,n=4+((rnd()*3)|0);k<n;k++){ const a=rnd()*6.283; if(rm.open.some(o=>adiff(a,o)<0.7)) continue;
        const d=R-0.5-rnd()*1.3, bx=rm.x+Math.cos(a)*d, bz=rm.z+Math.sin(a)*d;
        for(let j=0,m=4+((rnd()*6)|0);j<m;j++){ const x=bx+(rnd()-0.5)*0.9, z=bz+(rnd()-0.5)*0.9, r=0.06+rnd()*0.11;
          shroom(x,heightAt(x,z),z,r,0.10+rnd()*0.22+r,rnd()*0.35,rnd()*6.283); }
        GP.push(bx,heightAt(bx,bz)+0.22,bz); GA.push(1.9,rnd(),0.34); }
      lamps.push([rm.x,rm.y+2.6,rm.z,R+8]);
    }
    /* **종유석과 석순** — 천장에서 물이 떨어지는 자리마다 고드름 꼴의 돌이 달리고(길이 0.6~1.9 m), 그 밑 바닥에는 석순이 솟는다
       (셋에 둘 — 더 굵고 짧다). 머리 위 2 m 는 비워 둔다. 밝은 석회빛이다. 몸은 안 막는다(천장에 달렸거나 발목~무릎 높이) */
    for(let q=0,nd=Math.min(DRIP.length/3,14*c.rooms.length);q<nd;q++){ const x=DRIP[q*3], cy0=DRIP[q*3+1], z=DRIP[q*3+2], fy=heightAt(x,z);
      const len=Math.min(0.6+1.3*rnd()*rnd(),Math.max(0.3,cy0-fy-2.0)), r=0.10+0.10*rnd();
      rock(x,cy0-len*0.42,z,r,len*0.5/r,0.02,1.25);
      if(rnd()<0.66){ const h2=0.25+0.5*rnd(), r2=0.14+0.12*rnd(); rock(x+(rnd()-0.5)*0.15,fy+h2*0.30,z+(rnd()-0.5)*0.15,r2,h2*0.6/r2,0.25,1.18); } }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));
    g.setAttribute('aMelt',new THREE.Float32BufferAttribute(ML,1)); g.setAttribute('color',new THREE.Float32BufferAttribute(CL,3)); g.setIndex(I); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat); m.matrixAutoUpdate=false; m.updateMatrix(); m.userData.cave=c; m.visible=false;
    if(c.dark){ GP.length=0; SI.length=0; lamps.length=0; }   // 다지류의 둥지 — 불빛도 빛나는 것도 없다(97-mobs.js mobsSites · 난수 차례는 그대로 두려고 다 빚은 뒤에 버린다)
    if(GP.length){ const gg=new THREE.BufferGeometry(); gg.setAttribute('position',new THREE.Float32BufferAttribute(GP,3)); gg.setAttribute('aG',new THREE.Float32BufferAttribute(GA,3));
      gg.computeBoundingSphere(); const pt=new THREE.Points(gg,caveGlowMat()); pt.matrixAutoUpdate=false; m.add(pt); }
    if(SI.length){ const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.Float32BufferAttribute(SP,3)); sg.setAttribute('color',new THREE.Float32BufferAttribute(SC,3)); sg.setIndex(SI);
      sg.computeBoundingSphere(); const sm=new THREE.Mesh(sg,CAVE_SHROOM||(CAVE_SHROOM=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
      sm.matrixAutoUpdate=false; sm.userData.lightRole='none'; m.add(sm); }
    for(const l of lamps) LIGHT.addFire(m,{color:0x58ffd0,intensity:2.3,dist:l[3],pos:[l[0],l[1],l[2]]});   // 한밤에도 광석과 벽이 분간된다(횃불 26 m·모닥불 22 m 에 견주면 어둑하다)
    c.glow=GP.length/3;
    scene.add(m); CAVE_MESH.push(m);
  }
  buildColliderGrid();
}
/* 먼 굴은 안 그린다(굴 하나에 세모 3천~1만 — 섬에 수십) */
let _caveT=0;
function updateCaves(){
  if(!CAVE_MESH.length) return;
  if(CAVE_GLOW){ CAVE_GLOW.uniforms.uT.value=performance.now()*0.001;
    CAVE_GLOW.uniforms.uPx.value=((typeof CAMC!=='undefined'&&CAMC.rt)?CAMC.rt.height:renderer.domElement.height)*0.5*camera.projectionMatrix.elements[5]; }
  if(_caveT++&15) return;
  const px=PL.pos.x, pz=PL.pos.z;
  for(const m of CAVE_MESH){ const c=m.userData.cave, v=(c.x-px)*(c.x-px)+(c.z-pz)*(c.z-pz)<420*420;
    if(m.visible!==v){ m.visible=v; LIGHT.dirtyAt(c.x,c.z,30); } }
}
