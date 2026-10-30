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
  ticketNumber?: number;
  monthNumber: number;
  amountPaid: number;
  paymentMethod?: string;
  receiptNumber?: string;
  remainingBalance: number;
  status: string;
  thalubadi?: number;
  kasiru?: number;
  installmentDue?: number;
  paymentDate?: string;
}): string {
  const phone = cleanPhone(params.phone);
  const pDate = params.paymentDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Payment Confirmation Receipt / தவணை வரவு ரசீது*

We got your payment with thanks!
தங்களின் தவணைத் தொகை பெறப்பட்டது!

• *Payment Date / தேதி:* ${pDate}
• *Scheme / திட்டம்:* ${params.groupName}
${params.ticketNumber ? `• *Ticket / டிக்கெட்:* #${params.ticketNumber}\n` : ''}• *Month / மாதம்:* Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• *Amount Paid / செலுத்திய தொகை:* ${formatINR(params.amountPaid)}
${params.installmentDue ? `• *Month Due / இந்த மாத தவணை:* ${formatINR(params.installmentDue)}\n` : ''}${params.thalubadi ? `• *Month Thalubadi / தள்ளுபடி:* ${formatINR(params.thalubadi)}\n` : ''}${params.kasiru ? `• *Month Kasiru / காசீரு:* ${formatINR(params.kasiru)}\n` : ''}• *Status / நிலை:* ${params.status === 'PAID' || params.remainingBalance <= 0 ? 'FULLY PAID (முழுமையாக செலுத்தப்பட்டது ✓)' : 'PARTIAL (பாக்கி: ' + formatINR(params.remainingBalance) + ')'}
${params.paymentMethod ? `• *Payment Mode / முறை:* ${params.paymentMethod}\n` : ''}${params.receiptNumber ? `• *Receipt / ரசீது எண்:* ${params.receiptNumber}\n` : ''}
Thank you for your prompt clearance!
சரியான நேரத்தில் செலுத்தியமைக்கு மனமார்ந்த நன்றி!

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Salem*
Ph: +91 98765 43210`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function createWhatsAppEnrollmentUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  potValue: number;
  baseAmount: number;
  startDate: string;
  ticketNumber?: number | string;
  sendDate?: string;
}): string {
  const phone = cleanPhone(params.phone);
  const sDate = params.sendDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Chit Scheme Welcome & Enrollment Confirmation*
*புதிய சீட்டு பதிவு உறுதிசெய்தல்*

• *Date / அனுப்பிய தேதி:* ${sDate}
• *Scheme / திட்டம்:* ${params.groupName}
${params.ticketNumber ? `• *Ticket No / டிக்கெட் எண்:* #${params.ticketNumber}\n` : ''}• *Total Pot Value / மொத்த தொகை:* ${formatINR(params.potValue)}
• *Duration / கால அளவு:* 20 Months (20 மாதங்கள்)
• *Base Monthly Installment / மாதாந்திர தவணை:* ${formatINR(params.baseAmount)}
• *Commencement / தொடக்க தேதி:* ${params.startDate}

Welcome to Rajamanickam Chit Fund! Your passbook has been registered. Monthly bidding & installment updates will be communicated directly to you.
ராஜமாணிக்கம் சீட் பண்ட்-ல் இணைந்தமைக்கு நன்றி! தங்களின் பாஸ்புக் தயார் செய்யப்பட்டுள்ளது. மாதாந்திர தவணை விவரங்கள் தங்களுக்கு உடனுக்குடன் தெரிவிக்கப்படும்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Salem*
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
  thalubadi?: number;
  kasiru?: number;
  baseAmount?: number;
  noticeDate?: string;
}): string {
  const phone = cleanPhone(params.phone);
  const nDate = params.noticeDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const baseAmt = params.baseAmount || (params.installmentDue + params.dividendSavings);
  const thalubadiAmt = params.thalubadi !== undefined ? params.thalubadi : (params.dividendSavings * 20 + Math.round(baseAmt * 20 * 0.05));
  const kasiruAmt = params.kasiru !== undefined ? params.kasiru : Math.round(baseAmt * 20 * 0.05);

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Monthly Installment Due Notice / மாதாந்திர தவணை அறிவிப்பு*

• *Notice Date / அறிவிப்பு தேதி:* ${nDate}
• *Scheme / திட்டம்:* ${params.groupName}
• *Month / மாதம்:* Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• *Thalubadi (Discount) / தள்ளுபடி:* ${formatINR(thalubadiAmt)}
• *Kasiru (Commission) / காசீரு:* ${formatINR(kasiruAmt)}
• *Dividend Savings / உறுப்பினர் சேமிப்பு:* ${formatINR(params.dividendSavings)}
• *This Month Due / செலுத்த வேண்டிய தொகை:* ${formatINR(params.installmentDue)}

_Calculation / கணக்கீடு:_
_(Base ${formatINR(baseAmt)} - Dividend ${formatINR(params.dividendSavings)} = ${formatINR(params.installmentDue)})_

In this date (${nDate}), your monthly due is ${formatINR(params.installmentDue)}. Kindly clear your installment on or before the due date.
Payment Modes: Cash, GPay, PhonePe, Bank Transfer.
குறித்த தேதிக்குள் தங்களின் தவணைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Salem*
Ph: +91 98765 43210`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Winner Prize Payout & Installment Receipt via WhatsApp
 * Sent directly to the winning member when the agent disburses bulk or installment payouts
 */
export function createWinnerPayoutInstallmentWhatsAppUrl(params: {
  phone: string;
  winnerName: string;
  groupName: string;
  monthNumber: number;
  installmentNumber: number;
  installmentAmount: number;
  totalPayoutAmount: number;
  totalDisbursedSoFar: number;
  remainingBalance: number;
  paymentDate?: string;
  paymentMethod?: string;
  receiptReference?: string;
  notes?: string;
}): string {
  const phone = cleanPhone(params.phone);
  const pDate = params.paymentDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const text =
`வணக்கம் / Hello ${params.winnerName},

🎉 *RAJAMANICKAM CHIT FUND*
*Prize Money Disbursement Receipt / ஏல வெற்றித் தொகை வழங்கல் ரசீது*

• *Scheme / திட்டம்:* ${params.groupName}
• *Month / மாதம்:* Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• *Installment / தவணை:* Prize Payout Installment #${params.installmentNumber} (பரிசு தவணை #${params.installmentNumber})
• *Amount Paid Now / இப்போது வழங்கிய தொகை:* ${formatINR(params.installmentAmount)}
• *Payment Date / வழங்கிய தேதி:* ${pDate}
${params.paymentMethod ? `• *Payment Mode / முறை:* ${params.paymentMethod}\n` : ''}${params.receiptReference ? `• *Ref / UTR No:* ${params.receiptReference}\n` : ''}
*Prize Payout Summary / பரிசுத் தொகை சுருக்கம்:*
• *Total Prize / மொத்த வெற்றித் தொகை:* ${formatINR(params.totalPayoutAmount)}
• *Total Paid So Far / இதுவரை வழங்கியது:* ${formatINR(params.totalDisbursedSoFar)}
• *Remaining Balance / மீதம் வழங்க வேண்டியது:* ${params.remainingBalance <= 0 ? '₹0 (Fully Settled ✓ / கணக்கு முடிக்கப்பட்டது)' : `${formatINR(params.remainingBalance)} (Pending)`}

${params.remainingBalance <= 0 
  ? 'Your winning prize has been fully disbursed with thanks!\nதங்களின் வெற்றித் தொகை முழுமையாக வழங்கப்பட்டு கணக்கு முடிக்கப்பட்டது!'
  : 'The remaining prize balance will be disbursed in upcoming installment(s).\nமீதமுள்ள தொகை அடுத்த தவணையில் தங்களுக்கு வழங்கப்படும்.'}

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Salem*
Ph: +91 98765 43210`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
