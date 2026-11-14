export type RouteKey =
  | 'SIGNUP'
  | 'LOGIN'
  | 'DASHBOARD'
  | 'MOCKS'
  | 'MOCK_DETAIL'
  | 'PROGRESS'
  | 'TRUST';

export const ROUTE_PATHS: Record<RouteKey, string> = {
  SIGNUP: '/signup',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  MOCKS: '/mocks',
  MOCK_DETAIL: '/mocks/:id',
  PROGRESS: '/progress',
  TRUST: '/trust',
};

export function isRouteKey(key: string): key is RouteKey {
  return key in ROUTE_PATHS;
}

export const FEATURE_AI = false;
