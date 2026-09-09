// Isolated UI examples: no accounts, network requests, or persisted game state.
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let score = 0, spent = 0, budget = 12, visit = [], history = [], modifier = 'S', pocketUsed = false;
let bossMode = false, coins = 12;
const purchased = new Set();
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
function showScreen(name) {
  if (!['round', 'shop', 'boss', 'summary'].includes(name)) name = 'round';
  $$('.screen').forEach(screen => { screen.hidden = screen.id !== name; });
  $$('[data-screen]').forEach(button => {
    if (button.dataset.screen === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (location.hash !== '#' + name) window.history.replaceState(null, '', '#' + name);
}
$$('[data-screen]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screen)));
$$('[data-goto]').forEach(button => button.addEventListener('click', () => { showScreen(button.dataset.goto); window.scrollTo(0, 0); }));
window.addEventListener('hashchange', () => showScreen(location.hash.slice(1)));
$('#reset').addEventListener('click', () => location.reload());
for (let n = 1; n <= 20; n++) {
  const button = document.createElement('button');
  button.textContent = n;
  button.setAttribute('aria-label', 'Record single ' + n);
  button.addEventListener('click', () => record(modifier, n));
  $('#keypad').append(button);
}
function target() { return bossMode ? 270 : 210; }
function visitSize() { return Math.min(3, budget - spent); }
function finished() { return score >= target() || spent >= budget; }
function calculate() {
  const eligible = visit.map(hit => hit.ring !== 'M' && !(bossMode && hit.number === 20));
  const base = visit.reduce((sum, hit, i) => sum + (eligible[i] ? hit.points : 0), 0);
  const physical = visit.reduce((sum, hit) => sum + hit.points, 0);
  let bonus = visit.reduce((sum, hit, i) => sum + (eligible[i] && hit.ring === 'S' ? 10 : 0), 0);
  if (eligible[0] && visit[0].ring === 'S') bonus += 12;
  const numbers = visit.filter((hit, i) => eligible[i] && hit.number <= 20).map(hit => hit.number);
  const mult = new Set(numbers).size < numbers.length ? 2 : 1;
  return { base, bonus, physical, mult, total: (base + bonus) * mult };
}
function record(ring, number = 25) {
  if (finished() || visit.length >= visitSize()) return;
  const points = ring === 'M' ? 0 : ring === 'OB' ? 25 : ring === 'IB' ? 50 : number * ({ S: 1, D: 2, T: 3 }[ring]);
  visit.push({ ring, number, points });
  modifier = 'S';
  renderRound();
}
$$('[data-hit]').forEach(button => button.addEventListener('click', () => record(button.dataset.hit)));
function setModifier(ring) { modifier = modifier === ring ? 'S' : ring; renderRound(); }
$('#double').addEventListener('click', () => setModifier('D'));
$('#treble').addEventListener('click', () => setModifier('T'));
$('#undo').addEventListener('click', () => {
  if (visit.length) visit.pop();
  else if (history.length) {
    const previous = history.pop();
    score = previous.score; spent = previous.spent; visit = previous.visit.slice(0, -1);
  }
  renderRound();
});
$('#bank').addEventListener('click', () => {
  if (finished()) { showScreen('shop'); return; }
  if (visit.length !== visitSize()) return;
  const result = calculate();
  history.push({ score, spent, visit: [...visit] });
  score += result.total; spent += visit.length; visit = [];
  toast('+' + result.total + ' run points · ' + result.physical + ' physical board points');
  renderRound();
});
$('#pocket').addEventListener('click', () => {
  if (pocketUsed || visit.length || finished()) return;
  budget++; pocketUsed = true;
  toast('+1 dart added. Your final visit can contain fewer than three darts.');
  renderRound();
});
function renderRound() {
  $('#round-title').textContent = bossMode ? 'Find another way in.' : 'Find your rhythm.';
  $('#round .eyebrow').textContent = bossMode ? 'ACT I · THE BOUNCER · SECTOR 20 IS CLOSED' : 'ACT I · THE LOCAL';
  $('#round .round-stamp strong').innerHTML = (bossMode ? '03' : '02') + ' <i>/ 09</i>';
  $('#round .scoreline>div>span').textContent = '/ ' + target();
  $('#score').textContent = score;
  const won = score >= target();
  $('#needed').textContent = won ? 'Round cleared. Nicely thrown.' : finished() ? 'Run over · ' + (target() - score) + ' points short' : (target() - score) + ' points to go';
  $('#progress-fill').style.width = Math.min(100, score / target() * 100) + '%';
  $('.progress').setAttribute('aria-valuenow', Math.min(score, target()));
  $('.progress').setAttribute('aria-valuemax', target());
  $('#remaining').textContent = budget - spent - visit.length;
  $('#pips').innerHTML = Array.from({ length: budget }, (_, i) => '<i class="' + (i < spent + visit.length ? 'spent' : '') + '"></i>').join('');
  $('#budget-note').textContent = budget === 12 ? '12 standard darts · make them count.' : '12 standard + ' + (budget - 12) + ' extra · a little more possibility.';
  $('#visit-label').textContent = finished() ? 'Round complete · undo available' : 'Visit ' + (history.length + 1) + ' · record ' + visitSize() + ' darts';
  $('#throw-slots').innerHTML = [0, 1, 2].map(i => {
    const hit = visit[i];
    const label = hit ? hit.ring === 'M' ? 'MISS' : ['OB', 'IB'].includes(hit.ring) ? hit.points : hit.ring + hit.number : i < visitSize() && !finished() ? '—' : '·';
    return '<div class="throw-slot"><small>DART 0' + (i + 1) + '</small><strong>' + label + '</strong><span>' + (i === 0 ? 'Steady · +12 on S' : 'Standard dart') + '</span></div>';
  }).join('');
  const result = calculate();
  $('#breakdown').textContent = visit.length ? result.base + ' eligible + ' + result.bonus + ' bonus · ×' + result.mult + ' = ' + result.total + ' run points' : bossMode ? 'Sector 20 scores zero. Try recording S19, S19, S5.' : 'Throw your darts, then enter each hit in order.';
  $('#double').setAttribute('aria-pressed', modifier === 'D');
  $('#treble').setAttribute('aria-pressed', modifier === 'T');
  $$('#keypad button').forEach((button, index) => { button.setAttribute('aria-label', 'Record ' + ({ S: 'single', D: 'double', T: 'treble' }[modifier]) + ' ' + (index + 1)); });
  $$('#keypad button, [data-hit], #double, #treble').forEach(button => { button.disabled = finished() || visit.length >= visitSize(); });
  $('#undo').disabled = !visit.length && !history.length;
  $('#pocket').disabled = pocketUsed || !!visit.length || finished();
  $('#pocket b').textContent = pocketUsed ? 'USED' : 'USE +1';
  $('#bank').disabled = !finished() && visit.length !== visitSize();
  $('#bank').textContent = finished() ? (won ? 'Round cleared · explore shop example →' : 'Explore the shop example →') : visit.length === visitSize() ? 'Bank visit · +' + result.total + ' points →' : 'Enter ' + (visitSize() - visit.length) + ' dart' + (visitSize() - visit.length === 1 ? '' : 's') + ' to score this visit';
}
const itemNames = { pockets: 'Deep Pockets', tour: 'Grand Tour', precision: 'Precision Dart', pass: 'House Pass' };
$$('.buy').forEach(button => button.addEventListener('click', () => {
  const { item, price } = button.dataset;
  if (purchased.has(item) || coins < Number(price)) return;
  coins -= Number(price); purchased.add(item);
  $('#coins').textContent = coins;
  $$('.buy').forEach(buy => {
    buy.disabled = purchased.has(buy.dataset.item) || coins < Number(buy.dataset.price);
    if (purchased.has(buy.dataset.item)) buy.textContent = '✓ Equipped';
  });
  const charmCount = 2 + Number(purchased.has('pockets')) + Number(purchased.has('tour'));
  const tags = ['Single Minded', 'Familiar Ground', ...[...purchased].map(item => itemNames[item])];
  $('#shop-loadout').replaceChildren(...tags.map(name => { const span = document.createElement('span'); span.textContent = name; return span; }));
  const darts = purchased.has('pockets') ? 14 : 12;
  $('#shop-budget').textContent = 'Next round: ' + darts + ' darts · ' + charmCount + ' / 4 charms';
  $('#boss-darts').textContent = darts;
  $('#boss-darts-note').textContent = darts > 12 ? '12 standard + 2 from Deep Pockets' : 'standard budget';
  toast(itemNames[item] + ' equipped in the shop example.' + (item === 'pockets' ? ' Next round: 14 darts.' : ''));
}));
function resetRound(isBoss) {
  bossMode = isBoss; score = 0; spent = 0; visit = []; history = []; modifier = 'S'; pocketUsed = false;
  // The scoring scene intentionally demonstrates its own fixed two-charm build.
  budget = isBoss && purchased.has('pockets') ? 14 : 12;
  renderRound(); showScreen('round'); window.scrollTo(0, 0);
}
$('#start-boss').addEventListener('click', () => {
  resetRound(true);
  toast('Boss scoring example: Steady Dart + Single Minded + Familiar Ground; extra-dart purchase carries over.');
});
$('#new-run').addEventListener('click', () => { resetRound(false); toast('Round example reset. Try a new combination of hits.'); });
$('#copy-build').addEventListener('click', async () => {
  const text = 'Oche House Rules — example winning build: Deep Pockets / Grand Tour / Patient Player / House Special. Regular · 9 rounds cleared · 6,482 run points.';
  try { await navigator.clipboard.writeText(text); toast('Example build copied.'); }
  catch { toast('Clipboard unavailable in this browser. The build is shown above.'); }
});
showScreen(location.hash.slice(1));
renderRound();
