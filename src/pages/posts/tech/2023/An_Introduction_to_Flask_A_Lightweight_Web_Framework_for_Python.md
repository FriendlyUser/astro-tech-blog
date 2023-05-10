---
description: In this article, we will explore the basics of Flask and demonstrate
  how to create a simple web application
imgSrc: /imgs/2023/DALL·E 2022-12-25 21.48.12 - teddy bear on coach looking out the
  window at a tree.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-31T19:30:20.000Z'
tags: []
title: An Introduction to Flask A Lightweight Web Framework for Python
---

# An Introduction to Flask: A Lightweight Web Framework for Python

Flask is a popular and easy-to-use web framework for Python that allows developers to create web applications quickly and efficiently. It is a micro-framework that follows the "batteries-included" philosophy, providing a minimalistic core with the ability to extend its functionality using third-party libraries. In this article, we will explore the basics of Flask and demonstrate how to create a simple web application.

## What is Flask?

Flask is an open-source web framework written in Python. It was created by Armin Ronacher as a lightweight alternative to more complex frameworks like Django. Flask is built on top of two key components: Werkzeug, a WSGI (Web Server Gateway Interface) utility library, and Jinja2, a powerful templating engine for Python. These components, combined with Flask's simplicity and flexibility, make it an excellent choice for building web applications in Python.

## Installation

To get started with Flask, you'll first need to install it. You can use pip, the Python package installer, to install Flask:

```bash
pip install Flask
```

This command will install Flask along with its dependencies, such as Werkzeug and Jinja2.

## Creating a Simple Flask Application

To create a basic Flask application, follow these steps:

1. Create a new file named `app.py` in your desired directory.
2. Open the file in your preferred code editor and add the following code:

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run()
```

In this code snippet, we start by importing the Flask class from the `flask` module. Next, we create an instance of the Flask class, passing it the name of the module or package, in this case, `__name__`.

The `@app.route('/')` decorator maps the root URL ('/') to the `hello_world` function. When a client makes a request to the root URL, the `hello_world` function will be executed, returning the string 'Hello, World!'.

Finally, the `if __name__ == '__main__':` block ensures that the application only runs when executed directly, not when imported as a module. The `app.run()` function starts the built-in development server, which listens for incoming requests.

3. Save the `app.py` file and open a terminal or command prompt in the same directory.
4. Run the Flask application with the following command:

```bash
python app.py
```

You should see output indicating that the development server has started:

```bash
* Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
```

5. Open a web browser and navigate to the URL `http://127.0.0.1:5000/`. You should see the text 'Hello, World!' displayed on the page.

Congratulations! You have just created your first Flask web application.

## Extending Your Flask Application

Flask's simplicity lends itself well to small projects and prototypes, but you can also build more complex applications using additional features and third-party extensions. Some popular extensions include:

- Flask-SQLAlchemy: Adds support for SQLAlchemy, a powerful Object Relational Mapper (ORM) for working with databases.
- Flask-WTF: Simplifies the process of working with forms and form validation.
- Flask-Login: Provides user authentication and session management.
- Flask-RESTful: Makes it easy to build RESTful APIs with Flask.

To learn more about these extensions and others, visit the [Flask Extension Registry](https://flask.palletsprojects.com/en/2.1.x/extensions/).

## Conclusion

In this article, we've introduced Flask, a lightweight and easy-to-use web framework for Python. We demonstrated how to create a simple web application and touched on some of the possibilities for extending Flask with third-party libraries. By combining the simplicity of Flask with the power of Python, you can quickly build and deploy web applications to suit your needs.