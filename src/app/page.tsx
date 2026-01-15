"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Home() {
  const [count, setCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            PWA Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Next.js + Tailwind CSS + shadcn/ui
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                isOnline ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </header>

        <div className="space-y-6">
          {installPrompt && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-100">
                  Install App
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Add this app to your home screen for a better experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInstall} className="w-full">
                  Install PWA
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Counter Demo</CardTitle>
              <CardDescription>
                Test the app interactivity with a simple counter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCount((c) => c - 1)}
                >
                  -
                </Button>
                <span className="text-4xl font-bold w-20 text-center">
                  {count}
                </span>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCount((c) => c + 1)}
                >
                  +
                </Button>
              </div>
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setCount(0)}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PWA Features</CardTitle>
              <CardDescription>
                This app demonstrates the following PWA capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Installable on mobile devices
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Works offline with Service Worker
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Responsive design with Tailwind CSS
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Modern UI with shadcn/ui components
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Install</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                <strong>iOS Safari:</strong> Tap the Share button → Add to Home
                Screen
              </p>
              <p>
                <strong>Android Chrome:</strong> Tap the menu → Install app /
                Add to Home screen
              </p>
              <p>
                <strong>Desktop Chrome:</strong> Click the install icon in the
                address bar
              </p>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>Built with Next.js • Ready for Vercel deployment</p>
        </footer>
      </div>
    </div>
  );
}
