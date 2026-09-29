import "./RecentApplications.css";
import { formatDate } from "../utils/formatDate";

const statusClass = {
  Applied: "status-applied",
  Interview: "status-interview",
  Rejected: "status-rejected",
  Offer: "status-offer",
};

function RecentApplications({ applications = [], onNavigate }) {
  const recent = [...applications]
    .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
    .slice(0, 5);

  return (
    <section className="panel table-card">
      <div className="table-card-header">
        <div>
          <h2 className="card-title">Recent Applications</h2>
          <p className="card-subtitle">Your latest job applications</p>
        </div>
        <button className="card-link" onClick={() => onNavigate?.("applications")}>
          View all →
        </button>
      </div>

      <div className="table-wrap">
        <table className="app-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Status</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="apps-empty">
                  No applications yet — add your first one!
                </td>
              </tr>
            )}
            {recent.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="company-cell">
                    <div className="company-logo">{item.logo}</div>
                    <span className="company-name">{item.company}</span>
                  </div>
                </td>
                <td>{item.role}</td>
                <td>
                  <span className={`status-pill ${statusClass[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="date-cell">{formatDate(item.appliedDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default RecentApplications;
