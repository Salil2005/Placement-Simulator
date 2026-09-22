import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { authService } from "../../services/authService.js";

export default function Login() {
  const { register, handleSubmit, formState: { errors }, getValues } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setServerError(null);
    setNeedsVerification(false);
    setResendStatus(null);
    setLoading(true);
    try {
      await login(data);
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.message);
      if (err.code === "EMAIL_NOT_VERIFIED") setNeedsVerification(true);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendStatus("sending");
    try {
      await authService.resendVerification(getValues("email"));
      setResendStatus("sent");
    } catch {
      setResendStatus("error");
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <h1 className="mb-1 text-2xl font-extrabold">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Log in to continue practicing.</p>

        {serverError && (
          <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {serverError}
            {needsVerification && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resendStatus === "sending"}
                  className="font-semibold underline"
                >
                  {resendStatus === "sending" ? "Sending..." : "Resend verification email"}
                </button>
                {resendStatus === "sent" && (
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    If that account exists, a new link has been sent.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email", { required: "Email is required" })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password", { required: "Password is required" })}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account? <Link to="/register" className="font-semibold text-brand-600">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
