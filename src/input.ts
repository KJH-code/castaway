const down = new Set<string>();

addEventListener('keydown', (e) => down.add(e.code));
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => down.clear());

export const isDown = (code: string) => down.has(code);
