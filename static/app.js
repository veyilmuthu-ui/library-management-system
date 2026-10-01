
let state = {
    books: [],
    members: [],
    loans: [],
    currentUser: null
};

// --- Constants ---
const FINE_RATE_PER_DAY = 0.50; // $0.50 per day overdue
const MEMBER_LIMITS = {
    'Student': 2,
    'Regular': 4,
    'Premium': 8
};

function getStudentLoginInfo(username) {
    if (!window.StudentLogins) return null;
    return window.StudentLogins.parseUsername(username);
}

function ensureConfiguredStudentMembers() {
    if (!window.StudentLogins || !Array.isArray(state.members)) return false;
    const result = window.StudentLogins.ensureMembers(state.members);
    if (result.changed) {
        state.members = result.members;
    }
    return result.changed;
}

// --- Helper Functions ---
function getTodayString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateDaysBetween(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end - start;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Save all state to localStorage
function saveStateToLocalStorage() {
    localStorage.setItem('esec_books', JSON.stringify(state.books));
    localStorage.setItem('esec_members', JSON.stringify(state.members));
    localStorage.setItem('esec_loans', JSON.stringify(state.loans));
}

// Load state from localStorage or seed defaults
function loadState() {
    const storedBooks = localStorage.getItem('esec_books');
    const storedMembers = localStorage.getItem('esec_members');
    const storedLoans = localStorage.getItem('esec_loans');

    if (storedBooks && storedMembers && storedLoans) {
        state.books = JSON.parse(storedBooks);
        state.members = JSON.parse(storedMembers);
        state.loans = JSON.parse(storedLoans);
    } else {
        seedInitialData();
    }

    if (ensureConfiguredStudentMembers()) {
        saveStateToLocalStorage();
    }
}

// Seed mock database
function seedInitialData() {
    // 6 Initial Books
    state.books = [
        {
            id: 'B-101',
            title: 'The Clean Coder',
            author: 'Robert C. Martin',
            isbn: '978-0137081073',
            genre: 'Technology',
            year: 2011,
            copies: 5,
            availableCopies: 4,
            coverColor: 'grad-indigo'
        },
        {
            id: 'B-102',
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            isbn: '978-0446310789',
            genre: 'Fiction',
            year: 1960,
            copies: 3,
            availableCopies: 3,
            coverColor: 'grad-amber'
        },
        {
            id: 'B-103',
            title: 'A Brief History of Time',
            author: 'Stephen Hawking',
            isbn: '978-0553380163',
            genre: 'Science',
            year: 1998,
            copies: 2,
            availableCopies: 1,
            coverColor: 'grad-purple'
        },
        {
            id: 'B-104',
            title: 'Steve Jobs',
            author: 'Walter Isaacson',
            isbn: '978-1451648539',
            genre: 'Biography',
            year: 2011,
            copies: 4,
            availableCopies: 4,
            coverColor: 'grad-blue'
        },
        {
            id: 'B-105',
            title: 'Thinking, Fast and Slow',
            author: 'Daniel Kahneman',
            isbn: '978-0374533556',
            genre: 'Business',
            year: 2011,
            copies: 3,
            availableCopies: 3,
            coverColor: 'grad-emerald'
        },
        {
            id: 'B-106',
            title: 'Dune',
            author: 'Frank Herbert',
            isbn: '978-0441172719',
            genre: 'Fiction',
            year: 1965,
            copies: 6,
            availableCopies: 5,
            coverColor: 'grad-rose'
        }
    ];

    // 4 Initial Members
    state.members = [
        {
            id: 'M-1001',
            name: 'Sarah Jenkins',
            email: 'sarah.j@example.com',
            phone: '555-0144',
            type: 'Student',
            joinDate: '2026-01-15',
            status: 'Active'
        },
        {
            id: 'M-1002',
            name: 'Michael Chen',
            email: 'mchen@example.com',
            phone: '555-0182',
            type: 'Regular',
            joinDate: '2026-02-10',
            status: 'Active'
        },
        {
            id: 'M-1003',
            name: 'Elena Rostova',
            email: 'elena.r@example.com',
            phone: '555-0199',
            type: 'Premium',
            joinDate: '2026-03-01',
            status: 'Active'
        },
        {
            id: 'M-1004',
            name: 'David Miller',
            email: 'dmiller@example.com',
            phone: '555-0121',
            type: 'Regular',
            joinDate: '2026-05-12',
            status: 'Suspended'
        }
    ];

    // Simulating past dates to trigger overdue conditions
    const today = new Date();
    
    // Loan 1: Active and normal (borrowed 5 days ago, due in 9 days)
    const dateLoan1 = new Date();
    dateLoan1.setDate(today.getDate() - 5);
    const dateDue1 = new Date();
    dateDue1.setDate(today.getDate() + 9);

    // Loan 2: Overdue (borrowed 20 days ago, due 6 days ago)
    const dateLoan2 = new Date();
    dateLoan2.setDate(today.getDate() - 20);
    const dateDue2 = new Date();
    dateDue2.setDate(today.getDate() - 6);

    // Loan 3: Returned (borrowed 25 days ago, due 11 days ago, returned 12 days ago)
    const dateLoan3 = new Date();
    dateLoan3.setDate(today.getDate() - 25);
    const dateDue3 = new Date();
    dateDue3.setDate(today.getDate() - 11);
    const dateReturn3 = new Date();
    dateReturn3.setDate(today.getDate() - 12);

    function toISOString(d) {
        return d.toISOString().split('T')[0];
    }

    state.loans = [
        {
            id: 'L-5001',
            bookId: 'B-101',
            bookTitle: 'The Clean Coder',
            memberId: 'M-1001',
            memberName: 'Sarah Jenkins',
            loanDate: toISOString(dateLoan1),
            dueDate: toISOString(dateDue1),
            returnDate: null,
            status: 'active',
            fineAmount: 0
        },
        {
            id: 'L-5002',
            bookId: 'B-103',
            bookTitle: 'A Brief History of Time',
            memberId: 'M-1002',
            memberName: 'Michael Chen',
            loanDate: toISOString(dateLoan2),
            dueDate: toISOString(dateDue2),
            returnDate: null,
            status: 'overdue',
            fineAmount: 3.00 // 6 days late * $0.50
        },
        {
            id: 'L-5003',
            bookId: 'B-106',
            bookTitle: 'Dune',
            memberId: 'M-1003',
            memberName: 'Elena Rostova',
            loanDate: toISOString(dateLoan3),
            dueDate: toISOString(dateDue3),
            returnDate: toISOString(dateReturn3),
            status: 'returned',
            fineAmount: 0
        }
    ];

    saveStateToLocalStorage();
}

// Dynamic update of loan statuses & overdue fines based on current actual time
function refreshLoansStatus() {
    const todayStr = getTodayString();
    let updated = false;

    state.loans.forEach(loan => {
        if (!loan.returnDate) {
            // Check if overdue
            const overdueDays = calculateDaysBetween(loan.dueDate, todayStr);
            if (overdueDays > 0) {
                if (loan.status !== 'overdue') {
                    loan.status = 'overdue';
                    updated = true;
                }
                const newFine = overdueDays * FINE_RATE_PER_DAY;
                if (loan.fineAmount !== newFine) {
                    loan.fineAmount = newFine;
                    updated = true;
                }
            } else {
                if (loan.status !== 'active') {
                    loan.status = 'active';
                    loan.fineAmount = 0;
                    updated = true;
                }
            }
        }
    });

    if (updated) {
        saveStateToLocalStorage();
    }
}

// --- Authentication & Redirection Functions ---
function showLoginScreen() {
    window.location.href = 'login.html';
}

function loginUser(username, role, profile = {}) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const effectiveRole = role || 'student';

    // Save to state
    state.currentUser = { username: normalizedUsername, role: effectiveRole };

    // Setup body classes
    document.body.className = `role-${effectiveRole}`;
    
    // Setup student profile info if matching database
    if (effectiveRole === 'student') {
        const studentLogin = getStudentLoginInfo(normalizedUsername);

        if (studentLogin) {
            if (ensureConfiguredStudentMembers()) {
                saveStateToLocalStorage();
            }

            const matchedGeneratedMember = state.members.find(m => String(m.id).toLowerCase() === studentLogin.memberId.toLowerCase());
            if (matchedGeneratedMember) {
                state.currentUser.memberId = matchedGeneratedMember.id;
                state.currentUser.fullName = matchedGeneratedMember.name;
            } else if (window.StudentLogins) {
                const generatedMember = window.StudentLogins.createMember(studentLogin);
                state.members.push(generatedMember);
                state.currentUser.memberId = generatedMember.id;
                state.currentUser.fullName = generatedMember.name;
                saveStateToLocalStorage();
            }
        } else if (profile.memberId || profile.fullName) {
            state.currentUser.memberId = profile.memberId || normalizedUsername.toUpperCase();
            state.currentUser.fullName = profile.fullName || profile.name || normalizedUsername;
        }

        const nameLower = normalizedUsername;
        const matchedMember = state.members.find(m =>
            String(m.name || '').toLowerCase().includes(nameLower) ||
            String(m.id || '').toLowerCase() === nameLower ||
            (m.email && String(m.email).toLowerCase() === nameLower)
        );
        if (matchedMember) {
            state.currentUser.memberId = matchedMember.id;
            state.currentUser.fullName = matchedMember.name;
        } else if (!state.currentUser.memberId) {
            // Default to Sarah Jenkins M-1001 for convenience
            state.currentUser.memberId = 'M-1001';
            state.currentUser.fullName = 'Sarah Jenkins';
        }
    }

    localStorage.setItem('esec_current_user', JSON.stringify(state.currentUser));
    
    // Modify Header info
    updateHeaderUserBadge();
    
    // Go to dashboard
    showPanel('dashboard');
}

function logoutUser() {
    state.currentUser = null;
    localStorage.removeItem('esec_current_user');
    showLoginScreen();
}

function updateHeaderUserBadge() {
    const avatarSpan = document.querySelector('.user-badge .avatar');
    const nameSpan = document.querySelector('.user-badge .user-name');
    const roleSpan = document.querySelector('.user-badge .user-role');
    
    if (!state.currentUser || !avatarSpan || !nameSpan || !roleSpan) return;
    
    const role = state.currentUser.role;
    const username = state.currentUser.username;
    
    if (role === 'admin') {
        avatarSpan.textContent = 'A';
        nameSpan.textContent = 'Admin Panel';
        roleSpan.textContent = 'Administrator';
    } else if (role === 'teacher') {
        avatarSpan.textContent = 'T';
        nameSpan.textContent = 'Teacher Faculty';
        roleSpan.textContent = 'Teacher / Faculty';
    } else {
        avatarSpan.textContent = 'S';
        nameSpan.textContent = state.currentUser.fullName || username;
        roleSpan.textContent = 'Student';
    }
}

// --- UI Navigation ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const target = item.getAttribute('data-target');
            showPanel(target);
        });
    });

    // Logo click goes to dashboard
    document.querySelector('.logo').addEventListener('click', () => {
        // Only trigger if logged in
        if (!state.currentUser) return;
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector('[data-target="dashboard"]').classList.add('active');
        showPanel('dashboard');
    });

    // View All Loans links
    document.querySelectorAll('.view-all-loans-nav').forEach(btn => {
        btn.addEventListener('click', () => {
            // Students shouldn't view all loans
            if (state.currentUser && state.currentUser.role === 'student') return;
            navItems.forEach(i => i.classList.remove('active'));
            document.querySelector('[data-target="transactions"]').classList.add('active');
            showPanel('transactions');
        });
    });

    // Sign out button binding
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Mobile navigation togglers
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-close-btn');
    const sidebar = document.getElementById('sidebar');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });
}

function showPanel(panelName) {
    // Hide all panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach(p => p.classList.remove('active'));

    // Show target panel
    const targetPanel = document.getElementById(`${panelName}-panel`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // Close mobile menu if active
    document.getElementById('sidebar').classList.remove('active');

    // Set page header title
    const headerTitle = document.getElementById('page-title');
    switch(panelName) {
        case 'dashboard':
            headerTitle.textContent = 'Library Dashboard';
            renderDashboard();
            break;
        case 'books':
            headerTitle.textContent = 'Books Catalog';
            renderBooks();
            populateGenreDropdown();
            break;
        case 'members':
            headerTitle.textContent = 'Members Directory';
            renderMembers();
            break;
        case 'transactions':
            headerTitle.textContent = 'Loans & Returns';
            renderLoans();
            break;
        case 'email-center':
            headerTitle.textContent = 'Email Center';
            if (state.currentUser && state.currentUser.role === 'admin') {
                loadEmailCenter();
            }
            break;
    }
}

async function loadEmailCenter() {
    const studentSelect = document.getElementById('email-student');
    if (!studentSelect) return;
    try {
        const [membersResponse, response] = await Promise.all([
            fetch('/api/members'),
            fetch('/api/admin/email-history')
        ]);
        const serverMembers = membersResponse.ok ? await membersResponse.json() : [];
        studentSelect.innerHTML = '<option value="">Manual recipient</option>' + serverMembers
            .filter(member => member.email)
            .map(member => `<option value="${member.id}">${escapeHtml(member.name)} (${escapeHtml(member.email)})</option>`).join('');
        if (!response.ok) return;
        const logs = await response.json();
        document.getElementById('email-history-body').innerHTML = logs.map(log => `
            <tr><td>${escapeHtml(log.recipient)}</td><td>${escapeHtml(log.email_type)}</td>
            <td><span class="badge ${log.status === 'SENT' ? 'success' : log.status === 'FAILED' ? 'danger' : ''}">${escapeHtml(log.status)}</span></td>
            <td>${escapeHtml(log.sent_at || '-')}</td><td>${log.status === 'FAILED' ? `<button class="text-link-btn email-retry" data-id="${log.id}">Retry</button>` : ''}</td></tr>
        `).join('') || '<tr><td colspan="5">No email history yet.</td></tr>';
    } catch (error) {
        console.error('Unable to load email history:', error);
    }
}

async function updateEmailStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) return;
        const stats = await response.json();
        const today = document.getElementById('stat-emails-today');
        if (today) today.textContent = stats.emails_today || 0;
    } catch (error) {
        console.error('Unable to load email statistics:', error);
    }
}

function bindEmailCenter() {
    const form = document.getElementById('email-compose-form');
    const studentSelect = document.getElementById('email-student');
    const emailType = document.getElementById('email-type');
    const subjectSelect = document.getElementById('email-subject');
    const messageField = document.getElementById('email-message');
    if (!form || !studentSelect) return;
    const subjectOptions = {
        CUSTOM: ['Library Announcement', 'Library Notice'],
        WELCOME: ['Welcome to ESEC AI&DS Library'],
        BOOK_ISSUED: ['Library Book Issued'],
        BOOK_RETURNED: ['Library Book Returned'],
        DUE_REMINDER: ['Library Due Date Reminder'],
        OVERDUE: ['Overdue Library Book'],
        FINE: ['Library Fine Notice']
    };
    const messageTemplates = {
        CUSTOM: 'Hello,\n\nWe have an important update from the library.\n\nRegards,\nESEC AI&DS Library',
        WELCOME: 'Hello,\n\nWelcome to the ESEC AI&DS Library. Your library account is ready to use.\n\nRegards,\nESEC AI&DS Library',
        BOOK_ISSUED: 'Hello,\n\nYour library book has been issued successfully. Please return it by the due date.\n\nRegards,\nESEC AI&DS Library',
        BOOK_RETURNED: 'Hello,\n\nYour returned book has been recorded successfully. Thank you.\n\nRegards,\nESEC AI&DS Library',
        DUE_REMINDER: 'Hello,\n\nThis is a reminder that your borrowed book is due soon. Please return or renew it before the due date.\n\nRegards,\nESEC AI&DS Library',
        OVERDUE: 'Hello,\n\nOur records show that your borrowed book is overdue. Please return it as soon as possible.\n\nRegards,\nESEC AI&DS Library',
        FINE: 'Hello,\n\nA library fine is pending on your account. Please contact the library for payment or clarification.\n\nRegards,\nESEC AI&DS Library'
    };
    const updateSubjectOptions = () => {
        const options = subjectOptions[emailType.value] || subjectOptions.CUSTOM;
        subjectSelect.innerHTML = options.map(subject => `<option value="${subject}">${subject}</option>`).join('');
        messageField.value = messageTemplates[emailType.value] || messageTemplates.CUSTOM;
    };
    emailType.addEventListener('change', updateSubjectOptions);
    updateSubjectOptions();
    studentSelect.addEventListener('change', () => {
        const member = state.members.find(item => String(item.id) === studentSelect.value);
        if (member) document.getElementById('email-recipient').value = member.email;
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.getElementById('email-send-button');
        const status = document.getElementById('email-compose-status');
        button.disabled = true;
        button.textContent = 'Sending...';
        status.textContent = '';
        try {
            const response = await fetch('/api/admin/send-email', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    recipient: document.getElementById('email-recipient').value,
                    student_id: studentSelect.value || null,
                    email_type: document.getElementById('email-type').value,
                    subject: document.getElementById('email-subject').value,
                    message: document.getElementById('email-message').value
                })
            });
            const result = await response.json();
            status.textContent = response.ok ? 'Email sent successfully.' : (result.error || result.message || 'Email delivery failed.');
            if (response.ok) { form.reset(); await loadEmailCenter(); }
        } catch (error) { status.textContent = 'Network error. Email was not sent.'; }
        button.disabled = false;
        button.textContent = 'Send Email';
    });
    document.getElementById('email-history-refresh').addEventListener('click', loadEmailCenter);
    document.getElementById('email-history-search').addEventListener('input', loadEmailCenter);
    document.getElementById('email-history-body').addEventListener('click', async (event) => {
        const retry = event.target.closest('.email-retry');
        if (!retry) return;
        await fetch(`/api/admin/email/${retry.dataset.id}/retry`, {method: 'POST'});
        await loadEmailCenter();
    });
}

// --- Data Render Functions ---

function updateMetrics() {
    const card1Label = document.querySelector('.metrics-grid .metric-card:nth-child(1) p');
    const card2Label = document.querySelector('.metrics-grid .metric-card:nth-child(2) p');
    const card3Label = document.querySelector('.metrics-grid .metric-card:nth-child(3) p');
    const card4Label = document.querySelector('.metrics-grid .metric-card:nth-child(4) p');

    if (state.currentUser && state.currentUser.role === 'student') {
        const studentId = state.currentUser.memberId;
        const totalAvailBooks = state.books.reduce((acc, book) => acc + book.availableCopies, 0);
        const myActiveLoans = state.loans.filter(l => l.memberId === studentId && !l.returnDate).length;
        const myOverdueLoans = state.loans.filter(l => l.memberId === studentId && l.status === 'overdue' && !l.returnDate).length;
        const myFines = state.loans.filter(l => l.memberId === studentId && !l.returnDate).reduce((acc, l) => acc + l.fineAmount, 0);

        document.getElementById('stat-total-books').textContent = totalAvailBooks;
        document.getElementById('stat-total-members').textContent = myActiveLoans;
        document.getElementById('stat-active-loans').textContent = myOverdueLoans;
        document.getElementById('stat-overdue-loans').textContent = `₹${myFines.toFixed(2)}`;

        if (card1Label) card1Label.textContent = 'Books Available';
        if (card2Label) card2Label.textContent = 'My Active Loans';
        if (card3Label) card3Label.textContent = 'My Overdue Books';
        if (card4Label) card4Label.textContent = 'My Owed Fines';

        const overdueCard = document.querySelector('.overdue-card');
        if (myOverdueLoans > 0) {
            overdueCard.classList.add('warning-active');
        } else {
            overdueCard.classList.remove('warning-active');
        }
    } else {
        const totalBooks = state.books.reduce((acc, book) => acc + book.copies, 0);
        const activeMembers = state.members.filter(m => m.status === 'Active').length;
        const activeLoans = state.loans.filter(l => !l.returnDate).length;
        const overdueLoans = state.loans.filter(l => l.status === 'overdue' && !l.returnDate).length;

        document.getElementById('stat-total-books').textContent = totalBooks;
        document.getElementById('stat-total-members').textContent = activeMembers;
        document.getElementById('stat-active-loans').textContent = activeLoans;
        document.getElementById('stat-overdue-loans').textContent = overdueLoans;

        if (card1Label) card1Label.textContent = 'Total Books';
        if (card2Label) card2Label.textContent = 'Active Members';
        if (card3Label) card3Label.textContent = 'Books Out';
        if (card4Label) card4Label.textContent = 'Overdue Items';

        const overdueCard = document.querySelector('.overdue-card');
        if (overdueLoans > 0) {
            overdueCard.classList.add('warning-active');
        } else {
            overdueCard.classList.remove('warning-active');
        }
    }
}

function renderDashboard() {
    updateMetrics();

    // 1. Render recent transactions table
    const recentTbody = document.getElementById('recent-transactions-tbody');
    recentTbody.innerHTML = '';
    
    // Set section title depending on role
    const dashboardTitle = document.querySelector('.dashboard-columns .main-col h2');
    if (dashboardTitle) {
        if (state.currentUser && state.currentUser.role === 'student') {
            dashboardTitle.textContent = 'My Borrowing History';
        } else {
            dashboardTitle.textContent = 'Recent Borrowing Activities';
        }
    }

    // Filter loans by student if role is student
    let userLoans = state.loans;
    if (state.currentUser && state.currentUser.role === 'student') {
        const studentId = state.currentUser.memberId;
        userLoans = state.loans.filter(l => l.memberId === studentId);
    }
    
    // Get last 5 loans sorted by loanDate descending
    const sortedLoans = [...userLoans]
        .sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate))
        .slice(0, 5);

    if (sortedLoans.length === 0) {
        recentTbody.innerHTML = `<tr><td colspan="6" class="text-center" style="text-align:center; padding:24px; color:var(--text-muted);">No borrowing activities found.</td></tr>`;
    } else {
        sortedLoans.forEach(loan => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            let actionBtn = '';

            if (loan.returnDate) {
                statusBadge = `<span class="badge neutral">Returned</span>`;
                actionBtn = `<span style="font-size:12px; color:var(--text-muted); font-weight:600;">Complete</span>`;
            } else if (loan.status === 'overdue') {
                statusBadge = `<span class="badge danger">Overdue</span>`;
                actionBtn = `<button class="table-action-btn return-btn" onclick="handleQuickReturn('${loan.id}')">Return</button>`;
            } else {
                statusBadge = `<span class="badge success">On Loan</span>`;
                actionBtn = `<button class="table-action-btn return-btn" onclick="handleQuickReturn('${loan.id}')">Return</button>`;
            }

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(loan.bookTitle)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">ID: ${loan.bookId}</div>
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(loan.memberName)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">ID: ${loan.memberId}</div>
                </td>
                <td>${formatDateDisplay(loan.loanDate)}</td>
                <td>${formatDateDisplay(loan.dueDate)}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            `;
            recentTbody.appendChild(tr);
        });
    }

    // 2. Render Genre Distribution Widget
    const genreLegend = document.getElementById('genre-legend');
    genreLegend.innerHTML = '';

    const genreCounts = {};
    state.books.forEach(b => {
        genreCounts[b.genre] = (genreCounts[b.genre] || 0) + b.copies;
    });

    const genreColors = {
        'Technology': '#2563eb',
        'Fiction': '#f59e0b',
        'Science': '#a855f7',
        'Biography': '#3b82f6',
        'Business': '#10b981',
        'History': '#f43f5e'
    };

    Object.entries(genreCounts).forEach(([genre, count]) => {
        const color = genreColors[genre] || '#64748b';
        const item = document.createElement('div');
        item.className = 'genre-legend-item';
        item.innerHTML = `
            <div class="genre-name-group">
                <span class="genre-color-indicator" style="background-color: ${color};"></span>
                <span>${escapeHtml(genre)}</span>
            </div>
            <span class="genre-count">${count} books</span>
        `;
        genreLegend.appendChild(item);
    });

    // 3. Popular Books Widget (simulate by showing books with active loans)
    const popularList = document.getElementById('popular-books-list');
    popularList.innerHTML = '';
    
    // Count active loans for each book cover
    const loanCounts = {};
    state.loans.forEach(l => {
        loanCounts[l.bookId] = (loanCounts[l.bookId] || 0) + 1;
    });

    const popularBooks = [...state.books]
        .sort((a, b) => (loanCounts[b.id] || 0) - (loanCounts[a.id] || 0))
        .slice(0, 3);

    popularBooks.forEach(book => {
        const item = document.createElement('div');
        item.className = 'popular-book-item';
        const coverSource = book.coverImage || book.cover_url;
        const coverClass = book.coverColor || 'grad-blue';
        
        item.innerHTML = `
            ${coverSource ? `<img src="${coverSource}" class="mini-cover uploaded-mini-cover" alt="Cover of ${escapeHtml(book.title)}">` : `<div class="mini-cover ${coverClass}"></div>`}
            <div class="popular-book-details">
                <div class="popular-book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
                <div class="popular-book-author">by ${escapeHtml(book.author)}</div>
            </div>
        `;
        popularList.appendChild(item);
    });
}

function renderBooks() {
    const grid = document.getElementById('books-grid');
    grid.innerHTML = '';

    const searchQuery = document.getElementById('book-search-input').value.toLowerCase().trim();
    const genreFilter = document.getElementById('book-genre-filter').value;
    const statusFilter = document.getElementById('book-status-filter').value;

    const filtered = state.books.filter(book => {
        // Search matches
        const matchesSearch = book.title.toLowerCase().includes(searchQuery) ||
                              book.author.toLowerCase().includes(searchQuery) ||
                              book.isbn.toLowerCase().includes(searchQuery);
        
        // Genre filter matches
        const matchesGenre = genreFilter === 'all' || book.genre === genreFilter;
        
        // Status matches
        let matchesStatus = true;
        if (statusFilter === 'available') {
            matchesStatus = book.availableCopies > 0;
        } else if (statusFilter === 'unavailable') {
            matchesStatus = book.availableCopies === 0;
        }

        return matchesSearch && matchesGenre && matchesStatus;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px; text-align:center; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:16px;"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                <h3 style="font-family:var(--font-heading); font-weight:700; color:var(--text-primary); margin-bottom:4px;">No Books Found</h3>
                <p style="color:var(--text-muted); max-width:320px;">We couldn't find any books matching your search or filters. Try adjusting them or catalog a new book.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        const coverSource = book.coverImage || book.cover_url;
        
        const isAvailable = book.availableCopies > 0;
        const statusBadge = isAvailable 
            ? `<span class="badge success book-badge-status">In Stock</span>` 
            : `<span class="badge danger book-badge-status">Out of Stock</span>`;

        card.innerHTML = `
            <div class="book-card-cover-container ${book.coverColor || 'grad-blue'}${coverSource ? ' has-uploaded-cover' : ''}">
                ${statusBadge}
                ${coverSource ? `<img src="${coverSource}" class="book-cover-uploaded" alt="Cover of ${escapeHtml(book.title)}">` : `<div class="book-cover-mock">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cover-logo"><path d="m16 6 4 14H4L8 6Z"/><path d="M12 2v4"/></svg>
                </div>`}
            </div>
            <div class="book-card-info">
                <div class="book-card-genre">${escapeHtml(book.genre)}</div>
                <div class="book-card-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
                <div class="book-card-author">by ${escapeHtml(book.author)}</div>
                
                <div class="book-card-meta">
                    <div class="book-stock-details">
                        <span class="book-stock-label">Stock Status</span>
                        <span class="book-stock-value">${book.availableCopies} / ${book.copies} Avail</span>
                    </div>
                    <div class="book-card-actions">
                        <button class="book-action-icon-btn primary-action" onclick="openIssueLoanForBook('${book.id}')" title="Issue Loan" ${!isAvailable ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/></svg>
                        </button>
                        <button class="book-action-icon-btn" onclick="openEditBookModal('${book.id}')" title="Edit Book">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22h6.8a2 2 0 0 0 2-2V7.2L15 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h3"/><path d="M14 2v6h6"/><path d="M10.4 12.6a2 2 0 1 1 2.8 2.8L8 20v-3l2.4-4.4Z"/></svg>
                        </button>
                        <button class="book-action-icon-btn delete-action" onclick="handleDeleteBook('${book.id}')" title="Remove Book">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderMembers() {
    const tbody = document.getElementById('members-tbody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('member-search-input').value.toLowerCase().trim();
    const statusFilter = document.getElementById('member-status-filter').value;

    const filtered = state.members.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchQuery) ||
                              member.email.toLowerCase().includes(searchQuery) ||
                              member.id.toLowerCase().includes(searchQuery);

        const matchesStatus = statusFilter === 'all' || member.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="text-align:center; padding:48px; color:var(--text-muted);">No members registered matching search query.</td></tr>`;
        return;
    }

    filtered.forEach(member => {
        const activeLoansCount = state.loans.filter(l => l.memberId === member.id && !l.returnDate).length;
        const limit = MEMBER_LIMITS[member.type] || 4;
        
        const tr = document.createElement('tr');
        
        const statusBadge = member.status === 'Active' 
            ? `<span class="badge success">Active</span>`
            : `<span class="badge danger">Suspended</span>`;

        tr.innerHTML = `
            <td><strong style="color:var(--text-primary); font-family:var(--font-heading);">${member.id}</strong></td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(member.name)}</div>
            </td>
            <td>
                <div>${escapeHtml(member.email)}</div>
                <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(member.phone)}</div>
            </td>
            <td><span class="badge info">${member.type}</span></td>
            <td>${formatDateDisplay(member.joinDate)}</td>
            <td>
                <div style="font-weight:600;">${activeLoansCount} / ${limit} Books</div>
                <div style="font-size:10px; color:var(--text-muted);">Max capacity</div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="table-action-btn" onclick="openMemberHistory('${member.id}')" title="View Profile History">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="table-action-btn" onclick="openEditMemberModal('${member.id}')" title="Edit Profile">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22h6.8a2 2 0 0 0 2-2V7.2L15 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h3"/><path d="M14 2v6h6"/><path d="M10.4 12.6a2 2 0 1 1 2.8 2.8L8 20v-3l2.4-4.4Z"/></svg>
                    </button>
                    <button class="table-action-btn delete-btn" onclick="handleDeleteMember('${member.id}')" title="Unregister Member">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLoans() {
    const tbody = document.getElementById('loans-tbody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('loan-search-input').value.toLowerCase().trim();
    const statusFilter = document.getElementById('loan-status-filter').value;

    const filtered = state.loans.filter(loan => {
        const matchesSearch = loan.bookTitle.toLowerCase().includes(searchQuery) ||
                              loan.memberName.toLowerCase().includes(searchQuery);

        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = !loan.returnDate && loan.status !== 'overdue';
        } else if (statusFilter === 'overdue') {
            matchesStatus = !loan.returnDate && loan.status === 'overdue';
        } else if (statusFilter === 'returned') {
            matchesStatus = !!loan.returnDate;
        }

        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="text-align:center; padding:48px; color:var(--text-muted);">No loans matching search and filter selections.</td></tr>`;
        return;
    }

    filtered.forEach(loan => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        let actionBtn = '';
        let returnDateStr = '-';
        let fineStr = '-';

        if (loan.returnDate) {
            statusBadge = `<span class="badge neutral">Returned</span>`;
            returnDateStr = formatDateDisplay(loan.returnDate);
            actionBtn = `<span style="font-size:12.5px; color:var(--text-muted); font-weight:600;">Completed</span>`;
        } else {
            actionBtn = `<button class="table-action-btn return-btn" onclick="handleQuickReturn('${loan.id}')">Return Book</button>`;
            
            if (loan.status === 'overdue') {
                statusBadge = `<span class="badge danger">Overdue</span>`;
            } else {
                statusBadge = `<span class="badge success">On Loan</span>`;
            }
        }

        if (loan.fineAmount > 0) {
            fineStr = `<span style="color:var(--danger); font-weight:700;">₹${loan.fineAmount.toFixed(2)}</span>`;
        } else {
            fineStr = `<span style="color:var(--text-muted); font-weight:500;">₹0.00</span>`;
        }

        tr.innerHTML = `
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(loan.bookTitle)}</div>
                <div style="font-size:11px; color:var(--text-muted);">Book ID: ${loan.bookId}</div>
            </td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(loan.memberName)}</div>
                <div style="font-size:11px; color:var(--text-muted);">Member ID: ${loan.memberId}</div>
            </td>
            <td>${formatDateDisplay(loan.loanDate)}</td>
            <td>${formatDateDisplay(loan.dueDate)}</td>
            <td>${returnDateStr}</td>
            <td>${fineStr}</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Autocomplete Genres list ---
function populateGenreDropdown() {
    const select = document.getElementById('book-genre-filter');
    const currentValue = select.value;
    select.innerHTML = '<option value="all">All Genres</option>';
    
    // Get unique genres
    const genres = [...new Set(state.books.map(b => b.genre))];
    genres.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
    });

    select.value = currentValue;
}

// --- HTML Escape utility to block XSS injection ---
function escapeHtml(str) {
    if (!str) return '';
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- Dynamic search inputs triggers ---
function initSearchListeners() {
    // Global Header Search (redirects search query based on current active pane)
    document.getElementById('global-search').addEventListener('input', (e) => {
        const value = e.target.value;
        const activePanel = document.querySelector('.panel.active').id;
        
        if (activePanel === 'dashboard-panel') {
            // Direct to books catalog
            document.querySelector('[data-target="books"]').click();
            const bookSearch = document.getElementById('book-search-input');
            bookSearch.value = value;
            bookSearch.dispatchEvent(new Event('input'));
        } else if (activePanel === 'books-panel') {
            const bookSearch = document.getElementById('book-search-input');
            bookSearch.value = value;
            bookSearch.dispatchEvent(new Event('input'));
        } else if (activePanel === 'members-panel') {
            const memberSearch = document.getElementById('member-search-input');
            memberSearch.value = value;
            memberSearch.dispatchEvent(new Event('input'));
        } else if (activePanel === 'transactions-panel') {
            const loanSearch = document.getElementById('loan-search-input');
            loanSearch.value = value;
            loanSearch.dispatchEvent(new Event('input'));
        }
    });

    // Sub-panels searches
    document.getElementById('book-search-input').addEventListener('input', renderBooks);
    document.getElementById('book-genre-filter').addEventListener('change', renderBooks);
    document.getElementById('book-status-filter').addEventListener('change', renderBooks);

    document.getElementById('member-search-input').addEventListener('input', renderMembers);
    document.getElementById('member-status-filter').addEventListener('change', renderMembers);

    document.getElementById('loan-search-input').addEventListener('input', renderLoans);
    document.getElementById('loan-status-filter').addEventListener('change', renderLoans);
}


// --- Modal Management Systems ---

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Book Modal trigger Actions
function openAddBookModal() {
    document.getElementById('book-form').reset();
    document.getElementById('book-id-input').value = '';
    document.getElementById('book-cover-input').required = true;
    document.getElementById('book-modal-title').textContent = 'Catalog New Book';
    openModal('book-modal');
}

function openEditBookModal(bookId) {
    const book = state.books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('book-id-input').value = book.id;
    document.getElementById('book-title-input').value = book.title;
    document.getElementById('book-author-input').value = book.author;
    document.getElementById('book-isbn-input').value = book.isbn;
    document.getElementById('book-genre-input').value = book.genre;
    document.getElementById('book-year-input').value = book.year;
    document.getElementById('book-copies-input').value = book.copies;
    document.getElementById('book-cover-color').value = book.coverColor || 'grad-blue';
    document.getElementById('book-cover-input').required = false;

    document.getElementById('book-modal-title').textContent = `Edit Book Catalog (${book.id})`;
    openModal('book-modal');
}

function handleDeleteBook(bookId) {
    const book = state.books.find(b => b.id === bookId);
    if (!book) return;

    // Check if there are active loans for this book
    const activeLoans = state.loans.some(l => l.bookId === bookId && !l.returnDate);
    if (activeLoans) {
        alert(`Cannot delete "${book.title}" because copies are currently lent out.`);
        return;
    }

    if (confirm(`Are you sure you want to remove "${book.title}" from the catalog?`)) {
        state.books = state.books.filter(b => b.id !== bookId);
        saveStateToLocalStorage();
        renderBooks();
        updateMetrics();
    }
}

// Member Modal Actions
function openAddMemberModal() {
    document.getElementById('member-form').reset();
    document.getElementById('member-id-input').value = '';
    document.getElementById('member-modal-title').textContent = 'Register Member';
    document.getElementById('member-status-input').value = 'Active';
    document.getElementById('member-status-input').parentElement.style.display = 'none'; // Hide status on register
    openModal('member-modal');
}

function openEditMemberModal(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    document.getElementById('member-id-input').value = member.id;
    document.getElementById('member-name-input').value = member.name;
    document.getElementById('member-email-input').value = member.email;
    document.getElementById('member-phone-input').value = member.phone;
    document.getElementById('member-type-input').value = member.type;
    
    const statusSelect = document.getElementById('member-status-input');
    statusSelect.value = member.status;
    statusSelect.parentElement.style.display = 'flex'; // Show status on edit

    document.getElementById('member-modal-title').textContent = `Edit Member Profile (${member.id})`;
    openModal('member-modal');
}

function handleDeleteMember(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    // Check if there are active loans
    const activeLoans = state.loans.some(l => l.memberId === memberId && !l.returnDate);
    if (activeLoans) {
        alert(`Cannot unregister "${member.name}" because they have unreturned books.`);
        return;
    }

    if (confirm(`Are you sure you want to unregister "${member.name}"?`)) {
        state.members = state.members.filter(m => m.id !== memberId);
        saveStateToLocalStorage();
        renderMembers();
        updateMetrics();
    }
}

// --- Member details profile modal ---
function openMemberHistory(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    document.getElementById('history-profile-name').textContent = member.name;
    document.getElementById('history-profile-email').textContent = member.email;
    document.getElementById('history-profile-phone').textContent = member.phone;
    document.getElementById('history-profile-avatar').textContent = member.name.charAt(0).toUpperCase();

    // Type Badge
    const typeBadge = document.getElementById('history-profile-type');
    typeBadge.textContent = member.type;
    typeBadge.className = 'badge info';

    // Status Badge
    const statusBadge = document.getElementById('history-profile-status');
    statusBadge.textContent = member.status;
    statusBadge.className = member.status === 'Active' ? 'badge success' : 'badge danger';

    // Limit calculation
    const limit = MEMBER_LIMITS[member.type] || 4;
    const activeLoans = state.loans.filter(l => l.memberId === memberId && !l.returnDate);
    document.getElementById('history-profile-limit').textContent = `${activeLoans.length} / ${limit} books out`;

    // History Table list
    const tbody = document.getElementById('history-loans-tbody');
    tbody.innerHTML = '';

    const memberLoans = state.loans.filter(l => l.memberId === memberId)
        .sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate));

    if (memberLoans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--text-muted);">No historical borrowing record found.</td></tr>`;
    } else {
        memberLoans.forEach(loan => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            let returnStr = '-';
            let fineStr = '-';

            if (loan.returnDate) {
                statusBadge = `<span class="badge neutral">Returned</span>`;
                returnStr = formatDateDisplay(loan.returnDate);
            } else if (loan.status === 'overdue') {
                statusBadge = `<span class="badge danger">Overdue</span>`;
            } else {
                statusBadge = `<span class="badge success">On Loan</span>`;
            }

            if (loan.fineAmount > 0) {
                fineStr = `<span style="color:var(--danger); font-weight:700;">₹${loan.fineAmount.toFixed(2)}</span>`;
            } else {
                fineStr = `₹0.00`;
            }

            tr.innerHTML = `
                <td><strong>${escapeHtml(loan.bookTitle)}</strong><br><span style="font-size:10px; color:var(--text-muted);">Book ID: ${loan.bookId}</span></td>
                <td>${formatDateDisplay(loan.loanDate)}</td>
                <td>${formatDateDisplay(loan.dueDate)}</td>
                <td>${returnStr}</td>
                <td>${fineStr}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    openModal('member-history-modal');
}

// Quick returns handling
function handleQuickReturn(loanId) {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    let overdueMsg = '';
    const todayStr = getTodayString();
    
    // Check if overdue to show feedback message
    const overdueDays = calculateDaysBetween(loan.dueDate, todayStr);
    if (overdueDays > 0) {
        const fine = overdueDays * FINE_RATE_PER_DAY;
        overdueMsg = `\n\n⚠️ OVERDUE WARNING:\nThis book is ${overdueDays} days late. An overdue fine of ₹${fine.toFixed(2)} has been charged.`;
    }

    if (confirm(`Confirm return of "${loan.bookTitle}" borrowed by ${loan.memberName}?${overdueMsg}`)) {
        // Return loan transaction
        loan.returnDate = todayStr;
        loan.status = 'returned';
        queueLoanNotification('/api/notifications/book-returned', loan);
        
        // Recalculate book stock
        const book = state.books.find(b => b.id === loan.bookId);
        if (book) {
            book.availableCopies = Math.min(book.copies, book.availableCopies + 1);
        }

        saveStateToLocalStorage();
        
        // Re-render panels
        const activePanelId = document.querySelector('.panel.active').id;
        if (activePanelId === 'dashboard-panel') {
            renderDashboard();
        } else if (activePanelId === 'transactions-panel') {
            renderLoans();
        } else if (activePanelId === 'books-panel') {
            renderBooks();
        }
        
        updateMetrics();
    }
}

function queueLoanNotification(endpoint, loan, extra = {}) {
    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: state.members.find(member => member.id === loan.memberId)?.email,
            recipient_name: loan.memberName,
            member_id: loan.memberId,
            book_id: loan.bookId,
            book_title: loan.bookTitle,
            due_date: loan.dueDate,
            ...extra
        })
    }).catch(error => console.error('Unable to queue loan email:', error));
}

function scanLocalLoanNotifications() {
    if (!state.currentUser || !['admin', 'teacher'].includes(state.currentUser.role)) return;
    const today = new Date();
    state.loans.filter(loan => !loan.returnDate).forEach(loan => {
        const dueDate = new Date(`${loan.dueDate}T00:00:00`);
        const daysRemaining = Math.ceil((dueDate - today) / 86400000);
        const notificationType = daysRemaining < 0 ? 'overdue' : daysRemaining <= 2 ? 'due' : null;
        if (!notificationType) return;
        const key = `esec_email_${notificationType}_${loan.id}_${getTodayString()}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, 'queued');
        queueLoanNotification(
            notificationType === 'overdue' ? '/api/notifications/overdue' : '/api/notifications/due-reminder',
            loan,
            notificationType === 'overdue'
                ? { overdue_days: Math.abs(daysRemaining) }
                : { days_remaining: Math.max(0, daysRemaining) }
        );
    });
}

// Issue loan dialog logic triggers
function openIssueLoanModal() {
    document.getElementById('loan-form').reset();
    
    // Clear select feedbacks
    const bookFeed = document.getElementById('book-selection-feedback');
    bookFeed.textContent = 'No book selected';
    bookFeed.className = 'selection-feedback-badge';
    document.getElementById('loan-book-id').value = '';

    const memFeed = document.getElementById('member-selection-feedback');
    memFeed.textContent = 'No member selected';
    memFeed.className = 'selection-feedback-badge';
    document.getElementById('loan-member-id').value = '';

    document.getElementById('loan-submit-btn').disabled = true;

    calculateLoanSummary();
    openModal('loan-modal');
}

function openIssueLoanForBook(bookId) {
    openIssueLoanModal();
    const book = state.books.find(b => b.id === bookId);
    if (book) {
        document.getElementById('loan-book-search').value = book.title;
        selectAutocompleteBook(book);
    }
}

// --- Autocomplete Search Features inside Issue Loan Modal ---
function initAutocomplete() {
    const bookInput = document.getElementById('loan-book-search');
    const bookDropdown = document.getElementById('loan-book-dropdown');
    
    bookInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        bookDropdown.innerHTML = '';
        
        if (!val) {
            bookDropdown.classList.remove('active');
            return;
        }

        const matches = state.books.filter(b => 
            (b.title.toLowerCase().includes(val) || 
             b.author.toLowerCase().includes(val) || 
             b.isbn.toLowerCase().includes(val))
        );

        if (matches.length === 0) {
            bookDropdown.innerHTML = `<div class="autocomplete-item" style="color:var(--text-muted); cursor:default;">No matching books in stock</div>`;
            bookDropdown.classList.add('active');
            return;
        }

        matches.forEach(book => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            const isAvailable = book.availableCopies > 0;
            const stockText = isAvailable ? `${book.availableCopies} available` : 'Out of stock';
            const style = isAvailable ? '' : 'opacity: 0.5; cursor: not-allowed;';
            
            item.innerHTML = `
                <div class="autocomplete-item-title" style="${style}">${escapeHtml(book.title)}</div>
                <div class="autocomplete-item-meta" style="${style}">by ${escapeHtml(book.author)} | ISBN: ${book.isbn} | <strong>${stockText}</strong></div>
            `;

            if (isAvailable) {
                item.addEventListener('click', () => {
                    bookInput.value = book.title;
                    selectAutocompleteBook(book);
                    bookDropdown.classList.remove('active');
                });
            }

            bookDropdown.appendChild(item);
        });

        bookDropdown.classList.add('active');
    });

    // Hide dropdown on blur
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-selector-group')) {
            bookDropdown.classList.remove('active');
            memberDropdown.classList.remove('active');
        }
    });

    const memberInput = document.getElementById('loan-member-search');
    const memberDropdown = document.getElementById('loan-member-dropdown');

    memberInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        memberDropdown.innerHTML = '';

        if (!val) {
            memberDropdown.classList.remove('active');
            return;
        }

        const matches = state.members.filter(m => 
            (m.name.toLowerCase().includes(val) || 
             m.email.toLowerCase().includes(val) || 
             m.id.toLowerCase().includes(val))
        );

        if (matches.length === 0) {
            memberDropdown.innerHTML = `<div class="autocomplete-item" style="color:var(--text-muted); cursor:default;">No members registered</div>`;
            memberDropdown.classList.add('active');
            return;
        }

        matches.forEach(member => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            const activeLoansCount = state.loans.filter(l => l.memberId === member.id && !l.returnDate).length;
            const limit = MEMBER_LIMITS[member.type] || 4;
            const statusLabel = member.status === 'Active' ? 'Active' : 'Suspended';
            
            item.innerHTML = `
                <div class="autocomplete-item-title">${escapeHtml(member.name)} (${member.id})</div>
                <div class="autocomplete-item-meta">Type: ${member.type} | Active Loans: ${activeLoansCount}/${limit} | <strong>Status: ${statusLabel}</strong></div>
            `;

            item.addEventListener('click', () => {
                memberInput.value = member.name;
                selectAutocompleteMember(member, activeLoansCount, limit);
                memberDropdown.classList.remove('active');
            });

            memberDropdown.appendChild(item);
        });

        memberDropdown.classList.add('active');
    });

    document.getElementById('loan-duration').addEventListener('change', calculateLoanSummary);
}

function selectAutocompleteBook(book) {
    document.getElementById('loan-book-id').value = book.id;
    const badge = document.getElementById('book-selection-feedback');
    badge.textContent = `Selected: ${book.title} (ID: ${book.id})`;
    badge.className = 'selection-feedback-badge selected';
    validateLoanForm();
}

function selectAutocompleteMember(member, currentLoans, limit) {
    const badge = document.getElementById('member-selection-feedback');
    const inputId = document.getElementById('loan-member-id');
    const summaryCheck = document.getElementById('summary-limit-check');

    if (member.status === 'Suspended') {
        badge.textContent = `Rejected: ${member.name} is Suspended`;
        badge.className = 'selection-feedback-badge';
        badge.style.borderColor = 'var(--danger-border)';
        badge.style.color = 'var(--danger)';
        badge.style.backgroundColor = 'var(--danger-light)';
        inputId.value = '';
        summaryCheck.textContent = 'Account Suspended';
        summaryCheck.style.color = 'var(--danger)';
    } else if (currentLoans >= limit) {
        badge.textContent = `Limit Block: ${member.name} reached limit (${currentLoans}/${limit})`;
        badge.className = 'selection-feedback-badge';
        badge.style.borderColor = 'var(--danger-border)';
        badge.style.color = 'var(--danger)';
        badge.style.backgroundColor = 'var(--danger-light)';
        inputId.value = '';
        summaryCheck.textContent = `Borrow limit reached (${currentLoans}/${limit})`;
        summaryCheck.style.color = 'var(--danger)';
    } else {
        inputId.value = member.id;
        badge.textContent = `Selected: ${member.name} (ID: ${member.id})`;
        badge.className = 'selection-feedback-badge selected';
        badge.style.borderColor = '';
        badge.style.color = '';
        badge.style.backgroundColor = '';
        summaryCheck.textContent = `Valid loan: (${currentLoans}/${limit} books out)`;
        summaryCheck.style.color = 'var(--success)';
    }

    validateLoanForm();
}

function validateLoanForm() {
    const bookId = document.getElementById('loan-book-id').value;
    const memberId = document.getElementById('loan-member-id').value;
    const submitBtn = document.getElementById('loan-submit-btn');

    if (bookId && memberId) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
    calculateLoanSummary();
}

function calculateLoanSummary() {
    const duration = parseInt(document.getElementById('loan-duration').value);
    const dueDateSpan = document.getElementById('summary-due-date');

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + duration);

    const yyyy = dueDate.getFullYear();
    const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dueDate.getDate()).padStart(2, '0');
    
    dueDateSpan.textContent = formatDateDisplay(`${yyyy}-${mm}-${dd}`);
}

// --- Submit form controllers ---
function initFormSubmitHandlers() {
    // 1. Submit Book Form
    document.getElementById('book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const bookId = document.getElementById('book-id-input').value;
        const title = document.getElementById('book-title-input').value.trim();
        const author = document.getElementById('book-author-input').value.trim();
        const isbn = document.getElementById('book-isbn-input').value.trim();
        const genre = document.getElementById('book-genre-input').value.trim();
        const year = parseInt(document.getElementById('book-year-input').value);
        const copies = parseInt(document.getElementById('book-copies-input').value);
        const coverColor = document.getElementById('book-cover-color').value;
        const coverInput = document.getElementById('book-cover-input');
        const coverFile = coverInput.files[0];

        if (coverFile && (!coverFile.type.startsWith('image/') || coverFile.size > 5 * 1024 * 1024)) {
            alert('Please choose an image up to 5MB.');
            return;
        }

        let coverImage;
        if (coverFile) {
            coverImage = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(coverFile);
            });
        }

        if (bookId) {
            // Edit Mode
            const idx = state.books.findIndex(b => b.id === bookId);
            if (idx !== -1) {
                const book = state.books[idx];
                
                // Adjust available stock based on edited total stock
                const stockDiff = copies - book.copies;
                let newAvail = book.availableCopies + stockDiff;
                
                if (newAvail < 0) {
                    alert(`Cannot reduce total copies below active loans. Currently on loan: ${book.copies - book.availableCopies}`);
                    return;
                }

                state.books[idx] = {
                    ...book,
                    title,
                    author,
                    isbn,
                    genre,
                    year,
                    copies,
                    availableCopies: newAvail,
                    coverColor,
                    ...(coverImage ? { coverImage } : {})
                };
            }
        } else {
            // Add Mode
            const newId = `B-${Date.now().toString().slice(-4)}`;
            state.books.push({
                id: newId,
                title,
                author,
                isbn,
                genre,
                year,
                copies,
                availableCopies: copies,
                coverColor,
                coverImage
            });
        }

        saveStateToLocalStorage();
        closeModal('book-modal');
        
        // Refresh Books Catalog
        const activePanelId = document.querySelector('.panel.active').id;
        if (activePanelId === 'books-panel') {
            renderBooks();
        } else if (activePanelId === 'dashboard-panel') {
            renderDashboard();
        }
        
        updateMetrics();
    });

    // 2. Submit Member Form
    document.getElementById('member-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const memberId = document.getElementById('member-id-input').value;
        const name = document.getElementById('member-name-input').value.trim();
        const email = document.getElementById('member-email-input').value.trim();
        const phone = document.getElementById('member-phone-input').value.trim();
        const type = document.getElementById('member-type-input').value;
        const status = document.getElementById('member-status-input').value;

        if (memberId) {
            // Edit Mode
            const idx = state.members.findIndex(m => m.id === memberId);
            if (idx !== -1) {
                state.members[idx] = {
                    ...state.members[idx],
                    name,
                    email,
                    phone,
                    type,
                    status
                };
            }
        } else {
            // Add Mode
            const newId = `M-${Date.now().toString().slice(-4)}`;
            state.members.push({
                id: newId,
                name,
                email,
                phone,
                type,
                joinDate: getTodayString(),
                status: 'Active'
            });
        }

        saveStateToLocalStorage();
        closeModal('member-modal');
        
        const activePanelId = document.querySelector('.panel.active').id;
        if (activePanelId === 'members-panel') {
            renderMembers();
        } else if (activePanelId === 'dashboard-panel') {
            renderDashboard();
        }
        
        updateMetrics();
    });

    // 3. Submit Loan Form
    document.getElementById('loan-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const bookId = document.getElementById('loan-book-id').value;
        const memberId = document.getElementById('loan-member-id').value;
        const duration = parseInt(document.getElementById('loan-duration').value);

        const book = state.books.find(b => b.id === bookId);
        const member = state.members.find(m => m.id === memberId);

        if (!book || !member) return;

        // Verify book copy stock
        if (book.availableCopies <= 0) {
            alert('Sorry, there are no available copies of this book at this time.');
            return;
        }

        // Verify member status
        if (member.status !== 'Active') {
            alert('Borrow blocked: Member account is not active.');
            return;
        }

        // Calculate transaction dates
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + duration);

        function toISOString(d) {
            return d.toISOString().split('T')[0];
        }

        const newLoanId = `L-${Date.now().toString().slice(-4)}`;
        
        // Add new Loan object
        const newLoan = {
            id: newLoanId,
            bookId: book.id,
            bookTitle: book.title,
            memberId: member.id,
            memberName: member.name,
            loanDate: toISOString(today),
            dueDate: toISOString(dueDate),
            returnDate: null,
            status: 'active',
            fineAmount: 0
        };
        state.loans.push(newLoan);
        queueLoanNotification('/api/notifications/loan-issued', newLoan);

        // Decrement book stock count
        book.availableCopies = Math.max(0, book.availableCopies - 1);

        saveStateToLocalStorage();
        closeModal('loan-modal');

        // Redirect or refresh loans dashboard
        const activePanelId = document.querySelector('.panel.active').id;
        if (activePanelId === 'transactions-panel') {
            renderLoans();
        } else if (activePanelId === 'dashboard-panel') {
            renderDashboard();
        } else if (activePanelId === 'books-panel') {
            renderBooks();
        }

        updateMetrics();
    });
}

// Initialize close modal buttons
function initModalCloseTriggers() {
    const modalIds = ['book-modal', 'member-modal', 'loan-modal', 'member-history-modal'];
    
    modalIds.forEach(id => {
        const closeBtn = document.getElementById(id.replace('-modal', '-modal-close') || `${id}-close`);
        const cancelBtn = document.getElementById(`${id.replace('-modal', '')}-form-cancel`);
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(id));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModal(id));
        }

        // Click outside backdrop triggers close
        document.getElementById(id).addEventListener('click', (e) => {
            if (e.target.className === 'modal active') {
                closeModal(id);
            }
        });
    });

    // Special history close
    document.getElementById('member-history-close').addEventListener('click', () => {
        closeModal('member-history-modal');
    });
}

// --- Dynamic Triggering for button actions outside app ---
window.openIssueLoanForBook = openIssueLoanForBook;
window.openEditBookModal = openEditBookModal;
window.handleDeleteBook = handleDeleteBook;
window.openEditMemberModal = openEditMemberModal;
window.handleDeleteMember = handleDeleteMember;
window.openMemberHistory = openMemberHistory;
window.handleQuickReturn = handleQuickReturn;

// --- Main Application Setup Entry point ---
document.addEventListener('DOMContentLoaded', () => {
    // Current date label helper
    const today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    loadState();
    refreshLoansStatus();
    
    // Core layouts initializations
    initNavigation();
    initSearchListeners();
    initAutocomplete();
    initModalCloseTriggers();
    initFormSubmitHandlers();
    bindEmailCenter();
    updateEmailStats();
    scanLocalLoanNotifications();
    window.setInterval(scanLocalLoanNotifications, 60 * 60 * 1000);

    if (state.currentUser && state.currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(element => element.remove());
    }

    const requestedPanel = new URLSearchParams(window.location.search).get('panel');
    if (requestedPanel === 'email-center' && state.currentUser && state.currentUser.role === 'admin') {
        const emailNav = document.querySelector('[data-target="email-center"]');
        if (emailNav) emailNav.click();
    }

    // Metric Cards interactive click handlers
    document.getElementById('metric-books').addEventListener('click', () => {
        const navBtn = document.querySelector('.nav-item[data-target="books"]');
        if (navBtn) navBtn.click();
    });

    document.getElementById('metric-members').addEventListener('click', () => {
        if (state.currentUser && state.currentUser.role === 'student') {
            const navBtn = document.querySelector('.nav-item[data-target="transactions"]');
            if (navBtn) navBtn.click();
        } else {
            const navBtn = document.querySelector('.nav-item[data-target="members"]');
            if (navBtn) navBtn.click();
        }
    });

    document.getElementById('metric-loans').addEventListener('click', () => {
        const navBtn = document.querySelector('.nav-item[data-target="transactions"]');
        if (navBtn) navBtn.click();
    });

    document.getElementById('metric-overdue').addEventListener('click', () => {
        const navBtn = document.querySelector('.nav-item[data-target="transactions"]');
        if (navBtn) {
            navBtn.click();
            const filterSelect = document.getElementById('loan-status-filter');
            if (filterSelect) {
                filterSelect.value = 'overdue';
                filterSelect.dispatchEvent(new Event('change'));
            }
        }
    });

    // Set trigger bindings
    document.getElementById('quick-borrow-btn').addEventListener('click', openIssueLoanModal);
    document.getElementById('new-loan-trigger').addEventListener('click', openIssueLoanModal);
    
    document.getElementById('quick-add-book-btn').addEventListener('click', openAddBookModal);
    document.getElementById('add-book-trigger').addEventListener('click', openAddBookModal);
    
    document.getElementById('quick-add-member-btn').addEventListener('click', openAddMemberModal);
    document.getElementById('add-member-trigger').addEventListener('click', openAddMemberModal);

    // Check for active login session in localStorage
    const storedUser = localStorage.getItem('esec_current_user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            loginUser(user.username, user.role, user);
        } catch (e) {
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
});
