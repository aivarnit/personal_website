import { profile, experience, certifications, skills, projects } from './data.js';
import { createModal } from './modal.js';
import { initializeMotion } from './motion.js';
import { createResumeViewer } from './resume.js?v=3';

// Data is rendered as text to keep edited content from becoming executable HTML.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function tags(technologies) {
  const list = element('div', 'tags');
  technologies.forEach(technology => list.append(element('span', 'tag', technology)));
  return list;
}
function externalLink(label, href, className = '') {
  const link = element('a', className, label);
  link.href = href;
  if (!href.startsWith('mailto:') && !href.startsWith('assets/')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}
const notice = document.querySelector('#notice-dialog');
const noticeModal = createModal(notice);
function showNotice(key) {
  const messages = {
    github: 'The GitHub profile URL has not been added yet.',
    linkedin: 'The LinkedIn profile URL has not been added yet.',
    email: 'The contact email address has not been added yet.',
  };
  document.querySelector('#notice-text').textContent = messages[key];
  noticeModal.open();
}
const openResume = createResumeViewer(document.querySelector('#resume-dialog'), profile.resume);
const labels = { github: 'GitHub', linkedin: 'LinkedIn', email: 'Email', resume: 'Resume' };
function profileAction(key, className = '', label = labels[key]) {
  let action;
  if (key === 'resume') {
    action = element('button', className, label);
    action.type = 'button';
    action.setAttribute('aria-haspopup', 'dialog');
    action.setAttribute('aria-controls', 'resume-dialog');
    action.addEventListener('click', openResume);
  } else if (profile[key]) {
    const href = key === 'email' ? `mailto:${profile[key]}` : profile[key];
    action = externalLink(label, href, className);
  } else {
    action = element('button', className, label);
    action.type = 'button';
    action.setAttribute('aria-label', `${label} — ${labels[key]} details coming soon`);
    action.addEventListener('click', () => showNotice(key));
  }
  return action;
}
document.querySelector('[data-profile-link="resume"]').append(profileAction('resume', 'button', 'Resume ↗'));
for (const key of ['github', 'linkedin', 'email']) document.querySelector('[data-social-links]').append(profileAction(key, '', `${labels[key]} ↗`));
for (const key of ['email', 'linkedin', 'github', 'resume']) {
  const action = profileAction(key);
  if (!profile[key]) action.append(element('small', '', 'COMING SOON'));
  action.append(element('span', '', '↗'));
  document.querySelector('[data-contact-links]').append(action);
}
for (const key of ['github', 'linkedin']) document.querySelector('[data-footer-links]').append(profileAction(key));
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#profile-image').src = profile.portrait;
document.querySelector('#profile-image').alt = profile.portraitAlt;
document.querySelector('#portrait-caption').textContent = profile.portraitCaption;

experience.forEach(item => {
  const article = element('article', 'experience-item');
  const top = element('div', 'experience-top');
  top.append(element('h4', '', item.title), element('span', 'mono metadata', item.dates));
  article.append(top, element('span', 'metadata mono', item.company), element('p', '', item.description));
  if (item.accomplishments.length) {
    const list = element('ul');
    item.accomplishments.forEach(text => list.append(element('li', '', text)));
    article.append(list);
  }
  article.append(tags(item.technologies));
  document.querySelector('#experience-list').append(article);
});
certifications.forEach(item => {
  const card = element('article', 'cert-card');
  const copy = element('div');
  copy.append(element('h4', '', item.title), element('p', '', item.status));
  card.append(copy);
  document.querySelector('#certification-list').append(card);
});
skills.forEach((group, index) => {
  const card = element('article', 'skill-group');
  const heading = element('div', 'skill-title');
  heading.append(element('h3', '', group.category), element('span', 'mono', `0${index + 1}`));
  const list = element('ul');
  group.technologies.forEach(technology => list.append(element('li', '', technology)));
  card.append(heading, list);
  document.querySelector('#skills-grid').append(card);
});

const projectDialog = document.querySelector('#project-dialog');
const detail = document.querySelector('#project-detail');
const projectModal = createModal(projectDialog, { onClose: () => detail.replaceChildren() });
function imageFigure(src, alt, caption) {
  const figure = element('figure', 'detail-media');
  const image = element('img');
  image.src = src;
  image.alt = alt || '';
  image.loading = 'lazy';
  figure.append(image);
  if (caption) figure.append(element('figcaption', '', caption));
  return figure;
}
function renderMedia(media) {
  if (media.type === 'image' || media.type === 'gif') return imageFigure(media.src, media.alt, media.caption);
  const figure = element('figure', 'detail-media');
  if (media.type === 'video') {
    const video = element('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.src = media.src;
    if (media.poster) video.poster = media.poster;
    if (media.title) video.setAttribute('aria-label', media.title);
    if (media.captions) {
      const track = element('track');
      track.kind = 'captions'; track.src = media.captions; track.srclang = 'en'; track.label = 'English';
      video.append(track);
    }
    figure.append(video);
  } else if (media.type === 'youtube' && /^[\w-]{11}$/.test(media.videoId)) {
    const iframe = element('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${media.videoId}`;
    iframe.title = media.title || 'Project demonstration';
    iframe.loading = 'lazy';
    iframe.allow = 'fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    figure.append(iframe);
  } else {
    const placeholder = element('div', 'media-placeholder');
    const icon = element('span', '', '▷');
    icon.setAttribute('aria-hidden', 'true');
    placeholder.append(icon, element('h3', '', media.title || 'Media placeholder'), element('p', '', 'MP4 / WebM / GIF / YouTube / image gallery'));
    figure.append(placeholder);
  }
  if (media.caption) figure.append(element('figcaption', '', media.caption));
  return figure;
}
function openProject(project) {
  detail.replaceChildren();
  const body = element('div', 'detail-body');
  const title = element('h2', '', project.title);
  title.id = 'dialog-title';
  body.append(element('span', 'mono muted', `${project.category.toUpperCase()} / DRAFT PROJECT DETAILS`), title, element('p', '', project.fullDescription), tags(project.technologies));
  body.append(imageFigure(project.image, project.imageAlt, 'Concept visual placeholder — replace with a project screenshot.'));
  project.media.forEach(media => body.append(renderMedia(media)));
  const grid = element('div', 'detail-grid');
  for (const [key, label] of [['goal', 'Problem / goal'], ['implementation', 'Technical implementation'], ['challenges', 'Challenges'], ['outcome', 'Outcome']]) {
    const section = element('section');
    section.append(element('h3', '', label), element('p', '', project[key]));
    grid.append(section);
  }
  body.append(grid);
  const links = element('div', 'detail-links');
  if (project.github) links.append(externalLink('GitHub repository ↗', project.github, 'button'));
  if (project.demo) links.append(externalLink('Live demonstration ↗', project.demo, 'button'));
  if (!project.github && !project.demo) links.append(element('p', 'placeholder-note', 'Repository and demo links to be added.'));
  body.append(links);
  detail.append(body);
  projectModal.open();
}
projects.forEach((project, index) => {
  const card = element('article', 'project-card');
  const button = element('button', 'project-open');
  button.type = 'button';
  button.setAttribute('aria-label', `Explore ${project.title}`);
  button.setAttribute('aria-haspopup', 'dialog');
  const visual = element('div', 'project-visual');
  const image = element('img');
  image.src = project.image; image.alt = project.imageAlt;
  image.width = 640; image.height = 400; image.loading = 'lazy'; image.decoding = 'async';
  visual.append(image, element('span', 'visual-label mono', 'CONCEPT VISUAL / PLACEHOLDER'));
  const content = element('div', 'project-content');
  const meta = element('div', 'project-meta mono');
  meta.append(element('span', '', project.category.toUpperCase()), element('span', '', String(index + 1).padStart(2, '0')));
  content.append(meta, element('h4', '', project.title), element('p', '', project.description), tags(project.technologies));
  button.append(visual, content);
  button.addEventListener('click', () => openProject(project));
  const bottom = element('div', 'project-bottom mono');
  bottom.append(element('span', '', 'EXPLORE PROJECT ↗'));
  button.append(bottom);
  card.append(button);
  if (project.github || project.demo) {
    const links = element('div', 'project-bottom mono');
    if (project.github) links.append(externalLink('GITHUB ↗', project.github));
    if (project.demo) links.append(externalLink('DEMO ↗', project.demo));
    card.append(links);
  }
  document.querySelector(`#${project.gallery === 'software' ? 'software' : 'infrastructure'}-projects`).append(card);
});

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#nav-links');
function closeMenu(returnFocus = false) {
  navigation.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  if (returnFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu(true); });
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
matchMedia('(min-width: 641px)').addEventListener('change', () => closeMenu());
const header = document.querySelector('#site-header');
const hero = document.querySelector('#home');
function updateNavigation() {
  header.classList.toggle('is-scrolled', hero.getBoundingClientRect().bottom <= header.offsetHeight);
  let current = null;
  for (const section of document.querySelectorAll('main > section[id]')) {
    if (section.getBoundingClientRect().top <= header.offsetHeight + 120) current = section.id;
  }
  if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = 'contact';
  for (const link of navigation.querySelectorAll('a')) {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
let framePending = false;
window.addEventListener('scroll', () => {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => { updateNavigation(); framePending = false; });
}, { passive: true });
window.addEventListener('resize', updateNavigation);
updateNavigation();
initializeMotion();
