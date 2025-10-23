import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input'; // Sesuaikan path jika perlu
import { useToast } from '../ui/use-toast'; // Sesuaikan path jika perlu

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const formatRupiah = (amount ) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

const ProductSearchDropdown = ({ value, onValueChange, onSelect, placeholder = "Search products..." }) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();

  const searchProducts = async (query) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Gunakan endpoint yang benar untuk pencarian produk sales
      const response = await fetch(`${API_BASE_URL}/sales/products/search/?q=${query}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Pastikan produk yang ditampilkan adalah yang bisa dijual (is_sellable)
        setResults(data.filter(p => p.is_sellable !== false)); 
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
      // Hanya cari jika `value` (teks di input) ada isinya
      if (value) {
        searchProducts(value);
      } else {
        setResults([]); // Kosongkan hasil jika input kosong
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [value]);
  
  const handleSelect = (product) => {
    onSelect(product);
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    // Jika pengguna mulai mengetik, kita harus mengosongkan pilihan produk di parent
    if (value) {
      onSelect(null);
    }
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay untuk memungkinkan klik pada dropdown
      />
      {showDropdown && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(product => (
              <div
                key={product.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onMouseDown={() => handleSelect(product)} // Gunakan onMouseDown agar onBlur tidak ter-trigger duluan
              >
                <div className="font-medium text-sm">{product.name} {product.color} {} 
                  <label className="text-sm text-gray-500">
                    (Stock: {product.stock_quantity || 0} | {formatRupiah(product.selling_price)})
                  </label>
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
