import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Plus, Edit, Trash2, FileText, Calendar, User, AlertTriangle, DollarSign } from 'lucide-react';
import { useToast } from '../ui/use-toast';

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

const InvoiceManagementWithDP = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customerDownPayments, setCustomerDownPayments] = useState([]);
  const [selectedDownPayments, setSelectedDownPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customer: '',
    sales_order: '',
    due_date: '',
    status: 'DRAFT',
    subtotal: '0',
    discount_amount: '0',
    tax_amount: '0',
    total_amount: '0',
    down_payment_amount: '0',
    final_amount: '0',
    payment_terms: 'Net 30 days',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    if (formData.customer) {
      fetchCustomerDownPayments(formData.customer);
    } else {
      setCustomerDownPayments([]);
      setSelectedDownPayments([]);
    }
  }, [formData.customer]);

  useEffect(() => {
    calculateTotals();
  }, [formData.subtotal, formData.discount_amount, formData.tax_amount, selectedDownPayments]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/invoices/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.results || []);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customers/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.results || []);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch customers", variant: "destructive" });
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.results || []);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch sales orders", variant: "destructive" });
    }
  };

  const fetchCustomerDownPayments = async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/down-payments/?customer=${customerId}&status=ACTIVE`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const availableDP = (data.results || []).filter(dp => dp.remaining_amount > 0);
        setCustomerDownPayments(availableDP);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch down payments", variant: "destructive" });
    }
  };

  const calculateTotals = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const discount = parseFloat(formData.discount_amount) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    
    const totalAmount = subtotal - discount + tax;
    
    const totalDownPayment = selectedDownPayments.reduce((sum, dp) => sum + parseFloat(dp.amount_to_use || 0), 0);
    
    const finalAmount = totalAmount - totalDownPayment;

    setFormData(prev => ({
      ...prev,
      total_amount: totalAmount.toString(),
      down_payment_amount: totalDownPayment.toString(),
      final_amount: finalAmount.toString()
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDownPaymentSelection = (downPayment, isSelected) => {
    if (isSelected) {
      setSelectedDownPayments(prev => [...prev, { ...downPayment, amount_to_use: '0' }]);
    } else {
      setSelectedDownPayments(prev => prev.filter(dp => dp.id !== downPayment.id));
    }
  };

  const handleDownPaymentAmountChange = (dpId, amount) => {
    setSelectedDownPayments(prev => 
      prev.map(dp => 
        dp.id === dpId 
          ? { ...dp, amount_to_use: amount }
          : dp
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const method = editingInvoice ? 'PUT' : 'POST';
      const url = editingInvoice 
        ? `${API_BASE_URL}/sales/invoices/${editingInvoice.id}/` 
        : `${API_BASE_URL}/sales/invoices/`;

      const payload = {
        ...formData,
        customer: parseInt(formData.customer),
        sales_order: formData.sales_order ? parseInt(formData.sales_order) : null,
        subtotal: parseFloat(formData.subtotal),
        discount_amount: parseFloat(formData.discount_amount),
        tax_amount: parseFloat(formData.tax_amount),
        total_amount: parseFloat(formData.total_amount),
        down_payment_usages: selectedDownPayments.map(dp => ({
          down_payment: dp.id,
          amount_used: parseFloat(dp.amount_to_use)
        })).filter(usage => usage.amount_used > 0)
      };

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save invoice');
      }

      toast({ title: "Success", description: `Invoice ${editingInvoice ? 'updated' : 'created'} successfully.` });
      setIsDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      sales_order: '',
      due_date: '',
      status: 'DRAFT',
      subtotal: '0',
      discount_amount: '0',
      tax_amount: '0',
      total_amount: '0',
      down_payment_amount: '0',
      final_amount: '0',
      payment_terms: 'Net 30 days',
      notes: ''
    });
    setSelectedDownPayments([]);
    setEditingInvoice(null);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SENT': 'bg-blue-100 text-blue-800',
      'PARTIAL': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'OVERDUE': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoice Management with Down Payment</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={formData.customer} onValueChange={(value) => setFormData(prev => ({ ...prev, customer: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.customer_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales_order">Sales Order (Optional)</Label>
                  <Select value={formData.sales_order} onValueChange={(value) => setFormData(prev => ({ ...prev, sales_order: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Sales Order</SelectItem>
                      {salesOrders.map(order => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          {order.order_number || `SO-${order.id}`} - {order.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal (IDR) *</Label>
                  <Input
                    id="subtotal"
                    name="subtotal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount Amount (IDR)</Label>
                  <Input
                    id="discount_amount"
                    name="discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_amount">Tax Amount (IDR)</Label>
                  <Input
                    id="tax_amount"
                    name="tax_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Down Payment Section */}
              {formData.customer && customerDownPayments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="mr-2 h-5 w-5" />
                      Available Down Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customerDownPayments.map(dp => (
                        <div key={dp.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <input
                            type="checkbox"
                            checked={selectedDownPayments.some(selected => selected.id === dp.id)}
                            onChange={(e) => handleDownPaymentSelection(dp, e.target.checked)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{dp.down_payment_number}</div>
                            <div className="text-sm text-gray-500">
                              Available: {formatRupiah(dp.remaining_amount)} | 
                              Payment Date: {new Date(dp.payment_date).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                          {selectedDownPayments.some(selected => selected.id === dp.id) && (
                            <div className="w-32">
                              <Input
                                type="number"
                                placeholder="Amount to use"
                                min="0"
                                max={dp.remaining_amount}
                                step="0.01"
                                value={selectedDownPayments.find(selected => selected.id === dp.id)?.amount_to_use || ''}
                                onChange={(e) => handleDownPaymentAmountChange(dp.id, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatRupiah(formData.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-{formatRupiah(formData.discount_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>{formatRupiah(formData.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total Amount:</span>
                        <span>{formatRupiah(formData.total_amount)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-blue-600">
                        <span>Down Payment Used:</span>
                        <span>-{formatRupiah(formData.down_payment_amount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Final Amount:</span>
                        <span>{formatRupiah(formData.final_amount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingInvoice ? 'Update' : 'Create')} Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Invoices Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>DP Used</TableHead>
              <TableHead>Final Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.customer_name}</TableCell>
                <TableCell>{new Date(invoice.due_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell>{formatRupiah(invoice.total_amount)}</TableCell>
                <TableCell className="text-blue-600">
                  {formatRupiah(invoice.down_payment_amount || 0)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatRupiah(invoice.final_amount || invoice.total_amount)}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No invoices found.
        </div>
      )}
    </div>
  );
};

export default InvoiceManagementWithDP;
