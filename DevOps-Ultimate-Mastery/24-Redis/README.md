# Redis Complete Production-Grade Lab Manual

This module contains the complete, production-ready implementations of Redis Caching, Session Stores, Distributed Locks, and Sliding Window Rate Limiters across four primary backend runtimes: **Python**, **Node.js**, **Java**, and **Go**.

---

## 📂 Folder Structure
- **`src/`** — Native source implementations in Python, Node.js, Java, and Go.
- **`tests/`** — Integration test suites for key-value stores, locks, and limits.
- **`configs/`** — Redis server configs (`redis.conf`) with persistence and security profiles.
- **`scripts/`** — Deployment and health-checking scripts.
- **`deployment/`** — Compose setups.
- **`terraform/`** — IaC scripts provisioning AWS ElastiCache cluster nodes.
- **`kubernetes/`** — StatefulSet manifests for clustering.
- **`helm/`** — Custom Helm charts.
- **`monitoring/`** — Prometheus AlertManager configs and dashboards.
