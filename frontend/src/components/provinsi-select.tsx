"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import type { Provinsi } from "@/lib/types";

export function ProvinsiSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (prov: { name: string; code: string }) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Provinsi[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const t0 = setTimeout(() => setLoading(true), 0);
    const t = setTimeout(() => {
      api.listProvinsi(search).then((rows) => {
        setItems(rows);
        setLoading(false);
      });
    }, 300);
    return () => {
      clearTimeout(t0);
      clearTimeout(t);
    };
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", className)}>
          {value || <span className="text-muted-foreground">Pilih provinsi...</span>}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari provinsi..." value={search} onValueChange={setSearch} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Memuat...</div>
            ) : (
              <>
                <CommandGroup>
                  {items.map((p) => (
                    <CommandItem key={p.id} value={p.name} onSelect={() => { onChange({ name: p.name, code: p.code }); setOpen(false); }}>
                      <Check className={cn("mr-2 size-4", value === p.name ? "opacity-100" : "opacity-0")} />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {items.length === 0 && <CommandEmpty>Data tidak ditemukan</CommandEmpty>}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
