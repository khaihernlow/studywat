from fastapi import APIRouter
from pydantic import BaseModel
from ...services.gemini_service import GeminiService

router = APIRouter()
gemini_service = GeminiService()

class ChatRequest(BaseModel):
    message: str
    user_id: str

@router.post("/")
async def chat(request: ChatRequest):
    # Generate response from Gemini with conversation history
    ai_response = await gemini_service.generate_response(request.message, request.user_id)
    return {"message": ai_response}