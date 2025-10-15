import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";
import { 
    AlertTriangle,
    ArrowRightLeft, // <-- Ikon yang ditambahkan
    Edit,
    Filter,
    Package,
    PlusCircle,
    Search,
    Trash2,
    TrendingDown,
    TrendingUp,
    X
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'; // Import Card

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

// Parse input Rupiah ke number
const parseRupiah = (rupiahString) => {
  if (!rupiahString) return 0;
  return parseInt(rupiahString.replace(/[^0-9]/g, '')) || 0;
};

const MOVEMENT_TYPES = [
  { value: 'TRANSFER', label: 'Transfer', icon: ArrowRightLeft, color: 'bg-purple-500' },
  { value: 'RECEIPT', label: 'Receipt', icon: TrendingUp, color: 'bg-green-500' },
  { value: 'ADJUSTMENT', label: 'Adjustment', icon: Package, color: 'bg-orange-500' },
  { value: 'DAMAGE', label: 'Damage/Loss', icon: AlertTriangle, color: 'bg-red-600' },
];

const STATUS_CHOICES = [
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

// Product Search Component
const ProductSearchDropdown = ({ onSelect, initialValue = '', filter = () => true, placeholder = "Search products..." }) => {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

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
        const products = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setResults(products.filter(filter));
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
    setSearchTerm(product.name);
    onSelect(product);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
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
                onMouseDown={() => handleSelect(product)}
              >
                <div className="font-medium">{product.sku} - {product.name}</div>
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

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const [filters, setFilters] = useState({
    search: '',
    location: '',
    start_date: '',
    end_date: '',
  });
  const [activeFilters, setActiveFilters] = useState({});

  const initialMovementState = {
    movement_type: 'TRANSFER',
    location: '',
    to_location: '', // Untuk transfer
    reason: '', // Untuk adjustment
    notes: '',
    reference_number: '',
    items: [] // Array untuk menampung banyak produk
  };

  const [newMovement, setNewMovement] = useState(initialMovementState);

  const initialItemState = {
    product: '',
    product_name: '',
    product_sku: '',
    quantity: '1',
    unit_cost: '0',
  };

  const [newItem, setNewItem] = useState(initialItemState);

  useEffect(() => {
    fetchMovements();
    fetchLocations();
  }, []);

  const fetchMovements = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      // Membuat URL query string dari objek filter
      const params = new URLSearchParams(currentFilters).toString();
      const response = await fetch(`${API_BASE_URL}/inventory/stock-movements/?${params}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch stock movements');
      
      const data = await response.json();
      setMovements(data.results || data);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    // Debouncing untuk mengurangi jumlah request saat pengguna mengetik
    const handler = setTimeout(() => {
      fetchMovements(activeFilters);
    }, 500);

    return () => clearTimeout(handler);
  }, [activeFilters, fetchMovements]);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/locations/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    // Hanya terapkan filter yang memiliki nilai
    const newActiveFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    setActiveFilters(newActiveFilters);
  };

  const clearFilters = () => {
    setFilters({ search: '', location: '', start_date: '', end_date: '' });
    setActiveFilters({});
  };

  const handleHeaderChange = (field, value) => {
    setNewMovement(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    if (!newItem.product || !newItem.quantity) {
      toast({ title: "Error", description: "Please select a product and enter quantity.", variant: "destructive" });
      return;
    }

    const itemToAdd = {
      id: Date.now(), // ID sementara untuk key
      product: parseInt(newItem.product),
      product_name: newItem.product_name,
      product_sku: newItem.product_sku,
      quantity: parseFloat(newItem.quantity),
      unit_cost: parseRupiah(newItem.unit_cost),
    };

    setNewMovement(prev => ({
      ...prev,
      items: [...prev.items, itemToAdd]
    }));

    setNewItem(initialItemState); // Reset form item
  
  };

  const removeItem = (index) => {
    setNewMovement(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newMovement.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one product to the movement.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        movement_type: newMovement.movement_type,
        location: parseInt(newMovement.location),
        to_location: newMovement.to_location ? parseInt(newMovement.to_location) : null,
        reason: newMovement.reason,
        notes: newMovement.notes,
        reference_number: newMovement.reference_number,
        items: newMovement.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        }))
      };

      const response = await fetch(`${API_BASE_URL}/inventory/stock-movements/bulk_create/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create stock movement');
      }

      toast({ title: "Success", description: "Stock movement created successfully." });
      
      setIsModalOpen(false);
      setNewMovement(initialMovementState);
      fetchMovements();
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

  const handleFocus = (event) => {
    // event.target merujuk ke elemen <input> itu sendiri
    event.target.select();
    // Kita juga tetap ingin menampilkan dropdown saat fokus
    setShowDropdown(true);
  };

  const getMovementTypeInfo = (type) => {
    return MOVEMENT_TYPES.find(mt => mt.value === type) || MOVEMENT_TYPES[0];
  };

  const getStatusInfo = (status) => {
    return STATUS_CHOICES.find(sc => sc.value === status) || STATUS_CHOICES[0];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Stock Movements</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setNewMovement(initialMovementState)}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Movement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Create Stock Movement</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="movement-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
    
                  {/* Kolom 1: Movement Type */}
                  <div className="space-y-2">
                    <Label>Movement Type</Label>
                    <Select value={newMovement.movement_type} onValueChange={(value) => handleHeaderChange('movement_type', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOVEMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center"><type.icon className="mr-2 h-4 w-4" />{type.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Kolom 2: From Location */}
                  <div className="space-y-2">
                    <Label>{newMovement.movement_type === 'TRANSFER' ? 'From Location' : 'Location'}</Label>
                    <Select value={newMovement.location} onValueChange={(value) => handleHeaderChange('location', value)} required>
                      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (<SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Kolom 3: To Location (hanya muncul jika tipe adalah TRANSFER) */}
                  {newMovement.movement_type === 'TRANSFER' && (
                    <div className="space-y-2">
                      <Label>To Location</Label>
                      <Select value={newMovement.to_location} onValueChange={(value) => handleHeaderChange('to_location', value)} required>
                        <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                        <SelectContent>
                          {locations.filter(l => l.id.toString() !== newMovement.location).map((loc) => (<SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Add Items Section */}
                <div className="border rounded-lg p-2 space-y-2">
                  <h3 className="text-lg font-semibold">Add Products</h3>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-6 space-y-2">
                      <Label>Product</Label>
                      <ProductSearchDropdown
                        onSelect={(product) => {
                          setNewItem(prev => ({
                            ...prev,
                            product: product.id.toString(),
                            product_name: product.name,
                            product_sku: product.sku,
                            unit_cost: product.cost_price || '0'
                          }));
                        }}
                        onFocus={handleFocus}
                        placeholder="Search and select product..."
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))} />
                    </div>
                    <div className="col-span-3">
                      <Label>&nbsp;</Label>
                      <Button type="button" onClick={addItem} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add to List
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {newMovement.items.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newMovement.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-sm text-gray-500">{item.product_sku}</div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>X</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reference Number</Label>
                    <Input value={newMovement.reference_number} onChange={(e) => handleHeaderChange('reference_number', e.target.value)} placeholder="Optional reference" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input value={newMovement.notes} onChange={(e) => handleHeaderChange('notes', e.target.value)} placeholder="Optional notes" />
                  </div>
                </div>  
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" form="movement-form" disabled={loading}>
                {loading ? 'Processing...' : 'Create Movement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filter Movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filter Keyword */}
            <div className="space-y-2">
              <Label htmlFor="search">Product Name/SKU</Label>
              <Input
                id="search"
                placeholder="Search product..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            {/* Filter Lokasi */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
                <SelectTrigger id="location"><SelectValue placeholder="All Locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {locations.map((loc) => (<SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {/* Filter Tanggal Mulai */}
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>
            {/* Filter Tanggal Akhir */}
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
            <Button onClick={applyFilters}>
              <Search className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => {
              const typeInfo = getMovementTypeInfo(movement.movement_type);
              const statusInfo = getStatusInfo(movement.status);
              const TypeIcon = typeInfo.icon;
              
              return (
                <TableRow key={movement.id}>
                  <TableCell>{formatDate(movement.created_at)}</TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{movement.product_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{movement.product_sku || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{movement.location_name || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${typeInfo.color}`}></div>
                      <TypeIcon className="mr-1 h-4 w-4" />
                      {typeInfo.label}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{formatRupiah(movement.unit_cost)}</TableCell>
                  <TableCell>{formatRupiah((movement.quantity || 0) * (movement.unit_cost || 0))}</TableCell>
                  <TableCell>{movement.reference_number || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StockMovements;
