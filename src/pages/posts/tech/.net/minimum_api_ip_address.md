

ASP.NET Core Minimal APIs offer a streamlined way to build efficient HTTP APIs with minimal code and configuration. With this approach, you can create fully functional REST endpoints without the need for traditional scaffolding or unnecessary controllers. Instead, you can declare your API routes and actions fluently, allowing you to quickly build APIs that meet your specific needs. By leveraging the power of ASP.NET Core, you can build APIs that are fast and scalable, and easily incorporate them into your application. Whether you are building a small API for a personal project or a larger API for a business, Minimal APIs provide a powerful and flexible solution for building and deploying your APIs with ease.


```cs
using System;
using System.IO;
using System.Net;
using Microsoft.AspNetCore.OpenApi;
using System.Text.Json;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => {
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Ip Api",
        Description = "An ASP.NET Core Web API for managing calling ip addresses",
        // TermsOfService = new Uri("https://example.com/terms"),
        Contact = new OpenApiContact
        {
            Name = "Friendlyuser",
            Url = new Uri("friendlyuser.github.io")
        },
        License = new OpenApiLicense
        {
            Name = "Example License",
            Url = new Uri("https://example.com/license")
        }
    });
});

var app = builder.Build();
```




This code creates an ASP.NET Core web application using the WebApplication.CreateBuilder method, and configures the application to use OpenAPI (formerly known as Swagger) to document its API.

The AddEndpointsApiExplorer method adds support for generating API documentation based on the endpoints defined in the application.

The AddSwaggerGen method adds a Swagger generator to the service collection, and configures it to generate Swagger documentation for the API's "v1" version. The OpenApiInfo object passed to the SwaggerDoc method contains metadata about the API, such as its version, title, and contact information.

Finally, the Build method is called to build the web application and return an IApplicationBuilder instance, which can be used to configure the request handling pipeline and start the application.  



```cs
app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/", () => "Hello World!").WithName("Hello World")
.WithOpenApi();;

var ipItems = app.MapGroup("/ip");

ipItems.MapGet("/", GetIpAddressAsync).WithName("GetIpAddress")
.WithOpenApi();

// info with argument for ip address
ipItems.MapGet("/{ip}", async (string ip) =>
{
    return await GetIpInfoAsync(ip);
}).WithName("GetIp").WithOpenApi();

// info 
ipItems.MapGet("/info", async (HttpContext context) =>
{
    // get ip for requester
    string? ip;
    ip =   context?.Connection?.RemoteIpAddress.ToString();
    if (string.IsNullOrEmpty(ip))
    {
        ip =  context.Request.Headers["X-Forwarded-For"].ToString();
    }
    return await GetIpInfoAsync(ip);
}).WithName("Get Server Ip Info").WithOpenApi();

app.Run();
```
This code is setting up an ASP.NET Core web application to use Swagger for API documentation and defining a few API endpoints.

The UseSwagger and UseSwaggerUI methods enable Swagger and Swagger UI in the application. Swagger UI is a web-based tool that allows you to interactively explore and test your API.

The MapGet method is used to define a GET endpoint for the API. For example, the first MapGet method defines an endpoint at the root path ("/") that returns the string "Hello World!". This endpoint is given the name "Hello World". The WithOpenApi method specifies that this endpoint should be included in the generated Swagger documentation.

The MapGroup method is used to define a group of related endpoints. In this case, the group is defined for the path "/ip" and all endpoints in the group will have this path as a prefix. For example, the MapGet method that follows it defines an endpoint at the path "/ip/{ip}" that returns information about the specified IP address. This endpoint is given the name "GetIp".

The remaining MapGet methods define similar endpoints for getting information about IP addresses. The third endpoint, at the path "/ip/info", gets the IP address of the requester and returns information about it. This endpoint is given the name "Get Server Ip Info".

Finally, the Run method starts the application and begins listening for requests.

```cs
static async System.Threading.Tasks.Task<string> GetIpAddressAsync()
{
    {
        try
        {
            using HttpClient client = new HttpClient();
            using HttpResponseMessage response = await client.GetAsync("https://jsonip.com");
            using Stream responseStream = await response.Content.ReadAsStreamAsync();
            using StreamReader reader = new StreamReader(responseStream);

            string json = await reader.ReadToEndAsync();
            // exception here for minimum api
            if (json == null || json == "")
            {
                throw new Exception("Invalid response");
            }
            JsonIpResponse jsonResponse = JsonSerializer.Deserialize<JsonIpResponse>(json);
            if (jsonResponse == null)
            {
                throw new Exception("Invalid response");
            }
            return jsonResponse.ip;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw e;
        }
    }
}

static async System.Threading.Tasks.Task<IPResponse> GetIpInfoAsync(string ip)
{
    {
        try
        {
            using HttpClient client = new HttpClient();
            using HttpResponseMessage response = await client.GetAsync($"https://iplist.cc/api/{ip}");
            using Stream responseStream = await response.Content.ReadAsStreamAsync();
            using StreamReader reader = new StreamReader(responseStream);

            string json = await reader.ReadToEndAsync();
            // exception here for minimum api
            if (json == null || json == "")
            {
                throw new Exception("Invalid response");
            }
            IPResponse jsonResponse = JsonSerializer.Deserialize<IPResponse>(json);
            if (jsonResponse == null)
            {
                throw new Exception("Invalid response");
            }
            // send as json
            return jsonResponse;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw e;
        }
    }
}
```
These two methods, GetIpAddressAsync and GetIpInfoAsync, are used to retrieve information about IP addresses from external services.

The GetIpAddressAsync method uses the HttpClient class to send a GET request to the "https://jsonip.com" URL and returns the IP address contained in the response. The response is read from the stream as a string and then deserialized using the JsonSerializer.Deserialize method into an object of type JsonIpResponse. If the response is invalid or if an exception occurs during the request, an exception is thrown.

The GetIpInfoAsync method is similar, but it sends a GET request to the "https://iplist.cc/api/{ip}" URL, where {ip} is the IP address passed as an argument. The response is read from the stream as a string and then deserialized into an object of type IPResponse. If the response is invalid or if an exception occurs during the request, an exception is thrown.

Both methods use the async and await keywords to perform the requests asynchronously, allowing the application to continue processing other tasks while the requests are being made.


```cs
public class JsonIpResponse
{
    public string ip { get; set; }
}
public class IPResponse
{
    public string ip { get; set; }
    public string registry { get; set; }
    public string countrycode { get; set; }
    public string countryname { get; set; }
    public Asn asn { get; set; }
    public bool spam { get; set; }
    public bool tor { get; set; }
    public string city { get; set; }
    public string detail { get; set; }
    public string[] website { get; set; }
}

public class Asn
{
    public string code { get; set; }
    public string name { get; set; }
    public string route { get; set; }
    public string start { get; set; }
    public string end { get; set; }
    public string count { get; set; }
}
```

These three classes define the structure of the data that is returned by the GetIpAddressAsync and GetIpInfoAsync methods.

The JsonIpResponse class has a single property, ip, which represents the IP address.

The IPResponse class has several properties that represent various pieces of information about an IP address, such as its registry, country code, country name, and ASN (Autonomous System Number) details. It also has a property of type Asn, which represents the ASN information.

The Asn class has several properties that represent details about an ASN, such as its code, name, route, and start and end addresses.