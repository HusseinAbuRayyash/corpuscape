import { Link } from "wouter";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="empty-state max-w-md w-full">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive/40" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-6">This page doesn't exist.</p>
        <Link href="/">
          <Button data-testid="button-go-home">
            <Home className="w-4 h-4 mr-2" />Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
