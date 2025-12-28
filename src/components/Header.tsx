import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 glass-effect border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">♪</span>
            </div>
            <h1 className="text-xl font-bold text-gradient hidden sm:block">
              Musician Tools
            </h1>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {isAuthenticated && (
              <>
                <Link
                  to="/songs"
                  className="text-gray-700 hover:text-brand-600 font-medium transition-colors"
                >
                  Songs
                </Link>
                <Link
                  to="/my-instruments"
                  className="text-gray-700 hover:text-brand-600 font-medium transition-colors"
                >
                  Instruments
                </Link>
                <Link
                  to="/my-playlists"
                  className="text-gray-700 hover:text-brand-600 font-medium transition-colors"
                >
                  Playlists
                </Link>
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
