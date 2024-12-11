require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Environment variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Check environment variables
if (!TELEGRAM_TOKEN || !GEMINI_API_KEY || !GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.error("Missing required environment variables. Check .env file.");
    process.exit(1);
}

console.log("Bot is running...");

// Respond to /start command with a welcome message
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = "Welcome to Hemant Sharma's new bot!";
    bot.sendMessage(chatId, welcomeMessage);
});

// Respond to user messages
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userQuery = msg.text.trim();

    // Check if the user query is not empty
    if (!userQuery || userQuery === "/start") {
        return; // Do nothing if the user sends "/start" or an empty message
    }

    // Inform user you're working on it
    bot.sendMessage(chatId, "Let me think...");

    try {
        let answer = "";

        // Query Gemini API for AI-powered answers
        if (GEMINI_API_KEY) {
            try {
                const geminiResponse = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        contents: [
                            {
                                parts: [
                                    { text: userQuery },
                                ],
                            },
                        ],
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Extract the answer from Gemini response
                if (geminiResponse.data?.contents?.[0]?.parts?.[0]?.text) {
                    answer = geminiResponse.data.contents[0].parts[0].text;
                } else {
                    console.log("Gemini API did not return an answer.");
                }
            } catch (geminiError) {
                console.error("Error querying Gemini API:", geminiError.response?.data || geminiError.message);
                answer = "Sorry, I couldn't retrieve an answer from Gemini.";
            }
        }

        // If Gemini API fails, use Google Custom Search API
        if (!answer && GOOGLE_API_KEY && GOOGLE_CSE_ID) {
            try {
                const googleResponse = await axios.get(
                    `https://www.googleapis.com/customsearch/v1`,
                    {
                        params: {
                            q: userQuery,
                            key: GOOGLE_API_KEY,
                            cx: GOOGLE_CSE_ID,
                        },
                    }
                );

                // Check if the Google API returns results
                const searchResults = googleResponse.data.items;
                if (searchResults && searchResults.length > 0) {
                    // Add the answer text (snippet) before appending the links
                    answer = searchResults
                        .slice(0, 3) // Limit to top 3 results
                        .map((item) => {
                            return `${item.snippet}\nMore info: ${item.link}`;
                        })
                        .join("\n\n");
                } else {
                    answer = "Sorry, I couldn't find any relevant results from Google.";
                }
            } catch (googleError) {
                console.error("Error querying Google Custom Search API:", googleError.response?.data || googleError.message);
                answer = "Sorry, there was an error fetching data from Google.";
            }
        }

        // Send the response back to the user
        if (answer) {
            bot.sendMessage(chatId, answer);
        } else {
            bot.sendMessage(chatId, "I couldn't find an answer, try asking differently.");
        }
    } catch (error) {
        console.error("Unexpected error:", error.message);
        bot.sendMessage(chatId, "Something went wrong. Please try again.");
    }
});
