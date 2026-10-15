# ⑦ 사슬 찾기: 골격선 굵기 0.009 밑인 정점끼리 이어진 덩이 중 길이 0.18 넘는 것
import numpy as np, scipy.sparse as sp
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree
d=np.load('dec.npz'); V=d['V']; Fv=d['Fv']
Sk=np.load('skel.npy'); X=Sk[:,:3]; rad=Sk[:,3]
dist,i=cKDTree(X).query(V); thin=(rad[i]<0.009)&(dist<=0.03)
e=np.concatenate([Fv[:,[0,1]],Fv[:,[1,2]],Fv[:,[2,0]]]); e=e[thin[e[:,0]]&thin[e[:,1]]]
nc,lab=connected_components(sp.coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(len(V),len(V))),directed=False)
lab[~thin]=-1; chain=np.zeros(len(V),bool)
for k in np.unique(lab[lab>=0]):
    vv=V[lab==k]
    if np.linalg.norm(vv.max(0)-vv.min(0))>0.18: chain[lab==k]=True
print('chain verts',chain.sum(),'of',len(V)); np.save('chain.npy',chain)
