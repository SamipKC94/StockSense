import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Package, Plus, LogOut, TrendingDown } from 'lucide-react';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      navigate('/login');
      return;
    }

    const token = JSON.parse(userInfo).token;

    const fetchProducts = async () => {
      try {
        const { data } = await axios.get('/api/products', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch products', err);
      }
    };

    fetchProducts();

    // Setup Socket.IO
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socket.on('inventoryUpdate', (event) => {
      if (event.action === 'create' || event.action === 'update') {
        setProducts((prev) => {
          const exists = prev.find((p) => p._id === event.product._id);
          if (exists) {
            return prev.map((p) => (p._id === event.product._id ? event.product : p));
          }
          return [event.product, ...prev];
        });
        
        // Update selected product reference if it's currently open
        if (selectedProduct && selectedProduct._id === event.product._id) {
           setSelectedProduct(event.product);
        }
      } else if (event.action === 'delete') {
        setProducts((prev) => prev.filter((p) => p._id !== event.id));
        if (selectedProduct && selectedProduct._id === event.id) {
           setSelectedProduct(null);
        }
      }
    });

    return () => socket.disconnect();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const getChartData = (product) => {
    if (!product || !product.usageHistory || product.usageHistory.length === 0) return [];

    let cumStock = product.currentStock + product.usageHistory.reduce((sum, u) => sum + u.quantity, 0);
    
    // Sort array descending (most recent first), then reverse to ascending chronological order for chart
    const chronologicalHistory = [...product.usageHistory].sort((a,b) => new Date(a.date) - new Date(b.date));

    let chartData = [];
    let rollingStock = cumStock;
    
    // Starting point 
    if (chronologicalHistory.length > 0) {
      chartData.push({
         date: new Date(chronologicalHistory[0].date).toLocaleDateString(),
         StockLevel: rollingStock
      });
    }

    // Deduct stock historically to map out the decline
    chronologicalHistory.forEach(usage => {
       rollingStock -= usage.quantity;
       chartData.push({
          date: new Date(usage.date).toLocaleDateString(),
          StockLevel: rollingStock
       });
    });

    return chartData;
  };

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <nav className="flex justify-between items-center mb-8 bg-dark-surface/50 p-4 rounded-xl border border-dark-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 text-primary-500 rounded-lg">
            <Package size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">StockSense Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory List */}
        <div className="lg:col-span-1 glass rounded-2xl p-6 h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Inventory</h2>
            <button className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product._id}
                onClick={() => setSelectedProduct(product)}
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedProduct?._id === product._id
                    ? 'bg-primary-500/10 border-primary-500/50'
                    : 'bg-dark-bg/50 border-dark-border hover:border-primary-500/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-200">{product.name}</h3>
                    <p className="text-sm text-slate-400">SKU: {product.sku}</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium bg-dark-surface ${
                      product.currentStock <= product.minimumThreshold
                        ? 'text-red-400 border border-red-500/30'
                        : 'text-primary-400 border border-primary-500/30'
                    }`}
                  >
                    {product.currentStock} {product.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics & ML Prediction */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProduct ? (
            <>
              {/* Product Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-6 rounded-2xl">
                  <p className="text-slate-400 text-sm mb-1">Current Stock</p>
                  <p className="text-3xl font-bold text-slate-100">
                    {selectedProduct.currentStock}
                  </p>
                </div>
                <div className="glass p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute right-[-10%] bottom-[-10%] opacity-10">
                    <TrendingDown size={100} className="text-blue-500" />
                  </div>
                  <p className="text-slate-400 text-sm mb-1">Daily Usage (Avg)</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {selectedProduct.averageDailyUsage?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="glass p-6 rounded-2xl bg-gradient-to-br border border-orange-500/20">
                  <p className="text-slate-400 text-sm mb-1">Predicted Exhaustion</p>
                  <p className="text-xl font-bold text-orange-400 mt-2">
                    {selectedProduct.predictedExhaustionDate
                      ? new Date(selectedProduct.predictedExhaustionDate).toLocaleDateString()
                      : 'Insufficient Data'}
                  </p>
                </div>
              </div>

              {/* Linear Regression Chart */}
              <div className="glass p-6 rounded-2xl h-[400px]">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  Demand Forecast & Stock Trajectory
                </h3>
                {selectedProduct.usageHistory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={getChartData(selectedProduct)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#22c55e' }}
                      />
                      <Legend />
                      <ReferenceLine
                        y={selectedProduct.minimumThreshold}
                        label="Min Threshold"
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="StockLevel"
                        stroke="#22c55e"
                        strokeWidth={3}
                        activeDot={{ r: 8 }}
                        name="Stock Level"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    No historical usage data to plot.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center glass rounded-2xl text-slate-400">
              Select a product from the inventory to view AI analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
