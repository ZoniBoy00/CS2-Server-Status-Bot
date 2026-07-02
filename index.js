const axios = require('axios');
const net = require('net');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
require('dotenv').config();
const { translate } = require('./utils/language');
const { validateEnv } = require('./utils/validateEnv');

// Validate environment before doing anything
validateEnv();

// Configuration from environment variables
let SERVERS;
try {
    SERVERS = JSON.parse(process.env.SERVERS || '[]');
    if (!Array.isArray(SERVERS) || SERVERS.length === 0) {
        console.error('Error: SERVERS must be a non-empty JSON array');
        process.exit(1);
    }
} catch (error) {
    console.error(`Error: Invalid SERVERS JSON: ${error.message}`);
    process.exit(1);
}

const CONFIG = {
    SERVERS,
    STEAM: {
        API_KEY: process.env.STEAM_API_KEY,
    },
    DISCORD: {
        WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
        CHECK_INTERVAL: Math.max(10000, parseInt(process.env.CHECK_INTERVAL, 10) || 60000),
    },
    COLORS: {
        ONLINE: '#00FF00',
        OFFLINE: '#FF0000',
        EMBED: '#0099ff',
    },
    MESSAGE_ID_FILE: process.env.MESSAGE_ID_PATH || 'last_message_id.txt',
    RETRY: {
        MAX_ATTEMPTS: 3,
        BASE_DELAY_MS: 1000,
        MAX_DELAY_MS: 10000,
    },
};

// Lazy WebhookClient — created only when needed
let _webhookClient = null;
const getWebhookClient = () => {
    if (!_webhookClient) {
        _webhookClient = new WebhookClient({ url: CONFIG.DISCORD.WEBHOOK_URL });
    }
    return _webhookClient;
};

// Save and load message ID
const saveMessageId = async (id) => {
    try {
        await fs.writeFile(CONFIG.MESSAGE_ID_FILE, id);
    } catch (error) {
        console.error(`Failed to save message ID: ${error.message}`);
    }
};

const loadMessageId = async () => {
    try {
        return await fs.readFile(CONFIG.MESSAGE_ID_FILE, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error reading message ID: ${error.message}`);
        }
        return null;
    }
};

// Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper for Steam API calls
const withRetry = async (fn, context) => {
    let lastError;
    for (let attempt = 1; attempt <= CONFIG.RETRY.MAX_ATTEMPTS; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
                const delay = Math.min(
                    CONFIG.RETRY.BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 1000,
                    CONFIG.RETRY.MAX_DELAY_MS
                );
                console.log(`${context} failed (attempt ${attempt}/${CONFIG.RETRY.MAX_ATTEMPTS}), retrying in ${delay}ms: ${error.message}`);
                await sleep(delay);
            }
        }
    }
    console.error(`${context} failed after ${CONFIG.RETRY.MAX_ATTEMPTS} attempts: ${lastError.message}`);
    return null;
};

// Check server status using Steam Web API
const checkServerStatusSteam = async (serverAddress) => {
    return withRetry(async () => {
        const response = await axios.get('https://api.steampowered.com/IGameServersService/GetServerList/v1/', {
            params: {
                key: CONFIG.STEAM.API_KEY,
                filter: `addr\\${serverAddress}`,
                limit: 1,
            },
            timeout: 5000,
        });

        if (response.data?.response?.servers?.length > 0) {
            const serverInfo = response.data.response.servers[0];
            return {
                online: true,
                players: parseInt(serverInfo.players, 10),
                maxPlayers: parseInt(serverInfo.max_players, 10),
                map: serverInfo.map,
                name: serverInfo.name,
            };
        }

        console.log(`No server info found for ${serverAddress} via Steam API`);
        return null;
    }, `Steam API request for ${serverAddress}`);
};

// Check server status using direct TCP connection
const checkServerStatusDirect = (ip, port) => new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on('connect', () => {
        socket.destroy();
        resolve({ online: true });
    });

    socket.on('error', (error) => {
        console.log(`Direct connection error for ${ip}:${port}: ${error.message}`);
        socket.destroy();
        resolve({ online: false });
    });

    socket.on('timeout', () => {
        console.log(`Connection timeout for ${ip}:${port}`);
        socket.destroy();
        resolve({ online: false });
    });

    socket.connect(port, ip);
});

// Create an embed message for multiple servers
const createStatusEmbed = (statuses) => {
    const totalPlayers = statuses.reduce((sum, s) => sum + (s.players || 0), 0);
    const totalMax = statuses.reduce((sum, s) => sum + (s.maxPlayers || 0), 0);
    const anyOnline = statuses.some((s) => s.online);

    const embed = new EmbedBuilder()
        .setColor(anyOnline ? CONFIG.COLORS.ONLINE : CONFIG.COLORS.OFFLINE)
        .setTitle(translate('embed.title'))
        .setDescription(`${translate('embed.description')} ${totalPlayers}/${totalMax}`)
        .setFooter({ text: translate('embed.footer') })
        .setTimestamp();

    for (const status of statuses) {
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
            inline: false,
        });
    }

    return embed;
};

// Send or update status message in Discord
const sendOrUpdateStatusInDiscord = async (embed) => {
    const messageId = await loadMessageId();
    const client = getWebhookClient();

    try {
        if (messageId) {
            await client.editMessage(messageId, { embeds: [embed] });
            console.log(`[${new Date().toLocaleString()}] Message updated in Discord`);
        } else {
            const message = await client.send({ embeds: [embed] });
            await saveMessageId(message.id);
            console.log(`[${new Date().toLocaleString()}] New message sent to Discord`);
        }
    } catch (error) {
        console.error(`Discord message update/send failed: ${error.message}`);
        if (error.code === 10008) { // Unknown Message
            console.log('Message not found, deleting saved ID and retrying...');
            await saveMessageId('');
            await sendOrUpdateStatusInDiscord(embed);
        }
    }
};

// Main function to update server status
const updateServerStatus = async () => {
    try {
        console.log(`[${new Date().toLocaleString()}] Checking server statuses...`);
        const statuses = await Promise.all(
            CONFIG.SERVERS.map(async (server) => {
                let status = await checkServerStatusSteam(server.STEAM_ADDRESS);
                if (!status) {
                    console.log(`Falling back to direct connection check for ${server.NAME}`);
                    status = await checkServerStatusDirect(server.IP, server.PORT);
                }
                return {
                    ...status,
                    serverName: server.NAME,
                    serverAddress: `${server.IP}:${server.PORT}`,
                };
            })
        );
        const currentEmbed = createStatusEmbed(statuses);
        await sendOrUpdateStatusInDiscord(currentEmbed);
    } catch (error) {
        console.error(`Error updating server statuses: ${error.message}`);
    }
};

// Start checking
console.log(`CS2 Server Status Bot started ${new Date().toLocaleString()}`);
updateServerStatus();

// Add jitter to interval to avoid rate-limit alignment
const intervalMs = CONFIG.DISCORD.CHECK_INTERVAL + Math.floor(Math.random() * 5000);
setInterval(updateServerStatus, intervalMs);

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error(`Fatal: Unhandled rejection: ${reason}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down bot...');
    if (_webhookClient) {
        await _webhookClient.destroy();
    }
    process.exit(0);
});
