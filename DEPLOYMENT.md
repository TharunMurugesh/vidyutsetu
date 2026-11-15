# VidyutSetu Deployment Guide

## 1. Local Deployment (Standalone Python)
```bash
# 1. Clone repository
git clone https://github.com/PalaniappanR02/vidyutsetu.git
cd vidyutsetu

# 2. Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start workbench server
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Visit `http://localhost:8000` to open the interface.

---

## 2. Docker & Container Deployment
```bash
# Build Docker image
docker build -t vidyutsetu:latest .

# Run container
docker run -d -p 8000:8000 -v $(pwd)/vidyutsetu.db:/app/vidyutsetu.db --name vidyutsetu-app vidyutsetu:latest
```

### Docker Compose
```bash
docker-compose up -d
```

---

## 3. Production Hardening & Reverse Proxy (Nginx)
In production or enterprise utility intranets, deploy behind Nginx or Traefik with TLS/SSL:
```nginx
server {
    listen 80;
    server_name vidyutsetu.utility.internal;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Cloud Deployment (Free Tier / Container PaaS)
VidyutSetu is stateless aside from its SQLite database file (`vidyutsetu.db`), making it deployable on platforms like Render, Railway, Fly.io, or AWS ECS:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Port**: Set by hosting environment (default 8000).
- **Persistent Storage**: Mount volume at `/app/vidyutsetu.db` if audit trail persistence across container restarts is required.
