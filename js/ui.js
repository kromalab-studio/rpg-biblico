// Interface: diálogos, escolhas, perguntas, Provas com dado, avisos e narração em voz.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const settings = { narrar: false };
  let dlg = null;
  let modalOpen = false;

  // ---------- Narração (Web Speech API) ----------
  // As vozes dependem do aparelho. Para as falas de Deus, procuramos uma voz masculina em português;
  // se não houver, usamos a voz padrão com tom mais grave e mais lento.
  const MASCULINAS = /male|mascul|daniel|antonio|antônio|felipe|francisco|donato|fabio|fábio|humberto|julio|júlio|nicolau|valerio|valério|ricardo|ptd|ptz/i;
  const FEMININAS = /female|femin|luciana|maria|francisca|thalita|vit[oó]ria|joana|let[ií]cia|raquel|brenda|elza|giovanna|leila|manuela|yara|fernanda|afs|pte/i;
  const TOM = {
    narrador: { rate: 0.95, pitch: 1 },
    deus: { rate: 0.85, pitch: 0.85 },
    deusGrave: { rate: 0.8, pitch: 0.55 }, // sem voz masculina: a voz padrão, mais grave
  };
  let ptVoice = null, maleVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    const pt = vs.filter(v => /pt[-_]BR/i.test(v.lang));
    const pool = pt.length ? pt : vs.filter(v => /^pt/i.test(v.lang));
    ptVoice = pool.find(v => FEMININAS.test(v.name + ' ' + v.voiceURI)) || pool[0] || null;
    maleVoice = pool.find(v => MASCULINAS.test(v.name + ' ' + v.voiceURI) && !FEMININAS.test(v.name)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function utter(text, who = '') {
    const u = new SpeechSynthesisUtterance(text.replace(/[“”"«»]/g, ''));
    u.lang = 'pt-BR';
    const deus = who === 'A Voz' || who === 'Deus';
    const voice = deus && maleVoice ? maleVoice : ptVoice;
    const tom = !deus ? TOM.narrador : maleVoice ? TOM.deus : TOM.deusGrave;
    if (voice) u.voice = voice;
    u.rate = tom.rate;
    u.pitch = tom.pitch;
    return u;
  }
  function speak(text, who = '') {
    if (!settings.narrar || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter(text, who));
  }
  // Toca um exemplo do narrador e da Voz, mesmo com a narração desligada.
  function testVoices(nomeVoz = 'A Voz') {
    if (!('speechSynthesis' in window)) return false;
    pickVoice();
    speechSynthesis.cancel();
    speechSynthesis.speak(utter('No princípio, tudo estava escuro e quietinho.'));
    speechSynthesis.speak(utter('Olá! Que bom que você veio. Vamos fazer a luz chegar?', nomeVoz));
    return true;
  }
  function hush() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // ---------- Diálogo ----------
  function parse(line) {
    if (typeof line === 'object') return line;
    const i = line.indexOf('|');
    if (i < 0) return { who: '', text: line };
    return { who: line.slice(0, i), text: line.slice(i + 1) };
  }

  function say(lines) {
    return new Promise(resolve => {
      dlg = { lines: lines.filter(Boolean).map(parse), i: 0, shown: 0, resolve };
      $('dialog').classList.remove('hidden');
      showLine();
    });
  }

  function showLine() {
    const l = dlg.lines[dlg.i];
    dlg.shown = 0;
    const box = $('dialog');
    box.classList.toggle('narration', !l.who);
    box.classList.toggle('voz', l.who === 'A Voz' || l.who === 'Deus');
    $('dialog-name').textContent = l.who;
    $('dialog-text').textContent = '';
    $('dialog-next').classList.add('hidden');
    speak(l.text, l.who);
  }

  function updateDialog(dt) {
    if (!dlg) return;
    const l = dlg.lines[dlg.i];
    if (dlg.shown < l.text.length) {
      dlg.shown = Math.min(l.text.length, dlg.shown + dt * 55);
      $('dialog-text').textContent = l.text.slice(0, Math.floor(dlg.shown));
      if (dlg.shown >= l.text.length) $('dialog-next').classList.remove('hidden');
    }
  }

  function advance() {
    if (!dlg) return false;
    const l = dlg.lines[dlg.i];
    if (dlg.shown < l.text.length) {
      dlg.shown = l.text.length;
      $('dialog-text').textContent = l.text;
      $('dialog-next').classList.remove('hidden');
      return true;
    }
    dlg.i++;
    if (dlg.i >= dlg.lines.length) {
      const r = dlg.resolve;
      dlg = null;
      $('dialog').classList.add('hidden');
      hush();
      r();
    } else {
      showLine();
    }
    return true;
  }

  // ---------- Modais ----------
  function openModal(html, onMount) {
    return new Promise(resolve => {
      const m = $('modal');
      $('modal-card').innerHTML = html;
      m.classList.remove('hidden');
      modalOpen = true;
      const close = value => {
        m.classList.add('hidden');
        $('modal-card').innerHTML = '';
        modalOpen = false;
        hush();
        resolve(value);
      };
      onMount($('modal-card'), close);
      const first = $('modal-card').querySelector('[autofocus], input, textarea, button');
      if (first) setTimeout(() => first.focus(), 30);
    });
  }

  function header(title, text) {
    return (title ? `<h2>${esc(title)}</h2>` : '') + (text ? `<p class="m-text">${esc(text)}</p>` : '');
  }

  // options: [{ label, desc, value, tag }]
  function choose({ title, text, options }) {
    speak([title, text].filter(Boolean).join('. '));
    const html = header(title, text) + `<div class="m-options">${options.map((o, i) =>
      `<button class="opt" data-i="${i}">${o.tag ? `<em>${esc(o.tag)}</em>` : ''}<b>${esc(o.label)}</b>${o.desc ? `<small>${esc(o.desc)}</small>` : ''}</button>`
    ).join('')}</div>`;
    return openModal(html, (card, close) => {
      card.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => close(options[+b.dataset.i].value)));
    });
  }

  // Pergunta aberta, com sugestões para quem ainda não escreve.
  function ask({ title, text, placeholder = '', suggestions = [], optional = true, multiline = false, max = 140, okLabel = 'Pronto' }) {
    speak([title, text].filter(Boolean).join('. '));
    const field = multiline
      ? `<textarea id="m-input" rows="4" maxlength="${max * 3}" placeholder="${esc(placeholder)}"></textarea>`
      : `<input id="m-input" type="text" maxlength="${max}" placeholder="${esc(placeholder)}" autocomplete="off">`;
    const sug = suggestions.length
      ? `<div class="m-sug">${suggestions.map(s => `<button class="chip" type="button">${esc(s)}</button>`).join('')}</div>` : '';
    const html = header(title, text) + `<form id="m-form">${field}${sug}<div class="m-actions">${optional ? '<button type="button" class="ghost" id="m-skip">Pular</button>' : ''}<button type="submit" id="m-ok">${esc(okLabel)}</button></div></form>`;
    return openModal(html, (card, close) => {
      const input = card.querySelector('#m-input');
      let fromSuggestion = false;
      card.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
        input.value = b.textContent;
        fromSuggestion = true;
        input.focus();
      }));
      input.addEventListener('input', () => { fromSuggestion = false; });
      card.querySelector('#m-form').addEventListener('submit', e => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v && !optional) { input.focus(); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
        close({ text: v, fromSuggestion: fromSuggestion && suggestions.includes(v) });
      });
      const skip = card.querySelector('#m-skip');
      if (skip) skip.addEventListener('click', () => close({ text: '', fromSuggestion: false }));
    });
  }

  function card({ title, text, html = '', buttons = [{ label: 'Continuar', value: true }], cls = '' }) {
    speak([title, text].filter(Boolean).join('. '));
    const body = header(title, text) + html + `<div class="m-actions">${buttons.map((b, i) =>
      `<button data-i="${i}" class="${b.ghost ? 'ghost' : ''}">${esc(b.label)}</button>`).join('')}</div>`;
    return openModal(`<div class="${cls}">${body}</div>`, (c, close) => {
      c.querySelectorAll('.m-actions button').forEach(b => b.addEventListener('click', () => close(buttons[+b.dataset.i].value)));
    });
  }

  // ---------- A Prova ----------
  const LUZ = {
    sol: { icon: '☀️', nome: 'Sol', frase: 'Deu certo!' },
    broto: { icon: '🌱', nome: 'Broto', frase: 'Deu certo aos poucos.' },
    nuvem: { icon: '☁️', nome: 'Nuvem', frase: 'Ainda não — vamos tentar de outro jeito.' },
  };

  function rollDie(sides) {
    return 1 + Math.floor(Math.random() * sides);
  }

  // spec: { titulo, texto, virtude, tags, dificuldade, semFalha, espigas (saldo atual), onSpend }
  function prova(v, spec) {
    const cam = RULES.camada(v);
    const isLuz = cam.dado === 'luz';
    const virt = RULES.virtude(spec.virtude);
    const bonusV = RULES.bonusVirtude(v, spec.virtude);
    const bonusA = RULES.bonusAntecedente(v, spec.tags);
    const ant = RULES.antecedentes.find(a => a.id === v.antecedente);
    const alvo = isLuz ? null : RULES.numeroProva[cam.dado][spec.dificuldade || 'media'];
    const dieLabel = isLuz ? 'Dado da Luz' : `d${cam.dado}`;

    const regra = isLuz
      ? `Role o Dado da Luz: ☀️ Sol, 🌱 Broto ou ☁️ Nuvem.`
      : `Role o ${dieLabel} e some ${virt.nome}${bonusA ? ` e ${ant.nome}` : ''}. Precisa de ${alvo} ou mais (${RULES.nomeDificuldade[spec.dificuldade || 'media']}).`;

    const html = `
      <div class="prova">
        <div class="prova-virtude">Prova de <b>${esc(virt.nome)}</b></div>
        <p class="m-text">${esc(spec.texto || '')}</p>
        <p class="m-rule">${esc(regra)}</p>
        <div class="die ${isLuz ? 'luz' : 'd' + cam.dado}" id="die"><span id="die-face">${isLuz ? '✦' : '?'}</span></div>
        <div id="prova-result" class="prova-result"></div>
        <div class="m-actions" id="prova-actions"><button id="btn-roll">Rolar o dado</button></div>
      </div>`;
    speak(`${spec.titulo || 'Prova'}. ${spec.texto || ''}`);

    return openModal(header(spec.titulo || 'Uma Prova', '') + html, (c, close) => {
      const face = c.querySelector('#die-face');
      const die = c.querySelector('#die');
      const result = c.querySelector('#prova-result');
      const actions = c.querySelector('#prova-actions');
      let tries = 0;
      let saldo = spec.espigas || 0;

      const doRoll = () => {
        tries++;
        actions.innerHTML = '';
        result.innerHTML = '';
        die.classList.add('rolling');
        let ticks = 0;
        const sides = isLuz ? 6 : cam.dado;
        const iv = setInterval(() => {
          const n = rollDie(sides);
          face.textContent = isLuz ? LUZ[n <= 2 ? 'nuvem' : n <= 4 ? 'broto' : 'sol'].icon : n;
          if (++ticks >= 12) { clearInterval(iv); finish(); }
        }, 70);
      };

      const finish = () => {
        die.classList.remove('rolling');
        const roll = rollDie(isLuz ? 6 : cam.dado);
        let out;
        if (isLuz) {
          let sym = roll <= 2 ? 'nuvem' : roll <= 4 ? 'broto' : 'sol';
          let nota = '';
          if (sym === 'nuvem' && v.favorita === spec.virtude) {
            sym = 'broto';
            nota = `Como você tem ${virt.nome}, a luz vem mais brilhante!`;
          }
          const ok = sym !== 'nuvem' || spec.semFalha;
          out = { roll, simbolo: sym, sucesso: sym !== 'nuvem', ok, parcial: sym === 'broto' };
          face.textContent = LUZ[sym].icon;
          result.innerHTML = `<b>${LUZ[sym].nome}!</b> ${esc(LUZ[sym].frase)}${nota ? `<br><small>${esc(nota)}</small>` : ''}`;
          speak(`${LUZ[sym].nome}! ${LUZ[sym].frase} ${nota}`);
        } else {
          const total = roll + bonusV + bonusA;
          const ok = total >= alvo;
          out = { roll, total, alvo, sucesso: ok, ok: ok || spec.semFalha, parcial: false };
          face.textContent = roll;
          const parts = [`Dado ${roll}`];
          if (bonusV) parts.push(`${virt.nome} +${bonusV}`);
          if (bonusA) parts.push(`${ant.nome} +${bonusA}`);
          result.innerHTML = `${esc(parts.join(' · '))} = <b>${total}</b> ${ok ? '≥' : '<'} ${alvo}<br><b class="${ok ? 'ok' : 'no'}">${ok ? 'Conseguiu!' : 'Ainda não.'}</b>`;
          speak(`Total ${total}. ${ok ? 'Conseguiu!' : 'Ainda não.'}`);
        }
        die.classList.toggle('good', out.sucesso);

        const btns = [];
        if (!out.sucesso && isLuz && !spec.semFalha) {
          btns.push(`<button id="btn-again">Tentar outro jeito</button>`);
        }
        if (!out.sucesso && !isLuz && !spec.semFalha && saldo >= 2) {
          btns.push(`<button id="btn-reroll" class="ghost">Tentar de novo (2 🌾)</button>`);
        }
        btns.push(`<button id="btn-done">Continuar</button>`);
        actions.innerHTML = btns.join('');
        const again = actions.querySelector('#btn-again');
        if (again) again.addEventListener('click', doRoll);
        const re = actions.querySelector('#btn-reroll');
        if (re) re.addEventListener('click', () => {
          saldo -= 2;
          if (spec.onSpend) spec.onSpend(2);
          doRoll();
        });
        actions.querySelector('#btn-done').addEventListener('click', () => close({ ...out, tries }));
        actions.querySelector('button').focus();
      };

      c.querySelector('#btn-roll').addEventListener('click', doRoll);
    });
  }

  // ---------- Avisos de recompensa ----------
  function toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function banner(text, sub) {
    const el = $('banner');
    el.innerHTML = `<div>${esc(text)}</div>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    speak(text + (sub ? '. ' + sub : ''));
    return new Promise(res => setTimeout(() => { el.classList.add('hidden'); res(); }, 3000));
  }

  // Fecha qualquer diálogo ou modal aberto (ao sair de uma partida).
  function closeAll() {
    if (dlg) { const r = dlg.resolve; dlg = null; $('dialog').classList.add('hidden'); r(); }
    if (modalOpen) { $('modal').classList.add('hidden'); $('modal-card').innerHTML = ''; modalOpen = false; }
    hush();
  }

  return {
    closeAll,
    get vozes() { return { narrador: ptVoice && ptVoice.name, deus: maleVoice ? maleVoice.name : '(voz padrão, mais grave)' }; },
    testVoices, settings, say, advance, updateDialog, choose, ask, card, prova, toast, banner, speak, hush, esc,
    get busy() { return !!dlg || modalOpen; },
    get dialogOpen() { return !!dlg; },
    get modalOpen() { return modalOpen; },
  };
})();
