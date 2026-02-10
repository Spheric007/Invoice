
import React, { useState, useEffect, useRef } from 'react';
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
      
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom duration-500 pb-44 px-4 md:px-0">
      <div className="flex items-center justify-between mb-8 no-print">
        <h1 className="text-3xl font-bold text-[#333]">{editInvoiceNo ? 'Edit Invoice' : 'Create New Invoice'}</h1>
        <button onClick={() => navigateTo(View.Invoices)} className="text-lightText hover:text-primary transition-colors flex items-center font-bold">
          <i className="fas fa-times mr-2 text-lg"></i> Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 space-y-8">
          {/* Form Content - Same as before */}
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

          {/* Totals Section */}
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
          </div>
        </div>

        <div className="lg:col-span-1 no-print">
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

      {/* STICKY BOTTOM BAR FOR PRINT */}
      <div className="fixed bottom-0 left-0 md:left-[250px] right-0 bg-white/90 backdrop-blur-md border-t p-6 flex flex-wrap items-center justify-between no-print shadow-[0_-25px_60px_rgba(0,0,0,0.15)] z-[100] gap-4">
        <div>
           <button onClick={saveInvoice} disabled={isSaving} className="bg-primary text-white px-10 py-4.5 rounded-2xl font-black shadow-2xl shadow-primary/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-lg">
              <i className="fas fa-cloud-upload-alt text-xl"></i> Submit & Save
           </button>
        </div>
        <div className="flex flex-wrap gap-4">
           <button onClick={handlePrint} className="bg-white border-3 border-gray-900 text-gray-900 px-8 py-4.5 rounded-2xl font-black flex items-center gap-3 hover:bg-gray-900 hover:text-white active:scale-95 transition-all shadow-xl text-lg">
              <i className="fas fa-print text-xl"></i> Print Memo
           </button>
        </div>
      </div>

      {/* PRINT TEMPLATE - EXACT REPLICA OF PROVIDED IMAGE */}
      <div id="memo-print-template" className="hidden">
        <div ref={memoRef} className="memo-container bg-white text-black font-serif" style={{ width: '148mm', height: '210mm', padding: '10mm', position: 'relative' }}>
           <div className="w-full h-full border-2 border-black p-4 flex flex-col box-border">
              
              {/* Top Boxed Header */}
              <div className="flex justify-center mb-6">
                 <div className="border-2 border-black px-10 py-2 text-[14px] font-black uppercase tracking-[3px]">
                    CASH MEMO / ক্যাশ মেমো
                 </div>
              </div>

              {/* Business Info */}
              <div className="text-center mb-4">
                 <h1 className="text-[28px] font-black uppercase tracking-tight leading-none mb-4">
                    MASTER COMPUTER & PRINTING PRESS
                 </h1>
                 
                 <div className="border-t-2 border-black mt-2 mb-2"></div>

                 <div className="flex justify-between items-center px-2 py-1 font-bold text-[14px]">
                    <div className="flex items-center">
                       <span>Proprietor: S.M. Shahjahan</span>
                    </div>
                    <div className="bg-black text-white px-6 py-1 rounded-sm font-sans font-black tracking-widest">
                       01720-365191
                    </div>
                 </div>

                 <div className="flex justify-center mt-2">
                    <div className="border-2 border-black px-8 py-1 text-[11px] font-bold">
                       Primary association Market, Sakhipur, Tangail
                    </div>
                 </div>
                 <div className="border-t-2 border-black mt-4 mb-6"></div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-12 gap-y-4 mb-6 text-[15px] font-bold">
                 <div className="col-span-7 space-y-3">
                    <div className="flex items-end">
                       <span className="w-20">Serial:</span>
                       <span className="border-b border-black flex-1 pl-4 pb-0.5 font-black">#{formData.invoice_no}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-20">Name:</span>
                       <span className="border-b border-black flex-1 pl-4 pb-0.5 font-black">{formData.client_name}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-20">Address:</span>
                       <span className="border-b border-black flex-1 pl-4 pb-0.5">{formData.client_address || '...'}</span>
                    </div>
                 </div>
                 <div className="col-span-5 space-y-3">
                    <div className="flex items-end justify-end">
                       <span className="mr-4">Date:</span>
                       <span className="border-b border-black flex-1 text-center pb-0.5 font-black">{new Date(formData.memo_date || '').toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-end justify-end font-sans">
                       <span className="mr-4">Mobile:</span>
                       <span className="border-b border-black flex-1 text-center pb-0.5 font-black">{formData.client_mobile || '...'}</span>
                    </div>
                 </div>
              </div>

              {/* Table with Dynamic Rows */}
              <div className="flex-grow">
                 <table className="w-full border-collapse border-2 border-black text-[15px]">
                    <thead>
                       <tr className="border-b-2 border-black h-12">
                          <th className="border-r-2 border-black w-12 text-center">SL</th>
                          <th className="border-r-2 border-black text-center">Work Description</th>
                          <th className="border-r-2 border-black w-32 text-center">Qty / Size</th>
                          <th className="border-r-2 border-black w-24 text-center">Rate</th>
                          <th className="w-28 text-center">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {formData.items?.map((item, i) => (
                          <tr key={item.id} className="border-b-2 border-black h-11 align-middle">
                             <td className="border-r-2 border-black text-center">{i+1}</td>
                             <td className="border-r-2 border-black pl-4 font-bengali">{item.details}</td>
                             <td className="border-r-2 border-black text-center font-sans">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : item.qty}
                             </td>
                             <td className="border-r-2 border-black text-center">{item.rate}</td>
                             <td className="text-right pr-4">৳{item.total}/-</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Summary and Signature at Bottom */}
              <div className="mt-8">
                 <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-7">
                       <div className="border-2 border-black p-4 h-24 flex flex-col justify-between">
                          <div className="text-[10px] uppercase font-black text-gray-500 mb-2">IN WORDS / কথায়:</div>
                          <div className="italic text-[16px] font-black font-bengali leading-snug">
                             {convertToWords((Number(formData.grand_total) || 0) + (includePreviousDue ? prevDueAmount : 0))}
                          </div>
                       </div>
                    </div>
                    <div className="col-span-5">
                       <div className="border-l-4 border-black pl-6 space-y-2">
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 font-bold text-[16px]">
                             <span>Total:</span>
                             <span className="font-black text-[18px]">৳{(Number(formData.grand_total) || 0) + (includePreviousDue ? prevDueAmount : 0)}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 font-bold text-[16px] text-green-700">
                             <span>Paid:</span>
                             <span className="font-black text-[18px]">৳{Number(formData.advance).toFixed(0)}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-gray-50 font-black text-[22px] text-red-600 mt-2">
                             <span>DUE:</span>
                             <span>৳{((Number(formData.due) || 0) + (includePreviousDue ? prevDueAmount : 0)).toFixed(0)}/-</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Signature Section fixed at bottom of content */}
                 <div className="mt-16 flex justify-between items-end px-4 text-[13px] font-black uppercase tracking-[1px]">
                    <div className="text-center w-48 border-t-2 border-black pt-2">
                       CUSTOMER SIGN
                    </div>
                    <div className="text-center w-56 relative">
                       {/* Company signature label above the line */}
                       <div className="text-[18px] font-black italic tracking-tighter mb-1 text-primary animate-pulse" style={{ fontFamily: 'Georgia, serif' }}>
                          MASTER COMPUTER
                       </div>
                       <div className="border-t-2 border-black pt-2">
                          AUTHORIZED SIGN
                       </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
