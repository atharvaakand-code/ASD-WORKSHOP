const crypto = require("crypto");

const HEX_SHA256_REGEX = /^[a-f0-9]{64}$/i;

/**
 * Performs a constant-time comparison between a computed HMAC SHA256 hex digest
 * and a user/webhook-supplied hex signature using crypto.timingSafeEqual.
 *
 * @param {string|Buffer} payload - Data to sign (raw Buffer for webhooks, "order_id|payment_id" for payments).
 * @param {string} secret - Razorpay key secret or webhook secret.
 * @param {string} providedSignature - Hex-encoded HMAC SHA256 signature from client or header.
 * @returns {boolean} True if signatures match, false otherwise.
 */
function verifyHmacSha256Signature(payload, secret, providedSignature) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("Signature verification secret must be a non-empty string.");
  }

  if (typeof providedSignature !== "string" || !HEX_SHA256_REGEX.test(providedSignature)) {
    return false;
  }

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const providedBuffer = Buffer.from(providedSignature.toLowerCase(), "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Verifies a Razorpay Checkout payment signature:
 * HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 */
function verifyPaymentSignature({ orderId, paymentId, signature, keySecret }) {
  const payload = `${orderId}|${paymentId}`;
  return verifyHmacSha256Signature(payload, keySecret, signature);
}

/**
 * Verifies a Razorpay webhook signature against the exact raw request body bytes:
 * HMAC_SHA256(rawBodyBuffer, RAZORPAY_WEBHOOK_SECRET)
 */
function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    return false;
  }
  return verifyHmacSha256Signature(rawBody, webhookSecret, signature);
}

module.exports = {
  verifyHmacSha256Signature,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
