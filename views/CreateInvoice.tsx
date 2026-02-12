import React, { useState, useEffect, useRef } from 'react';
import { View, Invoice, Customer, InvoiceItem, NavigationParams } from '../types';
import { db } from '../services/db';
import { convertToWords, formatDisplayDate } from '../utils/helpers';

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
    items: [{ id: Date.now(), details: '', qty: 1, rate: 0, total: 0, len: '', wid: '' }]
  });

  const [bannerMode, setBannerMode] = useState(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prevDueAmount, setPrevDueAmount] = useState(0);
  const memoRef = useRef<HTMLDivElement>(null);

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
    } catch (e) {
      console.error("Stats fetch error:", e);
    }
  };

  const handleCustomerSelect = (name: string) => {
    const cust = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (cust) {
      setFormData(prev => ({ 
        ...prev, 
        client_name: cust.name, 
        client_address: cust.address, 
        client_mobile: cust.mobile 
      }));
    } else {
      setFormData(prev => ({ ...prev, client_name: name }));
    }
    setShowSuggestions(false);
  };

  const loadInitialItems = (items: Partial<InvoiceItem>[]) => {
    const itemsToLoad = items.map(item => ({
      id: Date.now() + Math.random(),
      details: item.details || '',
      qty: item.qty || 1,
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
    if (!formData.client_name) return alert("Fill customer name first");
    if (!formData.invoice_no) return alert("Invoice number is missing");
    
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
        items: formData.items || [],
        in_word: formData.in_word || 'Zero Only.'
      };
      if (formData.id) invoiceToSave.id = formData.id;

      await db.saveInvoice(invoiceToSave);
      refresh();
      return true;
    } catch (err: any) {
      alert("Save failed: " + err.message);
      setIsSaving(false);
      return false;
    }
  };

  const handlePrint = async () => {
    if (isSaving) return;
    const isSaved = await saveInvoice();
    if (!isSaved) return;

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
        setIsSaving(false);
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
                <p className="mt-2 text-danger font-bold font-bengali text-[15px] animate-pulse">
                  আগের মোট বকেয়া: ৳{prevDueAmount.toFixed(2)}
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
                    {bannerMode && <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none bg-gray-50 font-bold" value={item.len || ''} onChange={(e) => handleItemChange(idx, 'len', e.target.value)} /></td>}
                    {bannerMode && <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none bg-gray-50 font-bold" value={item.wid || ''} onChange={(e) => handleItemChange(idx, 'wid', e.target.value)} /></td>}
                    <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none font-bold" value={item.qty || ''} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} /></td>
                    <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-2 py-4 text-center outline-none font-bold" value={item.rate || ''} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} /></td>
                    <td className="p-0 border"><input type="number" onWheel={preventScroll} className="w-full px-4 py-4 text-right outline-none font-black bg-gray-50 text-black text-lg" value={item.total || ''} onChange={(e) => handleItemChange(idx, 'total', e.target.value)} /></td>
                    <td className="p-0 border text-center"><button onClick={() => { const itms = [...formData.items!]; itms.splice(idx, 1); calculateTotals(itms, formData.advance!) }} className="text-gray-400 hover:text-black"><i className="fas fa-trash-alt text-xs"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setFormData(p => ({ ...p, items: [...p.items!, { id: Date.now(), details: '', qty: 1, rate: 0, total: 0, len: '', wid: '' }] }))} className="mt-4 bg-black text-white px-6 py-2.5 rounded-xl font-bold font-bengali uppercase text-xs tracking-widest shadow-md active:scale-95 transition-all"><i className="fas fa-plus mr-1"></i> রো যোগ করুন</button>
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
                value={formData.grand_total?.toFixed(2)} 
                readOnly 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block font-bengali">অ্যাডভান্স পেমেন্ট (৳)</label>
              <input 
                type="number" 
                onWheel={preventScroll}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none font-black focus:ring-2 focus:ring-black/5" 
                value={formData.advance || ''} 
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
              value={formData.due?.toFixed(2)} 
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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row justify-end items-center gap-4 pt-4 pb-10">
           <button 
             onClick={handlePrint} 
             disabled={isSaving}
             className="w-full md:w-auto px-10 py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 active:scale-95 font-bengali"
           >
             <i className="fas fa-print"></i> {isSaving ? 'প্রসেসিং...' : 'প্রিন্ট মেমো'}
           </button>
           <button 
             onClick={async () => {
               const saved = await saveInvoice();
               if (saved) navigateTo(View.Invoices);
             }} 
             disabled={isSaving} 
             className="w-full md:w-auto px-10 py-4 border-2 border-black text-black rounded-xl font-bold flex items-center justify-center gap-2 bg-white hover:bg-black hover:text-white transition-all uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95 font-bengali"
           >
             <i className="fas fa-save"></i> {isSaving ? 'সেভ হচ্ছে...' : (editInvoiceNo ? 'আপডেট করুন' : 'সেভ করুন')}
           </button>
        </div>
      </div>

      {/* Hidden Print Template Rebuilt for consistency with Refined View */}
      <div id="memo-print-template" className="hidden">
        <div ref={memoRef} className="memo-container bg-white text-black font-serif" style={{ width: '148mm', height: '210mm', padding: '10mm', position: 'relative', margin: '0' }}>
          <div className="w-full h-full border-[3px] border-black p-4 flex flex-col box-border bg-white font-serif">
              <div className="flex justify-center mb-3">
                 <div className="border-[2px] border-black px-12 py-1 text-[16px] font-black uppercase tracking-[2px]">CASH MEMO / ক্যাশ মেমো</div>
              </div>
              <div className="text-center">
                <h1 className="text-[26px] font-black uppercase tracking-tight leading-none mb-1">MASTER COMPUTER & PRINTING PRESS</h1>
                <div className="w-full h-[2.5px] bg-black mb-1"></div>
                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-[16px] font-black">Proprietor: S.M. Shahjahan</span>
                  <div className="bg-black text-white px-8 py-1 font-sans font-black tracking-widest text-[17px]">01720-365191</div>
                </div>
                <div className="flex justify-center mb-4">
                  <div className="border-[2px] border-black px-8 py-1 text-[13px] font-black">Primary association Market, Sakhipur, Tangail</div>
                </div>
                <div className="w-full h-[2px] bg-black mb-6"></div>
              </div>
              <div className="space-y-4 mb-6 text-[16px] font-black">
                <div className="flex justify-between items-end">
                   <div className="flex flex-1 items-end">
                      <span className="mr-2">Serial:</span>
                      <div className="flex-1 border-b-[2px] border-black min-h-[22px]">#{formData.invoice_no}</div>
                   </div>
                   <div className="flex flex-1 items-end pl-10">
                      <span className="mr-2">Date:</span>
                      <div className="flex-1 border-b-[2px] border-black text-center min-h-[22px]">{new Date(formData.memo_date || '').toLocaleDateString('en-GB')}</div>
                   </div>
                </div>
                <div className="flex items-end">
                   <span className="mr-2">Name:</span>
                   <div className="flex-1 border-b-[2px] border-black font-bengali text-[18px] min-h-[26px] leading-tight">{formData.client_name}</div>
                   <div className="flex items-end pl-4 w-[45%]">
                      <span className="mr-2">Mobile:</span>
                      <div className="flex-1 border-b-[2px] border-black text-center min-h-[22px]">{formData.client_mobile || '...'}</div>
                   </div>
                </div>
                <div className="flex items-end">
                   <span className="mr-2">Address:</span>
                   <div className="flex-1 border-b-[2px] border-black font-bengali min-h-[24px] leading-tight">{formData.client_address || '...'}</div>
                </div>
              </div>
              <div className="flex-grow">
                <table className="w-full border-collapse border-[2.5px] border-black text-[16px]">
                    <thead>
                      <tr className="border-b-[2.5px] border-black h-10">
                          <th className="border-r-[2.5px] border-black w-14 text-center font-black">SL</th>
                          <th className="border-r-[2.5px] border-black text-center font-black">Work Description</th>
                          <th className="border-r-[2.5px] border-black w-32 text-center font-black">Qty / Size</th>
                          <th className="border-r-[2.5px] border-black w-24 text-center font-black">Rate</th>
                          <th className="w-32 text-center font-black">Total (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="font-black">
                      {formData.items?.map((item, i) => (
                          <tr key={item.id} className="border-b-[2px] border-black h-10 align-middle">
                            <td className="border-r-[2.5px] border-black text-center">{i+1}</td>
                            <td className="border-r-[2.5px] border-black pl-4 font-bengali leading-none py-1">{item.details}</td>
                            <td className="border-r-[2.5px] border-black text-center">{item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}</td>
                            <td className="border-r-[2.5px] border-black text-center">{item.rate || ''}</td>
                            <td className="text-right pr-3">৳{item.total}/-</td>
                          </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 10 - (formData.items?.length || 0)) }).map((_, idx) => (
                         <tr key={`empty-${idx}`} className="border-b-[2px] border-black h-10">
                           <td className="border-r-[2.5px] border-black"></td><td className="border-r-[2.5px] border-black"></td><td className="border-r-[2.5px] border-black"></td><td className="border-r-[2.5px] border-black"></td><td></td>
                         </tr>
                       ))}
                    </tbody>
                </table>
              </div>
              <div className="mt-8">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 border-[2.5px] border-black p-3 h-20 flex flex-col justify-start">
                       <span className="text-[10px] font-black text-gray-500 mb-1">IN WORDS / কথায়:</span>
                       <span className="font-bengali font-black text-[15px] italic leading-tight">{formData.in_word}</span>
                    </div>
                    <div className="w-64 flex flex-col gap-1 text-[16px] font-black">
                       <div className="flex justify-between border-b-[2px] border-black pb-1 mb-1"><span>Total:</span><span>৳{Number(formData.grand_total).toFixed(0)}/-</span></div>
                       <div className="flex justify-between border-b-[2px] border-black pb-1 mb-1"><span>Paid:</span><span>৳{Number(formData.advance).toFixed(0)}/-</span></div>
                       <div className="flex justify-between items-center bg-white border-[2.5px] border-black px-4 py-1.5 font-black text-[22px] mt-1 shadow-[3px_3px_0px_rgba(0,0,0,0.1)]"><span>DUE:</span><span>৳{Number(formData.due).toFixed(0)}/-</span></div>
                    </div>
                </div>
                <div className="mt-16 flex justify-between px-6">
                    <div className="text-center w-56 pt-1 border-t-[2.5px] border-black font-black uppercase text-[12px] font-bengali tracking-wider">CUSTOMER SIGN</div>
                    <div className="text-center w-64 flex flex-col items-center">
                       <span className="font-black italic text-[16px] mb-1">AUTHORITY</span>
                       <div className="w-full pt-1 border-t-[2.5px] border-black font-black uppercase text-[12px] font-bengali tracking-wider">AUTHORIZED SIGN</div>
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