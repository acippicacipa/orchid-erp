import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Plus, Edit, Trash2, ShoppingCart, Package, Calendar, User, X } from 'lucide-react';
import { useToast } from '../ui/use-toast';

const CreateSalesOrder = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customer: '',
    due_date: '',
    status: 'DRAFT',
    discount_percentage: '0',
    tax_percentage: '11',
    shipping_cost: '0',
    notes: '',
    items: []
  });

  const [newItem, setNewItem] = useState({
    product: '',
    product_name: '',
    quantity: '1',
    unit_price: '0',
    discount_percentage: '0'
  });

  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [salesOrders, searchTerm]);

  useEffect(() => {
    if (productSearchTerm.length >= 2) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [productSearchTerm]);

  // Ganti fungsi fetchSalesOrders yang lama dengan ini:

  const fetchSalesOrders = async () => {
    setLoading(true);
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
        
        setSalesOrders(ordersData);

      } else {
        toast({
          title: "Error",
          description: "Failed to fetch sales orders",
          variant: "destructive",
        });
        setSalesOrders([]); // Pastikan reset ke array kosong jika fetch gagal
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales orders",
        variant: "destructive",
      });
      setSalesOrders([]); // Pastikan reset ke array kosong jika terjadi error
    } finally {
      setLoading(false);
    }
  };


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

  const searchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/sales/products/search/?q=${productSearchTerm}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setShowProductDropdown(true);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const filterOrders = () => {
    if (!searchTerm) {
      setFilteredOrders(salesOrders);
    } else {
      const filtered = salesOrders.filter(order =>
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrders(filtered);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectProduct = (product) => {
    setNewItem(prev => ({
      ...prev,
      product: product.id,
      product_name: product.name,
      unit_price: product.price.toString()
    }));
    setProductSearchTerm(product.name);
    setShowProductDropdown(false);
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.id,
      discount_percentage: customer.discount_percentage?.toString() || '0'
    }));
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
  };

  const addItem = () => {
    if (!newItem.product || !newItem.quantity || !newItem.unit_price) {
      toast({
        title: "Error",
        description: "Please fill in all item fields",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(newItem.quantity);
    const unitPrice = parseFloat(newItem.unit_price);
    const discountPercentage = parseFloat(newItem.discount_percentage);
    
    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const lineTotal = subtotal - discountAmount;

    const item = {
      ...newItem,
      quantity,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      line_total: lineTotal
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNewItem({
      product: '',
      product_name: '',
      quantity: '1',
      unit_price: '0',
      discount_percentage: '0'
    });
    setProductSearchTerm('');
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.line_total, 0);
    const discountAmount = (subtotal * parseFloat(formData.discount_percentage || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * parseFloat(formData.tax_percentage || 0)) / 100;
    const shippingCost = parseFloat(formData.shipping_cost || 0);
    const total = subtotal - discountAmount + taxAmount + shippingCost;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
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

    if (formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingOrder 
        ? `http://localhost:8000/api/sales/sales-orders/${editingOrder.id}/`
        : 'http://localhost:8000/api/sales/sales-orders/';
      
      const method = editingOrder ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage
        }))
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Sales order ${editingOrder ? 'updated' : 'created'} successfully`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchSalesOrders();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.detail || `Failed to ${editingOrder ? 'update' : 'create'} sales order`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving sales order:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingOrder ? 'update' : 'create'} sales order`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer,
      due_date: order.due_date || '',
      status: order.status,
      discount_percentage: order.discount_percentage?.toString() || '0',
      tax_percentage: order.tax_percentage?.toString() || '11',
      shipping_cost: order.shipping_cost?.toString() || '0',
      notes: order.notes || '',
      items: order.items || []
    });
    setCustomerSearchTerm(order.customer_name || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this sales order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/sales/sales-orders/${orderId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sales order deleted successfully",
        });
        fetchSalesOrders();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete sales order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting sales order:', error);
      toast({
        title: "Error",
        description: "Failed to delete sales order",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      due_date: '',
      status: 'DRAFT',
      discount_percentage: '0',
      tax_percentage: '11',
      shipping_cost: '0',
      notes: '',
      items: []
    });
    setNewItem({
      product: '',
      product_name: '',
      quantity: '1',
      unit_price: '0',
      discount_percentage: '0'
    });
    setEditingOrder(null);
    setCustomerSearchTerm('');
    setProductSearchTerm('');
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
      'PENDING': 'outline',
      'CONFIRMED': 'default',
      'PROCESSING': 'default',
      'SHIPPED': 'default',
      'DELIVERED': 'default',
      'CANCELLED': 'destructive'
    };
    return <Badge variant={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create Sales Order</h1>
      </div>
      <Card>
        <CardHeader>
          &nbsp;
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  placeholder="Search customer..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(e.target.value.length >= 2);
                  }}
                  onFocus={() => setShowCustomerDropdown(customerSearchTerm.length >= 2)}
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {customers
                      .filter(customer => 
                        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        customer.customer_id?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                      )
                      .map(customer => (
                        <div
                          key={customer.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.customer_id}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Add Items Section */}
            <Card>
              <CardHeader>
                <CardTitle>Add Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2 relative">
                    <Label>Product *</Label>
                    <Input
                      placeholder="Search product..."
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setNewItem(prev => ({ ...prev, product: '', product_name: '' }));
                      }}
                    />
                    {showProductDropdown && products.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {products.map(product => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => selectProduct(product)}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {product.sku} | Stock: {product.stock_quantity} | {formatCurrency(product.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (IDR)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newItem.discount_percentage}
                      onChange={(e) => setNewItem(prev => ({ ...prev, discount_percentage: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button type="button" onClick={addItem} className="w-full">
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            {formData.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Line Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{item.discount_percentage}%</TableCell>
                          <TableCell>{formatCurrency(item.line_total)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            {formData.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount_percentage">Order Discount (%)</Label>
                      <Input
                        id="discount_percentage"
                        name="discount_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.discount_percentage}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_percentage">Tax (PPN) (%)</Label>
                      <Input
                        id="tax_percentage"
                        name="tax_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tax_percentage}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping_cost">Shipping Cost (IDR)</Label>
                      <Input
                        id="shipping_cost"
                        name="shipping_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.shipping_cost}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-right">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="font-medium">-{formatCurrency(totals.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (PPN):</span>
                      <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(formData.shipping_cost || 0))}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || formData.items.length === 0}>
                {loading ? 'Saving...' : (editingOrder ? 'Update Order' : 'Create Order')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading sales orders...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{order.order_number || `SO-${order.id}`}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{order.customer_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(order.order_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span>{order.item_count || 0} items</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{order.total_amount_formatted || formatCurrency(order.total_amount || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
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

export default CreateSalesOrder;
