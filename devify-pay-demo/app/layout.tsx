import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AuraStore — Devify Pay Integration Demo",
  description: "Demo Storefront integrating Devify Pay Self-Hosted Gateway",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          backgroundColor: "#09090b",
          color: "#f4f4f5",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
