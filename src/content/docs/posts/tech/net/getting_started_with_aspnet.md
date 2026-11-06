---
title: Ensure Elements are always visible on screen
description: Understanding React Refs A Guide for Beginners
alt: my first blog post
tags: ["aspnet", "csharp"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 14 December 2024
imgSrc: '/imgs/2023/590655340.png'
---


<style type="text/css">
    pre { line-height: 125%; }
td.linenos .normal { color: inherit; background-color: transparent; padding-left: 5px; padding-right: 5px; }
span.linenos { color: inherit; background-color: transparent; padding-left: 5px; padding-right: 5px; }
td.linenos .special { color: #000000; background-color: #ffffc0; padding-left: 5px; padding-right: 5px; }
span.linenos.special { color: #000000; background-color: #ffffc0; padding-left: 5px; padding-right: 5px; }
.highlight .hll { background-color: var(--jp-cell-editor-active-background) }
.highlight { background: var(--jp-cell-editor-background); color: var(--jp-mirror-editor-variable-color) }
.highlight .c { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment */
.highlight .err { color: var(--jp-mirror-editor-error-color) } /* Error */
.highlight .k { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword */
.highlight .o { color: var(--jp-mirror-editor-operator-color); font-weight: bold } /* Operator */
.highlight .p { color: var(--jp-mirror-editor-punctuation-color) } /* Punctuation */
.highlight .ch { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment.Hashbang */
.highlight .cm { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment.Multiline */
.highlight .cp { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment.Preproc */
.highlight .cpf { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment.PreprocFile */
.highlight .c1 { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment.Single */
.highlight .cs { color: var(--jp-mirror-editor-comment-color); font-style: italic } /* Comment.Special */
.highlight .kc { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword.Constant */
.highlight .kd { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword.Declaration */
.highlight .kn { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword.Namespace */
.highlight .kp { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword.Pseudo */
.highlight .kr { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword.Reserved */
.highlight .kt { color: var(--jp-mirror-editor-keyword-color); font-weight: bold } /* Keyword.Type */
.highlight .m { color: var(--jp-mirror-editor-number-color) } /* Literal.Number */
.highlight .s { color: var(--jp-mirror-editor-string-color) } /* Literal.String */
.highlight .ow { color: var(--jp-mirror-editor-operator-color); font-weight: bold } /* Operator.Word */
.highlight .pm { color: var(--jp-mirror-editor-punctuation-color) } /* Punctuation.Marker */
.highlight .w { color: var(--jp-mirror-editor-variable-color) } /* Text.Whitespace */
.highlight .mb { color: var(--jp-mirror-editor-number-color) } /* Literal.Number.Bin */
.highlight .mf { color: var(--jp-mirror-editor-number-color) } /* Literal.Number.Float */
.highlight .mh { color: var(--jp-mirror-editor-number-color) } /* Literal.Number.Hex */
.highlight .mi { color: var(--jp-mirror-editor-number-color) } /* Literal.Number.Integer */
.highlight .mo { color: var(--jp-mirror-editor-number-color) } /* Literal.Number.Oct */
.highlight .sa { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Affix */
.highlight .sb { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Backtick */
.highlight .sc { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Char */
.highlight .dl { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Delimiter */
.highlight .sd { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Doc */
.highlight .s2 { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Double */
.highlight .se { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Escape */
.highlight .sh { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Heredoc */
.highlight .si { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Interpol */
.highlight .sx { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Other */
.highlight .sr { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Regex */
.highlight .s1 { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Single */
.highlight .ss { color: var(--jp-mirror-editor-string-color) } /* Literal.String.Symbol */
.highlight .il { color: var(--jp-mirror-editor-number-color) } /* Literal.Number.Integer.Long */
  </style>
<h1 id="Creating-Web-Applications-with-ASP.NET">Creating Web Applications with ASP.NET<a class="anchor-link" href="#Creating-Web-Applications-with-ASP.NET">&#182;</a></h1><h2 id="Introduction-to-Creating-Web-Applications-with-ASP.NET">Introduction to Creating Web Applications with ASP.NET<a class="anchor-link" href="#Introduction-to-Creating-Web-Applications-with-ASP.NET">&#182;</a></h2><p>ASP.NET is a web development framework created by Microsoft that allows developers to build dynamic web applications. With ASP.NET, developers can create web applications that can be accessed from any device with a web browser, such as desktop computers, laptops, tablets, and smartphones.</p>
<p>ASP.NET provides developers with a set of tools and technologies for building web applications, including web forms, MVC (Model-View-Controller) architecture, and Web API (Application Programming Interface). These technologies allow developers to create web applications with rich user interfaces, complex business logic, and seamless integration with other systems.</p>
<p>Creating a New Project
Once your development environment is set up, you can create a new ASP.NET project. In Visual Studio, select File &gt; New &gt; Project... from the main menu.</p>
<p>In the New Project dialog box that appears, select ASP.NET Core Web Application from the list of templates on the left side of the window. Then click Next.</p>
<p>On the next screen, enter a name for your project and choose a location where it will be saved. Then click Create.</p>
<p>You’ll now be prompted to choose a template for your new project. For this example, we’ll use the Web Application (Model-View-Controller) template. Select this option and then click Create.</p>
<p>Visual Studio will now create a new ASP.NET project for you based on the selected template.</p>
<p>Adding Basic Functionality
Now that you have a new project created, let’s add some basic functionality to it.</p>
<p>First, open the HomeController.cs file in your project (you can find it in the Controllers folder). This file contains code for handling requests to your application’s home page.</p>
<p>Let’s add a simple action method that returns some text when called:</p>
<div class="highlight"><pre><span></span><span class="k">public</span><span class="w"> </span><span class="n">IActionResult</span><span class="w"> </span><span class="nf">HelloWorld</span><span class="p">()</span>
<span class="p">{</span>
<span class="w">    </span><span class="k">return</span><span class="w"> </span><span class="nf">Content</span><span class="p">(</span><span class="s">&quot;Hello World!&quot;</span><span class="p">);</span>
<span class="p">}</span>
</pre></div>
<p>This code defines an action method named HelloWorld. When called (by sending an HTTP request to /Home/HelloWorld), it returns some plain text content (“Hello World!”).</p>
<p>Next, let’s add a link to our new action method on our home page so users can easily access it.</p>
<p>Open the Index.cshtml file in your project (you can find it in the Views/Home folder). This file contains the HTML code for your application’s home page.</p>
<p>Add a new link to our HelloWorld action method by adding the following code inside the <div> element with the class text-center:</p>
<div class="highlight"><pre><span></span><span class="p">&lt;</span><span class="nt">a</span> <span class="na">asp-controller</span><span class="o">=</span><span class="s">&quot;Home&quot;</span> <span class="na">asp-action</span><span class="o">=</span><span class="s">&quot;HelloWorld&quot;</span><span class="p">&gt;</span>Say Hello<span class="p">&lt;/</span><span class="nt">a</span><span class="p">&gt;</span>
</pre></div>
<p>This code uses ASP.NET’s tag helper syntax to generate a link to our new action method. When clicked, it will send an HTTP request to /Home/HelloWorld, which will call our HelloWorld action method and display its result.</p>
<p>Save your changes and run your application (press F5 or select Debug &gt; Start Debugging from the main menu). You should now see a new “Say Hello” link on your home page. Click it to see the &quot;Hello World!&quot; message.</p>

</div>
</div>
</div>
</div>
<div class="jp-Cell jp-MarkdownCell jp-Notebook-cell">
<div class="jp-Cell-inputWrapper">
<div class="jp-Collapser jp-InputCollapser jp-Cell-inputCollapser">
</div>
<div class="jp-InputArea jp-Cell-inputArea"><div class="jp-InputPrompt jp-InputArea-prompt">
</div><div class="jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput " data-mime-type="text/markdown">
<h3 id="Rendering-a-Table">Rendering a Table<a class="anchor-link" href="#Rendering-a-Table">&#182;</a></h3><p>For a more complex example</p>
<p>Step 1: Create an ASP.NET Application</p>
<p>To get started, create a new ASP.NET web application using Visual Studio. Open Visual Studio and select “New Project”. From the “New Project” dialog box, select “ASP.NET Web Application” and give your project a name.</p>
<p>Step 2: Add Data to the Application</p>
<p>For this example, we will use a simple data set to populate our table. Create a new class called &quot;Student&quot; that has properties for &quot;FirstName&quot;, &quot;LastName&quot;, and &quot;Grade&quot;. Then, create a new list of students and populate it with some data.</p>
<div class="highlight"><pre><span></span><span class="k">public</span><span class="w"> </span><span class="k">class</span><span class="w"> </span><span class="nc">Student</span>
<span class="p">{</span>
<span class="w">    </span><span class="k">public</span><span class="w"> </span><span class="kt">string</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="k">get</span><span class="p">;</span><span class="w"> </span><span class="k">set</span><span class="p">;</span><span class="w"> </span><span class="p">}</span>
<span class="w">    </span><span class="k">public</span><span class="w"> </span><span class="kt">string</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="k">get</span><span class="p">;</span><span class="w"> </span><span class="k">set</span><span class="p">;</span><span class="w"> </span><span class="p">}</span>
<span class="w">    </span><span class="k">public</span><span class="w"> </span><span class="kt">int</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="k">get</span><span class="p">;</span><span class="w"> </span><span class="k">set</span><span class="p">;</span><span class="w"> </span><span class="p">}</span>
<span class="p">}</span>

<span class="n">List</span><span class="o">&lt;</span><span class="n">Student</span><span class="o">&gt;</span><span class="w"> </span><span class="n">students</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="k">new</span><span class="w"> </span><span class="n">List</span><span class="o">&lt;</span><span class="n">Student</span><span class="o">&gt;</span>
<span class="p">{</span>
<span class="w">    </span><span class="k">new</span><span class="w"> </span><span class="n">Student</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;John&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Doe&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="m">80</span><span class="w"> </span><span class="p">},</span>
<span class="w">    </span><span class="k">new</span><span class="w"> </span><span class="n">Student</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Jane&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Smith&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="m">90</span><span class="w"> </span><span class="p">},</span>
<span class="w">    </span><span class="k">new</span><span class="w"> </span><span class="n">Student</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Bob&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Jones&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="m">75</span><span class="w"> </span><span class="p">}</span>
<span class="p">};</span>
</pre></div>
<p>Step 3: Create the Table</p>
<p>Next, we will create the table that will display our data. Add a new HTML file to your project called &quot;Table.html&quot;. In this file, create a new table element and add the necessary columns and rows.</p>
<div class="highlight"><pre><span></span><span class="p">&lt;</span><span class="nt">table</span><span class="p">&gt;</span>
    <span class="p">&lt;</span><span class="nt">thead</span><span class="p">&gt;</span>
        <span class="p">&lt;</span><span class="nt">tr</span><span class="p">&gt;</span>
            <span class="p">&lt;</span><span class="nt">th</span><span class="p">&gt;</span>First Name<span class="p">&lt;/</span><span class="nt">th</span><span class="p">&gt;</span>
            <span class="p">&lt;</span><span class="nt">th</span><span class="p">&gt;</span>Last Name<span class="p">&lt;/</span><span class="nt">th</span><span class="p">&gt;</span>
            <span class="p">&lt;</span><span class="nt">th</span><span class="p">&gt;</span>Grade<span class="p">&lt;/</span><span class="nt">th</span><span class="p">&gt;</span>
        <span class="p">&lt;/</span><span class="nt">tr</span><span class="p">&gt;</span>
    <span class="p">&lt;/</span><span class="nt">thead</span><span class="p">&gt;</span>
    <span class="p">&lt;</span><span class="nt">tbody</span><span class="p">&gt;</span>
    <span class="p">&lt;/</span><span class="nt">tbody</span><span class="p">&gt;</span>
<span class="p">&lt;/</span><span class="nt">table</span><span class="p">&gt;</span>
</pre></div>
<p>Step 4: Populate the Table with Data</p>
<p>To populate the table with data, we will use ASP.NET’s Razor syntax. Add a new Razor view to your project called “Table.cshtml”. In this file, add the necessary code to loop through the list of students and add a new row to the table for each student.</p>
<div class="highlight"><pre><span></span><span class="n">@model</span><span class="w"> </span><span class="n">List</span><span class="o">&lt;</span><span class="n">Student</span><span class="o">&gt;</span>

<span class="o">&lt;</span><span class="n">table</span><span class="o">&gt;</span>
<span class="w">    </span><span class="o">&lt;</span><span class="n">thead</span><span class="o">&gt;</span>
<span class="w">        </span><span class="o">&lt;</span><span class="n">tr</span><span class="o">&gt;</span>
<span class="w">            </span><span class="o">&lt;</span><span class="n">th</span><span class="o">&gt;</span><span class="n">First</span><span class="w"> </span><span class="n">Name</span><span class="o">&lt;/</span><span class="n">th</span><span class="o">&gt;</span>
<span class="w">            </span><span class="o">&lt;</span><span class="n">th</span><span class="o">&gt;</span><span class="n">Last</span><span class="w"> </span><span class="n">Name</span><span class="o">&lt;/</span><span class="n">th</span><span class="o">&gt;</span>
<span class="w">            </span><span class="o">&lt;</span><span class="n">th</span><span class="o">&gt;</span><span class="n">Grade</span><span class="o">&lt;/</span><span class="n">th</span><span class="o">&gt;</span>
<span class="w">        </span><span class="o">&lt;/</span><span class="n">tr</span><span class="o">&gt;</span>
<span class="w">    </span><span class="o">&lt;/</span><span class="n">thead</span><span class="o">&gt;</span>
<span class="w">    </span><span class="o">&lt;</span><span class="n">tbody</span><span class="o">&gt;</span>
<span class="w">        </span><span class="n">@foreach</span><span class="w"> </span><span class="p">(</span><span class="kt">var</span><span class="w"> </span><span class="n">student</span><span class="w"> </span><span class="k">in</span><span class="w"> </span><span class="n">Model</span><span class="p">)</span>
<span class="w">        </span><span class="p">{</span>
<span class="w">            </span><span class="o">&lt;</span><span class="n">tr</span><span class="o">&gt;</span>
<span class="w">                </span><span class="o">&lt;</span><span class="n">td</span><span class="o">&gt;</span><span class="n">@student</span><span class="p">.</span><span class="n">FirstName</span><span class="o">&lt;/</span><span class="n">td</span><span class="o">&gt;</span>
<span class="w">                </span><span class="o">&lt;</span><span class="n">td</span><span class="o">&gt;</span><span class="n">@student</span><span class="p">.</span><span class="n">LastName</span><span class="o">&lt;/</span><span class="n">td</span><span class="o">&gt;</span>
<span class="w">                </span><span class="o">&lt;</span><span class="n">td</span><span class="o">&gt;</span><span class="n">@student</span><span class="p">.</span><span class="n">Grade</span><span class="o">&lt;/</span><span class="n">td</span><span class="o">&gt;</span>
<span class="w">            </span><span class="o">&lt;/</span><span class="n">tr</span><span class="o">&gt;</span>
<span class="w">        </span><span class="p">}</span>
<span class="w">    </span><span class="o">&lt;/</span><span class="n">tbody</span><span class="o">&gt;</span>
<span class="o">&lt;/</span><span class="n">table</span><span class="o">&gt;</span>
</pre></div>
<p>Step 5: Render the Table</p>
<p>To render the table in your ASP.NET application, add a new controller to your project called &quot;TableController&quot;. In this controller, create a new action method called &quot;Index&quot; that returns the &quot;Table.cshtml&quot; view with the list of students as the model.</p>
<div class="highlight"><pre><span></span><span class="k">public</span><span class="w"> </span><span class="k">class</span><span class="w"> </span><span class="nc">TableController</span><span class="w"> </span><span class="p">:</span><span class="w"> </span><span class="n">Controller</span>
<span class="p">{</span>
<span class="w">    </span><span class="k">public</span><span class="w"> </span><span class="n">IActionResult</span><span class="w"> </span><span class="nf">Index</span><span class="p">()</span>
<span class="w">    </span><span class="p">{</span>
<span class="w">        </span><span class="n">List</span><span class="o">&lt;</span><span class="n">Student</span><span class="o">&gt;</span><span class="w"> </span><span class="n">students</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="k">new</span><span class="w"> </span><span class="n">List</span><span class="o">&lt;</span><span class="n">Student</span><span class="o">&gt;</span>
<span class="w">        </span><span class="p">{</span>
<span class="w">            </span><span class="k">new</span><span class="w"> </span><span class="n">Student</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;John&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Doe&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="m">80</span><span class="w"> </span><span class="p">},</span>
<span class="w">            </span><span class="k">new</span><span class="w"> </span><span class="n">Student</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Jane&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Smith&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="m">90</span><span class="w"> </span><span class="p">},</span>
<span class="w">            </span><span class="k">new</span><span class="w"> </span><span class="n">Student</span><span class="w"> </span><span class="p">{</span><span class="w"> </span><span class="n">FirstName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Bob&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">LastName</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s">&quot;Jones&quot;</span><span class="p">,</span><span class="w"> </span><span class="n">Grade</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="m">75</span><span class="w"> </span><span class="p">}</span>
<span class="w">        </span><span class="p">};</span>

<span class="w">        </span><span class="k">return</span><span class="w"> </span><span class="nf">View</span><span class="p">(</span><span class="n">students</span><span class="p">);</span>
<span class="w">    </span><span class="p">}</span>
<span class="p">}</span>
</pre></div>
<p>Step 6: Run the Application</p>
<p>Finally, run your ASP.NET application and navigate to the &quot;Table&quot; page. You should see a table displayed with the student data in it. You can customize the table’s appearance and functionality by using CSS and JavaScript.</p>

</div>
</div>
</div>
</div>
<div class="jp-Cell jp-MarkdownCell jp-Notebook-cell">
<div class="jp-Cell-inputWrapper">
<div class="jp-Collapser jp-InputCollapser jp-Cell-inputCollapser">
</div>
<div class="jp-InputArea jp-Cell-inputArea"><div class="jp-InputPrompt jp-InputArea-prompt">
</div><div class="jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput " data-mime-type="text/markdown">
<p>Structuring ASP.NET projects can be a bit of a challenge, especially for beginners. However, there are several ways to structure an ASP.NET project, depending on the size and complexity of the project. Here are some common ways to structure an ASP.NET project:</p>
<p>MVC (Model-View-Controller) Architecture: This is a popular architecture for building ASP.NET projects. In this architecture, the application is divided into three main components: the model, which represents the data and business logic; the view, which represents the user interface; and the controller, which manages the flow of data between the model and the view.</p>
<p>Three-tier Architecture: This is another popular architecture for building ASP.NET projects. In this architecture, the application is divided into three main layers: the presentation layer, which includes the user interface; the business logic layer, which includes the application's business rules and processes; and the data access layer, which includes the code that interacts with the database.</p>
<p>Modular Architecture: This architecture involves breaking up the application into modules or components that can be developed independently and integrated into the application later. Each module can have its own architecture and can be developed by a separate team.</p>
<p>Regardless of the architecture you choose, there are some best practices that you can follow to structure your ASP.NET project. These include:</p>
<p>Keep the code organized: Group related files and folders together to make it easier to find and maintain code.</p>
<p>Use a naming convention: Use a consistent naming convention for files, folders, and classes to make it easier to understand and navigate the code.</p>
<p>Use source control: Use a version control system such as Git or SVN to manage the code and collaborate with other developers.</p>
<p>Keep the dependencies organized: Use a package manager such as NuGet to manage the dependencies of your project.</p>
<p>Separate configuration from code: Keep configuration settings such as connection strings and app settings in a separate file or in a database to make it easier to manage and update them.</p>

</div>
</div>
</div>
</div>

[!aspnet](imgs/2023/tech/aspdiagram.png)
