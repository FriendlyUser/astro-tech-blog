---
tags: ['python', 'chatgpt', 'edgegpt']
title: Using chatgpt to write my posts instead of edge gpt.
description: Comparing differences between chatgpt and edge gpt.
pubDate: Fri, 14 June 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/other/output_1.png
---

As a technical writer, you may have heard of GPT models before. GPT models, short for Generative Pre-trained Transformer models, have been in the spotlight for the past few years due to their impressive natural language processing capabilities. In this post, we'll dive into the advantages of using a GPT model to write your blog, and how it can help you create high-quality content that resonates with your audience.

1. Increased Efficiency

Writing a blog post can be a time-consuming process, especially when you're dealing with writer's block. Using a GPT model can help you generate content quickly and efficiently. You can use the model to generate outlines, headlines, and even entire paragraphs based on a few keywords or prompts. This can save you a lot of time and energy, allowing you to focus on other aspects of your blog, such as editing and promotion.

2. Improved Quality

GPT models have been trained on vast amounts of data, allowing them to generate high-quality content that's both engaging and informative. By using a GPT model, you can ensure that your blog post is well-researched and contains accurate information. Additionally, GPT models can help you write in a style that resonates with your audience, improving the readability and engagement of your blog post.

3. SEO Optimization

Search engine optimization, or SEO, is an essential aspect of blogging. By using a GPT model, you can optimize your blog post for SEO by generating headlines and content that include relevant keywords and phrases. This can help your blog post rank higher in search engine results, driving more traffic to your website.

4. Increased Consistency

Maintaining consistency in your blog can be challenging, especially if you're publishing multiple posts per week. By using a GPT model, you can ensure that your blog posts are consistent in tone, style, and format. This can help build your brand and establish your blog as a reliable source of information in your niche.

In conclusion, using a GPT model to write your blog can help you save time, improve the quality of your content, optimize for SEO, and maintain consistency. While it's essential to remember that GPT models are not perfect and may require some editing and customization, they can be a valuable tool for any technical writer looking to create high-quality content that resonates with their audience.

For parsing the response from bing gpt I removed references using the following regex

```python

pattern = r"\[\^\d\^\]"
```
The regex pattern pattern = r"\[\^\d\^\]" matches a specific string format that starts with [^\, followed by a single digit \d, and ending with ^].

In other words, the pattern matches any string that has a [^\ character sequence, followed by a single digit, and ending with ^]. For example, the pattern would match the following strings:

[^\1^]
[^\2^]
[^\3^]
This pattern is often used to remove footnote references from text, as these references are typically formatted using the [^\d^] syntax. By removing these references, the resulting text is more readable and can be used in various natural language processing applications

```python 

 async def handlePrompt(bot: Chatbot, prompt: str):
    resp = await bot.ask(prompt)
    # get resp item.messages
    # filter for bot responses
    # find text equal to prompt, then grab the next message then return the text of that message
    for i, message in enumerate(resp.get("item", {}).get("messages", [])):
        if message.get("text", "") == prompt:
            raw_resp = resp.get("item", {}).get("messages", [])
            try:
                raw_message = raw_resp[i+1].get("text", "")
            except:
                # grab latest message
                raw_message = raw_resp[-1].get("text", "")
                if raw_message == "":
                    return ""
                # no message after prompt
                return ""
            break
    # clean message
    clean_message = re.sub(pattern, "", raw_message)
    return clean_message 
 ```

.

The code snippet above defines an asynchronous function called `handlePrompt` that takes two arguments - a `bot` object of type `Chatbot` and a `prompt` string.

The function sends the `prompt` string to the `bot` object using the `ask()` method and waits for a response. The response is then parsed to retrieve the next message from the bot after the prompt.

The function filters the messages in the response to find the message that matches the prompt, and then retrieves the next message in the list. If no message is found after the prompt, it returns an empty string.

The `re.sub()` function is used to remove any unwanted characters from the retrieved message before returning it.

Overall, this function can be used to automate interactions with a chatbot and retrieve specific messages from the bot's response.


```python 
 async def main(args):
    image_root = ""
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
        image_path = generate_image(cfg)
        pass
    
    astro_image_folder = "/imgs/2023"
    # grab basename from image_path
    image_basename = os.path.basename(image_path)
    imgSrc = f"{astro_image_folder}/{image_basename}"
    #
    cfg["frontMatter"]["imgSrc"] = imgSrc
    generate_frontmatter(cfg)
    await generate_body(cfg)

    ## cp file to ../astro-tech-blog/${directory}
    try:
        if cfg["postOutput"]:
            # check for postOutput.folder
            # check for postOutput.imgFolder
            # mv cfg['outputFile'] to ../astro-tech-blog/${postOutput.folder}
            post_output_folder = cfg['postOutput']['folder']
            post_output_img_folder = cfg['postOutput']['imgFolder']
            if post_output_folder:
                # copy file to ../astro-tech-blog/${postOutput.folder}
                shutil.copy(cfg['outputFile'], post_output_folder)
                # copy image to ../astro-tech-blog/${postOutput.imgFolder}
            if post_output_img_folder:
                shutil.copy(image_path, post_output_img_folder) 
 ```

The code above defines an asynchronous function called `main` that takes an argument `args`.

The function first initializes an empty string called `image_root`. It then reads a configuration file specified in the `args` argument and loads it using the `load()` method from the PyYAML library.

If the `outputFile` specified in the configuration file already exists, the function exits. Otherwise, if `imageArgs` is set to true in the configuration file, the function generates an image using the `generate_image()` function and sets the path to the generated image in the `imgSrc` variable.

The function then updates the `imgSrc` in the configuration file, generates the front matter using the `generate_frontmatter()` function, and generates the body of the blog post using the `generate_body()` function.

Finally, if `postOutput` is specified in the configuration file, the function copies the output file and the generated image to the folders specified in the `postOutput.folder` and `postOutput.imgFolder` keys, respectively.

Overall, this function reads a configuration file, generates an image and a blog post, and saves them to the appropriate directories.


## References

* https://github.com/FriendlyUser/edgegpt_blog_generator
* https://github.com/FriendlyUser/chatgpt_blog_generator