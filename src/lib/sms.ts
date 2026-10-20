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
}): string {
  const text =
`வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Chit Scheme Enrollment Confirmation
புதிய சீட்டு பதிவு உறுதிசெய்தல்

• Scheme / திட்டம்: ${params.groupName}
• Total Pot Value / மொத்த தொகை: ₹${params.potValue.toLocaleString('en-IN')}
• Duration / கால அளவு: 20 Months (20 மாதங்கள்)
• Monthly Installment / மாதாந்திர தவணை: ₹${params.baseAmount.toLocaleString('en-IN')}
• Commencement / தொடக்க தேதி: ${params.startDate}

Your passbook has been created. Monthly installment updates will be communicated directly to you.
தங்களின் பாஸ்புக் தயார் செய்யப்பட்டுள்ளது. மாதாந்திர தவணை விவரங்கள் தங்களுக்கு உடனுக்குடன் தெரிவிக்கப்படும்.

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;

  return createSmsUrl(params.phone, text);
}

/**
 * 2. Monthly Installment Received & Cleared (Native SMS - Bilingual English & Tamil)
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
மாதாந்திர தவணை பெறப்பட்டது

• Scheme / திட்டம்: ${params.groupName}
• Month / மாதம்: Month ${params.monthNumber}
• Balance Remaining / மீதம்: ₹0 (Cleared ✓)

Payment has been credited to your account with thanks. Thank you for your prompt clearance!
தங்களின் தவணைத் தொகை பெறப்பட்டு கணக்கில் வரவு வைக்கப்பட்டது. சரியான நேரத்தில் செலுத்தியமைக்கு மனமார்ந்த நன்றி!

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
