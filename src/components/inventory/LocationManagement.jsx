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
import { PlusCircle, Edit, Trash2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const LOCATION_TYPES = [
  { value: 'WAREHOUSE', label: 'Main Warehouse' },
  { value: 'STORE_ONLINE', label: 'Online Store' },
  { value: 'STORE_OFFLINE', label: 'Offline Store' },
  { value: 'PRODUCTION', label: 'Production Area' },
  { value: 'QUARANTINE', label: 'Quarantine Area' },
  { value: 'TRANSIT', label: 'In Transit' },
  { value: 'SUPPLIER', label: 'Supplier Location' },
  { value: 'CUSTOMER', label: 'Customer Location' },
];

const LocationManagement = ( ) => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({
    name: '',
    location_type: 'WAREHOUSE',
    code: '',
    address: '',
    contact_person: '',
    phone: '',
    email: '',
    is_active: true,
    is_sellable_location: true,
    is_purchasable_location: true,
    is_manufacturing_location: false,
    storage_capacity: '',
    current_utilization: '0.00',
    notes: '',
  });
  const [editingLocation, setEditingLocation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

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
      // Perbaikan keamanan data
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
    const { name, value, type, checked } = e.target;
    setNewLocation(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setNewLocation(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingLocation ? 'PUT' : 'POST';
      const url = editingLocation 
        ? `${API_BASE_URL}/inventory/locations/${editingLocation.id}/` 
        : `${API_BASE_URL}/inventory/locations/`;
      
      const payload = {
        ...newLocation,
        storage_capacity: newLocation.storage_capacity ? parseFloat(newLocation.storage_capacity) : null,
        current_utilization: parseFloat(newLocation.current_utilization),
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
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save location');
      }

      toast({
        title: "Success",
        description: `Location ${editingLocation ? 'updated' : 'created'} successfully.`, 
      });
      setIsModalOpen(false);
      setNewLocation({
        name: '', location_type: 'WAREHOUSE', code: '', address: '', contact_person: '',
        phone: '', email: '', is_active: true, is_sellable_location: true,
        is_purchasable_location: true, is_manufacturing_location: false,
        storage_capacity: '', current_utilization: '0.00', notes: '',
      });
      setEditingLocation(null);
      fetchLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setNewLocation({
      name: location.name,
      location_type: location.location_type,
      code: location.code,
      address: location.address || '',
      contact_person: location.contact_person || '',
      phone: location.phone || '',
      email: location.email || '',
      is_active: location.is_active,
      is_sellable_location: location.is_sellable_location,
      is_purchasable_location: location.is_purchasable_location,
      is_manufacturing_location: location.is_manufacturing_location,
      storage_capacity: location.storage_capacity || '',
      current_utilization: location.current_utilization || '0.00',
      notes: location.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/locations/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete location');
      }
      toast({
        title: "Success",
        description: "Location deleted successfully.",
      });
      fetchLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Location Management</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLocation(null);
              setNewLocation({
                name: '', location_type: 'WAREHOUSE', code: '', address: '', contact_person: '',
                phone: '', email: '', is_active: true, is_sellable_location: true,
                is_purchasable_location: true, is_manufacturing_location: false,
                storage_capacity: '', current_utilization: '0.00', notes: '',
              });
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Location
            </Button>
          </DialogTrigger>
          {/* ============================================================================== */}
          {/* PERUBAHAN UTAMA DI SINI: Merestrukturisasi DialogContent */}
          {/* ============================================================================== */}
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="location-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" value={newLocation.name} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" name="code" value={newLocation.code} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location_type">Location Type</Label>
                  <Select name="location_type" value={newLocation.location_type} onValueChange={(value) => handleSelectChange('location_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input id="contact_person" name="contact_person" value={newLocation.contact_person} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" value={newLocation.phone} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={newLocation.email} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" name="address" value={newLocation.address} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storage_capacity">Storage Capacity</Label>
                  <Input id="storage_capacity" name="storage_capacity" type="number" step="0.01" value={newLocation.storage_capacity} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="current_utilization">Current Utilization (%)</Label>
                  <Input id="current_utilization" name="current_utilization" type="number" step="0.01" value={newLocation.current_utilization} onChange={handleInputChange} />
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_active" name="is_active" checked={newLocation.is_active} onCheckedChange={(checked) => handleSelectChange('is_active', checked)} />
                  <Label htmlFor="is_active">Is Active</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_sellable_location" name="is_sellable_location" checked={newLocation.is_sellable_location} onCheckedChange={(checked) => handleSelectChange('is_sellable_location', checked)} />
                  <Label htmlFor="is_sellable_location">Is Sellable Location</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_purchasable_location" name="is_purchasable_location" checked={newLocation.is_purchasable_location} onCheckedChange={(checked) => handleSelectChange('is_purchasable_location', checked)} />
                  <Label htmlFor="is_purchasable_location">Is Purchasable Location</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_manufacturing_location" name="is_manufacturing_location" checked={newLocation.is_manufacturing_location} onCheckedChange={(checked) => handleSelectChange('is_manufacturing_location', checked)} />
                  <Label htmlFor="is_manufacturing_location">Is Manufacturing Location</Label>
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={newLocation.notes} onChange={handleInputChange} />
                </div>
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="submit" form="location-form">Save Location</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>        
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length > 0 ? (
              locations.map(location => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.code}</TableCell>
                  <TableCell>{LOCATION_TYPES.find(type => type.value === location.location_type)?.label || location.location_type}</TableCell>
                  <TableCell>{location.address}</TableCell>
                  <TableCell>{location.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(location.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No locations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LocationManagement;
