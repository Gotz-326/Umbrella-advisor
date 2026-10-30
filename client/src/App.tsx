import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/mainPage';
import AdminLayout from './layouts/adminLayout';
import { AdminUserPage, AdminSettingPage} from './pages/adminDashboard';
import Login from './pages/login';
import SignUp from './pages/signup';
import './App.css';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUserPage />} />
          <Route path="settings" element={<AdminSettingPage />} />
          </Route>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
