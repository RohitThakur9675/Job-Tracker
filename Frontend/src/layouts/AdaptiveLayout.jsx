import { useAuth } from "../context/AuthContext";
import AppLayout from "./AppLayout";
import PublicLayout from "./PublicLayout";

// Jobs/Companies pages are browsable by anyone. This just picks which chrome
// wraps them: the full dashboard shell if logged in, the simple public
// header/footer if not — the page underneath doesn't need to know or care.
function AdaptiveLayout() {
  const { user } = useAuth();
  return user ? <AppLayout /> : <PublicLayout />;
}

export default AdaptiveLayout;
