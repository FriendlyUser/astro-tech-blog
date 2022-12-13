

Finreddit is a simple Reddit cli tool that is written in the Go programming language. It is used to scrape stock-related posts from Reddit based on specified criteria. The bot can be installed by running the cmd/main.go file, which will automatically install the necessary packages. Tests for the cli tool can be run by using the go test command with the appropriate arguments.


The main function

```go
// main function logic goes here
package pkg
// consider importing https://github.com/FriendlyUser/finfiber/blob/master/pkg/discord/discord.go
import (
	"log"
	"github.com/dli-invest/finreddit/pkg/login"
	"github.com/jzelinskie/geddit"
	"fmt"
)


func GetPosts() {
	o, err := login.RedditOAuth()
	if err != nil {
		log.Fatal("Failed to initialize Reddit Scrapper")
	}
	log.Println(o)
	if err != nil {
		log.Fatal("Failed to get subreddit submissions")
	}
	subOpts := geddit.ListingOptions{
		Time: "day",
		Limit: 1000,
	}
	// for every subreddit go through and get submissions
	submissions, _ := o.SubredditSubmissions("investing", geddit.NewSubmissions, subOpts)
	for i, s := range submissions {
		fmt.Println(i, s)
		fmt.Println(s.FullID)
	}
}
```

This code appears to be a function named GetPosts that uses the geddit package to scrape subreddit submissions from Reddit. The login package is used to authenticate with Reddit and the fmt package is used for printing. The function accepts no arguments and returns no values. It uses the geddit package to retrieve submissions from the "investing" subreddit and print their information to the console.

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
```

This code defines a package named reddit that contains functions related to scraping and processing data from Reddit. The GetSubmissions function accepts a Reddit session and subreddit configuration and returns a slice of Reddit submissions that match the specified criteria. The ScanSRs function reads subreddit configurations from a file and uses the GetSubmissions function to retrieve subreddit posts. It then processes the retrieved posts and either prints them to the console or sends them to a Discord channel, depending on the configuration.


```go
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

This code defines a function named MapSubmissionToEmbed that converts a Reddit submission to a Discord payload. The function accepts a pointer to a geddit.Submission and returns a types.DiscordPayload value. The function uses the fmt package to create a description string based on the submission's author, score, and number of comments. It then uses the time package to format the submission's timestamp and create the title for the Discord embed. The function constructs and returns a types.DiscordPayload value using the generated description, timestamp, and title.

## References

The documentation is available at https://pkg.go.dev/github.com/dli-invest/finreddit