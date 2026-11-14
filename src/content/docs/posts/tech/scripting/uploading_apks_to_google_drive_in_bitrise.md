---
title: Uploading APKs to Google Drive from a Bitrise build with a Go step
description: A custom Bitrise step written in Go that finds the APKs a build produced and uploads them to a Google Drive folder with a service account.
alt: git commits with golang
tags: ["go","git","flutter"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 7 April 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/dall-e/upload_icon_cloud.png'
---

Bitrise is a hosted CI/CD service where a build is a list of steps: prebuilt ones from the step library plus your own steps written in Bash or Go. I wanted every Android build of a Flutter app to drop its APKs into a Google Drive folder, so I wrote a small Go step that does that with the Google Drive API and a service account.

## How access works

Create a service account in Google Cloud, enable the Drive API, download its JSON key, and share the target folder with the service account's email address (it ends in `iam.gserviceaccount.com`). The folder ID is the last part of the folder URL:

```text
https://drive.google.com/drive/u/4/folders/{folderId}
```

:::caution
A file uploaded by a service account is owned by the service account, so it counts against the service account's quota even when it sits in your shared My Drive folder, and recently created service accounts have no Drive quota at all. If uploads fail with `storageQuotaExceeded` ("Service Accounts do not have storage quota"), put the target folder in a **shared drive**, add the service account as a Content manager, and send `SupportsAllDrives(true)` on the request (as in the code below). Domain-wide delegation or a user OAuth token are the other options.
:::

## The step's entry point

The step reads two inputs, `service_key_path` and `folder_id`, which Bitrise exposes as environment variables. It collects every `.apk` under the working directory, adds `BITRISE_APK_PATH` (set by the Flutter and Gradle build steps) if present, and uploads each file once.

```go
package main

import (
	"fmt"
	"os"

	"github.com/FriendlyUser/bitrise-step-google-drive-uploader/pkg/utils"
)

func main() {
	serviceAccount := os.Getenv("service_key_path")
	folderID := os.Getenv("folder_id")
	fmt.Println("service_key_path:", serviceAccount)
	fmt.Println("folder_id:", folderID)

	files, err := utils.FindFiles(".", ".apk")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	if apk := os.Getenv("BITRISE_APK_PATH"); apk != "" {
		files = append(files, apk)
	}

	seen := map[string]bool{}
	for _, file := range files {
		if seen[file] {
			continue
		}
		seen[file] = true
		if err := utils.UploadFile(serviceAccount, file, folderID); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
	}
}
```

A non-zero exit code is what tells Bitrise the step failed; returning from `main` normally already exits with 0.

## The upload package

```go
package utils

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

// UploadFile uploads one file to the Drive folder folderID using the
// service account key at credentialFile.
func UploadFile(credentialFile, fileName, folderID string) error {
	ctx := context.Background()
	srv, err := drive.NewService(ctx,
		option.WithAuthCredentialsFile(option.ServiceAccount, credentialFile),
		option.WithScopes(drive.DriveScope),
	)
	if err != nil {
		return fmt.Errorf("create drive service: %w", err)
	}

	file, err := os.Open(fileName)
	if err != nil {
		return err
	}
	defer file.Close()

	f := &drive.File{Name: filepath.Base(fileName)}
	if folderID != "" {
		f.Parents = []string{folderID}
	}

	res, err := srv.Files.Create(f).
		Media(file).
		SupportsAllDrives(true).
		ProgressUpdater(func(now, size int64) { fmt.Printf("%d bytes uploaded\r", now) }).
		Context(ctx).
		Do()
	if err != nil {
		return fmt.Errorf("upload %s: %w", fileName, err)
	}
	fmt.Printf("Uploaded %s with id %s\n", fileName, res.Id)
	return nil
}

// FindFiles walks root and returns every file whose name ends in ext.
func FindFiles(root, ext string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && strings.HasSuffix(d.Name(), ext) {
			files = append(files, path)
		}
		return nil
	})
	return files, err
}
```

A few things changed from the first version of this step:

- **Recursive search.** The original used `filepath.Glob("**/*.apk")`. Go's `filepath.Glob` has no `**` wildcard; it treats `**` like `*`, so that pattern only matches APKs exactly one directory deep. `filepath.WalkDir` actually walks the tree.
- **Authentication.** The original parsed the key JSON by hand into a `jwt.Config` and called the deprecated `drive.New(client)`. `drive.NewService` with `option.WithAuthCredentialsFile(option.ServiceAccount, path)` does the same in one call. (`option.WithCredentialsFile` also works but is deprecated because it accepts any credential type without validation.)
- **Uploads.** `Media` replaces the deprecated `ResumableMedia`; the client switches to a resumable, chunked upload on its own for large files.
- **Errors.** `UploadFile` returns errors instead of calling `log.Fatal`, and `ioutil.ReadFile` is gone (it's deprecated in favour of `os.ReadFile`, and no longer needed here).

## Using the step in bitrise.yml

Steps can be referenced straight from a Git repository with `git::<url>@<branch>`. This is the `deploy` workflow from my Flutter app, trimmed to the parts that matter for Android. The `file-downloader` step pulls the service account key from Bitrise's generic file storage so the key never lives in the repository.

```yaml
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: flutter
workflows:
  deploy:
    steps:
    - git-clone@6: {}
    - flutter-installer@0:
        inputs:
        - is_update: 'false'
    - flutter-build@0:
        inputs:
        - project_location: "$BITRISE_FLUTTER_PROJECT_LOCATION"
        - platform: android
    - file-downloader@1:
        inputs:
        - destination: key.json
        - source: "$BITRISEIO_BITRISE_GOOGLE_SERVICE_JSON_URL"
    - git::https://github.com/FriendlyUser/bitrise-step-google-drive-uploader@main:
        title: Upload APKs to Google Drive
        inputs:
        - service_key_path: key.json
        - folder_id: 1MvS-z5JuIaMbAwsqMITeqnDNdtncEL7d
    - deploy-to-bitrise-io@2: {}
app:
  envs:
  - opts:
      is_expand: false
    BITRISE_FLUTTER_PROJECT_LOCATION: "."
```

The order matters: the upload step has to run after `flutter-build` (so the APKs and `BITRISE_APK_PATH` exist) and after `file-downloader` (so `key.json` exists).

The original config also had `cache-pull@2` and `cache-push@2`. Bitrise has deprecated those branch-based cache steps in favour of key-based caching, so if you want caching, use the key-based restore/save cache steps from the [migration guide](https://docs.bitrise.io/en/bitrise-ci/dependencies-and-caching/migrating-from-branch-based-caching-to-key-based-caching.html).

## References

* https://github.com/FriendlyUser/supabase_flutter_todo
* https://friendlyuser.github.io/posts/tech/flutter_todo_list_with_supabase/
* https://github.com/FriendlyUser/bitrise-step-google-drive-uploader
* [Google Drive API: shared drives](https://developers.google.com/workspace/drive/api/guides/about-shareddrives)
