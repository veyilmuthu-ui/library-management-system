# pyright: basic

import datetime
import os
import smtplib
import sqlite3
import threading
import re
from pathlib import Path
from html import escape
from email.message import EmailMessage

try:
    from dotenv import load_dotenv
except ImportError:  # Optional until requirements are installed.
    load_dotenv = None

if load_dotenv:
    load_dotenv()

MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
MAIL_PORT = int(os.getenv('MAIL_PORT', '465'))
MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'False').lower() == 'true'
MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'True').lower() == 'true'
MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', MAIL_USERNAME)
TEMPLATE_DIR = Path(__file__).resolve().parent / 'templates' / 'emails'


def mail_configuration_status():
    configured = all((MAIL_USERNAME, MAIL_PASSWORD, MAIL_DEFAULT_SENDER))
    placeholders = any(value and ('your-' in value or 'replace-with' in value) for value in (
        MAIL_USERNAME, MAIL_PASSWORD, MAIL_DEFAULT_SENDER
    ))
    return {
        'configured': configured and not placeholders,
        'server': MAIL_SERVER,
        'port': MAIL_PORT,
        'ssl': MAIL_USE_SSL,
        'username': MAIL_USERNAME if configured and not placeholders else ''
    }


def render_email_template(template_name, values):
    template = (TEMPLATE_DIR / template_name).read_text(encoding='utf-8')
    for key, value in values.items():
        template = template.replace('{{ ' + key + ' }}', escape(str(value)))
    return template


def create_email_log(recipient, recipient_name, subject, message, email_type='CUSTOM', student_id=None, book_id=None):
    from app import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO email_logs
        (recipient, recipient_name, subject, message, email_type, status, error_message,
         sent_at, related_student_id, related_book_id)
        VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, NULL, ?, ?)
    ''', (recipient, recipient_name, subject, message, email_type, student_id, book_id))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


def _update_email_log(log_id, status, error_message=None):
    from app import get_db_connection
    conn = get_db_connection()
    conn.execute('''
        UPDATE email_logs
        SET status = ?, error_message = ?, sent_at = ?
        WHERE id = ?
    ''', (status, error_message, datetime.datetime.now().isoformat(timespec='seconds') if status == 'SENT' else None, log_id))
    conn.commit()
    conn.close()


def _send_message(recipient, subject, body, html_body=None):
    if not MAIL_USERNAME or not MAIL_PASSWORD or not MAIL_DEFAULT_SENDER:
        raise RuntimeError('SMTP credentials are not configured. Set MAIL_USERNAME, MAIL_PASSWORD, and MAIL_DEFAULT_SENDER.')
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', recipient):
        raise ValueError('Invalid recipient email address')
    if '\r' in subject or '\n' in subject or '\r' in recipient:
        raise ValueError('Invalid email header value')

    email = EmailMessage()
    email['From'] = MAIL_DEFAULT_SENDER
    email['To'] = recipient
    email['Subject'] = subject
    email.set_content(body)
    email.add_alternative(html_body or f'<html><body><p>{escape(body).replace(chr(10), "<br>")}</p></body></html>', subtype='html')

    smtp_class = smtplib.SMTP_SSL if MAIL_USE_SSL else smtplib.SMTP
    with smtp_class(MAIL_SERVER, MAIL_PORT, timeout=20) as smtp:
        if MAIL_USE_TLS and not MAIL_USE_SSL:
            smtp.starttls()
        smtp.login(MAIL_USERNAME, MAIL_PASSWORD)
        smtp.send_message(email)


def send_email(to_email, subject, body, email_type='CUSTOM', recipient_name='', student_id=None, book_id=None, log_id=None):
    log_id = log_id or create_email_log(to_email, recipient_name, subject, body, email_type, student_id, book_id)
    try:
        _send_message(to_email, subject, body)
        _update_email_log(log_id, 'SENT')
        return True, log_id, None
    except Exception as error:
        _update_email_log(log_id, 'FAILED', str(error))
        return False, log_id, str(error)


def send_html_email(to_email, subject, text_body, html_body, email_type='CUSTOM', recipient_name='', student_id=None, book_id=None, log_id=None):
    """Send a multipart email while keeping the plain-text body in the audit log."""
    log_id = log_id or create_email_log(to_email, recipient_name, subject, text_body, email_type, student_id, book_id)
    try:
        _send_message(to_email, subject, text_body, html_body)
        _update_email_log(log_id, 'SENT')
        return True, log_id, None
    except Exception as error:
        _update_email_log(log_id, 'FAILED', str(error))
        return False, log_id, str(error)


def send_email_async(to_email, subject, body, email_type='CUSTOM', recipient_name='', student_id=None, book_id=None):
    log_id = create_email_log(to_email, recipient_name, subject, body, email_type, student_id, book_id)
    thread = threading.Thread(
        target=send_email,
        args=(to_email, subject, body, email_type, recipient_name, student_id, book_id, log_id),
        daemon=True
    )
    thread.start()
    return log_id


def send_book_issued_email(student, book, issue_date, due_date):
    subject = f"Library Book Issued - {book['title']}"
    body = (f"Hello {student['name']},\n\n"
        f"Your book \"{book['title']}\" is due on {due_date}. "
        "Please return or renew it before the due date to avoid a fine.\n\n"
        "ESEC AI&DS Library")
    html_body = render_email_template('book_issued.html', {
        'student_name': student['name'],
        'book_title': book['title'],
        'issue_date': issue_date,
        'due_date': due_date,
        'library_name': 'ESEC AI&DS Library'
    })
    log_id = create_email_log(student['email'], student['name'], subject, body, 'BOOK_ISSUED', student['id'], book['id'])
    thread = threading.Thread(
        target=send_html_email,
        args=(student['email'], subject, body, html_body, 'BOOK_ISSUED', student['name'], student['id'], book['id'], log_id),
        daemon=True
    )
    thread.start()
    return log_id


def send_book_returned_email(student, book, return_date, fine_amount=0.0):
    subject = f"Library Book Returned - {book['title']}"
    body = (f"Dear {student['name']},\n\nYour book return has been recorded.\n\n"
            f"Book: {book['title']}\nReturn date: {return_date}\nApplicable fine: {fine_amount:.2f}\n\n"
            "Thank you,\nESEC AI&DS Library")
    return send_email_async(student['email'], subject, body, 'BOOK_RETURNED', student['name'], student['id'], book['id'])


def send_due_reminder_email(student, book, due_date, days_remaining):
    subject = f"Library Due Date Reminder - {book['title']}"
    body = (f"Dear {student['name']},\n\nYour book is due on {due_date}, in {days_remaining} day(s).\n\n"
            f"Book: {book['title']}\n\nESEC AI&DS Library")
    return send_email_async(student['email'], subject, body, 'DUE_REMINDER', student['name'], student['id'], book['id'])


def send_overdue_email(student, book, due_date, overdue_days, fine_amount=0.0):
    subject = f"Overdue Library Book - {book['title']}"
    body = (f"Dear {student['name']},\n\nYour book is {overdue_days} day(s) overdue.\n\n"
            f"Book: {book['title']}\nDue date: {due_date}\nFine amount: {fine_amount:.2f}\n\n"
            "Please return it as soon as possible.\nESEC AI&DS Library")
    return send_email_async(student['email'], subject, body, 'OVERDUE', student['name'], student['id'], book['id'])


def send_fine_email(student, book, amount, reason='Overdue return'):
    subject = f"Library Fine Notice - {book['title']}"
    body = (f"Dear {student['name']},\n\nA fine has been recorded for {book['title']}.\n\n"
            f"Amount: {amount:.2f}\nReason: {reason}\n\nPlease contact the library for clearance instructions.")
    return send_email_async(student['email'], subject, body, 'FINE', student['name'], student['id'], book['id'])
