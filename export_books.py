import sqlite3
import json
import csv
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "library.db")
JSON_OUTPUT = os.path.join(os.path.dirname(__file__), "books_list.json")
CSV_OUTPUT = os.path.join(os.path.dirname(__file__), "books_list.csv")

def export_books():
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file not found at {DB_FILE}")
        return

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, title, author, isbn, category, total_copies, available_copies, cover_url, added_date FROM books")
        rows = cursor.fetchall()
        books = [dict(row) for row in rows]

        # Export to JSON
        with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(books, f, indent=2, ensure_ascii=False)
        print(f"Successfully exported {len(books)} books to {JSON_OUTPUT}")

        # Export to CSV
        if books:
            keys = books[0].keys()
            with open(CSV_OUTPUT, 'w', newline='', encoding='utf-8') as f:
                dict_writer = csv.DictWriter(f, fieldnames=keys)
                dict_writer.writeheader()
                dict_writer.writerows(books)
            print(f"Successfully exported {len(books)} books to {CSV_OUTPUT}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    export_books()
