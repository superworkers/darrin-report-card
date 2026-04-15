const ENDPOINT = 'https://us-central1-samantha-374622.cloudfunctions.net/openai-responses'
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
    hint: 'One per line works great.',
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
  {
    id: 'challenges',
    prompt: 'What are your biggest client acquisition challenges?',
    type: 'multi-with-textarea',
    hint: 'Select all that apply, then tell us more.',
    options: [
      { value: 'leads', label: 'Generating Qualified Leads' },
      { value: 'discovery', label: 'Conducting Discovery Calls' },
      { value: 'losing', label: 'Losing Prospects After the Discovery Calls' },
      { value: 'closing', label: 'Closing Sales' },
    ],
  },
]

const gradeSchema = {
  name: 'report_card',
  schema: {
    additionalProperties: false,
    properties: {
      overall: {
        additionalProperties: false,
        properties: {
          headline: { type: 'string' },
          score: { type: 'integer' },
          summary: { type: 'string' },
        },
        required: ['score', 'headline', 'summary'],
        type: 'object',
      },
      questions: {
        items: {
          additionalProperties: false,
          properties: {
            feedback: { type: 'string' },
            grade: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['id', 'grade', 'feedback'],
          type: 'object',
        },
        type: 'array',
      },
    },
    required: ['overall', 'questions'],
    type: 'object',
  },
  strict: true,
  type: 'json_schema',
}

const state = {
  answers: {},
  step: 0,
}

const $ = id => document.getElementById(id)
const show = id => $(id).classList.remove('hidden')
const hide = id => $(id).classList.add('hidden')

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers, step: state.step }))

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved) {
      state.answers = saved.answers || {}
      state.step = saved.step || 0
      return true
    }
  } catch {}
  return false
}

const getAnswerText = id => {
  const a = state.answers[id]
  if (!a) return ''
  if (typeof a === 'string') return a
  if (a.option === 'none') return "[User doesn't currently have a lead magnet]"
  if (a.option === 'unknown') return "[User is not familiar with what a lead magnet is]"
  if (Array.isArray(a.selected)) {
    const labels = a.selected.map(v => questions.find(q => q.id === 'challenges').options.find(o => o.value === v)?.label).filter(Boolean)
    return `Selected: ${labels.join(', ') || 'None'}\n\n${a.text || ''}`.trim()
  }
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
    input: `Grade the following responses from a bootstrapped solopreneur about their sales foundation. For each question, assign a letter grade (A, A-, B+, B, B-, C+, C, C-, D, F) and give 2-3 sentences of specific, constructive feedback pointing out what's strong and what to sharpen. Then provide an overall grade and a 1-2 sentence summary of where they stand.

${payload.map(p => `[${p.id}] ${p.prompt}\nAnswer: ${p.answer || '(no answer provided)'}`).join('\n\n')}

Also return an overall Brand Clarity Score from 0-100 (integer). Calibrate strictly:
- 85-100: rare — genuinely sharp, differentiated, market-ready across the board.
- 70-84: solid foundation, 1-2 areas to sharpen.
- 50-69: the typical range — directionally right but leaning on generics; real work needed.
- 30-49: significant gaps; messaging wouldn't land cold.
- Below 30: missing or confused fundamentals.
Most real founders land in the 40-65 range. Don't inflate to be nice and don't deflate to manufacture urgency. Include a short headline (3-6 words) and a 1-2 sentence summary naming where they stand and the single most important thing to sharpen first.`,
    instructions: `You are Darrin, an outbound cold sales expert helping bootstrapped solo-founders develop their differentiator, messaging, and sales process. Grade like a candid mentor, not a cheerleader — most founders' foundations have real gaps, and it doesn't help them to soften that. But don't be cruel or manufacture problems to upsell; the goal is an honest diagnosis they'd thank you for.

Grading rubric — apply strictly:
- A: rare. Truly specific, differentiated, and market-tested. Would stand out cold in a prospect's inbox.
- B: clear and competent, but still recognizable as generic in one or two ways. The norm for a solid but not standout founder.
- C: the default grade for most founders. Directionally right but leans on buzzwords, broad audiences, or feature-not-benefit framing. Real work needed.
- D: vague, confused, or mostly filler. Prospect wouldn't know why to choose them.
- F: missing, contradictory, or actively harms their positioning.

Calibration:
- Default to C when in doubt. Don't give B for effort; give it for actual clarity.
- Reward specificity (named verticals, concrete pains, measurable outcomes) — penalize abstractions ("high-quality", "trusted partner", "passionate", "innovative", "small businesses", "entrepreneurs").
- Missing lead magnet is an honest D, not an F — but explain what they're leaving on the table, not that they're doomed.
- One sharp sentence of critique beats three soft ones. Name the specific weakness and the specific fix.

Tone: direct, warm, no flattery, no fearmongering. You're the friend who tells them the truth because you want them to win.`,
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
  if (score >= 80) return 'high'
  if (score >= 65) return 'mid-high'
  if (score >= 45) return 'mid'
  return 'low'
}

const scoreLetter = score => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

const benchmarkCopy = score => {
  if (score >= 85) return `Top ~10% of founders we see. Most land between 40 and 65 — you're well past that.`
  if (score >= 70) return `Above the typical range. Most founders land between 40 and 65; you're in the upper tier.`
  if (score >= 55) return `Right around where most founders start. The typical range is 40-65 — you're mid-pack with clear room to pull ahead.`
  if (score >= 40) return `Below the typical range. Most founders land between 40 and 65, and sharpening the basics closes that gap fast.`
  return `Well below where most founders land (40-65). The fundamentals need work — but that's also where the biggest wins are.`
}

const ctaCopy = score => {
  if (score >= 80) return `A ${score}/100 means your foundation is strong. Here's how to scale it.`
  if (score >= 65) return `A ${score}/100 is solid but leaving wins on the table. Here's how to sharpen it.`
  if (score >= 45) return `If your Brand Clarity Score is ${score}/100, here's what you need.`
  return `A ${score}/100 means prospects aren't sure why to choose you. Here's how to fix that.`
}

const renderReport = report => {
  const score = report.overall.score
  $('score-value').textContent = score
  $('score-letter').textContent = scoreLetter(score)
  $('overall-score').dataset.band = scoreBand(score)
  $('overall-summary').textContent = report.overall.summary
  $('benchmark').textContent = benchmarkCopy(score)
  $('cta-title').textContent = report.overall.headline || "Here's what you need next"
  $('cta-sub').textContent = ctaCopy(score)

  const cards = $('cards')
  cards.textContent = ''
  questions.forEach(q => {
    const r = report.questions.find(x => x.id === q.id)
    if (!r) return
    const card = document.createElement('div')
    card.className = 'card'

    const head = document.createElement('div')
    head.className = 'card-head'
    const h3 = document.createElement('h3')
    h3.textContent = q.prompt
    const grade = document.createElement('span')
    grade.className = 'grade'
    grade.dataset.grade = r.grade
    grade.textContent = r.grade
    head.appendChild(h3)
    head.appendChild(grade)
    card.appendChild(head)

    const answer = document.createElement('div')
    answer.className = 'answer'
    answer.textContent = getAnswerText(q.id) || '(no answer provided)'
    card.appendChild(answer)

    const fb = document.createElement('div')
    fb.className = 'feedback'
    fb.textContent = r.feedback
    card.appendChild(fb)

    cards.appendChild(card)
  })
}

const submit = async () => {
  hide('intake')
  show('report')
  $('score-value').textContent = '…'
  $('score-letter').textContent = '…'
  $('overall-score').dataset.band = ''
  $('overall-summary').textContent = 'Grading your answers…'
  $('benchmark').textContent = ''
  $('cta-title').textContent = "Here's what you need next"
  $('cta-sub').textContent = ''
  $('cards').textContent = ''

  try {
    const report = await gradeAnswers()
    renderReport(report)
    localStorage.setItem(`${STORAGE_KEY}-last-report`, JSON.stringify(report))
  } catch (err) {
    $('overall-summary').textContent = `Error: ${err.message}`
  }
}

$('start').addEventListener('click', () => startIntake(false))
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
    submit()
  } else {
    state.step++
    save()
    renderStep()
  }
})

const restart = () => {
  state.answers = {}
  state.step = 0
  save()
  hide('report')
  hide('intake')
  show('intro')
  $('resume').hidden = true
}

$('restart').addEventListener('click', restart)
$('header-restart').addEventListener('click', restart)

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

  const qualityPool = ['strong', 'weak', 'weak', 'mid', 'mid', 'mid']
  const quality = qualityPool[Math.floor(Math.random() * qualityPool.length)]

  const qualityGuidance = {
    strong: `Write a STRONG answer (would earn an A or A-). The founder has clearly done the strategic work here:
- Specific, concrete, and differentiated
- Names a narrow target with real context
- Benefits framed as outcomes, not features
- Avoids buzzwords — uses plain, vivid language`,
    mid: `Write a MEDIUM answer (would earn a B- or C+). The founder is partway there:
- Some specificity, but still leans on a few generic phrases
- Target audience is named but a little broad
- Mixes real insight with filler
- Reader can tell what they do but not what makes them distinct`,
    weak: `Write a WEAK answer (would earn a C-, D, or F). The founder hasn't done the strategic work:
- Generic buzzwords ("high-quality", "trusted partner", "innovative solutions")
- Broad, undefined audience ("small businesses", "entrepreneurs")
- Vague pains, features framed as benefits
- No clear differentiator — falls back on "passion" or "care"`,
  }

  const body = {
    input: `You are a bootstrapped solopreneur being interviewed about your sales foundation. For demo purposes, the goal is a MIX of answer quality across the 7 questions so the report card shows clear addressable opportunities — some strengths to affirm, some weaknesses to coach.

For THIS question, the target quality level is: ${quality.toUpperCase()}.

${qualityGuidance[quality]}

Stay consistent with any prior answers (same business, same founder, same audience). Keep length natural for the input type — 1-3 sentences for short fields, a short paragraph for longer ones. Sound like a real founder, not a caricature.

${priorContext ? `Your prior answers (stay consistent with them):\n${priorContext}\n\n` : ''}Question: ${q.prompt}

Respond with ONLY the answer text — no preamble, no question echo, no quotation marks.`,
    instructions: `You are generating demo answers for a sales coaching intake form. Mix strong and weak answers across questions so the grading system surfaces realistic, addressable opportunities. This question's target quality is ${quality}.`,
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

$('chatbot-toggle').addEventListener('click', () => {
  alert('Chatbot coming soon — ask Darrin your questions here without booking a call.')
})

if (load() && Object.keys(state.answers).length > 0) {
  $('resume').hidden = false
}
