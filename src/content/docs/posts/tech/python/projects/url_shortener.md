---
tags: ['python', 'urls']
title: Url Shortener in Python
description: Describing how to build a basic URL shortener in Python
pubDate: Fri, 14 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2851628136.png
---

URL shorteners are online tools that allow you to shorten long, complex URLs into shorter, more manageable ones. These shorter URLs can be easier to share and remember, and they can also be useful for tracking clicks and traffic to a particular URL.

Here's how URL shorteners work:

1. You provide the long URL that you want to shorten.
2. The URL shortener generates a unique, shorter URL.
3. When someone clicks on the shorter URL, the URL shortener redirects them to the original, longer URL.

URL shorteners can be used for a variety of purposes, such as sharing links on social media, sending links via email, or embedding links in documents or presentations. They can also be used for tracking clicks and traffic to a particular URL, as most URL shorteners provide analytics and metrics on the number of clicks and geographic location of clicks.

However, there are some potential downsides to using URL shorteners. For one, they can be used to hide malicious URLs, which can pose a security risk. Additionally, if the URL shortener service goes offline or out of business, any links that were created using that service will no longer work.


Sure, here is a simple implementation of a URL shortener in Python using Flask and SQLite:

First, we need to install Flask and SQLite:


```python
pip install flask
```

```python
pip install sqlite3
```
Next, we'll create a `app.py` file and add the following code:


```python
from flask import Flask, render_template, request, redirect
import sqlite3
import string
import random

app = Flask(__name__)
app.config['DEBUG'] = True

# create database connection
conn = sqlite3.connect('url_shortener.db')
c = conn.cursor()

# create urls table
c.execute('''CREATE TABLE IF NOT EXISTS urls
 (id INTEGER PRIMARY KEY AUTOINCREMENT,
 original_url TEXT NOT NULL,
 short_url TEXT NOT NULL UNIQUE)''')

# close database connection
conn.close()

# function to generate a random string of length 6
def generate_short_url():
 chars = string.ascii_letters + string.digits
 return ''.join(random.choice(chars) for _ in range(6))

# home page route
@app.route('/')
def home():
 return render_template('home.html')

# shorten url route
@app.route('/shorten_url', methods=['POST'])
def shorten_url():
 # get original url from form
 original_url = request.form['url']

 # check if url already exists in database
 conn = sqlite3.connect('url_shortener.db')
 c = conn.cursor()
 c.execute('SELECT \* FROM urls WHERE original_url=?', (original_url,))
 existing_url = c.fetchone()

 if existing_url:
 # if url exists, return existing short url
 short_url = existing_url[2]
 else:
 # if url does not exist, generate new short url
 short_url = generate_short_url()

 # insert new url into database
 c.execute('INSERT INTO urls (original_url, short_url) VALUES (?, ?)',
 (original_url, short_url))
 conn.commit()

 # close database connection
 conn.close()

 # redirect to success page with short url
 return render_template('success.html', short_url=short_url)

# redirect route
@app.route('/<short_url>')
def redirect_url(short_url):
 # get original url from database
 conn = sqlite3.connect('url_shortener.db')
 c = conn.cursor()
 c.execute('SELECT \* FROM urls WHERE short_url=?', (short_url,))
 url = c.fetchone()

 # if url exists, redirect to original url
 if url:
 original_url = url[1]
 return redirect(original_url)

 # if url does not exist, return error message
 return render_template('error.html')

if __name__ == '__main__':
 app.run()
```
This code defines a Flask application that has three routes:

* The home page route (`/`) displays a form where users can enter a URL to shorten.
* The shorten URL route (`/shorten_url`) generates a unique short URL for the entered URL and stores it in a SQLite database.
* The redirect route (`/<short_url>`) redirects the user to the original URL associated with the provided short URL.

The `generate_short_url` function generates a random string of length 6, which is used as the short URL. The `urls` table in the SQLite database stores the original URL and the corresponding short URL.

You can run the application by running the `app.py` file in the terminal:


```python
python app.py
```
This will start a local web server on port 5000. You can access the application by navigating to `http://localhost:5000` in your web browser.

Note: This is just a simple implementation and


Flask is a lightweight Python web framework that allows developers to easily create web applications. It's simple, flexible, and easy to use, making it a popular choice for building web applications of all sizes and complexities.

Here are some of the key features and benefits of using Flask:

1. Lightweight: Flask is a lightweight framework that has a small footprint, making it easy to learn and use. It doesn't come with a lot of built-in functionality, which allows developers to add only the features they need.
2. Flexibility: Flask is very flexible and can be used for a wide range of web applications, from simple one-page websites to complex web applications with multiple pages and features.
3. Easy to use: Flask is designed to be easy to use and easy to learn, with a simple and intuitive API that makes it easy to get started.
4. Built-in web server: Flask comes with a built-in web server that allows developers to quickly test and debug their applications without having to set up a separate server.
5. Large community: Flask has a large and active community of developers who contribute to its development and provide support through forums, chat rooms, and other resources.

Some common use cases for Flask include:

1. Building APIs: Flask is often used to build APIs that can be used by other applications or services. Its lightweight nature and flexible routing system make it well-suited for building APIs.
2. Prototyping: Flask is great for quickly prototyping web applications, allowing developers to test and iterate on their ideas without having to spend a lot of time setting up a complex web application.
3. Small to medium-sized web applications: Flask is a good choice for building small to medium-sized web applications that don't require a lot of complexity or advanced features.

Overall, Flask is a great choice for developers who want to quickly build web applications without having to learn a lot of complex frameworks and tools. Its simplicity and flexibility make it easy to use, and its active community provides plenty of resources and support.