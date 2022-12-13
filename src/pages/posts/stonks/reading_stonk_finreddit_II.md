---
title: How to parse reddit posts with Go periodically part II
description: Analyzing rbc stock trades with python
alt: Applying nlp to various youtube videos
pubDate: Friday, 27 Feburary 2023 13:00:00 GMT
tags: ["finreddit", "go", "reddit"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/hear1.png'
imgAlt: 'rbc stock analyzer'
---


To login to reddit

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

This package appears to provide a RedditOAuth() function for authenticating with the Reddit API using OAuth2. The function uses the geddit package to create a new OAuth session and then logs in to Reddit using the credentials provided in environment variables (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, and REDDIT_PASSWORD).

If the authentication is successful, the function returns a pointer to the geddit.OAuthSession object that was created. If an error occurs, the function logs the error message to the console and returns nil for the session and the error value.

It's worth noting that the function uses the util.GetEnvVar() function to read the environment variables, but it is not clear where this function is defined. It is possible that it is defined in another package named util, but it is not shown in the code snippet provided. It would be useful to include the relevant code for this function to understand how it works.


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
This package provide some utility functions for working with CSV (comma-separated values) files in Go. It has functions for reading a CSV file from a file path, appending a row or multiple rows to a CSV file, and checking if a particular value exists in a CSV file.

The ReadCsvFile() function opens the specified file, reads its contents as a CSV, and returns the records as a slice of slices of strings. The AppendRowToCsv() and AppendToCsv() functions both append data to a CSV file. The former appends a single row, while the latter appends multiple rows. The FindInCsv() function searches for a given value in a particular column of a CSV file and returns a boolean value indicating whether the value was found or not.

It's worth noting that these functions do not handle errors very gracefully. They simply print an error message to the console and continue execution, which may not be desirable in all cases. It might be a good idea to modify these functions to return the error value so that the caller can handle it appropriately.


```go
package util

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/dli-invest/finreddit/pkg/types"
	"gopkg.in/yaml.v2"
)

// Gets enviroment variable if available
// throws error if not available
func GetEnvVar(varName string) string {
	al, present := os.LookupEnv(varName)
	if present {
		return al
	} else {
		var error_message = fmt.Sprintf("Environment Variable: %s missing", varName)
		log.Fatal(error_message)
		return ""
	}
}

func ValidateConfigPath(path string) error {
	s, err := os.Stat(path)
	if err != nil {
		return err
	}
	if s.IsDir() {
		return fmt.Errorf("'%s' is a directory, not a normal file", path)
	}
	return nil
}

// NewConfig returns a new decoded Config struct
func NewConfig(configPath string) (*types.SearchConfig, error) {
	// check if path is valid
	err := ValidateConfigPath(configPath)
	if err != nil {
		return nil, err
	}
	// Create config structure
	config := &types.SearchConfig{}

	// Open config file
	file, err := os.Open(configPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Init new YAML decode
	d := yaml.NewDecoder(file)

	// Start YAML decoding from file
	if err := d.Decode(&config); err != nil {
		return nil, err
	}
	return config, nil
}

func MkPathFromStr(pathStr string) string {
	p := filepath.FromSlash(pathStr)
	return p
}

// AssertEqual checks if values are equal
func AssertEqual(t *testing.T, a interface{}, b interface{}) {
	if a == b {
		return
	}
	// debug.PrintStack()
	t.Errorf("Received %v (type %v), expected %v (type %v)", a, reflect.TypeOf(a), b, reflect.TypeOf(b))
}
```


This package appears to provide some utility functions for use in Go programs. The functions include:

* GetEnvVar(): Looks up the value of an environment variable and returns it. If the environment variable is not set, the function logs an error message and exits the program.
* ValidateConfigPath(): Checks if the given path is valid and points to a file (not a directory). If the path is invalid, the function returns an error.
* NewConfig(): Takes a path to a YAML configuration file and decodes it into a types.SearchConfig struct. If an error occurs, the function returns nil for the config and the error value.
* MkPathFromStr(): Converts a string representation of a file path to the appropriate format for the current operating system.
* AssertEqual(): Takes two values and checks if they are equal. If the values are not equal, the function logs an error message and fails the current test.


In terms of a configuration file

```yaml
data:
  csvPath: internal/manga.csv
  subreddits:
      # HinowaGaCrush has ended
    - name: HinowaGaCRUSH
      limit: 100
      linkFlairText: Chapter Release
    - name: OnePiece
      limit: 100
      linkFlairText: Current Chapter
```

This appears to be a YAML configuration file that defines a csvPath and a list of subreddits to search for manga releases. For each subreddit, the configuration specifies a name, a limit on the number of search results, and a linkFlairText value to filter the results. In some cases, it also includes a list of phrases to search for in the subreddit.

The csvPath specifies the path to a CSV file where the search results will be stored. The name, limit, and linkFlairText values are used to search the specified subreddits on Reddit and find posts that match the given criteria. The phrases value (if provided) is used to further filter the search results and only include posts that contain at least one of the specified phrases.

Overall, this configuration file is used to configure a program that searches Reddit for manga releases and stores the results in a CSV file.


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

This is a GitHub Actions workflow configuration file that defines a schedule for running the workflow and the steps to execute when the workflow is triggered.

The workflow is triggered on a schedule (using a cron expression) and when a push event is detected on the main branch. It sets several environment variables (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_PASSWORD, REDDIT_USERNAME, and DISCORD_WEBHOOK) using values from the repository secrets.

The workflow defines a single job named run that uses a matrix strategy to run on multiple Go versions and platforms. The job consists of the following steps:

1. Install Go using the actions/setup-go@v2 action and the specified Go version.
2. Check out the code from the repository.
3. Run the cmd/scan_sr/manga.go Go program.
4. Commit the updated CSV files.
5. Push the changes to the repository using the ad-m/github-push-action@master action.

Overall, this workflow appears to be used to automatically run a Go program that searches Reddit for manga releases and updates a CSV file in the repository. The updated CSV file is then committed and pushed back to the repository.


## References

The documentation is available at https://pkg.go.dev/github.com/dli-invest/finreddit

and 

https://github.com/dli-invest/finreddit/blob/main/cmd/scan_sr/manga.yml