import PIL

import os
from PIL import Image
# iterate through all png files in this directory
for file in os.listdir("."):
    if file.endswith(".png"):
        # convert to jpg
        im = Image.open(file)
        im = im.resize((512,512), resample=Image.BOX)
        im.convert('RGB').save(file.replace(".png", ".png"),"jpeg", quality = 75)
        # remove png
        # os.remove(file)
        print("converted " + file)
    else:
        print("skipped " + file)