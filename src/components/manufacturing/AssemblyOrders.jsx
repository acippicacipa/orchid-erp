import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Play, CheckCircle, XCircle, PackageCheck, ClipboardCheck } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "../ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const STATUS_CHOICES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const PRIORITY_CHOICES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

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

// Product Search Component
const ProductSearchDropdown = ({ onSelect, initialValue = '' }) => {
  const { token } = useAuth(); // Ambil token dari context
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fungsi untuk mencari produk ke backend
  const searchProducts = async (query) => {
    if (query.length < 3) {
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
        
        // ==============================================================================
        // PERUBAHAN UTAMA DI SINI: Mengambil data dari properti 'results'
        // ==============================================================================
        const products = Array.isArray(data.results) ? data.results : [];
        
        // Filter hanya untuk produk yang bisa diproduksi (jika diperlukan)
        setResults(products.filter(p => p.is_manufactured));
      }
    } catch (error) {
      console.error("Failed to search products:", error);
      setResults([]); // Pastikan state adalah array kosong jika terjadi error
    } finally {
      setIsLoading(false);
    }
  };

  // Gunakan useEffect untuk memicu pencarian dengan debounce (penundaan)
  useEffect(() => {
    const handler = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300); // Tunda 300ms setelah user berhenti mengetik

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, token]);
  
  // Handler saat item di dropdown dipilih
  const handleSelect = (product) => {
    setSearchTerm(product.full_name); // Isi input dengan nama produk yang dipilih
    onSelect(product); // Kirim seluruh objek produk ke parent component
    setShowDropdown(false); // Sembunyikan dropdown
  };

  return (
    <div className="relative">
      <Input
        placeholder="Type to search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay untuk mengizinkan klik
        required
      />
      {showDropdown && (
        <div className="absolute top-full left-0 z-20 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(product => (
              <div
                key={product.id}
                className="p-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(product)} // Gunakan onMouseDown
              >
                <div className="font-medium">{product.sku} - {product.name} {product.color}</div>
                <div className="text-sm text-gray-500">{product.brand || 'No Brand'}</div>
              </div>
            ))
          ) : (
            searchTerm.length >= 3 && <div className="p-2 text-center text-sm text-gray-500">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
};

const AssemblyOrders = ( ) => {
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [boms, setBoms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newOrder, setNewOrder] = useState({
    product: '',
    bom: '',
    quantity: '1',
    production_location: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_completion_date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    description: '',
    notes: '',
    special_instructions: '',
  });
  const [editingOrder, setEditingOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [orderBeingChecked, setOrderBeingChecked] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingOrder, setReportingOrder] = useState(null);
  const [quantityProduced, setQuantityProduced] = useState('');

  const handleCheckAvailability = async (order) => {
    setLoadingCheck(true);
    setAvailabilityData(null); // Reset data sebelumnya
    setOrderBeingChecked(order); 
    setIsAvailabilityModalOpen(true); // Buka modal segera

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/assembly-orders/${order.id}/check-availability/`, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check availability');
      }

      const data = await response.json();
      setAvailabilityData(data);

    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsAvailabilityModalOpen(false); // Tutup modal jika error
    } finally {
      setLoadingCheck(false);
    }
  };

  useEffect(() => {
    fetchAssemblyOrders();
    fetchProducts();
    fetchBoms();
    fetchLocations();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/products/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAssemblyOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/assembly-orders/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch assembly orders');
      }
      const data = await response.json();
      setAssemblyOrders(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchBoms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/boms/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch BOMs');
      }
      const data = await response.json();
      setBoms(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/locations/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setNewOrder(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingOrder ? 'PUT' : 'POST';
      const url = editingOrder 
        ? `${API_BASE_URL}/inventory/assembly-orders/${editingOrder.id}/` 
        : `${API_BASE_URL}/inventory/assembly-orders/`;
      
      const payload = {
        product: parseInt(newOrder.product), // Pastikan ini integer
        bom: parseInt(newOrder.bom), // Pastikan ini integer
        quantity: parseFloat(newOrder.quantity), // Pastikan ini float/decimal
        
        // Kirim ID sebagai integer, atau null jika tidak ada.
        // Backend akan mengabaikan jika 'null' atau '' dikirim dan fieldnya nullable.
        production_location: newOrder.production_location ? parseInt(newOrder.production_location) : null,
        
        // Field lainnya dari state newOrder
        planned_start_date: newOrder.planned_start_date,
        planned_completion_date: newOrder.planned_completion_date,
        priority: newOrder.priority,
        description: newOrder.description,
        notes: newOrder.notes,
        special_instructions: newOrder.special_instructions,
      };

      if (!payload.product || !payload.bom || !payload.production_location) {
          toast({
              title: "Validation Error",
              description: "Product, BOM, and Production Location are required.",
              variant: "destructive"
          });
          return; // Hentikan proses
      }

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
      const errorMessage = Object.values(errorData).flat().join(' ');
      throw new Error(errorMessage || 'Failed to save assembly order');
    }

      toast({
        title: "Success",
        description: `Assembly Order ${editingOrder ? 'updated' : 'created'} successfully.`, 
      });
      setIsModalOpen(false);
      setNewOrder({
        product: '', bom: '', quantity: '1', production_location: '',
        planned_start_date: new Date().toISOString().split('T')[0],
        planned_completion_date: new Date().toISOString().split('T')[0],
        priority: 'NORMAL', description: '', notes: '', special_instructions: '',
      });
      setEditingOrder(null);
      fetchAssemblyOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setNewOrder({
    // Jika order.product ada, ambil id-nya. Jika tidak, set ke string kosong.
      product: order.product?.id?.toString() ?? '',
      
      // Lakukan hal yang sama untuk BOM
      bom: order.bom?.id?.toString() ?? '',
      
      quantity: order.quantity,
      
      // Dan juga untuk production_location
      production_location: order.production_location?.id?.toString() ?? '',
      
      // Sisa field lainnya sudah aman
      planned_start_date: order.planned_start_date ? order.planned_start_date.split('T')[0] : '',
      planned_completion_date: order.planned_completion_date ? order.planned_completion_date.split('T')[0] : '',
      priority: order.priority || 'NORMAL',
      description: order.description || '',
      notes: order.notes || '',
      special_instructions: order.special_instructions || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assembly order?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/assembly-orders/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete assembly order');
      }
      toast({
        title: "Success",
        description: "Assembly Order deleted successfully.",
      });
      fetchAssemblyOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAction = async (order, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/assembly-orders/${order.id}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData) || `Failed to ${action} assembly order`);
      }

      toast({
        title: "Success",
        description: `Assembly Order ${action} successfully.`, 
      });
      fetchAssemblyOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // const getProductFullName = (product) => {
  //   if (!product) return 'N/A';
  //   const parts = [product.name];
  //   if (product.brand) parts.push(`Brand: ${product.brand}`);
  //   if (product.color) parts.push(`Color: ${product.color}`);
  //   if (product.size) parts.push(`Size: ${product.size}`);
  //   return parts.join(' | ');
  // };

  const handleReleaseFromCheck = async () => {
    if (!orderBeingChecked) return;

    // Panggil fungsi handleAction yang sudah ada
    await handleAction(orderBeingChecked, 'release');

    // Tutup dialog setelah aksi selesai
    setIsAvailabilityModalOpen(false);
    setOrderBeingChecked(null); // Bersihkan state
  };

  const openReportDialog = (order) => {
    setReportingOrder(order);
    // Set sisa kuantitas sebagai default
    const remainingQty = parseFloat(order.quantity) - parseFloat(order.quantity_produced);
    setQuantityProduced(remainingQty > 0 ? remainingQty.toString() : '0');
    setIsReportModalOpen(true);
  };

  // --- FUNGSI BARU UNTUK MENGIRIM DATA HASIL PRODUKSI ---
  const handleReportProduction = async () => {
    if (!reportingOrder || !quantityProduced || parseFloat(quantityProduced) <= 0) {
      toast({ title: "Error", description: "Please enter a valid quantity.", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/assembly-orders/${reportingOrder.id}/report-production/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity_produced: quantityProduced }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to report production');
      }

      toast({ title: "Success", description: "Production reported and stock updated." });
      setIsReportModalOpen(false);
      fetchAssemblyOrders(); // Refresh daftar order

    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getPriorityBadge = (priority) => {
    let variant;
    let className;

    switch (priority) {
      case 'URGENT':
        variant = 'destructive'; // Merah solid
        className = 'text-white';
        break;
      case 'HIGH':
        variant = 'default'; // Warna primer (biasanya biru atau hitam)
        className = 'bg-orange-500 hover:bg-orange-600 text-white'; // Custom oranye
        break;
      case 'NORMAL':
        variant = 'secondary'; // Abu-abu
        break;
      case 'LOW':
        variant = 'outline'; // Hanya border
        break;
      default:
        variant = 'secondary';
    }

    const priorityLabel = PRIORITY_CHOICES.find(p => p.value === priority)?.label || priority;

    return (
      <Badge variant={variant} className={className}>
        {priorityLabel}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Assembly Order Management</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingOrder(null);
              setNewOrder({
                product: '', bom: '', quantity: '1', production_location: '',
                planned_start_date: new Date().toISOString().split('T')[0],
                planned_completion_date: new Date().toISOString().split('T')[0],
                priority: 'NORMAL', description: '', notes: '', special_instructions: '',
              });
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Assembly Order
            </Button>
          </DialogTrigger>
          {/* ============================================================================== */}
          {/* PERUBAHAN UTAMA DI SINI: Merestrukturisasi DialogContent */}
          {/* ============================================================================== */}
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>{editingOrder ? 'Edit Assembly Order' : 'Create New Assembly Order'}</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="assembly-order-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="product">Product to Produce</Label>
                  <ProductSearchDropdown
                    // --- PERUBAHAN DI SINI ---
                    // Gunakan optional chaining (?.) untuk keamanan
                    initialValue={editingOrder?.product?.name || ''}
                    onSelect={(product) => {
                      setNewOrder(prev => ({ ...prev, product: product.id.toString() }));
                    }}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="bom">Bill of Materials</Label>
                  <Select name="bom" value={newOrder.bom} onValueChange={(value) => handleSelectChange('bom', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a BOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {boms.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>{b.bom_number} - {b.product_name} {b.product_color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity to Produce</Label>
                  <Input id="quantity" name="quantity" type="number" step="1" value={newOrder.quantity} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="production_location">Production Location</Label>
                  <Select name="production_location" value={newOrder.production_location} onValueChange={(value) => handleSelectChange('production_location', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select production location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.filter(l => l.is_manufacturing_location).map(l => (
                        <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="planned_start_date">Planned Start Date</Label>
                  <Input id="planned_start_date" name="planned_start_date" type="date" value={newOrder.planned_start_date} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="planned_completion_date">Planned Completion Date</Label>
                  <Input id="planned_completion_date" name="planned_completion_date" type="date" value={newOrder.planned_completion_date} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" value={newOrder.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_CHOICES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={newOrder.description} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={newOrder.notes} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea id="special_instructions" name="special_instructions" value={newOrder.special_instructions} onChange={handleInputChange} />
                </div>
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="submit" form="assembly-order-form">Save Assembly Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex justify-end mb-4">  
        <Dialog open={isAvailabilityModalOpen} onOpenChange={setIsAvailabilityModalOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Material Availability Check</DialogTitle>
              {availabilityData && <p className="text-sm text-muted-foreground">For Assembly Order: {availabilityData.order_number}</p>}
            </DialogHeader>
            <div className="py-4">
              {loadingCheck ? (
                <div className="text-center">Checking stock levels...</div>
              ) : availabilityData ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Required</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Shortage</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availabilityData.components.map(comp => (
                        <TableRow key={comp.component_id}>
                          <TableCell>
                            <div className="font-medium">{comp.component_name} {comp.component_color}</div>
                          </TableCell>
                          <TableCell className="text-right">{comp.required_quantity}</TableCell>
                          <TableCell className="text-right">{comp.available_quantity}</TableCell>
                          <TableCell className={`text-right font-bold ${comp.shortage > 0 ? 'text-red-600' : ''}`}>
                            {comp.shortage}
                          </TableCell>
                          <TableCell>
                            <Badge variant={comp.status === 'Available' ? 'default' : 'destructive'}>
                              {comp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className={`p-4 text-center font-bold ${availabilityData.is_fully_available ? 'text-green-600' : 'text-orange-600'}`}>
                    {availabilityData.is_fully_available ? 'All components are available.' : 'There is a shortage of one or more components.'}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">No data to display.</div>
              )}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setIsAvailabilityModalOpen(false)}>Close</Button>
              
              {/* Tampilkan tombol Release hanya jika data sudah dimuat dan tidak ada error */}
              {!loadingCheck && availabilityData && (
                <Button
                  onClick={handleReleaseFromCheck}
                  // Beri warna berbeda jika ada kekurangan stok untuk memberi peringatan
                  variant={availabilityData.is_fully_available ? 'default' : 'destructive'}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {availabilityData.is_fully_available ? 'Release Order' : 'Release Anyway (Shortage)'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report Production Output</DialogTitle>
              {reportingOrder && <p className="text-sm text-muted-foreground">For Order: {reportingOrder.order_number}</p>}
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label>Total to Produce</Label>
                      <Input value={reportingOrder ? parseInt(reportingOrder.quantity) : ''} disabled />
                  </div>
                  <div>
                      <Label>Already Produced</Label>
                      <Input value={reportingOrder ? parseInt(reportingOrder.quantity_produced) : ''} disabled />
                  </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity_produced">Quantity Finished Now</Label>
                <Input
                  id="quantity_produced"
                  type="number"
                  value={quantityProduced}
                  onChange={(e) => setQuantityProduced(e.target.value)}
                  placeholder="Enter quantity of finished goods"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Cancel</Button>
              <Button onClick={handleReportProduction}>Confirm & Update Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>BOM</TableHead>
              <TableHead>Qty to Produce</TableHead>
              <TableHead>Qty Produced</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assemblyOrders.length > 0 ? (
              assemblyOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.product_name} {order.product_color}</TableCell>
                  <TableCell>{order.bom_number}</TableCell>
                  <TableCell>{parseInt(order.quantity)}</TableCell>
                  <TableCell>{parseInt(order.quantity_produced)}</TableCell>
                  <TableCell>{order.production_location ? order.production_location_name : 'N/A'}</TableCell>
                  <TableCell>{STATUS_CHOICES.find(s => s.value === order.status)?.label || order.status}</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(order)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {order.status === 'DRAFT' && (
                      <Button variant="outline" size="sm" onClick={() => handleCheckAvailability(order)} title="Check Material Availability">
                        <PackageCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'RELEASED' && (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(order, 'start-production')} title="Start Production">
                        <Play className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {order.status === 'IN_PROGRESS' && (
                      <Button variant="outline" size="sm" onClick={() => openReportDialog(order)} title="Report Production Output">
                        <ClipboardCheck className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {order.status === 'IN_PROGRESS' && (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(order, 'complete')} title="Complete Production">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                      </Button>
                    )}
                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(order, 'cancel')} className="text-red-500" title="Cancel Order">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No assembly orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AssemblyOrders;
