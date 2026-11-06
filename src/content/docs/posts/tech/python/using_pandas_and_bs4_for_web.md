---
tags: ['bs4', 'python', 'pandas']
title: Using pandas and bs4 for web scrapping.
description: Explaining how to use pandas and bs4 for web scrapping.
pubDate: Fri, 14 August 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3325476992.png
---

Pandas is an open-source Python library used for data manipulation and analysis. It is a powerful tool for handling structured data, such as spreadsheets and SQL tables. One of the most useful features of pandas is its ability to read and write data from various file formats, including CSV, Excel, and SQL databases.

Pandas can also be used for web scraping by reading data from HTML tables on web pages. The library provides a method called `read_html()` that can parse HTML tables and return a list of data frames. Data frames are two-dimensional tables with labeled rows and columns, similar to spreadsheets.

Here's an example code snippet that uses pandas to scrape a table from a web page:


```python
import pandas as pd

# URL of the web page containing the table
url = 'https://www.example.com/table.html'

# Read the HTML table into a list of data frames
dfs = pd.read_html(url)

# Extract the first data frame (assuming only one table on the page)
df = dfs[0]

# Print the first 5 rows of the data frame
print(df.head())
```
In this code snippet, we first import the pandas library using the `import` statement. We then specify the URL of the web page containing the table we want to scrape. We use the `pd.read_html()` method to read the HTML table into a list of data frames. Since `read_html()` can potentially return multiple data frames (if there are multiple tables on the page), we extract the first data frame using the index `[0]`. Finally, we print the first 5 rows of the data frame using the `head()` method.

Note that `read_html()` can handle some simple HTML tables, but may not work with more complex tables or tables that are embedded within other elements on the page. In such cases, we may need to use other web scraping techniques or libraries.

Overall, pandas is a powerful tool for web scraping and data analysis, and can save us a lot of time and effort when working with structured data on the web.


Beautiful Soup (bs4) is a Python library used for web scraping. It allows us to parse HTML and XML documents and extract information from them. One common use case for bs4 is to scrape data from tables on web pages.

To extract the data from a table using bs4, we first need to obtain the HTML source code of the web page containing the table. We can do this using the `requests` library, which allows us to make HTTP requests to web pages and retrieve their HTML content. Here's an example code snippet that shows how to get the HTML source code of a web page:


```python
import requests

# URL of the web page we want to scrape
url = 'https://www.example.com/table.html'

# Make a GET request to the URL and get the HTML content
response = requests.get(url)
html_content = response.content

# Print the HTML content
print(html_content)
```
In this code snippet, we first import the `requests` library using the `import` statement. We then specify the URL of the web page we want to scrape. We use the `requests.get()` method to make a GET request to the URL and retrieve the HTML content. We store the content in a variable called `html_content` and print it to the console.

Once we have the HTML source code of the web page, we can use bs4 to extract the table data. We start by creating a BeautifulSoup object and passing in the HTML content. We can then use the `find()` or `find_all()` methods to locate the table element(s) and extract their data. Here's an example code snippet that shows how to extract the data from a table using bs4:


```python
from bs4 import BeautifulSoup

# Create a BeautifulSoup object and pass in the HTML content
soup = BeautifulSoup(html_content, 'html.parser')

# Find the first table element on the page
table = soup.find('table')

# Loop through the rows of the table and extract the data
for row in table.find_all('tr'):
 # Extract the data from each cell in the row
 cells = row.find_all('td')
 data = [cell.text.strip() for cell in cells]
 
 # Print the data for this row
 print(data)
```
In this code snippet, we first import the `BeautifulSoup` class from the `bs4` library. We create a `soup` object by passing in the HTML content and specifying the parser to use (in this case, the built-in `html.parser`).

We then use the `soup.find()` method to find the first `table` element on the page. We can use the `find_all()` method to find all table elements on the page.

Next, we loop through the rows of the table using the `find_all('tr')` method. For each row, we extract the data from each cell using the `find_all('td')` method, which finds all `td` elements in the row. We then use a list comprehension to extract the text content of each cell and strip any whitespace using the `text.strip()` method.

Finally, we print the data for each row to the console. Note that this code snippet assumes that the table contains only text data. If the table contains other types of elements, such as links or images, we may need to modify the code to handle those cases.

Overall, bs4 is a powerful tool for web scraping, and can save us a lot of time and effort when working with HTML documents.


Pandas is a popular Python library for data analysis, manipulation, and cleaning. It is often used in data science projects, including web scraping, to process and analyze data in a tabular format.

To parse a table using pandas, we first need to obtain the HTML source code of the web page containing the table. We can do this using the `requests` library, as shown in the previous example. Once we have the HTML source code, we can use the `read_html()` method provided by pandas to parse the table data. Here's an example code snippet that shows how to extract the data from a table using pandas:


```python
import pandas as pd

# URL of the web page we want to scrape
url = 'https://www.example.com/table.html'

# Use pandas to read the table data from the URL
tables = pd.read_html(url)

# Print the first table
print(tables[0])
```
In this code snippet, we first import the `pandas` library using the `import` statement. We then specify the URL of the web page we want to scrape. We use the `pd.read_html()` method to read the table data from the URL and store the result in a variable called `tables`. This method returns a list of DataFrame objects, one for each table on the page.

In this example, we assume that the page contains only one table, so we print the first table using `print(tables[0])`. If the page contains multiple tables, we can print each table by looping through the list of DataFrame objects.

Pandas also provides several methods for manipulating and cleaning the data in the DataFrame objects. For example, we can use the `drop()` method to remove columns or rows with missing data, the `fillna()` method to fill in missing data with a default value, or the `merge()` method to combine multiple DataFrame objects into a single object.

Overall, pandas is a powerful tool for working with tabular data and can simplify the process of extracting and processing data from web pages.


Once we have parsed the table using pandas, we can easily output it to a CSV (comma-separated values) file using the `to_csv()` method provided by pandas. Here's an example code snippet that shows how to output the table to a CSV file:


```python
import pandas as pd

# URL of the web page we want to scrape
url = 'https://www.example.com/table.html'

# Use pandas to read the table data from the URL
tables = pd.read_html(url)

# Get the first table from the list
df = tables[0]

# Output the table to a CSV file
df.to_csv('table.csv', index=False)
```
In this code snippet, we first import the `pandas` library using the `import` statement. We then specify the URL of the web page we want to scrape and use `pd.read_html()` to read the table data from the URL and store it in the `tables` variable.

Next, we get the first table from the `tables` list and store it in a variable called `df`. We then use the `to_csv()` method to output the table to a CSV file called `table.csv`. The `index=False` parameter tells pandas not to include the row index numbers in the output file.

Once the code is executed, a CSV file called `table.csv` will be created in the current working directory with the data from the table. We can open this file in any spreadsheet application, such as Excel or Google Sheets, to view and manipulate the data further.

Overall, pandas makes it easy to output table data to a variety of file formats, including CSV, Excel, and SQL databases. This flexibility makes it a popular choice for data scientists and analysts who need to work with data from a variety of sources.


Pandas is a powerful library that provides many advanced features for cleaning and manipulating data. In this section, we'll explore some of these features that can be used to clean the data extracted from a website.

1. Removing Duplicates:
Sometimes a web page might have duplicate rows in its table, which can cause problems in our data analysis. Pandas provides a `drop_duplicates()` method to remove duplicate rows from a DataFrame. Here's an example code snippet:


```python
import pandas as pd

# URL of the web page we want to scrape
url = 'https://www.example.com/table.html'

# Use pandas to read the table data from the URL
tables = pd.read_html(url)

# Get the first table from the list
df = tables[0]

# Drop duplicate rows
df.drop_duplicates(inplace=True)
```
In this example, we first parse the table using pandas and get the first table from the list of DataFrame objects. We then use the `drop_duplicates()` method to remove any duplicate rows in the table. The `inplace=True` parameter tells pandas to modify the DataFrame in place rather than returning a new DataFrame object.

2. Renaming Columns:
The column names in a table might not always be in a format that's suitable for our data analysis. Pandas provides a `rename()` method to change the column names of a DataFrame. Here's an example code snippet:


```python
import pandas as pd

# URL of the web page we want to scrape
url = 'https://www.example.com/table.html'

# Use pandas to read the table data from the URL
tables = pd.read_html(url)

# Get the first table from the list
df = tables[0]

# Rename the columns
df = df.rename(columns={'old\_column\_name': 'new\_column\_name'})
```
In this example, we first parse the table using pandas and get the first table from the list of DataFrame objects. We then use the `rename()` method to change the name of a specific column in the DataFrame. The `{'old_column_name': 'new_column_name'}` parameter tells pandas to replace the old column name with the new column name.

3. Dealing with Missing Values:
Web pages might have missing data in their tables, which can cause problems in our data analysis. Pandas provides several methods for dealing with missing values, including the `dropna()` and `fillna()` methods.

The `dropna()` method removes any rows or columns with missing values from a DataFrame, while the `fillna()` method fills in the missing values with a default value or a value calculated from the other data in the DataFrame.

Here's an example code snippet:


```python
import pandas as pd

# URL of the web page we want to scrape
url = 'https://www.example.com/table.html'

# Use pandas to read the table data from the URL
tables = pd.read_html(url)

# Get the first table from the list
df = tables[0]

# Remove rows with missing data
df = df.dropna()

# Fill in missing data with a default value
df = df.fillna(0)
```
In this example, we first parse the table using pandas and get the first table from the list of DataFrame objects. We then use the `dropna()` method to remove any rows with missing data from the DataFrame. We then use the `fillna()` method to fill in any remaining missing data with the value 0.

Overall, pandas provides a wide range of features for cleaning and manipulating data, which makes it a popular choice for data scientists and analysts. By using these advanced features, we can transform raw data extracted from a website into a format that's suitable for our data analysis.


