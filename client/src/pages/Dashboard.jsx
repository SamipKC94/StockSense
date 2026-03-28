import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Package, Plus, LogOut, TrendingDown, X, Trash2, Edit, Minus, History, Loader2, Calendar, LayoutDashboard, ListFilter } from 'lucide-react';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingUsage, setIsLoggingUsage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usageTarget, setUsageTarget] = useState(null);
  const [usageData, setUsageData] = useState({ quantity: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [editProduct, setEditProduct] = useState({});
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', currentStock: 0, minimumThreshold: 0, unit: 'units', category: 'General'
  });
  const navigate = useNavigate();

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

  const globalActivity = useMemo(() => {
    const allLogs = [];
    products.forEach(p => {
       (p.usageHistory || []).forEach(log => {
          allLogs.push({ ...log, productName: p.name, productUnit: p.unit });
       });
    });
    return allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [products]);

  const getToken = () => JSON.parse(localStorage.getItem('userInfo')).token;
  const handleLogout = () => { localStorage.removeItem('userInfo'); navigate('/login'); };

  const openLogUsage = (e, product) => {
    e.stopPropagation();
    setUsageTarget(product);
    setUsageData({ quantity: '', note: '', date: new Date().toISOString().split('T')[0] });
    setIsLoggingUsage(true);
  };

  const submitUsage = async (e) => {
    e.preventDefault();
    try {
      const newStock = usageTarget.currentStock - Number(usageData.quantity);
      await axios.put(`/api/products/${usageTarget._id}`,
        { currentStock: newStock, usageNote: usageData.note, usageDate: usageData.date },
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
    const total = (product.usageHistory || []).reduce((s, u) => s + u.quantity, 0);
    let rolling = product.currentStock + total;
    const sorted = [...product.usageHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const data = [{ date: new Date(sorted[0].date).toLocaleDateString(), StockLevel: rolling }];
    sorted.forEach(u => { rolling -= u.quantity; data.push({ date: new Date(u.date).toLocaleDateString(), StockLevel: rolling }); });
    return data;
  };

  const inputCls = "w-full bg-slate-900 border border-slate-700 focus:border-primary-500 focus:outline-none rounded-lg p-3 text-slate-200 transition-colors";

  return (
    <div className="min-h-screen bg-dark-bg p-4 lg:p-6 relative">
      {/* Navbar */}
      <nav className="flex justify-between items-center mb-6 bg-dark-surface/50 p-4 rounded-xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 text-primary-500 rounded-lg shadow-lg shadow-primary-500/10"><Package size={24} /></div>
          <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 font-outfit uppercase tracking-tighter">StockSense AI</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-all font-medium text-sm">
          <LogOut size={18} /> Logout
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Sidebar: Inventory List ── */}
        <div className="lg:col-span-1 glass rounded-2xl p-5 h-[auto] lg:h-[84vh] flex flex-col border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none font-black text-6xl">STOCK</div>
          <div className="flex justify-between items-center mb-5 shrink-0 z-10">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 uppercase tracking-widest text-xs opacity-60">
               Inventory <span className="text-xs bg-dark-surface px-2 py-0.5 rounded text-primary-500 font-mono">{products.length}</span>
            </h2>
            <button onClick={() => setIsAdding(true)} className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-all shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95" title="Add product">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3 lg:overflow-y-auto pr-1 z-10 custom-scrollbar">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <Loader2 size={32} className="animate-spin text-primary-500 mb-2" />
                  <p className="text-xs font-mono">CALIBRATING...</p>
               </div>
            ) : products.length === 0 ? (
              <p className="text-slate-500 text-center mt-10 text-xs italic">Inventory is currently empty.</p>
            ) : (
              products.map((product) => (
                <div
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group relative overflow-hidden ${
                    selectedProduct?._id === product._id
                      ? 'bg-primary-500/10 border-primary-500/50 shadow-lg shadow-primary-500/5 translate-x-1'
                      : 'bg-dark-bg/50 border-white/5 hover:border-primary-500/30 hover:bg-dark-surface'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="max-w-[70%]">
                      <h3 className="font-bold text-slate-100 text-sm truncate">{product.name}</h3>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">{product.sku}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      product.currentStock <= product.minimumThreshold
                        ? 'text-red-400 border-red-500/40 bg-red-500/10'
                        : 'text-primary-400 border-primary-500/30 bg-primary-500/10 shadow-sm shadow-primary-500/20'
                    }`}>
                      {product.currentStock} {product.unit}
                    </span>
                  </div>

                  <button
                    onClick={(e) => openLogUsage(e, product)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-black bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 transition-all opacity-80 group-hover:opacity-100 uppercase tracking-widest"
                  >
                    <Minus size={12} /> Log Usage
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div className="lg:col-span-3 h-[auto] lg:h-[84vh] overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          {selectedProduct ? (
            <>
              {/* Product Header Card */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center glass p-6 rounded-2xl bg-dark-bg/50 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none font-black text-8xl transition-all group-hover:opacity-[0.04]">{selectedProduct.category}</div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-slate-100 tracking-tight leading-none mb-2">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono tracking-widest bg-dark-bg px-2 py-1 rounded-md border border-white/5 text-slate-400 uppercase">{selectedProduct.sku}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">{selectedProduct.category}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0 relative z-10">
                  <button onClick={() => { setEditProduct(selectedProduct); setIsEditing(true); }}
                    className="p-2.5 bg-slate-800/50 hover:bg-primary-600/20 text-blue-400 border border-white/10 rounded-xl transition-all hover:scale-105" title="Edit">
                    <Edit size={20} />
                  </button>
                  <button onClick={handleDelete}
                    className="p-2.5 bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-white/10 rounded-xl transition-all hover:scale-105" title="Delete">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Advanced Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-dark-surface to-dark-bg shadow-xl">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Inventory Balance</p>
                  <div className="flex items-baseline gap-2">
                     <p className="text-5xl font-black text-slate-100 tracking-tighter">{selectedProduct.currentStock}</p>
                     <p className="text-sm text-slate-500 font-mono uppercase italic">{selectedProduct.unit}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Buffer Alert</span>
                     <span className="text-xs font-mono text-red-500/80">@{selectedProduct.minimumThreshold}</span>
                  </div>
                </div>
                
                <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden bg-gradient-to-br from-dark-surface to-dark-bg shadow-xl group">
                  <div className="absolute right-[-10%] bottom-[-10%] opacity-5 transition-all group-hover:scale-110 group-hover:opacity-10"><TrendingDown size={120} className="text-blue-500" /></div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">AI Daily Velocity</p>
                  <p className="text-5xl font-black text-blue-400 tracking-tighter">{selectedProduct.averageDailyUsage?.toFixed(2) || '0.00'}</p>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                     <span className="text-[10px] text-blue-500/80 uppercase font-black tracking-widest">Active Inference</span>
                  </div>
                </div>

                <div className="glass p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-dark-bg shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-dashed animate-[spin_10s_linear_infinite]"></div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Projected Run-Out</p>
                  {selectedProduct.predictedExhaustionDate ? (
                    <div>
                        <p className="text-3xl font-black text-orange-400 tracking-tight leading-tight">
                           {new Date(selectedProduct.predictedExhaustionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-orange-500/60 mt-4 font-mono uppercase flex items-center gap-1.5">
                           <History size={12} /> Predictive Analytics Online
                        </p>
                    </div>
                  ) : (
                    <p className="text-md font-bold text-slate-500 mt-5 italic">Insufficient training data</p>
                  )}
                </div>
              </div>

              {/* Main Analysis Area: Chart & Global Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual Analytics Section */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="glass p-6 rounded-3xl border border-white/5 h-[400px] shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8 shrink-0 relative z-10">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                         <span className="w-3 h-[2px] bg-primary-500"></span> Stock Exhaustion Trajectory
                       </h3>
                    </div>
                    {selectedProduct.usageHistory?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="80%">
                        <LineChart data={getChartData(selectedProduct)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#475569" tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dx={-10} />
                          <Tooltip 
                             cursor={{ stroke: '#ffffff10', strokeWidth: 1 }}
                             contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', padding: '12px' }} 
                             itemStyle={{ color: '#22c55e', fontSize: '12px', fontWeight: 900 }} 
                             labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                          />
                          <ReferenceLine y={selectedProduct.minimumThreshold} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1} label={{ value: 'BUFFER REACHED', fill: '#ef4444', fontSize: 9, fontWeight: 900, position: 'right' }} />
                          <Line type="monotone" dataKey="StockLevel" stroke="#3b82f6" strokeWidth={5} activeDot={{ r: 8, strokeWidth: 0, fill: '#60a5fa' }} name="QUANTITY" dot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} animationDuration={2000} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 opacity-60">
                        <History size={40} strokeWidth={1} />
                        <p className="text-xs font-black uppercase tracking-widest text-center">No telemetry data available for {selectedProduct.name}</p>
                        <button onClick={(e) => openLogUsage(e, selectedProduct)}
                          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                          Initialize Model
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── GLOBAL ACTIVITY FEED (The "Daily Usage Log") ── */}
                  <div className="glass rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden bg-dark-surface/30">
                    <div className="p-6 border-b border-white/5 bg-white/2 shrink-0 flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-3">
                         <LayoutDashboard size={16} className="text-primary-500" /> Global Activity Feed
                      </h3>
                      <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary-500 transition-colors flex items-center gap-1">
                         <ListFilter size={12} /> Daily Log
                      </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="text-[9px] uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                               <th className="px-5 py-4 font-black">Timestamp</th>
                               <th className="px-5 py-4 font-black">Asset Name</th>
                               <th className="px-5 py-4 font-black">Adjustment</th>
                               <th className="px-5 py-4 font-black">Status / Note</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/[0.03]">
                            {globalActivity.length > 0 ? (
                               globalActivity.slice(0, 20).map((log, i) => (
                                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                     <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                           <span className="text-xs font-black text-slate-300">{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                           <span className="text-[9px] font-mono text-slate-500 uppercase">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                     </td>
                                     <td className="px-5 py-4">
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-primary-400 transition-colors uppercase tracking-tight">{log.productName}</span>
                                     </td>
                                     <td className="px-5 py-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                           <Minus size={10} className="text-red-500" />
                                           <span className="text-xs font-black text-red-500">{log.quantity} <span className="opacity-50 text-[9px]">{log.productUnit}</span></span>
                                        </div>
                                     </td>
                                     <td className="px-5 py-4">
                                        <p className="text-xs text-slate-500 italic truncate max-w-[200px]">{log.note || 'Manual system deduction'}</p>
                                     </td>
                                  </tr>
                               ))
                            ) : (
                               <tr><td colSpan="4" className="py-20 text-center text-[10px] uppercase font-black tracking-widest text-slate-600 italic">No historical movements detected</td></tr>
                            )}
                         </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Per-Product Summary Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                   <div className="glass rounded-3xl border border-white/5 flex flex-col h-full min-h-[400px] bg-dark-surface/20">
                     <div className="p-5 border-b border-white/5 bg-white/2 shrink-0">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-3">
                           <History size={16} className="text-orange-500" /> Asset Journal
                        </h3>
                     </div>
                     <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                        {selectedProduct.usageHistory?.length > 0 ? (
                           [...selectedProduct.usageHistory].reverse().map((log, i) => (
                           <div key={i} className="flex gap-4 relative pb-2 border-l-2 border-slate-800 pl-6 ml-1 transition-all hover:border-orange-500/30">
                              <div className="absolute left-[-6px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-dark-bg transition-all group-hover:bg-orange-500 shadow-sm"></div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-start">
                                    <p className="text-sm font-black text-slate-100 tracking-tight">-{log.quantity} {selectedProduct.unit}</p>
                                    <span className="text-[10px] font-black text-slate-500 uppercase font-mono tracking-tighter flex items-center gap-1.5 opacity-60">
                                       <Calendar size={10} /> {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                 </div>
                                 <div className="mt-1.5 p-2 bg-dark-bg/50 rounded-lg border border-white/[0.02]">
                                    <p className="text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed">"{log.note || 'Regular operational usage'}"</p>
                                 </div>
                              </div>
                           </div>
                           ))
                        ) : (
                           <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-50 py-20">
                             <TrendingDown size={30} className="mb-3 text-slate-600" />
                             <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.2em] leading-relaxed">Awaiting initial inventory movement</p>
                           </div>
                        )}
                     </div>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[80vh] flex flex-col items-center justify-center glass rounded-3xl text-slate-500 gap-6 border border-white/5 shadow-2xl bg-dark-surface/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"></div>
              <div className="p-16 rounded-full bg-primary-500/[0.02] border border-primary-500/5 shadow-inner relative group">
                <div className="absolute inset-0 rounded-full border border-primary-500/10 scale-125 opacity-20 group-hover:scale-150 transition-all"></div>
                <Package size={80} className="text-primary-500/20" />
              </div>
              <div className="text-center max-w-sm px-6">
                 <p className="text-xl font-black text-slate-300 uppercase tracking-tighter mb-2">Central Control Array</p>
                 <p className="text-xs font-medium text-slate-500 leading-relaxed uppercase tracking-widest opacity-60">Select an active SKU from the terminal matrix to initialize real-time AI inference.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals: Re-engineered with Ultra-Premium Aesthetics ── */}
      {isLoggingUsage && usageTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_0_100px_-20px_rgba(249,115,22,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-6xl pointer-events-none">LOG</div>
            <div className="flex justify-between items-center mb-1 relative z-10">
              <h3 className="text-2xl font-black text-orange-500 tracking-tighter uppercase">Inventory Out</h3>
              <button onClick={() => setIsLoggingUsage(false)} className="bg-slate-800 hover:bg-red-500/20 hover:text-red-500 p-2 rounded-full text-slate-500 transition-all"><X size={20} /></button>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10 flex items-center gap-2 relative z-10">
              <span className="opacity-50 italic">{usageTarget.name}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-slate-200">{usageTarget.currentStock} {usageTarget.unit} In Stock</span>
            </p>
            <form onSubmit={submitUsage} className="space-y-8 relative z-10">
              <div className="group">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1 transition-all group-focus-within:text-orange-500">Transaction Quantity</label>
                <div className="relative">
                   <input
                     type="number" required min="1" max={usageTarget.currentStock}
                     value={usageData.quantity}
                     onChange={(e) => setUsageData({ ...usageData, quantity: e.target.value })}
                     className="w-full bg-dark-bg/80 border-2 border-white/5 focus:border-orange-500/50 focus:outline-none rounded-2xl p-5 text-2xl font-black text-slate-100 transition-all placeholder:opacity-20 shadow-inner"
                     placeholder="00"
                     autoFocus
                   />
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 uppercase pointer-events-none">{usageTarget.unit}</div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Effectivity Date</label>
                <input
                  type="date"
                  value={usageData.date}
                  onChange={(e) => setUsageData({ ...usageData, date: e.target.value })}
                  className="w-full bg-dark-bg/80 border-2 border-white/5 focus:border-slate-500 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Context / Reference Note</label>
                <input
                  type="text" value={usageData.note}
                  onChange={(e) => setUsageData({ ...usageData, note: e.target.value })}
                  className="w-full bg-dark-bg/80 border-2 border-white/5 focus:border-slate-500 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100 transition-all placeholder:opacity-10" 
                  placeholder="e.g. Project 'Genesis' Batch..."
                />
              </div>
              <button type="submit" className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs transition-all shadow-2xl shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98] mt-4">
                Execute Deduction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal (Streamlined) */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[3rem] p-12 shadow-[0_0_100px_-20px_rgba(34,197,94,0.15)] overflow-hidden relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-center mb-10 relative z-10">
              <h3 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Initialize SKUs</h3>
              <button onClick={() => setIsAdding(false)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-slate-400 transition-all"><X size={22} /></button>
            </div>
            <form onSubmit={submitNewProduct} className="space-y-6 relative z-10 text-left">
              <div className="grid grid-cols-2 gap-5">
                 <div className="col-span-2">
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Asset Nomenclature</label>
                    <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-primary-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold transition-all text-slate-100 placeholder:opacity-30" placeholder="e.g. Industrial Cobalt" />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Matrix SKU</label>
                    <input type="text" required value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-primary-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold transition-all text-slate-100 font-mono" placeholder="IC-2200" />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Class</label>
                    <input type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-primary-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold transition-all text-slate-100" placeholder="Raw Material" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Base Level</label>
                  <input type="number" required value={newProduct.currentStock} onChange={(e) => setNewProduct({ ...newProduct, currentStock: Number(e.target.value) })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-primary-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Crit Threshold</label>
                  <input type="number" required value={newProduct.minimumThreshold} onChange={(e) => setNewProduct({ ...newProduct, minimumThreshold: Number(e.target.value) })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-primary-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-1">Metric Type</label>
                <input type="text" required value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-primary-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100" placeholder="units / kg / liters" />
              </div>
              <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-[1.75rem] font-black uppercase tracking-[0.3em] text-xs transition-all shadow-2xl shadow-primary-600/30 hover:scale-[1.02] active:scale-[0.98] mt-6">
                Initialize SKU
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Polished) */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_0_100px_-20px_rgba(59,130,246,0.15)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-6xl pointer-events-none">EDIT</div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-2xl font-black text-blue-500 tracking-tighter uppercase">Adjust Parameters</h3>
              <button onClick={() => setIsEditing(false)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-slate-500 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 ml-1">Asset Descriptor</label>
                <input type="text" required value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-blue-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 ml-1">Balance</label>
                  <input type="number" required value={editProduct.currentStock ?? 0} onChange={(e) => setEditProduct({ ...editProduct, currentStock: Number(e.target.value) })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-blue-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 ml-1">Threshold</label>
                  <input type="number" required value={editProduct.minimumThreshold ?? 0} onChange={(e) => setEditProduct({ ...editProduct, minimumThreshold: Number(e.target.value) })} className="w-full bg-dark-bg border-2 border-white/5 focus:border-blue-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-slate-100" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs transition-all shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] mt-4">
                Commit Overrides
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
