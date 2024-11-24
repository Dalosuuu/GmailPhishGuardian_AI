console.log('Background script loaded!');

// Import PhishingDetector using the full path
import { PhishingDetector } from './phishing.js';

// Initialize variables
let lastExtractedEmail = null;
const extractedEmails = new Map();

// Create phishing detector instance
const phishingDetector = new PhishingDetector();

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message.type);
    
    // Since we're using async/await, we need to handle the response differently
    handleMessage(message, sender).then(response => {
        sendResponse(response);
    }).catch(error => {
        console.error('Error handling message:', error);
        sendResponse({ 
            status: 'error', 
            success: false,
            error: error.message 
        });
    });
    
    return true; // Keep message channel open for async response
});

// Separate async function to handle messages
async function handleMessage(message, sender) {
    try {
        switch (message.type) {
            case 'EMAIL_EXTRACTED':
                if (message.data && message.data.id) {
                    console.log('Email data received:', message.data);
                    
                    // Calculate phishing score
                    const phishingScore = await phishingDetector.calculateScore(message.data);
                    console.log('Calculated phishing score:', phishingScore);
                    
                    // Add phishing score to email data
                    message.data.phishingScore = phishingScore;
                    lastExtractedEmail = message.data;
                    extractedEmails.set(message.data.id, message.data);

                    return { 
                        status: 'received', 
                        success: true,
                        emailId: message.data.id 
                    };
                }
                throw new Error('Invalid email data');
                
            case 'GET_LAST_EMAIL':
                console.log('Popup requested last email data:', lastExtractedEmail ? 'has data' : 'no data');
                return { 
                    data: lastExtractedEmail,
                    totalExtracted: extractedEmails.size
                };

            default:
                throw new Error('Unknown message type');
        }
    } catch (error) {
        throw error;
    }
}

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