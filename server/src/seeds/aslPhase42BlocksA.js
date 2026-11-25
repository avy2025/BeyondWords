import { asl42Sign as s, asl42Sources as src, LINKED_VIDEO_REVIEW, WRITTEN_REFERENCE } from './aslPhase42Sources.js';

const ex = (prompt, options, answer, hint, feedback) => ({ prompt, options, answer, hint, feedback });

export const PHASE42_BLOCKS_A = {
  asl_level_01: {
    level: 1,
    title: 'ASL Alphabet A–Z',
    objectives: [
      { text: 'Recognise all 26 manual letters in A–Z order.', success: 'You can point to a letter when its verified handshape is described.' },
      { text: 'Distinguish look-alike letters by handshape, palm orientation, and movement.', success: 'You can explain A vs S, M vs N, U vs V, and J vs I.' },
      { text: 'Produce J and Z with their required movement paths.', success: 'A still hand is not accepted as a complete J or Z.' }
    ],
    vocabulary: [
      { term: 'Handshape', context: 'The finger and thumb arrangement that identifies a letter.' },
      { term: 'Palm orientation', context: 'Which way the palm faces; K vs P and G vs Q depend on it.' },
      { term: 'Movement', context: 'J and Z trace a path; most other letters are held steady.' },
      { term: 'Fingerspelling', context: 'A way to represent letters, especially for names.' }
    ],
    signNotes: [
      s('J', {
        handshape: 'Begin with the I handshape: a fist with the little finger extended.',
        palmOrientation: 'Keep the hand visible in a comfortable signing space; the palm follows the natural I-handshape position.',
        movement: 'Trace the curve and hook of a J with the little fingertip.',
        nonManualMarkers: 'Use a neutral, attentive face while demonstrating an isolated letter.',
        commonMistake: 'Holding the I handshape still. The movement is part of the letter.',
        source: 'ASL University alphabet chart',
        verification: WRITTEN_REFERENCE
      }),
      s('Z', {
        handshape: 'Extend the index finger while the other fingers stay curled.',
        palmOrientation: 'Keep the index fingertip visible in front of the body so the path can be seen.',
        movement: 'Trace a Z in the air: across, diagonal back, then across again.',
        nonManualMarkers: 'Stay visually attentive; avoid looking away from your partner during the trace.',
        commonMistake: 'Pointing the index finger without drawing the three strokes.',
        source: 'ASL University alphabet chart',
        verification: WRITTEN_REFERENCE
      }),
      s('M vs N', {
        handshape: 'Both tuck the thumb under curled fingers. M covers the thumb with three fingers; N covers it with two.',
        palmOrientation: 'Compare from the same viewing angle so finger count is reliable.',
        movement: 'Hold each shape steady; neither letter adds a tracing movement.',
        nonManualMarkers: 'A neutral face keeps attention on the visual contrast.',
        commonMistake: 'Counting the visible fingers instead of the fingers covering the thumb.',
        source: 'ASL University alphabet chart',
        verification: WRITTEN_REFERENCE
      }),
      s('A vs S', {
        handshape: 'A keeps the thumb beside the index side of the fist; S lays the thumb across the front of the curled fingers.',
        palmOrientation: 'Keep both fists in the same orientation while comparing them.',
        movement: 'Both are static letters.',
        nonManualMarkers: 'A small head tilt can show you are asking for a comparison.',
        commonMistake: 'Hiding the A thumb inside the fist or using the A position for S.',
        source: 'ASL University alphabet chart',
        verification: WRITTEN_REFERENCE
      })
    ],
    markers: [
      { cue: 'Neutral attentive face', use: 'Isolated alphabet drill', example: 'Hold B and then C while looking at your partner.', caution: 'Do not add a question face to a plain letter demonstration.' },
      { cue: 'Visual attention cue', use: 'Before fingerspelling a name', example: 'Make sure your partner is looking before you begin.', caution: 'Do not grab or start while they look away.' },
      { cue: 'Furrowed brows / slight head tilt', use: 'Asking “NAME YOU?”', example: 'The question marking belongs to the question, not to the letter handshape.', caution: 'Keep it tied to the question phrase.' }
    ],
    examples: [
      { situation: 'Introducing a new classmate', gloss: 'NAME [ fingerspell M-A-Y-A ]', meaning: 'Fingerspell a name when no shared name sign exists yet.', tip: 'Pause slightly at the word boundary.' },
      { situation: 'Checking a confusing letter', gloss: 'M? / N?', meaning: 'Compare how many fingers cover the thumb.', tip: 'Use the linked chart rather than guessing from memory.' },
      { situation: 'Demonstrating movement letters', gloss: 'J — trace / Z — trace', meaning: 'Show the path, not just the starting handshape.', tip: 'J uses the little finger; Z uses the index.' }
    ],
    revision: [
      { text: 'J and Z are movement letters.', detail: 'A still handshape is incomplete.' },
      { text: 'M covers the thumb with three fingers; N with two.', detail: 'Count the covering fingers.' },
      { text: 'A keeps the thumb beside the fist; S crosses it over the fingers.', detail: 'Check the thumb position.' },
      { text: 'Use the linked Lifeprint chart to verify a letter.', detail: 'Do not invent a hand image from memory.' }
    ],
    sources: src([
      ['alphabet', 'Primary handshape and movement reference for A–Z.'],
      ['fingerspelling', 'Context for why fingerspelling is used.'],
      ['nmm', 'Background on facial and head signals.']
    ]),
    guided: [
      ex('Which letter begins like I but must trace a curved path?', ['J', 'Z', 'Y'], 0, 'Think of the little finger.', 'J starts with the I handshape and adds a J-shaped movement.'),
      ex('How do M and N differ?', ['M covers the thumb with two fingers; N with three.', 'M covers the thumb with three fingers; N with two.', 'M uses two hands; N uses one.'], 1, 'Count the fingers over the thumb.', 'M has three covering fingers; N has two.'),
      ex('Why is a linked chart used instead of a generated picture?', ['It is a credible visual reference.', 'It makes the hand move faster.', 'It replaces practice.'], 0, 'Accuracy of the reference matters.', 'The linked ASL University chart is a verified reference; no image is invented.')
    ],
    challenge: [
      ex('A learner holds a still little-finger shape for J. What is missing?', ['The J-shaped trace', 'A second hand', 'A thumb across the fingers'], 0, 'J is a movement letter.', 'Trace the J path with the little fingertip.'),
      ex('Which pair differs mainly by palm orientation?', ['K and P', 'U and V', 'M and N'], 0, 'One is the K handshape turned down.', 'P is the K configuration oriented downward.'),
      ex('What should you do before fingerspelling to someone who is not looking?', ['Gain visual attention respectfully.', 'Start immediately.', 'Grab their hand.'], 0, 'ASL is visual.', 'Establish attention without grabbing or startling.')
    ],
    revisionExercises: [
      ex('Which two letters require a traced path?', ['A and B', 'J and Z', 'C and O'], 1, 'One uses the little finger, one uses the index.', 'J and Z are the movement letters in the manual alphabet.'),
      ex('Which letter is a fist with the thumb laid across the fingers?', ['A', 'S', 'T'], 1, 'The thumb crosses the front.', 'S has the thumb across the curled fingers; A keeps it beside them.'),
      ex('Where should a beginner verify an unclear handshape?', ['A trusted ASL reference', 'A random image search', 'A guess'], 0, 'Use credible sources.', 'Check the linked ASL University reference.')
    ],
    explanations: {
      'Which letter is made with an L-shaped thumb and index?': 'L forms a clear right angle with the thumb and index finger; U keeps two fingers together and A is a fist.',
      'Which letter requires tracing a J with the little finger?': 'J begins with the I handshape, then the little fingertip traces a J-shaped path. A still little finger is I, not the complete J.',
      'Which letter is a fist with the thumb resting beside the index?': 'A keeps the thumb alongside the index side of the fist. S lays the thumb across the front of the fingers, and T places it between index and middle.',
      'Which letter uses a thumb-index circle with three fingers extended?': 'F has the thumb and index touching in a circle with the other three fingers extended. O closes all fingertips into a rounded shape.',
      'How is Z formed?': 'Extend the index finger and trace the three strokes of a Z in the air: across, diagonal back, then across again.',
      'Which pair differs by together versus apart fingers?': 'U keeps the index and middle fingers together; V separates them into a clear V shape.',
      'In the common ASL alphabet, M tucks the thumb under how many fingers?': 'M tucks the thumb under three fingers. N tucks it under two; counting the covering fingers keeps them distinct.',
      'Which is the best description of fingerspelling?': 'Fingerspelling represents letters and is especially useful for names and some words. It complements established ASL signs rather than replacing them.'
    }
  },

  asl_level_02: {
    level: 2,
    title: 'Fingerspelling and Word Formation',
    objectives: [
      { text: 'Produce a clear sequence of letters with a natural rhythm.', success: 'A partner can identify the spelled name without repeated guessing.' },
      { text: 'Keep letters in the handshape, palm, and movement form learned in Level 1.', success: 'J and Z keep their tracing paths inside a sequence.' },
      { text: 'Use pauses and clarification to show word boundaries.', success: 'You can repeat a spelling more clearly when asked.' }
    ],
    vocabulary: [
      { term: 'Letter sequence', context: 'Letters are produced in order; clarity comes before speed.' },
      { term: 'Signing space', context: 'A visible, comfortable area near the shoulder.' },
      { term: 'Word boundary', context: 'A small pause can separate adjacent fingerspelled words.' },
      { term: 'Clarification', context: 'A normal repair strategy, not a failure.' }
    ],
    signNotes: [
      s('Overall handshape', {
        handshape: 'Use the verified Level 1 handshape for each letter; do not blend two letters into a new shape.',
        palmOrientation: 'Keep the hand visible near the shoulder with a consistent orientation between letters.',
        movement: 'Link letters with a small natural rhythm; retain the J and Z traces when those letters occur.',
        nonManualMarkers: 'Maintain a neutral, attentive face while spelling; look at your partner.',
        commonMistake: 'Bouncing each letter out of space or speeding up before the sequence is readable.',
        source: 'ASL University fingerspelling introduction',
        verification: LINKED_VIDEO_REVIEW
      }),
      s('Repeated-letter boundary', {
        handshape: 'Return cleanly to the required handshape for each letter.',
        palmOrientation: 'Avoid turning the wrist away between identical letters.',
        movement: 'A tiny reset between letters keeps the count clear.',
        nonManualMarkers: 'A brief questioning look can invite confirmation after the sequence.',
        commonMistake: 'Merging two identical letters into one long hold.',
        source: 'ASL University fingerspelling introduction',
        verification: LINKED_VIDEO_REVIEW
      })
    ],
    markers: [
      { cue: 'Attentive eye contact', use: 'During a fingerspelled name', example: 'Check that your partner is watching before and during the sequence.', caution: 'Do not watch your own hand the whole time.' },
      { cue: 'Slight head tilt / questioning brow', use: 'Confirmation', example: 'After spelling, silently check whether the name was understood.', caution: 'Keep the question marking after the sequence, not inside every letter.' },
      { cue: 'Neutral face', use: 'Plain spelling drill', example: 'Let the hand shapes carry the information.', caution: 'Exaggerated facial movement can distract from letter reading.' }
    ],
    examples: [
      { situation: 'New student introduces herself', gloss: 'NAME [ fingerspell A-N-N-A ]', meaning: 'Fingerspelling gives the exact written name when no name sign is shared.', tip: 'Pause, then invite the other person to respond.' },
      { situation: 'Partner misses one letter', gloss: 'AGAIN [ fingerspell slowly ]', meaning: 'Repeat more clearly rather than simply faster.', tip: 'Keep the same hand space and separate the letters.' },
      { situation: 'Two words in succession', gloss: '[ fingerspell NAME ] [ fingerspell CITY ]', meaning: 'A small pause helps show where one word ends.', tip: 'Do not drop the hand after every single letter.' }
    ],
    revision: [
      { text: 'Clarity before speed.', detail: 'Fast but unreadable spelling does not communicate.' },
      { text: 'Keep a consistent visible space.', detail: 'Comfortably near the shoulder is a common starting point.' },
      { text: 'J and Z keep their traced paths.', detail: 'The movement belongs to the letter even inside a name.' },
      { text: 'Ask for repetition when unsure.', detail: 'Repair keeps communication accurate.' }
    ],
    sources: src([
      ['fingerspelling', 'Primary reference for fingerspelling practice and context.'],
      ['alphabet', 'Letter handshapes and movement letters.'],
      ['nmm', 'Facial and head signals during interaction.']
    ]),
    guided: [
      ex('What should a beginner improve first when a partner cannot read a spelled name?', ['Speed', 'Clarity', 'Arm height'], 1, 'Readability comes first.', 'Repeat the letters clearly at a comfortable pace.'),
      ex('Where is a common fingerspelling space?', ['Behind the back', 'Comfortably near the shoulder and in view', 'At the floor'], 1, 'The partner needs to see the hand.', 'Use a visible, comfortable space near the shoulder.'),
      ex('What marks a word boundary in a fingerspelled sequence?', ['A small natural pause', 'Changing hands mid-word', 'Closing the eyes'], 0, 'Think about grouping letters.', 'A small pause can separate words without breaking every letter apart.')
    ],
    challenge: [
      ex('A partner asks you to spell the name again. What is the clearest adjustment?', ['Speed up', 'Repeat more clearly at a steady pace', 'Skip repeated letters'], 1, 'Clarify rather than rush.', 'A slower, clearer repetition is more readable.'),
      ex('When is fingerspelling especially useful?', ['For a proper name or an unfamiliar term', 'For every single word in a sentence', 'Only when a camera is recording'], 0, 'It complements ASL vocabulary.', 'Use it where an exact written form or name is needed.'),
      ex('A spelled sequence contains J. What must remain true?', ['The little finger traces a J path', 'The hand stays still', 'The index finger traces a Z'], 0, 'Movement letters keep their movement.', 'J still requires its J-shaped trace inside a sequence.')
    ],
    revisionExercises: [
      ex('Does fingerspelling replace established ASL signs?', ['No, it complements them', 'Yes, always', 'Only in Level 1'], 0, 'ASL has its own lexicon.', 'Use established signs when appropriate.'),
      ex('What is a healthy response to an unclear name?', ['Ask for clarification', 'Pretend you understood', 'Invent a nickname'], 0, 'Communication repair is normal.', 'Ask the signer to repeat or spell more clearly.'),
      ex('Which letter sequence detail matters most for a beginner?', ['Order and clarity', 'Maximum speed', 'Hiding the palm'], 0, 'Letters must be readable in order.', 'Build a clear sequence before increasing pace.')
    ],
    explanations: {
      'What should a beginner prioritize when fingerspelling?': 'Beginners should prioritise clarity: visible handshapes, a steady sequence, and a readable rhythm. Speed comes later.',
      'Where is a common fingerspelling space?': 'A common starting space is comfortably near the shoulder and in the partner’s view. Keep the hand visible without exaggerating every movement.',
      'When is fingerspelling especially useful?': 'Fingerspelling is especially useful for proper names, unfamiliar terms, and exact written forms. It does not replace established ASL signs.',
      'What can help show a word boundary?': 'A small natural pause between fingerspelled words can show the boundary while still keeping each word’s letters connected.',
      'A person asks you to spell again. What should you do?': 'Repeat the sequence more clearly at a comfortable pace. Faster is not automatically more readable.',
      'Does ASL vocabulary need to be spelled letter by letter?': 'No. ASL has its own vocabulary; fingerspelling is used where a name or exact written form is useful.',
      'What can you do if you do not know a sign?': 'Clarify, ask, or fingerspell when suitable instead of inventing a gesture and presenting it as standard.',
      'What is the goal of readable fingerspelling?': 'The goal is for a partner to identify the letter sequence accurately, not to move as fast as possible.'
    }
  },

  asl_level_03: {
    level: 3,
    title: 'Numbers and Counting',
    objectives: [
      { text: 'Use clear number forms and explain the context that gives a number meaning.', success: 'You can distinguish an age from a count in a short exchange.' },
      { text: 'Explain the palm-orientation convention for 1–5 in isolation versus a series.', success: 'You can say when a forward palm is typical.' },
      { text: 'Confirm an unclear number rather than guessing.', success: 'You can ask for repetition and verify the value.' }
    ],
    vocabulary: [
      { term: 'Quantity', context: 'How many of something; context makes the number interpretable.' },
      { term: 'Series', context: 'A run of numbers such as a phone number or count sequence.' },
      { term: 'Age / time', context: 'Contexts where palm-forward forms are commonly described.' },
      { term: 'Confirmation', context: 'A quick check that prevents a wrong number being accepted.' }
    ],
    signNotes: [
      s('Numbers 1–5 in isolation', {
        handshape: 'Use the conventional number handshape for the value being expressed.',
        palmOrientation: 'Lifeprint notes that casual isolated 1–5 forms are typically produced palm-back by native Deaf adult signers.',
        movement: 'Hold the form clearly in the signing space rather than waving it.',
        nonManualMarkers: 'Keep a neutral face for a statement; use a questioning brow if you are asking “how many?”',
        commonMistake: 'Treating the isolated palm-back convention as universal for every number context.',
        source: 'ASL University numbers 1–10',
        verification: WRITTEN_REFERENCE
      }),
      s('Numbers in a series', {
        handshape: 'Keep each successive number form distinct before moving to the next.',
        palmOrientation: 'Lifeprint describes palm-forward forms for two-or-more-digit numbers, phone numbers, time, ages, and emphasis.',
        movement: 'Produce the sequence at a steady pace with visible resets between values.',
        nonManualMarkers: 'Eye contact and small pauses help the partner follow the series.',
        commonMistake: 'Rushing digits together so boundaries disappear.',
        source: 'ASL University numbers 1–10',
        verification: WRITTEN_REFERENCE
      }),
      s('Two-digit numbers (21–30)', {
        handshape: 'Follow the source demonstration for the tens unit and the ones unit rather than inventing a form.',
        palmOrientation: 'Keep both parts visible in the same signing area.',
        movement: 'Show the units in order and pause briefly at the word boundary.',
        nonManualMarkers: 'Neutral face for stating; questioning expression when asking for the value.',
        commonMistake: 'Assuming English digit order always maps directly without checking a trusted source.',
        source: 'ASL University numbers 21–30',
        verification: LINKED_VIDEO_REVIEW
      })
    ],
    markers: [
      { cue: 'Questioning brows', use: 'Asking for a quantity', example: 'Pair the manual number question with a question face.', caution: 'Do not use the same marking for a simple statement.' },
      { cue: 'Small pause', use: 'Between number groups', example: 'Separate an age from the next topic.', caution: 'Too long a pause can break the sequence.' },
      { cue: 'Emphatic facial/body tension', use: 'Emphasising a number', example: 'Use slightly stronger production when a value matters.', caution: 'Avoid exaggeration that changes the form.' }
    ],
    examples: [
      { situation: 'Stating an age', gloss: 'I AGE [ number ]', meaning: 'The topic AGE tells the listener how to interpret the number.', tip: 'Use the palm-forward convention described for ages.' },
      { situation: 'Counting siblings', gloss: 'SIBLING [ number ]', meaning: 'The family topic makes the number a quantity.', tip: 'Hold the form long enough to be read.' },
      { situation: 'Sharing a phone number', gloss: '[ digit ] [ digit ] [ digit ] …', meaning: 'A series uses a steady rhythm and visible boundaries.', tip: 'Pause at natural group boundaries.' }
    ],
    revision: [
      { text: 'Context tells you what a number means.', detail: 'Age, time, count, and price all use numbers differently.' },
      { text: 'Isolated 1–5 often use a palm-back convention.', detail: 'Series, ages, time, and emphasis commonly use palm-forward forms.' },
      { text: 'Keep number forms visible and distinct.', detail: 'Rushing merges the digits.' },
      { text: 'Confirm unclear numbers.', detail: 'A short check prevents misunderstanding.' }
    ],
    sources: src([
      ['numbers', 'Primary written guidance for 1–10 and palm orientation by context.'],
      ['numbers21', 'Linked video reference for 21–30 forms.'],
      ['sentenceTypes', 'Question-type marking with numbers.']
    ]),
    guided: [
      ex('What helps a listener interpret a number?', ['Conversation context', 'Sleeve colour', 'A random gesture'], 0, 'Numbers need a topic.', 'The surrounding topic tells whether a number is an age, time, count, or price.'),
      ex('According to Lifeprint, when is a palm-forward form commonly used?', ['Only in isolation', 'In series, ages, time, and emphasis', 'Never'], 1, 'Think beyond a single isolated number.', 'Palm-forward forms are described for series and contexts such as ages and time.'),
      ex('What should you do if a number was unclear?', ['Ask for repetition or confirm it', 'Pretend', 'Change the topic'], 0, 'Repair is normal.', 'Confirming the number avoids a wrong assumption.')
    ],
    challenge: [
      ex('You are giving an age. What makes the number meaningful?', ['The AGE topic and a clear number form', 'Fingerspelling the word age only', 'A random hand wave'], 0, 'Context plus production.', 'The topic frames the number; the form must still be readable.'),
      ex('A learner confuses two forms. Which source is best?', ['A trusted ASL reference with video', 'A random image search', 'A guess'], 0, 'Use credible visual evidence.', 'Compare handshape and orientation in a reputable source.'),
      ex('Why pause between groups in a long number?', ['It helps the listener track the sequence', 'It changes the number automatically', 'It hides the hand'], 0, 'Sequence boundaries matter.', 'Small pauses support accurate reading of a series.')
    ],
    revisionExercises: [
      ex('Can the same number value use different palm orientation by context?', ['Yes', 'No, never', 'Only in writing'], 0, 'Context affects production.', 'Lifeprint describes different conventions for isolated forms versus series and ages.'),
      ex('Which practice habit produces clearer numbers?', ['Rush through all values', 'Keep each form visible and distinct', 'Hide the palm'], 1, 'The viewer needs to see it.', 'Distinct, visible forms are easier to read.'),
      ex('What does a questioning expression add to a number question?', ['Question marking', 'A different number value', 'Nothing'], 0, 'Facial grammar matters.', 'Non-manual markers help signal that you are asking.')
    ],
    explanations: {
      'What helps interpret a number in conversation?': 'Conversation context establishes whether the number is an age, time, quantity, or other value. A clear manual form alone does not identify the meaning.',
      'Which can number forms refer to?': 'Number forms can express age, time, quantity, prices, and other numeric information; the topic tells the listener which one is meant.',
      'What should you do if a number is unclear?': 'Ask for repetition or briefly confirm the value. Guessing can turn a small visual miss into a factual misunderstanding.',
      'What is a helpful number practice habit?': 'Keep each number form clear and visible, and practise at a steady pace so the viewer can distinguish the values.',
      'What should guide number form choice?': 'Context and convention should guide production. Lifeprint, for example, describes palm-forward use for series, ages, time, and emphasis.',
      'If two forms are confusing, what should you compare?': 'Compare handshape and palm orientation in a trusted ASL reference, ideally with video, rather than relying on an unverified image.',
      'Which best describes counting in ASL?': 'Use clear number forms and attend to context. ASL number conventions are not simply a word-for-word copy of English counting.',
      'Is context useful when signing quantities?': 'Yes. Context tells the listener what is being counted and how to interpret the number form.'
    }
  },

  asl_level_04: {
    level: 4,
    title: 'Basic Greetings',
    objectives: [
      { text: 'Gain visual attention respectfully before beginning a greeting.', success: 'You wait until the other person is looking.' },
      { text: 'Produce HELLO, THANK YOU, PLEASE, and SORRY with their documented parameters.', success: 'You can describe the handshape, palm, movement, and facial cue for each.' },
      { text: 'Allow a conversational turn after the greeting.', success: 'You pause and respond rather than reciting a script.' }
    ],
    vocabulary: [
      { term: 'Visual attention', context: 'The shared starting point for a face-to-face interaction.' },
      { term: 'HELLO', context: 'A side-to-side wave in the person’s line of sight.' },
      { term: 'THANK YOU', context: 'Flat hand from near the lips forward and down, with a smile.' },
      { term: 'Turn-taking', context: 'Leaving space for the other signer to respond.' }
    ],
    signNotes: [
      s('HELLO', {
        handshape: 'Use a relaxed open hand for the wave.',
        palmOrientation: 'Keep the hand in the person’s visible line of sight.',
        movement: 'Wave side to side; Lifeprint notes there is no single universal wave but a side-to-side wave is typical for hello.',
        nonManualMarkers: 'A natural smile supports the greeting.',
        commonMistake: 'Signing while the other person is not looking, or treating one wave style as the only possible form.',
        source: 'ASL University HELLO / GOODBYE',
        verification: WRITTEN_REFERENCE
      }),
      s('THANK YOU', {
        handshape: 'Use a flat dominant hand.',
        palmOrientation: 'Start near the lips and direct the movement toward the person being thanked.',
        movement: 'Move the hand forward and slightly downward.',
        nonManualMarkers: 'Smile so the thanks is clearly meant.',
        commonMistake: 'Confusing it with the one-handed GOOD sign; Lifeprint notes they look similar but are not the same.',
        source: 'ASL University THANK YOU',
        verification: WRITTEN_REFERENCE
      }),
      s('PLEASE', {
        handshape: 'Use a flat dominant hand over the centre of the chest.',
        palmOrientation: 'Keep the flat hand against the chest area as it circles.',
        movement: 'Move clockwise a few times from the observer’s point of view.',
        nonManualMarkers: 'A pleading expression can replace the manual sign when requesting something.',
        commonMistake: 'Using PLEASE as the only way to make a polite request; Lifeprint discusses YOU MIND? and pleading expression as alternatives.',
        source: 'ASL University PLEASE',
        verification: WRITTEN_REFERENCE
      }),
      s('SORRY', {
        handshape: 'Form the A hand on the dominant hand.',
        palmOrientation: 'Place or hold it at the chest.',
        movement: 'Rotate the hand with a couple of clockwise motions.',
        nonManualMarkers: 'Use a sorry facial expression.',
        commonMistake: 'Using an arbitrary S-shaped gesture with no apologetic expression.',
        source: 'ASL University SORRY',
        verification: WRITTEN_REFERENCE
      })
    ],
    markers: [
      { cue: 'Smile', use: 'HELLO and THANK YOU', example: 'Smile while waving or moving the flat hand outward.', caution: 'Do not replace the manual sign with a smile alone in a formal greeting.' },
      { cue: 'Pleading expression', use: 'Soft request', example: 'Lifeprint notes some signers use a pleading look instead of the manual PLEASE.', caution: 'Match the expression to the request, not to a statement.' },
      { cue: 'Sorry expression', use: 'Apology', example: 'Pair the A-hand rotation with a regretful face.', caution: 'A neutral face weakens the apology.' }
    ],
    examples: [
      { situation: 'Meeting a classmate', gloss: 'HELLO / NAME [ fingerspell ]', meaning: 'Gain attention, greet, then introduce.', tip: 'Pause after HELLO for a response.' },
      { situation: 'Receiving help', gloss: 'THANK YOU', meaning: 'Flat hand moves out from the lips with a smile.', tip: 'Direct the movement toward the person.' },
      { situation: 'Making a request', gloss: 'YOU MIND? / PLEASE', meaning: 'A pleading expression or the manual sign can support a polite request.', tip: 'Choose the form used by the people you are signing with.' }
    ],
    revision: [
      { text: 'Establish visual attention first.', detail: 'A greeting cannot work if the partner cannot see it.' },
      { text: 'HELLO uses a visible side-to-side wave.', detail: 'Lifeprint notes variation in wave style.' },
      { text: 'THANK YOU starts near the lips and moves forward/down.', detail: 'Smile to show it is meant.' },
      { text: 'SORRY pairs the A-hand rotation with a sorry face.', detail: 'The face is part of the message.' }
    ],
    sources: src([
      ['hello', 'Description of wave direction and variation.'],
      ['thankyou', 'Handshape, path, and facial cue for THANK YOU.'],
      ['please', 'PLEASE and alternative request strategies.'],
      ['sorry', 'A-hand rotation and apologetic expression.']
    ]),
    guided: [
      ex('What should happen before a visual greeting?', ['Grab the person', 'Establish attention respectfully', 'Sign behind them'], 1, 'ASL is visual.', 'Wait until the person can see you; use an appropriate visual cue.'),
      ex('How is THANK YOU produced in the cited source?', ['Flat hand near lips moving forward and down', 'Fist at chest circling', 'Two index fingers tapping'], 0, 'Think of blowing a kiss without puckering.', 'The flat hand starts near the lips and moves forward and slightly down.'),
      ex('Which expression supports SORRY?', ['A surprised face', 'No expression', 'A sorry facial expression'], 2, 'The face carries meaning.', 'Lifeprint explicitly calls for a sorry facial expression.')
    ],
    challenge: [
      ex('A learner waves while their partner is looking away. What should change?', ['Gain visual attention first', 'Wave faster', 'Use a bigger wave'], 0, 'Visibility comes first.', 'A respectful attention cue makes the greeting available.'),
      ex('Which greeting detail is documented for HELLO?', ['A tap on the shoulder', 'A generally side-to-side wave', 'A closed fist only'], 1, 'Lifeprint describes waving side to side.', 'A side-to-side wave is typical, though wave styles vary.'),
      ex('After introducing yourself, what supports turn-taking?', ['Pause for the other signer', 'Keep signing without looking', 'Turn away'], 0, 'Conversation is shared.', 'A pause gives the other person room to respond.')
    ],
    revisionExercises: [
      ex('Is ASL only hand gestures?', ['Yes', 'Only in greetings', 'No; face and body matter too'], 2, 'Think about NMMs.', 'Facial expression and body signals carry information in ASL.'),
      ex('Which sign uses an A hand rotated on the chest?', ['SORRY', 'HELLO', 'THANK YOU'], 0, 'Pair it with a sorry face.', 'Lifeprint describes SORRY with an A hand and clockwise rotation.'),
      ex('Why smile during THANK YOU?', ['It shows the thanks is meant', 'It replaces the sign', 'It makes the hand flat'], 0, 'The source explicitly notes this.', 'A smile helps the recipient know you mean it.')
    ],
    explanations: {
      'What should happen before beginning a visual conversation?': 'Gain visual attention respectfully. Since ASL is visual, signing to someone who is not looking does not make the greeting available.',
      'What can facial expression contribute?': 'Facial expression can carry grammatical and conversational information, such as a smile with thanks or a sorry expression with an apology.',
      'What is important after a greeting?': 'Allow the other signer a turn. Pausing and looking at your partner makes the exchange interactive rather than a monologue.',
      'How may you get a signer’s attention?': 'Use a visual cue in their line of sight or another agreed respectful method. Do not grab or start while they are looking away.',
      'Is ASL only hand gestures?': 'No. ASL uses hands, face, body, space, and movement together.',
      'What is a respectful greeting practice?': 'Make the interaction visually accessible and respect the other person’s attention and space.',
      'Why use a pause in a greeting?': 'A pause gives the other signer an opportunity to respond and supports natural turn-taking.',
      'What can eye gaze support?': 'Eye gaze supports visual attention and turn-taking; it tells your partner that the interaction is directed to them.'
    }
  },

  asl_level_05: {
    level: 5,
    title: 'Everyday Vocabulary',
    objectives: [
      { text: 'Connect everyday signs to real situations rather than isolated English labels.', success: 'You can use WATER, EAT, DRINK, HOME, HELP, and WANT in a short scenario.' },
      { text: 'Describe handshape, palm orientation, and movement from credible references.', success: 'You can compare two signs using those parameters.' },
      { text: 'Handle regional variation by checking context and asking respectfully.', success: 'You do not label an unfamiliar variant as an error.' }
    ],
    vocabulary: [
      { term: 'Context', context: 'The situation that selects the right sign or meaning.' },
      { term: 'Regional variation', context: 'A real feature of living languages; ask about local usage.' },
      { term: 'Request', context: 'A communicative purpose, often supported by expression.' },
      { term: 'Clarification', context: 'A respectful way to check meaning.' }
    ],
    signNotes: [
      s('WATER', {
        handshape: 'Form the dominant hand into the letter W.',
        palmOrientation: 'Bring the hand to the mouth with the index finger oriented toward the lips.',
        movement: 'Touch the index finger to the mouth twice.',
        nonManualMarkers: 'A natural questioning or thirsty expression can support the context.',
        commonMistake: 'Using a generic cup gesture and presenting it as the cited sign.',
        source: 'ASL University WATER',
        verification: WRITTEN_REFERENCE
      }),
      s('EAT / FOOD', {
        handshape: 'Use a squished O hand as if placing food at the mouth.',
        palmOrientation: 'Keep the hand oriented toward the mouth.',
        movement: 'Lifeprint distinguishes a single motion for EAT from a double motion for FOOD, while noting interchangeable use in practice.',
        nonManualMarkers: 'Keep a natural face; a chewing exaggeration is not required.',
        commonMistake: 'Assuming the noun/verb distinction is always rigid in real use.',
        source: 'ASL University EAT / FOOD',
        verification: WRITTEN_REFERENCE
      }),
      s('DRINK', {
        handshape: 'Form the dominant hand into a C shape.',
        palmOrientation: 'Orient the C toward the mouth.',
        movement: 'Move the hand to the mouth in a short arc.',
        nonManualMarkers: 'A natural drinking context supplies meaning.',
        commonMistake: 'Using the alcohol variant (a Y hand in the cited source) for all drinks.',
        source: 'ASL University DRINK',
        verification: WRITTEN_REFERENCE
      }),
      s('HOME', {
        handshape: 'Bring the fingers and thumb together.',
        palmOrientation: 'Touch the cheek near the side of the mouth, then move toward the ear.',
        movement: 'Touch the cheek, move an inch or two, and touch again; one-contact and ear-to-mouth variants are also described.',
        nonManualMarkers: 'Neutral face for a statement about home.',
        commonMistake: 'Treating one of the documented variants as the only possible form.',
        source: 'ASL University HOME',
        verification: WRITTEN_REFERENCE
      }),
      s('HELP', {
        handshape: 'Use a loose-A hand (or S hand in some versions) with the other hand lifting it.',
        palmOrientation: 'The supporting hand lifts the active hand; sources note hand-choice variation.',
        movement: 'Lift the active hand with the other hand.',
        nonManualMarkers: 'Use an expression that matches a real request or offer.',
        commonMistake: 'Claiming only one hand choice is correct when Lifeprint documents variation.',
        source: 'ASL University HELP',
        verification: WRITTEN_REFERENCE
      }),
      s('WANT / NEED', {
        handshape: 'WANT starts with 5 hands and changes to claw shapes; NEED uses an X handshape.',
        palmOrientation: 'WANT starts palms up; NEED starts palm forward and ends palm down.',
        movement: 'WANT draws the hands back toward you; NEED bends the X hand downward at the wrist.',
        nonManualMarkers: 'Stronger expression signals a stronger need or imperative.',
        commonMistake: 'Using one generic “want” gesture for every request and obligation.',
        source: 'ASL University WANT and NEED',
        verification: WRITTEN_REFERENCE
      })
    ],
    markers: [
      { cue: 'Requesting expression', use: 'WANT or HELP', example: 'Pair the manual sign with a natural request look.', caution: 'Do not use an unrelated exaggerated face.' },
      { cue: 'Stronger expression', use: 'NEED as must/have-to', example: 'A single strong NEED movement can signal little choice.', caution: 'A double movement is described as softer, like ought-to.' },
      { cue: 'Neutral statement face', use: 'HOME or EAT in a routine description', example: 'Keep the face relaxed while sequencing activities.', caution: 'Do not add question marking to a statement.' }
    ],
    examples: [
      { situation: 'Asking for a drink', gloss: 'I THIRSTY WATER WHERE?', meaning: 'A Lifeprint example combines thirst and a location question.', tip: 'Use the W hand at the mouth twice.' },
      { situation: 'Offering assistance', gloss: 'HELP?', meaning: 'The lifted-hand sign plus an inverted face checks whether help is needed.', tip: 'Respect the answer.' },
      { situation: 'Describing a routine', gloss: 'HOME / EAT / WORK', meaning: 'Everyday vocabulary becomes meaningful in a sequence.', tip: 'Keep the signs visible and ordered.' }
    ],
    revision: [
      { text: 'Learn signs in situations.', detail: 'Meaning is easier to retain when the sign solves a real communicative need.' },
      { text: 'Check handshape, palm, and movement.', detail: 'These parameters distinguish WATER, DRINK, and EAT.' },
      { text: 'Variation is not automatically error.', detail: 'Check region and ask local signers.' },
      { text: 'Use reputable sources.', detail: 'Community usage and trusted references guide learning.' }
    ],
    sources: src([
      ['water', 'W hand and double mouth contact.'],
      ['eat', 'Squished-O hand and single/double movement distinction.'],
      ['drink', 'C hand and short arc to the mouth.'],
      ['home', 'Cheek-to-ear variants.'],
      ['help', 'Loose-A/S hand and documented variation.'],
      ['want', '5-to-claw handshapes and reversal for negation.'],
      ['need', 'X handshape and wrist movement.']
    ]),
    guided: [
      ex('Which sign uses a W hand touching the mouth twice?', ['WATER', 'DRINK', 'EAT'], 0, 'The memory aid is “tap water”.', 'Lifeprint describes WATER with a W hand and two index-finger contacts at the mouth.'),
      ex('How does DRINK differ from WATER in the cited source?', ['DRINK uses a C hand and short arc', 'DRINK uses a W hand twice', 'DRINK has no handshape'], 0, 'Think of holding a small glass.', 'DRINK uses a C hand moving in a short arc to the mouth.'),
      ex('What should you do when two trusted sources show different forms?', ['Check context and ask signers', 'Call one fake', 'Mix them randomly'], 0, 'Variation is real.', 'Document the context and learn the local usage respectfully.')
    ],
    challenge: [
      ex('A learner signs one generic gesture for every “want” idea. What is the issue?', ['It ignores distinct signs such as WANT and NEED', 'It is faster', 'It is required'], 0, 'Parameters and meaning matter.', 'WANT and NEED have different handshapes, orientations, and movements.'),
      ex('What does Lifeprint say about HELP hand choice?', ['Only the right hand is ever correct', 'Several forms are documented', 'Hands are not used'], 1, 'The source notes variation.', 'Lifeprint describes variations and advises following local usage while learning from Deaf signers.'),
      ex('Why pair NEED with a stronger expression for “must”?', ['Degree of obligation can be expressed non-manually', 'It changes the handshape to W', 'It hides the movement'], 0, 'The face can grade meaning.', 'Lifeprint notes stronger facial expression for a stronger imperative.')
    ],
    revisionExercises: [
      ex('Can one English word map to exactly one ASL sign in every context?', ['No; meaning and context matter', 'Yes, always', 'Only in dictionaries'], 0, 'Languages do not map word-for-word.', 'Choose signs based on meaning and context.'),
      ex('Which source is important for natural community usage?', ['Deaf ASL signers', 'Random image search', 'A mock predictor'], 0, 'Language belongs to its community.', 'Learn from Deaf signers and reputable references.'),
      ex('What is the movement for WATER?', ['Index finger touches the mouth twice', 'Fist circles the chest', 'Index traces a Z'], 0, 'Remember “tap water”.', 'The W hand’s index finger contacts the mouth twice.')
    ],
    explanations: {
      'How should a learner handle regional vocabulary variants?': 'Record the region or source, check the context, and ask local Deaf signers. Treat variation as a normal feature of a living language.',
      'What helps remember everyday vocabulary?': 'Using a sign in a meaningful everyday situation connects the form with a communicative purpose instead of an isolated English label.',
      'Can every English word map to one ASL sign?': 'No. Meaning, context, and regional usage affect sign choice; languages do not translate word-for-word.',
      'What can you do when a sign is unknown?': 'Ask, clarify, or fingerspell when appropriate rather than inventing a gesture and calling it standard.',
      'Who is an important source for community usage?': 'Deaf ASL signers are essential sources for natural usage, alongside reputable educational references.',
      'Should a variant be treated automatically as an error?': 'No. Variation is real; check the region, context, and source before judging a form.',
      'What should vocabulary practice focus on?': 'Focus on meaning and use in context, supported by credible references and community feedback.',
      'What is a good way to learn local usage?': 'Ask respectfully, observe context, and learn from local Deaf signers.'
    }
  }
};
