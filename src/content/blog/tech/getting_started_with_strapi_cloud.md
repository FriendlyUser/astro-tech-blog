---
title: Getting started with strapi
description: introduction to strapi cms platform
pubDate: Saturday, 3 December 2022 13:00:00 GMT
tags: ["strapi", "javascript", golang]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/cms_icon.png'
---


##  What is strapi

Strapi is an open-source content management framework (CMF) that allows you to easily create and manage APIs for your web and mobile applications. It provides a powerful and flexible set of tools that can be used to build a wide range of applications, from simple websites to complex web and mobile applications.

One of the key benefits of using Strapi is that it allows you to quickly and easily create APIs for your applications. With Strapi, you can define your data structure and create endpoints for your API in a few clicks, without having to write any code. This makes it easier to integrate your application with other systems and services, and to share data with other applications.

Another benefit of using Strapi is that it is highly customizable and extensible. You can use plugins and custom code to extend the functionality of your API and add new features. This allows you to build applications that are tailored to your specific needs and requirements.

In addition, Strapi is built on top of popular web technologies, such as Node.js and Koa.js, which makes it easy to learn and use. It also has a large and active community of users and contributors, who provide support and help improve the platform.

Here is a sample to-do list app using the open-source content management framework, Strapi:

## Installing Strapi 

Install Strapi on your machine by running npm install strapi@beta -g

* Create a new Strapi project by running `strapi new my-todo-app`
* Navigate to the project directory and start the server by running cd my-todo-app && strapi start
* Open the Strapi admin panel by going to http://localhost:1337/admin in your web browser
* In the admin panel, create a new todo content type by going to Content-Types Builder and clicking on Create new content-type
* Add the following fields to the todo content type:
  * title (text)
  * description (text)
  * status (boolean)
* Save the content type and create some todo items in the admin panel by going to Todo in the left menu and clicking on `Add new entry`



Use the following code to retrieve and display the todo items in your node app:

```js
// Dependencies
const Strapi = require('strapi');

// Connect to the Strapi server
const strapi = new Strapi('http://localhost:1337');

// Retrieve the todo items
strapi.query('todo').find().then(todos => {
  // Do something with the todos
});
```

Here is an example of a Go application that can interact with a Strapi instance running on `localhost:1337` for the todo collection:

```go
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

type TodoItem struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      bool   `json:"status"`
}

func getTodoList() ([]TodoItem, error) {
	// Send a GET request to the /todo endpoint
	response, err := http.Get("http://localhost:1337/todo")
	if err != nil {
		return nil, err
	}

	// Read the response body
	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	// Unmarshal the response into a slice of TodoItem structs
	var todoList []TodoItem
	err = json.Unmarshal(body, &todoList)
	if err != nil {
		return nil, err
	}

	return todoList, nil
}

func main() {
	// Get the todo list
	todoList, err := getTodoList()
	if err != nil {
		fmt.Println(err)
		return
	}

	// Print the todo list
	for _, todo := range todoList {
		fmt.Println(todo.Title)
		fmt.Println(todo.Description)
		fmt.Println(todo.Status)
		fmt.Println()
	}
}
```

This code sends a GET request to the /todo endpoint of the Strapi server and parses the response into a slice of TodoItem structs. You can modify this code to perform other operations, such as creating or updating todo items.

Note: This is just a basic example to show how you can use Go to interact with a Strapi server. You may need to customize the code to fit your specific needs.


Overall, Strapi is a powerful and versatile content management framework that can be used to build a wide range of applications. It provides a simple and flexible way to create and manage APIs, making it an attractive option for developers who want to build modern and scalable applications.