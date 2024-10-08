import { Livron } from '.'

(async () => {
  const livron = new Livron()
  const viewer = await livron.render()
  // viewer.loadDocument('./_file.pdf')
})()
