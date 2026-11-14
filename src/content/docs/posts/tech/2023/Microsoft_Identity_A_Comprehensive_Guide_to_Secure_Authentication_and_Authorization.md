---
description: "An overview of the Microsoft identity platform (Entra ID, MSAL, External ID) and how to protect an ASP.NET Core API and call it with MSAL.NET."
imgSrc: /imgs/2023/359936451.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-06-10T04:44:13.000Z'
lastUpdated: 2026-11-14
tags: ["csharp", "dotnet"]
title: "Microsoft identity platform: Entra ID, MSAL and protecting an ASP.NET Core API"
---

:::caution[Names have changed since this post was written]
Azure Active Directory (Azure AD) was renamed **Microsoft Entra ID** in 2023. Azure AD B2B collaboration is now part of **Microsoft Entra External ID**, and Microsoft stopped selling **Azure AD B2C** to new customers on May 1, 2025, pointing them to External ID instead. Existing B2C tenants are still supported. The concepts below are unchanged; the product names are updated.
:::

The Microsoft identity platform is the set of Microsoft services and libraries for signing users in and issuing tokens that apps and APIs use to authorize requests. It speaks standard OAuth 2.0 and OpenID Connect, so the ideas carry over to other identity providers; the Microsoft-specific parts are the directory, the portal and the client libraries.

## The pieces

- **Microsoft Entra ID** (formerly Azure AD) – the cloud directory for an organization's users, groups and app registrations. It issues tokens and enforces single sign-on, multi-factor authentication (MFA) and Conditional Access.
- **Microsoft Authentication Library (MSAL)** – client libraries for .NET, JavaScript, Python, Java, Android and iOS that handle sign-in flows, token caching and refresh.
- **Microsoft.Identity.Web** – an ASP.NET Core library built on MSAL that wires up token validation for web APIs and sign-in for web apps.
- **Microsoft Entra External ID** – identities from outside your organization: business partners invited as guests (B2B collaboration) and customer sign-up/sign-in for consumer-facing apps, the role Azure AD B2C used to fill.

## Authentication vs authorization

- **Authentication** answers "who is this?". The user signs in with Entra ID and your app receives an ID token (for the app itself) and/or an access token (for calling an API).
- **Authorization** answers "may they do this?". Your API reads claims from the access token, such as `scp` (delegated scopes) or `roles` (app roles), and allows or rejects the request.

Entra ID handles the first. Your code is still responsible for the second.

## Protecting an ASP.NET Core API

The usual flow:

1. **Register the API** in the Entra admin center under *App registrations*. Note the tenant ID and client ID, set an Application ID URI (e.g. `api://my-reports-api`), and define the scopes or app roles callers can be granted.
2. **Register each client** (web app, SPA, daemon) and grant it permission to those scopes or roles.
3. **Validate tokens in the API** with Microsoft.Identity.Web.
4. **Acquire tokens in the client** with MSAL.

For step 3, add the `Microsoft.Identity.Web` package and point it at your registration:

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<api-client-id>"
  }
}
```

The configuration section is still conventionally named `AzureAd`.

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =>
{
    // Only callers granted the "Reports.Read" app role get in
    options.AddPolicy("ReportsReader", policy => policy.RequireRole("Reports.Read"));
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/reports", () => new[] { "q1", "q2" })
   .RequireAuthorization("ReportsReader");

app.Run();
```

`AddMicrosoftIdentityWebApi` validates the token's signature, issuer, audience and lifetime against your tenant. The policy then checks the `roles` claim.

## Calling the API with MSAL

A background service with no signed-in user uses the client credentials flow. With the `Microsoft.Identity.Client` (MSAL.NET) package:

```csharp
using Microsoft.Identity.Client;

IConfidentialClientApplication app = ConfidentialClientApplicationBuilder
    .Create(clientId)
    .WithClientSecret(clientSecret)
    .WithAuthority($"https://login.microsoftonline.com/{tenantId}")
    .Build();

AuthenticationResult result = await app
    .AcquireTokenForClient(new[] { "api://my-reports-api/.default" })
    .ExecuteAsync();

// Send result.AccessToken as "Authorization: Bearer <token>"
```

Both snippets were compiled against .NET 9 with Microsoft.Identity.Web 4.18.0 and Microsoft.Identity.Client 4.92.0.

MSAL caches tokens and refreshes them for you. You don't handle refresh tokens directly. For apps with a signed-in user, call `AcquireTokenSilent` first and fall back to an interactive flow only when it throws `MsalUiRequiredException`. In production, prefer a certificate or a managed identity over a client secret.

## Security practices

1. **Require MFA.** Turn it on for all users, through security defaults or Conditional Access policies.
2. **Use Conditional Access** to require compliant devices or block risky sign-ins based on location, device and risk level. It needs a Microsoft Entra ID P1 licence or higher.
3. **Grant least privilege.** Ask for the narrowest scopes or roles an app needs, and avoid broad Microsoft Graph permissions like `Directory.ReadWrite.All` unless there's no alternative.
4. **Validate every claim you rely on.** Check audience and issuer (Microsoft.Identity.Web does this), and check scopes or roles on every endpoint, not only at the gateway.
5. **Monitor sign-in and audit logs** in the Entra admin center, and send them to your SIEM if you have one.
6. **Keep MSAL and Microsoft.Identity.Web up to date** to pick up security fixes.

## Further reading

- [Microsoft identity platform documentation](https://learn.microsoft.com/entra/identity-platform/)
- [Protected web API: code configuration](https://learn.microsoft.com/entra/identity-platform/scenario-protected-web-api-app-configuration)
- [MSAL overview](https://learn.microsoft.com/entra/identity-platform/msal-overview)
- [Azure AD B2C end of sale FAQ](https://learn.microsoft.com/azure/active-directory-b2c/faq)
