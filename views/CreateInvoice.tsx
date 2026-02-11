
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
    if (!formData.client_name) return alert("Fill customer name first");
    if (!formData.invoice_no) return alert("Invoice number is missing");
    
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
      alert("Save failed: " + err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h3 className="font-bold mb-6 text-primary text-xl border-b pb-2 flex items-center uppercase tracking-tighter">
              <i className="fas fa-user-circle mr-2"></i> Memo Header
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative">
                <label className="text-[10px] font-black text-lightText uppercase mb-1.5 block">Customer Name*</label>
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
              </div>

              <div>
                <label className="text-[10px] font-black text-lightText uppercase mb-1.5 block">Customer Address</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border font-bengali outline-none focus:ring-2 focus:ring-primary/20 bg-white" value={formData.client_address || ''} onChange={(e) => handleInputChange('client_address', e.target.value)} placeholder="Enter address" />
              </div>

              <div>
                <label className="text-[10px] font-black text-lightText uppercase mb-1.5 block">Mobile Number</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 bg-white" value={formData.client_mobile || ''} onChange={(e) => handleInputChange('client_mobile', e.target.value)} placeholder="017xxxxxxxx" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-lightText uppercase mb-1.5 block">Memo Serial</label>
                   <input type="text" className="w-full px-4 py-3 rounded-xl border bg-gray-100 font-black text-center" value={formData.invoice_no} readOnly />
                </div>
                <div>
                  <label className="text-[10px] font-black text-lightText uppercase mb-1.5 block">Memo Date</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white" value={formData.memo_date} onChange={(e) => handleInputChange('memo_date', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-primary text-xl border-b pb-2 flex items-center uppercase tracking-tighter">
                <i className="fas fa-list-ul mr-2"></i> Work Items
              </h3>
              <button onClick={() => setBannerMode(!bannerMode)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${bannerMode ? 'bg-primary text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}>
                {bannerMode ? 'Banner Mode On (Sqft)' : 'Banner Mode Off'}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary text-[10px] uppercase font-black text-lightText tracking-widest text-left">
                    <th className="p-3 border">Description</th>
                    {bannerMode && <th className="p-3 border w-24 text-center">Len</th>}
                    {bannerMode && <th className="p-3 border w-24 text-center">Wid</th>}
                    <th className="p-3 border w-24 text-center">Qty</th>
                    <th className="p-3 border w-24 text-center">Rate</th>
                    <th className="p-3 border w-32 text-right">Total</th>
                    <th className="p-3 border w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {formData.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-0 border">
                        <input className="w-full px-3 py-3 font-bengali font-bold outline-none bg-transparent" value={item.details} onChange={(e) => handleItemChange(idx, 'details', e.target.value)} placeholder="Work description" />
                      </td>
                      {bannerMode && (
                        <td className="p-0 border">
                          <input type="number" className="w-full px-2 py-3 text-center outline-none bg-indigo-50/20" value={item.len || ''} onChange={(e) => handleItemChange(idx, 'len', e.target.value)} placeholder="0" />
                        </td>
                      )}
                      {bannerMode && (
                        <td className="p-0 border">
                          <input type="number" className="w-full px-2 py-3 text-center outline-none bg-indigo-50/20" value={item.wid || ''} onChange={(e) => handleItemChange(idx, 'wid', e.target.value)} placeholder="0" />
                        </td>
                      )}
                      <td className="p-0 border">
                        <input type="number" className="w-full px-2 py-3 text-center outline-none font-bold" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} />
                      </td>
                      <td className="p-0 border">
                        <input type="number" className="w-full px-2 py-3 text-center outline-none font-bold" value={item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} />
                      </td>
                      <td className="p-0 border">
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 text-right outline-none font-black bg-gray-50 text-indigo-700" 
                          value={item.total} 
                          onChange={(e) => handleItemChange(idx, 'total', e.target.value)} 
                        />
                      </td>
                      <td className="p-0 border text-center">
                        <button onClick={() => { const itms = [...formData.items!]; itms.splice(idx, 1); calculateTotals(itms, formData.advance!) }} className="text-danger hover:scale-125 transition-transform"><i className="fas fa-trash-alt text-xs"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-4">
              <button onClick={() => setFormData(p => ({ ...p, items: [...p.items!, { id: Date.now(), details: '', qty: 1, rate: 0, total: 0, len: '', wid: '' }] }))} className="bg-primary/10 text-primary px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                <i className="fas fa-plus mr-1"></i> Add new row
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6 no-print">
           <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
              <h4 className="font-black mb-4 text-primary uppercase tracking-tighter border-b pb-2 flex items-center">
                <i className="fas fa-receipt mr-2"></i> Financial Summary
              </h4>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-lightText uppercase mb-1 block">Total Amount</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border bg-gray-50 font-black text-xl" value={`৳${formData.grand_total?.toFixed(0)}`} readOnly />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-lightText uppercase mb-1 block">Advance Paid</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl border font-black text-xl text-success outline-none focus:ring-2 focus:ring-success/20" value={formData.advance || ''} onChange={(e) => handleInputChange('advance', e.target.value)} placeholder="0" />
                 </div>
                 <div className="p-4 bg-danger/5 rounded-xl border border-danger/10">
                    <label className="text-[10px] font-black text-danger uppercase mb-1 block">Total Due</label>
                    <div className="text-3xl font-black text-danger tracking-tighter">৳{formData.due?.toFixed(0)}</div>
                 </div>
              </div>
           </div>
           
           <div className="sticky top-24 space-y-3">
              <button onClick={handlePrint} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs">
                <i className="fas fa-print text-lg"></i> Print Memo
              </button>
              <button onClick={saveInvoice} disabled={isSaving} className="w-full py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs">
                <i className="fas fa-save text-lg"></i> {isSaving ? 'Saving...' : 'Save & Close'}
              </button>
           </div>
        </div>
      </div>

      {/* PRINT TEMPLATE - GRAYSCALE / BLACK ONLY */}
      <div id="memo-print-template" className="hidden">
        <div ref={memoRef} className="memo-container bg-white text-black font-serif" style={{ width: '148mm', height: '210mm', padding: '5mm', position: 'relative' }}>
           <div className="w-full h-full border-2 border-black p-3 flex flex-col box-border">
              
              {/* Higher Cash Memo Label */}
              <div className="flex justify-center -mt-1 mb-3">
                 <div className="border-2 border-black px-8 py-1.5 text-[14px] font-black uppercase tracking-[3px]">
                    CASH MEMO / ক্যাশ মেমো
                 </div>
              </div>

              {/* Company Header - Standard Black */}
              <div className="text-center">
                 <h1 className="text-[21px] font-black uppercase tracking-tight leading-none mb-2">
                    MASTER COMPUTER & PRINTING PRESS
                 </h1>
                 
                 <div className="border-t-2 border-black mt-1 mb-1"></div>

                 <div className="flex justify-between items-center px-1 py-0.5 font-bold text-[14px]">
                    <span>Proprietor: S.M. Shahjahan</span>
                    <div className="bg-black text-white px-5 py-0.5 rounded-sm font-sans font-black tracking-widest text-[14px]">
                       01720-365191
                    </div>
                 </div>

                 <div className="flex justify-center mt-1">
                    <div className="border-2 border-black px-6 py-0.5 text-[12px] font-bold">
                       Primary association Market, Sakhipur, Tangail
                    </div>
                 </div>
                 <div className="border-t-2 border-black mt-2 mb-4"></div>
              </div>

              {/* Client Info Grid - All Black */}
              <div className="grid grid-cols-12 gap-y-2 mb-4 text-[14px] font-bold">
                 <div className="col-span-7 space-y-1">
                    <div className="flex items-end">
                       <span className="w-16">Serial:</span>
                       <span className="border-b border-black flex-1 pl-2 pb-0 font-black">#{formData.invoice_no}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-16">Name:</span>
                       <span className="border-b border-black flex-1 pl-2 pb-0 font-black">{formData.client_name}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-16">Address:</span>
                       <span className="border-b border-black flex-1 pl-2 pb-0 font-medium">{formData.client_address || '...'}</span>
                    </div>
                 </div>
                 <div className="col-span-5 space-y-1">
                    <div className="flex items-end justify-end">
                       <span className="mr-3">Date:</span>
                       <span className="border-b border-black flex-1 text-center pb-0 font-black">{new Date(formData.memo_date || '').toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-end justify-end font-sans">
                       <span className="mr-3">Mobile:</span>
                       <span className="border-b border-black flex-1 text-center pb-0 font-black">{formData.client_mobile || '...'}</span>
                    </div>
                 </div>
              </div>

              {/* Table - Equal widths for Qty/Rate */}
              <div className="flex-grow">
                 <table className="w-full border-collapse border-2 border-black text-[14px]">
                    <thead>
                       <tr className="border-b-2 border-black h-8 bg-white">
                          <th className="border-r-2 border-black w-10 text-center">SL</th>
                          <th className="border-r-2 border-black text-center">Work Description</th>
                          <th className="border-r-2 border-black w-24 text-center">Qty / Size</th>
                          <th className="border-r-2 border-black w-24 text-center">Rate</th>
                          <th className="w-24 text-center">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {formData.items?.map((item, i) => (
                          <tr key={item.id} className="border-b border-black h-8 align-middle">
                             <td className="border-r-2 border-black text-center">{i+1}</td>
                             <td className="border-r-2 border-black pl-3 font-bengali leading-none">{item.details}</td>
                             <td className="border-r-2 border-black text-center font-sans">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}
                             </td>
                             <td className="border-r-2 border-black text-center">{item.rate || ''}</td>
                             <td className="text-right pr-3 font-sans">৳{item.total}/-</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Summary and Signature at Bottom - No Colors */}
              <div className="mt-4">
                 <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-7">
                       <div className="border-2 border-black p-2 h-16 flex flex-col justify-between">
                          <div className="text-[10px] uppercase font-black text-gray-500 mb-1">কথায় / IN WORDS:</div>
                          <div className="italic text-[14px] font-black font-bengali leading-tight truncate">
                             {convertToWords((Number(formData.grand_total) || 0) + (includePreviousDue ? prevDueAmount : 0))}
                          </div>
                       </div>
                    </div>
                    <div className="col-span-5">
                       <div className="border-l-4 border-black pl-4 space-y-0.5 text-[14px]">
                          <div className="flex justify-between items-center py-0.5 border-b border-black font-bold">
                             <span>Total:</span>
                             <span className="font-black">৳{(Number(formData.grand_total) || 0) + (includePreviousDue ? prevDueAmount : 0)}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 border-b border-black font-bold">
                             <span>Paid:</span>
                             <span className="font-black">৳{Number(formData.advance).toFixed(0)}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-2 bg-white border border-black font-black text-[16px] mt-1">
                             <span>DUE:</span>
                             <span>৳{((Number(formData.due) || 0) + (includePreviousDue ? prevDueAmount : 0)).toFixed(0)}/-</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Signature Section - Black Only */}
                 <div className="mt-10 flex justify-between items-end px-4 text-[13px] font-black uppercase tracking-wider">
                    <div className="text-center w-40 border-t-2 border-black pt-1">
                       Customer Sign
                    </div>
                    <div className="text-center w-48 relative">
                       <div className="text-[14px] font-black italic tracking-tighter mb-0.5 text-black">Authority</div>
                       <div className="border-t-2 border-black pt-1">
                          Authorized Sign
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
