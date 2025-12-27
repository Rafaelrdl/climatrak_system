import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { QuickSetupPage } from '@/pages/QuickSetupPage';
import { WelcomeTourPage } from '@/pages/WelcomeTourPage';
import { Toaster } from '@/components/ui/sonner';
// import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { OnboardingManager } from '@/hooks/useOnboardingFlow';
import { TourProvider } from '@/components/tour';

// Módulos da plataforma
import { CmmsRoutes, MonitorRoutes } from '@/apps';

// Initialize PDF.js configuration BEFORE any PDF components load
import { configurePDFWorker } from '@/utils/pdfConfig';

// Initialize procedures module in development
if (import.meta.env.DEV) {
  import('@/utils/proceduresDevUtils');
  // Import PDF debug utilities in development
  import('@/utils/pdfDebug');
}

// Configure PDF worker immediately
configurePDFWorker();

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <OnboardingManager>
            <Routes>
              {/* Rotas públicas (sem layout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/onboarding/accept" element={<OnboardingPage />} />
              <Route path="/accept-invite" element={<OnboardingPage />} />
              <Route path="/quick-setup" element={<QuickSetupPage />} />
              <Route path="/welcome-tour" element={<WelcomeTourPage />} />
              
              {/* Rotas protegidas (com layout) */}
              <Route path="/*" element={
                <TourProvider autoStartWelcomeTour={false}>
                  <Layout>
                    <Routes>
                      {/* Módulo CMMS (TrakNor) */}
                      <Route path="/cmms/*" element={<CmmsRoutes />} />
                      
                      {/* Módulo Monitor (TrakSense) */}
                      <Route path="/monitor/*" element={<MonitorRoutes />} />
                      
                      {/* Redirect raiz para CMMS */}
                      <Route path="/" element={<Navigate to="/cmms" replace />} />
                      
                      {/* Fallback - redireciona rotas desconhecidas para CMMS */}
                      <Route path="*" element={<Navigate to="/cmms" replace />} />
                    </Routes>
                  </Layout>
                </TourProvider>
              } />
            </Routes>
          </OnboardingManager>
          <Toaster />
          {/* <RoleSwitcher /> */}
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App