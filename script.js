// Get references to buttons and content sections
const aboutButton = document.getElementById('about-button');
const projectsButton = document.getElementById('projects-button');
const aboutContent = document.getElementById('about-content');
const projectsContent = document.getElementById('projects-content');
const projectDetailContent = document.getElementById('project-detail-content');
const projectDetailTitle = document.getElementById('project-detail-title');
const projectDetailDescription = document.getElementById('project-detail-description');
const projectDetailFullContent = document.getElementById('project-detail-full-content');
const backToProjectsButton = document.getElementById('back-to-projects');

// Define project data
const projectsData = [
    { id: 'scripture-names', name: 'Scripture Names', description: 'An interactive list of names found in the Holy Bible, with meanings and origins.', externalLink: 'https://scripturenames.netlify.app/' }, // MODIFIED: Direct link to your Netlify site
    { id: 'ai-powered-content-generator', name: 'AI-Powered Content Generator', description: 'Early stage development', fullContent: '<p>An experimental project leveraging AI models to generate creative content, such as short stories, marketing copy, and social media posts. Currently in its early development phase, focusing on prompt engineering and output refinement.</p><p>Technologies involved: Gemini API integration and natural language processing.</p><p>You can view the live demo <a href="https://www.example.com/ai-generator" target="_blank" class="text-blue-600 hover:underline">here</a>.</p>' },
    { id: 'photography-portfolio-curation', name: 'Photography Portfolio Curation', description: 'Selecting and refining best shots', fullContent: '<p>A continuous effort to curate and present a selection of my best photographic works. This involves reviewing thousands of images, post-processing, and organizing them into thematic collections for online display.</p><p>Focus areas: landscape, street, and portrait photography.</p>' },
    // Add new projects here like this:
    // { id: 'new-project-id', name: 'New Project Name', description: 'Short description of new project', externalLink: '../new-project-folder/index.html' },
    // OR for internal projects with fullContent:
    // { id: 'another-internal-project', name: 'Another Internal Project', description: 'Description', fullContent: '<p>Content for another internal project.</p>' },
];

// Function to render project list
function renderProjectList() {
    projectsContent.innerHTML = '<h2 class="text-xl font-medium mb-6">Projects</h2>'; // Clear and add header
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
                // MODIFICATION: Directly navigate to the external link
                window.location.href = project.externalLink;
            } else {
                navigateTo('/projects/' + project.id); // Navigate internally for internal projects
            }
        });
        projectsContent.appendChild(projectItem);
    });
}

// Function to render project detail
function renderProjectDetail(projectId) {
    const project = projectsData.find(p => p.id === projectId);
    if (project && !project.externalLink) { // Only render details if it's not an external link
        projectDetailTitle.textContent = project.name;
        projectDetailDescription.textContent = project.description;
        projectDetailFullContent.innerHTML = project.fullContent;
    } else if (project && project.externalLink) {
        // If an external link project is accessed directly via URL (e.g., /projects/scripture-names)
        window.location.href = project.externalLink;
    }
    else {
        projectDetailTitle.textContent = 'Project Not Found';
        projectDetailDescription.textContent = '';
        projectDetailFullContent.innerHTML = '<p>The requested project could not be found.</p>';
    }
}

// Function to handle content rendering based on path
function renderContent(path) {
    // Hide all content sections
    aboutContent.classList.add('hidden');
    projectsContent.classList.add('hidden');
    projectDetailContent.classList.add('hidden');

    // Deactivate all buttons
    aboutButton.classList.remove('active');
    projectsButton.classList.remove('active');

    if (path === '/' || path === '/about') {
        aboutContent.classList.remove('hidden');
        aboutButton.classList.add('active');
    } else if (path === '/projects') {
        renderProjectList(); // Render the list when /projects is accessed
        projectsContent.classList.remove('hidden');
        projectsButton.classList.add('active');
    } else if (path.startsWith('/projects/')) {
        const projectId = path.split('/projects/')[1];
        const project = projectsData.find(p => p.id === projectId);

        // If it's an external link, redirect immediately
        if (project && project.externalLink) {
            window.location.href = project.externalLink;
            return; // Stop further rendering for this path
        }

        renderProjectDetail(projectId);
        // Only show project detail content if it's an internal project with fullContent
        if (project && !project.externalLink) {
            projectDetailContent.classList.remove('hidden');
        }
        projectsButton.classList.add('active'); // Keep projects button active for project details
    } else {
        // Default to about if path is unrecognized
        aboutContent.classList.remove('hidden');
        aboutButton.classList.add('active');
    }
}

// Function to navigate and update URL
function navigateTo(path) {
    history.pushState({}, '', path);
    renderContent(path);
}

// Event listeners for top navigation buttons
aboutButton.addEventListener('click', () => navigateTo('/about'));
projectsButton.addEventListener('click', () => navigateTo('/projects'));

// Event listener for back to projects button
backToProjectsButton.addEventListener('click', () => navigateTo('/projects'));

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    renderContent(location.pathname);
});

// Initial content rendering based on current URL
document.addEventListener('DOMContentLoaded', () => {
    renderContent(location.pathname);
});
