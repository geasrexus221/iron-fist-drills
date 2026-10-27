import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function favoritesApiPlugin(): Plugin {
  const favoritesPath = path.resolve(__dirname, '../data/favorites.json')

  const defaultData = {
    Alisa: [],
    Asuka: [],
    Azucena: [],
    Bryan: [],
    Claudio: [],
    'Devil Jin': [],
    Eddy: [],
    Feng: [],
    Hwoarang: [],
    'Jack-8': [],
    Jin: [],
    Jun: [],
    Kazuya: [],
    King: [],
    Kuma: [],
    Lars: [],
    Lee: [],
    Leo: [],
    Leroy: [],
    Lidia: [],
    Lili: [],
    Law: [],
    Nina: [],
    Panda: [],
    Paul: [],
    Raven: [],
    Reina: [],
    Shaheen: [],
    Steve: [],
    Victor: [],
    Xiaoyu: [],
    Yoshimitsu: [],
    Zafina: [],
    Heihachi: [],
    'Armor King': [],
    Dragunov: [],
    Clive: [],
    Fahkumram: [],
    Kunimitsu: [],
  }

  return {
    name: 'favorites-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/favorites') {
          if (req.method === 'GET') {
            try {
              if (!fs.existsSync(favoritesPath)) {
                fs.writeFileSync(favoritesPath, JSON.stringify(defaultData, null, 2), 'utf-8')
              }
              const data = fs.readFileSync(favoritesPath, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(data)
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(err) }))
            }
            return
          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                fs.writeFileSync(favoritesPath, JSON.stringify(parsed, null, 2), 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: String(err) }))
              }
            })
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), favoritesApiPlugin()],
  build: {
    chunkSizeWarningLimit: 6000,
  },
})
