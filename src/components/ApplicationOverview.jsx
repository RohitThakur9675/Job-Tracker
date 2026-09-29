import "./ApplicationOverview.css";

function ApplicationOverview({ applications = [] }) {
  const counts = {
    Applied: applications.filter((a) => a.status === "Applied").length,
    Interview: applications.filter((a) => a.status === "Interview").length,
    Offer: applications.filter((a) => a.status === "Offer").length,
    Rejected: applications.filter((a) => a.status === "Rejected").length,
  };

  return (
    <div className="panel panel-padded-lg">
      <div className="card-header">
        <div>
          <h2 className="card-title">Application Overview</h2>
          <p className="card-subtitle">Status breakdown of your applications</p>
        </div>
      </div>

      <div className="chart-wrap">
        <svg viewBox="0 0 700 210" preserveAspectRatio="none">
          <line x1="0" y1="15" x2="700" y2="15" stroke="#eef0f4" />
          <line x1="0" y1="65" x2="700" y2="65" stroke="#eef0f4" />
          <line x1="0" y1="115" x2="700" y2="115" stroke="#eef0f4" />
          <line x1="0" y1="165" x2="700" y2="165" stroke="#eef0f4" />

          <path
            d="M0 160 C60 150 95 175 140 163 C185 151 210 103 255 113 C300 123 320 85 365 93 C410 101 430 135 470 123 C510 111 535 63 580 55 C620 48 660 25 700 15 L700 210 L0 210 Z"
            fill="#6366f1"
            fillOpacity="0.08"
          />
          <path
            d="M0 160 C60 150 95 175 140 163 C185 151 210 103 255 113 C300 123 320 85 365 93 C410 101 430 135 470 123 C510 111 535 63 580 55 C620 48 660 25 700 15"
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="365" cy="93" r="5" fill="white" stroke="#6366f1" strokeWidth="3" />
        </svg>
      </div>

      <div className="chart-legend">
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#6366f1" }} />
          <div>
            <p className="chart-legend-value">{counts.Applied}</p>
            <p className="chart-legend-label">Applied</p>
          </div>
        </div>
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#c084fc" }} />
          <div>
            <p className="chart-legend-value">{counts.Interview}</p>
            <p className="chart-legend-label">Interviews</p>
          </div>
        </div>
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#34d399" }} />
          <div>
            <p className="chart-legend-value">{counts.Offer}</p>
            <p className="chart-legend-label">Offers</p>
          </div>
        </div>
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#f87171" }} />
          <div>
            <p className="chart-legend-value">{counts.Rejected}</p>
            <p className="chart-legend-label">Rejected</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicationOverview;
