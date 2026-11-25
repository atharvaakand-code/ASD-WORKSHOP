require("dotenv").config();

const app = require("./app");
const { getRazorpayConfig } = require("./config/razorpay");

const PORT = Number(process.env.PORT) || 5000;

try {
  getRazorpayConfig();
} catch (error) {
  console.error(`[Startup Error] ${error.message}`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Razorpay payment backend running on http://localhost:${PORT}`);
});
