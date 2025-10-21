from pydantic import BaseModel, Field
from typing import List, Optional

class InstitutionInDB(BaseModel):
    id: str = Field(alias="_id")
    institution_name: str
    institution_country: str
    institution_type: str
    world_rank: Optional[int]
    malaysia_rank: Optional[int]
    institution_images: Optional[List[str]] = None
    program_ids: List[str]

    class Config:
        from_attributes = True 