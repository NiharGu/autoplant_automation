import baileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = baileys;

const logger = pino({ level: 'info' }, pino.destination('./messages.log'));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Firefox', '22.04.4']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR code with your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🛑 Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe || !msg.key.remoteJid.endsWith('@g.us')) continue;

      const metadata = await sock.groupMetadata(msg.key.remoteJid);
      const groupName = metadata.subject.toLowerCase();

      if (groupName === 'test') {
        const sender = msg.key.participant;
        const messageText =
          msg.message.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '[non-text message]';

        const logMsg = `👥 [${metadata.subject}] ${sender}: ${messageText}`;
        logger.info(logMsg);
        console.log(logMsg);
      }
    }
  });
}

startBot();
