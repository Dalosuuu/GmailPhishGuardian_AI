// Request latest data from background script
chrome.runtime.sendMessage({ type: 'GET_LAST_EMAIL' }, response => {
    if (response && response.data) {
        updatePopupContent(response.data);
    }
});

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DATA_UPDATED') {
        updatePopupContent(message.data);
    }
});

// Function to update popup content
function updatePopupContent(emailData) {
    if (emailData) {
        const phishingScore = emailData.phishingScore || 'N/A';

        // Update the phishing score text
        const scoreElement = document.getElementById('phishingScore');
        scoreElement.textContent = `Phishing Score: ${phishingScore}`;

        // Determine severity and update the class
        scoreElement.className = 'score'; // Reset classes
        if (phishingScore !== 'N/A') {
            const score = parseInt(phishingScore);
            if (score < 30) {
                scoreElement.classList.add('safe');
            } else if (score < 70) {
                scoreElement.classList.add('caution');
            } else {
                scoreElement.classList.add('danger');
            }
        } else {
            scoreElement.classList.add('caution');
        }

        // Update other elements
        document.getElementById('MainSubject').textContent = emailData.subject || 'No Subject';

        // Display email details
        document.getElementById('emailDetails').textContent = `
Sender: ${emailData.sender}
Subject: ${emailData.subject}
Timestamp: ${emailData.timestamp}
Body: ${emailData.body.mainText}
        `;
    } else {
        document.getElementById('emailDetails').textContent = 'No email data available.';
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers for toggle and tooltip
    document.querySelector('.toggle').addEventListener('click', toggleDetails);
    document.querySelector('.help-icon').addEventListener('click', toggleTooltip);

    const themeToggle = document.getElementById('themeToggle');
    
    // Set initial theme
    document.documentElement.setAttribute('data-theme', 
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
    });
});

// Toggle details function
function toggleDetails() {
    const details = document.getElementById('emailDetails');
    const toggleText = document.querySelector('.toggle span');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (details.style.display === 'block' || details.style.display === '') {
        details.style.display = 'none';
        toggleText.textContent = 'Show Email Details';
        toggleIcon.style.transform = 'rotate(0deg)';
    } else {
        details.style.display = 'block';
        toggleText.textContent = 'Hide Email Details';
        toggleIcon.style.transform = 'rotate(180deg)';
    }
}

// Toggle tooltip function
function toggleTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
} 