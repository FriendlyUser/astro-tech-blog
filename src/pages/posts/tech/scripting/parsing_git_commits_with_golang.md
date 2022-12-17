---
title: How to parse git commits using golang
description: Parsing git commits with golang
alt: git commits with golang
tags: ["go","git"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 23 March 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-17 09.09.41 - rainy day with puddle containing a open book in the middle facing the sky.png'
---


Leveraging chatgpt to translate code from one programming language to another is a fairly powerful tool. Right now I think it is 90% accurate, but still requires heavy modification is translating is not 1 to 1. Having auto generated tests for code is a good use case for ai. As well as documenting what code does.


```go
func ParseResults(output string) []*GitCommit {
	commits := []*GitCommit{}

	scanner := bufio.NewScanner(strings.NewReader(output))
	commit := &GitCommit{Headers: map[string]string{}}
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			// end of commit
			commits = append(commits, commit)
			commit = &GitCommit{Headers: map[string]string{}}
		} else if strings.HasPrefix(line, "commit ") {
			commit.Sha = strings.TrimPrefix(line, "commit ")
		} else if strings.Contains(line, ":") {
			parts := strings.Split(line, ":")
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			commit.Headers[key] = value
		} else {
			commit.Message += line + "\n"
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "reading standard input:", err)
	}

	return commits
}
```
This function appears to parse the output of the git log command and return a slice of GitCommit objects.

The function first initializes a slice of GitCommit objects and a GitCommit object called commit. It then uses a scanner to read the output line by line. For each line, it checks if the line is empty. If it is, that means the commit has ended, so the function adds the commit object to the slice and resets the commit object to a new GitCommit object with an empty map of headers.

If the line is not empty and starts with "commit ", the function sets the SHA of the commit object to the line with "commit " stripped off the front. If the line contains a colon, the function splits the line at the colon and adds the key-value pair to the commit object's headers map. Otherwise, the function adds the line to the commit object's message field, along with a newline character.

Finally, the function checks for any errors in the scanner and returns the slice of GitCommit objects.

```go
package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

// GitCommit represents a commit in a Git repository.
type GitCommit struct {
	Headers map[string]string
	Sha     string
	Message string
	Files   []GitFileStatus
}

// GitFileStatus represents the status of a file in a Git commit.
type GitFileStatus struct {
	Status string
	File   string
}

func main() {
	var repo string
	flag.StringVar(&repo, "repo", "r", "specify the repository")

	var since string
	flag.StringVar(&since, "since", "s", "specify the since time")

	var author string
	flag.StringVar(&author, "author", "a", "specify the since time")

	flag.Parse()

	if repo == "" {
		flag.Usage()
		fmt.Println("Verbose output enabled. Current Arguments: -v \n", since)
		fmt.Println("Quick Start Example! App is in Verbose mode!")
	} else {
		fmt.Printf("Current Arguments: -v %s\n", since)
		fmt.Println("Quick Start Example!")
		ChDir(repo)
	}

	output := AllLogs(since, author)
	fmt.Println(output)

	commits := ParseResults(output)
	fmt.Println(commits)

	entries := []string{}
	fmt.Println("Messages: ")
	for _, c := range commits {
		fmt.Println(c.Message)
		// check for regex #{number} and JIRA-1 test abc-2
		// ([\S]+) matches words and -\d+ matches -1
		re := regexp.MustCompile(`([\S]+)-\d+`)
		matches := re.FindAllString(c.Message, -1)
		for _, match := range matches {
			entries = append(entries, match)
		}

		// check for regex #{number}
		re = regexp.MustCompile(`#\d+`)
		matches = re.FindAllString(c.Message, -1)
		for _, match := range matches {
			entries = append(entries, match)
		}
	}

	fmt.Println("----------------")
	fmt.Println("Issues found: ")
	for _, e := range entries {
		fmt.Println(e)
	}
}

// AllLogs returns the output of the "git log" command.
func AllLogs(since, author string) string {
	// default to davidli012345@gmail.com

	cmd := exec.Command("git", "log", "--since", since, "--author", author, "--pretty=format:%H%n%an%n%ae%n%ad%n%s")
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println(err)
		return ""
	}
	return string(output)
}

// ChDir changes the current working directory.
func ChDir(dir string) {
	err := os.Chdir(dir)
	if err != nil {
		fmt.Println(err)
	}
}

// ParseResults parses the output of the "git log" command and returns a slice of GitCommit objects.
func ParseResults(output string) []*GitCommit {
	commits := []*GitCommit{}

	scanner := bufio.NewScanner(strings.NewReader(output))
	commit := &GitCommit{Headers: map[string]string{}}
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			// end of commit
			commits = append(commits, commit)
			commit = &GitCommit{Headers: map[string]string{}}
		} else if strings.HasPrefix(line, "commit ") {
			commit.Sha = strings.TrimPrefix(line, "commit ")
		} else if strings.Contains(line, ":") {
			parts := strings.Split(line, ":")
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			commit.Headers[key] = value
		} else {
			commit.Message += line + "\n"
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "reading standard input:", err)
	}

	return commits
}
```

This code appears to be a command-line tool that allows the user to view Git commits and search for certain types of entries (such as issue numbers) in the commit messages.

The tool accepts command-line arguments including the Git repository to use, the time since which to list commits, and the author of the commits. It then uses the git log command to retrieve the commit history and parses the output to create a slice of GitCommit objects. Each GitCommit object represents a commit and has fields for the commit message, SHA, and other metadata.

The tool also includes a function called ParseResults that parses the output of the git log command and returns a slice of GitCommit objects. It does this by using a scanner to read the output line by line and creating a new GitCommit object whenever it encounters a blank line. It also uses regular expressions to search for certain patterns in the commit messages, such as issue numbers or words followed by a hyphen and a number.

Finally, the tool prints the commit messages and the entries it found in the commit messages.

## References

* https://github.com/FriendlyUser/git_log_parser_go
* https://friendlyuser.github.io/posts/tech/parsing_git_commits_with_dotnet/