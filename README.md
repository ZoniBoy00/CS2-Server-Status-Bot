# CS2 Server Status Bot

A lightweight Discord webhook bot that monitors Counter-Strike 2 servers and posts real-time status updates to a Discord channel. Uses the **Steam Web API** for detailed server info (players, map, name) with a **direct TCP fallback** for basic online/offline detection.

## Features

- ✅ Monitors multiple CS2 servers simultaneously
- ✅ Steam Web API for detailed status (player count, map, server name)
- ✅ Direct TCP connection fallback if Steam API is unreachable
- ✅ Auto-retries with exponential backoff on Steam API failures
- ✅ Updates a single Discord message (edits, doesn't spam)
- ✅ Multi-language support (🇬🇧 English / 🇫🇮 Finnish)
- ✅ Graceful shutdown

## Requirements

- **Node.js** v18 or later
- **npm** or **yarn**
- **Steam Web API Key** — free: https://steamcommunity.com/dev/apikey
- **Discord Webhook URL** — create in your Discord channel: Channel Settings → Integrations → Webhooks

## Quick Start

```bash
# Clone
git clone https://github.com/ZoniBoy00/CS2-Server-Status-Bot.git
cd CS2-Server-Status-Bot

# Install dependencies
npm install

# Configure
cp example.env .env
nano .env                        # Edit with your servers and API keys

# Run
npm start
```

## Configuration

Edit `.env` with your server details:

| Variable | Required | Description |
|----------|:--------:|-------------|
| `SERVERS` | ✅ | JSON array of server objects (IP, PORT, NAME, STEAM_ADDRESS) |
| `STEAM_API_KEY` | ✅ | Your Steam Web API key |
| `DISCORD_WEBHOOK_URL` | ✅ | Discord channel webhook URL |
| `CHECK_INTERVAL` | ❌ | Check interval in ms (default: `60000`, min: `10000`) |
| `DEFAULT_LANG` | ❌ | Language: `en` (default) or `fi` |
| `MESSAGE_ID_PATH` | ❌ | Custom path for message ID file (default: `last_message_id.txt`) |

### SERVERS format

```json
SERVERS='[
  {
    "IP": "1.2.3.4",
    "PORT": 27015,
    "NAME": "My CS2 Server",
    "STEAM_ADDRESS": "1.2.3.4:27015"
  }
]'
```

## Running as a Service (systemd)

```
[Unit]
Description=CS2 Server Status Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/CS2-Server-Status-Bot
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save as `/etc/systemd/system/cs2-status-bot.service`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cs2-status-bot
```

## How It Works

1. On startup and every `CHECK_INTERVAL` ms (+ random jitter), the bot queries the **Steam Web API** for each server's current status
2. If the Steam API fails, a **direct TCP connection** to the server port determines if it's online
3. A Discord **embed message** is created showing all servers with player counts, maps, and online/offline status
4. The bot **edits the same message** rather than sending new ones — no channel spam
5. The message ID is persisted to a file so the bot survives restarts

## License

MIT — see [LICENSE](LICENSE).

## Support

If you find this bot useful, consider supporting the original project:

[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg)]([https://www.paypal.com/donate?hosted_button_id=YOUR_BUTTON_ID](https://buymeacoffee.com/zoniboy00))
