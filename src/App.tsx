import { MockProvider } from './app/provider';
import { ToastProvider } from './components/ui/Toast';
import { AppRouter } from './app/router';
import { AuthProvider } from './auth/AuthProvider';
import { publicEnvironment } from './config/environment';

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        {publicEnvironment.demoMode ? (
          <MockProvider>
            <AppRouter />
          </MockProvider>
        ) : (
          <AppRouter />
        )}
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
