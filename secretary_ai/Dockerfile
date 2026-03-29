# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP — Secretary AI (Python)
# Smart Secretary Microservice
# ═══════════════════════════════════════════════════════════════

FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; \
    else pip install --no-cache-dir flask flask-cors gunicorn requests python-dotenv; fi

# Copy source
COPY . .

# Fix Python package structure so 'secretary_ai' is importable
RUN mkdir -p secretary_ai && \
    cp smart_secretary.py secretary_ai/smart_secretary.py 2>/dev/null || true && \
    cp __init__.py secretary_ai/__init__.py 2>/dev/null || touch secretary_ai/__init__.py

# Create non-root user
RUN useradd -m -u 1001 appuser && \
    mkdir -p logs && chown -R appuser:appuser /app
USER appuser

ENV PORT=3050

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
    CMD curl -sf http://localhost:3050/health || exit 1

CMD ["python", "server.py"]
