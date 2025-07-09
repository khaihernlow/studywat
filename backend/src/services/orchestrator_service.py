"""
Orchestrator Service for StudyWat Backend.
Coordinates user message handling, profile management, conversation turn generation, and evaluation.
All chat/advising flows should go through this service.
"""
from bson import ObjectId
from src.services.profile_service import ProfileService
from src.services.conversation_service import ConversationService
from src.services.evaluation_service import EvaluationService
from src.models.pydantic.profile import Trait, ChatMessage, Alert, AlertType
from datetime import datetime
from src.clients.mongo_client import get_database
from typing import Dict, Any, List
import time
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
        self.db = get_database()

    async def process_user_message(self, user_id: ObjectId, user_message: str, conversation_history=None) -> dict:
        logger.debug("IN process_user_message, about to await get_profile")
        profile = await self.profile_service.get_profile(user_id)
        logger.debug("IN process_user_message, got profile:", profile)
        if not profile:
            logger.debug("IN process_user_message, about to await create_profile")
            profile = await self.profile_service.create_profile(user_id)
            logger.debug("IN process_user_message, got new profile:", profile)

        # Save user message to chat_history
        user_msg = ChatMessage(
            role="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            alert=[]
        )
        logger.debug("IN process_user_message, about to await append_chat_history (user)")
        await self.profile_service.append_chat_history(user_id, user_msg)
        logger.debug("IN process_user_message, appended user message")

        # Evaluate answer for every user message
        alert_for_update = None
        if user_message:
            last_turn = None
            if conversation_history:
                for msg in reversed(conversation_history):
                    if msg.get("role") == "assistant":
                        last_turn = msg.get("content")
                        break
            if not last_turn:
                last_turn = None
            logger.debug("IN process_user_message, about to await evaluation_service.evaluate_answer")
            eval_result = await self.evaluation_service.evaluate_answer(last_turn, user_message)
            logger.debug(f"[DEBUG] eval_result: {eval_result} (type: {type(eval_result)})")
            if (
                eval_result
                and isinstance(eval_result, dict)
                and eval_result.get("trait")
                and eval_result.get("label")
                and eval_result.get("confidence") is not None
                and eval_result.get("evidence")
                and eval_result.get("timestamp")
            ):
                logger.debug(f"[TRAIT INSERTED] {eval_result}")
                trait = Trait(**eval_result)
                logger.debug("IN process_user_message, about to await merge_trait")
                profile = await self.profile_service.merge_trait(user_id, trait)
                logger.debug("IN process_user_message, merged trait, got profile:", profile)
                alert_for_update = Alert(type=AlertType.profile_update, message="Profile has been updated.")
            else:
                logger.debug(f"[TRAIT SKIPPED] No valid trait found or missing required fields. eval_result: {eval_result}")
                # No alert, just proceed

        return {
            "profile": profile,
            "alert": [alert_for_update] if alert_for_update else []
        }

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