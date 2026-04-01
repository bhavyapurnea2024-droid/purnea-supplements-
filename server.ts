import express from "express";
console.log("Starting server.ts...");
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import pkg from "cashfree-pg";
const { Cashfree } = pkg;
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Cashfree
const appId = process.env.CASHFREE_APP_ID || "";
const secretKey = process.env.CASHFREE_SECRET_KEY || "";

if (!appId || !secretKey) {
  console.error("CRITICAL: Cashfree Credentials Missing! Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Environment Variables.");
}

try {
  (Cashfree as any).XClientId = appId;
  (Cashfree as any).XClientSecret = secretKey;
  
  const isProd = process.env.NODE_ENV === "production";
  const env = (Cashfree as any).Environment;
  
  if (env) {
    (Cashfree as any).XEnvironment = isProd ? env.PRODUCTION : env.SANDBOX;
  } else {
    // Fallback if Environment enum is not found
    (Cashfree as any).XEnvironment = isProd ? 0 : 1; 
    console.warn("Cashfree.Environment not found, using fallback values (0 for PROD, 1 for SANDBOX)");
  }
  
  console.log("Cashfree initialized with Environment:", (Cashfree as any).XEnvironment);
} catch (err) {
  console.error("Failed to initialize Cashfree SDK:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Cashfree Order Creation API (Alias for /api/create-order as requested)
  const createOrderHandler = async (req: any, res: any) => {
    try {
      const { orderAmount, customerId, customerPhone, customerEmail, orderId } = req.body;

      console.log("Creating Cashfree Order:", { orderAmount, customerId, orderId });

      if (!orderAmount || orderAmount <= 0) {
        return res.status(400).json({ message: "Invalid order amount" });
      }

      const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
      
      // Ensure phone is at least 10 digits and valid
      let phone = (customerPhone || "").replace(/\D/g, "");
      if (phone.length < 10) {
        phone = "9999999999"; // Fallback to a valid dummy number
      } else if (phone.length > 10) {
        phone = phone.slice(-10); // Take last 10 digits
      }

      const request = {
        order_amount: Number(orderAmount).toFixed(2),
        order_currency: "INR",
        order_id: orderId || `order_${Date.now()}`,
        customer_details: {
          customer_id: customerId || `cust_${Date.now()}`,
          customer_phone: phone,
          customer_email: customerEmail || "customer@example.com",
        },
        order_meta: {
          return_url: `${appUrl}/payment-status?order_id={order_id}`,
        },
      };

      const response = await (Cashfree as any).PGCreateOrder("2023-08-01", request);
      console.log("Cashfree Order Created Successfully:", response.data.order_id);
      res.json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      console.error("Cashfree Error Details:", JSON.stringify(errorData));
      res.status(500).json({ 
        message: errorData.message || "Failed to create order",
        details: errorData 
      });
    }
  };

  app.post("/api/payment/create-order", createOrderHandler);
  app.post("/api/create-order", createOrderHandler);

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
