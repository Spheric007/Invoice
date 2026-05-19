
// Fix: Corrected broken import statement and removed accidental interface paste
import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { View, Invoice } from '../types';
import { db } from '../services/db';
import { formatDisplayDate, convertToWords } from '../utils/helpers';

interface InvoiceDetailsProps {
  invoiceNo: string | null;
  navigateTo: (view: View, params?: any) => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceNo, navigateTo }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const manualMemoRef = useRef<HTMLDivElement>(null);
  const modernMemoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoiceNo) {
      db.getInvoiceByNo(invoiceNo).then(inv => {
        setInvoice(inv);
      }).catch(console.error);
    }
  }, [invoiceNo]);

  const handlePrint = () => {
    const printRoot = document.getElementById('print-root');
    const memoContent = manualMemoRef.current;
    
    if (printRoot && memoContent) {
      printRoot.innerHTML = '';
      const clone = memoContent.cloneNode(true) as HTMLElement;
      clone.style.marginLeft = 'auto';
      clone.style.marginRight = '0'; 
      clone.style.boxShadow = 'none';
      clone.style.display = 'block';
      printRoot.appendChild(clone);

      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const handleDownloadPNG = async () => {
    if (modernMemoRef.current) {
      try {
        const memo = modernMemoRef.current;
        const canvas = await html2canvas(memo, { 
          scale: 3, 
          useCORS: true, 
          backgroundColor: "#ffffff",
          width: memo.offsetWidth,
          height: memo.offsetHeight
        });
        
        const link = document.createElement('a');
        link.download = `Invoice_${invoiceNo}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (e) {
        console.error(e);
        alert("Download failed.");
      }
    }
  };

  if (!invoice) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4">
        <button onClick={() => navigateTo(View.Invoices, { skipScrollTop: true })} className="text-lightText hover:text-black transition-colors flex items-center font-bold font-bengali">
          <i className="fas fa-arrow-left mr-2"></i> ইনভয়েস লিস্টে ফিরে যান
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrint} className="bg-black text-white px-6 py-2.5 rounded-xl font-black flex items-center shadow-lg hover:scale-105 transition-transform font-bengali"><i className="fas fa-print mr-2"></i> প্রিন্ট মেমো</button>
          <button onClick={handleDownloadPNG} className="bg-gray-200 text-black px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-gray-300 transition-colors font-bengali"><i className="fas fa-image mr-2"></i> ছবি ডাউনলোড</button>
          <button onClick={() => navigateTo(View.EditInvoice, { invoiceNo: invoice.invoice_no })} className="bg-white border-2 border-black text-black px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-black hover:text-white transition-all font-bengali"><i className="fas fa-edit mr-2"></i> এডিট করুন</button>
        </div>
      </div>

      {/* Hidden container for the print version (traditional memo) */}
      <div style={{ position: 'absolute', left: '-9000px', top: '-9000px' }}>
        <div ref={manualMemoRef} className="bg-white text-black font-serif" style={{ width: '150mm', height: '214mm', padding: '8mm', position: 'relative' }}>
           <div className="w-full h-full border-[3px] border-black p-3 flex flex-col box-border bg-white font-serif">
              <div className="flex justify-center mb-1.5">
                 <div className="border-[1.5px] border-black px-6 py-0 text-[10px] font-black uppercase tracking-[1px]">CASH MEMO / ক্যাশ মেমো</div>
              </div>
              <div className="text-center">
                 <h1 className="text-[15px] md:text-[17px] font-black uppercase tracking-tight leading-tight mb-0.5 text-center w-full">MASTER COMPUTER & PRINTING PRESS</h1>
                 <div className="w-full border-b-[2px] border-black mb-1"></div>
                 <div className="flex justify-between items-center px-1 mb-0.5">
                    <span className="text-[12px] font-black">Proprietor: S.M. Shahjahan</span>
                    <div className="bg-black text-white px-3 py-0.5 font-sans font-black tracking-widest text-[12px]">01720-365191</div>
                 </div>
                 <div className="flex justify-center mb-0.5">
                    <div className="border-[1.5px] border-black px-3 py-0.5 text-[10px] font-black">Primary association Market, Sakhipur, Tangail</div>
                 </div>
                 <div className="w-full border-b-[1.5px] border-black mb-0.5"></div>
              </div>
              <div className="space-y-0.5 mb-0.5 text-[12px] font-black">
                <div className="flex justify-between items-end">
                   <div className="flex flex-1 items-end">
                      <span className="mr-2 whitespace-nowrap">Serial:</span>
                      <div className="flex-1 border-b-[1.5px] border-black pb-[1px] px-2 min-h-[18px]">#{invoice.invoice_no}</div>
                   </div>
                   <div className="flex flex-1 items-end pl-6">
                      <span className="mr-2 whitespace-nowrap">Date:</span>
                      <div className="flex-1 border-b-[1.5px] border-black text-center pb-[1px] px-2 min-h-[18px]">{formatDisplayDate(invoice.memo_date)}</div>
                   </div>
                </div>
                <div className="flex items-end">
                   <span className="w-14 shrink-0">Name:</span>
                   <div className="flex-1 border-b-[1.5px] border-black pb-[1px] px-2 font-bengali text-[15px] leading-tight min-h-[22px]">{invoice.client_name}</div>
                </div>
                <div className="flex items-end">
                   <span className="w-14 shrink-0">Address:</span>
                   <div className="flex-1 border-b-[1.5px] border-black pb-[1px] px-2 font-bengali min-h-[20px] leading-tight text-[12px]">{invoice.client_address || '...'}</div>
                </div>
                {invoice.client_mobile && (
                  <div className="flex items-end">
                    <span className="w-14 shrink-0">Mobile:</span>
                    <div className="flex-1 border-b-[1.5px] border-black pb-[1px] px-2 min-h-[18px] font-sans">{invoice.client_mobile}</div>
                  </div>
                )}
              </div>
              <div className="w-full border-b-[1.5px] border-black mb-1"></div>
              <div className="flex-grow overflow-hidden">
                 <table className="w-full border-collapse border-[2px] border-black text-[12px]">
                    <thead>
                       <tr className="border-b-[2px] border-black h-6 align-middle">
                          <th className="border-r-[2px] border-black w-8 text-center font-black">SL</th>
                          <th className="border-r-[2px] border-black text-center font-black">Description</th>
                          <th className="border-r-[2px] border-black w-20 text-center font-black text-[10px]">Qty / Size</th>
                          <th className="border-r-[2px] border-black w-14 text-center font-black">Rate</th>
                          <th className="w-20 text-center font-black">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {invoice.items.slice(0, 12).map((item, i) => (
                          <tr key={i} className="border-b-[1px] border-black h-[19px] align-middle">
                             <td className="border-r-[2px] border-black text-center text-[10px]">{i+1}</td>
                             <td className="border-r-[2px] border-black pl-2 font-bengali leading-none py-0.5 text-[11px] truncate max-w-[200px]">{item.details}</td>
                             <td className="border-r-[2px] border-black text-center text-[10px]">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}
                             </td>
                             <td className="border-r-[2px] border-black text-center">{item.rate || ''}</td>
                             <td className="text-right pr-2">৳{item.total}/-</td>
                          </tr>
                       ))}
                       {/* Padding rows if needed */}
                       {Array.from({ length: Math.max(0, 12 - invoice.items.length) }).map((_, i) => (
                          <tr key={`p-${i}`} className="border-b-[1px] border-black h-[19px] align-middle">
                             <td className="border-r-[2px] border-black"></td>
                             <td className="border-r-[2px] border-black"></td>
                             <td className="border-r-[2px] border-black"></td>
                             <td className="border-r-[2px] border-black"></td>
                             <td className=""></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              <div className="mt-auto pt-0.5">
                 <div className="flex justify-between items-end gap-2">
                    <div className="flex-1 border-[2px] border-black p-1 min-h-[36px] flex flex-col justify-start">
                       <span className="text-[8px] font-black text-gray-500 mb-0.5 uppercase">In Words / কথায়:</span>
                       <span className="font-bengali font-black text-[10px] italic leading-tight">{convertToWords(Number(invoice.grand_total))}</span>
                    </div>
                    <div className="w-40 flex flex-col gap-0.5 text-[11px] font-black">
                       <div className="flex justify-between border-b-[1px] border-black pb-0.5"><span>Total:</span><span>৳{Number(invoice.grand_total).toFixed(0)}/-</span></div>
                       <div className="flex justify-between border-b-[1px] border-black pb-0.5"><span>Paid:</span><span>৳{Number(invoice.advance).toFixed(0)}/-</span></div>
                       <div className="flex justify-between items-center bg-white border-[2px] border-black px-2 py-0.5 mt-0.5 font-black text-[13px]"><span>DUE:</span><span>৳{Number(invoice.due).toFixed(0)}/-</span></div>
                    </div>
                 </div>
                 <div className="mt-1 flex flex-col items-center"><p className="text-[6px] font-bold text-gray-600 italic">This is an electronically generated invoice.</p></div>
              </div>
           </div>
        </div>
      </div>

      {/* Modern Preview Section (Screen and Download) */}
      <div className="flex justify-end bg-secondary/30 p-4 md:p-10 rounded-3xl overflow-x-auto">
        <div ref={modernMemoRef} className="bg-white text-gray-800 p-8 md:p-12 w-[210mm] min-h-[297mm] shadow-2xl mx-auto md:mr-0 flex flex-col font-sans relative box-border">
          
          {/* Modern Header */}
          <div className="text-center mb-6">
            <div className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Cash Memo</div>
            <h1 className="text-xl md:text-3xl font-black text-black mb-2 tracking-tight font-serif uppercase leading-tight">Master Computer & Printing Press</h1>
            <p className="text-[10px] md:text-sm text-gray-600 font-medium mb-0.5">All types of composing, graphic design, and printing work are done here.</p>
            <p className="text-[10px] md:text-sm text-gray-900 font-black">Primary association Market, Sakhipur, Tangail | 01720-365191</p>
            <div className="h-[2px] bg-black mt-4 w-full opacity-100"></div>
          </div>

          {/* Client & Invoice Info - Compact */}
          <div className="flex justify-between mb-8 gap-4">
            <div className="flex-1">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Bill To:</div>
              <h2 className="text-xl md:text-2xl font-black text-black font-bengali leading-tight mb-1">{invoice.client_name}</h2>
              <p className="text-xs md:text-sm text-gray-600 font-bengali max-w-sm leading-tight">{invoice.client_address || 'Address not provided'}</p>
              {invoice.client_mobile && <p className="text-xs md:text-sm text-gray-500 font-bold mt-1">Mobile: {invoice.client_mobile}</p>}
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Invoice Details:</div>
              <div className="text-sm md:text-base font-black text-black mb-1 flex justify-end items-center gap-2">
                Invoice No: <span className="text-indigo-600">#{invoice.invoice_no}</span>
              </div>
              <div className="text-sm md:text-base font-black text-black">
                Date: {formatDisplayDate(invoice.memo_date)}
              </div>
            </div>
          </div>

          {/* Modern Table - Very Compact to fit 12 items */}
          <div className="flex-grow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-2 py-2 text-[9px] uppercase font-black text-center w-12 border border-gray-800">SL</th>
                  <th className="px-3 py-2 text-[9px] uppercase font-black text-left border border-gray-800">DESCRIPTION</th>
                  <th className="px-3 py-2 text-[9px] uppercase font-black text-center w-32 border border-gray-800">QUANTITY</th>
                  <th className="px-3 py-2 text-[9px] uppercase font-black text-center w-24 border border-gray-800">RATE (৳)</th>
                  <th className="px-3 py-2 text-[9px] uppercase font-black text-right w-32 border border-gray-800">TOTAL (৳)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-x border-b border-gray-200">
                    <td className="px-2 py-1.5 text-center font-bold text-gray-500 border-r border-gray-200 text-[11px]">{i + 1}</td>
                    <td className="px-3 py-1.5 font-bengali font-bold text-gray-800 border-r border-gray-200 text-[13px] leading-none">{item.details}</td>
                    <td className="px-3 py-1.5 text-center text-gray-600 border-r border-gray-200 font-medium text-[12px] whitespace-nowrap">
                      {item.len && item.wid ? `${item.len}'x${item.wid}' (${item.qty})` : (item.qty || '-')}
                    </td>
                    <td className="px-3 py-1.5 text-center text-gray-600 border-r border-gray-200 font-medium text-[12px]">{item.rate || '0'}</td>
                    <td className="px-3 py-1.5 text-right font-black text-gray-900 text-[13px]">{Number(item.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {/* Pad with empty rows to fill space if needed or just let it be */}
              </tbody>
            </table>
          </div>

          {/* Words and Totals - Compact */}
          <div className="mt-8 flex justify-between items-start gap-8">
            <div className="flex-1">
              <div className="border-l-4 border-indigo-600 pl-4 py-1.5 bg-indigo-50/30">
                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">AMOUNT IN WORDS:</div>
                <div className="text-sm font-black text-black italic">
                   {convertToWords(Number(invoice.grand_total || 0))} Only.
                </div>
              </div>
            </div>
            
            <div className="w-56 space-y-2">
              <div className="flex justify-between items-center text-gray-500 border-b border-gray-50 pb-1">
                <span className="font-bold uppercase text-[9px] tracking-widest">Subtotal:</span>
                <span className="text-base font-black text-gray-800 tracking-tighter">৳{Number(invoice.grand_total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-600 border-b border-gray-50 pb-1">
                <span className="font-bold uppercase text-[9px] tracking-widest">Advance Paid:</span>
                <span className="text-base font-black tracking-tighter">৳{Number(invoice.advance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600 pt-1 relative">
                <span className="text-sm font-black uppercase tracking-wider">Total Due:</span>
                <span className="text-xl font-black tracking-tighter">৳{Number(invoice.due || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature Section - More Compact */}
          <div className="mt-16 flex justify-between gap-16">
             <div className="text-center flex-1">
                <div className="w-full border-b border-gray-200 mb-2 opacity-50"></div>
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer Signature</div>
             </div>
             <div className="text-center flex-1">
                <div className="w-full border-b-2 border-black mb-2"></div>
                <div className="text-sm font-black text-black mb-0.5">Authorized Signature</div>
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Master Computer & Printing Press</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
