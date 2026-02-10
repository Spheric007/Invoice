
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Invoice, Customer, InvoiceItem } from '../types';
import { db } from '../services/db';
import { convertToWords, formatDisplayDate } from '../utils/helpers';

interface CreateInvoiceProps {
  customers: Customer[];
  navigateTo: (view: View, params?: any) => void;
  refresh: () => void;
  editInvoiceNo?: string | null;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ customers, navigateTo, refresh, editInvoiceNo }) => {
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
    items: [{ id: Date.now(), details: '', qty: 1, rate: 0, total: 0, len: '', wid: '' }]
  });

  const [bannerMode, setBannerMode] = useState(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [includePreviousDue, setIncludePreviousDue] = useState(false);
  const [prevDueAmount, setPrevDueAmount] = useState(0);
  const memoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editInvoiceNo) {
      loadEditInvoice(editInvoiceNo);
    } else {
      generateInvoiceNo();
    }
  }, [editInvoiceNo]);

  useEffect(() => {
    if (formData.client_name) {
      checkCustomerDue(formData.client_name);
    } else {
      setPrevDueAmount(0);
    }
  }, [formData.client_name]);

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

  const checkCustomerDue = async (name: string) => {
    try {
      const allInvs = await db.getInvoices();
      const currentInvoiceNo = formData.invoice_no;
      const otherInvs = allInvs.filter(i => 
        i.client_name.toLowerCase().trim() === name.toLowerCase().trim() && 
        i.invoice_no !== currentInvoiceNo
      );
      const invoiceDueTotal = otherInvs.reduce((sum, i) => sum + (Number(i.due) || 0), 0);
      
      const trans = await db.getTransactions(name);
      const transBalance = trans.reduce((sum, t) => t.type === 'Due' ? sum + t.amount : sum - t.amount, 0);
      
      setPrevDueAmount(invoiceDueTotal + transBalance);
    } catch (e) {
      console.error("Error checking due:", e);
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

  const markAsFullyPaid = () => {
    const total = formData.grand_total || 0;
    setFormData(prev => ({ ...prev, advance: total, due: 0, is_paid: true }));
    alert("Payment status updated to PAID. Please Save to confirm.");
  };

  const saveInvoice = async () => {
    if (!formData.client_name) return alert("Customer name is required");
    if (!formData.invoice_no) return alert("Invoice number is required");
    
    setIsSaving(true);
    try {
      const invoiceToSave: Invoice = {
        invoice_no: formData.invoice_no!,
        client_name: formData.client_name!,
        client_address: formData.client_address || '',
        client_mobile: formData.client_mobile || '',
        grand_total: Number(formData.grand_total) || 0,
        advance: Number(formData.advance) || 0,
        due: Number(formData.due) || 0,
        is_paid: formData.is_paid || false,
        memo_date: formData.memo_date || new Date().toISOString().slice(0, 10),
        is_walk_in: formData.is_walk_in || false,
        items: formData.items || [],
        in_word: formData.in_word || 'Zero Only.'
      };
      if (formData.id) invoiceToSave.id = formData.id;

      await db.saveInvoice(invoiceToSave);
      refresh();
      return true;
    } catch (err: any) {
      alert("Failed to save: " + err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!formData.client_name) return alert("Fill customer name first");
    const isSaved = await saveInvoice();
    if (!isSaved) return;

    const printRoot = document.getElementById('print-root');
    const memoContent = memoRef.current;
    
    if (printRoot && memoContent) {
      printRoot.innerHTML = '';
      const clone = memoContent.cloneNode(true) as HTMLElement;
      printRoot.appendChild(clone);
      
      // Critical for mobile and some browsers to ensure styling loads
      setTimeout(() => {
        window.print();
        // Option to refresh or navigate after print if needed
      }, 300);
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom duration-500 pb-44 px-4 md:px-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#333]">{editInvoiceNo ? 'Edit Invoice' : 'Create New Invoice'}</h1>
        <button onClick={() => navigateTo(View.Invoices)} className="text-lightText hover:text-primary transition-colors flex items-center font-bold">
          <i className="fas fa-times mr-2 text-lg"></i> Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Customer & Info Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h3 className="font-bold mb-6 text-primary text-xl border-b pb-2 flex items-center">
              <i className="fas fa-user-circle mr-2"></i> Memo Header
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative">
                <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Customer Name*</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border font-bengali font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  value={formData.client_name || ''}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Enter customer name"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white shadow-2xl border border-border rounded-xl max-h-60 overflow-y-auto">
                    {suggestions.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-secondary cursor-pointer border-b font-bengali font-bold" onClick={() => { setFormData(prev => ({ ...prev, client_name: s.name, client_address: s.address, client_mobile: s.mobile })); setShowSuggestions(false); }}>
                        <div className="flex justify-between">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-lightText bg-gray-100 px-2 py-0.5 rounded-full">{s.mobile}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {prevDueAmount !== 0 && (
                   <div className={`mt-2 text-xs font-black font-bengali px-3 py-1 rounded-lg inline-block ${prevDueAmount > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                     {prevDueAmount > 0 ? `সাবেক মোট বকেয়া: ৳${prevDueAmount.toFixed(2)}/-` : `অ্যাডভান্স জমা: ৳${Math.abs(prevDueAmount).toFixed(2)}/-`}
                   </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Customer Address</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border font-bengali outline-none focus:ring-2 focus:ring-primary/20 bg-white" 
                  value={formData.client_address || ''} 
                  onChange={(e) => handleInputChange('client_address', e.target.value)} 
                  placeholder="Enter customer address" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Mobile (Contact Number)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 bg-white" 
                  value={formData.client_mobile || ''} 
                  onChange={(e) => handleInputChange('client_mobile', e.target.value)} 
                  placeholder="e.g., 017xxxxxxxx" 
                />
              </div>

              <div className="hidden md:block"></div>

              <div>
                <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Serial No:</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border bg-gray-100 font-black text-center" 
                  value={formData.invoice_no} 
                  readOnly 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-lightText uppercase mb-1.5 block">Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white" 
                  value={formData.memo_date} 
                  onChange={(e) => handleInputChange('memo_date', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-primary text-xl border-b pb-2 flex items-center">
                <i className="fas fa-list-ul mr-2"></i> Work Description
              </h3>
              <div className="flex items-center gap-3 bg-secondary px-4 py-1.5 rounded-full">
                <span className="text-[10px] font-black text-lightText uppercase tracking-widest">Banner Mode (Sq.Ft)</span>
                <button 
                  onClick={() => setBannerMode(!bannerMode)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${bannerMode ? 'bg-primary' : 'bg-gray-400'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${bannerMode ? 'left-5.5' : 'left-0.5'}`}></div>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary text-[10px] uppercase font-bold text-lightText tracking-widest">
                    <th className="p-3 border">Description of Work</th>
                    {bannerMode && <th className="p-3 border w-20">Len (Ft)</th>}
                    {bannerMode && <th className="p-3 border w-20">Wid (Ft)</th>}
                    <th className="p-3 border w-16 text-center">Qty</th>
                    <th className="p-3 border w-24 text-center">Rate</th>
                    <th className="p-3 border w-32 text-right">Total</th>
                    <th className="p-3 border w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {formData.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-0 border">
                        <input className="w-full px-3 py-3 font-bengali font-bold outline-none" value={item.details} onChange={(e) => handleItemChange(idx, 'details', e.target.value)} placeholder="Item description" />
                      </td>
                      {bannerMode && (
                        <td className="p-0 border">
                          <input type="number" className="w-full px-2 py-3 text-center outline-none bg-indigo-50/30" value={item.len || ''} onChange={(e) => handleItemChange(idx, 'len', e.target.value)} placeholder="0" />
                        </td>
                      )}
                      {bannerMode && (
                        <td className="p-0 border">
                          <input type="number" className="w-full px-2 py-3 text-center outline-none bg-indigo-50/30" value={item.wid || ''} onChange={(e) => handleItemChange(idx, 'wid', e.target.value)} placeholder="0" />
                        </td>
                      )}
                      <td className="p-0 border">
                        <input type="number" className="w-full px-2 py-3 text-center outline-none font-bold" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} />
                      </td>
                      <td className="p-0 border">
                        <input type="number" className="w-full px-2 py-3 text-center outline-none font-bold" value={item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} />
                      </td>
                      <td className="p-0 border text-right px-4 font-black bg-gray-50 text-indigo-700">৳{Number(item.total).toFixed(0)}</td>
                      <td className="p-0 border text-center">
                        <button onClick={() => { const itms = [...formData.items!]; itms.splice(idx, 1); calculateTotals(itms, formData.advance!) }} className="text-white bg-danger w-6 h-6 rounded flex items-center justify-center hover:scale-110 transition-transform mx-auto"><i className="fas fa-minus text-[10px]"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setFormData(p => ({ ...p, items: [...p.items!, { id: Date.now(), details: '', qty: 1, rate: 0, total: 0, len: '', wid: '' }] }))} 
                className="bg-[#e8eaf6] text-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <i className="fas fa-plus"></i> Add item
              </button>
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h3 className="font-bold mb-8 text-2xl flex items-center border-b pb-2">
              <i className="fas fa-money-check-alt mr-3 text-primary"></i> Financials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-lightText uppercase mb-2 tracking-widest">Grand Subtotal (৳)</label>
                  <input type="text" className="w-full px-5 py-4 rounded-xl border bg-gray-100 font-black text-2xl tracking-tighter" value={formData.grand_total?.toFixed(2)} readOnly />
                </div>
                <div>
                  <label className="block text-xs font-black text-lightText uppercase mb-2 tracking-widest">Advance Paid (৳)</label>
                  <input type="number" className="w-full px-5 py-4 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 font-black text-success text-2xl tracking-tighter" value={formData.advance || ''} onChange={(e) => handleInputChange('advance', e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-lightText uppercase mb-2 tracking-widest">Net Balance Due (৳)</label>
                  <input type="text" className="w-full px-5 py-4 rounded-xl border bg-gray-50 font-black text-danger text-3xl tracking-tighter shadow-inner" value={formData.due?.toFixed(2)} readOnly />
                </div>
                <div>
                  <label className="block text-xs font-black text-lightText uppercase mb-2 tracking-widest">Amount In Words</label>
                  <input type="text" className="w-full px-4 py-4 rounded-xl border bg-gray-50 italic text-xs font-black font-bengali text-gray-700" value={formData.in_word} readOnly />
                </div>
              </div>
            </div>
            
            <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-[#f8f9ff] border-2 border-indigo-100">
               <div className="flex items-center gap-3">
                 <span className="text-xs font-black text-lightText uppercase tracking-widest">Payment Status:</span>
                 <span className={`px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm ${formData.is_paid ? 'bg-success text-white' : 'bg-danger/10 text-danger border border-danger'}`}>
                   {formData.is_paid ? 'FULLY PAID' : 'UNPAID'}
                 </span>
               </div>
               <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border shadow-sm">
                 <input type="checkbox" id="prevDueSwitch" checked={includePreviousDue} onChange={(e) => setIncludePreviousDue(e.target.checked)} className="w-6 h-6 cursor-pointer accent-primary" />
                 <label htmlFor="prevDueSwitch" className="text-danger font-black text-xs cursor-pointer select-none tracking-tight uppercase">
                   Include Previous Due in Print (সাবেক বকেয়া যোগ করুন)
                 </label>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
           <div className="bg-white p-8 rounded-2xl border border-border sticky top-24 shadow-md">
              <h4 className="font-black mb-6 flex items-center gap-2 text-primary border-b pb-3 uppercase tracking-tighter text-lg">
                <i className="fas fa-magic"></i> Memo Actions
              </h4>
              <div className="space-y-4">
                 <button onClick={saveInvoice} disabled={isSaving} className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                    <i className="fas fa-save text-xl"></i> {editInvoiceNo ? 'Update Invoice' : 'Save Invoice'}
                 </button>
                 <button onClick={markAsFullyPaid} className="w-full py-4 bg-success/10 text-success border-2 border-success/30 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-success hover:text-white transition-all">
                    <i className="fas fa-check-double"></i> Mark as Paid
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="fixed bottom-0 left-0 md:left-[250px] right-0 bg-white/90 backdrop-blur-md border-t p-6 flex flex-wrap items-center justify-between no-print shadow-[0_-25px_60px_rgba(0,0,0,0.15)] z-[100] gap-4">
        <div>
           <button 
             onClick={saveInvoice}
             disabled={isSaving}
             className="bg-primary text-white px-10 py-4.5 rounded-2xl font-black shadow-2xl shadow-primary/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-lg"
           >
              <i className="fas fa-cloud-upload-alt text-xl"></i> {editInvoiceNo ? 'Update Records' : 'Submit & Save'}
           </button>
        </div>
        <div className="flex flex-wrap gap-4">
           <button 
             onClick={markAsFullyPaid}
             className="bg-success text-white px-8 py-4.5 rounded-2xl font-black shadow-2xl shadow-success/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-lg"
           >
              <i className="fas fa-hand-holding-usd text-xl"></i> Final Payment
           </button>
           <button 
             onClick={handlePrint}
             className="bg-white border-3 border-gray-900 text-gray-900 px-8 py-4.5 rounded-2xl font-black flex items-center gap-3 hover:bg-gray-900 hover:text-white active:scale-95 transition-all shadow-xl text-lg"
           >
              <i className="fas fa-print text-xl"></i> Print Memo
           </button>
        </div>
      </div>

      {/* PRINT TEMPLATE - A5 SIZE DESIGNED FOR A4 LANDSCAPE HALF */}
      <div className="hidden">
        <div ref={memoRef} className="memo-container bg-white mx-auto">
           <div className="flex flex-col h-full border-2 border-black p-4 font-bengali">
             {/* HEADER */}
             <div className="text-center border-b-2 border-black pb-4 mb-4">
                <div className="flex justify-center mb-2">
                  <h2 className="text-[12px] font-black uppercase tracking-[3px] border-2 border-black px-6 py-1 inline-block">Cash Memo / ক্যাশ মেমো</h2>
                </div>
                <h1 className="text-[26px] font-black text-black leading-none mt-1 uppercase tracking-tighter">MASTER COMPUTER & PRINTING PRESS</h1>
                <div className="flex justify-between items-center mt-3 border-t-2 border-black pt-2 px-2 font-black text-[12px]">
                  <span>Proprietor: S.M. Shahjahan</span>
                  <span className="bg-black text-white px-3 py-0.5 rounded-sm font-sans">01720-365191</span>
                </div>
                <div className="border border-black px-3 py-1 mt-2 mx-auto inline-block text-[10px] font-bold">Primary Teachers Association Market, Sakhipur, Tangail</div>
             </div>

             {/* CLIENT INFO */}
             <div className="grid grid-cols-2 gap-4 mb-4 text-[13px] border-b-2 border-gray-400 pb-3 px-1">
                <div className="space-y-1.5">
                  <p className="flex items-center"><span className="font-black w-14">Serial:</span> <span className="border-b-2 border-dotted border-black flex-1 font-black">#{formData.invoice_no}</span></p>
                  <p className="flex items-center"><span className="font-black w-14">Name:</span> <span className="border-b-2 border-dotted border-black flex-1 font-black text-[14px]">{formData.client_name}</span></p>
                  <p className="flex items-center"><span className="font-black w-14">Address:</span> <span className="border-b-2 border-dotted border-black flex-1 font-medium">{formData.client_address || '...'}</span></p>
                </div>
                <div className="text-right space-y-1.5 pl-6">
                  <p className="flex items-center justify-end"><span className="font-black mr-2">Date:</span> <span className="border-b-2 border-dotted border-black min-w-[100px] text-center font-black">{formatDisplayDate(formData.memo_date)}</span></p>
                  <p className="flex items-center justify-end"><span className="font-black mr-2">Mobile:</span> <span className="border-b-2 border-dotted border-black min-w-[100px] text-center font-black font-sans">{formData.client_mobile || '...'}</span></p>
                </div>
             </div>

             {/* TABLE */}
             <div className="flex-grow overflow-hidden">
               <table className="w-full border-collapse border-2 border-black text-[13px]">
                 <thead>
                   <tr className="bg-gray-100 font-black border-b-2 border-black h-10">
                     <th className="p-1 border-r-2 border-black w-10 text-center">SL</th>
                     <th className="p-1 border-r-2 border-black text-left pl-3">Work Description</th>
                     <th className="p-1 border-r-2 border-black w-24 text-center">Qty / Size</th>
                     <th className="p-1 border-r-2 border-black w-20 text-center">Rate</th>
                     <th className="p-1 text-right w-24 pr-3">Total (৳)</th>
                   </tr>
                 </thead>
                 <tbody className="font-bold">
                   {formData.items?.map((item, i) => (
                     <tr key={i} className="border-b border-black h-9">
                       <td className="p-1 border-r-2 border-black text-center">{i+1}</td>
                       <td className="p-1 border-r-2 border-black font-black pl-3">{item.details}</td>
                       <td className="p-1 border-r-2 border-black text-center font-sans text-[11px]">
                          {item.len && item.wid ? `${item.len}'x${item.wid}' (${item.qty})` : item.qty}
                       </td>
                       <td className="p-1 border-r-2 border-black text-center">৳{Number(item.rate).toFixed(0)}</td>
                       <td className="p-1 text-right font-black pr-3">{Number(item.total).toFixed(0)}/-</td>
                     </tr>
                   ))}
                   
                   {includePreviousDue && prevDueAmount > 0 && (
                     <tr className="bg-gray-50 font-black border-t-2 border-black h-9 text-red-700">
                       <td className="p-1 border-r-2 border-black text-center">#</td>
                       <td className="p-1 border-r-2 border-black pl-3">সাবেক বকেয়া (Previous Due)</td>
                       <td className="p-1 border-r-2 border-black text-center">-</td>
                       <td className="p-1 border-r-2 border-black text-center">-</td>
                       <td className="p-1 text-right font-black pr-3">{prevDueAmount.toFixed(0)}/-</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>

             {/* FOOTER */}
             <div className="mt-4 flex justify-between items-start font-black">
                <div className="w-[60%] border-2 border-black p-3 bg-gray-50 rounded-sm">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 mb-1 block">In Words / কথায়:</span>
                  <p className="italic text-[14px] leading-tight text-black">
                    {convertToWords((Number(formData.grand_total) || 0) + (includePreviousDue ? prevDueAmount : 0))}
                  </p>
                </div>
                <div className="w-44 space-y-0.5 border-l-2 border-black pl-4">
                   <div className="flex justify-between items-center text-[12px] py-1 border-b border-black/10">
                     <span>Total:</span>
                     <span>৳{(Number(formData.grand_total) || 0) + (includePreviousDue ? prevDueAmount : 0)}/-</span>
                   </div>
                   <div className="flex justify-between items-center text-[12px] py-1 border-b border-black/10 text-green-700">
                     <span>Paid:</span>
                     <span>৳{Number(formData.advance).toFixed(0)}/-</span>
                   </div>
                   <div className="flex justify-between items-center text-[15px] pt-1.5 text-red-600 bg-gray-50 px-1 font-black">
                     <span>DUE:</span>
                     <span>৳{((Number(formData.due) || 0) + (includePreviousDue ? prevDueAmount : 0)).toFixed(0)}/-</span>
                   </div>
                </div>
             </div>

             {/* SIGNATURES */}
             <div className="flex justify-between mt-16 px-6 text-[10px] font-black uppercase tracking-wider">
                <div className="text-center w-28 border-t-2 border-black pt-1">Customer Sign</div>
                <div className="text-center w-36 border-t-2 border-black pt-1">
                  Authorized Sign
                  <p className="text-[7px] text-gray-500 font-bold normal-case mt-0.5">Master Computer & Press</p>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
