// check-status.js - Client-side script for Public Member Self-Check page

document.addEventListener('DOMContentLoaded', () => {
  const checkForm = document.getElementById('check-status-form');
  const memberIdInput = document.getElementById('member-id-input');
  const pinInput = document.getElementById('pin-input');
  const btnCheckStatus = document.getElementById('btn-check-status');
  const checkAlert = document.getElementById('check-alert');

  const resultCard = document.getElementById('result-card');
  const resultBadge = document.getElementById('result-badge');
  const resultMemberName = document.getElementById('result-member-name');
  const resultMonthlyDue = document.getElementById('result-monthly-due');
  const resultLastPayment = document.getElementById('result-last-payment');
  const btnCheckAnother = document.getElementById('btn-check-another');
  const btnTogglePin = document.getElementById('btn-toggle-pin');

  // Toggle PIN visibility (Show/Hide PIN with Eye icon)
  if (btnTogglePin && pinInput) {
    btnTogglePin.addEventListener('click', () => {
      const isPassword = pinInput.type === 'password';
      pinInput.type = isPassword ? 'text' : 'password';
      btnTogglePin.setAttribute('aria-label', isPassword ? 'Hide PIN' : 'Show PIN');
      btnTogglePin.setAttribute('title', isPassword ? 'Hide PIN' : 'Show PIN');

      if (isPassword) {
        // Eye-off icon (PIN is visible as plain text)
        btnTogglePin.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        // Eye icon (PIN is obscured)
        btnTogglePin.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  }

  // Auto-fill Member ID input if ?id=X parameter is present in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('id')) {
    const paramId = urlParams.get('id');
    if (paramId && !isNaN(paramId)) {
      memberIdInput.value = paramId;
      pinInput.focus();
    }
  }

  // Handle Form Submission
  checkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    checkAlert.className = 'alert-msg';
    checkAlert.textContent = '';
    resultCard.classList.add('hidden');

    const payload = {
      member_id: parseInt(memberIdInput.value, 10),
      pin: pinInput.value.trim()
    };

    btnCheckStatus.disabled = true;
    btnCheckStatus.textContent = 'Verifying PIN...';

    try {
      const response = await fetch('/api/member/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid Member ID or PIN.');
      }

      // Display Status Result
      renderResultCard(data.member);
    } catch (err) {
      checkAlert.className = 'alert-msg error';
      checkAlert.textContent = err.message;
    } finally {
      btnCheckStatus.disabled = false;
      btnCheckStatus.textContent = 'Check Payment Status';
    }
  });

  btnCheckAnother.addEventListener('click', () => {
    resultCard.classList.add('hidden');
    checkForm.reset();
    memberIdInput.focus();
  });

  function renderResultCard(member) {
    resultMemberName.textContent = member.name;
    resultMonthlyDue.textContent = `₱${Number(member.monthly_due).toFixed(2)}`;
    resultLastPayment.textContent = member.last_payment_date
      ? formatDate(member.last_payment_date)
      : 'No recorded payments yet';

    if (member.paid_this_month) {
      resultBadge.className = 'status-badge paid';
      resultBadge.textContent = '✓ PAID FOR THIS MONTH';
    } else {
      resultBadge.className = 'status-badge unpaid';
      resultBadge.textContent = '! UNPAID FOR THIS MONTH';
    }

    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function formatDate(dateStr) {
    try {
      const [year, month, day] = dateStr.split('-');
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }
});
