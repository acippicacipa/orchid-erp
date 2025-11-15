import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext'; // +++ TAMBAHKAN: Impor useAuth

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ... (fungsi formatRupiah tetap sama )

const ProductSearchDropdown = ({ value, onValueChange, onSelect, placeholder = "Search products...", locationId = null, disabled = false }) => {
  const { token } = useAuth(); // Panggil hook useAuth
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();

  const searchProducts = async (query) => {
    // --- PERBAIKAN #1: Ubah kondisi query ---
    // Pencarian hanya butuh query, tidak perlu locationId di sini
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const url = new URL(`${API_BASE_URL}/inventory/product-search/`);
      url.searchParams.append('search', query);
      if (locationId) {
        url.searchParams.append('location_id', locationId);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Hapus filter is_sellable karena endpoint search sudah seharusnya mengembalikan data yang relevan
        setResults(data.results || []); 
      } else {
        throw new Error('Failed to search products');
      }
    } catch (error) {
      console.error("Failed to search products:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      // --- PERBAIKAN #2: Logika Pemicu yang Lebih Baik ---
      // Selalu cari jika:
      // 1. Komponen tidak di-disable.
      // 2. Ada teks pencarian (value).
      // 3. DAN (ada locationId ATAU locationId tidak diperlukan sama sekali).
      // Ini memastikan pencarian berjalan saat teks diketik DAN saat lokasi dipilih.
      if (!disabled && value) {
        searchProducts(value);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [value, locationId, disabled]); // Dependensi sudah benar
  
  const handleSelect = (product) => {
    onSelect(product);
    setShowDropdown(false);
  };

  // Hapus fungsi handleInputChange yang tidak terpakai
  // const handleInputChange = (e) => { ... };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => !disabled && setShowDropdown(true)} // Tambahkan pengecekan !disabled
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        disabled={disabled}
      />
      {showDropdown && !disabled && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(product => (
              <div
                key={product.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onMouseDown={() => handleSelect(product)}
              >
                <div className="font-medium text-sm">{product.name} {product.color}</div>
                <div className="text-sm text-gray-500">
                  {/* --- PERBAIKAN #3: Ganti nama field agar cocok dengan backend --- */}
                  (Stock: {product.current_stock || 0})
                </div>
              </div>
            ))
          ) : (
            value && value.length >= 2 && <div className="p-2 text-center text-sm text-gray-500">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchDropdown;
