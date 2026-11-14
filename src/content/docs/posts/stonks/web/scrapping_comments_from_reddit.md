---
tags: ['reddit', 'golang', 'go']
title: Filtering Reddit posts with Go and sending matches to Discord
description: How my finreddit project pulls new posts from several subreddits with the Reddit API, filters them by score, flair and keywords, and posts matches to a Discord webhook.
pubDate: Mon, 7 November 2023
lastUpdated: 2026-11-14
imgSrc: "/imgs/2023/3493235193-a-dream-of-a-distant-galaxy-concept-art.webp"
projects: ["finreddit"]
layout: '@/templates/BasePost.astro'
---

:::caution
Since November 2025, new Reddit API access requires approval under Reddit's Responsible Builder Policy; you can no longer create a working API key self-service. Existing approved apps keep working. The [geddit](https://github.com/jzelinskie/geddit) library used here hasn't been updated since 2023, but the endpoints it calls still exist.
:::

[finreddit](https://github.com/dli-invest/finreddit) is a small Go program I run on a schedule. It reads a list of subreddits from a YAML config, pulls the newest posts from each, keeps the ones that match my filters (minimum score and comments, a link flair, or keywords in the title), and sends each new match to a Discord channel. A CSV file in the repo remembers which posts were already sent.

## Reddit API basics

Every subreddit listing is available as JSON by appending `.json` to its URL, e.g. `https://www.reddit.com/r/<subreddit>/new.json?limit=10`. Reddit's Data API terms say traffic that doesn't use OAuth will be blocked, so for anything scheduled, use an approved "script" app and OAuth. Requests then go to `https://oauth.reddit.com` with a bearer token, and the free tier allows 100 queries per minute per client ID. Reddit also asks for a descriptive `User-Agent`.

## Logging in

I use [geddit](https://github.com/jzelinskie/geddit), which handles the OAuth "password" grant that script apps use. Credentials come from environment variables:

```go
package login

import (
	"log"

	"github.com/dli-invest/finreddit/pkg/util"
	"github.com/jzelinskie/geddit"
)

// returns oauth session for reddit
// or fails - fine for my purposes
func RedditOAuth() (*geddit.OAuthSession, error) {
	clientID := util.GetEnvVar("REDDIT_CLIENT_ID")
	clientSecret := util.GetEnvVar("REDDIT_CLIENT_SECRET")
	password := util.GetEnvVar("REDDIT_PASSWORD")
	username := util.GetEnvVar("REDDIT_USERNAME")
	o, err := geddit.NewOAuthSession(
		clientID,
		clientSecret,
		"Stonk Market Scrapper see source https://github.com/dli-invest/finreddit",
		"http://friendlyuser.github.io",
	)
	if err != nil {
		log.Println(err)
		return nil, err
	}

	// Create new auth token for confidential clients (personal scripts/apps).
	if err := o.LoginAuth(username, password); err != nil {
		log.Println(err)
		return nil, err
	}
	return o, nil
}
```

The third argument is the User-Agent; the fourth is the redirect URL registered with the app (unused by the password grant, but required).

## Filtering submissions and sending them

`GetSubmissions` fetches the newest posts for one subreddit config and applies the filters. A post is kept if it passes any one of them. `ScanSRs` loops over every subreddit in the config file, skips posts already in the CSV, and either prints them as tab-separated rows or sends them to Discord.

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
	subOpts := geddit.ListingOptions{Limit: cfg.Limit}
	if cfg.After != "" {
		subOpts.After = cfg.After
	}
	submissions, err := session.SubredditSubmissions(cfg.Name, geddit.NewSubmissions, subOpts)
	if err != nil {
		log.Fatal("Failed to retrieve subreddit posts for " + cfg.Name)
	}

	var validSubmissions []*geddit.Submission
	for _, submission := range submissions {
		// filter by minScore and minComments
		if submission.NumComments != 0 && cfg.MinScore != 0 {
			if submission.NumComments >= cfg.MinComments && submission.Score >= cfg.MinScore {
				validSubmissions = append(validSubmissions, submission)
				continue
			}
		}
		// filter by flair
		if cfg.LinkFlairText != "" && strings.Contains(submission.LinkFlairText, cfg.LinkFlairText) {
			validSubmissions = append(validSubmissions, submission)
			continue
		}
		// filter by phrases in the title
		title := strings.ToLower(submission.Title)
		for _, phrase := range cfg.Phrases {
			if strings.Contains(title, strings.ToLower(phrase)) {
				validSubmissions = append(validSubmissions, submission)
				break // one match is enough; don't add the post twice
			}
		}
	}
	return validSubmissions
}

// Scans subreddits from config file
// for example cmd/scan_sr/simple.yml
func ScanSRs(cfgPathStr string) {
	o, err := login.RedditOAuth()
	if err != nil {
		log.Fatal("Failed to initialize Reddit Scrapper")
	}
	cfg, err := util.NewConfig(util.MkPathFromStr(cfgPathStr))
	if err != nil {
		log.Fatal(err)
	}
	csvsPath := util.MkPathFromStr(cfg.Data.CsvPath)
	// header row, only used when printing instead of sending to Discord
	if cfg.Data.NoMessage {
		fmt.Printf("%s\t%s\t%s\t%s\t%s\t%s\n", "subreddit", "url", "title", "author", "linkFlairText", "date")
	}
	for _, srCfg := range cfg.Data.SubReddits {
		for _, s := range GetSubmissions(o, srCfg) {
			// re-reading the csv for every post is inefficient,
			// but I am dealing with a reasonable amount of entries
			if csvs.FindInCsv(csvsPath, s.FullID, 1) {
				continue
			}
			csvs.AppendToCsv(csvsPath, [][]string{{srCfg.Name, s.FullID, s.URL}})
			if cfg.Data.NoMessage {
				// output as tab-separated rows for parsing in other programs
				fmt.Printf("%s\t%s\t%s\t%s\t%s\t%f\n", s.Subreddit, s.FullPermalink(), s.Title, s.Author, s.LinkFlairText, s.DateCreated)
				continue
			}
			resp, err := discord.SendWebhook(MapSubmissionToEmbed(s))
			if err != nil {
				fmt.Println(s.FullID, err)
			} else {
				resp.Body.Close()
			}
			// stay under Discord's webhook rate limit
			time.Sleep(2 * time.Second)
		}
	}
}

func MapSubmissionToEmbed(submission *geddit.Submission) types.DiscordPayload {
	description := fmt.Sprintf(
		"%s (%d Likes, %d Comments)",
		submission.Author,
		submission.Score,
		submission.NumComments)
	timestamp := time.Unix(int64(submission.DateCreated), 0).Format(time.RFC3339)
	title := fmt.Sprintf("%s - %s", submission.Subreddit, submission.Title)
	return types.DiscordPayload{Embeds: []types.DiscordEmbed{{
		Title:       title,
		Url:         submission.URL,
		Description: description,
		Timestamp:   timestamp,
	}}}
}
```

Compared with the first version of this post, the phrase loop now `break`s after a match. It used `continue`, which only skipped to the next phrase, so a title matching two phrases was added twice. The webhook response body is also closed now.

## Remembering what was sent

The CSV helpers are deliberately simple: read the whole file, check a column, append rows. I clear the file out by hand every now and then.

```go
package csvs

// csv utilities to prevent duplicate entries
import (
	"encoding/csv"
	"fmt"
	"os"
)

// read csv from file path; returns nil if the file doesn't exist yet
func ReadCsvFile(filePath string) [][]string {
	f, err := os.Open(filePath)
	if err != nil {
		fmt.Println("Unable to read input file "+filePath, err)
		return nil
	}
	defer f.Close()

	records, err := csv.NewReader(f).ReadAll()
	if err != nil {
		fmt.Println("Unable to parse file as CSV for "+filePath, err)
	}
	return records
}

// append rows to csv
func AppendToCsv(fileName string, data [][]string) {
	f, err := os.OpenFile(fileName, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer f.Close()

	w := csv.NewWriter(f)
	if err := w.WriteAll(data); err != nil { // WriteAll flushes
		fmt.Println("Append Error", err)
	}
}

// check if value exists in a column of the csv
func FindInCsv(filePath string, searchValue string, searchColumn int) bool {
	for _, row := range ReadCsvFile(filePath) {
		if searchColumn < len(row) && row[searchColumn] == searchValue {
			return true
		}
	}
	return false
}
```

The original version never closed the file in the append helpers and indexed `row[searchColumn]` without a length check, which panics on a short row.

## Sending to Discord

A Discord webhook is a URL tied to one channel; POSTing JSON to it creates a message. Create one under the channel's *Integrations* settings. The URL is effectively a password, so keep it in an environment variable.

```go
package discord

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/dli-invest/finreddit/pkg/types"
)

// caller must close resp.Body when err is nil
func SendWebhook(discordWebhook types.DiscordPayload) (*http.Response, error) {
	discordUrl := os.Getenv("DISCORD_WEBHOOK")
	if discordUrl == "" {
		log.Fatal("DISCORD_WEBHOOK not set")
	}
	webhookData, err := json.Marshal(discordWebhook)
	if err != nil {
		log.Fatal(err)
	}
	return http.Post(discordUrl, "application/json", bytes.NewBuffer(webhookData))
}
```

## Running it on a schedule with GitHub Actions

The workflow runs at 50 minutes past every hour and on every push to `main`. It runs the scanner, then commits the updated CSV back to the repo so the next run knows what was already sent. Secrets hold the Reddit credentials and the webhook URL.

```yaml
name: Send Updates

on:
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron: '50 * * * *'
  push:
    branches:
      - main

permissions:
  contents: write  # needed to push the updated csv

env:
  REDDIT_CLIENT_ID: ${{ secrets.REDDIT_CLIENT_ID }}
  REDDIT_CLIENT_SECRET: ${{ secrets.REDDIT_CLIENT_SECRET }}
  REDDIT_PASSWORD: ${{ secrets.REDDIT_PASSWORD }}
  REDDIT_USERNAME: ${{ secrets.REDDIT_USERNAME }}
  DISCORD_WEBHOOK: ${{ secrets.DISCORD_REDDIT_WEBHOOK }}

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-go@v7
        with:
          go-version: stable
      - name: Run job
        run: go run cmd/scan_sr/manga.go
      - name: Commit and push csv
        run: |
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add internal/*.csv
          git commit -m "Updating csv" || exit 0  # nothing new to commit
          git push
```

The original workflow pinned Go 1.15 and used `actions/checkout@v2`, `actions/setup-go@v2` and a third-party push action. The v2 actions were built for Node 12, which GitHub has retired from its runners. `actions/checkout` leaves the `GITHUB_TOKEN` configured, so a plain `git push` is enough once the workflow has `contents: write`.

## Gotchas

- GitHub can delay scheduled runs at busy times, and disables scheduled workflows in public repos after 60 days without repository activity.
- Pushes made with the `GITHUB_TOKEN` don't trigger new workflow runs, so the CSV commit doesn't set off the `push` trigger in a loop.
- Committing state to the repo on every run is crude but free. A larger version would use a small database or a cache instead.

## References

- https://github.com/dli-invest/finreddit
- https://pkg.go.dev/github.com/dli-invest/finreddit
- [Reddit Data API wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki)
- [Discord webhook docs](https://discord.com/developers/docs/resources/webhook)
