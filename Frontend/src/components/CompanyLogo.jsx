import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import "./CompanyLogo.css";

function initials(name = "Company") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

function faviconFor(company) {
  if (!company?.website) return "";
  try {
    const host = new URL(company.website).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

export default function CompanyLogo({ company = {}, size = 48, className = "" }) {
  const fallbackSrc = useMemo(() => faviconFor(company), [company.website]);
  const [source, setSource] = useState(company.logo || fallbackSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSource(company.logo || fallbackSrc);
    setFailed(false);
  }, [company.logo, fallbackSrc]);

  const src = source || fallbackSrc;
  const style = { width: size, height: size };

  return (
    <div className={`company-logo ${className}`} style={style} aria-label={`${company.name || "Company"} logo`}>
      {!failed && src ? (
        <img
          src={src}
          alt={company.name || "Company"}
          onError={() => {
            if (source && source !== fallbackSrc && fallbackSrc) {
              setSource(fallbackSrc);
              return;
            }
            setFailed(true);
          }}
        />
      ) : company.name ? (
        <span className="company-logo-initials">{initials(company.name)}</span>
      ) : (
        <Building2 size={Math.max(18, Math.round(size * 0.42))} />
      )}
    </div>
  );
}
