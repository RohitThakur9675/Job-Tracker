import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import "./AutocompleteInput.css";

export const LOCATION_OPTIONS = [
  "Gurgaon, Haryana",
  "Gurugram, Haryana",
  "Noida, Uttar Pradesh",
  "Greater Noida, Uttar Pradesh",
  "Delhi, Delhi",
  "Bengaluru, Karnataka",
  "Hyderabad, Telangana",
  "Pune, Maharashtra",
  "Mumbai, Maharashtra",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Jaipur, Rajasthan",
  "Chandigarh, Chandigarh",
  "Ahmedabad, Gujarat",
  "Indore, Madhya Pradesh",
  "Remote, India",
];

export const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "React", "React Native", "Next.js", "HTML", "CSS", "Tailwind CSS",
  "Node.js", "Express.js", "MongoDB", "SQL", "MySQL", "PostgreSQL", "Python", "Django", "Flask",
  "Java", "Spring Boot", "C++", "C", "C#", ".NET", "PHP", "Laravel", "Flutter", "Dart",
  "AWS", "Azure", "Docker", "Kubernetes", "Git", "GitHub", "REST API", "GraphQL", "Firebase",
  "Machine Learning", "Artificial Intelligence", "Data Science", "Power BI", "Excel", "Figma", "UI/UX",
  "DevOps", "Linux", "Redis", "Jenkins", "Selenium", "Testing", "Cybersecurity",
];

export const JOB_TITLE_OPTIONS = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "React Developer",
  "JavaScript Developer", "Node.js Developer", "Java Developer", "Python Developer", "Mobile App Developer",
  "Flutter Developer", "Data Analyst", "Data Scientist", "Machine Learning Engineer", "AI Engineer",
  "DevOps Engineer", "Cloud Engineer", "QA Engineer", "Software Tester", "UI/UX Designer", "Product Designer",
  "Product Manager", "Project Manager", "Business Analyst", "Cybersecurity Analyst", "Technical Support Engineer",
];

function AutocompleteInput({ value, onChange, options, placeholder, className = "form-input", icon = null, onSelect, onEnter }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options.slice(0, 8);
    return options.filter((option) => option.toLowerCase().includes(query)).slice(0, 8);
  }, [options, value]);

  useEffect(() => {
    function handleOutside(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function select(option) {
    onChange(option);
    onSelect?.(option);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && active < 0) {
      onEnter?.(value);
      return;
    }
    if (!open || !suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      select(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="autocomplete" ref={ref}>
      {icon}
      <input
        type="text"
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <ChevronDown className="autocomplete-chevron" size={15} />
      {open && suggestions.length > 0 && (
        <div className="autocomplete-menu" role="listbox">
          {suggestions.map((option, index) => (
            <button
              key={option}
              type="button"
              className={`autocomplete-option ${index === active ? "is-active" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              role="option"
              aria-selected={value === option}
            >
              <span>{option}</span>
              {value === option && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AutocompleteInput;
