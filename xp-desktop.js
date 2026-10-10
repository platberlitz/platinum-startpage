// Desktop controls share the original widgets and their saved data.
const desktopWindows = {
  search: { label: 'Internet Search', selector: '.search-card' },
  links: { label: 'Favourites', selector: '.links-card' },
  notes: { label: 'Notepad', selector: '.notes-card' },
  slideshow: { label: 'My Pictures', selector: '.slideshow-card' },
  timezones: { label: 'World Clocks', selector: '.timezone-card' },
  weather: { label: 'Weather', selector: '.weather-card' },
  news: { label: 'News', selector: '.news-card' }
};
let desktopHiddenWindows = null;

function desktopIcon(name) {
  return `<svg class="xp-icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
}

function initialiseDesktop() {
  // Apply the requested redesign once; retain the old appearance for reference.
  if (!localStorage.getItem('xpDesktopVersion')) {
    const keys = ['themePreset', 'themeBgColor', 'cardColor', 'accentColor', 'fontColor', 'cardOpacity', 'cardBlur'];
    const previous = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
    localStorage.setItem('appearanceBeforeXP', JSON.stringify(previous));
    localStorage.setItem('cardOpacity', '97');
    localStorage.setItem('cardBlur', '0');
    applyThemePreset('xpOlive');
    localStorage.setItem('xpDesktopVersion', '1');
  }

  const shortcuts = document.getElementById('desktopShortcuts');
  const tasks = document.getElementById('taskButtons');
  const apps = document.getElementById('startApps');
  for (const [name, window] of Object.entries(desktopWindows)) {
    const icon = desktopIcon(name);
    shortcuts.insertAdjacentHTML('beforeend', `<button class="desktop-shortcut" onclick="restoreWindow('${name}')">${icon}<span>${window.label}</span></button>`);
    apps.insertAdjacentHTML('beforeend', `<button onclick="restoreWindow('${name}'); toggleStartMenu(false)">${icon}<span>${window.label}</span></button>`);
    tasks.insertAdjacentHTML('beforeend', `<button class="task-button" data-window="${name}" aria-label="${window.label}" aria-pressed="true" onclick="toggleWindow('${name}')">${icon}<span>${window.label}</span></button>`);
    const card = document.querySelector(window.selector);
    card.dataset.window = name;
    if (name !== 'search') {
      const header = card.querySelector('.card-header');
      const actions = document.createElement('div');
      actions.className = 'window-actions';
      while (header.children.length > 1) actions.appendChild(header.children[1]);
      actions.insertAdjacentHTML('beforeend', `<button class="window-minimise" onclick="minimiseWindow('${name}')" aria-label="Minimise ${window.label}">_</button>`);
      header.appendChild(actions);
    }
  }

  // Keep taskbar states accurate even when a keyboard shortcut closes a panel.
  const observer = new MutationObserver(() => {
    for (const [selector, button] of [
      ['#settingsPanel', '.settings-btn'], ['#calcPopup', '.calc-btn'], ['.chat-card', '.chat-toggle-btn']
    ]) {
      const open = document.querySelector(selector).classList.contains('open');
      document.querySelector(button).setAttribute('aria-expanded', String(open));
    }
  });
  ['#settingsPanel', '#calcPopup', '.chat-card'].forEach(selector => observer.observe(document.querySelector(selector), { attributes: true, attributeFilter: ['class'] }));
  window.addEventListener('resize', loadGridLayout);
  document.addEventListener('click', event => {
    if (!event.target.closest('#startMenu, #startButton')) toggleStartMenu(false);
  });
}

function toggleStartMenu(force) {
  const menu = document.getElementById('startMenu');
  const open = force ?? menu.hidden;
  menu.hidden = !open;
  document.getElementById('startButton').setAttribute('aria-expanded', String(open));
  if (open) menu.querySelector('button')?.focus();
}

function setWindowVisibility(name, visible) {
  const card = document.querySelector(desktopWindows[name].selector);
  card.hidden = !visible;
  document.querySelector(`.task-button[data-window="${name}"]`)?.setAttribute('aria-pressed', String(visible));
}

function minimiseWindow(name) {
  setWindowVisibility(name, false);
  document.querySelector(`.task-button[data-window="${name}"]`)?.focus();
}

function restoreWindow(name, focus = true) {
  setWindowVisibility(name, true);
  desktopHiddenWindows = null;
  document.body.classList.remove('desktop-revealed');
  const card = document.querySelector(desktopWindows[name].selector);
  card.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  if (focus) {
    const target = name === 'search' ? document.getElementById('searchInput')
      : name === 'notes' ? document.getElementById('notesPreview')
      : card.querySelector('a, button, input');
    target?.focus({ preventScroll: true });
  }
}

function toggleWindow(name) {
  const card = document.querySelector(desktopWindows[name].selector);
  if (card.hidden) restoreWindow(name);
  else minimiseWindow(name);
}

function toggleDesktop() {
  if (desktopHiddenWindows) {
    for (const name of desktopHiddenWindows) setWindowVisibility(name, true);
    desktopHiddenWindows = null;
    document.body.classList.remove('desktop-revealed');
  } else {
    desktopHiddenWindows = Object.entries(desktopWindows)
      .filter(([, window]) => !document.querySelector(window.selector).hidden).map(([name]) => name);
    Object.keys(desktopWindows).forEach(name => setWindowVisibility(name, false));
    document.body.classList.add('desktop-revealed');
    for (const selector of ['#settingsPanel', '#calcPopup', '.chat-card']) {
      document.querySelector(selector).classList.remove('open');
    }
    document.getElementById('settingsPanel').inert = true;
  }
}

function launchUtility(name) {
  toggleStartMenu(false);
  if (name === 'chat') toggleChat();
  else if (name === 'calculator') toggleCalculator();
  else if (name === 'settings') toggleSettings();
  else if (name === 'layout') openLayoutModal();
  else if (name === 'shortcuts') document.getElementById('shortcutsModal').classList.add('open');
}
