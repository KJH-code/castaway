/* 99-main.js — CASTAWAY
   메인 루프 — 프레임마다 도는 순서(loop) · 맨 끝에서 게임을 켠다
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ---------------- 메인 루프 ---------------- */
let last=performance.now(), mapT=0, lastDraw=0;
function loop(){
  requestAnimationFrame(loop);
  const now=performance.now();
  if(BENCH.on){ benchFrame(now); return; }     // 벤치마크 — 정해 둔 길을 따로 돈다
  if(paused&&!busy&&!document.hidden&&!winHidden) precompTick(now);   // 멈춘 동안 나올 셰이더를 미리 짠다(E2)
  /* 창을 내렸으면 그리지 않고, 멈춤 화면 뒤는 초당 10번만 그린다(덮개가 94% 가려 보이지 않는다) — GPU·전기를 아낀다 */
  if(document.hidden||winHidden||(paused&&now-lastDraw<100)){ last=now; return; }
  /* 섬을 짓는 동안(busy)은 그리지 않는다 — 덮개(94%) 뒤에서 짓다 만 장면(땅이 없어졌다 생기고, 하늘 표가 비었다 차고 …)을
     초당 10번 그려서 로딩 내내 뒤가 깜박였다. 화면은 마지막으로 그린 그림을 그대로 둔다 */
  if(busy){ last=now; return; }
  /* 여는 화면(#ov.title)은 불투명한 바탕에 캔버스 그림이라 뒤의 섬이 한 화소도 안 보인다 — 섬을 다 지은 뒤 세 장만 그려
     (텍스처 올리기 · 셰이더 · 그림자 지도를 데워 둔다 — 안 그러면 그 몫이 '상륙'을 누르는 순간으로 밀린다) 그 뒤로는 안 그린다.
     쓰러진 순간의 그림을 뜰 때는 그린다 */
  if(paused&&TITLE.on&&!TITLE.snapWant){ if(TITLE.bgN>=3){ last=now; return; } TITLE.bgN++; }
  /* 프레임 제한(설정) — 정한 간격이 안 됐으면 이번 화면 주기는 건너뛴다. last 는 그대로 두어 dt 가 쉰 시간을 안는다 */
  if(FPS_CAP>0&&now-lastDraw<1000/FPS_CAP-1.5) return;
  lastDraw=now;
  if(!paused&&!busy&&!uiHold()) qualTick(now-last,Math.min(0.1,(now-last)/1000));   // 자동 품질 — 프레임이 떨어지면 자세히 그리는 거리를 당긴다(30-props.js)
  const dt=Math.min(0.05,(now-last)/1000); last=now;

  const PO=PERF.on;                // 성능 창이 켜져 있을 때만 토막마다 잰다
  if(!paused&&!busy) try{
    let tp=PO?performance.now():0;
    /* **사전**을 편 동안만 세상이 멈춘다 — 시간 · 배고픔·목마름 · 불 · 날씨 · 몸의 움직임이 선다.
       가방(소지품·제작)은 열어도 시간이 흐른다(사용자 요청 — 예전엔 가방도 멈췄다). 상자·모닥불 창도 안 멈춘다. */
    const hold=uiHold();
    hudS(document.getElementById('holdTag'),'display',hold?'block':'none');
    if(hold) updateCraft(dt);
    else{
    const dh=dt*timeScale/60;                  // 실시간 1분 = 게임 1시간 (하루 24분)
    gameHours+=dh; hourOfDay=(hourOfDay+dh)%24;
    updateShip(dt);                            // 보급선이 내려놓고 떠난다
    updateTorch(dt,dh); updateLamp(dt,dh); updateFires(dt,dh); updateFurnaces(dt,dh); updateStoreTags(); updateRubble(); updateFlora(); updateSea(dt); updateReef(dt); if(!SURF.hide) updateFoam(); updateWildlife(dt); updatePush(dt); updateCamcorder(dt);
    updateWeapon(dt); updatePower(dt); updateDecay(dh); updateGeo(dt); if(!SURF.hide) updateFalls(dt);
    updateOcean(now*0.001);
    if(PO) tp=PERF.lap(4,tp);
    updateSky();
    if(PO) tp=PERF.lap(0,tp);
    updateClouds(dt);
    if(!SURF.hide) updateRain(dt);        // 땅속에선 비를 안 그린다(98-surface.js)
    if(PO) tp=PERF.lap(1,tp);
    LIGHT.update(dt);           // 해 그림자 상자를 사람에게 옮기고 불빛에 그림자를 나눈다
    if(PO) tp=PERF.lap(2,tp);
    if(flyMode){
      const sp=Math.sin(fly.ph),cp=Math.cos(fly.ph);
      fly.tx=PL.pos.x; fly.tz=PL.pos.z; fly.ty=PL.pos.y;
      camera.position.set(fly.tx+fly.r*sp*Math.sin(fly.th),fly.ty+fly.r*cp,fly.tz+fly.r*sp*Math.cos(fly.th));
      camera.lookAt(fly.tx,fly.ty,fly.tz);
      scene.fog.density=0.0012/farScale;
    }else{
      applyTouch();
      const h=document.getElementById('hint');
      if(h&&hasMouse&&!flyMode){
        const locked=document.pointerLockElement===cv;
        const want=mapOpen?'지도 — 좌클릭 핀 꽂기 · 핀 우클릭 뽑기 · M 접기(걷기는 된다)'
                  :locked?'WASD 이동 · 좌클릭 쓰기·채집·열기 · E 창 닫기 · L 전등 · I 가방(소지품·제작) · B 사전 · M 지도·핀'
                         :'화면을 클릭하면 시점 조작이 시작됩니다';
        if(h.textContent!==want) h.textContent=want;
      }
      updateBuild(); updateLevel(); updateCaves(); if(!SURF.hide) updateCrags(); updateTlit(dt); if(!SURF.hide) updateDew();
      updateHarvest(dt);
      updateGather(dt);           // 덩굴·덤불·열매·버섯·조개 — 누르고 있는 동안 막대가 찬다(95-flora.js)
      updateCraft(dt);
      updateRegrow();
      updatePlayer(dt);
      updateUnder(dt);            // 땅속 — 빛을 끄고 바닥·천장 칸 · 방의 꾸밈 · 생물(96-underworld.js — updateSky 다음에 그 빛에 곱한다)
      updateGiantFalls(dt);       // 벤 노거수가 넘어간다 · 땅을 치면 화면이 흔들린다(사람 시점 다음에 얹는다 — 95-giants.js)
      updateMobs(dt);             // 몬스터 — 다지류 · 가고일 · 스킨워커 · 맞으면 화면이 흔들린다(사람 시점 다음에 얹는다 — 97-mobs.js)
    }
    }                           // hold — 세상이 멈춘 동안은 위를 통째로 건너뛴다
    if(PO) tp=PERF.lap(4,tp);
    surfTick(dt);               // 땅 위를 가릴지(98-surface.js) — 날기 갈래 밖에서 늘 센다(날기를 켜면 곧바로 풀리게)
    if(!SURF.hide){             // 땅속에선 땅 위를 안 그리니 보이기·LOD 도 쉰다(98-surface.js)
    updateTileVis();            // 150 m 밖의 나무 칸을 끈다
    updateTerrainLOD();         // 먼 지형 청크는 성긴 격자로
    }
    if(PO) tp=PERF.lap(3,tp);
    if(landed&&!PL.dead&&!hold){ autoT+=dt; if(autoT>=AUTO_EVERY) autoSave('놀이 5분'); }
    updateHUD(dt);
    drawCompass();
    mapT+=dt; if(mapT>0.12){ mapT=0; drawMap(); }
    if(PO) tp=PERF.lap(5,tp);
  }catch(e){ showErr('프레임',e); }     // 한 프레임이 죽어도 화면은 계속 그린다
  const tr=PO?performance.now():0;
  if(PO) PERF.gpuBegin();
  try{ LIGHT.flush(); renderFrame(); }catch(e){ showErr('렌더',e); }   // 새로 붙은 물체는 그리기 전에 배역을 받는다
  if(TITLE.snapWant) titleSnapTake();                                   // 쓰러진 순간의 그림 — 그린 직후에 떠 둔다(91-title.js)
  if(PO){ PERF.gpuEnd(); PERF.lap(6,tr); PERF.frame(now); }
}

initThree();
applySettings();
generateWorld();
loop();
