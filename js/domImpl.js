/**
 * DOM Implementation for SARBA Simulator
 * Handles UI interactions, I/O, and simulation control
 */

// ============================================================================
// SIMULATOR STATE
// ============================================================================

const SimState = {
    memory: null,
    cpu: null,
    currentLabels: {},
    currentUsageMap: {},
    runInterval: null,
    runSpeed: 50,
    traceHistory: [],
    currentInstrAddr: '000',
    inputQueue: [],
    outputBuffer: ''
};

// Memory view state
const memState = {
    format: 'hex',
    showAll: false,
    filterAddr: null
};

// DOM Elements cache
let elements = {};

// ============================================================================
// INITIALIZATION
// ============================================================================

function initElements() {
    elements = {
        // Editor
        editor: document.getElementById('assembly-editor'),
        btnAssemble: document.getElementById('btn-assemble'),
        logPanel: document.getElementById('log-panel'),

        // Control buttons
        btnReset: document.getElementById('btn-reset'),
        btnStep: document.getElementById('btn-step'),
        btnStepInst: document.getElementById('btn-step-inst'),
        btnRun: document.getElementById('btn-run'),
        btnStop: document.getElementById('btn-stop'),

        // Registers
        regDR: document.getElementById('reg-dr'),
        regAC: document.getElementById('reg-ac'),
        regAR: document.getElementById('reg-ar'),
        regPC: document.getElementById('reg-pc'),
        regIR: document.getElementById('reg-ir'),
        regTR: document.getElementById('reg-tr'),
        regINPR: document.getElementById('reg-inpr'),
        regOUTR: document.getElementById('reg-outr'),

        // Flags
        flagE: document.getElementById('flag-e'),
        flagI: document.getElementById('flag-i'),
        flagS: document.getElementById('flag-s'),
        flagR: document.getElementById('flag-r'),
        flagIEN: document.getElementById('flag-ien'),
        flagFGI: document.getElementById('flag-fgi'),
        flagFGO: document.getElementById('flag-fgo'),

        // Timing LEDs
        lblMicroOp: document.getElementById('lbl-micro-op'),
        leds: {
            t0: document.getElementById('led-t0'),
            t1: document.getElementById('led-t1'),
            t2: document.getElementById('led-t2'),
            t3: document.getElementById('led-t3'),
            t4: document.getElementById('led-t4'),
            t5: document.getElementById('led-t5'),
            t6: document.getElementById('led-t6')
        },

        // I/O Floating Modal
        ioBubble: document.getElementById('io-bubble'),
        ioModal: document.getElementById('io-modal'),
        ioModalClose: document.getElementById('io-modal-close'),
        ioInput: document.getElementById('io-input'),
        ioInputSend: document.getElementById('io-input-send'),
        ioInputClear: document.getElementById('io-input-clear'),
        ioQueue: document.getElementById('io-queue'),
        ioOutput: document.getElementById('io-output'),
        ioOutputClear: document.getElementById('io-output-clear'),

        // Input Required Modal
        inputModal: document.getElementById('input-modal'),
        inputModalField: document.getElementById('input-modal-field'),
        inputModalSubmit: document.getElementById('input-modal-submit'),
        inputModalCancel: document.getElementById('input-modal-cancel'),

        // Memory
        memoryBody: document.getElementById('memory-tbody'),
        memBtns: document.querySelectorAll('.mem-btn'),
        memGoto: document.getElementById('mem-goto'),
        memShowAll: document.getElementById('mem-show-all'),

        // Trace Modal
        traceModal: document.getElementById('trace-modal'),
        traceBody: document.getElementById('trace-tbody')
    };
}

function initSimulator() {
    SimState.memory = new Memory();
    SimState.cpu = new CPU(SimState.memory);
    
    // Set up CPU callbacks for I/O
    SimState.cpu.onOutput = handleCPUOutput;
    SimState.cpu.onInputRequired = handleInputRequired;
}

// ============================================================================
// LOGGING
// ============================================================================

function log(msg, type = 'info') {
    if (!elements.logPanel) return;
    
    const div = document.createElement('div');
    div.className = `log-message log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    elements.logPanel.prepend(div);
    
    while (elements.logPanel.children.length > 100) {
        elements.logPanel.removeChild(elements.logPanel.lastChild);
    }
}

// ============================================================================
// DISASSEMBLY
// ============================================================================

function disassemble(val, addr) {
    const addrInt = parseInt(addr, 16);
    const usage = SimState.currentUsageMap[addrInt];

    if (usage === 'data') {
        return 'HEX ' + Utils.decToHex(val, 4);
    }

    if (val === 0 && !usage) return '';

    const I = (val >> 15) & 1;
    const opcode = (val >> 12) & 7;
    const address = val & 0xFFF;
    const hexAddr = Utils.decToHex(address, 3);

    const mri = ['AND', 'ADD', 'LDA', 'STA', 'BUN', 'BSA', 'ISZ'];
    if (opcode < 7) {
        return `${mri[opcode]} ${hexAddr}${I ? ' I' : ''}`;
    }

    if (I === 0) {
        const rriMap = {
            0x7800: 'CLA', 0x7400: 'CLE', 0x7200: 'CMA', 0x7100: 'CME',
            0x7080: 'CIR', 0x7040: 'CIL', 0x7020: 'INC', 0x7010: 'SPA',
            0x7008: 'SNA', 0x7004: 'SZA', 0x7002: 'SZE', 0x7001: 'HLT'
        };
        return rriMap[val] || 'HEX ' + Utils.decToHex(val, 4);
    }

    const ioMap = {
        0xF800: 'INP', 0xF400: 'OUT', 0xF200: 'SKI', 0xF100: 'SKO',
        0xF080: 'ION', 0xF040: 'IOF'
    };
    return ioMap[val] || 'HEX ' + Utils.decToHex(val, 4);
}

// ============================================================================
// I/O HANDLING
// ============================================================================

function handleCPUOutput(charCode) {
    const char = String.fromCharCode(charCode);
    SimState.outputBuffer += char;
    updateIODisplay();
    
    // Add glow effect to bubble when there's new output
    if (elements.ioBubble) {
        elements.ioBubble.classList.add('has-output');
    }
}

function handleInputRequired() {
    if (SimState.inputQueue.length > 0) {
        const charCode = SimState.inputQueue.shift();
        SimState.cpu.setInput(charCode);
        updateIODisplay();
    } else {
        showInputModal();
    }
}

function queueInput(char) {
    if (char && char.length > 0) {
        const charCode = char.charCodeAt(0);
        SimState.inputQueue.push(charCode);
        
        // If CPU is waiting for input, provide it immediately from queue
        if (SimState.cpu.waitingForInput && SimState.inputQueue.length > 0) {
            const code = SimState.inputQueue.shift();
            SimState.cpu.setInput(code);
            // Don't auto-resume - let user control execution
            // User can click Run or Step to continue
        } else if (!SimState.cpu.waitingForInput) {
            // If CPU is not waiting, set FGI flag immediately if queue has items
            // This allows SKI instruction to work correctly
            if (SimState.inputQueue.length > 0 && !SimState.cpu.FGI) {
                // Auto-feed first character from queue to INPR and set FGI
                const code = SimState.inputQueue.shift();
                SimState.cpu.setInput(code);
            }
        }
        
        updateIODisplay();
    }
}

function updateIODisplay() {
    if (elements.ioQueue) {
        if (SimState.inputQueue.length === 0) {
            elements.ioQueue.textContent = '(empty)';
        } else {
            const chars = SimState.inputQueue.map(code => {
                const char = String.fromCharCode(code);
                return char === ' ' ? '␣' : char;
            }).join('');
            elements.ioQueue.textContent = `"${chars}" (${SimState.inputQueue.length})`;
        }
    }
    
    if (elements.ioOutput) {
        elements.ioOutput.textContent = SimState.outputBuffer;
        elements.ioOutput.scrollTop = elements.ioOutput.scrollHeight;
    }
}

function toggleIOModal() {
    if (elements.ioModal) {
        elements.ioModal.classList.toggle('active');
        
        // Remove glow when opening modal
        if (elements.ioBubble && elements.ioModal.classList.contains('active')) {
            elements.ioBubble.classList.remove('has-output');
        }
    }
}

function closeIOModal() {
    if (elements.ioModal) {
        elements.ioModal.classList.remove('active');
    }
}

function showInputModal() {
    if (elements.inputModal) {
        elements.inputModal.classList.add('active');
        if (elements.inputModalField) {
            elements.inputModalField.value = '';
            elements.inputModalField.focus();
        }
    }
}

function hideInputModal() {
    if (elements.inputModal) {
        elements.inputModal.classList.remove('active');
    }
}

function submitModalInput() {
    if (elements.inputModalField && elements.inputModalField.value) {
        const char = elements.inputModalField.value.charAt(0);
        // If CPU is waiting for input, provide it directly and set FGI
        if (SimState.cpu.waitingForInput) {
            SimState.cpu.setInput(char.charCodeAt(0));
            updateIODisplay();
            updateUI(); // Update UI to show FGI flag is now true
            // Don't auto-resume - let user control execution
        } else {
            // CPU not waiting - add to queue (which will set FGI if queue was empty)
            queueInput(char);
            updateUI(); // Update UI to show FGI flag if it was set
        }
        hideInputModal();
    } else {
        hideInputModal();
    }
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateTiming(res) {
    if (elements.lblMicroOp) {
        elements.lblMicroOp.textContent = res.msg || "Ready";
        elements.lblMicroOp.style.color = !SimState.cpu.S ? "#ef4444" : "#4f46e5";
    }
    
    Object.values(elements.leds).forEach(led => {
        if (led) led.classList.remove('active');
    });
    
    if (SimState.cpu.S && res.msg) {
        const match = res.msg.match(/^T(\d):/);
        if (match) {
            const led = elements.leds[`t${match[1]}`];
            if (led) led.classList.add('active');
        }
    }
}

function recordTrace(res) {
    if (!res.msg) return '';

    const tMatch = res.msg.match(/^T(\d):/);
    const tVal = tMatch ? parseInt(tMatch[1]) : -1;

    let phase = "";
    if (tVal >= 0 && tVal <= 1) phase = "Fetch";
    else if (tVal === 2) phase = "Decode";
    else if (tVal === 3) phase = SimState.cpu.I ? "Indirect" : "Execute";
    else if (tVal > 3) phase = "Execute";

    if (tVal === 0) {
        SimState.currentInstrAddr = SimState.cpu.PC;
    }

    SimState.traceHistory.push({
        instrAddr: SimState.currentInstrAddr,
        phase: phase,
        timing: tMatch ? `T${tMatch[1]}` : '-',
        op: res.msg,
        ir: SimState.cpu.IR,
        ac: SimState.cpu.AC,
        dr: SimState.cpu.DR,
        pc: SimState.cpu.PC,
        ar: SimState.cpu.AR,
        memAr: SimState.memory.read(SimState.cpu.AR),
        e: SimState.cpu.E ? '1' : '0'
    });

    return phase;
}

function updateUI(res = { msg: 'Ready' }) {
    if (!elements.regDR) return;

    elements.regDR.textContent = SimState.cpu.DR;
    elements.regAC.textContent = SimState.cpu.AC;
    elements.regAR.textContent = SimState.cpu.AR;
    elements.regPC.textContent = SimState.cpu.PC;
    elements.regIR.textContent = SimState.cpu.IR;
    elements.regTR.textContent = SimState.cpu.TR;
    elements.regINPR.textContent = SimState.cpu.INPR;
    elements.regOUTR.textContent = SimState.cpu.OUTR;

    updateFlag(elements.flagE, SimState.cpu.E);
    updateFlag(elements.flagI, SimState.cpu.I);
    updateFlag(elements.flagS, SimState.cpu.S);
    updateFlag(elements.flagR, SimState.cpu.R);
    updateFlag(elements.flagIEN, SimState.cpu.IEN);
    updateFlag(elements.flagFGI, SimState.cpu.FGI);
    updateFlag(elements.flagFGO, SimState.cpu.FGO);

    updateTiming(res);
}

function updateFlag(el, active) {
    if (!el) return;
    if (active) {
        el.classList.add('active');
    } else {
        el.classList.remove('active');
    }
}

// ============================================================================
// MEMORY VIEW
// ============================================================================

function updateMemoryView() {
    if (!elements.memoryBody) return;
    
    const fragment = document.createDocumentFragment();
    let items = [];

    if (memState.showAll) {
        const CHUNK_SIZE = 256;
        const startAddr = memState.filterAddr 
            ? Math.max(0, parseInt(memState.filterAddr, 16) - CHUNK_SIZE/2)
            : 0;
        const endAddr = Math.min(4096, startAddr + CHUNK_SIZE);
        
        for (let i = startAddr; i < endAddr; i++) {
            const addr = Utils.decToHex(i, 3);
            items.push({ address: addr, content: SimState.memory.read(addr) });
        }
    } else {
        let rawItems = SimState.memory.getNonZeroMemory();

        Object.keys(SimState.currentUsageMap).forEach(addrStr => {
            const h = Utils.decToHex(parseInt(addrStr), 3);
            if (!rawItems.find(x => x.address === h)) {
                rawItems.push({ address: h, content: SimState.memory.read(h) });
            }
        });

        items = rawItems;

        // Only include PC if a program is loaded and the CPU has started
        const hasProgramLoaded = Object.keys(SimState.currentUsageMap).length > 0;
        if (hasProgramLoaded && SimState.cpu.S) {
            // Include PC location for highlighting current instruction
            const pcAddr = SimState.cpu.PC;
            if (!items.find(x => x.address === pcAddr)) {
                items.push({ address: pcAddr, content: SimState.memory.read(pcAddr) });
            }
        }
    }

    items.sort((a, b) => parseInt(a.address, 16) - parseInt(b.address, 16));

    if (memState.filterAddr && !memState.showAll) {
        if (!items.find(x => x.address === memState.filterAddr)) {
            items.push({
                address: memState.filterAddr,
                content: SimState.memory.read(memState.filterAddr)
            });
            items.sort((a, b) => parseInt(a.address, 16) - parseInt(b.address, 16));
        }
    }

    const addrToLabel = {};
    for (const [lbl, addr] of Object.entries(SimState.currentLabels)) {
        addrToLabel[Utils.decToHex(addr, 3)] = lbl;
    }

    const formatValue = (hex) => {
        const val = parseInt(hex, 16);
        switch (memState.format) {
            case 'dec': return val.toString();
            case 'bin': return val.toString(2).padStart(16, '0');
            default: return hex;
        }
    };

    let scrollTarget = null;

    items.forEach(item => {
        const tr = document.createElement('tr');
        const isAR = (item.address === SimState.cpu.AR);
        const isMatch = (memState.filterAddr && item.address === memState.filterAddr);

        if (isAR) tr.classList.add('highlight');
        if (isMatch) {
            tr.classList.add('match-highlight');
            scrollTarget = tr;
        }

        const label = addrToLabel[item.address] || '';
        const val = parseInt(item.content, 16);
        const mnemonic = disassemble(val, item.address);

        tr.innerHTML = `
            <td>${item.address}</td>
            <td style="font-family:'JetBrains Mono'; color:#2563eb;">${formatValue(item.content)}</td>
            <td style="color:#64748b; font-size:12px;">
                ${label ? `<span style="color:#059669; font-weight:bold; margin-right:8px;">${label}</span>` : ''}
                <span style="color:#475569;">${mnemonic}</span>
            </td>
        `;

        tr.addEventListener('click', () => openTraceModal(item.address));
        fragment.appendChild(tr);
    });

    elements.memoryBody.innerHTML = '';
    elements.memoryBody.appendChild(fragment);

    if (scrollTarget) {
        setTimeout(() => {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 10);
    }
}

// ============================================================================
// TRACE MODAL
// ============================================================================

function openTraceModal(addr) {
    if (!elements.traceModal) return;
    elements.traceModal.classList.add('active');

    if (!elements.traceBody) return;
    elements.traceBody.innerHTML = '';

    const filteredTrace = SimState.traceHistory.filter(row => row.instrAddr === addr);

    if (filteredTrace.length === 0) {
        elements.traceBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No execution history for address ${addr}.</td></tr>`;
        return;
    }

    filteredTrace.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.phase}</td>
            <td>${row.timing}</td>
            <td>${row.op}</td>
            <td>${row.ir}</td>
            <td>${row.ac}</td>
            <td>${row.dr}</td>
            <td>${row.pc}</td>
            <td>${row.ar}</td>
            <td>${row.memAr}</td>
            <td>${row.e}</td>
        `;
        elements.traceBody.appendChild(tr);
    });
}

window.closeTraceModal = function() {
    if (elements.traceModal) {
        elements.traceModal.classList.remove('active');
    }
};

// ============================================================================
// SIMULATION CONTROL
// ============================================================================

function stopRun() {
    if (SimState.runInterval) {
        clearInterval(SimState.runInterval);
        SimState.runInterval = null;
    }
    
    if (elements.btnRun) {
        elements.btnRun.classList.remove('hidden');
        elements.btnStop.classList.add('hidden');
        elements.btnStep.disabled = false;
        elements.btnStepInst.disabled = false;
    }
    
    updateMemoryView();
}

function doStep() {
    if (!SimState.cpu.S) return;
    
    const res = SimState.cpu.step();
    
    if (res.state === 'WaitInput') {
        handleInputRequired();
        updateUI(res);
        return res;
    }
    
    recordTrace(res);
    updateUI(res);
    updateMemoryView();
    
    if (res.state === 'Halt' || !SimState.cpu.S) {
        stopRun();
        log('Halted.', 'warning');
    }
    
    return res;
}

function doStepInstruction() {
    if (!SimState.cpu.S) return;
    
    let res = SimState.cpu.step();
    
    if (res.state === 'WaitInput') {
        handleInputRequired();
        updateUI(res);
        return;
    }
    
    recordTrace(res);
    
    let safety = 0;
    while (SimState.cpu.SC !== 0 && SimState.cpu.S && safety++ < 50) {
        res = SimState.cpu.step();
        
        if (res.state === 'WaitInput') {
            handleInputRequired();
            break;
        }
        
        recordTrace(res);
    }
    
    updateUI(res);
    updateMemoryView();
    
    if (res.state === 'Halt' || !SimState.cpu.S) {
        stopRun();
        log('Halted.', 'warning');
    }
}

function startRun() {
    if (!SimState.cpu.S) return;
    
    elements.btnRun.classList.add('hidden');
    elements.btnStop.classList.remove('hidden');
    elements.btnStep.disabled = true;
    elements.btnStepInst.disabled = true;
    
    SimState.runInterval = setInterval(() => {
        const res = SimState.cpu.step();
        
        if (res.state === 'WaitInput') {
            stopRun();
            handleInputRequired();
            updateUI(res);
            return;
        }
        
        recordTrace(res);
        updateUI(res);
        
        if (!SimState.cpu.S) {
            stopRun();
            log('Halted.', 'warning');
            updateMemoryView();
        }
    }, SimState.runSpeed);
}

function doAssemble() {
    const code = elements.editor.value;
    
    try {
        const res = Assembler.assemble(code);
        
        if (res.success) {
            log(`Assembled successfully. ${Object.keys(res.machineCode).length} words generated.`, 'success');
            
            SimState.currentLabels = res.labels || {};
            SimState.currentUsageMap = res.usageMap || {};
            
            SimState.memory.reset();
            SimState.cpu.reset();
            SimState.memory.loadProgram(res.machineCode);
            SimState.cpu.setPC(Utils.decToHex(res.startAddress, 3));
            SimState.currentInstrAddr = Utils.decToHex(res.startAddress, 3);
            
            SimState.traceHistory = [];
            SimState.inputQueue = [];
            SimState.outputBuffer = '';
            
            updateUI();
            updateMemoryView();
            updateIODisplay();
            
            elements.btnReset.disabled = false;
            elements.btnStep.disabled = false;
            elements.btnStepInst.disabled = false;
            elements.btnRun.disabled = false;
            
            document.querySelector('[data-target="tab-sim"]').click();
        } else {
            res.errors.forEach(err => log(err, 'error'));
        }
    } catch (e) {
        log(`Assembly error: ${e.message}`, 'error');
        console.error(e);
    }
}

function doReset() {
    stopRun();
    SimState.cpu.reset();
    SimState.memory.reset();
    SimState.currentLabels = {};
    SimState.currentUsageMap = {};
    SimState.traceHistory = [];
    SimState.inputQueue = [];
    SimState.outputBuffer = '';
    
    updateUI();
    updateMemoryView();
    updateIODisplay();
    
    // Remove output glow
    if (elements.ioBubble) {
        elements.ioBubble.classList.remove('has-output');
    }
    
    elements.btnStep.disabled = true;
    elements.btnStepInst.disabled = true;
    elements.btnRun.disabled = true;
    
    log('System reset.', 'info');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    initElements();
    initSimulator();

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).classList.add('active');
        });
    });

    // Memory format buttons
    elements.memBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.memBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            memState.format = btn.getAttribute('data-fmt');
            updateMemoryView();
        });
    });

    // Memory show all toggle
    if (elements.memShowAll) {
        elements.memShowAll.addEventListener('change', (e) => {
            memState.showAll = e.target.checked;
            updateMemoryView();
        });
    }

    // Memory go to address
    if (elements.memGoto) {
        elements.memGoto.addEventListener('input', (e) => {
            let val = e.target.value.trim().toUpperCase();
            if (val.length > 3) val = val.slice(0, 3);
            if (/^[0-9A-F]+$/.test(val)) {
                memState.filterAddr = val.padStart(3, '0');
            } else {
                memState.filterAddr = null;
            }
            updateMemoryView();
        });
    }

    // Assemble button
    if (elements.btnAssemble) {
        elements.btnAssemble.addEventListener('click', doAssemble);
    }

    // Step button
    if (elements.btnStep) {
        elements.btnStep.addEventListener('click', doStep);
    }

    // Step instruction button
    if (elements.btnStepInst) {
        elements.btnStepInst.addEventListener('click', doStepInstruction);
    }

    // Run button
    if (elements.btnRun) {
        elements.btnRun.addEventListener('click', startRun);
    }

    // Stop button
    if (elements.btnStop) {
        elements.btnStop.addEventListener('click', stopRun);
    }

    // Reset button
    if (elements.btnReset) {
        elements.btnReset.addEventListener('click', doReset);
    }

    // I/O Bubble click
    if (elements.ioBubble) {
        elements.ioBubble.addEventListener('click', toggleIOModal);
    }

    // I/O Modal close
    if (elements.ioModalClose) {
        elements.ioModalClose.addEventListener('click', closeIOModal);
    }

    // I/O Input handling
    if (elements.ioInput) {
        elements.ioInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                queueInput(elements.ioInput.value);
                elements.ioInput.value = '';
            }
        });
    }

    if (elements.ioInputSend) {
        elements.ioInputSend.addEventListener('click', () => {
            queueInput(elements.ioInput.value);
            elements.ioInput.value = '';
        });
    }

    if (elements.ioInputClear) {
        elements.ioInputClear.addEventListener('click', () => {
            SimState.inputQueue = [];
            SimState.cpu.FGI = false;
            updateIODisplay();
            updateUI();
        });
    }

    if (elements.ioOutputClear) {
        elements.ioOutputClear.addEventListener('click', () => {
            SimState.outputBuffer = '';
            updateIODisplay();
            
            // Remove glow
            if (elements.ioBubble) {
                elements.ioBubble.classList.remove('has-output');
            }
        });
    }

    // Input required modal
    if (elements.inputModalSubmit) {
        elements.inputModalSubmit.addEventListener('click', submitModalInput);
    }

    if (elements.inputModalCancel) {
        elements.inputModalCancel.addEventListener('click', () => {
            hideInputModal();
            stopRun();
            log('Execution cancelled - waiting for input.', 'warning');
        });
    }

    if (elements.inputModalField) {
        elements.inputModalField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitModalInput();
            }
        });
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Close I/O modal when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.ioModal && elements.ioModal.classList.contains('active')) {
            if (!elements.ioModal.contains(e.target) && !elements.ioBubble.contains(e.target)) {
                closeIOModal();
            }
        }
    });

    // Initial UI update
    updateUI();
    updateIODisplay();
    
    log('SARBA Simulator ready.', 'info');
});
