const LEAD_CAPTURE_URL = 'https://script.google.com/macros/s/AKfycbyvVK3uhEE91SxKl5eaUBzMgW8_R872630JN2VGeEvvO-MU-g61XYXxDhkNtf8sLey-/exec'

const $ = id => document.getElementById(id)

const scoreLetter = score => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

const formatDate = ts => {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const overallScore = report => {
  const qs = report?.questions
  if (!qs?.length) return null
  return Math.round(qs.reduce((sum, q) => sum + (q.score || 0), 0) / qs.length)
}

const stepLabel = entry => {
  if (entry.report) return 'Complete'
  const answered = Object.keys(entry.answers || {}).length
  return answered ? `Q${answered}/7` : '—'
}

const renderRows = entries => {
  const tbody = $('tbody')
  tbody.textContent = ''

  if (!entries.length) {
    const tr = document.createElement('tr')
    const td = document.createElement('td')
    td.colSpan = 6
    td.className = 'empty'
    td.textContent = 'No entries yet.'
    tr.appendChild(td)
    tbody.appendChild(tr)
    return
  }

  entries.slice().reverse().forEach(entry => {
    const score = overallScore(entry.report)
    const tr = document.createElement('tr')

    const cells = [
      formatDate(entry.timestamp),
      entry.email || '—',
      score ?? '—',
      score != null ? scoreLetter(score) : '—',
      stepLabel(entry),
    ]

    cells.forEach((text, i) => {
      const td = document.createElement('td')
      td.textContent = text
      if (i === 3 && score != null) {
        td.className = `grade-cell grade-${scoreLetter(score)}`
      }
      tr.appendChild(td)
    })

    const actionTd = document.createElement('td')
    if (entry.sessionId && entry.report) {
      const a = document.createElement('a')
      a.href = `../?id=${entry.sessionId}`
      a.className = 'view-link'
      a.textContent = 'View report →'
      actionTd.appendChild(a)
    }
    tr.appendChild(actionTd)
    tbody.appendChild(tr)
  })
}

const load = async () => {
  $('status').textContent = 'Loading entries…'
  $('status').className = 'loading'
  $('table-wrap').classList.add('hidden')

  try {
    const res = await fetch(LEAD_CAPTURE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const entries = Array.isArray(data) ? data : data.entries || []
    $('status').textContent = `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
    $('status').className = 'entry-count'
    $('table-wrap').classList.remove('hidden')
    renderRows(entries)
  } catch (err) {
    $('status').textContent = `Error loading entries: ${err.message}. Make sure the Apps Script doGet returns all rows as JSON.`
    $('status').className = 'error'
  }
}

$('refresh').addEventListener('click', load)
load()
