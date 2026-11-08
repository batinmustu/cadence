import { Plus } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge, Button, Input, Segmented, Select, Textarea, Toggle } from "../components";

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
        <Badge>Draft</Badge>
        <Badge variant="outline">Nov 12</Badge>
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
      <Toggle pressed={on} onPressedChange={setOn}>
        Toggle chip
      </Toggle>
      <div className="flex gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>Open alert dialog</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
