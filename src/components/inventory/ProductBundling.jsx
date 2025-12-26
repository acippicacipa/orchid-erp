import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Trash2, PackagePlus, DollarSign } from 'lucide-react';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const formatRupiah = (amount ) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);
};

const BUNDLE_TYPES = ["Hand Bouquet", "Table Flower", "Standing Flower", "Other"];

const ProductBundling = ( ) => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const { token } = useAuth();
  const { toast } = useToast();

  const initialFormState = {
    // Field untuk produk baru
    bundle_type: '',
    form_number: '',
    new_product_selling_price: 0,
    
    // Data transaksi
    location: '',
    components: [],
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  
  // State untuk menambahkan komponen baru
  const [newComponent, setNewComponent] = useState({ product: null, quantity_used: 1 });
  const [componentSearch, setComponentSearch] = useState('');

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
    }, [token, toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleAddComponent = () => {
    if (!newComponent.product || newComponent.quantity_used <= 0) {
      toast({ title: "Warning", description: "Select a component and enter a valid quantity." });
      return;
    }
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, {
        component: newComponent.product.id,
        component_name: newComponent.product.name,
        quantity_used: newComponent.quantity_used,
        cost_price: newComponent.product.cost_price || 0,
        selling_price: newComponent.product.selling_price || 0,
      }]
    }));
    setNewComponent({ product: null, quantity_used: 1 });
    setComponentSearch('');
  };

  const handleRemoveComponent = (componentId) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter(c => c.component !== componentId),
    }));
  };

  // Kalkulasi total biaya dan harga jual komponen secara otomatis
  const summary = useMemo(() => {
    const total_cost = formData.components.reduce((acc, comp) => acc + (comp.quantity_used * comp.cost_price), 0);
    const total_selling_price = formData.components.reduce((acc, comp) => acc + (comp.quantity_used * comp.selling_price), 0);
    return { total_cost, total_selling_price };
  }, [formData.components]);

  useEffect(() => {
    // Setiap kali summary.total_selling_price berubah (karena komponen diubah),
    // perbarui nilai di form new_product_selling_price.
    setFormData(prev => ({
      ...prev,
      new_product_selling_price: summary.total_selling_price
    }));
  }, [summary.total_selling_price]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_product_selling_price < summary.total_selling_price) {
      toast({
        title: "Invalid Price",
        description: `Selling price cannot be lower than the suggested price of ${formatRupiah(summary.total_selling_price)}.`,
        variant: "destructive",
      });
      return; // Hentikan proses submit
    }

    if (!formData.new_product_name || !formData.new_product_sku || !formData.location || formData.components.length === 0) {
      toast({ title: "Error", description: "Please fill all required fields and add components.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        bundle_type: formData.bundle_type,
        form_number: formData.form_number,
        new_product_selling_price: formData.new_product_selling_price,
        location: formData.location,
        components: formData.components.map(c => ({ component: c.component, quantity_used: c.quantity_used })),
        notes: formData.notes,
      };
      const response = await fetch(`${API_BASE_URL}/inventory/product-bundles/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || JSON.stringify(data));
      
      toast({ 
        title: "Success", 
        description: `Product '${data.new_product_created.name}' created and assembled successfully.` 
      });
      setFormData(initialFormState);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Rangkai Produk</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Form Utama */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Define New Bundle Product</CardTitle>
                {/* <CardDescription>
                  Enter the details for the new product bundle you are creating.
                  Main Category will be 'LOKAL' and Sub Category will be 'Rangkaian'.
                </CardDescription> */}
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Arrangement Type *</Label>
                  <Select onValueChange={(v) => setFormData(f => ({ ...f, bundle_type: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      {BUNDLE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Form Number *</Label>
                  <Input value={formData.form_number} onChange={(e) => setFormData(f => ({ ...f, form_number: e.target.value }))} required placeholder="e.g., 20012" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price for this Arrangement *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    value={formData.new_product_selling_price}
                    onChange={(e) => setFormData(f => ({ ...f, new_product_selling_price: Number(e.target.value) }))}
                    required
                    // +++ TAMBAHKAN VALIDASI VISUAL +++
                    className={formData.new_product_selling_price < summary.total_selling_price ? 'border-red-500' : ''}
                  />
                  {/* +++ TAMBAHKAN PESAN BANTUAN +++ */}
                  {formData.new_product_selling_price < summary.total_selling_price && (
                    <p className="text-xs text-red-600">
                      Price is below suggested price of {formatRupiah(summary.total_selling_price)}.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Assembly Location *</Label>
                  <Select onValueChange={(v) => setFormData(f => ({ ...f, location: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>2. Add Components</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end mb-4">
                  <div className="flex-grow space-y-1">
                    <Label>Component Product</Label>
                    <ProductSearchDropdown
                      value={componentSearch}
                      onValueChange={setComponentSearch}
                      onSelect={(p) => {
                        setNewComponent(c => ({ ...c, product: p }));
                        setComponentSearch(p.name);
                      }}
                      locationId={formData.location}
                      disabled={!formData.location}
                      placeholder={!formData.location ? "Select location first" : "Search component..."}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Qty Used</Label>
                    <Input type="number" value={newComponent.quantity_used} onChange={(e) => setNewComponent(c => ({ ...c, quantity_used: Number(e.target.value) }))} className="w-28" min="1" />
                  </div>
                  <Button type="button" onClick={handleAddComponent}>Add</Button>
                </div>
                {formData.components.length > 0 && (
                  <Table>
                    <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Quantity Used</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {formData.components.map(c => (
                        <TableRow key={c.component}>
                          <TableCell>{c.component_name}</TableCell>
                          <TableCell>{c.quantity_used}</TableCell>
                          <TableCell><Button variant="destructive" size="icon" onClick={() => handleRemoveComponent(c.component)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Kolom Kanan: Summary & Action */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Cost & Price Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Component Cost</span>
                  <span className="font-bold text-lg">{formatRupiah(summary.total_cost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Suggested Selling Price</span>
                  <span className="font-bold text-lg">{formatRupiah(summary.total_selling_price)}</span>
                </div>
                <CardDescription>
                  The bundle's cost price will be automatically set based on the total component cost.
                </CardDescription>
              </CardContent>
            </Card>
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
              Create & Assemble Product
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductBundling;
