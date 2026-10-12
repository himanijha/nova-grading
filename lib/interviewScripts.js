// The dev, design, dev + PM, and design + PM interview scripts: fixed content
// (what to say, what to ask, what to listen for) alongside the question ids
// an InterviewReport's notes are keyed by. A "questions" section can mark an
// item with a `track` ("new" or "experienced") so it only shows once the
// interviewer picks that candidate's track; a null track means it always
// shows.

const SHARED_BEFORE = [
  "Interviews run 20 to 25 minutes inside a 30-minute slot. Save the last few minutes for their questions.",
  {
    important: true,
    lines: [
      "**PLEASE HAVE ONE PERSON ASK QUESTIONS WHILE THE OTHER PERSON TAKES NOTES!!**",
      "The person who asks the question should look at and respond to the candidate and be actively listening.",
    ],
  },
  "You guys can arrange the interview however you want, I would recommend switching off by section!",
  "Before the interview, skim their application and resume for context about year + experience level.",
  "For devs please check guage their experience and be ready to ask beginner vs. intermediate.",
  "For designers make sure they have a portfolio and if they have their laptop encourage them to open it up for a visual walk through!!",
  "For anyone that put just PM: ask them about whether they would rather be a dev or designer alongside being a PM, and switch to relevant document.",
  "ALL SMILES!!!",
  "Also please add natural transitions and respond concisely to their responses, like \"oh that was thoughtful\" ykyk.",
];

const DEV_PM_BEFORE = [
  "This tab is for candidates who marked only PM and lean toward dev. Confirm at the start: \"In Nova, PMs also build or design. Would you rather pair PM with dev or design?\" If they pick the other one, switch to the Design + PM tab.",
  ...SHARED_BEFORE,
];

const DESIGN_PM_BEFORE = [
  "This tab is for candidates who marked only PM and lean toward design. Confirm at the start: \"In Nova, PMs also build or design. Would you rather pair PM with dev or design?\" If they pick the other one, switch to the Dev + PM tab.",
  ...SHARED_BEFORE,
];

const DEV_TIMING = [
  "Introductions: 2 minutes",
  "General questions: 10 minutes",
  "Dev questions: 10 minutes",
  "Their questions: 3 to 5 minutes",
];

const DESIGN_TIMING = [
  "Introductions: 2 minutes",
  "General questions: < 10 minutes",
  "Design questions: 10 to 12 minutes (about 5 for their case study, the rest for the design process question)",
  "Their questions: 3 to 5 minutes",
];

const DEV_PM_TIMING = [
  "Introductions: 2 minutes",
  "General questions: 10 minutes",
  "Dev questions (case): about 7 minutes",
  "PM scenario: about 8 minutes",
  "Their questions: 3 to 5 minutes",
];

const DESIGN_PM_TIMING = [
  "Introductions: 2 minutes",
  "General questions: 10 minutes",
  "Design questions (case study): about 5 minutes",
  "PM scenario: about 8 to 10 minutes",
  "Their questions: 3 to 5 minutes",
];

const NOVA_INTROS = [
  { important: true, lines: ["**MAKE SURE TO READ OUT INTRODUCTIONS**"] },
  "Each interviewer shares: Name, Pronouns, Year/Major, Role in Nova.",
  "Ask for their name and pronouns, and CONFIRM what role they are interviewing for (so you can double check you have the right docs open).",
  "If they have listed only PM, ask them if they could choose either dev or design role in nova to compliment PM and use the PM alternate questions on each respective interview doc.",
  "Preface the interview by saying that we will be typing to take notes, so don't mind us if we are looking away.",
  "Preface by saying there are no wrong answers and we are just trying to see how they think and collaborate, make them feel at home!!",
];

const WAGS_CASE = [
  "Wags & Walks is a dog rescue based in Los Angeles, with programs in Nashville and New York. They pull dogs from shelters and place them in volunteer foster homes until they're adopted.",
  "We're building a web app for Wags & Walks with a matching feature that works almost like a dating app: the stakeholder wants users to be able to view dogs, match with dogs, and automatically connect matched adopters with a volunteer coordinator at Wags and Walks.",
  "FAQs (share only if they ask): Who would use it? People looking to foster or adopt a dog, and the rescue's coordinators, who follow up on matches. Who are the users? All ages and all levels of comfort with technology. Most will use the app on their phone. What's on a dog profile? Name, photos, age, size, breed, energy level, whether they're good with kids, dogs and cats, and which city they're in. How big is this? Assume a few hundred dogs a year across the three cities, with a small staff of coordinators.",
  "Before getting into casing, emphasize that there is no one correct answer to these questions, and we just want to see how people think! There will be no points taken off and it is completely okay to take a guess if unsure!",
];

const GENERAL_QUESTIONS = [
  {
    id: "about_yourself",
    prompt: "Please briefly tell us about yourself and your background.",
    guidance: [
      { label: "Look for", text: "interests and personality, whether they lean work-oriented or are a chiller, and what first impression they want to give." },
    ],
  },
  {
    id: "why_nova",
    prompt: "What draws you to Nova specifically and what do you hope to gain from this experience?",
    guidance: [
      { label: "Look for", text: "real interest in Nova and in building for nonprofits. Strong answers mention something specific from the info session or meet and greet, a past Nova project, or a cause they care about." },
      { label: "Red flags", text: "a generic answer that could apply to any club, or only wanting it for their resume." },
    ],
  },
  {
    id: "favorite_team",
    prompt: "What was your favorite time working in a team? What did you learn from it?",
    guidance: [
      { label: "Look for", text: "positive collaboration, learning about leadership, working with different personalities, giving and receiving feedback, accountability. Good answers say \"we\" and credit teammates." },
      { label: "Red flags", text: "only talks about themselves, or blames teammates." },
    ],
  },
  {
    id: "impact",
    prompt: "What is an initiative or volunteering experience where you felt you made a tangible impact? How did you measure that success?",
    guidance: [
      { label: "Look for", text: "a specific experience and a clear role they played in it. Strong answers name a concrete result (people served, something that changed, feedback from the people they helped) and explain how they knew it worked. If they didn't measure it at the time, a good answer reflects on how they would now. The focus stays on the people they helped, not on themselves." },
      { label: "Red flags", text: "vague impact (\"it went really well\"), measuring success only by hours logged or personal recognition, or not being able to say what they personally did." },
    ],
  },
];

const WRAP_UP_ITEMS = [
  { id: "gm_availability", prompt: "Nova's GMs are typically Tuesday 8 to 10pm. Does that time work for you?" },
  {
    id: "other_commitments",
    prompt: "What other commitments do you have or are currently interviewing for, and how will you balance them with Nova?",
    guidance: [
      { label: "Follow-up", text: "how much time their other commitments take, and which other clubs they're in the process with. Make sure they know being honest won't hurt them: we won't hold it against them if they're applying elsewhere, we just want to gauge their availability." },
      { label: "Look for", text: "a realistic plan and an honest answer." },
    ],
  },
  { id: "their_questions", prompt: "Do you have any questions for us before we close out?" },
];

const WRAP_UP_CLOSING = [
  "Answer their questions; sometimes one person answers, sometimes both, depending on the question. Be warm and friendly.",
  "Thank them for their time, be genuine from the bottom of your heart.",
  "Say you enjoyed talking to them.",
  "Tell them to expect to hear back by the end of the week!",
];

const devAfter = (rubricTitle) => [
  "Basically complete the portal.",
  `Each interviewer scores the candidate from 1 to 5 in each category using the ${rubricTitle} tab and records the scores in the application, right after the interview while it's fresh.`,
  "Add any general thoughts to the application before the next interview starts.",
];

const DEV_AFTER = devAfter("Dev Rubric");
const DESIGN_AFTER = devAfter("Design Rubric");

const DEV_RUBRIC = {
  title: "Dev Rubric",
  intro:
    "Each interviewer gives the candidate a score from 1 to 5 in each of the four categories below. Scores of 5, 3 and 1 are described; use 4 and 2 for answers in between. The same rubric applies to every candidate; record each candidate's scores in the application. Score technical ability against the track you used (newer or experienced dev), so a newer dev isn't marked down for not knowing database design.",
  categories: [
    {
      id: "behavioral",
      label: "Behavioral: passion for social good and personality",
      drawsFrom: "Tell us about yourself, Why Nova, and the commitments question.",
      anchors: {
        5: "Specific, personal reasons for wanting to build tech for nonprofits; mentions something specific about Nova; positive, curious and easy to talk to; honest and realistic about their time.",
        3: "Interested in Nova and social good, but in general terms; friendly but reserved; some uncertainty about how much time they can give.",
        1: "No real connection to social good or to Nova (the answer could be for any club); disengaged or negative; overcommitted with no plan.",
      },
    },
    {
      id: "technical",
      label: "Technical: technical ability",
      drawsFrom: "the case questions, the feature deep-dive, and the newer or experienced dev questions.",
      anchors: {
        5: "Picks features that solve the actual problem and explains why; walks through how they'd build one clearly; brings up edge cases on their own. Experienced devs propose a sound data model and efficient queries. Uses hints well.",
        3: "Reasonable features and a mostly clear approach, but needs a few hints; misses some edge cases or tradeoffs.",
        1: "Features don't address the problem; can't explain how they would build anything, even with hints.",
      },
    },
    {
      id: "collaboration",
      label: "Collaboration: communicating ideas and responding to constraints",
      drawsFrom: "the team question, the time-sensitive problem, learning on a deadline, and how they talk through the case.",
      anchors: {
        5: "Thinks out loud clearly and asks clarifying questions; credits teammates; adjusts when given new constraints or hints; asks for help early and with a specific ask.",
        3: "Communicates okay but is sometimes hard to follow; adapts to constraints when prompted.",
        1: "Hard to follow; ignores constraints or hints; talks only about themselves, or wouldn't ask for help.",
      },
    },
    {
      id: "nova_fit",
      label: "Nova fit",
      drawsFrom: "the interview as a whole.",
      anchors: {
        5: "Someone you'd be excited to have on your own team: engaged, easy to talk to, and clearly a good fit for Nova's culture and mission.",
        3: "Would fit in fine, but nothing about the interview stood out either way.",
        1: "Concerns about how they'd fit on a team or in Nova's culture.",
      },
    },
  ],
};

const DESIGN_RUBRIC = {
  title: "Design Rubric",
  intro:
    "Each interviewer gives the candidate a score from 1 to 5 in each of the four categories below. Scores of 5, 3 and 1 are described; use 4 and 2 for answers in between. The same rubric applies to every candidate; record each candidate's scores in the application. Score design ability against the track you used (newer or experienced designer).",
  categories: [
    {
      id: "behavioral",
      label: "Behavioral: passion for social good and personality",
      drawsFrom: "Tell us about yourself, Why Nova, Why design, and the commitments question.",
      anchors: {
        5: "Specific, personal reasons for wanting to build tech for nonprofits; mentions something specific about Nova; positive, curious and easy to talk to; honest and realistic about their time.",
        3: "Interested in Nova and social good, but in general terms; friendly but reserved; some uncertainty about how much time they can give.",
        1: "No real connection to social good or to Nova (the answer could be for any club); disengaged or negative; overcommitted with no plan.",
      },
    },
    {
      id: "technical",
      label: "Technical: design ability",
      drawsFrom: "the work they're proudest of and their process, and the design process or client question.",
      anchors: {
        5: "Explains design decisions with reasons tied to the people using it; describes a clear process (research, sketches, iteration, feedback); their work shows solid visual and UX fundamentals. Experienced designers handle scope tradeoffs thoughtfully.",
        3: "Decent work and a reasonable process, but explanations stay surface-level (\"it looked clean\"); process has gaps.",
        1: "Can't explain their decisions or process; the work shows little attention to the user.",
      },
    },
    {
      id: "collaboration",
      label: "Collaboration: communicating ideas and responding to constraints",
      drawsFrom: "the team question, the criticism question, and the client/design process follow-ups.",
      anchors: {
        5: "Takes criticism openly and asks clarifying questions; communicates boundaries and tradeoffs clearly; credits teammates; explains their ideas so a non-designer could follow.",
        3: "Open to feedback but somewhat passive or vague; communicates okay with some prompting.",
        1: "Defensive about feedback, or changes everything without asking why; can't explain ideas clearly; ignores constraints.",
      },
    },
    {
      id: "nova_fit",
      label: "Nova fit",
      drawsFrom: "the interview as a whole.",
      anchors: {
        5: "Someone you'd be excited to have on your own team: engaged, easy to talk to, and clearly a good fit for Nova's culture and mission.",
        3: "Would fit in fine, but nothing about the interview stood out either way.",
        1: "Concerns about how they'd fit on a team or in Nova's culture.",
      },
    },
  ],
};

export const DEV_SCRIPT = {
  role: "dev",
  rubric: DEV_RUBRIC,
  title: "Nova F26 Dev Interview",
  subtitle: "Script, questions and what to listen for. Score each candidate with the Dev Rubric tab.",
  sections: [
    { type: "info", key: "before", title: "Before the interview", bullets: SHARED_BEFORE },
    { type: "info", key: "timing", title: "Timing", bullets: DEV_TIMING },
    { type: "info", key: "intros", title: "Nova introductions", bullets: NOVA_INTROS, noteKey: "intros" },
    { type: "questions", key: "general", title: "General (behavioral) questions", items: GENERAL_QUESTIONS },
    {
      type: "questions",
      key: "dev-intro",
      title: "Dev technical questions",
      items: [
        {
          id: "dev_comfort",
          prompt: "What languages, frameworks, or technologies are you most comfortable with?",
          guidance: [
            { label: "Why we ask", text: "ask this before the case. It tells you which track to use (newer or experienced devs) and lets them answer the case in tools they know." },
          ],
        },
      ],
    },
    { type: "info", key: "case", title: "Case: Wags & Walks", bullets: WAGS_CASE },
    {
      type: "questions",
      key: "dev-case",
      title: "Case questions",
      items: [
        {
          id: "three_features",
          prompt: "What are 3 main features you would implement for this project?",
          guidance: [
            { label: "FAQ", text: "If they ask about what already exists, you can answer however you feel: \"You can assume this has been implemented\" or \"You can implement that if you would like!\" Prompt them to simply list the features." },
          ],
        },
        {
          id: "feature_implement",
          prompt: "Let's talk about the ____ feature you just mentioned. How would you go about implementing it? Remember, you can approach this question any way you want.",
          guidance: [
            { label: "For interviewers", text: "Don't steer them toward frontend, backend, database or state right away. Let them decide where to start. Ask follow-ups based on what they bring up. Don't take points off for not knowing specific terms if their reasoning is sound. Structure: initial prompt → progressive follow-ups, only if needed → the newer or experienced dev collaborative-reasoning question, in the last 5 minutes." },
            { label: "Progressive follow-ups", text: "Don't ask all of these — use them if they need help, or if they never touched an area (for example, they didn't mention where the data is stored). If they're stuck, start at the top." },
            { label: "If they need help getting started", text: "\"What information does the app need to keep track of for each dog?\" Good answers: name, photos, age, size, breed, energy level, whether they're good with kids, dogs and cats, city, whether the dog is still available, and which coordinator handles them. Strong candidates also think about what to store for each user: contact info, city, preferences, and which dogs they've already swiped on. \"Where do you think that information would be stored? When would it live in the backend/database vs. the frontend/local state?\" Information that needs to stick around or be shared (dog profiles, users, swipes, matches) goes in the backend/database; temporary screen info (which card is showing, filters someone is still picking) can live in frontend/local state." },
            { label: "Frontend / component prompts", text: "\"How would you divide the swipe screen into smaller components or parts?\" There's no single right answer — good answers could include the card stack, a dog profile card (photo, name, age, size, tags like \"good with cats\"), Like and Pass buttons, filters, a link to their matches, and a message for when there are no dogs left. \"What information would each part need?\" For example, a card needs one dog's profile, the stack needs the next few dogs, the Like and Pass buttons need the dog and the current user, and the matches page needs that user's matches." },
            { label: "Data / state prompts", text: "\"Imagine someone is picking filters (size, energy level, good with cats) but hasn't pressed Apply yet. Where should that information live?\" Good answer: locally, in frontend state (temporary form state)." },
            { label: "Swipe and match flow", text: "\"Now imagine I swipe right on a dog (or press Like). Walk me through what should happen from the moment I swipe. What should change on the screen?\" Good answers might include: the frontend handles the swipe, sends a request to the backend, the backend saves the swipe and creates a match, the coordinator gets notified, and the frontend shows a confirmation, moves to the next dog and adds the dog to their matches. For newer devs, even \"It should save that I liked the dog, let the rescue know, and show me the next one\" is fine — don't require exact API or backend terms. \"What could go wrong?\" Possible answers: the dog was already adopted, they already liked this dog, the request fails or the connection is slow, they aren't logged in, a double swipe creates two matches, or they swiped by accident and want to undo it." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "dev-new",
      title: "Newer devs",
      items: [
        {
          id: "dog_cards",
          track: "new",
          prompt: "Each dog gets a profile card that people swipe left or right on. Most people will use this on their phone, and some aren't very comfortable with tech. I was thinking swiping is the only way to like or pass. What are your thoughts on this implementation?",
          guidance: [
            { label: "Why we ask", text: "to see how they consider accessibility and good UX." },
            { label: "Follow-up (if they answer fast)", text: "\"How would someone undo a swipe they didn't mean?\"" },
          ],
        },
        {
          id: "coordinator_email",
          track: "new",
          prompt: "When someone likes a dog, a coordinator needs to reach out to them. I'm thinking we email the right coordinator every time there's a new match. What would we need to store to make that work, and how would we know which coordinator to email?",
          guidance: [
            { label: "Good answer", text: "save each match (which user + which dog) in the DB and give each dog a coordinator, so when a match is saved we look up that dog's coordinator and email them." },
            { label: "Follow-up (do this!)", text: "\"One more thing we just learned from the rescue: coordinators are getting the same match email two or three times, because people like the same dog again later or their phone sends the like twice. How would you make sure each person can only match with each dog once?\" Good reasoning: each person + dog pair should only exist once, so check whether that match already exists before saving it, or have the database enforce it (a unique rule on user + dog), and only send the email when a new match is actually created." },
            { label: "If they only handle it on the screen (hiding the dog, disabling the Like button)", text: "\"What if they like the same dog from their phone and their laptop at the same time?\" Each screen can't see the other device, so the rule has to live in the database, the one place every like goes through. Plain-language answers are fine — they don't need to say \"unique constraint\" if the idea is there." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "dev-experienced",
      title: "Experienced devs (or push beginner devs with these if you have time)",
      items: [
        {
          id: "data_model",
          track: "experienced",
          prompt: "We need to store dogs, users and every swipe. I was thinking we just keep a list of liked dog IDs on each user. What do you think of this approach? Can we easily view who liked a certain dog?",
          guidance: [
            { label: "Good answer", text: "a list on each user is fine for \"which dogs did I like?\", but to answer \"who liked this dog?\" you'd have to search through every user's list, which gets slow as more people join. Better: save each swipe as its own row (user, dog, like or pass), so it's quick to look up from either side. Other answers include DB manipulation, adding tables, etc. — be quick on your feet." },
            { label: "Follow-up (do this!)", text: "\"Suppose someone swipes right on a dog. We save the swipe, but the server crashes before the match gets created. What state is everything in now? Could we prevent this?\" Good reasoning: the like is saved but there's no match, so no coordinator ever reaches out and the person never hears back. Saving the swipe and creating the match should succeed or fail together (a transaction)." },
            { label: "If they get this quickly", text: "\"Now say we also email the coordinator in that same step. The match saves, but the email service is down. Should we undo the whole match?\" No — the match is the record that matters, so keep it and send the email separately, with a retry or an \"email pending\" flag the coordinator can see. An email can't be unsent, so it shouldn't be part of the all-or-nothing step. They don't need to say \"transaction\" if the idea of \"both happen or neither does\" is there." },
          ],
        },
        {
          id: "choosing_dogs",
          track: "experienced",
          prompt: "When someone opens the app, we need to show them their next batch of dogs. I was thinking we load every dog and shuffle them in the browser. Do you have any concerns about this, and how would you address them?",
          guidance: [
            { label: "Good answer", text: "loading every dog is slow on phones and includes adopted and already-swiped dogs. Have the database return a small batch of available dogs that match their filters and city and that they haven't swiped on, and preload the next card so swiping feels instant." },
            { label: "Follow-up (do this!)", text: "\"Suppose we load a batch of 20 dogs when someone opens the app. While they're swiping, one of those dogs gets adopted. What happens when they swipe right on it? Could we prevent this?\" Good reasoning: they'd match with a dog that's already gone and the coordinator gets a pointless email. The screen is always a little out of date, so the server should check the dog is still available when the swipe comes in and show a friendly \"this pup just found a home\" message." },
            { label: "If they get this quickly", text: "\"Now suppose a coordinator marks the wrong dog as adopted by mistake and fixes it an hour later. What happened to that dog during that hour, and what should happen now?\" It was hidden from everyone and swipes on it were turned away. If we had deleted the dog or its swipes, that's gone for good; if we only changed its status, fixing it brings the dog right back. So mark dogs as adopted instead of deleting them (change state in the DB, then change it back to a viewable state). \"Soft delete\" is a bonus term — what matters is that they see why marking beats deleting." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "dev-all",
      title: "All devs - bonus (if you have like 10 minutes left)",
      items: [
        {
          id: "learning_deadline",
          prompt: "You've been assigned a feature that needs tools or skills you're unfamiliar with, and you have a strict 2-week deadline. How would you learn and apply them so the feature is good quality? How would you communicate any bottlenecks you run into?",
          guidance: [
            { label: "Look for", text: "realistic, honest answers. A concrete plan (docs, tutorials, a small prototype first), knowing when and how to ask for help, flagging blockers early with a specific ask. Notice whether they learn more independently or collaboratively." },
          ],
        },
      ],
    },
    { type: "questions", key: "wrap-up", title: "Wrap-up", items: WRAP_UP_ITEMS },
    { type: "info", key: "wrap-up-closing", title: "Closing", bullets: WRAP_UP_CLOSING },
    { type: "info", key: "after", title: "After the interview", bullets: DEV_AFTER },
  ],
};

export const DESIGN_SCRIPT = {
  role: "design",
  rubric: DESIGN_RUBRIC,
  title: "Nova F26 Design Interview",
  subtitle: "Script, questions and what to listen for. Score each candidate with the Design Rubric tab.",
  sections: [
    { type: "info", key: "before", title: "Before the interview", bullets: SHARED_BEFORE },
    { type: "info", key: "timing", title: "Timing", bullets: DESIGN_TIMING },
    { type: "info", key: "intros", title: "Nova introductions", bullets: NOVA_INTROS, noteKey: "intros" },
    { type: "questions", key: "general", title: "General (behavioral) questions", items: GENERAL_QUESTIONS },
    {
      type: "questions",
      key: "design",
      title: "Design technical questions",
      items: [
        {
          id: "proud_work",
          prompt: "What is a design work (case study, graphic design, social media post) you are most proud of? Can you briefly walk us through it?",
          guidance: [
            { label: "Why we ask", text: "to understand them as a designer and how they work. It also tells you which track to use for the case (newer or experienced designers)." },
            { label: "Look for", text: "who it was for and what problem it solved, their process (research, sketches, iterations, testing), the reasons behind specific choices (layout, color, type, flow), and any results or feedback." },
            { label: "Note", text: "if they have their laptop, encourage them to pull up their portfolio for a visual walkthrough. Keep it to about 5 minutes, and it's okay to gently move them along. If they don't have a case study yet, any design work counts: a class project, a graphic, a social media post, or a redesign of an app they use." },
            { label: "Follow-ups (pick 1 or 2)", text: "\"If you had another week on it, what would you change?\" and \"Did you use any other apps / sources as inspiration (competitive analysis question)?\"" },
          ],
        },
      ],
    },
    { type: "info", key: "case", title: "Case: Wags & Walks", bullets: WAGS_CASE },
    {
      type: "info",
      key: "design-process-note",
      title: "Design process (ask one version, based on their experience)",
      bullets: [
        "Pick one: use the newer or experienced version depending on how their case study walkthrough went. You only need one.",
        "Don't steer them toward research, sketches or visuals right away. Let them decide where to start. Ask follow-ups based on what they bring up.",
        "Don't take points off for not knowing specific design terms if their reasoning is sound.",
        "Sketching is optional. Paper, an iPad or just talking it through are all fine.",
      ],
    },
    {
      type: "questions",
      key: "design-new",
      title: "Newer designers: designing the matching screen",
      items: [
        {
          id: "matching_screen",
          track: "new",
          prompt: "Your lead has just assigned you to design the screen where people browse and match with dogs for Wags & Walks. What process would you use to approach this design?",
          guidance: [
            { label: "Good answer", text: "a clear process. They figure out who the users are and what they need (all ages, mostly on phones), look for inspiration (a moodboard, similar apps), ask the lead for guidance, sketch, iterate, and get approval at each stage before going high fidelity." },
            { label: "If they're stuck, ask one at a time", text: "\"Who is using this, and what do they want to do first?\" \"What would you want to learn before you start?\" \"What would you sketch first?\"" },
            { label: "Follow-up (do this!)", text: "\"Suppose we launch, and coordinators tell us lots of people are matching with dogs that aren't a good fit, like people with cats liking dogs that aren't good with cats. What might be going on in the design? How could we fix it?\" Good reasoning: the info people need to judge fit is hidden or easy to miss, so they like based on the photo alone. Bring the key fit info onto the card, or ask about their home up front so dogs that don't fit are filtered out or flagged." },
            { label: "If they only suggest adding more text to the card", text: "\"The card is already small on a phone. How would you make that info stand out without adding clutter?\" Make it personal: ask about their home (kids, cats, other dogs) during setup, then only show a warning like \"Not good with cats\" when it matters for that person, using an icon plus a short label near the Like button. They don't need to say \"visual hierarchy\" or \"progressive disclosure\" if the idea is there." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design-experienced",
      title: "Experienced designers: a new feature request before handoff",
      items: [
        {
          id: "chat_feature_request",
          track: "experienced",
          prompt: "You've given Wags & Walks finalized wireframes to approve so the devs have enough time to build. They had already approved your mid-fis, but now they're asking for in-app chat so adopters can message coordinators directly, which would take a couple of weeks to prototype. What would be your response?",
          guidance: [
            { label: "Good answer", text: "don't just say yes or no. Weigh it against the timeline, loop in the devs on effort, and offer options, like moving chat to a later phase or shipping a simpler version now (a \"Request a meet-and-greet\" button or showing the coordinator's contact)." },
            { label: "Follow-up (do this!)", text: "\"Suppose we go with your simpler option and launch. A month later, coordinators say adopters keep asking them the same questions, like 'Is she house-trained?' and 'Can I meet her this weekend?' What does that tell you, and what would you change?\" Good reasoning: the dog profile is missing info people need before they commit, so add those details to the profile and make next steps (like booking a meet-and-greet) part of the flow. Real feedback like this is also how you'd decide whether full chat is worth building." },
            { label: "If they get this quickly", text: "\"How would you know whether your change actually worked?\" Check whether coordinators get fewer repeat questions and more matches turn into meet-and-greets, ask coordinators and a few adopters, or run a quick usability test. They don't need to name metrics or research methods — listen for \"I'd check whether it actually helped.\"" },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design-all",
      title: "All designers - bonus (if you have time)",
      items: [
        {
          id: "handling_criticism",
          prompt: "Let's say during a user interview session, a user tells you they think your designs are too confusing and not user-friendly. How do you react?",
          guidance: [
            { label: "Look for", text: "empathy and openness rather than defensiveness. They ask follow-up questions to find out what exactly is confusing instead of just doing what they're told, and they back their decisions with reasoning or user research." },
            { label: "Follow-up", text: "\"Tell us about a real time you got tough feedback on your work. What did you do with it?\"" },
            { label: "Red flags", text: "dismisses the feedback, or changes everything without asking why." },
          ],
        },
      ],
    },
    { type: "questions", key: "wrap-up", title: "Wrap-up", items: WRAP_UP_ITEMS },
    { type: "info", key: "wrap-up-closing", title: "Closing", bullets: WRAP_UP_CLOSING },
    { type: "info", key: "after", title: "After the interview", bullets: DESIGN_AFTER },
  ],
};

export const DEV_PM_SCRIPT = {
  role: "dev-pm",
  rubric: DEV_RUBRIC,
  title: "Nova F26 Dev + PM Interview",
  subtitle: "Script, questions and what to listen for. Score each candidate with the Dev Rubric tab.",
  sections: [
    { type: "info", key: "before", title: "Before the interview", bullets: DEV_PM_BEFORE },
    { type: "info", key: "timing", title: "Timing", bullets: DEV_PM_TIMING },
    { type: "info", key: "intros", title: "Nova introductions", bullets: NOVA_INTROS, noteKey: "intros" },
    { type: "questions", key: "general", title: "General (behavioral) questions", items: GENERAL_QUESTIONS },
    {
      type: "questions",
      key: "dev-pm-intro",
      title: "Dev + PM questions",
      items: [
        {
          id: "dev_comfort",
          prompt: "What languages, frameworks, or technologies are you most comfortable with?",
          guidance: [
            { label: "Why we ask", text: "ask this before the case so they can answer it in tools they know." },
          ],
        },
      ],
    },
    { type: "info", key: "case", title: "Case: Wags & Walks", bullets: WAGS_CASE },
    {
      type: "questions",
      key: "dev-pm-case",
      title: "Case questions",
      items: [
        {
          id: "three_features",
          prompt: "What are 3 main features you would implement for this project?",
          guidance: [
            { label: "FAQ", text: "If they ask about what already exists, you can answer however you feel: \"You can assume this has been implemented\" or \"You can implement that if you would like!\" Prompt them to simply list the features." },
          ],
        },
        {
          id: "feature_implement",
          prompt: "Let's talk about the ____ feature you just mentioned. How would you go about implementing it? Remember, you can approach this question any way you want.",
          guidance: [
            { label: "For interviewers", text: "Don't steer them toward frontend, backend, database or state right away. Let them decide where to start. If they're stuck, use the progressive follow-ups below, one at a time. Structure: initial prompt → progressive follow-ups, only if needed → the PM scenario below instead of a dev scenario. Keep the case to about 7 minutes so there's time for it." },
            { label: "If they need help getting started", text: "\"What information does the app need to keep track of for each dog?\" Good answers: name, photos, age, size, breed, energy level, whether they're good with kids, dogs and cats, city, whether the dog is still available, and which coordinator handles them. Strong candidates also think about what to store for each user: contact info, city, preferences, and which dogs they've already swiped on. \"Where do you think that information would be stored? When would it live in the backend/database vs. the frontend/local state?\" Information that needs to stick around or be shared (dog profiles, users, swipes, matches) goes in the backend/database; temporary screen info (which card is showing, filters someone is still picking) can live in frontend/local state." },
            { label: "Frontend / component prompts", text: "\"How would you divide the swipe screen into smaller components or parts?\" Good answers could include the card stack, a dog profile card (photo, name, age, size, tags like \"good with cats\"), Like and Pass buttons, filters, a link to their matches, and a message for when there are no dogs left. \"What information would each part need?\"" },
            { label: "Data / state prompts", text: "\"Imagine someone is picking filters (size, energy level, good with cats) but hasn't pressed Apply yet. Where should that information live?\" Good answer: locally, in frontend state (temporary form state)." },
            { label: "Swipe and match flow", text: "\"Now imagine I swipe right on a dog (or press Like). Walk me through what should happen from the moment I swipe. What should change on the screen?\" Good answers might include: the frontend handles the swipe, sends a request to the backend, the backend saves the swipe and creates a match, the coordinator gets notified, and the frontend shows a confirmation, moves to the next dog and adds the dog to their matches. \"What could go wrong?\" Possible answers: the dog was already adopted, they already liked this dog, the request fails or the connection is slow, they aren't logged in, a double swipe creates two matches, or they swiped by accident and want to undo it." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "pm-scenario",
      title: "PM scenario",
      items: [
        {
          id: "pm_fires_main",
          prompt:
            "Fast forward: you're the PM for this Wags & Walks app, and you're also one of its devs. It launched a month ago, and three things land on your desk the same Monday. First, coordinators in Nashville and New York say they're getting more matches than they can follow up on, and adopters are complaining that nobody ever reaches out. Second, a dev finds a bug that sometimes sends match emails to the wrong city's coordinator. Third, the rescue's director wants a new Success Stories page live before their big fundraising gala in three weeks. Your team is 3 devs and 2 designers, including you. What do you do this week?",
          guidance: [
            { label: "Before you start", text: "read the scenario out loud, then give them a minute to think. It's a lot on purpose — we want to see how they sort through it, not whether they land on one \"right\" answer. Read it slowly; they will likely ask you to repeat it." },
            {
              label: "Details (share only if they ask)",
              text: "How often does the bug happen? About 1 in every 20 matches. How many matches are coordinators getting? About 3 times what they can handle each week. What's the gala? The rescue's biggest fundraiser of the year; the board wants to show off the app there. How long would things take? The devs think the bug takes a few days and the Success Stories page takes about 2 weeks for one dev and one designer. Nobody's sure about the coordinator problem yet.",
            },
            {
              label: "Good answer",
              text: "fix the wrong-coordinator bug first, since real adopters are being lost and it's quick. Treat the coordinator overload as the real problem and find out why before building anything (talk to coordinators, look at the numbers). Don't just say yes or no to the gala page: ask what the director actually needs to show, and offer a smaller version that fits. Share the plan and the tradeoffs with the director and the team, using estimates from the devs, not guesses.",
            },
          ],
        },
        {
          id: "pm_fires_followup",
          prompt:
            "You bring your plan to the director. She says the gala page is non-negotiable: the board is expecting it, and a big donation depends on it. Your devs say they can't build the page and fix the coordinator problem in three weeks. What do you do now?",
          guidance: [
            { label: "Do this follow-up", text: "always ask it." },
            {
              label: "Good reasoning",
              text: "don't just cave or dig in. Find out what the gala really needs (maybe a few stories and photos on a simple page, not a full feature), cut scope on both sides, and split the team so the coordinator work doesn't stop. Write down the tradeoff and get the director to agree to it, so nobody is surprised later.",
            },
            {
              label: "If they say they'll just do it themselves or work extra",
              text: "\"You're the PM and also a dev on this team. How do you decide when to jump in yourself and when to stay focused on PM work?\" Jump in on a small, clearly defined piece that doesn't block anyone, but unblocking the team and talking to the client come first. A PM who disappears into code for a week leaves nobody steering, and the plan falls apart.",
            },
            { label: "Note", text: "there's no single right plan. Listen for whether they make a decision, explain the tradeoff, and bring both the team and the client along." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "dev-all",
      title: "All devs - bonus (if you have like 10 minutes left)",
      items: [
        {
          id: "learning_deadline",
          prompt: "You've been assigned a feature that needs tools or skills you're unfamiliar with, and you have a strict 2-week deadline. How would you learn and apply them so the feature is good quality? How would you communicate any bottlenecks you run into?",
          guidance: [
            { label: "Look for", text: "realistic, honest answers. A concrete plan (docs, tutorials, a small prototype first), knowing when and how to ask for help, flagging blockers early with a specific ask. Notice whether they learn more independently or collaboratively." },
          ],
        },
      ],
    },
    { type: "questions", key: "wrap-up", title: "Wrap-up", items: WRAP_UP_ITEMS },
    { type: "info", key: "wrap-up-closing", title: "Closing", bullets: WRAP_UP_CLOSING },
    { type: "info", key: "after", title: "After the interview", bullets: DEV_AFTER },
  ],
};

export const DESIGN_PM_SCRIPT = {
  role: "design-pm",
  rubric: DESIGN_RUBRIC,
  title: "Nova F26 Design + PM Interview",
  subtitle: "Script, questions and what to listen for. Score each candidate with the Design Rubric tab.",
  sections: [
    { type: "info", key: "before", title: "Before the interview", bullets: DESIGN_PM_BEFORE },
    { type: "info", key: "timing", title: "Timing", bullets: DESIGN_PM_TIMING },
    { type: "info", key: "intros", title: "Nova introductions", bullets: NOVA_INTROS, noteKey: "intros" },
    { type: "questions", key: "general", title: "General (behavioral) questions", items: GENERAL_QUESTIONS },
    {
      type: "questions",
      key: "design-pm-intro",
      title: "Design + PM questions",
      items: [
        {
          id: "proud_work",
          prompt: "What is a design work (case study, graphic design, social media post) you are most proud of? Can you briefly walk us through it?",
          guidance: [
            { label: "Why we ask", text: "to understand them as a designer and how they work." },
            { label: "Look for", text: "who it was for and what problem it solved, their process (research, sketches, iterations, testing), the reasons behind specific choices (layout, color, type, flow), and any results or feedback." },
            { label: "Note", text: "if they have their laptop, encourage them to pull up their portfolio for a visual walkthrough. Keep it to about 5 minutes, and it's okay to gently move them along. If they don't have a case study yet, any design work counts: a class project, a graphic, a social media post, or a redesign of an app they use." },
            { label: "Follow-ups (pick 1 or 2)", text: "\"If you had another week on it, what would you change?\" and \"Did you use any other apps / sources as inspiration (competitive analysis question)?\"" },
          ],
        },
      ],
    },
    { type: "info", key: "case", title: "Case: Wags & Walks", bullets: WAGS_CASE },
    {
      type: "questions",
      key: "pm-scenario",
      title: "PM scenario",
      items: [
        {
          id: "pm_fires_main",
          prompt:
            "Fast forward: you're the PM for this Wags & Walks app, and you're also one of its designers. It launched a month ago, and three things land on your desk the same Monday. First, coordinators in Nashville and New York say they're getting more matches than they can follow up on, and adopters are complaining that nobody ever reaches out. Second, a dev finds a bug that sometimes sends match emails to the wrong city's coordinator. Third, the rescue's director wants a new Success Stories page live before their big fundraising gala in three weeks. Your team is 3 devs and 2 designers, including you. What do you do this week?",
          guidance: [
            { label: "Before you start", text: "read the scenario out loud, then give them a minute to think. It's a lot on purpose — we want to see how they sort through it, not whether they land on one \"right\" answer. Read it slowly; they will likely ask you to repeat it." },
            {
              label: "Details (share only if they ask)",
              text: "How often does the bug happen? About 1 in every 20 matches. How many matches are coordinators getting? About 3 times what they can handle each week. What's the gala? The rescue's biggest fundraiser of the year; the board wants to show off the app there. How long would things take? The devs think the bug takes a few days and the Success Stories page takes about 2 weeks for one dev and one designer. Nobody's sure about the coordinator problem yet.",
            },
            {
              label: "Good answer",
              text: "fix the wrong-coordinator bug first, since real adopters are being lost and it's quick. Treat the coordinator overload as the real problem and find out why before building anything (talk to coordinators, look at the numbers). Don't just say yes or no to the gala page: ask what the director actually needs to show, and offer a smaller version that fits. Share the plan and the tradeoffs with the director and the team, using estimates from the devs, not guesses.",
            },
            {
              label: "Red flags",
              text: "says yes to everything, makes promises without checking with the devs or designers, jumps straight into the gala page because the director asked, or only talks about process (meetings, docs) without making a decision.",
            },
          ],
        },
        {
          id: "pm_fires_followup",
          prompt:
            "You bring your plan to the director. She says the gala page is non-negotiable: the board is expecting it, and a big donation depends on it. Your devs say they can't build the page and fix the coordinator problem in three weeks. What do you do now?",
          guidance: [
            { label: "Do this follow-up", text: "always ask it." },
            {
              label: "Good reasoning",
              text: "don't just cave or dig in. Find out what the gala really needs (maybe a few stories and photos on a simple page, not a full feature), cut scope on both sides, and split the team so the coordinator work doesn't stop. Write down the tradeoff and get the director to agree to it, so nobody is surprised later.",
            },
            {
              label: "If they say they'll just do it themselves or work extra",
              text: "\"You're the PM and also a designer on this team. How do you decide when to jump in yourself and when to stay focused on PM work?\" Jump in on a small, clearly defined piece that doesn't block anyone, but unblocking the team and talking to the client come first. A PM who disappears into Figma for a week leaves nobody steering, and the plan falls apart.",
            },
            { label: "Note", text: "there's no single right plan. Listen for whether they make a decision, explain the tradeoff, and bring both the team and the client along." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design-all",
      title: "All designers - bonus (if you have time)",
      items: [
        {
          id: "handling_criticism",
          prompt: "Let's say during a user interview session, a user tells you they think your designs are too confusing and not user-friendly. How do you react?",
          guidance: [
            { label: "Look for", text: "empathy and openness rather than defensiveness. They ask follow-up questions to find out what exactly is confusing instead of just doing what they're told, and they back their decisions with reasoning or user research." },
            { label: "Follow-up", text: "\"Tell us about a real time you got tough feedback on your work. What did you do with it?\"" },
            { label: "Red flags", text: "dismisses the feedback, or changes everything without asking why." },
          ],
        },
      ],
    },
    { type: "questions", key: "wrap-up", title: "Wrap-up", items: WRAP_UP_ITEMS },
    { type: "info", key: "wrap-up-closing", title: "Closing", bullets: WRAP_UP_CLOSING },
    { type: "info", key: "after", title: "After the interview", bullets: DESIGN_AFTER },
  ],
};

/** The dev, design, dev + PM, or design + PM script for a sheet's Role(s) text ("Dev + PM", "Design"). */
export function scriptFor(roleRaw) {
  const role = String(roleRaw ?? "").toLowerCase();
  const isDesign = role.includes("design");
  const isPM = role.includes("pm");
  if (isDesign) return isPM ? DESIGN_PM_SCRIPT : DESIGN_SCRIPT;
  return isPM ? DEV_PM_SCRIPT : DEV_SCRIPT;
}

export const TRACKS = [
  { value: "new", label: "Newer candidate" },
  { value: "experienced", label: "Experienced candidate" },
];

export const VERDICTS = [
  { value: "STRONG_ACCEPT", label: "Strong accept" },
  { value: "SOFT_YES", label: "Soft yes" },
  { value: "NO", label: "No" },
  { value: "MAYBE", label: "Maybe" },
];
