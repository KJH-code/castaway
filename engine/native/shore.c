/* engine/native/shore.c — CASTAWAY
 *
 * Shoreline scan for the wave foam (engine/js/96-foam.js): find the points where the sea meets
 * the land near the player, with the inland direction and the beach slope at each.
 *
 *     cw_shore — walks the grid cells within R metres of the player, finds every cell edge that
 *                crosses the waterline, and lays anchors along the shore every `step` metres.
 *                Each anchor also carries the beach profile along its inland direction: how far
 *                out to sea the bed is 0.30 m down, and how far inland the ground is 0.15, 0.35
 *                and 0.60 m up. The foam shader turns "the sea is this high right now" into
 *                "the water's edge is this far up the beach" from those four numbers.
 *
 * Unlike erosion.c this does NOT have to match JavaScript bit for bit: the result is only where
 * foam is drawn, nothing is saved from it. It uses single precision and reads the elevation
 * field through a pointer (H, shared with erosion.c — JS mirrors F.elev into it once per island).
 * foamBench() in 96-foam.js times this against the JavaScript version; use whichever is faster.
 */
#define MAXN 768
#define MAXOUT 2048
extern float H[];                               /* erosion.c — elevation, metres */
static unsigned char RIV[MAXN * MAXN];          /* 1 where the cell is river (no sea foam there) */
#define STRIDE 9
static float OUT[MAXOUT * STRIDE];              /* x, z, inland nx, nz, 1/slope, d(-0.30), d(+0.15), d(+0.35), d(+0.60)  per anchor */

unsigned char *cw_river(void) { return RIV; }
float *cw_shore_out(void) { return OUT; }

static inline float h_at(const float *h, int N, float inv_cell, float wx, float wz) {
  float gx = wx * inv_cell + N * 0.5f, gz = wz * inv_cell + N * 0.5f;
  float lim = N - 1.001f;
  if (gx < 0) gx = 0; else if (gx > lim) gx = lim;
  if (gz < 0) gz = 0; else if (gz > lim) gz = lim;
  int x = (int)gx, z = (int)gz;
  float fx = gx - x, fz = gz - z;
  const float *p = h + z * N + x;
  return p[0] * (1 - fx) * (1 - fz) + p[1] * fx * (1 - fz) + p[N] * (1 - fx) * fz + p[N + 1] * fx * fz;
}

/* Distance along (dx,dz) from (qx,qz) to where the ground first reaches level+rise
 * (rise > 0: walking inland and up; rise < 0: walking out to sea and down). */
static float reach(const float *h, int N, float inv, float qx, float qz, float dx, float dz,
                   float level, float rise, float max_d) {
  const float st = 0.5f;
  float prev = h_at(h, N, inv, qx, qz) - level;
  for (float t = st; t <= max_d; t += st) {
    float cur = h_at(h, N, inv, qx + dx * t, qz + dz * t) - level;
    if (rise > 0 ? cur >= rise : cur <= rise) {
      float k = (rise - prev) / (cur - prev);
      if (!(k >= 0)) k = 0; else if (k > 1) k = 1;
      return t - st + st * k;
    }
    prev = cur;
  }
  /* not reached within max_d (a very flat beach): extend the slope seen so far, up to 3x */
  if (rise > 0 ? prev > 0.02f : prev < -0.02f) { float d = max_d * rise / prev; return d > 3 * max_d ? 3 * max_d : d; }
  return 3 * max_d;
}

int cw_shore(int N, float cell, float px, float pz, float R, float step, float level, int max_out) {
  const float *h = H;
  const float inv = 1.0f / cell, e = 0.6f, half = N * 0.5f;
  int x0 = (int)((px - R) * inv + half), x1 = (int)((px + R) * inv + half) + 1;
  int z0 = (int)((pz - R) * inv + half), z1 = (int)((pz + R) * inv + half) + 1;
  if (x0 < 1) x0 = 1; if (z0 < 1) z0 = 1; if (x1 > N - 3) x1 = N - 3; if (z1 > N - 3) z1 = N - 3;
  if (max_out > MAXOUT) max_out = MAXOUT;
  int M = (int)(cell / step + 0.999f); if (M < 1) M = 1;
  int n = 0;
  float *o = OUT;
  for (int z = z0; z <= z1; z++) for (int x = x0; x <= x1; x++) {
    int i = z * N + x;
    float a = h[i];
    for (int dir = 0; dir < 2; dir++) {
      int j = dir ? i + N : i + 1;
      float b = h[j];
      if ((a > level) == (b > level)) continue;          /* this edge does not cross the waterline */
      if (RIV[i] | RIV[j]) continue;
      float t = (level - a) / (b - a);
      float wx = ((dir ? x : x + t) - half) * cell, wz = ((dir ? z + t : z) - half) * cell;
      float gx = (h_at(h, N, inv, wx + e, wz) - h_at(h, N, inv, wx - e, wz)) / (2 * e);
      float gz = (h_at(h, N, inv, wx, wz + e) - h_at(h, N, inv, wx, wz - e)) / (2 * e);
      float sl = __builtin_sqrtf(gx * gx + gz * gz);
      if (sl < 0.015f) continue;
      float nx = gx / sl, nz = gz / sl;
      for (int m = 0; m < M; m++) {
        float off = ((m + 0.5f) / M - 0.5f) * cell;
        float qx = wx - nz * off, qz = wz + nx * off;      /* along the shore (tangent = (-nz, nx)) */
        for (int it = 0; it < 2; it++) {                    /* slide to the waterline */
          float d = (level - h_at(h, N, inv, qx, qz)) / sl;
          if (d > cell) d = cell; else if (d < -cell) d = -cell;
          qx += nx * d; qz += nz * d;
        }
        float dx = qx - px, dz = qz - pz;
        if (dx * dx + dz * dz > R * R) continue;
        float g2x = (h_at(h, N, inv, qx + e, qz) - h_at(h, N, inv, qx - e, qz)) / (2 * e);
        float g2z = (h_at(h, N, inv, qx, qz + e) - h_at(h, N, inv, qx, qz - e)) / (2 * e);
        float s2 = __builtin_sqrtf(g2x * g2x + g2z * g2z);
        if (s2 < 0.015f) continue;
        float is = 1.0f / s2; if (is > 14.0f) is = 14.0f;
        float ux = g2x / s2, uz = g2z / s2;
        o[0] = qx; o[1] = qz; o[2] = ux; o[3] = uz; o[4] = is;
        o[5] = reach(h, N, inv, qx, qz, -ux, -uz, level, -0.30f, 10.0f);
        o[6] = reach(h, N, inv, qx, qz, ux, uz, level, 0.15f, 14.0f);
        o[7] = reach(h, N, inv, qx, qz, ux, uz, level, 0.35f, 14.0f);
        o[8] = reach(h, N, inv, qx, qz, ux, uz, level, 0.60f, 14.0f);
        if (o[7] < o[6] + 0.05f) o[7] = o[6] + 0.05f;
        if (o[8] < o[7] + 0.05f) o[8] = o[7] + 0.05f;
        o += STRIDE;
        if (++n >= max_out) return n;
      }
    }
  }
  return n;
}
