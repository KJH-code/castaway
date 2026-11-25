/* tools/fbx.mjs — FBX 바이너리(7400 · Meshy 내보내기)에서 정점 · 세모를 읽는다(tools/azure/fbx2obj.py 를 옮긴 것 — uv 가 없어도 된다)
   readFBX(경로) → {P: Float64Array(정점×3), I: Uint32Array(세모×3), up, front} — 다각형은 부채꼴로 세모 낸다 */
import fs from 'fs';
import zlib from 'zlib';

export function readFBX(path) {
  const f = fs.readFileSync(path), D = {}, G = {};
  const rd = o => {
    const end = f.readUInt32LE(o), n = f.readUInt32LE(o + 4), pl = f.readUInt32LE(o + 8); o += 12;
    const nl = f[o], name = f.toString('latin1', o + 1, o + 1 + nl); o += 1 + nl;
    const props = []; let p = o;
    for (let k = 0; k < n; k++) {
      const t = String.fromCharCode(f[p]); p++;
      if ('YCIFDL'.includes(t)) {
        const sz = { Y: 2, C: 1, I: 4, F: 4, D: 8, L: 8 }[t];
        props.push(t === 'I' ? f.readInt32LE(p) : t === 'D' ? f.readDoubleLE(p) : t === 'F' ? f.readFloatLE(p) : null); p += sz;
      } else if (t === 'S' || t === 'R') { const l = f.readUInt32LE(p); props.push(f.toString('latin1', p + 4, p + 4 + l)); p += 4 + l; }
      else {
        const al = f.readUInt32LE(p), enc = f.readUInt32LE(p + 4), cl = f.readUInt32LE(p + 8);
        let raw = f.subarray(p + 12, p + 12 + cl); p += 12 + cl;
        if (enc) raw = zlib.inflateSync(raw);
        const b = Buffer.from(raw), ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
        props.push({ d: Float64Array, f: Float32Array, i: Int32Array, l: BigInt64Array, b: Uint8Array }[t] ? new ({ d: Float64Array, f: Float32Array, i: Int32Array, l: BigInt64Array, b: Uint8Array }[t])(ab) : null);
        if (props[props.length - 1] && props[props.length - 1].length !== al) throw new Error('FBX 배열 길이가 어긋났다');
      }
    }
    return { end, name, props, ch: o + pl };
  };
  const walk = (o, path) => {
    for (;;) {
      const { end, name, props, ch } = rd(o);
      if (end === 0) return;
      const k = path + '/' + name;
      if (name === 'Vertices' || name === 'PolygonVertexIndex') (D[k] = D[k] || []).push(props[0]);
      if (name === 'P' && path.includes('GlobalSettings') && typeof props[0] === 'string' && /Axis/.test(props[0])) G[props[0]] = props[4];
      if (ch < end) walk(ch, k);
      o = end;
    }
  };
  walk(27, '');
  const Vs = D['/Objects/Geometry/Vertices'], PVs = D['/Objects/Geometry/PolygonVertexIndex'];
  if (!Vs || !PVs) throw new Error('FBX 에 Geometry 가 없다');
  const P = [], I = [];
  for (let g = 0; g < Vs.length; g++) {               // 메시가 여럿이면 이어 붙인다
    const base = P.length / 3, V = Vs[g], PV = PVs[g];
    for (const v of V) P.push(v);
    let poly = [];
    for (const raw of PV) {
      const last = raw < 0, v = last ? -raw - 1 : raw; poly.push(base + v);
      if (last) { for (let k = 1; k + 1 < poly.length; k++) I.push(poly[0], poly[k], poly[k + 1]); poly = []; }
    }
  }
  return { P: Float64Array.from(P), I: Uint32Array.from(I), up: G.UpAxis ?? 1, upSign: G.UpAxisSign ?? 1, front: G.FrontAxis ?? 2, frontSign: G.FrontAxisSign ?? 1 };
}
