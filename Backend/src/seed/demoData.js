import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { Job } from "../models/Job.js";

// Demo catalog: real company names/domains, but the vacancies created by this script
// are clearly marked as JobTrack demo listings. They are not claimed to be live jobs
// published by those companies.
const COMPANIES = [
  ["Microsoft", "https://www.microsoft.com", "Software / Cloud", "Hyderabad, Telangana, India"],
  ["Google", "https://www.google.com", "Internet / Technology", "Bengaluru, Karnataka, India"],
  ["Amazon", "https://www.amazon.com", "E-commerce / Cloud", "Bengaluru, Karnataka, India"],
  ["Meta", "https://about.meta.com", "Internet / Technology", "Hyderabad, Telangana, India"],
  ["Apple", "https://www.apple.com", "Consumer Technology", "Bengaluru, Karnataka, India"],
  ["Netflix", "https://www.netflix.com", "Media / Streaming", "Mumbai, Maharashtra, India"],
  ["Adobe", "https://www.adobe.com", "Software", "Noida, Uttar Pradesh, India"],
  ["Salesforce", "https://www.salesforce.com", "Enterprise Software / Cloud", "Hyderabad, Telangana, India"],
  ["Oracle", "https://www.oracle.com", "Enterprise Software / Cloud", "Bengaluru, Karnataka, India"],
  ["IBM", "https://www.ibm.com", "IT Services / Cloud", "Bengaluru, Karnataka, India"],
  ["Infosys", "https://www.infosys.com", "IT Services", "Bengaluru, Karnataka, India"],
  ["TCS", "https://www.tcs.com", "IT Services", "Mumbai, Maharashtra, India"],
  ["Wipro", "https://www.wipro.com", "IT Services", "Bengaluru, Karnataka, India"],
  ["HCLTech", "https://www.hcltech.com", "IT Services", "Noida, Uttar Pradesh, India"],
  ["Tech Mahindra", "https://www.techmahindra.com", "IT Services", "Pune, Maharashtra, India"],
  ["Accenture", "https://www.accenture.com", "Consulting / Technology", "Bengaluru, Karnataka, India"],
  ["Capgemini", "https://www.capgemini.com", "Consulting / Technology", "Bengaluru, Karnataka, India"],
  ["Cognizant", "https://www.cognizant.com", "IT Services", "Chennai, Tamil Nadu, India"],
  ["Deloitte", "https://www.deloitte.com", "Consulting / Professional Services", "Bengaluru, Karnataka, India"],
  ["EY", "https://www.ey.com", "Professional Services", "Bengaluru, Karnataka, India"],
  ["KPMG", "https://kpmg.com", "Professional Services", "Gurugram, Haryana, India"],
  ["PwC", "https://www.pwc.com", "Professional Services", "Bengaluru, Karnataka, India"],
  ["SAP", "https://www.sap.com", "Enterprise Software", "Bengaluru, Karnataka, India"],
  ["Cisco", "https://www.cisco.com", "Networking / Technology", "Bengaluru, Karnataka, India"],
  ["Intel", "https://www.intel.com", "Semiconductors", "Bengaluru, Karnataka, India"],
  ["NVIDIA", "https://www.nvidia.com", "Semiconductors / AI", "Bengaluru, Karnataka, India"],
  ["Qualcomm", "https://www.qualcomm.com", "Semiconductors / Wireless", "Hyderabad, Telangana, India"],
  ["Uber", "https://www.uber.com", "Mobility / Technology", "Bengaluru, Karnataka, India"],
  ["Ola", "https://www.olacabs.com", "Mobility / Technology", "Bengaluru, Karnataka, India"],
  ["Swiggy", "https://www.swiggy.com", "Food Tech / Delivery", "Bengaluru, Karnataka, India"],
  ["Zomato", "https://www.zomato.com", "Food Tech / Delivery", "Gurugram, Haryana, India"],
  ["PhonePe", "https://www.phonepe.com", "Fintech", "Bengaluru, Karnataka, India"],
  ["Razorpay", "https://razorpay.com", "Fintech", "Bengaluru, Karnataka, India"],
  ["Paytm", "https://paytm.com", "Fintech", "Noida, Uttar Pradesh, India"],
  ["Flipkart", "https://www.flipkart.com", "E-commerce", "Bengaluru, Karnataka, India"],
  ["Meesho", "https://www.meesho.com", "E-commerce", "Bengaluru, Karnataka, India"],
  ["Myntra", "https://www.myntra.com", "E-commerce / Fashion", "Bengaluru, Karnataka, India"],
  ["Freshworks", "https://www.freshworks.com", "SaaS", "Chennai, Tamil Nadu, India"],
  ["Zoho", "https://www.zoho.com", "SaaS", "Chennai, Tamil Nadu, India"],
  ["Postman", "https://www.postman.com", "Developer Tools / SaaS", "Bengaluru, Karnataka, India"],
  ["Atlassian", "https://www.atlassian.com", "Software / Developer Tools", "Bengaluru, Karnataka, India"],
  ["ServiceNow", "https://www.servicenow.com", "Enterprise Software / Cloud", "Hyderabad, Telangana, India"],
  ["BrowserStack", "https://www.browserstack.com", "Developer Tools / SaaS", "Mumbai, Maharashtra, India"],
  ["CRED", "https://cred.club", "Fintech", "Bengaluru, Karnataka, India"],
  ["Groww", "https://groww.in", "Fintech / Investing", "Bengaluru, Karnataka, India"],
  ["Zerodha", "https://zerodha.com", "Fintech / Brokerage", "Bengaluru, Karnataka, India"],
  ["Dream11", "https://www.dream11.com", "Gaming / Sports Tech", "Mumbai, Maharashtra, India"],
  ["MakeMyTrip", "https://www.makemytrip.com", "Travel Tech", "Gurugram, Haryana, India"],
  ["Walmart", "https://www.walmart.com", "Retail / Technology", "Bengaluru, Karnataka, India"],
  ["JPMorgan Chase", "https://www.jpmorganchase.com", "Banking / Technology", "Mumbai, Maharashtra, India"],
];

const TITLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Software Engineer — AI/ML",
  "Product Analyst",
  "Cloud Engineer",
];
const SKILLS = ["JavaScript", "React", "Node.js", "Python", "SQL", "MongoDB", "Git", "REST APIs"];

function logoUrl(website) {
  const host = new URL(website).hostname.replace(/^www\./, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

async function getOrCreateDemoUser({ email, name, role, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  let user = await User.findOne({ email }).select("+passwordHash");
  if (!user) user = await User.create({ name, email, passwordHash, role });
  return user;
}

export async function ensureDemoCatalog() {
  const demoAdmin = await getOrCreateDemoUser({
    email: (process.env.DEMO_ADMIN_EMAIL || "demo-admin@jobtrack.local").toLowerCase(),
    name: "JobTrack Demo Admin",
    role: "admin",
    password: process.env.DEMO_ADMIN_PASSWORD || "JobTrackDemo!2026",
  });
  const demoRecruiter = await getOrCreateDemoUser({
    email: (process.env.DEMO_RECRUITER_EMAIL || "demo-recruiter@jobtrack.local").toLowerCase(),
    name: "JobTrack Demo Recruiter",
    role: "recruiter",
    password: process.env.DEMO_RECRUITER_PASSWORD || "JobTrackDemo!2026",
  });

  let createdCompanies = 0;
  let createdJobs = 0;

  for (let i = 0; i < COMPANIES.length; i += 1) {
    const [name, website, industry, location] = COMPANIES[i];
    const company = await Company.findOneAndUpdate(
      { name },
      {
        $set: {
          website,
          logo: logoUrl(website),
          industry,
          location,
          isVerified: true,
          addedByAdmin: true,
        },
        $setOnInsert: {
          recruiter: null,
          description: `${name} company profile is part of the JobTrack demo catalog.`,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (company.createdAt && company.createdAt.getTime() === company.updatedAt.getTime()) createdCompanies += 1;

    const title = TITLES[i % TITLES.length];
    const existing = await Job.findOne({
      company: company._id,
      $or: [{ isDemo: true }, { title: /\(Demo Listing\)$/ }],
    });
    if (existing) {
      existing.isDemo = true;
      existing.isAdminPosted = false;
      existing.postedBy = demoRecruiter._id;
      existing.title = `${title} — ${name}`;
      existing.status = "Active";
      existing.applicationType = "Internal";
      await existing.save();
    } else {
      await Job.create({
        company: company._id,
        // Demo jobs belong to a real recruiter account so the complete
        // apply -> shortlist -> interview flow can be tested end-to-end.
        postedBy: demoRecruiter._id,
        title: `${title} — ${name}`,
        description: `JobTrack demo listing for ${name}. This sample opening exists so you can test searching, applying, recruiter review, shortlisting and interview scheduling. It is not a live vacancy published by ${name}.`,
        requiredSkills: SKILLS.slice(i % 4, (i % 4) + 4),
        salaryMin: 500000 + (i % 5) * 100000,
        salaryMax: 1000000 + (i % 5) * 150000,
        location,
        workMode: i % 3 === 0 ? "Remote" : i % 3 === 1 ? "Hybrid" : "On-site",
        employmentType: i % 7 === 0 ? "Internship" : "Full-time",
        experienceMin: i % 4,
        experienceMax: Math.max(1, (i % 4) + 2),
        openings: 2 + (i % 8),
        status: "Active",
        applicationType: "Internal",
        isAdminPosted: false,
        isDemo: true,
      });
      createdJobs += 1;
    }
  }

  return {
    companies: COMPANIES.length,
    createdCompanies,
    createdJobs,
    demoAdminEmail: demoAdmin.email,
    demoRecruiterEmail: demoRecruiter.email,
  };
}

async function main() {
  await mongoose.connect(config.mongoUri);
  const result = await ensureDemoCatalog();
  console.log(`JobTrack demo catalog ready: ${result.companies} companies, ${result.createdJobs} new demo jobs.`);
  console.log(`Demo recruiter: ${result.demoRecruiterEmail}`);
  console.log("Demo password: use DEMO_RECRUITER_PASSWORD or the local default documented in README.");
  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].endsWith("demoData.js")) {
  main().catch(async (error) => {
    console.error("Demo seed failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
