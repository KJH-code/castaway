/* cloud_arena.html 을 island_world.html 에서 다시 만든다.
   본편의 하늘·달·구름·날씨·비 구역을 **줄 번호가 아니라 표지로 찾아** 통째로
   베끼고(줄 번호로 잡았다가 본편에 스무 줄 끼워 넣은 뒤 잘린 파일이 나왔다),
   시험장 손잡이 다섯만 낸다. 껍데기(조작판·조종·무대)는 tools/cloud-arena.tpl 이다.
   본편 구름 코드를 고쳤으면 이걸 다시 돌릴 것:  node tools/mk-cloud-arena.mjs */
import {readFileSync, writeFileSync} from 'node:fs';
const src = readFileSync('island_world.html', 'utf8').split('\n');
const s = src.findIndex(l => l.includes('하늘 · 광원 · 시간'));
const u = src.findIndex((l, i) => i > s && l.startsWith('function updateSky()'));
const e = src.findIndex((l, i) => i > u && l === '}');
if (s < 0 || u < 0 || e < 0) throw new Error('하늘 구역을 못 찾았다');
let blk = src.slice(s, e + 1).join('\n');

const rep = (a, b) => {
  if (!blk.includes(a)) throw new Error('못 찾은 자리: ' + a.slice(0, 50));
  blk = blk.replace(a, b);
};
rep('  WEA.cover=c;',
    '  if(COVER!=null) c=COVER;            // 시험장: 구름양 손으로 잡기\n  WEA.cover=c;');
rep('  WEA.mistT=clamp((mn-0.55)/0.32,0,1)*hw*clr*low;',
    '  WEA.mistT=clamp((mn-0.55)/0.32,0,1)*hw*clr*low;\n'
  + '  if(MIST!=null) WEA.mistT=MIST;      // 시험장: 안개 손으로 잡기');
rep('    want[k]=Math.round(K.max*Math.pow(b,0.6));',
    '    want[k]=(MANUAL[k]!=null)?MANUAL[k]      // 시험장: 갈래마다 손으로 못수 지정\n'
  + '           :Math.round(K.max*Math.pow(b,0.6));');
rep('    c.vis=clamp(c.vis+(on?1:-1)*dt/25,0,1);',
    '    c.vis=clamp(c.vis+(on?1:-1)*dt/FADE,0,1);   // 시험장: 여닫는 시간 조절');
rep('    c.m.material.opacity=c.op*cloudFade*ease*far;',
    '    c.m.material.opacity=c.op*OPMUL*cloudFade*ease*far;  // 시험장: 짙기 배율');

const tpl = readFileSync('tools/cloud-arena.tpl', 'utf8');
if (!tpl.includes('/*@SKY@*/')) throw new Error('틀에 /*@SKY@*/ 자리가 없다');
writeFileSync('cloud_arena.html', tpl.replace('/*@SKY@*/', blk));
console.log(`cloud_arena.html — 하늘 구역 ${e - s + 1}줄 옮김`);
