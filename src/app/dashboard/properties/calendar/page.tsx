"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  MapPin,
  Search,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface PropertyItem {
  _id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  status?: string;
  type?: string;
  units?: { _id: string; unitNumber: string; status: string }[];
}

export default function PropertyCalendarIndexPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/properties?limit=200");
      if (!res.ok) throw new Error("Failed to fetch properties");
      const data = await res.json();
      const props = data.data?.properties || data.data || [];
      setProperties(props);
    } catch (err: any) {
      toast.error(err.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? properties.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.address?.city?.toLowerCase().includes(search.toLowerCase()) ||
          p.address?.street?.toLowerCase().includes(search.toLowerCase())
      )
    : properties;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "occupied":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          Availability Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a property to manage its availability, date blocks, and pricing
          rules
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">
              {search ? "No properties match your search" : "No properties found"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {search
                ? "Try a different search term"
                : "Add properties first to manage their calendars"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((property) => (
            <Card
              key={property._id}
              className="cursor-pointer hover:shadow-md transition-shadow border hover:border-primary/30"
              onClick={() =>
                router.push(`/dashboard/properties/${property._id}/calendar`)
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {property.name}
                    </h3>
                    {property.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {[property.address.city, property.address.state]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {property.status && (
                    <Badge
                      variant="secondary"
                      className={getStatusColor(property.status)}
                    >
                      {property.status}
                    </Badge>
                  )}
                  {property.units && (
                    <span className="text-xs text-muted-foreground">
                      {property.units.length}{" "}
                      {property.units.length === 1 ? "unit" : "units"}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-primary hover:text-primary"
                  >
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Open Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
