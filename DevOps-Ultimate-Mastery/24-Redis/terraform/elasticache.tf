resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "prod-redis-cluster"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [var.security_group_id]
  subnet_group_name    = var.subnet_group_name
}
