---
title: "Docker and Local Dev Environments"
description: "How I use Docker and docker-compose for local development, mail capture, test stacks and scraper/OCR services."
tags: ["Docker", "docker-compose", "DevOps", "Mailpit", "Local Development"]
pubDate: "2026-11-07T16:40:00.000Z"
---

I have used Docker on almost every contract I've worked on. It gets the legacy YellowSheet PHP site running on my machine and is the base for the YellowSheet scrapers and the PHP 5.6 test stack. At Royal Claims it packaged an OCR function for Azure, and at CSPS it gave me throwaway Postgres for an AI project. Most of it is docker-compose for local work. I rarely needed anything fancier.

## Getting a legacy PHP site running locally

- I started from a cPanel backup and set the project up in Docker.
- The first working version used a table dump of the database, with the `CREATE ALGORITHM` lines commented out so the import would load. Once the compose setup connected to the database, some of the legacy PHP version-migration utilities still crashed the code locally.
- Then I committed a cleaned SQL file, with the sensitive data removed, so any other developer could run `docker-compose up` and get a working site.
- The original Dockerfile pulls a PHP 5.2 image from GitHub's container registry. I keep images on GHCR because Docker Hub rate limits pulls.
- Railway built that same Dockerfile for the test deploys. Moving Railway's MySQL to v2 needed the users switched back to `mysql_native_password`:

```sql
ALTER USER 'your_username'@'%' IDENTIFIED WITH 'mysql_native_password' BY 'your_password';
FLUSH PRIVILEGES;
```

## The compose file today

The compose file has three services: the app (PHP 5.6, code bind-mounted into the container), `mariadb:10.6` loading a full dump from `docker-entrypoint-initdb.d`, and Mailpit. The app is pointed at Mailpit through environment variables:

```yaml
    environment:
      APP_ENV: dev
      SMTP_HOST: mailpit
      SMTP_PORT: 1025
...
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025" # Web UI
      - "1025:1025" # SMTP port
```

- Mailpit came in when I reworked forgot password and PHPMailer. Every email the app sends lands in a local inbox at port 8025, so I can test password resets and subscriber emails without emailing anyone. I have also used it at CSPS to check SMTP messages during a Vue 3 upgrade.
- The PHP 5.6 test stack switched from MailHog to Mailpit because MailHog's old Go binary gets killed on 6.x kernels.

## Switching PHP versions with containers

- Each upgrade attempt got its own images. I tried Rector with Docker, and later wrote Dockerfiles for PHP 8.x while keeping a legacy PHP 5.2 Dockerfile and compose file beside them so I could compare behaviour.
- For the PHP 5.6 upgrade, my colleague's container file pins PHP 5.6.40 to match the production host. Debian stretch is end-of-life, so it has to point apt at `archive.debian.org`. Railway was pinned to that file, because building the original Dockerfile would have shipped the 5.2 runtime with the new code.
- The test stack runs PHPUnit, the app and Playwright on an internal network with no published host port. I added the isolated-network flag for a CA-bundle check on outbound TLS.
- On the CSPS laptop I didn't use Docker for this. I installed PHP 8.1 and 8.4 directly and needed Go on WSL to get it working.

## Scraper and OCR services

- The first PDF scraper was a FastAPI app with a Dockerfile. OCR runs as a separate ocrmypdf container, which later moved to Cloud Run.
- At Royal Claims I built and pushed an OCR image to Azure Container Registry and ran it as a container-based Azure Function:

```bash
docker build --tag ocr:v1.0.0 .
docker tag ocr:v1.0.0 <registry>.azurecr.io/ocr:v1.0.0
docker run -p 8080:80 -it ocr:v1.0.0
docker push <registry>.azurecr.io/ocr:v1.0.0
```

- The tender scrapers need a browser, so their image was a multi-stage Python 3.10-slim build with Xvfb and Camoufox. I also tried a zendriver Docker image while researching browser automation.
- I later made the PDF scraper image multi-stage and non-root on `python:3.12-slim`, and tightened `.dockerignore`. I also removed the `.git` directories from another scraper image's build context to reduce its size.

## Databases in containers

- MySQL and MariaDB load a SQL dump at startup, which is what makes the YellowSheet setup easy. Microsoft SQL Server in Docker can't be seeded from a dump the same way, which slowed down the Royal Claims payment app work.
- At CSPS I used a `postgres:15` compose service with a named volume and a `pg_isready` healthcheck to test the LangGraph Postgres checkpointer.

## Lessons

- Commit a sanitized SQL dump with the compose file. Most of the onboarding pain on a legacy app is the database, not the code.
- Put a mail catcher in every compose file for an app that sends email.
- Pin the runtime to what production actually runs, and make sure the deploy platform builds the right Dockerfile.
- Keep images small with `.dockerignore`, and in particular keep `.git` out.
