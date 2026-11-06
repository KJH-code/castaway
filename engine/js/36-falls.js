/* 36-falls.js — CASTAWAY
   폭포와 연어 — 하천이 가파르게 떨어지는 데의 흰 물살 · 물보라 · 소(웅덩이) · 거슬러 뛰어오르는 연어(지형 판 5)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   폭포(사용자 요청)
   ----------------------------------------------------------------------------
   하천 칸에서 물이 흘러가는 이웃(수면이 가장 낮은 하천 칸)과의 수면 차가 4 m 넘는 곳 — 그 가운데 서로 120 m 넘게 떨어진 것을 고른다.
   땅은 높이 지도라 곧은 절벽은 없다 — 하천 바닥을 따라 내리꽂히는 **흰 물살 판**(위에서 아래로 흐르는 결 · 가장자리는 옅게)과
   밑의 **소**(하얗게 이는 거품 원판) · **물보라**(점 무리)로 폭포를 그린다.
   **연어** — 폭포 밑 소에 여섯~열 마리가 맴돌고, 몇 초마다 한 마리가 물살을 거슬러 위로 뛰어오른다(포물선).
   낚싯대로 폭포 둘레(70 m)의 하천에 찌를 던지면 연어가 문다(96-sea.js rodPick) — 큰 고기라 그물로는 안 잡힌다.
   자리는 시드가 정한다(저장에 안 넣는다). 지형 판 5 밑에는 없다.

   **지형 판 7 — 저수지 폭포**(사용자 요청: 폭포는 높은 저수지에서 낮은 하천의 시작으로 떨어져야 한다)
   하천이 처음 생기는 칸(물머리 — 위로 이어진 하천 칸이 없다) 가운데 뒤(오르막)가 10 m 넘게 솟은 데를 고른다. 거기서
     ① 물머리에 **소**를 판다(반지름 7~10 m · 하천의 시작 — 물은 여기서 아래 하천으로 흘러간다)
     ② 소 뒤 한 걸음에 **벼랑 턱**을 세운다 — 턱 앞은 소 높이로 누르고 뒤는 저수지 둑 높이로 올린다
     ③ 턱 뒤 오르막에 **저수지**(반지름 18~32 m · 깊이 2.5 m · 둘레 둑은 수면보다 높게)를 판다 — 수면은 소보다 10~32 m 높다
     ④ 턱에 **바위벽**을 세운다(벼랑 바위 덩이 — 33-crags.js 와 같은 재질 · 몸 막힘 · 앞면이 거의 곧다)
     ⑤ 물은 저수지 가장자리에서 둑을 넘어 **곧게 떨어진다**(떨어지며 조금씩 앞으로 휜다) — 소에 거품과 물보라
   높이 지도가 바뀌므로 자원을 놓기 전에(placeResources) 판다. 저수지와 소는 하천 칸이라 하천 수면 판(20-terrain.js)이 그대로 덮는다.
   ========================================================================== */
const FALLS={list:[], meshes:[], U:{uFT:{value:0}}, fish:null, mist:null, t:0};
function fallsClear(){ for(const m of FALLS.meshes){ scene.remove(m); if(m.geometry) m.geometry.dispose(); } FALLS.meshes.length=0; FALLS.list.length=0; FALLS.fish=null; FALLS.mist=null; }
/* 섬 배율을 키운 뒤 — 하천 칸의 수면 차로 폭포 자리를 찾는다 */
function fallsSites(){
  fallsClear(); if((P.tv|0)<5) return;
  if(PLAT.on){ plFalls(); return; }                                    // 지형 판 11 — 대지 가장자리의 폭포(14-plateau.js)
  if((P.tv|0)>=7){ fallsCarve(); return; }
  const W=F.wlev, R=F.river, dn=[-1,1,-N,N,-N-1,-N+1,N-1,N+1], cand=[];
  for(let z=2;z<N-2;z++) for(let x=2;x<N-2;x++){ const i=IDX(x,z); if(!R[i]) continue;
    let j=-1, lo=W[i]; for(const d of dn){ const k=i+d; if(R[k]&&W[k]<lo){ lo=W[k]; j=k; } }
    if(j>=0&&W[i]-lo>4) cand.push([W[i]-lo,i,j]); }
  cand.sort((a,b)=>b[0]-a[0]);
  for(const [drop,i,j] of cand){ if(FALLS.list.length>=24) break;
    const x0=(i%N-N/2)*CELL, z0=(((i/N)|0)-N/2)*CELL, x1=(j%N-N/2)*CELL, z1=(((j/N)|0)-N/2)*CELL;
    if(FALLS.list.some(f=>Math.hypot(f.x0-x0,f.z0-z0)<120)) continue;
    /* 하폭 — 물 흐름에 수직으로 하천 칸이 몇 칸 이어지나 */
    const dx=x1-x0, dz=z1-z0, L=Math.hypot(dx,dz)||1, nx=-dz/L, nz=dx/L; let w=1;
    for(const s of [1,-1]) for(let k=1;k<6;k++){ const gx=Math.round((x0+nx*s*k*CELL*0.5)/CELL+N/2), gz=Math.round((z0+nz*s*k*CELL*0.5)/CELL+N/2); if(gx<0||gz<0||gx>=N||gz>=N||!R[IDX(gx,gz)]) break; w++; }
    FALLS.list.push({x0,z0,y0:W[i],x1,z1,y1:W[j],drop,w:clamp(w*CELL*0.32,5,16),dx:dx/L,dz:dz/L});
  }
}
/* 지형 판 7 — 물머리 뒤에 저수지와 벼랑을 판다(맨 위 풀이 참고). 난수는 제 것(시드 ^ 상수) — 다른 지형의 난수 차례를 안 건드린다 */
function fallsCarve(){
  const E=F.elev, W=F.wlev, R=F.river, rnd=mulberry32((hashStr(String(P.seed))^0xfa115)>>>0);
  let hi=0; for(let i=0;i<E.length;i++) if(E[i]>hi) hi=E[i];
  const dn=[-1,1,-N,N,-N-1,-N+1,N-1,N+1], at=(x,z)=>{ const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2); return (gx<1||gz<1||gx>N-2||gz>N-2)?-1:IDX(gx,gz); };
  const cand=[];
  for(let z=4;z<N-4;z++) for(let x=4;x<N-4;x++){ const i=IDX(x,z); if(!R[i]||E[i]<Math.max(12,hi*0.10)) continue;
    let up=false, j=-1, lo=W[i]; for(const d of dn){ const k=i+d; if(!R[k]) continue; if(W[k]>W[i]+0.05) up=true; if(W[k]<lo){ lo=W[k]; j=k; } }
    if(up||j<0) continue;                                                          // 물머리 — 위로 이어진 하천 칸이 없다
    cand.push([i,j,rnd()]); }
  cand.sort((a,b)=>a[2]-b[2]);
  const want=Math.round(4+CELL*0.6);
  for(const [i,j] of cand){ if(FALLS.list.length>=want) break;
    const sx=(i%N-N/2)*CELL, sz=(((i/N)|0)-N/2)*CELL, jx=(j%N-N/2)*CELL, jz=(((j/N)|0)-N/2)*CELL;
    let ux=sx-jx, uz=sz-jz; const ul=Math.hypot(ux,uz)||1; ux/=ul; uz/=ul;      // 오르막(흐름의 반대)
    const tx=-uz, tz=ux;
    if(FALLS.list.some(f=>Math.hypot(f.px-sx,f.pz-sz)<320)) continue;
    const Lp=W[i], Rp=Math.max(7+rnd()*3,CELL*0.8), Rr=18+rnd()*14, Lc=Math.max(Rp+1.5,CELL*1.3), rimW=Math.max(6,CELL*1.6), cxr=sx+ux*(Lc+Rr+rimW), czr=sz+uz*(Lc+Rr+rimW);   // 둑은 칸 하나 반 넘게 — 저수지 칸이 턱 앞 칸과 맞닿으면 하천 판이 수면을 둑 밑으로 끌어내린다
    const ci=at(cxr,czr); if(ci<0) continue;
    /* 저수지 자리의 땅 — 가운데와 둘레 여섯 점 가운데 낮은 것. 그만큼이 저수지가 앉을 높이다(둑을 너무 높이 쌓지 않게) */
    let gmin=E[ci]; for(let k=0;k<6;k++){ const a=k/6*6.283, q=at(cxr+Math.cos(a)*Rr*0.8,czr+Math.sin(a)*Rr*0.8); if(q<0){ gmin=-1e9; break; } gmin=Math.min(gmin,E[q]); }
    const H=Math.min(32,gmin-1-Lp); if(!(H>=10)) continue;
    if(R[ci]) continue;                                                            // 저수지 자리가 다른 하천이면 안 된다
    const Lr=Lp+H, Wc=Rr*0.75;
    const reach=Lc+2*Rr+14, g0x=Math.floor((sx-reach)/CELL+N/2), g1x=Math.ceil((sx+reach)/CELL+N/2), g0z=Math.floor((sz-reach)/CELL+N/2), g1z=Math.ceil((sz+reach)/CELL+N/2);
    for(let gz=Math.max(1,g0z);gz<=Math.min(N-2,g1z);gz++) for(let gx=Math.max(1,g0x);gx<=Math.min(N-2,g1x);gx++){
      const k=IDX(gx,gz), x=(gx-N/2)*CELL, z=(gz-N/2)*CELL, dx=x-sx, dz=z-sz, a=dx*ux+dz*uz, b=dx*tx+dz*tz;
      const dp=Math.hypot(dx,dz), dr=Math.hypot(x-cxr,z-czr);
      /* 차례가 중요하다 — 소와 턱 앞(낮은 쪽)을 먼저 정하고, 그 뒤 저수지 · 둑 · 턱 뒤(높은 쪽). 둑 띠가 턱 앞까지 닿아 앞을 도로 높였었다 */
      if(dp<Rp){ E[k]=Math.min(E[k],Lp-1.6*(1-(dp/Rp)*(dp/Rp))-0.2); R[k]=1; W[k]=Lp; F.biome[k]=B.RIVER; continue; }    // ① 소
      if(a<Lc&&a>-Rp&&Math.abs(b)<Wc+6){ E[k]=Math.min(E[k],Lp+0.8+Math.max(0,Math.abs(b)-Wc)*0.6); continue; }            // ② 턱 앞 — 소 높이(양옆은 둑으로 서서히)
      if(dr<Rr){ E[k]=Math.min(E[k],Lr-0.3-2.5*(1-(dr/Rr)*(dr/Rr))); R[k]=1; W[k]=Lr; F.biome[k]=B.RIVER; continue; }   // ③ 저수지
      /* 둑 — 턱 쪽은 수면 바로 위(물이 넘쳐 떨어지는 데), 둘레는 0.8 m 위. 둑 밖으로는 비탈(0.45)로 내려가 자연 땅에 이어진다
         (판판한 마루를 그냥 올리면 가장자리가 곧은 흙벽이 됐다) */
      if(a>=Lc-0.5){ const top=Lr+(a<Lc+rimW+Rr*0.5&&Math.abs(b)<Wc?0.15:0.8)-Math.max(0,dr-(Rr+rimW))*0.45;
        if(top>E[k]){ E[k]=top; if(R[k]&&W[k]<Lr){ R[k]=0; W[k]=0; F.biome[k]=B.ROCK; } } }
    }
    /* 판 땅이 실제로 낮은 데(aF — 소 높이)와 둑 높이에 닿는 데(aH)를 축을 따라 잰다. 칸이 크면(6배 섬 15 m) 그 사이가 한 칸 길이의
       비탈이다 — 바위벽의 앞면은 aF 에 곧게 세우고 aH 까지 뒤를 바위로 채운다. 물은 aF 앞에서 떨어진다 */
    let aF=0, aH=Lc;
    for(let a=0;a<Lc+rimW+Rr;a+=0.5){ const y=heightAt(sx+ux*a,sz+uz*a); if(y<Lp+1.5) aF=a; if(y>Lr-0.4){ aH=a; break; } }
    aF+=0.4; if(aH<aF+1) aH=aF+1;
    FALLS.list.push({res:1, x0:sx+ux*(aF-0.6), z0:sz+uz*(aF-0.6), y0:Lr, x1:sx, z1:sz, y1:Lp, drop:H, w:clamp(Rp*1.2,6,12), dx:-ux, dz:-uz,
                     px:sx, pz:sz, py:Lp, Lc, aF, aH, Rp, rx:cxr, rz:czr, rR:Rr, ux, uz, Wc});
  }
  computeSlope();
}
/* 지형 판 7 — 턱의 바위벽(33-crags.js cragSites 끝에서). 소 뒤를 감싸는 활 꼴로 덩이를 쌓는다 — 앞면이 턱 금(Lc)에 오게
   반지름만큼 뒤로 물려 박는다. 밑은 소 바닥 밑, 위는 둑 높이까지. 벼랑 바위와 같은 칸 · 같은 재질 · 같은 몸 막힘 */
function fallsCrags(seed){
  const rnd=mulberry32((seed^0xfa11c)>>>0);
  for(const f of FALLS.list){ if(!f.res||f.pl) continue; CRAG.n++;
    const tx=-f.uz, tz=f.ux, rr=Math.max(2.4,Math.min(3.6,f.drop/7)), tone=0.80+0.2*rnd();
    /* 켜 진 판돌 — 넓적한 덩이를 벽돌처럼 엇갈려 쌓는다(줄마다 반 칸 비낀다). 앞면은 aF(땅이 낮은 끝)에 곧게 —
       그 뒤는 비탈(aF~aH)이라 앞 덩이 뒤로 땅이 그 높이보다 낮으면 한 겹 더 채운다(aH 까지 · 다섯 겹까지).
       물이 떨어지는 가운데(폭의 0.6 · 옆으로 뻗어 걸리는 덩이 포함)는 1.4 m 더 들어가 물줄기 뒤가 움푹하다 */
    let row=0;
    for(let y=f.py-2.0;y<=f.y0+0.4;y+=rr*0.95,row++){
      for(let b=-f.Wc+(row&1)*rr*0.9;b<=f.Wc+0.01;b+=rr*1.8){ const bend=(b/f.Wc)*(b/f.Wc)*5, r=rr*(0.9+0.2*rnd()), rz=r*(0.85+0.2*rnd()), rx=r*(1.5+0.3*rnd());
        const ch=Math.abs(b)-rx*1.1<f.w*0.6;
        if(ch&&y+r*0.7>f.y0+0.1) continue;                                           // 물이 넘는 자리 — 덩이 윗면이 물 밑에 오게(마루를 비운다)
        let a=f.aF+rz*0.95-bend+(rnd()-0.5)*0.4;
        if(ch) a=Math.max(a,f.aF+rz*1.25+1.4);
        const jb=b+(rnd()-0.5)*0.6;
        for(let L=0;L<5;L++){ const x=f.px+f.ux*a+tx*jb, z=f.pz+f.uz*a+tz*jb;
          coastBlob(rnd,x,y,z,rx,r*(0.55+0.15*rnd()),rz,y<f.py+1?0:1,tone*(0.9+0.2*rnd()));
          if(y<f.py+2&&L===0) cragCollide(x,z,r*0.9);
          a+=rz*1.6; if(a>f.aH+1||heightAt(f.px+f.ux*a+tx*jb,f.pz+f.uz*a+tz*jb)>y-r*0.3) break; } } }
    /* 둑 마루의 넓적한 돌 — 물이 넘는 자리(가운데 w)는 비운다 */
    for(const s of [-1,1]) for(let k=0;k<3;k++){ const b=s*(f.w*0.6+k*rr*1.4), r=rr*(0.7+0.3*rnd()), a=f.aH+r*0.5;
      coastBlob(rnd,f.px+f.ux*a+tx*b,f.y0+0.2,f.pz+f.uz*a+tz*b,r*1.2,r*0.45,r,1,tone); }
  }
  const R=FALLS.list.filter(f=>f.res&&!f.pl).map(f=>({f,x:f.px+f.ux*f.aF,z:f.pz+f.uz*f.aF,r:f.Wc+3+(f.aH-f.aF)}));
  if(R.length) PROPS=PROPS.filter(p=>{ if(p.cave) return true;                 // 소품 수십만 — 상자로 먼저 거른다
    for(const q of R){ const dx=p.x-q.x, dz=p.z-q.z; if(dx>q.r||dx<-q.r||dz>q.r||dz<-q.r) continue;
      if(dx*dx+dz*dz<q.r*q.r&&Math.hypot(p.x-q.f.rx,p.z-q.f.rz)>q.f.rR) return false; }
    return true; });   // 벽 자리의 나무·바위는 치운다
}
/* 소의 거품 — 가운데가 짙고 가장자리로 스러지는 잡음 무늬(예전 흰 원판은 판때기처럼 튀었다 — 사용자 지적) */
let _fFoamTex=null;
function fallsFoamTex(){
  if(_fFoamTex) return _fFoamTex;
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), rn=mulberry32(77);
  for(let k=0;k<420;k++){ const a=rn()*6.283, d=Math.pow(rn(),0.7)*58, x=64+Math.cos(a)*d, y=64+Math.sin(a)*d, r=2+rn()*7*(1-d/70);
    const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(255,255,255,'+(0.55*(1-d/64))+')'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2); }
  return _fFoamTex=new THREE.CanvasTexture(c);
}
/* 떨어지는 물(사용자 지적: 폭포가 골함석처럼 희고 판판하다). 실제 폭포의 물살은
     · 마루에서는 **유리처럼 맑은 물 판**이다 — 짙은 청록에 하늘이 비치고, 바닥이 비친다
     · 떨어지며 빨라져(v = √(2gh)) 공기가 섞이고 **하얗게 부서진다** — 아래로 갈수록 흰 거품 뭉치(덩이 · 가닥)가 많아진다
     · 가닥은 곧은 줄이 아니라 **덩이째 흘러내리며 늘어나는 물뭉치**다(줄무늬가 고르면 골함석이 된다)
     · 가장자리는 들쭉날쭉 찢기고 · 밑동은 물보라에 묻혀 흐려진다
   그래서 무늬를 v 에 따라 흐르는 빠르기를 늘린(가속) 좌표로 읽는다 — 세로로 늘인 잡음 세 겹을 서로 비틀고(도메인 휨) 흐른 거리 s=v²으로 민다.
   빛은 램버트(그늘 · 해 그림자 · 구름 그림자를 다 받는다) + 등 뒤 해에 비치는 몫(얇은 물 판이 빛을 통과시킨다) */
function fallsMat(veil){
  const m=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide,emissive:0x1c2226});
  if(veil) m.defines={FALLS_VEIL:1};
  m.onBeforeCompile=sh=>{ sh.uniforms.uFT=FALLS.U.uFT; if(TERR_U.uSunDir) sh.uniforms.uSunDir=TERR_U.uSunDir;
    sh.vertexShader='varying vec2 vFU;\nvarying vec3 vFW;\nvarying vec3 vFV;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFU=uv; vFW=(modelMatrix*vec4(transformed,1.0)).xyz; vFV=vFW-cameraPosition;');
    sh.fragmentShader='uniform float uFT;\n'+(TERR_U.uSunDir?'uniform vec3 uSunDir;\n':'const vec3 uSunDir=vec3(0.3,0.8,0.2);\n')+'varying vec2 vFU;\nvarying vec3 vFW;\nvarying vec3 vFV;\n'
      +'float fh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n'
      +'float fn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(fh(i),fh(i+vec2(1,0)),f.x),mix(fh(i+vec2(0,1)),fh(i+vec2(1,1)),f.x),f.y); }\n'
      +'float fb(vec2 p){ return fn(p)*0.55+fn(p*2.13+7.1)*0.30+fn(p*4.37+3.3)*0.15; }\n'
      +sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { float u=vFU.x, v=vFU.y, t=uFT;
        float s=v*v*3.2+v*0.6;                                                     // 흐른 거리(가속) — 마루에서 느리고 아래로 갈수록 빠르다
        vec2 q=vec2(u*7.0, s*1.6-t*1.9);
        vec2 wq=vec2(fb(q*vec2(0.6,0.35)+1.7), fb(q*vec2(0.6,0.35)+5.3))-0.5;       // 도메인 휨 — 물뭉치가 휘고 엉킨다
        float clump=fb(q*vec2(1.0,0.45)+wq*2.2);                                    // 큰 물뭉치
        float strand=fb(vec2(u*23.0+wq.x*4.0, s*3.4-t*3.1));                        // 가는 물가닥(규칙적인 골이 안 서게 휜 좌표로)
        float spray=fn(vec2(u*60.0+wq.y*9.0, s*10.0-t*7.0));                       // 잔 물방울
        float aer=smoothstep(0.02,0.55,v);                                         // 공기가 섞인 정도 — 마루 0 → 아래 1
        float white=clamp(smoothstep(0.42,0.70,clump)*0.75+smoothstep(0.55,0.85,strand)*0.45+smoothstep(0.7,0.95,spray)*0.25,0.0,1.0);
        white=mix(white*0.35,max(white,0.55+0.45*clump),aer*0.85);
        vec3 clear=vec3(0.10,0.22,0.24)+vec3(0.14,0.18,0.18)*smoothstep(0.3,0.8,strand);   // 맑은 물 판 — 짙은 청록에 결이 비친다
        vec3 foam=vec3(0.93,0.96,0.97)*(0.86+0.14*spray);
        diffuseColor.rgb=mix(clear,foam,white);
        /* 가장자리 — 찢긴 물살: 잡음으로 폭이 들쭉날쭉 · 아래로 갈수록 넓고 성기다 */
        float rag=0.10+0.10*aer+0.10*(fn(vec2(s*4.0-t*2.0,u*3.0))-0.5);
        float edge=smoothstep(0.0,rag,u)*smoothstep(1.0,1.0-rag,u);
        float body=mix(0.62,0.95,white)*(0.75+0.25*smoothstep(0.2,0.6,clump));
        diffuseColor.a=edge*body*smoothstep(0.0,0.05,v)*mix(1.0,0.55+0.45*smoothstep(0.25,0.6,clump),smoothstep(0.85,1.0,v));
        #ifdef FALLS_VEIL
        /* 물보라 장막 — 물살 앞에 떠 흩어지는 물안개 판(떨어질수록 짙다 · 성긴 덩이 · 희다) */
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.94,0.96,0.97),0.75);
        diffuseColor.a*=0.32*smoothstep(0.15,0.6,v)*(0.4+0.6*smoothstep(0.35,0.7,fb(vec2(u*4.0,s*0.9-t*0.8))));
        #endif
      }`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      { /* 등 뒤 해 — 얇은 물 판을 해가 뒤에서 비추면 밝게 빛난다(맑은 물 쪽이 더) */
        vec3 vd=normalize(vFV); float bk=pow(max(dot(vd,normalize(uSunDir)),0.0),4.0)*smoothstep(0.0,0.2,uSunDir.y);
        totalEmissiveRadiance+=vec3(0.55,0.62,0.55)*bk*0.5; }`); };
  m.customProgramCacheKey=()=>'falls3'+(veil?'v':''); return m;
}
/* 소의 거품 — 내리꽂힌 물이 바닥에서 되솟아 사방으로 퍼지는 흰 물(가운데가 끓듯 가장 희고 · 바깥으로 흐르며 가닥이 찢기고 · 가장자리에서 맑은 물로 스러진다).
   예전엔 흰 원판 하나였다(사용자 지적: 소가 판판한 흰 원이다) */
function fallsPoolMat(){
  if(FALLS.poolMat) return FALLS.poolMat;
  const m=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,depthWrite:false});
  m.onBeforeCompile=sh=>{ sh.uniforms.uFT=FALLS.U.uFT;
    sh.vertexShader='varying vec2 vPU;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPU=uv;');
    sh.fragmentShader='uniform float uFT;\nvarying vec2 vPU;\n'
      +'float ph(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n'
      +'float pn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(ph(i),ph(i+vec2(1,0)),f.x),mix(ph(i+vec2(0,1)),ph(i+vec2(1,1)),f.x),f.y); }\n'
      +'float pb(vec2 p){ return pn(p)*0.55+pn(p*2.1+5.0)*0.3+pn(p*4.3+1.0)*0.15; }\n'
      +sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { vec2 c=vPU*2.0-1.0; float r=length(c), a=atan(c.y,c.x), t=uFT;
        float boil=pb(vec2(c.x*3.0+t*0.7,c.y*3.0-t*0.9));                                   // 가운데 끓는 물
        float out_=pb(vec2(a*2.4+pb(vec2(a*1.3,r*2.0))*1.5, r*5.0-t*1.6));                     // 바깥으로 흐르는 가닥
        float lace=smoothstep(0.42,0.66,out_)*smoothstep(1.0,0.45,r);
        float core=smoothstep(0.55,0.0,r)*(0.6+0.4*boil);
        float w=clamp(max(core,lace*(0.85-0.5*r)),0.0,1.0);
        diffuseColor.rgb=mix(vec3(0.20,0.34,0.36),vec3(0.94,0.97,0.98),w);
        diffuseColor.a=smoothstep(1.0,0.82,r)*(0.25+0.75*w); }`); };
  m.customProgramCacheKey=()=>'fallspool'; return FALLS.poolMat=m;
}
/* 물살 판 — 가로로 여러 줄(C)에 바깥쪽으로 볼록하게(물살은 가운데가 두껍다) · 줄마다 [x,y,z,폭 배율] · (ox,oz) 볼록한 쪽 */
function fallsSheet(rows,w,ox,oz,tx,tz,mat,bow,push){
  const C=6, P=[], UV=[], I=[];
  rows.forEach((r,k)=>{ for(let c=0;c<=C;c++){ const sv=c/C*2-1, b=(1-sv*sv)*bow*w+push;
    P.push(r[0]+tx*sv*w*0.5*r[3]+ox*b, r[1], r[2]+tz*sv*w*0.5*r[3]+oz*b); UV.push(c/C,k/(rows.length-1)); } });
  for(let k=0;k<rows.length-1;k++) for(let c=0;c<C;c++){ const a=k*(C+1)+c, b2=a+C+1; I.push(a,a+1,b2+1,a,b2+1,b2); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
  g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
  const m=new THREE.Mesh(g,mat); m.renderOrder=4; scene.add(m); FALLS.meshes.push(m); return m;
}
function fallsBuild(){
  for(const m of FALLS.meshes){ scene.remove(m); if(m.geometry) m.geometry.dispose(); } FALLS.meshes.length=0;
  if(!FALLS.list.length) return;
  const mat=fallsMat(), veil=fallsMat(true), foam=fallsPoolMat();   // 물살 · 물보라 장막 · 소의 거품(셰이더)
  FALLS.veil=veil;
  for(const f of FALLS.list){
    if(f.pl){ fallsBuildPl(f,mat,foam); continue; }
    if(f.res){ fallsBuildRes(f,mat,foam); continue; }
    /* 물살 판 — 윗 칸 뒤 반 칸에서 아랫 칸 앞 반 칸까지, 하천 바닥(+0.2 m)을 따라 14 마디 */
    /* 물살 — 마루를 넘으며 앞으로 내뻗었다가(처음 빠르기 √(2g·0.3)) 떨어지며 아래로 휜다(포물선) · 하천 바닥(+0.25 m) 밑으론 안 간다 */
    const S=14, nx=-f.dz, nz=f.dx, L=Math.hypot(f.x1-f.x0,f.z1-f.z0), rows=[];
    for(let k=0;k<=S;k++){ const t=k/S, a=-0.5+t*2.0, x=f.x0+f.dx*L*a, z=f.z0+f.dz*L*a;
      const y=Math.max(heightAt(x,z)+0.25,Math.min(f.y0,f.y0+(f.y1-f.y0)*clamp(a,0,1)));
      rows.push([x,y,z,1+0.25*t]); }
    fallsSheet(rows,f.w,f.dx,f.dz,nx,nz,mat,0.08,0);
    fallsSheet(rows.slice(Math.floor(S*0.35)),f.w*1.25,f.dx,f.dz,nx,nz,veil,0.12,0.35);
    /* 소 — 되솟는 흰 물(셰이더) */
    f.px=f.x0+f.dx*L*1.4; f.pz=f.z0+f.dz*L*1.4; f.py=Math.max(f.y1,heightAt(f.px,f.pz)+0.3);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(f.w*1.35,32).rotateX(-Math.PI/2),foam); pool.position.set(f.px,f.py+0.05,f.pz); pool.renderOrder=4; scene.add(pool); FALLS.meshes.push(pool);
  }
  /* 연어 — 몸 75 cm · 등은 짙은 청회 · 배는 은빛 · 산란기의 붉은 옆구리 */
  const sal={id:'salmon',len:0.75,tall:0.27,thick:0.18,c:[0x4a5a6a,0xd8d4cc,0xa8463a],pat:'spots'};
  const fishM=new THREE.InstancedMesh(fishGeo(sal),fishMat(),FALLS.list.length*8);
  fishM.count=0; fishM.frustumCulled=false; scene.add(fishM); FALLS.meshes.push(fishM);
  FALLS.fish={m:fishM, list:[]};
  for(const f of FALLS.list) for(let k=0;k<8;k++) FALLS.fish.list.push({f, a:Math.random()*6.283, r:1.2+Math.random()*f.w*0.4, sp:0.4+Math.random()*0.5, jump:-1, jt:0});
  /* 물보라 */
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'), gr=x.createRadialGradient(32,32,2,32,32,31);
  gr.addColorStop(0,'rgba(255,255,255,0.9)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.fillRect(0,0,64,64);
  const MN=420, mg=new THREE.BufferGeometry(); mg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(MN*3).fill(-9999),3));
  const mist=new THREE.Points(mg,new THREE.PointsMaterial({map:new THREE.CanvasTexture(c),size:4.8,transparent:true,opacity:0.26,depthWrite:false})); mist.frustumCulled=false; scene.add(mist); FALLS.meshes.push(mist);
  FALLS.mist={p:mist, n:MN, v:new Float32Array(MN*3), life:new Float32Array(MN)};
}
/* 저수지 폭포의 물 — 저수지 가장자리에서 둑을 넘어(가로 세 마디) 턱 앞으로 곧게 떨어진다(세로 열넷 · 떨어지며 앞으로 휜다 · 아래로 갈수록 넓어진다) */
function fallsBuildRes(f,mat,foam){
  const P=[], UV=[], I=[], tx=-f.uz, tz=f.ux, fx=f.px+f.ux*f.aF, fz=f.pz+f.uz*f.aF, H=f.y0-f.py+0.3, rows=[], top=f.aH-f.aF+2.5;
  for(let k=0;k<=4;k++){ const a=top-(top+0.3)*k/4; rows.push([fx+f.ux*a,f.y0+0.24+0.03*k,fz+f.uz*a,1]); }   // 저수지 끝에서 바위 마루를 넘어 오는 물(마루보다 조금 위)
  for(let k=1;k<=14;k++){ const t=k/14, off=0.8+2.4*Math.pow(t,1.6);
    rows.push([fx-f.ux*off,f.y0+0.2-H*t,fz-f.uz*off,1+0.35*t]); }
  fallsSheet(rows,f.w,-f.ux,-f.uz,tx,tz,mat,0.08,0);                                   // 물살 — 가운데가 두껍게 바깥으로 볼록
  fallsSheet(rows.slice(7),f.w*1.3,-f.ux,-f.uz,tx,tz,FALLS.veil||mat,0.14,0.45);        // 물보라 장막 — 떨어지는 아래쪽 앞에
  /* 소 — 물이 내리꽂히는 자리(턱 앞)가 가장 하얗다 */
  const lx=fx-f.ux*3.0, lz=fz-f.uz*3.0;
  const pool=new THREE.Mesh(new THREE.CircleGeometry(f.w*1.6,32).rotateX(-Math.PI/2),foam); pool.position.set(lx,f.py+0.06,lz); pool.renderOrder=4; scene.add(pool); FALLS.meshes.push(pool);
  f.lx=lx; f.lz=lz;
}
/* 대지 폭포의 물(지형 판 11 — 14-plateau.js plFalls) — 강이 벼랑 끝(입술)을 넘으며 앞으로 내뻗었다가 포물선으로 떨어진다.
   빠르기는 물줄기가 벼랑 면에 안 닿을 만큼(밑에서 벼랑 발치보다 앞) · 위 다섯 줄은 입술 뒤 강물에서 이어진다 */
function fallsBuildPl(f,mat,foam){
  const tx=-f.uz, tz=f.ux, lx=f.px+f.ux*f.aH, lz=f.pz+f.uz*f.aH, H=Math.max(2,f.y0-f.py), g=9.8, T=Math.sqrt(2*H/g);
  const v0=Math.max(2.5,(f.aH-f.aF)/T*1.15), rows=[];
  for(let k=0;k<=4;k++){ const a=6-6*k/4; rows.push([lx+f.ux*a,f.y0+0.12,lz+f.uz*a,1]); }
  for(let k=1;k<=18;k++){ const t=T*k/18, s=v0*t; rows.push([lx-f.ux*s,f.y0+0.1-0.5*g*t*t,lz-f.uz*s,1+0.4*k/18]); }
  fallsSheet(rows,f.w,-f.ux,-f.uz,tx,tz,mat,0.08,0);
  fallsSheet(rows.slice(10),f.w*1.3,-f.ux,-f.uz,tx,tz,FALLS.veil||mat,0.14,0.45);
  const dl=f.aH-v0*T, cx=f.px+f.ux*dl, cz=f.pz+f.uz*dl;
  const pool=new THREE.Mesh(new THREE.CircleGeometry(f.w*1.6,32).rotateX(-Math.PI/2),foam); pool.position.set(cx,f.py+0.06,cz); pool.renderOrder=4; scene.add(pool); FALLS.meshes.push(pool);
  f.lx=cx; f.lz=cz;
}
const _flsM=new THREE.Matrix4(), _flsQ=new THREE.Quaternion(), _flsE=new THREE.Euler(), _flsV=new THREE.Vector3(), _flsS=new THREE.Vector3(1,1,1);
function updateFalls(dt){
  if(!FALLS.fish) return;
  FALLS.t+=dt; FALLS.U.uFT.value=FALLS.t;
  const px=PL.pos.x, pz=PL.pos.z, near=FALLS.list.filter(f=>Math.hypot(f.px-px,f.pz-pz)<220);
  FALLS.fish.m.visible=FALLS.mist.p.visible=near.length>0; if(!near.length) return;
  /* 연어 — 소를 맴돌다가 가끔 한 마리가 폭포 위로 뛴다(1.3초 포물선) */
  let n=0; const M=FALLS.fish.m;
  for(const s of FALLS.fish.list){ const f=s.f; if(near.indexOf(f)<0) continue;
    let x,y,z,yaw,pitch=0;
    if(s.jump>=0&&f.res){ s.jump+=dt/1.1; const t=Math.min(1,s.jump), sx=f.px+Math.cos(s.a)*s.r, sz=f.pz+Math.sin(s.a)*s.r, ex=f.lx, ez=f.lz;   // 높은 폭포는 못 오른다 — 물살로 뛰었다 도로 떨어진다
      x=sx+(ex-sx)*t; z=sz+(ez-sz)*t; y=f.py+Math.sin(Math.PI*t)*2.6;
      yaw=Math.atan2(-(ex-sx),-(ez-sz))-Math.PI/2; pitch=Math.cos(Math.PI*t)*1.1;
      if(s.jump>=1){ s.jump=-1; } }
    else if(s.jump>=0){ s.jump+=dt/1.3; const t=Math.min(1,s.jump), sx=f.px, sz=f.pz, ex=f.x0, ez=f.z0;
      x=sx+(ex-sx)*t; z=sz+(ez-sz)*t; y=f.py+(f.y0-f.py)*t+Math.sin(Math.PI*t)*(1.5+f.drop*0.25);
      yaw=Math.atan2(-(ex-sx),-(ez-sz))-Math.PI/2; pitch=Math.cos(Math.PI*t)*0.9;
      if(s.jump>=1){ s.jump=-1; s.a=Math.random()*6.283; } }
    else{ s.a+=s.sp*dt/s.r; x=f.px+Math.cos(s.a)*s.r; z=f.pz+Math.sin(s.a)*s.r; y=f.py-0.35+Math.sin(FALLS.t*2+s.a)*0.05;
      yaw=-s.a-Math.PI; if(Math.random()<dt*0.04) s.jump=0; }
    _flsE.set(0,yaw,pitch,'YXZ'); _flsQ.setFromEuler(_flsE); _flsV.set(x,y,z); _flsM.compose(_flsV,_flsQ,_flsS); M.setMatrixAt(n++,_flsM); }
  M.count=n; M.instanceMatrix.needsUpdate=true;
  /* 물보라 — 소 위로 피어오른다 */
  { const S=FALLS.mist, a=S.p.geometry.attributes.position.array;
    for(let i=0;i<S.n;i++){ S.life[i]-=dt;
      if(S.life[i]<=0){ const f=near[i%near.length], cx=f.res?f.lx:f.px, cz=f.res?f.lz:f.pz; a[i*3]=cx+(Math.random()-0.5)*f.w*1.2; a[i*3+1]=f.py+0.2; a[i*3+2]=cz+(Math.random()-0.5)*f.w*1.2;
        S.v[i*3]=(Math.random()-0.5)*1.8; S.v[i*3+1]=0.9+Math.random()*1.8; S.v[i*3+2]=(Math.random()-0.5)*1.8; S.life[i]=1.6+Math.random()*2.4; continue; }
      a[i*3]+=S.v[i*3]*dt; a[i*3+1]+=S.v[i*3+1]*dt; a[i*3+2]+=S.v[i*3+2]*dt; }
    S.p.geometry.attributes.position.needsUpdate=true; }
}
/* 저수지 폭포의 자리(저수지 · 소 · 바위벽) 안인가 — 노거수가 그 위에 서지 않게(95-giants.js) */
function fallsAt(x,z,pad){ pad=pad||0;
  for(const f of FALLS.list){ if(!f.res) continue;
    if(Math.hypot(x-f.rx,z-f.rz)<f.rR+6+pad||Math.hypot(x-f.px,z-f.pz)<f.Rp+f.aH+pad) return true; }
  return false; }
/* 찌 자리가 폭포 둘레(70 m)의 하천인가 — 낚시가 본다 */
const fallsNear=(x,z)=>FALLS.list.some(f=>Math.hypot(f.px-x,f.pz-z)<70);
