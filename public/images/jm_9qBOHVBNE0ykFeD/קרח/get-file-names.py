import os
import re

# ✅ Full path to your images.ts file
IMAGES_JS_PATH = r"C:\Users\repha\Documents\projects\Ice Cream Online Store\ice-cream-online-store\src\data\images.ts"

def extract_images_from_js(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract all image paths wrapped in double quotes
    matches = re.findall(r'"(\/images\/.*?)"', content)
    return matches

def get_file_names_with_image_paths():
    current_dir = os.getcwd()
    files = [f for f in os.listdir(current_dir) if os.path.isfile(os.path.join(current_dir, f))]

    # Extract full image paths from images.ts
    image_paths = extract_images_from_js(IMAGES_JS_PATH)

    # Create filename → full path pairs
    matched_pairs = []
    for f in files:
        match = next((img for img in image_paths if os.path.basename(img) == f), None)
        if match:
            matched_pairs.append((f, match))

    return matched_pairs

if __name__ == "__main__":
    file_image_pairs = get_file_names_with_image_paths()
    for filename, image_path in file_image_pairs:
        print((filename, image_path))
