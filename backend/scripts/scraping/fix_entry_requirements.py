#!/usr/bin/env python3
"""
fix_entry_requirements.py

- Goes through all JSON files in institution_profile/
- Fixes entry_requirements_processed by converting dict values to lists
- Ensures all values in entry_requirements_processed are lists
"""

import json
import os
from pathlib import Path

# Path to the institution_profile directory
folder = (Path(__file__).parent / "../../data/unienrol/institution_profile").resolve()

def fix_entry_requirements(data):
    """Fix entry_requirements_processed by converting dict values to lists"""
    if "programs" not in data:
        return data
    
    for program in data["programs"]:
        if "entry_requirements_processed" in program:
            processed = program["entry_requirements_processed"]
            if isinstance(processed, dict):
                for key, value in processed.items():
                    # If value is a dict, convert it to a single-item list
                    if isinstance(value, dict):
                        processed[key] = [value]
                    # If value is already a list, leave it as is
                    elif not isinstance(value, list):
                        # If it's neither dict nor list, wrap it in a list
                        processed[key] = [value]
    
    return data

def main():
    print("Starting entry requirements fix...")
    print(f"Scanning folder: {folder}")
    
    files = sorted(folder.glob("*.json"))
    total_files = len(files)
    fixed_files = 0
    
    print(f"Found {total_files} JSON files to process")
    
    for i, fp in enumerate(files, 1):
        print(f"[{i}/{total_files}] Processing: {fp.name}")
        
        try:
            # Read the file
            with open(fp, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Apply the fix
            original_data = json.dumps(data, sort_keys=True)
            fixed_data = fix_entry_requirements(data)
            fixed_json = json.dumps(fixed_data, sort_keys=True)
            
            # Check if any changes were made
            if original_data != fixed_json:
                # Write the fixed data back to the file
                with open(fp, 'w', encoding='utf-8') as f:
                    json.dump(fixed_data, f, indent=4, ensure_ascii=False)
                print(f"  ✓ Fixed entry requirements in {fp.name}")
                fixed_files += 1
            else:
                print(f"  ✓ No changes needed for {fp.name}")
                
        except Exception as e:
            print(f"  ✗ Error processing {fp.name}: {e}")
    
    print(f"\n=== FIXING COMPLETE ===")
    print(f"Processed {total_files} files")
    print(f"Fixed {fixed_files} files")
    print("Done!")

if __name__ == "__main__":
    main() 