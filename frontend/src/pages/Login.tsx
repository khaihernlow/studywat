import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      // Call the login function from AuthContext with the credential response
      await login(credentialResponse);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <img 
            src="https://vialing.com/wp-content/uploads/vialing-squares.webp" 
            alt="Vialing Logo" 
            className="mx-auto h-12 w-12 mb-4"
          />
          <h2 className="text-3xl font-bold text-foreground">
            Welcome to StudyWat
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to continue to your study companion
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
            }}
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 