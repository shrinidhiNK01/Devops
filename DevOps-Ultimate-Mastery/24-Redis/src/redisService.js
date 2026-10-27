const Redis = require('ioredis');

class RedisService {
  constructor(options = {}) {
    this.client = new Redis({
      host: options.host || '127.0.0.1',
      port: options.port || 6379,
      password: options.password || null,
      maxRetriesPerRequest: 3
    });
  }

  async setCache(key, value, ttlSeconds = 3600) {
    return this.client.set(key, value, 'EX', ttlSeconds);
  }

  async getCache(key) {
    return this.client.get(key);
  }

  async acquireLock(lockName, timeoutMs = 10000) {
    const token = Math.random().toString(36).substring(2);
    const result = await this.client.set(lockName, token, 'PX', timeoutMs, 'NX');
    return result === 'OK' ? token : null;
  }

  async releaseLock(lockName, token) {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    return this.client.eval(luaScript, 1, lockName, token);
  }
}

module.exports = RedisService;
