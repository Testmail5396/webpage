// Get references to buttons and content sections
const aboutButton = document.getElementById('about-button');
const projectsButton = document.getElementById('projects-button');
const resumeButton = document.getElementById('resume-button');
const photosButton = document.getElementById('photos-button');
const themeToggleButton = document.getElementById('theme-toggle-button');
const ownerButton = document.getElementById('owner-button');
const aboutContent = document.getElementById('about-content');
const projectsContent = document.getElementById('projects-content');
const photosContent = document.getElementById('photos-content');
const projectDetailContent = document.getElementById('project-detail-content');
const resumeContent = document.getElementById('resume-content');
const projectDetailTitle = document.getElementById('project-detail-title');
const projectDetailDescription = document.getElementById('project-detail-description');
const projectDetailFullContent = document.getElementById('project-detail-full-content');
const backToProjectsButton = document.getElementById('back-to-projects');
const downloadResumeButton = document.getElementById('download-resume-button');
const projectsListEl = document.getElementById('projects-list');
const projectsLayoutEl = document.getElementById('projects-layout');
const projectPreviewPanel = document.getElementById('project-preview-panel');
const projectPreviewIframe = document.getElementById('project-preview-iframe');
const previewTitle = document.getElementById('preview-title');
const previewDescription = document.getElementById('preview-description');
const previewOpenNewTab = document.getElementById('preview-open-new-tab');
const previewCloseButton = document.getElementById('preview-close');


// PROJECTS LIST
const projectsData = [

{
id: 'tamil-bible',
name: 'Tamil Bible App',
description: 'A Bible reading and study app with multiple tools for deeper scripture engagement.',
externalLink: 'https://biblehere.com/books'
},

{
id: 'scripture-names',
name: 'Scripture Names',
description: 'Explore thousands of names found in the Bible with meanings.',
externalLink: 'https://scripturenames.netlify.app/'
},

{
id: 'bible-persons',
name: 'Bible Persons',
description: 'Discover characters and people found throughout the Bible.',
externalLink: 'https://charactrace.netlify.app/'
},


{
id: 'wiresketch',
name: 'WireSketch',
description: 'A lightweight tool to quickly create wireframes and rough UI layouts.',
externalLink: 'https://blank-cloth-33724024.figma.site/'
},

{
id: 'sticky-wall',
name: 'Sticky Wall',
description: 'A digital sticky notes wall to capture and organize ideas visually.',
externalLink: 'https://full-tidy-20776308.figma.site/'
},

{
id: 'isometric-city',
name: 'Isometric City',
description: 'An interactive isometric city built with Three.js, Asterbrook.',
externalLink: 'apps-isometric-city/'
},

{
id: 'zlink',
name: 'zLink',
description: 'A shared link library for teams. Save Figma links, design references, and resources on one page so they\'re searchable months later instead of getting lost in chat history.',
externalLink: 'apps-zlink/build/'
},

{
id: 'biblehere-landing',
name: 'Landing Page',
description: 'A minimal landing page for BibleHere, a distraction-free Bible reading experience.',
externalLink: 'https://www.biblehere.com'
}

];



// Render project list
function renderProjectList() {

closeProjectPreview();
projectsListEl.innerHTML = '';

projectsData.forEach(project => {

const projectItem = document.createElement('div');

projectItem.classList.add('project-item');

projectItem.setAttribute('data-project-id', project.id);

projectItem.innerHTML = `
<h3 class="project-item-header">${project.name}</h3>
<p class="project-item-secondary-text">${project.description}</p>
`;

projectItem.addEventListener('click', () => {

if (project.externalLink) {

openProjectPreview(project, projectItem);

}

});

projectsListEl.appendChild(projectItem);

});

}


// Open a project's preview inline in the split panel
function openProjectPreview(project, projectItemEl) {

document.querySelectorAll('.project-item.active').forEach(el => el.classList.remove('active'));
projectItemEl.classList.add('active');

previewTitle.textContent = project.name;
previewDescription.textContent = project.description;
previewOpenNewTab.href = project.externalLink;
projectPreviewIframe.src = project.externalLink;

projectPreviewPanel.classList.remove('hidden');
projectsLayoutEl.classList.add('preview-active');
document.body.classList.add('preview-mode');

}


// Close the inline project preview
function closeProjectPreview() {

projectPreviewPanel.classList.add('hidden');
projectsLayoutEl.classList.remove('preview-active');
document.body.classList.remove('preview-mode');
projectPreviewIframe.src = '';

document.querySelectorAll('.project-item.active').forEach(el => el.classList.remove('active'));

}

previewCloseButton.addEventListener('click', closeProjectPreview);



// Render project detail
function renderProjectDetail(projectId) {

const project = projectsData.find(p => p.id === projectId);

if (project && !project.externalLink) {

projectDetailTitle.textContent = project.name;

projectDetailDescription.textContent = project.description;

projectDetailFullContent.innerHTML = project.fullContent;

}

}



// Toggle the wide layout used by the photography page WITHOUT animating
// main's max-width transition (style.css) — the width change is still
// instant, only the eased animation is suppressed for this one switch.
// Projects preview keeps its own eased transition untouched.
function setPhotosMode(on) {
    if (document.body.classList.contains('photos-mode') === on) return;
    document.body.classList.add('no-width-transition');
    document.body.classList.toggle('photos-mode', on);
    void document.querySelector('main').offsetWidth; // force layout before re-enabling transitions
    requestAnimationFrame(() => document.body.classList.remove('no-width-transition'));
}

// Handle page rendering
function renderContent(path) {

if (path !== '/projects') {
closeProjectPreview();
}

aboutContent.classList.add('hidden');
projectsContent.classList.add('hidden');
projectDetailContent.classList.add('hidden');
resumeContent.classList.add('hidden');
if (photosContent) photosContent.classList.add('hidden');

aboutButton.classList.remove('active');
projectsButton.classList.remove('active');
resumeButton.classList.remove('active');
if (photosButton) photosButton.classList.remove('active');
downloadResumeButton.style.display = 'none';
setPhotosMode(false);


if (path === '/' || path === '/about') {

aboutContent.classList.remove('hidden');
aboutButton.classList.add('active');

}

else if (path === '/projects') {

renderProjectList();
projectsContent.classList.remove('hidden');
projectsButton.classList.add('active');

}

else if (path === '/vikashresume') {

resumeContent.classList.remove('hidden');
resumeButton.classList.add('active');
downloadResumeButton.style.display = 'block';

}

else if (path === '/photos' || path === '/photography' || path === '/photos/admin' || path === '/admin' || path === '/edit') {

photosContent.classList.remove('hidden');
photosButton.classList.add('active');
setPhotosMode(true);
if (window.Photography) {
    window.Photography.mount(photosContent);
    window.Photography.onRoute(path);
}

}

else {

aboutContent.classList.remove('hidden');
aboutButton.classList.add('active');

}

}



// Navigation
function navigateTo(path) {

history.pushState({}, '', path);
renderContent(path);

}


// Nav buttons
aboutButton.addEventListener('click', () => navigateTo('/about'));

projectsButton.addEventListener('click', () => navigateTo('/projects'));

resumeButton.addEventListener('click', () => navigateTo('/vikashresume'));

if (photosButton) photosButton.addEventListener('click', () => navigateTo('/photos'));

// Owner sign-in entry (bottom sidebar icon). Requires a DOUBLE-click on
// purpose — a single click does nothing, so a casual visitor scrolling
// the sidebar doesn't stumble into the sign-in dialog. Opens Google
// Sign-In; if already the owner, jumps to the gallery (edit mode).
if (ownerButton) {
    ownerButton.addEventListener('dblclick', () => {
        if (window.PhotographyAuth && window.PhotographyAuth.isAdmin()) {
            navigateTo('/photos');
        } else if (window.PhotographyAuth) {
            window.PhotographyAuth.signIn();
        }
    });
    // Reflect owner state on the icon — both on future sign-in/out
    // events AND on the state a restored session already has right now
    // (restore() in auth.js sets that state silently, without an event).
    if (window.PhotographyAuth) {
        const syncOwnerIcon = (s) => {
            ownerButton.classList.toggle('owner-active', !!s.admin);
            ownerButton.setAttribute('aria-label', s.admin ? 'Owner: signed in' : 'Owner sign-in');
        };
        window.PhotographyAuth.onChange(syncOwnerIcon);
        syncOwnerIcon({ admin: window.PhotographyAuth.isAdmin() });
    }
}

// Dark / light mode toggle. Theme lives as data-theme on <html> (set
// synchronously by the inline script in <head>, before first paint, so
// there's no flash of the wrong theme) — this handler just flips it and
// remembers the choice for next visit.
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('site-theme', next); } catch (e) {}
        themeToggleButton.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
    themeToggleButton.setAttribute(
        'aria-label',
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
}

backToProjectsButton.addEventListener('click', () => navigateTo('/projects'));


// Browser back button
window.addEventListener('popstate', () => {

renderContent(location.pathname);

});


// Download Resume as PDF
function generatePDF() {
const element = document.querySelector('#resume-content .resume-page');
// PDFs are meant to be printed/shared as a normal light document —
// force light mode for the capture regardless of the site's current
// theme, then restore whatever the visitor had selected.
const previousTheme = document.documentElement.getAttribute('data-theme');
document.documentElement.setAttribute('data-theme', 'light');
html2pdf()
  .set({
    margin: 10,
    filename: 'Vikash_MJ_Resume.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  })
  .from(element)
  .save()
  .then(() => {
    if (previousTheme) document.documentElement.setAttribute('data-theme', previousTheme);
    else document.documentElement.removeAttribute('data-theme');
  });
}

downloadResumeButton.addEventListener('click', generatePDF);


// Initial load
document.addEventListener('DOMContentLoaded', () => {

renderContent(location.pathname);

});
