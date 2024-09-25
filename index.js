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

        // Check if the prompt is music-related
        if (userPrompt.includes('play music') || userPrompt.includes('sing a song') || userPrompt.includes('play') || userPrompt.includes('music') || userPrompt.includes('sing')) {
            const query = userPrompt.replace(/(play music|sing a song|play a song|play|music|sing)/, '').trim();
            try {
                const musicApiUrl = `https://hassan-music-api.vercel.app/music?query=${encodeURIComponent(query)}`;
                const musicApiResponse = await axios.get(musicApiUrl);
                
                if (musicApiResponse.data && musicApiResponse.data.downloadUrl && musicApiResponse.data.title) {
                    const musicTitle = musicApiResponse.data.title;
                    const musicUrl = musicApiResponse.data.downloadUrl;
                    const response = `Here is the song you requested:\n**${musicTitle}**\n[Download or Play the song](${musicUrl})`;
                    chatHistory.push({ response });
                    return res.json({ response });
                } else {
                    throw new Error('No music found.');
                }
            } catch (error) {
                console.error('Error fetching music:', error.message || error);
                const response = `Error fetching music for "${query}": ${error.message}`;
                chatHistory.push({ response });
                return res.json({ response });
            }
        }

        // Check if the prompt mentions "search pexels", "pexels", or is image-related
        if (userPrompt.includes('search pexels') || userPrompt.includes('pexels') || isImageRelated(userPrompt)) {
            try {
                const pexelsQuery = userPrompt.replace('search pexels', '').replace('pexels', '').trim();
                const pexelsApiUrl = `https://h-pexels-v-1.vercel.app/pexels?query=${encodeURIComponent(pexelsQuery)}`;
                const pexelsApiResponse = await axios.get(pexelsApiUrl);

                if (pexelsApiResponse.data.images && pexelsApiResponse.data.images.length > 0) {
                    const imageUrls = pexelsApiResponse.data.images.slice(0, 5); // Limit to 5 images
                    const response = `Here are some images of ${pexelsQuery}: \n${imageUrls.join('\n')}`;
                    chatHistory.push({ response });
                    return res.json({ response });
                } else {
                    throw new Error('No images found on Pexels');
                }
            } catch (error) {
                console.error('Error fetching Pexels images:', error.message || error);
                const response = `Error fetching images for ${pexelsQuery}: ${error.message}`;
                chatHistory.push({ response });
                return res.json({ response });
            }
        }

        // Check if the prompt is related to images (general)
        if (isImageRelated(userPrompt)) {
            const query = userPrompt;
            try {
                const apiUrl = `https://hassan-d-pintrest-project-api.vercel.app/pinterest?query=${encodeURIComponent(query)}`;
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

        // Check if the prompt is asking about the creator
        if (userPrompt.includes('who created you') || userPrompt.includes('your creator')) {
            const response = creatorResponses[Math.floor(Math.random() * creatorResponses.length)];
            chatHistory.push({ response });
            return res.json({ response });
        }

        // Check if the prompt is asking about the model
        if (userPrompt.includes('what model are you') || userPrompt.includes('which model') || userPrompt.includes('your model')) {
            const response = modelResponses[Math.floor(Math.random() * modelResponses.length)];
            chatHistory.push({ response });
            return res.json({ response });
        }

        // Check if the prompt is related to waifu
        if (userPrompt.includes('waifu')) {
            const query = userPrompt.replace('waifu', '').trim();
            try {
                const apiUrl = `https://get-anime-waifu-v-0.vercel.app/waifu?search=${encodeURIComponent(query)}`;
                const waifuApiResponse = await axios.get(apiUrl);

                if (waifuApiResponse.data && waifuApiResponse.data.images.length > 0) {
                    const waifuImage = waifuApiResponse.data.images[0]; // Use the first image
                    const imageUrl = waifuImage.url;
                    const tags = waifuImage.tags.join(', '); // Display tags if any
                    const response = `Here is your waifu: ${tags ? `(${tags})` : ''} \n${imageUrl}`;
                    chatHistory.push({ response });
                    return res.json({ response });
                } else {
                    throw new Error('No waifu found.');
                }
            } catch (error) {
                console.error('Error fetching waifu:', error.message || error);
                const response = `Error fetching waifu: ${error.message}`;
                chatHistory.push({ response });
                return res.json({ response });
            }
        }

        // Check if the prompt is already known (fuzzy matching)
        const similarPrompt = findSimilarPrompt(userPrompt);
        if (similarPrompt) {
            const response = aiMemory[similarPrompt];
            chatHistory.push({ response });
            return res.json({ response });
        }

        // Fallback response for unrecognized prompts
        const fallbackResponse = "Sorry, I couldn't understand that. Could you try asking in a different way?";
        chatHistory.push({ response: fallbackResponse });
        return res.json({ response: fallbackResponse });
    } else {
        const response = "You must provide a prompt!";
        return res.status(400).json({ error: response });
    }
});

// Teach the AI new responses
app.post('/ai/teach', (req, res) => {
    const { key, prompt, response } = req.body;

    if (key !== accessKey) {
        return res.status(403).json({ error: 'Forbidden. Invalid access key.' });
    }

    if (!prompt || !response) {
        return res.status(400).json({ error: 'Both prompt and response are required.' });
    }

    aiMemory[prompt.toLowerCase()] = response;
    saveMemory(); // Save memory after each new learning
    return res.json({ message: 'AI has learned the new prompt-response pair!' });
});

// Clear the AI memory
app.post('/ai/clear', (req, res) => {
    const { key } = req.body;

    if (key !== accessKey) {
        return res.status(403).json({ error: 'Forbidden. Invalid access key.' });
    }

    aiMemory = {}; // Clear memory
    saveMemory(); // Save the empty memory to file
    return res.json({ message: 'AI memory has been cleared!' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
