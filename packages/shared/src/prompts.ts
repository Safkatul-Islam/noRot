import type { PersonaId, ProcrastinationScore, Todo } from './types'
import { PERSONA_CONFIGS } from './constants'

export function buildInterventionPrompt(
  score: ProcrastinationScore,
  persona: PersonaId,
  todos: Todo[] = [],
  recentApps: string[] = []
): string {
  const config = PERSONA_CONFIGS[persona]
  const todoList = todos
    .filter(t => !t.completed)
    .map(t => `- ${t.text}`)
    .join('\n')

  return `You are "${config.name}", a procrastination intervention persona.

PERSONALITY: ${config.style}

EXAMPLE OF YOUR VOICE: "${config.exampleLine}"

CURRENT SITUATION:
- Procrastination score: ${score.score}/100 (${score.severity})
- Distraction ratio: ${score.distractionRatio}%
- Top distraction app: ${score.topDistraction || 'various'}
- Recent apps used: ${recentApps.slice(0, 5).join(', ') || 'unknown'}
- Time monitored: ${score.minutesMonitored} minutes
- App switch rate: ${score.switchRate} (high = unfocused)

${todoList ? `THEIR TODO LIST:\n${todoList}` : 'They have no todos set.'}

TASK: Write a short intervention script (2-4 sentences max) in character.
- Reference their specific distraction apps by name
- If they have todos, remind them
- Match the severity: ${score.severity === 'warning' ? 'gentle nudge' : score.severity === 'danger' ? 'firm reminder' : 'urgent intervention'}
- Keep it punchy and memorable
- Stay fully in character

Respond with ONLY the script text, nothing else.`
}
