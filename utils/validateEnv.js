const { config } = require('dotenv');

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = [
    'STEAM_API_KEY',
    'DISCORD_WEBHOOK_URL',
    'SERVERS'
];

const validateEnv = () => {
    requiredEnvVars.forEach((envVar) => {
        if (!process.env[envVar]) {
            console.error(`Error: Missing required environment variable ${envVar}`);
            process.exit(1); // Exit with an error code
        }
    });
};

module.exports = { validateEnv };
