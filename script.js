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
      } catch (e) { }
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
            <a href="/case-study?id=${project.id}" class="btn btn-explore">Explore Case Study</a>
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
        <a href="/projects" class="btn">Return to Projects</a>
      </div>
    `;
    return;
  }

  // metaHTML handled below
  const study = project.case_study;
  const chipsHTML = project.technologies.map(t => `<span class="chip">${t}</span>`).join('');

  let ioclNoteHTML = '';
  if (projectId === 'offline-doc-assistant') {
    ioclNoteHTML = `
      <div style="margin-top:1.5rem; padding:1rem; border-left:3px solid var(--accent); background:rgba(255,255,255,0.02); color:var(--muted); font-size:0.9rem;">
        <strong>Note:</strong> Developed during Software Engineering Internship at Indian Oil Corporation Limited.
      </div>
    `;
  }

  let metaHTML = '';
  if (project.repo) {
    try {
      const meta = await getRepoMetadata(project.repo);
      metaHTML = `
        <div class="project-github-meta" style="margin-top:1.5rem; display:flex; gap:1rem; flex-wrap:wrap; font-size:0.85rem; color:var(--muted);">
          ${meta.language ? `<span>Lang: <strong style="color:var(--text);">${meta.language}</strong></span>` : ''}
          <span>Stars: <strong style="color:var(--text);">${meta.stars}</strong></span>
          <span>Forks: <strong style="color:var(--text);">${meta.forks}</strong></span>
          ${meta.release ? `<span>Release: <strong style="color:var(--text);">${meta.release}</strong></span>` : ''}
          ${meta.license ? `<span>License: <strong style="color:var(--text);">${meta.license}</strong></span>` : ''}
          ${meta.updated_at ? `<span>Updated: <strong style="color:var(--text);">${new Date(meta.updated_at).toLocaleDateString()}</strong></span>` : ''}
        </div>
      `;
    } catch (e) {
      console.error(e);
    }
  }

  let diagramSvg = '';
  if (project.repo) {
    let branch = 'main';
    if (projectId === 'locai') branch = 'alpha';
    if (projectId === 'ssheasy') branch = 'master';
    let files = ['architecture.puml'];
    if (projectId === 'gps-cam-portal') {
      files = ['architecture.puml', 'web_architecture.puml', 'android_architecture.puml'];
    }
    
    try {
      for (const file of files) {
        const pumlUrl = `https://raw.githubusercontent.com/${project.repo}/${branch}/${file}`;
        const res = await fetch(pumlUrl);
        if (res.ok) {
          let pumlText = await res.text();
          if (typeof plantumlEncoder !== 'undefined') {
            const encoded = plantumlEncoder.encode(pumlText);
            const imgUrl = `https://www.plantuml.com/plantuml/dsvg/${encoded}`;
            let titleHTML = '';
            if (files.length > 1) {
              const friendlyName = file.replace('.puml', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              titleHTML = `<h4 style="color: var(--text); margin-top: 1.5rem; margin-bottom: 0.5rem; font-size: 1rem;">${friendlyName}</h4>`;
            }
            diagramSvg += `
              ${titleHTML}
              <div class="diagram-container" style="margin-bottom: 1.5rem;">
                <img src="${imgUrl}" alt="${project.name} ${file} Diagram" style="width: 100%; height: auto; display: block; border-radius: 4px;" onclick="openLightbox('${imgUrl}')" />
                <a href="${imgUrl}" target="_blank" rel="noopener noreferrer" class="open-new-tab-btn" title="Open in new tab">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <span>Open in new tab</span>
                </a>
              </div>
            `;
          } else {
            diagramSvg += `<p style="color: var(--muted); text-align: center; font-style: italic;">PlantUML Encoder not loaded.</p>`;
          }
        }
      }
      
      if (!diagramSvg) {
        diagramSvg = `<p style="color: var(--muted); text-align: center; font-style: italic;">Architecture diagram not found or unavailable.</p>`;
      }
    } catch (err) {
      diagramSvg = `<p style="color: var(--muted); text-align: center; font-style: italic;">Failed to load architecture diagrams.</p>`;
    }
  }
  project.diagram_svg = diagramSvg;

  const featuresHTML = study.features.map(f => `<li style="margin-bottom:0.5rem;"><span style="color:var(--muted);margin-right:0.5rem;">•</span>${f}</li>`).join('');
  const decisionsHTML = study.engineering_decisions.map(d => `
    <div style="margin-bottom:1.5rem; padding:1.5rem; background:var(--bg-raised); border:1px solid var(--border); border-radius:4px;">
      <h4 style="margin-bottom:0.5rem; color:var(--text); font-size:1.05rem;">${d.title}</h4>
      <p style="color:var(--muted); font-size:0.95rem; line-height:1.6;">${d.description}</p>
    </div>
  `).join('');

  const challengesHTML = study.challenges.map(c => `
    <div style="margin-bottom:1.5rem;">
      <h5 style="color:var(--text); margin-bottom:0.25rem;">${c.title}</h5>
      <p style="color:var(--muted); font-size:0.95rem; line-height:1.6;">${c.description}</p>
    </div>
  `).join('');

  let timelineHTML = '';
  if (study.timeline && study.timeline.length > 0) {
    timelineHTML = study.timeline.map(t => `<li style="margin-bottom:0.5rem;"><span style="color:var(--muted);margin-right:0.5rem;">•</span>${t}</li>`).join('');
  }

  const roadmapHTML = study.roadmap.map(r => `<li style="margin-bottom:0.5rem;"><span style="color:var(--muted);margin-right:0.5rem;">•</span>${r}</li>`).join('');

  container.innerHTML = `
    <div style="display: flex; flex-direction: row; gap: 4rem; width: 100%; max-width: 1400px; margin: 0 auto; padding: 6rem 2rem 5rem 2rem; align-items: flex-start;">
        
        <!-- Sidebar Navigation (Left Column) -->
        <div style="width: 250px; flex-shrink: 0; position: sticky; top: 100px;">
          <div style="margin-bottom: 2rem;">
            <a href="/projects" style="color: var(--muted); text-decoration: none; font-size: 0.9rem;">&larr; Back to Projects</a>
          </div>
          <div class="sidebar-nav">
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 1rem;">
              <li><a href="#section-problem" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">Problem Statement</a></li>
              <li><a href="#section-motivation" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">Motivation</a></li>
              <li><a href="#section-architecture" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">System Architecture</a></li>
              <li><a href="#section-features" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">Key Features</a></li>
              <li><a href="#section-decisions" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">Engineering Decisions</a></li>
              <li><a href="#section-challenges" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">Challenges & Learnings</a></li>
              <li><a href="#section-timeline" style="color: var(--text); text-decoration: none; font-size: 0.9rem;">Timeline & Roadmap</a></li>
            </ul>
          </div>
        </div>

        <!-- Main Case Study Content (Right Column) -->
        <div style="flex-grow: 1; min-width: 0; max-width: 900px;">
          <!-- Hero Header -->
          <div style="border-bottom: 1px solid var(--border); padding-bottom: 2rem; margin-bottom: 3rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h1 style="font-size: 2.5rem; font-weight: 500; margin: 0; color: var(--text);">${project.name}</h1>
              <span style="font-size: 0.8rem; padding: 0.3rem 0.8rem; border-radius: 40px; border: 1px solid var(--border);">${project.status}</span>
            </div>
            <p style="font-size: 1.15rem; color: var(--muted); line-height: 1.6; margin-bottom: 1.5rem;">${project.tagline}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
              ${chipsHTML}
            </div>
            ${ioclNoteHTML}
            ${metaHTML}
          </div>

          <div>
            <div id="section-problem" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">Problem Statement</h3>
              <p style="color: var(--muted); line-height: 1.7;">${study.problem_statement}</p>
            </div>

            <div id="section-motivation" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">Motivation</h3>
              <p style="color: var(--muted); line-height: 1.7;">${study.motivation}</p>
            </div>

            <div id="section-architecture" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">System Architecture</h3>
              <div style="margin-bottom: 1rem; padding: 2rem; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 4px;">
                ${project.diagram_svg || ''}
              </div>
            </div>

            <div id="section-features" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">Key Features</h3>
              <ul style="list-style: none; padding: 0;">${featuresHTML}</ul>
            </div>

            <div id="section-decisions" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">Engineering Decisions</h3>
              <div>${decisionsHTML}</div>
            </div>

            <div id="section-challenges" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">Challenges & Learnings</h3>
              ${challengesHTML}
            </div>

            <div id="section-timeline" class="content-section" style="margin-bottom: 4rem;">
              <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text);">Timeline & Roadmap</h3>
              ${timelineHTML ? `<h4 style="margin-bottom: 1rem; color: var(--text);">Completed Timeline</h4><ul style="list-style: none; padding: 0; margin-bottom: 2rem;">${timelineHTML}</ul>` : ''}
              <h4 style="margin-bottom: 1rem; color: var(--text);">Future Roadmap</h4>
              <ul style="list-style: none; padding: 0;">${roadmapHTML}</ul>
            </div>
          </div>

          <div style="margin-top: 5rem; padding-top: 2rem; border-top: 1px solid var(--border); display: flex; gap: 1rem;">
            <a href="https://github.com/${project.repo}" target="_blank" rel="noopener noreferrer" style="padding: 0.75rem 1.5rem; border: 1px solid var(--border); color: var(--text); text-decoration: none; border-radius: 4px;">View Repository on GitHub</a>
            ${project.live_demo_url ? `<a href="${project.live_demo_url}" target="_blank" rel="noopener noreferrer" style="padding: 0.75rem 1.5rem; background: var(--text); color: var(--bg); text-decoration: none; border-radius: 4px;">Launch Live Demo</a>` : ''}
          </div>
        </div>
    </div>
  `;

  document.querySelectorAll('.sidebar-nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });

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

// Simple Router Initialization
async function initPage() {
  const path = window.location.pathname;

  // Highlight current nav links
  document.getElementById('nav-about')?.classList.remove('active-nav');
  document.getElementById('nav-projects')?.classList.remove('active-nav');

  if (path === '/' || path.includes('index')) {
    document.getElementById('nav-about')?.classList.add('active-nav');
    observeFadeIn();
  }
  else if (path.includes('projects')) {
    document.getElementById('nav-projects')?.classList.add('active-nav');
    await renderProjectsList();
  }
  else if (path.includes('case-study')) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    if (projectId) {
      await renderCaseStudy(projectId);
    } else {
      const container = document.getElementById('case-study-container');
      if (container) container.innerHTML = '<div class="error-placeholder">No project ID provided in URL.</div>';
    }
  }
}

// Set up event listeners
window.addEventListener('DOMContentLoaded', () => {
  initObserver();
  initPage();
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
      "status": "Completed",
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
      "name": "Offline AI-Powered Document Assistant",
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

function openLightbox(url) {
  let overlay = document.getElementById('diagram-lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'diagram-lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lightbox-close" onclick="closeLightbox()">&times;</div>
      <img src="" id="lightbox-img" class="lightbox-content" />
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeLightbox();
      }
    });
  }
  document.getElementById('lightbox-img').src = url;
  // Use timeout to allow CSS transition to play
  setTimeout(() => {
    overlay.classList.add('active');
  }, 10);
}

function closeLightbox() {
  const overlay = document.getElementById('diagram-lightbox-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => {
      document.getElementById('lightbox-img').src = '';
    }, 300); // clear img src after transition
  }
}
