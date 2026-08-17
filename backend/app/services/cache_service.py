import os
import json
import time
import logging
import threading
from typing import Any, Optional
from dotenv import load_dotenv

# Try importing redis.asyncio gracefully
try:
    import redis.asyncio as redis
except ImportError:
    redis = None

# Try importing cachetools TTLCache gracefully
try:
    from cachetools import TTLCache
except ImportError:
    # Fallback bounded TTL cache if cachetools is unavailable
    class TTLCache(dict):
        def __init__(self, maxsize: int = 1000, ttl: int = 300):
            super().__init__()
            self.maxsize = maxsize
            self.ttl = ttl
            self._expires = {}

        def __getitem__(self, key):
            if key in self._expires and time.time() > self._expires[key]:
                del self[key]
                del self._expires[key]
                raise KeyError(key)
            return super().__getitem__(key)

        def __setitem__(self, key, value):
            if len(self) >= self.maxsize and key not in self:
                oldest = next(iter(self))
                del self[oldest]
                self._expires.pop(oldest, None)
            super().__setitem__(key, value)
            self._expires[key] = time.time() + self.ttl

        def get(self, key, default=None):
            try:
                return self[key]
            except KeyError:
                return default

load_dotenv()
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL")

# Initialize Redis client if configured and library available
redis_client = None
if REDIS_URL and redis is not None:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    except Exception as e:
        logger.warning(f"⚠️ Redis initialization warning: {e}")

# Production-grade Bounded L1 In-Memory Cache (Bounded to 2,000 entries with 300s default TTL)
_l1_lock = threading.Lock()
_l1_cache = TTLCache(maxsize=2000, ttl=300)

async def get_cached_data(key: str) -> Optional[Any]:
    """
    Two-tier cache lookup:
    1. Check bounded thread-safe in-memory L1 cache (sub-millisecond, zero network latency).
    2. Fallback to Redis L2 cache if configured, with error tolerance.
    """
    # 1. Check L1 in-memory cache
    with _l1_lock:
        val = _l1_cache.get(key)
        if val is not None:
            return val

    # 2. Check L2 Redis cache
    if redis_client:
        try:
            data = await redis_client.get(key)
            if data:
                parsed = json.loads(data)
                # Store in L1 cache for subsequent instantaneous reads
                with _l1_lock:
                    _l1_cache[key] = parsed
                return parsed
        except Exception as e:
            logger.debug(f"Redis GET Error for {key}: {e}")

    return None

async def set_cached_data(key: str, data: Any, ttl_seconds: int = 300) -> None:
    """
    Save data to bounded L1 in-memory cache and L2 Redis cache.
    """
    # 1. Save to L1 in-memory cache
    with _l1_lock:
        _l1_cache[key] = data

    # 2. Save to L2 Redis cache
    if redis_client:
        try:
            json_data = json.dumps(data)
            await redis_client.set(name=key, value=json_data, ex=ttl_seconds)
        except Exception as e:
            logger.debug(f"Redis SET Error for {key}: {e}")

async def delete_cached_data(key: str) -> None:
    """
    Invalidate key from both L1 and L2 caches.
    """
    with _l1_lock:
        try:
            del _l1_cache[key]
        except KeyError:
            pass

    if redis_client:
        try:
            await redis_client.delete(key)
        except Exception as e:
            logger.debug(f"Redis DELETE Error for {key}: {e}")