
import sys
import glob
import os

def extract_text(pdf_path):
    print(f"Processing {pdf_path}...")
    text = ""
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    except ImportError:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(pdf_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except ImportError:
            print("Error: neither pypdf nor PyPDF2 is installed.")
            return None
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return None
    return text

files = glob.glob("sources/*.pdf")
with open("pdf_content.txt", "w", encoding="utf-8") as outfile:
    for f in files:
        content = extract_text(f)
        if content:
            outfile.write(f"--- START CONTENT OF {f} ---\n")
            outfile.write(content)
            outfile.write(f"\n--- END CONTENT OF {f} ---\n")
print("Done extracting text to pdf_content.txt")
