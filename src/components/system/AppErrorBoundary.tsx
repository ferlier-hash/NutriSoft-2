import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureTechnicalError } from '../../lib/observability';

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void captureTechnicalError(new Error(error.message, { cause: info.componentStack }), 'react_boundary');
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-bold text-text-primary">No pudimos mostrar esta pantalla</h1>
          <p className="text-sm text-text-secondary">El inconveniente técnico fue registrado sin enviar información clínica. Recargá para volver a intentarlo.</p>
          <button className="btn-primary mx-auto min-h-11 px-5" onClick={() => window.location.reload()}>Recargar</button>
        </main>
      );
    }
    return this.props.children;
  }
}
