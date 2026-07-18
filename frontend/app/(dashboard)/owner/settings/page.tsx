"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Save, Lock, User, Building2, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { businessApi } from "@/lib/api";
import api from "@/lib/api";

interface ProfileForm {
  name: string;
  phone: string;
  address: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function SettingsPage() {
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [business, setBusiness] = useState<any>(null);

  const profileForm = useForm<ProfileForm>();
  const passwordForm = useForm<PasswordForm>();

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      const res = await businessApi.getMe();
      setBusiness(res.data);
      profileForm.reset({
        name: res.data.name,
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
    } catch {
      // ignore
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      await businessApi.update(data);
      const stored = localStorage.getItem("owner_user");
      if (stored) {
        const user = JSON.parse(stored);
        user.business_name = data.name;
        localStorage.setItem("owner_user", JSON.stringify(user));
      }
      setProfileSuccess("Profile updated successfully");
    } catch {
      setProfileError("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    if (data.new_password !== data.confirm_password) {
      setPasswordError("Passwords do not match");
      setPasswordLoading(false);
      return;
    }
    if (data.new_password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      setPasswordLoading(false);
      return;
    }
    try {
      await api.post("/api/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setPasswordSuccess("Password changed successfully");
      passwordForm.reset();
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-surface-500 mt-1">Manage your business profile and password</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {profileError}
            </div>
          )}

          <Input
            label="Business Name"
            icon={<Building2 size={16} />}
            {...profileForm.register("name", { required: true })}
          />
          <Input
            label="Phone"
            type="tel"
            icon={<User size={16} />}
            {...profileForm.register("phone")}
          />
          <Input
            label="Address"
            {...profileForm.register("address")}
          />

          <div className="pt-2">
            <Button type="submit" loading={profileLoading}>
              <Save size={16} />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {passwordError}
            </div>
          )}

          <div className="relative">
            <Input
              label="Current Password"
              type={showCurrent ? "text" : "password"}
              icon={<Lock size={16} />}
              {...passwordForm.register("current_password", { required: true })}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-[38px] text-surface-400 hover:text-surface-600"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="New Password"
              type={showNew ? "text" : "password"}
              icon={<Lock size={16} />}
              {...passwordForm.register("new_password", { required: true })}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-[38px] text-surface-400 hover:text-surface-600"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            icon={<Lock size={16} />}
            {...passwordForm.register("confirm_password", { required: true })}
          />

          <div className="pt-2">
            <Button type="submit" loading={passwordLoading}>
              <Save size={16} />
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
