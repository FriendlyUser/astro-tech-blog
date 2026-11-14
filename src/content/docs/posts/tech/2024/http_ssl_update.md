---
pubDate: "2024-06-10T10:00:00.000Z"
lastUpdated: 2026-11-14
title: "Serve FastAPI over HTTPS on a Google Compute Engine subdomain with Apache"
description: "Point a subdomain at a Compute Engine VM, run FastAPI behind an Apache reverse proxy, and add a free Let's Encrypt certificate with Certbot."
tags: ["Google Compute Engine", "FastAPI", "Apache", "DNS Configuration", "SSL Certificates", "Web Development", "Proxy Configuration", "python"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/getting-started-with-hyper.webp"
---

This walks through putting a FastAPI app on a Google Compute Engine (GCE) VM at a subdomain such as `api.example.com`, with Apache in front handling HTTPS. The steps assume a Debian or Ubuntu VM; replace `api.example.com` with your own subdomain throughout.

## Part 1: Point the subdomain at the VM

### Reserve a static external IP

New GCE VMs get an ephemeral external IP, which is released when the VM is stopped or deleted. A DNS record pointing at it will break the next time you stop the machine, so promote it to a static address:

- In the Cloud console, go to **VPC network → IP addresses**, find the VM's ephemeral address, open the **More actions** menu and choose **Promote to static IP address**.
- Or with `gcloud`:

  ```bash
  gcloud compute addresses create my-api-ip --addresses=203.0.113.10 --region=us-central1
  ```

### Add an A record

At your DNS provider (Cloudflare, Namecheap, Google Cloud DNS, etc.), add:

| Field | Value |
| ----- | ----- |
| Type  | `A` |
| Host / name | `api` (for `api.example.com`) |
| Value | the static IP |
| TTL   | the default is fine |

New records usually resolve within minutes. Changes to an existing record can take up to the old record's TTL to reach everyone.

Check it with:

```bash
dig +short api.example.com
# or
nslookup api.example.com
```

The answer should be your static IP.

### Open ports 80 and 443

In the VM's settings, tick **Allow HTTP traffic** and **Allow HTTPS traffic**. On the default network this adds the `http-server` and `https-server` network tags, which the default firewall rules allow. On a custom network, create a firewall rule allowing TCP 80 and 443 to the VM. Port 80 must stay open for Certbot's HTTP challenge and the HTTP-to-HTTPS redirect.

## Part 2: Run FastAPI behind Apache

### Install Apache and the app

```bash
sudo apt update
sudo apt install apache2 python3-venv
```

Recent Debian and Ubuntu releases refuse system-wide `pip install` (PEP 668, "externally-managed-environment"), so install FastAPI into a virtual environment:

```bash
mkdir -p ~/app && cd ~/app
python3 -m venv .venv
.venv/bin/pip install fastapi uvicorn
```

Create `~/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}
```

Test it:

```bash
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/
```

Bind to `127.0.0.1`, not `0.0.0.0`: Apache is the only thing that should reach Uvicorn.

### Keep Uvicorn running with systemd

A process started from your SSH session dies when you log out. Create `/etc/systemd/system/fastapi.service` (replace `youruser`):

```ini
[Unit]
Description=FastAPI app
After=network.target

[Service]
User=youruser
WorkingDirectory=/home/youruser/app
ExecStart=/home/youruser/app/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fastapi
```

### Configure Apache as a reverse proxy

Enable the proxy modules:

```bash
sudo a2enmod proxy proxy_http headers
```

Create `/etc/apache2/sites-available/api.example.com.conf` with a plain HTTP virtual host. Don't write the HTTPS block by hand yet: the certificate files don't exist, and Apache won't start if they're missing.

```apache
<VirtualHost *:80>
    ServerName api.example.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/

    ErrorLog ${APACHE_LOG_DIR}/api-error.log
    CustomLog ${APACHE_LOG_DIR}/api-access.log combined
</VirtualHost>
```

Enable it and reload:

```bash
sudo a2ensite api.example.com.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

`http://api.example.com` should now return the JSON response.

### Add HTTPS with Certbot

Certbot's own instructions install it as a snap:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --apache -d api.example.com
```

(`sudo apt install certbot python3-certbot-apache` also works, but the distro package can lag behind.)

Certbot gets the certificate, writes a `*-le-ssl.conf` virtual host on port 443 that copies your proxy settings, and sets up the HTTP-to-HTTPS redirect. It also installs a timer for renewal; check it with `sudo certbot renew --dry-run`.

So FastAPI knows the original request was HTTPS (for redirects and generated URLs), add this inside the new `<VirtualHost *:443>` block in `/etc/apache2/sites-available/api.example.com-le-ssl.conf`, then reload Apache:

```apache
RequestHeader set X-Forwarded-Proto "https"
```

Uvicorn trusts proxy headers from `127.0.0.1` by default, so no extra flags are needed.

## Troubleshooting

- **502/503 from Apache**: Uvicorn isn't running. Check `sudo systemctl status fastapi` and `journalctl -u fastapi`.
- **Certbot fails the challenge**: DNS isn't pointing at the VM yet, or port 80 is blocked by the GCE firewall.
- **Works on IP but not on the name**: check `ServerName` matches the subdomain exactly, and that `dig` returns the static IP.

## Further reading

- [Reserve a static external IP address (Google Cloud)](https://docs.cloud.google.com/vpc/docs/reserve-static-external-ip-address)
- [Certbot instructions for Apache](https://certbot.eff.org/instructions?ws=apache&os=snap)
- [Apache mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
- [FastAPI deployment concepts](https://fastapi.tiangolo.com/deployment/concepts/)
