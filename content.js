(function() {
  // Use a more unique name or rely on IIFE blocking to prevent "already declared" errors
  let contentDebounceTimer;

  // Extract the main readable text from the page.
  function extractPageContent() {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) {
      return { text: selection, type: "selection" };
    }

    const documentClone = document.cloneNode(true);
    
    // Remove scripts, styles, nav, footers
    const removeSelectors = ['script', 'style', 'nav', 'footer', 'noscript', 'iframe'];
    removeSelectors.forEach(selector => {
      const elements = documentClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Try to find the main article or content body
    let mainContent = documentClone.querySelector('article') || documentClone.querySelector('main') || documentClone.body;
    
    if (!mainContent) {
      return "No content could be extracted.";
    }

    // Get text content, compress whitespace
    let text = mainContent.innerText || mainContent.textContent;
    text = text.replace(/\s+/g, ' ').trim();
    
    // Truncate to a reasonable amount so we don't blow up context limits immediately
    // 20,000 chars is roughly 5k tokens - a good balance for local 8k context models.
    const MAX_CHARS = 20000; 
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS) + "\n...[Content truncated due to length]";
    }
    return { text: text, type: "full-page" };
  }

  // Listen for messages from the side panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContent") {
      const title = document.title;
      const url = window.location.href;
      const contentObj = extractPageContent();
      sendResponse({ title, url, content: contentObj.text, type: contentObj.type });
    }
    return true; // Keep channel open for async if needed
  });

  // Auto-update sidepanel when text is highlighted
  document.addEventListener('selectionchange', () => {
      clearTimeout(contentDebounceTimer);
      contentDebounceTimer = setTimeout(() => {
          try {
            const selection = window.getSelection().toString().trim();
            chrome.runtime.sendMessage({ 
              action: "contextChanged", 
              hasSelection: selection.length > 0 
            }).catch(() => {
              // Ignore "Extension context invalidated" errors
            });
          } catch (e) {
            // Context invalidated
          }
      }, 400);
  });
})();
