"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import type { Wilayah } from "@/lib/types";

export function WilayahSelect({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Wilayah[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<Wilayah | null>(null);

  React.useEffect(() => {
    if (value == null) {
      const id = setTimeout(() => setSelected(null), 0);
      return () => clearTimeout(id);
    }
    api.getWilayah(value).then(setSelected).catch(() => setSelected(null));
  }, [value]);

  React.useEffect(() => {
    if (!open) return;
    const t0 = setTimeout(() => setLoading(true), 0);
    const t = setTimeout(() => {
      api.listWilayah(search, 1, 20).then((r) => {
        setItems(r.data);
        setLoading(false);
      });
    }, 300);
    return () => {
      clearTimeout(t0);
      clearTimeout(t);
    };
  }, [search, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="truncate">
              {selected.desa}, {selected.kecamatan}, {selected.kabupaten}
            </span>
          ) : (
            <span className="text-muted-foreground">Pilih wilayah...</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari kode/desa/kecamatan..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Memuat...
              </div>
            ) : (
              <CommandGroup>
                {items.length === 0 && <CommandEmpty>Data tidak ditemukan</CommandEmpty>}
                {items.map((w) => (
                  <CommandItem
                    key={w.id}
                    value={String(w.id)}
                    onSelect={() => {
                      onChange(w.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === w.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {w.kode_wilayah}
                    </span>{" "}
                    {w.desa}, {w.kecamatan}, {w.tipe_kabupaten} {w.kabupaten}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
