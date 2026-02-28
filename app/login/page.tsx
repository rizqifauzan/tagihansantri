export default function LoginPage() {
  return (
    <main className="container">
      <h1>Login Admin</h1>
      <form method="post" action="/api/auth/login" className="form">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />

        <button type="submit">Masuk</button>
      </form>
    </main>
  );
}
