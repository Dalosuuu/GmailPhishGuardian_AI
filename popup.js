// Request latest data from background script
chrome.runtime.sendMessage({ type: 'GET_LAST_EMAIL' }, response => {
    if (response && response.data) {
        const emailData = response.data;
        const phishingScore = emailData.phishingScore || 'N/A';

        // Update the phishing score text
        const scoreElement = document.getElementById('phishingScore');
        scoreElement.textContent = `Phishing Score: ${phishingScore}`;

        // Determine severity and update the class
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
            scoreElement.classList.add('caution'); // Default to caution if score not available
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
}); 