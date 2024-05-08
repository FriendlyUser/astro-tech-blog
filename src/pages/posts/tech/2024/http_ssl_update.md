---
pubDate: "2024-06-05T10:00:00.000Z"
title: "Configuing a Subdomain for Google Compute Engine and Setting Up FastAPI with Apache"
description: "A comprehensive guide on how to point a subdomain to a Google Compute Engine instance and set up a FastAPI application using Apache as a reverse proxy. This tutorial includes steps from assigning a static IP to your instance, configuring DNS, and setting up SSL with Apache to serve FastAPI applications securely."
tags: ["Google Compute Engine", "FastAPI", "Apache", "DNS Configuration", "SSL/TLS Certificates", "Web Development", "Proxy Configuration"]
layout: "@/templates/BasePost.astro"
imgSrc: "https://images.unsplash.com/photos/a-large-statue-of-a-person-in-a-dark-room-Lhzabp9UrSU"
---

### 1. Ensure the Compute Engine Instance Has a Static IP Address
By default, Google Compute Engine instances are assigned ephemeral IP addresses, which can change upon reboot. You will want a static IP to ensure your subdomain continues to point to the instance even after restarts.

- **Assign a static IP**: Go to the Google Cloud Console, navigate to the "VPC network" section, then to "External IP addresses". Find your instance’s IP, change it from "Ephemeral" to "Static", and confirm the reservation.

### 2. Configure DNS Records
Next, you'll need to configure your DNS settings. This involves adding an A record that points your subdomain to the static IP address of your Compute Engine instance.

- **Access your DNS provider**: Log in to the administrative console for your domain (wherever your domain's DNS is managed, such as GoDaddy, Namecheap, Cloudflare, etc.).
  
- **Add an A record**:
  - **Record Type**: A
  - **Host**: The subdomain you want to use (for example, `subdomain` if you want `subdomain.yourdomain.com`).
  - **Value**: The static IP address of your Compute Engine instance.
  - **TTL (Time to Live)**: This is optional and determines how long the DNS servers should cache the information. The default is typically fine.

### 3. Wait for DNS Propagation
DNS changes can take some time to propagate, typically anywhere from a few minutes to up to 48 hours, though usually much faster (often within an hour). During this time, not all users might be directed to your new IP address when accessing the subdomain.

### 4. Verify DNS Configuration
You can verify that the DNS record is set up correctly by using tools like `nslookup`, `dig`, or online services to check DNS records. Here’s how you can use `nslookup`:

- Open a command prompt or terminal.
- Type `nslookup subdomain.yourdomain.com` and press Enter.
- Check that the response shows the correct IP address of your Compute Engine instance.

### 5. Configure Your Server (Optional)
If your Compute Engine instance is running a web server or similar service, make sure it's configured to respond to requests on the subdomain:

- **For web servers** (like Apache or Nginx), you might need to set up a virtual host or server block to specifically handle requests for the subdomain.
- **Security settings** like firewall rules in Google Cloud should also allow traffic (usually on ports 80 and 443) to the instance.

Once the DNS update has fully propagated and your server is configured to handle the subdomain, visiting `subdomain.yourdomain.com` should take you to your Google Compute Engine instance. This setup allows you to manage traffic and host different applications on subdomains effectively.

### Step 1: Install Required Software

First, ensure that you have Python and FastAPI installed on your system, along with Apache.

- **Install Apache**:
  ```bash
  sudo apt update
  sudo apt install apache2
  ```

- **Install FastAPI and Uvicorn** (FastAPI's preferred ASGI server):
  ```bash
  sudo apt install python3-pip
  pip3 install fastapi uvicorn
  ```

### Step 2: Configure Your FastAPI Application

Prepare your FastAPI application. If you don't have one, you can create a simple example:

- **Create a new file** (`main.py`):
  ```python
  from fastapi import FastAPI

  app = FastAPI()

  @app.get("/")
  def read_root():
      return {"Hello": "World"}
  ```

- **Run it locally** (for testing):
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000
  ```

### Step 3: Set Up Apache as a Reverse Proxy

- **Enable necessary Apache modules**:
  ```bash
  sudo a2enmod proxy proxy_http ssl
  ```

- **Create a new Apache configuration** for your site or edit an existing one:
  ```bash
  sudo nano /etc/apache2/sites-available/yourdomain.com.conf
  ```

- **Insert the following configuration**, adjusting ServerName, SSLCertificateFile, and SSLCertificateKeyFile as needed:
  ```apache
  <VirtualHost *:443>
      ServerName yourdomain.com
      SSLEngine on
      SSLCertificateFile /path/to/your/certificate.crt
      SSLCertificateKeyFile /path/to/your/private.key

      ProxyPass / http://127.0.0.1:8000/
      ProxyPassReverse / http://127.0.0.1:8000/

      <Directory /path/to/app>
          Require all granted
      </Directory>

      ErrorLog ${APACHE_LOG_DIR}/error.log
      CustomLog ${APACHE_LOG_DIR}/access.log combined
  </VirtualHost>

  # Redirect HTTP to HTTPS
  <VirtualHost *:80>
      ServerName yourdomain.com
      Redirect permanent / https://yourdomain.com/
  </VirtualHost>
  ```

- **Enable the site and restart Apache**:
  ```bash
  sudo a2ensite yourdomain.com.conf
  sudo systemctl restart apache2
  ```

### Step 4: Obtain and Configure SSL/TLS Certificates

- **Use Certbot (from Let's Encrypt) for a free SSL certificate**:
  ```bash
  sudo apt-get install certbot python3-certbot-apache
  sudo certbot --apache -d yourdomain.com
  ```

- **Follow the prompts** to configure HTTPS. Certbot will adjust the Apache configuration to use the obtained SSL certificates automatically.

### Step 5: Test Your Configuration

After setting up everything, access `https://yourdomain.com` in your browser to see if your FastAPI application is served over HTTPS via Apache. You can check the Apache and FastAPI logs for any errors or debugging information.

### Notes:

- **Firewall Settings**: Ensure your firewall settings allow traffic on both ports 80 and 443.
- **DNS Settings**: Make sure your DNS records are pointing to the server where Apache is installed.
- **Security Practices**: Keep your system and applications up to date to avoid security vulnerabilities.

This configuration leverages Apache as a reverse proxy, providing a robust front end to handle HTTPS, while FastAPI handles the application logic in the background.
