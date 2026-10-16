// Texts of everything the app says outside the shlokas. The owner records each one in the
// Voice Studio (same keys as cms/content/prompts.js); until then the phone voice reads these.
// Generated from cms/content/prompts.js — edit both together.
import type { Lang } from './types';

export const PROMPT_TEXT = {
  "opening": { hi: "जय गौर! श्री राधारमणो विजयते। श्रवणमङ्गलम् में आपका स्वागत है। राधेश्याम!", en: "Jai Gaur! Shri Radharamano Vijayate. Welcome to Shravan Mangalam. Radheshyam!" },
  "welcome": { hi: "जय गौर! श्री राधारमणो विजयते। श्रवणमङ्गलम् में आपका स्वागत है। स्क्रीन पर कहीं भी छूकर चलाइए। दाएँ स्वाइप करें — अगला। बाएँ स्वाइप — पिछला। दो बार छुएँ — खोलें। नीचे स्वाइप — वापस। उँगली दबाकर रखें — मदद।", en: "Jai Gaur! Shri Radharamano Vijayate. Welcome to Shravan Mangalam. Touch anywhere on the screen. Swipe right for next. Swipe left for previous. Double tap to open. Swipe down to go back. Press and hold for help." },
  "menuHelp": { hi: "दाएँ या बाएँ स्वाइप करके चुनें। एक बार छुएँ — नाम दोबारा सुनें। दो बार छुएँ — खोलें। नीचे स्वाइप — वापस जाएँ।", en: "Swipe right or left to choose. Tap once to hear the name again. Double tap to open. Swipe down to go back." },
  "lessonHelp": { hi: "एक बार छुएँ — पंक्ति सुनें। दो बार छुएँ — मेरे बाद दोहराएँ। दाएँ या बाएँ स्वाइप — अगली या पिछली पंक्ति। ऊपर स्वाइप — पूरा सुनें। उँगली दबाकर रखें — अर्थ सुनें। नीचे स्वाइप — वापस।", en: "Tap once to hear the line. Double tap for repeat after me. Swipe right or left for the next or previous line. Swipe up to hear it all. Press and hold for the meaning. Swipe down to go back." },
  "lessonIntro": { hi: "दो बार छुएँ — मेरे बाद दोहराएँ। एक बार छुएँ — पहली पंक्ति सुनें।", en: "Double tap for repeat after me. Tap once to hear the first line." },
  "yourTurn": { hi: "अब आप।", en: "Your turn." },
  "allTogether": { hi: "अब पूरा एक साथ।", en: "Now all together." },
  "wellDone": { hi: "बहुत बढ़िया! राधारमण लाल की जय!", en: "Well done! Radharaman Lal ki Jai!" },
  "edge": { hi: "यहाँ और नहीं है।", en: "Nothing more here." },
  "bye": { hi: "राधेश्याम। फिर मिलेंगे।", en: "Radheshyam. See you soon." },
  "col_krishna": { hi: "श्री राधारमण", en: "Shri Radharaman" },
  "malaDone": { hi: "एक माला पूरी हुई! राधारमण लाल की जय!", en: "One mala complete! Radharaman Lal ki Jai!" },
  "col_gita": { hi: "श्रीमद्भगवद्गीता", en: "Bhagavad Gita" },
  "col_kids": { hi: "बच्चों के लिए", en: "For kids" },
  "col_shloka": { hi: "श्लोक", en: "Shlokas" },
  "col_mantra": { hi: "मंत्र", en: "Mantras" },
  "col_stotra": { hi: "स्तोत्र", en: "Stotras" },
  "col_bhajan": { hi: "भजन", en: "Bhajans" },
  "col_aarti": { hi: "आरती", en: "Aartis" },
  "col_all": { hi: "सभी पाठ", en: "Everything" },
} satisfies Record<string, Record<Lang, string>>;

export type PromptKey = keyof typeof PROMPT_TEXT;
