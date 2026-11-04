"""tools/geo-mesh.py — Meshy STL(바위 · 벼랑 · 봉우리) → 본편 자료 engine/js/data-geo-meshes.js
쓰는 법: python3 tools/geo-mesh.py meshes/*.stl [Meshy_AI_Rugged_Granite_Boulder_*.stl]
 · STL 은 Z 위 · 높이 50 · 밑면 z=0 (Meshy 내보내기) → Y 위로 돌린다 · 높이 1 로 줄인다(게임이 키운다)
 · 줄이기는 격자 꼭짓점 묶기(numpy 만 — 칸 안의 점을 평균 하나로) · 두 단계: 가까이(near ~16k 세모) · 멀리(far ~2.5k)
 · 정점마다 오목한 정도(aCav 0~255 — 이웃 평균이 법선 반대쪽이면 틈) — 셰이더가 갈라진 틈을 짙게 칠한다
 · 자리 16비트(밑면 기준 상자 안) · 번호 16/32비트 → base64 · 원본 STL 은 레포에 안 담는다(.gitignore)"""
import numpy as np, sys, os, base64, json, re
def load(p):
    b=open(p,'rb').read(); n=int.from_bytes(b[80:84],'little')
    a=np.frombuffer(b,dtype=np.dtype([('n','<3f4'),('v','<9f4'),('a','<u2')]),count=n,offset=84)
    V=a['v'].reshape(-1,3).astype(np.float64)
    V=np.stack([V[:,0],V[:,2],-V[:,1]],1)/50.0           # Z 위 → Y 위 · 높이 1
    return V
def cluster(V,res):
    mn=V.min(0); ext=(V.max(0)-mn).max(); q=np.floor((V-mn)/ext*res).astype(np.int64); q=np.clip(q,0,res)
    key=(q[:,0]*(res+1)+q[:,1])*(res+1)+q[:,2]
    u,inv=np.unique(key,return_inverse=True)
    P=np.zeros((len(u),3)); np.add.at(P,inv,V); c=np.bincount(inv,minlength=len(u)); P/=c[:,None]
    F=inv.reshape(-1,3)
    F=F[(F[:,0]!=F[:,1])&(F[:,1]!=F[:,2])&(F[:,0]!=F[:,2])]
    s=np.sort(F,1); _,k=np.unique(s,axis=0,return_index=True); F=F[np.sort(k)]
    used=np.unique(F); remap=-np.ones(len(P),np.int64); remap[used]=np.arange(len(used))
    return P[used],remap[F]
def fit(V,target):
    lo,hi=16,1024
    for _ in range(14):
        mid=(lo+hi)//2; P,F=cluster(V,mid)
        if len(F)>target: hi=mid
        else: lo=mid
    return cluster(V,lo)
def cavity(P,F):
    n=np.zeros_like(P); a=P[F[:,0]]; b=P[F[:,1]]; c=P[F[:,2]]; fn=np.cross(b-a,c-a)
    for k in range(3): np.add.at(n,F[:,k],fn)
    n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-12
    s=np.zeros_like(P); cnt=np.zeros(len(P))
    for i,j in ((0,1),(1,2),(2,0)):
        np.add.at(s,F[:,i],P[F[:,j]]); np.add.at(cnt,F[:,i],1)
        np.add.at(s,F[:,j],P[F[:,i]]); np.add.at(cnt,F[:,j],1)
    d=s/np.maximum(cnt,1)[:,None]-P
    e=np.median(np.linalg.norm(d,axis=1))+1e-9
    cv=np.clip(0.5+0.5*np.sum(d*n,1)/(e*2.5),0,1)               # 1 = 오목(틈) · 0 = 볼록(모서리)
    return (cv*255).astype(np.uint8)
def pack(P,F):
    mn=P.min(0); mx=P.max(0); q=np.round((P-mn)/np.maximum(mx-mn,1e-9)*65535).astype(np.uint16)
    idx=F.astype(np.uint16 if len(P)<65536 else np.uint32)
    cav=cavity(P,F)
    blob=q.tobytes()+cav.tobytes()+(b'\0' if len(cav)%2 else b'')+idx.tobytes()
    return {'nv':int(len(P)),'nt':int(len(F)),'i32':int(idx.dtype==np.uint32),'mn':[round(float(x),5) for x in mn],'mx':[round(float(x),5) for x in mx],
            'b':base64.b64encode(blob).decode()}
out={}
for p in sys.argv[1:]:
    name=re.sub(r'^Meshy_AI_|_\d{8}_generate\.stl$','',os.path.basename(p)).lower()
    V=load(p); near=fit(V,16000); far=fit(V,2500)
    out[name]={'near':pack(*near),'far':pack(*far),'w':[round(float(x),4) for x in (V.max(0)-V.min(0))]}
    print(name,'tris',len(V)//3,'-> near',len(near[1]),'far',len(far[1]),'size(w,h,d)',out[name]['w'])
js='/* data-geo-meshes.js — tools/geo-mesh.py 가 Meshy STL 에서 만든다(읽지 말 것 · base64) — 37-geo-meshes.js 가 푼다 */\nconst GEO_MESH_DATA='+json.dumps(out,separators=(',',':'))+';\n'
open('engine/js/data-geo-meshes.js','w').write(js); print('bytes',len(js))
