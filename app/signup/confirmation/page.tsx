import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupConfirmationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a confirmation email. Please check your inbox to complete your registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you don't see the email, please check your spam folder. The email contains a link to confirm your account.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Return to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}