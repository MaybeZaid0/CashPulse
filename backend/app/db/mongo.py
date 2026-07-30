from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None

def get_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(settings.MONGODB_URL)

def get_db():
    return get_client()[settings.DATABASE_NAME]
