import numpy as np, scipy.sparse as sp, time
from scipy import ndimage as nd
from scipy.sparse.csgraph import dijkstra
from bones import *
d=np.load('dec.npz'); V=d['V']; Fv=d['Fv']
solid=np.load('dsolid.npy'); R=0.006; O=-0.972; N=solid.shape[0]
solid=nd.binary_closing(solid,iterations=1)|solid
ids=-np.ones(solid.shape,np.int64); sv=np.argwhere(solid); ids[tuple(sv.T)]=np.arange(len(sv))
# 26 이웃 그래프
offs=[(a,b,c) for a in (-1,0,1) for b in (-1,0,1) for c in (-1,0,1) if (a,b,c)>(0,0,0)]
rows=[];cols=[];ws=[]
for o in offs:
    q=sv+np.array(o); ok=(q>=0).all(1)&(q<N).all(1); q=q[ok]; j=ids[tuple(q.T)]; m=j>=0
    rows.append(np.where(ok)[0][m]); cols.append(j[m]); ws.append(np.full(m.sum(),np.linalg.norm(o)*R))
G=sp.coo_matrix((np.concatenate(ws),(np.concatenate(rows),np.concatenate(cols))),shape=(len(sv),)*2).tocsr(); G=G+G.T
print('voxels',len(sv),'edges',G.nnz)
_,near=nd.distance_transform_edt(~solid,return_indices=True)
def vox(p): return np.clip(((p-O)/R).astype(int),0,N-1)
def segpts(a,b,step=0.003):
    n=max(2,int(np.linalg.norm(b-a)/step)); t=np.linspace(0,1,n)[:,None]; return a+(b-a)*t
def ringpts(): 
    e1=np.cross(hn,[1,0,0]); e1/=np.linalg.norm(e1); e2=np.cross(hn,e1); t=np.linspace(0,2*np.pi,200)[:,None]
    return hc+hr*(np.cos(t)*e1+np.sin(t)*e2)
vi=vox(V); vn=near[:,vi[:,0],vi[:,1],vi[:,2]].T; vid=ids[tuple(vn.T)]
voff=np.linalg.norm(V-(vn*R+O+R/2),axis=1)
nb=len(NAMES); DIST=np.full((len(V),nb),np.inf); EUC=np.zeros((len(V),nb))
def segdist(P,a,b):
    ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab),0,1); return np.linalg.norm(P-(a+np.outer(t,ab)),axis=1)
t0=time.time()
for k,nm in enumerate(NAMES):
    pts=ringpts() if nm=='halo' else segpts(HEAD[k],TAIL[k])
    EUC[:,k]=np.min([np.linalg.norm(V-p,axis=1) for p in pts[::10]],axis=0) if nm=='halo' else segdist(V,HEAD[k],TAIL[k])
    if nm=='root': continue
    q=vox(pts); qn=near[:,q[:,0],q[:,1],q[:,2]].T; seeds=np.unique(ids[tuple(qn.T)])
    D=dijkstra(G,indices=seeds,min_only=True)
    DIST[:,k]=D[vid]+voff
print('dijkstra %.1fs'%(time.time()-t0))
np.savez('dist.npz',DIST=DIST,EUC=EUC)
