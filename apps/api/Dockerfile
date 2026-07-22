# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Researo API — production image
#
# Includes real local embeddings (sentence-transformers / bge-small) and a
# cross-encoder reranker, with the model weights baked into the image so the
# first request is fast and works without runtime network access.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.hf_cache

WORKDIR /app

# Build tooling only needed while installing wheels; kept in a single layer.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# --- Python dependencies -------------------------------------------------
# Core deps first (best layer caching), then the AI extras that make
# embeddings/reranker/token-counting real. torch is pulled from the CPU
# wheel index to avoid the multi-GB CUDA build.
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install --extra-index-url https://download.pytorch.org/whl/cpu \
        sentence-transformers==3.3.1 \
        tiktoken==0.8.0 \
        "chromadb>=0.5,<0.6"

# --- Bake model weights into the image -----------------------------------
# bge-small-en-v1.5 (embeddings) + ms-marco cross-encoder (reranker).
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('BAAI/bge-small-en-v1.5'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# --- Application code -----------------------------------------------------
COPY app ./app
COPY scripts ./scripts

# Persistent state lives under /data — mount a Railway volume there so the
# SQLite DB, vector store and uploads survive redeploys. (Use a managed
# Postgres DATABASE_URL instead of SQLite for multi-instance deployments.)
ENV APP_ENV=production \
    USE_LOCAL_EMBEDDINGS=true \
    DATABASE_URL=sqlite+aiosqlite:////data/researo.db \
    CHROMA_PERSIST_DIR=/data/chroma_store \
    UPLOAD_DIR=/data/uploads \
    CORS_ORIGINS=*
RUN mkdir -p /data/uploads /data/chroma_store

EXPOSE 8000

# Railway (and most PaaS) inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
