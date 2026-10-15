# ① Meshy FBX(바이너리 7400) → orig.npz(정점 · 세모 · uv) · 위 축 정보 출력
import struct,sys,zlib,numpy as np
f=open(sys.argv[1],'rb').read(); out=sys.argv[2]
def rd(o):
    end,n,pl=struct.unpack('<III',f[o:o+12]); o+=12
    nl=f[o]; name=f[o+1:o+1+nl].decode('latin1'); o+=1+nl
    props=[];p=o
    for _ in range(n):
        t=chr(f[p]);p+=1
        if t in 'YCIFDL':
            sz={'Y':2,'C':1,'I':4,'F':4,'D':8,'L':8}[t]; props.append((t,f[p:p+sz]));p+=sz
        elif t in 'SR':
            l=struct.unpack('<I',f[p:p+4])[0];props.append((t,f[p+4:p+4+l]));p+=4+l
        else:
            al,enc,cl=struct.unpack('<III',f[p:p+12]);raw=f[p+12:p+12+cl];p+=12+cl
            if enc: raw=zlib.decompress(raw)
            dt={'d':'<f8','f':'<f4','i':'<i4','l':'<i8','b':'u1'}[t]
            props.append((t,np.frombuffer(raw,dt)))
    return end,name,props,o+pl
D={}
def walk(o,path):
    while True:
        end,name,props,ch=rd(o)
        if end==0: return
        k=path+'/'+name
        if name in('Vertices','PolygonVertexIndex','UV','UVIndex','Normals','MappingInformationType','ReferenceInformationType'):
            D.setdefault(k,[]).append(props[0][1] if props else None)
        if name=='P' and 'GlobalSettings' in path:
            s=props[0][1].decode('latin1','ignore')
            if 'Axis' in s or 'Scale' in s: print(s,[ (t,struct.unpack('<i',v)[0] if t=='I' else (struct.unpack('<d',v)[0] if t=='D' else v)) for t,v in props[4:]])
        if ch<end: walk(ch,k)
        o=end
walk(27,'')
for k,v in D.items(): print(k,[ (x.shape if hasattr(x,'shape') else x) for x in v])
V=D['/Objects/Geometry/Vertices'][0].reshape(-1,3)
PV=D['/Objects/Geometry/PolygonVertexIndex'][0].astype(np.int64)
UV=D['/Objects/Geometry/LayerElementUV/UV'][0].reshape(-1,2)
UI=D['/Objects/Geometry/LayerElementUV/UVIndex'][0]
ends=PV<0; idx=np.where(ends,-PV-1,PV)
sizes=np.diff(np.concatenate([[-1],np.where(ends)[0]]))
print('poly sizes',np.unique(sizes,return_counts=True))
assert (sizes==3).all()
F=idx.reshape(-1,3); FU=UI.reshape(-1,3)
np.savez(out,V=V,F=F,UV=UV,FU=FU)
print('V',len(V),'F',len(F),'UV',len(UV))
