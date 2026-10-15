import numpy as np
def load(fn):
    V=[];T=[];Fv=[];Ft=[]
    for l in open(fn):
        if l.startswith('v '): V.append(l.split()[1:4])
        elif l.startswith('vt '): T.append(l.split()[1:3])
        elif l.startswith('f '):
            p=[q.split('/') for q in l.split()[1:4]]
            Fv.append([int(q[0]) for q in p]); Ft.append([int(q[1]) for q in p])
    return np.array(V,float),np.array(T,float),np.array(Fv)-1,np.array(Ft)-1
def unify(V,T,Fv,Ft):
    key=Fv.astype(np.int64)*len(T)+Ft
    u,inv=np.unique(key.ravel(),return_inverse=True)
    return V[u//len(T)],T[u%len(T)],inv.reshape(-1,3),u//len(T)
