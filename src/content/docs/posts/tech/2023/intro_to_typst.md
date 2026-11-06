---
tags: ['typst']
title: What is Typst.
description: Typst is a new markup-based typesetting system for the sciences that is designed to be an alternative both to advanced tools like LaTeX and simpler tools like Word and Google Docs..
pubDate: Fri, 14 June 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.png
---

Typst is a new markup-based typesetting system for the sciences that is designed to be an alternative both to advanced tools like LaTeX and simpler tools like Word and Google Docs. Its focus lies on the intersection of simplicity and power². It is written in Rust and compiles to pdf. It is designed to be used in the browser, but can also be used as a command-line tool.

Typst was born out of frustration with LaTeX. After four years of development, it is almost ready to launch¹. It is funded by the Technical University of Berlin, the State of Berlin, and the European Union (through the European Social Funds)³.

In Typst, grids are used to create layouts with rows and columns. The `grid` function is used to create a grid and takes several parameters such as `columns`, `gutter`, `column-gutter`, and `row-gutter`.

The `columns` parameter specifies the number of columns in the grid and their widths. For example, setting `columns: (1fr)` creates a single column grid where the column takes up all available space.

The `gutter` parameter specifies the amount of space between rows and columns. The `column-gutter` and `row-gutter` parameters can be used to specify different amounts of space between columns and rows.

Inside the grid function, you can add content to the grid by specifying an array of elements. Each element in the array represents a cell in the grid. You can use functions such as `align`, `block`, and `pad` to format the content inside each cell.

For example:

```rust
grid(
  columns: (1fr),
  gutter: 0.15em,
  align(center, location + ", "+ postalCode),
)
```

This code creates a single column grid with a gutter of 0.15em between rows. The content inside the cell is centered using the `align` function.

Putting it into practise, we can generate a simple resume using typst:

We are going to seperate the core resume into a template and the data into a resume file. The template will be a typst file and the resume will be a typst file.

```rust
// The project function defines how your document looks.
// It takes your content and some metadata and formats it.
// Go ahead and customize it to your liking!
#let resume(
  title: "", location: "", postalCode: "", phoneNumber: "", email: "",
  authors: (), experiences: (), education: (), body) = {
  // Set the document's basic properties.
  set document(author: authors, title: title)
  // set page(numbering: "1", number-align: center)
  set text(font: "Linux Libertine", lang: "en")

  // Title row.
  align(center)[
    #block(text(weight: 700, 2em, title))
  ]

  pad(
    top: 0.05em,
    bottom: 0.05em,
    x: 1em,
    grid(
      columns: (1fr),
      gutter: 0.15em,
      align(center, location + ", "+ postalCode),
    ),
  )
  pad(
    top: 0.1em,
    bottom: 0.1em,
    x: 1em,
    grid(
      columns: (1fr),
      gutter: 0.05em,
      align(center, phoneNumber + " - "+ email),
    ),
  )
  line(length: 100%)

  let count = experiences.len()
  let nrows = calc.min(count, 1)
  grid(
    column-gutter: 0pt,
    row-gutter: 35pt,
    ..experiences.map(experience => [
      #block( text(weight: 700, 1.5em, spacing: 50%, experience.employee))
      #block(above: 0pt, below: 0pt, text(experience.jobTitle))
      #pad(
        y: -0.25em,
        grid(
          columns: 2,
          gutter: 0.05em,
          column-gutter: 0pt,
          row-gutter: 0pt,
          experience.startDate + " - " + experience.endDate + " ", " " + experience.location
        ),
      ),
      #pad(
        x: 1em,
        y: -0.75em,
        list(..experience.points.map(point => point))
      )
    ]),
  )
  line(length: 100%)
  pad(y: 2em,
    grid(
      columns: 1,
      gutter: 0.05em,
      column-gutter: 0pt,
      row-gutter: 10pt,
      block(above: 2pt, below: 2pt, text(weight: 700, 1.5em, spacing: 50%, education.name)),
      block(above: 0pt, below: 0pt, text(education.degree)),
      grid(
          columns: 2,
          gutter: 0.05em,
          column-gutter: 0pt,
          row-gutter: 0pt,
          education.startDate + " - " + education.endDate + " ", " | " + education.location,
      ),
      pad(
          x: 1em,
          list(..education.points.map(point => point))
      )
    )
  )
  line(length: 100%)
  text(weight: 700, 1.5em, "References")
  pad(y:1em, text("Available on Request"))
  // Main body.
  set par(justify: true)

}
```

This Typst template code appears to be for a document that includes information about a resume. The template has several major sections:

1. **Resume function definition**: The `resume` function is defined at the beginning of the template with several parameters such as `title`, `location`, `postalCode`, `phoneNumber`, `email`, `authors`, `experiences`, and `education`.

2. **Document properties**: The basic properties of the document are set using the `set` keyword. This includes setting the author and title of the document.

3. **Title row**: A title row is created using the `align` and `block` functions to center and format the title text.

4. **Location and contact information**: The location and contact information are displayed in two separate rows using the `pad` and `grid` functions.

5. **Experiences**: A grid is created to display information about experiences using the `grid` function. Each experience includes information such as employee name, job title, start date, end date, location, and points.

6. **Education**: Information about education is displayed in a similar manner to experiences using a grid created with the `grid` function.


To generate a resume, we can create a resume file that contains the data for the resume. The resume file will be a typst file.

```rust
#import "template.typ": *

// Take a look at the file `template.typ` in the file panel
// to customize this template and discover how it works.
#show: resume.with(
  title: "New Grad Resume",
  location: "Vancouver, BC",
  postalCode: "V5Y 1V4",
  phoneNumber: "(604) 873-7000",
  email: "newGrad@gmail.com",
  experiences: (
    (
      employee: "Big Company",
      jobTitle: "Software Developer",
      startDate: "March 2020",
      endDate: "Current",
      location: "BC, Canada",
      points: (
        (
          "Implementing web app for a website with html css and javascript"
        ),
        (
          "Implementing mobile app all by myself"
        ),
        (
          "Releasing untested code"
        ),
        (
          "Buggy software development"
        )
      )
    ),
    (
      employee: "Small Company",
      jobTitle: "Software Engineer",
      startDate: "March 2018",
      endDate: "March 2020",
      location: "BC, Canada",
      points: (
        ("Quality Assurance for mobile app"),
        (
          "Unit Testing for mobile app"
        ),
        (
          "Gaining credit for coop"
        )
      )
    ),
  ),
  education: (
    name: "University of Victoria",
    startDate: "September 2016",
    endDate: "December 2019",
    degree: "Computer Engineering",
    location: "Victoria, BC",
    points: (
      (
        "Good At Math"
      ), 
      (
        "Good at Coding"
      )
    )
  )
)
```

This Typst code appears to be for a document that displays a resume using a template. The code has several sections:

1. **Importing the template**: The `import` keyword is used to import the `template.typ` file which contains the definition of the `resume` function.

2. **Customizing the template**: The `resume.with` function is used to customize the template by passing in values for parameters such as `title`, `location`, `postalCode`, `phoneNumber`, and `email`.

3. **Experiences**: An array of experiences is passed to the `experiences` parameter of the `resume.with` function. Each experience includes information such as employee name, job title, start date, end date, location, and points.

4. **Education**: Information about education is passed to the `education` parameter of the `resume.with` function.

The first line of code uses the `show` keyword to display the customized resume using the imported template.

You can view an example at https://github.com/FriendlyUser/IntroductionToTypst 

and the pdf is accessible at https://github.com/FriendlyUser/IntroductionToTypst/blob/main/main.pdf

## References
(1) Typst Documentation. https://typst.app/docs/ Accessed 3/23/2023.
(2) Typst: Compose papers faster. https://typst.app/ Accessed 3/23/2023.
(3) Has anyone tried Typst? : r/LaTeX - reddit.com. https://www.reddit.com/r/LaTeX/comments/zyuyfc/has_anyone_tried_typst/ Accessed 3/23/2023.