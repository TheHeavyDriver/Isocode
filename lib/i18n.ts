export type Language = "hi" | "en";

const strings = {
  en: {
    shop: "Shop",
    aiOrder: "AI order",
    orders: "Orders",
    account: "Account",
    retailer: "Retailer",
    shopkeeper: "Shopkeeper",
    yourAccount: "Your account",
    accountIntro: "Your shop details, credit line, and language preference.",
    language: "Language",
    languageHelp:
      "Hindi changes the labels and AI examples on retailer screens. Product names and the order desk stay in English.",
    english: "English",
    hindi: "हिंदी",
    saved: "Language saved.",
    profile: "Shop profile",
    credit: "Credit line",
    signOut: "Sign out",
    orderHistory: "Order history",
    pasteOrder: "Paste a WhatsApp order",
    browseShop: "Browse the catalogue",
  },
  hi: {
    shop: "दुकान",
    aiOrder: "AI ऑर्डर",
    orders: "ऑर्डर",
    account: "खाता",
    retailer: "खुदरा विक्रेता",
    shopkeeper: "दुकानदार",
    yourAccount: "आपका खाता",
    accountIntro: "आपकी दुकान की जानकारी, उधारी सीमा और भाषा।",
    language: "भाषा",
    languageHelp:
      "हिंदी से दुकानदार स्क्रीन के लेबल और AI उदाहरण बदलते हैं। उत्पाद के नाम और ऑर्डर डेस्क अंग्रेज़ी में रहते हैं।",
    english: "English",
    hindi: "हिंदी",
    saved: "भाषा सहेजी गई।",
    profile: "दुकान की जानकारी",
    credit: "उधारी सीमा",
    signOut: "साइन आउट",
    orderHistory: "ऑर्डर इतिहास",
    pasteOrder: "WhatsApp ऑर्डर पेस्ट करें",
    browseShop: "कैटलॉग देखें",
  },
} as const;

export type CopyKey = keyof (typeof strings)["en"];

export function t(language: Language, key: CopyKey): string {
  return strings[language][key];
}
