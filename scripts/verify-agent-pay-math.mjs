// scripts/verify-agent-pay-math.mjs
// Verification of Agent's Pay logic, math, and messaging

function calculateBiddingMath({ pot, totalMembers, winnerPayout, agentPay }) {
  // 1. Thalubadi (Thasiru / Discount) = Gross Pot - Winner Payout
  // "thallubadi will remain 20000 and not 17000 ... this will not be reflected in the tharisu or thalubadi"
  const thalubadi = pot - winnerPayout;

  // 2. Per Member Due = (Winner Prize Amount + Agent's Pay) / Total Members
  // "Example month 1: BIdding win abt = 80000 agent pay = 3000 so each will be payin (80000+3000) / 20"
  const perMemberDue = Math.round((winnerPayout + agentPay) / totalMembers);

  // 3. Base monthly contribution
  const baseMonthly = Math.round(pot / totalMembers);

  // 4. Total collected from all members
  const totalCollected = perMemberDue * totalMembers;

  return {
    pot,
    totalMembers,
    winnerPayout,
    agentPay,
    thalubadi,
    perMemberDue,
    baseMonthly,
    totalCollected,
    organizerEarnings: agentPay,
    winnerPrize: winnerPayout,
  };
}

console.log('=== TEST 1: User Example (1L Scheme, 20 Members) ===');
const res1 = calculateBiddingMath({
  pot: 100000,
  totalMembers: 20,
  winnerPayout: 80000,
  agentPay: 3000,
});
console.log(res1);
if (res1.thalubadi !== 20000) throw new Error(`Thalubadi should be 20000, got ${res1.thalubadi}`);
if (res1.perMemberDue !== 4150) throw new Error(`Per member due should be 4150, got ${res1.perMemberDue}`);
if (res1.totalCollected !== 83000) throw new Error(`Total collected should be 83000, got ${res1.totalCollected}`);
console.log('✓ Test 1 Passed: Thalubadi is 20000 (NOT 17000), Per Member Due is 4150 ((80000+3000)/20)!');

console.log('\n=== TEST 2: 2L Scheme (20 Members) with Base Agent Pay ₹6,000 ===');
const res2 = calculateBiddingMath({
  pot: 200000,
  totalMembers: 20,
  winnerPayout: 160000,
  agentPay: 6000,
});
console.log(res2);
if (res2.thalubadi !== 40000) throw new Error(`Thalubadi should be 40000, got ${res2.thalubadi}`);
if (res2.perMemberDue !== 8300) throw new Error(`Per member due should be 8300, got ${res2.perMemberDue}`);
console.log('✓ Test 2 Passed: Thalubadi is 40000, Per Member Due is 8300 ((160000+6000)/20)!');

console.log('\n=== TEST 3: 3L Scheme (20 Members) with Base Agent Pay ₹9,000 ===');
const res3 = calculateBiddingMath({
  pot: 300000,
  totalMembers: 20,
  winnerPayout: 250000,
  agentPay: 9000,
});
console.log(res3);
if (res3.thalubadi !== 50000) throw new Error(`Thalubadi should be 50000, got ${res3.thalubadi}`);
if (res3.perMemberDue !== 12950) throw new Error(`Per member due should be 12950, got ${res3.perMemberDue}`);
console.log('✓ Test 3 Passed: Thalubadi is 50000, Per Member Due is 12950 ((250000+9000)/20)!');

console.log('\n=== TEST 4: 5L Scheme (20 Members) with Base Agent Pay ₹15,000 ===');
const res4 = calculateBiddingMath({
  pot: 500000,
  totalMembers: 20,
  winnerPayout: 420000,
  agentPay: 15000,
});
console.log(res4);
if (res4.thalubadi !== 80000) throw new Error(`Thalubadi should be 80000, got ${res4.thalubadi}`);
if (res4.perMemberDue !== 21750) throw new Error(`Per member due should be 21750, got ${res4.perMemberDue}`);
console.log('✓ Test 4 Passed: Thalubadi is 80000, Per Member Due is 21750 ((420000+15000)/20)!');

console.log('\n=== TEST 5: Client Adjusts Agent Pay (e.g. 1L with ₹3,500 agent pay) ===');
const res5 = calculateBiddingMath({
  pot: 100000,
  totalMembers: 20,
  winnerPayout: 80000,
  agentPay: 3500,
});
console.log(res5);
if (res5.thalubadi !== 20000) throw new Error(`Thalubadi should remain 20000`);
if (res5.perMemberDue !== 4175) throw new Error(`Per member due should be 4175, got ${res5.perMemberDue}`);
console.log('✓ Test 5 Passed: Custom adjusted agent pay works accurately!');

console.log('\nALL 5 AGENT PAY MATH TESTS COMPLETED SUCCESSFULLY! 🎉');
