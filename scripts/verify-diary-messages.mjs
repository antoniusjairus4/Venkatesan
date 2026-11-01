// verify-diary-messages.mjs
// Test all 5 diary messaging formats and ensure banned terms / suffixes do not appear.

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function cleanPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

// 1. Chit Winner Notification (Diary Page 1 & 2)
function getBiddingWinnerText(params) {
  const cDate = params.chitDate || '06-Mar-2024';
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

// 2. Monthly Due Notice (Diary Page 2)
function getMonthlyBiddingDueText(params) {
  const nDate = params.noticeDate || '06-Mar-2024';
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

// 3. Winner Prize Payout Receipt (Diary Page 3 & 4)
function getWinnerPayoutInstallmentText(params) {
  const pDate = params.paymentDate || '07-Mar-2024';
  const prevPaid = Math.max(0, params.totalDisbursedSoFar - params.installmentAmount);
  const isSettled = params.remainingBalance <= 0;

  let payoutLines = '';
  if (prevPaid > 0) {
    payoutLines =
`• ஏற்கனவே பெறப்பட்ட தொகை: ₹${prevPaid.toLocaleString('en-IN')}
• தற்போது தரப்படும் தொகை: ₹${params.installmentAmount.toLocaleString('en-IN')}
• மீதி தரவேண்டிய தொகை: ${isSettled ? 'NIL' : `₹${params.remainingBalance.toLocaleString('en-IN')}`}
${isSettled ? '• கணக்கு முடிக்கப்பட்டது. ✓' : (params.nextExpectedPayoutDate ? `• அடுத்த தவணை தேதி: ${params.nextExpectedPayoutDate}` : '')}`;
  } else if (isSettled) {
    payoutLines =
`• தற்போது தரப்படும் தொகை: ₹${params.installmentAmount.toLocaleString('en-IN')} (முழுத் தொகை)
• மீதி தரவேண்டிய தொகை: NIL
• கணக்கு முடிக்கப்பட்டது. ✓`;
  } else {
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

// 4. Monthly Payment Received Receipt (Diary Page 4 & 5)
function getPaymentReceiptText(params) {
  const pDate = params.paymentDate || '08-Mar-2024';
  const prevPaid = params.previouslyPaid || 0;
  const isAfterPartial = prevPaid > 0;
  const dueAmt = params.installmentDue || (prevPaid + params.amountPaid + Math.max(0, params.remainingBalance));
  const isSettled = params.remainingBalance <= 0;

  let breakdownLines = '';
  if (isAfterPartial) {
    breakdownLines =
`• முன்னர் செலுத்திய தொகை: ₹${prevPaid.toLocaleString('en-IN')}
• தற்போது செலுத்திய தொகை: ₹${params.amountPaid.toLocaleString('en-IN')}
• மீதி செலுத்த வேண்டிய தொகை: ${isSettled ? 'NIL' : `₹${params.remainingBalance.toLocaleString('en-IN')}`}
${isSettled ? '• கணக்கு முடிக்கப்பட்டது. ✓' : (params.expectedPaymentDate ? `• அடுத்த தவணை தேதி: ${params.expectedPaymentDate}` : '')}`;
  } else if (isSettled) {
    breakdownLines =
`• தற்போது செலுத்திய தொகை: ₹${params.amountPaid.toLocaleString('en-IN')}
• மீதி செலுத்த வேண்டிய தொகை: NIL
• கணக்கு முடிக்கப்பட்டது. ✓`;
  } else {
    breakdownLines =
`• தற்போது செலுத்திய தொகை: ₹${params.amountPaid.toLocaleString('en-IN')}
• மீதி செலுத்த வேண்டிய தொகை: ₹${params.remainingBalance.toLocaleString('en-IN')}
${params.expectedPaymentDate ? `• அடுத்த தவணை தேதி: ${params.expectedPaymentDate}` : ''}`;
  }

  return `வணக்கம் / Hello ${params.memberName},

RAJAMANICKAM CHIT FUND
Payment Confirmation Receipt / தவணை வரவு ரசீது

• Scheme / சீட்டு: ${params.groupName}
• Chit Date / சீட்டு தேதி: ${pDate}
• Chit Month / சீட்டு மாதம்: ${params.monthNumber}-வது மாதம்
• சீட்டுக்கு கட்ட வேண்டிய தொகை: ₹${dueAmt.toLocaleString('en-IN')}
${breakdownLines}

Regards / இங்ஙனம்,
Rajamanickam Chit Fund, Salem
Ph: +91 98765 43210`;
}

console.log('--- TEST 1: Winner Announcement (Diary 1 & 2) ---');
const t1 = getBiddingWinnerText({
  winnerName: 'Senthil Nathan',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  payoutAmount: 150000,
  tasiruAmount: 50000,
});
console.log(t1);

console.log('\n--- TEST 2: Monthly Due Notice to 20 Members (Diary 2) ---');
const t2 = getMonthlyBiddingDueText({
  memberName: 'K. Ramesh',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  winnerPayoutAmount: 150000,
  installmentDue: 7750,
  dividendSavings: 2250,
  thalubadi: 50000,
  kasiru: 10000,
});
console.log(t2);

console.log('\n--- TEST 3A: Winner Payout Case 1 - Full Settlement (Diary 3) ---');
const t3a = getWinnerPayoutInstallmentText({
  winnerName: 'Senthil Nathan',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  installmentNumber: 1,
  installmentAmount: 150000,
  totalPayoutAmount: 150000,
  totalDisbursedSoFar: 150000,
  remainingBalance: 0,
});
console.log(t3a);

console.log('\n--- TEST 3B: Winner Payout Case 2 - First Partial (Diary 3) ---');
const t3b = getWinnerPayoutInstallmentText({
  winnerName: 'Senthil Nathan',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  installmentNumber: 1,
  installmentAmount: 60000,
  totalPayoutAmount: 150000,
  totalDisbursedSoFar: 60000,
  remainingBalance: 90000,
  nextExpectedPayoutDate: '15-Mar-2024',
});
console.log(t3b);

console.log('\n--- TEST 3C: Winner Payout Case 3 - Next Installment (Diary 4) ---');
const t3c = getWinnerPayoutInstallmentText({
  winnerName: 'Senthil Nathan',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  installmentNumber: 2,
  installmentAmount: 90000,
  totalPayoutAmount: 150000,
  totalDisbursedSoFar: 150000,
  remainingBalance: 0,
});
console.log(t3c);

console.log('\n--- TEST 4A: Payment Received Case 1 - Full Payment (Diary 4) ---');
const t4a = getPaymentReceiptText({
  memberName: 'K. Ramesh',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  amountPaid: 7750,
  remainingBalance: 0,
});
console.log(t4a);

console.log('\n--- TEST 4B: Payment Received Case 2 - First Partial (Diary 5) ---');
const t4b = getPaymentReceiptText({
  memberName: 'K. Ramesh',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  amountPaid: 4000,
  remainingBalance: 3750,
  expectedPaymentDate: '20-Mar-2024',
});
console.log(t4b);

console.log('\n--- TEST 4C: Payment Received Case 3 - After Partial Completion (Diary 5) ---');
const t4c = getPaymentReceiptText({
  memberName: 'K. Ramesh',
  groupName: '2 Lakhs Chit',
  monthNumber: 2,
  previouslyPaid: 4000,
  amountPaid: 3750,
  remainingBalance: 0,
});
console.log(t4c);

// Validate banned words
const allTexts = [t1, t2, t3a, t3b, t3c, t4a, t4b, t4c].join('\n');
const bannedCheck1 = /வெற்றித்தொகைவு/i.test(allTexts);
const bannedCheck2 = /வெற்றித்தொகை/i.test(allTexts);
const bannedCheck3 = /சீட்டு, ஏல வெற்றித்தொகை/i.test(allTexts);

console.log('\n--- BANNED WORDS VERIFICATION ---');
console.log('Contains "வெற்றித்தொகைவு":', bannedCheck1 ? 'FAIL ❌' : 'PASSED ✓ (Zero found)');
console.log('Contains "வெற்றித்தொகை":', bannedCheck2 ? 'FAIL ❌' : 'PASSED ✓ (Zero found)');
console.log('Contains "சீட்டு, ஏல வெற்றித்தொகை":', bannedCheck3 ? 'FAIL ❌' : 'PASSED ✓ (Zero found)');

if (!bannedCheck1 && !bannedCheck2 && !bannedCheck3) {
  console.log('\nALL 8 DIARY MESSAGE TEST CASES PASSED WITH 100% COMPLIANCE! 🎉');
} else {
  process.exit(1);
}
