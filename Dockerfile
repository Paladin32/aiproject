FROM python:3.11-slim AS builder
ENV CMAKE_ARGS="-DGGML_NATIVE=OFF -DGGML_OPENMP=ON"
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake ninja-build && rm -rf /var/lib/apt/lists/*
WORKDIR /build
RUN pip install --no-cache-dir llama-cpp-python==0.3.16

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/data
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local /usr/local
COPY requirements.txt .
RUN pip install --no-cache-dir Flask==3.1.2 gunicorn==23.0.0 'pypdf>=5,<7'
COPY . .
EXPOSE 8080
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 300 app:app"]
