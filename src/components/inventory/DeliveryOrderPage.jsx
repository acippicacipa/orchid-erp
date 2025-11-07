import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Truck, Loader2, Search, Info } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const formatDate = (dateString ) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DeliveryOrderPage = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [processingOrders, setProcessingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDoDialogOpen, setIsDoDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [doFormData, setDoFormData] = useState({
    carrier: '',
    tracking_number: '',
    notes: ''
  });

  const fetchProcessingOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/?status=PROCESSING`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch processing orders.');
      const data = await response.json();
      setProcessingOrders(data.results || data);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessingOrders();
  }, [token]);

  const openDoDialog = (order) => {
    setSelectedOrder(order);
    setDoFormData({ carrier: '', tracking_number: '', notes: '' });
    setIsDoDialogOpen(true);
  };

  const handleDoFormChange = (e) => {
    const { name, value } = e.target;
    setDoFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateDoSubmit = async () => {
    if (!selectedOrder) return;
    try {
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${selectedOrder.id}/create_delivery_order/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(doFormData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Delivery Order.');
      }
      toast({ title: 'Success', description: 'Delivery Order created and stock updated.' });
      setIsDoDialogOpen(false);
      fetchProcessingOrders(); // Refresh list
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredOrders = processingOrders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Create Delivery Order</h1>
      <p className="text-muted-foreground mb-2">List of orders ready to be shipped.</p>

      <Card>
        <CardHeader>
          <CardTitle>Ready to Ship</CardTitle>
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
                      <TableCell><Badge variant="outline">{order.item_count} items</Badge></TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" onClick={() => openDoDialog(order)}>
                          <Truck className="mr-2 h-4 w-4" />Create DO
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground"><Info className="h-8 w-8" /><span>No orders are currently being processed.</span></div>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog untuk Membuat Delivery Order */}
      <Dialog open={isDoDialogOpen} onOpenChange={setIsDoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Delivery Order for SO: {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier / Courier</Label>
              <Input id="carrier" name="carrier" value={doFormData.carrier} onChange={handleDoFormChange} placeholder="e.g., JNE, In-house, etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking_number">Tracking Number / Resi</Label>
              <Input id="tracking_number" name="tracking_number" value={doFormData.tracking_number} onChange={handleDoFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Shipping Notes</Label>
              <Textarea id="notes" name="notes" value={doFormData.notes} onChange={handleDoFormChange} placeholder="e.g., Fragile item, handle with care." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDoSubmit}>Confirm & Ship</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryOrderPage;
