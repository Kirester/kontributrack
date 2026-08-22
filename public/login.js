// login.js - Client logic for Officer Login page

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginAlert = document.getElementById('login-alert');
  const btnLogin = document.getElementById('btn-login');

  // Check if officer is already logged in
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data = await res.json();
    if (data.loggedIn) {
      window.location.href = '/index.html';
      return;
    }
  } catch (err) {
    console.error('Session check error:', err);
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.className = 'alert-msg';
    loginAlert.textContent = '';
    btnLogin.disabled = true;
    btnLogin.textContent = 'Authenticating...';

    const credentials = {
      username: usernameInput.value.trim(),
      password: passwordInput.value
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      loginAlert.className = 'alert-msg success';
      loginAlert.textContent = `Welcome, ${data.officer.name}! Redirecting...`;

      setTimeout(() => {
        window.location.href = '/index.html';
      }, 500);
    } catch (err) {
      loginAlert.className = 'alert-msg error';
      loginAlert.textContent = err.message;
      btnLogin.disabled = false;
      btnLogin.textContent = 'Log In to Portal';
    }
  });
});
