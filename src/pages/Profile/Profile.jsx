import { useState } from "react";
import { useForm } from "react-hook-form";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { authService } from "../../services/authService.js";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { register, handleSubmit } = useForm({ defaultValues: { name: user?.name } });
  const passwordForm = useForm();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const onSaveProfile = async (data) => {
    setError(null);
    setMessage(null);
    try {
      await authService.updateProfile(data);
      await refreshUser();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const onChangePassword = async (data) => {
    setError(null);
    setMessage(null);
    try {
      await authService.changePassword(data);
      setMessage("Password changed successfully.");
      passwordForm.reset();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
      <h1 className="mb-1 text-2xl font-extrabold">Profile</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Manage your account details.</p>

      {message && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 font-bold">Basic Info</h2>
        <form onSubmit={handleSubmit(onSaveProfile)}>
          <Input label="Full Name" {...register("name")} />
          <Input label="Email" value={user?.email} disabled />
          <Button type="submit">Save Changes</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 font-bold">Change Password</h2>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
          <Input label="Current Password" type="password" {...passwordForm.register("currentPassword", { required: true })} />
          <Input label="New Password" type="password" {...passwordForm.register("newPassword", { required: true, minLength: 6 })} />
          <Button type="submit" variant="secondary">Update Password</Button>
        </form>
      </Card>
    </div>
  );
}
