---
tags: ['linq', '.net']
title: Introduction to LINQ
description: LINQ is a powerful tool for querying data. In this post, we'll look at how to use LINQ to query data in C#.
pubDate: Mon, 13 September 2023
imgSrc: '/imgs/2023/359551664.png'
---
LINQ (Language Integrated Query) is a set of language extensions for the Microsoft .NET Framework that allows developers to perform queries on data sources using a syntax similar to SQL. It supports querying data in a variety of formats, including arrays, lists, databases, and XML documents. LINQ was introduced in the .NET Framework version 3.5 and is available in C# and Visual Basic. LINQ makes it easier to write data access code and provides a consistent way to query and manipulate data, regardless of its source.


LINQ queries are composed of a series of operators that can be chained together to filter, transform, and shape data.

* The "From" operator specifies the data source for the query. This can be an array, list, or any other collection that implements the IEnumerable interface.
* The "Where" operator is used to filter the data based on a certain condition. It returns only the elements that match the specified condition.
* The "Select" operator is used to project the data into a new form. It allows you to select only the properties or fields that you are interested in and create a new collection of the results.
* The "OrderBy" operator is used to sort the data based on a certain property or field. It returns the data in ascending order by default, but can also be used with the "OrderByDescending" operator to sort in descending order.

Here is an example of a LINQ query that uses these operators:


```csharp
`var query = from student in students
 where student.Age > 18
 orderby student.LastName, student.FirstName
 select new {student.FirstName, student.LastName};`
```
This query selects all students who are older than 18, sorts them by last name, first name, and select the firstname and lastname of the students.


LINQ can be used to query data from a List by using the "From" operator to specify the data source and chaining other operators together to filter, transform, and shape the data.

Here is an example of how to use LINQ to query data from a List of integers:


```csharp
`List<int> numbers = new List<int> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

// Use LINQ to query the data
var evenNumbers = from number in numbers
 where number % 2 == 0
 select number;`
```
In this example, the "From" operator specifies that the data source is the "numbers" List, the "Where" operator filters the data to only include even numbers and "Select" operator selects the even numbers.

You can also use the method syntax


```csharp
`var evenNumbers = numbers.Where(n => n % 2 == 0).Select(n => n);`
```
This query will give you the same result as the previous one, but this is the method syntax of LINQ.

You can also use other operators like OrderBy, OrderByDescending, Take, Skip, etc. to shape your data and make it more readable.


```csharp
`var evenNumbers = numbers.Where(n => n % 2 == 0)
 .OrderBy(n => n)
 .Take(5);`
```
This query will select the first 5 even numbers from the list and order them by ascending order.

It is important to note that LINQ queries do not execute until they are enumerated, such as by using a foreach loop to iterate through the results.


LINQ can be used to query data from a Dictionary by using the "From" operator to specify the data source and chaining other operators together to filter, transform, and shape the data.

Here is an example of how to use LINQ to query data from a Dictionary<string, string>:


```csharp
`Dictionary<string, string> colors = new Dictionary<string, string>
{
 {"red", "#ff0000"},
 {"green", "#00ff00"},
 {"blue", "#0000ff"}
};

// Use LINQ to query the data
var hexColors = from color in colors
 where color.Key == "red" || color.Key == "green"
 select color.Value;`
```
In this example, the "From" operator specifies that the data source is the "colors" Dictionary, the "Where" operator filters the data to only include the colors which are red and green, and "Select" operator selects the hex value of the colors.

You can also use the method syntax


```csharp
`var hexColors = colors.Where(c => c.Key == "red" || c.Key == "green")
 .Select(c => c.Value);`
```
This query will give you the same result as the previous one, but this is the method syntax of LINQ.

You can also use other operators like OrderBy, OrderByDescending, Take, Skip, etc. to shape your data and make it more readable.

It is important to note that when working with a Dictionary, the order of elements is not guaranteed, so if you need to order the elements you need to use the `ToList()` or `ToArray()` method before applying `OrderBy` or `OrderByDescending`


```csharp
`var hexColors = colors.Where(c => c.Key == "red" || c.Key == "green")
 .ToList()
 .OrderBy(c => c.Key)
 .Select(c => c.Value);`
```
This query will select the hex values of red and green colors and order them by their key.

It is important to note that LINQ queries do not execute until they are enumerated, such as by using a foreach loop to iterate through the results.


LINQ can be used to query data from a SQL database by using the LINQ to SQL or the Entity Framework, which are both built on top of LINQ and provide a way to interact with the database using LINQ syntax.

To use LINQ to SQL, you need to create a mapping between the relational database and the object-oriented model. This is done by creating a DataContext class that defines the tables, columns, and relationships in the database. Once the mapping is done you can use LINQ syntax to query the data.

Here is an example of how to use LINQ to SQL to query data from a SQL database:


```csharp
`using (var db = new DataContext())
{
 var query = from customer in db.Customers
 where customer.Country == "USA"
 select customer;

 foreach (var customer in query)
 {
 Console.WriteLine(customer.FirstName + " " + customer.LastName);
 }
}`
```
In this example, the "From" operator specifies the data source is the Customers table, the "Where" operator filters the data to only include customers from the USA, and "Select" operator selects the customer.

You can also use the method syntax


```csharp
`using (var db = new DataContext())
{
 var query = db.Customers.Where(c => c.Country == "USA")
 .Select(c => new {c.FirstName, c.LastName});

 foreach (var customer in query)
 {
 Console.WriteLine(customer.FirstName + " " + customer.LastName);
 }
}`
```
This query will give you the same result as the previous one, but this is the method syntax of LINQ.

You can also use other operators like OrderBy, OrderByDescending, Take, Skip, etc. to shape your data and make it more readable.

With entities Framework it's similar, but you'll use the "DbContext" class instead of the "DataContext" and you'll need to create a model of the database using EF Core or EF 6.

It is important to note that LINQ queries against a SQL database are executed when the query is enumerated, such as by using a foreach loop to iterate through the results, or by calling the `ToList()`, `ToArray()` or `Count()` methods.

Also remember that it is a good practice to use the `using` statement to dispose of the DataContext/DbContext and the opened connection to avoid any memory leaks.


LINQ provides a number of advanced operators that can be used to perform more complex queries.

* The "GroupBy" operator is used to group elements in a collection based on a certain key. It returns a collection of groups, where each group contains a key and a collection of elements that share that key.


```csharp
`var query = from student in students
 group student by student.Department into g
 select new {Department = g.Key, Students = g};`
```
This query groups the students by their department, and returns a collection of groups where each group contains the department name and a collection of students that belong to that department.

* The "Join" operator is used to join two collections based on a common key. It returns a collection of elements that have matching keys in both collections.


```csharp
`var query = from student in students
 join department in departments on student.Department equals department.DepartmentName
 select new {student.FirstName, student.LastName, department.DepartmentName};`
```
This query joins the students and departments collections by the department name, and returns a collection of elements that contains the student's first name, last name, and department name.

* The "Aggregate" operator is used to apply a function to the elements of a collection and return a single value. It can be used to perform calculations such as sum, average, or count.


```csharp
`var query = students.Where(s => s.Department == "Computer Science")
 .Select(s => s.Grade)
 .Average();`
```
This query filters the students collection to only include students from the Computer Science department, selects their grades, and calculates the average grade.

It is important to note that these operators can be combined with other LINQ operators, like "Where", "Select", "OrderBy" etc. to create more complex and powerful queries. Also, these operators are executed after the query is enumerated, such as by using a foreach loop to iterate through the results, or by calling the `ToList()`, `ToArray()` or `Count()` methods.


