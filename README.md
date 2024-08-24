# CS2 Server Status Bot

A simple bot to monitor and update the status of a Counter-Strike 2 server on Discord using Webhooks. The bot periodically checks the server status and sends updates to a specified Discord channel.

## Features

- Checks server status at regular intervals.
- Sends updates to a Discord channel using Webhooks.
- Displays server details such as player count and current map.
- Automatically updates or creates a message in the Discord channel.

## Requirements

- Node.js (version 14 or higher recommended)
- npm (Node Package Manager)
- Discord Webhook URL
- Steam API Key

## Installation

### 1. Clone the Repository

First, clone the repository to your local machine:

```bash```
git clone https://github.com/ZoniBoy00/CS2-Server-Status-Bot.git
cd CS2-Server-Status-Bot

2. Install Dependencies
Install the required Node.js dependencies by running:

```bash```
npm install
This command installs all the necessary packages listed in the package.json file.

3. Configure the Bot
Create a configuration file named config.js in the project root directory with the following content:

```javascript```
module.exports = {
    SERVER: {
        IP: 'YOUR_SERVER_IP',          // Replace with your server's IP address
        PORT: YOUR_SERVER_PORT,         // Replace with your server's port
        NAME: 'Your Server Name'
    },
    STEAM: {
        API_KEY: 'YOUR_STEAM_API_KEY',  // Replace with your Steam API key
        SERVER_ADDRESS: 'YOUR_SERVER_IP:YOUR_SERVER_PORT'
    },
    DISCORD: {
        WEBHOOK_URL: 'YOUR_DISCORD_WEBHOOK_URL', // Replace with your Discord Webhook URL
        CHECK_INTERVAL: 60000 // Interval in milliseconds (60,000 ms = 1 minute)
    },
    COLORS: {
        ONLINE: '#00FF00',
        OFFLINE: '#FF0000'
    },
    MESSAGE_ID_FILE: 'last_message_id.txt'
};
Replace the placeholders with your actual server details, Steam API key, and Discord webhook URL.

SERVER.IP: The IP address of your Counter-Strike 2 server.
SERVER.PORT: The port number of your server.
SERVER.NAME: A name for your server (for display purposes).
STEAM.API_KEY: Your Steam API key used to query server status.
STEAM.SERVER_ADDRESS: The combined address of your server in IP:PORT format.
DISCORD.WEBHOOK_URL: The URL of your Discord webhook where status updates will be sent.
DISCORD.CHECK_INTERVAL: The interval (in milliseconds) at which the bot checks the server status (default is 60,000 ms or 1 minute).

4. Run the Bot
To start the bot, execute the following command in your terminal:

```bash```
node index.js
The bot will immediately perform a status check and then continue to check the server status at the interval specified in the configuration (CHECK_INTERVAL).

How It Works
Status Check: The bot periodically checks the status of the Counter-Strike 2 server using the Steam Web API.
Embed Message: An embed message is created to display the server status, including whether the server is online or offline, and additional details if online.
Discord Webhook: The bot sends or updates the status message in the specified Discord channel using a webhook.
Configuration Options
SERVER.IP: The IP address of the Counter-Strike 2 server.
SERVER.PORT: The port number of the server.
SERVER.NAME: The name of the server (for display purposes).
STEAM.API_KEY: Your Steam API key for querying server status.
STEAM.SERVER_ADDRESS: The combined address of your server in IP:PORT format.
DISCORD.WEBHOOK_URL: The Discord webhook URL where status updates will be sent.
DISCORD.CHECK_INTERVAL: The interval (in milliseconds) at which the bot checks the server status.
Troubleshooting
Error Saving Message ID: Ensure that the bot has permission to write to the file system.
API Request Failed: Check your API key and server address for correctness.
Discord Webhook Issues: Verify the webhook URL and permissions.
Contributing
Feel free to submit issues or pull requests if you have suggestions or improvements.

License
This project is licensed under the MIT License. See the LICENSE file for details.

