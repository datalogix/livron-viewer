export function removeNullCharacters(str: string, replaceInvisible?: boolean) {
  const invisibleCharsRegExp = /[\x00-\x1F]/g

  if (!invisibleCharsRegExp.test(str)) {
    return str
  }

  if (replaceInvisible) {
    return str.replaceAll(invisibleCharsRegExp, m => m === '\x00' ? '' : ' ')
  }

  return str.replaceAll('\x00', '')
}
