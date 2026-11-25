const REFERENCE_URL = 'https://www.lifeprint.com/asl101/fingerspelling/abc.htm';

const STATIC_MOVEMENT = 'Hold the handshape steady; this letter does not add a tracing movement.';

// Descriptions are expanded from the same Lifeprint handshape/identification guidance used above.
// No unverified image is inferred or generated.
const alphabet = [
  ['A', 'Close the fingers into a fist. Rest the thumb alongside the index finger, not across the fingertips.', 'Keep the thumb visible along the side of the fist.', 'Avoid hiding the thumb inside the fist.', 'Fist with the thumb visible along the side of the index finger.', STATIC_MOVEMENT, 'Keep the thumb beside the fist so A does not become S.'],
  ['B', 'Hold the four fingers straight and together. Fold the thumb across the palm.', 'The palm is open and the fingertips point upward.', 'Do not spread the fingers or leave the thumb sticking out.', 'Open palm facing forward, four fingers straight together, thumb folded across the palm.', STATIC_MOVEMENT, 'Think of a flat wall: palm forward and fingers aligned.'],
  ['C', 'Curve the fingers and thumb into a rounded C shape, with a visible gap between them.', 'Keep the curved fingers together and the thumb opposite them.', 'Avoid closing the hand into an O.', 'Curved fingers and thumb opposite one another with an open gap.', STATIC_MOVEMENT, 'Keep the gap open so C does not close into O.'],
  ['D', 'Extend the index finger upward. Bring the other fingertips together with the thumb to form a small circle.', 'The index finger stays straight while the other fingers meet the thumb.', 'Do not extend the middle finger with the index.', 'Index finger upright; the remaining fingertips meet the thumb in a circle.', STATIC_MOVEMENT, 'Only the index is raised; the circle comes from the other fingers and thumb.'],
  ['E', 'Bend all four fingers so their tips angle toward the thumb. The thumb rests across the curled fingers.', 'The fingertips curl toward the palm and thumb.', 'Do not make a tight fist; keep the bent fingertips visible.', 'Curled fingertips angle toward the palm and thumb, which rests across them.', STATIC_MOVEMENT, 'Keep the bent fingertips visible instead of closing into a fist.'],
  ['F', 'Touch the thumb and index fingertip to make a circle. Extend the other three fingers.', 'The thumb-index circle and three raised fingers are distinct.', 'Do not fold the three extended fingers.', 'Thumb and index touch in a circle; the other three fingers extend upward.', STATIC_MOVEMENT, 'Count three extended fingers above the thumb-index circle.'],
  ['G', 'Extend the index finger and thumb horizontally in parallel; curl the remaining fingers.', 'The two extended digits point sideways, not upward.', 'Avoid turning this into an L shape.', 'Index and thumb extended sideways and parallel; other fingers curled.', STATIC_MOVEMENT, 'Point the two fingers sideways, not upward, to avoid L.'],
  ['H', 'Extend the index and middle fingers together horizontally; curl the other fingers and keep the thumb folded.', 'The two straight fingers stay side by side and point sideways.', 'Do not separate the two extended fingers.', 'Index and middle extended together sideways; other fingers and thumb folded.', STATIC_MOVEMENT, 'Keep the two extended fingers side by side.'],
  ['I', 'Make a fist and extend only the little finger.', 'The little finger points upward and the thumb stays folded.', 'Check that the ring finger remains curled.', 'Fist with only the little finger extended upward.', STATIC_MOVEMENT, 'Check that the ring finger stays curled.'],
  ['J', 'Begin with the I handshape: a fist with the little finger extended. Move the little fingertip through a J-shaped path in the air.', 'This letter requires movement: trace the curve and hook of a J with the little finger.', 'A still I handshape is not the whole letter J.', 'Begins like I: a fist with the little finger extended.', 'Trace a J-shaped curve in the air with the little fingertip.', 'The movement is part of the letter; a still I handshape is not J.'],
  ['K', 'Extend the index and middle fingers upward in a V. Place the thumb between them, touching the middle finger; curl the other fingers.', 'The thumb contacts the middle finger between the two raised fingers.', 'Do not confuse K with a V that has no thumb contact.', 'Index and middle raised in a V with the thumb touching the middle finger between them.', STATIC_MOVEMENT, 'The thumb contact is what makes K different from a plain V.'],
  ['L', 'Extend the thumb and index finger at right angles. Curl the other three fingers.', 'The thumb and index make a clear L corner.', 'Avoid extending the middle finger.', 'Thumb and index form a right angle; the other fingers are curled.', STATIC_MOVEMENT, 'Make a clear corner with the thumb and index finger.'],
  ['M', 'Curl the fingers over the thumb so the thumb tip comes out beneath the first three fingers.', 'The thumb is tucked under three fingers.', 'Do not tuck the thumb under only one or two fingers.', 'Fist with the thumb tucked beneath three fingers.', STATIC_MOVEMENT, 'Count three fingers covering the thumb.'],
  ['N', 'Curl the fingers over the thumb so the thumb tip comes out beneath the first two fingers.', 'The thumb is tucked under two fingers.', 'Distinguish N from M by how many fingers cover the thumb.', 'Fist with the thumb tucked beneath two fingers.', STATIC_MOVEMENT, 'Count two fingers covering the thumb to distinguish N from M.'],
  ['O', 'Curve the fingers and thumb until their tips meet in a rounded shape.', 'The fingertips meet the thumb to make a closed, rounded outline.', 'Keep the hand curved rather than flattening it into B.', 'Fingers and thumb curved until their tips meet in a rounded outline.', STATIC_MOVEMENT, 'Keep a rounded O with tips touching, not a flat B.'],
  ['P', 'Form the K handshape, then orient the hand downward.', 'It is the K configuration turned down, not a new finger arrangement.', 'Remember both the K handshape and the downward orientation.', 'K handshape turned downward.', STATIC_MOVEMENT, 'Remember both the K configuration and the downward direction.'],
  ['Q', 'Form the G handshape, then orient the hand downward.', 'The index and thumb remain extended in parallel while pointing down.', 'Do not confuse Q with a downward-pointing single index.', 'G handshape turned downward with index and thumb parallel.', STATIC_MOVEMENT, 'Two parallel fingers point down, not one.'],
  ['R', 'Extend the index and middle fingers and cross the index over the middle finger; curl the remaining fingers.', 'The two extended fingers visibly cross.', 'Do not simply hold an uncrossed V.', 'Index crossed over the middle finger; remaining fingers curled.', STATIC_MOVEMENT, 'The crossing must be visible; an uncrossed V is not R.'],
  ['S', 'Close the fingers into a fist and lay the thumb across the front of the fingers.', 'The thumb crosses the curled fingers rather than resting beside them.', 'Avoid using the A thumb position.', 'Fist with the thumb laid across the front of the curled fingers.', STATIC_MOVEMENT, 'The thumb crosses the fingers, unlike A where it sits beside them.'],
  ['T', 'Close the fingers into a fist and place the thumb between the index and middle fingers.', 'A small part of the thumb is visible between those two fingers.', 'Do not place the thumb over the front of all fingers as in S.', 'Fist with the thumb between the index and middle fingers.', STATIC_MOVEMENT, 'Only a small part of the thumb shows between two fingers.'],
  ['U', 'Extend the index and middle fingers together; curl the other fingers and fold the thumb.', 'The two fingers are straight, close together, and point upward.', 'Do not separate them into a V.', 'Index and middle extended together and upright; thumb folded.', STATIC_MOVEMENT, 'Keep the two fingers touching; separating them makes V.'],
  ['V', 'Extend the index and middle fingers apart in a V; curl the other fingers and fold the thumb.', 'The two raised fingers are separated.', 'Do not keep the fingers together as in U.', 'Index and middle extended apart in a V; thumb folded.', STATIC_MOVEMENT, 'Open a clear gap between the two fingers.'],
  ['W', 'Extend the index, middle, and ring fingers; curl the little finger and fold the thumb.', 'Three adjacent fingers point upward.', 'Check that the little finger remains curled.', 'Index, middle and ring fingers extended upright; little finger curled and thumb folded.', STATIC_MOVEMENT, 'Three fingers up, little finger down.'],
  ['X', 'Curl the index finger into a hook while the other fingers curl into the palm and the thumb rests across them.', 'The bent index finger is the distinguishing feature.', 'Do not extend the index straight.', 'Index finger curved into a hook; other fingers curled and thumb across them.', STATIC_MOVEMENT, 'Hook the index rather than pointing it straight.'],
  ['Y', 'Extend the thumb and little finger while curling the middle three fingers.', 'The thumb and little finger point out in opposite directions.', 'Keep the middle three fingers tucked in.', 'Thumb and little finger extended in opposite directions; middle three fingers curled.', STATIC_MOVEMENT, 'Only the thumb and little finger are out.'],
  ['Z', 'Extend the index finger and trace a Z path in the air: across, diagonal back, then across again.', 'This letter requires movement: the index finger draws the three strokes of Z.', 'A still index finger is not the whole letter Z.', 'Index finger extended forward.', 'Trace a Z in the air: across, diagonal back, then across again.', 'The three strokes are essential; a still index finger is not Z.']
].map(([letter, handshape, identification, commonMistake, orientation, movement, tip]) => ({
  letter,
  handshape,
  identification,
  orientation,
  movement,
  tip,
  demonstration: {
    status: 'LINKED_REFERENCE',
    label: `Verified ${letter} handshape reference`,
    referenceUrl: REFERENCE_URL,
    description: 'Open the ASL University handshape chart for a visual demonstration. No unverified image is embedded.'
  },
  commonMistake
}));

const levels = [
  {
    title: 'ASL Alphabet A–Z',
    description: 'Learn the 26 manual letters, recognize handshape differences, and trace the movement in J and Z.',
    concept: 'The ASL manual alphabet represents English letters. Fingerspelling is useful for names and words without a known sign; it does not replace ASL vocabulary or grammar.',
    vocabulary: ['handshape', 'orientation', 'movement', 'fingerspelling'],
    lesson: 'Compare neighboring handshapes slowly. Letters that look alike are distinguished by finger selection, contact, orientation, or movement. J and Z must be traced, not held still.',
    exercises: [
      { prompt: 'Which letter uses a little finger that traces a J in the air?', options: ['I', 'J', 'Y'], answer: 1, hint: 'Start with the I handshape, then move.', feedback: 'J begins with the I handshape and adds a J-shaped movement.' },
      { prompt: 'What distinguishes U from V?', options: ['U fingers are together; V fingers are apart.', 'U uses three fingers; V uses two.', 'U moves in a circle.'], answer: 0, hint: 'Look at the space between the index and middle fingers.', feedback: 'U keeps the two raised fingers together; V separates them.' },
      { prompt: 'Which two letters need a movement path rather than only a held shape?', options: ['A and B', 'J and Z', 'M and N'], answer: 1, hint: 'One traces a J and the other traces a zigzag.', feedback: 'J and Z are movement-based letters.' }
    ],
    challenge: [
      { prompt: 'A learner holds up an unmoving little finger for J. What is missing?', options: ['The J-shaped tracing movement', 'A second hand', 'A closed fist with no extended finger'], answer: 0, hint: 'J is not static.', feedback: 'Trace the J path with the little fingertip.' },
      { prompt: 'Which pair is distinguished by the thumb being tucked under two fingers versus three?', options: ['M and N', 'C and O', 'U and V'], answer: 0, hint: 'Count the fingers covering the thumb.', feedback: 'M covers the thumb with three fingers; N with two.' }
    ],
    revision: [
      { prompt: 'Which handshape has thumb and index extended at a right angle?', options: ['L', 'Y', 'F'], answer: 0, hint: 'Think of the shape of the letter.', feedback: 'L forms a right angle with the thumb and index finger.' },
      { prompt: 'How is Z produced?', options: ['Trace a Z with the extended index finger.', 'Hold the index finger still.', 'Wiggle the thumb.'], answer: 0, hint: 'It is one of the movement letters.', feedback: 'Trace the three strokes of a Z in the air.' }
    ]
  },
  {
    title: 'Fingerspelling and Word Formation',
    description: 'Build clear letter sequences, spell names, and read fingerspelled words without confusing speed with fluency.',
    concept: 'Fingerspelling strings letters together for proper names, borrowed words, and concepts that may not have a known sign.',
    vocabulary: ['name', 'loan sign', 'fingerspelling', 'dominant hand', 'letter sequence'],
    lesson: 'Keep a comfortable, consistent signing space near the shoulder. Spell in order, use a small natural rhythm, and pause at word boundaries. Do not bounce each letter or rush a sequence before it is clear.',
    exercises: [
      { prompt: 'What is a useful first step when fingerspelling an unfamiliar name?', options: ['Spell it clearly at a comfortable pace.', 'Make up a sign.', 'Move the hand behind the body.'], answer: 0, hint: 'Clarity comes before speed.', feedback: 'Spell unfamiliar names clearly and invite clarification when needed.' },
      { prompt: 'Where is a common signing space for fingerspelling?', options: ['Comfortably near the shoulder', 'Behind the back', 'At the floor'], answer: 0, hint: 'Keep the hand visible and in a natural signing space.', feedback: 'Use a visible, comfortable space near the shoulder.' },
      { prompt: 'What helps separate two fingerspelled words?', options: ['A small pause and natural rhythm', 'A large arm swing after every letter', 'Changing hands mid-word'], answer: 0, hint: 'Think about word boundaries.', feedback: 'A small pause can make word boundaries clearer.' }
    ],
    challenge: [
      { prompt: 'A partner asks you to spell a name again. What is the clearest response?', options: ['Repeat it more clearly and at a comfortable pace.', 'Speed up.', 'Skip letters.'], answer: 0, hint: 'Prioritize readability.', feedback: 'Repeat clearly; do not assume faster is clearer.' },
      { prompt: 'When should fingerspelling usually be used?', options: ['For proper names or words without a known sign', 'For every word in every sentence', 'Only as a camera test'], answer: 0, hint: 'ASL has signs and its own grammar; fingerspelling has specific uses.', feedback: 'Use it where a name or lexical item calls for it.' }
    ],
    revision: [
      { prompt: 'Should fingerspelling replace ASL vocabulary?', options: ['No; use established signs when appropriate.', 'Yes, spell every sentence.', 'Only when signing slowly.'], answer: 0, hint: 'ASL is a language, not signed English.', feedback: 'Fingerspelling complements ASL vocabulary; it does not replace it.' },
      { prompt: 'What matters more for a beginner: clarity or speed?', options: ['Clarity', 'Speed', 'Large movements'], answer: 0, hint: 'Make each letter readable.', feedback: 'Build accuracy and clarity before increasing speed.' }
    ]
  },
  {
    title: 'Numbers and Counting',
    description: 'Recognize number forms, practice number sequences, and use context to distinguish a count from a quantity.',
    concept: 'Number forms and conventions vary with context, region, and signer. Establish the topic and use a reputable ASL reference rather than assuming English counting rules map one-to-one.',
    vocabulary: ['number', 'quantity', 'age', 'time', 'sequence'],
    lesson: 'Practice number forms with a relaxed wrist and clearly shaped fingers. Numbers may be used for counting, age, time, prices, and addresses; context helps the listener interpret them.',
    exercises: [
      { prompt: 'What should guide your choice of number form?', options: ['The context, such as age, time, or counting', 'A guess based on English spelling', 'Whether the camera is on'], answer: 0, hint: 'Numbers are used for different purposes.', feedback: 'Context influences number use and interpretation.' },
      { prompt: 'What is helpful when practicing a number sequence?', options: ['Clear, distinct handshapes', 'Hiding the hand', 'Changing the number order'], answer: 0, hint: 'A listener needs to see each form.', feedback: 'Keep number forms clear and visible.' },
      { prompt: 'If a number is unclear in conversation, what is a good strategy?', options: ['Ask for clarification or repetition.', 'Pretend you understood.', 'Change the subject.'], answer: 0, hint: 'Repairing communication is part of conversation.', feedback: 'Ask for the number again or confirm it.' }
    ],
    challenge: [
      { prompt: 'You are signing an age. What helps make the number meaningful?', options: ['The surrounding context and clear number form', 'Fingerspelling the word age only', 'A random gesture'], answer: 0, hint: 'Numbers function within a topic.', feedback: 'Context and a clear form help communicate an age.' },
      { prompt: 'A beginner confuses two number forms. What should they do?', options: ['Compare the handshape and orientation in a trusted reference.', 'Invent a new form.', 'Rely on an unsupported recognizer.'], answer: 0, hint: 'Compare observable features using a reliable source.', feedback: 'Study the handshape and orientation from a trusted ASL source.' }
    ],
    revision: [
      { prompt: 'Which is most useful for interpreting a number?', options: ['Conversation context', 'The color of the learner’s shirt', 'A guess'], answer: 0, hint: 'Numbers can express age, time, quantity, and more.', feedback: 'Context helps establish what a number refers to.' },
      { prompt: 'What is a good practice habit for numbers?', options: ['Review at a steady pace and keep forms visible.', 'Rush through all forms.', 'Practice without checking a reference.'], answer: 0, hint: 'Build a reliable visual contrast.', feedback: 'Steady practice supports distinct, readable forms.' }
    ]
  },
  {
    title: 'Basic Greetings',
    description: 'Open and close a short interaction with attention, introductions, and courteous conversational turns.',
    concept: 'ASL greetings are visual and interactive. Gain attention respectfully, make eye contact where culturally appropriate, and use facial expression as part of communication.',
    vocabulary: ['hello', 'goodbye', 'name', 'meet', 'please', 'thank you'],
    lesson: 'A greeting is more than a memorized hand motion: establish visual attention, greet the person, introduce yourself, and give the other signer time to respond.',
    exercises: [
      { prompt: 'How can you respectfully get a signer’s attention?', options: ['Wave in their line of sight or use another agreed visual cue.', 'Shout from behind them.', 'Grab their hand.'], answer: 0, hint: 'ASL is a visual language.', feedback: 'Use an appropriate visual cue; do not grab someone.' },
      { prompt: 'What supports a greeting in ASL?', options: ['Visual attention and an opportunity to respond', 'Looking away throughout', 'Moving through the greeting without a pause'], answer: 0, hint: 'Conversation is shared and visual.', feedback: 'Make space for the other person to respond.' },
      { prompt: 'Why can facial expression matter?', options: ['It carries grammatical and conversational information.', 'It is always decorative.', 'It replaces every handshape.'], answer: 0, hint: 'ASL uses more than the hands.', feedback: 'Facial expression can contribute meaningful linguistic information.' }
    ],
    challenge: [
      { prompt: 'You begin a conversation with a Deaf signer. What should come first?', options: ['Establish visual attention respectfully.', 'Start signing while they look away.', 'Assume they can hear you.'], answer: 0, hint: 'Make sure communication is visually available.', feedback: 'Get visual attention before beginning.' },
      { prompt: 'After introducing yourself, what is conversationally helpful?', options: ['Pause and allow the other person a turn.', 'Continue without checking in.', 'Turn away.'], answer: 0, hint: 'A conversation has turn-taking.', feedback: 'Pause so the other signer can respond.' }
    ],
    revision: [
      { prompt: 'Is ASL only a set of hand gestures?', options: ['No; it uses facial expression, space, and movement too.', 'Yes, only fingers matter.', 'Only in greetings.'], answer: 0, hint: 'Consider non-manual features.', feedback: 'ASL uses hands, face, body, space, and movement.' },
      { prompt: 'What is a respectful way to begin when someone is not looking?', options: ['Use a visual attention-getter.', 'Touch their face.', 'Start a camera model.'], answer: 0, hint: 'Gain attention without startling or grabbing.', feedback: 'Use a visual cue in an appropriate way.' }
    ]
  },
  {
    title: 'Everyday Vocabulary',
    description: 'Build a practical vocabulary set around food, places, objects, and routine needs while learning to use context.',
    concept: 'A sign can have multiple meanings depending on context and region. Learn signs in meaningful situations, not as isolated English-to-sign substitutions.',
    vocabulary: ['food', 'water', 'home', 'school', 'work', 'help', 'want', 'need'],
    lesson: 'Group vocabulary by situation. When a sign has regional variants, note the source and community instead of treating one form as universal.',
    exercises: [
      { prompt: 'How should a learner handle a regional sign variant?', options: ['Record the region or source and ask local signers.', 'Declare one version universally correct.', 'Use a random image.'], answer: 0, hint: 'Languages vary across communities.', feedback: 'Document variation and learn from the local Deaf community.' },
      { prompt: 'What makes a vocabulary item easier to remember?', options: ['Use it in a meaningful everyday situation.', 'Memorize a disconnected English list only.', 'Avoid context.'], answer: 0, hint: 'Connect words with communicative purpose.', feedback: 'Situational practice helps connect a sign with meaning.' },
      { prompt: 'If you do not know a sign, what is appropriate?', options: ['Ask, clarify, or fingerspell when suitable.', 'Invent and present a gesture as standard.', 'Pretend to understand.'], answer: 0, hint: 'Be transparent and keep communication open.', feedback: 'Clarify or fingerspell when appropriate.' }
    ],
    challenge: [
      { prompt: 'A sign differs between two trusted references. What is the best next step?', options: ['Check region, context, and source; ask a signer.', 'Assume one reference is fake.', 'Combine them randomly.'], answer: 0, hint: 'Variation is real in languages.', feedback: 'Check the context and consult Deaf signers.' },
      { prompt: 'When practicing “help” vocabulary, what should you connect it to?', options: ['A real situation where help is needed', 'Only its English spelling', 'A camera score'], answer: 0, hint: 'Practice meaning, not only memorization.', feedback: 'Situational context makes the vocabulary useful.' }
    ],
    revision: [
      { prompt: 'Can one English word always map to one ASL sign?', options: ['No; meaning and context matter.', 'Yes, always.', 'Only in writing.'], answer: 0, hint: 'Languages do not map word-for-word.', feedback: 'Choose signs based on meaning and context.' },
      { prompt: 'Who is an important source for natural community usage?', options: ['Deaf ASL signers', 'A random gesture generator', 'An unsupported model'], answer: 0, hint: 'Language belongs to its community.', feedback: 'Learn from Deaf signers and reputable references.' }
    ]
  },
  {
    title: 'People, Family and Relationships',
    description: 'Talk about people and relationships, identify roles, and use respectful ways to ask about someone’s family.',
    concept: 'Relationship vocabulary is shaped by context, identity, and community. Do not assume family structure, pronouns, or a person’s preferred labels.',
    vocabulary: ['family', 'parent', 'sibling', 'friend', 'partner', 'child', 'person'],
    lesson: 'Introduce who someone is in context and allow people to describe their own relationships. Fingerspell names when needed and respect personal boundaries.',
    exercises: [
      { prompt: 'What is respectful when asking about family?', options: ['Use an open question and accept the person’s own terms.', 'Assume everyone has the same family structure.', 'Demand private details.'], answer: 0, hint: 'Let people define their relationships.', feedback: 'Use respectful questions and the terms people choose.' },
      { prompt: 'How can you introduce a person whose name sign you do not know?', options: ['Fingerspell their name if appropriate.', 'Invent a name sign.', 'Use a random nickname.'], answer: 0, hint: 'Names belong to people and communities.', feedback: 'Fingerspell the name; do not invent a name sign.' },
      { prompt: 'What should you do with a name sign?', options: ['Use one given by the person or community.', 'Create one for a stranger.', 'Treat it as a spelling shortcut.'], answer: 0, hint: 'Name signs have social and cultural meaning.', feedback: 'Do not assign a name sign yourself.' }
    ],
    challenge: [
      { prompt: 'A learner wants to assign a name sign to a new friend. What should they do?', options: ['Wait; name signs are not casually self-assigned by strangers.', 'Choose one based on appearance.', 'Use the first letter only.'], answer: 0, hint: 'Name signs carry community meaning.', feedback: 'Do not invent or assign another person’s name sign.' },
      { prompt: 'How should you refer to someone’s relationship?', options: ['Use the terms the person uses.', 'Assume based on appearance.', 'Avoid asking permission.'], answer: 0, hint: 'Respect self-identification.', feedback: 'Follow the person’s own language for their relationships.' }
    ],
    revision: [
      { prompt: 'Is it appropriate to invent a name sign for someone?', options: ['No; use a name sign given by the person/community.', 'Yes, whenever convenient.', 'Only for family.'], answer: 0, hint: 'Name signs are culturally meaningful.', feedback: 'Do not invent name signs for other people.' },
      { prompt: 'What is a respectful way to learn relationship vocabulary?', options: ['Ask and follow the person’s chosen terms.', 'Assume one label fits all.', 'Use only English word order.'], answer: 0, hint: 'People define their relationships.', feedback: 'Respect the terms each person chooses.' }
    ]
  },
  {
    title: 'Actions and Daily Activities',
    description: 'Describe common routines, sequence everyday events, and notice how movement, space, and non-manual signals contribute.',
    concept: 'ASL verbs and spatial constructions do not simply mirror English sentence forms. Context, directionality, and non-manual signals can carry grammatical meaning.',
    vocabulary: ['wake up', 'eat', 'go', 'work', 'study', 'finish', 'every day'],
    lesson: 'Describe a routine with a clear topic and a sequence of actions. Watch how signers use space and facial expression; avoid translating an English sentence word for word.',
    exercises: [
      { prompt: 'What is a good way to describe a routine?', options: ['Set a clear context and sequence the actions.', 'Translate each English word mechanically.', 'Ignore facial expression.'], answer: 0, hint: 'ASL has its own grammar.', feedback: 'Use context and meaningful sequencing rather than word-for-word translation.' },
      { prompt: 'What can movement and signing space contribute?', options: ['Grammatical and directional information', 'Only decoration', 'Nothing'], answer: 0, hint: 'Grammar is not only in handshape.', feedback: 'Movement and space can contribute meaning and grammar.' },
      { prompt: 'When telling a daily story, what helps the listener?', options: ['A clear sequence and visual transitions', 'Changing topic without signaling', 'Hiding the hands'], answer: 0, hint: 'Make the timeline easy to follow.', feedback: 'Use clear sequencing and transitions.' }
    ],
    challenge: [
      { prompt: 'A learner translates “I go to work every day” word for word. What should they remember?', options: ['ASL grammar may organize the idea differently.', 'English order is mandatory.', 'Only fingerspelling is grammatical.'], answer: 0, hint: 'Think in ASL, not signed English.', feedback: 'Express the meaning using ASL grammar and context.' },
      { prompt: 'Why establish a topic before describing activities?', options: ['It gives the routine a clear context.', 'It replaces all verbs.', 'It is only for camera tracking.'], answer: 0, hint: 'Context helps the listener interpret the sequence.', feedback: 'A clear topic frames the actions that follow.' }
    ],
    revision: [
      { prompt: 'Does ASL use only handshape to express meaning?', options: ['No; movement, space, body, and face also matter.', 'Yes.', 'Only during stories.'], answer: 0, hint: 'Review the visual-grammar idea.', feedback: 'ASL meaning uses multiple visual channels.' },
      { prompt: 'What supports a clear daily routine description?', options: ['Context and ordered actions', 'Mechanical English translation', 'No pauses'], answer: 0, hint: 'Help the listener follow the timeline.', feedback: 'Context and sequence make a routine clear.' }
    ]
  },
  {
    title: 'Questions and Useful Expressions',
    description: 'Ask who, what, where, and when questions; use clarification and repair strategies to keep communication accessible.',
    concept: 'ASL questions use non-manual markers as well as manual signs. Facial expression and head movement may mark question types and scope.',
    vocabulary: ['who', 'what', 'where', 'when', 'why', 'how', 'again', 'understand'],
    lesson: 'Practice question words with the appropriate facial grammar. If a message is unclear, ask the signer to repeat, slow down, or explain; confirm understanding instead of guessing.',
    exercises: [
      { prompt: 'What can mark a question in ASL?', options: ['Facial expression and other non-manual signals', 'Only a question mark in the air', 'A random hand wave'], answer: 0, hint: 'Questions use more than the manual sign.', feedback: 'Non-manual markers are part of ASL question grammar.' },
      { prompt: 'You miss part of a message. What is a useful repair strategy?', options: ['Ask the signer to repeat or clarify.', 'Pretend you understood.', 'Change the subject.'], answer: 0, hint: 'Communication repair is normal.', feedback: 'Ask for repetition or clarification.' },
      { prompt: 'Why should you avoid guessing at an unclear message?', options: ['Confirming avoids misunderstandings.', 'Guessing is required in ASL.', 'The signer cannot clarify.'], answer: 0, hint: 'A brief check can repair a conversation.', feedback: 'Confirm the meaning rather than assuming.' }
    ],
    challenge: [
      { prompt: 'What is missing from a question if only the handshape is practiced?', options: ['Potential non-manual question marking', 'The English spelling', 'A camera'], answer: 0, hint: 'Facial grammar matters.', feedback: 'Include appropriate non-manual markers.' },
      { prompt: 'A signer asks if you understand, but you do not. What should you do?', options: ['Signal that you need clarification.', 'Nod falsely.', 'Walk away silently.'], answer: 0, hint: 'Accurate communication is better than politeness theater.', feedback: 'Be clear and ask for clarification.' }
    ],
    revision: [
      { prompt: 'Can facial expression be grammatical in ASL?', options: ['Yes', 'No, never', 'Only in theater'], answer: 0, hint: 'Think about non-manual markers.', feedback: 'Facial expression can carry grammatical information.' },
      { prompt: 'What is a healthy response to not understanding?', options: ['Ask for repetition or clarification.', 'Guess.', 'Ignore the message.'], answer: 0, hint: 'Use a repair strategy.', feedback: 'Clarification keeps the conversation accessible.' }
    ]
  },
  {
    title: 'Guided Conversations',
    description: 'Combine introductions, questions, everyday topics, turn-taking, and clarification in short, supported exchanges.',
    concept: 'Conversation requires attention, turn-taking, and repair. Adapt to the other signer and use ASL grammar instead of a memorized English script.',
    vocabulary: ['introduce', 'topic', 'turn', 'clarify', 'respond', 'conversation'],
    lesson: 'Use a simple flow: establish attention, introduce a topic, ask and answer, respond to the other signer, then clarify when needed. Pauses and eye gaze help manage turns.',
    exercises: [
      { prompt: 'What supports a natural conversation?', options: ['Taking turns and responding to the other signer', 'Reciting a script without looking', 'Signing every word in English order'], answer: 0, hint: 'Conversation is interactive.', feedback: 'Attend and respond to your partner.' },
      { prompt: 'What can eye gaze and pauses help manage?', options: ['Turn-taking and attention', 'Spelling accuracy only', 'Number forms only'], answer: 0, hint: 'Visual language uses visual interaction cues.', feedback: 'Eye gaze and pauses can support conversational turns.' },
      { prompt: 'If a conversation goes off track, what can you do?', options: ['Restate the topic or ask a clarifying question.', 'Keep pretending.', 'Stop using facial expression.'], answer: 0, hint: 'Use conversational repair.', feedback: 'A clarification can bring the exchange back on track.' }
    ],
    challenge: [
      { prompt: 'Your partner finishes a turn. What is a good next action?', options: ['Respond to what they said or ask a relevant question.', 'Start an unrelated memorized monologue.', 'Turn away.'], answer: 0, hint: 'Build on the shared topic.', feedback: 'Respond to the partner and maintain the topic.' },
      { prompt: 'Why is a memorized English script not enough?', options: ['ASL has its own grammar and visual turn-taking.', 'Scripts are always forbidden.', 'ASL has no grammar.'], answer: 0, hint: 'Use the language’s own structure.', feedback: 'Meaning, ASL grammar, and interaction matter.' }
    ],
    revision: [
      { prompt: 'What is central to a guided exchange?', options: ['Shared attention and turn-taking', 'Only hand memorization', 'Avoiding questions'], answer: 0, hint: 'Conversation happens between people.', feedback: 'Attend, take turns, and respond.' },
      { prompt: 'What should you do when you lose the thread?', options: ['Clarify or restate the topic.', 'Pretend to understand.', 'Switch to random gestures.'], answer: 0, hint: 'Use repair to reconnect.', feedback: 'Clarification is a useful conversational skill.' }
    ]
  },
  {
    title: 'Revision and Practical Challenges',
    description: 'Bring the foundations together in realistic tasks, review weak spots, and plan continued learning with Deaf ASL users.',
    concept: 'A course milestone is a beginning, not fluency. ASL varies, and cultural knowledge develops through sustained interaction with Deaf communities.',
    vocabulary: ['review', 'community', 'variation', 'accessibility', 'practice', 'feedback'],
    lesson: 'Review alphabet, fingerspelling, numbers, vocabulary, grammar, and conversations. Seek feedback from Deaf ASL signers and reputable sources; continue learning about culture and access.',
    exercises: [
      { prompt: 'What is a responsible next step after this course?', options: ['Continue learning with Deaf signers and trusted references.', 'Claim fluency after ten levels.', 'Rely on an unsupported camera model.'], answer: 0, hint: 'Language learning continues beyond a course.', feedback: 'Continue practicing with the community and reputable resources.' },
      { prompt: 'How should you respond to regional variation?', options: ['Stay curious and learn the local form.', 'Treat variation as an error.', 'Mix signs at random.'], answer: 0, hint: 'Variation is part of living languages.', feedback: 'Ask and learn respectfully from the local community.' },
      { prompt: 'What can make communication more accessible?', options: ['Ask about preferences and make visual communication clear.', 'Assume everyone has the same access needs.', 'Hide your hands while signing.'], answer: 0, hint: 'Accessibility is collaborative.', feedback: 'Ask people what works for them and keep signing visible.' }
    ],
    challenge: [
      { prompt: 'You encounter an unfamiliar variant. What is the best response?', options: ['Ask about the local or community usage.', 'Label it incorrect immediately.', 'Invent a replacement.'], answer: 0, hint: 'Respect linguistic variation.', feedback: 'Ask and learn in context.' },
      { prompt: 'What does passing this assessment demonstrate?', options: ['Progress on this curriculum, not complete fluency.', 'Fluency in every ASL context.', 'Camera recognition accuracy.'], answer: 0, hint: 'A test samples only some learning.', feedback: 'A milestone is not a fluency claim.' }
    ],
    revision: [
      { prompt: 'What is a good source for continued ASL learning?', options: ['Deaf signers and reputable educational references', 'Random image search results', 'Mock recognition output'], answer: 0, hint: 'Prioritize accurate community knowledge.', feedback: 'Learn from Deaf ASL users and vetted references.' },
      { prompt: 'How should a learner treat course completion?', options: ['As a foundation for continued learning', 'As proof of total mastery', 'As permission to assign name signs'], answer: 0, hint: 'Language learning is ongoing.', feedback: 'Keep learning and respect community practices.' }
    ]
  }
];

const assessmentQuestions = [
  [
    ['Which letter is made with an L-shaped thumb and index?', ['A', 'L', 'U'], 1],
    ['Which letter requires tracing a J with the little finger?', ['I', 'J', 'Y'], 1],
    ['Which letter is a fist with the thumb resting beside the index?', ['A', 'S', 'T'], 0],
    ['Which letter uses a thumb-index circle with three fingers extended?', ['F', 'O', 'C'], 0],
    ['How is Z formed?', ['Trace a Z with the index finger.', 'Hold a still fist.', 'Trace with the thumb.'], 0],
    ['Which pair differs by together versus apart fingers?', ['U and V', 'M and N', 'C and O'], 0],
    ['In the common ASL alphabet, M tucks the thumb under how many fingers?', ['One', 'Two', 'Three'], 2],
    ['Which is the best description of fingerspelling?', ['A way to represent letters for names and some words', 'A replacement for all ASL signs', 'A camera-only exercise'], 0]
  ],
  [
    ['What should a beginner prioritize when fingerspelling?', ['Clarity', 'Maximum speed', 'Large arm swings'], 0],
    ['Where is a common fingerspelling space?', ['Near the shoulder, in view', 'Behind the back', 'At the floor'], 0],
    ['When is fingerspelling especially useful?', ['For a proper name', 'For every word in every sentence', 'Only when signing to a camera'], 0],
    ['What can help show a word boundary?', ['A small natural pause', 'A large jump after each letter', 'Changing hands mid-word'], 0],
    ['A person asks you to spell again. What should you do?', ['Repeat clearly at a comfortable pace', 'Rush', 'Skip letters'], 0],
    ['Does ASL vocabulary need to be spelled letter by letter?', ['No, use established signs when appropriate.', 'Yes, always.', 'Only for greetings.'], 0],
    ['What can you do if you do not know a sign?', ['Clarify or fingerspell when suitable', 'Invent a sign and call it standard', 'Pretend'], 0],
    ['What is the goal of readable fingerspelling?', ['Communicate a letter sequence clearly', 'Make the hand move as quickly as possible', 'Replace facial expression'], 0]
  ],
  [
    ['What helps interpret a number in conversation?', ['Context', 'Shirt color', 'A random guess'], 0],
    ['Which can number forms refer to?', ['Age, time, or quantity', 'Only names', 'Only questions'], 0],
    ['What should you do if a number is unclear?', ['Ask for repetition or confirm it', 'Pretend', 'Change the subject'], 0],
    ['What is a helpful number practice habit?', ['Keep each form clear and visible', 'Hide the hand', 'Rush'], 0],
    ['What should guide number form choice?', ['The context and convention', 'English spelling alone', 'Camera availability'], 0],
    ['If two forms are confusing, what should you compare?', ['Handshape and orientation in a trusted reference', 'Random images', 'Nothing'], 0],
    ['Which best describes counting in ASL?', ['Use clear forms and attend to context', 'Translate English words mechanically', 'Use only fingerspelling'], 0],
    ['Is context useful when signing quantities?', ['Yes', 'No', 'Only in writing'], 0]
  ],
  [
    ['What should happen before beginning a visual conversation?', ['Establish attention respectfully', 'Grab the person', 'Sign while they look away'], 0],
    ['What can facial expression contribute?', ['Grammatical and conversational information', 'Nothing', 'Only decoration'], 0],
    ['What is important after a greeting?', ['Allow a response and take turns', 'Continue without looking', 'Turn away'], 0],
    ['How may you get a signer’s attention?', ['Use a visual cue in their line of sight', 'Shout from behind', 'Grab their hand'], 0],
    ['Is ASL only hand gestures?', ['No; face, body, movement, and space also matter', 'Yes', 'Only at school'], 0],
    ['What is a respectful greeting practice?', ['Make the interaction visually accessible', 'Assume hearing', 'Avoid pauses'], 0],
    ['Why use a pause in a greeting?', ['It gives the other signer a turn', 'It replaces the greeting', 'It hides the hand'], 0],
    ['What can eye gaze support?', ['Visual attention and turn-taking', 'Only spelling', 'Number calculation'], 0]
  ],
  [
    ['How should a learner handle regional vocabulary variants?', ['Check context and learn from local signers', 'Call one universal', 'Mix them randomly'], 0],
    ['What helps remember everyday vocabulary?', ['Use it in meaningful situations', 'Avoid context', 'Memorize English spelling only'], 0],
    ['Can every English word map to one ASL sign?', ['No; context and meaning matter', 'Yes, always', 'Only in conversation'], 0],
    ['What can you do when a sign is unknown?', ['Ask or clarify; fingerspell when appropriate', 'Invent a standard sign', 'Pretend'], 0],
    ['Who is an important source for community usage?', ['Deaf ASL signers', 'Random image search', 'A mock predictor'], 0],
    ['Should a variant be treated automatically as an error?', ['No', 'Yes', 'Only if new'], 0],
    ['What should vocabulary practice focus on?', ['Meaning and use in context', 'English order only', 'Camera scores'], 0],
    ['What is a good way to learn local usage?', ['Ask respectfully and observe context', 'Assume', 'Avoid the community'], 0]
  ],
  [
    ['Who should choose the terms used for their relationships?', ['The person', 'A learner', 'A dictionary alone'], 0],
    ['Should a learner invent a name sign for a new friend?', ['No', 'Yes, based on appearance', 'Only for practice'], 0],
    ['How may an unfamiliar person’s name be introduced?', ['Fingerspell it when appropriate', 'Invent a name sign', 'Use a random nickname'], 0],
    ['What is a respectful family question?', ['An open question that accepts the person’s terms', 'A demand for private details', 'An assumption'], 0],
    ['What meaning can name signs carry?', ['Social and cultural meaning', 'No meaning', 'Only spelling'], 0],
    ['Should family structure be assumed?', ['No', 'Yes', 'Only in introductions'], 0],
    ['How should you refer to a partner or family member?', ['Use terms the person uses', 'Assume based on appearance', 'Avoid consent'], 0],
    ['Who may give a name sign?', ['The person or community', 'Any stranger', 'A random generator'], 0]
  ],
  [
    ['What helps describe daily activities clearly?', ['Context and sequence', 'Word-for-word English translation', 'No transitions'], 0],
    ['What can movement and space communicate?', ['Meaning and grammatical information', 'Only decoration', 'Nothing'], 0],
    ['Should ASL grammar always follow English word order?', ['No', 'Yes', 'Only in stories'], 0],
    ['What helps a listener follow a daily routine?', ['Clear sequencing', 'Hidden hands', 'Unmarked topic shifts'], 0],
    ['What is useful before describing a routine?', ['Set a topic or context', 'Invent a handshape', 'Start with random letters'], 0],
    ['Which visual channels can support meaning?', ['Hands, face, body, space, and movement', 'Hands only', 'Written English only'], 0],
    ['What should a learner avoid?', ['Mechanical word-for-word translation', 'Context', 'Practice'], 0],
    ['Can non-manual signals contribute grammar?', ['Yes', 'No', 'Only in performance'], 0]
  ],
  [
    ['What can mark a question in ASL?', ['Non-manual signals such as facial expression', 'Only English punctuation', 'A random wave'], 0],
    ['What should you do when you miss a message?', ['Ask for clarification', 'Pretend', 'Guess'], 0],
    ['Can facial expression be grammatical?', ['Yes', 'Never', 'Only in theater'], 0],
    ['Why confirm unclear information?', ['To avoid misunderstanding', 'It is never allowed', 'The signer cannot repeat'], 0],
    ['What is a useful repair request?', ['Ask the signer to repeat or clarify', 'Change the topic silently', 'Ignore it'], 0],
    ['Do questions use only manual signs?', ['No, non-manual marking can matter', 'Yes', 'Only in writing'], 0],
    ['What is better than pretending to understand?', ['Clearly request clarification', 'Nod falsely', 'Walk away'], 0],
    ['What does a question marker help communicate?', ['Question type or scope', 'Hand dominance only', 'Spelling'], 0]
  ],
  [
    ['What supports natural conversation?', ['Shared attention and turn-taking', 'A memorized monologue', 'Avoiding responses'], 0],
    ['What can eye gaze and pauses support?', ['Managing turns', 'Only alphabet practice', 'Number shapes'], 0],
    ['What should you do after a partner completes a turn?', ['Respond to the shared topic', 'Start an unrelated script', 'Turn away'], 0],
    ['What if you lose the topic?', ['Clarify or restate it', 'Pretend', 'Use random gestures'], 0],
    ['Why is an English script not enough?', ['ASL has its own grammar and visual interaction', 'ASL has no grammar', 'Scripts are always forbidden'], 0],
    ['What makes a conversation collaborative?', ['Responding and adapting to the other signer', 'Ignoring them', 'Only practicing alone'], 0],
    ['What can pauses communicate?', ['Turn transition and space to respond', 'Nothing', 'Only a question'], 0],
    ['What is one way to repair a conversation?', ['Ask a clarifying question', 'Assume', 'Stop looking'], 0]
  ],
  [
    ['Does passing this course prove fluency?', ['No; it is a learning milestone', 'Yes, in all contexts', 'Only with a camera'], 0],
    ['What is a responsible ongoing learning source?', ['Deaf signers and reputable references', 'Random image search', 'Mock prediction'], 0],
    ['How should regional variation be treated?', ['With curiosity and respect', 'As an error', 'By mixing forms randomly'], 0],
    ['What can support accessibility?', ['Ask preferences and keep signing visible', 'Assume needs', 'Hide the hands'], 0],
    ['What should a learner do with an unfamiliar local sign?', ['Ask and learn in context', 'Reject it immediately', 'Invent a replacement'], 0],
    ['What does continued ASL learning include?', ['Language and cultural learning', 'Only hand drills', 'Only tests'], 0],
    ['What is the purpose of review?', ['Strengthen skills and identify gaps', 'Claim fluency', 'Avoid feedback'], 0],
    ['Who should you ask about communication preferences?', ['The person you are communicating with', 'A random model', 'No one'], 0]
  ]
];

export const aslLessons = levels.map((level, index) => {
  const levelNumber = index + 1;
  const contentBlocks = [
    { type: 'CONCEPT_INTRO', data: { stage: 'LEARN', title: level.title, body: level.concept } },
    { type: 'EXPLANATION', data: { stage: 'LEARN', title: 'Key idea', body: level.lesson, vocabulary: level.vocabulary } }
  ];

  if (index === 0) {
    contentBlocks.push({
      type: 'GESTURE_GUIDE',
      data: {
        stage: 'LEARN',
        title: 'A–Z handshape and movement reference',
        letters: alphabet,
        source: {
          name: 'ASL University (Lifeprint) — ASL alphabet and fingerspelling',
          url: REFERENCE_URL
        },
        visualNotice: 'No handshape image is embedded: each card links to the verified ASL University alphabet chart. Use the written description alongside that reference and avoid inventing a handshape from memory.'
      }
    });
  } else {
    contentBlocks.push({
      type: 'VOCABULARY_DECK',
      data: { stage: 'LEARN', title: 'Words and ideas', terms: level.vocabulary.map((term, termIndex) => ({ term, context: `Practice ${term} in a short, meaningful ${level.title.toLowerCase()} situation (${termIndex + 1}).` })) }
    });
  }

  contentBlocks.push(
    { type: 'FORMATIVE_DRILL', data: { stage: 'GUIDED_PRACTICE', title: 'Try it with a hint', exercises: level.exercises } },
    { type: 'PRACTICE_DRILL', data: { stage: 'PRACTICE_CHALLENGE', title: 'Put the idea to work', exercises: level.challenge } },
    { type: 'REVISION_RECAP', data: { stage: 'REVISION', title: 'Review and retrieve', exercises: level.revision } }
  );

  return {
    stableKey: `asl_level_${String(levelNumber).padStart(2, '0')}`,
    academy: 'SIGN_LANGUAGE',
    level: levelNumber,
    lessonType: 'THEORY',
    title: level.title,
    category: levelNumber === 10 ? 'MASTERY' : 'THEORY',
    description: level.description,
    language: 'ASL',
    difficulty: levelNumber <= 3 ? 'Apprentice' : levelNumber <= 6 ? 'Explorer' : levelNumber <= 9 ? 'Master' : 'Sage',
    order: levelNumber,
    xpReward: 100 + (levelNumber - 1) * 10,
    contentBlocks
  };
});

export const aslQuizzes = aslLessons.map((lesson, index) => ({
  stableKey: lesson.stableKey,
  questions: assessmentQuestions[index].map(([prompt, options, correct], questionIndex) => ({
    type: 'MULTIPLE_CHOICE',
    prompt,
    options,
    correct,
    explanation: `Review Level ${index + 1}: ${lesson.title}.`
  }))
}));
