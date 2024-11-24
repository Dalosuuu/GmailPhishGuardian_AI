console.log('Content script loaded!');

// Store processed email IDs to prevent duplicate processing
const processedEmails = new Set();
const processedEmailsWithTimestamp = new Map();

// Helper function to clean text content
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/[\n\r\t]/g, ' ')  // Replace newlines and tabs with space
        .trim();  // Remove leading/trailing whitespace
}

// Helper function to get email ID from URL
function getEmailId() {
    const urlMatch = window.location.href.match(/#(?:inbox\/)?(?:[^\/]+\/)?([a-zA-Z0-9]+)$/);
    if (urlMatch) return urlMatch[1];
    return `email-${Date.now()}`;
}

// Function to extract structured body content
function extractStructuredBody(bodyElement) {
    if (!bodyElement) return null;

    // Create a clone to work with
    const clone = bodyElement.cloneNode(true);

    // Remove hidden elements and scripts
    clone.querySelectorAll('script, style, .hidden, [hidden]').forEach(el => el.remove());

    // Extract text content with basic structure preservation
    const structuredContent = {
        mainText: cleanText(clone.textContent),
        links: Array.from(clone.querySelectorAll('a'))
            .map(a => ({
                text: cleanText(a.textContent),
                href: a.href
            }))
            .filter(link => link.text && link.href)
    };

    return structuredContent;
}

// Function to validate email data
function validateEmailData(emailData) {
    if (!emailData.id) {
        console.log('Missing email ID');
        return false;
    }
    
    if (!emailData.sender && !emailData.subject && !emailData.body) {
        console.log('No valid content found');
        return false;
    }
    
    if (emailData.body && emailData.body.mainText.length < 10) {
        console.log('Body text too short, might be incomplete');
        return false;
    }
    
    console.log('Email data validation passed');
    return true;
}

// Function to extract email data
function extractEmailData(attempts = 0) {
    console.log('Attempting to extract email data...', window.location.href);
    
    const emailContainer = document.querySelector('.gs');
    if (!emailContainer) {
        if (attempts < 5) {
            console.log('Email container not found, retrying in 1000ms...');
            setTimeout(() => extractEmailData(attempts + 1), 1000);
        } else {
            console.log('Email container not found after multiple attempts.');
        }
        return;
    }

    // Get email ID and check if already processed
    const emailId = getEmailId();
    console.log('Processing email ID:', emailId);
    
    if (processedEmails.has(emailId)) {
        console.log('Email already processed:', emailId);
        return;
    }

    try {
        // Extract sender (using email attribute)
        const senderElement = emailContainer.querySelector('.gD');
        const sender = senderElement ? senderElement.getAttribute('email') : null;
        console.log('Found sender:', sender);

        // Extract subject
        const subjectElement = document.querySelector('h2.hP');
        const subject = subjectElement ? cleanText(subjectElement.textContent) : null;
        console.log('Found subject:', subject);

        // Extract body
        const bodyElement = emailContainer.querySelector('.a3s.aiL');
        const body = bodyElement ? extractStructuredBody(bodyElement) : null;
        console.log('Found body:', body ? `Yes (length: ${body.mainText.length})` : 'No');

        // Extract timestamp
        const timestampElement = emailContainer.querySelector('.g3');
        const timestamp = timestampElement ? timestampElement.getAttribute('title') : new Date().toISOString();

        const emailData = {
            id: emailId,
            sender: sender,
            subject: subject,
            body: body,
            timestamp: timestamp
        };

        // Validate data
        if (!validateEmailData(emailData)) {
            console.log('Email data validation failed.');
            return;
        }

        // Add to processed set before sending
        processedEmails.add(emailId);
        processedEmailsWithTimestamp.set(emailId, Date.now());

        console.log('Sending email data to background script:', emailData);
        
        chrome.runtime.sendMessage({
            type: 'EMAIL_EXTRACTED',
            data: emailData
        }, response => {
            console.log('Background script response:', response);
        });

    } catch (error) {
        console.error('Error extracting email:', error);
    }
}

// Initialize the observer with dynamic content detection
function initializeExtraction() {
    console.log('Initializing extraction...');

    const observer = new MutationObserver((mutations) => {
        // Check if we're on an email view
        if (window.location.href.includes('#inbox/') || window.location.href.includes('#sent/')) {
            const emailContainer = document.querySelector('.gs');
            if (emailContainer && !processedEmails.has(getEmailId())) {
                console.log('Detected new email content, attempting extraction...');
                setTimeout(extractEmailData, 500); // Small delay to ensure DOM is ready
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial check in case we're already on an email
    if (window.location.href.includes('#inbox/') || window.location.href.includes('#sent/')) {
        setTimeout(extractEmailData, 1000);
    }

    console.log('Observer initialized');
}

// Initialize when the page loads
initializeExtraction();

// Clean up processed emails periodically
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean up old entries
    for (const [emailId, timestamp] of processedEmailsWithTimestamp) {
        if (timestamp < oneHourAgo) {
            processedEmailsWithTimestamp.delete(emailId);
            processedEmails.delete(emailId);
            console.log('Cleaned up email ID from processed list:', emailId);
        }
    }
}, 10 * 60 * 1000); // Run every 10 minutes
