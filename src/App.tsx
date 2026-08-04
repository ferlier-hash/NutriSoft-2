import { MockProvider } from './app/provider';
import { AppRouter } from './app/router';

export function App() {
  return (
    <MockProvider>
      <AppRouter />
    </MockProvider>
  );
}

export default App;
