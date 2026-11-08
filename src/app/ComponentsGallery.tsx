import { Plus } from "lucide-react";
import { useState } from "react";
import { Button, Chip, Input, Segmented, Select, Textarea, ToggleChip } from "../components";

// Dev-only page (/__components); its labels are not user-facing, so they skip i18n.
export function ComponentsGallery() {
  const [seg, setSeg] = useState("all");
  const [on, setOn] = useState(true);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Components</h1>
      <div className="flex gap-2">
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="icon" aria-label="Add">
          <Plus size={16} strokeWidth={1.7} />
        </Button>
      </div>
      <div className="flex gap-2">
        <Chip>Draft</Chip>
        <Chip outlined>Nov 12</Chip>
      </div>
      <Segmented
        label="Filter"
        value={seg}
        onChange={setSeg}
        options={[
          { value: "all", label: "All" },
          { value: "draft", label: "Draft" },
        ]}
      />
      <Input placeholder="Input" />
      <Textarea placeholder="Textarea" />
      <Select defaultValue="a">
        <option value="a">Select</option>
      </Select>
      <ToggleChip pressed={on} onChange={setOn}>
        Toggle chip
      </ToggleChip>
    </main>
  );
}
