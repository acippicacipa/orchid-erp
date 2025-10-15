import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Package, Factory } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const BOM_TYPES = [
  { value: 'MANUFACTURING', label: 'Manufacturing BOM' },
  { value: 'ASSEMBLY', label: 'Assembly BOM' },
  { value: 'PHANTOM', label: 'Phantom BOM' },
  { value: 'TEMPLATE', label: 'Template BOM' },
];

const STATUS_CHOICES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const BillOfMaterials = ( ) => {
  const [boms, setBoms] = useState([]);
  const [locations, setLocations] = useState([]);
  const initialBomState = {
    product: '',
    // bom_number: '',  <-- HAPUS BARIS INI
    version: '1.0',
    is_default: false,
    bom_items: [],
  };
  const [newBom, setNewBom] = useState({
    product: '',
    version: '1.0',
    bom_type: 'MANUFACTURING',
    status: 'DRAFT',
    quantity_to_produce: '1.000',
    production_location: '',
    setup_time_minutes: '0.00',
    production_time_minutes: '0.00',
    labor_cost_per_unit: '0.0000',
    overhead_cost_per_unit: '0.0000',
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    description: '',
    notes: '',
    is_default: false,
    bom_items: [], // For nested BOM items
  });
  const [editingBom, setEditingBom] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [componentSearchTerm, setComponentSearchTerm] = useState({ term: '', index: null });
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showComponentDropdown, setShowComponentDropdown] = useState(false);

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

  const searchProducts = async (searchTerm, isComponentSearch = false) => {
    if (searchTerm.length < 2) {
      setSearchedProducts([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // Menggunakan endpoint pencarian yang sudah ada
      const response = await fetch(`${API_BASE_URL}/inventory/products/?search=${searchTerm}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const products = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setSearchedProducts(products);
        if (isComponentSearch) {
          setShowComponentDropdown(true);
        } else {
          setShowProductDropdown(true);
        }
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  // Debounce untuk pencarian produk utama
  useEffect(() => {
    const handler = setTimeout(() => {
      searchProducts(productSearchTerm, false);
    }, 300);
    return () => clearTimeout(handler);
  }, [productSearchTerm]);

  // Debounce untuk pencarian komponen
  useEffect(() => {
    const handler = setTimeout(() => {
      if (componentSearchTerm.index !== null) {
        searchProducts(componentSearchTerm.term, true);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [componentSearchTerm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewBom(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setNewBom(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBomItemChange = (index, field, value) => {
    const updatedItems = [...newBom.bom_items];
    updatedItems[index][field] = value;
    setNewBom(prev => ({ ...prev, bom_items: updatedItems }));
  };

  const addBomItem = () => {
    setNewBom(prev => ({
      ...prev,
      bom_items: [...prev.bom_items, {
        component: '',
        quantity_required: '1.000',
        unit_of_measure: 'pcs',
        item_type: 'MATERIAL',
        unit_cost: '0.0000',
        waste_percentage: '0.00',
        sequence_number: (prev.bom_items.length + 1) * 10,
        is_critical: false,
        is_optional: false,
        can_substitute: false,
        notes: '',
      }],
    }));
  };

  const removeBomItem = (index) => {
    const updatedItems = newBom.bom_items.filter((_, i) => i !== index);
    setNewBom(prev => ({ ...prev, bom_items: updatedItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingBom ? 'PUT' : 'POST';
      const url = editingBom 
        ? `${API_BASE_URL}/inventory/boms/${editingBom.id}/` 
        : `${API_BASE_URL}/inventory/boms/`;
      
      const payload = {
        ...newBom,
        product: newBom.product,
        // bom_number: newBom.bom_number, // <-- HAPUS BARIS INI
        version: newBom.version,
        is_default: newBom.is_default,
        bom_items: newBom.bom_items.map(item => ({
          ...item,
          component: item.component === 'null' ? null : item.component,
          quantity_required: parseFloat(item.quantity_required),
          unit_cost: parseFloat(item.unit_cost),
          waste_percentage: parseFloat(item.waste_percentage),
        })),
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
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save BOM');
      }

      toast({
        title: "Success",
        description: `BOM ${editingBom ? 'updated' : 'created'} successfully.`, 
      });
      setIsModalOpen(false);
      setNewBom({
        product: '', bom_number: '', version: '1.0', bom_type: 'MANUFACTURING', status: 'DRAFT',
        quantity_to_produce: '1.000', production_location: '', setup_time_minutes: '0.00',
        production_time_minutes: '0.00', labor_cost_per_unit: '0.0000', overhead_cost_per_unit: '0.0000',
        effective_date: new Date().toISOString().split('T')[0], expiry_date: '', description: '', notes: '',
        is_default: false, bom_items: [],
      });
      setEditingBom(null);
      fetchBoms();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (bom) => {
    setEditingBom(bom);
    setNewBom({
      product: bom.product.id.toString(),
      // bom_number: bom.bom_number, // <-- HAPUS BARIS INI
      version: bom.version,
      is_default: bom.is_default,
      bom_items: bom.bom_items.map(item => ({
        ...item,
        component: item.component.id.toString(),
      })),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this BOM?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/boms/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete BOM');
      }
      toast({
        title: "Success",
        description: "BOM deleted successfully.",
      });
      fetchBoms();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectProduct = (product) => {
    setNewBom(prev => ({ ...prev, product: product.id }));
    setProductSearchTerm(product.name); // Tampilkan nama di input
    setShowProductDropdown(false);
  };

  const selectComponent = (product, index) => {
    const updatedItems = [...newBom.bom_items];
    updatedItems[index].component = product.id;
    updatedItems[index].component_name = product.name; // Simpan nama untuk ditampilkan
    setNewBom(prev => ({ ...prev, bom_items: updatedItems }));
    setComponentSearchTerm({ term: '', index: null }); // Reset pencarian komponen
    setShowComponentDropdown(false);
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
      <h2 className="text-3xl font-bold tracking-tight mb-8">Bill of Materials Management</h2>

      <div className="flex justify-end mb-4">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingBom(null);
              setNewBom({
                product: '', bom_number: '', version: '1.0', bom_type: 'MANUFACTURING', status: 'DRAFT',
                quantity_to_produce: '1.000', production_location: '', setup_time_minutes: '0.00',
                production_time_minutes: '0.00', labor_cost_per_unit: '0.0000', overhead_cost_per_unit: '0.0000',
                effective_date: new Date().toISOString().split('T')[0], expiry_date: '', description: '', notes: '',
                is_default: false, bom_items: [],
              });
              
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New BOM
            </Button>
          </DialogTrigger>
          {/* ============================================================================== */}
          {/* PERUBAHAN UTAMA DI SINI: Merestrukturisasi DialogContent */}
          {/* ============================================================================== */}
          <DialogContent className="sm:max-w-5xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>{editingBom ? 'Edit BOM' : 'Add New BOM'}</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="bom-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2 relative">
                    <Label htmlFor="product">Product</Label>
                    <Input
                      id="product-search"
                      placeholder="Search product to produce..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)} // Delay untuk mengizinkan klik
                      required
                    />
                    {showProductDropdown && searchedProducts.length > 0 && (
                      <div className="absolute top-full left-0 z-20 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchedProducts.filter(p => p.is_manufactured).map(p => (
                          <div
                            key={p.id}
                            className="p-2 hover:bg-accent cursor-pointer"
                            onMouseDown={() => selectProduct(p)}
                          >
                            {getProductFullName(p)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="version">Version</Label>
                    <Input id="version" name="version" value={newBom.version} onChange={handleInputChange} />
                  </div>
                  {/* <div className="grid gap-2">
                    <Label htmlFor="bom_type">BOM Type</Label>
                    <Select name="bom_type" value={newBom.bom_type} onValueChange={(value) => handleSelectChange('bom_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BOM type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOM_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" value={newBom.status} onValueChange={(value) => handleSelectChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_CHOICES.map(status => (
                          <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity_to_produce">Quantity to Produce</Label>
                    <Input id="quantity_to_produce" name="quantity_to_produce" type="number" step="1" value={newBom.quantity_to_produce} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="production_location">Production Location</Label>
                    <Select name="production_location" value={newBom.production_location} onValueChange={(value) => handleSelectChange('production_location', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select production location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">-- No Specific Location --</SelectItem>
                        {locations.filter(l => l.is_manufacturing_location).map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="effective_date">Effective Date</Label>
                    <Input id="effective_date" name="effective_date" type="date" value={newBom.effective_date} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input id="expiry_date" name="expiry_date" type="date" value={newBom.expiry_date} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="setup_time_minutes">Setup Time (min)</Label>
                    <Input id="setup_time_minutes" name="setup_time_minutes" type="number" step="0.01" value={newBom.setup_time_minutes} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="production_time_minutes">Production Time (min)</Label>
                    <Input id="production_time_minutes" name="production_time_minutes" type="number" step="0.01" value={newBom.production_time_minutes} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="labor_cost_per_unit">Labor Cost/Unit</Label>
                    <Input id="labor_cost_per_unit" name="labor_cost_per_unit" type="number" step="0.0001" value={newBom.labor_cost_per_unit} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="overhead_cost_per_unit">Overhead Cost/Unit</Label>
                    <Input id="overhead_cost_per_unit" name="overhead_cost_per_unit" type="number" step="0.0001" value={newBom.overhead_cost_per_unit} onChange={handleInputChange} />
                  </div> */}
                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox id="is_default" name="is_default" checked={newBom.is_default} onCheckedChange={(checked) => handleSelectChange('is_default', checked)} />
                    <Label htmlFor="is_default">Is Default BOM for Product</Label>
                  </div>
                  {/* <div className="grid gap-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" value={newBom.description} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" value={newBom.notes} onChange={handleInputChange} />
                  </div> */}
                </div>

                <div className="col-span-2 mt-4">
                  <h3 className="text-lg font-semibold mb-2">BOM Items</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Component</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newBom.bom_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="relative">
                              <Input
                                placeholder="Search component..."
                                value={componentSearchTerm.index === index ? componentSearchTerm.term : item.component_name || ''}
                                onChange={(e) => setComponentSearchTerm({ term: e.target.value, index })}
                                onFocus={() => setComponentSearchTerm({ term: item.component_name || '', index })}
                                onBlur={() => setTimeout(() => setShowComponentDropdown(false), 200)}
                                required
                              />
                              {/* ============================================================================== */}
                              {/* PERUBAHAN TAMPILAN DROPDOWN KOMPONEN */}
                              {/* ============================================================================== */}
                              {showComponentDropdown && componentSearchTerm.index === index && searchedProducts.length > 0 && (
                                <div className="absolute top-full left-0 z-20 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                  {searchedProducts.map(p => (
                                    <div
                                      key={p.id}
                                      className="p-2 hover:bg-accent cursor-pointer"
                                      onMouseDown={() => selectComponent(p, index)}
                                    >
                                      {getProductFullName(p)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" value={item.quantity} onChange={(e) => handleBomItemChange(index, 'quantity', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={item.notes} onChange={(e) => handleBomItemChange(index, 'notes', e.target.value)} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => removeBomItem(index)} className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {newBom.bom_items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="h-12 text-center">
                              No BOM items added.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Button type="button" variant="outline" className="mt-2" onClick={addBomItem}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add BOM Item
                  </Button>
                </div>
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="submit" form="bom-form">Save BOM</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>BOM Number</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boms.length > 0 ? (
              boms.map(bom => (
                <TableRow key={bom.id}>
                  <TableCell className="font-medium">{bom.bom_number}</TableCell>
                  <TableCell>{getProductFullName(bom.product)}</TableCell>
                  <TableCell>{bom.version}</TableCell>
                  <TableCell>{bom.is_default ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(bom)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(bom.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No BOMs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BillOfMaterials;
