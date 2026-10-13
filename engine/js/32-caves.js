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
void main(){ float d=length(gl_PointCoord-0.5)*2.0, a=exp(-d*d*4.5)*vA; if(a<0.012) discard; gl_FragColor=vec4(vec3(0.40,1.0,0.84)*a,a); }`,
    blending:THREE.AdditiveBlending, depthWrite:false, transparent:true}));
}
function buildCaves(){
  for(const m of CAVE_MESH){ scene.remove(m); m.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); } CAVE_MESH.length=0;
  if(typeof CAVES==='undefined'||!CAVES.length) return;
  const mat=cragMat();                                 // 화강암 재질 + 덩이마다 다른 빛깔(33-crags.js)
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), S=new THREE.Vector3(), nm=new THREE.Matrix3(), v=new THREE.Vector3();
  const adiff=(a,b)=>{ let d=(a-b)%6.2832; if(d>3.1416) d-=6.2832; if(d<-3.1416) d+=6.2832; return Math.abs(d); };
  for(const c of CAVES){
    if(c.rooms.some(r=>inLanding(r.x,r.z,r.R+8))){ c.off=1; continue; }
    const rnd=mulberry32(c.seed>>>0), P=[], Nn=[], I=[], ML=[], CL=[], TB=0.74+0.34*rnd(), T0=CRAG_TINT[(rnd()*CRAG_TINT.length)|0];
    const GP=[], GA=[], SP=[], SC=[], SI=[], lamps=[];   // 빛나는 점(자리 · 크기/위상/밝기) · 버섯(자리 · 빛깔 · 세모) · 방의 불빛
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
        if(rnd()>(col>0.5?(roof?0.90:0.30):0.10)) continue;
        let u=rnd(), w=rnd(); if(u+w>1){ u=1-u; w=1-w; } const q=1-u-w;
        GP.push(P[a]*q+P[b]*u+P[d]*w+nx*0.05, P[a+1]*q+P[b+1]*u+P[d+1]*w+ny*0.05, P[a+2]*q+P[b+2]*u+P[d+2]*w+nz*0.05);
        GA.push(0.07+rnd()*0.09,rnd(),0.75+rnd()*0.25); } };
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
    const rock=(x,y,z,r,sy,melt)=>{
      const g=SHP.blob(1,(rnd()*1e6)|0,{w:10,h:7,amp:0.26,nb:4}), pa=g.attributes.position.array, na=g.attributes.normal.array, o=P.length/3;
      const cb=TB*(0.78+0.44*rnd());                  // 덩이마다 밝기가 다르다
      E.set(rnd()*0.5-0.25,rnd()*6.283,rnd()*0.5-0.25); Q.setFromEuler(E); V.set(x,y,z); S.set(r*(0.9+rnd()*0.3),r*sy,r*(0.9+rnd()*0.3)); M.compose(V,Q,S); nm.getNormalMatrix(M);
      for(let i=0;i<pa.length;i+=3){ v.set(pa[i],pa[i+1],pa[i+2]).applyMatrix4(M); P.push(v.x,v.y,v.z);
        v.set(na[i],na[i+1],na[i+2]).applyMatrix3(nm).normalize(); Nn.push(v.x,v.y,v.z); ML.push(melt); CL.push(cb*T0[0],cb*T0[1],cb*T0[2]); }
      const ix=g.index.array, i0=I.length; for(let i=0;i<ix.length;i++) I.push(o+ix[i]);
      g.dispose(); return i0; };
    for(const rm of c.rooms){
      const R=rm.R, n1=Math.max(9,Math.round((R+1.7)*6.283/4.1)), n2=Math.max(6,Math.round(R*6.283/5.4)), a0=rnd()*6.283;
      for(let i=0;i<n1;i++){ const a=a0+i/n1*6.283; if(rm.open.some(o=>adiff(a,o)<0.50)) continue;       // 벽 — 터진 데는 비운다
        const r=2.7+rnd()*0.8, d=R+r*0.55, x=rm.x+Math.cos(a)*d, z=rm.z+Math.sin(a)*d, gy=heightAt(x,z);
        const i0=rock(x,gy+r*0.55,z,r,1.0+rnd()*0.25,1.1); glowOn(i0,I.length,rm,false);
        COLLIDERS.push({x,z,r:r*0.86}); }
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
        GP.push(bx,heightAt(bx,bz)+0.22,bz); GA.push(1.5,rnd(),0.30); }
      lamps.push([rm.x,rm.y+2.5,rm.z,R+4.5]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));
    g.setAttribute('aMelt',new THREE.Float32BufferAttribute(ML,1)); g.setAttribute('color',new THREE.Float32BufferAttribute(CL,3)); g.setIndex(I); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat); m.matrixAutoUpdate=false; m.updateMatrix(); m.userData.cave=c; m.visible=false;
    if(GP.length){ const gg=new THREE.BufferGeometry(); gg.setAttribute('position',new THREE.Float32BufferAttribute(GP,3)); gg.setAttribute('aG',new THREE.Float32BufferAttribute(GA,3));
      gg.computeBoundingSphere(); const pt=new THREE.Points(gg,caveGlowMat()); pt.matrixAutoUpdate=false; m.add(pt); }
    if(SI.length){ const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.Float32BufferAttribute(SP,3)); sg.setAttribute('color',new THREE.Float32BufferAttribute(SC,3)); sg.setIndex(SI);
      sg.computeBoundingSphere(); const sm=new THREE.Mesh(sg,CAVE_SHROOM||(CAVE_SHROOM=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
      sm.matrixAutoUpdate=false; sm.userData.lightRole='none'; m.add(sm); }
    for(const l of lamps) LIGHT.addFire(m,{color:0x58ffd0,intensity:0.62,dist:l[3],pos:[l[0],l[1],l[2]]});
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
