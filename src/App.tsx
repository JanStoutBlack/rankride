/**
 * App.tsx — application shell.
 *
 * Wires the global providers (react-query, auth context, tooltips, toasts) and
 * declares the route table. Routes are grouped by role and wrapped in
 * <ProtectedRoute>, which redirects users who lack the required role.
 *
 * Note: route gating here is a convenience for the UI only. Real enforcement
 * lives in the database's row-level security policies.
 */
import { Toaster } from "@/components/ui/toaster";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import CustomerBooking from "./pages/customer/Booking";
import CustomerTrips from "./pages/customer/Trips";
import DriverTrips from "./pages/driver/Trips";
import DriverScan from "./pages/driver/Scan";
import DriverQRCode from "./pages/driver/QRCode";
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerVehicles from "./pages/owner/Vehicles";
import OwnerDrivers from "./pages/owner/Drivers";
import OwnerMaintenance from "./pages/owner/Maintenance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Customer Routes */}
            <Route element={<ProtectedRoute allowedRoles={['rider', 'customer']} />}>
              <Route path="/customer/booking" element={<CustomerBooking />} />
              <Route path="/customer/trips" element={<CustomerTrips />} />
            </Route>
            
            {/* Driver Routes */}
            <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
              <Route path="/driver/trips" element={<DriverTrips />} />
              <Route path="/driver/scan" element={<DriverScan />} />
              <Route path="/driver/qr" element={<DriverQRCode />} />
            </Route>
            
            {/* Owner Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'owner']} />}>
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/owner/vehicles" element={<OwnerVehicles />} />
              <Route path="/owner/drivers" element={<OwnerDrivers />} />
              <Route path="/owner/maintenance" element={<OwnerMaintenance />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
