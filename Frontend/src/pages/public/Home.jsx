import { Link } from "react-router-dom";
import { Search, Building2, CalendarCheck, ArrowRight } from "lucide-react";
import "./Home.css";

const FEATURES = [
  {
    icon: Search,
    title: "Search real openings",
    text: "Filter by skill, location, salary and work mode to find roles that actually fit.",
  },
  {
    icon: Building2,
    title: "Companies you can trust",
    text: "Recruiters build a company profile, so you know who's hiring before you apply.",
  },
  {
    icon: CalendarCheck,
    title: "Interviews in one place",
    text: "Track every application's status and join scheduled interviews with one click.",
  },
];

function Home() {
  return (
    <div>
      <section className="home-hero">
        <h1>Find your next role, or your next hire.</h1>
        <p>JobTrack connects job seekers with companies hiring right now — search, apply, and manage every step in one place.</p>
        <div className="home-hero-actions">
          <Link to="/jobs" className="btn-primary">
            Browse jobs <ArrowRight size={16} />
          </Link>
          <Link to="/register" className="btn-secondary">
            Post a job
          </Link>
        </div>
      </section>

      <section className="home-features">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="home-feature-card panel panel-padded">
            <div className="icon-badge badge-indigo" style={{ width: 42, height: 42 }}>
              <Icon size={20} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <section className="home-cta">
        <h2>Ready to get started?</h2>
        <p>Create a free account and search jobs or post your first opening in minutes.</p>
        <Link to="/register" className="btn-primary">
          Create your account
        </Link>
      </section>
    </div>
  );
}

export default Home;
