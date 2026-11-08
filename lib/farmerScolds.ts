/**
 * Farmer Ravi Scold Lines & Audio Registry
 * Pre-synthesized using Gnani TTS (Deepak voice, hi-IN)
 * Triggered when the player walks on the farm / cultivated crops in Kaveripura.
 */

export interface FarmerScoldLine {
  id: string;
  audioUrl: string;
  hindi: string;
  english: string;
}

export const FARMER_SCOLD_LINES: FarmerScoldLine[] = [
  {
    id: 'scold_1',
    audioUrl: '/audio/farmer_scold_1.wav',
    hindi: 'अरे ओ छोकरे! दिखता नहीं हरी फसल खड़ी है?! मेरे खेत से बाहर निकलो अभी, वरना लट्ठ उठा लूंगा!',
    english: "Hey you! Can't you see crops growing here?! Get off my field right now, or I'll chase you with my stick!"
  },
  {
    id: 'scold_2',
    audioUrl: '/audio/farmer_scold_2.wav',
    hindi: 'अरे! कहाँ अंधे की तरह मेरी बची-खुची फसल रौंद रहे हो?! बाढ़ के बाद बड़ी मुश्किल से उगाई है, चलो बाहर निकलो!',
    english: "Don't trample my surviving crops! It took so much sweat after the flood to save them, get out!"
  },
  {
    id: 'scold_3',
    audioUrl: '/audio/farmer_scold_3.wav',
    hindi: 'पाँव हटाओ मेरी क्यारियों से! ज़मीन में ताज़ा बीज दबे हैं! मेहनत की कोई कद्र नहीं है क्या?!',
    english: 'Keep your boots off my furrows! Fresh seeds are planted there! Have you no respect for honest labor?!'
  },
  {
    id: 'scold_4',
    audioUrl: '/audio/farmer_scold_4.wav',
    hindi: 'फिर से वही हरकत?! सड़क चलने के लिए होती है, मेरा खेत तुम्हारा खेल का मैदान नहीं है! फौरन पीछे हटो!',
    english: 'Still walking on them?! The road is for walking, my farm is not your playground! Step back at once!'
  }
];

let lastScoldIndex = -1;

export function getNextFarmerScold(): FarmerScoldLine {
  lastScoldIndex = (lastScoldIndex + 1) % FARMER_SCOLD_LINES.length;
  return FARMER_SCOLD_LINES[lastScoldIndex];
}
