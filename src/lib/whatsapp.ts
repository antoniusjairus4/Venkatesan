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
