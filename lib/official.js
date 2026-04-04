import { execSync } from 'node:child_process';

const OFFICIAL_NAME = 'official';

export function getOfficialName() {
  return OFFICIAL_NAME;
}

export function isOfficialName(name) {
  return name === OFFICIAL_NAME;
}

export function detectOfficialAccount() {
  try {
    const output = execSync('claude auth status', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const info = JSON.parse(output);
    if (info.loggedIn) {
      return {
        loggedIn: true,
        email: info.email || '',
        orgName: info.orgName || '',
        subscriptionType: info.subscriptionType || '',
        authMethod: info.authMethod || '',
      };
    }
  } catch {
    // claude CLI not found or not logged in
  }
  return { loggedIn: false };
}
