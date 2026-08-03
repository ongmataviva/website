export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Authorization code missing from callback parameters.", { status: 400 });
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(`OAuth Error: ${data.error_description || data.error}`, { status: 400 });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <body>
          <script>
            const token = "${data.access_token}";
            const provider = "github";

            window.opener.postMessage(
              "authorizing:" + JSON.stringify({ token, provider }),
              window.location.origin
            );
          </script>
        </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(`Internal Authentication Error: ${err.message}`, { status: 500 });
  }
}
