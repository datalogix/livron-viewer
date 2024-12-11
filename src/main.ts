import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/index.scss'

import { Pdfon } from '.'

(async () => {
  const pdfon = new Pdfon()

  pdfon.on('pluginlibraryinit', ({ source }) => {
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
            completed: false,
            id: 1,
            page: 1,
            title: 'fds fad fads fasdn fdsajk',
          },
          {
            x: 90,
            y: 10,
            type: 'audio',
            content: 'https://www.w3schools.com/html/horse.mp3',
            completed: false,
            id: 2,
            page: 1,
          },
          {
            id: 3,
            page: 2,
            x: 200,
            y: 20,
            type: 'link',
            content: 'https://www.w3schools.com/html/mov_bbb.mp4',
            completed: true,
          },
          {
            id: 4,
            page: 2,
            x: 200,
            y: 20,
            type: 'question',
            content: 'https://www.globo.com/',
            completed: true,
          },
          {
            id: 5,
            page: 2,
            x: 200,
            y: 20,
            type: 'iframe',
            content: 'https://tailwindcss.com/_next/static/media/death-blow.bcfcabb1.jpg',
            completed: true,
          },
          {
            id: 6,
            page: 2,
            x: 200,
            y: 20,
            type: 'text',
            content: 'df dasf jasdfhasdjhfajshfdasjk<br> fadsjkgfasfa gadsjg fasdfgadshkf gasf gadhs fgs g',
            completed: true,
          },
        ],
        resources: [
          {
            name: 'Teste1',
            src: 'a',
          },
          {
            name: 'Teste2',
            items: [
              {
                name: 'Teste2.1',
                src: 'b',
              },
              {
                name: 'Teste2.2',
                items: [
                  {
                    name: 'Teste2.3',
                    src: 'c',
                  },
                ],
              },
              {
                name: 'Teste2.3',
                items: [],
              },
            ],
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
        src: './file3.pdf',
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

  const viewer = await pdfon.render()
  // viewer.openDocument('./file.pdf')
})()
