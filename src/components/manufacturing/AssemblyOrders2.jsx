import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Play, CheckCircle, XCircle, PauseCircle, Clock, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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
const ProductSearchDropdown = ({ products, value, onSelect, placeholder = "Search products..." }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const selectedProduct = products.find(p => p.id.toString() === value);
  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchValue.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchValue.toLowerCase()))
  ).filter(p => p.is_manufactured).slice(0, 50); // Only show manufactured products

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span className="truncate">
              {selectedProduct.sku} - {selectedProduct.name}
            </span>
          ) : (
            placeholder
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Type to search products..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No manufactured products found.</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id.toString()}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                    setSearchValue('');
                  }}
                >
                  <div className="flex flex-col w-full">
                    <div className="font-medium">
                      {product.sku} - {product.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {product.brand && `Brand: ${product.brand} | `}
                      Stock: {product.current_stock || 0} | 
                      Cost: {formatRupiah(product.cost_price || product.selling_price)}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
    quantity_to_produce: '1',
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
        ...newOrder,
        product: newOrder.product === 'null' ? null : newOrder.product,
        bom: newOrder.bom === 'null' ? null : newOrder.bom,
        production_location: newOrder.production_location === 'null' ? null : newOrder.production_location,
        quantity_to_produce: parseFloat(newOrder.quantity_to_produce),
      };

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
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save assembly order');
      }

      toast({
        title: "Success",
        description: `Assembly Order ${editingOrder ? 'updated' : 'created'} successfully.`, 
      });
      setIsModalOpen(false);
      setNewOrder({
        product: '', bom: '', quantity_to_produce: '1', production_location: '',
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
      product: order.product.id.toString(),
      bom: order.bom.id.toString(),
      quantity_to_produce: order.quantity_to_produce,
      production_location: order.production_location ? order.production_location.id.toString() : 'null',
      planned_start_date: order.planned_start_date.split('T')[0],
      planned_completion_date: order.planned_completion_date.split('T')[0],
      priority: order.priority,
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

  const getProductFullName = (product) => {
    if (!product) return 'N/A';
    const parts = [product.name];
    if (product.brand) parts.push(`Brand: ${product.brand}`);
    if (product.color) parts.push(`Color: ${product.color}`);
    if (product.size) parts.push(`Size: ${product.size}`);
    return parts.join(' | ');
  };

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-3xl font-bold tracking-tight mb-8">Assembly Order Management</h2>

      <div className="flex justify-end mb-4">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingOrder(null);
              setNewOrder({
                product: '', bom: '', quantity_to_produce: '1', production_location: '',
                planned_start_date: new Date().toISOString().split('T')[0],
                planned_completion_date: new Date().toISOString().split('T')[0],
                priority: 'NORMAL', description: '', notes: '', special_instructions: '',
              });
              setProductSearchTerm('');
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
                    products={products}
                    value={newOrder.product}
                    onSelect={(product) => {
                      setNewOrder(prev => ({ ...prev, product: product.id.toString() }));
                    }}
                    placeholder="Search manufactured products..."
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
                        <SelectItem key={b.id} value={b.id.toString()}>{b.bom_number} - {getProductFullName(b.product)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity_to_produce">Quantity to Produce</Label>
                  <Input id="quantity_to_produce" name="quantity_to_produce" type="number" step="1" value={newOrder.quantity_to_produce} onChange={handleInputChange} required />
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
                  <TableCell>{getProductFullName(order.product)}</TableCell>
                  <TableCell>{order.bom.bom_number}</TableCell>
                  <TableCell>{parseFloat(order.quantity_to_produce).toFixed(3)}</TableCell>
                  <TableCell>{parseFloat(order.quantity_produced).toFixed(3)}</TableCell>
                  <TableCell>{order.production_location ? order.production_location.name : 'N/A'}</TableCell>
                  <TableCell>{STATUS_CHOICES.find(s => s.value === order.status)?.label || order.status}</TableCell>
                  <TableCell>{PRIORITY_CHOICES.find(p => p.value === order.priority)?.label || order.priority}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(order)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {order.status === 'DRAFT' && (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(order, 'release')} title="Release Order">
                        <Play className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {order.status === 'RELEASED' && (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(order, 'start-production')} title="Start Production">
                        <Play className="h-4 w-4 text-blue-600" />
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
