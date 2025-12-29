import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card"; // +++
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, DollarSign, Calendar, User, Search } from "lucide-react";
import { Badge } from "../ui/badge";
import CustomerSearchDropdown from './CustomerSearchDropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Format currency to Indonesian Rupiah
const formatRupiah = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const DownPaymentManagement = () => {
  const [downPayments, setDownPayments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDownPayment, setEditingDownPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { toast } = useToast();

  const initialDownPaymentState = {
    customer: '', // Akan menyimpan ID
    customer_name: '', // Akan menyimpan nama untuk ditampilkan
    amount: '',
    payment_date: new Date().toISOString().split('T')[0], // +++ Default ke hari ini
    payment_method: 'CASH',
    notes: '',
  };

  const [formData, setFormData] = useState(initialDownPaymentState);

  const paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' },
    { value: 'E_WALLET', label: 'E-Wallet' },
    { value: 'CHECK', label: 'Check' },
    { value: 'OTHER', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'USED', label: 'Used' },
    { value: 'REFUNDED', label: 'Refunded' },
    { value: 'EXPIRED', label: 'Expired' },
  ];

 const fetchDownPayments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`${API_BASE_URL}/sales/down-payments/?${params.toString()}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch down payments');
      const data = await response.json();
      setDownPayments(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, toast]); // +++ Tambahkan dependency

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDownPayments();
    }, 500); // Debounce
    return () => clearTimeout(handler);
  }, [fetchDownPayments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.amount) {
      toast({ title: "Validation Error", description: "Customer and Amount are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingDownPayment ? 'PUT' : 'POST';
      const url = editingDownPayment 
        ? `${API_BASE_URL}/sales/down-payments/${editingDownPayment.id}/` 
        : `${API_BASE_URL}/sales/down-payments/`;
      
      const payload = {
        customer: formData.customer, // Kirim ID
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      toast({ title: "Success", description: `Down payment ${editingDownPayment ? 'updated' : 'saved'} successfully.` });
      setIsModalOpen(false);
      fetchDownPayments(); // Refresh data
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dp) => {
    setEditingDownPayment(dp);
    setFormData({
      customer: dp.customer,
      customer_name: dp.customer_name,
      amount: dp.amount.toString(),
      payment_date: dp.payment_date,
      payment_method: dp.payment_method,
      notes: dp.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this down payment?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/down-payments/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete down payment');
      toast({ title: "Success", description: "Down payment deleted successfully." });
      fetchDownPayments();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredDownPayments = downPayments.filter(dp => {
    const matchesSearch = dp.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dp.down_payment_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || dp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      'UNAPPLIED': 'bg-green-100 text-green-800',
      'APPLIED': 'bg-blue-100 text-blue-800',
      'REFUNDED': 'bg-yellow-100 text-yellow-800',
    }[status] || 'bg-gray-100 text-gray-800';
    return <Badge className={config}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Down Payment Management</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDownPayment(null);
              setFormData(initialDownPaymentState);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Down Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDownPayment ? 'Edit Down Payment' : 'Add New Down Payment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* +++ Form yang sudah ditata ulang +++ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <CustomerSearchDropdown
                    value={formData.customer_name}
                    onSelect={(customer) => {
                      setFormData(prev => ({
                        ...prev,
                        customer: customer.id,
                        customer_name: customer.name
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (IDR) *</Label>
                  <Input id="amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Date</Label>
                  <Input id="payment_date" name="payment_date" type="date" value={formData.payment_date} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select name="payment_method" value={formData.payment_method} onValueChange={(value) => handleSelectChange('payment_method', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingDownPayment ? 'Update' : 'Create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Down Payments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by DP number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* +++ Tabel Data dalam Card +++ */}
      <Card>
        <CardHeader>
          <CardTitle>Down Payment List</CardTitle>
          <CardDescription>List of all recorded customer down payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DP Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : downPayments.length > 0 ? (
                  downPayments.map((dp) => (
                    <TableRow key={dp.id}>
                      <TableCell className="font-medium">{dp.dp_number}</TableCell>
                      <TableCell>{dp.customer_name}</TableCell>
                      <TableCell>{new Date(dp.payment_date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="text-right font-semibold">{formatRupiah(dp.amount)}</TableCell>
                      <TableCell>{getStatusBadge(dp.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(dp)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-500" onClick={() => handleDelete(dp.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No down payments found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DownPaymentManagement;
