import numpy as np
from skimage.morphology import skeletonize
from scipy import ndimage as nd
from PIL import Image, ImageDraw
solid=np.load('dsolid.npy'); R=0.006; O=-0.972; N=solid.shape[0]
solid=nd.binary_closing(solid,iterations=1)
sk=skeletonize(solid)
dt=nd.distance_transform_edt(solid)
p=np.argwhere(sk); X=p*R+O+R/2; rad=dt[sk]*R
np.save('skel.npy',np.c_[X,rad]); print('skel pts',len(p))
def plot(a,b,flipb,ext,name,dep):
    a0,a1,b0,b1=ext; W=900; sc=W/(a1-a0); H=int((b1-b0)*sc)
    im=Image.new('RGB',(W,H),(40,40,48)); dr=ImageDraw.Draw(im)
    for t in np.arange(np.ceil(a0*10)/10,a1,0.1):
        x=(t-a0)*sc; dr.line([(x,0),(x,H)],fill=(80,80,90) if abs(t)>1e-6 else (160,40,40)); dr.text((x+2,2),'%.1f'%t,fill=(200,200,200))
    for t in np.arange(np.ceil(b0*10)/10,b1,0.1):
        y=(b1-t)*sc; dr.line([(0,y),(W,y)],fill=(80,80,90) if abs(t)>1e-6 else (160,40,40)); dr.text((2,y-11),'%.1f'%t,fill=(200,200,200))
    bb=X[:,b]*(-1 if flipb else 1)
    dd=X[:,dep]; dn=(dd-dd.min())/(dd.max()-dd.min())
    o=np.argsort(dd if dep!=2 else -dd)
    for i in o:
        x=(X[i,a]-a0)*sc; y=(b1-bb[i])*sc; r=max(1,rad[i]*sc*0.25)
        c=(int(255*dn[i]),int(255*(1-abs(dn[i]-0.5)*2)),int(255*(1-dn[i])))
        dr.ellipse([x-r,y-r,x+r,y+r],fill=c)
    im.save(name)
plot(0,1,False,[-0.96,0.96,-0.66,0.74],'sk_front.png',2)
plot(2,1,False,[-0.76,0.5,-0.66,0.74],'sk_side.png',0)
plot(0,2,True,[-0.96,0.96,-0.76,0.5],'sk_top.png',1)
