/* 40-light.js — CASTAWAY
   빛 — LIGHT: 배역(드리우기/받기) · 해 그림자 상자 · 점·집중 광원 그림자 예산 · 그리기(renderFrame)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   빛 — 광원 · 물체 · 그림자를 한 곳에서 다룬다
   ----------------------------------------------------------------------------
   예전에는 해가 물체를 비추기만 하고 그림자는 따로 있었다 — 나무 밑에 반투명
   원반을 깔아 둔 가짜였다. 그래서 집도 벽도 사람도 그림자가 없었고, 횃불이나
   모닥불 불빛은 그림자를 아예 만들지 못했다.

   이제 그림자는 광원의 성질이다. 어느 광원이든 `LIGHT.addPoint`/`addSpot` 으로
   등록하면 같은 규칙을 받고, 그림자를 드리울지는 **예산**이 정한다.

   세 부분이다.

   ① 배역(`role`) — 물체가 빛에 어떻게 참여하는지. 씬을 훑어 한 번에 정한다.
        'full'  드리우고 받는다(기본)   — 지형 · 나무 · 바위 · 건물
        'recv'  받기만 한다             — 수면
        'soft'  품질 '보통' 이상에서만 드리운다 — 풀 · 갈대. 4만 포기를 그림자
                지도에 또 그리는 일이라, 낮은 품질에서는 받기만 한다
        'none'  빛 계산에서 뺀다        — 하늘 · 해 · 불꽃 · 예광탄 (MeshBasicMaterial 은 자동)
      `userData.lightRole` 로 적어 두면 그대로 따르고, **아래 것들이 물려받는다** —
      무리 하나에 적으면 그 밑이 다 따른다. 없으면 재질로 정한다.
      새로 붙인 물체는 저절로 편입된다 — `Object3D.add` 갈고리가 `LIGHT.pending` 에 모으고 그리기 직전
      `LIGHT.flush()` 가 배역을 준다. 장면 전체를 훑는 `refresh()` 는 섬을 다 지었을 때·품질을 바꿀 때만.

   ② 해 그림자 — 섬이 1920 m 라 전체를 한 장에 담을 수 없다. 사람 주위
      `R` m 만 덮는 평행투영 상자를 **사람을 따라 옮긴다**. 그냥 옮기면 상자가
      반 텍셀씩 밀릴 때마다 그림자 가장자리가 들끓으므로(shadow swimming)
      **중심을 텍셀의 정수배인 4 m 격자에 맞춰 끊어서** 옮긴다. 그림자 지도는
      **바뀔 때만 다시 그린다**(아래 `update` 머리말 — 드리우는 것을 움직이면 `dirtyAt`).

   ③ 그림자 예산 — 점광원 그림자는 한 광원이 정육면체 여섯 면이라 비싸다.
      등록된 광원 중 **지금 화면에서 가장 값이 나가는 것 K개**에만 그림자를 준다
      (`score` = 세기 × 사거리 ÷ 거리). 밀려난 광원은 그림자 지도를 반납한다 —
      안 그러면 지나친 모닥불 수만큼 GPU 메모리가 쌓인다.

   품질은 설정의 '그림자' 한 줄이 정한다 — 끄기 · 낮음 · 보통 · 높음.
   ========================================================================== */
/* 해 그림자 다시 그리기 — 상자 가운데 격자(m) · 해가 이만큼 돌면(0.2°) · 안전망(초). 아래 LIGHT.update 머리말 */
const SUN_STEP=4, SUN_TURN_COS=Math.cos(0.2*Math.PI/180), SUN_AGE=1.5;
/* 해가 낮을 때의 그림자 행렬 — 어느 점이든 (2,2,2) 로 보낸다(지도 [0,1] 밖 → 그림자 없음) */
const SUN_PARK=new THREE.Matrix4().set(0,0,0,2, 0,0,0,2, 0,0,0,2, 0,0,0,1);
const LIGHT={
  /* size 해 그림자 지도 한 변 · R 덮는 반경(m) · pts 점광원 그림자 개수 ·
     psize 점광원 지도 한 변 · soft 부드러운 가장자리 */
  QUAL:[{n:'끄기',size:0,   R:0,  pts:0,psize:0,  soft:false},
        {n:'낮음',size:1024,R:36, pts:0,psize:0,  soft:false},
        {n:'보통',size:2048,R:46, pts:1,psize:512,soft:true},
        {n:'높음',size:4096,R:64, pts:2,psize:768,soft:true}],
  q:2,
  locals:[],            // 등록된 점·집중 광원
  _sunOn:false,
  _c:new THREE.Vector3(), _f:new THREE.Vector3(), _w:new THREE.Vector3(),

  /* 광원 등록 — 만드는 자리는 제각각이어도 규칙은 여기 하나다.
     shadow:true 를 준 것만 예산 경쟁에 들어간다. 카메라에 붙은 횃불처럼
     제 그림자가 보이지 않는 광원은 주지 않는다. */
  /* 거리 감쇠 — 세기 × (1 − 거리/사거리)^decay.
     예전 기본값 1 은 사거리까지 일직선으로 줄어서, 불 바로 옆과 세 걸음 떨어진
     곳의 밝기가 별로 다르지 않았다. 2 로 두면 제곱으로 떨어져 불가에 앉은 느낌이
     난다(역제곱과 같은 모양이고, 사거리에서 정확히 0 이 되는 점만 다르다).
     대신 같은 자리가 어두워지므로 **세기를 1.8배쯤 올려 잡는다** — 아래 광원들의
     숫자에 이미 반영돼 있다. 새 광원도 그 몫을 얹어 잡을 것. */
  addPoint(parent,{color=0xffffff,intensity=1,dist=20,shadow=false,pos=null,decay=2}={}){
    const l=new THREE.PointLight(color,intensity,dist);
    l.decay=decay;
    if(pos) l.position.set(pos[0],pos[1],pos[2]);
    l.userData.wantShadow=!!shadow;
    if(shadow){ l.shadow.bias=0; l.shadow.normalBias=0.03;   // 해와 같은 이유로 0 (뒷면을 그린다)
                l.shadow.camera.near=0.25; this.locals.push(l);
                l.shadow.autoUpdate=false;      // 불은 안 움직인다 — 둘레가 바뀔 때만 다시 그린다(dirty)
                l.shadow.needsUpdate=true; }
    parent.add(l);
    return l;
  },
  /* ── 불빛 풀 ──────────────────────────────────────────────────────────────
     모닥불·증기기관·제련로는 광원을 제 몸에 달지 않는다 — `addFire` 가 돌려주는 것은 **대역**(Object3D · 세기·빛깔·사거리·
     visible 을 예전 광원처럼 적는다)이고, 진짜 광원은 장면에 늘 서 있는 `POOL_N` 개다. 매 프레임 켜진 대역 중 값이 나가는
     것(세기 × 사거리 ÷ 거리)을 골라 풀 광원에 옮겨 싣는다. 쓰지 않는 풀 광원은 세기 0.
     예전엔 불을 켜고 끌 때마다 광원 수가 바뀌어(그리고 다음 프레임에 그림자 수가 또 바뀌어) **모든 재질의 셰이더를
     다시 짜느라** 불을 켜는 순간 멈칫했다(사용자 지적 — 어두울 때 불 켜면 버벅). 이제 광원 수는 늘 같다.
     풀의 앞 `pts`(그림자 품질의 점광원 그림자 수) 개는 늘 그림자를 드리운다 — 그림자 수도 바뀌지 않는다.
     맡은 불이 바뀔 때만 그림자 지도를 다시 그린다(불은 안 움직인다). */
  POOL_N:3, pool:[], proxies:[],
  addFire(parent,{color=0xffffff,intensity=1,dist=20,shadow=false,pos=null,decay=2}={}){
    const o=new THREE.Object3D();
    o.isLightProxy=true; o.color=new THREE.Color(color); o.intensity=intensity; o.distance=dist; o.decay=decay;
    o.userData.wantShadow=!!shadow; o.userData.lightRole='none';
    if(pos) o.position.set(pos[0],pos[1],pos[2]);
    parent.add(o); this.proxies.push(o);
    return o;
  },
  poolInit(){
    if(this.pool.length) return;
    for(let i=0;i<this.POOL_N;i++){
      const l=new THREE.PointLight(0xffffff,0,10); l.decay=2; l.position.set(0,-5000,0);
      l.userData.pool=true; l.userData.wantShadow=true; l.userData.who=null;
      l.shadow.bias=0; l.shadow.normalBias=0.03; l.shadow.camera.near=0.25; l.shadow.autoUpdate=false;
      scene.add(l); this.locals.push(l); this.pool.push(l);
    }
  },
  poolShadows(){
    const Q=this.QUAL[this.q], S=renderer.shadowMap.enabled?Math.min(Q.pts,this.POOL_N):0;
    this.pool.forEach((l,i)=>{ const cast=i<S; if(l.castShadow===cast) return;
      if(cast){ l.castShadow=true; l.shadow.mapSize.set(Q.psize,Q.psize); l.userData.moved=true; } else this.free(l); });
    return S;
  },
  _onScene(o){ for(let p=o;p;p=p.parent){ if(!p.visible) return false; if(p===scene) return true; } return false; },
  poolUpdate(dt){
    if(!this.pool.length) return;
    const S=this.poolShadows(), cam=camera.position;
    // 다 떨어져 나간 대역은 버린다(불을 치웠다)
    if((this._pr=(this._pr||0)+1)%120===0){ const root=o=>{ while(o.parent) o=o.parent; return o; };
      this.proxies=this.proxies.filter(o=>root(o)===scene); }
    const cand=[];
    for(const o of this.proxies){
      if(o.intensity<=0.01||!this._onScene(o)) { o.userData.sc=-1; continue; }
      o.getWorldPosition(this._c); const d=this._c.distanceTo(cam);
      if(d>o.distance+60){ o.userData.sc=-1; continue; }
      o.userData.sc=o.intensity*o.distance/(4+d); cand.push(o);
    }
    cand.sort((a,b)=>b.userData.sc-a.userData.sc);
    const pick=cand.slice(0,this.POOL_N);
    /* 그림자 칸(앞 S 개)에는 그림자를 원하는 것 중 값이 큰 것부터 — 이미 맡은 것은 제자리를 지킨다(다시 그리지 않게) */
    const want=pick.filter(o=>o.userData.wantShadow).slice(0,S), rest=pick.filter(o=>want.indexOf(o)<0);
    const slots=this.pool, sh=slots.slice(0,S), plain=slots.slice(S);
    const assign=(ls,os)=>{
      const left=os.slice();
      for(const l of ls){ const i=left.indexOf(l.userData.who); if(i>=0) left.splice(i,1); else l.userData.who=null; }
      for(const l of ls) if(!l.userData.who&&left.length){ l.userData.who=left.shift(); l.userData.moved=true; }
      return left;
    };
    const over=assign(sh,want);
    assign(plain,rest.concat(over));
    for(let i=0;i<slots.length;i++){
      const l=slots[i], o=l.userData.who, cast=i<S;
      if(!o){ l.intensity=0; continue; }
      if(l.userData.moved){
        o.getWorldPosition(l.position); l.distance=o.distance; l.decay=o.decay;
        if(cast){ l.shadow.camera.far=o.distance+2; l.shadow.camera.updateProjectionMatrix(); l.shadow.needsUpdate=true; }
        l.userData.moved=false; l.updateMatrixWorld();
      }
      l.color.copy(o.color); l.intensity=o.intensity;
      if(cast){ l.userData.shAge=(l.userData.shAge||0)+(dt||0);
        if(l.userData.shAge>SUN_AGE*2){ l.userData.shAge=0; l.shadow.needsUpdate=true; }
        if(l.shadow.needsUpdate) this.stats.pts++; }
    }
  },
  addSpot(parent,l,shadow=false){
    l.decay=2;
    l.userData.wantShadow=!!shadow;
    if(shadow){ l.shadow.bias=0; l.shadow.normalBias=0.03; this.locals.push(l); }
    parent.add(l);
    return l;
  },
  drop(l){ const i=this.locals.indexOf(l); if(i>=0) this.locals.splice(i,1); this.free(l); },
  free(l){                                  // 그림자 지도 반납
    l.castShadow=false;
    if(l.shadow&&l.shadow.map){ l.shadow.map.dispose(); l.shadow.map=null; }
  },

  /* ① 배역 — 재질을 보고 정한다. 한 번 훑으면 새로 생긴 것까지 편입된다. */
  roleOf(o){
    // 배역은 물려받는다 — 무리(Group) 하나에 적어 두면 그 아래가 다 따른다
    for(let p=o;p;p=p.parent)
      if(p.userData&&p.userData.lightRole) return p.userData.lightRole;
    const m=o.material;
    if(!m) return 'none';
    const one=Array.isArray(m)?m[0]:m;
    if(!one||one.isMeshBasicMaterial||one.isPointsMaterial||one.isLineBasicMaterial)
      return 'none';                        // 스스로 빛나는 것 — 빛을 받지도 드리우지도 않는다
    return 'full';
  },
  /* 물체 하나에 배역을 준다 — 드리우면 true */
  apply(o,on){
    if(!o.isMesh&&!o.isInstancedMesh) return false;
    let r=on?this.roleOf(o):'none';
    if(r==='soft') r=(this.q>=2)?'full':'recv';
    o.castShadow   = (r==='full');
    o._cast0=o.castShadow;                  // 배역이 준 값 — 칸 메시는 해 그림자 상자 밖이면 잠시 끈다(30-props.js `castNear`)
    o.receiveShadow= (r==='full'||r==='recv');
    // 구름 그림자 · 바람을 재질에 붙인다(한 번만 — envPatch 가 표시해 둔다)
    if(Array.isArray(o.material)) o.material.forEach(envPatch); else envPatch(o.material);
    if(o.customDepthMaterial) envPatch(o.customDepthMaterial);
    return o.castShadow;
  },
  /* 전체 훑기 — 품질을 바꿀 때 · 섬을 다 지은 뒤 한 번. 예전엔 0.7초마다 장면 전체(물체 4,900)를
     훑었다(한 번 1.4 ms · 쓰레기 180 KB). 이제 평소에는 **새로 붙은 것만** 본다(`pending` · `flush`). */
  refresh(){
    const on=this.QUAL[this.q].size>0;
    scene.traverse(o=>this.apply(o,on));
    this.pending.length=0;
    this.dirty();
  },
  /* 새로 붙은 물체 — `Object3D.add` 갈고리(아래)가 모은다. 그리기 직전(`loop`)에 한 번 비운다.
     아이콘·임포스터를 찍는 임시 장면에 붙은 것은 건너뛴다(뿌리가 `scene` 이 아니다).
     드리우는 것이 새로 생겼으면 그림자를 다시 그린다. */
  pending:[], live:false,          // live — 섬을 다 지은 뒤(인스턴스 갈고리가 그림자를 다시 그리게 한다)
  flush(){
    /* **섬을 짓는 동안(`live` 거짓)은 건너뛴다** — 짓는 동안에도 단계마다 프레임을 그리는데, 붙는 칸마다
       배역(그림자 드리우기)을 주면 해 그림자 지도(아직 매 프레임 갱신)에 짓던 섬이 통째로 그려져
       섬 생성이 408 → 856초로 두 배가 됐다(헤드리스). 다 지으면 generateWorld 가 refresh 로 한 번에 준다 */
    if(!this.live||!this.pending.length||!scene) return;
    const on=this.QUAL[this.q].size>0, list=this.pending; this.pending=[];
    let cast=false;
    for(const o of list){
      let r=o; while(r.parent) r=r.parent;
      if(r!==scene) continue;
      o.traverse(c=>{ if(this.apply(c,on)) cast=true; });
    }
    if(cast) this.dirty();
  },

  setQuality(q){
    this.q=clamp(q|0,0,this.QUAL.length-1);
    const Q=this.QUAL[this.q];
    renderer.shadowMap.enabled=Q.size>0;
    renderer.shadowMap.type=Q.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
    if(sun){
      this.free(sun);
      if(Q.size>0){
        sun.shadow.mapSize.set(Q.size,Q.size);
        const c=sun.shadow.camera;
        c.left=-Q.R; c.right=Q.R; c.top=Q.R; c.bottom=-Q.R;
        /* 깊이 범위는 덮는 상자에 바짝 붙인다 — 평행투영은 깊이가 선형이라
           near~far 가 넓을수록 한 눈금이 굵어지고, 그만큼 여드름이 잘 생긴다.
           광원을 SUN_D 만큼 띄워 두므로 그 앞뒤로 SUN_PAD 만 남긴다. */
        const D=Q.R*2+80;
        c.near=Math.max(0.5,D-Q.R-120); c.far=D+Q.R+120;
        c.updateProjectionMatrix();
        /* bias 는 0 이다. **Three 는 그림자 지도에 뒷면을 그린다**(FrontSide 재질의
           깊이 재질은 BackSide 로 뒤집힌다). 앞면을 그릴 때 쓰던 음수 bias 를 그대로
           두면 비교 깊이가 빛 쪽으로 0.2 m 나 당겨져, 빛이 비스듬히 스치는 자리에서
           제 뒷면보다 뒤로 밀려 **제 몸에 줄무늬 그림자가 앉는다**(사진의 그 얼룩).
           뒷면을 그리는 이상 상수 bias 는 필요 없다. */
        sun.shadow.bias=0;
        /* normalBias 는 그림자를 찾을 자리를 법선 쪽으로 밀어 여드름을 막는다.
           **텍셀 굵기로 재야 한다** — 예전의 0.35~0.65 m 는 텍셀(보통 0.054 m)의
           열 배라, 작은 돌은 표본이 아예 제 몸 밖으로 나가 그림자가 몸에서 떨어져
           보였다(자갈은 지름이 0.26 m 라 통째로 벗어났다). 두 텍셀이면 충분하다. */
        /* normalBias 는 표본을 법선 쪽으로 밀어 남은 여드름을 지운다. 밀수록
           물체와 그림자가 떨어지므로(밑동에 그림자가 안 생긴다) 한 텍셀만 민다. */
        sun.shadow.normalBias=2*Q.R/Q.size;
        sun.castShadow=true;
      }
    }
    for(const l of this.locals) this.free(l);
    if(typeof _fireWarm!=='undefined') _fireWarm=false;
    this.poolShadows();                           // 불빛 풀의 그림자 칸은 품질이 정해지는 즉시 — 첫 프레임에 그림자 수가 바뀌어 다 다시 짜지 않게   // 그림자 수가 바뀌면 불꽃 셰이더 열쇠도 바뀐다 — 다음 상륙·계속 때 다시 짠다
    this.refresh();
    renderer.shadowMap.needsUpdate=true;
  },

  /* ②③ 매 프레임 — 해 상자를 사람에게 옮기고, 점광원 그림자를 나눠 준다.
     **그림자 지도는 매 프레임 다시 그리지 않는다**(`shadow.autoUpdate=false` — Three 는 광원마다
     `needsUpdate` 를 보고 그 지도만 다시 그린다). 그림자를 드리우는 것은 거의 다 서 있다(나무·바위·집 —
     몹이 아직 없고, 손에 든 것은 받기만 한다). 그래서 다시 그리는 때는 넷이다:
       · 상자가 옮겨졌을 때 — 상자 가운데를 `SUN_STEP`(4 m) 격자에 끊고, 시선 쪽은 8방향(45°)으로 끊는다
         (경계에서 떨지 않게 27° 를 넘어야 넘어간다). 예전엔 시선 앞 0.45R 에 텍셀 단위로 붙어 다녀서
         **고개만 돌려도 매 프레임 다시 그렸다.**
       · 해(밤엔 달)가 `SUN_TURN`(0.2°) 넘게 돌았을 때 — 10 m 나무 그림자 끝이 한 텍셀쯤 움직이는 각이다
       · 드리우는 것이 바뀌었을 때(`dirty`/`dirtyAt`) — 캐기·벌목·짓기·문 여닫기·물레방아·칸 켜고 끄기
       · 안전망 — `SUN_AGE`(1.5초)가 지나면 한 번
     빛의 **방향**(조명)은 매 프레임 지금 해 쪽으로 맞춘다 — 지도와 그림자 행렬은 마지막에 그린 것이 짝으로 남는다.
     점광원(불) 그림자도 같은 식이다 — 불은 안 움직이므로 받는 순간 한 번, 둘레가 바뀌면 다시.
     손전등(집중광)은 카메라에 붙어 움직이므로 예전처럼 매 프레임 그린다. */
  _sec:0, _cx:NaN, _cz:NaN, _cy:0, _age:0, _sunDirty:true, _sunPark:false,
  _dir:new THREE.Vector3(), _lp:new THREE.Vector3(NaN,NaN,NaN),
  stats:{sun:0, pts:0},          // 지도를 다시 그린 횟수(성능 창이 초당으로 보인다)
  /* 드리우는 것이 바뀌었다 — 해 지도와 그림자를 받은 불 지도를 다음 프레임에 다시 그린다 */
  dirty(){
    this._sunDirty=true;
    for(const l of this.locals) if(l.castShadow&&l.shadow.autoUpdate===false) l.shadow.needsUpdate=true;
  },
  /* (x,z) 둘레 r m 가 바뀌었다 — 그 자리를 덮는 지도만 */
  dirtyAt(x,z,r=0){
    const Q=this.QUAL[this.q];
    // 상자 밖이라도 해 쪽에 선 큰 것은 그림자를 상자 안으로 드리운다 — 넉넉히 2R
    if(Math.abs(x-this._cx)<Q.R*2+r&&Math.abs(z-this._cz)<Q.R*2+r) this._sunDirty=true;
    for(const l of this.locals){
      if(!l.castShadow||l.shadow.autoUpdate!==false) continue;
      l.getWorldPosition(this._c);
      if(Math.hypot(x-this._c.x,z-this._c.z)<(l.distance||30)+r+1) l.shadow.needsUpdate=true;
    }
  },
  update(dt){
    const Q=this.QUAL[this.q];
    this.flush();
    this.poolUpdate(dt);                          // 불빛 풀 — 그림자를 꺼도 불빛은 난다
    if(!Q.size){ return; }

    /* ── 해: 낮은 각도에서는 그림자가 끝없이 길어져 얼룩만 남으므로 접는다.
       **castShadow 를 끄지 않고 그림자 행렬을 '모든 점 → 지도 밖'으로 돌려 둔다**(`SUN_PARK`). 끄면 그림자 광원
       수가 바뀌어 모든 재질(100여 개)의 셰이더를 다시 짜느라 새벽·저녁·달이 뜨고 질 때마다 멈칫했다.
       Three 의 그림자 셈은 지도 밖이면 1(볕)을 돌려주므로 화면은 끈 것과 같다(PCF 표본도 안 읽는다).
       다시 해가 오르면 지도를 새로 그린다(그사이 낡았다). */
    const lowSun=sun.intensity<0.12;
    if(!sun.castShadow){ sun.castShadow=true; this._sunDirty=true; }
    if(lowSun!==this._sunPark){ this._sunPark=lowSun; if(!lowSun) this._sunDirty=true; }
    if(lowSun){ sun.shadow.autoUpdate=false; sun.shadow.needsUpdate=false; sun.shadow.matrix.copy(SUN_PARK); }
    else{
      sun.shadow.autoUpdate=false;
      // 시선 앞쪽을 더 덮는다 — 뒤통수의 그림자는 화면에 없다. 시선은 8방향으로 끊는다
      camera.getWorldDirection(this._f);
      const a=Math.atan2(this._f.x,this._f.z), q=Math.PI/4;
      let d=a-this._sec*q; d=Math.atan2(Math.sin(d),Math.cos(d));
      if(Math.abs(d)>q*0.6) this._sec=Math.round(a/q);
      const fx=Math.sin(this._sec*q), fz=Math.cos(this._sec*q);
      // 가운데는 SUN_STEP 격자에 — 격자 간격을 텍셀의 정수배로 잡아야 다시 그릴 때 그림자가 들끓지 않는다
      const tex=(Q.R*2)/Q.size, G=Math.max(1,Math.round(SUN_STEP/tex))*tex;
      const cx=Math.round((PL.pos.x+fx*Q.R*0.45)/G)*G, cz=Math.round((PL.pos.z+fz*Q.R*0.45)/G)*G;
      /* 광원 방향은 updateSky 가 정한 해 위치를 그대로 쓴다(정규화). 그런데 아래에서 이 함수가 sun.position 을
         상자 쪽으로 옮겨 놓으므로, updateSky 없이 다시 불리면(멈춤 · 시험) 옮겨 둔 자리를 방향으로 읽어 매번
         '해가 돌았다'고 다시 그렸다 — 지난번에 써 둔 자리 그대로면 지난 방향을 쓴다 */
      if(!sun.position.equals(this._lp)) this._w.copy(sun.position).normalize();
      this._age+=dt||0;
      if(cx!==this._cx||cz!==this._cz||this._sunDirty||this._w.dot(this._dir)<SUN_TURN_COS
         ||this._age>SUN_AGE||!sun.shadow.map){
        this._cx=cx; this._cz=cz; this._cy=heightAt(cx,cz); this._dir.copy(this._w);
        sun.shadow.needsUpdate=true; this._sunDirty=false; this._age=0; this.stats.sun++;
      }
      const D=Q.R*2+80;
      sun.position.set(this._cx+this._w.x*D, this._cy+this._w.y*D, this._cz+this._w.z*D); this._lp.copy(sun.position);
      sun.target.position.set(this._cx,this._cy,this._cz);
      sun.target.updateMatrixWorld();
    }

    // ── 점·집중 광원: 값이 나가는 순서로 K개
    const K=Q.pts;                                // 손전등(집중광) — 불빛 풀과 따로 센다(점광원 그림자 · 집중광 그림자는 칸이 다르다)
    if(!this.locals.length) return;
    const cam=camera.position;
    let best=null, best2=null, s1=-1, s2=-1;
    for(const l of this.locals){
      let sc=-1;
      if(l.userData.pool) continue;               // 불빛 풀은 제 규칙(poolUpdate)
      if(l.userData.wantShadow&&l.visible&&l.intensity>0.05){
        l.getWorldPosition(this._c);
        const d=this._c.distanceTo(cam);
        // 사거리 밖으로 벗어난 불은 화면에 그림자를 만들지 않는다
        if(d < (l.distance||30)+34) sc=l.intensity*(l.distance||30)/(4+d);
      }
      if(sc>s1){ s2=s1; best2=best; s1=sc; best=l; }
      else if(sc>s2){ s2=sc; best2=l; }
    }
    const win1=K>=1?best:null, win2=K>=2?best2:null;
    for(const l of this.locals){
      if(l.userData.pool) continue;
      const want=(l===win1&&s1>0)||(l===win2&&s2>0);
      if(want){
        if(!l.castShadow){
          l.shadow.mapSize.set(Q.psize,Q.psize);
          l.shadow.camera.far=(l.distance||30)+2;
          if(l.shadow.camera.updateProjectionMatrix) l.shadow.camera.updateProjectionMatrix();
          l.castShadow=true; l.shadow.needsUpdate=true;
        }
        // 안전망 — 불 지도도 가끔(SUN_AGE×2) 다시 그린다
        if(l.shadow.autoUpdate===false){ l.userData.shAge=(l.userData.shAge||0)+(dt||0);
          if(l.userData.shAge>SUN_AGE*2){ l.userData.shAge=0; l.shadow.needsUpdate=true; } }
        if(l.shadow.needsUpdate) this.stats.pts++;
      }else if(l.castShadow) this.free(l);
    }
  }
};

/* 붙이고 떼는 것을 LIGHT 가 안다 — 새로 붙은 물체는 다음 그리기 전에 배역을 받고(`flush`),
   드리우던 것이 떨어지면 그림자를 다시 그린다. 모든 Object3D 의 add/remove 를 감싼다
   (Three 의 add 는 인자가 여럿이면 하나씩 다시 add 를 부르므로 하나만 받으면 된다). */
{
  const add0=THREE.Object3D.prototype.add, rem0=THREE.Object3D.prototype.remove;
  THREE.Object3D.prototype.add=function(o){
    const r=add0.apply(this,arguments);
    if(arguments.length===1&&o&&o!==this&&o.isObject3D) LIGHT.pending.push(o);
    return r;
  };
  THREE.Object3D.prototype.remove=function(o){
    const r=rem0.apply(this,arguments);
    if(arguments.length===1&&o&&o.isObject3D&&scene){
      let root=this; while(root.parent) root=root.parent;
      if(root===scene){ let cast=false; o.traverse(c=>{ if(c.castShadow) cast=true; }); if(cast) LIGHT.dirty(); }
    }
    return r;
  };
  /* 드리우는 인스턴스를 옮기면(캐기 · 벌목 · 다시 자람 · 베리 따기) 그 둘레 그림자를 다시 그린다.
     섬을 짓는 동안(`LIGHT.live` 거짓)은 수십만 번 불리므로 안 본다 */
  const sma=THREE.InstancedMesh.prototype.setMatrixAt;
  THREE.InstancedMesh.prototype.setMatrixAt=function(i,m){
    sma.call(this,i,m);
    if(LIGHT.live&&this.castShadow) LIGHT.dirtyAt(m.elements[12],m.elements[14],2);
  };
}
