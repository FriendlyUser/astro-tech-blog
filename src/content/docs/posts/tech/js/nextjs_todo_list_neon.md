---
title: Build a to-do list with Next.js API routes and Neon Postgres
description: "A Next.js to-do app with an MUI frontend, SWR data fetching, Pages Router API routes, and a Neon Postgres database accessed through node-postgres."
alt: my first blog post
tags: ["react","js","nextjs","typescript","sql"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 16 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/neon-article.webp'
---

This is a walkthrough of a small to-do app I built with Next.js. It is a single page: an MUI frontend that fetches data with SWR, two API routes (`/api/search` and `/api/todo`) built with Next.js API routes, and a Postgres database hosted on [Neon](https://neon.com). Neon is a separate company from Vercel, but it is available as a Vercel Marketplace integration, which makes it easy to wire into a Vercel deployment.

The project was written against Next.js 13.3, MUI v5, SWR 2 and `pg` 8. It uses the Pages Router (`pages/api/...`), which current Next.js versions still support. If you use the App Router instead, the same handlers become [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) in `app/api/.../route.ts`.

## Database

The app uses one table:

```sql
CREATE TABLE todo (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

The shared types live in `utils/types.ts`:

```ts
export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export interface ErrorMessage {
  message: string;
}
```

### Connecting to Neon

`utils/db.ts` creates a single `pg` connection pool that the API routes share:

```ts
import { Pool } from 'pg';

// On Vercel, the Neon integration sets DATABASE_URL.
// Locally, if DATABASE_URL is unset, pg falls back to the PGHOST, PGUSER,
// PGDATABASE, PGPASSWORD and PGPORT environment variables.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

Neon connection strings already include `sslmode=require`, so there is no need for an `ssl` option. In particular, don't set `rejectUnauthorized: false`, which turns off certificate verification. Note that the Vercel integration's `DATABASE_URL` points at Neon's pooled (PgBouncer) endpoint by default.

## Backend (API routes)

### `/api/search`

The frontend uses this route for both lists. It accepts three optional query parameters:

- `search`: a substring to match against the task text (case-insensitive, using `ILIKE`)
- `completed`: `true` or `false`
- `size`: the maximum number of rows to return

```ts
// pages/api/search.ts
import pool from '@/utils/db';
import type { ErrorMessage, TodoItem } from '@/utils/types';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = TodoItem[] | ErrorMessage;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { search, completed, size } = req.query;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (typeof search === 'string' && search !== '') {
    values.push(`%${search}%`);
    conditions.push(`text ILIKE $${values.length}`);
  }

  if (completed === 'true' || completed === 'false') {
    values.push(completed);
    conditions.push(`completed = $${values.length}`);
  }

  let query = 'SELECT id, text, completed FROM todo';
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY id DESC';

  const limit = Number(size);
  if (Number.isInteger(limit) && limit > 0) {
    values.push(limit);
    query += ` LIMIT $${values.length}`;
  }

  try {
    const { rows } = await pool.query<TodoItem>(query, values);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
```

Building the `WHERE` clause from an array of conditions avoids the classic bug of forgetting the `AND` between clauses. Every user-supplied value, including the `LIMIT`, goes through a `$n` placeholder so nothing from the query string is concatenated into the SQL. The `ORDER BY id DESC` makes `size` return the most recent rows rather than an arbitrary subset.

### `/api/todo`

This route handles create, update and delete, plus a plain `GET`:

```ts
// pages/api/todo.ts
import pool from '@/utils/db';
import type { ErrorMessage, TodoItem } from '@/utils/types';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = TodoItem | TodoItem[] | ErrorMessage;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const { completed } = req.query;
        let query = 'SELECT id, text, completed FROM todo';
        const values: string[] = [];
        if (completed === 'true' || completed === 'false') {
          query += ' WHERE completed = $1';
          values.push(completed);
        }
        query += ' ORDER BY id DESC';
        const { rows } = await pool.query<TodoItem>(query, values);
        return res.status(200).json(rows);
      }

      case 'POST': {
        const { text, completed = false } = req.body;
        if (typeof text !== 'string' || text.trim() === '') {
          return res.status(400).json({ message: 'text is required' });
        }
        const { rows } = await pool.query<TodoItem>(
          'INSERT INTO todo (text, completed) VALUES ($1, $2) RETURNING id, text, completed',
          [text, completed]
        );
        return res.status(201).json(rows[0]);
      }

      case 'PUT': {
        const { id } = req.query;
        const { completed } = req.body;
        const { rows } = await pool.query<TodoItem>(
          'UPDATE todo SET completed = $1 WHERE id = $2 RETURNING id, text, completed',
          [completed, id]
        );
        if (rows.length === 0) {
          return res.status(404).json({ message: 'Task not found' });
        }
        return res.status(200).json(rows[0]);
      }

      case 'DELETE': {
        // With ?id=..., delete one task; without it, delete every task.
        const { id } = req.query;
        if (id) {
          await pool.query('DELETE FROM todo WHERE id = $1', [id]);
        } else {
          await pool.query('DELETE FROM todo');
        }
        return res.status(204).end();
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
```

Next.js parses JSON request bodies for API routes automatically when the client sends `Content-Type: application/json`, which is why `req.body` can be destructured directly.

## Frontend

The page (`pages/index.tsx`) keeps two pieces of local state, the new task text and the search text, and uses two `useSWR` calls: one for open tasks and one for the 10 most recent finished tasks. Each SWR key is the request URL, so changing the search text changes the key and SWR fetches the filtered list. After a write, the handlers call `mutate(key)` to revalidate both lists. `refreshInterval` also refetches every 60 seconds.

```tsx
import React, { useState } from 'react';
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
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import useSWR, { useSWRConfig } from 'swr';
import type { TodoItem } from '@/utils/types';
import classes from './index.module.css';

const maxTodoListItems = 10;

const fetchResults = async (url: string): Promise<TodoItem[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch tasks');
  }
  const data: TodoItem[] = (await res.json()) ?? [];
  // Sort alphabetically by text, ignoring case.
  return data.sort((a, b) =>
    a.text.localeCompare(b.text, undefined, { sensitivity: 'base' })
  );
};

const App = () => {
  const [todoItemText, setTodoItemText] = useState('');
  const [searchText, setSearchText] = useState('');
  const { mutate } = useSWRConfig();

  const searchParam = searchText ? `&search=${encodeURIComponent(searchText)}` : '';
  const completeKey = `/api/search?completed=true&size=${maxTodoListItems}${searchParam}`;
  const incompleteKey = `/api/search?completed=false${searchParam}`;

  const swrOptions = { refreshInterval: 60 * 1000 };
  const { data: incompleteResults = [] } = useSWR(incompleteKey, fetchResults, swrOptions);
  const { data: completeResults = [] } = useSWR(completeKey, fetchResults, swrOptions);

  const refreshLists = () => {
    mutate(incompleteKey);
    mutate(completeKey);
  };

  const handleAddTodoItem = async () => {
    try {
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: todoItemText, completed: false }),
      });
      if (!response.ok) {
        throw new Error('Failed to add task');
      }
      refreshLists();
      setTodoItemText('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleCheckboxChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    id: number
  ) => {
    try {
      const response = await fetch(`/api/todo?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: event.target.checked }),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      refreshLists();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAllTasksClick = async () => {
    try {
      const response = await fetch('/api/todo', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete tasks');
      }
      refreshLists();
    } catch (error) {
      console.error(error);
    }
  };

  const renderItems = (items: TodoItem[]) =>
    items.map((item) => (
      <div key={item.id}>
        <FormControlLabel
          control={
            <Checkbox
              checked={item.completed}
              onChange={(event) => handleCheckboxChange(event, item.id)}
            />
          }
          label={item.text}
          className={classes.checkbox}
        />
      </div>
    ));

  return (
    <div className={classes.root}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" className={classes.appBar}>
          <Toolbar className={classes.toolbar}>
            <Typography variant="h6" className={classes.title} sx={{ mr: 2 }}>
              Todo List
            </Typography>
            <Button color="inherit" startIcon={<DeleteIcon />} onClick={handleDeleteAllTasksClick}>
              Delete all tasks
            </Button>
          </Toolbar>
        </AppBar>
      </Box>
      <div className={classes.mainWrapper}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Paper className={classes.paper}>
              <TextField
                label="Add new task"
                variant="outlined"
                fullWidth
                required
                value={todoItemText}
                onChange={(event) => setTodoItemText(event.target.value)}
              />
            </Paper>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              disabled={todoItemText.trim() === ''}
              onClick={handleAddTodoItem}
            >
              Add
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper className={classes.paper}>
              <TextField
                label="Search tasks"
                variant="outlined"
                fullWidth
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <h2>Todo Items</h2>
            {renderItems(incompleteResults)}
          </Grid>
          <Grid item xs={12} sm={6}>
            <h2>Finished Items</h2>
            {renderItems(completeResults)}
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default App;
```

The `classes` come from a CSS module (`index.module.css`) in the repo; any styling works.

## Gotchas

- **MUI version.** The `<Grid item xs={12} sm={6}>` syntax is MUI v5/v6. In MUI v7 that component is renamed `GridLegacy`, and the new `Grid` drops the `item` prop in favour of `size={{ xs: 12, sm: 6 }}`.
- **Search on every keystroke.** Each keypress creates a new SWR key and a new request. For a real app, debounce the search text before building the key.
- **Delete all has no confirmation.** `DELETE /api/todo` without an `id` wipes the table, and anyone who can reach the deployment can call it. There is no authentication in this project.
- **`encodeURIComponent` the search text.** Without it, a search containing `&` or `#` breaks the query string.

The app is deployed at https://todonextjs-six.vercel.app.

## References

- Source: https://github.com/FriendlyUser/todonextjs
- [Next.js API routes (Pages Router)](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [SWR docs](https://swr.vercel.app/docs/getting-started)
- [node-postgres pooling](https://node-postgres.com/features/pooling)
- [Neon on Vercel](https://neon.com/docs/guides/vercel-overview)
