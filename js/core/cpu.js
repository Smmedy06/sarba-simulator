/**
 * CPU / Control Unit Logic for SARBA Simulator (Mano Basic Computer)
 * Implements the Fetch-Decode-Execute Cycle (T0 - T6) with Interrupt Support
 * 
 * @description Emulates the Mano Basic Computer CPU with all registers,
 * flags, and the complete instruction set including interrupt handling.
 */

class CPU {
    /**
     * Creates a new CPU instance
     * @param {Memory} memory - The memory module to use
     */
    constructor(memory) {
        this.memory = memory;
        this.reset();
        
        // Callback for I/O operations
        this.onOutput = null;  // Called when OUT instruction executes
        this.onInputRequired = null;  // Called when INP needs input
    }

    /**
     * Resets all CPU registers and flags to initial state
     */
    reset() {
        // Registers (all stored as uppercase hex strings)
        this.PC = "000"; // 12-bit Program Counter
        this.AR = "000"; // 12-bit Address Register
        this.IR = "0000"; // 16-bit Instruction Register
        this.DR = "0000"; // 16-bit Data Register
        this.AC = "0000"; // 16-bit Accumulator
        this.TR = "0000"; // 16-bit Temporary Register

        // Input/Output Registers
        this.INPR = "00"; // 8-bit Input Register
        this.OUTR = "00"; // 8-bit Output Register

        // Flags
        this.I = false;   // Indirect Bit (from IR[15])
        this.S = false;   // Start/Stop Flip-Flop
        this.E = false;   // Carry Bit (Extended AC)
        this.IEN = false; // Interrupt Enable
        this.FGI = false; // Input Flag (set when input available)
        this.FGO = true;  // Output Flag (set when output device ready) - starts ready
        this.R = false;   // Interrupt Request Flag

        // Sequence Counter (T-State: 0-6)
        this.SC = 0;

        // Internal State for Simulation
        this.status = "Stopped"; // Running, Suspended, Stopped
        this.waitingForInput = false; // True when INP needs input
    }

    /**
     * Sets the Program Counter to start address
     * @param {string} hexAddr - Hex address string
     */
    setPC(hexAddr) {
        this.PC = Utils.decToHex(parseInt(hexAddr, 16), 3);
        this.S = true; // Ready to start
        this.status = "Running";
    }

    /**
     * Sets input data and raises input flag
     * @param {number} charCode - ASCII character code (0-255)
     */
    setInput(charCode) {
        this.INPR = Utils.decToHex(charCode & 0xFF, 2);
        this.FGI = true;
        this.waitingForInput = false;
    }

    /**
     * Clears the input flag and register
     */
    clearInput() {
        this.INPR = "00";
        this.FGI = false;
    }

    /**
     * Checks if interrupt should occur
     * @returns {boolean} True if interrupt condition met
     */
    checkInterrupt() {
        // Interrupt occurs when IEN=1 and (FGI=1 or FGO=1)
        // R is set at the end of instruction cycle (when SC becomes 0)
        // This function checks if interrupt condition is met and sets R flag
        if (this.IEN && (this.FGI || this.FGO)) {
            this.R = true;
            return true;
        }
        this.R = false;
        return false;
    }

    /**
     * Executes one micro-operation (single clock pulse)
     * @returns {Object} Result with state, message, and register values
     */
    step() {
        if (!this.S) {
            return { state: 'Halt', msg: 'System Halted' };
        }

        // Check for waiting on input
        if (this.waitingForInput) {
            return { state: 'WaitInput', msg: 'Waiting for input (FGI=0)' };
        }

        let msg = "";

        // Interrupt Cycle (when R=1)
        if (this.R && this.SC === 0) {
            return this.executeInterruptCycle();
        }

        switch (this.SC) {
            case 0: // T0: AR <- PC
                // Check for interrupt at start of new instruction
                if (this.checkInterrupt()) {
                    return this.executeInterruptCycle();
                }
                this.AR = this.PC;
                msg = `T0: AR ← PC (${this.PC})`;
                this.SC = 1;
                break;

            case 1: // T1: IR <- M[AR], PC <- PC + 1
                this.IR = this.memory.read(this.AR);
                this.PC = Utils.incrementHex(this.PC).slice(-3); // Keep 12 bits
                msg = `T1: IR ← M[${this.AR}], PC ← PC+1`;
                this.SC = 2;
                break;

            case 2: // T2: Decode -> AR <- IR(0-11), I <- IR(15)
                {
                    let irVal = parseInt(this.IR, 16);
                    this.AR = (irVal & 0x0FFF).toString(16).toUpperCase().padStart(3, '0');
                    this.I = (irVal & 0x8000) !== 0; // Bit 15

                    let opcode = (irVal & 0x7000) >> 12;
                    msg = `T2: Decode Opcode ${opcode}, AR ← ${this.AR}, I ← ${this.I ? 1 : 0}`;
                    this.SC = 3;
                }
                break;

            case 3: // T3: Indirect addressing or RRI/IO execution
                {
                    let irVal = parseInt(this.IR, 16);
                    let opcode = (irVal & 0x7000) >> 12;
                    let type = 'MRI';
                    if (opcode === 7) type = this.I ? 'IO' : 'RRI';

                    if (type === 'MRI') {
                        if (this.I) {
                            // Indirect: AR <- M[AR]
                            let ptr = this.memory.read(this.AR);
                            let oldAR = this.AR;
                            this.AR = ptr.slice(-3);
                            msg = `T3: Indirect: AR ← M[${oldAR}] = ${this.AR}`;
                            this.SC = 4;
                        } else {
                            msg = `T3: Direct addressing (no change)`;
                            this.SC = 4;
                        }
                    } else {
                        // RRI or IO -> Execute at T3
                        let result = this.executeRegisterOrIO(type);
                        msg = result.msg;
                        
                        // Check if waiting for input - don't reset SC so we can re-execute
                        if (result.waitInput) {
                            this.waitingForInput = true;
                            // Keep SC at 3 so INP instruction is re-executed when input is available
                            return { state: 'WaitInput', msg: msg, waitInput: true };
                        }
                        
                        this.SC = 0; // End of instruction
                        
                        // Check for interrupt at end of instruction cycle
                        // R flag is set if IEN=1 and (FGI=1 or FGO=1)
                        this.checkInterrupt();
                    }
                }
                break;

            case 4: // T4: Execute MRI (first phase)
                msg = this.executeMRI_T4();
                break;

            case 5: // T5: Execute MRI (second phase)
                msg = this.executeMRI_T5();
                break;

            case 6: // T6: Execute MRI (third phase - ISZ only)
                msg = this.executeMRI_T6();
                break;

            default:
                msg = `Error: Invalid SC=${this.SC}`;
                this.SC = 0;
        }

        return {
            state: this.S ? 'Run' : 'Halt',
            msg: msg,
            sc: this.SC,
            pc: this.PC,
            ar: this.AR
        };
    }

    /**
     * Executes the interrupt cycle
     * @returns {Object} Result with state and message
     */
    executeInterruptCycle() {
        // Interrupt Cycle: RT0, RT1, RT2
        // RT0: AR <- 0, TR <- PC
        // RT1: M[AR] <- TR, PC <- 0
        // RT2: PC <- PC + 1, IEN <- 0, R <- 0, SC <- 0
        
        // Simplified: Execute entire interrupt cycle in one step
        this.TR = "0" + this.PC; // Store PC in TR (pad to 4 digits)
        this.AR = "000";
        this.memory.write("000", this.TR); // Store return address at M[0]
        this.PC = "001"; // Jump to interrupt service routine at address 1
        this.IEN = false;
        this.R = false;
        this.SC = 0;
        
        return {
            state: 'Run',
            msg: `Interrupt: M[0] ← PC, PC ← 001, IEN ← 0`,
            sc: this.SC,
            pc: this.PC,
            ar: this.AR,
            interrupt: true
        };
    }

    /**
     * Executes Register Reference or I/O instructions
     * @param {string} type - 'RRI' or 'IO'
     * @returns {Object} Result with message and optional waitInput flag
     */
    executeRegisterOrIO(type) {
        let irVal = parseInt(this.IR, 16);
        let msg = "";
        let waitInput = false;

        if (type === 'RRI') {
            // Register Reference (Bit 15=0, Opcode=111) -> 7XXX
            // Bits 0-11 define operation
            if (irVal & 0x800) { 
                this.AC = "0000"; 
                msg = "CLA: AC ← 0"; 
            }
            if (irVal & 0x400) { 
                this.E = false; 
                msg = "CLE: E ← 0"; 
            }
            if (irVal & 0x200) { 
                this.AC = Utils.complementHex(this.AC); 
                msg = "CMA: AC ← AC'"; 
            }
            if (irVal & 0x100) { 
                this.E = !this.E; 
                msg = "CME: E ← E'"; 
            }
            if (irVal & 0x080) { // CIR
                let acVal = parseInt(this.AC, 16);
                let lowBit = acVal & 1;
                let newAc = (acVal >> 1) | (this.E ? 0x8000 : 0);
                this.AC = Utils.decToHex(newAc, 4);
                this.E = lowBit === 1;
                msg = "CIR: Circulate Right";
            }
            if (irVal & 0x040) { // CIL
                let acVal = parseInt(this.AC, 16);
                let highBit = (acVal & 0x8000) !== 0;
                let newAc = ((acVal << 1) & 0xFFFF) | (this.E ? 1 : 0);
                this.AC = Utils.decToHex(newAc, 4);
                this.E = highBit;
                msg = "CIL: Circulate Left";
            }
            if (irVal & 0x020) { 
                this.AC = Utils.incrementHex(this.AC); 
                msg = "INC: AC ← AC + 1"; 
            }

            // Skip instructions
            let skip = false;
            let acVal = parseInt(this.AC, 16);
            if ((irVal & 0x010) && (acVal & 0x8000) === 0 && acVal !== 0) { 
                skip = true; 
                msg = "SPA: Skip (AC > 0)"; 
            }
            if ((irVal & 0x008) && (acVal & 0x8000) !== 0) { 
                skip = true; 
                msg = "SNA: Skip (AC < 0)"; 
            }
            if ((irVal & 0x004) && acVal === 0) { 
                skip = true; 
                msg = "SZA: Skip (AC = 0)"; 
            }
            if ((irVal & 0x002) && this.E === false) { 
                skip = true; 
                msg = "SZE: Skip (E = 0)"; 
            }

            if (skip) {
                this.PC = Utils.incrementHex(this.PC).slice(-3);
            }

            if (irVal & 0x001) { 
                this.S = false; 
                this.status = "Stopped";
                msg = "HLT: System Halted"; 
            }

        } else {
            // IO (Bit 15=1, Opcode=111) -> FXXX
            if (irVal & 0x800) { // INP
                if (this.FGI) {
                    // Input available
                    let charCode = parseInt(this.INPR, 16);
                    let acVal = parseInt(this.AC, 16) & 0xFF00; // Keep high byte
                    this.AC = Utils.decToHex(acVal | charCode, 4);
                    this.FGI = false;
                    msg = `INP: AC(0-7) ← INPR (${this.INPR})`;
                } else {
                    // No input available - need to wait
                    waitInput = true;
                    msg = "INP: Waiting for input (FGI=0)";
                    if (this.onInputRequired) {
                        this.onInputRequired();
                    }
                }
            }
            if (irVal & 0x400) { // OUT
                this.OUTR = this.AC.slice(-2); // Lower 8 bits (last 2 hex chars)
                this.FGO = false;
                msg = `OUT: OUTR ← AC(0-7) (${this.OUTR})`;
                
                // Trigger output callback
                if (this.onOutput) {
                    this.onOutput(parseInt(this.OUTR, 16));
                }
                
                // Set FGO back to true after a short delay (simulated)
                // In real hardware, this would be set by the output device
                setTimeout(() => { this.FGO = true; }, 10);
            }
            if (irVal & 0x200) { // SKI
                if (this.FGI) {
                    this.PC = Utils.incrementHex(this.PC).slice(-3);
                    msg = "SKI: Skip (FGI=1)";
                } else {
                    msg = "SKI: No Skip (FGI=0)";
                }
            }
            if (irVal & 0x100) { // SKO
                if (this.FGO) {
                    this.PC = Utils.incrementHex(this.PC).slice(-3);
                    msg = "SKO: Skip (FGO=1)";
                } else {
                    msg = "SKO: No Skip (FGO=0)";
                }
            }
            if (irVal & 0x080) { 
                this.IEN = true; 
                msg = "ION: Interrupt Enabled"; 
            }
            if (irVal & 0x040) { 
                this.IEN = false; 
                msg = "IOF: Interrupt Disabled"; 
            }
        }

        return { msg: `T3: ${msg}`, waitInput };
    }

    /**
     * Executes MRI instruction at T4
     * @returns {string} Description of operation
     */
    executeMRI_T4() {
        let irVal = parseInt(this.IR, 16);
        let opcode = (irVal & 0x7000) >> 12;

        switch (opcode) {
            case 0: // AND
            case 1: // ADD
            case 2: // LDA
            case 6: // ISZ
                this.DR = this.memory.read(this.AR);
                this.SC = 5;
                return `T4: DR ← M[${this.AR}] (${this.DR})`;

            case 3: // STA
                this.memory.write(this.AR, this.AC);
                this.SC = 0;
                this.checkInterrupt(); // Check for interrupt at end of instruction
                return `T4: M[${this.AR}] ← AC (${this.AC})`;

            case 4: // BUN
                this.PC = this.AR;
                this.SC = 0;
                this.checkInterrupt(); // Check for interrupt at end of instruction
                return `T4: PC ← AR (${this.AR})`;

            case 5: // BSA
                this.memory.write(this.AR, "0" + this.PC); // Store PC with leading 0
                this.AR = Utils.incrementHex(this.AR).slice(-3);
                this.SC = 5;
                return `T4: M[AR] ← PC, AR ← AR+1`;

            default:
                this.SC = 0;
                this.checkInterrupt(); // Check for interrupt at end of instruction
                return `T4: Unknown opcode ${opcode}`;
        }
    }

    /**
     * Executes MRI instruction at T5
     * @returns {string} Description of operation
     */
    executeMRI_T5() {
        let irVal = parseInt(this.IR, 16);
        let opcode = (irVal & 0x7000) >> 12;
        let msg = "";

        switch (opcode) {
            case 0: // AND
                this.AC = Utils.andHex(this.AC, this.DR);
                this.SC = 0;
                this.checkInterrupt(); // Check for interrupt at end of instruction
                msg = `AC ← AC ∧ DR (${this.AC})`;
                break;

            case 1: // ADD
                {
                    let sum = Utils.addHex(this.AC, this.DR);
                    this.AC = sum.hex;
                    this.E = sum.carry;
                    this.SC = 0;
                    this.checkInterrupt(); // Check for interrupt at end of instruction
                    msg = `AC ← AC + DR (${this.AC}), E=${this.E ? 1 : 0}`;
                }
                break;

            case 2: // LDA
                this.AC = this.DR;
                this.SC = 0;
                this.checkInterrupt(); // Check for interrupt at end of instruction
                msg = `AC ← DR (${this.AC})`;
                break;

            case 5: // BSA
                this.PC = this.AR;
                this.SC = 0;
                this.checkInterrupt(); // Check for interrupt at end of instruction
                msg = `PC ← AR (${this.AR})`;
                break;

            case 6: // ISZ
                this.DR = Utils.incrementHex(this.DR);
                this.memory.write(this.AR, this.DR);
                this.SC = 6;
                msg = `DR ← DR+1 (${this.DR}), M[AR] ← DR`;
                break;

            default:
                this.SC = 0;
                msg = `Unknown opcode ${opcode}`;
        }
        return `T5: ${msg}`;
    }

    /**
     * Executes MRI instruction at T6 (ISZ only)
     * @returns {string} Description of operation
     */
    executeMRI_T6() {
        // Only ISZ reaches T6
        let drVal = parseInt(this.DR, 16);
        
        // IMPORTANT: Always reset SC to 0
        this.SC = 0;
        
        // Check for interrupt at end of instruction
        this.checkInterrupt();
        
        if (drVal === 0) {
            this.PC = Utils.incrementHex(this.PC).slice(-3);
            return `T6: DR=0, PC ← PC+1 (Skip)`;
        }
        return `T6: DR≠0, Continue`;
    }
}
