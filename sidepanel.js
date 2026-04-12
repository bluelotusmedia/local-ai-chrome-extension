document.addEventListener('DOMContentLoaded', () => {
  const chatHistory = document.getElementById('chat-history');
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const refreshContextBtn = document.getElementById('refresh-context-btn');
  const contextPill = document.getElementById('context-pill');
  
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const endpointUrlInput = document.getElementById('endpoint-url');
  const systemPromptInput = document.getElementById('system-prompt');
  
  const micBtn = document.getElementById('mic-btn');
  
  let pageContext = "";
  let pageTitle = "";
  let messages = [];

  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
      userInput.placeholder = "Listening...";
    };
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      userInput.value = finalTranscript || interimTranscript;
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if(event.error === 'not-allowed') {
         alert("Microphone access denied. Please open the Extension Options page to grant microphone access.");
         window.open(chrome.runtime.getURL("options.html"));
      }
      stopListening();
    };
    
    recognition.onend = () => {
      stopListening();
      if (userInput.value.trim().length > 0) {
        chatForm.dispatchEvent(new Event('submit'));
      }
    };
  }

  function stopListening() {
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    userInput.placeholder = "Ask something...";
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (!recognition) return alert("Speech Recognition not supported in this browser.");
      
      if (isListening) {
        recognition.stop();
      } else {
        // stop TTS if trying to talk
        window.speechSynthesis.cancel();
        userInput.value = "";
        recognition.start();
      }
    });
  }

  // Load Settings
  chrome.storage.local.get(['lmServerUrl', 'systemPrompt'], (res) => {
    if (res.lmServerUrl) endpointUrlInput.value = res.lmServerUrl;
    if (res.systemPrompt) systemPromptInput.value = res.systemPrompt;
  });

  // Settings Panel Toggle
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  saveSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      lmServerUrl: endpointUrlInput.value,
      systemPrompt: systemPromptInput.value
    }, () => {
      settingsPanel.classList.add('hidden');
    });
  });

  // Setup auto-resize for textarea
  userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Refresh Context Action
  refreshContextBtn.addEventListener('click', loadPageContext);

  // Initialize
  loadPageContext();

  function loadPageContext() {
    // Clear chat history and state
    messages = [];
    chatHistory.innerHTML = '';
    
    contextPill.innerText = "Loading context...";
    contextPill.classList.remove('error');
    
    // Add initial system message or a refresh indicator
    appendMessage('system', "Context refreshed. Starting a new conversation about the current page.");
    
    // Get active tab and send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        setContextError("No active tab.");
        return;
      }
      
      const targetTab = tabs[0];
      
      if (!targetTab.url || targetTab.url.startsWith('chrome://') || targetTab.url.startsWith('edge://') || targetTab.url.startsWith('about:') || targetTab.url.startsWith('brave://')) {
        setContextError("Cannot read browser pages.");
        return;
      }
      
      // Try sending message first as content scripts may already be running
      chrome.tabs.sendMessage(targetTab.id, { action: "getPageContent" }, (response) => {
        if (!chrome.runtime.lastError && response) {
          pageContext = response.content;
          pageTitle = response.title;
          contextPill.innerText = `Context: ${pageTitle.substring(0, 20)}...`;
        } else {
          // Attempt to execute the content script first just in case it hasn't run
          chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['content.js']
          }).then(() => {
            chrome.tabs.sendMessage(targetTab.id, { action: "getPageContent" }, (response2) => {
              if (chrome.runtime.lastError || !response2) {
                setContextError("Could not read page.");
                console.error(chrome.runtime.lastError);
                return;
              }
              pageContext = response2.content;
              pageTitle = response2.title;
              contextPill.innerText = `Context: ${pageTitle.substring(0, 20)}...`;
            });
          }).catch(err => {
            setContextError("Cannot run on this page.");
            console.error(err);
          });
        }
      });
    });
  }

  function setContextError(msg) {
    contextPill.innerText = msg;
    contextPill.classList.add('error');
    pageContext = "";
  }

  function appendMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-msg`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Create text wrapper to separate content from potential buttons
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    contentDiv.appendChild(textDiv);

    if (role === 'ai') {
      textDiv.innerHTML = formatMarkdown(content);
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';

      // Add Play Audio Button
      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn';
      playBtn.title = 'Play Audio';
      playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      
      let isPlaying = false;
      playBtn.addEventListener('click', () => {
        if (isPlaying) {
          window.speechSynthesis.cancel();
          isPlaying = false;
          playBtn.classList.remove('playing');
          actionsDiv.classList.remove('playing');
        } else {
          window.speechSynthesis.cancel(); // stop any previous
          const textToSpeak = textDiv.innerText;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.onend = () => {
             isPlaying = false;
             playBtn.classList.remove('playing');
             actionsDiv.classList.remove('playing');
          };
          window.speechSynthesis.speak(utterance);
          isPlaying = true;
          playBtn.classList.add('playing');
          actionsDiv.classList.add('playing');
        }
      });
      actionsDiv.appendChild(playBtn);

      // Add Copy Button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      
      copyBtn.addEventListener('click', () => {
        const textToCopy = textDiv.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.classList.add('success');
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          
          setTimeout(() => {
            copyBtn.classList.remove('success');
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
          }, 2000);
        });
      });
      actionsDiv.appendChild(copyBtn);
      
      contentDiv.appendChild(actionsDiv);
    } else {
      textDiv.textContent = content; // Escape user text
    }
    
    msgDiv.appendChild(contentDiv);
    chatHistory.appendChild(msgDiv);
    scrollToBottom();
    return textDiv; // Return textDiv so streaming updates the text only
  }

  function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // A very basic markdown formatter for bold and code blocks
  function formatMarkdown(text) {
    let formatted = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // sanitize
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    return formatted;
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // Stop speaking and listening
    window.speechSynthesis.cancel();
    if (isListening && recognition) {
       recognition.stop();
       stopListening();
    }

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Add user msg to UI
    appendMessage('user', text);
    messages.push({ role: "user", content: text });

    // Prepare system prompt with context
    const sysPrompt = systemPromptInput.value;
    const fullSystemMessage = `${sysPrompt}\n\nPAGE CONTEXT:\n${pageContext}`;

    // Prepare history payload
    const payloadMessages = [
      { role: "system", content: fullSystemMessage },
      ...messages
    ];

    const aiContentDiv = appendMessage('ai', '');
    aiContentDiv.innerHTML = '<span class="typing-cursor"></span>';
    
    try {
      const response = await fetch(endpointUrlInput.value, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "local-model", // LM Studio ignores this usually
          messages: payloadMessages,
          stream: true,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botFullText = "";

      // Stream response
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                botFullText += data.choices[0].delta.content;
                aiContentDiv.innerHTML = formatMarkdown(botFullText) + '<span class="typing-cursor"></span>';
                scrollToBottom();
              }
            } catch (err) {
              console.error("Error parsing stream delta:", err);
            }
          }
        }
      }
      
      // Finished
      aiContentDiv.innerHTML = formatMarkdown(botFullText);
      messages.push({ role: "assistant", content: botFullText });

    } catch (err) {
      console.error(err);
      aiContentDiv.innerHTML = `<em>Error: Could not connect to LM Studio. Ensure the local server is running at ${endpointUrlInput.value}</em>`;
    } finally {
      sendBtn.disabled = false;
      userInput.focus();
    }
  });

});
