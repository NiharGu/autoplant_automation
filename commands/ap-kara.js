// Ap Kara Command Handler for Baileys Bot
// Extracts data from replied message using pattern matching
import axios from 'axios';
import express from 'express';

// Create Express server to receive messages from Python
const app = express();
app.use(express.json());

// Store the WhatsApp socket globally so we can use it in routes
let globalSock = null;

// Store message contexts for replies
const messageContexts = new Map();


// Pattern definitions for data extraction
const dataPatterns = {
    // Vehicle number: xx11xx1111 format (2 letters, 2 digits, 2 letters, 4 digits)
    vehicleNumber: /\b[A-Za-z]{2}\d{1,2}[A-Za-z]{1,2}\d{3,4}\b/,
    
    // SO Number: 10-digit number starting with 2200
    soNumber: /\b2200\d{6}\b/,
    
    // Phone Number: 10-digit number NOT starting with 2200
    phoneNumber: /\b(?!2200)\d{10}\b/,
    
    // Weight: number followed by "MT" (exact match)
    weight: /\b(\d+(?:\.\d+)?)\s*MT\b/i,
    
    // Destination: string before weight (number + MT) in the same line
    destinationBeforeWeight: /^(.*?)\s+\d+(?:\.\d+)?\s*MT\b/i,
    
    // Driver license last 4 digits
    driverLicense: /\b\d{4}\b/
};

// Pattern-based extraction
function extractDataFromMessage(messageText) {
    if (!messageText) return null;
    
    const result = {
        vehicle_num: null,
        destination: null,
        weight: null,
        so_no: null,
        phone_num: null,
        driver_license: null,
        driver_name: null
    };

    // Extract vehicle number
    const vehicleMatch = messageText.match(dataPatterns.vehicleNumber);
    if (vehicleMatch) {
        result.vehicle_num = vehicleMatch[0];
    }

    // Extract phone number (10-digit NOT starting with 2200)
    const phoneMatch = messageText.match(dataPatterns.phoneNumber);
    if (phoneMatch) {
        result.phone_num = phoneMatch[0];
    }

    // Extract SO number (10-digit starting with 2200)
    const soMatch = messageText.match(dataPatterns.soNumber);
    if (soMatch) {
        result.so_no = soMatch[0];
    }

    // Extract weight (number followed by MT)
    const weightMatch = messageText.match(dataPatterns.weight);
    if (weightMatch) {
        result.weight = weightMatch[1];
    }

    // Extract destination (string before weight in same line)
    const lines = messageText.split('\n');
    for (let line of lines) {
        if (line.match(dataPatterns.weight)) {
            const destMatch = line.match(dataPatterns.destinationBeforeWeight);
            if (destMatch) {
                // Remove vehicle number from beginning if present
                let destination = destMatch[1].trim();
                const vehicleMatch = destination.match(dataPatterns.vehicleNumber);
                if (vehicleMatch) {
                    destination = destination.replace(vehicleMatch[0], '').trim();
                }
                result.destination = destination;
                break;
            }
        }
    }

    return result;
}

// Line-based fallback extraction
function extractDataByLines(messageText) {
    const lines = messageText.split('\n').map(line => line.trim()).filter(line => line);

    const result = {
        vehicle_num: null,
        destination: null,
        weight: null,
        so_no: null,
        phone_num: null,
        driver_license: null,
        driver_name: null
    };

    // Check each line for patterns
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Vehicle number (usually first line)
        if (!result.vehicle_num) {
            const vehicleMatch = line.match(dataPatterns.vehicleNumber);
            if (vehicleMatch) {
                result.vehicle_num = vehicleMatch[0];
            }
        }
        
        // Phone number (10-digit NOT starting with 2200)
        if (!result.phone_num) {
            const phoneMatch = line.match(dataPatterns.phoneNumber);
            if (phoneMatch) {
                result.phone_num = phoneMatch[0];
            }
        }
        
        // SO Number (10-digit starting with 2200)
        if (!result.so_no) {
            const soMatch = line.match(dataPatterns.soNumber);
            if (soMatch) {
                result.so_no = soMatch[0];
            }
        }
        
        // Weight (number followed by MT)
        if (!result.weight) {
            const weightMatch = line.match(dataPatterns.weight);
            if (weightMatch) {
                result.weight = weightMatch[1]; // Extract just the number, not the full match
            }
        }

        // Weight and destination from same line
        const weightMatch = line.match(dataPatterns.weight);
        if (weightMatch && !result.weight) {
            result.weight = weightMatch[1]; // Fixed: Extract just the number
            
            // Extract destination from the same line (everything before the weight)
            if (!result.destination) {
                const destMatch = line.match(dataPatterns.destinationBeforeWeight);
                if (destMatch) {
                    let destination = destMatch[1].trim();
                    // Remove vehicle number from beginning if present
                    const vehicleMatch = destination.match(dataPatterns.vehicleNumber);
                    if (vehicleMatch) {
                        destination = destination.replace(vehicleMatch[0], '').trim();
                    }
                    result.destination = destination;
                }
            }
        }
    }

    return result;
}

// New function to extract driver info from ap kara command
function extractDriverInfo(messageText) {
    const lines = messageText.split('\n').map(line => line.trim()).filter(line => line);
    
    const result = {
        driver_name: null,
        driver_license: null,
        additional_data: {
            vehicle_num: null,
            destination: null,
            weight: null,
            so_no: null,
            phone_num: null
        }
    };

    // Skip the first line (ap kara command)
    if (lines.length < 2) return result;

    // Second line should contain driver name and license
    const driverLine = lines[1];
    
    // Find 4-digit number (driver license)
    const licenseMatch = driverLine.match(dataPatterns.driverLicense);
    if (licenseMatch) {
        result.driver_license = licenseMatch[0];
        
        // Extract driver name (everything before the 4 digits)
        let nameBeforeLicense = driverLine.substring(0, driverLine.indexOf(licenseMatch[0])).trim();
        
        // Remove trailing hyphen if present
        if (nameBeforeLicense.endsWith('-')) {
            nameBeforeLicense = nameBeforeLicense.slice(0, -1).trim();
        }
        
        if (nameBeforeLicense) {
            result.driver_name = nameBeforeLicense;
        }
        
        // Extract additional text after the 4 digits
        const textAfterLicense = driverLine.substring(driverLine.indexOf(licenseMatch[0]) + 4).trim();
        
        // If there's more text after the license, combine it with remaining lines for data extraction
        let additionalText = textAfterLicense;
        if (lines.length > 2) {
            additionalText += '\n' + lines.slice(2).join('\n');
        }
        
        if (additionalText.trim()) {
            // Extract data from additional text using existing patterns
            const additionalData = extractDataFromMessage(additionalText);
            result.additional_data = additionalData;
        }
    }

    return result;
}

// Modified function to send data to Python with callback info and handle success/error responses
async function sendToPython(finalData, chatId, originalMessage) {
    try {
        const pythonData = {
            driver_name: finalData.driver_name || null,
            driver_license: finalData.driver_license || null,
            vehicle_num: finalData.vehicle_num || null,
            destination: finalData.destination || null,
            weight: finalData.weight || null,
            so_no: finalData.so_no || null,
            phone_num: finalData.phone_num || null,
            chat_id: chatId, // Send chat ID so Python knows where to reply
            message_key: originalMessage.key // Send message key for replies
        };

        // Store message context for replies
        messageContexts.set(chatId, {
            messageKey: originalMessage.key,
            originalMessage: originalMessage,
            timestamp: Date.now()
        });

        console.log(`💾 Stored message context for ${chatId}:`, originalMessage.key);

        console.log('Sending data to Python...', JSON.stringify(pythonData, null, 2));
        
        const response = await axios.post('http://localhost:5000/process-data', pythonData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 300000  // 30 seconds timeout
        });

        console.log('✅ Python response:', response.data);

        // Handle successful response from Python
        if (response.data && response.data.status === 'success') {
            // Send success message as reply to the original ap kara message
            if (globalSock && chatId) {
                let successMessage = '✅ *Processing Completed Successfully!*\n\n';
                successMessage += '📋 *Processed Data:*\n';
                
                const processedData = response.data.processed_data;
                if (processedData) {
                    if (processedData.driver_name) {
                        successMessage += `👤 Driver Name: ${processedData.driver_name}\n`;
                    }
                    if (processedData.driver_license) {
                        successMessage += `🆔 License: ${processedData.driver_license}\n`;
                    }
                    if (processedData.vehicle_num) {
                        successMessage += `🚛 Vehicle: ${processedData.vehicle_num}\n`;
                    }
                    if (processedData.destination) {
                        successMessage += `📍 Destination: ${processedData.destination}\n`;
                    }
                    if (processedData.weight) {
                        successMessage += `⚖️ Weight: ${processedData.weight} MT\n`;
                    }
                    if (processedData.so_no) {
                        successMessage += `📋 SO Number: ${processedData.so_no}\n`;
                    }
                    if (processedData.phone_num) {
                        successMessage += `📞 Phone: ${processedData.phone_num}\n`;
                    }
                }
                
                successMessage += '\n🎉 All processes executed successfully!';

                await globalSock.sendMessage(chatId, { 
                    text: successMessage
                }, { 
                    quoted: originalMessage
                });
                
                console.log('✅ Success message sent to WhatsApp');
            }
        }

        return response.data;

    } catch (error) {
        console.error('❌ Error sending to Python:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        // Handle error responses from Python
        if (globalSock && chatId) {
            let errorMessage = '❌ *Processing Failed*\n\n';
            
            // Check if it's a structured error response from Python
            if (error.response?.data?.status === 'error') {
                errorMessage += `*Error:* ${error.response.data.message}`;
            } else {
                // Generic error handling
                const genericError = error.response?.data?.message || 
                                   error.response?.message || 
                                   error.message || 
                                   'An unexpected error occurred while processing your request.';
                errorMessage += `*Error:* ${genericError}`;
            }
            
            errorMessage += '\n\n🔄 Please try again or contact support if the issue persists.';
            
            await globalSock.sendMessage(chatId, { 
                text: errorMessage
            }, { 
                quoted: originalMessage
            });
            
            console.log('❌ Error message sent to WhatsApp');
        }
        
        return null;
    }
}

// MODIFIED: Route to receive messages from Python with reply functionality
app.post('/send-message', async (req, res) => {
    try {
        const { chat_id, message, message_type = 'text', reply_to_original = false } = req.body;
        
        if (!chat_id || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'chat_id and message are required' 
            });
        }

        if (!globalSock) {
            return res.status(500).json({ 
                success: false, 
                error: 'WhatsApp socket not available' 
            });
        }

        // Prepare message payload
        let messagePayload;
        
        if (message_type === 'text') {
            messagePayload = { text: message };
        } else if (message_type === 'image') {
            // Handle image messages if needed
            messagePayload = { 
                image: { url: message.url }, 
                caption: message.caption || '' 
            };
        }

        // Add reply context if requested and available
        if (reply_to_original) {
            const messageContext = messageContexts.get(chat_id);
            if (messageContext && messageContext.messageKey) {
                messagePayload.quoted = messageContext.messageKey;
                console.log(`📎 Adding reply context for ${chat_id}:`, messageContext.messageKey);
            } else {
                console.log(`⚠️ No message context found for ${chat_id} or missing messageKey`);
            }
        }

        await globalSock.sendMessage(chat_id, messagePayload);
        
        console.log(`✅ Message sent to ${chat_id}${reply_to_original ? ' (as reply)' : ''}: ${message}`);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully' 
        });

    } catch (error) {
        console.error('❌ Error sending message from Python:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// MODIFIED: Route for Python to send status updates with reply functionality
app.post('/send-status', async (req, res) => {
    try {
        const { chat_id, status, data, reply_to_original = true } = req.body;
        
        if (!chat_id || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'chat_id and status are required' 
            });
        }

        if (!globalSock) {
            return res.status(500).json({ 
                success: false, 
                error: 'WhatsApp socket not available' 
            });
        }

        let statusMessage = '';
        
        switch (status) {
            case 'processing':
                statusMessage = '⏳ Processing your data...';
                break;
            case 'completed':
                statusMessage = '✅ Processing completed successfully!';
                if (data && data.result) {
                    statusMessage += `\n\n📊 *Result:*\n${data.result}`;
                }
                break;
            case 'error':
                statusMessage = '❌ An error occurred during processing';
                if (data && data.error) {
                    statusMessage += `\n\n*Error:* ${data.error}`;
                }
                break;
            case 'custom':
                statusMessage = data && data.message ? data.message : 'Status update';
                break;
            default:
                statusMessage = `📋 Status: ${status}`;
        }

        // Prepare message payload
        let messagePayload = { text: statusMessage };

        // Add reply context if requested and available
        if (reply_to_original) {
            const messageContext = messageContexts.get(chat_id);
            if (messageContext && messageContext.messageKey) {
                messagePayload.quoted = messageContext.messageKey;
                console.log(`📎 Adding reply context for ${chat_id}:`, messageContext.messageKey);
            } else {
                console.log(`⚠️ No message context found for ${chat_id} or missing messageKey`);
            }
        }

        await globalSock.sendMessage(chat_id, messagePayload);
        
        console.log(`✅ Status sent to ${chat_id}${reply_to_original ? ' (as reply)' : ''}: ${status}`);
        
        // Clean up old message contexts (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, context] of messageContexts.entries()) {
            if (context.timestamp < oneHourAgo) {
                messageContexts.delete(key);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Status sent successfully' 
        });

    } catch (error) {
        console.error('❌ Error sending status from Python:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// NEW: Route to clear message context (optional cleanup)
app.post('/clear-context', async (req, res) => {
    try {
        const { chat_id } = req.body;
        
        if (chat_id) {
            messageContexts.delete(chat_id);
            console.log(`🧹 Cleared message context for ${chat_id}`);
        } else {
            messageContexts.clear();
            console.log('🧹 Cleared all message contexts');
        }
        
        res.json({ 
            success: true, 
            message: 'Context cleared successfully' 
        });

    } catch (error) {
        console.error('❌ Error clearing context:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Main Ap Kara handler (modified to store message context for replies)
async function handleApKaraCommand(sock, message) {
    try {
        const chatId = message.key.remoteJid;
        const messageKey = message.key;
        
        // Store the original message for reply context
        messageContexts.set(chatId, {
            messageKey: messageKey,
            originalMessage: message.message,
            timestamp: Date.now()
        });
        
        // Send initial processing message
        await sock.sendMessage(chatId, {
            text: "⏳ Processing your request... This may take up to 5 minutes."
        });

        // Get message text directly from the current message (not quoted)
        let messageText = '';
        if (message.message.conversation) {
            messageText = message.message.conversation;
        } else if (message.message.extendedTextMessage?.text) {
            messageText = message.message.extendedTextMessage.text;
        }

        if (!messageText) {
            await sock.sendMessage(chatId, {
                text: "❌ Could not extract text from the message",
                quoted: message
            });
            return;
        }

        let finalData = {
            vehicle_num: null,
            destination: null,
            weight: null,
            so_no: null,
            phone_num: null,
            driver_license: null,
            driver_name: null
        };

        // Check if this is an "ap kara" command with driver info
        if (messageText.toLowerCase().trim().startsWith('ap kara')) {
            // This should be a reply to the original message with the 4 variables
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quotedMessage) {
                await sock.sendMessage(chatId, {
                    text: "❌ Please reply to a message with 'ap kara' command",
                    quoted: message
                });
                return;
            }

            // Extract text from the ORIGINAL quoted message first
            let quotedText = '';
            if (quotedMessage.conversation) {
                quotedText = quotedMessage.conversation;
            } else if (quotedMessage.extendedTextMessage?.text) {
                quotedText = quotedMessage.extendedTextMessage.text;
            }

            if (!quotedText) {
                await sock.sendMessage(chatId, {
                    text: "❌ Could not extract text from the original message",
                    quoted: message
                });
                return;
            }

            // First, extract data from the ORIGINAL message
            const originalData = extractDataFromMessage(quotedText);
            const originalLineBasedData = extractDataByLines(quotedText);

            // Merge original data (prefer pattern-based, fallback to line-based)
            finalData = {
                vehicle_num: originalData.vehicle_num || originalLineBasedData.vehicle_num || null,
                destination: originalData.destination || originalLineBasedData.destination || null,
                weight: originalData.weight || originalLineBasedData.weight || null,
                so_no: originalData.so_no || originalLineBasedData.so_no || null,
                phone_num: originalData.phone_num || originalLineBasedData.phone_num || null,
                driver_license: null,
                driver_name: null
            };

            // Then, extract driver info from the ap kara reply
            const driverInfo = extractDriverInfo(messageText);
            
            if (driverInfo.driver_name || driverInfo.driver_license) {
                finalData.driver_name = driverInfo.driver_name;
                finalData.driver_license = driverInfo.driver_license;
                
                // Only overwrite original data if new data is found in the reply
                if (driverInfo.additional_data) {
                    Object.keys(driverInfo.additional_data).forEach(key => {
                        if (driverInfo.additional_data[key] !== null && driverInfo.additional_data[key] !== undefined) {
                            finalData[key] = driverInfo.additional_data[key];
                        }
                    });
                }
            }
        } else {
            // This is the old functionality for non-ap-kara commands
            // Check if this is a reply to another message (original functionality)
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quotedMessage) {
                await sock.sendMessage(chatId, {
                    text: "❌ Please reply to a message or use 'ap kara' with driver info",
                    quoted: message
                });
                return;
            }

            // Extract text from quoted message
            let quotedText = '';
            if (quotedMessage.conversation) {
                quotedText = quotedMessage.conversation;
            } else if (quotedMessage.extendedTextMessage?.text) {
                quotedText = quotedMessage.extendedTextMessage.text;
            }

            if (!quotedText) {
                await sock.sendMessage(chatId, {
                    text: "❌ Could not extract text from the replied message",
                    quoted: message
                });
                return;
            }

            // Extract data using pattern matching
            const extractedData = extractDataFromMessage(quotedText);
            
            // Also try line-based extraction as fallback
            const lineBasedData = extractDataByLines(quotedText);

            // Merge results (prefer pattern-based, fallback to line-based)
            // Only use values that are not null/undefined
            finalData = {
                vehicle_num: extractedData.vehicle_num || lineBasedData.vehicle_num || null,
                destination: extractedData.destination || lineBasedData.destination || null,
                weight: extractedData.weight || lineBasedData.weight || null,
                so_no: extractedData.so_no || lineBasedData.so_no || null,
                phone_num: extractedData.phone_num || lineBasedData.phone_num || null,
                driver_license: null,
                driver_name: null
            };
        }

        // Format response
        let response = "📋 *Extracted Data:*\n\n";
        
        if (finalData.driver_name) {
            response += `👤 *Driver Name:* ${finalData.driver_name}\n`;
        }
        if (finalData.driver_license) {
            response += `🆔 *License (Last 4):* ${finalData.driver_license}\n`;
        }
        
        response += `🚛 *Vehicle Number:* ${finalData.vehicle_num || 'Not found'}\n`;
        response += `📍 *Destination:* ${finalData.destination || 'Not found'}\n`;
        response += `⚖️ *Weight:* ${finalData.weight || 'Not found'}\n`;
        response += `📋 *SO Number:* ${finalData.so_no || 'Not found'}\n`;
        response += `📞 *Phone Number:* ${finalData.phone_num || 'Not found'}\n`;

        // Log for debugging
        console.log('Ap Kara Command - Extracted Data:', finalData);
        console.log('Original Message:', messageText);

        // Send response
        await sock.sendMessage(chatId, {
            text: response
        });

        // Send data to Python with chat ID and message key for replies
        await sendToPython(finalData, chatId, message);

        // Return extracted data for further processing
        return finalData;

    } catch (error) {
        console.error('Error in Ap Kara command:', error);
        await sock.sendMessage(message.key.remoteJid, {
            text: "❌ Error processing the command",
            quoted: message
        });
    }
}

// Command setup listener (modified to store socket globally)
export function setupApKaraCommand(sock) {
    // Store socket globally so we can use it in Express routes
    globalSock = sock;
    
    // Start Express server to receive messages from Python
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Express server listening on port ${PORT}`);
        console.log(`📡 Ready to receive messages from Python at http://localhost:${PORT}/send-message`);
        console.log(`📡 Ready to receive status updates from Python at http://localhost:${PORT}/send-status`);
    });
    
    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        
        if (!message.message) return;
        
        // Skip if message is from the bot itself (to prevent infinite loops)
        if (message.key.fromMe) return;
        
        // Get message text
        let messageText = '';
        if (message.message.conversation) {
            messageText = message.message.conversation;
        } else if (message.message.extendedTextMessage?.text) {
            messageText = message.message.extendedTextMessage.text;
        }
        
        // Check for "Ap kara" command (case insensitive)
        if (messageText.toLowerCase().includes('ap kara')) {
            await handleApKaraCommand(sock, message);
        }
    });
}

// Export functions using ES6 syntax
export {
    handleApKaraCommand,
    extractDataFromMessage,
    extractDataByLines,
    extractDriverInfo,
    dataPatterns,
    sendToPython
};
