import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Pino from 'pino';
import { Boom } from '@hapi/boom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Baileys as a CommonJS module via default
import baileysPkg from '@whiskeysockets/baileys';
// destructure from default export
const {
  default: makeWASocket,
  useMultiFileAuthState, // Updated auth method
  DisconnectReason,
  fetchLatestBaileysVersion,
} = baileysPkg;

// Your logger setup
const logger = Pino({
  transport: {
    target: 'pino/file',
    options: { destination: path.join(__dirname, 'bot.log') },
  },
  level: 'info', // Set the logging level to info
});

// Also log directly to console for immediate feedback
const consoleLogger = Pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  },
  level: 'info',
});

// Create auth directory if it doesn't exist
const authFolder = path.join(__dirname, 'auth');
if (!fs.existsSync(authFolder)) {
  fs.mkdirSync(authFolder, { recursive: true });
}

async function startBot() {
  // Use the new multi-file auth state
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger,
    browser: ['Ubuntu', 'Firefox', '22.04'],
  });
  
  // Update with the new event name
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const senderJid = msg.key.remoteJid;
    
    // Skip if not a group chat
    if (!senderJid.endsWith('@g.us')) return;
    
    // Get the group metadata silently
    try {
        const groupMetadata = await sock.groupMetadata(senderJid);
        const groupName = groupMetadata.subject;
        
        // Only process messages from the "Test" group (note: case-sensitive comparison)
        if (groupName !== "Test") return;
        
        // Get the actual sender info (participant) for group messages
        const participant = msg.key.participant;
        
        // Format phone number properly - strip any non-digit characters
        const formatPhoneNumber = (jid) => {
            if (!jid) return 'unknown';
            // Extract just the number part and remove any non-digit characters
            const numberPart = jid.split('@')[0];
            return numberPart.replace(/\D/g, '');  // Remove any non-digit characters
        };
        
        const senderNumber = participant ? formatPhoneNumber(participant) : formatPhoneNumber(senderJid);
        
        // Find participant details using the JID
        const sender = groupMetadata.participants.find(p => p.id === participant);
        const senderName = sender?.name || 'Unknown';
        
        // Handle different message types
        const textMessage = 
            msg.message.conversation || 
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption;
        
        // Log messages only from "Test" group
        if (textMessage) {
            const logMessage = `📱 Message from ${senderName} (${senderNumber}): ${textMessage}`;
            console.log(logMessage);
            
            // Process commands
            if (textMessage.toLowerCase().startsWith('!echo ')) {
                const response = textMessage.slice(6); // Remove '!echo ' prefix
                await sock.sendMessage(senderJid, { text: response });
                console.log(`✅ Replied with: ${response}`);
            }
            
            // Help command
            else if (textMessage.toLowerCase() === '!help') {
                const helpText = `Available commands:
- !echo [message] - Echo back your message
- !help - Show this help message`;
                
                await sock.sendMessage(senderJid, { text: helpText });
                console.log(`✅ Sent help message`);
            }
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
    }
  });
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = 
        (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;
      
      console.error(`Connection closed: ${lastDisconnect?.error?.message || 'unknown error'}`);
      
      if (shouldReconnect) {
        console.log('Reconnecting...');
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp! Monitoring "Test" group.');
    }
  });
}

// Handle unexpected errors
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
  console.error('Unhandled promise rejection:', reason);
});

console.log('Starting WhatsApp Bot...');
startBot().catch(err => {
  console.error('Failed to start bot:', err.message);
});
