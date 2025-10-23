import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Package, Factory, Search, X } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext'; // Pastikan useAuth diimpor

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Format Rupiah tanpa desimal untuk Indonesia
// const formatRupiah = (amount ) => {
//   if (amount === null || amount === undefined || amount === '') return 'Rp 0';
//   const number = Math.round(parseFloat(amount) || 0);
//   return new Intl.NumberFormat('id-ID', {
//     style: 'currency',
//     currency: 'IDR',
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 0
//   }).format(number);
// };

// Parse input Rupiah ke number
// const parseRupiah = (rupiahString) => {
//   if (!rupiahString) return 0;
//   return parseInt(String(rupiahString).replace(/[^0-9]/g, '')) || 0;
// };

// ==============================================================================
// PERUBAHAN #1: Komponen ProductSearchDropdown yang baru dan mandiri
// ==============================================================================
const ProductSearchDropdown = ({ onSelect, initialValue = '', filter = () => true, placeholder = "Search products...", disabled = false }) => {
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
        setResults(products.filter(filter)); // Terapkan filter kustom
      }
    } catch (error) {
      console.error("Failed to search products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!disabled) {
      const handler = setTimeout(() => {
        searchProducts(searchTerm);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [searchTerm, token, disabled]);
  
  const handleSelect = (product) => {
    setSearchTerm(product.full_name);
    onSelect(product);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => !disabled && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        disabled={disabled}
      />
      {showDropdown && !disabled && (
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
                <div className="font-medium">{product.sku} - {product.name} {product.color} </div>
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

const BillOfMaterials = () => {
  const [boms, setBoms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initialBomState = {
    product: '',
    version: '1.0',
    is_default: false,
    bom_items: [],
    // Hapus field yang tidak ada di DB
  };

  const [newBom, setNewBom] = useState(initialBomState);

  const initialBomItemState = {
    component: '',      // Field untuk ID produk komponen
    quantity: '1',      // Field untuk kuantitas
    notes: '',          // Field untuk catatan
    component_name: '', // Field untuk menampilkan nama (hanya untuk UI)
    component_sku: '',
  };

  const [newBomItem, setNewBomItem] = useState(initialBomItemState);

  useEffect(() => {
    fetchBoms();
    fetchLocations();
  }, []);

  const fetchBoms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/boms/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoms(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch BOMs",
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
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleBomInputChange = (field, value) => {
    setNewBom(prev => ({ ...prev, [field]: value }));
  };

  const handleBomItemChange = (field, value) => {
    setNewBomItem(prev => ({ ...prev, [field]: value }));
  };

  const removeBomItem = (index) => {
    setNewBom(prev => ({ ...prev, bom_items: prev.bom_items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        product: parseInt(newBom.product),
        version: newBom.version,
        is_default: newBom.is_default,
        bom_items: newBom.bom_items.map(item => ({
          component: item.component,
          quantity: item.quantity,
          notes: item.notes
        }))
      };

      const url = editingBom 
        ? `${API_BASE_URL}/inventory/boms/${editingBom.id}/`
        : `${API_BASE_URL}/inventory/boms/`;
      
      const method = editingBom ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save BOM');
      }

      toast({ title: "Success", description: `BOM ${editingBom ? 'updated' : 'created'} successfully.` });
      
      setIsModalOpen(false);
      resetForm();
      fetchBoms();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewBom(initialBomState);
    setNewBomItem(initialBomItemState);
    setEditingBom(null);
  };

  const handleEdit = async (bom) => {
    setLoading(true); // Tampilkan loading spinner
    setIsModalOpen(true); // Buka modal kosong terlebih dahulu
    setEditingBom(bom); // Simpan data BOM dasar

    try {
      const token = localStorage.getItem('token');
      // Panggil API untuk mendapatkan detail BOM, termasuk item-itemnya
      const response = await fetch(`${API_BASE_URL}/inventory/boms/${bom.id}/`, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch BOM details');
      }

      const detailedBom = await response.json();

      // Sekarang, isi form dengan data lengkap yang baru saja diambil
      setNewBom({
        product: detailedBom.product?.toString() || '',
        product_name: `${detailedBom.product_name || ''} ${detailedBom.product_color || ''}`.trim(), 
        version: detailedBom.version || '1.0',
        is_default: detailedBom.is_default || false,
        bom_items: (Array.isArray(detailedBom.bom_items) ? detailedBom.bom_items.map(item => ({
          ...item,
          component: item.component.toString(),
          component_name: `${item.component_name || 'Unknown'} ${item.component_color || ''}`.trim(),
          component_sku: item.component_sku || 'N/A',
        })) : [])
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load BOM details for editing.",
        variant: "destructive",
      });
      setIsModalOpen(false); // Tutup modal jika gagal
    } finally {
      setLoading(false); // Sembunyikan loading spinner
    }
  };

  const addBomItem = () => {
    // Gunakan 'component' untuk validasi
    if (!newBomItem.component) {
      toast({
        title: "Error",
        description: "Please select a component product",
        variant: "destructive",
      });
      return;
    }

    const item = {
      id: Date.now(), // ID sementara untuk key di React
      component: parseInt(newBomItem.component),
      quantity: parseFloat(newBomItem.quantity),
      notes: newBomItem.notes || '', // Pastikan notes tidak undefined
      
      // Data ini hanya untuk tampilan di tabel, tidak dikirim ke backend
      component_name: newBomItem.component_name,
      component_sku: newBomItem.component_sku,
    };

    setNewBom(prev => ({
      ...prev,
      bom_items: [...prev.bom_items, item]
    }));

    // Reset form item baru ke kondisi awal
    setNewBomItem(initialBomItemState);
  };


  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold tracking-tight">Bill of Materials</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> New BOM
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>
                {editingBom ? 'Edit Bill of Materials' : 'Create New Bill of Materials'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="bom-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                {/* BOM Header */}
                <div className="grid grid-cols-3 gap-4">
                  {/* ============================================================================== */}
                  {/* PERUBAHAN #2: Menggunakan ProductSearchDropdown untuk Produk Utama */}
                  {/* ============================================================================== */}
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="product">Product</Label>
                    <ProductSearchDropdown
                      // Saat edit, berikan nama produk. Saat baru, berikan string kosong.
                      initialValue={editingBom ? newBom.product_name : ''}
                      onSelect={(product) => handleBomInputChange('product', product.id.toString())}
                      filter={(p) => p.is_manufactured}
                      placeholder="Search manufactured product..."
                      // Input di-disable jika sedang dalam mode edit
                      disabled={!!editingBom} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      value={newBom.version}
                      onChange={(e) => handleBomInputChange('version', e.target.value)}
                      placeholder="1.0"
                    />
                  </div>
                </div>

                {/* Add Components Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Add Components</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="col-span-2">
                      <Label>Component Product</Label>
                      <ProductSearchDropdown
                        // Selalu berikan string kosong untuk input komponen baru
                        initialValue={''}
                        onSelect={(product) => {
                          setNewBomItem(prev => ({
                            ...prev,
                            component: product.id.toString(), // Gunakan 'component'
                            component_name: product.name,
                            component_sku: product.sku,
                          }));
                        }}
                        placeholder="Search component..."
                      />
                    </div>
                    
                    <div>
                      <Label>Quantity Required</Label>
                      <Input
                        type="number"
                        value={newBomItem.quantity} // Gunakan 'quantity'
                        onChange={(e) => setNewBomItem(prev => ({ ...prev, quantity: e.target.value }))}
                        min="1"
                        step="1"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addBomItem} className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
                  </div>
                </div>

                {/* Components List */}
                {newBom.bom_items.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">BOM Components</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Cek jika newBom.bom_items ada sebelum di-map */}
                        {newBom.bom_items && newBom.bom_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.component_name}</div>
                                <div className="text-sm text-gray-500">{item.component_sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeBomItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_default"
                    checked={newBom.is_default}
                    onCheckedChange={(checked) => handleBomInputChange('is_default', checked)}
                  />
                  <Label htmlFor="is_default">Set as Default BOM</Label>
                </div>
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="bom-form" disabled={loading}>
                {loading ? 'Saving...' : (editingBom ? 'Update BOM' : 'Create BOM')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* BOMs Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boms.map((bom) => (
              <TableRow key={bom.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{bom.product_name || 'N/A'} {bom.product_color}</div>
                    <div className="text-sm text-gray-500">{bom.product_sku || 'N/A'}</div>
                  </div>
                </TableCell>
                <TableCell>{bom.version}</TableCell>
                <TableCell>{bom.is_default ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(bom)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BillOfMaterials;
