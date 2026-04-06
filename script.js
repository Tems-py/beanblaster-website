['machX','machZ','tgtX','tgtZ'].forEach(id => {
  document.getElementById(id).addEventListener('input', calculate);
});

function toStacks(n) {
  const abs    = Math.abs(n);
  const stacks = Math.floor(abs / 64);
  const rem    = abs % 64;
  const sign   = n < 0 ? '−' : '';
  if (stacks === 0) return `${sign}${rem} items`;
  if (rem === 0)    return `${sign}${stacks} stack${stacks !== 1 ? 's' : ''}`;
  return `${sign}${stacks} stack${stacks !== 1 ? 's' : ''} + ${rem}`;
}

function runCalc(machX, machZ, tgtX, tgtZ) {
  const relX = tgtX - machX;
  const relZ = tgtZ - machZ;

  const aboveV1 = (relX / 13.5)  < relZ;
  const aboveV2 = (relX / -15)   < relZ;
  const aboveV3 = (relZ / 13.7)  < relX;
  const aboveV4 = (relZ / -15.2) < relX;

  let quadrant;
  if (aboveV1) {
    if (aboveV3)       quadrant = 'NE';
    else if (aboveV2)  quadrant = 'NW';
    else               quadrant = 'SW';
  } else if (aboveV4)  quadrant = 'SE';
  else if (!aboveV2)   quadrant = 'SW';

  if (!quadrant) return { error: 'Could not determine quadrant — check your coordinates.' };

  let factor, otherFactor;
  if      (quadrant === 'NE') { factor = 13.5;  otherFactor = 13.7;  }
  else if (quadrant === 'NW') { factor = -15;   otherFactor = 13.7;  }
  else if (quadrant === 'SE') { factor = 13.5;  otherFactor = -15.2; }
  else                        { factor = -15;   otherFactor = -15.2; }

  let result      = factor * otherFactor;
  let otherResult = factor * relZ - relX;
  result          = result - 1;
  const crossX    = otherResult / result;
  const crossZ    = crossX * otherFactor;

  let endingZ = (quadrant === 'NE' || quadrant === 'NW') ? crossZ / 36 : crossZ / -31;
  let endingX = crossX - relX;

  let dispensers;
  if (quadrant === 'NE') {
    endingX = endingX / -31;
    dispensers = [{ id: 2, value: Math.trunc(endingZ) }, { id: 3, value: Math.trunc(endingX) }];
  } else if (quadrant === 'NW') {
    endingX = endingX / 31;
    dispensers = [{ id: 1, value: Math.trunc(endingX) }, { id: 3, value: Math.trunc(endingZ) }];
  } else if (quadrant === 'SE') {
    endingX = endingX / -36;
    dispensers = [{ id: 2, value: Math.trunc(endingX) }, { id: 4, value: Math.trunc(endingZ) }];
  } else {
    endingX = endingX / 36;
    dispensers = [{ id: 1, value: Math.trunc(endingX) }, { id: 4, value: Math.trunc(endingZ) }];
  }

  return { quadrant, dispensers };
}

function compassSVG(quadrant) {
  const dotPos = { NE: [58,22], NW: [22,22], SE: [58,58], SW: [22,58] };
  const [dx, dy] = dotPos[quadrant] || [40,40];
  const dirs = [
    { l:'N', x:40, y:8  },
    { l:'E', x:72, y:40 },
    { l:'S', x:40, y:72 },
    { l:'W', x:8,  y:40 },
  ];
  const labels = dirs.map(({ l, x, y }) => {
    const active = quadrant && quadrant.includes(l);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
      font-family="Sora, sans-serif" font-size="9" font-weight="${active ? 600 : 400}"
      fill="${active ? '#1c1917' : '#c4bfb8'}">${l}</text>`;
  }).join('');
  return `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <circle cx="40" cy="40" r="34" stroke="#e5e2dc" stroke-width="1"/>
    <line x1="40" y1="6" x2="40" y2="74" stroke="#f0ede8" stroke-width="1"/>
    <line x1="6"  y1="40" x2="74" y2="40" stroke="#f0ede8" stroke-width="1"/>
    <circle cx="${dx}" cy="${dy}" r="4.5" fill="#1c1917"/>
    ${labels}
  </svg>`;
}

function renderResult(data) {
  const section = document.getElementById('result');
  section.classList.remove('hidden');

  if (data.error) {
    section.innerHTML = `<div class="error-msg">${data.error}</div>`;
    return;
  }

  const cards = data.dispensers.map((d, i) => {
    const neg = d.value < 0;
    return `
      <div class="dispenser-card" style="animation-delay:${i * 0.1}s">
        <div class="text-xs font-semibold text-stone-400 tracking-widest uppercase mb-2">
          Dispenser ${d.id}
        </div>
        <div class="value-num ${neg ? 'text-red-500' : 'text-stone-900'}">${d.value}</div>
        <div class="stacks-text">${toStacks(d.value)}</div>
      </div>`;
  }).join('');

  section.innerHTML = `
    <div class="card p-5">
      <div class="grid grid-cols-2 gap-3">
        ${cards}
      </div>
    </div>`;
}

function saveCoords(machX, machZ, tgtX, tgtZ) {
  localStorage.setItem('bb_coords', JSON.stringify({ machX, machZ, tgtX, tgtZ }));
}

function loadCoords() {
  try {
    const saved = JSON.parse(localStorage.getItem('bb_coords'));
    if (!saved) return;
    if (saved.machX !== undefined) document.getElementById('machX').value = saved.machX;
    if (saved.machZ !== undefined) document.getElementById('machZ').value = saved.machZ;
    if (saved.tgtX  !== undefined) document.getElementById('tgtX').value  = saved.tgtX;
    if (saved.tgtZ  !== undefined) document.getElementById('tgtZ').value  = saved.tgtZ;
  } catch {}
}

function calculate() {
  const machX = parseFloat(document.getElementById('machX').value);
  const machZ = parseFloat(document.getElementById('machZ').value);
  const tgtX  = parseFloat(document.getElementById('tgtX').value);
  const tgtZ  = parseFloat(document.getElementById('tgtZ').value);

  if ([machX, machZ, tgtX, tgtZ].some(isNaN)) {
    renderResult({ error: 'Please fill in all four coordinate fields.' });
    return;
  }

  saveCoords(machX, machZ, tgtX, tgtZ);
  const data = runCalc(machX, machZ, tgtX, tgtZ);
  const firstTime = document.getElementById('result').classList.contains('hidden');
  renderResult(data);
  if (firstTime) document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

loadCoords();
calculate();
