# Production FastAPI API With PostgreSQL, Redis, Tests, Docker, And Kubernetes

## Phase 1: What Are We Building?

We are building a real API called `orders-api`:

1. FastAPI application.
2. PostgreSQL database.
3. Redis cache.
4. SQLAlchemy models.
5. Alembic migrations.
6. Pytest tests.
7. Dockerfile.
8. Docker Compose.
9. Kubernetes manifests.
10. Metrics endpoint.
11. Structured logging.

## Phase 2: Why Does It Exist?

Most production backends need APIs, databases, caching, health checks, logging, tests, containers, and deployment manifests. This project teaches the complete backend lifecycle.

## Phase 3: Real World Use Case

An e-commerce system needs an Order API. Users create orders, retrieve orders, and internal systems process order events. PostgreSQL stores durable data. Redis caches frequently accessed orders.

## Phase 4: Architecture Diagram

```mermaid
flowchart LR
    Client["Client"] --> API["FastAPI orders-api"]
    API --> Postgres["PostgreSQL"]
    API --> Redis["Redis"]
    API --> Metrics["/metrics"]
    Prometheus["Prometheus"] --> Metrics
    Docker["Docker Compose"] --> API
    Kubernetes["Kubernetes"] --> API
```

## Phase 5: Prerequisites

You need:

1. Python 3.12.
2. Docker.
3. Docker Compose.
4. curl.

## Phase 6: Folder Structure

```text
orders-api/
  app/
    __init__.py
    main.py
    config.py
    database.py
    models.py
    schemas.py
    repository.py
    cache.py
    metrics.py
    logging_config.py
  alembic/
    env.py
    versions/
      0001_create_orders.py
  tests/
    test_health.py
    test_orders.py
  alembic.ini
  requirements.txt
  requirements-dev.txt
  Dockerfile
  docker-compose.yml
  k8s.yaml
  .env.example
```

## Phase 7: Source Code

### requirements.txt

```text
fastapi==0.115.6
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
psycopg[binary]==3.2.3
alembic==1.14.0
pydantic-settings==2.6.1
redis==5.2.1
prometheus-client==0.21.1
python-json-logger==2.0.7
```

### requirements-dev.txt

```text
-r requirements.txt
pytest==8.3.4
httpx==0.28.1
ruff==0.8.3
```

### .env.example

```text
APP_NAME=orders-api
ENVIRONMENT=dev
DATABASE_URL=postgresql+psycopg://orders:orders@postgres:5432/orders
REDIS_URL=redis://redis:6379/0
LOG_LEVEL=INFO
```

### app/config.py

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "orders-api"
    environment: str = "dev"
    database_url: str = "postgresql+psycopg://orders:orders@localhost:5432/orders"
    redis_url: str = "redis://localhost:6379/0"
    log_level: str = "INFO"


settings = Settings()
```

### app/database.py

```python
from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### app/models.py

```python
from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_email: Mapped[str] = mapped_column(String(255), index=True)
    product_code: Mapped[str] = mapped_column(String(64), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(32), default="created")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
```

### app/schemas.py

```python
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class OrderCreate(BaseModel):
    customer_email: EmailStr
    product_code: str = Field(min_length=2, max_length=64)
    quantity: int = Field(gt=0, le=100)
    total_amount: float = Field(gt=0)


class OrderRead(BaseModel):
    id: int
    customer_email: EmailStr
    product_code: str
    quantity: int
    total_amount: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

### app/cache.py

```python
import json
import redis
from app.config import settings

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def get_json(key: str) -> dict | None:
    value = redis_client.get(key)
    if value is None:
        return None
    return json.loads(value)


def set_json(key: str, value: dict, ttl_seconds: int = 60) -> None:
    redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
```

### app/repository.py

```python
from sqlalchemy.orm import Session
from app.models import Order
from app.schemas import OrderCreate


def create_order(db: Session, payload: OrderCreate) -> Order:
    order = Order(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_order(db: Session, order_id: int) -> Order | None:
    return db.get(Order, order_id)
```

### app/metrics.py

```python
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "orders_api_requests_total",
    "Total HTTP requests handled by orders-api",
    ["method", "path", "status"],
)

REQUEST_LATENCY = Histogram(
    "orders_api_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
)
```

### app/logging_config.py

```python
import logging
from pythonjsonlogger import jsonlogger
from app.config import settings


def configure_logging() -> None:
    logger = logging.getLogger()
    logger.setLevel(settings.log_level)
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    handler.setFormatter(formatter)
    logger.handlers.clear()
    logger.addHandler(handler)
```

### app/main.py

```python
import time
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.cache import get_json, set_json
from app.database import get_db
from app.logging_config import configure_logging
from app.metrics import REQUEST_COUNT, REQUEST_LATENCY
from app.repository import create_order, get_order
from app.schemas import OrderCreate, OrderRead

configure_logging()

app = FastAPI(title="orders-api", version="1.0.0")


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    path = request.url.path
    REQUEST_COUNT.labels(request.method, path, response.status_code).inc()
    REQUEST_LATENCY.labels(request.method, path).observe(duration)
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("select 1"))
    return {"status": "ready"}


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/orders", response_model=OrderRead, status_code=201)
def create(payload: OrderCreate, db: Session = Depends(get_db)):
    order = create_order(db, payload)
    return order


@app.get("/orders/{order_id}", response_model=OrderRead)
def read(order_id: int, db: Session = Depends(get_db)):
    cache_key = f"order:{order_id}"
    cached = get_json(cache_key)
    if cached:
        return cached

    order = get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    result = OrderRead.model_validate(order).model_dump()
    set_json(cache_key, result)
    return result
```

## Phase 8: Database Migrations

### alembic.ini

```ini
[alembic]
script_location = alembic
prepend_sys_path = .

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
```

### alembic/env.py

```python
from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
from app.config import settings
from app.database import Base
from app import models

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### alembic/versions/0001_create_orders.py

```python
from alembic import op
import sqlalchemy as sa

revision = "0001_create_orders"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_email", sa.String(length=255), nullable=False),
        sa.Column("product_code", sa.String(length=64), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="created"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_orders_customer_email", "orders", ["customer_email"])
    op.create_index("ix_orders_product_code", "orders", ["product_code"])


def downgrade() -> None:
    op.drop_index("ix_orders_product_code", table_name="orders")
    op.drop_index("ix_orders_customer_email", table_name="orders")
    op.drop_table("orders")
```

## Phase 9: Tests

### tests/test_health.py

```python
from fastapi.testclient import TestClient
from app.main import app


def test_health():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### tests/test_orders.py

```python
from app.schemas import OrderCreate


def test_order_payload_validation():
    payload = OrderCreate(
        customer_email="buyer@example.com",
        product_code="BOOK-001",
        quantity=2,
        total_amount=49.98,
    )
    assert payload.quantity == 2
```

Run tests:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Windows activation:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
pytest
```

## Phase 10: Dockerize

### Dockerfile

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      APP_NAME: orders-api
      ENVIRONMENT: dev
      DATABASE_URL: postgresql+psycopg://orders:orders@postgres:5432/orders
      REDIS_URL: redis://redis:6379/0
      LOG_LEVEL: INFO
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: orders
      POSTGRES_PASSWORD: orders
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7.4-alpine
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Run:

```bash
docker compose up --build
```

Migrate:

```bash
docker compose exec api alembic upgrade head
```

Create order:

```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_email":"buyer@example.com","product_code":"BOOK-001","quantity":2,"total_amount":49.98}'
```

Read order:

```bash
curl http://localhost:8000/orders/1
```

## Phase 11: Kubernetes Manifest

### k8s.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: orders
---
apiVersion: v1
kind: Secret
metadata:
  name: orders-secrets
  namespace: orders
type: Opaque
stringData:
  database-url: postgresql+psycopg://orders:orders@postgres:5432/orders
  redis-url: redis://redis:6379/0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: orders
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: api
          image: orders-api:1.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: orders-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: orders-secrets
                  key: redis-url
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: orders-api
  namespace: orders
spec:
  selector:
    app: orders-api
  ports:
    - port: 80
      targetPort: 8000
```

Apply:

```bash
kubectl apply -f k8s.yaml
kubectl -n orders get pods
kubectl -n orders logs deploy/orders-api
```

## Production Implementation

Production changes:

1. Use managed PostgreSQL such as AWS RDS.
2. Use managed Redis such as ElastiCache.
3. Store secrets in AWS Secrets Manager or External Secrets Operator.
4. Build image in CI.
5. Push to ECR.
6. Deploy to EKS.
7. Configure autoscaling.
8. Configure alerts.

## Monitoring

Metrics endpoint:

```bash
curl http://localhost:8000/metrics
```

Expected output includes:

```text
orders_api_requests_total
orders_api_request_duration_seconds
```

## Debugging

Database connection failure:

```bash
docker compose logs postgres
docker compose exec api python -c "from app.database import engine; print(engine)"
```

Redis connection failure:

```bash
docker compose exec redis redis-cli ping
```

Expected:

```text
PONG
```

API error logs:

```bash
docker compose logs -f api
```

Kubernetes debugging:

```bash
kubectl -n orders describe pod POD_NAME
kubectl -n orders logs POD_NAME
kubectl -n orders get events --sort-by=.lastTimestamp
```

## Security

1. Do not use default database passwords in production.
2. Use TLS to the database where supported.
3. Keep Redis private.
4. Validate all request payloads.
5. Use resource limits.
6. Run as non-root.
7. Use dependency scanning.

## Scaling

Kubernetes scale:

```bash
kubectl -n orders scale deployment orders-api --replicas=5
```

Horizontal Pod Autoscaler:

```bash
kubectl -n orders autoscale deployment orders-api --cpu-percent=70 --min=2 --max=10
```

## Cost Optimization

1. Use small app containers.
2. Use right-sized RDS instance classes.
3. Use Redis only for hot data.
4. Set log retention.
5. Scale dev environments down outside working hours.

## Enterprise Architecture

Production enterprise deployment:

1. API runs in private Kubernetes nodes.
2. Public access enters through an ingress controller and load balancer.
3. Database is in private subnets.
4. Redis is in private subnets.
5. Secrets are pulled from a cloud secret manager.
6. CI/CD deploys immutable image tags.
7. Prometheus scrapes `/metrics`.
8. Grafana dashboards show latency, traffic, errors, saturation.

## Interview Questions

1. Why do APIs need readiness probes?
2. What is the difference between health and readiness?
3. Why use Redis if PostgreSQL already stores data?
4. Why are migrations needed?
5. What does `pool_pre_ping=True` do?
6. Why should secrets not be stored in ConfigMaps?

## Exercises

1. Add `GET /orders` to list orders.
2. Add `PATCH /orders/{id}/status`.
3. Add a database index on `status`.
4. Add a test for invalid quantity.
5. Add a Redis TTL of 5 minutes.
6. Add Prometheus labels for status code.

## Solutions

The API is working when:

```bash
docker compose up --build
docker compose exec api alembic upgrade head
curl http://localhost:8000/health
curl http://localhost:8000/ready
curl http://localhost:8000/metrics
curl -X POST http://localhost:8000/orders -H "Content-Type: application/json" -d '{"customer_email":"buyer@example.com","product_code":"BOOK-001","quantity":2,"total_amount":49.98}'
curl http://localhost:8000/orders/1
```

