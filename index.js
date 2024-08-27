const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const Fuse = require('fuse.js'); // For fuzzy matching

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let aiMemory = {};

// Define the access key
const accessKey = "Acme12";

// Load learned prompts from file on startup
function loadMemory() {
    try {
        if (fs.existsSync('teach.txt')) {
            const data = fs.readFileSync('teach.txt', 'utf-8');
            aiMemory = JSON.parse(data);
            console.log('Memory loaded successfully:', aiMemory);
        } else {
            console.log('teach.txt file does not exist. Starting with empty memory.');
        }
    } catch (error) {
        console.error('Error loading AI memory:', error);
        aiMemory = {}; // Reset memory in case of error
    }
}

// Save learned prompts to file
function saveMemory() {
    try {
        fs.writeFileSync('teach.txt', JSON.stringify(aiMemory, null, 2));
        console.log('Memory saved successfully:', aiMemory);
    } catch (error) {
        console.error('Error saving AI memory:', error);
    }
}

// Detect if the prompt is related to images
function isImageRelated(prompt) {
    const keywords = ['image', 'images', 'picture', 'pic', 'pics', 'pictures', 'photo', 'photos'];
    return keywords.some(keyword => prompt.includes(keyword));
}

// Fuzzy search for similar prompts
function findSimilarPrompt(userPrompt) {
    const fuse = new Fuse(Object.keys(aiMemory), {
        includeScore: true,
        threshold: 0.4 // Adjust this to control fuzziness
    });
    const results = fuse.search(userPrompt);
    if (results.length > 0) {
        return results[0].item; // Return the closest match
    }
    return null;
}

// Initial load of AI memory
loadMemory();

let chatHistory = [];

// Serve the HTML file
app.use(express.static('public'));

// Random responses for creator and model
const creatorResponses = [
    "Hassan created me❤️. If it was not for them, I wouldn't be here. Do you have any questions you might want to ask me?",
    "Hassan is the genius behind my creation! Without their brilliance, I wouldn't be here today. Got any questions for me?",
    "I owe my existence to Hassan. They brought me to life, and I'm here to assist you! What would you like to ask?",
    "Hassan is the reason I'm here, capable of understanding and chatting with you. Feel free to ask me anything."
];

const modelResponses = [
    "I am based on YAu-5, the fourth generation of Hassan's generative pre-trained transformer models. My specific version is tailored for a conversational experience, making me capable of understanding and generating human-like text responses. Is there something specific you'd like to know about my capabilities?",
    "I’m built on the YAu-5 architecture, the fourth generation of Hassan's amazing generative models. What can I help you with?",
    "My design is based on YAu-5, the latest in a line of Hassan’s powerful AI models. How can I assist you today?",
    "Running on the YAu-5 architecture, I'm part of Hassan's fourth-gen AI. What would you like to know?"
];

// Handle AI queries
app.get('/ai', async (req, res) => {
    const userPrompt = req.query.prompt?.trim().toLowerCase();
    console.log('Received prompt:', userPrompt);

    if (userPrompt) {
        chatHistory.push({ prompt: userPrompt });

        // Check if the prompt mentions "necko"
        if (userPrompt.includes('necko')) {
            try {
                const neckoApiResponse = await axios.get('https://necko.onrender.com/neko');
                const imageUrl = neckoApiResponse.data.imageUrl;
                
                if (imageUrl) {
                    const response = `Here is what I found from the Necko API:\nImage: ${imageUrl}`;
                    chatHistory.push({ response });
                    return res.json({ response });
                } else {
                    throw new Error("Invalid response from Necko API.");
                }
            } catch (error) {
                console.error('Error fetching from Necko API:', error.message || error);
                const response = "Error fetching data from Necko API.";
                chatHistory.push({ response });
                return res.json({ response });
            }
        }

        // (The rest of your code remains unchanged)
        
        // Check if the prompt is asking about the creator
        if (userPrompt.includes('who created you') || userPrompt.includes('your creator')) {
            const response = creatorResponses[Math.floor(Math.random() * creatorResponses.length)];
            chatHistory.push({ response });
            return res.json({ response });
        }

        // Check if the prompt is asking about the model
        if (userPrompt.includes('what model are you') || userPrompt.includes('which model') || userPrompt.includes('your model') || userPrompt.includes('what kind of ai') || userPrompt.includes('kind of ai')) {
            const response = modelResponses[Math.floor(Math.random() * modelResponses.length)];
            chatHistory.push({ response });
            return res.json({ response });
        }

        // Check if the prompt is related to waifu
        if (userPrompt.includes('waifu')) {
            const query = userPrompt.replace('waifu', '').trim();
            try {
                const apiUrl = `https://waifu-18-2bq3.onrender.com/waifu?search=${encodeURIComponent(query)}`;
                const waifuApiResponse = await axios.get(apiUrl);

                if (waifuApiResponse.data && waifuApiResponse.data.images.length > 0) {
                    const waifuImage = waifuApiResponse.data.images[0]; // Use the first image
                    const imageUrl = waifuImage.url;
                    const tags = waifuImage.tags.map(tag => `**${tag.name}**: ${tag.description}`).join('\n');

                    const response = `Here is your waifu for "${query}":\n\n${tags}\n\nImage: ${imageUrl}`;
                    chatHistory.push({ response });
                    return res.json({ response });
                } else {
                    throw new Error('No waifu images found');
                }
            } catch (error) {
                console.error('Error fetching waifu:', error.message || error);
                const response = `Error fetching waifu for "${query}": ${error.message}`;
                chatHistory.push({ response });
                return res.json({ response });
            }
        }

        // Check if the prompt is related to images (general)
        if (isImageRelated(userPrompt)) {
            const query = userPrompt;
            try {
                const apiUrl = `https://pinterest-devh.onrender.com/pinterest?query=${encodeURIComponent(query)}`;
                const resApi = await axios.get(apiUrl);
                const imageUrls = resApi.data.data.slice(0, 10); // Limit to 10 images

                if (imageUrls.length > 0) {
                    const response = `Here are some images of ${query}: \n${imageUrls.join('\n')}`;
                    chatHistory.push({ response });
                    return res.json({ response });
                } else {
                    throw new Error('No images found');
                }
            } catch (error) {
                console.error('Error fetching images:', error.message || error);
                const response = `Error fetching images for ${query}: ${error.message}`;
                chatHistory.push({ response });
                return res.json({ response });
            }
        }

        // Fuzzy matching and memory search
        const similarPrompt = findSimilarPrompt(userPrompt);

        if (similarPrompt) {
            const response = aiMemory[similarPrompt];
            console.log('Found response:', response);
            chatHistory.push({ response });
            res.json({ response });
        } else {
            console.log('Response not found in memory for prompt:', userPrompt);

            // Query an external AI API if no response is found
            try {
                const apiResponse = await axios.get(`https://llama3-cv-shassan.onrender.com/llama3?prompt=${encodeURIComponent(userPrompt)}`);
                const externalResponse = apiResponse.data.response;

                if (apiResponse.status === 200 && externalResponse) {
                    aiMemory[userPrompt] = externalResponse;
                    console.log('Learned from external API:', userPrompt, '->', externalResponse);
                    chatHistory.push({ response: externalResponse });
                    res.json({ response: externalResponse });

                    // Save the updated memory after learning from the external API
                    saveMemory();
                } else {
                    throw new Error("Invalid response from external API");
                }
            } catch (error) {
                console.error('Error querying external API:', error.response?.data || error.message || error);
                const response = "404 Error ❗";
                chatHistory.push({ response });
                res.json({ response });
            }
        }
    } else {
        res.json({ response: "Please provide a prompt." });
    }
});

// Handle teaching new prompts
app.post('/teach', (req, res) => {
    let { prompt, response, key } = req.body;

    // Key validation
    if (key !== accessKey) {
        return res.status(403).json({ response: "Access denied: Invalid key." });
    }

    if (prompt && response) {
        const lowerCasePrompt = prompt.trim().toLowerCase();
        aiMemory[lowerCasePrompt] = response.trim();
        console.log('Learned:', lowerCasePrompt, '->', response);
        saveMemory(); // Save the updated AI memory to file
        res.json({ response: `Learned: "${prompt}" -> "${response}"` });
    } else {
        res.status(400).json({ response: "Invalid data format. Provide both 'prompt' and 'response'." });
    }
});

// Handle chat history retrieval
app.get('/history', (req, res) => {
    res.json({ response: chatHistory });
});

// Inspect the current AI memory
app.get('/inspectMemory', (req, res) => {
    res.json({ response: aiMemory });
});

// Start the server
app.listen(3000, () => {
    console.log('AI server is running on port 3000');
});
