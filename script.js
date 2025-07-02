// DOM element references
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typing-indicator');

// --- START: API Key Configuration ---
// IMPORTANT: You need to get your own API key for the Gemini API.
// 1. Go to Google AI Studio: https://aistudio.google.com/app/apikey
// 2. Create a new API key.
// 3. Paste your API key into the empty string below.
const GEMINI_API_KEY = "AIzaSyCg-t_-QaWPh-HikmgirSuMl192339M6YM"; 
// --- END: API Key Configuration ---


// Store conversation history in memory
let chatHistory = [];

/**
 * Adds a new message to the chat interface.
 * @param {string} sender - Who sent the message ('user' or 'bot').
 * @param {string} message - The content of the message.
 */
function addMessage(sender, message) {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('flex', 'fade-in');

    let messageElement;
    if (sender === 'user') {
        // User message styling
        messageWrapper.classList.add('justify-end');
        messageElement = `
            <div class="bg-indigo-500 text-white p-3 rounded-l-lg rounded-br-lg max-w-xs sm:max-w-md md:max-w-lg">
                <p class="text-sm">${message}</p>
            </div>
        `;
    } else {
        // Bot message styling
        messageWrapper.classList.add('justify-start');
        messageElement = `
            <div class="flex items-start gap-2.5">
                 <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                 </div>
                <div class="bg-gray-700 text-white p-3 rounded-r-lg rounded-bl-lg max-w-xs sm:max-w-md md:max-w-lg">
                    <p class="text-sm">${message}</p>
                </div>
            </div>
        `;
    }
    
    messageWrapper.innerHTML = messageElement;
    messagesContainer.appendChild(messageWrapper);
    // Auto-scroll to the latest message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Fetches a response from the Gemini API based on the conversation history.
 * @param {string} prompt - The user's latest message.
 */
async function getBotResponse(prompt) {
    typingIndicator.classList.remove('hidden');

    if (!GEMINI_API_KEY) {
        addMessage('bot', 'Error: The Gemini API key is missing. Please add it to the script.js file.');
        typingIndicator.classList.add('hidden');
        userInput.disabled = false;
        sendButton.disabled = false;
        return;
    }
    
    // Add the new user message to the history
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    // *** NEW: System instruction to guide the AI's response style ***
    const systemInstruction = {
        parts: [{
            text: "You are a helpful AI assistant. Please keep your answers concise and to the point (around 2-3 sentences), unless the user specifically asks for more details."
        }]
    };

    const payload = {
        contents: chatHistory,
        systemInstruction: systemInstruction // Add the instruction to the payload
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed with status ${response.status}: ${errorData.error.message}`);
        }
        
        const result = await response.json();
        
        let botMessage = "Sorry, I couldn't get a response. Please try again.";
        // Check for safety ratings and blocked content
        if (result.candidates && result.candidates.length > 0) {
            if (result.candidates[0].finishReason === "SAFETY") {
                 botMessage = "I cannot answer this question as it violates safety policies.";
            } else if (result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                 botMessage = result.candidates[0].content.parts[0].text;
            }
        }
        
        // Add the bot's response to the history and the UI
        chatHistory.push({ role: "model", parts: [{ text: botMessage }] });
        addMessage('bot', botMessage);

    } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        addMessage('bot', `There was an error processing your request: ${error.message}`);
    } finally {
        // Re-enable input after getting a response
        typingIndicator.classList.add('hidden');
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

/**
 * Handles the logic for sending a user's message.
 */
function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText) {
        addMessage('user', messageText);
        userInput.value = '';
        // Disable input while the bot is thinking
        userInput.disabled = true;
        sendButton.disabled = true;
        getBotResponse(messageText);
    }
}

// --- Event Listeners ---

// Handle click on the send button
sendButton.addEventListener('click', sendMessage);

// Handle pressing "Enter" in the input field
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Display the initial welcome message when the page loads
window.onload = () => {
     addMessage('bot', 'Hello! I am your AI Assistant. How can I help you today?');
};
