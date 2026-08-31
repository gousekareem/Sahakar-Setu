import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import RegisterChoice from "./pages/RegisterChoice.jsx";
import RegisterCustomer from "./pages/RegisterCustomer.jsx";
import RegisterWorker from "./pages/RegisterWorker.jsx";
import RegisterInstitution from "./pages/RegisterInstitution.jsx";
import WhySahakarSetu from "./pages/WhySahakarSetu.jsx";
import TheProblem from "./pages/TheProblem.jsx";
import DemoMode from "./pages/DemoMode.jsx";

import CustomerHome from "./pages/customer/CustomerHome.jsx";
import WorkerSearch from "./pages/customer/WorkerSearch.jsx";
import BookingFlow from "./pages/customer/BookingFlow.jsx";
import MyBookings from "./pages/customer/MyBookings.jsx";
import BookingDetail from "./pages/customer/BookingDetail.jsx";
import EmergencyPage from "./pages/customer/EmergencyPage.jsx";
import Notifications from "./pages/customer/Notifications.jsx";
import SkillPassport from "./pages/customer/SkillPassport.jsx";

import WorkerDashboard from "./pages/worker/WorkerDashboard.jsx";
import WorkerJobs from "./pages/worker/WorkerJobs.jsx";
import WorkerWelfare from "./pages/worker/WorkerWelfare.jsx";

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminWorkers from "./pages/admin/AdminWorkers.jsx";
import AdminBookings from "./pages/admin/AdminBookings.jsx";
import AdminAI from "./pages/admin/AdminAI.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminCooperatives from "./pages/admin/AdminCooperatives.jsx";

import CoopIntelligenceDashboard from "./pages/societyAdmin/CoopIntelligenceDashboard.jsx";
import CoopWorkers from "./pages/societyAdmin/CoopWorkers.jsx";
import CapacityNetwork from "./pages/societyAdmin/CapacityNetwork.jsx";
import CoopContracts from "./pages/societyAdmin/CoopContracts.jsx";
import CoopSettings from "./pages/societyAdmin/CoopSettings.jsx";

import InstitutionOnboarding from "./pages/institution/InstitutionOnboarding.jsx";
import InstitutionDashboard from "./pages/institution/InstitutionDashboard.jsx";
import PostContract from "./pages/institution/PostContract.jsx";
import ContractDetail from "./pages/institution/ContractDetail.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterChoice />} />
          <Route path="/register/customer" element={<RegisterCustomer />} />
          <Route path="/register/worker" element={<RegisterWorker />} />
          <Route path="/register/institution" element={<RegisterInstitution />} />
          <Route path="/why-sahakarsetu" element={<WhySahakarSetu />} />
          <Route path="/the-problem" element={<TheProblem />} />
          <Route path="/demo" element={<DemoMode />} />

          <Route path="/home" element={<ProtectedRoute role="CUSTOMER"><CustomerHome /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute role="CUSTOMER"><WorkerSearch /></ProtectedRoute>} />
          <Route path="/book" element={<ProtectedRoute role="CUSTOMER"><BookingFlow /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute role="CUSTOMER"><MyBookings /></ProtectedRoute>} />
          <Route path="/bookings/:id" element={<ProtectedRoute role="CUSTOMER"><BookingDetail /></ProtectedRoute>} />
          <Route path="/emergency" element={<ProtectedRoute role="CUSTOMER"><EmergencyPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/workers/:id/passport" element={<ProtectedRoute><SkillPassport /></ProtectedRoute>} />

          <Route path="/worker" element={<ProtectedRoute role="WORKER"><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker/jobs" element={<ProtectedRoute role="WORKER"><WorkerJobs /></ProtectedRoute>} />
          <Route path="/worker/welfare" element={<ProtectedRoute role="WORKER"><WorkerWelfare /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/workers" element={<ProtectedRoute role="ADMIN"><AdminWorkers /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute role="ADMIN"><AdminBookings /></ProtectedRoute>} />
          <Route path="/admin/ai" element={<ProtectedRoute role="ADMIN"><AdminAI /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute role="ADMIN"><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/cooperatives" element={<ProtectedRoute role="ADMIN"><AdminCooperatives /></ProtectedRoute>} />

          <Route path="/coop" element={<ProtectedRoute role="SOCIETY_ADMIN"><CoopIntelligenceDashboard /></ProtectedRoute>} />
          <Route path="/coop/workers" element={<ProtectedRoute role="SOCIETY_ADMIN"><CoopWorkers /></ProtectedRoute>} />
          <Route path="/coop/capacity" element={<ProtectedRoute role="SOCIETY_ADMIN"><CapacityNetwork /></ProtectedRoute>} />
          <Route path="/coop/contracts" element={<ProtectedRoute role="SOCIETY_ADMIN"><CoopContracts /></ProtectedRoute>} />
          <Route path="/coop/settings" element={<ProtectedRoute role="SOCIETY_ADMIN"><CoopSettings /></ProtectedRoute>} />

          <Route path="/institution/onboarding" element={<ProtectedRoute role="INSTITUTION"><InstitutionOnboarding /></ProtectedRoute>} />
          <Route path="/institution" element={<ProtectedRoute role="INSTITUTION"><InstitutionDashboard /></ProtectedRoute>} />
          <Route path="/institution/post-contract" element={<ProtectedRoute role="INSTITUTION"><PostContract /></ProtectedRoute>} />
          <Route path="/institution/contracts/:id" element={<ProtectedRoute role="INSTITUTION"><ContractDetail /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
