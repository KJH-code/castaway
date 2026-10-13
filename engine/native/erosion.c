/* engine/native/erosion.c — CASTAWAY
 *
 * The three terrain kernels that island generation spends its inner loops in, written in C
 * and compiled to WebAssembly (env/setup-zig.sh + engine/native/build.sh):
 *
 *     cw_thermal   — talus (angle-of-repose) erosion         js: thermal()
 *     cw_hydraulic — droplet erosion                          js: hydraulic()
 *     cw_smooth    — 3x3 despeckle                            js: smoothTerrain()
 *
 * RULE: every island must come out BIT-IDENTICAL to the JavaScript versions in
 * engine/js/10-worldgen.js. Saves store only a seed plus what the player changed, so a
 * terrain that differs in the last bit can move a river and break every existing save.
 * That is why this file
 *   - does all arithmetic in double and stores to float, exactly like JS on a Float32Array
 *     (never add two floats directly: C would do that in single precision, JS does not);
 *   - keeps the same operation order as the JS source, line for line;
 *   - re-implements Math.hypot the way V8 does (scale by the max, Kahan summation);
 *   - is built with -ffp-contract=off (no fused multiply-add).
 * engine/native/verify.html runs both versions on several seeds and compares hashes.
 * If you change one side, change the other and re-run it.
 */
typedef unsigned int u32;

#define MAXN 768
float H[MAXN * MAXN];          /* the elevation field — JS copies F.elev in and out (shore.c reads it too) */
static float T[MAXN * MAXN];   /* scratch copy */

float *cw_elev(void) { return H; }

static double d_sqrt(double x) { return __builtin_sqrt(x); }

/* V8's Math.hypot for two arguments (src/builtins/math.tq): divide by the larger magnitude,
   sum the squares with Kahan compensation, then sqrt(sum) * max. */
static double js_hypot2(double a, double b) {
  double x = a < 0 ? -a : a, y = b < 0 ? -b : b;
  double max = x > y ? x : y;
  if (max == 0) return 0;
  double sum = 0, comp = 0, n, summand, prelim;
  n = x / max; summand = n * n - comp; prelim = sum + summand; comp = (prelim - sum) - summand; sum = prelim;
  n = y / max; summand = n * n - comp; prelim = sum + summand; comp = (prelim - sum) - summand; sum = prelim;
  return d_sqrt(sum) * max;
}

/* mulberry32 — the game's seeded random (engine/js/00-core.js) */
static u32 rng_a;
static double rnd(void) {
  rng_a += 0x6D2B79F5u;
  u32 a = rng_a;
  u32 t = (a ^ (a >> 15)) * (1u | a);
  t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
  return (double)(t ^ (t >> 14)) / 4294967296.0;
}

void cw_thermal(int N, int iters, double talus, double rate) {
  int n2 = N * N;
  for (int it = 0; it < iters; it++) {
    for (int i = 0; i < n2; i++) T[i] = H[i];
    for (int z = 1; z < N - 1; z++) for (int x = 1; x < N - 1; x++) {
      int i = z * N + x, li = -1;
      double hi = (double)T[i], ld = 0;
      for (int dz = -1; dz <= 1; dz++) for (int dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        int j = i + dz * N + dx;
        double d = hi - (double)T[j];
        if (d > ld) { ld = d; li = j; }
      }
      if (li >= 0 && ld > talus) {
        double move = (ld - talus) * rate;
        H[i]  = (float)((double)H[i]  - move);
        H[li] = (float)((double)H[li] + move);
      }
    }
  }
}

void cw_hydraulic(int N, u32 seed, int drops) {
  if (drops <= 0) return;
  rng_a = seed ^ 0xdeadbeefu;
  const int R = 2;
  int box[25], boz[25], nb = 0;
  double bw[25], bsum = 0;
  for (int dz = -R; dz <= R; dz++) for (int dx = -R; dx <= R; dx++) {
    double d = js_hypot2((double)dx, (double)dz);
    if (d > R) continue;
    double w = 1 - d / R;
    box[nb] = dx; boz[nb] = dz; bw[nb] = w; nb++; bsum += w;
  }
  for (int i = 0; i < nb; i++) bw[i] /= bsum;

  const double inertia = 0.05, capFac = 3.2, minCap = 0.01,
               eroRate = 0.32, depRate = 0.28, evap = 0.02, grav = 4;
  const int life = 26;

  for (int d = 0; d < drops; d++) {
    double px = 1 + rnd() * (N - 3);
    double pz = 1 + rnd() * (N - 3);
    double dx = 0, dz = 0, speed = 1, water = 1, sed = 0;
    for (int l = 0; l < life; l++) {
      int nx = (int)px, nz = (int)pz;
      if (nx < 1 || nz < 1 || nx >= N - 2 || nz >= N - 2) break;
      double fx = px - nx, fz = pz - nz;
      int i = nz * N + nx;
      double h00 = (double)H[i], h10 = (double)H[i + 1], h01 = (double)H[i + N], h11 = (double)H[i + N + 1];
      double gx = (h10 - h00) * (1 - fz) + (h11 - h01) * fz;
      double gz = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;
      double hOld = h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;

      dx = dx * inertia - gx * (1 - inertia);
      dz = dz * inertia - gz * (1 - inertia);
      double len = js_hypot2(dx, dz);
      if (len < 1e-5) break;
      dx /= len; dz /= len;
      px += dx; pz += dz;
      if (px < 1 || pz < 1 || px >= N - 2 || pz >= N - 2) break;

      int mx = (int)px, mz = (int)pz, j = mz * N + mx;
      double jx = px - mx, jz = pz - mz;
      double hNew = (double)H[j] * (1 - jx) * (1 - jz) + (double)H[j + 1] * jx * (1 - jz)
                  + (double)H[j + N] * (1 - jx) * jz + (double)H[j + N + 1] * jx * jz;
      double dh = hNew - hOld;

      double c0 = -dh * speed * water * capFac;
      double cap = c0 > minCap ? c0 : minCap;
      if (sed > cap || dh > 0) {
        double dep = (dh > 0) ? (dh < sed ? dh : sed) : (sed - cap) * depRate;
        sed -= dep;
        H[i]         = (float)((double)H[i]         + dep * (1 - fx) * (1 - fz));
        H[i + 1]     = (float)((double)H[i + 1]     + dep * fx * (1 - fz));
        H[i + N]     = (float)((double)H[i + N]     + dep * (1 - fx) * fz);
        H[i + N + 1] = (float)((double)H[i + N + 1] + dep * fx * fz);
      } else {
        double e0 = (cap - sed) * eroRate, e1 = -dh;
        double ero = e0 < e1 ? e0 : e1;
        for (int b = 0; b < nb; b++) {
          int bx = nx + box[b], bz = nz + boz[b];
          if (bx < 0 || bz < 0 || bx >= N || bz >= N) continue;
          int k = bz * N + bx;
          double amt = ero * bw[b];
          H[k] = (float)((double)H[k] - amt);
          sed += amt;
        }
      }
      double s2 = speed * speed - dh * grav;
      speed = d_sqrt(s2 > 0 ? s2 : 0);
      water *= (1 - evap);
      if (water < 0.02) break;
    }
  }
}

void cw_smooth(int N, int passes, double k) {
  int n2 = N * N;
  for (int it = 0; it < passes; it++) {
    for (int i = 0; i < n2; i++) T[i] = H[i];
    for (int z = 1; z < N - 1; z++) {
      int r = z * N;
      for (int x = 1; x < N - 1; x++) {
        int i = r + x;
        double c = (double)T[i];
        double avg = (c * 4
          + ((double)T[i - 1] + (double)T[i + 1] + (double)T[i - N] + (double)T[i + N]) * 2
          + (double)T[i - N - 1] + (double)T[i - N + 1] + (double)T[i + N - 1] + (double)T[i + N + 1]) / 16;
        H[i] = (float)(c + (avg - c) * k);
      }
    }
  }
}
