import os
import json

FIELD_OF_STUDY_TXT = os.path.join(os.path.dirname(__file__), '../../src/resources/field_of_study.txt')
INSTITUTION_PROFILE_DIR = os.path.join(os.path.dirname(__file__), '../../data/unienrol/institution_profile')

def build_course_to_group_mapping():
    mapping = {}
    current_group = None
    with open(FIELD_OF_STUDY_TXT, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('Field of Study:'):
                current_group = line[len('Field of Study:'):].strip()
            elif ':' in line and not line.startswith('Field of Study:'):
                course = line.split(':', 1)[0].strip()
                if current_group:
                    mapping[course] = current_group
    return mapping

def update_json_file(filepath, course_to_group):
    with open(filepath, encoding='utf-8') as f:
        data = json.load(f)
    changed = False
    programs = data.get('programs')
    if programs and isinstance(programs, list):
        for prog in programs:
            field = prog.get('field_of_study')
            # Always move field_of_study to course
            if field is not None:
                prog['course'] = field
                group = course_to_group.get(field)
                if group:
                    if prog['field_of_study'] != group:
                        prog['field_of_study'] = group
                        changed = True
                else:
                    # Print out missing mapping
                    pname = prog.get('program_name', '[no program_name]')
                    print(f"No group mapping for course '{field}' in program '{pname}' in file '{os.path.basename(filepath)}'")
                changed = True  # Always set changed if we add/move course
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'Updated: {os.path.basename(filepath)}')
    else:
        print(f'No change: {os.path.basename(filepath)}')

def main():
    course_to_group = build_course_to_group_mapping()
    for filename in os.listdir(INSTITUTION_PROFILE_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(INSTITUTION_PROFILE_DIR, filename)
            update_json_file(filepath, course_to_group)

if __name__ == '__main__':
    main() 