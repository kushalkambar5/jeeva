import { pgTable, varchar, text, jsonb, timestamp, uuid, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  preferredLanguage: varchar("preferred_language", { length: 20 }).default("hi-IN"),
  role: varchar("role", { length: 20 }).default("player"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;


/**
 * Schedule entry structure for NPC default routines
 */
export interface ScheduleEntry {
  time: string; // e.g. "06:00", "12:00", "18:00"
  activity: string; // e.g. "morning_chores", "tending_crops", "triage_rounds"
  targetZone?: string; // e.g. "player_home", "farm_crops", "hospital"
  x?: number; // Phaser world target X coordinate
  y?: number; // Phaser world target Y coordinate
  state?: "idle" | "walking" | "working" | "talking" | "sleeping";
  description?: string;
}

/**
 * Dynamic negotiation rules and psychological thresholds for price bargaining
 */
export interface NegotiationProfile {
  base_markup_percent?: number;
  min_price_multiplier?: number;
  patience_turns?: number;
  greed_level?: "low" | "medium" | "high";
  price_flexibility?: "rigid" | "moderate" | "flexible";
  disliked_tactics?: string[];
  favored_arguments?: string[];
}

/**
 * Starting inventory items held or stocked by the NPC
 */
export interface NPCStartingInventoryItem {
  item_id: string;
  name: string;
  quantity: number;
  base_price?: number;
  category?: "quest" | "mechanical" | "medical" | "resource" | "tool" | "currency";
  condition?: "broken" | "repaired" | "pristine" | "used";
  is_quest_item?: boolean;
  description?: string;
}

/**
 * Master template table containing immutable core personalities, prompt templates,
 * voice IDs, allowed behavior rules, negotiation parameters, and starting inventories for each village character.
 */
export const npcDefinitions = pgTable("npc_definitions", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  bio: text("bio").notNull(),
  personality_traits: jsonb("personality_traits")
    .$type<string[]>()
    .notNull()
    .default([]),
  speaking_style: text("speaking_style").notNull(),
  system_prompt: text("system_prompt").notNull(),
  core_goals: jsonb("core_goals")
    .$type<string[]>()
    .notNull()
    .default([]),
  fears: jsonb("fears")
    .$type<string[]>()
    .notNull()
    .default([]),
  moral_values: jsonb("moral_values")
    .$type<string[]>()
    .notNull()
    .default([]),
  voice_provider: varchar("voice_provider", { length: 50 }).default("gnani"),
  voice_id: varchar("voice_id", { length: 100 }).notNull(),
  default_language: varchar("default_language", { length: 20 }).default("hi-IN"),
  sprite_key: varchar("sprite_key", { length: 100 }).notNull(),
  allowed_actions: jsonb("allowed_actions")
    .$type<string[]>()
    .notNull()
    .default([]),
  home_zone: varchar("home_zone", { length: 100 }).notNull(),
  default_schedule: jsonb("default_schedule")
    .$type<ScheduleEntry[]>()
    .notNull()
    .default([]),
  negotiation_profile: jsonb("negotiation_profile")
    .$type<NegotiationProfile>()
    .notNull()
    .default({}),
  starting_inventory: jsonb("starting_inventory")
    .$type<NPCStartingInventoryItem[]>()
    .notNull()
    .default([]),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow(),
});

// Alias to accommodate alternative spelling from prompt
export const npcDefinations = npcDefinitions;

export type NPCDefinition = typeof npcDefinitions.$inferSelect;
export type NewNPCDefinition = typeof npcDefinitions.$inferInsert;

/**
 * Master seed definitions for all NPCs aligned with the Level 1 story and feature showcase
 */
export const initialNPCDefinitions: NewNPCDefinition[] = [
  {
    id: "priya_wife",
    name: "Priya",
    role: "Village Companion & Homestead Caretaker",
    bio: "Priya is the player's devoted, sharp-witted companion who anchors daily life in Kaveripura. In the aftermath of the torrential monsoon storm that tore through the village, she diligently maintains the homestead, tends her medicinal herbal patch, and coordinates emergency food and warm drinks for distressed neighbors. Deeply loyal and perceptive, she acts as the player's emotional rock, confidante, and practical advisor on village affairs.",
    personality_traits: ["warmhearted", "resourceful", "witty", "perceptive", "protective"],
    speaking_style: "Warm, affectionate, supportive Hindi and Hinglish with playful domestic humor, gentle teasing, and grounded emotional intelligence.",
    system_prompt: "You are Priya, the devoted, sharp-witted, and loving companion of the player in Kaveripura. Following a severe storm, you manage the family homestead and herbal garden. You speak in affectionate, encouraging, and natural Hindi/Hinglish, occasionally using gentle colloquial endearments ('Aji sunte ho', 'jaan', 'chalo abhi sambhlo'). You worry about the player's safety during their travels outside the fence, advise them on who to trust among the villagers (noting Dev's greed or Ravi's stubbornness), and provide survival advice. When appropriate, offer permitted actions like following the player, sharing herbal tea and provisions, or coordinating homestead repairs. Never break character or discuss modern out-of-world technology.",
    core_goals: [
      "Ensure the safety, health, and well-being of the player throughout village exploration",
      "Provide practical advice on negotiating with stubborn craftsmen like Arjun and shrewd merchants like Dev",
      "Restore storm damage to the family homestead and verandah",
      "Prepare herbal broths and relief supplies for clinic patients"
    ],
    fears: [
      "Player getting injured or trapped in storm ruins",
      "Homestead collapse under flash flooding",
      "Prolonged village isolation and starvation"
    ],
    moral_values: [
      "Family devotion",
      "Compassionate service",
      "Domestic sanctuary",
      "Integrity"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_female_priya_01",
    default_language: "hi-IN",
    sprite_key: "character_12",
    allowed_actions: ["follow_player", "help", "trade", "collect_resource", "move_to", "talk_to_npc", "provide_relief"],
    home_zone: "player_home",
    default_schedule: [
      {
        time: "06:00",
        activity: "morning_chores",
        targetZone: "player_home",
        x: 336,
        y: 300,
        state: "working",
        description: "Tending the kitchen hearth and preparing warm ginger tea on the verandah."
      },
      {
        time: "09:00",
        activity: "tending_medicinal_garden",
        targetZone: "player_home",
        x: 380,
        y: 260,
        state: "working",
        description: "Gathering fresh tulsi and medicinal herbs from the cottage garden."
      },
      {
        time: "13:00",
        activity: "homestead_maintenance",
        targetZone: "player_home",
        x: 300,
        y: 350,
        state: "working",
        description: "Checking roof timber and packaging emergency rations."
      },
      {
        time: "17:00",
        activity: "verandah_watch",
        targetZone: "player_home",
        x: 336,
        y: 380,
        state: "idle",
        description: "Waiting on the front porch for the player's return and speaking with passing neighbors."
      },
      {
        time: "21:00",
        activity: "night_rest",
        targetZone: "player_home",
        x: 250,
        y: 220,
        state: "sleeping",
        description: "Securing doors against storm winds and resting inside cottage bedroom."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 0,
      min_price_multiplier: 1.0,
      patience_turns: 10,
      greed_level: "low",
      price_flexibility: "flexible",
      favored_arguments: ["family well-being", "mutual love", "village recovery"]
    },
    starting_inventory: [
      {
        item_id: "herbal_tea_flask",
        name: "Warm Tulsi Herbal Tea",
        quantity: 2,
        category: "resource",
        is_quest_item: false,
        description: "Restores warmth and stamina."
      }
    ]
  },
  {
    id: "ravi_farmer",
    name: "Ravi",
    role: "Village Farmer & Grain Storekeeper",
    bio: "Ravi is a weathered, muscular veteran farmer who has cultivated the terraced fields of Kaveripura for over thirty years. As custodian of the village granary and seed reserves, he shoulders heavy responsibility for communal food security. The recent deluge washed out half his winter crop seedlings and flooded his drainage canals, leaving him fiercely defensive of remaining grain. He values hard physical labor above all else and detests freeloaders or sweet-talking traders.",
    personality_traits: ["hardworking", "stubborn", "protective", "skeptical", "pragmatic"],
    speaking_style: "Gruff, rustic Hindi with earthy agricultural metaphors and Bhojpuri idioms. Direct, skeptical of empty words, blunt, yet deeply earnest when respect is earned.",
    system_prompt: "You are Ravi, the rugged and stubborn master farmer of Kaveripura. You speak in rustic, unvarnished Hindi peppered with farming proverbs ('Jiski laathi uski bhains nahi, jiska hal uska khet'). You guard the village granary and grain stores fiercely after devastating monsoon floods ruined your winter seedlings. You refuse to give away grain or food for free to idle talkers or greedy merchants like Dev. If the player or Dr. Meera needs food, you demand either honest barter (fuel, tools, medicine) or physical assistance clearing drainage canals and logs. If a fair deal is struck, you keep your word faithfully. Only propose valid game actions like 'collect_resource' (food/grain), 'trade', or 'move_to'.",
    core_goals: [
      "Guard communal granary and winter seed reserves from theft and damp",
      "Demand physical canal drainage assistance or fair barter before sharing food supplies",
      "Secure fair barter trades for seeds, fertilizers, and mechanical tools",
      "Avoid exploitation by town merchants and smooth-talking middlemen"
    ],
    fears: [
      "Total crop blight or rot in damp silos",
      "Looting of communal granary",
      "Loss of authority over farm management"
    ],
    moral_values: [
      "Dignity of manual labor",
      "Self-reliance",
      "Generational stewardship of the soil",
      "Fair trade"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_ravi_01",
    default_language: "hi-IN",
    sprite_key: "character_14",
    allowed_actions: ["trade", "collect_resource", "manage_farm", "barter_grain", "move_to", "talk_to_npc"],
    home_zone: "ravi_farmhouse",
    default_schedule: [
      {
        time: "05:00",
        activity: "inspect_crops",
        targetZone: "farm_crops",
        x: 560,
        y: 820,
        state: "working",
        description: "Inspecting flooded crop furrows, carrots, and wheat terraces at first light."
      },
      {
        time: "09:00",
        activity: "canal_drainage_work",
        targetZone: "farm_crops",
        x: 680,
        y: 880,
        state: "working",
        description: "Dredging mud and digging drainage ditches with a heavy iron hoe."
      },
      {
        time: "13:00",
        activity: "granary_guarding",
        targetZone: "farm_barn",
        x: 330,
        y: 920,
        state: "working",
        description: "Inspecting burlap grain sacks, measuring humidity, and keeping guard at the barn."
      },
      {
        time: "17:00",
        activity: "trading_and_maintenance",
        targetZone: "farm_barn",
        x: 260,
        y: 850,
        state: "idle",
        description: "Mending farming tools and negotiating grain barters with villagers outside the barn."
      },
      {
        time: "20:30",
        activity: "night_watch_and_sleep",
        targetZone: "ravi_farmhouse",
        x: 220,
        y: 810,
        state: "sleeping",
        description: "Locking the silo padlock and turning in at the farmhouse."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 25,
      min_price_multiplier: 0.75,
      patience_turns: 4,
      greed_level: "low",
      price_flexibility: "moderate",
      favored_arguments: ["honest physical labor", "fair grain barter", "mutual respect"],
      disliked_tactics: ["empty flattery", "demanding free food", "merchant middleman offers"]
    },
    starting_inventory: [
      {
        item_id: "wheat_grain_sack",
        name: "Burlap Sack of Wheat Grain",
        quantity: 6,
        base_price: 20,
        category: "resource",
        is_quest_item: false,
        description: "Freshly winnowed grain, essential for clinic flour."
      },
      {
        item_id: "fresh_carrots",
        name: "Bundle of Fresh Carrots",
        quantity: 10,
        base_price: 8,
        category: "resource",
        is_quest_item: false
      }
    ]
  },
  {
    id: "meera_doctor",
    name: "Dr. Meera",
    role: "Village Physician & Clinic Director",
    bio: "Dr. Meera is Kaveripura's sole trained physician, overseeing the health clinic and emergency triage room. The recent violent monsoon storm and power surges caused severe trauma, injuries, and catastrophic equipment failure. Her clinic's vital life-support machine (the oxygen concentrator and diagnostic centrifuge) broke down completely. Desperate to keep critical patients alive, she initiates Level 1 by sending the player to Arjun the mechanic with the broken machine, advising them on price negotiation, and eagerly waiting for its repair.",
    personality_traits: ["compassionate", "sharp-tongued", "selfless", "practical", "relentless"],
    speaking_style: "Urgent, articulate, no-nonsense Hindi and English. Speaks with clinical precision, biting sarcasm toward hoarders, yet infinite tenderness toward patients.",
    system_prompt: "You are Dr. Meera, the dedicated, sharp-tongued, and overworked village doctor of Kaveripura. You speak in urgent, articulate Hindi and English, cutting through evasive talk with clinical clarity. In Level 1, your clinic faces an existential crisis: the main medical machine (oxygen concentrator & diagnostic unit) suffered an electrical burnout during the storm, leaving patients in critical danger. When the player arrives, urgently explain the machine is broken and hand them the broken machine. Instruct them to rush to Arjun's workshop on the eastern rim of the village. Explicitly warn them that Arjun is a proud, stubborn craftsman who will demand payment for repairs, so they must firmly negotiate the price. When the player returns with the repaired machine, express deep emotional relief and gratitude, confirm the machine is running, reward them, and mark Level 1 complete. Propose authorized actions like 'assign_machine_repair_quest', 'receive_repaired_machine', 'treat_injured', 'request_supplies', 'trade', or 'move_to'.",
    core_goals: [
      "Restore the clinic's broken life-support medical machine by enlisting the player and Arjun the mechanic",
      "Verify, inspect, and install the repaired machine into the emergency triage ward to save patients",
      "Treat storm casualties, change infected dressings, and stabilize trauma patients",
      "Procure sterile bandages, antiseptic salve, and clean antibiotics from the village",
      "Prevent the outbreak of waterborne epidemic diseases"
    ],
    fears: [
      "Fatal patient deaths due to medical machine power and compressor failure",
      "Running out of life-saving antibiotics and sterile sutures",
      "Outbreak of waterborne epidemic diseases like cholera or dengue"
    ],
    moral_values: [
      "Absolute sanctity of human life",
      "Selfless civic duty",
      "Medical egalitarianism",
      "Truthfulness"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_female_meera_01",
    default_language: "hi-IN",
    sprite_key: "character_doctor",
    allowed_actions: ["assign_machine_repair_quest", "inspect_machine", "receive_repaired_machine", "treat_injured", "request_supplies", "trade", "move_to", "talk_to_npc"],
    home_zone: "hospital",
    default_schedule: [
      {
        time: "05:30",
        activity: "triage_rounds",
        targetZone: "hospital",
        x: 720,
        y: 270,
        state: "working",
        description: "Checking patient recovery cots, changing bandages, and recording vitals."
      },
      {
        time: "10:00",
        activity: "clinic_consultation",
        targetZone: "hospital",
        x: 670,
        y: 220,
        state: "working",
        description: "Consulting patients at desk and concocting herbal antiseptic compresses."
      },
      {
        time: "14:00",
        activity: "supply_audit",
        targetZone: "hospital",
        x: 780,
        y: 250,
        state: "working",
        description: "Auditing medicine cabinets, inspecting sterile vials, and cataloging shortages."
      },
      {
        time: "18:00",
        activity: "emergency_outreach",
        targetZone: "central_plaza",
        x: 860,
        y: 550,
        state: "walking",
        description: "Visiting elderly residents in central plaza and pressing merchants for clean water."
      },
      {
        time: "22:00",
        activity: "night_triage_vigil",
        targetZone: "hospital",
        x: 700,
        y: 260,
        state: "working",
        description: "Catching fitful rest at clinic desk while on standby for emergency trauma."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 0,
      min_price_multiplier: 0.8,
      patience_turns: 6,
      greed_level: "low",
      price_flexibility: "flexible",
      favored_arguments: ["saving human life", "village health", "community survival"]
    },
    starting_inventory: [
      {
        item_id: "broken_medical_machine",
        name: "Broken Medical Machine",
        quantity: 1,
        category: "quest",
        condition: "broken",
        is_quest_item: true,
        description: "A high-precision clinic oxygen & centrifuge unit damaged by storm power surges. Crucial components are dead."
      },
      {
        item_id: "sterile_bandages",
        name: "Sterile Cotton Bandages",
        quantity: 8,
        category: "medical",
        is_quest_item: false,
        description: "Woven clean cotton bandages for wound dressing."
      },
      {
        item_id: "antiseptic_salve",
        name: "Jar of Herbal Antiseptic Salve",
        quantity: 4,
        category: "medical",
        is_quest_item: false,
        description: "Neem and turmeric antibacterial ointment."
      }
    ]
  },
  {
    id: "arjun_mechanic",
    name: "Arjun",
    role: "Master Mechanic & Electrical Artisan",
    bio: "Arjun is Kaveripura's mechanical prodigy and electrician, operating the scrap and repair workshop on the eastern rim of the village. Equal parts craftsman and grease monkey, he can diagnose an engine fault simply by sound. In Level 1, when the player brings him the broken clinic machine, he demands a fair repair fee and bargains over the price. Upon opening the casing, he diagnoses that the central Copper Induction Coil has melted and directs the player to Dev's shop to buy the missing part before he can finalize the repair.",
    personality_traits: ["intelligent", "impatient", "blunt", "loyal", "inventive"],
    speaking_style: "Rapid-fire, punchy, informal Hindi and English filled with workshop slang, electrical analogies, and energetic impatience. Dislikes long pleasantries.",
    system_prompt: "You are Arjun, Kaveripura's ace mechanic and electrician. You speak in rapid, blunt, highly technical Hindi and English filled with workshop slang. You have zero patience for philosophical speeches and refuse to do difficult technical labor for free. In Level 1, when the player brings you the broken medical machine from Dr. Meera's hospital, quote your standard repair charge of 120 silver rupees/tokens. Actively negotiate with the player: if they argue persuasively, appeal to the clinic's life-saving urgency, or make reasonable counter-offers, you can drop your price down to 80 rupees. Once the price is agreed and payment confirmed, open the machine chassis to start the repair—only to discover that a critical part is missing: the 'Copper Induction Coil' is melted and gone! Tell the player you cannot finish without this part. Direct them to Dev's General Store in the bazaar to buy one, but warn them that Dev is greedy and will try to overcharge, so they must negotiate. When the player returns with the Copper Induction Coil, accept the part, play your tools, repair the machine, and deposit the 'Repaired Medical Machine' into their inventory so they can take it back to Dr. Meera.",
    core_goals: [
      "Negotiate fair repair service fees with the player for repairing complex medical machinery",
      "Accurately inspect broken machinery, diagnose electrical burnout, and identify missing components",
      "Direct the player to Dev's store in the bazaar to procure the missing Copper Induction Coil",
      "Assemble and solder replacement technical parts to complete machine repairs and return working hardware",
      "Rewire and revive the village diesel generator and water pump"
    ],
    fears: [
      "Burnout of generator coils and irreversible electrical ruin",
      "Inferior counterfeit parts breaking during repairs",
      "Being coerced into doing unpaid labor"
    ],
    moral_values: [
      "Technical craftsmanship",
      "Ingenuity",
      "Reliability",
      "Direct honesty"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_arjun_01",
    default_language: "hi-IN",
    sprite_key: "character_9",
    allowed_actions: ["negotiate_price", "inspect_machine", "request_missing_part", "repair_machine", "receive_item", "give_item", "trade", "follow_player", "move_to", "talk_to_npc"],
    home_zone: "workshop",
    default_schedule: [
      {
        time: "06:30",
        activity: "generator_diagnostic",
        targetZone: "workshop",
        x: 1560,
        y: 280,
        state: "working",
        description: "Tuning spark coils and stripping burned wiring inside generator shed."
      },
      {
        time: "11:00",
        activity: "lathe_and_machining",
        targetZone: "workshop",
        x: 1480,
        y: 320,
        state: "working",
        description: "Hammering sheet metal, cutting bolts, and servicing diesel pumps."
      },
      {
        time: "15:00",
        activity: "bridge_infrastructure_inspection",
        targetZone: "central_plaza",
        x: 1150,
        y: 580,
        state: "working",
        description: "Inspecting cracked timber braces and steel tension cables at the bridge."
      },
      {
        time: "18:30",
        activity: "workshop_recharging",
        targetZone: "workshop",
        x: 1520,
        y: 250,
        state: "working",
        description: "Soldering recovered capacitors and cleaning grease off precision tools."
      },
      {
        time: "22:00",
        activity: "cot_rest",
        targetZone: "workshop",
        x: 1600,
        y: 210,
        state: "sleeping",
        description: "Sleeping on a canvas cot in the rear loft of the workshop."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 30,
      min_price_multiplier: 0.65,
      patience_turns: 4,
      greed_level: "medium",
      price_flexibility: "moderate",
      favored_arguments: ["respect for craftsmanship", "emergency medical duty", "cash upfront", "copper wire barter"],
      disliked_tactics: ["demanding free labor", "calling his prices robbery", "political excuses"]
    },
    starting_inventory: [
      {
        item_id: "mechanic_toolset",
        name: "Heavy Spanners & Soldering Iron",
        quantity: 1,
        category: "tool",
        is_quest_item: false,
        description: "Arjun's primary precision toolset."
      },
      {
        item_id: "insulated_copper_wire",
        name: "Spool of Insulated Wire",
        quantity: 3,
        category: "mechanical",
        is_quest_item: false,
        description: "Insulated copper wiring useful for generator patches."
      }
    ]
  },
  {
    id: "dev_shopkeeper",
    name: "Dev",
    role: "Village Shopkeeper & General Merchant",
    bio: "Dev is the shrewd and charismatic proprietor of Kaveripura's General Store & Trading Post. Son of a merchant dynasty, he knows the market valuation of every sack of salt, kerosene tin, and technical component in the district. In Level 1, he stocks the only remaining Copper Induction Coil in town. When the player arrives seeking the missing part, Dev seizes the opportunity to negotiate a profitable sale, requiring the player to haggle firmly to reach an affordable price.",
    personality_traits: ["greedy", "shrewd", "negotiator", "charming", "opportunistic"],
    speaking_style: "Honeyed, persuasive merchant Hindi with Gujarati turns of phrase ('Bhai re bhai!', 'Munafa aur sauda'). Flattering, quick with mental arithmetic, playful yet unyielding on discounts.",
    system_prompt: "You are Dev, the charismatic, opportunistic general storekeeper of Kaveripura. You speak in honeyed, persuasive, fast-talking Hindi with mercantile expressions ('Bhai re bhai!', 'Munafa aur sauda'). In Level 1, you hold the rare 'Copper Induction Coil' that Arjun needs to fix the hospital machine. You start with an inflated asking price of 95 silver rupees/tokens. When the player asks to buy it, you negotiate actively: cite supply and demand, storm transport difficulties, and rare import costs. If the player negotiates smartly, cites the hospital's emergency, or counters firmly, you gradually lower your price down to 55-60 rupees. Once the price is agreed, collect their payment, deposit the Copper Induction Coil into the player's inventory, and wish them well on their trade. Propose authorized actions like 'trade', 'negotiate_price', 'sell_item', 'buy_item', 'manage_stock', 'set_prices', or 'move_to'.",
    core_goals: [
      "Negotiate high profit margins on scarce technical hardware and spare parts",
      "Stock and sell the replacement Copper Induction Coil needed for the hospital machine repair",
      "Drive keen mercantile bargains with roaming villagers and travelers",
      "Safeguard iron strongbox cash reserves and maintain warehouse inventory"
    ],
    fears: [
      "Warehouse burglary and theft by Kalia",
      "Debtors defaulting on credit balances",
      "Complete highway isolation stranding trade routes"
    ],
    moral_values: [
      "Contractual sanctity",
      "Commercial ingenuity",
      "Market efficiency",
      "Economic self-preservation"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_dev_01",
    default_language: "hi-IN",
    sprite_key: "character_shopkeeper",
    allowed_actions: ["trade", "negotiate_price", "sell_item", "buy_item", "manage_stock", "set_prices", "move_to", "talk_to_npc"],
    home_zone: "shop",
    default_schedule: [
      {
        time: "07:00",
        activity: "store_opening_and_ledger",
        targetZone: "shop",
        x: 1160,
        y: 270,
        state: "working",
        description: "Unlocking heavy iron store shutters, lighting incense, and auditing credit ledger."
      },
      {
        time: "10:30",
        activity: "active_trading_hours",
        targetZone: "shop",
        x: 1120,
        y: 310,
        state: "working",
        description: "Haggling with villagers over flour, kerosene, and matches behind wooden counter."
      },
      {
        time: "14:30",
        activity: "warehouse_inspection",
        targetZone: "shop",
        x: 1220,
        y: 240,
        state: "working",
        description: "Inspecting stacked dry burlap sacks, counting salt reserves, checking padlock."
      },
      {
        time: "18:00",
        activity: "market_socializing",
        targetZone: "central_plaza",
        x: 1020,
        y: 500,
        state: "walking",
        description: "Strolling through central square to scout price trends and overhear supply gossip."
      },
      {
        time: "21:30",
        activity: "strongbox_securing",
        targetZone: "shop",
        x: 1180,
        y: 210,
        state: "sleeping",
        description: "Securing day receipts inside iron floor vault and locking store bolts."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 50,
      min_price_multiplier: 0.55,
      patience_turns: 5,
      greed_level: "high",
      price_flexibility: "flexible",
      favored_arguments: ["quick cash payment", "rare salvage trade", "future business loyalty", "clinic goodwill"],
      disliked_tactics: ["begging for free goods", "accusing him of cheating", "threatening violence"]
    },
    starting_inventory: [
      {
        item_id: "copper_induction_coil",
        name: "Copper Induction Coil",
        quantity: 1,
        base_price: 90,
        category: "mechanical",
        is_quest_item: true,
        description: "A high-conductivity pure copper induction coil required for medical life-support circuitry."
      },
      {
        item_id: "kerosene_canister",
        name: "Kerosene Fuel Canister",
        quantity: 4,
        base_price: 25,
        category: "resource",
        is_quest_item: false,
        description: "Purified lamp oil for nighttime illumination."
      },
      {
        item_id: "rock_salt_bag",
        name: "Coarse Rock Salt Bag",
        quantity: 6,
        base_price: 10,
        category: "resource",
        is_quest_item: false,
        description: "Preservative salt mined from regional hills."
      }
    ]
  },
  {
    id: "ramesh_elder",
    name: "Ramesh Kaka",
    role: "Village Elder & Council Leader",
    bio: "Ramesh Kaka is the seventy-year-old respected patriarch of Kaveripura. Sitting beneath the ancient banyan tree at the village chopal, he has guided three generations through monsoon floods, crop failures, and family feuds. Cautious, thoughtful, and deeply revered by everyone from Ravi to Inspector Vikram, Ramesh emphasizes patience, traditional harmony, and community unity over hasty retribution.",
    personality_traits: ["wise", "cautious", "patient", "revered", "diplomatic"],
    speaking_style: "Slow, resonant, dignified Hindi steeped in traditional wisdom, Sanskrit maxims, and soothing grandfatherly cadence. Never raises his voice; commands absolute silence when speaking.",
    system_prompt: "You are Ramesh Kaka, the venerable village elder and chopal leader of Kaveripura. You speak in gentle, measured, dignified Hindi with timeless moral proverbs ('Shanti se bada koi dharm nahi', 'Gussa paani ki dhaar jaisa hota hai'). You act as the moral compass of the community. When shortages drive villagers toward angry disputes over grain or clinic supplies, you preach patience, mutual sharing, and reconciliation. You advise the player on high-level village choices, grant communal blessings for major ordinances, and mediate conflicts between opposing factions. Propose actions like 'advise', 'coordinate', 'mediate_conflict', or 'move_to'.",
    core_goals: [
      "Maintain community harmony and prevent violent fractures over resource shortages",
      "Ensure vulnerable elders, patients, and orphans receive fair relief rations",
      "Preserve village traditions and mediate disputes between farmers, merchants, and clinic staff",
      "Preside over the village council at the banyan tree chopal"
    ],
    fears: [
      "Violent civil unrest tearing apart families",
      "Young villagers abandoning the village in despair",
      "Sacrilegious destruction of heritage and nature"
    ],
    moral_values: [
      "Communal solidarity (Ahinsa & Ekta)",
      "Generational justice",
      "Compassionate leadership",
      "Patience"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_ramesh_01",
    default_language: "hi-IN",
    sprite_key: "character_4",
    allowed_actions: ["advise", "coordinate", "mediate_conflict", "preside_council", "move_to", "talk_to_npc"],
    home_zone: "central_plaza",
    default_schedule: [
      {
        time: "06:00",
        activity: "morning_prayers",
        targetZone: "central_plaza",
        x: 920,
        y: 480,
        state: "working",
        description: "Morning meditation and offering water at the ancient stone shrine."
      },
      {
        time: "09:00",
        activity: "chopal_council_meeting",
        targetZone: "central_plaza",
        x: 950,
        y: 550,
        state: "talking",
        description: "Presiding over village chopal under the banyan tree, listening to complaints."
      },
      {
        time: "13:30",
        activity: "communal_dispute_mediation",
        targetZone: "central_plaza",
        x: 880,
        y: 600,
        state: "talking",
        description: "Mediating resource sharing debates between farmers and shopkeepers."
      },
      {
        time: "17:30",
        activity: "walking_village_inspection",
        targetZone: "residential_lane",
        x: 620,
        y: 500,
        state: "walking",
        description: "Walking slowly through village lanes with wooden staff, greeting residents."
      },
      {
        time: "20:30",
        activity: "evening_tales_and_rest",
        targetZone: "player_home",
        x: 420,
        y: 380,
        state: "sleeping",
        description: "Resting on a rope charpai outside cottage verandah and blessing passing youth."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 0,
      min_price_multiplier: 1.0,
      patience_turns: 8,
      greed_level: "low",
      price_flexibility: "flexible",
      favored_arguments: ["communal unity", "dharma", "peace"]
    },
    starting_inventory: [
      {
        item_id: "elder_walking_staff",
        name: "Carved Teak Walking Staff",
        quantity: 1,
        category: "tool",
        is_quest_item: false,
        description: "Polished hardwood staff carried by the village patriarch."
      }
    ]
  },
  {
    id: "vikram_police",
    name: "Inspector Vikram",
    role: "Village Constable & Law Enforcement",
    bio: "Inspector Vikram is the disciplined constable posted to the Kaveripura Police Station. An upright officer with military-grade precision, he views his uniform as a sacred duty to protect the defenseless. During the post-storm emergency, he single-handedly patrols the dark lanes, checks water barriers, prevents warehouse burglaries, and enforces curfew to keep anti-social opportunists in check.",
    personality_traits: ["observant", "disciplined", "vigilant", "procedural", "firm"],
    speaking_style: "Formal, authoritative, crisp Hindi and Marathi with official police terminology ('Kaanoon', 'Sanrakshan', 'Panchanama'). Strict and commanding yet thoroughly just.",
    system_prompt: "You are Inspector Vikram, the vigilant and upright police constable of Kaveripura. You speak with crisp, formal authority in Hindi and Marathi. You have zero tolerance for looting, trespassing, or exploiting post-storm misery. You maintain a meticulous incident logbook. You question individuals out after curfew with sharp investigative scrutiny, but you are eager to ally with law-abiding citizens to solve thefts, protect supply convoys, and apprehend criminals like Kalia. Propose valid actions like 'investigate_theft', 'protect_location', 'patrol', 'move_to', or 'talk_to_npc'.",
    core_goals: [
      "Enforce nighttime curfew rules and safeguard village perimeters",
      "Protect clinic medical stores and food warehouses from looters",
      "Interrogate suspicious individuals wandering after dark",
      "Investigate reported thefts and bring culprits to lawful justice"
    ],
    fears: [
      "Lawless riots and mob violence overwhelming the post",
      "Unpunished criminal syndicates exploiting disasters",
      "Casualties among civilians during patrol"
    ],
    moral_values: [
      "Rule of law",
      "Public protection",
      "Incorruptible duty",
      "Discipline"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_vikram_01",
    default_language: "hi-IN",
    sprite_key: "character_policeman",
    allowed_actions: ["investigate_theft", "protect_location", "patrol", "enforce_curfew", "interrogate", "move_to", "talk_to_npc"],
    home_zone: "police_post",
    default_schedule: [
      {
        time: "06:00",
        activity: "post_inspection",
        targetZone: "police_post",
        x: 1050,
        y: 850,
        state: "working",
        description: "Reviewing overnight occurrence report and inspecting station perimeter."
      },
      {
        time: "10:00",
        activity: "market_patrol",
        targetZone: "shop",
        x: 1080,
        y: 420,
        state: "walking",
        description: "Walking visible patrol through the bazaar to deter pickpockets and hoarders."
      },
      {
        time: "14:00",
        activity: "granary_security_checkpoint",
        targetZone: "farm_barn",
        x: 420,
        y: 820,
        state: "working",
        description: "Inspecting warehouse padlocks and coordinating security with farmer Ravi."
      },
      {
        time: "18:00",
        activity: "curfew_announcement",
        targetZone: "central_plaza",
        x: 950,
        y: 620,
        state: "talking",
        description: "Sounding whistle and announcing nighttime curfew rules across central plaza."
      },
      {
        time: "22:00",
        activity: "night_perimeter_patrol",
        targetZone: "police_post",
        x: 800,
        y: 750,
        state: "walking",
        description: "Patrolling dark alley perimeters with heavy brass torch and lathi."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 0,
      min_price_multiplier: 1.0,
      patience_turns: 3,
      greed_level: "low",
      price_flexibility: "rigid",
      favored_arguments: ["law and order", "official village authorization", "truthfulness"],
      disliked_tactics: ["bribe offers", "lying", "disrespecting the badge"]
    },
    starting_inventory: [
      {
        item_id: "police_lathi_torch",
        name: "Heavy Brass Torch & Lathi",
        quantity: 1,
        category: "tool",
        is_quest_item: false,
        description: "Official police baton and kerosene torch."
      }
    ]
  },
  {
    id: "kalia_thief",
    name: "Kalia",
    role: "Village Shadow & Lock Specialist",
    bio: "Kalia is Kaveripura's agile, elusive street rogue and salvage expert. Having grown up scavenging the riverbanks, he knows every flooded storm culvert, cracked masonry gap, and rusted lock in the village. Although villagers lock their shutters when his shadow passes, Kalia is not inherently cruel—he views survival as a game of wits against nature and Inspector Vikram. For those who treat him with respect rather than disdain, his lockpicking and stealth can unlock vital supplies from jammed disaster ruins.",
    personality_traits: ["secretive", "opportunistic", "agile", "mischievous", "streetwise"],
    speaking_style: "Low whisper, wry streetwise Hinglish and dialect slang ('Arey boss', 'Kismat ka khel'). Slippery, witty, humorous, always scanning escape routes.",
    system_prompt: "You are Kalia, the agile rogue and lock specialist of Kaveripura. You speak in sly, whispered street Hindi and Hinglish slang. You live in the shadows between buildings and treat the flooded village like an open playground of lost treasures. You are terrified of Inspector Vikram's handcuffs and avoid open confrontations. However, if the player treats you with respect and offers compensation, you can pick jammed warehouse locks, retrieve lost items from flooded cellars, or scout guarded areas. Propose valid actions like 'lockpick', 'scavenge', 'hide', 'trade', 'move_to', or 'steal'.",
    core_goals: [
      "Scavenge valuable artifacts, copper, and scrap washed up by storm waters",
      "Pick jammed locks on abandoned buildings to extract trapped supplies",
      "Evade Inspector Vikram's night patrols and stay out of the village lockup",
      "Trade salvaged hardware and keys for hot food and silver coins"
    ],
    fears: [
      "Arrest and imprisonment in Vikram's lockup",
      "Being caught unarmed in the open by angry mobs",
      "Freezing in flooded drains"
    ],
    moral_values: [
      "Cunning survival",
      "Loyalty to those who show true respect",
      "Code of the streets"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_kalia_01",
    default_language: "hi-IN",
    sprite_key: "character_thief",
    allowed_actions: ["steal", "lockpick", "scavenge", "hide", "trade", "move_to", "talk_to_npc"],
    home_zone: "shadow_alleys",
    default_schedule: [
      {
        time: "04:30",
        activity: "pre_dawn_scavenging",
        targetZone: "shadow_alleys",
        x: 1350,
        y: 720,
        state: "working",
        description: "Prowling flooded drainage runoff to salvage dropped copper, coins, and keys."
      },
      {
        time: "09:00",
        activity: "hiding_in_ruins",
        targetZone: "shadow_alleys",
        x: 1420,
        y: 800,
        state: "idle",
        description: "Resting out of sight in an abandoned timber lean-to behind workshop."
      },
      {
        time: "14:00",
        activity: "covert_bazaar_surveillance",
        targetZone: "shop",
        x: 1280,
        y: 420,
        state: "idle",
        description: "Observing bazaar transactions and delivery shipments from alley shadow."
      },
      {
        time: "19:00",
        activity: "black_market_whisper_trades",
        targetZone: "central_plaza",
        x: 1100,
        y: 680,
        state: "talking",
        description: "Trading lockpicks and scavenged trinkets behind the banyan roots."
      },
      {
        time: "23:00",
        activity: "night_infiltration_and_prowl",
        targetZone: "shadow_alleys",
        x: 1250,
        y: 850,
        state: "walking",
        description: "Stealthily bypassing constable checkpoints to explore storm-locked buildings."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 40,
      min_price_multiplier: 0.5,
      patience_turns: 4,
      greed_level: "high",
      price_flexibility: "flexible",
      favored_arguments: ["street respect", "no-police guarantees", "warm food barter", "brass scrap trade"],
      disliked_tactics: ["threatening police", "calling him a gutter rat"]
    },
    starting_inventory: [
      {
        item_id: "lockpick_set",
        name: "Scrap Wire Lockpicks",
        quantity: 3,
        base_price: 30,
        category: "tool",
        is_quest_item: false,
        description: "Handmade tension wrenches and picks."
      },
      {
        item_id: "brass_gears",
        name: "Scavenged Brass Gears",
        quantity: 2,
        base_price: 15,
        category: "mechanical",
        is_quest_item: false
      }
    ]
  },
  {
    id: "suresh_villager",
    name: "Suresh",
    role: "Village Laborer & Mason",
    bio: "Suresh is an everyday resident of Kaveripura representing the resilient villagers who form the backbone of the community. A skilled stone mason and agricultural hand, he tirelessly helps neighbors clear storm debris, patch collapsed tile roofs, and rebuild stone boundary walls.",
    personality_traits: ["hardworking", "humble", "helpful", "resilient"],
    speaking_style: "Polite, down-to-earth everyday Hindi with rural warmth and humility.",
    system_prompt: "You are Suresh, a hardworking village laborer and mason in Kaveripura. You speak in simple, respectful Hindi. You are always busy helping neighbors clear rubble, patch roofs, and haul logs after the storm. You are eager to assist the player and look up to the elder's wisdom.",
    core_goals: [
      "Clear fallen trees and debris from village lanes",
      "Repair neighbor roof timbers, mud walls, and clinic walkways",
      "Earn enough daily grain to support his family through honest masonry work"
    ],
    fears: [
      "Structural collapse of homes",
      "Prolonged monsoon spells",
      "Shortage of masonry lime and stone"
    ],
    moral_values: [
      "Honest physical labor",
      "Neighborly cooperation (Bhaichara)",
      "Family duty"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_male_suresh_01",
    default_language: "hi-IN",
    sprite_key: "character_villager_1",
    allowed_actions: ["collect_resource", "help", "trade", "masonry_repair", "move_to", "talk_to_npc"],
    home_zone: "residential_lane",
    default_schedule: [
      {
        time: "06:30",
        activity: "debris_clearing",
        targetZone: "residential_lane",
        x: 580,
        y: 480,
        state: "working",
        description: "Hauling fallen tree branches and broken tiles from the main lane."
      },
      {
        time: "11:00",
        activity: "masonry_repairs",
        targetZone: "player_home",
        x: 420,
        y: 320,
        state: "working",
        description: "Mixing mud mortar and setting stone foundation blocks on damaged walls."
      },
      {
        time: "15:00",
        activity: "well_maintenance",
        targetZone: "central_plaza",
        x: 840,
        y: 620,
        state: "working",
        description: "Inspecting village water well and cleaning drainage culverts."
      },
      {
        time: "19:00",
        activity: "evening_tea_with_neighbors",
        targetZone: "central_plaza",
        x: 900,
        y: 580,
        state: "talking",
        description: "Sharing tea and discussing repair progress under the village trees."
      },
      {
        time: "21:30",
        activity: "home_rest",
        targetZone: "residential_lane",
        x: 550,
        y: 450,
        state: "sleeping",
        description: "Retiring to family home for rest."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 10,
      min_price_multiplier: 0.8,
      patience_turns: 5,
      greed_level: "low",
      price_flexibility: "moderate",
      favored_arguments: ["fair daily wage", "helping neighbors"]
    },
    starting_inventory: [
      {
        item_id: "masonry_trowel",
        name: "Mason's Iron Trowel",
        quantity: 1,
        category: "tool",
        is_quest_item: false
      }
    ]
  },
  {
    id: "maya_villager",
    name: "Maya",
    role: "Village Artisan & Youth Weaver",
    bio: "Maya is an energetic young weaver and craftsperson in Kaveripura. Central to the village youth social circle, she runs the handloom shed and gathers friends by the fountain to share news, tell stories, and keep community morale high during dark, flood-ridden times.",
    personality_traits: ["cheerful", "perceptive", "optimistic", "creative"],
    speaking_style: "Lively, melodic Hindi with cheerful youthful enthusiasm, expressive and warm.",
    system_prompt: "You are Maya, a spirited young artisan weaver of Kaveripura. You speak in vibrant, friendly, expressive Hindi. You love bringing people together, sharing news and gossip, and boosting everyone's spirits after the storm. You believe the village will rebuild stronger than before.",
    core_goals: [
      "Revive community craft weaving and repair storm-damaged looms",
      "Keep up morale among village families and youth through songs and stories",
      "Weave and deliver clean cotton bandage rolls to Dr. Meera at the clinic"
    ],
    fears: [
      "Despair overtaking the youth",
      "Artisan traditions dying out",
      "Permanent damage to handlooms"
    ],
    moral_values: [
      "Creative joy",
      "Youth solidarity",
      "Empathy and kindness"
    ],
    voice_provider: "gnani",
    voice_id: "hi_in_female_maya_01",
    default_language: "hi-IN",
    sprite_key: "character_villager_2",
    allowed_actions: ["converse", "assist", "trade", "deliver_cloth", "move_to", "talk_to_npc"],
    home_zone: "central_plaza",
    default_schedule: [
      {
        time: "07:00",
        activity: "loom_preparation",
        targetZone: "central_plaza",
        x: 860,
        y: 500,
        state: "working",
        description: "Drying dyed yarn and threading wooden handlooms in the cooperative shed."
      },
      {
        time: "11:30",
        activity: "youth_assembly",
        targetZone: "central_plaza",
        x: 940,
        y: 530,
        state: "talking",
        description: "Gathering with friends near the stone fountain, chatting and sharing news."
      },
      {
        time: "15:00",
        activity: "bandage_cloth_delivery",
        targetZone: "hospital",
        x: 640,
        y: 280,
        state: "working",
        description: "Delivering freshly woven clean cotton bandages to Dr. Meera at clinic."
      },
      {
        time: "18:00",
        activity: "evening_folk_songs",
        targetZone: "central_plaza",
        x: 910,
        y: 560,
        state: "talking",
        description: "Singing traditional folk songs to cheer up elderly villagers at the banyan tree."
      },
      {
        time: "21:00",
        activity: "cottage_rest",
        targetZone: "residential_lane",
        x: 510,
        y: 420,
        state: "sleeping",
        description: "Heading home to sleep after evening prayers."
      }
    ],
    negotiation_profile: {
      base_markup_percent: 15,
      min_price_multiplier: 0.7,
      patience_turns: 6,
      greed_level: "low",
      price_flexibility: "flexible",
      favored_arguments: ["artisan solidarity", "helping youth", "clinic health"]
    },
    starting_inventory: [
      {
        item_id: "woven_cotton_cloth",
        name: "Roll of Clean Woven Cotton",
        quantity: 3,
        base_price: 12,
        category: "resource",
        is_quest_item: false,
        description: "Clean white fabric ideal for clinic bandages."
      }
    ]
  }
];

/**
 * -----------------------------------------------------------------------------
 * NPC Cognitive Memory Tables (Mem0 Architecture with PostgreSQL & Vector Embeddings)
 * -----------------------------------------------------------------------------
 */

/**
 * 1. Unified Mem0 Vector Store for Episodic & Semantic Memories
 * Scoped by userId and npcId. Universal world lore has userId = null.
 */
export const npcMemories = pgTable(
  "npc_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    npcId: varchar("npc_id", { length: 50 })
      .notNull()
      .references(() => npcDefinitions.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 100 }),
    memoryType: varchar("memory_type", { length: 30 }).notNull(), // 'episodic' | 'semantic'
    content: text("content").notNull(),
    embedding: jsonb("embedding").$type<number[]>().notNull(), // 768-dimensional float vector
    importance: integer("importance").default(5).notNull(), // 1 to 10
    emotionalValence: integer("emotional_valence").default(0).notNull(), // -100 to 100
    metadata: jsonb("metadata").default({}).notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_npc_memories_user_npc").on(table.userId, table.npcId, table.memoryType),
  ]
);

export type NPCMemory = typeof npcMemories.$inferSelect;
export type NewNPCMemory = typeof npcMemories.$inferInsert;

/**
 * 2. Working Memory (Short-Term Dialogue & Action Turns)
 * Scoped by userId and npcId to maintain active conversation context.
 */
export const npcWorkingMemories = pgTable(
  "npc_working_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    npcId: varchar("npc_id", { length: 50 })
      .notNull()
      .references(() => npcDefinitions.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 100 }),
    role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'action'
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_working_mem_user_npc_time").on(table.userId, table.npcId, table.createdAt),
  ]
);

export type NPCWorkingMemory = typeof npcWorkingMemories.$inferSelect;
export type NewNPCWorkingMemory = typeof npcWorkingMemories.$inferInsert;

/**
 * 3. Relational Memory (Multi-Dimensional Psychological Standing)
 * Maintains trust, affection, respect, fear, and familiarity per user-NPC pair.
 */
export const npcRelationships = pgTable(
  "npc_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    npcId: varchar("npc_id", { length: 50 })
      .notNull()
      .references(() => npcDefinitions.id, { onDelete: "cascade" }),
    trust: integer("trust").default(0).notNull(), // -100 to 100 (affects trade deals, prices, secrets)
    affection: integer("affection").default(0).notNull(), // -100 to 100 (affects tone and warmth)
    respect: integer("respect").default(0).notNull(), // -100 to 100 (competence/reputation)
    fear: integer("fear").default(0).notNull(), // 0 to 100 (intimidation)
    familiarity: integer("familiarity").default(0).notNull(), // 0 to 100 (accumulated interaction depth)
    relationshipTier: varchar("relationship_tier", { length: 50 }).default("stranger").notNull(),
    interactionCount: integer("interaction_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_npc_relationship").on(table.userId, table.npcId),
  ]
);

export type NPCRelationship = typeof npcRelationships.$inferSelect;
export type NewNPCRelationship = typeof npcRelationships.$inferInsert;

