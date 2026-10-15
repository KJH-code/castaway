# 파이썬 스키닝으로 자세마다 삼각형 늘어남 재기
import numpy as np, json, sys
from scipy.spatial.transform import Rotation as Rot
from bones import *
d=np.load('dec.npz'); V=d['V']; s=np.load('skin.npz'); J=s['J']; W=s['W']; Fv=d['Fv'][~s['drop']] if 'drop' in s.files else d['Fv']
def skin(pose):
    nb=len(NAMES); Rw=[None]*nb; Tw=[None]*nb
    for k in range(nb):
        r=Rot.from_euler('XYZ',pose.get(NAMES[k],[0,0,0])).as_matrix()
        if PAR[k]<0: Rw[k]=r; Tw[k]=HEAD[k]
        else: p=PAR[k]; Rw[k]=Rw[p]@r; Tw[k]=Tw[p]+Rw[p]@(HEAD[k]-HEAD[p])
    out=np.zeros_like(V)
    for c in range(2):
        for k in range(nb):
            m=J[:,c]==k
            if m.any(): out[m]+=W[m,c:c+1]*((V[m]-HEAD[k])@Rw[k].T+Tw[k])
    return out
def stretch(pose):
    P=skin(pose)
    def el(X): return np.stack([np.linalg.norm(X[Fv[:,a]]-X[Fv[:,b]],axis=1) for a,b in ((0,1),(1,2),(2,0))],1)
    r=(el(P)/np.maximum(el(V),1e-6)).max(1); return r
if __name__=='__main__':
    poses=json.loads(sys.argv[1])
    for p in poses:
        r=stretch(p[0]); bad=r>2.5
        print('%-60s  >1.6: %5d  >2.5: %5d  max %.1f'%(json.dumps(p[0])[:60],(r>1.6).sum(),bad.sum(),r.max()))
