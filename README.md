# Elo Restro OS – AI Restaurant Operating & Intelligence System 🍽️🤖

A next-generation AI Restaurant Operating System built with the **Elo One luxury editorial design aesthetic**, featuring deep margin intelligence, festival-aware predictive replenishment with visible mathematical reasoning, an active perishability wastage guard, a planted anomaly detection engine, and a live rush-hour simulator.

---

## 🌟 Key Product Capabilities

### 1. Flagship: AI Stock Recommendation with Visible Reasoning
- **Visible Step-by-Step Math**: e.g., *"Order 15.0 kg of Fresh Malai Paneer. Last 4 weekend cycles averaged 29.0 kg, and 'Diwali Festive Weekend' demand modifier is +35%. Current stock (11.5 kg) is below required buffer (20.5 kg). Perishable (3d shelf-life). Capped at 25.0 kg to eliminate ₹1,120 spoilage hazard."*
- **Active Wastage Guard**: Automatically classifies ingredients into:
  - **Perishables** (Paneer, Cream, Poultry, Herbs): Capped to 2-day micro-batches to prevent spoilage losses.
  - **Non-Perishables** (Basmati Rice, Mustard Oil, Spices): Bulk Economic Order Quantity (EOQ) for maximum supplier volume discounts.
- **Indian Festival & Holiday Calendar**: Pre-loaded with Diwali, Eid, Makar Sankranti, IPL Match Final, Monsoon Rainy Monday, and Normal days.
- **Interactive Festival Simulator**: 1-click toggle pills instantly recompute projected demand, safety buffers, and visible reasoning live on screen.
- **1-Click Purchase Order to WhatsApp**: Approves the suggested replenishment and formats an authorized PO directly into WhatsApp Web or Email for suppliers (e.g. Nandini Dairy).

### 2. High-Impact Hackathon Demo Features
- **Live Rush Hour Simulator (`Simulate Rush Hour`)**: Injects a sudden multi-channel surge from Swiggy, Zomato, and Dine-in. Revenue and profit increment in real-time, ingredients deduct from inventory, and low-stock alerts fire live with sound cues.
- **Planted Anomaly (Wastage & Theft Detection)**: Reconciles theoretical recipe consumption against actual depleted inventory. Flags **Fresh Malai Paneer** (+24.8% consumption variance = ₹4,200 loss this week) and provides root cause analysis.
- **Dynamic Menu Engineering Matrix (BCG Quadrants)**:
  - **Stars**: High margin & high sales (Dum Biryani, Shahi Paneer, Garlic Butter Naan).
  - **Plow-horses**: Low margin & high sales (Tandoori Chicken Half, Dal Bukhara) -> AI suggests repricing or portion yield adjustment.
  - **Puzzles**: High margin & low sales (Zafrani Galouti Kebab, Kesari Phirni) -> AI suggests table tent cards or combos.
  - **Dogs**: Low margin & low sales (Subz Kolhapuri, Amritsari Fish Pakora) -> AI recommends deleting to cut prep overhead.
- **Natural-Language Voice & Text Assistant**:
  - Push-to-talk mic (Web Speech API) with typed fallback.
  - Handles questions like *"Why did profit drop last Tuesday?"*, *"Which dish should I remove from the menu?"*, *"What should I order tomorrow?"*, *"Show me high wastage items"*, and *"Swiggy vs Zomato vs Dine-in profit"*.
  - Renders conversational explanations and inline comparison bar charts.
- **Aggregator Unification & True Channel Margins**:
  - Dine-in: 64.2% true net margin (0% aggregator commission).
  - Swiggy: 46.8% net margin (after 22% commission).
  - Zomato: 44.5% net margin (after 24% commission).
- **Expiry-Aware Specials & Dynamic Combos**: Identifies slow-moving or near-expiry dairy/produce and auto-suggests combo deals (e.g., Paneer Butter + Kesari Phirni Combo, 15% off).
- **Daily 9 PM Summary (Telegram / WhatsApp Bot Preview)**: 1-click digest modal summarizing sales, true profit, top dish, dead stock warning, and tomorrow's prep sheet.
- **Customer QR Ordering Simulator**: Scan & place an order as a guest, which instantly lands on the live Kitchen Display (KOT).
- **Restaurant Profile & Status Manager**: Real-time management of restaurant details, operational states (Open / Rush / Closed), and kitchen pace.

---

## 🎨 UI Aesthetic (Inspired by Elo One)
- Typography: **Lexend** Google Font.
- Brand Accent: Warm deep ember `#B8460F`, sunset gradients, terracotta glows.
- Elo One Card System: Radial espresso ember (`c1`), sunset amber (`c2`), and terracotta glow (`c3`) cards with elevated photo stages and rotating paper layers.
- Dark & Light Mode: Seamless switch with full contrast preservation.

---

## 🚀 How to Run the Application

1. Open PowerShell or Command Prompt.
2. Navigate to the project directory:
   ```bash
   cd "C:\Users\madam\.gemini\antigravity\scratch\elo-restro-ai"
   ```
3. Run the startup script or command:
   ```bash
   python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```
   *(Or double-click `run.bat`)*
4. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000
   ```

---

## ⏱️ Recommended 3-Minute Hackathon Stage Pitch

1. **Executive Dashboard (0:00 - 0:30)**:
   - Point out Total Sales, True Net Profit (not just gross sales!), and the channel margin gap (Dine-in 64.2% vs Swiggy/Zomato ~45%).
   - Show the Dead Stock Alert (Saffron Syrup sitting 22 days).
2. **Simulate Rush Hour (0:30 - 1:00)**:
   - Click the top-right **"Simulate Rush Hour"** button.
   - Show the live KOT tick with new orders, revenue surge, and real-time inventory deductions triggering a low-stock alert.
3. **AI Stock Forecast & Festival Simulator (1:00 - 2:00)**:
   - Switch to the **AI Stock & Festival Forecast** tab.
   - Click the **"Diwali Festive Weekend (+35%)"** pill -> Show the numbers and the **visible step-by-step mathematical reasoning** adapt instantly!
   - Highlight the **Wastage Guard**: Perishable Paneer and Cream are capped at 2-day micro-batches, while Basmati Rice is bulk-ordered for discount.
   - Click **"1-Click PO to WhatsApp"** to showcase instant supplier dispatch.
4. **Planted Anomaly & Menu Matrix (2:00 - 2:30)**:
   - Switch to **Menu Matrix & Wastage Audit**.
   - Show the BCG quadrant (Star, Plow-horse, Puzzle, Dog). Point to the Dogs (Subz Kolhapuri) recommended for deletion.
   - Reveal the Planted Anomaly: Paneer consumption is **24.8% higher than sales justify**, leaking **₹4,200 this week**.
5. **Ask AI & Daily Summary (2:30 - 3:00)**:
   - Switch to **Ask AI**, click the pill *"Why did profit drop last Tuesday?"* -> show the conversational AI response and inline breakdown chart.
   - Click the **"9 PM Digest"** button in the header to show the Telegram / WhatsApp summary ready on the owner's phone.
