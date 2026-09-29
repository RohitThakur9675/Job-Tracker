import "./StatCard.css";
import { TrendingUp } from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, badgeClass }) {
  const isPositive = subtitle.startsWith("+");

  return (
    <div className="panel panel-padded">
      <div className="stat-card-header">
        <p className="stat-card-title">{title}</p>
        <div className={`icon-badge ${badgeClass}`} style={{ width: 40, height: 40 }}>
          <Icon size={19} />
        </div>
      </div>
      <p className="stat-card-value">{value}</p>
      <p className={`stat-card-subtitle ${isPositive ? "is-positive" : ""}`}>
        {isPositive && <TrendingUp size={12} />}
        {subtitle}
      </p>
    </div>
  );
}

export default StatCard;
