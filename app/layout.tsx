import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "环规 · 区域环境规范助手",
  description: "查询浙江、江苏、上海、北京的污水规范及全国通用土壤、水样、气体采样规范，追溯官方依据，核对标准版本。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
