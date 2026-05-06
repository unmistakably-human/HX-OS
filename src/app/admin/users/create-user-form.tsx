"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser } from "./actions";

const ROLE_OPTIONS = [
  { value: "designer", label: "Designer" },
  { value: "design_lead", label: "Design Lead" },
  { value: "project_manager", label: "Project Manager" },
  { value: "admin", label: "Admin" },
];

export function CreateUserForm() {
  const [role, setRole] = useState("designer");
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await createUser(fd);
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_2fr_1fr_auto]"
    >
      <div className="space-y-1.5">
        <Label htmlFor="full_name" className="text-xs font-medium">
          Full name
        </Label>
        <Input
          id="full_name"
          name="full_name"
          placeholder="Jane Doe"
          className="h-10"
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="jane@humanx.io"
          className="h-10"
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role" className="text-xs font-medium">
          Role
        </Label>
        <input type="hidden" name="role" value={role} />
        <Select value={role} onValueChange={setRole} disabled={pending}>
          <SelectTrigger id="role" className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="h-10 w-full md:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
        </Button>
      </div>
    </form>
  );
}
