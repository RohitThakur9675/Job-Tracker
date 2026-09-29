import { useEffect, useState } from "react";
import { Search, Users as UsersIcon } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatDate";
import EmptyState from "../../components/EmptyState";

const ROLES = ["", "jobseeker", "recruiter", "admin"];

function Users() {
  const toast = useToast();
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .adminListUsers({ role, q: query })
      .then(setUsers)
      .catch((err) => toast.error(err.message || "Could not load users."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, query]);

  async function toggleActive(user) {
    try {
      const updated = await api.adminSetUserActive(user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(updated.isActive ? "Account reactivated." : "Account deactivated.");
    } catch (err) {
      toast.error(err.message || "Could not update this account.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage job seeker and recruiter accounts.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-search" style={{ maxWidth: 320 }}>
          <Search size={16} />
          <input type="text" className="form-input" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r || "all"} value={r}>
              {r ? r[0].toUpperCase() + r.slice(1) : "All roles"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-block">
          <span className="loading-spinner-sm" /> Loading users...
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" />
      ) : (
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="table-person">
                      <div className="table-avatar">{u.name?.slice(0, 1).toUpperCase()}</div>
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell-muted">{u.email}</td>
                  <td>
                    <span className="role-badge">{u.role}</span>
                  </td>
                  <td className="table-cell-muted">{formatDate(u.createdAt?.slice(0, 10))}</td>
                  <td>
                    <span className={u.isActive ? "verified-badge" : "admin-badge"}>{u.isActive ? "Active" : "Deactivated"}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {u.role !== "admin" && (
                      <button type="button" className={u.isActive ? "btn-danger btn-sm" : "btn-secondary btn-sm"} onClick={() => toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Users;
