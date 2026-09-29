import "./Navbar.css";
import { Search, Bell, Menu, ChevronDown } from "lucide-react";

function Navbar({ onMenuClick }) {
  return (
    <header className="navbar">
      <button onClick={onMenuClick} className="navbar-menu-btn">
        <Menu size={21} />
      </button>

      <div className="navbar-search">
        <span className="navbar-search-icon">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Search applications..."
          className="navbar-search-input"
        />
      </div>

      <div className="navbar-right">
        <button className="navbar-bell-btn">
          <Bell size={19} />
          <span className="navbar-bell-dot" />
        </button>

        <div className="navbar-divider" />

        <button className="navbar-profile-btn">
          <div className="navbar-avatar">RT</div>
          <span className="navbar-username">Rohit</span>
          <span className="navbar-chevron">
            <ChevronDown size={15} />
          </span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
