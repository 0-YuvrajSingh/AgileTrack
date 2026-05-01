import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { useAppStore } from './store/useAppStore';

function ThemeApplier() {
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      return;
    }

    if (theme === 'light') {
      root.classList.remove('dark');
      return;
    }

    // system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applySystemTheme(mediaQuery);
    mediaQuery.addEventListener('change', applySystemTheme);
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeApplier />
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
