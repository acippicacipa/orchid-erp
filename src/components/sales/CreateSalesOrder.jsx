import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { X } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import ProductSearchDropdown from './ProductSearchDropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  // Bulan dimulai dari 0 (Januari), jadi kita tambah 1.
  // `padStart` memastikan formatnya selalu 2 digit (misal: 09 untuk September).
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const CreateSalesOrder = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const { toast } = useToast();

  const initialFormState = {
    customer: '',
    due_date: getTodayDateString(),
    status: 'DRAFT',
    discount_percentage: '0',
    tax_percentage: '0',
    shipping_cost: '0',
    notes: '',
    items: []
  };

  const [formData, setFormData] = useState(initialFormState);

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

  // Ganti fungsi fetchSalesOrders yang lama dengan ini:

  const fetchSalesOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/`, {
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
      const response = await fetch(`${API_BASE_URL}/sales/customers/`, {
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

  const fetchProductPrice = useCallback(async (productId, quantity) => {
    const customerId = formData.customer;
    if (!productId || !customerId || !quantity) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/sales/products/${productId}/calculate-price/?customer_id=${customerId}&quantity=${quantity}`,
        { headers: { 'Authorization': `Token ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        // Update state newItem dengan harga dan diskon dari backend
        setNewItem(prev => ({
          ...prev,
          unit_price: data.unit_price.toString(),
          discount_percentage: data.discount_percentage.toString()
        }));
      } else {
        console.error("Failed to fetch calculated price");
      }
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  }, [formData.customer]); // Dependensi pada customerId

  // Panggil fetchProductPrice saat produk atau kuantitas berubah
  useEffect(() => {
    if (newItem.product && newItem.quantity) {
      fetchProductPrice(newItem.product, newItem.quantity);
    }
  }, [newItem.product, newItem.quantity, fetchProductPrice]);

  const handleProductSelect = (product) => {
    if (product) {
      setNewItem(prev => ({
        ...prev,
        product: product.id,
        product_name: product.name,
        // Gunakan selling_price sebagai default unit_price
        unit_price: '0', 
        discount_percentage: '0' 
      }));
    } else {
      // Jika produk dikosongkan (misal saat pengguna mengetik ulang)
      setNewItem(prev => ({
        ...prev,
        product: '',
        product_name: '',
        unit_price: '0',
        discount_percentage: '0'
      }));
    }
  };

  const selectCustomer = (customer) => {
    if (formData.items.length > 0) {
      const isConfirmed = window.confirm(
        'Changing the customer will reset the current order. Are you sure you want to continue?'
      );
      if (!isConfirmed) {
        // Jika pengguna membatalkan, jangan lakukan apa-apa
        // Kita bisa kembalikan tampilan search bar ke nama customer sebelumnya jika perlu
        const previousCustomer = customers.find(c => c.id === formData.customer);
        setCustomerSearchTerm(previousCustomer ? previousCustomer.name : '');
        setShowCustomerDropdown(false);
        return;
      }
    }
    resetForm(customer);
    
    // Tutup dropdown setelah memilih
    setShowCustomerDropdown(false);
  };

  const openNewOrderForm = () => {
    resetForm(); // Panggil tanpa argumen untuk membersihkan semuanya
    setIsDialogOpen(true); // Ganti ini sesuai cara Anda membuka form
  };

  const addItem = () => {
    // 1. Validasi dasar: Pastikan produk telah dipilih dan kuantitas/harga valid.
    if (!newItem.product || !newItem.quantity || !newItem.unit_price) {
      toast({
        title: "Input Incomplete",
        description: "Please select a product and ensure quantity/price are filled.",
        variant: "destructive",
      });
      return; // Hentikan fungsi jika validasi gagal.
    }

    // 2. Konversi nilai dari string ke number untuk kalkulasi dan perbandingan.
    const quantity = parseFloat(newItem.quantity);
    const unitPrice = parseFloat(newItem.unit_price);
    const discountPercentage = parseFloat(newItem.discount_percentage);

    // Lakukan validasi tambahan untuk nilai numerik.
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be a number greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // 3. Hitung total baris untuk item yang akan ditambahkan/diperbarui.
    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const lineTotal = subtotal - discountAmount;

    // Buat objek item yang bersih dengan data yang sudah diproses.
    const processedNewItem = {
      ...newItem,
      quantity,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      line_total: lineTotal
    };

    // 4. Cek apakah produk dengan ID yang sama sudah ada di dalam daftar `items`.
    const existingItemIndex = formData.items.findIndex(
      (item) => item.product === processedNewItem.product
    );

    // 5. Jika produk sudah ada (indeksnya bukan -1)...
    if (existingItemIndex !== -1) {
      // Tampilkan dialog konfirmasi kepada pengguna.
      const isConfirmed = window.confirm(
        `"${newItem.product_name}" is already in the order. Do you want to replace the existing entry with the new one?`
      );

      // Jika pengguna menekan "OK" (Yes)...
      if (isConfirmed) {
        // Buat salinan dari array `items` untuk menghindari mutasi state langsung.
        const updatedItems = [...formData.items];
        
        // Ganti item lama pada indeks yang ditemukan dengan data item yang baru.
        updatedItems[existingItemIndex] = processedNewItem;
        
        // Update state `formData` dengan array `items` yang sudah diperbarui.
        setFormData(prev => ({
          ...prev,
          items: updatedItems
        }));

        toast({
          title: "Item Replaced",
          description: `"${newItem.product_name}" has been updated in the order.`,
        });

      } else {
        // Jika pengguna menekan "Cancel" (No), jangan lakukan apa-apa pada daftar item.
        // Cukup reset form `newItem` agar pengguna bisa memilih produk lain.
        setNewItem({
          product: '',
          product_name: '',
          quantity: '1',
          unit_price: '0',
          discount_percentage: '0'
        });
        return; // Hentikan eksekusi fungsi lebih lanjut.
      }

    } else {
      // 6. Jika produk belum ada, tambahkan item baru ke dalam array `items`.
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, processedNewItem]
      }));
    }

    // 7. Setelah item berhasil ditambahkan atau diganti, reset form `newItem` ke kondisi awal.
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
        ? `${API_BASE_URL}/sales/sales-orders/${editingOrder.id}/`
        : `${API_BASE_URL}/sales/sales-orders/`;
      
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
      due_date: order.due_date ? order.due_date.split('T')[0] : getTodayDateString(),
      status: order.status,
      discount_percentage: order.discount_percentage?.toString() || '0',
      tax_percentage: order.tax_percentage?.toString() || '0',
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
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${orderId}/`, {
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

  const resetForm = (newCustomer = null) => {
    setFormData({
      ...initialFormState,
      // Jika ada customer baru yang di-pass, langsung set di sini
      customer: newCustomer ? newCustomer.id : '',
      // Terapkan juga diskon default dari customer baru
      discount_percentage: newCustomer?.customer_group?.discount_percentage?.toString() || '0'
    });
    setNewItem({
      product: '',
      product_name: '',
      quantity: '1',
      unit_price: '0',
      discount_percentage: '0'
    });
    setEditingOrder(null);
    setCustomerSearchTerm(newCustomer ? newCustomer.name : '');
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
                  <div className="md:col-span-2 space-y-2"> {/* Beri ruang lebih lebar */}
                    <Label>Product *</Label>
                    <ProductSearchDropdown
                      value={newItem.product_name}
                      onSelect={handleProductSelect}
                      placeholder="Search product by name or SKU..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (IDR)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: e.target.value }))}
                      readOnly 
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
                      readOnly
                    />
                  </div>
                  <div className="space-y-2 self-end">
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
    </div>
  );
};

export default CreateSalesOrder;
