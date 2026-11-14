---
description: 'Build a small CRUD API for tasks with Flask-RESTful: Resource classes, URL routing, status codes, and testing each endpoint with curl.'
imgSrc: /imgs/2023/1144941208.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-07-01T14:01:55.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: 'Flask-RESTful: a CRUD API with Resource classes'
---

Flask-RESTful is a Flask extension where each URL maps to a `Resource` class, and the class's `get`, `post`, `put` and `delete` methods handle the matching HTTP verbs. Return a dict (and optionally a status code) and it is serialized to JSON for you.

:::note
Flask-RESTful's latest release is 0.3.10, from May 2023, and its docs mark the `reqparse` request parser as deprecated. It still works for small APIs, but for new projects also look at Flask's built-in [`MethodView`](https://flask.palletsprojects.com/en/stable/views/), which gives you the same class-per-resource pattern without the extension.
:::

## Installation

```bash
python3 -m venv env
source env/bin/activate
pip install Flask Flask-RESTful
```

## The API

The API manages an in-memory list of tasks. It needs two resources, because the URLs differ:

- `/tasks`: list all tasks (`GET`) and create one (`POST`). The client doesn't know the ID yet.
- `/tasks/<id>`: read (`GET`), update (`PUT`) and delete (`DELETE`) one task.

Put this in `app.py`:

```python
from itertools import count

from flask import Flask, request
from flask_restful import Api, Resource

app = Flask(__name__)
api = Api(app)

tasks = {}
next_id = count(1)


def read_title():
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    if not isinstance(title, str) or not title.strip():
        return None
    return title.strip()


class TaskList(Resource):
    def get(self):
        return list(tasks.values())

    def post(self):
        title = read_title()
        if title is None:
            return {"error": "title is required"}, 400
        task = {"id": next(next_id), "title": title}
        tasks[task["id"]] = task
        return task, 201


class Task(Resource):
    def get(self, task_id):
        task = tasks.get(task_id)
        if task is None:
            return {"error": "Task not found"}, 404
        return task

    def put(self, task_id):
        task = tasks.get(task_id)
        if task is None:
            return {"error": "Task not found"}, 404
        title = read_title()
        if title is None:
            return {"error": "title is required"}, 400
        task["title"] = title
        return task

    def delete(self, task_id):
        if tasks.pop(task_id, None) is None:
            return {"error": "Task not found"}, 404
        return "", 204


api.add_resource(TaskList, "/tasks")
api.add_resource(Task, "/tasks/<int:task_id>")

if __name__ == "__main__":
    app.run(debug=True)
```

A few details worth noting:

- Flask passes URL variables to the method as keyword arguments, so every method on `Task` must accept `task_id`. The original version of this post registered `post(self)` on `/tasks/<int:task_id>`, which fails with a `TypeError` because Flask passes `task_id` to it.
- `<int:task_id>` converts the ID to an `int` and returns 404 for non-numeric IDs before your code runs.
- IDs come from a counter rather than `len(tasks) + 1`, which would hand out a duplicate ID after a delete.
- `get_json(silent=True)` returns `None` instead of raising on a missing or invalid JSON body, so the resource can return its own 400.
- The data lives in a module-level dict, so it's lost on restart and isn't shared between worker processes. Swap in a database for anything real.

## Testing with curl

Start the server with `python app.py`, then:

```bash
# Create
curl -X POST -H "Content-Type: application/json" -d '{"title": "First task"}' http://localhost:5000/tasks
# {"id": 1, "title": "First task"}

# List
curl http://localhost:5000/tasks

# Read one
curl http://localhost:5000/tasks/1

# Update
curl -X PUT -H "Content-Type: application/json" -d '{"title": "Updated task"}' http://localhost:5000/tasks/1

# Delete (204, empty body)
curl -i -X DELETE http://localhost:5000/tasks/1
```

## Next steps

- Use `flask_restful.fields` and `marshal_with` to control which fields are returned.
- For input validation, the Flask-RESTful docs suggest a library such as [marshmallow](https://marshmallow.readthedocs.io/) instead of the deprecated `reqparse`.
- `app.run(debug=True)` is the development server. Run a WSGI server such as Gunicorn in production.

## Further reading

- [Flask-RESTful documentation](https://flask-restful.readthedocs.io/)
- [Flask documentation](https://flask.palletsprojects.com/)
