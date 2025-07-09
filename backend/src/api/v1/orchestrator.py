from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from bson import ObjectId
from typing import List, Dict, Any
from src.services.orchestrator_service import OrchestratorService
from src.api.v1.auth import get_current_user
from src.services.profile_service import ProfileService
from src.services.conversation_service import ConversationService
import time
from datetime import datetime
from src.models.pydantic.profile import ChatMessage, Alert
import logging
logger = logging.getLogger(__name__)

router = APIRouter()
orchestrator_service = OrchestratorService()
profile_service = ProfileService()
conversation_service = ConversationService()

class OrchestratorMessageRequest(BaseModel):
    message: str
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list, description="List of conversation messages so far, each with role and content.")

class OrchestratorMessageResponse(BaseModel):
    next_turn: str
    profile: dict
    assistant_msg: dict

# Remove the /message endpoint and its related code

@router.post("/stream-turn")
async def stream_next_turn(request: Request, current_user=Depends(get_current_user)):
    try:
        body = await request.json()
        user_id = ObjectId(str(current_user["_id"]))
        conversation_history = body.get("conversation_history", [])
        user_message = body.get("message", "")

        result = await orchestrator_service.process_user_message(
            user_id,
            user_message,
            conversation_history
        )
        profile = result["profile"]
        alert_data = result.get("alert", [])
        alert_list = []
        if alert_data and isinstance(alert_data, list):
            alert_list = [Alert(**a) if isinstance(a, dict) else a for a in alert_data]

        # Streaming generator
        async def event_generator_and_save():
            import json
            assistant_chunks = []
            # Yield alert info as the first chunk (always an array)
            yield json.dumps({"alert": [a.dict() for a in alert_list]}) + "\n"
            async for chunk in conversation_service.stream_next_turn(profile, conversation_history):
                assistant_chunks.append(chunk)
                yield chunk
            # Only insert the assistant message here
            msg = ChatMessage(
                role="assistant",
                content=''.join(assistant_chunks),
                timestamp=datetime.utcnow(),
                alert=alert_list
            )
            await profile_service.append_chat_history(user_id, msg)
        return StreamingResponse(event_generator_and_save(), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to stream next turn")

@router.post("/alert-info")
async def alert_info(request: Request, current_user=Depends(get_current_user)):
    try:
        body = await request.json()
        user_id = ObjectId(str(current_user["_id"]))
        conversation_history = body.get("conversation_history", [])
        user_message = body.get("message", "")
        result = await orchestrator_service.process_user_message(
            user_id,
            user_message,
            conversation_history
        )
        return {
            "alert": result.get("alert"),
            "profile": result["profile"].dict(by_alias=True)
        }
    except Exception as e:
        logger.error(f"Alert info error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get alert info")

@router.get("/history")
async def get_chat_history(current_user=Depends(get_current_user)):
    try:
        user_id = ObjectId(str(current_user["_id"]))
        conversations = await orchestrator_service.get_chat_history(user_id)
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Error getting chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get chat history")

@router.delete("/history")
async def clear_chat_history(current_user=Depends(get_current_user)):
    try:
        user_id = ObjectId(str(current_user["_id"]))
        await orchestrator_service.clear_chat_history(user_id)
        return {"message": "Chat history cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to clear chat history") 