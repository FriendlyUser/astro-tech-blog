---
title: Trump Quotes app for flutter
description: Recently i was updating my flutter quotes trump app to use the latest version of flutter, here are some of the lessons i learned.
pubDate: Saturday, 12 November 2022 13:00:00 GMT
tags: ["flutter", "dart"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---

Recently i was updating my flutter quotes trump app to use the latest version of flutter, here are some of the lessons i learned.

Its simplest to copy the code from the previous version of the app and then update the code to use the latest version of flutter. This way you can see the changes that were made to the code.

Making a new flutter project and adjusting code is my preference.


The following code retrieves a quote from the api and displays it on the screen.
```dart
Future<Quote> fetchQuote() async {
  final response =
      await http.get('https://api.tronalddump.io/random/quote', headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8'
  });

  if (response.statusCode == 200) {
    // If the server did return a 200 OK response,
    // then parse the JSON.
    return Quote.fromJson(json.decode(response.body));
  } else {
    // If the server did not return a 200 OK response,
    // then throw an exception.
    throw Exception('Failed to load quote');
  }
}

class Quote {
  final String appearedAt;
  final String createdAt;
  final String quoteId;
  final String updatedAt;
  final List<dynamic> tags;
  final String value;

  Quote(
      {this.appearedAt,
      this.createdAt,
      this.quoteId,
      this.updatedAt,
      this.tags,
      this.value});

  factory Quote.fromJson(Map<String, dynamic> json) {
    return Quote(
        appearedAt: json['appeared_at'],
        createdAt: json['created_at'],
        quoteId: json['quoteId'],
        updatedAt: json['updated_at'],
        tags: json['tags'],
        value: json['value']);
  }
}
```



My yaml file is used to automatically download the latest version of flutter and dart. This is useful because it means that i don't have to manually update the version of flutter and dart that i am using.

As well as upload to google play developer console.

```yaml
name: Trump Quotes

# This workflow is triggered on pushes to the repository.


# Git workflow is based on develop/master
# All feature branches are merged into develop and then merging
# into master auto deploys
on: push
    
env:
    KEY_PROPERTIES: ${{ secrets.KEY_PROPERTIES }}
    TRUMP_QUOTES_JKS: ${{ secrets.TRUMP_QUOTES_JKS }}
    OCR_SERVER: ${{ secrets.OCR_SERVER }}
    EMAIL: davidli012345@gmail.com
    ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
    USERNAME: FriendlyUser
    
jobs:
  build:
    # This job will run on ubuntu virtual machine
    runs-on: ubuntu-latest
    steps:
    
    # Setup Java environment in order to build the Android app.
    - uses: actions/checkout@v1
    - uses: actions/setup-java@v1
      with:
        java-version: '12.x'
    
    # Setup the flutter environment.
    - uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.0.5'
        channel: 'stable' # 'dev', 'alpha', default to: 'stable'
        # flutter-version: '1.12.x' # you can also specify exact version of flutter

    # load the files from base64 encoded secrets
    - run: echo $TRUMP_QUOTES_JKS | base64 --decode > android/app/trump_quotes.jks
      name: Decoding Trump Quotes File
    - run: echo $KEY_PROPERTIES | base64 --decode > android/key.properties
      name: Decoding Key Properties
    - run: echo $OCR_SERVER | base64 --decode > android/ocr-server-238704-1b08ee48b859.json
    - run: echo ::set-env name=REPOSITORY_NAME::$(echo "$GITHUB_REPOSITORY" | awk -F / '{print $2}' | sed -e "s/:refs//")
      shell: bash
      env:
        ACTIONS_ALLOW_UNSECURE_COMMANDS: 'true'
    # Get flutter dependencies.
    - run: flutter pub get
    
    # Check for any formatting issues in the code.
    - run: flutter format .
    
    # Run widget tests for our flutter project.
    # - run: flutter test
    
    # Build apk.
    - run: flutter build apk
    # Build debug apk
    - run: flutter build apk --debug
    
    # Build appbundle
    - run: flutter build appbundle
    # Upload generated apk to the artifacts.
    - uses: actions/upload-artifact@v1
      with:
        name: release-apk
        path: build/app/outputs/apk/release/app-release.apk
    - uses: actions/upload-artifact@v1
      with:
        name: debug-apk
        path: build/app/outputs/apk/debug/app-debug.apk
    - uses: actions/upload-artifact@v1
      with:
        name: app-bundle
        path: build/app/outputs/bundle/release/app-release.aab
    # Web Build
#     - run: flutter channel beta
#     - run: flutter config --enable-web
#     # Deploy to github actions
#     - run: flutter build web --release
#     - run: | 
#         git config --global user.email $EMAIL
#         git config --global user.name $USERNAME
#         git status
#     - name: Deploy 🚀
#       uses: JamesIves/github-pages-deploy-action@releases/v3
#       with:
#         ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
#         BRANCH: gh-pages # The branch the action should deploy to.
#         FOLDER: build/web # The folder the action should deploy.
    # Fastlane
    # This doesn't work on channel beta
    # - uses: maierj/fastlane-action@v1.4.0
    #   with:
    #     lane: test
    #     subdirectory: 'android'
#     - run:  bundle install
    - uses: ruby/setup-ruby@v1
      with:
        ruby-version: '2.7.2'
    - uses: maierj/fastlane-action@v2.0.1
      if: endsWith(github.ref, '/develop')
      with:
        lane: beta
        subdirectory: 'android'

    - uses: maierj/fastlane-action@v2.0.1
      if: endsWith(github.ref, '/master')
      with:
        lane: deploy
        subdirectory: 'android' 
```


To view the result of my github actions, you can go to the actions tab in my github repository.

and you can view my code at https://friendlyuser.github.io/trump_quotes/#/