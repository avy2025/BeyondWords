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

export const PHASE42_QUESTIONS_A = {
  asl_level_01: [
    mc(
      'Which feature makes J different from a held I handshape?',
      ['The thumb crosses the fingers', 'The index finger stays perfectly still', 'The little finger traces a J-shaped path'],
      2,
      'J begins with the I configuration, but the little fingertip must trace a J-shaped curve in the air.'
    ),
    match(
      'Match each alphabet feature to the letters it best describes.',
      'l1a',
      [
        ['Three fingers cover the thumb', 'M'],
        ['Two fingers cover the thumb', 'N'],
        ['Thumb crosses the front of the fist', 'S'],
        ['Index finger traces a three-stroke path', 'Z']
      ],
      'M/N are distinguished by the number of covering fingers, S by the crossed thumb, and Z by its traced path.'
    ),
    blank(
      'Complete the alphabet note with one capital letter.',
      'The two movement letters in the manual alphabet are J and ____.',
      ['Z', 'z'],
      'J uses the little fingertip and Z uses the index finger; both require a visible movement path.'
    ),
    mc(
      'Which comparison is correctly described?',
      ['K and P use the same configuration but different orientation', 'U and V differ only in thumb position', 'A and S both cross the thumb over the fingers'],
      0,
      'P is the K handshape turned downward, so configuration stays the same while palm orientation changes.'
    ),
    mc(
      'Why does the course link to a handshape chart instead of embedding a generated picture?',
      ['A picture would be too small', 'A verified reference avoids inventing an unsupported hand image', 'Generated pictures are always faster'],
      1,
      'The linked ASL University chart is a credible visual reference; no handshape is invented or generated.'
    )
  ],

  asl_level_02: [
    mc(
      'A partner cannot read a fingerspelled name. What is the best first adjustment?',
      ['Increase arm swing after every letter', 'Repeat more clearly at a comfortable pace', 'Skip repeated letters'],
      1,
      'Clarity before speed is the beginner priority; a readable sequence is more useful than a fast one.'
    ),
    match(
      'Match each fingerspelling idea with its purpose.',
      'l2a',
      [
        ['Small pause', 'Separates fingerspelled words'],
        ['Consistent signing space', 'Keeps the hand visible'],
        ['Clarification request', 'Repairs an unclear name'],
        ['J or Z trace', 'Preserves a movement letter inside a sequence']
      ],
      'These four habits support readable, interactive fingerspelling rather than a rushed letter stream.'
    ),
    blank(
      'Complete the fingerspelling principle with one word.',
      'For beginners, ____ comes before speed.',
      ['clarity', 'clear', 'clearness'],
      'Readable handshapes and a steady rhythm must be established before increasing pace.'
    ),
    mc(
      'Which statement about fingerspelling is accurate?',
      ['It replaces all ASL vocabulary', 'It is useful for names and some exact written forms', 'It only works with a camera'],
      1,
      'Fingerspelling complements established ASL signs; it is especially useful for names and exact written terms.'
    ),
    mc(
      'A spelled sequence contains J. What must still happen?',
      ['The little finger traces a J path', 'The hand must stop moving', 'The index finger becomes a W'],
      0,
      'Movement letters keep their movement even inside a longer fingerspelled sequence.'
    )
  ],

  asl_level_03: [
    mc(
      'Which context is commonly described as using a palm-forward number form?',
      ['A casual isolated 2', 'An age or a phone-number series', 'A number shown only in writing'],
      1,
      'Lifeprint describes palm-forward forms for series, ages, time, and emphasis, while casual isolated 1–5 are often palm-back.'
    ),
    match(
      'Match each number topic with the clue that gives it meaning.',
      'l3a',
      [
        ['AGE topic', 'The number is interpreted as years'],
        ['TIME context', 'The number is interpreted as a clock or schedule value'],
        ['Counting topic', 'The number is interpreted as a quantity'],
        ['Unclear digit', 'Ask for repetition or confirmation']
      ],
      'The surrounding topic tells the listener how to interpret a number; repair prevents a wrong value being assumed.'
    ),
    blank(
      'Complete the number practice note with one word.',
      'Keep each number form clear and ____ so the viewer can distinguish it.',
      ['visible', 'in view', 'visibly'],
      'A hidden or rushed form cannot be read; visibility is essential for number clarity.'
    ),
    mc(
      'What should you compare when two number forms are confusing?',
      ['Handshape and orientation in a trusted reference', 'The colour of the signer’s shirt', 'Only English spelling'],
      0,
      'Handshape and palm orientation are the visual parameters to compare in a reputable ASL source.'
    ),
    mc(
      'Does the same number value ever use a different palm orientation by context?',
      ['No, never', 'Yes', 'Only in writing'],
      1,
      'Yes. Lifeprint distinguishes casual isolated forms from series, ages, time, and emphasis.'
    )
  ],

  asl_level_04: [
    mc(
      'Which description matches THANK YOU in the cited source?',
      ['Flat hand near the lips moving forward and down', 'A hand circling the chest', 'Two index fingers tapping together'],
      0,
      'Lifeprint describes a flat hand starting near the lips, moving forward and a bit down, with a smile.'
    ),
    match(
      'Match each greeting form with its documented cue.',
      'l4a',
      [
        ['HELLO', 'Generally side-to-side wave'],
        ['THANK YOU', 'Smile with the outward flat-hand movement'],
        ['SORRY', 'A-hand rotation with a sorry face'],
        ['PLEASE', 'Flat hand circling the chest or a pleading expression']
      ],
      'Each greeting combines a manual form with a specific non-manual cue or movement described in the source pages.'
    ),
    blank(
      'Complete the greeting note with one word.',
      'Before beginning a visual greeting, establish ____ attention respectfully.',
      ['visual', 'eye', 'visual attention'],
      'ASL is visual; the other person must be able to see the greeting before it begins.'
    ),
    mc(
      'What does Lifeprint say about the sign for HELLO?',
      ['There is one universal wave only', 'A side-to-side wave is typical, but wave styles vary', 'It must be signed with a fist'],
      1,
      'The source notes there is no single universal wave while describing side-to-side as the general pattern.'
    ),
    mc(
      'Why is a pause after a greeting useful?',
      ['It gives the other signer a turn', 'It replaces the greeting', 'It hides the hand'],
      0,
      'Turn-taking is part of interaction; a pause lets the other person respond.'
    )
  ],

  asl_level_05: [
    mc(
      'Which sign uses a W hand with the index finger touching the mouth twice?',
      ['WATER', 'DRINK', 'EAT'],
      0,
      'Lifeprint describes WATER with a W hand and two contacts of the index finger at the mouth.'
    ),
    match(
      'Match each everyday sign with its documented parameter.',
      'l5a',
      [
        ['DRINK', 'C hand in a short arc to the mouth'],
        ['EAT', 'Squished O hand toward the mouth'],
        ['HOME', 'Cheek contact moving toward the ear'],
        ['NEED', 'X hand bending down at the wrist']
      ],
      'Handshape, orientation, and movement distinguish these everyday signs; each pairing follows a Lifeprint description.'
    ),
    blank(
      'Complete the vocabulary note with one word.',
      'Learn signs in meaningful ____ instead of disconnected English labels.',
      ['context', 'contexts', 'situation', 'situations'],
      'Meaning and situation guide sign choice; languages do not map word-for-word.'
    ),
    mc(
      'What is a respectful response to a regional sign variant?',
      ['Check the context and ask local signers', 'Label it an error immediately', 'Mix signs randomly'],
      0,
      'Variation is a normal feature of living languages; context and community usage matter.'
    ),
    mc(
      'Which statement about HELP is supported by the cited source?',
      ['Only the right hand is ever correct', 'Several hand-choice forms are documented', 'It uses no handshape'],
      1,
      'Lifeprint documents variation in hand choice and advises learning from local Deaf signers.'
    )
  ]
};
