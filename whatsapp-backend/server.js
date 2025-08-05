
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

class WhatsAppService {
  constructor(io) {
    this.io = io;
    this.sessions = new Map();
    this.clients = new Map();
    this.sessionSockets = new Map(); // Track sockets per session
  }

  // Add socket to session tracking
  addSocketToSession(sessionId, socket) {
    if (!this.sessionSockets.has(sessionId)) {
      this.sessionSockets.set(sessionId, new Set());
    }
    this.sessionSockets.get(sessionId).add(socket);
    console.log(`👤 Socket ${socket.id} joined session: ${sessionId}`);
  }

  // Remove socket from all sessions
  removeSocket(socket) {
    for (const [sessionId, sockets] of this.sessionSockets.entries()) {
      if (sockets.has(socket)) {
        sockets.delete(socket);
        console.log(`👤 Socket ${socket.id} left session: ${sessionId}`);
        if (sockets.size === 0) {
          this.sessionSockets.delete(sessionId);
        }
      }
    }
  }

  // Emit to all sockets in a session
  emitToSession(sessionId, event, data) {
    const sockets = this.sessionSockets.get(sessionId);
    if (sockets) {
      console.log(`📡 Emitting ${event} to ${sockets.size} sockets for session: ${sessionId}`);
      sockets.forEach(socket => {
        socket.emit(event, { ...data, session_id: sessionId });
      });
    }
  }

  async initializeSession(sessionId) {
    try {
      console.log(`🚀 Initializing WhatsApp session: ${sessionId}`);

      // Clean up existing session if any
      if (this.clients.has(sessionId)) {
        await this.disconnectSession(sessionId);
      }

      // Create new client instance
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Set up event handlers BEFORE initializing
      this.setupClientEvents(client, sessionId);

      // Store client and initialize
      this.clients.set(sessionId, client);
      this.sessions.set(sessionId, {
        status: 'connecting',
        created_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
        qr_retries: 0,
        connection_attempts: 0
      });

      // Emit initial connecting state
      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'connecting',
        ready: false,
        qr_available: false,
        message: 'Initializing WhatsApp client...'
      });

      // Initialize client
      await client.initialize();
      
      return sessionId;
    } catch (error) {
      console.error(`❌ Error initializing session ${sessionId}:`, error);
      
      // Update session state and emit error
      if (this.sessions.has(sessionId)) {
        this.sessions.get(sessionId).status = 'error';
        this.sessions.get(sessionId).last_update = new Date().toISOString();
      }

      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'error',
        ready: false,
        qr_available: false,
        message: error.message
      });

      throw error;
    }
  }

  setupClientEvents(client, sessionId) {
    console.log(`⚡ Setting up events for session: ${sessionId}`);

    client.on('qr', async (qr) => {
      try {
        console.log(`📱 QR Code generated for session: ${sessionId}`);
        
        const qrCodeDataURL = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
        
        // Update session state
        const session = this.sessions.get(sessionId);
        if (session) {
          session.status = 'qr_ready';
          session.qr_code = qrCodeDataURL;
          session.last_update = new Date().toISOString();
          session.qr_retries = (session.qr_retries || 0) + 1;
        }

        // Emit QR ready status immediately
        this.emitToSession(sessionId, 'whatsapp_status', {
          status: 'qr_ready',
          ready: false,
          qr_available: true,
          qr_code: qrCodeDataURL,
          message: 'QR Code ready - scan to connect'
        });

        // Also emit specific qr_code event for backward compatibility
        this.emitToSession(sessionId, 'qr_code', {
          qr: qrCodeDataURL,
          qr_code: qrCodeDataURL
        });

      } catch (error) {
        console.error(`❌ QR Code generation error for ${sessionId}:`, error);
        this.emitToSession(sessionId, 'whatsapp_status', {
          status: 'error',
          ready: false,
          qr_available: false,
          message: 'QR Code generation failed'
        });
      }
    });

    client.on('ready', () => {
      console.log(`✅ WhatsApp client ready for session: ${sessionId}`);
      
      // Update session state
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'connected';
        session.connected_at = new Date().toISOString();
        session.last_update = new Date().toISOString();
        session.qr_code = null; // Clear QR code when connected
      }

      // Emit connected status immediately
      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'connected',
        ready: true,
        qr_available: false,
        connected_at: new Date().toISOString(),
        message: 'WhatsApp connected successfully'
      });

      // Also emit specific connection_success event
      this.emitToSession(sessionId, 'connection_success', {
        message: 'WhatsApp connected successfully',
        connected_at: new Date().toISOString()
      });
    });

    client.on('authenticated', () => {
      console.log(`🔐 WhatsApp authenticated for session: ${sessionId}`);
      
      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'authenticated',
        ready: false,
        qr_available: false,
        message: 'Authentication successful'
      });
    });

    client.on('auth_failure', (message) => {
      console.error(`❌ WhatsApp auth failure for session ${sessionId}:`, message);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'error';
        session.last_update = new Date().toISOString();
      }

      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'error',
        ready: false,
        qr_available: false,
        message: 'Authentication failed'
      });

      this.emitToSession(sessionId, 'connection_error', {
        message: 'Authentication failed',
        error: message
      });
    });

    client.on('disconnected', (reason) => {
      console.log(`🔌 WhatsApp disconnected for session ${sessionId}:`, reason);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'disconnected';
        session.last_update = new Date().toISOString();
        session.qr_code = null;
      }

      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'disconnected',
        ready: false,
        qr_available: false,
        message: 'WhatsApp disconnected'
      });

      this.emitToSession(sessionId, 'disconnected', {
        reason: reason,
        message: 'WhatsApp disconnected'
      });

      // Clean up client
      this.clients.delete(sessionId);
    });

    client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Loading screen for ${sessionId}: ${percent}% - ${message}`);
      
      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'connecting',
        ready: false,
        qr_available: false,
        message: `Loading: ${percent}% - ${message}`
      });
    });
  }

  async getSessionStatus(sessionId) {
    let session = this.sessions.get(sessionId);
    let client = this.clients.get(sessionId);
    
    // 🔥 CRITICAL FIX: Try to restore existing WhatsApp session if not in memory
    if (!session || !client) {
      console.log(`🔄 Session ${sessionId} not in memory, checking for existing auth...`);
      
      try {
        // Create a client to check if there's existing auth
        const testClient = new Client({
          authStrategy: new LocalAuth({ clientId: sessionId }),
          puppeteer: { headless: true, args: ['--no-sandbox'] }
        });
        
        // Don't initialize, just check if auth exists
        const authExists = await new Promise((resolve) => {
          testClient.on('authenticated', () => {
            console.log(`✅ Found existing auth for session: ${sessionId}`);
            resolve(true);
          });
          
          testClient.on('qr', () => {
            console.log(`📱 No existing auth for session: ${sessionId}`);
            resolve(false);
          });
          
          testClient.on('auth_failure', () => {
            console.log(`❌ Auth failed for session: ${sessionId}`);
            resolve(false);
          });
          
          // Initialize to trigger auth check
          testClient.initialize().catch(() => resolve(false));
          
          // Timeout after 5 seconds
          setTimeout(() => resolve(false), 5000);
        });
        
        // Clean up test client
        try {
          await testClient.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        
        if (authExists) {
          // Restore the session
          console.log(`🔄 Restoring authenticated session: ${sessionId}`);
          await this.initializeSession(sessionId);
          session = this.sessions.get(sessionId);
          client = this.clients.get(sessionId);
        }
        
      } catch (error) {
        console.error(`❌ Error checking session auth:`, error);
      }
    }
    
    if (!session) {
      return {
        status: 'not_found',
        ready: false,
        qr_available: false,
        message: 'Session not found'
      };
    }

    const connectedSockets = this.sessionSockets.get(sessionId)?.size || 0;
    
    return {
      status: session.status,
      ready: session.status === 'connected',
      qr_available: session.status === 'qr_ready' && !!session.qr_code,
      qr_code: session.qr_code,
      created_at: session.created_at,
      connected_at: session.connected_at,
      last_update: session.last_update,
      qr_retries: session.qr_retries || 0,
      connection_attempts: session.connection_attempts || 0,
      connected_sockets: connectedSockets,
      message: this.getStatusMessage(session.status)
    };
  }

  getStatusMessage(status) {
    switch (status) {
      case 'connecting': return 'Initializing WhatsApp connection...';
      case 'qr_ready': return 'QR Code ready - scan to connect';
      case 'connected': return 'WhatsApp connected and ready';
      case 'authenticated': return 'Authentication successful';
      case 'error': return 'Connection error occurred';
      case 'disconnected': return 'WhatsApp disconnected';
      default: return 'Unknown status';
    }
  }

  async sendMessage(sessionId, phone, message) {
    let client = this.clients.get(sessionId);
    let session = this.sessions.get(sessionId);
    
    // 🔥 CRITICAL FIX: If session not found, try to restore/reinitialize
    if (!client || !session) {
      console.log(`🔄 Session ${sessionId} not found in memory, attempting to restore...`);
      
      // Check if this is a valid session that should exist
      // For now, try to reinitialize it
      try {
        await this.initializeSession(sessionId);
        client = this.clients.get(sessionId);
        session = this.sessions.get(sessionId);
        
        // Wait a moment for connection to establish
        if (session && session.status === 'connecting') {
          console.log('⏳ Waiting for session to connect...');
          // Return a more helpful error for now
          throw new Error('Session is reconnecting. Please try again in a few moments.');
        }
      } catch (initError) {
        console.error(`❌ Failed to restore session ${sessionId}:`, initError);
        throw new Error('Session expired or invalid. Please reconnect WhatsApp.');
      }
    }
    
    if (!client) {
      throw new Error('Session not found or expired. Please reconnect WhatsApp.');
    }
    
    if (!session || session.status !== 'connected') {
      throw new Error(`WhatsApp not connected (status: ${session?.status || 'unknown'}). Please reconnect.`);
    }
    
    try {
      const chatId = phone.includes('@') ? phone : `${phone}@c.us`;
      const result = await client.sendMessage(chatId, message);
      
      console.log(`📤 Message sent successfully to ${phone} via session ${sessionId}`);
      return {
        success: true,
        message: 'Message sent successfully',
        result: {
          key: {
            remoteJid: result.to,
            fromMe: result.fromMe,
            id: result.id._serialized
          },
          message: {
            extendedTextMessage: { text: message }
          },
          messageTimestamp: Math.floor(Date.now() / 1000).toString(),
          status: 'PENDING'
        }
      };
    } catch (error) {
      console.error(`❌ Failed to send message via session ${sessionId}:`, error);
      throw error;
    }
  }

  async disconnectSession(sessionId) {
    try {
      const client = this.clients.get(sessionId);
      
      if (client) {
        await client.destroy();
        this.clients.delete(sessionId);
      }
      
      // Update session status
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'disconnected';
        session.last_update = new Date().toISOString();
        session.qr_code = null;
      }

      // Emit disconnected status
      this.emitToSession(sessionId, 'whatsapp_status', {
        status: 'disconnected',
        ready: false,
        qr_available: false,
        message: 'Session disconnected'
      });

      // Clean up socket tracking
      this.sessionSockets.delete(sessionId);
      
      console.log(`🔌 Session ${sessionId} disconnected and cleaned up`);
    } catch (error) {
      console.error(`❌ Error disconnecting session ${sessionId}:`, error);
      throw error;
    }
  }

  cleanupSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastUpdate = new Date(session.last_update).getTime();
      
      if (now - lastUpdate > maxAge) {
        console.log(`🧹 Cleaning up old session: ${sessionId}`);
        this.disconnectSession(sessionId);
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = WhatsAppService;
