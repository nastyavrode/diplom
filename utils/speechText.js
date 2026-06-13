/** Убирает markdown-разметку перед озвучкой. */
export function stripMarkdownForSpeech(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, (block) => {
      const inner = block.replace(/```/g, '').trim();
      return inner ? `${inner} ` : ' ';
    })
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinSpeechParts(parts) {
  return parts
    .map((p) => stripMarkdownForSpeech(p))
    .filter((p) => p.length > 0)
    .join('. ');
}

export function buildTheoryLessonSpeechText(lesson) {
  if (!lesson) return '';
  return joinSpeechParts([lesson.title, lesson.description, lesson.theoryContent]);
}

export function buildTaskLessonSpeechText(lesson) {
  if (!lesson) return '';
  return joinSpeechParts([lesson.title, lesson.description]);
}

export function buildChallengeSpeechText(challenge) {
  if (!challenge) return '';
  return joinSpeechParts([challenge.title, challenge.description, challenge.howToSolve]);
}
