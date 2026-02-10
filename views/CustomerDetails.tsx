
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Transaction, PendingItem, ActivityLog, Invoice } from '../types';
import { db } from '../services/db';
import { formatDisplayDate } from '../utils/helpers';

interface CustomerDetailsProps {
  customerName: string | null;
  navigateTo: (view: View, params?: any) => void;
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
      alert("Transaction added successfully!");
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
    // Prefix confirm with window. for safety and consistency with other views
    if (window.confirm("Delete this pending item?")) {
      try {
        await db.deletePendingItem(id);
        loadAllData();
      } catch (err) {
        alert("Failed to delete item");
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary font-bengali">{customerName}</h1>
          <p className="text-lightText mt-1">Customer Profile & Financial Statement</p>
        </div>
        <button 
          onClick={() => navigateTo(View.Customers)}
          className="bg-white border border-border px-5 py-2.5 rounded-lg font-bold flex items-center hover:bg-secondary transition-colors shadow-sm"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Financials */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-danger text-white p-8 rounded-2xl shadow-xl shadow-danger/20 text-center">
            <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Current Outstanding Due</h3>
            <div className="text-4xl font-black">৳{outstandingDue.toLocaleString()}/-</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center">
              <i className="fas fa-money-bill-wave mr-2 text-primary"></i> Add Transaction
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-lightText uppercase mb-1 block">Description</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/10 font-bengali"
                  value={newTrans.description}
                  onChange={(e) => setNewTrans({ ...newTrans, description: e.target.value })}
                  placeholder="e.g., Payment received"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-lightText uppercase mb-1 block">Amount</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-border outline-none"
                    value={newTrans.amount || ''}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-lightText uppercase mb-1 block">Type</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-border outline-none"
                    value={newTrans.type}
                    onChange={(e) => setNewTrans({ ...newTrans, type: e.target.value as any })}
                  >
                    <option value="Deposit">Deposit (Paid)</option>
                    <option value="Due">Due (Cost)</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleAddTransaction}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
              >
                Post Transaction
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center">
              <i className="fas fa-file-invoice mr-2 text-primary"></i> Recent Invoices
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[400px]">
              {invoices.map(inv => (
                <div 
                  key={inv.invoice_no} 
                  className="p-3 border border-border rounded-xl hover:bg-secondary cursor-pointer transition-colors"
                  onClick={() => navigateTo(View.InvoiceView, { invoiceNo: inv.invoice_no })}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-primary text-sm">#{inv.invoice_no}</span>
                    <span className="text-[10px] text-lightText">{formatDisplayDate(inv.memo_date)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Total: ৳{inv.grand_total.toFixed(0)}</span>
                    <span className={`text-xs font-black ${inv.due > 0 ? 'text-danger' : 'text-success'}`}>
                      Due: ৳{inv.due.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-center text-lightText italic text-sm">No invoices found.</p>}
            </div>
          </div>
        </div>

        {/* Right Column - History & Activity */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#f8f9ff] p-6 rounded-2xl border-2 border-dashed border-primary">
            <h3 className="text-lg font-bold mb-4 flex items-center text-primary">
              <i className="fas fa-clock mr-2"></i> Pending Works / কাজের তালিকা
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Description" 
                className="flex-1 min-w-[200px] p-2 rounded-lg border border-border font-bengali outline-none focus:ring-2 focus:ring-primary/20"
                value={newPending.description}
                onChange={(e) => setNewPending({ ...newPending, description: e.target.value })}
              />
              <input 
                type="number" 
                placeholder="Qty" 
                className="w-16 p-2 rounded-lg border border-border outline-none"
                value={newPending.qty || ''}
                onChange={(e) => {
                  const q = Number(e.target.value);
                  setNewPending(p => ({ ...p, qty: q, total: q * (p.rate || 0) }));
                }}
              />
              <input 
                type="number" 
                placeholder="Rate" 
                className="w-20 p-2 rounded-lg border border-border outline-none"
                value={newPending.rate || ''}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setNewPending(p => ({ ...p, rate: r, total: (p.qty || 1) * r }));
                }}
              />
              <input 
                type="number" 
                placeholder="Total" 
                className="w-24 p-2 rounded-lg border border-border bg-gray-50 outline-none"
                value={newPending.total || ''}
                onChange={(e) => setNewPending({ ...newPending, total: Number(e.target.value) })}
              />
              <button 
                onClick={handleAddPending}
                className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
            </div>
            
            <div className="overflow-x-auto shadow-sm rounded-lg border border-border">
              <table className="w-full text-sm border-collapse bg-white overflow-hidden">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-3 text-left">Item Details</th>
                    <th className="p-3 text-center w-20">Qty</th>
                    <th className="p-3 text-right w-32">Amount</th>
                    <th className="p-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingItems.map((item) => (
                    <tr key={item.id} className="font-bengali hover:bg-gray-50 transition-colors">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.qty}</td>
                      <td className="p-3 text-right font-bold">৳{item.total.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button 
                           onClick={() => handleDeletePending(item.id)}
                           className="text-danger hover:scale-110 transition-transform"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingItems.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-lightText italic">No pending items listed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-5 flex items-center">
              <i className="fas fa-history mr-2 text-primary"></i> Transaction History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f9fafb] text-left border-y border-border">
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">{formatDisplayDate(t.date)}</td>
                      <td className="p-3 font-bengali">{t.description}</td>
                      <td className={`p-3 text-right font-bold ${t.type === 'Deposit' ? 'text-success' : 'text-danger'}`}>
                        ৳{t.amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.type === 'Deposit' ? 'bg-success/10 text-success border border-success' : 'bg-danger/10 text-danger border border-danger'}`}>
                          {t.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-lightText">No manual transactions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-5 flex items-center">
              <i className="fas fa-stream mr-2 text-primary"></i> Activity Log
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {activityLogs.map(log => (
                <div key={log.id} className="flex gap-4 p-4 border-l-4 border-primary bg-secondary/20 rounded-r-xl items-start">
                  <div className="text-xs text-lightText font-bold w-20 flex-shrink-0 pt-1">{formatDisplayDate(log.date)}</div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-primary uppercase tracking-widest">{log.type}</div>
                    <div className="text-sm font-medium font-bengali mt-1 text-gray-700 leading-relaxed">{log.description}</div>
                  </div>
                  <div className="text-sm font-black text-right whitespace-nowrap">৳{log.amount.toLocaleString()}</div>
                </div>
              ))}
              {activityLogs.length === 0 && <p className="text-center p-5 text-lightText italic">No activity logs recorded.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
