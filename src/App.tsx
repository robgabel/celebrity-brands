import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { ExplorePage } from './pages/Explore';
import { ComparePage } from './pages/Compare';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Profile } from './pages/Profile';
import { BrandDetails } from './pages/BrandDetails';
import { AuthGuard } from './components/AuthGuard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/brands/:brandSlug" element={<BrandDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route 
          path="/profile" 
          element={
            <AuthGuard>
              <Profile />
            </AuthGuard>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;