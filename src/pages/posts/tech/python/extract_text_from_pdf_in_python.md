---
tags: ['python', 'pypdf2']
title: How to extract text from a PDF file in Python
description: To extract text from a PDF file, you can use the `PyPDF2` library.
pubDate: Fri, 3 January 2025
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3702590653.png"
---

To extract text from a PDF file, you can use the `PyPDF2` library. If you don't have it installed, you can install it using `pip`:

```bash
pip install PyPDF2
```

Here's a Python script to accomplish the task:

```python
import PyPDF2
import sys

def extract_pdf_text(pdf_path, output_path):
    try:
        with open(pdf_path, 'rb') as pdf_file:
            print(f"Reading PDF file: {pdf_path}")
            pdf_reader = PyPDF2.PdfFileReader(pdf_file)

            if pdf_reader.isEncrypted:
                print("The PDF file is encrypted. Unable to extract text.")
                return False

            total_pages = pdf_reader.numPages
            print(f"Total pages: {total_pages}")

            with open(output_path, 'w', encoding='utf-8') as output_file:
                print(f"Extracting text to: {output_path}")
                for page in range(total_pages):
                    text = pdf_reader.getPage(page).extractText()
                    output_file.write(text)
                print("Text extraction completed.")
                return True
    except FileNotFoundError:
        print(f"Error: The file {pdf_path} was not found.")
        return False
    except PyPDF2.utils.PdfReadError:
        print(f"Error: Unable to read the PDF file {pdf_path}")
        return False
    except Exception as e:
        print(f"Error: An unexpected error occurred: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script_name.py input_pdf_path output_txt_path")
    else:
        input_pdf_path = sys.argv[1]
        output_txt_path = sys.argv[2]
        extract_pdf_text(input_pdf_path, output_txt_path)
```

To use the script, save it as `pdf_to_text.py` and then run it from the command line with the input and output file paths as command-line arguments:

```bash
python pdf_to_text.py input.pdf output.txt
```

The script reads the PDF file, checks if it's encrypted, and then extracts the text from each page to a text file. It also includes error handling and progress messages.