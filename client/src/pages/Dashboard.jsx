import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Package, Plus, LogOut, TrendingDown, X, Trash2, Edit, Minus, History, Loader2, Calendar } from 'lucide-react';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingUsage, setIsLoggingUsage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usageTarget, setUsageTarget] = useState(null);
  const [usageData, setUsageData] = useState({ quantity: '', note: '' });
  const [editProduct, setEditProduct] = useState({});
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', currentStock: 0, minimumThreshold: 0, unit: 'units', category: 'General'
  });
  const navigate = useNavigate();

  // Determine current host for WebSockets automatically
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) { navigate('/login'); return; }
    const token = JSON.parse(userInfo).token;

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get('/api/products', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(data);
        if (data.length > 0 && !selectedProduct) setSelectedProduct(data[0]);
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
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
    e.stopPropagation();
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
      setNewProduct({ name: '', sku: '', currentStock: 0, minimumThreshold: 0, unit: 'units', category: 'General' });
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
      <nav className="flex justify-between items-center mb-8 bg-dark-surface/50 p-4 rounded-xl border border-dark-border backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 text-primary-500 rounded-lg shadow-lg shadow-primary-500/10"><Package size={24} /></div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">StockSense AI</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-all font-medium">
          <LogOut size={20} /> Logout
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Inventory List ── */}
        <div className="lg:col-span-1 glass rounded-2xl p-5 h-[80vh] overflow-y-auto flex flex-col border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-5 shrink-0">
            <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
               Inventory <span className="text-xs bg-dark-surface px-2 py-0.5 rounded text-slate-500 font-mono">{products.length}</span>
            </h2>
            <button onClick={() => setIsAdding(true)} className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-all shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95" title="Add product">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-12 opacity-50">
                  <Loader2 size={32} className="animate-spin text-primary-500 mb-2" />
                  <p className="text-sm">Fetching products...</p>
               </div>
            ) : products.length === 0 ? (
              <p className="text-slate-500 text-center mt-10 text-sm italic">Inventory is currently empty.</p>
            ) : (
              products.map((product) => (
                <div
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                    selectedProduct?._id === product._id
                      ? 'bg-primary-500/10 border-primary-500/50 shadow-lg shadow-primary-500/5 translate-x-1'
                      : 'bg-dark-bg/50 border-white/5 hover:border-primary-500/30 hover:bg-dark-surface'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="max-w-[70%]">
                      <h3 className="font-semibold text-slate-200 text-sm truncate">{product.name}</h3>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{product.sku}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      product.currentStock <= product.minimumThreshold
                        ? 'text-red-400 border-red-500/40 bg-red-500/10'
                        : 'text-primary-400 border-primary-500/30 bg-primary-500/10'
                    }`}>
                      {product.currentStock} {product.unit}
                    </span>
                  </div>

                  <button
                    onClick={(e) => openLogUsage(e, product)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 transition-all opacity-80 group-hover:opacity-100"
                  >
                    <Minus size={12} /> Log Usage
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Analytics & Logs Panel ── */}
        <div className="lg:col-span-3 h-[80vh] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
          {selectedProduct ? (
            <>
              {/* Product Header */}
              <div className="flex justify-between items-center glass p-5 rounded-2xl bg-dark-bg/50 border border-white/5">
                <div>
                  <h2 className="text-3xl font-bold text-slate-100 tracking-tight">{selectedProduct.name}</h2>
                  <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded uppercase">{selectedProduct.sku}</span>
                    <span className="opacity-20 text-lg">|</span>
                    <span className="text-slate-500">{selectedProduct.category}</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setEditProduct(selectedProduct); setIsEditing(true); }}
                    className="p-2.5 bg-slate-800 hover:bg-primary-600/20 text-blue-400 border border-white/5 rounded-xl transition-all" title="Edit">
                    <Edit size={20} />
                  </button>
                  <button onClick={handleDelete}
                    className="p-2.5 bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-white/5 rounded-xl transition-all" title="Delete">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass p-6 rounded-2xl border border-white/5 relative bg-gradient-to-br from-dark-surface to-dark-bg">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Current Balance</p>
                  <p className="text-4xl font-black text-slate-100">{selectedProduct.currentStock}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedProduct.unit} available</p>
                </div>
                <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden bg-gradient-to-br from-dark-surface to-dark-bg">
                  <div className="absolute right-[-10%] bottom-[-10%] opacity-5"><TrendingDown size={110} className="text-blue-500" /></div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">AI Usage Velocity</p>
                  <p className="text-4xl font-black text-blue-400">{selectedProduct.averageDailyUsage?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedProduct.unit} / day</p>
                </div>
                <div className="glass p-6 rounded-2xl border border-orange-500/10 bg-gradient-to-br from-orange-500/5 to-dark-bg">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Forecasted Depletion</p>
                  {selectedProduct.predictedExhaustionDate ? (
                    <div>
                        <p className="text-2xl font-black text-orange-400 mt-1">{new Date(selectedProduct.predictedExhaustionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-[10px] text-orange-500/60 mt-0.5 flex items-center gap-1 font-mono uppercase">
                          <History size={10} /> Prediction Engine Active
                        </p>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-slate-500 mt-3 italic">Not enough data to predict</p>
                  )}
                </div>
              </div>

              {/* Chart & History Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/5 h-[400px]">
                  <h3 className="text-sm font-bold mb-6 flex items-center gap-2 text-slate-200 uppercase tracking-widest">
                    Trajectory Forecast
                  </h3>
                  {selectedProduct.usageHistory?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={getChartData(selectedProduct)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }} itemStyle={{ color: '#22c55e' }} />
                        <ReferenceLine y={selectedProduct.minimumThreshold} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'BUFF', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                        <Line type="monotone" dataKey="StockLevel" stroke="#3b82f6" strokeWidth={4} activeDot={{ r: 6, strokeWidth: 0 }} name="Level" dot={false} animationDuration={1500} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                      <p className="text-sm italic">Connect a tracking point to begin analysis.</p>
                      <button onClick={(e) => openLogUsage(e, selectedProduct)}
                        className="px-6 py-2 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 border border-primary-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                        Initialize Tracking
                      </button>
                    </div>
                  )}
                </div>

                {/* ── USAGE LOG / ACTIVITY FEED ── */}
                <div className="lg:col-span-1 glass rounded-2xl border border-white/5 flex flex-col h-[400px]">
                  <div className="p-4 border-b border-white/5 bg-white/2 shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <History size={14} className="text-slate-500" /> Activity Log
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {selectedProduct.usageHistory?.length > 0 ? (
                      [...selectedProduct.usageHistory].reverse().map((log, i) => (
                        <div key={i} className="flex gap-3 relative pb-1 border-l border-white/5 pl-4 ml-1">
                           <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-slate-700 border border-dark-bg"></div>
                           <div className="flex-1">
                              <div className="flex justify-between items-start">
                                 <p className="text-sm font-bold text-slate-300">-{log.quantity} <span className="text-[10px] text-slate-500 font-normal uppercase">{selectedProduct.unit}</span></p>
                                 <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1">
                                    <Calendar size={8} /> {new Date(log.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                                 </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 italic">{log.note || 'Manual deduction'}</p>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-center px-4">
                        <p className="text-[10px] uppercase text-slate-600 tracking-widest">No usage history recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[80vh] flex flex-col items-center justify-center glass rounded-2xl text-slate-500 gap-4 border border-white/5">
              <div className="p-12 rounded-full bg-white/5 animate-pulse">
                <Package size={60} className="opacity-20" />
              </div>
              <div className="text-center">
                 <p className="text-lg font-bold text-slate-400">Inventory Management Console</p>
                 <p className="text-sm opacity-50">Please select an asset from the sidebar to initialize intelligence.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {/* Log Usage Modal */}
      {isLoggingUsage && usageTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-sm rounded-[2rem] p-8 shadow-3xl">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-black text-orange-400 uppercase tracking-widest">Log Usage</h3>
              <button onClick={() => setIsLoggingUsage(false)} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <p className="text-slate-400 text-xs mb-8 flex items-center gap-2">
              <span className="opacity-50 font-mono italic">{usageTarget.name}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-slate-300 font-bold">{usageTarget.currentStock} {usageTarget.unit} left</span>
            </p>
            <form onSubmit={submitUsage} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Quantity Used</label>
                <input
                  type="number" required min="1" max={usageTarget.currentStock}
                  value={usageData.quantity}
                  onChange={(e) => setUsageData({ ...usageData, quantity: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Reason / Notes</label>
                <input
                  type="text" value={usageData.note}
                  onChange={(e) => setUsageData({ ...usageData, note: e.target.value })}
                  className={inputCls} placeholder="Internal Project Ref..."
                />
              </div>
              <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98]">
                Deduct Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-3xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-100 uppercase tracking-tight">New Asset</h3>
              <button onClick={() => setIsAdding(false)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={submitNewProduct} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Asset Name</label>
                    <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className={inputCls} placeholder="e.g. Sapphire Substrate" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Universal SKU</label>
                    <input type="text" required value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className={inputCls} placeholder="SS-99XX" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Category</label>
                    <input type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className={inputCls} placeholder="Hardware..." />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Initial Balance</label>
                  <input type="number" required value={newProduct.currentStock} onChange={(e) => setNewProduct({ ...newProduct, currentStock: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Min Threshold</label>
                  <input type="number" required value={newProduct.minimumThreshold} onChange={(e) => setNewProduct({ ...newProduct, minimumThreshold: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Unit Type</label>
                <input type="text" required value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} className={inputCls} placeholder="Units / kg / vials" />
              </div>
              <button type="submit" className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] mt-4">
                Initialize Asset
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-3xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-blue-400 uppercase tracking-tight">Modify Asset</h3>
              <button onClick={() => setIsEditing(false)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Adjusted Name</label>
                <input type="text" required value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Updated Stock</label>
                  <input type="number" required value={editProduct.currentStock ?? 0} onChange={(e) => setEditProduct({ ...editProduct, currentStock: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Critical Threshold</label>
                  <input type="number" required value={editProduct.minimumThreshold ?? 0} onChange={(e) => setEditProduct({ ...editProduct, minimumThreshold: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] mt-4">
                Commit Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
