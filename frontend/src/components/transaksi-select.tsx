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
import type { Transaksi } from "@/lib/types";

export function TransaksiSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Transaksi[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<Transaksi | null>(null);

  React.useEffect(() => {
    if (!value) {
      const id = setTimeout(() => setSelected(null), 0);
      return () => clearTimeout(id);
    }
    api
      .listTransaksi("", 1, 100)
      .then((r) => {
        const found = r.data.find((t) => t.id === value);
        if (found) setSelected(found);
      })
      .catch(() => setSelected(null));
  }, [value]);

  React.useEffect(() => {
    if (!open) return;
    const t0 = setTimeout(() => setLoading(true), 0);
    const t = setTimeout(() => {
      api.listTransaksi(search, 1, 20).then((r) => {
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
          className={cn("w-full justify-between font-normal sm:w-64", className)}
        >
          {selected ? (
            <span className="truncate">
              {selected.nomor_transaksi} — {selected.judul}
            </span>
          ) : (
            <span className="text-muted-foreground">Semua Transaksi</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari transaksi..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Memuat...
              </div>
            ) : (
              <>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 size-4", !value ? "opacity-100" : "opacity-0")}
                    />
                    Semua Transaksi
                  </CommandItem>
                  {items.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={t.id}
                      onSelect={() => {
                        onChange(t.id);
                        setSelected(t);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 size-4", value === t.id ? "opacity-100" : "opacity-0")}
                      />
                      {t.nomor_transaksi} — {t.judul}
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
