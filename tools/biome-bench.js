/* tools/biome-bench.js — CASTAWAY
   **바이옴 · 상태마다 FPS** — 게임의 참 루프(짐승 · 식생 · 몹 · 사람이 다 돈다 — 설정 '벤치마크'는 놀이를 멈추고 그리기만 잰다)를 돌리며
   자리를 옮겨 다니고(활엽수림 · 침엽수림 · 대숲 · 초원 · 덤불 · 바닷가 · 산꼭대기 · 헤엄 · 물속 · 땅속 · 밤 · 비), 마지막엔 숲에서 고개를 휙휙 돌린다(빠른 마우스).
   한 자리마다 4초 자리 잡기(칸 · LOD 가 들어선다) 뒤 6초 동안 천천히 돌며 잰다.

     desktop/node_modules/.bin/electron tools/biome-bench.js [자리=전부 — 쉼표로 고른다 'forest,sweep'] [초=6]
     CASTAWAY_UNCAP=1 — 화면 주사율에 안 묶고 낼 수 있는 만큼(여유를 볼 때)  · CASTAWAY_QUAL=0 — 자동 품질을 끄고(같은 일감으로 견줄 때)
     CASTAWAY_GAME=폴더 — 다른 자리에 떠 둔 판을 잰다

   결과: 자리마다 한 줄 BB {name, fps, p50, p99, max(ms), hitch(20 ms 넘은 프레임 수), cpu(구간별 ms), gpu, calls, tri, sh(그림자 호출/삼각형), q(QUAL.k)} */
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os');
app.setPath('userData', path.join(os.tmpdir(), 'castaway-biome'));
app.commandLine.appendSwitch('ignore-gpu-blocklist'); app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('disable-renderer-backgrounding'); app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('force_high_performance_gpu');
if (process.env.CASTAWAY_UNCAP === '1') { app.commandLine.appendSwitch('disable-frame-rate-limit'); app.commandLine.appendSwitch('disable-gpu-vsync'); }
const ONLY = (process.argv[2] || '').split(',').filter(Boolean), DUR = +process.argv[3] || 6;
const W = 1440, H = 838;

app.whenReady().then(async () => { if (app.dock) app.dock.hide();
  const win = new BrowserWindow({ width: W, height: H, useContentSize: true, show: false, backgroundColor: '#03060a', webPreferences: { backgroundThrottling: false } });
  win.setOpacity(0); win.setIgnoreMouseEvents(true); win.showInactive();   // 보이지 않게 · 포커스를 안 뺏게(사용자 요청 — 시험 창이 크롬을 가렸다)
  const fail = setTimeout(() => { console.log('BB {"error":"timeout"}'); app.exit(1); }, 900 * 1000);
  const run = js => win.webContents.executeJavaScript(js, true);
  try {
    await win.loadFile(path.join(process.env.CASTAWAY_GAME || path.join(__dirname, '..'), 'island_world.html'), { search: process.env.CASTAWAY_QUERY || '' });
    await run(`(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); let t=0; while((typeof busy==='undefined'||busy)&&t++<1800) await W(100);
      try{ askClose(false); }catch(e){}
      { let pc=-1, st=0; for(let k=0;k<240;k++){ await W(250); const n=renderer.info.programs.length; if(n===pc&&!PRECOMP.jobs&&PRECOMP.t>0){ if(++st>=12) break; } else { st=0; pc=n; } } }
      titleLand(); await W(2500); pause=()=>{}; paused=false;
      ${process.env.CASTAWAY_QUAL === '0' ? 'QUAL.on=false;' : ''}
      if(!PERF.on) PERF.toggle();
      /* 구간 시간 · 그리기 수를 따로 모은다(성능 창은 0.25초마다 비운다) */
      const A=window.__A={sec:new Float64Array(7), dcM:[0,0], dcS:[0,0], nf:0};
      const lap0=PERF.lap.bind(PERF); PERF.lap=function(i,t){ const n=lap0(i,t); A.sec[i]+=n-t; return n; };
      const rs0=PERF.reset.bind(PERF); PERF.reset=function(now){ A.dcM[0]+=this.dc.main[0]; A.dcM[1]+=this.dc.main[1]; A.dcS[0]+=this.dc.shadow[0]; A.dcS[1]+=this.dc.shadow[1]; A.nf+=this.nf; return rs0(now); };
      /* 자리 찾기 — 그 바이옴 칸이 둘레에 가장 많은 곳(물에서 먼) */
      window.__spot=(b,minW)=>{ let best=null, bs=-1; const st=8;
        for(let z=40;z<N-40;z+=st) for(let x=40;x<N-40;x+=st){ const i=z*N+x; if(F.biome[i]!==b||F.dWater[i]<(minW||40)) continue;
          let s=0; for(let dz=-24;dz<=24;dz+=6) for(let dx=-24;dx<=24;dx+=6) if(F.biome[(z+dz)*N+x+dx]===b) s++;
          s+=F.moist[i]*0.5; if(s>bs){ bs=s; best=[x,z]; } }
        return best&&[(best[0]-N/2)*CELL,(best[1]-N/2)*CELL]; };
      window.__go=(x,z,dy)=>{ const g0=Math.max(heightAt(x,z),0), g=typeof geoGround==='function'?geoGround(x,z,g0):g0;
        if(typeof UNDER!=='undefined'){ PL.under=false; UNDER.u=0; } PL.pos.set(x,g+(dy??0.3),z); PL.vel.set(0,0,0); PL.camY=undefined; };
      window.__hour=h=>{ gameHours=Math.floor(gameHours/24)*24+24+h; hourOfDay=h; weaLast=0; };
      window.__rainHour=()=>{ const g0=gameHours; for(let d=0;d<400;d++){ gameHours=Math.floor(g0/24)*24+d*2.6+13; hourOfDay=gameHours%24; updateWeather(); if(WEA.rain>0.75&&hourOfDay>9&&hourOfDay<17) return gameHours; } gameHours=g0; return null; };
      window.__yawR=0.5; window.__pitchF=0;
      /* 튀는 프레임 — 함수마다 그 프레임에 든 시간을 적고, 22 ms 넘은 프레임의 범인을 센다 */
      { const S=window.__S={cur:{}, spikes:{}, n:0, prog:0}; const FN=['updateTileVis','updateTerrainLOD','updateFlora','updateWildlife','updateMobs','updateSky','updateClouds','updatePlayer','updateHUD','drawMap','drawCompass','renderFrame','updateCaves','updateCrags','updateGeoMeshes','updateTlit','updateRubble','updateSea','updateReef','updateFoam','updateFalls','updateSavanna','updatePlateau','updateUnder','updateRain','updateOcean','updateDew','updateGiants','floraFar','updateShip','updateFires','qualTick','updateCamcorder','updateWeapon','surfTick','updateHarvest','updateGather','updateBuild','updateLevel','updateRegrow','updateDecay','updatePower','updateGeo','updatePush','updateStoreTags','updateTorch','updateLamp','updateFurnaces','updateCraft','updateGiantFalls','rerollCloud','litQueue','layPuff','updateCloudShadow','cloudLight','updateWeather','floraFar','updateTlit','updateShadowCam'];
        for(const f of FN){ const o=window[f]; if(typeof o!=='function') continue; window[f]=function(){ const t=performance.now(); try{ return o.apply(this,arguments); } finally{ S.cur[f]=(S.cur[f]||0)+performance.now()-t; } }; }
        const lu=LIGHT.update.bind(LIGHT); LIGHT.update=function(dt){ const t=performance.now(); try{ return lu(dt); } finally{ S.cur['LIGHT.update']=(S.cur['LIGHT.update']||0)+performance.now()-t; } };
        if(typeof muGet==='function'){ const mg=muGet; window.muGet=function(k,mk){ return mg(k,()=>{ const t=performance.now(); try{ return mk(); } finally{ S.cur['music:synth']=(S.cur['music:synth']||0)+performance.now()-t; } }); }; }
        let last=performance.now();
        (function sf(){ requestAnimationFrame(sf); const n=performance.now(), d=n-last; last=n; const pr=renderer.info.programs.length;
          if(S.on&&d>24){ S.n++; const c=Object.entries(S.cur).sort((a,b)=>b[1]-a[1]).slice(0,2).filter(x=>x[1]>2); if(pr>S.prog){ const P=renderer.info.programs; c.unshift(['shaderCompile:'+P.slice(S.prog).map(q=>(q.name||'')+'|'+String(q.cacheKey||'').slice(0,50)).join(';'),0]); }
            const k=c.length?c.map(x=>x[0]).join('+'):'gpu/other'; S.spikes[k]=(S.spikes[k]||0)+1; if(d>(S.max||0)){ S.max=d; S.maxWhy=c.map(x=>x[0]+':'+x[1].toFixed(1)).join(' '); } }
          S.prog=pr; S.cur={}; })(); }
      (function spin(){ requestAnimationFrame(spin); const n=performance.now(), d=Math.min(0.05,(n-(spin.t||n))/1000); spin.t=n;
        PL.yaw+=window.__yawR*d; if(window.__pitchF) PL.pitch=-0.1+0.35*Math.sin(n/1000*window.__pitchF);
        PL.hp=PL.hpMax||100; if('food' in PL) PL.food=100; if('water' in PL) PL.water=100; if('stam' in PL) PL.stam=100; })();
    })()`);
    const scen = [
      ['landing',   ``],
      ['broadleaf', `const s=__spot(B.BROADLEAF); __go(s[0],s[1]); __hour(11);`],
      ['conifer',   `const s=__spot(B.CONIFER); __go(s[0],s[1]); __hour(11);`],
      ['bamboo',    `const s=__spot(B.BAMBOO); if(s) __go(s[0],s[1]); __hour(11);`],
      ['meadow',    `const s=__spot(B.MEADOW); __go(s[0],s[1]); __hour(11);`],
      ['scrub',     `const s=__spot(B.SCRUB); __go(s[0],s[1]); __hour(11);`],
      ['marsh',     `const s=__spot(B.MARSH,10); if(s) __go(s[0],s[1]); __hour(11);`],
      ['coast',     `const s=__spot(B.BEACH,0); __go(s[0],s[1]); __hour(11);`],
      ['peak',      `let bi=0; for(let i=0;i<N*N;i++) if(F.elev[i]>F.elev[bi]) bi=i; __go((bi%N-N/2)*CELL,(Math.floor(bi/N)-N/2)*CELL); __hour(11);`],
      ['rock',      `const s=__spot(B.ROCK,10); if(s) __go(s[0],s[1]); __hour(11);`],
      ['swim',      `const s=__spot(B.BEACH,0); let x=s[0], z=s[1]; for(let k=0;k<400&&heightAt(x,z)>-2.5;k++){ x+=(x>0?1:-1)*3; } PL.pos.set(x,0.2,z); PL.vel.set(0,0,0); __hour(11);`],
      ['underwater',`const s=__spot(B.BEACH,0); let x=s[0], z=s[1]; for(let k=0;k<400&&heightAt(x,z)>-6;k++){ x+=(x>0?1:-1)*3; } PL.pos.set(x,-3,z); PL.vel.set(0,0,0); __hour(11);`],
      ['under',     `const c=UNDER.ch.find(c=>!c.adit)||UNDER.ch[0]; if(c){ const q=underQ(c.x,c.z,true); PL.pos.set(c.x,q.f+0.3,c.z); PL.under=true; PL.vel.set(0,0,0); } __hour(11); window.__note={rooms:UNDER.ch.length};`],
      ['night',     `const s=__spot(B.BROADLEAF); __go(s[0],s[1]); __hour(23);`],
      ['rain',      `const s=__spot(B.BROADLEAF); __go(s[0],s[1]); const h=__rainHour(); window.__note=h;`],
      ['sweep',     `const s=__spot(B.BROADLEAF); __go(s[0],s[1]); __hour(11); window.__yawR=9; window.__pitchF=3.1;`],
      ['fall',      `const L=FALLS.list.filter(f=>f.pl), f=L[(+window.__fi||0)%L.length]; const lipx=f.px+f.ux*f.aH, lipz=f.pz+f.uz*f.aH, dx=f.lx-lipx, dz=f.lz-lipz, l=Math.hypot(dx,dz)||1, D=+window.__fd||45;
                     const x=f.lx+dx/l*D, z=f.lz+dz/l*D; __go(x,z); PL.yaw=Math.atan2(dx,dz); PL.pitch=+(window.__fp||0.05); if(window.__fly){ DEV.on=true; PL.pos.y+=+window.__fly; } __yawR=0; __hour(11); window.__note={n:L.length, drop:+(f.y0-f.py).toFixed(1), w:f.w, at:[Math.round(lipx),Math.round(lipz)]};`],
      ['sweepMeadow',`const s=__spot(B.MEADOW); __go(s[0],s[1]); __hour(11); window.__yawR=9; window.__pitchF=3.1;`],
    ];
    /* '자리~시험' — 자리를 잡은 뒤 한 가지를 끄고 잰다(끝나면 되돌린다): 무엇이 프레임을 먹는지 */
    const TRY = {
      finish:   [`window.__rf=renderFrame; const gl=renderer.getContext(), R=window.__RF={sub:[],gpu:[],sh:0,shF:0};
                 const sm=renderer.shadowMap, s0=sm.render; window.__smr=s0; sm.render=function(L,sc,cam){ let k=0; for(const l of L) if(l.castShadow&&l.shadow&&(l.shadow.needsUpdate||l.shadow.autoUpdate)) k++; R.sh+=k; R._k=(R._k||0)+k; return s0.call(this,L,sc,cam); };
                 renderFrame=function(){ R._k=0; const t0=performance.now(); window.__rf(); const t1=performance.now(); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,window.__px||(window.__px=new Uint8Array(4))); const t2=performance.now(); R.sub.push(t1-t0); R.gpu.push(t2-t1); if(R._k) R.shF++; };`,
                 `renderFrame=window.__rf; renderer.shadowMap.render=window.__smr;`],
      norender: ['window.__rf=renderFrame; renderFrame=()=>{};', 'renderFrame=window.__rf;'],
      dirty:    [`window.__DC={}; for(const fn of ['dirty','dirtyAt']){ const o=LIGHT[fn]; LIGHT['__'+fn]=o; LIGHT[fn]=function(){ const st=(new Error().stack||'').split(String.fromCharCode(10)).slice(2,5).map(x=>{ const m=x.match(/at (\\S+).*?([0-9a-z-]+\\.js:[0-9]+)/); return m?m[1]+'@'+m[2]:x.trim().slice(0,40); }).join(' < '); const k=fn+' '+st; __DC[k]=(__DC[k]||0)+1; return o.apply(this,arguments); }; }`,
                 `for(const fn of ['dirty','dirtyAt']) LIGHT[fn]=LIGHT['__'+fn]; window.__note=Object.entries(__DC).sort((a,b)=>b[1]-a[1]).slice(0,10);`],
      noupdate: ['window.__ps=paused; paused=true; TITLE.on=false; window.__lt=lastDraw;', 'paused=window.__ps;'],
      nohud:    ['document.querySelectorAll("body > *:not(canvas)").forEach(e=>{ if(e.style){ e.__d=e.style.visibility; e.style.visibility="hidden"; } });', 'document.querySelectorAll("body > *:not(canvas)").forEach(e=>{ if(e.style) e.style.visibility=e.__d||""; });'],
      noperf:   ['if(PERF.on) PERF.toggle();', 'if(!PERF.on) PERF.toggle();'],
      nocamc:   ['window.__cl=CAMC.on; CAMC.on=false;', 'CAMC.on=window.__cl;'],
      noprops:  ['propGroup.visible=false;', 'propGroup.visible=true;'],
      nosky:    ['skyScene.visible=false;', 'skyScene.visible=true;'],
      noscene:  ['window.__sv=scene.children.map(o=>o.visible); scene.children.forEach(o=>o.visible=false);', 'scene.children.forEach((o,i)=>o.visible=window.__sv[i]);'],
    };
    const list = ONLY.length ? ONLY.map(n => { const [a, b] = n.split('~'); const s = scen.find(x => x[0] === a); const t = b ? b.split('+').map(k => TRY[k]) : null; return s && [n, s[1], t && [t.map(x => x[0]).join('\n'), t.map(x => x[1]).reverse().join('\n')]]; }).filter(Boolean) : scen;
    for (const [name, js, tr] of list) {
      const r = await run(`(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); window.__fi=${JSON.stringify(process.env.CASTAWAY_FI||'0')}; window.__fd=${JSON.stringify(process.env.CASTAWAY_FD||'45')};window.__fly=${JSON.stringify(process.env.CASTAWAY_FLY||'')}; window.__fp=${JSON.stringify(process.env.CASTAWAY_FP||'0.05')}; window.__yawR=0.5; window.__pitchF=0; PL.pitch=-0.08; window.__note=undefined;
        try{ ${js} }catch(e){ return JSON.stringify({name:'${name}',error:e.message}); }
        await W(4000);
        ${tr ? tr[0] : ''}
        __S.spikes={}; __S.n=0; __S.max=0; __S.maxWhy=''; __S.on=true;
        const A=__A; A.sec.fill(0); A.dcM=[0,0]; A.dcS=[0,0]; A.nf=0; PERF.reset(performance.now()); A.dcM=[0,0]; A.dcS=[0,0]; A.nf=0;
        const g0=PERF.gpu.tot, gn0=PERF.gpu.totN, ft=[]; let p=performance.now(), on=true, fr=0;
        (function f(){ if(!on) return; requestAnimationFrame(f); const n=performance.now(); ft.push(n-p); p=n; fr++; })();
        await W(${DUR * 1000}); on=false; PERF.reset(performance.now());
        ${tr ? tr[1] : ''}
        ft.shift(); const s=ft.slice().sort((a,b)=>a-b), n=s.length, tot=ft.reduce((a,b)=>a+b,0), q=k=>+s[Math.min(n-1,Math.floor(n*k))].toFixed(1);
        const nf=Math.max(1,A.nf);
        return JSON.stringify({name:'${name}', fps:+(n*1000/tot).toFixed(1), p50:q(0.5), p99:q(0.99), max:+s[n-1].toFixed(1), hitch:ft.filter(v=>v>20).length,
          cpu:[...A.sec].map(v=>+(v/fr).toFixed(2)), gpu:PERF.gpu.totN>gn0?+((PERF.gpu.tot-g0)/(PERF.gpu.totN-gn0)).toFixed(1):null,
          calls:Math.round(A.dcM[0]/nf), tri:Math.round(A.dcM[1]/nf/1000)+'k', sh:Math.round(A.dcS[0]/nf)+'/'+Math.round(A.dcS[1]/nf/1000)+'k',
          q:QUAL.k, at:[Math.round(PL.pos.x),Math.round(PL.pos.y),Math.round(PL.pos.z)], swim:!!PL.swim, under:!!PL.under, note:window.__note, spikes:(__S.on=false, Object.entries(__S.spikes).sort((a,b)=>b[1]-a[1]).slice(0,6)), worst:__S.maxWhy,
          rf:window.__RF&&(()=>{ const R=window.__RF, m=a=>{ const s=a.slice().sort((x,y)=>x-y); return [+s[s.length>>1].toFixed(1), +s[Math.floor(s.length*0.95)].toFixed(1)]; }; const o={sub:m(R.sub), gpu:m(R.gpu), shadowLights:R.sh, shadowFrames:R.shF, n:R.sub.length}; window.__RF=null; return o; })()}); })()`);
      console.log('BB ' + r);
      if (process.env.CASTAWAY_SHOT) { await run('(async()=>{ __yawR=0; if(PERF.on) PERF.toggle(); await new Promise(r=>setTimeout(r,1500)); })()'); const img = await win.webContents.capturePage(); require('fs').writeFileSync(path.join(process.env.CASTAWAY_SHOT, name.replace(/[^a-z0-9~_-]/gi,'_') + (process.env.CASTAWAY_TAG||'') + '.png'), img.resize({ width: 960 }).toPNG()); }
      if (process.env.CASTAWAY_EVAL) console.log('EVAL ' + await run(`(()=>{ try{ return JSON.stringify((()=>{ ${process.env.CASTAWAY_EVAL} })()); }catch(e){ return 'err '+e.message; } })()`));
      /* CASTAWAY_AB=1 — 이름 붙인 계통을 끄고 켜며 GPU 몫을 잰다(시간으로 — 0.5초씩 번갈아 네 번) */
      if (process.env.CASTAWAY_AB === '1') console.log('AB ' + await run(`(()=>{ const gl=renderer.getContext(), px=new Uint8Array(4), sync=()=>gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); __yawR=0;
        const T=()=>{ renderFrame(); sync(); let n=0; const t=performance.now(); while(performance.now()-t<500){ renderFrame(); n++; if(n%4===0) sync(); } sync(); return (performance.now()-t)/n; };
        const objs=x=>{ const o=[]; const f=v=>{ if(!v) return; if(v.isObject3D) o.push(v); else if(Array.isArray(v)) v.forEach(f); else if(v.mesh&&v.mesh.isObject3D) o.push(v.mesh); else if(v.m&&v.m.isObject3D) o.push(v.m); }; f(x); return o; };
        const G={ giantFar:()=>GIANT.far, giantNear:()=>GIANT.near, giantRoots:()=>GIANT.list.map(g=>g.rootM), ocean:()=>ocean, river:()=>riverMesh, patch:()=>TPATCH.m, chunks:()=>chunks,
          props:()=>propGroup, floraNear:()=>FLORA.m&&Object.values(FLORA.m), floraFar:()=>FLORA.fm&&Object.values(FLORA.fm).map(f=>[f.lods,f.pm]),
          clouds:()=>cloudGroup, skyDome:()=>skyDome, geo:()=>GEO_LF.meshes, savanna:()=>typeof SAV!=='undefined'&&SAV.meshes,
          terrain:()=>TERR_BLK.map(b=>b.m), scene:()=>scene, skyAll:()=>skyScene, rain:()=>typeof rainMesh!=='undefined'&&rainMesh, mobs:()=>{ const a=[]; scene.traverse(o=>{ if(o.isSkinnedMesh&&!MON.ani.some(x=>x.near===o||x.far===o)) a.push(o); }); return a; }, animals:()=>MON.ani.map(a=>a.root||a.g||a.m||a.obj), foam:()=>typeof FOAM!=='undefined'&&(FOAM.mesh||FOAM.m), rubble:()=>typeof RUBBLE!=='undefined'&&(RUBBLE.mesh||RUBBLE.m||RUBBLE.meshes), sky:()=>skyScene.children, giantPic:()=>GIANT.pic,
          skinned:()=>{ const a=[]; scene.traverse(o=>{ if(o.isSkinnedMesh) a.push(o); }); return a; } };
        const out={base:+T().toFixed(1)};
        for(const k in G){ let L; try{ L=objs(G[k]()).filter(o=>o.visible); }catch(e){ out[k]='err'; continue; } if(!L.length){ out[k]='none'; continue; }
          const d=[]; for(let r=0;r<4;r++){ const b=T(); L.forEach(o=>o.visible=false); const v=T(); L.forEach(o=>o.visible=true); d.push(b-v); } d.sort((a,b)=>a-b); out[k]=+((d[1]+d[2])/2).toFixed(1); }
        { const d=[]; for(let r=0;r<3;r++){ const b=T(); const t=performance.now(); let n=0; while(performance.now()-t<500){ LIGHT.dirty(); LIGHT.flush&&LIGHT.flush(); renderFrame(); n++; } sync(); d.push((performance.now()-t)/n-b); } d.sort((a,b)=>a-b); out.shadowRedraw=+d[1].toFixed(1); }
        { const rf=renderFrame; renderFrame=()=>{ if(camcBegin()){ renderer.setClearColor(0,1); renderer.clear(); camcEnd(false); } }; out.postOnly=+T().toFixed(1); renderFrame=()=>{ renderer.setRenderTarget(null); renderer.setClearColor(0,1); renderer.clear(); }; out.clearOnly=+T().toFixed(1); renderFrame=rf; }
        { const p0=renderer.getPixelRatio(); const d=[]; for(let r=0;r<3;r++){ const b=T(); renderer.setPixelRatio(p0*0.75); const v=T(); renderer.setPixelRatio(p0); d.push(b-v); } d.sort((a,b)=>a-b); out.pr75=+d[1].toFixed(1); }
        { const g=CAMC.mat.uniforms; const w0=g.uWet.value; const d=[]; for(let r=0;r<3;r++){ g.uWet.value=0.8; const b=T(); g.uWet.value=0; const v=T(); g.uWet.value=w0; d.push(b-v); } d.sort((a,b)=>a-b); out.wetCost=+d[1].toFixed(1); }
        { const l=CAMC.lines; const d=[]; for(let r=0;r<3;r++){ const b=T(); CAMC.lines=96; const v=T(); CAMC.lines=l; d.push(b-v); } d.sort((a,b)=>a-b); out.tinyRes=+d[1].toFixed(1); }
        { const l=CAMC.on; const d=[]; for(let r=0;r<3;r++){ const b=T(); CAMC.on=false; const v=T(); CAMC.on=l; d.push(b-v); } d.sort((a,b)=>a-b); out.camcSaves=+d[1].toFixed(1); }
        __yawR=0.5; return JSON.stringify(out); })()`));
      /* CASTAWAY_ABL=1 — 그 자리에서 장면의 덩이를 하나씩 감추고 한 장 그리기(gl.finish 까지)를 잰다 · 무엇이 GPU 를 먹나 */
      if (process.env.CASTAWAY_ABL === '1') console.log('ABL ' + await run(`(()=>{ const gl=renderer.getContext(), sav=__yawR; __yawR=0;
        const px=new Uint8Array(4), sync=()=>gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
        const T=(n=12)=>{ renderFrame(); renderFrame(); sync(); const t=performance.now(); for(let i=0;i<n;i++) renderFrame(); sync(); return +((performance.now()-t)/n).toFixed(2); };
        const out={base:T()}; const kids=scene.children.slice();
        const nm=o=>(o.name||o.type)+(o.isInstancedMesh?':inst'+o.count:'')+(o.material?':'+(o.material.type||'').replace('Material','')+(o.material.uniforms&&o.material.uniforms.uWT?':water':''):'')+(o.children.length?':kids'+o.children.length:'')+(o.geometry?':'+o.geometry.type.replace('BufferGeometry','BG'):'');
        const res=[];
        const triOf=o=>{ let tri=0; o.traverse(c=>{ if(c.geometry&&c.visible!==false){ const g=c.geometry; tri+=((g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0))/3)*(c.isInstancedMesh?c.count:1); } }); return tri; };
        out.nKids=kids.length; out.t0=performance.now();
        const cand=kids.filter(o=>o.visible&&o!==propGroup).map(o=>[o,triOf(o)]).sort((a,b)=>b[1]-a[1]).slice(0,16).map(x=>x[0]); cand.push(propGroup);
        /* 감춘 것과 안 감춘 것을 번갈아 세 번 — 다른 프로그램이 GPU 를 같이 쓰면 한 번 잰 값은 크게 흔들린다 */
        const AB=(on,off)=>{ const d=[]; for(let r=0;r<3;r++){ const b=T(8); off(); const v=T(8); on(); d.push(b-v); } d.sort((x,y)=>x-y); return +d[1].toFixed(2); };
        const hint=o=>{ const u=o.userData||{}, k=Object.keys(u).slice(0,3).join('/'); const m=o.material; const at=o.geometry?Object.keys(o.geometry.attributes).filter(x=>!/^(position|normal|uv)$/.test(x)).slice(0,4).join('/'):''; return (k?' u:'+k:'')+(at?' a:'+at:'')+(m&&m.defines?' d:'+Object.keys(m.defines).slice(0,3).join('/'):''); };
        for(const o of cand){ if(!o.visible) continue;
          res.push([nm(o)+'#'+o.id+hint(o), AB(()=>o.visible=true,()=>o.visible=false), Math.round(triOf(o)/1000)+'k']); }
        res.sort((a,b)=>b[1]-a[1]); out.top=res.slice(0,18);
        { const b=skyScene.children.map(o=>o.visible), r2=[]; skyScene.children.forEach((o,i)=>{ if(!b[i]) return; r2.push([nm(o)+'#'+o.id+hint(o), AB(()=>o.visible=true,()=>o.visible=false)]); }); r2.sort((a,b)=>b[1]-a[1]); out.sky=r2.slice(0,8); }
        if(typeof CAMC!=='undefined'){ const l=CAMC.on; CAMC.on=false; out.noCamc=AB(()=>CAMC.on=l,()=>CAMC.on=false); CAMC.on=l; }
        const sv=skyScene.visible; skyScene.visible=false; out.noSky=AB(()=>skyScene.visible=true,()=>skyScene.visible=false); skyScene.visible=sv;
        out.secs=+((performance.now()-out.t0)/1000).toFixed(1); out.canvas=[renderer.domElement.width,renderer.domElement.height]; out.pr=renderer.getPixelRatio();
        __yawR=sav; return JSON.stringify(out); })()`));
    }
  } catch (e) { console.log('BB ' + JSON.stringify({ error: String(e && e.message || e) })); }
  clearTimeout(fail); app.exit(0);
});
