import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Landing from "./pages/Landing/Landing.jsx";
import Login from "./pages/Login/Login.jsx";
import Register from "./pages/Register/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail/VerifyEmail.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import CreateInterview from "./pages/CreateInterview/CreateInterview.jsx";
import Interview from "./pages/Interview/Interview.jsx";
import Coding from "./pages/Coding/Coding.jsx";
import Report from "./pages/Report/Report.jsx";
import PlacementReadiness from "./pages/PlacementReadiness/PlacementReadiness.jsx";
import ResumeAnalysis from "./pages/ResumeAnalysis/ResumeAnalysis.jsx";
import History from "./pages/History/History.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interview/create" element={<CreateInterview />} />
          <Route path="/interview/:id" element={<Interview />} />
          <Route path="/interview/:id/coding" element={<Coding />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/placement" element={<PlacementReadiness />} />
          <Route path="/resume" element={<ResumeAnalysis />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
