/* Berlayar Rise BTO planning formulas. Official assessments and limits take precedence. */
'use strict';

const financeModel = (() => {
  const monthIndex = date => date.getFullYear() * 12 + date.getMonth();
  const nextMonth = date => new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
  const dollars = value => Math.round(value * 100) / 100;
  const between = (value, low, high) => Math.min(high, Math.max(low, value));

  function instalment(principal, rate, months) {
    if (principal <= 0 || months <= 0) return 0;
    const monthly = rate / 1200;
    return monthly ? principal * monthly / -Math.expm1(-months * Math.log1p(monthly)) : principal / months;
  }

  function stampDuty(price) {
    if (price <= 0) return 0;
    const widths = [180000, 180000, 640000, 500000, 1500000, Infinity];
    let taxable = price;
    let duty = 0;
    for (const [index, width] of widths.entries()) {
      duty += Math.min(width, taxable) * (index + 1) / 100;
      taxable = Math.max(0, taxable - width);
    }
    return Math.max(1, Math.floor(duty));
  }

  const grantBands = [750,1000,1250,1500,1750,2000,2250,2500,2750,3000,3250,3500,3750,4000,4250,4500];
  const singleGrantAmounts = [60000,55000,52500,47500,45000,40000,35000,32500,27500,25000,20000,15000,12500,10000,5000,2500];

  function enhancedGrant(income, profile) {
    if (profile === 'none' || income <= 0) return 0;
    const index = grantBands.findIndex(limit => income <= limit * (profile === 'single' ? 1 : 2));
    return (singleGrantAmounts[index] ?? 0) * (profile === 'family' ? 2 : 1);
  }

  function ownerTax(annualValue) {
    const tiers = [[12000,0],[28000,.04],[10000,.06],[25000,.10],[10000,.14],[15000,.20],[40000,.26],[Infinity,.32]];
    let remaining = annualValue;
    let tax = 0;
    for (const [width, rate] of tiers) {
      if (remaining <= 0) break;
      const tranche = Math.min(width, remaining);
      tax += tranche * rate;
      remaining -= tranche;
    }
    return tax;
  }

  function oaWageRatio(dob, creditDate) {
    if (!dob) return 1;
    const wageMonth = new Date(creditDate.getFullYear(), creditDate.getMonth() - 1);
    const bands = [35,45,50,55,60,65,70];
    let band = bands.findIndex(age => wageMonth <= new Date(dob.getFullYear() + age, dob.getMonth(), dob.getDate()));
    if (band < 0) band = bands.length;
    const before2027 = wageMonth.getFullYear() <= 2026;
    const rates = before2027 ? [.37,.37,.37,.37,.34,.25,.165,.125] : [.37,.37,.37,.37,.355,.26,.165,.125];
    const allocations = before2027 ? [.6217,.5677,.5136,.4055,.353,.14,.0607,.08] : [.6217,.5677,.5136,.4055,.3382,.1347,.0607,.08];
    return rates[band] * allocations[band];
  }

  function legalFee(amount, minimum = 20) {
    if (!amount) return 0;
    const fee = Math.min(amount, 30000) * .0009
      + between(amount - 30000, 0, 30000) * .00072
      + Math.max(0, amount - 60000) * .0006;
    return dollars(Math.max(minimum, Math.ceil(fee)) * 1.09);
  }

  function mortgageDuty(loan) {
    return loan > 0 ? between(Math.floor(loan / 250), 1, 500) : 0;
  }

  function loanRules(c) {
    const provider = c.shortLease ? 'none' : c.provider;
    const hdb = provider === 'hdb';
    const bank = provider === 'bank';
    const hdbMaxYears = Math.max(0, Math.min(25, 65 - (c.ageAtBooking ?? c.keyAge ?? 40)));
    const months = Math.max(0, Math.min(Math.floor(c.tenure * 12), Math.floor((hdb ? hdbMaxYears : 30) * 12)));
    const bankLowerLimit = bank && (months > 300 || (c.bankAge !== null && c.bankAge + months / 12 > 65));
    const bankTier = between(c.otherMortgages, 0, 2);
    const bankLTV = [[.75, .55], [.45, .25], [.35, .15]][bankTier][Number(bankLowerLimit)];
    const ltv = hdb ? .75 : bank ? bankLTV : 0;
    const minCashRate = bank ? (bankTier > 0 ? .25 : bankLowerLimit ? .10 : .05) : 0;
    const assessment = Math.max(c.rate, c.assessmentRate, bank ? 4 : 3);
    const perDollar = instalment(1, assessment, months);
    const incomeLimit = c.gross === null ? Infinity : Math.max(0, Math.min(c.gross * .30,
      bank ? c.gross * .55 - c.debts : Infinity));
    const serviceCap = months > 0 ? incomeLimit / perDollar : 0;
    const cap = provider === 'none' ? 0 : Math.min(c.approved, serviceCap);
    return {provider, hdb, bank, months, hdbMaxYears, bankLowerLimit, ltv, minCashRate, assessment, cap};
  }

  function project(start, end, opening, c, prior) {
    let oa = opening;
    let accrued = prior?.accrued ?? 0;
    // Withdrawals in the milestone month reduce that month's interest base.
    let eligible = Math.min(oa, Math.max(0, (prior?.eligible ?? oa) - (prior?.withdrawal ?? 0)));
    let transfer = 0;
    let unknown = false;
    const series = [{date: start, oa}];
    const event = c.birth55;
    const apply55 = () => {
      if (c.frs === null || c.sa === null) {
        unknown = true;
        return;
      }
      transfer = Math.min(Math.max(0, oa - c.reserved55), Math.max(0, c.frs - c.sa));
      oa += Math.max(0, c.sa - c.frs) - transfer;
      eligible = Math.max(0, eligible - transfer);
    };
    let cursor = nextMonth(start);
    let previous = start;
    while (cursor <= end) {
      if (event && event > previous && event < cursor) apply55();
      accrued += eligible * c.interest / 1200;
      if (cursor.getMonth() === 0) {
        oa += accrued;
        accrued = 0;
      }
      if (event && +event === +cursor) apply55();
      eligible = oa;
      const growth = c.growth(cursor);
      oa += c.monthly(cursor) + (cursor.getMonth() === 11 ? c.bonus(cursor) * growth : 0);
      if (cursor.getMonth() % 3 === 0) series.push({date: cursor, oa});
      previous = cursor;
      cursor = nextMonth(cursor);
    }
    if (event && event > previous && event <= end) apply55();
    series.push({date: end, oa});
    return {oa, accrued, eligible, series, raTransfer: transfer, raUnknown: unknown};
  }

  function schedule(c, terms) {
    let aflRate = terms.bank ? .20 : .10;
    let cashAtAFL = terms.minCashRate;
    let cashTotal = terms.minCashRate;
    if (c.scheme === 'deferred' && !terms.bank) aflRate = 0;
    if (c.scheme === 'staggered') aflRate = terms.bank ? .10 : .05;
    if (c.scheme === 'deferred-income') {
      aflRate = .025;
      cashAtAFL = terms.bank ? .025 : 0;
      cashTotal = Math.max(cashTotal, cashAtAFL);
    }
    if (c.scheme === 'custom') aflRate = c.customAfl;
    return {aflRate, cashAtAFL, cashTotal};
  }

  function purchase(price, c) {
    const terms = loanRules(c);
    const plan = schedule(c, terms);
    const bookingCash = c.optionFee;
    const dp = Math.min(price, Math.max(bookingCash, price * plan.aflRate));
    const aflPrice = Math.max(0, dp - bookingCash);
    const bsd = stampDuty(price);
    const aflFees = bsd + (c.legalAFL ?? legalFee(price)) + c.additionalDuty;
    const needAFL = aflPrice + aflFees;
    const early = c.early;
    const grant = Math.min(c.grant, price * .95);
    const grantOCS = Math.min(c.ocs, Math.max(0, c.grant - grant));
    const grantAFL = c.grantAt === 'afl' ? grant : 0;
    const grantKey = grant - grantAFL;
    const bankCashAtAFL = Math.min(aflPrice, Math.max(0, plan.cashAtAFL * price - bookingCash));
    const mandatoryCashAtKey = Math.max(0, plan.cashTotal * price - bookingCash - bankCashAtAFL);
    const grantUsedAfl = Math.min(grantAFL, aflPrice - bankCashAtAFL);
    const cpfLimit = c.cpfLimit ?? (c.shortLease ? 0 : terms.bank ? price : Infinity);
    const cpfAflPrice = Math.min(early.oa, cpfLimit, aflPrice - bankCashAtAFL - grantUsedAfl);
    const cpfAflFees = Math.min(Math.max(0, early.oa - cpfAflPrice), aflFees);
    const cpfAFL = grantUsedAfl + cpfAflPrice + cpfAflFees;
    const cashAFL = Math.max(0, needAFL - cpfAFL);
    const oaAfterAFL = Math.max(0, early.oa - cpfAflPrice - cpfAflFees);
    const later = c.projectAfterAFL(oaAfterAFL, cpfAflPrice + cpfAflFees);
    const grantForKeys = grant - grantUsedAfl;
    const balancePrice = Math.max(0, price - dp);
    const grantUsedKey = Math.min(grantForKeys, Math.max(0, balancePrice - mandatoryCashAtKey));
    const beforeKeys = later.oa;
    const reserve = terms.hdb ? Math.min(c.reserve, c.maxReserve) : c.reserve;
    const availableCPF = Math.max(0, beforeKeys - reserve);
    const purchaseAfterGrant = Math.max(0, balancePrice - grantUsedKey - mandatoryCashAtKey);
    const cpfForPrice = Math.min(availableCPF, Math.max(0, cpfLimit - cpfAflPrice));
    const monthlyCPF = c.monthly(nextMonth(c.key));
    let maximumLoan = Math.min(terms.cap, price * terms.ltv, purchaseAfterGrant);
    if (c.fitMonthly && c.net !== null && terms.months > 0) {
      const monthlyCash = Math.max(0, c.net - c.monthlyCosts - c.hps / 12);
      const sustainable = monthlyCash + (cpfAflPrice < cpfLimit ? monthlyCPF : 0);
      maximumLoan = Math.min(maximumLoan, sustainable / instalment(1, c.rate, terms.months));
    }
    const loan = Math.min(maximumLoan, terms.hdb ? Math.max(0, purchaseAfterGrant - cpfForPrice) : Infinity);
    const personalCpfKey = Math.min(cpfForPrice, Math.max(0, purchaseAfterGrant - loan));
    const cpfKey = personalCpfKey + grantUsedKey;
    const cashKeyPrice = Math.max(0, balancePrice - cpfKey - loan);
    const keyFees = c.feesKey + (terms.hdb && loan > 0 ? c.hdbRegistration + legalFee(loan, c.room === '2R' ? 20 : 40) : 0)
      + mortgageDuty(loan);
    const cpfKeyFees = Math.min(Math.max(0, availableCPF - personalCpfKey), keyFees, c.keyCpfFees ?? keyFees);
    const afterKeys = Math.max(0, beforeKeys - personalCpfKey - cpfKeyFees);
    const hdbFees = keyFees - cpfKeyFees + c.ocs - grantOCS;
    const fire = c.fire;
    const levy = c.levy;
    const cashKeyHDB = cashKeyPrice + hdbFees + fire + levy + c.handoverOther;
    const annualHPS = loan > 0 ? c.hps : 0;
    const cashLater = c.setup + annualHPS;
    const cashKey = cashKeyHDB + cashLater;
    const totalCash = bookingCash + cashAFL + cashKey;
    const install = instalment(loan, c.rate, terms.months);
    const testedInstall = instalment(loan, terms.assessment, terms.months);
    const cpfRoom = Math.max(0, cpfLimit - cpfAflPrice - personalCpfKey);
    const monthCash = Math.max(0, install - Math.min(monthlyCPF, cpfRoom));
    const msr = c.gross > 0 ? testedInstall / c.gross : null;
    const tdsr = c.gross > 0 ? (testedInstall + c.debts) / c.gross : null;
    const net = c.net === null ? null : c.net - c.monthlyCosts - monthCash - annualHPS / 12;
    const reserves = [c.cash, c.cash + c.savings * Math.max(0, monthIndex(c.afl) - monthIndex(c.booking)),
      c.cash + c.savings * Math.max(0, monthIndex(c.key) - monthIndex(c.booking))];
    const funding = [bookingCash, bookingCash + cashAFL, totalCash];
    const shortfall = c.cash === null ? null : Math.max(0, ...funding.map((need, i) => need - reserves[i]));
    const cashHeadroom = c.cash === null ? null : reserves[2] - totalCash;
    return {
      price, bookingCash, aflPrice, aflFees, bsd, needAFL, cpfAFL, cashAFL,
      oaEarly: early.oa, oaAfterAFL, beforeKeys, balancePrice, loan, cpfKey, cpfKeyFees,
      cashKey, cashKeyHDB, cashLater, cashKeyPrice, totalCash, install, monthlyCPF, monthCash,
      afterKeys, feesKeys: hdbFees + fire + levy + cashLater + c.handoverOther, grant, grantOCS, dp,
      early, later, booking: c.booking, afl: c.afl, key: c.key, oaDate: c.oaDate,
      raTransfer: early.raTransfer + later.raTransfer, raUnknown: early.raUnknown || later.raUnknown,
      bankCashAtAFL, hdbFees, fire, levy, provider: terms.provider, shortLease: c.shortLease,
      effectiveTenure: terms.months / 12, mortRate: c.rate, grantAFL, grantKey,
      hdbMaxYears: terms.hdbMaxYears, ageAtBooking: c.ageAtBooking, ltvCeiling: terms.ltv,
      bankLowerLimit: terms.bankLowerLimit, cap: terms.cap, cpfAflPrice, grantUsedAfl, grantUsedKey,
      handoverOther: c.handoverOther, annualHPS, mandatoryCashAtKey, msr, tdsr, net, shortfall, cashHeadroom,
      cpfRoom, loanAtLimit: terms.provider !== 'none' && loan >= terms.cap - .01,
    };
  }

  function maximumPrice(c) {
    if (c.cash === null || (loanRules(c).provider !== 'none' && c.gross === null)) return null;
    const budget = {...c, fitMonthly: true};
    function fits(price) {
      const r = purchase(price, budget);
      return r.shortfall < .005 && (r.net === null || r.net >= 0);
    }
    let low = Math.ceil(c.optionFee);
    if (!fits(low)) return 0;
    let high = 1000000;
    while (high < 1e9 && fits(high)) high *= 2;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (fits(mid)) low = mid;
      else high = mid;
    }
    return low;
  }

  function affordability(base, conservative, c) {
    if ((base.shortfall ?? 0) > .005) return 'Insufficient Funds';
    if (base.shortfall === null || (base.provider !== 'none' && c.gross === null)) return 'Inputs needed';
    if ((conservative.shortfall ?? 0) > .005 || (base.msr ?? 0) >= .25 ||
      (base.net ?? Infinity) < 0 || (conservative.net ?? Infinity) < 0 ||
      base.cashHeadroom < Math.max(1000, base.totalCash * .10)) return 'Stretched';
    if ((base.msr ?? 0) <= .20 && base.net !== null && conservative.net !== null &&
      base.net >= c.net * .15 && conservative.net >= c.net * .10) return 'Comfortable';
    return 'Manageable';
  }

  return {instalment, stampDuty, legalFee, mortgageDuty, enhancedGrant, grantBands, singleGrantAmounts, ownerTax, oaWageRatio, project, purchase, maximumPrice, affordability, loanRules};
})();

if (typeof module === 'object' && module.exports) module.exports = financeModel;
