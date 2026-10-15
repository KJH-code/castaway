import numpy as np, scipy.sparse as sp, sys
from scipy import ndimage as nd
from scipy.sparse.csgraph import connected_components
P=np.load('P.npy'); d=np.load('orig.npz');F=d['F'];FU=d['FU'];UV=d['UV']; fl=np.load('flab.npy'); w=np.load('weld.npy')
rock=np.load('rock.npy'); R=0.005; O=-0.97; N=rock.shape[0]
rd=nd.binary_dilation(rock,iterations=int(sys.argv[1]))
C=P[F].mean(1); ijk=np.clip(((C-O)/R).astype(int),0,N-1)
fb=rd[ijk[:,0],ijk[:,1],ijk[:,2]]
keep=(~fb)&(fl<=1)
G=w[F[keep]]; n=w.max()+1
e=np.concatenate([G[:,[0,1]],G[:,[1,2]]])
nc,lab=connected_components(sp.coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(n,n)),directed=False)
flab=lab[G[:,0]]; u,c=np.unique(flab,return_counts=True); o=np.argsort(-c)
print('base',fb.sum(),'pieces',len(u), c[o][:12])
Pw=np.zeros((n,3)); Pw[w]=P
big=[]
for k in range(len(u)):
    if c[k]<int(sys.argv[2]): continue
    pp=Pw[np.unique(G[flab==u[k]])]
    if pp[:,2].min()>0.45: print('drop sliver',c[k]); continue
    big.append(u[k])
big=np.array(big)
idx=np.where(keep)[0][np.isin(flab,big)]
np.save('keepF.npy',idx); print('final faces',len(idx))
F2=F[idx];FU2=FU[idx]
key=F2.astype(np.int64)*len(UV)+FU2
uu,inv=np.unique(key.ravel(),return_inverse=True)
vi=uu//len(UV); ti=uu%len(UV)
P[vi].astype('<f4').tofile('c_pos.bin'); UV[ti].astype('<f4').tofile('c_uv.bin'); inv.astype('<u4').tofile('c_idx.bin')
