# KontribuTrack — coding standards

Stack: Node.js + Express backend, SQLite for now (swap to Postgres later if needed).
Plain HTML/CSS/vanilla JS frontend for the treasurer dashboard — no framework yet, keep it simple for a capstone timeline.
No SMS gateway integration yet — for now, log SMS actions to console instead of calling a real API. We'll wire in Semaphore or a similar PH SMS gateway once the core logic works.

Rules:
- Every payment record needs: member_id, amount, date_paid, logged_by, timestamp (this is the audit trail, don't skip it).
- Role separation matters: treasurer/officer routes and member self-check routes must be clearly separate, not shared logic with a permission flag bolted on.
- Self-check must require a PIN or last-4-digits match before returning any payment status. Never return status without that check.
- Write comments explaining what each route does, I'm a student and need to understand this, not just have it work.
- Keep it MVP. Don't add features I didn't ask for.
