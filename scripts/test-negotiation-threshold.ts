import {
  getCatalogItem,
  getMerchantThresholdPrice,
  evaluateNegotiation,
  VILLAGE_ITEMS_CATALOG,
} from '../lib/inventory';
import { detectToolAndClean, extractQuantityFromText } from '../lib/npcDialogue';

function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Merchant & Mechanic Negotiation Threshold Test');
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

  // 1. Verify item threshold floors for all merchant items
  const kerosene = getCatalogItem('kerosene_canister')!;
  const devKeroseneThreshold = getMerchantThresholdPrice('dev_shopkeeper', kerosene);
  assert(devKeroseneThreshold === 22, `Dev kerosene threshold is ₹22 (got ₹${devKeroseneThreshold})`);

  const toolset = getCatalogItem('mechanic_toolset')!;
  const arjunToolsetThreshold = getMerchantThresholdPrice('arjun_mechanic', toolset);
  assert(arjunToolsetThreshold === 60, `Arjun toolset threshold is ₹60 (got ₹${arjunToolsetThreshold})`);

  const coil = getCatalogItem('copper_induction_coil')!;
  const devCoilThreshold = getMerchantThresholdPrice('dev_shopkeeper', coil);
  assert(devCoilThreshold === 70, `Dev coil threshold is ₹70 (got ₹${devCoilThreshold})`);

  const wire = getCatalogItem('insulated_copper_wire')!;
  const arjunWireThreshold = getMerchantThresholdPrice('arjun_mechanic', wire);
  assert(arjunWireThreshold === 28, `Arjun wire threshold is ₹28 (got ₹${arjunWireThreshold})`);

  const gears = getCatalogItem('brass_gears')!;
  const arjunGearsThreshold = getMerchantThresholdPrice('arjun_mechanic', gears);
  assert(arjunGearsThreshold === 32, `Arjun gears threshold is ₹32 (got ₹${arjunGearsThreshold})`);

  // 2. evaluateNegotiation: Dev Shopkeeper below threshold
  console.log('\n--- Testing evaluateNegotiation for Dev below threshold ---');
  const outcomeDevLow = evaluateNegotiation(
    'dev_shopkeeper',
    kerosene,
    30,
    10, // offered 10, threshold is 22
    'neighbor',
    5
  );
  assert(!outcomeDevLow.accepted, 'Offer below threshold was rejected by Dev');
  assert(outcomeDevLow.counterOffer === 22, `Dev counter-offered threshold floor of ₹22 (got ₹${outcomeDevLow.counterOffer})`);
  assert(
    outcomeDevLow.merchantReplyEnglish.includes('I can only reduce the cost till ₹22 price'),
    `Dev English reply states "I can only reduce the cost till ₹22 price" (got: "${outcomeDevLow.merchantReplyEnglish}")`
  );
  assert(
    outcomeDevLow.merchantReplyHindi.includes('मैं केवल ₹22 तक ही दाम कम कर सकता हूँ'),
    `Dev Hindi reply states "मैं केवल ₹22 तक ही दाम कम कर सकता हूँ" (got: "${outcomeDevLow.merchantReplyHindi}")`
  );

  // 3. evaluateNegotiation: Arjun Mechanic below threshold
  console.log('\n--- Testing evaluateNegotiation for Arjun below threshold ---');
  const outcomeArjunLow = evaluateNegotiation(
    'arjun_mechanic',
    toolset,
    75,
    30, // offered 30, threshold is 60
    'clinic',
    4
  );
  assert(!outcomeArjunLow.accepted, 'Offer below threshold was rejected by Arjun');
  assert(outcomeArjunLow.counterOffer === 60, `Arjun counter-offered threshold floor of ₹60 (got ₹${outcomeArjunLow.counterOffer})`);
  assert(
    outcomeArjunLow.merchantReplyEnglish.includes('I can only reduce the cost till ₹60 price'),
    `Arjun English reply states "I can only reduce the cost till ₹60 price" (got: "${outcomeArjunLow.merchantReplyEnglish}")`
  );
  assert(
    outcomeArjunLow.merchantReplyHindi.includes('मैं केवल ₹60 तक ही दाम कम कर सकता हूँ'),
    `Arjun Hindi reply states "मैं केवल ₹60 तक ही दाम कम कर सकता हूँ" (got: "${outcomeArjunLow.merchantReplyHindi}")`
  );

  // 4. evaluateNegotiation: Valid negotiation at or above threshold
  console.log('\n--- Testing evaluateNegotiation at or above threshold ---');
  const outcomeDevValid = evaluateNegotiation(
    'dev_shopkeeper',
    kerosene,
    30,
    25, // offered 25, above threshold 22
    'neighbor',
    5
  );
  assert(outcomeDevValid.accepted, 'Offer at/above threshold with tactic was accepted by Dev');
  assert(outcomeDevValid.agreedPrice === 25, `Agreed price is ₹25 (got ₹${outcomeDevValid.agreedPrice})`);

  // 5. evaluateNegotiation: Arjun Mechanic accepted negotiation at ₹65 (above ₹60 threshold)
  const outcomeArjunValid = evaluateNegotiation(
    'arjun_mechanic',
    toolset,
    75,
    65, // offered 65, above threshold 60
    'clinic',
    4
  );
  assert(outcomeArjunValid.accepted, 'Offer above threshold accepted by Arjun');
  assert(outcomeArjunValid.agreedPrice === 65, `Agreed price is ₹65 (got ₹${outcomeArjunValid.agreedPrice})`);

  // 6. Multi-quantity threshold validation
  console.log('\n--- Testing multi-quantity threshold in detectToolAndClean ---');
  // 2 kerosene canisters = 2 * 22 = ₹44 floor. Player offers ₹30 total.
  const multiQtyTest = detectToolAndClean(
    'Bolo kya loge?',
    '2 kerosene canister 30 rupaye me de do',
    'dev_shopkeeper'
  );
  assert(multiQtyTest.toolCall === undefined, 'Multi-quantity deal below ₹44 total floor was blocked');
  assert(
    multiQtyTest.cleanedText.includes('44'),
    `Total threshold ₹44 for 2 items was stated (got: "${multiQtyTest.cleanedText}")`
  );

  // 7. detectToolAndClean: LLM output tool below threshold
  console.log('\n--- Testing detectToolAndClean with LLM output below threshold ---');
  const rawTextWithLowDeal = 'Deal done! Take the canister. [TOOL: trade_deal, item: kerosene_canister, price: 10, quantity: 1]';
  const cleanResult = detectToolAndClean(rawTextWithLowDeal, 'give me kerosene for 10', 'dev_shopkeeper');
  assert(cleanResult.toolCall === undefined, 'Trade deal tool call below threshold was blocked');
  assert(
    cleanResult.cleanedText.includes('I can only reduce the cost till ₹22 price'),
    `Cleaned text explains threshold limit (got: "${cleanResult.cleanedText}")`
  );

  // 8. detectToolAndClean: Fallback detection when user asks below threshold in Hindi
  console.log('\n--- Testing detectToolAndClean fallback when user asks below threshold in Hindi ---');
  const fallbackHindi = detectToolAndClean(
    'ठीक है भाई।',
    'kerosene canister 10 rupaye me de do',
    'dev_shopkeeper'
  );
  assert(fallbackHindi.toolCall === undefined, 'Fallback trade deal below threshold was blocked');
  assert(
    fallbackHindi.cleanedText.includes('मैं केवल ₹22 तक ही दाम कम कर सकता हूँ'),
    `Hindi fallback response enforces threshold limit (got: "${fallbackHindi.cleanedText}")`
  );

  // 9. detectToolAndClean: When user asks below threshold for induction coil
  console.log('\n--- Testing detectToolAndClean when user asks below threshold for induction coil ---');
  const fallbackCoil = detectToolAndClean(
    'Haan bolo kya chahiye',
    'induction coil 40 rs me chahiye',
    'dev_shopkeeper'
  );
  assert(fallbackCoil.toolCall === undefined, 'Deal below ₹70 floor was blocked');
  assert(
    fallbackCoil.cleanedText.includes('70'),
    `Induction coil threshold ₹70 was stated (got: "${fallbackCoil.cleanedText}")`
  );

  // 10. detectToolAndClean: When user asks Arjun for spanner toolset for 25 rs
  console.log('\n--- Testing detectToolAndClean for Arjun toolset below threshold ---');
  const fallbackArjun = detectToolAndClean(
    'Workshop me bolo',
    'spanner toolset 25 rs me de do',
    'arjun_mechanic'
  );
  assert(fallbackArjun.toolCall === undefined, 'Deal below ₹60 floor was blocked');
  assert(
    fallbackArjun.cleanedText.includes('60'),
    `Arjun toolset threshold ₹60 was stated (got: "${fallbackArjun.cleanedText}")`
  );

  // 11. detectToolAndClean: Valid deal at or above threshold
  console.log('\n--- Testing detectToolAndClean with valid deal at threshold ---');
  const rawValidText = 'Haan padosi ho, to ₹25 me pakka! [TOOL: trade_deal, item: kerosene_canister, price: 25, quantity: 1]';
  const validResult = detectToolAndClean(rawValidText, '25 me kerosene de do', 'dev_shopkeeper');
  assert(validResult.toolCall !== undefined, 'Valid trade deal at/above threshold was permitted');
  assert(validResult.toolCall?.price === 25, `Valid trade deal price is ₹25 (got ₹${validResult.toolCall?.price})`);

  console.log(`\n====================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
