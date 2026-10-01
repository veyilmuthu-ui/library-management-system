# pyright: basic

import os
import json
import sqlite3
import hashlib
import datetime
import uuid
import base64
import hmac
import re
import threading
import time
from http.cookies import SimpleCookie
from email.parser import BytesParser
from email.policy import default
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_FILE = os.path.join(os.path.dirname(__file__), "library.db")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
AUTH_SECRET = os.getenv('AUTH_SECRET', 'development-only-change-this-secret').encode('utf-8')
EMAIL_TYPES = {'CUSTOM', 'BOOK_ISSUED', 'BOOK_RETURNED', 'DUE_REMINDER', 'OVERDUE', 'FINE', 'WELCOME'}
STUDENT_LOGIN_RANGES = [
    # es24ad01 .. es24ad183 -> password AD@20yyXXX (yy=24, XXX=last 3 digits of id)
    {"prefix": "es24ad", "start": 1, "end": 183, "width": 2, "type": "year", "year": "24"},
    # es23ad1 .. es23ad120 -> password AD@20yyXXX (yy=23, XXX=last 3 digits of id)
    {"prefix": "es23ad", "start": 1, "end": 120, "width": 1, "type": "year", "year": "23"},
    # es24lad01 .. es24lad02 -> password AD@24LASS (SS=last 2 digits of id)
    {"prefix": "es24lad", "start": 1, "end": 2, "width": 2, "type": "lad24"},
    # es25lad02 .. es25lad07 -> password AD@LAD25CCC (CCC=last 3 digits of id)
    {"prefix": "es25lad", "start": 2, "end": 7, "width": 2, "type": "lad25"},
]

DEFAULT_LOGIN_USERS = [
    ("Admin Panel", "admin", "admin@esec.edu", "password", "admin"),
    ("Teacher Smith", "teacher_smith", "teacher.smith@esec.edu", "password", "teacher"),
]

def make_password_hash(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def student_suffix(number, width):
    return str(number).zfill(width)

def student_username(range_def, number):
    return f"{range_def['prefix']}{student_suffix(number, range_def['width'])}"

def student_password(range_def, number):
    if range_def["type"] == "year":
        return f"AD@20{range_def['year']}{number:03d}"
    if range_def["type"] == "lad24":
        return f"AD@24LA{number:02d}"
    if range_def["type"] == "lad25":
        return f"AD@LAD25{number:03d}"
    raise ValueError(f"Unknown student password type: {range_def['type']}")

def student_email(range_def, number):
    return f"{student_username(range_def, number)}@esec.edu"

def student_display_name(range_def, number):
    return f"Student {student_username(range_def, number).upper()}"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_users_schema(cursor):
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cursor.fetchall()}
    if "username" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)")

def upsert_login_user(cursor, name, username, email, password, role, created_date):
    username = username.strip().lower()
    email = email.strip().lower()
    cursor.execute(
        "SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?",
        (email, username)
    )
    existing = cursor.fetchone()
    password_hash = make_password_hash(password)

    if existing:
        cursor.execute(
            """
            UPDATE users
            SET name = ?, username = ?, email = ?, password_hash = ?, role = ?
            WHERE id = ?
            """,
            (name, username, email, password_hash, role, existing["id"])
        )
    else:
        cursor.execute(
            """
            INSERT INTO users (name, username, email, password_hash, role, created_date)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name, username, email, password_hash, role, created_date)
        )

def seed_login_users(cursor):
    today = datetime.date.today().isoformat()
    for name, username, email, password, role in DEFAULT_LOGIN_USERS:
        upsert_login_user(cursor, name, username, email, password, role, today)

    for range_def in STUDENT_LOGIN_RANGES:
        for number in range(range_def["start"], range_def["end"] + 1):
            upsert_login_user(
                cursor,
                student_display_name(range_def, number),
                student_username(range_def, number),
                student_email(range_def, number),
                student_password(range_def, number),
                "student",
                today
            )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create books table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            total_copies INTEGER NOT NULL DEFAULT 1,
            available_copies INTEGER NOT NULL DEFAULT 1,
            cover_url TEXT,
            added_date TEXT NOT NULL
        )
    ''')
    
    # Create members table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            membership_type TEXT NOT NULL DEFAULT 'Standard',
            join_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active'
        )
    ''')
    
    # Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            issue_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            return_date TEXT,
            status TEXT NOT NULL DEFAULT 'Issued',
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (member_id) REFERENCES members (id)
        )
    ''')

    # Create users table (for login / signup)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            created_date TEXT NOT NULL
        )
    ''')
    ensure_users_schema(cursor)

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient TEXT NOT NULL,
            recipient_name TEXT,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            email_type TEXT NOT NULL DEFAULT 'CUSTOM',
            status TEXT NOT NULL DEFAULT 'PENDING',
            error_message TEXT,
            sent_at TEXT,
            related_student_id INTEGER,
            related_book_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    
    # Seed sample data if books table is empty
    cursor.execute('SELECT COUNT(*) FROM books')
    if cursor.fetchone()[0] == 0:
        seed_sample_data(cursor)
        conn.commit()

    seed_login_users(cursor)
    conn.commit()
        
    conn.close()

def seed_sample_data(cursor):
    today = datetime.date.today().isoformat()
    due_in_14 = (datetime.date.today() + datetime.timedelta(days=14)).isoformat()
    due_past = (datetime.date.today() - datetime.timedelta(days=3)).isoformat()
    issue_past = (datetime.date.today() - datetime.timedelta(days=17)).isoformat()
    
    sample_books = [
        ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "Fiction", 5, 4, "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80", today),
        ("To Kill a Mockingbird", "Harper Lee", "9780061120084", "Fiction", 3, 2, "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80", today),
        ("1984", "George Orwell", "9780451524935", "Sci-Fi", 4, 4, "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80", today),
        ("Clean Code", "Robert C. Martin", "9780132350884", "Technology", 6, 5, "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80", today),
        ("Design Patterns", "Erich Gamma et al.", "9780201633610", "Technology", 2, 2, "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80", today),
        ("Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "9780062316097", "History", 4, 3, "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80", today),
    ]
    cursor.executemany('''
        INSERT INTO books (title, author, isbn, category, total_copies, available_copies, cover_url, added_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', sample_books)
    
    sample_members = [
        ("Alice Smith", "alice@example.com", "+1 555-0192", "Premium", today, "Active"),
        ("Bob Johnson", "bob@example.com", "+1 555-0183", "Standard", today, "Active"),
        ("Carol White", "carol@example.com", "+1 555-0174", "Student", today, "Active"),
        ("David Black", "david@example.com", "+1 555-0165", "Standard", today, "Active")
    ]
    cursor.executemany('''
        INSERT INTO members (name, email, phone, membership_type, join_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', sample_members)
    
    sample_txs = [
        (1, 1, today, due_in_14, None, "Issued"),
        (2, 2, today, due_in_14, None, "Issued"),
        (4, 3, issue_past, due_past, None, "Overdue"),
        (6, 4, today, due_in_14, None, "Issued"),
    ]
    cursor.executemany('''
        INSERT INTO transactions (book_id, member_id, issue_date, due_date, return_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', sample_txs)


def make_auth_cookie(user_id, role):
    payload = f'{user_id}:{role}'.encode('utf-8')
    signature = hmac.new(AUTH_SECRET, payload, hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(payload).decode('ascii') + '.' + signature


def process_automatic_email_reminders():
    """Send each due-soon or overdue reminder at most once per day."""
    from email_service import send_due_reminder_email, send_overdue_email

    today = datetime.date.today()
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT t.id, t.due_date, m.id AS student_id, m.name AS student_name, m.email,
               b.id AS book_id, b.title
        FROM transactions t
        JOIN members m ON m.id = t.member_id
        JOIN books b ON b.id = t.book_id
        WHERE t.status IN ('Issued', 'Overdue') AND m.email IS NOT NULL AND m.email != ''
    ''').fetchall()
    for row in rows:
        try:
            days_until_due = (datetime.date.fromisoformat(row['due_date']) - today).days
        except ValueError:
            continue
        email_type = 'DUE_REMINDER' if 0 <= days_until_due <= 2 else 'OVERDUE' if days_until_due < 0 else None
        if not email_type:
            continue
        already_sent = conn.execute('''
            SELECT 1 FROM email_logs
            WHERE email_type = ? AND related_student_id = ? AND related_book_id = ?
              AND date(created_at) = date(?, 'localtime')
        ''', (email_type, row['student_id'], row['book_id'], today.isoformat())).fetchone()
        if already_sent:
            continue
        student = {'id': row['student_id'], 'name': row['student_name'], 'email': row['email']}
        book = {'id': row['book_id'], 'title': row['title']}
        if email_type == 'DUE_REMINDER':
            send_due_reminder_email(student, book, row['due_date'], days_until_due)
        else:
            overdue_days = abs(days_until_due)
            send_overdue_email(student, book, row['due_date'], overdue_days, overdue_days * 0.5)
    conn.close()


def start_email_reminder_worker():
    def worker():
        while True:
            try:
                process_automatic_email_reminders()
            except Exception as error:
                print(f'Automatic email reminder error: {error}')
            time.sleep(3600)

    threading.Thread(target=worker, daemon=True, name='email-reminder-worker').start()


class LibraryRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path.startswith('/api/'):
            return self.handle_api_get(path, parse_qs(parsed_path.query))
        else:
            if path in ('/admin/email', '/admin/email-history'):
                self.path = '/index.html'
            if path == '/' or path == '':
                self.path = '/index.html'
            return super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        if path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b'{}'
            if path == '/api/books' and self.headers.get('Content-Type', '').startswith('multipart/form-data'):
                data = self.parse_book_multipart(body)
            else:
                try:
                    data = json.loads(body.decode('utf-8'))
                except Exception:
                    data = {}
            # Route auth endpoints separately
            if path in ('/api/login', '/api/register'):
                return self.handle_auth_post(path, data)
            if path.startswith('/api/notifications/'):
                return self.handle_loan_notification_post(path, data)
            if path.startswith('/api/admin/') or path.startswith('/api/email/'):
                return self.handle_admin_email_post(path, data)
            return self.handle_api_post(path, data)
        self.send_error(404, "Endpoint not found")

    def parse_book_multipart(self, body):
        content_type = self.headers.get('Content-Type', '')
        message = BytesParser(policy=default).parsebytes(
            f'Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n'.encode('utf-8') + body
        )
        data = {}
        for part in message.iter_parts():
            field_name = part.get_param('name', header='content-disposition')
            if not field_name:
                continue
            file_name = part.get_filename()
            payload = part.get_payload(decode=True)
            value = payload if isinstance(payload, bytes) else str(payload or '').encode('utf-8')
            if file_name:
                data['cover_file_name'] = os.path.basename(file_name)
                data['cover_content_type'] = part.get_content_type()
                data['cover_data'] = value
            else:
                data[field_name] = value.decode('utf-8', errors='replace').strip()
        return data

    # ---------- Auth helpers ----------
    @staticmethod
    def hash_password(password):
        return make_password_hash(password)

    def handle_auth_post(self, path, data):
        """Handle /api/login and /api/register."""
        conn   = get_db_connection()
        cursor = conn.cursor()

        if path == '/api/register':
            name     = (data.get('name') or '').strip()
            email    = (data.get('email') or '').strip().lower()
            username = (data.get('username') or '').strip().lower()
            password = data.get('password') or ''
            role     = data.get('role') or 'member'

            if not name or not email or not password:
                conn.close()
                return self.send_json({'error': 'Name, email and password are required.'}, 400)
            if len(password) < 8:
                conn.close()
                return self.send_json({'error': 'Password must be at least 8 characters.'}, 400)
            if role not in ('admin', 'teacher', 'student', 'member'):
                role = 'member'
            if role == 'admin' and not self.get_authenticated_user():
                role = 'member'

            # Check duplicate email or username
            if username:
                cursor.execute('SELECT id FROM users WHERE email = ? OR username = ?', (email, username))
            else:
                cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            if cursor.fetchone():
                conn.close()
                return self.send_json({'error': 'An account with that email or username already exists.'}, 409)

            pw_hash  = self.hash_password(password)
            today    = datetime.date.today().isoformat()
            cursor.execute(
                'INSERT INTO users (name, username, email, password_hash, role, created_date) VALUES (?, ?, ?, ?, ?, ?)',
                (name, username or None, email, pw_hash, role, today)
            )
            conn.commit()
            conn.close()
            return self.send_json({'success': True, 'message': 'Account created successfully.'})

        if path == '/api/login':
            login_id = (data.get('username') or data.get('email') or '').strip().lower()
            password = data.get('password') or ''

            if not login_id or not password:
                conn.close()
                return self.send_json({'error': 'Username/email and password are required.'}, 400)

            pw_hash = self.hash_password(password)
            cursor.execute(
                '''
                SELECT id, name, username, email, role
                FROM users
                WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND password_hash = ?
                ''',
                (login_id, login_id, pw_hash)
            )
            user = cursor.fetchone()
            conn.close()
            if user:
                return self.send_json_with_cookie({
                    'success': True,
                    'user': {'id': user['id'], 'name': user['name'],
                             'username': user['username'], 'email': user['email'],
                             'role': user['role']}
                }, f"library_auth={make_auth_cookie(user['id'], user['role'])}; HttpOnly; SameSite=Lax; Path=/")
            return self.send_json({'error': 'Invalid username/email or password.'}, 401)

        self.send_error(404, "Endpoint not found")

    def do_PUT(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        if path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b'{}'
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception:
                data = {}
            return self.handle_api_put(path, data)
        self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        if path.startswith('/api/'):
            return self.handle_api_delete(path)
        self.send_error(404, "Endpoint not found")

    def get_authenticated_user(self):
        cookie = SimpleCookie(self.headers.get('Cookie', ''))
        token = cookie.get('library_auth')
        if not token or '.' not in token.value:
            return None
        encoded_payload, signature = token.value.split('.', 1)
        try:
            payload = base64.urlsafe_b64decode(encoded_payload.encode('ascii'))
            expected = hmac.new(AUTH_SECRET, payload, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected):
                return None
            user_id, role = payload.decode('utf-8').split(':', 1)
            conn = get_db_connection()
            user = conn.execute('SELECT id, name, username, email, role FROM users WHERE id = ?', (int(user_id),)).fetchone()
            conn.close()
            return dict(user) if user and user['role'] == role else None
        except (ValueError, TypeError, UnicodeDecodeError):
            return None

    def require_admin(self):
        user = self.get_authenticated_user()
        if not user or user['role'] != 'admin':
            self.send_json({'error': 'Administrator authentication required'}, 403)
            return None
        return user

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_json_with_cookie(self, data, cookie, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Set-Cookie', cookie)
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def handle_admin_email_post(self, path, data):
        if not self.require_admin():
            return
        from email_service import send_email

        if path == '/api/admin/send-overdue-reminders':
            today = datetime.date.today()
            conn = get_db_connection()
            overdue_rows = conn.execute('''
                SELECT t.id, t.due_date, m.id AS student_id, m.name AS student_name, m.email,
                       b.id AS book_id, b.title
                FROM transactions t
                JOIN members m ON m.id = t.member_id
                JOIN books b ON b.id = t.book_id
                WHERE t.status IN ('Issued', 'Overdue') AND date(t.due_date) < date(?) AND m.email IS NOT NULL
            ''', (today.isoformat(),)).fetchall()
            sent = 0
            skipped = 0
            for row in overdue_rows:
                already_sent = conn.execute('''
                    SELECT 1 FROM email_logs
                    WHERE email_type = 'OVERDUE' AND related_student_id = ? AND related_book_id = ?
                      AND date(created_at) = date(?, 'localtime')
                ''', (row['student_id'], row['book_id'], today.isoformat())).fetchone()
                if already_sent:
                    skipped += 1
                    continue
                overdue_days = (today - datetime.date.fromisoformat(row['due_date'])).days
                subject = f"Overdue Library Book - {row['title']}"
                message = (f"Dear {row['student_name']},\n\nYour book is {overdue_days} day(s) overdue.\n\n"
                           f"Book: {row['title']}\nDue date: {row['due_date']}\n"
                           f"Fine amount: {overdue_days * 0.5:.2f}\n\nESEC AI&DS Library")
                send_email(row['email'], subject, message, 'OVERDUE', row['student_name'], row['student_id'], row['book_id'])
                sent += 1
            conn.close()
            return self.send_json({'success': True, 'sent': sent, 'skipped': skipped})

        if path in ('/api/admin/send-email', '/api/email/send'):
            email_type = (data.get('email_type') or 'CUSTOM').strip().upper()
            recipient = (data.get('recipient') or '').strip()
            student_id = data.get('student_id')
            book_id = data.get('book_id')
            if email_type not in EMAIL_TYPES:
                return self.send_json({'error': 'Unsupported email type'}, 400)
            if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', recipient):
                return self.send_json({'error': 'A valid recipient email is required'}, 400)

            conn = get_db_connection()
            student = None
            book = None
            try:
                if student_id:
                    student = conn.execute('SELECT id, name, email FROM members WHERE id = ?', (int(student_id),)).fetchone()
                    if not student:
                        return self.send_json({'error': 'Student not found'}, 404)
                    recipient = student['email']
                    if not recipient:
                        return self.send_json({'error': 'Selected student has no email address'}, 400)
                if book_id:
                    book = conn.execute('SELECT id, title FROM books WHERE id = ?', (int(book_id),)).fetchone()
                    if not book:
                        return self.send_json({'error': 'Book not found'}, 404)
                subject = (data.get('subject') or '').strip()
                message = (data.get('message') or '').strip()
                if len(subject) > 200 or len(message) > 10000:
                    return self.send_json({'error': 'Subject or message is too long'}, 400)
                if not subject or not message:
                    return self.send_json({'error': 'Subject and message are required'}, 400)
                recipient_name = student['name'] if student else (data.get('recipient_name') or '').strip()
                if email_type == 'WELCOME' and student:
                    subject = subject or f"Welcome to ESEC AI&DS Library, {student['name']}"
                success, log_id, error = send_email(
                    recipient, subject, message, email_type, recipient_name,
                    student['id'] if student else None, book['id'] if book else None
                )
                return self.send_json({
                    'success': success,
                    'id': log_id,
                    'message': 'Email sent successfully' if success else 'Unable to send email',
                    'error': error
                }, 200 if success else 502)
            except (TypeError, ValueError):
                return self.send_json({'error': 'Invalid student or book ID'}, 400)
            finally:
                conn.close()

        if path.startswith('/api/admin/email/') and path.endswith('/retry'):
            try:
                email_id = int(path.split('/')[-2])
            except ValueError:
                return self.send_json({'error': 'Invalid email ID'}, 400)
            conn = get_db_connection()
            log = conn.execute('SELECT * FROM email_logs WHERE id = ?', (email_id,)).fetchone()
            conn.close()
            if not log:
                return self.send_json({'error': 'Email log not found'}, 404)
            if log['status'] != 'FAILED':
                return self.send_json({'error': 'Only failed emails can be retried'}, 400)
            success, _, error = send_email(
                log['recipient'], log['subject'], log['message'], log['email_type'],
                log['recipient_name'] or '', log['related_student_id'], log['related_book_id'], email_id
            )
            return self.send_json({'success': success, 'error': error}, 200 if success else 502)

        return self.send_json({'error': 'Email endpoint not found'}, 404)

    def handle_loan_notification_post(self, path, data):
        """Notify from the active localStorage circulation UI after its local save."""
        user = self.get_authenticated_user()
        if not user or user['role'] not in ('admin', 'teacher'):
            return self.send_json({'error': 'Staff authentication required'}, 403)
        from email_service import send_due_reminder_email, send_email_async, send_overdue_email

        recipient = (data.get('recipient') or '').strip()
        name = (data.get('recipient_name') or 'Library member').strip()
        title = (data.get('book_title') or '').strip()
        due_date = (data.get('due_date') or '').strip()
        if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', recipient) or not title or not due_date:
            return self.send_json({'error': 'Valid recipient, book title, and due date are required'}, 400)
        book = {'id': data.get('book_id'), 'title': title}
        student = {'id': data.get('member_id'), 'name': name, 'email': recipient}
        if path == '/api/notifications/loan-issued':
            subject = f'Library Book Issued - {title}'
            body = (f'Hello {name},\n\nYour book "{title}" is due on {due_date}. '
                    'Please return or renew it before the due date to avoid a fine.\n\nESEC AI&DS Library')
            log_id = send_email_async(recipient, subject, body, 'BOOK_ISSUED', name, None, None)
        elif path == '/api/notifications/book-returned':
            subject = f'Library Book Returned - {title}'
            body = f'Dear {name},\n\nYour return of "{title}" was recorded today.\n\nESEC AI&DS Library'
            log_id = send_email_async(recipient, subject, body, 'BOOK_RETURNED', name, None, None)
        elif path == '/api/notifications/due-reminder':
            days_remaining = int(data.get('days_remaining', 0))
            log_id = send_due_reminder_email(student, book, due_date, days_remaining)
        elif path == '/api/notifications/overdue':
            overdue_days = int(data.get('overdue_days', 1))
            log_id = send_overdue_email(student, book, due_date, overdue_days, overdue_days * 0.5)
        else:
            return self.send_json({'error': 'Notification endpoint not found'}, 404)
        return self.send_json({'success': True, 'log_id': log_id, 'message': 'Email queued for delivery'}, 202)

    # API Handlers
    def handle_api_get(self, path, params):
        conn = get_db_connection()
        cursor = conn.cursor()

        if path in ('/api/admin/email-history', '/api/email/history', '/api/email/stats') or (path.startswith('/api/admin/email/') and not path.endswith('/retry')):
            if not self.require_admin():
                conn.close()
                return
            if path in ('/api/admin/email-history', '/api/email/history'):
                query = params.get('q', [''])[0].strip().lower()
                email_type = params.get('type', [''])[0].strip().upper()
                status = params.get('status', [''])[0].strip().upper()
                conditions, args = [], []
                if query:
                    conditions.append('(LOWER(recipient) LIKE ? OR LOWER(recipient_name) LIKE ? OR LOWER(subject) LIKE ?)')
                    args.extend([f'%{query}%'] * 3)
                if email_type in EMAIL_TYPES:
                    conditions.append('email_type = ?')
                    args.append(email_type)
                if status in ('SENT', 'FAILED', 'PENDING'):
                    conditions.append('status = ?')
                    args.append(status)
                where = ' WHERE ' + ' AND '.join(conditions) if conditions else ''
                cursor.execute(f'SELECT * FROM email_logs{where} ORDER BY id DESC LIMIT 100', args)
                logs = [dict(row) for row in cursor.fetchall()]
                conn.close()
                return self.send_json(logs)
            if path == '/api/email/stats':
                from email_service import mail_configuration_status
                cursor.execute("SELECT COUNT(*) AS total, SUM(status = 'SENT') AS sent, SUM(status = 'FAILED') AS failed FROM email_logs")
                stats = cursor.fetchone()
                conn.close()
                return self.send_json({
                    'total': stats['total'] or 0,
                    'successful': stats['sent'] or 0,
                    'failed': stats['failed'] or 0,
                    'mail': mail_configuration_status()
                })
            if path.startswith('/api/admin/email/'):
                try:
                    email_id = int(path.rsplit('/', 1)[1])
                except ValueError:
                    conn.close()
                    return self.send_json({'error': 'Invalid email ID'}, 400)
                cursor.execute('SELECT * FROM email_logs WHERE id = ?', (email_id,))
                log = cursor.fetchone()
                conn.close()
                return self.send_json(dict(log) if log else {'error': 'Email log not found'}, 200 if log else 404)
        
        if path == '/api/stats':
            cursor.execute('SELECT COUNT(*) FROM books')
            total_books = cursor.fetchone()[0]
            cursor.execute('SELECT SUM(total_copies), SUM(available_copies) FROM books')
            row = cursor.fetchone()
            total_copies = row[0] or 0
            available_copies = row[1] or 0
            
            cursor.execute('SELECT COUNT(*) FROM members WHERE status = "Active"')
            active_members = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM transactions WHERE status = "Issued" OR status = "Overdue"')
            active_loans = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM transactions WHERE status = "Overdue"')
            overdue_loans = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM email_logs WHERE status = 'SENT'")
            emails_sent = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM email_logs WHERE status = 'FAILED'")
            emails_failed = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM email_logs WHERE status = 'PENDING'")
            emails_pending = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM email_logs WHERE status = 'SENT' AND date(sent_at) = date('now', 'localtime')")
            emails_today = cursor.fetchone()[0]
            
            conn.close()
            return self.send_json({
                "total_books": total_books,
                "total_copies": total_copies,
                "available_copies": available_copies,
                "active_members": active_members,
                "active_loans": active_loans,
                "overdue_loans": overdue_loans,
                "emails_sent": emails_sent,
                "emails_failed": emails_failed,
                "emails_pending": emails_pending,
                "emails_today": emails_today
            })
            
        elif path == '/api/books':
            search = params.get('q', [''])[0].strip().lower()
            category = params.get('category', [''])[0].strip()
            
            query = 'SELECT * FROM books WHERE 1=1'
            args = []
            if search:
                query += ' AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR isbn LIKE ?)'
                args.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
            if category:
                query += ' AND category = ?'
                args.append(category)
                
            query += ' ORDER BY id DESC'
            cursor.execute(query, args)
            books = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json(books)

        elif path == '/api/categories':
            cursor.execute('SELECT DISTINCT category FROM books')
            categories = [r[0] for r in cursor.fetchall()]
            conn.close()
            return self.send_json(categories)

        elif path == '/api/members':
            cursor.execute('SELECT * FROM members ORDER BY id DESC')
            members = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json(members)

        elif path == '/api/transactions':
            cursor.execute('''
                SELECT t.*, b.title as book_title, b.isbn, m.name as member_name, m.email as member_email
                FROM transactions t
                JOIN books b ON t.book_id = b.id
                JOIN members m ON t.member_id = m.id
                ORDER BY t.id DESC
            ''')
            txs = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json(txs)

        conn.close()
        self.send_error(404, "API endpoint not found")

    def handle_api_post(self, path, data):
        conn = get_db_connection()
        cursor = conn.cursor()

        if path == '/api/books':
            title = data.get('title', '').strip()
            author = data.get('author', '').strip()
            isbn = data.get('isbn', '').strip()
            category = data.get('category', 'General').strip()
            total_copies = int(data.get('total_copies', 1))
            cover_url = data.get('cover_url', '').strip()
            cover_data = data.get('cover_data')
            today = datetime.date.today().isoformat()

            if not title or not author or not isbn:
                conn.close()
                return self.send_json({'error': 'Title, Author, and ISBN are required'}, 400)
            if cover_data is not None:
                if data.get('cover_content_type', '') not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif'):
                    conn.close()
                    return self.send_json({'error': 'Cover must be a PNG, JPG, JPEG, WEBP, or GIF image'}, 400)
                if len(cover_data) == 0 or len(cover_data) > 5 * 1024 * 1024:
                    conn.close()
                    return self.send_json({'error': 'Cover image must be between 1 byte and 5MB'}, 400)
                os.makedirs(UPLOAD_DIR, exist_ok=True)
                extension = os.path.splitext(data.get('cover_file_name', 'cover'))[1].lower()
                if extension not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                    extension = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif'}[data['cover_content_type']]
                file_name = f'{uuid.uuid4().hex}{extension}'
                with open(os.path.join(UPLOAD_DIR, file_name), 'wb') as image_file:
                    image_file.write(cover_data)
                cover_url = f'/uploads/{file_name}'
            elif not cover_url:
                conn.close()
                return self.send_json({'error': 'A book cover image is required'}, 400)

            try:
                cursor.execute('''
                    INSERT INTO books (title, author, isbn, category, total_copies, available_copies, cover_url, added_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (title, author, isbn, category, total_copies, total_copies, cover_url, today))
                conn.commit()
                new_id = cursor.lastrowid
                conn.close()
                return self.send_json({'message': 'Book added successfully', 'id': new_id}, 201)
            except sqlite3.IntegrityError:
                conn.close()
                return self.send_json({'error': 'ISBN already exists'}, 400)

        elif path == '/api/members':
            name = data.get('name', '').strip()
            email = data.get('email', '').strip()
            phone = data.get('phone', '').strip()
            membership_type = data.get('membership_type', 'Standard').strip()
            today = datetime.date.today().isoformat()

            if not name or not email:
                conn.close()
                return self.send_json({'error': 'Name and Email are required'}, 400)

            try:
                cursor.execute('''
                    INSERT INTO members (name, email, phone, membership_type, join_date, status)
                    VALUES (?, ?, ?, ?, ?, 'Active')
                ''', (name, email, phone, membership_type, today))
                conn.commit()
                new_id = cursor.lastrowid
                conn.close()
                return self.send_json({'message': 'Member registered successfully', 'id': new_id}, 201)
            except sqlite3.IntegrityError:
                conn.close()
                return self.send_json({'error': 'Email already registered'}, 400)

        elif path == '/api/transactions/issue':
            book_id = int(data.get('book_id', 0))
            member_id = int(data.get('member_id', 0))
            days = int(data.get('days', 14))

            if not book_id or not member_id:
                conn.close()
                return self.send_json({'error': 'Book and Member selection are required'}, 400)

            cursor.execute('SELECT available_copies FROM books WHERE id = ?', (book_id,))
            book = cursor.fetchone()
            if not book or book['available_copies'] <= 0:
                conn.close()
                return self.send_json({'error': 'Book is currently not available'}, 400)

            today = datetime.date.today().isoformat()
            due = (datetime.date.today() + datetime.timedelta(days=days)).isoformat()

            cursor.execute('''
                INSERT INTO transactions (book_id, member_id, issue_date, due_date, status)
                VALUES (?, ?, ?, ?, 'Issued')
            ''', (book_id, member_id, today, due))

            cursor.execute('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', (book_id,))
            conn.commit()
            notification_data = cursor.execute('''
                SELECT m.id as student_id, m.name as student_name, m.email,
                       b.id as book_id, b.title, t.issue_date, t.due_date
                FROM transactions t
                JOIN members m ON m.id = t.member_id
                JOIN books b ON b.id = t.book_id
                WHERE t.id = ?
            ''', (cursor.lastrowid,)).fetchone()
            conn.close()
            if notification_data and notification_data['email']:
                from email_service import send_book_issued_email
                send_book_issued_email(
                    {'id': notification_data['student_id'], 'name': notification_data['student_name'], 'email': notification_data['email']},
                    {'id': notification_data['book_id'], 'title': notification_data['title']},
                    notification_data['issue_date'], notification_data['due_date']
                )
            return self.send_json({'message': 'Book issued successfully'}, 201)

        elif path == '/api/transactions/return':
            tx_id = int(data.get('transaction_id', 0))
            if not tx_id:
                conn.close()
                return self.send_json({'error': 'Transaction ID required'}, 400)

            cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,))
            tx = cursor.fetchone()
            if not tx or tx['status'] == 'Returned':
                conn.close()
                return self.send_json({'error': 'Transaction invalid or already returned'}, 400)

            today = datetime.date.today().isoformat()
            cursor.execute('UPDATE transactions SET return_date = ?, status = "Returned" WHERE id = ?', (today, tx_id))
            cursor.execute('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', (tx['book_id'],))
            conn.commit()
            notification_data = cursor.execute('''
                SELECT m.id as student_id, m.name as student_name, m.email,
                       b.id as book_id, b.title
                FROM transactions t
                JOIN members m ON m.id = t.member_id
                JOIN books b ON b.id = t.book_id
                WHERE t.id = ?
            ''', (tx_id,)).fetchone()
            conn.close()
            if notification_data and notification_data['email']:
                from email_service import send_book_returned_email
                send_book_returned_email(
                    {'id': notification_data['student_id'], 'name': notification_data['student_name'], 'email': notification_data['email']},
                    {'id': notification_data['book_id'], 'title': notification_data['title']},
                    today
                )
            return self.send_json({'message': 'Book returned successfully'})

        conn.close()
        self.send_error(404, "Endpoint not found")

    def handle_api_put(self, path, data):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if path.startswith('/api/books/'):
            book_id = int(path.split('/')[-1])
            title = data.get('title', '').strip()
            author = data.get('author', '').strip()
            category = data.get('category', '').strip()
            total_copies = int(data.get('total_copies', 1))

            cursor.execute('SELECT total_copies, available_copies FROM books WHERE id = ?', (book_id,))
            existing = cursor.fetchone()
            if not existing:
                conn.close()
                return self.send_json({'error': 'Book not found'}, 404)

            diff = total_copies - existing['total_copies']
            new_available = existing['available_copies'] + diff
            if new_available < 0:
                conn.close()
                return self.send_json({'error': 'Total copies cannot be lower than currently issued copies'}, 400)

            cursor.execute('''
                UPDATE books
                SET title = ?, author = ?, category = ?, total_copies = ?, available_copies = ?
                WHERE id = ?
            ''', (title, author, category, total_copies, new_available, book_id))
            conn.commit()
            conn.close()
            return self.send_json({'message': 'Book updated successfully'})

        conn.close()
        self.send_error(404, "Endpoint not found")

    def handle_api_delete(self, path):
        conn = get_db_connection()
        cursor = conn.cursor()

        if path.startswith('/api/books/'):
            book_id = int(path.split('/')[-1])
            cursor.execute('SELECT COUNT(*) FROM transactions WHERE book_id = ? AND status != "Returned"', (book_id,))
            if cursor.fetchone()[0] > 0:
                conn.close()
                return self.send_json({'error': 'Cannot delete book with active loans'}, 400)

            cursor.execute('DELETE FROM books WHERE id = ?', (book_id,))
            conn.commit()
            conn.close()
            return self.send_json({'message': 'Book deleted successfully'})

        elif path.startswith('/api/members/'):
            member_id = int(path.split('/')[-1])
            cursor.execute('SELECT COUNT(*) FROM transactions WHERE member_id = ? AND status != "Returned"', (member_id,))
            if cursor.fetchone()[0] > 0:
                conn.close()
                return self.send_json({'error': 'Cannot delete member with active borrowed books'}, 400)

            cursor.execute('DELETE FROM members WHERE id = ?', (member_id,))
            conn.commit()
            conn.close()
            return self.send_json({'message': 'Member deleted successfully'})

        conn.close()
        self.send_error(404, "Endpoint not found")


def main():
    init_db()
    start_email_reminder_worker()
    if not os.path.exists(STATIC_DIR):
        os.makedirs(STATIC_DIR)
        
    port = int(os.environ.get('PORT', '8000'))
    server_address = ('', port)
    httpd = HTTPServer(server_address, LibraryRequestHandler)
    print(f"Server started on http://127.0.0.1:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    main()
