# SARBA (Single Accumulator Register-Based Architecture) - Mano Machine
## Complete Architecture Documentation for Simulator Development

## Table of Contents
1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Instruction Set Architecture (ISA)](#instruction-set-architecture)
4. [Instruction Format](#instruction-format)
5. [Execution Cycle](#execution-cycle)
6. [Memory Organization](#memory-organization)
7. [Addressing Modes](#addressing-modes)
8. [Detailed Instruction Descriptions](#detailed-instruction-descriptions)
9. [Control Unit Operation](#control-unit-operation)
10. [Programming Examples](#programming-examples)

---

## Overview

The SARBA (Single Accumulator Register-Based Architecture), also known as the **Mano Machine** or **Basic Computer**, is a simple yet complete computer architecture designed for educational purposes. It demonstrates fundamental concepts of computer organization and architecture.

### Key Characteristics
- **Word Size**: 16 bits
- **Memory Size**: 4096 words (12-bit addressing)
- **Instruction Format**: Single format with opcode and address
- **Processing**: Single accumulator-based
- **Architecture Type**: Von Neumann (stored program)

---

## Architecture Components

### 1. Registers

| Register | Size | Symbol | Description |
|----------|------|--------|-------------|
| **Accumulator** | 16 bits | AC | Main data register for arithmetic/logic operations |
| **Data Register** | 16 bits | DR | Holds operand from memory |
| **Address Register** | 12 bits | AR | Holds memory address |
| **Instruction Register** | 16 bits | IR | Holds current instruction |
| **Program Counter** | 12 bits | PC | Points to next instruction |
| **Temporary Register** | 16 bits | TR | Temporary storage for ALU operations |
| **Input Register** | 8 bits | INPR | Holds input character |
| **Output Register** | 8 bits | OUTR | Holds output character |

### 2. Flip-Flops (Status Flags)

| Flag | Symbol | Description |
|------|--------|-------------|
| **Indirect** | I | Indicates indirect addressing (bit 15 of IR) |
| **Interrupt Enable** | IEN | Enables/disables interrupts |
| **Interrupt Flag** | R | Indicates interrupt occurred |
| **Carry** | E | Extended accumulator bit (carry/overflow) |
| **Sign** | S | Sign bit of accumulator |

### 3. Functional Units

- **Arithmetic Logic Unit (ALU)**: Performs arithmetic and logical operations
- **Control Unit**: Generates control signals for instruction execution
- **Memory Unit**: 4096 x 16-bit RAM
- **Input-Output Interface**: Handles I/O operations

---

## Instruction Set Architecture (ISA)

### Instruction Categories

The Mano Machine has **25 instructions** divided into three categories:

1. **Memory-Reference Instructions (MRI)** - 7 instructions (Opcodes 0-6)
2. **Register-Reference Instructions (RRI)** - 12 instructions (Opcode 7, I=0)
3. **Input-Output Instructions (IOI)** - 6 instructions (Opcode 7, I=1)

---

## Instruction Format

### 16-Bit Instruction Word

```
Bit:  15   14  13  12  11  10   9   8   7   6   5   4   3   2   1   0
     +---+----+----+----+----+----+----+----+----+----+----+----+----+
     | I | Opcode  |          Address (12 bits)                      |
     +---+----+----+----+----+----+----+----+----+----+----+----+----+
```

- **Bit 15 (I)**: Indirect addressing mode bit
  - I = 0: Direct addressing
  - I = 1: Indirect addressing
- **Bits 14-12**: Opcode (3 bits for 8 possible opcodes)
- **Bits 11-0**: Address field (12 bits for 4096 memory locations)

### Special Cases

For **Register-Reference** and **I/O Instructions** (Opcode = 7):
- If I = 0: Register-reference instruction
- If I = 1: I/O instruction
- Bits 11-0 specify the particular operation (only one bit is set)

---

## Execution Cycle

The instruction execution follows a **Fetch-Decode-Execute** cycle:

### Timing Diagram

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → ...
```

### Fetch Phase (Common for all instructions)

**T0**: `AR ← PC`
- Transfer program counter to address register

**T1**: `IR ← M[AR], PC ← PC + 1`
- Fetch instruction from memory
- Increment program counter

**T2**: `AR ← IR(0-11), I ← IR(15), Decode Opcode`
- Transfer address to AR
- Store indirect bit
- Decode the opcode

### Indirect Addressing Check (T3)

**T3**: If indirect (I = 1):
- `AR ← M[AR]`
- Fetch effective address from memory

### Execute Phase (T4, T5, T6...)

Execution steps vary based on instruction type.

---

## Memory Organization

### Memory Map

```
Address Range    | Usage
-----------------|---------------------------------
0000 - 00FF      | Page 0 (typically for variables)
0100 - 0FFF      | General purpose memory
```

### Memory Access

- **Read**: Content at address AR is placed in DR
- **Write**: Content of AC (or other register) is stored at address AR

---

## Addressing Modes

### 1. Direct Addressing (I = 0)

The address field specifies the operand location directly.

```
Effective Address = Address field (bits 11-0)
```

**Example**: `LDA 500` loads the content of memory location 500 into AC.

### 2. Indirect Addressing (I = 1)

The address field points to a memory location containing the effective address.

```
Effective Address = M[Address field]
```

**Example**: `LDA 500 I` loads AC with M[M[500]].

---

## Detailed Instruction Descriptions

### Memory-Reference Instructions (MRI)

| Opcode | Mnemonic | I=0 (Direct) | I=1 (Indirect) | Description |
|--------|----------|--------------|----------------|-------------|
| 000 | AND | `AC ← AC ∧ M[AR]` | `AC ← AC ∧ M[M[AR]]` | AND memory word with AC |
| 001 | ADD | `AC ← AC + M[AR], E ← Carry` | `AC ← AC + M[M[AR]], E ← Carry` | Add memory word to AC |
| 010 | LDA | `AC ← M[AR]` | `AC ← M[M[AR]]` | Load AC from memory |
| 011 | STA | `M[AR] ← AC` | `M[M[AR]] ← AC` | Store AC to memory |
| 100 | BUN | `PC ← AR` | `PC ← M[AR]` | Branch unconditionally |
| 101 | BSA | `M[AR] ← PC, PC ← AR + 1` | `M[M[AR]] ← PC, PC ← M[AR] + 1` | Branch and save return address |
| 110 | ISZ | `M[AR] ← M[AR] + 1, if result = 0 then PC ← PC + 1` | Similar with indirect | Increment and skip if zero |

### Register-Reference Instructions (RRI)

**Opcode = 111, I = 0**

Only one bit (0-11) is set to 1 to specify the operation.

| Bit | Hex Code | Mnemonic | Operation | Description |
|-----|----------|----------|-----------|-------------|
| 11 | 7800 | CLA | `AC ← 0` | Clear AC |
| 10 | 7400 | CLE | `E ← 0` | Clear E |
| 9 | 7200 | CMA | `AC ← AC'` | Complement AC |
| 8 | 7100 | CME | `E ← E'` | Complement E |
| 7 | 7080 | CIR | `AC ← shr(AC), AC(15) ← E, E ← AC(0)` | Circular right shift |
| 6 | 7040 | CIL | `AC ← shl(AC), AC(0) ← E, E ← AC(15)` | Circular left shift |
| 5 | 7020 | INC | `AC ← AC + 1` | Increment AC |
| 4 | 7010 | SPA | `if AC(15) = 0 then PC ← PC + 1` | Skip if AC positive |
| 3 | 7008 | SNA | `if AC(15) = 1 then PC ← PC + 1` | Skip if AC negative |
| 2 | 7004 | SZA | `if AC = 0 then PC ← PC + 1` | Skip if AC zero |
| 1 | 7002 | SZE | `if E = 0 then PC ← PC + 1` | Skip if E zero |
| 0 | 7001 | HLT | `S ← 0` | Halt computer |

**Note**: Multiple operations can be combined (e.g., CLA + CLE = 7C00)

### Input-Output Instructions (IOI)

**Opcode = 111, I = 1**

| Bit | Hex Code | Mnemonic | Operation | Description |
|-----|----------|----------|-----------|-------------|
| 11 | F800 | INP | `AC(0-7) ← INPR, FGI ← 0` | Input character to AC |
| 10 | F400 | OUT | `OUTR ← AC(0-7), FGO ← 0` | Output character from AC |
| 9 | F200 | SKI | `if FGI = 1 then PC ← PC + 1` | Skip if input flag set |
| 8 | F100 | SKO | `if FGO = 1 then PC ← PC + 1` | Skip if output flag set |
| 7 | F080 | ION | `IEN ← 1` | Enable interrupts |
| 6 | F040 | IOF | `IEN ← 0` | Disable interrupts |

**Flags**:
- **FGI** (Input Flag): Set when new input is available
- **FGO** (Output Flag): Set when output device is ready

---

## Control Unit Operation

### Timing Signals

The control unit generates timing signals T0, T1, T2, ... using a counter.

### Instruction Cycle Flow

```
┌─────────────────────────────────────────────┐
│         Fetch Cycle (T0, T1, T2)           │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
         ┌────────────────┐
         │ I = 1?         │ (Indirect?)
         └────┬───────┬───┘
              │Yes    │No
              ↓       ↓
         ┌────────┐  │
         │   T3   │  │
         └────┬───┘  │
              └──────┴────────→ Execute Phase
                               (T4, T5, T6...)
                                      │
                                      ↓
                               ┌──────────────┐
                               │ Instruction  │
                               │  Complete    │
                               └──────┬───────┘
                                      │
                                      ↓
                               Back to T0 (next instruction)
```

### Control Logic Examples

**Fetch Cycle**:
```
T0: AR ← PC
T1: IR ← M[AR], PC ← PC + 1
T2: D0...D7 ← Decode IR(12-14), AR ← IR(0-11), I ← IR(15)
```

**Example - LDA Instruction (D2)**:
```
D2T4:  DR ← M[AR]
D2T5:  AC ← DR
```

**Example - ADD Instruction (D1)**:
```
D1T4:  DR ← M[AR]
D1T5:  AC ← AC + DR, E ← Cout
```

---

## Programming Examples

### Example 1: Add Two Numbers

```assembly
ORG 100      / Start at address 100
LDA A        / Load first number
ADD B        / Add second number
STA C        / Store result
HLT          / Halt
A, DEC 5     / First operand = 5
B, DEC 3     / Second operand = 3
C, DEC 0     / Result location
END
```

### Example 2: Loop Example - Sum 1 to N

```assembly
ORG 100
        LDA N        / Load N
        STA CTR      / Initialize counter
        CLA          / Clear AC (sum = 0)
LOOP,   ADD CTR      / Add counter to sum
        ISZ NCTR     / Increment negative counter
        BUN LOOP     / If not zero, loop
        STA SUM      / Store sum
        HLT
N,      DEC 10       / N = 10
NCTR,   DEC -10      / Negative counter
CTR,    DEC 0
SUM,    DEC 0
END
```

### Example 3: Input/Output

```assembly
ORG 100
        CLA          / Clear AC
CHK,    SKI          / Check input flag
        BUN CHK      / Wait for input
        INP          / Input character
        OUT          / Output character
        HLT
END
```

### Example 4: Subroutine Call

```assembly
ORG 100
        BSA SUB      / Call subroutine
        HLT

SUB,    HEX 0        / Return address stored here
        LDA X        / Subroutine code
        CMA
        INC
        STA X
        BUN SUB I    / Return (indirect through SUB)
X,      DEC 5
END
```

---

## Simulator Implementation Requirements

### Essential Components to Implement

1. **Memory Array**: 4096 x 16-bit words
2. **Registers**: AC, DR, AR, IR, PC, TR, INPR, OUTR (with proper bit sizes)
3. **Flags**: I, E, IEN, R, FGI, FGO
4. **Timing Counter**: T0-T6 states
5. **Decoder**: 3-to-8 line decoder for opcodes (D0-D7)

### Execution Flow

```
Initialize:
  PC = 0 (or specified start address)
  All registers = 0
  S = 1 (start flag)

While S = 1:
  1. Fetch instruction (T0, T1, T2)
  2. Decode instruction
  3. Check for indirect addressing (T3 if needed)
  4. Execute instruction (T4, T5, T6...)
  5. Handle interrupts if enabled
  6. Reset timing counter to T0
```

### User Interface Features

- **Register Display**: Show all register values in real-time
- **Memory View**: Display memory contents (hex/decimal/binary)
- **Step Execution**: Execute one instruction at a time
- **Breakpoints**: Pause at specific addresses
- **Assembly Support**: Load programs in assembly format
- **I/O Simulation**: Console for input/output operations

### Testing Instructions

Implement test cases for:
1. Each MRI with direct and indirect addressing
2. All register-reference instructions
3. All I/O instructions
4. Combined register operations
5. Loops and branches
6. Subroutine calls (BSA/BUN I)
7. Interrupt handling

---

## Assembly Language Format

### Pseudo-Instructions

| Directive | Description | Example |
|-----------|-------------|---------|
| ORG | Set origin (starting address) | `ORG 100` |
| END | End of program | `END` |
| DEC | Declare decimal constant | `X, DEC 25` |
| HEX | Declare hexadecimal constant | `Y, HEX 1A3F` |

### Label Format

```
LABEL,  INSTRUCTION  / Comment
```

- Labels are optional
- Comments start with `/`
- Instructions can use symbolic addresses

---

## Important Notes for Simulator Development

1. **Instruction Timing**: Each instruction requires different number of clock cycles
2. **Indirect Addressing**: Always requires an extra memory cycle (T3)
3. **Skip Instructions**: Affect program counter conditionally
4. **E Register**: Acts as 17th bit for AC in arithmetic operations
5. **Interrupts**: Can occur after any instruction if IEN = 1
6. **I/O Operations**: Asynchronous with flags FGI and FGO
7. **HLT Instruction**: Stops the clock (S ← 0)

---

## References

This documentation is based on:
- **Computer System Architecture** by M. Morris Mano (3rd Edition)
- Chapters 5 and 6: Basic Computer Organization and Programming

---

## Appendix: Quick Reference Tables

### Opcode Summary

| Binary | Hex | Mnemonic | Type |
|--------|-----|----------|------|
| 000 | 0 | AND | MRI |
| 001 | 1 | ADD | MRI |
| 010 | 2 | LDA | MRI |
| 011 | 3 | STA | MRI |
| 100 | 4 | BUN | MRI |
| 101 | 5 | BSA | MRI |
| 110 | 6 | ISZ | MRI |
| 111 | 7 | I=0: RRI, I=1: IOI | Special |

### Register-Reference Hex Codes

| Code | Operations | Example Result |
|------|------------|----------------|
| 7800 | CLA | AC = 0 |
| 7400 | CLE | E = 0 |
| 7200 | CMA | AC = NOT(AC) |
| 7100 | CME | E = NOT(E) |
| 7020 | INC | AC = AC + 1 |
| 7001 | HLT | Stop execution |
| 7C00 | CLA + CLE | AC = 0, E = 0 |

---

**End of Documentation**
