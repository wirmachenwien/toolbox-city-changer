// Run after the production webpack and Jekyll builds.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { JSDOM } = require('jsdom')

for (const [language, term] of [['de', 'Superblocks'], ['en', 'superblocks'], ['sl', 'superbloki']]) {
  const directory = language === 'de' ? '' : language + '/'
  const dom = new JSDOM(fs.readFileSync('_site/' + directory + 'search.html', 'utf8'), {
    url: 'https://example.test/toolbox-city-changer/' + directory + 'search.html?query=' + term,
    runScripts: 'outside-only'
  })
  dom.window.eval(fs.readFileSync('assets/js/dist/search.dist.js', 'utf8'))
  const links = [...dom.window.document.querySelectorAll('.search-result a')]
  assert(links.length > 0, 'Expected results for ' + language)
  for (const link of links) {
    const path = new URL(link.href).pathname
    assert(path.startsWith('/toolbox-city-changer/'), link.href)
    assert(language === 'de' ? !/\/(en|sl)\//.test(path) : path.includes('/' + language + '/'), link.href)
    const localPath = '_site/' + path.replace('/toolbox-city-changer/', '')
    assert(fs.existsSync(localPath), localPath)
    assert(link.closest('li').classList.contains('search-result-available'))
  }
  console.log(language + ': ' + links.length + ' visible results with correct language and links')
  dom.window.close()
}
