"""
Orchestrator Service for StudyWat Backend.
Coordinates user message handling, profile management, conversation turn generation, and evaluation.
All chat/advising flows should go through this service.
"""
from bson import ObjectId
from src.services.profile_service import ProfileService
from src.services.conversation_service import ConversationService
from src.services.evaluation_service import EvaluationService
from src.services.recommendation_service import RecommendationService
import asyncio
from src.models.pydantic.profile import Trait, ChatMessage, Alert, AlertType
from datetime import datetime
from src.clients.mongo_client import get_database
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class OrchestratorService:
    """
    Central orchestrator for user chat/turn flows.
    Handles user messages, profile updates, conversation turns, evaluation, and chat history.
    """
    def __init__(self):
        self.profile_service = ProfileService()
        self.conversation_service = ConversationService()
        self.evaluation_service = EvaluationService()
        self.recommendation_service = RecommendationService()
        self.db = get_database()

    async def process_user_message(
        self, 
        user_id: ObjectId, 
        user_message: str, 
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> dict:
        """
        Process a user message: update profile, save chat, evaluate traits, and return updated profile and alerts.
        """
        profile = await self.profile_service.get_profile(user_id)
        if not profile:
            profile = await self.profile_service.create_profile(user_id)
            logger.info(f"Created new profile for user_id={user_id}")

        # Save user message to chat_history
        user_msg = ChatMessage(
            role="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            alert=[]
        )
        await self.profile_service.append_chat_history(user_id, user_msg)

        alert_for_update = None
        if user_message:
            last_turn = self._get_last_assistant_message(conversation_history)
            eval_result = await self.evaluation_service.evaluate_answer(last_turn, user_message)
            if (
                eval_result
                and isinstance(eval_result, dict)
                and eval_result.get("trait")
                and eval_result.get("label")
                and eval_result.get("confidence") is not None
                and eval_result.get("evidence")
                and eval_result.get("timestamp")
            ):
                trait = Trait(**eval_result)
                profile = await self.profile_service.merge_trait(user_id, trait)
                logger.info(f"Profile updated with new trait for user_id={user_id}")
                alert_for_update = Alert(type=AlertType.profile_update, message="Profile has been updated.")

                # Trigger recommendations in the background
                if len(profile.traits) >= 1:
                    asyncio.create_task(self._update_recommendations(user_id, profile))

        logger.info("returning message response!")
        return {
            "profile": profile,
            "alert": [alert_for_update] if alert_for_update else []
        }

    async def _update_recommendations(self, user_id: ObjectId, profile):
        """
        Generate and store recommendations for the user profile, but only update if the new list is not smaller than the existing one.
        """
        try:
            logger.info(f"Starting recommendation update for user_id={user_id}")
            recs = await self.recommendation_service.recommend_courses(profile.dict())
            logger.info(f"Generated {len(recs)} recommendations for user_id={user_id}")
            existing_recs = await self.profile_service.get_courses_recommendation(user_id)
            if len(recs) >= len(existing_recs):
                await self.profile_service.update_courses_recommendation(user_id, recs)
                logger.info(f"Updated courses_recommendation for user_id={user_id}")
            else:
                logger.info(f"Did not update courses_recommendation for user_id={user_id} because new recommendations ({len(recs)}) < existing ({len(existing_recs)})")
        except Exception as e:
            logger.error(f"Failed to update courses_recommendation for user_id={user_id}: {e}")

    @staticmethod
    def _get_last_assistant_message(conversation_history: Optional[List[Dict[str, Any]]]) -> Optional[str]:
        """
        Helper to get the last assistant message from conversation history.
        """
        if conversation_history:
            for msg in reversed(conversation_history):
                if msg.get("role") == "assistant":
                    return msg.get("content")
        return None

    async def get_chat_history(self, user_id: ObjectId) -> List[Dict[str, Any]]:
        """
        Fetch the user's chat/turn history from the profile document.
        Returns a list of conversation messages.
        """
        return await self.profile_service.get_chat_history(user_id)

    async def clear_chat_history(self, user_id: ObjectId) -> None:
        """
        Clear the user's chat/turn history in the profile document.
        """
        await self.profile_service.clear_chat_history(user_id) 