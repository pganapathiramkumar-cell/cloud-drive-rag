import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url:      import.meta.env.VITE_KEYCLOAK_URL      || 'http://localhost:8080',
  realm:    import.meta.env.VITE_KEYCLOAK_REALM    || 'enterprise-rag',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'rag-frontend',
})

export async function initKeycloak(): Promise<boolean> {
  return keycloak.init({
    onLoad: 'login-required',
    checkLoginIframe: false,
    pkceMethod: 'S256',
  })
}

export function getToken(): string | undefined {
  if (import.meta.env.VITE_SKIP_AUTH === 'true') return 'dev-token'
  return keycloak.token
}

export function getUserInfo() {
  if (import.meta.env.VITE_SKIP_AUTH === 'true') {
    return { userId: 'dev-user', email: 'dev@localhost', name: 'Dev User', roles: ['admin', 'user'] }
  }
  return {
    userId:   keycloak.subject ?? '',
    email:    keycloak.tokenParsed?.email ?? '',
    name:     keycloak.tokenParsed?.name ?? '',
    roles:    (keycloak.tokenParsed?.realm_access?.roles ?? []) as string[],
  }
}

export function logout() {
  keycloak.logout({ redirectUri: window.location.origin })
}

// Refresh token 30 s before expiry
setInterval(async () => {
  try {
    await keycloak.updateToken(30)
  } catch {
    keycloak.login()
  }
}, 20_000)

export default keycloak
