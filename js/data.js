// Replace null values with your real URLs. Resume example: 'assets/resume.pdf'.
export const profile = {
  github: 'https://github.com/aivarnit',
  linkedin: 'https://www.linkedin.com/in/anthony-varnit/',
  email: 'anthonyvarnit@proton.me',
  resume: 'assets/resume_general.pdf',
  portrait: 'assets/1747692949884.jpeg',
  portraitAlt: 'Abstract portrait silhouette placeholder for Anthony Varnit',
  portraitCaption: 'Portrait placeholder',
};

// These entries show progression without inventing employers or achievements.
export const experience = [
  { title: 'Systems Engineer', company: 'Company to be added', dates: 'Dates to be added', description: 'Add a short summary of your systems engineering scope, highlighting the connection to software, infrastructure, and automation.', accomplishments: ['Add one or two verified accomplishments and their technical impact.'], technologies: ['Infrastructure', 'Cloud', 'Automation'] },
  { title: 'Technical Support Engineer', company: 'Company to be added', dates: 'Dates to be added', description: 'Describe the technical environments you supported and how your troubleshooting and engineering responsibilities grew.', accomplishments: [], technologies: ['Technical troubleshooting', 'Networking'] },
  { title: 'Associate Support Engineer', company: 'Company to be added', dates: 'Dates to be added', description: 'Add a brief summary of the foundational technical work that started your career progression.', accomplishments: [], technologies: ['Systems fundamentals', 'Enterprise platforms'] },
];

export const certifications = [
  { title: 'CompTIA A+', status: 'Details / status to be added' },
  { title: 'CompTIA Network+', status: 'Details / status to be added' },
  { title: 'ITIL 4', status: 'Details / status to be added' },
  { title: 'Mimecast', status: 'Certification title to be added' },
];

export const skills = [
  { category: 'Programming', technologies: ['Python', 'C++', 'Java', 'JavaScript / TypeScript', 'SQL'] },
  { category: 'Web / Software', technologies: ['React', 'Node.js', 'REST APIs', 'Git', 'Docker'] },
  { category: 'Cloud / Infrastructure', technologies: ['Azure', 'AWS', 'Docker', 'Linux', 'Windows Server'] },
  { category: 'Identity / Enterprise', technologies: ['Microsoft Entra ID', 'Microsoft 365', 'Google Workspace', 'Active Directory'] },
  { category: 'Networking', technologies: ['DNS', 'DHCP', 'VPNs', 'TCP/IP', 'Routing fundamentals'] },
  { category: 'Tools / Platforms', technologies: ['GitHub', 'VS Code', 'WSL', 'PowerShell', 'ServiceNow'] },
];

// Project descriptions and stacks are draft placeholders, not verified claims.
// Media options: image / gif {type, src, alt, caption}; video {type, src,
// poster, caption}; youtube {type, videoId, title, caption}. Add multiple entries
// for a gallery. Keep external embeds on YouTube's privacy-enhanced domain.
const detailPlaceholders = {
  goal: 'Add the original problem, the intended audience, and what you wanted to learn or build.',
  implementation: 'Describe the architecture, core algorithms, integrations, and your own contribution. Confirm the suggested stack below.',
  challenges: 'Add a specific technical challenge, the alternatives you considered, and how you addressed it.',
  outcome: 'Add a verified result, current project status, and what you learned. Include measurements only when available.',
};
const makeProject = (project) => ({ ...detailPlaceholders, github: null, demo: null, ...project });
export const projects = [
  makeProject({ id: 'color-track', gallery: 'software', title: 'Color-Track', category: 'Robotics / Computer vision', description: 'Exploring color detection and target tracking with a TurtleBot.', fullDescription: 'Project overview placeholder: a TurtleBot experiment focused on detecting a color target, tracking its position, and moving toward it. Add the confirmed scope and your implementation details.', technologies: ['Python', 'Computer vision', 'Robotics'], image: 'assets/color-track.svg', imageAlt: 'Concept illustration of a target-tracking interface, not a project screenshot', media: [{ type: 'placeholder', title: 'TurtleBot demonstration', caption: 'Add a video showing color detection, target tracking, and movement toward the object.' }] }),
  makeProject({ id: 'n-queens', gallery: 'software', title: 'N-Queens Solver', category: 'Algorithms', description: 'An exploration of constraints, search, and backtracking.', fullDescription: 'Project overview placeholder: explore how to place N queens on a chessboard without shared rows, columns, or diagonals. Add your actual algorithm and how solutions are presented.', technologies: ['Algorithm stack to confirm', 'Backtracking'], image: 'assets/n-queens.svg', imageAlt: 'Illustrative chessboard with non-attacking queens, not a project screenshot', media: [] }),
  makeProject({ id: 'monty-hall', gallery: 'software', title: 'Monty Hall Simulator', category: 'Simulation / Probability', description: 'Investigating the probability puzzle through simulation.', fullDescription: 'Project overview placeholder: compare staying and switching in the Monty Hall problem through repeated trials. Add the actual interface, simulation logic, and observed results.', technologies: ['Simulation stack to confirm', 'Probability'], image: 'assets/monty-hall.svg', imageAlt: 'Concept illustration of the three doors in the Monty Hall problem', media: [] }),
  makeProject({ id: 'inference-gateway', gallery: 'infrastructure', title: 'Local AI Inference Gateway', category: 'Local AI / Infrastructure', description: 'Exploring a common entry point for locally hosted inference.', fullDescription: 'Project overview placeholder: describe your local inference gateway, the services it connects, and the request flow. Document authentication, routing, and deployment only where implemented.', technologies: ['Local inference', 'APIs', 'Stack to confirm'], image: 'assets/inference-gateway.svg', imageAlt: 'Concept architecture diagram connecting clients, a gateway, and local models', media: [] }),
  makeProject({ id: 'ai-workspace', gallery: 'infrastructure', title: 'Ollama / Open WebUI', category: 'AI / Homelab', description: 'An environment for exploring locally hosted language models.', fullDescription: 'Project overview placeholder: describe your Ollama and Open WebUI environment, model choices, deployment approach, and how you use it. Add actual hardware and configuration details.', technologies: ['Ollama', 'Open WebUI', 'Deployment to confirm'], image: 'assets/ai-workspace.svg', imageAlt: 'Concept illustration of a local model workspace, not an actual interface screenshot', media: [] }),
  makeProject({ id: 'docker-homelab', gallery: 'infrastructure', title: 'Docker Homelab', category: 'Infrastructure / Automation', description: 'A space for containerized services and systems experiments.', fullDescription: 'Project overview placeholder: describe the services in your homelab and how they are managed. Add a Hermes Agent environment here or as a separate project once its scope is documented.', technologies: ['Docker', 'Linux', 'Automation'], image: 'assets/docker-homelab.svg', imageAlt: 'Concept illustration of containerized services in a homelab', media: [] }),
];
