import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input'; // Sesuaikan path jika perlu
import { useToast } from '../ui/use-toast'; // Sesuaikan path jika perlu
import { useAuth } from '../../contexts/AuthContext'; // Asumsi Anda menggunakan ini untuk token

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const CustomerSearchDropdown = ({ onSelect, initialValue = '', filter = ( ) => true, placeholder = "Search customers...", disabled = false }) => {
  const { token } = useAuth(); // Ambil token dari context
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Efek untuk mengupdate searchTerm jika initialValue berubah (misal saat form edit dibuka)
  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  // Fungsi untuk mencari customer ke backend
  const searchCustomers = async (query) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/customers/?search=${query}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const customers = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setResults(customers.filter(filter)); // Terapkan filter kustom
      } else {
        throw new Error('Failed to search customers');
      }
    } catch (error) {
      console.error("Failed to search customers:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Debouncing untuk input pencarian
  useEffect(() => {
    if (!disabled) {
      const handler = setTimeout(() => {
        searchCustomers(searchTerm);
      }, 300); // Tunda 300ms setelah user berhenti mengetik
      return () => clearTimeout(handler);
    }
  }, [searchTerm, token, disabled]);
  
  // Handler saat item di dropdown dipilih
  const handleSelect = (customer) => {
    setSearchTerm(customer.name); // Isi input dengan nama customer yang dipilih
    onSelect(customer); // Kirim seluruh objek customer ke parent component
    setShowDropdown(false); // Sembunyikan dropdown
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => !disabled && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay untuk memungkinkan klik
        disabled={disabled}
      />
      {showDropdown && !disabled && (
        <div className="absolute top-full left-0 z-20 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(customer => (
              <div
                key={customer.id}
                className="p-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(customer)} // Gunakan onMouseDown
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">ID: {customer.customer_id} | {customer.email || 'No Email'}</div>
              </div>
            ))
          ) : (
            searchTerm.length >= 2 && <div className="p-2 text-center text-sm text-gray-500">No customers found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchDropdown;
