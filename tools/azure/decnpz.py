# ⑤ 줄인 메시(dec.obj) → dec.npz · 미리보기/굽기용 d_*.bin
import numpy as np, objload as L
V,T,Fv,Ft=L.load('dec.obj'); P,U,I,vi=L.unify(V,T,Fv,Ft)
print(len(V),len(T),len(Fv),'render verts',len(P))
P.astype('<f4').tofile('d_pos.bin'); U.astype('<f4').tofile('d_uv.bin'); I.astype('<u4').tofile('d_idx.bin')
np.savez('dec.npz',V=V,T=T,Fv=Fv,Ft=Ft)
