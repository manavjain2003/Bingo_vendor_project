import { Routes, Route } from 'react-router-dom';
import Navbar from './component/Navbar';
import Login from './pages/Login';
import Signup from './pages/SignUp';


export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </div>
  );
}