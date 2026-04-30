import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));

  if (!token) {
    return <Login onLogin={(nextToken) => {
      localStorage.setItem('admin_token', nextToken);
      setToken(nextToken);
    }} />;
  }

  return (
    <Dashboard
      token={token}
      onLogout={() => {
        localStorage.removeItem('admin_token');
        setToken(null);
      }}
    />
  );
}
