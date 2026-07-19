"use client";

import { useState, useEffect } from "react";
import { Plus, Building2, Pencil, Trash2, ChevronDown, AlertTriangle } from "lucide-react";
import { banksApi } from "@/lib/api";
import { BankAccount, SupportedBank } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { getBankName } from "@/lib/utils";

export default function BanksPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBank[]>([]);
  const [form, setForm] = useState({
    bank_name: "cbe",
    account_holder_name: "",
    account_number: "",
    initial_balance: 0,
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadAccounts();
    loadSupportedBanks();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await banksApi.list();
      setAccounts(res.data);
    } catch {
      setFormError("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadSupportedBanks = async () => {
    try {
      const res = await banksApi.getSupported();
      setSupportedBanks(res.data.banks);
    } catch {
      console.error("Failed to load supported banks");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await banksApi.update(editingId, form);
      } else {
        await banksApi.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ bank_name: "cbe", account_holder_name: "", account_number: "", initial_balance: 0 });
      loadAccounts();
    } catch {
      setFormError("Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this bank account?")) return;
    try {
      await banksApi.delete(id);
      loadAccounts();
    } catch {
      setFormError("Failed to delete bank account");
    }
  };

  const handleEdit = (account: BankAccount) => {
    setForm({
      bank_name: account.bank_name,
      account_holder_name: account.account_holder_name,
      account_number: account.account_number,
      initial_balance: account.initial_balance,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Bank Accounts</h1>
          <p className="text-surface-500 mt-1">
            Add your business bank accounts for verification
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ bank_name: "cbe", account_holder_name: "", account_number: "", initial_balance: 0 }); }}>
          <Plus size={18} />
          Add Bank
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit" : "Add"} Bank Account</CardTitle>
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
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Bank
              </label>
              <select
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="block w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm"
              >
                {supportedBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Account Holder Name"
              placeholder="Business name on account"
              value={form.account_holder_name}
              onChange={(e) =>
                setForm({ ...form, account_holder_name: e.target.value })
              }
              required
            />
            <Input
              label="Account Number"
              placeholder="e.g. 1000223344"
              value={form.account_number}
              onChange={(e) =>
                setForm({ ...form, account_number: e.target.value })
              }
              required
            />
            <Input
              label="Initial Balance (ETB)"
              type="number"
              placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) =>
                setForm({ ...form, initial_balance: parseFloat(e.target.value) || 0 })
              }
            />
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId ? "Update" : "Add"} Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="text-center py-16">
          <Building2 size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No bank accounts</p>
          <p className="text-sm text-surface-400 mt-1">
            Add your first bank account to start verifying
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <Building2 size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">
                      {getBankName(acc.bank_name)}
                    </h3>
                    <p className="text-sm text-surface-500 mt-0.5">
                      {acc.account_holder_name}
                    </p>
                    <p className="text-sm font-mono text-surface-400 mt-0.5">
                      {acc.account_number}
                    </p>
                    <Badge variant={acc.is_active ? "success" : "warning"} className="mt-2">
                      {acc.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(acc)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-emerald-600"
                    aria-label={`Edit ${getBankName(acc.bank_name)} account`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600"
                    aria-label={`Delete ${getBankName(acc.bank_name)} account`}
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
