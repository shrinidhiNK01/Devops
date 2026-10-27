# 15-Kubernetes: Complete Enterprise Implementation & Theory

## 1. Deep Theory: Kubernetes Architecture
Kubernetes (K8s) is a distributed system orchestration engine.
- **Control Plane:** The brain. 
  - `kube-apiserver`: The frontend. All traffic goes here.
  - `etcd`: The brain's memory. A highly-available key-value store holding cluster state.
  - `kube-scheduler`: Decides WHICH node a new Pod should run on based on resources.
  - `kube-controller-manager`: Maintains the desired state (e.g., restarting crashed pods).
- **Worker Nodes:** The muscle.
  - `kubelet`: The agent on each node communicating with the apiserver.
  - `kube-proxy`: Maintains network rules on nodes.

## 2. Advanced Kubernetes Deployment YAML
This is an enterprise-grade Deployment manifest with zero-downtime rolling updates, resource limits, anti-affinity rules, and health probes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: production
  labels:
    app: backend
    tier: api
spec:
  # Maintain exactly 5 replicas across the cluster
  replicas: 5
  
  # Zero-downtime deployment strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1       # Allow 1 extra pod during update
      maxUnavailable: 0 # Never drop below 5 available pods during update
      
  selector:
    matchLabels:
      app: backend
      
  template:
    metadata:
      labels:
        app: backend
    spec:
      # Spread pods across different Availability Zones to prevent AZ-failure downtime
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend
              topologyKey: "topology.kubernetes.io/zone"
              
      containers:
      - name: api-container
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/api:v2.1.4
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
        
        # Security Context: Prevent privilege escalation
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          
        # Resource Limits (Crucial for preventing Noisy Neighbors)
        resources:
          requests:
            cpu: "250m"      # Request 1/4th of a CPU core
            memory: "512Mi"  # Request 512 Megabytes of RAM
          limits:
            cpu: "500m"      # Hard cap at 1/2 CPU core
            memory: "1Gi"    # Hard cap at 1 Gigabyte (OOM killed if exceeded)
            
        # Liveness Probe: Restarts the pod if the app deadlocks
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
          
        # Readiness Probe: Stops sending traffic to the pod if it's too busy
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 3. Complete Implementation Commands
```bash
# 1. Create the production namespace
kubectl create namespace production

# 2. Apply the advanced deployment
kubectl apply -f deployment.yaml

# 3. Watch the rolling update happen in real-time
kubectl rollout status deployment/backend-api -n production

# 4. Expose the deployment to the internet via an AWS Load Balancer
kubectl expose deployment backend-api -n production --type=LoadBalancer --port=80 --target-port=8080

# 5. Check exactly which node each pod was scheduled onto (verifying anti-affinity)
kubectl get pods -n production -o wide
```
