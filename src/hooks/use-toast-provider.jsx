import React, { createContext, useState, useContext, useCallback } from 'react';

// 1. Buat Context
const ToastContext = createContext(null);

// 2. Buat Provider Komponen
export const ToastProvider = ({ children }) => {
  // --- State sekarang ada di dalam komponen React ---
  const [toasts, setToasts] = useState([]);

  // Fungsi untuk menambahkan toast baru
  const toast = useCallback(({ title, description, variant = 'default' }) => {
    const id = Date.now() + Math.random(); // ID yang lebih unik
    const newToast = { id, title, description, variant };

    // Tambahkan toast baru ke dalam state
    setToasts(prevToasts => [...prevToasts, newToast]);

    // Atur timeout untuk menghapus toast ini secara otomatis
    setTimeout(() => {
      dismiss(id);
    }, 5000); // Hapus setelah 5 detik

    return id;
  }, []);

  // Fungsi untuk menghapus toast
  const dismiss = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(t => t.id !== id));
  }, []);

  // Nilai yang akan disediakan oleh context
  const value = {
    toast,
    dismiss,
    toasts, // Kirim array toasts saat ini
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

// 3. Buat Hook kustom untuk menggunakan context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
