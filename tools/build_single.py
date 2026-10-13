#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bundle the split game back into ONE html file (for sharing or uploading).

    python3 tools/build_single.py            ->  island_world_single.html

It inlines css/game.css and every js/*.js that `island_world.html` loads, in the same
order. three.min.js stays a separate file (keep it next to the output), exactly as before.
Edit the files in css/ and js/ — never the bundled output; re-run this to refresh it.
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = os.path.join(ROOT, 'island_world.html')
OUT = os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'island_world_single.html')

def read(path):
    with io.open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()

html = read(ENTRY)

# stylesheet -> <style>
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">',
              lambda m: '<style>\n' + read(m.group(1)) + '</style>', html)

# our scripts -> one inline <script>; each file keeps its own "use strict" header harmlessly
parts = []
def take(m):
    parts.append(read(m.group(1)))
    return ''
html = re.sub(r'<script src="(js/[^"]+)"></script>\n?', take, html)
if not parts:
    sys.exit('no <script src="js/..."> tags found in ' + ENTRY)
bundle = '<script>\n"use strict";\n' + '\n'.join(parts) + '</script>\n'
html = html.replace('</body>', bundle + '</body>', 1)

with io.open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('wrote %s (%d files, %.1f MB)' % (os.path.basename(OUT), len(parts), len(html.encode('utf-8')) / 1e6))
