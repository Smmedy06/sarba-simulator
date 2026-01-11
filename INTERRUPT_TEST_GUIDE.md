# Interrupt Test Guide for SARBA Simulator

## Overview
This guide explains how to test interrupt functionality in the SARBA Simulator.

## How Interrupts Work in Mano Architecture

1. **Interrupt Enable Flag (IEN)**: Must be set to 1 using `ION` instruction
2. **Input Flag (FGI)**: Set to 1 when input is available
3. **Output Flag (FGO)**: Set to 1 when output device is ready
4. **Interrupt Request Flag (R)**: Set to 1 at the end of an instruction cycle when:
   - `IEN = 1` AND
   - (`FGI = 1` OR `FGO = 1`)

5. **Interrupt Cycle**: When `R = 1` at the start of a new instruction (T0):
   - CPU stores current PC at M[0]
   - CPU jumps to address 1 (interrupt service routine)
   - IEN is cleared (set to 0)
   - R is cleared (set to 0)

6. **Return from Interrupt**: ISR should:
   - Handle the interrupt (read input, process output, etc.)
   - Load return address: `LDA 000`
   - Jump indirectly: `BUN 000 I`

## Test Programs

### 1. Simple Interrupt Test (`simple_interrupt_test.asm`)
**Best for first-time testing**

```assembly
ORG 001
ISR, INP        // Read input
OUT             // Echo input
LDA 000         // Load return address
BUN 000 I       // Return

ORG 100
MAIN, CLA       // Clear AC
ION             // Enable interrupts
LOOP, BUN LOOP  // Wait for interrupt
HLT
END
```

**How to test:**
1. Assemble the program
2. Click "Run" - program enters infinite loop
3. Open I/O Console and type a character, click "Send"
   - OR provide input via the modal when it appears
4. Watch the flags:
   - FGI should turn ON (blue) when input is provided
   - R should turn ON (blue) at end of current instruction if IEN=1
5. CPU will jump to address 1 (ISR)
6. ISR will read and echo the input
7. ISR returns to main program (infinite loop continues)

### 2. Full Interrupt Test (`interrupt_test.asm`)
**More comprehensive test**

Same structure but with more detailed ISR handling.

## Expected Behavior

### Flag States During Execution:

1. **Before ION**: IEN=0, FGI=0, FGO=1, R=0
2. **After ION**: IEN=1, FGI=0, FGO=1, R=0
3. **After providing input**: IEN=1, FGI=1, FGO=1, R=0
4. **End of instruction (after input)**: IEN=1, FGI=1, FGO=1, **R=1** ✓
5. **Start of interrupt cycle**: CPU stores PC at M[0], jumps to address 1
6. **During ISR**: IEN=0, R=0 (cleared by interrupt cycle)
7. **After ISR returns**: Back to main program, IEN=0 (need to re-enable with ION)

## Troubleshooting

### FGI flag not turning ON?
- Make sure you're providing input via I/O Console or modal
- Check that input queue has characters
- Verify that `setInput()` is being called

### R flag not turning ON?
- Ensure IEN=1 (ION instruction executed)
- Ensure FGI=1 or FGO=1
- R is set at the END of an instruction cycle, not during

### Interrupt not triggering?
- Check that R=1 at start of next instruction (T0)
- Verify IEN was 1 when interrupt condition was met
- Check that address 1 contains valid ISR code

### ISR not returning correctly?
- Ensure M[0] contains the return address (set by CPU)
- ISR must use: `LDA 000, BUN 000 I`
- Verify indirect addressing is working

## Tips

1. **Step through execution** to see flag changes in real-time
2. **Watch the memory** - M[0] should contain return address after interrupt
3. **Check PC register** - should jump to 001 during interrupt
4. **Monitor flags panel** - all flags should update correctly
5. **Use I/O Console** to queue multiple inputs for testing

## Example Test Sequence

1. Load `simple_interrupt_test.asm`
2. Assemble
3. Click "Run"
4. Program loops at address 102 (BUN LOOP)
5. Open I/O Console
6. Type 'A' and click "Send"
7. Observe:
   - FGI turns ON (blue)
   - At end of BUN instruction, R turns ON (blue)
   - Next instruction fetch triggers interrupt
   - PC jumps to 001
   - ISR executes (reads 'A', outputs 'A')
   - ISR returns to address 102
   - Loop continues
