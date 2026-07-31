import "./styles.css";
export const metadata = {
  title: "Project Atlas",
  description: "Human-reviewed freight operations",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header>
          <a className="brand" href="/">
            ATLAS <span>Freight operations</span>
          </a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
