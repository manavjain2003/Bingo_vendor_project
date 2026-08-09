import { Routes, Route } from 'react-router-dom';
import Navbar from './component/Navbar';
import Login from './pages/Login';


export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}
