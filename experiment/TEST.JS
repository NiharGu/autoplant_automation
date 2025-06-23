// Ap Kara Command Handler for Baileys Bot
// Extracts data from replied message using pattern matching
import axios from 'axios';

// Pattern definitions for data extraction
const dataPatterns = {
    // Vehicle number: xx11xx1111 format (2 letters, 2 digits, 2 letters, 4 digits)
    vehicleNumber: /\b[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{4}\b/,
    
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

// Add this function to send data to Python
async function sendToPython(finalData) {
    try {
        const pythonData = {
            driver_name: finalData.driver_name || null,
            driver_license: finalData.driver_license || null,
            vehicle_num: finalData.vehicle_num || null,
            destination: finalData.destination || null,
            weight: finalData.weight || null,
            so_no: finalData.so_no || null,
            phone_num: finalData.phone_num || null
        };

        console.log('Sending data to Python...');
        
        const response = await axios.post('http://localhost:5000/process-data', pythonData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        console.log('✅ Python response:', response.data);
        return response.data;

    } catch (error) {
        console.error('❌ Error sending to Python:', error.message);
        return null;
    }
}

// Main Ap Kara handler
async function handleApKaraCommand(sock, message) {
    try {
        // Get message text directly from the current message (not quoted)
        let messageText = '';
        if (message.message.conversation) {
            messageText = message.message.conversation;
        } else if (message.message.extendedTextMessage?.text) {
            messageText = message.message.extendedTextMessage.text;
        }

        if (!messageText) {
            await sock.sendMessage(message.key.remoteJid, {
                text: "❌ Could not extract text from the message"
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
                await sock.sendMessage(message.key.remoteJid, {
                    text: "❌ Please reply to a message with 'ap kara' command"
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
                await sock.sendMessage(message.key.remoteJid, {
                    text: "❌ Could not extract text from the original message"
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
                await sock.sendMessage(message.key.remoteJid, {
                    text: "❌ Please reply to a message or use 'ap kara' with driver info"
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
                await sock.sendMessage(message.key.remoteJid, {
                    text: "❌ Could not extract text from the replied message"
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
        await sock.sendMessage(message.key.remoteJid, {
            text: response
        });

        // Send data to Python (moved inside the function)
        await sendToPython(finalData);

        // Return extracted data for further processing
        return finalData;

    } catch (error) {
        console.error('Error in Ap Kara command:', error);
        await sock.sendMessage(message.key.remoteJid, {
            text: "❌ Error processing the command"
        });
    }
}

// Command setup listener
export function setupApKaraCommand(sock) {
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
