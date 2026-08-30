# Prebuilt hardened Python execution sandbox for TayDau Force
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

# Install pinned runtime & test dependencies (NO runtime pip install permitted)
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.30.6 \
    pydantic==2.9.2 \
    sqlalchemy==2.0.35 \
    aiosqlite==0.20.0 \
    pytest==8.3.3 \
    pytest-asyncio==0.24.0 \
    httpx==0.27.2

# Create non-root user (uid 10001)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -m appuser

# Set up clean workspace
WORKDIR /workspace
RUN chown -R appuser:appgroup /workspace

USER appuser:appgroup

CMD ["pytest", "-v", "--tb=short"]
