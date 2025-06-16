import os
import json

def validate_file(path):
    errors = []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        errors.append(f"Failed to load JSON: {e}")
        return errors

    required_fields = [
        'institution_name',
        'institution_country',
        'institution_type',
        'world_rank',
        'malaysia_rank',
    ]

    # Check presence of each field
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing field: '{field}'")

    # If missing fields, skip further checks
    if errors:
        return errors

    name = data.get('institution_name')
    country = data.get('institution_country')
    inst_type = data.get('institution_type')
    world_rank = data.get('world_rank')
    malaysia_rank = data.get('malaysia_rank')

    # Name, country, type must be str or None
    for field_name, value in [('institution_name', name), ('institution_country', country), ('institution_type', inst_type)]:
        if value is not None and not isinstance(value, str):
            errors.append(f"Field '{field_name}' must be a string or null, got {type(value).__name__}")

    # Ranks must be int/float or None
    for field_name, value in [('world_rank', world_rank), ('malaysia_rank', malaysia_rank)]:
        if value is not None and not isinstance(value, (int, float)):
            errors.append(f"Field '{field_name}' must be a number or null, got {type(value).__name__}")

    # Malaysia rank should be null if country != 'Malaysia'
    if country is not None and country.lower() != 'malaysia' and malaysia_rank is not None:
        errors.append("Field 'malaysia_rank' must be null when country is not Malaysia")

    return errors


def main():
    folder = 'institution_profile'
    if not os.path.isdir(folder):
        print(f"Directory not found: {folder}")
        return

    any_errors = False
    for fname in os.listdir(folder):
        if not fname.endswith('.json'):
            continue
        path = os.path.join(folder, fname)
        errs = validate_file(path)
        if errs:
            any_errors = True
            print(f"Errors in {fname}:")
            for e in errs:
                print(f"  - {e}")

    if not any_errors:
        print("All files passed validation.")

if __name__ == '__main__':
    main()