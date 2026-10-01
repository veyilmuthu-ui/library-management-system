# Athena - Library Management System

A modern, high-performance Library Management System built with a **Python REST API backend (SQLite)** and an interactive **Glassmorphism HTML/CSS/JavaScript web frontend**.

## Features

- 📊 **Real-time Analytics Dashboard**: Tracks total titles, available copies, active registered patrons, active loans, and overdue flags.
- 📚 **Interactive Books Catalog**:
  - Live search by title, author, or ISBN.
  - Category filtering.
  - Grid View & List View toggle.
  - Book availability indicators (Available vs Out of stock).
- 👤 **Member Management**: Register, view, and manage patrons and membership tiers (Standard, Student, Premium).
- 🔄 **Circulation & Loan Tracking**:
  - Issue books to registered members with customizable loan periods.
  - One-click book return with instant database stock restoration.
  - Tracks overdue status automatically.
- ⚡ **Zero External Dependencies**: Pure Python standard library backend with SQLite database and native ES6 JavaScript web application.

---

## Email Setup

Install the optional environment loader and create `.env` from `.env.example`:

```bash
pip install -r requirements.txt
```

Set `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_DEFAULT_SENDER` to a Gmail account and its 16-character App Password. Gmail 2-Step Verification must be enabled first. Set `AUTH_SECRET` to a long random value. Never commit `.env` or expose the App Password to the browser.

## How to Run

1. **Open your terminal / command prompt** and navigate to the project directory:
   ```bash
   cd "d:/All Data/Desktop/lib project"
   ```

2. **Run the Python Server**:
   ```bash
   python app.py
   ```

3. **Open in Web Browser**:
   Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## Login Credentials

- Admin: `admin` / `password`
- Teacher: `teacher_smith` / `password`
- Students: `es25ad001` through `es25ad189`
- Student password format: `AD@2025###`
  - Example: `es25ad001` / `AD@2025001`
  - Example: `es25ad189` / `AD@2025189`

  # Athena - Library Management System

A modern, high-performance Library Management System built with a **Python REST API backend (SQLite)** and an interactive **Glassmorphism HTML/CSS/JavaScript web frontend**.

## Features

- 📊 **Real-time Analytics Dashboard**: Tracks total titles, available copies, active registered patrons, active loans, and overdue flags.
- 📚 **Interactive Books Catalog**:
  - Live search by title, author, or ISBN.
  - Category filtering.
  - Grid View & List View toggle.
  - Book availability indicators (Available vs Out of stock).
- 👤 **Member Management**: Register, view, and manage patrons and membership tiers (Standard, Student, Premium).
- 🔄 **Circulation & Loan Tracking**:
  - Issue books to registered members with customizable loan periods.
  - One-click book return with instant database stock restoration.
  - Tracks overdue status automatically.
- ⚡ **Zero External Dependencies**: Pure Python standard library backend with SQLite database and native ES6 JavaScript web application.

---

## How to Run

1. **Open your terminal / command prompt** and navigate to the project directory:
   ```bash
   cd "d:/All Data/Desktop/lib project"
   ```

2. **Run the Python Server**:
   ```bash
   python app.py
   ```

3. **Open in Web Browser**:
   Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## Login Credentials

- Admin: `admin` / `password`
- Teacher: `teacher_smith` / `password`
- Students:
  - `es24ad01` through `es24ad183` — password `AD@20yyXXX` (yy=24, XXX=last 3 digits of id)
    - Example: `es24ad01` / `AD@2024001`
    - Example: `es24ad183` / `AD@2024183`
  - `es23ad1` through `es23ad120` — password `AD@20yyXXX` (yy=23, XXX=last 3 digits of id)
    - Example: `es23ad1` / `AD@2023001`
    - Example: `es23ad120` / `AD@2023120`
  - `es24lad01` through `es24lad02` — password `AD@24LASS` (SS=last 2 digits of id)
    - Example: `es24lad01` / `AD@24LA01`
    - Example: `es24lad02` / `AD@24LA02`
  - `es25lad02` through `es25lad07` — password `AD@LAD25CCC` (CCC=last 3 digits of id)
    - Example: `es25lad02` / `AD@LAD25002`
    - Example: `es25lad07` / `AD@LAD25007`

---

## Directory Structure

```
lib project/
├── app.py               # Python REST API Server & static file server
├── library.db           # SQLite database (auto-generated with seed data)
├── static/
│   ├── index.html       # HTML5 Single Page Application UI
│   ├── styles.css       # Custom Glassmorphism CSS Design System
│   └── app.js           # Async REST API client & dynamic DOM handler
└── README.md            # System documentation
```

---

## Directory Structure

```
lib project/
├── app.py               # Python REST API Server & static file server
├── library.db           # SQLite database (auto-generated with seed data)
├── static/
│   ├── index.html       # HTML5 Single Page Application UI
│   ├── styles.css       # Custom Glassmorphism CSS Design System
│   └── app.js           # Async REST API client & dynamic DOM handler
└── README.md            # System documentation
```
