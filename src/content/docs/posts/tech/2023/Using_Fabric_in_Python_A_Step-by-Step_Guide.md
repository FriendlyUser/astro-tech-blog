---
title: "Running remote commands over SSH with Python Fabric"
pubDate: "2024-08-29T09:57:22.000Z"
lastUpdated: 2026-11-14
description: "Use Fabric to run commands on remote servers over SSH: Connection objects in a script, sudo, file transfers, and fab tasks run from the command line."
tags: ["python"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3541980154.png
---

[Fabric](https://www.fabfile.org/) is a Python library for running shell commands on remote machines over SSH. It wraps [Paramiko](https://www.paramiko.org/) (SSH) and [Invoke](https://www.pyinvoke.org/) (task running), so you can script deploys and admin chores in Python instead of shell, and run them against one host or many.

This post uses Fabric 3.2. Fabric 2 was a rewrite, and code written for Fabric 1 (`from fabric.api import run, env`) doesn't run on 2.x or 3.x.

## Prerequisites

You need a server you can already reach with `ssh user@host` using a key. If you don't have a key yet:

```bash
ssh-keygen -t ed25519
ssh-copy-id user@your_server
ssh user@your_server   # should log in without a password prompt
```

Fabric reads `~/.ssh/config`, so host aliases, users, ports and `IdentityFile` entries defined there also apply to Fabric.

```bash
pip install fabric
```

## A plain script with Connection

A `Connection` is one SSH session to one host. `run()` executes a command and returns a `Result` with `stdout`, `stderr`, `exited` and `ok`:

```python
# remote_info.py
from fabric import Connection

with Connection(host="your_server", user="user") as c:
    result = c.run("uname -a", hide=True)
    print(result.stdout.strip())

    # A non-zero exit code raises UnexpectedExit unless you pass warn=True.
    check = c.run("test -d /srv/app", warn=True, hide=True)
    print("app dir exists" if check.ok else "app dir missing")
```

```bash
python remote_info.py
```

`hide=True` stops Fabric from echoing the remote output to your terminal. You still get it in `result.stdout`.

Some other `Connection` methods you'll use often:

```python
c.sudo("systemctl restart nginx")          # run as root via sudo
c.put("dist/app.tar.gz", "/tmp/app.tar.gz")  # upload a file
c.get("/var/log/nginx/error.log", "error.log")  # download a file

with c.cd("/srv/app"):
    c.run("git pull")                      # runs as: cd /srv/app && git pull
```

`c.cd()` only affects commands run inside the `with` block. Each `run()` is a separate shell, so `c.run("cd /srv/app")` on its own does nothing for the next command.

## Tasks with fab

For repeatable operations, put tasks in a `fabfile.py` and run them with the `fab` command. Each task receives a `Connection` as its first argument when you pass a host with `-H`:

```python
# fabfile.py
from fabric import task


@task
def update(c):
    c.sudo("apt-get update")


@task
def upgrade(c):
    c.sudo("apt-get upgrade -y")


@task
def install_package(c, package_name):
    c.sudo(f"apt-get install -y {package_name}")


@task
def disk_usage(c):
    result = c.run("df -h /", hide=True)
    print(f"{c.host}:\n{result.stdout.strip()}")
```

```bash
fab --list
fab -H user@your_server update
fab -H user@your_server install-package --package-name nginx
fab -H web1,web2,web3 disk-usage
```

Fabric turns underscores into dashes, so `install_package` becomes `install-package` and its argument becomes `--package-name`. With a comma-separated `-H` list, the task runs once per host, one after another.

## sudo passwords

If `sudo` on the server asks for a password, use `c.sudo()` rather than `c.run("sudo ...")`. `c.sudo()` answers the password prompt for you, while `run("sudo ...")` just waits for input. Supply the password at runtime instead of hard-coding it:

```bash
fab -H user@your_server --prompt-for-sudo-password update
```

## Further reading

- [Fabric getting started](https://docs.fabfile.org/en/latest/getting-started.html)
- [Connection API](https://docs.fabfile.org/en/latest/api/connection.html)
- [fab CLI reference](https://docs.fabfile.org/en/latest/cli.html)
- [Upgrading from Fabric 1.x](https://www.fabfile.org/upgrading.html)
