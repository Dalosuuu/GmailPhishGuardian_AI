// Add this at the top of background.js
console.log('Background script loaded!');

// Store last extracted email
let lastExtractedEmail = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    
    switch (message.type) {
        case 'EMAIL_EXTRACTED':
            console.log('Email data received:', message.data);
            lastExtractedEmail = message.data;
            // Send a response back
            sendResponse({ status: 'received' });
            break;
            
        case 'GET_LAST_EMAIL':
            console.log('Popup requested last email data');
            sendResponse({ data: lastExtractedEmail });
            break;
    }
    
    // Required for async response
    return true;
}); 