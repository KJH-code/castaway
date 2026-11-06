/* tools/items-md-window.js — CASTAWAY
   게임을 띄워 표(RESOURCES · ITEMS · RECIPES · FLORA_PICK · SEA_PICK · 보급 상자)를 읽고 **docs/ITEMS.md**(자원과 아이템 전부)를 새로 쓴다.
   표를 고쳤으면 다시 돌릴 것 — 손으로 고치지 않는다(사용자 요청 2026-11-06 '자원과 아이템 전부를 담은 md 파일').

     desktop/node_modules/.bin/electron tools/items-md-window.js

   섬은 배율 1(?ws=1)로 짓는다 — 표만 읽으므로 섬 크기는 상관없다(빨리 끝난다). 바이옴 넓이는 기본 섬(4.25배)이 아니라 이 섬의 몫이다 */
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os'), fs = require('fs');
app.setPath('userData', path.join(os.tmpdir(), 'castaway-itemsmd'));
app.commandLine.appendSwitch('ignore-gpu-blocklist');
const ROOT = path.join(__dirname, '..');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 600, show: false, webPreferences: { backgroundThrottling: false } });
  const fail = setTimeout(() => { console.log('items-md: timeout'); app.exit(1); }, 600000);
  try {
    await win.loadFile(path.join(ROOT, 'island_world.html'), { search: '?ws=1&seed=CASTAWAY' });
    const md = await win.webContents.executeJavaScript(`(async()=>{
      const W=ms=>new Promise(r=>setTimeout(r,ms)); let t=0; while((typeof busy==='undefined'||busy)&&t++<6000) await W(100);
      const esc=s=>String(s==null?'':s).replace(/\\|/g,'／').replace(/\\n/g,' ');
      const L=[];
      const nItems=Object.keys(ITEMS).length;
      L.push('# CASTAWAY — 자원과 아이템 전부');
      L.push('');
      L.push('> 이 파일은 손으로 고치지 않는다 — 게임의 표에서 뽑아 쓴다: \`desktop/node_modules/.bin/electron tools/items-md-window.js\`');
      L.push('> 아이템 '+nItems+'종 · 제작법 '+RECIPES.length+'개 · 섬에 놓이는 자원 '+RESOURCES.length+'종 · 따는 것 '+Object.keys(FLORA_PICK).length+'종 · 바닷가 줍는 것 '+Object.keys(SEA_PICK).length+'종');
      L.push('');
      /* ── 자원 ── */
      L.push('## 1. 섬에 놓이는 자원(RESOURCES)');
      L.push('');
      L.push('캐는 도구 등급: 0 맨손 · 1 뗀석기 · 2 간석기 · 3 청동 · 4 철 · 5 강철(곡괭이 · 도끼). **지형 판 11**(층층 대지 섬)에서는 금속 광석이 대부분 **땅속 굴**(함몰 입구 · 바닷가 굴로 드는 굴 방)에 광맥으로 모여 있고, 땅 위에는 닿기 어려운 높은 데에만 조금 남는다.');
      L.push('');
      L.push('| 자원 | 키 | 쓰임 | 얻는 것 | 어떻게 | 도구 등급 |');
      L.push('|---|---|---|---|---|---|');
      for(const R of RESOURCES){ const H=HARVEST[R.k]||null, M=MINE[R.k]||null, C=CHOP[R.k]||null, D=M||C||H;
        const how=M?'캐기(곡괭이)':C?'베기(도끼)':H?'뜯기·줍기':'—';
        L.push('| '+esc(R.n)+' | '+R.k+' | '+esc(R.use)+' | '+(D&&ITEMS[D.item]?esc(ITEMS[D.item].n):'—')+' | '+how+' | '+(D&&D.tier!=null?D.tier:'—')+' |'); }
      L.push('');
      L.push('## 2. 따는 것 · 줍는 것');
      L.push('');
      L.push('식생(덩굴 · 대나무 · 열매 · 버섯 · 덤불 · 풀) · 땅속 굴(빛버섯 · 동굴어 · 구아노 · 거미줄 · 꼽등이) · 옛 신전과 보급 상자. 좌클릭을 누르고 있으면 막대가 차고 얻는다. **버섯은 곡괭이 · 도끼 · 칼을 든 채로도 캔다**(총만 빼고).');
      L.push('');
      L.push('| 이름 | 키 | 얻는 것 | 한 번에 | 다시 나는 데(게임 시간) |');
      L.push('|---|---|---|---|---|');
      for(const k in FLORA_PICK){ const D=FLORA_PICK[k]; const it=ITEMS[D.item];
        L.push('| '+esc(D.n)+' | '+k+' | '+(D.loot?'상자 속(아래 4장)':it?esc(it.n):D.item)+' | '+(D.cnt?D.cnt.join('~'):'1')+' | '+(D.once?'한 번만':D.regrow+' 시간')+' |'); }
      for(const k in SEA_PICK){ const D=SEA_PICK[k]; const it=ITEMS[D.item];
        L.push('| '+esc(D.n)+'(바닷가) | '+k+' | '+(it?esc(it.n):D.item)+' | '+(D.cnt||1)+' | '+(D.regrow?D.regrow+' 시간':'—')+' |'); }
      L.push('');
      /* ── 바이옴 ── */
      L.push('## 3. 바이옴(지대)');
      L.push('');
      const cnt=new Array(BIOME_INFO.length).fill(0); let land=0; for(let i=0;i<N*N;i++){ if(F.elev[i]>0){ cnt[F.biome[i]]++; land++; } }
      const pl=new Array(BIOME_INFO.length).fill(0); if(PLAT.on) for(const S of PLAT.list) pl[S.b]++;
      L.push('| 지대 | 뭍에서 차지하는 몫(시드 CASTAWAY · 배율 1) | 그 지대인 대지 수(지형 판 11) |');
      L.push('|---|---|---|');
      BIOME_INFO.map((b,i)=>[b,i]).filter(([b,i])=>cnt[i]>0||pl[i]>0).sort((a,b)=>cnt[b[1]]-cnt[a[1]]).forEach(([b,i])=>L.push('| '+b.n+' | '+(cnt[i]/Math.max(1,land)*100).toFixed(1)+'% | '+pl[i]+' |'));
      L.push('');
      /* ── 보급 상자 ── */
      if(typeof PL_LOOT!=='undefined'){
        L.push('## 4. 보급 상자(지형 판 11 — 닿기 어려운 데)');
        L.push('');
        L.push('높은 대지의 가장 깊은 자리 · 호수 섬 · 산 마루 · 땅속 깊은 방에 돌무더기와 함께 놓인 나무 상자. 닿기 어려울수록 등급이 높다. 망대(돌탑)에 오르면 둘레 2.6 km 의 상자가 지도에 적힌다. 상자마다 아래 꾸러미 가운데 하나가 들어 있다.');
        L.push('');
        ['보급 상자','튼튼한 보급 상자','귀한 보급 상자'].forEach((nm,ti)=>{ L.push('- **'+nm+'** — '+PL_LOOT[ti].map(B=>B.map(([id,n])=>(ITEMS[id]?ITEMS[id].n:id)+' '+n).join(' · ')).join(' / ')); });
        L.push('');
      }
      /* ── 아이템 ── */
      L.push('## 5. 아이템(ITEMS)');
      L.push('');
      const cat=T=>T.tool?(T.tool.gun?'총':T.tool.weapon?'무기':'도구'):T.ammo?'탄약':(T.wear||T.armor)?'입는 것':T.food?'먹을 것':T.water?'마실 것':T.heal?'약 · 붕대':T.fuel?'땔감':'재료 · 기타';
      const order=['도구','무기','총','탄약','입는 것','먹을 것','마실 것','약 · 붕대','땔감','재료 · 기타'];
      const groups={}; for(const id in ITEMS){ const T=ITEMS[id]; (groups[cat(T)]=groups[cat(T)]||[]).push(id); }
      for(const g of order){ const ids=groups[g]; if(!ids) continue;
        L.push('### '+g+' ('+ids.length+')');
        L.push('');
        L.push('| 이름 | id | 무게(kg) | 쓰임 | 얻는 법 |');
        L.push('|---|---|---|---|---|');
        for(const id of ids){ const T=ITEMS[id]; let ob=''; try{ ob=obtainOf(id).join(' · '); }catch(e){ ob='—'; }
          const extra=[]; if(T.food) extra.push('허기 '+T.food); if(T.water) extra.push('목마름 '+T.water); if(T.tool&&T.tool.dmg) extra.push('피해 '+T.tool.dmg); if(T.armor) extra.push('방어 '+T.armor); if(T.fuel) extra.push('땔감 '+T.fuel);
          L.push('| '+esc(T.n)+' | '+id+' | '+(T.kg!=null?T.kg:'')+' | '+esc(T.use||'')+(extra.length?' ('+extra.join(' · ')+')':'')+' | '+esc(ob||'—')+' |'); }
        L.push(''); }
      return L.join('\\n');
    })()`, true);
    fs.writeFileSync(path.join(ROOT, 'docs', 'ITEMS.md'), md + '\n');
    console.log('items-md: docs/ITEMS.md ' + md.length + ' chars');
  } catch (e) { console.log('items-md: ' + (e && e.message || e)); }
  clearTimeout(fail); app.exit(0);
});
