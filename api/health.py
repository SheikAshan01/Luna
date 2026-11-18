from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        data = {
            "status": "healthy",
            "service": "LUNA AI Cloud Serverless Core",
            "version": "1.0.0",
            "mode": "cloud-serverless",
            "aiStatus": {
                "configured": True,
                "provider": "groq-cloud",
                "online": True
            }
        }
        self.wfile.write(json.dumps(data).encode('utf-8'))
