import type { NextConfig } from "next";

// Без nonce-подхода (см. node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md,
// раздел "Without Nonces"): 'unsafe-inline' в script-src нужен для инлайн-скриптов
// стриминга/гидратации App Router. Nonce-подход потребовал бы принудительного
// динамического рендеринга всех страниц, что не оправдано для этого проекта.
const isDev = process.env.NODE_ENV === "development";
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://telegram.org${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://telegram.org https://t.me",
  "font-src 'self'",
  "object-src 'none'",
  "connect-src 'self' https://oauth.telegram.org",
  "frame-src 'self' https://oauth.telegram.org",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join('; ');

const securityHeaders = [
  // Запрещаем встраивание сайта в iframe (защита от clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Браузер не должен угадывать MIME-тип контента.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS: браузер будет ходить только по HTTPS в течение года.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy", value: cspHeader },
];

const nextConfig: NextConfig = {
  images: {
    // Обложки хранятся локально (загрузка -> /api/covers/[id]) либо задаются
    // администратором вручную. Полный wildcard "**" разрешал next/image
    // обращаться к любому HTTPS-хосту по URL из БД — потенциальный SSRF/
    // tracking-вектор. Внешние обложки теперь не оптимизируются через
    // next/image; при необходимости добавляйте сюда конкретные доверенные хосты.
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
