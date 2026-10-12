/* Edit this file to update the personal details and portfolio content. */
window.PORTFOLIO = {
  name: "Hrujuta Sonkusare",
  role: "Third-year student · Symbiosis Institute of Technology, Nagpur",
  shortBio: "I’m a student developer exploring how thoughtful software and data can make everyday problems easier to understand and solve.",
  location: "Nagpur, Maharashtra, India",
  email: "hruju05@gmail.com",
  universityEmail: "Hrujuta.sonkusare.batch2024@sitnagour.siu.edu.in",
  phone: "+91-9309553708",
  careerInterest: "Data Science",
  photo: "assets/images/profile-photo.jpg",
  resume: "assets/resume/resume.pdf",
  socials: [
    { label: "GitHub", url: "https://github.com/Hrujutaa" },
    { label: "LinkedIn", url: "https://linkedin.com/in/hrujuta-sonkusare" },
    { label: "LeetCode", url: "" },
    { label: "Instagram", url: "" }
  ],
  education: [
    { level: "10th grade", institution: "The Royal Gondwana Public School", years: "", board: "", score: "", note: "" },
    { level: "12th grade", institution: "St. Paul Senior Secondary School", years: "", board: "", score: "", note: "" },
    { level: "Undergraduate", institution: "Symbiosis Institute of Technology, Nagpur", years: "2024–present", board: "Symbiosis International (Deemed University)", score: "", note: "Third-year student building a foundation in computing and exploring data science." }
  ],
  academics: {
    cgpa: "",
    board10: "",
    board12: "",
    semesters: [
      { name: "Semester 1", value: null },
      { name: "Semester 2", value: null },
      { name: "Semester 3", value: null },
      { name: "Semester 4", value: null },
      { name: "Semester 5", value: null }
    ],
    subjects: [],
    bestSubjects: []
  },
  skills: [
    { name: "Python", category: "Programming", icon: "Py" },
    { name: "C", category: "Programming", icon: "C" },
    { name: "Java", category: "Programming", icon: "Ja" },
    { name: "SQL", category: "Programming", icon: "SQL" },
    { name: "HTML", category: "Web", icon: "Ht" },
    { name: "JavaScript", category: "Web", icon: "JS" },
    { name: "NumPy", category: "Libraries", icon: "Np" },
    { name: "Pandas", category: "Libraries", icon: "Pd" },
    { name: "Matplotlib", category: "Libraries", icon: "Mp" },
    { name: "OpenCV", category: "Libraries", icon: "CV" },
    { name: "MediaPipe", category: "Libraries", icon: "MP" },
    { name: "scikit-learn", category: "Libraries", icon: "Sk" },
    { name: "VS Code", category: "Tools", icon: "VS" },
    { name: "Eclipse", category: "Tools", icon: "Ec" },
    { name: "MySQL", category: "Tools", icon: "My" },
    { name: "SQL*Plus", category: "Tools", icon: "SP" },
    { name: "GitHub", category: "Tools", icon: "GH" },
    { name: "Anaconda", category: "Tools", icon: "An" }
  ],
  technicalSkills: [
    { category: "Programming Languages", items: ["Python", "C", "Java", "SQL", "HTML", "JavaScript"] },
    { category: "Libraries / Frameworks", items: ["NumPy", "Pandas", "Matplotlib", "OpenCV / cv2", "MediaPipe", "scikit-learn"] },
    { category: "Developer Tools", items: ["VS Code", "Eclipse", "MySQL", "SQL*Plus", "GitHub", "Anaconda Navigator"] },
    { category: "Domains", items: ["Machine Learning", "Computer Vision", "NLP", "Fuzzy Logic", "Blockchain basics", "Data Visualization"] }
  ],
  softSkills: [
    "Leadership",
    "Communication and liaison skills",
    "Research and problem solving",
    "Teamwork"
  ],
  currentlyLearning: ["NLP (via ContractGuard)", "Data analysis workflows", "Machine learning foundations"],
  projects: [
    {
      title: "Blockchain Patient Data Management System",
      category: "Web / Security",
      description: "Blockchain-integrated patient record system ensuring immutable, verifiable medical data storage with secure authentication and session management.",
      image: "assets/images/patient-data.svg",
      stack: ["Python", "HTML", "CSS", "SQL", "Stack Algorithm"],
      features: [
        "Secure authentication with hashed passwords and session management",
        "Immutable blockchain-backed record verification for patient data",
        "Database separation from blockchain hash verification for scalable healthcare workflows",
        "Simulated compliance-focused architecture for real-world medical systems"
      ],
      challenge: "Designing a secure patient data flow that preserved integrity without compromising scalability or realistic healthcare compliance constraints.",
      learning: "I strengthened my understanding of secure data architecture, hashing, verification workflows, and how trust models can be built into application design.",
      github: "https://github.com/Hrujutaa/Patient-data-management-",
      live: "",
      status: ""
    },
    {
      title: "Anti-Spoofing and Real-Time Interview Analysis System",
      category: "AI/ML & Computer Vision",
      description: "Real-time interview monitoring system using liveness detection, facial recognition, and behavioral analysis to detect spoof attempts and verify candidate authenticity.",
      image: "assets/images/interview-analysis.svg",
      stack: ["Python", "OpenCV", "MediaPipe"],
      features: [
        "Real-time interview monitoring with live face and movement analysis",
        "Liveness detection to reduce spoofing and impersonation attempts",
        "Facial recognition and behavioral analysis for candidate authenticity checks",
        "Automated analysis pipeline for fast verification during interviews"
      ],
      challenge: "Balancing real-time performance with robust spoof detection while keeping the monitoring pipeline reliable under live conditions.",
      learning: "This project deepened my knowledge of computer vision workflows, deployment constraints, and the trade-off between detection accuracy and processing speed.",
      github: "https://github.com/Hrujutaa/Anti-Spoofing-Real-time-interview-analysis-system",
      live: "",
      status: ""
    },
    {
      title: "ContractGuard",
      category: "AI/ML & NLP",
      description: "An NLP-based contract risk analysis system that identifies risky clauses and highlights risk areas to help users review contracts faster.",
      image: "assets/images/contractguard.svg",
      stack: ["Python", "NLP"],
      features: [
        "Contract text analysis for risk detection",
        "Clause-level highlighting to focus review efforts",
        "Support for faster contract review and prioritization",
        "Text-driven insight generation for legal and compliance workflows"
      ],
      challenge: "Turning unstructured legal language into meaningful risk signals while keeping the analysis understandable and useful for human reviewers.",
      learning: "I explored how NLP techniques can transform dense textual documents into actionable, user-friendly risk insights.",
      github: "",
      live: "",
      status: "In Progress"
    },
    {
      title: "Vehicle Health Score & Driver Safety Score",
      category: "AI/ML",
      description: "Fuzzy logic model developed during internship work to estimate vehicle health and driver safety performance using simulated data.",
      image: "assets/images/vehicle-health.svg",
      stack: ["Python", "Fuzzy Logic", "Modeling"],
      features: [
        "Fuzzy logic-based scoring framework",
        "Vehicle health assessment for operational condition analysis",
        "Driver safety evaluation using simulated performance indicators",
        "Decision-support model designed for early risk interpretation"
      ],
      challenge: "Creating an interpretable decision model that could estimate risk factors without relying on large-scale real-world data.",
      learning: "This project showed me how rule-based reasoning can be useful in data-driven problem solving, especially when working with constrained or simulated datasets.",
      github: "",
      live: "",
      status: "Internship project",
      note: "Validated on simulated data.",
      isInternship: true
    }
  ],
  certificates: [
    {
      title: "Google Advanced Data Analytics",
      issuer: "Google Career Certificates",
      category: "Professional Certificate",
      date: "Feb 25, 2026",
      credential: "https://www.coursera.org/verify/profession/al-cert/VKCGO276EK4Y",
      image: "assets/certificates/google-advanced-data-analytics.png"
    },
    {
      title: "Data Visualization Fundamentals",
      issuer: "Microsoft / Coursera",
      category: "Course Certificate",
      date: "Aug 25, 2025",
      credential: "https://www.coursera.org/verify/MVEP0XAECG2V",
      image: "assets/certificates/microsoft-data-visualization-fundamentals.png"
    },
    {
      title: "Data Analytics Job Simulation",
      issuer: "Deloitte",
      category: "Job Simulation",
      date: "February 22nd, 2026",
      credential: "https://forage.com/",
      image: "assets/certificates/deloitte-data-analytics-job-simulation.png"
    },
    {
      title: "Course Completion Certificate",
      issuer: "Infosys Springboard",
      category: "Technology Training",
      date: "October 13, 2025",
      credential: "https://verify.onwingspan.com/",
      image: "assets/certificates/infosys-course-completion.png"
    },
    {
      title: "Network Automation with Red Hat Ansible Automation Platform",
      issuer: "Red Hat",
      category: "Attendance Certificate",
      date: "September 18, 2026",
      credential: "https://www.redhat.com/en/services/training",
      image: "assets/certificates/redhat-network-automation.png"
    },
    {
      title: "Python Programming with Red Hat (AD141 - RHA) - Ver. 9.0",
      issuer: "Red Hat",
      category: "Attendance Certificate",
      date: "March 24, 2025",
      credential: "https://www.redhat.com/en/services/training",
      image: "assets/certificates/redhat-python-programming.png"
    },
    {
      title: "Mastering Agentic AI: From Prompt to Protocols to Production",
      issuer: "Udemy",
      category: "Completion",
      date: "Aug. 24, 2026",
      credential: "https://www.udemy.com/certificate/UC-582c23cb-ea47-4a5a-a5d7-d236d66a9e8d/",
      image: "assets/certificates/udemy-agentic-ai.png"
    }
  ],
  contributions: [
    { role: "Student Placement Representative", organization: "Placement Cell · Symbiosis Institute of Technology, Nagpur", date: "", description: "Supporting communication between students and the placement cell.", image: "assets/images/student-placement-representative.jpe" },
    { role: "Volunteer", organization: "CII Vidharba Zone · Industry Academia Conclave 3.0", date: "", description: "Volunteered at the CII Vidharba Zone, Industry Academia Conclave 3.0 at Symbiosis Institute of Technology, Nagpur.", image: "assets/images/cii-volunteer-event.jpe" }
  ],
  gallery: [
    { title: "Campus moment", category: "Campus", image: "assets/gallery/gallery-1.jpe", alt: "Campus photograph" },
    { title: "Learning milestone", category: "Learning", image: "assets/gallery/gallery-2.jpe", alt: "Learning event photograph" },
    { title: "Team moment", category: "Events", image: "assets/gallery/gallery-3.jpe", alt: "Team photograph" },
    { title: "Recognition moment", category: "Events", image: "assets/gallery/gallery-4.jpe", alt: "Recognition event photograph" },
    { title: "Event memory", category: "Events", image: "assets/gallery/gallery-5.jpe", alt: "Event memory photograph" }
  ],
  interests: ["Data Science", "Data Analytics", "Machine Learning", "Software Development"],
  preferredRoles: ["Data science intern", "Data analyst intern", "Software development intern"],
  internships: [
    {
      role: "Lead Software Intern",
      organization: "Kalika Technologies",
      period: "20 May 2026 – 20 Jun 2026",
      description: "Led software work on a CAN-based vehicle telematics platform for the Government Vehicle Tracking and Fuel Management System (GVTFMS), a problem statement led by Government of Chandrapur.",
      highlights: [
        "Led software work on a CAN-based vehicle telematics platform for the Government Vehicle Tracking and Fuel Management System (GVTFMS), a problem statement led by Government of Chandrapur.",
        "Conducted machine learning research to evaluate suitable approaches for computing a Vehicle Health Score and a Driver Safety Score.",
        "Implemented a fuzzy logic scoring model suited to imprecise, rule-driven vehicle and driving parameters.",
        "Validated the model on simulated telematics data because the product was in its build phase and real fleet data was not yet available."
      ],
      certificate: {
        image: "assets/certificates/kalika-technologies-internship.png",
        title: "Internship Completion Certificate",
        issuer: "Kalika Technologies",
        date: "20 July 2026"
      }
    }
  ]
};
