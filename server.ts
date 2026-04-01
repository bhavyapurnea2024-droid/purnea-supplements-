import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Cashfree } = require("cashfree-pg");

// Initialize Cashfree
(Cashfree as any).XClientId = process.env.CASHFREE_APP_ID || "";
(Cashfree as any).XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
(Cashfree as any).XEnvironment = process.env.NODE_ENV === "production" 
  ? "PRODUCTION" 
  : "SANDBOX";

console.log("Cashfree initialized with Environment:", (Cashfree as any).XEnvironment);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Cashfree Order Creation API
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const { orderAmount, customerId, customerPhone, customerEmail, orderId } = req.body;

      const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
      const request = {
        order_amount: orderAmount,
        order_currency: "INR",
        order_id: orderId || `order_${Date.now()}`,
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone,
          customer_email: customerEmail,
        },
        order_meta: {
          return_url: `${appUrl}/payment-status?order_id={order_id}`,
        },
      };

      const response = await (Cashfree as any).PGCreateOrder("2023-08-01", request);
      res.json(response.data);
    } catch (error: any) {
      console.error("Cashfree Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || "Failed to create order" });
    }
  });

  // Cashfree Order Verification API
  app.get("/api/payment/verify-order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const response = await (Cashfree as any).PGGetOrder("2023-08-01", orderId);
      res.json(response.data);
    } catch (error: any) {
      console.error("Cashfree Verification Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || "Failed to verify order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
