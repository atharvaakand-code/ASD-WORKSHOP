# Razorpay Payment Integration Backend (ASD Workshop 2)

A clean, minimal, beginner-friendly **Node.js + Express.js** backend implementing **Razorpay Test Mode** payment integration with official SDK order creation, timing-safe HMAC SHA256 payment verification, and raw-body webhook signature verification.

---

## Features

- **`POST /api/payment/create-order`** — Creates orders using the official `razorpay` Node.js SDK in Test Mode.
- **`POST /api/payment/verify`** — Verifies Checkout signatures (`razorpay_order_id|razorpay_payment_id`) using HMAC SHA256 and `crypto.timingSafeEqual`.
- **`POST /api/payment/webhook`** — Verifies Razorpay webhook signatures (`x-razorpay-signature`) against the exact raw request body `Buffer` using `crypto.timingSafeEqual`.
- **`GET /health`** — Simple health check endpoint.
- Strict input validation, centralized error handling, and zero hardcoded secrets.

---

## Project Structure

```text
.
├── .env.example                 # Template for required environment variables
├── .gitignore                   # Excludes node_modules, .env, logs, and OS files
├── package.json                 # Project metadata, scripts, and dependencies
├── postman_collection.json      # Ready-to-import Postman v2.1 collection
├── README.md                    # Setup, execution, and testing documentation
└── src/
    ├── app.js                   # Express app setup, routes, 404 & error handlers
    ├── server.js                # Entry point (loads dotenv & starts HTTP server)
    ├── config/
    │   └── razorpay.js          # Env validation & Razorpay SDK client singleton
    ├── controllers/
    │   └── paymentController.js # Business logic for orders, verify & webhooks
    ├── routes/
    │   └── paymentRoutes.js     # Route definitions (raw body for webhook, JSON for others)
    └── utils/
        └── signature.js         # Timing-safe HMAC SHA256 signature verification helpers
```

---

## Prerequisites

- **Node.js** v18+ (tested with Node v24)
- **npm**
- A **Razorpay** account switched to **Test Mode**

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in your **Razorpay Test Mode** credentials:

```env
PORT=5000
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
```

> **Where to find your Razorpay Test Mode keys:**
> 1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
> 2. Toggle **Test Mode** ON in the top/left navigation bar.
> 3. Go to **Account & Settings** -> **API Keys** -> **Generate Test Key**.
> 4. Copy the `Key ID` (`rzp_test_...`) and `Key Secret`.
> 5. For webhooks, go to **Account & Settings** -> **Webhooks** -> **Add New Webhook** and set a secret string for `RAZORPAY_WEBHOOK_SECRET`.

---

## Running the Backend

Start the server:

```bash
npm start
```

Or run in watch mode during development:

```bash
npm run dev
```

You should see:

```text
Razorpay payment backend running on http://localhost:5000
```

---

## API Reference

### 1. Health Check
- **Endpoint:** `GET /health`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-11-25T12:00:00.000Z"
}
```

---

### 2. Create Order
- **Endpoint:** `POST /api/payment/create-order`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  - `amount` *(number, required)*: Amount in major currency units (e.g. `500` for ₹500 INR; converted to `50000` paise). Minimum `1`.
  - `currency` *(string, optional, default `"INR"`)*: 3-letter uppercase ISO currency code.
  - `receipt` *(string, optional)*: Custom receipt ID (max 40 characters).
  - `notes` *(object, optional)*: Key-value metadata object.

```json
{
  "amount": 500,
  "currency": "INR",
  "receipt": "order_rcpt_1001",
  "notes": {
    "course": "ASD Workshop 2"
  }
}
```

- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Razorpay order created successfully.",
  "data": {
    "order": {
      "id": "order_Pxyz1234567890",
      "entity": "order",
      "amount": 50000,
      "amount_paid": 0,
      "amount_due": 50000,
      "currency": "INR",
      "receipt": "order_rcpt_1001",
      "status": "created"
    },
    "keyId": "rzp_test_your_key_id_here"
  }
}
```

---

### 3. Verify Payment Signature
- **Endpoint:** `POST /api/payment/verify`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "razorpay_order_id": "order_Pxyz1234567890",
  "razorpay_payment_id": "pay_Pabc9876543210",
  "razorpay_signature": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
}
```
- **How verification works:**
  Computes `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` and compares against `razorpay_signature` using `crypto.timingSafeEqual`.

- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Payment signature verified successfully.",
  "data": {
    "orderId": "order_Pxyz1234567890",
    "paymentId": "pay_Pabc9876543210"
  }
}
```
- **Invalid Signature (`400 Bad Request`):**
```json
{
  "success": false,
  "message": "Invalid payment signature."
}
```

---

### 4. Webhook Verification
- **Endpoint:** `POST /api/payment/webhook`
- **Headers:**
  - `Content-Type: application/json`
  - `x-razorpay-signature: <hmac_sha256_hex_digest>`
- **Important:** This route uses `express.raw({ type: "application/json" })` instead of `express.json()` so the signature is verified against the **exact raw bytes** sent by Razorpay. Re-serializing JSON before verifying can alter whitespace/key order and break signature verification.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "received": true,
  "event": "payment.captured"
}
```

---

## Testing with Postman

1. Open **Postman** -> click **Import** -> select [`postman_collection.json`](./postman_collection.json).
2. Confirm the collection variable `baseUrl` is `http://localhost:5000`.
3. Run **Health Check** to confirm the server is up.
4. Run **Create Razorpay Order** (requires valid `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`).
5. For **Verify Payment Signature** and **Handle Razorpay Webhook**, supply real signatures generated by Razorpay Test Mode (or compute an authentic HMAC SHA256 signature using your configured secret for API verification tests).

---

## Testing Payments in Razorpay Test Mode

1. **Create an Order:** Send `POST /api/payment/create-order` with `{"amount": 500}`. Note the returned `data.order.id`.
2. **Simulate Checkout:** Pass `data.keyId` and `data.order.id` to Razorpay Checkout (or Razorpay's Test Mode payment flow) using Razorpay's test payment methods:
   - **UPI:** `success@razorpay` (succeeds) or `failure@razorpay` (fails)
   - **Card / Netbanking:** Any test card listed in Razorpay Test Cards docs, with OTP `123456` or choosing "Success" on the mock bank page.
3. **Verify Signature:** Take the `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` returned by Checkout and send them to `POST /api/payment/verify`.
4. **Test Webhooks Locally:**
   - Expose your local server using a tunnel such as `ngrok http 5000`.
   - In Razorpay Dashboard (**Test Mode** -> **Webhooks**), register `https://<your-ngrok-url>/api/payment/webhook` with your `RAZORPAY_WEBHOOK_SECRET` and subscribe to `payment.captured`, `payment.failed`, and `order.paid`.
   - Complete a test payment and observe the verified webhook logs in your terminal.

---

## Security Notes

- Never commit `.env` or expose `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` in responses, logs, or frontend code.
- Signature checks always validate hex length and use `crypto.timingSafeEqual` to prevent timing attacks.
