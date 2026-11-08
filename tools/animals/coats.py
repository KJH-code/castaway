# tools/animals/coats.py — 종 · 품종마다 털빛(사진에서 잰 빛깔) · 결(사진에서 오린 잔무늬) → engine/js/data-animal-coats.js
#
#   env/py/bin/python -I tools/animals/coats.py
#
# 사진은 textures/organics/raw/<짐승>/<종>/NN_crop.jpg(가운데를 자른 256 — 레포에 안 담는다 · 출처와 허락은 docs/notes/animal-credits.md).
# · 빛깔 — 사진마다 고른 네모(자른 사진의 0~1 자리)의 가운데값. 그 사진 하나가 그 종의 갈래 하나다(같은 종도 마리마다 빛깔이 다르다).
#   사진이 없거나 못 쓰면(사람 · 울타리 · 흰 변이 개체) 아는 빛깔로 갈래를 둔다(src 없음).
# · 무늬 — 종의 생김새(얼룩 · 띠 · 흰 얼굴 · 점 · 줄 · 등과 배의 빛깔 차이)는 SPEC 의 pat 이 정하고, 칠하는 일은 게임이 한다(97-animals.js aniPaint —
#   메시의 뼈 무게로 머리 · 다리 · 꼬리 · 배 · 등을 갈라 그 자리에 칠한다).
# · 결 — 짐승마다 결이 좋은 사진에서 128 네모를 오려 회색으로 · 큰 물결은 빼고(고주파만) · 이음매 없이(가장자리를 거울로 섞음).
import json, base64, io, os, sys, numpy as np
from PIL import Image, ImageFilter
RAW = 'textures/organics/raw'

def med(path, box):
    im = Image.open(path).convert('RGB'); W, H = im.size
    a = np.asarray(im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H))), np.float64).reshape(-1, 3)
    return '%02x%02x%02x' % tuple(np.clip(np.median(a, 0), 0, 255).astype(int))

def natural(hexc, an, sid):
    """그늘 · 물빛이 비친 푸른 · 보랏빛 낀 털빛을 무채색 쪽으로 — 털에는 그런 빛이 없다(파란 상어 · 개구리 · 도마뱀 · 꿩은 그대로)"""
    if an in ('frog', 'lizard', 'pheasant') or sid == 'glauca': return hexc
    r, g, b = (int(hexc[i:i + 2], 16) for i in (0, 2, 4))
    if b > r or (b > g and an != 'shark'):
        m = (r + g + b) / 3; k = 0.85 if an != 'shark' else 0.6
        r, g, b = (m + (x - m) * (1 - k) for x in (r, g, b)); r += 4                     # 살짝 따뜻하게
    return '%02x%02x%02x' % tuple(int(max(0, min(255, x))) for x in (r, g, b))

def tile(path, box, n=128):
    """결 — 회색 · 높은 주파수만 · 이음매 없이. 가운데 128 = 평균 밝기"""
    im = Image.open(path).convert('L'); W, H = im.size
    c = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H))).resize((n, n), Image.LANCZOS)
    a = np.asarray(c, np.float64); lo = np.asarray(c.filter(ImageFilter.GaussianBlur(n / 10)), np.float64)
    d = a - lo; d = d / (d.std() + 1e-6) * 30
    # 이음매 — 가로 · 세로로 반 칸 민 것과 가장자리 가까이에서 섞는다
    t = np.linspace(0, 1, n); w = np.minimum(t, 1 - t) * 2; w = np.clip(w * 3, 0, 1)
    sx = np.roll(d, n // 2, 1); d = d * w[None, :] + sx * (1 - w[None, :])
    sy = np.roll(d, n // 2, 0); d = d * w[:, None] + sy * (1 - w[:, None])
    out = Image.fromarray(np.clip(d + 128, 0, 255).astype(np.uint8))
    b = io.BytesIO(); out.save(b, 'JPEG', quality=80); return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

# ── 종 표 ─────────────────────────────────────────────────────────────────────
# id: [이름, 배율, 바이옴들, 무늬, 기본 빛깔 {b 몸 · a 둘째(배 · 얼룩 · 띠) · d 등/짙은 데 · f 얼굴 · l 다리 끝 · x 뿔/부리/지느러미 끝}, 갈래[(사진, b 네모, a 네모)]]
# 바이옴 이름은 00-core.js 의 B — MEADOW SCRUB BROADLEAF CONIFER DUNE BEACH MARSH ROCK SCREE RIVER FUMAROLE BAMBOO SHELF DEEP
# 무늬: solid · patches(큰 얼룩) · belted(가운데 흰 띠) · whiteface(흰 얼굴 · 배 · 다리 끝) · brindle(칡 줄) · spots(등의 흰 점 줄) · rump(흰 엉덩이)
#       grizzle(희끗한 털) · stripes(새끼 멧돼지 세로줄) · countershade(등 짙고 배 흼) · tiger(세로 줄) · tipfin(지느러미 끝) · blotch(얼룩점) · bands(가로 띠)
#       mask(눈 가면) · reticulate(그물 무늬) · lines(등줄) · scaled(비늘 꼴 깃) · bird_*(꿩 갈래)
SPECIES = {
 'cow': {
  'hanwoo':    ['황소(한우)', 0.95, 'MEADOW BROADLEAF', 'solid',     dict(b='c08a4a', a='d8b080', d='9a6a34', f='b07a40', l='a07040', x='e0d6bc'), [('user:yellow', None, None)]],
  'chikso':    ['칡소', 0.95, 'BROADLEAF MEADOW', 'brindle',  dict(b='6a3a22', a='2a1a12', d='4a2818', f='5a3220', l='3a2216', x='e0d6bc'), [('user:brown', None, None)]],
  'eolruk':    ['얼룩소', 1.0, 'MEADOW', 'patches',           dict(b='e6dfd2', a='7a4a2a', d='e0d8c8', f='e6dfd2', l='e6dfd2', x='e0d6bc'), [('user:spotted', None, None)]],
  'holstein':  ['홀스타인', 1.05, 'MEADOW', 'patches',          dict(b='ece8e0', a='1c1a1a', d='e8e2d8', f='ece8e0', l='ece8e0', x='d8d0c0'),
                [(None, None, None), ('holstein_friesian_cattle/02', (0.75, 0.55, 0.95, 0.9), (0.05, 0.25, 0.3, 0.55))]],
  'hereford':  ['헤리퍼드', 1.0, 'MEADOW BROADLEAF', 'whiteface', dict(b='8a3a1e', a='ece6da', d='7a3018', f='ece6da', l='ece6da', x='d8ccb0'),
                [('hereford_cattle/02', (0.25, 0.35, 0.5, 0.55), (0.75, 0.15, 0.9, 0.35)), ('hereford_cattle/03', (0.3, 0.35, 0.55, 0.55), None)]],
  'angus':     ['앵거스', 1.0, 'MEADOW', 'solid',              dict(b='1a1818', a='242020', d='141212', f='1a1818', l='1a1818', x='1a1818'),
                [('aberdeen_angus/02', (0.3, 0.5, 0.55, 0.65), None), ('aberdeen_angus/03', (0.35, 0.3, 0.85, 0.8), None)]],
  'highland':  ['하일랜드', 0.88, 'ROCK CONIFER SCREE', 'solid', dict(b='a0522a', a='b86a3a', d='8a4220', f='a0522a', l='7a3a1a', x='e8dcc0'),
                [('highland_cattle/01', (0.35, 0.3, 0.7, 0.55), None), ('highland_cattle/02', (0.25, 0.35, 0.55, 0.6), None)]],
  'jersey':    ['저지', 0.85, 'MEADOW', 'solid',               dict(b='b0784a', a='d8b890', d='8a5a34', f='5a3a24', l='4a3020', x='d8ccb0'),
                [('jersey_cattle/03', (0.75, 0.75, 0.95, 0.95), None), ('jersey_cattle/02', (0.65, 0.02, 0.95, 0.25), None)]],
  'brahman':   ['브라만', 1.05, 'SCRUB DUNE', 'solid',          dict(b='c8c4bc', a='e0dcd4', d='8a8884', f='b8b4ac', l='a8a49c', x='2a2624'),
                [('brahman_cattle/02', (0.1, 0.2, 0.7, 0.6), None), ('brahman_cattle/03', (0.05, 0.05, 0.5, 0.4), None)]],
  'galloway':  ['벨티드 갤러웨이', 0.9, 'MARSH MEADOW', 'belted', dict(b='1c1a1a', a='ece8e0', d='141212', f='1c1a1a', l='1c1a1a', x='1c1a1a'),
                [('belted_galloway/01', (0.42, 0.55, 0.55, 0.7), None), ('belted_galloway/03', (0.55, 0.4, 0.75, 0.6), None)]],
  'longhorn':  ['텍사스 롱혼', 1.0, 'SCRUB', 'patches',         dict(b='8a5030', a='e4dccc', d='6a3a20', f='e4dccc', l='8a5030', x='e8dcc0'),
                [('texas_longhorn/02', (0.3, 0.65, 0.55, 0.85), None), ('texas_longhorn/03', (0.75, 0.55, 0.95, 0.8), None)]],
 },
 'hare': {
  'europaeus':   ['멧토끼(유럽)', 1.0, 'MEADOW', 'countershade',   dict(b='9a7048', a='e8e0d0', d='7a5434', f='a07a50', l='b08a60', x='181410'),
                  [('lepus_europaeus/01', (0.2, 0.3, 0.6, 0.7), None), ('lepus_europaeus/02', (0.3, 0.35, 0.6, 0.6), None)]],
  'timidus':     ['산토끼(눈토끼)', 0.95, 'ROCK SCREE', 'countershade', dict(b='7a6a5a', a='e8e4dc', d='5a4c40', f='7a6a5a', l='a89a8a', x='181410'),
                  [('lepus_timidus/01', (0.1, 0.4, 0.6, 0.8), None), ('lepus_timidus/02', (0.35, 0.55, 0.55, 0.75), None)]],
  'americanus':  ['눈신토끼', 1.0, 'CONIFER', 'countershade',     dict(b='8a6a48', a='ece6da', d='6a4e34', f='8a6a48', l='e0d8c8', x='3a2e24'),
                  [('lepus_americanus/02', (0.1, 0.4, 0.5, 0.7), None), ('lepus_americanus/01', (0.05, 0.3, 0.4, 0.7), None)]],
  'californicus': ['검은꼬리 잭토끼', 1.05, 'SCRUB DUNE', 'countershade', dict(b='9a8a6a', a='e8e0cc', d='6a5a44', f='9a8a6a', l='b0a080', x='141210'),
                  [('lepus_californicus/03', (0.1, 0.45, 0.6, 0.8), None)]],
  'coreanus':    ['한국 멧토끼', 1.0, 'BROADLEAF BAMBOO', 'countershade', dict(b='9a7a52', a='e0d6c0', d='7a5a3a', f='9a7a52', l='b09068', x='241a12'), [(None, None, None)]],
  'capensis':    ['케이프토끼', 0.9, 'DUNE BEACH', 'countershade',  dict(b='b8a07a', a='ece4d4', d='8a7656', f='b8a07a', l='c8b494', x='241a12'),
                  [('lepus_capensis/01', (0.2, 0.4, 0.55, 0.75), None), ('lepus_capensis/03', (0.1, 0.2, 0.6, 0.5), None)]],
  'arcticus':    ['북극토끼', 1.15, 'ROCK', 'solid',               dict(b='eceae4', a='f4f2ec', d='dcd8d0', f='eceae4', l='eceae4', x='141210'),
                  [('lepus_arcticus/02', (0.1, 0.2, 0.9, 0.9), None), ('lepus_arcticus/01', (0.1, 0.5, 0.6, 0.9), None)]],
 },
 'deer': {
  'elaphus':     ['붉은사슴', 1.0, 'CONIFER BROADLEAF', 'rump',      dict(b='8a5a36', a='d8c098', d='6a4228', f='7a5030', l='5a3a24', x='c8b08a'),
                  [(None, None, None), ('cervus_elaphus/03', (0.3, 0.6, 0.6, 0.9), None)]],
  'dama':        ['다마사슴', 0.8, 'BROADLEAF', 'spots',            dict(b='b07a45', a='f0e8d8', d='8a5a30', f='a87040', l='b07a45', x='d8c8a8'),
                  [(None, None, None)]],
  'nippon':      ['꽃사슴', 0.75, 'BAMBOO BROADLEAF', 'spots',      dict(b='9a5a30', a='ece2d0', d='6a3e22', f='8a5430', l='7a4a2a', x='d0bc98'),
                  [(None, None, None), ('cervus_nippon/02', (0.2, 0.3, 0.6, 0.7), None)]],
  'capreolus':   ['노루', 0.6, 'MEADOW BROADLEAF', 'rump',          dict(b='a0603a', a='ece4d4', d='804a2c', f='6a4630', l='90583a', x='c8b08a'),
                  [('capreolus_capreolus/01', (0.25, 0.45, 0.5, 0.65), None), (None, None, None)]],
  'hydropotes':  ['고라니', 0.55, 'MARSH RIVER', 'countershade',     dict(b='a88a5a', a='d8c8a8', d='8a6a42', f='9a7a50', l='8a6a42', x='e8e0d0'),
                  [('hydropotes_inermis/03', (0.4, 0.45, 0.6, 0.65), None), ('hydropotes_inermis/01', (0.3, 0.4, 0.8, 0.8), None)]],
  'axis':        ['액시스사슴', 0.85, 'SCRUB', 'spots',              dict(b='b06a38', a='f4ece0', d='8a4a24', f='9a5a30', l='a06a40', x='d8c8a8'),
                  [(None, None, None)]],
  'virginianus': ['흰꼬리사슴', 0.9, 'BROADLEAF MEADOW', 'countershade', dict(b='9a7450', a='ece6da', d='7a5638', f='8a6444', l='8a6444', x='d0bc98'),
                  [('odocoileus_virginianus/03', (0.02, 0.1, 0.3, 0.5), None), (None, None, None)]],
 },
 'boar': {
  'scrofa':      ['멧돼지', 1.0, 'BROADLEAF CONIFER', 'grizzle',    dict(b='4a3a2c', a='6a5a48', d='2a2018', f='3a2e24', l='2a2018', x='e8e0cc'),
                  [('sus_scrofa/01', (0.3, 0.4, 0.9, 0.9), None), ('sus_scrofa/02', (0.4, 0.2, 0.8, 0.6), None), (None, None, None)]],
  'piglet':      ['멧돼지 새끼', 0.42, 'BROADLEAF CONIFER', 'stripes', dict(b='8a6a44', a='d8c098', d='5a4028', f='8a6a44', l='5a4028', x='e8e0cc'), [(None, None, None)]],
  'barbatus':    ['수염멧돼지', 1.05, 'BAMBOO', 'grizzle',          dict(b='9a8a74', a='e8e0d0', d='6a5a48', f='e0d8c8', l='5a4a3a', x='e8e0cc'),
                  [('sus_barbatus/02', (0.1, 0.3, 0.9, 0.9), None), ('sus_barbatus/03', (0.3, 0.3, 0.7, 0.7), None)]],
  'potamochoerus': ['붉은강멧돼지', 0.8, 'MARSH RIVER', 'whiteface', dict(b='c0602a', a='ece4d8', d='a04a20', f='1a1614', l='1a1614', x='ece4d8'),
                  [('potamochoerus_porcus/02', (0.55, 0.45, 0.85, 0.75), None), ('potamochoerus_porcus/01', (0.0, 0.3, 0.25, 0.6), None)]],
  'phacochoerus': ['혹멧돼지', 0.85, 'SCRUB DUNE', 'solid',         dict(b='6a6058', a='8a8078', d='4a423c', f='5a524a', l='4a423c', x='f0e8d0'),
                  [('phacochoerus_africanus/03', (0.2, 0.4, 0.6, 0.7), None), ('phacochoerus_africanus/02', (0.4, 0.3, 0.7, 0.5), None)]],
 },
 'pheasant': {
  'colchicus_m': ['장끼(꿩 수컷)', 1.0, 'MEADOW SCRUB', 'bird_colchicus', dict(b='a85a28', a='1a4a3e', d='7a4220', f='c02a20', l='8a8478', x='f0ece4'),
                  [('phasianus_colchicus/02', (0.3, 0.75, 0.6, 0.95), None), ('phasianus_colchicus/03', None, (0.3, 0.1, 0.8, 0.6))]],
  'colchicus_f': ['까투리(꿩 암컷)', 0.85, 'MEADOW SCRUB', 'bird_hen',     dict(b='9c7a52', a='6a4e34', d='7a5a3a', f='a88a62', l='8a8478', x='c8b88a'), [(None, None, None)]],
  'pictus_m':    ['금계 수컷', 0.85, 'BAMBOO', 'bird_golden',            dict(b='c02418', a='f0c020', d='e08a20', f='f0c020', l='c8a870', x='2a4a8a'), [(None, None, None)]],
  'pictus_f':    ['금계 암컷', 0.75, 'BAMBOO', 'bird_hen',               dict(b='a07a48', a='5a4028', d='806040', f='a07a48', l='c8a870', x='c8b88a'),
                  [('chrysolophus_pictus/01', (0.2, 0.3, 0.6, 0.6), None)]],
  'amherstiae':  ['은계', 1.0, 'BAMBOO BROADLEAF', 'bird_amherst',        dict(b='ece8e0', a='1a1a1a', d='2a4a3a', f='1a3a2a', l='7a8a8a', x='c02a20'),
                  [('chrysolophus_amherstiae/02', (0.2, 0.05, 0.5, 0.6), None)]],
  'nycthemera_m': ['백한(수컷)', 1.05, 'BROADLEAF', 'bird_silver',         dict(b='e8e8e8', a='1a1c24', d='c8c8c8', f='c02a20', l='c03a30', x='1a1c24'),
                  [('lophura_nycthemera/03', (0.0, 0.3, 0.6, 0.7), None), ('lophura_nycthemera/01', (0.55, 0.25, 0.85, 0.5), None)]],
  'nycthemera_f': ['백한(암컷)', 0.9, 'BROADLEAF', 'bird_hen',             dict(b='7a6040', a='5a4430', d='6a5034', f='c02a20', l='c03a30', x='c8b88a'), [(None, None, None)]],
  'versicolor':  ['녹색꿩', 0.9, 'MARSH MEADOW', 'bird_green',            dict(b='1e4a34', a='2a5a6a', d='4a5a3a', f='c02a20', l='8a8478', x='8a8a7a'),
                  [('phasianus_versicolor/03', (0.1, 0.3, 0.4, 0.6), None)]],
  'reevesii_m':  ['긴꼬리꿩', 1.15, 'CONIFER', 'scaled',                   dict(b='d8a840', a='1a1410', d='c08a30', f='f0ece4', l='8a8478', x='e8e0d0'),
                  [('syrmaticus_reevesii/01', (0.2, 0.2, 0.8, 0.8), None)]],
  'reevesii_f':  ['긴꼬리꿩(암컷)', 0.95, 'CONIFER', 'bird_hen',          dict(b='8a6a44', a='4a3424', d='6a4e30', f='8a6a44', l='8a8478', x='c8b88a'),
                  [('syrmaticus_reevesii/02', (0.3, 0.3, 0.7, 0.7), None)]],
 },
 'sheep': {
  'mouflon':     ['무플론', 0.85, 'ROCK SCREE', 'rump',          dict(b='8a5a34', a='ece4d4', d='6a4228', f='5a4030', l='e8e0d0', x='c8b08a'),
                  [(None, None, None), ('ovis_gmelini/03', (0.3, 0.4, 0.6, 0.6), None)]],
  'soay':        ['소이', 0.75, 'DUNE BEACH', 'countershade',    dict(b='5a3e2a', a='b89a78', d='3a2a1e', f='5a3e2a', l='6a4a34', x='c8b08a'),
                  [('soay_sheep/01', (0.1, 0.3, 0.6, 0.6), None), (None, None, None)]],
  'jacob':       ['제이콥', 0.95, 'MEADOW', 'patches',           dict(b='ece6da', a='3a2a20', d='e4ded2', f='1a1614', l='ece6da', x='e8dcc0'),
                  [(None, None, None), ('jacob_sheep/03', (0.3, 0.2, 0.9, 0.8), None)]],
  'blackface':   ['스코티시 블랙페이스', 1.0, 'CONIFER ROCK', 'whiteface', dict(b='e4dcc8', a='e4dcc8', d='d8d0bc', f='1a1614', l='1a1614', x='c8b8a0'),
                  [('scottish_blackface/02', (0.3, 0.6, 0.5, 0.8), None), ('scottish_blackface/03', (0.1, 0.4, 0.3, 0.6), None)]],
  'icelandic':   ['아이슬란드 양', 0.95, 'ROCK SCREE', 'solid',  dict(b='ece6da', a='ece6da', d='e0dacd', f='ece6da', l='ece6da', x='c8b8a0'),
                  [('icelandic_sheep/01', (0.1, 0.4, 0.5, 0.9), None), ('icelandic_sheep/03', (0.3, 0.3, 0.7, 0.7), None)]],
 },
 'shark': {
  'melanopterus': ['흑기흉상어', 1.0, 'SHELF', 'tipfin',        dict(b='8a8a80', a='ece8e0', d='6a6a62', f='8a8a80', l='8a8a80', x='141414'),
                  [('carcharhinus_melanopterus/01', (0.3, 0.2, 0.6, 0.35), None), ('carcharhinus_melanopterus/02', (0.3, 0.25, 0.6, 0.4), None)]],
  'obesus':      ['화이트팁 암초상어', 1.0, 'SHELF', 'tipfin',     dict(b='7a7e80', a='e8e8e4', d='5a5e60', f='7a7e80', l='7a7e80', x='f4f4f0'),
                  [('triaenodon_obesus/02', (0.2, 0.45, 0.6, 0.6), None)]],
  'cuvier':      ['뱀상어', 2.4, 'DEEP', 'tiger',                dict(b='6a7470', a='e0e0d8', d='3a4440', f='6a7470', l='6a7470', x='4a5450'),
                  [('galeocerdo_cuvier/03', (0.2, 0.3, 0.6, 0.6), None), ('galeocerdo_cuvier/02', (0.3, 0.3, 0.6, 0.5), None)]],
  'leucas':      ['황소상어', 1.6, 'SHELF RIVER', 'countershade', dict(b='7a7a72', a='ece8e0', d='5a5a54', f='7a7a72', l='7a7a72', x='5a5a54'),
                  [('carcharhinus_leucas/02', (0.3, 0.4, 0.6, 0.6), None), ('carcharhinus_leucas/01', (0.3, 0.2, 0.6, 0.4), None)]],
  'carcharias':  ['백상아리', 2.6, 'DEEP', 'countershade',        dict(b='5a6670', a='f0f0ec', d='3a4650', f='5a6670', l='5a6670', x='2a343c'), [(None, None, None)]],
  'glauca':      ['청새리상어', 1.8, 'DEEP', 'countershade',       dict(b='2a4a8a', a='f0f0f4', d='1a3470', f='2a4a8a', l='2a4a8a', x='1a3470'),
                  [('prionace_glauca/02', (0.3, 0.4, 0.5, 0.55), None)]],
  'cirratum':    ['수염상어', 1.6, 'SHELF', 'solid',              dict(b='a08a5a', a='c8b48a', d='806a40', f='a08a5a', l='a08a5a', x='806a40'),
                  [('ginglymostoma_cirratum/03', (0.3, 0.3, 0.7, 0.6), None), ('ginglymostoma_cirratum/02', (0.3, 0.4, 0.6, 0.6), None)]],
 },
 'frog': {
  'temporaria':  ['북방산개구리', 0.6, 'MARSH CONIFER', 'mask',   dict(b='8a6a44', a='d8c8a0', d='5a4028', f='3a2a1c', l='7a5a3a', x='3a2a1c'),
                  [('rana_temporaria/02', (0.2, 0.3, 0.6, 0.6), None), ('rana_temporaria/03', (0.3, 0.3, 0.6, 0.6), None)]],
  'catesbeianus': ['황소개구리', 1.0, 'MARSH RIVER', 'blotch',     dict(b='6a7a3a', a='e8e0b8', d='3a4a22', f='7a8a3a', l='5a6a32', x='3a4a22'),
                  [('lithobates_catesbeianus/02', (0.7, 0.6, 0.9, 0.8), None), ('lithobates_catesbeianus/03', (0.3, 0.4, 0.6, 0.6), None)]],
  'japonicus':   ['청개구리', 0.3, 'BAMBOO BROADLEAF', 'countershade', dict(b='5aa83a', a='ece8d0', d='4a9030', f='3a2a20', l='5aa83a', x='3a2a20'),
                  [('dryophytes_japonicus/01', (0.3, 0.2, 0.6, 0.4), None), ('dryophytes_japonicus/02', (0.2, 0.2, 0.6, 0.5), None)]],
  'tinctorius':  ['독화살개구리', 0.35, 'BROADLEAF', 'bands',      dict(b='f0c818', a='141414', d='f0c818', f='141414', l='2a4aa8', x='141414'),
                  [('dendrobates_tinctorius/02', (0.2, 0.3, 0.4, 0.5), (0.4, 0.5, 0.55, 0.6)), ('dendrobates_tinctorius/01', (0.25, 0.3, 0.45, 0.5), (0.0, 0.0, 0.15, 0.15))]],
  'marina':      ['수수두꺼비', 1.0, 'SCRUB DUNE', 'blotch',       dict(b='8a6a40', a='d8c8a0', d='5a4428', f='8a6a40', l='7a5a34', x='5a4428'),
                  [('rhinella_marina/03', (0.2, 0.2, 0.8, 0.8), None)]],
  'sylvaticus':  ['숲개구리', 0.45, 'CONIFER', 'mask',             dict(b='a07a4a', a='e0d4b4', d='7a5a34', f='2a1e14', l='8a6a40', x='2a1e14'),
                  [('lithobates_sylvaticus/01', (0.4, 0.45, 0.6, 0.6), None)]],
  'nigromaculatus': ['참개구리', 0.55, 'MARSH', 'blotch',           dict(b='7a9a4a', a='e0dcc0', d='1a1a14', f='7a9a4a', l='6a8a3a', x='c8b860'), [(None, None, None)]],
 },
 'lizard': {
  'amblyrhynchus': ['바다이구아나', 0.9, 'BEACH ROCK', 'solid',     dict(b='3a3a36', a='4a4a42', d='2a2a26', f='5a5a50', l='3a3a36', x='2a2a26'),
                  [('amblyrhynchus_cristatus/02', (0.3, 0.3, 0.6, 0.6), None), ('amblyrhynchus_cristatus/01', (0.1, 0.2, 0.3, 0.4), None)]],
  'salvator':    ['물왕도마뱀', 1.8, 'MARSH RIVER', 'blotch',      dict(b='3a3a2a', a='c8b860', d='2a2a1e', f='4a4a36', l='3a3a2a', x='2a2a1e'),
                  [('varanus_salvator/02', (0.0, 0.4, 0.3, 0.7), None), (None, None, None)]],
  'agilis':      ['장지뱀(모래도마뱀)', 0.18, 'DUNE MEADOW', 'lines', dict(b='5a9a3a', a='8a6a44', d='6a5034', f='5a9a3a', l='5a9a3a', x='6a5034'),
                  [('lacerta_agilis/03', (0.35, 0.2, 0.55, 0.8), None), (None, None, None)]],
  'muralis':     ['담장도마뱀', 0.16, 'ROCK SCREE', 'reticulate',  dict(b='6a6a54', a='1a1a14', d='5a5a46', f='6a6a54', l='6a6a54', x='1a1a14'),
                  [('podarcis_muralis/01', (0.1, 0.4, 0.9, 0.6), None)]],
  'dipsosaurus': ['사막이구아나', 0.3, 'SCRUB', 'reticulate',       dict(b='c8bca4', a='8a6a50', d='b0a48c', f='c8bca4', l='c8bca4', x='8a6a50'),
                  [('dipsosaurus_dorsalis/01', (0.2, 0.3, 0.6, 0.6), None)]],
  'plestiodon':  ['다섯줄도마뱀', 0.17, 'BROADLEAF', 'lines',       dict(b='8a6a44', a='e8dcb8', d='3a2a1c', f='8a6a44', l='8a6a44', x='3a5ab0'),
                  [('plestiodon_fasciatus/01', (0.3, 0.2, 0.9, 0.8), None)]],
  'microlophus': ['용암도마뱀', 0.2, 'FUMAROLE ROCK', 'blotch',     dict(b='6a6058', a='2a2420', d='4a443e', f='c04a30', l='6a6058', x='2a2420'),
                  [('microlophus_albemarlensis/01', (0.2, 0.2, 0.8, 0.8), None), (None, None, None)]],
 },
}
# 결 — 짐승마다 결이 가장 잘 보이는 사진 한 장
GRAIN = {'cow': ('cow/aberdeen_angus/03', (0.3, 0.2, 0.9, 0.8)), 'hare': ('hare/lepus_arcticus/02', (0.1, 0.1, 0.9, 0.9)),
         'deer': ('deer/cervus_elaphus/03', (0.3, 0.5, 0.7, 0.95)), 'boar': ('boar/sus_barbatus/02', (0.1, 0.2, 0.9, 0.95)),
         'pheasant': ('pheasant/syrmaticus_reevesii/01', (0.1, 0.1, 0.9, 0.9)), 'sheep': ('sheep/icelandic_sheep/03', (0.1, 0.1, 0.9, 0.9)),
         'shark': ('shark/galeocerdo_cuvier/03', (0.2, 0.2, 0.8, 0.8)), 'frog': ('frog/rhinella_marina/03', (0.1, 0.1, 0.9, 0.9)),
         'lizard': ('lizard/microlophus_albemarlensis/01', (0.1, 0.1, 0.9, 0.9))}
FOLDER = {'cow': 'cow', 'hare': 'hare', 'deer': 'deer', 'boar': 'boar', 'pheasant': 'pheasant', 'sheep': 'sheep', 'shark': 'shark', 'frog': 'frog', 'lizard': 'lizard'}

def user_sample(key):
    """사용자 소 사진(textures/yellowcow.jpg · textures/organics/brownspottedcow.jpg — 옆에서 찍은 소) — 몸통 자리의 가운데값.
       organics/browncow.jpg 는 스톡 사진 워터마크가 비쳐 안 쓴다(칡소는 아는 빛깔)"""
    path = {'yellow': 'textures/yellowcow.jpg', 'spotted': 'textures/organics/brownspottedcow.jpg'}.get(key)
    if not path or not os.path.exists(path): return None
    im = Image.open(path).convert('RGB'); W, H = im.size
    a = np.asarray(im.crop((int(0.45 * W), int(0.25 * H), int(0.7 * W), int(0.45 * H))), np.float64).reshape(-1, 3)
    return '%02x%02x%02x' % tuple(np.median(a, 0).astype(int))

def main():
    out = {}; nvar = {}
    credits = [json.loads(l) for l in open(f'{RAW}/credits.jsonl')]
    used = set()
    for an, table in SPECIES.items():
        sp = {}
        for sid, (nm, sc, biomes, pat, C, vars_) in table.items():
            V = []
            for src, bb, ab in vars_:
                c = dict(C)
                if src and src.startswith('user:'):
                    u = user_sample(src[5:]); slot = 'a' if pat == 'patches' else 'b'; c[slot] = u or c[slot]; c['src'] = 'user ' + src[5:]   # 얼룩소는 몸통 가운데가 밤색 얼룩이다
                elif src:
                    p = f'{RAW}/{FOLDER[an]}/{src}_crop.jpg'
                    if not os.path.exists(p): print('없음', p); continue
                    if bb: c['b'] = natural(med(p, bb), an, sid)
                    if ab: c['a'] = natural(med(p, ab), an, sid)
                    c['src'] = src; used.add(f'{FOLDER[an]}/{src}.jpg')
                V.append(c)
            sp[sid] = dict(n=nm, s=sc, bio=biomes.split(), pat=pat, v=V)
        g = GRAIN[an]; used.add(g[0] + '.jpg')
        out[an] = dict(grain=tile(f'{RAW}/{g[0]}_crop.jpg', g[1]), sp=sp)
        nvar[an] = sum(len(s['v']) for s in sp.values())
    js = ('/* data-animal-coats.js — CASTAWAY · 자료 — tools/animals/coats.py 가 만든다(손으로 고치지 말 것)\n'
          '   짐승마다: grain(사진에서 오린 털 · 깃 · 비늘 결 — 회색 · 이음매 없음 · base64) · sp{종: n 이름 · s 배율 · bio 바이옴 · pat 무늬 · v 갈래[빛깔 b a d f l x · src 사진]}\n'
          '   사진 출처와 허락은 docs/notes/animal-credits.md */\n'
          'const ANIMAL_COATS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open('engine/js/data-animal-coats.js', 'w').write(js)
    print('wrote', len(js), 'bytes ·', nvar)
    # 쓴 사진의 출처
    lines = ['# 짐승 털빛 사진 — 출처와 허락', '', '`tools/animals/coats.py` 가 이 사진들에서 털빛(가운데값)과 결(잔무늬)을 잰다. 사진 자체는 레포 · 게임에 담지 않는다(`textures/organics/raw/` — .gitignore).',
             'iNaturalist · Wikimedia Commons 에서 CC0 · CC BY · CC BY-SA · 퍼블릭 도메인만 받았다(2026-11-08).', '',
             '| 파일 | 종 | 지은이 | 허락 | 출처 |', '|---|---|---|---|---|']
    for c in credits:
        if c['file'] in used:
            lines.append(f"| {c['file']} | {c['species']} | {c['author'].replace('|', '/')} | {c['license']} | {c['source']} |")
    open('docs/notes/animal-credits.md', 'w').write('\n'.join(lines) + '\n'); print('credits', len(lines) - 7)

if __name__ == '__main__': main()
