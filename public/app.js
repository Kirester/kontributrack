// app.js - Client-side logic for KontribuTrack Officer Dashboard

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const membersTableBody = document.getElementById('members-table-body');
  const addMemberForm = document.getElementById('add-member-form');
  const addMemberMsg = document.getElementById('add-member-msg');
  const btnRefresh = document.getElementById('btn-refresh');

  const statTotalMembers = document.getElementById('stat-total-members');
  const statPaidCount = document.getElementById('stat-paid-count');
  const statUnpaidCount = document.getElementById('stat-unpaid-count');

  // Modal Elements
  const paymentModal = document.getElementById('payment-modal');
  const paymentForm = document.getElementById('payment-form');
  const payMemberId = document.getElementById('pay-member-id');
  const payMemberName = document.getElementById('pay-member-name');
  const payAmount = document.getElementById('pay-amount');
  const payDate = document.getElementById('pay-date');
  const payOfficer = document.getElementById('pay-officer');

  const duplicateWarning = document.getElementById('duplicate-warning');
  const duplicateWarningText = document.getElementById('duplicate-warning-text');
  const confirmDuplicateCheckbox = document.getElementById('confirm-duplicate-checkbox');

  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  // Initial Load
  loadMembers();

  // Set default date to today in YYYY-MM-DD format
  const todayStr = new Date().toISOString().split('T')[0];
  payDate.value = todayStr;

  // Event Listeners
  btnRefresh.addEventListener('click', loadMembers);
  addMemberForm.addEventListener('submit', handleAddMember);
  paymentForm.addEventListener('submit', handleLogPayment);

  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);

  /**
   * Fetch member list with current-month payment status from backend
   */
  async function loadMembers() {
    try {
      membersTableBody.innerHTML = '<tr><td colspan="6" class="text-center loading-text">Loading members...</td></tr>';
      
      const response = await fetch('/api/officer/members');
      const data = await response.json();

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
   * Render table rows and update top summary stats
   */
  function renderMembersTable(members) {
    if (members.length === 0) {
      membersTableBody.innerHTML = '<tr><td colspan="6" class="text-center loading-text">No members registered yet. Add a member to get started.</td></tr>';
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
        : `<span class="status-badge unpaid">✗ Unpaid</span>`;

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

    // Update stats
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

      // Refresh list
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
    
    // Reset warning state
    duplicateWarning.classList.add('hidden');
    confirmDuplicateCheckbox.checked = false;

    paymentModal.classList.add('active');
  }

  function closeModal() {
    paymentModal.classList.remove('active');
    paymentForm.reset();
  }

  /**
   * Handle Log Payment submission
   */
  async function handleLogPayment(e) {
    e.preventDefault();

    const paymentPayload = {
      member_id: parseInt(payMemberId.value, 10),
      amount: parseFloat(payAmount.value),
      date_paid: payDate.value,
      logged_by: payOfficer.value || 'Treasurer',
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
        // Handle Duplicate Payment warning
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
