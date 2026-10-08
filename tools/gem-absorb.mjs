// 가슴 보석의 흡수 계수(빨·초·파, cm⁻¹)를 실제 보석의 흡수 띠에서 낸다 — island_world.html 의 CHEST_GEM_COL.sig/foil
//   node tools/gem-absorb.mjs [기준 길이 cm, 기본 0.5]
// 띠마다 파수(cm⁻¹)에서 가우스(봉우리 α cm⁻¹ · 반치폭 — 넷이면 낮은 쪽·높은 쪽 따로) → 지난 빛 스펙트럼 e^(−αL)
// → CIE 1931 등색함수(와이먼 2013 근사) → 선형 sRGB → 채널마다 T, σ = −ln T / L.
// 단면적: 강옥의 Cr³⁺ 1.62e−19 cm²(560 nm) · Fe²⁺–Ti⁴⁺ 짝 1.94e−18(580 nm) · Fe³⁺ 2.3e−20 — 두빈스키·스톤-선드버그·에밋,
//   "A Quantitative Description of the Causes of Color in Corundum", Gems & Gemology 56(1) 2020 (E⊥c).
// 띠 자리: 루비 555·405 nm · 청색 사파이어 571(⊥c)·693(∥c) nm · Fe³⁺ 377·388·450 nm · 에메랄드 Cr³⁺ 430·610 nm(우드·나소 1968).
// 어림(출처 없음): 녹주석 속 Cr³⁺ 단면적은 강옥과 같다고 침 · 노랑 색중심(h•−Fe³⁺)은 390 nm 넓은 띠를 450 nm 에서 α 로 맞춤 ·
//   띠 너비·405/555 비 · 농도는 보통 보석 범위에서 골랐다.
const g=(l,m,a,b)=>{const s=l<m?a:b;return Math.exp(-0.5*((l-m)/s)**2)};
const X=l=>1.056*g(l,599.8,37.9,31.0)+0.362*g(l,442.0,16.0,26.7)-0.065*g(l,501.1,20.4,26.2);
const Y=l=>0.821*g(l,568.8,46.9,40.5)+0.286*g(l,530.9,16.3,31.1);
const Z=l=>1.217*g(l,437.0,11.8,36.0)+0.681*g(l,459.0,26.0,13.8);
const M=[[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]];
const band=B=>l=>{const nu=1e7/l;let a=0;for(const b of B){const [n,w,p]=b.length===3?b:[b[0],nu<b[0]?b[1]:b[2],b[3]];a+=p*Math.exp(-4*Math.LN2*((nu-n)/w)**2);}return a;};
const NA=1.17e23;                                   // 강옥 원자 수 /cm³ (3.98 g/cm³ · Al₂O₃ 102 g/mol · 5 원자)
const ppma=(s,c)=>s*c*1e-6*NA;
const cr=c=>ppma(1.62e-19,c), ft=c=>ppma(1.94e-18,c), fe=c=>ppma(2.3e-20,c);
const ruby=c=>[[18000,2400,3400,cr(c)],[24700,4200,5000,cr(c)*1.3]];
const fe3=c=>[[26500,1200,fe(c)],[25770,900,fe(c)*0.55],[22200,700,fe(c)*0.18]];
const yel=a450=>[[25600,6000,a450/Math.exp(-4*Math.LN2*((25600-22222)/6000)**2)]];
// 황옥: O²⁻→Fe³⁺ 전하 옮김 띠(자외선 · 330 nm 쯤)의 꼬리가 파랑을 먹는다(RSC Adv. 2025 — 노랑 황옥은 Fe³⁺) · 450 nm 에서 α 로 맞춤(어림)
const ctFe=a450=>[[30300,9000,a450/Math.exp(-4*Math.LN2*((30300-22222)/9000)**2)]];
const crB=6.4e19*1.62e-19;                          // 에메랄드 Cr₂O₃ 0.3 wt% → Cr 6.4e19 /cm³ (녹주석 2.71 g/cm³)
export const GEMS={
  plate_steel:  {name:'청색 사파이어 · Fe–Ti 8 ppma · Fe³⁺ 1000 ppma', B:[[17500,4500,ft(8)*0.75],[14430,4500,ft(8)*0.4],...fe3(1000)]},
  scale_bronze: {name:'주황 사파이어 · Cr 150 ppma · 노랑 색중심 · Fe³⁺ 3000 ppma', B:[...ruby(150),...yel(5),...fe3(3000)]},
  scale_iron:   {name:'노랑 황옥 · Fe³⁺ 전하 옮김 꼬리(α450 1.5 cm⁻¹ 어림)', B:ctFe(1.5)},
  scale_chitin: {name:'에메랄드 · Cr₂O₃ 0.3 wt%', B:[[16400,2400,3400,crB],[23250,3600,5000,crB*1.05],[12200,4000,0.3]]},
  scale_ember:  {name:'루비 · Cr 800 ppma', B:ruby(800)},
  scale_ember_chitin:{name:'짙은 루비 · Cr 1200 ppma', B:ruby(1200)},
};
const rgb=f=>{let x=0,y=0,z=0;for(let l=380;l<=780;l++){const t=f(l);x+=X(l)*t;y+=Y(l)*t;z+=Z(l)*t;}return M.map(r=>r[0]*x+r[1]*y+r[2]*z);};
const W=rgb(()=>1), LC=[610,545,465];
const L=+process.argv[2]||0.5;
for(const [k,{name,B}] of Object.entries(GEMS)){ const a=band(B);
  const T=rgb(l=>Math.exp(-a(l)*L)).map((v,i)=>Math.min(1,Math.max(v/W[i],1e-6)));
  const sig=T.map((t,i)=>Math.max(0,t>1e-5?-Math.log(t)/L:Math.min(-Math.log(t)/L,a(LC[i]))));   // 다 먹힌 채널(바닥에 붙은 것)만 그 채널 한가운데 α 로 묶는다
  const T2=sig.map(s=>Math.exp(-s*L)), mx=Math.max(...T2);
  console.log(`${k}: sig:[${sig.map(s=>+s.toFixed(2))}], foil:[${T2.map(t=>+(t/mx*0.92).toFixed(3))}]   // ${name}`);
}
