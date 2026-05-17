$(document).ready(onSiteLoad);

let correctZodiac;
let correctZodiacsCount = 0;
let totalZodiacsCount = 0;
let currentStreak = 0;
let bestStreak = 0;
let statisticsServiceReady = false;
let nextSessionCountdownIntervalId = null;
let liveSessionDateKey = null;
const LAST_MODE_STORAGE_KEY = 'zodiax-last-game-mode';
const SESSION_GOAL_STORAGE_KEY = 'zodiax-session-goal';
const SESSION_GOAL_STEP = 25;
const DEFAULT_SESSION_GOAL = 50;
let sessionGoal = DEFAULT_SESSION_GOAL;
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const locale = document.documentElement.lang === 'de' ? 'de' : 'en';

const messages = {
  en: {
    rightTitle: 'You are right!',
    wrongTitle: 'You are wrong!',
    correctTemplate: '${zodiac} is between ${start} and ${end}.',
    wrongTemplate: '<b>${correct}</b> is the right one. <br> ${zodiac} is between ${start} and ${end}.',
    scoreTemplate: '${correct}/${total} correct',
    sortedMode: 'Sorted Mode',
    transitionsMode: 'Learn Transitions',
    transitionsShuffledMode: 'Learn Transitions Shuffled',
    shuffledMode: 'Shuffled Mode',
    roundsLabel: 'rounds',
    nextSessionLabel: 'Next session in',
    goalReachedPrompt: 'You reached your session goal of ${goal} rounds. Increase it by ${step} rounds?',
    sortedHint: 'Sorted Mode: Dates are random and answer choices stay in zodiac order.',
    transitionsHint: 'Learn Transitions: Only first and last days of each zodiac sign are asked.',
    transitionsShuffledHint: 'Learn Transitions Shuffled: Only transition dates are asked and answer choices are shuffled each round.',
    shuffledHint: 'Shuffled Mode: Dates are random and answer choices are shuffled each round.'
  },
  de: {
    rightTitle: 'Du liegst richtig!',
    wrongTitle: 'Du liegst falsch!',
    correctTemplate: '${zodiac} ist zwischen ${start} und ${end}.',
    wrongTemplate: '<b>${correct}</b> ist das richtige Sternzeichen. <br> ${zodiac} ist zwischen ${start} und ${end}.',
    scoreTemplate: '${correct}/${total} korrekt',
    sortedMode: 'Sortierter Modus',
    transitionsMode: 'Übergänge lernen',
    transitionsShuffledMode: 'Übergänge lernen + gemischt',
    shuffledMode: 'Gemischter Modus',
    roundsLabel: 'Runden',
    nextSessionLabel: 'Nächste Sitzung in',
    goalReachedPrompt: 'Du hast dein Sitzungsziel von ${goal} Runden erreicht. Um ${step} Runden erhöhen?',
    sortedHint: 'Sortierter Modus: Zufällige Daten, aber die Antworten bleiben in Sternzeichen-Reihenfolge.',
    transitionsHint: 'Übergänge lernen: Es werden nur der erste und letzte Tag jedes Sternzeichens gefragt.',
    transitionsShuffledHint: 'Übergänge lernen + gemischt: Es werden nur Übergangstage gefragt und die Antworten werden pro Runde gemischt.',
    shuffledHint: 'Gemischter Modus: Zufällige Daten und pro Runde gemischte Antworten.'
  }
};

const zodiacs = {
  en: {
    1: { name: '♑️ Capricorn (Goat)', nameSimple: 'Capricorn', start: 355, end: 18 },
    2: { name: '♒️ Aquarius (Water bearer)', nameSimple: 'Aquarius', start: 19, end: 48 },
    3: { name: '♓️ Pisces (Fishes)', nameSimple: 'Pisces', start: 49, end: 78 },
    4: { name: '♈️ Aries (Ram)', nameSimple: 'Aries', start: 79, end: 108 },
    5: { name: '♉️ Taurus (Bull)', nameSimple: 'Taurus', start: 109, end: 139 },
    6: { name: '♊️ Gemini (Twins)', nameSimple: 'Gemini', start: 140, end: 171 },
    7: { name: '♋️ Cancer (Crab)', nameSimple: 'Cancer', start: 172, end: 202 },
    8: { name: '♌️ Leo (Lion)', nameSimple: 'Leo', start: 203, end: 233 },
    9: { name: '♍️ Virgo (Virgin)', nameSimple: 'Virgo', start: 234, end: 264 },
    10: { name: '♎️ Libra (Scales)', nameSimple: 'Libra', start: 265, end: 294 },
    11: { name: '♏️ Scorpio (Scorpion)', nameSimple: 'Scorpio', start: 295, end: 324 },
    12: { name: '♐️ Sagittarius (Archer)', nameSimple: 'Sagittarius', start: 325, end: 354 }
  },
  de: {
    1: { name: '♑️ Steinbock', nameSimple: 'Steinbock', start: 355, end: 18 },
    2: { name: '♒️ Wassermann', nameSimple: 'Wassermann', start: 19, end: 48 },
    3: { name: '♓️ Fische', nameSimple: 'Fische', start: 49, end: 78 },
    4: { name: '♈️ Widder', nameSimple: 'Widder', start: 79, end: 108 },
    5: { name: '♉️ Stier', nameSimple: 'Stier', start: 109, end: 139 },
    6: { name: '♊️ Zwillinge', nameSimple: 'Zwillinge', start: 140, end: 171 },
    7: { name: '♋️ Krebs', nameSimple: 'Krebs', start: 172, end: 202 },
    8: { name: '♌️ Löwe', nameSimple: 'Löwe', start: 203, end: 233 },
    9: { name: '♍️ Jungfrau', nameSimple: 'Jungfrau', start: 234, end: 264 },
    10: { name: '♎️ Waage', nameSimple: 'Waage', start: 265, end: 294 },
    11: { name: '♏️ Skorpion', nameSimple: 'Skorpion', start: 295, end: 324 },
    12: { name: '♐️ Schütze', nameSimple: 'Schütze', start: 325, end: 354 }
  }
};

function renderTemplate(template, values) {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => values[key]);
}

function getEmptyModeStatistics() {
  return {
    mode: getCurrentMode(),
    attempts: 0,
    correct: 0,
    wrong: 0,
    currentStreak: 0,
    bestStreak: 0,
    accuracy: 0
  };
}

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getCurrentModeStatisticsSnapshot() {
  if (!window.StatisticsService) {
    return getEmptyModeStatistics();
  }

  if (typeof window.StatisticsService.getLiveModeSummary === 'function') {
    return window.StatisticsService.getLiveModeSummary(getCurrentMode());
  }

  return window.StatisticsService.getModeSummary(getCurrentMode());
}

function applyModeStatisticsSnapshot(snapshot) {
  const modeSnapshot = snapshot || getEmptyModeStatistics();

  totalZodiacsCount = modeSnapshot.attempts;
  correctZodiacsCount = modeSnapshot.correct;
  currentStreak = modeSnapshot.currentStreak;
  bestStreak = modeSnapshot.bestStreak;
}

async function loadModeStatistics() {
  if (!statisticsServiceReady || !window.StatisticsService) {
    applyModeStatisticsSnapshot(getEmptyModeStatistics());
    updateStatisticsUI();
    return;
  }

  const snapshot = await getCurrentModeStatisticsSnapshot();
  applyModeStatisticsSnapshot(snapshot);
  updateStatisticsUI();
}

async function initializeStatisticsData() {
  if (!window.StatisticsService) {
    applyModeStatisticsSnapshot(getEmptyModeStatistics());
    updateStatisticsUI();
    return;
  }

  try {
    await window.StatisticsService.init(locale);
    statisticsServiceReady = true;
    await loadModeStatistics();
  } catch (error) {
    statisticsServiceReady = false;
    applyModeStatisticsSnapshot(getEmptyModeStatistics());
    updateStatisticsUI();
    console.error('Statistics initialization failed:', error);
  }
}

async function onSiteLoad() {
  loadSessionGoal();
  restoreLastGameMode();
  generateDate();
  $('#showResult').on('click', () => {
    void showResult();
  });
  $('#newQuestion').on('click', newQuestion);
  $('#gameMode').on('change', () => {
    void onGameModeChange();
  });
  initializeThemeMode();
  initializeStatisticsUI();
  await initializeStatisticsData();
}

function loadSessionGoal() {
  try {
    const savedGoal = Number.parseInt(window.localStorage.getItem(SESSION_GOAL_STORAGE_KEY), 10);

    if (Number.isFinite(savedGoal) && savedGoal > 0) {
      sessionGoal = savedGoal;
    }
  } catch (error) {
    console.warn('Could not read session goal:', error);
  }
}

function persistSessionGoal() {
  try {
    window.localStorage.setItem(SESSION_GOAL_STORAGE_KEY, String(sessionGoal));
  } catch (error) {
    console.warn('Could not persist session goal:', error);
  }
}

function restoreLastGameMode() {
  if (!$('#gameMode').length) {
    return;
  }

  const supportedModes = ['sorted', 'transitions', 'transitionsShuffled', 'shuffled'];

  try {
    const savedMode = window.localStorage.getItem(LAST_MODE_STORAGE_KEY);

    if (savedMode && supportedModes.includes(savedMode)) {
      $('#gameMode').val(savedMode);
    }
  } catch (error) {
    console.warn('Could not read saved game mode:', error);
  }
}

function persistLastGameMode(mode) {
  try {
    window.localStorage.setItem(LAST_MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Could not persist game mode:', error);
  }
}

function initializeStatisticsUI() {
  updateStatisticsUI();
  updateDifficultyUI();
  startNextSessionCountdown();

  if ($('#year').length) {
    $('#year').text(new Date().getFullYear());
  }
}

function updateDifficultyUI() {
  if (!$('#difficultyMode').length || !$('#gameMode').length) {
    return;
  }

  const mode = getCurrentMode();
  const modeLabels = {
    sorted: messages[locale].sortedMode,
    transitions: messages[locale].transitionsMode,
    transitionsShuffled: messages[locale].transitionsShuffledMode,
    shuffled: messages[locale].shuffledMode
  };

  $('#difficultyMode').text(modeLabels[mode]);

  if ($('#statModePill').length) {
    $('#statModePill').text(modeLabels[mode]);
  }

  if ($('#modeHint').length) {
    const modeHints = {
      sorted: messages[locale].sortedHint,
      transitions: messages[locale].transitionsHint,
      transitionsShuffled: messages[locale].transitionsShuffledHint,
      shuffled: messages[locale].shuffledHint
    };

    $('#modeHint').text(modeHints[mode]);
  }
}

function updateStatisticsUI() {
  if (!$('#statAttempts').length) {
    return;
  }

  const accuracy = totalZodiacsCount === 0
    ? 0
    : Math.round((correctZodiacsCount / totalZodiacsCount) * 100);

  $('#statAttempts').text(totalZodiacsCount);
  $('#statCorrect').text(correctZodiacsCount);
  $('#statAccuracy').text(`${accuracy}%`);
  $('#statCurrentStreak').text(currentStreak);
  $('#statBestStreak').text(bestStreak);

  if ($('#statProgress').length) {
    $('#statProgress').prop('max', sessionGoal);
    $('#statProgress').val(Math.min(totalZodiacsCount, sessionGoal));
  }

  if ($('#statProgressText').length) {
    $('#statProgressText').text(`${Math.min(totalZodiacsCount, sessionGoal)} / ${sessionGoal} ${messages[locale].roundsLabel}`);
  }
}

function maybePromptSessionGoalIncrease() {
  if (totalZodiacsCount !== sessionGoal) {
    return;
  }

  const shouldIncrease = window.confirm(
    renderTemplate(messages[locale].goalReachedPrompt, {
      goal: sessionGoal,
      step: SESSION_GOAL_STEP
    })
  );

  if (!shouldIncrease) {
    return;
  }

  sessionGoal += SESSION_GOAL_STEP;
  persistSessionGoal();
  updateStatisticsUI();
}

function startNextSessionCountdown() {
  if (!$('#nextSessionCountdown').length) {
    return;
  }

  if (nextSessionCountdownIntervalId) {
    window.clearInterval(nextSessionCountdownIntervalId);
  }

  liveSessionDateKey = getLocalDateKey();

  const updateCountdown = () => {
    const currentDateKey = getLocalDateKey();

    if (currentDateKey !== liveSessionDateKey) {
      liveSessionDateKey = currentDateKey;
      void loadModeStatistics();
    }

    const now = new Date();
    const nextSessionStart = new Date(now);
    nextSessionStart.setHours(24, 0, 0, 0);

    const millisecondsUntilNextSession = Math.max(0, nextSessionStart.getTime() - now.getTime());
    const totalSeconds = Math.floor(millisecondsUntilNextSession / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    $('#nextSessionCountdown').text(`${messages[locale].nextSessionLabel}: ${formatted}`);
  };

  updateCountdown();
  nextSessionCountdownIntervalId = window.setInterval(updateCountdown, 1000);
}

function applyThemeMode(mode) {
  $('html').toggleClass('dark', mode === 'dark');
}

function initializeThemeMode() {
  applyThemeMode(colorSchemeQuery.matches ? 'dark' : 'light');

  if (typeof colorSchemeQuery.addEventListener === 'function') {
    colorSchemeQuery.addEventListener('change', setAutomaticThemeMode);
    return;
  }

  colorSchemeQuery.addListener(setAutomaticThemeMode);
}

function setAutomaticThemeMode(event) {
  applyThemeMode(event.matches ? 'dark' : 'light');
}

async function showResult() {
  if ($('input[name="answer"]:checked').length === 0) {
    $('#errorMsg').removeClass('hidden');
    return;
  }

  const selectedValue = $('input[type="radio"][name="answer"]:checked').val();
  $('input[type="radio"][name="answer"]').prop('checked', false);

  const selectedZodiac = zodiacs[locale][selectedValue].nameSimple;
  const selectedZodiacStart = outputDate(zodiacs[locale][selectedValue].start);
  const selectedZodiacEnd = outputDate(zodiacs[locale][selectedValue].end);
  const correctZodiacName = zodiacs[locale][correctZodiac].nameSimple;
  const isCorrect = selectedValue === correctZodiac;

  if (statisticsServiceReady && window.StatisticsService) {
    try {
      await window.StatisticsService.recordAnswer({
        mode: getCurrentMode(),
        selectedZodiacKey: selectedValue,
        correctZodiacKey: correctZodiac,
        isCorrect
      });

      const summary = await getCurrentModeStatisticsSnapshot();
      applyModeStatisticsSnapshot(summary);
    } catch (error) {
      console.error('Failed to record statistics:', error);
      totalZodiacsCount++;

      if (isCorrect) {
        correctZodiacsCount++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
  } else {
    totalZodiacsCount++;

    if (isCorrect) {
      correctZodiacsCount++;
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  if (isCorrect) {

    $('#popupTitle').html(messages[locale].rightTitle);
    $('#popupContentReal').html(
      renderTemplate(messages[locale].correctTemplate, {
        zodiac: selectedZodiac,
        start: selectedZodiacStart,
        end: selectedZodiacEnd
      })
    );
    $('#correctAnswers').html(
      renderTemplate(messages[locale].scoreTemplate, {
        correct: correctZodiacsCount,
        total: totalZodiacsCount
      })
    );

    $('#popupContent').addClass('bg-green-500');
    $('#popupContent').removeClass('bg-red-500');
  } else {
    currentStreak = 0;

    $('#popupTitle').html(messages[locale].wrongTitle);
    $('#popupContentReal').html(
      renderTemplate(messages[locale].wrongTemplate, {
        correct: correctZodiacName,
        zodiac: selectedZodiac,
        start: selectedZodiacStart,
        end: selectedZodiacEnd
      })
    );
    $('#correctAnswers').html(
      renderTemplate(messages[locale].scoreTemplate, {
        correct: correctZodiacsCount,
        total: totalZodiacsCount
      })
    );

    $('#popupContent').removeClass('bg-green-500');
    $('#popupContent').addClass('bg-red-500');
  }

  updateStatisticsUI();
  maybePromptSessionGoalIncrease();
  $('#popupOverlay').removeClass('hidden');
  $('#errorMsg').addClass('hidden');
}

function newQuestion() {
  shuffleAnswers();
  $('#popupOverlay').addClass('hidden');
  generateDate();
  $('html, body').animate({ scrollTop: 0 }, 'slow');
}

async function onGameModeChange() {
  persistLastGameMode(getCurrentMode());
  shuffleAnswers();
  generateDate();
  await loadModeStatistics();
}

function getCurrentMode() {
  if (!$('#gameMode').length) {
    return 'sorted';
  }

  const mode = $('#gameMode').val();
  const supportedModes = ['sorted', 'transitions', 'transitionsShuffled', 'shuffled'];

  if (!supportedModes.includes(mode)) {
    return 'sorted';
  }

  return mode;
}

function getTransitionDays() {
  const daySet = new Set();

  Object.values(zodiacs[locale]).forEach((zodiac) => {
    daySet.add(zodiac.start);
    daySet.add(zodiac.end);
  });

  return Array.from(daySet);
}

function getZodiacSign(day) {
  for (const key in zodiacs[locale]) {
    const zodiac = zodiacs[locale][key];
    if (zodiac.start <= zodiac.end) {
      if (day >= zodiac.start && day <= zodiac.end) {
        return key;
      }
    } else if ((day >= zodiac.start && day <= 364) || (day >= 0 && day <= zodiac.end)) {
      return key;
    }
  }

  return '1';
}

function generateDate() {
  const mode = getCurrentMode();
  let randomValue;

  if (mode === 'transitions' || mode === 'transitionsShuffled') {
    const transitionDays = getTransitionDays();
    randomValue = transitionDays[Math.floor(Math.random() * transitionDays.length)];
  } else {
    const daysOfYear = 365;
    randomValue = Math.floor(Math.random() * daysOfYear);
  }

  correctZodiac = getZodiacSign(randomValue);
  const date = outputDate(randomValue);

  $('#date').html(date);
}

function outputDate(day) {
  const startDate = new Date(new Date().getFullYear(), 0, 1);
  const generatedDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
  const dayNumber = generatedDate.getDate();

  if (locale === 'de') {
    const monthDe = generatedDate.toLocaleString('de-DE', { month: 'long' });
    return `${dayNumber}. ${monthDe}`;
  }

  const monthEn = generatedDate.toLocaleString('en-US', { month: 'long' });
  return `${monthEn}, ${dayNumber}${getOrdinalSuffix(dayNumber)}`;
}

function getOrdinalSuffix(number) {
  const j = number % 10;
  const k = number % 100;

  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }

  return 'th';
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function shuffleAnswers() {
  const answersContainer = $('#answers');
  const answerLabels = answersContainer.find('label');
  const answersArray = Array.from(answerLabels);
  const mode = getCurrentMode();

  if (mode === 'shuffled' || mode === 'transitionsShuffled') {
    shuffleArray(answersArray);
  } else {
    answersArray.sort((left, right) => {
      const leftValue = Number($(left).find('input').val());
      const rightValue = Number($(right).find('input').val());
      return leftValue - rightValue;
    });
  }

  answersContainer.empty();

  answersArray.forEach((answer) => {
    answersContainer.append(answer);
  });

  updateDifficultyUI();
}
