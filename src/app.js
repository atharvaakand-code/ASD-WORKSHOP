const express = require("express");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Payment API routes (body parsers are attached per-route so /webhook receives raw Buffer)
app.use("/api/payment", paymentRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler (never expose secret credentials or internal stack traces in responses)
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON request body.",
    });
  }

  // Handle Razorpay SDK API errors cleanly
  if (err.statusCode && err.error) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.error.description || "Razorpay API request failed.",
      code: err.error.code || "RAZORPAY_ERROR",
    });
  }

  console.error("[Server Error]", err.message);

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

module.exports = app;
