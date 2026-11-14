---
tags: ['typst']
title: "Typst basics: building a resume template with grid and pad"
description: An introduction to Typst, a markup-based typesetting system, by building a reusable resume template and filling it with data from a separate file.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.png
---

Typst is a markup-based typesetting system aimed at the same documents as LaTeX (papers, theses, resumes) but with simpler syntax, readable error messages and near-instant recompiles. It's written in Rust and compiles to PDF. You can use the collaborative web app at [typst.app](https://typst.app/) or the open-source command-line compiler:

```bash
typst compile main.typ   # writes main.pdf
typst watch main.typ     # recompiles on every save
```

The example below was written against early Typst and has been updated for the current release (0.15 at the time of writing).

## Grids

`grid` lays content out in rows and columns. The main parameters:

- `columns`: the number of columns, or an array of widths. `(1fr)` is one column taking all available space; `2` is two auto-sized columns.
- `gutter`: space between rows and columns. `column-gutter` and `row-gutter` override it for one direction.
- The positional arguments are the cells, filled left to right, top to bottom.

In markup you prefix a function call with `#`:

```typst
#let location = "Vancouver, BC"
#let postalCode = "V5Y 1V4"

#grid(
  columns: (1fr),
  gutter: 0.15em,
  align(center, location + ", " + postalCode),
)
```

This makes a single-column grid with one centered cell. Functions like `align`, `block` and `pad` format what goes inside each cell.

## A resume template

To make a resume, I split the layout and the data into two files. `template.typ` defines a `resume` function that takes the data as named arguments and returns the formatted page:

```typst
// template.typ
#let resume(
  title: "", location: "", postalCode: "", phoneNumber: "", email: "",
  authors: (), experiences: (), education: (), body,
) = {
  set document(author: authors, title: title)
  set text(font: "Libertinus Serif", lang: "en")

  // Name, centered at the top.
  align(center)[
    #block(text(weight: 700, size: 2em, title))
  ]

  // Contact details.
  pad(top: 0.05em, bottom: 0.05em, x: 1em,
    grid(columns: (1fr), gutter: 0.15em,
      align(center, location + ", " + postalCode),
    ),
  )
  pad(top: 0.1em, bottom: 0.1em, x: 1em,
    grid(columns: (1fr), gutter: 0.05em,
      align(center, phoneNumber + " - " + email),
    ),
  )
  line(length: 100%)

  // One block per job.
  grid(
    row-gutter: 35pt,
    ..experiences.map(experience => [
      #block(text(weight: 700, size: 1.5em, experience.employee))
      #block(above: 0pt, below: 0pt, text(experience.jobTitle))
      #pad(y: -0.25em,
        grid(columns: 2, gutter: 0.05em,
          experience.startDate + " - " + experience.endDate + " ",
          " " + experience.location,
        ),
      )
      #pad(x: 1em, y: -0.75em, list(..experience.points))
    ]),
  )
  line(length: 100%)

  // Education.
  pad(y: 2em,
    grid(columns: 1, row-gutter: 10pt,
      block(above: 2pt, below: 2pt, text(weight: 700, size: 1.5em, education.name)),
      block(above: 0pt, below: 0pt, text(education.degree)),
      grid(columns: 2, gutter: 0.05em,
        education.startDate + " - " + education.endDate + " ",
        " | " + education.location,
      ),
      pad(x: 1em, list(..education.points)),
    ),
  )
  line(length: 100%)

  text(weight: 700, size: 1.5em, "References")
  pad(y: 1em, text("Available on Request"))

  // Anything written after the show rule in main.typ goes here.
  set par(justify: true)
  body
}
```

A few things worth noting:

- `set` rules inside the function (`set document`, `set text`) only apply to the content the function returns, so the template doesn't leak styles elsewhere.
- `..experiences.map(...)` spreads an array into separate arguments, so each job becomes one grid cell. Inside the `[...]` content block you're back in markup mode, which is why the calls there need `#`.
- `list(..experience.points)` turns an array of strings into a bulleted list.
- The `body` parameter receives the rest of the document when the template is applied with a show rule (below). The original version of this template never placed `body`, so anything written after the show rule silently disappeared.

## Filling in the data

`main.typ` imports the template and applies it to the whole document with `#show: resume.with(...)`. `.with` pre-fills the named arguments and returns a new function that only needs `body`:

```typst
// main.typ
#import "template.typ": *

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
        "Implementing web app for a website with html css and javascript",
        "Implementing mobile app all by myself",
        "Releasing untested code",
        "Buggy software development",
      ),
    ),
    (
      employee: "Small Company",
      jobTitle: "Software Engineer",
      startDate: "March 2018",
      endDate: "March 2020",
      location: "BC, Canada",
      points: (
        "Quality Assurance for mobile app",
        "Unit Testing for mobile app",
        "Gaining credit for coop",
      ),
    ),
  ),
  education: (
    name: "University of Victoria",
    startDate: "September 2016",
    endDate: "December 2019",
    degree: "Computer Engineering",
    location: "Victoria, BC",
    points: ("Good At Math", "Good at Coding"),
  ),
)
```

Each job is a dictionary, `experiences` is an array of them, and `education` is a single dictionary. One gotcha: an array with a single element needs a trailing comma, `("only item",)`, otherwise Typst reads the parentheses as grouping and you get a plain string.

Run `typst compile main.typ` and you get `main.pdf`.

The full example is at [github.com/FriendlyUser/IntroductionToTypst](https://github.com/FriendlyUser/IntroductionToTypst), with the generated PDF at [main.pdf](https://github.com/FriendlyUser/IntroductionToTypst/blob/main/main.pdf).

## Further reading

- [Typst documentation](https://typst.app/docs/)
- [`grid` reference](https://typst.app/docs/reference/layout/grid/)
- [Making a template (tutorial)](https://typst.app/docs/tutorial/making-a-template/)
- [Typst on GitHub](https://github.com/typst/typst)
