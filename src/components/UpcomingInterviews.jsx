import "./UpcomingInterviews.css";
import { CalendarDays, Clock, Video, ArrowRight } from "lucide-react";

const interviews = [
  { company: "Google", role: "Software Engineer Intern", date: "Tomorrow", time: "10:30 AM", logo: "G", badgeClass: "badge-blue" },
  { company: "Microsoft", role: "Frontend Developer", date: "Sep 14", time: "2:00 PM", logo: "M", badgeClass: "badge-cyan" },
  { company: "Razorpay", role: "SDE - 1", date: "Sep 16", time: "11:00 AM", logo: "R", badgeClass: "badge-purple" },
];

function UpcomingInterviews() {
  return (
    <div className="panel panel-padded-lg">
      <div className="card-header">
        <div>
          <h2 className="card-title">Upcoming Interviews</h2>
          <p className="card-subtitle">Your next scheduled interviews</p>
        </div>
        <button className="card-link">View all</button>
      </div>

      <div className="interview-list">
        {interviews.map((item) => (
          <div key={item.company} className="interview-row">
            <div className="interview-row-inner">
              <div className={`icon-badge ${item.badgeClass}`} style={{ width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
                {item.logo}
              </div>
              <div className="interview-info">
                <p className="interview-company">{item.company}</p>
                <p className="interview-role">{item.role}</p>
                <div className="interview-meta">
                  <span className="interview-meta-item"><CalendarDays size={12} />{item.date}</span>
                  <span className="interview-meta-item"><Clock size={12} />{item.time}</span>
                  <span className="interview-meta-item"><Video size={12} />Online</span>
                </div>
              </div>
              <button className="interview-arrow">
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpcomingInterviews;
