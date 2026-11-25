const express = require("express");
const {
  createOrder,
  verifyPayment,
  handleWebhook,
} = require("../controllers/paymentController");

const router = express.Router();

// Parse raw body ONLY for webhook verification so the exact byte payload is preserved
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Standard JSON parsing for order creation and checkout verification
router.post("/create-order", express.json(), createOrder);
router.post("/verify", express.json(), verifyPayment);

module.exports = router;
