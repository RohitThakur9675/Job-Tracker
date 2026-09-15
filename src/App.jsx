import { useState } from "react";
import { JobsProvider } from "./context/JobsContext";

import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Interviews from "./pages/Interviews";
import Companies from "./pages/Companies";
import Analytics from "./pages/Analytics";

const pages = {
  dashboard: Dashboard,
  applications: Applications,
  interviews: Interviews,
  companies: Companies,
  analytics: Analytics,
};

function App() {
  const [page, setPage] = useState("dashboard");
  const Page = pages[page] || Dashboard;

  return (
    <JobsProvider>
      <Page activePage={page} onNavigate={setPage} />
    </JobsProvider>
  );
}

export default App;
