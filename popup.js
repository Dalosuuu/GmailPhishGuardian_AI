document.addEventListener('DOMContentLoaded', () => {
    // Click handlers for both toggles using specific selectors
    document.querySelectorAll('.toggle')[1].addEventListener('click', toggleDetails); // Email Details (second toggle)
    document.querySelectorAll('.toggle')[0].addEventListener('click', toggleExplanation); // Analysis (first toggle)
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

    // Request initial AI status
    chrome.runtime.sendMessage({ type: 'CHECK_AI_STATUS' }, response => {
        if (response) {
            updateAIStatus(response);
            console.log('Response received by popup.js:', response);
        }
    });
});

// When popup opens, it immediately requests the latest data
chrome.runtime.sendMessage({ type: 'GET_LAST_EMAIL_FOR_TAB' }, response => {
    if (response && response.data) {
        updatePopupContent(response.data);
    } else {
        // Show loading state
        // document.getElementById('MainSubject').textContent = 'Analyzing current email...';
        // document.getElementById('phishingScore').textContent = 'Calculating score...';
        // document.getElementById('emailDetails').textContent = 'Waiting for analysis...';
    }
});

// Popup listens for updates while it's open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DATA_UPDATED') {
        updatePopupContent(message.data);
    } else if (message.type === 'AI_STATUS_UPDATED') {
        updateAIStatus(message.status);
    }
});

// Function to update popup content
function updatePopupContent(emailData) {
    if (emailData) {
        const phishingData = emailData.phishingScore || { score: 'N/A', explanation: 'No analysis available.' };
        
        // Update the phishing score text
        const scoreElement = document.getElementById('phishingScore');
        scoreElement.textContent = `Phishing Score: ${phishingData.score}`;

        // Update the explanation
        const explanationElement = document.getElementById('scoreExplanation');
        explanationElement.textContent = phishingData.explanation;

        // Determine severity and update the class
        scoreElement.className = 'score'; // Reset classes
        if (phishingData.score !== 'N/A') {
            const score = parseInt(phishingData.score);
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
        document.getElementById('scoreExplanation').textContent = 'No analysis available.';
    }
}

// Toggle details function (updated to be more specific)
function toggleDetails() {
    const details = document.getElementById('emailDetails');
    const toggleText = document.querySelectorAll('.toggle')[1].querySelector('span');
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

function updateAIStatus(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('aiStatus');
    
    // Check if status is a capabilities object
    if (status === "readily") {
        statusDot.className = 'status-dot ready';
        statusText.textContent = 'AI Model Ready';
    } else {
        statusDot.className = 'status-dot not-ready';
        statusText.textContent = 'AI Model Not Available';
    }
}

// Explanation toggle function (updated to be more specific)
function toggleExplanation() {
    const explanation = document.getElementById('scoreExplanation');
    const toggleText = document.querySelectorAll('.toggle')[0].querySelector('span');
    const toggleIcon = document.getElementById('explanationToggleIcon');
    
    if (explanation.style.display === 'none' || !explanation.style.display) {
        explanation.style.display = 'block';
        toggleText.textContent = 'Hide Analysis';
        toggleIcon.style.transform = 'rotate(180deg)';
    } else {
        explanation.style.display = 'none';
        toggleText.textContent = 'Show Analysis';
        toggleIcon.style.transform = 'rotate(0deg)';
    }
}
  