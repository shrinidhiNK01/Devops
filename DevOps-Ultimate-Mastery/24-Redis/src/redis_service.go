package main

import (
	"context"
	"time"
	"github.com/go-redis/redis/v8"
)

type RedisService struct {
	client *redis.Client
}

func NewRedisService(addr string, password string) *RedisService {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})
	return &RedisService{client: rdb}
}

func (r *RedisService) SetCache(ctx context.Context, key string, val string, ttl time.Duration) error {
	return r.client.Set(ctx, key, val, ttl).Err()
}

func (r *RedisService) GetCache(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}
