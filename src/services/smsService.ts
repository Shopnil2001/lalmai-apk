import { CONFIG } from './config';

/**
 * Service to interact with bulksmsbd.net gateway API.
 */
export const smsService = {
  /**
   * Dispatches an OTP verification code to a recipient phone number.
   * @param phoneNumber - Recipient phone number (e.g. 01712345678 or +8801712345678)
   * @param otp - 6-digit OTP verification code
   */
  sendOTP: async (phoneNumber: string, otp: string): Promise<boolean> => {
    // 1. Sanitize the recipient number to 13 digits starting with '880' as required by BulkSMSBD
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = '88' + cleanPhone;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('1')) {
      cleanPhone = '880' + cleanPhone;
    }

    const apiKey = process.env.EXPO_PUBLIC_BULKSMSBD_API_KEY || 'MRdRS0vWffYPHV3uEkph';
    // Use the approved senderid (if not set in env, fallback to a standard approved gateway senderid)
    const senderId = process.env.EXPO_PUBLIC_BULKSMSBD_SENDER_ID || '8809612446294';
    const message = `LRC Verification Code: ${otp}. Valid for 5 minutes.`;

    if (CONFIG.USE_MOCK_DATA) {
      console.log(`[MOCK SMS] BulkSMSBD SMS successfully simulated to ${cleanPhone}: "${message}"`);
      return true;
    }

    try {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(senderId)}&number=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('[SMSService] Failed to parse API response as JSON:', responseText);
        // BulkSMSBD API sometimes returns code directly or raw strings, check if successful indication is there
        return responseText.includes('202') || responseText.toLowerCase().includes('success');
      }

      // BulkSMSBD API success response usually contains response_code: "202" or similar
      if (data && (data.response_code === '202' || data.response_code === 202 || String(data.success).toLowerCase() === 'true')) {
        console.log(`[SMSService] SMS sent successfully to ${cleanPhone}. Response:`, data);
        return true;
      } else {
        console.error('[SMSService] BulkSMSBD gateway returned error:', data);
        return false;
      }
    } catch (error) {
      console.error('[SMSService] Failed to send SMS via BulkSMSBD:', error);
      return false;
    }
  }
};
