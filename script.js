// Get references to buttons and content sections
const aboutButton = document.getElementById('about-button');
const projectsButton = document.getElementById('projects-button');
const resumeButton = document.getElementById('resume-button');
const aboutContent = document.getElementById('about-content');
const projectsContent = document.getElementById('projects-content');
const projectDetailContent = document.getElementById('project-detail-content');
const resumeContent = document.getElementById('resume-content');
const projectDetailTitle = document.getElementById('project-detail-title');
const projectDetailDescription = document.getElementById('project-detail-description');
const projectDetailFullContent = document.getElementById('project-detail-full-content');
const backToProjectsButton = document.getElementById('back-to-projects');
const downloadResumeButton = document.getElementById('download-resume-button');


// PROJECTS LIST
const projectsData = [

{
id: 'tamil-bible',
name: 'Tamil Bible App',
description: 'A Bible reading and study app with multiple tools for deeper scripture engagement.',
externalLink: 'https://tamilbible.netlify.app/books'
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
}

];



// Render project list
function renderProjectList() {

projectsContent.innerHTML = '<h2 class="text-xl font-medium mb-6">Projects</h2>';

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

window.open(project.externalLink, '_blank');

}

});

projectsContent.appendChild(projectItem);

});

}



// Render project detail
function renderProjectDetail(projectId) {

const project = projectsData.find(p => p.id === projectId);

if (project && !project.externalLink) {

projectDetailTitle.textContent = project.name;

projectDetailDescription.textContent = project.description;

projectDetailFullContent.innerHTML = project.fullContent;

}

}



// Handle page rendering
function renderContent(path) {

aboutContent.classList.add('hidden');
projectsContent.classList.add('hidden');
projectDetailContent.classList.add('hidden');
resumeContent.classList.add('hidden');

aboutButton.classList.remove('active');
projectsButton.classList.remove('active');
resumeButton.classList.remove('active');
downloadResumeButton.style.display = 'none';


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

backToProjectsButton.addEventListener('click', () => navigateTo('/projects'));


// Browser back button
window.addEventListener('popstate', () => {

renderContent(location.pathname);

});


// Download Resume as PDF
function generatePDF() {
const element = document.querySelector('#resume-content .resume-page');
html2pdf()
  .set({
    margin: 10,
    filename: 'Vikash_MJ_Resume.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  })
  .from(element)
  .save();
}

downloadResumeButton.addEventListener('click', generatePDF);


// Initial load
document.addEventListener('DOMContentLoaded', () => {

renderContent(location.pathname);

});
