// ============================================================================
// INTERRUPT TEST PROGRAM FOR SARBA SIMULATOR
// ============================================================================
// This program demonstrates interrupt handling in the Mano Basic Computer
//
// How it works:
// 1. Main program starts at address 100
// 2. Enables interrupts with ION instruction
// 3. Waits in a loop
// 4. When interrupt occurs (FGI=1 or FGO=1 with IEN=1):
//    - CPU stores PC at M[0]
//    - CPU jumps to address 1 (interrupt service routine)
// 5. ISR at address 1 handles the interrupt
// 6. ISR returns using: LDA 0, BUN 0 I (indirect jump through M[0])
//
// To test:
// 1. Assemble this program
// 2. Run the program (it will enable interrupts and wait)
// 3. Provide input via I/O Console or modal (this sets FGI=1)
// 4. If IEN=1, interrupt will trigger at end of current instruction
// 5. CPU will jump to address 1 (ISR)
// 6. ISR will read input, echo it, and return to main program
// 7. Watch the R flag - it should be set when interrupt condition is met
// ============================================================================

ORG 000
// M[0] is used by CPU to store return address during interrupt
// Don't put code here - CPU will overwrite it

ORG 001
// Interrupt Service Routine (ISR) starts at address 1
// This is where CPU jumps when interrupt occurs
ISR_START, CLA   // Clear accumulator
INP              // Read input (this clears FGI flag)
OUT              // Echo the input back (this clears FGO flag)

// Return from interrupt
// M[0] contains the return address (saved PC)
LDA 000          // Load return address from M[0]
BUN 000 I        // Jump indirectly through M[0] (returns to main program)

ORG 100
// Main Program
START, CLA       // Clear accumulator
ION              // Enable interrupts (IEN = 1)
                 // Now interrupts will be processed when FGI=1 or FGO=1
                 // R flag will be set at end of each instruction if condition met

// Main loop - wait for interrupts
// The program will be interrupted when input is provided
LOOP, BUN LOOP   // Infinite loop - wait for interrupt
                 // When interrupt occurs, CPU jumps to address 1
                 // After ISR returns, execution continues here

HLT              // Should never reach here in normal execution
END
