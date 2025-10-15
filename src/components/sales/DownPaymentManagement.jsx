import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, DollarSign, Calendar, User } from "lucide-react";

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
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDownPayment, setEditingDownPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { toast } = useToast();

  const initialDownPaymentState = {
    customer: '',
    amount: '',
    payment_method: 'CASH',
    reference_number: '',
    transaction_id: '',
    expiry_date: '',
    notes: '',
  };

  const [newDownPayment, setNewDownPayment] = useState(initialDownPaymentState);

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

  useEffect(() => {
    fetchDownPayments();
    fetchCustomers();
  }, []);

  const fetchDownPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/down-payments/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch down payments');
      const data = await response.json();
      setDownPayments(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customers/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDownPayment(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setNewDownPayment(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingDownPayment ? 'PUT' : 'POST';
      const url = editingDownPayment 
        ? `${API_BASE_URL}/sales/down-payments/${editingDownPayment.id}/` 
        : `${API_BASE_URL}/sales/down-payments/`;
      
      const payload = {
        ...newDownPayment,
        customer: parseInt(newDownPayment.customer),
        amount: parseFloat(newDownPayment.amount || 0),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save down payment');
      }

      toast({ title: "Success", description: `Down payment ${editingDownPayment ? 'updated' : 'created'} successfully.` });
      setIsModalOpen(false);
      setNewDownPayment(initialDownPaymentState);
      setEditingDownPayment(null);
      fetchDownPayments();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (downPayment) => {
    setEditingDownPayment(downPayment);
    setNewDownPayment({
      customer: downPayment.customer.toString(),
      amount: downPayment.amount.toString(),
      payment_method: downPayment.payment_method,
      reference_number: downPayment.reference_number || '',
      transaction_id: downPayment.transaction_id || '',
      expiry_date: downPayment.expiry_date || '',
      notes: downPayment.notes || '',
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
    const statusColors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'USED': 'bg-blue-100 text-blue-800',
      'REFUNDED': 'bg-yellow-100 text-yellow-800',
      'EXPIRED': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Down Payment Management</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDownPayment(null);
              setNewDownPayment(initialDownPaymentState);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Down Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDownPayment ? 'Edit Down Payment' : 'Add New Down Payment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select name="customer" value={newDownPayment.customer} onValueChange={(value) => handleSelectChange('customer', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} ({customer.customer_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (IDR) *</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
                    type="number" 
                    step="0.01"
                    value={newDownPayment.amount} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select name="payment_method" value={newDownPayment.payment_method} onValueChange={(value) => handleSelectChange('payment_method', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input 
                    id="expiry_date" 
                    name="expiry_date" 
                    type="date"
                    value={newDownPayment.expiry_date} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input 
                    id="reference_number" 
                    name="reference_number" 
                    value={newDownPayment.reference_number} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transaction_id">Transaction ID</Label>
                  <Input 
                    id="transaction_id" 
                    name="transaction_id" 
                    value={newDownPayment.transaction_id} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  value={newDownPayment.notes} 
                  onChange={handleInputChange} 
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDownPayment ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search by customer name or down payment number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Down Payments Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DP Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDownPayments.map((downPayment) => (
              <TableRow key={downPayment.id}>
                <TableCell className="font-medium">{downPayment.down_payment_number}</TableCell>
                <TableCell>{downPayment.customer_name}</TableCell>
                <TableCell>{new Date(downPayment.payment_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell>{formatRupiah(downPayment.amount)}</TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatRupiah(downPayment.remaining_amount)}
                </TableCell>
                <TableCell>{downPayment.payment_method}</TableCell>
                <TableCell>{getStatusBadge(downPayment.status)}</TableCell>
                <TableCell>
                  {downPayment.expiry_date ? new Date(downPayment.expiry_date).toLocaleDateString('id-ID') : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(downPayment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(downPayment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredDownPayments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No down payments found.
        </div>
      )}
    </div>
  );
};

export default DownPaymentManagement;
