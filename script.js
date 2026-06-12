'use strict';

// Inject copyright year
document.getElementById('year').textContent = new Date().getFullYear();

// Fade-in on scroll via IntersectionObserver
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

// Smooth-scroll for same-page links (fallback)
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = document.querySelector('header')?.offsetHeight ?? 0;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - offset,
      behavior: 'smooth',
    });
    history.pushState(null, '', link.getAttribute('href'));
  });
});
