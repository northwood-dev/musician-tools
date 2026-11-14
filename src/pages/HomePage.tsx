import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// The home page (`/`): a greeting for a signed-in user, the sign-in actions for a visitor.
export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {isAuthenticated && user ? (
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gradient">Hello, {user.name}!</h1>
            <p className="text-2xl text-gray-700 dark:text-gray-200">
              What will you practice today?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-4xl">♪</span>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gradient">Musician Tools</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Practice management for musicians. Track your songs, tempos, keys, and progress.
            </p>
            {/* Sign-in actions live here (not in the header) so the mobile header
                stays uncluttered for signed-out visitors. */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
              <Link to="/login" className="btn-secondary">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
