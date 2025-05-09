import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const location = useLocation();

  return (
    <div className="view-switcher">
      <Link 
        to="/" 
        className={`switch-link ${location.pathname === '/' ? 'active' : ''}`}
      >
        Overview
      </Link>
      <Link 
        to="/detailed" 
        className={`switch-link ${location.pathname === '/detailed' ? 'active' : ''}`}
      >
        Detailed View
      </Link>
    </div>
  );
}

export default Navbar; 