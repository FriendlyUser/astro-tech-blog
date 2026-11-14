---
description: "How Apache Struts 2 handles requests with actions, interceptors and struts.xml, with a small Struts 7 example and the security practices that matter most."
imgSrc: /imgs/2023/3170249337.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-12-29T07:25:32.000Z'
lastUpdated: 2026-11-14
tags:
  - java
title: "Apache Struts 2: actions, interceptors and security practices"
---

:::caution
Struts 1 (`Action`/`ActionForm`/`struts-config.xml`) reached end of life on 5 April 2013 and gets no security fixes.
This post covers Struts 2, whose current line is 7.x. Struts 7 needs Java 17 and a Jakarta Servlet 6 container such as Tomcat 10.1 or later.
:::

Apache Struts 2 is an action-based MVC framework for Java web applications. A servlet filter receives each request, maps the URL to an action class, runs that action through a stack of interceptors, and renders a result, usually a JSP. Most new Java web projects pick Spring MVC or a JavaScript front end instead. You will still find Struts in a lot of older enterprise applications, so it helps to know how it works and how to run it safely.

An earlier version of this post mixed Struts 1 classes (`org.apache.struts.action.Action`, `ActionForm`, `struts-config.xml`) with Struts 2 concepts and referenced a `CacheInterceptor` class that does not exist. Everything below is Struts 2.

## How a request flows

1. `StrutsPrepareAndExecuteFilter`, registered in `web.xml`, intercepts the request.
2. The action name in the URL (for example `/greet.action`) is looked up in `struts.xml`.
3. The configured interceptor stack runs. The default stack (`defaultStack`) handles exceptions, file uploads, copying request parameters onto the action, validation, and more.
4. The action's `execute()` method runs and returns a result name such as `"success"` or `"input"`.
5. The matching `<result>` is rendered, typically a JSP using the Struts tag library.

Struts 2 actions are plain objects, created per request, so they can hold request state in fields. Struts 1 actions were singletons and needed a separate `ActionForm`.

## A minimal Struts 7 example

Add the core dependency (7.4.0 is the current release on Maven Central):

```xml
<dependency>
    <groupId>org.apache.struts</groupId>
    <artifactId>struts2-core</artifactId>
    <version>7.4.0</version>
</dependency>
```

Register the filter in `WEB-INF/web.xml`:

```xml
<filter>
    <filter-name>struts2</filter-name>
    <filter-class>org.apache.struts2.dispatcher.filter.StrutsPrepareAndExecuteFilter</filter-class>
</filter>
<filter-mapping>
    <filter-name>struts2</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

The action takes a `name` parameter, validates it, and returns a result name. In Struts 7, `ActionSupport` lives in `org.apache.struts2` (it was `com.opensymphony.xwork2` in 6.x and earlier).

```java
package com.example.action;

import org.apache.struts2.ActionSupport;
import org.apache.struts2.interceptor.parameter.StrutsParameter;

public class GreetAction extends ActionSupport {
    private String name;

    @Override
    public void validate() {
        if (name == null || name.isBlank()) {
            addFieldError("name", "Name is required");
        }
    }

    @Override
    public String execute() {
        return SUCCESS;
    }

    public String getName() {
        return name;
    }

    @StrutsParameter
    public void setName(String name) {
        this.name = name;
    }
}
```

`@StrutsParameter` marks the setter as allowed to receive request parameters. The requirement was opt-in from 6.4 (`struts.parameters.requireAnnotations`) and is on by default in 7, so a setter without the annotation is ignored.

Map the action in `src/main/resources/struts.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE struts PUBLIC
    "-//Apache Software Foundation//DTD Struts Configuration 6.0//EN"
    "https://struts.apache.org/dtds/struts-6.0.dtd">
<struts>
    <constant name="struts.devMode" value="false"/>

    <package name="default" extends="struts-default">
        <action name="greet" class="com.example.action.GreetAction">
            <result name="success">/WEB-INF/jsp/greeting.jsp</result>
            <result name="input">/WEB-INF/jsp/form.jsp</result>
        </action>
    </package>
</struts>
```

If `validate()` adds a field error, the workflow interceptor in the default stack skips `execute()` and returns `"input"`, so the form is shown again with the error. The form uses the Struts tags:

```jsp
<%@ taglib prefix="s" uri="/struts-tags" %>
<s:form action="greet">
    <s:textfield name="name" label="Name"/>
    <s:submit/>
</s:form>
```

And the result page prints the value. `<s:property>` HTML-escapes output by default:

```jsp
<%@ taglib prefix="s" uri="/struts-tags" %>
<p>Hello, <s:property value="name"/></p>
```

Keeping JSPs under `WEB-INF` means users can only reach them through an action, not by URL.

## Interceptors

Cross-cutting work such as authentication checks, logging or timing belongs in an interceptor, not in every action. Implement `Interceptor` (or extend `AbstractInterceptor`), declare it in a package, and build a stack that includes `defaultStack`. If you replace the stack without including `defaultStack`, you silently lose parameter binding, validation and file-upload handling.

## Security practices

Struts has a long history of remote code execution bugs, many of them OGNL expression injection. CVE-2017-5638, in the Jakarta multipart parser, was the entry point for the 2017 Equifax breach. Practical rules:

- **Stay on a supported release.** The [download page](https://struts.apache.org/download.cgi) lists the supported lines; anything not listed is end of life. Subscribe to the [security bulletins](https://cwiki.apache.org/confluence/display/WW/Security+Bulletins).
- **Keep `struts.devMode` off in production.** Dev mode exposes debugging features and detailed errors.
- **Never evaluate user input as OGNL.** Avoid building expressions or result names from request data.
- **Only expose what you mean to.** Annotate the setters that should accept input with `@StrutsParameter` and keep the annotation requirement switched on.
- **Validate on the server.** Client-side checks are a convenience; `validate()` or XML/annotation validators are what actually protect the action.
- **Escape output.** Use `<s:property>` (escaped by default) rather than raw JSP expressions.

## When not to use Struts

For a new project, Struts is rarely the right choice: the ecosystem is small, and the security track record means you are signing up for frequent upgrades. If you maintain an existing Struts 2 application, the jump from 6.x to 7.x moves you to the `jakarta.*` namespace and renames the XWork packages. The OpenRewrite project has a Struts 7 migration recipe that automates much of the renaming.

## Further reading

- [Struts documentation](https://struts.apache.org/)
- [Struts 1 end-of-life announcement](https://struts.apache.org/struts1eol-announcement.html)
- [Struts 6.x to 7.x migration guide](https://cwiki.apache.org/confluence/display/WW/Struts+6.x.x+to+7.x.x+migration)
