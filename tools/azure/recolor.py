import numpy as np
from PIL import Image
from scipy import ndimage as nd
a=np.asarray(Image.open('tex.png').convert('RGB')).astype(np.float32)/255
rg=np.asarray(Image.open('regions.png').convert('RGBA')).astype(np.float32)/255
cov=rg[...,3]>0.5
reg=rg[...,:3]*cov[...,None]
# 섬 가장자리 번지기: 가려진 칸(섬 밖)은 가장 가까운 섬 안 칸 값을 받는다
_,ix=nd.distance_transform_edt(~cov,return_indices=True)
reg=reg[ix[0],ix[1]]
def ss(e0,e1,x): t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
b=a.max(2)
vein=ss(0.60,0.86,b)                      # 원래 밝은 청록 결
veinB=nd.gaussian_filter(vein,2.5)        # 결 둘레 번짐(돌에 비친 빛)
s=ss(0.18,0.62,b)**1.15                   # 돌결
# 돌: 보랏빛 슬레이트(참고 그림의 갑옷 판)
dark=np.array([0.085,0.078,0.105]); light=np.array([0.40,0.385,0.47])
stone=dark+(light-dark)*s[...,None]
stone+=veinB[...,None]*np.array([0.03,0.09,0.16])
# 사슬: 어두운 쇠
iron=np.array([0.10,0.105,0.12])+np.array([0.20,0.21,0.235])*s[...,None]
ch=reg[...,2:3]; stone=stone*(1-ch)+iron*ch
# 에너지(결 · 갈고리 · 고리)
glow=np.clip(np.maximum(vein*(1-reg[...,2]), np.maximum(reg[...,0],reg[...,1])),0,1)
core=ss(0.88,0.97,b)*(1-reg[...,2])
eAlb=np.array([0.55,0.86,1.0])
alb=stone*(1-glow[...,None])+eAlb*glow[...,None]
emi=glow[...,None]*np.array([0.18,0.55,1.0])*1.15 + core[...,None]*np.array([0.55,0.8,1.0])*0.6
# 갈고리는 결이 보이게: 원래 밝기로 조금 흔든다
emi*= (0.75+0.5*s[...,None])
Image.fromarray((np.clip(alb,0,1)**(1/1.0)*255).astype(np.uint8)).save('alb.png')
Image.fromarray((np.clip(emi,0,1)*255).astype(np.uint8)).save('emi.png')
print('glow frac %.3f'%(glow>0.3).mean())
