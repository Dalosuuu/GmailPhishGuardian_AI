// Add this at the top of content.js
console.log('Content script loaded!');

// Store processed email IDs to prevent duplicate processing
const processedEmails = new Set();

// Helper function to clean text content
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/[\n\r\t]/g, ' ')  // Replace newlines and tabs with space
        .trim();  // Remove leading/trailing whitespace
}

// Helper function to get email ID from URL or content
function getEmailId(emailContainer) {
    // Try to get from URL first
    const urlMatch = window.location.href.match(/\#message-([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    
    // Fallback to timestamp + subject as unique identifier
    const timestamp = emailContainer.querySelector('.g3').getAttribute('title') || '';
    const subject = emailContainer.querySelector('h2.hP').textContent || '';
    return `${timestamp}-${subject}`;
}

// Function to extract email data
function extractEmailData() {
    console.log('Attempting to extract email data...');
    
    // Get the main email container
    const emailContainer = document.querySelector('.gs');
    
    if (!emailContainer) {
        console.log('No email container found');
        return null;
    }

    // Get email ID and check if already processed
    const emailId = getEmailId(emailContainer);
    console.log('Found email ID:', emailId);

    if (processedEmails.has(emailId)) {
        console.log('Email already processed, skipping:', emailId);
        return null;
    }

    try {
        // Extract sender information
        const senderElement = emailContainer.querySelector('.gD');
        const sender = senderElement ? senderElement.getAttribute('email') : null;
        console.log('Found sender:', sender);
        
        // Extract subject
        const subjectElement = document.querySelector('h2.hP');
        const subject = subjectElement ? cleanText(subjectElement.textContent) : null;
        console.log('Found subject:', subject);
        
        // Extract email body
        const bodyElement = emailContainer.querySelector('.a3s.aiL');
        const body = bodyElement ? extractStructuredBody(bodyElement) : null;
        console.log('Found body:', body ? 'Yes' : 'No');
        
        // Extract timestamp
        const timestampElement = emailContainer.querySelector('.g3');
        const timestamp = timestampElement ? timestampElement.getAttribute('title') : null;
        console.log('Found timestamp:', timestamp);

        if (sender || subject || body) {
            processedEmails.add(emailId);
            const emailData = {
                id: emailId,
                sender,
                subject,
                body,
                timestamp,
                extractedAt: new Date().toISOString()
            };

            console.log('Successfully extracted email data:', emailData);
            
            // Add this to test message passing
            chrome.runtime.sendMessage({
                type: 'EMAIL_EXTRACTED',
                data: emailData
            }, response => {
                console.log('Message sent to background script, response:', response);
            });

            return emailData;
        }
    } catch (error) {
        console.error('Error extracting email data:', error);
    }
    
    return null;
}

// Helper function to extract structured body content
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
            .filter(link => link.text && link.href),
        // Add any other structured elements you want to extract
    };

    return structuredContent;
}

// Initialize the observer with debouncing
function initializeExtraction() {
    let debounceTimeout;
    
    const observer = new MutationObserver((mutations) => {
        // Clear existing timeout
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        // Set new timeout
        debounceTimeout = setTimeout(() => {
            // Check if we're actually viewing an email
            if (window.location.href.includes('#message')) {
                const emailData = extractEmailData();
                if (emailData) {
                    // Here you can send the data to your analysis function
                    // or to a backend server
                    chrome.runtime.sendMessage({
                        type: 'EMAIL_EXTRACTED',
                        data: emailData
                    });
                }
            }
        }, 500); // 500ms debounce delay
    });

    // Start observing changes in the Gmail interface
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Cleanup function
    return () => {
        observer.disconnect();
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
    };
}

// Initialize when the page loads
initializeExtraction();

// Clean up processed emails periodically (optional)
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    processedEmails.clear(); // Clear all after an hour
}, 60 * 60 * 1000); // Run every hour 