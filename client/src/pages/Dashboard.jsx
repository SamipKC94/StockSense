import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Package, Plus, LogOut, TrendingDown, X, Trash2, Edit, Minus } from 'lucide-react';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingUsage, setIsLoggingUsage] = useState(false);
  const [usageTarget, setUsageTarget] = useState(null); // which product we're logging for
  const [usageData, setUsageData] = useState({ quantity: '', note: '' });
  const [editProduct, setEditProduct] = useState({});
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', currentStock: 0, minimumThreshold: 0, unit: 'units'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) { navigate('/login'); return; }
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

    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socket.on('inventoryUpdate', (event) => {
      if (event.action === 'create' || event.action === 'update') {
        setProducts((prev) => {
          const exists = prev.find((p) => p._id === event.product._id);
          if (exists) return prev.map((p) => p._id === event.product._id ? event.product : p);
          return [event.product, ...prev];
        });
        setSelectedProduct((prev) => prev?._id === event.product._id ? event.product : prev);
      } else if (event.action === 'delete') {
        setProducts((prev) => prev.filter((p) => p._id !== event.id));
        setSelectedProduct((prev) => prev?._id === event.id ? null : prev);
      }
    });
    return () => socket.disconnect();
  }, [navigate]);

  const getToken = () => JSON.parse(localStorage.getItem('userInfo')).token;

  const handleLogout = () => { localStorage.removeItem('userInfo'); navigate('/login'); };

  const openLogUsage = (e, product) => {
    e.stopPropagation(); // don't also select the card
    setUsageTarget(product);
    setUsageData({ quantity: '', note: '' });
    setIsLoggingUsage(true);
  };

  const submitUsage = async (e) => {
    e.preventDefault();
    try {
      const newStock = usageTarget.currentStock - Number(usageData.quantity);
      await axios.put(`/api/products/${usageTarget._id}`,
        { currentStock: newStock, usageNote: usageData.note },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setIsLoggingUsage(false);
      setUsageTarget(null);
    } catch (err) { console.error('Failed to log usage', err); }
  };

  const submitNewProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/products', newProduct, { headers: { Authorization: `Bearer ${getToken()}` } });
      setIsAdding(false);
      setNewProduct({ name: '', sku: '', currentStock: 0, minimumThreshold: 0, unit: 'units' });
    } catch (err) { console.error('Failed to create product', err); }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/products/${selectedProduct._id}`, editProduct, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setIsEditing(false);
    } catch (err) { console.error('Failed to edit product', err); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this product and all its AI data?')) return;
    try {
      await axios.delete(`/api/products/${selectedProduct._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch (err) { console.error('Failed to delete', err); }
  };

  const getChartData = (product) => {
    if (!product?.usageHistory?.length) return [];
    const total = product.usageHistory.reduce((s, u) => s + u.quantity, 0);
    let rolling = product.currentStock + total;
    const sorted = [...product.usageHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const data = [{ date: new Date(sorted[0].date).toLocaleDateString(), StockLevel: rolling }];
    sorted.forEach(u => { rolling -= u.quantity; data.push({ date: new Date(u.date).toLocaleDateString(), StockLevel: rolling }); });
    return data;
  };

  const inputCls = "w-full bg-slate-900 border border-slate-700 focus:border-primary-500 focus:outline-none rounded-lg p-3 text-slate-200 transition-colors";

  return (
    <div className="min-h-screen bg-dark-bg p-6 relative">
      {/* Navbar */}
      <nav className="flex justify-between items-center mb-8 bg-dark-surface/50 p-4 rounded-xl border border-dark-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 text-primary-500 rounded-lg"><Package size={24} /></div>
          <h1 className="text-2xl font-bold text-slate-100">StockSense Dashboard</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors">
          <LogOut size={20} /> Logout
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Inventory List ── */}
        <div className="lg:col-span-1 glass rounded-2xl p-5 h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-slate-100">Inventory</h2>
            <button onClick={() => setIsAdding(true)} className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors" title="Add product">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {products.length === 0 && (
              <p className="text-slate-500 text-center mt-10 text-sm">No products yet. Click + to add one.</p>
            )}
            {products.map((product) => (
              <div
                key={product._id}
                onClick={() => setSelectedProduct(product)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedProduct?._id === product._id
                    ? 'bg-primary-500/10 border-primary-500/50'
                    : 'bg-dark-bg/50 border-dark-border hover:border-primary-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">{product.name}</h3>
                    <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    product.currentStock <= product.minimumThreshold
                      ? 'text-red-400 border-red-500/40 bg-red-500/10'
                      : 'text-primary-400 border-primary-500/30 bg-primary-500/10'
                  }`}>
                    {product.currentStock} {product.unit}
                  </span>
                </div>

                {/* ── LOG USAGE button — always visible ── */}
                <button
                  onClick={(e) => openLogUsage(e, product)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 transition-colors"
                >
                  <Minus size={13} /> Log Usage
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Analytics Panel ── */}
        <div className="lg:col-span-2 space-y-5">
          {selectedProduct ? (
            <>
              {/* Product Header */}
              <div className="flex justify-between items-center glass p-4 rounded-2xl bg-dark-bg/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">{selectedProduct.name}</h2>
                  <p className="text-sm text-slate-400">SKU: {selectedProduct.sku} · {selectedProduct.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditProduct(selectedProduct); setIsEditing(true); }}
                    className="p-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors" title="Edit">
                    <Edit size={17} />
                  </button>
                  <button onClick={handleDelete}
                    className="p-2 border border-red-900/30 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass p-5 rounded-2xl">
                  <p className="text-slate-400 text-xs mb-1">Current Stock</p>
                  <p className="text-3xl font-bold text-slate-100">{selectedProduct.currentStock}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedProduct.unit}</p>
                </div>
                <div className="glass p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute right-[-10%] bottom-[-10%] opacity-10"><TrendingDown size={90} className="text-blue-500" /></div>
                  <p className="text-slate-400 text-xs mb-1">Avg Daily Usage</p>
                  <p className="text-3xl font-bold text-blue-400">{selectedProduct.averageDailyUsage?.toFixed(2) || '—'}</p>
                  <p className="text-xs text-slate-500 mt-1">per day</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-orange-500/20">
                  <p className="text-slate-400 text-xs mb-1">Predicted Exhaustion</p>
                  <p className={`text-lg font-bold mt-2 ${selectedProduct.predictedExhaustionDate ? 'text-orange-400' : 'text-slate-500'}`}>
                    {selectedProduct.predictedExhaustionDate
                      ? new Date(selectedProduct.predictedExhaustionDate).toLocaleDateString()
                      : 'Log usage to predict'}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="glass p-6 rounded-2xl h-[380px]">
                <h3 className="text-base font-semibold mb-5 flex items-center gap-2 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-primary-500 inline-block"></span>
                  Stock Trajectory & Demand Forecast
                </h3>
                {selectedProduct.usageHistory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="88%">
                    <LineChart data={getChartData(selectedProduct)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ color: '#22c55e' }} />
                      <Legend />
                      <ReferenceLine y={selectedProduct.minimumThreshold} label={{ value: 'Min', fill: '#ef4444', fontSize: 11 }} stroke="#ef4444" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="StockLevel" stroke="#22c55e" strokeWidth={3} activeDot={{ r: 6 }} name="Stock Level" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                    <p className="text-sm">No usage data yet.</p>
                    <button onClick={(e) => openLogUsage(e, selectedProduct)}
                      className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-medium transition-colors">
                      Log First Usage
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-[80vh] flex flex-col items-center justify-center glass rounded-2xl text-slate-500 gap-2">
              <Package size={40} className="opacity-30" />
              <p className="text-sm">Select a product to view analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Log Usage Modal ── */}
      {isLoggingUsage && usageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-surface border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-orange-400">Log Usage</h3>
              <button onClick={() => setIsLoggingUsage(false)} className="text-slate-400 hover:text-red-400"><X size={20} /></button>
            </div>
            <p className="text-slate-400 text-xs mb-5">
              {usageTarget.name} · current stock: <span className="text-slate-200 font-semibold">{usageTarget.currentStock} {usageTarget.unit}</span>
            </p>
            <form onSubmit={submitUsage} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Quantity Used <span className="text-red-400">*</span></label>
                <input
                  type="number" required min="1" max={usageTarget.currentStock}
                  value={usageData.quantity}
                  onChange={(e) => setUsageData({ ...usageData, quantity: e.target.value })}
                  className={inputCls}
                  placeholder={`1 – ${usageTarget.currentStock}`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Note <span className="text-slate-500">(optional)</span></label>
                <input
                  type="text" value={usageData.note}
                  onChange={(e) => setUsageData({ ...usageData, note: e.target.value })}
                  className={inputCls} placeholder="e.g. Used in Job #34"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors">
                Submit Deduction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Product Modal ── */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-surface border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-100">Add New Product</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-red-400"><X size={20} /></button>
            </div>
            <form onSubmit={submitNewProduct} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Product Name</label>
                <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className={inputCls} placeholder="e.g. Copper Wire" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">SKU</label>
                <input type="text" required value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className={inputCls} placeholder="CW-1000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Initial Stock</label>
                  <input type="number" required value={newProduct.currentStock} onChange={(e) => setNewProduct({ ...newProduct, currentStock: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Min Threshold</label>
                  <input type="number" required value={newProduct.minimumThreshold} onChange={(e) => setNewProduct({ ...newProduct, minimumThreshold: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Unit</label>
                <input type="text" required value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} className={inputCls} placeholder="kg / liters / units" />
              </div>
              <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold transition-colors">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Product Modal ── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-surface border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-blue-400">Edit Product</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-400"><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Product Name</label>
                <input type="text" required value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">SKU</label>
                <input type="text" required value={editProduct.sku || ''} onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Current Stock</label>
                  <input type="number" required value={editProduct.currentStock ?? 0} onChange={(e) => setEditProduct({ ...editProduct, currentStock: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Min Threshold</label>
                  <input type="number" required value={editProduct.minimumThreshold ?? 0} onChange={(e) => setEditProduct({ ...editProduct, minimumThreshold: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Unit</label>
                <input type="text" required value={editProduct.unit || ''} onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })} className={inputCls} />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
