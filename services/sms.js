// services/sms.js - iProgSMS integration for KontribuTrack
// Sends real SMS messages via the iProgSMS API (https://www.iprogsms.com).
// Token is read from process.env.IPROG_SMS_API_TOKEN — never hardcoded.

const IPROGSMS_API_URL = 'https://www.iprogsms.com/api/v1/sms_messages';

/**
 * sendSms - Sends a single SMS message via the iProgSMS API.
 *
 * How it works:
 *   1. Reads the API token from the IPROG_SMS_API_TOKEN environment variable.
 *   2. POSTs a JSON payload with api_token, phone_number, and message to iProgSMS.
 *   3. Returns { success, messageId, error } so the caller can inspect the result.
 *
 * Error handling:
 *   - If the token is missing, logs a warning and returns early (no crash).
 *   - If the HTTP request fails or iProgSMS returns an error, logs the error
 *     but NEVER throws — SMS failure must not crash the server or block payments.
 *
 * @param {string} phoneNumber - Recipient phone number (e.g. "09171234567")
 * @param {string} message     - The SMS text content to send
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
/**
 * Normalizes Philippine phone numbers to standard 11-digit "09XXXXXXXXX" format.
 * Accepts: "09171234567", "9171234567", "+639171234567", "639171234567"
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, ''); // Remove non-digit characters (+, -, spaces)
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

async function sendSms(phoneNumber, message) {
  // Guard: Make sure the API token is configured in .env
  const apiToken = process.env.IPROG_SMS_API_TOKEN;
  if (!apiToken) {
    console.warn('[SMS WARNING] IPROG_SMS_API_TOKEN is not set in .env — skipping SMS send. The server will continue to work, but no SMS will be sent.');
    return { success: false, error: 'API token not configured' };
  }

  // Guard: Make sure we have a phone number to send to
  if (!phoneNumber || String(phoneNumber).trim() === '') {
    console.warn('[SMS WARNING] No phone number provided — skipping SMS send.');
    return { success: false, error: 'No phone number provided' };
  }

  const formattedPhone = normalizePhoneNumber(phoneNumber);

  try {
    // POST to iProgSMS API with JSON body containing the required fields:
    //   api_token    - authentication token from .env
    //   phone_number - the recipient's mobile number
    //   message      - the SMS text content
    const response = await fetch(IPROGSMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_token: apiToken,
        phone_number: formattedPhone,
        message: message
      })
    });

    // Parse the JSON response from iProgSMS
    const data = await response.json();

    // iProgSMS returns status 200 on success with a message_id
    if (response.ok && data.status === 200) {
      console.log(`[SMS SUCCESS] Message queued via iProgSMS. Message ID: ${data.message_id}, Recipient: ${phoneNumber}`);
      return { success: true, messageId: data.message_id };
    } else {
      // API returned a non-success response (e.g. insufficient credits, invalid token)
      console.error(`[SMS ERROR] iProgSMS API returned an error. Status: ${data.status}, Message: ${data.message || 'Unknown error'}`);
      return { success: false, error: data.message || 'iProgSMS API error' };
    }
  } catch (err) {
    // Network error, timeout, DNS failure, etc. — log it but don't crash the server
    console.error(`[SMS ERROR] Failed to reach iProgSMS API. Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { sendSms };
