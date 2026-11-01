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
${params.ticketNumber ? `• Member No / உறுப்பினர் எண்: #${params.ticketNumber}\n` : ''}• Total Pot Value / மொத்த தொகை: ₹${params.potValue.toLocaleString('en-IN')}
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
        `• ${s.groupName} (${s.ticketCount} ${s.ticketCount === 1 ? 'Member' : 'Members'}): தவணை ₹${s.baseAmount.toLocaleString('en-IN')}/mo`
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
  previouslyPaid?: number;
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

  const payAmt = params.amountPaid || 0;
  const remBal = params.remainingBalance || 0;
  const prevPaid = params.previouslyPaid || 0;
  const isAfterPartial = prevPaid > 0;
  const dueAmt = params.installmentDue || (prevPaid + payAmt + remBal);
  const isSettled = remBal <= 0;

  let breakdownLines = '';
  if (isAfterPartial) {
    // Case 3 (Diary Page 5): After partial payment completion / subsequent payment
    breakdownLines =
`• முன்னர் செலுத்திய தொகை: ₹${prevPaid.toLocaleString('en-IN')}
• தற்போது செலுத்திய தொகை: ₹${payAmt.toLocaleString('en-IN')}
• மீதி செலுத்த வேண்டிய தொகை: ${isSettled ? 'NIL' : `₹${remBal.toLocaleString('en-IN')}`}
${isSettled ? '• கணக்கு முடிக்கப்பட்டது. ✓' : (params.expectedPaymentDate ? `• அடுத்த தவணை தேதி: ${params.expectedPaymentDate}` : '')}`;
  } else if (isSettled) {
    // Case 1 (Diary Page 4): Full payment at once
    breakdownLines =
`• தற்போது செலுத்திய தொகை: ₹${payAmt.toLocaleString('en-IN')}
• மீதி செலுத்த வேண்டிய தொகை: NIL
• கணக்கு முடிக்கப்பட்டது. ✓`;
  } else {
    // Case 2 (Diary Page 5): First partial payment
    breakdownLines =
`• தற்போது செலுத்திய தொகை: ₹${payAmt.toLocaleString('en-IN')}
• மீதி செலுத்த வேண்டிய தொகை: ₹${remBal.toLocaleString('en-IN')}
${params.expectedPaymentDate ? `• அடுத்த தவணை தேதி: ${params.expectedPaymentDate}` : ''}`;
  }

  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Payment Confirmation Receipt / தவணை வரவு ரசீது

• Scheme / சீட்டு: ${params.groupName}
• Chit Date / சீட்டு தேதி: ${pDate}
• Chit Month / சீட்டு மாதம்: ${params.monthNumber}-வது மாதம்
• சீட்டுக்கு கட்ட வேண்டிய தொகை: ₹${dueAmt.toLocaleString('en-IN')}
${breakdownLines}
${params.paymentMethod ? `• Payment Mode / முறை: ${params.paymentMethod}\n` : ''}
Thank you for your prompt payment!
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
/**
 * 6. Bidding Winner Notification (Native SMS - Bilingual English & Tamil)
 * Targeted strictly to the person who took the chit
 * Matches Diary Page 1 & 2: சீட்டு எடுத்தவர் பற்றிய அறிவிப்பு
 */
export function getBiddingWinnerText(params: {
  winnerName: string;
  groupName: string;
  monthNumber: number;
  payoutAmount: number;
  tasiruAmount: number;
  chitDate?: string;
}): string {
  const cDate = params.chitDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `வணக்கம் / Hello ${params.winnerName},

RAJAMANICKAM CHIT FUND
Chit Winner Notice / சீட்டு எடுத்தவர் பற்றிய அறிவிப்பு

• Scheme / சீட்டு: ${params.groupName}
• Chit Date / சீட்டு தேதி: ${cDate}
• Chit Month / சீட்டு மாதம்: ${params.monthNumber}-வது மாதம்
• Chit Prize / சீட்டு எடுத்த தொகை: ₹${params.payoutAmount.toLocaleString('en-IN')}
• Discount / தள்ளுபடி: ₹${params.tasiruAmount.toLocaleString('en-IN')}

வாழ்த்துக்கள்! தங்களின் சீட்டு எடுத்த தொகை விரைவில் தங்களுக்கு வழங்கப்படும்.

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
  chitDate?: string;
}): string {
  const text = getBiddingWinnerText(params);
  return createSmsUrl(params.phone, text);
}

/**
 * 7. Monthly Bidding Member Due Notification (Native SMS - Bilingual English & Tamil)
 * Matches Diary Page 2: Chit-க்கு கட்டவேண்டிய Amount பற்றி 20 member ku MSG
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
Monthly Due Notice / மாதாந்திர தவணை அறிவிப்பு

• Scheme / சீட்டு: ${params.groupName}
• Chit Date / சீட்டு தேதி: ${nDate}
• Chit Month / சீட்டு மாதம்: ${params.monthNumber}-வது மாதம்
• சீட்டுக்கு கட்ட வேண்டிய பணம்: ₹${params.installmentDue.toLocaleString('en-IN')}
• காசுரு: ₹${kasiruAmt.toLocaleString('en-IN')}
• தள்ளுபடி: ₹${thalubadiAmt.toLocaleString('en-IN')}

குறித்த தேதிக்குள் தங்களின் தவணைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம்.

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
 * Sent directly to the person who took the chit when disbursing bulk or installment payouts
 * Matches Diary Page 3 & 4: Chit எடுத்தவர்க்கு payment பண்ணும்போது MSG (3 types)
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

  const prevPaid = Math.max(0, params.totalDisbursedSoFar - params.installmentAmount);
  const isSettled = params.remainingBalance <= 0;

  let payoutLines = '';
  if (prevPaid > 0) {
    // Case 3 (Diary Page 4): Subsequent / next installment
    payoutLines =
`• ஏற்கனவே பெறப்பட்ட தொகை: ₹${prevPaid.toLocaleString('en-IN')}
• தற்போது தரப்படும் தொகை: ₹${params.installmentAmount.toLocaleString('en-IN')}
• மீதி தரவேண்டிய தொகை: ${isSettled ? 'NIL' : `₹${params.remainingBalance.toLocaleString('en-IN')}`}
${isSettled ? '• கணக்கு முடிக்கப்பட்டது. ✓' : (params.nextExpectedPayoutDate ? `• அடுத்த தவணை தேதி: ${params.nextExpectedPayoutDate}` : '')}`;
  } else if (isSettled) {
    // Case 1 (Diary Page 3): Full settlement in 1 payment
    payoutLines =
`• தற்போது தரப்படும் தொகை: ₹${params.installmentAmount.toLocaleString('en-IN')} (முழுத் தொகை)
• மீதி தரவேண்டிய தொகை: NIL
• கணக்கு முடிக்கப்பட்டது. ✓`;
  } else {
    // Case 2 (Diary Page 3): First partial payment
    payoutLines =
`• தற்போது தரப்படும் தொகை: ₹${params.installmentAmount.toLocaleString('en-IN')}
• மீதி தரவேண்டிய தொகை: ₹${params.remainingBalance.toLocaleString('en-IN')}
${params.nextExpectedPayoutDate ? `• அடுத்த தவணை தேதி: ${params.nextExpectedPayoutDate}` : ''}`;
  }

  return `வணக்கம் / Hello ${params.winnerName},

RAJAMANICKAM CHIT FUND
Chit Payout Receipt / சீட்டு எடுத்த தொகை வழங்கல் ரசீது

• Scheme / சீட்டு: ${params.groupName}
• Chit Date / சீட்டு தேதி: ${pDate}
• Chit Month / சீட்டு மாதம்: ${params.monthNumber}-வது மாதம்
• சீட்டு எடுத்த தொகை: ₹${params.totalPayoutAmount.toLocaleString('en-IN')}
${payoutLines}
${params.paymentMethod ? `• Payment Mode / முறை: ${params.paymentMethod}\n` : ''}${params.receiptReference ? `• Ref / UTR No: ${params.receiptReference}\n` : ''}
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
