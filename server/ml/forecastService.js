/**
 * Custom Linear Regression logic to calculate Predicted Exhaustion Date
 * based on usageHistory.
 *
 * @param {Array} usageHistory - Array of objects: { date: Date, quantity: Number }
 * @param {Number} currentStock - The current stock quantity
 * @returns {Object|null} Prediction object containing predictedExhaustionDate and averageDailyUsage
 */
export const calculateExhaustionDate = (usageHistory, currentStock) => {
  if (!usageHistory || usageHistory.length === 0) {
    // Need at least 1 data point to show any predictions
    return null;
  }

  // Sort history by date ascending
  const sortedHistory = [...usageHistory].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const startDate = new Date(sortedHistory[0].date).getTime();
  const msInDay = 1000 * 60 * 60 * 24;

  let cumulativeUsage = 0;
  const dataPoints = sortedHistory.map((entry) => {
    cumulativeUsage += entry.quantity;
    const daysSinceStart = (new Date(entry.date).getTime() - startDate) / msInDay;
    return { x: daysSinceStart, y: cumulativeUsage };
  });

  // Calculate linear regression terms
  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (const point of dataPoints) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const denominator = (n * sumXX) - (sumX * sumX);
  
  if (denominator === 0) {
    // Fallback: If only 1 entry exists or multiple entries happened on the exact same day,
    // we take the total usage and assume a very simple 1-day running slope to instantly fuel the UI graphs
    const totalUsage = usageHistory.reduce((sum, entry) => sum + entry.quantity, 0);
    if (totalUsage <= 0) return null;
    
    const mFallback = totalUsage;
    const predictionDateFallback = new Date();
    predictionDateFallback.setTime(predictionDateFallback.getTime() + ((currentStock / mFallback) * msInDay));
    
    return {
      predictedExhaustionDate: predictionDateFallback,
      averageDailyUsage: mFallback
    };
  }

  // m represents the average usage per day (slope)
  const m = ((n * sumXY) - (sumX * sumY)) / denominator;

  if (m <= 0) {
    // Usage is not positive, so it won't deplete
    return null;
  }

  // Days until exhaustion = current stock / units used per day
  const daysUntilExhaustion = currentStock / m;

  // Assuming currentStock is as of "now", so we add days to "now"
  const predictionDate = new Date();
  predictionDate.setTime(predictionDate.getTime() + (daysUntilExhaustion * msInDay));

  return {
    predictedExhaustionDate: predictionDate,
    averageDailyUsage: m
  };
};
