import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const VerifyEmail = () => {
  return (
    <div>
      <div className="px-8 pt-10 pb-6 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl">mark_email_read</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </p>
      </div>

      <div className="px-8 pb-10 space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
            <p>Check your spam or junk folder if you don't see the email in your inbox.</p>
          </div>
        </div>

        <Link to="/login" className="block">
          <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md">
            <span className="material-symbols-outlined text-sm mr-2">check_circle</span>
            Verification Complete — Go to Login
          </Button>
        </Link>

        <p className="text-center text-xs text-muted-foreground">
          Didn't receive the email?{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline">Try again</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
