// Helper utility for generating native mobile SMS links using the device's inbuilt messaging app
// adhering to Rajamanickam Chit Fund approved bilingual (English & Tamil) communication templates

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
 * 1. New Chit Enrollment / Share Allotment (Native SMS - Bilingual English & Tamil)
 */
export function createEnrollmentSmsUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  potValue: number;
  baseAmount: number;
  startDate: string;
  ticketNumber?: number | string;
  sendDate?: string;
}): string {
  const sDate = params.sendDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Chit Scheme Welcome & Enrollment Confirmation
புதிய சீட்டு பதிவு உறுதிசெய்தல்

• Date / அனுப்பிய தேதி: ${sDate}
• Scheme / திட்டம்: ${params.groupName}
${params.ticketNumber ? `• Ticket No / டிக்கெட் எண்: #${params.ticketNumber}\n` : ''}• Total Pot Value / மொத்த தொகை: ₹${params.potValue.toLocaleString('en-IN')}
• Duration / கால அளவு: 20 Months (20 மாதங்கள்)
• Base Monthly Installment / மாதாந்திர தவணை: ₹${params.baseAmount.toLocaleString('en-IN')}
• Commencement / தொடக்க தேதி: ${params.startDate}

Welcome to Rajamanickam Chit Fund! Your passbook has been registered. Monthly bidding & installment updates will be communicated directly to you.
ராஜமாணிக்கம் சீட் பண்ட்-ல் இணைந்தமைக்கு நன்றி! தங்களின் பாஸ்புக் தயார் செய்யப்பட்டுள்ளது. மாதாந்திர தவணை விவரங்கள் தங்களுக்கு உடனுக்குடன் தெரிவிக்கப்படும்.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 1b. Multiple Chit Schemes Enrollment Confirmation (Native SMS - Bilingual English & Tamil)
 */
export function createMultiEnrollmentSmsUrl(params: {
  phone: string;
  memberName: string;
  schemes: Array<{
    groupName: string;
    potValue: number;
    baseAmount: number;
    ticketCount: number;
  }>;
}): string {
  const schemeLines = params.schemes
    .map(
      (s) =>
        `• ${s.groupName} (${s.ticketCount} ${s.ticketCount === 1 ? 'Ticket' : 'Tickets'}): தவணை ₹${s.baseAmount.toLocaleString('en-IN')}/mo`
    )
    .join('\n');

  const totalMonthly = params.schemes.reduce((acc, s) => acc + s.baseAmount, 0);

  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Chit Schemes Enrollment Confirmation
புதிய சீட்டுகள் பதிவு உறுதிசெய்தல்

${schemeLines}

• Total Monthly Installment / மொத்த மாதாந்திர தவணை: ₹${totalMonthly.toLocaleString('en-IN')}
• Duration / கால அளவு: 20 Months (20 மாதங்கள்)

Your passbook has been created. Monthly installment updates will be communicated directly to you.
தங்களின் பாஸ்புக் தயார் செய்யப்பட்டுள்ளது. தவணை விவரங்கள் தங்களுக்கு உடனுக்குடன் தெரிவிக்கப்படும்.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 2. Monthly Installment Received & Cleared (Native SMS - Bilingual English & Tamil)
 * Message 3: "We got the payment with thanks" with Date and Thalubadi/Kasiru/Dues breakdown
 */
export function createPaymentClearedSmsUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  monthNumber: number;
  amountPaid?: number;
  installmentDue?: number;
  thalubadi?: number;
  kasiru?: number;
  remainingBalance?: number;
  paymentMethod?: string;
  paymentDate?: string;
  expectedPaymentDate?: string;
}): string {
  const pDate = params.paymentDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Payment Received Confirmation / தவணை வரவு ரசீது

We got your payment with thanks!
தங்களின் தவணைத் தொகை பெறப்பட்டது!

• Payment Date / செலுத்திய தேதி: ${pDate}
• Scheme / திட்டம்: ${params.groupName}
• Month / மாதம்: Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
${params.amountPaid ? `• Amount Paid / செலுத்திய தொகை: ₹${params.amountPaid.toLocaleString('en-IN')}\n` : ''}${params.installmentDue ? `• Month Due / இந்த மாத தவணை: ₹${params.installmentDue.toLocaleString('en-IN')}\n` : ''}${params.thalubadi ? `• Month Thalubadi / தள்ளுபடி: ₹${params.thalubadi.toLocaleString('en-IN')}\n` : ''}${params.kasiru ? `• Month Kasiru / காசீரு: ₹${params.kasiru.toLocaleString('en-IN')}\n` : ''}• Balance Remaining / மீதம்: ${params.remainingBalance !== undefined && params.remainingBalance > 0 ? `₹${params.remainingBalance.toLocaleString('en-IN')} (Pending)` : '₹0 (Cleared ✓ / முழுமையாக செலுத்தப்பட்டது)'}
${params.remainingBalance !== undefined && params.remainingBalance > 0 && params.expectedPaymentDate ? `• Promised Next Payment Date / அடுத்த தவணை தேதி: ${params.expectedPaymentDate}\n` : ''}${params.paymentMethod ? `• Payment Mode / முறை: ${params.paymentMethod}\n` : ''}
Thank you for your prompt clearance!
சரியான நேரத்தில் செலுத்தியமைக்கு மனமார்ந்த நன்றி!

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 3. Taking Another Person's Chit / Takeover (Native SMS - Bilingual English & Tamil)
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
சீட்டு உரிமை மாற்றம் உறுதிசெய்தல்

• Scheme / திட்டம்: ${params.groupName}
• Transferred From / யாரிடமிருந்து: ${params.previousMemberName}
• Months Completed / முடிவடைந்த மாதங்கள்: ${params.completedMonths} / 20 Months
• Cumulative Paid Value / வரவு வைக்கப்பட்ட தொகை: ₹${params.totalPreviouslyPaid.toLocaleString('en-IN')}
• Next Installment / அடுத்த தவணை: Month ${params.nextMonthNumber}
• Status / நிலை: Active Share

Passbook and office ledger have been updated in your name.
பாஸ்புக் மற்றும் அலுவலக பதிவேட்டில் தங்களின் பெயர் முறைப்படி மாற்றப்பட்டுள்ளது.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 4. Scheme Completion & Final Settlement (Native SMS - Bilingual English & Tamil)
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
Chit Scheme Completion & Final Settlement
சீட்டு முதிர்வு மற்றும் இறுதி தீர்வு

• Scheme / திட்டம்: ${params.groupName}
• Months Paid / செலுத்திய மாதங்கள்: 20 / 20 Months
• Total Principal Paid / செலுத்திய அசல்: ₹${params.totalPaid.toLocaleString('en-IN')}
• Total Dividends Earned / லாப ஈவுத்தொகை: ₹${params.totalDividends.toLocaleString('en-IN')}
• Final Maturity Payout / முதிர்வு தொகை: ₹${params.totalPotValue.toLocaleString('en-IN')}
• Status / நிலை: Closed (No Dues / பாக்கி ஏதுமில்லை)

We sincerely thank you for your trust throughout this 20-month journey!
இந்த 20 மாத கால பயணத்தில் எங்கள் மீது வைத்த தொடர் நம்பிக்கைக்கும் ஆதரவிற்கும் எங்கள் மனமார்ந்த நன்றிகள்!

Warm Regards / அன்புடன்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 5. Installment Due / Overdue Notice (Native SMS - Bilingual English & Tamil)
 * Sent to members with overdue installments from Day 1 of the month or multi-month dues
 */
export function createOverdueReminderSmsUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  pendingAmount: number;
  unpaidCount?: number;
  monthNumber?: number;
}): string {
  const count = params.unpaidCount || 1;
  const monthText = params.monthNumber
    ? `Month ${params.monthNumber}`
    : `${count} Month${count > 1 ? 's' : ''}`;
  const monthTamil = params.monthNumber
    ? `மாதம் ${params.monthNumber}`
    : `${count} மாத தவணை`;

  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Installment Overdue Notice / மாதாந்திர தவணை நிலுவை அறிவிப்பு

• Chit Scheme / திட்டம்: ${params.groupName}
• Overdue Balance / நிலுவைத் தொகை: ${formatINR(params.pendingAmount)}
• Duration Due / நிலுவை: ${monthText} (${monthTamil})

Kindly clear your pending installment at the earliest.
தங்களின் மாதாந்திர சீட்டு தவணை நிலுவைத் தொகையை உடனே செலுத்துமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

Payment Modes / செலுத்தும் வழிகள்: Cash, GPay, PhonePe, Bank Transfer.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 6. Bidding Winner Notification (Native SMS - Bilingual English & Tamil)
 * Targeted strictly ONLY to the winning bidder
 */
export function getBiddingWinnerText(params: {
  winnerName: string;
  groupName: string;
  monthNumber: number;
  payoutAmount: number;
  tasiruAmount: number;
}): string {
  return `வணக்கம் / Hello ${params.winnerName},

வாழ்த்துக்கள்! RAJAMANICKAM CHIT FUND
Bidding Winner Notification / ஏல வெற்றி அறிவிப்பு

• Scheme / திட்டம்: ${params.groupName}
• Month / மாதம்: Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• Prize Payout / வெற்றித் தொகை: ₹${params.payoutAmount.toLocaleString('en-IN')}
• Tasiru (Discount) / தள்ளுபடி: ₹${params.tasiruAmount.toLocaleString('en-IN')}

Congratulations! You are the prized winning bidder for Month ${params.monthNumber} in ${params.groupName}.
Your winning prize payout will be disbursed shortly to your registered bank account.
தங்களின் ஏல வெற்றித் தொகை விரைவில் தங்களுக்கு அலுவலகம் மூலம் வழங்கப்படும்.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;
}

export function createBiddingWinnerSmsUrl(params: {
  phone: string;
  winnerName: string;
  groupName: string;
  monthNumber: number;
  payoutAmount: number;
  tasiruAmount: number;
}): string {
  const text = getBiddingWinnerText(params);
  return createSmsUrl(params.phone, text);
}

/**
 * 7. Monthly Bidding Member Due Notification (Native SMS - Bilingual English & Tamil)
 * Message 2: "How much was the thalubadi this month the amount of kasiru how much should one pay with the date"
 */
export function getMonthlyBiddingDueText(params: {
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
  const nDate = params.noticeDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const baseAmt = params.baseAmount || (params.installmentDue + params.dividendSavings);
  const thalubadiAmt = params.thalubadi !== undefined ? params.thalubadi : (params.dividendSavings * 20 + Math.round(baseAmt * 20 * 0.05));
  const kasiruAmt = params.kasiru !== undefined ? params.kasiru : Math.round(baseAmt * 20 * 0.05);

  return `வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Monthly Bidding & Installment Due Notice
மாதாந்திர ஏலம் & தவணை அறிவிப்பு

• Notice Date / அறிவிப்பு தேதி: ${nDate}
• Scheme / திட்டம்: ${params.groupName}
• Month / மாதம்: Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• Thalubadi (Discount) / தள்ளுபடி: ₹${thalubadiAmt.toLocaleString('en-IN')}
• Kasiru (Commission) / காசீரு: ₹${kasiruAmt.toLocaleString('en-IN')}
• Dividend Savings / உறுப்பினர் சேமிப்பு: ₹${params.dividendSavings.toLocaleString('en-IN')}
• This Month Due / செலுத்த வேண்டிய தொகை: ₹${params.installmentDue.toLocaleString('en-IN')}

Calculation / கணக்கீடு:
(Base ₹${baseAmt.toLocaleString('en-IN')} - Dividend ₹${params.dividendSavings.toLocaleString('en-IN')} = ₹${params.installmentDue.toLocaleString('en-IN')})

In this date (${nDate}), your monthly due is ₹${params.installmentDue.toLocaleString('en-IN')}. Kindly clear your installment on or before the due date.
Payment Modes / வழிகள்: Cash, GPay, PhonePe, Bank Transfer.
குறித்த தேதிக்குள் தங்களின் தவணைத் தொகையை செலுத்துமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;
}

export function createMonthlyBiddingDueSmsUrl(params: {
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
  const text = getMonthlyBiddingDueText(params);
  return createSmsUrl(params.phone, text);
}

/**
 * 8. Winner Prize Payout & Installment Receipt (Native SMS - Bilingual English & Tamil)
 * Sent directly to the winning member when the agent disburses bulk or installment payouts
 */
export function getWinnerPayoutInstallmentText(params: {
  winnerName: string;
  groupName: string;
  monthNumber: number;
  installmentNumber: number;
  installmentAmount: number;
  totalPayoutAmount: number;
  totalDisbursedSoFar: number;
  remainingBalance: number;
  paymentDate?: string;
  nextExpectedPayoutDate?: string;
  paymentMethod?: string;
  receiptReference?: string;
  notes?: string;
}): string {
  const pDate = params.paymentDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `வணக்கம் / Hello ${params.winnerName},

🎉 RAJAMANICKAM CHIT FUND
Prize Money Disbursement Receipt
ஏல வெற்றித் தொகை வழங்கல் ரசீது

• Scheme / திட்டம்: ${params.groupName}
• Month / மாதம்: Month ${params.monthNumber} of 20 (மாதம் ${params.monthNumber})
• Installment / தவணை: Prize Payout Installment #${params.installmentNumber} (பரிசு தவணை #${params.installmentNumber})
• Amount Paid Now / இப்போது வழங்கிய தொகை: ₹${params.installmentAmount.toLocaleString('en-IN')}
• Payment Date / வழங்கிய தேதி: ${pDate}
${params.paymentMethod ? `• Payment Mode / முறை: ${params.paymentMethod}\n` : ''}${params.receiptReference ? `• Ref / UTR No: ${params.receiptReference}\n` : ''}
Prize Payout Summary / பரிசுத் தொகை சுருக்கம்:
• Total Prize / மொத்த வெற்றித் தொகை: ₹${params.totalPayoutAmount.toLocaleString('en-IN')}
• Total Paid So Far / இதுவரை வழங்கியது: ₹${params.totalDisbursedSoFar.toLocaleString('en-IN')}
• Remaining Balance / மீதம் வழங்க வேண்டியது: ${params.remainingBalance <= 0 ? '₹0 (Fully Settled ✓ / கணக்கு முடிக்கப்பட்டது)' : `₹${params.remainingBalance.toLocaleString('en-IN')} (Pending)`}
${params.remainingBalance > 0 && params.nextExpectedPayoutDate ? `• Next Installment Due Date / அடுத்த தவணை தேதி: ${params.nextExpectedPayoutDate}\n` : ''}
${params.remainingBalance <= 0 
  ? 'Your winning prize has been fully disbursed with thanks!\nதங்களின் வெற்றித் தொகை முழுமையாக வழங்கப்பட்டு கணக்கு முடிக்கப்பட்டது!'
  : 'The remaining prize balance will be disbursed in upcoming installment(s).\nமீதமுள்ள தொகை அடுத்த தவணையில் தங்களுக்கு வழங்கப்படும்.'}

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;
}

export function createWinnerPayoutInstallmentSmsUrl(params: {
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
  nextExpectedPayoutDate?: string;
  paymentMethod?: string;
  receiptReference?: string;
  notes?: string;
}): string {
  const text = getWinnerPayoutInstallmentText(params);
  return createSmsUrl(params.phone, text);
}
