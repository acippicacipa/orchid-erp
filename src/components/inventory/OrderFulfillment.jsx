import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Eye, Printer, PlayCircle, Loader2, Search, Truck, Package, ClipboardCheck } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper untuk format mata uang
const formatRupiah = (amount ) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Helper untuk format tanggal
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Komponen tersembunyi untuk dicetak
const PrintablePickingList = React.forwardRef(({ order }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-2">Picking List</h1>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 border-b border-black pb-4">
        <div>
          <p className="text-sm font-bold">Order Number:</p>
          <p className="text-lg">{order.order_number}</p>
        </div>
        <div>
          <p className="text-sm font-bold">Customer:</p>
          <p className="text-lg">{order.customer_name}</p>
        </div>
        <div>
          <p className="text-sm font-bold">Order Date:</p>
          <p>{formatDate(order.order_date)}</p>
        </div>
        <div>
          <p className="text-sm font-bold">Shipping Address:</p>
          <p>{order.shipping_address_line_1 || 'N/A'}</p>
          <p>{order.shipping_city || ''}, {order.shipping_state || ''} {order.shipping_postal_code || ''}</p>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-4">Items to Pick</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="p-2 w-1/4">SKU</th>
            <th className="p-2 w-1/2">Product Name</th>
            <th className="p-2 text-right">Quantity</th>
            <th className="p-2 w-1/4">Location / Notes</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map(item => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="p-2 align-top">{item.product_details?.sku || 'N/A'}</td>
              <td className="p-2 align-top">{item.product_details?.full_name || 'N/A'}</td>
              <td className="p-2 align-top text-right font-bold text-lg">{item.quantity}</td>
              <td className="p-2 align-top border-l border-gray-300"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
// Tambahkan displayName untuk debugging yang lebih baik
PrintablePickingList.displayName = 'PrintablePickingList';

const OrderFulfillment = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk dialog dan print
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const printComponentRef = useRef(null);
  const [isShortageDialogOpen, setIsShortageDialogOpen] = useState(false);
  const [shortageOrder, setShortageOrder] = useState(null);
  const [shortageItems, setShortageItems] = useState([]);

  const [isDoDialogOpen, setIsDoDialogOpen] = useState(false);
  const [orderForDO, setOrderForDO] = useState(null); // SO yang akan dibuatkan DO-nya
  const [doFormData, setDoFormData] = useState({
    carrier: '',
    tracking_number: '',
    notes: '',
  });

  const openCreateDoDialog = (order) => {
    setOrderForDO(order); // Simpan data order yang dipilih
    setDoFormData({ // Reset form DO
      carrier: '',
      tracking_number: '',
      notes: ``,
    });
    setIsDoDialogOpen(true); // Buka dialog
  };

  const handleCreateDO = async () => {
    // Validasi dasar
    if (!orderForDO) {
      toast({ title: "Error", description: "No order selected for delivery.", variant: "destructive" });
      return;
    }
    if (!doFormData.carrier) {
        toast({ title: "Validation Error", description: "Please specify a carrier.", variant: "destructive" });
        return;
    }

    setLoading(true); // Aktifkan loading state

    try {
      const token = localStorage.getItem('token');
      
      // Panggil endpoint yang sudah kita buat di backend
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${orderForDO.id}/create_delivery_order/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        // Kirim data dari form dialog sebagai body
        body: JSON.stringify(doFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Delivery Order.');
      }

      const createdDO = await response.json();

      toast({
        title: "Success",
        description: `Delivery Order #${createdDO.do_number} has been created and stock has been updated.`,
      });

      // Tutup dialog dan refresh daftar order
      setIsDoDialogOpen(false);
      fetchFulfillmentOrders();

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Matikan loading state
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: `PickingList-${selectedOrder?.order_number || ''}`,
    onBeforeGetContent: () => {
      return new Promise((resolve) => {
        // Beri waktu untuk React me-render ulang komponen dengan data baru
        setTimeout(() => {
          if (printComponentRef.current) {
            console.log("Content to print is ready:", printComponentRef.current);
          } else {
            console.error("Content to print is NULL!");
          }
          resolve();
        }, 200); // Sedikit delay
      });
    },
    onPrintError: (error) => console.error("Printing Error:", error),
  });

  const openReportShortageDialog = (order) => {
    setShortageOrder(order);
    // Inisialisasi state kekurangan dengan data dari order
    const initialShortage = order.items.map(item => ({
      ...item,
      actual_picked_quantity: item.quantity, // Asumsi awal bisa dipenuhi semua
      notes: ''
    }));
    setShortageItems(initialShortage);
    setIsShortageDialogOpen(true);
  };

  const handleShortageInputChange = (itemId, value) => {
    setShortageItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, actual_picked_quantity: value } : item
    ));
  };

  const submitPickingReport = async () => {
    if (!shortageOrder) return;
    
    // Konfirmasi tetap bisa digunakan
    if (!window.confirm('Are you sure you want to submit these picked quantities?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        items: shortageItems.map(item => ({
          id: item.id,
          actual_picked_quantity: item.actual_picked_quantity,
        })),
      };

      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${shortageOrder.id}/record_picking/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record picking.');
      }

      toast({ title: 'Success', description: 'Picked quantities have been recorded.' });
      setIsShortageDialogOpen(false);
      fetchFulfillmentOrders(); // Refresh data

    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFulfillmentOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // --- INI PERBAIKANNYA ---
      // Buat URL dengan dua parameter 'status'
      const url = `${API_BASE_URL}/sales/sales-orders/?status=CONFIRMED,PROCESSING`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch fulfillment orders.');
      const data = await response.json();
      
      // Urutkan data agar yang 'PROCESSING' muncul di atas
      const sortedData = (data.results || data).sort((a, b) => {
        if (a.status === 'PROCESSING' && b.status !== 'PROCESSING') return -1;
        if (a.status !== 'PROCESSING' && b.status === 'PROCESSING') return 1;
        return 0; // Jika status sama, pertahankan urutan asli
      });

      setConfirmedOrders(sortedData); // Ganti nama state jika perlu, atau tetap gunakan yang sama

    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConfirmedOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/?status=CONFIRMED`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch confirmed orders.');
      const data = await response.json();
      setConfirmedOrders(data.results || data);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillmentOrders();
  }, [token]);

  const handleStartProcessing = async (orderId) => {
    if (!window.confirm('Are you sure you want to start processing this order? This will allocate the stock.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${orderId}/start_processing/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start processing.');
      }
      toast({ title: 'Success', description: 'Order status updated to Processing and stock allocated.' });
      fetchConfirmedOrders(); // Refresh list
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openViewDialog = (order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const filteredOrders = confirmedOrders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
 
  const newTriggerPrint = (order) => {
    setSelectedOrder({ ...order, _shouldPrint: true });
  };

  useEffect(() => {
  if (selectedOrder && printComponentRef.current && selectedOrder._shouldPrint) {
    handlePrint();
    // remove flag after print
    setSelectedOrder(prev => ({ ...prev, _shouldPrint: false }));
  }
}, [selectedOrder]);

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Order Fulfillment</h1>
      <p className="text-muted-foreground mb-2">List of confirmed orders ready for picking and processing.</p>

      <Card>
        <CardHeader>
          <CardTitle>Picking List</CardTitle>
          <CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order # or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Item Count</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{formatDate(order.order_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.item_count} items</Badge>
                      </TableCell>
                      <TableCell>
                        {/* Tampilkan badge berdasarkan fulfillment_status */}
                        {order.fulfillment_status === 'UNFULFILLED' && <Badge variant="secondary">Unfulfilled</Badge>}
                        {order.fulfillment_status === 'PARTIALLY_FULFILLED' && <Badge variant="destructive">Partial</Badge>}
                        {order.fulfillment_status === 'FULLY_FULFILLED' && <Badge className="bg-green-600">Fulfilled</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.status === 'CONFIRMED' && (
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openViewDialog(order)}><Eye className="mr-2 h-4 w-4" />View</Button>
                            <Button variant="outline" size="sm" onClick={() => newTriggerPrint(order)}>
                              <Printer className="mr-2 h-4 w-4" />Print
                            </Button>
                            <Button size="sm" onClick={() => handleStartProcessing(order.id)}><PlayCircle className="mr-2 h-4 w-4" />Start Processing</Button>
                          </div>
                        )}
                        {order.status === 'PROCESSING' && (
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" onClick={() => openCreateDoDialog(order.id)}>
                              Create DO
                            </Button>
                            
                            <Button variant="outline" size="sm" onClick={() => openReportShortageDialog(order)}>
                              <ClipboardCheck className="mr-2 h-4 w-4" /> Record Picking
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground"><Package className="h-8 w-8" /><span>No confirmed orders to process.</span></div>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDoDialogOpen} onOpenChange={setIsDoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Delivery Order</DialogTitle>
            <DialogDescription>
              Enter shipping details for Sales Order: <strong>{orderForDO?.order_number}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier / Shipping Service *</Label>
              <Input
                id="carrier"
                placeholder="e.g., JNE, SiCepat, In-house Delivery"
                value={doFormData.carrier}
                onChange={(e) => setDoFormData(prev => ({ ...prev, carrier: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking_number">Tracking Number (Airway Bill)</Label>
              <Input
                id="tracking_number"
                placeholder="Optional tracking number"
                value={doFormData.tracking_number}
                onChange={(e) => setDoFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="do_notes">Notes</Label>
              <Textarea
                id="do_notes"
                placeholder="e.g., Fragile item, handle with care."
                value={doFormData.notes}
                onChange={(e) => setDoFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDO} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Create DO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk View Order Details */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details: {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>Customer: {selectedOrder?.customer_name}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedOrder?.items || []).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_details?.sku || 'N/A'}</TableCell>
                    <TableCell>{item.product_details?.full_name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShortageDialogOpen} onOpenChange={setIsShortageDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Report Stock Shortage for SO: {shortageOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Update the "Actual Picked" quantity for items that are short.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Actual Picked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortageItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_details?.full_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        max={item.quantity}
                        value={item.actual_picked_quantity}
                        onChange={(e) => handleShortageInputChange(item.id, e.target.value)}
                        className={parseFloat(item.actual_picked_quantity) < parseFloat(item.quantity) ? 'border-red-500' : ''}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShortageDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitPickingReport}>Submit Picked Quantities</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Komponen tersembunyi untuk keperluan print */}
      <div style={{ display: 'none' }}>
        <PrintablePickingList ref={printComponentRef} order={selectedOrder} />
      </div>
    </div>
  );
};

export default OrderFulfillment;
