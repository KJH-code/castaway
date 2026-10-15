/* engine/native/light.c — CASTAWAY
 *
 * Two island-wide grid passes that run once per island load, moved from JavaScript to C
 * (WebAssembly) because they are plain number crunching over the N x N field:
 *
 *     cw_tlit_open  — sky openness per cell (8 directions x 7 steps)   js: tlitBuild() G channel
 *                     engine/js/41-terrain-light.js
 *     cw_under_base — underground base height: 2-pass min filter, 4-pass box blur
 *                     js: underSites() step 1 — engine/js/96-underworld.js
 *
 * Both read the elevation in H[] (erosion.c — JS copies F.elev in first) and keep the same
 * arithmetic as the JavaScript (double maths, float storage, same order) so the results match.
 */
#define MAXN 768
extern float H[];
static unsigned char TLO[MAXN * MAXN];   /* G channel bytes */
static float UM[MAXN * MAXN], UB[MAXN * MAXN], UA[MAXN * MAXN], U1[MAXN * MAXN], U2[MAXN * MAXN];

unsigned char *cw_tlit_out(void) { return TLO; }
float *cw_under_m(void) { return UM; }
float *cw_under_b(void) { return UB; }

static int iclamp(int v, int a, int b) { return v < a ? a : (v > b ? b : v); }

/* 하늘 트임 — 방위 여덟 · 1·2·3·5·8·12·18 칸 밖의 땅이 만드는 가장 높은 지평선. 1 − sin(지평선 각)의 평균 */
void cw_tlit_open(int N, double cell) {
  static const int DX[8] = {1, 1, 0, -1, -1, -1, 0, 1}, DZ[8] = {0, 1, 1, 1, 0, -1, -1, -1}, ST[7] = {1, 2, 3, 5, 8, 12, 18};
  for (int z = 0; z < N; z++) for (int x = 0; x < N; x++) {
    int i = z * N + x; double h0 = H[i] > 0 ? H[i] : 0, op = 0;
    for (int d = 0; d < 8; d++) {
      double dl = ((d & 1) ? 1.4142 : 1) * cell, mt = 0;
      for (int k = 0; k < 7; k++) {
        int s = ST[k], xx = x + DX[d] * s, zz = z + DZ[d] * s;
        if (xx < 0 || zz < 0 || xx >= N || zz >= N) break;
        double hj = H[zz * N + xx], t = ((hj > 0 ? hj : 0) - h0) / (s * dl);
        if (t > mt) mt = t;
      }
      op += 1 - mt / __builtin_sqrt(1 + mt * mt);
    }
    double v = 255 * op / 8;                       /* Math.round — halves go up */
    TLO[i] = (unsigned char)(int)__builtin_floor(v + 0.5);
  }
}

/* 둘레 r0 칸의 가장 낮은 땅(가로 · 세로 두 번) → 반지름 rb 칸 상자 흐림 네 번(가로 · 세로 · 가로 · 세로) →
   min(흐린 것, 가장 낮은 땅 − 24) − 16. 흐림의 합은 double 로 들고 다니다 float 칸에 나눠 담는다(자바스크립트와 같다) */
static void blur(const float *src, float *dst, int N, int rb, int dx) {
  for (int z = 0; z < N; z++) {
    double s = 0; int n = 0;
    #define ROW(i) (dx ? z * N + (i) : (i) * N + z)
    for (int i = -rb; i <= rb; i++) { int q = iclamp(i, 0, N - 1); s += src[ROW(q)]; n++; }
    for (int i = 0; i < N; i++) {
      dst[ROW(i)] = (float)(s / n);
      int a = iclamp(i - rb, 0, N - 1), b = iclamp(i + rb + 1, 0, N - 1);
      s += (double)src[ROW(b)] - (double)src[ROW(a)];   /* double 로 빼야 자바스크립트와 같다(float 끼리 빼면 단정밀도로 한다) */
    }
    #undef ROW
  }
}
void cw_under_base(int N, int r0, int rb) {
  for (int z = 0; z < N; z++) for (int x = 0; x < N; x++) {
    double m = 1e9; for (int k = -r0; k <= r0; k++) { int xx = iclamp(x + k, 0, N - 1); double v = H[z * N + xx]; if (v < m) m = v; }
    UA[z * N + x] = (float)m; }
  for (int z = 0; z < N; z++) for (int x = 0; x < N; x++) {
    double m = 1e9; for (int k = -r0; k <= r0; k++) { int zz = iclamp(z + k, 0, N - 1); double v = UA[zz * N + x]; if (v < m) m = v; }
    UM[z * N + x] = (float)m; }
  blur(UM, U1, N, rb, 1); blur(U1, U2, N, rb, 0); blur(U2, U1, N, rb, 1); blur(U1, U2, N, rb, 0);
  for (int i = 0; i < N * N; i++) { double a = U2[i], b = (double)UM[i] - 24; UB[i] = (float)((a < b ? a : b) - 16); }
}
