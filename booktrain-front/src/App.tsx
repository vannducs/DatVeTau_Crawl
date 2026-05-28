import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";

import HomePage          from "./pages/HomePage";
import LoginPage         from "./pages/LoginPage";
import RegisterPage      from "./pages/RegisterPage";
import AccountPage       from "./pages/AccountPage";
import MyOrdersPage      from "./pages/MyOrdersPage";
import OrderDetailPage   from "./pages/OrderDetailPage";
import SearchResultPage  from "./pages/SearchResultPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import PassengerInfoPage from "./pages/PassengerInfoPage";
import PaymentPage       from "./pages/PaymentPage";
import PaymentReturnPage from "./pages/PaymentReturnPage";
import TicketLookupPage  from "./pages/TicketLookupPage";

import AdminRoute  from "./components/common/AdminRoute";
import PrivateRoute from "./components/common/PrivateRoute";

import AdminApp             from "./admin/AdminApp";
import DashboardPage        from "./admin/pages/DashboardPage";
import TrainsPage           from "./admin/pages/TrainsPage";
import TrainDetailPage      from "./admin/pages/TrainDetailPage";
import TripsPage            from "./admin/pages/TripsPage";
import LocationsPage        from "./admin/pages/LocationsPage";
import UsersPage            from "./admin/pages/UsersPage";
import PaymentsPage         from "./admin/pages/PaymentsPage";
import OrderHistoryPage     from "./admin/pages/OrderHistoryPage";
import NotificationsPage    from "./admin/pages/NotificationsPage";
import AdminLogsPage        from "./admin/pages/AdminLogsPage";
import CrawlerPage          from "./admin/pages/CrawlerPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ─────────────────────────────────────── */}
          <Route path="/"                        element={<HomePage />} />
          <Route path="/login"                   element={<LoginPage />} />
          <Route path="/register"                element={<RegisterPage />} />
          <Route path="/trains/search"           element={<SearchResultPage />} />
          <Route path="/trains/payment-return"   element={<PaymentReturnPage />} />
          <Route path="/payment/vnpay-return"    element={<PaymentReturnPage />} />
          <Route path="/ticket-lookup"           element={<TicketLookupPage />} />

          {/* ── Authenticated user routes ──────────────────────────── */}
          <Route path="/account" element={
            <PrivateRoute><AccountPage /></PrivateRoute>
          } />
          <Route path="/my-orders" element={
            <PrivateRoute><MyOrdersPage /></PrivateRoute>
          } />
          <Route path="/my-orders/:orderCode" element={
            <PrivateRoute><OrderDetailPage /></PrivateRoute>
          } />
          <Route path="/trains/booking/:tripId" element={
            <PrivateRoute><SeatSelectionPage /></PrivateRoute>
          } />
          <Route path="/trains/passenger-info" element={
            <PrivateRoute><PassengerInfoPage /></PrivateRoute>
          } />
          <Route path="/trains/payment" element={
            <PrivateRoute><PaymentPage /></PrivateRoute>
          } />

          {/* ── Admin routes (nested layout) ───────────────────────── */}
          <Route path="/admin" element={
            <AdminRoute><AdminApp /></AdminRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="trains"        element={<TrainsPage />} />
            <Route path="trains/:trainId" element={<TrainDetailPage />} />
            <Route path="trips"         element={<TripsPage />} />
            <Route path="locations"     element={<LocationsPage />} />
            <Route path="users"         element={<UsersPage />} />
            <Route path="payments"      element={<PaymentsPage />} />
            <Route path="orders"        element={<OrderHistoryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="logs"          element={<AdminLogsPage />} />
            <Route path="crawler"       element={<CrawlerPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
