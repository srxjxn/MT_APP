import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'success';
  const isSuccess = status === 'success';

  const title = isSuccess ? 'Payment Successful!' : 'Payment Cancelled';
  const icon = isSuccess ? '✓' : '✕';
  const iconColor = isSuccess ? '#2E7D32' : '#C62828';
  const message = isSuccess
    ? 'Your payment has been processed. Returning to the app...'
    : 'Your payment was cancelled. Returning to the app...';
  const deepLink = isSuccess
    ? 'modern-tennis://billing?checkout_success=true'
    : 'modern-tennis://billing?checkout_cancelled=true';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 40px 24px;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${iconColor};
      color: white;
      font-size: 40px;
      line-height: 80px;
      margin: 0 auto 24px;
      font-weight: bold;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 12px;
      color: #1a1a1a;
    }
    p {
      font-size: 16px;
      color: #666;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: ${iconColor};
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="${deepLink}">Return to App</a>
  </div>
  <script>
    setTimeout(function() { window.location.href = "${deepLink}"; }, 2000);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
