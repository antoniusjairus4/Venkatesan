// Helper utility for generating native mobile SMS links using the device's inbuilt messaging app
// adhering to Rajamanickam Chit Fund approved communication templates

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function createSmsUrl(phone: string, text: string): string {
  const cleaned = cleanPhone(phone);
  // Cross-platform standard: iOS supports '&body=', modern iOS and Android both support '?body='
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const delimiter = isIOS ? '&' : '?';
  return `sms:${cleaned}${delimiter}body=${encodeURIComponent(text)}`;
}

/**
 * 1. New Chit Enrollment / Share Allotment (Native SMS)
 * (Ticket numbers and total shares removed as requested)
 */
export function createEnrollmentSmsUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  potValue: number;
  baseAmount: number;
  startDate: string;
}): string {
  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Chit Scheme Enrollment Confirmation

Welcome to Rajamanickam Chit Funds! Your share has been officially registered:
• Chit Scheme: ${params.groupName}
• Total Pot Value: ₹${params.potValue.toLocaleString('en-IN')}
• Duration: 20 Months
• Base Monthly Installment: ₹${params.baseAmount.toLocaleString('en-IN')}
• Commencement Date: ${params.startDate}

Your physical chit passbook has been created. Monthly installment updates will be communicated directly to you.

Regards,
K. Venkatesan
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 2. Monthly Installment Received & Cleared (Native SMS)
 * (Receipt number, ticket number, payment mode, date, and amount removed as requested)
 */
export function createPaymentClearedSmsUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  monthNumber: number;
}): string {
  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Monthly Installment Received & Cleared

We have received your installment payment with thanks:
• Chit Scheme: ${params.groupName}
• Month: Month ${params.monthNumber}
• Balance Remaining: ₹0 (Fully Cleared ✓)

Your payment has been credited to your account. Thank you for your prompt clearance!

Regards,
K. Venkatesan
Rajamanickam Chit Fund`;

  return createSmsUrl(params.phone, text);
}

/**
 * 3. Taking Another Person's Chit / Takeover (Native SMS - For New Buyer Only)
 */
export function createTakeoverSmsUrl(params: {
  phone: string;
  newBuyerName: string;
  groupName: string;
  previousMemberName: string;
  completedMonths: number;
  totalPreviouslyPaid: number;
  nextMonthNumber: number;
}): string {
  const text =
`வணக்கம் / Hello ${params.newBuyerName},

RAJAMANICKAM CHIT FUND
Chit Takeover Confirmation

You have successfully taken over a chit share in Rajamanickam Chit Funds:
• Chit Scheme: ${params.groupName}
• Transferred From: ${params.previousMemberName}
• Months Completed: ${params.completedMonths} of 20 Months
• Cumulative Paid Value Credited: ₹${params.totalPreviouslyPaid.toLocaleString('en-IN')}
• Next Installment Payable: Month ${params.nextMonthNumber}
• Status: Active & Eligible for upcoming auctions

The physical passbook and office ledger have been updated in your name.

Regards,
K. Venkatesan
Rajamanickam Chit Fund`;

  return createSmsUrl(params.phone, text);
}

/**
 * 4. Scheme Completion & Final Settlement (Native SMS)
 */
export function createSettlementSmsUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  totalPaid: number;
  totalDividends: number;
  totalPotValue: number;
}): string {
  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Chit Scheme Successful Completion & Final Settlement

Congratulations! The 20-month cycle for ${params.groupName} has been successfully completed:
• Total Months Paid: 20 / 20 Months
• Total Principal Paid: ₹${params.totalPaid.toLocaleString('en-IN')}
• Total Dividends Earned by You: ₹${params.totalDividends.toLocaleString('en-IN')}
• Final Maturity Payout Disbursed: ₹${params.totalPotValue.toLocaleString('en-IN')}
• Account Status: Successfully Closed (No Dues)

We sincerely thank you for your trust throughout this 20-month journey!

Warm Regards,
K. Venkatesan
Rajamanickam Chit Fund, Salem`;

  return createSmsUrl(params.phone, text);
}

