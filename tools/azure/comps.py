# ② 방향 바로잡기(FBX 는 Y 위라 적혀 있지만 실제는 Z 위) · 같은 자리 정점 잇기 · 연결 성분
import numpy as np, scipy.sparse as sp
from scipy.sparse.csgraph import connected_components
d=np.load('orig.npz');V=d['V'];F=d['F']
P=np.stack([V[:,0],V[:,2],-V[:,1]],1)
q=np.round(P*1e5).astype(np.int64); _,w=np.unique(q,axis=0,return_inverse=True); w=w.ravel()
G=w[F]; n=w.max()+1
e=np.concatenate([G[:,[0,1]],G[:,[1,2]]])
nc,lab=connected_components(sp.coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(n,n)),directed=False)
fl=lab[G[:,0]]; u,c=np.unique(fl,return_counts=True)
# 성분 번호를 크기 차례로(0 = 가장 큰 것 = 몸+받침)
order=np.argsort(-c); rank=np.empty_like(order); rank[order]=np.arange(len(order))
fl=rank[np.searchsorted(u,fl)]
print('components',nc,'faces',np.sort(c)[::-1])
np.save('flab.npy',fl); np.save('P.npy',P); np.save('weld.npy',w)
