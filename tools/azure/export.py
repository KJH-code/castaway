# 받침 뺀 · 줄인 · 다시 칠한 · 뼈 심은 몸을 GLB 로
import numpy as np, json, struct, io, sys
from PIL import Image
import objload as L
from bones import *
SC=float(sys.argv[2]) if len(sys.argv)>2 else 2.2; OUT=sys.argv[1]
d=np.load('dec.npz'); V=d['V']; Fv=d['Fv']; sk=np.load('skin.npz'); J=sk['J']; W=sk['W']
# 정점 법선(같은 자리끼리 이어서)
fn=np.cross(V[Fv[:,1]]-V[Fv[:,0]],V[Fv[:,2]]-V[Fv[:,0]]); Nv=np.zeros_like(V)
for k in range(3): np.add.at(Nv,Fv[:,k],fn)
Nv/=np.linalg.norm(Nv,axis=1,keepdims=True)+1e-12
keep=~sk['drop']
P,U,I,vi=L.unify(V,d['T'],Fv[keep],d['Ft'][keep])
# 게임 좌표: 몸 가운데(x,z)를 원점에, 맨 아래를 y=0 에, SC 배
C=np.array([0.245,V[:,1].min(),-0.15])
def tf(p): return (np.asarray(p)-C)*SC
Pg=tf(P).astype('<f4'); Ng=Nv[vi].astype('<f4'); Ug=U.astype('<f4').copy(); Ug[:,1]=1-Ug[:,1]  # glTF uv 는 위가 0
Jg=np.zeros((len(P),4),np.uint8); Jg[:,:2]=J[vi]; Wf=np.zeros((len(P),4)); Wf[:,:2]=W[vi]; Wf/=Wf.sum(1,keepdims=True)
Wg=np.round(Wf*255).astype(np.uint8); Wg[:,0]=255-Wg[:,1:].sum(1); Ig=I.astype('<u4').ravel()   # 가중치 u8 정규화(합 255)
Hg=tf(HEAD); Tg=tf(TAIL)
def jpg(fn,q):
    b=io.BytesIO(); Image.open(fn).convert('RGB').save(b,'JPEG',quality=q,optimize=True); return b.getvalue()
blobs=[]; views=[]; acc=[]
def add(buf,target=None):
    off=sum(len(x) for x in blobs); pad=(-len(buf))%4; blobs.append(buf+b'\0'*pad)
    v={'buffer':0,'byteOffset':off,'byteLength':len(buf)}
    if target: v['target']=target
    views.append(v); return len(views)-1
def accessor(arr,ctype,typ,target=None,minmax=False):
    bv=add(arr.tobytes(),target); a={'bufferView':bv,'componentType':ctype,'count':len(arr),'type':typ}
    if minmax: a['min']=arr.min(0).tolist(); a['max']=arr.max(0).tolist()
    acc.append(a); return len(acc)-1
aP=accessor(Pg,5126,'VEC3',34962,True); aN=accessor(Ng,5126,'VEC3',34962); aU=accessor(Ug,5126,'VEC2',34962)
aJ=accessor(Jg,5121,'VEC4',34962); aW=accessor(Wg,5121,'VEC4',34962); acc[aW]['normalized']=True; aI=accessor(Ig,5125,'SCALAR',34963)
IBM=np.zeros((len(NAMES),16),'<f4')
for k in range(len(NAMES)):
    m=np.eye(4); m[:3,3]=-Hg[k]; IBM[k]=m.T.ravel()   # 열 우선
aB=accessor(IBM,5126,'MAT4')
imA=add(jpg('alb.png',90)); imE=add(jpg('emi.png',88))
nodes=[{'name':'azure','mesh':0,'skin':0}]
jn=[]
for k,nm in enumerate(NAMES):
    t=Hg[k]-(Hg[PAR[k]] if PAR[k]>=0 else 0)
    nodes.append({'name':nm,'translation':[float(x) for x in t]}); jn.append(len(nodes)-1)
for k in range(len(NAMES)):
    ch=[jn[c] for c in range(len(NAMES)) if PAR[c]==k]
    if ch: nodes[jn[k]]['children']=ch
gl={'asset':{'version':'2.0','generator':'castaway az tools'},
 'scene':0,'scenes':[{'nodes':[0,jn[0]]}],'nodes':nodes,
 'meshes':[{'name':'azure','primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aU,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aI,'material':0}]}],
 'skins':[{'name':'azure','joints':jn,'inverseBindMatrices':aB,'skeleton':jn[0]}],
 'materials':[{'name':'azure','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0.0,'roughnessFactor':0.85},
   'emissiveTexture':{'index':1},'emissiveFactor':[1,1,1]}],
 'textures':[{'source':0,'sampler':0},{'source':1,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
 'images':[{'bufferView':imA,'mimeType':'image/jpeg'},{'bufferView':imE,'mimeType':'image/jpeg'}],
 'extras':{'bones':{nm:{'head':Hg[k].round(4).tolist(),'tail':Tg[k].round(4).tolist()} for k,nm in enumerate(NAMES)},'scale':SC,'front':'+z'},
 'accessors':acc,'bufferViews':views,'buffers':[{'byteLength':sum(len(x) for x in blobs)}]}
js=json.dumps(gl,separators=(',',':')).encode(); js+=b' '*((-len(js))%4); bin_=b''.join(blobs)
with open(OUT,'wb') as f:
    f.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_)))
    f.write(struct.pack('<II',len(js),0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II',len(bin_),0x004E4942)); f.write(bin_)
import os; print(OUT,'%.2f MB'%(os.path.getsize(OUT)/1e6),'verts',len(P),'tris',len(Ig)//3,'bones',len(NAMES),'height %.2f m'%(Pg[:,1].max()))
