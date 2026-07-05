import type { Score } from '@/types'

export function generateScores(maxGoals: number): Score[] {
  const scores: Score[] = []
  for (let home = 0; home <= maxGoals; home++) {
    for (let away = 0; away <= maxGoals; away++) {
      scores.push({ home, away })
    }
  }
  return scores
}

export function scoreLabel(home: number, away: number): string {
  return `${home} - ${away}`
}

export function scoresMatch(a: Score, b: Score): boolean {
  return a.home === b.home && a.away === b.away
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Assign scores randomly to a list of player IDs (for sorteo mode)
export function assignScores(
  playerIds: string[],
  maxGoals: number,
): Map<string, Score> {
  const allScores = shuffle(generateScores(maxGoals))
  const result = new Map<string, Score>()
  playerIds.forEach((id, i) => {
    if (i < allScores.length) result.set(id, allScores[i])
  })
  return result
}

export function maxParticipants(maxGoals: number): number {
  return (maxGoals + 1) * (maxGoals + 1)
}
