import { startLoop } from './loop.ts';
import { isDown } from './input.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;

/** CSS pixels; the canvas backing store is scaled by devicePixelRatio. */
let width = 0;
let height = 0;

// ResizeObserver, not a window 'resize' listener: it also fires once the canvas
// is first laid out. Reading innerWidth at module-eval time can see 0 when the
// script runs before layout, which leaves a 0x0 backing store forever.
new ResizeObserver(() => {
  const dpr = devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  if (width === 0 || height === 0) return; // not laid out yet; a later callback has real numbers
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}).observe(canvas);

const SPEED = 260; // px/s
const player = { x: 100, y: 100, px: 100, py: 100, r: 16 };

function update(dt: number) {
  if (width === 0) return; // pre-layout; clamping against 0 would slam the player into a corner
  player.px = player.x;
  player.py = player.y;

  const dx = (isDown('ArrowRight') || isDown('KeyD') ? 1 : 0) - (isDown('ArrowLeft') || isDown('KeyA') ? 1 : 0);
  const dy = (isDown('ArrowDown') || isDown('KeyS') ? 1 : 0) - (isDown('ArrowUp') || isDown('KeyW') ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;

  player.x += (dx / len) * SPEED * dt;
  player.y += (dy / len) * SPEED * dt;

  player.x = Math.min(Math.max(player.x, player.r), width - player.r);
  player.y = Math.min(Math.max(player.y, player.r), height - player.r);
}

function render(alpha: number) {
  ctx.fillStyle = '#10141c';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#e8c37a';
  ctx.beginPath();
  ctx.arc(
    player.px + (player.x - player.px) * alpha,
    player.py + (player.y - player.py) * alpha,
    player.r,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

startLoop(60, update, render);
