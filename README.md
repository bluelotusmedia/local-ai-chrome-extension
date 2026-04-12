# Local AI Page Chat Chrome Extension

![App Icon](icon128.png)

A fully open-source, privacy-first Google Chrome extension that allows you to chat with a local LLM about the webpage you are currently reading. Zero external API keys needed, zero data sent to external servers. It connects directly to your own local AI server (like [LM Studio](https://lmstudio.ai/)).

## Features
- **Context-Aware Chat:** Reads the text of your active tab and feeds it directly into your local LLM's context.
- **Live Voice Mode:** Talk naturally. The extension features built-in Speech-to-Text (STT) for dictation, and real-time Text-to-Speech (TTS) that reads the AI's responses back to you *as they stream*.
- **100% Private:** Data never leaves your machine. Your requests go directly from your browser to `localhost`.
- **Fast & Lightweight:** Uses Chrome's built-in Web Speech API and streaming fetch functionality.
- **Markdown & Code Support:** Renders the AI's markdown outputs cleanly, complete with one-click copy buttons for AI responses.

## Installation (Developer Mode)

Since this extension communicates entirely via `localhost`, you can easily run it unpacked.

1. **Clone or Download** this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle the **Developer mode** switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the folder containing this repository.

## Setup LM Studio

To use this extension, you need a local AI model running via an OpenAI-compatible API.

1. Download and open [LM Studio](https://lmstudio.ai/).
2. Download a fast local model (e.g., Llama-3-8B-Instruct or Mistral-v0.3).
3. Go to the **Local Server** tab (the `<->` icon) in LM Studio.
4. Ensure the server is running on `http://localhost:1234/v1`.
5. Make sure **CORS is enabled** in the LM Studio server settings (so your browser can connect to it).
6. Click **Start Server**.

## Usage

1. **Pin the Extension:** Click the puzzle piece in Chrome and pin "Local AI Page Chat".
2. **Open the Side Panel:** Click the extension icon. The Chat panel will open.
3. **Grant Microphone Access (Optional):** If you want to use Live Voice Mode, click the Settings (gear) icon in the side panel or right click the extension icon and select "Options". Click "Grant Microphone Access" once so Chrome allows the side panel to hear you!
4. **Chat!** Navigate to any webpage. The extension will automatically read the main content. Ask questions, have it summarize, or click the Microphone icon to talk.

## Privacy Note
This extension requires the `<all_urls>` permission to intelligently extract article text from the active tab. This text is *only* forwarded to the endpoint defined in your settings (`localhost:1234` by default). We do not collect telemetry, usage metrics, or store any prompts externally.
