/**
 * Core utility functions for binary/hex manipulation
 * SARBA Simulator (Mano Basic Computer Architecture)
 * 
 * @description Provides utility functions for 16-bit word operations
 * including hex/binary conversion, arithmetic, and bitwise operations.
 */

const Utils = {
    /**
     * Convert a hex value to a binary string
     * @param {string|number} val - Hex string or number
     * @param {number} [width=16] - Desired width in bits
     * @returns {string} Binary string padded to width
     * @example
     * Utils.toBinary('F', 8) // Returns '00001111'
     */
    toBinary: (val, width = 16) => {
        try {
            let num = typeof val === 'string' ? parseInt(val, 16) : val;
            if (isNaN(num)) num = 0;
            return num.toString(2).padStart(width, '0').slice(-width);
        } catch (e) {
            console.error('toBinary error:', e);
            return '0'.repeat(width);
        }
    },

    /**
     * Convert a binary string to uppercase hex string
     * @param {string} val - Binary string
     * @param {number} [width=4] - Desired width in hex digits
     * @returns {string} Uppercase hex string padded to width
     * @example
     * Utils.toHex('1111', 2) // Returns '0F'
     */
    toHex: (val, width = 4) => {
        try {
            let num = parseInt(val, 2);
            if (isNaN(num)) num = 0;
            return num.toString(16).toUpperCase().padStart(width, '0');
        } catch (e) {
            console.error('toHex error:', e);
            return '0'.repeat(width);
        }
    },

    /**
     * Convert a decimal value to hex string
     * @param {string|number} val - Decimal value
     * @param {number} [width=4] - Desired width in hex digits
     * @returns {string} Uppercase hex string padded to width
     * @example
     * Utils.decToHex(255, 4) // Returns '00FF'
     * Utils.decToHex(-1, 4)  // Returns 'FFFF' (two's complement)
     */
    decToHex: (val, width = 4) => {
        try {
            let num = typeof val === 'string' ? parseInt(val, 10) : val;
            if (isNaN(num)) num = 0;
            // Mask to 16 bits (handles negative numbers via two's complement)
            num = num & 0xFFFF;
            return num.toString(16).toUpperCase().padStart(width, '0');
        } catch (e) {
            console.error('decToHex error:', e);
            return '0'.repeat(width);
        }
    },

    /**
     * Add two hex strings and return result with carry flag
     * @param {string} hex1 - First hex operand
     * @param {string} hex2 - Second hex operand
     * @returns {{hex: string, carry: boolean}} Result and carry flag
     * @example
     * Utils.addHex('FFFF', '0001') // Returns { hex: '0000', carry: true }
     */
    addHex: (hex1, hex2) => {
        try {
            let val1 = parseInt(hex1, 16) || 0;
            let val2 = parseInt(hex2, 16) || 0;
            let sum = val1 + val2;
            let carry = sum > 0xFFFF;
            return {
                hex: (sum & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'),
                carry: carry
            };
        } catch (e) {
            console.error('addHex error:', e);
            return { hex: '0000', carry: false };
        }
    },

    /**
     * Increment a hex string by 1
     * @param {string} hex - Hex string to increment
     * @returns {string} Incremented hex string (wraps at 16 bits)
     * @example
     * Utils.incrementHex('00FF') // Returns '0100'
     * Utils.incrementHex('FFFF') // Returns '0000'
     */
    incrementHex: (hex) => {
        try {
            let val = parseInt(hex, 16) || 0;
            val = (val + 1) & 0xFFFF;
            return val.toString(16).toUpperCase().padStart(4, '0');
        } catch (e) {
            console.error('incrementHex error:', e);
            return '0000';
        }
    },

    /**
     * Bitwise AND of two hex strings
     * @param {string} hex1 - First hex operand
     * @param {string} hex2 - Second hex operand
     * @returns {string} Result of hex1 AND hex2
     * @example
     * Utils.andHex('FF00', '0F0F') // Returns '0F00'
     */
    andHex: (hex1, hex2) => {
        try {
            let val1 = parseInt(hex1, 16) || 0;
            let val2 = parseInt(hex2, 16) || 0;
            return (val1 & val2).toString(16).toUpperCase().padStart(4, '0');
        } catch (e) {
            console.error('andHex error:', e);
            return '0000';
        }
    },

    /**
     * Bitwise complement (NOT) of a hex string
     * @param {string} hex - Hex string to complement
     * @returns {string} One's complement of input
     * @example
     * Utils.complementHex('00FF') // Returns 'FF00'
     */
    complementHex: (hex) => {
        try {
            let val = parseInt(hex, 16) || 0;
            return (~val & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        } catch (e) {
            console.error('complementHex error:', e);
            return 'FFFF';
        }
    },

    /**
     * Check if a 16-bit hex value is negative (bit 15 = 1)
     * @param {string} hex16bit - 16-bit hex string
     * @returns {boolean} True if sign bit is set
     * @example
     * Utils.isNegative('8000') // Returns true
     * Utils.isNegative('7FFF') // Returns false
     */
    isNegative: (hex16bit) => {
        try {
            let val = parseInt(hex16bit, 16) || 0;
            return (val & 0x8000) !== 0;
        } catch (e) {
            console.error('isNegative error:', e);
            return false;
        }
    },

    /**
     * Convert hex to signed decimal value
     * @param {string} hex - Hex string (up to 16 bits)
     * @returns {number} Signed decimal value
     * @example
     * Utils.hexToSigned('FFFF') // Returns -1
     * Utils.hexToSigned('7FFF') // Returns 32767
     */
    hexToSigned: (hex) => {
        try {
            let val = parseInt(hex, 16) || 0;
            if (val & 0x8000) {
                return val - 0x10000;
            }
            return val;
        } catch (e) {
            console.error('hexToSigned error:', e);
            return 0;
        }
    }
};
