import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './app/providers/AppContainer';
import { ErrorBoundary } from './app/providers/ErrorBoundary';
import { AppRoutes } from './app/routes/AppRoutes';

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
