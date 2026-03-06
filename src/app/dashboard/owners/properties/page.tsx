"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Building2,
  User,
  ExternalLink,
  Home,
} from "lucide-react";
import { InlinePreloader } from "@/components/ui/preloader";
import { toast } from "sonner";

interface Property {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
  };
  type: string;
  status: string;
  units?: { _id: string; status: string }[];
  owner?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Owner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function OwnerPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("all");

  const fetchOwners = useCallback(async () => {
    try {
      const response = await fetch("/api/owners?limit=100");
      const data = await response.json();
      if (data.success) {
        setOwners(data.data.owners);
      }
    } catch (error) {
      console.error("Error fetching owners:", error);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (selectedOwner !== "all") {
        params.set("ownerId", selectedOwner);
      }
      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`/api/properties?${params}`);
      const data = await response.json();

      if (data.success) {
        const propertiesWithOwner = data.data.properties.filter(
          (p: Property) => p.owner
        );
        setProperties(propertiesWithOwner);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast.error("Failed to fetch properties");
    } finally {
      setLoading(false);
    }
  }, [selectedOwner, search]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getOccupancyRate = (units?: { status: string }[]) => {
    if (!units || units.length === 0) return 0;
    const occupied = units.filter((u) => u.status === "occupied").length;
    return Math.round((occupied / units.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Owner Properties</h1>
        <p className="text-muted-foreground">
          View properties grouped by their owners
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Properties by Owner</CardTitle>
          <CardDescription>
            {properties.length} propert{properties.length !== 1 ? "ies" : "y"}{" "}
            with assigned owners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner._id} value={owner._id}>
                    {owner.firstName} {owner.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <InlinePreloader />
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No properties found</h3>
              <p className="text-muted-foreground">
                {search || selectedOwner !== "all"
                  ? "Try adjusting your filters"
                  : "No properties have owners assigned yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow key={property._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <Home className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{property.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {property.address?.city}, {property.address?.state}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {property.owner ? (
                          <Link
                            href={`/dashboard/owners/${property.owner._id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(
                                  property.owner.firstName,
                                  property.owner.lastName
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {property.owner.firstName}{" "}
                                {property.owner.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {property.owner.email}
                              </p>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            No owner assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {property.type?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{property.units?.length || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${getOccupancyRate(property.units)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">
                            {getOccupancyRate(property.units)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/properties/${property._id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
