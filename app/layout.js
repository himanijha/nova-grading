import "./globals.css";

export const metadata = {
  title: "Nova Application Grading",
  description: "Grading platform for Nova for Good applications",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
