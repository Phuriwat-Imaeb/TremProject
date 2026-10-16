import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-700 text-white' : 'text-teal-50 hover:bg-teal-500'}`;

function Navbar() {
  const { isLoggedIn, member, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="bg-teal-600">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="text-lg font-bold text-white">
          PetFinder
        </Link>
        <div className="flex items-center gap-1">
          {isLoggedIn ? (
            <>
              <NavLink to="/me" className={linkClass}>
                {member?.displayName ?? 'บัญชีของฉัน'}
              </NavLink>
              <button
                onClick={handleLogout}
                className="rounded-md px-3 py-2 text-sm font-medium text-teal-50 hover:bg-teal-500"
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                เข้าสู่ระบบ
              </NavLink>
              <NavLink to="/register" className={linkClass}>
                สมัครสมาชิก
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
