/** Fixed-step loop: update() runs at exactly `hz`, render(alpha) interpolates. */
export function startLoop(
  hz: number,
  update: (dt: number) => void,
  render: (alpha: number) => void,
): () => void {
  const step = 1 / hz;
  // ponytail: cap catch-up at 5 steps so a backgrounded tab doesn't spiral. Raise if slow frames are legitimate.
  const maxSteps = 5;
  let last = performance.now() / 1000;
  let acc = 0;
  let frame = 0;

  const tick = (nowMs: number) => {
    frame = requestAnimationFrame(tick);
    const now = nowMs / 1000;
    acc += now - last;
    last = now;

    let steps = 0;
    while (acc >= step && steps < maxSteps) {
      update(step);
      acc -= step;
      steps++;
    }
    if (acc >= step) acc = 0; // hit the catch-up cap; drop the debt instead of spiralling
    render(acc / step);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
