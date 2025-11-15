import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";
import { ArrowRightLeft, PlusCircle, Search, Trash2, Loader2, Eye, Send, CheckCircle } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ProductSearchDropdown from './ProductSearchDropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const formatDate = (dateString ) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const StockTransfer = () => {
  // --- UBAH --- Ganti nama state agar lebih jelas
  const [transfers, setTransfers] = useState([]); // Menggantikan transferHistory
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true); // Kita tetap gunakan ini untuk loading tabel
  const { toast } = useToast();
  const { token } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Ini bisa dihapus jika tidak ada search global

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const [productSearchTerm, setProductSearchTerm] = useState('');

  // --- UBAH --- State form tidak perlu reference_number lagi
  const initialTransferState = {
    from_location: '',
    to_location: '',
    notes: '',
    items: []
  };
  const [newTransfer, setNewTransfer] = useState(initialTransferState);

  const initialItemState = { product: '', product_name: '', product_sku: '', quantity: '1' };
  const [newItem, setNewItem] = useState(initialItemState);

  // --- UBAH --- Fungsi fetch sekarang mengambil dari endpoint 'stock-transfers'
  const fetchTransfers = useCallback(async () => { // Ganti nama dari fetchTransferHistory
    setLoadingHistory(true);
    try {
      // Ganti URL endpoint
      const url = new URL(`${API_BASE_URL}/inventory/stock-transfers/`);
      // Hapus logika search, bisa ditambahkan lagi nanti jika perlu
      
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch transfers');
      const data = await response.json();
      
      // Set state dengan data baru
      setTransfers(data.results || data);

    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingHistory(false);
    }
  }, [token, toast]);

  // --- UBAH --- handleViewDetails tidak perlu diubah, tapi pastikan data yang diterima sesuai
  const handleViewDetails = (transfer) => {
    setSelectedTransfer(transfer);
    setIsViewDialogOpen(true);
  };

  const fetchLocations = useCallback(async () => { // Bungkus dengan useCallback
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/locations/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  }, [token]); // Tambahkan dependensi

  // --- UBAH --- useEffect sekarang memanggil fetchTransfers
  useEffect(() => {
    fetchLocations();
    fetchTransfers();
  }, [fetchLocations, fetchTransfers]);

  const handleDispatch = async (transferId) => {
    if (!window.confirm("Are you sure you want to dispatch this transfer? This will reduce stock from the source location.")) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stock-transfers/${transferId}/send/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to dispatch transfer');
      }
      toast({ title: "Success", description: "Transfer dispatched successfully." });
      fetchTransfers(); // Refresh daftar
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (transferId) => {
    if (!window.confirm("Confirm receipt of all items in this transfer? This will add stock to your location.")) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stock-transfers/${transferId}/receive/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to receive transfer');
      toast({ title: "Success", description: "Transfer received and stock updated." });
      fetchTransfers(); // Refresh daftar
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Fungsi-fungsi untuk Form ---
  const handleHeaderChange = (field, value) => {
    setNewTransfer(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    if (!newItem.product || !newItem.quantity || parseFloat(newItem.quantity) <= 0) {
      toast({ title: "Invalid Input", description: "Please select a product and enter a valid quantity.", variant: "destructive" });
      return;
    }
    const itemToAdd = {
      id: Date.now(),
      product: parseInt(newItem.product),
      product_name: newItem.product_name,
      product_sku: newItem.product_sku,
      quantity: parseFloat(newItem.quantity),
    };
    setNewTransfer(prev => ({ ...prev, items: [...prev.items, itemToAdd] }));
    setNewItem(initialItemState);
    setProductSearchTerm('');
  };

  const removeItem = (id) => {
    setNewTransfer(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const handleLocationChange = (locationId) => {
    // Jika sudah ada item di daftar transfer DAN lokasi yang dipilih berbeda
    if (newTransfer.items.length > 0 && locationId !== newTransfer.from_location) {
      // Tampilkan dialog konfirmasi bawaan browser
      const userConfirmed = window.confirm(
        "Mengubah lokasi akan menghapus semua item yang sudah ditambahkan.\nApakah Anda yakin ingin melanjutkan?"
      );

      // Jika pengguna mengklik "OK", maka userConfirmed akan true
      if (userConfirmed) {
        setNewTransfer(prev => ({
          ...prev,
          from_location: locationId,
          items: [] // Kosongkan array 'items' di dalam state 'newTransfer'
        }));
        
        setProductSearchTerm('');
      }
      // Jika pengguna mengklik "Cancel", tidak ada yang terjadi.
      // State tidak berubah, sehingga Select akan tetap menampilkan nilai lama.

    } else {
      // Jika tidak ada item, atau jika lokasi yang dipilih sama,
      // langsung ubah lokasi seperti biasa.
      setNewTransfer(prev => ({ ...prev, from_location: locationId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newTransfer.items.length === 0 || !newTransfer.from_location || !newTransfer.to_location) {
      toast({ title: "Error", description: "Please fill all required fields and add at least one item.", variant: "destructive" });
      return;
    }
    // Hapus validasi from_location === to_location karena sudah ada di backend
    
    setLoading(true);
    try {
      // Payload lebih sederhana
      const payload = {
        from_location: newTransfer.from_location,
        to_location: newTransfer.to_location,
        notes: newTransfer.notes,
        items: newTransfer.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
        }))
      };

      // URL endpoint baru
      const response = await fetch(`${API_BASE_URL}/inventory/stock-transfers/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create stock transfer');
      }

      toast({ title: "Success", description: "Stock transfer created with PENDING status." });
      setIsDialogOpen(false);
      setNewTransfer(initialTransferState);
      fetchTransfers(); // Ganti dari fetchTransferHistory
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // +++ TAMBAH +++ Helper untuk badge status
  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { variant: "secondary", text: "Pending" },
      IN_TRANSIT: { variant: "default", text: "In Transit" },
      COMPLETED: { variant: "outline", text: "Completed" },
      CANCELLED: { variant: "destructive", text: "Cancelled" },
    };
    const config = statusConfig[status] || { variant: "secondary", text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  // +++ TAMBAH +++ Fungsi render tabel yang bisa digunakan kembali
  const renderTransferTable = (data, actions) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transfer #</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingHistory ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : data.length > 0 ? (
              data.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{formatDate(transfer.created_at)}</TableCell>
                  <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                  <TableCell>{transfer.from_location_name}</TableCell>
                  <TableCell>{transfer.to_location_name}</TableCell>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell>{transfer.created_by_name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(transfer)}><Eye className="h-4 w-4" /></Button>
                      {actions && actions(transfer)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">No transfers found in this category.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfer</h1>
          <p className="text-muted-foreground">Move products between inventory locations.</p>
        </div>
        <Button onClick={() => { setNewTransfer(initialTransferState); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Transfer
        </Button>
      </div>
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Dispatch</TabsTrigger>
          <TabsTrigger value="in_transit">In Transit</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {renderTransferTable(
            transfers.filter(t => t.status === 'PENDING'),
            (transfer) => <Button size="sm" onClick={() => handleDispatch(transfer.id)} disabled={loading}><Send className="mr-2 h-4 w-4" />Dispatch</Button>
          )}
        </TabsContent>
        <TabsContent value="in_transit">
          {renderTransferTable(
            transfers.filter(t => t.status === 'IN_TRANSIT'),
            (transfer) => <Button size="sm" variant="outline" onClick={() => handleReceive(transfer.id)} disabled={loading}><CheckCircle className="mr-2 h-4 w-4" />Receive</Button>
          )}
        </TabsContent>
        <TabsContent value="completed">
          {renderTransferTable(transfers.filter(t => t.status === 'COMPLETED'))}
        </TabsContent>
      </Tabs>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setNewTransfer(initialTransferState)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Transfer
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Create New Stock Transfer</DialogTitle>
            <DialogDescription>Fill out the form to move products between locations.</DialogDescription>
          </DialogHeader>
          
          {/* --- PINDAHKAN FORM KE SINI --- */}
          <form id="transfer-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
            {/* Header Transfer */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_location">From Location *</Label>
                <Select
                  value={newTransfer.from_location || ''}
                  onValueChange={handleLocationChange} // Panggil fungsi yang sudah dimodifikasi
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to_location">To Location *</Label>
                <Select value={newTransfer.to_location} onValueChange={(v) => handleHeaderChange('to_location', v)} required>
                  <SelectTrigger id="to_location"><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id.toString() !== newTransfer.from_location).map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference #</Label>
                <Input id="reference_number" value={newTransfer.reference_number} onChange={(e) => handleHeaderChange('reference_number', e.target.value)} placeholder="Auto Generated..  " disabled/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={newTransfer.notes} onChange={(e) => handleHeaderChange('notes', e.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            {/* Add Items */}
            <div className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold">Products to Transfer</h3>
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-12 md:col-span-8 space-y-2">
                  <Label>Product</Label>
                  <ProductSearchDropdown
                    value={productSearchTerm}
                    onValueChange={setProductSearchTerm}
                    onSelect={(product) => {
                      setNewItem(prev => ({
                        ...prev,
                        product: product.id.toString(),
                        product_name: product.name,
                        product_sku: product.sku,
                      }));
                      // Set input search dengan nama produk yang dipilih
                      setProductSearchTerm(product.name);
                    }}
                    placeholder="Search and select product..."
                    locationId={newTransfer.from_location}
                    disabled={!newTransfer.from_location} 
                  />
                </div>
                <div className="col-span-6 md:col-span-2 space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))} min="1" />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Button type="button" onClick={addItem} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {newTransfer.items.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newTransfer.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">{item.product_sku}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </form>
          
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="transfer-form" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              Reference: <strong>{selectedTransfer?.transfer_number}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><Label>Date:</Label><p>{formatDate(selectedTransfer?.created_at)}</p></div>
              <div><Label>Status:</Label><p>{getStatusBadge(selectedTransfer?.status)}</p></div>
              <div><Label>From:</Label><p className="font-semibold">{selectedTransfer?.from_location_name}</p></div>
              <div><Label>To:</Label><p className="font-semibold">{selectedTransfer?.to_location_name}</p></div>
            </div>
            <h3 className="font-semibold">Items Transferred</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(selectedTransfer?.items || []).map(item => (
                    <TableRow key={item.id}><TableCell>{item.product_name}<div className="text-xs text-muted-foreground">{item.product_sku}</div></TableCell><TableCell className="text-right font-bold">{item.quantity}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTransfer;
