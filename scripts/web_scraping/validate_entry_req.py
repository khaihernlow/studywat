import os
import json

def validate_entry_requirements(data_folder="institution_profile"):
    """
    Walks through each JSON file in data_folder, and for each program checks that
    the keys in entry_requirements_raw match exactly those in entry_requirements_processed.
    Reports any mismatches.
    """
    issues = []

    for filename in os.listdir(data_folder):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(data_folder, filename)
        try:
            with open(path, encoding="utf-8") as f:
                uni = json.load(f)
        except Exception as e:
            issues.append((filename, None, f"Failed to load JSON: {e}"))
            continue

        for program in uni.get("programs", []):
            prog_name = program.get("program_name", "<unknown>")
            raw = program.get("entry_requirements_raw", {}) or {}
            proc = program.get("entry_requirements_processed", {}) or {}

            raw_keys = set(raw.keys())
            proc_keys = set(proc.keys())

            missing = raw_keys - proc_keys
            extra   = proc_keys - raw_keys

            if missing or extra:
                issues.append((filename, prog_name, missing, extra))

    # Print summary
    if not issues:
        print("✅ All programs have matching entry_requirements_raw and entry_requirements_processed keys.")
    else:
        print("❌ Found mismatches:\n")
        for fn, prog, missing, extra in issues:
            print(f"File: {fn}\n  Program: {prog}")
            if missing:
                print(f"    ⦻ Missing processed for: {sorted(missing)}")
            if extra:
                print(f"    ⦻ Extra processed keys: {sorted(extra)}")
            print()

if __name__ == "__main__":
    validate_entry_requirements()