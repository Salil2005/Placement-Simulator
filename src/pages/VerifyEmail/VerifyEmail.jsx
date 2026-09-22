import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../components/ui/Card.jsx";
import Loader from "../../components/common/Loader.jsx";
import { authService } from "../../services/authService.js";

/** Landing page for the link sent by /auth/verify-email/:token. */
export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error

  useEffect(() => {
    authService
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader label="Verifying your email..." />
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-extrabold">Email verified 🎉</h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Your email is confirmed. You can log in now.
            </p>
            <Link to="/login" className="btn-primary inline-block">Go to Login</Link>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-extrabold">Link expired or invalid</h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              This verification link is no longer valid. Log in and request a new one.
            </p>
            <Link to="/login" className="btn-secondary inline-block">Back to Login</Link>
          </div>
        )}
      </Card>
    </div>
  );
}
