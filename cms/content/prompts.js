// Everything the app says outside the shlokas themselves (Listen mode, lesson cues, collection
// names). Each is recorded in the owner's voice in the Voice Studio. The app has the same keys
// and texts (app/src/lib/prompts.ts) to fall back to the phone voice until a recording exists.
export const PROMPTS = [
  {
    key: 'opening',
    label: 'Opening greeting (every time the app opens)',
    hi: 'जय गौर! श्री राधारमणो विजयते। श्रवणमङ्गलम् में आपका स्वागत है। राधेश्याम!',
    en: 'Jai Gaur! Shri Radharamano Vijayate. Welcome to Shravan Mangalam. Radheshyam!',
  },
  {
    key: 'welcome',
    label: 'Welcome (Listen mode)',
    hi: 'जय गौर! श्री राधारमणो विजयते। श्रवणमङ्गलम् में आपका स्वागत है। स्क्रीन पर कहीं भी छूकर चलाइए। दाएँ स्वाइप करें — अगला। बाएँ स्वाइप — पिछला। दो बार छुएँ — खोलें। नीचे स्वाइप — वापस। उँगली दबाकर रखें — मदद।',
    en: 'Jai Gaur! Shri Radharamano Vijayate. Welcome to Shravan Mangalam. Touch anywhere on the screen. Swipe right for next. Swipe left for previous. Double tap to open. Swipe down to go back. Press and hold for help.',
  },
  {
    key: 'menuHelp',
    label: 'Help while choosing',
    hi: 'दाएँ या बाएँ स्वाइप करके चुनें। एक बार छुएँ — नाम दोबारा सुनें। दो बार छुएँ — खोलें। नीचे स्वाइप — वापस जाएँ।',
    en: 'Swipe right or left to choose. Tap once to hear the name again. Double tap to open. Swipe down to go back.',
  },
  {
    key: 'lessonHelp',
    label: 'Help while learning',
    hi: 'एक बार छुएँ — पंक्ति सुनें। दो बार छुएँ — मेरे बाद दोहराएँ। दाएँ या बाएँ स्वाइप — अगली या पिछली पंक्ति। ऊपर स्वाइप — पूरा सुनें। उँगली दबाकर रखें — अर्थ सुनें। नीचे स्वाइप — वापस।',
    en: 'Tap once to hear the line. Double tap for repeat after me. Swipe right or left for the next or previous line. Swipe up to hear it all. Press and hold for the meaning. Swipe down to go back.',
  },
  {
    key: 'lessonIntro',
    label: 'Start of a lesson',
    hi: 'दो बार छुएँ — मेरे बाद दोहराएँ। एक बार छुएँ — पहली पंक्ति सुनें।',
    en: 'Double tap for repeat after me. Tap once to hear the first line.',
  },
  { key: 'yourTurn', label: '“Your turn” (after each line)', hi: 'अब आप।', en: 'Your turn.' },
  { key: 'allTogether', label: 'Before chanting it all', hi: 'अब पूरा एक साथ।', en: 'Now all together.' },
  { key: 'wellDone', label: 'When a shloka is learned', hi: 'बहुत बढ़िया! राधारमण लाल की जय!', en: 'Well done! Radharaman Lal ki Jai!' },
  { key: 'edge', label: 'Nothing more in this direction', hi: 'यहाँ और नहीं है।', en: 'Nothing more here.' },
  { key: 'bye', label: 'Leaving Listen mode', hi: 'राधेश्याम। फिर मिलेंगे।', en: 'Radheshyam. See you soon.' },
  { key: 'col_krishna', label: 'Collection: Shri Radharaman', hi: 'श्री राधारमण', en: 'Shri Radharaman' },
  { key: 'malaDone', label: 'When a japa mala (108) is complete', hi: 'एक माला पूरी हुई! राधारमण लाल की जय!', en: 'One mala complete! Radharaman Lal ki Jai!' },
  { key: 'col_gita', label: 'Collection: Bhagavad Gita', hi: 'श्रीमद्भगवद्गीता', en: 'Bhagavad Gita' },
  { key: 'col_kids', label: 'Collection: For kids', hi: 'बच्चों के लिए', en: 'For kids' },
  { key: 'col_shloka', label: 'Collection: Shlokas', hi: 'श्लोक', en: 'Shlokas' },
  { key: 'col_mantra', label: 'Collection: Mantras', hi: 'मंत्र', en: 'Mantras' },
  { key: 'col_stotra', label: 'Collection: Stotras', hi: 'स्तोत्र', en: 'Stotras' },
  { key: 'col_bhajan', label: 'Collection: Bhajans', hi: 'भजन', en: 'Bhajans' },
  { key: 'col_aarti', label: 'Collection: Aartis', hi: 'आरती', en: 'Aartis' },
  { key: 'col_all', label: 'Collection: Everything', hi: 'सभी पाठ', en: 'Everything' },
];

/** Passage the owner reads for the voice clone: Hindi, Sanskrit and English, about 1–2 minutes. */
export const SAMPLE_PASSAGE = [
  'जय गौर! श्री राधारमणो विजयते। मेरा नाम ____ है, और यह मेरी आवाज़ है।',
  'राधारमण लाल की जय! राधेश्याम!',
  'श्रीकृष्ण कहते हैं — जो प्रेम से मुझे एक पत्ता, एक फूल, एक फल या जल अर्पित करता है, मैं उसे प्रसन्नता से स्वीकार करता हूँ।',
  'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
  'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
  'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे॥',
  'आज हम मिलकर श्लोक सीखेंगे। पहले ध्यान से सुनिए, फिर मेरे बाद दोहराइए। धीरे-धीरे, प्रेम से।',
  'Radheshyam. Today we will learn together. First listen carefully, then repeat after me, slowly and with love.',
];
