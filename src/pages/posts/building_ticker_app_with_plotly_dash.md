---
title: building ticker app with plotly dash
description: Building stock ticker app with plotly dash
alt: Stock Ticker app
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'
pubDate: Wed, 15 Dec 2019 13:00:00 GMT
---

## Part I

Plotly Dash has been out for years with many easy to use examples available at the dash website. I feel the existing stock ticker app is inadequately documented, using a legacy yahoo finance and a legacy version of the dash (pre 1.0.0).

In this tutorial we will cover how to make the UI components for a basic stock app using dash.

Requirements:
* Python 3.6
* Dash
To get started run pip install dash, this will install the dash framework and helper libraries.
Adding a basic function for running the app can be used by `app.run_server(debug=True)`.

The next step is to modify `app.layout` to have render built in UI components in dash.

```python
app.layout = html.Div(
  html.H2('Dates'),
  dcc.DatePickerRange(
      id='ticker-range',
      display_format='MMM Do, YY',
      # updatemode='bothdates',
      initial_visible_month=date.today(),
      end_date=date.today()
  ),
  html.H2('Interval'),
  dcc.Dropdown(
    id='ticker-interval',
    # 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    options=[
      {'label': '1 minute',   'value': '1m'},
      {'label': '2 minutes',  'value': '2m'},
      {'label': '5 minutes',  'value': '5m'},
      {'label': '15 minutes', 'value': '15m'},
      {'label': '30 minutes', 'value': '30m'},
      {'label': '60 minutes', 'value': '60m'},
      {'label': '90 minutes', 'value': '90m'},
      {'label': '1 hour',     'value': '1h'},
      {'label': '1 day',      'value': '1d'},
      {'label': '5 days',     'value': '5d'},
      {'label': '1 week',     'value': '1wk'},
      {'label': '1 month',    'value': '1mo'},
      {'label': '3 months',   'value': '3mo'},
    ],
    value='15m'
  ),
  html.H2('Ticker'),
  dcc.Input(
    id="ticker-search",
    type="search",
    debounce=True,
    placeholder="search for stock",
    bs_size="lg",
    className="mb-3"
  )
)
```

All of these dash components have excellent documentation available on the dash docs website (which is a dash app fyi). For the date picker it only makes sense to allow dates up to today (cannot render future stock data, if we could I would be rich). Additionally, the dropdown values are set to map to the yfinance input values.

If you run your app using debug mode with python app.py you should see the following.

The beauty of dash is that it makes it easy to make data science applications and right now the application is a little plain, lets display some text when the user updates the various input fields.

```python
import dash
import dash_html_components as html
import dash_core_components as dcc
from datetime import datetime as dt, date

app = dash.Dash(__name__)
server = app.server

app.layout = html.Div(children=[
  html.H2('Dates'),
  dcc.DatePickerRange(
      id='ticker-range',
      display_format='MMM Do, YY',
      # updatemode='bothdates',
      initial_visible_month=date.today(),
      end_date=date.today()
  ),
  html.H2('Interval'),
  dcc.Dropdown(
    id='ticker-interval',
    # 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    options=[
      {'label': '1 minute',   'value': '1m'},
      {'label': '2 minutes',  'value': '2m'},
      {'label': '5 minutes',  'value': '5m'},
      {'label': '15 minutes', 'value': '15m'},
      {'label': '30 minutes', 'value': '30m'},
      {'label': '60 minutes', 'value': '60m'},
      {'label': '90 minutes', 'value': '90m'},
      {'label': '1 hour',     'value': '1h'},
      {'label': '1 day',      'value': '1d'},
      {'label': '5 days',     'value': '5d'},
      {'label': '1 week',     'value': '1wk'},
      {'label': '1 month',    'value': '1mo'},
      {'label': '3 months',   'value': '3mo'},
    ],
    value='15m'
  ),
  html.H2('Ticker'),
  dcc.Input(
    id="ticker-search",
    type="search",
    debounce=True,
    placeholder="search for stock",
    className="mb-3"
  ),
  html.Div(id="ticker-out"),
  html.Div(id='output-container-date-picker-range')
])

@app.callback(
    dash.dependencies.Output("ticker-out", "children"),
    [dash.dependencies.Input("ticker-search", "value")],
)
def ticker_render(ticker):
  return "Ticker: {}".format(ticker)

@app.callback(
  dash.dependencies.Output('output-container-date-picker-range', 'children'),
  [dash.dependencies.Input('ticker-range', 'start_date'),
    dash.dependencies.Input('ticker-range', 'end_date')
  ])
def update_output(start_date, end_date):
  string_prefix = 'You have selected: '
  if start_date is not None:
    start_date = dt.strptime(start_date.split(' ')[0], '%Y-%m-%d')
    start_date_string = start_date.strftime('%B %d, %Y')
    string_prefix = string_prefix + 'Start Date: ' + start_date_string + ' | '
  if end_date is not None:
    end_date = dt.strptime(end_date.split(' ')[0], '%Y-%m-%d')
    end_date_string = end_date.strftime('%B %d, %Y')
    string_prefix = string_prefix + 'End Date: ' + end_date_string
  if len(string_prefix) == len('You have selected: '):
    return 'Select a date to see it displayed here'
  else:
    return string_prefix

if __name__ == '__main__':
  app.run_server(debug=True)
```

For the most part the added text callbacks is pretty self-explanation, when the text input field is updated, output the new text.

The date picker callback code is a bit more involved, checking for truthy values for start date and end date respectively.

## Part II

From the Previous Article we covered how to make basic dash UI and some callbacks. Importing the yfinance library makes it easy to grab data from yahoo finance, however the format of the dates is datetime64 instead of datetime which will cause the xaxis malformed (think exponentials).

The full code is available on [github](https://github.com/FriendlyUser/dash-stock-ticker/tree/Part-2).

```python
import yfinance as yf
# Add another dropdown to get the values
@app.callback(
  dash.dependencies.Output('ticker-graph',    'children'),
  [dash.dependencies.Input('ticker-range',    'start_date'),
    dash.dependencies.Input('ticker-range',    'end_date'),
    dash.dependencies.Input('ticker-search',    'value'),
    dash.dependencies.Input('ticker-interval', 'value')
])
# Think about only doing on deselect
def update_ticker_chart(start_date, end_date, ticker, interval):
  if start_date is None or end_date is None:
    return 'Select a Start Date and End Date'
  if ticker is None:
    # do a better map and append string when things are missing kinda like admin app
    return 'Enter a ticker'
  try:
    tickerVal = yf.Ticker(ticker)
  except ValueError:
    return 'Ticker does not exist'
  except Exception:
    return 'Failed to get ticker'
  # Array of dicts in plotly format
  hist = tickerVal.history(start=start_date, end=end_date, interval=interval)
  tickerData = []
  if hist.empty == True:
    raise ValueError('Empty Data Try Changing the period and range')
  # Need to map datetime64 to datetime 
  # https://community.plot.ly/t/datetime-axis-of-graph-element-does-not-show-the-correct-values/13537
  tickerData.append(dict(
    x=hist.index.to_pydatetime(),
    y=hist["Open"],
    name='{} Open'.format(ticker))
  )
  tickerData.append(dict(
    x=hist.index.to_pydatetime(),
    y=hist["Close"],
    name='{} Close'.format(ticker))
  )

  return dcc.Graph(
    figure=dict(
        data=tickerData,
        layout=dict(
            title='Open and Close for {}'.format(ticker),
            showlegend=True
        ),
        #
    ),
    id='my-graph'
  )
```

Combining that code with the existing content and adding a ticker-graph results in a html div.

This is a basic example of how plotly can be used in conjuction with external data sources to easier display data.

In the next part we will cover deploying this dash app to heroku and adding basic authentication, do not worry it about the same complexity as the other parts.

## PART III

In this part we cover how to release an application to heroku.
The first step is to sign up for https://heroku.com/.
After that add the following to a Procfile

```bash
web: gunicorn app:server --timeout 300000
```

In addition to having a Procfile, a requirements.txt file is required so


```bash
dash_core_components==1.5.1
dash_html_components==1.0.2
dash==1.6.1
yfinance==0.1.50
gunicorn>=19.9.0
```

Now you are ready to create the app in heroku.

After creating the app you should be redirected to the app management screen

Click on the connect to github button to connect the repo to the heroku deployments.
Just push up your changes and you will see the deployed app.

Although functionally, the app is complete, it looks somewhat ugly and could be restyled, previously for dash apps you needed to host css externally, but now can instead `*.css` files in code under the `assets` folder.


```css
.container {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box; }
.column,
.columns {
  width: 100%;
  float: left;
  box-sizing: border-box; }

/* For devices larger than 400px */
@media (min-width: 400px) {
  .container {
    width: 85%;
    padding: 0; }
}

/* For devices larger than 550px */
@media (min-width: 550px) {
  .container {
    width: 80%; }
  .column,
  .columns {
    margin-left: 4%; }
  .column:first-child,
  .columns:first-child {
    margin-left: 0; }

  .one.column,
  .one.columns                    { width: 4.66666666667%; }
  .two.columns                    { width: 13.3333333333%; }
  .three.columns                  { width: 22%;            }
  .four.columns                   { width: 30.6666666667%; }
  .five.columns                   { width: 39.3333333333%; }
  .six.columns                    { width: 48%;            }
  .seven.columns                  { width: 56.6666666667%; }
  .eight.columns                  { width: 65.3333333333%; }
  .nine.columns                   { width: 74.0%;          }
  .ten.columns                    { width: 82.6666666667%; }
  .eleven.columns                 { width: 91.3333333333%; }
  .twelve.columns                 { width: 100%; margin-left: 0; }

  .one-third.column               { width: 30.6666666667%; }
  .two-thirds.column              { width: 65.3333333333%; }

  .one-half.column                { width: 48%; }

  /* Offsets */
  .offset-by-one.column,
  .offset-by-one.columns          { margin-left: 8.66666666667%; }
  .offset-by-two.column,
  .offset-by-two.columns          { margin-left: 17.3333333333%; }
  .offset-by-three.column,
  .offset-by-three.columns        { margin-left: 26%;            }
  .offset-by-four.column,
  .offset-by-four.columns         { margin-left: 34.6666666667%; }
  .offset-by-five.column,
  .offset-by-five.columns         { margin-left: 43.3333333333%; }
  .offset-by-six.column,
  .offset-by-six.columns          { margin-left: 52%;            }
  .offset-by-seven.column,
  .offset-by-seven.columns        { margin-left: 60.6666666667%; }
  .offset-by-eight.column,
  .offset-by-eight.columns        { margin-left: 69.3333333333%; }
  .offset-by-nine.column,
  .offset-by-nine.columns         { margin-left: 78.0%;          }
  .offset-by-ten.column,
  .offset-by-ten.columns          { margin-left: 86.6666666667%; }
  .offset-by-eleven.column,
  .offset-by-eleven.columns       { margin-left: 95.3333333333%; }

  .offset-by-one-third.column,
  .offset-by-one-third.columns    { margin-left: 34.6666666667%; }
  .offset-by-two-thirds.column,
  .offset-by-two-thirds.columns   { margin-left: 69.3333333333%; }

  .offset-by-one-half.column,
  .offset-by-one-half.columns     { margin-left: 52%; }

}

html {
  font-size: 62.5%; }
body {
  font-size: 1.5em; /* currently ems cause chrome bug misinterpreting rems on body element */
  line-height: 1.6;
  font-weight: 400;
  font-family: "Open Sans", "HelveticaNeue", "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: rgb(50, 50, 50); }

h1, h2, h3, h4, h5, h6 {
  margin-top: 0;
  margin-bottom: 0;
  font-weight: 300; }
h1 { font-size: 4.5rem; line-height: 1.2;  letter-spacing: -.1rem; margin-bottom: 2rem; }
h2 { font-size: 3.6rem; line-height: 1.25; letter-spacing: -.1rem; margin-bottom: 1.8rem; margin-top: 1.8rem;}
h3 { font-size: 3.0rem; line-height: 1.3;  letter-spacing: -.1rem; margin-bottom: 1.5rem; margin-top: 1.5rem;}
h4 { font-size: 2.6rem; line-height: 1.35; letter-spacing: -.08rem; margin-bottom: 1.2rem; margin-top: 1.2rem;}
h5 { font-size: 2.2rem; line-height: 1.5;  letter-spacing: -.05rem; margin-bottom: 0.6rem; margin-top: 0.6rem;}
h6 { font-size: 2.0rem; line-height: 1.6;  letter-spacing: 0; margin-bottom: 0.75rem; margin-top: 0.75rem;}

p {
  margin-top: 0; }


/* Blockquotes
–––––––––––––––––––––––––––––––––––––––––––––––––– */
blockquote {
  border-left: 4px lightgrey solid;
  padding-left: 1rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
  margin-left: 0rem;
}


/* Links
–––––––––––––––––––––––––––––––––––––––––––––––––– */
a {
  color: #1EAEDB; 
  text-decoration: underline;
  cursor: pointer;}
a:hover {
  color: #0FA0CE; }


/* Buttons
–––––––––––––––––––––––––––––––––––––––––––––––––– */
.button,
button,
input[type="submit"],
input[type="reset"],
input[type="button"] {
  display: inline-block;
  height: 38px;
  padding: 0 30px;
  color: #555;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  line-height: 38px;
  letter-spacing: .1rem;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  background-color: transparent;
  border-radius: 4px;
  border: 1px solid #bbb;
  cursor: pointer;
  box-sizing: border-box; }
.button:hover,
button:hover,
input[type="submit"]:hover,
input[type="reset"]:hover,
input[type="button"]:hover,
.button:focus,
button:focus,
input[type="submit"]:focus,
input[type="reset"]:focus,
input[type="button"]:focus {
  color: #333;
  border-color: #888;
  outline: 0; }
.button.button-primary,
button.button-primary,
input[type="submit"].button-primary,
input[type="reset"].button-primary,
input[type="button"].button-primary {
  color: #FFF;
  background-color: #33C3F0;
  border-color: #33C3F0; }
.button.button-primary:hover,
button.button-primary:hover,
input[type="submit"].button-primary:hover,
input[type="reset"].button-primary:hover,
input[type="button"].button-primary:hover,
.button.button-primary:focus,
button.button-primary:focus,
input[type="submit"].button-primary:focus,
input[type="reset"].button-primary:focus,
input[type="button"].button-primary:focus {
  color: #FFF;
  background-color: #1EAEDB;
  border-color: #1EAEDB; }


/* Forms
–––––––––––––––––––––––––––––––––––––––––––––––––– */
input[type="email"],
input[type="number"],
input[type="search"],
input[type="text"],
input[type="tel"],
input[type="url"],
input[type="password"],
textarea,
select {
  height: 38px;
  padding: 6px 10px; /* The 6px vertically centers text on FF, ignored by Webkit */
  background-color: #fff;
  border: 1px solid #D1D1D1;
  border-radius: 4px;
  box-shadow: none;
  box-sizing: border-box; 
  font-family: inherit;
  font-size: inherit; /*https://stackoverflow.com/questions/6080413/why-doesnt-input-inherit-the-font-from-body*/}
/* Removes awkward default styles on some inputs for iOS */
input[type="email"],
input[type="number"],
input[type="search"],
input[type="text"],
input[type="tel"],
input[type="url"],
input[type="password"],
textarea {
  -webkit-appearance: none;
     -moz-appearance: none;
          appearance: none; }
textarea {
  min-height: 65px;
  padding-top: 6px;
  padding-bottom: 6px; }
input[type="email"]:focus,
input[type="number"]:focus,
input[type="search"]:focus,
input[type="text"]:focus,
input[type="tel"]:focus,
input[type="url"]:focus,
input[type="password"]:focus,
textarea:focus,
select:focus {
  border: 1px solid #33C3F0;
  outline: 0; }
label,
legend {
  display: block;
  margin-bottom: 0px; }
fieldset {
  padding: 0;
  border-width: 0; }
input[type="checkbox"],
input[type="radio"] {
  display: inline; }
label > .label-body {
  display: inline-block;
  margin-left: .5rem;
  font-weight: normal; }


/* Lists
–––––––––––––––––––––––––––––––––––––––––––––––––– */
ul {
  list-style: circle inside; }
ol {
  list-style: decimal inside; }
ol, ul {
  padding-left: 0;
  margin-top: 0; }
ul ul,
ul ol,
ol ol,
ol ul {
  margin: 1.5rem 0 1.5rem 3rem;
  font-size: 90%; }
li {
  margin-bottom: 1rem; }

table {
  border-collapse: collapse;
}
th:not(.CalendarDay),
td:not(.CalendarDay) {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #E1E1E1; }
th:first-child:not(.CalendarDay),
td:first-child:not(.CalendarDay) {
  padding-left: 0; }
th:last-child:not(.CalendarDay),
td:last-child:not(.CalendarDay) {
  padding-right: 0; }


button,
.button {
  margin-bottom: 0rem; }
input,
textarea,
select,
fieldset {
  margin-bottom: 0rem; }
pre,
dl,
figure,
table,
form {
  margin-bottom: 0rem; }
p,
ul,
ol {
  margin-bottom: 0.75rem; }
 
.u-full-width {
  width: 100%;
  box-sizing: border-box; }
.u-max-full-width {
  max-width: 100%;
  box-sizing: border-box; }
.u-pull-right {
  float: right; }
.u-pull-left {
  float: left; }


hr {
  margin-top: 3rem;
  margin-bottom: 3.5rem;
  border-width: 0;
  border-top: 1px solid #E1E1E1; }



/* Self Clearing Goodness */
.container:after,
.row:after,
.u-cf {
  content: "";
  display: table;
  clear: both; }




/* Larger than mobile */
@media (min-width: 400px) {}

/* Larger than phablet (also point when grid becomes active) */
@media (min-width: 550px) {}

/* Larger than tablet */
@media (min-width: 750px) {}

/* Larger than desktop */
@media (min-width: 1000px) {}

/* Larger than Desktop HD */
@media (min-width: 1200px) {}
```


Copy and that code into `assets/style.css` and all the classes will be accessible. But any other css based framework or styling will do, this makes it super easy to style dash apps.

The full code up to this section is at [github](https://github.com/FriendlyUser/dash-stock-ticker/tree/0867e787ef52ed779f291a2581826d6b78438518) and deployed at https://dash-stock-ticker-demo.herokuapp.com/
