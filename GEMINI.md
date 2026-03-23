# Ethnic Vogue - Project Roadmap & Strategy

This document serves as the primary planning module for the Ethnic Vogue e-commerce storefront.

## 1. Authentication Strategy (OTP via MSG91)
*   **Provider:** MSG91 (SendOTP API)
*   **Usage:** Login, Signup, and Checkout verification.
*   **Estimated Cost:** ₹0.20 - ₹0.25 per SMS (negligible at startup).
*   **Implementation Flow:**
    1.  User enters mobile number on frontend.
    2.  Backend calls MSG91 API to send OTP.
    3.  User enters code on frontend.
    4.  Backend validates with MSG91 API.
    5.  On success, issue JWT and allow checkout/login.

## 2. Payment Gateway Strategy (Razorpay)
*   **Provider:** Razorpay
*   **Pricing:** 2% per transaction + 18% GST (Domestic). No setup or AMC fees.
*   **Implementation:**
    *   Integrate Razorpay Checkout (Standard or Custom API).
    *   Backend handles `payment_authorized` and `payment_captured` webhooks.
    *   Update `ecommerce_orders` table with payment status and transaction IDs.

## 3. Database Optimizations (In Progress)
*   **Variants:** Proper `product_variants` table for SKU-level stock management.
*   **Collections:** Editorial collections for seasonal merchandising.
*   **UGC & Trust:** Real customer reviews and "As Seen On" celebrity sections.

## 4. Current Operational Guidelines
*   Maintain the premium aesthetic (Cormorant Garamond, Cream/Gold palette).
*   Prioritize mobile-first UI for high-conversion e-commerce.
*   Keep `server.js` modular for future API expansion.
