const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../assets/financial-model.js');

const date = value => new Date(value + 'T12:00:00');
const close = (actual, expected, tolerance = .01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
const baseProjection = {
  growth: () => 1, monthly: () => 0, bonus: () => 0, interest: 0, birth55: null,
  frs: null, sa: null, reserved55: 0
};
const cfg = (changes = {}) => {
  const booking = date('2026-12-01'), afl = date('2027-06-01'), key = date('2031-09-01');
  return {
    ...baseProjection, booking, afl, key, oaDate: booking, room: '2R', provider: 'hdb', shortLease: false,
    tenure: 25, ageAtBooking: 38, bankAge: 38, keyAge: 43,
    rate: 2.6, assessmentRate: 0, otherMortgages: 0, approved: 900000, gross: 8000, debts: 0,
    net: null, monthlyCosts: 0, scheme: 'standard', customAfl: .10, optionFee: 500, grant: 0, grantAt: 'afl',
    cpfLimit: null, reserve: 0, maxReserve: 20000, legalAFL: 0, feesKey: 0, keyCpfFees: 0,
    additionalDuty: 0, hdbRegistration: 0, ocs: 0, fire: 0, levy: 0, handoverOther: 0, setup: 0, hps: 0,
    cash: 250000, savings: 0, early: {oa:0, raTransfer:0, raUnknown:false},
    projectAfterAFL: oa => ({oa, raTransfer:0, raUnknown:false}),
    ...changes
  };
};
// Independent annuity calculation. Discount each payment individually to today.
function discountedPayments(payment, percent, months) {
  return Array.from({length: months}, (_, i) => payment / (1 + percent / 1200) ** (i + 1))
    .reduce((total, payment) => total + payment, 0);
}

test('official S$345,000 HDB Agreement for Lease example, including booking credit', () => {
  const r = model.purchase(345000, cfg({room:'4R', optionFee:2000, legalAFL:null}));
  close(r.dp, 34500);
  close(r.bsd, 5100);
  close(model.legalFee(345000), 239.80);
  close(r.needAFL, 37839.80);
  close(model.stampDuty(365000.99), 5550);
});

test('2-Room single, HFE below required loan, CPF before drawing HDB loan', () => {
  const c = cfg({approved:180000, gross:4100, reserve:20000, cash:20000,
    early:{oa:100000,raTransfer:0}, grant:15000});
  const r = model.purchase(350000, c);
  // AFL: S$34,500 + S$5,200 BSD, including S$15,000 grant. Keys: S$315,000 balance,
  // S$75,300 OA carried forward, S$20,000 retained and S$180,000 loan.
  close(r.cpfAFL,39700);
  close(r.loan,180000);
  close(r.cashKeyPrice,79700);
  close(r.shortfall,60831.89);
  close(discountedPayments(r.install,2.6,300),180000);
  const highOA = model.purchase(350000, {...c, projectAfterAFL: () => ({oa:300000,raTransfer:0})});
  close(highOA.loan,35000);
  close(highOA.afterKeys,20000);
});

test('3-Room dual-income bank loan: MSR and TDSR, 20% AFL and 5% cash', () => {
  const c = cfg({room:'3R', provider:'bank', gross:8000, debts:2600, optionFee:1000,
    cash:100000, early:{oa:100000,raTransfer:0}, rate:3});
  const r = model.purchase(500000,c);
  // TDSR leaves 55% × 8,000 − 2,600 = 1,800. This is less than the S$2,400 MSR ceiling.
  close(r.loan,discountedPayments(1800,4,300));
  close(r.dp,100000);
  close(r.cashAFL,24000);
  close(r.tdsr,.55,.00001);
  close(r.msr,.225,.00001);
  close(r.shortfall,0);
});

test('4-Room bank lower LTV, existing mortgages, and deferred-income staged cash', () => {
  const c = cfg({room:'4R',provider:'bank', optionFee:2000,bankAge:44,scheme:'deferred-income',
    gross:20000,early:{oa:500000,raTransfer:0}, cash:500000});
  const r = model.purchase(700000,c);
  close(r.loan,385000);
  close(r.dp,17500);
  close(r.cashAFL,15500);
  close(r.mandatoryCashAtKey,52500);
  close(r.cashKeyPrice,52500);
  close(model.loanRules({...c,otherMortgages:1}).ltv,.25);
  close(model.loanRules({...c,otherMortgages:2}).minCashRate,.25);
});

test('4-Room HDB uses assessed MSR at 3% and capped 65-minus-age tenor', () => {
  const c = cfg({room:'4R', ageAtBooking:49, gross:6000, rate:2.6, optionFee:2000});
  const r = model.purchase(700000,c);
  close(r.effectiveTenure,16);
  const expected=discountedPayments(1800,3,192);
  close(r.loan,expected);
  close(r.msr,.30);
  close(discountedPayments(r.install,2.6,192),expected);
  close(model.loanRules({...c, ageAtBooking:65}).cap,0);
});

test('short-lease 2-Room, no loan, CPF usage cap and deferred downpayment', () => {
  const c = cfg({shortLease:true, scheme:'deferred', cash:90000, cpfLimit:70000,
    grant:12000, early:{oa:110000,raTransfer:0}});
  const r = model.purchase(150000,c);
  close(r.loan,0);
  close(r.dp,500);
  close(r.bsd,1500);
  close(r.cpfAFL,1500);
  close(r.cpfKey,82000);
  close(r.cashKeyPrice,67500);
  close(r.totalCash,68000);
  close(r.shortfall,0);
  close(model.purchase(150000,{...c,cpfLimit:null}).cpfKey,12000);
});

test('full CPF plus booking cash, and full cash purchase', () => {
  const c = cfg({provider:'none', gross:null, cash:500,early:{oa:400000,raTransfer:0}});
  const cpf = model.purchase(350000,c);
  close(cpf.loan,0);
  close(cpf.totalCash,500);
  close(cpf.shortfall,0);
  const cash = model.purchase(350000,{...c,early:{oa:0,raTransfer:0}});
  close(cash.totalCash,355200);
  close(cash.shortfall,354700);
});

test('grant timing, cap and OCS application do not double-count grant', () => {
  const c = cfg({provider:'none',grant:100000,ocs:3000});
  const early = model.purchase(100000,c);
  const late = model.purchase(100000,{...c,grantAt:'key'});
  close(early.grantUsedAfl,9500);
  close(early.grantUsedKey,85500);
  close(early.grantOCS,3000);
  close(late.grantUsedAfl,0);
  close(late.grantUsedKey,90000);
  close(late.totalCash,11000);
});

test('CPF monthly interest is credited annually, including a mid-year withdrawal', () => {
  const projection = {...baseProjection,interest:2.5,monthly:()=>500};
  const first = model.project(date('2027-01-01'),date('2027-07-01'),12000,projection);
  // July opening is 12,000 + six credits. Interest remains uncredited.
  close(first.oa,15000);
  const end = model.project(date('2027-07-01'),date('2028-01-01'),13000,projection,{...first,withdrawal:2000});
  const balances = [12000,12000,12500,13000,13500,14000,12500,13000,13500,14000,14500,15000];
  close(end.oa,16000 + balances.reduce((sum,x)=>sum+x,0)*.025/12);
});

test('age 55 before and after keys, including same-month birthday and SA surplus', () => {
  const c = {...baseProjection,birth55:date('2031-08-15'),frs:220000,sa:150000,reserved55:20000};
  close(model.project(date('2031-08-01'),date('2031-08-14'),80000,c).oa,80000);
  const throughKeys = model.project(date('2031-08-01'),date('2031-08-31'),80000,c);
  close(throughKeys.raTransfer,60000);
  close(throughKeys.oa,20000);
  const postKeys = {...c,birth55:date('2031-09-15'),sa:225000};
  close(model.project(date('2031-08-01'),date('2031-09-01'),80000,postKeys).oa,80000);
  close(model.project(date('2031-09-01'),date('2031-10-01'),80000,postKeys).oa,85000);
  assert.ok(model.project(date('2031-08-01'),date('2031-08-31'),80000,{...c,frs:null}).raUnknown);
});

test('zero increments / bonus, 20% conservative OA, stage-by-stage maximum and classification', () => {
  const start = date('2027-01-01'), end = date('2028-01-01');
  close(model.project(start,end,20000,{...baseProjection,monthly:()=>1000}).oa,32000);
  close(model.project(start,end,20000,{...baseProjection,monthly:()=>800}).oa,29600);
  const c = cfg({cash:50000,provider:'none',gross:null});
  // With cash only and an option fee credited to the price, cost is price + floored 1% stamp duty.
  close(model.maximumPrice(c),49505);
  const funded = model.purchase(49000,c);
  const missed = model.purchase(60000,c);
  assert.equal(model.affordability(funded,missed,c),'Stretched');
  assert.equal(model.affordability(missed,missed,c),'Insufficient Funds');
  const ample = {...c,cash:65000,net:3000,monthlyCosts:1500};
  const r = model.purchase(49000,ample);
  assert.equal(model.affordability(r,r,ample),'Comfortable');
  const noTakeHome = {...ample,net:null};
  const ordinary = model.purchase(49000,noTakeHome);
  assert.equal(model.affordability(ordinary,ordinary,noTakeHome),'Manageable');
  assert.equal(model.maximumPrice({...c,cash:0,savings:10000}),0);
});

test('maximum price uses OA, HFE, MSR and actual cash at the binding stage', () => {
  const c = cfg({cash:20000,gross:4000,approved:350000,early:{oa:80000,raTransfer:0},
    projectAfterAFL:oa=>({oa:oa+35000,raTransfer:0})});
  const cap = discountedPayments(1200,3,300);
  // Price lies in the 3% BSD tier. HDB loan is limited by MSR and mortgage duty/legal
  // are in cash. Reconstruct expected affordability dollar by dollar near the boundary.
  const fees = 500 + Math.ceil(27+21.6+(cap-60000)*.0006)*1.09;
  const expected = Array.from({length:15000},(_,i)=>390000-i).find(price =>
    price+Math.floor(5400+(price-360000)*.03)+fees <= 20000+115000+cap);
  assert.equal(model.maximumPrice(c),expected);
  close(model.purchase(expected,c).loan,cap);
  assert.ok(model.purchase(expected+1,c).shortfall > 0);
});

test('published EHG, CPF age bands, IRAS owner tax and mortgage duty', () => {
  assert.equal(model.enhancedGrant(4000,'single'),10000);
  assert.equal(model.enhancedGrant(4000,'family'),80000);
  assert.equal(model.enhancedGrant(7400,'half'),12500);
  assert.equal(model.enhancedGrant(9001,'family'),0);
  close(model.oaWageRatio(date('1970-08-20'),date('2027-02-01')),.355*.3382,.000001);
  close(model.oaWageRatio(date('1971-08-20'),date('2026-09-01')),.37*.4055,.000001);
  close(model.oaWageRatio(date('1971-08-20'),date('2026-10-01')),.34*.353,.000001);
  close(model.ownerTax(36000),960);
  close(model.ownerTax(84000),5480);
  assert.equal(model.mortgageDuty(100299),401);
  assert.equal(model.mortgageDuty(250000),500);
});
