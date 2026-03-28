# StockSense AI — Demand Forecasting Model Report

## 1. Objective
The objective of this module is to predict the "Predicted Exhaustion Date" of inventory stock utilizing historical usage data. This serves as an early-warning system for the procurement team to reorder items prior to running out.

## 2. Algorithm Choice
We implemented a **Custom Linear Regression** algorithm natively in Node.js, fulfilling the Master's project requirement to avoid external APIs. Given the linear constraint of stock depletion over short-to-medium time horizons, Linear Regression provides an effective, mathematically sound trend line to forecast consumption.

## 3. Data Preprocessing
The model ingests a `usageHistory` array containing pairs of `{ date, quantity }`. 
Before fitting the model, the data undergoes several transformations:
1. The history is sorted chronologically descending to ascending.
2. The earliest date ($t_0$) is normalized to Day $0$. All subsequent time steps ($X_i$) are calculated as day offsets from $t_0$.
3. Usage quantities are aggregated into a cumulative sum ($Y_i$) to map total consumption over time.

## 4. Mathematical Model
Let $X$ represent time in days, and $Y$ represent the cumulative usage.
The slope $m$ (target: average daily usage) is computed using the Ordinary Least Squares (OLS) formula:

$$m = \frac{n(\sum XY) - (\sum X)(\sum Y)}{n(\sum X^2) - (\sum X)^2}$$

If $m > 0$, the inventory is actively being depleted on average. 

## 5. Prediction Logic
To forecast the exact exhaustion date:
1. Calculates theoretical days remaining using the present inventory levels: 
   `Days Until Exhaustion = Current Stock / m`
2. Interpolates the exact timestamp by extending the projection matrix:
   `Predicted Date = Current Date + Days Until Exhaustion`

## 6. Edge Cases Handled
- **Insufficient Data Bounds**: If fewer than two temporal data points exist, the model confidently returns `null` to avoid dividing by zero or assuming a flat trend based on a single point.
- **Zero or Negative Slope**: If the calculated slope $m \le 0$, indicating no net usage or a mathematical anomaly, the system returns `null` under the assumption stock is not depleting.

## 7. Performance and Computational Complexity
The algorithm processes the array linearly, resulting in an $O(N)$ time complexity where $N$ is the number of historical usage points. Factoring in the initial sorting bound of $O(N \log N)$, the model operates virtually instantaneously on modern Node.js event loops, verified automatically through Jest test suites mapped within `/server/tests/forecast.test.js`.
