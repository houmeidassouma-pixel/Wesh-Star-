FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY voice-models.json .
COPY server.py .
COPY install-models.sh .
RUN mkdir -p /models /outputs
EXPOSE 8002
CMD ["uvicorn","server:app","--host","0.0.0.0","--port","8002"]
