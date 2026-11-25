const Razorpay = require("razorpay");

/**
 * Reads and validates required Razorpay environment variables.
 * Throws an error early if credentials are missing so misconfiguration
 * is caught immediately rather than failing silently.
 */
function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const missing = [];
  if (!keyId) missing.push("RAZORPAY_KEY_ID");
  if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");
  if (!webhookSecret) missing.push("RAZORPAY_WEBHOOK_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. Copy .env.example to .env and fill in your Razorpay Test Mode credentials.`
    );
  }

  if (!keyId.startsWith("rzp_test_")) {
    console.warn(
      "[Warning] RAZORPAY_KEY_ID does not start with 'rzp_test_'. Make sure you are using Razorpay Test Mode keys for development."
    );
  }

  return { keyId, keySecret, webhookSecret };
}

let razorpayInstance = null;

/**
 * Returns a singleton Razorpay SDK client configured from environment variables.
 */
function getRazorpayClient() {
  if (!razorpayInstance) {
    const { keyId, keySecret } = getRazorpayConfig();
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

module.exports = {
  getRazorpayConfig,
  getRazorpayClient,
};
