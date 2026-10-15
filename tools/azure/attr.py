# 부위 표시(정점) → attr.bin: R 갈고리 빛(끝으로 갈수록) · G 고리 · B 사슬
import numpy as np, objload as L
from bones import *
d=np.load('dec.npz'); V=d['V']; s=np.load('skin.npz'); J=s['J']; W=s['W']; halo=s['halo']; chain=np.load('chain.npy')
claw=np.zeros(len(V)); hand=np.zeros(len(V))
for k,nm in enumerate(NAMES):
    a=HEAD[k]; b=TAIL[k]; ab=b-a; t=np.clip(((V-a)@ab)/(ab@ab),0,1)
    for c in range(2):
        m=J[:,c]==k
        if nm.startswith('claw'): claw[m]+=W[m,c]*(0.25+0.75*t[m]**1.3)
        if nm.startswith('hand'): hand[m]+=W[m,c]*0.25*t[m]
glow=np.clip(claw+hand,0,1)*~chain
P,U,I,vi=L.unify(V,d['T'],d['Fv'],d['Ft'])
np.stack([glow[vi]*255,halo[vi]*255,chain[vi]*255],1).astype(np.uint8).tofile('attr.bin')
