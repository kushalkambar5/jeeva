<div align="center">

<img src="./public/logo.png" alt="Jeeva Logo" width="160" />

# Jeeva (जीव)
### Sovereign AI Voice-Driven Village RPG

**A top-down 2D simulation featuring autonomous Indic-voice NPCs with physical world agency, dynamic price negotiation, and cognitive memory.**

*Built for the **[Gnani.ai Great Indian AI Internship Challenge](https://www.gnani.ai/internship)***

---

[![Gnani AI Models](https://img.shields.io/badge/Gnani_AI-Prisma_STT_%7C_Timbre_TTS-0052CC?style=flat-square)](https://www.gnani.ai)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Phaser 4](https://img.shields.io/badge/Phaser-4.2-E44D26?style=flat-square)](https://phaser.io)
[![Database](https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-336791?style=flat-square&logo=postgresql)](https://orm.drizzle.team)
[![Memory](https://img.shields.io/badge/Cognitive_Memory-Mem0-059669?style=flat-square)](https://mem0.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

</div>

---

## Overview

In traditional role-playing games, non-player characters (NPCs) are static cardboard figures locked into rigid dialogue trees. When a character claims they will repair a generator or deliver emergency rations, they remain stationary forever. Furthermore, voice gaming experiences have historically catered solely to Western languages, stumbling when faced with the authentic cadence of Indian speech, localized dialects, and code-mixed phrasing.

**Jeeva** redefines the NPC paradigm by pairing **Gnani.ai's sovereign Indian-language speech and reasoning stack** with a 2D top-down simulation built on Phaser and Next.js. Set in the post-monsoon village of **Kaveripura**, players converse naturally with villagers in **Hindi, Tamil, Telugu, Kannada, Marathi, or Hinglish**. Villagers possess distinct moral values, living memory, and the power of **grounded autonomy**: dialogue commitments are verified by the game server and visibly executed in the game world before your eyes.

> [!NOTE]
> This project was engineered for **The Great Indian AI Internship Challenge** hosted by **Gnani.ai** ([gnani.ai/internship](https://www.gnani.ai/internship)), demonstrating real-world applications of sovereign Indian AI across telephony-grade speech-to-text, natural expressive Indic text-to-speech, and grounded reasoning.

---

## Built on Gnani.ai Sovereign AI Stack

Jeeva directly integrates the core pillars of Gnani.ai's sovereign stack to deliver low-latency, real-time voice interactions:

| Component | Gnani.ai Model / Engine | Implementation in Jeeva |
| :--- | :--- | :--- |
| **Speech-to-Text (STT)** | **Prisma v3.0 / v2.5** | Real-time streaming transcription (<200ms latency) handling 10+ Indic languages and code-mixed dialects (Hinglish, Tanglish) from browser 16kHz linear PCM audio streams. |
| **Text-to-Speech (TTS)** | **Timbre v2.5** | Context-aware prosodic voice synthesis with authentic pronunciation of Indian names, rupee amounts, and lakh/crore numerical cadences over high-speed WAV buffers. |
| **Reasoning & Actions** | **Evon v3.3 / Sovereign LLM** | 30B MoE Indian foundational model evaluating character morality, relationship vectors, inventory needs, and outputting server-validated structured tool actions. |

```
                       +---------------------------------------+
                       |           Player Microphone           |
                       +---------------------------------------+
                                           |  (16kHz Linear PCM Audio)
                                           v
+-------------------------------------------------------------------------------------+
|                              Next.js Backend Services                               |
|                                                                                     |
|   +--------------------------+                 +--------------------------------+   |
|   |  Gnani.ai Prisma STT     |  Transcribed    |  AI Language Identifier        |   |
|   |  - Audio decoding        | --------------> |  - Script & vocabulary check   |   |
|   |  - Indic speech model    |    Dialogue     |  - BCP-47 locale normalization |   |
|   +--------------------------+                 +--------------------------------+   |
|                                                                 |                   |
|                                                                 v                   |
|   +-----------------------------------------------------------------------------+   |
|   |                       Cognitive Context Assembly (Mem0)                     |   |
|   |   - Working Memory (Session turns)    - Relational Vectors (Trust/Affection)|   |
|   |   - Episodic Memory (Past deeds)      - Semantic Lore (Kaveripura status)   |   |
|   +-----------------------------------------------------------------------------+   |
|                                           |                                         |
|                                           v                                         |
|   +-----------------------------------------------------------------------------+   |
|   |                    Evon v3.3 Reasoning & Decision Engine                    |   |
|   |   - NPC persona alignment             - Dynamic negotiation evaluation      |   |
|   |   - Dialogue text generation          - Grounded physical action trigger    |   |
|   +-----------------------------------------------------------------------------+   |
|                    |                                             |                  |
|                    v                                             v                  |
|   +----------------------------------+         +--------------------------------+   |
|   |  Gnani.ai Timbre v2.5 TTS        |         |  Server-Authoritative Action   |   |
|   |  - Multi-voice synthesis         |         |  - Inventory exchange          |   |
|   |  - Deepak / Nalini / Kaveri      |         |  - Phaser waypoint pathfinding |   |
|   |  - Linear PCM 16kHz WAV stream   |         |  - Machine state mutation      |   |
|   +----------------------------------+         +--------------------------------+   |
+-------------------------------------------------------------------------------------+
                     |                                             |
                     v                                             v
+-------------------------------------------------------------------------------------+
|                                Phaser 2D Game World                                 |
|         [Spoken Voice Audio] + [Subtitles HUD] + [Physical NPC Movement/Repair]     |
+-------------------------------------------------------------------------------------+
```

---

## Challenge Awards Alignment

Jeeva was purposefully designed to address the evaluation criteria of the **Great Indian AI Internship Challenge**:

* **Main Character Award (Regional Indic Voice)**:
  First-class native support for regional languages including Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు), Hindi (हिन्दी), and Marathi (मराठी). Each NPC carries a localized cultural background and dialect.
* **Mixed Vibes Award (Code-Mixed Speech)**:
  Real-world conversational support for Hinglish and Tanglish. Players can blend English technical vocabulary with Indic vernacular (*"Arjun bhai, clinic ka generator dead hai, copper coil lagao"*), and the system handles the intent accurately.
* **Real Deal Award (Practical Real-World Problem Solving)**:
  Simulates genuine rural Indian scenarios—managing primary healthcare center (PHC) emergencies during disaster recovery, bargaining with local kirana merchants, and resolving agricultural water distribution disputes.
* **Noise Canceller Award (Telephonic Audio Robustness)**:
  Leverages Gnani.ai's acoustic models trained on millions of hours of noisy telephony data, ensuring reliable transcription even with room echo, low-cost headsets, and background village ambient audio.
* **Jugaad Genius Award (Grounded Agentic Autonomy)**:
  Bridges conversational LLMs directly to an interactive game simulation loop. Spoken negotiations result in physical world consequences—NPCs open toolkits, pathfind across coordinates, inspect blown alternators, and hand over physical inventory items.

---

## Key Gameplay Features

### 1. Grounded Physical Autonomy
No hollow promises. If Arjun the Mechanic agrees to fix the hospital dynamo, he closes his shop counter, pathfinds across the town square to the clinic, equips his wrench, and begins physical repairs. Every action is server-validated and rendered in the 2D game canvas.

<p align="center">
  <img src="./public/npc_autonomy_and_commands.png" alt="NPC Autonomy and Commands" width="720" />
</p>

### 2. Multi-Dialect Voice & Retro Keyboard Dual-Input
Hold `[E]` within an NPC's proximity threshold to activate push-to-talk voice recording. Speak naturally, or toggle instant retro RPG text mode with `[Enter]` for late-night or quiet gaming sessions.

<p align="center">
  <img src="./public/player_talking_with_npc.png" alt="Player Talking With NPC" width="720" />
</p>

### 3. Dynamic Price Negotiation Engine
Bargaining in Kaveripura is not a static button press. Dev the Merchant and Arjun the Mechanic have distinct greed levels, patience counters, and price flexibility profiles. Haggling too aggressively can alienate a vendor, while pointing out communal crises or leveraging high relationship standing unlocks significant discounts.

### 4. 4-Tier Cognitive Memory (Mem0 & PostgreSQL)
Every villager maintains a living, persistent cognitive state:
* **Working Memory**: Preserves context across multi-turn active dialogues.
* **Episodic Memory**: Remembers player promises, favors, thefts, and emergency assistances.
* **Relational Memory**: Tracks 5 continuous personality metrics (`trust`, `affection`, `respect`, `fear`, `familiarity`) computing social tiers from `trusted_friend` to `hostile_outcast`.
* **Semantic Memory**: High-importance baseline village lore seeded in PostgreSQL.

<p align="center">
  <img src="./public/npc_memory_and_relationships.png" alt="NPC Memory and Relationships" width="720" />
</p>

### 5. Grid-Based Inventory & Barter Economy
Manage a 15-slot grid inventory containing authentic items: copper induction coils, heavy spanner sets, soldering kits, solar regulators, grain sacks, and emergency medical salves. Drag, drop, equip, and barter items directly inside negotiation modals.

---

## Cast of Kaveripura

| Character | Role | Voice Persona | Language / Dialect | Traits & Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Meera** | Clinic Physician | `Kaveri` | Tamil / English | Overworked, selfless, protective of patients. Urgently requires power for refrigeration units. |
| **Arjun** | Master Mechanic | `Deepak` | Telugu / Hinglish | Blunt, practical tinkerer. Demands proper tools and raw copper before undertaking complex repairs. |
| **Dev** | Kirana Merchant | `Deepak` | Gujarati / Hindi | Shrewd, profit-conscious store owner. Holds the last remaining electrical supplies; open to smart haggling. |
| **Ravi** | Terrestrial Farmer | `Deepak` | Hindi / Bhojpuri | Hardworking, defensive of his waterlogged crops. Willing to barter grain if assisted with canal clearing. |
| **Ramesh Kaka** | Village Elder | `Deepak` | Sanskritized Hindi | Revered council head. Moderates dispute hearings under the ancient banyan tree. |
| **Inspector Vikram** | Constable | `Deepak` | Marathi / Hindi | Strict disciplinarian enforcing nocturnal flood curfews and investigating bazaar contraband. |
| **Ananya** | Companion | `Nalini` | Hindi / English | Resourceful, perceptive homestead partner providing morale, supplies, and strategic guidance. |

---

## Technical Architecture

```
jeeva_game/
├── app/
│   ├── api/
│   │   ├── auth/                 # NextAuth credentials & registration
│   │   └── npc/
│   │       ├── stt/route.ts      # Gnani Prisma STT proxy endpoint
│   │       ├── talk/route.ts     # Unified dialogue, memory, action & TTS route
│   │       ├── tts/route.ts      # Gnani Timbre TTS proxy endpoint
│   │       └── memory-event/     # Manual memory injection & relationship hooks
│   ├── play/                     # Full-screen Phaser game client
│   └── page.tsx                  # Interactive landing & game showcase
├── components/
│   └── game/
│       ├── GameTestingCanvas.tsx # HUD, voice controls, audio engine & subtitle overlay
│       ├── PhaserGame.tsx        # React-to-Phaser lifecycle bridge
│       ├── VillageScene.ts       # 2D top-down map, NPC pathfinding & collisions
│       ├── InteriorScene.ts      # Building interiors (Hospital, Workshop, Shop)
│       └── MinecraftInventoryModal.tsx # 15-slot drag-and-drop inventory
├── db/
│   ├── schema.ts                 # PostgreSQL schema (NPC definitions, memories, relations)
│   └── seed.ts                   # Village lore & character trait seed script
└── lib/
    ├── gnani.ts                  # Gnani.ai STT (Prisma) & TTS (Timbre) client SDK
    ├── inventory.ts              # 15 curated items catalog & trading math
    ├── npcDialogue.ts            # Evon / LLM prompt builder & tool caller
    ├── wavRecorder.ts            # Web Audio API 16kHz mono linear PCM recorder
    └── memory/                   # Mem0 4-tier cognitive memory architecture
```

---

## Getting Started

### Prerequisites

* **Node.js**: `v20.x` or higher
* **PostgreSQL**: `v14` or higher (local instance or cloud provider like Neon / Supabase)
* **Gnani.ai API Credentials**: Obtain an API Key from the [Gnani AI Voice Platform](https://app.gnani.ai/voice)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/jeeva_game.git
   cd jeeva_game
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   # PostgreSQL connection string
   DATABASE_URL="postgresql://postgres:password@localhost:5432/jeeva"

   # Gnani.ai API credentials (from https://app.gnani.ai/voice)
   GNANI_API_KEY="your_gnani_api_key_here"
   GNANI_STT_URL="https://api.vachana.ai/stt/v3"
   GNANI_TTS_URL="https://api.vachana.ai/api/v1/tts/inference"
   GNANI_DEFAULT_LANGUAGE="hi-IN"

   # High-speed LLM inference (Evon v3.3 weights or Groq endpoint)
   GROQ_API_KEY="your_inference_api_key_here"

   # NextAuth session configuration
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate_a_random_32_character_secret_key"
   ```

4. **Initialize database schema and seed village data:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Launch the experience:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the project overview, or jump straight into the playable simulation at [http://localhost:3000/play](http://localhost:3000/play).

---

## Controls & Interaction Guide

| Key / Action | Function | Context |
| :--- | :--- | :--- |
| **`W` `A` `S` `D`** or **Arrow Keys** | Walk / Move character | Exploration |
| **`Shift` (Hold)** | Sprint | Movement speed boost |
| **`E` (Hold)** | **Push-to-Talk Voice Input** | Active within NPC interaction radius |
| **`Enter`** | Open / Send Text Dialogue | Proximity chat modal |
| **`Tab`** or **`I`** | Open Inventory & Backpack | Anywhere |
| **`Escape`** | Close current modal / Menu | Universal |
| **Mouse Left-Click** | Interact with objects / Drag inventory | UI & Trading |

> [!TIP]
> When speaking with merchants, try negotiating in your native language or code-mixing terms like *"Bhai, discount do na"* to observe the dynamic pricing engine respond to conversational tactics.

---

## Tech Stack Summary

* **Frontend Framework**: Next.js 16 (App Router, Turbopack, React 19)
* **Game Engine**: Phaser 4.2 / Phaser 3 2D Canvas Engine
* **Speech & AI Intelligence**: Gnani.ai Prisma v3.0 STT, Gnani.ai Timbre v2.5 TTS, Evon v3.3
* **Database & ORM**: PostgreSQL with Drizzle ORM
* **Cognitive Memory**: Mem0 Cognitive Framework with Vector Similarity Embeddings
* **Audio Capture**: Web Audio API 16kHz mono Linear PCM `WavRecorder`
* **Styling**: Tailwind CSS v4 with retro pixel art tokens

---

<div align="center">

Crafted with sovereign AI pride for the **Gnani.ai Great Indian AI Internship Challenge 2026**.

</div>
