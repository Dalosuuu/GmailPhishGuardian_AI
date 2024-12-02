console.log('Background script loaded!');

// Import PhishingDetector using the full path
import { PhishingDetector } from './phishing.js';

// Initialize variables
let lastExtractedEmail = null;
const extractedEmails = new Map();
let aiStatus = null;

// Create phishing detector instance
const phishingDetector = new PhishingDetector();

// Add this helper function at the top level
function notifyPopup(message) {
    chrome.runtime.sendMessage(message).catch(err => {
        // Only ignore the specific error for closed popup
        // This is an expected error when popup isn't open
        if (err.message !== 'Could not establish connection. Receiving end does not exist.') {
            console.error('Unexpected error when sending update to popup:', err);
        }
    });
}

// Add this helper function
async function getCurrentTabUrl() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.url || '';
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message.type);
    
    // Since we're using async/await, we need to handle the response differently
    handleMessage(message, sender).then(response => {
        console.log('Sending response back to popup:', response);
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
            case 'CHECK_AI_STATUS':
                try {
                    console.log('Starting CHECK_AI_STATUS');
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    console.log('Found tab:', tab);
                    
                    if (!tab) {
                        console.error('No active tab found');
                        return { status: 'error', message: 'No active tab found' };
                    }
                    
                    console.log('About to execute script');
                    const result = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: async () => {
                            console.log('Inside executeScript');
                            try {
                                const capabilities = await ai.languageModel.capabilities();
                                console.log('AI capabilities:', capabilities);
                                return capabilities.available;
                            } catch (err) {
                                console.error('Error checking AI status:', err);
                                return false;
                            }
                        }
                    });
                    
                    console.log('Script execution result:', result);
                    return result[0].result;
                } catch (err) {
                    console.error('Error in CHECK_AI_STATUS:', err);
                    return false;
                }

            case 'EMAIL_EXTRACTED':
                if (message.data && message.data.id) {
                    console.log('Email data received:', message.data);
                    
                    // Check AI capabilities before calculating score
                    const capabilities = await ai.languageModel.capabilities();
                    if (capabilities.available !== "readily") {
                        console.warn('Language model is not readily available');
                        return;
                    }

                    // Calculate phishing score
                    const phishingResult = await phishingDetector.calculateScore(message.data);
                    
                    // Create a new object to store the complete result
                    const emailWithScore = {
                        ...message.data,
                        phishingScore: {
                            score: phishingResult.score,
                            explanation: phishingResult.explanation
                        }
                    };
                    
                    // Store the complete result
                    lastExtractedEmail = emailWithScore;
                    extractedEmails.set(emailWithScore.id, emailWithScore);

                    // Notify popup with complete data
                    notifyPopup({
                        type: 'DATA_UPDATED',
                        data: emailWithScore
                    });

                    return { 
                        status: 'received', 
                        success: true,
                        emailId: emailWithScore.id 
                    };
                }
                throw new Error('Invalid email data');
                
            case 'GET_LAST_EMAIL_FOR_TAB':
                const currentUrl = await getCurrentTabUrl();
                const urlMatch = currentUrl.match(/#(?:inbox\/|label\/[^\/]+\/)?([a-zA-Z0-9]+)$/);
                const currentEmailId = urlMatch ? urlMatch[1] : null;
                
                console.log('Current URL:', currentUrl);
                console.log('Current Email ID:', currentEmailId);
                console.log('Last Extracted Email ID:', lastExtractedEmail?.id);

                // Only return data if IDs match
                if (currentEmailId && lastExtractedEmail && currentEmailId === lastExtractedEmail.id) {
                    return { data: lastExtractedEmail };
                }
                return { data: null };

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