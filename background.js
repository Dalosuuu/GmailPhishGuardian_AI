console.log('Background script loaded!');

// Store last extracted email
let lastExtractedEmail = null;
const extractedEmails = new Map(); // Store multiple emails

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message.type);
    
    try {
        switch (message.type) {
            case 'EMAIL_EXTRACTED':
                if (message.data && message.data.id) {
                    console.log('Email data received:', message.data);
                    lastExtractedEmail = message.data;
                    extractedEmails.set(message.data.id, message.data);
                    sendResponse({ 
                        status: 'received', 
                        success: true,
                        emailId: message.data.id 
                    });
                } else {
                    console.warn('Received invalid email data');
                    sendResponse({ 
                        status: 'error', 
                        success: false,
                        error: 'Invalid email data' 
                    });
                }
                break;
                
            case 'GET_LAST_EMAIL':
                console.log('Popup requested last email data:', lastExtractedEmail ? 'has data' : 'no data');
                sendResponse({ 
                    data: lastExtractedEmail,
                    totalExtracted: extractedEmails.size
                });
                break;

            default:
                console.warn('Unknown message type:', message.type);
                sendResponse({ 
                    status: 'error', 
                    success: false,
                    error: 'Unknown message type' 
                });
        }
    } catch (error) {
        console.error('Error processing message:', error);
        sendResponse({ 
            status: 'error', 
            success: false,
            error: error.message 
        });
    }
    
    return true; // Keep message channel open for async response
});

// Clean up old extracted emails periodically
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleanupCount = 0;
    
    for (const [emailId, emailData] of extractedEmails) {
        if (new Date(emailData.timestamp).getTime() < oneHourAgo) {
            extractedEmails.delete(emailId);
            cleanupCount++;
        }
    }
    
    if (cleanupCount > 0) {
        console.log(`Cleaned up ${cleanupCount} old email(s) from storage`);
    }
}, 30 * 60 * 1000); // Run every 30 minutes