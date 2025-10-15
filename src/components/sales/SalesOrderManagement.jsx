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
import { Search, Plus, Edit, Trash2, ShoppingCart, Package, Calendar, User, X } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Format Rupiah tanpa desimal untuk Indonesia
const formatRupiah = (amount) => {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0';
  const number = Math.round(parseFloat(amount) || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

// Parse input Rupiah ke number
const parseRupiah = (rupiahString) => {
  if (!rupiahString) return 0;
  return parseInt(rupiahString.replace(/[^0-9]/g, '')) || 0;
};

// Product Search Component
const ProductSearchDropdown = ({ products, value, onSelect, placeholder = "Search products..." }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const selectedProduct = products.find(p => p.id.toString() === value);
  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchValue.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchValue.toLowerCase()))
  ).slice(0, 50);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span className="truncate">
              {selectedProduct.sku} - {selectedProduct.name}
            </span>
          ) : (
            placeholder
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Type to search products..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id.toString()}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                    setSearchValue('');
                  }}
                >
                  <div className="flex flex-col w-full">
                    <div className="font-medium">
                      {product.sku} - {product.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {product.brand && `Brand: ${product.brand} | `}
                      Stock: {product.current_stock || 0} | 
                      Price: {formatRupiah(product.selling_price)}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Customer Search Component
const CustomerSearchDropdown = ({ customers, value, onSelect, placeholder = "Search customers..." }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const selectedCustomer = customers.find(c => c.id.toString() === value);
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchValue.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchValue))
  ).slice(0, 50);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCustomer ? (
            <span className="truncate">
              {selectedCustomer.name} - {selectedCustomer.email}
            </span>
          ) : (
            placeholder
          )}
          <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Type to search customers..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id.toString()}
                  onSelect={() => {
                    onSelect(customer.id.toString());
                    setOpen(false);
                    setSearchValue('');
                  }}
                >
                  <div className="flex flex-col w-full">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">
                      {customer.email} | {customer.phone || 'No phone'}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const SalesOrderManagement = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
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
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = salesOrders.filter(order =>
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [salesOrders, searchTerm]);

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales orders",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customers/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/products/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (field, value) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProductSelect = (product) => {
    setNewItem(prev => ({
      ...prev,
      product: product.id.toString(),
      product_name: product.name,
      unit_price: product.selling_price || '0'
    }));
  };

  const addItem = () => {
    if (!newItem.product || !newItem.quantity) {
      toast({
        title: "Error",
        description: "Please select a product and enter quantity",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id.toString() === newItem.product);
    const item = {
      id: Date.now(), // Temporary ID for new items
      product: parseInt(newItem.product),
      product_name: product?.name || newItem.product_name,
      product_sku: product?.sku || '',
      quantity: parseInt(newItem.quantity),
      unit_price: parseRupiah(newItem.unit_price),
      discount_percentage: parseFloat(newItem.discount_percentage) || 0,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Reset new item form
    setNewItem({
      product: '',
      product_name: '',
      quantity: '1',
      unit_price: '0',
      discount_percentage: '0'
    });
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateItemSubtotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_percentage / 100);
    return subtotal - discount;
  };

  const calculateOrderTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
    const orderDiscount = subtotal * (parseFloat(formData.discount_percentage) / 100);
    const afterDiscount = subtotal - orderDiscount;
    const tax = afterDiscount * (parseFloat(formData.tax_percentage) / 100);
    const shipping = parseRupiah(formData.shipping_cost);
    const total = afterDiscount + tax + shipping;

    return {
      subtotal,
      orderDiscount,
      afterDiscount,
      tax,
      shipping,
      total
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (formData.items.length === 0) {
        throw new Error('Please add at least one item to the order');
      }

      const payload = {
        customer: parseInt(formData.customer),
        due_date: formData.due_date,
        status: formData.status,
        discount_percentage: parseFloat(formData.discount_percentage),
        tax_percentage: parseFloat(formData.tax_percentage),
        shipping_cost: parseRupiah(formData.shipping_cost),
        notes: formData.notes,
        items: formData.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage
        }))
      };

      const url = editingOrder 
        ? `${API_BASE_URL}/sales/sales-orders/${editingOrder.id}/`
        : `${API_BASE_URL}/sales/sales-orders/`;
      
      const method = editingOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save sales order');
      }

      toast({
        title: "Success",
        description: `Sales order ${editingOrder ? 'updated' : 'created'} successfully.`,
      });
      
      setIsDialogOpen(false);
      resetForm();
      fetchSalesOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer?.id?.toString() || '',
      due_date: order.due_date || '',
      status: order.status || 'DRAFT',
      discount_percentage: order.discount_percentage?.toString() || '0',
      tax_percentage: order.tax_percentage?.toString() || '11',
      shipping_cost: order.shipping_cost?.toString() || '0',
      notes: order.notes || '',
      items: order.items || []
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'DRAFT': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'CONFIRMED': { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      'SHIPPED': { color: 'bg-yellow-100 text-yellow-800', label: 'Shipped' },
      'DELIVERED': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status] || statusConfig['DRAFT'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    // 1. Periksa apakah dateString valid dan dalam format yang diharapkan.
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return ''; // Atau 'N/A' jika string tidak valid
    }

    // 2. Pisahkan string menjadi komponen tahun, bulan, dan hari.
    //    '2025-10-31' -> ['2025', '10', '31']
    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // 3. Buat objek Date menggunakan angka, bukan string.
    //    PENTING: Di sini, bulan untuk constructor Date() adalah 0-indexed (Jan=0, Feb=1, ...).
    //    Jadi, kita harus mengurangi 1 dari bulan yang kita parse.
    const date = new Date(year, month - 1, day);

    // 4. Dapatkan kembali komponen tanggal untuk memastikan tidak ada pergeseran zona waktu.
    //    Ini adalah langkah paling aman.
    const finalDay = date.getDate();
    const finalMonth = date.getMonth() + 1; // Tambah 1 lagi untuk tampilan
    const finalYear = date.getFullYear();

    // 5. Format komponen agar selalu memiliki dua digit.
    const formattedDay = ('0' + finalDay).slice(-2);
    const formattedMonth = ('0' + finalMonth).slice(-2);

    // 6. Gabungkan menjadi format yang diinginkan.
    return `${formattedDay}/${formattedMonth}/${finalYear}`;
  };

  const totals = calculateOrderTotals();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Sales Orders</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> New Sales Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? 'Edit Sales Order' : 'Create New Sales Order'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <CustomerSearchDropdown
                    customers={customers}
                    value={formData.customer}
                    onSelect={(value) => handleInputChange('customer', value)}
                    placeholder="Search and select customer..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add Items Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="col-span-2">
                      <Label>Product</Label>
                      <ProductSearchDropdown
                        products={products}
                        value={newItem.product}
                        onSelect={handleProductSelect}
                        placeholder="Search products..."
                      />
                    </div>
                    
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => handleItemChange('quantity', e.target.value)}
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <Label>Unit Price (Rp)</Label>
                      <Input
                        type="text"
                        value={newItem.unit_price}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          handleItemChange('unit_price', value);
                        }}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button type="button" onClick={addItem} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add
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
                          <TableHead>Discount %</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-sm text-gray-500">{item.product_sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatRupiah(item.unit_price)}</TableCell>
                            <TableCell>{item.discount_percentage}%</TableCell>
                            <TableCell>{formatRupiah(calculateItemSubtotal(item))}</TableCell>
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

              {/* Order Totals */}
              {formData.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Order Discount (%)</Label>
                        <Input
                          type="number"
                          value={formData.discount_percentage}
                          onChange={(e) => handleInputChange('discount_percentage', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <Label>Tax (PPN) %</Label>
                        <Input
                          type="number"
                          value={formData.tax_percentage}
                          onChange={(e) => handleInputChange('tax_percentage', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <Label>Shipping Cost (Rp)</Label>
                        <Input
                          type="text"
                          value={formData.shipping_cost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            handleInputChange('shipping_cost', value);
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatRupiah(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Order Discount:</span>
                        <span>-{formatRupiah(totals.orderDiscount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>After Discount:</span>
                        <span>{formatRupiah(totals.afterDiscount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (PPN):</span>
                        <span>{formatRupiah(totals.tax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>{formatRupiah(totals.shipping)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{formatRupiah(totals.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter additional notes..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingOrder ? 'Update Order' : 'Create Order')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sales orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customer_name || 'N/A'}</TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell>{order.due_date}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{formatRupiah(order.total_amount)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(order)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderManagement;
