import React, { useState, useEffect, useRef } from 'react';
import { View, Invoice, Customer, InvoiceItem, NavigationParams } from '../types';
import { db } from '../services/db';
import { convertToWords } from '../utils/helpers';

interface CreateInvoiceProps {
  customers: Customer[];
  navigateTo: (view: View, params?: NavigationParams) => void;
  refresh: () => void;
  editInvoiceNo?: string | null;
  initialItems?: Partial<InvoiceItem>[];
  customerNameParam?: string | null;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ customers, navigateTo, refresh, editInvoiceNo, initialItems, customerNameParam }) => {
  const [formData, setFormData] = useState<Partial<Invoice>>({
    invoice_no: '',
    client_name: '',
    client_address: '',
    client_mobile: '',
    memo_date: new Date().toISOString().slice(0, 10),
    grand_total: 0,
    advance: 0,
    due: 0,
    is_paid: false,
    is_walk_in: false,
    in_word: 'Zero Only.',
    items: [{ id: Date.now(), details: '', qty: 0, rate: 0, total: 0, len: '', wid: '' }]
  });

  const [bannerMode, setBannerMode] = useState(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prevDueAmount, setPrevDueAmount] = useState(0);
  const [previousItems, setPreviousItems] = useState<{details: string, len: any, wid: any, qty: number, rate: number, total: number, date: string}[]>([]);
  const [includePreviousDue, setIncludePreviousDue] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInput, setPaymentInput] = useState('');
  const memoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPaymentModal) {
      setPaymentInput(formData.advance?.toString() || '');
    }
  }, [showPaymentModal, formData.advance]);

  useEffect(() => {
    if (editInvoiceNo) {
      loadEditInvoice(editInvoiceNo);
    } else {
      generateInvoiceNo();
      if (customerNameParam) handleCustomerSelect(customerNameParam);
      if (initialItems && initialItems.length > 0) loadInitialItems(initialItems);
    }
  }, [editInvoiceNo, initialItems, customerNameParam]);

  useEffect(() => {
    if (formData.client_name && formData.client_name.trim().length > 0) {
      const timer = setTimeout(() => fetchCustomerStats(formData.client_name!), 300);
      return () => clearTimeout(timer);
    } else {
      setPrevDueAmount(0);
    }
  }, [formData.client_name]);

  const fetchCustomerStats = async (name: string) => {
    try {
      const allInvoices = await db.getInvoices();
      const currentNo = formData.invoice_no;
      const filtered = allInvoices.filter(inv => 
        inv.client_name.toLowerCase().trim() === name.toLowerCase().trim() && 
        inv.invoice_no !== currentNo
      );
      const invoiceDue = filtered.reduce((sum, inv) => sum + (Number(inv.due) || 0), 0);
      const trans = await db.getTransactions(name);
      const transBalance = trans.reduce((sum, t) => t.type === 'Due' ? sum + t.amount : sum - t.amount, 0);
      setPrevDueAmount(invoiceDue + transBalance);

      // Fetch last 8 items from history
      const historyItems: any[] = [];
      const sortedInvoices = [...filtered].sort((a, b) => new Date(b.memo_date).getTime() - new Date(a.memo_date).getTime());
      
      for (const inv of sortedInvoices) {
        if (historyItems.length >= 8) break;
        for (const item of inv.items) {
          if (historyItems.length >= 8) break;
          historyItems.push({
            ...item,
            date: inv.memo_date
          });
        }
      }
      setPreviousItems(historyItems);
    } catch (e) {
      console.error("Stats fetch error:", e);
    }
  };

  const handleCustomerSelect = (name: string) => {
    const cust = customers.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (cust) {
      setFormData(prev => ({ 
        ...prev, 
        client_name: cust.name, 
        client_address: cust.address || prev.client_address, 
        client_mobile: cust.mobile || prev.client_mobile 
      }));
    } else {
      setFormData(prev => ({ ...prev, client_name: name }));
    }
    setShowSuggestions(false);
  };

  const addFromHistory = (item: any) => {
    const newItem = {
      id: Date.now() + Math.random(),
      details: item.details,
      qty: item.qty || 0,
      rate: item.rate || 0,
      total: item.total || 0,
      len: item.len || '',
      wid: item.wid || ''
    };

    setFormData(prev => {
      const currentItems = [...(prev.items || [])];
      // If the first item is empty, replace it
      if (currentItems.length === 1 && !currentItems[0].details && currentItems[0].total === 0) {
        currentItems[0] = newItem;
      } else {
        currentItems.push(newItem);
      }
      
      const subtotal = currentItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
      return {
        ...prev,
        items: currentItems,
        grand_total: subtotal,
        due: subtotal - (Number(prev.advance) || 0),
        in_word: convertToWords(subtotal)
      };
    });
  };

  const loadInitialItems = (items: Partial<InvoiceItem>[]) => {
    const itemsToLoad = items.map(item => ({
      id: Date.now() + Math.random(),
      details: item.details || '',
      qty: item.qty || 0,
      rate: item.rate || 0,
      total: item.total || 0,
      len: item.len || '',
      wid: item.wid || ''
    }));
    
    setFormData(prev => {
      const updatedItems = [...itemsToLoad];
      const subtotal = updatedItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
      return {
        ...prev,
        items: updatedItems,
        grand_total: subtotal,
        due: subtotal - (Number(prev.advance) || 0),
        in_word: convertToWords(subtotal)
      };
    });
  };

  const loadEditInvoice = async (no: string) => {
    try {
      const data = await db.getInvoiceByNo(no);
      if (data) {
        setFormData(data);
        const hasDims = data.items.some(it => it.len || it.wid);
        if (hasDims) setBannerMode(true);
      }
    } catch (err) {
      alert("Failed to load invoice");
    }
  };

  const generateInvoiceNo = async () => {
    try {
      const invs = await db.getInvoices();
      let lastNo = 10000;
      if (invs && invs.length > 0) {
        const numbers = invs.map(i => parseInt(i.invoice_no)).filter(n => !isNaN(n));
        if (numbers.length > 0) lastNo = Math.max(...numbers);
      }
      setFormData(prev => ({ ...prev, invoice_no: (lastNo + 1).toString() }));
    } catch (err) {
      console.error(err);
    }
  };

  const calculateTotals = (updatedItems: InvoiceItem[], advanceAmount: number) => {
    const subtotal = updatedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const due = Math.max(0, subtotal - advanceAmount);
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      grand_total: subtotal,
      due: due,
      is_paid: due <= 0 && subtotal > 0,
      in_word: convertToWords(subtotal)
    }));
  };

  const handleInputChange = (field: keyof Invoice, value: any) => {
    if (field === 'advance') {
      const advance = Number(value) || 0;
      calculateTotals(formData.items || [], advance);
      setFormData(prev => ({ ...prev, advance }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    if (field === 'client_name') {
      const filtered = customers.filter(c => c.name.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(value.length > 0);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(formData.items || [])];
    const updatedItem = { ...newItems[index], [field]: value };
    
    if (['qty', 'rate', 'len', 'wid'].includes(field)) {
      const qty = Number(updatedItem.qty) || 0;
      const rate = Number(updatedItem.rate) || 0;
      
      if (bannerMode) {
        const len = Number(updatedItem.len) || 0;
        const wid = Number(updatedItem.wid) || 0;
        if (len > 0 && wid > 0) {
          updatedItem.total = len * wid * qty * rate;
        } else {
          updatedItem.total = qty * rate;
        }
      } else {
        updatedItem.total = qty * rate;
      }
    } else if (field === 'total') {
      updatedItem.total = Number(value) || 0;
    }
    
    newItems[index] = updatedItem;
    calculateTotals(newItems, Number(formData.advance) || 0);
  };

  const preventScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur();
  };

  const saveInvoice = async () => {
    if (isSaving) return false;
    if (!formData.client_name) return alert("কাস্টমারের নাম লিখুন");
    if (!formData.invoice_no) return alert("ইনভয়েস নম্বর পাওয়া যায়নি");
    
    setIsSaving(true);
    try {
      if (!formData.is_walk_in) {
        await db.saveCustomer({
          name: formData.client_name!.trim(),
          address: formData.client_address || '',
          mobile: formData.client_mobile || '',
          opening_balance: 0
        });
      }

      const invoiceToSave: Invoice = {
        invoice_no: formData.invoice_no!,
        client_name: formData.client_name!,
        client_address: formData.client_address || '',
        client_mobile: formData.client_mobile || '',
        grand_total: Number(formData.grand_total) || 0,
        advance: Number(formData.advance) || 0,
        due: Number(formData.due) || 0,
        is_paid: (Number(formData.due) || 0) <= 0,
        memo_date: formData.memo_date || new Date().toISOString().slice(0, 10),
        is_walk_in: formData.is_walk_in || false,
        items: (formData.items || []).filter(item => item.details.trim() !== ''),
        in_word: formData.in_word || 'Zero Only.'
      };
      if (formData.id) invoiceToSave.id = formData.id;

      await db.saveInvoice(invoiceToSave);
      refresh();
      setIsSaving(false);
      return true;
    } catch (err: any) {
      alert("সেভ করতে সমস্যা হয়েছে: " + err.message);
      setIsSaving(false);
      return false;
    }
  };

  const handleUpdatePaymentStatus = async (status: 'Paid' | 'Partial' | 'Unpaid') => {
    const total = Number(formData.grand_total) || 0;
    let newAdvance = Number(formData.advance) || 0;
    
    if (status === 'Paid') {
      newAdvance = total;
    } else if (status === 'Unpaid') {
      newAdvance = 0;
    } else if (status === 'Partial') {
      // For partial, we use the value in the input field as the TOTAL advance paid
      newAdvance = Number(paymentInput) || 0;
    }

    const newDue = Math.max(0, total - newAdvance);
    const updatedData = {
      ...formData,
      advance: newAdvance,
      due: newDue,
      is_paid: newDue <= 0 && total > 0
    };

    setFormData(updatedData as Invoice);
    setShowPaymentModal(false);
    setPaymentInput('');
  };

  const handlePrint = async () => {
    const printRoot = document.getElementById('print-root');
    const memoContent = memoRef.current;
    
    if (printRoot && memoContent) {
      printRoot.innerHTML = '';
      const clone = memoContent.cloneNode(true) as HTMLElement;
      clone.style.margin = '0'; 
      clone.style.boxShadow = 'none';
      printRoot.appendChild(clone);
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const labelStyle = "text-[14px] font-bold text-[#555] mb-2 block font-bengali";
  const inputStyle = "w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black/5 bg-white transition-all font-bengali";

  return (
    <div className="animate-in slide-in-from-bottom duration-500 pb-44 px-4 md:px-0">
      <div className="flex items-center justify-between mb-8 no-print">
        <h1 className="text-3xl font-bold text-black font-bengali uppercase tracking-tighter">{editInvoiceNo ? 'Edit Invoice' : 'Create New Invoice'}</h1>
        <button onClick={() => navigateTo(View.Invoices)} className="text-gray-500 hover:text-black transition-colors font-bold flex items-center font-bengali">
          <i className="fas fa-times mr-2 text-lg"></i> Close
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 no-print">
        
        {/* Customer Information Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-black text-xl font-bengali">Customer Information</h3>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="walk_in_check"
                className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                checked={formData.is_walk_in || false}
                onChange={(e) => setFormData(prev => ({ ...prev, is_walk_in: e.target.checked }))}
              />
              <label htmlFor="walk_in_check" className="text-sm text-gray-500 cursor-pointer font-bengali">Walk-in (Don't Save)</label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="relative">
              <label className={labelStyle}>Customer Name*</label>
              <input 
                type="text" 
                className={`${inputStyle} font-bold`}
                value={formData.client_name || ''}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                placeholder="Enter customer name"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white shadow-2xl border border-border rounded-xl max-h-60 overflow-y-auto">
                  {suggestions.map(s => (
                    <div key={s.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b font-bengali font-bold" onClick={() => handleCustomerSelect(s.name)}>
                      <div className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.mobile}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {formData.client_name && prevDueAmount > 0 && (
                <p className="mt-2 text-danger font-bold font-bengali text-[15px] animate-pulse flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i> আগের মোট বকেয়া: ৳{prevDueAmount.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className={labelStyle}>Customer Address</label>
              <input 
                type="text" 
                className={inputStyle} 
                value={formData.client_address || ''} 
                onChange={(e) => handleInputChange('client_address', e.target.value)} 
                placeholder="Enter customer address" 
              />
            </div>

            <div className="md:col-span-1">
              <label className={labelStyle}>Mobile (Contact Number)</label>
              <input 
                type="text" 
                className={inputStyle} 
                value={formData.client_mobile || ''} 
                onChange={(e) => handleInputChange('client_mobile', e.target.value)} 
                placeholder="e.g., 017xxxxxxxx" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Serial No:</label>
                <input 
                  type="text" 
                  className={`${inputStyle} bg-gray-50 text-gray-700 font-bold`} 
                  value={formData.invoice_no} 
                  readOnly 
                />
              </div>
              <div>
                <label className={labelStyle}>Date</label>
                <input 
                  type="date" 
                  className={`${inputStyle} font-bold`} 
                  value={formData.memo_date} 
                  onChange={(e) => handleInputChange('memo_date', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Previous Items History */}
        {formData.client_name && previousItems.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="font-bold text-indigo-600 text-sm mb-4 flex items-center font-bengali uppercase tracking-tight">
              <i className="fas fa-history mr-2"></i> কাজের বিবরণী (গত ৮টি আইটেম)
            </h3>
            <div className="space-y-3">
              {previousItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2 text-[11px] text-gray-400 font-medium">{new Date(item.date).toLocaleDateString('en-GB')}</div>
                    <div className="col-span-4">
                      <div className="font-bold text-gray-800 text-sm font-bengali">{item.details}</div>
                      {(item.len || item.wid) && (
                        <div className="text-[10px] text-gray-400">Size: {item.len}x{item.wid}</div>
                      )}
                    </div>
                    <div className="col-span-2 text-center font-bold text-gray-600 text-sm">{item.qty}</div>
                    <div className="col-span-4 text-right font-black text-gray-700 text-sm">৳{item.total.toFixed(2)}</div>
                  </div>
                  <button 
                    onClick={() => addFromHistory(item)}
                    className="ml-6 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90"
                    title="Add to current invoice"
                  >
                    <i className="fas fa-plus text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Items Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-black text-xl border-b pb-2 flex items-center font-bengali uppercase tracking-tighter"><i className="fas fa-list-ul mr-2"></i> কাজের বিবরণ</h3>
            <button onClick={() => setBannerMode(!bannerMode)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${bannerMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>Banner Mode: {bannerMode ? 'ON' : 'OFF'}</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[10px] uppercase font-black text-gray-500 tracking-widest text-left">
                  <th className="p-4 border font-bengali">বিবরণ (Details)</th>
                  {bannerMode && <th className="p-4 border w-24 text-center font-bengali">দৈর্ঘ্য</th>}
                  {bannerMode && <th className="p-4 border w-24 text-center font-bengali">প্রস্থ</th>}
                  <th className="p-4 border w-28 text-center font-bengali">পরিমাণ</th>
                  <th className="p-4 border w-28 text-center font-bengali">দর</th>
                  <th className="p-4 border w-40 text-right font-bengali">মোট টাকা</th>
                  <th className="p-4 border w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {formData.items?.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-0 border"><input className="w-full px-4 py-4 font-bengali font-bold outline-none bg-transparent" value={item.details} onChange={(e) => handleItemChange(idx, 'details', e.target.value)} placeholder="..." /></td>
                    {bannerMode && <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none bg-gray-50 font-bold" value={item.len === 0 ? '' : item.len} onChange={(e) => handleItemChange(idx, 'len', e.target.value)} /></td>}
                    {bannerMode && <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none bg-gray-50 font-bold" value={item.wid === 0 ? '' : item.wid} onChange={(e) => handleItemChange(idx, 'wid', e.target.value)} /></td>}
                    <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none font-bold" value={item.qty === 0 ? '' : item.qty} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} /></td>
                    <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none font-bold" value={item.rate === 0 ? '' : item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} /></td>
                    <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-4 py-4 text-right outline-none font-black bg-gray-50 text-black text-lg" value={item.total === 0 ? '' : item.total} onChange={(e) => handleItemChange(idx, 'total', e.target.value)} /></td>
                    <td className="p-0 border text-center"><button onClick={() => { const itms = [...formData.items!]; itms.splice(idx, 1); calculateTotals(itms, formData.advance!) }} className="text-gray-400 hover:text-black"><i className="fas fa-trash-alt text-xs"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setFormData(p => ({ ...p, items: [...p.items!, { id: Date.now(), details: '', qty: 0, rate: 0, total: 0, len: '', wid: '' }] }))} className="mt-4 bg-black text-white px-6 py-2.5 rounded-xl font-bold font-bengali uppercase text-xs tracking-widest shadow-md active:scale-95 transition-all"><i className="fas fa-plus mr-1"></i> রো যোগ করুন</button>
        </div>

        {/* Payment Details */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-black text-xl border-b pb-2 flex items-center font-bengali uppercase tracking-tighter">
            <i className="fas fa-money-check-alt mr-2"></i> পেমেন্ট ডিটেইলস
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block font-bengali">মোট টাকা (৳)</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 rounded-lg border bg-gray-50 font-black outline-none" 
                value={formData.grand_total?.toFixed(0)} 
                readOnly 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block font-bengali">অ্যাডভান্স পেমেন্ট (৳)</label>
              <input 
                type="number" 
                onWheel={preventScroll}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none font-black focus:ring-2 focus:ring-black/5" 
                value={formData.advance === 0 ? '' : formData.advance} 
                onChange={(e) => handleInputChange('advance', e.target.value)} 
                placeholder="0.00" 
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block font-bengali">বকেয়া পরিমাণ (৳)</label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 rounded-lg border bg-gray-50 font-black outline-none text-danger" 
              value={formData.due?.toFixed(0)} 
              readOnly 
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block font-bengali">কথায় (In Words)</label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 rounded-lg border bg-gray-50 italic outline-none font-bold font-bengali" 
              value={formData.in_word} 
              readOnly 
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 mb-1 block font-bengali">Payment Status</label>
            <div className={`w-full px-4 py-2 rounded-lg font-black text-center uppercase tracking-widest text-xs ${formData.is_paid ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
              {formData.is_paid ? 'PAID' : 'UNPAID'}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="include_prev_due"
              className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
              checked={includePreviousDue}
              onChange={(e) => setIncludePreviousDue(e.target.checked)}
            />
            <label htmlFor="include_prev_due" className="text-sm text-danger font-bold cursor-pointer font-bengali">প্রিন্টে পূর্বের বকেয়া যোগ করুন (Include Previous Due in Print)</label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 pb-10">
           <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
             <button 
               onClick={async () => {
                 await saveInvoice();
               }} 
               disabled={isSaving} 
               className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 active:scale-95 font-bengali"
             >
               <i className="fas fa-save"></i> {isSaving ? 'সেভ হচ্ছে...' : 'Save'}
             </button>
             <button 
               onClick={async () => {
                 const saved = await saveInvoice();
                 if (saved) navigateTo(View.Invoices);
               }} 
               disabled={isSaving} 
               className="w-full md:w-auto px-10 py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 active:scale-95 font-bengali"
             >
               <i className="fas fa-check-double"></i> {isSaving ? 'সেভ হচ্ছে...' : (editInvoiceNo ? 'Update & Close' : 'Save & Close')}
             </button>
           </div>

           <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
             <button 
               onClick={() => setShowPaymentModal(true)}
               className="w-full md:w-auto px-8 py-4 bg-success text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs shadow-lg active:scale-95 font-bengali"
             >
               <i className="fas fa-check-circle"></i> Update Payment Status
             </button>
             <button 
               onClick={handlePrint} 
               disabled={isSaving}
               className="w-full md:w-auto px-10 py-4 border border-gray-300 text-black rounded-xl font-bold flex items-center justify-center gap-2 bg-white hover:bg-gray-50 transition-all uppercase tracking-widest text-xs shadow-sm disabled:opacity-50 active:scale-95 font-bengali"
             >
               <i className="fas fa-print"></i> Print Invoice
             </button>
           </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowPaymentModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Update Payment Status</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">Subtotal (৳)</p>
                <p className="text-lg font-bold text-slate-700">{formData.grand_total?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">Due (৳)</p>
                <p className="text-lg font-bold text-slate-700">{formData.due?.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-medium text-slate-500 mb-2 block">Advance Payment (৳)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-medium transition-all"
                placeholder="0.00"
                value={paymentInput}
                onChange={(e) => setPaymentInput(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                onClick={() => handleUpdatePaymentStatus('Paid')}
                className="px-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                Mark as Paid
              </button>
              <button 
                onClick={() => handleUpdatePaymentStatus('Partial')}
                className="px-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                Mark as Partial
              </button>
              <button 
                onClick={() => handleUpdatePaymentStatus('Unpaid')}
                className="px-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                Mark as Unpaid
              </button>
            </div>

            <button 
              onClick={() => setShowPaymentModal(false)}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div id="memo-print-template" className="hidden">
        <div ref={memoRef} className="memo-container bg-white text-black font-serif" style={{ width: '148mm', height: '210mm', padding: '10mm', position: 'relative', margin: '0' }}>
          <div className="w-full h-full border-[3px] border-black p-4 flex flex-col box-border bg-white font-serif">
              <div className="flex justify-center mb-3">
                 <div className="border-[2px] border-black px-12 py-1 text-[16px] font-black uppercase tracking-[2px]">CASH MEMO / ক্যাশ মেমো</div>
              </div>
              <div className="text-center">
                <h1 className="text-[18px] font-black uppercase tracking-tight leading-none mb-1 text-center w-full whitespace-nowrap">MASTER COMPUTER & PRINTING PRESS</h1>
                <div className="w-full h-[2px] bg-black mb-1"></div>
                <div className="flex justify-between items-center px-1 mb-1">
                  <span className="text-[14px] font-black">Proprietor: S.M. Shahjahan</span>
                  <div className="bg-black text-white px-4 py-0.5 font-sans font-black tracking-widest text-[14px]">01720-365191</div>
                </div>
                <div className="flex justify-center mb-1">
                  <div className="border-[1.5px] border-black px-4 py-0.5 text-[11px] font-black">Primary association Market, Sakhipur, Tangail</div>
                </div>
                <div className="w-full h-[1.5px] bg-black mb-1"></div>
              </div>
              <div className="space-y-0.5 mb-1 text-[14px] font-black">
                <div className="flex justify-between items-end">
                   <div className="flex flex-1 items-end">
                      <span className="mr-2">Serial:</span>
                      <div className="flex-1 border-b-[1.5px] border-black min-h-[18px]">#{formData.invoice_no}</div>
                   </div>
                   <div className="flex flex-1 items-end pl-8">
                      <span className="mr-2">Date:</span>
                      <div className="flex-1 border-b-[1.5px] border-black text-center min-h-[18px]">{new Date(formData.memo_date || '').toLocaleDateString('en-GB')}</div>
                   </div>
                </div>
                <div className="flex items-end">
                   <span className="w-16 shrink-0">Name:</span>
                   <div className="flex-1 border-b-[1.5px] border-black font-bengali text-[16px] min-h-[22px] leading-tight">{formData.client_name}</div>
                </div>
                <div className="flex items-end">
                   <span className="w-16 shrink-0">Address:</span>
                   <div className="flex-1 border-b-[1.5px] border-black font-bengali min-h-[20px] leading-tight">{formData.client_address || '...'}</div>
                </div>
                {formData.client_mobile && (
                  <div className="flex items-end">
                    <span className="w-16 shrink-0">Mobile:</span>
                    <div className="flex-1 border-b-[1.5px] border-black min-h-[18px]">{formData.client_mobile}</div>
                  </div>
                )}
              </div>
              <div className="w-full h-[1.5px] bg-black mb-1"></div>
              <div className="flex-grow overflow-hidden">
                <table className="w-full border-collapse border-[2px] border-black text-[13px]">
                    <thead>
                      <tr className="border-b-[2px] border-black h-7">
                          <th className="border-r-[2px] border-black w-10 text-center font-black">SL</th>
                          <th className="border-r-[2px] border-black text-center font-black">Work Description</th>
                          <th className="border-r-[2px] border-black w-24 text-center font-black">Qty / Size</th>
                          <th className="border-r-[2px] border-black w-16 text-center font-black">Rate</th>
                          <th className="w-24 text-center font-black">Total (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="font-black">
                      {formData.items?.map((item, i) => (
                          <tr key={item.id} className="border-b-[1px] border-black h-6 align-middle">
                            <td className="border-r-[2px] border-black text-center">{i+1}</td>
                            <td className="border-r-[2px] border-black pl-2 font-bengali leading-none py-0.5">{item.details}</td>
                            <td className="border-r-[2px] border-black text-center">{item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}</td>
                            <td className="border-r-[2px] border-black text-center">{item.rate || ''}</td>
                            <td className="text-right pr-2">৳{item.total}/-</td>
                          </tr>
                      ))}
                    </tbody>
                </table>
              </div>
              <div className="mt-auto pt-1">
                <div className="flex justify-between items-end gap-2">
                    <div className="flex-1 border-[2px] border-black p-1.5 min-h-[50px] flex flex-col justify-start">
                       <span className="text-[8px] font-black text-gray-500 mb-0.5 uppercase">IN WORDS / কথায়:</span>
                       <span className="font-bengali font-black text-[12px] italic leading-tight">{formData.in_word}</span>
                    </div>
                    <div className="w-48 flex flex-col gap-0.5 text-[13px] font-black">
                       <div className="flex justify-between border-b-[1px] border-black pb-0.5">
                         <span>Total:</span><span>৳{Number(formData.grand_total).toFixed(0)}/-</span>
                       </div>
                       {includePreviousDue && prevDueAmount > 0 && (
                         <div className="flex justify-between border-b-[1px] border-black pb-0.5 text-danger">
                           <span>Prev. Due:</span><span>৳{prevDueAmount.toFixed(0)}/-</span>
                         </div>
                       )}
                       <div className="flex justify-between border-b-[1px] border-black pb-0.5">
                         <span>Paid:</span><span>৳{Number(formData.advance).toFixed(0)}/-</span>
                       </div>
                       <div className="flex justify-between items-center bg-white border-[2px] border-black px-2 py-0.5 mt-0.5 font-black text-[16px]">
                         <span>DUE:</span><span>৳{(Number(formData.due) + (includePreviousDue ? prevDueAmount : 0)).toFixed(0)}/-</span>
                       </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-col items-center">
                    <p className="text-[7px] font-bold text-gray-600 italic">This is an electronically generated invoice.</p>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;