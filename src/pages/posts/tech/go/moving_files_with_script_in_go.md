---
tags: ['go', 'script', 'matlab']
title: Moving files with a script in go
description: Using script in go to move files to deploy to github pages
pubDate: Fri, 7 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3194903180.png"
---

In bash, you can move files using the `mv` command. Here's an example of how you could use `mv` in a script:


```go
bash`#!/bin/bash

# Define the source and destination directories
src_dir="/path/to/source/directory"
dst_dir="/path/to/destination/directory"

# Use the `mv` command to move all files from the source directory to the destination directory
for file in "$src\_dir"/*; do
 mv "$file" "$dst\_dir"
done
```
This script moves all files in the `src_dir` to the `dst_dir`. The `for` loop iterates through all files in `src_dir` and uses the `mv` command to move each file to the `dst_dir`.

Note: This script will overwrite any existing files in the `dst_dir` with the same names as the files being moved. If you want to avoid overwriting existing files, you can modify the script to include a check for file existence in the destination directory before moving the file.


Here's an example of how you could write a Go program to move files:


```go
package main

import (
 "fmt"
 "os"
 "path/filepath"
)

func main() {
 srcDir := "/path/to/source/directory"
 dstDir := "/path/to/destination/directory"

 err := filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
 if info.IsDir() {
 return nil
 }

 relPath, _ := filepath.Rel(srcDir, path)
 dstPath := filepath.Join(dstDir, relPath)

 fmt.Printf("Moving file from %s to %s\n", path, dstPath)

 return os.Rename(path, dstPath)
 })

 if err != nil {
 fmt.Printf("An error occurred while moving files: %s\n", err)
 return
 }

 fmt.Println("Files successfully moved.")
}
```
This program uses the `filepath.Walk` function to iterate through all the files in the `srcDir` directory. For each file, it uses `filepath.Rel` to get the relative path of the file with respect to `srcDir`, and then uses `filepath.Join` to construct the destination path by joining the relative path with the `dstDir` directory. Finally, it uses the `os.Rename` function to move the file to the destination directory.

Note: This program will overwrite any existing files in the `dstDir` with the same names as the files being moved. If you want to avoid overwriting existing files, you can modify the program to include a check for file existence in the destination directory before moving the file.


```go 
 package main

import (
	"fmt"
	"html/template"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/bitfield/script"
)

// basic go cli tool
func main() {
	// go through each directory in go using os package
	htmlFiles := []string{}
	outputFolder := "gh-pages"
	reg := []string{"rm", "-rf", outputFolder}
	cmd := strings.Join(reg[:], " ")

	tmpl := `
	<html>
		<head>
			<title>List of Matlab Reports and Files</title>
		</head>
		<body>
			<h1>List of Files</h1>
			<ul>
			{{ range . }}
				<li><a href={{.}}>{{ . }}</a></li>
			{{ end }}
			</ul>
		</body>
	</html>
	` 
 ```

It looks like you're starting to write a Go program to generate an HTML file that lists all of the files in a directory, and move the generated HTML file to an `outputFolder`. Here's an example of how you could complete this program:


```
go`package main

import (
 "fmt"
 "html/template"
 "io/ioutil"
 "os"
 "path/filepath"
 "strings"
)

func main() {
 htmlFiles := []string{}
 outputFolder := "gh-pages"
 srcDir := "."

 err := filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
 if !info.IsDir() {
 htmlFiles = append(htmlFiles, path)
 }
 return nil
 })

 if err != nil {
 fmt.Printf("An error occurred while reading files: %s\n", err)
 return
 }

 tmpl := template.Must(template.New("index").Parse(`
 <html>
 <head>
 <title>List of Files</title>
 </head>
 <body>
 <h1>List of Files</h1>
 <ul>
 {{ range . }}
 <li><a href={{.}}>{{ . }}</a></li>
 {{ end }}
 </ul>
 </body>
 </html>
 `))

 f, err := os.Create("index.html")
 if err != nil {
 fmt.Printf("An error occurred while creating index.html: %s\n", err)
 return
 }
 defer f.Close()

 if err := tmpl.Execute(f, htmlFiles); err != nil {
 fmt.Printf("An error occurred while executing the template: %s\n", err)
 return
 }

 err = os.MkdirAll(outputFolder, os.ModePerm)
 if err != nil {
 fmt.Printf("An error occurred while creating the output folder: %s\n", err)
 return
 }

 src, err := os.Open("index.html")
 if err != nil {
 fmt.Printf("An error occurred while opening index.html: %s\n", err)
 return
 }
 defer src.Close()

 dst, err := os.Create(filepath.Join(outputFolder, "index.html"))
 if err != nil {
 fmt.Printf("An error occurred while creating the output file: %s\n", err)
 return
 }
 defer dst.Close()

 _, err = io.Copy(dst, src)
 if err != nil {
 fmt.Printf("An error occurred while copying index.html: %s\n", err)
 return
 }

 fmt.Println("Files successfully moved.")
}`
```
This program


```go 
 	script.FindFiles(".").FilterScan(func(line string, w io.Writer) {
		// if line contains html print it
		if strings.Contains(line, ".html") || strings.Contains(line, ".pdf") {
			fmt.Fprintf(w, "scanned line: %q\n", line)
			htmlFiles = append(htmlFiles, line)
		}
	}).Stdout()

	fmt.Println(htmlFiles)
	// create html directory
	script.Exec("mkdir " + outputFolder).Stdout()

	// for each html file
	for _, file := range htmlFiles {
		reg = []string{"cp", file, outputFolder}
		cmd = strings.Join(reg[:], " ")
		// copy file to html directory
		script.Exec(cmd).Stdout()
	}

	// move ads.txt to html directory
	script.Exec("mv ads.txt " + outputFolder).Stdout()
 
 ```

The code you posted implements a basic Go CLI tool that moves HTML and PDF files to a new directory named "gh-pages". Here's a brief explanation of the code:

* First, the code uses the FindFiles function from the `github.com/bitfield/script` package to scan the current directory for files that contain ".html" or ".pdf" in their name. The matching files are then stored in the `htmlFiles` slice.
* Next, the code uses the `script.Exec` function to create the "gh-pages" directory using the `mkdir` command.
* The code then iterates over the `htmlFiles` slice and uses `script.Exec` to copy each file to the "gh-pages" directory using the `cp` command.
* Finally, the code uses `script.Exec` to move the "ads.txt" file to the "gh-pages" directory using the `mv` command.

Note that this code only implements the file moving part of the deployment to Github Pages, you might need to write additional code to deploy the files to Github Pages.


```go 
 	if err != nil {
		fmt.Println(err)
		return
	}

	file, err := os.Create(outputFolder + "/index.html")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer file.Close()
	// remove outputFolder from htmlFiles
	for i, file := range htmlFiles {
		// get basename of file
		baseName := filepath.Base(file)
		htmlFiles[i] = baseName
	}
	err = t.Execute(file, htmlFiles)
	if err != nil {
		fmt.Println(err)
		return
	} 
 ```

The code you posted creates an HTML file named "index.html" in the "gh-pages" directory and writes the list of files in the `htmlFiles` slice to the HTML file. Here's a brief explanation of the code:

* First, the code creates a file in the "gh-pages" directory using the `os.Create` function.
* The code then iterates over the `htmlFiles` slice and retrieves the base name of each file using the `filepath.Base` function. The base name is stored back in the `htmlFiles` slice.
* Finally, the code uses the `t.Execute` function to write the `htmlFiles` slice to the "index.html" file. The `t.Execute` function uses the template defined in the `tmpl` variable to format the HTML output.

Note that the code also contains error handling to check for any errors that might occur during the file creation and writing process. If an error occurs, the code prints the error message and returns from the main function.


```go 
 # run go main.go and install and then deploy to gh-pages
name: deploy

on:
  push:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Go
        uses: actions/setup-go@v2
        with:
          go-version: 1.19

      - name: Build
        run: |
          go build -o main .
          ./main
          echo google.com, pub-2479144310234386, DIRECT, f08c47fec0942fa0 > ads.txt
          mv ads.txt ./gh-pages

      - name: Deploy to gh-pages
        uses:
          peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./gh-pages
 
 ```

The code you posted is a GitHub Actions workflow that builds and deploys a Go program to GitHub Pages. Here's a brief explanation of the code:

* The workflow is triggered when a push is made to the "master" branch.
* The first step checks out the code from the repository.
* The second step sets up Go using the actions/setup-go@v2 action.
* The third step builds the Go program using the "go build" command, runs the program using "./main", and then adds an "ads.txt" file to the "gh-pages" directory.
* The fourth step deploys the contents of the "gh-pages" directory to GitHub Pages using the peaceiris/actions-gh-pages@v3 action. The action requires the GitHub token to be passed as an input parameter.

Note that the workflow uses the latest version of Ubuntu for the build environment and that the "gh-pages" directory contains the generated HTML file and other files that will be deployed to GitHub Pages.


That's great! Hosting your old university assignments on GitHub Pages can be a valuable way to showcase your previous work and demonstrate your skills to potential employers or collaborators. GitHub Pages also provides a platform for you to easily share your work with others and collaborate on projects in the future.



## References
- https://raw.githubusercontent.com/FriendlyUser/Matlab/master/.github/workflows/deploy.yml
- https://raw.githubusercontent.com/FriendlyUser/Matlab/master/main.go
