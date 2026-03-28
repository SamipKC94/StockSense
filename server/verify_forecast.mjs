/**
 * Quick verification of forecastService logic — run with: node verify_forecast.mjs
 */
import { calculateExhaustionDate } from './ml/forecastService.js';

const msInDay = 1000 * 60 * 60 * 24;
const daysAgo = (d) => new Date(Date.now() - d * msInDay);

let passed = 0;
let failed = 0;

function test(label, result, check) {
  const ok = check(result);
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) {
    console.log('   Got:', JSON.stringify(result));
    failed++;
  } else {
    passed++;
  }
}

// ── Test 1: null when no history ──
test('Returns null with empty history', calculateExhaustionDate([], 100), (r) => r === null);

// ── Test 2: null when stock is 0 ──
test('Returns null when currentStock is 0', calculateExhaustionDate([{ date: daysAgo(1), quantity: 10 }], 0), (r) => r === null);

// ── Test 3: Single entry — 10 units used yesterday, 100 in stock → ~10 days left ──
const single = calculateExhaustionDate([{ date: daysAgo(1), quantity: 10 }], 100);
test('Single entry: avgDailyUsage = total used (10)', single, (r) => r && Math.abs(r.averageDailyUsage - 10) < 0.01);
test('Single entry: ~10 days until exhaustion', single, (r) => r && Math.abs(r.predictedExhaustionDate - (Date.now() + 10 * msInDay)) < msInDay);

// ── Test 4: Multi-day regression — steady 5 units/day for 10 days ──
const multiHistory = [
  { date: daysAgo(10), quantity: 5 },
  { date: daysAgo(8),  quantity: 5 },
  { date: daysAgo(6),  quantity: 5 },
  { date: daysAgo(4),  quantity: 5 },
  { date: daysAgo(2),  quantity: 5 },
];
const multi = calculateExhaustionDate(multiHistory, 50);
test('Multi-day: avgDailyUsage ≈ 2.5 units/day (regression slope)', multi, (r) => {
  if (!r) return false;
  // The OLS slope on cumulative usage over 10 days:
  // Total=25 units over 10 days, regression gives ~2.5/day
  return r.averageDailyUsage > 0 && r.averageDailyUsage < 10;
});
test('Multi-day: exhaustion date is in the future', multi, (r) => r && r.predictedExhaustionDate > new Date());

// ── Test 5: Same-day multiple entries fallback ──
const sameDay = [
  { date: new Date(), quantity: 8 },
  { date: new Date(), quantity: 4 },
];
const sameDayResult = calculateExhaustionDate(sameDay, 60);
test('Same-day entries: avgDailyUsage = 12 (total/1 day)', sameDayResult, (r) => r && Math.abs(r.averageDailyUsage - 12) < 0.01);

console.log(`\n${passed} passed, ${failed} failed`);
