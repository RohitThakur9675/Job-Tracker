import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

// The authenticated dashboard shell: fixed Sidebar + fixed Navbar + scrolling
// content. Used for every logged-in route (all three roles) — Sidebar/Navbar
// already read the role themselves and render the right menu.
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </>
  );
}

export default AppLayout;
