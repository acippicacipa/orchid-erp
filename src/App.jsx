import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import DataImport from './components/data-import/DataImport'
import Layout from './components/layout/Layout'
import CategoryManagement from './components/inventory/CategoryManagement'
import ProductManagement from './components/inventory/ProductManagement'
import LocationManagement from './components/inventory/LocationManagement'
import StockManagement from './components/inventory/StockManagement'
import StockMovements from './components/inventory/StockMovements'
import GoodsReceiptManagement from './components/inventory/GoodsReceiptManagement'
import BillOfMaterials from './components/manufacturing/BillOfMaterials'
import AssemblyOrders from './components/manufacturing/AssemblyOrders'
import SupplierManagement from './components/purchasing/SupplierManagement'
import PurchaseOrderManagement from './components/purchasing/PurchaseOrderManagement'
import BillManagement from './components/purchasing/BillManagement'
import PurchasingDashboard from './components/purchasing/PurchasingDashboard'
import CustomerManagement from './components/sales/CustomerManagement'
import SalesOrderManagement from './components/sales/SalesOrderManagement'
import CreateSalesOrder from './components/sales/CreateSalesOrder'
import InvoiceManagement from './components/sales/InvoiceManagement'
import SalesDashboard from './components/sales/SalesDashboard'
import AccountingDashboard from './components/accounting/AccountingDashboard'
import ChartOfAccounts from './components/accounting/ChartOfAccounts'
import JournalEntries from './components/accounting/JournalEntries'
import FinancialReports from './components/accounting/FinancialReports'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './App.css'
import BusinessIntelligenceDashboard from './components/analytics/BusinessIntelligenceDashboard'
import IndonesianReports from './components/analytics/IndonesianReports'
import KPIManagement from './components/analytics/KPIManagement'
import ReportBuilder from './components/analytics/ReportBuilder'
import ReportTemplates from './components/analytics/ReportTemplates'
import UserManagement from './components/users/UserManagement'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />
}

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/data-import" 
        element={
          <ProtectedRoute>
            <Layout>
              <DataImport />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory/categories" 
        element={
          <ProtectedRoute>
            <Layout>
              <CategoryManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory/products" 
        element={
          <ProtectedRoute>
            <Layout>
              <ProductManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory/locations" 
        element={
          <ProtectedRoute>
            <Layout>
              <LocationManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory/stock" 
        element={
          <ProtectedRoute>
            <Layout>
              <StockManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory/stock-movements" 
        element={
          <ProtectedRoute>
            <Layout>
              <StockMovements />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory/good-receipt" 
        element={
          <ProtectedRoute>
            <Layout>
              <GoodsReceiptManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manufacturing/boms" 
        element={
          <ProtectedRoute>
            <Layout>
              <BillOfMaterials />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manufacturing/assembly-orders" 
        element={
          <ProtectedRoute>
            <Layout>
              <AssemblyOrders />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchasing/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <PurchasingDashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchasing/suppliers" 
        element={
          <ProtectedRoute>
            <Layout>
              <SupplierManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchasing/purchase-orders" 
        element={
          <ProtectedRoute>
            <Layout>
              <PurchaseOrderManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchasing/bills" 
        element={
          <ProtectedRoute>
            <Layout>
              <BillManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/create" 
        element={
          <ProtectedRoute>
            <Layout>
              <CreateSalesOrder />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <SalesDashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/customers" 
        element={
          <ProtectedRoute>
            <Layout>
              <CustomerManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/orders" 
        element={
          <ProtectedRoute>
            <Layout>
              <SalesOrderManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/orders/create" 
        element={
          <ProtectedRoute>
            <Layout>
              <CreateSalesOrder />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales/invoices" 
        element={
          <ProtectedRoute>
            <Layout>
              <InvoiceManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accounting/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <AccountingDashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accounting/accounts" 
        element={
          <ProtectedRoute>
            <Layout>
              <ChartOfAccounts />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accounting/journal-entries" 
        element={
          <ProtectedRoute>
            <Layout>
              <JournalEntries />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accounting/reports" 
        element={
          <ProtectedRoute>
            <Layout>
              <FinancialReports />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <BusinessIntelligenceDashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics/report" 
        element={
          <ProtectedRoute>
            <Layout>
              <IndonesianReports />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics/kpi" 
        element={
          <ProtectedRoute>
            <Layout>
              <KPIManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics/builder" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportBuilder />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics/template" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportTemplates />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users/management" 
        element={
          <ProtectedRoute>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <AppRoutes />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

