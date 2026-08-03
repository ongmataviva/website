export async function onRequest(context) {
  const { env } = context;
  const client_id = env.GITHUB_CLIENT_ID;

  if (!client_id) {
    return new Response("Missing GITHUB_CLIENT_ID configuration variable.", { status: 500 });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user`;
  return Response.redirect(githubAuthUrl, 302);
}
