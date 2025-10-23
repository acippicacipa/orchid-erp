import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
// import { useAuth } from '@/contexts/AuthContext'; // Auth context is good practice but not directly used in the logic here
import { Plus, Eye, Loader2, Trash2, X, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const SupplierSelector = ({ value, onValueChange }) => {
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = localStorage.getItem('token');
        // Pastikan endpoint ini benar sesuai dengan URL purchasing app Anda
        const res = await fetch(`${API_BASE_URL}/purchasing/suppliers/`, { headers: { 'Authorization': `Token ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setSuppliers(data.results || []);
      } catch (error) {
        console.error("Failed to fetch suppliers", error);
      }
    };
    fetchSuppliers();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder="Select a supplier..." /></SelectTrigger>
      <SelectContent>
        {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

const ProductSelector = ({ onSelectProduct }) => {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/inventory/products/`, { headers: { 'Authorization': `Token ${token}` } });
      const data = await res.json();
      setProducts(data.results || []);
    };
    fetchProducts();
  }, []);

  return (
    <Select onValueChange={(productId) => onSelectProduct(products.find(p => p.id === parseInt(productId)))}>
      <SelectTrigger><SelectValue placeholder="Search and select a product..." /></SelectTrigger>
      <SelectContent>
        {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku})</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

const GoodsReceiptManagement = ( ) => {
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const { toast } = useToast();

  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [receiptMode, setReceiptMode] = useState('from-po');

  const initialFormState = {
    purchase_order: null,
    supplier: '', // <-- Tambahkan state untuk supplier
    location: '',
    notes: '',
    items: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- FIXED DATA FETCHING ---
  const fetchGoodsReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/goods-receipts/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch goods receipts');
      const data = await response.json();
      // **FIX**: Handle paginated response from DRF
      setGoodsReceipts(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setGoodsReceipts([]); // Ensure it's an array on error
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGoodsReceipts();
    const fetchSupportingData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [poRes, locRes, aoRes] = await Promise.all([
          fetch(`${API_BASE_URL}/inventory/goods-receipts/available_purchase_orders/`, { headers: { 'Authorization': `Token ${token}` } }),
          fetch(`${API_BASE_URL}/inventory/locations/?is_purchasable_location=true`, { headers: { 'Authorization': `Token ${token}` } }),
          fetch(`${API_BASE_URL}/inventory/goods-receipts/available_assembly_orders/`, { headers: { 'Authorization': `Token ${token}` } })
        ]);
        
        if (!poRes.ok) throw new Error('Failed to fetch Purchase Orders.');
        const poData = await poRes.json();
        
        if (!locRes.ok) throw new Error('Failed to fetch Locations.');
        const locData = await locRes.json();

        if (!aoRes.ok) throw new Error('Failed to fetch Assembly Orders.');
        const aoData = await aoRes.json();
        setAssemblyOrders(Array.isArray(aoData) ? aoData : aoData.results || []);

        // **FIX**: Handle both direct array and paginated DRF responses
        setPurchaseOrders(Array.isArray(poData) ? poData : poData.results || []);
        setLocations(Array.isArray(locData.results) ? locData.results : Array.isArray(locData) ? locData : []);

      } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    };
    fetchSupportingData();
  }, [fetchGoodsReceipts, toast]);

  const handleConfirmReceipt = async () => {
    if (!selectedReceipt) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/goods-receipts/${selectedReceipt.id}/confirm_receipt/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm the receipt.');
      }

      toast({
        title: "Success",
        description: `Receipt #${selectedReceipt.receipt_number} has been confirmed and stock has been updated.`,
      });

      // Close the dialog and refresh the data
      setIsViewDialogOpen(false);
      fetchGoodsReceipts();

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
  };

  const handleModeChange = (mode) => {
    setReceiptMode(mode);
    resetForm(); // Reset form setiap kali berganti mode
  };

  const handlePOSelection = (poId) => {
    const po = purchaseOrders.find(p => p.id === parseInt(poId));
    if (po) {
      const itemsFromPO = po.items.map(item => ({
        // Gunakan ID unik sementara untuk key di React
        temp_id: `po_item_${item.id}`,
        purchase_order_item: item.id,
        product: item.product,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity_ordered: item.quantity,
        quantity_remaining: item.quantity_remaining,
        quantity_received: 0,
        unit_price: item.unit_price,
      }));
      setFormData(prev => ({
        ...prev,
        purchase_order: po.id,
        supplier: po.supplier, // <-- Otomatis isi supplier dari PO
        notes: `Receipt for PO #${po.order_number}`,
        items: itemsFromPO,
      }));
    }
  };

  const handleAOSelection = (aoId) => {
    const ao = assemblyOrders.find(a => a.id === parseInt(aoId));
    if (ao) {
      // Buat item dari produk jadi Assembly Order
      const itemFromAO = {
        temp_id: `ao_item_${ao.id}`,
        assembly_order_item: null, // Tidak ada item spesifik, hanya order utama
        product: ao.product,
        product_name: ao.product_name,
        product_sku: ao.product_sku,
        // Kuantitas yang diorder adalah sisa yang belum diterima
        quantity_ordered: parseFloat(ao.quantity) - parseFloat(ao.quantity_received || 0),
        quantity_received: 0,
        unit_price: ao.cost_price || 0, // Gunakan cost price dari produk
      };
      setFormData(prev => ({
        ...prev,
        assembly_order: ao.id, // Simpan ID Assembly Order
        purchase_order: null,
        supplier: null, // Tidak ada supplier
        notes: `Receipt for Assembly Order #${ao.order_number}`,
        items: [itemFromAO], // Hanya ada satu item yaitu produk jadi
        location: ao.production_location ? ao.production_location.toString() : '',
      }));
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...formData.items];
    const numValue = Number(value);
    if (field === 'quantity_received' || field === 'unit_price') {
      updatedItems[index][field] = isNaN(numValue) ? 0 : Math.max(0, numValue);
    } else {
      updatedItems[index][field] = value;
    }
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleAddItemManual = (product) => {
    if (!product) return;
    // Cek duplikat
    if (formData.items.some(item => item.product === product.id)) {
        toast({ title: "Info", description: "Product already in the list.", variant: "default" });
        return;
    }
    const newItem = {
        temp_id: `manual_${Date.now()}`, // ID unik sementara
        product: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity_received: 1,
        unit_price: 0, // Harga harus diisi manual
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleCreateReceipt = async () => {
    if (!formData.location) {
      toast({ title: "Validation Error", description: "Please select a receive location.", variant: "destructive" });
      return;
    }
    const itemsToSubmit = formData.items.filter(item => Number(item.quantity_received) > 0);
    if (itemsToSubmit.length === 0) {
      toast({ title: "Validation Error", description: "Add at least one item with quantity > 0.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isManualMode = receiptMode === 'manual';
      const isFromPO = receiptMode === 'from-po';
      const isFromAO = receiptMode === 'from-assembly';
      const payload = {
        location: formData.location,
        notes: formData.notes,
        // Atur field sumber berdasarkan mode
        purchase_order: isFromPO ? formData.purchase_order : null,
        assembly_order: isFromAO ? formData.assembly_order : null,
        supplier: isManualMode ? (formData.supplier || null) : null,
        
        items: itemsToSubmit.map(item => ({
          product: item.product,
          quantity_received: Number(item.quantity_received),
          unit_price: Number(item.unit_price),
          quantity_ordered: isManualMode ? Number(item.quantity_received) : item.quantity_ordered,
          // Kirim relasi ke item sumber jika ada
          ...(isFromPO && { purchase_order_item: item.purchase_order_item }),
          ...(isFromAO && { assembly_order_item: item.assembly_order_item }), // Jika perlu
        })),
      };
      
      const response = await fetch(`${API_BASE_URL}/inventory/goods-receipts/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }
      
      toast({ title: "Success", description: "Goods receipt created successfully." });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchGoodsReceipts();
    } catch (error) {
      toast({ title: "Error Creating Receipt", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'DRAFT': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100 text-gray-800';
    return <Badge className={config}>{status}</Badge>;
  };

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Goods Receipt</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" /> Create Receipt</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Create Goods Receipt</DialogTitle>
            </DialogHeader>
            <Tabs value={receiptMode} onValueChange={handleModeChange} className="flex-grow overflow-y-auto">
              <div className="px-6 pt-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="from-po">From Purchase Order</TabsTrigger>
                  <TabsTrigger value="manual">Manual Receipt</TabsTrigger>
                  <TabsTrigger value="from-assembly">From Assembly</TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Konten untuk setiap tab */}
                <TabsContent value="from-po" className="mt-0 space-y-8">
                  <div className="space-y-2">
                    <Label>Select Purchase Order</Label>
                    <Select onValueChange={handlePOSelection}>
                      <SelectTrigger><SelectValue placeholder="Select a PO..." /></SelectTrigger>
                      <SelectContent>{purchaseOrders.map(po => <SelectItem key={po.id} value={po.id.toString()}>{po.order_number} - {po.supplier_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {/* Tabel Item untuk PO */}
                  {formData.items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead>Receive Qty</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={item.temp_id}>
                              <TableCell><div className="font-medium">{item.product_name}</div><div className="text-sm text-muted-foreground">{item.product_sku}</div></TableCell>
                              <TableCell className="text-right">{item.quantity_remaining}</TableCell>
                              <TableCell><Input type="text" value={item.quantity_received} onChange={e => updateItem(index, 'quantity_received', e.target.value)} className="w-28" min="0" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="mt-0 space-y-8">
                  <div className="space-y-2">
                    <Label>Supplier (Optional)</Label>
                    <SupplierSelector 
                      value={formData.supplier} 
                      onValueChange={v => setFormData(p => ({...p, supplier: v}))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Add Product to List</Label>
                    <ProductSelector onSelectProduct={handleAddItemManual} />
                  </div>
                  {/* Tabel Item untuk Manual */}
                  {formData.items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Receive Qty</TableHead><TableHead>Unit Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={item.temp_id}>
                              <TableCell><div className="font-medium">{item.product_name}</div><div className="text-sm text-muted-foreground">{item.product_sku}</div></TableCell>
                              <TableCell><Input type="text" value={item.quantity_received} onChange={e => updateItem(index, 'quantity_received', e.target.value)} className="w-28" min="0" /></TableCell>
                              <TableCell><Input type="text" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} className="w-28" min="0" /></TableCell>
                              <TableCell><Button variant="destructive" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="from-assembly" className="mt-0 space-y-8">
                  <div className="space-y-2">
                    <Label>Select Assembly Order</Label>
                    <Select onValueChange={handleAOSelection}>
                      <SelectTrigger><SelectValue placeholder="Select an Assembly Order to receive..." /></SelectTrigger>
                      <SelectContent>
                        {assemblyOrders.map(ao => (
                          <SelectItem key={ao.id} value={ao.id.toString()}>
                            {ao.order_number} - {ao.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Tabel Item untuk Assembly */}
                  {formData.items.length > 0 && formData.assembly_order && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow><TableHead>Finished Product</TableHead><TableHead className="text-right">Remaining to Receive</TableHead><TableHead>Receive Qty</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={item.temp_id}>
                              <TableCell><div className="font-medium">{item.product_name}</div><div className="text-sm text-muted-foreground">{item.product_sku}</div></TableCell>
                              <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                              <TableCell><Input type="text" value={item.quantity_received} onChange={e => updateItem(index, 'quantity_received', e.target.value)} className="w-28" min="0" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                {/* Form Header - Lokasi dipindahkan ke sini agar global */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Receive To Location</Label>
                        <Select value={formData.location} onValueChange={v => setFormData(p => ({...p, location: v}))}>
                            <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                            <SelectContent>
                            {locations.map((l) => (<SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>))}                            
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} />
                    </div>
                </div>
              </div>
            </Tabs>

            <DialogFooter className="p-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateReceipt} disabled={loading || !formData.location}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipt History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                {/* 1. Ubah nama kolom menjadi lebih generik */}
                <TableHead>Source Document</TableHead>
                <TableHead>Source/Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && goodsReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : goodsReceipts.length > 0 ? (
                goodsReceipts.map((receipt) => {
                  // --- 2. Tambahkan Logika untuk Menentukan Sumber ---
                  let sourceDoc = 'N/A';
                  let sourceName = 'Manual Input';

                  if (receipt.purchase_order_number) {
                    sourceDoc = receipt.purchase_order_number;
                    sourceName = receipt.supplier_name || 'N/A';
                  } else if (receipt.assembly_order_number) {
                    sourceDoc = receipt.assembly_order_number;
                    sourceName = 'Internal Production'; // Atau 'From Assembly'
                  } else if (receipt.supplier_name) {
                    // Ini untuk kasus manual receipt yang memiliki supplier
                    sourceName = receipt.supplier_name;
                    sourceDoc = 'Manual Input';
                  }
                  // ----------------------------------------------------

                  return (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">
                        {receipt.receipt_number || 'N/A'}
                      </TableCell>
                      
                      {/* --- 3. Render data yang sudah diproses --- */}
                      <TableCell>{sourceDoc}</TableCell>
                      <TableCell>{sourceName}</TableCell>
                      {/* ------------------------------------------- */}

                      <TableCell>
                        {new Date(receipt.receipt_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReceipt(receipt)}
                        >
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No goods receipts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col p-0">
          {selectedReceipt && (
            <>
              {/* --- 1. Tambahkan Logika untuk Menentukan Sumber di Sini --- */}
              {(() => {
                let sourceDocLabel = 'Source Document';
                let sourceDocValue = 'N/A';
                let sourceNameLabel = 'Source/Supplier';
                let sourceNameValue = 'Manual Input';

                if (selectedReceipt.purchase_order_number) {
                  sourceDocLabel = 'Purchase Order #';
                  sourceDocValue = selectedReceipt.purchase_order_number;
                  sourceNameLabel = 'Supplier';
                  sourceNameValue = selectedReceipt.supplier_name || 'N/A';
                } else if (selectedReceipt.assembly_order_number) {
                  sourceDocLabel = 'Assembly Order #';
                  sourceDocValue = selectedReceipt.assembly_order_number;
                  sourceNameLabel = 'Source';
                  sourceNameValue = 'Internal Production';
                } else if (selectedReceipt.supplier_name) {
                  sourceNameLabel = 'Supplier';
                  sourceNameValue = selectedReceipt.supplier_name;
                }

                // Kita akan mengembalikan JSX yang menggunakan variabel-variabel ini
                return (
                  <>
                    <DialogHeader className="p-6 pb-4 border-b">
                      <DialogTitle>
                        Details for Receipt: {selectedReceipt.receipt_number}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="flex-grow overflow-y-auto p-6 space-y-6">
                      {/* --- 2. Gunakan Variabel yang Sudah Diproses di Sini --- */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">{sourceNameLabel}</Label>
                          <p className="font-medium">{sourceNameValue}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">{sourceDocLabel}</Label>
                          <p className="font-medium">{sourceDocValue}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Status</Label>
                          <div>{getStatusBadge(selectedReceipt.status)}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Receive Date</Label>
                          <p className="font-medium">{new Date(selectedReceipt.receipt_date).toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Received By</Label>
                          <p className="font-medium">{selectedReceipt.received_by_name || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Received At</Label>
                          <p className="font-medium">{selectedReceipt.location_name || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Catatan/Notes */}
                      {selectedReceipt.notes && (
                          <div className="space-y-1">
                              <Label className="text-sm text-muted-foreground">Notes</Label>
                              <p className="p-3 bg-slate-50 rounded-md border text-sm">{selectedReceipt.notes}</p>
                          </div>
                      )}

                      {/* Tabel Item */}
                      <div>
                        <h3 className="font-semibold mb-2">Items Received</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty Ordered</TableHead>
                                <TableHead className="text-right">Qty Received</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedReceipt.items.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="font-medium">{item.product_name}</div>
                                    <div className="text-sm text-muted-foreground">{item.product_sku}</div>
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                                  <TableCell className="text-right font-semibold">{item.quantity_received}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.unit_price || 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                        <X className="mr-2 h-4 w-4" /> Close
                      </Button>
                      {selectedReceipt.status === 'DRAFT' && (
                        <Button 
                          onClick={handleConfirmReceipt} 
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Confirm Receipt & Update Stock
                        </Button>
                      )}
                    </DialogFooter>
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoodsReceiptManagement;
