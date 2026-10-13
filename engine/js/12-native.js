/* 12-native.js — CASTAWAY
   C 로 짠 침식 토막(WebAssembly)을 잇는다 — 열적 침식 · 물방울 침식 · 표면 다듬기
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   네이티브(C → WebAssembly) 침식
   ----------------------------------------------------------------------------
   섬을 만들 때 안쪽 고리가 가장 많이 도는 세 토막(`thermal` · `hydraulic` · `smoothTerrain`)을 C 로 옮겼다
   (원본 `engine/native/erosion.c` · 짓는 법 `engine/native/build.sh` · 컴파일러 `env/setup-zig.sh`).
   · 짠 결과(.wasm)는 `data-native-wasm.js` 에 base64 로 들어 있다 — `file://` 에서는 .wasm 을 따로 못 읽는다.
   · **자바스크립트 판과 한 비트도 다르지 않아야 한다.** 저장은 시드와 바뀐 것만 담으므로, 땅이 끝자리 하나만 달라져도
     하천이 옮겨 가 예전 저장이 다른 섬을 연다. `nativeVerify()` 가 여러 시드로 두 판을 돌려 견준다 — C 나 JS 한쪽을
     고쳤으면 반드시 돌려 볼 것:  node tools/probe.mjs island_world.html "nativeVerify()"
   · WebAssembly 가 없거나 못 켜면 조용히 자바스크립트 판으로 돈다(`NATIVE.ok` 가 false). `NATIVE.on=false` 로 끌 수도 있다.
   ========================================================================== */
const NATIVE={ok:false, on:true, x:null, ready:null};
NATIVE.ready=(async()=>{
  try{
    if(typeof WebAssembly==='undefined'||typeof NATIVE_WASM_B64==='undefined') return;
    const bin=atob(NATIVE_WASM_B64), b=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i);
    const r=await WebAssembly.instantiate(b,{});
    NATIVE.x=r.instance.exports; NATIVE.ok=true;
  }catch(e){ console.warn('[native] WebAssembly 를 못 켰다 — 자바스크립트 판으로 돈다',e); }
})();
/* 표고 표(F.elev)를 C 쪽 메모리로 넘기고, 토막을 돌린 뒤 되받는다(2.4 MB 두 번 베끼기 — 1 ms 안쪽) */
function nativeRun(fn){
  const X=NATIVE.x, ptr=X.cw_elev();
  new Float32Array(X.memory.buffer,ptr,N*N).set(F.elev);
  fn(X);
  F.elev.set(new Float32Array(X.memory.buffer,ptr,N*N));
}
const nativeOn=()=>NATIVE.ok&&NATIVE.on&&N<=768;

/* 두 판이 같은 섬을 내는지 견준다 — 시드마다 융기(genBase)까지 한 표고에서 침식 네 단계를 JS 로 한 번, C 로 한 번 돌려
   표고 표의 해시와 걸린 시간을 낸다. 끝나면 표고를 원래대로 돌려놓는다(놀던 섬은 그대로다) */
function nativeVerify(seeds){
  if(!NATIVE.ok) return 'WebAssembly 가 안 켜졌다';
  const keep=F.elev.slice(), was=NATIVE.on, out=[];
  const hash=a=>{ const u=new Uint32Array(a.buffer,a.byteOffset,a.length); let h=2166136261; for(let i=0;i<u.length;i++){ h^=u[i]; h=Math.imul(h,16777619); } return (h>>>0).toString(16); };
  const run=seed=>{ thermal(22,1.15*(CELL/4),0.5); hydraulic(seed,Math.round(38000*P.ero*(16/(CELL*CELL)))); thermal(8,1.45*(CELL/4),0.45); smoothTerrain(3,0.6); };
  for(const s of (seeds||['castaway','ashen-4471','7'])){
    const seed=hashStr(s); genBase(seed); const base=F.elev.slice();
    NATIVE.on=false; let t=performance.now(); run(seed); const msJS=performance.now()-t, hJS=hash(F.elev);
    F.elev.set(base);
    NATIVE.on=true;  t=performance.now(); run(seed); const msC=performance.now()-t, hC=hash(F.elev);
    out.push(s+': '+(hJS===hC?'same':'DIFFERENT')+' ('+hJS+' / '+hC+') · JS '+Math.round(msJS)+' ms · C '+Math.round(msC)+' ms');
  }
  F.elev.set(keep); NATIVE.on=was;
  return out.join('\n');
}
