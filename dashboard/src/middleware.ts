export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/api/trigger/:path*', '/api/runs/:path*'],
}
