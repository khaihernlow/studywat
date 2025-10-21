import os

folder = os.path.join(os.path.dirname(__file__), '../../data/unienrol/institution_profile')
folder = os.path.abspath(folder)

files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
print(f"Number of files in institution_profile: {len(files)}")
