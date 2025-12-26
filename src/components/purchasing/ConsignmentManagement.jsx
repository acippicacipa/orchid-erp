import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Check, Trash2, PackagePlus, PackageCheck } from 'lucide-react';
import ProductSearchDropdown from '@/components/purchasing/ProductSearchDropdown';
import SupplierSearchDropdown from '@/components/SupplierSearchDropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const ConsignmentManagement = ( ) => {
  // State utama
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isConsumeDialogOpen, setIsConsumeDialogOpen] = useState(false);
  
  // Data pendukung
  const [locations, setLocations] = useState([]);

  const { token } = useAuth();
  const { toast } = useToast();

  // State untuk form
  const initialReceiptState = { supplier: '', supplier_name: '', location: '', notes: '', items: [] };
  const [receiptForm, setReceiptForm] = useState(initialReceiptState);
  
  const initialConsumeState = { product_id: '', location_id: '', supplier_id: '', quantity: 1 };
  const [consumeForm, setConsumeForm] = useState(initialConsumeState);
  
  const [newItem, setNewItem] = useState({ product: null, quantity: 1, unit_price: 0 });

  // +++ TAMBAHKAN STATE UNTUK MENGONTROL INPUT PENCARIAN +++
  const [receiptProductSearch, setReceiptProductSearch] = useState('');
  const [consumeProductSearch, setConsumeProductSearch] = useState('');
  // +++ AKHIR TAMBAHAN +++

  // --- Fetch Data ---
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/purchasing/consignment-receipts/`, { headers: { 'Authorization': `Token ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch consignment receipts');
      const data = await response.json();
      setReceipts(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const locationsRes = await fetch(`${API_BASE_URL}/inventory/locations/`, { headers: { 'Authorization': `Token ${token}` } });
      if (locationsRes.ok) setLocations((await locationsRes.json()).results || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch locations.", variant: "destructive" });
    }
  }, [token, toast]);

  useEffect(() => {
    fetchReceipts();
    fetchSupportingData();
  }, [fetchReceipts, fetchSupportingData]);

  // --- Handler untuk Form Receipt ---
  const handleAddReceiptItem = () => {
    if (!newItem.product || newItem.quantity <= 0) {
      toast({ title: "Warning", description: "Select a product and enter a valid quantity.", variant: "default" });
      return;
    }
    setReceiptForm(prev => ({
      ...prev,
      items: [...prev.items, {
        product: newItem.product.id,
        product_name: newItem.product.name,
        product_sku: newItem.product.sku,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
      }]
    }));
    setNewItem({ product: null, quantity: 1, unit_price: 0 });
    setReceiptProductSearch(''); // +++ Reset input setelah item ditambahkan
  };

  const handleRemoveReceiptItem = (productId) => {
    setReceiptForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product !== productId),
    }));
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (receiptForm.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/purchasing/consignment-receipts/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptForm),
      });
      if (!response.ok) throw new Error('Failed to create receipt.');
      toast({ title: "Success", description: "Consignment receipt created as DRAFT." });
      setIsReceiptDialogOpen(false);
      fetchReceipts();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveAction = async (receiptId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/purchasing/consignment-receipts/${receiptId}/receive/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to process receipt.');
      toast({ title: "Success", description: "Receipt confirmed. Consigned stock has been updated." });
      fetchReceipts();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Handler untuk Form Consumption ---
  const handleConsumeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stock-movements/consume-consignment/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(consumeForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to consume stock.');
      toast({ title: "Success", description: data.message });
      setIsConsumeDialogOpen(false);
      setConsumeProductSearch(''); // +++ Reset input setelah berhasil
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'RECEIVED': 'bg-blue-100 text-blue-800',
    }[status] || 'bg-gray-100';
    return <Badge className={config}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consignment (Purchasing)</h1>
        <div className="flex gap-2">
          {/* Tombol untuk membuka dialog Consume */}
          <Dialog open={isConsumeDialogOpen} onOpenChange={setIsConsumeDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setConsumeForm(initialConsumeState);
                setConsumeProductSearch(''); // +++ Reset input saat dialog dibuka
              }}>
                <PackageCheck className="mr-2 h-4 w-4" /> Consume Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Consume Consigned Stock</DialogTitle></DialogHeader>
              <form id="consume-form" onSubmit={handleConsumeSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Product to Consume</Label>
                    {/* +++ PERBAIKI PEMANGGILAN PRODUCTSEARCHDROPDOWN DI SINI +++ */}
                    <ProductSearchDropdown
                      value={consumeProductSearch}
                      onValueChange={setConsumeProductSearch}
                      onSelect={(p) => {
                        setConsumeForm(f => ({...f, product_id: p.id}));
                        setConsumeProductSearch(p.name); // Tampilkan nama produk di input
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier (Owner of Goods)</Label>
                    <SupplierSearchDropdown
                      value={consumeForm.supplier_name}
                      onValueChange={(name) => setConsumeForm(f => ({ ...f, supplier_name: name, supplier_id: '' }))}
                      onSelect={(supplier) => {
                        setConsumeForm(f => ({ ...f, supplier_id: supplier.id, supplier_name: supplier.name }));
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location of Consumption</Label>
                    <Select onValueChange={(v) => setConsumeForm(f => ({...f, location_id: v}))} required>
                      <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Consumed</Label>
                    <Input type="number" value={consumeForm.quantity} onChange={(e) => setConsumeForm(f => ({...f, quantity: e.target.value}))} min="1" required />
                  </div>
                </div>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConsumeDialogOpen(false)}>Cancel</Button>
                <Button type="submit" form="consume-form" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Confirm Consumption'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Tombol untuk membuka dialog Create Receipt */}
          <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setReceiptForm(initialReceiptState);
                setReceiptProductSearch(''); // +++ Reset input saat dialog dibuka
              }}>
                <PackagePlus className="mr-2 h-4 w-4" /> New Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader><DialogTitle>Create Consignment Receipt</DialogTitle></DialogHeader>
              <form id="receipt-form" onSubmit={handleCreateReceipt} className="flex-grow overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <SupplierSearchDropdown
                      value={receiptForm.supplier_name}
                      onValueChange={(name) => setReceiptForm(p => ({ ...p, supplier_name: name, supplier: '' }))}
                      onSelect={(supplier) => {
                        setReceiptForm(p => ({ ...p, supplier: supplier.id, supplier_name: supplier.name }));
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Receive at Location</Label>
                    <Select onValueChange={(v) => setReceiptForm(p => ({...p, location: v}))} required>
                      <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">Add Items</h3>
                  <div className="flex gap-4 items-end">
                    <div className="flex-grow space-y-1">
                      <Label>Product</Label>
                      {/* +++ PERBAIKI PEMANGGILAN PRODUCTSEARCHDROPDOWN DI SINI +++ */}
                      <ProductSearchDropdown
                        value={receiptProductSearch}
                        onValueChange={setReceiptProductSearch}
                        onSelect={(p) => {
                          setNewItem(prev => ({...prev, product: p, unit_price: p.cost_price || 0}));
                          setReceiptProductSearch(p.name); // Tampilkan nama produk di input
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Quantity</Label>
                      <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({...prev, quantity: Number(e.target.value)}))} className="w-24" min="1" />
                    </div>
                    <div className="space-y-1">
                      <Label>Est. Unit Price</Label>
                      <Input type="number" value={newItem.unit_price} onChange={(e) => setNewItem(prev => ({...prev, unit_price: Number(e.target.value)}))} className="w-32" />
                    </div>
                    <Button type="button" onClick={handleAddReceiptItem}>Add</Button>
                  </div>
                </div>
                {receiptForm.items.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Est. Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {receiptForm.items.map(item => (
                          <TableRow key={item.product}>
                            <TableCell>{item.product_name} ({item.product_sku})</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit_price}</TableCell>
                            <TableCell><Button variant="destructive" size="icon" onClick={() => handleRemoveReceiptItem(item.product)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Cancel</Button>
                <Button type="submit" form="receipt-form" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Create Receipt'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="receipts" className="w-full">
        <TabsList>
          <TabsTrigger value="receipts">Consignment Receipts</TabsTrigger>
          <TabsTrigger value="consumption">Consumption History (TBD)</TabsTrigger>
        </TabsList>
        <TabsContent value="receipts">
          <Card>
            <CardHeader><CardTitle>Receipt History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Receipt #</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow> :
                   receipts.map(rec => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.receipt_number}</TableCell>
                      <TableCell>{rec.supplier_name}</TableCell>
                      <TableCell>{new Date(rec.receipt_date).toLocaleDateString()}</TableCell>
                      <TableCell>{rec.location_name}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell>
                        {rec.status === 'DRAFT' && <Button size="sm" onClick={() => handleReceiveAction(rec.id)}><Check className="h-4 w-4 mr-1" />Receive</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consumption">
          <Card>
            <CardHeader><CardTitle>Consumption History</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This section will show a log of all consumed consignment stock. (To be implemented)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsignmentManagement;
