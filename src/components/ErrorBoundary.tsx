import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.label || 'root'}]:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-black text-stone-900 mb-2">
            Algo salió mal
          </h3>
          <p className="text-sm text-stone-500 mb-6 max-w-xs">
            {this.props.label
              ? `Ocurrió un error en la sección "${this.props.label}".`
              : 'Ocurrió un error inesperado.'}
            Puedes intentar de nuevo.
          </p>
          {this.state.error && (
            <details className="mb-6 max-w-xs text-left">
              <summary className="text-[10px] font-bold text-stone-500 cursor-pointer uppercase tracking-widest">
                Detalles técnicos
              </summary>
              <pre className="mt-2 text-[10px] text-rose-600 bg-rose-50 p-3 rounded-xl overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
          >
            <RefreshCw size={18} />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
