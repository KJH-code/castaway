// 가슴 보석의 분광 자료를 낸다 — island_world.html 의 GEM_SPEC · CHEST_GEM_COL[].ao/ae/inner
//   node tools/gem-absorb.mjs          보석마다 빛띠별 흡수 계수(cm⁻¹, E⊥c·E∥c)와 GEM_SPEC 를 찍는다
//   node tools/gem-absorb.mjs --look   c 축을 따라·가로질러 1·3·6 cm 지난 빛깔(sRGB)을 찍어 본다
//
// 보석 셰이더는 빛을 400~700 nm 의 30 nm 빛띠 열 개(GEM_SPEC.lam — 가운데 415·445·…·685)로 나눠 따로 따라간다.
// 빛띠마다 굴절률이 다르고(분산) 흡수가 다르다. 여기서 내는 것은 셋이다.
//  ① W — 빛띠마다 선형 sRGB 로 접는 무게. CIE 1931 등색함수(와이먼 2013 근사)를 빛띠 안에서 1 nm 로 적분해
//     sRGB 행렬을 곱하고, 같은 에너지 흰빛이 (1,1,1) 이 되게 채널마다 나눴다.
//  ② B — 둘레(환경 지도)의 RGB 를 빛띠별 복사휘도로 펴는 바탕. 매끈한 세 원색 스펙트럼 P(파랑·초록·빨강 — 합이 늘 1)을
//     M = Wᵀ·P 로 접어 B = P·M⁻¹ 로 잡는다. 그래서 흰 둘레는 평평한 스펙트럼이 되고, Σ W·Bᵀ = 단위 행렬이라
//     아무것도 안 먹으면 둘레 빛깔이 그대로 나온다.
//  ③ ag — 은 거울의 복소 굴절률 n·k(존슨·크리스티 1972, Phys. Rev. B 6, 4370). 셰이더가 보석 굴절률에 맞춰 반사율을 센다.
//
// 흡수는 띠마다 파수(cm⁻¹) 가우스(봉우리 α · 반치폭 — 넷이면 낮은 쪽·높은 쪽 따로)를 더한 것이고, 빛띠 안에서
// 2 cm 를 지난 빛의 평균으로 실효 α 를 낸다(좁은 띠가 빛띠 하나를 통째로 먹은 것처럼 보이지 않게).
// 강옥은 빛이 c 축에 수직으로 떨 때(E⊥c)와 나란히 떨 때(E∥c) 흡수가 다르다(다색성) — 둘을 따로 낸다.
//  · 단면적(E⊥c): Cr³⁺ 1.62e−19 cm²(560 nm) · Fe²⁺–Ti⁴⁺ 짝 1.94e−18(580 nm) · Fe³⁺ 2.3e−20 —
//    두빈스키·스톤-선드버그·에밋, "A Quantitative Description of the Causes of Color in Corundum", G&G 56(1) 2020.
//  · Cr³⁺ 의 E∥c 는 크로네마이어 1966(JOSA 56, 1703 — 분홍 루비 편광 흡수)의 비율을 GIA 값에 곱했다:
//    E⊥c 558·412 nm(22.8·22.5 ×10⁻²⁰) · E∥c 543·398 nm(7.23·38.1 ×10⁻²⁰).
//  · Fe²⁺–Ti⁴⁺ 의 E∥c 는 700 nm(GIA)에 있으나 세기는 못 구했다 — E⊥c 의 0.65 배로 어림.
//  · 에메랄드·황옥·노랑 색중심은 다색성 자료가 없어 두 방향을 같게 뒀다.
// 어림(출처 없음): 녹주석 속 Cr³⁺ 단면적은 강옥과 같다고 침 · 노랑 색중심(h•−Fe³⁺) 세기 · 황옥 Fe³⁺ 전하 옮김 꼬리 세기 ·
//   띠 너비 · 농도는 보통 보석 범위에서 골랐다.
const g=(l,m,a,b)=>{const s=l<m?a:b;return Math.exp(-0.5*((l-m)/s)**2)};
const X=l=>1.056*g(l,599.8,37.9,31.0)+0.362*g(l,442.0,16.0,26.7)-0.065*g(l,501.1,20.4,26.2);
const Y=l=>0.821*g(l,568.8,46.9,40.5)+0.286*g(l,530.9,16.3,31.1);
const Z=l=>1.217*g(l,437.0,11.8,36.0)+0.681*g(l,459.0,26.0,13.8);
const M=[[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]];
const band=B=>l=>{const nu=1e7/l;let a=0;for(const b of B){const [n,w,p]=b.length===3?b:[b[0],nu<b[0]?b[1]:b[2],b[3]];a+=p*Math.exp(-4*Math.LN2*((nu-n)/w)**2);}return a;};
const NA=1.17e23;                                   // 강옥 원자 수 /cm³ (3.98 g/cm³ · Al₂O₃ 102 g/mol · 5 원자)
const ppma=(s,c)=>s*c*1e-6*NA;
const nu=l=>1e7/l;
// 루비 Cr³⁺ — [E⊥c 띠, E∥c 띠]
const cr=c=>{ const k=ppma(1.62e-19,c)/22.8; return {
  o:[[nu(558),2400,3400,22.8*k],[nu(412),4200,5000,22.5*k]],
  e:[[nu(543),2400,3400,7.23*k],[nu(398),4200,5000,38.1*k]] }; };
const feti=c=>{ const a=ppma(1.94e-18,c); return { o:[[nu(580),4500,a]], e:[[nu(700),4500,a*0.65]] }; };
const iso=B=>({o:B,e:B});
const fe3=c=>iso([[26500,1200,ppma(2.3e-20,c)],[25770,900,ppma(2.3e-20,c)*0.55],[22200,700,ppma(2.3e-20,c)*0.18]]);
const yel=a450=>iso([[25600,6000,a450/Math.exp(-4*Math.LN2*((25600-22222)/6000)**2)]]);
const ctFe=a450=>iso([[30300,9000,a450/Math.exp(-4*Math.LN2*((30300-22222)/9000)**2)]]);   // 황옥 O²⁻→Fe³⁺ 꼬리(RSC Adv. 2025)
const crB=6.4e19*1.62e-19;                          // 에메랄드 Cr₂O₃ 0.3 wt% → Cr 6.4e19 /cm³ (녹주석 2.71 g/cm³)
const emerald=iso([[16400,2400,3400,crB],[23250,3600,5000,crB*1.05],[12200,4000,0.3]]);
const sum=(...P)=>({o:P.flatMap(p=>p.o),e:P.flatMap(p=>p.e)});
export const GEMS={
  plate_steel:  {name:'청색 사파이어 · Fe–Ti 8 ppma · Fe³⁺ 1000 ppma', n:1.770, disp:0.018, A:sum(feti(8),fe3(1000))},
  scale_bronze: {name:'주황 사파이어 · Cr 150 ppma · 노랑 색중심 · Fe³⁺ 3000 ppma', n:1.770, disp:0.018, A:sum(cr(150),yel(5),fe3(3000))},
  scale_iron:   {name:'노랑 황옥 · Fe³⁺ 전하 옮김 꼬리', n:1.630, disp:0.014, A:ctFe(1.5)},
  scale_chitin: {name:'에메랄드 · Cr₂O₃ 0.3 wt%', n:1.580, disp:0.014, A:emerald},
  scale_ember:  {name:'루비 · Cr 800 ppma', n:1.770, disp:0.018, A:cr(800), fl:true},
  // 복합: 정사면체를 모서리 가운데로 잘라 가운데 정팔면체는 에메랄드, 네 귀 정사면체는 루비(사용자 요청)
  scale_ember_chitin:{name:'정사면체 — 귀 넷 루비 Cr 800 ppma · 가운데 정팔면체 에메랄드', n:1.770, disp:0.018, A:cr(800), fl:true,
    inner:{n:1.580, disp:0.014, A:emerald}},
};
// 빛띠
export const LAM=Array.from({length:10},(_,k)=>415+30*k);
const binOf=k=>{ const a=400+30*k, r=[]; for(let l=a;l<a+30;l++) r.push(l+0.5); return r; };
const effA=(f,k,L=2)=>{ const ls=binOf(k); let m=0; for(const l of ls) m+=Math.exp(-f(l)*L); m/=ls.length;
  if(m<1e-9){ let s=0; for(const l of ls) s+=f(l); return s/ls.length; } return Math.min(60,-Math.log(m)/L); };
// W — 빛띠별 sRGB 무게(같은 에너지 흰빛 = 1,1,1)
const raw=LAM.map((_,k)=>{ let x=0,y=0,z=0; for(const l of binOf(k)){ x+=X(l); y+=Y(l); z+=Z(l); } return M.map(r=>r[0]*x+r[1]*y+r[2]*z); });
const tot=[0,1,2].map(c=>raw.reduce((s,w)=>s+w[c],0));
export const W=raw.map(w=>w.map((v,c)=>v/tot[c]));
// B — 둘레 RGB → 빛띠 복사휘도
const sig=(x)=>1/(1+Math.exp(-x));
const P=LAM.map((_,k)=>{ let b=0,r=0; const ls=binOf(k); for(const l of ls){ b+=sig(-(l-490)/10); r+=sig((l-585)/10); } b/=ls.length; r/=ls.length; return [r,1-r-b,b]; });
const Mm=[0,1,2].map(c=>[0,1,2].map(d=>W.reduce((s,w,k)=>s+w[c]*P[k][d],0)));   // Mm[c][d] = Σ W_kc P_kd
const inv3=m=>{ const [a,b,c]=m[0],[d,e,f]=m[1],[g2,h,i]=m[2]; const A=e*i-f*h,B_=-(d*i-f*g2),C=d*h-e*g2, det=a*A+b*B_+c*C;
  return [[A/det,-(b*i-c*h)/det,(b*f-c*e)/det],[B_/det,(a*i-c*g2)/det,-(a*f-c*d)/det],[C/det,-(a*h-b*g2)/det,(a*e-b*d)/det]]; };
const Mi=inv3(Mm);
export const Bs=P.map(p=>[0,1,2].map(c=>p[0]*Mi[0][c]+p[1]*Mi[1][c]+p[2]*Mi[2][c]));
// 은 — 존슨·크리스티 1972 (eV: n, k)
const AG=[[1.64,0.03,5.242],[1.76,0.04,4.838],[1.88,0.05,4.483],[2.01,0.06,4.152],[2.13,0.05,3.858],[2.26,0.06,3.586],
  [2.38,0.05,3.324],[2.50,0.05,3.093],[2.63,0.05,2.869],[2.75,0.04,2.657],[2.88,0.04,2.462],[3.00,0.05,2.275],[3.12,0.05,2.070]];
const agAt=l=>{ const e=1239.84/l; for(let i=0;i<AG.length-1;i++){ const [e0,n0,k0]=AG[i],[e1,n1,k1]=AG[i+1]; if(e>=e0&&e<=e1){ const t=(e-e0)/(e1-e0); return [n0+(n1-n0)*t,k0+(k1-k0)*t]; } }
  return e<AG[0][0]?AG[0].slice(1):AG[AG.length-1].slice(1); };
export const AGNK=LAM.map(agAt);
const r4=v=>+(+v).toPrecision(4);
const look=process.argv.includes('--look');
if(!look){
  console.log('const GEM_SPEC={lam:['+LAM+'],\n  W:'+JSON.stringify(W.map(w=>w.map(r4)))+',\n  B:'+JSON.stringify(Bs.map(b=>b.map(r4)))+',\n  ag:'+JSON.stringify(AGNK.map(v=>v.map(r4)))+'};');
  for(const [k,G] of Object.entries(GEMS)){ const fo=band(G.A.o), fe=band(G.A.e);
    const ao=LAM.map((_,i)=>r4(effA(fo,i))), ae=LAM.map((_,i)=>r4(effA(fe,i)));
    let s=`  ${k}:{ior:${G.n},disp:${G.disp},ao:[${ao}],ae:[${ae}]`;
    if(G.inner){ const I=G.inner, co=band(I.A.o), ce=band(I.A.e); s+=`,shape:'tetra',inner:{ior:${I.n},disp:${I.disp},ao:[${LAM.map((_,i)=>r4(effA(co,i)))}],ae:[${LAM.map((_,i)=>r4(effA(ce,i)))}]}`; }
    if(G.fl) s+=',fl:1';
    console.log(s+'},   // '+G.name); }
} else {
  // c 축을 따라(E⊥c 만) · 가로질러(E⊥c·E∥c 반반) L cm 지난 흰빛의 sRGB
  const enc=v=>Math.round(255*Math.max(0,Math.min(1,v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055)));
  const show=(T)=>{ const c=[0,1,2].map(ch=>T.reduce((s,t,k)=>s+t*W[k][ch],0)); return c.map(enc).join(','); };
  for(const [k,G] of Object.entries(GEMS)){ const fo=band(G.A.o), fe=band(G.A.e);
    const ao=LAM.map((_,i)=>effA(fo,i)), ae=LAM.map((_,i)=>effA(fe,i));
    const row=[1,3,6].map(L=>'∥c '+show(ao.map(a=>Math.exp(-a*L)))+' / ⊥c '+show(ao.map((a,i)=>0.5*(Math.exp(-a*L)+Math.exp(-ae[i]*L))))+` @${L}cm`);
    console.log(k.padEnd(19),row.join('  |  '));
    if(G.inner){ const co=band(G.inner.A.o); const c2=LAM.map((_,i)=>effA(co,i)); console.log('  └ 속'.padEnd(19),[1,3,6].map(L=>show(c2.map(a=>Math.exp(-a*L)))+` @${L}cm`).join('  |  ')); }
  }
  // 바탕 확인: 흰 둘레 → 평평 · Σ W Bᵀ = I
  const I=[0,1,2].map(c=>[0,1,2].map(d=>W.reduce((s,w,k)=>s+w[c]*Bs[k][d],0)));
  console.log('Σ W·Bᵀ =',JSON.stringify(I.map(r=>r.map(v=>+v.toFixed(4)))),' 흰빛 스펙트럼 =',Bs.map(b=>+(b[0]+b[1]+b[2]).toFixed(3)).join(','));
  console.log('은 거울 반사율(강옥 속) =',AGNK.map(([n,k])=>{ const ng=1.77, a=(n-ng)**2+k*k, b=(n+ng)**2+k*k; return +(a/b).toFixed(3); }).join(','));
}
