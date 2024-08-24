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

```git clone https://github.com/ZoniBoy00/CS2-Server-Status-Bot.git```
cd CS2-Server-Status-Bot

### 2. Install Dependencies
Install the required Node.js dependencies by running:

```npm install```
This command installs all the necessary packages listed in the package.json file.

### 3. Configure the Bot
Create a configuration file named config.js in the project root directory

### 4. Run the Bot
To start the bot, execute the following command in your terminal:

```node index.js```
The bot will immediately perform a status check and then continue to check the server status at the interval specified in the configuration (CHECK_INTERVAL).

### How It Works
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

