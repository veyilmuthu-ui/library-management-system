document.addEventListener('DOMContentLoaded', () => {
    // Global State
    let books = [];
    let members = [];
    let transactions = [];
    let categories = [];
    let currentViewMode = 'grid';

    // DOM Elements - Navigation & Views
    const navItems = document.querySelectorAll('.nav-item');
    const tabViews = document.querySelectorAll('.tab-view');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    // DOM Elements - Stats
    const statTotalBooks = document.getElementById('stat-total-books');
    const statTotalCopies = document.getElementById('stat-total-copies');
    const statAvailableCopies = document.getElementById('stat-available-copies');
    const statActiveMembers = document.getElementById('stat-active-members');
    const statActiveLoans = document.getElementById('stat-active-loans');
    const statOverdueLoans = document.getElementById('stat-overdue-loans');

    // DOM Elements - Books & Lists
    const booksGridContainer = document.getElementById('books-grid-container');
    const booksListContainer = document.getElementById('books-list-container');
    const booksListBody = document.getElementById('books-list-body');
    const bookSearchInput = document.getElementById('book-search-input');
    const bookCategoryFilter = document.getElementById('book-category-filter');
    const viewModeGridBtn = document.getElementById('view-mode-grid');
    const viewModeListBtn = document.getElementById('view-mode-list');

    const recentTxsBody = document.getElementById('recent-transactions-list');
    const dashboardFeaturedBooks = document.getElementById('dashboard-featured-books');
    const membersListBody = document.getElementById('members-list-body');
    const memberSearchInput = document.getElementById('member-search-input');
    const allTxsBody = document.getElementById('all-transactions-list-body');

    // Modals & Forms
    const modalAddBook = document.getElementById('modal-add-book');
    const modalAddMember = document.getElementById('modal-add-member');
    const modalIssueBook = document.getElementById('modal-issue-book');

    const formAddBook = document.getElementById('form-add-book');
    const formAddMember = document.getElementById('form-add-member');
    const formIssueBook = document.getElementById('form-issue-book');

    const issueBookSelect = document.getElementById('issue-book-select');
    const issueMemberSelect = document.getElementById('issue-member-select');

    // Navigation Subtitles
    const subtitlesMap = {
        'dashboard': 'Overview & Real-time Library Metrics',
        'books': 'Explore, Manage & Search Library Inventory',
        'members': 'Registered Library Members & Patron Profiles',
        'transactions': 'Real-time Book Issue & Return Circulation Log'
    };

    // --- Init App ---
    function init() {
        bindEvents();
        refreshAllData();
    }

    // --- API Data Fetching ---
    async function refreshAllData() {
        await Promise.all([
            fetchStats(),
            fetchBooks(),
            fetchMembers(),
            fetchTransactions(),
            fetchCategories()
        ]);
        renderDashboard();
        renderBooks();
        renderMembers();
        renderTransactions();
        populateIssueDropdowns();
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            statTotalBooks.textContent = data.total_books || 0;
            statTotalCopies.textContent = `${data.total_copies || 0} physical copies`;
            statAvailableCopies.textContent = data.available_copies || 0;
            statActiveMembers.textContent = data.active_members || 0;
            statActiveLoans.textContent = data.active_loans || 0;
            statOverdueLoans.textContent = `${data.overdue_loans || 0} Overdue`;
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }

    async function fetchBooks() {
        try {
            const search = bookSearchInput ? bookSearchInput.value : '';
            const cat = bookCategoryFilter ? bookCategoryFilter.value : '';
            const res = await fetch(`/api/books?q=${encodeURIComponent(search)}&category=${encodeURIComponent(cat)}`);
            books = await res.json();
        } catch (err) {
            console.error('Failed to fetch books:', err);
        }
    }

    async function fetchMembers() {
        try {
            const res = await fetch('/api/members');
            members = await res.json();
        } catch (err) {
            console.error('Failed to fetch members:', err);
        }
    }

    async function fetchTransactions() {
        try {
            const res = await fetch('/api/transactions');
            transactions = await res.json();
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        }
    }

    async function fetchCategories() {
        try {
            const res = await fetch('/api/categories');
            categories = await res.json();
            if (bookCategoryFilter) {
                const currentVal = bookCategoryFilter.value;
                bookCategoryFilter.innerHTML = '<option value="">All Categories</option>' +
                    categories.map(c => `<option value="${c}">${c}</option>`).join('');
                bookCategoryFilter.value = currentVal;
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }

    // --- Render Functions ---

    function renderDashboard() {
        // Render Recent Circulation Activity (limit 5)
        const recent = transactions.slice(0, 5);
        if (recent.length === 0) {
            recentTxsBody.innerHTML = `<tr><td colspan="5" class="text-center">No circulation history yet.</td></tr>`;
        } else {
            recentTxsBody.innerHTML = recent.map(t => {
                const statusBadge = t.status === 'Issued' ? '<span class="badge badge-issued">Issued</span>' :
                    t.status === 'Overdue' ? '<span class="badge badge-overdue">Overdue</span>' :
                        '<span class="badge badge-returned">Returned</span>';
                return `
                    <tr>
                        <td><strong>${escapeHtml(t.book_title)}</strong></td>
                        <td>${escapeHtml(t.member_name)}</td>
                        <td>${t.issue_date}</td>
                        <td>${t.due_date}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            }).join('');
        }

        // Render Featured Books Grid
        const featured = books.slice(0, 6);
        dashboardFeaturedBooks.innerHTML = featured.map(b => `
            <div class="mini-book-card">
                <img src="${b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'}" class="mini-book-cover" alt="Cover">
                <div class="mini-book-title">${escapeHtml(b.title)}</div>
                <div class="mini-book-author">${escapeHtml(b.author)}</div>
            </div>
        `).join('');
    }

    function renderBooks() {
        if (currentViewMode === 'grid') {
            booksGridContainer.classList.remove('hidden');
            booksListContainer.classList.add('hidden');

            if (books.length === 0) {
                booksGridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No books match your criteria.</div>`;
                return;
            }

            booksGridContainer.innerHTML = books.map(b => {
                const isAvailable = b.available_copies > 0;
                const stockBadge = isAvailable ?
                    `<span class="stock-badge available"><i class="fa-solid fa-check"></i> ${b.available_copies} of ${b.total_copies} Available</span>` :
                    `<span class="stock-badge out"><i class="fa-solid fa-xmark"></i> Out of Stock</span>`;

                return `
                    <div class="book-card">
                        <div class="book-cover-wrapper">
                            <img src="${b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'}" class="book-cover-img" alt="${escapeHtml(b.title)}">
                            <span class="category-tag">${escapeHtml(b.category)}</span>
                        </div>
                        <div class="book-body">
                            <h4 class="book-title">${escapeHtml(b.title)}</h4>
                            <p class="book-author">${escapeHtml(b.author)}</p>
                            <div class="book-meta">
                                <span class="isbn-code">ISBN: ${escapeHtml(b.isbn)}</span>
                                ${stockBadge}
                            </div>
                            <div style="margin-top: 12px; display: flex; gap: 8px;">
                                <button class="btn btn-secondary btn-issue-this" data-id="${b.id}" style="flex:1; padding: 6px 10px; font-size: 0.8rem;" ${!isAvailable ? 'disabled' : ''}>
                                    <i class="fa-solid fa-hand-holding"></i> Issue
                                </button>
                                <button class="btn btn-secondary btn-delete-book" data-id="${b.id}" style="padding: 6px 10px; font-size: 0.8rem;" title="Delete Book">
                                    <i class="fa-solid fa-trash" style="color: var(--accent-red);"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            booksGridContainer.classList.add('hidden');
            booksListContainer.classList.remove('hidden');

            if (books.length === 0) {
                booksListBody.innerHTML = `<tr><td colspan="7" class="text-center">No books found.</td></tr>`;
                return;
            }

            booksListBody.innerHTML = books.map(b => {
                const stockBadge = b.available_copies > 0 ?
                    `<span class="stock-badge available">${b.available_copies} / ${b.total_copies}</span>` :
                    `<span class="stock-badge out">0 / ${b.total_copies}</span>`;
                return `
                    <tr>
                        <td><img src="${b.cover_url}" style="width: 36px; height: 48px; object-fit: cover; border-radius: 4px;"></td>
                        <td><strong>${escapeHtml(b.title)}</strong></td>
                        <td>${escapeHtml(b.author)}</td>
                        <td><span class="category-tag">${escapeHtml(b.category)}</span></td>
                        <td><code>${escapeHtml(b.isbn)}</code></td>
                        <td>${stockBadge}</td>
                        <td>
                            <button class="btn btn-secondary btn-delete-book" data-id="${b.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash" style="color: var(--accent-red);"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    function renderMembers() {
        const query = memberSearchInput ? memberSearchInput.value.toLowerCase() : '';
        const filtered = members.filter(m => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query));

        if (filtered.length === 0) {
            membersListBody.innerHTML = `<tr><td colspan="6" class="text-center">No members found.</td></tr>`;
            return;
        }

        membersListBody.innerHTML = filtered.map(m => `
            <tr>
                <td>
                    <div style="font-weight: 700;">${escapeHtml(m.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">ID: #${m.id}</div>
                </td>
                <td>
                    <div>${escapeHtml(m.email)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(m.phone || 'N/A')}</div>
                </td>
                <td><span class="badge badge-tier">${escapeHtml(m.membership_type)}</span></td>
                <td>${m.join_date}</td>
                <td><span class="badge badge-returned">${m.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-delete-member" data-id="${m.id}" style="padding: 4px 8px;" title="Delete Member">
                        <i class="fa-solid fa-trash" style="color: var(--accent-red);"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function renderTransactions() {
        if (transactions.length === 0) {
            allTxsBody.innerHTML = `<tr><td colspan="8" class="text-center">No transactions recorded.</td></tr>`;
            return;
        }

        allTxsBody.innerHTML = transactions.map(t => {
            const statusBadge = t.status === 'Issued' ? '<span class="badge badge-issued">Issued</span>' :
                t.status === 'Overdue' ? '<span class="badge badge-overdue">Overdue</span>' :
                    '<span class="badge badge-returned">Returned</span>';
            const actionBtn = (t.status === 'Issued' || t.status === 'Overdue') ?
                `<button class="btn btn-primary btn-return-book" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.8rem;">
                    <i class="fa-solid fa-rotate-left"></i> Return Book
                </button>` : `<span style="color: var(--text-dim); font-size: 0.8rem;">Completed</span>`;

            return `
                <tr>
                    <td>#${t.id}</td>
                    <td><strong>${escapeHtml(t.book_title)}</strong></td>
                    <td>${escapeHtml(t.member_name)}</td>
                    <td>${t.issue_date}</td>
                    <td>${t.due_date}</td>
                    <td>${t.return_date || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');
    }

    function populateIssueDropdowns() {
        const availableBooks = books.filter(b => b.available_copies > 0);
        issueBookSelect.innerHTML = availableBooks.length === 0 ?
            `<option value="">No Available Books</option>` :
            availableBooks.map(b => `<option value="${b.id}">${escapeHtml(b.title)} (${b.available_copies} available)</option>`).join('');

        issueMemberSelect.innerHTML = members.length === 0 ?
            `<option value="">No Active Members</option>` :
            members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${m.email})</option>`).join('');
    }

    // --- Event Listeners ---
    function bindEvents() {
        // Navigation Tab Switching
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                tabViews.forEach(v => {
                    if (v.id === `view-${targetTab}`) {
                        v.classList.add('active');
                    } else {
                        v.classList.remove('active');
                    }
                });

                if (subtitlesMap[targetTab]) {
                    pageTitle.textContent = item.querySelector('span').textContent;
                    pageSubtitle.textContent = subtitlesMap[targetTab];
                }
            });
        });

        // Search & Filter Listeners
        if (bookSearchInput) {
            bookSearchInput.addEventListener('input', async () => {
                await fetchBooks();
                renderBooks();
            });
        }
        if (bookCategoryFilter) {
            bookCategoryFilter.addEventListener('change', async () => {
                await fetchBooks();
                renderBooks();
            });
        }
        if (memberSearchInput) {
            memberSearchInput.addEventListener('input', () => {
                renderMembers();
            });
        }

        // View Mode Toggle
        viewModeGridBtn.addEventListener('click', () => {
            currentViewMode = 'grid';
            viewModeGridBtn.classList.add('active');
            viewModeListBtn.classList.remove('active');
            renderBooks();
        });
        viewModeListBtn.addEventListener('click', () => {
            currentViewMode = 'list';
            viewModeListBtn.classList.add('active');
            viewModeGridBtn.classList.remove('active');
            renderBooks();
        });

        // Quick Navigation Buttons
        document.getElementById('btn-view-all-books').addEventListener('click', () => {
            document.querySelector('[data-tab="books"]').click();
        });
        document.getElementById('btn-view-all-transactions').addEventListener('click', () => {
            document.querySelector('[data-tab="transactions"]').click();
        });

        // Modal Open Buttons
        document.getElementById('btn-open-add-book-modal').addEventListener('click', () => openModal(modalAddBook));
        document.getElementById('btn-open-add-member-modal').addEventListener('click', () => openModal(modalAddMember));
        document.getElementById('btn-open-issue-modal').addEventListener('click', () => {
            populateIssueDropdowns();
            openModal(modalIssueBook);
        });

        // Modal Close Buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(modalAddBook);
                closeModal(modalAddMember);
                closeModal(modalIssueBook);
            });
        });

        // Form Submission - Add Book
        formAddBook.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formAddBook);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/api/books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    showToast('Book added successfully!', 'success');
                    formAddBook.reset();
                    closeModal(modalAddBook);
                    refreshAllData();
                } else {
                    showToast(result.error || 'Failed to add book', 'error');
                }
            } catch (err) {
                showToast('Network error', 'error');
            }
        });

        // Form Submission - Add Member
        formAddMember.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formAddMember);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/api/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    showToast('Member registered successfully!', 'success');
                    formAddMember.reset();
                    closeModal(modalAddMember);
                    refreshAllData();
                } else {
                    showToast(result.error || 'Failed to add member', 'error');
                }
            } catch (err) {
                showToast('Network error', 'error');
            }
        });

        // Form Submission - Issue Book
        formIssueBook.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formIssueBook);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/api/transactions/issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    showToast('Book issued successfully!', 'success');
                    formIssueBook.reset();
                    closeModal(modalIssueBook);
                    refreshAllData();
                } else {
                    showToast(result.error || 'Failed to issue book', 'error');
                }
            } catch (err) {
                showToast('Network error', 'error');
            }
        });

        // Delegated Action Listeners (Return Book & Delete)
        document.addEventListener('click', async (e) => {
            // Return Book
            const returnBtn = e.target.closest('.btn-return-book');
            if (returnBtn) {
                const txId = returnBtn.getAttribute('data-id');
                try {
                    const res = await fetch('/api/transactions/return', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transaction_id: txId })
                    });
                    const result = await res.json();
                    if (res.ok) {
                        showToast('Book returned successfully!', 'success');
                        refreshAllData();
                    } else {
                        showToast(result.error || 'Failed to return book', 'error');
                    }
                } catch (err) {
                    showToast('Network error', 'error');
                }
            }

            // Issue from Book Card
            const issueCardBtn = e.target.closest('.btn-issue-this');
            if (issueCardBtn) {
                const bookId = issueCardBtn.getAttribute('data-id');
                populateIssueDropdowns();
                issueBookSelect.value = bookId;
                openModal(modalIssueBook);
            }

            // Delete Book
            const deleteBookBtn = e.target.closest('.btn-delete-book');
            if (deleteBookBtn) {
                const bookId = deleteBookBtn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this book?')) {
                    try {
                        const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
                        const result = await res.json();
                        if (res.ok) {
                            showToast('Book deleted successfully', 'success');
                            refreshAllData();
                        } else {
                            showToast(result.error || 'Cannot delete book', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }

            // Delete Member
            const deleteMemberBtn = e.target.closest('.btn-delete-member');
            if (deleteMemberBtn) {
                const memberId = deleteMemberBtn.getAttribute('data-id');
                if (confirm('Are you sure you want to remove this member?')) {
                    try {
                        const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
                        const result = await res.json();
                        if (res.ok) {
                            showToast('Member removed successfully', 'success');
                            refreshAllData();
                        } else {
                            showToast(result.error || 'Cannot delete member', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }
        });
    }

    // Modal Helper Utilities
    function openModal(modal) {
        modal.classList.add('active');
    }
    function closeModal(modal) {
        modal.classList.remove('active');
    }

    // Toast Notification Helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // Start
    init();
});
