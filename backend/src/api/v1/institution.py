from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from src.clients.mongo_client import get_database
from src.models.pydantic.institution import InstitutionInDB

router = APIRouter()

def get_collection(db):
    return db['institutions']

@router.get("/", response_model=List[InstitutionInDB])
async def list_institutions(
    country: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    db=Depends(get_database)
):
    query = {}
    if country:
        query["institution_country"] = country
    if type:
        query["institution_type"] = type
    if name:
        query["institution_name"] = name
    cursor = get_collection(db).find(query)
    docs = []
    async for doc in cursor:
        doc['_id'] = str(doc['_id'])
        # Convert program_ids to string
        doc['program_ids'] = [str(pid["$oid"]) if isinstance(pid, dict) and "$oid" in pid else str(pid) for pid in doc.get('program_ids', [])]
        doc['institution_country'] = doc.get('institution_country') or ""
        doc['institution_type'] = doc.get('institution_type') or ""
        docs.append(InstitutionInDB(**doc))
    return docs

@router.get("/countries", response_model=List[str])
async def list_countries(db=Depends(get_database)):
    countries = await get_collection(db).distinct("institution_country", {"institution_country": {"$ne": None}})
    return [c for c in countries if c]

@router.get("/names", response_model=List[str])
async def list_institution_names(db=Depends(get_database)):
    names = await get_collection(db).distinct("institution_name", {"institution_name": {"$ne": None}})
    return [n for n in names if n] 