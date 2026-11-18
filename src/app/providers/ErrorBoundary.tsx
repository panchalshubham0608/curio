import { Component, type ReactNode } from 'react';
import { logError } from '../../shared/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(): void {
    // Log generic code without leaking stack traces or user data
    logError('Unhandled UI rendering error', 'UI_BOUNDARY');
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="curio-main curio-main--reading">
          <section className="curio-card curio-card--padded stack-md" role="alert">
            <span className="curio-eyebrow">Something went off script</span>
            <h1>Curio hit an unexpected display issue</h1>
            <p className="text-secondary">
              Your saved items and session progress are safely preserved. Reload to return to
              your home edition.
            </p>
            <div>
              <button
                type="button"
                className="curio-btn curio-btn--primary"
                onClick={this.handleReload}
              >
                Return to Home
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
