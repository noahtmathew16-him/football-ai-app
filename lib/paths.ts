import path from 'path'

/** Project root (cwd in Node; Vercel function cwd is /var/task). */
export function getProjectRoot(): string {
  return process.cwd()
}

export function conversationsDir(): string {
  return path.join(getProjectRoot(), 'data', 'conversations')
}

export function uploadsDir(): string {
  return path.join(getProjectRoot(), 'data', 'uploads')
}
