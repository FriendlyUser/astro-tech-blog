---
title: "Running Services and Scheduled Jobs with systemd Units and Timers"
description: "Write a systemd service for a web app with restarts and an environment file, read its logs with journalctl, and replace cron jobs with timers, including user units."
tags: ["Linux", "systemd", "Cron", "Servers", "DevOps"]
pubDate: "2026-05-31T16:00:00.000Z"
imgSrc: "/imgs/2026/systemd_services_and_timers.webp"
imgAlt: "A 24-hour clock face with timer ticks next to a service box that restarts after a failure"
---

On almost every current Linux distribution, systemd is the process that starts everything else, and it's also the simplest way to keep your own programs running. A short unit file gives a web app automatic restarts, logging, a dedicated user and sandboxing, with no process manager to install. A **timer** unit does the same for scheduled jobs and fixes most of what is awkward about cron.

This post writes a service for a small Python web app, a timer for its nightly backup, and a user-level timer you can try without root. The unit files were checked with `systemd-analyze verify` (systemd 249). Nothing here is new, so it works on any distribution from the last several years.

## A service for a web app

Assume an app installed in `/opt/notes-api`, with a virtual environment and Gunicorn, running as a dedicated `notes` user. The unit file goes in `/etc/systemd/system/notes-api.service`:

```ini
[Unit]
Description=Notes API (gunicorn)
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=notes
Group=notes
WorkingDirectory=/opt/notes-api
EnvironmentFile=/etc/notes-api/notes-api.env
ExecStart=/opt/notes-api/.venv/bin/gunicorn --bind 127.0.0.1:8000 --workers 3 app:app
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/var/lib/notes-api

[Install]
WantedBy=multi-user.target
```

Going section by section:

**`[Unit]`** holds metadata and ordering. `After=network-online.target` with `Wants=` delays the start until the network is configured, which matters if the app connects to a database on startup. `After=` alone only orders; `Wants=` is what actually pulls the target in.

**`[Service]`** says how to run it:

- `Type=simple` (the default) means the process in `ExecStart` *is* the service and stays in the foreground. Don't daemonise your app or wrap it in `nohup`. systemd tracks the process, and its stdout and stderr go to the journal.
- `ExecStart` needs the full path to the executable. There's no shell involved, so pipes, `&&` and `~` don't work. If you need a shell, call `/bin/sh -c '...'` explicitly.
- `User=` and `Group=` drop root. Create the user first with `useradd --system --no-create-home notes`.
- The `Protect*`, `PrivateTmp` and `NoNewPrivileges` lines are cheap sandboxing. `ProtectSystem=strict` makes the whole filesystem read-only for this service, so `ReadWritePaths=` lists the directories it may write to. `systemd-analyze security notes-api` scores a unit and lists further options.

**`[Install]`** is only used by `systemctl enable`. `WantedBy=multi-user.target` means "start this at boot on a normal multi-user system".

### Restart behaviour

`Restart=on-failure` restarts the service if it exits with a non-zero code, is killed by a signal, or times out. It does not restart after a clean exit or after `systemctl stop`. The other common choice is `Restart=always`, which also restarts after a clean exit. That's useful for workers that exit on purpose after a fixed number of jobs.

`RestartSec=5s` waits between attempts. The default is 100 ms, which turns a crash loop into a CPU-burning one.

The start limit stops endless loops. With `StartLimitBurst=5` and `StartLimitIntervalSec=300`, once the unit has been started five times within five minutes, systemd refuses further starts and leaves it in a failed state. These two settings belong in `[Unit]`, not `[Service]`; `systemd-analyze verify` warns `Unknown key name 'StartLimitIntervalSec' in section 'Service'` if you put them in the wrong place. Clear the failed state with `systemctl reset-failed notes-api` once you've fixed the cause.

### The environment file

`/etc/notes-api/notes-api.env` holds configuration and secrets, one `KEY=value` per line:

```ini
DATABASE_URL=postgresql://notes@localhost/notes
SECRET_KEY=change-me
LOG_LEVEL=info
```

Make it readable by root only (`chmod 600`). systemd reads the file as root before dropping privileges, so the service user doesn't need access to it. Lines starting with `#` are comments. The file is not a shell script, so there's no command substitution: `$(...)` is passed through as literal text. Prefix the path with `-` (`EnvironmentFile=-/etc/notes-api/extra.env`) to make a file optional. For a single value, `Environment=LOG_LEVEL=info` works inline.

### Starting it

```bash
sudo systemctl daemon-reload          # after creating or editing any unit file
sudo systemctl enable --now notes-api # start now and at every boot
systemctl status notes-api
```

`status` shows whether it is running, the main PID, memory use, and the last few log lines. After changing the unit file, run `daemon-reload` again and then `systemctl restart notes-api`. Forgetting the reload is the most common reason "my change did nothing".

For small changes to a unit you don't own, such as one installed by a package, use `sudo systemctl edit nginx`. It creates a drop-in override in `/etc/systemd/system/nginx.service.d/override.conf` that survives package upgrades.

## Reading logs with journalctl

Everything the service writes to stdout and stderr lands in the journal, tagged with the unit name:

```bash
journalctl -u notes-api                 # all logs for the unit
journalctl -u notes-api -f              # follow, like tail -f
journalctl -u notes-api -b              # since the last boot
journalctl -u notes-api --since "1 hour ago"
journalctl -u notes-api -p warning      # warning and worse
journalctl -u notes-api -o cat          # messages only, without timestamps and hostnames
```

systemd's own messages about the unit appear in the same stream: start, stop, "Main process exited, code=exited, status=1/FAILURE", and "Scheduled restart job". That's usually the fastest way to see why a service keeps restarting.

## Timers instead of cron

A timer is a `.timer` unit that starts a `.service` unit on a schedule. Here is the nightly backup. First the service, `/etc/systemd/system/notes-backup.service`:

```ini
[Unit]
Description=Back up the notes database

[Service]
Type=oneshot
User=notes
EnvironmentFile=/etc/notes-api/notes-api.env
ExecStart=/opt/notes-api/bin/backup.sh
```

`Type=oneshot` means the job runs to completion, and the unit counts as active until it exits. It has no `[Install]` section because the timer starts it, not the boot process.

Then the timer, `/etc/systemd/system/notes-backup.timer`:

```ini
[Unit]
Description=Nightly notes backup

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
```

A timer starts the service with the same name by default (`notes-backup.timer` starts `notes-backup.service`). Set `Unit=` in `[Timer]` to point it at another one.

- `OnCalendar=` is the schedule, in systemd's calendar syntax (next section).
- `Persistent=true` records the last run on disk. If the machine was off at 03:30, the job runs as soon as the timer starts again at boot. Plain cron simply skips missed runs.
- `RandomizedDelaySec=15m` adds a random delay of up to 15 minutes, so a fleet of machines doesn't hit the backup server at the same second.

Enable the **timer**, not the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now notes-backup.timer
systemctl list-timers                       # next and last run for every timer
sudo systemctl start notes-backup.service   # run the job once, right now
journalctl -u notes-backup                  # its output
```

What you get over cron:

- **Logs** go to the journal with exit status, rather than to a local mail spool nobody reads.
- **No overlapping runs.** If the job is still running when the timer fires again, systemd doesn't start a second copy.
- **Same environment as a service**: `User=`, `EnvironmentFile=`, sandboxing and resource limits (`MemoryMax=`, `CPUQuota=`) all apply.
- **Testable on demand** with `systemctl start`, in exactly the environment the timer uses.
- **Missed runs** are caught up with `Persistent=true`.

What you lose is brevity: two files instead of one line. For a one-off, `systemd-run --on-calendar="*-*-* 03:30" /path/to/script` creates a transient timer without writing any files. It's gone after a reboot.

## Calendar expressions, and how to check them

The format is `DayOfWeek Year-Month-Day Hour:Minute:Second`, with `*` for "any", ranges with `..`, lists with `,` and repetition with `/`. Some examples:

| Expression | Meaning |
|---|---|
| `*-*-* 03:30:00` | Every day at 03:30 |
| `Mon..Fri 09:00` | Weekdays at 09:00 |
| `*:0/15` | Every 15 minutes |
| `hourly`, `daily`, `weekly` | Shorthands for the start of each hour, day or week |
| `Sun *-*-1..7 04:00` | The first Sunday of every month at 04:00 |
| `*-*-* 03:30:00 Europe/Berlin` | 03:30 in a specific time zone |

Don't guess; `systemd-analyze calendar` parses an expression and prints when it fires next:

```text
$ TZ=UTC systemd-analyze calendar --iterations=2 \n    --base-time='2026-05-31 12:00 UTC' 'Sun *-*-1..7 04:00'
  Original form: Sun *-*-1..7 04:00
Normalized form: Sun *-*-01..07 04:00:00
    Next elapse: Sun 2026-06-07 04:00:00 UTC
       Iter. #2: Sun 2026-07-05 04:00:00 UTC
```

`--base-time` pins "now" so the output is reproducible; leave it out to calculate from the current time. (I trimmed the "From now" lines.) The "first Sunday of the month" case is a good example of where cron's syntax fails: in cron, setting both day-of-month and day-of-week means *either* matches, not both.

Timers can also be relative instead of wall-clock: `OnBootSec=5min` fires five minutes after boot, and `OnUnitActiveSec=1h` fires an hour after the service last started. Combined, they give "every hour, starting five minutes after boot".

## User units: services without root

Every logged-in user has their own systemd instance. Units in `~/.config/systemd/user/` run as you, need no `sudo`, and are managed with `systemctl --user`. Here is a complete example you can try on any systemd-based machine: a timer that logs disk usage of your home directory every 15 minutes.

`~/.config/systemd/user/disk-report.service`:

```ini
[Unit]
Description=Log disk usage of the home directory

[Service]
Type=oneshot
ExecStart=/usr/bin/df -h %h
```

`~/.config/systemd/user/disk-report.timer`:

```ini
[Unit]
Description=Disk usage report every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
```

`%h` is a systemd specifier for the user's home directory. Then:

```bash
systemctl --user daemon-reload
systemctl --user enable --now disk-report.timer
systemctl --user list-timers
systemctl --user start disk-report.service   # run it once now
journalctl --user -u disk-report             # see the df output
```

By default your user instance stops when your last session ends, which takes your services and timers with it. To keep them running after you log out, and start them at boot, enable lingering once:

```bash
sudo loginctl enable-linger "$USER"
```

User services that should start at login use `WantedBy=default.target` in `[Install]`. `multi-user.target` doesn't exist in the user instance.

To clean up the example: `systemctl --user disable --now disk-report.timer`, delete the two files, and run `systemctl --user daemon-reload`.

## Gotchas

- **Edit, then `daemon-reload`.** systemd caches unit files. When you forget, `systemctl status` warns that the unit file changed on disk and tells you to reload.
- **Enable the timer, not the service.** Enabling a service with no `[Install]` section prints a warning and does nothing.
- **`%` in unit files is a specifier.** A literal percent sign, as in `date +%F`, has to be written `%%`.
- **No shell in `ExecStart`.** Redirection, globs and `~` are passed literally. Wrap the command in a script, or use `/bin/sh -c`.
- **Time zones.** `OnCalendar` uses the system time zone unless you add one to the expression. Check with `timedatectl`.
- **`Restart=always` with a broken config** keeps hitting the start limit. Look at `systemctl status` for "start request repeated too quickly", fix the cause, then `reset-failed`.

## Further reading

- [systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html)
- [systemd.time: calendar event syntax](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html)
- [systemd.exec: User=, EnvironmentFile= and sandboxing options](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
