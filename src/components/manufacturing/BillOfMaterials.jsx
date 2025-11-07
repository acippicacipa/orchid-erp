import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Search, X } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';

// +++ TAMBAHKAN +++: Impor komponen ProductSearchDropdown eksternal
import ProductSearchDropdown from '../sales/ProductSearchDropdown'; // Sesuaikan path jika perlu

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const BillOfMaterials = ( ) => {
  const [boms, setBoms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [originalVersion, setOriginalVersion] = useState(null);

  // State untuk form BOM utama
  const initialBomState = {
    product: '',        // Menyimpan ID produk utama
    product_name: '',   // Menyimpan NAMA produk utama (untuk ditampilkan di dropdown)
    version: '1.0',
    is_default: false,
    bom_items: [],
  };
  const [newBom, setNewBom] = useState(initialBomState);

  // State untuk form item komponen baru
  const initialBomItemState = {
    component: '',      // Menyimpan ID komponen
    component_name: '', // Menyimpan NAMA komponen (untuk ditampilkan di dropdown)
    component_sku: '',
    quantity: '1',
    notes: '',
  };
  const [newBomItem, setNewBomItem] = useState(initialBomItemState);

  // --- Logika Fetch Data ---
  const fetchBoms = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = new URL(`${API_BASE_URL}/inventory/boms/`);
      if (search) {
        url.searchParams.append('search', search);
      }
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch BOMs');
      const data = await response.json();
      setBoms(data.results || data);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBoms(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, fetchBoms]);

  // --- Logika Form ---
  const resetForm = () => {
    setNewBom(initialBomState);
    setNewBomItem(initialBomItemState);
    setEditingBom(null);
    setOriginalVersion(null); 
  };

  const handleEdit = async (bom) => {
    setIsModalOpen(true);
    setEditingBom(bom);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/boms/${bom.id}/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch BOM details');
      const detailedBom = await response.json();
      setOriginalVersion(detailedBom.version); 
      setNewBom({
        product: detailedBom.product?.toString() || '',
        product_name: `${detailedBom.product_name || ''} ${detailedBom.product_color || ''}`.trim(),
        version: detailedBom.version || '1.0',
        is_default: detailedBom.is_default || false,
        bom_items: (detailedBom.bom_items || []).map(item => ({
          ...item,
          component: item.component.toString(),
          component_name: `${item.component_name || 'Unknown'} ${item.component_color || ''}`.trim(),
          component_sku: item.component_sku || 'N/A',
        })),
      });
    } catch (error) {
      toast({ title: "Error", description: "Could not load BOM details.", variant: "destructive" });
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const addBomItem = () => {
    if (!newBomItem.component) {
      toast({ title: "Error", description: "Please select a component product", variant: "destructive" });
      return;
    }
    const item = {
      id: Date.now(),
      component: parseInt(newBomItem.component),
      quantity: parseFloat(newBomItem.quantity),
      notes: newBomItem.notes || '',
      component_name: newBomItem.component_name,
      component_sku: newBomItem.component_sku,
    };
    setNewBom(prev => ({ ...prev, bom_items: [...prev.bom_items, item] }));
    setNewBomItem(initialBomItemState);
  };

  const removeBomItem = (index) => {
    setNewBom(prev => ({ ...prev, bom_items: prev.bom_items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isCreatingNewVersion = editingBom && newBom.version !== originalVersion;
      const method = (editingBom && !isCreatingNewVersion) ? 'PUT' : 'POST';
      const url = (editingBom && !isCreatingNewVersion)
        ? `${API_BASE_URL}/inventory/boms/${editingBom.id}/`
        : `${API_BASE_URL}/inventory/boms/`;
      const payload = {
        product: parseInt(newBom.product),
        version: newBom.version,
        is_default: newBom.is_default,
        bom_items: newBom.bom_items.map(item => ({
          component: item.component,
          quantity: item.quantity,
          notes: item.notes,
        })),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save BOM');
      }
      let successMessage = '';
      if (isCreatingNewVersion) {
        successMessage = `New version (${newBom.version}) of BOM created successfully.`;
      } else if (editingBom) {
        successMessage = 'BOM updated successfully.';
      } else {
        successMessage = 'New BOM created successfully.';
      }

      toast({ title: "Success", description: successMessage });
      setIsModalOpen(false);
      resetForm();
      fetchBoms();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bill of Materials</h2>
          <p className="text-muted-foreground">Manage product structures and components.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Product, SKU, BOM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <PlusCircle className="mr-2 h-4 w-4" /> New BOM
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>{editingBom ? 'Edit Bill of Materials' : 'Create New Bill of Materials'}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto px-6">
                <form id="bom-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                  {/* BOM Header */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="product">Product</Label>
                      {/* +++ PENGGUNAAN UNTUK PRODUK UTAMA +++ */}
                      <ProductSearchDropdown
                        value={newBom.product_name}
                        onValueChange={(text) => setNewBom(prev => ({ ...prev, product_name: text, product: '' }))}
                        onSelect={(product) => setNewBom(prev => ({ ...prev, product: product.id.toString(), product_name: product.full_name }))}
                        filter={(p) => p.is_manufactured}
                        placeholder="Search manufactured product..."
                        disabled={!!editingBom}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input value={newBom.version} onChange={(e) => setNewBom(prev => ({ ...prev, version: e.target.value }))} />
                    </div>
                  </div>

                  {/* Add Components Section */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Add Components</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="col-span-2">
                        <Label>Component Product</Label>
                        {/* +++ PENGGUNAAN UNTUK KOMPONEN +++ */}
                        <ProductSearchDropdown
                          value={newBomItem.component_name}
                          onValueChange={(text) => setNewBomItem(prev => ({ ...prev, component_name: text, component: '' }))}
                          onSelect={(product) => setNewBomItem(prev => ({
                            ...prev,
                            component: product.id.toString(),
                            component_name: product.full_name,
                            component_sku: product.sku,
                          }))}
                          placeholder="Search component..."
                        />
                      </div>
                      <div>
                        <Label>Quantity Required</Label>
                        <Input type="number" value={newBomItem.quantity} onChange={(e) => setNewBomItem(prev => ({ ...prev, quantity: e.target.value }))} min="1" />
                      </div>
                    </div>
                    <Button type="button" onClick={addBomItem} className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
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
                          {newBom.bom_items.map((item, index) => (
                            <TableRow key={item.id || index}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.component_name}</div>
                                  <div className="text-sm text-gray-500">{item.component_sku}</div>
                                </div>
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeBomItem(index)}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox id="is_default" checked={newBom.is_default} onCheckedChange={(checked) => setNewBom(prev => ({ ...prev, is_default: checked }))} />
                    <Label htmlFor="is_default">Set as Default BOM</Label>
                  </div>
                </form>
              </div>
              <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" form="bom-form" disabled={loading}>
                  {loading ? 'Saving...' : (editingBom ? 'Update BOM' : 'Create BOM')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                    <Button variant="outline" size="sm" onClick={() => handleEdit(bom)}>
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
