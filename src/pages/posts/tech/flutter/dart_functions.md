---
tags: ['dart', 'appwrite']
title: Getting started with dart and appwrite
description: How to use appwrite to deploy dart functions
pubDate: Fri, 29 November 2024
layout: "@/templates/BasePost.astro"
---
What is appwrite?
Appwrite is an open-source backend as a service (BaaS) platform that provides a set of easy-to-use APIs and SDKs for building web and mobile applications. It offers features such as authentication, database management, file storage, and serverless functions, all of which can be used to build modern web and mobile apps faster and more efficiently. Appwrite can be self-hosted or used as a cloud service, and it provides a simple and intuitive user interface for managing your app's backend.


Why is function as a service useful?
Function as a Service (FaaS) is a type of cloud computing service that allows developers to write and deploy code without having to manage the underlying infrastructure. With FaaS, developers can focus on writing business logic and leave the operational details, such as scaling and provisioning of resources, to the cloud provider.

FaaS is useful because it provides a number of benefits:

1. Cost efficiency: FaaS services charge based on the actual usage of the function, rather than a fixed cost for a server or VM. This makes it more cost-efficient for businesses that have unpredictable or infrequent usage.
2. Scalability: FaaS services automatically scale the underlying infrastructure to handle changes in usage. This means that businesses don't have to worry about overprovisioning or underprovisioning their infrastructure.
3. Reduced operational complexity: FaaS services handle the operational tasks, such as deployment, scaling, and monitoring. This reduces the complexity of managing infrastructure and frees up developers to focus on writing code.
4. Faster time to market: With FaaS, developers can write and deploy code faster, as they don't have to worry about infrastructure setup and management. This can lead to a faster time to market for new products or features.

Overall, FaaS provides a convenient way for businesses to run their code without the need for extensive infrastructure management, allowing them to focus on their core competencies.


Implementing a basic encode function in dart
Sure! Here's an example of a basic encode function in Dart:


```dart
String encode(String input) {
 var bytes = utf8.encode(input);
 var base64 = base64Encode(bytes);
 return base64;
}
```
In this example, the function takes a string input and converts it to a byte array using the `utf8.encode()` function. Then it uses the `base64Encode()` function to convert the byte array to a base64-encoded string. Finally, it returns the base64-encoded string.

Note that this is a very basic implementation of an encode function and may not be suitable for all use cases. There are many different encoding schemes that can be used depending on the requirements of your application.


verify https url in dart
To verify if a URL is a valid HTTPS URL in Dart, you can use the `Uri.parse` function to create a `Uri` object from the URL and then check if its `scheme` property is `"https"`. Here is an example:


```dart
bool isHttpsUrl(String url) {
 try {
 Uri uri = Uri.parse(url);
 return uri.scheme == "https";
 } catch (e) {
 return false;
 }
}
```
This function returns `true` if the URL is a valid HTTPS URL, and `false` otherwise. If the input string is not a valid URL or if it cannot be parsed, the function returns `false`.


email slicer in dart
Here's an example implementation of an email slicer function in Dart:


```dart
void main() {
 String email = "example.user@example.com";
 Map<String, String> result = sliceEmail(email);
 print(result); // Output: {username: example.user, domain: example.com}
}

Map<String, String> sliceEmail(String email) {
 List<String> parts = email.split('@');
 if (parts.length != 2) {
 throw FormatException("Invalid email format");
 }
 return {'username': parts[0], 'domain': parts[1]};
}
```
This implementation takes an email address as input, splits it into two parts - the username and the domain - and returns them as a map with the keys "username" and "domain". If the email address is not in a valid format (i.e. it does not contain exactly one "@" symbol), the function throws a FormatException.

Note that this is a very basic implementation and does not take into account more complex email address formats.


How can I use appwrite to deploy dart functions?
To deploy Dart functions using Appwrite, you can follow these steps:

1. Install the Appwrite Dart SDK by adding `dart_appwrite` as a dependency in your `pubspec.yaml` file and running `flutter pub get`.
2. Create an account and a project on the Appwrite console.
3. Create a new Dart function in your project on the Appwrite console.
4. In your Dart code, initialize the Appwrite client with your project's endpoint and API key. You can also set the self-signed option to `true` if you're using a self-signed SSL certificate:


```dart
final client = Client()
 .setEndpoint('https://[HOSTNAME_OR_IP]/v1') // Replace with your project's endpoint
 .setProject('[PROJECT_ID]') // Replace with your project ID
 .setKey('[API_KEY]') // Replace with your API key
 .setSelfSigned(status: true); // Set to true if using a self-signed SSL certificate
```
5. Write your Dart function using the `start` function, which takes in `req` and `res` parameters representing the HTTP request and response, respectively. For example:


```dart
Future<void> start(final req, final res) async {
 final name = req.variables['name'] ?? 'World';
 res.send('Hello, $name!');
}
```
6. Deploy your function by uploading your Dart code as a ZIP file to the Appwrite console or by using the Appwrite CLI. You can also deploy your function using the Appwrite API.
7. Test your function by triggering it from the Appwrite console or by sending an HTTP request to its endpoint. You should receive a response with the output of your function.


## References
- https://github.com/FriendlyUser/dart_fns/functions
