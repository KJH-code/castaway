/* 가고일 리그 — 뼈 가중치(GARG_SKIN)를 세고, 공용 구역을 다른 시험장에 그대로 옮긴다.

     node tools/garg-rig.mjs

   원본은 beta/gargoyle_arena.html 의 '가고일 뼈대 · 몸짓' 구역이다(표지
   `/* ==== 가고일 뼈대 · 몸짓 ====` ~ `/* ==== 가고일 뼈대 · 몸짓 끝 ==== *\/`).
   관절 자리(GARG_J)나 몸짓을 거기서 고친 뒤 이걸 돌리면
     ① GARG_J 를 읽어 가중치를 다시 세 그 구역의 GARG_SKIN 줄을 바꾸고
     ② 구역 통째로 battle · night · siege · trio · mixed 시험장에 옮긴다
        (구역이 이미 있으면 바꿔 끼우고, 없으면 `function patchWing(mat){` 바로 앞에 넣는다).
   모델(GLB_B64 · GLB_G)은 여섯 곳이 같다 — 다르면 멈춘다.

   가중치 셈 — 곧은 거리로는 맞닿은 무릎·팔꿈치가 서로 섞였다:
     1) 몸 세모(날개 aWing>0 를 뺀 것)로 1.2 cm 칸 부피를 채운다. 모델이 179 조각으로
        쪼개진 메시라 바깥에서 채워 들어가는 방식은 틈으로 새어 속이 비었다 — 칸 가운데를
        지나는 x·y·z 세 줄에 세모를 꿰어 회전수를 세고 둘 이상이 속이라 하면 속으로 친다.
        겉 칸도 한 칸 불려 더한다(조각 사이 틈 · 더듬이·발톱처럼 얇은 데).
     2) 뼈(머리→꼬리 선분)마다 칸 속을 따라 다익스트라로 거리를 잰다(26 이웃 · 0.84 m 까지).
     3) 정점마다 가장 가까운 뼈 둘을 1/d⁴ 로 섞는다(0.94 넘게 한쪽이면 한쪽만).
        뼈에서 정점으로 가는 쪽이 정점 법선과 어긋나면(뼈 반대편 겉) 거리에 1.6 배 벌점 —
        무릎 윗면이 위에 놓인 아래팔 뼈로 가지 않게.
     4) 날개 정점은 제 쪽 날개 뼈 하나(몫 1). 날개는 경첩 하나로 통째로 돈다.
        어깨 위 보라 덮개(aWing 0 · 바탕 그림 빛깔로 가린다)와 날개에 이어진 얇은 막도 날개로 친다.
   바탕 그림을 풀려고 크로미움을 띄운다 — 브라우저가 없다고 하면 CHROMIUM_PATH 를 줄 것. */
import {readFileSync, writeFileSync} from 'node:fs';
import {launch} from './pages.mjs';

const SRC = 'beta/gargoyle_arena.html';
const TARGETS = ['battle', 'night', 'siege', 'trio', 'mixed'].map(n => `beta/${n}_arena.html`);
const B0 = '/* ==== 가고일 뼈대 · 몸짓 ====', B1 = '/* ==== 가고일 뼈대 · 몸짓 끝 ==== */';

const findBlock = (txt, f) => {
  const a = txt.indexOf(B0), b = txt.indexOf(B1);
  if (a < 0 || b < 0) return null;
  const e = b + B1.length;
  return {a, e, text: txt.slice(a, e)};
};
const glbOf = (txt, name) => {                // 가고일 모델 — 원본은 GLB_B64, 나머지는 GLB_G(GLB_B64 는 애쉬스케일이다)
  const m = txt.match(new RegExp('^const ' + name + '="([^"]+)";?$', 'm'));
  if (!m) throw new Error(name + ' 줄이 없다');
  return m[1];
};

/* ── GLB ── */
const src = readFileSync(SRC, 'utf8');
const blk = findBlock(src);
if (!blk) throw new Error(SRC + ' 에 가고일 구역이 없다');
const b64 = glbOf(src, 'GLB_B64');
const buf = Buffer.from(b64, 'base64');
const jl = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jl).toString());
const bin = 20 + jl + 8;
const acc = i => {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
  const o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const n = {SCALAR: 1, VEC2: 2, VEC3: 3}[a.type] * a.count;
  const C = a.componentType === 5126 ? Float32Array : Uint32Array;
  return new C(buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + n * 4));
};
const pr = json.meshes[0].primitives[0];
const P = acc(pr.attributes.POSITION), NRM = acc(pr.attributes.NORMAL), Wg = acc(pr.attributes._WING), I = acc(pr.indices);
const N = P.length / 3;
const UV = acc(pr.attributes.TEXCOORD_0);
/* 정점마다 바탕 그림 빛깔 — JPEG 를 풀 곳이 브라우저뿐이라 크로미움을 띄운다(CHROMIUM_PATH 를 따른다) */
const texRGB = await (async () => {
  const im = json.images[0], bv = json.bufferViews[im.bufferView];
  const jpg = buf.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength).toString('base64');
  const br = await launch();
  try {
    const pg = await br.newPage();
    return await pg.evaluate(async ([b64, uv, mime]) => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const bmp = await createImageBitmap(new Blob([u8], {type: mime}));
      const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d');
      x.drawImage(bmp, 0, 0);
      const d = x.getImageData(0, 0, bmp.width, bmp.height).data, W = bmp.width, H = bmp.height;
      const out = new Array(uv.length / 2 * 3);
      for (let i = 0; i < uv.length / 2; i++) {
        const px = Math.min(W - 1, Math.floor(uv[i * 2] * W)), py = Math.min(H - 1, Math.floor(uv[i * 2 + 1] * H)), k = (py * W + px) * 4;
        out[i * 3] = d[k]; out[i * 3 + 1] = d[k + 1]; out[i * 3 + 2] = d[k + 2];
      }
      return out;
    }, [jpg, Array.from(UV), im.mimeType]);
  } finally { await br.close(); }
})();

/* ── 관절 표 — 구역 안의 GARG_J 를 그대로 읽는다 ── */
const jm = blk.text.match(/const GARG_J=(\[[\s\S]*?\n\]);/);
if (!jm) throw new Error('GARG_J 를 못 찾았다');
const J = new Function('return ' + jm[1])();
const JX = [];
for (const e of J) {
  JX.push(e);
  if (/L$/.test(e[0])) JX.push([e[0].slice(0, -1) + 'R', typeof e[1] === 'string' ? e[1].replace(/L$/, 'R') : e[1],
    [-e[2][0], e[2][1], e[2][2]], [-e[3][0], e[3][1], e[3][2]], e[4]]);
}

/* ── 1) 칸 부피 ── */
const VOX = 0.012, PAD = 4;
let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
for (let i = 0; i < N; i++) {
  x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]);
  y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]);
  z0 = Math.min(z0, P[i * 3 + 2]); z1 = Math.max(z1, P[i * 3 + 2]);
}
const ox = x0 - PAD * VOX, oy = y0 - PAD * VOX, oz = z0 - PAD * VOX;
const NX = Math.ceil((x1 - x0) / VOX) + 2 * PAD + 1, NY = Math.ceil((y1 - y0) / VOX) + 2 * PAD + 1, NZ = Math.ceil((z1 - z0) / VOX) + 2 * PAD + 1;
const NV = NX * NY * NZ, id = (a, b, c) => a + NX * (b + NY * c);
const isWing = new Uint8Array(N);
for (let i = 0; i < N; i++) isWing[i] = Wg[i] > 0.004 ? 1 : 0;
/* 날개 뿌리 덮개 — 어깨 위에 얹힌 보라 막인데 aWing 이 0 이라 몸으로 잡혔다. 날개를 펴면 어깨에
   보라 조각이 서 있었다. 그 밑에 어깨 겉이 따로 있어서 날개 뿌리로 붙여 같이 돌린다.
   보라: 파랑이 초록보다 15, 빨강이 초록보다 5 넘게 큰 것 · 어깨 위(y>1.0 · z<0.05 · |x|>0.05)만
   (혀·발톱도 보라라 자리로 거른다) */
let nCover = 0;
for (let i = 0; i < N; i++) {
  if (isWing[i]) continue;
  const r = texRGB[i * 3], g = texRGB[i * 3 + 1], b = texRGB[i * 3 + 2];
  if (b > g + 15 && r > g + 5 && P[i * 3 + 1] > 1.0 && P[i * 3 + 2] < 0.05 && Math.abs(P[i * 3]) > 0.05) { isWing[i] = 1; nCover++; }
}
const tris = [];
for (let t = 0; t < I.length; t += 3) {
  const A = I[t], B = I[t + 1], C = I[t + 2];
  if (isWing[A] + isWing[B] + isWing[C] < 2) tris.push(A, B, C);
}
// 겉 칸 — 겉도 속으로 친다(얇은 데가 빠지지 않게)
const surf = new Uint8Array(NV);
for (let t = 0; t < tris.length; t += 3) {
  const A = tris[t], B = tris[t + 1], C = tris[t + 2];
  const ax = P[A * 3], ay = P[A * 3 + 1], az = P[A * 3 + 2], bx = P[B * 3], by = P[B * 3 + 1], bz = P[B * 3 + 2], cx = P[C * 3], cy = P[C * 3 + 1], cz = P[C * 3 + 2];
  const L = Math.max(Math.hypot(bx - ax, by - ay, bz - az), Math.hypot(cx - ax, cy - ay, cz - az), Math.hypot(cx - bx, cy - by, cz - bz));
  const n = Math.max(1, Math.ceil(L / (VOX * 0.45)));
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
    const u = i / n, v = j / n, w = 1 - u - v;
    surf[id(Math.floor((ax * w + bx * u + cx * v - ox) / VOX), Math.floor((ay * w + by * u + cy * v - oy) / VOX), Math.floor((az * w + bz * u + cz * v - oz) / VOX))] = 1;
  }
}
// 속 — 세 축 회전수 투표
const vote = new Uint8Array(NV);
const dims = [NX, NY, NZ], org = [ox, oy, oz];
for (let ax = 0; ax < 3; ax++) {
  const u = (ax + 1) % 3, v = (ax + 2) % 3, NU = dims[u], NW = dims[v], NA = dims[ax];
  const lists = new Array(NU * NW);
  for (let t = 0; t < tris.length; t += 3) {
    const p = [tris[t], tris[t + 1], tris[t + 2]].map(i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
    const us = p.map(q => (q[u] - org[u]) / VOX - 0.5), vs = p.map(q => (q[v] - org[v]) / VOX - 0.5);
    const u0 = Math.max(0, Math.ceil(Math.min(...us))), u1 = Math.min(NU - 1, Math.floor(Math.max(...us)));
    const v0 = Math.max(0, Math.ceil(Math.min(...vs))), v1 = Math.min(NW - 1, Math.floor(Math.max(...vs)));
    if (u0 > u1 || v0 > v1) continue;
    const d1u = us[1] - us[0], d1v = vs[1] - vs[0], d2u = us[2] - us[0], d2v = vs[2] - vs[0];
    const den = d1u * d2v - d2u * d1v;
    if (Math.abs(den) < 1e-12) continue;
    const sgn = den > 0 ? 1 : -1;
    for (let cu = u0; cu <= u1; cu++) for (let cv = v0; cv <= v1; cv++) {
      const pu = cu - us[0], pv = cv - vs[0];
      const b1 = (pu * d2v - d2u * pv) / den, b2 = (d1u * pv - pu * d1v) / den;
      if (b1 < 0 || b2 < 0 || b1 + b2 > 1) continue;
      const a3 = p[0][ax] + (p[1][ax] - p[0][ax]) * b1 + (p[2][ax] - p[0][ax]) * b2;
      const k = cu + NU * cv;
      (lists[k] || (lists[k] = [])).push((a3 - org[ax]) / VOX - 0.5, sgn);
    }
  }
  for (let cu = 0; cu < NU; cu++) for (let cv = 0; cv < NW; cv++) {
    const L = lists[cu + NU * cv]; if (!L) continue;
    const ev = []; for (let i = 0; i < L.length; i += 2) ev.push([L[i], L[i + 1]]);
    ev.sort((x, y) => x[0] - y[0]);
    let w = 0, e = 0;
    for (let ca = 0; ca < NA; ca++) {
      while (e < ev.length && ev[e][0] <= ca) { w += ev[e][1]; e++; }
      if (w !== 0) { const c = [0, 0, 0]; c[ax] = ca; c[u] = cu; c[v] = cv; vote[id(c[0], c[1], c[2])]++; }
    }
  }
}
// 겉은 한 칸 불려 속에 더한다 — 조각 사이 틈과 얇은 데(더듬이·발톱)가 끊기지 않게
const thick = new Uint8Array(NV);
for (let c = 1; c < NZ - 1; c++) for (let b = 1; b < NY - 1; b++) for (let a = 1; a < NX - 1; a++) {
  const k = id(a, b, c);
  let f = surf[k];
  for (let dc = -1; dc <= 1 && !f; dc++) for (let db = -1; db <= 1 && !f; db++) for (let da = -1; da <= 1 && !f; da++)
    if (surf[k + da + NX * (db + NY * dc)]) f = 1;
  thick[k] = f;
}
/* 날개 막의 남은 뿌리 — aWing 이 0 이라 몸으로 분류됐지만 날개 정점과 세모로 이어진 얇은 막.
   날개를 펴면 어깨 위에 보라색 조각으로 남았다. 날개 정점에서 세모를 따라 번지되, 법선 앞뒤로
   0.6~3 cm 안에 속 칸(vote≥2)이 있으면(몸 겉) 멈춘다. */
const interior = k => vote[k] >= 2;
const thinAt = i => {
  const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], nx = NRM[i * 3], ny = NRM[i * 3 + 1], nz = NRM[i * 3 + 2];
  for (const sgn of [-1, 1]) for (let d = 0.006; d <= 0.03; d += 0.006) {
    const a = Math.floor((x + nx * d * sgn - ox) / VOX), b = Math.floor((y + ny * d * sgn - oy) / VOX), c = Math.floor((z + nz * d * sgn - oz) / VOX);
    if (interior(id(a, b, c))) return false;
  }
  return true;
};
{
  const adj = new Array(N);
  for (let t = 0; t < I.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
    if (a !== b) (adj[I[t + a]] || (adj[I[t + a]] = [])).push(I[t + b]);
  const Q = []; for (let i = 0; i < N; i++) if (isWing[i]) Q.push(i);
  let grown = 0;
  while (Q.length) {
    const i = Q.pop();
    for (const j of adj[i] || []) if (!isWing[j] && thinAt(j)) { isWing[j] = 1; grown++; Q.push(j); }
  }
  console.log(`  날개 막 뿌리로 넓힌 정점 ${grown}`);
}
const solid = new Uint8Array(NV);
let nSolid = 0;
for (let k = 0; k < NV; k++) if (vote[k] >= 2 || thick[k]) { solid[k] = 1; nSolid++; }

/* ── 2) 뼈마다 칸 속 거리 ── */
const body = [];
JX.forEach((e, i) => { if (!/^wing/.test(e[0]) && !(e[4] && e[4].noskin)) body.push(i); });
const dist = new Float64Array(NV), D = new Map();
const CAP = 1 << 23, hk = new Int32Array(CAP), hv = new Float64Array(CAP);
const OFF = [];
for (let dc = -1; dc <= 1; dc++) for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++)
  if (da || db || dc) OFF.push(da + NX * (db + NY * dc), Math.hypot(da, db, dc));
const MAXD = 70;
const outside = {};
for (const bi of body) {
  const [nm, , h, t] = JX[bi];
  dist.fill(Infinity);
  let hn = 0;
  const push = (k, v) => {
    if (hn >= CAP) throw new Error('큐가 넘쳤다');
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= v) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; }
    hk[i] = k; hv[i] = v;
  };
  const L = Math.hypot(t[0] - h[0], t[1] - h[1], t[2] - h[2]), n = Math.max(2, Math.ceil(L / (VOX * 0.3)));
  let out = 0;
  for (let s = 0; s <= n; s++) {
    const u = s / n;
    const k = id(Math.floor((h[0] + (t[0] - h[0]) * u - ox) / VOX), Math.floor((h[1] + (t[1] - h[1]) * u - oy) / VOX), Math.floor((h[2] + (t[2] - h[2]) * u - oz) / VOX));
    if (dist[k] === 0) continue;
    dist[k] = 0; push(k, 0); if (!solid[k]) out++;
  }
  if (out) outside[nm] = out;
  while (hn > 0) {
    const k = hk[0], dk = hv[0];
    hn--;
    if (hn > 0) {
      const lk = hk[hn], lv = hv[hn]; let i = 0;
      for (;;) { const l = i * 2 + 1; if (l >= hn) break; let m = l; if (l + 1 < hn && hv[l + 1] < hv[l]) m = l + 1; if (hv[m] >= lv) break; hk[i] = hk[m]; hv[i] = hv[m]; i = m; }
      hk[i] = lk; hv[i] = lv;
    }
    if (dk > dist[k]) continue;
    if (dk > MAXD) break;
    for (let o = 0; o < OFF.length; o += 2) {
      const kk = k + OFF[o];
      if (kk < 0 || kk >= NV || !solid[kk]) continue;
      const nd = dk + OFF[o + 1];
      if (nd < dist[kk]) { dist[kk] = nd; push(kk, nd); }
    }
  }
  D.set(bi, Float32Array.from(dist));
}

/* ── 3) 정점마다 ── */
const near = (i, b) => {
  const a = Math.floor((P[i * 3] - ox) / VOX), bb = Math.floor((P[i * 3 + 1] - oy) / VOX), c = Math.floor((P[i * 3 + 2] - oz) / VOX), d = D.get(b);
  let best = Infinity;
  for (let r = 0; r <= 3 && best === Infinity; r++)
    for (let dc = -r; dc <= r; dc++) for (let db = -r; db <= r; db++) for (let da = -r; da <= r; da++) {
      const k = id(a + da, bb + db, c + dc);
      if (d[k] < Infinity) best = Math.min(best, d[k] + Math.hypot(da, db, dc));
    }
  return best;
};
const facing = (i, b) => {                     // 뼈에서 정점으로 가는 쪽이 법선과 같은가
  const [, , h, t] = JX[b], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
  const dx = t[0] - h[0], dy = t[1] - h[1], dz = t[2] - h[2];
  const u = Math.max(0, Math.min(1, ((x - h[0]) * dx + (y - h[1]) * dy + (z - h[2]) * dz) / (dx * dx + dy * dy + dz * dz)));
  const vx = x - (h[0] + dx * u), vy = y - (h[1] + dy * u), vz = z - (h[2] + dz * u);
  return NRM[i * 3] * vx + NRM[i * 3 + 1] * vy + NRM[i * 3 + 2] * vz > 0;
};
const nameIx = n => JX.findIndex(e => e[0] === n);
const skin = Buffer.alloc(N * 3);
let lost = 0;
const cnt = {};
for (let i = 0; i < N; i++) {
  let i0, i1, w;
  if (isWing[i]) { i0 = i1 = nameIx(P[i * 3] >= 0 ? 'wingL' : 'wingR'); w = 1; }
  else {
    let b1 = -1, d1 = Infinity, b2 = -1, d2 = Infinity;
    for (const b of body) {
      let d = near(i, b);
      if (!facing(i, b)) d *= 1.6;
      if (d < d1) { b2 = b1; d2 = d1; b1 = b; d1 = d; } else if (d < d2) { b2 = b; d2 = d; }
    }
    if (b1 < 0 || d1 === Infinity) { lost++; b1 = b2 = 0; d1 = 1; d2 = Infinity; }
    const q1 = 1 / Math.pow(Math.max(d1, 0.5), 4), q2 = d2 < Infinity ? 1 / Math.pow(Math.max(d2, 0.5), 4) : 0;
    w = q1 / (q1 + q2); if (w > 0.94) w = 1;
    i0 = b1; i1 = b2 >= 0 ? b2 : b1;
  }
  skin[i * 3] = i0; skin[i * 3 + 1] = i1; skin[i * 3 + 2] = Math.round(w * 255);
  cnt[JX[i0][0]] = (cnt[JX[i0][0]] || 0) + 1;
}
const skinB64 = skin.toString('base64');
console.log(`가고일 리그 — 정점 ${N} · 뼈 ${JX.length} · 칸 ${NX}×${NY}×${NZ} (속 ${nSolid}) · 날개 뿌리 덮개 ${nCover}` +
  (lost ? ` · 뼈를 못 찾은 정점 ${lost}` : '') +
  (Object.keys(outside).length ? ` · 몸 밖으로 나간 뼈 칸 ${JSON.stringify(outside)}` : ''));
console.log('  뼈마다 정점: ' + Object.entries(cnt).map(([k, v]) => k + ' ' + v).join(' · '));

/* ── 쓰기 ── */
const newBlk = blk.text.replace(/^const GARG_SKIN="[^"]*";/m, `const GARG_SKIN="${skinB64}";`);
if (newBlk === blk.text && !blk.text.includes(skinB64)) throw new Error('GARG_SKIN 줄을 못 찾았다');
writeFileSync(SRC, src.slice(0, blk.a) + newBlk + src.slice(blk.e));
console.log(`  ${SRC} — 가중치 ${skinB64.length.toLocaleString()} 자`);
for (const f of TARGETS) {
  const t = readFileSync(f, 'utf8');
  if (glbOf(t, 'GLB_G') !== b64) throw new Error(f + ' 의 가고일 모델이 원본과 다르다 — 가중치가 안 맞는다');
  const b = findBlock(t);
  let o;
  if (b) o = t.slice(0, b.a) + newBlk + t.slice(b.e);
  else {
    const k = t.indexOf('function patchWing(mat){');
    if (k < 0) throw new Error(f + ' 에 넣을 자리(function patchWing)가 없다');
    o = t.slice(0, k) + newBlk + '\n' + t.slice(k);
  }
  writeFileSync(f, o);
  console.log(`  ${f} — 구역 ${b ? '바꿔 끼움' : '새로 넣음'}`);
}
