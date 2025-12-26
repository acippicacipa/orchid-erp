import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input'; // Sesuaikan path jika perlu
import { useAuth } from '@/contexts/AuthContext'; // Sesuaikan path jika perlu
import { useToast } from '@/hooks/use-toast'; // Sesuaikan path jika perlu

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Komponen dropdown pencarian produk yang dapat digunakan kembali.
 * 
 * @param {string} value - Nilai teks yang ditampilkan di input, dikontrol oleh parent.
 * @param {function} onValueChange - Fungsi untuk mengupdate nilai teks di parent.
 * @param {function} onSelect - Callback yang dipanggil dengan objek produk lengkap saat dipilih.
 * @param {string} [placeholder="Search and select product..."] - Teks placeholder untuk input.
 * @param {number|string} [locationId] - ID lokasi opsional untuk memfilter stok produk.
 * @param {boolean} [disabled=false] - Prop untuk menonaktifkan input.
 */
const ProductSearchDropdown = ({ 
  value, 
  onValueChange, 
  onSelect, 
  placeholder = "Search and select product...", 
  locationId,
  disabled = false
} ) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  // Fungsi untuk fetch data produk dari API
  const searchProducts = useCallback(async (query) => {
    // Hanya cari jika query memiliki panjang minimal 3 karakter
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      // Gunakan endpoint pencarian produk yang sudah kita buat di inventory/views.py
      const url = new URL(`${API_BASE_URL}/inventory/product-search/search/`);
      url.searchParams.append('search', query);
      
      // Jika locationId diberikan, tambahkan sebagai parameter query
      if (locationId) {
        url.searchParams.append('location_id', locationId);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Backend sudah mengembalikan array, jadi kita bisa langsung set state
        setResults(data); 
      } else {
        throw new Error('Failed to search products');
      }
    } catch (error) {
      console.error("Failed to search products:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [token, locationId, toast]); // Tambahkan locationId sebagai dependency

  // useEffect untuk memicu pencarian dengan debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      // Hanya cari jika input tidak kosong dan komponen tidak dinonaktifkan
      if (value && !disabled) {
        searchProducts(value);
      } else {
        setResults([]); // Kosongkan hasil jika input kosong atau disabled
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(handler);
  }, [value, disabled, searchProducts]); // `searchProducts` sudah mencakup dependency lain
  
  // Handler saat sebuah produk dipilih dari daftar
  const handleSelect = (product) => {
    // Panggil onSelect dengan seluruh objek produk
    onSelect(product);
    // Tutup dropdown
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        // Gunakan timeout untuk onBlur agar klik pada dropdown sempat ter-register
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        disabled={disabled}
        autoComplete="off" // Mencegah browser menampilkan history autocomplete
      />
      {/* Tampilkan dropdown hanya jika showDropdown true, ada teks di input, dan tidak loading */}
      {showDropdown && value && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-muted-foreground">Searching...</div>
          ) : results.length > 0 ? (
            results.map(product => (
              <div
                key={product.id}
                className="p-2 hover:bg-accent cursor-pointer"
                // Gunakan onMouseDown agar dieksekusi sebelum onBlur pada input
                onMouseDown={() => handleSelect(product)}
              >
                <div className="font-medium text-sm">{product.name}</div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>SKU: {product.sku}</span>
                  {/* Tampilkan stok hanya jika locationId diberikan */}
                  {locationId && (
                    <span className="font-semibold">Stock: {product.stock_quantity || 0}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            // Tampilkan "No products found" hanya jika pencarian sudah dilakukan (value >= 3 char)
            value.length >= 3 && <div className="p-2 text-center text-sm text-muted-foreground">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchDropdown;