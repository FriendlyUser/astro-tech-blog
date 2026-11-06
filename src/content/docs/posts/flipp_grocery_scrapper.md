---
title: Automated Data Extraction from Online Retail Flyers Using Python and Selenium
description: This article explores the `flipp_flyer_parser` Python script, an advanced web scraping tool for extracting promotional data from retail websites like Save-On-Foods, Walmart, and Superstore.
alt: Web Scraping Retail Flyers with Python
layout: '@/templates/BasePost.astro'
pubDate: Thursday, 15 Feburary 2023 13:00:00 GMT
tags: ["python", "web scraping", "selenium", "data extraction", "retail", "automation"]
imgAlt: 'Python Web Scraping Visualization'
imgSrc: "/imgs/2023/117117315.png"
---

# Web Scraping Retail Flipp Flyers

The `flipp_flyer_parser` Python script is a sophisticated web scraping tool, designed for extracting promotional flyer data from various retail websites. Authored by FriendlyUser, this script leverages Selenium, a powerful tool for browser automation, to navigate through web pages and extract relevant data. It focuses on three major Canadian retailers: Save-On-Foods, Walmart, and Superstore.

## Key Components and Libraries

- **Selenium WebDriver (`undetected_chromedriver`)**: Used for controlling a Chrome browser. This driver is essential for navigating through the web pages and interacting with web elements.
- **Date Parsing (`dateutil.parser`)**: Utilized for parsing date strings.
- **Regular Expressions (`re`)**: Employed for text pattern matching and data extraction from descriptions.
- **Image Processing (`PIL`)**: The Python Imaging Library (PIL) can be used for handling images, though its specific usage isn't clear from the provided script.
- **Argument Parsing (`argparse`)**: Facilitates command-line argument parsing, allowing users to specify the store type.

## Core Functionalities

### WebDriver Setup

- `make_driver()`: Creates a Chrome WebDriver instance with optional headless browsing.
- Specific setup functions for each store (`selenium_setup_saveon`, `selenium_setup_walmart`, `setup_superstore`): These functions initialize the WebDriver and navigate to the respective store’s flyer page.

### Data Extraction

- `parse_flipp_aside(driver, cfg)`: Extracts detailed information from a specific part of the webpage (flipp aside iframe). It retrieves various data like start and end dates, product descriptions, sizes, quantities, and more.
- `scrap_flyer(driver, cfg)`: Orchestrates the scraping process. It involves navigating through iframes, handling cookies, extracting HTML content, and iterating over flyer images to gather product data.

### Utility Functions

- `swap_to_iframe(driver, iframe_class)`: Aids in switching between different iframes within a webpage.
- StoreType `Enum`: Enumerates store types (SAVEON, WALMART, SUPERSTORE) for easier management.

### Main Function

- The script uses a command-line interface where the user can specify the store type.
- Based on the store type, it calls the corresponding function to set up Selenium and scrape the flyer data.

## Technical Highlights

### Use of Selenium

- The script showcases an advanced use of Selenium for web scraping, handling dynamic content loaded through JavaScript and embedded iframes, which are common challenges in modern web scraping tasks.

### Regular Expressions

- Extensive use of regex for parsing complex text patterns in product descriptions, which is crucial for accurate data extraction in web scraping projects.

### Error Handling

- The script includes basic error handling, particularly in `parse_flipp_aside` and `scrap_flyer` functions, to manage exceptions like `NoSuchElementException`.

## Expanded Technical Analysis of `flipp_flyer_parser`

We will delve into the more complex parts of the `flipp_flyer_parser` script, breaking down key functions and processes step by step.

### 1. WebDriver Setup

The script begins with setting up the Selenium WebDriver, crucial for browser automation.

#### `make_driver` Function

- Initializes a Chrome WebDriver using `undetected_chromedriver`.
- The function returns a WebDriver object with `headless=False` (meaning the browser UI is visible during scraping) and `use_subprocess=False`.

### 2. Store-Specific Setup Functions

These functions are tailored for each retail website, navigating to the respective flyer pages.

#### `selenium_setup_walmart`, `selenium_setup_saveon`, and `setup_superstore` Functions

- Each function creates a WebDriver instance via `make_driver()`.
- Navigates to the specific URL of the store's flyer page.
- For `setup_superstore`, additional cookie manipulation is performed to mimic a user’s browser settings.

### 3. Data Extraction

#### `parse_flipp_aside` Function

This function extracts detailed information from a part of the webpage, typically an iframe.

**Switching to the Relevant Iframe**:

  Calls `swap_to_iframe` with the class name of the iframe to be accessed.

**Extracting Information**:

Finds elements by tag or class name (e.g., validity dates, descriptions).
Regular expressions are used to parse and extract data like sizes, quantities, and product types from the product description.
Exception handling is used to manage elements that might not be present.

#### `scrap_flyer` Function

This function orchestrates the overall scraping process.

**Initial Setup**:

Waits for the main element of the page to become visible.
Handles exceptions by saving the page source to a file for debugging.

**Handling Cookies and HTML Content**:
Retrieves and saves cookies to a JSON file.
Saves the HTML content of the page for further processing.

**Navigating Through Flyer Images**:
Iterates over elements containing flyer images.
For each image, iterates over associated buttons that likely contain product information.
Executes a script to ensure the visibility of elements and interacts with them (clicking buttons).

**Extracting Product Data**:
Each button's label is parsed for product data.
Regular expressions are used to extract pricing information.
Calls `parse_flipp_aside` to extract additional details from the aside section.
Aggregates all extracted data into a dictionary and appends it to a list.

**Final Steps**:
The data list is saved to a JSON file.
Handles a set maximum number of items to prevent excessive scraping.

### 4. Main Function

The script uses an argument parser to allow the user to specify the store type via the command line.

Based on the store type provided, the corresponding scraping function is called.
This modular approach allows for easy expansion or modification for different stores.

### Conclusion

The `flipp_flyer_parser` script is a comprehensive example of advanced web scraping using Python and Selenium. It demonstrates handling dynamic web content, navigating through complex webpage structures, and extracting structured data from unstructured HTML. The use of regular expressions and strategic error handling are notable for their efficiency in data parsing and resilience against web scraping challenges. This script serves as an excellent template for similar web scraping tasks, particularly those involving dynamic and interactive web content.
