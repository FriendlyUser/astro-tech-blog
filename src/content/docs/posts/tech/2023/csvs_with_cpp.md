---
title: "Reading and writing CSV files in C++ with ifstream and ofstream"
description: Read a CSV file line by line in C++, split fields correctly (including quoted commas), add a computed column and write the result to a new file.
pubDate: Saturday, 26 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "cpp"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/2886495853.png'
---

The C++ standard library has no CSV parser, but `std::ifstream`, `std::getline` and `std::ofstream` are enough for simple files. This post reads a small CSV of scores, adds a "passed" column, and writes the result to a new file.

## The naive split, and where it breaks

The usual first attempt reads each line, then splits it on commas with a second `std::getline`:

```cpp
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

std::vector<std::vector<std::string>> readNaive(const std::string &path) {
    std::vector<std::vector<std::string>> rows;
    std::ifstream csvFile{path};
    std::string row;
    while (std::getline(csvFile, row)) {
        std::stringstream rowStream(row);
        std::string col;
        std::vector<std::string> cols;
        while (std::getline(rowStream, col, ',')) {
            cols.push_back(col);
        }
        rows.push_back(cols);
    }
    return rows;
}
```

This works for plain data, but it gets two common cases wrong:

- **Quoted commas.** In `2,"Smith, Bob",75` the comma inside the quotes is part of the name, but the split produces four fields: `2`, `"Smith`, ` Bob"` and `75`.
- **Empty last field.** For `a,b,` the inner loop yields only `a` and `b`, because `std::getline` stops at end of input without returning a final empty string.

Files saved from Excel on Windows also end each line with `\r\n`, which leaves a stray `\r` on the last field.

## A small field parser

The function below walks the line one character at a time and tracks whether it's inside quotes. It handles quoted commas, `""` as an escaped quote, empty trailing fields and `\r`. It does not handle a quoted field that contains a line break; for that, use a library such as [rapidcsv](https://github.com/d99kris/rapidcsv) or [csv-parser](https://github.com/vincentlaucsb/csv-parser).

```cpp
std::vector<std::string> parseCsvLine(const std::string &line) {
    std::vector<std::string> fields;
    std::string field;
    bool inQuotes = false;

    for (std::size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (inQuotes) {
            if (c == '"' && i + 1 < line.size() && line[i + 1] == '"') {
                field += '"';
                ++i;
            } else if (c == '"') {
                inQuotes = false;
            } else {
                field += c;
            }
        } else if (c == '"') {
            inQuotes = true;
        } else if (c == ',') {
            fields.push_back(field);
            field.clear();
        } else if (c != '\r') {  // tolerate Windows line endings
            field += c;
        }
    }
    fields.push_back(field);
    return fields;
}
```

## Writing CSV

Writing is the reverse: join fields with commas, and wrap any field that contains a comma, quote or newline in quotes, doubling the quotes inside it.

```cpp
std::string toCsvField(const std::string &value) {
    if (value.find_first_of(",\"\n") == std::string::npos) {
        return value;
    }
    std::string quoted = "\"";
    for (char c : value) {
        if (c == '"') quoted += '"';
        quoted += c;
    }
    return quoted + "\"";
}

void writeRow(std::ofstream &out, const std::vector<std::string> &row) {
    for (std::size_t i = 0; i < row.size(); ++i) {
        if (i > 0) out << ',';
        out << toCsvField(row[i]);
    }
    out << '\n';
}
```

Opening an `std::ofstream` truncates the file. To add rows to an existing file instead, open it in append mode: `std::ofstream out{"results.csv", std::ios::app};`.

## Putting it together

Given `scores.csv`:

```text
id,name,score
1,Alice,90
2,"Smith, Bob",75
3,Carol,82
```

this `main` (placed after the three functions above, with `<fstream>`, `<iostream>`, `<string>` and `<vector>` included) copies each row to `results.csv` with a `passed` column and prints the average:

```cpp
int main() {
    std::ifstream in{"scores.csv"};
    if (!in) {
        std::cerr << "Could not open scores.csv\n";
        return 1;
    }

    std::ofstream out{"results.csv"};
    if (!out) {
        std::cerr << "Could not open results.csv for writing\n";
        return 1;
    }

    std::string line;
    if (!std::getline(in, line)) {
        std::cerr << "scores.csv is empty\n";
        return 1;
    }
    std::vector<std::string> header = parseCsvLine(line);
    header.push_back("passed");
    writeRow(out, header);

    int rows = 0;
    double total = 0;
    while (std::getline(in, line)) {
        if (line.empty()) continue;
        std::vector<std::string> cols = parseCsvLine(line);
        if (cols.size() < 3) {
            std::cerr << "Skipping malformed row: " << line << '\n';
            continue;
        }
        int score = 0;
        try {
            score = std::stoi(cols[2]);
        } catch (const std::exception &) {
            std::cerr << "Skipping row with a bad score: " << line << '\n';
            continue;
        }
        total += score;
        ++rows;
        cols.push_back(score >= 80 ? "yes" : "no");
        writeRow(out, cols);
    }

    if (rows > 0) {
        std::cout << "Rows: " << rows << ", average score: " << total / rows << '\n';
    }
}
```

Compile with `g++ -std=c++17 -Wall -o csv csv.cpp` and run it:

```text
Rows: 3, average score: 82.3333
```

`results.csv` keeps the quotes around the name that contains a comma:

```text
id,name,score,passed
1,Alice,90,yes
2,"Smith, Bob",75,no
3,Carol,82,yes
```

## When to use a library instead

Hand-rolled parsing is fine for files you control. Reach for a library when the input comes from elsewhere and may contain quoted line breaks, different delimiters, a byte-order mark or a mix of encodings, or when files are large enough that per-character string building becomes a bottleneck.
