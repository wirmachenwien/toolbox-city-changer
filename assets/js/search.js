import elasticlunr from 'elasticlunr'
import { locales, pageLanguage } from '@electricbookworks/electric-book-modules/assets/js/locales'
import { getQueryVariable } from '@electricbookworks/electric-book-modules/assets/js/search-terms'

const storeFileName = process.env.config.collections?.docs?.output === true ? 'search-index-with-docs-' + process.env.output : 'search-index-' + process.env.output
const allLanguagesStore = require(`../../_indexes/${storeFileName}`)
const language = locales[pageLanguage] ? pageLanguage : process.env.config.language
const locale = locales[language].search

// Index only the current language. Keep IDs aligned with array positions.
const store = allLanguagesStore.filter(doc => {
  const parts = doc.path.split('/')
  const code = parts[0] === 'book' ? parts[1] : parts[0]
  return (locales[code] ? code : process.env.config.language) === language
}).map((doc, id) => ({ ...doc, id }))

const query = getQueryVariable('query')
const searchForm = document.querySelector('.content form.search')
if (searchForm && query) {
  searchForm.querySelector('.search-box').value = query
  const index = elasticlunr(function () {
    this.addField('title')
    this.addField('content')
    this.setRef('id')
  })
  store.forEach(doc => index.addDoc(doc))
  const results = index.search(query, { bool: 'AND' })
  const container = document.createElement('div')
  container.className = 'search-results'
  container.id = 'search-results'

  const heading = document.createElement('h2')
  heading.textContent = locale['search-results']
  container.appendChild(heading)
  const summary = document.createElement('p')
  const suffix = results.length === 1 ? 'results-for-singular' : 'results-for-plural'
  summary.textContent = (results.length ? results.length + ' ' + locale[suffix] : locale['results-for-none']) + ' “' + query + '”.'
  container.appendChild(summary)

  const list = document.createElement('ul')
  results.forEach(result => {
    const doc = store[result.ref]
    const item = document.createElement('li')
    item.className = 'search-result search-result-available'
    const title = document.createElement('h3')
    const link = document.createElement('a')
    const parameters = new URLSearchParams({ query, search_stem: elasticlunr.stemmer(query) })
    link.href = (process.env.config.baseurl || '') + '/' + doc.path + '?' + parameters
    link.textContent = doc.title
    title.appendChild(link)
    item.appendChild(title)
    const description = document.createElement('p')
    description.textContent = doc.description
    item.appendChild(description)
    list.appendChild(item)
  })
  container.appendChild(list)
  searchForm.insertAdjacentElement('afterend', container)
}
