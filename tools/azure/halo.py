# ⑧ 머리 위 고리: 정점을 법선 반대로 관 반지름만큼 밀어 관 가운데 점으로 → 원 RANSAC
import numpy as np
d=np.load('dec.npz'); V=d['V']; Fv=d['Fv']
fn=np.cross(V[Fv[:,1]]-V[Fv[:,0]],V[Fv[:,2]]-V[Fv[:,0]]); N=np.zeros_like(V)
for k in range(3): np.add.at(N,Fv[:,k],fn)
N/=np.linalg.norm(N,axis=1,keepdims=True)+1e-12
m=(V[:,0]>-0.05)&(V[:,0]<0.6)&(V[:,1]>0.45)&(V[:,1]<0.75)&(V[:,2]>-0.55)&(V[:,2]<0.15)
rng=np.random.default_rng(1); best=None
for tube in [0.018,0.022,0.026]:
    Q=V[m]-N[m]*tube
    for it in range(3000):
        a,b,c=Q[rng.choice(len(Q),3,replace=False)]
        ab=b-a; ac=c-a; n=np.cross(ab,ac); nn=np.linalg.norm(n)
        if nn<1e-9: continue
        n/=nn; cc=np.linalg.solve(np.array([ab,ac,n]),np.array([ab@(a+b)/2,ac@(a+c)/2,n@a])); r=np.linalg.norm(a-cc)
        if not (0.15<r<0.3): continue
        v=Q-cc; h=v@n; rr=np.linalg.norm(v-np.outer(h,n),axis=1); s=(np.sqrt((rr-r)**2+h**2)<0.006).sum()
        if best is None or s>best[0]: best=(s,cc,n,r,tube)
s,c,n,r,tube=best; print('halo',np.round(c,4),np.round(n,4),round(r,4),tube,'inliers',s)
np.save('halo.npy',np.r_[c,n,r,tube])
