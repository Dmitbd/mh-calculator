# MH Calculator

Mobile calculator for Mythic Heroes progression, starting with the Divinity screen.

## Setup

1. Install dependencies:
`npm install`

2. Start the Expo dev server:
`npm start`

3. Run the test suite:
`npm test`

## Scripts

- `npm start` - start the Expo dev server
- `npm run android` - open the Android build target
- `npm run ios` - open the iOS build target
- `npm test` - run the Jest test suite

## Data

Divinity progression data lives in:
`src/features/divinity/data/divinity-levels.json`

User progress is stored locally on the device through AsyncStorage.
