"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Users, Pencil, Trash2, Key, Mail, AlertTriangle } from "lucide-react";
import { staffApi, authApi } from "@/lib/api";
import { StaffMember } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", pin: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const suggestedEmail = useMemo(() => {
    if (!form.full_name || editingId) return "";
    const namePart = form.full_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");
    return `${namePart}@[business].staff`;
  }, [form.full_name, editingId]);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const res = await staffApi.list();
      setStaff(res.data);
    } catch {
      setFormError("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { pin, ...data } = form;
        await staffApi.update(editingId, data);
      } else {
        await staffApi.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ full_name: "", email: "", pin: "" });
      loadStaff();
    } catch {
      setFormError("Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      await staffApi.delete(id);
      loadStaff();
    } catch {
      setFormError("Failed to delete staff member");
    }
  };

  const handleEdit = (member: StaffMember) => {
    setForm({ full_name: member.full_name, email: member.email || "", pin: "" });
    setEditingId(member.id);
    setShowForm(true);
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setForm({ ...form, pin });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Staff</h1>
          <p className="text-surface-500 mt-1">
            Manage your staff and their access
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ full_name: "", email: "", pin: "" });
          }}
        >
          <Plus size={18} />
          Add Staff
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit" : "Add"} Staff Member</CardTitle>
          </CardHeader>
          {formError && (
            <div className="px-6 pb-2">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} />
                {formError}
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Abebe Kebede"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
            <div>
              <Input
                label="Staff Login Email"
                type="text"
                placeholder={suggestedEmail || "staff@business.staff"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                icon={<Mail size={16} />}
              />
              {!editingId && !form.email && suggestedEmail && (
                <p className="text-xs text-surface-400 mt-1.5">
                  Auto-generated: <span className="font-mono text-emerald-600">{suggestedEmail}</span>
                  {" "}&mdash; staff uses this email + PIN to login
                </p>
              )}
              {form.email && (
                <p className="text-xs text-surface-400 mt-1.5">
                  Staff will login with this email + PIN
                </p>
              )}
            </div>
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  PIN Code
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="4+ digit PIN"
                    value={form.pin}
                    onChange={(e) =>
                      setForm({ ...form, pin: e.target.value })
                    }
                    maxLength={10}
                    inputMode="numeric"
                    className="flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePin}
                  >
                    <Key size={16} />
                    Generate
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId ? "Update" : "Add"} Staff
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : staff.length === 0 ? (
        <Card className="text-center py-16">
          <Users size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No staff members</p>
          <p className="text-sm text-surface-400 mt-1">
            Add staff to let them verify customer receipts
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-emerald-700">
                      {member.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">
                      {member.full_name}
                    </h3>
                    {member.email && (
                      <p className="text-sm text-surface-400">{member.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={member.is_active ? "success" : "warning"}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {member.last_login_at && (
                        <span className="text-xs text-surface-400">
                          Last: {formatDate(member.last_login_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-emerald-600"
                    aria-label={`Edit ${member.full_name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600"
                    aria-label={`Delete ${member.full_name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
