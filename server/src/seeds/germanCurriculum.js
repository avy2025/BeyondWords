/**
 * BeyondWords — German Academy Curriculum (CEFR A1)
 * Complete 10-level progressive curriculum with 5 learning stages per level:
 * 1. Learn (Concept Intro, Vocabulary Deck with phonetics & examples, Grammar Rules & Culture)
 * 2. Guided Practice (Interactive Flashcards, Sentence Builders, Pronunciation Drills)
 * 3. Practice Challenge (MCQs, Fill-in-the-blank, Matching, Dialogue Completion)
 * 4. Revision (Cheat sheet, Vocabulary Recap, Common Pitfalls, Quick-Check questions)
 * 5. Final Assessment (8+ Questions per level in Quiz collection: MCQ, Matching, Fill-in-Blank)
 */

export const germanLessons = [
  {
    stableKey: "de_lvl1",
    academy: "GERMAN",
    level: 1,
    lessonType: "THEORY",
    title: "Level 1: Begrüßungen & Grundlagen (Greetings & Fundamentals)",
    description: "Master basic greetings, farewells, polite expressions, and introduce yourself in everyday German.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 1,
    image: "/figmaAssets/container.svg",
    xpReward: 100,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Willkommen zum Deutschlernen! (Welcome to German Learning)",
          overview: "In German-speaking cultures, polite greetings set the tone for every interaction. German has both formal ('Sie') and informal ('du') registers. In business and with strangers, formal greetings are essential.",
          culturalNote: "Germans place high value on directness combined with polite address. Always greet shopkeepers when entering ('Guten Tag') and acknowledge departing guests ('Auf Wiedersehen').",
          estimatedMinutes: 20
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Begrüßungen & Höflichkeit",
          items: [
            { german: "Hallo", english: "Hello", phonetic: "HAH-loh", exampleDe: "Hallo, wie geht es dir?", exampleEn: "Hello, how are you?" },
            { german: "Guten Morgen", english: "Good morning", phonetic: "GOO-ten MOR-gen", exampleDe: "Guten Morgen, Herr Müller!", exampleEn: "Good morning, Mr. Müller!" },
            { german: "Guten Tag", english: "Good day / Hello", phonetic: "GOO-ten TAHK", exampleDe: "Guten Tag, wie kann ich helfen?", exampleEn: "Good day, how can I help?" },
            { german: "Guten Abend", english: "Good evening", phonetic: "GOO-ten AH-bent", exampleDe: "Guten Abend und herzlich willkommen.", exampleEn: "Good evening and warm welcome." },
            { german: "Gute Nacht", english: "Good night", phonetic: "GOO-tuh NAKHT", exampleDe: "Schlaf gut, gute Nacht!", exampleEn: "Sleep well, good night!" },
            { german: "Auf Wiedersehen", english: "Goodbye (formal)", phonetic: "owf VEE-der-zay-en", exampleDe: "Auf Wiedersehen, bis morgen!", exampleEn: "Goodbye, see you tomorrow!" },
            { german: "Tschüss", english: "Bye (informal)", phonetic: "CHOOSS", exampleDe: "Tschüss, mach's gut!", exampleEn: "Bye, take care!" },
            { german: "Danke", english: "Thank you", phonetic: "DAHN-kuh", exampleDe: "Danke für Ihre Unterstützung.", exampleEn: "Thank you for your support." },
            { german: "Bitte", english: "Please / You're welcome", phonetic: "BIT-tuh", exampleDe: "Eine Tasse Tee, bitte.", exampleEn: "A cup of tea, please." },
            { german: "Entschuldigung", english: "Excuse me / Sorry", phonetic: "ent-SHOOL-dee-goong", exampleDe: "Entschuldigung, sprechen Sie Englisch?", exampleEn: "Excuse me, do you speak English?" },
            { german: "Wie geht es Ihnen?", english: "How are you? (formal)", phonetic: "vee gayt es EE-nen", exampleDe: "Guten Tag, wie geht es Ihnen?", exampleEn: "Good day, how are you?" },
            { german: "Ich heiße...", english: "My name is...", phonetic: "ikh HY-suh", exampleDe: "Ich heiße Anna und komme aus Berlin.", exampleEn: "My name is Anna and I come from Berlin." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Grammatik: Substantiv-Großschreibung & Sie vs. Du",
          ruleName: "Capitalization & Address Registers",
          explanation: "Rule 1: In German, ALL nouns are capitalized (der Tag, der Morgen, der Name). Rule 2: Use 'Sie' (capitalized) with strangers and professionals; use 'du' with friends and children.",
          examples: [
            { german: "Guten Tag, Frau Schmidt, wie geht es Ihnen?", english: "Good day, Ms. Schmidt, how are you? (formal)" },
            { german: "Hallo Max, wie geht es dir?", english: "Hello Max, how are you? (informal)" }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "Guten Morgen", back: "Good morning", hint: "Used until midday" },
            { front: "Auf Wiedersehen", back: "Goodbye (formal)", hint: "Literally 'until we see each other again'" },
            { front: "Danke schön", back: "Thank you very much", hint: "Common polite intensifier" },
            { front: "Wie heißen Sie?", back: "What is your name? (formal)", hint: "Uses the verb 'heißen'" }
          ],
          sentenceBuilders: [
            { prompt: "Assemble: 'Hello, my name is Lukas.'", segments: ["Hallo,", "ich", "heiße", "Lukas."], correctOrder: [0, 1, 2, 3] },
            { prompt: "Assemble: 'Good day, how are you?' (formal)", segments: ["Guten Tag,", "wie", "geht", "es", "Ihnen?"], correctOrder: [0, 1, 2, 3, 4] }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "Which greeting is suitable when leaving a formal business meeting?",
              options: ["Tschüss", "Auf Wiedersehen", "Gute Nacht", "Hallo"],
              answer: 1,
              explanation: "'Auf Wiedersehen' is the correct polite farewell for formal and professional contexts."
            },
            {
              type: "FILL_BLANK",
              prompt: "Complete the formal address: 'Guten Tag, wie geht es _____?'",
              answer: "Ihnen",
              explanation: "'Ihnen' is the formal dative pronoun used in 'wie geht es Ihnen?'"
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Capitalization", rule: "ALL nouns are capitalized in German, regardless of position." },
            { concept: "Formal Greeting", rule: "'Guten Tag' is universally safe; 'Auf Wiedersehen' for leaving." },
            { concept: "Informal Greeting", rule: "'Hallo' and 'Tschüss' are used with peers, friends, and family." }
          ],
          commonPitfalls: [
            "Writing nouns in lower case (e.g. 'guten tag' instead of 'Guten Tag').",
            "Confusing 'Gute Nacht' (bedtime farewell) with 'Guten Abend' (evening greeting)."
          ],
          quickCheckQuestions: [
            "How do you introduce yourself? (Ich heiße [Name])",
            "What is the difference between 'Guten Abend' and 'Gute Nacht'?"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl2",
    academy: "GERMAN",
    level: 2,
    lessonType: "THEORY",
    title: "Level 2: Das Deutsche Alphabet & Aussprache (Alphabet & Phonetics)",
    description: "Master the 26 letters, the three Umlauts (ä, ö, ü), the Eszett (ß), diphthongs, and German phonology.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 2,
    image: "/figmaAssets/container-7.svg",
    xpReward: 110,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Das Deutsche Alphabet (The German Alphabet)",
          overview: "German shares the 26 Latin letters with English, plus four unique characters: Ä (ä), Ö (ö), Ü (ü), and ß (Eszett / sharp S). German is mostly phonetic: words are spoken as written.",
          culturalNote: "The Eszett (ß) is unique to standard German in Germany and Austria; in Switzerland and Liechtenstein, 'ss' is always used instead.",
          estimatedMinutes: 20
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Phonetik & Buchstabieren",
          items: [
            { german: "das Alphabet", english: "the alphabet", phonetic: "dahs ahl-fah-BEHT", exampleDe: "Das deutsche Alphabet hat 26 Buchstaben und 4 Sonderzeichen.", exampleEn: "The German alphabet has 26 letters and 4 special characters." },
            { german: "der Buchstabe", english: "the letter", phonetic: "dehr BOOKH-shta-buh", exampleDe: "Welcher Buchstabe ist das?", exampleEn: "Which letter is that?" },
            { german: "der Umlaut", english: "the umlaut", phonetic: "dehr OOM-lowt", exampleDe: "Ä, Ö und Ü sind Umlaute.", exampleEn: "Ä, Ö and Ü are umlauts." },
            { german: "schön", english: "beautiful", phonetic: "shurn", exampleDe: "Das Wetter ist sehr schön heute.", exampleEn: "The weather is very beautiful today." },
            { german: "spät", english: "late", phonetic: "shpayt", exampleDe: "Es ist schon spät.", exampleEn: "It is already late." },
            { german: "für", english: "for", phonetic: "feer", exampleDe: "Das Geschenk ist für dich.", exampleEn: "The gift is for you." },
            { german: "weiß", english: "white", phonetic: "vyce", exampleDe: "Das Papier ist weiß.", exampleEn: "The paper is white." },
            { german: "die Straße", english: "the street", phonetic: "dee SHTRAH-suh", exampleDe: "Wir wohnen in dieser Straße.", exampleEn: "We live in this street." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Ausspracheregeln: Diphthonge & Umlaute",
          ruleName: "Phonetic Pairs & Pronunciation",
          explanation: "'ei' is pronounced like English 'eye' (Mein, nein). 'ie' is pronounced like English 'ee' (Sie, wieder). 'eu' and 'äu' are pronounced like 'oy' (heute, Häuser). 'W' is pronounced like English 'V'.",
          examples: [
            { german: "Wein (wine) vs. Wien (Vienna)", english: "Wein sounds like 'vine'; Wien sounds like 'veen'." },
            { german: "Mädchen (girl)", english: "The 'ä' sounds like 'eh' in 'bed'." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "ei", back: "Pronounced 'eye' (like in 'kite')", hint: "Example: Nein, mein" },
            { front: "ie", back: "Pronounced 'ee' (like in 'see')", hint: "Example: Sie, Bier" },
            { front: "eu / äu", back: "Pronounced 'oy' (like in 'boy')", hint: "Example: heute, Bäume" },
            { front: "W", back: "Pronounced 'V'", hint: "Example: Wasser, wo" }
          ],
          sentenceBuilders: [
            { prompt: "Spell the word: W-E-I-ß", segments: ["W", "E", "I", "ß"], correctOrder: [0, 1, 2, 3] }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "How is the German letter combination 'ei' pronounced in 'nein'?",
              options: ["Like 'ee' in see", "Like 'eye' in my", "Like 'ay' in say", "Like 'oo' in boot"],
              answer: 1,
              explanation: "In German, 'ei' is pronounced as the diphthong /aɪ/, rhyming with 'eye'."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "ei vs ie", rule: "'ei' = eye, 'ie' = ee." },
            { concept: "Umlaute", rule: "Ä = eh, Ö = round lips + say 'ay', Ü = round lips + say 'ee'." },
            { concept: "Eszett (ß)", rule: "Sharp unvoiced 's' sound used after long vowels and diphthongs." }
          ],
          commonPitfalls: [
            "Confusing 'ei' and 'ie'. Remember: pronounce the SECOND letter in English terms!",
            "Treating 'w' like English 'w' instead of the German 'v' sound."
          ],
          quickCheckQuestions: [
            "Which sound does 'sp' make at the beginning of a word? (pronounced 'shp')",
            "What is the difference between 'Wein' and 'Wien'?"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl3",
    academy: "GERMAN",
    level: 3,
    lessonType: "THEORY",
    title: "Level 3: Zahlen, Zeit & Kalender (Numbers, Time & Dates)",
    description: "Learn to count 0-100, tell time officially and informally, and navigate days, months, and calendar dates.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 3,
    image: "/figmaAssets/container-5.svg",
    xpReward: 120,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Zahlen und Zeitangaben (Numbers and Time)",
          overview: "In German, numbers above 20 state the ones digit first followed by the tens: 'einundzwanzig' (one-and-twenty = 21). Time can be expressed formally (24-hour clock) or casually.",
          culturalNote: "Punctuality (Pünktlichkeit) is deeply respected in the DACH region. Arriving 5 minutes early is considered on time.",
          estimatedMinutes: 20
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Zahlen & Wochentage",
          items: [
            { german: "null, eins, zwei, drei", english: "0, 1, 2, 3", phonetic: "nool, yns, tsvy, dry", exampleDe: "Ich habe zwei Brüder.", exampleEn: "I have two brothers." },
            { german: "vier, fünf, sechs, sieben", english: "4, 5, 6, 7", phonetic: "feer, feonf, zeks, ZEE-ben", exampleDe: "Es ist fünf Uhr.", exampleEn: "It is five o'clock." },
            { german: "acht, neun, zehn", english: "8, 9, 10", phonetic: "akht, noyn, tsehn", exampleDe: "Zehn Minuten Pause.", exampleEn: "Ten minutes break." },
            { german: "zwanzig, dreißig, hundert", english: "20, 30, 100", phonetic: "TSVAN-tsikh, DRY-sikh, HOON-dert", exampleDe: "Das Buch kostet zwanzig Euro.", exampleEn: "The book costs twenty euros." },
            { german: "die Uhrzeit", english: "the time", phonetic: "dee OOR-tsyt", exampleDe: "Wie viel Uhr ist es?", exampleEn: "What time is it?" },
            { german: "Montag, Dienstag, Mittwoch", english: "Monday, Tuesday, Wednesday", phonetic: "MOHN-tahk, DEENS-tahk, MIT-vokh", exampleDe: "Am Montag arbeite ich.", exampleEn: "On Monday I work." },
            { german: "Donnerstag, Freitag", english: "Thursday, Friday", phonetic: "DON-ners-tahk, FRY-tahk", exampleDe: "Freitag ist der letzte Arbeitstag.", exampleEn: "Friday is the last working day." },
            { german: "Samstag, Sonntag", english: "Saturday, Sunday", phonetic: "ZAHMS-tahk, ZON-tahk", exampleDe: "Am Wochenende ist Samstag und Sonntag.", exampleEn: "On the weekend is Saturday and Sunday." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Uhrzeit & Temporale Präpositionen",
          ruleName: "Telling Time with 'um' and Days with 'am'",
          explanation: "Use 'um' for exact times: 'Um 8 Uhr' (At 8 o'clock). Use 'am' for days and parts of the day: 'Am Montag' (On Monday), 'Am Morgen' (In the morning). Note: 'in der Nacht' is an exception.",
          examples: [
            { german: "Der Zug fährt um 14:30 Uhr ab.", english: "The train departs at 2:30 PM." },
            { german: "Am Samstag habe ich frei.", english: "On Saturday I am off." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "Wie viel Uhr ist es?", back: "What time is it?", hint: "Common conversational question" },
            { front: "Halb vier (3:30)", back: "Half four (meaning half past three!)", hint: "Warning: 'halb vier' means half until four = 3:30" },
            { front: "Viertel nach acht", back: "Quarter past eight (8:15)", hint: "'nach' means after / past" },
            { front: "Viertel vor neun", back: "Quarter to nine (8:45)", hint: "'vor' means before / to" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "What does 'halb fünf' mean in German time-telling?",
              options: ["5:30", "4:30", "5:15", "4:45"],
              answer: 1,
              explanation: "'Halb fünf' means halfway towards 5:00, which is 4:30."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Two-digit numbers", rule: "Ones before tens: 24 = vierundzwanzig (four-and-twenty)." },
            { concept: "Halb [X]", rule: "Means halfway to X: 'halb drei' is 2:30, NOT 3:30." },
            { concept: "Days Preposition", rule: "Always use 'am' with days: am Montag, am Wochenende." }
          ],
          commonPitfalls: [
            "Saying 'um Montag' instead of 'am Montag'.",
            "Translating 'half four' as 4:30; in German 'halb vier' is 3:30."
          ],
          quickCheckQuestions: [
            "How do you say 25 in German? (fünfundzwanzig)",
            "What preposition is used with clock times? (um)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl4",
    academy: "GERMAN",
    level: 4,
    lessonType: "THEORY",
    title: "Level 4: Substantive, Artikel & Plural (Nouns, Genders & Plurals)",
    description: "Understand the three grammatical genders (der, die, das), indefinite and negative articles, and plural formations.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 4,
    image: "/figmaAssets/container.svg",
    xpReward: 130,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Das grammatische Geschlecht (Grammatical Gender)",
          overview: "Every German noun has a grammatical gender: Masculine (der), Feminine (die), or Neuter (das). Gender is grammatical, not biological: a table is masculine (der Tisch), a door is feminine (die Tür), a window is neuter (das Fenster).",
          culturalNote: "Always memorize every German noun together with its article and plural form. Never learn just 'Buch', always learn 'das Buch, die Bücher'.",
          estimatedMinutes: 25
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Gegenstände & Artikel",
          items: [
            { german: "der Tisch (-e)", english: "the table", phonetic: "dehr TISH", exampleDe: "Der Tisch ist aus Holz.", exampleEn: "The table is made of wood." },
            { german: "der Mann (-..er)", english: "the man", phonetic: "dehr MAHN", exampleDe: "Der Mann liest eine Zeitung.", exampleEn: "The man reads a newspaper." },
            { german: "die Frau (-en)", english: "the woman", phonetic: "dee FROW", exampleDe: "Die Frau arbeitet im Büro.", exampleEn: "The woman works in the office." },
            { german: "die Lampe (-n)", english: "the lamp", phonetic: "dee LAHM-puh", exampleDe: "Die Lampe ist sehr hell.", exampleEn: "The lamp is very bright." },
            { german: "das Buch (-..er)", english: "the book", phonetic: "dahs BOOKH", exampleDe: "Das Buch ist spannend.", exampleEn: "The book is exciting." },
            { german: "das Kind (-er)", english: "the child", phonetic: "dahs KINT", exampleDe: "Das Kind spielt im Park.", exampleEn: "The child plays in the park." },
            { german: "ein / eine / ein", english: "a / an (m/f/n)", phonetic: "yn, Y-nuh, yn", exampleDe: "Ein Tisch, eine Lampe, ein Buch.", exampleEn: "A table, a lamp, a book." },
            { german: "kein / keine / kein", english: "no / not a (m/f/n)", phonetic: "kyn, KY-nuh, kyn", exampleDe: "Das ist kein Problem.", exampleEn: "That is no problem." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Artikel-Übersicht & Endungsregeln",
          ruleName: "Gender Clues & Plural Forms",
          explanation: "Nouns ending in -ung, -heit, -keit, -schaft, -ei, -tät are always DIE (feminine). Nouns ending in -chen, -lein, -ment, -um are always DAS (neuter). In the plural, the definite article for ALL genders is DIE.",
          examples: [
            { german: "die Zeitung, die Freiheit, die Möglichkeit", english: "All feminine due to suffixes." },
            { german: "das Mädchen, das Fräulein", english: "All neuter due to diminutive suffix -chen / -lein." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "der Apfel -> die Äpfel", back: "Apple -> Apples (plural with umlaut)", hint: "Masculine noun" },
            { front: "das Kind -> die Kinder", back: "Child -> Children (-er plural)", hint: "Neuter noun" },
            { front: "die Frau -> die Frauen", back: "Woman -> Women (-en plural)", hint: "Feminine noun" },
            { front: "das Auto -> die Autos", back: "Car -> Cars (-s plural for loan words)", hint: "Neuter noun" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "Which article belongs to 'Zeitung' (newspaper)?",
              options: ["der", "die", "das", "den"],
              answer: 1,
              explanation: "Nouns ending in '-ung' are always feminine ('die Zeitung')."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Three Genders", rule: "der (masculine), die (feminine), das (neuter)." },
            { concept: "Plural Article", rule: "In nominative, ALL plural nouns take the article 'die'." },
            { concept: "Negation", rule: "Use 'kein/keine' to negate nouns with indefinite or zero articles." }
          ],
          commonPitfalls: [
            "Using 'nicht' instead of 'kein' to negate nouns (e.g., 'Ich habe nicht Auto' is wrong; 'Ich habe kein Auto' is correct).",
            "Assuming natural gender equals grammatical gender (e.g., 'das Mädchen' is grammatically neuter!)."
          ],
          quickCheckQuestions: [
            "What article do all plural nouns take in the nominative? (die)",
            "What is the negative form for 'ein Buch'? (kein Buch)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl5",
    academy: "GERMAN",
    level: 5,
    lessonType: "THEORY",
    title: "Level 5: Wesentliche Verben & Konjugation (Essential Verbs & Present Tense)",
    description: "Conjugate regular -en verbs, irregular verbs 'sein' (to be) and 'haben' (to have), and verbs with stem-vowel changes.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 5,
    image: "/figmaAssets/container-7.svg",
    xpReward: 140,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Verben im Präsens (Verbs in the Present Tense)",
          overview: "In German, the verb changes its ending according to the subject pronoun. Regular verbs drop the infinitive '-en' and add standard personal endings: -e, -st, -t, -en, -t, -en.",
          culturalNote: "German does not have a continuous present ('I am doing'). 'Ich lerne' means both 'I learn' and 'I am learning'.",
          estimatedMinutes: 25
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Grundverben",
          items: [
            { german: "sein (ich bin, du bist, er ist)", english: "to be", phonetic: "zyn", exampleDe: "Ich bin Student.", exampleEn: "I am a student." },
            { german: "haben (ich habe, du hast, er hat)", english: "to have", phonetic: "HAH-ben", exampleDe: "Wir haben viel Zeit.", exampleEn: "We have plenty of time." },
            { german: "kommen (ich komme, du kommst)", english: "to come", phonetic: "KOM-men", exampleDe: "Woher kommst du?", exampleEn: "Where do you come from?" },
            { german: "wohnen (ich wohne, du wohnst)", english: "to live / reside", phonetic: "VOH-nen", exampleDe: "Sie wohnt in München.", exampleEn: "She lives in Munich." },
            { german: "arbeiten (ich arbeite, du arbeitest)", english: "to work", phonetic: "AR-by-ten", exampleDe: "Er arbeitet als Ingenieur.", exampleEn: "He works as an engineer." },
            { german: "lernen (ich lerne, du lernst)", english: "to learn / study", phonetic: "LER-nen", exampleDe: "Wir lernen Deutsch.", exampleEn: "We are learning German." },
            { german: "sprechen (du sprichst, er spricht)", english: "to speak", phonetic: "SHPREKH-en", exampleDe: "Sprichst du Deutsch?", exampleEn: "Do you speak German?" }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Konjugationsschema für regelmäßige Verben",
          ruleName: "Standard Verb Endings",
          explanation: "ich -e | du -st | er/sie/es -t | wir -en | ihr -t | sie/Sie -en. Verbs with stems in -t or -d (arbeiten) insert an -e- before endings for pronunciation: du arbeitest, er arbeitet.",
          examples: [
            { german: "Ich lerne Deutsch, du lernst Spanisch.", english: "I learn German, you learn Spanish." },
            { german: "Wir sind hier, ihr seid dort.", english: "We are here, you all are there." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "ich bin, du bist, er/sie/es ist", back: "I am, you are, he/she/it is", hint: "Forms of 'sein'" },
            { front: "ich habe, du hast, er/sie/es hat", back: "I have, you have, he/she/it has", hint: "Forms of 'haben'" },
            { front: "du sprichst", back: "you speak (stem vowel changes e -> i)", hint: "Irregular in du and er/sie/es" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "What is the correct form: 'Woher _____ du?'",
              options: ["komme", "kommst", "kommt", "kommen"],
              answer: 1,
              explanation: "The pronoun 'du' takes the ending '-st': 'kommst'."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Endings", rule: "ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en." },
            { concept: "sein", rule: "bin, bist, ist, sind, seid, sind." },
            { concept: "haben", rule: "habe, hast, hat, haben, habt, haben." }
          ],
          commonPitfalls: [
            "Forgetting the stem vowel change in 'sprechen' (du sprichst, NOT du sprechst).",
            "Confusing 'seid' (ihr seid = you all are) with 'seit' (since)."
          ],
          quickCheckQuestions: [
            "Conjugate 'haben' for 'du'. (du hast)",
            "What is the form of 'sein' for 'wir'? (wir sind)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl6",
    academy: "GERMAN",
    level: 6,
    lessonType: "THEORY",
    title: "Level 6: Satzbau & Fragestellung (Sentence Structure & Questions)",
    description: "Master Verb-Second (V2) word order in main clauses, Yes/No questions, and W-question words.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 6,
    image: "/figmaAssets/container-5.svg",
    xpReward: 150,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Die goldene Regel: Verb an Position 2",
          overview: "In standard German declarative sentences, the conjugated verb ALWAYS occupies Position 2. If an adverb or prepositional phrase starts the sentence, the subject flips to Position 3 (inversion).",
          culturalNote: "German sentence structure is logical and predictable like clockwork. Once you master the V2 rule, you will never get sentence order wrong.",
          estimatedMinutes: 20
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: W-Fragen & Zeitadverbien",
          items: [
            { german: "wer", english: "who", phonetic: "vehr", exampleDe: "Wer ist das?", exampleEn: "Who is that?" },
            { german: "was", english: "what", phonetic: "vahs", exampleDe: "Was machst du heute?", exampleEn: "What are you doing today?" },
            { german: "wo", english: "where (location)", phonetic: "voh", exampleDe: "Wo wohnst du?", exampleEn: "Where do you live?" },
            { german: "woher", english: "where from (origin)", phonetic: "voh-HEHR", exampleDe: "Woher kommen Sie?", exampleEn: "Where do you come from?" },
            { german: "wohin", english: "where to (destination)", phonetic: "voh-HIN", exampleDe: "Wohin gehst du?", exampleEn: "Where are you going?" },
            { german: "wann", english: "when", phonetic: "vahn", exampleDe: "Wann beginnt der Kurs?", exampleEn: "When does the course begin?" },
            { german: "warum", english: "why", phonetic: "vah-ROOM", exampleDe: "Warum lernst du Deutsch?", exampleEn: "Why are you learning German?" },
            { german: "wie", english: "how", phonetic: "vee", exampleDe: "Wie heißt du?", exampleEn: "What is your name?" }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "V2-Regel & Inversion",
          ruleName: "Verb Position & Inversion",
          explanation: "1. Declarative: [Element 1] + [Verb] + [Subject if inverted] + [Rest]. Example: 'Heute [1] lerne [2] ich [3] Deutsch'. 2. Yes/No Questions: The verb is in Position 1: 'Kommst du aus Deutschland?'.",
          examples: [
            { german: "Ich trinke gern Kaffee. / Gern trinke ich Kaffee.", english: "Both mean 'I like drinking coffee'; verb stays in position 2." },
            { german: "Kommst du morgen? - Ja, ich komme morgen.", english: "Yes/No question puts verb first." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "Woher", back: "Where from", hint: "Pairs with 'kommen aus'" },
            { front: "Wohin", back: "Where to", hint: "Pairs with 'gehen nach / in'" },
            { front: "Verb Position 2", back: "Always second in statements", hint: "Subject moves to position 3 if position 1 is filled" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "Choose the correct sentence starting with 'Heute':",
              options: [
                "Heute ich gehe ins Kino.",
                "Heute gehe ich ins Kino.",
                "Heute ins Kino ich gehe.",
                "Gehe heute ich ins Kino."
              ],
              answer: 1,
              explanation: "Position 1 is 'Heute', Position 2 MUST be the verb 'gehe', followed by subject 'ich'."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "V2 Rule", rule: "The conjugated verb is ALWAYS in the second position of a statement." },
            { concept: "Yes/No Question", rule: "The verb takes Position 1: 'Trinkst du Tee?'." },
            { concept: "W-Questions", rule: "W-word in Position 1, verb in Position 2: 'Wo wohnst du?'." }
          ],
          commonPitfalls: [
            "Keeping subject before verb when starting with an adverb (*Heute ich arbeite* is WRONG -> Heute arbeite ich).",
            "Confusing 'wo' (stationary where) and 'wohin' (directional where to)."
          ],
          quickCheckQuestions: [
            "Where does the verb go in a German statement? (Position 2)",
            "What word order do Yes/No questions follow? (Verb first)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl7",
    academy: "GERMAN",
    level: 7,
    lessonType: "THEORY",
    title: "Level 7: Alltagssituationen & Gastronomie (Everyday Situations & Ordering)",
    description: "Order food and drinks, ask for the bill, inquire about prices, and navigate public spaces and directions.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 7,
    image: "/figmaAssets/container.svg",
    xpReward: 160,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Im Restaurant und Café (At the Restaurant and Café)",
          overview: "When dining out in Germany, Austria, or Switzerland, you will typically seat yourself unless a sign says otherwise. To get the bill, ask the server 'Zahlen, bitte!' or 'Die Rechnung, bitte!'.",
          culturalNote: "Tipping (Trinkgeld) in Germany is typically rounded up to the nearest euro or about 5-10%. State the total you want to pay when handing over cash.",
          estimatedMinutes: 20
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Gastronomie & Wegbeschreibung",
          items: [
            { german: "die Speisekarte", english: "the menu", phonetic: "dee SHPY-zuh-kar-tuh", exampleDe: "Können wir bitte die Speisekarte haben?", exampleEn: "Could we please have the menu?" },
            { german: "der Kaffee / der Tee", english: "the coffee / the tea", phonetic: "dehr KAH-fay / dehr TAY", exampleDe: "Ich möchte einen Kaffee mit Milch.", exampleEn: "I would like a coffee with milk." },
            { german: "das Wasser", english: "the water", phonetic: "dahs VAH-ser", exampleDe: "Ein Glas Wasser mit Kohlensäure, bitte.", exampleEn: "A glass of sparkling water, please." },
            { german: "die Rechnung / Zahlen, bitte", english: "the bill / Pay, please", phonetic: "dee REKH-noong / TSAH-len BIT-tuh", exampleDe: "Wir möchten zahlen, bitte.", exampleEn: "We would like to pay, please." },
            { german: "bestellen", english: "to order", phonetic: "buh-SHTEL-len", exampleDe: "Was möchten Sie bestellen?", exampleEn: "What would you like to order?" },
            { german: "kosten", english: "to cost", phonetic: "KOS-ten", exampleDe: "Was kostet das Schnitzel?", exampleEn: "How much does the schnitzel cost?" },
            { german: "geradeaus, links, rechts", english: "straight ahead, left, right", phonetic: "guh-RAH-duh-ows, links, rekhts", exampleDe: "Gehen Sie geradeaus und dann links.", exampleEn: "Go straight ahead and then left." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Höfliche Bitte mit 'möchte' & Einführung Akkusativ",
          ruleName: "Polite Requests & Accusative Masculine",
          explanation: "Use 'Ich möchte...' (I would like...) for polite ordering. In the accusative case (direct object), masculine articles change: der -> den, ein -> einen ('Ich möchte EINEN Kaffee'). Feminine and neuter remain unchanged ('eine Pizza', 'ein Wasser').",
          examples: [
            { german: "Ich möchte einen Apfelsaft, bitte.", english: "I would like an apple juice, please (accusative masculine)." },
            { german: "Zusammen oder getrennt? - Getrennt, bitte.", english: "Together or separate? - Separate, please." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "Ich möchte...", back: "I would like...", hint: "Polite form used in ordering" },
            { front: "Zahlen, bitte!", back: "The bill, please!", hint: "Literally 'Pay, please'" },
            { front: "den Kaffee (Akkusativ)", back: "the coffee (masculine direct object)", hint: "der changes to den" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "How do you politely order a tea (der Tee)?",
              options: [
                "Ich möchte einen Tee, bitte.",
                "Ich möchte ein Tee, bitte.",
                "Ich möchte eine Tee, bitte.",
                "Ich Tee trinke jetzt."
              ],
              answer: 0,
              explanation: "'Tee' is masculine, so in accusative direct object it becomes 'einen Tee'."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Polite Ordering", rule: "'Ich möchte [Akkusativ] + bitte'." },
            { concept: "Accusative Masculine", rule: "der -> den, ein -> einen, kein -> keinen." },
            { concept: "Asking for the Bill", rule: "'Zahlen, bitte!' or 'Die Rechnung, bitte!'." }
          ],
          commonPitfalls: [
            "Saying 'Ich will...' (too blunt) instead of 'Ich möchte...' in cafes.",
            "Forgetting that masculine nouns change to 'einen' in direct object position."
          ],
          quickCheckQuestions: [
            "What happens to 'der' in the accusative case? (It becomes 'den')",
            "How do you ask 'How much does that cost?' (Was kostet das?)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl8",
    academy: "GERMAN",
    level: 8,
    lessonType: "THEORY",
    title: "Level 8: Familie, Wohnen & Beschreibungen (Family, Home & Descriptions)",
    description: "Describe family members, home spaces, and personal traits using possessive pronouns and predicate adjectives.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 8,
    image: "/figmaAssets/container-7.svg",
    xpReward: 170,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Meine Familie und mein Zuhause (My Family and My Home)",
          overview: "Talking about your family and where you live is a staple of A1 conversation. In this level, you learn possessive pronouns (my, your, his, her) and how to describe things with adjectives.",
          culturalNote: "In German-speaking countries, apartments are often described by total rooms (Zimmer) excluding kitchen and bathroom. A '3-Zimmer-Wohnung' usually has 2 bedrooms and 1 living room.",
          estimatedMinutes: 20
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Familie, Wohnung & Adjektive",
          items: [
            { german: "der Vater / die Mutter", english: "the father / the mother", phonetic: "dehr FAH-ter / dee MOO-ter", exampleDe: "Mein Vater heißt Thomas.", exampleEn: "My father is called Thomas." },
            { german: "die Eltern (pl.)", english: "the parents", phonetic: "dee EL-tern", exampleDe: "Meine Eltern wohnen in Hamburg.", exampleEn: "My parents live in Hamburg." },
            { german: "der Bruder / die Schwester", english: "the brother / the sister", phonetic: "dehr BROO-der / dee SHVES-ter", exampleDe: "Ich habe einen Bruder und zwei Schwestern.", exampleEn: "I have one brother and two sisters." },
            { german: "das Haus / die Wohnung", english: "the house / the apartment", phonetic: "dahs HOWS / dee VOH-noong", exampleDe: "Unsere Wohnung hat drei Zimmer.", exampleEn: "Our apartment has three rooms." },
            { german: "groß / klein", english: "big / small", phonetic: "grohs / klyn", exampleDe: "Die Küche ist klein, aber gemütlich.", exampleEn: "The kitchen is small, but cozy." },
            { german: "alt / neu", english: "old / new", phonetic: "ahlt / noy", exampleDe: "Das Gebäude ist sehr alt.", exampleEn: "The building is very old." },
            { german: "schön / hell", english: "beautiful / bright", phonetic: "shurn / hel", exampleDe: "Das Wohnzimmer ist hell und schön.", exampleEn: "The living room is bright and beautiful." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Possessivpronomen & Prädikative Adjektive",
          ruleName: "Possessives in Nominative",
          explanation: "Masculine & Neuter: mein Vater, mein Kind (no ending). Feminine & Plural: meine Mutter, meine Eltern (add -e). Same pattern for dein/deine (your), sein/seine (his), ihr/ihre (her). Predicate adjectives after 'sein' take NO endings: 'Das Zimmer ist groß'.",
          examples: [
            { german: "Das ist mein Bruder und das ist meine Schwester.", english: "This is my brother (masculine, mein) and this is my sister (feminine, meine)." },
            { german: "Die Wohnung ist alt, aber die Möbel sind neu.", english: "Adjectives 'alt' and 'neu' take no endings after 'ist/sind'." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "mein / meine", back: "my (m,n / f,pl)", hint: "Adds -e for feminine and plural" },
            { front: "dein / deine", back: "your (informal)", hint: "Same pattern as mein" },
            { front: "sein / ihr", back: "his / her", hint: "sein = his, ihr = her" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "Fill in the blank: 'Das ist _____ Mutter.' (my)",
              options: ["mein", "meine", "meinen", "meinem"],
              answer: 1,
              explanation: "'Mutter' is feminine, so the possessive pronoun takes an '-e': 'meine'."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Possessive -e", rule: "Add '-e' to mein, dein, sein, ihr when the noun is feminine or plural." },
            { concept: "Predicate Adjectives", rule: "Adjectives that follow 'sein' (is/are) do NOT take case endings." }
          ],
          commonPitfalls: [
            "Adding endings to adjectives after 'sein' (*Das Zimmer ist großes* is WRONG -> Das Zimmer ist groß).",
            "Confusing 'sein' (his) with the verb 'sein' (to be)."
          ],
          quickCheckQuestions: [
            "How do you say 'my sister'? (meine Schwester)",
            "Do adjectives take endings after 'sein'? (No)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl9",
    academy: "GERMAN",
    level: 9,
    lessonType: "THEORY",
    title: "Level 9: Tagesablauf & Modalverben (Daily Routine & Modal Verbs)",
    description: "Talk about daily habits, conjugate modal verbs (können, müssen, wollen), and master separable prefix verbs.",
    category: "THEORY",
    language: "German",
    difficulty: "Apprentice",
    order: 9,
    image: "/figmaAssets/container-5.svg",
    xpReward: 180,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Modalverben und Trennbare Verben (Modals and Separable Verbs)",
          overview: "Modal verbs express ability (können), necessity (müssen), or intention (wollen). Separable prefix verbs (like aufstehen - to get up) split in present tense: the prefix goes to the very end of the clause!",
          culturalNote: "The German 'Satzklammer' (sentence bracket) requires learners to hold their thought until the end of the sentence where the prefix or infinitive lands.",
          estimatedMinutes: 25
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Tagesablauf & Modalverben",
          items: [
            { german: "aufstehen (steht auf)", english: "to get up", phonetic: "OWF-shtay-en", exampleDe: "Ich stehe jeden Tag um 7 Uhr auf.", exampleEn: "I get up every day at 7 o'clock." },
            { german: "einkaufen (kauft ein)", english: "to shop", phonetic: "YN-kow-fen", exampleDe: "Wir kaufen im Supermarkt ein.", exampleEn: "We shop in the supermarket." },
            { german: "anfangen (fängt an)", english: "to begin / start", phonetic: "AHN-fahng-en", exampleDe: "Der Film fängt um 20 Uhr an.", exampleEn: "The film starts at 8 PM." },
            { german: "anrufen (ruft an)", english: "to call on the phone", phonetic: "AHN-roo-fen", exampleDe: "Ich rufe dich morgen an.", exampleEn: "I will call you tomorrow." },
            { german: "können (kann, kannst, kann)", english: "can / to be able to", phonetic: "KEON-nen", exampleDe: "Ich kann Deutsch sprechen.", exampleEn: "I can speak German." },
            { german: "müssen (muss, musst, muss)", english: "must / to have to", phonetic: "MEOS-sen", exampleDe: "Er muss heute lange arbeiten.", exampleEn: "He has to work late today." },
            { german: "wollen (will, willst, will)", english: "to want to", phonetic: "VOL-len", exampleDe: "Wir wollen am Wochenende wandern.", exampleEn: "We want to hike on the weekend." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Die Satzklammer (The Sentence Bracket)",
          ruleName: "Modal Verbs & Separable Prefixes",
          explanation: "1. Modal Verbs: Conjugated modal in Position 2; full infinitive at the END of the clause. Example: 'Ich MUSS heute Deutsch LERNEN'. 2. Separable Verbs: Conjugated stem in Position 2; separable prefix at the very END. Example: 'Ich STEHE um 6 Uhr AUF'.",
          examples: [
            { german: "Ich kann sehr gut schwimmen.", english: "Conjugated 'kann' at pos 2, infinitive 'schwimmen' at end." },
            { german: "Er kauft heute Abend im Supermarkt ein.", english: "Stem 'kauft' at pos 2, prefix 'ein' at the end." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "können (ich kann, er kann)", back: "can / ability", hint: "No ending for ich and er/sie/es in modals!" },
            { front: "müssen (ich muss, er muss)", back: "must / necessity", hint: "Vowel changes from ü to u" },
            { front: "aufstehen -> Ich stehe ... auf", back: "Prefix 'auf' moves to sentence end", hint: "Separable prefix rule" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "Where does the separable prefix 'ab' go in 'abfahren' (to depart)?",
              options: [
                "At the very end of the main clause",
                "Directly after the verb stem",
                "At the beginning of the sentence",
                "It stays attached to the verb"
              ],
              answer: 0,
              explanation: "In a present tense main clause, separable prefixes always move to the very end."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Sentence Bracket", rule: "Modal in pos 2 -> Infinitive at the end. Separable verb in pos 2 -> Prefix at the end." },
            { concept: "Modal Conjugation", rule: "ich and er/sie/es have the SAME form with NO ending (ich kann, er kann)." }
          ],
          commonPitfalls: [
            "Adding an '-e' or '-t' to ich/er forms of modals (*er musst* is wrong -> er muss).",
            "Leaving the separable prefix attached in main clauses (*Ich aufstehe* is wrong -> Ich stehe auf)."
          ],
          quickCheckQuestions: [
            "Conjugate 'können' for 'er'. (er kann)",
            "Where does the second verb go when using a modal? (At the end of the sentence in infinitive form)"
          ]
        }
      }
    ]
  },
  {
    stableKey: "de_lvl10",
    academy: "GERMAN",
    level: 10,
    lessonType: "THEORY",
    title: "Level 10: A1 Meilenstein & Perfekt Einführung (A1 Milestone & Past Tense)",
    description: "Synthesize all A1 foundations, learn the conversational past tense (das Perfekt) with haben/sein, and complete your CEFR A1 milestone.",
    category: "MASTERY",
    language: "German",
    difficulty: "Apprentice",
    order: 10,
    image: "/figmaAssets/container.svg",
    xpReward: 200,
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: {
          stage: "LEARN",
          title: "Das Perfekt: Vergangenheit im Gespräch",
          overview: "In spoken German, the Perfekt tense is used for nearly all past events. It is formed using a helping verb ('haben' or 'sein') in position 2, and the past participle (Partizip II) at the very end.",
          culturalNote: "Congratulations on reaching Level 10! Completing this level solidifies your CEFR A1 foundation, allowing you to handle basic travel, introductions, and everyday life in Germany, Austria, and Switzerland.",
          estimatedMinutes: 30
        }
      },
      {
        type: "VOCABULARY_DECK",
        data: {
          stage: "LEARN",
          title: "Wortschatz: Partizip II & Zeitausdrücke",
          items: [
            { german: "gestern / früher", english: "yesterday / earlier", phonetic: "GES-tern / FREW-er", exampleDe: "Gestern habe ich gearbeitet.", exampleEn: "Yesterday I worked." },
            { german: "lernen -> gelernt (haben)", english: "to learn -> learned", phonetic: "guh-LERNT", exampleDe: "Ich habe viel Deutsch gelernt.", exampleEn: "I have learned a lot of German." },
            { german: "machen -> gemacht (haben)", english: "to do/make -> done/made", phonetic: "guh-MAKHT", exampleDe: "Was hast du am Wochenende gemacht?", exampleEn: "What did you do on the weekend?" },
            { german: "kaufen -> gekauft (haben)", english: "to buy -> bought", phonetic: "guh-KOWFT", exampleDe: "Sie hat ein neues Buch gekauft.", exampleEn: "She bought a new book." },
            { german: "gehen -> gegangen (sein)", english: "to go -> gone", phonetic: "guh-GAHNG-en", exampleDe: "Er ist nach Hause gegangen.", exampleEn: "He went home." },
            { german: "fahren -> gefahren (sein)", english: "to drive/travel -> traveled", phonetic: "guh-FAH-ren", exampleDe: "Wir sind nach Berlin gefahren.", exampleEn: "We traveled to Berlin." },
            { german: "sein -> gewesen (sein)", english: "to be -> been", phonetic: "guh-VAY-zen", exampleDe: "Ich bin gestern im Museum gewesen.", exampleEn: "I was at the museum yesterday." }
          ]
        }
      },
      {
        type: "GRAMMAR_RULE",
        data: {
          stage: "LEARN",
          title: "Perfekt-Bildung: haben vs. sein",
          ruleName: "Auxiliary Verb Selection & Partizip II",
          explanation: "1. Most verbs use 'haben': 'Ich HABE gegessen'. 2. Verbs of movement (gehen, fahren, kommen) or change of state (aufwachen, sterben), plus 'sein' and 'bleiben', use 'SEIN': 'Ich BIN gegangen', 'Er IST geblieben'. 3. Regular Partizip II: ge- + verb stem + -t (ge-mach-t, ge-kauf-t).",
          examples: [
            { german: "Ich habe eine Pizza gegessen.", english: "I ate a pizza (uses haben)." },
            { german: "Wir sind mit dem Zug gefahren.", english: "We traveled by train (movement -> uses sein)." }
          ]
        }
      },
      {
        type: "PRACTICE_DRILL",
        data: {
          stage: "GUIDED_PRACTICE",
          flashcards: [
            { front: "haben + Partizip II", back: "Used for most regular actions", hint: "Example: hat gemacht, hat gehört" },
            { front: "sein + Partizip II", back: "Used for movement and change of state", hint: "Example: ist gegangen, ist gefahren" },
            { front: "ge- + stem + -t", back: "Regular past participle formula", hint: "Example: gesagt, gespielt, gelernt" }
          ]
        }
      },
      {
        type: "FORMATIVE_DRILL",
        data: {
          stage: "PRACTICE_CHALLENGE",
          drills: [
            {
              type: "MCQ",
              prompt: "Which auxiliary verb is used with 'nach Hause gehen' in the Perfekt?",
              options: ["haben", "sein", "werden", "können"],
              answer: 1,
              explanation: "'Gehen' denotes motion from one place to another, so it takes 'sein': 'Ich bin gegangen'."
            }
          ]
        }
      },
      {
        type: "REVISION_SUMMARY",
        data: {
          stage: "REVISION",
          cheatSheet: [
            { concept: "Perfekt Formula", rule: "[Subject] + [haben/sein in pos 2] + [details] + [Partizip II at end]." },
            { concept: "Auxiliary 'sein'", rule: "Movement (gehen, fahren), change of state, and 'sein' / 'bleiben'." },
            { concept: "Regular Partizip II", rule: "ge- + stem + -t (ge-lern-t)." }
          ],
          commonPitfalls: [
            "Using 'haben' with movement verbs (*Ich habe gegangen* is WRONG -> Ich bin gegangen).",
            "Putting the participle in the middle instead of the end of the sentence."
          ],
          quickCheckQuestions: [
            "Which auxiliary verb does 'fahren' take in the Perfekt? (sein)",
            "What is the Partizip II of 'lernen'? (gelernt)"
          ]
        }
      }
    ]
  }
];

export const germanQuizzes = [
  // Quiz for Level 1 (Begrüßungen & Grundlagen) - 8 questions
  {
    stableKey: "de_lvl1",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which German greeting is used specifically in the morning?",
        options: ["Guten Abend", "Guten Morgen", "Gute Nacht", "Auf Wiedersehen"],
        correct: 1,
        explanation: "'Guten Morgen' is specifically used from early morning until around 11 AM.",
        nuance: "Morning greetings transition to 'Guten Tag' around midday in German culture."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the polite, formal German farewell when parting with business colleagues?",
        options: ["Tschüss", "Bis dann", "Auf Wiedersehen", "Hallo"],
        correct: 2,
        explanation: "'Auf Wiedersehen' is the standard polite, formal farewell.",
        nuance: "Literally translates to 'until we see each other again'."
      },
      {
        type: "MATCHING",
        prompt: "Match each German polite phrase with its English meaning:",
        matchingPairs: [
          { leftId: "de1", left: "Danke", rightId: "en1", right: "Thank you" },
          { leftId: "de2", left: "Bitte", rightId: "en2", right: "Please / You're welcome" },
          { leftId: "de3", left: "Entschuldigung", rightId: "en3", right: "Excuse me / Sorry" },
          { leftId: "de4", left: "Gute Nacht", rightId: "en4", right: "Good night (bedtime)" }
        ],
        explanation: "Basic courtesy phrases are essential for polite social interactions in German."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the self-introduction: 'Ich _____ Anna Müller.' (My name is)",
        blankText: "Ich [blank] Anna Müller.",
        acceptedAnswers: ["heiße", "heisse", "bin"],
        explanation: "'Ich heiße' or 'Ich bin' are the standard ways to introduce oneself."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which rule about capitalization in German is correct?",
        options: [
          "Only proper names are capitalized",
          "All nouns are capitalized",
          "Only verbs are capitalized",
          "Nouns are capitalized only at the beginning of a sentence"
        ],
        correct: 1,
        explanation: "In standard German orthography, ALL nouns are written with a capital initial letter.",
        nuance: "This rule applies to common nouns like 'der Tag' as well as abstract nouns."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How do you ask 'How are you?' to an elder or business partner in formal German?",
        options: ["Wie geht's dir?", "Wie geht es Ihnen?", "Was geht ab?", "Bist du gut?"],
        correct: 1,
        explanation: "'Wie geht es Ihnen?' uses the formal polite pronoun 'Ihnen'.",
        nuance: "'Wie geht's dir?' is informal and reserved for friends, peers, and children."
      },
      {
        type: "MATCHING",
        prompt: "Match the greeting to the appropriate time of day:",
        matchingPairs: [
          { leftId: "t1", left: "Guten Morgen", rightId: "m1", right: "8:00 AM" },
          { leftId: "t2", left: "Guten Tag", rightId: "m2", right: "2:00 PM" },
          { leftId: "t3", left: "Guten Abend", rightId: "m3", right: "7:00 PM" },
          { leftId: "t4", left: "Gute Nacht", rightId: "m4", right: "Going to bed" }
        ],
        explanation: "German greetings map directly to distinct parts of the day."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the response: 'Danke, mir geht es _____.' (good / well)",
        blankText: "Danke, mir geht es [blank].",
        acceptedAnswers: ["gut", "sehr gut"],
        explanation: "'Mir geht es gut' is the standard idiom meaning 'I am doing well'."
      }
    ]
  },

  // Quiz for Level 2 (Das Deutsche Alphabet & Aussprache) - 8 questions
  {
    stableKey: "de_lvl2",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How is the German letter combination 'ei' pronounced in words like 'nein' and 'mein'?",
        options: ["Like 'ee' in see", "Like 'eye' in my", "Like 'ay' in say", "Like 'oo' in boot"],
        correct: 1,
        explanation: "In German, 'ei' is always pronounced like the English diphthong /aɪ/ in 'eye' or 'mine'.",
        nuance: "Tip: English speakers remember to pronounce the second letter 'i' -> 'eye'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How is the combination 'ie' pronounced in words like 'Sie' and 'Bier'?",
        options: ["Like 'eye' in my", "Like 'ee' in feel", "Like 'eh' in pet", "Like 'i' in sit"],
        correct: 1,
        explanation: "'ie' represents a long /iː/ vowel sound, exactly like 'ee' in 'feel'.",
        nuance: "Tip: Pronounce the second letter 'e' -> 'ee'."
      },
      {
        type: "MATCHING",
        prompt: "Match the German letter/symbol with its phonetic character:",
        matchingPairs: [
          { leftId: "p1", left: "W (in Wasser)", rightId: "v1", right: "Pronounced like English 'V'" },
          { leftId: "p2", left: "V (in Vater)", rightId: "v2", right: "Often pronounced like English 'F'" },
          { leftId: "p3", left: "J (in Ja)", rightId: "v3", right: "Pronounced like English 'Y'" },
          { leftId: "p4", left: "Z (in Zeit)", rightId: "v4", right: "Pronounced like 'ts' in cats" }
        ],
        explanation: "Consonants like W, V, J, and Z differ consistently from English phonetics."
      },
      {
        type: "FILL_BLANK",
        prompt: "Fill in the missing German vowel: 'Die Fr___ ist sehr nett.' (woman -> Frau)",
        blankText: "Die Fr[blank] ist sehr nett.",
        acceptedAnswers: ["au"],
        explanation: "'Frau' has the diphthong 'au', pronounced like 'ow' in 'cow'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the German letter 'ß' (Eszett / Scharfes S) equivalent to in sound?",
        options: ["A voiced 'z' sound", "A sharp unvoiced 'ss' sound", "A 'sh' sound", "A silent letter"],
        correct: 1,
        explanation: "'ß' sounds like a sharp, unvoiced 's' and appears after long vowels or diphthongs.",
        nuance: "In Switzerland, 'ss' is always used in place of 'ß'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which pair of German words highlights the difference between 'ei' and 'ie'?",
        options: ["Wein / Wien", "Haus / Maus", "Tag / Nacht", "Gut / Bad"],
        correct: 0,
        explanation: "'Wein' (wine, pronounced vyne) and 'Wien' (Vienna, pronounced veen) are the classic contrast pair.",
        nuance: "Mistaking them alters the meaning entirely from wine to Vienna!"
      },
      {
        type: "MATCHING",
        prompt: "Match each German umlaut to its close English approximation:",
        matchingPairs: [
          { leftId: "u1", left: "Ä (ä)", rightId: "e1", right: "Open 'eh' sound (like in 'bed')" },
          { leftId: "u2", left: "Ö (ö)", rightId: "e2", right: "Rounded lips saying 'ay' (like French 'eu')" },
          { leftId: "u3", left: "Ü (ü)", rightId: "e3", right: "Rounded lips saying 'ee' (like French 'u')" },
          { leftId: "u4", left: "EU / ÄU", rightId: "e4", right: "'oy' sound (like in 'boy')" }
        ],
        explanation: "Mastering the umlaut mouth positions is crucial for authentic German pronunciation."
      },
      {
        type: "FILL_BLANK",
        prompt: "Write the German word for street (die Str___e) using the sharp S:",
        blankText: "Straße or Strasse",
        acceptedAnswers: ["Straße", "Strasse"],
        explanation: "'Straße' is spelled with 'ß' after the long 'a'."
      }
    ]
  },

  // Quiz for Level 3 (Zahlen, Zeit & Kalender) - 8 questions
  {
    stableKey: "de_lvl3",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How is the number 21 written in German?",
        options: ["zwanzigeins", "einundzwanzig", "einszwanzig", "zehnundeins"],
        correct: 1,
        explanation: "German numbers above 20 state the ones first, then 'und', then the tens: 'einundzwanzig' (one-and-twenty).",
        nuance: "This inverted structure applies up to 99."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "If someone says 'Es ist halb vier', what time is it?",
        options: ["4:30", "3:30", "4:15", "3:45"],
        correct: 1,
        explanation: "'Halb vier' means halfway to 4:00, which is 3:30.",
        nuance: "This is a frequent false-friend for English speakers who expect 4:30."
      },
      {
        type: "MATCHING",
        prompt: "Match the German numbers with their numeric values:",
        matchingPairs: [
          { leftId: "n1", left: "zwölf", rightId: "num1", right: "12" },
          { leftId: "n2", left: "fünfzehn", rightId: "num2", right: "15" },
          { leftId: "n3", left: "dreißig", rightId: "num3", right: "30" },
          { leftId: "n4", left: "hundert", rightId: "num4", right: "100" }
        ],
        explanation: "Numbers form the foundation for prices, times, and dates."
      },
      {
        type: "FILL_BLANK",
        prompt: "Which preposition is used with clock time? 'Der Zug kommt _____ 15 Uhr an.'",
        blankText: "Der Zug kommt [blank] 15 Uhr an.",
        acceptedAnswers: ["um"],
        explanation: "'Um' is the standard preposition used for clock times ('um 15 Uhr')."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which preposition is used with days of the week in German? '_____ Montag habe ich frei.'",
        options: ["Im", "Am", "Um", "An der"],
        correct: 1,
        explanation: "'Am' (an + dem) is used for days of the week and dates: 'am Montag'.",
        nuance: "'Um' is for times, 'im' is for months/seasons, 'am' is for days."
      },
      {
        type: "MATCHING",
        prompt: "Match the German day of the week to its English equivalent:",
        matchingPairs: [
          { leftId: "d1", left: "Mittwoch", rightId: "day1", right: "Wednesday" },
          { leftId: "d2", left: "Donnerstag", rightId: "day2", right: "Thursday" },
          { leftId: "d3", left: "Freitag", rightId: "day3", right: "Friday" },
          { leftId: "d4", left: "Samstag", rightId: "day4", right: "Saturday" }
        ],
        explanation: "Days of the week are all masculine in German ('der Montag', 'der Dienstag', etc.)."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How do you say 'quarter past eight' (8:15) informally in German?",
        options: ["Viertel vor acht", "Viertel nach acht", "Halb acht", "Acht Uhr fünfzehn"],
        correct: 1,
        explanation: "'Viertel nach acht' means quarter past eight.",
        nuance: "'nach' means after/past, while 'vor' means before/to."
      },
      {
        type: "FILL_BLANK",
        prompt: "What is 7 + 8 in German? Write the word: (sieben + acht = _____)",
        blankText: "sieben + acht = [blank]",
        acceptedAnswers: ["fünfzehn", "fuenfzehn"],
        explanation: "7 + 8 = 15, which is 'fünfzehn'."
      }
    ]
  },

  // Quiz for Level 4 (Substantive, Artikel & Plural) - 8 questions
  {
    stableKey: "de_lvl4",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which definite article belongs to the noun 'Tisch' (table)?",
        options: ["der", "die", "das", "den"],
        correct: 0,
        explanation: "'Tisch' is masculine, so its definite article in the nominative is 'der Tisch'.",
        nuance: "Objects do not have predictable genders based on meaning; memorizing with articles is vital."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Nouns ending in the suffix '-ung' (e.g. Zeitung, Wohnung) always have which gender?",
        options: ["Masculine (der)", "Feminine (die)", "Neuter (das)", "Varies by word"],
        correct: 1,
        explanation: "Nouns ending in '-ung', '-heit', '-keit', '-schaft', and '-tät' are 100% feminine ('die').",
        nuance: "Suffix patterns provide reliable shortcuts for German gender identification."
      },
      {
        type: "MATCHING",
        prompt: "Match each German noun to its correct definite article:",
        matchingPairs: [
          { leftId: "art1", left: "Frau", rightId: "g1", right: "die" },
          { leftId: "art2", left: "Mann", rightId: "g2", right: "der" },
          { leftId: "art3", left: "Kind", rightId: "g3", right: "das" },
          { leftId: "art4", left: "Bücher (plural)", rightId: "g4", right: "die" }
        ],
        explanation: "All German nouns in the nominative plural take the article 'die'."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete with the correct negative article: 'Das ist _____ Problem.' (no problem, neuter)",
        blankText: "Das ist [blank] Problem.",
        acceptedAnswers: ["kein"],
        explanation: "'Problem' is neuter (das Problem), so the negative article in nominative is 'kein'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the nominative plural article for ALL German nouns, regardless of singular gender?",
        options: ["der", "die", "das", "den"],
        correct: 1,
        explanation: "In the nominative case, ALL German plural nouns take the definite article 'die'.",
        nuance: "der Mann -> die Männer; die Frau -> die Frauen; das Kind -> die Kinder."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Why is 'das Mädchen' (the girl) grammatically neuter instead of feminine?",
        options: [
          "It is an error in older German",
          "All nouns ending in the diminutive suffix '-chen' are neuter",
          "It refers to children only",
          "It can be either masculine or neuter"
        ],
        correct: 1,
        explanation: "Diminutives ending in '-chen' and '-lein' are always grammatically neuter ('das').",
        nuance: "Grammatical gender overrides biological gender in German word formation."
      },
      {
        type: "MATCHING",
        prompt: "Match the singular noun to its correct plural form:",
        matchingPairs: [
          { leftId: "pl1", left: "der Apfel", rightId: "plr1", right: "die Äpfel (umlaut change)" },
          { leftId: "pl2", left: "das Auto", rightId: "plr2", right: "die Autos (-s suffix)" },
          { leftId: "pl3", left: "das Buch", rightId: "plr3", right: "die Bücher (umlaut + -er)" },
          { leftId: "pl4", left: "die Lampe", rightId: "plr4", right: "die Lampen (-n suffix)" }
        ],
        explanation: "German has five main plural patterns: -e, -er, -en/-n, -s, or vowel umlaut only."
      },
      {
        type: "FILL_BLANK",
        prompt: "Fill in the indefinite article: 'Ich habe _____ Katze.' (die Katze = feminine)",
        blankText: "Ich habe [blank] Katze.",
        acceptedAnswers: ["eine"],
        explanation: "Feminine nouns take 'eine' in both nominative and accusative."
      }
    ]
  },

  // Quiz for Level 5 (Wesentliche Verben & Konjugation) - 8 questions
  {
    stableKey: "de_lvl5",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the correct present tense form of 'sein' for 'du'?",
        options: ["bin", "bist", "ist", "sind"],
        correct: 1,
        explanation: "The conjugation of 'sein' is: ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie sind.",
        nuance: "'sein' is the most irregular and essential verb in German."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the correct form: 'Er _____ einen neuen Laptop.' (haben)?",
        options: ["habe", "hast", "hat", "haben"],
        correct: 2,
        explanation: "For 'er/sie/es', the present tense form of 'haben' is 'hat'.",
        nuance: "'haben' drops the 'b' in du hast and er hat."
      },
      {
        type: "MATCHING",
        prompt: "Match the subject pronoun with its regular present tense verb ending:",
        matchingPairs: [
          { leftId: "pr1", left: "ich", rightId: "end1", right: "-e (lerne)" },
          { leftId: "pr2", left: "du", rightId: "end2", right: "-st (lernst)" },
          { leftId: "pr3", left: "er/sie/es", rightId: "end3", right: "-t (lernt)" },
          { leftId: "pr4", left: "wir / sie / Sie", rightId: "end4", right: "-en (lernen)" }
        ],
        explanation: "These standard personal endings apply to the vast majority of regular German verbs."
      },
      {
        type: "FILL_BLANK",
        prompt: "Conjugate 'wohnen': 'Wo _____ ihr?' (Where do you all live?)",
        blankText: "Wo [blank] ihr?",
        acceptedAnswers: ["wohnt"],
        explanation: "The pronoun 'ihr' (informal plural you) takes the ending '-t': 'wohnt'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What happens to the stem vowel in the verb 'sprechen' for 'du' and 'er'?",
        options: ["e changes to a", "e changes to i", "e changes to o", "No vowel change occurs"],
        correct: 1,
        explanation: "In 'sprechen', the stem vowel 'e' changes to 'i': du sprichst, er spricht.",
        nuance: "Strong verbs frequently change e -> i or ie in second and third person singular."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Why does 'arbeiten' become 'du arbeitest' instead of 'du arbeitst'?",
        options: [
          "It is a spelling irregularity",
          "Verb stems ending in -t or -d insert an -e- before endings for easier pronunciation",
          "It is an archaic form",
          "Only in written German"
        ],
        correct: 1,
        explanation: "Stems ending in -d or -t (arbeiten, finden) insert -e- before -st and -t to make pronunciation possible.",
        nuance: "e.g., er arbeitet, ihr arbeitet, du findest."
      },
      {
        type: "MATCHING",
        prompt: "Match the subject pronoun with the correct form of 'sein':",
        matchingPairs: [
          { leftId: "s1", left: "Ich", rightId: "sf1", right: "bin" },
          { leftId: "s2", left: "Er", rightId: "sf2", right: "ist" },
          { leftId: "s3", left: "Wir", rightId: "sf3", right: "sind" },
          { leftId: "s4", left: "Ihr", rightId: "sf4", right: "seid" }
        ],
        explanation: "Complete paradigm: ich bin, du bist, er ist, wir sind, ihr seid, sie/Sie sind."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the sentence: 'Wir _____ Deutsch jeden Tag.' (lernen)",
        blankText: "Wir [blank] Deutsch jeden Tag.",
        acceptedAnswers: ["lernen"],
        explanation: "'Wir' takes the infinitive ending '-en': 'lernen'."
      }
    ]
  },

  // Quiz for Level 6 (Satzbau & Fragestellung) - 8 questions
  {
    stableKey: "de_lvl6",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "In a standard German statement, what position must the conjugated finite verb occupy?",
        options: ["Position 1", "Position 2", "At the very end", "Anywhere in the sentence"],
        correct: 1,
        explanation: "The Verb-Second (V2) rule dictates that the conjugated verb is ALWAYS the second element in a main clause.",
        nuance: "Even if position 1 contains an adverb phrase, the verb remains strictly in position 2."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "If you begin a sentence with 'Heute' (Today), what is the correct word order?",
        options: [
          "Heute ich gehe in die Schule.",
          "Heute gehe ich in die Schule.",
          "Heute in die Schule ich gehe.",
          "Gehe heute ich in die Schule."
        ],
        correct: 1,
        explanation: "'Heute' is Position 1, 'gehe' is Position 2 (the verb), and subject 'ich' inverts to Position 3.",
        nuance: "This subject-verb inversion is a signature feature of German syntax."
      },
      {
        type: "MATCHING",
        prompt: "Match the German question word (W-Frage) with its English meaning:",
        matchingPairs: [
          { leftId: "w1", left: "Wo", rightId: "wm1", right: "Where (location)" },
          { leftId: "w2", left: "Wohin", rightId: "wm2", right: "Where to (destination)" },
          { leftId: "w3", left: "Woher", rightId: "wm3", right: "Where from (origin)" },
          { leftId: "w4", left: "Warum", rightId: "wm4", right: "Why (reason)" }
        ],
        explanation: "German distinguishes stationary location (wo) from direction towards (wohin) and from (woher)."
      },
      {
        type: "FILL_BLANK",
        prompt: "Fill in the question word: '_____ beginnt der Kurs?' (When does the course begin?)",
        blankText: "[blank] beginnt der Kurs?",
        acceptedAnswers: ["Wann", "wann"],
        explanation: "'Wann' is the question word for time ('when')."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What word order is used in a German Yes/No question (Ja/Nein-Frage)?",
        options: [
          "Subject first, then verb",
          "Conjugated verb first, then subject",
          "Question particle 'do' first",
          "Verb at the end of the question"
        ],
        correct: 1,
        explanation: "Yes/No questions place the finite verb in Position 1: 'Kommst du morgen?' (Are you coming tomorrow?).",
        nuance: "German has no auxiliary 'do' equivalent (never say *Do you come?* in German)."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which question asks 'What are you doing today?'",
        options: [
          "Was machst du heute?",
          "Wo machst du heute?",
          "Wer machst du heute?",
          "Wie machst du heute?"
        ],
        correct: 0,
        explanation: "'Was' means 'what'. 'Was machst du heute?' is the natural question.",
        nuance: "'Wer' = who, 'Wo' = where, 'Wie' = how."
      },
      {
        type: "MATCHING",
        prompt: "Match the question to its logical answer:",
        matchingPairs: [
          { leftId: "q1", left: "Woher kommen Sie?", rightId: "a1", right: "Aus Deutschland." },
          { leftId: "q2", left: "Wo wohnst du?", rightId: "a2", right: "In Berlin." },
          { leftId: "q3", left: "Wie heißen Sie?", rightId: "a3", right: "Ich heiße Maria." },
          { leftId: "q4", left: "Trinkst du Kaffee?", rightId: "a4", right: "Ja, sehr gern." }
        ],
        explanation: "W-questions require specific information; verb-first questions expect Ja or Nein."
      },
      {
        type: "FILL_BLANK",
        prompt: "Reorder to form a question: 'Kommst _____ heute Abend?' (du)",
        blankText: "Kommst [blank] heute Abend?",
        acceptedAnswers: ["du"],
        explanation: "In a verb-first question, the subject pronoun follows immediately: 'Kommst du...'."
      }
    ]
  },

  // Quiz for Level 7 (Alltagssituationen & Gastronomie) - 8 questions
  {
    stableKey: "de_lvl7",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the polite phrase to order something in a restaurant or café?",
        options: ["Ich will...", "Ich möchte...", "Ich nehme müssen...", "Gib mir..."],
        correct: 1,
        explanation: "'Ich möchte...' (I would like...) is the standard polite formulation when ordering.",
        nuance: "'Ich will' is considered impolite and demanding in German dining culture."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What happens to the masculine article 'der' in the accusative case (direct object)?",
        options: ["der remains der", "der changes to den", "der changes to dem", "der changes to des"],
        correct: 1,
        explanation: "Only the masculine article changes in the accusative: der -> den, ein -> einen, kein -> keinen.",
        nuance: "Feminine (die/eine), neuter (das/ein), and plural (die) do NOT change form in the accusative."
      },
      {
        type: "MATCHING",
        prompt: "Match the restaurant German phrase with its English meaning:",
        matchingPairs: [
          { leftId: "r1", left: "Die Rechnung, bitte!", rightId: "rm1", right: "The bill, please!" },
          { leftId: "r2", left: "Zusammen oder getrennt?", rightId: "rm2", right: "Together or separately?" },
          { leftId: "r3", left: "Stimmt so!", rightId: "rm3", right: "Keep the change! (tip)" },
          { leftId: "r4", left: "Guten Appetit!", rightId: "rm4", right: "Enjoy your meal!" }
        ],
        explanation: "Dining etiquette phrases in the DACH region."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the order: 'Ich möchte _____ Kaffee, bitte.' (der Kaffee -> accusative)",
        blankText: "Ich möchte [blank] Kaffee, bitte.",
        acceptedAnswers: ["einen"],
        explanation: "'Kaffee' is masculine, so the indefinite article in accusative is 'einen'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How do you ask for directions to the train station in German?",
        options: [
          "Wo ist der Bahnhof, bitte?",
          "Wohin kommt der Bahnhof?",
          "Was kostet der Bahnhof?",
          "Wann fährt der Bahnhof?"
        ],
        correct: 0,
        explanation: "'Wo ist der Bahnhof, bitte?' (Where is the train station, please?) is the standard polite inquiry.",
        nuance: "'der Bahnhof' is masculine, so 'Wo ist der Bahnhof?' uses nominative after 'sein'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What does 'Gehen Sie geradeaus und dann links' mean?",
        options: [
          "Go straight ahead and then left",
          "Go backwards and then right",
          "Turn right at the light",
          "Stop and wait here"
        ],
        correct: 0,
        explanation: "'geradeaus' = straight ahead, 'links' = left, 'rechts' = right.",
        nuance: "Essential navigational vocabulary."
      },
      {
        type: "MATCHING",
        prompt: "Match the direction term to its English equivalent:",
        matchingPairs: [
          { leftId: "dir1", left: "geradeaus", rightId: "dm1", right: "straight ahead" },
          { leftId: "dir2", left: "links", rightId: "dm2", right: "left" },
          { leftId: "dir3", left: "rechts", rightId: "dm3", right: "right" },
          { leftId: "dir4", left: "die Haltestelle", rightId: "dm4", right: "the bus/tram stop" }
        ],
        explanation: "Basic navigational vocabulary for moving around German cities."
      },
      {
        type: "FILL_BLANK",
        prompt: "How do you ask 'How much does that cost?' in German? 'Was _____ das?'",
        blankText: "Was [blank] das?",
        acceptedAnswers: ["kostet"],
        explanation: "'Was kostet das?' is the standard idiom for price inquiries."
      }
    ]
  },

  // Quiz for Level 8 (Familie, Wohnen & Beschreibungen) - 8 questions
  {
    stableKey: "de_lvl8",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which possessive pronoun correctly completes: 'Das ist _____ Schwester.' (my)",
        options: ["mein", "meine", "meinen", "meines"],
        correct: 1,
        explanation: "'Schwester' is feminine (die Schwester), so the possessive pronoun takes the '-e' ending: 'meine'.",
        nuance: "Masculine and neuter nouns take 'mein' with no ending in nominative."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What ending does a predicate adjective take when used after the verb 'sein' (e.g. 'Das Haus ist groß')?",
        options: ["-e", "-en", "-es", "No ending (remains base form)"],
        correct: 3,
        explanation: "Predicate adjectives (adjectives following 'sein', 'werden', or 'bleiben') do NOT take any endings in German.",
        nuance: "Contrast: 'Das große Haus' (attributive -> takes ending) vs 'Das Haus ist groß' (predicate -> no ending)."
      },
      {
        type: "MATCHING",
        prompt: "Match each family member with the correct German word:",
        matchingPairs: [
          { leftId: "fam1", left: "Vater", rightId: "fm1", right: "Father" },
          { leftId: "fam2", left: "Mutter", rightId: "fm2", right: "Mother" },
          { leftId: "fam3", left: "Bruder", rightId: "fm3", right: "Brother" },
          { leftId: "fam4", left: "Eltern", rightId: "fm4", right: "Parents" }
        ],
        explanation: "Core family vocabulary in German."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete with the possessive: 'Peter sucht _____ Buch.' (his book -> sein)",
        blankText: "Peter sucht [blank] Buch.",
        acceptedAnswers: ["sein"],
        explanation: "'Buch' is neuter (das Buch), so 'his' is 'sein' in nominative and accusative."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the opposite adjective of 'groß' (big)?",
        options: ["klein", "alt", "hell", "schön"],
        correct: 0,
        explanation: "'klein' means small.",
        nuance: "groß / klein, alt / neu, hell / dunkel are classic antonym pairs."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which possessive pronoun means 'her' (belonging to a woman)?",
        options: ["sein", "ihr", "unser", "euer"],
        correct: 1,
        explanation: "'ihr' corresponds to 'her'. For feminine/plural nouns it becomes 'ihre'.",
        nuance: "sein = his/its; ihr = her/their."
      },
      {
        type: "MATCHING",
        prompt: "Match the German adjective with its opposite:",
        matchingPairs: [
          { leftId: "adj1", left: "alt", rightId: "opp1", right: "neu (new) / jung (young)" },
          { leftId: "adj2", left: "hell", rightId: "opp2", right: "dunkel (dark)" },
          { leftId: "adj3", left: "teuer", rightId: "opp3", right: "billig / günstig (cheap)" },
          { leftId: "adj4", left: "schön", rightId: "opp4", right: "hässlich (ugly)" }
        ],
        explanation: "Adjective pairs for descriptive mastery."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the sentence: 'Die Wohnung ist sehr _____.' (bright -> hell)",
        blankText: "Die Wohnung ist sehr [blank].",
        acceptedAnswers: ["hell"],
        explanation: "'hell' means bright and well-lit."
      }
    ]
  },

  // Quiz for Level 9 (Tagesablauf & Modalverben) - 8 questions
  {
    stableKey: "de_lvl9",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "In a sentence with a modal verb (e.g. 'können'), where does the main infinitive verb go?",
        options: [
          "Directly after the modal verb",
          "At the very end of the clause",
          "In position 1",
          "Before the subject"
        ],
        correct: 1,
        explanation: "The Satzklammer (sentence bracket) puts the modal verb in Position 2 and the infinitive at the very end.",
        nuance: "e.g. 'Ich KANN heute nicht KOMMEN'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is special about the 'ich' and 'er/sie/es' forms of German modal verbs?",
        options: [
          "They take a regular -e and -t ending",
          "They share the identical form and have NO personal ending",
          "They are always plural",
          "They cannot be used in the present tense"
        ],
        correct: 1,
        explanation: "In all modal verbs, 'ich' and 'er/sie/es' have the identical form with zero ending: ich kann, er kann; ich muss, er muss.",
        nuance: "This derives from their historical preterite-present linguistic origin."
      },
      {
        type: "MATCHING",
        prompt: "Match the modal verb to its core meaning:",
        matchingPairs: [
          { leftId: "m1", left: "können", rightId: "mm1", right: "ability / can" },
          { leftId: "m2", left: "müssen", rightId: "mm2", right: "necessity / must" },
          { leftId: "m3", left: "wollen", rightId: "mm3", right: "intention / want to" },
          { leftId: "m4", left: "dürfen", rightId: "mm4", right: "permission / allowed to" }
        ],
        explanation: "Modal verbs express the attitude of the speaker towards the action."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete with 'müssen': 'Er _____ heute für die Prüfung lernen.'",
        blankText: "Er [blank] heute für die Prüfung lernen.",
        acceptedAnswers: ["muss"],
        explanation: "For 'er', the modal 'müssen' is 'muss' (stem vowel change ü -> u, no ending)."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What happens to the separable prefix in 'aufstehen' in a present tense main clause?",
        options: [
          "It stays attached: 'Ich aufstehe um 7 Uhr.'",
          "It moves to the very end: 'Ich stehe um 7 Uhr auf.'",
          "It is dropped completely",
          "It moves to position 1"
        ],
        correct: 1,
        explanation: "In present tense main clauses, the prefix detaches and moves to the final position: 'Ich stehe um 7 Uhr auf.'",
        nuance: "When a modal verb is used, the separable verb stays intact at the end: 'Ich muss um 7 Uhr aufstehen'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which of the following is a separable verb prefix?",
        options: ["be-", "ver-", "ein- (einkaufen)", "ent-"],
        correct: 2,
        explanation: "'ein-' is a stressed separable prefix (einkaufen, einsteigen).",
        nuance: "'be-', 'ver-', and 'ent-' are inseparable prefixes that never detach."
      },
      {
        type: "MATCHING",
        prompt: "Match the separable verb with its English meaning:",
        matchingPairs: [
          { leftId: "sep1", left: "aufstehen", rightId: "sm1", right: "to get up / stand up" },
          { leftId: "sep2", left: "einkaufen", rightId: "sm2", right: "to shop / buy groceries" },
          { leftId: "sep3", left: "anrufen", rightId: "sm3", right: "to call on the phone" },
          { leftId: "sep4", left: "fernsehen", rightId: "sm4", right: "to watch TV" }
        ],
        explanation: "Common separable verbs used in describing daily routines."
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the sentence with the separated prefix: 'Der Zug fährt um 10 Uhr _____.' (abfahren -> to depart)",
        blankText: "Der Zug fährt um 10 Uhr [blank].",
        acceptedAnswers: ["ab"],
        explanation: "The prefix 'ab-' moves to the end of the sentence: 'fährt ... ab'."
      }
    ]
  },

  // Quiz for Level 10 (A1 Meilenstein & Perfekt Einführung) - 8 questions
  {
    stableKey: "de_lvl10",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "How is the conversational past tense (das Perfekt) constructed in German?",
        options: [
          "Auxiliary verb (haben/sein) in Position 2 + Partizip II at the end of the clause",
          "Single past tense verb in Position 2 only",
          "Partizip II first, then the subject",
          "Always with 'haben', never with 'sein'"
        ],
        correct: 0,
        explanation: "The Perfekt is formed by placing conjugated 'haben' or 'sein' in Position 2 and the Partizip II at the clause end.",
        nuance: "This two-part verbal bracket is the primary spoken past tense in German."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which verbs take 'sein' as their auxiliary verb in the Perfekt?",
        options: [
          "All verbs without exception",
          "Verbs indicating a change of location (movement) or state, plus 'sein' and 'bleiben'",
          "Only reflexive verbs",
          "Verbs that take direct objects"
        ],
        correct: 1,
        explanation: "Verbs of motion (gehen, fahren, fliegen), transition (aufwachen, sterben), and 'sein' / 'bleiben' use 'sein'.",
        nuance: "Most other verbs take 'haben'."
      },
      {
        type: "MATCHING",
        prompt: "Match the infinitive verb to its correct Partizip II (past participle):",
        matchingPairs: [
          { leftId: "inf1", left: "lernen", rightId: "pt1", right: "gelernt (learned)" },
          { leftId: "inf2", left: "machen", rightId: "pt2", right: "gemacht (done/made)" },
          { leftId: "inf3", left: "gehen", rightId: "pt3", right: "gegangen (gone)" },
          { leftId: "inf4", left: "sehen", rightId: "pt4", right: "gesehen (seen)" }
        ],
        explanation: "Regular verbs form Partizip II with ge- + stem + -t; irregular verbs often end in -en."
      },
      {
        type: "FILL_BLANK",
        prompt: "Choose the correct auxiliary (haben/sein): 'Ich _____ gestern viel gearbeitet.'",
        blankText: "Ich [blank] gestern viel gearbeitet.",
        acceptedAnswers: ["habe"],
        explanation: "'Arbeiten' is an action verb without movement or state change, so it takes 'haben': 'Ich habe gearbeitet'."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Choose the correct sentence in the Perfekt for: 'We drove to Munich.'",
        options: [
          "Wir haben nach München gefahren.",
          "Wir sind nach München gefahren.",
          "Wir gefahren nach München sind.",
          "Wir fahren nach München gewesen."
        ],
        correct: 1,
        explanation: "'Fahren' indicates movement from one place to another, so it requires 'sein': 'Wir sind nach München gefahren.'",
        nuance: "Using 'haben' with 'fahren' is a common learner error."
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "What is the Partizip II of 'sein' (to be) in German?",
        options: ["gesein", "gewesen", "gesind", "gewart"],
        correct: 1,
        explanation: "The past participle of 'sein' is 'gewesen': 'Ich bin in Berlin gewesen' (I have been to Berlin).",
        nuance: "It takes 'sein' as auxiliary: 'Er ist gewesen'."
      },
      {
        type: "MATCHING",
        prompt: "Match the verb to its required Perfekt auxiliary (haben or sein):",
        matchingPairs: [
          { leftId: "v_h1", left: "kaufen (to buy)", rightId: "aux_h1", right: "hat gekauft (haben)" },
          { leftId: "v_h2", left: "hören (to hear)", rightId: "aux_h2", right: "hat gehört (haben)" },
          { leftId: "v_s1", left: "kommen (to come)", rightId: "aux_s1", right: "ist gekommen (sein)" },
          { leftId: "v_s2", left: "bleiben (to stay)", rightId: "aux_s2", right: "ist geblieben (sein)" }
        ],
        explanation: "'Bleiben' (to stay) is famous for taking 'sein' despite no movement!"
      },
      {
        type: "FILL_BLANK",
        prompt: "Complete the sentence: 'Er ist gestern nach Hause _____.' (gehen -> past participle)",
        blankText: "Er ist gestern nach Hause [blank].",
        acceptedAnswers: ["gegangen"],
        explanation: "The Partizip II of 'gehen' is 'gegangen'."
      }
    ]
  }
];
