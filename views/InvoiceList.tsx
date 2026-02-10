
import React, { useState } from 'react';
import { View, Invoice } from '../types';
import { formatDisplayDate } from '../utils/helpers';
import { db } from '../services/db';

interface InvoiceListProps {
  invoices: Invoice[];
  navigateTo: (view: View, params?: any) => void;
  refresh: () => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, navigateTo, refresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (inv.invoice_no?.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const isPaid = inv.due <= 0 && inv.grand_total > 0;
    if (statusFilter === 'paid') return matchesSearch && isPaid;
    if (statusFilter === 'unpaid') return matchesSearch && !isPaid;
    return matchesSearch;
  });

  const handleDelete = async (no: string) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete Invoice #${no}?`)) {
      try {
        console.log("InvoiceList: Initiating delete for", no);
        const success = await db.deleteInvoice(no);
        if (success) {
          alert('Invoice deleted successfully');
          refresh(); // Re-fetch data from database
        }
      } catch (err: any) {
        alert('Failed to delete: ' + (err.message || 'Unknown error'));
        console.error("Deletion process failed:", err);
      }
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div><h1 className="text-3xl font-bold text-[#333]">Invoices</h1><p className="text-lightText mt-1">Total {invoices.length} invoices generated.</p></div>
        <button onClick={() => navigateTo(View.CreateInvoice)} className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center"><i className="fas fa-plus mr-2"></i> Create Invoice</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-lightText"></i>
          <input type="text" placeholder="Search by name or serial..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="w-full md:w-48 px-4 py-3 rounded-xl border border-border outline-none cursor-pointer bg-white font-bold" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Records</option>
          <option value="paid">Fully Paid</option>
          <option value="unpaid">Balance Due</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="bg-[#f9fafb] text-left text-[10px] uppercase font-bold text-lightText tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Invoice No.</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Total (৳)</th>
                <th className="px-6 py-4 text-right">Due (৳)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.map((inv) => (
                <tr key={inv.invoice_no} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-primary">#{inv.invoice_no}</td>
                  <td className="px-6 py-4 font-bold font-bengali text-primary cursor-pointer hover:underline" onClick={() => navigateTo(View.InvoiceView, { invoiceNo: inv.invoice_no })}>{inv.client_name}</td>
                  <td className="px-6 py-4 text-sm font-medium">{formatDisplayDate(inv.memo_date)}</td>
                  <td className="px-6 py-4 text-right font-bold">৳{Number(inv.grand_total).toFixed(0)}</td>
                  <td className="px-6 py-4 text-right font-black text-danger">৳{Number(inv.due).toFixed(0)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${inv.due <= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {inv.due <= 0 ? 'Paid' : 'Due'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-1">
                    <button onClick={() => navigateTo(View.InvoiceView, { invoiceNo: inv.invoice_no })} title="View" className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"><i className="fas fa-eye"></i></button>
                    <button onClick={() => navigateTo(View.EditInvoice, { invoiceNo: inv.invoice_no })} title="Edit" className="p-2 text-warning hover:bg-warning/10 rounded-lg transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={() => handleDelete(inv.invoice_no)} title="Delete" className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr><td colSpan={7} className="p-16 text-center text-lightText italic">No records found. Click 'Create Invoice' to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
