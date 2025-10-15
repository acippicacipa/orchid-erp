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
import { Search, Plus, Edit, Trash2, FileText, Calendar, User, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/use-toast';

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
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
    payment_terms: 'Net 30 days',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm]);

  // Ganti fungsi fetchInvoices yang lama dengan ini:

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/sales/invoices/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      } );

      if (response.ok) {
        const data = await response.json();
        
        // ==============================================================================
        // PERUBAHAN UTAMA DI SINI: Pastikan invoices selalu berupa array
        // ==============================================================================
        const invoicesData = Array.isArray(data.results) 
          ? data.results 
          : Array.isArray(data) 
            ? data 
            : [];
        
        setInvoices(invoicesData);

      } else {
        toast({
          title: "Error",
          description: "Failed to fetch invoices",
          variant: "destructive",
        });
        setInvoices([]); // Pastikan reset ke array kosong jika fetch gagal
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
      setInvoices([]); // Pastikan reset ke array kosong jika terjadi error
    } finally {
      setLoading(false);
    }
  };


  // Ganti fungsi fetchCustomers yang lama dengan ini:

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/sales/customers/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      } );

      if (response.ok) {
        const data = await response.json();
        
        // ==============================================================================
        // PERUBAHAN UTAMA DI SINI: Pastikan customers selalu berupa array
        // ==============================================================================
        const customersData = Array.isArray(data.results) 
          ? data.results 
          : Array.isArray(data) 
            ? data 
            : [];

        setCustomers(customersData.filter(customer => customer.is_active));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Pastikan reset ke array kosong jika terjadi error
    }
  };


  // Ganti fungsi fetchSalesOrders yang lama dengan ini:

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/sales/sales-orders/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      } );

      if (response.ok) {
        const data = await response.json();
        
        // ==============================================================================
        // PERUBAHAN UTAMA DI SINI: Pastikan salesOrders selalu berupa array
        // ==============================================================================
        const ordersData = Array.isArray(data.results) 
          ? data.results 
          : Array.isArray(data) 
            ? data 
            : [];

        setSalesOrders(ordersData.filter(order => 
          order.status === 'CONFIRMED' || order.status === 'SHIPPED' || order.status === 'DELIVERED'
        ));
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      setSalesOrders([]); // Pastikan reset ke array kosong jika terjadi error
    }
  };


  const filterInvoices = () => {
    if (!searchTerm) {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice =>
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInvoices(filtered);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSalesOrderChange = (salesOrderId) => {
    const selectedOrder = salesOrders.find(order => order.id.toString() === salesOrderId);
    if (selectedOrder) {
      setFormData(prev => ({
        ...prev,
        sales_order: salesOrderId,
        customer: selectedOrder.customer.toString(),
        subtotal: selectedOrder.subtotal?.toString() || '0',
        discount_amount: selectedOrder.discount_amount?.toString() || '0',
        tax_amount: selectedOrder.tax_amount?.toString() || '0',
        total_amount: selectedOrder.total_amount?.toString() || '0'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (!formData.due_date) {
      toast({
        title: "Error",
        description: "Please set a due date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingInvoice 
        ? `http://localhost:8000/api/sales/invoices/${editingInvoice.id}/`
        : 'http://localhost:8000/api/sales/invoices/';
      
      const method = editingInvoice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Invoice ${editingInvoice ? 'updated' : 'created'} successfully`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchInvoices();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.detail || `Failed to ${editingInvoice ? 'update' : 'create'} invoice`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingInvoice ? 'update' : 'create'} invoice`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      customer: invoice.customer?.toString() || '',
      sales_order: invoice.sales_order?.toString() || '',
      due_date: invoice.due_date || '',
      status: invoice.status || 'DRAFT',
      subtotal: invoice.subtotal?.toString() || '0',
      discount_amount: invoice.discount_amount?.toString() || '0',
      tax_amount: invoice.tax_amount?.toString() || '0',
      total_amount: invoice.total_amount?.toString() || '0',
      payment_terms: invoice.payment_terms || 'Net 30 days',
      notes: invoice.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/sales/invoices/${invoiceId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invoice deleted successfully",
        });
        fetchInvoices();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const handleMarkSent = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/sales/invoices/${invoiceId}/mark_sent/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invoice marked as sent",
        });
        fetchInvoices();
      } else {
        toast({
          title: "Error",
          description: "Failed to mark invoice as sent",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      toast({
        title: "Error",
        description: "Failed to mark invoice as sent",
        variant: "destructive",
      });
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
      payment_terms: 'Net 30 days',
      notes: ''
    });
    setEditingInvoice(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'DRAFT': 'secondary',
      'SENT': 'outline',
      'PARTIAL': 'default',
      'PAID': 'default',
      'OVERDUE': 'destructive',
      'CANCELLED': 'destructive'
    };
    return <Badge variant={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const isOverdue = (invoice) => {
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return dueDate < today && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_order">Sales Order (Optional)</Label>
                  <Select value={formData.sales_order} onValueChange={handleSalesOrderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sales Order</SelectItem>
                      {salesOrders.map(order => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          {order.order_number || `SO-${order.id}`} - {order.customer_name} - {formatCurrency(order.total_amount || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (IDR) *</Label>
                  <Input
                    id="total_amount"
                    name="total_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Select value={formData.payment_terms} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 15 days">Net 15 days</SelectItem>
                      <SelectItem value="Net 30 days">Net 30 days</SelectItem>
                      <SelectItem value="Net 45 days">Net 45 days</SelectItem>
                      <SelectItem value="Net 60 days">Net 60 days</SelectItem>
                      <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  {loading ? 'Saving...' : (editingInvoice ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading invoices...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{invoice.invoice_number || `INV-${invoice.id}`}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{invoice.customer_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(invoice.invoice_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {isOverdue(invoice) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        <span className={isOverdue(invoice) ? 'text-red-500' : ''}>
                          {new Date(invoice.due_date).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{invoice.total_amount_formatted || formatCurrency(invoice.total_amount || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${(invoice.balance_due || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {invoice.balance_due_formatted || formatCurrency(invoice.balance_due || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {invoice.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkSent(invoice.id)}
                          >
                            Send
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManagement;
