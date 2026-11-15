"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Village = { code: number; name: string };

export function DesaSelect({
  districtCode,
  value,
  onChange,
  className,
}: {
  districtCode: string;
  value: string;
  onChange: (item: Village) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Village[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!districtCode) {
      const id = setTimeout(() => setItems([]), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setLoading(true), 0);
    fetch(`https://api.kodewilayah.web.id/villages/${districtCode}`)
      .then((r) => r.json())
      .then((r) => setItems(r.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return () => clearTimeout(id);
  }, [districtCode]);

  const filtered = items.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", className)} disabled={!districtCode}>
          {value || <span className="text-muted-foreground">Pilih desa/kelurahan...</span>}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari desa/kelurahan..." value={search} onValueChange={setSearch} />
          <CommandList>
            {loading ? <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div> : <>
              <CommandGroup>
                {filtered.map((x) => <CommandItem key={x.code} value={String(x.code)} onSelect={() => { onChange(x); setOpen(false); }}>
                  <Check className={cn("mr-2 size-4", value === x.name ? "opacity-100" : "opacity-0")} />{x.name}
                </CommandItem>)}
              </CommandGroup>
              {!filtered.length && <CommandEmpty>Data tidak ditemukan</CommandEmpty>}
            </>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
