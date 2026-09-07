/**
 * ProtectedRoute — route guard used in App.tsx.
 *
 * Waits for the auth context to finish loading, redirects signed-out visitors
 * to /auth, and sends signed-in users without one of `allowedRoles` to their
 * own home page. UI convenience only: row-level security is what actually
 * protects data.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { homeForRole, type AppRole } from '@/lib/roles';

interface ProtectedRouteProps {
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = homeForRole(role);
    
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
