// Fast2SMS OTP Service - Serverless Function
const FAST2SMS_API_KEY = process.env.VITE_FAST2SMS_API_KEY;

// In-memory OTP storage (Note: This resets on each function call in serverless)
// For production, use a database or Redis
const otpStore = new Map();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, phoneNumber, otp } = req.body;

  if (action === 'send') {
    try {
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
      }

      const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);

      if (cleanNumber.length !== 10) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
      }

      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Your Vasudha KYC OTP is ${generatedOTP}. Valid for 10 mins. Do not share. वसुधा OTP: ${generatedOTP}। 10 मिनट वैध। साझा न करें।`;

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          flash: 0,
          numbers: cleanNumber
        })
      });

      const data = await response.json();

      if (data.return === true) {
        // Store in temporary storage (use database in production)
        global.otpStore = global.otpStore || new Map();
        global.otpStore.set(cleanNumber, {
          otp: generatedOTP,
          timestamp: Date.now()
        });

        return res.json({
          success: true,
          message: 'OTP sent successfully',
          testOTP: generatedOTP // For testing - remove in production
        });
      } else {
        return res.status(400).json({
          success: false,
          error: data.message || 'Failed to send OTP'
        });
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP'
      });
    }
  } else if (action === 'verify') {
    try {
      if (!phoneNumber || !otp) {
        return res.status(400).json({ success: false, error: 'Phone number and OTP required' });
      }

      const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
      global.otpStore = global.otpStore || new Map();
      const storedData = global.otpStore.get(cleanNumber);

      if (!storedData) {
        return res.status(400).json({
          success: false,
          error: 'OTP not found or expired'
        });
      }

      const now = Date.now();
      if (now - storedData.timestamp > 10 * 60 * 1000) {
        global.otpStore.delete(cleanNumber);
        return res.status(400).json({
          success: false,
          error: 'OTP expired'
        });
      }

      if (storedData.otp === otp.trim()) {
        global.otpStore.delete(cleanNumber);
        return res.json({
          success: true,
          message: 'OTP verified successfully'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP'
        });
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Verification failed'
      });
    }
  } else {
    return res.status(400).json({ success: false, error: 'Invalid action' });
  }
}
