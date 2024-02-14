---
title: Integrating microsoft entra (active directory) with wagtail
pubDate: "2024-02-16T19:17:25.000Z"
description: "In this article, we will explore how to integrate microsoft entra with wagtail"
tags: ["Wagtail", "Microsoft Entra", "Azure Active Directory", "OAuth2", "Django", "Authentication", "Security", "Web Development", "Python", "Social Auth"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2024/authentication_birds.png
---

# Integrating microsoft entra with wagtail

Integrating OAuth2 authentication into the Wagtail admin interface enhances security and user experience by allowing users to log in using their existing Azure Active Directory (Azure AD) credentials. This guide walks you through adding OAuth2 login functionality to your Wagtail site using the social-auth-app-django library.

### Prerequisites

Before beginning, ensure you have a Wagtail project set up and access to Azure AD to register your application and obtain necessary credentials (Client ID and Client Secret).

### Step 1: Update Requirements

First, add `social-auth-app-django` to your project's requirements. Update your `requirements.txt` file to include this library, enabling your Django project to communicate with Azure AD for authentication.

### Step 2: Configure Installed Apps and Middleware

Update your `settings/base.py` to include `social_django` in the `INSTALLED_APPS` list, which is crucial for integrating the social authentication system into your Django project.

```python
INSTALLED_APPS = [
    ...
    "social_django",
]
```

Then, add the social context processors to the `TEMPLATES` configuration. These context processors provide necessary data for the authentication process in your templates.

```python
TEMPLATES = [
    {
        ...
        'OPTIONS': {
            'context_processors': [
                ...
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]
```

### Step 3: Azure AD Configuration

Register your application with Azure AD to obtain OAuth2 credentials. Create a new app registration in your Azure portal and note the Application (client) ID and Client Secret. Back in your Django settings, configure the OAuth2 key and secret with the values obtained from Azure AD, using environment variables for security.

```python
SOCIAL_AUTH_AZUREAD_OAUTH2_KEY = get_env('SOCIAL_AUTH_AZUREAD_OAUTH2_KEY')
SOCIAL_AUTH_AZUREAD_OAUTH2_SECRET = get_env('SOCIAL_AUTH_AZUREAD_OAUTH2_SECRET')
```

You have two options for setting up authentication related to your app service: directly through Azure or by using the Microsoft Entra portal. If you choose the first method, you can assess the variables within Azure and copy them over. Alternatively, you can utilize the Microsoft Entra portal, which is a comprehensive identity and access management solution from Microsoft, designed to manage and secure access to applications and resources.

### Step 4: Authentication Backends and Pipeline

Define the authentication backends in `settings/base.py` to include Azure AD OAuth2 backend alongside the default Django model backend, allowing authentication via either Azure AD or traditional methods.

```python
AUTHENTICATION_BACKENDS = (
    'social_core.backends.azuread.AzureADOAuth2',
    'django.contrib.auth.backends.ModelBackend',
)
```

Customize the social authentication pipeline as per your application's needs, including steps to process user data during authentication and potentially a custom function to assign specific roles or permissions to new users.

```python
SOCIAL_AUTH_PIPELINE = (
    ...
    'base.pipeline.make_user_superuser',
)
```

For example the following code can be used to make a new user a superuser (so they can assess) wagtail admin automatically.

Ideally, for active directory you would have your own permission system based on user groups.

```python
def make_user_superuser(backend, user, response, *args, **kwargs):
    # Example condition: make superuser based on email domain
    # Adjust the condition according to your requirements
    if user.email.endswith('@gmail.ca'):
        user.is_superuser = True
        user.is_staff = True  # Necessary for accessing the Django admin
        user.save()
```

### Step 5: URL Configuration

Update your project's `urls.py` to include routes for social authentication, ensuring Django can handle OAuth2 callbacks from Azure AD.

```python
urlpatterns += [
    ...
    path('oauth/', include('social_django.urls', namespace='social')),
]
```

Set `SOCIAL_AUTH_LOGIN_REDIRECT_URL` to redirect users to the Wagtail admin dashboard upon successful authentication.

```python
SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/admin'
```

### Conclusion

Following these steps integrates OAuth2 login with Azure AD into your Wagtail admin interface, simplifying the login process for users and enhancing security through Azure AD's authentication mechanisms. Ensure to test the login flow thoroughly for a smooth user experience.
