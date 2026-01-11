/**
 * Assembler for Mano Basic Computer (SARBA Architecture)
 * Two-pass assembler logic with comprehensive validation.
 * 
 * @description Assembles Mano assembly language into 16-bit machine code.
 * Supports MRI, RRI, and IO instructions along with pseudo-ops (ORG, END, HEX, DEC).
 */

const Assembler = {
    // Instruction Definitions
    INSTRUCTION_SET: {
        // Memory Reference (MRI) - Stored as {opcode, direct_code, indirect_code}
        'AND': { type: 'MRI', opcode: 0 },
        'ADD': { type: 'MRI', opcode: 1 },
        'LDA': { type: 'MRI', opcode: 2 },
        'STA': { type: 'MRI', opcode: 3 },
        'BUN': { type: 'MRI', opcode: 4 },
        'BSA': { type: 'MRI', opcode: 5 },
        'ISZ': { type: 'MRI', opcode: 6 },

        // Register Reference (RRI) - Opcode 7, I=0
        'CLA': { type: 'RRI', hex: '7800' },
        'CLE': { type: 'RRI', hex: '7400' },
        'CMA': { type: 'RRI', hex: '7200' },
        'CME': { type: 'RRI', hex: '7100' },
        'CIR': { type: 'RRI', hex: '7080' },
        'CIL': { type: 'RRI', hex: '7040' },
        'INC': { type: 'RRI', hex: '7020' },
        'SPA': { type: 'RRI', hex: '7010' },
        'SNA': { type: 'RRI', hex: '7008' },
        'SZA': { type: 'RRI', hex: '7004' },
        'SZE': { type: 'RRI', hex: '7002' },
        'HLT': { type: 'RRI', hex: '7001' },

        // Input-Output (IO) - Opcode 7, I=1
        'INP': { type: 'IO', hex: 'F800' },
        'OUT': { type: 'IO', hex: 'F400' },
        'SKI': { type: 'IO', hex: 'F200' },
        'SKO': { type: 'IO', hex: 'F100' },
        'ION': { type: 'IO', hex: 'F080' },
        'IOF': { type: 'IO', hex: 'F040' }
    },

    /**
     * Validates a hexadecimal string
     * @param {string} str - String to validate
     * @returns {boolean} True if valid hex
     */
    isValidHex: (str) => {
        if (!str || str.length === 0) return false;
        return /^[0-9A-Fa-f]+$/.test(str);
    },

    /**
     * Validates a decimal string (including negative)
     * @param {string} str - String to validate
     * @returns {boolean} True if valid decimal
     */
    isValidDec: (str) => {
        if (!str || str.length === 0) return false;
        return /^-?\d+$/.test(str);
    },

    /**
     * Validates a label name
     * @param {string} label - Label to validate
     * @returns {boolean} True if valid label
     */
    isValidLabel: (label) => {
        if (!label || label.length === 0) return false;
        // Labels must start with letter, contain only alphanumeric and underscore
        return /^[A-Za-z_][A-Za-z0-9_]*$/.test(label);
    },

    /**
     * Main assembly function - Two-pass assembler
     * @param {string} code - Assembly source code
     * @returns {Object} Assembly result with machineCode, errors, labels, etc.
     */
    assemble: (code) => {
        const lines = code.split('\n');
        const labels = {};
        const machineCode = {}; // Address -> Hex
        let LC = 0; // Location Counter
        const errors = [];
        const lineMap = []; // Maps source line to LC for error reporting

        // --- PASS 1: Symbol Table & Validation ---
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const cleanLine = line.split('/')[0].trim().toUpperCase(); // Remove comments, normalize case
            if (!cleanLine) return; // Skip empty

            // Check for Label (ends with comma)
            const parts = cleanLine.split(',');
            let instructionPart = cleanLine;
            
            if (parts.length > 1) {
                const label = parts[0].trim();
                
                // Validate label format
                if (!Assembler.isValidLabel(label)) {
                    errors.push(`Line ${lineNum}: Invalid label format '${label}'`);
                    return;
                }
                
                // Check for duplicate labels
                if (labels.hasOwnProperty(label)) {
                    errors.push(`Line ${lineNum}: Duplicate label '${label}' (first defined at address ${Utils.decToHex(labels[label], 3)})`);
                    return;
                }
                
                labels[label] = LC;
                instructionPart = parts[1].trim();
            }

            const tokens = instructionPart.split(/\s+/);
            const mnemonic = tokens[0];

            if (mnemonic === 'ORG') {
                if (tokens.length < 2) {
                    errors.push(`Line ${lineNum}: ORG requires a hex address`);
                    return;
                }
                if (!Assembler.isValidHex(tokens[1])) {
                    errors.push(`Line ${lineNum}: Invalid hex address '${tokens[1]}' for ORG`);
                    return;
                }
                const addr = parseInt(tokens[1], 16);
                if (addr < 0 || addr > 0xFFF) {
                    errors.push(`Line ${lineNum}: ORG address ${tokens[1]} out of range (000-FFF)`);
                    return;
                }
                LC = addr;
                // Update label if one was defined on this line
                if (parts.length > 1) {
                    labels[parts[0].trim()] = LC;
                }
            } else if (mnemonic === 'END') {
                // END directive - no LC change
            } else if (mnemonic === 'HEX') {
                if (tokens.length < 2) {
                    errors.push(`Line ${lineNum}: HEX requires a value`);
                    return;
                }
                if (!Assembler.isValidHex(tokens[1])) {
                    errors.push(`Line ${lineNum}: Invalid hex value '${tokens[1]}'`);
                    return;
                }
                const val = parseInt(tokens[1], 16);
                if (val > 0xFFFF) {
                    errors.push(`Line ${lineNum}: HEX value ${tokens[1]} exceeds 16-bit range`);
                    return;
                }
                LC++;
            } else if (mnemonic === 'DEC') {
                if (tokens.length < 2) {
                    errors.push(`Line ${lineNum}: DEC requires a value`);
                    return;
                }
                if (!Assembler.isValidDec(tokens[1])) {
                    errors.push(`Line ${lineNum}: Invalid decimal value '${tokens[1]}'`);
                    return;
                }
                const val = parseInt(tokens[1], 10);
                if (val > 32767 || val < -32768) {
                    errors.push(`Line ${lineNum}: DEC value ${tokens[1]} out of 16-bit signed range (-32768 to 32767)`);
                    return;
                }
                LC++;
            } else {
                // Instruction - check if valid
                const instr = Assembler.INSTRUCTION_SET[mnemonic];
                if (instr) {
                    // MRI requires operand
                    if (instr.type === 'MRI' && tokens.length < 2) {
                        errors.push(`Line ${lineNum}: '${mnemonic}' requires an address operand`);
                        return;
                    }
                    LC++;
                } else if (mnemonic) {
                    errors.push(`Line ${lineNum}: Unknown instruction '${mnemonic}'`);
                    return;
                }
            }
            
            lineMap.push({ lineNum, lc: LC - 1, mnemonic });
        });

        // If Pass 1 has errors, return early
        if (errors.length > 0) {
            return {
                success: false,
                machineCode: {},
                startAddress: 0,
                labels,
                errors,
                usageMap: {}
            };
        }

        // --- PASS 2: Code Generation ---
        LC = 0;
        let startAddress = null;
        const pass2Lines = [];

        lines.forEach((line, index) => {
            const lineNum = index + 1;
            let cleanLine = line.split('/')[0].trim().toUpperCase();
            if (!cleanLine) return;

            // Construct basic Line Info for Usage Map
            let currentLineInfo = { type: 'instruction', val: null, instruction: '', lineNum };

            // Remove Label if present
            if (cleanLine.includes(',')) {
                cleanLine = cleanLine.split(',')[1].trim();
            }

            const tokens = cleanLine.split(/\s+/);
            const mnemonic = tokens[0];
            currentLineInfo.instruction = mnemonic;

            if (mnemonic === 'ORG') {
                LC = parseInt(tokens[1], 16);
                if (startAddress === null) startAddress = LC;
                currentLineInfo.type = 'ORG';
                currentLineInfo.val = LC;
            } else if (mnemonic === 'END') {
                currentLineInfo.type = 'END';
            } else if (mnemonic === 'HEX') {
                const val = parseInt(tokens[1], 16);
                machineCode[Utils.decToHex(LC, 3)] = Utils.decToHex(val, 4);
                LC++;
            } else if (mnemonic === 'DEC') {
                let val = parseInt(tokens[1], 10);
                if (val < 0) val = 0xFFFF + val + 1; // Two's complement
                machineCode[Utils.decToHex(LC, 3)] = Utils.decToHex(val, 4);
                LC++;
            } else {
                // Instruction lookup
                const instr = Assembler.INSTRUCTION_SET[mnemonic];
                if (instr) {
                    let hex = "0000";
                    if (instr.type === 'RRI' || instr.type === 'IO') {
                        hex = instr.hex;
                    } else if (instr.type === 'MRI') {
                        // MRI Logic - operand already validated in Pass 1
                        let address = "000";
                        let indirect = false;
                        
                        const operand = tokens[1].toUpperCase();
                        
                        // Check if operand is a label FIRST, then hex address
                        // This is important because labels like 'A', 'B', 'C' are valid hex!
                        if (labels.hasOwnProperty(operand)) {
                            // It's a defined label
                            address = Utils.decToHex(labels[operand], 3);
                        } else if (Assembler.isValidHex(operand) && operand.length <= 3) {
                            // Direct hex address
                            address = operand.padStart(3, '0');
                        } else {
                            errors.push(`Line ${lineNum}: Undefined label '${operand}'`);
                        }
                        
                        if (tokens.length > 2 && tokens[2] === 'I') {
                            indirect = true;
                        }
                        
                        let opcodeVal = instr.opcode;
                        let firstDigit = opcodeVal;
                        if (indirect) firstDigit += 8;
                        hex = firstDigit.toString(16).toUpperCase() + address;
                    }
                    machineCode[Utils.decToHex(LC, 3)] = hex;
                    LC++;
                }
            }
            pass2Lines.push(currentLineInfo);
        });

        return {
            success: errors.length === 0,
            machineCode,
            startAddress: startAddress !== null ? startAddress : 0,
            labels,
            errors,
            usageMap: Assembler.generateUsageMap(pass2Lines, startAddress !== null ? startAddress : 0)
        };
    },

    /**
     * Generates a map of memory addresses to their usage type (code/data)
     * @param {Array} lines - Processed line information
     * @param {number} startAddr - Starting address
     * @returns {Object} Map of address to 'code' or 'data'
     */
    generateUsageMap: (lines, startAddr) => {
        let map = {};
        let lc = startAddr;
        for (let line of lines) {
            if (line.type === 'ORG') {
                lc = line.val;
            } else if (line.type === 'END') {
                // end - no action
            } else {
                // Instruction or Data?
                // Pseudo ops DEC/HEX are data.
                // Others (MRI, RRI, IO) are code.
                let type = 'code';
                if (line.instruction === 'DEC' || line.instruction === 'HEX') {
                    type = 'data';
                }
                map[lc] = type;
                lc++;
            }
        }
        return map;
    }
};
