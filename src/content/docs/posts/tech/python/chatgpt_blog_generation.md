---
tags: ['python', 'chatgpt']
title: Using chatgpt to generate blog posts
description: AI powered tools can whittle down writing time and making writing blog posts simplier.
pubDate: Mon, 20 September 2023
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3842597075.png'
---

ChatGPT is a large language model that has been trained using a technique called unsupervised learning, in which the model learns to generate text by being fed a large dataset of text. It is designed to generate human-like responses to prompts, and can be used for a variety of natural language processing tasks, such as language translation, text summarization, and question answering.


```python 
 import os
import re
import argparse
from pyChatGPT import ChatGPT
# import yaml
from yaml import load, dump, Loader
import io
import warnings
from PIL import Image
from stability_sdk import client
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation
# Our Host URL should not be prepended with "https" nor should it have a trailing slash.
os.environ['STABILITY_HOST'] = 'grpc.stability.ai:443'
os.environ["STABILITY_KEY"] = os.getenv("STABILITY_KEY")

def generate_image(cfg:dict)-> None:
    prompt = cfg['imageArgs']['prompt']
    stability_api = client.StabilityInference(
        key=os.environ['STABILITY_KEY'], # API Key reference.
        verbose=True, # Print debug messages.
        engine="stable-diffusion-v1-5", # Set the engine to use for generation. 
        # Available engines: stable-diffusion-v1 stable-diffusion-v1-5 stable-diffusion-512-v2-0 stable-diffusion-768-v2-0 
        # stable-diffusion-512-v2-1 stable-diffusion-768-v2-1 stable-inpainting-v1-0 stable-inpainting-512-v2-0
    )
    answers = stability_api.generate(
        prompt=prompt
    )
    for resp in answers:
        for artifact in resp.artifacts:
            if artifact.finish_reason == generation.FILTER:
                warnings.warn(
                    "Your request activated the API's safety filters and could not be processed."
                    "Please modify the prompt and try again.")
            if artifact.type == generation.ARTIFACT_IMAGE:
                img = Image.open(io.BytesIO(artifact.binary))
                # images
                img.save("images" + "/" + str(artifact.seed)+ ".png") # Save our generated images with their seed number as the filename.

def generate_frontmatter(cfg: dict)-> None:
    # open output file
    output_file = cfg['outputFile']
    with open(output_file, 'w') as f:
        # write frontmatter
        f.write('---\n')
        # get frontmatter
        frontmatter = cfg['frontMatter']
        for key, value in frontmatter.items():
            f.write(f'{key}: {value}\n')
        f.write('---\n')
        # write body
    pass

def use_programming_language(cfg: dict, section_text: str)-> None:
    # get programming language
    programming_language = cfg['programmingLanguage']
    # use regex to find plain ``` and replace with ```programming_language
    type_start_line = None
    type_end_line = None
    # replace with code blocks with programming language
    # split lines by \n
    modified_lines = []
    lines = section_text.split('\n')
    for i, line in enumerate(lines):
        if line == '```':
            if type_start_line is None:
                type_start_line = i
                # append modified line
                modified_lines.append(f'```{programming_language}')
            else:
                # odd number of ``` so we are ending a code block
                type_start_line = None
                # append modified line
                modified_lines.append('```')
        else:
            # adjust line if type_start_line is not None
            # remove ` at the beginning of the line and the end of the line
            if type_start_line is not None:
                # check for ` character at the beginning of the line
                if line[0] == '`':
                    line = line[1:]
                # check for ` character at the end of the line
                if line[-1] == '`':
                    line = line[:-1]
            modified_lines.append(line)

    return "\n".join(modified_lines)

def generate_body(cfg: dict)-> None:
    # read CHATGPT_TOKEN from os
    CHATGPT_SESSION_TOKEN = os.getenv("CHATGPT_TOKEN")
    # print(CHATGPT_SESSION_TOKEN)
    session_token = CHATGPT_SESSION_TOKEN  # `__Secure-next-auth.session-token` cookie from https://chat.openai.com/chat
    api = ChatGPT(session_token)  # auth with session token
    output_file = cfg['outputFile']
    sections = cfg['sections']
    with open(output_file, 'a') as f:
        for section in sections:
            # check if str or dict
            if isinstance(section, str):
                resp = api.send_message(section)
                clean_message = use_programming_language(cfg, resp['message'])
            else:
                # assume dict
                # type and src from dict
                input_type = section['type']
                src = section['src']
                if input_type == 'file':
                    # read src from file
                    with open(src, 'r') as src_file:
                        src_text = src_file.read()
                    resp = api.send_message(src_text)
                    clean_message = resp['message']
                    print(clean_message)
                    # write original text
                    programming_language = cfg['programmingLanguage']
                    f.write(f"```{programming_language} \n {src_text} \n ```\n")
                    f.write('\n')
            f.write(clean_message)
            f.write('\n')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', type=str, default='posts/chatgpt_blog_generation.yml')
    args = parser.parse_args()
    # valid files exist
    # argparse for file eventually
    with open(args.file, 'r') as f:
        cfg = load(f, Loader=Loader)
    # if file exists skip
    # if not run these functions
    if os.path.exists(cfg['outputFile']):
        print('file exists')
        exit(0)
    # if genImage is true, then makeImage
    if cfg['imageArgs']:
        generate_image(cfg)
        pass

    generate_frontmatter(cfg)
    generate_body(cfg) 
 ```

This is a Python script that uses the ChatGPT API, the pyChatGPT library, and the stability\_sdk to generate text and images. The script takes in a configuration file in YAML format, which specifies the input text, the output file, and various settings such as the programming language to use for code blocks and the prompt for the image generation.
It uses the ChatGPT API to generate text in response to prompts specified in the configuration file. The script also uses the stability\_sdk to generate images based on the prompt specified in the configuration file. The script also uses the Python Imaging Library (PIL) to save the generated images to a directory. Additionally, it processes the generated text, using regular expressions to replace plain backticks with code blocks in the specified programming language.


There are several ways to monetize a blog, including the following:

1. Advertising: You can place ads on your blog and earn money through pay-per-click or pay-per-impression programs such as Google AdSense.
2. Affiliate marketing: You can earn money by promoting other people's products or services and receiving a commission for every sale made through your unique affiliate link.
3. Sponsored posts: You can write posts sponsored by a brand or company and receive payment for the promotion.
4. Selling products or services: You can sell your own products or services, such as e-books, courses, or consulting services, directly to your readers.
5. Crowdfunding: You can use platforms like Patreon or Kickstarter to raise money from your readers to support your blog or other projects.
6. Subscription models: You can offer exclusive content, access to a community or other perks for a recurring fee.

It's important to note that monetizing your blog requires consistent, high-quality content, and a sizable audience. It may take some time and effort to grow your blog and monetize it successfully.


Using AI to generate images can be beneficial in a variety of ways. Some reasons include:

1. Automation: AI-generated images can be produced quickly and at scale, reducing the time and resources required to create images manually.
2. Variation: AI-generated images can be easily customized to produce a wide range of variations, allowing for greater flexibility in image design.
3. Consistency: AI-generated images can be designed to maintain a consistent style or theme, making it easier to maintain a cohesive visual identity across a brand or product.
4. Cost-effectiveness: AI-generated images can be less expensive than hiring a professional photographer or graphic designer, making them more accessible to businesses with limited budgets.
5. Creative possibilities: AI-generated images can be used in creative ways, such as creating surreal or abstract imagery that would be difficult to achieve through traditional means.
6. Personalization: AI-generated images can be used to personalize content for targeted audience, resulting in higher engagement and conversion rates.
7. Efficiency: AI-generated images can be used to generate high-quality images for use in various applications, such as product advertising, web design, and mobile apps.

Using AI to generate images can be beneficial in a variety of ways. Some reasons include:

1. Automation: AI-generated images can be produced quickly and at scale, reducing the time and resources required to create images manually.
2. Variation: AI-generated images can be easily customized to produce a wide range of variations, allowing for greater flexibility in image design.
3. Consistency: AI-generated images can be designed to maintain a consistent style or theme, making it easier to maintain a cohesive visual identity across a brand or product.
4. Cost-effectiveness: AI-generated images can be less expensive than hiring a professional photographer or graphic designer, making them more accessible to businesses with limited budgets.
5. Creative possibilities: AI-generated images can be used in creative ways, such as creating surreal or abstract imagery that would be difficult to achieve through traditional means.
6. Personalization: AI-generated images can be used to personalize content for targeted audience, resulting in higher engagement and conversion rates.
7. Efficiency: AI-generated images can be used to generate high-quality images for use in various applications, such as product advertising, web design, and mobile apps.

AI has the potential to change blog writing in the future by making the process more efficient and personalized. For example, AI-powered writing assistants can help writers generate content faster by suggesting topics, outlining structure, and providing research and data to support their ideas. Additionally, AI-powered content generation can personalize blogs by analyzing audience data and tailoring the content to their interests and preferences. It can also generate images, infographics and videos to supplement the written content. However, it's important to note that AI-generated content should be carefully evaluated for accuracy and bias, and should be used in conjunction with human editing and oversight to ensure high-quality and ethical results.


