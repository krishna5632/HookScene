# ========================================================
# HookScene: Next-Gen Microdrama Promo Intelligence Studio
# Stage 1: Build React 18 + Tailwind CSS Production SPA
# ========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ========================================================
# Stage 2: Python 3.12 FastAPI Backend Server
# ========================================================
FROM python:3.12-slim

# Set environment configuration
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    HOST=0.0.0.0 \
    DOCKER_CONTAINER=1

WORKDIR /app

# Install system dependencies (curl for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python requirements from backend
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application code and assets
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY results/ ./results/
# Copy compiled React production dist from builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY server.py ./server.py
COPY README.md ./README.md

# Package the in-browser Pyodide package bundle for static fallback
RUN python backend/scripts/utils/build_site.py --package-only

# Create runtime directories for model caches and exported promos
RUN mkdir -p /app/backend/.cache /app/outputs

# Expose server port
EXPOSE 8080

# Health check to ensure API is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Default startup command launches the HookScene FastAPI studio server
CMD ["python", "backend/server.py"]
