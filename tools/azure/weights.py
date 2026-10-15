import numpy as np, colorsys, scipy.sparse as sp, sys
from scipy.sparse.csgraph import dijkstra
from bones import *
d=np.load('dec.npz'); V=d['V']; Fv=d['Fv']
z=np.load('dist.npz'); DIST=z['DIST'].copy(); EUC=z['EUC']
chain=np.load('chain.npy')
ci=[k for k,n in enumerate(NAMES) if n.startswith(('claw','hand'))]
chain&=~(EUC[:,ci].min(1)<0.05)   # 갈고리 끝이 사슬에 닿아 사슬로 잘못 잡힌 것
v=V-hc; h=v@hn; rr=np.linalg.norm(v-np.outer(h,hn),axis=1); hd=np.sqrt((rr-hr)**2+h**2); halo=(hd<0.034)&~chain
# 고리 관이 두툼한 곳: 메시를 따라 0.06 안까지 번진다
_e=np.concatenate([d['Fv'][:,[0,1]],d['Fv'][:,[1,2]],d['Fv'][:,[2,0]]]); _ok=(hd<0.06)&~chain
for _ in range(30):
    a,b=_e[:,0],_e[:,1]; m=_ok[a]&_ok[b]&(halo[a]!=halo[b])
    if not m.any(): break
    halo[a[m]]=True; halo[b[m]]=True
print('halo verts',halo.sum())
nb=len(NAMES); iH=NAMES.index('halo'); iR=NAMES.index('root'); iC=NAMES.index('chest')
EXP=float(sys.argv[1]) if len(sys.argv)>1 else 4
# ① 메시 표면으로 이어받기: 가짜 출발점 → 정점(거리 = 칸 거리) → 표면 간선
e=np.concatenate([Fv[:,[0,1]],Fv[:,[1,2]],Fv[:,[2,0]]]); e=np.unique(np.sort(e,1),axis=0)
el=np.linalg.norm(V[e[:,0]]-V[e[:,1]],axis=1)
n=len(V); D=np.full((n,nb),np.inf)
for k in range(nb):
    if k in (iH,iR): continue
    f=np.isfinite(DIST[:,k]) & ~chain & ~halo
    src=np.where(f)[0]
    r=np.r_[e[:,0],e[:,1],np.full(len(src),n)]; c=np.r_[e[:,1],e[:,0],src]; w=np.r_[el,el,DIST[src,k]+1e-6]
    G=sp.coo_matrix((w,(r,c)),shape=(n+1,n+1)).tocsr()
    D[:,k]=dijkstra(G,indices=n,directed=True)[:n]
bad=~np.isfinite(D).any(1)
E=EUC.copy(); E[:,[iH,iR]]=np.inf; D[bad]=E[bad]
print('still fallback',bad.sum())
# ② 섞는 짝은 부모·자식만
o=np.argsort(D,1); j0=o[:,0]; d0=np.maximum(np.take_along_axis(D,o[:,:1],1)[:,0],1e-3)
adj=np.zeros((nb,nb),bool)
for k in range(nb):
    if PAR[k]>=0: adj[k,PAR[k]]=adj[PAR[k],k]=True
ix=NAMES.index
for a,b in [('pelvis','spine'),('armR1','spine'),('armR2','spine'),('armL1','spine'),('armL2','spine'),('neck','spine')]: adj[ix(a),ix(b)]=adj[ix(b),ix(a)]=True
Dm=np.where(adj[j0],D,np.inf); j1=np.argmin(Dm,1); d1=np.maximum(Dm[np.arange(n),j1],1e-3)
w0=1/d0**EXP; w1=np.where(np.isfinite(d1),1/d1**EXP,0); s=w0+w1
J=np.stack([j0,np.where(w1>0,j1,j0)],1).astype(np.uint16); W=np.stack([w0/s,w1/s],1)
# 사슬: 몸통 뼈(허리·척추·가슴·목·머리)만, 사슬을 따라 부드럽게(지수 2)
TR=[NAMES.index(n) for n in ('pelvis','spine','chest','neck','head')]
Dc=np.full((chain.sum(),nb),np.inf); Dc[:,TR]=np.where(np.isfinite(D[chain][:,TR]),D[chain][:,TR],E[chain][:,TR] if False else EUC[chain][:,TR])
oc=np.argsort(Dc,1)[:,:2]; dc=np.maximum(np.take_along_axis(Dc,oc,1),1e-3); wc=1/dc**2; wc/=wc.sum(1,keepdims=True)
J[chain]=oc; W[chain]=wc
J[halo]=[iH,iH]; W[halo]=[1,0]
# 따로 움직일 덩이를 잇는 세모 빼기: 팔 넷 · 허리 아래 · 머리 · 고리
GRP={}
for nm in NAMES:
    for g in ('R1','R2','L1','L2'):
        if nm.endswith(g): GRP[nm]=g
GRP['pelvis']='P'; GRP['neck']='H'; GRP['head']='H'; GRP['halo']='O'
gid=np.array([GRP.get(NAMES[j],'T') for j in J[:,0]])
dom=np.where(W[:,0]>=W[:,1],J[:,0],J[:,1]); gid=np.array([GRP.get(NAMES[j],'T') for j in dom])
gid[halo]='O'
fg=gid[Fv]; drop=np.zeros(len(Fv),bool)
for a in range(3):
    for b in range(a+1,3):
        x=fg[:,a]; y=fg[:,b]; diff=(x!=y)&(x!='T')&(y!='T')
        ca=chain[Fv[:,a]]; cb=chain[Fv[:,b]]
        drop|=diff&(~(ca|cb)|(ca!=cb)|(x=='O')|(y=='O'))
print('drop tris',drop.sum())
np.savez('skin.npz',J=J,W=W,halo=halo,drop=drop)
pal=np.array([colorsys.hsv_to_rgb((i*0.618)%1,0.75,1) for i in range(nb)])*255
col=(pal[J[:,0]]*W[:,:1]+pal[J[:,1]]*W[:,1:]).astype(np.uint8)
import objload as L
P,U,I,vi=L.unify(d['V'],d['T'],d['Fv'],d['Ft']); col[vi].tofile('dc_col.bin')
