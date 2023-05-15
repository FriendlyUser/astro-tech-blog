---
title: How to create a todolist application using nextjs and neon serverless postgres
description: "Describes a Next.js project that uses a PostgreSQL database to manage to-do items."
alt: my first blog post
tags: ["react","js"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 April 2024 13:00:00 GMT
imgSrc: '/imgs/2023/neon_article.jpeg'
---

# Overview
The Next.js Todo List app is a single-page application, which means that it only has one page. This page is served by the Next.js server, which also handles all of the API requests. The app uses Next API functions to handle the API requests, and Neon Serverless Postgres for the database.

The Next.js server is a Node.js server that is used to serve the Next.js app. It also handles all of the API requests. The Next.js server uses Next API functions to handle the API requests. Next API functions are a way to write API routes in Next.js. They are easy to use and they make it easy to write reusable API code.

Neon Serverless Postgres is a serverless database that is hosted on Vercel. It is a great choice for Next.js apps because it is easy to use and it is very scalable. Neon Serverless Postgres is also very affordable.

## Frontend

The key parts of the following Next.js "/" route are:

* The use of the `useSWR` hook to fetch data from an API.
* The use of the `useState` hook to manage the state of the application, such as the text of the new to-do item and the search text.
* The use of the `useEffect` hook to fetch data from the API when the page loads or when the search text changes.
* The use of the `handleAddTodoItem` function to add a new to-do item to the list.
* The use of the `handleCheckboxChange` function to toggle the completion status of a to-do item.
* The use of the `handleDeleteAllTasksClick` function to delete all to-do items from the list.


```jsx
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Checkbox,
  FormControlLabel,
  IconButton,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Accordion from '@mui/material/Accordion';
import useSWR, { useSWRConfig } from 'swr';
import classes from './index.module.css';


const maxTodoListItems = 10;
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}
const App = () => {
  const [todoItemText, setTodoItemText] = useState(''); // text of the new to-do item [controlled component
  const [searchText, setSearchText] = useState('');

  const { mutate } = useSWRConfig()

  const completeKey = `/api/search?completed=true&size=${maxTodoListItems}${searchText ? `&search=${searchText}` : ""}`;
  const incompleteKey = `/api/search?completed=false${searchText ? `&search=${searchText}` : ""}`;

  const fetchResults = (url: string): Promise<TodoItem[]> => {
    return fetch(url)
    .then((res) =>  {
      // Handle HTTP errors
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return res.json()
    })
    .then((data: TodoItem[]) => {
      if (!data) {
        return [];
      }
      // sort by text field
      const sorted = data.sort((a, b) => {
        const textA = a?.text?.toUpperCase();
        const textB = b?.text?.toUpperCase();
        if (textA < textB) {
          return -1;
        }
        if (textA > textB) {
          return 1;
        }
        return 0;
      });
      return sorted;
    });
  }

  // refresh every 60 seconds automatically
  const fetcherOptions = {
    refreshInterval: 1000*60,
  }
  const { data: incompleteResults = [] } = useSWR(incompleteKey, fetchResults, fetcherOptions)

  const { data: completeResults = []} = useSWR(completeKey, fetchResults, fetcherOptions)

  const handleAddTodoItem = async () => {
    try {
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: todoItemText,
          completed: false,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to add task');
      }
      mutate(incompleteKey);
      mutate(completeKey);
      setTodoItemText('');
    } catch (error) {
      console.error(error);
      // Handle the error, such as displaying an error message to the user or retrying the request
    }
  };
  const handleSearchTextChange = (event: any) => {
    setSearchText(event.target.value);
  };

  const handleCheckboxChange = async (event: any, id: string) => {
    try {
      const { checked } = event.target;
      const response = await fetch(`/api/todo?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: checked }),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      mutate(incompleteKey);
      mutate(completeKey);
    } catch (error) {
      console.error(error);
      // Handle the error, such as displaying an error message to the user or retrying the request
    }
  };

  const handleDeleteAllTasksClick = async () => {
    try {
      const response = await fetch('/api/todo', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete tasks');
      }
      mutate(incompleteKey);
      mutate(completeKey);
    } catch (error) {
      console.error(error);
      // Handle the error, such as displaying an error message to the user or retrying the request
    }
  };

  return (
    <>
    <div className={classes.root}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" className={classes.appBar}>
          <Toolbar className={classes.toolbar}>
            <Typography variant="h6" className={classes.title} sx={{ mr: 2 }}>
              Todo List
            </Typography>
            <Typography variant="h6" color="inherit" component="div">
              <div className={classes.deleteButton} onClick={handleDeleteAllTasksClick}>
                <DeleteIcon /> Delete all tasks
              </div>
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>
      <br />
      <br />
      <div className={classes.mainWrapper}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Paper className={classes.paper}>
              <div className={classes.form}>
                <TextField
                  label="Add new task"
                  variant="outlined"
                  fullWidth
                  required
                  value={todoItemText}
                  onChange={(event) => setTodoItemText(event.target.value)}
                />
              </div>
              </Paper>
              <br />
              <Button type="button" variant="contained" color="primary" disabled={todoItemText === ""} onClick={() => {
                handleAddTodoItem();
              }}>
                  Add
              </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper className={classes.paper}>
              <TextField
                label="Search tasks"
                variant="outlined"
                fullWidth
                className={classes.search}
                value={searchText}
                onChange={handleSearchTextChange}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <h2>Todo Items</h2>
            {incompleteResults?.map((item) => (
                <div key={item.id}>
                  <FormControlLabel
                    control={<Checkbox checked={item.completed} onChange={(event) => handleCheckboxChange(event, item.id)} name="checked" />}
                    label={item.text}
                    className={classes.checkbox}
                  />
                </div>
            ))}
          </Grid>
          <Grid item xs={12} sm={6}>
          <h2>Finished Items</h2>
          {completeResults?.map((item) => (
              <div key={item.id}>
                <FormControlLabel
                  control={<Checkbox checked={item.completed} name="checked" onChange={(event) => handleCheckboxChange(event, item.id)}  />}
                  label={item.text}
                  // disabled
                  className={classes.checkbox}
                />
              </div>
            ))}
          </Grid>
        </Grid>
      </div>
    </div>
    </>
  );
};

export default App;
```

The `useSWR` hook is a React hook that makes it easy to fetch data from an API and update the state of your application when the data changes. The `useState` hook is a React hook that makes it easy to manage the state of your application, such as the text of the new to-do item and the search text. The `useEffect` hook is a React hook that makes it easy to run code when the page loads or when certain events occur, such as when the search text changes. The `handleAddTodoItem` function is a function that adds a new to-do item to the list. The `handleCheckboxChange` function is a function that toggles the completion status of a to-do item. The `handleDeleteAllTasksClick` function is a function that deletes all to-do items from the list.


Here are the UI elements used in the code you provided:

- AppBar: This is a toolbar that is displayed at the top of the page. It contains the title of the application and a button to delete all tasks.
- Toolbar: This is a container for the AppBar's contents.
- Typography: This is a React component that renders text with different styles.
- Button: This is a React component that renders a button.
- TextField: This is a React component that renders a text input field.
- Grid: This is a React component that lays out its children in a grid.
- Paper: This is a React component that renders a paper-like container.
- Checkbox: This is a React component that renders a checkbox.
- FormControlLabel: This is a React component that renders a label and a checkbox together.
- IconButton: This is a React component that renders a button with an icon.
- Box: This is a React component that renders a box.

The state management for useSWR works as follows:

When the useSWR hook is first called, it fetches the data from the API and stores it in the state.
If the data changes, the useSWR hook will fetch the new data from the API and update the state.
The state is then used to render the UI.
For example, when the search text changes, the useSWR hook will fetch the new data from the API and update the state. The state is then used to render the list of tasks, which will now be filtered by the new search text.


The TodoList app makes three API calls:

* A GET request to `/api/search` with the query parameters `completed` and `size` to get a list of tasks.
* A POST request to `/api/todo` to add a new task.
* PUT /api/todo with the task ID and the new completed value to update a task.

The `/api/search` endpoint takes two query parameters:

* `completed` - A boolean value indicating whether the tasks should be completed or not.
* `size` - The number of tasks to return.

The `/api/todo`endpoint with a `POST` request takes a JSON object with the following properties:

* `text` - The text of the task.
* `completed` - A boolean value indicating whether the task is completed or not.

The PUT call is made by the handleCheckboxChange function when the user checks or unchecks a checkbox. The function makes a request to the /api/todo endpoint with the task ID and the new completed value.

The TodoList app also uses the `useSWR` hook to cache the results of the `/api/search` endpoint. This means that the app will only make a request to the server if the cache is expired or if the query parameters have changed.

## Backend (API Routes)
The API handler function for `search` that takes two parameters:

req: The request object, which contains information about the request, such as the query parameters and the body.
res: The response object, which is used to send the response back to the client.
The function first checks if the request is a GET request. If it is, the function parses the query parameters and builds a SQL query. The query is then executed against the database and the results are returned to the client.

If the request is not a GET request, the function returns an error message.

Here is a more detailed explanation of what each part of the code does:

```ts
// Import the pool object from the utils/db file.
import pool from '@/utils/db';

// Import the ErrorMessage and TodoItem types from the utils/types file.
import { ErrorMessage, TodoItem } from '@/utils/types';

// Import the NextApiRequest and NextApiResponse types from the next library.
import type { NextApiRequest, NextApiResponse } from 'next';

// Define the Data type, which can either be an array of TodoItem objects or an ErrorMessage object.
type Data = TodoItem[] | ErrorMessage;

// Export the default handler function.
export default async function handler(
  // The request object.
  req: NextApiRequest,
  // The response object.
  res: NextApiResponse<Data>
) {
  // Try to execute the request.
  try {
    // Get the number of arguments that have been passed to the query.
    let numArgs = 1;

    // Get the query parameters.
    const { search, completed, size } = req.query;

    // Build the SQL query.
    let query = 'SELECT * FROM todo WHERE';

    // Create an array to store the values that will be used in the query.
    const values = [];

    // If the search parameter is not empty, add a condition to the query that matches the search term.
    if (search) {
      query += ` text ILIKE $${numArgs}`;
      values.push(`%${search}%`);
      numArgs++;
    } else {
      // If the search parameter is empty, add a condition that always evaluates to true.
      // This is necessary because the WHERE clause must always have at least one condition.
      query += ' 1=1';
    }

    // If the completed parameter is true, add a condition to the query that matches completed tasks.
    if (completed) {
      if (search) {
        // If the search parameter is not empty, add an AND operator to the query.
        query += '  ' + search ? ' AND' : '';
      }
      query += ` completed = $${numArgs}`;
      values.push(completed);
    }

    // If the size parameter is not empty, add a LIMIT clause to the query.
    if (size) {
      query += ` LIMIT ${size}`;
    }

    // Execute the query and get the results.
    const { rows } = await pool.query(query, values);

    // Send the results back to the client.
    res.status(200).json(rows);
  } catch (error) {
    // Log the error.
    console.error(error);

    // Send an error message back to the client.
    res.status(500).json({ message: 'Internal server error' });
  }
}
```

To connect to the neon database, you can use vercel integrations to do the heavy lifting.

This will add POSTGRES Environment Variables to your project, which you can use to connect to the database.

```tsx
// Import the Pool class from the pg library.
import { Pool } from 'pg';

// Create a new Pool object.
const pool = new Pool({
  // The hostname of the database server.
  host: process.env.PGHOST,
  // The username for the database connection.
  user: process.env.PGUSER,
  // The name of the database to connect to.
  database: process.env.PGDATABASE,
  // The password for the database connection.
  password: process.env.PGPASSWORD,
  // An alternative way to specify the connection parameters.
  connectionString: process.env.DATABASE_URL,
  // A configuration object for the SSL connection.
  ssl: {
    // Do not reject unauthorized certificates.
    rejectUnauthorized: false,
  },
});

// Export the pool so that it can be used by other parts of the application.
export default pool;
```

The `todo` API handler function that takes two parameters:

req: The request object, which contains information about the request, such as the query parameters and the body.
res: The response object, which is used to send the response back to the client.
The function first checks the request method. If the request method is GET, the function parses the query parameters and builds a SQL query. The query is then executed against the database and the results are returned to the client.

If the request method is POST, the function parses the request body and builds a SQL query. The query is then executed against the database and the new row is inserted.

If the request method is PUT, the function parses the request body and builds a SQL query. The query is then executed against the database and the existing row is updated.

If the request method is DELETE, the function parses the request body and builds a SQL query. The query is then executed against the database and the existing row is deleted.

If the request method is not supported, the function returns an error message.

Here is a more detailed explanation of what each part of the code does:

```ts
import pool from '@/utils/db';
import { ErrorMessage, TodoItem } from '@/utils/types';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = TodoItem[] | ErrorMessage;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { completed } = req.query;
        let query = 'SELECT * FROM todo';
        const values = [];
    
        if (completed !== undefined) {
          query += ' WHERE completed = $1';
          values.push(completed);
        }
    
        query += ' ORDER BY id DESC';
    
        const { rows } = await pool.query(query, values);
        res.status(200).json(rows);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
      break;
    case 'POST':
      try {
        const { text, completed } = req.body;
        const { rows } = await pool.query('INSERT INTO todo (text, completed) VALUES ($1, $2) RETURNING id, text, completed', [text, completed]);
        res.status(201).json(rows[0]);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
      break;
    case 'PUT':
      try {
        const { id } = req.query;
        const { completed } = req.body;
        const data = await pool.query('UPDATE todo SET completed = $1 WHERE id = $2', [ completed, id]);
        // console.log("rows", data);
        res.status(200).json(data as any);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
      break;
    case 'DELETE':
      try {
        const { id } = req.query;
        let queryString = 'DELETE FROM todo';
        let queryParams = [];
        if (id) {
          queryString += ' WHERE id = $1';
          queryParams.push(id);
        }
        await pool.query(queryString, queryParams);
        res.status(204).end();
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}
```

The Next.js Todo List app is a great example of how to use Next.js, Next API functions, and Neon Serverless Postgres to build a simple and scalable web application.


Deployed to https://todonextjs-six.vercel.app

## References:

* https://github.com/FriendlyUser/todonextjs