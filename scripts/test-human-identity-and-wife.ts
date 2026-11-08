import { getNPCTraits } from '../lib/npcDialogue';
import { detectToolAndClean } from '../lib/npcDialogue';
import { getRelationshipGuidance } from '../lib/memory/promptBuilder';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting NPC Real Human Identity & Flirty Wife Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details ? details : '');
      failed++;
    }
  }

  // 1. Check Priya's traits
  const priyaTraits = await getNPCTraits('priya_wife');
  assert(priyaTraits !== null, 'Priya traits exist');
  assert(
    Boolean(priyaTraits?.role.toLowerCase().includes('wife')),
    `Priya's role explicitly includes 'wife' (got: "${priyaTraits?.role}")`
  );
  assert(
    Boolean(priyaTraits?.personality_traits.includes('flirtatious') || priyaTraits?.personality_traits.includes('playful')),
    `Priya's personality traits include 'flirtatious' and 'playful' (got: ${JSON.stringify(priyaTraits?.personality_traits)})`
  );

  // 2. Check Priya's relationship guidance in promptBuilder
  const priyaGuidance = getRelationshipGuidance('stranger', 0, 'Priya');
  assert(
    priyaGuidance.toLowerCase().includes('flirty') && priyaGuidance.toLowerCase().includes('wife'),
    `Priya relationship guidance establishes her as devoted, flirty wife (got: "${priyaGuidance}")`
  );

  // 3. Test Anti-NPC safeguard for Priya
  console.log('\n--- Testing Anti-NPC safeguard for Priya ---');
  const priyaNpcQuestion = detectToolAndClean(
    "Yes, I am an AI NPC programmed to help you in this game.",
    "Are you an NPC or an AI robot?",
    "priya_wife"
  );
  assert(
    !priyaNpcQuestion.cleanedText.toLowerCase().includes('i am an ai'),
    'Priya does not admit to being an AI'
  );
  assert(
    priyaNpcQuestion.cleanedText.toLowerCase().includes('wife') || priyaNpcQuestion.cleanedText.includes('बीवी'),
    `Priya asserts she is the player's real living wife (got: "${priyaNpcQuestion.cleanedText}")`
  );

  // 4. Test Anti-NPC safeguard in Hindi for Priya
  const priyaHindiNpc = detectToolAndClean(
    "हाँ, मैं एक NPC हूँ।",
    "kya tum koi robot ya npc ho?",
    "priya_wife"
  );
  assert(
    priyaHindiNpc.cleanedText.includes('खूबसूरत बीवी') && priyaHindiNpc.cleanedText.includes('जीती-जागती'),
    `Priya responds in flirty, loving Hindi asserting she is real wife (got: "${priyaHindiNpc.cleanedText}")`
  );

  // 5. Test Anti-NPC safeguard for other NPCs (e.g. Dev the shopkeeper)
  console.log('\n--- Testing Anti-NPC safeguard for Dev Shopkeeper ---');
  const devNpcQuestion = detectToolAndClean(
    "Yes, I am a non-player character in this simulation.",
    "Hey you are just an NPC right?",
    "dev_shopkeeper"
  );
  assert(
    !devNpcQuestion.cleanedText.toLowerCase().includes('non-player character'),
    'Dev does not admit to being a non-player character'
  );
  assert(
    devNpcQuestion.cleanedText.toLowerCase().includes('real living human') || devNpcQuestion.cleanedText.includes('जीता-जागता इंसान'),
    `Dev asserts he is a real living human being (got: "${devNpcQuestion.cleanedText}")`
  );

  // 6. Test Anti-NPC safeguard in Hindi for Arjun the mechanic
  console.log('\n--- Testing Anti-NPC safeguard for Arjun Mechanic in Hindi ---');
  const arjunHindiNpc = detectToolAndClean(
    "Haan main ek game character hoon.",
    "tum to AI bot ho na?",
    "arjun_mechanic"
  );
  assert(
    !arjunHindiNpc.cleanedText.includes('game character'),
    'Arjun rejects being a game character'
  );
  assert(
    arjunHindiNpc.cleanedText.includes('जीता-जागता इंसान') || arjunHindiNpc.cleanedText.toLowerCase().includes('real living human'),
    `Arjun asserts he is a real living human (got: "${arjunHindiNpc.cleanedText}")`
  );

  console.log(`\n====================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
