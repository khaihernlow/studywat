import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import signinCover from "@/assets/signin_cover.jpg";
import vialingLogo from "@/assets/vialing-logo.png";
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useEffect } from 'react';

export default function Login({ className, ...props }: React.ComponentProps<"div">) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle('Login');
  }, [setTitle]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await login(credentialResponse);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 min-h-screen mx-6 items-center justify-center bg-background", className)} {...props}>
      <Card className="overflow-hidden p-0 w-full max-w-2xl md:mx-0">
        <CardContent className="grid p-0 md:grid-cols-[1.2fr_1fr] h-full min-h-[420px]">
          <div className="p-10 flex flex-col gap-8 w-full justify-center">
            <div className="flex flex-col items-center text-center">
              <img
                src={vialingLogo}
                alt="Vialing Logo"
                className="h-12 w-12 mb-4 rounded-sm"
              />
              <h1 className="text-3xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-balance text-lg mt-2">
                Sign in to your StudyWat by Vialing account
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  console.log('Login Failed');
                }}
              />
            </div>
          </div>
          <div className="bg-muted relative h-full min-h-[420px] hidden md:block">
            <img
              src={signinCover}
              alt="Sign In Cover"
              className="absolute inset-0 w-full h-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="https://vialing.com/terms-of-use/" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://vialing.com/privacy-notice/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
      </div>
    </div>
  );
} 