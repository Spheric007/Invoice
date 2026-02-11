
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Transaction, PendingItem, ActivityLog, Invoice, NavigationParams, InvoiceItem } from '../types';
import { db } from '../services/db';
import { formatDisplayDate } from '../utils/helpers';

interface CustomerDetailsProps {
  customerName: string | null;
  navigateTo: (view: View, params?: NavigationParams) => void;
  refresh: () => void;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customerName, navigateTo, refresh }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({ description: '', amount: 0, type: 'Deposit', date: new Date().toISOString().slice(0, 10) });
  const [newPending, setNewPending] = useState<Partial<PendingItem>>({ description: '', qty: 1, rate: 0, total: 0 });

  const loadAllData = useCallback(async () => {
    if (!customerName) return;
    setLoading(true);
    try {
      const allInvoices = await db.getInvoices();
      const filteredInvoices = allInvoices.filter(i => i.client_name.toLowerCase().trim() === customerName.toLowerCase().trim());
      
      const [trans, pendings, logs] = await Promise.all([
        db.getTransactions(customerName),
        db.getPendingItems(customerName),
        db.getActivityLog(customerName)
      ]);

      setInvoices(filteredInvoices);
      setTransactions(trans);
      setPendingItems(pendings);
      setActivityLogs(logs);
    } catch (err) {
      console.error("Error loading customer details:", err);
    } finally {
      setLoading(false);
    }
  }, [customerName]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const outstandingDue = useMemo(() => {
    const invDue = invoices.reduce((sum, inv) => sum + (Number(inv.due) || 0), 0);
    const transBalance = transactions.reduce((sum, t) => {
      if (t.type === 'Deposit') return sum - (Number(t.amount) || 0);
      return sum + (Number(t.amount) || 0);
    }, 0);
    return invDue + transBalance;
  }, [invoices, transactions]);

  // Logic to extract last 5 unique items from previous invoices
  const lastFiveItems = useMemo(() => {
    const items: { details: string; rate: number; date: string }[] = [];
    const seen = new Set();
    
    // Sort invoices by date desc
    const sortedInvs = [...invoices].sort((a, b) => new Date(b.memo_date).getTime() - new Date(a.memo_date).getTime());
    
    for (const inv of sortedInvs) {
      if (items.length >= 5) break;
      for (const item of inv.items) {
        if (items.length >= 5) break;
        const key = `${item.details.trim().toLowerCase()}_${item.rate}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ details: item.details, rate: item.rate, date: inv.memo_date });
        }
      }
    }
    return items;
  }, [invoices]);

  const handleAddTransaction = async () => {
    if (!newTrans.description || !newTrans.amount) return alert("Description and Amount required");
    try {
      await db.addTransaction({ ...newTrans, customer_name: customerName!, date: newTrans.date! } as Transaction);
      await db.logActivity({
         customer_name: customerName!,
         date: newTrans.date!,
         type: 'Manual Transaction',
         description: `${newTrans.type}: ${newTrans.description}`,
         amount: newTrans.amount || 0
      });
      setNewTrans({ description: '', amount: 0, type: 'Deposit', date: new Date().toISOString().slice(0, 10) });
      loadAllData();
    } catch (err) {
      alert("Failed to add transaction");
    }
  };

  const handleAddPending = async () => {
    if (!newPending.description || !newPending.total) return alert("Description and Total required");
    try {
      await db.addPendingItem({ ...newPending, customer_name: customerName! } as PendingItem);
      setNewPending({ description: '', qty: 1, rate: 0, total: 0 });
      loadAllData();
    } catch (err) {
      alert("Failed to add pending item");
    }
  };

  const handleDeletePending = async (id: string | number) => {
    if (window.confirm("Delete this pending item?")) {
      try {
        await db.deletePendingItem(id);
        loadAllData();
      } catch (err) {
        alert("Failed to delete item");
      }
    }
  };

  // One-click add to invoice function
  const addToInvoice = (item: Partial<InvoiceItem>) => {
    navigateTo(View.CreateInvoice, { 
      customerName: customerName!, 
      initialItems: [{
        details: item.details,
        qty: item.qty || 1,
        rate: item.rate,
        total: (item.qty || 1) * (item.rate || 0),
        len: item.len,
        wid: item.wid
      }]
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-black font-bengali tracking-tighter">{customerName}</h1>
          <p className="text-gray-500 mt-1 font-bold uppercase text-[10px] tracking-widest">Customer Profile & Financial Statement</p>
        </div>
        <button onClick={() => navigateTo(View.Customers)} className="bg-white border-2 border-black px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-black hover:text-white transition-all">
          <i className="fas fa-arrow-left mr-2"></i> Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Financials */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-black text-white p-10 rounded-3xl shadow-2xl text-center">
            <h3 className="text-[10px] font-black uppercase tracking-[3px] opacity-70 mb-2">Outstanding Due / বকেয়া</h3>
            <div className="text-5xl font-black tracking-tighter">৳{outstandingDue.toLocaleString()}/-</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center uppercase tracking-tighter">
              <i className="fas fa-money-bill-wave mr-2"></i> Add Transaction
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Description</label>
                <input type="text" className="w-full p-3 rounded-xl border font-bengali font-bold outline-none bg-gray-50" value={newTrans.description} onChange={(e) => setNewTrans({ ...newTrans, description: e.target.value })} placeholder="যেমন- নগদ প্রদান" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Amount</label>
                  <input type="number" className="w-full p-3 rounded-xl border font-black text-lg bg-gray-50" value={newTrans.amount || ''} onChange={(e) => setNewTrans({ ...newTrans, amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Type</label>
                  <select className="w-full p-3 rounded-xl border font-bold bg-gray-50" value={newTrans.type} onChange={(e) => setNewTrans({ ...newTrans, type: e.target.value as any })}>
                    <option value="Deposit">Deposit (জমা)</option>
                    <option value="Due">Due (খরচ)</option>
                  </select>
                </div>
              </div>
              <button onClick={handleAddTransaction} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90">Post Transaction</button>
            </div>
          </div>
        </div>

        {/* Right Column - Work History & Lists */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Previous Items Section */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-black mb-5 flex items-center uppercase tracking-tighter">
              <i className="fas fa-history mr-2 text-gray-500"></i> কাজের বিবরণী (গত ৫টি আইটেম)
            </h3>
            <div className="space-y-3">
              {lastFiveItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase">{formatDisplayDate(item.date)}</span>
                      <span className="font-bengali font-black text-lg">{item.details}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-black text-gray-500">Rate: ৳{item.rate}</span>
                    <button onClick={() => addToInvoice({ details: item.details, rate: item.rate, qty: 1 })} className="bg-green-100 text-green-700 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-green-700 hover:text-white transition-all shadow-sm">
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              ))}
              {lastFiveItems.length === 0 && <p className="text-center p-8 text-gray-400 italic">আগের কোনো কাজের রেকর্ড পাওয়া যায়নি।</p>}
            </div>
          </div>

          {/* Pending Jobs Section */}
          <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-black mb-5 flex items-center uppercase tracking-tighter">
              <i className="fas fa-tasks mr-2"></i> অসমাপ্ত কাজ (Pending Jobs)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <input type="text" placeholder="কাজের নাম..." className="md:col-span-1 p-3 rounded-xl border font-bengali font-bold outline-none" value={newPending.description} onChange={(e) => setNewPending({ ...newPending, description: e.target.value })} />
              <input type="number" placeholder="Qty" className="p-3 rounded-xl border font-bold" value={newPending.qty || ''} onChange={(e) => { const q = Number(e.target.value); setNewPending(p => ({ ...p, qty: q, total: q * (p.rate || 0) })); }} />
              <input type="number" placeholder="Rate" className="p-3 rounded-xl border font-bold" value={newPending.rate || ''} onChange={(e) => { const r = Number(e.target.value); setNewPending(p => ({ ...p, rate: r, total: (p.qty || 1) * r })); }} />
              <button onClick={handleAddPending} className="bg-black text-white p-3 rounded-xl font-black uppercase tracking-widest text-xs">Add Job</button>
            </div>
            
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-bengali font-black text-xl mb-1">{item.description}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty: {item.qty} @ ৳{item.rate}</p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="text-right flex-1 md:flex-none">
                      <div className="text-xl font-black">৳{item.total}</div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => addToInvoice({ details: item.description, rate: item.rate, qty: item.qty })} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-orange-700 hover:text-white transition-all">
                         <i className="fas fa-plus"></i> Add to Invoice
                       </button>
                       <button onClick={() => handleDeletePending(item.id)} className="text-gray-300 hover:text-red-500 p-2">
                         <i className="fas fa-trash-alt"></i>
                       </button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingItems.length === 0 && <div className="text-center p-12 text-gray-400 italic">কোনো পেন্ডিং কাজ নেই।</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
