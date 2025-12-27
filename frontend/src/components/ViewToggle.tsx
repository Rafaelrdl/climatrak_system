import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List, LayoutGrid, Mail } from "lucide-react";
import type { WorkOrderView } from "@/types";

interface ViewToggleProps {
  view: WorkOrderView;
  onViewChange: (view: WorkOrderView) => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(value) => {
        if (value) {
          onViewChange(value as WorkOrderView);
        }
      }}
      className="border rounded-lg p-1"
    >
      <ToggleGroupItem
        value="list"
        aria-label="Visualização em Lista"
        size="sm"
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="kanban"
        aria-label="Visualização Kanban"
        size="sm"
        className="h-8 w-8 p-0"
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="panel"
        aria-label="Visualização Estilo E-mail"
        size="sm"
        className="h-8 w-8 p-0"
        title="Visualização dividida - Lista e detalhes lado a lado"
      >
        <Mail className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}