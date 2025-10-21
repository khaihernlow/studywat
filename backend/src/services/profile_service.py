from bson import ObjectId
from datetime import datetime
from src.clients.mongo_client import get_database
from src.models.pydantic.profile import Profile, Trait, PyObjectId, ChatMessage, Alert
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class ProfileService:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db["profiles"]

    async def get_profile(self, user_id: ObjectId) -> Profile:
        doc = await self.collection.find_one({"user_id": user_id})
        if doc:
            return Profile(**doc)
        return None

    async def create_profile(self, user_id: ObjectId) -> Profile:
        now = datetime.utcnow()
        doc = {
            "_id": user_id,
            "user_id": user_id,
            "traits": [],
            "updated_at": now,
            "chat_history": []
        }
        await self.collection.insert_one(doc)
        return Profile(**doc)

    async def append_chat_history(self, user_id: ObjectId, message: ChatMessage) -> None:
        await self.collection.update_one(
            {"user_id": user_id},
            {"$push": {"chat_history": message.dict(by_alias=True)}}
        )

    async def get_chat_history(self, user_id: ObjectId) -> List[ChatMessage]:
        doc = await self.collection.find_one({"user_id": user_id})
        if not doc:
            return []
        return [ChatMessage(**msg) for msg in doc.get("chat_history", [])]

    async def clear_chat_history(self, user_id: ObjectId) -> None:
        await self.collection.update_one(
            {"user_id": user_id},
            {"$set": {"chat_history": []}}
        )

    async def merge_trait(self, user_id: ObjectId, trait: Trait) -> Profile:
        now = datetime.utcnow()
        # Add new trait to the list (append)
        result = await self.collection.update_one(
            {"user_id": user_id},
            {"$push": {"traits": trait.dict()}, "$set": {"updated_at": now}}
        )
        # Return updated profile
        doc = await self.collection.find_one({"user_id": user_id})
        return Profile(**doc)

    async def get_courses_recommendation(self, user_id: ObjectId) -> list:
        doc = await self.collection.find_one({"user_id": user_id})
        if doc and "courses_recommendation" in doc:
            return doc["courses_recommendation"]
        return []

    async def update_courses_recommendation(self, user_id: ObjectId, recommendations: list) -> None:
        logger.info(f"Storing {len(recommendations)} recommendations for user_id={user_id}")
        await self.collection.update_one(
            {"user_id": user_id},
            {"$set": {"courses_recommendation": recommendations}}
        )
        logger.info(f"Successfully stored recommendations for user_id={user_id}")
