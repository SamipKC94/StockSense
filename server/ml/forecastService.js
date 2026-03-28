/**
 * Custom Linear Regression forecast to calculate Predicted Exhaustion Date.
 *
 * Strategy:
 *  - 2+ entries on different days → full OLS linear regression (slope = avg daily usage)
 *  - 1 entry OR all entries on same day → simple average: total_used / days_elapsed (min 1 day)
 *
 * @param {Array}  usageHistory  - [{ date: Date, quantity: Number }, ...]
 * @param {Number} currentStock  - Current remaining stock
 * @returns {{ predictedExhaustionDate: Date, averageDailyUsage: Number } | null}
 */
export const calculateExhaustionDate = (usageHistory, currentStock) => {
  if (!usageHistory || usageHistory.length === 0) return null;
  if (currentStock <= 0) return null;

  const msInDay = 1000 * 60 * 60 * 24;

  // Sort ascending by date
  const sorted = [...usageHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

  const firstDate = new Date(sorted[0].date).getTime();
  const lastDate  = new Date(sorted[sorted.length - 1].date).getTime();
  const totalDaysSpan = (lastDate - firstDate) / msInDay; // 0 if same-day / single entry

  const totalUsed = sorted.reduce((s, e) => s + e.quantity, 0);

  let avgDailyUsage;

  if (totalDaysSpan < 1) {
    // Fallback for single entry or same-day entries:
    // Treat total used as "consumed over 1 day" → a realistic daily rate
    avgDailyUsage = totalUsed / 1;
  } else {
    // ── OLS Linear Regression ──────────────────────────────────
    // Build cumulative usage data points: x = days since first entry, y = cumulative qty used
    let cumulative = 0;
    const points = sorted.map((entry) => {
      cumulative += entry.quantity;
      const x = (new Date(entry.date).getTime() - firstDate) / msInDay;
      return { x, y: cumulative };
    });

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of points) {
      sumX  += p.x;
      sumY  += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }

    const denom = (n * sumXX) - (sumX * sumX);
    if (denom === 0) {
      // All x values identical — fall back to simple rate
      avgDailyUsage = totalUsed / Math.max(totalDaysSpan, 1);
    } else {
      const slope = ((n * sumXY) - (sumX * sumY)) / denom;
      avgDailyUsage = slope > 0 ? slope : totalUsed / Math.max(totalDaysSpan, 1);
    }
  }

  if (avgDailyUsage <= 0) return null;

  const daysUntilEmpty = currentStock / avgDailyUsage;
  const exhaustionDate = new Date(Date.now() + daysUntilEmpty * msInDay);

  return {
    predictedExhaustionDate: exhaustionDate,
    averageDailyUsage: avgDailyUsage,
  };
};
