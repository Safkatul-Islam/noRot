const fs = require('node:fs')

const { calculateScore, generateReasons, LATE_NIGHT_MULTIPLIER, SCORING_WEIGHTS } = require('@norot/shared')

const input = JSON.parse(fs.readFileSync(0, 'utf8'))
const snapshot = input.snapshot
const snoozePressure = Number(input.snoozePressure ?? 0)

const result = calculateScore(snapshot, snoozePressure)
const reasons = generateReasons(snapshot, result.procrastinationScore)

process.stdout.write(
  JSON.stringify({
    ...result,
    reasons,
    constants: {
      SCORING_WEIGHTS,
      LATE_NIGHT_MULTIPLIER
    }
  })
)

