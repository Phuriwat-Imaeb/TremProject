import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminArticles from './pages/admin/AdminArticles';
import AdminLayout from './pages/admin/AdminLayout';
import AdminMembers from './pages/admin/AdminMembers';
import AdminRoutes from './pages/admin/AdminRoutes';
import AdminTrips from './pages/admin/AdminTrips';
import AdminVehicles from './pages/admin/AdminVehicles';
import ArticleForm from './pages/admin/ArticleForm';
import TripForm from './pages/admin/TripForm';
import TripPassengers from './pages/admin/TripPassengers';
import ArticleDetail from './pages/ArticleDetail';
import BookingDetail from './pages/BookingDetail';
import MyBookings from './pages/MyBookings';
import Articles from './pages/Articles';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import Register from './pages/Register';
import TripDetail from './pages/TripDetail';
import Trips from './pages/Trips';

function App() {
  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <ProtectedRoute>
                <BookingDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          {/* หลังบ้าน: ด่านชั้นนอกให้ staff กับ admin เข้าได้ หน้าย่อยไปแสดงใน <Outlet /> ของ AdminLayout
              บทความกับสมาชิกมีด่าน admin ซ้อนอีกชั้น (server ก็ตรวจซ้ำ ตอบ 403) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="trips" replace />} />
            <Route path="trips" element={<AdminTrips />} />
            <Route path="trips/new" element={<TripForm />} />
            <Route path="trips/:id/edit" element={<TripForm />} />
            <Route path="trips/:id/passengers" element={<TripPassengers />} />
            <Route
              element={
                <ProtectedRoute roles={['admin']}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="vehicles" element={<AdminVehicles />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="articles/new" element={<ArticleForm />} />
              <Route path="articles/:id/edit" element={<ArticleForm />} />
              <Route path="members" element={<AdminMembers />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
