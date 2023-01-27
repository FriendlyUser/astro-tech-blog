---
title: Using git to filter for commits between tags
description: Grabbing all commits through advanced git usage
alt: Applying nlp to various youtube videos
pubDate: Friday, 30 March 2023 13:00:00 GMT
tags: ["git", "bash"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-17 09.01.21 - two tags and lines between them.png'
imgAlt: 'two tags and lines'
---

To print the commits between two tags using a Bash script, you can use the git log command with the --oneline and --decorate options, followed by the range of tags that you want to include. For example:

```sh
#!/bin/bash

# Set the tags
TAG1=<tag1>
TAG2=<tag2>

# Print the commits between the two tags
git log --oneline --decorate "$TAG1..$TAG2"
```

Replace `<tag1>` and `<tag2>` with the names of the two tags that you want to include. The --oneline option will display the commits in a condensed, single-line format, and the --decorate option will show the tags associated with each commit.

You can also use the --no-merges option to exclude merge commits, or use other options such as --author or --grep to filter the results based on the author or a specific pattern in the commit message. For more information, you can refer to the documentation for the git log command.


```sh
git log --oneline --decorate "v3.1.0..v3.0.22" --author "Some Author"
```


To use a regular expression to parse commits with a message that begins with "CAR-*" using a Bash script, you can use the git log command with the --grep option, followed by the regular expression that you want to use to match the commit messages.

For example, the following script will print the commits with a message that begins with "CAR-" followed by one or more characters:

```sh
#!/bin/bash

# Set the regular expression
REGEX="JIRA-.*"

# Print the commits that match the regular expression
git log --oneline --decorate --grep "$REGEX"
```

The --oneline option will display the commits in a condensed, single-line format, and the --decorate option will show the tags associated with each commit. The --grep option will only include commits whose message matches the specified regular expression.

You can also use the --no-merges option to exclude merge commits, or use other options such as --author or --since to filter the results based on the author or a specific date range. For more information, you can refer to the documentation for the git log command.


To find commits between two tags by a specific author using a Bash script, you can use the git log command with the --author option, followed by the name of the author, and the --no-merges option to exclude merge commits.

For example, the following script will print the commits between two tags, TAG1 and TAG2, that were authored by "John Doe" and exclude any merge commits:

```sh
#!/bin/bash

# Set the tags and author
TAG1=<tag1>
TAG2=<tag2>
AUTHOR="John Doe"

# Print the commits between the two tags by the specified author, excluding merge commits
git log --oneline --decorate --no-merges "$TAG1..$TAG2" --author "$AUTHOR"
```

Replace `<tag1>` and `<tag2>` with the names of the two tags that you want to include. The --oneline option will display the commits in a condensed, single-line format, and the --decorate option will show the tags associated with each commit.

You can also use other options such as --since or --until to filter the results based on a specific date range, or use the --grep option to filter the results based on a pattern in the commit message. For more information, you can refer to the documentation for the git log command.


To find all the commits between two tags excluding merge commits you can use with "JIRA-*"

```bash
git log --oneline --decorate "v3.1.0..v3.0.22" --no-merges --grep "JIRA-*"
```

Despite building projects like

* https://github.com/FriendlyUser/git_log_parser_go
and using chatgpt to mostly generate
* https://github.com/FriendlyUser/git_log_parser

I should have dedicated the time to master git.

## References

* https://friendlyuser.github.io/posts/tech/parsing_git_commits_with_dotnet/