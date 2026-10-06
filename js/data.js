// Replace null values with your real URLs. Resume example: 'assets/resume.pdf'.
export const profile = {
  github: 'https://github.com/aivarnit',
  linkedin: 'https://www.linkedin.com/in/anthony-varnit/',
  email: 'anthonyvarnit@proton.me',
  resume: 'assets/resume_general.pdf',
  portrait: 'assets/1747692949884.jpeg',
  portraitAlt: 'Anthony Varnit',
  portraitCaption: 'Anthony Varnit',
};

// Source: assets/resume_general.pdf. Keep dates and qualifications factual.
export const biography = {
  hero: 'Building software with a systems perspective. Computer science foundations, professional cloud and infrastructure experience, and hands-on work in robotics and local AI.',
  lead: 'I connect software development with the environments software runs in.',
  paragraphs: [
    'I earned a Bachelor of Science in Computer Science from Fordham University and progressed through three technical roles at Thrive NextGen. My systems engineering work spans cloud infrastructure, identity, networking, and incident resolution across enterprise environments.',
    'Alongside that work, I build software: a Python and OpenCV tracking application for TurtleBot3, a C++ and Qt N-Queens solver, and a self-hosted LLM inference environment with REST APIs. I’m bringing this combination of software development and practical systems experience into Software Engineering opportunities.',
  ],
};

export const education = {
  school: 'Fordham University',
  degree: 'Bachelor of Science in Computer Science',
  dates: 'Graduated May 2023',
  location: 'Bronx, NY',
};
export const career = { company: 'Thrive NextGen', dates: 'Jul 2023 – Present' };
export const experience = [
  {
    title: 'Systems Engineer', company: 'Thrive NextGen', dates: 'Mar 2026 – Present',
    description: 'Resolve escalated incidents across infrastructure, identity, applications, security, and connectivity for environments supporting thousands of enterprise users across North America, Europe, Asia, and Australia.',
    accomplishments: [
      'Administer Microsoft 365 and identity environments using Entra ID, Active Directory, Conditional Access, MFA, SSO, and Exchange Online.',
      'Troubleshoot Azure VMs, Storage Accounts, and Private Endpoints, alongside basic AWS EC2 administration and VMware vCenter operations.',
      'Perform root cause analysis and collaborate with networking, security, infrastructure, and application teams to restore business-critical services.',
    ],
    technologies: ['Azure', 'Entra ID', 'Microsoft 365', 'DNS / DHCP', 'Enterprise VPNs'],
  },
  {
    title: 'Technical Support Engineer', company: 'Thrive NextGen', dates: 'Sep 2025 – Mar 2026',
    description: 'Supported enterprise and Financial Services environments, owning time-sensitive technical incidents for traders, executives, and other business-critical users.',
    accomplishments: [
      'Troubleshot networking, infrastructure, application access, and SharePoint permissions across client environments.',
      'Supported Intune and AirWatch endpoint management, application deployments, and mobile-device issues.',
      'Created technical documentation and training covering VPN troubleshooting, RDP, VDI, Azure Virtual Desktop, Kaseya, and PowerShell workflows.',
    ],
    technologies: ['Azure Virtual Desktop', 'Citrix', 'Intune', 'AirWatch', 'PowerShell'],
  },
  {
    title: 'Associate Support Engineer', company: 'Thrive NextGen', dates: 'Jul 2023 – Sep 2025',
    description: 'Built a foundation in enterprise incident resolution, hybrid identity administration, remote connectivity, and endpoint support.',
    accomplishments: [
      'Administered account provisioning, access permissions, MFA re-registration, and onboarding/offboarding across Active Directory and Entra ID.',
      'Investigated phishing and spoofing reports and managed email security through Microsoft Defender, Mimecast, and Avanan.',
    ],
    technologies: ['ServiceNow', 'Active Directory', 'Entra ID', 'Microsoft Defender', 'Mimecast'],
  },
];

export const certifications = [
  { title: 'CompTIA A+' },
  { title: 'CompTIA Network+' },
  { title: 'ITIL 4 Foundation' },
  { title: 'Mimecast Level 1 Warrior' },
];

export const skills = [
  { category: 'Programming', technologies: ['Python', 'C++', 'C', 'Java', 'JavaScript', 'SQL'] },
  { category: 'Software / Robotics', technologies: ['REST APIs', 'OpenCV', 'Rospy / ROS', 'Qt', 'Git', 'Docker'] },
  { category: 'Cloud / Infrastructure', technologies: ['Azure VMs', 'Azure Storage', 'Private Endpoints', 'AWS EC2', 'VMware vCenter', 'Windows administration', 'Linux fundamentals', 'WSL'] },
  { category: 'Identity / Security', technologies: ['Active Directory', 'Entra ID', 'Group Policy', 'MFA / SSO', 'Conditional Access', 'Microsoft 365', 'Exchange Online', 'Google Workspace', 'Microsoft Defender', 'Mimecast', 'Avanan', 'DMARC / DKIM / SPF'] },
  { category: 'Networking / Endpoint', technologies: ['DNS', 'DHCP', 'VPN troubleshooting', 'RDP', 'VDI', 'Citrix', 'Azure Virtual Desktop', 'Intune', 'AirWatch', 'SharePoint'] },
  { category: 'Tools / Platforms', technologies: ['PowerShell', 'ServiceNow', 'Kaseya', 'Bomgar', 'Devolutions', 'GitHub', 'Hybrid Cloud Director'] },
];

// Three projects are supported by the resume; the other entries remain drafts.
// TODOs: add real screenshots, repository/demo URLs, and a Color-Track video.
// Confirm Monty Hall, Open WebUI, Docker Homelab, and any Hermes Agent details.
// Add personal reflections on challenges; no certification dates or metrics supplied.
// Media options: image / gif {type, src, alt, caption}; video {type, src,
// poster, caption}; youtube {type, videoId, title, caption}. Add multiple entries
// for a gallery. Keep external embeds on YouTube's privacy-enhanced domain.
const detailPlaceholders = {
  goal: 'Add the original problem, the intended audience, and what you wanted to learn or build.',
  implementation: 'Describe the architecture, core algorithms, integrations, and your own contribution. Confirm the suggested stack below.',
  challenges: 'Add a specific technical challenge, the alternatives you considered, and how you addressed it.',
  outcome: 'Add a verified result, current project status, and what you learned. Include measurements only when available.',
};
const makeProject = (project) => ({ ...detailPlaceholders, github: null, demo: null, draft: true, ...project });
export const projects = [
  makeProject({
    id: 'color-track', gallery: 'software', title: 'Color-Track', category: 'Robotics / Computer vision', dates: 'April 2023', draft: false,
    description: 'Real-time color-specific object tracking for a TurtleBot3 robot.',
    fullDescription: 'A Python robotics application using OpenCV and Rospy to continuously process video and autonomously track color-specific objects with a TurtleBot3.',
    goal: 'Detect and follow color-specific objects in dynamic environments.',
    implementation: 'Computer vision logic detects the target and calculates angular and linear velocity adjustments based on its position. Development and testing used Linux, ROS tooling, and command-line workflows.',
    outcome: 'Built and tested a real-time tracking application with continuous video processing and autonomous target following.',
    technologies: ['Python', 'OpenCV', 'Rospy', 'Linux', 'Git'],
    image: 'assets/color-track.svg', imageAlt: 'Concept illustration of a target-tracking interface, not a project screenshot',
    media: [{ type: 'placeholder', title: 'TurtleBot demonstration', caption: 'Add a video showing color detection, target tracking, and movement toward the object.' }],
  }),
  makeProject({
    id: 'n-queens', gallery: 'software', title: 'N-Queens Solver', category: 'Algorithms / Visualization', dates: 'October 2024', draft: false,
    description: 'A C++ backtracking solver with Qt visualization for variable board sizes.',
    fullDescription: 'A C++ application that solves the N-Queens problem with optimized backtracking and a Qt visualization layer for queen placements, search steps, and final board states.',
    goal: 'Solve the N-Queens problem across variable board sizes and make the algorithm’s behavior easier to interpret and debug.',
    implementation: 'A backtracking algorithm uses pruning to eliminate unnecessary recursive calls. A Qt interface displays queen placements and intermediate backtracking steps.',
    outcome: 'Implemented the solver and visualization layer, with pruning that improved search performance for larger problem sets.',
    technologies: ['C++', 'Qt', 'Git'], image: 'assets/n-queens.svg', imageAlt: 'Illustrative chessboard with non-attacking queens, not a project screenshot', media: [],
  }),
  makeProject({ id: 'monty-hall', gallery: 'software', title: 'Monty Hall Simulator', category: 'Simulation / Probability', description: 'Investigating the probability puzzle through simulation.', fullDescription: 'Project overview placeholder: compare staying and switching in the Monty Hall problem through repeated trials. Add the actual interface, simulation logic, and observed results.', technologies: ['Simulation stack to confirm', 'Probability'], image: 'assets/monty-hall.svg', imageAlt: 'Concept illustration of the three doors in the Monty Hall problem', media: [] }),
  makeProject({
    id: 'inference-gateway', gallery: 'infrastructure', title: 'On-Premise LLM Inference Server', category: 'Local AI / Infrastructure', dates: 'March 2026', draft: false,
    description: 'Self-hosted model inference with cross-device access and REST API integration.',
    fullDescription: 'Designed and deployed a private AI inference environment using WSL, Docker, and Ollama, with REST API endpoints for integration into custom Python applications and workflows.',
    goal: 'Provide private, low-latency access to large language models across multiple devices.',
    implementation: 'Configured container networking, ports, host bindings, and cross-device connectivity across Windows, WSL, Docker, and remote clients. Administered the Linux-based environment and troubleshot services, dependencies, and resource utilization.',
    outcome: 'Deployed a self-hosted inference environment and implemented REST API endpoints for model interaction and response handling.',
    technologies: ['Linux', 'WSL', 'Docker', 'Python', 'REST APIs', 'Ollama', 'Git'],
    image: 'assets/inference-gateway.svg', imageAlt: 'Concept diagram of a local inference environment, not a verified architecture screenshot', media: [],
  }),
  makeProject({ id: 'ai-workspace', gallery: 'infrastructure', title: 'Ollama / Open WebUI', category: 'AI / Homelab', description: 'An environment for exploring locally hosted language models.', fullDescription: 'Project overview placeholder: describe your Ollama and Open WebUI environment, model choices, deployment approach, and how you use it. Add actual hardware and configuration details.', technologies: ['Ollama', 'Open WebUI', 'Deployment to confirm'], image: 'assets/ai-workspace.svg', imageAlt: 'Concept illustration of a local model workspace, not an actual interface screenshot', media: [] }),
  makeProject({ id: 'docker-homelab', gallery: 'infrastructure', title: 'Docker Homelab', category: 'Infrastructure / Automation', description: 'A space for containerized services and systems experiments.', fullDescription: 'Project overview placeholder: describe the services in your homelab and how they are managed. Add a Hermes Agent environment here or as a separate project once its scope is documented.', technologies: ['Docker', 'Linux', 'Automation'], image: 'assets/docker-homelab.svg', imageAlt: 'Concept illustration of containerized services in a homelab', media: [] }),
];
