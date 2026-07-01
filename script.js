'use strict';

// Global reference for intersection observer
let fadeObserver = null;

// Initialize observer
function initObserver() {
  fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.1 }
  );
}

// Trigger observation of dynamically loaded elements
function observeFadeIn() {
  if (!fadeObserver) initObserver();
  document.querySelectorAll('.fade-in').forEach((el) => {
    fadeObserver.observe(el);
  });
}

// Inject copyright year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Cache store and API handler for GitHub metadata
async function getRepoMetadata(repoPath) {
  const cacheKey = `github_meta_${repoPath.replace('/', '_')}`;
  const cached = localStorage.getItem(cacheKey);
  const now = Date.now();
  const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in ms

  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (now - data.timestamp < CACHE_DURATION) {
        return data.meta;
      }
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();

    // Try fetching latest release
    let releaseName = null;
    try {
      const releaseRes = await fetch(`https://api.github.com/repos/${repoPath}/releases/latest`);
      if (releaseRes.ok) {
        const releaseJson = await releaseRes.json();
        releaseName = releaseJson.tag_name || releaseJson.name;
      }
    } catch (err) {
      // Fail silently
    }

    const meta = {
      name: json.name,
      language: json.language || "Python",
      stars: json.stargazers_count,
      forks: json.forks_count,
      release: releaseName,
      updated_at: json.updated_at,
      license: json.license ? json.license.spdx_id || json.license.name : null
    };

    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: now,
      meta: meta
    }));

    return meta;
  } catch (err) {
    console.warn(`Using fallback metadata for ${repoPath}:`, err);
    if (cached) {
      try {
        return JSON.parse(cached).meta;
      } catch (e) {}
    }
    return getFallbackMetadata(repoPath);
  }
}

// Fallback data for offline use or API rate limits
function getFallbackMetadata(repoPath) {
  const fallbacks = {
    "pranavakshit/gps-cam-portal": {
      name: "gps-cam-portal",
      language: "Kotlin",
      stars: 5,
      forks: 1,
      release: "v1.0.2",
      updated_at: "2026-06-30T10:00:00Z",
      license: "MIT"
    },
    "pranavakshit/LocAi": {
      name: "LocAi",
      language: "Python",
      stars: 12,
      forks: 2,
      release: null,
      updated_at: "2026-06-29T15:00:00Z",
      license: "MIT"
    },
    "pranavakshit/offline-doc-assistant": {
      name: "offline-doc-assistant",
      language: "Python",
      stars: 18,
      forks: 4,
      release: "v1.1.0",
      updated_at: "2026-06-28T12:00:00Z",
      license: "Apache-2.0"
    },
    "ananyarana2312/navix": {
      name: "navix",
      language: "Python",
      stars: 3,
      forks: 0,
      release: null,
      updated_at: "2026-06-15T09:00:00Z",
      license: "MIT"
    },
    "pranavakshit/ssheasy": {
      name: "ssheasy",
      language: "Python",
      stars: 8,
      forks: 1,
      release: "v0.9.0",
      updated_at: "2026-06-20T08:00:00Z",
      license: "MIT"
    }
  };
  return fallbacks[repoPath] || {
    name: repoPath.split("/")[1],
    language: "Python",
    stars: 0,
    forks: 0,
    release: null,
    updated_at: new Date().toISOString(),
    license: "MIT"
  };
}

// Fetch custom projects list data
async function getProjects() {
  // Directly returns the structured PROJECTS_DATA defined below.
  // This bypasses browser CORS locks when index.html is opened directly via file://
  return PROJECTS_DATA;
}

// Helper to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Render dynamic metadata row
function createMetadataHTML(meta) {
  return `
    <div class="repo-meta">
      <span class="meta-item">
        <span class="meta-label">Lang:</span> <span class="meta-value">${meta.language}</span>
      </span>
      <span class="meta-item">
        <span class="meta-label">Stars:</span> <span class="meta-value">${meta.stars}</span>
      </span>
      <span class="meta-item">
        <span class="meta-label">Forks:</span> <span class="meta-value">${meta.forks}</span>
      </span>
      ${meta.release ? `
      <span class="meta-item">
        <span class="meta-label">Release:</span> <span class="meta-value">${meta.release}</span>
      </span>
      ` : ''}
      ${meta.license ? `
      <span class="meta-item">
        <span class="meta-label">License:</span> <span class="meta-value">${meta.license}</span>
      </span>
      ` : ''}
      <span class="meta-item">
        <span class="meta-label">Updated:</span> <span class="meta-value">${formatDate(meta.updated_at)}</span>
      </span>
    </div>
  `;
}

// Render the Projects list catalog
async function renderProjectsList() {
  const container = document.getElementById('projects-list-container');
  if (!container) return;

  const data = await getProjects();
  if (!data || !data.projects) {
    container.innerHTML = '<div class="error-placeholder">Failed to load projects database.</div>';
    return;
  }

  let html = '';
  for (let i = 0; i < data.projects.length; i++) {
    const project = data.projects[i];
    const isEven = i % 2 === 0;
    const meta = await getRepoMetadata(project.repo);
    const metaHTML = createMetadataHTML(meta);

    // Create chips
    const chipsHTML = project.technologies.map(tech => `<span class="tech-chip">${tech}</span>`).join('');
    
    // Create highlights
    const highlightsHTML = project.highlights.map(hl => `<li>${hl}</li>`).join('');

    html += `
      <div class="project-row ${isEven ? 'layout-normal' : 'layout-reverse'} fade-in">
        <div class="project-visual">
          <div class="visual-wrapper">
            ${project.diagram_svg}
          </div>
        </div>
        <div class="project-details">
          <div class="project-header-row">
            <h3 class="project-title">${project.name}</h3>
            <span class="status-badge badge-${project.status.toLowerCase().replace(/\s+/g, '-')}">${project.status}</span>
          </div>
          <p class="project-tagline">${project.tagline}</p>
          <div class="project-chips">${chipsHTML}</div>
          
          <div class="project-body">
            <h4 class="sub-h">Overview</h4>
            <p>${project.overview}</p>
            
            <h4 class="sub-h">Key Features & Highlights</h4>
            <ul class="highlights-list">${highlightsHTML}</ul>

            <h4 class="sub-h">Architecture & Integration</h4>
            <p class="arch-summary">${project.architecture_summary}</p>
          </div>

          ${metaHTML}

          <div class="project-actions">
            <a href="#/projects/${project.id}" class="btn btn-explore">Explore Case Study</a>
            <a href="https://github.com/${project.repo}" target="_blank" rel="noopener noreferrer" class="btn btn-github">
              Repository 
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
            ${project.live_demo_url ? `<a href="${project.live_demo_url}" target="_blank" rel="noopener noreferrer" class="btn btn-demo">Live Demo ↗</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Add the View More on GitHub section
  html += `
    <div class="github-view-more fade-in">
      <h3>View More on GitHub</h3>
      <p>Interested in seeing other repositories, automation scripts, and open-source contributions?</p>
      <a href="https://github.com/pranavakshit?tab=repositories" target="_blank" rel="noopener noreferrer" class="btn btn-view-more">
        View More Projects
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </a>
    </div>
  `;

  container.innerHTML = html;
  observeFadeIn();
}

// Render dynamic detailed case study page
async function renderCaseStudy(projectId) {
  const container = document.getElementById('case-study-container');
  if (!container) return;

  const data = await getProjects();
  if (!data || !data.projects) {
    container.innerHTML = '<div class="error-placeholder">Failed to load projects database.</div>';
    return;
  }

  const project = data.projects.find(p => p.id === projectId);
  if (!project) {
    container.innerHTML = `
      <div class="error-placeholder">
        <h3>Case Study Not Found</h3>
        <p>The project "${projectId}" could not be found in our database.</p>
        <a href="#/projects" class="btn">Return to Projects</a>
      </div>
    `;
    return;
  }

  const meta = await getRepoMetadata(project.repo);
  const metaHTML = createMetadataHTML(meta);
  const chipsHTML = project.technologies.map(tech => `<span class="tech-chip">${tech}</span>`).join('');
  const study = project.case_study;

  // IOCL disclosure check
  const ioclNoteHTML = project.id === 'offline-doc-assistant' 
    ? `<div class="iocl-note">Developed during Software Engineering Internship at Indian Oil Corporation Limited.</div>` 
    : '';

  // Process features list
  const featuresHTML = study.features.map(f => `<li>${f}</li>`).join('');

  // Process engineering decisions
  const decisionsHTML = study.engineering_decisions.map(dec => `
    <div class="decision-block">
      <h5>${dec.title}</h5>
      <p>${dec.description}</p>
    </div>
  `).join('');

  // Process challenges
  const challengesHTML = study.challenges.map(c => `
    <div class="challenge-block">
      <h5>${c.title}</h5>
      <p>${c.description}</p>
    </div>
  `).join('');

  // Process timeline
  const timelineHTML = study.timeline.map(t => `<li><span class="bullet"></span>${t}</li>`).join('');

  // Process roadmap
  const roadmapHTML = study.roadmap.map(r => `<li><span class="bullet"></span>${r}</li>`).join('');

  container.innerHTML = `
    <div class="case-study-layout fade-in">
      <!-- Breadcrumb -->
      <div class="case-study-nav">
        <a href="#/projects" class="back-link">← Back to Projects</a>
      </div>

      <!-- Hero Header -->
      <header class="case-study-header">
        <div class="header-main-row">
          <h1>${project.name}</h1>
          <span class="status-badge badge-${project.status.toLowerCase().replace(/\s+/g, '-')}">${project.status}</span>
        </div>
        <p class="tagline">${project.tagline}</p>
        <div class="project-chips">${chipsHTML}</div>
        ${ioclNoteHTML}
        ${metaHTML}
      </header>

      <!-- Grid layout for outline sidebar and content -->
      <div class="case-study-grid">
        <!-- Sidebar Navigation -->
        <aside class="case-study-sidebar">
          <nav class="sidebar-nav">
            <ul>
              <li><a href="#section-problem">Problem Statement</a></li>
              <li><a href="#section-motivation">Motivation</a></li>
              <li><a href="#section-architecture">System Architecture</a></li>
              <li><a href="#section-features">Key Features</a></li>
              <li><a href="#section-decisions">Engineering Decisions</a></li>
              <li><a href="#section-challenges">Challenges</a></li>
              <li><a href="#section-timeline">Timeline & Roadmap</a></li>
            </ul>
          </nav>
        </aside>

        <!-- Main Case Study Content -->
        <article class="case-study-content">
          <section id="section-problem" class="content-section">
            <h3>Problem Statement</h3>
            <p>${study.problem_statement}</p>
          </section>

          <section id="section-motivation" class="content-section">
            <h3>Motivation</h3>
            <p>${study.motivation}</p>
          </section>

          <section id="section-architecture" class="content-section">
            <h3>System Architecture</h3>
            <div class="case-study-visual">
              <div class="visual-wrapper">
                ${project.diagram_svg}
              </div>
            </div>
            <p class="visual-caption">Fig 1. Logical block architecture and network communication model.</p>
          </section>

          <section id="section-features" class="content-section">
            <h3>Key Features</h3>
            <ul class="features-list">${featuresHTML}</ul>
          </section>

          <section id="section-decisions" class="content-section">
            <h3>Engineering Decisions</h3>
            <div class="decisions-container">${decisionsHTML}</div>
          </section>

          <section id="section-challenges" class="content-section">
            <h3>Challenges Encountered</h3>
            <div class="challenges-container">${challengesHTML}</div>
          </section>

          <section id="section-timeline" class="content-section">
            <h3>Development Timeline & Roadmap</h3>
            
            <h4 class="sub-h">Completed Timeline</h4>
            <ul class="timeline-list">${timelineHTML}</ul>
            
            <h4 class="sub-h" style="margin-top: 1.5rem;">Future Roadmap</h4>
            <ul class="timeline-list roadmap-list">${roadmapHTML}</ul>
          </section>

          <div class="case-study-footer-actions">
            <a href="https://github.com/${project.repo}" target="_blank" rel="noopener noreferrer" class="btn btn-github-large">
              View Repository on GitHub
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
            ${project.live_demo_url ? `<a href="${project.live_demo_url}" target="_blank" rel="noopener noreferrer" class="btn btn-demo-large">Launch Live Demo</a>` : ''}
          </div>
        </article>
      </div>
    </div>
  `;

  // Bind side-nav highlight handler
  bindSidebarNavHighlight();
  
  observeFadeIn();
}

// Sticky sidebar navigation highlight on scroll
function bindSidebarNavHighlight() {
  const sections = document.querySelectorAll('.content-section');
  const navLinks = document.querySelectorAll('.sidebar-nav a');
  if (!sections.length || !navLinks.length) return;

  const handleScrollHighlight = () => {
    let currentId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 120) {
        currentId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  };

  window.removeEventListener('scroll', handleScrollHighlight);
  window.addEventListener('scroll', handleScrollHighlight, { passive: true });
  handleScrollHighlight(); // Run once initially
}

// Client-side Router
async function handleRoute() {
  const hash = window.location.hash || '#/';
  
  // Hide all routes by default
  const routes = document.querySelectorAll('.route-view');
  routes.forEach(view => {
    view.style.display = 'none';
  });

  // Highlight current nav links
  document.getElementById('nav-about')?.classList.remove('active-nav');
  document.getElementById('nav-projects')?.classList.remove('active-nav');

  if (hash === '#/' || hash === '#/about' || hash.startsWith('#about')) {
    // Show Home View
    const homeView = document.getElementById('view-home');
    if (homeView) homeView.style.display = 'block';
    document.getElementById('nav-about')?.classList.add('active-nav');

    // Handle scroll to #about section if targeted
    if (hash === '#/about' || hash === '#about') {
      const aboutEl = document.getElementById('about');
      if (aboutEl) {
        const offset = document.querySelector('header')?.offsetHeight ?? 0;
        window.scrollTo({
          top: aboutEl.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth'
        });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    observeFadeIn();
  } 
  else if (hash === '#/projects') {
    // Show Projects List View
    const projectsView = document.getElementById('view-projects');
    if (projectsView) projectsView.style.display = 'block';
    document.getElementById('nav-projects')?.classList.add('active-nav');
    window.scrollTo({ top: 0 });
    
    // Dynamically render the list
    await renderProjectsList();
  } 
  else if (hash.startsWith('#/projects/')) {
    // Show Case Study View
    const caseStudyView = document.getElementById('view-case-study');
    if (caseStudyView) caseStudyView.style.display = 'block';
    window.scrollTo({ top: 0 });

    const projectId = hash.replace('#/projects/', '');
    await renderCaseStudy(projectId);
  }
  else {
    // Fallback: show home
    const homeView = document.getElementById('view-home');
    if (homeView) homeView.style.display = 'block';
    window.scrollTo({ top: 0 });
    observeFadeIn();
  }
}

// Set up event listeners
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
  initObserver();
  handleRoute();
});

// ============================================================================
// DATA STORE - PROJECTS & CASE STUDIES
// Defined in-file to enable direct execution via file:// without CORS locks.
// ============================================================================
const PROJECTS_DATA = {
  "projects": [
    {
      "id": "gps-cam-portal",
      "name": "GPS Cam Portal",
      "tagline": "Enterprise platform for secure GPS-enabled media collection and offline field operations.",
      "repo": "pranavakshit/gps-cam-portal",
      "status": "Active Development",
      "technologies": ["Android", "FastAPI", "React", "MySQL", "Docker", "OCI", "Nginx"],
      "overview": "A production-grade software system designed for secure, tamper-proof geospatial media capture and synchronization. Specifically built for field researchers and operations teams working in remote environments with intermittent or non-existent cellular coverage.",
      "highlights": [
        "Offline-first synchronization via local SQLite database queueing",
        "Geospatial lock ensuring photos are captured strictly on-site with anti-spoofing logic",
        "LGD (Local Government Directory) hierarchy integration for structural data categorization"
      ],
      "architecture_summary": "Features a native Android application communicating with a containerized FastAPI backend served via Nginx and backed by a MySQL database on Oracle Cloud Infrastructure.",
      "live_demo_url": null,
      "documentation_url": null,
      "diagram_svg": "<svg viewBox='0 0 400 200' class='diagram-svg' xmlns='http://www.w3.org/2000/svg'><style>.text { font-family: monospace; font-size: 11px; fill: #888888; } .title { fill: #e8e8e8; font-weight: bold; } .box { stroke: #2a2a2a; stroke-width: 1.5; fill: #1a1a1a; } .line { stroke: #2a2a2a; stroke-width: 1.5; stroke-dasharray: 4 2; } .accent-line { stroke: #e8e8e8; stroke-width: 1.5; }</style><rect x='10' y='60' width='90' height='80' rx='4' class='box'/><text x='20' y='90' class='text title'>Android</text><text x='20' y='110' class='text'>SQLite</text><text x='20' y='125' class='text'>Offline Sync</text><rect x='150' y='60' width='100' height='80' rx='4' class='box'/><text x='160' y='90' class='text title'>FastAPI</text><text x='160' y='110' class='text'>Auth / API</text><text x='160' y='125' class='text'>OCI Node</text><rect x='300' y='60' width='90' height='80' rx='4' class='box'/><text x='310' y='90' class='text title'>MySQL</text><text x='310' y='110' class='text'>Schema</text><text x='310' y='125' class='text'>LGD Codes</text><path d='M100 100 H150' class='accent-line'/><polygon points='150,100 142,96 142,104' fill='#e8e8e8'/><path d='M250 100 H300' class='accent-line'/><polygon points='300,100 292,96 292,104' fill='#e8e8e8'/><text x='110' y='90' class='text' style='font-size: 8px;'>HTTPS</text><text x='260' y='90' class='text' style='font-size: 8px;'>TCP</text></svg>",
      "case_study": {
        "problem_statement": "Field operations regularly require field workers to collect verified media in off-grid environments. Existing apps fail to prevent GPS location spoofing or drop database integrity when connectivity is lost, leading to unreliable data reporting.",
        "motivation": "Developing a robust, tamper-proof, offline-first application that guarantees spatial accuracy and synchronizes data seamlessly to a central database without data degradation or duplicates.",
        "features": [
          "Native Android client with background synchronization worker pools",
          "Tamper-evident photo metadata hashing and hardware location attestation",
          "FastAPI high-concurrency API server handling JSON payloads and binary uploads",
          "MySQL schema structured with LGD codes supporting tree queries"
        ],
        "engineering_decisions": [
          {
            "title": "SQLite Room Database with Queueing",
            "description": "Implemented SQLite as an intermediary database on Android. Instead of immediate API requests, all operations are logged as transaction payloads in a queue. A work manager triggers synchronizations dynamically based on network state and battery optimizations, guaranteeing zero loss of data."
          },
          {
            "title": "Anti-Spoofing and Attestation",
            "description": "Mitigated GPS spoofing by analyzing cellular cell towers, Wi-Fi access points, and Android OS developer settings. Location payloads are cryptographically signed on-device with metadata validation on the server."
          }
        ],
        "challenges": [
          {
            "title": "Network Partition Merging",
            "description": "Encountered race conditions when multiple users synchronized overlapping datasets offline. Resolved by adopting conflict-free primary keys (UUIDv4) and implementing last-write-wins timestamps for entity reconciliation."
          }
        ],
        "timeline": [
          "Month 1: Prototype and Offline DB Schema Validation",
          "Month 2: Location Integrity Framework and Core API",
          "Month 3: Sync Protocol and Production Deployment"
        ],
        "roadmap": [
          "Integrate cryptographic hardware attestation keys (Keystore/SE)",
          "Enable iOS version with Swift and CoreData offline engine",
          "Develop real-time vector map caching for offline navigation in field zones"
        ]
      }
    },
    {
      "id": "locai",
      "name": "LocAi",
      "tagline": "Native desktop platform for running local AI models and developer tools completely offline.",
      "repo": "pranavakshit/LocAi",
      "status": "Active Development",
      "technologies": ["Python", "PySide6", "FastAPI", "Ollama", "ChromaDB", "LLMs"],
      "overview": "A local developer workstation system that bundles local LLM orchestration, structured RAG (Retrieval-Augmented Generation), and unified API gateways. Designed to eliminate SaaS API dependencies and protect client privacy.",
      "highlights": [
        "Integrated Ollama model runner with context management controls",
        "RAG architecture with local vector databases for document search",
        "PySide6 cross-platform GUI built with flat, unified styling"
      ],
      "architecture_summary": "Combines a Python PySide6 application with a FastAPI backend that handles Ollama model queries and ChromaDB indexing.",
      "live_demo_url": null,
      "documentation_url": null,
      "diagram_svg": "<svg viewBox='0 0 400 200' class='diagram-svg' xmlns='http://www.w3.org/2000/svg'><style>.text { font-family: monospace; font-size: 11px; fill: #888888; } .title { fill: #e8e8e8; font-weight: bold; } .box { stroke: #2a2a2a; stroke-width: 1.5; fill: #1a1a1a; } .line { stroke: #2a2a2a; stroke-width: 1.5; } .accent-line { stroke: #e8e8e8; stroke-width: 1.5; }</style><rect x='10' y='60' width='90' height='80' rx='4' class='box'/><text x='20' y='90' class='text title'>PySide6 UI</text><text x='20' y='110' class='text'>Desktop client</text><text x='20' y='125' class='text'>Local View</text><rect x='150' y='60' width='100' height='80' rx='4' class='box'/><text x='160' y='90' class='text title'>FastAPI Host</text><text x='160' y='110' class='text'>Router / RAG</text><text x='160' y='125' class='text'>ChromaDB</text><rect x='300' y='60' width='90' height='80' rx='4' class='box'/><text x='310' y='90' class='text title'>Ollama</text><text x='310' y='110' class='text'>Llama3 / Phi3</text><text x='310' y='125' class='text'>VRAM Runner</text><path d='M100 100 H150' class='accent-line'/><polygon points='150,100 142,96 142,104' fill='#e8e8e8'/><path d='M250 100 H300' class='accent-line'/><polygon points='300,100 292,96 292,104' fill='#e8e8e8'/><text x='110' y='90' class='text' style='font-size: 8px;'>IPC</text><text x='260' y='90' class='text' style='font-size: 8px;'>REST/Stream</text></svg>",
      "case_study": {
        "problem_statement": "Cloud-based AI models are expensive, require reliable network connectivity, and introduce data privacy risks for enterprises handling proprietary source code and documents.",
        "motivation": "To construct a native, high-performance desktop platform that runs advanced models locally and provides RAG capabilities without sending any byte of data to external servers.",
        "features": [
          "Offline document parsing with PDF and Markdown extraction pipelines",
          "High-performance vectorized search using ChromaDB embeddings",
          "Real-time streaming LLM response interface utilizing WebSockets",
          "Cross-platform desktop runner with optimized hardware acceleration configs"
        ],
        "engineering_decisions": [
          {
            "title": "FastAPI Core as Local Middleware",
            "description": "Decoupled the PySide6 user interface from the heavy AI processing loop by running a lightweight FastAPI server locally. The UI interacts with the API via local HTTP and WebSockets, facilitating easy updates, headless operations, and modular model replacements."
          },
          {
            "title": "ChromaDB with Local Embeddings",
            "description": "Utilized sentence-transformers embeddings directly within Python to generate vectors locally, bypassing any external APIs. Implemented FAISS indexing fallback mechanisms for low-spec developer systems."
          }
        ],
        "challenges": [
          {
            "title": "Memory Optimization on Diverse Hardware",
            "description": "Running large models on consumer workstations causes high memory pressure. Solved by building a dynamic model-unloader that monitors system VRAM usage and flushes idle models from GPU memory automatically."
          }
        ],
        "timeline": [
          "Phase 1: PySide6 UI and Ollama API binding",
          "Phase 2: Local Vector Database and Semantic Search Integration",
          "Phase 3: Native Installer Packaging and GPU Autodetection"
        ],
        "roadmap": [
          "Add structured agent workflows (LangChain/CrewAI offline equivalents)",
          "Enable native voice transcription via Whisper.cpp integration",
          "Build local coding companion plugin for editors"
        ]
      }
    },
    {
      "id": "offline-doc-assistant",
      "name": "Enterprise Document Intelligence Platform",
      "tagline": "Privacy-first offline AI system for enterprise document search and conversational intelligence.",
      "repo": "pranavakshit/offline-doc-assistant",
      "status": "Completed",
      "technologies": ["Python", "OCR", "Mistral", "FAISS", "RAG"],
      "overview": "A production-tested document ingestion and query system. Enables private semantic exploration and generative search over legacy paper records and digital catalogs. This project was developed during my Software Engineering Internship at Indian Oil Corporation Limited.",
      "highlights": [
        "Tesseract OCR pipeline optimized for structured document sheets",
        "Semantic indexing using FAISS for lightning-fast vectorized searches",
        "Highly quantized local LLMs for reliable generation on standard hardware"
      ],
      "architecture_summary": "Developed as an offline Python system merging custom OCR extraction layers, FAISS vector indexing, and local inference models.",
      "live_demo_url": null,
      "documentation_url": null,
      "diagram_svg": "<svg viewBox='0 0 400 200' class='diagram-svg' xmlns='http://www.w3.org/2000/svg'><style>.text { font-family: monospace; font-size: 11px; fill: #888888; } .title { fill: #e8e8e8; font-weight: bold; } .box { stroke: #2a2a2a; stroke-width: 1.5; fill: #1a1a1a; } .accent-line { stroke: #e8e8e8; stroke-width: 1.5; }</style><rect x='10' y='60' width='80' height='80' rx='4' class='box'/><text x='20' y='90' class='text title'>Docs/PDFs</text><text x='20' y='110' class='text'>Tesseract</text><text x='20' y='125' class='text'>OCR Layer</text><rect x='140' y='60' width='110' height='80' rx='4' class='box'/><text x='150' y='90' class='text title'>FAISS Index</text><text x='150' y='110' class='text'>Vector DB</text><text x='150' y='125' class='text'>Chunking</text><rect x='300' y='60' width='90' height='80' rx='4' class='box'/><text x='310' y='90' class='text title'>Mistral LLM</text><text x='310' y='110' class='text'>Inference</text><text x='310' y='125' class='text'>Answer</text><path d='M90 100 H140' class='accent-line'/><polygon points='140,100 132,96 132,104' fill='#e8e8e8'/><path d='M250 100 H300' class='accent-line'/><polygon points='300,100 292,96 292,104' fill='#e8e8e8'/><text x='100' y='90' class='text' style='font-size: 8px;'>Text</text><text x='260' y='90' class='text' style='font-size: 8px;'>Context</text></svg>",
      "case_study": {
        "problem_statement": "Enterprise setups handle massive collections of physical printouts, scanned sheets, and local PDFs. Processing these on public cloud systems breaks information classification guidelines, requiring a performant, isolated local search engine.",
        "motivation": "To construct an end-to-end local document query pipeline that handles dirty OCR inputs and allows users to search and converse with files securely.",
        "features": [
          "Pre-processing pipeline optimized for scanner artifacts and tables",
          "Chunking algorithm optimized for structural document headers",
          "Local FAISS semantic vector indices backed by lightweight embeddings",
          "Structured generation prompt models optimized for Mistral-7B"
        ],
        "engineering_decisions": [
          {
            "title": "Hierarchical Document Chunking",
            "description": "Regular recursive text chunking split tables and sentences mid-line, reducing context quality. Developed a structural parser that reads document outlines and splits text into logical blocks, preserving tables and section context."
          },
          {
            "title": "Quantized GGUF Model Deployment",
            "description": "Standard workstations lacked VRAM for full FP16 models. Used highly optimized 4-bit quantized (Q4_K_M) GGUF models running via llama.cpp, keeping responses fast while matching CPU parameters."
          }
        ],
        "challenges": [
          {
            "title": "Noise in Legacy Documents",
            "description": "Low-quality scans led to garbage characters in OCR. Solved by implementing a regex cleanup pipeline and using spelling correction models before vector ingestion."
          }
        ],
        "timeline": [
          "First Month: OCR validation, layout parsing, chunking algorithm implementation",
          "Second Month: FAISS vector storage setup and query search pipeline",
          "Third Month: LLM orchestration integration and enterprise UI setup"
        ],
        "roadmap": [
          "Integrate structured output validation (Pydantic models offline)",
          "Enable OCR extraction via deep learning vision models",
          "Add native support for directory-level file syncing and autoupdates"
        ]
      }
    },
    {
      "id": "navix",
      "name": "NaviX",
      "repo": "ananyarana2312/navix",
      "tagline": "Safety-aware pedestrian navigation powered by explainable routing algorithms.",
      "status": "Academic Project",
      "technologies": ["Python", "FastAPI", "PostGIS", "OpenStreetMap", "NetworkX"],
      "overview": "A prototype routing system that computes pedestrian paths by balancing safety indicators against pure distance metrics. Built for urban navigation scenarios.",
      "highlights": [
        "Safety-weighted routing algorithm using NetworkX graph models",
        "Geospatial integration with OpenStreetMap road networks",
        "Explainable routing outputs breaking down safety path indicators"
      ],
      "architecture_summary": "Combines a Python FastAPI backend parsing OpenStreetMap network metrics with custom routing weights computed via NetworkX and PostGIS.",
      "live_demo_url": null,
      "documentation_url": null,
      "diagram_svg": "<svg viewBox='0 0 400 200' class='diagram-svg' xmlns='http://www.w3.org/2000/svg'><style>.text { font-family: monospace; font-size: 11px; fill: #888888; } .title { fill: #e8e8e8; font-weight: bold; } .box { stroke: #2a2a2a; stroke-width: 1.5; fill: #1a1a1a; } .line { stroke: #2a2a2a; stroke-width: 1.5; } .accent-line { stroke: #e8e8e8; stroke-width: 1.5; }</style><rect x='10' y='60' width='80' height='80' rx='4' class='box'/><text x='20' y='90' class='text title'>OSM Data</text><text x='20' y='110' class='text'>Road Net</text><text x='20' y='125' class='text'>Import API</text><rect x='140' y='60' width='110' height='80' rx='4' class='box'/><text x='150' y='90' class='text title'>NetworkX Graph</text><text x='150' y='110' class='text'>Safety Weight</text><text x='150' y='125' class='text'>Dijkstra Mod</text><rect x='300' y='60' width='90' height='80' rx='4' class='box'/><text x='310' y='90' class='text title'>Route</text><text x='310' y='110' class='text'>Explain View</text><text x='310' y='125' class='text'>Safety Score</text><path d='M90 100 H140' class='accent-line'/><polygon points='140,100 132,96 132,104' fill='#e8e8e8'/><path d='M250 100 H300' class='accent-line'/><polygon points='300,100 292,96 292,104' fill='#e8e8e8'/><text x='100' y='90' class='text' style='font-size: 8px;'>Raw Graph</text><text x='260' y='90' class='text' style='font-size: 8px;'>Optimized</text></svg>",
      "case_study": {
        "problem_statement": "Modern map systems compute pedestrian paths using shortest-distance algorithms, ignoring factors like pedestrian crossings, crime statistics, or street lighting that influence overall walking safety.",
        "motivation": "Constructing an explainable, safety-aware navigation system that allows users to see exactly why a route was picked based on safety scoring parameters.",
        "features": [
          "OpenStreetMap parsing engine built with Python osmnx integration",
          "Dynamic routing model incorporating street light coverage and footpaths",
          "FastAPI endpoints servingGeoJSON paths for frontends",
          "Custom multi-criteria shortest path solver using modified graph traversals"
        ],
        "engineering_decisions": [
          {
            "title": "Custom Edge Weight Formulation",
            "description": "Standard Dijkstra algorithms only use edge length. Developed a custom edge scoring function that weights edges by crime indices, sidewalk availability, and road light data, computing safety-to-distance tradeoff metrics."
          },
          {
            "title": "PostGIS Spatial Joins",
            "description": "Leveraged PostGIS spatial indexes (GIST) to join external crime data layers with OpenStreetMap coordinates, accelerating route computation times."
          }
        ],
        "challenges": [
          {
            "title": "OSM Data Gaps",
            "description": "Many street regions lacked metadata on lighting or sidewalks. Addressed by building a spatial inference algorithm that estimates lighting parameters based on proximity to commercial zones and road classification."
          }
        ],
        "timeline": [
          "Phase 1: OSM data downloading, graph modeling, and route mapping",
          "Phase 2: PostGIS database setup, spatial join integrations",
          "Phase 3: API development and route explanations rendering"
        ],
        "roadmap": [
          "Enable crowdsourced safety ratings via encrypted user feeds",
          "Incorporate time-of-day dynamic safety weight updates",
          "Incorporate visual camera feedback analysis for walkability scoring"
        ]
      }
    },
    {
      "id": "ssheasy",
      "name": "SSHEasy",
      "tagline": "Desktop application simplifying SSH setup and remote server management.",
      "repo": "pranavakshit/ssheasy",
      "status": "Completed",
      "technologies": ["Python", "Paramiko", "PySide6", "SSH"],
      "overview": "A streamlined desktop tool designed to manage SSH keys, automate server connections, and execute remote server scripts without terminal friction.",
      "highlights": [
        "Automated SSH key generation and server configuration",
        "Key rotation mechanics and secure local configuration storage",
        "Cross-platform PySide6 tool designed with system design aesthetics"
      ],
      "architecture_summary": "Built as a modular PySide6 application powered by Paramiko SSH bindings for secure key configuration.",
      "live_demo_url": null,
      "documentation_url": null,
      "diagram_svg": "<svg viewBox='0 0 400 200' class='diagram-svg' xmlns='http://www.w3.org/2000/svg'><style>.text { font-family: monospace; font-size: 11px; fill: #888888; } .title { fill: #e8e8e8; font-weight: bold; } .box { stroke: #2a2a2a; stroke-width: 1.5; fill: #1a1a1a; } .line { stroke: #2a2a2a; stroke-width: 1.5; } .accent-line { stroke: #e8e8e8; stroke-width: 1.5; }</style><rect x='10' y='60' width='80' height='80' rx='4' class='box'/><text x='20' y='90' class='text title'>Local App</text><text x='20' y='110' class='text'>GUI Controller</text><text x='20' y='125' class='text'>Storage</text><rect x='140' y='60' width='110' height='80' rx='4' class='box'/><text x='150' y='90' class='text title'>Paramiko</text><text x='150' y='110' class='text'>SSH Channel</text><text x='150' y='125' class='text'>Key Exchange</text><rect x='300' y='60' width='90' height='80' rx='4' class='box'/><text x='310' y='90' class='text title'>Remote VM</text><text x='310' y='110' class='text'>Authorized Keys</text><text x='310' y='125' class='text'>Script Exec</text><path d='M90 100 H140' class='accent-line'/><polygon points='140,100 132,96 132,104' fill='#e8e8e8'/><path d='M250 100 H300' class='accent-line'/><polygon points='300,100 292,96 292,104' fill='#e8e8e8'/><text x='100' y='90' class='text' style='font-size: 8px;'>Commands</text><text x='260' y='90' class='text' style='font-size: 8px;'>Tunnel</text></svg>",
      "case_study": {
        "problem_statement": "Configuring SSH, managing multiple public/private keypairs, and handling remote configurations manually in the terminal is error-prone, occasionally locking developers out of cloud instances.",
        "motivation": "Create an elegant desktop client that handles SSH workflows, secure key storage, and remote setup automations.",
        "features": [
          "Interactive server connection manager and script library",
          "Automated local key generation and remote copying pipelines",
          "Config parser for OpenSSH compatible config files",
          "Console emulator for running remote bash scripts with status reporting"
        ],
        "engineering_decisions": [
          {
            "title": "Paramiko-backed SSH Wrapper",
            "description": "Utilized Paramiko in Python for protocol enforcement rather than calling system shell tools directly. This ensures cross-platform consistency across Linux, Windows, and macOS without requiring OpenSSH client binaries."
          },
          {
            "title": "Secure Client Credentials",
            "description": "Implemented local AES-256 encryption using passwords derived via PBKDF2 to store private key paths and passphrase configurations safely on disk."
          }
        ],
        "challenges": [
          {
            "title": "Terminal ANSI Escape Sequence Processing",
            "description": "Executing scripts on remote servers outputs terminal styling codes, breaking simple text boxes. Built a parser within the GUI text logs to translate ANSI escape sequences into styled HTML outputs."
          }
        ],
        "timeline": [
          "Week 1: PySide6 GUI prototyping and secure config schema definition",
          "Week 2: Paramiko connection tunnels and key configuration mechanics",
          "Week 3: Script runner integrations and release packaging"
        ],
        "roadmap": [
          "Add native SFTP browser with file transfer queues",
          "Implement multi-host script orchestration engine",
          "Build SSH config importer parsing direct config blocks"
        ]
      }
    }
  ]
};
