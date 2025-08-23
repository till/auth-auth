import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { Layout } from './../../components.js'
import { readFile } from 'fs/promises'

export default new Hono()
  .get('/', async(c) => {
    const content = await readFile('./src/app/demo/templates/home.html', 'utf-8')

    return c.html(Layout({
      title: 'Demo time!',
      children: html`${raw(content)}`,
    }))
  })
