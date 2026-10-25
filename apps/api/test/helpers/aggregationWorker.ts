const now = Number(process.argv[2])

const { runAggregation } = await import('../../src/aggregate/run.js')
process.stdout.write('READY\n')
const stats = await runAggregation(now)
process.stdout.write(`DONE ${JSON.stringify(stats)}\n`)
process.exit(0)
