import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext.jsx";
import Loader from "../components/common/Loader.jsx";

export default function ProtectedRoute() {
  const { user, loading } = useAuthContext();

  if (loading) return <Loader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
