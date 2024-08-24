const axios = require('axios');
const net = require('net');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    SERVERS: [
        {
            IP: 'SERVER_IP1',
            PORT: SERVER_PORT1,
            NAME: 'SERVER_NAME1',
            STEAM_ADDRESS: 'SERVER_IP:SERVER_PORT1'
        },
        {
            IP: 'SERVER_IP2',
            PORT: SERVER_PORT2,
            NAME: 'SERVER_NAME2',
            STEAM_ADDRESS: 'SERVER_IP:SERVER_PORT2'
        }
    ],
    STEAM: {
        API_KEY: 'STEAM_WEB_API_KEY',
    },
    DISCORD: {
        WEBHOOK_URL: 'DISCORD_WEBHOOK',
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
const checkServerStatusSteam = async (serverAddress) => {
    try {
        const response = await axios.get(`https://api.steampowered.com/IGameServersService/GetServerList/v1/`, {
            params: {
                key: CONFIG.STEAM.API_KEY,
                filter: `addr\\${serverAddress}`,
                limit: 1
            },
            timeout: 5000 // 5 seconds timeout
        });
        
        console.log('Steam API response:', JSON.stringify(response.data, null, 2));  // Debug log
        
        if (response.data?.response?.servers?.length > 0) {
            const serverInfo = response.data.response.servers[0];
            return {
                online: true,
                players: parseInt(serverInfo.players),
                maxPlayers: parseInt(serverInfo.max_players),
                map: serverInfo.map,
                name: serverInfo.name
            };
        } else {
            console.log(`No server info found for ${serverAddress} via Steam API`);
            return null;
        }
    } catch (error) {
        console.error(`Steam Web API request failed for ${serverAddress}:`, error.message);
        return null;
    }
};

// Function to check server status using direct TCP connection
const checkServerStatusDirect = (ip, port) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);  // 5 seconds timeout

        socket.connect(port, ip, () => {
            socket.destroy();
            resolve({ online: true });
        });

        socket.on('error', (error) => {
            console.log(`Direct connection error for ${ip}:${port}:`, error.message);
            resolve({ online: false });
        });

        socket.on('timeout', () => {
            console.log(`Connection timeout for ${ip}:${port}`);
            socket.destroy();
            resolve({ online: false });
        });
    });
};

// Create an embed message for multiple servers
const createStatusEmbed = (statuses) => {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('CS2 Servers Status')
        .setDescription('Current status of all monitored servers')
        .setFooter({ text: 'CS2 Server Status Bot' })
        .setTimestamp();

    statuses.forEach(status => {
        let fieldValue;
        if (status.online) {
            fieldValue = status.players !== undefined
                ? `🟢 Online\nPlayers: ${status.players}/${status.maxPlayers}\nMap: ${status.map}\nName: ${status.name || 'N/A'}`
                : `🟢 Online\n(Detailed info unavailable)`;
        } else {
            fieldValue = '🔴 Offline';
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
        console.log('Checking server statuses...');
        const statuses = await Promise.all(CONFIG.SERVERS.map(async server => {
            let status = await checkServerStatusSteam(server.STEAM_ADDRESS);
            if (!status) {
                console.log(`Falling back to direct connection check for ${server.NAME}`);
                status = await checkServerStatusDirect(server.IP, server.PORT);
            }
            console.log(`Status for ${server.NAME}:`, status);  // Debug log
            return {
                ...status,
                serverName: server.NAME,
                serverAddress: `${server.IP}:${server.PORT}`
            };
        }));
        const currentEmbed = createStatusEmbed(statuses);
        await sendOrUpdateStatusInDiscord(currentEmbed);
    } catch (error) {
        console.error('Error updating server statuses:', error.message);
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
