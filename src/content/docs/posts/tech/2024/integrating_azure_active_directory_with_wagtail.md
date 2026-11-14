---
title: Sign in to the Wagtail admin with Microsoft Entra ID (Azure AD)
pubDate: "2024-02-16T19:17:25.000Z"
lastUpdated: 2026-11-14
description: "Add Microsoft Entra ID (formerly Azure Active Directory) login to the Wagtail admin with social-auth-app-django, including settings, URLs and a login button."
tags: ["Wagtail", "Microsoft Entra", "Azure Active Directory", "OAuth2", "Django", "Authentication", "Security", "Web Development", "Python", "Social Auth"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2024/authentication-birds.webp
---

Microsoft Entra ID is the current name for Azure Active Directory. If your organisation already uses it, letting editors sign in to the Wagtail admin with their work accounts saves managing a separate set of passwords. Wagtail is a Django app, so the standard Django route works: [social-auth-app-django](https://python-social-auth.readthedocs.io/en/latest/configuration/django.html) (Python Social Auth).

You need an existing Wagtail project and permission to create an app registration in your Entra tenant.

## Step 1: Install the library

```bash
pip install social-auth-app-django
```

Add it to `requirements.txt` as well.

## Step 2: Installed apps, middleware and context processors

In `settings/base.py`:

```python
INSTALLED_APPS = [
    # ...
    "social_django",
]

MIDDLEWARE = [
    # ... after the session, auth and message middleware
    "social_django.middleware.SocialAuthExceptionMiddleware",
]

TEMPLATES = [
    {
        # ...
        "OPTIONS": {
            "context_processors": [
                # ...
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]
```

`social_django` has its own models, so run the migrations:

```bash
python manage.py migrate
```

## Step 3: Register the app in Entra

In the [Microsoft Entra admin center](https://entra.microsoft.com/), go to **App registrations → New registration**:

- **Supported account types**: accounts in this organisational directory only (single tenant).
- **Redirect URI**: platform **Web**, value `https://your-domain.com/oauth/complete/azuread-v2-tenant-oauth2/`. The `oauth/` prefix matches the URL include in step 5; the last segment is the backend name. Add `http://localhost:8000/oauth/complete/azuread-v2-tenant-oauth2/` too if you test locally.

From the app's **Overview** page, copy the **Application (client) ID** and **Directory (tenant) ID**. Under **Certificates & secrets**, create a client secret and copy its value (it is only shown once). The same app registration is also reachable from the Azure portal; it's the same object.

Read the values from environment variables rather than committing them:

```python
import os

SOCIAL_AUTH_AZUREAD_V2_TENANT_OAUTH2_KEY = os.environ["AZUREAD_CLIENT_ID"]
SOCIAL_AUTH_AZUREAD_V2_TENANT_OAUTH2_SECRET = os.environ["AZUREAD_CLIENT_SECRET"]
SOCIAL_AUTH_AZUREAD_V2_TENANT_OAUTH2_TENANT_ID = os.environ["AZUREAD_TENANT_ID"]
```

## Step 4: Authentication backends and pipeline

Keep Django's `ModelBackend` so password login still works alongside Entra:

```python
AUTHENTICATION_BACKENDS = (
    "social_core.backends.azuread_tenant.AzureADV2TenantOAuth2",
    "django.contrib.auth.backends.ModelBackend",
)
```

The first version of this post used `social_core.backends.azuread.AzureADOAuth2` with `SOCIAL_AUTH_AZUREAD_OAUTH2_KEY`/`_SECRET`. That backend still exists, but it targets the v1 endpoint without a tenant. The Python Social Auth docs recommend the V2 backends for new integrations, and the tenant variant ties sign-in to your directory.

Social auth runs each login through a pipeline of functions. To add your own step, write out the default pipeline and append to it. A literal `...` in the tuple would be passed to the pipeline as an entry and break login.

```python
SOCIAL_AUTH_PIPELINE = (
    "social_core.pipeline.social_auth.social_details",
    "social_core.pipeline.social_auth.social_names",
    "social_core.pipeline.social_auth.social_uid",
    "social_core.pipeline.social_auth.auth_allowed",
    "social_core.pipeline.social_auth.social_user",
    "social_core.pipeline.user.get_username",
    "social_core.pipeline.user.create_user",
    "social_core.pipeline.social_auth.associate_user",
    "social_core.pipeline.social_auth.load_extra_data",
    "social_core.pipeline.user.user_details",
    "base.pipeline.make_user_superuser",
)
```

Check the [pipeline docs](https://python-social-auth.readthedocs.io/en/latest/pipeline.html) for the default list of the version you install, since it changes occasionally.

Users created this way have no admin access until you grant it. The example below, in `base/pipeline.py`, makes users from one email domain superusers so they can use the Wagtail admin right away. With the V2 tenant backend the email comes from the `preferred_username` claim, which is normally the user's UPN.

```python
def make_user_superuser(backend, user=None, *args, **kwargs):
    # Example condition: grant admin based on email domain.
    # Adjust to your own requirements.
    if user and user.email.lower().endswith("@example.com"):
        user.is_superuser = True
        user.is_staff = True
        user.save()
```

Superuser for everyone in a domain is a blunt tool. In a real deployment, map Entra groups or app roles to Wagtail groups instead, so permissions follow what's in your directory.

## Step 5: URLs and redirect

In the project `urls.py`, include the social auth URLs **before** the Wagtail catch-all `path("", include(wagtail_urls))`. Wagtail's page router matches every path, so anything added after it (for example with `urlpatterns += [...]` at the end of the file) is never reached.

```python
# Wagtail's project template already imports admin, include, path,
# wagtailadmin_urls, wagtaildocs_urls and wagtail_urls here.

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("oauth/", include("social_django.urls", namespace="social")),
    # ...
    path("", include(wagtail_urls)),  # keep this last
]
```

Send users to the Wagtail dashboard after login:

```python
SOCIAL_AUTH_LOGIN_REDIRECT_URL = "/admin/"
```

## Step 6: Add a button to the Wagtail login page

Nothing above adds a link to the login screen. Override Wagtail's login template from one of your apps (it must be listed in `INSTALLED_APPS` before `wagtail.admin`), for example `base/templates/wagtailadmin/login.html`:

```django
{% extends "wagtailadmin/login.html" %}

{% block below_login %}
  <form method="post" action="{% url 'social:begin' 'azuread-v2-tenant-oauth2' %}">
    {% csrf_token %}
    <input type="hidden" name="next" value="/admin/">
    <button type="submit" class="button">Sign in with Microsoft</button>
  </form>
{% endblock %}
```

Current versions of social-auth-app-django require a POST to `social:begin`, so a plain `<a href>` link won't work. The `below_login` block sits outside Wagtail's own login form, which avoids nesting one form inside another.

## Gotchas

- **Redirect URI mismatch** (`AADSTS50011`): the URI in Entra must match exactly, including scheme, the `oauth/` prefix and the trailing slash. Behind a reverse proxy that terminates TLS, set `SECURE_PROXY_SSL_HEADER` (and `USE_X_FORWARDED_HOST` if needed) so Django builds `https://` URLs.
- **Client secrets expire.** Entra secrets have an expiry date; put a reminder in the calendar or login will stop working.
- **Test the whole loop** with a non-admin account to confirm what a new user can and can't see.

## Further reading

- [Python Social Auth: Microsoft Entra ID / Azure AD backends](https://python-social-auth.readthedocs.io/en/latest/backends/azuread.html)
- [Python Social Auth: Django configuration](https://python-social-auth.readthedocs.io/en/latest/configuration/django.html)
- [Wagtail: customizing admin templates](https://docs.wagtail.org/en/stable/advanced_topics/customization/admin_templates.html)
