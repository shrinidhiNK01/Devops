import redis
import time
import uuid
from botocore.exceptions import ClientError

class RedisProductionService:
    def __init__(self, host='localhost', port=6379, password=None):
        # Initialize connection pool to enable socket reuse
        self.pool = redis.ConnectionPool(
            host=host, 
            port=port, 
            password=password, 
            decode_responses=True,
            max_connections=50
        )
        self.client = redis.Redis(connection_pool=self.pool)

    def set_cache(self, key, value, ttl_seconds=3600):
        # Store values using atomic set with TTL
        return self.client.set(name=key, value=value, ex=ttl_seconds)

    def get_cache(self, key):
        # Fetch value by key
        return self.client.get(key)

    def acquire_lock(self, lock_name, acquire_timeout=10, lock_timeout=10):
        # Acquire dynamic distributed lock via set-if-not-exists
        identifier = str(uuid.uuid4())
        end = time.time() + acquire_timeout
        while time.time() < end:
            if self.client.set(lock_name, identifier, nx=True, px=lock_timeout * 1000):
                return identifier
            time.sleep(0.1)
        return False

    def release_lock(self, lock_name, identifier):
        # Release lock atomically using Lua script to verify ownership
        lua_release = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        return self.client.eval(lua_release, 1, lock_name, identifier)

    def rate_limit(self, user_id, limit=60, window_seconds=60):
        # Rate limit checks using sorted sets (Sliding Window Algorithm)
        now = time.time()
        key = f"rate_limit:{user_id}"
        pipe = self.client.pipeline()
        # Remove old elements outside the current window
        pipe.zremrangebyscore(key, 0, now - window_seconds)
        # Add current timestamp as both score and value
        pipe.zadd(key, {str(now): now})
        # Fetch current count
        pipe.zcard(key)
        # Set expire TTL to maintain clean keyspace
        pipe.expire(key, window_seconds + 5)
        res = pipe.execute()
        count = res[2]
        return count <= limit
