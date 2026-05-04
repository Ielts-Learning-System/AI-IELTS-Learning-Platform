FROM python:3.12-slim

WORKDIR /app

# System libraries required by pdf2image (poppler) and PaddleOCR (OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3012

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3012"]
