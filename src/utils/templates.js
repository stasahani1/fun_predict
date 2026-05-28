const TEMPLATE_VERBS = [
  "leave early",
  "spill a drink",
  "hit on someone",
  "fall asleep",
  "lose their phone",
  "dance first",
  "start a debate",
  "take a shot",
  "tell a wild story",
  "get too loud",
  "make a toast",
  "sing karaoke",
  "break something",
  "get emotional",
];

const TEMPLATE_TIMES = [
  "before midnight",
  "before dinner",
  "by 2am",
  "before the event ends",
  "within the first hour",
  "before anyone else",
];

const MULTI_PERSON_TEMPLATES = [
  { verb: "get into an argument", criteria: "Witnessed verbal disagreement" },
  { verb: "take a photo together", criteria: "Photo evidence exists" },
  { verb: "do a shot together", criteria: "At least 2 witnesses confirm" },
  { verb: "switch seats", criteria: "Observed by others" },
  { verb: "have a dance-off", criteria: "Witnessed by the group" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateTemplates(taggedNames) {
  if (!taggedNames || taggedNames.length === 0) return [];

  const results = [];

  // Single-person templates
  for (const name of taggedNames) {
    const verbs = shuffle(TEMPLATE_VERBS);
    const times = shuffle(TEMPLATE_TIMES);
    for (let i = 0; i < Math.min(2, verbs.length); i++) {
      results.push({
        text: `${name} will ${verbs[i]} ${times[i % times.length]}`,
        resolutionCriteria: "Verified by at least 2 witnesses",
      });
    }
  }

  // Multi-person templates when 2+ tagged
  if (taggedNames.length >= 2) {
    const pairs = [];
    for (let i = 0; i < taggedNames.length; i++) {
      for (let j = i + 1; j < taggedNames.length; j++) {
        pairs.push([taggedNames[i], taggedNames[j]]);
      }
    }
    const templates = shuffle(MULTI_PERSON_TEMPLATES);
    for (let i = 0; i < Math.min(pairs.length, templates.length); i++) {
      results.push({
        text: `${pairs[i][0]} and ${pairs[i][1]} will ${templates[i].verb}`,
        resolutionCriteria: templates[i].criteria,
      });
    }
  }

  return shuffle(results).slice(0, 6);
}
