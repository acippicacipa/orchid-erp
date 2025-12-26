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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Send, Trash2 } from 'lucide-react';
import ProductSearchDropdown from '@/components/sales/ProductSearchDropdown'; // Asumsi Anda punya komponen ini

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const ConsignmentShipment = ( ) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Data pendukung
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);

  const { token } = useAuth();
  const { toast } = useToast();

  const initialFormState = {
    customer: '',
    from_location: '',
    to_consignment_location: '',
    notes: '',
    items: [],
  };
  const [formData, setFormData] = useState(initialFormState);
  const [newItem, setNewItem] = useState({ product: null, quantity: 1 });

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/consignment-shipments/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch shipments');
      const data = await response.json();
      setShipments(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [customersRes, locationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sales/customers/`, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(`${API_BASE_URL}/inventory/locations/`, { headers: { 'Authorization': `Token ${token}` } }),
      ]);
      if (customersRes.ok) setCustomers((await customersRes.json()).results || []);
      if (locationsRes.ok) setLocations((await locationsRes.json()).results || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch supporting data.", variant: "destructive" });
    }
  }, [token, toast]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchSupportingData();
    }
  }, [isDialogOpen, fetchSupportingData]);

  const handleAddItem = () => {
    if (!newItem.product || newItem.quantity <= 0) {
      toast({ title: "Warning", description: "Please select a product and enter a valid quantity.", variant: "default" });
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product: newItem.product.id,
        product_name: newItem.product.name,
        product_sku: newItem.product.sku,
        quantity: newItem.quantity,
      }]
    }));
    setNewItem({ product: null, quantity: 1 }); // Reset
  };

  const handleRemoveItem = (productId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product !== productId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item to the shipment.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/consignment-shipments/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create shipment.');
      toast({ title: "Success", description: "Consignment shipment created successfully." });
      setIsDialogOpen(false);
      fetchShipments();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleShipAction = async (shipmentId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/consignment-shipments/${shipmentId}/ship/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to ship items.');
      toast({ title: "Success", description: "Shipment has been processed and stock moved." });
      fetchShipments();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SHIPPED': 'bg-blue-100 text-blue-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100';
    return <Badge className={config}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consignment Shipments</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormState)}><Plus className="mr-2 h-4 w-4" /> New Shipment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Create Consignment Shipment</DialogTitle></DialogHeader>
            <form id="shipment-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Customer (Consignee)</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, customer: v}))} required>
                    <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>From Location</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, from_location: v}))} required>
                    <SelectTrigger><SelectValue placeholder="Select source..." /></SelectTrigger>
                    <SelectContent>{locations.filter(l => l.location_type !== 'CONSIGNMENT').map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Consignment Location</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, to_consignment_location: v}))} required>
                    <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
                    <SelectContent>{locations.filter(l => l.location_type === 'CONSIGNMENT').map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Add Items</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-grow space-y-1">
                    <Label>Product</Label>
                    <ProductSearchDropdown onSelect={(p) => setNewItem(prev => ({...prev, product: p}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({...prev, quantity: Number(e.target.value)}))} className="w-24" />
                  </div>
                  <Button type="button" onClick={handleAddItem}>Add</Button>
                </div>
              </div>
              {formData.items.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {formData.items.map(item => (
                        <TableRow key={item.product}>
                          <TableCell>{item.product_name} ({item.product_sku})</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell><Button variant="destructive" size="icon" onClick={() => handleRemoveItem(item.product)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="shipment-form" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Create Shipment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Shipment History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Shipment #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow> :
               shipments.map(ship => (
                <TableRow key={ship.id}>
                  <TableCell className="font-medium">{ship.shipment_number}</TableCell>
                  <TableCell>{ship.customer_name}</TableCell>
                  <TableCell>{new Date(ship.shipment_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(ship.status)}</TableCell>
                  <TableCell>
                    {ship.status === 'DRAFT' && <Button size="sm" onClick={() => handleShipAction(ship.id)}><Send className="h-4 w-4 mr-1" />Ship Items</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsignmentShipment;
