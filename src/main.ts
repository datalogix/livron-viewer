import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/index.scss'

import { Livron } from '.'

(async () => {
  const livron = new Livron()

  livron.on('pluginlibraryinit', ({ source }) => {
    source.books = [
      {
        id: '1',
        name: 'Livro 1',
        src: './file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/death-blow.bcfcabb1.jpg',
        pages: 10,
        sku: 'dsfsd',
        author: 'asdas',
        description: 'dsa \r\n fdf<br>fds',
        interactions: [
          {
            x: 100,
            y: 10,
            type: 'video',
            content: 'https://www.w3schools.com/html/horse.mp3',
            status: 'pending',
            id: 2,
            page: 1,
            title: 'fds fad fads fasdn fdsajk',
          },
          {
            x: 90,
            y: 10,
            type: 'audio',
            content: 'https://www.w3schools.com/html/horse.mp3',
            status: 'pending',
            id: 2,
            page: 1,
          },
          {
            id: 1,
            page: 2,
            x: 200,
            y: 20,
            type: 'link',
            content: 'https://www.w3schools.com/html/mov_bbb.mp4',
            status: 'completed',
          },
          {
            id: 1,
            page: 2,
            x: 200,
            y: 20,
            type: 'question',
            content: 'https://www.globo.com/',
            status: 'completed',
          },
          {
            id: 1,
            page: 2,
            x: 200,
            y: 20,
            type: 'iframe',
            content: 'https://tailwindcss.com/_next/static/media/death-blow.bcfcabb1.jpg',
            status: 'completed',
          },
          {
            id: 1,
            page: 2,
            x: 200,
            y: 20,
            type: 'text',
            content: 'df dasf jasdfhasdjhfajshfdasjk<br> fadsjkgfasfa gadsjg fasdfgadshkf gasf gadhs fgs g',
            status: 'completed',
          },
        ],
      },
      {
        id: '2',
        name: 'Livro 2',
        src: './_file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/rochelle-rochelle.b97e372a.jpg',
        pages: 10,
        sku: 'dsfsd',
        author: 'asdas',
        description: 'dsa',
      },
      {
        id: '2',
        name: 'Livro 2',
        src: './_file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/rochelle-rochelle.b97e372a.jpg',
        pages: 10,
        sku: 'dsfsd',
        author: 'asdas',
        description: 'dsa',
      },
      {
        id: '2',
        name: 'Livro 2',
        src: './_file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/rochelle-rochelle.b97e372a.jpg',
        pages: 10,
        sku: 'dsfsd',
        author: 'asdas',
        description: 'dsa',
      },
      {
        id: '2',
        name: 'Livro 2',
        src: './_file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/rochelle-rochelle.b97e372a.jpg',
        pages: 10,
        sku: 'dsfsd',
        author: 'asdas',
        description: 'dsa',
      },
      {
        id: '2',
        name: 'Livro 2',
        src: './_file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/rochelle-rochelle.b97e372a.jpg',
        pages: 10,
        sku: 'dsfsd',
        author: 'asdas',
        description: 'dsa',
      },
    ]
  })

  const viewer = await livron.render()
  // viewer.openDocument('./file.pdf')
})()
