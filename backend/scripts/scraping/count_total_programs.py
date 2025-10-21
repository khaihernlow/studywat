import os
import json

# Path to the institution_profile directory
folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/unienrol/institution_profile'))

total_programs = 0
files = [f for f in os.listdir(folder) if f.endswith('.json')]

for filename in files:
    path = os.path.join(folder, filename)
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        programs = data.get('programs', [])
        total_programs += len(programs)
    except Exception as e:
        print(f"Error reading {filename}: {e}")

print(f"Total number of programs: {total_programs}") 