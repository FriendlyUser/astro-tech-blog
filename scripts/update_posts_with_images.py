import os
import random
import frontmatter

# Define the path to the directory containing the TOML files
dir_path = r"../books_landing/books/src/content/books"

# ADD logic to ignore *.py files and DALL-e images

# Define the path to the directory containing the images
image_dir = "public/imgs/2023/"

# Loop through all the files in the directory
for file_name in os.listdir(dir_path):
    print(file_name)
    # Check if the file is a TOML file
    if file_name.endswith(".md"):
        # Define the path to the TOML file
        file_path = os.path.join(dir_path, file_name)

        # Load the frontmatter from the file
        with open(file_path, "r", errors="replace", encoding="utf-8") as fs:
            post = frontmatter.load(fs)

        # Find the image path in the frontmatter
        image_path = post.get("imgSrc", "")

        # if image_path != "/imgs/2023/186810635.png":
        #   continue

        # Generate a list of all the image files in the directory with the same extension
        image_files = [f for f in os.listdir(image_dir)]

        # Choose a random image from the list
        new_image_file = random.choice(image_files)

        # get basename with extension from new_image_file
        new_image_file_basename = os.path.basename(new_image_file)
        # Update the image path in the frontmatter
        post["imgSrc"] = "https://friendlyuser.github.io/imgs/2023/" + new_image_file_basename

        # Save the updated file
        with open(file_path, "wb") as f:
            frontmatter.dump(post, f)