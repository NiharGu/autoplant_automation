const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const qrcode = require('qrcode-terminal')

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()
  console.log('📱 Using WhatsApp version:', version)

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // 👈 you can change 'silent' to 'info' if you want logs
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📸 Scan this QR code:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('🔌 Connection closed. Reconnecting:', shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connection established')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text
    const sender = msg.key.remoteJid
    console.log(`📥 Message from ${sender}: ${text}`)

    if (text === 'hi') {
      await sock.sendMessage(sender, { text: 'Hello there! 👋' })
    }
  })
}

startBot()
