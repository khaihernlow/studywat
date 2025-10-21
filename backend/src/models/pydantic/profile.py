from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler: GetCoreSchemaHandler):
        return core_schema.json_or_python_schema(
            python_schema=core_schema.no_info_plain_validator_function(cls.validate),
            json_schema=core_schema.str_schema(),
            serialization=core_schema.plain_serializer_function_ser_schema(str)
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ObjectId')
        return ObjectId(v)

class Trait(BaseModel):
    trait: str  # The trait key, matching the manifest
    label: str
    label_description: str
    confidence: float
    evidence: str
    timestamp: datetime

class AlertType(str, Enum):
    profile_update = "profile_update"
    # Add more alert types as needed

class Alert(BaseModel):
    type: AlertType
    message: str

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime
    alert: List[Alert] = []

class Profile(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    traits: List[Trait] = []
    updated_at: datetime
    chat_history: List[ChatMessage] = []
    courses_recommendation: Optional[list] = None

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str} 