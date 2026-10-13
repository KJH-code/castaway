#!/usr/bin/env python3
"""Local test server for CASTAWAY that never lets the browser cache anything.

    python3 tools/serve.py [port]

Plain `python3 -m http.server` lets the browser keep old .js files, so an edit
can look like it did nothing. The game itself does not need a server at all —
double-clicking the HTML file works. This is only for testing while editing.
"""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
