const enabled = process.stdout.isTTY === true && !process.env.NO_COLOR
const ESC = String.fromCharCode(27)

function paint(code: string, text: string): string {
  return enabled ? `${ESC}[${code}m${text}${ESC}[0m` : text
}

export const style = {
  bold: (text: string) => paint('1', text),
  dim: (text: string) => paint('2', text),
  accent: (text: string) => paint('38;2;255;77;26', text),
  green: (text: string) => paint('32', text),
  red: (text: string) => paint('31', text),
}

function write(stream: NodeJS.WriteStream, message: string): void {
  stream.write(`${message}\n`)
}

export const ui = {
  line(message = ''): void {
    write(process.stdout, message)
  },
  info(message: string): void {
    write(process.stdout, message)
  },
  success(message: string): void {
    write(process.stdout, `${style.green('+')} ${message}`)
  },
  warn(message: string): void {
    write(process.stderr, `${style.dim('!')} ${message}`)
  },
  error(message: string): void {
    write(process.stderr, `${style.red('x')} ${message}`)
  },
}
