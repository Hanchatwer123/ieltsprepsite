from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = 8000

if __name__ == "__main__":
    server = ThreadingHTTPServer(('0.0.0.0', PORT), SimpleHTTPRequestHandler)
    print(f"Serving on http://0.0.0.0:{PORT}")
    server.serve_forever()
