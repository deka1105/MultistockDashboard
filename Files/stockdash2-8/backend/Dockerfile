FROM python:3.11-slim

# WORKDIR is /code, NOT /app — the Python package is named 'app'
# and must be importable as 'app.*', which requires its parent on sys.path
WORKDIR /code

ENV PYTHONPATH=/code
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
