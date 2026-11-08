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

In traditional role-playing games, non-player characters (NPCs) are static cardboard figures locked into scripted dialogue trees. When a character claims they will repair a clinic generator or deliver emergency rations, they remain stationary forever. Furthermore, voice gaming experiences have historically catered solely to Western languages, stumbling when faced with the authentic cadence of Indian speech, localized dialects, and code-mixed phrasing.

**Jeeva** redefines the NPC paradigm by pairing **Gnani.ai's sovereign Indian-language speech and reasoning stack** with a 2D top-down simulation built on Phaser and Next.js. Set in the post-monsoon village of **Kaveripura**, players converse naturally with villagers in **Hindi, Tamil, Telugu, Kannada, Marathi, or Hinglish**. Villagers possess distinct moral values, living memory, and the power of **grounded autonomy**: dialogue commitments are verified by the game server and visibly executed in the game world before your eyes.

> [!NOTE]
> This project was engineered for **The Great Indian AI Internship Challenge** hosted by **Gnani.ai** ([gnani.ai/internship](https://www.gnani.ai/internship)), demonstrating real-world applications of sovereign Indian AI across telephony-grade speech-to-text, natural expressive Indic text-to-speech, and grounded reasoning.

---

## Technical Architecture

The following diagram illustrates the end-to-end data flow across audio recording, speech processing, cognitive memory retrieval, LLM reasoning, world state validation, and audio synthesis:

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant Client as Web Browser (React + Phaser)
    participant Rec as WavRecorder (Web Audio API)
    participant API as Next.js API (/api/npc/talk)
    participant STT as Gnani Prisma v3.0 STT
    participant Mem as Mem0 Engine (PostgreSQL)
    participant LLM as LLM Engine (Evon v3.3 / Groq)
    participant World as Server World & Inventory Validator
    participant TTS as Gnani Timbre v2.5 TTS

    Player->>Client: Press & hold [E] within 60px of NPC
    Client->>Rec: Capture 16kHz linear PCM audio
    Player->>Rec: Speak in Indic dialect (e.g. Hindi / Hinglish)
    Player->>Client: Release [E]
    Client->>API: POST /api/npc/talk (audio/wav blob + playerDistance + wallet)

    Note over API: Strict 60px threshold & trait bounds check
    API->>STT: Stream 16kHz WAV buffer (indic-auto)
    STT-->>API: Transcribed text + detected BCP-47 locale
    API->>Mem: Query Working, Episodic, Relational & Semantic memory
    Mem-->>API: 4-Tier cognitive context + relationship scores

    API->>LLM: Prompt (Traits + Memory + Wares Catalog + Dialogue)
    LLM-->>API: Natural dialogue text + [TOOL: action] + [LANG: code]

    alt Tool Call Detected (e.g. trade_deal or follow_player)
        API->>World: Validate wallet balance, item stock & proximity
        World-->>API: Action approved & world mutations queued
    end

    par Parallel TTS Synthesis & Background Memory
        API->>TTS: Synthesize reply audio (Timbre v2.5, assigned voice)
        TTS-->>API: 16kHz linear PCM WAV buffer
    and Asynchronous Memory Lifecycle
        API-)Mem: Commit working turns, delta relationship, extract facts
    end

    API-->>Client: JSON {replyText, audioBase64, toolCall, language}
    Client->>Client: Play Timbre voice audio + render subtitles HUD
    opt World Action
        Client->>Client: Spawn floating dropped items / NPC pathfinds to target
    end
```

---

## How Does the Game Work?

Jeeva runs as a modern hybrid application combining a server-authoritative Next.js 16 backend with a high-performance 2D canvas client managed by Phaser.

### 1. Engine & Canvas Lifecycle
* **Client-Side Hydration**: The game canvas is loaded dynamically using Next.js `dynamic(..., { ssr: false })` via `GameTestingCanvas.tsx` and `PhaserGame.tsx`. This avoids SSR DOM mismatches and gives Phaser direct control of WebGL / Canvas2D rendering.
* **Scene Architecture**:
  * `VillageScene`: Orchestrates the outdoor open world—terrace farms, riverbanks, village square, clinic exterior, workshop yard, and paths.
  * `InteriorScene`: Loads dedicated interior floorplans (Hospital Triage Clinic, Arjun's Workshop, Dev's Kirana Store, Player Homestead) upon entering doorways with door transitions and positional restore points.
* **Physics & Movement**: Utilizes Phaser Arcade Physics. The player entity moves via `WASD` or Arrow keys with 4-directional sprite sheet animations (`walkDown`, `walkLeft`, `walkRight`, `walkUp`). Sprints apply a 1.7x velocity multiplier (130 px/s to 220 px/s).

### 2. Proximity-Bounded Spatial Interaction
Interaction is strictly space-aware:
* When the player approaches an NPC within **60 pixels** (`TALK_THRESHOLD_RADIUS`), an interactive prompt activates.
* **Server Verification**: The backend `/api/npc/talk` endpoint independently calculates and validates `playerDistance <= 60`. Requests submitted beyond this perimeter are rejected with `HTTP 403 OUT_OF_RANGE`.

### 3. Circadian Schedules & World Simulation
* The game operates on a continuous 24-hour cycle tracked in minutes (`gameTimeMinutes`, 0 to 1439).
* Ambient lighting tints dynamically across dawn, midday, golden dusk, and night.
* Every villager follows an immutable routine defined in `npc_definitions`:
  * **06:00**: Morning chores and house departure.
  * **08:30**: Opening storefronts, workshop benches, or irrigation canals.
  * **13:00**: Midday clinic triage or village square rest.
  * **21:00**: Night curfew; doors lock and Inspector Vikram begins his patrol.

### 4. 15-Slot Grid Inventory & Physical Item Drops
* **Grid Architecture**: The player manages a 15-slot grid inventory (`MinecraftInventoryModal.tsx`), supporting stack counts, weights, item rarities, and descriptions.
* **World Drops**: Items are physical world entities (`LiveDroppedItem`) rendered in Phaser with sinusoidal bobbing animations, particle glows, and magnetic pickup triggers when the player walks nearby.

---

## How Does the Agentic System Work?

The core differentiator in Jeeva is **grounded autonomy**. NPCs do not merely produce conversational text; their cognitive outputs translate into concrete, server-authoritative world changes.

```
+------------------------------------------------------------------------------+
|                           Agentic Decision Loop                              |
+------------------------------------------------------------------------------+
|                                                                              |
|  1. Cognitive Ingestion                                                      |
|     - Player spoken intent via Gnani Prisma STT                              |
|     - NPC core traits, fears & moral values (from npc_definitions)           |
|     - Active relationship vector (Trust, Affection, Respect)                 |
|     - Economic state (Player wallet ₹, merchant catalog, stock count)        |
|                                                                              |
|  2. Reasoning & Tool Invocation (Evon v3.3 / Groq Flagship LLM)              |
|     - Roleplays authentic persona in requested Indic language                |
|     - Dynamically decides whether to assist, barter, counter-offer, or reject|
|     - Emits structured tool tags in response payload:                        |
|       * [TOOL: trade_deal, item: copper_coil, price: 60, quantity: 2]        |
|       * [TOOL: follow_player]                                                |
|       * [TOOL: stop_following]                                               |
|       * [TOOL: go_home]                                                      |
|                                                                              |
|  3. Server Validation & Grounded Execution                                   |
|     - detectToolAndClean() strips tool syntax from spoken dialogue           |
|     - Backend validates player wallet balance: wallet >= total_agreed_price  |
|     - Validates item availability in VILLAGE_ITEMS_CATALOG                   |
|     - Client executes physical action:                                       |
|       * Deducts wallet rupees                                                |
|       * Drops physical 2D items on counter/ground for player pickup          |
|       * Switches NPC state machine to 'following' pathfinder                 |
|                                                                              |
+------------------------------------------------------------------------------+
```

### Supported Agentic Tools

| Tool Tag | Trigger Condition | Execution & World Effect |
| :--- | :--- | :--- |
| `trade_deal` | Player agrees on price and quantity for goods | Server checks wallet balance, deducts money, and spawns physical items on the Phaser game floor for collection. |
| `follow_player` | Player requests assistance or escort (*"Mere saath chalo"*) | NPC switches state to `'following'`, dynamically pathfinding behind the player across the village. |
| `stop_following`| Player tells companion to wait (*"Yahan ruko"*) | NPC halts pathfinding, locks position, and resumes idle awareness. |
| `go_home` | Player dismisses NPC (*"Ghar jao"*) | NPC leaves current location and pathfinds back to their schedule anchor coordinate. |
| `open_trade` | Player asks to browse goods | Triggers trading modal UI displaying available catalog stock. |

### Dynamic Price Negotiation Engine
Bargaining with merchants (Dev) or mechanics (Arjun) is governed by mathematical psychological constraints defined in `negotiation_profile`:
* **Greed Multiplier & Markup**: Starting prices include a 15–30% markup above base price.
* **Patience Counter**: Vendors tolerate 3 to 5 counter-offers before becoming firm or terminating talks.
* **Relationship Modifier**: High trust and affection scores decrease minimum price thresholds, allowing discounts of up to 40%.
* **Emotional Leverage**: Mentioning urgent clinic needs or agricultural emergencies unlocks crisis pricing.

---

## How Does the Memory Layer Work?

Jeeva implements a custom **4-Tier Cognitive Memory Engine** powered by Mem0 principles and PostgreSQL:

```
+-----------------------------------------------------------------------------+
|                          4-Tier Cognitive Memory                            |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [Tier 1: Working Memory]                                                   |
|  Table: npc_working_memories                                                |
|  Sliding window of recent dialogue turns (last 6 turns, chronological)      |
|  Maintains conversational cohesion and references to current subjects.      |
|                                                                             |
|  [Tier 2: Relational Memory]                                                |
|  Table: npc_relationships                                                   |
|  5-Dimensional vector: Trust, Affection, Respect, Fear, Familiarity        |
|  Maps dynamically to categorical social tiers:                             |
|  hostile_outcast <-> distrusted <-> acquaintance <-> trusted_friend         |
|                                                                             |
|  [Tier 3: Episodic Memory]                                                  |
|  Table: npc_memories (memory_type = 'episodic')                             |
|  768-dimensional dense vector embeddings of past events & promises.         |
|  Example: "Sold 2x Kerosene Canisters to player for ₹60 after bargaining."  |
|                                                                             |
|  [Tier 4: Semantic Memory]                                                  |
|  Table: npc_memories (memory_type = 'semantic')                             |
|  768-dimensional dense vector embeddings of world lore and village facts.   |
|  Example: "Hospital backup generator was damaged in the monsoon storm."     |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Hybrid Vector Retrieval Formula
When a player speaks, the input text is vectorized into a 768-dimensional embedding. Candidates are scored using a weighted hybrid ranking algorithm combining vector similarity, subjective importance, and temporal recency:

$$\text{Hybrid Score} = 0.6 \times \max(0, \text{Cosine Similarity}) + 0.2 \times \left(\frac{\text{Importance}}{10}\right) + 0.2 \times \max\left(0, 1 - \frac{\text{Age Hours}}{168}\right)$$

* **Cosine Similarity (60% weight)**: Measures semantic relevance to the current turn.
* **Importance (20% weight)**: Prioritizes critical quest events over trivial small talk.
* **Recency (20% weight)**: Gradually decays memories over a 7-day half-life curve.

The engine selects the top 3 episodic memories and top 3 semantic facts to inject directly into the LLM system prompt.

### Asynchronous Post-Turn Distillation
Dialogue memory extraction runs asynchronously in the background via `processDialogueMem0Lifecycle`:
1. Appends current user and assistant turns to working memory.
2. Updates relationship metrics based on actions taken (e.g., successful trade yields `+6 Trust`, `+4 Affection`, `+3 Respect`).
3. Dispatches a zero-latency background worker (`extractAndCommitDialogueMemories`) that evaluates if the dialogue revealed durable personal facts, commitments, or emotional changes, vectorizing and committing them into PostgreSQL without blocking client responses.

---

## Models, APIs & Technology Breakdown

An exhaustive breakdown of all models, APIs, and frameworks utilized across Jeeva:

| Subsystem | Model / Technology | Provider / Host | Specific Purpose in Jeeva |
| :--- | :--- | :--- | :--- |
| **Speech-to-Text (STT)** | **Prisma v3.0 / v2.5** | **Gnani.ai** (`https://api.vachana.ai/stt/v3`) | Streams 16kHz linear PCM audio directly from browser; provides sub-200ms transcription across 10+ Indic languages and code-mixed speech with auto language detection. |
| **Text-to-Speech (TTS / PTS)** | **Timbre v2.5** | **Gnani.ai** (`https://api.vachana.ai/api/v1/tts/inference`) | Synthesizes character dialogue audio in linear PCM WAV format; features context-aware prosody, authentic pronunciation of Indian names, rupee amounts, and numerical cadences. |
| **Flagship Reasoning LLM** | **Evon v3.3** (30B MoE) / **GPT-OSS-120B** | **Gnani.ai** / **Groq LPUs** | Primary cognitive reasoning engine; handles character roleplay, dynamic language mirroring, psychological negotiation math, and structured tool emissions (`trade_deal`, `follow_player`). |
| **Fallback Dialogue LLM** | **Gemini 1.5 Flash** | **Google Cloud** | Secondary fallback LLM ensuring 100% uptime if primary inference clusters experience rate limiting. |
| **Language Classifier** | **Heuristic Script Engine + Groq Micro-LLM** | **Internal + Groq** | Evaluates Indic Unicode scripts in <1ms; resolves ambiguous romanized code-mixing (e.g. Hinglish vs. Tanglish) in <10 tokens. |
| **Vector Embeddings** | **text-embedding-004** (768-dim) / Local Semantic Hashing | **Google Cloud / Internal Vectorizer** | Vectorizes dialogue queries, episodic events, and world lore into 768-dimensional normalized dense vectors for cosine similarity search. |
| **Audio Capture Client** | **WavRecorder (Web Audio API)** | **Browser Client** | Records raw microphone audio into 16,000 Hz, 1-channel, 16-bit linear PCM WAV blobs. |
| **Cognitive Framework** | **Mem0 Memory Engine** | **Custom PostgreSQL Engine** | Manages working memory sliding windows, 5-dimensional relationship vectors, and episodic memory persistence. |
| **Database & ORM** | **PostgreSQL + Drizzle ORM** | **PostgreSQL (Local / Neon)** | Stores user profiles, NPC definitions, memory records, relationships, and inventory item catalogs. |
| **Fullstack Framework** | **Next.js 16.4.5 + React 19** | **Vercel / Node.js runtime** | App Router, Server Actions, API routes, Turbopack bundling, and responsive frontend UI. |
| **Game Simulation** | **Phaser 4.2 / Phaser 3** | **Canvas2D / WebGL** | 2D tilemaps, Arcade Physics, character sprite animations, building transitions, and world item drops. |

---

## Challenge Awards Alignment

Jeeva was purposefully engineered to address the evaluation benchmarks of the **[Great Indian AI Internship Challenge](https://www.gnani.ai/internship)**:

* **Main Character Award (Regional Indic Voice)**:
  First-class native voice support for regional languages including Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు), Hindi (हिन्दी), and Marathi (मराठी). Each NPC carries an authentic regional voice persona (`Kaveri`, `Deepak`, `Nalini`) and localized cultural idioms.
* **Mixed Vibes Award (Code-Mixed Speech)**:
  Seamless conversational handling of code-mixed Hinglish and Tanglish. Players naturally blend English technical vocabulary with Indic vernacular (*"Arjun bhai, clinic ka generator dead hai, naya copper coil lagao"*), and the system transcribes, comprehends, and responds in kind.
* **Real Deal Award (Practical Real-World Problem Solving)**:
  Simulates genuine rural Indian scenarios—managing primary healthcare center (PHC) emergencies during disaster recovery, bargaining with local kirana merchants, and resolving agricultural irrigation disputes.
* **Noise Canceller Award (Telephonic Audio Robustness)**:
  Leverages Gnani.ai's acoustic models trained on 14M+ hours of telephonic audio, ensuring reliable speech transcription even with laptop microphones, ambient room echo, and village game sound effects.
* **Jugaad Genius Award (Grounded Agentic Autonomy)**:
  Bridges conversational LLMs directly to an interactive game simulation loop. Spoken negotiations result in physical world consequences—NPCs open toolkits, pathfind across coordinates, inspect blown alternators, and hand over physical inventory items.

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

## Project Structure

```
jeeva_game/
├── app/
│   ├── api/
│   │   ├── auth/                 # NextAuth credentials & registration routes
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
        ├── embeddings.ts         # 768-dim vector embeddings & cosine similarity
        ├── mem0Engine.ts         # Working, episodic, and relational memory logic
        ├── promptBuilder.ts      # Cognitive memory prompt section formatter
        └── types.ts              # Memory data structures & relationship tiers
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
| **`Shift` (Hold)** | Sprint (1.7x speed boost) | Movement |
| **`E` (Hold)** | **Push-to-Talk Voice Input** | Active within 60px NPC interaction radius |
| **`Enter`** | Open / Send Text Dialogue | Proximity chat modal |
| **`Tab`** or **`I`** | Open Inventory & Backpack | Anywhere |
| **`Escape`** | Close current modal / Menu | Universal |
| **Mouse Left-Click** | Interact with objects / Drag inventory | UI & Trading |

> [!TIP]
> When speaking with merchants, try negotiating in your native language or code-mixing terms like *"Bhai, thoda discount do na"* to observe the dynamic pricing engine respond to conversational tactics and calculate deals in real time.

---

<div align="center">

Crafted with sovereign AI pride for the **Gnani.ai Great Indian AI Internship Challenge 2026**.

</div>
