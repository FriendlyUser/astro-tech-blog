---
tags: ['github', 'ci']
title: Introduction to github actions and how to use them
description: This blog post covers how to use github actions to automate tasks.
pubDate: Mon, 13 November 2023
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/2543580613.png"
---
YAML (short for "YAML Ain't Markup Language") is a human-readable data serialization format. It is commonly used for configuration files, data exchange between systems, and in many other applications.

The basic structure of a YAML file consists of a series of key-value pairs, separated by colons. Keys are always strings, and values can be strings, numbers, booleans, arrays, or other complex data structures. Here is an example of a simple YAML file:


```yaml
makefile`name: John Doe
age: 35
email: john.doe@example.com

interests:
 - programming
 - photography
 - hiking
```
In this example, `name`, `age`, and `email` are the keys, and their corresponding values are strings. The key `interests` has an array of values as its value.

YAML also provides syntax for more complex data structures, such as nested dictionaries and arrays. The indentation in a YAML file is important, as it defines the structure of the data.

Here is an example of a nested data structure in YAML:


```yaml
person:
 name: John Doe
 age: 35
 email: john.doe@example.com

 interests:
 - programming
 - photography
 - hiking
```
In this example, the key `person` has a nested dictionary as its value, which contains the keys `name`, `age`, `email`, and `interests`.

YAML is a versatile and widely used format that is easy to read and write. It is often used in combination with other technologies, such as Ansible, to manage configurations and deploy software.


A schedule, or cron job, is a task that runs automatically at specified intervals on a Unix-based operating system. The task is defined in a special file called the crontab file, which specifies the schedule and command to run.

Cron uses a simple syntax to define the schedule for a task, with each line in the crontab file representing a single cron job. The syntax consists of six fields, separated by spaces:


```txt
* * * * * command
- - - - -
| | | | |
| | | | ----- Day of week (0 - 7) (Sunday = both 0 and 7)
| | | ------- Month (1 - 12)
| | --------- Day of month (1 - 31)
| ----------- Hour (0 - 23)
------------- Minute (0 - 59)
```
The first five fields represent the schedule, and the last field is the command to run. The asterisk (`*`) is a wildcard that matches any value, so a schedule of `* * * * *` would run every minute of every day.

Here is an example of a cron job that runs a script every day at 4 PM:


```yaml
0 16 * * * /path/to/script.sh
```
Cron jobs can be managed using the `crontab` command, which allows you to view, edit, and delete cron jobs for a user. You can also use the `crontab` command to specify the location of a crontab file for a user, for example:


```bash
crontab /path/to/crontab.file
```
Cron is a powerful tool that can automate many types of tasks, such as backing up data, sending emails, or updating databases. However, it is important to use it responsibly and make sure that the tasks you run do not interfere with other systems or processes.


```yaml 
name: Scrap News

on:
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron:  '10/20 13-19 * * 1-5'

jobs:
  scrap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: actions/setup-dotnet@v1
        with:
          dotnet-version: '3.1.100' # SDK Version to use.
      - run: dotnet restore
      - run: dotnet build -o out
      - run: dotnet out/news-alert.dll
        env:
          DISCORD_WEBHOOK: ${{secrets.DISCORD_WEBHOOK}}
          ES_INSTANCE: ${{secrets.ES_INSTANCE}}
 
 ```

This YAML file defines a GitHub Actions workflow named `Scrap News`. The workflow is triggered by a schedule defined in the `on` section.

The schedule is defined using a cron expression: `10/20 13-19 * * 1-5`. This expression runs the workflow every 20 minutes between the hours of 1 PM and 7 PM, from Monday to Friday (1-5).

The workflow contains a single job named `scrap`. The job is set to run on the latest version of Ubuntu.

The job has several steps, each represented by a step in the `steps` section. The steps perform the following actions:

1. Check out the code from the repository using the `actions/checkout@master` action.
2. Set up .NET using the `actions/setup-dotnet@v1` action, specifying a .NET version of `3.1.100`.
3. Restore the .NET dependencies using the `dotnet restore` command.
4. Build the .NET project using the `dotnet build -o out` command.
5. Run the .NET project using the `dotnet out/news-alert.dll` command. This step also sets two environment variables: `DISCORD_WEBHOOK` and `ES_INSTANCE`. These variables are stored as secrets in the GitHub repository and are passed to the .NET application to allow it to interact with Discord and Elasticsearch.

To trigger a GitHub Actions workflow on a push event, you can use the following YAML syntax in the `on` section of your workflow file:


```yaml
on:
 push:
 branches:
 - main
```
In this example, the workflow will be triggered every time a push event is made to the `main` branch of your repository.

You can also specify multiple branches to trigger the workflow, for example:


```yaml
on:
 push:
 branches:
 - main
 - dev
```
In this example, the workflow will be triggered on push events to both the `main` and `dev` branches of your repository.

If you want to trigger the workflow on pushes to all branches, you can use the following syntax:


```yaml
on:
 push:
```
Note that you can combine multiple events in the `on` section, for example, to trigger the workflow on both push events and schedule events, you can use the following syntax:


```yaml
on:
 push:
 branches:
 - main
 schedule:
 - cron: '0 0 \* \* \*'
```
In this example, the workflow will be triggered on pushes to the `main` branch and on a daily schedule at midnight.


To generate a GitHub token with write permissions, you need to follow these steps:

Log in to your GitHub account.

Go to your GitHub settings by clicking on your profile picture in the upper-right corner and selecting "Settings."

Click on the "Developer settings" option in the left-side menu.

Select the "Personal access tokens" option under "Developer settings."

Click on the "Generate new token" button.

Give your token a descriptive name and select the appropriate scopes for your use case. For example, if you want to use the token for triggering GitHub Actions, you need to select the "repo" scope, which provides write access to repositories.

Click on the "Generate token" button.

Store the generated token in a secure place, as it will only be displayed once and cannot be retrieved later.

With this token, you can now use the GitHub API or other tools to interact with GitHub, such as triggering GitHub Actions, creating and managing issues, or managing your repositories. Just make sure to keep your token secure, as it provides write access to your repositories.

GitHub Actions are designed to run only when there are new commits or other events that trigger a workflow. After 60 days of inactivity, workflows that have not been triggered will be automatically stopped to conserve resources and ensure optimal performance for active workflows.

The 60-day limit is in place to prevent workflows from running indefinitely without being updated, as this can consume system resources and potentially impact other workflows running on the same infrastructure. Inactive workflows can always be restarted by pushing new commits to the repository, which will trigger the workflow again.

By stopping inactive workflows, GitHub is able to provide a stable and efficient platform for continuous integration and continuous deployment, enabling developers to automate their workflows and deliver better results to their users more quickly and reliably.

```yaml
name: Update CRON
# Make update to public file to keep workflows running
on:
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron:  '1 1 1 * *'


jobs:
  update_cron:
    name: Generate Report
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Update Cron
        run: |
          echo "c\n" >> CRON.md
      
      - name: Update resources
        uses: test-room-7/action-update-file@v1
        with:
            file-path: CRON.md
            commit-msg: Update CRON.md
            github-token: ${{ secrets.GITHUB_TOKEN }}
```


## References

- https://github.com/FriendlyUser/news-alert/blob/master/.github/workflows/CRON.yml
- https://github.com/FriendlyUser/news-alert/blob/master/.github/workflows/scrapNews.yml
