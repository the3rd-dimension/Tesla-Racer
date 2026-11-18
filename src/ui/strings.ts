/** All player-facing text lives here so it can be translated (e.g. Bangla) later. */
export const STRINGS = {
  goTitleCrash: 'Wrecked!',
  goTitleCaught: 'Caught!',
  goReasonCrash: 'You hit something big. Red glow means stay away.',
  goReasonCaught: 'The chaser caught you too many times.',
  toastBump: (pts: number, money: number) => `Bump! -${pts} pts, +$${money}`,
  toastRam: 'RAMMED! Boost away!',
  toastBoost: 'Boost +',
  toastJump: 'Jump ready',
  toastGo: 'GO!',
  toastNewBest: 'New best!',
  toastPurchaseSuccess: 'Purchase complete!',
  toastNotEnoughMoney: 'Not enough money',
  toastSkinUnavailable: 'This skin model is not installed yet.',
} as const;
