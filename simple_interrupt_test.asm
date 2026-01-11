// ============================================================================
// SIMPLE INTERRUPT TEST - Easy to understand and verify
// ============================================================================
// This is a simpler test to verify interrupt functionality
//
// Test Steps:
// 1. Assemble and run
// 2. Program enables interrupts (ION)
// 3. Program enters infinite loop
// 4. Provide input via I/O Console (sets FGI=1)
// 5. At end of current instruction, R flag should be set (if IEN=1)
// 6. Next instruction fetch (T0) will trigger interrupt
// 7. CPU jumps to address 1 (ISR)
// 8. ISR reads input and echoes it
// 9. ISR returns to main program
//
// Watch these flags during execution:
// - IEN: Should be 1 after ION executes
// - FGI: Should be 1 when input is provided
// - R: Should be 1 when IEN=1 and (FGI=1 or FGO=1) at end of instruction
// ============================================================================

ORG 001
// Interrupt Service Routine
// CPU jumps here when interrupt occurs
ISR, INP        // Read input (clears FGI)
OUT             // Echo input (clears FGO)
LDA 000         // Load return address from M[0]
BUN 000 I       // Return to main program (indirect jump)

ORG 100
// Main Program
MAIN, CLA       // Clear AC
ION             // Enable interrupts - IEN = 1
                // Now R flag will be set when FGI=1 or FGO=1

LOOP, BUN LOOP  // Infinite loop - wait for interrupt
                // When you provide input, interrupt will occur
                // and CPU will jump to address 1

HLT             // End
END
