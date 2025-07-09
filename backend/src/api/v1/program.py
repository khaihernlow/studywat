from fastapi import APIRouter, Depends, Query, Body
from typing import List, Optional, Dict, Any
from src.clients.mongo_client import get_database
from src.models.pydantic.program import ProgramInDB
from src.models.pydantic.institution import InstitutionInDB
from bson import ObjectId
import logging
logger = logging.getLogger(__name__)

router = APIRouter()

def get_collection(db):
    return db['program']

def get_institution_collection(db):
    return db['institution']

@router.get("/")
async def list_programs(
    field_of_study: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    program_type: Optional[str] = Query(None),
    program_name: Optional[str] = Query(None),
    institution_country: Optional[str] = Query(None),
    institution_type: Optional[str] = Query(None),
    world_rank: Optional[int] = Query(None),
    malaysia_rank: Optional[int] = Query(None),
    institution_name: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort: Optional[str] = Query(None),
    db=Depends(get_database)
):
    logger.info("institution_name param: %s", institution_name)
    match_stage = {}
    if field_of_study:
        match_stage["field_of_study"] = field_of_study
    if location:
        match_stage["location"] = location
    if program_type:
        match_stage["program_type"] = program_type
    if program_name:
        match_stage["program_name"] = program_name

    pipeline = [
        {
            "$lookup": {
                "from": "institution",
                "let": { "programId": "$_id" },
                "pipeline": [
                    { "$match": { "$expr": { "$in": ["$$programId", "$program_ids"] } } }
                ],
                "as": "institution"
            }
        },
        { "$unwind": { "path": "$institution", "preserveNullAndEmptyArrays": True } },
    ]

    # Build a match stage for institution filters
    institution_field_match = {}
    if institution_name:
        if isinstance(institution_name, str):
            institution_name = [institution_name]
        institution_field_match["institution.institution_name"] = {"$in": institution_name}
    if institution_country:
        institution_field_match["institution.institution_country"] = institution_country
    if institution_type:
        institution_field_match["institution.institution_type"] = institution_type
    if world_rank is not None:
        institution_field_match["institution.world_rank"] = world_rank
    if malaysia_rank is not None:
        institution_field_match["institution.malaysia_rank"] = malaysia_rank

    # Add the institution field match after unwind
    if institution_field_match:
        pipeline.append({ "$match": institution_field_match })

    # Add the program field match
    if match_stage:
        pipeline.append({ "$match": match_stage })

    # Add sorting before pagination
    if sort == "az" or sort == "institution_name_az":
        pipeline.append({"$sort": {"institution.institution_name": 1}})
    elif sort == "za" or sort == "institution_name_za":
        pipeline.append({"$sort": {"institution.institution_name": -1}})

    # Add the facet for pagination
    pipeline.append({
        "$facet": {
            "items": [
                { "$skip": (page - 1) * limit },
                { "$limit": limit }
            ],
            "totalCount": [
                { "$count": "count" }
            ]
        }
    })

    collection = get_collection(db)
    results = await collection.aggregate(pipeline).to_list(length=None)
    if results:
        items = results[0]["items"]
        total = results[0]["totalCount"][0]["count"] if results[0]["totalCount"] else 0
    else:
        items = []
        total = 0

    # Convert ObjectId to str for both program and institution, and ensure institution is always present
    for item in items:
        item["_id"] = str(item["_id"])
        if "institution" in item and item["institution"]:
            if "_id" in item["institution"]:
                item["institution"]["_id"] = str(item["institution"]["_id"])
            # Convert all ObjectIds in program_ids to str
            if "program_ids" in item["institution"]:
                item["institution"]["program_ids"] = [
                    str(pid) for pid in item["institution"]["program_ids"]
                ]
        if "institution" not in item:
            item["institution"] = None

    #logger.info("AGGREGATION RESULT ITEMS: %s", items)
    #logger.info("AGGREGATION RESULT TOTAL: %s", total)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("/by-ids", response_model=List[ProgramInDB])
async def get_programs_by_ids(ids: List[str] = Body(...), db=Depends(get_database)):
    object_ids = [ObjectId(id) for id in ids]
    pipeline = [
        {"$match": {"_id": {"$in": object_ids}}},
        {
            "$lookup": {
                "from": "institution",
                "let": {"programId": "$_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$in": ["$$programId", "$program_ids"]}}}
                ],
                "as": "institution"
            }
        },
        {"$unwind": {"path": "$institution", "preserveNullAndEmptyArrays": True}},
    ]
    collection = get_collection(db)
    docs = await collection.aggregate(pipeline).to_list(length=None)
    # Convert ObjectId to str for both program and institution, and ensure institution is always present
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        if "institution" in doc and doc["institution"]:
            if "_id" in doc["institution"]:
                doc["institution"]["_id"] = str(doc["institution"]["_id"])
            if "program_ids" in doc["institution"]:
                doc["institution"]["program_ids"] = [str(pid) for pid in doc["institution"]["program_ids"]]
        if "institution" not in doc:
            doc["institution"] = None
    return [ProgramInDB(**doc) for doc in docs] 