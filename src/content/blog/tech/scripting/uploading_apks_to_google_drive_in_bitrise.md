---
title: How to upload apks to google drive in bitrise
description: Uploading apks to google drive in golang from bitrise
alt: git commits with golang
tags: ["go","git"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 7 April 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/upload_icon_cloud.png'
---

Bitrise is a continuous integration and delivery platform that allows you to automate your build, test, and deployment processes. You can define these processes using a combination of pre-built steps and custom scripts written in Bash or Go.


Using the google drive api we can upload apks to a specified google drive folder using a service account and sharing the folder to that service account.

```
https://drive.google.com/drive/u/4/folders/{folderId}
```

Note once the folder is shared to that service account we can upload files to google drive using the folder id. Depending on demand its possible to extend this to upload to a specific folder under the parent folder.


```go
package main

import (
	"fmt"
	"os"

	"github.com/FriendlyUser/bitrise-step-google-drive-uploader/pkg/utils"
)

func main() {
	fmt.Println("This is the value specified for the input 'service_key_path':", os.Getenv("service_key_path"))
	// and print folder_id
	fmt.Println("This is the value specified for the input 'folder_id':", os.Getenv("folder_id"))

	serviceAccount := os.Getenv("service_key_path")
	folderId := os.Getenv("folder_id")

	// find all files with the extension ending with *.apk
	files, err := utils.FindFiles("**/*.apk")
	// check if BITRISE_APK_PATH is set
	if os.Getenv("BITRISE_APK_PATH") != "" {
		// if it is set, add it to the files slice
		files = append(files, os.Getenv("BITRISE_APK_PATH"))
	}

	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	// upload all apk files
	for _, file := range files {
		utils.UploadFile(serviceAccount, file, folderId)
	}

	os.Exit(0)
}
```

This is a modified version of the Go program that is designed to be used as a build step in the Bitrise CI/CD platform. The program reads in two input environment variables: service_key_path and folder_id. It then uses the utils package to search for all files with the .apk extension in the current directory and its subdirectories, and adds the BITRISE_APK_PATH environment variable (if it is set) to the list of files. Finally, the program iterates over the list of files and uses the utils.UploadFile function to upload each file to Google Drive using the serviceAccount and folderId variables.

The program then exits with a status code of 0, indicating success. It is good practice to always specify an exit code at the end of a build step, as it helps the CI/CD platform determine whether the step was successful or not.


```go
package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"

	drive "google.golang.org/api/drive/v3"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2/jwt"
)

// ServiceAccount : Use Service account
func serviceAccount(credentialFile string) *http.Client {
	b, err := ioutil.ReadFile(credentialFile)
	if err != nil {
		log.Fatal(err)
	}
	var c = struct {
		Email      string `json:"client_email"`
		PrivateKey string `json:"private_key"`
	}{}
	json.Unmarshal(b, &c)
	config := &jwt.Config{
		Email:      c.Email,
		PrivateKey: []byte(c.PrivateKey),
		Scopes: []string{
			drive.DriveScope,
		},
		TokenURL: google.JWTTokenURL,
	}
	client := config.Client(oauth2.NoContext)
	return client
}

func UploadFile(serviceFile string, fileName string, folderId string) {
	filename := fileName                       // Filename
	baseMimeType := "application/octet-stream" // MimeType
	client := serviceAccount(serviceFile)      // Please set the json file of Service account.

	srv, err := drive.New(client)
	if err != nil {
		log.Fatalln(err)
	}
	file, err := os.Open(filename)
	if err != nil {
		log.Fatalln(err)
	}
	fileInf, err := file.Stat()
	if err != nil {
		log.Fatalln(err)
	}
	defer file.Close()
	// get base name from filename
	baseName := filepath.Base(filename)
	f := &drive.File{Name: baseName}
	if folderId != "" {
		f.Parents = []string{folderId}
	}
	res, err := srv.Files.
		Create(f).
		ResumableMedia(context.Background(), file, fileInf.Size(), baseMimeType).
		ProgressUpdater(func(now, size int64) { fmt.Printf("%d, %d\r", now, size) }).
		Do()
	if err != nil {
		log.Fatalln(err)
	}
	fmt.Printf("Uploaded file %s with id %s\n", filename, res.Id)
}

// find files with the extension ending with *.apk
func FindFiles(extension string) ([]string, error) {
	files, err := filepath.Glob(extension)
	if err != nil {
		return nil, err
	}
	return files, nil
}
```

This is a Go package called utils that contains several functions for interacting with Google Drive. The package defines the following functions:

* serviceAccount: This function takes a file path as input and returns an HTTP client that can be used to authenticate requests to the Google Drive API using a service account. The function reads the contents of the file, which should be a JSON file containing the service account's email address and private key, and creates a jwt.Config object with this information. The function then uses the config to create an HTTP client and returns it.
* UploadFile: This function takes three strings as input: a file path to a service account JSON file, a file path to the file to be uploaded, and the ID of a Google Drive folder. The function uses the serviceAccount function to create an HTTP client, then opens the file to be uploaded and creates a new file object in Google Drive with the contents of the uploaded file. The function also sets the parent folder of the new file to the folder specified by the folderId input.
* FindFiles: This function takes a string as input and returns a slice of strings containing the file paths of all files in the current directory and its subdirectories that have the specified extension. The input string should contain a glob pattern, such as "**/*.apk". The function uses the filepath.Glob function to search for files that match the pattern and returns the list of file paths.

An example `bitrise.yml` file that uses apk uploading to google drive is

```
---
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: flutter
workflows:
  deploy:
    description: |
      Builds and deploys app using [Deploy to bitrise.io Step](https://devcenter.bitrise.io/en/getting-started/getting-started-with-flutter-apps.html#deploying-a-flutter-app).

      If you build for iOS, make sure to set up code signing secrets on Bitrise for a successful build.

      Next steps:
      - Check out [Getting started with Flutter apps](https://devcenter.bitrise.io/en/getting-started/getting-started-with-flutter-apps.html) for signing and deployment options.
      - Check out the [Code signing guide](https://devcenter.bitrise.io/en/code-signing.html) for iOS and Android
    steps:
    - git-clone@6: {}
    - certificate-and-profile-installer@1: {}
    - flutter-installer@0:
        inputs:
        - is_update: 'false'
    - cache-pull@2: {}
    - script@1:
        inputs:
        - content: |-
            #!/usr/bin/env bash
            # fail if any commands fails
            set -e
            # make pipelines' return status equal the last command to exit with a non-zero status, or zero if all commands exit successfully
            set -o pipefail
            # debug log
            set -x
            flutter upgrade
    - flutter-build@0:
        inputs:
        - project_location: "$BITRISE_FLUTTER_PROJECT_LOCATION"
        - platform: android
        - ios_output_type: archive
    - cache-push@2: {}
    - file-downloader@1:
        inputs:
        - destination: key.json
        - source: "$BITRISEIO_BITRISE_GOOGLE_SERVICE_JSON_URL"
    - git::https://github.com/FriendlyUser/bitrise-step-google-drive-uploader@main:
        title: Upload to google play
        inputs:
        - service_key_path: key.json
        - folder_id: 1MvS-z5JuIaMbAwsqMITeqnDNdtncEL7d
    - deploy-to-bitrise-io@2: {}
  primary:
    description: |
      Builds project and runs tests.

      Next steps:
      - Check out [Getting started with Flutter apps](https://devcenter.bitrise.io/en/getting-started/getting-started-with-flutter-apps.html).
    steps:
    - git-clone@6: {}
    - flutter-installer@0:
        inputs:
        - version: beta
    - cache-pull@2: {}
    - cache-push@2: {}
    - script@1:
        inputs:
        - content: |-
            #!/usr/bin/env bash
            # fail if any commands fails
            set -e
            # make pipelines' return status equal the last command to exit with a non-zero status, or zero if all commands exit successfully
            set -o pipefail
            # debug log
            set -x

            # write your script here
            echo "Hello World!"

            # or run a script from your repository, like:
            # bash ./path/to/script.sh
            # not just bash, e.g.:
            # ruby ./path/to/script.rb


            flutter upgrade
    - flutter-build@0: {}
    - deploy-to-bitrise-io@2: {}
meta:
  bitrise.io:
    stack: osx-xcode-14.1.x-ventura
app:
  envs:
  - opts:
      is_expand: false
    BITRISE_FLUTTER_PROJECT_LOCATION: "."
```

This is a Bitrise configuration file written in YAML syntax. It defines two workflows: deploy and primary.

The deploy workflow includes several steps:

1. git-clone@6: Clones the repository specified in the source input.
certificate-and-profile-installer@1: Installs the necessary code signing certificates and profiles for the specified iOS development team.
2. flutter-installer@0: Installs Flutter, the mobile app development framework.
3. cache-pull@2: Pulls the specified cache from the Bitrise cache storage.
4. script@1: Executes a custom script, in this case a Bash script that updates Flutter.
5. flutter-build@0: Builds a Flutter app for the specified platform (Android in this case) and outputs an archive file.
6. cache-push@2: Pushes the specified cache to the Bitrise cache storage.
7. file-downloader@1: Downloads a file from the specified URL and saves it to the specified destination.
git::https://github.com/FriendlyUser/bitrise-step-google-drive-uploader@main: Executes a step from a custom step library hosted on GitHub.
8. deploy-to-bitrise-io@2: Deploys the built app to the Bitrise hosting platform.

## References

* https://github.com/FriendlyUser/supabase_flutter_todo
* https://friendlyuser.github.io/posts/tech/flutter_todo_list_with_supabase/
* https://github.com/FriendlyUser/bitrise-step-google-drive-uploader