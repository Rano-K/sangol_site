import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { useAdminSession } from './hooks/useAdminSession';

export default function App() {
  const { accessToken, login, logout } = useAdminSession();

  if (!accessToken) {
    return <Login onLogin={login} />;
  }

  return <Dashboard token={accessToken} onLogout={() => void logout()} />;
}
