# AI-Powered Voice NPC Village Game --- Rough Project Plan

**Document:** `rough_project_plan.md`\
**Version:** 1.0\
**Date:** 4 November 2026\
**Project type:** 2D top-down village simulation with multilingual,
voice-enabled, autonomous AI NPCs

---

## 1. Project Overview

Build a playable 2D top-down village game in which the player can speak
naturally with individual NPCs and groups of NPCs. NPCs have distinct
personalities, memories, relationships, goals, and the ability to take
actions in the game world.

The key differentiator is **grounded autonomy**: NPCs must not merely
say that they will do something. They must request an allowed action,
have the game server validate it, and then visibly perform it in the
world.

### Core experience

- Explore a village using WASD movement.
- Approach an NPC and start a voice conversation.
- Speak in supported Indian languages using Gnani AI speech services.
- Receive an NPC response with a distinct personality and voice.
- Give NPCs commands such as follow, collect, protect, trade, or
  coordinate.
- Observe NPCs move and perform valid actions.
- Let NPCs converse with one another when the player is nearby.
- Have NPCs remember important events and adjust relationships and
  behavior.
- Progress through a five-chapter village recovery story.

### Product principles

1.  **Game first, AI second:** the game must remain playable if an AI
    provider is unavailable.
2.  **Server-authoritative world:** only the backend can commit
    world-state changes.
3.  **Actions must be real:** dialogue promises do not count as
    completed actions.
4.  **Contextual AI:** NPCs only receive relevant memories, nearby
    entities, and current world facts.
5.  **Cost-aware simulation:** do not call an LLM every frame or for
    routine movement.
6.  **Observable behavior:** the player should be able to see why an NPC
    is busy, moving, waiting, or acting.

---

## 2. Scope and Priorities

### P0 --- Required playable prototype

- [ ] Top-down village map and player movement.
- [ ] Camera follows player; world scrolling and collision.
- [ ] NPC sprites, animations, spawn points, and interaction zones.
- [ ] Individual NPC dialogue powered by Gemini.
- [ ] Gnani AI STT and TTS integration, subject to API access and
      supported-language verification.
- [ ] NPC profiles: identity, personality, role, voice/language
      settings.
- [ ] Basic short-term conversation context.
- [ ] Persistent player/NPC memory for important events.
- [ ] A small, validated set of NPC actions: move, follow, collect,
      trade, and protect.
- [ ] Chapter 1 and a demonstrable slice of Chapter 2.
- [ ] Text input fallback if microphone, STT, or TTS fails.

### P1 --- Main differentiators

- [ ] NPC-to-NPC conversations triggered by proximity.
- [ ] Group conversation with turn-taking.
- [ ] NPC relationship scores and event-driven changes.
- [ ] NPC schedules and simple autonomous goals.
- [ ] Resource inventory and trading.
- [ ] Multi-step tasks with progress and completion events.
- [ ] Chapters 2--5 and consequence tracking.
- [ ] NPC command interface and action status display.

### P2 --- Stretch goals

- [ ] Dynamic asset generation.
- [ ] Complex multi-agent planning and delegation.
- [ ] Emergent village economy and complex social conflicts.
- [ ] Emotion-conditioned TTS, if Gnani exposes the required controls.
- [ ] Optional Jev AI integration after latency tests establish a
      concrete need.
- [ ] Advanced ambient conversations and persistent world simulation
      while the player is away.

**Scope rule:** Do not start P2 work until P0 is playable end-to-end.

---

## 3. Technology Stack

---

Area Choice Responsibility

---

Web application Next.js + React + Menus, HUD, dialogue,
TypeScript settings, quest journal

Game engine Phaser 3 Rendering, movement,
collision, animations,
scenes

Styling Tailwind CSS Web UI

Map editor Tiled Tilemaps, object
layers, spawn points,
collision layers

Pathfinding EasyStar.js Grid-based NPC
navigation

Frontend state Zustand UI state and selected
NPC/dialogue state

Realtime Socket.IO Game events, NPC state
updates, dialogue
events

Backend Node.js + TypeScript + Authoritative game
Express server and API

Database PostgreSQL Save games, NPC
profiles, memories,
relationships, world
state

ORM Drizzle Database schema and
migrations

LLM Google Gemini API Dialogue, intent
interpretation, bounded
planning

STT Gnani AI Speech-to-text

TTS Gnani AI Text-to-speech

Mem0 for npc memory with pgvector

Optional model provider Jev AI Only if benchmarked
latency/cost justifies
it

---

### Architecture decisions

- Start with a **modular monolith**: one Node.js backend with clear
  modules. Do not split into microservices for the prototype.
- Keep Gemini and Gnani API keys on the server. Never expose provider
  secrets in browser code.
- Use Socket.IO for realtime events and HTTP endpoints for operations
  that do not need realtime delivery.
- Use PostgreSQL as the durable source of truth. Zustand is only for
  client-side presentation state.
- Phaser owns rendering and local movement animation; the server owns
  authoritative NPC actions, inventory, quests, and world state.
- Do not use an LLM for frame-by-frame movement, collision, routine
  schedules, or deterministic game rules.

---

## 4. High-Level Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    Next.js Frontend                       │
│                                                          │
│  React HUD / Dialogue / Voice UI / Quest Journal         │
│                         │                                │
│                    Zustand Store                          │
│                         │                                │
│                    Phaser 3 Game                          │
│       Player · Map · NPCs · Collision · Animations       │
└─────────────────────────┬────────────────────────────────┘
                          │ Socket.IO + HTTP
┌─────────────────────────▼────────────────────────────────┐
│              Node.js + TypeScript Backend                 │
│                                                          │
│  Session Manager             Realtime Gateway             │
│  World Simulator             NPC Runtime                  │
│  Action Validator            Agent Orchestrator           │
│  Voice Gateway               Quest / Event Manager        │
│  Memory Manager              Provider Adapters            │
│                                                          │
└───────────────┬───────────────────────┬──────────────────┘
                │                       │
       ┌────────▼────────┐      ┌───────▼──────────┐
       │  PostgreSQL     │      │ External APIs    │
       │ Save / Memory   │      │ Gemini           │
       │ Relationships   │      │ Gnani STT / TTS  │
       │ Inventory       │      │ Optional Jev AI  │
       └─────────────────┘      └──────────────────┘
```

### Important runtime flow

1.  Player approaches an NPC and presses the interaction key.
2.  Frontend requests or opens an interaction session.
3.  Player audio is captured and sent to the backend.
4.  Backend sends audio to Gnani STT and receives recognized text.
5.  Backend builds a compact context: NPC profile, recent dialogue,
    relevant memories, relationship state, and nearby world facts.
6.  Gemini returns structured dialogue and, optionally, a proposed
    action.
7.  Backend validates the response against the action schema and game
    rules.
8.  Valid actions are placed in the NPC action queue and executed by the
    world simulator.
9.  Response text is sent to Gnani TTS.
10. Audio and dialogue events are sent to the frontend.
11. Important events are persisted as memories.

If any voice provider fails, show the recognized text/error and allow
text dialogue as a fallback.

---

## 5. Game World and Asset Integration

### Local asset directories

Use the supplied local assets. These paths are Windows development paths
and should be configured locally rather than hardcoded into application
code.

---

Game area / entity Asset directory

---

Village `C:\Users\kusha\Downloads\game_assets\Serene_Village_revamped_v1.9`

Main house exterior `C:\Users\kusha\Downloads\game_assets\Cute_Fantasy_Free`

Main house interior `C:\Users\kusha\Downloads\game_assets\home_rooms_interior`

Bedroom fallback `C:\Users\kusha\Downloads\game_assets\Pixel_16_interiors_v2_free`

Kitchen fallback `C:\Users\kusha\Downloads\game_assets\Kitchen and more tileset [16x16]`

Living room fallback `C:\Users\kusha\Downloads\game_assets\Top-Down_Retro_Interior`

Farm `C:\Users\kusha\Downloads\game_assets\Tiny Wonder Farm Free`

Hospital `C:\Users\kusha\Downloads\game_assets\topdown_hospital_Assets`

Shop `C:\Users\kusha\Downloads\game_assets\CozyShopInteriors-FREE-Demo-v1.1`

Mechanic workshop `C:\Users\kusha\Downloads\game_assets\azul`

---

### Character mapping

---

Character Asset

---

Main player `SuperRetroWorld_CharacterPack_Full/sprite_split/character_10`

Player's wife `SuperRetroWorld_CharacterPack_Full/sprite_split/character_12`

Doctor `RPG Top Down Character Asset Pack - FREE/RPG Top Down Characters - Free Version/Blue Haired Woman`

Shopkeeper `RPG Top Down Character Asset Pack - FREE/RPG Top Down Characters - Free Version/Blonde Man`

Mechanic `SuperRetroWorld_CharacterPack_Full/sprite_split/character_9`

Elder `SuperRetroWorld_CharacterPack_Full/sprite_split/character_4`

Farmer `SuperRetroWorld_CharacterPack_Full/sprite_split/character_14`

Other villagers Remaining suitable characters from `SuperRetroWorld_CharacterPack_Full/sprite_split`

---

### Asset integration checklist

- [ ] Inspect each asset pack's file structure and documentation.
- [ ] Confirm tile dimensions, sprite dimensions, animation frame
      layout, and transparency.
- [ ] Check license and attribution requirements for every pack.
- [ ] Standardize tile size and scale; avoid mixing assets with
      visibly incompatible pixel density.
- [ ] Create a central asset manifest with stable names.
- [ ] Slice/import character spritesheets and define idle/walk
      animations for all directions.
- [ ] Build a small test map before constructing the full village.
- [ ] Test house exterior/interior transitions.
- [ ] Use fallback interiors only if the preferred interior pack
      cannot be made visually consistent.

Do not assume that packs are automatically compatible just because they
are top-down assets. Verify tile size, perspective, palette, and license
first.

### Tiled map layers

Create the village map with layers such as:

- `Ground`
- `Ground_Details`
- `Buildings`
- `Above_Player`
- `Collision`
- `Interactables`
- `NPC_Spawns`
- `Pathfinding_Blockers`
- `Scene_Transitions`

Use Tiled object layers for named spawn points, doors, interaction
zones, and scene transitions. Export maps as JSON and load them in
Phaser.

---

## 6. NPC Design

### Initial NPC roster

---

NPC Role Personality Initial
capabilities

---

Main player Player character Player-controlled Move, speak,
interact, command

Player's wife Companion Lovely, flirty, Follow, help,
kind converse, assist

Ravi Farmer Hardworking, Collect food,
stubborn manage farm,
trade

Meera Doctor Caring, practical Treat injured
villagers,
request supplies

Arjun Mechanic Intelligent, Repair machines,
impatient request parts

Dev Shopkeeper Greedy, negotiator Manage stock,
trade, set prices

Ramesh Elder Wise, cautious Advise,
coordinate
villagers

Policeman Law enforcement Observant, Investigate
disciplined theft, protect
locations

Thief Antagonist Secretive, Steal only
opportunistic through defined
game rules

Normal villagers Residents Varied Work, travel,
converse, request
help

Friend group Social group Distinct individual Group
traits conversations and
shared events

---

### NPC profile fields

Every NPC should have a structured profile:

```ts
type NPCProfile = {
  id: string;
  name: string;
  role: string;
  personality: string[];
  speakingStyle: string;
  goals: string[];
  fears: string[];
  values: string[];
  homeLocation: string;
  currentLocation: string;
  scheduleId?: string;
  voiceId?: string;
  preferredLanguage: string;
  capabilities: string[];
};
```

Do not put all behavior into a giant system prompt. Keep identity,
current state, memories, goals, and action permissions as separate data.

### NPC runtime state

```ts
type NPCState = {
  npcId: string;
  position: { x: number; y: number };
  activity: "idle" | "walking" | "talking" | "working" | "following" | "acting";
  currentGoal?: string;
  currentTaskId?: string;
  inventory: Record<string, number>;
  health?: number;
  energy?: number;
  relationshipToPlayer: number;
  nearbyNpcIds: string[];
};
```

---

## 7. NPC Intelligence and Agent Design

### Use one LLM, not one LLM per NPC

All NPCs can share the same Gemini model/API. Each NPC gets a different
profile and context. This keeps the architecture simpler and avoids
multiplying model costs.

The NPC runtime should decide **when** an LLM call is justified. The LLM
should decide **what to say or propose**, not directly mutate the game
world.

### NPC decision cycle

```text
Observe
  ↓
Check local state and goals
  ↓
Is a decision required?
  ├── No → Continue deterministic behavior
  └── Yes
       ↓
Build compact context
       ↓
Call Gemini
       ↓
Parse structured result
       ↓
Validate against NPC permissions and world rules
       ↓
Queue approved action
       ↓
Execute action in world simulator
       ↓
Emit event and update memory
```

### Structured model output

Require JSON matching a schema. Example:

```json
{
  "dialogue": "The hospital needs food. I can spare ten units.",
  "emotion": "concerned",
  "intent": "offer_trade",
  "proposed_actions": [
    {
      "type": "trade",
      "target": "player",
      "items_given": { "food": 10 },
      "items_requested": { "medicine": 2 }
    }
  ],
  "memory_candidates": [
    {
      "content": "The player asked for food for the hospital.",
      "importance": 0.7
    }
  ]
}
```

The backend must validate every field. A model response is untrusted
input, even when it is valid JSON.

### Action system

Implement a strict action registry. Suggested initial actions:

---

Action Required parameters Server-side validation

---

`move_to` destination Destination exists and
is reachable

`follow_player` player ID, distance NPC is allowed to
follow

`collect_resource` resource, quantity, Resource exists;
source capacity and stock
allow it

`protect_location` location ID NPC can reach and guard
the location

`trade` target, offered items, Ownership, stock,
requested items quantity, and trade
rules

`talk_to_npc` target NPC ID, topic NPC is nearby and
available

`coordinate` target NPCs, task Participants exist and
can perform task

---

For the first prototype, implement `move_to`, `follow_player`,
`collect_resource`, and `trade` before the rest.

### NPC autonomy levels

1.  **Reactive:** responds to player interactions.
2.  **Goal-directed:** chooses from a small set of goals.
3.  **Collaborative:** asks nearby NPCs for help.
4.  **Autonomous:** executes scheduled goals and responds to world
    events.

Implement these levels in order. Do not let autonomous agents create
arbitrary tasks or bypass world rules.

---

## 8. NPC-to-NPC and Group Conversations

### Proximity-triggered conversation

NPC-to-NPC dialogue should not continuously call the LLM.

Use a proximity and relevance gate:

1.  NPCs are within a configured distance.
2.  Both NPCs are eligible to talk (not busy, in a cutscene, or already
    in another conversation).
3.  A conversation trigger exists: shared task, recent event,
    relationship, conflict, or social schedule.
4.  The player is within an audio/visibility radius if the conversation
    is intended to be heard.
5.  A cooldown prevents repeated conversation loops.
6.  Only then does the backend request dialogue from Gemini.

### Conversation state

```ts
type ConversationSession = {
  id: string;
  participantIds: string[];
  location: { x: number; y: number };
  topic: string;
  status: "active" | "paused" | "completed";
  currentSpeakerId?: string;
  startedAt: string;
  lastTurnAt: string;
};
```

### Group conversation flow

- The orchestrator selects a topic based on current events and
  participant goals.
- The LLM generates one speaker turn at a time, not a long
  uncontrolled transcript.
- The orchestrator selects the next speaker based on relevance,
  personality, and turn-taking rules.
- The session ends after a turn limit, topic resolution, participants
  leaving, or the player moving away.
- Important outcomes become world events and memory candidates.

**Cost optimization:** NPC movement, idle animations, proximity checks,
and routine schedules are deterministic code. Use LLM calls only for
meaningful conversational or planning decisions. Add per-NPC and
per-session cooldowns, token limits, caching where safe, and a maximum
number of simultaneous conversations.

---

## 9. NPC Memory and Relationships

### Memory types

---

Memory Example Storage

---

Working memory Current conversation Runtime/session
topic

Episodic memory Player brought medicine PostgreSQL
yesterday

Semantic memory The hospital is low on PostgreSQL/world facts
supplies

Relationship memory Player helped the Relationship/event
doctor records

---

### Memory lifecycle

1.  Capture important events, not every sentence.
2.  Convert them into compact memory candidates.
3.  Apply importance, recency, and relevance filters.
4.  Persist approved memories.
5.  Retrieve only relevant memories for the current interaction.
6.  Periodically summarize older memories to control context size.

### Suggested memory schema

```ts
type NPCMemory = {
  id: string;
  npcId: string;
  eventId?: string;
  content: string;
  memoryType: "episodic" | "semantic" | "relationship";
  importance: number;
  createdAt: string;
  lastAccessedAt?: string;
};
```

Start with PostgreSQL text and metadata search. Add vector embeddings
only if ordinary filtering and text search become insufficient. A vector
database is not a requirement for the first version.

### Relationship model

Store relationship values as structured dimensions rather than one vague
score:

- Trust
- Affection
- Respect
- Fear
- Resentment

Use bounded values, for example `-100` to `100`. Changes should be
caused by committed events, not arbitrary LLM output.

Example: completing a medicine delivery can increase the doctor's trust
in the player. Stealing from the shop can reduce the shopkeeper's trust
and trigger a police investigation.

---

## 10. Voice Interaction Design

### Individual voice interaction

```text
Player presses interaction key
       ↓
NPC interaction panel opens
       ↓
Player holds / taps microphone
       ↓
Audio captured in browser
       ↓
Backend → Gnani STT
       ↓
Recognized text
       ↓
Gemini dialogue + intent
       ↓
Action validation
       ↓
Gnani TTS
       ↓
Audio playback + NPC animation
```

### Voice requirements

- Support push-to-talk first. It is easier to control and debug than
  always-on listening.
- Provide a text-input fallback.
- Display recognized speech before or while processing, where API
  behavior allows.
- Handle silence, background noise, timeouts, retries, and provider
  errors.
- Keep audio payloads and recordings out of permanent storage unless
  there is a clear product requirement and consent.
- Verify Gnani's supported languages, audio formats, streaming
  support, voice selection, latency, quotas, pricing, and API
  authentication before finalizing the adapter.

### Emotion in TTS

Treat emotion as a presentation hint, not guaranteed functionality.
First check whether the Gnani TTS API supports emotion/style controls or
SSML-like controls for the selected voice. If it does not, use
punctuation and wording to influence delivery, and animate the NPC based
on the emotion label. Do not assume a bracketed instruction such as
`[Breathless and urgent...]` will be interpreted by the speech API.

### Provider adapter interfaces

```ts
interface SpeechToTextProvider {
  transcribe(input: AudioInput, options: STTOptions): Promise<Transcript>;
}

interface TextToSpeechProvider {
  synthesize(text: string, options: TTSOptions): Promise<AudioResult>;
}

interface LLMProvider {
  generateNPCResponse(input: NPCPromptInput): Promise<NPCResponse>;
}
```

This lets the project replace or supplement a provider without rewriting
game logic.

---

## 11. Story and Game Progression

### Chapter 1 --- The Storm

**Story:** The player arrives in the village after a severe storm.

Objectives: - Explore the village. - Meet the wife and key villagers. -
Talk to the elder, farmer, doctor, and shopkeeper. - Discover damage to
homes and infrastructure. - Learn the village's current needs.

Systems demonstrated: - Movement and map exploration. - Individual voice
conversations. - NPC profiles and memory. - Basic quest tracking.

### Chapter 2 --- The Shortage

**Story:** The hospital needs food and medical supplies.

Objectives: - Talk to the doctor. - Negotiate with the farmer. -
Negotiate with the shopkeeper. - Gather or trade the required
supplies. - Deliver supplies to the hospital.

Systems demonstrated: - Inventory and resource collection. - Trading. -
NPC action execution. - Relationship changes.

### Chapter 3 --- The Generator

**Story:** Electricity must be restored.

Objectives: - Find the mechanic. - Learn which components are missing. -
Collect required resources. - Ask villagers for help. - Repair the
generator.

Systems demonstrated: - Multi-step tasks. - NPC coordination. -
Autonomous movement and task execution. - World-state changes.

### Chapter 4 --- The Conflict

**Story:** Villagers disagree about how to distribute remaining
supplies.

Objectives: - Listen to both sides. - Understand each NPC's
motivations. - Negotiate a solution. - Ask another NPC to intervene if
desired. - Make a distribution decision.

Systems demonstrated: - Group conversations. - NPC relationships and
memories. - Social reasoning. - Consequence-based decisions.

### Chapter 5 --- The Recovery

**Story:** The village reacts to the player's decisions.

Objectives: - Observe the recovery. - See which NPCs completed their
goals. - Discover relationship changes. - Resolve remaining issues. -
Reach an ending based on player choices.

Systems demonstrated: - Persistent world state. - Long-term NPC
memory. - Emergent consequences. - Multiple outcomes.

### Player choice examples

- Convince an NPC.
- Negotiate a trade.
- Offer help.
- Ask another NPC to intervene.
- Collect resources personally.
- Delegate a task to an NPC.
- Choose how supplies are distributed.

Keep the story state in explicit quest and world-state data. Do not rely
on the LLM to remember which chapter or objective is active.

---

## 12. Database Design

Initial PostgreSQL tables:

Table Purpose

---

`users` Player account, if accounts are required
`game_sessions` Save slots and active sessions
`world_states` Current village-level state
`npcs` NPC identity, profile, role, and configuration
`npc_states` Current position, activity, inventory, and goal
`npc_memories` Episodic and semantic memory
`npc_relationships` Relationship dimensions between entities
`conversations` Conversation session metadata
`conversation_messages` Dialogue turns and speaker IDs
`npc_tasks` Assigned and autonomous tasks
`npc_actions` Action queue, status, and result
`inventories` Entity inventories
`world_events` Important committed events
`quests` Quest definitions and progress
`quest_objectives` Objective completion state

### Data ownership

- The server writes world state, inventories, task results, and
  relationships.
- The LLM can propose memory candidates and actions but cannot write
  directly to tables.
- The frontend receives state updates and renders them.
- Use transactions for trades and resource transfers to prevent
  duplication or negative inventory.

---

## 13. API and Realtime Event Design

### HTTP endpoints

---

Method Endpoint Purpose

---

`GET` `/api/world/:sessionId` Load world snapshot

`GET` `/api/npcs` Get NPC definitions

`GET` `/api/npcs/:npcId` Get NPC profile/state

`POST` `/api/interactions` Start interaction

`POST` `/api/voice/transcribe` Transcribe player audio

`POST` `/api/voice/synthesize` Generate NPC audio

`POST` `/api/npcs/:npcId/command` Submit NPC command

`GET` `/api/quests` Get quest state

`POST` `/api/quests/:questId/objectives/:objectiveId/complete` Commit objective
completion

---

### Socket.IO events

Event Direction Purpose

---

`world:join` Client → Server Join game session
`world:snapshot` Server → Client Initial world state
`player:move` Client → Server Player movement input
`npc:state` Server → Client NPC state update
`npc:action_started` Server → Client NPC begins an action
`npc:action_completed` Server → Client NPC action result
`dialogue:started` Server → Client Dialogue begins
`dialogue:turn` Server → Client Dialogue message
`dialogue:ended` Server → Client Dialogue ends
`conversation:ambient` Server → Client Nearby NPC conversation
`quest:updated` Server → Client Quest progress update
`world:event` Server → Client Important world event

Use server-side validation, session authorization, payload limits, and
rate limits. Do not trust client-supplied NPC positions, inventory
changes, or action completion claims.

---

## 14. Frontend and Game UI

### Main game screen

- Phaser canvas occupies the main viewport.
- Player remains near the center while the camera follows.
- HUD shows health/energy only if those mechanics are implemented.
- Quest objective appears in a compact panel.
- Interaction prompt appears when the player is near an NPC or object.
- Dialogue panel shows NPC name, recognized player text, response
  text, and voice controls.
- Microphone button uses push-to-talk.
- Small activity indicators show nearby NPC states.

### Additional UI screens

1.  Main menu and save selection.
2.  Game settings: language, audio volume, microphone selection.
3.  Quest journal.
4.  NPC profile and relationship details.
5.  Inventory.
6.  NPC command panel.
7.  Optional debug panel for NPC state, action queues, and API latency.

### Phaser scenes

- `BootScene`: load essential configuration.
- `PreloadScene`: load maps, tilesets, and sprites.
- `MainMenuScene`: menu and save selection.
- `VillageScene`: main village map.
- `InteriorScene`: houses and buildings.
- `GameOverScene` or `EndingScene`: only if required by story design.

Use a shared game/session bridge to communicate between React and
Phaser. Avoid putting the entire Phaser runtime into Zustand.

---

## 15. Suggested Project Structure

```text
voice-npc-village/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── dialogue/
│   │   │   ├── hud/
│   │   │   ├── inventory/
│   │   │   ├── quests/
│   │   │   └── settings/
│   │   ├── game/
│   │   │   ├── scenes/
│   │   │   ├── entities/
│   │   │   ├── systems/
│   │   │   ├── maps/
│   │   │   └── animations/
│   │   ├── stores/
│   │   └── lib/
│   └── server/
│       ├── src/
│       │   ├── api/
│       │   ├── socket/
│       │   ├── game/
│       │   │   ├── world/
│       │   │   ├── movement/
│       │   │   ├── actions/
│       │   │   ├── inventory/
│       │   │   └── quests/
│       │   ├── npc/
│       │   │   ├── runtime/
│       │   │   ├── profiles/
│       │   │   ├── decisions/
│       │   │   ├── memory/
│       │   │   └── relationships/
│       │   ├── agents/
│       │   │   ├── orchestrator/
│       │   │   └── conversations/
│       │   ├── voice/
│       │   │   ├── providers/
│       │   │   └── pipeline/
│       │   ├── llm/
│       │   │   ├── providers/
│       │   │   ├── prompts/
│       │   │   └── schemas/
│       │   ├── db/
│       │   └── config/
│       └── Drizzle/
├── packages/
│   └── shared/
│       ├── types/
│       ├── events/
│       └── schemas/
├── assets/
│   ├── maps/
│   ├── tilesets/
│   ├── characters/
│   ├── buildings/
│   ├── audio/
│   └── manifest/
├── docs/
│   ├── architecture.md
│   ├── game-design.md
│   ├── npc-design.md
│   └── api-contracts.md
├── .env.example
├── package.json
└── README.md
```

Keep large source asset packs outside version control if licensing or
repository size makes that preferable. Include a script or documented
process to copy/import the approved assets into `assets/`.

---

## 16. Development Roadmap

A practical solo/small-team target is approximately **4--6 weeks for a
convincing prototype**, assuming API access and assets are ready. This
is an estimate, not a guarantee. Full polish and all advanced features
will take longer.

### Phase 0 --- Setup and technical verification

**Goal:** Remove integration unknowns before building the game.

- [ ] Create repository and workspace.
- [ ] Set up Next.js, TypeScript, Phaser, Tailwind, and backend.
- [ ] Set up PostgreSQL and Drizzle.
- [ ] Create `.env.example` and server-only secrets configuration.
- [ ] Test Gemini API with one structured JSON response.
- [ ] Test Gnani STT with a short audio sample.
- [ ] Test Gnani TTS with a response.
- [ ] Confirm supported languages, formats, streaming, limits, and
      pricing.
- [ ] Inspect asset licenses and technical compatibility.

**Deliverable:** Running app, backend, database, and verified provider
test scripts.

### Phase 1 --- Playable village foundation

**Goal:** A playable game without AI.

- [ ] Import village tileset and build a small map in Tiled.
- [ ] Load the Tiled JSON map in Phaser.
- [ ] Implement WASD player movement.
- [ ] Implement camera follow and world bounds.
- [ ] Implement collisions.
- [ ] Import main character spritesheet and directional animations.
- [ ] Add NPC spawn points and basic NPC sprites.
- [ ] Add interaction zones.
- [ ] Add house/interior transitions.
- [ ] Connect Phaser game state to React UI.

**Deliverable:** Player can explore the village, enter buildings, and
approach NPCs.

### Phase 2 --- NPC runtime and world actions

**Goal:** NPCs exist as game entities with executable behavior.

- [ ] Define NPC profiles and runtime state.
- [ ] Create server-side world state.
- [ ] Implement pathfinding with EasyStar.js.
- [ ] Implement NPC move-to behavior.
- [ ] Implement follow-player behavior.
- [ ] Implement resource nodes and inventories.
- [ ] Implement collect-resource behavior.
- [ ] Implement trade with transactional inventory updates.
- [ ] Add action queues, cancellation, and failure states.
- [ ] Broadcast NPC state/action events over Socket.IO.

**Deliverable:** NPCs visibly move, follow, collect, and trade without
using an LLM for movement.

### Phase 3 --- Individual AI and voice

**Goal:** Player can speak to an NPC and get a contextual response.

- [ ] Build Gemini provider adapter.
- [ ] Define structured NPC response schema.
- [ ] Build prompt/context assembler.
- [ ] Add NPC-specific personality and speaking style.
- [ ] Integrate Gnani STT.
- [ ] Integrate Gnani TTS.
- [ ] Implement push-to-talk UI.
- [ ] Add text fallback.
- [ ] Connect dialogue to NPC animations and activity states.
- [ ] Add timeout, retry, and provider-error handling.
- [ ] Add basic conversation persistence.

**Deliverable:** End-to-end multilingual voice interaction with at least
three distinct NPCs.

### Phase 4 --- Memory, relationships, and commands

**Goal:** NPCs remember important events and carry out player
instructions.

- [ ] Add memory and relationship tables.
- [ ] Implement memory candidate extraction and filtering.
- [ ] Retrieve relevant memories for dialogue.
- [ ] Implement relationship updates from committed events.
- [ ] Build command intent interpretation.
- [ ] Map commands to allowed action schemas.
- [ ] Validate actions against permissions and world rules.
- [ ] Show task progress and completion to player.

**Deliverable:** Player can ask an NPC to do something, the NPC
remembers relevant context, and the action occurs in the world.

### Phase 5 --- NPC collaboration and ambient conversations

**Goal:** Villagers interact with one another intelligently and
economically.

- [ ] Implement proximity detection.
- [ ] Add conversation eligibility and cooldowns.
- [ ] Add shared topic/event selection.
- [ ] Implement one-turn-at-a-time group dialogue.
- [ ] Add speaker selection and turn limits.
- [ ] Add player proximity/audio rules.
- [ ] Add NPC-to-NPC task requests and delegation.
- [ ] Persist important group outcomes.
- [ ] Add concurrency limits and cost metrics.

**Deliverable:** Two or more NPCs can talk and coordinate when the
player is nearby, without constant LLM calls.

### Phase 6 --- Story, polish, and demo

**Goal:** Deliver a coherent experience rather than a collection of
disconnected features.

- [ ] Implement chapter and objective state machines.
- [ ] Complete Chapter 1.
- [ ] Complete a polished Chapter 2 slice.
- [ ] Add the generator repair task from Chapter 3 if time permits.
- [ ] Add the Chapter 4 supply conflict as a group-conversation demo.
- [ ] Add consequence summary for Chapter 5.
- [ ] Add sound effects, UI feedback, and transitions.
- [ ] Add save/load.
- [ ] Test failure cases and provider outages.
- [ ] Prepare a repeatable demo script.

**Deliverable:** A polished vertical slice demonstrating exploration,
voice, memory, autonomy, collaboration, and consequences.

---

## 17. MVP Acceptance Criteria

The prototype is not complete just because APIs return responses. It
must pass observable end-to-end tests.

---

Feature Acceptance test

---

Movement Player moves in four directions and
cannot pass through blocked tiles

Camera Camera follows player smoothly and
respects map bounds

Interaction NPC interaction begins only within
the configured range

Voice STT A spoken test phrase produces a
usable transcript in a verified
supported language

NPC dialogue Different NPCs respond with visibly
distinct personalities

TTS NPC response is played as audio;
text remains available

Memory An NPC can correctly recall a
previously committed important
event

Follow NPC navigates toward and follows
the player

Collection NPC reaches a resource node and
inventory changes exactly once

Trade Trade validates ownership and
atomically updates both inventories

Group dialogue Two NPCs exchange a bounded
conversation when eligible and
nearby

Relationships A committed player action changes
the relevant relationship dimension

Fallback Text interaction still works if
STT/TTS is unavailable

Persistence Reloading a save restores the
committed world and quest state

---

---

## 18. Cost, Latency, and Reliability Strategy

### Avoid unnecessary LLM calls

Do not call Gemini for: - Every game frame. - Every NPC movement step. -
Routine idle behavior. - Simple pathfinding. - Deterministic inventory
changes. - Every proximity check.

Use ordinary code for these operations.

### Use LLM calls for

- Player dialogue.
- Ambiguous command interpretation.
- Meaningful NPC decisions.
- Conversation turns.
- Complex task delegation.
- Memory summarization, when needed.

### Controls

- Proximity gates and cooldowns for ambient dialogue.
- Maximum group conversation turns.
- Maximum concurrent LLM and voice requests.
- Short context windows with relevant memory retrieval.
- Token and latency logging per provider call.
- Request timeouts and bounded retries.
- Idempotency keys for actions that mutate world state.
- Per-session rate limits.
- Caching for static NPC profile/system instructions where supported.

### Suggested telemetry

Record: - STT latency. - LLM latency. - TTS latency. - Total time from
end of player speech to start of NPC audio. - Token usage and estimated
cost. - Failed/invalid structured outputs. - Action success/failure
rate. - Number of ambient conversations per session.

Set performance targets only after measuring the actual APIs and
devices. Do not promise real-time voice behavior before testing the full
pipeline.

---

## 19. Security and Game Integrity

- Keep all provider API keys in backend environment variables.
- Validate all LLM output with runtime schemas.
- Treat dialogue and model output as untrusted.
- Use action allowlists and per-NPC capabilities.
- Validate NPC location, reachability, inventory, and task state on
  the server.
- Use database transactions for trades and resource changes.
- Prevent replayed commands from executing twice.
- Rate-limit voice and LLM endpoints.
- Authenticate and authorize game sessions if accounts/multiplayer are
  added.
- Avoid storing raw voice recordings unless necessary and clearly
  disclosed.
- Do not let an NPC command arbitrary URLs, code, shell commands, or
  database queries.

---

## 20. Testing Strategy

### Unit tests

- Action schema validation.
- Inventory and trade calculations.
- Relationship update rules.
- Memory selection and relevance filtering.
- Quest progression conditions.
- NPC state transitions.

### Integration tests

- Gemini adapter and malformed output handling.
- Gnani STT/TTS adapters.
- Socket.IO event contracts.
- Drizzle transactions.
- Action queue and world simulator.
- Save/load.

### Gameplay tests

- NPC blocked by obstacles.
- NPC target unreachable.
- NPC asked to collect unavailable resources.
- NPC asked to trade items it does not own.
- NPC conversation interrupted by player movement.
- Two conversations competing for the same NPC.
- API timeout while NPC is speaking.
- Player disconnects during an action.
- Duplicate action event received.
- Save/load during a multi-step quest.

---

## 21. Demo Script

A reliable 3--5 minute demo should prove the core idea without depending
on unpredictable emergent behavior.

1.  **Explore:** Move through the village and approach Ravi the farmer.
2.  **Speak:** Ask Ravi in a supported Indian language whether he can
    provide food for the hospital.
3.  **Negotiate:** Ravi responds according to his stubborn personality
    and proposes a trade.
4.  **Act:** Ask Ravi to collect food. Show him navigating to the farm
    and collecting it.
5.  **Collaborate:** Walk near two villagers and trigger a short
    conversation about the shortage.
6.  **Remember:** Return to Ravi and ask about the earlier agreement. He
    recalls it.
7.  **Consequence:** Deliver food to the hospital and show the
    quest/world state updating.

Prepare a deterministic fallback path in case an external API is
unavailable during the live demo.

---

## 22. Risks and Mitigations

---

Risk Mitigation

---

Gnani API language/voice feature Verify API capabilities with test
mismatch requests before building the voice
UI

Voice latency too high Measure each stage; use streaming
if supported; keep text fallback

LLM produces invalid actions Strict schemas, allowlists, server
validation

Token cost from NPC chatter Proximity gating, cooldowns, turn
limits, deterministic simulation

NPCs get stuck Pathfinding failure handling,
alternate destinations, task
timeout

Asset packs look inconsistent Audit dimensions, palette,
perspective, and scale before map
production

Scope becomes too large Prioritize P0 and one polished
story slice

AI provider outage Provider adapters, timeout
handling, text fallback

NPC memory grows without bound Importance filtering, retrieval,
summarization, retention policy

Duplicate trades/actions Idempotency keys and database
transactions

---

---

## 23. Immediate Next Steps

Start in this exact order:

1.  Create the repository and workspace.
2.  Inspect the downloaded asset folders and record tile/sprite
    dimensions and licenses.
3.  Build a tiny Tiled village test map with one house, one road, one
    collision layer, and three NPC spawn points.
4.  Load it in Phaser and implement player movement, camera, and
    collisions.
5.  Create the backend and PostgreSQL/Drizzle schema.
6.  Verify Gemini structured output with one NPC.
7.  Verify Gnani STT and TTS independently with real sample audio.
8.  Connect one NPC interaction end-to-end.
9.  Implement one real NPC action (`collect_resource`) and show its
    result in the world.
10. Only after that works, add memory, relationships, and NPC-to-NPC
    conversation.

### Definition of the first milestone

The first milestone is complete when the player can walk around a small
village, approach Ravi, speak to him, hear a personality-consistent
response, ask him to collect food, and watch him navigate to the farm
and update the inventory.

That single vertical slice validates the most important technical risks
in the project.

---

## 24. Explicitly Out of Scope for the First Prototype

- Multiplayer.
- A fully simulated economy.
- Unlimited NPC population.
- An LLM call for every NPC decision.
- Arbitrary autonomous behavior without action permissions.
- Fully generated maps or character sprites at runtime.
- Complex voice emotion controls before provider support is confirmed.
- A separate microservice for every subsystem.
- Vector database infrastructure before memory retrieval requires it.

**Final implementation principle:** Build a small village that genuinely
works before building a large village that only appears intelligent.
