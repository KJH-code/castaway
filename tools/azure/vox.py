# 세 축 광선 홀짝 투표로 속 채우기 → solid.npy (bool, R=0.005)
import numpy as np
P=np.load('P.npy'); d=np.load('orig.npz');F=d['F']; fl=np.load('flab.npy')
T=P[F[fl==0]]
R=0.005; N=int(1.92/R)+4; O=-0.96-2*R
def cast(ax):
    a1,a2=[i for i in range(3) if i!=ax]
    xs=(T[:,:,a1]-O)/R-0.5; zs=(T[:,:,a2]-O)/R-0.5
    i0=np.ceil(xs.min(1)).astype(int); i1=np.floor(xs.max(1)).astype(int)
    k0=np.ceil(zs.min(1)).astype(int); k1=np.floor(zs.max(1)).astype(int)
    out=[]
    span=max((i1-i0).max(),(k1-k0).max())+1
    for di in range(span):
      for dk in range(span):
        ii=i0+di; kk=k0+dk; sel=(ii<=i1)&(kk<=k1)
        if not sel.any(): continue
        t=T[sel]; cx=(ii[sel]+0.5)*R+O+1e-7; cz=(kk[sel]+0.5)*R+O+1.3e-7
        a,b,c=t[:,0],t[:,1],t[:,2]
        v0x,v0z=b[:,a1]-a[:,a1],b[:,a2]-a[:,a2]; v1x,v1z=c[:,a1]-a[:,a1],c[:,a2]-a[:,a2]; px,pz=cx-a[:,a1],cz-a[:,a2]
        den=v0x*v1z-v1x*v0z; ok=np.abs(den)>1e-16; dd=np.where(ok,den,1)
        u=(px*v1z-v1x*pz)/dd; v=(v0x*pz-px*v0z)/dd
        ins=ok&(u>=0)&(v>=0)&(u+v<1)
        y=a[:,ax]+u*(b[:,ax]-a[:,ax])+v*(c[:,ax]-a[:,ax])
        out.append(np.stack([ii[sel][ins],kk[sel][ins],y[ins]],1))
    H=np.concatenate(out)
    key=H[:,0].astype(np.int64)*N+H[:,1].astype(np.int64)
    o=np.lexsort((H[:,2],key)); H=H[o]; key=key[o]
    occ=np.zeros((N,N,N),np.int8)   # [a1,a2,ax]
    u,st,cn=np.unique(key,return_index=True,return_counts=True)
    print('axis',ax,'cols',len(u),'odd',(cn%2).sum())
    good=cn%2==0
    yy=(np.arange(N)+0.5)*R+O
    for c_ in range(2,int(cn.max())+1,2):
        m=good&(cn==c_)
        if not m.any(): continue
        cols=u[m]; s=st[m]
        ins=np.zeros((len(cols),N),bool)
        for j in range(0,c_,2):
            lo=H[s+j,2][:,None]; hi=H[s+j+1,2][:,None]
            ins|=(yy[None,:]>lo)&(yy[None,:]<hi)
        occ[cols//N,cols%N,:]=ins
    # 축 순서를 (x,y,z) 로
    perm=[0,0,0]; perm[a1]=0; perm[a2]=1; perm[ax]=2
    return np.transpose(occ,perm), good, u
votes=np.zeros((N,N,N),np.int8)
for ax in range(3):
    o,_,_=cast(ax); votes+=o
solid=votes>=2
np.save('solid.npy',solid); print('solid voxels',solid.sum(), 'N',N,'O',O)
