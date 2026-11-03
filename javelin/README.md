# J.A.V.E.L.I.N. — Personal Advanced AI Assistant

A browser-only AI chatbot prototype built with HTML5, CSS3, vanilla JavaScript, LocalStorage, and the Google Gemini REST API.

## Project structure

```text
JAVELIN/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    └── javelin-avatar.png
```

## Run it

1. Extract the ZIP.
2. Open `index.html` in a current browser. For best compatibility with browser security and API requests, serve the folder from a simple static web host or a local static-file server. No Node.js, Python, PHP, or backend is required by this project.
3. Click **Settings → API & Model**.
4. Create a Gemini API key in Google's AI Studio, then paste it into the key field.
5. Choose a model available to your account and click **Save & connect**.
6. After the connection test succeeds, start chatting.

Official Gemini REST documentation:
- Generate content endpoint: https://ai.google.dev/api/generate-content
- Gemini API documentation: https://ai.google.dev/gemini-api/docs

## Included functionality

- Real Gemini API requests (no fabricated assistant replies)
- System instructions for the official J.A.V.E.L.I.N. identity
- English, Hindi, and Hinglish response preference, including automatic language matching
- Browser-local conversation history and current conversation restoration
- New chat, open previous chat, search, rename, delete, and clear all
- Copy AI responses and code blocks, regenerate/retry responses, edit a user message by double-clicking it
- Stop generation using AbortController
- Loading indicator, error handling, API rate-limit messages, and connection test
- Model selector with currently supported Gemini model IDs, show/hide API key, disconnect, theme and language preferences
- Voice input via microphone (Web Speech API) that inserts recognized text into the composer without auto-sending
- Scroll-to-bottom button, character count, and refined user message bubbles
- Responsive sidebar/navigation drawer and mobile chat layout
- User-supplied avatar beside each assistant message

## Security and privacy warning

This version deliberately has no backend. A key stored in LocalStorage and used by browser JavaScript is **not completely secure**. It can be exposed through browser developer tools, extensions, or network inspection. Do not publish this project with your personal API key saved. Consider API-key restrictions, usage monitoring, and a backend proxy for any public deployment. Conversations and preferences remain in this browser's LocalStorage unless the browser clears them; they are not synchronized across devices.

## Important model note

The model selector lists currently available stable Gemini models (e.g. gemini-3.8-flash, gemini-4-argon, gemini-3.6-flash, gemini-3.5-flash-lite). Model access depends on current Google availability and your account. If a selected model is not available, choose another from the list. The app's connection test makes an actual API request; a saved key alone is not proof of connectivity. Error messages distinguish invalid keys, rate limits/temporary overload, and model availability issues.

## Testing notes

The project can be statically inspected and syntax-checked locally, but a real Gemini connection test requires your own valid API key and network access. No API key is included in this ZIP.
