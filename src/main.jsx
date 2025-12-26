import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './hooks/use-toast-provider'; // Impor provider Anda
import { Toaster } from './components/ui/toaster'; // Asumsi Anda punya komponen Toaster

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
      <Toaster /> {/* Letakkan Toaster di sini agar bisa mengakses context */}
    </ToastProvider>
  </StrictMode>,
)
