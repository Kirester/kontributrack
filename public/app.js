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

  // Payment Modal Elements
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

  // QR Modal & Printing Elements
  const qrModal = document.getElementById('qr-modal');
  const qrModalTitle = document.getElementById('qr-modal-title');
  const qrImg = document.getElementById('qr-img');
  const qrUrlText = document.getElementById('qr-url-text');
  const qrModalCloseBtn = document.getElementById('qr-modal-close-btn');
  const qrModalCloseBottom = document.getElementById('qr-modal-close-bottom');
  const btnPrintQrModal = document.getElementById('btn-print-qr-modal');
  const btnPrintAllCards = document.getElementById('btn-print-all-cards');
  const printArea = document.getElementById('print-area');

  // Local memory store for current members roster and active modal member
  let cachedMembers = [];
  let currentModalMember = { id: null, name: '' };

  // 1. Verify Officer Session on Load
  try {
    const authRes = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' }
    });
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

  qrModalCloseBtn.addEventListener('click', closeQrModal);
  qrModalCloseBottom.addEventListener('click', closeQrModal);

  btnPrintQrModal.addEventListener('click', printSingleCard);
  btnPrintAllCards.addEventListener('click', printAllCards);

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
      membersTableBody.innerHTML = '<tr><td colspan="7" class="text-center loading-text">Loading member records...</td></tr>';
      
      const response = await fetch('/api/officer/members');
      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      cachedMembers = data.members || [];
      renderMembersTable(cachedMembers);
    } catch (err) {
      console.error('[Error loading members]:', err);
      membersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading data: ${err.message}</td></tr>`;
    }
  }

  /**
   * Render table rows and update summary bar metrics
   */
  function renderMembersTable(members) {
    if (members.length === 0) {
      membersTableBody.innerHTML = '<tr><td colspan="7" class="text-center loading-text">No members registered yet. Register a member to get started.</td></tr>';
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
            <button class="btn btn-secondary btn-sm btn-qr-code" 
                    data-id="${m.id}" 
                    data-name="${escapeHtml(m.name)}">
              📱 QR Code
            </button>
          </td>
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

    // Attach click listeners to "QR Code" buttons
    document.querySelectorAll('.btn-qr-code').forEach(btn => {
      btn.addEventListener('click', () => {
        openQrModal(btn.dataset.id, btn.dataset.name);
      });
    });
  }

  /**
   * Helper: Resolve base server URL (e.g. dynamic local IP / APP_URL)
   */
  async function getAppBaseUrl() {
    let baseUrl = window.location.origin;
    try {
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.app_url) {
          baseUrl = configData.app_url;
        }
      }
    } catch (e) {
      console.warn('Could not fetch /api/config, using window.location.origin');
    }
    return baseUrl;
  }

  /**
   * Helper: Asynchronously generate a base64 QR Data URL (uses Node server endpoint first, fallback to client JS lib)
   */
  async function generateQrDataUrl(text) {
    // 1. Try backend node endpoint (100% offline capable base64 PNG)
    try {
      const res = await fetch(`/api/qr?text=${encodeURIComponent(text)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.dataUrl) return data.dataUrl;
      }
    } catch (e) {
      console.warn('Server QR fetch fallback:', e);
    }

    // 2. Fallback to client-side QRCode library
    return new Promise((resolve) => {
      if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
        window.QRCode.toDataURL(text, { width: 260, margin: 1 }, (err, url) => {
          if (!err && url) resolve(url);
          else resolve(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`);
        });
      } else {
        resolve(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`);
      }
    });
  }

  /**
   * Helper: Wait for all QR images in printArea container to fully decode and load before triggering print dialog
   */
  async function waitForPrintImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
    // 150ms buffer for browser paint engine to render bitmap layer before print dialog freezes UI
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  /**
   * Helper: Generate card HTML string for a member ID card
   */
  function createPrintableCardHtml(member, qrUrl, fullCheckUrl) {
    return `
      <div class="printable-card">
        <div class="card-brand">
          <span class="card-brand-title">KontribuTrack</span>
          <span class="card-brand-sub">Official Member Card</span>
        </div>
        <div class="card-member-info">
          <h4 class="member-card-name">${escapeHtml(member.name)}</h4>
          <div class="member-card-id">Member ID: #${member.id}</div>
        </div>
        <div class="card-qr-box">
          <img class="qr-code-img" src="${qrUrl}" alt="Member Self-Check QR Code">
        </div>
        <div class="qr-url-text">${escapeHtml(fullCheckUrl)}</div>
        <div class="card-instructions">
          📱 Scan with any phone camera to verify payment status
        </div>
        <div class="card-footer-note">
          🔒 Verification PIN required when checking status
        </div>
      </div>
    `;
  }

  /**
   * Open QR Code Modal for a member using server configured IP / APP_URL
   */
  async function openQrModal(id, name) {
    currentModalMember = { id, name };
    const baseUrl = await getAppBaseUrl();
    const fullCheckUrl = `${baseUrl}/check-status.html?id=${id}`;

    qrModalTitle.textContent = `Member QR Card: ${name}`;
    document.getElementById('qr-card-member-name').textContent = name;
    document.getElementById('qr-card-member-id').textContent = `Member ID: #${id}`;
    qrUrlText.textContent = fullCheckUrl;

    const qrDataUrl = await generateQrDataUrl(fullCheckUrl);
    qrImg.src = qrDataUrl;

    qrModal.classList.add('active');
  }

  function closeQrModal() {
    qrModal.classList.remove('active');
  }

  /**
   * Print single physical QR card for a specific member ID & Name directly
   */
  async function printSingleCardForMember(id, name) {
    const baseUrl = await getAppBaseUrl();
    const fullCheckUrl = `${baseUrl}/check-status.html?id=${id}`;
    const qrDataUrl = await generateQrDataUrl(fullCheckUrl);

    const cardHtml = createPrintableCardHtml({ id, name }, qrDataUrl, fullCheckUrl);

    printArea.innerHTML = `<div class="print-grid single-card-grid">${cardHtml}</div>`;
    await waitForPrintImages(printArea);
    window.print();
  }

  /**
   * Print single member QR card from active modal
   */
  async function printSingleCard() {
    if (!currentModalMember.id) return;
    await printSingleCardForMember(currentModalMember.id, currentModalMember.name);
  }

  /**
   * Print batch physical QR cards for all members in the roster
   */
  async function printAllCards() {
    if (!cachedMembers || cachedMembers.length === 0) {
      alert('No members available to print cards.');
      return;
    }

    const btnPrintAll = document.getElementById('btn-print-all-cards');
    const originalText = btnPrintAll.textContent;
    btnPrintAll.disabled = true;
    btnPrintAll.textContent = 'Preparing Cards...';

    try {
      const baseUrl = await getAppBaseUrl();
      const cardsHtmlArray = [];

      for (const m of cachedMembers) {
        const fullCheckUrl = `${baseUrl}/check-status.html?id=${m.id}`;
        const qrDataUrl = await generateQrDataUrl(fullCheckUrl);
        cardsHtmlArray.push(createPrintableCardHtml(m, qrDataUrl, fullCheckUrl));
      }

      printArea.innerHTML = `<div class="print-grid">${cardsHtmlArray.join('')}</div>`;
      await waitForPrintImages(printArea);
      window.print();
    } catch (err) {
      console.error('Error rendering printable cards:', err);
      alert('Failed to generate printable cards.');
    } finally {
      btnPrintAll.disabled = false;
      btnPrintAll.textContent = originalText;
    }
  }

  /**
   * Handle Add Member form submission (Disables submit button to prevent double-click duplicates)
   */
  async function handleAddMember(e) {
    e.preventDefault();
    addMemberMsg.className = 'alert-msg';
    addMemberMsg.textContent = '';

    const btnAddMember = document.getElementById('btn-add-member');
    btnAddMember.disabled = true;
    btnAddMember.textContent = 'Registering...';

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
    } finally {
      btnAddMember.disabled = false;
      btnAddMember.textContent = '+ Register Member';
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
   * Handle Log Payment submission (Disables submit button to prevent double-click duplicates)
   */
  async function handleLogPayment(e) {
    e.preventDefault();

    const btnSavePayment = document.getElementById('btn-save-payment');
    btnSavePayment.disabled = true;
    btnSavePayment.textContent = 'Saving...';

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
    } finally {
      btnSavePayment.disabled = false;
      btnSavePayment.textContent = 'Save Payment Record';
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
