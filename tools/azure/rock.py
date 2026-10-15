import numpy as np, sys
from scipy import ndimage as nd
solid=np.load('solid.npy'); R=0.005; O=-0.97; N=solid.shape[0]
r=float(sys.argv[1])
dt=nd.distance_transform_edt(solid)
core=dt>r
lab,n=nd.label(core)
yb=int((-0.40-O)/R)
seeds=np.unique(lab[:,:yb,:]); seeds=seeds[seeds>0]
sz=nd.sum(np.ones_like(lab),lab,index=seeds)
cm=nd.center_of_mass(core,lab,seeds)
for a,b,c in zip(seeds,sz,cm): print(' comp',a,int(b),np.round(np.array(c)*R+O,2))
seeds=seeds[sz>2000]
print('r',r,'core comps',n,'seed comps',list(zip(seeds,sz.astype(int))))
rc=np.isin(lab,seeds)
# 원판(얇아서 core 에 없다)도 받침
disc=np.zeros_like(solid); disc[:,:int((-0.672-O)/R),:]=True
rc=rc|(solid&disc)
# 다시 키움(속 안에서만)
d2=nd.distance_transform_edt(~rc)
rock=solid&(d2<=r+1.5)
# 몸과 붙은 곳 보기: 바위 덩이의 위쪽 끝 높이(열마다)
np.save('rock.npy',rock)
ys=np.arange(N)*R+O
top=np.where(rock.any(1), O+R*(N-1-np.argmax(rock[:,::-1,:],axis=1)), -1.0)
from PIL import Image
im=np.clip((top+0.75),0,1); im[top<-0.9]=0
Image.fromarray((im*255).astype(np.uint8).T[::-1]).save('rock_top_%d.png'%int(r))
print('rock vox',rock.sum(),'of',solid.sum())
