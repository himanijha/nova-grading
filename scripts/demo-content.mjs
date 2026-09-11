// Fake-but-plausible application content for the demo seeder.
//
// Each profile is tagged with a `strength` (1-5). The seeder clusters generated
// grades around it, so the Rankings page shows a believable spread instead of
// noise — weak applications land near the bottom, strong ones near the top.

export const PROFILES = [
  {
    strength: 5,
    role: "DEVELOPER",
    lookingForward:
      "I've built a lot of things alone and I'm starting to hit the ceiling of what that teaches you. I want to work on something where I have to justify a design decision to someone who disagrees with me, and where the code outlives the quarter. Honestly I also just want to be around people who care about this stuff on a Friday night.",
    initiative:
      "The bus tracker my hometown transit agency published was accurate maybe half the time, and everyone at my high school just accepted it. I scraped their GTFS feed for a month, found that the delays were systematic on two routes, and wrote it up for the agency. They didn't use my code, but they did fix the timing on both routes the next semester.",
    community:
      "I help run a Saturday coding club at the public library in my neighborhood. Most of the kids are there because the library has better wifi than home, which reframed what I thought the club was for. I stopped planning curriculum and started just making sure the room was open and someone was there who could answer a question.",
    links: "https://github.com/example-dev",
    anythingElse:
      "I'm taking 20 units this quarter but Nova is the thing I'd protect if something has to give.",
  },
  {
    strength: 5,
    role: "DESIGNER",
    lookingForward:
      "I want to see a design survive contact with a real codebase. Everything in my portfolio is a Figma file that never had to answer for itself — no loading states, no error cases, no engineer asking me what happens when the name is 40 characters long. I'd like to be worse at pretty mockups and better at shipped ones.",
    initiative:
      "The food pantry I volunteer at was tracking intake on paper, which meant nobody knew what was actually running out until it was gone. I sat through three shifts just watching, then redesigned the intake form around what volunteers were already writing in the margins. Check-in time roughly halved, but the bigger thing was that we could finally see the shortages a week out.",
    community:
      "I'm part of a small zine collective that prints about four issues a year. I do layout, but my actual job is making sure every issue has at least two first-time contributors in it, which means a lot of unglamorous coaxing over text.",
    links: "https://example-portfolio.com",
    anythingElse: "Happy to do front-end work too — I like being close to the implementation.",
  },
  {
    strength: 4,
    role: "DEVELOPER",
    lookingForward:
      "I'm a transfer student and most of my CS background is self-taught, so I want to be somewhere that treats not-knowing-yet as normal. I'm looking forward to reading other people's code more than writing my own, at least at first.",
    initiative:
      "My research lab was scheduling participants across three different calendars and double-booking rooms constantly. I consolidated it into one system over winter break and wrote a one-page guide for the other RAs so it wouldn't just become my job forever.",
    community:
      "The transfer student community here. I run a weekly study hour, though mostly what I do is answer the obvious questions nobody wants to ask in a group chat where the answer feels like it should already be known.",
    links: "https://github.com/example-transfer",
    anythingElse: "",
  },
  {
    strength: 4,
    role: "BOTH",
    lookingForward:
      "I've been on both sides of the handoff and I'm most interested in the seam between them — the part where a design gets 80% built and then quietly changes. I'd like to work somewhere small enough that I can follow one thing all the way through.",
    initiative:
      "Our club's officer transition was entirely oral tradition, so every year we relearned the same lessons. I wrote up an actual handbook, but the part that made it stick was scheduling a two-hour overlap meeting between outgoing and incoming officers. That meeting is now the only reason the handbook gets updated.",
    community:
      "I've been in the same climbing gym community since I was fifteen. I'm not the strongest climber there by a wide margin, so my role has mostly been belaying beginners and talking people down from routes they're scared of.",
    links: "https://github.com/example-both",
    anythingElse: "",
  },
  {
    strength: 3,
    role: "DEVELOPER",
    lookingForward:
      "I want to get better at working on a team and build things that people outside of a class will actually use. Nova's projects seem like a good way to do that and the tech-for-good angle is important to me.",
    initiative:
      "In my software engineering class our group's git workflow was a mess and people kept overwriting each other. I set up branch protection and a basic PR review process, and after that we stopped losing work.",
    community:
      "I'm involved in my cultural org on campus. I've helped run events and I've been on the planning committee for our big spring showcase two years in a row.",
    links: "https://github.com/example-mid",
    anythingElse: "",
  },
  {
    strength: 3,
    role: "DESIGNER",
    lookingForward:
      "I'm excited to learn from designers who are further along than me and to get real feedback on my work. I've mostly designed for myself and I want to design for actual users with actual constraints.",
    initiative:
      "I noticed the flyers for our dorm events were unreadable from more than a few feet away, so I made a simple template with bigger type and a clear hierarchy. People started using it and attendance went up a bit, though I can't prove those are related.",
    community:
      "The dance team I've been on since freshman year. I mostly help with choreography for the newer members and I run our Instagram.",
    links: "",
    anythingElse: "",
  },
  {
    strength: 2,
    role: "DEVELOPER",
    lookingForward:
      "I'm looking forward to gaining experience and building my portfolio. I think Nova would be a great opportunity to grow as a developer and meet like-minded people who are passionate about technology.",
    initiative:
      "I took initiative in my group project by making sure everyone knew their tasks and that we finished on time. I created a shared document and checked in with people regularly.",
    community:
      "My family is a really meaningful community to me. I've always tried to be someone my siblings can come to for help with school.",
    links: "",
    anythingElse: "",
  },
  {
    strength: 2,
    role: "DESIGNER",
    lookingForward:
      "I want to improve my design skills and work on real projects. I'm passionate about using design to make a positive impact and I think Nova aligns with my values.",
    initiative:
      "When my club needed a new logo I volunteered to make one. I went through a few rounds of feedback with the officers before we landed on the final version.",
    community:
      "I'm part of my hall community in the dorms. I try to be friendly and welcoming to everyone and I've helped organize a few study sessions.",
    links: "https://example-basic-portfolio.com",
    anythingElse: "",
  },
];
