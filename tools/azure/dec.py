import numpy as np, pymeshlab, time
P=np.load('P.npy'); d=np.load('orig.npz');F=d['F'];FU=d['FU'];UV=d['UV']; w=np.load('weld.npy'); idx=np.load('keepF.npy')
G=w[F[idx]]; FU2=FU[idx]
vu,vinv=np.unique(G.ravel(),return_inverse=True); Pw=np.zeros((w.max()+1,3)); Pw[w]=P
tu,tinv=np.unique(FU2.ravel(),return_inverse=True)
with open('body.obj','w') as o:
    o.write('mtllib body.mtl\nusemtl m\n')
    o.write(''.join('v %.6f %.6f %.6f\n'%tuple(v) for v in Pw[vu]))
    o.write(''.join('vt %.6f %.6f\n'%tuple(t) for t in UV[tu]))
    a=vinv.reshape(-1,3)+1; b=tinv.reshape(-1,3)+1
    o.write(''.join('f %d/%d %d/%d %d/%d\n'%(x[0],y[0],x[1],y[1],x[2],y[2]) for x,y in zip(a,b)))
open('body.mtl','w').write('newmtl m\nmap_Kd tex.png\n')
t=time.time()
ms=pymeshlab.MeshSet(); ms.load_new_mesh('body.obj')
m=ms.current_mesh(); print('in',m.vertex_number(),m.face_number(),'has wedge tex',m.has_wedge_tex_coord())
ms.meshing_decimation_quadric_edge_collapse_with_texture(targetfacenum=200000,qualitythr=0.4,extratcoordw=1.0,preserveboundary=True,boundaryweight=1.0,optimalplacement=True,preservenormal=True,planarquadric=False)
m=ms.current_mesh(); print('out',m.vertex_number(),m.face_number(),'%.0fs'%(time.time()-t))
ms.save_current_mesh('dec.obj',save_textures=False)
