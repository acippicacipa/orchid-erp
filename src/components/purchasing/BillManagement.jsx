import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Plus, Edit, Trash2, DollarSign, FileText } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Fungsi bantuan (bisa diimpor dari file utilitas )
const formatRupiah = (amount) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseFloat(amount));
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const SupplierSearchDropdown = ({ value, onSelect, placeholder = "Search suppliers...", disabled = false }) => {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const displayValue = value || searchTerm;

  const searchSuppliers = async (query) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/purchasing/suppliers/?search=${query}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      }
    } catch (error) {
      console.error("Failed to search suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      searchSuppliers(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, token]);

  const handleSelect = (supplier) => {
    onSelect(supplier);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (value) {
      onSelect({ id: '', name: '' });
    }
  };

  const handleFocus = (event) => {
    if (!disabled) {
      event.target.select();
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        disabled={disabled}
      />
      {showDropdown && !disabled && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(supplier => (
              <div key={supplier.id} className="p-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelect(supplier)}>
                <div className="font-medium">{supplier.name}</div>
                <div className="text-sm text-gray-500">{supplier.email || 'No Email'}</div>
              </div>
            ))
          ) : (
            searchTerm.length >= 2 && <div className="p-2 text-center text-sm text-gray-500">No suppliers found.</div>
          )}
        </div>
      )}
    </div>
  );
};

const BillManagement = () => {
  const [bills, setBills] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // State untuk dialog
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // State untuk data yang sedang diproses
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);

  // State untuk form
  const [billFormData, setBillFormData] = useState({
    supplier: '',
    supplier_name: '', // Untuk menampilkan nama di dropdown
    purchase_order: '',
    due_date: '',
    total_amount: '',
    notes: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    transaction_id: '',
    notes: ''
  });

  // State untuk filter
  const [filters, setFilters] = useState({ bill_number: '', supplier_name: '' });

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.bill_number) params.append('bill_number__icontains', filters.bill_number);
      if (filters.supplier_name) params.append('supplier__name__icontains', filters.supplier_name);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/purchasing/bills/${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch bills');
      const data = await response.json();
      setBills(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBills();
    }, 500); // Debounce
    return () => clearTimeout(handler);
  }, [fetchBills]);

  // Fetch data pendukung hanya sekali saat komponen dimuat
  useEffect(() => {
    const fetchSupportingData = async () => {
      try {
        const token = localStorage.getItem('token');
        const poRes = await fetch(`${API_BASE_URL}/purchasing/purchase-orders/?status=RECEIVED`, { headers: { 'Authorization': `Token ${token}` } });
        const poData = await poRes.json();
        setPurchaseOrders(Array.isArray(poData.results) ? poData.results : []);
      } catch (error) {
        toast({ title: "Error", description: "Failed to fetch supporting data.", variant: "destructive" });
      }
    };
    fetchSupportingData();
  }, [toast]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetBillForm = () => {
    setEditingBill(null);
    setBillFormData({ supplier: '', purchase_order: '', due_date: '', total_amount: '', notes: '' });
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    
    // ==============================================================================
    // PERBAIKAN #1: Tambahkan validasi di frontend
    // ==============================================================================
    if (!billFormData.supplier) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier.",
        variant: "destructive",
      });
      return; // Hentikan eksekusi jika supplier kosong
    }

    const url = editingBill ? `${API_BASE_URL}/purchasing/bills/${editingBill.id}/` : `${API_BASE_URL}/purchasing/bills/`;
    const method = editingBill ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('token');
      const totalAmount = parseFloat(billFormData.total_amount) || 0;

      // ==============================================================================
      // PERBAIKAN #2: Bangun payload dengan benar
      // ==============================================================================
      const payload = {
        ...billFormData,
        total_amount: totalAmount,
        // Saat membuat bill baru, balance_due sama dengan total_amount
        balance_due: totalAmount 
      };
      delete payload.supplier_name; // Hapus field UI

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Tampilkan pesan error yang lebih detail
        const errorMessage = Object.entries(errorData).map(([key, value]) => `${key}: ${value.join(', ')}`).join('; ');
        throw new Error(errorMessage || 'Failed to save bill');
      }

      toast({ title: "Success", description: `Bill ${editingBill ? 'updated' : 'created'} successfully.` });
      setIsBillDialogOpen(false);
      fetchBills();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditClick = (bill) => {
    setEditingBill(bill);
    setBillFormData({
      supplier: bill.supplier,
      supplier_name: bill.supplier_name, // Isi nama supplier
      purchase_order: bill.purchase_order || '',
      due_date: bill.due_date,
      total_amount: bill.total_amount,
      notes: bill.notes || ''
    });
    setIsBillDialogOpen(true);
  };

  const handlePaymentClick = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentFormData({
      amount: bill.balance_due,
      payment_method: 'BANK_TRANSFER',
      transaction_id: '',
      notes: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token');
        const payload = {
            ...paymentFormData,
            bill: selectedBillForPayment.id,
            amount: parseFloat(paymentFormData.amount)
        };
        const response = await fetch(`${API_BASE_URL}/purchasing/supplier-payments/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }
        toast({ title: "Success", description: "Payment recorded successfully." });
        setIsPaymentDialogOpen(false);
        fetchBills();
    } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'OVERDUE': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-red-200 text-red-900'
    }[status] || 'bg-gray-100 text-gray-800';
    return <Badge className={config}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold tracking-tight">Bill Management</h2>
        <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetBillForm}><Plus className="mr-2 h-4 w-4" /> Create Bill</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBill ? 'Edit Bill' : 'Create New Bill'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBillSubmit} className="space-y-4 py-4">
              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <SupplierSearchDropdown
                    value={billFormData.supplier_name}
                    onSelect={(supplier) => {
                      setBillFormData(prev => ({
                        ...prev,
                        supplier: supplier.id,
                        supplier_name: supplier.name
                      }));
                    }}
                    placeholder="Search and select supplier..."
                    disabled={!!editingBill} // Nonaktifkan saat edit
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Order (Optional)</Label>
                  <Select value={billFormData.purchase_order} onValueChange={(v) => setBillFormData(p => ({...p, purchase_order: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                    <SelectContent>{purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.order_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" required value={billFormData.due_date} onChange={(e) => setBillFormData(p => ({...p, due_date: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input type="number" required step="0.01" value={billFormData.total_amount} onChange={(e) => setBillFormData(p => ({...p, total_amount: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={billFormData.notes} onChange={(e) => setBillFormData(p => ({...p, notes: e.target.value}))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingBill ? 'Update Bill' : 'Create Bill'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      {selectedBillForPayment && (
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for Bill {selectedBillForPayment.bill_number}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-4 bg-muted rounded-md text-sm">
                        <p><strong>Supplier:</strong> {selectedBillForPayment.supplier_name}</p>
                        <p><strong>Balance Due:</strong> <span className="font-bold">{formatRupiah(selectedBillForPayment.balance_due)}</span></p>
                    </div>
                    <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Amount</Label>
                                <Input type="number" required max={selectedBillForPayment.balance_due} value={paymentFormData.amount} onChange={(e) => setPaymentFormData(p => ({...p, amount: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select required value={paymentFormData.payment_method} onValueChange={(v) => setPaymentFormData(p => ({...p, payment_method: v}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Transaction ID / Ref</Label>
                            <Input value={paymentFormData.transaction_id} onChange={(e) => setPaymentFormData(p => ({...p, transaction_id: e.target.value}))} />
                        </div>
                    </form>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" form="payment-form">Record Payment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {/* Filter UI */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Filter Bills</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Input name="bill_number" placeholder="Search by Bill Number..." value={filters.bill_number} onChange={handleFilterChange} />
            <Input name="supplier_name" placeholder="Search by Supplier Name..." value={filters.supplier_name} onChange={handleFilterChange} />
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : bills.length > 0 ? (
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                    <TableCell>{bill.supplier_name}</TableCell>
                    <TableCell>{formatDate(bill.due_date)}</TableCell>
                    <TableCell>{getStatusBadge(bill.status)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(bill.total_amount)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatRupiah(bill.balance_due)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(bill)}><Edit className="h-4 w-4" /></Button>
                        {bill.status !== 'PAID' && <Button variant="outline" size="sm" onClick={() => handlePaymentClick(bill)}><DollarSign className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No bills found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillManagement;
