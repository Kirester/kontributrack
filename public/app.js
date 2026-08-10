// app.js - Client-side logic for KontribuTrack Officer Dashboard

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const membersTableBody = document.getElementById('members-table-body');
  const addMemberForm = document.getElementById('add-member-form');
  const addMemberMsg = document.getElementById('add-member-msg');
  const btnRefresh = document.getElementById('btn-refresh');

  const statTotalMembers = document.getElementById('stat-total-members');
  const statPaidCount = document.getElementById('stat-paid-count');
  const statUnpaidCount = document.getElementById('stat-unpaid-count');

  const officerNameDisplay = document.getElementById('officer-name-display');
  const btnLogout = document.getElementById('btn-logout');

  // Modal Elements
  const paymentModal = document.getElementById('payment-modal');
  const paymentForm = document.getElementById('payment-form');
  const payMemberId = document.getElementById('pay-member-id');
  const payMemberName = document.getElementById('pay-member-name');
  const payAmount = document.getElementById('pay-amount');
  const payDate = document.getElementById('pay-date');

  const duplicateWarning = document.getElementById('duplicate-warning');
  const duplicateWarningText = document.getElementById('duplicate-warning-text');
  const confirmDuplicateCheckbox = document.getElementById('confirm-duplicate-checkbox');

  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  // 1. Verify Officer Session on Load
  try {
    const authRes = await fetch('/api/auth/me');
    const authData = await authRes.json();

    if (!authData.loggedIn) {
      window.location.href = '/login.html';
      return;
    }

    // Update dynamic officer badge in header
    officerNameDisplay.textContent = authData.officer.name || authData.officer.username;
  } catch (err) {
    console.error('Auth verification error:', err);
    window.location.href = '/login.html';
    return;
  }

  // Initial Load of Member records
  loadMembers();

  // Event Listeners
  btnRefresh.addEventListener('click', loadMembers);
  addMemberForm.addEventListener('submit', handleAddMember);
  paymentForm.addEventListener('submit', handleLogPayment);
  btnLogout.addEventListener('click', handleLogout);

  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);

  /**
   * Handle Officer Logout
   */
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login.html';
    }
  }

  /**
   * Fetch member list with current-month payment status from backend
   */
  async function loadMembers() {
    try {
      membersTableBody.innerHTML = '<tr><td colspan="6" class="text-center loading-text">Loading member records...</td></tr>';
      
      const response = await fetch('/api/officer/members');
      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      renderMembersTable(data.members || []);
    } catch (err) {
      console.error('[Error loading members]:', err);
      membersTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading data: ${err.message}</td></tr>`;
    }
  }

  /**
   * Render table rows and update summary bar metrics
   */
  function renderMembersTable(members) {
    if (members.length === 0) {
      membersTableBody.innerHTML = '<tr><td colspan="6" class="text-center loading-text">No members registered yet. Register a member to get started.</td></tr>';
      statTotalMembers.textContent = '0';
      statPaidCount.textContent = '0';
      statUnpaidCount.textContent = '0';
      return;
    }

    let paidCount = 0;
    let unpaidCount = 0;

    const rowsHtml = members.map(m => {
      const isPaid = Boolean(m.paid_this_month);
      if (isPaid) paidCount++; else unpaidCount++;

      const statusBadge = isPaid
        ? `<span class="status-badge paid">✓ Paid</span>`
        : `<span class="status-badge unpaid">! Unpaid</span>`;

      return `
        <tr>
          <td>#${m.id}</td>
          <td><strong>${escapeHtml(m.name)}</strong></td>
          <td>${escapeHtml(m.contact_number || 'N/A')}</td>
          <td>₱${Number(m.monthly_due).toFixed(2)}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-log-pay" 
                    data-id="${m.id}" 
                    data-name="${escapeHtml(m.name)}" 
                    data-due="${m.monthly_due}">
              Log Payment
            </button>
          </td>
        </tr>
      `;
    }).join('');

    membersTableBody.innerHTML = rowsHtml;

    // Update compact summary bar
    statTotalMembers.textContent = members.length;
    statPaidCount.textContent = paidCount;
    statUnpaidCount.textContent = unpaidCount;

    // Attach click listeners to "Log Payment" buttons
    document.querySelectorAll('.btn-log-pay').forEach(btn => {
      btn.addEventListener('click', () => {
        openPaymentModal(btn.dataset.id, btn.dataset.name, btn.dataset.due);
      });
    });
  }

  /**
   * Handle Add Member form submission
   */
  async function handleAddMember(e) {
    e.preventDefault();
    addMemberMsg.className = 'alert-msg';
    addMemberMsg.textContent = '';

    const memberData = {
      name: document.getElementById('member-name').value,
      contact_number: document.getElementById('contact-number').value,
      monthly_due: parseFloat(document.getElementById('monthly-due').value),
      pin: document.getElementById('member-pin').value
    };

    try {
      const response = await fetch('/api/officer/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      addMemberMsg.className = 'alert-msg success';
      addMemberMsg.textContent = `Member "${data.member.name}" added successfully!`;
      addMemberForm.reset();
      document.getElementById('monthly-due').value = '100.00';

      loadMembers();
    } catch (err) {
      addMemberMsg.className = 'alert-msg error';
      addMemberMsg.textContent = err.message;
    }
  }

  /**
   * Open payment modal for selected member
   */
  function openPaymentModal(id, name, due) {
    payMemberId.value = id;
    payMemberName.value = name;
    payAmount.value = due || '100.00';
    payDate.value = new Date().toISOString().split('T')[0];
    
    duplicateWarning.classList.add('hidden');
    confirmDuplicateCheckbox.checked = false;

    paymentModal.classList.add('active');
  }

  function closeModal() {
    paymentModal.classList.remove('active');
    paymentForm.reset();
  }

  /**
   * Handle Log Payment submission (logged_by comes directly from officer session!)
   */
  async function handleLogPayment(e) {
    e.preventDefault();

    const paymentPayload = {
      member_id: parseInt(payMemberId.value, 10),
      amount: parseFloat(payAmount.value),
      date_paid: payDate.value,
      allow_duplicate: confirmDuplicateCheckbox.checked
    };

    try {
      const response = await fetch('/api/officer/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      });

      const data = await response.json();

      if (response.status === 409) {
        duplicateWarningText.textContent = data.message;
        duplicateWarning.classList.remove('hidden');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log payment');
      }

      closeModal();
      loadMembers();
    } catch (err) {
      alert(`Error logging payment: ${err.message}`);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
