import os
import json
import logging
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)


async def get_cached_data(key: str):
    """
   taking data from catch with key  if dont exist  none if exist dict json
    """
    try:
        data = await redis_client.get(key)
        if data:
            logging.info(f"⚡ [CACHE HIT] Found {key} in Redis")
            return json.loads(data) 

        logging.info(f"🐢 [CACHE MISS] {key} not found in Redis")
        return None
        
    except Exception as e:
        logging.error(f"❌ Redis GET Error for {key}: {e}")
        return None 

async def set_cached_data(key: str, data: dict, ttl_seconds: int = 300):
    """
   need key and data to save in cached an ttl for to limit live time of the data
    """
    try:
        json_data = json.dumps(data) 
        
        await redis_client.set(name=key, value=json_data, ex=ttl_seconds)
        
        logging.info(f"💾 [CACHE SET] Saved {key} to Redis for {ttl_seconds} seconds")
        
    except Exception as e:
        logging.error(f"❌ Redis SET Error for {key}: {e}")        