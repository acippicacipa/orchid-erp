import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Search, Loader2, Building, Tag, Calendar, Hash } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Fungsi helper untuk format mata uang
const formatRupiah = (amount ) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AssetManagement = () => {
  // State utama
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // State untuk data pendukung form
  const [assetCategories, setAssetCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // State untuk filter
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
  });

  // Hook
  const { token } = useAuth();
  const { toast } = useToast();

  // State untuk form
  const initialFormState = {
    name: '',
    category: '',
    location: '',
    purchase_date: '',
    purchase_price: '',
    useful_life_months: '',
    salvage_value: '0',
    status: 'IN_USE',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fungsi untuk mengambil data utama (daftar aset)
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_BASE_URL}/accounting/assets/?${params}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast, filters]);

  // Fungsi untuk mengambil data pendukung (kategori & lokasi)
  const fetchSupportingData = useCallback(async () => {
    try {
      const [categoriesRes, locationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/accounting/asset-categories/`, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(`${API_BASE_URL}/inventory/locations/`, { headers: { 'Authorization': `Token ${token}` } }),
      ]);
      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        setAssetCategories(catData.results || []);
      }
      if (locationsRes.ok) {
        const locData = await locationsRes.json();
        setLocations(locData.results || []);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch supporting data.", variant: "destructive" });
    }
  }, [token, toast]);

  // Effects
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  // Handler untuk form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingAsset(null);
  };

  const handleEditClick = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category.toString(),
      location: asset.location ? asset.location.toString() : '',
      purchase_date: asset.purchase_date,
      purchase_price: asset.purchase_price,
      useful_life_months: asset.useful_life_months,
      salvage_value: asset.salvage_value,
      status: asset.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = editingAsset
      ? `${API_BASE_URL}/accounting/assets/${editingAsset.id}/`
      : `${API_BASE_URL}/accounting/assets/`;
    const method = editingAsset ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      toast({ title: "Success", description: `Asset ${editingAsset ? 'updated' : 'created'} successfully.` });
      setIsDialogOpen(false);
      resetForm();
      fetchAssets(); // Refresh data
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk filter
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Helper untuk tampilan
  const getStatusBadge = (status) => {
    const config = {
      'IN_USE': 'bg-green-100 text-green-800',
      'IN_REPAIR': 'bg-yellow-100 text-yellow-800',
      'IDLE': 'bg-gray-100 text-gray-800',
      'DISPOSED': 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100';
    return <Badge className={config}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Asset Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) resetForm();
          setIsDialogOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add New Asset</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit Asset' : 'Create New Asset'}</DialogTitle>
              <DialogDescription>Fill in the details of the company asset.</DialogDescription>
            </DialogHeader>
            <form id="asset-form" onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Asset Category *</Label>
                  <Select name="category" value={formData.category} onValueChange={(v) => handleSelectChange('category', v)} required>
                    <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                    <SelectContent>
                      {assetCategories.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select name="location" value={formData.location} onValueChange={(v) => handleSelectChange('location', v)}>
                    <SelectTrigger><SelectValue placeholder="Select a location..." /></SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_USE">In Use</SelectItem>
                      <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                      <SelectItem value="IDLE">Idle</SelectItem>
                      <SelectItem value="DISPOSED">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date *</Label>
                  <Input id="purchase_date" name="purchase_date" type="date" value={formData.purchase_date} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price (IDR) *</Label>
                  <Input id="purchase_price" name="purchase_price" type="number" value={formData.purchase_price} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="useful_life_months">Useful Life (Months) *</Label>
                  <Input id="useful_life_months" name="useful_life_months" type="number" value={formData.useful_life_months} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salvage_value">Salvage Value (IDR)</Label>
                  <Input id="salvage_value" name="salvage_value" type="number" value={formData.salvage_value} onChange={handleInputChange} />
                </div>
              </div>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="asset-form" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingAsset ? 'Update Asset' : 'Create Asset')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Assets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="grid gap-2 flex-grow">
            <Label htmlFor="search-filter">Search Code/Name</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="search-filter" placeholder="Search..." className="pl-8" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-filter">Category</Label>
            <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
              <SelectTrigger id="category-filter" className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {assetCategories.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
              <SelectTrigger id="status-filter" className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="IN_USE">In Use</SelectItem>
                <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                <SelectItem value="IDLE">Idle</SelectItem>
                <SelectItem value="DISPOSED">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabel Aset */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead className="text-right">Book Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading assets...</TableCell></TableRow>
            ) : assets.length > 0 ? (
              assets.map(asset => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center"><Hash className="h-3 w-3 mr-1" />{asset.asset_code}</div>
                  </TableCell>
                  <TableCell><div className="flex items-center"><Tag className="h-3 w-3 mr-1 text-muted-foreground" />{asset.category_name}</div></TableCell>
                  <TableCell><div className="flex items-center"><Building className="h-3 w-3 mr-1 text-muted-foreground" />{asset.location_name || 'N/A'}</div></TableCell>
                  <TableCell><div className="flex items-center"><Calendar className="h-3 w-3 mr-1 text-muted-foreground" />{new Date(asset.purchase_date).toLocaleDateString()}</div></TableCell>
                  <TableCell className="text-right font-mono">{formatRupiah(asset.book_value)}</TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(asset)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">No assets found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AssetManagement;
