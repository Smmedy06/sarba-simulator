/**
 * Memory Module for SARBA Simulator (Mano Basic Computer)
 * 
 * @description Implements the main memory unit with 4096 words of 16 bits each.
 * Addresses are 12 bits (000-FFF), content is 16 bits (0000-FFFF).
 */

class Memory {
    /**
     * Creates a new Memory instance
     * Initializes 4096 words to "0000"
     */
    constructor() {
        /** @type {number} Memory size in words */
        this.size = 4096;
        
        /** @type {string[]} Memory data array (hex strings) */
        this.data = new Array(this.size).fill("0000");
    }

    /**
     * Resets all memory locations to "0000"
     */
    reset() {
        this.data.fill("0000");
    }

    /**
     * Read a word from memory
     * @param {string|number} address - Hex string or integer address (0-4095)
     * @returns {string} 4-character hex string representing the word
     * @example
     * memory.read("100")  // Read from address 0x100
     * memory.read(256)    // Same as above
     */
    read(address) {
        try {
            const addrIndex = typeof address === 'string' 
                ? parseInt(address, 16) 
                : address;
            
            if (addrIndex < 0 || addrIndex >= this.size) {
                console.warn(`Memory read out of bounds: ${address}`);
                return "0000";
            }
            
            return this.data[addrIndex];
        } catch (e) {
            console.error('Memory read error:', e);
            return "0000";
        }
    }

    /**
     * Write a word to memory
     * @param {string|number} address - Hex string or integer address (0-4095)
     * @param {string} val - 4-character hex string to write
     * @example
     * memory.write("100", "1234")  // Write 0x1234 to address 0x100
     */
    write(address, val) {
        try {
            const addrIndex = typeof address === 'string' 
                ? parseInt(address, 16) 
                : address;
            
            if (addrIndex < 0 || addrIndex >= this.size) {
                console.warn(`Memory write out of bounds: ${address}`);
                return;
            }
            
            // Ensure format is clean (4 uppercase hex digits)
            const cleanVal = Utils.decToHex(parseInt(val, 16), 4);
            this.data[addrIndex] = cleanVal;
        } catch (e) {
            console.error('Memory write error:', e);
        }
    }

    /**
     * Load a program into memory
     * @param {Object} programData - Object mapping hex addresses to hex values
     * @example
     * memory.loadProgram({
     *   "100": "2105",  // LDA 105
     *   "101": "7001",  // HLT
     *   "105": "000A"   // DEC 10
     * });
     */
    loadProgram(programData) {
        try {
            for (const addr in programData) {
                if (programData.hasOwnProperty(addr)) {
                    this.write(addr, programData[addr]);
                }
            }
        } catch (e) {
            console.error('Memory loadProgram error:', e);
        }
    }

    /**
     * Get a snapshot of all non-zero memory locations
     * @returns {Array<{address: string, content: string}>} Array of address/content pairs
     * @example
     * const snapshot = memory.getNonZeroMemory();
     * // Returns: [{ address: "100", content: "2105" }, ...]
     */
    getNonZeroMemory() {
        const snapshot = [];
        
        try {
            for (let i = 0; i < this.size; i++) {
                if (this.data[i] !== "0000") {
                    snapshot.push({
                        address: Utils.decToHex(i, 3),
                        content: this.data[i]
                    });
                }
            }
        } catch (e) {
            console.error('Memory getNonZeroMemory error:', e);
        }
        
        return snapshot;
    }

    /**
     * Get memory contents in a specific range
     * @param {number} start - Start address (decimal)
     * @param {number} end - End address (decimal, exclusive)
     * @returns {Array<{address: string, content: string}>} Array of address/content pairs
     */
    getRange(start, end) {
        const result = [];
        
        try {
            const startAddr = Math.max(0, start);
            const endAddr = Math.min(this.size, end);
            
            for (let i = startAddr; i < endAddr; i++) {
                result.push({
                    address: Utils.decToHex(i, 3),
                    content: this.data[i]
                });
            }
        } catch (e) {
            console.error('Memory getRange error:', e);
        }
        
        return result;
    }

    /**
     * Dump memory to console for debugging
     * @param {number} [start=0] - Start address
     * @param {number} [count=16] - Number of words to dump
     */
    dump(start = 0, count = 16) {
        console.log(`Memory dump from ${Utils.decToHex(start, 3)}:`);
        for (let i = start; i < start + count && i < this.size; i++) {
            console.log(`  ${Utils.decToHex(i, 3)}: ${this.data[i]}`);
        }
    }
}
