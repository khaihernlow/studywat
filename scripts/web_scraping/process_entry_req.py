import os
import json
from google import genai  # pip install google-genai

# ─── 1) Example schema for prompt ──────────────────────────────────────────

SCHEMA_EXAMPLE = {
  "<QualificationKey>": [
    { "type":"cgpa",         "comparator":">=", "value":2.33 },
    { "type":"grade",        "comparator":">=", "value":"C+" },
    { "type":"subjects",     "comparator":">=", "count":2 },
    { "type":"credit",       "subjects":["Mathematics","English"] },
    { "type":"related_field","value":True },
    { "type":"raw",          "text":"<original raw string>" }
  ]
}

# ─── 2) Init Gemini ────────────────────────────────────────────────────────

client = genai.Client(api_key="AIzaSyCthFwTHiD20AMS6iYenlutwCyhr7o_wt8")

# ─── 3) Call Gemini & json.loads ──────────────────────────────────────────

def call_gemini_parse(raw_reqs):
    prompt = (
        "You are given a JSON object mapping qualification keys to their raw entry requirement strings.\n"
        "Parse each entry into an array of atomic criteria following this JSON schema:\n\n"
        f"{json.dumps(SCHEMA_EXAMPLE, indent=2)}\n\n"
        "Supported types:\n"
        "- cgpa / gpa: numeric thresholds\n"
        "- grade: letter-grade thresholds\n"
        "- subjects: counts of required passes/subjects\n"
        "- credit: list of specific Credit/Pass requirements\n"
        "- related_field: boolean flag\n"
        "- raw: original text as the last item\n\n"
        "Here is the input JSON.  *Output ONLY the JSON object*:\n\n"
        f"{json.dumps(raw_reqs, ensure_ascii=False, indent=2)}"
    )

    resp = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
        },
    )
    # parse the raw JSON text
    return json.loads(resp.text)

# ─── 4) Process all your files ─────────────────────────────────────────────

def process_all(data_folder="institution_profile"):
    for fn in os.listdir(data_folder):
        if not fn.endswith(".json"):
            continue

        path = os.path.join(data_folder, fn)
        uni = json.load(open(path, encoding="utf-8"))
        changed = False

        for program in uni.get("programs", []):

            print(f" → {program.get('program_name')}")

            if "entry_requirements_processed" in program and program["entry_requirements_processed"]:
                print("   Skipping, already processed.")
                continue
            
            raw_reqs = program.get("entry_requirements_raw") or {}
            if not raw_reqs:
                continue

            try:
                parsed = call_gemini_parse(raw_reqs)
                program["entry_requirements_processed"] = parsed
                changed = True
            except Exception as e:
                print(f"✖ Error in {fn} → {program.get('program_name')}:")
                print("  ", e)

        if changed:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(uni, f, indent=2, ensure_ascii=False)
            print(f"✅ Updated {fn}")

if __name__ == "__main__":
    process_all()
