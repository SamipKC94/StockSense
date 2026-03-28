# StockSense AI — Intelligent Inventory Management

StockSense AI is a full-stack MERN application that combines real-time inventory tracking with **Machine Learning-driven demand forecasting**.

![Dashboard Status](https://img.shields.io/badge/Status-Beta-orange)
![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue)
![Real-time](https://img.shields.io/badge/Real--time-Socket.io-green)

---

## ⚡ Key Features

*   **📈 AI Demand Forecasting**: Custom Linear Regression algorithm that predicts the **exact date** your stock will run out based on historical usage velocity.
*   **🔄 Real-time Sync**: Uses Socket.io to synchronize inventory updates across all connected dashboards instantly.
*   **📊 Dynamic Visualization**: High-performance charts (Recharts) showing stock trajectory and predictive trend lines.
*   **📜 Activity Logging**: Complete historical log of every stock deduction with optional batch notes.
*   **🔐 Secure Auth**: JWT-based authentication with protected API routes and modern glassmorphic login UI.

---

## 🛠 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** (Atlas or Local)
- **Redis** (Optional, for caching layer)

### 2. Environment Configuration
Create a `.env` in the `server/` directory:
```bash
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:3000
```

### 3. Installation
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 4. Data Seeding (Optional)
To see the AI forecasting in action immediately with 60 days of mock history:
```bash
cd server
node seed.js
```

### 5. Run the Application
```bash
# Start backend (from /server)
npm start

# Start frontend (from /client)
npm run dev
```

---

## 🧠 The AI Model
The forecasting engine uses **Ordinary Least Squares (OLS) Linear Regression**. It maps your cumulative usage over time as a function of days elapsed. The slope of this regression line dictates your **Usage Velocity**, which is then applied to your current stock level to project the `predictedExhaustionDate`.

---

## 🤝 Contributing
1. Clone the repo: `https://github.com/SamipKC94/StockSense.git`
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit & Push!
