import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { X } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import ProductSearchDropdown from './ProductSearchDropdown'; // Pastikan path ini benar
import CustomerSearchDropdown from './CustomerSearchDropdown';

// ID untuk customer guest, sesuaikan dengan data di database Anda
const GUEST_CUSTOMER_ID = 1; 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper Functions
const formatRupiah = (amount, withDecimal = false ) => {
  if (amount === null || amount === undefined || amount === '') return '';
  const number = parseFloat(amount) || 0;
  const options = { style: 'currency', currency: 'IDR', minimumFractionDigits: withDecimal ? 2 : 0, maximumFractionDigits: withDecimal ? 2 : 0 };
  return new Intl.NumberFormat('id-ID', options).format(number);
};

const parseRupiah = (rupiahString) => {
  if (!rupiahString) return '0';
  return rupiahString.replace(/[^0-9]/g, '') || '0';
};

const SalesOrderForm = ({ initialData, onSubmit, customers, products, isEditing = false }) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState(initialData);
  const [isCreditSale, setIsCreditSale] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [availableDPs, setAvailableDPs] = useState([]);
  const [selectedDPs, setSelectedDPs] = useState([]);

  const [newItem, setNewItem] = useState({
    product: '',
    product_full_name: '',
    quantity: '1',
    unit_price: '0',
    discount_percentage: '0'
  });

  // Effect untuk menginisialisasi form saat mode edit
  useEffect(() => {
    setFormData(initialData);
    const selected = customers.find(c => c.id === initialData.customer);
    if (selected) {
      setCustomerSearchTerm(selected.name);
      const creditMode = selected.payment_type === 'CREDIT';
      setIsCreditSale(creditMode);
      setIsGuestMode(selected.id === GUEST_CUSTOMER_ID);
    } else {
      setCustomerSearchTerm('');
      setIsCreditSale(false);
      setIsGuestMode(false);
    }
  }, [initialData, customers]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customer);
  }, [formData.customer, customers]);

  const fetchAvailableDPs = useCallback(async (customerId) => {
    if (!customerId) {
      setAvailableDPs([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/down-payments/?customer_id=${customerId}&status=UNAPPLIED`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableDPs(data.results || []);
      }
    } catch (error) {
      console.error("Failed to fetch available down payments", error);
      toast({ title: "Error", description: "Could not fetch down payments.", variant: "destructive" });
    }
  }, [toast]);

  // +++ PANGGIL fetchAvailableDPs SAAT CUSTOMER BERUBAH +++
  useEffect(() => {
    if (formData.customer) {
      fetchAvailableDPs(formData.customer);
    }
  }, [formData.customer, fetchAvailableDPs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (fieldName, fieldValue) => {
    setFormData(prev => ({ ...prev, [fieldName]: fieldValue }));
  };

  const selectCustomer = (customer) => {
    if (formData.items.length > 0) {
      if (!window.confirm('Changing customer will reset the order. Continue?')) {
        const prevCustomer = customers.find(c => c.id === formData.customer);
        setCustomerSearchTerm(prevCustomer ? prevCustomer.name : '');
        setShowCustomerDropdown(false);
        return;
      }
    }

    const creditMode = customer.payment_type === 'CREDIT';
    const guestMode = customer.id === GUEST_CUSTOMER_ID;

    setIsCreditSale(creditMode);
    setIsGuestMode(guestMode);
    setCustomerSearchTerm(customer.name);

    setFormData({
      ...initialData, // Reset ke state awal
      customer: customer.id,
      status: creditMode ? 'DRAFT' : 'DELIVERED',
      payment_method: creditMode ? 'NOT_PAID' : 'CASH',
      discount_percentage: customer.customer_group?.discount_percentage?.toString() || '0',
      items: [], // Selalu reset item
    });

    setShowCustomerDropdown(false);
  };

  const handleDPSelection = (dpId) => {
    setSelectedDPs(prev => 
      prev.includes(dpId) ? prev.filter(id => id !== dpId) : [...prev, dpId]
    );
  };
  
  const fetchProductPrice = useCallback(async (productId, quantity) => {
    const customerId = formData.customer;
    if (!productId || !customerId || !quantity) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/products/${productId}/calculate-price/?customer_id=${customerId}&quantity=${quantity}`, { headers: { 'Authorization': `Token ${token}` } });
      if (response.ok) {
        const data = await response.json();
        etNewItem(prev => ({ 
          ...prev, 
          unit_price: data.unit_price.toString(), 
          discount_percentage: data.discount_percentage.toString() 
        }));
      }
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  }, [formData.customer]);

  useEffect(() => {
    if (newItem.product && newItem.quantity) {
      fetchProductPrice(newItem.product, newItem.quantity);
    }
  }, [newItem.product, newItem.quantity, fetchProductPrice]);

  const handleProductSelect = (product) => {
    if (product) {
      setNewItem(prev => ({ ...prev, product: product.id, product_full_name: product.full_name, unit_price: product.selling_price, discount_percentage: '0' }));
    }
  };

  const handleProductNameChange = (text) => {
    setNewItem(prev => ({ ...prev, product_full_name: text }));
    if (text !== newItem.product_full_name) {
      setNewItem(prev => ({ ...prev, product: '', unit_price: '0', discount_percentage: '0' }));
    }
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
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Kode BARU yang sudah diperbaiki
  const totals = useMemo(() => {
      const items = formData.items ?? [];
    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const orderDiscountAmount = (subtotal * parseFloat(formData.discount_percentage || 0)) / 100;
    const taxableAmount = subtotal - orderDiscountAmount;
    const taxAmount = (taxableAmount * parseFloat(formData.tax_percentage || 0)) / 100;
    const shippingCost = parseFloat(formData.shipping_cost || 0);
    
    // Hitung total DP yang dipilih
    const totalDPApplied = availableDPs
      .filter(dp => selectedDPs.includes(dp.id))
      .reduce((sum, dp) => sum + parseFloat(dp.amount), 0);

    const total = taxableAmount + taxAmount + shippingCost - totalDPApplied;
      
    return { subtotal, orderDiscountAmount, taxAmount, total, totalDPApplied };
  }, [formData.items, formData.discount_percentage, formData.tax_percentage, formData.shipping_cost, selectedDPs, availableDPs]);


  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      down_payment_ids: selectedDPs,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <form id="sales-order-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Bagian 1: Pemilihan Customer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6">
        <div className="space-y-2 relative">
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
      </div>

      {/* Bagian 2: Blok Kondisional (Kredit atau Guest) */}
      {selectedCustomer && isCreditSale && (
        <div className="grid grid-cols-3 gap-4 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
            <Label className="text-xs text-gray-500">Credit Limit</Label>
            <p className="font-semibold">{formatRupiah(selectedCustomer.credit_limit)}</p>
            </div>
            <div>
            <Label className="text-xs text-gray-500">Outstanding Balance</Label>
            <p className="font-semibold text-orange-600">{formatRupiah(selectedCustomer.outstanding_balance)}</p>
            </div>
            <div>
            <Label className="text-xs text-gray-500">Available Credit</Label>
            <p className={`font-bold ${selectedCustomer.available_credit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatRupiah(selectedCustomer.available_credit)}
            </p>
            </div>
        </div>
        )}
      {isGuestMode && (
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Guest Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="guest_name">Contact Name *</Label>
              <Input id="guest_name" name="guest_name" value={formData.guest_name || ''} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest_phone">Phone Number *</Label>
              <Input id="guest_phone" name="guest_phone" value={formData.guest_phone || ''} onChange={handleInputChange} required />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bagian 3: Item, Summary, dan Detail Lainnya */}
      <Card>
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 md:col-span-5 space-y-2">
              <Label>Product *</Label>
              <ProductSearchDropdown value={newItem.product_full_name} onValueChange={handleProductNameChange} onSelect={handleProductSelect} placeholder="Search product..." products={products} />
            </div>
            <div className="col-span-4 md:col-span-1 space-y-2">
              <Label>Qty</Label>
              <Input type="text" min="1" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({...prev, quantity: e.target.value}))} />
            </div>
            <div className="col-span-8 md:col-span-2 space-y-2">
              <Label>Unit Price</Label>
              <Input type="text" value={formatRupiah(newItem.unit_price)} readOnly />
            </div>
            <div className="col-span-4 md:col-span-2 space-y-2">
              <Label>Discount (%)</Label>
              <Input type="text" value={`${newItem.discount_percentage}%`} readOnly />
            </div>
            <div className="col-span-8 md:col-span-2 space-y-2">
              <Button type="button" onClick={addItem} className="w-full">Add Item</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(formData.items ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Items in Order</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {(formData.items ?? []).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_full_name}</TableCell>
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

      {(formData.items ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
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
                <span className="font-medium">-{formatCurrency(totals.orderDiscountAmount)}</span>
                </div>
                <div className="flex justify-between">
                <span>Tax (PPN):</span>
                <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-medium">{formatCurrency(parseFloat(formData.shipping_cost || 0))}</span>
                </div>
                {totals.totalDPApplied > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Down Payment Applied:</span>
                    <span className="font-medium">-{formatRupiah(totals.totalDPApplied)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
                </div>
            </div>
            </CardContent>
        </Card>
      )}

      {availableDPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Apply Available Down Payments</CardTitle>
            <p className="text-sm text-muted-foreground">Select one or more down payments to apply to this order.</p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Apply</TableHead>
                    <TableHead>DP Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableDPs.map(dp => (
                    <TableRow key={dp.id} className={selectedDPs.includes(dp.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDPs.includes(dp.id)}
                          onCheckedChange={() => handleDPSelection(dp.id)}
                          id={`dp-${dp.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Label htmlFor={`dp-${dp.id}`} className="cursor-pointer font-medium">{dp.dp_number}</Label>
                      </TableCell>
                      <TableCell>{new Date(dp.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>{dp.notes}</TableCell>
                      <TableCell className="text-right">{formatRupiah(dp.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isCreditSale ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label htmlFor="due_date">Expected Ship Date</Label>
            <Input id="due_date" name="due_date" type="date" value={formData.due_date} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Input value={selectedCustomer?.payment_terms || 'Net 30'} readOnly className="bg-gray-100 dark:bg-gray-800" />
            </div>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select name="payment_method" value={formData.payment_method} onValueChange={(value) => handleSelectChange('payment_method', value)}>
                <SelectTrigger id="payment_method"><SelectValue placeholder="Select a payment method" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="down_payment_amount">Down Payment / Amount Paid</Label>
                <Input
                id="down_payment_amount"
                name="down_payment_amount"
                type="text"
                placeholder="Enter amount"
                value={formatRupiah(formData.down_payment_amount, false)}
                onChange={(e) => handleSelectChange('down_payment_amount', parseRupiah(e.target.value))}
                />
                <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => handleSelectChange('down_payment_amount', totals.total.toString())}>
                    Pay Full Amount ({formatRupiah(totals.total, false)})
                </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} disabled={!isCreditSale}>
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
          <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} />
        </div>
      </div>
    </form>
  );
};

export default SalesOrderForm;