from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ProgramListBase(BaseModel):
    title: str
    emoji: str
    user_id: str
    program_ids: List[str] = []

class ProgramListCreate(ProgramListBase):
    pass

class ProgramListUpdate(BaseModel):
    title: Optional[str]
    emoji: Optional[str]
    program_ids: Optional[List[str]]

class ProgramListInDB(ProgramListBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 