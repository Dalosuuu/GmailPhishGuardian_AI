// Request latest data from background script
chrome.runtime.sendMessage({ type: 'GET_LAST_EMAIL' }, response => {
    if (response && response.data) {
        document.getElementById('emailData').textContent = 
            JSON.stringify(response.data, null, 2);
    }
}); 