import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { queryClient } from './app/queryClient';
import { AppRoutes } from './app/AppRoutes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#18181b', // zinc-900
              color: '#fafafa', // zinc-50
              border: '1px solid #27272a', // zinc-800
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '0.5rem',
            },
            success: {
              iconTheme: {
                primary: '#f97316', // orange-500
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444', // red-500
                secondary: '#fff',
              }
            }
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
