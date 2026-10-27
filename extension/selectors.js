// All X DOM selectors and language-dependent labels live here. Fail closed:
// never use a generic button as a substitute for a missing X control.
// data-testid values are observed UI hooks, not a stable public contract.
globalThis.BlockListDOM = {
  profile: '[data-testid="primaryColumn"] [data-testid="UserName"]',
  menu: '[data-testid="userActions"]',
  block: '[role="menu"] [data-testid="block"]',
  unblock: '[data-testid="unblock"], [data-testid$="-unblock"]',
  confirm: '[data-testid="confirmationSheetConfirm"]',
  dialog: '[role="dialog"]',
  main: '[data-testid="primaryColumn"]',
  alerts: '[role="alert"], [data-testid="toast"], [data-testid="error-detail"]',
  challenge: 'iframe[src*="captcha"], iframe[src*="arkoselabs"], iframe[src*="challenge"], [data-testid="ocfEnterTextTextInput"]',
  hazardText: /rate limit|too many requests|try again later|unusual activity|verify your identity|verify you are human|captcha|account locked|temporarily limited|limite.*(?:atteinte|dépassée)|trop de requêtes|réessayez plus tard|activité inhabituelle|vérifi.*(?:identité|humain)|compte.*verrouillé/i,
  hazardPath: /\/(?:account\/access|i\/flow\/(?:challenge|login)|login)(?:\/|$)/,
  missingText: /this account doesn.t exist|account suspended|ce compte n.existe pas|compte suspendu/i,
  blockText: /^(?:block|bloquer)\b/i,
  blockedText: /you (?:have )?blocked|vous avez bloqué|blocked|bloqué/i,
  handlePattern: /@[A-Za-z0-9_]{1,15}\b/g
};
