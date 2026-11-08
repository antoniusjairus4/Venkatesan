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
Rajamanickam Chit Fund, Yethapur
Ph: +91 99944 18186`;

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
  previouslyPaid?: number;
  status: string;
  thalubadi?: number;
  kasiru?: number;
  installmentDue?: number;
  paymentDate?: string;
  expectedPaymentDate?: string;
}): string {
  const phone = cleanPhone(params.phone);
  const pDate = params.paymentDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const prevPaid = params.previouslyPaid || 0;
  const isAfterPartial = prevPaid > 0;
  const dueAmt = params.installmentDue || (prevPaid + params.amountPaid + Math.max(0, params.remainingBalance));
  const isSettled = params.remainingBalance <= 0;

  let breakdownLines = '';
  if (isAfterPartial) {
    // Case 3 (Diary Page 5): After partial payment completion / subsequent payment
    breakdownLines =
`• *முன்னர் செலுத்திய தொகை:* ${formatINR(prevPaid)}
• *தற்போது செலுத்திய தொகை:* ${formatINR(params.amountPaid)}
• *மீதி செலுத்த வேண்டிய தொகை:* ${isSettled ? 'NIL' : formatINR(params.remainingBalance)}
${isSettled ? '• *கணக்கு முடிக்கப்பட்டது. ✓*' : (params.expectedPaymentDate ? `• *அடுத்த தவணை தேதி:* ${params.expectedPaymentDate}` : '')}`;
  } else if (isSettled) {
    // Case 1 (Diary Page 4): Full payment at once
    breakdownLines =
`• *தற்போது செலுத்திய தொகை:* ${formatINR(params.amountPaid)}
• *மீதி செலுத்த வேண்டிய தொகை:* NIL
• *கணக்கு முடிக்கப்பட்டது. ✓*`;
  } else {
    // Case 2 (Diary Page 5): First partial payment
    breakdownLines =
`• *தற்போது செலுத்திய தொகை:* ${formatINR(params.amountPaid)}
• *மீதி செலுத்த வேண்டிய தொகை:* ${formatINR(params.remainingBalance)}
${params.expectedPaymentDate ? `• *அடுத்த தவணை தேதி:* ${params.expectedPaymentDate}` : ''}`;
  }

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Payment Confirmation Receipt / தவணை வரவு ரசீது*

• *Scheme / சீட்டு:* ${params.groupName}
• *Chit Date / சீட்டு தேதி:* ${pDate}
• *Chit Month / சீட்டு மாதம்:* ${params.monthNumber}-வது மாதம்
• *சீட்டுக்கு கட்ட வேண்டிய தொகை:* ${formatINR(dueAmt)}
${breakdownLines}
${params.paymentMethod ? `• *Payment Mode / முறை:* ${params.paymentMethod}\n` : ''}${params.receiptNumber ? `• *Receipt / ரசீது எண்:* ${params.receiptNumber}\n` : ''}
Thank you for your prompt payment!
சரியான நேரத்தில் செலுத்தியமைக்கு மனமார்ந்த நன்றி!

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

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
${params.ticketNumber ? `• *Member No / உறுப்பினர் எண்:* #${params.ticketNumber}\n` : ''}• *Total Pot Value / மொத்த தொகை:* ${formatINR(params.potValue)}
• *Duration / கால அளவு:* 20 Months (20 மாதங்கள்)
• *Base Monthly Installment / மாதாந்திர தவணை:* ${formatINR(params.baseAmount)}
• *Commencement / தொடக்க தேதி:* ${params.startDate}

Welcome to Rajamanickam Chit Fund! Your passbook has been registered. Monthly bidding & installment updates will be communicated directly to you.
ராஜமாணிக்கம் சீட் பண்ட்-ல் இணைந்தமைக்கு நன்றி! தங்களின் பாஸ்புக் தயார் செய்யப்பட்டுள்ளது. மாதாந்திர தவணை விவரங்கள் தங்களுக்கு உடனுக்குடன் தெரிவிக்கப்படும்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function createWhatsAppMessageUrl(phone: string, text: string): string {
  const cleaned = cleanPhone(phone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

/**
 * Bidding Winner Notification via WhatsApp (Sent strictly to the person who took the chit)
 * Matches Diary Page 1 & 2: சீட்டு எடுத்தவர் பற்றிய அறிவிப்பு
 */
export function createBiddingWinnerWhatsAppUrl(params: {
  phone: string;
  winnerName: string;
  groupName: string;
  monthNumber: number;
  payoutAmount: number;
  tasiruAmount: number;
  chitDate?: string;
}): string {
  const phone = cleanPhone(params.phone);
  const cDate = params.chitDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const text =
`வணக்கம் / Hello ${params.winnerName},

*RAJAMANICKAM CHIT FUND*
*Chit Winner Notice / சீட்டு எடுத்தவர் பற்றிய அறிவிப்பு*

• *Scheme / சீட்டு:* ${params.groupName}
• *Chit Date / சீட்டு தேதி:* ${cDate}
• *Chit Month / சீட்டு மாதம்:* ${params.monthNumber}-வது மாதம்
• *Chit Prize / சீட்டு எடுத்த தொகை:* ${formatINR(params.payoutAmount)}
• *Discount / தள்ளுபடி:* ${formatINR(params.tasiruAmount)}

வாழ்த்துக்கள்! தங்களின் சீட்டு எடுத்த தொகை விரைவில் தங்களுக்கு வழங்கப்படும்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Monthly Member Due Notification via WhatsApp (Sent to all 20 members)
 * Matches Diary Page 2: Chit-க்கு கட்டவேண்டிய Amount பற்றி 20 member ku MSG
 */
export function createMonthlyBiddingDueWhatsAppUrl(params: {
  phone: string;
  memberName: string;
  groupName: string;
  monthNumber: number;
  winnerPayoutAmount: number;
  installmentDue: number;
  dividendSavings?: number;
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

  const baseAmt = params.baseAmount || (params.installmentDue + (params.dividendSavings || 0));
  // Kasuru = Base Contribution - Monthly Installment Due (e.g. 5000 - 4250 = 750)
  const kasiruAmt = params.kasiru !== undefined ? params.kasiru : Math.max(0, baseAmt - params.installmentDue);

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Monthly Due Notice / மாதாந்திர தவணை அறிவிப்பு*

• *Scheme / சீட்டு:* ${params.groupName}
• *Chit Date / சீட்டு தேதி:* ${nDate}
• *Chit Month / சீட்டு மாதம்:* ${params.monthNumber}-வது மாதம்
• *சீட்டுக்கு கட்ட வேண்டிய பணம்:* ${formatINR(params.installmentDue)}
• *காசுரு:* ${formatINR(kasiruAmt)}

குறித்த தேதிக்குள் தங்களின் தவணைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Winner Prize Payout & Installment Receipt via WhatsApp
 * Sent directly to the person who took the chit when disbursing bulk or installment payouts
 * Matches Diary Page 3 & 4: Chit எடுத்தவர்க்கு payment பண்ணும்போது MSG (3 types)
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
  nextExpectedPayoutDate?: string;
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

  const prevPaid = Math.max(0, params.totalDisbursedSoFar - params.installmentAmount);
  const isSettled = params.remainingBalance <= 0;

  let payoutLines = '';
  if (prevPaid > 0) {
    // Case 3 (Diary Page 4): Subsequent / next installment
    payoutLines =
`• *ஏற்கனவே பெறப்பட்ட தொகை:* ${formatINR(prevPaid)}
• *தற்போது தரப்படும் தொகை:* ${formatINR(params.installmentAmount)}
• *மீதி தரவேண்டிய தொகை:* ${isSettled ? 'NIL' : formatINR(params.remainingBalance)}
${isSettled ? '• *கணக்கு முடிக்கப்பட்டது. ✓*' : (params.nextExpectedPayoutDate ? `• *அடுத்த தவணை தேதி:* ${params.nextExpectedPayoutDate}` : '')}`;
  } else if (isSettled) {
    // Case 1 (Diary Page 3): Full settlement in 1 payment
    payoutLines =
`• *தற்போது தரப்படும் தொகை:* ${formatINR(params.installmentAmount)} (முழுத் தொகை)
• *மீதி தரவேண்டிய தொகை:* NIL
• *கணக்கு முடிக்கப்பட்டது. ✓*`;
  } else {
    // Case 2 (Diary Page 3): First partial payment
    payoutLines =
`• *தற்போது தரப்படும் தொகை:* ${formatINR(params.installmentAmount)}
• *மீதி தரவேண்டிய தொகை:* ${formatINR(params.remainingBalance)}
${params.nextExpectedPayoutDate ? `• *அடுத்த தவணை தேதி:* ${params.nextExpectedPayoutDate}` : ''}`;
  }

  const text =
`வணக்கம் / Hello ${params.winnerName},

*RAJAMANICKAM CHIT FUND*
*Chit Payout Receipt / சீட்டு எடுத்த தொகை வழங்கல் ரசீது*

• *Scheme / சீட்டு:* ${params.groupName}
• *Chit Date / சீட்டு தேதி:* ${pDate}
• *Chit Month / சீட்டு மாதம்:* ${params.monthNumber}-வது மாதம்
• *சீட்டு எடுத்த தொகை:* ${formatINR(params.totalPayoutAmount)}
${payoutLines}
${params.paymentMethod ? `• *Payment Mode / முறை:* ${params.paymentMethod}\n` : ''}${params.receiptReference ? `• *Ref / UTR No:* ${params.receiptReference}\n` : ''}
Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Multiple Chit Schemes Enrollment Confirmation via WhatsApp (Bilingual English & Tamil)
 */
export function createMultiEnrollmentWhatsAppUrl(params: {
  phone: string;
  memberName: string;
  schemes: Array<{
    groupName: string;
    potValue: number;
    baseAmount: number;
    ticketCount: number;
  }>;
}): string {
  const phone = cleanPhone(params.phone);
  const schemeLines = params.schemes
    .map(
      (s) =>
        `• *${s.groupName}* (${s.ticketCount} ${s.ticketCount === 1 ? 'Member' : 'Members'}): தவணை ${formatINR(s.baseAmount)}/mo`
    )
    .join('\n');

  const totalMonthly = params.schemes.reduce((acc, s) => acc + s.baseAmount, 0);

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Chit Schemes Enrollment Confirmation*
*புதிய சீட்டுகள் பதிவு உறுதிசெய்தல்*

${schemeLines}

• *Total Monthly Installment / மொத்த மாதாந்திர தவணை:* ${formatINR(totalMonthly)}
• *Duration / கால அளவு:* 20 Months (20 மாதங்கள்)

Your passbook has been created. Monthly installment updates will be communicated directly to you.
தங்களின் பாஸ்புக் தயார் செய்யப்பட்டுள்ளது. தவணை விவரங்கள் தங்களுக்கு உடனுக்குடன் தெரிவிக்கப்படும்.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Multi-Chit Monthly Due Notification via WhatsApp
 * When a member is enrolled in 2 or more chits or holds multiple tickets,
 * sends ONE consolidated WhatsApp message with itemized breakdown per chit and grand total.
 */
export function createMultiChitMonthlyBiddingDueWhatsAppUrl(params: {
  phone: string;
  memberName: string;
  noticeDate?: string;
  monthNumber?: number;
  items: Array<{
    groupName: string;
    ticketNumber?: number | string;
    monthNumber?: number;
    installmentDue: number;
    kasiru?: number;
    baseAmount?: number;
    paidAmount?: number;
    remainingBalance?: number;
    status?: string;
  }>;
}): string {
  const phone = cleanPhone(params.phone);
  const nDate = params.noticeDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const monthLine = params.monthNumber ? `• *Chit Month / சீட்டு மாதம்:* ${params.monthNumber}-வது மாதம்\n` : '';

  const itemLines = params.items.map((it) => {
    const ticketText = it.ticketNumber ? ` (Member #${it.ticketNumber})` : '';
    const mText = it.monthNumber && it.monthNumber !== params.monthNumber ? ` [Month ${it.monthNumber}]` : '';
    const kasiruText = it.kasiru !== undefined && it.kasiru > 0 ? `\n    - காசுரு: ${formatINR(it.kasiru)}` : '';
    const remText = it.remainingBalance !== undefined && it.paidAmount !== undefined && it.paidAmount > 0
      ? `\n    - செலுத்தியது: ${formatINR(it.paidAmount)} | மீதி: ${formatINR(it.remainingBalance)}`
      : '';
    return `• *${it.groupName}*${ticketText}${mText}:
    - சீட்டுக்கு கட்ட வேண்டிய பணம்: ${formatINR(it.installmentDue)}${kasiruText}${remText}`;
  }).join('\n');

  const totalDue = params.items.reduce((sum, it) => sum + (it.installmentDue || 0), 0);
  const totalRemaining = params.items.reduce((sum, it) => {
    if (it.remainingBalance !== undefined) return sum + it.remainingBalance;
    const paid = it.paidAmount || 0;
    return sum + Math.max(0, (it.installmentDue || 0) - paid);
  }, 0);

  const balanceLine = totalRemaining !== totalDue
    ? `\n• *Balance to Pay / பாக்கி தொகை:* ${formatINR(totalRemaining)}`
    : '';

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Monthly Due Notice / மாதாந்திர தவணை அறிவிப்பு*

• *Chit Date / சீட்டு தேதி:* ${nDate}
${monthLine}*தங்களின் சீட்டுகள் தவணை விவரம் / Enrolled Chits:*
${itemLines}

• *Total Payable / மொத்த தவணை:* ${formatINR(totalDue)}${balanceLine}

குறித்த தேதிக்குள் தங்களின் தவணைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம்.
Payment modes: Cash, GPay, PhonePe, Bank Transfer.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Multi-Chit Payment Confirmation Receipt via WhatsApp
 * When a member pays for 2 or more chits or holds multiple shares,
 * sends ONE consolidated receipt covering all their enrolled chits.
 */
export function createMultiChitPaymentReceiptWhatsAppUrl(params: {
  phone: string;
  memberName: string;
  paymentDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  expectedPaymentDate?: string;
  items: Array<{
    groupName: string;
    ticketNumber?: number | string;
    monthNumber?: number;
    installmentDue: number;
    amountPaid: number;
    previouslyPaid?: number;
    remainingBalance: number;
    status?: string;
  }>;
}): string {
  const phone = cleanPhone(params.phone);
  const pDate = params.paymentDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const itemLines = params.items.map((it) => {
    const ticketText = it.ticketNumber ? ` (Member #${it.ticketNumber})` : '';
    const mText = it.monthNumber ? ` [Month ${it.monthNumber}]` : '';
    const isSettled = it.remainingBalance <= 0;
    const statusText = isSettled ? 'NIL (கணக்கு முடிக்கப்பட்டது. ✓)' : formatINR(it.remainingBalance);
    return `• *${it.groupName}*${ticketText}${mText}:
    - தவணை தொகை: ${formatINR(it.installmentDue)}
    - வரவு: ${formatINR(it.amountPaid)}
    - மீதி: ${statusText}`;
  }).join('\n');

  const totalDue = params.items.reduce((sum, it) => sum + (it.installmentDue || 0), 0);
  const totalPaid = params.items.reduce((sum, it) => sum + (it.amountPaid || 0), 0);
  const totalRemaining = params.items.reduce((sum, it) => sum + Math.max(0, it.remainingBalance || 0), 0);
  const allSettled = totalRemaining <= 0;

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Payment Confirmation Receipt / தவணை வரவு ரசீது*

• *Chit Date / சீட்டு தேதி:* ${pDate}
${params.paymentMethod ? `• *Payment Mode / முறை:* ${params.paymentMethod}\n` : ''}${params.receiptNumber ? `• *Receipt / ரசீது எண்:* ${params.receiptNumber}\n` : ''}
*தங்களின் சீட்டுகள் வரவு விவரம்:*
${itemLines}

• *மொத்த தவணை தொகை:* ${formatINR(totalDue)}
• *தற்போது செலுத்திய தொகை:* ${formatINR(totalPaid)}
• *மீதி செலுத்த வேண்டிய தொகை:* ${allSettled ? 'NIL' : formatINR(totalRemaining)}
${allSettled ? '• *கணக்கு முடிக்கப்பட்டது. ✓*' : (params.expectedPaymentDate ? `• *அடுத்த தவணை தேதி:* ${params.expectedPaymentDate}` : '')}

Thank you for your prompt payment!
சரியான நேரத்தில் செலுத்தியமைக்கு மனமார்ந்த நன்றி!

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Multi-Chit Overdue Notice via WhatsApp
 * When a member has pending installments across 2 or more chits,
 * sends ONE consolidated overdue notice listing each pending chit and total overdue.
 */
export function createMultiChitOverdueReminderWhatsAppUrl(params: {
  phone: string;
  memberName: string;
  items: Array<{
    groupName: string;
    ticketNumber?: number | string;
    monthNumber?: number;
    pendingAmount: number;
    unpaidCount?: number;
  }>;
}): string {
  const phone = cleanPhone(params.phone);
  const itemLines = params.items.map((it) => {
    const ticketText = it.ticketNumber ? ` (Member #${it.ticketNumber})` : '';
    const mText = it.monthNumber ? ` - Month ${it.monthNumber}` : '';
    const countText = it.unpaidCount && it.unpaidCount > 1 ? ` (${it.unpaidCount} Months)` : '';
    return `• *${it.groupName}*${ticketText}${mText}: நிலுவை ${formatINR(it.pendingAmount)}${countText}`;
  }).join('\n');

  const totalOverdue = params.items.reduce((sum, it) => sum + (it.pendingAmount || 0), 0);

  const text =
`வணக்கம் / Hello ${params.memberName},

*RAJAMANICKAM CHIT FUND*
*Installment Overdue Notice / மாதாந்திர தவணை நிலுவை அறிவிப்பு*

*தங்களின் நிலுவை சீட்டுகள் விவரம்:*
${itemLines}

• *Total Overdue / மொத்த நிலுவைத் தொகை:* ${formatINR(totalOverdue)}

Kindly clear your pending installment at the earliest.
தங்களின் மாதாந்திர சீட்டு தவணை நிலுவைத் தொகையை உடனே செலுத்துமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

Payment Modes / செலுத்தும் வழிகள்: Cash, GPay, PhonePe, Bank Transfer.

Regards / இங்ஙனம்,
*Rajamanickam Chit Fund, Yethapur*
Ph: +91 99944 18186`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
