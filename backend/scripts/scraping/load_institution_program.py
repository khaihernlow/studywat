#!/usr/bin/env python3
"""
load_institution_profiles.py

- Validates each JSON against Pydantic models
- Loads all files in institution_profile/
- Inserts programs into `program` collection
- Inserts each institution (with a program_ids array) into `institution`
"""

import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ValidationError, field_validator, RootModel
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# --------------- Pydantic models for validation ---------------

class EntryRequirementRaw(RootModel[Dict[str, str]]):
    pass

class EnglishRequirements(BaseModel):
    MUET: Optional[str] = Field(default=None, exclude=True)
    IELTS: Optional[str] = Field(default=None, exclude=True)
    TOEFL: Optional[str] = Field(default=None, exclude=True)

    class Config:
        extra = "ignore"

class Fees(BaseModel):
    registration_fee: Optional[int] = None
    resource_fee: Optional[int] = None
    tuition_fee: Optional[int] = None

class CourseContent(BaseModel):
    core: Optional[str] = ""
    elective: Optional[str] = ""
    others: Optional[str] = ""

    @field_validator('core', 'elective', 'others', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v

class EntryReqProcessedItem(RootModel[Dict[str, Any]]):
    pass

class Program(BaseModel):
    program_name: str
    field_of_study: str
    location: str
    intakes: List[str]
    program_duration_years: int
    internship: Optional[str]
    entry_requirements_raw: EntryRequirementRaw
    english_requirements: EnglishRequirements
    fees: Fees
    course_content: CourseContent
    program_type: str
    entry_requirements_processed: Dict[str, List[EntryReqProcessedItem]]

class Institution(BaseModel):
    institution_name: Optional[str] = None
    institution_country: Optional[str] = None
    institution_type: Optional[str] = None
    world_rank: Optional[int] = None
    malaysia_rank: Optional[int] = None
    # note: we omit "programs" here, they get split out

# --------------- Loader & Inserter ---------------

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("Missing MONGO_URI! Check your .env file.")

def main():
    print("Starting institution program loader...")
    client = MongoClient(MONGO_URI)
    
    # Test connection first
    try:
        client.admin.command('ping')
        print("✓ MongoDB connection test successful")
    except Exception as e:
        print(f"✗ MongoDB connection test failed: {e}")
        print("Please check your connection string and network access")
        return
    
    db = client.get_default_database()
    inst_coll = db["institution"]
    prog_coll = db["program"]
    print(f"Connected to database: {db.name}")

    folder = Path("institution_profile")
    print(f"Scanning folder: {folder}")
    
    files = sorted(folder.glob("*.json"))
    total_files = len(files)
    print(f"Found {total_files} JSON files to process")
    
    for i, fp in enumerate(files, 1):
        print(f"\n[{i}/{total_files}] Processing: {fp.name}")
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            print(f"  ✓ JSON loaded successfully")
            
            # Validate institution-level fields
            inst = Institution(**{k: v for k, v in data.items() if k != "programs"})
            print(f"  ✓ Institution validated: {inst.institution_name}")
            
            # Validate & insert each program
            prog_ids = []
            programs = data["programs"]
            print(f"  ✓ Found {len(programs)} programs to process")
            
            for j, prog_data in enumerate(programs, 1):
                print(f"    [{j}/{len(programs)}] Processing program: {prog_data.get('program_name', 'Unknown')}")
                prog = Program(**prog_data)
                res = prog_coll.insert_one(prog.model_dump(by_alias=True))
                prog_ids.append(res.inserted_id)
                print(f"      ✓ Inserted program with ID: {res.inserted_id}")
            
            # Insert institution with program_ids
            inst_doc = inst.model_dump()
            inst_doc["program_ids"] = prog_ids
            inst_coll.insert_one(inst_doc)
            print(f"  ✓ Inserted institution with {len(prog_ids)} program IDs")
            print(f"[OK] Completed '{inst.institution_name}' with {len(prog_ids)} programs.")
            
        except ValidationError as ve:
            print(f"[VALIDATION ERROR] {fp.name}:\n{ve}\n")
        except Exception as e:
            print(f"[ERROR] {fp.name}: {e}")
    
    print(f"\n=== LOADING COMPLETE ===")
    print(f"Processed {total_files} institution files")
    print("Closing database connection...")
    client.close()
    print("Done!")

if __name__ == "__main__":
    main()
