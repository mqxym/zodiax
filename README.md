# Zodiax

## About

Zodiax is a bilingual zodiac learning app with interactive quiz pages and a full statistics dashboard.
It helps users memorize zodiac date ranges with multiple training modes, instant feedback, and progress tracking over time.

Live pages:

- English quiz: [https://zodiax.mqxym.de/en/zodiac-dates-quiz](https://zodiax.mqxym.de/en/zodiac-dates-quiz)
- German quiz: [https://zodiax.mqxym.de/de/sternzeichen-daten-quiz](https://zodiax.mqxym.de/de/sternzeichen-daten-quiz)
- English statistics: [https://zodiax.mqxym.de/en/zodiac-learning-statistics](https://zodiax.mqxym.de/en/zodiac-learning-statistics)
- German statistics: [https://zodiax.mqxym.de/de/sternzeichen-lernstatistik](https://zodiax.mqxym.de/de/sternzeichen-lernstatistik)

## Quiz Features

### 1) Four game modes

- Sorted: random date, answers stay in zodiac order.
- Learn Transitions: only zodiac boundary days (start and end days).
- Learn Transitions Shuffled: transition-day training with shuffled answer order.
- Shuffled: random date with shuffled answers every round.

### 2) Instant round feedback

- Checks answers immediately.
- Shows clear correct/wrong state in a popup.
- Displays the right zodiac date range after each answer.
- Includes running score text (correct/total).

### 3) Live performance panel on quiz page

- Attempts
- Correct answers
- Accuracy percentage
- Current streak
- Best streak
- Active mode badge and mode-specific hint text

### 4) Session goal and pacing

- Session goal progress bar (default 50 rounds).
- Goal auto-prompt: when goal is reached, users can increase it by +25 rounds.
- Goal value is stored locally and reused on next visit.

### 5) Next session countdown

- Live countdown to the next daily session reset (midnight).

### 6) Smart persistence

- Last selected game mode is saved and restored automatically.
- Per-mode stats are loaded when mode changes.

## Statistics Dashboard Features

### 1) Per-mode analytics cards

For each mode (Sorted, Learn Transitions, Transitions Shuffled, Shuffled):

- Attempts
- Correct / wrong totals
- Accuracy
- Current streak
- Best streak
- Most-correct zodiac
- Most-failed zodiac

### 2) Visual performance graphs

- Average success rate by mode
- Weak-spot concentration by mode (how strongly mistakes are focused on one zodiac)

### 3) Recent learning sessions

- Shows latest sessions with timestamp, attempts, and accuracy.
- Includes which modes were played in each session and how often.

### 4) Reset controls

- Reset all statistics
- Reset a specific mode only
- Confirmation prompts to prevent accidental data loss

## Data and Storage

- Uses IndexedDB for persistent local statistics.
- Tracks answers, mode summaries, and session history.
- Uses session storage to keep one active learning session per browser tab/session.
- Current streak auto-resets when a new day starts.

## Localization and UX

- Full English and German support for quiz and statistics pages.
- Responsive layout for desktop and mobile.
- Automatic light/dark theme based on system color scheme.

## Tech Stack

- JavaScript + jQuery
- IndexedDB (client-side persistence)
- Tailwind CSS v4

## Local Development

Install dependencies:

```bash
cp -r /src/css ./css
cp -r /src/js ./js
npm install
```

Build CSS once:

```bash
npm run build:css
```

Watch CSS during development:

```bash
npm run watch:css
```

## Contributing

Issues, improvements, and translations are welcome.
