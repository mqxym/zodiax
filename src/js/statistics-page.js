$(document).ready(() => {
  void initializeStatisticsPage();
});

const pageLocale = document.documentElement.lang === 'de' ? 'de' : 'en';

const pageConfig = {
  en: {
    pageTitle: 'Statistics Dashboard',
    noData: 'No rounds played yet.',
    modeNames: {
      sorted: 'Sorted',
      transitions: 'Learn Transitions',
      transitionsShuffled: 'Transitions Shuffled',
      shuffled: 'Shuffled'
    },
    labels: {
      attempts: 'Attempts',
      correct: 'Correct',
      wrong: 'Wrong',
      accuracy: 'Avg. Success Rate',
      bestStreak: 'Largest Streak',
      currentStreak: 'Today Streak',
      topCorrect: 'Most Correct Zodiac',
      topWrong: 'Most Failed Zodiac',
      sessions: 'Recent Learning Sessions',
      modePerformance: 'Average Success Rate By Mode',
      weakSpotByMode: 'Weak Spot Concentration By Mode',
      weakSpotNone: 'No mistakes yet',
      weakSpotFocus: 'Top weak spot',
      modesPlayed: 'Modes played',
      modesPlayedNone: 'No mode data'
    },
    reset: {
      confirmAll: 'Reset all statistics across all modes? This cannot be undone.',
      confirmMode: 'Reset statistics for ${mode}? This cannot be undone.',
      successAll: 'All statistics have been reset.',
      successMode: 'Statistics for ${mode} have been reset.',
      error: 'Statistics could not be reset. Please try again.'
    },
    zodiacNames: {
      1: 'Capricorn',
      2: 'Aquarius',
      3: 'Pisces',
      4: 'Aries',
      5: 'Taurus',
      6: 'Gemini',
      7: 'Cancer',
      8: 'Leo',
      9: 'Virgo',
      10: 'Libra',
      11: 'Scorpio',
      12: 'Sagittarius'
    },
    sessionCard: 'Session'
  },
  de: {
    pageTitle: 'Statistik Dashboard',
    noData: 'Noch keine Runden gespielt.',
    modeNames: {
      sorted: 'Sortiert',
      transitions: 'Übergänge lernen',
      transitionsShuffled: 'Übergänge lernen + gemischt',
      shuffled: 'Gemischt'
    },
    labels: {
      attempts: 'Versuche',
      correct: 'Richtig',
      wrong: 'Falsch',
      accuracy: 'Ø Erfolgsquote',
      bestStreak: 'Größte Serie',
      currentStreak: 'Heutige Serie',
      topCorrect: 'Am häufigsten richtig',
      topWrong: 'Am häufigsten verfehlt',
      sessions: 'Letzte Lern-Sessions',
      modePerformance: 'Durchschnittliche Erfolgsquote je Modus',
      weakSpotByMode: 'Schwachstellen-Konzentration je Modus',
      weakSpotNone: 'Noch keine Fehler',
      weakSpotFocus: 'Größte Schwachstelle',
      modesPlayed: 'Gespielte Modi',
      modesPlayedNone: 'Keine Modusdaten'
    },
    reset: {
      confirmAll: 'Alle Statistiken über alle Modi zurücksetzen? Das kann nicht rückgängig gemacht werden.',
      confirmMode: 'Statistiken für ${mode} zurücksetzen? Das kann nicht rückgängig gemacht werden.',
      successAll: 'Alle Statistiken wurden zurückgesetzt.',
      successMode: 'Die Statistiken für ${mode} wurden zurückgesetzt.',
      error: 'Die Statistik konnte nicht zurückgesetzt werden. Bitte erneut versuchen.'
    },
    zodiacNames: {
      1: 'Steinbock',
      2: 'Wassermann',
      3: 'Fische',
      4: 'Widder',
      5: 'Stier',
      6: 'Zwillinge',
      7: 'Krebs',
      8: 'Löwe',
      9: 'Jungfrau',
      10: 'Waage',
      11: 'Skorpion',
      12: 'Schütze'
    },
    sessionCard: 'Session'
  }
};

function getConfig() {
  return pageConfig[pageLocale];
}

function formatTopZodiac(entry) {
  const cfg = getConfig();

  if (!entry || !entry.zodiacKey || entry.count <= 0) {
    return '-';
  }

  return `${cfg.zodiacNames[entry.zodiacKey]} (${entry.count})`;
}

function createPercentBar(value) {
  return `
    <div class="mode-bar-track">
      <span class="mode-bar-fill" style="width:${Math.max(0, Math.min(value, 100))}%"></span>
    </div>
  `;
}

async function refreshStatisticsDashboard() {
  const [dataByMode, sessions] = await Promise.all([
    window.StatisticsService.getAllModeSummaries(),
    window.StatisticsService.getRecentSessions(8)
  ]);

  renderModeCards(dataByMode);
  renderAccuracyGraph(dataByMode);
  renderWeakSpotGraph(dataByMode);
  renderSessions(sessions);
}

function renderModeCards(dataByMode) {
  const cfg = getConfig();
  const container = $('#modeCards');
  container.empty();

  const modes = window.StatisticsService.SUPPORTED_MODES;

  modes.forEach((mode) => {
    const modeData = dataByMode[mode];
    const card = `
      <article class="rounded-2xl border border-slate-300/70 bg-white/85 p-5 shadow-md dark:border-slate-700 dark:bg-slate-900/75">
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-serif text-2xl font-bold text-slate-900 dark:text-slate-100">${cfg.modeNames[mode]}</h3>
          <span class="rounded-full border border-brand-500/40 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">${modeData.accuracy}%</span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-center">
          <div class="rounded-xl border border-slate-300/70 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/75">
            <p class="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">${cfg.labels.attempts}</p>
            <p class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">${modeData.attempts}</p>
          </div>
          <div class="rounded-xl border border-slate-300/70 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/75">
            <p class="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">${cfg.labels.bestStreak}</p>
            <p class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">${modeData.bestStreak}</p>
          </div>
          <div class="rounded-xl border border-slate-300/70 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/75">
            <p class="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">${cfg.labels.correct}</p>
            <p class="mt-1 text-xl font-bold text-emerald-600">${modeData.correct}</p>
          </div>
          <div class="rounded-xl border border-slate-300/70 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/75">
            <p class="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">${cfg.labels.wrong}</p>
            <p class="mt-1 text-xl font-bold text-red-500">${modeData.wrong}</p>
          </div>
        </div>

        <div class="mt-4 text-sm text-slate-700 dark:text-slate-200">
          <p><span class="font-semibold">${cfg.labels.currentStreak}:</span> ${modeData.currentStreak}</p>
          <p class="mt-1"><span class="font-semibold">${cfg.labels.topCorrect}:</span> ${formatTopZodiac(modeData.topCorrect)}</p>
          <p class="mt-1"><span class="font-semibold">${cfg.labels.topWrong}:</span> ${formatTopZodiac(modeData.topWrong)}</p>
        </div>
      </article>
    `;

    container.append(card);
  });
}

function renderAccuracyGraph(dataByMode) {
  const cfg = getConfig();
  const container = $('#accuracyGraph');
  container.empty();

  window.StatisticsService.SUPPORTED_MODES.forEach((mode) => {
    const item = dataByMode[mode];
    container.append(`
      <div class="graph-row">
        <div class="graph-label">${cfg.modeNames[mode]}</div>
        <div class="graph-main">
          ${createPercentBar(item.accuracy)}
        </div>
        <div class="graph-value">${item.accuracy}%</div>
      </div>
    `);
  });
}

function renderWeakSpotGraph(dataByMode) {
  const cfg = getConfig();
  const container = $('#correctWrongGraph');
  container.empty();

  window.StatisticsService.SUPPORTED_MODES.forEach((mode) => {
    const item = dataByMode[mode];
    const topWrongCount = Number(item.topWrong?.count || 0);
    const totalWrong = Number(item.wrong || 0);
    const concentration = totalWrong === 0
      ? 0
      : Math.round((topWrongCount / totalWrong) * 100);
    const focusName = totalWrong === 0
      ? cfg.labels.weakSpotNone
      : `${cfg.zodiacNames[item.topWrong.zodiacKey]} (${topWrongCount}/${totalWrong})`;

    container.append(`
      <div class="graph-row">
        <div class="graph-label">${cfg.modeNames[mode]}</div>
        <div class="graph-main">
          ${createPercentBar(concentration)}
          <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">${cfg.labels.weakSpotFocus}: ${focusName}</p>
        </div>
        <div class="graph-value">${concentration}%</div>
      </div>
    `);
  });
}

function renderSessions(sessions) {
  const cfg = getConfig();
  const container = $('#sessionCards');
  const totalSessions = sessions.length;
  container.empty();

  if (!sessions.length) {
    container.append(`<p class="text-slate-600 dark:text-slate-300">${cfg.noData}</p>`);
    return;
  }

  sessions.forEach((session, index) => {
    const dateText = new Date(session.startedAt).toLocaleString(pageLocale === 'de' ? 'de-DE' : 'en-US');
    const modesPlayedText = (session.playedModes || [])
      .map((mode) => `${cfg.modeNames[mode]} (${session.modeCounts?.[mode] || 0})`)
      .join(' | ');

    const card = `
      <article class="rounded-xl border border-slate-300/70 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/75">
        <p class="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">${cfg.sessionCard} ${totalSessions - index}</p>
        <h4 class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">${dateText}</h4>
        <p class="mt-2 text-sm text-slate-700 dark:text-slate-200">${cfg.labels.attempts}: ${session.attempts} | ${cfg.labels.accuracy}: ${session.accuracy}%</p>
        <p class="mt-1 text-sm text-slate-700 dark:text-slate-200">${cfg.labels.modesPlayed}: ${modesPlayedText || cfg.labels.modesPlayedNone}</p>
      </article>
    `;

    container.append(card);
  });
}

function applyThemeMode(mode) {
  $('html').toggleClass('dark', mode === 'dark');
}

function initializeThemeMode() {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  applyThemeMode(query.matches ? 'dark' : 'light');

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', (event) => {
      applyThemeMode(event.matches ? 'dark' : 'light');
    });
  } else {
    query.addListener((event) => {
      applyThemeMode(event.matches ? 'dark' : 'light');
    });
  }
}

function initializeResetControls() {
  if (!$('#resetStatistics').length || !$('#resetMode').length || !window.StatisticsService) {
    return;
  }

  $('#resetStatistics').on('click', async () => {
    const cfg = getConfig();
    const selectedMode = String($('#resetMode').val() || 'all');
    const modeName = cfg.modeNames[selectedMode] || selectedMode;

    const confirmMessage = selectedMode === 'all'
      ? cfg.reset.confirmAll
      : cfg.reset.confirmMode.replace('${mode}', modeName);

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (selectedMode === 'all') {
        await window.StatisticsService.resetAllStatistics();
        window.alert(cfg.reset.successAll);
      } else {
        await window.StatisticsService.resetModeStatistics(selectedMode);
        window.alert(cfg.reset.successMode.replace('${mode}', modeName));
      }

      await refreshStatisticsDashboard();
    } catch (error) {
      console.error('Failed to reset statistics:', error);
      window.alert(cfg.reset.error);
    }
  });
}

async function initializeStatisticsPage() {
  const cfg = getConfig();
  initializeThemeMode();

  $('#pageTitle').text(cfg.pageTitle);
  $('#accuracyGraphTitle').text(cfg.labels.modePerformance);
  $('#correctWrongGraphTitle').text(cfg.labels.weakSpotByMode);
  $('#sessionsTitle').text(cfg.labels.sessions);
  $('#year').text(new Date().getFullYear());

  if (!window.StatisticsService) {
    $('#modeCards').html(`<p class="text-slate-600 dark:text-slate-300">${cfg.noData}</p>`);
    return;
  }

  await window.StatisticsService.init(pageLocale);
  initializeResetControls();
  await refreshStatisticsDashboard();
}
