export function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  return { clientId, clientSecret };
}

export function isGoogleAuthConfigured() {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  return Boolean(clientId && clientSecret);
}
