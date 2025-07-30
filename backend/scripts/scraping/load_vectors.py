from pinecone import Pinecone
from pymongo import MongoClient
import textwrap
import math
import time
import os
from dotenv import load_dotenv

load_dotenv()

# ─── CONFIG ────────────────────────────────────────────────────────────────────

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME       = os.getenv("PINECONE_INDEX_NAME")
MONGO_URI        = os.getenv("MONGO_URI")

BATCH_SIZE       = 200   # how many vectors to upsert per call
LOG_EVERY        = 10    # log every N institutions so you know it's alive
MAX_CHARS        = 1000  # chunk size

# ─── HELPERS ───────────────────────────────────────────────────────────────────

def chunk_text(text: str, max_chars: int = MAX_CHARS):
    """Split on paragraphs, then wrap any over max_chars."""
    paras = text.split("\n")
    chunks = []
    for p in paras:
        p = p.strip()
        if not p:
            continue
        if len(p) <= max_chars:
            chunks.append(p)
        else:
            chunks += textwrap.wrap(p, max_chars)
    return chunks

# ─── PINECONE SETUP ────────────────────────────────────────────────────────────

pc = Pinecone(api_key=PINECONE_API_KEY)

# 1) Check if index exists, but don't delete it
if pc.has_index(INDEX_NAME):
    print("📋 Using existing index…")
else:
    # 2) Create new index with integrated LLaMA embedding
    print("🛠  Creating new index with LLaMA integration…")
    pc.create_index_for_model(
        name=INDEX_NAME,
        cloud="aws",
        region="us-east-1",
        embed={
            "model": "llama-text-embed-v2",
            "field_map": {"text": "metadata.chunk_text"}
        }
    )

# 3) Wait until it's actually ready
print("⏳ Waiting for index to be ready…")
while True:
    desc = pc.describe_index(INDEX_NAME)
    if desc.get("status", {}).get("ready", False):
        print("✅ Index is ready!")
        break
    time.sleep(5)

index = pc.Index(INDEX_NAME)

# ─── MONGODB SETUP ─────────────────────────────────────────────────────────────

print("🔌 Connecting to MongoDB…")
client    = MongoClient(MONGO_URI)
db        = client.get_default_database()
inst_coll = db["institutions"]
prog_coll = db["programs"]

count_insts = inst_coll.count_documents({})
print(f"🔎 Found {count_insts} institutions in MongoDB")

# ─── CHECK WHAT'S ALREADY PROCESSED ───────────────────────────────────────────

print("🔍 Checking what's already in the index...")
try:
    # Get a sample of existing vectors to see what institutions are already processed
    existing_vectors = index.query(
        vector=[0.1] * 1024,  # dummy vector
        top_k=10000,
        include_metadata=True
    )
    
    # Extract institution IDs that are already processed
    processed_inst_ids = set()
    for match in existing_vectors.get('matches', []):
        metadata = match.get('metadata', {})
        inst_id = metadata.get('institution_id')
        if inst_id:
            processed_inst_ids.add(inst_id)
    
    print(f"📊 Found {len(processed_inst_ids)} institutions already processed")
    
except Exception as e:
    print(f"⚠️  Could not check existing vectors: {e}")
    processed_inst_ids = set()

# ─── STREAM + UPsert ───────────────────────────────────────────────────────────

batch = []
processed_count = 0
total_processed = len(processed_inst_ids)

print(f"🚀 Starting to process remaining {count_insts - total_processed} institutions...")

# Process institutions in smaller batches to avoid cursor timeouts
for idx, inst in enumerate(inst_coll.find().max_time_ms(300000), start=1):  # 5 minute timeout
    inst_id   = str(inst["_id"])
    
    if idx % LOG_EVERY == 0 or idx == count_insts:
        print(f"   • processing institution {idx}/{count_insts} (id={inst_id})")

    if inst_id in processed_inst_ids:
        print(f"📌 Institution {inst_id} already processed. Skipping.")
        continue

    processed_count += 1
    inst_name = inst.get("institution_name", "<unknown>")
    for raw_oid in inst.get("program_ids", []):
        prog = prog_coll.find_one({"_id": raw_oid})
        if not prog:
            continue

        prog_id   = str(prog["_id"])
        prog_name = prog.get("program_name", "<no name>")
        cc        = prog.get("course_content", {})

        for section in ("core", "elective", "others"):
            text = (cc.get(section) or "").strip()
            if not text:
                continue

            for i, chunk in enumerate(chunk_text(text)):
                batch.append({
                    "id": f"{inst_id}::{prog_id}::{section}::{i}",
                    "values": [0.1] * 1024,  # Placeholder values with non-zero values for LLaMA v2
                    "metadata": {
                        "chunk_text": chunk,
                        "institution_id":   inst_id,
                        "institution_name": inst_name,
                        "program_id":       prog_id,
                        "program_name":     prog_name,
                        "section":          section,
                        "chunk_index":      i
                    }
                })

                # flush full batch
                if len(batch) >= BATCH_SIZE:
                    resp = index.upsert(vectors=batch)
                    print(f"📦 upserted {len(batch)} vectors → acceptedCount={resp.get('upsertedCount')}")
                    batch = []

# final flush
if batch:
    resp = index.upsert(vectors=batch)
    print(f"📦 final upsert of {len(batch)} vectors → acceptedCount={resp.get('upsertedCount')}")

print(f"🏁 All done! Processed {processed_count} new institutions. 🎉")
print(f"📊 Total institutions in index: {total_processed + processed_count}")
