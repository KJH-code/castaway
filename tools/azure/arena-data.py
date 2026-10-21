# 애저 아포칼립스 GLB → 시험장(beta/azure_arena.html)에 내장할 자료.
#   python3 tools/azure/arena-data.py [presets/models/azure_apocalypse.glb] [beta/azure_arena.html]
# 정점은 줄여 담는다 — 자리 u16(몸 상자 안 · 0.05 mm) · 법선 i8 · uv u16 · 뼈 번호·몫 u8 · 세모 u32.
# 그림은 2048 → 1536 JPEG 85(바탕 · 발광). 11.3 MB GLB 가 base64 로 약 9 MB.
# 시험장의 `const AZ_META=` · `const AZ_B64=` 두 줄을 통째로 갈아 끼운다(없으면 아무것도 안 한다).
import sys, json, struct, io, base64, re
import numpy as np
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else 'presets/models/azure_apocalypse.glb'
dst = sys.argv[2] if len(sys.argv) > 2 else 'beta/azure_arena.html'
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
J = json.loads(b[20:20 + jl])
bin0 = 20 + jl + 8
bv = J['bufferViews']


def view(i):
    v = bv[i]
    o = bin0 + v.get('byteOffset', 0)
    return b[o:o + v['byteLength']]


A = J['accessors']
pr = J['meshes'][0]['primitives'][0]
at = pr['attributes']


def acc(i, dt, n):
    return np.frombuffer(view(A[i]['bufferView']), dtype=dt).reshape(-1, n)


pos = acc(at['POSITION'], np.float32, 3)
nrm = acc(at['NORMAL'], np.float32, 3)
uv = acc(at['TEXCOORD_0'], np.float32, 2)
ji = acc(at['JOINTS_0'], np.uint8, 4)
jw = acc(at['WEIGHTS_0'], np.uint8, 4)
idx = np.frombuffer(view(A[pr['indices']]['bufferView']), dtype=np.uint32)
ibm = np.frombuffer(view(A[J['skins'][0]['inverseBindMatrices']]['bufferView']), dtype=np.float32)

lo, hi = pos.min(0), pos.max(0)
qp = np.round((pos - lo) / (hi - lo) * 65535).astype('<u2')
nn = nrm / np.maximum(1e-9, np.linalg.norm(nrm, axis=1, keepdims=True))
qn = np.clip(np.round(nn * 127), -127, 127).astype('i1')
qu = np.round(np.clip(uv, 0, 1) * 65535).astype('<u2')


def jpg(i):
    im = Image.open(io.BytesIO(view(i))).convert('RGB').resize((1536, 1536), Image.LANCZOS)
    o = io.BytesIO()
    im.save(o, 'JPEG', quality=85)
    return o.getvalue()


tex = J['textures']
mat = J['materials'][0]
alb = jpg(J['images'][tex[mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]['bufferView'])
emi = jpg(J['images'][tex[mat['emissiveTexture']['index']]['source']]['bufferView'])

out = bytearray()
meta = {}


def put(k, arr, n=None):
    while len(out) % 4:
        out.append(0)
    raw = arr.tobytes() if hasattr(arr, 'tobytes') else bytes(arr)
    meta[k] = [len(out), int(n if n is not None else arr.size)]
    out.extend(raw)


put('idx', idx.astype('<u4'))
put('ibm', ibm.astype('<f4'))
put('pos', qp)
put('uv', qu)
put('nrm', qn)
put('ji', ji.astype('u1'))
put('jw', jw.astype('u1'))
put('alb', alb, len(alb))
put('emi', emi, len(emi))
meta['lo'] = [round(float(x), 6) for x in lo]
meta['hi'] = [round(float(x), 6) for x in hi]
meta['nV'] = int(pos.shape[0])
# 뼈 — 이름 · 부모 · 쉼 자리(부모 기준) · 머리/꼬리(모델 좌표, GLB extras)
nodes = J['nodes']
joints = J['skins'][0]['joints']
par = {}
for i, n in enumerate(nodes):
    for c in n.get('children', []):
        par[c] = i
meta['bones'] = [{'n': nodes[j]['name'], 'p': (joints.index(par[j]) if par.get(j) in joints else -1),
                  't': [round(float(x), 6) for x in nodes[j].get('translation', [0, 0, 0])]} for j in joints]
meta['ht'] = J['extras']['bones']

line_m = 'const AZ_META=' + json.dumps(meta, separators=(',', ':')) + ';'
line_b = 'const AZ_B64="' + base64.b64encode(bytes(out)).decode() + '";'
print('bytes', len(out), 'b64', len(line_b), 'alb', len(alb), 'emi', len(emi))

html = open(dst, encoding='utf-8').read()
lines = html.split('\n')
hit = 0
for i, L in enumerate(lines):
    if L.startswith('const AZ_META='):
        lines[i] = line_m
        hit += 1
    elif L.startswith('const AZ_B64='):
        lines[i] = line_b
        hit += 1
if hit != 2:
    sys.exit('시험장에 AZ_META · AZ_B64 줄이 없다(' + str(hit) + ')')
open(dst, 'w', encoding='utf-8').write('\n'.join(lines))
print('wrote', dst)
