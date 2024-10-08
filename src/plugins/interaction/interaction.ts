export type Interaction = {
  id: number
  title?: string
  page: number
  type: 'audio' | 'video' | 'question'
  x: number
  y: number
  content: string
  status: 'pending' | 'in-progress' | 'completed'
}
