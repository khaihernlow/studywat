from fastapi import APIRouter, Depends, HTTPException
from src.services.profile_service import ProfileService
from src.api.v1.auth import get_current_user
from bson import ObjectId
import logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/traits", response_model=list)
async def get_profile_traits(current_user=Depends(get_current_user)):
    user_id = current_user["_id"] if isinstance(current_user["_id"], ObjectId) else ObjectId(current_user["_id"])
    service = ProfileService()
    profile = await service.get_profile(user_id)
    if not profile:
        return []
    return profile.traits
