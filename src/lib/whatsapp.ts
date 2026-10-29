// Helper utility for generating zero-cost direct mobile messaging links (WhatsApp and SMS)
// adhering to Rajamanickam Chit Fund communication specifications in English & Tamil

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
Monthly Installment Reminder / மாதாந்திர தவணை நினைவூட்டல்

• Scheme / திட்டம்: ${params.groupName}
• Month / மாதம்: Month ${params.monthNumber}
• Total Due / மொத்த தவணை: ${formatINR(params.netDue)}
• Balance to Pay / பாக்கி தொகை: ${formatINR(params.pendingBalance)}

Kindly clear your balance installment at the earliest.
தங்களின் நிலுவைத் தவணையை விரைவில் செலுத்துமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.
Payment modes: Cash, GPay, PhonePe, Bank Transfer.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

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
Payment Confirmation Receipt / தவணை வரவு ரசீது

• Scheme / திட்டம்: ${params.groupName}
• Ticket / டிக்கெட்: #${params.ticketNumber}
• Month / மாதம்: Month ${params.monthNumber}
• Amount Paid / செலுத்திய தொகை: ${formatINR(params.amountPaid)}
• Payment Mode / முறை: ${params.paymentMethod}
${params.receiptNumber ? `• Receipt / ரசீது எண்: ${params.receiptNumber}\n` : ''}• Status / நிலை: ${params.status === 'PAID' ? 'FULLY PAID (முழுமையாக செலுத்தப்பட்டது ✓)' : 'PARTIAL (பாக்கி: ' + formatINR(params.remainingBalance) + ')'}
• Date / தேதி: ${new Date().toLocaleDateString('en-IN')}

Thank you for your payment!
தங்களின் தவணைத் தொகைக்கு மனமார்ந்த நன்றி!

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function createWhatsAppMessageUrl(phone: string, text: string): string {
  const cleaned = cleanPhone(phone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

/**
 * Bidding Winner Notification via WhatsApp (Sent strictly to winner)
 */
export function createBiddingWinnerWhatsAppUrl(params: {
  phone: string;
  winnerName: string;
  groupName: string;
  monthNumber: number;
  payoutAmount: number;
  tasiruAmount: number;
}): string {
  const phone = cleanPhone(params.phone);
  const text =
`வணக்கம் / Hello ${params.winnerName},

🎉 *வாழ்த்துக்கள்! RAJAMANICKAM CHIT FUND*
*Bidding Winner Notification / ஏல வெற்றி அறிவிப்பு*

• *Scheme / திட்டம்:* ${params.groupName}
• *Month / மாதம்:* Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• *Prize Payout / வெற்றித் தொகை:* ${formatINR(params.payoutAmount)}
• *Tasiru (Discount) / தள்ளுபடி:* ${formatINR(params.tasiruAmount)}

Congratulations! You are the prized winning bidder for Month ${params.monthNumber} in ${params.groupName}.
Your prize payout will be disbursed to your account shortly.
தங்களின் ஏல வெற்றித் தொகை விரைவில் அலுவலகம் மூலம் வழங்கப்படும்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Salem*
Ph: +91 98765 43210`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Monthly Member Due Notification via WhatsApp (Winning Amount / 20)
 */
export function createMonthlyBiddingDueWhatsAppUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  monthNumber: number;
  winnerPayoutAmount: number;
  installmentDue: number;
  dividendSavings: number;
}): string {
  const phone = cleanPhone(params.phone);
  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Monthly Installment Due Notice / மாதாந்திர தவணை அறிவிப்பு*

• *Scheme / திட்டம்:* ${params.groupName}
• *Month / மாதம்:* Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• *This Month Due / செலுத்த வேண்டிய தொகை:* ${formatINR(params.installmentDue)}
• *Dividend Savings / தள்ளுபடி சேமிப்பு:* ${formatINR(params.dividendSavings)}
_(ஏலத் தொகை: ${formatINR(params.winnerPayoutAmount)} ÷ 20 நபர்கள் = ${formatINR(params.installmentDue)})_

Kindly clear your installment on or before the due date.
Payment Modes: Cash, GPay, PhonePe, Bank Transfer.
குறித்த தேதிக்குள் தங்களின் தவணைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Salem*
Ph: +91 98765 43210`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
