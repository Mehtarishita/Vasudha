// Simple OTP Service - Universal OTP for development
const UNIVERSAL_OTP = '000000';

// In-memory OTP storage
const localOtpStore = new Map();

// Send OTP (mock - just stores universal OTP)
export async function sendOTP(mobileNumber) {
  try {
    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    
    if (cleanNumber.length !== 10) {
      throw new Error('Invalid mobile number format');
    }

    // Store universal OTP
    localOtpStore.set(cleanNumber, {
      otp: UNIVERSAL_OTP,
      timestamp: Date.now()
    });

    console.log('✅ OTP generated (Test Mode):', UNIVERSAL_OTP);

    return {
      success: true,
      message: 'OTP sent successfully',
      testOTP: UNIVERSAL_OTP
    };
  } catch (error) {
    console.error('❌ Send OTP Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP'
    };
  }
}

// Verify OTP
export async function verifyOTP(mobileNumber, userOTP) {
  try {
    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    const storedData = localOtpStore.get(cleanNumber);

    if (!storedData) {
      return {
        success: false,
        error: 'OTP not found. Please request a new OTP.'
      };
    }

    // Check expiry (10 minutes)
    const now = Date.now();
    if (now - storedData.timestamp > 10 * 60 * 1000) {
      localOtpStore.delete(cleanNumber);
      return {
        success: false,
        error: 'OTP expired. Please request a new OTP.'
      };
    }

    // Verify OTP
    if (storedData.otp === userOTP.trim()) {
      localOtpStore.delete(cleanNumber);
      console.log('✅ OTP verified successfully');
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } else {
      return {
        success: false,
        error: 'Invalid OTP. Please try again.'
      };
    }
  } catch (error) {
    console.error('❌ Verification Error:', error);
    return {
      success: false,
      error: 'Verification failed'
    };
  }
}

// Cleanup expired OTPs
setInterval(() => {
  const now = Date.now();
  for (const [number, data] of localOtpStore.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) {
      localOtpStore.delete(number);
    }
  }
}, 60000);
