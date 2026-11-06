---
title: How to parse git commits using dotnet
description: Parsing git commits with dotnet
alt: my first blog post
tags: ["dotnet","git"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 17 September 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-09-05 15.52.26 - corgi on a field staring up into a building falling from the sky, high quality photo.png'
---

# Parsing git commits with dotnet

In this article I will cover how to parse git commits with dotnet. This code is accessible in this github repo for those interested.

The main reason you would want to grab all the articles from git logs is for release notes. In my case, I want to track what I did yesterday.

This means that I need to be able to extract JIRA tickets from the commit messages. I also want to be able to extract the commit message and the commit hash.

Using regex to parse the commit messages is a good way to do this. I will be using the following regex to parse the commit messages.

```csharp
foreach (Match match in Regex.Matches(c.Message, @"([\S]+)-\d+",
                                    RegexOptions.None,
                                    TimeSpan.FromSeconds(2)))
{
    entries.Add(match.Value);
}
```

will grab all word before the ticket number. For example, if you have the following commit message:

```bash
git commit -m "ABC-1234: This is a commit message"
```

it will extract ABC-1234 from the commit message.

For general parsing logic, I adapted the code from this article.


Using dotnet 6.0, I can just put all the logic in a single file. 


Combining all this logic together, we can parse command line arguments with since to grab all commits, and then parse the commit messages to grab the JIRA tickets.

Using `git log`, a standard git commit looks like, headers will be defined with colons, commits sha sha1 hashes, and the commit message.

```
commit 226198d2f8e61206ad9eb47b32124f77801ca026
Author: David Li <davidli012345@gmail.com>
Date:   Tue Aug 23 22:26:45 2022 -0700

    feat: adding media_nlp post closes #16
```


Since we are using dotnet 6.0, we can use the new top level statements to make the code more concise. In order to grab command line arguments we need to use the CommandLine library.

```csharp
var cmdArgs = Environment.GetCommandLineArgs();
Parser.Default.ParseArguments<CommandLineOptions>(cmdArgs)
    .WithParsed<CommandLineOptions>(o =>{});

public class CommandLineOptions
{
    [Option('s', "since", Required = false, Default = "yesterday", HelpText = "Since Time")]
    public string Since { get; set; }
    [Option('a', "author", Required = false, Default = "David Li", HelpText = "Author to search git logs for")]
    public string Author { get; set; }
    [Option('d', "dir", Required = false, HelpText = "local path to repository to parse")]
    public string Repo { get; set; }
}
```

`o` will have the arguments of type CommandLineOptions. We can then use the since argument to grab all the commits. We will be passing since and author to parse for my commits from yesterday.

After grabbing the command line arguments, we can use the following code run git from C#, in python its called `subprocess`. We then need to parse the response from git to grab the commit hash and the commit message.

```csharp
    public static string RunProcess(string command)
    {
        // Start the child process.
        Process p = new Process();
        // Redirect the output stream of the child process.
        p.StartInfo.UseShellExecute = false;
        p.StartInfo.RedirectStandardOutput = true;
        p.StartInfo.FileName = "git";
        p.StartInfo.Arguments = command;
        p.Start();
        // Read the output stream first and then wait.
        string output = p.StandardOutput.ReadToEnd();
        p.WaitForExit();
        return output;

    }


    public static string AllLogs(string since, string author)
    {
        var args_string = string.Format("log --all --since=\"{0}\" --before=0am --author=\"{1}\"", since, author);
        var output = RunProcess(args_string);
        return output;
    }
```

Then in order to parse all the results, we can use the following code. To check if a line is a header we look for a line length greater than 0, a character for the for letter and if we have a colon character.

```csharp
    static bool StartsWithHeader(string line)
    {
        if (line.Length > 0 && char.IsLetter(line[0]))
        {
            var seq = line.SkipWhile(ch => Char.IsLetter(ch) && ch != ':');
            return seq.FirstOrDefault() == ':';
        }
        return false;
    }
```

In order to parse results, we iterate across all lines of code looking for "commit messages",


```csharp
 public static List<GitCommit> ParseResults(string output)
    {
        GitCommit commit = null;
        var commits = new List<GitCommit>();
        bool processingMessage = false;
        using (var strReader = new StringReader(output))
        {
            do
            {
                var line = strReader.ReadLine();
                if (line == null) {
                    continue;
                } 
                if (line.StartsWith("commit "))
                {
                    if (commit != null)
                        commits.Add(commit);
                    commit = new GitCommit();
                    commit.Sha = line.Split(' ')[1];
                }

                if (StartsWithHeader(line))
                {
                    var header = line.Split(':')[0];
                    var val = string.Join(":", line.Split(':').Skip(1)).Trim();

                    // headers
                    commit.Headers.Add(header, val);
                }

                if (string.IsNullOrEmpty(line) && commit.Message != null)
                {
                    // commit message divider
                    processingMessage = !processingMessage;
                }

                if (line.Length > 0 && processingMessage)
                {
                    // commit message.
                    commit.Message += line;
                }
            }
            while (strReader.Peek() != -1);
        }
        if (commit != null)
            commits.Add(commit);

        return commits;
    }
```

Combining all this logic, together we can parse all the commits from yesterday, and then parse the commit messages to grab the JIRA tickets.

```csharp
var cmdArgs = Environment.GetCommandLineArgs();
Parser.Default.ParseArguments<CommandLineOptions>(cmdArgs)
    .WithParsed<CommandLineOptions>(o =>
    {
        string output = Utils.AllLogs(o.Since, o.Author);
        Console.WriteLine(output);

        var commits = Utils.ParseResults(output);
        Console.WriteLine(commits);
        // pull entries with #{number} and JIRA-1 project regex
        var entries = new List<String>();
        // iterate across all commmits and print out the commit message
        Console.WriteLine("Messages: ");
        foreach (var c in commits)
        {
            Console.WriteLine(c.Message);
            foreach (Match match in Regex.Matches(c.Message, @"([\S]+)-\d+",
                                               RegexOptions.None,
                                               TimeSpan.FromSeconds(2)))
            {
                // Console.WriteLine("Found '{0}' at position {1}", match.Value, match.Index);
                entries.Add(match.Value);
            }
        }
        Console.WriteLine("----------------");

        Console.WriteLine("Issues found: ");
        // print all entries
        foreach (var e in entries)
        {
            Console.WriteLine(e);
        }
    });
```

### References

* https://github.com/FriendlyUser/git_log_parser
* https://gist.github.com/Erikdegroot89/a242f0a836de3ed669dac315e1a28c04