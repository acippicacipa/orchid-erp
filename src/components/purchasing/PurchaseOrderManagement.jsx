import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Plus, Edit, X, Check, Loader2 } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Checkbox } from '../ui/checkbox';
import { Eye } from 'lucide-react'; // Impor ikon baru
import { PurchaseOrderView } from './PurchaseOrderView';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf'; // 4. Impor jsPDF
import html2canvas from 'html2canvas';
import { useReactToPrint } from 'react-to-print';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const formatRupiah = (amount, withDecimal = true) => {
  if (amount === null || amount === undefined || amount === '') {
    return withDecimal ? 'Rp 0,00' : 'Rp 0';
  }
  const number = parseFloat(amount) || 0;

  const options = {
    style: 'currency',
    currency: 'IDR',
    // Jika withDecimal true, set minimum dan maximum fraction digits ke 2.
    // Jika false, set ke 0.
    minimumFractionDigits: withDecimal ? 2 : 0,
    maximumFractionDigits: withDecimal ? 2 : 0,
  };

  // Langkah 4: Gunakan Intl.NumberFormat untuk membuat string yang diformat
  return new Intl.NumberFormat('id-ID', options).format(number);
};

// Parse input Rupiah ke number
const parseRupiah = (rupiahString) => {
  if (!rupiahString) return 0;
  return parseInt(rupiahString.replace(/[^0-9]/g, '')) || 0;
};

// Product Search Component
const ProductSearchDropdown = ({ value, onSelect, placeholder = "Search products..." }) => {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const displayValue = value || searchTerm;

  const searchProducts = async (query) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/products/?search=${query}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const products = Array.isArray(data.results) ? data.results : [];
        setResults(products.filter(p => p.is_purchasable)); // Hanya tampilkan produk yang bisa dibeli
      }
    } catch (error) {
      console.error("Failed to search products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, token]);
  
  const handleSelect = (product) => {
    onSelect(product);
    setSearchTerm(''); // Reset input setelah memilih
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(product => (
              <div
                key={product.id}
                className="p-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(product)}
              >
                <div className="font-medium">{product.sku} - {product.full_name || product.name}</div>
                <div className="text-sm text-gray-500">Cost: {formatRupiah(product.cost_price)}</div>
              </div>
            ))
          ) : (
            searchTerm.length >= 2 && <div className="p-2 text-center text-sm text-gray-500">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
};


const SupplierSearchDropdown = ({ value, onSelect, placeholder = "Search suppliers...", disabled = false  }) => {
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
        const suppliers = Array.isArray(data.results) ? data.results : [];
        setResults(suppliers);
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
    }, 300); // Debounce 300ms
    return () => clearTimeout(handler);
  }, [searchTerm, token]);
  
  const handleSelect = (supplier) => {
    onSelect(supplier); // Kirim seluruh objek supplier
    setSearchTerm(''); // Reset input setelah memilih
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    // Saat pengguna mengetik, update `searchTerm`.
    setSearchTerm(e.target.value);
    // Jika pengguna mulai mengetik, kita harus mengosongkan pilihan supplier di parent
    // dengan mengirimkan objek kosong.
    if (value) {
      onSelect({ id: '', name: '', color: '' });
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
            results.map(product => (
              <div
                key={product.id}
                className="p-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(product)}
              >
                <div className="font-medium">{product.sku} - {product.name}</div>
                <div className="text-sm text-gray-500">
                  Cost: {formatRupiah(product.cost_price)}
                </div>
              </div>
            ))
          ) : (
            searchTerm.length >= 2 && <div className="p-2 text-center text-sm text-gray-500">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); // Atur tanggal menjadi besok

  // Format ke YYYY-MM-DD
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0, jadi +1
  const day = String(tomorrow.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const PurchaseOrderManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [viewingOrder, setViewingOrder] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const printRef = useRef();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const { user } = useAuth();

  // +++ TAMBAH +++ Logika baru untuk print/download menggunakan useReactToPrint
    const handlePrint = useReactToPrint({
      content: () => printRef.current,
      documentTitle: `PO-${viewingOrder?.order_number || 'document'}`,
      onAfterPrint: () => toast({ title: "Download/Print complete!" }),
    });

  const handleExportToPdf = async () => {
    const element = printRef.current;
    if (!element || !viewingOrder) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const data = canvas.toDataURL('image/png');

    // A4 dimensions in points: 595.28 x 841.89
    // Kita akan skala gambar agar pas di halaman A4
    const pdf = new jsPDF('p', 'pt', 'a4');
    const imgProperties = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
    
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    // Jika konten lebih panjang dari satu halaman A4
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }
    
    pdf.save(`PO-${viewingOrder.order_number}.pdf`);
  };

  const initialFormState = {
    supplier: '',
    supplier_name: '', // Tambahkan untuk menampilkan nama supplier terpilih
    expected_delivery_date: getTomorrowDateString(),
    status: 'DRAFT',
    discount_percentage: '0',
    tax_percentage: '11',
    apply_tax: false,
    shipping_cost: '0',
    notes: '',
    items: []
  };
  const [formData, setFormData] = useState(initialFormState);

  const initialItemState = {
    product: '',
    full_name: '',
    product_sku: '',
    quantity: '1',
    unit_price: '0',
  };
  const [newItem, setNewItem] = useState(initialItemState);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    setLoading(true); // Tampilkan loading saat fetch
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/purchasing/purchase-orders/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.results || data);
      } else {
        throw new Error("Failed to fetch purchase orders");
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Sembunyikan loading setelah selesai
    }
  };

  const handleView = (order) => {
    setViewingOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleInitiateExport = (order) => {
    // Cukup set state exportingOrder dengan data order yang relevan
    setExportingOrder(order);
    toast({ title: "Preparing PDF...", description: "Your download will start shortly." });
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/purchasing/suppliers/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addItem = () => {
    if (!newItem.product) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }

    const newItemId = parseInt(newItem.product);
    const newQuantity = parseInt(newItem.quantity);

    // Cek apakah produk sudah ada di dalam daftar 'items'
    const existingItemIndex = formData.items.findIndex(
      item => item.product === newItemId
    );

    if (existingItemIndex !== -1) {
      // --- PRODUK SUDAH ADA ---
      // Buat salinan dari array items agar tidak memutasi state secara langsung
      const updatedItems = [...formData.items];
      
      // Ambil item yang sudah ada
      const existingItem = updatedItems[existingItemIndex];
      
      // Update kuantitasnya
      existingItem.quantity = newQuantity;
      
      // Update state formData dengan array items yang sudah diperbarui
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));

      toast({
        title: "Quantity Updated",
        description: `Added ${newQuantity} to "${existingItem.full_name}". New quantity is ${existingItem.quantity}.`,
      });

    } else {

      const itemToAdd = {
        id: Date.now(), // ID sementara
        product: parseInt(newItem.product),
        full_name: newItem.full_name, 
        product_sku: newItem.product_sku,
        quantity: newQuantity,
        unit_price: parseFloat(newItem.unit_price)
      };

      setFormData(prev => ({ ...prev, items: [...prev.items, itemToAdd] }));
      setNewItem(initialItemState); // Reset form item
    };
  };

  const removeItem = (id) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const calculateItemSubtotal = (item) => {
    return item.quantity * item.unit_price;
  };

  const calculateOrderTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = formData.apply_tax 
      ? subtotal * (parseFloat(formData.tax_percentage) / 100)
      : 0;
    const orderDiscount = subtotal * (parseFloat(formData.discount_percentage) / 100);
    const afterDiscount = subtotal - orderDiscount;
    const shipping = parseRupiah(formData.shipping_cost);
    const total = subtotal + tax + shipping;
    return { subtotal, tax, shipping, total };
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
        supplier: parseInt(formData.supplier),
        expected_delivery_date: formData.expected_delivery_date,
        status: formData.status,
        discount_percentage: parseFloat(formData.discount_percentage),
        tax_percentage: formData.apply_tax ? parseFloat(formData.tax_percentage) : 0,
        shipping_cost: parseRupiah(formData.shipping_cost),
        notes: formData.notes,
        items: formData.items.map(item => ({
          product_id: item.product, 
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price
        }))
      };

      const url = editingOrder 
        ? `${API_BASE_URL}/purchasing/purchase-orders/${editingOrder.id}/`
        : `${API_BASE_URL}/purchasing/purchase-orders/`;
      
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
        throw new Error(errorData.detail || 'Failed to save purchase order');
      }

      toast({
        title: "Success",
        description: `Purchase order ${editingOrder ? 'updated' : 'created'} successfully.`,
      });
      
      setIsDialogOpen(false);
      resetForm();
      fetchPurchaseOrders();
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
    setFormData(initialFormState);
    setNewItem(initialItemState);
    setEditingOrder(null);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    const processedItems = (order.items || []).map(item => ({
      id: item.id, // Pertahankan ID asli dari backend
      product: item.product?.id,
      // Ambil full_name dari objek product yang di-nest
      full_name: item.product?.full_name || item.product?.name || 'Unknown Product',
      product_sku: item.product?.sku || 'N/A',
      quantity: parseInt(item.quantity),
      unit_price: item.unit_price,
    }));

    setFormData({
      supplier: order.supplier.toString() || '',
      supplier_name: order.supplier_name || '', 
      expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : getTomorrowDateString(),
      status: order.status || 'DRAFT',
      discount_percentage: order.discount_percentage?.toString() || '0',
      tax_percentage: order.tax_percentage?.toString() || '11',
      apply_tax: parseFloat(order.tax_percentage) > 0,
      shipping_cost: order.shipping_cost?.toString() || '0',
      notes: order.notes || '',
      items: processedItems
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'DRAFT': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'CONFIRMED': { color: 'bg-yellow-100 text-yellow-800', label: 'Confirmed' },
      'RECEIVED': { color: 'bg-green-100 text-green-800', label: 'Received' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status] || statusConfig['DRAFT'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleFocusSelectAll = (event) => {
    event.target.select();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const totals = calculateOrderTotals();

  const displayedOrders = purchaseOrders.filter(order =>
    (order.order_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.supplier_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.status?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (orderId) => {
    if (!window.confirm("Are you sure you want to approve this Purchase Order? This action cannot be undone.")) return;
    
    setLoading(true); // Gunakan state loading global
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/purchasing/purchase-orders/${orderId}/approve/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to approve PO');
      }

      const updatedOrder = await response.json();

      toast({ title: "Success", description: "Purchase Order has been approved." });
      
      // Update state secara lokal agar UI langsung berubah tanpa perlu fetch ulang
      setPurchaseOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? updatedOrder : o)
      );
      setViewingOrder(updatedOrder); // Update juga order yang sedang dilihat di dialog

    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>
                {editingOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="po-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                {/* Bagian 1: Header PO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <SupplierSearchDropdown
                      value={formData.supplier_name}
                      onSelect={(supplier) => {
                        handleInputChange('supplier', supplier.id.toString());
                        handleInputChange('supplier_name', supplier.name);
                      }}
                      placeholder="Search and select supplier..."
                      disabled={!!editingOrder}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                    <Input
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                    />
                  </div>
                </div>

                {/* Bagian 2: Form untuk Menambah Item */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold">Add Products to Order</h3>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-6 space-y-2">
                      <Label>Product</Label>
                      <ProductSearchDropdown
                        value={newItem.full_name}
                        onSelect={(product) => {
                          setNewItem(prev => ({
                            ...prev,
                            product: product.id.toString(),
                            full_name: product.full_name || product.name,
                            product_sku: product.sku,
                            unit_price: product.cost_price || '0'
                          }));
                        }}
                        placeholder="Search and select a product..."
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                        onFocus={handleFocusSelectAll} // Terapkan fungsi di sini
                        min="1"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-2">
                      <Label>Unit Price (Rp)</Label>
                      <Input
                        type="text"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseRupiah(e.target.value).toString() }))}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add to List
                  </Button>
                </div>

                {/* Bagian 3: Tabel Item yang Sudah Ditambahkan */}
                {formData.items.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.full_name}</div>
                              <div className="text-sm text-muted-foreground">{item.product_sku}</div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatRupiah(item.unit_price)}</TableCell>
                            <TableCell className="text-right">{formatRupiah(calculateItemSubtotal(item))}</TableCell>
                            <TableCell className="text-center">
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Bagian 4: Ringkasan Total dan Catatan */}
                {formData.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Kolom Kiri: Notes & Status */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          placeholder="Enter additional notes for this order..."
                          rows={4}
                        />
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="RECEIVED">Received</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="apply_tax"
                          checked={formData.apply_tax}
                          onCheckedChange={(checked) => handleInputChange('apply_tax', checked)}
                        />
                        <Label htmlFor="apply_tax" className="cursor-pointer">
                          Apply PPN (Value Added Tax)
                        </Label>
                      </div>
                      {formData.apply_tax && (
                        <div className="space-y-2 pl-6">
                          <Label htmlFor="tax_percentage">Tax (PPN) %</Label>
                          <Input
                            id="tax_percentage"
                            type="number"
                            value={formData.tax_percentage}
                            onChange={(e) => handleInputChange('tax_percentage', e.target.value)}
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Kolom Kanan: Order Summary */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatRupiah(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Shipping:</span>
                        <span>{formatRupiah(totals.shipping)}</span>
                      </div>
                        {formData.apply_tax && (
                        <div className="flex justify-between text-sm">
                          <span>Tax (PPN {formData.tax_percentage}%):</span>
                          <span>{formatRupiah(totals.tax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Total:</span>
                        <span>{formatRupiah(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="po-form" disabled={loading}>
                {loading ? 'Saving...' : (editingOrder ? 'Update Order' : 'Create Order')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>
                Purchase Order View
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              {viewingOrder && <PurchaseOrderView order={viewingOrder} ref={printRef} />}
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
              <div>
                {/* Tombol Approve hanya muncul jika status DRAFT */}
                {viewingOrder?.status === 'DRAFT' && (
                  <Button 
                    onClick={() => handleApprove(viewingOrder.id)} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                <Button onClick={handlePrint}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by PO Number, Supplier, or Status..."
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
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : displayedOrders.length > 0 ? (
                displayedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <a href="#" onClick={(e) => { e.preventDefault(); handleView(order); }} className="text-blue-600 hover:underline">
                        {order.order_number}
                      </a>
                    </TableCell>
                    <TableCell>{order.supplier_name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{order.expected_delivery_date ? formatDate(order.expected_delivery_date) : 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{formatRupiah(order.total_amount)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleView(order)} title="View Document">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleView(order)} title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        {viewingOrder?.status === 'DRAFT' && (
                        <Button variant="outline" size="sm" onClick={() => handleEdit(order)} title="Edit Order">
                          <Edit className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">No purchase orders found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderManagement;
