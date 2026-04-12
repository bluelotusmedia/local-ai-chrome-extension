document.getElementById('request-mic').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop tracks immediately as we just needed the permission token
    stream.getTracks().forEach(track => track.stop());
    
    document.getElementById('status').style.display = 'block';
    
    // Save state in local storage so side panel knows we requested it once
    chrome.storage.local.set({ hasMicPermission: true });
  } catch (err) {
    alert("Microphone permission was denied. Please allow it in the browser URL bar icon.");
    console.error(err);
  }
});

// Check on load
chrome.storage.local.get(['hasMicPermission'], (res) => {
  if (res.hasMicPermission) {
    document.getElementById('status').style.display = 'block';
    document.getElementById('request-mic').innerText = 'Permission Already Granted';
  }
});
