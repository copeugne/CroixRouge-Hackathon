"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import type React from "react";
import "./globals.css";
import { AppSidebar } from "~/components/app-sidebar";
import { AuthProvider } from "~/components/auth/AuthProvider";
import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/toaster";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TRPCReactProvider } from "~/trpc/react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const pathname = usePathname();

	// Don't show sidebar for auth pages
	const isAuthPage = pathname?.startsWith("/auth") || pathname === "/";

	return (
		<html lang="en">
			<body className={inter.className}>
				<TRPCReactProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<AuthProvider>
							{/* Add a global TooltipProvider to prevent nested tooltip providers causing render loops */}
							<TooltipProvider delayDuration={300}>
								{isAuthPage ? (
									<main className="w-full">{children}</main>
								) : (
									<div className="flex h-screen">
										<AppSidebar />
										<main className="flex-1 overflow-auto">{children}</main>
									</div>
								)}
							</TooltipProvider>
							<Toaster />
						</AuthProvider>
					</ThemeProvider>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
