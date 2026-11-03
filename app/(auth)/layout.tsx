export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh">{children}</div>;
}
