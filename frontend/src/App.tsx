import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/Layout';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Login from './pages/Login';
import University from './pages/University';
import { PageTitleProvider } from './contexts/PageTitleContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Profile from './pages/Profile';
import { Toaster } from 'sonner';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route component (redirects authenticated users to home)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <PageTitleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Home />} />
            <Route path="chat" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
            <Route path="university" element={<University />} />
            <Route path="settings" element={<div className="p-6">Settings coming soon...</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PageTitleProvider>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId="290624832607-j5jrknsnhd1llhesekjsi2ctkvdkfc9n.apps.googleusercontent.com">
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
