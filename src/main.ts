import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/viewer.css'

import { Livron } from './livron'

let id = '234c9109-46d1-4319-8291-202cacda7b1c'
id = '846b5c32-11e3-4986-9b47-5d7f53ebf88b'

const livron = new Livron(id, 'eXRqbXzly139UsIYiWfmn1PuKz4yzEOe8gG8R3iWQ8LwtmDiVJ')
livron.setUser({
  external_id: '1234567',
  name: 'Luis',
  email: 'luixxxx@datalogix.com.br'
})
livron.render()