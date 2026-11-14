---
title: "PowerShell script best practices: functions, error handling, modules and execution policy"
description: "Practical habits for PowerShell scripts: advanced functions with validated parameters and help, try/catch that actually catches, debugging, modules and execution policy."
pubDate: Saturday, 14 May 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["powershell"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2022-12-25-21-48-12-teddy-bear-on-coach-looking-out-the-window-at-a-tree.webp'
---

Most PowerShell scripts start as a few lines pasted into a console and grow from there. These are the habits that make them easier to read, debug and share once they do. Everything below works in both Windows PowerShell 5.1 and PowerShell 7.

## Write advanced functions

Wrap reusable logic in functions with `[CmdletBinding()]` and a typed `param()` block. That gets you parameter validation, tab completion, `-Verbose`/`-Debug` support and `Get-Help` output without extra code.

```powershell
Set-StrictMode -Version Latest

function Get-AppSetting {
    <#
    .SYNOPSIS
    Reads one setting from a JSON config file.

    .PARAMETER Path
    Path to the JSON config file.

    .PARAMETER Name
    Name of the top-level setting to return.

    .EXAMPLE
    Get-AppSetting -Path .\appsettings.json -Name LogLevel
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateScript({ Test-Path -Path $_ -PathType Leaf })]
        [string]$Path,

        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Name
    )

    Write-Verbose "Reading $Path"
    try {
        $config = Get-Content -Path $Path -Raw -ErrorAction Stop |
            ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw "Could not read config file '$Path': $($_.Exception.Message)"
    }

    if (-not $config.PSObject.Properties[$Name]) {
        Write-Warning "Setting '$Name' not found in $Path"
        return
    }

    $config.$Name
}
```

```text
PS> Get-AppSetting -Path .\appsettings.json -Name Port -Verbose
VERBOSE: Reading .\appsettings.json
8080
PS> Get-AppSetting -Path .\appsettings.json -Name Missing
WARNING: Setting 'Missing' not found in .\appsettings.json
```

What this shows:

- **Verb-Noun names using approved verbs.** Run `Get-Verb` for the list. Unapproved verbs trigger a warning when the function is imported as part of a module.
- **Validation attributes** (`Mandatory`, `ValidateScript`, `ValidateNotNullOrEmpty`, `ValidateSet`, `ValidateRange`) reject bad input before your code runs, with a consistent error message.
- **Comment-based help.** The `<# .SYNOPSIS ... #>` block is what `Get-Help Get-AppSetting -Examples` displays.
- **`Set-StrictMode -Version Latest`** turns typos such as reading an undefined variable or a non-existent property into errors instead of silent `$null`s.
- **Output objects, not text.** The function returns the value itself, so callers can pipe it, compare it, or format it however they like. Use `Write-Verbose`, `Write-Warning` and `Write-Error` for messages, not `Write-Host`.

Avoid hard-coded values (paths, server names, credentials) in the body; make them parameters with sensible defaults.

## Make `try`/`catch` actually catch

The most common PowerShell error-handling bug: `catch` only runs for *terminating* errors, and most cmdlet failures are *non-terminating*. They print red text and the script carries on.

```powershell
try { Get-Item C:\does-not-exist } catch { "never runs" }

try { Get-Item C:\does-not-exist -ErrorAction Stop } catch { "caught: $($_.Exception.Message)" }
```

Add `-ErrorAction Stop` to the calls you want to handle, as in the example above, or set `$ErrorActionPreference = 'Stop'` at the top of a script so every error is terminating. Inside `catch`, `$_` is the `ErrorRecord`; `$_.Exception.Message` is usually what you want to log.

Use `throw` (or `$PSCmdlet.ThrowTerminatingError()` in advanced functions) when the caller can't sensibly continue, and `Write-Error` when the failure only affects one item in a pipeline.

## Debugging

- **Use VS Code with the PowerShell extension.** It has breakpoints, stepping, a variables pane and an integrated console. The Windows PowerShell ISE is still available on Windows but is no longer in active feature development and doesn't support PowerShell 7, so Microsoft recommends VS Code instead.
- **`Write-Verbose` and `Write-Debug` are silent by default.** They only print when the caller passes `-Verbose` / `-Debug` (which `[CmdletBinding()]` enables) or sets `$VerbosePreference` / `$DebugPreference`. That makes them safe to leave in production code.
- **`Set-PSBreakpoint`** sets breakpoints from the console, on a line, a command, or whenever a variable is read or written.
- **`Get-Help <cmdlet> -Full`** and `Get-Command -Syntax <cmdlet>` show parameters and parameter sets. Run `Update-Help` once to download the full help content.

## Lint and test

- [PSScriptAnalyzer](https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/overview) (`Install-Module PSScriptAnalyzer`, then `Invoke-ScriptAnalyzer -Path .\script.ps1`) flags unapproved verbs, aliases in scripts, unused parameters, plain-text password parameters and more. The VS Code extension runs it as you type.
- [Pester](https://pester.dev/) is the standard test framework for PowerShell. Functions like `Get-AppSetting` that take input as parameters and return objects are easy to test with it.

## Organise functions into modules

Once you have a handful of related functions, move them into a module instead of dot-sourcing script files:

1. Put the functions in a `.psm1` file, e.g. `AppTools\AppTools.psm1`.
2. Generate a manifest with `New-ModuleManifest -Path .\AppTools\AppTools.psd1 -RootModule AppTools.psm1`, and list the public functions in `FunctionsToExport` so helpers stay private.
3. Put the folder on a path in `$env:PSModulePath` and `Import-Module AppTools`, or let module auto-loading pick it up.

To share a module publicly, publish it to the [PowerShell Gallery](https://www.powershellgallery.com/) with `Publish-PSResource` (PSResourceGet, included with PowerShell 7.4 and later) or the older `Publish-Module` from PowerShellGet.

Keep scripts and modules in Git like any other code.

## Execution policy

The execution policy controls whether PowerShell will run script files (`.ps1`, `.psm1`, profiles). It is enforced only on Windows; on Linux and macOS it is always `Unrestricted`. Microsoft describes it as a safety feature rather than a security boundary: it stops users running scripts by accident, but anyone can bypass it.

The policies are `Restricted` (no scripts), `AllSigned`, `RemoteSigned`, `Unrestricted`, `Bypass`, plus `Default` and `Undefined`. If nothing is set in any scope, Windows clients behave as `Restricted` and Windows Server as `RemoteSigned`.

```powershell
# See the policy in every scope, highest precedence first
Get-ExecutionPolicy -List

# Allow local scripts and signed downloaded scripts, for your account only (no admin needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run one script with a different policy, without changing any saved setting
pwsh -ExecutionPolicy Bypass -File .\script.ps1      # PowerShell 7
powershell -ExecutionPolicy Bypass -File .\script.ps1  # Windows PowerShell 5.1
```

Things to know:

- **Scope precedence.** Group Policy (`MachinePolicy`, `UserPolicy`) wins over everything, then `Process`, `CurrentUser`, `LocalMachine`. A `Set-ExecutionPolicy` call can succeed and still have no effect if a higher scope overrides it. In a domain, administrators set it with the **Turn on Script Execution** Group Policy setting.
- **Downloaded files are marked.** Browsers and email clients add a "from the internet" marker (an alternate data stream) to downloaded files. Under `RemoteSigned`, PowerShell refuses to run those unless they're signed. After reviewing a script, `Unblock-File .\script.ps1` removes the marker. Files fetched with `Invoke-WebRequest` or `curl.exe` may not be marked at all, so `RemoteSigned` is no substitute for reading what you run.
- **Signing.** For scripts you distribute inside an organisation, sign them with `Set-AuthenticodeSignature` and use `AllSigned`.
- **Secrets.** Don't put passwords or tokens in scripts. Take a `[PSCredential]` parameter, or use the [SecretManagement](https://learn.microsoft.com/powershell/utility-modules/secretmanagement/overview) module to read them from a vault.

## Further reading

- [about_Functions_Advanced](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_functions_advanced)
- [about_Try_Catch_Finally](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_try_catch_finally)
- [about_Comment_Based_Help](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_comment_based_help)
- [about_Execution_Policies](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
