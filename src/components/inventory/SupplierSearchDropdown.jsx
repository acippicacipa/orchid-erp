import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const SupplierSearchDropdown = ({ value, onValueChange, onSelect, placeholder = "Search supplier..." } ) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (value.length < 3) {
      setResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/purchasing/suppliers/?search=${value}`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        } else {
          throw new Error('Failed to search suppliers');
        }
      } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [value, toast]);

  const handleSelect = (supplier) => {
    onSelect(supplier);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && (
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
                <div className="font-medium">{supplier.name}</div>
                <div className="text-sm text-muted-foreground">{supplier.email || ''}</div>
              </div>
            ))
          ) : (
            value.length >= 3 && <div className="p-2 text-center text-sm text-muted-foreground">No suppliers found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierSearchDropdown;
