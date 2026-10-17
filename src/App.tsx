import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { AuthenticatedView } from './components/AuthenticatedView';
import { StaticBackground } from './components/layout/StaticBackground';
import { getSession } from './lib/auth';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Check existing session on load
    const active = getSession();
    setIsAuthenticated(active);
    setInitializing(false);
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF8]">
        <div className="w-8 h-8 border-4 border-forest-700/20 border-t-forest-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Permanent Static Background for Mobile and Desktop viewports */}
      <StaticBackground />

      {isAuthenticated ? (
        <AuthenticatedView onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </>
  );
};

export default App;
