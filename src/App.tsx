import { MockProvider } from './app/provider';
import { ToastProvider } from './components/ui/Toast';
import { AppRouter } from './app/router';

export function App() {
  return (
    <MockProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </MockProvider>
  );
}

export default App;
