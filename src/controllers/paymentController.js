const { getRazorpayClient, getRazorpayConfig } = require("../config/razorpay");
const { verifyPaymentSignature, verifyWebhookSignature } = require("../utils/signature");

const CURRENCY_REGEX = /^[A-Z]{3}$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order in Test Mode.
 */
async function createOrder(req, res, next) {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body || {};

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'amount'. Provide a number >= 1 (in major currency units, e.g. 500 for INR 500).",
      });
    }

    if (typeof currency !== "string" || !CURRENCY_REGEX.test(currency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'currency'. Provide a 3-letter uppercase ISO currency code (e.g. 'INR').",
      });
    }

    if (receipt !== undefined && (!isNonEmptyString(receipt) || receipt.trim().length > 40)) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'receipt'. Must be a non-empty string of at most 40 characters.",
      });
    }

    if (notes !== undefined && (notes === null || typeof notes !== "object" || Array.isArray(notes))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'notes'. Must be a plain JSON object.",
      });
    }

    const amountInSubunits = Math.round(amount * 100);
    if (amountInSubunits < 100) {
      return res.status(400).json({
        success: false,
        message: "Order amount must be at least 100 subunits (e.g. INR 1.00).",
      });
    }

    const { keyId } = getRazorpayConfig();
    const razorpay = getRazorpayClient();

    const orderOptions = {
      amount: amountInSubunits,
      currency,
      receipt: receipt ? receipt.trim() : `rcpt_${Date.now()}`,
    };

    if (notes) {
      orderOptions.notes = notes;
    }

    const order = await razorpay.orders.create(orderOptions);

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully.",
      data: {
        order,
        keyId,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payment/verify
 * Verifies Razorpay Checkout payment signature using HMAC SHA256 and timingSafeEqual.
 */
function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (
      !isNonEmptyString(razorpay_order_id) ||
      !isNonEmptyString(razorpay_payment_id) ||
      !isNonEmptyString(razorpay_signature)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: 'razorpay_order_id', 'razorpay_payment_id', and 'razorpay_signature' must all be non-empty strings.",
      });
    }

    const { keySecret } = getRazorpayConfig();

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id.trim(),
      paymentId: razorpay_payment_id.trim(),
      signature: razorpay_signature.trim(),
      keySecret,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment signature verified successfully.",
      data: {
        orderId: razorpay_order_id.trim(),
        paymentId: razorpay_payment_id.trim(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payment/webhook
 * Verifies Razorpay webhook signature using the raw request body Buffer and webhook secret.
 */
function handleWebhook(req, res, next) {
  try {
    const signature = req.get("x-razorpay-signature");

    if (!isNonEmptyString(signature)) {
      return res.status(400).json({
        success: false,
        message: "Missing 'x-razorpay-signature' header.",
      });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Webhook payload must be a non-empty raw JSON body.",
      });
    }

    const { webhookSecret } = getRazorpayConfig();

    const isValid = verifyWebhookSignature({
      rawBody: req.body,
      signature: signature.trim(),
      webhookSecret,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch (_parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in webhook payload.",
      });
    }

    const event = payload.event || "unknown";
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    switch (event) {
      case "payment.captured":
        console.log(
          `[Webhook] Payment captured: paymentId=${paymentEntity?.id || "n/a"}, orderId=${paymentEntity?.order_id || "n/a"}`
        );
        break;
      case "payment.failed":
        console.log(
          `[Webhook] Payment failed: paymentId=${paymentEntity?.id || "n/a"}, orderId=${paymentEntity?.order_id || "n/a"}`
        );
        break;
      case "order.paid":
        console.log(
          `[Webhook] Order paid: orderId=${orderEntity?.id || paymentEntity?.order_id || "n/a"}`
        );
        break;
      default:
        console.log(`[Webhook] Received verified event: ${event}`);
        break;
    }

    return res.status(200).json({
      success: true,
      received: true,
      event,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
};
