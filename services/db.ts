
import { supabase } from '../supabaseClient';
import { Invoice, Customer, Transaction, PendingItem, ActivityLog } from '../types';

export const db = {
  // Invoices
  async getInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_no', { ascending: false });
    if (error) throw error;
    return data as Invoice[];
  },

  async getInvoiceByNo(no: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_no', String(no))
      .maybeSingle();
    if (error) throw error;
    return data as Invoice;
  },

  async saveInvoice(invoice: Invoice) {
    const cleanInvoice = { ...invoice };
    
    cleanInvoice.grand_total = Number(cleanInvoice.grand_total) || 0;
    cleanInvoice.advance = Number(cleanInvoice.advance) || 0;
    cleanInvoice.due = Number(cleanInvoice.due) || 0;
    
    if (!cleanInvoice.id || cleanInvoice.id === "" || cleanInvoice.id === "temp-id") {
      delete cleanInvoice.id;
    }

    const { data, error } = await supabase
      .from('invoices')
      .upsert(cleanInvoice, { onConflict: 'invoice_no' })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase Save Error:", error);
      throw error;
    }
    return data as Invoice;
  },

  async updateInvoicePayment(no: string, advance: number) {
    const { data: current, error: fetchError } = await supabase
      .from('invoices')
      .select('grand_total')
      .eq('invoice_no', String(no))
      .single();

    if (fetchError || !current) throw new Error("Invoice not found: " + no);

    const total = Number(current.grand_total);
    const newAdvance = Number(advance);
    const newDue = Math.max(0, total - newAdvance);
    const isPaid = newDue <= 0;

    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        advance: newAdvance, 
        due: newDue, 
        is_paid: isPaid 
      })
      .eq('invoice_no', String(no))
      .select()
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  async deleteInvoice(no: string) {
    console.log("Database Action: Deleting invoice no:", no);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('invoice_no', String(no));
    
    if (error) {
      console.error("Supabase Delete Error:", error);
      throw error;
    }
    return true;
  },

  // Customers
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Customer[];
  },

  async saveCustomer(customer: Customer) {
    const cleanCustomer = { ...customer };
    if (!cleanCustomer.id || cleanCustomer.id === "") delete cleanCustomer.id;

    const { data, error } = await supabase
      .from('customers')
      .upsert(cleanCustomer, { onConflict: 'name' })
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async deleteCustomer(name: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('name', name);
    if (error) throw error;
    return true;
  },

  // Activity Log
  async logActivity(log: ActivityLog) {
    const { error } = await supabase.from('activity_log').insert(log);
    if (error) console.warn("Log failed:", error);
  },

  async getActivityLog(customerName: string) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('customer_name', customerName)
      .order('date', { ascending: false });
    if (error) throw error;
    return data as ActivityLog[];
  },

  // Transactions
  async getTransactions(customerName: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_name', customerName)
      .order('date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  },

  async addTransaction(transaction: Transaction) {
    const cleanTransaction = { ...transaction };
    if (!cleanTransaction.id || cleanTransaction.id === "") delete cleanTransaction.id;
    const { data, error } = await supabase
      .from('transactions')
      .insert(cleanTransaction)
      .select()
      .single();
    if (error) throw error;
    return data as Transaction;
  },

  // Pending Items
  async getPendingItems(customerName: string) {
    const { data, error } = await supabase
      .from('pending_items')
      .select('*')
      .eq('customer_name', customerName);
    if (error) throw error;
    return data as PendingItem[];
  },

  async addPendingItem(item: PendingItem) {
    const cleanItem = { ...item };
    if (!cleanItem.id || cleanItem.id === "" || typeof cleanItem.id === 'number') {
      delete cleanItem.id;
    }
    const { data, error } = await supabase
      .from('pending_items')
      .insert(cleanItem)
      .select()
      .single();
    if (error) throw error;
    return data as PendingItem;
  },

  async deletePendingItem(id: string | number) {
    const { error } = await supabase
      .from('pending_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
