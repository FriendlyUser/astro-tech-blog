---
tags: ['python', 'indeed']
title: Reading indeed posts to scrap job listings (does not work anymore)
description: Scrapping indeed (2021) to get job listings.
pubDate: Mon, 25 October 2023
imgSrc: "/imgs/2023/2378351187.png"
---
It is important to verify that humans are visiting a website because:

1. Preventing spam and bots: Verifying that only human visitors are accessing the site can help prevent spam and bots from artificially inflating traffic or spreading malicious content.
2. Protecting user data: By ensuring that only human visitors access the site, sensitive user information can be better protected from automated scraping and cyberattacks.
3. Improving user experience: Verifying human visitors can help improve the user experience by ensuring that the site's content and functionality is optimized for real people and not bots.
4. Measuring website performance: Accurately measuring website performance and user engagement requires accurate data about the number and behavior of human visitors.

In conclusion, verifying human visitors to a website is important for improving the site's security, performance, and user experience.


Cloudflare Protection is a suite of security features offered by Cloudflare, a web performance and security company. It provides a comprehensive set of tools and services to help protect websites from a wide range of online threats, including:

In conclusion, Cloudflare Protection offers a comprehensive set of security features that help protect websites from a wide range of online threats, improving website performance and security.

Since indeed has added cloudflare protection these scripts no longer work and the project has been open sourced.

```python 
 import bs4
import pandas as pd
import math
from datetime import datetime
from scrapper.fetch_data import get_xml
from scrapper.util import largest_number
def get_num_jobs(url_indeed)-> int:
  indeed_data = get_xml(url_indeed)
  job_string  = indeed_data.find("div", {"id": "searchCount"})
  job_count_indeed = job_string.contents[0:3]
  job_number_str = ''
  for item in job_count_indeed:
    if type(item) is bs4.element.Tag:
      job_number_str += item.get_text()
  if job_number_str.split()[-1] == 'jobs':
    print('Found jobs at the end')
    num_total_indeed = largest_number(job_number_str)
  else:
    print('Expected to find job number')
    assert(False)
  # 
  total_jobs = float(num_total_indeed)
  return int(math.ceil(total_jobs / 10.0))

# TODO Get a config file
def get_jobs_data(url_indeed, num_pages, default_location='Victoria, BC'):
  BASE_URL_indeed = 'https://ca.indeed.com'
  # create an empty dataframe
  job_df_indeed = pd.DataFrame()
  for i in range(1, num_pages+1):
    # generate the URL
    url = ''.join([url_indeed, '&start=', str(i*10)])
    print(url)

    # get the HTML code from the URL
    soup = get_xml(url)
    # pick out all the "div" with "class="job-row"
    divs = soup.findAll("div")
    job_divs = [jp for jp in divs if not jp.get('class') is None
                    and 'row' in jp.get('class')]

    # loop for each div chunk
    for job in job_divs:
      try:
        # job id
        id = job.get('data-jk', None)
        # job link related to job id
        link = BASE_URL_indeed + '/rc/clk?jk=' + id
        # job title
        title = job.find('a', attrs={'data-tn-element': 'jobTitle'}).attrs['title']
        # job company
        company = job.find('span', {'class': 'company'})
        if company is not None:
          company = company.text.strip()
        else:
          print('Company is missing')
        # job location
        location = job.find('span', {'class': 'location'})
        if location is not None:
          location = location.text.strip()
        else:
          location = default_location
          print('Location is missing')
      except Exception as e:
        print(e)
        continue

      job_df_indeed = job_df_indeed.append({
        'job_title': title,
        'job_company': company,
        'job_location':location,
        'job_link':link},
      ignore_index=True)
  cols=['job_title','job_company','job_location','job_link']
  job_df_indeed = job_df_indeed[cols]
  # delete the duplicated jobs using job link
  job_df_indeed = job_df_indeed.drop_duplicates(['job_link'], keep='first')
  return job_df_indeed
 
 ```

This code is a Python script that performs web scraping to collect job postings from the job search website Indeed. It uses the BeautifulSoup library to parse the HTML code of the pages and extract information such as job title, company, location, and link for each job posting.

The code first retrieves the number of job postings on the website by parsing the HTML code of the search results page and extracting the number of jobs found. It then uses that information to determine the number of pages of search results to retrieve.

Next, the code loops through each page of search results, extracts the relevant information for each job posting, and adds it to a pandas DataFrame. Finally, it returns the DataFrame containing all the job information, removing any duplicate job postings based on the job link.


```python 
 import pandas as pd
import re
from scrapper.fetch_data import get_xml

# Get an analyzer class, espeically if I have all these hardcoded values
types = ['Full-Time', 'Full Time', 'Part-Time', 'Part Time', 'Contract', 'Contractor']
type_lower = [s.lower() for s in types] # lowercases
# map the type_lower to type
type_map = pd.DataFrame({'raw': types, 'lower':type_lower}) # create a dataframe
type_map['raw'] = ["Full-Time", "Full-Time", 'Part-Time', 'Part-Time', "Contract", 'Contract'] # modify the mapping
type_dic = list(type_map.set_index('lower').to_dict().values()).pop() # use the dataframe to create a dictionary
# print(type_dic)

##### Skills #####
skills = ['R', 'Shiny', 'RStudio', 'Markdown', 'Latex', 'SparkR', 'D3', 'D3.js',
            'Unix', 'Linux', 'MySQL', 'Microsoft SQL server', 'SQL',
            'Python', 'SPSS', 'SAS', 'C++', 'C', 'C#','Matlab','Java',
            'JavaScript', 'HTML', 'HTML5', 'CSS', 'CSS3','PHP', 'Excel', 'Tableau',
            'AWS', 'Amazon Web Services ','Google Cloud Platform', 'GCP',
            'Microsoft Azure', 'Azure', 'Hadoop', 'Pig', 'Spark', 'ZooKeeper',
            'MapReduce', 'Map Reduce','Shark', 'Hive','Oozie', 'Flume', 'HBase', 'Cassandra',
            'NoSQL', 'MongoDB', 'GIS', 'Haskell', 'Scala', 'Ruby','Perl',
            'Mahout', 'Stata','Solidity']
skills_lower = [s.lower() for s in skills]# lowercases
skills_map = pd.DataFrame({'raw':skills, 'lower':skills_lower})# create a dataframe
skills_dic = list(skills_map.set_index('lower').to_dict().values()).pop()# use the dataframe to create a dictionary
# print(skills_dic)

##### Education #####
edu = ['Bachelor', "Bachelor's", 'BS', 'B.S', 'B.S.', 'Master', "Master's", 'Masters', 'M.S.', 'M.S', 'MS',
        'PhD', 'Ph.D.', "PhD's", 'MBA']
edu_lower = [s.lower() for s in edu]# lowercases
edu_map = pd.DataFrame({'raw':edu, 'lower':edu_lower})# create a dataframe
edu_dic = list(edu_map.set_index('lower').to_dict().values()).pop()# use the dataframe to create a dictionary
# print(edu_dic)

##### Major #####
major = ['Computer Science', 'Statistics', 'Mathematics', 'Math','Physics',
            'Machine Learning','Economics','Software Engineering', 'Engineering',
            'Information System', 'Quantitative Finance', 'Artificial Intelligence',
            'Biostatistics', 'Bioinformatics', 'Quantitative']
major_lower = [s.lower() for s in major]# lowercases
major_map = pd.DataFrame({'raw':major, 'lower':major_lower})# create a dataframe
major_dic = list(major_map.set_index('lower').to_dict().values()).pop()# use the dataframe to create a dictionary

##### Key Words ######
# For AI and BCHAIN, put the keywords here, as I want to get into those areas
keywords = ['Blockchain','Hashgraph','Ethereum','Solidity','Truffle','Drizzle','Vyper','Smart Contract',
'Machine Learning','Deep Learning','Data Science','Big Data',
'Web Analytics', 'Regression', 'Classification', 'User Experience', 
            'Streaming Data', 'Real-Time', 'Real Time', 'Time Series']
keywords_lower = [s.lower() for s in keywords]# lowercases
keywords_map = pd.DataFrame({'raw':keywords, 'lower':keywords_lower})# create a dataframe
keywords_dic = list(keywords_map.set_index('lower').to_dict().values()).pop()# use the dataframe to create a dictionary

def process_type(indeed_string, data_list, data_dict)-> list:
  type_matches = []
  for typ in data_list:
    if any(x in typ for x in ['+', '#', '.']):
      typp = re.escape(typ) # make it possible to find out 'c++', 'c#', 'd3.js' without errors
    else:
      typp = typ
    result = re.search(r'(?:^|(?<=\s))' + typp + r'(?=\s|$)', indeed_string) # search the string in a string
    if result:
      type_matches.append(data_dict[typ])
  return type_matches

def process_jobs(job_df_indeed):
  ##############################################
  ##### For Loop for scraping each job URL #####
  ##############################################
  # empty list to store details for all the jobs
  list_type = []
  list_skill = []
  # list_text = []
  list_edu = []
  list_major = []
  list_keywords = []

  for i in range(len(job_df_indeed)):
    try:
      # get the HTML code from the URL
      job_url = job_df_indeed.iloc[i]['job_link']
      soup = get_xml(job_url)
      # drop the chunks of 'script','style','head','title','[document]'
      for elem in soup.findAll(['script','style','head','title','[document]']):
        elem.extract()
      # get the lowercases of the texts
      texts = soup.getText(separator=' ').lower()

      # cleaning the text data
      job_text = re.sub(r'[\n\r\t]', ' ', texts) # remove "\n", "\r", "\t"
      job_text = re.sub(r'\,', ' ', job_text) # remove ","
      job_text = re.sub('/', ' ', job_text) # remove "/"
      job_text = re.sub(r'\(', ' ', job_text) # remove "("
      job_text = re.sub(r'\)', ' ', job_text) # remove ")"
      job_text = re.sub(' +',' ',job_text) # remove more than one space
      job_text = re.sub(r'r\s&\sd', ' ', job_text) # avoid picking 'r & d'
      job_text = re.sub(r'r&d', ' ', job_text) # avoid picking 'r&d'
      job_text = re.sub('\.\s+', ' ', job_text) # remove "." at the end of sentences

      # Job types
      list_type.append(process_type(job_text, type_lower, type_dic))

      # Skills
      list_skill.append(process_type(job_text, skills_lower, skills_dic))

      # Education
      list_edu.append(process_type(job_text, edu_lower, edu_dic))

      # Major
      list_major.append(process_type(job_text, major_lower, major_dic))

      # Key Words
      list_keywords.append(process_type(job_text, keywords_lower, keywords_dic))

      # Stop Words removal text
      # words = string.split(' ')
      # job_text = set(words) - set(stop_words) # drop stop words
      # list_text.append(list(job_text))
    except Exception as e:
      print(e)
      list_type.append(['Forbidden'])
      list_skill.append(['Forbidden'])
      list_edu.append(['Forbidden'])
      list_major.append(['Forbidden'])
      list_keywords.append(['Forbidden'])

  job_df_indeed['job_type'] = list_type
  job_df_indeed['job_skills'] = list_skill
  job_df_indeed['job_edu'] = list_edu
  job_df_indeed['job_major'] = list_major
  job_df_indeed['job_keywords'] = list_keywords

  return job_df_indeed
 
 ```

This is code for a Python function that pre-processes and maps various values related to job positions and skills to a standardized form. It defines and maps the following:

* Job Types: ['Full-Time', 'Full Time', 'Part-Time', 'Part Time', 'Contract', 'Contractor']
* Skills: ['R', 'Shiny', 'RStudio', 'Markdown', 'Latex', 'SparkR', 'D3', 'D3.js',
'Unix', 'Linux', 'MySQL', 'Microsoft SQL server', 'SQL',
'Python', 'SPSS', 'SAS', 'C++', 'C', 'C#','Matlab','Java',
'JavaScript', 'HTML', 'HTML5', 'CSS', 'CSS3','PHP', 'Excel', 'Tableau',
'AWS', 'Amazon Web Services ','Google Cloud Platform', 'GCP',
'Microsoft Azure', 'Azure', 'Hadoop', 'Pig', 'Spark', 'ZooKeeper',
'MapReduce', 'Map Reduce','Shark', 'Hive','Oozie', 'Flume', 'HBase', 'Cassandra',
'NoSQL', 'MongoDB', 'GIS', 'Haskell', 'Scala', 'Ruby','Perl',
'Mahout', 'Stata','Solidity']
* Education: ['Bachelor', "Bachelor's", 'BS', 'B.S', 'B.S.', 'Master', "Master's", 'Masters', 'M.S.', 'M.S', 'MS',
'PhD', 'Ph.D.', "PhD's", 'MBA']
* Major: ['Computer Science', 'Statistics', 'Mathematics', 'Math','Physics',
'Machine Learning','Economics','Software Engineering', 'Engineering',
'Information System', 'Quantitative Finance', 'Artificial Intelligence',
'Biostatistics', 'Bioinformatics', 'Quantitative']
* Keywords: ['Blockchain','Hashgraph','Ethereum','Solidity','Truffle','Drizzle','Vyper','Smart Contract',
'Machine Learning','Deep Learning','Data Science','Big Data',
'Web Analytics', 'Regression', 'Classification', 'User Experience',
'Streaming Data', 'Real-Time', 'Real Time', 'Time Series']

The function "process\_type" takes three parameters as input:

* indeed\_string: a string that needs to be processed
* data\_list: list of values
* data\_dict: dictionary of mapped values, created from data\_list

The function uses regular expression (re) and looks for matches of the values in data\_list in the indeed\_string. If a match is found, it uses the corresponding mapping from data\_dict to return the standardized form of the matched value.

Overall, this code is a component of a larger system to process job data fetched from a website using the get\_xml function from the scrapper.fetch\_data module.


```python 
 import os
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import base64
from mailjet_rest import Client
from scrapper.util import get_config
from ast import literal_eval
# TODO move to another package later
def generate_attachments(jobs_df):
  list_type = jobs_df['job_type'].tolist()
  list_skill = jobs_df['job_skills'].tolist()
  list_edu = jobs_df['job_edu'].tolist()
  list_keywords = jobs_df['job_keywords'].tolist()
  # implement later
  unique_data_type = set(x for l in list_type for x in l)
  unique_data_skills = set(x for l in list_skill for x in l)
  unique_data_edu = set(x for l in list_edu for x in l)
  unique_data_keywords = set(x for l in list_keywords for x in l)

  skills_dict={}
  for words in list_skill:
      for word in words:
          if not word in skills_dict:
              skills_dict[word]=1
          else:
              skills_dict[word]+=1
  # Calculate the frequency of keywords using a dataframe, consider adding plot or other data, perhaps save a csv and load it using d3
  result = pd.DataFrame()
  result['Skill'] = skills_dict.keys()
  result['Count'] = skills_dict.values()
  result['Ranking'] = result['Count']/float(len(list_skill))

  # Make another function
  results_dict={}
  for words in list_type:
      for word in words:
          if not word in results_dict:
              results_dict[word]=1
          else:
              results_dict[word]+=1
  # Calculate the frequency of keywords using a dataframe, consider adding plot or other data, perhaps save a csv and load it using d3
  result_type = pd.DataFrame()
  result_type['Type'] = results_dict.keys()
  result_type['Count'] = results_dict.values()
  result_type.set_index('Type') 

  results_dict={}
  for words in list_keywords:
      for word in words:
          if not word in results_dict:
              results_dict[word]=1
          else:
              results_dict[word]+=1
  # Calculate the frequency of keywords using a dataframe, consider adding plot or other data, perhaps save a csv and load it using d3
  result_keywords = pd.DataFrame()
  result_keywords['Keywords'] = results_dict.keys()
  result_keywords['Count'] = results_dict.values()

  result_keywords_html = result_keywords.to_html()

  matplotlib.use('Agg')
  skill_rank_plotname = 'skill-ranking.png'
  pie_plotname = 'pie.png'
  attachments_objs = []
  try:
    fig = plt.figure() # Create matplotlib figure
    default_size = fig.get_size_inches()
    ax = fig.add_subplot(111) # Create matplotlib axes
    ax2 = ax.twinx() # Create another axes that shares the same x-axis as ax.

    width = 0.4
    result.plot(x='Skill', y='Count', kind='bar', table=False, yerr=None,ax=ax, width=width, position=1,legend=False)
    result.plot(x='Skill', y='Ranking', kind='bar',table=False, yerr=None,ax=ax2, width=width, position=0,legend=False)

    ax.set_ylabel('Count')
    ax2.set_ylabel('Ranking')
    fig.set_size_inches((default_size[0]*2, default_size[1]*2))
    fig.tight_layout()
    ### This should be 2 x 2 times bigger, one 2 for dpi and one 2 for default size
    plt.savefig(skill_rank_plotname, dpi = 200)
  except Exception as e:
    print(e)
    print('Failed to make image for skill_rank')

  # On gitlab if there is a space in the file name, it doesn't send properly
  try:
    result_type.plot.pie(y='Count', labels=result_type['Type'], autopct='%1.1f%%', figsize=(5, 5))
    plt.savefig(pie_plotname, dpi = 200)
  except:
    print('Failed to make pie chart for type')
  for index, plot_file in enumerate([pie_plotname, skill_rank_plotname]):
    print(index)
    with open(plot_file, "rb") as img_file:
      base64_image = base64.b64encode(img_file.read())
    attachments_objs.append(
      {
        "ContentType": "image/png",
        "Filename": f"{plot_file}",
        "ContentID": f"id{index}",
        "Base64Content": base64_image.decode('ascii')
      }
    )
  return attachments_objs

def send_mailjet_email(jobs_df, metadata):
  api_key = os.environ['MJ_APIKEY_PUBLIC']
  api_secret = os.environ['MJ_APIKEY_PRIVATE']
  mailjet = Client(auth=(api_key, api_secret), version='v3.1')
  cfg = get_config()
  get_attachments = generate_attachments(jobs_df)
  keywords_skills = """\
    <div>
      <h4>Graphs</h4>
        <img src="cid:id0" alt = "Plot not generated" style="width:100%"/>
        <img src="cid:id1" alt = "Plot not made" style="width:100%"/>
      <h5> Potential Jobs </h5>
      {jobsTable}
    </div>
  """.format(jobsTable=jobs_df.to_html())
  data = {
    'Messages': [
      {
        "From": {
          "Email": cfg['email']['from'],
          "Name": "Indeed Scrapper"
        },
        "To": [
          {
            "Email": cfg['email']['to'],
            "Name": "Reciever Email"
          }
        ],
        "Subject": "Job Report",
        "HTMLPart": keywords_skills,
        "InlinedAttachments": get_attachments
      }
    ]
  }
  result = mailjet.send.create(data=data)
  print(result.status_code)
  print(result.json())
 
 ```

This is a function to generate data visualization and email attachments. Given a dataframe of job information, the function first extracts information of job types, skills, education, and keywords into separate lists and computes the frequency of each item.

For job skills, the function uses a dictionary to store the count of each skill, converts the dictionary into a pandas dataframe, and adds a new column for the ranking of each skill. It then generates a bar plot with two y-axes showing the count and ranking of each skill and saves it as an image.

For job types, the function computes the frequency of each type and converts it into a pandas dataframe. It then generates a pie chart from the dataframe and saves it as an image.

Finally, the function converts the frequency of keywords into a pandas dataframe and converts it into HTML. It also opens the two saved images and converts them into email attachments.


To avoid cloudflare blocking the requests, you can use selenium, but you may need a workaround to bypass the captcha / human verification.

To scrape a site using selenium and python, you need to perform the following steps:

1. Install selenium: You can install selenium by running `pip install selenium` in your terminal or command prompt.
2. Download the web driver: Selenium requires a web driver to interact with the browser. You can download the web driver for the browser of your choice from the official Selenium website.
3. Import selenium in your python script: Add the following code to import selenium in your python script: `from selenium import webdriver`.
4. Initialize the web driver: In your script, initialize the web driver by adding the following code:


```python
makefile`browser = webdriver.Firefox() # for firefox browser
# or
browser = webdriver.Chrome() # for chrome browser
```
5. Navigate to the website: Use the following code to navigate to the website you want to scrape: `browser.get("https://www.example.com")`. Replace "<https://www.example.com>" with the URL of the website you want to scrape.
6. Find elements: To find elements on the website, you can use various methods provided by the selenium library such as `find_element_by_id`, `find_element_by_name`, `find_element_by_class_name`, `find_element_by_xpath`, etc.
7. Extract information: Once you have found the element, you can extract the information from it. For example, to extract text from a tag, you can use the following code: `element.text`.
8. Close the browser: Finally, close the browser using the following code: `browser.quit()`.

Here's a basic example of how to scrape a site using selenium and python:


```python
scss`from selenium import webdriver

browser = webdriver.Firefox()
browser.get("https://www.example.com")

element = browser.find\_element\_by\_xpath("//h1")
print(element.text)

browser.quit()
```
This code will open a firefox browser, navigate to the example.com website, find the first `<h1>` tag on the page, and print its text.


