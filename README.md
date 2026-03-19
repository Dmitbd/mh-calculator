# MH Calculator

Mobile calculator for Mythic Heroes progression, starting with the Divinity screen.

## Setup

1. Install dependencies:
`npm install`

2. Start the Expo dev server:
`npm start`

3. Run the test suite:
`npm test`

4. Export the web build:
`npm run export:web`

## Scripts

- `npm start` - start the Expo dev server
- `npm run android` - open the Android build target
- `npm run ios` - open the iOS build target
- `npm run export:web` - export the static web build to `dist/`
- `npm test` - run the Jest test suite

## GitHub Pages

This project is configured for free static hosting on GitHub Pages.

- Web output uses Expo static export.
- The current Pages base path is `/mh-calculator`.
- If the GitHub repository name changes, update `expo.experiments.baseUrl` in [app.json](/Users/mymaughem/Desktop/work/mh-calculator/app.json).

### Deployment

1. Push to `main`.
2. In the GitHub repository, open `Settings -> Pages`.
3. Set `Source` to `GitHub Actions`.
4. Wait for the `Deploy GitHub Pages` workflow to finish.

The site will be published at:
`https://<your-github-user>.github.io/mh-calculator/`

## Data

Divinity progression data lives in:
`src/features/divinity/data/divinity-levels.json`

User progress is stored locally on the device through AsyncStorage.
