import { asl42Sign as s, asl42Sources as src, LINKED_VIDEO_REVIEW, WRITTEN_REFERENCE } from './aslPhase42Sources.js';

const ex = (prompt, options, answer, hint, feedback) => ({ prompt, options, answer, hint, feedback });

export const PHASE42_BLOCKS_B = {
  asl_level_06: {
    level: 6,
    title: 'People, Family and Relationships',
    objectives: [
      { text: 'Describe family and relationship vocabulary without assuming a person’s structure or labels.', success: 'You use the terms the person chooses.' },
      { text: 'Explain the documented FAMILY, SISTER, and BROTHER parameters.', success: 'You can compare handshape and movement across the three.' },
      { text: 'Respect name signs as community-given forms.', success: 'You fingerspell an unfamiliar name rather than inventing a sign.' }
    ],
    vocabulary: [
      { term: 'Family', context: 'A circle concept with F handshapes in the cited source.' },
      { term: 'Sibling', context: 'SISTER and BROTHER use two hands with a moving dominant hand.' },
      { term: 'Name sign', context: 'A socially meaningful form given by a person or community.' },
      { term: 'Self-identification', context: 'People define their own relationships.' }
    ],
    signNotes: [
      s('FAMILY', {
        handshape: 'Form F hands.',
        palmOrientation: 'Use both hands to trace a circle, as if outlining a group sitting around a table.',
        movement: 'Trace a general circle; Lifeprint notes the same circle concept underlies family, class, group, and team, distinguished by initialization.',
        nonManualMarkers: 'Neutral face for a plain family statement; a questioning face for FAMILY DEAF?',
        commonMistake: 'Using the circle with the wrong initialized handshape and calling it FAMILY.',
        source: 'ASL University FAMILY',
        verification: WRITTEN_REFERENCE
      }),
      s('SISTER', {
        handshape: 'Dominant hand starts like a cross between G and L, changing to G; non-dominant hand is in an index/G handshape.',
        palmOrientation: 'The dominant hand moves down to contact the stationary non-dominant hand.',
        movement: 'The dominant hand changes to G as it moves downward and makes contact.',
        nonManualMarkers: 'Neutral expression for a simple identification.',
        commonMistake: 'Using the Signed English variant described as less recommended in the cited source.',
        source: 'ASL University SISTER',
        verification: WRITTEN_REFERENCE
      }),
      s('BROTHER', {
        handshape: 'Start with a modified L or G on the dominant hand and an index finger on the non-dominant hand.',
        palmOrientation: 'The dominant hand moves downward toward the stationary base hand.',
        movement: 'The dominant hand changes into an index-finger handshape at the end.',
        nonManualMarkers: 'Keep attention on your partner; avoid looking only at your hands.',
        commonMistake: 'Using the less-recommended boy-same variant without noting it as a variant.',
        source: 'ASL University BROTHER',
        verification: WRITTEN_REFERENCE
      }),
      s('MOTHER / FATHER', {
        handshape: 'Consult the linked video demonstrations; the written pages did not expose a reliable handshape description.',
        palmOrientation: 'Check orientation in the cited videos rather than inferring from a still image.',
        movement: 'Use the form taught by your local teacher and shown by Deaf signers in the source videos.',
        nonManualMarkers: 'Neutral face for identification unless asking a question.',
        commonMistake: 'Inventing a parameter from an unverified still or memory.',
        source: 'ASL University MOTHER and FATHER video pages',
        verification: LINKED_VIDEO_REVIEW
      })
    ],
    markers: [
      { cue: 'Neutral identification face', use: 'Introducing someone', example: 'FAMILY / SISTER with a relaxed face.', caution: 'Do not add a question face to a statement.' },
      { cue: 'Questioning brows / head tilt', use: 'Asking about family', example: 'FAMILY DEAF? with question marking.', caution: 'Keep the marking over the question phrase.' },
      { cue: 'Respectful attention', use: 'Name discussion', example: 'Wait for the person to supply their own preferred terms.', caution: 'Do not demand private details.' }
    ],
    examples: [
      { situation: 'Introducing a sibling', gloss: 'SISTER [ fingerspell name ]', meaning: 'Use the relationship sign and then the person’s name.', tip: 'If no name sign is shared, fingerspell the name.' },
      { situation: 'Asking respectfully', gloss: 'FAMILY DEAF?', meaning: 'Lifeprint shows this as a family-related question.', tip: 'Use a question expression with the sign sequence.' },
      { situation: 'Describing a group', gloss: 'FAMILY / CLASS / TEAM', meaning: 'The circle movement is shared; the initialized handshape changes the meaning.', tip: 'Keep the F handshape for FAMILY.' }
    ],
    revision: [
      { text: 'FAMILY uses F hands in a circle.', detail: 'Class, group, and team share the circle concept with different handshapes.' },
      { text: 'SISTER and BROTHER have a moving dominant hand.', detail: 'The non-dominant hand stays stationary in the cited descriptions.' },
      { text: 'Name signs are not self-assigned by strangers.', detail: 'Fingerspell unfamiliar names.' },
      { text: 'People choose their own relationship terms.', detail: 'Respect self-identification.' }
    ],
    sources: src([
      ['family', 'F-hand circle and FAMILY DEAF? example.'],
      ['sister', 'Dominant/non-dominant hand descriptions.'],
      ['brother', 'Handshape change and movement description.'],
      ['mother', 'Linked video demonstration; parameters require video review.'],
      ['father', 'Linked video demonstration; parameters require video review.']
    ]),
    guided: [
      ex('Which handshape starts the FAMILY sign in the cited source?', ['W hands', 'F hands', 'S fists'], 1, 'Think of initialization.', 'FAMILY uses F hands tracing a circle.'),
      ex('What is respectful when asking about someone’s family?', ['Use open questions and the person’s own terms', 'Assume one structure', 'Demand details'], 0, 'Let people self-identify.', 'Respect the terms each person chooses.'),
      ex('How should an unfamiliar name be introduced if no name sign is shared?', ['Fingerspell it when appropriate', 'Invent a name sign', 'Use a nickname'], 0, 'Name signs carry community meaning.', 'Fingerspell the name; do not assign a name sign yourself.')
    ],
    challenge: [
      ex('A learner wants to give a new friend a name sign. What should they do?', ['Choose one from appearance', 'Use the first letter only', 'Wait for a name sign given by the person/community'], 2, 'Name signs are culturally meaningful.', 'Do not casually invent or assign another person’s name sign.'),
      ex('How do SISTER and BROTHER differ in the cited descriptions?', ['They use different dominant-hand starting shapes and endings', 'One uses no hands', 'They are identical'], 0, 'Compare the handshape change.', 'Both use a moving dominant hand, but the starting and ending shapes differ.'),
      ex('Why mark MOTHER/FATHER as requiring video review?', ['The written pages did not expose reliable parameters', 'The signs do not exist', 'Only children can learn them'], 0, 'Avoid inventing parameters.', 'The source pages link videos, so the honest approach is to link them rather than guess.')
    ],
    revisionExercises: [
      ex('Who should choose the terms used for their relationships?', ['The person', 'A stranger', 'A random dictionary'], 0, 'Self-identification matters.', 'Use the terms the person uses for themselves.'),
      ex('What does the circle in FAMILY represent in the cited source?', ['A number zero', 'A wave', 'A group, as if sitting around a table'], 2, 'Lifeprint describes a family around a table.', 'The circle is a general group concept initialized with F for family.'),
      ex('Should family structure be assumed?', ['No', 'Yes', 'Only in introductions'], 0, 'Respect diversity.', 'Ask respectfully and accept the person’s own description.')
    ],
    explanations: {
      'Who should choose the terms used for their relationships?': 'People define their own relationships. A learner should use the terms the person chooses rather than imposing assumptions.',
      'Should a learner invent a name sign for a new friend?': 'No. Name signs carry social and cultural meaning and are given by the person or the community; fingerspell the name instead.',
      'How may an unfamiliar person’s name be introduced?': 'Fingerspell the name when appropriate. Do not invent a nickname or name sign for someone else.',
      'What is a respectful family question?': 'An open question that accepts the person’s own terms and does not demand private information.',
      'What meaning can name signs carry?': 'Name signs can carry social and cultural meaning; they are not merely a fingerspelled initial.',
      'Should family structure be assumed?': 'No. Families vary, and respectful conversation lets each person describe their own relationships.',
      'How should you refer to a partner or family member?': 'Use the terms the person uses for that relationship rather than guessing from appearance.',
      'Who may give a name sign?': 'The person or their signing community may give a name sign; a stranger should not assign one.'
    }
  },

  asl_level_07: {
    level: 7,
    title: 'Actions and Daily Activities',
    objectives: [
      { text: 'Sequence everyday actions with a clear topic and visible transitions.', success: 'A partner can follow the order of a short daily routine.' },
      { text: 'Describe documented parameters for GO, FINISH, AGAIN, UNDERSTAND, and WORK.', success: 'You can distinguish a single movement from a repeated one where the source does.' },
      { text: 'Avoid mechanical word-for-word English translation.', success: 'You express the idea using ASL grammar and context.' }
    ],
    vocabulary: [
      { term: 'Sequence', context: 'The order of events in a routine or story.' },
      { term: 'Topic', context: 'What the routine is about; it frames the actions.' },
      { term: 'Directionality', context: 'Movement and space can carry grammatical information.' },
      { term: 'Transition', context: 'A visible shift between one event and the next.' }
    ],
    signNotes: [
      s('GO', {
        handshape: 'Use the documented GO hand orientation from the linked source.',
        palmOrientation: 'Keep the movement in your signing space, directed according to context.',
        movement: 'GO has a single quick movement; Lifeprint notes that repeating it can mean “attend”.',
        nonManualMarkers: 'A forward-looking expression can support a departure or future action.',
        commonMistake: 'Repeating the movement when you mean a single departure.',
        source: 'ASL University GO',
        verification: LINKED_VIDEO_REVIEW
      }),
      s('FINISH', {
        handshape: 'Place both open hands in front of you, fingers pointing upward and facing you.',
        palmOrientation: 'Start with palms toward you and twist quickly to end somewhat forward.',
        movement: 'Twist both hands quickly a couple of times; a single twist can seem more final.',
        nonManualMarkers: 'A completing expression can reinforce the end of an activity.',
        commonMistake: 'Using the warning/“knock it off” variant described on the source page for a simple completion.',
        source: 'ASL University FINISH',
        verification: WRITTEN_REFERENCE
      }),
      s('AGAIN', {
        handshape: 'Dominant hand is bent at the large knuckles; non-dominant hand is flat.',
        palmOrientation: 'Bring bent fingertips to the palm of the flat hand.',
        movement: 'Move in a slight arc and touch the non-dominant palm with the dominant fingertips.',
        nonManualMarkers: 'A small questioning/requesting look can invite a repetition.',
        commonMistake: 'Using a random circular gesture instead of the bent-hand-to-flat-palm contact.',
        source: 'ASL University AGAIN / REPEAT',
        verification: WRITTEN_REFERENCE
      }),
      s('UNDERSTAND', {
        handshape: 'Bend the index finger so its tip touches the pad of the thumb near the forehead.',
        palmOrientation: 'Keep the hand near the forehead with the index able to flick upward.',
        movement: 'Flick the index finger so that it points up, like a light bulb turning on.',
        nonManualMarkers: 'A thoughtful-to-clear expression supports the moment of understanding.',
        commonMistake: 'Assuming there is one universal sign for “don’t”; Lifeprint notes many ways to express negation.',
        source: 'ASL University UNDERSTAND',
        verification: WRITTEN_REFERENCE
      }),
      s('WORK / SCHOOL', {
        handshape: 'WORK uses S fists; SCHOOL uses flat hands.',
        palmOrientation: 'WORK has palms down; SCHOOL brings the dominant flat hand onto the base hand.',
        movement: 'WORK taps the dominant fist on the wrist/side of the non-dominant fist; SCHOOL claps the dominant hand down twice.',
        nonManualMarkers: 'Neutral face for routine statements about work or school.',
        commonMistake: 'Using the WORK fist for SCHOOL and losing the flat-hand contrast.',
        source: 'ASL University WORK and SCHOOL',
        verification: WRITTEN_REFERENCE
      })
    ],
    markers: [
      { cue: 'Topic-establishing gaze', use: 'Starting a routine', example: 'Introduce who or what the routine is about before sequencing actions.', caution: 'Do not launch into actions with no frame.' },
      { cue: 'Completion expression', use: 'FINISH', example: 'Pair the twist with a sense of closure.', caution: 'Avoid the warning variant unless that is your meaning.' },
      { cue: 'Questioning face', use: 'UNDERSTAND?', example: 'Check whether your partner followed the sequence.', caution: 'Do not nod for them.' }
    ],
    examples: [
      { situation: 'Describing a morning', gloss: 'WAKE UP / EAT / GO WORK', meaning: 'A clear topic plus ordered actions makes the timeline readable.', tip: 'Use small pauses between events.' },
      { situation: 'Ending a task', gloss: 'FINISH', meaning: 'Both open hands twist forward to mark completion.', tip: 'A single twist can sound more final.' },
      { situation: 'Checking comprehension', gloss: 'UNDERSTAND?', meaning: 'The forehead flick checks whether the idea landed.', tip: 'Ask for repetition if the answer is unclear.' }
    ],
    revision: [
      { text: 'Set a topic before a sequence.', detail: 'It frames the actions that follow.' },
      { text: 'Movement and space can carry grammar.', detail: 'GO’s single versus repeated movement is one documented example.' },
      { text: 'FINISH twists both open hands.', detail: 'The variant matters for meaning.' },
      { text: 'Do not translate English word-for-word.', detail: 'Express the meaning in ASL structure.' }
    ],
    sources: src([
      ['go', 'Single quick movement and attend variation.'],
      ['finish', 'Open-hand twist and variants.'],
      ['again', 'Bent dominant hand to flat palm.'],
      ['understand', 'Index flick near the forehead.'],
      ['work', 'S fists with downward palms.'],
      ['school', 'Flat-hand clapping movement.']
    ]),
    guided: [
      ex('What helps a listener follow a daily routine?', ['A clear sequence and transitions', 'No topic', 'Hidden hands'], 0, 'Make the timeline visible.', 'Context plus ordered actions makes the routine readable.'),
      ex('What does Lifeprint say about repeating GO?', ['It means “stop”', 'It can mean “attend”', 'It has no effect'], 1, 'Movement repetition can change meaning.', 'A single quick movement is GO; repetition can signal attendance.'),
      ex('Which handshape does WORK use in the cited source?', ['W hands', 'S fists', 'F hands'], 1, 'Think of a hammer.', 'WORK uses S fists with palms down, tapping the wrist or side of the base fist.')
    ],
    challenge: [
      ex('A learner signs “I go to work every day” word for word. What should they remember?', ['ASL may organize the idea differently', 'English order is mandatory', 'Only fingerspelling is grammatical'], 0, 'Think in ASL.', 'Express the meaning with ASL grammar rather than a mechanical English translation.'),
      ex('Which sign uses two open hands twisting forward?', ['GO', 'FINISH', 'WORK'], 1, 'It marks completion.', 'FINISH twists both open hands from facing you to facing forward.'),
      ex('Why establish a topic before describing activities?', ['It gives the sequence a frame', 'It replaces every verb', 'It is only for cameras'], 0, 'Context helps interpretation.', 'A topic frames the actions so the listener knows what the routine is about.')
    ],
    revisionExercises: [
      ex('Does ASL use only handshape for meaning?', ['No; movement, space, body, and face matter', 'Yes', 'Only in stories'], 0, 'Review visual grammar.', 'Multiple visual channels contribute to ASL meaning.'),
      ex('What is the movement for AGAIN?', ['Index traces a Z', 'Fists tap wrists', 'Bent dominant fingertips touch the flat palm'], 2, 'Think “do over”.', 'The bent hand arcs to touch the flat non-dominant palm.'),
      ex('Which pair contrasts S fists with flat hands?', ['WORK and SCHOOL', 'J and Z', 'M and N'], 0, 'One taps; one claps.', 'WORK uses S fists; SCHOOL uses flat hands in a double clap.')
    ],
    explanations: {
      'What helps describe daily activities clearly?': 'Set a clear context and sequence the actions. A listener needs a frame and readable transitions, not a word-for-word English translation.',
      'What can movement and space communicate?': 'Movement and space can carry grammatical and directional information in ASL, not just decoration.',
      'Should ASL grammar always follow English word order?': 'No. ASL has its own grammar; express the meaning through ASL structure, context, and visual sequencing.',
      'What helps a listener follow a daily routine?': 'Clear sequencing, visible transitions, and a stable topic help the listener follow the timeline.',
      'What is useful before describing a routine?': 'Establish a topic or context so the actions that follow have a clear frame.',
      'Which visual channels can support meaning?': 'Hands, face, body, space, and movement all contribute to meaning in ASL.',
      'What should a learner avoid?': 'Avoid mechanical word-for-word translation; focus on meaning and ASL structure.',
      'Can non-manual signals contribute grammar?': 'Yes. Facial expression, head movement, and other non-manual signals can carry grammatical information.'
    }
  },

  asl_level_08: {
    level: 8,
    title: 'Questions and Useful Expressions',
    objectives: [
      { text: 'Explain how non-manual markers signal question type and scope.', success: 'You can contrast a yes/no marking with a wh-question marking.' },
      { text: 'Use the documented NAME parameters and question expression.', success: 'You can sign NAME YOU? with furrowed brows and a slight head tilt.' },
      { text: 'Use clarification strategies instead of guessing.', success: 'You can ask for repetition, slower production, or an explanation.' }
    ],
    vocabulary: [
      { term: 'Non-manual marker', context: 'A facial, head, shoulder, or mouth signal that affects meaning.' },
      { term: 'Yes/no question', context: 'A question type with its own facial marking.' },
      { term: 'Wh-question', context: 'WHO, WHAT, WHERE, WHEN, WHY, HOW questions with their own marking.' },
      { term: 'Repair', context: 'A strategy for fixing a communication breakdown.' }
    ],
    signNotes: [
      s('NAME', {
        handshape: 'Use H handshapes on both hands.',
        palmOrientation: 'Keep both H hands visible in the signing area.',
        movement: 'A double movement is typical; a single movement is also common.',
        nonManualMarkers: 'Neutral for an isolated NAME; furrowed eyebrows and a slight forward head tilt for “NAME YOU?”',
        commonMistake: 'Using the movement of an unrelated sign or dropping the question expression in a question.',
        source: 'ASL University NAME',
        verification: WRITTEN_REFERENCE
      }),
      s('Wh-question marking', {
        handshape: 'Manual question signs combine with facial grammar; the hands alone do not mark the whole question.',
        palmOrientation: 'Keep the question sign visible while the face carries the question marking.',
        movement: 'Wh-signs are commonly placed near the end of a signed question, though Lifeprint notes this is not an absolute rule.',
        nonManualMarkers: 'Lifeprint’s sentence-type guidance describes furrowed brows for wh-questions.',
        commonMistake: 'Treating “always last” as an exceptionless rule or using a yes/no face for a wh-question.',
        source: 'ASL University sentence types and WH-question placement',
        verification: WRITTEN_REFERENCE
      }),
      s('Yes/no question marking', {
        handshape: 'Manual content is paired with a question expression rather than a special question handshape.',
        palmOrientation: 'Keep the statement signs visible while the brows and head mark the question.',
        movement: 'Maintain the question marking over the relevant phrase or sentence.',
        nonManualMarkers: 'Raised brows are described in Lifeprint’s sentence-type guidance for yes/no questions.',
        commonMistake: 'Using the wh-question brow for a yes/no question.',
        source: 'ASL University common sentence types',
        verification: WRITTEN_REFERENCE
      }),
      s('Repair signs', {
        handshape: 'AGAIN uses a bent dominant hand to a flat palm; UNDERSTAND uses a bent index flick near the forehead.',
        palmOrientation: 'Keep both repair signs in clear view of your partner.',
        movement: 'AGAIN arcs to the flat palm; UNDERSTAND flicks the index upward.',
        nonManualMarkers: 'A requesting or uncertain expression makes the need for repair explicit.',
        commonMistake: 'Nodding falsely when you did not understand.',
        source: 'ASL University AGAIN and UNDERSTAND',
        verification: WRITTEN_REFERENCE
      })
    ],
    markers: [
      { cue: 'Raised brows', use: 'Yes/no questions', example: 'Mark the signed phrase that asks for a yes/no answer.', caution: 'Do not use the wh-question brow here.' },
      { cue: 'Furrowed brows / forward head tilt', use: 'Wh-questions', example: 'NAME YOU? with wh-question marking.', caution: 'Placement of wh-signs is common but not absolute.' },
      { cue: 'Head shake / nod', use: 'Negation and affirmation', example: 'Answer a yes/no question visually.', caution: 'Do not nod when you mean no.' }
    ],
    examples: [
      { situation: 'Asking a name', gloss: 'NAME YOU?', meaning: 'H hands with a double movement plus wh-question marking.', tip: 'Furrow your brows and tilt the head slightly forward.' },
      { situation: 'Asking a location', gloss: '[ topic ] WHERE?', meaning: 'Wh-signs often come near the end, but context can change placement.', tip: 'Keep the question marking over the whole question.' },
      { situation: 'Repairing a miss', gloss: 'AGAIN / UNDERSTAND?', meaning: 'Ask for repetition or check comprehension directly.', tip: 'Be honest about what you understood.' }
    ],
    revision: [
      { text: 'Questions use hands and face.', detail: 'Non-manual markers are grammatical, not decorative.' },
      { text: 'Yes/no and wh-questions differ in marking.', detail: 'Raised versus furrowed brows are described in the cited source.' },
      { text: 'Wh-sign placement is common but not absolute.', detail: 'Check context and the source note.' },
      { text: 'Clarify instead of guessing.', detail: 'Repair keeps the exchange accurate.' }
    ],
    sources: src([
      ['name', 'H handshape, movement, and NAME YOU? expression.'],
      ['sentenceTypes', 'Question types and non-manual markers.'],
      ['whPlacement', 'Placement guidance and exceptions.'],
      ['nmm', 'Definition and examples of non-manual markers.'],
      ['again', 'Repair sign parameters.'],
      ['understand', 'Comprehension-check parameters.']
    ]),
    guided: [
      ex('What can mark a question in ASL?', ['Non-manual signals such as brow position', 'Only a written question mark', 'A random wave'], 0, 'The face carries grammar.', 'Question type and scope can be marked with facial and head signals.'),
      ex('What expression does Lifeprint describe for NAME YOU??', ['Neutral face', 'Furrowed brows and slight head tilt', 'Eyes closed'], 1, 'It is a wh-question.', 'The NAME page describes furrowed eyebrows and a forward head tilt for this question.'),
      ex('You miss part of a message. What is a useful repair?', ['Ask for repetition or clarification', 'Pretend', 'Guess'], 0, 'Repair is normal.', 'Asking for repetition is clearer than guessing.')
    ],
    challenge: [
      ex('What is missing if a learner only practises the handshape of a question?', ['Non-manual question marking', 'The English spelling', 'A camera'], 0, 'Facial grammar matters.', 'The brow, head, and body signals are part of the question.'),
      ex('Is the wh-sign always last in an ASL question?', ['No; common but not absolute', 'Yes, always', 'Only in Level 1'], 0, 'Lifeprint gives exceptions.', 'Wh-signs are commonly final, but placement depends on context and clause structure.'),
      ex('A signer asks if you understand and you do not. What should you do?', ['Signal that you need clarification', 'Nod falsely', 'Walk away silently'], 0, 'Accuracy matters.', 'A brief honest repair request is better than pretending.')
    ],
    revisionExercises: [
      ex('Which statement about wh-sign placement is accurate?', ['Commonly near the end, but context can change it', 'Always the first sign', 'Placement is random'], 0, 'Check the source note.', 'Lifeprint describes common final placement with context-dependent exceptions.'),
      ex('Which marking is described for yes/no questions?', ['Raised brows', 'Furrowed brows', 'Closed eyes'], 0, 'Different from wh-questions.', 'Lifeprint’s sentence-type page describes raised brows for yes/no questions.'),
      ex('What expression fits an isolated NAME sign?', ['Neutral face', 'Furrowed brows with a forward head tilt', 'Raised brows for a yes/no question'], 0, 'Separate the isolated sign from NAME YOU?.', 'An isolated NAME is neutral; NAME YOU? uses wh-question marking.')
    ],
    explanations: {
      'What can mark a question in ASL?': 'ASL questions use non-manual signals such as eyebrow position, head tilt, and body posture in addition to manual signs.',
      'What should you do when you miss a message?': 'Ask for clarification or repetition. Repair is a normal part of conversation, not an admission of failure.',
      'Can facial expression be grammatical?': 'Yes. Facial expression can mark sentence type and scope; it is part of ASL grammar.',
      'Why confirm unclear information?': 'Confirming prevents a guessed interpretation from becoming a misunderstanding.',
      'What is a useful repair request?': 'Ask the signer to repeat, slow down, or clarify, and check that your understanding matches theirs.',
      'Do questions use only manual signs?': 'No. Non-manual marking can be essential to the question type and its scope.',
      'What is better than pretending to understand?': 'Clearly request clarification. An honest repair keeps communication accurate.',
      'What does a question marker help communicate?': 'A question marker helps communicate the question type and the scope of what is being asked.'
    }
  },

  asl_level_09: {
    level: 9,
    title: 'Guided Conversations',
    objectives: [
      { text: 'Combine attention, greeting, topic, question, answer, and repair in a short exchange.', success: 'You can complete a two-turn conversation without a memorized English script.' },
      { text: 'Use eye gaze and pauses to manage turn-taking.', success: 'You pause after a turn and look at your partner.' },
      { text: 'Adapt to the other signer and restate the topic when needed.', success: 'You can repair a conversation that drifts.' }
    ],
    vocabulary: [
      { term: 'Turn-taking', context: 'The visual management of who is signing.' },
      { term: 'Topic maintenance', context: 'Keeping the exchange about a shared subject.' },
      { term: 'Response', context: 'Building on what the other signer actually said.' },
      { term: 'Repair', context: 'Clarifying or restating to reconnect.' }
    ],
    signNotes: [
      s('Attention-to-turn flow', {
        handshape: 'Use previously learned greetings, names, and question signs; no new unverified handshape is introduced here.',
        palmOrientation: 'Keep all manual signs in the partner’s visible signing space.',
        movement: 'Move from greeting to topic to question with small pauses rather than one continuous stream.',
        nonManualMarkers: 'Eye gaze and facial grammar mark attention, question type, and response.',
        commonMistake: 'Reciting a memorized sequence without responding to the partner.',
        source: 'ASL University Lesson 2 and sentence-type guidance',
        verification: WRITTEN_REFERENCE
      }),
      s('Turn handover', {
        handshape: 'Hold or relax the final sign rather than immediately starting a new one.',
        palmOrientation: 'Keep hands visible while yielding the turn.',
        movement: 'A small settle at the end of a sign gives space for the next signer.',
        nonManualMarkers: 'Eye contact and a slight head/body shift can signal that you are finished.',
        commonMistake: 'Dropping the hands and looking away while the other person is still responding.',
        source: 'ASL University Lesson 2 and non-manual markers',
        verification: LINKED_VIDEO_REVIEW
      })
    ],
    markers: [
      { cue: 'Sustained eye gaze', use: 'Showing who has the turn', example: 'Look at your partner while they sign and while you take your turn.', caution: 'Do not stare at their hands only.' },
      { cue: 'Question brow', use: 'Asking a follow-up', example: 'Use the appropriate marking for your question type.', caution: 'Do not mix yes/no and wh markings.' },
      { cue: 'Pause and settle', use: 'Yielding a turn', example: 'Finish the sign, pause, and let the other person respond.', caution: 'Avoid replacing the pause with a repeated sign.' }
    ],
    examples: [
      { situation: 'Two-turn introduction', gloss: 'HELLO / NAME YOU? → NAME [ fingerspell ] / NICE MEET YOU', meaning: 'Attention, question, response, and a closing remark.', tip: 'Pause between turns and respond to the actual name.' },
      { situation: 'Everyday topic', gloss: 'WORK? → YES / FINISH / HOME', meaning: 'A topic question receives an answer and a short follow-up.', tip: 'Use question marking on WORK?' },
      { situation: 'Lost topic', gloss: 'AGAIN / [ restate topic ]', meaning: 'Repair brings both signers back to the shared subject.', tip: 'Do not pretend the topic never drifted.' }
    ],
    revision: [
      { text: 'Conversation is interactive.', detail: 'Respond to the partner instead of reciting a script.' },
      { text: 'Eye gaze and pauses manage turns.', detail: 'They are part of visual conversation.' },
      { text: 'Use the right question marking.', detail: 'Yes/no and wh-questions differ.' },
      { text: 'Repair when the topic is lost.', detail: 'Restate or ask a clarifying question.' }
    ],
    sources: src([
      ['lesson2', 'Lesson 2 objectives include questions, pronouns, numbers, and turn-related concepts.'],
      ['sentenceTypes', 'Question types and facial grammar in interaction.'],
      ['nmm', 'Facial and body signals that shape conversation.'],
      ['gallaudetConnect', 'University resource for continued ASL learning.']
    ]),
    guided: [
      ex('What supports a natural conversation?', ['A script with no eye contact', 'Avoiding questions', 'Turn-taking and responding to the other signer'], 2, 'Conversation is shared.', 'Attend, take turns, and respond to what your partner signs.'),
      ex('What can eye gaze and pauses help manage?', ['Attention and turn-taking', 'Only spelling accuracy', 'Number shapes'], 0, 'ASL is visual.', 'Eye gaze and pauses help show who is speaking and when a turn ends.'),
      ex('If the topic drifts, what can you do?', ['Restate the topic or ask a clarifying question', 'Pretend it is fine', 'Stop using facial expression'], 0, 'Use repair.', 'A brief clarification can bring the exchange back on track.')
    ],
    challenge: [
      ex('Your partner finishes a turn. What is a good next action?', ['Start a memorized monologue', 'Turn away', 'Respond to what they said or ask a relevant question'], 2, 'Build on the shared topic.', 'A relevant response keeps the conversation collaborative.'),
      ex('Why is a memorized English script not enough?', ['ASL has its own grammar and visual turn-taking', 'Scripts are always forbidden', 'ASL has no grammar'], 0, 'Use the language’s structure.', 'Meaning, ASL grammar, and interaction all matter.'),
      ex('Which sequence best describes a guided exchange?', ['Attention → topic → question → response → repair if needed', 'Question → random gesture → silence', 'Fingerspell everything → leave'], 0, 'Think of a supported conversation flow.', 'A simple interactive flow supports real turn-taking.')
    ],
    revisionExercises: [
      ex('What is central to a guided exchange?', ['Shared attention and turn-taking', 'Only hand memorization', 'Avoiding questions'], 0, 'Conversation happens between people.', 'Attend, take turns, and respond.'),
      ex('What should you do when you lose the thread?', ['Clarify or restate the topic', 'Pretend to understand', 'Use random gestures'], 0, 'Repair reconnects.', 'Clarification is a useful conversational skill.'),
      ex('Can pauses communicate anything?', ['They can mark a turn transition', 'No, never', 'Only a question'], 0, 'Visual timing matters.', 'A pause can give the other signer space to respond.')
    ],
    explanations: {
      'What supports natural conversation?': 'Shared attention, turn-taking, and responses to the other signer make an exchange interactive rather than a recited script.',
      'What can eye gaze and pauses support?': 'Eye gaze and pauses support visual attention and turn management; they show that you are engaged and that a turn may be ending.',
      'What should you do after a partner completes a turn?': 'Respond to what they said or ask a relevant follow-up. Build on the shared topic.',
      'What if you lose the topic?': 'Clarify or restate the topic. Repair is a normal part of conversation.',
      'Why is an English script not enough?': 'ASL has its own grammar and visual interaction patterns; a memorised English script does not respond to the other signer.',
      'What makes a conversation collaborative?': 'Responding and adapting to the other signer, rather than ignoring them or practising alone.',
      'What can pauses communicate?': 'Pauses can mark a turn transition and give the other person space to respond.',
      'What is one way to repair a conversation?': 'Ask a clarifying question or restate the topic so both signers share the same frame.'
    }
  },

  asl_level_10: {
    level: 10,
    title: 'Revision and Practical Challenges',
    objectives: [
      { text: 'Review alphabet, fingerspelling, numbers, vocabulary, grammar, and conversation skills.', success: 'You can identify which foundation a mixed prompt is testing.' },
      { text: 'Evaluate your own weak spots and seek feedback from Deaf signers.', success: 'Your revision plan names a specific skill to improve.' },
      { text: 'Treat course completion as a foundation, not fluency.', success: 'You can name credible next steps for continued learning.' }
    ],
    vocabulary: [
      { term: 'Mixed review', context: 'Combining skills from earlier levels in realistic tasks.' },
      { term: 'Feedback', context: 'Information from signers and teachers that guides improvement.' },
      { term: 'Variation', context: 'Regional and community differences in signs.' },
      { term: 'Accessibility', context: 'Collaborative attention to how communication works for everyone.' }
    ],
    signNotes: [
      s('AGAIN as a revision cue', {
        handshape: 'Bent dominant hand with a flat non-dominant hand.',
        palmOrientation: 'Bring the bent fingertips to the flat palm.',
        movement: 'Arc the dominant hand down to contact the palm.',
        nonManualMarkers: 'A requesting or reflective expression supports “show me again”.',
        commonMistake: 'Using the repair sign without actually checking the corrected form.',
        source: 'ASL University AGAIN / REPEAT',
        verification: WRITTEN_REFERENCE
      }),
      s('FINISH as a milestone cue', {
        handshape: 'Both open hands in front of the body, fingers upward and facing you.',
        palmOrientation: 'Twist from palms facing you to somewhat forward.',
        movement: 'Twist quickly a couple of times; a single twist can feel more final.',
        nonManualMarkers: 'A satisfied or closing expression marks completion of a task.',
        commonMistake: 'Confusing completion with the warning variant noted on the source page.',
        source: 'ASL University FINISH',
        verification: WRITTEN_REFERENCE
      }),
      s('Continued-learning reference', {
        handshape: 'Use signs already learned from cited pages; do not add new unverified parameters in a revision level.',
        palmOrientation: 'Keep signs visible while receiving feedback.',
        movement: 'Apply earlier parameters accurately rather than adding flourish.',
        nonManualMarkers: 'Question or acknowledgement expressions support feedback exchange.',
        commonMistake: 'Claiming total mastery after a ten-level course.',
        source: 'Gallaudet ASL Connect and Lifeprint lessons',
        verification: LINKED_VIDEO_REVIEW
      })
    ],
    markers: [
      { cue: 'Reflective brow', use: 'Reviewing a missed item', example: 'Show that you are checking, not guessing.', caution: 'Do not hide uncertainty.' },
      { cue: 'Closing expression', use: 'FINISH', example: 'Mark the end of a practice task.', caution: 'Keep the variant appropriate.' },
      { cue: 'Attentive gaze', use: 'Receiving feedback', example: 'Watch the signer’s demonstration and ask for a repeat if needed.', caution: 'Do not interrupt by turning away.' }
    ],
    examples: [
      { situation: 'Mixed skill check', gloss: '[ fingerspell name ] / [ number ] / [ question ]', meaning: 'The prompt draws on several earlier foundations.', tip: 'Identify which skill is being tested before responding.' },
      { situation: 'Feedback exchange', gloss: 'AGAIN / [ repeat corrected form ] / UNDERSTAND?', meaning: 'Ask for a repeat, apply it, and confirm comprehension.', tip: 'Use the repair signs purposefully.' },
      { situation: 'Planning next steps', gloss: 'FINISH / [ plan practice with Deaf signers ]', meaning: 'Completion of the course is a milestone, not the end of learning.', tip: 'Name a concrete next learning action.' }
    ],
    revision: [
      { text: 'Alphabet: J and Z move.', detail: 'Most other letters are held shapes.' },
      { text: 'Fingerspelling: clarity before speed.', detail: 'Use a visible space and small pauses.' },
      { text: 'Numbers: context gives meaning.', detail: 'Isolated and series conventions differ.' },
      { text: 'Questions: face is grammar.', detail: 'Yes/no and wh markings differ.' },
      { text: 'Community: keep learning.', detail: 'Seek Deaf feedback and reputable sources.' }
    ],
    sources: src([
      ['alphabet', 'Level 1 foundation.'],
      ['fingerspelling', 'Level 2 foundation.'],
      ['numbers', 'Level 3 foundation.'],
      ['sentenceTypes', 'Question and non-manual grammar.'],
      ['gallaudetConnect', 'Continued university-level ASL resource.'],
      ['gallaudetLts', 'Linguistic reference excerpt for further study.']
    ]),
    guided: [
      ex('What is a responsible next step after this course?', ['Claim fluency after ten levels', 'Rely on an unsupported camera model', 'Continue with Deaf signers and trusted references'], 2, 'A course is a foundation.', 'Sustained learning and community feedback matter.'),
      ex('How should regional variation be treated?', ['With curiosity and respect', 'As an error', 'By mixing forms randomly'], 0, 'Living languages vary.', 'Ask and learn the local usage respectfully.'),
      ex('What can make communication more accessible?', ['Ask preferences and keep signing visible', 'Assume everyone has the same needs', 'Hide the hands'], 0, 'Accessibility is collaborative.', 'Ask what works for the person and keep the visual signal clear.')
    ],
    challenge: [
      ex('You encounter an unfamiliar local sign. What is the best response?', ['Label it incorrect immediately', 'Invent a replacement', 'Ask about local/community usage'], 2, 'Respect variation.', 'Ask and learn in context.'),
      ex('What does passing this assessment demonstrate?', ['Fluency in every context', 'Camera recognition accuracy', 'Progress on this curriculum, not total fluency'], 2, 'A test samples learning.', 'A milestone is not a fluency claim.'),
      ex('Which revision plan is most useful?', ['Review nothing and retake', 'Only memorise answer order', 'Pick one weak skill and seek feedback'], 2, 'Targeted improvement works.', 'A specific skill plus feedback leads to real progress.')
    ],
    revisionExercises: [
      ex('What is a good source for continued ASL learning?', ['Deaf signers and reputable educational references', 'Random image search results', 'Mock recognition output'], 0, 'Prioritise accurate community knowledge.', 'Learn from Deaf ASL users and vetted references.'),
      ex('How should a learner treat course completion?', ['As a foundation for continued learning', 'As proof of total mastery', 'As permission to assign name signs'], 0, 'Language learning is ongoing.', 'Keep learning and respect community practices.'),
      ex('What is the purpose of review?', ['Strengthen skills and identify gaps', 'Claim fluency', 'Avoid feedback'], 0, 'Review is diagnostic.', 'Mixed retrieval helps you see what needs more practice.')
    ],
    explanations: {
      'Does passing this course prove fluency?': 'No. Passing samples this curriculum’s skills; fluency develops through sustained use and interaction with Deaf signers.',
      'What is a responsible ongoing learning source?': 'Deaf signers, Deaf-led classes, and reputable educational references such as Gallaudet and ASL University.',
      'How should regional variation be treated?': 'With curiosity and respect. Ask about local usage instead of labelling every unfamiliar form an error.',
      'What can support accessibility?': 'Ask communication preferences, keep signing visible, and adapt to the person you are communicating with.',
      'What should a learner do with an unfamiliar local sign?': 'Ask about its context and meaning, and learn from the local community rather than rejecting or replacing it.',
      'What does continued ASL learning include?': 'Continued learning includes language practice, cultural knowledge, feedback, and interaction with Deaf signers.',
      'What is the purpose of review?': 'Review strengthens skills and identifies gaps through retrieval practice, not through memorising answer order.',
      'Who should you ask about communication preferences?': 'Ask the person you are communicating with; accessibility needs are individual and collaborative.'
    }
  }
};
