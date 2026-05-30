type LogFields = Record<string, unknown>

function emit(
  stream: NodeJS.WriteStream,
  level: string,
  msg: string,
  fields?: LogFields,
) {
  stream.write(
    JSON.stringify({ level, ts: new Date().toISOString(), msg, ...fields }) +
      '\n',
  )
}

export const log = {
  info: (msg: string, fields?: LogFields) =>
    emit(process.stdout, 'info', msg, fields),
  warn: (msg: string, fields?: LogFields) =>
    emit(process.stdout, 'warn', msg, fields),
  error: (msg: string, fields?: LogFields) =>
    emit(process.stderr, 'error', msg, fields),
}
