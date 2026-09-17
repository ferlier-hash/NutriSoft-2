import { lazy, Suspense } from 'react';
import { ToastProvider } from './components/ui/Toast';
import { AppRouter } from './app/router';
import { AuthProvider } from './auth/AuthProvider';
import { publicEnvironment } from './config/environment';

const DemoAppBoundary = lazy(() => import('./app/DemoAppBoundary').then(module => ({ default: module.DemoAppBoundary })));

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        {publicEnvironment.demoMode ? (
          <Suspense fallback={<p role="status" className="p-4 text-sm text-text-secondary">Cargando demostración…</p>}>
            <DemoAppBoundary><AppRouter /></DemoAppBoundary>
          </Suspense>
        ) : (
          <AppRouter />
        )}
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
