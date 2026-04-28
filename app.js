const ENDPOINT = 'https://us-central1-samantha-374622.cloudfunctions.net/openai-responses'
const LEAD_CAPTURE_URL = 'https://script.google.com/macros/s/AKfycbyvVK3uhEE91SxKl5eaUBzMgW8_R872630JN2VGeEvvO-MU-g61XYXxDhkNtf8sLey-/exec'
const STORAGE_KEY = 'darrin-report-card'

const questions = [
  {
    id: 'differentiator',
    prompt: 'In two sentences or less, how do you communicate what differentiates you from your competitors?',
    type: 'textarea',
  },
  {
    id: 'audience',
    prompt: 'Describe your primary target audience in one sentence.',
    type: 'text',
  },
  {
    id: 'pains',
    prompt: 'List the pain points your primary target audience faces.',
    type: 'textarea',
  },
  {
    id: 'benefits',
    prompt: 'What key benefits do your clients experience from working with you?',
    type: 'textarea',
  },
  {
    id: 'leadMagnet',
    prompt: 'Describe your lead magnet(s).',
    type: 'textarea-with-options',
    options: [
      { value: 'none', label: "I don't currently have a lead magnet" },
      { value: 'unknown', label: "I'm not familiar with what a lead magnet is" },
    ],
  },
  {
    id: 'salesProcess',
    prompt: 'Describe the steps of your sales process or funnel.',
    type: 'textarea',
    hint: 'Example: I generate cold leads from email campaigns and networking, conduct a discovery call, send a proposal, follow up to close.',
  },
]

const gradeSchema = {
  name: 'report_card',
  schema: {
    additionalProperties: false,
    properties: {
      inferred_challenges: {
        items: {
          additionalProperties: false,
          properties: {
            status: { enum: ['critical', 'struggling', 'on_track'], type: 'string' },
            title: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['title', 'status', 'why'],
          type: 'object',
        },
        type: 'array',
      },
      overall: {
        additionalProperties: false,
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['headline', 'summary'],
        type: 'object',
      },
      questions: {
        items: {
          additionalProperties: false,
          properties: {
            activities: { items: { type: 'string' }, type: 'array' },
            feedback: { type: 'string' },
            id: { type: 'string' },
            score: { type: 'integer' },
          },
          required: ['id', 'score', 'feedback', 'activities'],
          type: 'object',
        },
        type: 'array',
      },
    },
    required: ['overall', 'questions', 'inferred_challenges'],
    type: 'object',
  },
  strict: true,
  type: 'json_schema',
}

let darrinContext = ''

const state = {
  answers: {},
  email: '',
  name: '',
  sessionId: '',
  step: 0,
}

const isValidEmail = v => /^\S+@\S+\.\S+$/.test(v.trim())

const $ = id => document.getElementById(id)
const show = id => $(id).classList.remove('hidden')
const hide = id => $(id).classList.add('hidden')

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers, email: state.email, name: state.name, sessionId: state.sessionId, step: state.step }))

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved) {
      state.answers = saved.answers || {}
      state.email = saved.email || ''
      state.name = saved.name || ''
      state.sessionId = saved.sessionId || ''
      state.step = saved.step || 0
      return true
    }
  } catch {}
  return false
}

const captureLead = (report = null) => {
  fetch(LEAD_CAPTURE_URL, {
    body: JSON.stringify({ answers: state.answers, email: state.email, name: state.name, report, sessionId: state.sessionId }),
    method: 'POST',
  }).catch(() => {})
}

const getAnswerText = id => {
  const a = state.answers[id]
  if (!a) return ''
  if (typeof a === 'string') return a
  if (a.option === 'none') return "[User doesn't currently have a lead magnet]"
  if (a.option === 'unknown') return "[User is not familiar with what a lead magnet is]"
  if (Array.isArray(a.selected)) return a.selected.join(', ')
  return a.text || ''
}

const isAnswered = id => {
  const q = questions.find(q => q.id === id)
  const a = state.answers[id]
  if (!a) return false
  if (q.type === 'textarea-with-options') return !!a.option || (a.text && a.text.trim().length > 0)
  if (q.type === 'multi-with-textarea') return (a.selected && a.selected.length > 0) || (a.text && a.text.trim().length > 0)
  return typeof a === 'string' && a.trim().length > 0
}

const renderStep = () => {
  const q = questions[state.step]
  $('progress-bar').style.width = `${(state.step / questions.length) * 100}%`
  $('step-counter').textContent = `Question ${state.step + 1} of ${questions.length}`

  $('question').textContent = ''
  const promptEl = document.createElement('span')
  promptEl.textContent = q.prompt
  $('question').appendChild(promptEl)
  if (q.hint) {
    const hint = document.createElement('span')
    hint.className = 'hint'
    hint.textContent = q.hint
    $('question').appendChild(hint)
  }

  const field = $('field')
  field.textContent = ''
  const a = state.answers[q.id]

  if (q.type === 'text') {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = typeof a === 'string' ? a : ''
    input.addEventListener('input', () => { state.answers[q.id] = input.value; save() })
    field.appendChild(input)
    setTimeout(() => input.focus(), 50)
  } else if (q.type === 'textarea') {
    const ta = document.createElement('textarea')
    ta.value = typeof a === 'string' ? a : ''
    ta.addEventListener('input', () => { state.answers[q.id] = ta.value; save() })
    field.appendChild(ta)
    setTimeout(() => ta.focus(), 50)
  } else if (q.type === 'textarea-with-options') {
    const ta = document.createElement('textarea')
    ta.placeholder = 'Describe your lead magnet(s)...'
    ta.value = (a && a.text) || ''
    ta.addEventListener('input', () => {
      state.answers[q.id] = { option: null, text: ta.value }
      Array.from(field.querySelectorAll('.option')).forEach(o => o.classList.remove('selected'))
      save()
    })
    field.appendChild(ta)

    const opts = document.createElement('div')
    opts.className = 'options'
    q.options.forEach(opt => {
      const label = document.createElement('label')
      label.className = 'option'
      if (a && a.option === opt.value) label.classList.add('selected')
      const radio = document.createElement('input')
      radio.type = 'radio'
      radio.name = q.id
      radio.value = opt.value
      radio.checked = a && a.option === opt.value
      radio.addEventListener('change', () => {
        state.answers[q.id] = { option: opt.value, text: '' }
        ta.value = ''
        Array.from(opts.querySelectorAll('.option')).forEach(o => o.classList.remove('selected'))
        label.classList.add('selected')
        save()
      })
      const span = document.createElement('span')
      span.textContent = opt.label
      label.appendChild(radio)
      label.appendChild(span)
      opts.appendChild(label)
    })
    field.appendChild(opts)
  } else if (q.type === 'multi-with-textarea') {
    const opts = document.createElement('div')
    opts.className = 'options'
    const current = a || { selected: [], text: '' }
    q.options.forEach(opt => {
      const label = document.createElement('label')
      label.className = 'option'
      if (current.selected.includes(opt.value)) label.classList.add('selected')
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.value = opt.value
      cb.checked = current.selected.includes(opt.value)
      cb.addEventListener('change', () => {
        const cur = state.answers[q.id] || { selected: [], text: '' }
        cur.selected = cb.checked ? [...cur.selected, opt.value] : cur.selected.filter(v => v !== opt.value)
        state.answers[q.id] = cur
        label.classList.toggle('selected', cb.checked)
        save()
      })
      const span = document.createElement('span')
      span.textContent = opt.label
      label.appendChild(cb)
      label.appendChild(span)
      opts.appendChild(label)
    })
    field.appendChild(opts)

    const ta = document.createElement('textarea')
    ta.placeholder = 'Tell us more about your client acquisition challenges...'
    ta.value = current.text || ''
    ta.addEventListener('input', () => {
      const cur = state.answers[q.id] || { selected: [], text: '' }
      cur.text = ta.value
      state.answers[q.id] = cur
      save()
    })
    field.appendChild(ta)
  }

  $('back').disabled = state.step === 0
  $('next').textContent = state.step === questions.length - 1 ? 'Get my report card' : 'Next'
}

const startIntake = (resume = false) => {
  hide('intro')
  hide('report')
  show('intake')
  if (!resume) {
    state.answers = {}
    state.step = 0
    save()
  }
  renderStep()
}

const gradeAnswers = async () => {
  const payload = questions.map(q => ({ id: q.id, prompt: q.prompt, answer: getAnswerText(q.id) }))
  const body = {
    input: `Grade the following responses from a bootstrapped solopreneur about their sales foundation. For each question, assign an integer score from 0-100 using standard letter-grade ranges (A = 90-100, B = 80-89, C = 70-79, D = 60-69, F = below 60). Give 2-3 sentences of specific, constructive feedback. Begin the feedback with "Score: X." where X is the numeric score. Also provide 3-4 concrete activities tied to the specific gap in their response — things the founder can actually do this week.

${payload.map(p => `[${p.id}] ${p.prompt}\nAnswer: ${p.answer || '(no answer provided)'}`).join('\n\n')}

Always return all four of the following client acquisition challenges, in this exact order. For each, set status to "critical", "struggling", or "on_track". You MUST mark exactly one as "critical" — the single most pressing gap that would have the biggest impact if addressed first. The remaining challenges should be "struggling" or "on_track". Explain specifically WHY — grounded in what they actually said. Do not skip any:
1. Generating Qualified Cold Leads
2. Conducting Discovery Calls
3. Losing Prospects After the Discovery Calls
4. Closing Sales

Include a short headline (3-6 words) and a 1-2 sentence overall summary.${darrinContext ? `\n\n---\n${darrinContext}` : ''}`,
    instructions: `You are Darrin, an outbound cold sales expert helping bootstrapped solo-founders develop their differentiator, messaging, and sales process. Grade like a candid mentor, not a cheerleader.

Grading rubric — apply strictly:
- A: rare. Truly specific, differentiated, and market-tested. Would stand out cold in a prospect's inbox.
- B: clear and competent, but still recognizable as generic in one or two ways.
- C: the default. Directionally right but leans on buzzwords, broad audiences, or feature-not-benefit framing.
- D: vague, confused, or mostly filler.
- F: missing, contradictory, or actively harms their positioning.

Use the full range of scores. Reward specificity, penalize abstractions. One sharp sentence of critique beats three soft ones.

Tone: direct, warm, no flattery, no fearmongering. You're the friend who tells them the truth because you want them to win. Always write in second person — "Your differentiator…", "Your target audience…" — never "The differentiator answer" or "The answers provided."`,
    model: 'gpt-4.1',
    text: { format: gradeSchema },
  }

  const res = await fetch(ENDPOINT, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const result = await res.json()
  return JSON.parse(result.output_text)
}

const scoreBand = score => {
  if (score >= 90) return 'high'
  if (score >= 80) return 'mid-high'
  if (score >= 70) return 'mid'
  return 'low'
}

const scoreLetter = score => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}


const computeScore = qs => Math.round(qs.reduce((sum, q) => sum + q.score, 0) / qs.length)

const renderReport = report => {
  const score = computeScore(report.questions)
  const scoreEl = $('overall-score')
  scoreEl.classList.remove('skeleton')
  scoreEl.dataset.band = scoreBand(score)
  $('score-value').textContent = score
  $('score-letter').textContent = scoreLetter(score)
  const summaryEl = $('overall-summary')
  summaryEl.textContent = ''
  const parts = report.overall.summary.split(/(?=Next steps?:)/i)
  summaryEl.appendChild(document.createTextNode(parts[0].trim()))
  if (parts[1]) {
    const next = document.createElement('strong')
    next.className = 'next-steps'
    next.textContent = parts[1].trim()
    summaryEl.appendChild(next)
  }

  questions.forEach(q => {
    const r = report.questions.find(x => x.id === q.id)
    if (!r) return
    const card = $('cards').querySelector(`[data-qid="${q.id}"]`)
    if (!card) return
    const letter = scoreLetter(r.score)

    card.dataset.grade = letter

    const skGrade = card.querySelector('.skeleton-grade')
    if (skGrade) {
      const badge = document.createElement('span')
      badge.className = 'grade'
      badge.dataset.grade = letter
      badge.textContent = letter
      skGrade.replaceWith(badge)
    }

    const skFb = card.querySelector('.skeleton-feedback')
    if (skFb) {
      const fb = document.createElement('div')
      fb.className = 'feedback'
      const match = r.feedback.match(/^(Score:\s*\d+\.?\s*)([\s\S]*)/)
      if (match) {
        const strong = document.createElement('strong')
        strong.textContent = match[1].trim()
        fb.appendChild(strong)
        fb.appendChild(document.createTextNode(' ' + match[2]))
      } else {
        fb.textContent = r.feedback
      }
      skFb.replaceWith(fb)
    }
  })

  const challengeCards = $('challenge-cards')
  challengeCards.textContent = ''
  const challengeTitles = ['Generating Qualified Cold Leads', 'Conducting Discovery Calls', 'Losing Prospects After Discovery Calls', 'Closing Sales']
  if (report.inferred_challenges?.length) {
    report.inferred_challenges.forEach((c, i) => {
      const card = document.createElement('div')
      card.className = `challenge-card challenge-${c.status}`

      const head = document.createElement('div')
      head.className = 'challenge-head'

      const title = document.createElement('div')
      title.className = 'challenge-title'
      title.textContent = challengeTitles[i] || c.title
      head.appendChild(title)

      const badge = document.createElement('span')
      badge.className = 'challenge-badge'
      const badgeLabels = { critical: 'Critical', on_track: 'On track', struggling: 'Needs work' }
      badge.textContent = badgeLabels[c.status] || 'Needs work'
      head.appendChild(badge)
      card.appendChild(head)

      const why = document.createElement('div')
      why.className = 'challenge-why'
      why.textContent = c.why
      card.appendChild(why)

      challengeCards.appendChild(card)
    })
    show('challenges-section')
  }
  show('report-cta')
}

const makeSkeleton = (widths = [1, 0.85, 0.65]) => {
  const wrap = document.createElement('div')
  wrap.className = 'skeleton-feedback'
  widths.forEach(w => {
    const line = document.createElement('span')
    line.className = 'skeleton skeleton-line'
    line.style.width = `${w * 100}%`
    wrap.appendChild(line)
  })
  return wrap
}

const renderLoadingState = () => {
  const scoreEl = $('overall-score')
  scoreEl.dataset.band = ''
  scoreEl.classList.add('skeleton')
  $('score-value').textContent = ''
  $('score-letter').textContent = ''
  $('overall-summary').textContent = 'Analyzing your answers…'


  const cards = $('cards')
  cards.textContent = ''
  questions.forEach(q => {
    const card = document.createElement('div')
    card.className = 'card'
    card.dataset.qid = q.id

    const head = document.createElement('div')
    head.className = 'card-head'
    const h3 = document.createElement('h3')
    h3.textContent = q.prompt
    const skGrade = document.createElement('span')
    skGrade.className = 'skeleton skeleton-grade'
    head.appendChild(h3)
    head.appendChild(skGrade)
    card.appendChild(head)

    const answer = document.createElement('div')
    answer.className = 'answer'
    answer.textContent = getAnswerText(q.id) || '(no answer provided)'
    card.appendChild(answer)

    card.appendChild(makeSkeleton())
    cards.appendChild(card)
  })

  $('challenge-cards').textContent = ''
  hide('challenges-section')
  hide('report-cta')
}

const submit = async () => {
  hide('intake')
  show('report')
  renderLoadingState()

  try {
    const report = await gradeAnswers()
    renderReport(report)
    localStorage.setItem(`${STORAGE_KEY}-report-${state.sessionId}`, JSON.stringify(report))
    localStorage.setItem(`${STORAGE_KEY}-last-report`, JSON.stringify(report))
    captureLead(report)
    if (state.sessionId) history.replaceState(null, '', `?id=${state.sessionId}`)
  } catch (err) {
    $('overall-summary').textContent = `Error: ${err.message}`
  }
}

const loadById = async id => {
  hide('intro')
  hide('intake')
  show('report')

  const cached = localStorage.getItem(`${STORAGE_KEY}-report-${id}`)
  if (cached) {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    state.answers = saved.answers || {}
    state.email = saved.email || ''
    state.sessionId = id
    renderLoadingState()
    renderReport(JSON.parse(cached))
    return
  }

  try {
    const res = await fetch(`${LEAD_CAPTURE_URL}?id=${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    state.answers = data.answers || {}
    state.email = data.email || ''
    state.sessionId = id
    renderLoadingState()
    renderReport(data.report)
  } catch (err) {
    $('overall-summary').textContent = `Could not load report: ${err.message}`
  }
}

$('start').addEventListener('click', () => {
  state.sessionId = crypto.randomUUID()
  save()
  captureLead()
  startIntake(false)
})
$('resume').addEventListener('click', () => startIntake(true))

$('back').addEventListener('click', () => {
  if (state.step > 0) {
    state.step--
    save()
    renderStep()
  }
})

$('next').addEventListener('click', () => {
  const q = questions[state.step]
  if (!isAnswered(q.id)) {
    alert('Please answer before continuing.')
    return
  }
  if (state.step === questions.length - 1) {
    $('progress-bar').style.width = '100%'
    show('modal-overlay')
    $('modal-name').focus()
  } else {
    state.step++
    save()
    captureLead()
    renderStep()
  }
})

$('modal-cancel').addEventListener('click', () => hide('modal-overlay'))

$('modal-submit').addEventListener('click', () => {
  const name = $('modal-name').value.trim()
  const email = $('modal-email').value.trim()
  if (!name) {
    $('modal-name').setCustomValidity('Please enter your name.')
    $('modal-name').reportValidity()
    $('modal-name').addEventListener('input', () => $('modal-name').setCustomValidity(''), { once: true })
    return
  }
  if (!isValidEmail(email)) {
    $('modal-email').setCustomValidity('Please enter a valid email.')
    $('modal-email').reportValidity()
    $('modal-email').addEventListener('input', () => $('modal-email').setCustomValidity(''), { once: true })
    return
  }
  state.name = name
  state.email = email
  state.sessionId = state.sessionId || crypto.randomUUID()
  save()
  captureLead()
  hide('modal-overlay')
  submit()
})

const restart = () => {
  state.answers = {}
  state.email = ''
  state.sessionId = ''
  state.step = 0
  save()
  hide('report')
  hide('intake')
  show('intro')
  $('resume').hidden = true
}

$('header-restart').addEventListener('click', restart)

$('brand-link').addEventListener('click', e => {
  e.preventDefault()
  hide('report')
  hide('intake')
  hide('modal-overlay')
  show('intro')
  if (Object.keys(state.answers).length > 0) $('resume').hidden = false
  history.replaceState(null, '', location.pathname)
})



const simulateAnswer = async () => {
  const q = questions[state.step]
  const btn = $('simulate')
  btn.disabled = true
  const original = btn.textContent
  btn.textContent = '✨ Generating…'

  const priorContext = questions
    .slice(0, state.step)
    .map(pq => {
      const a = getAnswerText(pq.id)
      return a ? `Q: ${pq.prompt}\nA: ${a}` : null
    })
    .filter(Boolean)
    .join('\n\n')

  const qualityPool = ['strong', 'strong', 'weak', 'weak', 'mid', 'mid']
  const quality = qualityPool[Math.floor(Math.random() * qualityPool.length)]

  const qualityGuidance = {
    strong: `Write a STRONG answer (would earn an A). Specific, concrete, differentiated, outcome-framed, no buzzwords.`,
    mid: `Write a MEDIOCRE answer (would earn a C or C-). Some specificity but leans heavily on generic phrases and buzzwords. Directionally right but not distinct.`,
    weak: `Write a POOR answer (would earn a D or F). Vague, confused, full of buzzwords, broad undefined audience, features not benefits, no clear differentiator or completely missing the point.`,
  }

  const body = {
    input: `You are a bootstrapped solopreneur being interviewed about your sales foundation. Generate a ${quality} quality answer for demo purposes.

${qualityGuidance[quality]}

Stay consistent with prior answers (same business, same founder). Keep length natural — 1-3 sentences for short fields, a short paragraph for longer ones.

${priorContext ? `Prior answers:\n${priorContext}\n\n` : ''}Question: ${q.prompt}

Respond with ONLY the answer text.`,
    instructions: `Generating demo answers for a sales coaching intake. This question targets ${quality} quality.`,
    model: 'gpt-4.1',
  }

  try {
    const res = await fetch(ENDPOINT, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const result = await res.json()
    const text = (result.output_text || '').trim()

    if (q.type === 'text' || q.type === 'textarea') {
      state.answers[q.id] = text
    } else if (q.type === 'textarea-with-options') {
      state.answers[q.id] = { option: null, text }
    } else if (q.type === 'multi-with-textarea') {
      const pool = q.options.map(o => o.value)
      const n = 1 + Math.floor(Math.random() * Math.min(3, pool.length))
      const selected = pool.sort(() => Math.random() - 0.5).slice(0, n)
      state.answers[q.id] = { selected, text }
    }
    save()
    renderStep()
  } catch (err) {
    alert(`Simulation failed: ${err.message}`)
  } finally {
    btn.disabled = false
    btn.textContent = original
  }
}

$('simulate').addEventListener('click', simulateAnswer)

fetch('DARREN.md').then(r => r.text()).then(t => { darrinContext = t }).catch(() => {})

const idParam = new URLSearchParams(location.search).get('id')
if (idParam) {
  loadById(idParam)
} else {
  if (load() && Object.keys(state.answers).length > 0) $('resume').hidden = false
}
