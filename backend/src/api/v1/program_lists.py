from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from src.clients.mongo_client import get_database
from src.models.pydantic.program_list import ProgramListCreate, ProgramListUpdate, ProgramListInDB
from bson import ObjectId

router = APIRouter()

def get_collection(db):
    return db['program_lists']

@router.post("/", response_model=ProgramListInDB)
async def create_program_list(data: ProgramListCreate, db=Depends(get_database)):
    now = datetime.utcnow()
    doc = data.dict()
    doc['created_at'] = now
    doc['updated_at'] = now
    # Convert user_id to ObjectId if it's a valid ObjectId string
    try:
        doc['user_id'] = ObjectId(doc['user_id'])
    except Exception:
        pass  # fallback to string if not a valid ObjectId
    result = await get_collection(db).insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    # Convert user_id back to string for the response
    doc['user_id'] = str(doc['user_id'])
    return ProgramListInDB(**doc)

@router.get("/", response_model=List[ProgramListInDB])
async def list_program_lists(user_id: str, db=Depends(get_database)):
    # Try to query by ObjectId, fallback to string
    try:
        query = {"user_id": ObjectId(user_id)}
    except Exception:
        query = {"user_id": user_id}
    cursor = get_collection(db).find(query)
    docs = []
    async for doc in cursor:
        doc['_id'] = str(doc['_id'])
        doc['user_id'] = str(doc['user_id']) if 'user_id' in doc else None
        # Convert all program_ids to string if present
        if 'program_ids' in doc:
            doc['program_ids'] = [str(pid) for pid in doc['program_ids']]
        docs.append(ProgramListInDB(**doc))
    return docs

@router.get("/{list_id}", response_model=ProgramListInDB)
async def get_program_list(list_id: str, db=Depends(get_database)):
    doc = await get_collection(db).find_one({"_id": ObjectId(list_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="List not found")
    doc['_id'] = str(doc['_id'])
    return ProgramListInDB(**doc)

@router.put("/{list_id}", response_model=ProgramListInDB)
async def update_program_list(list_id: str, data: ProgramListUpdate, db=Depends(get_database)):
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.utcnow()
    # Convert program_ids to ObjectId for MongoDB, fallback to string if not valid
    if 'program_ids' in update_data:
        update_data['program_ids'] = [ObjectId(pid) if ObjectId.is_valid(pid) else pid for pid in update_data['program_ids']]
    result = await get_collection(db).find_one_and_update(
        {"_id": ObjectId(list_id)},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="List not found")
    result['_id'] = str(result['_id'])
    if 'user_id' in result and isinstance(result['user_id'], ObjectId):
        result['user_id'] = str(result['user_id'])
    if 'program_ids' in result:
        result['program_ids'] = [str(pid) for pid in result['program_ids']]
    return ProgramListInDB(**result)

@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program_list(list_id: str, db=Depends(get_database)):
    result = await get_collection(db).delete_one({"_id": ObjectId(list_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="List not found")
    return 