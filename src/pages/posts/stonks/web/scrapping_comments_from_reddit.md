---
tags: ['reddit', 'golang']
title: Using golang to filter through reddit posts
description: Leverage the reddit api to get the latest posts multiple subreddits.
pubDate: Mon, 7 November 2023
imgSrc: "/imgs/2023/3493235193_A_dream_of_a_distant_galaxy__concept_art.png"
---
Reddit is a social news aggregation, web content rating, and discussion website. Users can submit posts, such as text or direct links, and other users can vote on these posts, causing them to rise or fall in popularity. Reddit is organized into communities, known as "subreddits," which cover a vast array of topics and interests.


Web scraping with Go (Golang) can be useful in a variety of ways:

1. Data collection: Web scraping allows you to extract large amounts of data from websites, which can be useful for data analysis and research.
2. Price monitoring: Go can be used to monitor the prices of products on various websites and notify users of price changes.
3. Content aggregation: Go can be used to aggregate content from multiple websites into a single source, making it easier to find and view relevant information.
4. Automation: Go can be used to automate repetitive tasks, such as filling out forms or visiting websites, to save time and effort.
5. Testing: Go can be used to test websites for functional and performance issues, making it easier to identify and fix problems.

In summary, web scraping with Go is useful for data collection, price monitoring, content aggregation, automation, and testing, among other uses.


Parsing subreddits with the Reddit API involves using the API to extract data from Reddit and display it in a specific format. To parse subreddits using the Reddit API, you need to have an API key or access token. Once you have this, you can make HTTP requests to the Reddit API to retrieve data for a specific subreddit. The API will return the data in JSON format, which can then be processed and displayed in a way that meets your needs.

For example, to retrieve the top 10 posts in a subreddit, you can make a GET request to the following URL:

[https://www.reddit.com/r/[subreddit]/top.json?limit=10](https://www.reddit.com/r/%5Bsubreddit%5D/top.json?limit=10)

Where [subreddit] is the name of the subreddit you want to retrieve data from.

There are many libraries available in Go that simplify the process of making API calls and processing the resulting data. By using one of these libraries, you can focus on the data you want to extract and display, without having to worry about the details of making API calls and processing the results.


```go 
 package login 

import (
	"github.com/jzelinskie/geddit"
	"log"
	"github.com/dli-invest/finreddit/pkg/util"
)

// returns oauth session for reddit
// or fails - fine for my purposes
func RedditOAuth() (*geddit.OAuthSession, error) {
	client_id := util.GetEnvVar("REDDIT_CLIENT_ID")
	client_secret := util.GetEnvVar("REDDIT_CLIENT_SECRET")
	password := util.GetEnvVar("REDDIT_PASSWORD")
	username := util.GetEnvVar("REDDIT_USERNAME")
	o, err := geddit.NewOAuthSession(
		client_id,
		client_secret,
		"Stonk Market Scrapper see source https://github.com/dli-invest/finreddit",
		"http://friendlyuser.github.io",
	)
	if err != nil {
		log.Println(err)
		return nil, err
	}

	// Create new auth token for confidential clients (personal scripts/apps).
	err = o.LoginAuth(username, password)
	if err != nil {
		log.Println(err)
		return nil, err
	}
	return o, nil
} 
 ```

This code defines a Go function named "RedditOAuth" that is used to authenticate a user to the Reddit API using the "geddit" library. The function starts by retrieving four environment variables ("REDDIT\_CLIENT\_ID", "REDDIT\_CLIENT\_SECRET", "REDDIT\_PASSWORD", and "REDDIT\_USERNAME") using the "util.GetEnvVar" function from the "github.com/dli-invest/finreddit/pkg/util" package.

Next, the function creates a new OAuth session using the "geddit.NewOAuthSession" function and the retrieved environment variables. If an error occurs while creating the OAuth session, it is logged and returned.

Finally, the function logs in the user using the "o.LoginAuth" method and the "username" and "password" environment variables. If an error occurs while logging in, it is logged and returned. If the login is successful, the OAuth session is returned.


```go 
 package reddit

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/dli-invest/finreddit/pkg/csvs"
	"github.com/dli-invest/finreddit/pkg/discord"
	"github.com/dli-invest/finreddit/pkg/login"
	"github.com/dli-invest/finreddit/pkg/types"
	"github.com/dli-invest/finreddit/pkg/util"
	"github.com/jzelinskie/geddit"
)

// gets submissions a given SRConfiguration
func GetSubmissions(session *geddit.OAuthSession, cfg types.SRConfig) []*geddit.Submission {
	subreddit := cfg.Name
	limit := cfg.Limit
	subOpts := geddit.ListingOptions{
		Limit: limit,
	}
	if cfg.After != "" {
		subOpts.After = cfg.After
	}
	submissions, err := session.SubredditSubmissions(subreddit, geddit.NewSubmissions, subOpts)
	if err != nil {
		log.Fatal("Failed to retrieve subreddit posts for " + subreddit)
	}
	// further filter entries by minScore and minComments
	var validSubmissions = []*geddit.Submission{}

	for _, submission := range submissions {
		if submission.NumComments != 0 && cfg.MinScore != 0 {
			if submission.NumComments >= cfg.MinComments && submission.Score >= cfg.MinScore {
				validSubmissions = append(validSubmissions, submission)
				continue
			}
		}
		if cfg.LinkFlairText != "" {
			// checking for flair
			if strings.Contains(submission.LinkFlairText, cfg.LinkFlairText) {
				validSubmissions = append(validSubmissions, submission)
				continue
			}
		}
		if len(cfg.Phrases) != 0 {
			// search through phrases
			title := strings.ToLower(submission.Title)
			// check matches word
			for _, phrase := range cfg.Phrases {
				// check if phrase is contained in title
				lowerPhrase := strings.ToLower(phrase)
				addSubmission := strings.Contains(title, lowerPhrase)
				if addSubmission {
					validSubmissions = append(validSubmissions, submission)
					continue
				}
			}
		}
	}
	return validSubmissions
}

// Scans subreddits from config file
// for example cmd/scan_sr/simple.yml
func ScanSRs(cfgPathStr string) {
	// login to reddit
	o, err := login.RedditOAuth()
	if err != nil {
		log.Fatal("Failed to initialize Reddit Scrapper")
	}
	// read subreddits from config file
	cfgPath := util.MkPathFromStr(cfgPathStr)
	cfg, err := util.NewConfig(cfgPath)
	if err != nil {
		log.Fatal(err)
	}
	csvsPath := util.MkPathFromStr(cfg.Data.CsvPath)
	// print header row only used when
	if cfg.Data.NoMessage {
		fmt.Printf("%s\t%s\t%s\t%s\t%s\t%s\n", "subreddit", "url", "title", "author", "linkFlairText", "date")
	}
	for _, srCfg := range cfg.Data.SubReddits {
		srSubmissions := GetSubmissions(o, srCfg)
		for _, s := range srSubmissions {
			// check if submission is in csv already
			// aware that constantly opening the csv is inefficient
			// but I am dealing with a reasonable amount of entires
			hasValue := csvs.FindInCsv(csvsPath, s.FullID, 1)
			if hasValue {
				// no value, do nothing here
			} else {
				// seems like a lot of posts, wondering if I will hit
				// post limit, sleep 2 seconds after each post.
				// append to csv
				sData := [][]string{{srCfg.Name, s.FullID, s.URL}}
				csvs.AppendToCsv(csvsPath, sData)
				if cfg.Data.NoMessage {
					// output this as a csv for parsing in other programs
					// fmt.Println("Not sending to subreddit")
					fmt.Printf("%s\t%s\t%s\t%s\t%s\t%f\n", s.Subreddit, s.FullPermalink(), s.Title, s.Author, s.LinkFlairText, s.DateCreated)
				} else {
					discordPayload := MapSubmissionToEmbed(s)
					_, err := discord.SendWebhook(discordPayload)
					if err != nil {
						fmt.Println(s.FullID)
						fmt.Println(err)
					}
					time.Sleep(2 * time.Second)
				}
			}
		}
	}
}

func MapSubmissionToEmbed(submission *geddit.Submission) types.DiscordPayload {
	description := fmt.Sprintf(
		"%s (%d Likes, %d Comments)",
		submission.Author,
		submission.Score,
		submission.NumComments)
	// get timestamp
	var dateCreated int64 = int64(submission.DateCreated)
	t := time.Unix(dateCreated, 0)
	timestamp := t.Format(time.RFC3339)
	title := fmt.Sprintf("%s - %s", submission.Subreddit, submission.Title)
	discordEmbed := []types.DiscordEmbed{{
		Title:       title,
		Url:         submission.URL,
		Description: description,
		Timestamp:   timestamp,
	}}
	discordPayload := types.DiscordPayload{Embeds: discordEmbed}
	return discordPayload
}
 
 ```

This code is a Reddit scraper in Golang, which is a part of a project "finreddit". It uses the geddit library for connecting to the Reddit API and retrieve submissions from given subreddit. The code filters the submissions based on various conditions such as minimum score, minimum comments, link flair text, and certain phrases. The filtered submissions are then appended to a CSV file. The code also includes a ScanSRs function, which reads subreddit configurations from a YAML file, logs into Reddit using OAuth authentication, and retrieves the submissions using the GetSubmissions function.


```go 
 package csvs

// csv utilties to prevent duplicate entries
// probably manually clear out every now and then
import (
    "encoding/csv"
    "fmt"
    "os"
)

// read csv from file path
func ReadCsvFile(filePath string) [][]string {
    f, err := os.Open(filePath)
    if err != nil {
        fmt.Println("Unable to read input file " + filePath, err)
    }
    defer f.Close()

    csvReader := csv.NewReader(f)
    records, err := csvReader.ReadAll()
    if err != nil {
        fmt.Println("Unable to parse file as CSV for " + filePath, err)
    }

    return records
}

func AppendRowToCsv(fileName string, data []string) {
    f, err := os.OpenFile(fileName, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		fmt.Println(err)
		return
    }
    w := csv.NewWriter(f)
    err = w.Write(data)
    if err != nil {
        fmt.Println("Append Error")
        fmt.Println(err)
    }
    w.Flush()
}

// append rows to csvs
func AppendToCsv(fileName string, data [][]string) {
    f, err := os.OpenFile(fileName, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		fmt.Println(err)
		return
	}
    w := csv.NewWriter(f)
    for _, row:= range data {
        err = w.Write(row)
        if err != nil {
            fmt.Println("Append Error")
            fmt.Println(err)
        }
	}
	w.Flush()
}

// check if value exists in csv
func FindInCsv(filePath string, searchValue string, searchColumn int) (bool) {
    records := ReadCsvFile(filePath)
    foundValue := false
    for _, row:= range records {
        valueInRow := row[searchColumn]
        if searchValue == valueInRow {
            foundValue = true
            break
        }
	}
    return foundValue
} 
 ```

This is a Go library for working with CSV (Comma Separated Values) files. It provides functions to read, append and check if a value exists in a CSV file.

* `ReadCsvFile` reads a CSV file from the given file path and returns the data as a two-dimensional slice of strings.
* `AppendRowToCsv` appends a single row of data to the CSV file with the given file name.
* `AppendToCsv` appends multiple rows of data to the CSV file with the given file name.
* `FindInCsv` checks if a value exists in a specific column of the CSV file at the given file path. It returns a boolean indicating whether the value was found.

A Discord webhook is a tool that allows you to send messages to a Discord channel from an external source. It is a URL that enables you to send messages to a specific Discord channel from your own website, application, or other platform. The messages appear as if they were sent by a user within Discord, but they are actually sent programmatically. This allows you to integrate Discord into your own systems, such as sending notifications, updates, or other automated messages.


```go 
 package discord 

import (
	"os"
	"log"
	"encoding/json"
	"net/http"
	"github.com/dli-invest/finreddit/pkg/types"
	"bytes"
)

func SendWebhook(discordWebhook types.DiscordPayload) (*http.Response, error){
	discordUrl := os.Getenv("DISCORD_WEBHOOK")
	if discordUrl == "" {
		log.Fatal("DISCORD_WEBHOOK not set")
	}
	webhookData, err := json.Marshal(discordWebhook)
	if err != nil {
		log.Fatal(err)
	}
	resp, err := http.Post(discordUrl, "application/json", bytes.NewBuffer(webhookData))
	return resp, err
}
 
 ```

This is a Go function named "SendWebhook" that posts a Discord webhook to a specified Discord channel. The Discord webhook URL is obtained from an environment variable named "DISCORD\_WEBHOOK". The input to the function is a DiscordPayload of type "types.DiscordPayload" and contains the data to be sent in the webhook. The function then uses the "json" package to marshal the input into a JSON string, and the "http" package to send a HTTP POST request to the Discord webhook URL with the JSON string as the payload. The response from the POST request and any error are returned from the function.


GitHub Actions allows you to automate tasks such as building, testing, and deploying code. It also supports automating tasks to run on a schedule using workflows. You can create a workflow that runs on a schedule using the "schedule" trigger in your workflow file.

Here's an example of a workflow that runs every day at 8pm UTC:


```yaml
name: Schedule Task

on:
 schedule:
 - cron: '0 20 \* \* \*'

jobs:
 task:
 runs-on: ubuntu-latest
 steps:
 - name: Run Task
 run: echo "Running Task on Schedule"
```
This workflow specifies that it should run on a schedule using the `schedule` trigger and the `cron` value of `0 20 * * *`. The `cron` value represents a standard cron syntax that specifies the schedule. In this case, it runs every day at 8pm UTC.

You can add additional steps in the `steps` section to perform any other tasks you need to automate. You can also use environment variables in your workflow to pass in any required information, such as API keys or file paths.


```yaml 
 on:
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron: '50 * * * *'
  push:
    branches:
      - main

env: 
  REDDIT_CLIENT_ID: ${{ secrets.REDDIT_CLIENT_ID }}
  REDDIT_CLIENT_SECRET: ${{ secrets.REDDIT_CLIENT_SECRET }}
  REDDIT_PASSWORD: ${{ secrets.REDDIT_PASSWORD }}
  REDDIT_USERNAME: ${{ secrets.REDDIT_USERNAME }}
  DISCORD_WEBHOOK: ${{ secrets.DISCORD_REDDIT_WEBHOOK}}

name: Send Updates
jobs:
  run:
    strategy:
      matrix:
        go-version: [1.15.x]
        platform: [ubuntu-latest]
    runs-on: ${{ matrix.platform }}
    steps:
    - name: Install Go
      if: success()
      uses: actions/setup-go@v2
      with:
        go-version: ${{ matrix.go-version }}
    - name: Checkout code
      uses: actions/checkout@v2
    - name: Run job
      run: go run cmd/scan_sr/manga.go

    - name: Commit files
      id: commit
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add internal/*.csv
        git commit -m "Updating csv"
      continue-on-error: true

    - name: Push changes
      uses: ad-m/github-push-action@master
      continue-on-error: true
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        branch: ${{ github.ref }}
 
 ```

This code is a GitHub Actions workflow that automates the task of sending updates. The schedule of the task is set to run every hour at 50 minutes past the hour, and it will only run when the main branch is pushed.

The workflow sets environment variables for Reddit API credentials (client ID, client secret, password, and username) and a Discord webhook URL, all of which are stored as GitHub secrets.

The job runs on an Ubuntu latest machine and uses Go version 1.15.x. The job checks out the code, runs the scan\_sr/manga.go script, and if successful, commits the updated csv files to the repository and pushes the changes. The action uses a GitHub push action to push the changes.


### References 

* https://github.com/dli-invest/finreddit 
* https://pkg.go.dev/github.com/dli-invest/finreddit
