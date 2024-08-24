const axios = require('axios');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    SERVER: {
        IP: 'SERVER_IP',           // Replace with your server's IP address
        PORT: SERVER_PORT,         // Replace with your server's port
        NAME: 'SERVER_NAME'        // Replace with your server´s name
    },
    STEAM: {
        API_KEY: 'STEAM_WEB_API_KEY',                // Replace with your steam web api key
        SERVER_ADDRESS: 'SERVER_IP:SERVER_PORT'      // Replace with your server´s IP and port
    },
    DISCORD: {
        WEBHOOK_URL: 'DISCORD_WEBHOOK',        // Replace with your discord webhook
        CHECK_INTERVAL: 60000
    },
    COLORS: {
        ONLINE: '#00FF00',
        OFFLINE: '#FF0000'
    },
    MESSAGE_ID_FILE: 'last_message_id.txt'
};

// Create WebhookClient
const webhookClient = new WebhookClient({ url: CONFIG.DISCORD.WEBHOOK_URL });

// Function to save message ID
const saveMessageId = async (id) => {
    try {
        await fs.writeFile(CONFIG.MESSAGE_ID_FILE, id);
    } catch (error) {
        console.error('Error saving message ID:', error);
    }
};

// Function to load message ID
const loadMessageId = async () => {
    try {
        return await fs.readFile(CONFIG.MESSAGE_ID_FILE, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading message ID:', error);
        }
        return null;
    }
};

// Function to check server status using Steam Web API
const checkServerStatus = async () => {
    try {
        const response = await axios.get(`http://api.steampowered.com/IGameServersService/GetServerList/v1/`, {
            params: {
                key: CONFIG.STEAM.API_KEY,
                filter: `addr\\${CONFIG.STEAM.SERVER_ADDRESS}`
            },
            timeout: 5000 // 5 seconds timeout
        });
        
        if (response.data?.response?.servers?.[0]) {
            const serverInfo = response.data.response.servers[0];
            return {
                online: true,
                players: parseInt(serverInfo.players),
                maxPlayers: parseInt(serverInfo.max_players),
                map: serverInfo.map,
                name: serverInfo.name
            };
        } else {
            return { online: false };
        }
    } catch (error) {
        console.error('Steam Web API request failed:', error.message);
        return { online: false };
    }
};

// Create an embed message
const createStatusEmbed = (status) => {
    const embed = new EmbedBuilder()
        .setColor(status.online ? CONFIG.COLORS.ONLINE : CONFIG.COLORS.OFFLINE)
        .setTitle(`${CONFIG.SERVER.NAME} is ${status.online ? 'ONLINE! 🎮' : 'OFFLINE 🚫'}`)
        .setDescription(status.online ? 'The server is currently available.' : 'The server is currently unavailable. Please try again later.')
        .addFields(
            { name: 'Server Address', value: `${CONFIG.SERVER.IP}:${CONFIG.SERVER.PORT}`, inline: true },
            { name: 'Status', value: status.online ? '🟢 Online' : '🔴 Offline', inline: true },
            { name: 'Last Updated', value: new Date().toLocaleString('en-US'), inline: true }
        )
        .setFooter({ text: 'CS2 Server Status Bot' })
        .setTimestamp();

    if (status.online) {
        embed.addFields(
            { name: 'Players', value: `${status.players}/${status.maxPlayers}`, inline: true },
            { name: 'Current Map', value: status.map, inline: true },
            { name: 'Server Name', value: status.name || 'N/A', inline: true }
        );
    }

    return embed;
};

// Send or update status message in Discord
const sendOrUpdateStatusInDiscord = async (embed) => {
    const messageId = await loadMessageId();

    try {
        if (messageId) {
            await webhookClient.editMessage(messageId, { embeds: [embed] });
            console.log('Message updated in Discord:', new Date().toLocaleString('en-US'));
        } else {
            const message = await webhookClient.send({ embeds: [embed] });
            await saveMessageId(message.id);
            console.log('New message sent to Discord:', new Date().toLocaleString('en-US'));
        }
    } catch (error) {
        console.error('Message update/send to Discord failed:', error.message);
        if (error.code === 10008) { // Unknown Message error
            console.log('Message not found, deleting saved ID and retrying...');
            await saveMessageId('');
            await sendOrUpdateStatusInDiscord(embed);
        }
    }
};

// Main function
const updateServerStatus = async () => {
    try {
        console.log('Checking server status...');
        const status = await checkServerStatus();
        const currentEmbed = createStatusEmbed(status);
        await sendOrUpdateStatusInDiscord(currentEmbed);
    } catch (error) {
        console.error('Error updating server status:', error.message);
    }
};

// Start checking
console.log('CS2 Server Status Bot started', new Date().toLocaleString('en-US'));
updateServerStatus(); // First check immediately
setInterval(updateServerStatus, CONFIG.DISCORD.CHECK_INTERVAL);

// Add global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down bot...');
    await webhookClient.destroy();
    process.exit(0);
});
