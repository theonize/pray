import './style.css'
import Fuse from 'fuse.js'
import { registerSW } from 'virtual:pwa-register'
import prayers from './data/prayers.json'

/* ------------------------------------------------------------------ *
 * Data prep
 * ------------------------------------------------------------------ */
const PRAYERS = prayers.slice().sort((a, b) => a.title.localeCompare(b.title))

const traditionsOrder = [
  'Roman Catholic',
  'Eastern Orthodox',
  'Anglican',
  'Lutheran',
  'Reformed',
  'Presbyterian',
  'Methodist',
  'Protestant',
  'Common',
]
const tradCount = new Map()
for (const p of PRAYERS) tradCount.set(p.tradition, (tradCount.get(p.tradition) || 0) + 1)
const TRADITIONS = [...tradCount.keys()].sort(
  (a, b) => {
    const ia = traditionsOrder.indexOf(a)
    const ib = traditionsOrder.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  }
)

const fuse = new Fuse(PRAYERS, {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'altTitles', weight: 0.2 },
    { name: 'tags', weight: 0.18 },
    { name: 'text', weight: 0.12 },
    { name: 'tradition', weight: 0.05 },
    { name: 'category', weight: 0.03 },
    { name: 'source', weight: 0.02 },
  ],
  includeMatches: true,
  includeScore: true,
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

/* ------------------------------------------------------------------ *
 * Tiny DOM helpers
 * ------------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel)
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue
    if (k === 'class') node.className = v
    else if (k === 'html') node.innerHTML = v
    else if (k.startsWith('on') && typeof v === 'function')
      node.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'dataset') Object.assign(node.dataset, v)
    else node.setAttribute(k, v)
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue
    node.append(c.nodeType ? c : document.createTextNode(String(c)))
  }
  return node
}
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */
const state = {
  query: '',
  tradition: 'all',
}

/* ------------------------------------------------------------------ *
 * SVG icons
 * ------------------------------------------------------------------ */
const ICON = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  shuffle:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  share:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>',
  cross:
    '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#2b2426"/><g fill="#e3c080"><rect x="28.4" y="13" width="7.2" height="38" rx="3"/><rect x="18" y="24" width="28" height="7.2" rx="3"/></g></svg>',
}

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */
function currentTheme() {
  return (
    document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem('pray:theme', theme)
  } catch {}
  const btn = $('#theme-toggle')
  if (btn) {
    btn.innerHTML = theme === 'dark' ? ICON.sun : ICON.moon
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
  }
}
;(function initTheme() {
  let saved = null
  try {
    saved = localStorage.getItem('pray:theme')
  } catch {}
  if (saved) document.documentElement.setAttribute('data-theme', saved)
})()

/* ------------------------------------------------------------------ *
 * Build the shell
 * ------------------------------------------------------------------ */
const app = $('#app')

const searchInput = el('input', {
  class: 'search__input',
  type: 'search',
  id: 'search',
  placeholder: 'Search prayers, words, or traditions…',
  autocomplete: 'off',
  autocapitalize: 'none',
  spellcheck: 'false',
  'aria-label': 'Search prayers',
})
const clearBtn = el('button', {
  class: 'search__clear',
  type: 'button',
  'aria-label': 'Clear search',
  html: ICON.x,
  onClick: () => {
    searchInput.value = ''
    setQuery('')
    searchInput.focus()
  },
})
const themeBtn = el('button', {
  class: 'icon-btn',
  id: 'theme-toggle',
  type: 'button',
  html: currentTheme() === 'dark' ? ICON.sun : ICON.moon,
  'aria-label': currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  onClick: () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
})

const filtersEl = el('div', { class: 'filters', role: 'group', 'aria-label': 'Filter by tradition' })
const countEl = el('p', { class: 'toolbar__count' })
const resultsEl = el('ul', { class: 'results', id: 'results' })

const header = el(
  'header',
  { class: 'site-header' },
  el(
    'div',
    { class: 'site-header__inner' },
    el(
      'div',
      { class: 'brand' },
      el(
        'div',
        { class: 'brand__id' },
        el('span', { class: 'brand__mark', html: ICON.cross }),
        el(
          'div',
          {},
          el('h1', { class: 'brand__title' }, 'Pray'),
          el('p', { class: 'brand__tag' }, 'Curated Christian prayers')
        )
      ),
      themeBtn
    ),
    el(
      'div',
      { class: 'search', role: 'search' },
      el('span', { class: 'search__icon', html: ICON.search }),
      searchInput,
      clearBtn
    ),
    filtersEl
  )
)

const randomBtn = el(
  'button',
  { class: 'text-btn', type: 'button', onClick: openRandom },
  el('span', { class: 'tb-ico', html: ICON.shuffle }),
  'Random prayer'
)

const main = el(
  'main',
  { class: 'app-wrap' },
  el('div', { class: 'toolbar' }, countEl, randomBtn),
  resultsEl,
  el(
    'footer',
    { class: 'footer' },
    el('p', {}, `${PRAYERS.length} prayers across ${TRADITIONS.length} traditions · works offline`),
    el(
      'p',
      {},
      'Traditional, public-domain texts. ',
      el('a', { href: 'https://github.com/theonize/pray', rel: 'noopener' }, 'Source on GitHub')
    )
  )
)

app.replaceChildren(header, main)
app.removeAttribute('aria-busy')

/* ------------------------------------------------------------------ *
 * Filters (tradition chips)
 * ------------------------------------------------------------------ */
function renderFilters() {
  const chips = [
    el(
      'button',
      {
        class: 'chip',
        type: 'button',
        'aria-pressed': String(state.tradition === 'all'),
        onClick: () => setTradition('all'),
      },
      'All',
      el('span', { class: 'chip__count' }, String(PRAYERS.length))
    ),
  ]
  for (const t of TRADITIONS) {
    chips.push(
      el(
        'button',
        {
          class: 'chip',
          type: 'button',
          'aria-pressed': String(state.tradition === t),
          onClick: () => setTradition(t),
        },
        t,
        el('span', { class: 'chip__count' }, String(tradCount.get(t)))
      )
    )
  }
  filtersEl.replaceChildren(...chips)
}

/* ------------------------------------------------------------------ *
 * Search + render
 * ------------------------------------------------------------------ */
function computeResults() {
  let list
  if (state.query.trim().length >= 2) {
    list = fuse.search(state.query.trim()).map((r) => ({ item: r.item, matches: r.matches }))
  } else {
    list = PRAYERS.map((item) => ({ item, matches: null }))
  }
  if (state.tradition !== 'all') {
    list = list.filter((r) => r.item.tradition === state.tradition)
  }
  return list
}

function snippetFor(item, matches) {
  // Prefer a matched window of the text; otherwise the opening line.
  const textMatch = matches && matches.find((m) => m.key === 'text')
  const raw = item.text.replace(/\s+/g, ' ').trim()
  if (textMatch && textMatch.indices.length) {
    const [start] = textMatch.indices[0]
    const from = Math.max(0, start - 30)
    let s = raw.slice(from, from + 140)
    if (from > 0) s = '…' + s
    return s
  }
  return raw.slice(0, 140)
}

function highlight(text, query) {
  if (!query || query.trim().length < 2) return escapeHtml(text)
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!terms.length) return escapeHtml(text)
  return escapeHtml(text).replace(
    new RegExp(`(${terms.join('|')})`, 'gi'),
    '<mark>$1</mark>'
  )
}

let renderToken = 0
function render() {
  const results = computeResults()
  const total = results.length

  countEl.innerHTML =
    total === 0
      ? 'No prayers found'
      : `<b>${total}</b> ${total === 1 ? 'prayer' : 'prayers'}${
          state.query.trim() ? ` matching “${escapeHtml(state.query.trim())}”` : ''
        }`

  if (total === 0) {
    resultsEl.replaceChildren(
      el(
        'li',
        {},
        el(
          'div',
          { class: 'empty' },
          el('div', { class: 'empty__mark', html: ICON.cross }),
          el('p', {}, 'Nothing matched your search.'),
          el(
            'button',
            { class: 'text-btn', type: 'button', onClick: () => { searchInput.value = ''; setQuery(''); setTradition('all') } },
            'Clear filters'
          )
        )
      )
    )
    return
  }

  const token = ++renderToken
  const cap = 60
  const frag = document.createDocumentFragment()
  for (const { item, matches } of results.slice(0, cap)) {
    frag.append(buildCard(item, matches))
  }
  resultsEl.replaceChildren(frag)

  if (results.length > cap) {
    const moreBtn = el(
      'button',
      {
        class: 'text-btn',
        type: 'button',
        onClick: (e) => {
          if (token !== renderToken) return
          const more = document.createDocumentFragment()
          for (const { item, matches } of results.slice(cap)) more.append(buildCard(item, matches))
          e.target.closest('li').replaceWith(more)
        },
      },
      `Show ${results.length - cap} more`
    )
    resultsEl.append(el('li', {}, moreBtn))
  }
}

function buildCard(item, matches) {
  const li = el('li', {})
  const card = el(
    'button',
    {
      class: 'card',
      type: 'button',
      'aria-label': `Read ${item.title}`,
      onClick: () => openPrayer(item.id),
    },
    el(
      'div',
      { class: 'card__top' },
      el('h2', { class: 'card__title', html: highlight(item.title, state.query) }),
      el('span', { class: 'badge' }, item.tradition)
    ),
    el(
      'p',
      { class: 'card__meta' },
      [item.category, item.occasion].filter(Boolean).join(' · ')
    ),
    el('p', { class: 'card__snippet', html: highlight(snippetFor(item, matches), state.query) })
  )
  li.append(card)
  return li
}

/* ------------------------------------------------------------------ *
 * State setters
 * ------------------------------------------------------------------ */
let debounce
function setQuery(q) {
  state.query = q
  clearBtn.classList.toggle('is-visible', q.length > 0)
  clearTimeout(debounce)
  debounce = setTimeout(render, 90)
}
function setTradition(t) {
  state.tradition = t
  renderFilters()
  render()
}

searchInput.addEventListener('input', (e) => setQuery(e.target.value))

/* ------------------------------------------------------------------ *
 * Reader dialog (deep-linkable via #<id>)
 * ------------------------------------------------------------------ */
const dialog = el('dialog', { class: 'reader', 'aria-label': 'Prayer' })
document.body.append(dialog)
dialog.addEventListener('click', (e) => {
  // close when clicking the backdrop (outside the inner panel)
  const r = dialog.getBoundingClientRect()
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  ) {
    closeReader()
  }
})
dialog.addEventListener('close', () => {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search)
})

function byId(id) {
  return PRAYERS.find((p) => p.id === id)
}

function openPrayer(id, { push = true } = {}) {
  const p = byId(id)
  if (!p) return
  if (push && location.hash !== '#' + id) history.pushState({ id }, '', '#' + id)

  const copyBtn = el('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': 'Copy prayer text',
    html: ICON.copy,
    onClick: async () => {
      const text = `${p.title}\n\n${p.text}\n\n— ${p.tradition}${p.source ? ' · ' + p.source : ''}`
      try {
        await navigator.clipboard.writeText(text)
        toast('Prayer copied to clipboard')
      } catch {
        toast('Could not copy')
      }
    },
  })
  const shareBtn = el('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': 'Share prayer',
    html: ICON.share,
    onClick: async () => {
      const url = location.origin + location.pathname + '#' + p.id
      const shareData = { title: p.title, text: p.text, url }
      if (navigator.share) {
        try {
          await navigator.share(shareData)
        } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(url)
          toast('Link copied to clipboard')
        } catch {}
      }
    },
  })
  const closeBtn = el('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': 'Close',
    html: ICON.x,
    onClick: closeReader,
  })

  const meta = el('dl', { class: 'reader__meta' })
  const addMeta = (label, value) => {
    if (!value) return
    meta.append(el('div', {}, el('dt', {}, label), el('dd', {}, value)))
  }
  addMeta('Tradition', p.tradition)
  addMeta('Category', p.category)
  addMeta('When it is prayed', p.occasion)
  addMeta('Source', p.source)
  addMeta('Language', p.language)

  const tagsEl = el('div', { class: 'reader__tags' })
  for (const t of p.tags || []) {
    tagsEl.append(
      el(
        'button',
        {
          class: 'tag',
          type: 'button',
          onClick: () => {
            closeReader()
            searchInput.value = t
            setQuery(t)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          },
        },
        '#' + t
      )
    )
  }

  const inner = el(
    'div',
    { class: 'reader__inner' },
    el(
      'div',
      { class: 'reader__bar' },
      el('span', { class: 'reader__badge' }, p.tradition),
      el('div', { class: 'reader__bar-actions' }, copyBtn, shareBtn, closeBtn)
    ),
    el(
      'div',
      { class: 'reader__body' },
      el('span', { class: 'reader__badge' }, p.category),
      el('h2', { class: 'reader__title' }, p.title),
      (p.altTitles && p.altTitles.length
        ? el('p', { class: 'reader__alt' }, 'Also known as ' + p.altTitles.join(', '))
        : null),
      el('p', { class: 'reader__text' }, p.text),
      tagsEl.children.length ? tagsEl : null,
      meta
    )
  )
  dialog.replaceChildren(inner)
  if (!dialog.open) dialog.showModal()
  dialog.querySelector('.reader__body').scrollTop = 0
}

function closeReader() {
  if (dialog.open) dialog.close()
}

function openRandom() {
  const p = PRAYERS[Math.floor(Math.random() * PRAYERS.length)]
  openPrayer(p.id)
}

/* ------------------------------------------------------------------ *
 * History / deep-link sync
 * ------------------------------------------------------------------ */
function syncFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''))
  if (id && byId(id)) {
    openPrayer(id, { push: false })
  } else {
    closeReader()
  }
}
window.addEventListener('popstate', syncFromHash)

/* ------------------------------------------------------------------ *
 * Keyboard shortcuts
 * ------------------------------------------------------------------ */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dialog.open) {
    // handled by <dialog>, but ensure hash cleared
    return
  }
  if (e.key === '/' && document.activeElement !== searchInput && !dialog.open) {
    e.preventDefault()
    searchInput.focus()
    searchInput.select()
  }
})

/* ------------------------------------------------------------------ *
 * Toast + PWA update
 * ------------------------------------------------------------------ */
let toastTimer
function toast(message, action) {
  let t = $('#toast')
  if (!t) {
    t = el('div', { class: 'toast', id: 'toast', role: 'status' })
    document.body.append(t)
  }
  t.replaceChildren(el('span', {}, message), action || '')
  requestAnimationFrame(() => t.classList.add('is-visible'))
  clearTimeout(toastTimer)
  if (!action) toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2600)
  return t
}

const updateSW = registerSW({
  onNeedRefresh() {
    const t = toast('A new version is available.')
    t.append(
      el('button', { type: 'button', onClick: () => updateSW(true) }, 'Refresh')
    )
    t.classList.add('is-visible')
  },
  onOfflineReady() {
    toast('Ready to pray offline ✦')
  },
})

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
renderFilters()
render()
syncFromHash()
