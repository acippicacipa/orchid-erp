import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Komponen dropdown pencarian supplier yang dapat digunakan kembali.
 * 
 * @param {string} value - Nilai teks yang ditampilkan di input, dikontrol oleh parent.
 * @param {function} onValueChange - Fungsi untuk mengupdate nilai teks di parent.
 * @param {function} onSelect - Callback yang dipanggil dengan objek supplier lengkap saat dipilih.
 * @param {string} [placeholder="Search and select supplier..."] - Teks placeholder untuk input.
 * @param {boolean} [disabled=false] - Prop untuk menonaktifkan input.
 */
const SupplierSearchDropdown = ({ 
  value, 
  onValueChange, 
  onSelect, 
  placeholder = "Search and select supplier...", 
  disabled = false
} ) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  // Fungsi untuk fetch data supplier dari API
  const searchSuppliers = useCallback(async (query) => {
    if (query.length < 3) { // Cari setelah 2 karakter untuk efisiensi
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const url = new URL(`${API_BASE_URL}/purchasing/suppliers/`);
      url.searchParams.append('search', query);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []); 
      } else {
        throw new Error('Failed to search suppliers');
      }
    } catch (error) {
      console.error("Failed to search suppliers:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [token, toast]);

  // useEffect untuk memicu pencarian dengan debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (value && !disabled) {
        searchSuppliers(value);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [value, disabled, searchSuppliers]);
  
  // Handler saat sebuah supplier dipilih
  const handleSelect = (supplier) => {
    onSelect(supplier);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        disabled={disabled}
        autoComplete="off"
      />
      {showDropdown && value && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-muted-foreground">Searching...</div>
          ) : results.length > 0 ? (
            results.map(supplier => (
              <div
                key={supplier.id}
                className="p-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(supplier)}
              >
                <div className="font-medium text-sm">{supplier.name}</div>
                <div className="text-xs text-muted-foreground">
                  {supplier.contact_person || supplier.email || 'No contact info'}
                </div>
              </div>
            ))
          ) : (
            value.length >= 2 && <div className="p-2 text-center text-sm text-muted-foreground">No suppliers found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierSearchDropdown;
