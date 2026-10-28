import { Outlet, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminArticles from './pages/admin/AdminArticles';
import AdminDashboard from './pages/admin/AdminDashboard';
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

// หน้าบ้าน: แถบเมนูบน + เนื้อหา + footer
// bare = ไม่ครอบกรอบกว้าง (หน้าแรกมีแถบพื้นหลังเต็มจอหลายสี) หน้าอื่นอยู่ในกรอบกว้างเท่ากันหมด
function PublicLayout({ bare = false }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={bare ? 'flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout bare />}>
        <Route path='/' element={<Home />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route
          path='/me'
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path='/trips' element={<Trips />} />
        <Route path='/trips/:id' element={<TripDetail />} />
        <Route
          path='/bookings'
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path='/bookings/:id'
          element={
            <ProtectedRoute>
              <BookingDetail />
            </ProtectedRoute>
          }
        />
        <Route path='/articles' element={<Articles />} />
        <Route path='/articles/:id' element={<ArticleDetail />} />
        <Route path='*' element={<NotFound />} />
      </Route>
      {/* หน้าเข้าสู่ระบบ / สมัครสมาชิก เต็มจอแบ่งสองฝั่ง ไม่มีแถบเมนู (ตามแบบ F08, F09) */}
      <Route path='/login' element={<Login />} />
      <Route path='/register' element={<Register />} />
      {/* หลังบ้าน: ด่านชั้นนอกให้ staff กับ admin เข้าได้ หน้าย่อยไปแสดงใน <Outlet /> ของ AdminLayout
          เส้นทาง คันรถ บทความ สมาชิก มีด่าน admin ซ้อนอีกชั้น (server ก็ตรวจซ้ำ ตอบ 403) */}
      <Route
        path='/admin'
        element={
          <ProtectedRoute roles={['staff', 'admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path='trips' element={<AdminTrips />} />
        <Route path='trips/new' element={<TripForm />} />
        <Route path='trips/:id/edit' element={<TripForm />} />
        <Route path='trips/:id/passengers' element={<TripPassengers />} />
        <Route
          element={
            <ProtectedRoute roles={['admin']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route path='routes' element={<AdminRoutes />} />
          <Route path='vehicles' element={<AdminVehicles />} />
          <Route path='articles' element={<AdminArticles />} />
          <Route path='articles/new' element={<ArticleForm />} />
          <Route path='articles/:id/edit' element={<ArticleForm />} />
          <Route path='members' element={<AdminMembers />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
