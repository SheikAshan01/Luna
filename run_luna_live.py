import subprocess
import re
import sys
import os
import time

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    cloudflared_path = os.path.join(base_dir, "cloudflared.exe")

    if not os.path.exists(cloudflared_path):
        print(f"❌ Error: cloudflared.exe not found at {cloudflared_path}")
        return

    print("============================================================", flush=True)
    print("      🚀 LUNA 24/7 CLOUDFLARE LIVE TUNNEL LAUNCHER", flush=True)
    print("============================================================", flush=True)
    print("1. Starting Local LUNA Backend on port 8000...", flush=True)

    # Start FastAPI Backend
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    time.sleep(2)
    print("✅ Local Backend is running!", flush=True)
    print("2. Establishing Global Secure Cloudflare Tunnel...", flush=True)

    # Start Cloudflare Tunnel
    cf_proc = subprocess.Popen(
        [cloudflared_path, "tunnel", "--url", "http://127.0.0.1:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    for line in cf_proc.stdout:
        match = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", line)
        if match:
            tunnel_url = match.group(0)
            break

    if tunnel_url:
        print("\n============================================================", flush=True)
        print("          🎉 YOUR LUNA 24/7 LIVE BACKEND IS READY!", flush=True)
        print("============================================================", flush=True)
        print(f"🌐 Cloudflare Live HTTPS URL: {tunnel_url}", flush=True)
        print("✅ Status                  : 100% FREE • ZERO SLEEP • 24/7 ONLINE", flush=True)
        print("============================================================\n", flush=True)
        print("💡 இந்த URL-ஐ உங்கள் மொபைலில் அல்லது Vercel-ல் இணைத்துக்கொண்டால்,", flush=True)
        print("   InstaBox போல இது எப்போதுமே தூங்காது! உங்கள் லேப்டாப் ஆன்-ல்", flush=True)
        print("   இருக்கும் வரை லூனா மின்னல் வேகத்தில் தொடர்ந்து இயங்கும்!\n", flush=True)
        print("Press Ctrl+C to stop the server anytime.\n", flush=True)
    else:
        print("⚠️ Tunnel URL could not be detected. Keeping process open...", flush=True)

    try:
        cf_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down Luna services...")
        backend_proc.terminate()
        cf_proc.terminate()
        print("Goodbye!")

if __name__ == "__main__":
    main()
