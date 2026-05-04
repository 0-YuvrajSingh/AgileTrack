import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { useAppStore } from './store/useAppStore';
import { Toaster } from './components/ui/sonner';

function ThemeEffect() {
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeEffect />
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
