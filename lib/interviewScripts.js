// The dev and design interview scripts: fixed content (what to say, what to
// ask, what to listen for) alongside the question ids an InterviewReport's
// notes are keyed by. A "questions" section can mark an item with a `track`
// ("new" or "experienced") so it only shows once the interviewer picks that
// candidate's track; a null track means it always shows.

const DEV_BEFORE = [
  "Interviews run 20 to 25 minutes inside a 30-minute slot. Save the last few minutes for their questions.",
  "Please have one person ask questions while the other person takes notes!!",
  "You guys can arrange the interview however you want, I would recommend switching off by section!",
  "Before the interview, skim their application and resume for context about year + experience level.",
  "For devs please check guage their experience and be ready to ask beginner vs. intermediate.",
  "For designers make sure they have a portfolio and if they have their laptop encourage them to open it up for a visual walk through!!",
];

const DEV_TIMING = [
  "Introductions: 2 minutes",
  "General questions: 10 minutes",
  "Dev questions: 10 minutes",
  "Their questions: 3 to 5 minutes",
];

const DEV_INTROS = [
  "Each interviewer shares: Name, Pronouns, Year/Major, Role in Nova.",
  "Ask for their name and pronouns, and CONFIRM what role they are interviewing for (so you can double check you have the right docs open).",
  "If they have listed only PM, ask them if they could choose either dev or design role in nova to compliment PM and use the PM alternate questions on each respective interview doc.",
  "Preface the interview by saying that we will be typing to take notes, so don't mind us if we are looking away.",
  "Preface by saying there are no wrong answers and we are just trying to see how they think and collaborate, make them feel at home!!",
];

const DEV_AFTER = [
  "Each interviewer scores the candidate from 1 to 5 in each category using the Dev Rubric tab and records the scores in the application, right after the interview while it's fresh.",
  "Add any general thoughts to the application before the next interview starts.",
];

const WAGS_CASE = [
  "Wags & Walks is a dog rescue based in Los Angeles, with programs in Nashville and New York. They pull dogs from shelters and place them in volunteer foster homes until they're adopted.",
  "We're building a web app for Wags & Walks with a matching feature that works like a dating app: people swipe through dog profiles and like the ones they want to foster or adopt. A like creates a match, and a coordinator from the rescue reaches out about next steps.",
  "FAQs (share only if they ask): Who would use it? People looking to foster or adopt a dog, and the rescue's coordinators, who follow up on matches. Who are the users? All ages and all levels of comfort with technology. Most will use the app on their phone. What's on a dog profile? Name, photos, age, size, breed, energy level, whether they're good with kids, dogs and cats, and which city they're in. How big is this? Assume a few hundred dogs a year across the three cities, with a small staff of coordinators.",
];

const DEV_RUBRIC = {
  title: "Dev Rubric",
  intro:
    "Each interviewer gives the candidate a score from 1 to 5 in each of the three categories below. Scores of 5, 3 and 1 are described; use 4 and 2 for answers in between. The same rubric applies to every candidate; record each candidate's scores in the application. Score technical ability against the track you used (newer or experienced dev), so a newer dev isn't marked down for not knowing database design.",
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
  ],
};

export const DEV_SCRIPT = {
  role: "dev",
  rubric: DEV_RUBRIC,
  title: "Nova F26 Dev Interview",
  subtitle: "Script, questions and what to listen for. Score each candidate with the Dev Rubric tab.",
  sections: [
    { type: "info", key: "before", title: "Before the interview", bullets: DEV_BEFORE },
    { type: "info", key: "timing", title: "Timing", bullets: DEV_TIMING },
    { type: "info", key: "intros", title: "Nova introductions", bullets: DEV_INTROS },
    {
      type: "questions",
      key: "general",
      title: "General (behavioral) questions",
      items: [
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
      ],
    },
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
            { label: "Why we ask", text: "the case is open-ended, so there's no single right answer. Limiting them to 3 features shows what they prioritize and whether the features fit what the app needs to do." },
            { label: "Look for", text: "each feature is tied to a specific user, for example a deck of dog profiles to swipe through, filters for what someone is looking for (size, energy level, good with kids or cats), a page where people can see the dogs they matched with, and a coordinator view of every new match. They explain why these come first. Strong candidates ask clarifying questions, think about what happens after a match, or bring up ease of use for people who aren't comfortable with tech without being prompted." },
            { label: "Follow-ups", text: "\"If you could only ship one of these first, which one and why?\" and \"Who uses each feature: people looking to adopt or foster, or coordinators?\"" },
            { label: "Red flags", text: "features unrelated to the app with no reasoning behind them." },
          ],
        },
        {
          id: "feature_implement",
          prompt: "Let's talk about the ____ feature you just mentioned. How would you implement it, and what concerns would you have?",
          guidance: [
            { label: "Why we ask", text: "it's open-ended. Experienced devs can talk about the data model, endpoints and overall flow. Newer devs can walk through the user flow and screens." },
            { label: "Look for", text: "walks through the flow step by step, names the data they need, and brings up edge cases (a dog gets adopted while people are still swiping on it, two people match with the same dog, someone runs out of dogs to swipe on, photos load slowly on a weak connection). Thinks about how someone who isn't comfortable with tech, or who uses a screen reader, would get through it. Experienced devs give reasons for their tech choices." },
            { label: "Follow-ups", text: "\"What would you need to ask Wags & Walks before building this?\" and \"How would a coordinator find out about a new match?\"" },
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
          prompt: "Each dog gets a profile card that people swipe left or right on. Most people will use this on their phone, and some aren't very comfortable with tech. I was thinking swiping is the only way to like or pass. How would you set up the card so it's easy for everyone to use?",
          guidance: [
            { label: "Why we ask", text: "to see whether they think about the person using the page, not only the code. Accessibility and UI/UX are part of every dev's job at Nova." },
            { label: "Look for", text: "they notice that swipe-only doesn't work for everyone (screen-reader and keyboard users, people with limited hand movement, people who don't know to swipe) and add visible Like and Pass buttons. Large photos and text, the most important info up front (name, age, size, good with kids), alt text on photos, readable color contrast, a clear confirmation after a like, and a way to undo an accidental swipe." },
            { label: "Hints if stuck", text: "\"Picture someone's grandparent using this on their phone for the first time. What would trip them up?\"" },
            { label: "Follow-ups", text: "\"What would you put on the front of the card, and what would you hide behind a tap?\" and \"How would someone undo a swipe they didn't mean?\"" },
          ],
        },
        {
          id: "coordinator_email",
          track: "new",
          prompt: "When someone likes a dog, a coordinator needs to reach out to them. I'm thinking we email the right coordinator every time there's a new match. What would we need to store to make that work, and how would we know which coordinator to email?",
          guidance: [
            { label: "Why we ask", text: "a light database question. We care more about what they'd store and their logic than about specific tools." },
            { label: "Look for", text: "each like is saved with the person, the dog and the date; each dog has a city or an assigned coordinator, so the match goes to the right person; an email service sends the message. Bonus for not emailing twice when someone likes the same dog again, sending a daily summary instead of one email per match, giving each match a status (new, contacted, done) so coordinators can see who still needs a reply, and letting the person know the rescue got their match." },
            { label: "Hints if stuck", text: "\"Think about what one row in a spreadsheet of matches would look like. What would we save for each one?\"" },
            { label: "Follow-ups", text: "\"What if that coordinator is out for a week?\" and \"How would the person who matched know what happens next?\"" },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "dev-experienced",
      title: "Experienced devs",
      items: [
        {
          id: "data_model",
          track: "experienced",
          prompt: "We need to store dogs, users and every swipe. I was thinking we just keep a list of liked dog IDs on each user. What do you think?",
          guidance: [
            { label: "Why we ask", text: "to see how they model relationships, and whether they push back on a design that loses data." },
            { label: "Look for", text: "they point out that a list of likes on the user doesn't record passes (so people keep seeing dogs they already passed on), makes it hard for coordinators to see everyone who liked a given dog, and grows without limit. They suggest a swipes table or collection that links a user and a dog with the direction (like or pass) and a timestamp, plus a matches record with a status (new, contacted, adopted). They pick SQL or NoSQL with a reason." },
            { label: "Follow-ups", text: "\"How would a coordinator see everyone who matched with one dog?\" and \"Do we need to store passes at all? Why?\"" },
          ],
        },
        {
          id: "choosing_dogs",
          track: "experienced",
          prompt: "When someone opens the app, we need to show them their next batch of dogs. I was thinking we load every dog and shuffle them in the browser. Any concerns, and how would you build it?",
          guidance: [
            { label: "Why we ask", text: "it covers efficient querying, UI/UX and performance in one question." },
            { label: "Look for", text: "concerns about loading every dog (slow on phones, and it shows adopted dogs and dogs they already swiped on). They filter in the database query: only available dogs that match the person's filters and city, excluding dogs they've already swiped on, returned in small batches. Indexes on the filter fields and on swipes by user and dog; resized or lazy-loaded photos; loading the next card ahead of time so swiping feels instant." },
            { label: "Follow-ups", text: "\"What should someone see once they've swiped through every dog?\" and \"A dog gets adopted while it's sitting in someone's batch. How would you handle that?\"" },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "dev-all",
      title: "All devs",
      items: [
        {
          id: "learning_deadline",
          prompt: "You've been assigned a feature that needs tools or skills you're unfamiliar with, and you have a strict 2-week deadline. How would you learn and apply them so the feature is good quality? How would you communicate any bottlenecks you run into?",
          guidance: [
            { label: "Look for", text: "realistic, honest answers. A concrete plan (docs, tutorials, a small prototype first), knowing when and how to ask for help, flagging blockers early with a specific ask. Notice whether they learn more independently or collaboratively." },
            { label: "Follow-up", text: "\"Tell us about a time you had to learn a new tool or language quickly.\"" },
            { label: "Red flags", text: "wouldn't ask for help, or would wait until the deadline to say they're stuck." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "wrap-up",
      title: "Wrap-up",
      items: [
        { id: "gm_availability", prompt: "Nova's GMs are Tuesday 8 to 10pm. Does that work for you?" },
        {
          id: "other_commitments",
          prompt: "What other commitments do you have or are currently interviewing for, and how will you balance them with Nova?",
          guidance: [
            { label: "Follow-up", text: "how much time their other commitments take, and which other clubs they're in the process with. Make sure they know being honest won't hurt them: we won't hold it against them if they're applying elsewhere, we just want to gauge their availability." },
            { label: "Look for", text: "a realistic plan and an honest answer." },
          ],
        },
        { id: "their_questions", prompt: "Do you have any questions for us before we close out?" },
      ],
    },
    { type: "info", key: "after", title: "After the interview", bullets: DEV_AFTER },
  ],
};

const DESIGN_BEFORE = [
  "Interviews run 20 to 25 minutes inside a 30-minute slot. Save the last few minutes for their questions.",
  "At least one person takes notes. If only one interviewer is a designer, they take notes for the design questions, since they know what to listen for.",
  "Before the interview, skim their application and resume.",
];

const DESIGN_TIMING = [
  "Introductions: 2 minutes",
  "General questions: 10 minutes",
  "Design questions: 10 minutes",
  "Their questions: 3 to 5 minutes",
];

const DESIGN_INTROS = [
  "Each interviewer shares: Name, Role in Nova, When you joined, Projects you've worked on.",
  "Then set expectations: \"We'll start with some general questions, then a few design questions. There are no trick questions, we just want to hear how you think. We'll save time at the end for your questions.\"",
];

const DESIGN_AFTER = [
  "Each interviewer scores the candidate from 1 to 5 in each category using the Design Rubric tab and records the scores in the application, right after the interview while it's fresh.",
  "Add any general thoughts to the application before the next interview starts.",
];

const DESIGN_RUBRIC = {
  title: "Design Rubric",
  intro:
    "Each interviewer gives the candidate a score from 1 to 5 in each of the three categories below. Scores of 5, 3 and 1 are described; use 4 and 2 for answers in between. The same rubric applies to every candidate; record each candidate's scores in the application. Score design ability against the track you used (newer or experienced designer).",
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
      drawsFrom: "the work they're proudest of and their process, and the dashboard or client question.",
      anchors: {
        5: "Explains design decisions with reasons tied to the people using it; describes a clear process (research, sketches, iteration, feedback); their work shows solid visual and UX fundamentals. Experienced designers handle scope tradeoffs thoughtfully.",
        3: "Decent work and a reasonable process, but explanations stay surface-level (\"it looked clean\"); process has gaps.",
        1: "Can't explain their decisions or process; the work shows little attention to the user.",
      },
    },
    {
      id: "collaboration",
      label: "Collaboration: communicating ideas and responding to constraints",
      drawsFrom: "the team question, the time-sensitive problem, the criticism question, and the client question.",
      anchors: {
        5: "Takes criticism openly and asks clarifying questions; communicates boundaries and tradeoffs clearly; credits teammates; explains their ideas so a non-designer could follow.",
        3: "Open to feedback but somewhat passive or vague; communicates okay with some prompting.",
        1: "Defensive about feedback, or changes everything without asking why; can't explain ideas clearly; ignores constraints.",
      },
    },
  ],
};

export const DESIGN_SCRIPT = {
  role: "design",
  rubric: DESIGN_RUBRIC,
  title: "Nova F26 Design Interview",
  subtitle: "Script, questions and what to listen for. Score each candidate with the Design Rubric tab.",
  sections: [
    { type: "info", key: "before", title: "Before the interview", bullets: DESIGN_BEFORE },
    { type: "info", key: "timing", title: "Timing", bullets: DESIGN_TIMING },
    { type: "info", key: "intros", title: "Nova introductions", bullets: DESIGN_INTROS },
    {
      type: "questions",
      key: "general",
      title: "General questions",
      items: [
        {
          id: "tell_us",
          prompt: "Tell us about yourself.",
          guidance: [
            { label: "Look for", text: "interests and personality, whether they lean work-oriented, and what first impression they want to give." },
            { label: "Follow-up", text: "\"What's something you've been excited about lately, in or out of school?\"" },
          ],
        },
        {
          id: "favorite_team",
          prompt: "What was your favorite time working in a team? What did you learn from it?",
          guidance: [
            { label: "Look for", text: "positive collaboration, learning about leadership, working with different personalities, giving and receiving feedback, accountability. Good answers say \"we\" and credit teammates." },
            { label: "Follow-up", text: "\"Was there a disagreement on that team? How did it get resolved?\"" },
            { label: "Red flags", text: "only talks about themselves, or blames teammates." },
          ],
        },
        {
          id: "time_sensitive",
          prompt: "What is a time you solved a time-sensitive problem?",
          guidance: [
            { label: "Look for", text: "quick thinking, staying calm under pressure, deciding what to do first, keeping others in the loop." },
            { label: "Follow-up", text: "\"Looking back, what would you do differently?\"" },
          ],
        },
        {
          id: "why_nova",
          prompt: "What draws you to the Nova community over other clubs and student orgs on campus?",
          guidance: [
            { label: "Look for", text: "real interest in Nova and in building for nonprofits. Strong answers mention something specific from the info session or meet and greet, a past Nova project, or a cause they care about." },
            { label: "Follow-up", text: "\"Is there a kind of nonprofit or cause you'd be most excited to build for?\"" },
            { label: "Red flags", text: "a generic answer that could apply to any club, or only wanting it for their resume." },
          ],
        },
        {
          id: "gm_commitments",
          prompt: "Nova's GMs are Tuesday 8 to 10pm. Does that work for you? What other commitments do you have, and how will you balance them with Nova?",
          guidance: [
            { label: "Follow-up", text: "how much time their other commitments take, and which other clubs they're in the process with. Make sure they know being honest won't hurt them: we won't hold it against them if they're applying elsewhere, we just want to gauge their availability." },
            { label: "Look for", text: "a realistic plan and an honest answer." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design",
      title: "Design questions",
      items: [
        {
          id: "why_design",
          prompt: "Why do you want to do UI/UX and product design?",
          guidance: [
            { label: "Look for", text: "they connect design to the people using it and the impact it can have, show curiosity about how people use products, and can point to a specific project or moment that got them into design." },
            { label: "Follow-up", text: "\"What's an app or website you think is designed really well, and why?\"" },
          ],
        },
        {
          id: "proud_work",
          prompt: "What design work are you most proud of (case study, graphic design, social media post)? Walk us through it.",
          guidance: [
            { label: "Why we ask", text: "to understand them as a designer and creator." },
            { label: "Look for", text: "who it was for and what problem it solved, the reasons behind specific choices (layout, color, type, flow), and any results or feedback." },
            { label: "Follow-up", text: "\"What was your process with this piece?\" Point out specific elements. Look for how they approach design problems, how they problem-solve and what they take into consideration." },
            { label: "Follow-ups", text: "\"If you had another week on it, what would you change?\" and \"Did you get feedback on it? How did it change the design?\"" },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design-new",
      title: "Newer designers",
      items: [
        {
          id: "volunteer_dashboard",
          track: "new",
          prompt: "Your lead has just assigned you to design a volunteer dashboard that displays the user's schedule and some weekly numbers. What process would you use to approach this design?",
          guidance: [
            { label: "Look for", text: "a clear design process. Moodboard and inspiration search, asking the lead for guidance, research, sketches, iterations, and getting approval at each stage. Strong answers start with who the volunteer is and what they need to see first." },
            { label: "Follow-ups", text: "\"How would you decide which weekly numbers matter most to a volunteer?\" and \"How would you know the design works once it's built?\"" },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design-experienced",
      title: "Experienced designers",
      items: [
        {
          id: "feature_requests",
          track: "experienced",
          prompt: "You're working with a nonprofit and have given them finalized wireframes to approve so the developers have enough time to build. They had already approved your mid-fis, but now they're asking for new features that would take a couple of weeks to prototype. What would be your response?",
          guidance: [
            { label: "Look for", text: "how they communicate with clients, set clear boundaries and limits, weigh risks and tradeoffs, and ask about the bigger picture. Strong answers offer options, such as moving the features to a later phase or swapping them for lower-priority ones, and loop in the devs about the timeline." },
            { label: "Follow-ups", text: "\"What if the nonprofit says the new features are must-haves?\" and \"How would you explain the change to the devs?\"" },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "design-all",
      title: "All designers",
      items: [
        {
          id: "handling_criticism",
          prompt: "During a crit session, another designer tells you they think your designs are too confusing and not user-friendly. How do you react?",
          guidance: [
            { label: "Look for", text: "empathy and openness rather than defensiveness. They ask follow-up questions to find out what exactly is confusing instead of just doing what they're told, and they back their decisions with reasoning or user research." },
            { label: "Follow-up", text: "\"Tell us about a real time you got tough feedback on your work. What did you do with it?\"" },
            { label: "Red flags", text: "dismisses the feedback, or changes everything without asking why." },
          ],
        },
        {
          id: "funsies",
          prompt: "Funsies: would you rather move to a primitive Mars or remain on apocalyptic Earth? Why?",
          guidance: [
            { label: "Note", text: "Not scored. A chance to see their personality and end the questions on a fun note." },
          ],
        },
      ],
    },
    {
      type: "questions",
      key: "wrap-up",
      title: "Wrap-up",
      items: [{ id: "their_questions", prompt: "What questions do you have for us?" }],
    },
    {
      type: "info",
      key: "wrap-up-notes",
      title: "Closing",
      bullets: ["Let them know when they'll hear back.", "Thank them for coming in."],
    },
    { type: "info", key: "after", title: "After the interview", bullets: DESIGN_AFTER },
  ],
};

/** The dev or design script for a sheet's Role(s) text ("Dev + PM", "Design"). */
export function scriptFor(roleRaw) {
  return String(roleRaw ?? "").toLowerCase().includes("design") ? DESIGN_SCRIPT : DEV_SCRIPT;
}

export const TRACKS = [
  { value: "new", label: "Newer candidate" },
  { value: "experienced", label: "Experienced candidate" },
];

export const VERDICTS = [
  { value: "STRONG_ACCEPT", label: "Strong accept" },
  { value: "SOFT_YES", label: "Soft yes" },
  { value: "NO", label: "No" },
];
