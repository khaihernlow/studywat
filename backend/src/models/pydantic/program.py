from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from src.models.pydantic.institution import InstitutionInDB

class ProgramInDB(BaseModel):
    id: str = Field(alias="_id")
    program_name: str
    field_of_study: Optional[str] = None
    location: Optional[str] = None
    intakes: Optional[List[str]] = None
    program_duration_years: Optional[int] = None
    internship: Optional[str] = None
    entry_requirements_raw: Optional[Dict[str, Any]] = None
    english_requirements: Optional[Dict[str, Any]] = None
    fees: Optional[Dict[str, Any]] = None
    course_content: Optional[Dict[str, Any]] = None
    program_type: Optional[str] = None
    entry_requirements_processed: Optional[Dict[str, Any]] = None
    institution: Optional[InstitutionInDB] = None 