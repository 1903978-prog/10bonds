/** Sign out as a plain form post: no script needed, the server clears the sign-in cookie and sends the browser home. */
export default function SignOutButton({ className, testId }: { className: string; testId?: string }) {
  return (
    <form method="post" action="/api/auth/logout">
      <button type="submit" className={className} data-testid={testId}>Sign out</button>
    </form>
  );
}
