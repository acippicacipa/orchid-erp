import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Play, CheckCircle, XCircle, PackageCheck, ClipboardCheck, Printer, Search } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "../ui/badge";
import { useReactToPrint } from 'react-to-print';

import ProductSearchDropdown from '../sales/ProductSearchDropdown';

// +++ TAMBAHKAN KOMPONEN PRINTABLE BARU +++
const PrintableMaterialList = React.forwardRef(({ order }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} className="p-4 font-mono text-xs">
      <h2 className="text-center font-bold text-sm mb-2">MATERIAL PICKING LIST</h2>
      <div className="text-center mb-2">------------------------------------</div>
      <div className="mb-2">
        <p><strong>Order #:</strong> {order.order_number}</p>
        <p><strong>Product:</strong> {order.product_name} {order.product_color}</p>
        <p><strong>Qty:</strong> {parseInt(order.quantity)}</p>
      </div>
      <div className="text-center mb-2">------------------------------------</div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">COMPONENT</th>
            <th className="text-right">QTY</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map(item => (
            <tr key={item.id}>
              <td className="py-1">{item.component_name}</td>
              <td className="text-right py-1">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-center mt-2">------------------------------------</div>
      <p className="text-center text-xs mt-2">Generated: {new Date().toLocaleString()}</p>
    </div>
  );
});
PrintableMaterialList.displayName = 'PrintableMaterialList';

const PrintableProductionReport = React.forwardRef(({ order, producedQty }, ref) => {
  if (!order) return null;

  // Hitung material yang terpakai berdasarkan kuantitas yang diproduksi
  const usedItems = (order.items || []).map(item => {
    const qtyPerProduct = item.quantity / order.quantity;
    const usedQty = qtyPerProduct * producedQty;
    return { ...item, used_quantity: usedQty };
  });

  return (
    <div ref={ref} className="p-4 font-mono text-xs">
      <h2 className="text-center font-bold text-sm mb-2">PRODUCTION REPORT</h2>
      <div className="text-center mb-2">------------------------------------</div>
      <div className="mb-2">
        <p><strong>Order #:</strong> {order.order_number}</p>
        <p><strong>Product:</strong> {order.product_name} {order.product_color}</p>
        <p><strong>Qty Produced:</strong> {producedQty}</p>
        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
      </div>
      <div className="text-center mb-2">------------------------------------</div>
      <h3 className="font-bold mb-1">Materials Consumed:</h3>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left w-[10%]">NO.</th>
            <th className="text-left w-[60%]">COMPONENT</th>
            <th className="text-right w-[30%]">QTY USED</th>
          </tr>
        </thead>
        <tbody>
          {usedItems.map((item, index) => (
            <tr key={item.id}>
              <td className="py-1">{index + 1}.</td>
              <td className="py-1">{item.component_name}</td>
              <td className="text-right py-1">{item.used_quantity.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-center mt-2">------------------------------------</div>
    </div>
  );
});
PrintableProductionReport.displayName = 'PrintableProductionReport';

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

const AssemblyOrders = ( ) => {
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [boms, setBoms] = useState([]);
  const [availableBoms, setAvailableBoms] = useState([]); 
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const initialOrderState = {
    product: '',
    product_name: '', // State untuk nama produk yang ditampilkan
    bom: '',
    quantity: '1',
    production_location: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_completion_date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    description: '',
    notes: '',
    special_instructions: '',
  };
  const [newOrder, setNewOrder] = useState(initialOrderState);

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

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const printRef = useRef(null);

  const [isProductionPrintDialogOpen, setIsProductionPrintDialogOpen] = useState(false);
  const [reportToPrint, setReportToPrint] = useState(null); // Berisi { order, producedQty }
  const productionPrintRef = useRef(null);

  const handleProductionPrint = useReactToPrint({
    content: () => productionPrintRef.current,
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const fetchBomsForProduct = async (productId) => {
    if (!productId) {
      setAvailableBoms([]); // Kosongkan jika tidak ada produk
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/boms/?product=${productId}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const boms = data.results || data;
        setAvailableBoms(boms);

        // --- LOGIKA OTOMATIS ---
        // Jika hanya ada satu BOM, atau ada satu BOM yang default, pilih otomatis
        if (boms.length === 1) {
          setNewOrder(prev => ({ ...prev, bom: boms[0].id.toString() }));
        } else {
          const defaultBom = boms.find(b => b.is_default);
          if (defaultBom) {
            setNewOrder(prev => ({ ...prev, bom: defaultBom.id.toString() }));
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch BOMs for product", error);
    }
  };

  const fetchAssemblyOrders = async (searchQuery = '') => {
    try {
      const token = localStorage.getItem('token');
      const url = new URL(`${API_BASE_URL}/inventory/assembly-orders/`);
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch assembly orders');
      
      const data = await response.json();
      setAssemblyOrders(data.results || data);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAssemblyOrders(searchTerm);
    }, 500); // Tunda 500ms setelah user berhenti mengetik

    // Fetch data lain hanya sekali saat komponen dimuat
    if (!locations.length) fetchLocations();
    
    return () => clearTimeout(handler);
  }, [searchTerm]);

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
    setNewOrder(prev => ({ ...prev, [name]: value }));
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

  const handleEdit = async (order) => {
    setEditingOrder(order);
    setIsModalOpen(true);

    // Ambil BOM yang relevan untuk produk ini
    const token = localStorage.getItem('token');
    const bomResponse = await fetch(`${API_BASE_URL}/inventory/boms/?product=${order.product}`, {
      headers: { 'Authorization': `Token ${token}` },
    });
    if (bomResponse.ok) {
      const bomData = await bomResponse.json();
      setBoms(bomData.results || bomData);
    }

    if (order.product) {
      fetchBomsForProduct(order.product);
    }

    // Set state form dengan data dari order yang dipilih
    setNewOrder({
      product: order.product?.toString() ?? '',
      product_name: `${order.product_name || ''} ${order.product_color || ''}`.trim(),
      bom: order.bom?.toString() ?? '',
      quantity: order.quantity,
      production_location: order.production_location?.toString() ?? '',
      planned_start_date: order.planned_start_date ? order.planned_start_date.split('T')[0] : '',
      planned_completion_date: order.planned_completion_date ? order.planned_completion_date.split('T')[0] : '',
      priority: order.priority || 'NORMAL',
      description: order.description || '',
      notes: order.notes || '',
      special_instructions: order.special_instructions || '',
    });
  };

  const resetForm = () => {
    setNewOrder(initialOrderState);
    setAvailableBoms([]);
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
    const actionMessages = {
      'start-production': 'Are you sure you want to start production for this order?',
      'complete': 'Are you sure you want to mark this order as completed?',
      'cancel': 'Are you sure you want to cancel this order? This may affect stock allocation.',
    };
    if (!window.confirm(actionMessages[action] || `Are you sure you want to perform this action?`)) return;

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

  const handleReleaseFromCheck = async () => {
    const confirmMessage = availabilityData.is_fully_available
      ? 'All materials are available. Do you want to release this order for production?'
      : 'There is a material shortage. Do you want to release this order anyway?';
    if (!window.confirm(confirmMessage)) return;
    
    if (!orderBeingChecked) return;
    // 1. Set order yang akan di-print
    setOrderToPrint(orderBeingChecked);  
    // 2. Buka dialog print
    setIsPrintDialogOpen(true);
    // 3. Tutup dialog availability check
    setIsAvailabilityModalOpen(false);
  };

  const confirmReleaseAndPrint = async () => {
    if (!orderToPrint) return;

    // Panggil handlePrint untuk membuka dialog cetak browser
    handlePrint();

    // Panggil API untuk mengubah status order
    await handleAction(orderToPrint, 'release');

    // Tutup dialog print setelah selesai
    setIsPrintDialogOpen(false);
    setOrderToPrint(null);
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
    if (!window.confirm(`Are you sure you want to report ${quantityProduced} units as finished? This will consume materials from stock.`)) return;

    if (!reportingOrder || !quantityProduced || parseFloat(quantityProduced) <= 0) {
      toast({ title: "Error", description: "Please enter a valid quantity.", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/assembly-orders/${reportingOrder.id}/report-production/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity_produced: quantityProduced }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to report production');
      }

      toast({ title: "Success", description: "Production reported and stock updated." });
      
      // --- LOGIKA BARU SETELAH SUKSES ---
      // 1. Siapkan data untuk dicetak
      setReportToPrint({ order: reportingOrder, producedQty: parseFloat(quantityProduced) });
      
      // 2. Buka dialog print
      setIsProductionPrintDialogOpen(true);
      
      // 3. Tutup dialog report
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
      <div className="flex justify-between items-center mb-2 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assembly Orders</h2>
          <p className="text-muted-foreground">Manage and track all production orders.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order #, Product, or Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingOrder(null);
              setNewOrder(initialOrderState);
              setAvailableBoms([]); // Jangan lupa reset BOM
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New
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
                    value={newOrder.product_name}
                    onValueChange={(text) => {
                      setNewOrder(prev => ({ ...prev, product_name: text, product: '', bom: '' })); // Reset BOM saat produk diubah
                      setAvailableBoms([]);
                    }}
                    onSelect={(product) => {
                      setNewOrder(prev => ({
                        ...prev,
                        product: product.id.toString(),
                        product_name: `${product.name} ${product.color || ''}`.trim(),
                        bom: '',
                      }));
                      fetchBomsForProduct(product.id);
                    }}
                    placeholder="Search manufactured product..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="bom">Bill of Materials</Label>
                  <Select 
                    name="bom" 
                    value={newOrder.bom} 
                    onValueChange={(value) => handleSelectChange('bom', value)} 
                    required
                    disabled={!newOrder.product} // Disable jika produk belum dipilih
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!newOrder.product ? "Select a product first" : "Select a BOM"} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Gunakan state `availableBoms` */}
                      {availableBoms.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.bom_number} - v{b.version} {b.is_default ? '(Default)' : ''}
                        </SelectItem>
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
          <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Material Availability Check</DialogTitle>
              {availabilityData && <p className="text-sm text-muted-foreground">For Assembly Order: {availabilityData.order_number}</p>}
            </DialogHeader>
            <div className="flex-grow overflow-y-auto p-6">
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
            <DialogFooter className="p-6 pt-4 border-t sm:justify-between">
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
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Print Material List</DialogTitle>
              <p className="text-sm text-muted-foreground">
                A material list for order <strong>{orderToPrint?.order_number}</strong> is ready to be printed.
              </p>
            </DialogHeader>
            <div className="py-4 border rounded-lg my-4">
              {/* Pratinjau kecil dari apa yang akan dicetak */}
              <div className="max-h-64 overflow-y-auto px-2">
                <PrintableMaterialList order={orderToPrint} ref={printRef} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmReleaseAndPrint}>
                Print & Confirm Release
              </Button>
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
              <TableHead>Qty Plan</TableHead>
              <TableHead>Qty Produced</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
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
                    {order.status === 'DRAFT' && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'DRAFT' && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {searchTerm ? `No orders found for "${searchTerm}".` : 'No assembly orders found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isProductionPrintDialogOpen} onOpenChange={setIsProductionPrintDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Print Production Report</DialogTitle>
            <p className="text-sm text-muted-foreground">
              A report for order <strong>{reportToPrint?.order?.order_number}</strong> is ready.
            </p>
          </DialogHeader>
          <div className="py-4 border rounded-lg my-4">
            <div className="max-h-64 overflow-y-auto px-2">
              <PrintableProductionReport 
                ref={productionPrintRef} 
                order={reportToPrint?.order} 
                producedQty={reportToPrint?.producedQty} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductionPrintDialogOpen(false)}>Close</Button>
            <Button onClick={handleProductionPrint}>
              <Printer className="mr-2 h-4 w-4" /> Print Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssemblyOrders;
