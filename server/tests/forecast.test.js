import { calculateExhaustionDate } from '../ml/forecastService.js';

describe('Custom Linear Regression for Demand Forecasting', () => {
  it('returns null if there is less than two usage history points', () => {
    const result = calculateExhaustionDate([{ date: new Date(), quantity: 10 }], 100);
    expect(result).toBeNull();
  });

  it('calculates the exhaustion date correctly based on linear usage trend', () => {
    // Let's create a predictable trend: 10 units consumed per day.
    const today = new Date();
    const dayMgmt = 1000 * 60 * 60 * 24;

    const history = [
      { date: new Date(today.getTime() - (5 * dayMgmt)), quantity: 10 }, // 5 days ago, used 10
      { date: new Date(today.getTime() - (4 * dayMgmt)), quantity: 10 }, // 4 days ago, used 10
      { date: new Date(today.getTime() - (3 * dayMgmt)), quantity: 10 }, // 3 days ago, used 10
    ];

    const currentStock = 30; // 30 units left. We use 10 per day. Should exhaust in 3 days.

    const result = calculateExhaustionDate(history, currentStock);

    expect(result).not.toBeNull();
    // Slope should be exactly 10 units per day.
    expect(result.averageDailyUsage).toBeCloseTo(10, 1);

    // Predict Exhaustion Date should be roughly 3 days from now
    const predictedVsActualDiffMs = result.predictedExhaustionDate.getTime() - (today.getTime() + (3 * dayMgmt));
    expect(Math.abs(predictedVsActualDiffMs)).toBeLessThan(1000 * 60); // under 1 min delta due to execution time diffs
  });
});
