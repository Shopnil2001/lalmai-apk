import { CONFIG } from './config';

export interface SMSResponse {
  success: boolean;
  messageId?: string | number;
  error?: string;
}

export interface BalanceResponse {
  success: boolean;
  balance?: number;
  error?: string;
}

/**
 * Service to interact with bulksmsbd.net gateway API.
 */
export const smsService = {
  /**
   * Cleans and sanitizes a phone number to standard Bangladesh international format: 8801XXXXXXXXX (13 digits).
   */
  sanitizePhoneNumber: (phoneNumber: string): string => {
    let clean = phoneNumber.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('0')) {
      clean = '88' + clean;
    } else if (clean.length === 10 && clean.startsWith('1')) {
      clean = '880' + clean;
    }
    return clean;
  },

  /**
   * Dispatches a custom SMS message to a recipient phone number via BulkSMSBD API.
   * @param phoneNumber - Recipient phone number (e.g. 01788398614, +8801788398614)
   * @param message - Text message content
   */
  sendSMS: async (phoneNumber: string, message: string): Promise<SMSResponse> => {
    const cleanPhone = smsService.sanitizePhoneNumber(phoneNumber);

    if (cleanPhone.length !== 13 || !cleanPhone.startsWith('8801')) {
      return {
        success: false,
        error: `Invalid Bangladeshi mobile number: "${phoneNumber}". Must be 11 digits (e.g. 017XXXXXXXX).`
      };
    }

    if (CONFIG.USE_MOCK_DATA) {
      console.log(`[MOCK SMS] BulkSMSBD SMS successfully simulated to ${cleanPhone}: "${message}"`);
      return { success: true, messageId: 'MOCK_' + Date.now() };
    }

    const apiKey = CONFIG.bulkSMS.apiKey;
    const senderId = CONFIG.bulkSMS.senderId;
    
    // Always ensure HTTPS is used to prevent Android cleartext network blocks
    let baseUrl = (CONFIG.bulkSMS.baseUrl || 'https://bulksmsbd.net/api').replace(/\/+$/, '');
    if (baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }

    // Prepare URL-encoded parameters
    const params = new URLSearchParams({
      api_key: apiKey,
      type: 'text',
      number: cleanPhone,
      senderid: senderId,
      message: message,
    });

    const endpoint = `${baseUrl}/smsapi`;

    // Attempt sending via POST first, with a 15-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: params.toString(),
          signal: controller.signal,
        });
      } catch (postErr: any) {
        console.warn('[SMSService] POST request failed, retrying via GET fallback:', postErr?.message);
        // Fallback to GET method if POST fails
        const getUrl = `${endpoint}?${params.toString()}`;
        response = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('[SMSService] Failed to parse API response as JSON:', responseText);
        if (responseText.includes('202') || responseText.toLowerCase().includes('success')) {
          return { success: true };
        }
        return { success: false, error: responseText || 'Unknown response from SMS gateway' };
      }

      // BulkSMSBD API success response contains response_code: 202
      if (data && (data.response_code === 202 || data.response_code === '202' || String(data.success).toLowerCase() === 'true')) {
        console.log(`[SMSService] SMS sent successfully to ${cleanPhone}. Message ID: ${data.message_id || 'N/A'}`);
        return {
          success: true,
          messageId: data.message_id,
        };
      } else {
        const errorMsg = data?.error_message || data?.message || `Gateway error (Code ${data?.response_code})`;
        console.error('[SMSService] BulkSMSBD gateway returned error:', data);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      const isAborted = error?.name === 'AbortError';
      const msg = isAborted
        ? 'Connection timed out while reaching SMS Gateway. Please check internet connection.'
        : (error?.message || 'Network error connecting to SMS gateway');

      console.error('[SMSService] Failed to send SMS via BulkSMSBD:', msg);
      return { success: false, error: msg };
    }
  },

  /**
   * Dispatches an OTP verification code to a recipient phone number.
   * @param phoneNumber - Recipient phone number (e.g. 01788398614 or +8801788398614)
   * @param otp - 6-digit OTP verification code
   */
  sendOTP: async (phoneNumber: string, otp: string): Promise<SMSResponse> => {
    const message = `LRC Verification Code: ${otp}. Valid for 5 minutes.`;
    return smsService.sendSMS(phoneNumber, message);
  },

  /**
   * Checks current account balance in BulkSMSBD.
   */
  checkBalance: async (): Promise<BalanceResponse> => {
    if (CONFIG.USE_MOCK_DATA) {
      return { success: true, balance: 100 };
    }

    let baseUrl = (CONFIG.bulkSMS.baseUrl || 'https://bulksmsbd.net/api').replace(/\/+$/, '');
    if (baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }

    try {
      const url = `${baseUrl}/getBalanceApi?api_key=${encodeURIComponent(CONFIG.bulkSMS.apiKey)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && (data.response_code === 202 || data.response_code === '202')) {
        const balance = typeof data.balance === 'number' ? data.balance : parseFloat(data.balance);
        return { success: true, balance };
      } else {
        return { success: false, error: data?.error_message || 'Failed to retrieve balance' };
      }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Network error fetching balance' };
    }
  },
};
