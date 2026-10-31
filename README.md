# Rajamanickam Chit Fund — Admin Management Portal

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-336791.svg)](https://neon.tech/)

A comprehensive, mobile-first, and production-ready administration portal engineered for **Mr. Venkatesan** to manage the complete lifecycle of **Rajamanickam Chit Fund** (Salem, Tamil Nadu). 

The platform handles 20-month rotating chit fund schemes (₹1,00,000, ₹2,00,000, ₹3,00,000) with automated bidding mathematics, multi-installment prize disbursements, split payment ledgers, historical group archiving with PDF/Excel reports, and an automated bilingual (Tamil & English) SMS and WhatsApp notification engine.

---

## 🌟 Key Features & Capabilities

### 1. Monthly Chit Bidding & Yelam (Rule 4 & Automated Math)
- **Interactive 20-Month Slider:** Seamless navigation across the complete 20-month duration of the chit fund cycle.
- **Multi-Scheme Grid (1L, 2L, 3L):** Simultaneous management of ₹1,00,000, ₹2,00,000, and ₹3,00,000 pots.
- **Strict Winner Eligibility Enforcement:** Enforces the rule that only **one member can take the chit per month**, and a subscriber who has already won in a previous month is automatically locked and cannot bid again.
- **Automated Tamil Nadu Chit Fund Accounting:**
  - Calculates **Thalubadi (தள்ளுபடி / Discount)**: `Total Pot - Winner Prize Amount`.
  - Calculates **Kasiru (காசீரு / Foreman Commission)**: Fixed `5% of Gross Chit Value`.
  - Calculates **Net Dividend Pool (லாப ஈவுத்தொகை)**: `Thalubadi - Kasiru`.
  - Calculates **Monthly Dividend per Subscriber**: Distributed equally across all 20 members.
  - Calculates **Monthly Installment Due per Member**: Automatically reduced from base amount: `Base Monthly Installment - Dividend`.
- **Targeted Winner Announcement:** 1-tap SMS & WhatsApp notification sent strictly to the winning bidder with prize payout and discount details.
- **Member Due Announcements:** 1-tap notifications (Message 2) to all subscribers detailing the month's auction results, discount, commission, and payable due amount.

---

### 2. Winner Prize Payout & Multi-Installment Disbursements
- **Bulk or Split Disbursements:** The organizer can pay the winner the prize money in a single lump sum or across custom installments ($2, 3, \dots, n$ installments).
- **Payment Method & Reference Tracking:** Records disbursement mode (`BANK_TRANSFER`, `GPAY`, `PHONEPE`, `CASH`, `CHEQUE`) and UTR / cheque reference numbers.
- **Scheduled Next Payout Date:** Record when the remaining prize balance will be disbursed (`அடுத்த தவணை வழங்கும் தேதி`).
- **Live Disbursal Summary:** Real-time visibility of total prize won, disbursed so far, remaining balance, and status (`PENDING`, `PARTIAL`, `PAID`).
- **Bilingual Prize Disbursement Receipts:** 1-tap SMS and WhatsApp disbursement receipts generated for each installment.

---

### 3. Monthly Payments & Split Installment Ledger
- **Complete Monthly Ledgers (Months 1 to 20):** Dedicated ledger view per month displaying all 20 subscriber shares and payment statuses.
- **In-Place Payment Recording:** One-tap collection modal directly from the monthly ledger.
- **Split Payment History with Exact Dates:** Full history of individual split installments (e.g. `Instalments (2): #1: ₹2,000 • 10 Oct 2026 (CASH) | #2: ₹1,500 • 20 Oct 2026 (GPAY)`).
- **Promised / Next Expected Payment Date:** If a member makes a partial payment, the organizer can record when the remaining balance is promised to be cleared (`அடுத்த தவணை செலுத்தும் தேதி`).
- **Bilingual Payment Cleared Receipts (Message 3):** Generates instant SMS and WhatsApp receipts including the exact payment date, amount paid, remaining balance, and next promised date.

---

### 4. Past Chit Groups & Archive Management
- **Archived Historical Groups:** Dedicated view for completed 20-month chit fund cycles, cleanly separated from active operations.
- **Scheme Filtering:** Filter historical groups by pot value (₹1L, ₹2L, ₹3L) and specific date cycles (`Start Date → End Date`).
- **Lightweight UI Snapshot:** Clean overview showing start/end dates, total members, total collected, total installments, late payments, and completion status without cluttering the screen.
- **Multi-Format Export Suite:**
  - **Export PDF:** Comprehensive closure report featuring group summary, member roster, monthly collection breakdown, visual collection timeline chart, member-wise payment history, and closing settlement.
  - **Export Excel (.xlsx):** Multi-sheet workbook including separate sheets for *Group Summary*, *Members*, *Payments*, *Monthly Summary*, *Payment Timeline*, and *Late Payments*.
  - **Export All:** 1-tap simultaneous download of both PDF and Excel packages.
- **Archive & Restore:** Safely move finished chits to completed archive with confirmation, or restore them back to active status if needed.

---

### 5. Member Directory & Multi-Scheme Enrollment
- **Multi-Chit Registration:** Allows a single person to enroll in 1, 2, or all 3 chit schemes (1L, 2L, 3L) simultaneously.
- **Streamlined Registration:** Simplified onboarding without rigid KYC/Aadhaar number requirements.
- **Integrated Chit Switcher:** When recording payments for multi-scheme members, switch between tickets effortlessly in the collection modal.
- **Search & Quick Actions:** Instant search by name, phone number, or town with 1-tap WhatsApp and call links.

---

### 6. Bilingual Notification Suite (English & Tamil)
Native SMS (`sms:`) and WhatsApp (`https://wa.me/`) templates with formatted currency and dates:
1. **Chit Welcome / Enrollment Confirmation:** Sent upon joining a group with ticket number, pot value, and duration.
2. **Monthly Due Notification (Message 2):** Breakdown of winner payout, discount, commission, dividend, and net due amount.
3. **Payment Received Receipt (Message 3):** Immediate acknowledgment of payment with exact user date, remaining balance, and promised date.
4. **Winner Announcement:** Congratulatory message strictly for the auction winner.
5. **Prize Disbursement Receipt:** Detailed voucher for bulk or split prize payments.

---

## 🧮 Mathematical Reference Example

Standard **₹1,00,000 Chit Scheme** (20 members, 20 months):

$$\text{Gross Chit Value} = \text{₹1,00,000}$$
$$\text{Max Monthly Base Contribution} = \frac{\text{₹1,00,000}}{20\text{ members}} = \text{₹5,000}$$

### Scenario: Winner bids at ₹75,000 Prize (Thalubadi = ₹25,000)

1. **Calculate Payout (Winner Amount):**
   $$\text{Winner Prize Amount} = \text{₹75,000}$$
   $$\text{Thalubadi (Discount)} = \text{₹1,00,000} - \text{₹75,000} = \mathbf{₹25,000}$$

2. **Extract Kasiru (Foreman's Commission @ 5%):**
   $$\text{Kasiru} = 5\% \times \text{₹1,00,000} = \mathbf{₹5,000}$$

3. **Distribute Dividend to Members:**
   $$\text{Net Dividend Pool} = \text{₹25,000 (Thalubadi)} - \text{₹5,000 (Kasiru)} = \text{₹20,000}$$
   $$\text{Dividend per Member} = \frac{\text{₹20,000}}{20\text{ members}} = \mathbf{₹1,000}$$

4. **Calculate Monthly Installment Payable:**
   $$\text{Installment per Member} = \text{₹5,000} - \text{₹1,00,0} = \frac{\text{₹75,000 (Winner Prize)} + \text{₹5,000 (Kasiru)}}{20} = \mathbf{₹4,000}$$

---

## 💻 Tech Stack & Architecture

- **Frontend:**
  - [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite 6](https://vitejs.dev/) with embedded Express API middleware
  - [Tailwind CSS 3.4](https://tailwindcss.com/) (Emerald & Forest Green palette)
  - [Lucide React](https://lucide.dev/) (Icons)
  - [Recharts 3.10](https://recharts.org/) (Financial visualizations)
  - [jsPDF](https://github.com/parallax/jsPDF) & [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) (PDF reports)
  - [SheetJS (xlsx)](https://sheetjs.com/) (Excel exports)
- **Backend & Database:**
  - [Express 5](https://expressjs.com/) (Embedded REST API)
  - [Neon Serverless PostgreSQL](https://neon.tech/) with `@neondatabase/serverless`
- **Testing & Verification:**
  - [Puppeteer Core](https://pptr.dev/) (Automated headless UI verification and screenshots)
  - Automated 20-month end-to-end audit suites

---

## 📁 Project Structure

```
├── scripts/
│   ├── run-20month-audit.mjs               # 20-month end-to-end audit runner
│   ├── seed-full-20month-audit.mjs         # Database seeding script for 20-month cycle
│   ├── verify-all-dates-feature.mjs        # Automated verification of date tracking & UI
│   ├── verify-winner-payout-installments.mjs # Verification of prize installment disbursements
│   └── test-api.mjs                        # Backend API health tests
├── src/
│   ├── components/
│   │   ├── dashboard/                      # Dashboard charts, metrics & defaulters
│   │   ├── modals/                         # RecordPayment, WinnerPayout, NewMember, PastGroups
│   │   └── views/                          # PaymentsView, BiddingView, ChitGroupsView, MembersView
│   ├── db/
│   │   └── schema.sql                      # Complete PostgreSQL schema definitions
│   ├── lib/
│   │   ├── api.ts                          # Frontend API client and type interfaces
│   │   ├── sms.ts                          # Native SMS URL & template generators (Tamil/English)
│   │   ├── whatsapp.ts                     # WhatsApp URL & template generators (Tamil/English)
│   │   └── exportHelpers.ts                # PDF & Excel export builders
│   └── server/
│       ├── api.mjs                         # Express REST API routes & database operations
│       └── app.mjs                         # Express server setup & middleware
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- [pnpm](https://pnpm.io/) package manager
- PostgreSQL database (e.g., [Neon Serverless](https://neon.tech/))

### Installation & Setup

1. **Clone repository & install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require
   PORT=5173
   ```

3. **Initialize Database Schema:**
   The schema can be imported from `src/db/schema.sql` into your Neon PostgreSQL database.

4. **Start Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Build for Production:**
   ```bash
   pnpm build
   ```

---

## 🧪 Verification & Audit Scripts

To run automated checks, database validations, and Puppeteer UI tests:

- **Run 20-Month Full Cycle Audit:**
  ```bash
  node scripts/run-20month-audit.mjs
  ```
- **Verify Date Tracking & Installment Receipts:**
  ```bash
  node scripts/verify-all-dates-feature.mjs
  ```
- **Verify Winner Prize Multi-Installments:**
  ```bash
  node scripts/verify-winner-payout-installments.mjs
  ```

---

## 🔒 Security & Session Handling

- Designed for **Single Admin Mode (Venkatesan)** with client-side authenticated state.
- Read-only historical data safeguarding: Archived chit groups are locked from active payment mutations.
- Strict input validation on payment amounts, bidding thresholds, and ticket assignments.

---

## 📄 License & Attribution
Private and proprietary software built for **Mr. Venkatesan** (Rajamanickam Chit Fund, Salem). All rights reserved.
