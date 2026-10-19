// Helper utility for generating zero-cost direct mobile messaging links (WhatsApp and SMS)
// adhering to Rajamanickam Chit Fund communication specifications

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cleanPhone(phone: string): string {
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Default to India country code 91 if 10 digits
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function createWhatsAppReminderUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  monthNumber: number;
  netDue: number;
  pendingBalance: number;
}): string {
  const phone = cleanPhone(params.phone);
  const text = 
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
Monthly Installment Reminder

• Group: ${params.groupName}
• Month: ${params.monthNumber}
• Total Due: ${formatINR(params.netDue)}
• Balance to Pay: ${formatINR(params.pendingBalance)}

Kindly clear your balance installment at the earliest.
Payment modes: Cash, GPay, PhonePe, Bank Transfer.

Regards,
Venkatesan
Rajamanickam Chit Fund`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function createWhatsAppReceiptUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  ticketNumber: number;
  monthNumber: number;
  amountPaid: number;
  paymentMethod: string;
  receiptNumber?: string;
  remainingBalance: number;
  status: string;
}): string {
  const phone = cleanPhone(params.phone);
  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
Payment Confirmation Receipt

• Group: ${params.groupName}
• Ticket #: ${params.ticketNumber}
• Month: ${params.monthNumber}
• Amount Paid: ${formatINR(params.amountPaid)}
• Payment Mode: ${params.paymentMethod}
${params.receiptNumber ? `• Receipt #: ${params.receiptNumber}\n` : ''}• Status: ${params.status === 'PAID' ? ' FULLY PAID' : ' PARTIAL (Pending: ' + formatINR(params.remainingBalance) + ')'}
• Date: ${new Date().toLocaleDateString('en-IN')}

Thank you for your payment!
Rajamanickam Chit Fund — Venkatesan`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function createWhatsAppAuctionNoticeUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  monthNumber: number;
  auctionDate: string;
  dividendPerShare: number;
  netInstallmentDue: number;
}): string {
  const phone = cleanPhone(params.phone);
  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
Month ${params.monthNumber} Yelam (Auction) Update

• Group: ${params.groupName}
• Dividend Earned: ${formatINR(params.dividendPerShare)} / share
• Net Installment Payable: ${formatINR(params.netInstallmentDue)}

Kindly make note of your revised installment amount for this month.

Regards,
Venkatesan
Rajamanickam Chit Fund`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function createWhatsAppMessageUrl(phone: string, text: string): string {
  const cleaned = cleanPhone(phone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

