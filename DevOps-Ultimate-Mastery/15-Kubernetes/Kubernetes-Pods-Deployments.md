# 15-Kubernetes - Kubernetes Pods and Deployments

Welcome to this comprehensive guide on **Kubernetes Pods and Deployments**. This module is designed to take you from a complete beginner to a staff platform engineer.

---

## 1. Theory
Kubernetes is an open-source container orchestration engine managing containerized applications across cluster nodes.

---

## 2. Architecture
K8s Control Plane components (API Server, Controller Manager, Scheduler, etcd) coordinate with Worker Node Kubelets.

---

## 3. Diagrams
```
[API Server] <---> [etcd Store]
       | 
   [Scheduler] ---> [Node Kubelet] ---> [Docker Pod Container]
```

---

## 4. Source Code Configuration
```yaml
# Kubernetes deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-tier
  template:
    metadata:
      labels:
        app: web-tier
    spec:
      containers:
      - name: app-node
        image: nginx:alpine
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
        ports:
        - containerPort: 80
```

---

## 5. YAML & Dockerfiles
```yaml
# Kubernetes service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web-tier
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

---

## 6. Best Practices
Configure readiness and liveness probes. Store database passwords in Secrets.

---

## 7. Interview Questions
- **Q1:** What is a DaemonSet?
  *Answer:* A DaemonSet ensures that a copy of a specific Pod runs on all nodes in the cluster.

---

## 8. Exercises
- **Exercise 1:** Install and configure a local Kubernetes Pods and Deployments worker node.
- **Exercise 2:** Debug container termination alerts or slow database transaction speeds.

---

## 9. Solutions
- **Solution 1:** Set configuration key/values inside standard environment parameters.
- **Solution 2:** Inspect container log files or add database indexing parameters.

---

## 10. Troubleshooting Guides
- **Issue:** Pod stuck in ImagePullBackOff state.
  *Resolution:* Check if container image path is correct and verify ECR/DockerHub access rights.

---

## 11. Runbooks
- **Alert:** Container resource saturation.
  *Action:* Check CPU usage, run autoscaler metrics, and scale replicas up.

---

## 12. Summary
In this chapter, we studied Kubernetes Pods and Deployments, reviewing platform infrastructure patterns, deployments, and troubleshooting runbooks.
