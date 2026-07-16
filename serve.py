import http.server, socketserver, os, posixpath, urllib.parse

PORT = 8160
ROOT = os.path.dirname(os.path.abspath(__file__))

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        rel = posixpath.normpath(urllib.parse.unquote(path)).lstrip('/')
        abs_path = os.path.join(ROOT, rel)
        if path != '/' and not os.path.exists(abs_path):
            self.path = '/index.html'
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

os.chdir(ROOT)
with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
    print(f"serving on http://localhost:{PORT}")
    httpd.serve_forever()
