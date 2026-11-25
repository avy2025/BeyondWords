const mc = (prompt, options, correct, explanation) => ({
  type: 'MULTIPLE_CHOICE', prompt, options, correct, explanation
});
const match = (prompt, prefix, pairs, explanation) => ({
  type: 'MATCHING',
  prompt,
  matchingPairs: pairs.map(([left, right], i) => ({
    leftId: `${prefix}_l${i + 1}`,
    left,
    rightId: `${prefix}_r${i + 1}`,
    right
  })),
  explanation
});
const blank = (prompt, blankText, acceptedAnswers, explanation) => ({
  type: 'FILL_BLANK', prompt, blankText, acceptedAnswers, explanation
});

export const PHASE42_QUESTIONS_B = {
  asl_level_06: [
    mc(
      'Which handshape initializes FAMILY in the cited source?',
      ['F hands', 'W hands', 'S fists'],
      0,
      'FAMILY uses F hands tracing a circle; related group signs share the circle with a different initialized handshape.'
    ),
    match(
      'Match each relationship sign with its documented parameter.',
      'l6a',
      [
        ['FAMILY', 'F hands tracing a circle'],
        ['SISTER', 'Dominant G/L-to-G movement to a base hand'],
        ['BROTHER', 'Dominant L/G-to-index movement'],
        ['Name sign', 'Given by the person or community']
      ],
      'These pairings reflect the parameter descriptions and the cultural note about name signs.'
    ),
    blank(
      'Complete the name-sign note with one word.',
      'If you do not know someone’s name sign, ____ their name when appropriate.',
      ['fingerspell', 'spell', 'fingerspelling'],
      'Fingerspelling gives the exact name without a learner inventing a culturally meaningful name sign.'
    ),
    mc(
      'Why are MOTHER and FATHER marked as requiring video review in this course?',
      ['The written pages did not expose reliable parameters', 'The signs do not exist', 'Only family members may see them'],
      0,
      'The source pages provide video links; the course links them rather than inventing handshape details.'
    ),
    mc(
      'Who should choose the terms used for a person’s relationships?',
      ['The learner', 'The person', 'A random dictionary'],
      1,
      'Self-identification matters; use the terms the person uses for their own relationships.'
    )
  ],

  asl_level_07: [
    mc(
      'What does repeating the GO movement mean in the cited source?',
      ['Stop', 'Attend', 'Finish'],
      1,
      'Lifeprint notes that a single GO is quick and that repeating it can mean “attend”.'
    ),
    match(
      'Match each action sign with its movement or handshape clue.',
      'l7a',
      [
        ['FINISH', 'Two open hands twist forward'],
        ['AGAIN', 'Bent dominant fingertips touch a flat palm'],
        ['UNDERSTAND', 'Index flicks upward near the forehead'],
        ['WORK', 'S fists tap with palms down']
      ],
      'Each pairing uses a documented handshape or movement parameter from the action-sign references.'
    ),
    blank(
      'Complete the routine note with one word.',
      'Set a clear ____ before sequencing daily actions.',
      ['topic', 'context', 'frame'],
      'A topic frames the sequence so the listener knows what the routine describes.'
    ),
    mc(
      'Which sign uses flat hands in a double clapping movement?',
      ['SCHOOL', 'WORK', 'GO'],
      0,
      'Lifeprint describes SCHOOL with flat hands, bringing the dominant hand down onto the base hand twice.'
    ),
    mc(
      'What should a learner avoid when describing a routine?',
      ['A clear sequence', 'Mechanical word-for-word English translation', 'Visible transitions'],
      1,
      'ASL has its own grammar; express meaning through context and visual sequencing.'
    )
  ],

  asl_level_08: [
    mc(
      'Which expression is described for NAME YOU? on the Lifeprint NAME page?',
      ['Neutral face', 'Furrowed brows and slight forward head tilt', 'Closed eyes'],
      1,
      'The page explicitly describes furrowed eyebrows and a slight forward head tilt for the wh-question expression.'
    ),
    match(
      'Match each question cue with its correct use.',
      'l8a',
      [
        ['Raised brows', 'Yes/no question marking'],
        ['Furrowed brows', 'Wh-question marking'],
        ['AGAIN', 'Ask for a repetition'],
        ['UNDERSTAND?', 'Check comprehension']
      ],
      'Question type is marked non-manually, and repair signs help keep a conversation accurate.'
    ),
    blank(
      'Complete the grammar note with one word.',
      'Facial expression can be ____ in ASL, not merely decorative.',
      ['grammatical', 'grammar', 'meaningful'],
      'Non-manual markers can mark sentence type and scope, which makes facial expression grammatical.'
    ),
    mc(
      'Is the wh-sign always placed at the end of an ASL question?',
      ['Yes, always', 'No; common but not absolute', 'Only in short questions'],
      1,
      'Lifeprint notes that final placement is common but not an exceptionless rule.'
    ),
    mc(
      'What is better than pretending to understand a message?',
      ['Request clarification', 'Nod falsely', 'Change the subject silently'],
      0,
      'Honest repair keeps communication accurate and gives the signer a chance to clarify.'
    )
  ],

  asl_level_09: [
    mc(
      'What do eye gaze and pauses help manage in ASL conversation?',
      ['Turns and attention', 'Only number handshapes', 'Only spelling speed'],
      0,
      'Visual interaction cues help show who is signing and when a turn may end.'
    ),
    match(
      'Match each conversation step with its purpose.',
      'l9a',
      [
        ['Visual attention', 'Start an interaction appropriately'],
        ['Pause and settle', 'Yield a turn'],
        ['Relevant response', 'Build on what the partner signed'],
        ['Clarifying question', 'Repair a lost topic']
      ],
      'A guided exchange is interactive: attention, turn-taking, response, and repair all matter.'
    ),
    blank(
      'Complete the conversation note with one word.',
      'A memorised English script is not enough because ASL has its own ____ and visual interaction.',
      ['grammar', 'structure', 'syntax'],
      'Meaning depends on ASL grammar and responding to the other signer, not reciting English word order.'
    ),
    mc(
      'Your partner finishes a turn. What is the best next action?',
      ['Respond to the shared topic', 'Start an unrelated monologue', 'Turn away'],
      0,
      'A relevant response keeps the exchange collaborative.'
    ),
    mc(
      'Which sequence best fits a guided conversation?',
      ['Attention → topic → question → response → repair if needed', 'Question → random gesture → silence', 'Fingerspell everything → leave'],
      0,
      'This simple flow supports shared attention, turn-taking, and repair.'
    )
  ],

  asl_level_10: [
    mc(
      'What does passing this curriculum demonstrate?',
      ['Fluency in every ASL context', 'Progress on this curriculum, not total fluency', 'Camera recognition accuracy'],
      1,
      'An assessment samples learning; fluency develops through continued use and community interaction.'
    ),
    match(
      'Match each revision area with its review cue.',
      'l10a',
      [
        ['Alphabet', 'J and Z require movement'],
        ['Fingerspelling', 'Clarity before speed'],
        ['Numbers', 'Context gives meaning'],
        ['Questions', 'Non-manual marking matters']
      ],
      'Mixed revision should reconnect each skill with its defining foundation.'
    ),
    blank(
      'Complete the continued-learning note with one word.',
      'Seek feedback from Deaf signers and use ____ educational references.',
      ['reputable', 'trusted', 'credible'],
      'Reliable community feedback and credible sources support responsible continued learning.'
    ),
    mc(
      'How should regional variation be treated after this course?',
      ['With curiosity and respect', 'As an error', 'By mixing forms randomly'],
      0,
      'Variation is normal in living languages; ask about local usage rather than judging it immediately.'
    ),
    mc(
      'Which accessibility practice is most collaborative?',
      ['Ask the person about communication preferences', 'Assume everyone needs the same thing', 'Hide your hands while signing'],
      0,
      'Accessibility needs are individual; ask the person you are communicating with.'
    )
  ]
};
