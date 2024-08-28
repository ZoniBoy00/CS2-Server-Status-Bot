const axios = require('axios');
const net = require('net');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
require('dotenv').config(); // For environment variables
const { translate } = require('./utils/language');

// Configuration from environment variables
const CONFIG = {
    SERVERS: JSON.parse(process.env.SERVERS || '[]'),
    STEAM: {
        API_KEY: process.env.STEAM_API_KEY || '',
    },
    DISCORD: {
        WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || '',
        CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL, 10) || 60000
    },
    COLORS: {
        ONLINE: '#00FF00',
        OFFLINE: '#FF0000'
    },
    MESSAGE_ID_FILE: 'last_message_id.txt'
};

// Create WebhookClient
const webhookClient = new WebhookClient({ url: CONFIG.DISCORD.WEBHOOK_URL });

// Utility function to handle file operations safely
const fileOperation = async (operation, data) => {
    try {
        await operation(data);
    } catch (error) {
        console.error(`File operation failed: ${error.message}`);
    }
};

// Save and load message ID
const saveMessageId = (id) => fileOperation(() => fs.writeFile(CONFIG.MESSAGE_ID_FILE, id));
const loadMessageId = async () => {
    try {
        return await fs.readFile(CONFIG.MESSAGE_ID_FILE, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') console.error(`Error reading message ID: ${error.message}`);
        return null;
    }
};

// Check server status using Steam Web API
const checkServerStatusSteam = async (serverAddress) => {
    try {
        const response = await axios.get('https://api.steampowered.com/IGameServersService/GetServerList/v1/', {
            params: {
                key: CONFIG.STEAM.API_KEY,
                filter: `addr\\${serverAddress}`,
                limit: 1
            },
            timeout: 5000 // 5 seconds timeout
        });

        if (response.data?.response?.servers?.length > 0) {
            const serverInfo = response.data.response.servers[0];
            return {
                online: true,
                players: parseInt(serverInfo.players, 10),
                maxPlayers: parseInt(serverInfo.max_players, 10),
                map: serverInfo.map,
                name: serverInfo.name
            };
        } else {
            console.log(`No server info found for ${serverAddress} via Steam API`);
            return null;
        }
    } catch (error) {
        console.error(`Steam Web API request failed for ${serverAddress}: ${error.message}`);
        return null;
    }
};

// Check server status using direct TCP connection
const checkServerStatusDirect = (ip, port) => new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000); // 5 seconds timeout

    socket.connect(port, ip, () => {
        socket.destroy();
        resolve({ online: true });
    });

    socket.on('error', (error) => {
        console.log(`Direct connection error for ${ip}:${port}: ${error.message}`);
        resolve({ online: false });
    });

    socket.on('timeout', () => {
        console.log(`Connection timeout for ${ip}:${port}`);
        socket.destroy();
        resolve({ online: false });
    });
});

// Create an embed message for multiple servers
const createStatusEmbed = (statuses) => {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(translate('embed.title'))
        .setDescription(`${translate('embed.description')} ${statuses.reduce((total, status) => total + (status.players || 0), 0)}/${statuses.reduce((total, status) => total + (status.maxPlayers || 0), 0)}`)
        .setFooter({ text: translate('embed.footer') })
        .setTimestamp();

    statuses.forEach(status => {
        let fieldValue;
        if (status.online) {
            fieldValue = status.players !== undefined
                ? `${translate('status.online')}\n${translate('status.players')}: ${status.players}/${status.maxPlayers}\n${translate('status.map')}: ${status.map}\n${translate('status.name')}: ${status.name || translate('status.no_info')}`
                : `${translate('status.online')}\n${translate('status.no_info')}`;
        } else {
            fieldValue = translate('status.offline');
        }

        embed.addFields({
            name: `${status.serverName} (${status.serverAddress})`,
            value: fieldValue,
            inline: false
        });
    });

    return embed;
};

// Send or update status message in Discord
const sendOrUpdateStatusInDiscord = async (embed) => {
    const messageId = await loadMessageId();

    try {
        if (messageId) {
            await webhookClient.editMessage(messageId, { embeds: [embed] });
            console.log(`Message updated in Discord: ${new Date().toLocaleString()}`);
        } else {
            const message = await webhookClient.send({ embeds: [embed] });
            await saveMessageId(message.id);
            console.log(`New message sent to Discord: ${new Date().toLocaleString()}`);
        }
    } catch (error) {
        console.error(`Message update/send to Discord failed: ${error.message}`);
        if (error.code === 10008) { // Unknown Message error
            console.log('Message not found, deleting saved ID and retrying...');
            await saveMessageId('');
            await sendOrUpdateStatusInDiscord(embed);
        }
    }
};

// Main function to update server status
const updateServerStatus = async () => {
    try {
        console.log('Checking server statuses...');
        const statuses = await Promise.all(CONFIG.SERVERS.map(async server => {
            let status = await checkServerStatusSteam(server.STEAM_ADDRESS);
            if (!status) {
                console.log(`Falling back to direct connection check for ${server.NAME}`);
                status = await checkServerStatusDirect(server.IP, server.PORT);
            }
            return {
                ...status,
                serverName: server.NAME,
                serverAddress: `${server.IP}:${server.PORT}`
            };
        }));
        const currentEmbed = createStatusEmbed(statuses);
        await sendOrUpdateStatusInDiscord(currentEmbed);
    } catch (error) {
        console.error(`Error updating server statuses: ${error.message}`);
    }
};

// Start checking
console.log(`CS2 Server Status Bot started ${new Date().toLocaleString()}`);
updateServerStatus(); // First check immediately
setInterval(updateServerStatus, CONFIG.DISCORD.CHECK_INTERVAL);

// Add global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.error(`Unhandled rejection: ${reason}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down bot...');
    await webhookClient.destroy();
    process.exit(0);
});
