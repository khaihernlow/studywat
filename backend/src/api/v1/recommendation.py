from fastapi import APIRouter, HTTPException
from src.services.profile_service import ProfileService
from src.services.recommendation_service import RecommendationService
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
profile_service = ProfileService()
recommendation_service = RecommendationService()

@router.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str):
    profile = await profile_service.get_profile(ObjectId(user_id))
    if not profile:
        logger.warning(f"Profile not found for user_id={user_id}")
        raise HTTPException(status_code=404, detail="Profile not found")
    recs = await profile_service.get_courses_recommendation(ObjectId(user_id))
    if not recs:
        logger.info(f"No recommendations available for user_id={user_id}")
        return {"recommendations": [], "message": "No recommendations available yet. Please check back later."}
    return {"recommendations": recs}